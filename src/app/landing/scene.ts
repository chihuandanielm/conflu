// The landing's painted confluence (docs/LANDING_REDESIGN.md): an ASCII landscape on a canvas. A brightness field (dusk
// sky, lit peaks, pines, meadow, and three streams that join one river at a vanishing point under a low sun) is drawn
// as a dense grid of small glyphs. Detail comes from the character chosen for each cell; colour is posterised into a
// few muted tones with noise-dithered edges. The sky is horizontal hatching, the land a full ASCII field, the meadow a
// stipple, the water its own moving texture.
//
// It paints itself in once, back to front (about 2.6 s), then only the water moves. Everything about a cell (glyph,
// tone, when it appears) is computed once per size; a frame only decides which cells show, and draws one string per
// tone per row, so even 40,000 cells cost a few milliseconds and the paint-in runs on every animation frame.

/** Muted tones, dark to light: navy-on-navy, slate, dusty blue, grey-violet, tan, sand, pale sand. */
export const TONES = ["#2B3A66", "#3B4C80", "#5E6F9E", "#8D8FA8", "#B39C84", "#D2B994", "#E9D9BC"] as const;
const RAMP = " .,:;i1rsXA253hMHG9B@";
const SCRAMBLE = "#%&*+=-:;?!/\\|<>{}[]";
const FS = 6, LH = 7;
const FONT = `${FS}px "IBM Plex Mono", ui-monospace, monospace`;
/** When the paint-in ends, in seconds. */
export const PAINT_SECONDS = 2.65;
const SCRAMBLE_S = 0.18;
const WATER_FPS = 30;
const PAINTED_KEY = "cpm.landing.painted";

const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const n1 = (x: number) => { const i = Math.floor(x), f = x - i, a = hash(i, 0.5), b = hash(i + 1, 0.5); return a + (b - a) * f * f * (3 - 2 * f); };
const n2 = (x: number, y: number) => {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
};
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

// Layout (u across, v down, both 0..1). The vanishing point sits on the horizon, right of centre, under the sun.
const HZ = 0.62, VPU = 0.68, K = 1.35, PC = 0.32;
const SUN = [0.86, HZ - 0.30] as const;
const STREAMS = [0.06, 0.55, 1.0].map((u) => (u - VPU) / K);
const FAR = [[0.76, 0.33, 0.18], [0.93, 0.26, 0.13], [0.62, 0.18, 0.12], [0.48, 0.08, 0.12]];
const MID = [[0.84, 0.12, 0.16], [0.67, 0.08, 0.13], [0.99, 0.14, 0.12], [0.30, 0.04, 0.22]];
const PINES = [[0.025, 1.04, 0.42, 0.045], [0.085, 1.06, 0.33, 0.035], [0.135, 1.05, 0.22, 0.026],
  [0.975, 1.05, 0.40, 0.045], [0.915, 1.06, 0.27, 0.032], [0.30, 0.78, 0.07, 0.012], [0.36, 0.76, 0.05, 0.009], [0.86, 0.77, 0.06, 0.011]];

function range(u: number, peaks: number[][], seed: number): [number, number] {
  let h = 0, side = 1;
  for (const [pu, ph, pw] of peaks) { const v = ph * Math.max(0, 1 - Math.abs(u - pu) / pw) ** 1.3; if (v > h) { h = v; side = u < pu ? -1 : 1; } }
  const crag = 0.035 * (n1(u * 45 + seed) - 0.5) + 0.018 * (n1(u * 140 + seed) - 0.5);
  return [Math.max(0, h + crag * Math.min(1, h * 8)), side];
}
function pineAt(u: number, v: number): number {
  for (const [cu, bv, h, hw] of PINES) {
    const top = bv - h; if (v < top || v > bv) continue;
    const k = (v - top) / h, tier = (k * 5) % 1;
    if (Math.abs(u - cu) < hw * (0.25 + 0.75 * k) * (0.7 + 0.3 * tier) * (0.92 + 0.16 * n1(v * 300))) return u > cu ? 0.16 : 0.07;
  }
  return -1;
}

type Kind = "sky" | "sun" | "peak" | "trees" | "pine" | "meadow" | "bank" | "water";
interface Sample { L: number; kind: Kind; d?: number; p?: number; sunD: number }

