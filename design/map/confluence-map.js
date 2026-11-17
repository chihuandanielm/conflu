// confluence-map.js: lays out a plan as a confluence. Pure geometry, no DOM, no dependencies.
//
// The idea: every goal is a stream. It starts at a dot beside its name, runs in toward the middle, turns
// downstream and stays in the river as its own strand all the way to the outcome. The river is therefore
// exactly as wide as the plan is full: many streams, one plan, drawn literally.
//
// The page and the PDF both call layoutConfluence() and draw the result with their own primitives
// (SVG in the browser, <Svg> in @react-pdf/renderer). mapSvg() below is the reference renderer.
//
// It adapts to whatever the data holds: any number of terms, any number of goals in a term, long titles,
// narrow screens (one-sided) and wide ones (two-sided), and a height limit (for a printed page).

/**
 * @typedef {{ goalId: string, title: string, lane?: string, hours?: number, gate?: boolean, done?: boolean }} MapGoal
 * @typedef {{ code: string, label: string, items: MapGoal[] }} MapTerm
 *
 * @param {{ terms: MapTerm[], outcome: string }} model   Terms in order, each with its goals in priority order.
 * @param {object} [opt]
 * @param {number} [opt.width=720]        Drawing width in px (or pt).
 * @param {1|2} [opt.sides]               1 = river on the left, names on the right. 2 = river in the middle. Default: 2 from 560 wide.
 * @param {number} [opt.fontSize=13]      Goal title size. Everything else scales from it.
 * @param {number} [opt.maxPerTerm=99]    Show at most this many new goals in a term; the rest are counted in term.more.
 * @param {number} [opt.maxHeight]        If given, the fullest terms drop their lowest-priority goals until the map fits this height.
 * @param {number} [opt.maxBundle]        Widest the river may get. Default: 22% of width (two-sided) or 30% (one-sided).
 * @param {number} [opt.charW=0.6]        Average glyph width in em, for estimating line breaks.
 * @param {Iterable<string>} [opt.done]   Goal ids already checked off.
 * @param {string} [opt.sourceLabel]      Text at the top of the student's own strand.
 */
