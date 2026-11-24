import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.tsx";
import { INTAKE_KEY } from "./intake/IntakeFlow.tsx";
import { emptyAnswers } from "./intake/model.ts";
import { createSaved, persist, PLAN_KEY } from "./state/plan.ts";
import { SAMPLE_ANSWERS } from "./state/sample.ts";

/** Leaving the landing: the words fade, then the next screen fades in. */
const leave = async () => { for (let i = 0; i < 4; i++) { act(() => { vi.advanceTimersByTime(500); }); await act(async () => {}); } };
const h1 = () => screen.getByRole("heading", { level: 1 }).textContent;
const sampleButton = () => screen.getByRole("button", { name: /^(See a|Hide the) sample plan/ });
const open = async () => { fireEvent.click(sampleButton()); await act(async () => {}); return screen.getByRole("region", { name: "Sample plan" }); };

describe("See a sample plan (the landing, expanded in place)", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("expands a full plan for a made-up student under the hero, on the landing, and says nothing is saved", async () => {
    render(<App />);
    expect(screen.queryByRole("region", { name: "Sample plan" })).toBeNull();
    const region = await open();
    // Still the landing: its headline stays the page's one h1; the sample's title is an h2.
    expect(h1()).toBe("Know what to do now.");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(within(region).getByRole("heading", { level: 2, name: "sample plan Land your first role in software engineering" })).toBeInTheDocument();
    expect(sampleButton()).toHaveAttribute("aria-expanded", "true");
    expect(sampleButton().textContent).toMatch(/^Hide the sample plan/);
    const note = within(region).getByRole("note", { name: "Sample plan" });
    expect(note.textContent).toMatch(/This is a sample plan for a computer science sophomore at Rutgers–New Brunswick/);
    expect(note.textContent).toMatch(/nothing is saved/);
    expect(within(region).getByRole("heading", { name: "Do this now" })).toBeInTheDocument();
    expect(within(region).getByTestId("standing").textContent).toMatch(/of your 5 free hours a week|Nothing planned/);
  });

  it("is fully interactive (a goal's drawer, mark done, the hours, the tabs), and nothing reaches storage", async () => {
    render(<App />);
    const region = await open();
    const sem = within(region).getByRole("heading", { name: "This semester" }).closest("section")!;
    fireEvent.click(within(sem).getAllByRole("button")[0]); await act(async () => {});
    fireEvent.click(within(screen.getByRole("dialog")).getAllByRole("checkbox")[0]); await act(async () => {});
    expect(within(screen.getByRole("dialog")).getByText(/^1 of \d+ done/)).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Mark as done" })); await act(async () => {});
    expect(within(region).getByRole("heading", { name: "Checked off" })).toBeInTheDocument();
    fireEvent.change(within(region).getByLabelText("Free hours a week:"), { target: { value: "10" } }); await act(async () => {});
    expect(within(region).getByTestId("standing").textContent).toMatch(/of your 10 free hours a week|Nothing planned/);
    for (const t of ["Map", "Resources", "Courses"]) {
      fireEvent.click(within(region).getByRole("tab", { name: new RegExp(`^${t}`) })); await act(async () => {});
      expect(within(region).getByRole("tab", { name: new RegExp(`^${t}`) })).toHaveAttribute("aria-selected", "true");
    }
    // Nothing at all: no plan, no answers, no step ticks, no course ticks.
    expect(localStorage.getItem(PLAN_KEY)).toBeNull();
    expect(localStorage.getItem(INTAKE_KEY)).toBeNull();
    expect(localStorage.getItem("cpm.steps.v1")).toBeNull();
    expect(localStorage.getItem("cpm.courses.v1")).toBeNull();
  });

  it("folds away again with the same button", async () => {
    render(<App />);
    await open();
    fireEvent.click(sampleButton()); await act(async () => {});
    expect(screen.queryByRole("region", { name: "Sample plan" })).toBeNull();
    expect(sampleButton()).toHaveAttribute("aria-expanded", "false");
  });

  it("Build my own plan leaves for the questions; Edit answers opens the review filled with the sample's answers", async () => {
    const { unmount } = render(<App />);
    let region = await open();
    fireEvent.click(within(within(region).getByRole("note", { name: "Sample plan" })).getByRole("button", { name: /^Build my own plan/ })); await leave();
    expect(h1()).toBe("What do you study?");
    unmount(); localStorage.clear();

    render(<App />);
    region = await open();
    fireEvent.click(within(region).getByRole("button", { name: "Edit answers" })); await act(async () => {});
    expect(h1()).toBe("Check your answers");
    expect(screen.getByText("Computer Science")).toBeInTheDocument();
  });

  it("never replaces a student's own saved plan", async () => {
    const own = createSaved({ ...emptyAnswers(), status: "college-student", majorId: "nursing", year: 3, semester: 2, yearTerm: "3S", enrollment: "full-time",
      trackId: "nursing-clinical", horizon: "graduation", summer: "full", school: "rutgers-nb", location: "nj" }, "2026-11-15");
    persist(own);
    const before = localStorage.getItem(PLAN_KEY);
    render(<App />);
    const region = await open();
    const sem = within(region).getByRole("heading", { name: "This semester" }).closest("section")!;
    fireEvent.click(within(sem).getAllByRole("button")[0]); await act(async () => {});
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Mark as done" })); await act(async () => {});
    expect(localStorage.getItem(PLAN_KEY)).toBe(before);
  });

  it("is a real student's answers: every required question is answered", () => {
    for (const k of ["status", "majorId", "year", "semester", "trackId", "horizon", "school", "summer"] as const) expect(SAMPLE_ANSWERS[k]).toBeTruthy();
  });
});
