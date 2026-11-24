// Colour and contrast rules (design/DESIGN.md §2), read from the tokens in styles.css and the class names in the app.
// Field guide palette: bone paper (sage), warm charcoal for sentences (ink) and structure (blue), and three accents with
// one job each: violet for your picks and links, the ochre fill (sand) and line (ochre) for "look here first", green
// (verdigris) for done. Sentences reach 7:1 (WCAG AAA) on paper and on the ochre fill; anything interactive reaches 4.5:1.
// Nothing is ever set under 15px.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "styles.css"), "utf8");
const token = (name: string) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))![1];
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const PALETTE = { sage: "#E8E3D7", ink: "#34302C", blue: "#34302C", violet: "#545684", sand: "#E2C38A", ochre: "#96773D", green: "#356B61", umber: "#2B2420" };
const AAA = 7, AA = 4.5;

const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : /\.tsx$/.test(f) && !/\.test\.tsx$/.test(f) ? [p] : [];
});
const source = files(__dirname).map((p) => ({ p, s: readFileSync(p, "utf8") }));
/** Every JSX opening tag that uses a class. */
const tags = source.flatMap(({ p, s }) => [...s.matchAll(/<[A-Za-z][\w.]*\s[^<>]*?className=[^<>]*?>/g)].map((m) => ({ p, tag: m[0] })));

describe("colour (DESIGN.md §2)", () => {
  it("scans the whole app", () => { expect(tags.length).toBeGreaterThan(100); });

  it("defines exactly the palette, in :root and in the Tailwind theme", () => {
    for (const [name, hex] of Object.entries(PALETTE)) expect(token(name).toUpperCase()).toBe(hex);
    for (const [name, hex] of Object.entries(PALETTE)) expect(css).toContain(`--color-${name}: ${hex}`);
    const hexes = new Set([...css.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toUpperCase()));
    expect([...hexes].sort()).toEqual([...new Set(Object.values(PALETTE))].sort());
    expect(css).toMatch(/--color-\*:\s*initial/); // Tailwind's default palette is off
    expect(css).not.toMatch(/rgba?\(|hsla?\(|oklch\(|box-shadow/);
  });

  it("sets sentences in ink, at 7:1 or better on sage and on sand (WCAG AAA)", () => {
    expect(css).toMatch(/body\s*\{[^}]*color:\s*var\(--ink\)/);
    expect(ratio(token("ink"), token("sage"))).toBeGreaterThanOrEqual(AAA);
    expect(ratio(token("ink"), token("sand"))).toBeGreaterThanOrEqual(AAA);
  });

  it("inside the landing's umber window, paper-coloured words reach 7:1", () => {
    expect(ratio(token("sage"), token("umber"))).toBeGreaterThanOrEqual(AAA);
  });

  it.each([["blue", "sage"], ["sage", "blue"], ["violet", "sage"], ["sage", "violet"], ["sage", "green"]])("%s on %s (headings, buttons, your picks, links, done labels) is at least 4.5:1", (fg, bg) => {
    expect(ratio(token(fg), token(bg))).toBeGreaterThanOrEqual(AA);
  });

  it("the ochre line and the done green stand apart from the paper as marks (3:1, non-text)", () => {
    expect(ratio(token("ochre"), token("sage"))).toBeGreaterThanOrEqual(3);
    expect(ratio(token("green"), token("sage"))).toBeGreaterThanOrEqual(3);
  });

  it("the accents that can't carry words on paper never do", () => {
    for (const [fg, bg] of [["sand", "sage"], ["ochre", "sage"]]) expect(ratio(token(fg), token(bg))).toBeLessThan(AA);
  });

  it("never sets words in sand, ochre or green: those classes only on fills and decorative marks", () => {
    const bad = tags.filter(({ tag }) => /(?<![\w-])text-(sand|ochre|green)\b/.test(tag) && !/aria-hidden/.test(tag));
    expect(bad.map((b) => `${b.p}: ${b.tag.slice(0, 120)}`)).toEqual([]);
  });

  it("puts only paper-coloured text on a violet or green fill", () => {
    const bad = tags.filter(({ tag }) => /(?<![\w-])bg-(violet|green)\b/.test(tag) && !/(?<![\w-])text-sage\b/.test(tag) && !/aria-hidden/.test(tag) && !/\bdot\b/.test(tag));
    expect(bad.map((b) => `${b.p}: ${b.tag.slice(0, 120)}`)).toEqual([]);
  });

  it("puts only ink text on a sand fill", () => {
    const bad = tags.filter(({ tag }) => /(?<![\w-])bg-sand\b/.test(tag) && !/(?<![\w-])text-ink\b/.test(tag) && !/aria-hidden/.test(tag));
    expect(bad.map((b) => `${b.p}: ${b.tag.slice(0, 120)}`)).toEqual([]);
  });

  it("uses no opacity tints, arbitrary colours, or shadows in class names (fading fully in or out is motion, and allowed)", () => {
    const bad = tags.filter(({ tag }) => /(?<![\w-])(bg|text|border|fill|stroke)-(sage|ink|blue|violet|green|sand|ochre|umber)\/\d+|(?<![\w-])(bg|text|border)-\[#|(?<![\w-])shadow-|(?<![\w-])opacity-(?!0\b|100\b)\d/.test(tag));
    expect(bad.map((b) => `${b.p}: ${b.tag.slice(0, 120)}`)).toEqual([]);
  });

  it("never puts green behind or around anything except a done mark, the on-track counter, a progress gauge, or 'Done when'", () => {
    // GoalDrawer: the steps' progress bar and the green bar beside "Done when" (green means done, DESIGN.md §2).
    const allowed = /ProgressBar|Competencies|OnTrack|GoalDrawer|dot/;
    const bad = tags.filter(({ p, tag }) => /(?<![\w-])(bg|border)-green\b/.test(tag) && !allowed.test(p) && !/aria-hidden/.test(tag));
    expect(bad.map((b) => `${b.p}: ${b.tag.slice(0, 120)}`)).toEqual([]);
  });
});

describe("type (DESIGN.md §3)", () => {
  it("sets headings, titles and labels in bold Barlow Semi Condensed, self-hosted, and sentences in Quantico", () => {
    expect(css).toMatch(/@import "@fontsource\/barlow-semi-condensed\/latin-700\.css"/);
    expect(css).toMatch(/h1, h2, h3 \{[^}]*font-family: var\(--font-display\);[^}]*font-weight: 700/);
    expect(css).toMatch(/\.title, \.label \{[^}]*font-family: var\(--font-display\);[^}]*font-weight: 600/);
    expect(css).toMatch(/body \{[^}]*font-family: var\(--font-text\)/);
    expect(css).not.toMatch(/fonts\.googleapis|fonts\.gstatic/);
  });

  const rem = (name: string) => parseFloat(css.match(new RegExp(`--text-${name}:\\s*([\\d.]+)rem`))![1]) * 16;
  it("sets nothing under 15px", () => {
    for (const t of ["fact", "small", "body", "lead"]) expect(rem(t), t).toBeGreaterThanOrEqual(15);
    const tiny = tags.filter(({ tag }) => /text-\[(\d+(?:\.\d+)?)px\]/.test(tag) && parseFloat(tag.match(/text-\[(\d+(?:\.\d+)?)px\]/)![1]) < 15);
    expect(tiny.map((b) => `${b.p}: ${b.tag.slice(0, 120)}`)).toEqual([]);
  });
});