export function layoutConfluence(model, opt = {}) {
  const width = opt.width ?? 720, sides = opt.sides ?? (width >= 560 ? 2 : 1);
  const fs = opt.fontSize ?? 13, lh = fs * 1.25, metaFs = fs * 0.82, charW = opt.charW ?? 0.6;
  const done = new Set(opt.done ?? []);
  const base = (id) => id.split("@")[0];

  // A goal that spans several terms joins the river once, where it starts.
  const seen = new Set();
  const terms = model.terms.map((t) => ({ code: t.code, label: t.label, all: t.items.filter((g) => !seen.has(g.goalId) && seen.add(g.goalId)) }));

  // How many goals each term shows. To fit a height, the term with the most rows gives up its last row (later terms
  // first), so space is shared evenly. Every term keeps one full row; if that still does not fit, the caller gets the
  // shortest map there is and decides what to do (the PDF scales it).
  const perRow = sides === 2 ? 2 : 1, rowsOf = (n) => Math.ceil(n / perRow);
  const counts = terms.map((t) => Math.min(t.all.length, opt.maxPerTerm ?? 99));
  let out = build();
  while (opt.maxHeight && out.height > opt.maxHeight) {
    let pick = -1;
    for (let i = 0; i < counts.length; i++) if (rowsOf(counts[i]) > 1 && (pick < 0 || rowsOf(counts[i]) >= rowsOf(counts[pick]))) pick = i;
    if (pick < 0) break;
    counts[pick] = (rowsOf(counts[pick]) - 1) * perRow;
    out = build();
  }
  return out;

  function build() {
    const shown = terms.map((t, i) => ({ ...t, items: t.all.slice(0, counts[i]), more: t.all.length - counts[i] }));
    // Which side each goal sits on. Rows hold a pair (one name each side, same height). A term starts on the side
    // opposite to where the last one ended, so a plan with one goal per term still alternates left and right.
    let nL = 0, nR = 0, startLeft = false;
    for (const t of shown) {
      t.sideLeft = t.items.map((_, k) => sides === 2 && (k % 2 === 1) !== startLeft);
      for (const l of t.sideLeft) l ? nL++ : nR++;
      if (t.items.length) startLeft = !t.sideLeft[t.items.length - 1];
    }
    const maxBundle = opt.maxBundle ?? width * (sides === 2 ? 0.22 : 0.3);
    const sp = Math.max(1.5, Math.min(fs * 0.34, maxBundle / (Math.max(nL, nR) + 1) / (sides === 2 ? 1 : 1)));
    const gap = fs * 1.5, dotR = fs * 0.27, turn = Math.max(6, fs * 0.75);
    const cx = sides === 2 ? width / 2 : fs * 0.9;
    const leftEdge = cx - nL * sp - gap, rightEdge = cx + nR * sp + gap; // where names begin
    const labelW = sides === 2 ? Math.max(60, Math.min(leftEdge, width - rightEdge) - dotR * 2 - 6) : Math.max(60, width - rightEdge - dotR * 2 - 6);
    const cpl = Math.max(8, Math.floor(labelW / (fs * charW)));
    const headH = fs * 2.3, blockH = lh * 2 + metaFs * 1.5 + fs * 0.7; // a name: up to two lines and a small line under it
    const step = blockH + fs * 0.2; // one row: a name on the right and, on wide layouts, one on the left

    const strands = [], dots = [], labels = [], termsOut = [];
    const top = fs * 3.4;
    let y = top, kL = 0, kR = 0;
    for (const t of shown) {
      const y0 = y;
      y += headH;
      t.items.forEach((g, k) => {
        const left = t.sideLeft[k];
        const lane = left ? cx - ++kL * sp : cx + ++kR * sp;
        const dx = left ? leftEdge : rightEdge, isDone = !!g.done || done.has(g.goalId) || done.has(base(g.goalId));
        const gy = y + lh * 0.5;
        strands.push({ id: g.goalId, gate: !!g.gate, done: isDone, x: lane, y: gy, left, from: dx });
        dots.push({ id: g.goalId, x: dx, y: gy, r: dotR, gate: !!g.gate, done: isDone });
        const lines = wrap(g.title, cpl, 2);
        labels.push({ id: g.goalId, title: g.title, lines, meta: metaOf(g), gate: !!g.gate, done: isDone, late: !!g.late,
          align: left ? "right" : "left", x: left ? dx - dotR - 6 : dx + dotR + 6, y: y, w: labelW, h: lines.length * lh + metaFs * 1.5 });
        if (sides === 1 || k % 2 === 1 || k === t.items.length - 1) y += step; // the row is full, or it is the term's last
      });
      y += fs * 0.6;
      termsOut.push({ code: t.code, label: t.label, y: y0, h: y - y0, more: t.more, count: t.all.length });
    }
    const mouthY = y + fs * 1.2;
    for (const s of strands) {
      const sx = s.left ? s.x - turn : s.x + turn; // the bend where a stream turns downstream
      s.d = `M${r(s.from)} ${r(s.y)}H${r(sx)}Q${r(s.x)} ${r(s.y)} ${r(s.x)} ${r(s.y + turn)}V${r(mouthY)}`;
    }
    const own = { id: "you", x: cx, d: `M${r(cx)} ${r(top - fs * 1.1)}V${r(mouthY)}` };
    const bx0 = cx - kL * sp, bx1 = cx + kR * sp;
    const outLines = wrap(model.outcome ?? "", Math.max(12, Math.floor((sides === 2 ? width * 0.8 : width - bx1 - gap) / (fs * 1.25 * charW))), 3);
    const mouth = { x0: bx0, x1: bx1, y: mouthY, cx: (bx0 + bx1) / 2, dotY: mouthY + fs * 2.2, r: fs * 0.55, lines: outLines, fs: fs * 1.25,
      textX: sides === 2 ? width / 2 : bx1 + gap, textY: sides === 2 ? mouthY + fs * 4.6 : mouthY + fs * 1.3, align: sides === 2 ? "middle" : "left" };
    const height = (sides === 2 ? mouth.textY + outLines.length * fs * 1.6 : Math.max(mouth.dotY + fs, mouth.textY + outLines.length * fs * 1.6)) + fs * 0.6;
    return { width, height, sides, fontSize: fs, lineHeight: lh, metaSize: metaFs, strandGap: sp, cx,
      source: { x: cx, y: top - fs * 1.1, r: dotR * 1.6, label: opt.sourceLabel ?? "You are here", textX: cx + fs * 0.9, textY: top - fs * 1.1 },
      own, strands, dots, labels, terms: termsOut, mouth, leftEdge, rightEdge, shown: counts.reduce((a, b) => a + b, 0), total: terms.reduce((a, t) => a + t.all.length, 0) };
  }

  function metaOf(g) {
    const bits = [];
    if (g.lane) bits.push(`${LANE_GLYPH[g.lane] ?? ""} ${LANE_NAME[g.lane] ?? g.lane}`.trim());
    if (g.hours) bits.push(`${g.hours} h`);
    if (g.gate) bits.push("must-do");
    return bits.join("  ");
  }
}

const r = (v) => Math.round(v * 10) / 10;

