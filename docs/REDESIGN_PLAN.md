# Results redesign and year-aware planning: plan

Status: plan for engine 0.8.0 and data 2026.11.16-7. Written before any code changes, from 260 simulations and a read-through of plans as a student with no direction.

## 1. How the issues were found

`scripts/simulate.ts` runs 4 students for every major at every school: 21 majors at New Brunswick, 11 at Newark, 12 at Camden, and 21 at "another school", for 260 plans. Each student is different (year, date in the calendar, hours, summers, horizon, track, enrollment, location, citizenship, identity answers, experience). Every plan is checked against rules. Four plans were also read in full, start to finish, as a confused first-time user would.

## 2. Issues, one by one

### From the simulations (1,582 hits, 7 kinds)

| # | Rule | Hits | Example |
|---|---|---|---|
| 1 | Too many goals in one term (R14) | 659 | A first-year with 5 h/week gets 14 goals in their first fall; a nursing sophomore with 10 h/week gets 20 in one spring |
| 2 | A planned goal is also listed in "Up next" (R15) | 324 | "Run your full-time job search" is in fall and spring and also "next in line" |
| 3 | Earlier-year goals shown to upper-year students (R13) | 318 | A senior sees "Apply to 30+ target internships for junior summer" under "Not in this plan" |
| 4 | Guides written for another year (R5) | 192 | Juniors and seniors get "MIT CAPD: How first-years can thrive at career fairs" and the first-year resume guide |
| 5 | "Essential … next in line" notice for a goal that is already in the plan (R18) | 46 | NCLEX prep is scheduled in senior year but the notice says it's waiting |
| 6 | The same goal twice in "Up next" (R16) | 37 | "Apply to 5 outside scholarships" appears twice (two yearly rounds with the same title) |
| 7 | A recruiting notice for an earlier year (R17) | 6 | A senior is told "Banks recruit for junior summer as early as sophomore winter–spring" |

The specific senior case reported ("Apply to 30+ target internships for junior summer … Next in line") was fixed in engine 0.7.0 (it's now "not now"), but issue 3 shows it still appears in the "Not in this plan" list, which reads as "you missed this".

### From reading plans as a directionless student

8. **The year question has no semester.** "Third year" doesn't say whether the student is starting the year or finishing it, which changes the whole map. Today the engine guesses from the calendar, which is wrong for students off the usual cycle.
9. **No gender question, and few gender-related programs.** There are women's programs for computing, engineering, business, and politics, but none for medicine, nursing (men in nursing), law, cybersecurity, packaging, supply chain, the sciences, or criminal justice, and nothing for non-binary students.
10. **The results page asks the student to read before it tells them anything.** A long summary line, a disclaimer, then "Start here", "This term", notices, a chart with a view switch, a skills chart, "Up next", a closed "Not in this plan", plus a second tab for resources and a drawer for every goal. That's tabs within tabs and lists within lists.
11. **It never says where the student is going.** The track name appears in a summary line, but there's no "your goal is a co-op / internship / fellowship / grad school / first job, and here's the path".
12. **It never says what the student already has.** Their intake answers (resume, LinkedIn, skills) disappear; the page only lists what's left, which feels like "you haven't done enough".
13. **"Up next" is at the bottom and reads like leftovers**, though it holds the field's expected milestones (the internship, the job search).
14. **Wording.** "Sized to your N free hours a week", "Nothing here is overdue", "Lower priority for your time frame; add it if you have time" (repeated 16–22 times), track names in every reason. Too many words, and some feel like judgments.

## 3. What the site has, and what it needs

### What it has now
- One question per screen intake (campus, major, year, enrollment, goal, time frame, experience, skills, certifications, hours, summers, co-op, location, citizenship, identity)
- An engine that schedules goals by priority, time, and prerequisites, with steps, "done when", guides, and campus-aware resources
- A results page: Start here, This term (3 goals), notices, roadmap chart or list, competency chart, Up next, Not in this plan, Resources tab, goal drawer, PDF

### What it needs
- **Intake:** year *and* semester in one question; an optional gender question that only adds programs, like identity
- **Data:** gender-related programs for every field; guides tagged by year, with junior and senior versions; recruiting notes tagged by year
- **Engine:** a cap on goals per term (baby steps); started goals that run past the plan shown as "continues" instead of "next"; earlier-stage goals hidden instead of "not now"; notices only when true for the student's year and plan; distinct titles for yearly rounds
- **Results page:** one calm, top-to-bottom plan:
  1. **Your goal:** the outcome the student picked (internship, co-op, fellowship, grad school, first job) and the 3–5 milestones on the way
  2. **What you have:** their own answers, shown as strengths
  3. **What you need:** the few things that matter most for that goal, with when
  4. **This semester:** one first step, then up to three goals
  5. **Coming up:** the next semesters, each with a few goals, and "when you have more time" right there instead of at the bottom
  6. Resources and the full map one click away, not as tabs inside the plan

## 4. Principles behind the design

- **Choice overload and Hick's law:** decision time grows with the number of options. Show 3–5 things per decision point and group the rest ([UX Psychology](https://uxpsychology.substack.com/p/lost-in-navigation-overcoming-the)).
- **Progressive disclosure:** show the primary options by default and defer the rest to a secondary screen, but never hide what people need to decide ([Nielsen Norman Group](https://www.nngroup.com/videos/progressive-disclosure/)).
- **Goal gradient:** people speed up as a goal feels closer, and pre-filled progress helps ([Kivetz, Urminsky, and Zheng, via Columbia Business School](https://business.columbia.edu/insights/chazen-global-insights/goal-gradient-hypothesis-resurrected-purchase-acceleration)). Showing "what you have" as progress toward the goal is the honest version of the pre-filled stamp card.
- **Strengths-based framing and mastery:** students who focus on strengths report more competence and effort than those who focus on shortcomings; small wins build self-efficacy ([Springer, Motivation and Emotion](https://link.springer.com/doi/10.1007/s11031-015-9488-8); [SERC on Bandura](https://serc.carleton.edu/20538)).

## 5. Plan, in order

| Step | Work | Done when |
|---|---|---|
| 1 | Audit: `scripts/simulate.ts` with rules R0–R18 | Issue list above |
| 2 | Data: semester options, gender question and identity tags (`men`, `nonbinary`), gender-related programs, year-tagged guides with junior/senior versions, year-tagged recruiting notes | Validator and data tests pass |
| 3 | Engine 0.8.0, test-first: semester input, per-term goal cap, `continues` and `past` queue kinds, true-only notices, distinct yearly titles, year-aware recruiting notes | Engine tests pass; simulations show 0 issues |
| 4 | Results page: Your goal → What you have → What you need → This semester → Coming up; resources and map as secondary views; shorter wording | UI tests, e2e, axe clean |
| 5 | PDF in the same order | PDF test |
| 6 | Docs (ALGORITHM.md, README), re-record the NB baseline, link check, PR | CI green, links checked |

The simulation audit runs in CI from now on (`npm run simulate`), so any future data or engine change that reintroduces these issues fails the build.
