# Career Pathway Mapper: planning engine design

Status: v0.14 design (engine 0.14.0: a goal the student has partly done says so (`started`), intake answers credit what they imply (data 2026.11.24-3), and "Needed before" names only goals still ahead, by their current title; 0.13.0: a student graduating a year later plans on the runway of a year earlier, with terms labelled by their real year (`graduation`); the final semester holds at most 3 goals besides must-dos; 0.12.0: every planned item says how its timing stands (`timing`: early, on time, late, last chance, after graduation), carries the wording chosen for it (`text`, from the goal's `variants`), and, for a goal planned over several terms, which part this term is (`phase`) and its steps (`phaseSteps`); the site and the PDF read the item's text; 0.11.0: application goals carry the months their round is open (`cycle`), are only started in a term that overlaps it, say "Open now, through spring." or "Opens in late summer, through spring.", and leave "Up next" once the round has closed; grad-school applicants say whether they apply this cycle or after a gap year (`gradApps`); 0.10.0: a goal starts only with enough semesters left to finish it and for it to pay off (`minTermsLeft`), groundwork drops once what it prepares for is done or underway (`supersededBy`), goals that need a degree program stay in it (`majorRule`), a goal that can't start in time offers its shorter `alternative` (a one-semester research project for the honors thesis), and the final-year outcome and its quick steps go first in every final-year term; 0.9.0: goals can be crossed out as "Not for me" without holding back what depends on them, a draft map shows more ranked options per term before the student finalizes, and every item has an importance tier from recruiter-backed weights; 0.8.1: goals that need semesters left close before the final semester, and late goals explain themselves for now; 0.8.0: semester input, a goal cap per term (baby steps), the final year's outcome as a must-do, continues/past queue kinds, only true and forward-looking notices; 0.7.0: upper-year plans put the student's own year first: stale catch-ups discounted, one-at-a-time placement so prerequisites unlock dependents in the same term, no final-year FAFSA, late wording, nothing impossible queued as next; 0.6.0: leftover goals become an ordered "up next" queue and the hours-shortfall warning is gone; 0.5.0: enrollment question, part-time note, campus-specific international office; 0.4.0: three Rutgers campuses, each student sees only the Rutgers offices of their own campus; 0.3.0: calendar-based current term, only loaded or confirmed links earn the ranking bonus), with a working reference implementation in `src/engine/` and passing invariant tests in `test/`.
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
| `goals.json` | Milestones the engine schedules | 112 |
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
| `variants` | 0.12.0 (replaces 0.7.0's `late`): `[{ when, title?, steps?, doneWhen?, why?, phases? }]`, wording for a timing other than on time. `when` is `late` (after the ideal window: "Meet a career advisor and plan the semesters ahead", not "sketch a 4-year plan"), `last-chance`, or `after-grad` (the job search after graduation). `after-grad` falls back to `late`; `last-chance` falls back to `late` when the term is also past the ideal window |
| `phases` | 0.12.0: `{ start, continue, finish }`, step indexes for the first term of a goal planned over several terms, the terms in between, and its last term (16 goals; a research position starts with finding labs and continues with "show up reliably"). A variant with its own steps has its own `phases` |
| `forNextYear` | Yearly goals that pay off the following school year (FAFSA, outside scholarships): no round in the final year |
| `doneWhen` | One sentence saying how the student knows it's finished (display only) |
| `minTermsLeft` | 0.10.0: fall and spring terms that must remain before graduation, counting the start term, for the goal to finish and pay off (thesis 2, minor or certificate 3, research assistant 2, officer role 2, faculty relationships 1). It never starts with fewer, and never runs past graduation |
| `supersededBy` | 0.10.0: goals that make this one pointless: once one is done, or planned and in its ideal window, this one isn't started (a practice career fair after a target internship; researching careers once the job search starts). A track that boosts the goal keeps it in the second case ("still exploring") |
| `majorRule` | 0.10.0: `"only"` = needs enrollment in one of `majors` (BSW field placement, NCLEX, pharmacy internship, FE exam, residency planning). A track's weights never pull it into another major's plan; the plan's notice names it instead |
| `cycle` | 0.11.0: `{ opens, closes }`, the months (1–12, wrapping past December) an application round is open. FAFSA 10–5, target internships 8–4, early internships 9–3, research programs 10–2, Eagleton 9–10, grad applications 9–1. The goal only starts in a term whose months (the current term from today's month) overlap the round; its timing line says when it's open, in seasons, not months; `PlanItem.cycle` holds the status |
| `gradStep` | 0.11.0: `"apply"` (graduate applications) or `"prep"` (program list, statement, letters, test prep), timed by the `gradApps` answer |
| `alternative` | 0.10.0: a goal (marked `onlyAsAlternative`) planned in this one's place, with its weight and must-do status, when this one can't start anywhere in the plan |
| `guides` | How-to pages for the steps: `type: "guide"` resources in `resources/guides.json`, or other non-Rutgers resources, so every campus can open them. Never ranked or filtered by the engine |

**Time words in text (data 2026.11.23-3).** A goal's text is shown in whatever term the engine places it, so it names no year, stage, or month that could have passed by then: "the summer before your last year", "most close in winter", "the semesters ahead", not "junior summer", "December to February", or "your remaining semesters". A stage word is allowed only where the goal's window means it can't be shown after that stage. `test/timing.test.ts` enforces this over every major, suggested path, year, and season (rules T1, T2, T4, T6 in `docs/TIMING_AUDIT.md`), and `npm run audit:timing` gives the full report.

**Timing and text (0.12.0).** Every `PlanItem` has `timing`: `after-grad` past graduation; `last-chance` in its `latest` term (when that's past the ideal window and the goal isn't `lateOk`) or the last term it can start with `minTermsLeft` left; `late` past the ideal window; `early` before it; else `on-time`. The engine picks the matching variant and puts its title on the item, its steps and done-when line in `item.text`, and its reason last in `why`. A goal planned in more than one term gets `phase` (`start` in its first term, `finish` in the term it completes, `continue` otherwise) and `phaseSteps` from `phases`. The site's steps (`howTo`) and the PDF read `item.text`; "Do this now" and the next-step lines point at the first unchecked step in `phaseSteps`, then any unchecked step; the PDF lists `phaseSteps` under a goal's later terms. Placement never reads text: 0.12.0 left every placement in the New Brunswick baseline unchanged.

`steps`, `doneWhen`, and `guides` don't change planning. The site shows them on each goal (checkable steps in the drawer, the next unchecked step in "This semester" and the "Do this now" card, and the steps in the PDF), so a plan says what to do, not only why.

### 2.3 Track (career target)

| Field | Meaning |
|---|---|
| `competencyTarget` | Where a ready graduate on this path should be on each competency (0–1) |
| `boosts` | Per-goal weights that override `baseWeight` (and override a goal's major restriction) |
| `gates` | Must-do goals: weight floor 0.95, never dropped, warned about if they can't fit |
| `suppress` | Goals hidden for this path (pre-med hides the junior-summer corporate internship) |
| `windowOverrides` | Retimes goals for this path (pre-med applies the summer after junior year) |
| `recruitingNote` | Timeline warning shown with the plan |
| `recruiterFocus` | One sentence: what this field's recruiters or admissions committees weigh most (data 2026.11.17-1) |
| `recruiterSources` | The https sources behind `recruiterFocus` and the track's weights |

The weights in `boosts` and `gates` are set from what recruiters and admissions committees in each field say they look for; `docs/RECRUITER_PRIORITIES.md` records the evidence for each track, and `test/recruiter.test.ts` pins the orderings the evidence supports (for example, data analytics gates on SQL, not Python). Change a weight only with a source.

### 2.4 Intake mapping

Each experience, skill, or credential answer lists `completes: [{goal, strength}]`. Strength 1 = done; less than 1 = partly done (for example, "I have a LinkedIn" = 0.6 of "Build a complete LinkedIn profile").

Answers also credit what they imply (data 2026.11.24-3, docs/IMPROVEMENT_PLAN.md 5.2): an internship means a resume, interview practice, Handshake, and an introduction you've used; a job means an interview; a career fair means a pitch, Handshake, and a resume; informational interviews mean a LinkedIn and some networking; leading a group means public speaking. A goal's remaining hours are `hours × (1 − strength)`; with less than an hour left it counts as done. A planned goal with strength between 0 and 1 carries `started` (engine 0.14.0), which the site shows as "started, about 60% done", with that share of its steps checked until the student ticks their own.

---

## 3. Inputs (`PlanInput`)

| Input | Source | Default |
|---|---|---|
| `school` | "Which Rutgers campus are you at?": `rutgers-nb`, `rutgers-newark`, `rutgers-camden`, or `other`. The major list is filtered to majors offered at that campus | `rutgers-nb` (missing means New Brunswick, as before 0.4.0) |
| `majorId`, `year` | Dropdowns | required |
| `trackId` | "Where do you want to end up?" (track list filtered by `suggestedMajors`, with "show all" and "Still exploring") | required |
| `horizon` | 6mo, 1yr, 2yr, graduation, after-graduation | graduation |
| `today` | Browser clock | — |
| `semester` | Part of "Where are you in school?" (year and semester in one answer). 1 = fall, 2 = spring; overrides the calendar (off-cycle students). A summer date with a fall answer starts at the summer before it | calendar |
| `identity` (gender) | The optional gender question adds `women`, `men`, or `nonbinary` to identity; it only surfaces programs and is never in a share link | none |
| `graduation` | 0.13.0: "When do you expect to graduate?" (at the end of my fourth year / a year later), asked from year 2 on, except "Fifth year or later". "year-later" plans on `year − 1` and adds 1 to every term label and yearly-round name ("Year 5 · Spring", "(year 4)"). A first-year's four-year grid can't hold a fifth year, so it's ignored there. December graduations aren't modelled; the part-time note covers planning by credits | on-time |
| `gradApps` | 0.11.0, grad-school tracks only: "When do you plan to apply?" (this coming cycle / after a gap year / not sure yet), on the time-frame screen. "this-cycle": applications by the end of the final year, and every prep step finishes by the time they start, never late. "after-gap": applications move to the fall after graduation. Missing or "not-sure": unchanged | none |
| `enrollment` | "Are you a full-time or part-time student?" (full-time = 12+ credits a term). Part-time adds a Step 9 note; scheduling is unchanged | full-time |
| `weeklyHours` | Free hours a week outside class (after classes, studying, work, and family), 2/5/10/15/20 | 5 |
| `summer` | full / part / none | full |
| `openToCoop` | Engineering, pharmacy, supply chain only | true |
| `location`, `citizenship` | Optional | unknown |
| `identity` | Optional multi-select | [] |
| `experience`, `skills`, `credentials` | Checklists | [] |
| `completedGoals` | Goals checked off on the map | [] |
| `skippedGoals` | Goals crossed out as "Not for me" on the map (0.9.0). A goal id drops every yearly round; `id@Y2` drops one round | [] |
| `draft` | The draft map (0.9.0): the plan plus more options per term, before the student finalizes | false |
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
3. Yearly goals become one instance per remaining year (`f-fafsa@Y2`, `f-fafsa@Y3`, …), each with a one-term ideal window. `forNextYear` goals skip the final year: a senior's FAFSA would only pay for the year after graduation.
4. Skip instances already at strength 1.
5. Send to the **backlog**, with the reason, if: the window opens after the horizon; the window has closed and the goal isn't `lateOk`; or `weight < threshold` (and not a gate).

**Final year (engine 0.8.0).** The track's `outcome` (`job` or `grad-school`) makes `ap-fulltime` or `ap-grad-apps` a must-do once the student is in year 4, and a "by graduation" plan also covers G1–G2, where only goals that run past graduation (and the steps they need) can go.

**Horizon squeeze.** `runway = termsInHorizon / termsUntilGraduation`. `threshold = 0.45 + 0.35 × (1 − runway)`. A shorter horizon raises the bar, so a 1-year plan contains fewer, higher-impact goals instead of a compressed 4-year list.

### Step 4b — Not for me (0.9.0)

A goal in `skippedGoals` (or one round of it, `id@Y2`) never becomes a candidate. It isn't pulled in as a prerequisite, and it never holds back a goal that lists it as one: the student has decided the path doesn't run through it, so its dependents are ready without it (crossing out Python leaves Data structures in the plan). The plan's `skipped` list names each crossed-out goal, with `essential: true` for the track's must-dos, so the site can show it with Undo. Crossing out a must-do is allowed, with a warning that most recruiters for the track expect it. Undo is removing it from `skippedGoals`; the plan is then exactly what it was.

### Step 4c — Lead time, purpose, and programs (0.10.0)

- A goal with `majorRule: "only"` and a `majors` list without the student's major is never a candidate, even when the track boosts or gates it. If the track expects it, one notice names it: "Social work practice usually includes "Complete your BSW field placement", which is only open to students in that degree program. An advisor can tell you whether a change of major makes sense."
- A goal whose `supersededBy` goal is already done (strength 1) goes to the hidden `past` queue: "What it prepares for is already done."
- A zero-hour ongoing goal (a minor) with fewer than `minTermsLeft` school terms left goes to `past`.
- A plan that reaches the final year always has its outcome (`ap-fulltime`, or `ap-grad-apps` for grad-school tracks) as a candidate, even when the track doesn't weight it above the threshold, so a junior's research plan ends in applications.
- A goal with an `alternative` that can't start in any term of the plan before graduation (its window and `minTermsLeft`) goes to `past`, and the alternative becomes a candidate with its weight and must-do status. A senior in their last spring on the research path gets "Do a one-semester research project with a professor" instead of an honors thesis.

### Step 5 — Prerequisite closure

Any selected goal pulls in its unfinished prerequisites (strength under 0.5) even if they were below threshold. Each prerequisite inherits `max(ownWeight, 0.9 × dependentWeight)`. This repeats until stable. The prerequisite records which goal pulled it in, which feeds the "Needed before…" explanation.

### Step 6 — Static score

```
coverage(g)    = Σ_c comp_g[c] × gap[c]  /  (Σ_c comp_g[c] × max_c gap[c])      ∈ [0, 1]
eligibility(g) = 1.15 if any attached resource the student can use targets one of their identity tags, else 1
focus(g)       = 1.3 for applications/network goals when runway ≤ 0.5, else 1
static(g)      = weight × (1 + 0.5 × coverage) × eligibility × focus × stale
stale(g)       = 0.6 if the goal's ideal window ended more than 3 terms ago and it isn't a gate or a prerequisite of a selected goal, else 1
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
| not yet started and fewer than `minTermsLeft` school terms left, or superseded (0.10.0) | 0 |
| after graduation, goal has `minTermsLeft` (0.10.0) | 0 (needs enrollment) |
| not yet started and its application round (`cycle`) is closed in every month of the term (0.11.0) | 0 |

**Term score** = `static × U × stability × pin × blocking`
- `stability` = 1.1 if the goal was in this same term in `previousPlan` (prevents churn when a student re-plans).
- `pin` = 1.25 for gates, and for deadline goals while U ≥ 1.
- `blocking` = 1.4 when the goal is a prerequisite of a selected goal whose ideal window starts this term or next, so the senior job search isn't stuck behind an unscheduled mock interview.

**Readiness.** A goal is ready when every prerequisite is done, at strength ≥ 0.5, or completed in an earlier term. A quick prerequisite (≤ 3 hours) finished earlier in the **same** term also counts.

**Final semester (0.13.0).** The last term before graduation holds at most `finalTermCap` (3) goals besides must-dos and the quick steps they need now, next to the outcome; the rest waits in "Up next".

**Goal cap (baby steps, engine 0.8.0).** A term holds at most `round(2 + weeklyHours / 4)` goals, between 3 and 6 (2 h/week: 3; 10: 5; 20: 6). Must-dos are never crowded out, and neither are quick steps (≤ 6 hours) that unlock a must-do this term or have a deadline now (FAFSA); these are flagged `essential`. Everything else waits in the queue. A prerequisite ranks at least 0.99× the goal it unlocks when that goal is due now or next term, and a prerequisite of up to 6 hours finished earlier in a term unlocks its dependent that term. A closed prerequisite reopens only for a goal that runs past graduation.

**Placement order inside a term**
1. **Phase 1** places only tier 0–2 goals (engine 0.10.0):
   - tier 0: in a final-year term, the track's outcome (`ap-fulltime`, or `ap-grad-apps` for grad-school tracks) and the quick steps (≤ 6 hours) it needs now or next term. This holds in every plan, not only for students who are seniors now, so a sophomore's plan starts the job search in senior fall
   - tier 1: other must-dos and the quick steps they need now (the protected goals above)
   - tier 2: last-chance goals: not `lateOk` and this is their `latest` term, or (0.10.0) the last term they can start with `minTermsLeft` semesters left (senior fall for a thesis), so a thesis competes with other last-chance goals instead of losing to all of them
   - Before 0.10.0, last-chance goals came first, so an optional last-chance task (aid check, fellowship advising) or a long skill must-do could take the hours a senior's job search needed.

2. **Phase 2** places everything else by tier, then term score, then id (deterministic tie-break).

   Both phases place **one goal at a time** and recheck readiness after each (engine 0.7.0), so a goal that finishes is followed by what it unlocks in the same term (elevator pitch → mock interview → job search) before the hours run out. Earlier engines placed a whole batch first, which starved dependents.
3. **Top-up pass:** leftover hours go to goals already in progress this term, highest score first.

**How each goal type is placed**
- **Integrated:** costs no hours. Placed in the first eligible term; completes after `spanTerms` terms.
- **Block** (per-term hours ≥ 300): needs a free block slot in each of its `spanTerms` consecutive terms. It needs a full slot if per-term hours ≥ 350, otherwise half. It waits for its ideal window unless that falls after the horizon. A co-op in a fall/spring term cuts that term's free hours to 30%. Finishing any goal marks everything in its `satisfies` list as complete; for a yearly goal, that year's round (writing a first resume counts as that year's resume refresh).
- **Flex:** takes `min(need, share cap, pace)` where:
  - `need` = per-term hours (splittable goals) or all remaining hours.
  - `share cap` = 50% of the term's free hours, so one big goal can't crowd out everything else. It applies to splittable goals, or goals larger than two terms of capacity (auto-split).
  - `pace` = remaining hours ÷ terms left in the ideal window, which spreads 100 coding problems across four terms instead of front-loading them.

  If it doesn't fit, a splittable goal takes what's left (at least 4 hours); otherwise it waits for a later term. Remainders under 1 hour are rounded to done.

### Step 7b — The draft map (0.9.0)

With `draft`, Steps 1–7 run unchanged, so the time-sized plan inside the draft is exactly the final plan. Goals below the priority threshold become candidates too, though they are never scheduled. Then each term gets extra options, up to `draftCapScale` × the goal cap (at most `draftCapMax`, not counting must-dos), highest score first. Each option goes in the first term inside its ideal window, or later if that term is full. It must be ready by then (its prerequisites done, planned earlier, or crossed out) and not overdue. Options carry `option: true` and take no hours. They leave the queue, so nothing is listed twice. The student crosses out what they don't want and marks done what they've done; finalizing re-plans without `draft`.

**Importance (0.9.0).** Every item has `importance`: `must` (a track must-do, or an essential step it needs now), `high` (weight ≥ 0.85), `medium` (≥ 0.65), or `low`. Weights come from what the track's recruiters look for (docs/RECRUITER_PRIORITIES.md), so the map can list the most important options first.

### Step 8 — Backlog (the "up next" queue)

The plan is sized to the student's free time. Everything else is a queue, not a shortfall. Each entry has a `kind` and one calm reason:

| kind | When | Reason text |
|---|---|---|
| `continues` | Started in the plan and runs past its end (0.8.0): shown on the plan item, never repeated in the queue | "Continues after this plan." |
| `next` | Selected but not placed, and still possible before the plan ends: started, waiting on a prerequisite, or no room yet | "Started in your plan; keep going when you have time." / "Comes after \"X\"." / "Next in line: it moves into your plan as you finish goals or add hours." |
| `optional` | Below the horizon threshold (Step 4) | "Lower priority for your time frame; add it if you have time." |
| `not-now` | After the time frame, needs a full-time summer the student doesn't have, or legally unavailable | The specific reason |
| `past` | An earlier stage that has passed for this student's year: its window closed, impossible in any remaining term, or depends on such a goal (0.8.0). Never shown, so the page never reads as "you missed this" | Kept for tests |

Order: `next` first (started goals first, then by static score), then `optional` (by weight), then `not-now`; ties by id. A gate that ends up in `next` adds a note: "\"X\" is essential for T and is next in line. To fit it sooner, add a few hours a week or free up a summer." No goal is ever described as "didn't fit", and no hours-needed number is shown.

### Step 9 — Warnings

- **No hours shortfall** (removed in 0.6.0): telling a student they need 38 hours a week was discouraging and not actionable. The `next` queue says what comes next instead.
- **Limited summers** on a track that runs through a junior-summer internship.
- **International students:** CPT/OPT authorization note naming the student's campus office (Rutgers Global ISSS, the Rutgers–Newark Office of International Student & Scholar Services, the Rutgers–Camden Office of International Students & Global Programs, or "your school's international student office").
- **Part-time students:** the plan spaces goals at a full-time pace for their year; plan by credits with an advisor and check whether wanted internships or scholarships require full-time enrollment.
- **Track recruiting note**, only until the track's `recruitingNoteUntil` term (0.8.0).
- **No backward-looking notices** (0.8.0): a must-do from a passed stage gets no notice; gate notices never contradict the plan.
- **Gate** that can't fit or whose window has closed.

### Step 10 — Output

```ts
Plan {
  meta: { engineVersion, dataVersion, generatedFor, track }
  competencies: { current, target, gap }          // drives the radar chart
  terms: [{ code, label, capacityHours, usedHours, summerBlock, items: PlanItem[] }]
  ongoing: [{ goalId, title, why }]               // standing habits (keep GPA ≥ 3.0)
  edges: [{ from, to }]                            // prerequisite arrows between placed goals
  backlog: [{ goalId, title, reason, kind }]      // "Up next" (kind next) and "Not in this plan" (optional, not-now)
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
3. "Timing: {deadline}.", or "Most students do this earlier, and it still helps now." when the term is past the ideal window, or "Good to do soon: students usually do this by {term}." (U > 1.2)
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
| staleTerms | 3 | How long past its ideal window a goal counts as a stale catch-up |
| staleDiscount | 0.6 | Share of score stale catch-ups keep (lower puts an upper-year student's own goals further ahead) |
| blockingBoost | 1.4 | Priority for prerequisites of goals due now or next term |
| draftCapScale / draftCapMax | 2 / 10 | More options per term on the draft map (0.9.0) |
| importanceHigh / importanceMedium | 0.85 / 0.65 | Weight needed for "high" and "medium" importance |

Tune with `docs/sample-plans.md`: run `npm run samples`, read the four example students, adjust, and repeat. Bump `ENGINE_VERSION` when behavior changes.

---

## 7. How the site uses the plan

### Results page order (engine 0.8.0 redesign; reordered 2026-11-23, see docs/VISUAL_REFRESH.md)

1. **Where you stand + Do this now:** the term, "N goals · N must-dos · N done", how much of the student's free hours the term uses ("Uses about 4 of your 5 free hours a week", from `usedHours` over the weeks left in the term), and a control to change the free hours, which re-plans at once (`setHours` in `src/app/state/plan.ts`: same answers, new `weeklyHours`, `refresh`). Then the next unchecked step of this term's first must-do in work order (or the first goal when no must-do has a step left), what it is part of, and the place to go, linked (the goal's first resource, or its first guide).
2. **This semester:** the term's goals in work order (by score, but a goal's prerequisites in the same term come right before it), three shown (more on request), each with its priority tag, its time in words, its next step and its best one or two places, linked. Goals scheduled after their ideal window show their `late` title and steps. Notices ("good to know") sit under it, then "Why this order": the track's recruiter focus and its sources.
3. **Coming up:** the next two semesters in full, later ones folded, and "When you have more time" (kind `next`, first three, "Start any of them whenever you like") right there instead of at the bottom.
4. **The big picture:** where you're headed (the track's outcome and up to five milestones: must-dos and the biggest applications and experiences, in order), then what you have / what you need (the student's own answers as strengths; up to four needs: unfinished must-dos, then the biggest skill gaps with the goal that builds each).
5. **Draft line:** one line linking to the Map tab, where the draft banner and "Finalize my map" are.

**Time, as the site shows it.** The engine's `hours` on a plan item are the hours placed in that term. The site never shows a bare number of hours: a goal of 6 hours or less in all reads "about N hours, once"; a longer one "~N h a week this semester (T h in all)", dividing the term's hours by the weeks left in the term (`capacityHours / (weeklyHours × 0.8)`, at most 14, or 10 in summer); 300 hours or more in a term reads "full-time, one summer"; an `integrated` goal "inside your coursework".

6. **On track to graduate** (data 2026.11.17-2; its own **Courses** tab since 2026-11-23): outside the map and the engine. The courses the student's major requires at their campus, by typical year, from `data/requirements.json` (one entry for each of the 44 major–campus pairs, transcribed from the official Rutgers catalog or school page, linked as "Official requirements for your major"). Since data 2026.11.23-2 every entry carries its catalog edition and the date it was last checked; the section names both ("from the 2026–2027 New Brunswick Undergraduate Catalog (last checked November 23, 2026)") and tells students who started before fall 2026 to follow their degree audit or the catalog for their entry year. See docs/MAJOR_REQUIREMENTS.md. Earlier years are marked "should be done by now", the current year "this year". Each course or open requirement has a tick box saved only in this browser (`cpm.courses.v1`); a line counts how many earlier-year requirements are ticked. Years follow the school's published curriculum where one exists (`sequence: "official"`), otherwise course level (100-level in year 1, and so on), and the page says which. Students at a school outside Rutgers don't see it. Ticks never change the plan.
7. Three tabs under the header (design/DESIGN.md §7.4a): **Plan** (all of the above, in this order), **Map** (the confluence map of every goal, plus the skills picture) and **Resources** (every resource as a box, grouped, with filters). "See the full map" under the milestone map switches to the Map tab. The choice of tab is not saved.

The PDF follows the same order.

### The map (confluence)

Drawn by `layoutConfluence()` in `src/app/map/confluence-map.js` (design/DESIGN.md §7.5), on the page and in the PDF.

- **Rows** = `plan.terms`, top to bottom, each starting at a dotted shoreline with the term's name.
- **Streams** = `PlanItem`s in work order (priority first). Each goal joins the river once, in the term it starts, and runs to the outcome at the bottom; a goal split across terms is not drawn again.
- A must-do has a solid dot and a heavier line; a finished goal is green and reads "done". The fact line under a name is kind, hours, `must-do`, `continues`.
- Two-sided from 560px wide, one-sided below. Given a height limit (the PDF), the fullest terms drop their last rows first and say how many are left out.
- Each name is a button that opens the goal drawer (`why[]`, steps, done when, resources with status notes and "last checked", and "Mark as done").

### Interactions

| Action | Engine call |
|---|---|
| Check off a goal | Add to `completedGoals`, re-run with `previousPlan` = current placements |
| "Not for me" (0.9.0) | Add to `skippedGoals`, re-run; listed under "Not for me" with Undo (removes it again). A must-do stays marked "Essential must-do" there |
| A new plan (0.9.0) | Built with `draft: true`: the draft map, with a banner saying it can be edited. "Edit your map" (Map tab) lists every semester's goals by importance, each with "Mark as done" and "Not for me" |
| "Finalize my map" / "Back to the draft" (0.9.0) | Re-run without / with `draft`. Not finalizing is fine: the draft is the map, and the PDF lists its extra options briefly |
| Change hours, horizon, or track | Re-run with `previousPlan` |
| "Add from backlog" | v2: a `forcedGoals` input that bypasses threshold |
| New semester starts | `today` moves the current term forward; past terms collapse into a "done" column |

### Persistence

- `localStorage` holds `{ input, previousPlan, engineVersion, dataVersion }`, plus `skipped` and `finalized` (0.9.0; plans saved before then open as final, with nothing crossed out). Draft options are never stored as placements.
- A shareable link encodes only non-identity inputs.
- If the saved `dataVersion` is older than the current data, show "Your plan was built on older data — refresh it."

---

## 8. Edge cases already handled

| Case | Behavior |
|---|---|
| Senior with a 6-month horizon | Overdue quick wins first, then job search; long-build goals go to backlog |
| Pre-med junior with too few hours | Plan fills the hours they have with the highest-priority goals; the rest is an ordered "up next" queue, and must-dos that wait get a note on how to fit them sooner |
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
12. New Brunswick plans were unchanged by the campus expansion (engine 0.4.0, checked then against 324 plans recorded with 0.3.0). That check now lives on as test 27's baseline.
13. Newark and Camden students never see another campus's Rutgers resources, for every offered major and year.
14. Each campus gets its own career office and Handshake on the same goals.
15. Students at another school see no Rutgers-only resources.
16. The core invariants hold for every campus × offered major × track × year.
17. Identity answers never remove goals at Newark or Camden.
18. A Packaging Engineering student gets the packaging goals, co-op, resources, and recruiting note.
19. The international note names each campus's office (engine 0.5.0).
20. Part-time students get the pace note and identical goals and terms; full-time and missing enrollment get no note.
21. Leftover goals are an ordered queue (`next`, `optional`, `not-now`) with no "didn't fit" wording and no hours-shortfall warning (engine 0.6.0, `test/engine.test.ts`).
22. No FAFSA or outside-scholarship round in the final year (engine 0.7.0).
23. A senior's plan includes the full-time job search, after the resume it needs.
24. Goals done late use late wording ("plan your remaining semesters"), in the plan and the queue, with no stale "by year 1 spring" timing.
25. Nothing impossible before graduation is "next in line" for a senior (junior-summer internships, co-ops).
26. First-year-only goals (first career fair, joining organizations, design teams) stay out of upper-year plans.
28. Engine 0.8.0 (`test/engine.test.ts`): the semester decides the starting term; no term exceeds the goal cap (must-dos and essential steps aside); the queue never repeats the plan, hides past stages, and names yearly rounds; notices are true for the student; gender answers only add programs for that gender.
31. Engine 0.9.0 (`test/draft.test.ts`): a crossed-out goal leaves the plan and the queue, is listed for Undo, and never holds back what depends on it; crossing out a must-do warns; one yearly round can be crossed out; the draft map is the final plan unchanged plus ranked, non-repeating, timely options; every item has the right importance tier.
32. `test/recruiter.test.ts`: every track names what its recruiters look for, with https sources, and its weights follow docs/RECRUITER_PRIORITIES.md.
30. Engine 0.8.1: nothing that needs semesters left (advisor planning, career research, a minor or certificate, an officer term, aid eligibility, starting research, study abroad, fellowship advising) starts in the final semester; a goal done late never explains itself as "early".
29. `scripts/simulate.ts` (CI, `npm run simulate`): 260 varied students across every major at every school, checked against 33 rules (wrong-year wording, missed-goal lists, goal cap, repeats, notices, campus, major, must-dos, seniors' outcome; 0.9.0: the draft never changes the plan, options never repeat, crossed-out goals never linger or hold anything back; 0.14.0: R27–R33, see item 38). Must report 0 issues.
38. Engine 0.14.0 (`test/experience.test.ts`): juniors with decent experience get at least 20% fewer foundation goals, and first-years fewer with more advanced ones; nothing the student has finished comes back; a started goal carries `started`; a goal with under an hour left is done. `scripts/simulate.ts` rules R27–R33 guard the timing, lead-time, round, final-semester, and experience work in CI.
37. Engine 0.13.0 (`test/fit.test.ts`): graduating a year later gives the plan of the matching on-time runway, labelled with the real year (summers too, after graduation unchanged), and yearly rounds are named by the real year; on time, or a first-year, is unchanged; no final semester holds more than 3 goals besides must-dos, across every major, path, both years, and two time budgets. The site's "Already done?" card (`src/app/results/AlreadyDone.tsx`) lists this semester's catch-ups (timing late or last chance, not must-dos) and marks the picked ones done in one re-plan.
36. Engine 0.12.0 (`test/text.test.ts`): no goal has the old `late`; every planned item, across every major, path, year, and season, has a timing and its text, and after-graduation items are `after-grad`; the job search after graduation uses its after-graduation wording; late items use late wording and on-time items don't; a research position over several terms starts, then continues or finishes, with the matching steps; the job search after graduation is never the same card twice; phases point at real steps.
35. Engine 0.11.0 (`test/rounds.test.ts`): no application goal starts in a term when its round is closed, across every major, path, year, and four dates; a sophomore in late spring isn't told to apply for this summer's early internships; research program applications never land in a summer; the timing line says when the round is open; this-cycle applicants finish the statement, list, and letters before applying, before graduation; gap-year applicants apply the fall after graduation; no answer changes nothing.
33. Engine 0.10.0 (`test/leadtime.test.ts`): a senior in their last spring is never told to start an honors thesis and gets the research project instead; a junior's thesis starts with two semesters left; no goal starts with fewer than its `minTermsLeft`, across every major, path, year, and season; groundwork drops once what it prepares for is done; researching careers stops when the job search starts unless the student is still exploring; program-only goals never cross majors and the notice names them; "Up next" only lists goals that can still start. `npm run audit:lead-time` reports the rest (docs/TIMING_AUDIT.md §7).
34. `test/timing.test.ts` (data 2026.11.23-3): no text names a year, stage, or month that has passed by the term it's shown in.
27. New Brunswick plans match `test/fixtures/nb-plans-baseline.json`, recorded with the current engine by `scripts/nb-baseline.ts`; re-record only for intended planning changes.

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
