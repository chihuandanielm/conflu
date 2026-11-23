import type { Plan, PlanItem, PlanTerm } from "../../engine/types.ts";
import { howTo, nextStep, type StepProgress } from "../state/steps.ts";
import { inWorkOrder } from "./order.ts";
import { PlaceLink, placesOf } from "./Places.tsx";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** One line on where the student stands this semester: how many goals, how many must-dos, how many done so far. */
export function standingLine(term: PlanTerm, doneCount: number): string {
  const musts = term.items.filter((i) => i.importance === "must" && !i.option).length;
  const goals = term.items.filter((i) => !i.option).length;
  const parts = [`${plural(goals, "goal")} this semester`];
  if (musts) parts.push(`${musts} of them ${musts === 1 ? "is a must-do" : "are must-dos"}`);
  return `${parts.join(", ")}.${doneCount ? ` ${plural(doneCount, "goal")} done so far.` : ""}`;
}

/**
 * Do this now (design/DESIGN.md §7.4 #1): the one card at the top of the Plan tab, and the one solid blue block on the
 * page. A sand strip with where the student stands, then this semester's first goal in work order (a must-do first
 * when one is ready), its next step, the place to go for it (linked), and "Open this goal".
 */
export function StartHere({ term, progress, onOpen, edges = [], doneCount = 0 }: {
  term: PlanTerm | undefined; progress: StepProgress; onOpen: (it: PlanItem, t: PlanTerm) => void; edges?: Plan["edges"]; doneCount?: number;
}) {
  if (!term) return null;
  const ready = inWorkOrder(term.items.filter((i) => !i.option), edges).map((it) => ({ it, step: nextStep(it, progress) })).filter((x) => x.step);
  const pick = ready.find((x) => x.it.importance === "must") ?? ready[0];
  if (!pick) return null;
  const { it, step } = pick;
  const place = placesOf(it, 1)[0] ?? howTo(it).guides.map((g) => ({ id: g.id, name: g.name, url: g.url }))[0];
  return (
    <section aria-labelledby="now-h">
      <p data-testid="standing" className="notice">{standingLine(term, doneCount)}</p>
      <div className="on-blue grid gap-3.5 bg-blue p-[clamp(20px,4vw,36px)] text-sage">
        <h2 id="now-h" className="text-lead">Do this now</h2>
        <p className="fact">This semester: {term.label.toLowerCase()}</p>
        <p className="max-w-[26em] text-h2 leading-[1.25]">{step!.text}</p>
        <p>Part of: {it.title} <span className="fact ml-1">step {step!.n} of {step!.total}</span></p>
        {place && <p>Go to: <PlaceLink name={place.name} url={place.url} /></p>}
        <button type="button" className="btn justify-self-start" onClick={() => onOpen(it, term)}>Open this goal</button>
      </div>
    </section>
  );
}
