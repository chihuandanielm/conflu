// river.js: the ASCII confluence river. No dependencies, no network, no randomness.
//
// One world (tributaries joining a stem that bends into a long reach), one perspective camera
// (target, heading, pitch, zoom), and a shaded glyph field that is a pure function of place and time.
// Scenes are camera presets. Moving between scenes is one eased camera move through the same world,
// so the river never cuts and never stops flowing.
//
// The picture is never seen from straight above. Glyphs get larger toward the viewer, water is shaded
// with a ten-step density ramp, land is drawn in sand, and the only green thing is the fish.
//
// See design/RIVER.md for how it works and how to tune it. This copy is the one the app uses (src/app/river/).

export const PALETTE = { sage: "#E0E7DA", blue: "#466995", green: "#00A37D", sand: "#E6B989" };

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2); // quintic in-out: no visible start or stop
const RAD = Math.PI / 180;
/** Deterministic hash to [0, 1). Same inputs, same answer, on every device. */
export function hash(a, b = 0, c = 0) {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ================================================================ world

/** Catmull-Rom through `pts` ([x, y, halfWidth]), sampled about every `step` world units. */
function spline(pts, step = 2.5) {
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  const out = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const far = Math.min(p1[1], p2[1]) < -360; // beyond the ridge nothing needs fine sampling
    const n = Math.max(3, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / (far ? step * 6 : step)));
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      const f = (k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push({ x: f(0), y: f(1), hw: lerp(p1[2], p2[2], t) });
    }
  }
  const last = pts[pts.length - 1];
  out.push({ x: last[0], y: last[1], hw: last[2] });
  return out;
}

/**
 * Build the river for a viewport aspect ratio (width / height). The tributary fan is wider on wide
 * screens so the far sources fill the horizon on a desktop and still fit on a phone.
 * World units are arbitrary. North is -y. The stem flows south, bends, then runs east as the reach.
 */
