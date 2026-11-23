import { describe, expect, it } from "vitest";
import { factLine, termBudget, timeLabel } from "./facts.ts";

import type { PlanItem } from "../../engine/types.ts";

const item = (over: Partial<Pick<PlanItem, "goalId" | "lane" | "hours" | "gate" | "partial">>) =>
  ({ goalId: "s-python", lane: "skills" as PlanItem["lane"], hours: 15, gate: false, partial: false, ...over });

describe("time, the way a student reads it", () => {
  it("says a short task is done once, in hours", () => {
    expect(timeLabel(item({ goalId: "f-resume-v1", lane: "foundation" as const, hours: 4 }), "1F")).toBe("about 4 hours, once");
    expect(timeLabel(item({ goalId: "f-fafsa@Y1", lane: "foundation" as const, hours: 1 }), "1F")).toBe("about 1 hour, once");
  });

  it("turns a longer goal into hours a week for this semester, with the total when it runs longer", () => {
    // 15 hours of a 30-hour goal in a 14-week fall: about 1 h a week, 30 h in all.
    expect(timeLabel(item({ hours: 15, partial: true }), "1F")).toBe("~1 h a week this semester (30 h in all)");
    expect(timeLabel(item({ goalId: "s-git", hours: 14 }), "2S")).toBe("~1 h a week this semester");
    expect(timeLabel(item({ goalId: "s-git", hours: 20 }), "1U")).toBe("~2 h a week this summer");
  });

  it("calls a full-time summer block what it is", () => {
    expect(timeLabel(item({ goalId: "e-internship-target", lane: "experience" as const, hours: 300 }), "2U")).toBe("full-time, one summer");
  });

  it("never shows a bare 'h' or a glyph in the fact line", () => {
    const f = factLine(item({ hours: 15, gate: true, partial: true }), "1F");
    expect(f).toBe("skills · ~1 h a week this semester (30 h in all) · must-do · continues");
    expect(f).not.toMatch(/[#:>@&]|\d h\b(?! a week| in all)/);
  });

  it("says how much of the student's free time a semester uses", () => {
    expect(termBudget({ code: "1F", usedHours: 56, capacityHours: 56 }, 5)).toBe("Uses about 4 of your 5 free hours a week.");
    expect(termBudget({ code: "1U", usedHours: 0, capacityHours: 40 }, 5)).toBe("Nothing planned in your free hours this term.");
  });
});
