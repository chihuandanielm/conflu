// Milestone 2 placeholder: proves the intake produces a real plan. Milestone 3 replaces it with the results page.
import { useEffect, useMemo, useRef } from "react";
import { buildPlan } from "../../engine/engine.ts";
import { dataset, intake } from "../data/dataset.ts";
import { majorName, toPlanInput, trackName, type Answers } from "../intake/model.ts";
import { todayISO } from "../today.ts";
import { Button } from "../ui/Button.tsx";

export function planSummary(a: Answers): string {
  const horizon = intake.horizons.find((h) => h.id === (a.horizon ?? "graduation"))?.label.toLowerCase();
  return `${trackName(a.trackId)} · ${majorName(a.majorId)}, year ${a.year} · ${horizon} · ${a.weeklyHours} hrs/week`;
}

export function ResultsPreview({ answers, onEdit, onStartOver }: { answers: Answers; onEdit: () => void; onStartOver: () => void }) {
  const today = todayISO();
  const plan = useMemo(() => buildPlan(toPlanInput(answers, today), dataset), [answers, today]);
  const h1 = useRef<HTMLHeadingElement>(null);
  useEffect(() => { h1.current?.focus({ preventScroll: true }); }, []);
  const now = plan.terms[0];
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-8">
      <h1 ref={h1} tabIndex={-1} className="text-2xl font-semibold outline-none">Your plan</h1>
      <p className="mt-2 text-base text-ink">{planSummary(answers)}</p>
      <p className="mt-1 text-sm text-muted">This is a general trajectory, not a blueprint.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onEdit}>Edit answers</Button>
        <Button variant="ghost" onClick={onStartOver}>Start over</Button>
      </div>
      <section className="mt-10" aria-labelledby="now-h">
        <h2 id="now-h" className="text-lg font-semibold">This term: {now?.label}</h2>
        <ul className="mt-4 divide-y divide-border rounded-md border border-border">
          {now?.items.slice(0, 5).map((it) => (
            <li key={it.goalId} className="px-4 py-3">
              <p className="font-semibold">{it.title} <span className="font-mono text-xs font-normal text-muted">{it.hours} h</span></p>
              <p className="mt-1 text-sm text-muted">{it.why[0]}</p>
            </li>
          ))}
        </ul>
      </section>
      <details className="mt-10">
        <summary className="cursor-pointer font-semibold text-blue">Engine output (preview build only)</summary>
        <pre aria-label="Plan output as JSON" className="mt-4 max-h-[60vh] overflow-auto rounded-md border border-border bg-surface p-4 font-mono text-xs">
          {JSON.stringify(plan, null, 2)}
        </pre>
      </details>
    </main>
  );
}
