// river.js: the ASCII confluence river. No dependencies, no network, no randomness.
//
// One world (several tributaries joining one stem, which bends into a long reach), one camera
// (target, zoom, pitch), and a glyph field that is a pure function of position and time. Scenes are
// camera presets; moving between scenes is one eased camera move, so the river never cuts or stops.
//
// See design/RIVER.md for how it works and how to tune it.

export const PALETTE = { sage: "#E0E7DA", blue: "#466995", green: "#00A37D", sand: "#E6B989" };

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Deterministic hash to [0, 1). Same inputs, same answer, on every device. */
function hash(a, b = 0, c = 0) {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- world

/** Catmull-Rom through `pts` ([x, y, halfWidth]), resampled to roughly `step` world units. */
function spline(pts, step = 1.5) {
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  const raw = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const n = Math.max(4, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      const f = (k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      raw.push({ x: f(0), y: f(1), hw: lerp(p1[2], p2[2], t) });
    }
  }
  const last = pts[pts.length - 1];
  raw.push({ x: last[0], y: last[1], hw: last[2] });
  return raw;
}

/**
 * Build the river for a viewport aspect ratio. `spread` widens the tributary fan on wide screens so
 * the sources sit inside the frame on a phone and on a desktop alike.
 * World units are arbitrary; x grows right, y grows down the screen (downstream).
 */
export function buildWorld(aspect = 1.6) {
  const sx = clamp(78 * aspect, 52, 118);
  // The stem: a spring, the confluence around y = 0, south to a bend, then a long reach flowing east.
  const main = spline([
    [0.06 * sx, -74, 1.5], [-5, -54, 2.3], [4, -32, 3.1], [0, -10, 4.4], [-1, 12, 5.8], [-3, 40, 6.8],
    [3, 74, 7.2], [-1, 106, 7.2], [5, 134, 7.1], [26, 152, 7], [66, 157, 7], [120, 152, 7],
    [176, 157, 7], [232, 152, 7], [288, 157, 7], [344, 152, 7], [400, 157, 7], [456, 152, 7],
  ]);
  let s = 0;
  main[0].s = 0;
  for (let i = 1; i < main.length; i++) { s += Math.hypot(main[i].x - main[i - 1].x, main[i].y - main[i - 1].y); main[i].s = s; }

  const nearestOn = (path, x, y) => {
    let best = 0, bd = Infinity;
    for (let i = 0; i < path.length; i++) { const d = (path[i].x - x) ** 2 + (path[i].y - y) ** 2; if (d < bd) { bd = d; best = i; } }
    return path[best];
  };
  /** A tributary ends on its parent's centreline; its `s` counts up to the parent's `s` there, so the current lines up. */
  const trib = (pts, parent) => {
    const end = pts[pts.length - 1];
    const j = nearestOn(parent, end[0], end[1]);
    pts[pts.length - 1] = [j.x, j.y, end[2]];
    const p = spline(pts);
    let len = 0;
    const lens = [0];
    for (let i = 1; i < p.length; i++) { len += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y); lens.push(len); }
    for (let i = 0; i < p.length; i++) p[i].s = j.s - (len - lens[i]);
    return p;
  };
  const l1 = trib([[-0.56 * sx, -86, 1.4], [-0.44 * sx, -62, 2], [-0.2 * sx, -42, 2.6], [-10, -34, 3], [0, -22, 3.1]], main);
  const r1 = trib([[0.62 * sx, -80, 1.4], [0.42 * sx, -56, 2], [0.24 * sx, -30, 2.6], [10, -16, 3.1], [0, -3, 3.2]], main);
  const l2 = trib([[-1.02 * sx, -46, 1.4], [-0.74 * sx, -30, 2], [-0.42 * sx, -8, 2.6], [-14, 2, 3.1], [-1, 15, 3.3]], main);
  const r2 = trib([[1.04 * sx, -40, 1.4], [0.78 * sx, -32, 2.1], [0.46 * sx, 2, 2.7], [16, 18, 3.2], [-2, 33, 3.4]], main);
  const l1b = trib([[-0.9 * sx, -90, 1.2], [-0.66 * sx, -74, 1.5], [-0.44 * sx, -62, 1.8]], l1);
  const r2b = trib([[0.98 * sx, -82, 1.2], [0.9 * sx, -56, 1.5], [0.78 * sx, -32, 1.8]], r2);
  const paths = [main, l1, r1, l2, r2, l1b, r2b];

  // Spatial buckets of segments so a point query only looks at nearby river.
  const B = 10, MARGIN = 4, buckets = new Map();
  const segs = [];
  for (const p of paths) for (let i = 0; i < p.length - 1; i++) {
    const a = p[i], b = p[i + 1], pad = Math.max(a.hw, b.hw) + MARGIN;
    const seg = { a, b, dx: b.x - a.x, dy: b.y - a.y };
    seg.len2 = seg.dx * seg.dx + seg.dy * seg.dy || 1e-9;
    segs.push(seg);
    for (let gx = Math.floor((Math.min(a.x, b.x) - pad) / B); gx <= Math.floor((Math.max(a.x, b.x) + pad) / B); gx++)
      for (let gy = Math.floor((Math.min(a.y, b.y) - pad) / B); gy <= Math.floor((Math.max(a.y, b.y) + pad) / B); gy++) {
        const k = gx * 4096 + gy;
        (buckets.get(k) ?? buckets.set(k, []).get(k)).push(seg);
      }
  }
  const out = { nd: 9, s: 0, cross: 0, hw: 1, fx: 1, fy: 0, bank: 9 };
  /** Nearest river at a world point: nd = distance / half-width (under 1 is water), bank = distance past the bank. */
  function query(x, y) {
    const list = buckets.get(Math.floor(x / B) * 4096 + Math.floor(y / B));
    out.nd = 9; out.bank = 9;
    if (!list) return out;
    for (let i = 0; i < list.length; i++) {
      const g = list[i];
      const t = clamp(((x - g.a.x) * g.dx + (y - g.a.y) * g.dy) / g.len2, 0, 1);
      const px = g.a.x + g.dx * t, py = g.a.y + g.dy * t;
      const d = Math.hypot(x - px, y - py), hw = lerp(g.a.hw, g.b.hw, t), nd = d / hw;
      if (nd < out.nd) {
        const il = 1 / Math.sqrt(g.len2);
        out.nd = nd; out.hw = hw; out.bank = d - hw;
        out.s = lerp(g.a.s, g.b.s, t);
        out.fx = g.dx * il; out.fy = g.dy * il;
        out.cross = ((x - px) * -out.fy + (y - py) * out.fx); // signed distance across the current, world units
      }
    }
    return out;
  }
  /** Point on the stem at arc length s (clamped). */
  function onMain(sAt) {
    let lo = 0, hi = main.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (main[m].s <= sAt) lo = m; else hi = m; }
    const a = main[lo], b = main[hi], t = clamp((sAt - a.s) / (b.s - a.s || 1), 0, 1);
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), hw: lerp(a.hw, b.hw, t) };
  }
  const sOfMain = (x, y) => nearestOn(main, x, y).s;
  // Places a fish may hop: centreline samples of every channel wide enough to hold one.
  const spots = [];
  for (const p of paths) for (let i = 2; i < p.length - 2; i += 2) if (p[i].hw >= 1.5) spots.push(p[i]);
  return { sx, paths, main, query, onMain, sOfMain, spots, sources: paths.map((p) => p[0]) };
}

