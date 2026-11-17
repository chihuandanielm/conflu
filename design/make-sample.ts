// Builds the sample data the prototypes draw, from the real engine and the real data/. Nothing is invented.
// Run: node --experimental-strip-types design/make-sample.ts
//
// The shape written here is the "view model" every results surface reads (page, map, PDF). In the app it comes
// from Plan + Answers through src/app/results/summary.ts; this script repeats that logic without the app imports.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPlan } from "../src/engine/engine.ts";
import { loadDataset } from "../src/engine/load.ts";
import type { PlanInput, PlanItem } from "../src/engine/types.ts";

const here = dirname(fileURLToPath(import.meta.url)), root = join(here, "..");
const data = loadDataset(join(root, "data"));
const read = (f: string) => JSON.parse(readFileSync(join(root, "data", f), "utf8"));
const intake = read("intake.json"), majors = read("majors.json").majors, ui = read("ui/intake.json");
const goalById = new Map(data.goals.map((g) => [g.id, g]));
const base = (k: string) => k.split("@")[0];
const COMP: Record<string, string> = { csd: "Career direction", comm: "Communication", crit: "Critical thinking", equity: "Equity and inclusion", lead: "Leadership", prof: "Professionalism", team: "Teamwork", tech: "Technology" };

const PERSONAS: Record<string, PlanInput> = {
  // A long plan: two and a half years to graduation.
  "cs-sophomore": { status: "college-student", majorId: "computer-science", year: 2, semester: 1, trackId: "software-engineering", horizon: "graduation",
    today: "2026-11-13", weeklyHours: 8, summer: "full", location: "nj", citizenship: "us-citizen", school: "rutgers-nb",
    identity: ["first-generation"], experience: ["resume", "club", "linkedin", "job"], skills: ["python"] },
  // A short plan: a senior with six months.
  "polisci-senior": { status: "college-student", majorId: "political-science", year: 4, semester: 1, trackId: "government-policy", horizon: "6mo",
    today: "2026-11-13", weeklyHours: 6, summer: "none", school: "rutgers-nb", experience: ["resume", "club", "writing-clips"] },
};

for (const [name, input] of Object.entries(PERSONAS)) {
  const plan = buildPlan(input, data);
  const track = data.tracks.find((t) => t.id === input.trackId)!;
  const field = track.name.charAt(0).toLowerCase() + track.name.slice(1);
  const outcome = (track as { outcome?: string }).outcome === "grad-school" ? `Get into graduate or professional school for ${field}` : `Land your first role in ${field}`;
  const label = (list: { id: string; label: string }[], id: string) => list.find((o) => o.id === id)?.label;
  const haves = [...(input.experience ?? []).map((id) => label(intake.experience, id)), ...(input.skills ?? []).map((id) => label(intake.skills, id)),
    ...(input.credentials ?? []).map((id) => label(intake.credentials, id))].filter(Boolean);
  const item = (it: PlanItem) => {
    const g = goalById.get(base(it.goalId))! as unknown as { steps?: string[]; doneWhen?: string; late?: { steps?: string[]; doneWhen?: string } };
    return { goalId: it.goalId, title: it.title, lane: it.lane, hours: Math.round(it.hours), gate: it.gate, partial: it.partial, late: !!it.late,
      why: it.why, steps: (it.late && g.late?.steps) || g.steps || [], doneWhen: (it.late && g.late?.doneWhen) || g.doneWhen || "",
      resources: it.resources.map((r) => ({ name: r.name, url: r.url, note: r.note })), score: it.score.total };
  };
  const terms = plan.terms.map((t) => ({ code: t.code, label: t.label, capacityHours: Math.round(t.capacityHours), usedHours: Math.round(t.usedHours),
    items: [...t.items].sort((a, b) => b.score.total - a.score.total).map(item) })).filter((t) => t.items.length);
  const seen = new Set<string>(), milestones: { goalId: string; title: string; termLabel: string; gate: boolean }[] = [];
  for (const t of plan.terms) for (const it of t.items) {
    const g = goalById.get(base(it.goalId)); if (!g || seen.has(g.id)) continue;
    const big = (g.category === "applications" || g.category === "experience") && it.score.weight >= 0.85;
    if (!it.gate && !big) continue;
    seen.add(g.id); milestones.push({ goalId: it.goalId, title: it.title, termLabel: t.label, gate: it.gate });
  }
  const needs: { label: string; detail: string; goalId: string }[] = [], used = new Set<string>();
  for (const t of plan.terms) for (const it of t.items) if (it.gate && !used.has(base(it.goalId)) && needs.length < 4) {
    used.add(base(it.goalId)); needs.push({ label: it.title, detail: `Must-do · ${t.label}`, goalId: it.goalId });
  }
  for (const [c] of Object.entries(plan.competencies.gap).filter(([, v]) => (v ?? 0) > 0.05).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))) {
    if (needs.length >= 4) break;
    let hit: { it: PlanItem; label: string } | null = null;
    for (const t of plan.terms) { for (const it of t.items) if (!used.has(base(it.goalId)) && (((goalById.get(base(it.goalId))?.competencies as Record<string, number>)?.[c]) ?? 0) >= 0.3) { hit = { it, label: t.label }; break; } if (hit) break; }
    if (!hit) continue;
    used.add(base(hit.it.goalId)); needs.push({ label: COMP[c] ?? c, detail: `${hit.it.title} · ${hit.label}`, goalId: hit.it.goalId });
  }
  const yt = intake.yearTerms.find((y: { year: number; semester: number }) => y.year === input.year && y.semester === input.semester)?.label;
  const model = {
    summary: [track.name, majors.find((m: { id: string }) => m.id === input.majorId)?.name, yt, ui.school.options.find((o: { id: string }) => o.id === input.school)?.label, `${input.weeklyHours} free hours a week`].join(" · "),
    track: track.name, outcome, weeklyHours: input.weeklyHours, haves, needs, milestones: milestones.slice(0, 5), terms,
    more: plan.backlog.filter((b) => b.kind === "next").slice(0, 3).map((b) => ({ title: b.title, reason: b.reason })),
    ongoing: plan.ongoing.map((o) => ({ title: o.title, why: o.why })), warnings: plan.warnings,
    meta: plan.meta,
  };
  writeFileSync(join(here, "prototypes/sample", `${name}.js`), `// Generated by design/make-sample.ts from the real engine and data. Do not edit.\nexport default ${JSON.stringify(model, null, 1)};\n`);
  console.log(name, terms.length, "terms,", terms.reduce((n, t) => n + t.items.length, 0), "goals,", milestones.length, "milestones,", needs.length, "needs,", plan.warnings.length, "notices");
}
