// WCAG AA check for every text/background pair the UI uses, read from the design tokens in styles.css.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "styles.css"), "utf8");
const token = (name: string) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))![1];
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const lanes = ["foundation", "presence", "skills", "experience", "network", "credentials", "academics", "applications"].map((l) => `lane-${l}`);
const pairs: [string, string, number][] = [
  ...["bg", "surface", "blue-tint", "green-tint", "amber-tint", ...lanes].flatMap((bg) => [["ink", bg, 4.5], ["muted", bg, 4.5]] as [string, string, number][]),
  ["blue", "bg", 4.5], ["blue", "surface", 4.5], ["blue", "blue-tint", 4.5],
  ["green", "bg", 4.5], ["green", "green-tint", 4.5], ["amber", "bg", 4.5], ["amber", "amber-tint", 3], // amber on its tint: icons and borders only (3:1); text there is ink
  ["bg", "blue", 4.5], ["bg", "blue-hover", 4.5],
  ["blue", "bg", 3], ["border-strong", "bg", 1.5],
];

describe("color contrast (WCAG 2.2 AA)", () => {
  it.each(pairs)("%s on %s ≥ %s:1", (fg, bg, min) => {
    expect(ratio(token(fg), token(bg))).toBeGreaterThanOrEqual(min);
  });
});
