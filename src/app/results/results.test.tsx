import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { emptyAnswers, type Answers } from "../intake/model.ts";
import { createSaved, type SavedPlan } from "../state/plan.ts";
import { dataset } from "../data/dataset.ts";
import { noticeTone } from "./Notices.tsx";
import { ResultsPage } from "./ResultsPage.tsx";

const cs: Answers = { ...emptyAnswers(), status: "college-student", majorId: "computer-science", year: 2, trackId: "software-engineering",
  horizon: "graduation", summer: "full", school: "rutgers-nb", location: "nj" };

function setup(s = createSaved(cs, "2026-11-15")) {
  let current: SavedPlan = s;
  const onChange = vi.fn((n: SavedPlan) => { current = n; view.rerender(<ResultsPage saved={current} onChange={onChange} onEdit={() => {}} onStartOver={() => {}} />); });
  const view = render(<ResultsPage saved={current} onChange={onChange} onEdit={() => {}} onStartOver={() => {}} />);
  return { onChange, get: () => current };
}

describe("results page", () => {
  it("reads top to bottom: goal, what you have and need, one first step, this semester, coming up", () => {
    setup(createSaved({ ...cs, semester: 1, yearTerm: "2F", experience: ["resume", "club"], skills: ["python"] }, "2026-11-15"));
    expect(screen.getByRole("heading", { level: 1, name: "Your plan" })).toBeInTheDocument();
    expect(screen.getByText("Software engineering · Computer Science · Second year, fall semester · Rutgers–New Brunswick · 5 free hours a week")).toBeInTheDocument();
    const order = ["Where you're headed", "What you have", "What you need", "Start here", "This semester", "Coming up"]
      .map((name) => screen.getByRole("heading", { name }));
    for (let i = 1; i < order.length; i++) expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Land your first role in software engineering")).toBeInTheDocument();
    const have = screen.getByRole("heading", { name: "What you have" }).closest("section")!;
    expect(within(have).getByText("I have a resume")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).toBeNull(); // no tabs inside the plan
    expect(screen.queryByText(/hours a week would|hours of goals/)).toBeNull();
  });

  it("caps this semester and keeps 'when you have more time' inside Coming up, not at the bottom", () => {
    setup(createSaved({ ...cs, weeklyHours: 2 }, "2026-11-15"));
    const sem = screen.getByRole("heading", { name: "This semester" }).closest("section")!;
    expect(within(sem).getAllByRole("listitem").length).toBeLessThanOrEqual(3);
    const coming = screen.getByRole("heading", { name: "Coming up" }).closest("section")!;
    const more = within(coming).getByRole("heading", { name: "When you have more time" }).closest("section")!;
    expect(within(more).getByText(/Start any of them whenever you like/)).toBeInTheDocument();
    expect(within(more).getAllByRole("listitem").length).toBeLessThanOrEqual(3);
  });

  it("opens a goal, shows every reason, and marks it done", async () => {
    const { get } = setup();
    const first = get().plan.terms[0].items[0];
    const sem = screen.getByRole("heading", { name: "This semester" }).closest("section")!;
    fireEvent.click(within(sem).getByRole("button", { name: new RegExp(first.title.replace(/[()]/g, ".")) }));
    const dialog = screen.getByRole("dialog");
    for (const w of first.why) expect(within(dialog).getByText(w)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Close details" })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark as done" }));
    await act(async () => {});
    expect(get().completedGoals).toContain(first.goalId);
    expect(screen.getByRole("heading", { name: "Checked off" })).toBeInTheDocument();
  });

  it("says what to do: this semester shows the next step, and steps check off and are remembered", async () => {
    localStorage.clear();
    const { get } = setup();
    const sem = screen.getByRole("heading", { name: "This semester" }).closest("section")!;
    const first = within(sem).getAllByRole("listitem")[0];
    const item = get().plan.terms[0].items.find((i) => first.textContent!.startsWith(i.title))!;
    const goal = dataset.goals.find((g) => g.id === item.goalId.split("@")[0])!;
    expect(first.textContent).toContain(`Step 1 of ${goal.steps!.length}:`);
    fireEvent.click(within(first).getByRole("button", { name: new RegExp(item.title.replace(/[()]/g, ".")) }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "What to do" })).toBeInTheDocument();
    fireEvent.click(within(dialog).getAllByRole("checkbox")[0]);
    expect(within(dialog).getByText(`1 of ${goal.steps!.length} done`)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("cpm.steps.v1")!)[item.goalId]).toEqual([0]);
    expect(first.textContent).toContain(`Step 2 of ${goal.steps!.length}:`);
  });

  it("closes the drawer with Escape", async () => {
    setup();
    const next = screen.getByRole("heading", { name: "This semester" }).closest("section")!;
    fireEvent.click(within(next).getAllByRole("button")[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    await act(async () => {});
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the older-data notice for an outdated plan", () => {
    setup({ ...createSaved(cs, "2026-11-15"), dataVersion: "2020.01.01-1" });
    expect(screen.getByText("Your plan was built on older data. Refresh it.")).toBeInTheDocument();
  });

  it("dismisses notices", async () => {
    const { get } = setup();
    const w = get().plan.warnings[0];
    fireEvent.click(screen.getAllByRole("button", { name: "Dismiss notice" })[0]);
    await act(async () => {});
    expect(get().dismissed.length).toBe(1);
    expect(w).toBeDefined();
  });

  it("opens all resources and the full map as their own views, with a way back", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "All resources" }));
    await act(async () => {});
    expect(screen.getByRole("heading", { name: "All resources for your plan" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "This semester" })).toBeNull();
    expect(screen.getByText(/^Showing \d+ of \d+ resources\.$/)).toBeInTheDocument();
    expect(screen.getByLabelText("For students like me")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Back to your plan" }));
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "See the full map" }));
    await act(async () => {});
    expect(screen.getByRole("heading", { name: "Your full map" })).toBeInTheDocument();
  });

  it("uses amber only for real problems", () => {
    expect(noticeTone('"Take the MCAT" is required for Medicine, but its window has passed. Talk to an advisor about alternatives.')).toBe("warn");
    expect(noticeTone('"Log 150+ hours of patient-care experience" is essential for Medicine and is next in line.')).toBe("info");
    expect(noticeTone("Recruiting timeline: Big tech opens junior-summer internships July–September.")).toBe("info");
    expect(noticeTone("International students need CPT or OPT authorization before any internship.")).toBe("info");
  });
});
