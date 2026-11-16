import { describe, expect, it } from "vitest";
import { emptyAnswers, type Answers } from "../intake/model.ts";
import { createSaved, diff, isOutdated, markDone, placements, undoDone } from "./plan.ts";

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
