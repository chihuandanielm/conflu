// Checks every resource file against the rules the site depends on.
// Run: node scripts/validate.mjs
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const vocab = JSON.parse(readFileSync(join(root, "data/vocab.json"), "utf8"));
const majors = JSON.parse(readFileSync(join(root, "data/majors.json"), "utf8")).majors;
const majorIds = new Set(majors.map((m) => m.id));
const errors = [];
const seen = new Map();
let total = 0;

const resDir = join(root, "data/resources");
for (const file of readdirSync(resDir).filter((f) => f.endsWith(".json"))) {
  const { resources } = JSON.parse(readFileSync(join(resDir, file), "utf8"));
  for (const r of resources) {
    total++;
    const at = `${file} › ${r.id}`;
    if (!/^[a-z0-9-]+$/.test(r.id)) errors.push(`${at}: id must be kebab-case`);
    if (seen.has(r.id)) errors.push(`${at}: duplicate id (also in ${seen.get(r.id)})`);
    seen.set(r.id, file);
    for (const k of ["name", "type", "scope", "summary", "url", "status"]) if (!r[k]) errors.push(`${at}: missing ${k}`);
    if (!vocab.types.includes(r.type)) errors.push(`${at}: unknown type "${r.type}"`);
    if (!vocab.scopes.includes(r.scope)) errors.push(`${at}: unknown scope "${r.scope}"`);
    if (!vocab.statuses.includes(r.status)) errors.push(`${at}: unknown status "${r.status}"`);
    if (r.status !== "active" && !r.statusNote) errors.push(`${at}: non-active status needs a statusNote`);
    if (!/^https:\/\//.test(r.url)) errors.push(`${at}: url must start with https://`);
    if (!Array.isArray(r.majors) || r.majors.length === 0) errors.push(`${at}: majors must be a non-empty array`);
    for (const m of r.majors || []) if (m !== "all" && !majorIds.has(m)) errors.push(`${at}: unknown major "${m}"`);
    for (const t of r.identity || []) if (!vocab.identity.includes(t)) errors.push(`${at}: unknown identity tag "${t}"`);
    for (const y of r.years || []) if (!vocab.years.includes(y)) errors.push(`${at}: unknown year "${y}"`);
    if (r.pay && !vocab.pay.includes(r.pay)) errors.push(`${at}: unknown pay "${r.pay}"`);
    if (r.season && !vocab.seasons.includes(r.season)) errors.push(`${at}: unknown season "${r.season}"`);
  }
}

const perMajor = Object.fromEntries(majors.map((m) => [m.id, 0]));
for (const file of readdirSync(resDir).filter((f) => f.endsWith(".json"))) {
  for (const r of JSON.parse(readFileSync(join(resDir, file), "utf8")).resources) {
    for (const m of r.majors.includes("all") ? Object.keys(perMajor) : r.majors) perMajor[m]++;
  }
}

// ---- goals, tracks, intake: referential integrity and a cycle check ----
const goalsFile = JSON.parse(readFileSync(join(root, "data/goals.json"), "utf8"));
const goals = goalsFile.goals, goalIds = new Set(goals.map((g) => g.id)), terms = goalsFile.terms;
const allResources = new Set(seen.keys());
for (const g of goals) {
  const at = `goals › ${g.id}`;
  for (const p of g.prereqs) if (!goalIds.has(p)) errors.push(`${at}: unknown prereq ${p}`);
  for (const r of g.resources) if (!allResources.has(r)) errors.push(`${at}: unknown resource ${r}`);
  for (const m of g.majors ?? []) if (!majorIds.has(m)) errors.push(`${at}: unknown major ${m}`);
  for (const x of g.satisfies ?? []) if (!goalIds.has(x)) errors.push(`${at}: satisfies unknown goal ${x}`);
  const w = g.window, i = (c) => terms.indexOf(c);
  if (!(i(w.earliest) <= i(w.ideal[0]) && i(w.ideal[0]) <= i(w.ideal[1]) && i(w.ideal[1]) <= i(w.latest))) errors.push(`${at}: window out of order`);
  if (g.baseWeight < 0 || g.baseWeight > 1) errors.push(`${at}: baseWeight must be 0–1`);
}
const visiting = new Set(), done = new Set(), byGoal = new Map(goals.map((g) => [g.id, g]));
const visit = (id, path) => {
  if (done.has(id)) return; if (visiting.has(id)) { errors.push(`goals: prerequisite cycle ${[...path, id].join(" → ")}`); return; }
  visiting.add(id); for (const p of byGoal.get(id)?.prereqs ?? []) visit(p, [...path, id]); visiting.delete(id); done.add(id);
};
for (const g of goals) visit(g.id, []);
const tracks = JSON.parse(readFileSync(join(root, "data/tracks.json"), "utf8")).tracks;
for (const t of tracks) {
  for (const k of [...Object.keys(t.boosts), ...t.gates, ...t.suppress, ...Object.keys(t.windowOverrides ?? {})]) if (!goalIds.has(k)) errors.push(`tracks › ${t.id}: unknown goal ${k}`);
  for (const m of t.suggestedMajors) if (!majorIds.has(m)) errors.push(`tracks › ${t.id}: unknown major ${m}`);
  for (const g of t.gates) if (t.suppress.includes(g)) errors.push(`tracks › ${t.id}: ${g} is both a gate and suppressed`);
}
const intake = JSON.parse(readFileSync(join(root, "data/intake.json"), "utf8"));
for (const o of [...intake.experience, ...intake.skills, ...intake.credentials]) for (const c of o.completes) if (!goalIds.has(c.goal)) errors.push(`intake › ${o.id}: unknown goal ${c.goal}`);
const uncovered = [...majorIds].filter((m) => !tracks.some((t) => t.suggestedMajors.includes(m)));
if (uncovered.length) errors.push(`tracks: majors with no suggested track: ${uncovered.join(", ")}`);

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} problem(s) in ${total} resources.`);
  process.exit(1);
}
console.log(`OK: ${total} resources, ${majors.length} majors, ${goals.length} goals, ${tracks.length} tracks.`);
console.log("Resources reachable per major:", perMajor);
