// Lead time and purpose (engine 0.10.0, docs/TIMING_AUDIT.md §7): a goal starts only with enough semesters left to
// finish it and for it to pay off, groundwork disappears once the thing it prepares for is done or underway, goals
// that need a degree program stay in that program, and a goal that can't start in time offers its shorter alternative.
// Run: node --experimental-strip-types --test test/leadtime.test.ts
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
const T = data.terms, ix = (c: string) => T.indexOf(c), GRAD = ix("4S");
const goal = (id: string) => data.goals.find((g) => g.id === id)!;
const schoolTermsLeft = (t: number) => T.slice(t, GRAD + 1).filter((c) => /[FS]$/.test(c)).length;

const SPRING = "2027-02-15", FALL = "2026-10-01";
const plan = (p: Partial<PlanInput>): Plan => buildPlan({ status: "college-student", majorId: "computer-science", year: 4, semester: 2, trackId: "research-phd",
  school: "rutgers-nb", horizon: "after-graduation", today: SPRING, weeklyHours: 10, summer: "full", ...p } as PlanInput, data);
const placed = (p: Plan, id: string) => p.terms.filter((t) => t.items.some((i) => i.goalId.split("@")[0] === id)).map((t) => t.code);
const queuedNext = (p: Plan, id: string) => p.backlog.some((b) => b.goalId.split("@")[0] === id && (b.kind === "next" || b.kind === "continues"));

test("the reported case: a senior in their last spring is not told to start an honors thesis", () => {
  const p = plan({ experience: ["research", "resume", "linkedin", "handshake", "club"] });
  assert.deepEqual(placed(p, "e-thesis"), []);
  assert.equal(queuedNext(p, "e-thesis"), false);
  // The research path gets the one-semester alternative instead.
  assert.deepEqual(placed(p, "e-research-project"), ["4S"]);
});

test("a junior gets the thesis early enough to finish: it starts with at least two semesters left", () => {
  for (const [year, semester, today] of [[3, 1, FALL], [3, 2, SPRING]] as const) {
    const ts = placed(plan({ year, semester, today, experience: ["research"] }), "e-thesis");
    if (ts.length) assert.ok(schoolTermsLeft(ix(ts[0])) >= 2, `year ${year} sem ${semester}: thesis starts ${ts[0]}`);
  }
});

test("the alternative only appears when the original can't start in time", () => {
  for (const year of [1, 2, 3] as const) assert.deepEqual(placed(plan({ year, semester: 1, today: FALL }), "e-research-project"), [], `year ${year}`);
});

test("no goal with a minimum number of semesters starts with fewer left, in any plan", () => {
  const needs = data.goals.filter((g) => g.minTermsLeft);
  assert.ok(needs.length >= 10, "goals that need semesters ahead are marked in the data");
  const WHEN = [[1, FALL], [2, SPRING], [undefined, "2027-06-20"]] as const;
  for (const m of majors) for (const track of data.tracks.filter((t) => t.suggestedMajors.includes(m.id))) for (const year of [1, 2, 3, 4] as const)
    for (const [semester, today] of WHEN) for (const experience of [[], ["research", "club", "resume"]]) {
      const p = plan({ majorId: m.id, trackId: track.id, year, semester, today, school: `rutgers-${Object.keys(m.offeredAt)[0]}` as PlanInput["school"], experience });
      for (const g of needs) {
        const ts = placed(p, g.id);
        if (ts.length) assert.ok(schoolTermsLeft(ix(ts[0])) >= g.minTermsLeft!, `${m.id}/${track.id} y${year}: ${g.id} starts ${ts[0]} with ${schoolTermsLeft(ix(ts[0]))} of ${g.minTermsLeft} semesters left`);
        if (p.ongoing.some((o) => o.goalId === g.id)) assert.ok(schoolTermsLeft(ix(p.terms[0].code)) >= g.minTermsLeft!, `${m.id}/${track.id} y${year}: ${g.id} listed as ongoing`);
      }
    }
});

test("groundwork drops once what it prepares for is done", () => {
  // A sophomore who has already done an internship in their target field.
  const p = plan({ majorId: "computer-science", trackId: "software-engineering", year: 2, semester: 1, today: FALL, experience: ["internship-target", "resume"] });
  for (const id of ["n-career-fair-first", "ap-early-programs", "ap-internship-early"]) {
    assert.deepEqual(placed(p, id), [], `${id} placed`);
    assert.equal(queuedNext(p, id), false, `${id} queued`);
  }
});

test("researching careers stops when the job search starts, unless the student is still exploring", () => {
  const swe = plan({ majorId: "computer-science", trackId: "software-engineering", year: 3, semester: 2, today: SPRING, weeklyHours: 15, horizon: "graduation" });
  for (const t of placed(swe, "f-explore-careers")) assert.ok(ix(t) < ix("4F"), `explore careers in ${t}, with the job search`);
  const exploring = plan({ majorId: "psychology", trackId: "exploring", year: 4, semester: 1, today: FALL });
  assert.ok(placed(exploring, "f-explore-careers").length || exploring.done.includes("f-explore-careers"), "still exploring keeps it");
});

test("goals that need a degree program never cross into another major, and the path says so", () => {
  const cases: [string, string, string][] = [
    ["psychology", "social-work-practice", "e-field-placement"],
    ["computer-science", "nursing-clinical", "a-nclex-prep"],
    ["computer-science", "nursing-clinical", "e-nursing-externship"],
    ["computer-science", "pharmacist", "e-pharmacy-intern"],
  ];
  for (const [majorId, trackId, id] of cases) {
    const p = plan({ majorId, trackId, year: 1, semester: 1, today: FALL });
    assert.deepEqual(placed(p, id), [], `${majorId}/${trackId}: ${id} placed`);
    assert.equal(queuedNext(p, id), false, `${majorId}/${trackId}: ${id} queued`);
    assert.ok(p.warnings.some((w) => w.includes(goal(id).title)), `${majorId}/${trackId}: no notice about ${id}`);
  }
  // Students in the program still get it.
  assert.ok(placed(plan({ majorId: "social-work", trackId: "social-work-practice", year: 3, semester: 2, today: SPRING }), "e-field-placement").length);
});

test("'Up next' only lists goals that can still start before the plan ends", () => {
  for (const [year, semester, today] of [[4, 1, FALL], [4, 2, SPRING], [3, 2, SPRING]] as const) {
    const p = plan({ trackId: "software-engineering", year, semester, today, weeklyHours: 2 });
    const last = Math.min(ix(p.terms.at(-1)!.code), GRAD);
    for (const b of p.backlog.filter((x) => x.kind === "next")) {
      const g = goal(b.goalId.split("@")[0]);
      if (g.minTermsLeft) assert.ok(schoolTermsLeft(ix(p.terms[0].code)) >= g.minTermsLeft || last < ix(p.terms[0].code), `year ${year}: "${b.title}" is next but can't start`);
    }
  }
});
