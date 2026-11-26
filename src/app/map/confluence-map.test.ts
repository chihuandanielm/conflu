import { describe, expect, it } from "vitest";
import { buildPlan } from "../../engine/engine.ts";
import type { PlanInput } from "../../engine/types.ts";
import { dataset } from "../data/dataset.ts";
import { outcomeText } from "../results/summary.ts";
import { layoutConfluence, wrap, type MapLayout, type MapModel } from "./confluence-map.js";
import { factLine, mapModel } from "./facts.ts";

const base: PlanInput = { status: "college-student", majorId: "computer-science", year: 2, semester: 1, trackId: "software-engineering",
  horizon: "graduation", today: "2026-11-15", weeklyHours: 8, school: "rutgers-nb" };
const longest = buildPlan({ ...base, year: 1, weeklyHours: 15 }, dataset); // first year, by graduation
const shortest = buildPlan({ ...base, majorId: "political-science", trackId: "law-school", year: 4, semester: 2, horizon: "6mo", weeklyHours: 5 }, dataset);
const models: [string, MapModel][] = [
  ["longest plan", mapModel(longest, outcomeText("software-engineering"))],
  ["shortest plan", mapModel(shortest, outcomeText("law-school"))],
  ["synthetic", { outcome: "Land your first role", terms: [
    { code: "2F", label: "Year 2 · Fall", items: [
      { goalId: "a", title: "A goal title that runs on well past eighty characters so that it has to wrap and then be cut short with an ellipsis", lane: "skills", hours: 15, gate: true },
      { goalId: "b", title: "Short", lane: "network", hours: 2 }, { goalId: "c", title: "Another one", lane: "presence", hours: 3 }] },
    { code: "2S", label: "Year 2 · Spring", items: [{ goalId: "a", title: "A continuing goal", lane: "skills", hours: 5 }, { goalId: "d", title: "Apply", lane: "applications", hours: 20 }] },
  ] }],
];
const widths = [320, 390, 559, 560, 720, 1000];

/** Two labels on the same side overlap when their boxes share any area. */
function overlaps(L: MapLayout) {
  const box = (l: MapLayout["labels"][number]) => ({ x0: l.align === "right" ? l.x - l.w : l.x, x1: l.align === "right" ? l.x : l.x + l.w, y0: l.y, y1: l.y + l.h });
  const bad: string[] = [];
  for (let i = 0; i < L.labels.length; i++) for (let j = i + 1; j < L.labels.length; j++) {
    const a = L.labels[i], b = L.labels[j];
    if (a.align !== b.align) continue;
    const p = box(a), q = box(b);
    if (p.x0 < q.x1 && q.x0 < p.x1 && p.y0 < q.y1 && q.y0 < p.y1) bad.push(`${a.id} / ${b.id}`);
  }
  return bad;
}

describe("confluence map layout", () => {
  for (const [name, model] of models) for (const width of widths) {
    describe(`${name} at ${width}`, () => {
      const L = layoutConfluence(model, { width, fontSize: 14 });
      it("never puts two names on one side over each other", () => expect(overlaps(L)).toEqual([]));
      it("ends every strand, and the student's own line, at the mouth", () => {
        const end = (d: string) => Number(d.match(/V(-?[\d.]+)$/)![1]);
        for (const s of L.strands) expect(end(s.d)).toBeCloseTo(L.mouth.y, 0);
        expect(end(L.own.d)).toBeCloseTo(L.mouth.y, 0);
      });
      it("never lets strands cross: left lanes keep their order outward, right lanes too", () => {
        for (const side of [true, false]) {
          const xs = L.strands.filter((s) => s.left === side).map((s) => s.x);
          for (let i = 1; i < xs.length; i++) expect(side ? xs[i] < xs[i - 1] : xs[i] > xs[i - 1]).toBe(true);
        }
      });
      it(`is ${width < 560 ? "one-sided (river on the left)" : "two-sided"}`, () => {
        expect(L.sides).toBe(width < 560 ? 1 : 2);
        if (L.sides === 1) expect(L.labels.every((l) => l.align === "left")).toBe(true);
      });
      it("stays inside its width", () => {
        for (const l of L.labels) { expect(l.align === "right" ? l.x - l.w : l.x).toBeGreaterThanOrEqual(-0.5); expect(l.align === "right" ? l.x : l.x + l.w).toBeLessThanOrEqual(width + 0.5); }
      });
    });
  }

  it("joins a goal that spans terms only once, where it starts", () => {
    const L = layoutConfluence(models[2][1], { width: 720 });
    expect(L.labels.filter((l) => l.id === "a")).toHaveLength(1);
    expect(L.total).toBe(4);
  });

  it("wraps a title over 80 characters to two lines, then ends it in an ellipsis", () => {
    const L = layoutConfluence(models[2][1], { width: 390, fontSize: 14 });
    const long = L.labels.find((l) => l.id === "a")!;
    expect(long.title.length).toBeGreaterThan(80);
    expect(long.lines).toHaveLength(2);
    expect(long.lines[1].endsWith("…")).toBe(true);
    expect(wrap("short title", 40)).toEqual(["short title"]);
  });

  it("respects maxHeight, or returns its shortest map (every term keeps one row) and says what it left out", () => {
    const model = models[0][1];
    const full = layoutConfluence(model, { width: 532, sides: 2, fontSize: 7.5 });
    for (const maxHeight of [900, 600, 450]) {
      const L = layoutConfluence(model, { width: 532, sides: 2, fontSize: 7.5, maxHeight });
      const shortest = layoutConfluence(model, { width: 532, sides: 2, fontSize: 7.5, maxPerTerm: 2 });
      expect(L.height <= maxHeight || L.height <= shortest.height + 0.5).toBe(true);
      expect(L.shown + L.terms.reduce((n, t) => n + t.more, 0)).toBe(full.total);
      if (L.shown < full.total) expect(L.terms.some((t) => t.more > 0)).toBe(true);
    }
    // Plenty of room: nothing is left out.
    const roomy = layoutConfluence(model, { width: 532, sides: 2, fontSize: 7.5, maxHeight: 99999 });
    expect(roomy.shown).toBe(full.total);
  });

  it("writes the fact line in the design's order: kind, time, must-do, continues (time in words: src/app/map/time.test.ts)", () => {
    expect(factLine({ goalId: "s-python", lane: "skills", hours: 15, gate: true, partial: true }, "1F")).toBe("skills · ~1 h a week this semester (30 h in all) · must-do · continues");
    expect(factLine({ goalId: "f-fafsa@Y1", lane: "foundation", hours: 2, gate: false, partial: false }, "1F")).toBe("foundation · about 2 hours, once");
  });
});

describe("on screen: nothing under 15px", () => {
  it("takes a separate size for the small line under each name, and makes room when it wraps", async () => {
    const { layoutConfluence } = await import("./confluence-map.js");
    const model = { outcome: "Land your first role", terms: [{ code: "2F", label: "Year 2 · Fall", items: [
      { goalId: "a", title: "Build and ship a personal project", category: "experience", hours: 1, recurring: true, importance: "must" },
      { goalId: "b", title: "Solve 100 problems", category: "skills", hours: 2, recurring: true, importance: "must" },
    ] }] } as never;
    const print = layoutConfluence(model, { width: 320, fontSize: 15 });
    const screenL = layoutConfluence(model, { width: 320, fontSize: 15, metaSize: 15 });
    expect(print.metaSize).toBeCloseTo(12.3);
    expect(screenL.metaSize).toBe(15);
    expect(screenL.height).toBeGreaterThanOrEqual(print.height);
  });
});
