// What to do for each goal (data/goals.json steps, doneWhen, guides) and which steps this student has checked off.
// Checked steps are a per-browser convenience: they live in localStorage under cpm.steps.v1 and never change the plan.
import type { Resource } from "../../types.ts";
import { goals } from "../data/dataset.ts";
import { resourceById } from "../data/resources.ts";
import { load, save } from "./storage.ts";

export const STEPS_KEY = "cpm.steps.v1";
/** Checked step indexes per plan item key (yearly goals are checked per year: "f-fafsa@Y2"). */
export type StepProgress = Record<string, number[]>;

const goalById = new Map(goals.map((g) => [g.id, g]));

export interface HowTo { steps: string[]; doneWhen: string | null; guides: Resource[] }
/**
 * A plan item's steps. Engine 0.12.0 items carry `text`, the wording chosen for their timing (late, last chance, after
 * graduation), and `phaseSteps`, the steps for this term's part of a goal that runs over several terms. Plans saved
 * before 0.12.0 have neither: their `late` flag picks the goal's late wording, as it did then.
 */
export type ItemRef = string | { goalId: string; late?: boolean; text?: { steps: string[]; doneWhen: string | null }; phaseSteps?: number[] };
const keyOf = (item: ItemRef) => (typeof item === "string" ? item : item.goalId);
export function howTo(item: ItemRef): HowTo {
  const g = goalById.get(keyOf(item).split("@")[0]);
  const guides = (g?.guides ?? []).map((id) => resourceById.get(id)).filter((r): r is Resource => !!r);
  if (typeof item !== "string" && item.text) return { steps: item.text.steps, doneWhen: item.text.doneWhen, guides };
  const late = typeof item !== "string" && item.late ? (g?.variants?.find((v) => v.when === "late") ?? g?.variants?.[0]) : undefined;
  return { steps: late?.steps ?? g?.steps ?? [], doneWhen: late?.doneWhen ?? g?.doneWhen ?? null, guides };
}

export function loadSteps(): StepProgress {
  const raw = load<StepProgress>(STEPS_KEY);
  return raw && typeof raw === "object" ? raw : {};
}
export function toggleStep(p: StepProgress, itemKey: string, i: number): StepProgress {
  const cur = p[itemKey] ?? [];
  const next = cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i].sort((a, b) => a - b);
  const out = { ...p, [itemKey]: next };
  if (!next.length) delete out[itemKey];
  save(STEPS_KEY, out);
  return out;
}
/** The first step not checked yet, with its number, or null when every step is checked. */
export function nextStep(item: ItemRef, p: StepProgress): { n: number; text: string; done: number; total: number } | null {
  const itemKey = keyOf(item);
  const { steps } = howTo(item);
  const done = (p[itemKey] ?? []).filter((i) => i < steps.length);
  // This term's part first (engine 0.12.0), then anything still unchecked.
  const focus = typeof item === "string" ? [] : (item.phaseSteps ?? []).filter((k) => k < steps.length);
  const inFocus = focus.find((k) => !done.includes(k));
  const i = inFocus ?? steps.findIndex((_, k) => !done.includes(k));
  return i < 0 ? null : { n: i + 1, text: steps[i], done: done.length, total: steps.length };
}
