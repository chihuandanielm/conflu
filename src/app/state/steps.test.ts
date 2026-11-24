import { describe, expect, it } from "vitest";
import { checkedSteps, howTo, nextStep, toggleStep } from "./steps.ts";

describe("goal steps", () => {
  it("uses a goal's late wording when the plan schedules it after its ideal window", () => {
    expect(howTo("f-ces-advisor").steps[0]).toMatch(/Book a 30-minute appointment/);
    expect(howTo({ goalId: "f-ces-advisor", late: true }).doneWhen).toMatch(/semesters ahead/);
    expect(howTo({ goalId: "f-ces-advisor", late: true }).steps.join(" ")).not.toMatch(/4-year/);
    expect(howTo({ goalId: "f-resume-v1", late: true }).steps[0]).not.toMatch(/first-year/);
    // A goal without late wording keeps its usual steps.
    expect(howTo({ goalId: "p-linkedin-setup", late: true }).steps).toEqual(howTo("p-linkedin-setup").steps);
  });
  it("uses the engine's text for the item when the plan has it (engine 0.12.0)", () => {
    const text = { steps: ["One step here.", "Two steps here.", "Three steps here."], doneWhen: "Done when this is done." };
    expect(howTo({ goalId: "f-ces-advisor", text }).steps).toEqual(text.steps);
    expect(howTo({ goalId: "f-ces-advisor", text }).doneWhen).toBe(text.doneWhen);
    // Guides still come from the goal.
    expect(howTo({ goalId: "f-ces-advisor", text }).guides).toEqual(howTo("f-ces-advisor").guides);
  });
  it("points at this term's part of a goal that runs over several terms (engine 0.12.0)", () => {
    // Later terms of a research position skip the lab search: the next step is "show up reliably".
    expect(nextStep({ goalId: "e-research-assistant", phaseSteps: [4] }, {})!.n).toBe(5);
    // When this term's steps are all checked, the next unchecked step anywhere is shown.
    expect(nextStep({ goalId: "e-research-assistant", phaseSteps: [4] }, { "e-research-assistant": [4] })!.n).toBe(1);
    expect(nextStep({ goalId: "e-research-assistant", phaseSteps: [0, 1] }, { "e-research-assistant": [0] })!.n).toBe(2);
  });
  it("starts a goal the student has partly done with that share of its steps checked (engine 0.14.0)", () => {
    const li = { goalId: "p-linkedin-setup", started: 0.6 };
    const n = howTo(li).steps.length, k = Math.round(0.6 * n);
    expect(checkedSteps(li, {})).toEqual([...Array(k).keys()]);
    expect(nextStep(li, {})!.n).toBe(k + 1);
    // The student's own ticks win, and toggling keeps the pre-checked steps.
    expect(checkedSteps(li, { "p-linkedin-setup": [0] })).toEqual([0]);
    const after = toggleStep({}, li, n - 1);
    expect(after["p-linkedin-setup"]).toEqual([...Array(k).keys(), n - 1]);
  });
  it("tracks progress by plan item, including yearly rounds", () => {
    expect(nextStep({ goalId: "f-fafsa@Y2" }, { "f-fafsa@Y2": [0] })!.n).toBe(2);
    expect(nextStep({ goalId: "f-fafsa@Y3" }, { "f-fafsa@Y2": [0] })!.n).toBe(1);
  });
});
