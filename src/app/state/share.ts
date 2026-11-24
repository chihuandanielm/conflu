// Shareable link: the answers go in the URL hash (never sent to a server; browsers don't transmit the hash).
// Identity and citizenship are never included. Opening the link pre-fills the review screen.
import { intake, majors, tracks } from "../data/dataset.ts";
import { coopMajors, emptyAnswers, majorOfferedAt, SCHOOLS, type Answers } from "../intake/model.ts";

const KEY = "plan";

interface Shared { v: 1; m: string; y: number; q?: string; t: string; h?: string; s?: string; n?: string; g?: string; d?: 1; w?: number; u?: string; c?: 0 | 1; l?: string; e?: string[]; k?: string[]; r?: string[] }

const b64url = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)));

export function shareHash(a: Answers): string {
  if (!a.majorId || !a.year || !a.trackId) throw new Error("Intake is incomplete");
  const s: Shared = { v: 1, m: a.majorId, y: a.year, t: a.trackId, h: a.horizon, s: a.school, n: a.enrollment, g: a.gradApps, d: a.graduation === "year-later" ? 1 : undefined, q: a.yearTerm, w: a.weeklyHours, u: a.summer,
    c: a.openToCoop === undefined ? undefined : a.openToCoop ? 1 : 0, l: a.location, e: a.experience, k: a.skills, r: a.credentials };
  return `#${KEY}=${b64url(JSON.stringify(s))}`;
}

/** Answers from a shared link, with every value checked against the data. Unknown values are dropped. */
export function parseShareHash(hash: string): Answers | null {
  const m = hash.match(new RegExp(`^#${KEY}=([A-Za-z0-9_-]+)$`));
  if (!m) return null;
  let s: Partial<Shared>;
  try { s = JSON.parse(unb64url(m[1])); } catch { return null; }
  if (s.v !== 1 || !majors.some((x) => x.id === s.m) || !tracks.some((x) => x.id === s.t) || ![1, 2, 3, 4].includes(s.y as number)) return null;
  const pick = <T extends string>(v: unknown, allowed: readonly T[]) => (allowed.includes(v as T) ? (v as T) : undefined);
  // Links made before the campus question (or that skipped it) were planned for New Brunswick.
  const school = s.s === undefined ? "rutgers-nb" : pick(s.s, SCHOOLS);
  if (!school || !majorOfferedAt(s.m, school)) return null;
  const list = (v: unknown, options: { id: string }[]) => (Array.isArray(v) ? v.filter((x): x is string => options.some((o) => o.id === x)) : []);
  const a: Answers = {
    ...emptyAnswers(),
    status: "college-student",
    majorId: s.m,
    year: s.y as Answers["year"],
    trackId: s.t,
    horizon: pick(s.h, intake.horizons.map((h) => h.id as NonNullable<Answers["horizon"]>)),
    school,
    // Year and semester; links made before the semester question keep the calendar's guess (no semester).
    ...(() => { const yt = intake.yearTerms.find((x) => x.id === s.q && x.year === s.y); return yt ? { yearTerm: yt.id, semester: yt.semester as 1 | 2 } : {}; })(),
    // Links made before the enrollment question were planned at a full-time pace.
    enrollment: pick(s.n, intake.enrollment.map((x) => x.id as NonNullable<Answers["enrollment"]>)) ?? "full-time",
    graduation: s.d === 1 ? "year-later" : "on-time",
    gradApps: pick(s.g, intake.gradApps.map((x) => x.id as NonNullable<Answers["gradApps"]>)),
    weeklyHours: intake.weeklyHours.includes(s.w as number) ? (s.w as number) : intake.defaultWeeklyHours,
    summer: pick(s.u, intake.summerAvailability.map((x) => x.id as NonNullable<Answers["summer"]>)),
    openToCoop: coopMajors.has(s.m!) && (s.c === 0 || s.c === 1) ? s.c === 1 : undefined,
    location: pick(s.l, intake.location.map((x) => x.id as NonNullable<Answers["location"]>)),
    experience: list(s.e, intake.experience),
    skills: list(s.k, intake.skills),
    credentials: list(s.r, intake.credentials),
  };
  a.seen = ["status", "school", "major", "year", "enrollment", "graduation", "track", "horizon", "gradApps", "experience", "skills", "credentials", "hours", "summer", "coop", "location"];
  return a;
}
