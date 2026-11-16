// Snapshot of 336 New Brunswick plans (every track and year; plain, international, and first-gen + low-income) that
// test/campus.test.ts compares against, so planning only changes on purpose. Re-run after an intended planning change
// and say why in the commit: node --experimental-strip-types scripts/nb-baseline.ts
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPlan, ENGINE_VERSION } from "../src/engine/engine.ts";
import { loadDataset } from "../src/engine/load.ts";
import type { PlanInput } from "../src/engine/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = loadDataset(join(root, "data"));
export function nbCases(tracks: { id: string; suggestedMajors: string[] }[]): PlanInput[] {
  const cases: PlanInput[] = [];
  for (const t of tracks) for (const year of [1, 2, 3, 4] as const) {
    const base: PlanInput = { status: "college-student", majorId: t.suggestedMajors[0] ?? "economics", year, trackId: t.id,
      horizon: "graduation", today: "2026-11-13", weeklyHours: 8, summer: "full", school: "rutgers-nb", location: "nj" };
    cases.push(base, { ...base, citizenship: "international" }, { ...base, identity: ["first-generation", "low-income"], horizon: "1yr" });
  }
  return cases;
}
const snapshot = nbCases(data.tracks).map((input) => {
  const p = buildPlan(input, data);
  return {
    input,
    terms: p.terms.map((t) => ({ code: t.code, items: t.items.map((i) => `${i.goalId}|${i.hours}|${i.partial}|${i.resources.map((r) => r.id).join(",")}`) })),
    backlog: p.backlog.map((b) => b.goalId),
    warnings: p.warnings.length,
  };
});
writeFileSync(join(root, "test/fixtures/nb-plans-baseline.json"), JSON.stringify({ engineVersion: ENGINE_VERSION, plans: snapshot }) + "\n");
console.log(`Saved ${snapshot.length} New Brunswick plans`);
