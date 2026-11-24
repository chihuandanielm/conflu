// Text that knows when it's read (engine 0.12.0, docs/TIMING_AUDIT.md phase T2): every planned item says how its
// timing stands (early, on time, late, last chance, after graduation), carries the wording for that timing, and, for a
// goal that runs over several terms, which part this term is (start, continue, finish) and which steps belong to it.
// The site and the PDF read item.text, so they can't disagree.
// Run: node --experimental-strip-types --test test/text.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPlan } from "../src/engine/engine.ts";
import { loadDataset } from "../src/engine/load.ts";
import type { Plan, PlanInput, PlanItem } from "../src/engine/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = loadDataset(join(root, "data"));
const majors = JSON.parse(readFileSync(join(root, "data/majors.json"), "utf8")).majors as { id: string; offeredAt: Record<string, unknown> }[];
const goal = (id: string) => data.goals.find((g) => g.id === id)!;
const plan = (p: Partial<PlanInput>): Plan => buildPlan({ status: "college-student", majorId: "computer-science", year: 4, semester: 1, trackId: "software-engineering",
  school: "rutgers-nb", horizon: "after-graduation", today: "2026-10-01", weeklyHours: 5, summer: "full", ...p } as PlanInput, data);
const items = (p: Plan, id: string) => p.terms.flatMap((t) => t.items.filter((i) => i.goalId.split("@")[0] === id).map((i) => ({ code: t.code, it: i })));

test("no goal uses the old one-switch late wording; variants say when they apply", () => {
  for (const g of data.goals) {
    assert.equal((g as { late?: unknown }).late, undefined, `${g.id} still has late`);
    for (const v of g.variants ?? []) assert.ok(["late", "last-chance", "after-grad"].includes(v.when), `${g.id}: ${v.when}`);
  }
});

test("every planned item has its timing and its text, across every major, path, year, and season", () => {
  const WHEN = [[1, "2026-10-01"], [2, "2027-02-15"], [undefined, "2027-06-20"]] as const;
  for (const m of majors) for (const track of data.tracks.filter((t) => t.suggestedMajors.includes(m.id))) for (const year of [1, 2, 3, 4] as const) for (const [semester, today] of WHEN) {
    const p = plan({ majorId: m.id, trackId: track.id, year, semester, today, school: `rutgers-${Object.keys(m.offeredAt)[0]}` as PlanInput["school"] });
    for (const t of p.terms) for (const it of t.items) {
      const where = `${m.id}/${track.id} y${year} ${t.code} ${it.goalId}`;
      assert.ok(["early", "on-time", "late", "last-chance", "after-grad"].includes(it.timing), `${where}: timing ${it.timing}`);
      if (t.code.startsWith("G")) assert.equal(it.timing, "after-grad", where);
      assert.ok(it.text && it.text.steps.length >= 3, `${where}: steps`);
      for (const i of it.phaseSteps ?? []) assert.ok(i >= 0 && i < it.text.steps.length, `${where}: phase step ${i}`);
    }
  }
});

test("after graduation the job search uses its after-graduation wording", () => {
  const p = plan({ year: 4, semester: 2, today: "2027-02-15" });
  const after = items(p, "ap-fulltime").filter((x) => x.code.startsWith("G"));
  assert.ok(after.length, "the job search runs past graduation");
  const v = goal("ap-fulltime").variants!.find((x) => x.when === "after-grad")!;
  for (const { it } of after) { assert.equal(it.title, v.title); assert.deepEqual(it.text.steps, v.steps); }
});

test("late goals use their late wording; on-time goals don't", () => {
  let late = 0, onTime = 0;
  for (const year of [1, 2, 3, 4] as const) for (const weeklyHours of [2, 5, 15]) {
    const p = plan({ year, weeklyHours, semester: 1, today: "2026-10-01" });
    for (const id of ["f-ces-advisor", "f-resume-v1"]) for (const { code, it } of items(p, id)) {
      const v = goal(id).variants!.find((x) => x.when === "late")!;
      if (it.timing === "late") { late++; assert.equal(it.title, v.title ?? goal(id).title, `${id} ${code}`); assert.equal(it.late, true); }
      if (it.timing === "on-time") { onTime++; assert.equal(it.title, goal(id).title, `${id} ${code}`); assert.equal(it.late, undefined); }
    }
  }
  assert.ok(late && onTime, `both cases seen: ${late} late, ${onTime} on time`);
});

test("a goal over several terms says which part each term is, and the later terms point past the setup steps", () => {
  const p = plan({ trackId: "research-phd", year: 2, semester: 1, today: "2026-10-01", weeklyHours: 5, experience: [] });
  const ra = items(p, "e-research-assistant");
  assert.ok(ra.length >= 2, `research assistant spans terms: ${ra.map((x) => x.code)}`);
  assert.equal(ra[0].it.phase, "start");
  for (const x of ra.slice(1)) assert.ok(x.it.phase === "continue" || x.it.phase === "finish", `${x.code}: ${x.it.phase}`);
  const spec = goal("e-research-assistant").phases!;
  assert.deepEqual(ra[0].it.phaseSteps, spec.start);
  assert.deepEqual(ra.at(-1)!.it.phaseSteps, ra.at(-1)!.it.phase === "finish" ? spec.finish : spec.continue);
  // One-term items have no phase.
  for (const t of p.terms) for (const it of t.items) if (items(p, it.goalId.split("@")[0]).length === 1) assert.equal(it.phase, undefined, it.goalId);
});

test("after graduation the job search isn't the same card twice", () => {
  const p = plan({ year: 4, semester: 2, today: "2027-02-15" });
  const js = items(p, "ap-fulltime");
  const shapes = js.map((x) => `${x.it.phase}:${(x.it.phaseSteps ?? []).join(",")}`);
  assert.equal(new Set(shapes).size, shapes.length, `job search cards: ${shapes.join(" | ")}`);
});

test("phases in the data point at real steps", () => {
  for (const g of data.goals) for (const [who, spec, steps] of [[g.id, g.phases, g.steps], ...(g.variants ?? []).map((v) => [`${g.id}/${v.when}`, v.phases, v.steps ?? g.steps] as const)] as const) {
    if (!spec) continue;
    for (const k of ["start", "continue", "finish"] as const) {
      assert.ok(spec[k]?.length, `${who}: ${k} empty`);
      for (const i of spec[k]!) assert.ok(i >= 0 && i < steps!.length, `${who}: ${k} step ${i}`);
    }
  }
  assert.ok(data.goals.filter((g) => g.phases).length >= 12, "goals that span terms have phases");
});

void (null as unknown as PlanItem);
