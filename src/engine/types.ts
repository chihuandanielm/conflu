// Engine types. The engine is a pure function: (PlanInput, Dataset) -> Plan.

export type TermCode = string; // "1F" | "1S" | "1U" | ... | "4S" | "G1" | "G2"
export type Competency = "csd" | "comm" | "crit" | "equity" | "lead" | "prof" | "team" | "tech";
export type CompVector = Partial<Record<Competency, number>>;

export interface Goal {
  id: string;
  title: string;
  category: "foundation" | "presence" | "skills" | "experience" | "network" | "credentials" | "academics" | "applications";
  competencies: CompVector;
  baseWeight: number;          // 0–1 importance when no track overrides it
  hours: number;               // total effort
  spanTerms: number;           // terms the effort is spread across
  window: { earliest: TermCode; ideal: [TermCode, TermCode]; latest: TermCode };
  prereqs: string[];
  season: "summer" | null;
  deadline: string | null;     // human text; presence pins the goal in scheduling pass 1
  repeat: "yearly" | null;
  majors: string[] | null;     // null = all majors
  resources: string[];
  splittable: boolean;
  lateOk: boolean;
  integrated: boolean;         // done inside coursework; costs no free-time capacity
  satisfies: string[];
  requires?: string[];         // legal eligibility: "us-citizen-or-pr" | "not-international"         // completing this goal also completes these (a co-op covers the target internship)
  why: string;
  /** What to do, in order (3–6 steps), how the student knows it's done, and how-to guide resource ids. Display only: the engine never reads these. */
  steps?: string[];
  doneWhen?: string;
  guides?: string[];
  /** Wording for when the goal is scheduled after its ideal window (engine 0.7.0). */
  late?: { title: string; steps?: string[]; doneWhen?: string };
  /** Yearly goal that pays off the following school year (FAFSA, outside scholarships): no round in the final year. */
  forNextYear?: boolean;
}

export interface Track {
  id: string;
  name: string;
  suggestedMajors: string[];
  description: string;
  competencyTarget: CompVector;
  boosts: Record<string, number>;
  gates: string[];
  suppress: string[];
  recruitingNote: string | null;
  windowOverrides?: Record<string, string>; // goalId -> "E I1-I2 L" term codes
}

export interface ResourceLite {
  id: string; name: string; type: string; scope: string; majors: string[]; years: (number | string)[];
  identity: string[]; status: string; statusNote: string | null; url: string; summary: string;
  campuses?: string[];         // Rutgers resources only: campus ids ("nb", "newark", "camden") or ["all"]
  verification: { state: string };
}

export interface IntakeOption { id: string; label: string; completes: { goal: string; strength: number }[] }

export interface Dataset {
  version: string;
  terms: TermCode[];
  goals: Goal[];
  tracks: Track[];
  resources: ResourceLite[];
  intake: {
    experience: IntakeOption[]; skills: IntakeOption[]; credentials: IntakeOption[];
    horizons: { id: string; terms: number | null; extraTerms?: number }[];
    summerAvailability: { id: string; multiplier: number }[];
    defaultWeeklyHours: number;
  };
}

export interface PlanInput {
  status: "college-student";
  majorId: string;
  year: 1 | 2 | 3 | 4;
  trackId: string;
  horizon: "6mo" | "1yr" | "2yr" | "graduation" | "after-graduation";
  today: string;                       // ISO date; decides the current term and how much of it is left
  weeklyHours?: number;
  summer?: "full" | "part" | "none";
  openToCoop?: boolean;
  /** Missing means full-time, as before engine 0.5.0. Part-time only adds a plan note; scheduling is the same. */
  enrollment?: "full-time" | "part-time";
  school?: "rutgers-nb" | "rutgers-newark" | "rutgers-camden" | "other"; // missing = New Brunswick (pre-0.4 default)
  location?: "nj" | "us-other" | "outside-us" | "skip";
  citizenship?: "us-citizen" | "us-pr" | "international" | "undocumented" | "skip";
  identity?: string[];
  experience?: string[];
  skills?: string[];
  credentials?: string[];
  completedGoals?: string[];           // goals checked off on the map
  previousPlan?: Record<string, TermCode>; // goalId -> term, for plan stability
}

export interface ScoreBreakdown { weight: number; coverage: number; urgency: number; eligibility: number; stability: number; total: number }

export interface PlanItem {
  goalId: string; title: string; lane: Goal["category"]; hours: number; partial: boolean; gate: boolean;
  score: ScoreBreakdown; why: string[]; resources: { id: string; name: string; url: string; note?: string }[];
  /** Scheduled after its ideal window, so the title (and the steps the site shows) use the goal's `late` wording. */
  late?: boolean;
}

export interface PlanTerm { code: TermCode; label: string; capacityHours: number; usedHours: number; summerBlock: boolean; items: PlanItem[] }

export interface Plan {
  meta: { engineVersion: string; dataVersion: string; generatedFor: string; track: string };
  competencies: { current: CompVector; target: CompVector; gap: CompVector };
  terms: PlanTerm[];
  ongoing: { goalId: string; title: string; why: string }[]; // standing habits shown beside the timeline
  edges: { from: string; to: string }[];
  /**
   * Goals not in this plan, as a queue (engine 0.6.0): "next" would join the plan with more time, highest priority first;
   * "optional" is lower priority for this time frame; "not-now" is outside the time frame, past its window, or unavailable.
   */
  backlog: { goalId: string; title: string; reason: string; kind: "next" | "optional" | "not-now" }[];
  done: string[];
  warnings: string[];
}
