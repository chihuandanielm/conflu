import { describe, expect, it } from "vitest";
import { buildPlan } from "../../engine/engine.ts";
import { dataset } from "../data/dataset.ts";
import { emptyAnswers, firstIncomplete, isSummerBreak, questionSteps, experienceProfile, relevance, searchExperience, withFollowUps, stepsFor, toPlanInput, tracksForMajor, type Answers } from "./model.ts";
import { reducer, type IntakeState } from "./IntakeFlow.tsx";
import { answerText } from "./Review.tsx";

const cs: Answers = { ...emptyAnswers(), status: "college-student", majorId: "computer-science", year: 2, semester: 1, yearTerm: "2F", trackId: "software-engineering",
  horizon: "graduation", summer: "full", school: "rutgers-nb", enrollment: "full-time", location: "nj", experience: ["resume"], skills: ["python"] };

describe("steps", () => {
  it("asks about co-ops only for majors that have them", () => {
    expect(stepsFor(cs)).not.toContain("coop");
    expect(stepsFor({ ...cs, majorId: "mechanical-engineering" })).toContain("coop");
    expect(stepsFor({ ...cs, majorId: "pharmacy" })).toContain("coop");
  });
  it("counts 16 questions for a CS student and starts with intro, ends with review", () => {
    expect(questionSteps(cs)).toHaveLength(16);
    expect(stepsFor(cs).slice(4, 6)).toEqual(["year", "enrollment"]); // enrollment right after year, before the goal
    expect(stepsFor(cs)[0]).toBe("intro");
    expect(stepsFor(cs).at(-1)).toBe("review");
  });
  it("knows which required answers are missing", () => {
    expect(firstIncomplete(emptyAnswers())).toBe("status");
    expect(firstIncomplete({ ...cs, horizon: undefined })).toBe("horizon");
    expect(firstIncomplete({ ...cs, enrollment: undefined })).toBe("enrollment");
    expect(firstIncomplete({ ...cs, semester: undefined })).toBe("year"); // year and semester are one answer
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
  it("sends the semester, and gender only as identity tags", () => {
    const input = toPlanInput({ ...cs, semester: 2, gender: "woman", identity: ["first-generation"] }, "2026-11-15");
    expect(input.semester).toBe(2);
    expect(input.identity).toEqual(["first-generation", "women"]);
    expect(toPlanInput({ ...cs, gender: "skip" }, "2026-11-15").identity).toEqual([]);
  });
  it("sends the co-op answer only for co-op majors", () => {
    expect(toPlanInput({ ...cs, majorId: "pharmacy", openToCoop: false }, "2026-11-15").openToCoop).toBe(false);
  });
});

describe("relevance", () => {
  it("puts track-relevant tracks and experiences first", () => {
    expect(tracksForMajor("computer-science").suggested.map((t) => t.id)).toContain("software-engineering");
    expect(tracksForMajor("computer-science").others.map((t) => t.id)).not.toContain("exploring");
  });
  it("scores options outside the major as zero", () => {
    const externship = dataset.intake.experience.find((o) => o.id === "externship")!;
    expect(relevance(externship, "computer-science", "software-engineering")).toBe(0);
  });
});

describe("experience step", () => {
  it("suggests what students in the major commonly have done, not what their track values most", () => {
    const psych = experienceProfile("psychology").suggested;
    expect(psych).toHaveLength(8);
    expect(psych).toContain("research");
    expect(psych).not.toContain("hackathon");
    expect(psych).not.toContain("github");
    expect(experienceProfile("nursing").suggested.slice(0, 2)).toEqual(["externship", "clinical"]);
    expect(experienceProfile("computer-science").suggested).toEqual(expect.arrayContaining(["project", "github", "hackathon", "resume"]));
    expect(experienceProfile("packaging-engineering").suggested).toEqual(expect.arrayContaining(["coop", "pack-competition"]));
  });
  it("marks options tied only to other majors as less common, and every major gets the basics", () => {
    expect(experienceProfile("psychology").lessCommon.has("hackathon")).toBe(true);
    expect(experienceProfile("computer-science").lessCommon.has("hackathon")).toBe(false);
    expect(experienceProfile("nursing").lessCommon.has("resume")).toBe(false);
    for (const m of ["finance", "communication", "criminal-justice"]) {
      expect(experienceProfile(m).suggested).toContain("resume");
    }
  });
  it("never suggests follow-ups; they appear right after the option they build on, once it's picked", () => {
    for (const m of ["computer-science", "nursing", "finance"]) {
      expect(experienceProfile(m).suggested.some((id) => ["github-active", "open-source", "linkedin-strong", "leader"].includes(id))).toBe(false);
    }
    expect(withFollowUps(["github", "club"], [])).toEqual(["github", "club"]);
    expect(withFollowUps(["github", "club"], ["github"])).toEqual(["github", "github-active", "open-source", "club"]);
    expect(withFollowUps(["leader", "club"], ["leader"])).toEqual(["leader", "club"]); // picked follow-ups never vanish
    // In a group that lists the follow-ups itself, they still wait for their starting option.
    const online = ["linkedin", "linkedin-strong", "github", "github-active", "open-source", "portfolio"];
    expect(withFollowUps(online, [])).toEqual(["linkedin", "github", "portfolio"]);
    expect(withFollowUps(online, ["github"])).toEqual(["linkedin", "github", "github-active", "open-source", "portfolio"]);
  });
  it("searches labels and everyday words", () => {
    const ids = (q: string) => searchExperience(q).map((o) => o.id);
    expect(ids("intern")).toEqual(expect.arrayContaining(["internship-any", "internship-target", "coop", "government", "externship", "pharm-intern"]));
    expect(ids("EMT")).toEqual(["clinical"]);
    expect(ids("coffee chat")).toEqual(["info-interviews"]);
    expect(ids("  ")).toEqual([]);
    expect(ids("zzzz")).toEqual([]);
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
    expect(answerText("hours", cs)).toBe("5 hours a week outside class");
    expect(answerText("enrollment", { ...cs, enrollment: "part-time" })).toBe("Part-time");
    expect(answerText("citizenship", cs)).toBe("Skipped");
    expect(answerText("experience", { ...cs, experience: [] })).toBe("None yet");
  });
});