export function buildWorld(aspect = 1.6) {
  const sx = clamp(150 * aspect, 70, 250); // how far the sources spread, far upstream
  const reach = [];
  for (let x = 96, i = 0; x <= 1500; x += 86, i++) reach.push([x, 166 + (i % 2 ? -11 : 11) * Math.min(1, (i + 1) / 2), 7]);
  const main = spline([
    [0.5 * sx, -1500, 2], [-0.2 * sx, -900, 2], [0.3 * sx, -560, 2], [0.12 * sx, -330, 2.2], [-0.1 * sx, -250, 2.6], [0.07 * sx, -170, 3.2], [-9, -104, 3.8], [6, -52, 4.6], [0, -8, 5.6],
    [-4, 32, 6.6], [2, 70, 7.2], [10, 104, 7.3], [28, 134, 7.2], [58, 154, 7], ...reach,
  ]);
  let s = 0;
  main[0].s = 0;
  for (let i = 1; i < main.length; i++) { s += Math.hypot(main[i].x - main[i - 1].x, main[i].y - main[i - 1].y); main[i].s = s; }

  const nearestOn = (path, x, y) => {
    let best = path[0], bd = Infinity;
    for (const p of path) { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = p; } }
    return best;
  };
  /** A tributary ends on its parent's centreline; its `s` counts up to the parent's `s` there, so the current lines up. */
  const trib = (pts, parent) => {
    const end = pts[pts.length - 1], j = nearestOn(parent, end[0], end[1]);
    pts[pts.length - 1] = [j.x, j.y, end[2]];
    const p = spline(pts);
    const lens = [0];
    for (let i = 1; i < p.length; i++) lens.push(lens[i - 1] + Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y));
    const len = lens[lens.length - 1];
    for (let i = 0; i < p.length; i++) p[i].s = j.s - (len - lens[i]);
    return p;
  };
  // Each tributary starts far beyond the ridge, so from the landing it runs all the way to the horizon.
  const l1 = trib([[-1.6 * sx, -1500, 1.8], [-0.9 * sx, -800, 1.8], [-0.5 * sx, -340, 1.9], [-0.52 * sx, -262, 2.2], [-0.3 * sx, -196, 2.7], [-0.24 * sx, -128, 3.1], [-16, -84, 3.4], [0, -66, 3.5]], main);
  const r1 = trib([[1.9 * sx, -1500, 1.8], [1.0 * sx, -780, 1.8], [0.6 * sx, -330, 1.9], [0.44 * sx, -250, 2.2], [0.4 * sx, -172, 2.7], [0.16 * sx, -104, 3.1], [16, -50, 3.5], [0, -32, 3.6]], main);
  const l2 = trib([[-4.2 * sx, -1500, 1.8], [-2.2 * sx, -760, 1.8], [-1.02 * sx, -310, 1.9], [-0.8 * sx, -226, 2.2], [-0.68 * sx, -140, 2.8], [-0.34 * sx, -74, 3.2], [-24, -22, 3.6], [-1, -2, 3.7]], main);
  const r2 = trib([[4.4 * sx, -1500, 1.8], [2.3 * sx, -740, 1.8], [1.08 * sx, -300, 1.9], [0.94 * sx, -214, 2.3], [0.62 * sx, -132, 2.9], [0.42 * sx, -52, 3.3], [26, 2, 3.7], [-1, 24, 3.8]], main);
  const l1b = trib([[-2.9 * sx, -1500, 1.6], [-1.5 * sx, -700, 1.6], [-0.9 * sx, -345, 1.6], [-0.7 * sx, -300, 1.7], [-0.52 * sx, -262, 2]], l1);
  const r2b = trib([[3.0 * sx, -1500, 1.6], [1.4 * sx, -720, 1.6], [0.8 * sx, -345, 1.6], [0.98 * sx, -280, 1.7], [0.94 * sx, -214, 2]], r2);
  const l2b = trib([[-6 * sx, -1300, 1.6], [-2.6 * sx, -520, 1.6], [-1.34 * sx, -230, 1.6], [-1.0 * sx, -186, 1.7], [-0.68 * sx, -140, 2]], l2);
  const paths = [main, l1, r1, l2, r2, l1b, r2b, l2b];

  // Spatial buckets of segments, so a point query only looks at nearby river.
  const B = 16, MARGIN = 7, buckets = new Map();
  for (const p of paths) for (let i = 0; i < p.length - 1; i++) {
    const a = p[i], b = p[i + 1], pad = Math.max(a.hw, b.hw) + MARGIN;
    const seg = { a, b, dx: b.x - a.x, dy: b.y - a.y };
    seg.len2 = seg.dx * seg.dx + seg.dy * seg.dy || 1e-9;
    seg.il = 1 / Math.sqrt(seg.len2);
    for (let gx = Math.floor((Math.min(a.x, b.x) - pad) / B); gx <= Math.floor((Math.max(a.x, b.x) + pad) / B); gx++)
      for (let gy = Math.floor((Math.min(a.y, b.y) - pad) / B); gy <= Math.floor((Math.max(a.y, b.y) + pad) / B); gy++) {
        const k = gx * 8192 + gy;
        let list = buckets.get(k);
        if (!list) buckets.set(k, (list = []));
        list.push(seg);
      }
  }
  const q = { bank: 99, edge: 9, s: 0, cross: 0, hw: 1, fx: 1, fy: 0 };
  /** Nearest river at a world point. bank = distance past the water's edge (negative in the water); edge = 0 mid-channel, 1 at the bank. */
  function query(x, y) {
    const list = buckets.get(Math.floor(x / B) * 8192 + Math.floor(y / B));
    q.bank = 99; q.edge = 9;
    if (!list) return q;
    for (let i = 0; i < list.length; i++) {
      const g = list[i];
      const t = clamp(((x - g.a.x) * g.dx + (y - g.a.y) * g.dy) / g.len2, 0, 1);
      const px = g.a.x + g.dx * t, py = g.a.y + g.dy * t;
      const d = Math.hypot(x - px, y - py), hw = lerp(g.a.hw, g.b.hw, t), bank = d - hw;
      if (bank < q.bank) {
        q.bank = bank; q.hw = hw; q.edge = d / hw;
        q.s = lerp(g.a.s, g.b.s, t);
        q.fx = g.dx * g.il; q.fy = g.dy * g.il;
        q.cross = (x - px) * -q.fy + (y - py) * q.fx; // signed distance across the current
      }
    }
    return q;
  }
  /** Point on the stem at arc length s (clamped). */
  function onMain(sAt) {
    let lo = 0, hi = main.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (main[m].s <= sAt) lo = m; else hi = m; }
    const a = main[lo], b = main[hi], t = clamp((sAt - a.s) / (b.s - a.s || 1), 0, 1);
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
  }
  // Places a fish may hop: centreline samples of every channel wide enough to hold one.
  const spots = [];
  for (const p of paths) for (let i = 2; i < p.length - 2; i += 2) if (p[i].hw >= 2.4) spots.push(p[i]);
  return { sx, paths, main, query, onMain, sOfMain: (x, y) => nearestOn(main, x, y).s, spots };
}

// ================================================================ scenes (camera presets)

/**
 * A scene returns a camera for the current viewport:
 *   tx, ty   world point the camera looks at
 *   heading  degrees, 0 = looking north (upstream over the confluence), 90 = looking east (down the reach)
 *   pitch    degrees below the horizon. Always low: this river is never a map.
 *   zoom     pixels per world unit at the target
 *   ax, ay   where the target sits on screen, 0..1
 * Add a scene by adding a function here; nothing else needs to know about it.
 */
