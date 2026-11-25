import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { SAMPLE_ANSWERS } from "../../state/sample.ts";

const story = () => screen.getByRole("region", { name: "How it works" });
const STEPS = [
  ["Tell it where you are", "Your campus, major, year, the career you want, and your free time. About 3 minutes, no account, and it works for other schools too."],
  ["Get what to do now", "This semester's goals, sized to your free hours, with one thing to do first and where to go for it."],
  ["See the whole path", "Every goal joins the river in the semester it starts, all the way to your goal."],
  ["Do it, one step at a time", "Every goal breaks into small steps, from real guides. Tick them off as you go."],
];

describe("How it works (the landing's story, docs/STORY_DESIGN.md)", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it("walks one student through four steps in plain words, then the finished plan and the button", () => {
    render(<App />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(within(story()).getByRole("heading", { level: 2, name: "How it works" })).toBeInTheDocument();
    expect(within(story()).getByText("One student, from the first question to a finished plan.")).toBeInTheDocument();
    const h3 = within(story()).getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(h3).toEqual([...STEPS.map(([t]) => t), "Your plan, start to finish"]);
    for (const [, text] of STEPS) expect(within(story()).getByText(text)).toBeInTheDocument();
    expect(within(story()).getByText(/^Every semester to graduation, with the places to go, a map, resources and your major's courses\. This one is the sample student's\.$/)).toBeInTheDocument();
    expect(within(story()).getByRole("button", { name: /^Build my plan/ })).toBeInTheDocument();
    // The old in-place sample is gone.
    expect(screen.queryByRole("button", { name: /sample plan/ })).toBeNull();
    expect(screen.queryByRole("region", { name: "Sample plan" })).toBeNull();
  });

  it("shows the real screens frozen: hidden from assistive tech, inert, and each step's caption says what it shows", () => {
    const { container } = render(<App />);
    const frozen = story().querySelectorAll("[inert]");
    expect(frozen.length).toBe(5);
    for (const el of frozen) expect(el.closest("[aria-hidden=true]")).not.toBeNull();
    // The real components are inside: the campus question, Do this now, the map, a goal's steps, the whole results page.
    const all = [...frozen].map((el) => el.textContent).join(" ");
    for (const s of ["Rutgers–New Brunswick", "Do this now", "Land your first role in software engineering", "What to do", "Resources"]) expect(all).toContain(s);
    // Only the skip link and the button can be reached: nothing in a frozen screen is a control for anyone.
    expect(within(story()).getAllByRole("button").map((b) => b.textContent)).toEqual([expect.stringMatching(/^Skip to the finished plan/), expect.stringMatching(/^Build my plan/)]);
    expect(within(story()).queryAllByRole("link")).toHaveLength(0);
    for (const n of [1, 2, 3, 4]) expect(container.querySelector(`[data-story-step="${n}"] .sr-only`)!.textContent).toMatch(/^Beside it is a picture of /);
  });

  it("starts unplayed and pinned: each step is a tall section the screen stays pinned in", () => {
    const { container } = render(<App />);
    const step = container.querySelector<HTMLElement>('[data-story-step="1"]')!;
    expect(step.className).toMatch(/h-\[230svh\]/);
    expect(step.querySelector(".sticky")).not.toBeNull();
    // Nothing picked yet: the campus question waits for the scroll.
    expect(within(step.querySelector("[inert]") as HTMLElement).queryAllByRole("radio", { checked: true, hidden: true })).toHaveLength(0);
  });

  it("Skip to the finished plan moves focus to the end of the story", async () => {
    render(<App />);
    fireEvent.click(within(story()).getByRole("button", { name: /^Skip to the finished plan/ })); await act(async () => {});
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 3, name: "Your plan, start to finish" }));
  });

  it("saves nothing: the sample lives in memory only", () => {
    render(<App />);
    for (const k of ["cpm.plan.v1", "cpm.intake.v1", "cpm.steps.v1", "cpm.courses.v1"]) expect(localStorage.getItem(k)).toBeNull();
  });

  it("ends the landing with Privacy and data, and links nowhere off the site", () => {
    render(<App />);
    const privacy = screen.getByText("Privacy and data").closest("details")!;
    for (const s of ["No cookies from this site", "No tracking or analytics", "No accounts"]) expect(within(privacy).getByText(s)).toBeInTheDocument();
    expect(privacy.querySelector('a[href*="github.com"]')).toBeNull();
  });

  it("is a real student's answers: every required question is answered", () => {
    for (const k of ["status", "majorId", "year", "semester", "trackId", "horizon", "school", "summer"] as const) expect(SAMPLE_ANSWERS[k]).toBeTruthy();
  });
});