// ---------------------------------------------------------------- scenes (camera presets)

/**
 * Each scene returns a camera for the current viewport:
 *   tx, ty  world point the camera looks at
 *   zoom    pixels per world unit at that point
 *   pitch   degrees below the horizon (90 = straight down, a map)
 *   ax, ay  where that point sits on screen, 0..1
 */
export const SCENES = {
  /** Low and close over the stem, looking upstream at the confluence. */
  intro: (W, H) => ({ tx: 0, ty: 66, zoom: clamp(W * 0.017, 9.5, 19), pitch: 23, ax: 0.5, ay: 0.76 }),
  /** The whole confluence as a map: sources under the title, the stem running down into the Start button. */
  full: (W, H) => ({ tx: 0, ty: 0, zoom: H / 196, pitch: 90, ax: 0.5, ay: 0.58 }),
  /** The reach as a band along the bottom of the screen: the background for every question. */
  close: (W, H) => ({ tx: 232, ty: 152, zoom: clamp(H * 0.2, 96, 190) / 14, pitch: 90, ax: 0.5, ay: 1 - clamp(80 / H, 0.08, 0.11) }),
  /** The same reach, further off, as a thin band along the top: the results page header. */
  header: (W, H) => ({ tx: 288, ty: 157, zoom: 64 / 14, pitch: 90, ax: 0.5, ay: 44 / H }),
};

