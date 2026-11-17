import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { IntakeFlow, INTAKE_KEY } from "./intake/IntakeFlow.tsx";
import type { Answers } from "./intake/model.ts";
import { ResultsPage } from "./results/ResultsPage.tsx";
import { RiverProvider, useRiver } from "./river/RiverProvider.tsx";
import { clearSaved, createSaved, isOutdated, loadSaved, persist, refresh, type SavedPlan } from "./state/plan.ts";
import { remove } from "./state/storage.ts";
import { parseShareHash } from "./state/share.ts";
import { todayISO } from "./today.ts";

type View = { name: "intake"; startAt?: "review"; key: number; shared?: Answers } | { name: "building" } | { name: "results" };

/** A shared link opens the review screen pre-filled. The hash is cleared at once so answers don't linger in the address bar. */
function initialView(): View {
  const shared = typeof window !== "undefined" ? parseShareHash(window.location.hash) : null;
  if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search);
  return shared ? { name: "intake", startAt: "review", key: 0, shared } : { name: "intake", key: 0 };
}
const BUILD_MS = 900; // the burst of hops before the camera turns (design/DESIGN.md §7.3)

/** One river for the whole session, mounted once behind every view (design/RIVER.md §3). */
export function App() {
  // The camera starts where the first screen is: low over the water for the landing's intro, or at the water's edge
  // when a shared link opens the review.
  const [first] = useState(() => (parseShareHash(window.location.hash) ? "ask" : "low") as "ask" | "low");
  return <RiverProvider scene={first}><Views /></RiverProvider>;
}

function Views() {
  const [view, setView] = useState<View>(initialView);
  const [saved, setSaved] = useState<SavedPlan | null>(loadSaved);
  const river = useRiver();
  const reduce = useReducedMotion() || river.reducedMotion;

  const update = useCallback((s: SavedPlan) => { setSaved(s); persist(s); }, []);
  // Building the plan (design/DESIGN.md §7.3): there is no separate screen. The questions fade out and the fish hop
  // faster for about a second; then the results page takes over and the camera turns to face downstream. The engine is
  // instant; the move is the transition. With reduced motion it all happens at once.
  useEffect(() => {
    if (view.name !== "building") return;
    river.celebrate(1.8);
    const t = window.setTimeout(() => setView({ name: "results" }), reduce ? 0 : BUILD_MS);
    return () => window.clearTimeout(t);
  }, [view, reduce, river]);

  const startOver = useCallback(() => {
    remove(INTAKE_KEY); clearSaved(); setSaved(null);
    setView((v) => ({ name: "intake", key: (v.name === "intake" ? v.key : 0) + 1 }));
  }, []);

  let screen: ReactNode;
  if (view.name === "intake") {
    screen = (
      <IntakeFlow key={view.key} startAt={view.startAt} initialAnswers={view.shared}
        onBuild={(a: Answers) => { update(createSaved(a, todayISO(), saved)); setView({ name: "building" }); }}
        onContinuePlan={saved ? () => {
          // Same data: re-run for today's date so the current term stays right. Older data: show it as saved, with a refresh notice.
          if (!isOutdated(saved)) update(refresh(saved, todayISO()));
          setView({ name: "results" });
        } : undefined}
        onStartOver={startOver} />
    );
  } else if (view.name === "building" || !saved) {
    // Only for screen readers: the picture is the river's camera move.
    screen = <p role="status" className="sr-only">Building your plan</p>;
  } else {
    screen = (
      <ResultsPage saved={saved} onChange={update}
        onEdit={() => setView({ name: "intake", startAt: "review", key: Date.now() })}
        onStartOver={startOver} />
    );
  }
  // A whole screen fades out (520ms) before the next one takes over; the river keeps flowing behind.
  const key = view.name === "intake" ? `intake-${view.key}` : view.name;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={key} initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.52, ease: [0.22, 0.61, 0.36, 1] }}>
        {screen}
      </motion.div>
    </AnimatePresence>
  );
}
