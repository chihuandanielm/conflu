import { describe, expect, it } from "vitest";
import { howTo, nextStep } from "./steps.ts";

describe("goal steps", () => {
  it("uses a goal's late wording when the plan schedules it after its ideal window", () => {
    expect(howTo("f-ces-advisor").steps[0]).toMatch(/Book a 30-minute appointment/);
    expect(howTo({ goalId: "f-ces-advisor", late: true }).doneWhen).toMatch(/semesters ahead/);
    expect(howTo({ goalId: "f-ces-advisor", late: true }).steps.join(" ")).not.toMatch(/4-year/);
    expect(howTo({ goalId: "f-resume-v1", late: true }).steps[0]).not.toMatch(/first-year/);
    // A goal without late wording keeps its usual steps.
    expect(howTo({ goalId: "p-linkedin-setup", late: true }).steps).toEqual(howTo("p-linkedin-setup").steps);
  });
  it("tracks progress by plan item, including yearly rounds", () => {
    expect(nextStep({ goalId: "f-fafsa@Y2" }, { "f-fafsa@Y2": [0] })!.n).toBe(2);
    expect(nextStep({ goalId: "f-fafsa@Y3" }, { "f-fafsa@Y2": [0] })!.n).toBe(1);
  });
});
