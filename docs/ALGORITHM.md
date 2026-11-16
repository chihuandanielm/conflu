# Career Pathway Mapper: planning engine design

Status: v0.4 design (engine 0.4.0: three Rutgers campuses, each student sees only the Rutgers offices of their own campus; 0.3.0: calendar-based current term, only loaded or confirmed links earn the ranking bonus), with a working reference implementation in `src/engine/` and passing invariant tests in `test/`.
Audience: Claude Code and any engineer building the site.

---

## 1. What the engine does

A student answers a short intake (where they are, what they've done, where they want to go, how fast, how much time they have). The engine turns those answers into a **semester-by-semester roadmap** of concrete goals, each with a reason and linked resources. The site draws the roadmap as a flow map.

```
 intake answers ──► PlanInput ─┐
                               ├─► buildPlan() ──► Plan ──► flow map UI
 data/*.json  ───► Dataset  ───┘     (pure function, runs in the browser)
```

### Design principles

1. **Deterministic.** Same input and same data always produce the same plan. No randomness, no AI, no network calls.
2. **Explainable.** Every goal on the map carries a score breakdown and plain-language reasons built from that breakdown.
3. **Data-driven.** Nearly all judgment lives in JSON (goal weights, windows, track boosts). Code holds the math. Changing advice means editing data, not code.
4. **Honest about limits.** When goals don't fit, the plan says so, by how much, and what would fix it. It never silently drops a must-do.
5. **Identity only adds.** Optional identity answers can surface programs and nudge scores up. They never remove a goal or lower a score. Legal eligibility (citizenship) is the only thing allowed to hide something, and only when the student has said their status.
6. **Private by default.** Runs entirely client-side; answers stay in the browser.

---

## 2. Data model

All files live in `data/`. `scripts/validate.mjs` enforces every cross-reference below.

| File | What it holds | Count |
|---|---|---|
| `campuses.json` | Rutgers campuses (New Brunswick, Newark, Camden) and the `PlanInput.school` value for each | 3 |
| `majors.json` | Majors with CIP codes; `offeredAt` maps each campus that offers it to the school and program URL | 21 |
| `goals.json` | Milestones the engine schedules | 111 |
| `tracks.json` | Career targets ("end goals") that reweight goals | 28 |
| `intake.json` | Intake questions and how each answer maps to goals | 44 experience, 18 skills, 15 credentials |
| `resources/*.json` | Programs, orgs, tools, and offices attached to goals. Every `scope: "rutgers"` resource lists the `campuses` whose students can use it (`nb`, `newark`, `camden`, or `all`). `guides.json` holds 30 how-to guides | 369 |
| `vocab.json` | Allowed values for resource fields | — |
| `version.json` | Data version stamped into every plan | — |

**Campuses.** Goals, tracks, and NJ and national resources are shared by all three campuses. A goal that points at a campus office lists every campus's version (for example, `f-ces-advisor` lists `rutgers-ces`, `rutgers-newark-career`, and `rutgers-camden-career`), and the campus filter in Step 4 and §5 picks the right one. Campus-specific wording stays out of goal titles. See `docs/CAMPUS_EXPANSION.md` for the research and classification rules.

### 2.1 Terms (the time axis)

```
index:  0   1   2   3   4   5   6   7   8   9   10  11  12
code:   1F  1S  1U  2F  2S  2U  3F  3S  3U  4F  4S  G1  G2
        F = fall, S = spring, U = summer after that year, G = after graduation
```

Every goal window and every placement uses these codes. Year of a term = `floor(index / 3) + 1`.

### 2.2 Goal

| Field | Meaning |
|---|---|
| `category` | Lane on the flow map: foundation, presence, skills, experience, network, credentials, academics, applications |
| `competencies` | Contribution to NACE's 8 competencies (csd, comm, crit, equity, lead, prof, team, tech), each 0–1 |
| `baseWeight` | Importance (0–1) when no track overrides it |
| `hours`, `spanTerms` | Total effort and how many terms it naturally spans |
| `window` | `earliest`, `ideal [start, end]`, `latest`: when the goal makes sense |
| `prereqs` | Goals that must finish first |
| `season` | `"summer"` for summer-only goals |
| `deadline` | Human text; also marks the goal as deadline-driven |
| `repeat` | `"yearly"` creates one instance per year (FAFSA, resume refresh, scholarships) |
| `majors` | Restrict to these majors (null = all) |
| `splittable` | Can be spread across terms |
| `lateOk` | Still worth doing after `latest` |
| `integrated` | Done inside coursework; uses no free-time hours (BSW field placement) |
| `satisfies` | Finishing this also finishes these (a co-op satisfies the target internship) |
| `requires` | Legal eligibility: `us-citizen-or-pr`, `not-international` |
| `resources` | Resource ids shown on the goal's card |
| `why` | One-sentence reason always shown last |
| `steps` | 3–6 concrete actions, in order: what the student actually does (display only) |
| `doneWhen` | One sentence saying how the student knows it's finished (display only) |
| `guides` | How-to pages for the steps: `type: "guide"` resources in `resources/guides.json`, or other non-Rutgers resources, so every campus can open them. Never ranked or filtered by the engine |

`steps`, `doneWhen`, and `guides` don't change planning. The site shows them on each goal (checkable steps in the drawer, the next unchecked step in "Your next moves", and the steps in the PDF), so a plan says what to do, not only why.

### 2.3 Track (career target)

| Field | Meaning |
|---|---|
| `competencyTarget` | Where a ready graduate on this path should be on each competency (0–1) |
| `boosts` | Per-goal weights that override `baseWeight` (and override a goal's major restriction) |
| `gates` | Must-do goals: weight floor 0.95, never dropped, warned about if they can't fit |
| `suppress` | Goals hidden for this path (pre-med hides the junior-summer corporate internship) |
| `windowOverrides` | Retimes goals for this path (pre-med applies the summer after junior year) |
| `recruitingNote` | Timeline warning shown with the plan |

### 2.4 Intake mapping

Each experience, skill, or credential answer lists `completes: [{goal, strength}]`. Strength 1 = done; less than 1 = partly done (for example, "I have a LinkedIn" = 0.6 of "Build a complete LinkedIn profile").

---

## 3. Inputs (`PlanInput`)

| Input | Source | Default |
|---|---|---|
| `school` | "Which Rutgers campus are you at?": `rutgers-nb`, `rutgers-newark`, `rutgers-camden`, or `other`. The major list is filtered to majors offered at that campus | `rutgers-nb` (missing means New Brunswick, as before 0.4.0) |
| `majorId`, `year` | Dropdowns | required |
| `trackId` | "Where do you want to end up?" (track list filtered by `suggestedMajors`, with "show all" and "Still exploring") | required |
| `horizon` | 6mo, 1yr, 2yr, graduation, after-graduation | graduation |
| `today` | Browser clock | — |
| `weeklyHours` | Optional dropdown (2/5/10/15/20) | 5 |
| `summer` | full / part / none | full |
| `openToCoop` | Engineering, pharmacy, supply chain only | true |
| `location`, `citizenship` | Optional | unknown |
| `identity` | Optional multi-select | [] |
| `experience`, `skills`, `credentials` | Checklists | [] |
| `completedGoals` | Goals checked off on the map | [] |
| `previousPlan` | Last plan's goal → term map | {} |

---

## 4. The pipeline

`buildPlan(input, data)` runs these steps in order. Constants in **bold** are in §6.

### Step 1 — Time frame and capacity

- **Current term** from `year` + `today`, using the Rutgers–New Brunswick calendar (`CALENDAR` in `engine.ts`; 2026–27: fall Sep 1–Dec 22 including exams, spring Jan 19–May 12 including exams):
  - Sep 1–Dec 22 → `{year}F`. Dec 23–May 12 → `{year}S` (winter break plans the coming spring with all of it ahead).
  - May 13–Aug 14 → summer. Over the summer, `year` means the year the student is **entering** in the fall (a rising junior answers 3), so summer maps to `{year−1}U`. There is no "summer after year 4" term, so a rising senior lands in `3U`.
  - An incoming first-year in summer, and anyone from Aug 15 to Aug 31, starts at `{year}F` with the whole term ahead.
  - The share of the current term still ahead (`remaining`, clamped to 0.2–1) scales its capacity.
  - The intake shows a summer-only hint so students answer with their rising year.
- **End term** from horizon: a term count from now (6mo = 2, 1yr = 3, 2yr = 6), or `4S` for graduation, or `4S + 2` for after-graduation.
- **Flexible hours per term** = `weeklyHours × weeks(term) × realism × remaining`. Weeks: fall/spring 14, summer 10. `realism` is **0.8**. If the student is unavailable in summer, summer flex = 0.
- **Block slot per term** (for full-time commitments):
  - Summer: 1 (full), 0.5 (part), 0 (none). If the current term is a summer that's already mostly gone, the slot is 0.
  - Fall/spring: 1 if `openToCoop`, used only by co-ops.
  - After graduation: 1.

### Step 2 — What's already done

Fold intake answers and checked-off goals into `strength[goal] ∈ [0, 1]`, keeping the max per goal. Any goal at strength 1 also completes everything in its `satisfies` list.

### Step 3 — Competency gap

For each competency `c`:

```
current[c] = 1 − Π over finished/started goals g of (1 − gain × comp_g[c] × strength_g)     gain = 0.35
target[c]  = track.competencyTarget[c] × progress,   progress = min(1, (endIndex + 1) / 11)
gap[c]     = max(0, target[c] − current[c])
```

The product form gives diminishing returns: the fifth tech project helps less than the first. `progress` scales the target to the horizon, so a 1-year plan for a sophomore aims at a sophomore-to-junior level, not graduation level.

### Step 4 — Candidate selection

For every goal:

1. `weight = track.boosts[g] ?? g.baseWeight`; gates get `max(0.95, weight)`.
2. Skip if suppressed by the track, if restricted to other majors (unless the track boosts or gates it), if `requires` fails for a stated citizenship, or if every attached resource the student can use is citizen-only and the student is international or undocumented.

   "Can use" is `availableAt(resource, input)`: every NJ and national resource; a Rutgers resource only when its `campuses` include the student's campus or `all`. `campusOf(school)` maps `rutgers-newark` to `newark`, `rutgers-camden` to `camden`, `other` to none, and anything else (including missing) to `nb`. A student at another school can use no Rutgers resource.
3. Yearly goals become one instance per remaining year (`f-fafsa@Y2`, `f-fafsa@Y3`, …), each with a one-term ideal window.
4. Skip instances already at strength 1.
5. Send to the **backlog**, with the reason, if: the window opens after the horizon; the window has closed and the goal isn't `lateOk`; or `weight < threshold` (and not a gate).

**Horizon squeeze.** `runway = termsInHorizon / termsUntilGraduation`. `threshold = 0.45 + 0.35 × (1 − runway)`. A shorter horizon raises the bar, so a 1-year plan contains fewer, higher-impact goals instead of a compressed 4-year list.

### Step 5 — Prerequisite closure

Any selected goal pulls in its unfinished prerequisites (strength under 0.5) even if they were below threshold. Each prerequisite inherits `max(ownWeight, 0.9 × dependentWeight)`. This repeats until stable. The prerequisite records which goal pulled it in, which feeds the "Needed before…" explanation.

### Step 6 — Static score

```
coverage(g)    = Σ_c comp_g[c] × gap[c]  /  (Σ_c comp_g[c] × max_c gap[c])      ∈ [0, 1]
eligibility(g) = 1.15 if any attached resource the student can use targets one of their identity tags, else 1
focus(g)       = 1.3 for applications/network goals when runway ≤ 0.5, else 1
static(g)      = weight × (1 + 0.5 × coverage) × eligibility × focus
```

Coverage rewards goals that hit the student's **biggest** gaps, not just any gap.

### Step 7 — Term-by-term scheduling

For each term from now to the horizon:

**Urgency `U(g, t)`** from the goal's window `(e, a, b, l)`:

| Where `t` falls | U |
|---|---|
| before `e` | 0 (not allowed) |
| `e ≤ t < a` (early) | `0.55 + 0.45 × (t − e + 1)/(a − e + 1)` |
| `a ≤ t ≤ b` (ideal) | 1 |
| `b < t ≤ l` (late) | `1 + 0.6 × (t − b)/(l − b)` (up to 1.6) |
| after `l` | 0 if not `lateOk`; 1.2 if it blocks another planned goal; else 0.5 |
| summer-only goal in a non-summer term | 0 |
| after-graduation term, goal's `latest` ≤ 4S | 0 (student-only goals never spill past graduation) |

**Term score** = `static × U × stability × pin`
- `stability` = 1.1 if the goal was in this same term in `previousPlan` (prevents churn when a student re-plans).
- `pin` = 1.25 for gates, and for deadline goals while U ≥ 1.

**Readiness.** A goal is ready when every prerequisite is done, at strength ≥ 0.5, or completed in an earlier term. A quick prerequisite (≤ 3 hours) finished earlier in the **same** term also counts.

**Placement order inside a term**
1. **Phase 1** places only tier 0 and tier 1 goals:
   - tier 0: last-chance goals (not `lateOk` and this is their `latest` term)
   - tier 1: quick wins (flex, ≤ 3 hours, U ≥ 1)

   Phase 1 sweeps repeatedly, so quick chains resolve in one term (elevator pitch → mock interview).
2. **Phase 2** places everything else by tier, then term score, then id (deterministic tie-break), sweeping again so newly unlocked goals get a chance.
3. **Top-up pass:** leftover hours go to goals already in progress this term, highest score first.

**How each goal type is placed**
- **Integrated:** costs no hours. Placed in the first eligible term; completes after `spanTerms` terms.
- **Block** (per-term hours ≥ 300): needs a free block slot in each of its `spanTerms` consecutive terms. It needs a full slot if per-term hours ≥ 350, otherwise half. It waits for its ideal window unless that falls after the horizon. A co-op in a fall/spring term cuts that term's free hours to 30%. Placing a block marks everything in its `satisfies` list as complete.
- **Flex:** takes `min(need, share cap, pace)` where:
  - `need` = per-term hours (splittable goals) or all remaining hours.
  - `share cap` = 50% of the term's free hours, so one big goal can't crowd out everything else. It applies to splittable goals, or goals larger than two terms of capacity (auto-split).
  - `pace` = remaining hours ÷ terms left in the ideal window, which spreads 100 coding problems across four terms instead of front-loading them.

  If it doesn't fit, a splittable goal takes what's left (at least 4 hours); otherwise it waits for a later term. Remainders under 1 hour are rounded to done.

### Step 8 — Backlog

Selected goals that never completed go to the backlog. Each gets one specific reason:
- started but short N hours
- waiting on a named prerequisite
- needs a full-time summer
- starts after the time frame
- didn't fit weekly hours

A gate that ends up here also produces a warning.

### Step 9 — Warnings

- **Hours shortfall:** "About N hours didn't fit. Around H hours a week would cover them." H = current weekly hours + unfit hours ÷ (flex weeks × realism).
- **Limited summers** on a track that runs through a junior-summer internship.
- **International students:** CPT/OPT authorization note.
- **Track recruiting note.**
- **Gate** that can't fit or whose window has closed.

### Step 10 — Output

```ts
Plan {
  meta: { engineVersion, dataVersion, generatedFor, track }
  competencies: { current, target, gap }          // drives the radar chart
  terms: [{ code, label, capacityHours, usedHours, summerBlock, items: PlanItem[] }]
  ongoing: [{ goalId, title, why }]               // standing habits (keep GPA ≥ 3.0)
  edges: [{ from, to }]                            // prerequisite arrows between placed goals
  backlog: [{ goalId, title, reason }]            // "If you have more time"
  done: string[]
  warnings: string[]
}
PlanItem {
  goalId, title, lane, hours, partial, gate,
  score: { weight, coverage, urgency, eligibility, stability, total },
  why: string[],                                   // ordered plain-language reasons
  resources: [{ id, name, url, note? }]            // top 4, filtered and ranked
}
```

---

## 5. Explanations and resource ranking

### Reasons (`why[]`), in this order, each only if it applies

1. "Must-do for {track}." (gate) or "High priority for {track}." (weight ≥ 0.85)
2. "Builds {competency}, one of your biggest gaps right now." (coverage ≥ 0.5; names the competency where gap × contribution is largest)
3. "Timing: {deadline}." or "Getting late: ideally done by {term}." (U > 1.2)
4. "Needed before: {up to 2 dependent goals}."
5. "Some programs here are specifically for students like you." (eligibility > 1)
6. "You've already started this." (strength > 0)
7. The goal's own `why` sentence.

### Resources on each card

From the goal's `resources`:
1. Drop ended programs, and drop Rutgers resources from other campuses (`availableAt`, Step 4).
2. Keep only matching major (or "all") and matching year for that term.
3. Apply eligibility:
   - Citizenship rules apply only when stated.
   - Group-specific programs show when the student matches, or when they skipped the identity questions (labeled "check eligibility").
   - Broad "underrepresented" programs always show.
4. Rank and keep the top 4:
   - +3 Rutgers (always the student's own campus, since other campuses were dropped in step 1)
   - +2 NJ (when located in NJ)
   - +1 national
   - +1 active
   - +0.5 verified link (`link-checked` or `search-confirmed`; `blocked`, `broken`, and `unverified` get nothing)
   - +2 identity match

---

## 6. Tunable constants (`K` in `engine.ts`)

| Constant | Value | Effect of raising it |
|---|---|---|
| realism | 0.8 | Assumes more of the stated hours get used |
| competencyGain | 0.35 | Each finished goal closes gaps faster |
| coverageAlpha | 0.5 | Gap-filling goals win more often |
| eligibilityBoost | 0.15 | Identity-matched programs rank higher |
| stabilityBonus | 0.10 | Re-plans move goals less |
| thresholdBase / thresholdSqueeze | 0.45 / 0.35 | Fewer goals make the plan / short horizons get leaner |
| earlyFloor, lateCeiling, pastLatest | 0.55, 0.6, 0.5 | Shape of urgency over a window |
| maxShare | 0.5 | Less room for any single goal per term |
| pinBonus | 1.25 | Gates and deadlines jump the queue more |
| quickWinHours | 3 | More tasks treated as quick wins |
| focusBoost / focusRunway | 1.3 / 0.5 | Short plans lean harder on applications and networking |
| blockHours / fullBlockHours | 300 / 350 | What counts as a full-time commitment |
| coopFlexShare | 0.3 | Free time left during a co-op semester |
| prereqInherit | 0.9 | How strongly a prerequisite inherits its dependent's weight |

Tune with `docs/sample-plans.md`: run `npm run samples`, read the four example students, adjust, and repeat. Bump `ENGINE_VERSION` when behavior changes.

---

## 7. How the site uses the plan

### Flow map layout

- **Columns** = `plan.terms` (left to right).
- **Rows (lanes)** = goal categories in this order: foundation, presence, skills, experience, network, credentials, academics, applications.
- **Nodes** = `PlanItem`s. Show title, hours, a "must-do" badge for gates, and a "continues" marker for partial items.
- **Edges** = `plan.edges` drawn as arrows. A goal split across terms shows as one node per term, joined by a thin continuation line.
- **Summer blocks** render as a wide bar across the summer column.
- **Side panel:** `ongoing` habits, warnings, and a competency radar (current vs. target).
- **Node click** opens a card with `why[]`, resources (with status notes and "last verified"), and a check-off button.

### Interactions

| Action | Engine call |
|---|---|
| Check off a goal | Add to `completedGoals`, re-run with `previousPlan` = current placements |
| Change hours, horizon, or track | Re-run with `previousPlan` |
| "Add from backlog" | v2: a `forcedGoals` input that bypasses threshold |
| New semester starts | `today` moves the current term forward; past terms collapse into a "done" column |

### Persistence

- `localStorage` holds `{ input, previousPlan, engineVersion, dataVersion }`.
- A shareable link encodes only non-identity inputs.
- If the saved `dataVersion` is older than the current data, show "Your plan was built on older data — refresh it."

---

## 8. Edge cases already handled

| Case | Behavior |
|---|---|
| Senior with a 6-month horizon | Overdue quick wins first, then job search; long-build goals go to backlog |
| Pre-med junior with too few hours | Plan shows the honest shortfall (about 18 h/wk needed) and keeps gates visible |
| International student | No FAFSA or aid-eligibility goal, no citizen-only programs, CPT/OPT warning |
| Student skipped identity questions | Group-specific programs still show, labeled to check eligibility |
| Co-op | Waits for its ideal window, uses two consecutive terms, cuts that term's free time, and replaces the target internship |
| Part-time summers | Half-block goals (research, explore internships) still fit; full internships don't, with a warning |
| Track goal outside the major | A track boost overrides a goal's major restriction (econ student on the software track gets coding goals) |
| Missed hard deadline (e.g., junior-summer recruiting for a senior) | Not scheduled; listed in backlog as "window has passed" |
| Student-only goals near graduation | Never spill into after-graduation terms |
| Newark or Camden student | Same goals and scheduling as New Brunswick; resource cards show their own campus's offices (career center, Handshake, research, EOF, fellowships) and never another campus's |
| Student at another school | No Rutgers-only resources; NJ and national resources still show |
| Goal whose only resources are another campus's | Still scheduled; the card shows no resources rather than the wrong office |

---

## 9. Tests (`test/engine.test.ts`)

`node --experimental-strip-types --test test/engine.test.ts` checks:

1. Determinism.
2. Every track × year × two horizons: no term over capacity, no goal before its prerequisite, summer goals only in summers, suppressed goals never appear.
3. Finished goals never reappear.
4. Identity answers never remove a goal from consideration.
5. International students never see citizen-only goals or programs, and get the CPT/OPT warning.
6. A co-op and the target internship are never both scheduled.
7. Re-planning with no input change moves at most 2 goals.
8. The current term follows the academic calendar on break days and uses the rising year in summer.
9. Every year plans without errors on any day of the year (engine 0.1.0 crashed for a year-4 student in summer).
10. Blocked and broken links get no verified-link ranking bonus (engine 0.2.0 gave them one).

`test/campus.test.ts` (engine 0.4.0) checks:

11. `campusOf` and `availableAt` behave as described in Step 4.
12. New Brunswick plans are unchanged from engine 0.3.0: 324 stored plans (every track × year, plain, international, and first-generation + low-income) keep the same goals, terms, hours, and backlog (`test/fixtures/nb-plans-engine-0.3.0.json`, made by `scripts/nb-baseline.ts` before the data change). Cards may only gain new resources NB students can use, and the backlog may only gain the two new packaging goals.
13. Newark and Camden students never see another campus's Rutgers resources, for every offered major and year.
14. Each campus gets its own career office and Handshake on the same goals.
15. Students at another school see no Rutgers-only resources.
16. The core invariants hold for every campus × offered major × track × year.
17. Identity answers never remove goals at Newark or Camden.
18. A Packaging Engineering student gets the packaging goals, co-op, resources, and recruiting note.

Add a test for every bug found in review.

---

## 10. Known limits and v2 roadmap

1. **Cycle shifting.** If a must-do can't fit before its window closes (pre-med applications), automatically try next year's cycle and say "plan for a gap year." Today it only warns.
2. **Forced goals** from the backlog, and a "not interested" control that suppresses a goal.
3. **Hour-based strength.** "I have 60 clinical hours" should map to 60/150 strength, not a fixed 0.6.
4. **Second tracks.** Students with two targets (consulting or banking): blend boosts with weights that sum to 1.
5. **Non-student statuses** (recent grad, professional, career changer): the same engine with a different term axis (quarters instead of semesters) and goal set.
6. **Weight calibration.** Weights are informed defaults. Calibrate with tester outcomes (which steps students actually took) and advisor review.
7. **Optional AI layer** later: it can only rewrite explanations or parse free-text experience into intake answers. The schedule stays deterministic.

---

## 11. Handoff notes for Claude Code

```
data/               all advice lives here (validated)
src/types.ts        resource types (site-facing)
src/engine/         types.ts, engine.ts (buildPlan), load.ts (Node loader for tests)
scripts/            validate.mjs, check-links.mjs, sample-plans.ts
test/               engine.test.ts
docs/               ALGORITHM.md (this file), sample-plans.md
```

Commands:

```
npm run validate                                    # data integrity
npm test                                            # engine invariants
npm run samples                                     # regenerate docs/sample-plans.md
```

Suggested build order for the site (Next.js static export or Vite, TypeScript):
1. Import `data/*.json` and `buildPlan` into the app.
2. Intake wizard driven by `intake.json`.
3. Render `Plan` as the flow map (lanes × terms, with edges). React Flow or a CSS grid both fit.
4. Goal card with reasons, resources, and check-off.
5. Persistence and re-planning.

Keep the engine pure: no DOM, no fetch, no Date.now() inside it (pass `today` in).
