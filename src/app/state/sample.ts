import { emptyAnswers, type Answers } from "../intake/model.ts";

/**
 * "See a sample plan" (the landing): a made-up student, so a visitor can see a finished plan before answering anything.
 * A computer science sophomore at Rutgers–New Brunswick, fall semester, aiming for software engineering, with 5 free
 * hours a week, a resume and a club. The plan is built from these answers on the day it's opened, like any other.
 */
export const SAMPLE_ANSWERS: Answers = {
  ...emptyAnswers(), status: "college-student", majorId: "computer-science", year: 2, semester: 1, yearTerm: "2F",
  enrollment: "full-time", trackId: "software-engineering", horizon: "graduation", summer: "full", school: "rutgers-nb",
  location: "nj", weeklyHours: 5, experience: ["resume", "club"],
};

/** Who the sample is, in a sentence for the banner on the sample plan. */
export const SAMPLE_WHO = "a computer science sophomore at Rutgers–New Brunswick, aiming for software engineering, with 5 free hours a week";
