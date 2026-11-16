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
  it("shows the summary, the trajectory note once, and up to five next moves", () => {
    setup();
    expect(screen.getByText("Software engineering · Computer Science, year 2 · Rutgers–New Brunswick · by graduation · 5 hrs/week")).toBeInTheDocument();
    expect(screen.getAllByText(/general trajectory, not a blueprint/)).toHaveLength(1);
    const next = screen.getByRole("heading", { name: "Your next moves" }).closest("section")!;
    const rows = within(next).getAllByRole("listitem");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(5);
  });

  it("opens a goal, shows every reason, and marks it done", async () => {
    const { get } = setup();
    const first = get().plan.terms[0].items[0];
    const next = screen.getByRole("heading", { name: "Your next moves" }).closest("section")!;
    fireEvent.click(within(next).getByRole("button", { name: new RegExp(first.title.replace(/[()]/g, ".")) }));
    const dialog = screen.getByRole("dialog");
    for (const w of first.why) expect(within(dialog).getByText(w)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Close details" })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark as done" }));
    await act(async () => {});
    expect(get().completedGoals).toContain(first.goalId);
    expect(screen.getByRole("heading", { name: "Checked off" })).toBeInTheDocument();
  });

  it("says what to do: next moves show the next step, and steps check off and are remembered", async () => {
    localStorage.clear();
    const { get } = setup();
    const next = screen.getByRole("heading", { name: "Your next moves" }).closest("section")!;
    const first = within(next).getAllByRole("listitem")[0];
    const item = get().plan.terms[0].items.find((i) => first.textContent!.startsWith(i.title))!;
    const goal = dataset.goals.find((g) => g.id === item.goalId.split("@")[0])!;
    expect(within(first).getByText(goal.steps![0])).toBeInTheDocument();
    expect(first.textContent).toContain(`Step 1 of ${goal.steps!.length}:`);

    fireEvent.click(within(first).getByRole("button", { name: new RegExp(item.title.replace(/[()]/g, ".")) }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "What to do" })).toBeInTheDocument();
    expect(within(dialog).getByText(goal.doneWhen!)).toBeInTheDocument();
    const boxes = within(dialog).getAllByRole("checkbox");
    expect(boxes).toHaveLength(goal.steps!.length);
    fireEvent.click(boxes[0]);
    expect(within(dialog).getByText(`1 of ${goal.steps!.length} done`)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("cpm.steps.v1")!)[item.goalId]).toEqual([0]);
    expect(first.textContent).toContain(`Step 2 of ${goal.steps!.length}:`);
    for (const id of goal.guides ?? []) {
      const r = dataset.resources.find((x) => x.id === id)! as unknown as { name: string };
      expect(within(dialog).getByRole("link", { name: new RegExp(r.name.replace(/[()*+?.]/g, ".")) })).toBeInTheDocument();
    }
  });

  it("tells you to reload when the page is older than the site's latest deploy", async () => {
    vi.doMock("../pdf/download.ts", () => ({ downloadRoadmapPdf: () => Promise.reject(new TypeError("Failed to fetch dynamically imported module: https://x/assets/react-pdf.js")) }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    await act(async () => {});
    expect(await screen.findByText(/site was updated after you opened this page/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();
    expect(screen.queryByText(/Try again/)).toBeNull();
    vi.doUnmock("../pdf/download.ts");
  });

  it("closes the drawer with Escape", async () => {
    setup();
    const next = screen.getByRole("heading", { name: "Your next moves" }).closest("section")!;
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

  it("switches to the resources tab", async () => {
    setup();
    fireEvent.click(screen.getByRole("tab", { name: "Your resources" }));
    await act(async () => {});
    expect(screen.getByRole("tab", { name: "Your resources" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Your resources" })).toBeInTheDocument();
    expect(screen.getByText(/^Showing \d+ of \d+ resources\.$/)).toBeInTheDocument();
    expect(screen.getByLabelText("For students like me")).toBeDisabled();
  });

  it("uses amber only for real problems", () => {
    expect(noticeTone("About 120 hours of goals didn't fit. Around 9 hours a week would cover them.")).toBe("warn");
    expect(noticeTone("Recruiting timeline: Big tech opens junior-summer internships July–September.")).toBe("info");
    expect(noticeTone("International students need CPT or OPT authorization before any internship.")).toBe("info");
  });
});
