// The fact line under any goal, always in this order (design/DESIGN.md §6): kind, hours, must-do, continues.
// Example: "# skills  15 h  must-do  continues".
import type { Plan, PlanItem } from "../../engine/types.ts";
import { inWorkOrder } from "../results/order.ts";
import { LANE_GLYPH, LANE_NAME, type MapModel } from "./confluence-map.js";

export const kindOf = (lane: string) => `${LANE_GLYPH[lane] ?? ""} ${LANE_NAME[lane] ?? lane}`.trim();

export function factLine(it: Pick<PlanItem, "lane" | "hours" | "gate" | "partial">): string {
  return [kindOf(it.lane), `${Math.round(it.hours)} h`, it.gate ? "must-do" : "", it.partial ? "continues" : ""].filter(Boolean).join("  ");
}

/**
 * The plan as the confluence map's model: terms in order, each term's goals in work order (priority, so the first
 * ones survive a trim). `only` keeps just those goals (the milestone map) and drops terms left empty.
 */
export function mapModel(plan: Plan, outcome: string, only?: Set<string>): MapModel {
  // A goal joins the river once, where it starts; with `only`, a term whose goals all started earlier would be empty.
  const seen = new Set<string>();
  return {
    outcome,
    terms: plan.terms.map((t) => ({
      code: t.code, label: t.label,
      items: inWorkOrder(t.items, plan.edges).filter((it) => !only || (only.has(it.goalId) && !seen.has(it.goalId) && !!seen.add(it.goalId))).map((it) => ({
        goalId: it.goalId, title: it.title, lane: it.lane, hours: Math.round(it.hours), gate: it.gate, late: !!it.late,
      })),
    })).filter((t) => !only || t.items.length > 0),
  };
}
