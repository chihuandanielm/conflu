// Colour and contrast rules (design/DESIGN.md §2), read from the tokens in styles.css and the class names in the app.
// Sage paper, three inks and one text colour. Sentences are ink: ink on sage and ink on sand must reach 7:1 (WCAG AAA).
// Blue is for headings, links, buttons and tabs (large or interactive): blue on sage and sage on blue reach 4.5:1 (AA),
// as does ink on a green fill (a done or on-track label). Nothing is ever set under 15px.
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

const FIVE = { sage: "#E0E7DA", ink: "#1A1F24", blue: "#456894", green: "#00A37D", sand: "#E6B989" };
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

  it("defines exactly the five colours, in :root and in the Tailwind theme", () => {
    for (const [name, hex] of Object.entries(FIVE)) expect(token(name).toUpperCase()).toBe(hex);
    const hexes = new Set([...css.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toUpperCase()));
    expect([...hexes].sort()).toEqual(Object.values(FIVE).sort());
    expect(css).toMatch(/--color-\*:\s*initial/); // Tailwind's default palette is off
    expect(css).not.toMatch(/rgba?\(|hsla?\(|oklch\(|box-shadow/);
  });

  it("sets sentences in ink, at 7:1 or better on sage and on sand (WCAG AAA)", () => {
    expect(css).toMatch(/body\s*\{[^}]*color:\s*var\(--ink\)/);
    expect(ratio(token("ink"), token("sage"))).toBeGreaterThanOrEqual(AAA);
    expect(ratio(token("ink"), token("sand"))).toBeGreaterThanOrEqual(AAA);
  });

  it.each([["blue", "sage"], ["sage", "blue"], ["ink", "green"]])("%s on %s (headings, links, buttons, done labels) is at least 4.5:1", (fg, bg) => {
    expect(ratio(token(fg), token(bg))).toBeGreaterThanOrEqual(AA);
  });

  it("no other pair is dark enough to carry text, so none may", () => {
    for (const [fg, bg] of [["sand", "sage"], ["green", "sage"], ["sand", "blue"], ["green", "blue"]]) expect(ratio(token(fg), token(bg))).toBeLessThan(AA);
  });

  it("never sets words in sand or green: green and sand classes only on decorative marks", () => {
    const bad = tags.filter(({ tag }) => /(?<![\w-])text-(sand|green)\b/.test(tag) && !/aria-hidden/.test(tag));
    expect(bad.map((b) => `${b.p}: ${b.tag.slice(0, 120)}`)).toEqual([]);
  });

  it("puts only ink text on a sand fill", () => {
    const bad = tags.filter(({ tag }) => /(?<![\w-])bg-sand\b/.test(tag) && !/(?<![\w-])text-ink\b/.test(tag) && !/aria-hidden/.test(tag));
    expect(bad.map((b) => `${b.p}: ${b.tag.slice(0, 120)}`)).toEqual([]);
  });

  it("uses no opacity tints, arbitrary colours, or shadows in class names (fading fully in or out is motion, and allowed)", () => {
    const bad = tags.filter(({ tag }) => /(?<![\w-])(bg|text|border|fill|stroke)-(sage|ink|blue|green|sand)\/\d+|(?<![\w-])(bg|text|border)-\[#|(?<![\w-])shadow-|(?<![\w-])opacity-(?!0\b|100\b)\d/.test(tag));
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
