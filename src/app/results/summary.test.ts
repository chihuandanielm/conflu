import { describe, expect, it } from "vitest";
import { buildPlan } from "../../engine/engine.ts";
import type { PlanInput } from "../../engine/types.ts";
import { dataset } from "../data/dataset.ts";
import { haves, milestones, moreTime, needs, outcomeText } from "./summary.ts";

const input = (over: Partial<PlanInput> = {}): PlanInput => ({ status: "college-student", majorId: "packaging-engineering", year: 2, semester: 1,
  trackId: "packaging-cpg", horizon: "graduation", today: "2026-09-15", weeklyHours: 5, summer: "full", location: "nj", school: "rutgers-nb", ...over });

describe("results summary", () => {
  it("names the outcome the student picked", () => {
    expect(outcomeText("packaging-cpg")).toBe("Land your first role in packaging engineering and consumer products");
    expect(outcomeText("medicine")).toMatch(/^Get into graduate or professional school/);
    expect(outcomeText("exploring")).toMatch(/direction that fits you/);
  });

  it("lists up to five milestones in the order they happen, starting with must-dos", () => {
    const p = buildPlan(input(), dataset);
    const ms = milestones(p);
    expect(ms.length).toBeGreaterThan(0);
    expect(ms.length).toBeLessThanOrEqual(5);
    const order = ms.map((m) => p.terms.findIndex((t) => t.code === m.term));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(ms.some((m) => /internship|co-op/i.test(m.title))).toBe(true);
  });

  it("turns answers into strengths and lists at most four needs", () => {
    expect(haves({ experience: ["resume", "club"], skills: ["cad"], credentials: [] })).toEqual(["I have a resume", "Member of a club or organization", "CAD (SOLIDWORKS, Onshape)"]);
    const n = needs(buildPlan(input(), dataset));
    expect(n.length).toBeGreaterThan(0);
    expect(n.length).toBeLessThanOrEqual(4);
  });

  it("'more time' never repeats the plan", () => {
    const p = buildPlan(input({ weeklyHours: 2 }), dataset);
    const planned = new Set(p.terms.flatMap((t) => t.items.map((i) => i.goalId)));
    for (const b of moreTime(p)) expect(planned.has(b.goalId)).toBe(false);
  });
});