const TAN = (deg) => Math.tan(deg * RAD), FOCAL = 0.5 / Math.tan(25 * RAD); // focal length as a share of viewport height
const RIDGE = (H) => clamp(H * 0.12, Math.min(52, H * 0.3), 124);
/** Screen y of the horizon (px) to the `ay` that puts it there, for a camera pitched `pitch` degrees. */
const ayFor = (horizonPx, H, pitch) => horizonPx / H + FOCAL * TAN(pitch);
export const SCENES = {
  /** Intro: just above the water on the stem, looking upstream. Fish hop close to the lens. */
  low: (W, H) => ({ tx: 0, ty: 60, heading: 0, pitch: 7, zoom: clamp(W / 30, 22, 46), ax: 0.5, ay: 0.74 }),
  /**
   * Landing: the camera has risen. Every tributary runs down from the far ridge and joins the stem in front of you.
   * `o.sky` is the height (px) of the text above it; the horizon sits below that, so longer copy pushes the river down
   * instead of colliding with it.
   */
  landing: (W, H, o = {}) => {
    // Wide screens: the text sits to the left over the land (masked), and the river takes the right two thirds.
    const wide = W >= 900 && W / H > 1.2;
    const horizon = wide ? 0.36 * H : clamp(Math.max(0.4 * H, (o.sky ?? 0) + RIDGE(H) + 10), 0, 0.68 * H);
    return { tx: 0, ty: 46, heading: 0, pitch: 24, zoom: clamp(W / 105, 6.2, 12.5), ax: wide ? 0.64 : 0.5, ay: ayFor(horizon, H, 24) };
  },
  /** Questions: at the water's edge on the reach, looking across it. The river is the bottom fifth of the screen. */
  ask: (W, H) => ({ tx: 440, ty: 177, heading: 0, pitch: 4.5, zoom: H / 10, ax: 0.5, ay: 0.835 }),
  /** A wide, short strip of the same view, for a still banner (the top of the PDF). Use with asciiFrame. */
  banner: (W, H) => ({ tx: 440, ty: 177, heading: 0, pitch: 6, zoom: H / 13, ax: 0.5, ay: 0.8 }),
  /**
   * Results: turned to face downstream. The reach winds away to the horizon across the top of the page.
   * `o.sky` is the height of any text above the horizon (the title on a phone); on wide screens the title sits beside the river.
   */
  results: (W, H, o = {}) => {
    const wide = W >= 760, horizon = wide ? 92 : (o.sky ?? 130) + 26;
    // The camera hangs over the water on a bend, so the river starts under you and winds off ahead.
    return { tx: 620, ty: 175, heading: 90, pitch: 13, zoom: clamp(W / 76, 11, 19), ax: wide ? 0.7 : 0.5, ay: ayFor(horizon, H, 13) };
  },
};

// ================================================================ glyphs

// Ten shades of water, light to dark, by how the current runs on screen. Mid tones carry the direction
// of flow; the dark end is shared, so deep water looks the same wherever it is heading.
export const WATER_RAMP = [
  [" ", ".", "-", "~", "=", "+", "*", "#", "%", "@"], // running across
  [" ", ".", ":", ";", "!", "|", "*", "#", "%", "@"], // running toward or away from you
  [" ", ".", "`", ":", "\\", "+", "*", "#", "%", "@"], // down to the right
  [" ", ".", ",", ":", "/", "+", "*", "#", "%", "@"], // down to the left
];
// Land, light to dark, in sand.
const LAND_RAMP = [" ", ".", ".", ":", ":", "*", "*", "#", "#", "%"];
const FISH = { right: "><>", left: "<><", bigRight: "><(('>", bigLeft: "<'))><" };

// ================================================================ view (pure camera maths + shading)

