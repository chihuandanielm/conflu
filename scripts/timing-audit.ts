// Timing audit: does every piece of text a student reads make sense for the semester it is shown in?
// Builds a plan for every campus × major × suggested career path × year × semester (plus a summer date), then reads
// what the site shows for each planned goal (title, steps, done-when, reasons, resource notes), the queue, and the
// notices, and flags time words that don't fit the term: "during junior year" shown in senior spring, "apply by
// October" shown in spring, "next summer" shown in the last semester.
// Run: node --experimental-strip-types scripts/timing-audit.ts [--json out.json]
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPlan } from "../src/engine/engine.ts";
import { loadDataset } from "../src/engine/load.ts";
import type { Goal, PlanInput } from "../src/engine/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = loadDataset(join(root, "data"));
const majors = JSON.parse(readFileSync(join(root, "data/majors.json"), "utf8")).majors as { id: string; offeredAt: Record<string, unknown> }[];
const goals = new Map(data.goals.map((g) => [g.id, g as Goal & { late?: { title?: string; steps?: string[]; doneWhen?: string; why?: string } }]));
const T = data.terms; // 1F 1S 1U 2F ... 4S G1 G2
const ix = (c: string) => T.indexOf(c);

// ---- Time words and the terms they point at --------------------------------------------------------------------
type Ref = { re: RegExp; from: number; to: number; kind: string };
const Y = (y: number) => [(y - 1) * 3, (y - 1) * 3 + 2] as const; // fall..summer of year y
const stage = (words: string, y: number): Ref[] => [
  { re: new RegExp(`\\b(${words}) (fall|autumn)\\b`, "i"), from: Y(y)[0], to: Y(y)[0], kind: "stage" },
  { re: new RegExp(`\\b(${words}) spring\\b`, "i"), from: Y(y)[0] + 1, to: Y(y)[0] + 1, kind: "stage" },
  { re: new RegExp(`\\b(${words}) summer\\b|\\bsummer (after|before) (your )?(${words}) year\\b`, "i"),
    from: Y(y)[0] + 2, to: Y(y)[0] + 2, kind: "stage" },
  { re: new RegExp(`\\b(your |in |during |by |before |as an? |the )?(${words}) (year|semester|semesters)\\b|\\bas an? (${words})\\b|\\b(${words})s\\b`, "i"),
    from: Y(y)[0], to: Y(y)[1], kind: "stage" },
];
const REFS: Ref[] = [
  // "summer before senior year" is the summer after junior year
  { re: /\bsummer before (your )?(senior|fourth) year\b/i, from: ix("3U"), to: ix("3U"), kind: "stage" },
  { re: /\bsummer before (your )?(junior|third) year\b/i, from: ix("2U"), to: ix("2U"), kind: "stage" },
  { re: /\bsummer before (your )?(sophomore|second) year\b/i, from: ix("1U"), to: ix("1U"), kind: "stage" },
  ...stage("first-year|first year|freshman|freshmen", 1),
  ...stage("sophomore|second-year|second year", 2),
  ...stage("junior|third-year|third year", 3),
  ...stage("senior|fourth-year|fourth year|final-year|final year|last year", 4).map((r) => ({ ...r, to: Math.min(r.to, ix("4S")) })),
  { re: /\b(4|four)-year plan\b/i, from: 0, to: ix("1U"), kind: "start-of-college" },
  { re: /\b(early in college|early college|your first semester|first semester|start of college|before classes get hard)\b/i, from: 0, to: ix("1S"), kind: "start-of-college" },
  { re: /\bfirst college (resume|job|internship)\b|\byour first career fair\b/i, from: 0, to: ix("2S"), kind: "start-of-college" },
];
// Phrases that look forward to a later stage are fine before it ("before junior year", "prepare for senior year").
const FORWARD = /\b(before|by|ahead of|prepare for|preparing for|plan for|planning for|for|until|leading into|going into|heading into|in time for|start of)\s+(your\s+|the\s+)?$/i;

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const seasonOfMonth = (m: number) => (m >= 8 ? "F" : m <= 4 ? "S" : "U"); // Sep–Dec fall, Jan–May spring, Jun–Aug summer
const MONTH_RE = /\b(by|before|in|during|from|until|opens?|closes?|due|deadline[s]?( is| are)?|through|early|mid|late|each|every)?[\s-]*(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi;
const RELATIVE: { re: RegExp; bad: (t: number, final: number) => boolean; why: string }[] = [
  { re: /\bnext (summer|fall|year|school year|semester)\b/i, bad: (t, f) => t >= f, why: "points past graduation" },
  { re: /\b(remaining semesters|semesters you have left|time you have left)\b/i, bad: (t) => t <= ix("2S"), why: "late-college wording early in college" },
  { re: /\bbefore (you )?graduat/i, bad: (t) => t > ix("4S"), why: "before graduation, shown after it" },
  { re: /\b(this|over the) summer\b/i, bad: (t) => T[t].endsWith("F") || T[t].endsWith("S"), why: "says summer, shown in a fall or spring term" },
  { re: /\b(this|over the) (fall|spring) (semester)?\b/i, bad: (t) => T[t].endsWith("U"), why: "says fall/spring, shown in a summer" },
  { re: /\b(start|begin|try|join|explore) .*\b(early|now|first)\b/i, bad: () => false, why: "" },
];

// ---- What the site shows ---------------------------------------------------------------------------------------
interface Hit { rule: string; goal: string; field: string; phrase: string; text: string; term: string; now: string; student: string }
const hits: Hit[] = [];
function scan(text: string | undefined | null, where: { goal: string; field: string; term: number; now: number; final: number; student: string }) {
  if (!text) return;
  const add = (rule: string, phrase: string) =>
    hits.push({ rule, goal: where.goal, field: where.field, phrase, text, term: T[where.term], now: T[where.now], student: where.student });
  for (const r of REFS) {
    const m = text.match(r.re);
    if (!m) continue;
    const before = text.slice(0, m.index).slice(-28);
    const forward = FORWARD.test(before) || /^(before|by|for|until|in time for) /i.test(m[0]);
    if (r.to < where.term) {
      // A stage that has already passed. "Before junior year" in senior year is past too.
      if (/\b(senior design|senior thesis|senior project|junior (developer|analyst|engineer|associate|accountant|designer))/i.test(m[0])) continue;
      add(r.kind === "stage" ? "T1 refers to a year that has passed" : "T2 start-of-college wording late", m[0]);
    } else if (r.from > where.term && !forward) {
      add("T3 tells a student to do now what belongs to a later year", m[0]);
    }
  }
  // Months: a deadline or month outside the term the goal is shown in, within the same school year.
  for (const m of text.matchAll(MONTH_RE)) {
    const mon = MONTHS.indexOf(m[3].toLowerCase()), s = seasonOfMonth(mon), term = T[where.term];
    if (term.startsWith("G")) continue;
    const ts = term[1];
    // Spring term reading "by October" / "in September": that month has passed this school year.
    const past = (ts === "S" && s === "F") || (ts === "U" && (s === "F" || s === "S"));
    const ahead = (ts === "F" && s === "U") || (ts === "S" && s === "U" && /\b(by|before|due|deadline|closes?)\b/i.test(m[1] ?? ""));
    if (past) add("T4 month already past in this term", m[0].trim());
    else if (ahead) add("T5 month belongs to a later term", m[0].trim());
  }
  for (const r of RELATIVE) { const m = text.match(r.re); if (m && r.why && r.bad(where.term, where.final)) add(`T6 ${r.why}`, m[0]); }
}

// ---- The grid --------------------------------------------------------------------------------------------------
const SCHOOLS = [["nb", "rutgers-nb"], ["newark", "rutgers-newark"], ["camden", "rutgers-camden"]] as const;
const WHEN: { semester?: 1 | 2; today: string; tag: string }[] = [
  { semester: 1, today: "2026-10-01", tag: "fall" }, { semester: 2, today: "2027-02-15", tag: "spring" }, { today: "2027-06-20", tag: "summer" },
];
let plans = 0;
const shownPerGoal = new Map<string, number>(); // how many plan items each goal appears as (for rates)
for (const [campus, school] of SCHOOLS) for (const m of majors.filter((x) => campus in x.offeredAt)) {
  const tracks = data.tracks.filter((t) => t.suggestedMajors.includes(m.id));
  for (const track of tracks.length ? tracks : data.tracks.filter((t) => t.id === "exploring")) for (const year of [1, 2, 3, 4] as const) for (const w of WHEN) {
    for (const weeklyHours of [5, 15]) {
      const input: PlanInput = { status: "college-student", majorId: m.id, year, semester: w.semester, trackId: track.id, school,
        horizon: "after-graduation", today: w.today, weeklyHours, summer: "full", location: "nj", citizenship: "us-citizen" };
      const p = buildPlan(input, data);
      plans++;
      const now = ix(p.terms[0]?.code ?? "1F"), final = ix("4S");
      const student = `${school.replace("rutgers-", "")} · ${m.id} · ${track.id} · year ${year} ${w.tag} · ${weeklyHours} h`;
      for (const t of p.terms) for (const it of t.items) {
        const id = it.goalId.split("@")[0], g = goals.get(id)!, term = ix(t.code);
        const late = it.late ? g.late : undefined;
        const at = (field: string) => ({ goal: id, field, term, now, final, student });
        shownPerGoal.set(id, (shownPerGoal.get(id) ?? 0) + 1);
        scan(it.title, at("title"));
        (late?.steps ?? g.steps ?? []).forEach((s, k) => scan(s, at(`step ${k + 1}`)));
        scan(late?.doneWhen ?? g.doneWhen, at("done when"));
        it.why.forEach((s) => scan(s, at("why")));
        for (const r of it.resources) scan(r.note, at(`resource note (${r.id})`));
        if (g.deadline) scan(g.deadline, at("deadline"));
      }
      for (const b of p.backlog.filter((x) => x.kind === "next" || x.kind === "continues")) {
        scan(b.title, { goal: b.goalId.split("@")[0], field: `queue (${b.kind}) title`, term: now, now, final, student });
        scan(b.reason, { goal: b.goalId.split("@")[0], field: `queue (${b.kind}) reason`, term: now, now, final, student });
      }
      for (const n of p.warnings) scan(n, { goal: "(notice)", field: "notice", term: now, now, final, student });
    }
  }
}

// ---- Report ----------------------------------------------------------------------------------------------------
const key = (h: Hit) => `${h.rule}|${h.goal}|${h.field}|${h.phrase.toLowerCase()}`;
const groups = new Map<string, Hit[]>();
for (const h of hits) groups.set(key(h), [...(groups.get(key(h)) ?? []), h]);
const rows = [...groups.values()].map((hs) => ({
  rule: hs[0].rule, goal: hs[0].goal, field: hs[0].field, phrase: hs[0].phrase, text: hs[0].text,
  count: hs.length, students: new Set(hs.map((h) => h.student)).size, terms: [...new Set(hs.map((h) => h.term))].sort((a, b) => ix(a) - ix(b)),
  example: hs[0].student,
})).sort((a, b) => a.rule.localeCompare(b.rule) || b.students - a.students);

// Students with a problem anywhere, and in the term they are in now.
const stu = new Map<string, { any: boolean; now: boolean }>();
for (const h of hits) { const s = stu.get(h.student) ?? { any: false, now: false }; s.any = true; if (h.term === h.now) s.now = true; stu.set(h.student, s); }
const byYear = new Map<string, [number, number]>();
for (const [s, v] of stu) { const y = s.split(" · ")[3]; const e = byYear.get(y) ?? [0, 0]; e[0]++; if (v.now) e[1]++; byYear.set(y, e); }
console.log(`students (plan cases) with a problem somewhere: ${stu.size} of ${plans}; in the term they are in now: ${[...stu.values()].filter((v) => v.now).length}`);
for (const [y, [a, n]] of [...byYear].sort()) console.log(`  ${y}: ${a} with a problem, ${n} in the current term`);
const out = process.argv.indexOf("--json");
if (out > 0) writeFileSync(process.argv[out + 1], JSON.stringify({ plans, distinct: rows.length, shown: hits.length, rows }, null, 2));
console.log(`${plans} plans, ${hits.length} timing problems shown, ${rows.length} distinct (rule · goal · field · phrase)`);
const byRule = new Map<string, typeof rows>();
for (const r of rows) byRule.set(r.rule, [...(byRule.get(r.rule) ?? []), r]);
for (const [rule, rs] of byRule) {
  console.log(`\n${rule}: ${rs.length} distinct, ${rs.reduce((s, r) => s + r.count, 0)} shown`);
  for (const r of rs.slice(0, process.argv.includes("--all") ? 999 : 15))
    console.log(`  - ${r.goal} · ${r.field} · "${r.phrase}" in ${r.terms.join(",")} (${r.students} students)\n      ${r.text.slice(0, 150)}`);
}
