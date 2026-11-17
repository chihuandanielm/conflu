import { useState } from "react";
import type { Plan, PlanItem, PlanTerm } from "../../engine/types.ts";
import { nextStep, type StepProgress } from "../state/steps.ts";
import { GoalRow } from "./GoalRow.tsx";
import { inWorkOrder } from "./order.ts";

const FIRST = 3;

/**
 * This semester (design/DESIGN.md §7.4 #4): a fact line with the term and the hours it is sized to, then a ruled list
 * of the term's goals in work order, each with its next step. Three shown; "Show all N" for the rest.
 */
export function NextMoves({ term, onOpen, progress = {}, weeklyHours, edges = [] }: {
  term: PlanTerm | undefined; onOpen: (it: PlanItem, t: PlanTerm) => void; progress?: StepProgress; weeklyHours?: number; edges?: Plan["edges"];
}) {
  const [all, setAll] = useState(false);
  if (!term || term.items.length === 0) {
    return (
      <section aria-labelledby="next-h">
        <h2 id="next-h" className="text-h2">This semester</h2>
        <p className="mt-2">Nothing is scheduled for this term. Check the notices below, or add hours to fit more in.</p>
      </section>
    );
  }
  const sorted = inWorkOrder(term.items, edges);
  const items = all ? sorted : sorted.slice(0, FIRST);
  return (
    <section aria-labelledby="next-h">
      <h2 id="next-h" className="text-h2">This semester</h2>
      <p className="fact mt-1.5">{term.label.toLowerCase()}{"  "}sized to {weeklyHours ? `your ${weeklyHours} free hours a week` : "the time you have"}</p>
      <ol className="mt-4 border-t-[1.5px] border-blue">
        {items.map((it) => {
          const step = nextStep(it, progress);
          const total = (progress[it.goalId] ?? []).length;
          const next = step ? `Next: ${step.text}` : total > 0 ? "Every step is checked. Open it to mark it as done." : it.why[0];
          return <li key={it.goalId}><GoalRow it={it} next={next} onOpen={() => onOpen(it, term)} /></li>;
        })}
      </ol>
      {sorted.length > FIRST && (
        <button type="button" aria-expanded={all} onClick={() => setAll((x) => !x)} className="btn btn--text mt-2">
          {all ? "Show fewer" : `Show all ${sorted.length}`}
        </button>
      )}
    </section>
  );
}
