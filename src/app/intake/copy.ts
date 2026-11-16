// Question wording. Options come from data/intake.json and data/ui/intake.json; only the prose lives here.
import type { StepId } from "./model.ts";
import { uiIntake } from "../data/dataset.ts";

export interface StepCopy { question: string; help?: string; why?: string }

export const COPY: Record<Exclude<StepId, "intro" | "review">, StepCopy> = {
  status: { question: "Where are you right now?" },
  major: { question: "What's your major?", help: "Pick the closest one. You can change it later." },
  year: { question: "What year are you in?" },
  school: { question: uiIntake.school.question, help: uiIntake.school.help, why: "Each campus has its own career center, research office, and programs, and offers different majors." },
  track: { question: "Where do you want to end up?", help: "Pick the path closest to what you want. Still exploring is a fine answer." },
  horizon: { question: "How soon do you want to get there?" },
  experience: { question: "What have you already done?", help: "Pick everything that applies. None yet is a fine answer." },
  skills: { question: "Which skills are you comfortable with?", help: "Only pick ones you could use on a project today." },
  credentials: { question: "Do you have any of these certifications?", why: "Certifications you already hold come off your plan." },
  hours: { question: "How many hours a week can you put toward this?", help: "Be realistic. The plan fits to this." },
  summer: { question: "What about summers?", help: "Many internships and research programs are full-time in summer." },
  coop: { question: uiIntake.coop.question, help: uiIntake.coop.help },
  location: { question: "Where are you based?", why: "New Jersey residents qualify for state programs, which we list first." },
  citizenship: { question: "What's your citizenship status?",
    why: "Only used to hide programs you legally can't apply to. If you skip, nothing is hidden." },
  identity: { question: "Anything else we should know?",
    help: "Optional. Pick any that apply.",
    why: "These only add programs you may be eligible for. They never remove anything, and they never leave your browser." },
};
