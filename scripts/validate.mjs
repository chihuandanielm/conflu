// Checks every resource file against the rules the site depends on.
// Run: node scripts/validate.mjs
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const vocab = JSON.parse(readFileSync(join(root, "data/vocab.json"), "utf8"));
const majors = JSON.parse(readFileSync(join(root, "data/majors.json"), "utf8")).majors;
const majorIds = new Set(majors.map((m) => m.id));
const campusIds = JSON.parse(readFileSync(join(root, "data/campuses.json"), "utf8")).campuses.map((c) => c.id);
const errors = [];
const seen = new Map();
const resById = new Map();
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
    resById.set(r.id, r);
    for (const k of ["name", "type", "scope", "summary", "url", "status"]) if (!r[k]) errors.push(`${at}: missing ${k}`);
    if (!vocab.types.includes(r.type)) errors.push(`${at}: unknown type "${r.type}"`);
    if (!vocab.scopes.includes(r.scope)) errors.push(`${at}: unknown scope "${r.scope}"`);
    if (!vocab.statuses.includes(r.status)) errors.push(`${at}: unknown status "${r.status}"`);
    if (r.status !== "active" && !r.statusNote) errors.push(`${at}: non-active status needs a statusNote`);
    if (!/^https:\/\//.test(r.url)) errors.push(`${at}: url must start with https://`);
    if (r.scope === "rutgers") {
      if (!Array.isArray(r.campuses) || !r.campuses.length) errors.push(`${at}: Rutgers resources need campuses (${campusIds.join(", ")}, or all)`);
      else {
        for (const c of r.campuses) if (!vocab.campuses.includes(c)) errors.push(`${at}: unknown campus "${c}"`);
        if (r.campuses.includes("all") && r.campuses.length > 1) errors.push(`${at}: campuses "all" can't be combined with others`);
      }
    } else if (r.campuses) errors.push(`${at}: only Rutgers resources carry campuses`);
    if (r.applyUrl && !/^https:\/\//.test(r.applyUrl)) errors.push(`${at}: applyUrl must start with https://`);
    if (!vocab.verificationStates.includes(r.verification?.state)) errors.push(`${at}: unknown verification state "${r.verification?.state}"`);
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
const ui = JSON.parse(readFileSync(join(root, "data/ui/intake.json"), "utf8"));
const grouped = ui.experienceGroups.flatMap((g) => g.options);
for (const o of intake.experience) {
  const n = grouped.filter((x) => x === o.id).length;
  if (n !== 1) errors.push(`ui/intake › experience option ${o.id} is in ${n} groups (needs exactly 1)`);
}
for (const id of grouped) if (!intake.experience.some((o) => o.id === id)) errors.push(`ui/intake › unknown experience option ${id}`);
// Every goal says what to do: 3–6 steps, a done-when line, and guides any campus can open (test/goals.test.ts checks the same).
for (const g of goals) {
  if (!Array.isArray(g.steps) || g.steps.length < 3 || g.steps.length > 6) errors.push(`goals › ${g.id}: needs 3–6 steps`);
  if (typeof g.doneWhen !== "string" || g.doneWhen.length < 15) errors.push(`goals › ${g.id}: needs a doneWhen line`);
  if (g.late && ((!g.late.title && !g.late.why) || (g.late.steps && (g.late.steps.length < 3 || g.late.steps.length > 6)))) errors.push(`goals › ${g.id}: late needs a title or a why, and 3–6 steps if it has steps`);
  if (g.forNextYear && g.repeat !== "yearly") errors.push(`goals › ${g.id}: forNextYear only applies to yearly goals`);
  for (const id of g.guides ?? []) {
    const r = resById.get(id);
    if (!r) errors.push(`goals › ${g.id}: unknown guide ${id}`);
    else if (r.scope === "rutgers") errors.push(`goals › ${g.id}: guide ${id} must be usable at every campus`);
  }
}
const expIds = new Set(intake.experience.map((o) => o.id));
for (const g of ui.experienceGroups) if (!g.label || !g.hint) errors.push(`ui/intake › experience group ${g.id} needs a label and a hint`);
for (const o of intake.experience) if (!ui.experienceKeywords?.[o.id]) errors.push(`ui/intake › experience option ${o.id} has no search keywords`);
for (const id of Object.keys(ui.experienceKeywords ?? {})) if (!expIds.has(id)) errors.push(`ui/intake › keywords for unknown experience option ${id}`);
const followers = new Set();
for (const [k, fs] of Object.entries(ui.experienceFollowUps ?? {})) for (const id of [k, ...fs]) {
  if (!expIds.has(id)) errors.push(`ui/intake › follow-up: unknown experience option ${id}`);
  if (fs.includes(id)) { if (followers.has(id)) errors.push(`ui/intake › ${id} follows more than one option`); followers.add(id); }
}
for (const id of ui.experienceBasics ?? []) {
  if (!expIds.has(id)) errors.push(`ui/intake › basics: unknown experience option ${id}`);
  if (followers.has(id)) errors.push(`ui/intake › basics: ${id} is a follow-up`);
}
if ((ui.experienceBasics ?? []).length < 8) errors.push("ui/intake › experienceBasics needs at least 8 options to fill Suggested");
for (const [m, ids] of Object.entries(ui.experienceSuggested ?? {})) {
  if (!majorIds.has(m)) errors.push(`ui/intake › suggested: unknown major ${m}`);
  if (ids.length !== 8) errors.push(`ui/intake › suggested for ${m} needs exactly 8 options`);
  for (const id of ids) if (!expIds.has(id) || followers.has(id)) errors.push(`ui/intake › suggested for ${m}: ${id} is unknown or a follow-up`);
}
// Year and semester in one question; gender tags must be identity tags; recruiting notes tagged by year.
for (const y of intake.yearTerms ?? []) if (![1, 2, 3, 4].includes(y.year) || ![1, 2].includes(y.semester)) errors.push(`intake › yearTerms ${y.id}: bad year or semester`);
if (new Set((intake.yearTerms ?? []).map((y) => y.id)).size !== (intake.yearTerms ?? []).length) errors.push("intake › yearTerms ids must be unique");
for (const o of intake.gender?.options ?? []) for (const t of o.tags) if (!vocab.identity.includes(t)) errors.push(`intake › gender ${o.id}: unknown identity tag ${t}`);
for (const t of tracks) {
  if (typeof t.recruiterFocus !== "string" || !t.recruiterFocus.endsWith(".")) errors.push(`tracks › ${t.id}: recruiterFocus must be one sentence`);
  if (!Array.isArray(t.recruiterSources) || !t.recruiterSources.length || t.recruiterSources.some((u) => !/^https:\/\/\S+$/.test(u))) errors.push(`tracks › ${t.id}: recruiterSources must be https links`);
}
for (const t of tracks) if (t.recruitingNoteUntil && !goalsFile.terms.includes(t.recruitingNoteUntil)) errors.push(`tracks › ${t.id}: recruitingNoteUntil ${t.recruitingNoteUntil} is not a term`);
for (const t of intake.optionalIdentity.tags) if (!ui.identityLabels?.[t]) errors.push(`ui/intake › identity tag ${t} has no label`);
for (const m of ui.coop.majors) if (!majorIds.has(m)) errors.push(`ui/intake › co-op: unknown major ${m}`);
const uiRes = JSON.parse(readFileSync(join(root, "data/ui/resources.json"), "utf8"));
const grouped2 = uiRes.groups.flatMap((g) => g.types);
for (const t of vocab.types) if (grouped2.filter((x) => x === t).length !== 1) errors.push(`ui/resources › type ${t} must be in exactly one group`);
const payAll = Object.values(uiRes.pay).flat();
for (const v of vocab.pay) { if (!payAll.includes(v)) errors.push(`ui/resources › pay ${v} is not in a filter bucket`); if (!uiRes.payLabels[v]) errors.push(`ui/resources › pay ${v} has no label`); }
for (const v of vocab.scopes) if (!uiRes.scopeLabels[v]) errors.push(`ui/resources › scope ${v} has no label`);
for (const v of vocab.seasons) if (!uiRes.seasonLabels[v]) errors.push(`ui/resources › season ${v} has no label`);
for (const t of vocab.identity) if (!ui.identityLabels[t]) errors.push(`ui/intake › identity ${t} has no label`);
for (const m of majors) {
  const at = `majors › ${m.id}`;
  if (!m.offeredAt || !Object.keys(m.offeredAt).length) errors.push(`${at}: needs offeredAt with at least one campus`);
  for (const [c, o] of Object.entries(m.offeredAt ?? {})) {
    if (!campusIds.includes(c)) errors.push(`${at}: unknown campus ${c}`);
    if (!o.school) errors.push(`${at} › ${c}: missing school`);
    if (!/^https:\/\//.test(o.url ?? "")) errors.push(`${at} › ${c}: url must start with https://`);
  }
}
for (const c of campusIds) if (!vocab.campuses.includes(c)) errors.push(`campuses: ${c} missing from vocab.campuses`);
const campusSchools = JSON.parse(readFileSync(join(root, "data/campuses.json"), "utf8")).campuses.map((c) => c.school);
for (const s of campusSchools) if (!ui.school.options.some((o) => o.id === s)) errors.push(`ui/intake › school options are missing campus ${s}`);
const uncovered = [...majorIds].filter((m) => !tracks.some((t) => t.suggestedMajors.includes(m)));
if (uncovered.length) errors.push(`tracks: majors with no suggested track: ${uncovered.join(", ")}`);

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} problem(s) in ${total} resources.`);
  process.exit(1);
}
console.log(`OK: ${total} resources, ${majors.length} majors, ${campusIds.length} campuses, ${goals.length} goals, ${tracks.length} tracks.`);
console.log("Resources reachable per major:", perMajor);
