// Campus expansion (engine 0.4.0, data 2026.11.16-1): Rutgers–Newark, Rutgers–Camden, and Packaging Engineering.
// Run: node --experimental-strip-types --test test/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { availableAt, buildPlan, campusOf, ENGINE_VERSION } from "../src/engine/engine.ts";
import { loadDataset } from "../src/engine/load.ts";
import type { Plan, PlanInput, ResourceLite } from "../src/engine/types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const data = loadDataset(join(here, "../data"));
const majors = JSON.parse(readFileSync(join(here, "../data/majors.json"), "utf8")).majors as { id: string; offeredAt: Record<string, unknown> }[];
const res = new Map(data.resources.map((r) => [r.id, r as ResourceLite & { campuses?: string[] }]));
const SCHOOL = { nb: "rutgers-nb", newark: "rutgers-newark", camden: "rutgers-camden" } as const;

const base: PlanInput = { status: "college-student", majorId: "computer-science", year: 2, trackId: "software-engineering",
  horizon: "graduation", today: "2026-11-13", weeklyHours: 8, summer: "full", location: "nj" };
const shown = (p: Plan) => p.terms.flatMap((t) => t.items.flatMap((i) => i.resources.map((r) => res.get(r.id)!)));
const usableAt = (r: { scope: string; campuses?: string[] }, campus: string | null) =>
  r.scope !== "rutgers" || (campus !== null && !!r.campuses && (r.campuses.includes("all") || r.campuses.includes(campus)));

test("campusOf maps PlanInput.school, defaulting to New Brunswick as before", () => {
  assert.equal(campusOf(undefined), "nb");
  assert.equal(campusOf("rutgers-nb"), "nb");
  assert.equal(campusOf("rutgers-newark"), "newark");
  assert.equal(campusOf("rutgers-camden"), "camden");
  assert.equal(campusOf("other"), null);
});

test("availableAt: Rutgers resources only at their campuses; NJ and national everywhere", () => {
  const ces = res.get("rutgers-ces")!, nwk = res.get("rutgers-newark-career")!, cam = res.get("rutgers-camden-career")!;
  const anyCampus = res.get("rutgers-study-abroad")!, national = res.get("fafsa")!;
  assert.equal(availableAt(ces, { ...base, school: "rutgers-nb" }), true);
  assert.equal(availableAt(ces, { ...base, school: "rutgers-newark" }), false);
  assert.equal(availableAt(nwk, { ...base, school: "rutgers-newark" }), true);
  assert.equal(availableAt(cam, { ...base, school: "rutgers-newark" }), false);
  assert.equal(availableAt(anyCampus, { ...base, school: "rutgers-camden" }), true);
  assert.equal(availableAt(anyCampus, { ...base, school: "other" }), false);
  assert.equal(availableAt(national, { ...base, school: "other" }), true);
});

test("New Brunswick plans match the stored baseline (re-record with scripts/nb-baseline.ts when planning changes on purpose)", () => {
  const { engineVersion, plans } = JSON.parse(readFileSync(join(here, "fixtures/nb-plans-baseline.json"), "utf8")) as
    { engineVersion: string; plans: { input: PlanInput; terms: { code: string; items: string[] }[]; backlog: string[] }[] };
  assert.equal(engineVersion, ENGINE_VERSION, "the baseline was recorded with an older engine: re-run scripts/nb-baseline.ts and explain the change");
  for (const b of plans) {
    const p = buildPlan(b.input, data);
    const label = `${b.input.trackId} y${b.input.year} ${b.input.citizenship ?? ""} ${(b.input.identity ?? []).join("+")}`;
    assert.deepEqual(p.terms.map((t) => ({ code: t.code, items: t.items.map((i) => `${i.goalId}|${i.hours}|${i.partial}|${i.resources.map((r) => r.id).join(",")}`) })),
      b.terms, `${label}: placements changed`);
    assert.deepEqual(p.backlog.map((x) => x.goalId), b.backlog, `${label}: backlog changed`);
    for (const r of shown(p)) assert.ok(usableAt(r, "nb"), `${label}: shows ${r.id}, which NB students can't use`);
  }
});

test("Newark and Camden students never see another campus's Rutgers offices", () => {
  for (const campus of ["newark", "camden"] as const) {
    for (const m of majors.filter((x) => campus in x.offeredAt)) {
      const track = data.tracks.find((t) => t.suggestedMajors.includes(m.id)) ?? data.tracks.find((t) => t.id === "exploring")!;
      for (const year of [1, 2, 3, 4] as const) {
        const p = buildPlan({ ...base, majorId: m.id, trackId: track.id, year, school: SCHOOL[campus] }, data);
        for (const r of shown(p)) assert.ok(usableAt(r, campus), `${campus} ${m.id} y${year}: shows ${r.id} (${r.campuses?.join(",")})`);
      }
    }
  }
});

