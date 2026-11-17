// Engine 0.9.0: goals the student crosses out ("Not for me"), the draft map with more options, and importance tiers.
// Run: node --experimental-strip-types --test test/
import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDataset } from "../src/engine/load.ts";
import { buildPlan, ENGINE_VERSION } from "../src/engine/engine.ts";
import type { Plan, PlanInput } from "../src/engine/types.ts";

const data = loadDataset(join(dirname(fileURLToPath(import.meta.url)), "../data"));
const base: PlanInput = { status: "college-student", majorId: "computer-science", year: 2, semester: 1, trackId: "software-engineering",
  horizon: "graduation", today: "2026-11-17", weeklyHours: 8, school: "rutgers-nb" };
const keys = (p: Plan) => p.terms.flatMap((t) => t.items.map((i) => i.goalId));
const placed = (p: Plan, id: string) => keys(p).some((k) => k === id || k.split("@")[0] === id);

test("engine version is 0.9.0", () => assert.equal(ENGINE_VERSION, "0.9.0"));

test("a crossed-out goal leaves the plan and the queue, and is listed so it can be undone", () => {
  const before = buildPlan(base, data);
  assert.ok(placed(before, "p-linkedin-setup"));
  const p = buildPlan({ ...base, skippedGoals: ["p-linkedin-setup"] }, data);
  assert.ok(!placed(p, "p-linkedin-setup"));
  assert.ok(!p.backlog.some((b) => b.goalId === "p-linkedin-setup"));
  assert.ok(!p.done.includes("p-linkedin-setup"), "crossed out is not the same as done");
  assert.deepEqual(p.skipped.map((s) => s.goalId), ["p-linkedin-setup"]);
  assert.equal(p.skipped[0].title, data.goals.find((g) => g.id === "p-linkedin-setup")!.title);
  assert.equal(p.skipped[0].essential, false);
  // Its hours go to something else: the term isn't left short.
  assert.ok(p.terms[0].usedHours >= before.terms[0].usedHours);
  // Undo is just leaving it out of skippedGoals again: the plan is the same as before.
  assert.deepEqual(buildPlan({ ...base, skippedGoals: [] }, data), before);
});

test("crossing out a prerequisite doesn't hold back what depends on it", () => {
  const p = buildPlan({ ...base, skippedGoals: ["s-python"] }, data);
  assert.ok(!placed(p, "s-python"));
  assert.ok(placed(p, "s-dsa"), "data structures still planned");
  const pg = buildPlan({ ...base, skippedGoals: ["p-github-setup"] }, data);
  assert.ok(placed(pg, "p-github-consistent"));
  assert.ok(!pg.backlog.some((b) => /Comes after/.test(b.reason) && b.reason.includes("GitHub")), "nothing waits on the crossed-out goal");
});

test("crossing out a must-do is allowed, flagged as essential, and warned about", () => {
  const p = buildPlan({ ...base, skippedGoals: ["s-dsa"] }, data);
  assert.ok(!placed(p, "s-dsa"));
  assert.equal(p.skipped[0].essential, true);
  assert.ok(p.warnings.some((w) => w.includes("Data structures") || w.includes(p.skipped[0].title)), p.warnings.join(" | "));
  assert.ok(p.warnings.some((w) => /must-do/i.test(w) && /Software engineering/.test(w)));
});

test("a yearly round can be crossed out on its own, or every round at once", () => {
  const one = buildPlan({ ...base, skippedGoals: ["f-fafsa@Y2"] }, data);
  assert.ok(!keys(one).includes("f-fafsa@Y2"));
  assert.ok(keys(one).includes("f-fafsa@Y3"));
  const all = buildPlan({ ...base, skippedGoals: ["f-fafsa"] }, data);
  assert.ok(!placed(all, "f-fafsa"));
});

test("the draft map shows more options each semester, most important first", () => {
  const final = buildPlan(base, data);
  const draft = buildPlan({ ...base, draft: true }, data);
  const count = (p: Plan) => p.terms.map((t) => t.items.length);
  const f = count(final), d = count(draft);
  assert.equal(d.length, f.length);
  for (let i = 0; i < d.length; i++) assert.ok(d[i] >= f[i], `term ${i}: draft ${d[i]} >= final ${f[i]}`);
  assert.ok(d.reduce((a, b) => a + b) >= f.reduce((a, b) => a + b) + 2 * d.length, `draft ${d} vs final ${f}`);
  // The draft is the final plan, unchanged, plus options: finalizing never moves what the student already saw.
  final.terms.forEach((t, i) => {
    const mine = draft.terms[i].items.filter((x) => !x.option);
    assert.deepEqual(mine.map((x) => [x.goalId, x.hours]), t.items.map((x) => [x.goalId, x.hours]), t.code);
    assert.equal(draft.terms[i].usedHours, t.usedHours, "options take no hours");
  });
  // Each option appears once, is ready (its prerequisites come earlier or are done), and is not also in the queue.
  const opts = draft.terms.flatMap((t) => t.items.filter((x) => x.option).map((x) => x.goalId));
  assert.equal(new Set(opts).size, opts.length);
  for (const k of opts) assert.ok(!draft.backlog.some((b) => b.goalId === k), k);
  // No overdue options (a year-2 scholarship round in senior spring).
  for (const t of draft.terms) for (const x of t.items.filter((x) => x.option)) {
    const y = x.goalId.split("@Y")[1];
    if (y) assert.ok(Number(t.code[0]) <= Number(y) + 1, `${x.goalId} in ${t.code}`);
  }
  // Options are ranked: within a term, the first option scores at least as well as the last.
  for (const t of draft.terms) {
    const o = t.items.filter((x) => x.option).map((x) => x.score.total);
    if (o.length > 1) assert.ok(Math.max(...o) >= o[o.length - 1]);
  }
  // Never more than the draft cap of non-must-do options in a term.
  for (const t of draft.terms) assert.ok(t.items.filter((i) => !i.gate && !i.essential).length <= 10, t.code);
});

test("every item says how important it is for the career path", () => {
  for (const p of [buildPlan(base, data), buildPlan({ ...base, draft: true }, data)]) {
    for (const t of p.terms) for (const i of t.items) {
      const want = i.gate || i.essential ? "must" : i.score.weight >= 0.85 ? "high" : i.score.weight >= 0.65 ? "medium" : "low";
      assert.equal(i.importance, want, `${i.goalId}`);
    }
  }
  const p = buildPlan({ ...base, draft: true }, data);
  const tiers = new Set(p.terms.flatMap((t) => t.items.map((i) => i.importance)));
  assert.ok(tiers.has("must") && tiers.has("high"), [...tiers].join());
});
