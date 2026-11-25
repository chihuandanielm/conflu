import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";

// Motion reads prefers-reduced-motion once per page, so this file sets it before anything renders.
window.matchMedia = ((q: string) => ({ matches: q.includes("reduce"), media: q, onchange: null,
  addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false })) as typeof window.matchMedia;

describe("How it works, with reduced motion", () => {
  it("with reduced motion pins nothing and shows every step finished", () => {
    const { container } = render(<App />);
    for (const n of [1, 2, 3, 4]) {
      const step = container.querySelector<HTMLElement>(`[data-story-step="${n}"]`)!;
      expect(step.className).not.toMatch(/svh/);
      expect(step.querySelector(".sticky")).toBeNull();
    }
    const intake = container.querySelector<HTMLElement>('[data-story-step="1"] [inert]')!;
    expect(within(intake).getAllByRole("radio", { checked: true, hidden: true }).map((r) => r.textContent)).toEqual(["Rutgers–New Brunswick", "Software engineering", "5 hours a week outside class"]);
    const ticks = container.querySelectorAll<HTMLInputElement>('[data-story-step="4"] input.tick');
    expect(ticks.length).toBeGreaterThan(1);
    for (const t of ticks) expect(t.checked).toBe(true);
    expect(container.querySelector('[data-story-step="4"]')!.textContent).toMatch(new RegExp(`${ticks.length} of ${ticks.length} done`));
  });

});
