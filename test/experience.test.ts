// Plans that respond to experience (engine 0.14.0, docs/IMPROVEMENT_PLAN.md Phase 5): a student who has done things
// gets fewer foundation goals than one who hasn't, and goals they've started say so.
// Run: node --experimental-strip-types --test test/experience.test.ts
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

// The improvement plan's "decent" students (docs/IMPROVEMENT_PLAN.md, How this was tested).
export const DECENT = {
  1: { experience: ["resume", "linkedin", "club", "job", "volunteer"], skills: ["excel", "speaking"] },
  3: { experience: ["resume", "linkedin", "club", "job", "volunteer", "leader", "internship-any", "career-fair", "info-interviews", "recommenders"], skills: ["excel", "speaking"] },
} as const;
const plan = (p: Partial<PlanInput>): Plan => buildPlan({ status: "college-student", majorId: "computer-science", year: 1, semester: 1, trackId: "software-engineering",
  school: "rutgers-nb", horizon: "graduation", today: "2026-10-01", weeklyHours: 5, summer: "full", ...p } as PlanInput, data);
const foundation = (p: Plan) => p.terms.flatMap((t) => t.items).filter((i) => i.lane === "foundation" || i.lane === "presence").length;

test("experience changes the plan: juniors get at least 20% fewer foundation goals; first-years fewer, with more advanced ones", () => {
  // First-years keep most foundation goals whatever they've done (a FAFSA every year, an advisor, career research), so the
  // 20% target (docs/IMPROVEMENT_PLAN.md 5.2) applies to juniors, where experience should change the direction.
  for (const [year, semester, today] of [[1, 1, "2026-10-01"], [3, 2, "2027-02-15"]] as const) {
    let none = 0, decent = 0, noneOther = 0, decentOther = 0;
    for (const [campus, school] of [["nb", "rutgers-nb"], ["newark", "rutgers-newark"], ["camden", "rutgers-camden"], [null, "other"]] as const)
      for (const m of majors.filter((x) => (campus ? campus in x.offeredAt : true))) for (const t of data.tracks.filter((x) => x.suggestedMajors.includes(m.id))) {
        const base = { majorId: m.id, trackId: t.id, school, year, semester, today } as Partial<PlanInput>;
        const a = plan(base), b = plan({ ...base, experience: [...DECENT[year].experience], skills: [...DECENT[year].skills] });
        none += foundation(a); decent += foundation(b);
        noneOther += a.terms.flatMap((x) => x.items).length - foundation(a); decentOther += b.terms.flatMap((x) => x.items).length - foundation(b);
        // Nothing the student said they've done comes back.
        for (const it of b.terms.flatMap((x) => x.items).filter((i) => !i.goalId.includes("@"))) assert.ok(!b.done.includes(it.goalId), `${m.id}/${t.id} y${year}: ${it.goalId} is done`);
      }
    const fewer = Math.round((1 - decent / none) * 100);
    if (year === 3) assert.ok(decent <= none * 0.8, `juniors: ${decent} foundation goals with decent experience vs ${none} with none (${fewer}% fewer)`);
    else { assert.ok(decent < none, `first-years: ${decent} vs ${none}`); assert.ok(decentOther >= noneOther, `first-years advanced goals: ${decentOther} vs ${noneOther}`); }
  }
});

test("a goal the student has started says how far along it is", () => {
  const p = plan({ experience: ["linkedin"] });
  const li = p.terms.flatMap((t) => t.items).find((i) => i.goalId === "p-linkedin-setup");
  assert.ok(li, "LinkedIn setup is planned");
  assert.ok(li!.started && li!.started > 0 && li!.started < 1, `started: ${li!.started}`);
  for (const t of p.terms) for (const it of t.items) if (!it.started) assert.ok(!it.why.includes("You've already started this."), it.goalId);
});

test("a goal with less than an hour left counts as done", () => {
  // A career fair means you've introduced yourself to employers: the 1-hour pitch has under an hour left.
  const p = plan({ experience: ["career-fair"] });
  assert.ok(!p.terms.some((t) => t.items.some((i) => i.goalId === "f-elevator-pitch")), "pitch planned after a career fair");
});
