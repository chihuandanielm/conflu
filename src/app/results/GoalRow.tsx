import type { PlanItem } from "../../engine/types.ts";
import { factLine } from "../map/facts.ts";

/**
 * One goal in a ruled list (design/DESIGN.md §7.4): a dot (solid for a must-do, green once done), the title, the fact
 * line, and on the full-size row the next step; a typed arrow at the right. The whole row opens the goal.
 */
export function GoalRow({ it, onOpen, next, small = false, done = false }: {
  it: PlanItem; onOpen: () => void; next?: string; small?: boolean; done?: boolean;
}) {
  return (
    <button type="button" onClick={onOpen}
      className={`grid w-full grid-cols-[auto_1fr_auto] items-baseline gap-x-3.5 gap-y-1 border-b-[1.5px] border-blue bg-sage px-1 text-left
        transition-[padding] duration-[140ms] ease-confluence hover:pl-3 ${small ? "py-2.5" : "py-4"}`}>
      <span aria-hidden="true" className={`dot ${done ? "dot--done" : it.gate ? "dot--must" : ""}`} />
      <span className={small ? "" : "text-lead leading-[1.25]"}>{it.title}</span>
      <span aria-hidden="true" className="col-start-3 row-start-1 font-mono">-&gt;</span>
      <span className="fact col-start-2">{done ? "done" : factLine(it)}</span>
      {next && <span className="col-start-2 text-small">{next}</span>}
    </button>
  );
}
