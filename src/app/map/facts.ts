// The fact line under any goal, always in this order (design/DESIGN.md §6): kind, time, must-do, continues.
// Example: "skills · ~1 h a week this semester (30 h in all) · must-do · continues".
import type { Plan, PlanItem, PlanTerm } from "../../engine/types.ts";
import { goals } from "../data/dataset.ts";
import { inWorkOrder } from "../results/order.ts";
import { LANE_GLYPH, LANE_NAME, type MapModel } from "./confluence-map.js";

export const kindOf = (lane: string) => `${LANE_GLYPH[lane] ?? ""} ${LANE_NAME[lane] ?? lane}`.trim();

/** Weeks in a term, as the engine counts them (docs/ALGORITHM.md): fall and spring 14, summer 10. */
const weeksOf = (code: string) => (code.endsWith("U") ? 10 : 14);
const goalOf = (goalId: string) => goals.find((g) => g.id === goalId.split("@")[0]);
/** Up to this many hours, a goal reads as one sitting or two ("about 4 hours, once"), not as hours a week. */
const ONCE = 6;

type Timed = Pick<PlanItem, "goalId" | "hours">;

/**
 * How long a goal takes, the way a student reads it: a short task "about 4 hours, once"; a longer one as hours a week
 * for this term, with the goal's total when it runs past this term; a full-time block "full-time, one summer"; a goal
 * done inside coursework "inside your coursework". Never a bare "30 h", which reads as 30 hours a week.
 */
export function timeLabel(it: Timed, termCode: string, opt: { weeks?: number; short?: boolean } = {}): string {
  const goal = goalOf(it.goalId);
  if (goal?.integrated) return opt.short ? "in coursework" : "inside your coursework";
  const summer = termCode.endsWith("U");
  if (it.hours >= 300) return opt.short ? "full-time" : summer ? "full-time, one summer" : "full-time this semester";
  const total = Math.max(goal?.hours ?? it.hours, it.hours);
  const h = Math.max(1, Math.round(it.hours));
  if (total <= ONCE) return opt.short ? `~${h} h, once` : `about ${h} ${h === 1 ? "hour" : "hours"}, once`;
  const weekly = Math.max(1, Math.round(it.hours / (opt.weeks ?? weeksOf(termCode))));
  if (opt.short) return `~${weekly} h a week`;
  return `~${weekly} h a week this ${summer ? "summer" : "semester"}${total > it.hours ? ` (${Math.round(total)} h in all)` : ""}`;
}

/**
 * Weeks of work left in a term, as the engine sized it: the current term is only partly left (its free hours were
 * scaled down), so hours a week divide by the weeks that remain, not the whole term.
 */
export function termWeeks(term: Pick<PlanTerm, "code" | "capacityHours">, weeklyHours: number): number {
  const full = weeksOf(term.code);
  if (!weeklyHours || term.capacityHours <= 0) return full;
  return Math.min(full, Math.max(1, term.capacityHours / (weeklyHours * 0.8)));
}

/** The fact line: kind, time, must-do, continues. With no term (a draft option takes no hours), the time is the goal's total. */
export function factLine(it: Timed & Pick<PlanItem, "lane" | "gate" | "partial">, termCode?: string, weeks?: number): string {
  const time = termCode ? timeLabel(it, termCode, { weeks }) : `${Math.round(goalOf(it.goalId)?.hours ?? it.hours)} h in all`;
  return [LANE_NAME[it.lane] ?? it.lane, time, it.gate ? "must-do" : "", it.partial ? "continues" : ""].filter(Boolean).join(" · ");
}

/** How much of the student's free time a term uses: "Uses about 4 of your 5 free hours a week." */
export function termBudget(term: Pick<PlanTerm, "code" | "usedHours" | "capacityHours">, weeklyHours: number): string {
  if (term.usedHours <= 0) return "Nothing planned in your free hours this term.";
  const used = Math.max(1, Math.round(term.usedHours / termWeeks(term, weeklyHours)));
  return used > weeklyHours ? `Uses about ${used} hours a week, a little over your ${weeklyHours}.` : `Uses about ${used} of your ${weeklyHours} free hours a week.`;
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
        time: it.option ? undefined : timeLabel(it, t.code, { short: true }),
      })),
    })).filter((t) => !only || t.items.length > 0),
  };
}
