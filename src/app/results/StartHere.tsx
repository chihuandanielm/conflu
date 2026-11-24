import type { Plan, PlanItem, PlanTerm } from "../../engine/types.ts";
import { howTo, nextStep, type StepProgress } from "../state/steps.ts";
import { inWorkOrder } from "./order.ts";
import { placesOf } from "./Places.tsx";

/**
 * Do this now (design/DESIGN.md §7.4 #1): a retro window whose striped title bar is ochre, the "look here first" colour,
 * beside this semester's panel. This term's first goal in work order (a must-do first when one is ready): what it's
 * part of and which step, the step itself in bold, the place to go for it as a framed violet link, and "Open the full goal".
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
    <section aria-labelledby="now-h" className="win">
      <div className="win-bar win-bar--now"><h2 id="now-h">Do this now</h2></div>
      <div className="grid gap-3 p-[clamp(18px,3.2vw,30px)]">
        <p className="fact">step {step!.n} of {step!.total} · part of <span className="label text-body">{it.title}</span>{it.importance === "must" || it.gate ? " · must-do" : ""}</p>
        <p className="max-w-[26em] font-display text-[clamp(1.5rem,1.2rem+1.2vw,2.125rem)] leading-[1.1] font-bold">{step!.text}</p>
        {place && (
          <a href={place.url} target="_blank" rel="noopener noreferrer" className="block w-fit max-w-full border-[1.5px] border-violet px-3.5 py-2.5 no-underline transition-colors duration-[140ms] hover:bg-violet hover:text-sage">
            <span className="fact block">go to</span>
            <span className="label text-[1.1875rem] leading-[1.2]">{place.name}</span><span aria-hidden="true" className="fact ml-2">-&gt;</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
        <button type="button" className="btn btn--text -ml-2 justify-self-start" onClick={() => onOpen(it, term)}>Open the full goal</button>
      </div>
    </section>
  );
}
