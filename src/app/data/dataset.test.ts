import { describe, expect, it } from "vitest";
import { buildPlan } from "../../engine/engine.ts";
import { campuses, dataset, majors, resources, uiIntake } from "./dataset.ts";

describe("browser dataset", () => {
  it("loads every data file", () => {
    expect(majors).toHaveLength(21);
    expect(campuses.map((c) => c.school)).toEqual(["rutgers-nb", "rutgers-newark", "rutgers-camden"]);
    expect(dataset.goals).toHaveLength(111);
    expect(dataset.tracks).toHaveLength(28);
    expect(resources).toHaveLength(407); // every file in data/resources, including student-tools.json
    expect(new Set(resources.map((r) => r.id)).size).toBe(resources.length);
    expect(uiIntake.experienceGroups.flatMap((g) => g.options)).toHaveLength(dataset.intake.experience.length);
  });

  it("runs the engine on the bundled data", () => {
    const plan = buildPlan({ status: "college-student", majorId: "computer-science", year: 2, trackId: "software-engineering",
      horizon: "graduation", today: "2026-11-15" }, dataset);
    expect(plan.terms[0].code).toBe("2F");
    expect(plan.terms.some((t) => t.items.length > 0)).toBe(true);
  });
});
