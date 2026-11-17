// Colour and contrast rules (design/DESIGN.md §2), read from the tokens in styles.css and the class names in the app.
// Four colours exist. Only blue on sage and sage on blue may carry text, at 4.4:1 or better (blue on sage is 4.47:1;
// the design keeps sentences at 17px or larger and facts at 13px mono because of it).
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

const FOUR = { sage: "#E0E7DA", blue: "#466995", green: "#00A37D", sand: "#E6B989" };
const FLOOR = 4.4;

const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : /\.tsx$/.test(f) && !/\.test\.tsx$/.test(f) ? [p] : [];
});
const source = files(__dirname).map((p) => ({ p, s: readFileSync(p, "utf8") }));
/** Every JSX opening tag that uses a class. */
const tags = source.flatMap(({ p, s }) => [...s.matchAll(/<[A-Za-z][\w.]*\s[^<>]*?className=[^<>]*?>/g)].map((m) => ({ p, tag: m[0] })));

describe("colour (DESIGN.md §2)", () => {
  it("scans the whole app", () => { expect(tags.length).toBeGreaterThan(100); });

  it("defines exactly the four colours, in :root and in the Tailwind theme", () => {
    for (const [name, hex] of Object.entries(FOUR)) expect(token(name).toUpperCase()).toBe(hex);
    const hexes = new Set([...css.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toUpperCase()));
    expect([...hexes].sort()).toEqual(Object.values(FOUR).sort());
    expect(css).toMatch(/--color-\*:\s*initial/); // Tailwind's default palette is off
    expect(css).not.toMatch(/rgba?\(|hsla?\(|oklch\(|box-shadow/);
  });

  it.each([["blue", "sage"], ["sage", "blue"]])("%s text on %s is at least 4.4:1", (fg, bg) => {
    expect(ratio(token(fg), token(bg))).toBeGreaterThanOrEqual(FLOOR);
  });

  it("no other pair is dark enough to carry text, so none may", () => {
    for (const [fg, bg] of [["sand", "sage"], ["green", "sage"], ["sand", "blue"], ["green", "blue"]]) expect(ratio(token(fg), token(bg))).toBeLessThan(FLOOR);
  });

  it("never sets words in sand or green: green and sand classes only on decorative marks", () => {
    const bad = tags.filter(({ tag }) => /(?<![\w-])text-(sand|green)\b/.test(tag) && !/aria-hidden/.test(tag));
    expect(bad.map((b) => `${b.p}: ${b.tag.slice(0, 120)}`)).toEqual([]);
  });

  it("uses no opacity tints, arbitrary colours, or shadows in class names", () => {
    const bad = tags.filter(({ tag }) => /(?<![\w-])(bg|text|border|fill|stroke)-(sage|blue|green|sand)\/\d+|(?<![\w-])(bg|text|border)-\[#|(?<![\w-])shadow-|opacity-\d/.test(tag));
    expect(bad.map((b) => `${b.p}: ${b.tag.slice(0, 120)}`)).toEqual([]);
  });

  it("never puts green behind or around anything except a done mark or the progress gauge", () => {
    const allowed = /ProgressBar|Competencies|dot/;
    const bad = tags.filter(({ p, tag }) => /(?<![\w-])(bg|border)-green\b/.test(tag) && !allowed.test(p) && !/aria-hidden/.test(tag));
    expect(bad.map((b) => `${b.p}: ${b.tag.slice(0, 120)}`)).toEqual([]);
  });
});
