import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IntakeFlow, INTAKE_KEY } from "./IntakeFlow.tsx";
import { emptyAnswers } from "./model.ts";

const heading = () => screen.getByRole("heading", { level: 1 }).textContent;
const advance = () => act(() => { vi.advanceTimersByTime(300); });

describe("IntakeFlow", () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("starts on the intro and says it's a general trajectory", () => {
    render(<IntakeFlow onBuild={() => {}} />);
    expect(screen.getByText(/general trajectory, not a blueprint/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
  });

  it("only enables college students, and number keys pick and auto-advance", async () => {
    render(<IntakeFlow onBuild={() => {}} startAt="status" />);
    expect(screen.getByRole("radio", { name: /Recent graduate/ })).toBeDisabled();
    expect(screen.getAllByText("Coming soon")).toHaveLength(3);
    fireEvent.keyDown(window, { key: "1" });
    expect(screen.getByRole("radio", { name: /College student/ })).toHaveAttribute("aria-checked", "true");
    advance(); await act(async () => {});
    expect(heading()).toBe("Which Rutgers campus are you at?");
  });

  it("goes back with Escape and saves progress to localStorage", async () => {
    render(<IntakeFlow onBuild={() => {}} startAt="status" />);
    fireEvent.keyDown(window, { key: "1" }); advance(); await act(async () => {});
    expect(heading()).toBe("Which Rutgers campus are you at?");
    fireEvent.keyDown(window, { key: "Escape" }); await act(async () => {});
    expect(heading()).toBe("Where are you right now?");
    expect(JSON.parse(localStorage.getItem(INTAKE_KEY)!).answers.status).toBe("college-student");
  });

  it("picks a major from the search box with Enter", async () => {
    render(<IntakeFlow onBuild={() => {}} startAt="major" />);
    const box = screen.getByRole("searchbox", { name: "Search majors" });
    fireEvent.change(box, { target: { value: "nurs" } });
    expect(screen.getAllByRole("radio")).toHaveLength(1);
    fireEvent.keyDown(box, { key: "Enter" }); advance(); await act(async () => {});
    expect(heading()).toBe("Where are you in school?");
    expect(JSON.parse(localStorage.getItem(INTAKE_KEY)!).answers.majorId).toBe("nursing");
  });

  it("asks the campus before the major and lists only that campus's majors", async () => {
    render(<IntakeFlow onBuild={() => {}} startAt="school" />);
    expect(screen.queryByRole("button", { name: "Skip" })).toBeNull(); // the campus decides the majors, so it's required
    fireEvent.click(screen.getByRole("radio", { name: "Rutgers–Camden" })); advance(); await act(async () => {});
    expect(heading()).toBe("What's your major?");
    const names = screen.getAllByRole("radio").map((r) => r.textContent);
    expect(names).toContain("Human Resource Management");
    expect(names).not.toContain("Pharmacy");
    expect(names).not.toContain("Packaging Engineering");
    fireEvent.change(screen.getByRole("searchbox", { name: "Search majors" }), { target: { value: "pharm" } });
    expect(screen.getByText("No majors match. This version covers 12 majors offered at Rutgers–Camden.")).toBeInTheDocument();
  });

  it("clears a major the new campus doesn't offer", async () => {
    render(<IntakeFlow onBuild={() => {}} startAt="school"
      initialAnswers={{ ...emptyAnswers(), status: "college-student", school: "rutgers-nb", majorId: "pharmacy", openToCoop: true }} />);
    fireEvent.click(screen.getByRole("radio", { name: "Rutgers–Newark" })); advance(); await act(async () => {});
    const saved = JSON.parse(localStorage.getItem(INTAKE_KEY)!).answers;
    expect(saved.school).toBe("rutgers-newark");
    expect(saved.majorId).toBeUndefined();
    expect(saved.openToCoop).toBeUndefined();
  });

  it("asks full-time or part-time right after the year, and asks for hours outside class", async () => {
    render(<IntakeFlow onBuild={() => {}} startAt="year" />);
    expect(screen.getByText(/matches your credits so far/)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Third year, spring semester/ })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "6" }); advance(); await act(async () => {}); // third year, spring
    expect(JSON.parse(localStorage.getItem(INTAKE_KEY)!).answers).toMatchObject({ year: 3, semester: 2, yearTerm: "3S" });
    expect(heading()).toBe("Are you a full-time or part-time student?");
    expect(screen.queryByRole("button", { name: "Skip" })).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: /Part-time/ })); advance(); await act(async () => {});
    expect(JSON.parse(localStorage.getItem(INTAKE_KEY)!).answers.enrollment).toBe("part-time");
    expect(heading()).toBe("Where do you want to end up?");
  });

  it("explains optional questions and lets students skip them", async () => {
    render(<IntakeFlow onBuild={() => {}} startAt="citizenship" />);
    expect(screen.getByText(/Only used to hide programs you legally can't apply to/)).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Prefer not to say" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Skip" })); await act(async () => {});
    expect(heading()).toBe("What's your gender?");
    expect(screen.getByText(/never part of a share link/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Skip" })); await act(async () => {});
    expect(heading()).toBe("Anything else we should know?");
    expect(screen.getByText(/never remove anything, and they never leave your browser/)).toBeInTheDocument();
  });
});
