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

describe("already done? (engine 0.13.0, docs/T4_PLAN.md)", () => {
  const senior: Answers = { ...cs, year: 4, semester: 1, yearTerm: "4F" };
  it("asks an upper-year student about the catch-ups in this semester, and marks the ones they pick done in one re-plan", () => {
    const { onChange, get } = setup(createSaved(senior, "2026-10-01"));
    const card = screen.getByRole("region", { name: "Already done any of these?" });
    const catchups = get().plan.terms[0].items.filter((i) => (i.timing === "late" || i.timing === "last-chance") && !i.gate && !i.option);
    expect(catchups.length).toBeGreaterThan(0);
    for (const it of catchups) expect(within(card).getByRole("button", { name: it.title })).toBeInTheDocument();
    const update = within(card).getByRole("button", { name: "Update my plan" });
    expect(update).toBeDisabled();
    fireEvent.click(within(card).getByRole("button", { name: catchups[0].title }));
    expect(within(card).getByRole("button", { name: catchups[0].title })).toHaveAttribute("aria-pressed", "true");
    act(() => { fireEvent.click(update); });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(get().completedGoals).toContain(catchups[0].goalId);
  });
  it("isn't shown when nothing in this semester is a catch-up", () => {
    setup(createSaved({ ...cs, year: 1, semester: 1, yearTerm: "1F" }, "2026-10-01"));
    expect(screen.queryByRole("region", { name: "Already done any of these?" })).toBeNull();
  });
  it("can be hidden", () => {
    const { get } = setup(createSaved(senior, "2026-10-01"));
    act(() => { fireEvent.click(screen.getByRole("button", { name: "Hide" })); });
    expect(screen.queryByRole("region", { name: "Already done any of these?" })).toBeNull();
    expect(get().dismissed.some((d) => d.startsWith("already-done:"))).toBe(true);
  });
});

describe("started goals (engine 0.14.0)", () => {
  it("say how far along they are, and the next step skips what's done", () => {
    const { get } = setup(createSaved({ ...cs, year: 1, semester: 1, yearTerm: "1F", experience: ["linkedin"] }, "2026-10-01"));
    const li = get().plan.terms.flatMap((t) => t.items).find((i) => i.goalId === "p-linkedin-setup")!;
    expect(li.started).toBeGreaterThan(0);
    expect(screen.getAllByText(`started, about ${Math.round(li.started! * 100)}% done`).length).toBeGreaterThan(0);
  });
});

