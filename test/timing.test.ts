// Text that fits the semester it's shown in (data 2026.11.23-3, docs/TIMING_AUDIT.md phase T1): no year or stage that
// has passed, no start-of-college wording late, no month that has passed in that term, and no relative time that's
// wrong ("next year" in the last semester, "remaining semesters" in the first year).
// Run: node --experimental-strip-types --test test/timing.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPlan } from "../src/engine/engine.ts";
import { loadDataset } from "../src/engine/load.ts";
import type { PlanInput } from "../src/engine/types.ts";
import { auditPlan, type Hit } from "../scripts/timing-rules.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = loadDataset(join(root, "data"));
const majors = JSON.parse(readFileSync(join(root, "data/majors.json"), "utf8")).majors as { id: string; offeredAt: Record<string, unknown> }[];

// Every major at its first campus, every suggested path, every year and season, with and without research experience
// (research unlocks the thesis), at two time budgets.
function hits(): Hit[] {
  const out: Hit[] = [];
  const WHEN = [[1, "2026-10-01", "fall"], [2, "2027-02-15", "spring"], [undefined, "2027-06-20", "summer"]] as const;
  for (const m of majors) {
    const school = `rutgers-${Object.keys(m.offeredAt)[0]}` as PlanInput["school"];
    const tracks = data.tracks.filter((t) => t.suggestedMajors.includes(m.id));
    for (const track of tracks) for (const year of [1, 2, 3, 4] as const) for (const [semester, today, season] of WHEN)
      for (const [weeklyHours, experience] of [[5, []], [15, ["research", "resume", "linkedin", "handshake"]]] as const) {
        const input: PlanInput = { status: "college-student", majorId: m.id, year, semester, trackId: track.id, school, horizon: "after-graduation",
          today, weeklyHours, summer: "full", location: "nj", citizenship: "us-citizen", experience: [...experience] };
        out.push(...auditPlan(buildPlan(input, data), data, `${m.id} · ${track.id} · year ${year} ${season} · ${weeklyHours} h`));
      }
  }
  return out;
}

const all = hits();
const show = (xs: Hit[]) => [...new Map(xs.map((h) => [`${h.goal} · ${h.field} · "${h.phrase}" in ${h.term}`, h])).entries()]
  .slice(0, 12).map(([k, h]) => `${k}\n    ${h.text}\n    e.g. ${h.student}`).join("\n");

for (const rule of ["T1", "T2", "T4", "T6"]) {
  test(`${rule}: no text that points at the wrong time for the term it's shown in`, () => {
    const bad = all.filter((h) => h.rule.startsWith(rule));
    assert.equal(bad.length, 0, `${bad.length} lines:\n${show(bad)}`);
  });
}
