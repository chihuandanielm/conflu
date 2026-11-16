import { describe, expect, it } from "vitest";
import { buildPlan } from "../../engine/engine.ts";
import { dataset, majors, resources, uiIntake } from "./dataset.ts";

describe("browser dataset", () => {
  it("loads every data file", () => {
    expect(majors).toHaveLength(20);
    expect(dataset.goals).toHaveLength(109);
    expect(dataset.tracks).toHaveLength(27);
    expect(resources).toHaveLength(285);
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
