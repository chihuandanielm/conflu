import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IntakeFlow, INTAKE_KEY } from "./IntakeFlow.tsx";
import { emptyAnswers, type Answers } from "./model.ts";

const heading = () => screen.getByRole("heading", { level: 1 }).textContent;
const advance = () => act(() => { vi.advanceTimersByTime(300); });
/** The landing's exit: its words fade, then the next screen fades in. */
const leaveLanding = async () => { for (let i = 0; i < 4; i++) { act(() => { vi.advanceTimersByTime(500); }); await act(async () => {}); } };
const saved = () => JSON.parse(localStorage.getItem(INTAKE_KEY)!).answers as Answers;
const nb: Answers = { ...emptyAnswers(), status: "college-student", school: "rutgers-nb", majorId: "computer-science" };
const full: Answers = { ...nb, year: 2, semester: 1, yearTerm: "2F", enrollment: "full-time", trackId: "software-engineering", horizon: "graduation", summer: "full" };

describe("IntakeFlow", () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("starts on the landing, and Build my plan fades it out, then records that the student is in college", async () => {
    render(<IntakeFlow onBuild={() => {}} />);
    expect(screen.getByRole("heading", { level: 1, name: "Know what to do now." })).toBeInTheDocument();
    // The sample plan drawn as a map (the engine's real plan), and the numbers behind the site.
    expect(screen.getByRole("heading", { name: "The whole path, as a map" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /A sample plan as a confluence/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "A real plan" })).toBeNull();
    expect(screen.getByText("checked resources")).toBeInTheDocument();
    // One button at the top (the hero), one at the bottom (the closing panel); none in the nav beside the hero's.
    expect(within(screen.getByRole("navigation")).queryByRole("button")).toBeNull();
    expect(screen.getAllByRole("button", { name: /^Build my plan/ })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: /^Build my plan/ })[0]); await act(async () => {});
    // The words fade, then the questions fade in.
    expect(heading()).toBe("Know what to do now.");
    await leaveLanding();
    expect(heading()).toBe("What do you study?");
    expect(saved().status).toBe("college-student");
  });

  it("asks campus and major on one screen, lists only that campus's majors, and moves on once the major is picked", async () => {
    render(<IntakeFlow onBuild={() => {}} startAt="study" />);
    expect(screen.getByText("Pick your campus first.")).toBeInTheDocument();
    expect(screen.queryByRole("searchbox", { name: "Search majors" })).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Rutgers–Camden" })); advance(); await act(async () => {});
    expect(heading()).toBe("What do you study?"); // the campus alone doesn't move on
    const majors = within(screen.getByRole("radiogroup", { name: "What's your major?" })).getAllByRole("radio").map((r) => r.textContent);
    expect(majors).toContain("Human Resource Management");
    expect(majors).not.toContain("Pharmacy");
    fireEvent.change(screen.getByRole("searchbox", { name: "Search majors" }), { target: { value: "pharm" } });
    expect(screen.getByText("No majors match. This version covers 12 majors offered at Rutgers–Camden.")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search majors" }), { target: { value: "account" } });
    fireEvent.keyDown(screen.getByRole("searchbox", { name: "Search majors" }), { key: "Enter" }); advance(); await act(async () => {});
    expect(saved()).toMatchObject({ school: "rutgers-camden", majorId: "accounting" });
    expect(heading()).toBe("Where do you want to end up?"); // the goal comes right after the major
  });

  it("clears a major the new campus doesn't offer", async () => {
    render(<IntakeFlow onBuild={() => {}} startAt="study" initialAnswers={{ ...nb, majorId: "pharmacy", openToCoop: true }} />);
    fireEvent.click(screen.getByRole("radio", { name: "Rutgers–Newark" })); advance(); await act(async () => {});
    expect(saved().school).toBe("rutgers-newark");
    expect(saved().majorId).toBeUndefined();
    expect(saved().openToCoop).toBeUndefined();
    expect(heading()).toBe("What do you study?");
  });

  it("asks the time frame right after the goal; number keys still pick on one-question screens", async () => {
    render(<IntakeFlow onBuild={() => {}} startAt="track" initialAnswers={nb} />);
    fireEvent.click(screen.getByRole("radio", { name: /Software engineering/ })); advance(); await act(async () => {});
    expect(heading()).toBe("How soon do you want to get there?");
    fireEvent.keyDown(window, { key: "4" }); advance(); await act(async () => {});
    expect(saved().horizon).toBe("graduation");
    expect(heading()).toBe("Where are you in school?");
  });

  it("asks year, full-time/part-time, and graduation together, and moves on after the last one", async () => {
    render(<IntakeFlow onBuild={() => {}} startAt="year" initialAnswers={nb} />);
    expect(screen.getByText(/matches your credits so far/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Third year" })); fireEvent.click(screen.getByRole("radio", { name: "Spring semester" }));
    advance(); await act(async () => {});
    expect(heading()).toBe("Where are you in school?");
    fireEvent.click(screen.getByRole("radio", { name: /Part-time/ })); advance(); await act(async () => {});
    // Graduation (engine 0.13.0) follows, already set to the usual four years; picking "A year later" moves on.
    expect(heading()).toBe("Where are you in school?");
    expect(screen.getByRole("radio", { name: /At the end of my fourth year/ })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: /A year later/ })); advance(); await act(async () => {});
    expect(saved()).toMatchObject({ year: 3, semester: 2, yearTerm: "3S", enrollment: "part-time", graduation: "year-later" });
    expect(heading()).toBe("What have you already done?");
  });

  it("asks the year from 5 choices, then turns the pick into a fall-or-spring choice", async () => {
    render(<IntakeFlow onBuild={() => {}} startAt="year" initialAnswers={nb} />);
    const years = within(screen.getByRole("radiogroup", { name: "Which year are you in?" })).getAllByRole("radio").map((r) => r.textContent);
    expect(years).toEqual(["First year", "Second year", "Third year", "Fourth year", "Fifth year or later"]);
    expect(screen.queryByRole("radio", { name: "Fall semester" })).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Second year" })); await act(async () => {});
    // The year list collapses to the pick, and fall/spring takes its place.
    expect(screen.queryByRole("radiogroup", { name: "Which year are you in?" })).toBeNull();
    expect(screen.getByText("Second year")).toBeInTheDocument();
    expect(within(screen.getByRole("radiogroup", { name: "Which semester of your second year?" })).getAllByRole("radio")).toHaveLength(2);
    expect(saved().semester).toBeUndefined();
    fireEvent.click(screen.getByRole("radio", { name: "Spring semester" })); await act(async () => {});
    expect(saved()).toMatchObject({ year: 2, semester: 2, yearTerm: "2S" });
    // Change year brings the list back; a different year asks the semester again.
    fireEvent.click(screen.getByRole("button", { name: "Change year" })); await act(async () => {});
    fireEvent.click(screen.getByRole("radio", { name: "Fourth year" })); await act(async () => {});
    expect(saved().year).toBe(4);
    expect(saved().semester).toBeUndefined();
    // Fifth year or later needs no semester.
    fireEvent.click(screen.getByRole("button", { name: "Change year" })); await act(async () => {});
    fireEvent.click(screen.getByRole("radio", { name: "Fifth year or later" })); await act(async () => {});
    expect(saved()).toMatchObject({ yearTerm: "5+", year: 4, semester: 2 });
    expect(screen.queryByRole("radio", { name: "Fall semester" })).toBeNull();
  });

  it("never greys out Continue: it marks each missing question in color and says what to pick", async () => {
    render(<IntakeFlow onBuild={() => {}} startAt="year" initialAnswers={nb} />);
    expect(screen.queryByText(/to continue\./)).toBeNull(); // nothing is flagged before the student tries
    const go = screen.getByRole("button", { name: "Continue" });
    expect(go).toBeEnabled();
    fireEvent.click(go); await act(async () => {});
    expect(heading()).toBe("Where are you in school?");
    expect(screen.getByRole("alert")).toHaveTextContent("2 questions on this page still need an answer.");
    expect(screen.getByText("Pick your year and semester to continue.")).toBeInTheDocument();
    expect(screen.getByText("Pick full-time or part-time to continue.")).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Are you a full-time or part-time student?" })).toHaveAttribute("aria-invalid", "true");
    // Answering one clears its mark and leaves the other.
    fireEvent.click(screen.getByRole("radio", { name: "Second year" })); await act(async () => {});
    expect(screen.getByText("Pick fall or spring to continue.")).toBeInTheDocument(); // the message follows what's left
    fireEvent.click(screen.getByRole("radio", { name: "Fall semester" })); await act(async () => {});
    expect(screen.queryByText("Pick fall or spring to continue.")).toBeNull();
    expect(screen.queryByText("Pick your year and semester to continue.")).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("1 question on this page still needs an answer.");
  });

  it("marks a missing answer on a one-question screen too", async () => {
    render(<IntakeFlow onBuild={() => {}} startAt="horizon" initialAnswers={{ ...nb, trackId: "software-engineering" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" })); await act(async () => {});
    expect(screen.getByText("Pick a time frame to continue.")).toBeInTheDocument();
    expect(heading()).toBe("How soon do you want to get there?");
  });

  it("opens a missing question from the review with its mark already showing", async () => {
    render(<IntakeFlow onBuild={() => {}} initialAnswers={{ ...full, horizon: undefined }} />);
    expect(heading()).toBe("Check your answers");
    fireEvent.click(screen.getByRole("button", { name: "Answer: Time frame" })); await act(async () => {});
    expect(heading()).toBe("How soon do you want to get there?");
    expect(screen.getByText("Pick a time frame to continue.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Within a year" })); advance(); await act(async () => {});
    expect(heading()).toBe("Check your answers");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("edits a question from the review on the screen that asks it", async () => {
    render(<IntakeFlow onBuild={() => {}} initialAnswers={full} />);
    fireEvent.click(screen.getByRole("button", { name: /^Change enrollment/ })); await act(async () => {});
    expect(heading()).toBe("Where are you in school?");
    expect(screen.getByRole("button", { name: "Back to review" })).toBeInTheDocument();
  });

  it("asks skills and certifications together, certifications optional", async () => {
    render(<IntakeFlow onBuild={() => {}} startAt="skills" initialAnswers={full} />);
    expect(screen.getByRole("heading", { level: 2, name: "Which skills are you comfortable with?" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /Do you have any of these certifications\?/ })).toBeInTheDocument();
    expect(screen.getByText("optional")).toBeInTheDocument();
  });

  it("puts every optional, personal question on one last screen that can be skipped in one tap", async () => {
    render(<IntakeFlow onBuild={() => {}} startAt="about" initialAnswers={{ ...full, experience: ["resume"] }} />);
    expect(heading()).toBe("About you (optional)");
    expect(screen.getByText(/Only used to hide programs you legally can't apply to/)).toBeInTheDocument();
    expect(screen.getByText(/never part of a share link/)).toBeInTheDocument();
    expect(screen.getByText(/never remove anything, and they never leave your browser/)).toBeInTheDocument();
    // Skipping replaces "Prefer not to say" for citizenship (gender keeps it as a real answer).
    expect(within(screen.getByRole("radiogroup", { name: "What's your citizenship status?" })).queryByRole("radio", { name: "Prefer not to say" })).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "New Jersey" })); advance(); await act(async () => {});
    expect(heading()).toBe("About you (optional)"); // optional screens never move on by themselves
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "New Jersey" })); // tap again to clear
    fireEvent.click(screen.getByRole("button", { name: "Skip these" })); await act(async () => {});
    expect(heading()).toBe("Check your answers");
    expect(saved().location).toBeUndefined();
  });

  it("goes back with Escape and resumes old saved steps on the right screen", async () => {
    localStorage.setItem(INTAKE_KEY, JSON.stringify({ answers: { ...nb, seen: ["status", "school", "major", "year"] }, step: "enrollment", returnToReview: false }));
    render(<IntakeFlow onBuild={() => {}} />);
    fireEvent.click(screen.getAllByRole("button", { name: /^Continue where you left off/ })[0]); await act(async () => {});
    await leaveLanding();
    expect(heading()).toBe("Where are you in school?");
    fireEvent.keyDown(window, { key: "Escape" }); await act(async () => {});
    expect(heading()).toBe("How soon do you want to get there?");
  });
});