describe("results page", () => {
  it("reads top to bottom: where you stand, do this now, this semester, coming up, then the big picture", () => {
    setup(createSaved({ ...cs, semester: 1, yearTerm: "2F", experience: ["resume", "club"], skills: ["python"] }, "2026-11-15"));
    // The title is where the student is headed, with "your plan" as its small label (direction A, docs/DESIGN_RESEARCH.md).
    expect(screen.getByRole("heading", { level: 1, name: "your plan Land your first role in software engineering" })).toBeInTheDocument();
    expect(screen.getByText("software engineering · computer science · second year, fall semester · rutgers–new brunswick · 5 free hours a week")).toBeInTheDocument();
    // Phase 4 (docs/IMPROVEMENT_PLAN.md 4.1): three blocks, Now, This semester, and Your path.
    const order = ["Do this now", "This semester", "Your path", "Where you're headed", "Semester by semester", "What you have", "What you need"]
      .map((name) => screen.getByRole("heading", { name }));
    for (let i = 1; i < order.length; i++) expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The destination is in the header, and again in the big picture.
    expect(screen.getAllByText("Land your first role in software engineering").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("headed for")).toBeNull();
    const have = screen.getByRole("heading", { name: "What you have" }).closest("section")!;
    expect(within(have).getByText("I have a resume")).toBeInTheDocument();
    // Phase 5.3: each answer says what it counts for in the plan.
    expect(within(have).getByText(/^Counts for: Write your first college resume/)).toBeInTheDocument();
    // Four tabs under the header (design/DESIGN.md §7.4a); a returning student lands on Plan.
    expect(screen.getAllByRole("tab").map((t) => t.textContent?.replace(/\d+/g, "").trim())).toEqual(["Plan", "Map", "Resources", "Courses"]);
    // The header's actions fit one row: Start over lives on the Edit answers screen.
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Plan" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByText(/hours a week would|hours of goals/)).toBeNull();
  });

  it("caps this semester and folds the rest of the path: one closed row per year, 'more time' and have/need folded too", () => {
    const { get } = setup(createSaved({ ...cs, weeklyHours: 2 }, "2026-11-15"));
    const sem = screen.getByRole("heading", { name: "This semester" }).closest("section")!;
    expect(within(sem).getAllByRole("listitem").length).toBeLessThanOrEqual(3);
    const path = screen.getByRole("heading", { name: "Your path" }).closest("section")!;
    const years = path.querySelectorAll("details[data-year]");
    const expected = new Set(get().plan.terms.slice(1).map((t) => /year (\d)/i.exec(t.label)?.[1] ?? "G"));
    expect(years.length).toBe(expected.size);
    for (const d of years) expect((d as HTMLDetailsElement).open).toBe(false);
    const more = within(path).getByText(/When you have more time/).closest("details")!;
    expect(more.open).toBe(false);
    expect(within(more).getByText(/Start any of them whenever you like/)).toBeInTheDocument();
    const haveNeed = within(path).getByRole("heading", { name: "What you have" }).closest("details")!;
    expect(haveNeed.open).toBe(false);
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
    expect(screen.getByRole("heading", { name: "Resources for this semester" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "This semester" })).toBeNull();
    // Phase 4.3: it opens on this semester's resources, with the whole plan one tap away.
    expect(screen.getByRole("button", { name: "This semester" })).toHaveAttribute("aria-pressed", "true");
    const now = Number(/^Showing (\d+) of \d+ resources/.exec(screen.getByText(/^Showing \d+ of \d+ resources/).textContent!)![1]);
    fireEvent.click(screen.getByRole("button", { name: "Whole plan" }));
    expect(screen.getByRole("heading", { name: "All resources for your plan" })).toBeInTheDocument();
    const all = Number(/^Showing (\d+) of \d+ resources/.exec(screen.getByText(/^Showing \d+ of \d+ resources/).textContent!)![1]);
    expect(now).toBeGreaterThan(0);
    expect(now).toBeLessThan(all);
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
    // On the Plan tab the draft is one line; the banner and "Finalize my map" are on the Map tab.
    expect(screen.getByRole("heading", { name: "This is a draft map" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Finalize my map" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Review on the Map tab/ }));
    await act(async () => {});
    expect(screen.getByRole("heading", { name: "This is your draft map" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finalize my map" })).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("tab", { name: /^Map/ }));
    await act(async () => {});
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
    expect(within(dialog).getByText(/^(must-do|high priority|worth doing|if you have time)$/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /Not for me/ }));
    await act(async () => {});
    expect(get().skipped.length).toBe(1);
    void first;
  });

  it("do this now: where you stand in numbers, then one card with the first step and the place to go, linked", () => {
    const { get } = setup();
    const term = get().plan.terms[0];
    const standing = screen.getByTestId("standing");
    expect(standing.textContent).toContain(term.label);
    expect(standing.textContent).toMatch(/\d+ goals? · \d+ must-dos? · \d+ done/);
    expect(standing.textContent).toMatch(/Uses about \d+ of your 5 free hours a week|Nothing planned/);
    const card = screen.getByRole("heading", { name: "Do this now" }).closest("section")!;
    const part = within(card).getByText((_, el) => el?.tagName === "P" && /part of/.test(el.textContent ?? "")).textContent!;
    const item = term.items.find((i) => part.includes(i.title))!;
    expect(item).toBeDefined();
    expect(within(card).getByText(howTo(item).steps[0])).toBeInTheDocument();
    if (item.resources.length) {
      const link = within(card).getByRole("link", { name: new RegExp(item.resources[0].name.replace(/[()]/g, ".")) });
      expect(link).toHaveAttribute("href", item.resources[0].url);
      expect(link).toHaveAttribute("target", "_blank");
    }
    expect(within(card).getByRole("button", { name: "Open the full goal" })).toBeInTheDocument();
  });

  it("changes free hours from the plan and re-plans at once", async () => {
    const { get } = setup();
    fireEvent.change(screen.getByLabelText("Free hours a week:"), { target: { value: "15" } });
    await act(async () => {});
    expect(get().answers.weeklyHours).toBe(15);
    expect(screen.getByTestId("standing").textContent).toMatch(/of your 15 free hours a week/);
    expect(screen.getByText(/Re-planned for 15 free hours a week/)).toBeInTheDocument();
  });

  it("shows time in words, never a bare hours number", () => {
    setup();
    const sem = screen.getByRole("heading", { name: "This semester" }).closest("section")!;
    expect(sem.textContent).toMatch(/hours?, once|h a week this semester|full-time/);
    expect(sem.textContent).not.toMatch(/\d h\b(?! a week| in all)/);
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

  it("the goal drawer is one scroll: what to do and done when, then where to go, with places in the steps linked", () => {
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
    // Done when sits right under the steps, before where to go.
    const done = within(dialog).queryByRole("heading", { name: "Done when" });
    if (done) expect(done.compareDocumentPosition(go) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("courses have their own tab, dated and linked; the Plan tab doesn't repeat them", async () => {
    setup();
    expect(screen.queryByRole("heading", { name: "On track to graduate" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: /^Courses/ }));
    await act(async () => {});
    expect(screen.getByRole("heading", { name: "On track to graduate" })).toBeInTheDocument();
    expect(screen.getByText(/last checked/)).toBeInTheDocument();
  });

  it("explains the degree audit on the Courses tab for a school outside Rutgers (Phase 6.2)", async () => {
    setup(createSaved({ ...cs, school: "other" }, "2026-11-15"));
    expect(screen.getAllByRole("tab").map((t) => t.textContent?.replace(/\d+/g, "").trim())).toEqual(["Plan", "Map", "Resources", "Courses"]);
    fireEvent.click(screen.getByRole("tab", { name: /Courses/ }));
    await act(async () => {});
    expect(screen.getByRole("heading", { name: "Check your degree audit" })).toBeTruthy();
    for (const h of ["Major courses", "General education", "Credits by year"]) expect(screen.getByText(h)).toBeTruthy();
    expect(screen.queryByText(/On track to graduate/)).toBeNull();
  });

  it("says up front what changes for a school outside Rutgers (Phase 6.3)", () => {
    setup(createSaved({ ...cs, school: "other" }, "2026-11-15"));
    expect(screen.getAllByText(/Your school isn't Rutgers/).length).toBeGreaterThan(0);
  });
});
