// Reference implementation of the planning engine described in docs/ALGORITHM.md.
// Pure and deterministic: same input + same dataset => same plan.
import type {
  Competency, CompVector, Dataset, Goal, Plan, PlanInput, PlanItem, PlanTerm, ResourceLite,
  ScoreBreakdown, TermCode, Timing, Track,
} from "./types.ts";

export const ENGINE_VERSION = "0.14.0";

// ---- Tunable constants (documented in ALGORITHM.md §6). Change them in one place. ----
export const K = {
  realism: 0.8,             // share of stated weekly hours that actually gets used
  weeks: { F: 14, S: 14, U: 10, G: 14 },
  competencyGain: 0.35,     // how much one goal moves a competency (diminishing returns)
  coverageAlpha: 0.5,       // bonus for covering the student's biggest gaps
  eligibilityBoost: 0.15,   // bonus when a goal has programs matching the student's identity
  stabilityBonus: 0.1,      // keeps goals in the term they were planned for last time
  thresholdBase: 0.45,      // minimum weight to make the plan with a full runway
  maxShare: 0.5,            // first pass: one goal may take at most this share of a term's free hours
  pinBonus: 1.25,           // gates and deadline-driven goals get this multiplier
  quickWinHours: 3,
  focusBoost: 1.3,          // short time frames favor applications and networking over long-build goals
  focusRunway: 0.5,
  coopFlexShare: 0.3,       // share of normal free hours left during a co-op semester         // goals this small that are due go first; they cost almost nothing
  thresholdSqueeze: 0.35,   // extra threshold as the horizon shrinks
  earlyFloor: 0.55,         // urgency before the ideal window opens
  lateCeiling: 0.6,         // max extra urgency as the latest term approaches
  pastLatest: 0.5,          // urgency for lateOk goals after their window
  blockHours: 300,          // a goal this big needs a full-time block (summer or co-op term)
  fullBlockHours: 350,      // per-term hours above which a full (not part) summer is needed
  minChunk: 4,              // smallest partial placement, in hours
  prereqInherit: 0.9,       // prerequisites inherit this share of their dependent's weight
  gateWeight: 0.95,
  staleTerms: 3,            // a goal whose ideal window ended this many terms ago is a catch-up, not a priority
  staleDiscount: 0.6,       // catch-ups score this share, so an upper-year student's own goals come first
  blockingBoost: 1.4,       // prerequisites of a goal that's due now or next term
  goalCapBase: 2,           // baby steps: at most goalCapBase + weeklyHours / goalCapPerHours goals in a term,
  goalCapPerHours: 4,       //   between goalCapMin and goalCapMax (2 h/week: 3 goals; 10: 5; 20: 6)
  goalCapMin: 3,
  goalCapMax: 6,
  finalTermCap: 3,          // engine 0.13.0: the last semester before graduation holds at most this many (plus must-dos)
  sameTermPrereqHours: 6,   // a prerequisite this small finished earlier in a term unlocks its dependent that term
  draftCapScale: 2,         // engine 0.9.0: the draft map adds options up to this many times the goal cap per term,
  draftCapMax: 10,          //   at most this many (plus must-dos), so the student sees more to choose from
  importanceHigh: 0.85,     // weight at or above which an item is "high" importance for the career path
  importanceMedium: 0.65,   // ... "medium"; below is "low"
};

const COMP_NAMES: Record<Competency, string> = {
  csd: "career self-development", comm: "communication", crit: "critical thinking", equity: "equity and inclusion",
  lead: "leadership", prof: "professionalism", team: "teamwork", tech: "technology",
};
const COMPS = Object.keys(COMP_NAMES) as Competency[];
const CATEGORY_ORDER = ["foundation", "presence", "skills", "experience", "network", "credentials", "academics", "applications"];

// ---------- terms ----------
function seasonOf(code: TermCode): "F" | "S" | "U" | "G" { return code.startsWith("G") ? "G" : (code[1] as "F" | "S" | "U"); }
function yearOfIdx(i: number): number { return Math.floor(i / 3) + 1; } // G terms -> 5
/** `yearShift` (engine 0.13.0): years added to the label, for a student graduating later than the usual four. */
export function termLabel(code: TermCode, yearShift = 0): string {
  if (code === "G1") return "After graduation · first fall";
  if (code === "G2") return "After graduation · first spring";
  const y = code[0], s = seasonOf(code);
  const yy = Number(y) + yearShift;
  return s === "U" ? `Summer after year ${yy}` : `Year ${yy} · ${s === "F" ? "Fall" : "Spring"}`;
}

/**
 * Term boundaries, [month, day] (1-based months), from the Rutgers–New Brunswick academic calendar
 * (2026–27: fall classes Sep 1, fall exams end Dec 22; spring classes Jan 19, spring exams end May 12).
 * Summer runs from the end of spring exams to mid-August; August plans the coming fall.
 */
export const CALENDAR = {
  fall: { start: [9, 1], end: [12, 22] },
  spring: { start: [1, 19], end: [5, 12] },
  summer: { start: [5, 13], end: [8, 15] },
} as const;

/**
 * Current term and the share of it still ahead, from the student's year and today's date.
 * `year` is the academic year the student is in. Over the summer it is the year they are entering in the fall
 * (a rising junior answers 3), so summer maps to the summer after the previous year. An incoming first-year in
 * summer, or anyone in August, starts at the coming fall. After fall exams, the plan starts at the coming spring.
 */
export function currentTerm(year: number, todayISO: string, semester?: 1 | 2): { code: TermCode; remaining: number } {
  const cal = calendarTerm(year, todayISO);
  if (!semester) return cal;
  // The student's answer wins over the calendar (engine 0.8.0): off-cycle students, transfers, and part-time pacing.
  const want = `${year}${semester === 1 ? "F" : "S"}` as TermCode;
  if (cal.code === want) return cal;
  if (semester === 1 && cal.code.endsWith("U") && year > 1) return cal; // the summer before the fall they named
  return { code: want, remaining: 1 };
}
function calendarTerm(year: number, todayISO: string): { code: TermCode; remaining: number } {
  const d = new Date(todayISO + "T12:00:00Z");
  const y = d.getUTCFullYear(), md = (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  const at = ([m, day]: readonly [number, number], yr = y) => Date.UTC(yr, m - 1, day, 12);
  const key = ([m, day]: readonly [number, number]) => m * 100 + day;
  const left = (s: readonly [number, number], e: readonly [number, number]) =>
    Math.min(1, Math.max(0.2, (at(e) - d.getTime()) / (at(e) - at(s))));
  const C = CALENDAR;
  if (md > key(C.fall.end)) return { code: `${year}S`, remaining: 1 };                         // winter break
  if (md <= key(C.spring.end)) return { code: `${year}S`, remaining: left(C.spring.start, C.spring.end) };
  if (md < key(C.summer.end) && md >= key(C.summer.start) && year > 1) {
    return { code: `${year - 1}U`, remaining: left(C.summer.start, C.summer.end) };
  }
  if (md < key(C.fall.start)) return { code: `${year}F`, remaining: 1 };                         // before classes
  return { code: `${year}F`, remaining: left(C.fall.start, C.fall.end) };
}

// ---------- helpers ----------
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const round = (x: number, p = 3) => Math.round(x * 10 ** p) / 10 ** p;
const byId = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]));

