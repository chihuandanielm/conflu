import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { emptyAnswers, type Answers } from "../intake/model.ts";
import { createSaved, type SavedPlan } from "../state/plan.ts";
import { dataset } from "../data/dataset.ts";
import { noticeTone } from "./Notices.tsx";
import { howTo } from "../state/steps.ts";
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
  it("reads top to bottom: do this now, this semester, why this order, then the goal, have and need, coming up", () => {
    setup(createSaved({ ...cs, semester: 1, yearTerm: "2F", experience: ["resume", "club"], skills: ["python"] }, "2026-11-15"));
    expect(screen.getByRole("heading", { level: 1, name: "Your plan" })).toBeInTheDocument();
    expect(screen.getByText("Software engineering · Computer Science · Second year, fall semester · Rutgers–New Brunswick · 5 free hours a week")).toBeInTheDocument();
    const order = ["Do this now", "This semester", "Where you're headed", "What you have", "What you need", "Coming up"]
      .map((name) => screen.getByRole("heading", { name }));
    for (let i = 1; i < order.length; i++) expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Land your first role in software engineering")).toBeInTheDocument();
    const have = screen.getByRole("heading", { name: "What you have" }).closest("section")!;
    expect(within(have).getByText("I have a resume")).toBeInTheDocument();
    // Four tabs under the header (design/DESIGN.md §7.4a); a returning student lands on Plan.
    expect(screen.getAllByRole("tab").map((t) => t.textContent?.replace(/\d+/g, "").trim())).toEqual(["Plan", "Map", "Resources", "Courses"]);
    // The header's actions fit one row: Start over lives on the Edit answers screen.
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Plan" })).toHaveAttribute("aria-selected", "true");
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
    const steps = howTo(item).steps;
    expect(first.textContent).toContain(`Next: ${steps[0]}`);
    fireEvent.click(within(first).getByRole("button", { name: new RegExp(item.title.replace(/[()]/g, ".")) }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "What to do" })).toBeInTheDocument();
    fireEvent.click(within(dialog).getAllByRole("checkbox")[0]);
    expect(within(dialog).getByText(`1 of ${steps.length} done`)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("cpm.steps.v1")!)[item.goalId]).toEqual([0]);
    expect(first.textContent).toContain(`Next: ${steps[1]}`);
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

  it("reaches all resources and the full map by tabs, and 'See the full map' switches to the Map tab", async () => {
    setup();
    fireEvent.click(screen.getByRole("tab", { name: /^Resources/ }));
    await act(async () => {});
    expect(screen.getByRole("tab", { name: /^Resources/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "All resources for your plan" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "This semester" })).toBeNull();
    expect(screen.getByText(/^Showing \d+ of \d+ resources\.$/)).toBeInTheDocument();
    expect(screen.getByLabelText("For students like me")).toBeDisabled();
    fireEvent.click(screen.getByRole("tab", { name: "Plan" }));
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "See the full map" }));
    await act(async () => {});
    expect(screen.getByRole("tab", { name: /^Map/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Your full map" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Your plan as a confluence/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your skills picture" })).toBeInTheDocument();
  });

  it("moves between tabs with the arrow keys, and every goal on the map is a button that opens it", async () => {
    const { get } = setup();
    const plan = screen.getByRole("tab", { name: "Plan" });
    plan.focus();
    fireEvent.keyDown(plan, { key: "ArrowRight" });
    await act(async () => {});
    expect(screen.getByRole("tab", { name: /^Map/ })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(screen.getByRole("tab", { name: /^Map/ }), { key: "ArrowLeft" });
    await act(async () => {});
    expect(screen.getByRole("tab", { name: "Plan" })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Plan" }), { key: "End" });
    await act(async () => {});
    expect(screen.getByRole("tab", { name: /^Courses/ })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: /^Map/ }));
    await act(async () => {});
    const first = get().plan.terms[0].items[0];
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${first.title.replace(/[()]/g, ".")}\\s?, `) }));
    expect(within(screen.getByRole("dialog")).getByRole("heading", { name: first.title })).toBeInTheDocument();
  });

  it("flags only real problems as warnings", () => {
    expect(noticeTone('"Take the MCAT" is required for Medicine, but its window has passed. Talk to an advisor about alternatives.')).toBe("warn");
    expect(noticeTone('"Log 150+ hours of patient-care experience" is essential for Medicine and is next in line.')).toBe("info");
    expect(noticeTone("Recruiting timeline: Big tech opens junior-summer internships July–September.")).toBe("info");
    expect(noticeTone("International students need CPT or OPT authorization before any internship.")).toBe("info");
  });

  it("a new plan is a draft: the banner says it can be edited, and the Map tab lists every option to cross out or mark done", async () => {
    const { get } = setup();
    expect(screen.getByRole("heading", { name: "This is your draft map" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finalize my map" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Map/ }));
    await act(async () => {});
    const edit = screen.getByRole("heading", { name: "Edit your map" }).closest("section")!;
    // Ranked by what this path's recruiters look for (the sources are under "Why this order" on the Plan tab).
    expect(within(edit).getByText(/software engineering recruiters look for/)).toBeInTheDocument();
    // Must-dos are marked, and listed first in their semester.
    const must = within(edit).getAllByText("Essential must-do");
    expect(must.length).toBeGreaterThan(0);
    const first = within(edit).getAllByRole("list")[0];
    const labels = within(first).getAllByText(/Essential must-do|High priority|Worth doing|If you have time/).map((e) => e.textContent);
    const rank = ["Essential must-do", "High priority", "Worth doing", "If you have time"];
    for (let i = 1; i < labels.length; i++) expect(rank.indexOf(labels[i]!)).toBeGreaterThanOrEqual(rank.indexOf(labels[i - 1]!));
    // More options than the time-sized plan.
    const options = get().plan.terms.flatMap((t) => t.items.filter((i) => i.option));
    expect(options.length).toBeGreaterThan(0);
    expect(within(edit).getByRole("button", { name: `Not for me: ${options[0].title}` })).toBeInTheDocument();
  });

  it("crosses a goal out, lists it under Not for me, and Undo brings it back", async () => {
    const { get } = setup();
    fireEvent.click(screen.getByRole("tab", { name: /Map/ }));
    await act(async () => {});
    const target = get().plan.terms[0].items.find((i) => i.importance !== "must")!;
    fireEvent.click(screen.getByRole("button", { name: `Not for me: ${target.title}` }));
    await act(async () => {});
    expect(get().skipped).toEqual([target.goalId]);
    const list = screen.getByRole("heading", { name: "Not for me" }).closest("section")!;
    const shown = get().plan.skipped[0].title;
    expect(within(list).getByText(shown, { selector: ".line-through" })).toBeInTheDocument();
    fireEvent.click(within(list).getByRole("button", { name: `Undo: ${shown}` }));
    await act(async () => {});
    expect(get().skipped).toEqual([]);
    expect(screen.queryByRole("heading", { name: "Not for me" })).toBeNull();
  });

  it("crossing out a must-do keeps it marked as essential and warns", async () => {
    const { get } = setup();
    fireEvent.click(screen.getByRole("tab", { name: /Map/ }));
    await act(async () => {});
    const gate = get().plan.terms.flatMap((t) => t.items).find((i) => i.gate)!;
    fireEvent.click(screen.getAllByRole("button", { name: `Not for me: ${gate.title}` })[0]);
    await act(async () => {});
    const list = screen.getByRole("heading", { name: "Not for me" }).closest("section")!;
    expect(within(list).getByText("Essential must-do")).toBeInTheDocument();
    expect(get().plan.warnings.some((w) => w.includes(gate.title) && /must-do/.test(w))).toBe(true);
  });

  it("finalizes the draft to a plan sized to the student's time, and can go back", async () => {
    const { get } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Finalize my map" }));
    await act(async () => {});
    expect(get().finalized).toBe(true);
    expect(get().plan.terms.flatMap((t) => t.items).some((i) => i.option)).toBe(false);
    expect(screen.getByRole("heading", { name: "Your final map" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to the draft" }));
    await act(async () => {});
    expect(get().finalized).toBe(false);
  });

  it("the goal drawer offers Not for me and says how important the goal is", async () => {
    const { get } = setup();
    const first = get().plan.terms[0].items.find((i) => !i.option)!;
    const sem = screen.getByRole("heading", { name: "This semester" }).closest("section")!;
    fireEvent.click(within(sem).getAllByRole("button")[0]);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/^(Essential must-do|High priority|Worth doing|If you have time)$/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /Not for me/ }));
    await act(async () => {});
    expect(get().skipped.length).toBe(1);
    void first;
  });

  it("do this now: one card with where you stand, this semester's first step, and the place to go, linked", () => {
    const { get } = setup();
    const card = screen.getByRole("heading", { name: "Do this now" }).closest("section")!;
    const term = get().plan.terms[0];
    expect(within(card).getByText(new RegExp(`^This semester: ${term.label}`, "i"))).toBeInTheDocument();
    expect(within(card).getByTestId("standing").textContent).toMatch(/\d+ (goal|goals) this semester/);
    const part = within(card).getByText(/^Part of:/).textContent!;
    const item = term.items.find((i) => part.includes(i.title))!;
    expect(item).toBeDefined();
    const steps = howTo(item).steps;
    expect(within(card).getByText(steps[0])).toBeInTheDocument();
    if (item.resources.length) {
      const link = within(card).getByRole("link", { name: new RegExp(item.resources[0].name.replace(/[()]/g, ".")) });
      expect(link).toHaveAttribute("href", item.resources[0].url);
      expect(link).toHaveAttribute("target", "_blank");
    }
    expect(within(card).getByRole("button", { name: "Open this goal" })).toBeInTheDocument();
  });

  it("this semester names the best places to go in each row, linked, without opening the goal", () => {
    const { get } = setup();
    const sem = screen.getByRole("heading", { name: "This semester" }).closest("section")!;
    const shown = get().plan.terms[0].items.filter((i) => within(sem).queryByRole("button", { name: new RegExp(`^${i.title.replace(/[()]/g, ".")}`) }));
    const withPlaces = shown.filter((i) => i.resources.length);
    expect(withPlaces.length).toBeGreaterThan(0);
    for (const i of withPlaces) {
      const link = within(sem).getAllByRole("link").find((a) => a.getAttribute("href") === i.resources[0].url);
      expect(link, i.goalId).toBeDefined();
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("why this order: the recruiter focus and its sources, from the top of the plan", () => {
    setup();
    const why = screen.getByRole("button", { name: "Why this order" });
    expect(why).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(why);
    expect(why).toHaveAttribute("aria-expanded", "true");
    const track = dataset.tracks.find((t) => t.id === "software-engineering")!;
    expect(screen.getByText(track.recruiterFocus!)).toBeInTheDocument();
    for (const u of track.recruiterSources ?? []) expect(screen.getAllByRole("link").some((a) => a.getAttribute("href") === u)).toBe(true);
  });

  it("the goal drawer is one scroll: what to do, then where to go right under it, with places in the steps linked", () => {
    const { get } = setup();
    const busy = get().plan.terms[0].items.find((i) => i.resources.length > 3) ?? get().plan.terms[0].items[0];
    const sem = screen.getByRole("heading", { name: "This semester" }).closest("section")!;
    const row = within(sem).queryByRole("button", { name: new RegExp(`^${busy.title.replace(/[()]/g, ".")}`) });
    if (row) fireEvent.click(row); else fireEvent.click(within(sem).getAllByRole("button")[0]);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("tablist")).toBeNull();
    const todo = within(dialog).queryByRole("heading", { name: "What to do" });
    const go = within(dialog).getByRole("heading", { name: "Where to go" });
    if (todo) expect(todo.compareDocumentPosition(go) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const done = within(dialog).queryByRole("heading", { name: "Done when" });
    if (done) expect(go.compareDocumentPosition(done) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("courses have their own tab, dated and linked; the Plan tab doesn't repeat them", async () => {
    setup();
    expect(screen.queryByRole("heading", { name: "On track to graduate" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: /^Courses/ }));
    await act(async () => {});
    expect(screen.getByRole("heading", { name: "On track to graduate" })).toBeInTheDocument();
    expect(screen.getByText(/last checked/)).toBeInTheDocument();
  });

  it("has no Courses tab for a school outside Rutgers", () => {
    setup(createSaved({ ...cs, school: "other" }, "2026-11-15"));
    expect(screen.getAllByRole("tab").map((t) => t.textContent?.replace(/\d+/g, "").trim())).toEqual(["Plan", "Map", "Resources"]);
  });
});
