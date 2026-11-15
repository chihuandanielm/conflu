// Invariant tests for the planning engine. Run: node --experimental-strip-types --test test/
import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPlan, currentTerm } from "../src/engine/engine.ts";
import { loadDataset } from "../src/engine/load.ts";
import type { Plan, PlanInput } from "../src/engine/types.ts";

const data = loadDataset(join(dirname(fileURLToPath(import.meta.url)), "../data"));
const base: PlanInput = { status: "college-student", majorId: "computer-science", year: 2, trackId: "software-engineering",
  horizon: "graduation", today: "2026-11-13", weeklyHours: 8, summer: "full" };
const placed = (p: Plan) => p.terms.flatMap((t, i) => t.items.map((it) => ({ ...it, termIndex: i, term: t.code })));
const firstTerm = (p: Plan) => { const m = new Map<string, number>(); for (const x of placed(p)) if (!m.has(x.goalId)) m.set(x.goalId, x.termIndex); return m; };
const lastTerm = (p: Plan) => { const m = new Map<string, number>(); for (const x of placed(p)) m.set(x.goalId, x.termIndex); return m; };

test("deterministic: same input gives the same plan", () => {
  assert.deepEqual(buildPlan(base, data), buildPlan(base, data));
});

test("every track x year x horizon runs and respects core invariants", () => {
  for (const track of data.tracks) for (const year of [1, 2, 3, 4] as const) for (const horizon of ["1yr", "graduation"] as const) {
    const major = track.suggestedMajors[0] ?? "economics";
    const plan = buildPlan({ ...base, majorId: major, trackId: track.id, year, horizon }, data);
    const first = firstTerm(plan), last = lastTerm(plan);
    for (const t of plan.terms) assert.ok(t.usedHours <= t.capacityHours + 1, `${track.id} y${year}: over capacity in ${t.code}`);
    for (const e of plan.edges) {
      const p = data.goals.find((g) => g.id === e.from)!;
      const ok = last.get(e.from)! < first.get(e.to)! || (last.get(e.from) === first.get(e.to) && p.hours <= 3);
      assert.ok(ok, `${track.id} y${year}: ${e.to} scheduled before its prerequisite ${e.from}`);
    }
    for (const x of placed(plan)) {
      const g = data.goals.find((g) => g.id === x.goalId.split("@")[0])!;
      if (g.season === "summer") assert.ok(x.term.endsWith("U"), `${g.id} placed outside summer`);
      assert.ok(!track.suppress.includes(g.id), `${track.id}: suppressed goal ${g.id} appeared`);
    }
  }
});

test("finished goals never reappear", () => {
  const plan = buildPlan({ ...base, experience: ["resume", "linkedin-strong", "github-active"] }, data);
  const ids = new Set(placed(plan).map((x) => x.goalId));
  for (const g of ["f-resume-v1", "p-linkedin-setup", "p-github-consistent"]) assert.ok(!ids.has(g), `${g} should be done`);
});

test("identity answers never remove goals from consideration", () => {
  const keys = (p: Plan) => new Set([...placed(p).map((x) => x.goalId), ...p.backlog.map((b) => b.goalId)]);
  const without = keys(buildPlan(base, data));
  const withId = keys(buildPlan({ ...base, identity: ["first-generation", "latino", "low-income"] }, data));
  for (const k of without) assert.ok(withId.has(k), `${k} disappeared when identity was added`);
});

test("international students don't see citizen-only goals or programs", () => {
  const plan = buildPlan({ ...base, citizenship: "international" }, data);
  const items = placed(plan);
  assert.ok(!items.some((x) => x.goalId.startsWith("f-fafsa")), "FAFSA shown to an international student");
  const citizenOnly = new Set(data.resources.filter((r) => r.identity.includes("us-citizen")).map((r) => r.id));
  for (const x of items) for (const r of x.resources) assert.ok(!citizenOnly.has(r.id), `${r.id} requires citizenship`);
  assert.ok(plan.warnings.some((w) => w.includes("CPT or OPT")));
});

