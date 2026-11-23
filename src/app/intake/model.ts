// Intake model: answers, the ordered step list (with branching), and the mapping to the engine's PlanInput.
// Pure functions only, so they're easy to test.
import type { Goal, PlanInput, Track } from "../../engine/types.ts";
import { CALENDAR, campusOf } from "../../engine/engine.ts";
import type { Major } from "../../types.ts";
import { dataset, intake, majors, tracks, uiIntake } from "../data/dataset.ts";

export type Horizon = PlanInput["horizon"];
export type Summer = NonNullable<PlanInput["summer"]>;
export type Location = NonNullable<PlanInput["location"]>;
export type Citizenship = NonNullable<PlanInput["citizenship"]>;
export type School = NonNullable<PlanInput["school"]>;
export type Enrollment = NonNullable<PlanInput["enrollment"]>;
export type GradApps = NonNullable<PlanInput["gradApps"]>;
export const SCHOOLS: readonly School[] = ["rutgers-nb", "rutgers-newark", "rutgers-camden", "other"];

/**
 * Majors a student at this school can pick: the ones their campus offers, or every major for another school
 * (or before the campus is known).
 */
export function majorsFor(school: School | undefined): Major[] {
  const campus = school ? campusOf(school) : null;
  return campus ? majors.filter((m) => campus in m.offeredAt) : majors;
}
export const majorOfferedAt = (majorId: string | undefined, school: School | undefined) =>
  !!majorId && majorsFor(school).some((m) => m.id === majorId);

