// What the results page says before any details: where the student is headed, what they already have, and what they
// need. Pure functions over the plan and answers, so the page and the PDF say the same thing.
import type { Plan, PlanItem, Track } from "../../engine/types.ts";
import { competencyNames, goals, intake, tracks } from "../data/dataset.ts";
import { campusName, majorName, trackName, yearTermLabel, type Answers } from "../intake/model.ts";

const goalById = new Map(goals.map((g) => [g.id, g]));
const base = (key: string) => key.split("@")[0];

/** The summary line under "Your plan", on the page and in the PDF. */
export function planSummary(a: Answers): string {
  const when = yearTermLabel(a) ?? `Year ${a.year}`;
  return `${trackName(a.trackId)} · ${majorName(a.majorId)} · ${when}${a.enrollment === "part-time" ? " (part-time)" : ""} · ${campusName(a.school)} · ${a.weeklyHours} free hours a week`;
}

/** One sentence for the goal card. */
export function outcomeText(trackId: string | undefined): string {
  const t = tracks.find((x) => x.id === trackId) as Track | undefined;
  if (!t || t.id === "exploring") return "Find the direction that fits you, with a strong start on the basics";
  const field = t.name.charAt(0).toLowerCase() + t.name.slice(1);
  return t.outcome === "grad-school" ? `Get into graduate or professional school for ${field}` : `Land your first role in ${field}`;
}

export interface Milestone { goalId: string; title: string; term: string; termLabel: string; mustDo: boolean }

/**
 * The few milestones on the way to the goal, in order: must-dos and the plan's biggest applications and experiences
 * (internship, co-op, research, job search, grad applications), each at its first term. Up to five.
 */
export function milestones(plan: Plan, max = 5): Milestone[] {
  const seen = new Set<string>(), out: Milestone[] = [];
  for (const t of plan.terms) for (const it of t.items) {
    const g = goalById.get(base(it.goalId));
    if (!g || seen.has(g.id)) continue;
    const big = (g.category === "applications" || g.category === "experience") && it.score.weight >= 0.85;
    if (!it.gate && !big) continue;
    seen.add(g.id);
    out.push({ goalId: it.goalId, title: it.title, term: t.code, termLabel: t.label, mustDo: it.gate });
  }
  // Must-dos first if there are too many, but keep the order they happen in.
  if (out.length <= max) return out;
  const keep = new Set([...out.filter((m) => m.mustDo), ...out.filter((m) => !m.mustDo)].slice(0, max).map((m) => m.goalId));
  return out.filter((m) => keep.has(m.goalId));
}

const optionLabel = (list: { id: string; label: string }[], id: string) => list.find((o) => o.id === id)?.label;

/** The student's own answers, as strengths. */
export function haves(a: Pick<Answers, "experience" | "skills" | "credentials">): string[] {
  return [
    ...a.experience.map((id) => optionLabel(intake.experience, id)),
    ...a.skills.map((id) => optionLabel(intake.skills, id)),
    ...a.credentials.map((id) => optionLabel(intake.credentials, id)),
  ].filter((x): x is string => !!x);
}

export interface Need { label: string; detail: string; item: PlanItem; term: string }

/**
 * What matters most for the goal, at most four: unfinished must-dos first, then the student's biggest skill gaps, each
 * with the earliest planned goal that builds it.
 */
export function needs(plan: Plan, max = 4): Need[] {
  const out: Need[] = [], used = new Set<string>();
  const firstPlacement = (pred: (it: PlanItem) => boolean) => {
    for (const t of plan.terms) for (const it of t.items) if (pred(it)) return { it, t };
    return null;
  };
  for (const t of plan.terms) for (const it of t.items) {
    if (!it.gate || used.has(base(it.goalId)) || out.length >= max) continue;
    used.add(base(it.goalId));
    out.push({ label: it.title, detail: `Must-do · ${t.label}`, item: it, term: t.code });
  }
  const gaps = Object.entries(plan.competencies.gap).filter(([, v]) => (v ?? 0) > 0.05).sort((x, y) => (y[1] ?? 0) - (x[1] ?? 0));
  for (const [c] of gaps) {
    if (out.length >= max) break;
    const hit = firstPlacement((it) => !used.has(base(it.goalId)) && ((goalById.get(base(it.goalId))?.competencies as Record<string, number | undefined> | undefined)?.[c] ?? 0) >= 0.3);
    if (!hit) continue;
    used.add(base(hit.it.goalId));
    out.push({ label: competencyNames[c] ?? c, detail: `${hit.it.title} · ${hit.t.label}`, item: hit.it, term: hit.t.code });
  }
  return out;
}

/** "When you have more time": the queue's next goals, in order. Never what's planned, started, or past. */
export const moreTime = (plan: Plan) => plan.backlog.filter((b) => b.kind === "next");