/** Brightness 0..1 at (u, v), and what the cell is. `aspect` is width / height of the canvas. */
function sample(u: number, v: number, aspect: number): Sample {
  // On a tall, narrow screen the words take more of the sky, so the sun sits lower, just above the peaks.
  const sunV = aspect < 0.8 ? HZ - 0.19 : SUN[1];
  const sunD = Math.hypot((u - SUN[0]) * aspect, v - sunV);
  const pine = pineAt(u, v);
  if (pine >= 0) return { L: pine, kind: "pine", sunD };
  const light = Math.exp(-Math.abs(u - SUN[0]) * 2.6);
  if (v < HZ) {
    if (v > HZ - (n1(u * 160) ** 1.5 * 0.03 + 0.006)) return { L: 0.2, kind: "trees", sunD };
    const [midH, ms] = range(u, MID, 3);
    if (v > HZ - midH) return { L: (ms > 0 ? 0.40 : 0.28) + 0.06 * light, kind: "peak", sunD };
    const [farH, side] = range(u, FAR, 1);
    if (v > HZ - farH) {
      const below = v - (HZ - farH), lit = side > 0;
      const snow = farH > 0.14 && below < farH * ((lit ? 0.42 : 0.30) + 0.12 * n1(u * 70));
      const strata = 0.06 * Math.sin(u * (lit ? 1 : -1) * 90 + v * 140);
      return { L: snow ? (lit ? 0.95 : 0.7) : (lit ? 0.6 : 0.36) + strata, kind: "peak", sunD };
    }
    if (sunD < 0.045) return { L: 1, kind: "sun", sunD };
    const ring = sunD < 0.11 && Math.abs(Math.sin(sunD * 120)) > 0.75 ? 0.15 : 0;
    const t = clamp((v - 0.05) / (HZ - 0.05), 0, 1);
    const glow = t ** 1.8 * (0.25 + 0.75 * light) * 0.42 + clamp(0.5 - sunD * 3.4, 0, 0.5) + ring;
    return { L: 0.05 + glow, kind: "sky", sunD };
  }
  const p = (v - HZ) / (1 - HZ);
  const gx = (u - VPU) / (K * Math.max(p, 0.002));
  const meander = 0.035 * Math.sin(3.5 / Math.max(p, 0.05));
  const s = clamp((p - PC) / (1 - PC), 0, 1) ** 1.4;
  const chans = p < PC ? [{ x: meander, w: 0.09 }] : STREAMS.map((sx) => ({ x: meander + (sx - meander) * s, w: 0.09 - 0.045 * s }));
  let d = 9;
  for (const c of chans) d = Math.min(d, Math.abs(gx - c.x) / c.w);
  if (d < 1) return { L: 0.74 + 0.2 * (1 - d), kind: "water", d, p, sunD };
  if (d < 1.3) return { L: 0.48, kind: "bank", p, sunD };
  const band = n2(gx * 1.2 + 20, (1 / Math.max(p, 0.05)) * 0.7);
  return { L: 0.2 + 0.14 * p + 0.16 * (band - 0.5) + 0.06 * light * (1 - p), kind: "meadow", p, sunD };
}

const toneOf = (L: number, x: number, y: number) =>
  clamp(Math.floor((Math.pow(clamp(L, 0, 1), 0.75) + (n2(x * 0.18, y * 0.3) - 0.5) * 0.14) * TONES.length), 0, TONES.length - 1);
const glyphOf = (L: number, x: number, y: number) => RAMP[clamp(Math.round((L * 0.9 + hash(x, y) * 0.12) * (RAMP.length - 1)), 1, RAMP.length - 1)];

/**
 * When a cell appears in the paint-in (seconds), back to front: sky hatching sweeps down and across, the sun blooms
 * outward, peaks resolve from the horizon up, then the tree line, meadow and pines, and last the river, traced from the
 * three streams at the bottom up to the vanishing point. A little jitter lets every edge grow organically.
 */
function revealAt(s: Sample, u: number, v: number, x: number, y: number): number {
  const j = hash(y * 3.1, x * 1.7);
  switch (s.kind) {
    case "sun": return 0.3 + s.sunD * 6 + j * 0.05;
    case "sky": return s.sunD < 0.12 ? 0.3 + s.sunD * 5 + j * 0.06 : 0.02 + (v / HZ) * 0.5 + u * 0.22 + j * 0.06;
    case "peak": return 0.5 + clamp((HZ - v) / 0.36, 0, 1) * 0.85 + j * 0.14;
    case "trees": return 1.1 + u * 0.3 + j * 0.1;
    case "meadow": case "bank": return 1.1 + (s.p ?? 0) * 0.6 + j * 0.12;
    case "pine": return 1.25 + (1 - v) * 0.9 + j * 0.08;
    case "water": return 1.55 + (1 - (s.p ?? 0)) * 0.95 + j * 0.04;
  }
}

