// Question wording. Options come from data/intake.json and data/ui/intake.json; only the prose lives here.
import type { ScreenId, StepId } from "./model.ts";
import { uiIntake } from "../data/dataset.ts";

export interface StepCopy { question: string; help?: string; why?: string }

export const COPY: Record<Exclude<StepId, "intro" | "review">, StepCopy> = {
  status: { question: "Where are you right now?" },
  major: { question: "What's your major?", help: "Pick the closest one. You can change it later." },
  year: { question: "Where are you in school?", help: "Pick your year, then fall or spring. Part-time or transferred? Choose the year that matches your credits so far." },
  gender: { question: "What's your gender?", help: "Optional. Only used to show programs for students of your gender, like women in science or men in nursing.",
    why: "It stays on this device and is never part of a share link." },
  enrollment: { question: "Are you a full-time or part-time student?", why: "The plan spaces goals at a full-time pace; part-time students get a note on what to adjust." },
  school: { question: uiIntake.school.question, help: uiIntake.school.help, why: "Each campus has its own career center, research office, and programs, and offers different majors." },
  track: { question: "Where do you want to end up?", help: "Pick the path closest to what you want. Still exploring is a fine answer." },
  horizon: { question: "How soon do you want to get there?" },
  graduation: { question: "When do you expect to graduate?", why: "Graduating a year later gives your plan a year more to work with." },
  gradApps: { question: "When do you plan to apply?", why: "Applying this cycle puts your statement, letters, and program list first, in your final year." },
  experience: { question: "What have you already done?", help: "Tap anything that fits and skip the rest. A rough answer is fine; you can change it later." },
  skills: { question: "Which skills are you comfortable with?", help: "Only pick ones you could use on a project today." },
  credentials: { question: "Do you have any of these certifications?", why: "Certifications you already hold come off your plan." },
  hours: { question: "How many hours a week can you give your career, outside classes?", help: "Count only the free time left after classes, studying, work, and family. It is a budget, not homework: it decides how much goes in each semester. A rough guess is fine, and you can change it on your plan anytime." },
  summer: { question: "What about summers?", help: "Many internships and research programs are full-time in summer." },
  coop: { question: uiIntake.coop.question, help: uiIntake.coop.help },
  location: { question: "Where are you based?", why: "New Jersey residents qualify for state programs, which we list first." },
  citizenship: { question: "What's your citizenship status?",
    why: "Only used to hide programs you legally can't apply to. If you skip, nothing is hidden." },
  identity: { question: "Anything else we should know?",
    help: "Optional. Pick any that apply.",
    why: "These only add programs you may be eligible for. They never remove anything, and they never leave your browser." },
};

/** Titles for screens that ask more than one question; one-question screens use that question's wording. */
export const SCREEN_COPY: Partial<Record<ScreenId, StepCopy>> = {
  study: { question: "What do you study?", help: "Pick your campus, then your major." },
  year: { question: "Where are you in school?" },
  horizon: { question: "Your timing" }, // only used when it also asks when a grad-school applicant will apply
  skills: { question: "What can you already do?", help: "Tap anything that fits and skip the rest." },
  time: { question: "How much time do you have?", help: "A rough guess is fine. The plan fits to it." },
  about: { question: "About you (optional)",
    help: "Everything here is optional. Answers only add programs you may qualify for, or hide ones you can't apply to." },
};

/** A question's heading when it shares a screen and its own wording would repeat the screen title. */
export const PART_TITLE: Partial<Record<StepId, string>> = { year: "Year and semester" };

/** Help shown under each question when it shares a screen (shorter than the one-question version). */
export const PART_HELP: Partial<Record<StepId, string>> = {
  hours: "Count only the free time left after classes, studying, work, and family.",
  skills: "Only pick ones you could use on a project today.",
};

/** What a missing required answer says, in color, when the student tries to continue without it. */
export const MISSING: Partial<Record<StepId, string>> = {
  school: "Pick your campus to continue.",
  major: "Pick your major to continue.",
  year: "Pick your year and semester to continue.",
  enrollment: "Pick full-time or part-time to continue.",
  track: "Pick the goal closest to yours to continue.",
  horizon: "Pick a time frame to continue.",
  gradApps: "Pick when you plan to apply to continue.",
  summer: "Pick what works for your summers to continue.",
  coop: "Answer yes or no to continue.",
};
