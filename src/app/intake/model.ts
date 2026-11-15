// Intake model: answers, the ordered step list (with branching), and the mapping to the engine's PlanInput.
// Pure functions only, so they're easy to test.
import type { Goal, PlanInput, Track } from "../../engine/types.ts";
import { CALENDAR } from "../../engine/engine.ts";
import { dataset, intake, majors, tracks, uiIntake } from "../data/dataset.ts";

export type Horizon = PlanInput["horizon"];
export type Summer = NonNullable<PlanInput["summer"]>;
export type Location = NonNullable<PlanInput["location"]>;
export type Citizenship = NonNullable<PlanInput["citizenship"]>;

export interface Answers {
  status?: "college-student";
  majorId?: string;
  year?: 1 | 2 | 3 | 4;
  school?: "rutgers-nb" | "other";
  trackId?: string;
  horizon?: Horizon;
  experience: string[];
  skills: string[];
  credentials: string[];
  weeklyHours: number;
  summer?: Summer;
  openToCoop?: boolean;
  location?: Location;
  citizenship?: Citizenship;
  identity: string[];
  /** Steps the student has passed (answered or skipped), so the review can say "Skipped". */
  seen: StepId[];
}

export const emptyAnswers = (): Answers => ({
  experience: [], skills: [], credentials: [], identity: [], weeklyHours: intake.defaultWeeklyHours, seen: [],
});

export type StepId =
  | "intro" | "status" | "major" | "year" | "school" | "track" | "horizon" | "experience" | "skills" | "credentials"
  | "hours" | "summer" | "coop" | "location" | "citizenship" | "identity" | "review";

export const coopMajors = new Set(uiIntake.coop.majors);

/** The steps this student sees, in order. The co-op question only appears for majors that offer co-ops. */
export function stepsFor(a: Answers): StepId[] {
  const s: StepId[] = ["intro", "status", "major", "year", "school", "track", "horizon", "experience", "skills", "credentials", "hours", "summer"];
  if (a.majorId && coopMajors.has(a.majorId)) s.push("coop");
  s.push("location", "citizenship", "identity", "review");
  return s;
}

/** Question steps only (no intro or review): what the "4 of 12" counter counts. */
export const questionSteps = (a: Answers): StepId[] => stepsFor(a).filter((s) => s !== "intro" && s !== "review");

export const OPTIONAL: ReadonlySet<StepId> = new Set(["school", "credentials", "location", "citizenship", "identity"]);
const MULTI: ReadonlySet<StepId> = new Set(["experience", "skills", "credentials", "identity"]);
export const isMulti = (s: StepId) => MULTI.has(s);

/** Whether a step has an answer that lets the student continue. Multi-select steps can continue with nothing picked. */
export function isAnswered(s: StepId, a: Answers): boolean {
  switch (s) {
    case "status": return a.status === "college-student";
    case "major": return !!a.majorId;
    case "year": return !!a.year;
    case "school": return !!a.school;
    case "track": return !!a.trackId;
    case "horizon": return !!a.horizon;
    case "hours": return a.weeklyHours > 0;
    case "summer": return !!a.summer;
    case "coop": return a.openToCoop !== undefined;
    case "location": return !!a.location;
    case "citizenship": return !!a.citizenship;
    default: return true;
  }
}

/** First step that still needs an answer, for resuming and for guarding the review. */
export function firstIncomplete(a: Answers): StepId | null {
  for (const s of questionSteps(a)) if (!OPTIONAL.has(s) && !isMulti(s) && !isAnswered(s, a)) return s;
  return null;
}

/** True between the end of spring exams and mid-August, when students should answer with their rising year. */
export function isSummerBreak(todayISO: string): boolean {
  const [, m, d] = todayISO.split("-").map(Number);
  const md = m * 100 + d, key = ([mm, dd]: readonly [number, number]) => mm * 100 + dd;
  return md >= key(CALENDAR.summer.start) && md < key(CALENDAR.summer.end);
}