interface Cells {
  cols: number; rows: number; cw: number;
  /** Per cell: glyph (char code, 0 = empty), tone, reveal time, and for water its brightness, depth and distance. */
  ch: Uint16Array; tone: Uint8Array; at: Float32Array; scramble: Uint8Array;
  water: { i: number; x: number; y: number; L: number; p: number }[];
}

function compute(W: number, H: number, cw: number): Cells {
  const cols = Math.ceil(W / cw), rows = Math.ceil(H / LH), n = cols * rows, aspect = W / H;
  const c: Cells = { cols, rows, cw, ch: new Uint16Array(n), tone: new Uint8Array(n), at: new Float32Array(n), scramble: new Uint8Array(n), water: [] };
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const i = y * cols + x, u = (x + 0.5) / cols, v = (y + 0.5) / rows;
    const s = sample(u, v, aspect);
    c.at[i] = revealAt(s, u, v, x, y);
    if (s.kind === "water") { c.water.push({ i, x, y, L: s.L, p: s.p ?? 0 }); continue; }
    let ch: string;
    if (s.kind === "sky") {
      if (y % 2) continue; // hatching: every other row
      const h = hash(x, y);
      ch = s.L < 0.14 ? (h > 0.992 ? "+" : h > 0.5 ? "-" : " ") : s.L < 0.4 ? "-" : s.L < 0.7 ? "=" : "#";
      if (s.L > 0.9) ch = glyphOf(s.L, x, y);
    } else if (s.kind === "meadow") {
      ch = ".,:;i!"[clamp(Math.floor((s.L * 1.6 + hash(x, y) * 0.5) * 3), 0, 5)];
      if (hash(y, x) > 0.86) ch = " ";
    } else ch = glyphOf(s.L, x, y);
    if (ch === " ") continue;
    c.ch[i] = ch.charCodeAt(0);
    c.tone[i] = toneOf(s.L, x, y);
    c.scramble[i] = s.kind === "peak" || s.kind === "pine" || s.kind === "trees" ? 1 : 0;
  }
  return c;
}

/** The water at time t: a shimmer moving toward the viewer, and the sun's reflection as a broken streak. */
function waterGlyph(w: Cells["water"][number], cols: number, t: number): [number, number] {
  const wave = Math.sin(w.x * 0.4 + (1 / Math.max(w.p, 0.03)) * 2.4 - t * 1.5 + hash(w.x, w.y) * 2);
  const sunCol = Math.abs((w.x + 0.5) / cols - SUN[0] + (SUN[0] - VPU) * (1 - w.p)) < 0.008 + 0.02 * w.p;
  const L = clamp(w.L + 0.18 * wave + (sunCol ? 0.25 : 0), 0, 1);
  return [(wave > 0.55 ? "~" : wave > -0.2 ? "=" : "-").charCodeAt(0), toneOf(L, w.x, w.y)];
}

/** Draws rows of glyphs, one string per tone per row. `pick(i)` returns [charCode, tone] or null for an empty cell. */
function drawGrid(ctx: CanvasRenderingContext2D, c: Cells, pick: (i: number) => readonly [number, number] | null, rowsFrom = 0, rowsTo = c.rows) {
  const buf: Uint16Array[] = TONES.map(() => new Uint16Array(c.cols));
  for (let y = rowsFrom; y < rowsTo; y++) {
    const used = new Uint8Array(TONES.length);
    for (const b of buf) b.fill(32);
    for (let x = 0; x < c.cols; x++) {
      const g = pick(y * c.cols + x);
      if (!g) continue;
      buf[g[1]][x] = g[0]; used[g[1]] = 1;
    }
    for (let k = 0; k < TONES.length; k++) {
      if (!used[k]) continue;
      ctx.fillStyle = TONES[k];
      ctx.fillText(String.fromCharCode.apply(null, buf[k] as unknown as number[]), 0, y * LH);
    }
  }
}

export interface Scene { destroy(): void }

/**
 * Starts the scene on a canvas. With `animate` false (reduced motion), or once it has played this session, the painting
 * shows finished; with reduced motion the water stays still too. Paused while off screen or while the tab is hidden.
 */
