import { useId } from "react";
import type { PlanTerm } from "../../engine/types.ts";
import { intake } from "../data/dataset.ts";
import { termBudget, termWeeks } from "../map/facts.ts";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Where the student stands this term, in numbers: "4 goals · 1 must-do · 0 done". */
export function standingNumbers(term: PlanTerm, doneCount: number): string {
  const items = term.items.filter((i) => !i.option);
  const musts = items.filter((i) => i.importance === "must" || i.gate).length;
  return [plural(items.length, "goal"), plural(musts, "must-do"), `${doneCount} done`].join(" · ");
}

/** Hours a week this term asks for, rounded, as the meter fills them (0 when nothing is planned). */
export const usedPerWeek = (term: Pick<PlanTerm, "code" | "usedHours" | "capacityHours">, weeklyHours: number) =>
  term.usedHours <= 0 ? 0 : Math.max(1, Math.round(term.usedHours / termWeeks(term, weeklyHours)));

/**
 * This semester (design/DESIGN.md §7.4 #1): the left column of the Plan tab, beside "Do this now". The term in large
 * bold type; how much of the student's free time it uses, in words and as an hours meter (one ochre cell per hour used,
 * an open cell per hour left; a cell outlined in ochre past the budget); the numbers in mono; and a control to change
 * the hours, which re-plans at once (the hours are a budget the student sets, not a test they had to get right).
 */
export function StatusStrip({ term, doneCount, weeklyHours, onHours }: {
  term: PlanTerm | undefined; doneCount: number; weeklyHours: number; onHours: (h: number) => void;
}) {
  const id = useId();
  if (!term) return null;
  const used = usedPerWeek(term, weeklyHours);
  const cells = Math.max(weeklyHours, used);
  return (
    <div data-testid="standing" className="flex flex-col gap-1.5 min-[900px]:gap-2">
      <p className="fact max-[899px]:hidden">this semester</p>
      <p className="font-display text-[1.5rem] leading-none font-bold min-[900px]:text-[clamp(1.75rem,1.4rem+1.2vw,2.25rem)]">{term.label}</p>
      <p>{termBudget(term, weeklyHours)} <span className="whitespace-nowrap">{standingNumbers(term, doneCount)}.</span></p>
      {/* The meter: one cell per free hour a week. Ochre is "look here first": what this semester takes. */}
      <div aria-hidden="true" className="grid gap-1 min-[900px]:mt-1" style={{ gridTemplateColumns: `repeat(${Math.min(cells, 20)}, minmax(0, 1fr))` }}>
        {Array.from({ length: Math.min(cells, 20) }, (_, i) => (
          <span key={i} className={`h-3.5 border-[1.5px] ${i < used ? (i < weeklyHours ? "border-ochre bg-ochre" : "border-ochre") : "border-blue"}`} />
        ))}
      </div>
      <p className="fact max-[899px]:hidden">hours a week used</p>
      <p className="text-small min-[900px]:mt-2">
        <label htmlFor={id}>Free hours a week:</label>{" "}
        <select id={id} value={weeklyHours} onChange={(e) => onHours(Number(e.target.value))}
          className="min-h-9 cursor-pointer border-[1.5px] border-blue bg-sage px-1.5 font-mono text-fact text-ink">
          {intake.weeklyHours.map((h) => <option key={h} value={h}>{h} hours</option>)}
        </select>
      </p>
    </div>
  );
}
