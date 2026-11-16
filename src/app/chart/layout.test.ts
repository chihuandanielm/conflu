import { describe, expect, it } from "vitest";
import { buildPlan } from "../../engine/engine.ts";
import { dataset } from "../data/dataset.ts";
import { LANES } from "../results/lanes.ts";
import { COL_W, LABEL_W, layoutPlan, nodeId, related } from "./layout.ts";

const plan = buildPlan({ status: "college-student", majorId: "computer-science", year: 2, trackId: "software-engineering",
  horizon: "graduation", today: "2026-11-15", weeklyHours: 10, summer: "full" }, dataset);
const coop = buildPlan({ status: "college-student", majorId: "mechanical-engineering", year: 2, trackId: "mechanical-design",
  horizon: "graduation", today: "2026-11-15", weeklyHours: 10, summer: "full", openToCoop: true }, dataset);

describe("chart layout", () => {
  it("puts each term in its own column and every placed goal on the grid", () => {
    const l = layoutPlan(plan);
    const items = l.nodes.filter((n) => n.type === "item" || n.type === "block");
    expect(items).toHaveLength(plan.terms.reduce((s, t) => s + t.items.length, 0));
    plan.terms.forEach((t, col) => {
      for (const it of t.items) {
        const n = l.nodes.find((x) => x.id === nodeId(t.code, it.goalId))!;
        expect(n.x).toBeGreaterThanOrEqual(LABEL_W + col * COL_W);
        expect(n.x).toBeLessThan(LABEL_W + (col + 1) * COL_W);
      }
    });
  });

  it("orders lanes as ALGORITHM.md §7 and hides empty ones", () => {
    const l = layoutPlan(plan);
    expect(l.lanes).toEqual(LANES.filter((x) => l.lanes.includes(x)));
    const tops = l.lanes.map((lane) => l.nodes.find((n) => n.id === `lane:${lane}`)!.y);
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
  });

  it("never overlaps two goal cards", () => {
    const cards = layoutPlan(plan).nodes.filter((n) => n.type === "item" || n.type === "block");
    for (const a of cards) for (const b of cards) if (a !== b) {
      const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false);
    }
  });

  it("puts full-time summer goals in the full-time band", () => {
    const l = layoutPlan(plan);
    const band = l.nodes.find((n) => n.id === "lane:full-time")!;
    const blocks = l.nodes.filter((n) => n.type === "block");
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) expect(b.y).toBeGreaterThanOrEqual(band.y);
  });

  it("joins a goal split across terms with continuation lines", () => {
    const l = layoutPlan(plan);
    const count = new Map<string, number>();
    for (const t of plan.terms) for (const i of t.items) count.set(i.goalId, (count.get(i.goalId) ?? 0) + 1);
    const split = [...count].filter(([, n]) => n > 1);
    expect(split.length).toBeGreaterThan(0);
    for (const [g, n] of split) expect(l.edges.filter((e) => e.kind === "continues" && e.from === g)).toHaveLength(n - 1);
  });

  it("draws an arrow for every prerequisite edge whose ends are on the chart", () => {
    const l = layoutPlan(plan);
    expect(l.edges.filter((e) => e.kind === "prereq")).toHaveLength(plan.edges.length);
  });

  it("removes a lane's cards and arrows when the lane is filtered out", () => {
    const l = layoutPlan(plan, new Set(["skills"]));
    expect(l.lanes).not.toContain("skills");
    expect(l.nodes.some((n) => n.type === "item" && (n.data as { item: { lane: string } }).item.lane === "skills")).toBe(false);
  });

  it("handles co-op plans that span fall or spring", () => {
    expect(() => layoutPlan(coop)).not.toThrow();
  });

  it("finds prerequisites and dependents for dimming", () => {
    const e = plan.edges[0];
    const r = related(plan, e.from);
    expect(r.has(e.from)).toBe(true);
    expect(r.has(e.to)).toBe(true);
  });
});