export interface Answers {
  status?: "college-student";
  majorId?: string;
  year?: 1 | 2 | 3 | 4;
  /** 1 = fall, 2 = spring (engine 0.8.0). `yearTerm` keeps the exact answer, e.g. "3S" or "5+". */
  semester?: 1 | 2;
  yearTerm?: string;
  /** Optional gender answer id (data/intake.json gender.options); its tags join identity only in the plan input. */
  gender?: string;
  enrollment?: Enrollment;
  /** Grad-school paths only (engine 0.11.0): apply this coming cycle, after a gap year, or not sure yet. */
  gradApps?: GradApps;
  school?: School;
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
  | "intro" | "status" | "school" | "major" | "year" | "enrollment" | "track" | "horizon" | "gradApps" | "experience" | "skills" | "credentials"
  | "hours" | "summer" | "coop" | "location" | "citizenship" | "gender" | "identity" | "review";

export const coopMajors = new Set(uiIntake.coop.majors);
/** A career path that leads to grad or professional school, where the plan asks when the student will apply. */
export const isGradTrack = (trackId: string | undefined) => tracks.find((t) => t.id === trackId)?.outcome === "grad-school";

/**
 * Screens, in order (docs/INTAKE_ORDER.md). Small related questions share a screen; the goal comes right after the
 * major; strengths come before time limits; the optional, personal questions share the last screen. "Are you in
 * college?" is answered by the intro's start button, so it isn't a screen.
 */
export type ScreenId = "intro" | "study" | "track" | "horizon" | "year" | "experience" | "skills" | "time" | "about" | "review";
export interface Screen { id: Exclude<ScreenId, "intro" | "review">; parts: StepId[] }

/** The question screens this student sees. The co-op question only appears for majors that offer co-ops. */
export function screensFor(a: Answers): Screen[] {
  return [
    { id: "study", parts: ["school", "major"] },
    { id: "track", parts: ["track"] },
    { id: "horizon", parts: isGradTrack(a.trackId) ? ["horizon", "gradApps"] : ["horizon"] },
    { id: "year", parts: ["year", "enrollment"] },
    { id: "experience", parts: ["experience"] },
    { id: "skills", parts: ["skills", "credentials"] },
    { id: "time", parts: a.majorId && coopMajors.has(a.majorId) ? ["hours", "summer", "coop"] : ["hours", "summer"] },
    { id: "about", parts: ["location", "citizenship", "gender", "identity"] },
  ];
}

/** Every screen in order, intro to review: what Back and Continue walk through. */
export const stepsFor = (a: Answers): ScreenId[] => ["intro", ...screensFor(a).map((s) => s.id), "review"];

/** Every question in the order it's asked (the review lists them in this order). */
export const questionSteps = (a: Answers): StepId[] => screensFor(a).flatMap((s) => s.parts);

/** The screen that asks a question. Also maps steps saved by older versions (one question per screen) to their screen. */
export function screenOf(s: StepId | ScreenId, a: Answers): ScreenId {
  if (s === "intro" || s === "review") return s;
  if (s === "status") return "study";
  if (s === "coop") return "time";
  return screensFor(a).find((x) => x.id === s || x.parts.includes(s as StepId))?.id ?? "study";
}

export const OPTIONAL: ReadonlySet<StepId> = new Set(["credentials", "location", "citizenship", "gender", "identity"]);
const MULTI: ReadonlySet<StepId> = new Set(["experience", "skills", "credentials", "identity"]);
export const isMulti = (s: StepId) => MULTI.has(s);

/** Whether a step has an answer that lets the student continue. Multi-select steps can continue with nothing picked. */
export function isAnswered(s: StepId, a: Answers): boolean {
  switch (s) {
    case "status": return a.status === "college-student";
    case "major": return majorOfferedAt(a.majorId, a.school);
    case "year": return !!a.year && !!a.semester;
    case "gender": return !!a.gender;
    case "enrollment": return !!a.enrollment;
    case "gradApps": return !!a.gradApps;
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

/** Every required step still missing an answer, in order (the review lists them). */
export function missingSteps(a: Answers): StepId[] {
  return questionSteps(a).filter((s) => !OPTIONAL.has(s) && !isMulti(s) && !isAnswered(s, a));
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
    ...(a.semester ? { semester: a.semester } : {}),
    trackId: a.trackId,
    horizon: a.horizon ?? "graduation",
    today,
    weeklyHours: a.weeklyHours,
    summer: a.summer ?? "full",
    ...(coopMajors.has(a.majorId) && a.openToCoop !== undefined ? { openToCoop: a.openToCoop } : {}),
    school: a.school ?? "rutgers-nb",
    enrollment: a.enrollment ?? "full-time",
    ...(isGradTrack(a.trackId) && a.gradApps ? { gradApps: a.gradApps } : {}),
    ...(a.location ? { location: a.location } : {}),
    ...(a.citizenship ? { citizenship: a.citizenship } : {}),
    identity: [...new Set([...a.identity, ...genderTags(a.gender)])],
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

// ---------- the experience step ----------
// "What have you already done?" asks about likelihood, not value: it suggests what students in the major commonly
// have done by now, so a psychology student sees research and volunteering rather than GitHub. Labels, groups,
// search words, follow-ups, and overrides live in data/ui/intake.json.
export interface ExperienceGroup { id: string; label: string; hint: string; options: string[] }
export const experienceGroups = uiIntake.experienceGroups as ExperienceGroup[];
const followUps = uiIntake.experienceFollowUps as Record<string, string[]>;
const followerOf = new Map(Object.entries(followUps).flatMap(([k, fs]) => fs.map((f) => [f, k] as const)));
const expById = new Map(intake.experience.map((o) => [o.id, o as ChecklistOption]));
const keywords = uiIntake.experienceKeywords as Record<string, string>;
const SUGGESTED_COUNT = 8;
const MAJOR_OWN_MAX = 4;

/**
 * What a major's students commonly have done (`suggested`, 8 ids) and which options are tied only to other majors
 * (`lessCommon`, shown behind a link). An option is the major's own when one of its goals is limited to the major,
 * or when at least half of the major's suggested career tracks weight it 0.7+ or require it. Up to 4 of those come
 * first, then the universal basics. A major in experienceSuggested uses that hand-picked list instead.
 */
export function experienceProfile(majorId: string | undefined): { suggested: string[]; lessCommon: Set<string> } {
  const basics = uiIntake.experienceBasics as string[];
  if (!majorId) return { suggested: basics.slice(0, SUGGESTED_COUNT), lessCommon: new Set() };
  const majorTracks = tracks.filter((t) => t.suggestedMajors.includes(majorId));
  const own = intake.experience.map((o, i) => {
    let s = 0;
    for (const { goal } of o.completes) {
      const g = goalsById.get(goal);
      if (g?.majors?.includes(majorId)) s = Math.max(s, 1 + g.baseWeight);
    }
    const share = majorTracks.filter((t) => o.completes.some(({ goal }) => (t.boosts[goal] ?? 0) >= 0.7 || t.gates.includes(goal))).length
      / Math.max(1, majorTracks.length);
    if (share >= 0.5) s += 1 + share;
    return { id: o.id, s, i };
  }).filter((x) => x.s > 0 && !followerOf.has(x.id) && !basics.includes(x.id) && x.id !== "internship-target")
    .sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.id);
  const override = (uiIntake.experienceSuggested as Record<string, string[]>)[majorId];
  const suggested = override ? [...override] : own.slice(0, MAJOR_OWN_MAX);
  for (const b of basics) if (suggested.length < SUGGESTED_COUNT && !suggested.includes(b)) suggested.push(b);
  const lessCommon = new Set(intake.experience.filter((o) => o.completes.every(({ goal }) => {
    const g = goalsById.get(goal);
    return !!g?.majors && !g.majors.includes(majorId);
  })).map((o) => o.id));
  return { suggested, lessCommon };
}

/** Hides follow-ups until their starting option is picked, then lists them right after it. Picked ones always show. */
export function withFollowUps(ids: string[], picked: string[]): string[] {
  const out: string[] = [];
  for (const id of ids) {
    if (followerOf.has(id) && !picked.includes(id)) continue;
    if (!out.includes(id)) out.push(id);
    if (picked.includes(id)) for (const f of followUps[id] ?? []) if (!out.includes(f)) out.push(f);
  }
  return out;
}

/** Options whose label or everyday words contain every word typed, in data order. */
export function searchExperience(q: string): ChecklistOption[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return intake.experience.filter((o) => {
    const hay = `${o.label} ${keywords[o.id] ?? ""}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
export const experienceOption = (id: string) => expById.get(id);

export function rankOptions(options: ChecklistOption[], majorId?: string, trackId?: string) {
  return options.map((o, i) => ({ ...o, score: relevance(o, majorId, trackId), i }))
    .sort((x, y) => y.score - x.score || x.i - y.i).map(({ i: _i, ...o }) => o);
}

// ---------- labels for the review screen ----------
export const majorName = (id?: string) => majors.find((m) => m.id === id)?.name;
/** "Rutgers–Newark", or "Another school". A plan saved before the campus question existed was planned for New Brunswick. */
export const campusName = (school?: School) => uiIntake.school.options.find((o) => o.id === (school ?? "rutgers-nb"))?.label ?? "";
export const trackName = (id?: string) => tracks.find((t) => t.id === id)?.name;
export const optionLabel = (list: { id: string | number; label: string }[], id: unknown) => list.find((o) => o.id === id)?.label;
/** Identity tags for a gender answer: "woman" adds women's programs, "man" men's (men in nursing), "nonbinary" non-binary-inclusive ones. */
export const genderTags = (id?: string): string[] => intake.gender.options.find((o) => o.id === id)?.tags ?? [];
/** "Third year, spring semester" (or "Fifth year or later"). */
export const yearTermLabel = (a: Pick<Answers, "year" | "semester" | "yearTerm">) =>
  intake.yearTerms.find((y) => y.id === a.yearTerm)?.label ?? intake.yearTerms.find((y) => y.year === a.year && y.semester === a.semester)?.label;
export const identityLabel = (tag: string) => (uiIntake.identityLabels as Record<string, string>)[tag] ?? tag;