test("a co-op replaces the junior-summer internship", () => {
  const plan = buildPlan({ ...base, majorId: "biomedical-engineering", trackId: "medical-devices-biotech", year: 2, openToCoop: true }, data);
  const ids = placed(plan).map((x) => x.goalId);
  if (ids.includes("e-coop")) assert.ok(!ids.includes("e-internship-target"), "both co-op and target internship scheduled");
});

test("plan stability: previous placements are kept when nothing changed", () => {
  const p1 = buildPlan(base, data);
  const prev = Object.fromEntries(placed(p1).map((x) => [x.goalId, x.term]));
  const p2 = buildPlan({ ...base, previousPlan: prev }, data);
  const moved = placed(p2).filter((x) => prev[x.goalId] && prev[x.goalId] !== x.term && !x.partial);
  assert.ok(moved.length <= 2, `${moved.length} goals moved terms without any input change`);
});

// ---- Calendar edge cases (ENGINE 0.2.0). Term dates follow the Rutgers–New Brunswick calendar. ----
test("current term follows the academic calendar, using the rising year in summer", () => {
  const cases: [1 | 2 | 3 | 4, string, string][] = [
    [2, "2026-11-15", "2F"],   // mid-fall
    [2, "2026-12-28", "2S"],   // fall exams are over: winter break plans the coming spring
    [2, "2027-01-05", "2S"],
    [2, "2027-05-14", "1U"],   // spring exams are over: summer before the year they're entering
    [3, "2026-06-15", "2U"],   // a rising junior in June is in the summer after year 2
    [4, "2026-06-15", "3U"],   // a rising senior: there is no "summer after year 4" term
    [1, "2026-07-10", "1F"],   // an incoming first-year starts planning at their first fall
    [2, "2026-08-20", "2F"],
  ];
  for (const [year, today, code] of cases) assert.equal(currentTerm(year, today).code, code, `year ${year} on ${today}`);
  assert.equal(currentTerm(2, "2026-12-28").remaining, 1, "a term that hasn't started has all its time ahead");
});

test("every year plans without errors on any day of the year", () => {
  for (const year of [1, 2, 3, 4] as const) for (let m = 0; m < 12; m++) for (const day of [1, 15, 28]) {
    const today = new Date(Date.UTC(2026, m, day)).toISOString().slice(0, 10);
    const plan = buildPlan({ ...base, year, today }, data);
    assert.ok(plan.terms.length > 0, `year ${year} on ${today}: empty plan`);
    assert.ok(data.terms.includes(plan.terms[0].code), `year ${year} on ${today}: unknown term ${plan.terms[0].code}`);
  }
});

// ---- Resource ranking (ENGINE 0.3.0): only links that loaded or were confirmed count as verified. ----
test("blocked and broken links get no verified-link bonus", () => {
  const plan = buildPlan(base, data);
  const item = plan.terms[0].items[0];
  const template = data.resources.find((r) => r.scope === "national" && r.status === "active" && r.identity.length === 0
    && r.majors.includes("all") && [1, 2, 3, 4].every((y) => r.years.includes(y)))!;
  const variant = (id: string, state: string) => ({ ...template, id, verification: { state } });
  const rankWith = (a: ReturnType<typeof variant>, b: ReturnType<typeof variant>) => {
    const ds = { ...data,
      resources: [...data.resources, a, b],
      goals: data.goals.map((g) => (g.id === item.goalId.split("@")[0] ? { ...g, resources: [a.id, b.id] } : g)) };
    const it = buildPlan(base, ds).terms[0].items.find((x) => x.goalId === item.goalId)!;
    return it.resources.map((r) => r.id);
  };
  // Equal scores fall back to id order, so "aa-" wins unless the other link earns the bonus.
  assert.deepEqual(rankWith(variant("aa-unverified", "unverified"), variant("zz-broken", "broken")), ["aa-unverified", "zz-broken"]);
  assert.deepEqual(rankWith(variant("aa-unverified", "unverified"), variant("zz-blocked", "blocked")), ["aa-unverified", "zz-blocked"]);
  assert.deepEqual(rankWith(variant("aa-unverified", "unverified"), variant("zz-checked", "link-checked")), ["zz-checked", "aa-unverified"]);
  assert.deepEqual(rankWith(variant("aa-unverified", "unverified"), variant("zz-found", "search-confirmed")), ["zz-found", "aa-unverified"]);
});
