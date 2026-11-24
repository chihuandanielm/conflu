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
  /** Engine 0.12.0: wording for a timing other than on time, replacing 0.7.0's single `late`. "after-grad" falls back to
   *  "late", and "last-chance" to "late" when the term is also past the ideal window. */
  variants?: { when: "late" | "last-chance" | "after-grad"; title?: string; steps?: string[]; doneWhen?: string; why?: string; phases?: Phases }[];
  /** Engine 0.12.0: for a goal planned over several terms, the step indexes that belong to its first term, the ones in
   *  between, and its last term. */
  phases?: Phases;
  /** Yearly goal that pays off the following school year (FAFSA, outside scholarships): no round in the final year. */
  forNextYear?: boolean;
  /** Engine 0.10.0: fall and spring terms that must remain before graduation, counting the start term, for the goal to be
   *  finished and to pay off (a thesis 2, a minor 3). It never starts with fewer. */
  minTermsLeft?: number;
  /** Engine 0.10.0: goals that make this one pointless once they're done or their ideal window has opened (a practice
   *  career fair after a target internship). A career path that boosts this goal keeps it. */
  supersededBy?: string[];
  /** Engine 0.10.0: "only" = needs enrollment in one of `majors` (a BSW field placement, the NCLEX); a career path's
   *  weights never pull it into another major's plan. Default: a path may (skills anyone can learn). */
  majorRule?: "only";
  /** Engine 0.10.0: a goal offered in this one's place, with its weight, when this one can't start in time. */
  alternative?: string;
  /** Engine 0.10.0: only ever planned as another goal's alternative. */
  onlyAsAlternative?: boolean;
  /** Engine 0.11.0: the months an application round is open (1–12; wraps past December, so 9–1 is September to
   *  January). The goal is only started in a term that overlaps the round, and its timing line says when it opens or closes. */
  cycle?: { opens: number; closes: number };
  /** Engine 0.11.0: part of applying to grad or professional school, timed by `PlanInput.gradApps`: "apply" is the
   *  applications, "prep" is what they need (program list, statement, letters, test prep). */
  gradStep?: "prep" | "apply";
}

export interface Phases { start: number[]; continue: number[]; finish: number[] }
export type Timing = "early" | "on-time" | "late" | "last-chance" | "after-grad";

export interface Track {
  id: string;
  name: string;
  suggestedMajors: string[];
  description: string;
  /** What this field's recruiters or admissions committees weigh most, in one sentence (data 2026.11.17-1). */
  recruiterFocus?: string;
  /** Where recruiterFocus and the weights come from (docs/RECRUITER_PRIORITIES.md). */
  recruiterSources?: string[];
  competencyTarget: CompVector;
  boosts: Record<string, number>;
  gates: string[];
  suppress: string[];
  recruitingNote: string | null;
  outcome?: "job" | "grad-school"; // what the track leads to; decides the final-year must-do (engine 0.8.0)
  recruitingNoteUntil?: TermCode;  // last term the note applies to (engine 0.8.0); missing = always
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
  /** 1 = first (fall) semester, 2 = second (spring). Overrides the calendar when given (engine 0.8.0). */
  semester?: 1 | 2;
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
  /** Goals crossed out as "Not for me" (engine 0.9.0): a goal id drops every yearly round, "id@Y2" drops one. */
  skippedGoals?: string[];
  /** The draft map (engine 0.9.0): more options per term, for the student to cross out or mark done before finalizing. */
  draft?: boolean;
  /** Engine 0.11.0, grad-school tracks: apply in the final year ("this-cycle": what applications need finishes first, and
   *  applications happen before graduation), or the fall after graduation ("after-gap"). Missing or "not-sure": as before. */
  gradApps?: "this-cycle" | "after-gap" | "not-sure";
  /** Engine 0.13.0: "year-later" = graduating a year after the usual four (fifth-year, co-op, transfer pacing). The plan
   *  uses the runway of a year earlier and labels terms with the student's real year. Ignored in the first year. */
  graduation?: "on-time" | "year-later";
  previousPlan?: Record<string, TermCode>; // goalId -> term, for plan stability
}

export interface ScoreBreakdown { weight: number; coverage: number; urgency: number; eligibility: number; stability: number; total: number }

export interface PlanItem {
  goalId: string; title: string; lane: Goal["category"]; hours: number; partial: boolean; gate: boolean;
  score: ScoreBreakdown; why: string[]; resources: { id: string; name: string; url: string; note?: string }[];
  /** A timing variant's wording is in use (engine 0.12.0; 0.7.0 set it for `late` wording only). */
  late?: boolean;
  /** Engine 0.12.0: how the goal's timing stands in this term. */
  timing: Timing;
  /** Engine 0.12.0: what the site shows for this item, chosen for its timing: the steps and the done-when line. */
  text: { steps: string[]; doneWhen: string | null };
  /** Engine 0.12.0: for a goal planned in more than one term, which part this term is, and the steps that belong to it. */
  phase?: "start" | "continue" | "finish";
  phaseSteps?: number[];
  /** A quick, time-critical step placed on top of the goal cap (engine 0.8.0): it unlocks a must-do this term, or it has a deadline now. */
  essential?: boolean;
  /** How much this matters for the career path (engine 0.9.0): must = a must-do or essential step; high = weight >= 0.85;
   *  medium = weight >= 0.65; low = the rest. */
  importance: "must" | "high" | "medium" | "low";
  /** Draft map only (engine 0.9.0): an extra option beyond the time-sized plan. Takes no hours; finalizing drops it. */
  option?: boolean;
  /** Engine 0.11.0: for goals with an application round, whether it's open in this term or opens later in it. */
  cycle?: { status: "open" | "opens-this-term"; label: string };
}

export interface PlanTerm { code: TermCode; label: string; capacityHours: number; usedHours: number; summerBlock: boolean; items: PlanItem[] }

export interface Plan {
  meta: { engineVersion: string; dataVersion: string; generatedFor: string; track: string };
  competencies: { current: CompVector; target: CompVector; gap: CompVector };
  terms: PlanTerm[];
  ongoing: { goalId: string; title: string; why: string }[]; // standing habits shown beside the timeline
  edges: { from: string; to: string }[];
  /**
   * Goals not finished in this plan, as a queue. "continues": started in the plan and runs past its end (0.8.0). "next": would
   * join the plan with more time, highest priority first. "optional": lower priority for this time frame. "not-now": after
   * the time frame, needs a summer the student doesn't have, or legally unavailable. "past": an earlier stage that has passed
   * for this student's year (0.8.0); never shown, so the page doesn't read as "you missed this".
   */
  backlog: { goalId: string; title: string; reason: string; kind: "continues" | "next" | "optional" | "not-now" | "past" }[];
  done: string[];
  /** Goals the student crossed out (engine 0.9.0), so the site can list them with Undo. essential = a must-do for the track. */
  skipped: { goalId: string; title: string; essential: boolean }[];
  warnings: string[];
}