export function toPlanInput(a: Answers, today: string, extra: Pick<PlanInput, "completedGoals" | "previousPlan"> = {}): PlanInput {
  if (!a.majorId || !a.year || !a.trackId) throw new Error("Intake is incomplete");
  return {
    status: "college-student",
    majorId: a.majorId,
    year: a.year,
    trackId: a.trackId,
    horizon: a.horizon ?? "graduation",
    today,
    weeklyHours: a.weeklyHours,
    summer: a.summer ?? "full",
    ...(coopMajors.has(a.majorId) && a.openToCoop !== undefined ? { openToCoop: a.openToCoop } : {}),
    school: a.school === "other" ? "other" : "rutgers-nb",
    ...(a.location ? { location: a.location } : {}),
    ...(a.citizenship ? { citizenship: a.citizenship } : {}),
    identity: [...a.identity],
    experience: [...a.experience],
    skills: [...a.skills],
    credentials: [...a.credentials],
    ...extra,
  };
}

// ---------- tracks ----------
export const EXPLORING = "exploring";
export function tracksForMajor(majorId: string | undefined): { suggested: Track[]; others: Track[]; exploring: Track | undefined } {
  const all = tracks.filter((t) => t.id !== EXPLORING);
  const suggested = majorId ? all.filter((t) => t.suggestedMajors.includes(majorId)) : [];
  const ids = new Set(suggested.map((t) => t.id));
  return { suggested, others: all.filter((t) => !ids.has(t.id)), exploring: tracks.find((t) => t.id === EXPLORING) };
}

// ---------- checklist relevance ----------
const goalsById = new Map<string, Goal>(dataset.goals.map((g) => [g.id, g]));
export interface ChecklistOption { id: string; label: string; completes: { goal: string; strength: number }[] }

/**
 * How relevant an intake option is to this student, from the goals it completes:
 * 2 + weight when the track boosts or requires the goal, 1 + base weight when the goal is open to the major, else 0.
 */
export function relevance(o: ChecklistOption, majorId?: string, trackId?: string): number {
  const track = tracks.find((t) => t.id === trackId);
  let best = 0;
  for (const { goal } of o.completes) {
    const g = goalsById.get(goal);
    if (!g || track?.suppress.includes(goal)) continue;
    if (track && (goal in track.boosts || track.gates.includes(goal))) best = Math.max(best, 2 + (track.boosts[goal] ?? 1));
    else if (!g.majors || (majorId && g.majors.includes(majorId))) best = Math.max(best, 1 + g.baseWeight);
  }
  return best;
}

export interface RankedGroup { id: string; label: string; score: number; options: (ChecklistOption & { score: number })[] }

/** Experience groups and their options, most relevant first. Ties keep the data file's order. */
export function rankExperienceGroups(majorId?: string, trackId?: string): RankedGroup[] {
  const byId = new Map(intake.experience.map((o) => [o.id, o]));
  return uiIntake.experienceGroups
    .map((g, gi) => {
      const options = g.options.map((id, i) => ({ ...byId.get(id)!, score: relevance(byId.get(id)!, majorId, trackId), i }))
        .sort((x, y) => y.score - x.score || x.i - y.i).map(({ i: _i, ...o }) => o);
      const top = options.slice(0, 3).reduce((s, o) => s + o.score, 0);
      return { id: g.id, label: g.label, score: top, options, gi };
    })
    .sort((x, y) => y.score - x.score || x.gi - y.gi)
    .map(({ gi: _gi, ...g }) => g);
}

export function rankOptions(options: ChecklistOption[], majorId?: string, trackId?: string) {
  return options.map((o, i) => ({ ...o, score: relevance(o, majorId, trackId), i }))
    .sort((x, y) => y.score - x.score || x.i - y.i).map(({ i: _i, ...o }) => o);
}

// ---------- labels for the review screen ----------
export const majorName = (id?: string) => majors.find((m) => m.id === id)?.name;
export const trackName = (id?: string) => tracks.find((t) => t.id === id)?.name;
export const optionLabel = (list: { id: string | number; label: string }[], id: unknown) => list.find((o) => o.id === id)?.label;
export const identityLabel = (tag: string) => (uiIntake.identityLabels as Record<string, string>)[tag] ?? tag;
