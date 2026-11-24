// Plans that fit the student (engine 0.13.0, docs/T4_PLAN.md): a student graduating a year later gets the runway they
// really have, labelled with their real year, and the final semester stays short.
// Run: node --experimental-strip-types --test test/fit.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPlan } from "../src/engine/engine.ts";
import { loadDataset } from "../src/engine/load.ts";
import type { Plan, PlanInput } from "../src/engine/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = loadDataset(join(root, "data"));
const majors = JSON.parse(readFileSync(join(root, "data/majors.json"), "utf8")).majors as { id: string; offeredAt: Record<string, unknown> }[];
const plan = (p: Partial<PlanInput>): Plan => buildPlan({ status: "college-student", majorId: "computer-science", year: 3, semester: 1, trackId: "software-engineering",
  school: "rutgers-nb", horizon: "graduation", today: "2026-10-01", weeklyHours: 5, summer: "full", ...p } as PlanInput, data);
const shape = (p: Plan) => p.terms.map((t) => `${t.code}:${t.items.map((i) => i.goalId).join(",")}`);

test("graduating a year later plans the runway of a year earlier, labelled with the real year", () => {
  const later = plan({ year: 3, graduation: "year-later" });
  const runway = plan({ year: 2 });
  assert.deepEqual(shape(later), shape(runway), "same plan as the matching on-time runway");
  assert.equal(later.terms[0].label, "Year 3 · Fall");
  const lastSchool = later.terms.filter((t) => !t.code.startsWith("G")).at(-1)!;
  assert.equal(lastSchool.label, "Year 5 · Spring");
  assert.ok(later.terms.some((t) => t.label === "Summer after year 4"), "summers are relabelled too");
  // After graduation stays "After graduation".
  for (const t of later.terms.filter((x) => x.code.startsWith("G"))) assert.match(t.label, /^After graduation/);
});

test("yearly rounds are named with the real year", () => {
  const later = plan({ year: 3, graduation: "year-later" });
  const rounds = later.terms.flatMap((t) => t.items).filter((i) => i.goalId.includes("@Y")).concat();
  const named = [...rounds.map((i) => i.title), ...later.backlog.filter((b) => b.goalId.includes("@Y")).map((b) => b.title)].filter((x) => /\(year \d\)/.test(x));
  assert.ok(named.length, "some yearly round is named by year");
  for (const t of named) assert.ok(Number(t.match(/\(year (\d)\)/)![1]) >= 3, `"${t}" uses the planning year, not the real one`);
});

test("on time, or a first-year, is unchanged", () => {
  assert.deepEqual(shape(plan({ graduation: "on-time" })), shape(plan({})));
  assert.deepEqual(shape(plan({ year: 1, graduation: "year-later" })), shape(plan({ year: 1 })));
  assert.equal(plan({ year: 1, graduation: "year-later" }).terms[0].label, "Year 1 · Fall");
});

test("the final semester holds at most 3 goals besides must-dos and the steps they need now", () => {
  const WHEN = [[1, "2026-10-01"], [2, "2027-02-15"]] as const;
  let seen = 0;
  for (const m of majors) for (const track of data.tracks.filter((t) => t.suggestedMajors.includes(m.id))) for (const year of [3, 4] as const) for (const [semester, today] of WHEN)
    for (const weeklyHours of [5, 20]) {
      const p = plan({ majorId: m.id, trackId: track.id, year, semester, today, weeklyHours, school: `rutgers-${Object.keys(m.offeredAt)[0]}` as PlanInput["school"] });
      const last = p.terms.find((t) => t.code === "4S");
      if (!last) continue;
      seen++;
      const others = last.items.filter((i) => !i.gate && !i.essential && !i.option);
      assert.ok(others.length <= 3, `${m.id}/${track.id} y${year} ${weeklyHours}h: ${others.map((i) => i.goalId).join(", ")}`);
    }
  assert.ok(seen > 100);
});
