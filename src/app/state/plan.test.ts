import { describe, expect, it } from "vitest";
import { emptyAnswers, type Answers } from "../intake/model.ts";
import { createSaved, diff, finalize, isOutdated, markDone, normalize, placements, reopenDraft, skipGoal, undoDone, undoSkip } from "./plan.ts";

const cs: Answers = { ...emptyAnswers(), status: "college-student", majorId: "computer-science", year: 2, trackId: "software-engineering",
  horizon: "graduation", summer: "full", school: "rutgers-nb", location: "nj" };
const today = "2026-11-15";

describe("saved plan", () => {
  it("builds a plan stamped with the current engine and data versions", () => {
    const s = createSaved(cs, today);
    expect(isOutdated(s)).toBe(false);
    expect(isOutdated({ ...s, dataVersion: "old" })).toBe(true);
    expect(Object.keys(placements(s.plan)).length).toBeGreaterThan(10);
  });

  it("marking a goal done removes it and keeps other placements stable", () => {
    const s = createSaved(cs, today);
    const goal = s.plan.terms[0].items[0].goalId;
    const after = markDone(s, goal, today);
    expect(after.completedGoals).toEqual([goal]);
    expect(placements(after.plan)[goal]).toBeUndefined();
    const d = diff(s.plan, after.plan);
    expect(d.removed.has(goal)).toBe(true);
    expect(d.moved.size).toBeLessThanOrEqual(5);
    expect(after.previousPlan).toEqual(placements(s.plan));
  });

  it("undo puts the goal back", () => {
    const s = createSaved(cs, today);
    const goal = s.plan.terms[0].items[0].goalId;
    const back = undoDone(markDone(s, goal, today), goal, today);
    expect(back.completedGoals).toEqual([]);
    expect(placements(back.plan)[goal]).toBeDefined();
  });

  it("carries check-offs over when answers are edited", () => {
    const s = markDone(createSaved(cs, today), "f-ces-advisor", today);
    const edited = createSaved({ ...cs, weeklyHours: 10 }, today, s);
    expect(edited.completedGoals).toContain("f-ces-advisor");
  });
});

describe("draft map, not for me, finalize (engine 0.9.0)", () => {
  it("a new plan starts as the draft, with extra options; finalizing sizes it to the student's time", () => {
    const s = createSaved(cs, today);
    expect(s.finalized).toBe(false);
    const options = s.plan.terms.flatMap((t) => t.items.filter((i) => i.option));
    expect(options.length).toBeGreaterThan(5);
    // Options don't count as placements (no stability pull toward a term the student never committed to).
    for (const o of options) expect(placements(s.plan)[o.goalId]).toBeUndefined();
    const f = finalize(s, today);
    expect(f.finalized).toBe(true);
    expect(f.plan.terms.flatMap((t) => t.items).some((i) => i.option)).toBe(false);
    expect(reopenDraft(f, today).finalized).toBe(false);
  });

  it("crossing a goal out re-plans without it, and Undo brings it back", () => {
    const s = createSaved(cs, today);
    const goal = s.plan.terms[0].items.find((i) => !i.gate && !i.essential)!.goalId;
    const after = skipGoal(s, goal, today);
    expect(after.skipped).toEqual([goal]);
    expect(placements(after.plan)[goal]).toBeUndefined();
    expect(after.plan.skipped.map((x) => x.goalId)).toEqual([goal]);
    const back = undoSkip(after, goal, today);
    expect(back.skipped).toEqual([]);
    expect(back.plan.terms.flatMap((t) => t.items).some((i) => i.goalId === goal)).toBe(true);
  });

  it("crossed-out goals stay crossed out after finalizing and after editing answers", () => {
    const s = skipGoal(createSaved(cs, today), "p-linkedin-setup", today);
    expect(placements(finalize(s, today).plan)["p-linkedin-setup"]).toBeUndefined();
    expect(createSaved({ ...cs, weeklyHours: 10 }, today, s).skipped).toEqual(["p-linkedin-setup"]);
  });

  it("plans saved before 0.9.0 open as they were: final, nothing crossed out", () => {
    const s = createSaved(cs, today);
    const old = { ...s } as Partial<typeof s>;
    delete old.finalized; delete old.skipped;
    const n = normalize(old as typeof s);
    expect(n.finalized).toBe(true);
    expect(n.skipped).toEqual([]);
  });
});
