import { useId } from "react";
import type { PlanTerm } from "../../engine/types.ts";
import { intake } from "../data/dataset.ts";
import { termBudget } from "../map/facts.ts";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Where the student stands this term, in numbers: "4 goals · 1 must-do · 0 done". */
export function standingNumbers(term: PlanTerm, doneCount: number): string {
  const items = term.items.filter((i) => !i.option);
  const musts = items.filter((i) => i.importance === "must" || i.gate).length;
  return [plural(items.length, "goal"), plural(musts, "must-do"), `${doneCount} done`].join(" · ");
}

/**
 * Where you stand (design/DESIGN.md §7.4 #1): the sand attention strip at the top of the Plan tab. The term in bold,
 * the numbers in mono, how much of the student's free time the term uses, and a control to change those hours, which
 * re-plans at once (the hours are a budget the student sets, not a test they had to get right).
 */
export function StatusStrip({ term, doneCount, weeklyHours, onHours }: {
  term: PlanTerm | undefined; doneCount: number; weeklyHours: number; onHours: (h: number) => void;
}) {
  const id = useId();
  if (!term) return null;
  return (
    <div data-testid="standing" className="notice flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <p className="label text-[1.25rem] whitespace-nowrap">{term.label}</p>
      <p className="fact">{standingNumbers(term, doneCount)}</p>
      <p className="basis-full text-small">{termBudget(term, weeklyHours)}</p>
      <p className="basis-full text-small">
        <label htmlFor={id}>Free hours a week:</label>{" "}
        <select id={id} value={weeklyHours} onChange={(e) => onHours(Number(e.target.value))}
          className="min-h-9 cursor-pointer border-[1.5px] border-ink bg-sand px-1.5 font-mono text-fact text-ink">
          {intake.weeklyHours.map((h) => <option key={h} value={h}>{h} hours</option>)}
        </select>
      </p>
    </div>
  );
}
