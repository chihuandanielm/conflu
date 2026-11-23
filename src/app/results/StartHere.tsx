import type { Plan, PlanItem, PlanTerm } from "../../engine/types.ts";
import { howTo, nextStep, type StepProgress } from "../state/steps.ts";
import { inWorkOrder } from "./order.ts";
import { placesOf } from "./Places.tsx";

/**
 * Do this now (design/DESIGN.md §7.4 #1): the one solid blue block on the page, under the status strip. This term's
 * first goal in work order (a must-do first when one is ready), its next step in bold, what it is part of, the place
 * to go for it as a framed "go to" link, and "Open the full goal".
 */
export function StartHere({ term, progress, onOpen, edges = [] }: {
  term: PlanTerm | undefined; progress: StepProgress; onOpen: (it: PlanItem, t: PlanTerm) => void; edges?: Plan["edges"];
}) {
  if (!term) return null;
  const ready = inWorkOrder(term.items.filter((i) => !i.option), edges).map((it) => ({ it, step: nextStep(it, progress) })).filter((x) => x.step);
  const pick = ready.find((x) => x.it.importance === "must") ?? ready[0];
  if (!pick) return null;
  const { it, step } = pick;
  const place = placesOf(it, 1)[0] ?? howTo(it).guides.map((g) => ({ id: g.id, name: g.name, url: g.url }))[0];
  return (
    <section aria-labelledby="now-h" className="on-blue grid gap-3 bg-blue p-[clamp(20px,4vw,36px)] text-sage">
      <h2 id="now-h" className="flex items-center gap-3 text-[1.1875rem] after:flex-1 after:border-t-[1.5px] after:border-sage">Do this now</h2>
      <p className="max-w-[26em] font-display text-[1.75rem] leading-[1.15] font-bold">{step!.text}</p>
      <p className="text-small">Part of <span className="label text-body">{it.title}</span>{" "}
        <span className="fact">· step {step!.n} of {step!.total}{it.importance === "must" || it.gate ? " · must-do" : ""}</span></p>
      {place && (
        <a href={place.url} target="_blank" rel="noopener noreferrer" className="block max-w-[26em] border-[1.5px] border-sage px-3.5 py-2.5 no-underline hover:bg-sage hover:text-blue">
          <span className="fact block">go to</span>
          <span className="label text-[1.1875rem] leading-[1.2]">{place.name}</span><span aria-hidden="true" className="fact ml-2">-&gt;</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
      <button type="button" className="btn btn--text -ml-2 justify-self-start" onClick={() => onOpen(it, term)}>Open the full goal</button>
    </section>
  );
}