interface Node {
  goal: Goal; key: string; baseId: string; weight: number; gate: boolean; addedAsPrereq: string[];
  win: { e: number; a: number; b: number; l: number }; strength: number; remaining: number; perTerm: number;
  mode: "flex" | "block" | "integrated"; blockNeed: number; placedAt: number[]; completeAt: number | null;
  staticScore: number; coverage: number; eligibility: number; satisfiedBy?: string;
  /** Draft map only (engine 0.9.0): below the priority threshold, so never scheduled; it can only be shown as an option. */
  extra?: boolean;
}

export function buildPlan(input: PlanInput, data: Dataset): Plan {
  const T = data.terms, idx = (c: TermCode) => T.indexOf(c);
  const goals = byId(data.goals);
  const track = data.tracks.find((t) => t.id === input.trackId) as Track;
  if (!track) throw new Error(`Unknown track ${input.trackId}`);
  const resources = byId(data.resources);
  const warnings: string[] = [];
  const identity = identitySet(input);

  // 1. Time frame -------------------------------------------------------------
  // Engine 0.13.0: a student graduating a year later plans on the runway of a year earlier; labels show the real year.
  const shift = input.graduation === "year-later" && input.year > 1 ? 1 : 0;
  const planYear = input.year - shift;
  const now = currentTerm(planYear, input.today, input.semester);
  const nowIdx = idx(now.code), gradIdx = idx("4S");
  const horizon = data.intake.horizons.find((h) => h.id === input.horizon)!;
  let endIdx = horizon.terms ? Math.min(nowIdx + horizon.terms - 1, T.length - 1)
    : Math.min(gradIdx + (horizon.extraTerms ?? 0), T.length - 1);
  if (endIdx < nowIdx) endIdx = nowIdx;
  // Engine 0.8.0: a final-year student's plan "by graduation" also covers the first two terms after it, where only the
  // goals that naturally run past graduation can go (the job search, graduate applications, and what they need).
  if (yearOfIdx(nowIdx) >= 4 && input.horizon === "graduation") endIdx = Math.max(endIdx, Math.min(idx("G2"), T.length - 1));
  // Engine 0.10.0: fall and spring terms left before graduation, counting term t (summers and after graduation don't count).
  const schoolLeft = (t: number) => T.slice(t, gradIdx + 1).filter((c) => { const s = seasonOf(c); return s === "F" || s === "S"; }).length;
  const tooLateToStart = (g: Goal, t: number) => !!g.minTermsLeft && schoolLeft(t) < g.minTermsLeft;
  // Engine 0.11.0: application rounds. The months a term covers (the current term from today's month on), and whether a
  // goal's round is open in any of them.
  const todayMonth = Number(input.today.slice(5, 7));
  const monthsOf = (t: number): number[] => {
    const s = seasonOf(T[t]);
    const all = s === "U" ? [6, 7, 8] : s === "F" || T[t] === "G1" ? [9, 10, 11, 12] : [1, 2, 3, 4, 5];
    if (t !== nowIdx || !all.includes(todayMonth)) return all; // before the term starts (or over winter break), all of it
    return all.filter((m) => all.indexOf(m) >= all.indexOf(todayMonth));
  };
  const inRound = (m: number, c: { opens: number; closes: number }) => (c.opens <= c.closes ? m >= c.opens && m <= c.closes : m >= c.opens || m <= c.closes);
  const roundOpenAt = (g: Goal, t: number) => !g.cycle || monthsOf(t).some((m) => inRound(m, g.cycle!));
  // Seasons, not months, so the line stays true whenever in the term it's read.
  const SEASON = ["", "winter", "winter", "spring", "spring", "spring", "summer", "summer", "late summer", "early fall", "fall", "late fall", "early winter"];
  const roundStatus = (g: Goal, t: number): NonNullable<PlanItem["cycle"]> => {
    const c = g.cycle!, ms = monthsOf(t);
    return inRound(ms[0], c) ? { status: "open", label: `Open now, through ${SEASON[c.closes]}.` }
      : { status: "opens-this-term", label: `Opens in ${SEASON[c.opens]}, through ${SEASON[c.closes]}.` };
  };
  const weekly = input.weeklyHours ?? data.intake.defaultWeeklyHours;
  const summer = input.summer ?? "full";
  const summerBlock = { full: 1, part: 0.5, none: 0 }[summer];

  const termCap = T.map((code, i) => {
    const s = seasonOf(code);
    const frac = i === nowIdx ? now.remaining : 1;
    const flex = s === "U" && summer === "none" ? 0 : weekly * K.weeks[s] * K.realism * frac;
    const block = s === "U" ? summerBlock * (i === nowIdx ? (frac > 0.6 ? 1 : 0) : 1)
      : s === "G" ? 1 : (input.openToCoop ?? true) ? 1 : 0;
    return { flex, block, usedFlex: 0, usedBlock: 0 };
  });

  // 2. What's already done ---------------------------------------------------
  const strength = new Map<string, number>();
  const credit = (gid: string, s: number) => strength.set(gid, Math.max(strength.get(gid) ?? 0, s));
  const options = [...data.intake.experience, ...data.intake.skills, ...data.intake.credentials];
  for (const oid of [...(input.experience ?? []), ...(input.skills ?? []), ...(input.credentials ?? [])]) {
    for (const c of options.find((o) => o.id === oid)?.completes ?? []) credit(c.goal, c.strength);
  }
  for (const gid of input.completedGoals ?? []) credit(gid, 1);
  // Engine 0.9.0: goals crossed out as "Not for me". They leave the plan and the queue and never hold back what depends on them.
  const skippedIds = new Set(input.skippedGoals ?? []);
  const isSkipped = (key: string) => skippedIds.has(key) || skippedIds.has(key.split("@")[0]);
  const skipped: Plan["skipped"] = [];
  for (const [gid, s] of [...strength]) for (const sub of goals.get(gid.split("@")[0])?.satisfies ?? []) if (s >= 1) credit(sub, 1);

  // 3. Competency gap --------------------------------------------------------
  const current: CompVector = {}, target: CompVector = {}, gap: CompVector = {};
  const progress = Math.min(1, (endIdx + 1) / (gradIdx + 1));
  for (const c of COMPS) {
    let miss = 1;
    for (const [gid, s] of strength) miss *= 1 - K.competencyGain * (goals.get(gid.split("@")[0])?.competencies[c] ?? 0) * s;
    current[c] = round(1 - miss);
    target[c] = round((track.competencyTarget[c] ?? 0) * progress);
    gap[c] = round(Math.max(0, target[c]! - current[c]!));
  }
  const maxGap = Math.max(1e-6, ...COMPS.map((c) => gap[c]!));

  // 4. Candidate goals -------------------------------------------------------
  const backlog: Plan["backlog"] = [];
  const rank = new Map<string, number>(); // priority used to order the "next" and "optional" parts of the queue
  const ongoing: Plan["ongoing"] = [];
  const nodes = new Map<string, Node>();
  const suppressed = new Set(track.suppress);
  const gates = new Set(track.gates);
  // Engine 0.8.0: in the final year the track's outcome is the must-do: the full-time job search, or graduate and
  // professional school applications for tracks that lead there.
  const finalGoal = track.outcome === "grad-school" ? "ap-grad-apps" : "ap-fulltime";
  if (yearOfIdx(idx(now.code)) >= 4 && !(track.suppress ?? []).includes(finalGoal)) gates.add(finalGoal);
  for (const key of [...skippedIds].sort()) {
    const g = goals.get(key.split("@")[0]);
    if (!g) continue;
    const y = key.split("@Y")[1];
    skipped.push({ goalId: key, title: y ? `${g.title} (year ${Number(y) + shift})` : g.title, essential: gates.has(g.id) });
    if (gates.has(g.id)) warnings.push(`"${g.title}" is a must-do for ${track.name}, and you crossed it out. Most ${track.name} recruiters expect it; undo if you change your mind.`);
  }
  const runway = (endIdx - nowIdx + 1) / Math.max(1, gradIdx - nowIdx + 1);
  const threshold = K.thresholdBase + K.thresholdSqueeze * (1 - Math.min(1, runway));

  const makeNode = (g0: Goal, key: string, win: Node["win"], weight: number): Node => {
    const g = effective(g0);
    const s = strength.get(key) ?? (key === g.id ? 0 : strength.get(g.id) && yearOfIdx(win.a) === yearOfIdx(nowIdx) ? strength.get(g.id)! : 0);
    const remaining = g.integrated ? 0 : g.hours * (1 - s);
    const perTerm = g.hours / Math.max(1, g.spanTerms);
    const mode = g.integrated || g.hours === 0 ? "integrated" : perTerm >= K.blockHours ? "block" : "flex";
    return { goal: g, key, baseId: g.id, weight, gate: gates.has(g.id), addedAsPrereq: [], win, strength: s, remaining,
      perTerm, mode, blockNeed: perTerm >= K.fullBlockHours ? 1 : 0.5, placedAt: [], completeAt: null, staticScore: 0, coverage: 0, eligibility: 1 };
  };
  // A goal already past its ideal window is named with its late wording everywhere (plan, queue), not only when placed.
  const titleNow = (g: Goal, win: Node["win"], key = g.id) => {
    const t = (nowIdx > win.b ? variantFor(g, nowIdx > gradIdx ? "after-grad" : "late", nowIdx, win)?.title : undefined) ?? g.title;
    const y = key.split("@Y")[1];
    return y ? `${t} (year ${Number(y) + shift})` : t; // yearly rounds stay distinct in the queue, named by the real year
  };
  const baseWin = (g: Goal) => {
    const o = track.windowOverrides?.[g.id]; // tracks can retime goals (pre-med applies the summer after junior year)
    if (o) { const [e, ab, l] = o.split(" "); const [a, b] = ab.split("-"); return { e: idx(e), a: idx(a), b: idx(b), l: idx(l) }; }
    return { e: idx(g.window.earliest), a: idx(g.window.ideal[0]), b: idx(g.window.ideal[1]), l: idx(g.window.latest) };
  };
  // Engine 0.11.0: grad-school timing. "this-cycle": applications happen by the end of the final year, and what they
  // need finishes by the time they start. "after-gap": applications move to the fall after graduation.
  const applyGoal = data.goals.find((x) => x.gradStep === "apply");
  const gradMode = track.outcome === "grad-school" && (input.gradApps === "this-cycle" || input.gradApps === "after-gap") ? input.gradApps : null;
  const winOf = (g: Goal) => {
    const w = baseWin(g);
    if (!gradMode || !g.gradStep) return w;
    if (gradMode === "after-gap") return g.gradStep === "apply" ? { e: idx("G1"), a: idx("G1"), b: idx("G1"), l: idx("G2") } : w;
    if (g.gradStep === "apply") return { ...w, l: Math.max(w.b, Math.min(w.l, w.b + 1, gradIdx)) };
    const apply = applyGoal ? baseWin(applyGoal) : null;
    if (!apply) return w;
    const l = Math.max(w.e, Math.min(w.l, apply.a));
    return { e: w.e, a: Math.min(w.a, l), b: Math.min(w.b, l), l };
  };
  // Applying this cycle leaves no room to do the steps late.
  const effective = (g: Goal): Goal => (gradMode === "this-cycle" && g.gradStep ? { ...g, lateOk: false } : g);

  const programOnly: string[] = []; // goals this path expects that need a degree program the student isn't in
  // Engine 0.10.0: groundwork is pointless once what it prepares for is done (a practice career fair after a target
  // internship), whatever the career path.
  const supersededDone = (g: Goal) => (g.supersededBy ?? []).some((sid) => (strength.get(sid) ?? 0) >= 1);
  for (const g of data.goals) {
    const boosted = g.id in track.boosts;
    const weight = gates.has(g.id) ? Math.max(K.gateWeight, track.boosts[g.id] ?? g.baseWeight) : (track.boosts[g.id] ?? g.baseWeight);
    if (suppressed.has(g.id) || skippedIds.has(g.id) || g.onlyAsAlternative) continue;
    if (g.majors && !g.majors.includes(input.majorId)) {
      // Engine 0.10.0: a goal that needs enrollment in its degree program never crosses into another major's plan.
      if (g.majorRule === "only") { if (boosted || gates.has(g.id)) programOnly.push(g.title); continue; }
      if (!boosted && !gates.has(g.id)) continue;
    }
    if (supersededDone(g)) { backlog.push({ goalId: g.id, title: g.title, reason: "What it prepares for is already done.", kind: "past" }); continue; }
    if (!meetsRequirements(g, input)) { backlog.push({ goalId: g.id, title: g.title, reason: "Not available with the citizenship status you entered.", kind: "not-now" }); continue; }
    if (citizenshipBlocked(g, resources, input)) { backlog.push({ goalId: g.id, title: g.title, reason: "The programs here require U.S. citizenship.", kind: "not-now" }); continue; }

    const instances: { key: string; win: Node["win"] }[] = [];
    const w = winOf(g);
    if (g.repeat === "yearly") {
      for (let y = yearOfIdx(nowIdx); y <= Math.min(4, yearOfIdx(endIdx)); y++) {
        if (g.forNextYear && y >= yearOfIdx(gradIdx)) continue; // FAFSA and scholarships in the final year only pay for after graduation
        const shift = 3 * (y - yearOfIdx(w.a));
        if (shift < 0) continue;
        const a = w.a + shift;
        instances.push({ key: `${g.id}@Y${y}`, win: { e: a, a, b: Math.min(a + 1, T.length - 1), l: Math.min(a + 1, T.length - 1) } });
      }
    } else instances.push({ key: g.id, win: w });

    if (g.hours === 0 && !g.integrated) {
      if (tooLateToStart(g, nowIdx)) { backlog.push({ goalId: g.id, title: g.title, reason: "Needs more semesters than you have left.", kind: "past" }); continue; }
      if (weight >= threshold || gates.has(g.id)) ongoing.push({ goalId: g.id, title: g.title, why: g.why });
      continue;
    }
    for (const inst of instances) {
      if (isSkipped(inst.key)) continue;
      const n = makeNode(g, inst.key, inst.win, weight);
      if (n.strength >= 1) continue;
      if (inst.win.e > endIdx) { backlog.push({ goalId: n.key, title: g.title, reason: "Starts after your time frame.", kind: "not-now" }); continue; }
      if (inst.win.l < nowIdx && !g.lateOk) {
        backlog.push({ goalId: n.key, title: g.title, reason: "Its usual time has passed for your year.", kind: "past" }); continue;
      }
      // Engine 0.10.0: a plan that reaches the final year always considers its outcome (the job search, or applications for
      // grad-school tracks), even when the track doesn't weight it, so a junior's plan ends in applications.
      const outcome = g.id === finalGoal && yearOfIdx(Math.min(endIdx, gradIdx)) >= 4;
      if (!n.gate && !outcome && weight < threshold && input.draft) { n.extra = true; nodes.set(n.key, n); rank.set(n.key, weight); continue; }
      if (!n.gate && !outcome && weight < threshold) { backlog.push({ goalId: n.key, title: titleNow(g, inst.win, n.key), reason: "Lower priority for your time frame; add it if you have time.", kind: "optional" }); rank.set(n.key, weight); continue; }
      nodes.set(n.key, n);
    }
  }

  // 4b. Alternatives (engine 0.10.0): a goal that can't start in time anywhere in the plan (a two-semester thesis in the
  // last semester) gives way to its shorter alternative, with the same weight.
  for (const n of [...nodes.values()]) {
    const altId = n.goal.alternative;
    if (!altId || n.extra) continue;
    let canStart = false;
    for (let t = Math.max(nowIdx, n.win.e); t <= Math.min(endIdx, gradIdx) && !canStart; t++) canStart = (t <= n.win.l || n.goal.lateOk) && !tooLateToStart(n.goal, t);
    if (canStart) continue;
    nodes.delete(n.key);
    backlog.push({ goalId: n.key, title: n.goal.title, reason: "Needs more semesters than you have left.", kind: "past" });
    const alt = goals.get(altId);
    if (!alt || (strength.get(altId) ?? 0) >= 1 || isSkipped(altId) || suppressed.has(altId) || nodes.has(altId)) continue;
    const a = makeNode(alt, altId, winOf(alt), n.weight);
    a.gate = n.gate;
    nodes.set(altId, a);
  }

  // 5. Prerequisite closure: anything selected pulls in its unfinished prerequisites.
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of [...nodes.values()]) {
      if (n.extra) continue;
      for (const pid of n.goal.prereqs) {
        if ((strength.get(pid) ?? 0) >= 0.5 || isSkipped(pid)) continue;
        const existing = nodes.get(pid);
        const inherited = n.weight * K.prereqInherit;
        if (existing?.extra) { // needed by a planned goal after all: plan it, as without the draft
          existing.extra = false; existing.weight = Math.max(existing.goal.baseWeight, inherited); changed = true;
        }
        if (existing) {
          if (inherited > existing.weight) { existing.weight = inherited; changed = true; }
          if (!existing.addedAsPrereq.includes(n.key)) existing.addedAsPrereq.push(n.key);
          continue;
        }
        const pg = goals.get(pid)!;
        const p = makeNode(pg, pid, winOf(pg), Math.max(pg.baseWeight, inherited));
        p.addedAsPrereq.push(n.key);
        nodes.set(pid, p);
        const bi = backlog.findIndex((b) => b.goalId === pid);
        if (bi >= 0) backlog.splice(bi, 1);
        changed = true;
      }
    }
  }

  // 6. Static score: weight x gap coverage x eligibility ---------------------
  for (const n of nodes.values()) {
    const comp = n.goal.competencies;
    const mass = sum(COMPS.map((c) => comp[c] ?? 0));
    n.coverage = mass ? sum(COMPS.map((c) => (comp[c] ?? 0) * gap[c]!)) / (mass * maxGap) : 0;
    n.eligibility = identityMatch(n.goal, resources, identity, input) ? 1 + K.eligibilityBoost : 1;
    const focus = runway <= K.focusRunway && (n.goal.category === "applications" || n.goal.category === "network") ? K.focusBoost : 1;
    // Early-college goals long past their ideal window are catch-ups: still worth doing, but not ahead of the student's
    // own year (a senior's job search beats "meet an advisor"), unless they're required or needed for something selected.
    const stale = nowIdx > n.win.b + K.staleTerms && !n.gate && !n.addedAsPrereq.length ? K.staleDiscount : 1;
    n.staticScore = n.weight * (1 + K.coverageAlpha * n.coverage) * n.eligibility * focus * stale;
  }

  // 7. Schedule term by term --------------------------------------------------
  // Does an unfinished goal that runs past graduation depend on this one, directly or through a chain?
  const neededAfterGrad = (n: Node, depth = 0): boolean => depth < 5 && n.addedAsPrereq.some((k) => {
    const d = nodes.get(k);
    return !!d && d.completeAt === null && (d.win.l > gradIdx || neededAfterGrad(d, depth + 1));
  });
  // Engine 0.10.0: groundwork stops once the goal it prepares for has reached its own time in this plan (researching
  // careers ends when the job search starts). A career path that boosts the goal keeps it ("still exploring").
  const supersededAt = (n: Node, t: number) => !(n.baseId in track.boosts) && (n.goal.supersededBy ?? []).some((sid) => {
    const d = nodes.get(sid);
    return !!d && !d.extra && (t >= d.win.a || (d.placedAt.length > 0 && Math.min(...d.placedAt) <= t));
  });
  const urgency = (n: Node, t: number): number => {
    const s = seasonOf(T[t]);
    if (!n.placedAt.length && (tooLateToStart(n.goal, t) || supersededAt(n, t))) return 0; // engine 0.10.0
    if (!n.placedAt.length && !roundOpenAt(n.goal, t)) return 0; // engine 0.11.0: its application round is closed then
    if (n.goal.minTermsLeft && t > gradIdx) return 0; // and what needs enrollment never runs on past graduation
    if (n.goal.season === "summer" && s !== "U") return 0;
    if (n.mode === "block" && s !== "U" && s !== "G" && n.goal.season === "summer") return 0;
    const { e, a, b, l } = n.win;
    if (t < e) return 0;
    // Student-only goals never spill past graduation, unless a goal that does (the job search) still needs them.
    if (s === "G" && l <= gradIdx && !neededAfterGrad(n)) return 0;
    if (t < a) return K.earlyFloor + (1 - K.earlyFloor) * (t - e + 1) / (a - e + 1);
    if (t <= b) return 1;
    if (t <= l) return 1 + K.lateCeiling * (t - b) / Math.max(1, l - b);
    if (!n.goal.lateOk && !neededAfterGrad(n)) return 0; // closed, unless a goal that runs past graduation still needs it
    return n.addedAsPrereq.length ? 1.2 : K.pastLatest; // overdue but blocking something: still urgent
  };
  const prereqsReady = (n: Node, t: number) => n.goal.prereqs.every((pid) => {
    if ((strength.get(pid) ?? 0) >= 0.5 || isSkipped(pid)) return true;
    const p = nodes.get(pid);
    return !!p && p.completeAt !== null && p.completeAt < t;
  });
  // Same-term readiness: quick prerequisites (a few hours) finished earlier in this term count.
  const sameTermReady = (n: Node, t: number) => n.goal.prereqs.every((pid) => {
    if ((strength.get(pid) ?? 0) >= 0.5 || isSkipped(pid)) return true;
    const p = nodes.get(pid);
    if (!p || p.completeAt === null) return false;
    return p.completeAt < t || (p.completeAt === t && p.mode === "flex" && p.goal.hours <= K.sameTermPrereqHours);
  });
  // Finishing a goal also finishes the goals it satisfies; for a yearly goal, that year's round (writing a resume
  // counts as this year's resume refresh).
  const satisfyFrom = (n: Node) => {
    if (n.completeAt === null) return;
    for (const sub of n.goal.satisfies) for (const key of [sub, `${sub}@Y${yearOfIdx(n.completeAt)}`]) {
      const s2 = nodes.get(key);
      if (s2 && s2.completeAt === null && !s2.placedAt.length) { s2.completeAt = n.completeAt; s2.satisfiedBy = n.key; }
    }
  };
  const prevTerm = input.previousPlan ?? {};
  const placements = new Map<number, PlanItem[]>();
  const scoreAt = (n: Node, t: number) => {
    const u = urgency(n, t);
    const stab = prevTerm[n.key] === T[t] ? 1 + K.stabilityBonus : 1;
    const pin = n.gate || (n.goal.deadline && u >= 1) ? K.pinBonus : 1;
    // A prerequisite of a goal that's due now or next term goes first, or the goal it unlocks can't start in time.
    const blocking = n.addedAsPrereq.some((k) => { const d = nodes.get(k); return !!d && d.completeAt === null && d.win.a <= t + 1; }) ? K.blockingBoost : 1;
    return { u, stab, total: n.staticScore * u * stab * pin * blocking };
  };
  // Engine 0.8.0: under the goal cap, a prerequisite ranks at least just below the goal it unlocks (when that goal is due
  // now or next term), so the mock interview isn't crowded out by something less important than the job search it opens.
  const rankAt = (n: Node, t: number, depth = 0): number => {
    let r = scoreAt(n, t).total;
    if (depth > 4) return r;
    for (const k of n.addedAsPrereq) {
      const d = nodes.get(k);
      const next = Math.min(t + 1, T.length - 1); // never look past the last term
      if (d && d.completeAt === null && d.win.a <= t + 1 && urgency(d, next) > 0) r = Math.max(r, 0.99 * rankAt(d, t, depth + 1));
    }
    return r;
  };

  // A must-do, or a prerequisite (direct or not) of an unfinished must-do that's due now or next term.
  const protectedKeys = new Set<string>();
  // Only quick steps (a few hours, like a resume or mock interview) are protected: they unlock the must-do this term
  // without turning a semester into a long list.
  // Engine 0.10.0: in final-year terms the outcome (job search or applications) is a must-do in every plan, not only for
  // students who are seniors now, so a younger student's senior fall starts the job search too.
  const outcomeAt = (n: Node, t: number) => n.baseId === finalGoal && !suppressed.has(finalGoal) && yearOfIdx(t) === 4;
  const protectedAt = (n: Node, t: number, depth = 0): boolean => n.gate || outcomeAt(n, t)
    || (depth === 0 && !!n.goal.deadline && n.goal.hours <= K.sameTermPrereqHours && urgency(n, t) >= 1) // a quick task with a deadline now (FAFSA)
    || (n.goal.hours <= K.sameTermPrereqHours && depth < 5 && n.addedAsPrereq.some((k) => {
    const d = nodes.get(k);
    return !!d && d.completeAt === null && d.win.a <= t + 1 && protectedAt(d, t, depth + 1);
  }));
  // The final-year outcome in a final-year term, and the quick steps (resume, mock interview) it needs now or next term.
  const outcomeChain = (n: Node, t: number, depth = 0): boolean => outcomeAt(n, t)
    || (n.goal.hours <= K.sameTermPrereqHours && depth < 5 && n.addedAsPrereq.some((k) => {
      const d = nodes.get(k);
      return !!d && d.completeAt === null && d.win.a <= t + 1 && outcomeChain(d, t, depth + 1);
    }));
  const finalCap = Math.min(K.goalCapMax, Math.max(K.goalCapMin, Math.round(K.goalCapBase + weekly / K.goalCapPerHours)));
  // The draft map (engine 0.9.0) shows more options per term for the student to cross out or keep.
  const goalCap = finalCap;
  for (let t = nowIdx; t <= endIdx; t++) {
    const cap = termCap[t];
    const termItems = new Map<string, PlanItem>();
    const open: Node[] = [];
    // Order: last-chance hard deadlines, then quick wins, then score.
    // Last-chance goals go first; everything else competes on score (engine 0.8.0). With a cap on goals per term,
    // slots are the scarce resource, so small quick wins no longer jump ahead of what matters most. One-at-a-time
    // placement still resolves short chains (pitch, then mock interview) within a term.
    // Engine 0.10.0: in a final-year term the outcome (job search or applications) and the quick steps it needs go first,
    // then other must-dos, then last-chance goals, then the rest, so neither an optional last-chance task nor a long skill
    // must-do takes the hours a senior's job search needs.
    // A goal's last chance is its latest term, or (engine 0.10.0) the last term it can still start with enough semesters
    // left: senior fall for a thesis, so it competes with the other last-chance goals instead of losing to all of them.
    const lastChance = (n: Node) => !n.placedAt.length && ((!n.goal.lateOk && t === n.win.l) || (!!n.goal.minTermsLeft && !tooLateToStart(n.goal, t) && tooLateToStart(n.goal, t + 1)));
    const tier = (n: Node) => (outcomeChain(n, t) ? 0 : protectedAt(n, t) ? 1 : lastChance(n) ? 2 : 3);
    // Sweep until nothing new becomes ready: a small prerequisite finished early in the term can unlock its dependent.
    // Phase 1 places only last-chance and quick-win goals (repeating so quick chains resolve); phase 2 places the rest.
    // Engine 0.7.0: one goal at a time, rechecking readiness after each, so a goal that finishes can be followed by
    // what it unlocks in the same term (resume, then mock interview, then the job search) before hours run out.
    for (const phase of [1, 2]) {
    const tried = new Set<string>();
    for (;;) {
    const batch = [...nodes.values()].filter((n) => !n.extra && n.completeAt === null && !termItems.has(n.key) && !tried.has(n.key) && sameTermReady(n, t) && urgency(n, t) > 0
      && !(n.mode === "block" && n.placedAt.length > 0) && !(n.mode === "integrated" && n.placedAt.length > 0)
      && (phase === 2 || tier(n) < 3));
    if (!batch.length) break;
    batch.sort((x, y) => tier(x) - tier(y) || rankAt(y, t) - rankAt(x, t) || x.key.localeCompare(y.key));

    for (const n of batch.slice(0, 1)) {
      tried.add(n.key);
      if (!open.includes(n)) open.push(n);
      // Baby steps (engine 0.8.0): at most goalCap goals a term, plus must-dos and what they need, never crowded out.
      // Engine 0.13.0: the final semester holds at most finalTermCap goals besides must-dos, next to the outcome.
      const goalLimit = t === gradIdx ? Math.min(goalCap, K.finalTermCap) : goalCap;
      if (!protectedAt(n, t) && (placements.get(t)?.filter((x) => !x.gate && !x.essential).length ?? 0) >= goalLimit) continue;
      if (protectedAt(n, t)) protectedKeys.add(n.key);
      if (n.completeAt !== null) continue; // satisfied by another goal earlier in this term
      const sc = scoreAt(n, t);
      let hours = 0, partial = false;
      if (n.mode === "integrated") {
        n.placedAt.push(t); n.completeAt = t + Math.max(1, n.goal.spanTerms) - 1;
      } else if (n.mode === "block") {
        const span = Math.max(1, n.goal.spanTerms);
        const terms = Array.from({ length: span }, (_, k) => t + k);
        if (urgency(n, t) < 1 && n.win.a <= endIdx) continue; // big commitments wait for their ideal window
        const ok = terms.every((k) => k <= endIdx && termCap[k].block - termCap[k].usedBlock >= n.blockNeed
          && (n.goal.season !== "summer" || seasonOf(T[k]) === "U"));
        if (!ok) continue;
        for (const k of terms) {
          termCap[k].usedBlock += n.blockNeed;
          const sk = seasonOf(T[k]);
          if (sk === "F" || sk === "S") { // a co-op semester is full-time work: little free time left
            const c = termCap[k]; c.flex = Math.max(c.usedFlex, c.flex * K.coopFlexShare);
          }
        }
        hours = n.perTerm; n.placedAt.push(...terms); n.completeAt = t + span - 1; n.remaining = 0;
        for (const k of terms.slice(1)) pushItem(placements, k, item(n, k, n.perTerm, false, sc));
        satisfyFrom(n);
      } else {
        const free = cap.flex - cap.usedFlex;
        const need = Math.min(n.remaining, n.goal.splittable ? n.perTerm : n.remaining);
        const autoSplit = n.goal.splittable || n.remaining > 2 * Math.max(1, cap.flex);
        const share = autoSplit ? Math.max(K.minChunk, K.maxShare * cap.flex) : Infinity; // leave room for other goals
        const termsLeft = Math.max(1, Math.max(t, n.win.b) - t + 1);
        const pace = autoSplit ? Math.max(K.minChunk, n.remaining / termsLeft) : Infinity; // spread work across the ideal window
        const want = Math.min(need, share, pace);
        if (want <= free + 1e-9) hours = want;
        else if (autoSplit && free >= Math.min(K.minChunk, need)) hours = free;
        else continue;
        cap.usedFlex += hours; n.remaining -= hours; n.placedAt.push(t);
        if (n.remaining < 1) { n.remaining = 0; n.completeAt = t; satisfyFrom(n); }
        else partial = true;
      }
      const it = item(n, t, hours, partial, sc);
      if (!n.gate && protectedKeys.has(n.key)) { it.essential = true; it.importance = "must"; }
      termItems.set(n.key, it);
      pushItem(placements, t, it);
    }
    }
    }
    open.sort((x, y) => scoreAt(y, t).total - scoreAt(x, t).total || x.key.localeCompare(y.key));

    // Second pass: give leftover hours to goals already in progress this term, highest score first.
    for (const n of open) {
      const it = termItems.get(n.key);
      if (!it || n.mode !== "flex" || n.completeAt !== null) continue;
      const free = cap.flex - cap.usedFlex;
      if (free < K.minChunk) break;
      const extra = Math.min(free, n.remaining, Math.max(0, n.perTerm - it.hours));
      if (extra <= 0) continue;
      cap.usedFlex += extra; n.remaining -= extra; it.hours = Math.round(it.hours + extra);
      if (n.remaining < 1) { n.remaining = 0; n.completeAt = t; it.partial = false; }
    }
  }

  // 7b. The draft map (engine 0.9.0): the plan above, unchanged, plus more options in each term, highest score first, up
  // to draftCapScale x the goal cap. Options take no hours: the student crosses out what they don't want, and finalizing
  // returns the time-sized plan. Each option goes in its first ideal term, or later if that term is full.
  const optionKeys = new Set<string>();
  if (input.draft) {
    const draftCap = Math.min(K.draftCapMax, finalCap * K.draftCapScale);
    const free = [...nodes.values()].filter((n) => n.completeAt === null && !n.placedAt.length);
    const fits = (n: Node, t: number) => t <= n.win.l && urgency(n, t) > 0 && prereqsReady(n, t) && (n.mode !== "block"
      || termCap[t].block - termCap[t].usedBlock >= n.blockNeed);
    // Each option's term: the first one inside its ideal window (urgency peaks at the last chance, which is too late to
    // suggest), else the first term it can happen at all.
    const best = new Map<string, number>();
    for (const n of free) {
      let bt = -1;
      for (let t = nowIdx; t <= endIdx && bt < 0; t++) if (fits(n, t) && urgency(n, t) >= 1) bt = t;
      for (let t = nowIdx; t <= endIdx && bt < 0; t++) if (fits(n, t)) bt = t;
      if (bt >= 0) best.set(n.key, bt);
    }
    for (let t = nowIdx; t <= endIdx; t++) {
      const slots = draftCap - (placements.get(t) ?? []).filter((x) => !x.gate && !x.essential).length;
      if (slots <= 0) continue;
      const pool = free.filter((n) => !optionKeys.has(n.key) && best.has(n.key) && best.get(n.key)! <= t && fits(n, t))
        .sort((x, y) => scoreAt(y, t).total - scoreAt(x, t).total || x.key.localeCompare(y.key));
      for (const n of pool.slice(0, slots)) {
        const it = item(n, t, n.mode === "integrated" ? 0 : Math.min(n.remaining, n.perTerm), false, scoreAt(n, t));
        it.option = true;
        pushItem(placements, t, it);
        optionKeys.add(n.key);
      }
    }
  }

  // 8. Leftovers join the queue: what comes next when the student finishes a goal or has more time ----------
  for (const n of nodes.values()) {
    if (n.completeAt !== null || optionKeys.has(n.key)) continue;
    if (n.extra) { backlog.push({ goalId: n.key, title: titleNow(n.goal, n.win, n.key), reason: "Lower priority for your time frame; add it if you have time.", kind: "optional" }); continue; }
    // Waiting on a prerequisite that isn't done before the plan's last term (it may finish right at the end).
    const blocked = n.goal.prereqs.find((pid) => (strength.get(pid) ?? 0) < 0.5 && !isSkipped(pid) && (nodes.get(pid)?.completeAt == null || nodes.get(pid)!.completeAt! >= endIdx));
    const summerOnly = n.mode === "block" && summer !== "full";
    const late = n.win.e > endIdx;
    // Only goals that could still happen before the plan ends are "next in line" (a senior has no junior summer left).
    let possible = false;
    for (let t = nowIdx; t <= endIdx && !possible; t++) possible = urgency(n, t) > 0;
    const blockedForGood = blocked && !!nodes.get(blocked) && !nodes.get(blocked)!.placedAt.length && ![...Array(endIdx - nowIdx + 1).keys()].some((k) => urgency(nodes.get(blocked)!, nowIdx + k) > 0);
    const reason = n.placedAt.length ? "Started in your plan; keep going when you have time."
      : !possible ? (n.goal.season === "summer" ? "Needs a summer before you graduate." : "Its usual time has passed for your year.")
      : blockedForGood ? `Depends on "${titleNow(goals.get(blocked!)!, winOf(goals.get(blocked!)!))}", whose usual time has passed.`
      : blocked ? `Comes after "${titleNow(goals.get(blocked)!, winOf(goals.get(blocked)!))}".`
      : summerOnly ? "Needs a full-time summer; you said summers are limited."
      : late ? "Starts after your time frame."
      : "Next in line: it moves into your plan as you finish goals or add hours.";
    const kind: Plan["backlog"][number]["kind"] = n.placedAt.length ? "continues" : !possible || blockedForGood ? "past" : summerOnly || late ? "not-now" : "next";
    backlog.push({ goalId: n.key, title: titleNow(n.goal, n.win, n.key), reason: n.placedAt.length ? "Continues after this plan." : reason, kind });
    rank.set(n.key, n.staticScore + (n.placedAt.length ? 1 : 0)); // finishing what's started comes first
    if (n.gate && kind === "next") warnings.push(`"${n.goal.title}" is essential for ${track.name} and is next in line. To fit it sooner, add a few hours a week or free up a summer.`);
    // A must-do from an earlier stage that has passed gets no notice (engine 0.8.0): the plan looks forward, and the
    // final year's must-do is the outcome itself (the job search or applications).
  }
  const order = { continues: 0, next: 1, optional: 2, "not-now": 3, past: 4 } as const;
  backlog.sort((a, b) => order[a.kind] - order[b.kind] || (rank.get(b.goalId) ?? 0) - (rank.get(a.goalId) ?? 0) || a.goalId.localeCompare(b.goalId));

  // 9. Warnings ------------------------------------------------------------------
  // No hours-shortfall warning (removed in 0.6.0): the plan is sized to the student's time, and the rest is the "next" queue.
  if (summer !== "full" && nowIdx <= idx("3U") && ("e-internship-target" in track.boosts || track.boosts["ap-internship-target"])) {
    warnings.push(`${track.name} usually runs through a full-time junior-summer internship; limited summers make that harder.`);
  }
  if (input.citizenship === "international") {
    const offices: Record<string, string> = { nb: "Rutgers Global ISSS", newark: "the Rutgers–Newark Office of International Student & Scholar Services", camden: "the Rutgers–Camden Office of International Students & Global Programs" };
    const campus = campusOf(input.school);
    const office = campus ? offices[campus] : "your school's international student office";
    warnings.push(`International students need CPT or OPT authorization before any internship. Check with ${office} before accepting an offer.`);
  }
  if (programOnly.length) warnings.push(`${track.name} usually includes ${programOnly.map((x) => `"${x}"`).join(" and ")}, which ${programOnly.length > 1 ? "are" : "is"} only open to students in that degree program. An advisor can tell you whether a change of major makes sense.`);
  if (input.enrollment === "part-time") warnings.push("You're part-time, so this plan spaces goals at a full-time pace for your year. If you'll graduate later, plan by credits with an advisor, and check whether internships or scholarships you want require full-time enrollment.");
  if (track.recruitingNote && (!track.recruitingNoteUntil || nowIdx <= idx(track.recruitingNoteUntil))) warnings.push(`Recruiting timeline: ${track.recruitingNote}`);

  // 9b. Phases (engine 0.12.0): a goal planned in more than one term says which part each term is, and which of its
  // steps belong there, so later terms don't start over at step 1.
  for (const n of nodes.values()) {
    const ts = [...new Set(n.placedAt)].sort((a, b) => a - b);
    if (ts.length < 2) continue;
    for (const t of ts) for (const it of placements.get(t) ?? []) {
      if (it.goalId !== n.key || it.option) continue;
      it.phase = t === ts[0] ? "start" : t === ts.at(-1) && n.completeAt === t ? "finish" : "continue";
      const v = variantFor(n.goal, it.timing, t, n.win);
      const spec = v?.phases ?? (v?.steps ? undefined : n.goal.phases);
      if (spec) it.phaseSteps = [...spec[it.phase]];
    }
  }

  // 10. Assemble ---------------------------------------------------------------
  const terms: PlanTerm[] = [];
  for (let t = nowIdx; t <= endIdx; t++) {
    const items = (placements.get(t) ?? []).sort((a, b) => CATEGORY_ORDER.indexOf(a.lane) - CATEGORY_ORDER.indexOf(b.lane) || b.score.total - a.score.total);
    terms.push({ code: T[t], label: termLabel(T[t], shift), capacityHours: Math.round(termCap[t].flex), usedHours: Math.round(termCap[t].usedFlex), summerBlock: termCap[t].usedBlock > 0, items });
  }
  const placedKeys = new Set([...nodes.values()].filter((n) => n.placedAt.length).map((n) => n.key));
  const edges = [...nodes.values()].filter((n) => placedKeys.has(n.key))
    .flatMap((n) => n.goal.prereqs.filter((p) => placedKeys.has(p)).map((p) => ({ from: p, to: n.key })));

  return {
    meta: { engineVersion: ENGINE_VERSION, dataVersion: data.version, generatedFor: input.today, track: track.id },
    competencies: { current, target, gap },
    terms, ongoing, edges, backlog,
    done: [...strength].filter(([, s]) => s >= 1).map(([g]) => g).sort(),
    skipped,
    warnings,
  };

  // ---- inner helpers that need closure state ----
  // Engine 0.12.0: how a goal's timing stands in term t, and the wording for it.
  function timingAt(n: Node, t: number): Timing {
    if (t > gradIdx) return "after-grad";
    const g = n.goal;
    if ((!g.lateOk && t === n.win.l && n.win.l > n.win.b) || (!!g.minTermsLeft && !tooLateToStart(g, t) && tooLateToStart(g, t + 1) && t >= n.win.a)) return "last-chance";
    return t > n.win.b ? "late" : t < n.win.a ? "early" : "on-time";
  }
  function variantFor(g: Goal, timing: Timing, t: number, win: Node["win"]) {
    const order: string[] = timing === "after-grad" ? ["after-grad", "late"] : timing === "last-chance" ? (t > win.b ? ["last-chance", "late"] : ["last-chance"]) : timing === "late" ? ["late"] : [];
    for (const w of order) { const v = g.variants?.find((x) => x.when === w); if (v) return v; }
    return undefined;
  }

  function item(n: Node, t: number, hours: number, partial: boolean, sc: { u: number; stab: number; total: number }): PlanItem {
    const score: ScoreBreakdown = { weight: round(n.weight), coverage: round(n.coverage), urgency: round(sc.u), eligibility: round(n.eligibility), stability: round(sc.stab), total: round(sc.total) };
    const timing = timingAt(n, t), v = variantFor(n.goal, timing, t, n.win);
    const text = { steps: [...(v?.steps ?? n.goal.steps ?? [])], doneWhen: v?.doneWhen ?? n.goal.doneWhen ?? null };
    return { goalId: n.key, title: v?.title ?? n.goal.title, lane: n.goal.category, hours: Math.round(hours), partial, gate: n.gate, timing, text,
      score, why: explain(n, t, sc.u, timing, v?.why), resources: rankResources(n.goal, t), ...(v ? { late: true } : {}),
      ...(n.goal.cycle ? { cycle: roundStatus(n.goal, t) } : {}),
      ...(n.strength > 0 && n.strength < 1 ? { started: round(n.strength, 2) } : {}),
      importance: n.gate ? "must" : n.weight >= K.importanceHigh ? "high" : n.weight >= K.importanceMedium ? "medium" : "low" };
  }

  function explain(n: Node, t: number, u: number, timing: Timing, variantWhy?: string): string[] {
    const why: string[] = [];
    if (n.gate) why.push(`Must-do for ${track.name}.`);
    else if (n.weight >= 0.85) why.push(`High priority for ${track.name}.`);
    if (n.coverage >= 0.5) {
      const top = COMPS.filter((c) => (n.goal.competencies[c] ?? 0) > 0).sort((x, y) => gap[y]! * (n.goal.competencies[y] ?? 0) - gap[x]! * (n.goal.competencies[x] ?? 0))[0];
      if (top) why.push(`Builds ${COMP_NAMES[top]}, one of your biggest gaps right now.`);
    }
    if (n.goal.cycle) why.push(`Timing: ${roundStatus(n.goal, t).label}`);
    else if (n.goal.deadline) why.push(`Timing: ${n.goal.deadline}.`);
    else if (t > n.win.b && t <= gradIdx) why.push("Most students do this earlier, and it still helps now.");
    else if (u > 1.2 && t <= n.win.b) why.push(`Good to do soon: students usually do this by ${termLabel(T[n.win.b], shift).toLowerCase()}.`);
    // Engine 0.14.0: only goals still ahead (not closed for this student), by the title they have now.
    const ahead = n.addedAsPrereq.map((k) => nodes.get(k)).filter((d): d is Node => !!d && (d.win.l >= t || d.goal.lateOk));
    if (ahead.length) why.push(`Needed before: ${ahead.map((d) => titleNow(d.goal, d.win, d.key)).slice(0, 2).join("; ")}.`);
    if (n.eligibility > 1) why.push("Some programs here are specifically for students like you.");
    if (n.strength > 0) why.push("You've already started this.");
    // A goal done after its ideal window explains itself for now, not for early in college (engine 0.8.1).
    why.push(variantWhy ?? n.goal.why);
    return why;
  }

  function rankResources(g: Goal, t: number) {
    const year = Math.min(4, yearOfIdx(t));
    return g.resources.map((rid) => resources.get(rid)).filter((r): r is ResourceLite => !!r)
      .filter((r) => r.status !== "ended")
      .filter((r) => r.majors.includes("all") || r.majors.includes(input.majorId))
      .filter((r) => r.years.includes(year) || yearOfIdx(t) > 4)
      .filter((r) => availableAt(r, input))
      .filter((r) => eligibleFor(r, identity, input))
      .map((r) => ({ r, s: (r.scope === "rutgers" && (input.school ?? "rutgers-nb") === "rutgers-nb" ? 3 : 0) + (r.scope === "new_jersey" && input.location === "nj" ? 2 : 0)
        + (r.scope === "national" ? 1 : 0) + (r.status === "active" ? 1 : 0) + (VERIFIED.has(r.verification.state) ? 0.5 : 0)
        + (r.identity.some((x) => identity.has(x)) ? 2 : 0) }))
      .sort((a, b) => b.s - a.s || a.r.id.localeCompare(b.r.id)).slice(0, 4)
      .map(({ r }) => ({ id: r.id, name: r.name, url: r.url, ...(r.status !== "active" ? { note: r.statusNote ?? r.status } : {}) }));
  }
}

