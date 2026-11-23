// Lead-time and purpose audit: is each goal still worth starting in the term the plan puts it in?
// A senior told to start an honors thesis in their last semester is the model case: the goal is allowed by its window,
// but it can't be finished before graduation, and its result has nowhere to go. This audit looks for every goal like
// that, across a wide grid of students with realistic experience for their year.
// Run: node --experimental-strip-types scripts/lead-time-audit.ts [--json out.json] [--all]
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPlan } from "../src/engine/engine.ts";
import { loadDataset } from "../src/engine/load.ts";
import type { Plan, PlanInput } from "../src/engine/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = loadDataset(join(root, "data"));
const majors = JSON.parse(readFileSync(join(root, "data/majors.json"), "utf8")).majors as { id: string; offeredAt: Record<string, unknown> }[];
const goals = new Map(data.goals.map((g) => [g.id, g]));
const T = data.terms, ix = (c: string) => T.indexOf(c);
const GRAD = ix("4S");
/** Fall and spring terms from `t` to graduation, counting `t` (summers don't count: most of these need classes in session). */
const schoolTermsLeft = (t: number) => T.slice(t, GRAD + 1).filter((c) => /[FS]$/.test(c)).length;

// ---- What each goal needs (proposed data; see docs/TIMING_AUDIT.md §6) -------------------------------------------
/** Fall/spring terms that must remain, counting the start term, for the goal to be finished and to pay off. */
const MIN_TERMS_LEFT: Record<string, [number, string]> = {
  "e-thesis": [2, "a thesis runs two semesters, and proposals are approved before it starts"],
  "e-research-assistant": [2, "a lab needs a semester to train you before the work (and the letter) pays off"],
  "e-org-leadership": [2, "officers are elected in spring to serve the next year"],
  "e-join-orgs": [2, "joining pays off through the semesters after"],
  "e-design-team": [2, "teams build over a year toward a competition"],
  "a-certificate-minor": [3, "a minor needs several semesters of courses"],
  "a-packaging-certificate": [3, "the certificate needs three more packaging courses"],
  "e-study-abroad": [2, "you apply a semester ahead, and the program runs during school"],
  "e-coop": [2, "a six-month co-op takes a semester away from classes"],
  "f-aid-check": [2, "state and campus aid pay off in the years you're still enrolled"],
  "a-fellowship-advising": [2, "fellowship applications come after the advising"],
  "e-tutor-ta": [2, "TA and tutor roles are hired a semester ahead"],
  "e-field-placement": [2, "the placement runs across the final year"],
  "s-lab-techniques": [2, "lab techniques are learned in a lab over a semester or more"],
  "f-ces-advisor": [2, "a plan made with an advisor needs semesters to act on"],
  "f-explore-careers": [2, "exploring careers pays off while you can still change course"],
  "n-career-fair-first": [3, "a practice fair is for before the fairs that count"],
};
/** Applications for a later summer or program: what they're for, and whether that is still before graduation. */
const APPLIES_FOR_NEXT_SUMMER = new Set(["ap-internship-early", "ap-internship-target", "ap-research-apps", "ap-early-programs"]);
/** Goals that need you to be an enrolled student. */
const STUDENT_ONLY = new Set(["e-research-assistant", "e-join-orgs", "e-org-leadership", "e-thesis", "e-design-team", "e-student-media",
  "e-study-abroad", "e-coop", "e-tutor-ta", "e-field-placement", "a-certificate-minor", "a-packaging-certificate", "f-aid-check", "f-fafsa",
  "n-career-fair-first", "ap-research-apps", "ap-early-programs", "ap-internship-early", "ap-internship-target", "e-internship-explore",
  "e-internship-target", "e-summer-research", "e-pack-competition", "e-case-competition", "s-lab-techniques", "e-nursing-externship", "e-pharmacy-intern"]);
/** Practice or groundwork for another goal: pointless once that goal is underway or behind the student. */
// Practising alongside the real thing is fine (a mock interview during the job search), so only goals whose whole
// point is to come first are listed: a practice fair, programs for first- and second-years, early internships, and
// exploring careers once the student is applying for jobs in one.
const PREPARES_FOR: Record<string, string[]> = {
  "n-career-fair-first": ["n-career-fair-target", "e-internship-target", "ap-fulltime"],
  "ap-early-programs": ["e-internship-target", "ap-internship-target"],
  "ap-internship-early": ["e-internship-target", "ap-fulltime"],
  "f-explore-careers": ["ap-fulltime", "ap-grad-apps"],
};
/** Goals that need at least one semester of classes after they end (a co-op that ends at graduation delays it). */
const NEEDS_RETURN = new Set(["e-coop", "e-study-abroad"]);
/** Goals only possible inside a specific degree program (a licence track, a required placement). Skills anyone can
 *  learn (CAD, Python, SQL) are not here: a career path may rightly pull those into another major's plan. */
