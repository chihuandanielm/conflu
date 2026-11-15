import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { IntakeFlow, INTAKE_KEY, type IntakeState } from "./intake/IntakeFlow.tsx";
import type { Answers } from "./intake/model.ts";
import { ResultsPreview } from "./results/ResultsPreview.tsx";
import { load, remove, save } from "./state/storage.ts";

const VIEW_KEY = "cpm.view.v1";
type View = { name: "intake"; startAt?: "review" } | { name: "building" } | { name: "results" };
const BUILD_MS = 500; // the engine is instant; this is only a short, honest transition

export function App() {
  const [view, setView] = useState<View>(() => (load<View>(VIEW_KEY)?.name === "results" && load<IntakeState>(INTAKE_KEY)?.answers
    ? { name: "results" } : { name: "intake" }));
  const [answers, setAnswers] = useState<Answers | null>(() => load<IntakeState>(INTAKE_KEY)?.answers ?? null);
  const reduce = useReducedMotion();

  useEffect(() => { save(VIEW_KEY, { name: view.name === "building" ? "results" : view.name }); }, [view]);
  useEffect(() => {
    if (view.name !== "building") return;
    const t = window.setTimeout(() => setView({ name: "results" }), reduce ? 0 : BUILD_MS);
    return () => window.clearTimeout(t);
  }, [view, reduce]);

  if (view.name === "intake") {
    return <IntakeFlow key={view.startAt ?? "start"} startAt={view.startAt} onBuild={(a) => { setAnswers(a); setView({ name: "building" }); }} />;
  }
  if (view.name === "building" || !answers) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <AnimatePresence>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
            role="status" className="text-lg text-muted">Building your plan</motion.p>
        </AnimatePresence>
      </main>
    );
  }
  return (
    <ResultsPreview answers={answers}
      onEdit={() => setView({ name: "intake", startAt: "review" })}
      onStartOver={() => { remove(INTAKE_KEY); remove(VIEW_KEY); setAnswers(null); setView({ name: "intake" }); }} />
  );
}