/** Camera maths and per-point shading with no canvas, so tests and the PDF can use it too. */
export function makeView(world) {
  const v = { W: 1, H: 1, focal: 1, cam: null, yh: 0, hx: 0, hy: 0, sx: 0, sy: 0, sk: 0, world };
  let sinP = 1, cosP = 0, fx = 0, fy = -1, rx = 1, ry = 0, D = 1, cx = 0, cy = 0, cz = 1;
  v.set = (W, H, cam) => {
    v.W = W; v.H = H; v.cam = cam;
    v.focal = (H / 2) / Math.tan(25 * RAD); // 50 degree vertical field of view
    const p = clamp(cam.pitch, 4, 80) * RAD, h = cam.heading * RAD;
    sinP = Math.sin(p); cosP = Math.cos(p);
    fx = Math.sin(h); fy = -Math.cos(h); rx = Math.cos(h); ry = Math.sin(h);
    D = v.focal / cam.zoom;
    cx = cam.tx - fx * cosP * D; cy = cam.ty - fy * cosP * D; cz = D * sinP;
    v.yh = cam.ay * H - v.focal * sinP / cosP; // the horizon, in screen px
  };
  /** Screen px to ground point (v.hx, v.hy). Returns world units per px there, or -1 at or above the horizon. */
  v.unproject = (px, py) => {
    const xs = px - v.cam.ax * v.W, ys = py - v.cam.ay * v.H;
    const dz = v.focal * sinP + ys * cosP;
    if (dz <= 1e-3) return -1;
    const l = cz / dz, a = v.focal * cosP - ys * sinP;
    v.hx = cx + l * (fx * a + rx * xs);
    v.hy = cy + l * (fy * a + ry * xs);
    return l;
  };
  /** World point (z up) to screen px (v.sx, v.sy) with v.sk px per world unit. Returns false behind the camera. */
  v.project = (x, y, z = 0) => {
    const dx = x - cx, dy = y - cy, dzw = z - cz;
    const along = dx * fx + dy * fy;
    const depth = along * cosP - dzw * sinP;
    if (depth < 1e-3) return false;
    v.sk = v.focal / depth;
    v.sx = v.cam.ax * v.W + (dx * rx + dy * ry) * v.sk;
    v.sy = v.cam.ay * v.H + (-along * sinP - dzw * cosP) * v.sk;
    return true;
  };

  // A far ridge above the horizon. It depends only on the direction you look, so it turns with the camera.
  const peak = (x) => 1 - Math.abs(Math.sin(x));
  const ridge = (a, f, seed) => 0.58 * peak(a * f + seed) + 0.3 * peak(a * f * 2.17 + seed * 1.7) + 0.12 * peak(a * f * 4.3 + seed * 0.6);
  v.ridgeHeight = () => RIDGE(v.H);

  /**
   * What is at this screen point. Fills `c` and returns its kind:
   *   0 nothing, 1 water (animated: see waterInk), 2 land or ridge (static: c.ch is the glyph).
   * `cw` is the width of the glyph cell in px (it sets how much world one glyph covers).
   */
  v.classify = (px, py, cw, col, row, c) => {
    const H = v.H, yh = v.yh;
    if (py < yh) {
      const up = yh - py, RH = v.ridgeHeight();
      if (up > RH) return 0;
      const a = v.cam.heading * RAD + Math.atan((px - v.cam.ax * v.W) / v.focal);
      const near = RH * 0.78 * ridge(a, 4.6, 1.3), far = RH * (0.3 + 0.7 * ridge(a, 2.3, 4.2));
      if (up < near) {
        // Near ridge: a drawn outline, a shaded flank on the falling side, bare paper on the lit side.
        const slope = ridge(a + 0.004, 4.6, 1.3) - ridge(a - 0.004, 4.6, 1.3), d = near - up, h = hash(col, row, 5);
        if (d < cw * 1.9) c.ch = slope > 0.0045 ? "/" : slope < -0.0045 ? "\\" : Math.abs(slope) < 0.0012 ? "^" : "-";
        else if (slope < 0) c.ch = h < 0.5 ? ":" : h < 0.72 ? "*" : h < 0.86 ? "#" : ".";
        else c.ch = h < 0.16 ? "." : " ";
        return c.ch === " " ? 0 : 2;
      }
      if (up < far) { c.ch = far - up < cw * 1.7 ? "." : hash(col, row, 9) < 0.12 ? "." : " "; return c.ch === " " ? 0 : 2; }
      return 0;
    }
    const l = v.unproject(px, py);
    if (l < 0) return 0;
    const fog = 1 - clamp((py - yh) / (0.46 * (H - yh) + 1), 0, 1); // 1 at the horizon, 0 in the foreground
    const fp = l * cw; // world units one glyph covers, across
    const wx = v.hx, wy = v.hy, q = world.query(wx, wy);
    if (q.bank < 0 || (q.bank < Math.min(0.42 * fp, 1.6) && fog < 0.97)) {
      // Water. Even a channel thinner than a glyph is drawn, so far tributaries reach the ridge as fine lines.
      c.s = q.s; c.cross = q.cross; c.edge = Math.min(q.edge, 1); c.fog = fog;
      c.thin = clamp(1.25 - (2 * q.hw) / (fp * 4), 0, 1);
      v.project(wx, wy); const x0 = v.sx, y0 = v.sy;
      v.project(wx + q.fx, wy + q.fy);
      const ex = v.sx - x0, ey = v.sy - y0, el = Math.hypot(ex, ey) || 1;
      const ang = ((Math.atan2(ey, ex) % Math.PI) + Math.PI) % Math.PI;
      c.ori = ang < 0.44 || ang > Math.PI - 0.44 ? 0 : ang < 1.18 ? 2 : ang < Math.PI - 1.18 ? 1 : 3;
      // World distance between neighbouring glyphs along the current. Waves finer than this are left out, so they never alias into noise.
      c.fl = (Math.abs(ex) * cw + Math.abs(ey) * cw * 1.9) / (el * el);
      return 1;
    }
    if (fog > 0.985) return 0;
    // Land is quantised to the world, so it stays put while the river moves.
    const g = Math.pow(2, Math.round(Math.log2(Math.max(fp, 0.12)))), h = hash(Math.floor(wx / g), Math.floor(wy / g), 7);
    const calm = 1 - fog * 0.75;
    let ink = 0;
    if (q.bank < clamp(fp * 0.9, 0.35, 1.2)) ink = fog > 0.55 ? 0.34 : 0.8; // the wet edge: a firm shoreline up close, a faint one far off
    else if (q.bank < 2.4) ink = h < 0.6 * calm ? 0.42 : 0;
    else if (q.bank < 5.5) ink = h < 0.22 * calm ? 0.2 : 0;
    else {
      // Open ground: quiet, with slow patches of stipple.
      const patch = Math.sin(wx * 0.021 + 1.7) * Math.sin(wy * 0.017 + 0.4) + 0.5 * Math.sin(wx * 0.047 - wy * 0.039);
      ink = h < (patch > 0.45 ? 0.07 : 0.012) * calm ? 0.15 : 0;
    }
    if (!ink) return 0;
    c.ch = LAND_RAMP[clamp(Math.floor(ink * 10 + (h * 7 % 1) * 1.6 - 0.4), 1, 9)];
    return 2;
  };
  return v;
}

/**
 * How dark the water is at a cell at flow time `t`: 0 (bare) to 1 (deep).
 * Three wave trains at different speeds ride the current, the channel is darker mid-stream, the banks
 * are pale, and distance washes everything toward a light even tone.
 */