const NEEDS_PROGRAM = new Set(["e-field-placement", "a-nclex-prep", "e-nursing-externship", "e-pharmacy-intern", "c-fe", "a-residency-plan"]);
const suggested = (trackId: string, majorId: string) => data.tracks.find((t) => t.id === trackId)!.suggestedMajors.includes(majorId);

// ---- Students: realistic experience for each year, plus the extremes ------------------------------------------
let seed = 20261123;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const BY_YEAR: string[][] = [
  [],
  ["resume", "handshake", "club"],
  ["resume", "handshake", "linkedin", "club", "job", "career-fair"],
  ["resume", "handshake", "linkedin", "club", "job", "career-fair", "internship-any", "info-interviews", "mock-interview"],
];
const EXTRAS = ["research", "leader", "volunteer", "project", "github", "internship-target", "recommenders", "society", "mentor", "tutor"];
function profiles(year: number): [string, string[]][] {
  const typical = BY_YEAR[year - 1];
  const extra = EXTRAS.filter(() => rnd() < 0.3);
  return [["none", []], ["typical", typical], ["typical+", [...typical, ...extra]], ["research", [...typical, "research"]]];
}

// ---- Rules -----------------------------------------------------------------------------------------------------
interface Hit { rule: string; goal: string; term: string; now: string; student: string; current: boolean; detail: string }
const hits: Hit[] = [];
function check(p: Plan, input: PlanInput, student: string) {
  const now = ix(p.terms[0]?.code ?? "1F");
  const placed = new Map<string, number[]>(); // goal id -> terms
  for (const t of p.terms) for (const it of t.items) { const id = it.goalId.split("@")[0]; placed.set(id, [...(placed.get(id) ?? []), ix(t.code)]); }
  const done = new Set([...p.done.map((d) => d.split("@")[0])]);
  const add = (rule: string, goal: string, term: number, detail: string) =>
    hits.push({ rule, goal, term: T[term], now: T[now], student, current: term === now, detail });
  for (const [id, terms] of placed) {
    const start = Math.min(...terms), g = goals.get(id)!;
    // L1: starts with too few semesters left to finish it or for it to pay off.
    const need = MIN_TERMS_LEFT[id];
    if (need && start <= GRAD && schoolTermsLeft(start) < need[0]) add("L1 starts too late to finish or pay off", id, start, `${schoolTermsLeft(start)} of ${need[0]} semesters left: ${need[1]}`);
    // L2: applications for a summer or program that would come after graduation.
    if (APPLIES_FOR_NEXT_SUMMER.has(id) && start <= GRAD && start > ix("3S")) add("L2 applies for something after graduation", id, start, "the summer it applies for comes after graduation");
    // L3: needs enrollment, planned after graduation (or a part of it spills past graduation).
    if (STUDENT_ONLY.has(id) && terms.some((t) => t > GRAD)) add("L3 needs you to be a student, planned after graduation", id, terms.find((t) => t > GRAD)!, T.filter((_, i) => terms.includes(i)).join("+"));
    // L4: practice or groundwork placed with or after the thing it prepares for (or once that is done).
    for (const target of PREPARES_FOR[id] ?? []) {
      const tt = placed.get(target);
      if (done.has(target) || (tt && Math.min(...tt) <= start)) { add("L4 groundwork with or after what it prepares for", id, start, `${target} ${done.has(target) ? "is done" : `starts ${T[Math.min(...tt!)]}`}`); break; }
    }
    // L7: a goal written for one major shown to another (a career path's weights can pull it in).
    if (NEEDS_PROGRAM.has(id) && g.majors && !g.majors.includes(input.majorId))
      add(`L7 needs a degree program the student isn't in (${suggested(input.trackId, input.majorId) ? "suggested path" : "path chosen from all"})`, id, start, `for ${g.majors.join(", ")}`);
    // L8: leaves no semester of classes after it.
    if (NEEDS_RETURN.has(id) && Math.max(...terms) === GRAD) add("L8 leaves no semester to come back to", id, start, T.filter((_, i) => terms.includes(i)).join("+"));
    // L5: a goal split across terms whose last part lands after graduation when it needs enrollment is L3; here: any
    // pre-graduation goal (window latest <= 4S) that still has work after graduation.
    if (ix(g.window.latest) <= GRAD && terms.some((t) => t > GRAD) && !STUDENT_ONLY.has(id)) add("L5 runs past graduation", id, terms.find((t) => t > GRAD)!, T.filter((_, i) => terms.includes(i)).join("+"));
  }
  // L6: "Up next" promises a goal that can't start in time any more.
  for (const b of p.backlog.filter((x) => x.kind === "next")) {
    const id = b.goalId.split("@")[0], need = MIN_TERMS_LEFT[id];
    const nextTerm = now + 1;
    if (need && schoolTermsLeft(Math.min(nextTerm, GRAD)) < need[0]) add("L6 queued as next but can't start in time", id, now, `next term has ${schoolTermsLeft(Math.min(nextTerm, GRAD))} of ${need[0]} semesters left`);
    if (APPLIES_FOR_NEXT_SUMMER.has(id) && nextTerm > ix("3S")) add("L6 queued as next but can't start in time", id, now, "the summer it applies for would come after graduation");
  }
}

