// Application rounds and grad-school timing (engine 0.11.0, docs/TIMING_AUDIT.md §5 T3): goals with an application
// round are only planned in a term when that round is open, say when it opens and closes, and leave "Up next" once
// the round has closed; grad-school applicants say whether they apply this cycle or after a gap year.
// Run: node --experimental-strip-types --test test/rounds.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPlan } from "../src/engine/engine.ts";
import { loadDataset } from "../src/engine/load.ts";
import type { Plan, PlanInput } from "../src/engine/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = loadDataset(join(root, "data"));
const majors = JSON.parse(readFileSync(join(root, "data/majors.json"), "utf8")).majors as { id: string; offeredAt: Record<string, unknown> }[];
const T = data.terms, ix = (c: string) => T.indexOf(c);
const goal = (id: string) => data.goals.find((g) => g.id === id)!;

const plan = (p: Partial<PlanInput>): Plan => buildPlan({ status: "college-student", majorId: "computer-science", year: 2, semester: 2, trackId: "software-engineering",
  school: "rutgers-nb", horizon: "after-graduation", today: "2027-02-15", weeklyHours: 10, summer: "full", ...p } as PlanInput, data);
const placed = (p: Plan, id: string) => p.terms.filter((t) => t.items.some((i) => i.goalId.split("@")[0] === id)).map((t) => t.code);
const item = (p: Plan, id: string) => p.terms.flatMap((t) => t.items).find((i) => i.goalId.split("@")[0] === id);
const next = (p: Plan, id: string) => p.backlog.some((b) => b.goalId.split("@")[0] === id && b.kind === "next");

// Months each term covers (the current term from today's month).
const MONTHS: Record<string, number[]> = { F: [9, 10, 11, 12], S: [1, 2, 3, 4, 5], U: [6, 7, 8] };
const termMonths = (code: string, now: string, today: string) => {
  const s = code.startsWith("G") ? (code === "G1" ? "F" : "S") : code[1];
  const all = MONTHS[s];
  return code === now ? all.filter((m) => m >= Number(today.slice(5, 7)) || (s === "F" && Number(today.slice(5, 7)) < 9)) : all;
};
const inRound = (m: number, o: number, c: number) => (o <= c ? m >= o && m <= c : m >= o || m <= c);

test("goals with an application round say when it's open", () => {
  const withRounds = data.goals.filter((g) => g.cycle);
  assert.ok(withRounds.length >= 5, "the deadline goals have rounds");
  for (const g of withRounds) assert.ok(g.cycle!.opens >= 1 && g.cycle!.opens <= 12 && g.cycle!.closes >= 1 && g.cycle!.closes <= 12, g.id);
});

test("an application goal is never planned in a term when its round is closed", () => {
  const WHEN = [[1, "2026-10-01"], [2, "2027-02-15"], [2, "2027-04-25"], [undefined, "2027-06-20"]] as const;
  for (const m of majors) for (const track of data.tracks.filter((t) => t.suggestedMajors.includes(m.id))) for (const year of [1, 2, 3, 4] as const) for (const [semester, today] of WHEN) {
    const p = plan({ majorId: m.id, trackId: track.id, year, semester, today, school: `rutgers-${Object.keys(m.offeredAt)[0]}` as PlanInput["school"] });
    for (const t of p.terms) for (const it of t.items) {
      const g = goal(it.goalId.split("@")[0]);
      if (!g.cycle || it.partial === undefined) continue;
      const first = placed(p, g.id)[0] === t.code;
      if (first) assert.ok(termMonths(t.code, p.terms[0].code, today).some((mm) => inRound(mm, g.cycle!.opens, g.cycle!.closes)),
        `${m.id}/${track.id} y${year} ${today}: ${g.id} starts in ${t.code}, round closed`);
    }
  }
});

test("a sophomore in late spring isn't told to apply for this summer's early internships: that round has closed", () => {
  const p = plan({ trackId: "investment-banking", majorId: "finance", year: 2, semester: 2, today: "2027-04-25" });
  assert.deepEqual(placed(p, "ap-internship-early"), []);
  assert.equal(next(p, "ap-internship-early"), false);
});

test("research program applications are never planned in the summer, when no round is open", () => {
  for (const year of [1, 2, 3] as const) {
    const p = plan({ trackId: "research-phd", year, semester: 1, today: "2026-10-01" });
    for (const c of placed(p, "ap-research-apps")) assert.ok(!c.endsWith("U"), `year ${year}: research apps in ${c}`);
  }
});

test("the timing line says when the round opens or closes", () => {
  const p = plan({ year: 2, semester: 1, today: "2026-10-01" });
  const it = item(p, "f-fafsa");
  assert.ok(it, "FAFSA planned");
  assert.ok(it!.cycle, "round status on the item");
  assert.ok(it!.why.some((w) => /^Timing: (Open now|Opens)/.test(w)), it!.why.join(" | "));
});

test("grad-school applicants applying this cycle finish the statement, list, and letters before they apply, before graduation", () => {
  const p = plan({ trackId: "research-phd", year: 4, semester: 1, today: "2026-10-01", experience: ["research"], gradApps: "this-cycle" });
  const apply = placed(p, "ap-grad-apps");
  assert.ok(apply.length && ix(apply[0]) <= ix("4S"), `applications in ${apply}`);
  for (const id of ["a-personal-statement", "a-grad-list", "a-letters"]) for (const c of placed(p, id)) assert.ok(ix(c) <= ix(apply[0]), `${id} in ${c}, after applying in ${apply[0]}`);
});

test("grad-school applicants taking a gap year apply the fall after graduation", () => {
  // Everything applications need is done, so without the answer they'd land in senior fall.
  const ready = { trackId: "research-phd", year: 4 as const, semester: 1 as const, today: "2026-10-01", experience: ["research"],
    completedGoals: ["a-personal-statement", "a-grad-list", "a-letters", "a-test-prep"] };
  assert.equal(placed(plan(ready), "ap-grad-apps")[0], "4F");
  assert.deepEqual(placed(plan({ ...ready, gradApps: "after-gap" }), "ap-grad-apps"), ["G1"]);
});

test("not answering leaves grad-school timing as before", () => {
  const a = plan({ trackId: "research-phd", year: 4, semester: 1, today: "2026-10-01", experience: ["research"] });
  const b = plan({ trackId: "research-phd", year: 4, semester: 1, today: "2026-10-01", experience: ["research"], gradApps: "not-sure" });
  assert.deepEqual(a.terms.map((t) => t.items.map((i) => i.goalId)), b.terms.map((t) => t.items.map((i) => i.goalId)));
});
