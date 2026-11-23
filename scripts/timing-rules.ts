// The timing rules behind `npm run audit:timing` and test/timing.test.ts: read what the site shows for a plan (titles,
// steps, done-when, reasons, resource notes, the queue, notices) and flag time words that don't fit the term each line
// is shown in. See docs/TIMING_AUDIT.md.
import type { Dataset, Goal, Plan } from "../src/engine/types.ts";

export interface Hit { rule: string; goal: string; field: string; phrase: string; text: string; term: string; now: string; student: string }
type LateGoal = Goal & { late?: { title?: string; steps?: string[]; doneWhen?: string; why?: string } };

export function auditPlan(p: Plan, data: Dataset, student: string): Hit[] {
  const T = data.terms, ix = (c: string) => T.indexOf(c);
  const goals = new Map(data.goals.map((g) => [g.id, g as LateGoal]));
  const hits: Hit[] = [];
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


  const now = ix(p.terms[0]?.code ?? "1F"), final = ix("4S");
  for (const t of p.terms) for (const it of t.items) {
    const id = it.goalId.split("@")[0], g = goals.get(id)!, term = ix(t.code);
    const late = it.late ? g.late : undefined;
    const at = (field: string) => ({ goal: id, field, term, now, final, student });
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
  return hits;
}