// ---- The grid --------------------------------------------------------------------------------------------------
const WHEN = [[1, "2026-10-01", "fall"], [2, "2027-02-15", "spring"], [undefined, "2027-06-20", "summer"]] as const;
let plans = 0;
const studentsBy = new Map<string, number>(); // year+season -> plans
for (const m of majors) for (const campus of Object.keys(m.offeredAt)) for (const track of data.tracks) {
  for (const year of [1, 2, 3, 4] as const) for (const [semester, today, season] of WHEN) for (const [prof, experience] of profiles(year)) {
    for (const [weeklyHours, horizon] of [[5, "after-graduation"], [15, "graduation"]] as const) {
      const input: PlanInput = { status: "college-student", majorId: m.id, year, semester, trackId: track.id, school: `rutgers-${campus}` as PlanInput["school"],
        horizon, today, weeklyHours, summer: "full", location: "nj", citizenship: "us-citizen", experience };
      const p = buildPlan(input, data);
      plans++;
      const k = `year ${year} ${season}`; studentsBy.set(k, (studentsBy.get(k) ?? 0) + 1);
      check(p, input, `${campus} · ${m.id} · ${track.id} · ${k} · ${prof} · ${weeklyHours} h · ${horizon}`);
    }
  }
}

// ---- Report ----------------------------------------------------------------------------------------------------
const plansWith = (f: (h: Hit) => boolean) => new Set(hits.filter(f).map((h) => h.student)).size;
console.log(`${plans} plans. With a goal started too late or for nothing: ${plansWith(() => true)}; in the term the student is in now: ${plansWith((h) => h.current)}`);
for (const k of [...studentsBy.keys()]) console.log(`  ${k}: ${plansWith((h) => h.student.includes(k) && h.current)} of ${studentsBy.get(k)} in the current term, ${plansWith((h) => h.student.includes(k))} anywhere`);
const groups = new Map<string, Hit[]>();
for (const h of hits) { const k = `${h.rule}|${h.goal}`; groups.set(k, [...(groups.get(k) ?? []), h]); }
const rows = [...groups.values()].map((hs) => ({
  rule: hs[0].rule, goal: hs[0].goal, title: goals.get(hs[0].goal)?.title ?? hs[0].goal,
  plans: new Set(hs.map((h) => h.student)).size, nowPlans: new Set(hs.filter((h) => h.current).map((h) => h.student)).size,
  terms: [...new Set(hs.map((h) => h.term))].sort((a, b) => ix(a) - ix(b)), detail: hs[0].detail, example: hs[0].student,
})).sort((a, b) => a.rule.localeCompare(b.rule) || b.plans - a.plans);
const out = process.argv.indexOf("--json");
if (out > 0) writeFileSync(process.argv[out + 1], JSON.stringify({ plans, rows }, null, 2));
let rule = "";
for (const r of rows) {
  if (r.rule !== rule) { rule = r.rule; console.log(`\n${rule}: ${rows.filter((x) => x.rule === rule).length} goals, ${plansWith((h) => h.rule === rule)} plans`); }
  console.log(`  - ${r.goal} "${r.title}" in ${r.terms.join(",")}: ${r.plans} plans (${r.nowPlans} this term)\n      ${r.detail}\n      e.g. ${r.example}`);
}
