# Timing audit: text that doesn't fit the semester it's shown in (2026-11-23)

The problem, in one example: a senior in spring opens "Complete an honors thesis or independent research project" and
step 1 says "Ask your department about honors thesis requirements and deadlines during junior year." That year is gone.
The student doesn't know whether they've already failed or the plan is wrong.

This document records where that happens, why, and the plan to fix it.

## 1. What was run

`npm run audit:timing` (`scripts/timing-audit.ts`) builds a plan for every combination of:

- 3 campuses × every major offered there × every career path suggested for that major;
- years 1–4 × fall, spring and a summer date;
- 5 and 15 free hours a week, full summers, horizon "after graduation", no experience ticked.

That is **4,968 plans**. For each one it reads what the site shows:

- for every planned goal: the title, the steps (or late steps), "done when", the reasons and the resource notes;
- the "Up next" queue;
- the recruiting notices.

It then flags time words that don't fit the term each line is shown in:

| Rule | What it catches |
|---|---|
| T1 | A year or stage that has already passed ("during junior year" in senior spring) |
| T2 | Start-of-college wording late ("4-year plan", "first career fair") |
| T3 | A later year's task worded as if it's now, with no "before/by/for" |
| T4 | A month already past in that term ("file as early as October" in spring) |
| T5 | A month that belongs to a later term |
| T6 | Relative time that's wrong ("next year" in the last semester, "remaining semesters" in year 1) |

A second pass checked placement against each goal's window. Then I read five full plans as the students they were built for.

## 2. How big it is

- **4,926 of 4,968 plans** show at least one timing problem somewhere.
- **2,382 plans** show one in **the semester the student is in now**, which is the part they read first.
- 38,051 problem lines in total. They come from **49 distinct pieces of text**, in 14 of 111 goals and 7 career-path notices.
- Problems in the current semester, by year:

| | Fall | Spring | Summer |
|---|---|---|---|
| Year 1 | 66 of 414 | **414 of 414** | 66 of 414 |
| Year 2 | 89 | **414** | 206 |
| Year 3 | 107 | 363 | 61 |
| Year 4 | 272 | 324 | 0 |

Every spring student reads a FAFSA card saying to file "as soon as it opens each fall" and "as early as October". Seniors see the most problems, which is the group most likely to be confused already.

## 3. Findings

Counts are plans that show the line. Each finding names the goal id in `data/goals.json`.

### A. Fixed years in the steps and reasons (T1, T3)

