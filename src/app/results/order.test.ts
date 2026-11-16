import { describe, expect, it } from "vitest";
import type { PlanItem } from "../../engine/types.ts";
import { inWorkOrder } from "./order.ts";

const item = (goalId: string, total: number) => ({ goalId, score: { total } }) as unknown as PlanItem;
describe("work order", () => {
  it("keeps priority order but puts prerequisites first", () => {
    const items = [item("f-mock-interview", 3), item("p-linkedin-setup", 2), item("f-elevator-pitch", 1)];
    expect(inWorkOrder(items, [{ from: "f-elevator-pitch", to: "f-mock-interview" }]).map((i) => i.goalId))
      .toEqual(["f-elevator-pitch", "f-mock-interview", "p-linkedin-setup"]);
    expect(inWorkOrder(items, []).map((i) => i.goalId)).toEqual(["f-mock-interview", "p-linkedin-setup", "f-elevator-pitch"]);
  });
});