/** Greedy word wrap to at most `max` lines; the last line ends in an ellipsis if text was cut. */
export function wrap(text, cpl, max = 2) {
  const words = String(text).split(/\s+/), lines = [];
  let line = "";
  for (const w of words) {
    if (!line) line = w;
    else if ((line + " " + w).length <= cpl) line += " " + w;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  kept[max - 1] = kept[max - 1].slice(0, Math.max(1, cpl - 1)).replace(/[\s,.;:]+$/, "") + "…";
  return kept;
}

/** The eight kinds of goal. One glyph each, like a map legend: identity comes from the mark and the word, never from a colour. */
export const LANE_GLYPH = { foundation: "::", presence: "@", skills: "#", experience: ">>", network: "&", credentials: "*", academics: "=", applications: "->" };
export const LANE_NAME = { foundation: "foundation", presence: "online presence", skills: "skills", experience: "experience", network: "networking", credentials: "credentials", academics: "academics", applications: "applications" };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/**
 * Reference renderer: the layout as an SVG string. `text: false` draws only the river (lay real HTML
 * buttons over it using layout.labels); `text: true` draws names too (print, PDF prototype).
 */
export function mapSvg(L, { text = true, palette = { sage: "#E0E7DA", blue: "#466995", green: "#00A37D", sand: "#E6B989" },
  display = "Quantico, sans-serif", mono = '"IBM Plex Mono", monospace', title = "Your plan as a confluence" } = {}) {
  const P = palette, fs = L.fontSize, o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r(L.width)} ${r(L.height)}" width="${r(L.width)}" height="${r(L.height)}" role="img" aria-label="${esc(title)}">`);
  // Term lines: a dotted sand rule (a shoreline) and the term's name.
  for (const t of L.terms) {
    o.push(`<line x1="0" x2="${r(L.width)}" y1="${r(t.y + fs * 0.4)}" y2="${r(t.y + fs * 0.4)}" stroke="${P.sand}" stroke-width="1.5" stroke-dasharray="1.5 5" stroke-linecap="round"/>`);
    if (text) {
      const tx = L.sides === 2 ? 0 : L.rightEdge - fs * 0.4;
      o.push(`<text x="${r(tx)}" y="${r(t.y + fs * 1.75)}" font-family='${mono}' font-size="${r(L.metaSize)}" fill="${P.blue}" letter-spacing="0.04em">${esc(t.label.toLowerCase())}${t.more ? `  (+${t.more} more in the list)` : ""}</text>`);
    }
  }
  // Streams, then the student's own strand on top.
  for (const s of L.strands) o.push(`<path d="${s.d}" fill="none" stroke="${s.done ? P.green : P.blue}" stroke-width="${s.gate ? 2.4 : 1.1}" stroke-linejoin="round"/>`);
  o.push(`<path d="${L.own.d}" fill="none" stroke="${P.blue}" stroke-width="2.4"/>`);
  for (const d of L.dots) o.push(`<circle cx="${r(d.x)}" cy="${r(d.y)}" r="${r(d.r)}" fill="${d.done ? P.green : d.gate ? P.blue : P.sage}" stroke="${d.done ? P.green : P.blue}" stroke-width="1.5"/>`);
  // Source: a ring and a dot.
  o.push(`<circle cx="${r(L.source.x)}" cy="${r(L.source.y)}" r="${r(L.source.r * 1.9)}" fill="${P.sage}" stroke="${P.blue}" stroke-width="1.5"/><circle cx="${r(L.source.x)}" cy="${r(L.source.y)}" r="${r(L.source.r * 0.8)}" fill="${P.green}"/>`);
  // Mouth: the strands end on a bar; one line carries on to the outcome.
  const m = L.mouth;
  o.push(`<line x1="${r(m.x0 - 4)}" x2="${r(m.x1 + 4)}" y1="${r(m.y)}" y2="${r(m.y)}" stroke="${P.blue}" stroke-width="2.4" stroke-linecap="square"/>`);
  o.push(`<line x1="${r(m.cx)}" x2="${r(m.cx)}" y1="${r(m.y)}" y2="${r(m.dotY)}" stroke="${P.blue}" stroke-width="2.4"/><circle cx="${r(m.cx)}" cy="${r(m.dotY)}" r="${r(m.r)}" fill="${P.blue}"/>`);
  if (text) {
    o.push(`<text x="${r(L.source.textX)}" y="${r(L.source.textY + L.metaSize * 0.35)}" font-family='${mono}' font-size="${r(L.metaSize)}" fill="${P.blue}" letter-spacing="0.04em">${esc(L.source.label.toLowerCase())}</text>`);
    for (const l of L.labels) {
      const anchor = l.align === "right" ? "end" : "start";
      l.lines.forEach((ln, i) => o.push(`<text x="${r(l.x)}" y="${r(l.y + L.lineHeight * (i + 0.78))}" text-anchor="${anchor}" font-family='${display}' font-size="${r(fs)}" fill="${P.blue}">${esc(ln)}</text>`));
      o.push(`<text x="${r(l.x)}" y="${r(l.y + L.lineHeight * l.lines.length + L.metaSize * 1.05)}" text-anchor="${anchor}" font-family='${mono}' font-size="${r(L.metaSize)}" fill="${P.blue}">${esc(l.done ? "done" : l.meta)}</text>`);
    }
    m.lines.forEach((ln, i) => o.push(`<text x="${r(m.textX)}" y="${r(m.textY + i * m.fs * 1.25)}" text-anchor="${m.align === "middle" ? "middle" : "start"}" font-family='${display}' font-size="${r(m.fs)}" font-weight="700" fill="${P.blue}">${esc(ln)}</text>`));
  }
  o.push("</svg>");
  return o.join("");
}
