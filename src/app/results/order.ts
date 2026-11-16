// "Work through these in order": a term's goals by priority, but never before something they depend on.
import type { Plan, PlanItem } from "../../engine/types.ts";

export function inWorkOrder(items: PlanItem[], edges: Plan["edges"]): PlanItem[] {
  const byScore = [...items].sort((a, b) => b.score.total - a.score.total || a.goalId.localeCompare(b.goalId));
  const keys = new Set(items.map((i) => i.goalId));
  const needs = new Map<string, string[]>();
  for (const e of edges) if (keys.has(e.from) && keys.has(e.to)) needs.set(e.to, [...(needs.get(e.to) ?? []), e.from]);
  const out: PlanItem[] = [], done = new Set<string>();
  const byKey = new Map(items.map((i) => [i.goalId, i]));
  // Highest priority first; when a goal needs something else this term, that comes right before it.
  const emit = (i: PlanItem, seen = new Set<string>()) => {
    if (done.has(i.goalId) || seen.has(i.goalId)) return;
    seen.add(i.goalId);
    for (const d of (needs.get(i.goalId) ?? []).map((k) => byKey.get(k)!).sort((a, b) => b.score.total - a.score.total)) emit(d, seen);
    out.push(i); done.add(i.goalId);
  };
  for (const i of byScore) emit(i);
  return out;
}
