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
import type { PlanInput } from "../src/engine/types.ts";
import { auditPlan, type Hit } from "./timing-rules.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = loadDataset(join(root, "data"));
const majors = JSON.parse(readFileSync(join(root, "data/majors.json"), "utf8")).majors as { id: string; offeredAt: Record<string, unknown> }[];
const T = data.terms, ix = (c: string) => T.indexOf(c);

// ---- The grid --------------------------------------------------------------------------------------------------
const SCHOOLS = [["nb", "rutgers-nb"], ["newark", "rutgers-newark"], ["camden", "rutgers-camden"]] as const;
const WHEN: { semester?: 1 | 2; today: string; tag: string }[] = [
  { semester: 1, today: "2026-10-01", tag: "fall" }, { semester: 2, today: "2027-02-15", tag: "spring" }, { today: "2027-06-20", tag: "summer" },
];
let plans = 0;
const hits: Hit[] = [];
for (const [campus, school] of SCHOOLS) for (const m of majors.filter((x) => campus in x.offeredAt)) {
  const tracks = data.tracks.filter((t) => t.suggestedMajors.includes(m.id));
  for (const track of tracks.length ? tracks : data.tracks.filter((t) => t.id === "exploring")) for (const year of [1, 2, 3, 4] as const) for (const w of WHEN) {
    for (const weeklyHours of [5, 15]) {
      const input: PlanInput = { status: "college-student", majorId: m.id, year, semester: w.semester, trackId: track.id, school,
        horizon: "after-graduation", today: w.today, weeklyHours, summer: "full", location: "nj", citizenship: "us-citizen" };
      const p = buildPlan(input, data);
      plans++;
      hits.push(...auditPlan(p, data, `${school.replace("rutgers-", "")} · ${m.id} · ${track.id} · year ${year} ${w.tag} · ${weeklyHours} h`));
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