// ---------------------------------------------------------------- glyphs

// Water glyphs by how the current runs on screen: [strong, medium, light].
const WATER = [
  ["~", "-", "."], // across
  ["~", ":", "'"], // down
  ["~", "\\", "."], // down-right
  ["~", "/", "."], // down-left
];
const FISH = { right: "><>", left: "<><", bigRight: "><(('>", bigLeft: "<'))><" };

// ---------------------------------------------------------------- the river

/**
 * @param {HTMLCanvasElement} canvas  Sized by CSS; the river fills it.
 * @param {object} [opt]
 * @param {string} [opt.font]        Monospace family already loaded on the page.
 * @param {number} [opt.fontSize]    Glyph size in CSS px. Default: 11 under 600px wide, else 13.
 * @param {string} [opt.scene]       Starting scene name.
 * @param {boolean} [opt.still]      Draw one frame and never animate (reduced motion). Default: follows the media query.
 * @param {() => number} [opt.now]   Clock in ms, for tests.
 */
export function createRiver(canvas, opt = {}) {
  const ctx = canvas.getContext("2d");
  const font = opt.font ?? '"IBM Plex Mono", ui-monospace, monospace';
  const now = opt.now ?? (() => performance.now());
  const reduce = opt.still ?? (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const FOV = 40 * Math.PI / 180;
  const FPS = 30;

  let W = 0, H = 0, dpr = 1, fs = 13, cw = 8, ch = 16, cols = 0, rows = 0, focal = 1;
  let world = buildWorld(1.6);
  let cam = { tx: 0, ty: 0, zoom: 4, pitch: 90, ax: 0.5, ay: 0.5 };
  let sceneName = opt.scene ?? "full";
  let move = null; // active camera move
  let masks = [], maskAlpha = 1, maskFrom = 1, maskTo = 1, maskStart = 0, maskMs = 0;
  let dirty = true; // the per-cell cache needs rebuilding
  let raf = 0, last = 0, t0 = now(), running = false, destroyed = false;
  let speed = 1, speedTarget = 1, flowT = 0;

  // Per-cell cache: what the cell is looking at. Rebuilt only while the camera moves.
  let kind, cS, cCross, cHw, cEdge, cOri, cFar, cChar, cThin;

  // ---- camera maths. Ground plane z = 0; the camera looks "north" (up the screen) and tilts by pitch.
  let sinP = 1, cosP = 0, camD = 1, camY = 0;
  function setCam() {
    const p = clamp(cam.pitch, 8, 90) * Math.PI / 180;
    sinP = Math.sin(p); cosP = Math.cos(p);
    camD = focal / cam.zoom;
    camY = cam.ty + camD * cosP;
  }
  /** Screen px -> ground point. Returns scale (world units per px) or -1 above the horizon. */
  const hit = { x: 0, y: 0 };
  function unproject(px, py) {
    const xs = px - cam.ax * W, ys = py - cam.ay * H;
    const dz = focal * sinP + ys * cosP;
    if (dz <= focal * 0.02) return -1;
    const l = camD * sinP / dz;
    hit.x = cam.tx + l * xs;
    hit.y = camY + l * (-focal * cosP + ys * sinP);
    return l;
  }
  const scr = { x: 0, y: 0, k: 0 };
  /** Ground point -> screen px; k is px per world unit there. */
  function project(x, y) {
    const vx = x - cam.tx, vy = y - camY;
    const depth = -vy * cosP + camD * sinP * sinP; // distance along the view direction
    const yc = vy * sinP + camD * sinP * cosP;
    scr.k = focal / Math.max(depth, 1e-3);
    scr.x = cam.ax * W + vx * scr.k;
    scr.y = cam.ay * H + yc * scr.k;
    return depth > 0;
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    fs = opt.fontSize ?? (W < 600 ? 11 : 13);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `400 ${fs}px ${font}`;
    cw = ctx.measureText("M".repeat(40)).width / 40;
    ch = Math.round(fs * 1.22);
    cols = Math.ceil(W / cw) + 1; rows = Math.ceil(H / ch) + 1;
    focal = (H / 2) / Math.tan(FOV / 2);
    const n = cols * rows;
    kind = new Uint8Array(n); cS = new Float32Array(n); cCross = new Float32Array(n); cHw = new Float32Array(n);
    cEdge = new Float32Array(n); cOri = new Uint8Array(n); cFar = new Float32Array(n); cChar = new Uint8Array(n); cThin = new Float32Array(n);
    const next = buildWorld(W / H);
    if (Math.abs(next.sx - world.sx) > 0.5) world = next;
    if (!move) cam = SCENES[sceneName](W, H);
    else move.to = SCENES[move.name](W, H);
    dirty = true;
    if (reduce || !running) frame(now(), true);
  }

  function inMask(px, py) {
    for (let i = 0; i < masks.length; i++) { const m = masks[i]; if (px >= m.x && px <= m.x + m.w && py >= m.y && py <= m.y + m.h) return true; }
    return false;
  }

  /** Work out, for every cell, whether it is water, bank, land or nothing, and how the current runs through it. */
  function rebuild() {
    setCam();
    for (let r = 0; r < rows; r++) {
      const py = r * ch + ch * 0.5;
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c, px = c * cw + cw * 0.5;
        kind[i] = 0;
        if (maskAlpha > 0 && inMask(px, py) && hash(c, r, 3) < maskAlpha) continue; // masks dissolve in grain by grain
        const l = unproject(px, py);
        if (l < 0) continue;
        const far = l * ch; // world units one row covers here
        if (far > 20) continue; // too far to mean anything: let it fade into the page
        const wx = hit.x, wy = hit.y;
        const q = world.query(wx, wy);
        if (q.nd < 1) {
          kind[i] = 1; cS[i] = q.s; cCross[i] = q.cross; cHw[i] = q.hw; cEdge[i] = q.nd; cFar[i] = far;
          cThin[i] = clamp(0.5 - (2 * q.hw / l) / (cw * 14), 0, 0.42);
          // How the current runs on screen decides the glyph family.
          let ex = q.fx, ey = q.fy;
          if (cam.pitch < 89) {
            project(wx, wy); const x0 = scr.x, y0 = scr.y;
            project(wx + q.fx, wy + q.fy); ex = scr.x - x0; ey = scr.y - y0;
          }
          const a = ((Math.atan2(ey, ex) % Math.PI) + Math.PI) % Math.PI; // 0..pi, direction without sign
          cOri[i] = a < 0.42 || a > Math.PI - 0.42 ? 0 : a < 1.15 ? 2 : a < Math.PI - 1.15 ? 1 : 3;
        } else {
          // Land is quantised to the world so it does not swim while the river flows.
          const gx = Math.floor(wx / Math.max(1, far * 0.5)), gy = Math.floor(wy / Math.max(1, far * 0.5));
          const h = hash(gx, gy, 7);
          if (q.bank < 0.75) { kind[i] = 2; cChar[i] = h < 0.55 ? 58 : 46; } // ":" or "."
          else if (q.bank < 2.1 && h < 0.42) { kind[i] = 2; cChar[i] = 46; }
          else if (q.bank < 3.6 && h < 0.13) { kind[i] = 2; cChar[i] = 46; }
          else if (far < 4 && h < 0.0022) { kind[i] = 3; cChar[i] = h < 0.0011 ? 34 : 44; } // a tuft: " or ,
          else if (far < 4 && h > 0.991) { kind[i] = 2; cChar[i] = 46; }
        }
      }
    }
    dirty = false;
  }

  // ---- fish: a few, each on its own clock, so hops never line up and never visibly loop.
  const FISHES = [
    { period: 4.3, offset: 0.4 }, { period: 5.9, offset: 2.1 }, { period: 7.7, offset: 3.6 }, { period: 9.1, offset: 5.2 },
  ];
  const HOP = 1.05, SPLASH = 0.55;
  const fishState = FISHES.map(() => ({ cycle: -1, spot: null, dir: 1 }));
  let burst = 0; // extra hops, used when the plan is built

  function pickSpot(i, cycle) {
    for (let k = 0; k < 14; k++) {
      const sp = world.spots[Math.floor(hash(i + 1, cycle, k + 11) * world.spots.length)];
      if (!project(sp.x, sp.y)) continue;
      const row = scr.k > 0 ? ch / scr.k : 99;
      if (row > 3.2 || sp.hw * scr.k < cw * 0.9) continue; // too far away, or the channel is thinner than a glyph
      if (scr.x < cw * 5 || scr.x > W - cw * 5 || scr.y < ch * 4 || scr.y > H - ch * 1.2) continue;
      if (inMask(scr.x, scr.y) || inMask(scr.x, scr.y - ch * 3)) continue;
      return sp;
    }
    return null;
  }

  // ---- drawing
  const lines = { blue: [], green: [], sand: [] };
  function frame(tNow, once = false) {
    if (destroyed) return;
    if (!once) raf = requestAnimationFrame(frame);
    if (!once && tNow - last < 1000 / FPS - 2) return;
    const dt = Math.min(0.1, (tNow - last) / 1000 || 0);
    last = tNow;
    const t = (tNow - t0) / 1000;

    if (move) {
      const u = clamp((tNow - move.start) / move.ms, 0, 1), e = easeInOut(u);
      const a = move.from, b = move.to;
      if (move.along) {
        // Follow the stem downstream (or up) instead of cutting across land.
        const p = world.onMain(lerp(move.s0, move.s1, e));
        const blend = Math.min(1, e * 6) * Math.min(1, (1 - e) * 6); // ease on and off the path at each end
        cam.tx = lerp(lerp(a.tx, b.tx, e), p.x, blend); cam.ty = lerp(lerp(a.ty, b.ty, e), p.y, blend);
      } else { cam.tx = lerp(a.tx, b.tx, e); cam.ty = lerp(a.ty, b.ty, e); }
      cam.zoom = Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), e));
      cam.pitch = lerp(a.pitch, b.pitch, e); cam.ax = lerp(a.ax, b.ax, e); cam.ay = lerp(a.ay, b.ay, e);
      dirty = true;
      if (u >= 1) { const done = move.resolve; sceneName = move.name; move = null; done(); }
    }
    if (maskAlpha !== maskTo) {
      maskAlpha = maskMs ? lerp(maskFrom, maskTo, clamp((tNow - maskStart) / maskMs, 0, 1)) : maskTo;
      dirty = true;
    }
    speed += (speedTarget - speed) * Math.min(1, dt * 3);
    flowT += dt * speed;
    if (dirty) rebuild();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PALETTE.sage;
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = "middle";
    ctx.font = `400 ${fs}px ${font}`;

    const tt = reduce ? 0 : flowT;
    for (let r = 0; r < rows; r++) {
      let blue = "", sand = "", green = "", any = 0;
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c, k = kind[i];
        let b = " ", s = " ", g = " ";
        if (k === 1) {
          // The current: three travelling wave trains at different speeds. The middle of the channel moves fastest.
          const sA = cS[i] - tt * 5.2, sB = cS[i] - tt * 8.4, sC = cS[i] - tt * 3.1, x = cCross[i];
          const mid = 1 - cEdge[i] * cEdge[i];
          let n = 0.46 * Math.sin(sA * 0.71 + x * 2.3 + 1.1 * Math.sin(sC * 0.093 + x * 0.61))
            + 0.34 * mid * Math.sin(sB * 1.13 - x * 3.1 + 1.7 + 0.8 * Math.sin(sA * 0.057))
            + 0.26 * Math.sin(sC * 0.37 + x * 1.3 + 4.1);
          const far = cFar[i];
          if (far > 2.2) n = n * 0.55 + 0.12; // distance calms the water into a thin shimmer
          n += cThin[i]; // a channel only a few glyphs wide is drawn fuller, or it stops reading as water
          if (cEdge[i] > 0.86) n -= 0.22; // quiet water at the banks
          const set = WATER[cOri[i]];
          if (n > 0.22) b = set[0]; else if (n > -0.16) b = set[1]; else if (n > -0.42) b = set[2];
          if (b !== " ") any = 1;
        } else if (k === 2) { s = String.fromCharCode(cChar[i]); any = 1; }
        else if (k === 3) { g = String.fromCharCode(cChar[i]); any = 1; }
        blue += b; sand += s; green += g;
      }
      lines.blue[r] = any ? blue : ""; lines.sand[r] = any ? sand : ""; lines.green[r] = any ? green : "";
    }
    for (const [name, color] of [["sand", PALETTE.sand], ["blue", PALETTE.blue], ["green", PALETTE.green]]) {
      ctx.fillStyle = color;
      const L = lines[name];
      for (let r = 0; r < rows; r++) if (L[r] && L[r].trim()) ctx.fillText(L[r], 0, r * ch + ch * 0.5);
    }
    if (!reduce) drawFish(t);
  }

  function drawFish(t) {
    const n = FISHES.length;
    for (let i = 0; i < n; i++) {
      const f = FISHES[i], st = fishState[i];
      const period = burst > t ? f.period * 0.28 : f.period;
      const local = t + f.offset, cycle = Math.floor(local / period), u = (local - cycle * period) / HOP;
      if (cycle !== st.cycle) { st.cycle = cycle; st.spot = pickSpot(i, cycle); st.dir = hash(i, cycle, 3) < 0.5 ? -1 : 1; st.lift = 0.8 + hash(i, cycle, 5) * 0.5; }
      const sp = st.spot;
      if (!sp || u > 1 + SPLASH / HOP) continue;
      if (!project(sp.x, sp.y)) continue;
      const k = scr.k, x0 = scr.x, y0 = scr.y;
      const big = k > 7;
      const len = clamp(k * 4.2, cw * 3.2, cw * 9) * st.dir;
      const lift = clamp(k * 3.4, ch * 1.5, ch * 4.2) * st.lift;
      const x1 = x0 + len;
      // Splashes sit on the glyph grid, where the fish leaves and where it lands.
      ctx.font = `400 ${fs}px ${font}`;
      ctx.fillStyle = PALETTE.blue;
      splash(x0, y0, u * HOP);
      splash(x1, y0, (u - 1) * HOP);
      if (u < 0 || u > 1) continue;
      const x = x0 + len * u, y = y0 - lift * 4 * u * (1 - u);
      const slope = Math.atan2(-lift * 4 * (1 - 2 * u), Math.abs(len));
      const glyph = big ? (st.dir > 0 ? FISH.bigRight : FISH.bigLeft) : (st.dir > 0 ? FISH.right : FISH.left);
      // A couple of drops trail behind the tail.
      ctx.fillText(u < 0.5 ? "'" : ".", x - st.dir * cw * (big ? 4.2 : 2.6), y + ch * 0.55);
      if (u > 0.12 && u < 0.8) ctx.fillText(".", x - st.dir * cw * (big ? 5.6 : 3.8), y + ch * 1.15);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(clamp(slope, -0.75, 0.75) * st.dir);
      ctx.font = `600 ${fs}px ${font}`;
      ctx.fillStyle = PALETTE.sage; // a little clearing so the fish reads over the water
      ctx.fillRect(-cw * glyph.length / 2 - 1, -ch * 0.45, cw * glyph.length + 2, ch * 0.9);
      ctx.fillStyle = PALETTE.green;
      ctx.textAlign = "center";
      ctx.fillText(glyph, 0, 0);
      ctx.restore();
      ctx.textAlign = "left";
    }
  }
  /** A small ring that opens and fades: four frames over about half a second. */
  function splash(x, y, age) {
    if (age < 0 || age > SPLASH) return;
    const gx = Math.round(x / cw - 0.5) * cw, gy = (Math.round(y / ch - 0.5) + 0.5) * ch;
    const f = Math.floor(age / SPLASH * 4);
    const put = (dx, dy, c) => ctx.fillText(c, gx + dx * cw, gy + dy * ch);
    ctx.fillStyle = PALETTE.sage;
    ctx.fillRect(gx - cw * (f + 1), gy - ch * 0.5, cw * (2 * f + 3), ch);
    ctx.fillStyle = PALETTE.blue;
    if (f === 0) { put(0, 0, "*"); }
    else if (f === 1) { put(-1, 0, "("); put(1, 0, ")"); put(0, -1, "'"); }
    else if (f === 2) { put(-2, 0, "("); put(2, 0, ")"); put(-1, -1, "."); put(1, -1, "."); }
    else { put(-3, 0, "."); put(3, 0, "."); }
  }

  // ---- public API
  function start() {
    if (reduce || running || destroyed) { frame(now(), true); return; }
    running = true; last = now();
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }
  const onVis = () => (document.hidden ? stop() : start());
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => resize()) : null;
  ro?.observe(canvas);
  document.addEventListener("visibilitychange", onVis);
  resize();
  start();

  return {
    /** Jump to a scene with no animation. */
    setScene(name) { sceneName = name; move = null; cam = SCENES[name](W, H); dirty = true; if (reduce) frame(now(), true); },
    /**
     * Glide the camera to a scene. `along: true` follows the stem between the two places.
     * Resolves when the camera arrives. With reduced motion it jumps and resolves at once.
     */
    goTo(name, { ms = 2000, along = false } = {}) {
      if (reduce) { this.setScene(name); return Promise.resolve(); }
      move?.resolve();
      return new Promise((resolve) => {
        const to = SCENES[name](W, H);
        move = { name, from: { ...cam }, to, start: now(), ms, along, resolve,
          s0: along ? world.sOfMain(cam.tx, cam.ty) : 0, s1: along ? world.sOfMain(to.tx, to.ty) : 0 };
      });
    },
    /** Rectangles (CSS px, relative to the canvas) the river must stay out of: text and controls sit there. */
    setMasks(rects, { fadeMs = 0 } = {}) {
      if (rects.length) { masks = rects; maskFrom = fadeMs ? 0 : 1; maskTo = 1; }
      else { maskFrom = maskAlpha; maskTo = 0; }
      maskMs = reduce ? 0 : fadeMs; maskStart = now();
      maskAlpha = maskMs ? maskFrom : maskTo;
      dirty = true; if (reduce) frame(now(), true);
    },
    /** Move existing masks without re-running the dissolve (layout changed, same content). */
    updateMasks(rects) { masks = rects; dirty = true; if (reduce) frame(now(), true); },
    /** 1 is the normal current. Briefly raise it (to 2.5 or so) for emphasis; it eases there and back. */
    setCurrent(v) { speedTarget = v; },
    /** A few seconds of extra hops: the plan is ready. */
    celebrate(seconds = 2.4) { burst = (now() - t0) / 1000 + seconds; },
    get scene() { return sceneName; },
    get cell() { return { cw, ch, cols, rows }; },
    get reducedMotion() { return reduce; },
    resize,
    destroy() { destroyed = true; stop(); ro?.disconnect(); document.removeEventListener("visibilitychange", onVis); },
  };
}