test("each campus gets its own career office and Handshake on the same goals", () => {
  const card = (school: PlanInput["school"], goalId: string) => {
    const p = buildPlan({ ...base, year: 1, today: "2026-09-15", school }, data);
    return p.terms.flatMap((t) => t.items).find((i) => i.goalId === goalId)?.resources.map((r) => r.id) ?? [];
  };
  assert.ok(card("rutgers-nb", "f-ces-advisor").includes("rutgers-ces"));
  assert.ok(card("rutgers-newark", "f-ces-advisor").includes("rutgers-newark-career"));
  assert.ok(card("rutgers-camden", "f-ces-advisor").includes("rutgers-camden-career"));
  assert.ok(card("rutgers-camden", "f-handshake-profile").includes("rutgers-camden-handshake"));
  assert.ok(!card("rutgers-camden", "f-ces-advisor").includes("rutgers-ces"));
});

test("students at another school see no Rutgers-only resources", () => {
  const p = buildPlan({ ...base, school: "other" }, data);
  assert.equal(shown(p).filter((r) => r.scope === "rutgers").length, 0);
  assert.ok(shown(p).length > 0, "national and NJ resources still show");
});

test("every campus, offered major, track, and year satisfies the core invariants", () => {
  for (const [campus, school] of Object.entries(SCHOOL)) for (const m of majors.filter((x) => campus in x.offeredAt)) {
    for (const track of data.tracks.filter((t) => t.suggestedMajors.includes(m.id) || t.id === "exploring")) for (const year of [1, 2, 3, 4] as const) {
      const p = buildPlan({ ...base, majorId: m.id, trackId: track.id, year, school }, data);
      for (const t of p.terms) assert.ok(t.usedHours <= t.capacityHours + 1, `${campus} ${m.id} ${track.id} y${year}: over capacity in ${t.code}`);
      const first = new Map<string, number>(), last = new Map<string, number>();
      p.terms.forEach((t, i) => t.items.forEach((it) => { if (!first.has(it.goalId)) first.set(it.goalId, i); last.set(it.goalId, i); }));
      for (const e of p.edges) {
        const g = data.goals.find((x) => x.id === e.from)!;
        assert.ok(last.get(e.from)! < first.get(e.to)! || (last.get(e.from) === first.get(e.to) && g.hours <= 6), `${campus} ${m.id} ${track.id}: ${e.to} before ${e.from}`);
      }
    }
  }
});

test("identity answers still never remove goals for Newark and Camden students", () => {
  for (const school of ["rutgers-newark", "rutgers-camden"] as const) {
    const keys = (p: Plan) => new Set([...p.terms.flatMap((t) => t.items.map((i) => i.goalId)), ...p.backlog.map((b) => b.goalId)]);
    const without = keys(buildPlan({ ...base, school }, data));
    const withId = keys(buildPlan({ ...base, school, identity: ["first-generation", "low-income"] }, data));
    for (const k of without) assert.ok(withId.has(k), `${school}: ${k} disappeared with identity`);
  }
});

test("a packaging engineering student gets packaging goals, the co-op, and packaging resources", () => {
  const p = buildPlan({ ...base, majorId: "packaging-engineering", trackId: "packaging-cpg", school: "rutgers-nb", openToCoop: true }, data);
  const items = p.terms.flatMap((t) => t.items);
  const all = new Set([...items.map((i) => i.goalId), ...p.backlog.map((b) => b.goalId)]);
  assert.ok(all.has("e-pack-competition"), "packaging competition goal considered");
  assert.ok(all.has("e-coop"), "co-op considered");
  assert.ok(items.some((i) => i.resources.some((r) => r.id === "iopp-student-ameristar" || r.id === "rutgers-packaging-coop" || r.id === "iopp")), "packaging resources shown");
  assert.ok(p.warnings.some((w) => w.includes("Packaging co-ops")), "packaging recruiting note");
});

test("the international-student note names the right office for each campus (engine 0.5.0)", () => {
  const note = (school: PlanInput["school"]) => buildPlan({ ...base, school, citizenship: "international" }, data).warnings.find((w) => w.includes("CPT or OPT"))!;
  assert.match(note("rutgers-nb"), /Rutgers Global/);
  assert.match(note("rutgers-newark"), /Rutgers–Newark/);
  assert.doesNotMatch(note("rutgers-newark"), /Rutgers Global/);
  assert.match(note("rutgers-camden"), /Rutgers–Camden/);
  assert.match(note("other"), /international student office/);
});

test("part-time students are told the plan assumes a full-time pace; full-time students are not (engine 0.5.0)", () => {
  const partTime = buildPlan({ ...base, enrollment: "part-time" }, data);
  assert.ok(partTime.warnings.some((w) => /part-time/i.test(w) && /advisor/.test(w)));
  assert.ok(!buildPlan({ ...base, enrollment: "full-time" }, data).warnings.some((w) => /part-time/i.test(w)));
  assert.ok(!buildPlan(base, data).warnings.some((w) => /part-time/i.test(w)), "missing enrollment means full-time, as before");
  // Enrollment only adds a note: the same goals and terms either way.
  const key = (p: Plan) => p.terms.map((t) => t.items.map((i) => i.goalId).join(",")).join("|");
  assert.equal(key(partTime), key(buildPlan(base, data)));
});
