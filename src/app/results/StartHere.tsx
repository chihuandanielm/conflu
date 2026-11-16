import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { PlanItem, PlanTerm } from "../../engine/types.ts";
import type { Plan } from "../../engine/types.ts";
import { howTo, nextStep, type StepProgress } from "../state/steps.ts";
import { inWorkOrder } from "./order.ts";

/** The one thing to do next: the first unchecked step of this term's top goal. Everything else can wait. */
export function StartHere({ term, progress, onOpen, edges = [] }: {
  term: PlanTerm | undefined; progress: StepProgress; onOpen: (it: PlanItem, t: PlanTerm) => void; edges?: Plan["edges"];
}) {
  if (!term) return null;
  const items = inWorkOrder(term.items, edges);
  const pick = items.map((it) => ({ it, step: nextStep(it, progress) })).find((x) => x.step);
  if (!pick) return null;
  const { it, step } = pick;
  const link = howTo(it).guides[0] ?? it.resources[0];
  return (
    <section aria-labelledby="start-h" className="rounded-md border border-blue/30 bg-blue-tint p-5">
      <h2 id="start-h" className="text-sm font-semibold text-blue">Start here</h2>
      <p className="mt-2 text-lg font-semibold text-ink">{step!.text}</p>
      <p className="mt-1 text-sm text-muted">Step {step!.n} of {step!.total} for “{it.title}”.</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button type="button" onClick={() => onOpen(it, term)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-blue px-4 font-semibold text-white hover:bg-blue-hover">
          See all steps <ArrowRight size={16} aria-hidden="true" />
        </button>
        {link && (
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-blue underline-offset-2 hover:underline">
            {link.name}<ArrowUpRight size={14} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>
    </section>
  );
}
