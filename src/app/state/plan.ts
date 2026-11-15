// The saved plan: what the student answered, what they checked off, and where goals were placed last time.
// Stored as { answers, completedGoals, previousPlan, engineVersion, dataVersion, plan } in localStorage only.
import { buildPlan, ENGINE_VERSION } from "../../engine/engine.ts";
import type { Plan, TermCode } from "../../engine/types.ts";
import { dataset, dataVersion } from "../data/dataset.ts";
import { toPlanInput, type Answers } from "../intake/model.ts";
import { load, remove, save } from "./storage.ts";

export const PLAN_KEY = "cpm.plan.v1";

export interface SavedPlan {
  answers: Answers;
  completedGoals: string[];
  previousPlan: Record<string, TermCode>;
  engineVersion: string;
  dataVersion: string;
  /** The last plan shown, kept so an outdated plan can be shown as-is until the student refreshes it. */
  plan: Plan;
  dismissed: string[];
}

/** goalId -> first term it's placed in. Feeds the engine's stability bonus on the next run. */
export function placements(plan: Plan): Record<string, TermCode> {
  const out: Record<string, TermCode> = {};
  for (const t of plan.terms) for (const it of t.items) out[it.goalId] ??= t.code;
  return out;
}

export function compute(answers: Answers, completedGoals: string[], previousPlan: Record<string, TermCode>, today: string): Plan {
  return buildPlan(toPlanInput(answers, today, { completedGoals, previousPlan }), dataset);
}

/** A fresh saved plan for new answers. Check-offs and placements carry over when a student edits their answers. */
export function createSaved(answers: Answers, today: string, prior?: SavedPlan | null): SavedPlan {
  const completedGoals = prior?.completedGoals ?? [];
  const previousPlan = prior ? placements(prior.plan) : {};
  return { answers, completedGoals, previousPlan, engineVersion: ENGINE_VERSION, dataVersion,
    plan: compute(answers, completedGoals, previousPlan, today), dismissed: prior?.dismissed ?? [] };
}

/** True when the saved plan came from older data or an older engine. */
export const isOutdated = (s: SavedPlan) => s.dataVersion !== dataVersion || s.engineVersion !== ENGINE_VERSION;

/** Re-run with today's date and current data, keeping placements stable. */
export function refresh(s: SavedPlan, today: string): SavedPlan {
  const previousPlan = placements(s.plan);
  return { ...s, previousPlan, engineVersion: ENGINE_VERSION, dataVersion, plan: compute(s.answers, s.completedGoals, previousPlan, today) };
}

/** Check a goal off and re-plan around it. */
export function markDone(s: SavedPlan, goalId: string, today: string): SavedPlan {
  const completedGoals = s.completedGoals.includes(goalId) ? s.completedGoals : [...s.completedGoals, goalId];
  return refresh({ ...s, completedGoals }, today);
}

export function undoDone(s: SavedPlan, goalId: string, today: string): SavedPlan {
  return refresh({ ...s, completedGoals: s.completedGoals.filter((g) => g !== goalId) }, today);
}

export const loadSaved = () => {
  const s = load<SavedPlan>(PLAN_KEY);
  return s?.answers && s.plan ? s : null;
};
export const persist = (s: SavedPlan) => save(PLAN_KEY, s);
export const clearSaved = () => remove(PLAN_KEY);

/** Which goals moved term (or appeared/disappeared) between two plans; used to highlight changes after a re-plan. */
export function diff(before: Plan, after: Plan): { moved: Set<string>; added: Set<string>; removed: Set<string> } {
  const a = placements(before), b = placements(after);
  const moved = new Set<string>(), added = new Set<string>(), removed = new Set<string>();
  for (const k of Object.keys(b)) { if (!(k in a)) added.add(k); else if (a[k] !== b[k]) moved.add(k); }
  for (const k of Object.keys(a)) if (!(k in b)) removed.add(k);
  return { moved, added, removed };
}
