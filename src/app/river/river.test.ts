import { describe, expect, it, vi } from "vitest";
import { asciiFrame, createRiver, PALETTE, SCENES, waterInk, WATER_RAMP, type SceneName } from "./river.js";

describe("river: asciiFrame", () => {
  it("is deterministic: the same input draws the same frame", () => {
    for (const scene of Object.keys(SCENES) as SceneName[]) {
      const a = asciiFrame(scene, 120, 24, { t: 3.7 }), b = asciiFrame(scene, 120, 24, { t: 3.7 });
      expect(a).toEqual(b);
    }
  });
  it("draws something, on an even grid, and moves with time", () => {
    const f = asciiFrame("banner", 175, 13, { cell: [4.2, 8] });
    expect(f).toHaveLength(13);
    for (const row of f) { expect(row.blue).toHaveLength(175); expect(row.sand).toHaveLength(175); }
    expect(f.some((r) => /\S/.test(r.blue))).toBe(true); // water
    expect(f.some((r) => /\S/.test(r.sand))).toBe(true); // land
    expect(asciiFrame("banner", 175, 13, { cell: [4.2, 8], t: 1 })).not.toEqual(f);
  });
  it("never puts water and land in the same cell", () => {
    for (const row of asciiFrame("landing", 160, 40)) for (let i = 0; i < row.blue.length; i++) expect(row.blue[i] !== " " && row.sand[i] !== " ").toBe(false);
  });
});

describe("river: waterInk", () => {
  it("stays within 0 to 1 for a sweep of inputs", () => {
    let min = Infinity, max = -Infinity;
    for (const edge of [0, 0.3, 0.6, 0.9, 0.95, 1])
      for (const fl of [0.2, 0.5, 1, 2, 4, 8])
        for (const fog of [0, 0.5, 1])
          for (const thin of [0, 0.5, 1])
            for (let s = -200; s <= 200; s += 37)
              for (const cross of [-1, -0.4, 0, 0.6, 1])
                for (const t of [0, 1.3, 77.7]) {
                  const v = waterInk({ s, cross, edge, fog, thin, fl, ori: 0 }, t);
                  expect(Number.isFinite(v)).toBe(true);
                  min = Math.min(min, v); max = Math.max(max, v);
                }
    expect(min).toBeGreaterThanOrEqual(0);
    expect(max).toBeLessThanOrEqual(1);
  });
  it("matches the design's reference frames exactly (the 0..1 clamp changes no glyph)", async () => {
    // @ts-expect-error plain JS module outside src, used only as the reference
    const ref = await import("../../../design/river/river.js");
    for (const scene of ["landing", "ask", "results", "banner"] as const)
      for (const t of [0, 2.5, 9.1]) expect(asciiFrame(scene, 140, 30, { t })).toEqual(ref.asciiFrame(scene, 140, 30, { t }));
  });
  it("has ten glyphs per direction and only the four colours", () => {
    for (const ramp of WATER_RAMP) expect(ramp).toHaveLength(10);
    expect(PALETTE).toEqual({ sage: "#E0E7DA", blue: "#466995", green: "#00A37D", sand: "#E6B989" });
  });
});

/** A stand-in 2D context: records what is drawn. */
function fakeCanvas() {
  const calls = { fillText: 0 };
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (o, k) => k === "measureText" ? (s: string) => ({ width: s.length * 12 })
      : k === "fillText" ? () => { calls.fillText++; }
      : k in o ? o[k as string] : () => {},
    set: (o, k, v) => { o[k as string] = v; return true; },
  });
  const canvas = { getContext: () => ctx, getBoundingClientRect: () => ({ width: 800, height: 600 }), width: 0, height: 0 } as unknown as HTMLCanvasElement;
  return { canvas, calls };
}

describe("river: reduced motion", () => {
  it("draws a still frame and never starts an animation loop", async () => {
    const raf = vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(() => 1);
    const { canvas, calls } = fakeCanvas();
    const river = createRiver(canvas, { still: true, scene: "landing" });
    expect(calls.fillText).toBeGreaterThan(0);
    expect(river.reducedMotion).toBe(true);
    // Camera moves are instant and still draw; nothing schedules a frame.
    const before = calls.fillText;
    await river.goTo("ask", { ms: 3200, along: true });
    expect(river.scene).toBe("ask");
    expect(calls.fillText).toBeGreaterThan(before);
    river.resume();
    expect(raf).not.toHaveBeenCalled();
    river.destroy();
    raf.mockRestore();
  });
  it("with motion, it does start a loop (so the test above means something)", () => {
    const raf = vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(() => 1);
    const { canvas } = fakeCanvas();
    const river = createRiver(canvas, { still: false });
    expect(raf).toHaveBeenCalled();
    river.destroy();
    raf.mockRestore();
  });
});
