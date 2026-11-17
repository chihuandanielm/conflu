// The saved plan: what the student answered, what they checked off, and where goals were placed last time.
// Stored as { answers, completedGoals, skipped, finalized, previousPlan, engineVersion, dataVersion, plan } in localStorage only.
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
  /** Goals crossed out as "Not for me" (engine 0.9.0). */
  skipped: string[];
  /** false: the draft map, with extra options to cross out or keep. true: the plan sized to the student's time. */
  finalized: boolean;
}

/** Plans saved before 0.9.0 have neither field: they open as they were, final, with nothing crossed out. */
export function normalize(s: SavedPlan): SavedPlan {
  return { ...s, skipped: s.skipped ?? [], finalized: s.finalized ?? true };
}

/** goalId -> first term it's placed in. Feeds the engine's stability bonus on the next run. */
export function placements(plan: Plan): Record<string, TermCode> {
  const out: Record<string, TermCode> = {};
  for (const t of plan.terms) for (const it of t.items) if (!it.option) out[it.goalId] ??= t.code; // draft options aren't commitments
  return out;
}

export function compute(answers: Answers, completedGoals: string[], previousPlan: Record<string, TermCode>, today: string,
  opt: { skipped?: string[]; draft?: boolean } = {}): Plan {
  return buildPlan({ ...toPlanInput(answers, today, { completedGoals, previousPlan }),
    ...(opt.skipped?.length ? { skippedGoals: opt.skipped } : {}), ...(opt.draft ? { draft: true } : {}) }, dataset);
}

/**
 * A fresh saved plan for new answers: the draft map, with more options than the student's time allows, to cross out or
 * mark done before finalizing. Check-offs, crossed-out goals and placements carry over when a student edits their answers.
 */
export function createSaved(answers: Answers, today: string, prior?: SavedPlan | null): SavedPlan {
  const completedGoals = prior?.completedGoals ?? [];
  const skipped = prior?.skipped ?? [];
  const previousPlan = prior ? placements(prior.plan) : {};
  return { answers, completedGoals, skipped, finalized: false, previousPlan, engineVersion: ENGINE_VERSION, dataVersion,
    plan: compute(answers, completedGoals, previousPlan, today, { skipped, draft: true }), dismissed: prior?.dismissed ?? [] };
}

/** True when the saved plan came from older data or an older engine. */
export const isOutdated = (s: SavedPlan) => s.dataVersion !== dataVersion || s.engineVersion !== ENGINE_VERSION;

/** Re-run with today's date and current data, keeping placements stable. */
export function refresh(s: SavedPlan, today: string): SavedPlan {
  const n = normalize(s);
  const previousPlan = placements(n.plan);
  return { ...n, previousPlan, engineVersion: ENGINE_VERSION, dataVersion,
    plan: compute(n.answers, n.completedGoals, previousPlan, today, { skipped: n.skipped, draft: !n.finalized }) };
}

/** Cross a goal out ("Not for me") and re-plan without it. */
export function skipGoal(s: SavedPlan, goalId: string, today: string): SavedPlan {
  const skipped = normalize(s).skipped;
  return refresh({ ...s, skipped: skipped.includes(goalId) ? skipped : [...skipped, goalId] }, today);
}

export function undoSkip(s: SavedPlan, goalId: string, today: string): SavedPlan {
  return refresh({ ...s, skipped: normalize(s).skipped.filter((g) => g !== goalId) }, today);
}

/** Finalize the draft: the plan sized to the student's own time, without the extra options. */
export const finalize = (s: SavedPlan, today: string): SavedPlan => refresh({ ...s, finalized: true }, today);
/** Back to the draft map, to see more options again. */
export const reopenDraft = (s: SavedPlan, today: string): SavedPlan => refresh({ ...s, finalized: false }, today);

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
  return s?.answers && s.plan ? normalize(s) : null;
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
