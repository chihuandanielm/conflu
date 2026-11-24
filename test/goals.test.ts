// Every goal says what to do, not just why (data 2026.11.16-4): 3–6 concrete steps, a "done when" line,
// and how-to guides any student can open. Run: node --experimental-strip-types --test test/
import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDataset } from "../src/engine/load.ts";

const data = loadDataset(join(dirname(fileURLToPath(import.meta.url)), "../data"));
const res = new Map(data.resources.map((r) => [r.id, r as typeof r & { type: string; url: string }]));

test("every goal has 3–6 concrete steps and a done-when line", () => {
  for (const g of data.goals) {
    assert.ok(Array.isArray(g.steps) && g.steps.length >= 3 && g.steps.length <= 6, `${g.id}: needs 3–6 steps`);
    for (const s of g.steps!) assert.ok(s.length >= 15 && s.length <= 220 && /[.!?)]$/.test(s), `${g.id}: step "${s}" should be one full sentence`);
    assert.equal(new Set(g.steps).size, g.steps!.length, `${g.id}: duplicate step`);
    assert.ok(typeof g.doneWhen === "string" && g.doneWhen.length >= 15, `${g.id}: needs a done-when line`);
  }
});

test("timing variants, where present, are complete and drop early-college phrasing", () => {
  for (const g of data.goals) for (const v of g.variants ?? []) {
    assert.ok(v.title ? v.title !== g.title : !!v.why || !!v.steps, `${g.id}/${v.when}: needs a new title, reason, or steps`);
    if (v.steps) assert.ok(v.steps.length >= 3 && v.steps.length <= 6, `${g.id}/${v.when}: steps`);
    assert.doesNotMatch([v.title, ...(v.steps ?? []), v.doneWhen ?? ""].join(" "), /4-year|first-year|first college/i, `${g.id}/${v.when}`);
  }
});

test("guides exist, are open to every campus, and are not also counted as programs", () => {
  for (const g of data.goals) for (const id of g.guides ?? []) {
    const r = res.get(id);
    assert.ok(r, `${g.id}: unknown guide ${id}`);
    assert.notEqual(r!.scope, "rutgers", `${g.id}: guide ${id} must be usable at every campus`);
    assert.ok(!g.resources.includes(id), `${g.id}: ${id} is listed as both a resource and a guide`);
  }
  for (const r of data.resources) if (r.type === "guide") {
    assert.ok(data.goals.some((g) => g.guides?.includes(r.id)), `guide ${r.id} isn't attached to any goal`);
  }
});

test("the LinkedIn goal explains connections, alumni, and job alerts, with a real how-to guide", () => {
  const g = data.goals.find((x) => x.id === "p-linkedin-setup")!;
  assert.ok(g.steps!.some((s) => /job alert/i.test(s)));
  assert.ok(g.guides!.some((id) => res.get(id)!.type === "guide"));
  const net = data.goals.find((x) => x.id === "p-linkedin-network")!;
  assert.ok(net.steps!.some((s) => /alumni/i.test(s)) && net.steps!.some((s) => /note/i.test(s)));
});
