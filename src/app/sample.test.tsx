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

describe("See a sample plan (the landing)", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("opens a finished plan for a made-up student, says so, saves nothing, and Build my own plan starts the questions", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^See a sample plan/ })); await leave();
    const note = screen.getByRole("note", { name: "Sample plan" });
    expect(note.textContent).toMatch(/This is a sample plan for a computer science sophomore at Rutgers–New Brunswick/);
    expect(note.textContent).toMatch(/nothing is saved/);
    expect(h1()).toBe("your plan Land your first role in software engineering");
    expect(screen.getByRole("heading", { name: "Do this now" })).toBeInTheDocument();
    expect(screen.getByTestId("standing").textContent).toMatch(/of your 5 free hours a week|Nothing planned/);

    // It works like a real plan (mark a goal done), but nothing reaches storage.
    const sem = screen.getByRole("heading", { name: "This semester" }).closest("section")!;
    fireEvent.click(within(sem).getAllByRole("button")[0]); await act(async () => {});
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Mark as done" })); await act(async () => {});
    expect(screen.getByRole("heading", { name: "Checked off" })).toBeInTheDocument();
    expect(localStorage.getItem(PLAN_KEY)).toBeNull();
    expect(localStorage.getItem(INTAKE_KEY)).toBeNull();

    fireEvent.click(within(note).getByRole("button", { name: /^Build my own plan/ })); await leave();
    expect(h1()).toBe("What do you study?");
  });

  it("never replaces a student's own saved plan", async () => {
    const own = createSaved({ ...emptyAnswers(), status: "college-student", majorId: "nursing", year: 3, semester: 2, yearTerm: "3S", enrollment: "full-time",
      trackId: "nursing-clinical", horizon: "graduation", summer: "full", school: "rutgers-nb", location: "nj" }, "2026-11-15");
    persist(own);
    const before = localStorage.getItem(PLAN_KEY);
    render(<App />);
    expect(screen.getAllByRole("button", { name: /^Continue your plan/ }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /^See a sample plan/ })); await leave();
    expect(screen.getByRole("note", { name: "Sample plan" }).textContent).toMatch(/sample plan/);
    expect(localStorage.getItem(PLAN_KEY)).toBe(before);
  });

  it("is a real student's answers: every required question is answered", () => {
    for (const k of ["status", "majorId", "year", "semester", "trackId", "horizon", "school", "summer"] as const) expect(SAMPLE_ANSWERS[k]).toBeTruthy();
  });
});
