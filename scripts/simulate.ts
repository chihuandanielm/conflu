// Simulation audit: 4 varied students for every major at every school (3 Rutgers campuses + "another school"),
// each checked against rules a confused, directionless student would trip over. Prints every issue with the case
// that produced it and exits non-zero if any are found.
// Run: node --experimental-strip-types scripts/simulate.ts [--json]
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { availableAt, buildPlan, campusOf } from "../src/engine/engine.ts";
import { guidesFor } from "../src/engine/display.ts";
import { loadDataset } from "../src/engine/load.ts";
import type { Goal, Plan, PlanInput, ResourceLite } from "../src/engine/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = loadDataset(join(root, "data"));
const majors = JSON.parse(readFileSync(join(root, "data/majors.json"), "utf8")).majors as { id: string; name: string; offeredAt: Record<string, unknown> }[];
const intake = JSON.parse(readFileSync(join(root, "data/intake.json"), "utf8"));
const goals = new Map(data.goals.map((g) => [g.id, g]));
const res = new Map(data.resources.map((r) => [r.id, r as ResourceLite & { name: string; type: string; years: (number | string)[] }]));
const T = data.terms;

// Deterministic choices: a tiny seeded RNG so every run audits the same students.
let seed = Number(process.env.SIM_SEED ?? 20261116);
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = <X>(xs: readonly X[]) => xs[Math.floor(rnd() * xs.length)];
const some = <X>(xs: readonly X[], max: number) => xs.filter(() => rnd() < max / Math.max(1, xs.length));

const SCHOOLS = [["nb", "rutgers-nb"], ["newark", "rutgers-newark"], ["camden", "rutgers-camden"], [null, "other"]] as const;
// Dates across the calendar: early fall, late fall, early spring, late spring, summer.
const DATES = ["2026-09-10", "2026-11-16", "2027-02-01", "2027-04-20", "2027-06-20"];

export interface Issue { rule: string; detail: string; case: string }
const issues: Issue[] = [];
const yearWords: [RegExp, (yearOfTerm: number) => boolean][] = [
  [/junior summer|after junior year/i, (y) => y >= 4],
  [/sophomore year|after sophomore/i, (y) => y >= 3],
  [/first- and second-year|first-year|freshman/i, (y) => y >= 3],
  [/4-year plan|four-year plan|first college resume|your first career fair/i, (y) => y >= 3],
];