function pushItem(map: Map<number, PlanItem[]>, t: number, it: PlanItem) { map.set(t, [...(map.get(t) ?? []), it]); }

/** Every eligibility tag the student matches: identity answers, stated citizenship, NJ residency. */
export function identitySet(input: PlanInput): Set<string> {
  return new Set([...(input.identity ?? []), ...citizenshipTags(input.citizenship), ...(input.location === "nj" ? ["nj-resident"] : [])]);
}

export function citizenshipTags(c: PlanInput["citizenship"]): string[] {
  return c === "us-citizen" ? ["us-citizen", "us-citizen-or-pr"] : c === "us-pr" ? ["us-citizen-or-pr"] : c === "international" ? ["international"] : c === "undocumented" ? ["undocumented"] : [];
}
/** Link states that count as verified for ranking. Blocked and broken links get no bonus. */
export const VERIFIED = new Set(["link-checked", "search-confirmed"]);
export const LEGAL = new Set(["us-citizen", "us-citizen-or-pr", "nj-resident"]);

/** Identity tags only ever add programs. Legal requirements (citizenship, residency) can hide them. */
export function eligibleFor(r: ResourceLite, identity: Set<string>, input: PlanInput): boolean {
  const legal = r.identity.filter((x) => LEGAL.has(x));
  const knownCitizenship = input.citizenship && input.citizenship !== "skip";
  if (knownCitizenship && legal.some((x) => x !== "nj-resident") && !legal.some((x) => identity.has(x))) return false;
  const groups = r.identity.filter((x) => !LEGAL.has(x));
  if (!groups.length) return true;
  if (!(input.identity ?? []).length) return true; // student skipped identity questions: show, labeled on the card
  return groups.some((x) => identity.has(x)) || groups.includes("underrepresented") || groups.includes("underrepresented-stem");
}
/** Rutgers campus for a PlanInput.school value. Missing or unrecognized values keep the pre-0.4 default, New Brunswick. */
export function campusOf(school: PlanInput["school"]): "nb" | "newark" | "camden" | null {
  if (school === "other") return null;
  if (school === "rutgers-newark") return "newark";
  if (school === "rutgers-camden") return "camden";
  return "nb";
}
/** Whether the student can use a resource at all: Rutgers resources only at their listed campuses; NJ and national everywhere. */
export function availableAt(r: Pick<ResourceLite, "scope" | "campuses">, input: Pick<PlanInput, "school">): boolean {
  if (r.scope !== "rutgers") return true;
  const campus = campusOf(input.school);
  return campus !== null && !!r.campuses && (r.campuses.includes("all") || r.campuses.includes(campus));
}
const usable = (g: Goal, res: Map<string, ResourceLite>, input: PlanInput) =>
  g.resources.map((rid) => res.get(rid)).filter((r): r is ResourceLite => !!r && availableAt(r, input));
/** Identity boost: only resources the student can actually use count. */
function identityMatch(g: Goal, res: Map<string, ResourceLite>, identity: Set<string>, input: PlanInput): boolean {
  return usable(g, res, input).some((r) => r.identity.some((x) => !LEGAL.has(x) && identity.has(x)));
}
/** Goal-level legal requirements. Unknown citizenship never hides anything. */
function meetsRequirements(g: Goal, input: PlanInput): boolean {
  const c = input.citizenship;
  if (!c || c === "skip") return true;
  return (g.requires ?? []).every((req) => req === "us-citizen-or-pr" ? c === "us-citizen" || c === "us-pr"
    : req === "not-international" ? c !== "international" : true);
}
function citizenshipBlocked(g: Goal, res: Map<string, ResourceLite>, input: PlanInput): boolean {
  const c = input.citizenship;
  if (c !== "international" && c !== "undocumented") return false;
  const rs = usable(g, res, input); // only resources at the student's campus decide this
  return rs.length > 0 && rs.every((r) => r.identity.includes("us-citizen") || r.identity.includes("us-citizen-or-pr"));
}
