// Major requirements by year (data/requirements.json): what a student should have completed for their major to be on track
// to graduate. Ticks are a per-browser convenience under cpm.courses.v1; they never change the plan.
import file from "../../../data/requirements.json";
import { campusOf } from "../../engine/engine.ts";
import type { PlanInput } from "../../engine/types.ts";
import { load, save } from "../state/storage.ts";

export interface CourseOption { code: string; title: string; credits?: string }
export type RequirementItem =
  | { id: string; year: number | null; kind: "course"; options: CourseOption[]; label?: string }
  | { id: string; year: number | null; kind: "elective"; text: string };
export interface MajorRequirements {
  majorId: string; campus: "nb" | "newark" | "camden"; degree: string; catalog: string; pageUrl: string; sources: string[];
  /** The catalog edition the list was transcribed from (e.g. "2026–2027"); absent for school pages that aren't a catalog. */
  edition?: string;
  /** When the list was last checked against its source (YYYY-MM-DD). */
  checked: string;
  /** official: the school's published year-by-year curriculum; prerequisites: years follow course level. */
  sequence: "official" | "prerequisites";
  credits?: { major?: string; total?: string };
  items: RequirementItem[]; rules: string[]; notes?: string[];
}

const all = (file as { requirements: MajorRequirements[] }).requirements;

export function requirementsFor(majorId: string | undefined, school: PlanInput["school"]): MajorRequirements | null {
  const campus = school ? campusOf(school) : "nb";
  if (!majorId || !campus) return null;
  return all.find((r) => r.majorId === majorId && r.campus === campus) ?? null;
}

export type Due = "done-by-now" | "this-year" | "later" | "any-time";
/** Courses from earlier years should be done by now; this year's are in progress; open requirements have no year. */
export function dueStatus(itemYear: number | null, studentYear: number): Due {
  if (itemYear === null) return "any-time";
  return itemYear < studentYear ? "done-by-now" : itemYear === studentYear ? "this-year" : "later";
}

export const COURSES_KEY = "cpm.courses.v1";
/** Ticked item ids per "campus/major". */
export type Ticks = Record<string, string[]>;
const keyOf = (r: MajorRequirements) => `${r.campus}/${r.majorId}`;

export function loadTicks(): Ticks {
  const t = load<Ticks>(COURSES_KEY);
  return t && typeof t === "object" ? t : {};
}
export const isTicked = (ticks: Ticks, r: MajorRequirements, id: string) => (ticks[keyOf(r)] ?? []).includes(id);
/** Ticks or unticks a requirement. `persist` false (the landing's sample plan) keeps it in memory only. */
export function toggleTick(ticks: Ticks, r: MajorRequirements, id: string, persist = true): Ticks {
  const k = keyOf(r), cur = ticks[k] ?? [];
  const next = { ...ticks, [k]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
  if (persist) save(COURSES_KEY, next);
  return next;
}

/** How many requirements from earlier years exist, and how many of them are ticked. */
export function progressFor(r: MajorRequirements, studentYear: number, ticks: Ticks): { due: number; done: number } {
  const due = r.items.filter((i) => dueStatus(i.year, studentYear) === "done-by-now");
  return { due: due.length, done: due.filter((i) => isTicked(ticks, r, i.id)).length };
}
