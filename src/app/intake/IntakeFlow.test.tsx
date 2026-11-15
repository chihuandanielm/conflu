import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IntakeFlow, INTAKE_KEY } from "./IntakeFlow.tsx";

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
    expect(heading()).toBe("What's your major?");
  });

  it("goes back with Escape and saves progress to localStorage", async () => {
    render(<IntakeFlow onBuild={() => {}} startAt="status" />);
    fireEvent.keyDown(window, { key: "1" }); advance(); await act(async () => {});
    expect(heading()).toBe("What's your major?");
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
    expect(heading()).toBe("What year are you in?");
    expect(JSON.parse(localStorage.getItem(INTAKE_KEY)!).answers.majorId).toBe("nursing");
  });

  it("explains optional questions and lets students skip them", async () => {
    render(<IntakeFlow onBuild={() => {}} startAt="citizenship" />);
    expect(screen.getByText(/Only used to hide programs you legally can't apply to/)).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Prefer not to say" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Skip" })); await act(async () => {});
    expect(heading()).toBe("Anything else we should know?");
    expect(screen.getByText(/never remove anything, and they never leave your browser/)).toBeInTheDocument();
  });
});
