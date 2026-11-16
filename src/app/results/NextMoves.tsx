import { useState } from "react";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import type { PlanItem, PlanTerm } from "../../engine/types.ts";
import { nextStep, type StepProgress } from "../state/steps.ts";
import { Tag } from "./Tag.tsx";

/** The current term's items, up to five: what to do now and why. */
const FIRST = 3;

export function NextMoves({ term, onOpen, progress = {}, weeklyHours }: {
  term: PlanTerm | undefined; onOpen: (it: PlanItem, t: PlanTerm) => void; progress?: StepProgress; weeklyHours?: number;
}) {
  const [all, setAll] = useState(false);
  if (!term || term.items.length === 0) {
    return (
      <section aria-labelledby="next-h" className="rounded-md border border-border p-6">
        <h2 id="next-h" className="text-xl font-semibold">Your next moves</h2>
        <p className="mt-2 text-muted">Nothing is scheduled for this term. Check the notices below, or add hours to fit more in.</p>
      </section>
    );
  }
  const sorted = [...term.items].sort((a, b) => b.score.total - a.score.total);
  const items = all ? sorted : sorted.slice(0, FIRST);
  return (
    <section aria-labelledby="next-h">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="next-h" className="text-xl font-semibold">This term</h2>
        <p className="text-sm text-muted">{term.label} <span className="font-mono text-xs">{term.code}</span></p>
      </div>
      <p className="mt-1 text-sm text-muted">
        Sized to {weeklyHours ? `your ${weeklyHours} free hours a week` : "the time you have"}. Work through these in order; the rest of your plan builds on them.
      </p>
      <ol className="mt-4 divide-y divide-border rounded-md border border-border">
        {items.map((it) => {
          const top = it.resources[0];
          const step = nextStep(it.goalId, progress);
          const total = (progress[it.goalId] ?? []).length;
          return (
            <li key={it.goalId} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-6">
              <div className="flex-1">
                <button type="button" onClick={() => onOpen(it, term)}
                  className="group inline-flex items-start gap-1 text-left font-semibold text-ink hover:text-blue">
                  <span>{it.title}</span>
                  <ChevronRight size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-muted group-hover:text-blue" />
                </button>
                {step ? (
                  <p className="mt-1 text-sm text-ink">
                    <span className="font-semibold">Step {step.n} of {step.total}: </span>{step.text}
                    {step.done > 0 && <span className="text-muted"> ({step.done} done)</span>}
                  </p>
                ) : total > 0 ? (
                  <p className="mt-1 text-sm text-green">Every step is checked. Open it to mark it as done.</p>
                ) : (
                  <p className="mt-1 text-sm text-muted">{it.why[0]}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {it.gate && <Tag tone="gate">Must-do</Tag>}
                  {it.partial && <Tag tone="partial">Continues next term</Tag>}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1 text-sm sm:w-56 sm:items-end sm:text-right">
                <span className="font-mono text-xs text-muted">{it.hours} h this term</span>
                {top && (
                  <a href={top.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue underline-offset-2 hover:underline">
                    {top.name}<ArrowUpRight size={14} aria-hidden="true" className="shrink-0" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {sorted.length > FIRST && (
        <button type="button" aria-expanded={all} onClick={() => setAll((x) => !x)}
          className="mt-2 min-h-11 px-1 text-sm text-blue underline underline-offset-2 hover:text-blue-hover">
          {all ? "Show fewer" : `Show ${sorted.length - FIRST} more this term`}
        </button>
      )}
    </section>
  );
}
