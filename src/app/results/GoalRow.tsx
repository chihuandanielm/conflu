import type { PlanItem } from "../../engine/types.ts";
import { factLine } from "../map/facts.ts";

/**
 * One goal in a ruled list (design/DESIGN.md §7.4): a dot (solid for a must-do, green once done), the title, the fact
 * line, and on the full-size row the next step; a typed arrow at the right. The whole row opens the goal. Hover
 * underlines the title; nothing moves (a row that shifts on press looks indented on a phone).
 * `ruled={false}` leaves the rule under the row to the caller (a row followed by its linked places).
 */
export function GoalRow({ it, onOpen, next, small = false, done = false, ruled = true }: {
  it: PlanItem; onOpen: () => void; next?: string; small?: boolean; done?: boolean; ruled?: boolean;
}) {
  return (
    <button type="button" onClick={onOpen}
      className={`group grid w-full grid-cols-[auto_1fr_auto] items-baseline gap-x-3.5 gap-y-1 bg-sage px-1 text-left
        ${ruled ? "border-b-[1.5px] border-blue" : ""} ${small ? "py-2.5" : "py-4"}`}>
      <span aria-hidden="true" className={`dot ${done ? "dot--done" : it.gate ? "dot--must" : ""}`} />
      <span className={`text-blue underline-offset-4 group-hover:underline ${small ? "" : "text-lead leading-[1.25]"}`}>{it.title}</span>
      <span aria-hidden="true" className="col-start-3 row-start-1 font-mono text-blue">-&gt;</span>
      <span className="fact col-start-2">{done ? "done" : factLine(it)}</span>
      {next && <span className="col-start-2 text-small">{next}</span>}
    </button>
  );
}
