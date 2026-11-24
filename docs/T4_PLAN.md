# T4: plans that fit what the student already has (2026-11-24)

Phase T4 of `docs/TIMING_AUDIT.md`. Three problems, each weighed as a user and as a developer, then the choice.

## What was measured

Junior and senior plans for every major and suggested path, fall and spring, at 5 h a week (376 students). Each was built twice: with nothing ticked, and with a typical upper-year checklist (resume, Handshake, LinkedIn, club, job, career fair).

- **Catch-ups this semester:** 367 of 376 plans put early-college catch-ups (timing `late` or `last-chance`) in the semester the student is in now. The typical checklist didn't lower this, because it doesn't cover the 30-second pitch, the mock interview, joining clubs, or faculty relationships.
- **Most common catch-ups**, with nothing ticked:
  - write your resume: 292 plans;
  - 30-second pitch: 183;
  - LinkedIn: 171;
  - mock interview: 154;
  - join organizations: 151.
- **Final semester:** it holds 5.2 goals on average, and 166 of 188 final-semester plans hold more than 3.

## 1. The plan doesn't know what the student already has

| Option | For the student | For the developer |
|---|---|---|
| **A. Infer from coursework.** Major + year → required courses (`data/requirements.json`) → skills | No effort. But it would be wrong often: Rutgers' intro CS course is taught in Java, so "CS year 2 knows Python" is false; transfers, AP credit and late-declared majors break it; a wrong "done" silently removes a goal | Needs a sourced course → skill mapping for 44 major-campus pages, redone every catalog year. Course titles don't name tools, so most mappings would be guesses, against "never invent" |
| **B. Ask more in the intake.** A required "Do you already have these?" for years 3+ | Accurate, but makes the intake longer before the student has seen any value, and asks about things their plan may not even include | Small: one more screen, one more answer to store and share |
| **C. Ask on the plan, about the plan.** A short "Already done?" card at the top of this semester, listing only the catch-ups the plan actually put there, each a one-tap toggle, then "Update my plan" | Asks only about what's in front of them, after they've seen the plan. One tap per item. Undo is the existing "done" list. Works the same for transfers | Reuses `completedGoals`, `markDone` and the engine's `timing` from T2. No new data to source or maintain |

**Choice: C.** It is the only option that is both accurate and short. The intake checklists stay as they are; C catches what they miss. A is rejected until course descriptions (not titles) can be sourced per course.

## 2. The final semester is overloaded

| Option | For the student | For the developer |
|---|---|---|
| A. Leave the per-term cap as it is (3–6 by hours) | Five or six goals in the last semester, next to the job search | Nothing to do |
| **B. A final-semester cap of 3**, plus must-dos and the steps they need now; the outcome (job search or applications) is already first since engine 0.10.0 | A short last semester: the outcome plus the three most important other things. The rest waits in "Up next", where it can still be added | One constant, one condition in the scheduler, a baseline re-record |
| C. Drop all catch-ups from the final semester | Cleaner, but would also drop catch-ups the plan needs (a resume before the job search) | Needs exceptions for prerequisites, so it becomes B with extra rules |

**Choice: B.** It's simple, predictable, and keeps what the outcome needs.

## 3. Graduating later than four years

Fifth-year, co-op and transfer students currently answer "Fifth year or later", which plans as the final semester, or they answer their year and get a four-year runway.

| Option | For the student | For the developer |
|---|---|---|
| A. Extend the term grid to a fifth year (5F, 5S) | The most exact | Every goal window, track override, the year maths, PDF and map layouts, share links and the baseline change. High risk for a minority of students |
| **B. "When do you expect to graduate?": at the end of your fourth year / a year later.** The engine plans on the year that matches the runway left, and labels terms with the student's real year | A third-year graduating a year later gets two years of runway, labelled "Year 3", "Year 4", "Year 5". December graduations aren't covered; they keep the part-time note's advice to plan by credits with an advisor | Small: one input, a year offset applied in the engine, and labels and yearly-round names shifted back. The UI already takes semester labels from the plan |
| C. Keep today's behaviour | Fifth-year and delayed students get a plan that ends a year early | Nothing to do |

**Choice: B,** asked from year 2 on (a first-year's four-year grid can't hold a fifth year), on the "Where are you in school?" screen, and carried in the share link and the review.

## Build order

1. **Engine 0.13.0, tests first:**
   - `graduation: "on-time" | "year-later"` (year offset, real-year labels);
   - final-semester cap of 3.
2. **UI, tests first:**
   - the graduation question;
   - the "Already done?" card (`markDoneMany`).
3. **Re-measure:** the numbers above, before and after.

## Result (engine 0.13.0, data 2026.11.24-2)

- **Graduation.** "When do you expect to graduate?" is on the "Where are you in school?" screen from year 2 on, preset to the usual four years. "A year later" plans the right runway, labelled "Year 3" to "Year 5", and is carried in the review and the share link.
- **"Already done?" card.** On the Plan tab, right after "Do this now", for any semester with catch-ups. Putting it after rather than above keeps "Do this now" on a phone's first screen; the browser test for phones caught this.
  - Each catch-up is a toggle. "Update my plan" marks the picked ones done in one re-plan, and "Hide" dismisses the card for that semester.
  - For a senior in their last spring, it lists exactly the quick steps that crowd that semester: resume, 30-second pitch and mock interview, which sit next to the job search in 68–74 of 94 plans.
- **Final semester.** At most 3 goals besides must-dos.
  - In the 336 stored plans, 206 change, all in the final semester. Lower-priority items move to "Up next": a part-time job, public speaking, LinkedIn networking, volunteering, and the year's resume refresh. No plan loses its job search or applications.
  - In a senior's own last spring, other goals already averaged 2.0. What fills that semester is the job search and its quick steps, which the card clears for students who've done them.
- **Coursework inference** was not built, for the reasons in §1.
- **Tests:** `test/fit.test.ts`, the card's tests in `results.test.tsx`, intake and share-link tests, and `markDoneMany`.
