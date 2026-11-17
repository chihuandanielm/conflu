// What recruiters look for, per career path (data 2026.11.17-1, docs/RECRUITER_PRIORITIES.md). Each track's weights
// put the things its recruiters or admissions committees weigh most at the top, and say so, with sources.
// Run: node --experimental-strip-types --test test/
import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDataset } from "../src/engine/load.ts";
import { buildPlan } from "../src/engine/engine.ts";
import type { PlanInput, Track } from "../src/engine/types.ts";

const data = loadDataset(join(dirname(fileURLToPath(import.meta.url)), "../data"));
const track = (id: string) => data.tracks.find((t) => t.id === id)! as Track;
const w = (id: string, goal: string) => track(id).boosts[goal] ?? 0;

test("every career path says, in one plain sentence with sources, what its recruiters look for", () => {
  for (const t of data.tracks as Track[]) {
    assert.ok(typeof t.recruiterFocus === "string" && t.recruiterFocus.length >= 40 && t.recruiterFocus.length <= 320, `${t.id}: recruiterFocus`);
    assert.match(t.recruiterFocus!, /\.$/, `${t.id}: recruiterFocus ends with a full stop`);
    assert.ok(Array.isArray(t.recruiterSources) && t.recruiterSources.length >= 1, `${t.id}: recruiterSources`);
    for (const u of t.recruiterSources!) assert.match(u, /^https:\/\/[^\s]+$/, `${t.id}: ${u}`);
  }
});

test("weights follow the research", () => {
  // Data analytics: SQL and Excel lead entry-level postings; Python is a junior-level bonus.
  assert.deepEqual(track("data-analytics").gates, ["s-sql"]);
  assert.ok(w("data-analytics", "s-sql") > w("data-analytics", "s-python"));
  assert.ok(w("data-analytics", "s-excel-core") > w("data-analytics", "s-python"));
  // Corporate finance: show modelling through projects.
  assert.ok(w("corporate-finance", "s-excel-modeling") >= 0.85);
  // Mechanical design: about half of entry-level engineering hires come through internships and co-ops.
  assert.ok(w("mechanical-design", "ap-internship-target") >= 0.9);
  assert.ok(w("mechanical-design", "e-coop") >= 0.85);
  // Marketing: experience first, portfolio far behind.
  assert.ok(w("marketing-brand", "ap-internship-target") - w("marketing-brand", "p-portfolio-site") >= 0.3);
  // Pharmacist: residency directors rank formal leadership above posters.
  assert.ok(w("pharmacist", "e-org-leadership") >= 0.85);
  // Clinical mental health: research experience is the top admissions factor, letters next.
  const cmh = track("clinical-mental-health").boosts;
  assert.equal(Math.max(...Object.values(cmh)), cmh["e-research-assistant"]);
  assert.ok(cmh["a-letters"] >= 0.9);
  // Federal law enforcement: the FBI Honors Internship requires a 3.0 GPA.
  assert.ok(w("federal-law-enforcement", "f-gpa-floor") >= 0.85);
  // Public health: communication is in 92% of entry-level ads.
  assert.ok(w("public-health-practice", "s-professional-writing") >= 0.8);
  // Social work: related experience weighs heavily.
  assert.ok(w("social-work-practice", "e-volunteer") >= 0.9);
  // Pharma industry: hands-on lab skills are the baseline.
  assert.ok(w("pharma-industry", "s-lab-techniques") >= 0.8);
});

const base: PlanInput = { status: "college-student", majorId: "computer-science", year: 2, semester: 1, trackId: "software-engineering",
  horizon: "graduation", today: "2026-11-17", weeklyHours: 10, school: "rutgers-nb" };
const firstTerm = (plan: ReturnType<typeof buildPlan>, goal: string) => plan.terms.findIndex((t) => t.items.some((i) => i.goalId.split("@")[0] === goal));

test("plans follow it: SQL comes no later than Python for data analytics; mechanical design applies for internships", () => {
  const da = buildPlan({ ...base, majorId: "information-technology", trackId: "data-analytics" }, data);
  const sql = firstTerm(da, "s-sql"), py = firstTerm(da, "s-python");
  assert.ok(sql >= 0, "SQL is planned");
  assert.ok(py < 0 || sql <= py, `SQL (term ${sql}) no later than Python (term ${py})`);
  const me = buildPlan({ ...base, majorId: "mechanical-engineering", trackId: "mechanical-design", openToCoop: true }, data);
  assert.ok(firstTerm(me, "ap-internship-target") >= 0, "mechanical design plans internship applications");
});
