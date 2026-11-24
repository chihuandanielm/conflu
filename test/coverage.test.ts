// Every step a plan asks for comes with somewhere to start (engine 0.15.0, docs/IMPROVEMENT_PLAN.md 2.4 and 6.1): a
// resource the student can use, a how-to guide, or, where only their own school can help, what to look for there.
// Run: node --experimental-strip-types --test test/coverage.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { availableAt, buildPlan } from "../src/engine/engine.ts";
import { loadDataset } from "../src/engine/load.ts";
import type { PlanInput } from "../src/engine/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = loadDataset(join(root, "data"));
const majors = JSON.parse(readFileSync(join(root, "data/majors.json"), "utf8")).majors as { id: string; offeredAt: Record<string, unknown> }[];
const res = new Map(data.resources.map((r) => [r.id, r]));
const goals = new Map(data.goals.map((g) => [g.id, g]));
const SCHOOLS = [["nb", "rutgers-nb"], ["newark", "rutgers-newark"], ["camden", "rutgers-camden"], [null, "other"]] as const;
const plans = function* () {
  for (const [campus, school] of SCHOOLS)
    for (const m of majors.filter((x) => (campus ? campus in x.offeredAt : true))) for (const t of data.tracks.filter((x) => x.suggestedMajors.includes(m.id)))
      for (const [year, semester, today] of [[1, 1, "2026-10-01"], [3, 2, "2027-02-15"]] as const) {
        const input = { status: "college-student", majorId: m.id, year, semester, trackId: t.id, school, horizon: "graduation", today, weeklyHours: 5, summer: "full" } as PlanInput;
        yield { input, plan: buildPlan(input, data) };
      }
};

test("every planned goal has a resource, a guide, or what to look for at your school", () => {
  const gaps = new Map<string, number>();
  for (const { input, plan } of plans())
    for (const it of plan.terms.flatMap((t) => t.items)) {
      const g = goals.get(it.goalId.split("@")[0])!;
      const guides = (g.guides ?? []).filter((id) => res.get(id) && availableAt(res.get(id)!, input));
      if (!it.resources.length && !guides.length && !it.findOnCampus) { const k = `${input.school} ${g.id}`; gaps.set(k, (gaps.get(k) ?? 0) + 1); }
    }
  assert.deepEqual([...gaps].map(([k, n]) => `${k} (${n})`), []);
});

test("non-Rutgers plans say what changes, and skip Rutgers-only programs (needsProgram)", () => {
  for (const { input, plan } of plans()) {
    if (input.school !== "other") {
      assert.ok(!plan.warnings.some((w) => w.startsWith("Your school isn't Rutgers")), "Rutgers plans don't get the note");
      continue;
    }
    assert.ok(plan.warnings.some((w) => w.startsWith("Your school isn't Rutgers")), `${input.majorId}: no note`);
    for (const it of plan.terms.flatMap((t) => t.items)) assert.ok(!goals.get(it.goalId.split("@")[0])!.needsProgram, `${input.majorId}: ${it.goalId} is a Rutgers program`);
  }
});

test("the hint shows only when there's nothing else, or the school isn't Rutgers", () => {
  for (const { input, plan } of plans())
    for (const it of plan.terms.flatMap((t) => t.items))
      if (it.findOnCampus) assert.ok(input.school === "other" || !it.resources.length, `${input.school} ${it.goalId}`);
});
