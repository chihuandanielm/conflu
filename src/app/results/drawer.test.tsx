import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { emptyAnswers, type Answers } from "../intake/model.ts";
import { createSaved } from "../state/plan.ts";
import { GoalDrawer, guideSources } from "./GoalDrawer.tsx";

const other: Answers = { ...emptyAnswers(), status: "college-student", majorId: "computer-science", year: 1, semester: 1, trackId: "software-engineering",
  horizon: "graduation", summer: "full", school: "other" };
const find = (a: Answers, goalId: string) => {
  const p = createSaved(a, "2026-10-01").plan;
  for (const term of p.terms) { const item = term.items.find((i) => i.goalId === goalId); if (item) return { item, term }; }
  throw new Error(`${goalId} not planned`);
};

describe("goal drawer sources and school hints", () => {
  it("names who wrote the guides: the part before the colon, else the site", () => {
    expect(guideSources([
      { name: "MIT CAPD: Enhance your resume", url: "https://capd.mit.edu/a" },
      { name: "MIT CAPD: Cover letters", url: "https://capd.mit.edu/b" },
      { name: "How to get a free club", url: "https://www.example.org/x" },
    ])).toEqual(["MIT CAPD", "example.org"]);
  });

  it("a step with guides says where the advice comes from (Phase 2.6)", () => {
    const { item, term } = find(other, "e-join-orgs");
    render(<GoalDrawer item={item} term={term} identity={[]} onClose={() => {}} onDone={() => {}} />);
    expect(screen.getByText("Based on guides from Penn State Smeal and Montana State.")).toBeInTheDocument();
  });

  it("at another school, says what to look for there (Phase 6.1)", () => {
    const { item, term } = find(other, "e-join-orgs");
    expect(item.findOnCampus).toBeTruthy();
    render(<GoalDrawer item={item} term={term} identity={[]} onClose={() => {}} onDone={() => {}} />);
    expect(screen.getByText("At your school:").parentElement!.textContent).toBe(`At your school: look for ${item.findOnCampus}.`);
  });

  it("at Rutgers, the campus office is linked and there's no hint", () => {
    const { item, term } = find({ ...other, school: "rutgers-nb" }, "e-join-orgs");
    expect(item.findOnCampus).toBeUndefined();
    render(<GoalDrawer item={item} term={term} identity={[]} onClose={() => {}} onDone={() => {}} />);
    expect(screen.queryByText("At your school:")).toBeNull();
  });
});
