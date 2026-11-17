import type { Plan, PlanItem, PlanTerm } from "../../engine/types.ts";
import { nextStep, type StepProgress } from "../state/steps.ts";
import { inWorkOrder } from "./order.ts";

/**
 * Start here (design/DESIGN.md §7.4 #3): the one solid blue block on the page. The first unchecked step of this
 * term's top goal, what it is part of, and "Open this goal". Everything else can wait.
 */
export function StartHere({ term, progress, onOpen, edges = [] }: {
  term: PlanTerm | undefined; progress: StepProgress; onOpen: (it: PlanItem, t: PlanTerm) => void; edges?: Plan["edges"];
}) {
  if (!term) return null;
  const pick = inWorkOrder(term.items, edges).map((it) => ({ it, step: nextStep(it, progress) })).find((x) => x.step);
  if (!pick) return null;
  const { it, step } = pick;
  return (
    <section aria-labelledby="start-h" className="on-blue grid gap-3.5 bg-blue p-[clamp(20px,4vw,36px)] text-sage">
      <h2 id="start-h" className="fact">Start here</h2>
      <p className="max-w-[26em] text-h2 leading-[1.25]">{step!.text}</p>
      <p>Part of: {it.title} <span className="fact ml-1">step {step!.n} of {step!.total}</span></p>
      <button type="button" className="btn justify-self-start" onClick={() => onOpen(it, term)}>Open this goal</button>
    </section>
  );
}
