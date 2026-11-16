import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { emptyAnswers, type Answers } from "./model.ts";
import { Review } from "./Review.tsx";

const full: Answers = { ...emptyAnswers(), status: "college-student", school: "rutgers-nb", majorId: "computer-science", year: 2, semester: 1, yearTerm: "2F",
  enrollment: "full-time", trackId: "software-engineering", horizon: "graduation", summer: "full", openToCoop: undefined };

describe("review screen", () => {
  it("builds right away when everything needed is answered", () => {
    const onBuild = vi.fn();
    render(<Review answers={full} onEdit={() => {}} onBack={() => {}} onBuild={onBuild} />);
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Build my plan" }));
    expect(onBuild).toHaveBeenCalled();
  });

  it("says which answers are missing, marks them, and never hides the reason behind a greyed-out button", () => {
    const onEdit = vi.fn(), onBuild = vi.fn();
    render(<Review answers={{ ...full, semester: undefined, yearTerm: undefined, horizon: undefined }} onEdit={onEdit} onBack={() => {}} onBuild={onBuild} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("2 answers are still needed before we can build your plan.");
    expect(within(alert).getByRole("button", { name: "Answer: Year and semester" })).toBeInTheDocument();
    expect(within(alert).getByRole("button", { name: "Answer: Time frame" })).toBeInTheDocument();
    // The rows themselves say "Needed", with an Answer button instead of Edit.
    expect(screen.getAllByText("Needed")).toHaveLength(2);
    // The main button is never disabled: it takes the student to the first missing question.
    const build = screen.getByRole("button", { name: "Answer the missing question first" });
    expect(build).toBeEnabled();
    fireEvent.click(build);
    expect(onEdit).toHaveBeenCalledWith("year");
    expect(onBuild).not.toHaveBeenCalled();
    fireEvent.click(within(alert).getByRole("button", { name: "Answer: Time frame" }));
    expect(onEdit).toHaveBeenLastCalledWith("horizon");
  });
});