export function createScene(canvas: HTMLCanvasElement, opt: { reducedMotion: boolean }): Scene {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { destroy() {} };
  let played = false;
  try { played = sessionStorage.getItem(PAINTED_KEY) === "1"; } catch { /* storage blocked: play it */ }
  const animate = !opt.reducedMotion;
  let cells: Cells | null = null, W = 0, H = 0, dpr = 1;
  let base: HTMLCanvasElement | null = null; // the finished painting without the water
  let start = -1, raf = 0, lastWater = 0, visible = true, alive = true;

  function size() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx!.font = FONT; ctx!.textBaseline = "top";
    cells = compute(W, H, ctx!.measureText("M").width);
    base = null;
  }

  /** The finished painting (everything but the water), drawn once to an offscreen canvas. */
  function finished(): HTMLCanvasElement {
    if (base) return base;
    const b = document.createElement("canvas"); b.width = canvas.width; b.height = canvas.height;
    const bx = b.getContext("2d")!; bx.setTransform(dpr, 0, 0, dpr, 0, 0); bx.font = FONT; bx.textBaseline = "top";
    const c = cells!;
    drawGrid(bx, c, (i) => (c.ch[i] ? [c.ch[i], c.tone[i]] as const : null));
    return (base = b);
  }

  function drawWater(t: number, reveal = Infinity) {
    const c = cells!;
    const rows = new Map<number, typeof c.water>();
    for (const w of c.water) if (c.at[w.i] <= reveal) { let r = rows.get(w.y); if (!r) rows.set(w.y, (r = [])); r.push(w); }
    const bufs = TONES.map(() => new Uint16Array(c.cols));
    for (const [y, ws] of rows) {
      const used = new Uint8Array(TONES.length);
      for (const b of bufs) b.fill(32);
      for (const w of ws) { const [code, tone] = waterGlyph(w, c.cols, t); bufs[tone][w.x] = code; used[tone] = 1; }
      for (let k = 0; k < TONES.length; k++) if (used[k]) { ctx!.fillStyle = TONES[k]; ctx!.fillText(String.fromCharCode.apply(null, bufs[k] as unknown as number[]), 0, y * LH); }
    }
  }

  function frame(now: number) {
    raf = 0;
    if (!alive || !cells) return;
    // Already played this session, or reduced motion: start at the end, with the painting finished.
    if (start < 0) start = now / 1000 - (played || !animate ? PAINT_SECONDS : 0);
    const t = now / 1000 - start;
    const c = cells;
    ctx!.clearRect(0, 0, W, H);
    if (t < PAINT_SECONDS) {
      // The paint-in: cells that have appeared, and those still settling flicker through random glyphs.
      const flick = Math.floor(t * 30);
      drawGrid(ctx!, c, (i) => {
        const a = c.at[i];
        if (!c.ch[i] || a > t) return null;
        if (c.scramble[i] && t - a < SCRAMBLE_S) return [SCRAMBLE.charCodeAt(Math.floor(hash(i, flick) * SCRAMBLE.length)), Math.max(1, c.tone[i] - 1)] as const;
        return [c.ch[i], c.tone[i]] as const;
      });
      drawWater(t, t);
    } else {
      if (!played) { played = true; try { sessionStorage.setItem(PAINTED_KEY, "1"); } catch { /* fine */ } }
      ctx!.drawImage(finished(), 0, 0, W, H);
      drawWater(animate ? t : 0);
      lastWater = now;
    }
    schedule();
  }

  function schedule() {
    if (!alive || raf || !visible || document.hidden) return;
    const t = start < 0 ? 0 : performance.now() / 1000 - start;
    if (t < PAINT_SECONDS) { raf = requestAnimationFrame(frame); return; }
    if (!animate) return; // reduced motion: the finished, still painting
    // After the paint-in only the water moves; 30 frames a second is plenty for a slow shimmer.
    raf = requestAnimationFrame((now) => { if (now - lastWater >= 1000 / WATER_FPS) frame(now); else { raf = 0; schedule(); } });
  }

  const io = typeof IntersectionObserver === "function" ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; schedule(); }) : null;
  io?.observe(canvas);
  const onVis = () => schedule();
  document.addEventListener("visibilitychange", onVis);
  let resizeT = 0;
  const onResize = () => {
    window.clearTimeout(resizeT);
    resizeT = window.setTimeout(() => {
      // A resize mid-way finishes the paint-in at once rather than repainting half a scene.
      if (start >= 0 && performance.now() / 1000 - start < PAINT_SECONDS) start = performance.now() / 1000 - PAINT_SECONDS;
      size(); cancelAnimationFrame(raf); raf = 0; frame(performance.now());
    }, 120);
  };
  window.addEventListener("resize", onResize);

  // Glyph widths come from the self-hosted mono font: wait for it before measuring.
  const begin = () => { if (!alive) return; size(); frame(performance.now()); };
  if (document.fonts?.ready) document.fonts.ready.then(begin, begin); else begin();

  return {
    destroy() {
      alive = false; cancelAnimationFrame(raf); io?.disconnect(); window.clearTimeout(resizeT);
      document.removeEventListener("visibilitychange", onVis); window.removeEventListener("resize", onResize);
    },
  };
}