function check(input: PlanInput, p: Plan, label: string) {
  const add = (rule: string, detail: string) => issues.push({ rule, detail, case: label });
  const nowIdx = T.indexOf(p.terms[0]?.code ?? "1F");
  const yearOf = (code: string) => (code.startsWith("G") ? 5 : Number(code[0]));
  const campus = campusOf(input.school);
  // R1: wording that assumes an earlier year than the term it's planned for (or the student's current term for the queue).
  for (const t of p.terms) for (const it of t.items) for (const [re, bad] of yearWords) {
    if (re.test(it.title) && bad(yearOf(t.code))) add("R1 wrong-year wording in plan", `${t.code} "${it.title}"`);
  }
  for (const b of p.backlog.filter((x) => x.kind === "next")) {
    for (const [re, bad] of yearWords) if (re.test(b.title) && bad(yearOf(T[nowIdx]))) add("R2 wrong-year goal queued as next", `"${b.title}"`);
    const g = goals.get(b.goalId.split("@")[0])!;
    const win = g.window, latest = T.indexOf(win.latest);
    if (latest < nowIdx && !g.lateOk) add("R3 closed-window goal queued as next", `"${b.title}" (latest ${win.latest}, now ${T[nowIdx]})`);
  }
  // R4: resources and guides written for another year.
  for (const t of p.terms) for (const it of t.items) {
    const y = Math.min(4, yearOf(t.code));
    for (const r of it.resources) {
      const full = res.get(r.id)!;
      if (full.years && !full.years.includes(y) && !full.years.includes("grad")) add("R4 resource for another year", `${t.code} ${it.goalId}: ${full.name} (years ${full.years.join(",")})`);
    }
    for (const gr of guidesFor(goals.get(it.goalId.split("@")[0])!, t.code, res)) {
      if (/first-year|first year|freshm|sophomore/i.test(gr.name) && y >= 3) add("R5 guide aimed at another year", `${t.code} ${it.goalId}: ${gr.name}`);
    }
  }
  // R6: campus and major correctness.
  for (const t of p.terms) for (const it of t.items) for (const r of it.resources) {
    if (!availableAt(res.get(r.id)!, input)) add("R6 resource from another campus", `${it.goalId}: ${r.id}`);
  }
  for (const t of p.terms) for (const it of t.items) {
    const g = goals.get(it.goalId.split("@")[0])!;
    const track = data.tracks.find((x) => x.id === input.trackId)!;
    if (g.majors && !g.majors.includes(input.majorId) && !(g.id in track.boosts) && !track.gates.includes(g.id)) add("R7 goal for another major", `${it.goalId}`);
  }
  // R8: discouraging or confusing wording anywhere the student reads.
  const text = [...p.warnings, ...p.terms.flatMap((t) => t.items.flatMap((i) => [i.title, ...i.why])), ...p.backlog.map((b) => `${b.title} ${b.reason}`)];
  for (const s of text) if (/didn't fit|hours a week would|getting late|you need \d+ hours/i.test(s)) add("R8 discouraging or stale wording", s.slice(0, 120));
  // R9: structural sanity.
  for (const t of p.terms) {
    if (t.usedHours > t.capacityHours + 1) add("R9 term over capacity", `${t.code} ${t.usedHours}/${t.capacityHours}`);
    const ids = t.items.map((i) => i.goalId); if (new Set(ids).size !== ids.length) add("R9 duplicate goal in a term", t.code);
  }
  if (p.terms[0] && p.terms[0].capacityHours > 3 && p.terms[0].items.length === 0) add("R10 nothing to do this term", `${p.terms[0].code} with ${p.terms[0].capacityHours} h free`);
  // R11: the track's must-do goals should be in the plan, queued as possible, or explained.
  const track = data.tracks.find((x) => x.id === input.trackId)!;
  for (const gate of track.gates) {
    const placed = p.terms.some((t) => t.items.some((i) => i.goalId.split("@")[0] === gate));
    const queued = p.backlog.find((b) => b.goalId.split("@")[0] === gate);
    const done = (input.completedGoals ?? []).includes(gate);
    if (!placed && !queued && !done && !p.ongoing.some((o) => o.goalId === gate)) {
      const g = goals.get(gate)!;
      const covered = (input.experience ?? []).length > 0; // may be completed by intake answers
      if (!covered) add("R11 must-do goal missing without a reason", `${gate} "${g.title}"`);
    }
  }
  // R13: anything shown that reads as "you missed this": earlier-year goals anywhere in the queue, even "not now".
  for (const b of p.backlog.filter((x) => x.kind === "optional" || x.kind === "not-now")) for (const [re, bad] of yearWords) {
    if (re.test(b.title) && bad(yearOf(T[nowIdx]))) add("R13 missed earlier-year goal shown", `"${b.title}" (${b.kind})`);
  }
  // R14: too many goals in one term for the time the student has. Baby steps: about 2 + hours/4, between 3 and 6.
  const cap = Math.min(6, Math.max(3, Math.round(2 + (input.weeklyHours ?? 5) / 4)));
  for (const t of p.terms) if (t.items.filter((i) => !i.gate && !i.essential).length > cap) add("R14 too many goals in a term", `${t.code}: ${t.items.length} goals (cap ${cap} at ${input.weeklyHours} h/week, plus must-dos)`);
  // R15/R16: the queue repeats what's already planned, or lists the same goal twice.
  for (const b of p.backlog.filter((x) => x.kind === "next")) if (p.terms.some((t) => t.items.some((i) => i.goalId === b.goalId))) add("R15 planned goal also in Up next", `"${b.title}"`);
  const upTitles = p.backlog.filter((x) => x.kind === "next").map((b) => b.title);
  for (const tt of new Set(upTitles)) if (upTitles.filter((x) => x === tt).length > 1) add("R16 same title twice in Up next", `"${tt}"`);
  // R17: notices that don't fit the student's year, or contradict the plan.
  for (const w of p.warnings) {
    for (const [re, bad] of yearWords) if (re.test(w) && bad(yearOf(T[nowIdx]))) add("R17 notice for an earlier year", w.slice(0, 110));
    if (/sophomore (fall|winter|spring)/i.test(w) && nowIdx > T.indexOf("3F")) add("R17 notice for an earlier year", w.slice(0, 110));
    if (/junior fall/i.test(w) && nowIdx > T.indexOf("3F")) add("R17 notice for an earlier year", w.slice(0, 110));
    if (/junior-summer|junior summer/i.test(w) && nowIdx > T.indexOf("3U")) add("R17 notice for an earlier year", w.slice(0, 110));
    const m = w.match(/^"(.+?)" is essential .* next in line/);
    if (m && p.terms.some((t) => t.items.some((i) => i.title === m[1]))) add("R18 'next in line' notice for a planned goal", m[1]);
  }
  // R19: seniors working toward a job always have the job search in their plan.
  const gradTrack = track.outcome === "grad-school";
  if (yearOf(T[nowIdx]) === 4 && !gradTrack && (input.horizon === "graduation" || input.horizon === "after-graduation") && !(track.suppress ?? []).includes("ap-fulltime") && !p.terms.some((t) => t.items.some((i) => i.goalId === "ap-fulltime"))) add("R19 senior without the job search", input.trackId);
  const reachesGrad = input.horizon === "graduation" || input.horizon === "after-graduation";
  if (yearOf(T[nowIdx]) === 4 && gradTrack && reachesGrad && !p.terms.some((t) => t.items.some((i) => i.goalId === "ap-grad-apps")) && !p.backlog.some((b) => b.goalId === "ap-grad-apps" && (b.kind === "continues" || (b.kind === "next" && /^Comes after/.test(b.reason))))) add("R19 grad-school senior without applications", input.trackId);
  // R20: notices that contradict the plan ("window has passed" for a scheduled goal).
  for (const w of p.warnings) { const m = w.match(/^"(.+?)" is usually required .* has passed/); if (m && p.terms.some((t) => t.items.some((i) => i.title === m[1]))) add("R20 notice contradicts the plan", m[1]); }
  // R21: backward-looking notices ("you missed this").
  for (const w of p.warnings) if (/has passed|too late|missed/i.test(w)) add("R21 backward-looking notice", w.slice(0, 110));
  // R22: goals that need semesters left (planning, a minor, an officer term, next year's aid, starting research or
  // study abroad) never start in the final semester before graduation.
  const NEEDS_TIME = new Set(["f-ces-advisor", "f-explore-careers", "a-certificate-minor", "a-packaging-certificate", "e-org-leadership", "f-aid-check", "e-research-assistant", "e-study-abroad", "a-fellowship-advising"]);
  const last = p.terms.find((t) => t.code === "4S"), before = p.terms.find((t) => t.code === "4F");
  for (const it of last?.items ?? []) if (NEEDS_TIME.has(it.goalId) && !before?.items.some((i) => i.goalId === it.goalId)) add("R22 needs-time goal in the final semester", `"${it.title}"`);
  // R23: a goal done late explaining itself as "early".
  for (const t of p.terms) for (const it of t.items) if (it.why.some((w) => /Most students do this earlier/.test(w))) {
    for (const w of it.why) if (/\bearly\b(?!-career|-ID)|start before|before senior fall/i.test(w)) add("R23 late goal explained as early", `${it.goalId}: ${w}`);
  }
  // R12: Rutgers-only offices shown to a student at another school.
  if (!campus) for (const t of p.terms) for (const it of t.items) for (const r of it.resources) if (res.get(r.id)!.scope === "rutgers") add("R12 Rutgers office for another school", r.id);
}

// Engine 0.9.0: the draft map and crossed-out goals, for the same student (no extra random picks, so cases stay the same).
function checkDraftAndSkip(input: PlanInput, final: Plan, label: string) {
  const add = (rule: string, detail: string) => issues.push({ rule, detail, case: label });
  const draft = buildPlan({ ...input, draft: true }, data);
  final.terms.forEach((t, i) => {
    const mine = draft.terms[i].items.filter((x) => !x.option).map((x) => `${x.goalId}:${x.hours}`).join(" ");
    if (mine !== t.items.map((x) => `${x.goalId}:${x.hours}`).join(" ")) add("R24 draft changes the plan", t.code);
    if (draft.terms[i].usedHours !== t.usedHours) add("R24 draft changes the plan", `${t.code} hours`);
  });
  const opts = draft.terms.flatMap((t) => t.items.filter((x) => x.option).map((x) => x.goalId));
  if (new Set(opts).size !== opts.length) add("R25 option repeated", opts.join(" "));
  for (const k of opts) if (draft.backlog.some((b) => b.goalId === k)) add("R25 option also queued", k);
  for (const t of draft.terms) {
    const shown = t.items.filter((x) => !x.gate && !x.essential).length;
    if (shown > 10) add("R25 too many options", `${t.code}: ${shown}`);
    for (const x of t.items) if (x.importance === undefined) add("R25 no importance", x.goalId);
  }
  // Cross out the first ordinary goal and the first must-do in the plan.
  const items = final.terms.flatMap((t) => t.items);
  const skip = [items.find((x) => !x.gate && !x.essential)?.goalId, items.find((x) => x.gate)?.goalId].filter((x): x is string => !!x);
  if (!skip.length) return;
  const p = buildPlan({ ...input, skippedGoals: skip }, data);
  for (const k of skip) {
    if (p.terms.some((t) => t.items.some((x) => x.goalId === k))) add("R26 crossed-out goal still planned", k);
    if (p.backlog.some((b) => b.goalId === k)) add("R26 crossed-out goal still queued", k);
    const title = data.goals.find((g) => g.id === k.split("@")[0])!.title;
    if (p.backlog.some((b) => b.reason.includes(`"${title}"`))) add("R26 waits on a crossed-out goal", k);
  }
  if (p.skipped.map((x) => x.goalId).sort().join() !== [...skip].sort().join()) add("R26 skipped list wrong", p.skipped.map((x) => x.goalId).join());
}

let n = 0;
for (const [campus, school] of SCHOOLS) {
  for (const m of majors.filter((x) => (campus ? campus in x.offeredAt : true))) {
    const suggested = data.tracks.filter((t) => t.suggestedMajors.includes(m.id));
    for (let k = 0; k < 4; k++) {
      const year = ([1, 2, 3, 4] as const)[k]; // every major sees every year
      const trackId = k === 3 ? pick(data.tracks).id : (suggested.length ? pick(suggested).id : "exploring");
      const input: PlanInput = {
        status: "college-student", majorId: m.id, year, semester: pick([undefined, 1, 2] as const), trackId, school,
        horizon: pick(intake.horizons.map((h: { id: string }) => h.id)), today: pick(DATES),
        weeklyHours: pick(intake.weeklyHours), summer: pick(["full", "part", "none"] as const), enrollment: pick(["full-time", "full-time", "part-time"] as const),
        location: pick(["nj", "nj", "us-other", "skip"] as const), citizenship: pick(["us-citizen", "us-pr", "international", "undocumented", "skip"] as const),
        identity: some(intake.optionalIdentity.tags, 2), experience: some(intake.experience.map((e: { id: string }) => e.id), 5 + year * 2),
        skills: some(intake.skills.map((s: { id: string }) => s.id), 3), credentials: [], openToCoop: pick([true, false]),
      };
      const label = `${school} · ${m.id} · y${year}${input.semester ? "/s" + input.semester : ""} · ${trackId} · ${input.today} · ${input.weeklyHours}h · ${input.horizon} · summer ${input.summer}`;
      try { const p = buildPlan(input, data); check(input, p, label); checkDraftAndSkip(input, p, label); } catch (e) { issues.push({ rule: "R0 crash", detail: String(e), case: label }); }
      n++;
    }
  }
}

if (process.argv.includes("--json")) console.log(JSON.stringify({ simulations: n, issues }, null, 2));
else {
  const byRule = new Map<string, Issue[]>();
  for (const i of issues) byRule.set(i.rule, [...(byRule.get(i.rule) ?? []), i]);
  console.log(`${n} simulations, ${issues.length} issues`);
  for (const [rule, xs] of [...byRule].sort()) {
    const distinct = [...new Map(xs.map((x) => [x.detail.replace(/^\d\w |^\w\d\w /, ""), x])).values()];
    console.log(`\n${rule}: ${xs.length} (${distinct.length} distinct)`);
    for (const x of distinct.slice(0, 12)) console.log(`  - ${x.detail}\n      ${x.case}`);
  }
}
process.exitCode = issues.length ? 1 : 0;
