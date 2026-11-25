import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { IntakeFlow, INTAKE_KEY } from "./intake/IntakeFlow.tsx";
import type { Answers } from "./intake/model.ts";
import { ResultsPage } from "./results/ResultsPage.tsx";
import { clearSaved, createSaved, isOutdated, loadSaved, persist, refresh, type SavedPlan } from "./state/plan.ts";
import { remove } from "./state/storage.ts";
import { parseShareHash } from "./state/share.ts";
import { todayISO } from "./today.ts";

type View = { name: "intake"; startAt?: "review"; key: number; shared?: Answers } | { name: "results" };

/** A shared link opens the review screen pre-filled. The hash is cleared at once so answers don't linger in the address bar. */
function initialView(): View {
  const shared = typeof window !== "undefined" ? parseShareHash(window.location.hash) : null;
  if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search);
  return shared ? { name: "intake", startAt: "review", key: 0, shared } : { name: "intake", key: 0 };
}
/**
 * The app: the landing and the questions (IntakeFlow), then the results. Screens change by fading (design/DESIGN.md §8).
 * The landing's "How it works" story ends on a frozen sample plan (landing/story/Story.tsx), held in memory only.
 */
export function App() {
  const [view, setView] = useState<View>(initialView);
  const [saved, setSaved] = useState<SavedPlan | null>(loadSaved);
  const reduce = useReducedMotion();

  const update = useCallback((s: SavedPlan) => { setSaved(s); persist(s); }, []);
  const startOver = useCallback(() => {
    remove(INTAKE_KEY); clearSaved(); setSaved(null);
    setView((v) => ({ name: "intake", key: (v.name === "intake" ? v.key : 0) + 1 }));
  }, []);

  let screen: ReactNode;
  if (view.name === "intake") {
    screen = (
      <IntakeFlow key={view.key} startAt={view.startAt} initialAnswers={view.shared}
        onBuild={(a: Answers) => { update(createSaved(a, todayISO(), saved)); setView({ name: "results" }); }}
        onContinuePlan={saved ? () => {
          // Same data: re-run for today's date so the current term stays right. Older data: show it as saved, with a refresh notice.
          if (!isOutdated(saved)) update(refresh(saved, todayISO()));
          setView({ name: "results" });
        } : undefined}
        onStartOver={startOver} />
    );
  } else if (!saved) {
    screen = <p role="status" className="sr-only">Building your plan</p>;
  } else {
    screen = (
      <ResultsPage saved={saved} onChange={update}
        onEdit={() => setView({ name: "intake", startAt: "review", key: Date.now() })}
        onStartOver={startOver} />
    );
  }
  // Between the questions and the results (both on sage) one screen fades out and the next fades in, 300ms each. The
  // landing's own exit has already faded it to sage by the time this runs.
  const key = view.name === "intake" ? `intake-${view.key}` : view.name;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.3, ease: [0.22, 0.61, 0.36, 1] }}>
        {screen}
      </motion.div>
    </AnimatePresence>
  );
}
