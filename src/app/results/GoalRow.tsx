import type { PlanItem } from "../../engine/types.ts";
import { factLine } from "../map/facts.ts";
import { IMPORTANCE } from "./EditMap.tsx";

/** The priority tag on a row: a must-do is solid blue, the rest outlined (design/DESIGN.md §7.4 #2). */
export function PriorityTag({ it }: { it: Pick<PlanItem, "importance" | "gate"> }) {
  const must = it.importance === "must" || it.gate;
  return (
    <span className={`fact px-1.5 leading-[1.5] ${must ? "bg-blue text-sage" : "border-[1.5px] border-blue text-blue"}`}>
      {must ? "must-do" : IMPORTANCE[it.importance].label.toLowerCase()}
    </span>
  );
}

/**
 * One goal in a ruled list (design/DESIGN.md §7.4): a dot (solid for a must-do, green once done), the title in
 * Barlow, a priority tag and the time in words ("foundation · about 4 hours, once"), and on the full-size row the next
 * step; a typed arrow at the right. The whole row opens the goal. Hover underlines the title; nothing moves.
 * `ruled={false}` leaves the rule under the row to the caller (a row followed by its linked places).
 */
export function GoalRow({ it, onOpen, next, small = false, done = false, ruled = true, termCode, weeks }: {
  it: PlanItem; onOpen: () => void; next?: string; small?: boolean; done?: boolean; ruled?: boolean; termCode?: string;
  /** Weeks of work left in the term (the current term is partly over), for "~N h a week". */
  weeks?: number;
}) {
  const fact = factLine({ ...it, gate: false }, termCode, weeks);
  return (
    <button type="button" onClick={onOpen}
      className={`group grid w-full grid-cols-[auto_1fr_auto] items-baseline gap-x-3.5 gap-y-1.5 bg-sage px-1 text-left
        ${ruled ? "border-b-[1.5px] border-blue" : ""} ${small ? "py-2.5" : "py-4"}`}>
      <span aria-hidden="true" className={`dot ${done ? "dot--done" : it.gate ? "dot--must" : ""}`} />
      <span className={`title text-blue underline-offset-4 group-hover:underline ${small ? "text-[1.125rem] leading-[1.2]" : "text-[1.3125rem] leading-[1.2]"}`}>{it.title}</span>
      <span aria-hidden="true" className="col-start-3 row-start-1 font-mono text-blue">-&gt;</span>
      <span className="col-start-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        {done ? <span className="fact">done</span> : <>{!small && <PriorityTag it={it} />}<span className="fact">{small && it.gate ? `must-do · ${fact}` : fact}</span>
          {/* Engine 0.14.0: a goal the student has partly done says so. */}
          {it.started ? <span className="fact">started, about {Math.round(it.started * 100)}% done</span> : null}</>}
      </span>
      {next && <span className="col-start-2 text-small">{next}</span>}
    </button>
  );
}
