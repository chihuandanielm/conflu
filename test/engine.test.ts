// Invariant tests for the planning engine. Run: node --experimental-strip-types --test test/
import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPlan, currentTerm, eligibleFor, identitySet } from "../src/engine/engine.ts";
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
      const ok = last.get(e.from)! < first.get(e.to)! || (last.get(e.from) === first.get(e.to) && p.hours <= 6); // engine 0.8.0: a prerequisite of up to 6 hours can finish earlier in the same term
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

test("engine 0.6.0: leftover goals become an ordered 'up next' queue, never an hours shortfall", () => {
  const tight = buildPlan({ status: "college-student", majorId: "biological-sciences", year: 2, trackId: "medicine", horizon: "graduation",
    today: "2026-11-16", weeklyHours: 2, summer: "full", location: "nj" }, data);
  for (const w of tight.warnings) assert.doesNotMatch(w, /hours a week would|hours of goals|didn't fit/i, `taxing warning: ${w}`);
  const kinds = tight.backlog.map((b) => b.kind);
  assert.ok(kinds.every((k) => ["continues", "next", "optional", "not-now", "past"].includes(k!)), "every leftover has a kind");
  assert.ok(kinds.includes("next"), "with 2 hours a week some goals are next in line");
  const rank = { continues: 0, next: 1, optional: 2, "not-now": 3, past: 4 } as const;
  for (let i = 1; i < kinds.length; i++) assert.ok(rank[kinds[i - 1]!] <= rank[kinds[i]!], "next, then optional, then not now");
  for (const b of tight.backlog) assert.doesNotMatch(b.reason, /didn't fit|more hours than/i, `${b.goalId}: ${b.reason}`);
  // Must-do goals that wait get a concrete, kind note.
  for (const w of tight.warnings.filter((x) => /essential/.test(x))) assert.match(w, /next in line/);
});

// Engine 0.7.0: plans for upper-year students put their own year's goals first.
const senior = (over: Partial<PlanInput> = {}) => buildPlan({ status: "college-student", majorId: "packaging-engineering", year: 4, trackId: "packaging-cpg",
  horizon: "graduation", today: "2026-11-16", weeklyHours: 5, summer: "full", location: "nj", openToCoop: true, ...over } as PlanInput, data);
const allKeys = (p: Plan) => [...p.terms.flatMap((t) => t.items.map((i) => i.goalId)), ...p.backlog.map((b) => b.goalId)];

test("engine 0.7.0: no FAFSA or outside-scholarship round for the year after graduation", () => {
  for (const year of [1, 2, 3, 4] as const) {
    const keys = allKeys(senior({ year, majorId: "computer-science", trackId: "software-engineering" }));
    assert.ok(!keys.includes("f-fafsa@Y4") && !keys.includes("ap-scholarships@Y4"), `year ${year} has a final-year aid round`);
  }
});

test("engine 0.7.0: a senior's plan includes the full-time job search, after the resume it needs", () => {
  const p = senior();
  const termOf = (id: string) => p.terms.findIndex((t) => t.items.some((i) => i.goalId === id));
  assert.ok(termOf("ap-fulltime") >= 0, "job search is in the plan");
  const resume = termOf("f-resume-v1");
  assert.ok(resume === -1 || resume <= termOf("ap-fulltime"), "resume comes first");
});

test("engine 0.7.0: early-college goals done late get wording for where the student is", () => {
  for (const year of [2, 3, 4] as const) {
    const p = senior({ year, today: "2026-09-20" });
    for (const it of p.terms.flatMap((t) => t.items)) {
      assert.doesNotMatch(it.title, /4-year plan|first college resume/, `y${year}: "${it.title}"`);
      for (const w of it.why) assert.doesNotMatch(w, /usually do this by year \d · \w+\.$/, `y${year} ${it.goalId}: stale timing "${w}"`);
    }
  }
  const advisor = senior().terms.flatMap((t) => t.items).find((i) => i.goalId === "f-ces-advisor");
  if (advisor) { assert.match(advisor.title, /remaining semesters/); assert.equal(advisor.late, true); }
});

test("engine 0.7.0: nothing impossible before graduation is 'next in line'", () => {
  const p = senior();
  for (const b of p.backlog.filter((x) => x.kind === "next")) {
    const g = data.goals.find((x) => x.id === b.goalId.split("@")[0])!;
    assert.notEqual(g.season, "summer", `${b.goalId} needs a summer the senior doesn't have`);
    assert.ok(!["e-internship-target", "ap-internship-target", "e-coop"].includes(g.id), `${b.goalId} queued for a senior`);
  }
});

test("engine 0.7.0: first-year-only goals stay out of upper-year plans", () => {
  for (const year of [3, 4] as const) for (const today of ["2026-09-20", "2027-02-10"]) {
    const placed = senior({ year, today }).terms.flatMap((t) => t.items.map((i) => i.goalId));
    assert.ok(!placed.includes("n-career-fair-first"), `y${year} ${today}: first career fair "to look"`);
    if (year === 4) assert.ok(!placed.includes("e-join-orgs") && !placed.includes("e-design-team"), `y4 ${today}: joining orgs in senior year`);
  }
});

test("engine 0.7.0: the up-next queue uses late wording too", () => {
  for (const year of [3, 4] as const) for (const b of senior({ year, weeklyHours: 2 }).backlog) assert.doesNotMatch(b.title, /4-year plan|first college resume/, `y${year}: ${b.title}`);
});

// ---------- engine 0.8.0 ----------
const cs = (over: Partial<PlanInput> = {}) => buildPlan({ ...base, ...over } as PlanInput, data);
const capFor = (h: number) => Math.min(6, Math.max(3, Math.round(2 + h / 4)));

test("engine 0.8.0: the semester answer decides the starting term, off-cycle included", () => {
  assert.equal(cs({ year: 2, semester: 2, today: "2026-10-01" }).terms[0].code, "2S"); // second semester, though it's fall
  assert.equal(cs({ year: 2, semester: 1, today: "2027-03-01" }).terms[0].code, "2F"); // first semester, though it's spring
  assert.equal(cs({ year: 3, semester: 1, today: "2027-06-20" }).terms[0].code, "2U"); // summer before the fall they named
  assert.equal(cs({ year: 2, today: "2027-03-01" }).terms[0].code, "2S");              // no answer: the calendar, as before
});

test("engine 0.8.0: baby steps: a term never holds more goals than the student's time allows", () => {
  for (const weeklyHours of [2, 5, 10, 20]) for (const year of [1, 2, 3, 4] as const) {
    const p = cs({ weeklyHours, year, trackId: "software-engineering" });
    for (const t of p.terms) assert.ok(t.items.filter((i) => !i.gate && !i.essential).length <= capFor(weeklyHours), `${weeklyHours}h y${year} ${t.code}: ${t.items.length} goals`);
  }
});

test("engine 0.8.0: the queue never repeats the plan, hides missed earlier-year goals, and names yearly rounds", () => {
  const p = senior();
  const planned = new Set(p.terms.flatMap((t) => t.items.map((i) => i.goalId)));
  for (const b of p.backlog) {
    if (b.kind === "next") assert.ok(!planned.has(b.goalId), `${b.goalId} is planned and next`);
    if (planned.has(b.goalId)) assert.equal(b.kind, "continues", `${b.goalId}`);
  }
  for (const b of p.backlog.filter((x) => x.kind !== "past")) assert.doesNotMatch(b.title, /junior summer|sophomore|first- and second-year/i, b.title);
  assert.ok(p.backlog.some((b) => b.goalId === "ap-internship-target" && b.kind === "past"));
  const y = cs({ year: 1, weeklyHours: 2 });
  const titles = y.backlog.filter((b) => b.kind === "next").map((b) => b.title);
  assert.equal(new Set(titles).size, titles.length, "no repeated titles in the queue");
});

test("engine 0.8.0: notices are true for this student", () => {
  for (const w of senior({ majorId: "finance", trackId: "investment-banking" }).warnings) assert.doesNotMatch(w, /sophomore|junior summer/i, w);
  assert.ok(cs({ year: 1, majorId: "finance", trackId: "investment-banking" }).warnings.some((w) => /Recruiting timeline/.test(w)));
  for (const year of [1, 2, 3, 4] as const) for (const weeklyHours of [2, 10]) {
    const p = cs({ year, weeklyHours, majorId: "nursing", trackId: "nursing-clinical" });
    for (const w of p.warnings) {
      const m = w.match(/^"(.+?)" is essential/);
      if (m) assert.ok(!p.terms.some((t) => t.items.some((i) => i.title === m[1])), `notice for a planned goal: ${m[1]}`);
    }
  }
});

test("engine 0.8.0: gender answers only add programs for that gender", () => {
  const aamn = data.resources.find((r) => r.id === "aamn")!;
  const asInput = (identity: string[]) => ({ ...base, identity });
  assert.equal(eligibleFor(aamn, identitySet(asInput(["men"])), asInput(["men"])), true);
  assert.equal(eligibleFor(aamn, identitySet(asInput(["women"])), asInput(["women"])), false);
  const ghc = data.resources.find((r) => r.id === "anitab-ghc")!;
  assert.equal(eligibleFor(ghc, identitySet(asInput(["nonbinary"])), asInput(["nonbinary"])), true);
});