| Text | Goal | Shown in | Plans |
|---|---|---|---|
| "Many offers go out in senior fall…" | `ap-fulltime` why | 4S, after graduation | 4,656 |
| "Start in the fall of senior year…" | `ap-fulltime` step 1 | after graduation | 2,879 |
| "Start in late summer before junior year" | `ap-internship-target` step 1 | 3F, 3S (passed) and 2U (not yet) | 4,287 |
| "Sophomore summer experience is what makes…" | `ap-internship-early` why | 1U–2S | 2,447 |
| "Needed before: Apply to 30+ target internships for junior summer…" | `f-mock-interview` why (built from a dependent's title) | 4F–G1 | 793 |
| "Most deadlines fall between September and January of senior year" | `ap-grad-apps` why | after graduation | 552 |
| "…deadlines during junior year" | `e-thesis` step 1 | 4F, 4S | 163 |
| "most are the summer before senior year" | `e-nursing-externship` step 1 | 3U | 57 |

**Cause:** steps are written once, for the goal's ideal stage, with absolute years in them. Only 4 of 111 goals have `late` wording, and the reasons built from other goals' titles ("Needed before: …") carry those titles' years with them.

### B. Goals shown after their ideal window with no late wording

**71 goals** are placed after their ideal window and read as if it were still the ideal time. The biggest:

- `ap-fulltime` (3,144 placements);
- `e-research-assistant` (1,992);
- `e-org-leadership` (1,764);
- `f-aid-check` (1,733);
- `p-linkedin-setup` (1,707);
- `e-join-orgs` (1,697);
- `f-explore-careers` (1,672).

Most of these read fine late; "Join 1–2 organizations" works in any year. These do not:

- `n-career-fair-first`: "Attend your first career fair (to look, not to land)" shown to sophomores.
- `ap-fulltime`: shown after graduation with senior-year steps.
- `e-thesis`: shown alone in senior spring.

**Cause:** `late` is one on/off wording. Nothing says which goals need late wording, and nothing checks it.

### C. Goals placed after their `latest` term

**29 goals** are placed after their own latest term. The ones that mislead:

- `e-coop` "Complete a 6-month co-op" in senior fall (252 placements). A six-month co-op then delays graduation, and the plan doesn't say so.
- `e-thesis` started in senior spring (part of 163 placements): a two-semester thesis that usually needs approval the year before.
- `ap-fulltime` in the second term after graduation (834), shown again with the same steps as the first.
- `a-personal-statement`, `a-letters` and `a-grad-list` after graduation (about 400 each), with "start before senior fall" reasons.

**Cause:** `lateOk` and the "past" queue handle goals that are too late to *start*. Nothing models goals that need **time ahead of them** (approval, two semesters, a co-op term) or a **next cycle** (applying after a gap year).

### D. Deadlines and months (T4, T5)

| Text | Goal | Problem | Plans |
|---|---|---|---|
| "Many large employers recruit August–October of junior year" | `ap-internship-target` | Shown in junior spring, when that window has closed | 1,522 |
| "file as early as October" / "as soon as it opens each fall" | `f-fafsa` | Shown in every spring | 1,343 |
| "Most summer roles fill by March" | `ap-internship-early` | Shown in the summer, after March | 356 |
| "deadlines (usually December to February)" | `ap-research-apps`, `e-summer-research` | Shown in spring and summer | 326 |
| "September and January of senior year" | `ap-grad-apps` | Shown in senior spring | 114 |

**Cause:** `deadline` is free text. The engine can't tell whether a deadline is open, closed for this cycle, or opens later. It only uses the field to mark a goal as deadline-driven.

### E. Career-path notices for passed years

- "Banks recruit for junior summer as early as sophomore winter–spring. **Network in sophomore fall.**" is shown in sophomore spring.
- "Firms recruit… in **sophomore spring** and junior fall" is shown in junior fall.
- The pre-med AMCAS line ("apply the summer after junior year") is shown from year 1 on. That's fine as a heads-up, but it's worded as if it's now.

**Cause:** each career path has one `recruitingNote` string and one cut-off term (`recruitingNoteUntil`). A note that covers three stages can't drop the stages that have passed.

### F. Late wording shown too early (T6)

"Meet a career advisor and plan your **remaining semesters**" and "the time you have left" are shown to first-year summer and sophomore students (784 plans). The goal's ideal window ends in 1S, so 1U already counts as late.

`a-packaging-certificate` says "remaining semesters" to sophomores. FAFSA in senior spring says "submitted for **next year**", but next year is after graduation (159 plans).

**Cause:** the engine only knows on-time or late. "A semester past ideal" and "last chance" read the same.

### G. Goals that span several terms repeat their start

8 goals span more than one term, and the engine also splits large goals across terms (27 goals appear in more than one term). Every term shows the same steps from step 1, for example:

- "Browse your department's faculty pages… pick 5–8 labs" in term four of a research position;
- "Start in the fall of senior year" for the job search, in each of senior fall, senior spring and both terms after graduation.

Checked steps carry over in the browser, but the PDF and a fresh browser start over.

**Cause:** a goal has one list of steps. There's no idea of a first term, a middle term and a last term.

### H. What the student reads, beyond the timing rules

Five full plans, read as the student:

1. **CS senior, spring, software engineering.** This semester's list:
   - write your resume;
   - mock interview;
   - 30-second introduction;
   - set up GitHub;
   - LinkedIn profile;
   - **learn Python basics**.

   The job search is the seventh item. The two goals that matter most for this path (algorithms practice, a shipped project) are only in "Up next". A CS senior has taken Python; the plan doesn't know that, because nothing links the major and year to the courses taken.
2. **Finance sophomore, spring, investment banking.**
   - The notice says to network in sophomore fall, which has passed.
   - "Apply to 15+ summer opportunities for after sophomore year" is "Next in line", but by the time it could join the plan, summer roles have filled ("fill by March").
   - Next fall's "Apply to 30+ target internships" starts with "Start in late summer before junior year", which has also passed by then.
3. **Every student:** the LinkedIn step's example headline is "Packaging Engineering student | Seeking a co-op", whatever their major.
4. **Psychology senior, still exploring.** Seven goals in the last semester, including "Give 3 presentations outside class" next to the job search. There is no sense of "you have one semester: these three things".
5. **Any student, after graduation.** The job search is listed twice, word for word, in the two terms after graduation.

### Not problems

These were flagged but read fine. The audit will allow them in its allowlist.

- "Recruit **August**–October" shown in junior fall. The range is open then.
- "AMCAS opens in **May**" shown to a first-year in summer, as a heads-up.
- "Sophomore summer experience is what makes junior internships winnable" shown to first-years. It looks forward. It reads oddly but isn't wrong.

## 4. Root cause, as a system

The engine models time well: term codes, windows, a current term, terms left. **The text doesn't use that model.** Every string is written once, for one moment, with that moment's year and month baked in. There is one on/off switch (`late`) for everything else.

Four things are missing:

1. **Text that knows when it's being read.** There are no timing tiers past "late", no variants for "last chance" or "after graduation", and no first and later terms for long goals.
2. **Deadlines as data.** Open and close months, and which cycle a deadline is for, so the engine can say "open now", "closed this year, next round opens in August", or "too late for this cycle".
3. **Lead time.** Some goals need semesters ahead of them (a thesis, a co-op, a minor, an officer term, letters). The engine has a hard-coded list in the old simulator, but the data doesn't hold it.
4. **What the student already has.** Graduation term (5-year, co-op and transfer students), and what their courses have already covered by their year (Python for CS by year 2). Without these the plan treats every senior as a blank slate.

## 5. The plan

Each phase follows the project rules: a failing test first, ALGORITHM.md updated, and `ENGINE_VERSION` or `data/version.json` bumped.

### Phase T1: rewrite the text (data only; data version bump)

Removes rule groups A, E and most of F with no engine change.

- **Rewrite fixed years as relative time**, in the 22 text fields in 14 goals that carry a stage or month. For example:
  - `e-thesis` step 1: "Ask your department about honors thesis requirements and deadlines; most programs approve proposals a semester or two before you start."
  - `ap-fulltime` step 1: "Start now; if you interned, ask about a return offer."
- **Late or post-graduation wording** for the goals in B that read wrong late:
  - `ap-fulltime` (after graduation);
  - `n-career-fair-first` (late: "Go to a career fair with a short list");
  - `ap-grad-apps`, `a-personal-statement` and `a-letters` (applying after a gap year);
  - `f-fafsa` (senior spring: only if you're going to grad school).
- **Split career-path notices** into dated parts: `recruitingNotes: [{ text, from, until }]`. Each student sees only the part that's still ahead, so "Network in sophomore fall" disappears after sophomore fall.
- **Major-keyed examples:** the LinkedIn headline example uses the student's major, via `{major}` in the text, filled by the display layer.
- **Tests:**
  - `audit:timing` runs in `npm test` with zero T1, T2, T4 and T6 allowed, plus an allowlist for the cases above;
  - the validator rejects a stage word or month in steps or reasons unless the goal's window keeps it true, or a variant covers the later terms.

### Phase T2: timing tiers and engine-chosen text (engine 0.10.0)

**New result variables on `PlanItem`:**

| Field | Values | Replaces |
|---|---|---|
| `timing` | `early`, `on-time`, `late`, `last-chance`, `after-grad` | the on/off `late` flag |
| `phase` | `start`, `continue`, `finish` (multi-term goals) | the same steps every term |
| `text` | `{ title, steps, doneWhen, why }` resolved by the engine | the UI's `howTo()` picking wording |

**New data variables on `Goal`:**

- `variants: [{ when: "late" | "last-chance" | "after-grad", title?, steps?, doneWhen?, why? }]`, replacing `late`. Existing `late` blocks migrate to `when: "late"`.
- `phases: { start: [step indexes], continue: […], finish: […] }` for goals with `spanTerms` greater than 1, or that the engine splits.

**Algorithm:**

- `timing` comes from the placed term against the window and the terms left.
- The engine picks the text: the first matching variant, then the steps for the phase.
- The UI and the PDF both read `item.text`, so they can't disagree.
- After graduation, a goal that continues shows one card with `phase: "continue"`, not a copy.

### Phase T3: deadlines and lead time (engine 0.11.0)

**New data variables:**

- `deadline: { text, opens: month, closes: month, forTerm: "next-summer" | "next-fall" | "next-year", rolling: boolean }` on the 5 deadline goals, plus the research and grad-school goals that mention months.
- `leadTerms`: how many terms must remain after the goal starts. Examples: thesis 2, co-op 2, minor 3, officer term 2. This replaces the hard-coded `NEEDS_TIME` list.

**Algorithm:**

- A deadline goal is placed only in a term where its cycle is open or about to open.
- When the current term is past the close, the goal moves to the next cycle if there is one. Otherwise it goes in the hidden "past" queue.
- "Up next" drops goals whose cycle will close before they could join.
- Placement refuses a start with fewer than `leadTerms` terms left. The goal goes to "past", or, for a thesis, to its shorter alternative (an independent project).

**New result variable:** `deadline: { status: "open" | "opens-later" | "next-cycle", label }`. The card says "Applications open in August" or "This round closed in March; the next opens in August".

### Phase T4: what the student already has (intake and data)

**New input variables:**

| Input | Question | Why |
|---|---|---|
| `gradTerm` | "When do you expect to graduate?", defaulted from year and semester, with "a semester later" and "a year later" options | 5-year, co-op and transfer students; replaces the fixed `4S` |
| Implied coursework | none (derived) | Major and year mark goals as partly done from required courses, for example CS year 2+ covers Python basics and Git. The Courses tab already has the course lists. The plan shows "Assumed from your courses; untick if not". Needs a source per mapping |
| Upper-year basics | For year 3+, a short "Do you already have these?" list (resume, LinkedIn, Handshake, GitHub for tech paths), asked directly instead of buried in the experience checklist | Stops seniors getting first-year basics |

**Algorithm:** the last semester gets a cap and an order. At most 3 goals, with the path's must-dos and the job search (or applications) first.

### Phase T5: keep it fixed

- `audit:timing` becomes a CI step next to `simulate`, with per-rule counts that may only go down.
- Read-as-a-student checks: for each phase, the five plans in §3 H are rebuilt and read, and their before and after are recorded in this file.

## 6. Order and what each phase removes

| Phase | Removes | Size |
|---|---|---|
| T1 text | A, E, most of F, the LinkedIn example; about 85% of the 38,051 lines | data only, 1 PR |
| T2 tiers | B, the rest of F, G, the duplicate after-graduation card | engine 0.10.0, UI reads `item.text` |
| T3 deadlines and lead time | C, D, the finance queue problem, and §7 (L1, L4, L6, L7) | engine 0.11.0 |
| T4 inputs | H: blank-slate seniors, last-semester overload | intake change, research for coursework mappings |

T1 is the fastest win: most of what students see is fixed without touching the engine. T2 and T3 stop the problem from coming back. T4 makes the plan fit the student.

## 7. Goals started too late to finish or to matter (second audit)

The thesis case generalises: a goal can be allowed by its window, but by the time it lands it can't be finished before graduation, or the thing it prepares for has already happened. `npm run audit:lead-time` (`scripts/lead-time-audit.ts`) looks for this across:

- every major, campus and career path, including paths chosen from "show all";
- years 1–4 × fall, spring and summer;
- four experience profiles per year: none, typical for the year, typical plus random extras, typical plus research;
- 5 h a week to "after graduation", and 15 h a week to graduation.

That is **118,272 plans**.

**Result:** 42,675 plans hold a goal like this, and **18,564 have one in the semester the student is in now**. Senior fall is the worst: 9,123 of 9,856.

### Findings, read as the student

| Rule | Goal | What the student sees | Plans (this term) |
|---|---|---|---|
| L1 starts too late | `e-thesis` | A sophomore's plan puts the whole thesis in senior spring; a senior with research experience gets it in their last semester | 721 (82) |
| L1 | `e-field-placement` | "Complete your BSW field placement" starting in the last semester; the placement runs across the final year | 3,318 (784) |
| L1 | `a-packaging-certificate` | A first-year's plan adds the certificate in senior fall: one semester for three courses | 1,067 (601) |
| L1 | `s-lab-techniques` | "Learn core lab techniques in a research lab" in the last semester | 180 (100) |
| L4 prepares for something already done | `n-career-fair-first`, `ap-early-programs`, `ap-internship-early` | A student who has already done a target internship is told to "Attend your first career fair (to look, not to land)" and to apply to first- and second-year programs | about 4,450 each (up to 1,752) |
| L4 | `f-explore-careers` | "Research 3 careers on O*NET and BLS" in senior fall, next to the full-time job search for a career they've already chosen | 9,743 (4,866) |
| L6 "Up next" that can't happen | `f-aid-check`, `a-fellowship-advising`, `f-explore-careers`, `f-ces-advisor`, `s-lab-techniques`, `e-thesis` | Senior fall: "Next in line: it moves into your plan as you finish goals". The only term it could move into is the last one, too late to pay off | 9,460 (all this term) |
| L6 | `ap-internship-target`, `ap-research-apps` | Junior spring: applications for "junior summer" queued as next. The next term is that summer | 3,063 |
| L7 needs a program the student isn't in | `e-field-placement` | A psychology major on the suggested social-work path is told to complete a BSW field placement, which only BSW majors can do | 288 suggested, 3,744 from "show all" |
| L7 | `a-nclex-prep`, `e-nursing-externship`, `e-pharmacy-intern`, `c-fe`, `a-residency-plan` | A CS major who picks the nursing or pharmacy path from "show all" is told to prepare for the NCLEX or work as a licensed pharmacy intern | 16,316 from "show all" |
| L5 after graduation | `a-grad-list`, `a-letters`, `a-personal-statement` | Grad-school groundwork placed after graduation. Fine for someone applying after a gap year, but the plan never asks, so it can't say so | 3,580 (0) |

**Checked, and not a problem today:**

- applications for a summer after graduation (L2);
- student-only goals after graduation (L3);
- co-ops that end at graduation (L8).

The windows already prevent these. A co-op over junior summer and senior fall is a normal pattern, so it isn't flagged.

### Why

1. **A window says when a goal may start, not whether it can finish.** `latest` is the last term the goal may be placed. `lateOk` goals can go past it. Neither knows how many semesters the goal needs, or how many the student has left.
2. **"Prepares for" isn't data.** The prerequisite graph says what must come *before* a goal, not what makes a goal *pointless* once it's done. A practice fair still shows after a real internship.
3. **A major restriction can be overridden.** A career path's weights can pull in a goal restricted to another major. That's right for skills anyone can learn (CAD, Python), and wrong for things that need enrollment in the program (BSW placement, NCLEX, pharmacy internship).
4. **The queue doesn't check the future.** "Next in line" doesn't ask whether the next term could still hold the goal.
5. **No gap-year answer.** Applying to grad school this cycle or after a year changes what the final semesters should hold, and the intake doesn't ask.

### Plan

**New data on `Goal`:**

| Field | Meaning | Example |
|---|---|---|
| `minTermsLeft` | Fall/spring terms that must remain, counting the start term | thesis 2, field placement 2, packaging certificate 3, research assistant 2, officer role 2, study abroad 2 |
| `supersededBy` | Goals that make this one pointless once done or underway | practice fair and first-/second-year programs: target internship, job search; exploring careers: job search (except the "still exploring" path) |
| `majorRule` | `"only"` (needs enrollment in the program; never overridden) or `"default"` (today's behaviour: a path may pull it in) | `e-field-placement`, `a-nclex-prep`, `e-nursing-externship`, `e-pharmacy-intern`, `c-fe`, `a-residency-plan` → `"only"` |
| `alternative` | A goal to offer when this one can't start in time | `e-thesis` → a new one-semester "research project with a professor" goal |

**New input:** `gradApps: "this-cycle" | "after-gap" | "not-sure"`. Asked only on grad-school paths, it decides whether letters and statements belong before or after graduation.

**Engine (0.11.0, with the deadlines in T3):**

- **Starting:** placement refuses a start where fewer than `minTermsLeft` school terms remain. The goal goes to the hidden "past" queue, and `alternative` takes its place if there is one.
- **Superseded goals:** a goal whose `supersededBy` goal is done or placed earlier is dropped (kind "past").
- **Major rules:** a `majorRule: "only"` goal is never pulled into another major's plan. The career-path page says the path needs that program ("Social work practice needs the BSW for the field placement").
- **The queue:** "Up next" includes a goal only if the next term would still satisfy its window, `minTermsLeft` and its application cycle.
- **Grad-school groundwork:** placed before graduation for "this-cycle", and after graduation with after-graduation wording for "after-gap".

**Tests first:**

- each L rule becomes an invariant in `test/engine.test.ts`, with the cases above as fixtures, written to fail before the engine change;
- `audit:lead-time` joins CI with every count at 0, except L5 for "after-gap" students.