export function waterInk(c, t) {
  const x = c.cross, mid = 1 - c.edge * c.edge, fl = c.fl;
  // Each train only shows where the glyphs are fine enough to draw it (about four glyphs per wave or better).
  const amp = (k) => clamp(1.9 - fl * k * 1.25, 0, 1);
  let n = 0, w = 0, a;
  for (let i = 0; i < TRAINS.length; i++) {
    const T = TRAINS[i];
    a = amp(T[0]) * T[2]; if (a <= 0) continue;
    n += a * Math.sin((c.s - t * T[1]) * T[0] + x * T[3] + T[4] + T[5] * Math.sin((c.s - t * 3.1) * 0.093 + x * 0.31 + i));
    w += T[2];
  }
  n = w ? n / Math.max(w, 0.9) : 0;
  const slow = 0.5 + 0.5 * Math.sin((c.s - t * 3.1) * 0.045 + x * 0.12 + 2.2); // broad dark pools drifting downstream
  let ink = 0.14 + 0.32 * mid + 0.42 * n + 0.24 * slow * mid;
  if (c.edge > 0.9) ink = Math.min(ink, 0.16 + 0.12 * n); // pale shallows along each bank
  ink = lerp(ink, 0.3 + 0.12 * n, c.fog * c.fog); // far water flattens to a light shimmer
  // Thin channels are one calm tone. Clamped to the documented 0..1: the glyph index was already clamped, so the
  // picture is unchanged (near banks the sum dips below 0, which always drew the blank glyph).
  return clamp(lerp(ink, 0.34 + 0.1 * n + 0.08 * slow, c.thin), 0, 1);
}
// Wave trains: [wavenumber (rad per world unit), speed (units per second), weight, slant across the channel, phase, wobble].
// Wavelengths run from about 17 units down to 0.5, so there is detail to resolve at every zoom.
const TRAINS = [
  [0.37, 3.1, 0.5, 0.1, 4.1, 0.6], [0.71, 5.2, 0.9, 0.22, 0, 1.1], [1.13, 8.6, 0.7, -0.3, 1.7, 0.8],
  [2.3, 6.4, 0.55, 0.5, 2.9, 0.9], [4.1, 9.2, 0.45, -0.8, 0.7, 0.7], [7.3, 7.1, 0.36, 1.3, 5.2, 0.6], [12.9, 10.3, 0.3, -2.1, 3.3, 0.5],
];
export const waterGlyph = (c, t) => WATER_RAMP[c.ori][clamp(Math.floor(waterInk(c, t) * 10), 0, 9)];

/**
 * One still frame as plain text, on an even grid. For the PDF, tests, and anywhere without a canvas.
 * Returns rows of { blue, sand } strings of equal length (overlay them to get the picture).
 */
export function asciiFrame(scene, cols, rows, { cell = [8, 16], t = 0, aspect, hints } = {}) {
  const W = cols * cell[0], H = rows * cell[1];
  const view = makeView(buildWorld(aspect ?? W / H));
  view.set(W, H, (typeof scene === "function" ? scene : SCENES[scene])(W, H, hints ?? {}));
  const c = {}, out = [];
  for (let r = 0; r < rows; r++) {
    let blue = "", sand = "";
    for (let k = 0; k < cols; k++) {
      const kind = view.classify((k + 0.5) * cell[0], (r + 0.5) * cell[1], cell[0], k, r, c);
      blue += kind === 1 ? waterGlyph(c, t) : " ";
      sand += kind === 2 ? c.ch : " ";
    }
    out.push({ blue, sand });
  }
  return out;
}

// ================================================================ the animated river

/**
 * @param {HTMLCanvasElement} canvas  Sized by CSS; the river fills it.
 * @param {object} [opt]
 * @param {string} [opt.font]     Monospace family already loaded on the page.
 * @param {string} [opt.scene]    Starting scene name.
 * @param {boolean} [opt.still]   Draw single frames and never animate. Default: follows prefers-reduced-motion.
 * @param {() => number} [opt.now] Clock in ms, for tests.
 */
