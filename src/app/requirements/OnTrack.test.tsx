import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { emptyAnswers, type Answers } from "../intake/model.ts";
import { OnTrack } from "./OnTrack.tsx";

const base: Answers = { ...emptyAnswers(), status: "college-student", majorId: "computer-science", year: 3, semester: 1, trackId: "software-engineering",
  horizon: "graduation", summer: "full", school: "rutgers-nb", location: "nj" };

describe("On track to graduate", () => {
  beforeEach(() => window.localStorage.clear());

  it("lists the major's courses by year, links the official page, and marks earlier years as due", () => {
    render(<OnTrack answers={base} />);
    const s = screen.getByRole("heading", { name: "On track to graduate" }).closest("section")!;
    expect(within(s).getByRole("link", { name: /Official requirements for your major/ })).toHaveAttribute("href", "https://newbrunswick-26-27-undergrad.catalogs.rutgers.edu/pages/VSbgggHtgjolUCQloHSE");
    expect(within(s).getByText(/2026–2027 New Brunswick Undergraduate Catalog \(last checked November 23, 2026\)/)).toBeInTheDocument();
    expect(within(s).getByText(/if you started before fall 2026, check your degree audit/)).toBeInTheDocument();
    expect(within(s).getByText(/01:198:111 Introduction to Computer Science \(4\)/)).toBeInTheDocument();
    expect(within(s).getAllByText("should be done by now").length).toBe(2); // years 1 and 2 for a third-year student
    expect(within(s).getByText("this year")).toBeInTheDocument();
    expect(within(s).getByText(/0 of \d+ requirements from earlier years ticked/)).toBeInTheDocument();
  });

  it("ticks a course and keeps it after a reload", () => {
    const { unmount } = render(<OnTrack answers={base} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /01:198:111 Introduction to Computer Science/ }));
    expect(screen.getByText(/1 of \d+ requirements from earlier years ticked/)).toBeInTheDocument();
    unmount();
    render(<OnTrack answers={base} />);
    expect(screen.getByRole("checkbox", { name: /01:198:111 Introduction to Computer Science/ })).toBeChecked();
  });

  it("shows the student's own campus, and nothing for a school outside Rutgers", () => {
    const { unmount } = render(<OnTrack answers={{ ...base, school: "rutgers-camden" }} />);
    expect(screen.getByText(/50:198:111 Programming Fundamentals/)).toBeInTheDocument();
    unmount();
    const { container } = render(<OnTrack answers={{ ...base, school: "other" }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
