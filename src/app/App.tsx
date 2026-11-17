import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { IntakeFlow, INTAKE_KEY } from "./intake/IntakeFlow.tsx";
import type { Answers } from "./intake/model.ts";
import { ResultsPage } from "./results/ResultsPage.tsx";
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
const BUILD_MS = 500; // the engine is instant; this is only a short, honest transition

export function App() {
  const [view, setView] = useState<View>(initialView);
  const [saved, setSaved] = useState<SavedPlan | null>(loadSaved);
  const reduce = useReducedMotion();

  const update = useCallback((s: SavedPlan) => { setSaved(s); persist(s); }, []);
  useEffect(() => {
    if (view.name !== "building") return;
    const t = window.setTimeout(() => setView({ name: "results" }), reduce ? 0 : BUILD_MS);
    return () => window.clearTimeout(t);
  }, [view, reduce]);

  const startOver = useCallback(() => {
    remove(INTAKE_KEY); clearSaved(); setSaved(null);
    setView((v) => ({ name: "intake", key: (v.name === "intake" ? v.key : 0) + 1 }));
  }, []);

  if (view.name === "intake") {
    return (
      <IntakeFlow key={view.key} startAt={view.startAt} initialAnswers={view.shared}
        onBuild={(a: Answers) => { update(createSaved(a, todayISO(), saved)); setView({ name: "building" }); }}
        onContinuePlan={saved ? () => {
          // Same data: re-run for today's date so the current term stays right. Older data: show it as saved, with a refresh notice.
          if (!isOutdated(saved)) update(refresh(saved, todayISO()));
          setView({ name: "results" });
        } : undefined}
        onStartOver={startOver} />
    );
  }
  if (view.name === "building" || !saved) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0.01 : 0.2 }} role="status" className="text-lead text-blue">
          Building your plan
        </motion.p>
      </main>
    );
  }
  return (
    <ResultsPage saved={saved} onChange={update}
      onEdit={() => setView({ name: "intake", startAt: "review", key: Date.now() })}
      onStartOver={startOver} />
  );
}
