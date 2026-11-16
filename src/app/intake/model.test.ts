import { describe, expect, it } from "vitest";
import { buildPlan } from "../../engine/engine.ts";
import { dataset } from "../data/dataset.ts";
import { emptyAnswers, firstIncomplete, isSummerBreak, questionSteps, rankExperienceGroups, relevance, stepsFor, toPlanInput, tracksForMajor, type Answers } from "./model.ts";
import { reducer, type IntakeState } from "./IntakeFlow.tsx";
import { answerText } from "./Review.tsx";

const cs: Answers = { ...emptyAnswers(), status: "college-student", majorId: "computer-science", year: 2, trackId: "software-engineering",
  horizon: "graduation", summer: "full", school: "rutgers-nb", location: "nj", experience: ["resume"], skills: ["python"] };

describe("steps", () => {
  it("asks about co-ops only for majors that have them", () => {
    expect(stepsFor(cs)).not.toContain("coop");
    expect(stepsFor({ ...cs, majorId: "mechanical-engineering" })).toContain("coop");
    expect(stepsFor({ ...cs, majorId: "pharmacy" })).toContain("coop");
  });
  it("counts 14 questions for a CS student and starts with intro, ends with review", () => {
    expect(questionSteps(cs)).toHaveLength(14);
    expect(stepsFor(cs)[0]).toBe("intro");
    expect(stepsFor(cs).at(-1)).toBe("review");
  });
  it("knows which required answers are missing", () => {
    expect(firstIncomplete(emptyAnswers())).toBe("status");
    expect(firstIncomplete({ ...cs, horizon: undefined })).toBe("horizon");
    expect(firstIncomplete(cs)).toBeNull();
  });
  it("detects summer break with the engine's calendar", () => {
    expect(isSummerBreak("2026-06-15")).toBe(true);
    expect(isSummerBreak("2026-11-15")).toBe(false);
    expect(isSummerBreak("2026-08-20")).toBe(false);
  });
});

describe("plan input", () => {
  it("maps answers to a PlanInput the engine accepts", () => {
    const input = toPlanInput(cs, "2026-11-15");
    expect(input).toMatchObject({ majorId: "computer-science", year: 2, trackId: "software-engineering", weeklyHours: 5, school: "rutgers-nb", location: "nj" });
    expect(input).not.toHaveProperty("citizenship");
    expect(input).not.toHaveProperty("openToCoop");
    expect(buildPlan(input, dataset).terms[0].code).toBe("2F");
  });
  it("sends the co-op answer only for co-op majors", () => {
    expect(toPlanInput({ ...cs, majorId: "pharmacy", openToCoop: false }, "2026-11-15").openToCoop).toBe(false);
  });
});

describe("relevance", () => {
  it("puts track-relevant tracks and experiences first", () => {
    expect(tracksForMajor("computer-science").suggested.map((t) => t.id)).toContain("software-engineering");
    expect(tracksForMajor("computer-science").others.map((t) => t.id)).not.toContain("exploring");
    expect(rankExperienceGroups("computer-science", "software-engineering")[0].id).toBe("online-presence");
    expect(rankExperienceGroups("nursing", "nursing-clinical")[0].options[0].id).toBe("externship");
  });
  it("scores options outside the major as zero", () => {
    const externship = dataset.intake.experience.find((o) => o.id === "externship")!;
    expect(relevance(externship, "computer-science", "software-engineering")).toBe(0);
  });
});

describe("reducer", () => {
  const at = (step: IntakeState["step"], returnToReview = false): IntakeState => ({ answers: cs, step, returnToReview });
  it("moves forward and back through the steps", () => {
    expect(reducer(at("major"), { type: "next" }).step).toBe("year");
    expect(reducer(at("year"), { type: "back" }).step).toBe("major");
    expect(reducer(at("status"), { type: "back" }).step).toBe("intro");
  });
  it("returns to review after editing from the review screen", () => {
    expect(reducer(at("hours", true), { type: "next" }).step).toBe("review");
    expect(reducer(at("hours", true), { type: "back" }).step).toBe("review");
  });
  it("records passed steps so the review can say Skipped", () => {
    const s = reducer(at("school"), { type: "next" });
    expect(s.answers.seen).toContain("school");
  });
  it("toggles checklist answers", () => {
    const s = reducer(at("skills"), { type: "toggle", field: "skills", id: "sql" });
    expect(s.answers.skills).toEqual(["python", "sql"]);
    expect(reducer(s, { type: "toggle", field: "skills", id: "python" }).answers.skills).toEqual(["sql"]);
  });
});

describe("review text", () => {
  it("describes answers in plain words", () => {
    expect(answerText("major", cs)).toBe("Computer Science");
    expect(answerText("hours", cs)).toBe("5 hours a week");
    expect(answerText("citizenship", cs)).toBe("Skipped");
    expect(answerText("experience", { ...cs, experience: [] })).toBe("None yet");
  });
});