export function createRiver(canvas, opt = {}) {
  const ctx = canvas.getContext("2d", { alpha: false });
  const font = opt.font ?? '"IBM Plex Mono", ui-monospace, monospace';
  const now = opt.now ?? (() => performance.now());
  const reduce = opt.still ?? (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);

  let W = 0, H = 0, dpr = 1, adv = 0.6;
  let world = buildWorld(1.6), view = makeView(world);
  let cam = SCENES[opt.scene ?? "landing"](1440, 900), sceneName = opt.scene ?? "landing";
  let move = null, dirty = true, hints = {};
  let masks = [], maskAlpha = 1, maskFrom = 1, maskTo = 1, maskStart = 0, maskMs = 0;
  let raf = 0, last = 0, running = false, destroyed = false;
  let speed = 1, speedTarget = 1, flowT = 0, clock = 0;
  let quality = 1, base = 1, dprCap = 2, gap = 16, sinceCheck = 0; // glyph scale: set from the screen size, raised if this device runs slow
  const stats = { frames: 0, slow: 0, worstMs: 0, avgMs: 0, cells: 0 };

  // Rows of glyphs. Rows get taller toward the viewer, so the picture has depth.
  let rowsN = 0, cap = 0;
  const rowY = [], rowFs = [], rowCw = [], rowCols = [], rowOff = [], rowFont = [];
  let kind, cS, cCross, cEdge, cOri, cFog, cThin, cFl, cCh;
  const cell = { s: 0, cross: 0, edge: 0, ori: 0, fog: 0, thin: 0, fl: 1, ch: " " };

  function layoutRows() {
    const phone = W < 600;
    const fsMin = (phone ? 7.5 : 8.5) * quality, fsMax = (phone ? 15 : 19) * quality, fsRidge = (phone ? 8.5 : 10) * quality;
    const yh = view.yh, RH = view.ridgeHeight();
    rowsN = 0; let total = 0;
    const push = (y, fs) => {
      const q = Math.round(fs * 2) / 2, cw = q * adv, i = rowsN++;
      rowY[i] = y; rowFs[i] = q; rowCw[i] = cw; rowCols[i] = Math.ceil(W / cw) + 1; rowOff[i] = total;
      rowFont[i] = `400 ${q}px ${font}`;
      total += rowCols[i];
    };
    // Ground: from the bottom of the screen up to the horizon.
    let y = H + 2;
    while (y > yh + 1 && y > -20 && rowsN < 400) {
      const fs = clamp(fsMax * Math.pow(Math.max(0, y - yh) / Math.max(120, H - yh), 0.55), fsMin, fsMax), ch = fs * 1.16;
      push(y - ch / 2, fs); y -= ch;
    }
    // Ridge: small even rows above the horizon.
    for (let yy = Math.min(yh, H + 2) - fsRidge * 0.58; yy > yh - RH && yy > -fsRidge; yy -= fsRidge * 1.16) if (yy < H + fsRidge) push(yy, fsRidge);
    if (total > cap) {
      cap = Math.ceil(total * 1.5);
      kind = new Uint8Array(cap); cS = new Float32Array(cap); cCross = new Float32Array(cap); cEdge = new Float32Array(cap);
      cOri = new Uint8Array(cap); cFog = new Float32Array(cap); cThin = new Float32Array(cap); cFl = new Float32Array(cap); cCh = new Array(cap).fill(" ");
    }
    stats.cells = total;
  }

  function inMask(px, py) {
    for (let i = 0; i < masks.length; i++) { const m = masks[i]; if (px >= m.x && px <= m.x + m.w && py >= m.y && py <= m.y + m.h) return true; }
    return false;
  }

  /** Work out what every glyph cell is looking at. Runs only while the camera or the masks are moving. */
  function rebuild() {
    view.set(W, H, cam);
    layoutRows();
    for (let r = 0; r < rowsN; r++) {
      const py = rowY[r], cw = rowCw[r], off = rowOff[r], n = rowCols[r];
      for (let k = 0; k < n; k++) {
        const i = off + k, px = (k + 0.5) * cw;
        if (maskAlpha > 0 && masks.length && inMask(px, py) && hash(k, r, 3) < maskAlpha) { kind[i] = 0; continue; }
        const kd = view.classify(px, py, cw, k, r, cell);
        kind[i] = kd;
        if (kd === 1) { cS[i] = cell.s; cCross[i] = cell.cross; cEdge[i] = cell.edge; cOri[i] = cell.ori; cFog[i] = cell.fog; cThin[i] = cell.thin; cFl[i] = cell.fl; }
        else if (kd === 2) cCh[i] = cell.ch;
      }
    }
    dirty = false;
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    dpr = Math.min(dprCap, globalThis.devicePixelRatio || 1);
    // Bigger screens get proportionally bigger glyphs, so the amount of work per frame is about the same everywhere.
    const b = clamp(Math.sqrt((W * H) / 1.3e6), 1, 2.2);
    if (b !== base) { quality = Math.max(quality / base, 1) * b; base = b; }
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `400 20px ${font}`;
    adv = ctx.measureText("M".repeat(40)).width / 800;
    const next = buildWorld(W / H);
    if (Math.abs(next.sx - world.sx) > 1) { world = next; view = makeView(world); }
    if (move) move.to = SCENES[move.name](W, H, hints); else cam = SCENES[sceneName](W, H, hints);
    dirty = true;
    if (reduce || !running) draw(now());
  }

  // ---- fish: a few, each on its own clock, so hops never line up and never visibly loop.
  const FISHES = [{ period: 4.3, offset: 0.4 }, { period: 5.9, offset: 2.1 }, { period: 7.7, offset: 3.6 }, { period: 9.1, offset: 5.2 }];
  const HOP = 1.1, SPLASH = 0.6;
  const fishState = FISHES.map(() => ({ cycle: -1, spot: null, dir: 1, lift: 1 }));
  let burstUntil = 0;

  function pickSpot(i, cycle) {
    for (let k = 0; k < 24; k++) {
      const sp = world.spots[Math.floor(hash(i + 1, cycle, k + 11) * world.spots.length)];
      if (!view.project(sp.x, sp.y)) continue;
      if (view.sk < 3.4 || view.sk > 260) continue; // too far to see, or in your face
      if (view.sx < 40 || view.sx > W - 40 || view.sy < view.yh + 24 || view.sy > H - 8) continue;
      if (inMask(view.sx, view.sy) || inMask(view.sx, view.sy - 40)) continue;
      return sp;
    }
    return null;
  }

  function drawFish(t) {
    for (let i = 0; i < FISHES.length; i++) {
      const f = FISHES[i], st = fishState[i];
      const period = burstUntil > t ? f.period * 0.26 : f.period;
      const local = t + f.offset, cycle = Math.floor(local / period), age = local - cycle * period, u = age / HOP;
      if (cycle !== st.cycle) {
        st.cycle = cycle; st.spot = pickSpot(i, cycle);
        st.dir = hash(i, cycle, 3) < 0.5 ? -1 : 1; st.lift = 0.85 + hash(i, cycle, 5) * 0.5;
      }
      const sp = st.spot;
      if (!sp || age > HOP + SPLASH) continue;
      // The hop is a real arc in the world: along the current (or against it), up and back down.
      const p0 = sp, i0 = world.query(sp.x, sp.y), dx = i0.fx * st.dir, dy = i0.fy * st.dir;
      if (!view.project(p0.x, p0.y)) continue;
      // Sized on screen, so a hop is a small event whether the water is near or far.
      const LEN = clamp(view.sk * 5.2, 30, 120) / view.sk, UP = clamp(view.sk * 2.7, 18, 60) / view.sk * st.lift;
      const at = (uu, z) => view.project(p0.x + dx * LEN * uu, p0.y + dy * LEN * uu, z);
      at(0, 0);
      const k0 = view.sk, fs0 = clamp(k0 * 0.8, 9, 22);
      ring(view.sx, view.sy, fs0, age);
      if (at(1, 0)) ring(view.sx, view.sy, clamp(view.sk * 0.8, 9, 22), age - HOP);
      if (u < 0 || u > 1) continue;
      at(u, UP * 4 * u * (1 - u));
      const x = view.sx, y = view.sy, k = view.sk, fs = clamp(k * 0.8, 9, 22);
      at(Math.min(1, u + 0.04), UP * 4 * Math.min(1, u + 0.04) * (1 - Math.min(1, u + 0.04)));
      const vx = view.sx - x, vy = view.sy - y, right = vx >= 0;
      const glyph = k > 9.5 ? (right ? FISH.bigRight : FISH.bigLeft) : (right ? FISH.right : FISH.left);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(clamp(Math.atan2(vy, Math.abs(vx)), -0.8, 0.8) * (right ? 1 : -1));
      ctx.font = `600 ${fs}px ${font}`;
      ctx.textAlign = "center"; ctx.lineJoin = "round";
      ctx.strokeStyle = PALETTE.sage; ctx.lineWidth = fs * 0.34; // a soft clearing the shape of the fish
      ctx.strokeText(glyph, 0, 0);
      ctx.fillStyle = PALETTE.green;
      ctx.fillText(glyph, 0, 0);
      // Two drops fall away behind the tail.
      ctx.font = `400 ${fs * 0.8}px ${font}`; ctx.fillStyle = PALETTE.blue;
      const back = -(glyph.length * 0.36 + 0.5) * fs * (right ? 1 : -1);
      ctx.fillText(u < 0.5 ? "'" : ".", back, fs * 0.5);
      if (u > 0.15 && u < 0.8) ctx.fillText(".", back * 1.5, fs * 1.05);
      ctx.restore();
      ctx.textAlign = "left";
    }
  }
  /** A small ring that opens and thins out where a fish leaves or lands. It grows continuously: no frames to step through. */
  function ring(x, y, fs, age) {
    if (age < 0 || age > SPLASH) return;
    const u = age / SPLASH, r = fs * (0.5 + 1.9 * u);
    ctx.font = `400 ${fs * 0.86}px ${font}`;
    ctx.textAlign = "center"; ctx.lineJoin = "round";
    ctx.strokeStyle = PALETTE.sage; ctx.lineWidth = fs * 0.3; ctx.fillStyle = PALETTE.blue;
    const put = (ch, dx, dy) => { ctx.strokeText(ch, x + dx, y + dy); ctx.fillText(ch, x + dx, y + dy); };
    if (u < 0.22) put("*", 0, -fs * 0.2);
    put(u < 0.6 ? "(" : ".", -r, 0); put(u < 0.6 ? ")" : ".", r, 0);
    if (u < 0.75) { put(u < 0.4 ? "'" : ".", -r * 0.45, -fs * (0.5 + 1.5 * u * (1.4 - u))); put(u < 0.4 ? "'" : ".", r * 0.5, -fs * (0.4 + 1.8 * u * (1.3 - u))); }
    ctx.textAlign = "left";
  }

  // ---- one frame
  function draw(tNow) {
    const began = now();
    const dt = clamp((tNow - last) / 1000 || 0, 0, 0.1);
    last = tNow;
    if (move) {
      const u = clamp((tNow - move.start) / move.ms, 0, 1), e = ease(u), a = move.from, b = move.to;
      if (move.along) {
        // Follow the stem between the two places instead of cutting across land.
        const p = world.onMain(lerp(move.s0, move.s1, e)), blend = Math.min(1, e * 5) * Math.min(1, (1 - e) * 5);
        cam.tx = lerp(lerp(a.tx, b.tx, e), p.x, blend); cam.ty = lerp(lerp(a.ty, b.ty, e), p.y, blend);
      } else { cam.tx = lerp(a.tx, b.tx, e); cam.ty = lerp(a.ty, b.ty, e); }
      cam.zoom = Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), e));
      cam.pitch = lerp(a.pitch, b.pitch, e); cam.heading = lerp(a.heading, b.heading, e);
      cam.ax = lerp(a.ax, b.ax, e); cam.ay = lerp(a.ay, b.ay, e);
      dirty = true;
      if (u >= 1) { const done = move.resolve; sceneName = move.name; move = null; done(); }
    }
    if (maskAlpha !== maskTo) {
      maskAlpha = maskMs ? lerp(maskFrom, maskTo, clamp((tNow - maskStart) / maskMs, 0, 1)) : maskTo;
      if (maskAlpha === 0 && maskTo === 0) masks = [];
      dirty = true;
    }
    speed += (speedTarget - speed) * Math.min(1, dt * 3);
    if (!reduce) { flowT += dt * speed; clock += dt; }
    if (dirty) rebuild();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PALETTE.sage;
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = "middle"; ctx.textAlign = "left";
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? PALETTE.blue : PALETTE.sand;
      const want = pass ? 1 : 2;
      for (let r = 0; r < rowsN; r++) {
        const off = rowOff[r], n = rowCols[r];
        let str = "", any = false;
        for (let k = 0; k < n; k++) {
          const i = off + k;
          if (kind[i] !== want) { str += " "; continue; }
          if (pass) {
            cell.s = cS[i]; cell.cross = cCross[i]; cell.edge = cEdge[i]; cell.fog = cFog[i]; cell.thin = cThin[i]; cell.fl = cFl[i];
            const g = WATER_RAMP[cOri[i]][clamp(Math.floor(waterInk(cell, flowT) * 10), 0, 9)];
            str += g; if (g !== " ") any = true;
          } else { str += cCh[i]; any = true; }
        }
        if (any) { ctx.font = rowFont[r]; ctx.fillText(str, 0, rowY[r]); }
      }
    }
    if (!reduce) drawFish(clock);

    // Keep it smooth everywhere. Watch the real time between frames (not only our own drawing time); if this device
    // falls under about 50 frames a second, draw larger glyphs (fewer of them), then stop sharpening for high-density
    // screens. It only ever steps down in detail, a few times at most, so the picture never flickers between sizes.
    const ms = now() - began;
    stats.frames++; stats.avgMs += (ms - stats.avgMs) / Math.min(stats.frames, 30); if (ms > stats.worstMs) stats.worstMs = ms;
    if (ms > 12) stats.slow++;
    if (dt > 0 && dt < 0.25) gap += (dt * 1000 - gap) / 8;
    if (++sinceCheck >= 8 && (gap > 19.5 || stats.avgMs > 8)) {
      sinceCheck = 0; gap = 16;
      if (quality < base * 2.3) { quality = Math.min(base * 2.3, quality * 1.25); dirty = true; }
      else if (dprCap > 0.7) { dprCap = dprCap > 1 ? 1 : 0.7; resize(); } // last resort: a lighter canvas
    }
  }
  function loop(tNow) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    draw(tNow);
  }

  function start() {
    if (destroyed) return;
    if (reduce) { draw(now()); return; }
    if (running) return;
    running = true; last = now();
    raf = requestAnimationFrame(loop);
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
    setScene(name) { sceneName = name; move = null; cam = SCENES[name](W, H, hints); dirty = true; if (reduce) draw(now()); },
    /**
     * Glide the camera to a scene. `along: true` follows the stem between the two places.
     * Resolves when the camera arrives. With reduced motion it jumps and resolves at once.
     */
    goTo(name, { ms = 2200, along = false } = {}) {
      if (reduce) { this.setScene(name); return Promise.resolve(); }
      move?.resolve();
      return new Promise((resolve) => {
        const to = SCENES[name](W, H, hints);
        move = { name, from: { ...cam }, to, start: now(), ms, along, resolve,
          s0: along ? world.sOfMain(cam.tx, cam.ty) : 0, s1: along ? world.sOfMain(to.tx, to.ty) : 0 };
      });
    },
    /** Rectangles (CSS px, relative to the canvas) the river keeps clear, for text that sits on the picture. They dissolve in over `fadeMs`. */
    setMasks(rects, { fadeMs = 0 } = {}) {
      if (rects.length) { masks = rects; maskFrom = fadeMs ? 0 : 1; maskTo = 1; } else { maskFrom = maskAlpha; maskTo = 0; }
      maskMs = reduce ? 0 : fadeMs; maskStart = now();
      maskAlpha = maskMs ? maskFrom : maskTo;
      if (!maskMs && !rects.length) masks = [];
      dirty = true; if (reduce) draw(now());
    },
    /**
     * Layout hints passed to every scene (for example { sky: 320 }: the text above the river is 320px tall).
     * The current scene re-frames at once; a move in progress re-aims.
     */
    setHints(h) { hints = { ...hints, ...h }; if (move) move.to = SCENES[move.name](W, H, hints); else { cam = SCENES[sceneName](W, H, hints); dirty = true; if (reduce) draw(now()); } },
    /** 1 is the normal current. Raise it briefly for emphasis; it eases there and back. */
    setCurrent(v) { speedTarget = v; },
    /** A few seconds of extra hops: the plan is ready. */
    celebrate(seconds = 2.4) { burstUntil = clock + seconds; },
    /** Pause drawing while the river is off screen, and resume when it returns. */
    pause: stop, resume: start,
    get scene() { return sceneName; },
    get moving() { return !!move; },
    get reducedMotion() { return reduce; },
    /** Frame timing, for checking smoothness: { frames, slow (over 12 ms), worstMs, avgMs, cells }. */
    get stats() { return { ...stats, quality }; },
    resetStats() { stats.frames = 0; stats.slow = 0; stats.worstMs = 0; stats.avgMs = 0; },
    resize,
    destroy() { destroyed = true; stop(); ro?.disconnect(); document.removeEventListener("visibilitychange", onVis); },
  };
}
