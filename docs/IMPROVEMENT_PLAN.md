# Improvement plan: findings from student simulations (2026-11-22)

## How this was tested

1. **Engine sweep: 1,204 plans.**
   - Every school: New Brunswick, Newark, Camden, and "another school".
   - Every major offered there, and every career path suggested for that major.
   - Two stages: first-year fall (first semester) and junior spring.
   - Two experience levels:
     - **None.**
     - **Decent.** A first-year has a resume, LinkedIn, a club, a job, volunteering and two skills. A junior also has leadership, an internship, career fairs, informational interviews and recommenders, plus major-specific skills.
2. **Browser walkthrough, phone and desktop.**
   - The full intake from the landing page.
   - Results pages for five students:
     - A: New Brunswick CS first-year, no experience.
     - B: Camden psychology junior, decent experience.
     - C: Newark nursing junior, no experience.
     - D: non-Rutgers finance first-year, no experience.
     - E: New Brunswick finance junior, no experience.
3. **Readability audit.** Contrast for every colour pair in use, type sizes, and page lengths.

## What a student would say (the short version)

- *"It's a lot, and it all looks the same."*
  - The Plan tab is 4,400–5,500 px on desktop and 5,300–6,900 px on a phone.
  - All text is one blue at a 4.54:1 contrast ratio, just over the 4.5 minimum.
  - Headings, facts, links, warnings and must-dos differ only by size, so nothing pulls the eye to "do this now".
- *"Where do I actually go?"*
  - The whole Plan tab has at most one outbound link, the official major requirements.
  - Programs and offices are one click into a goal and then a second tab ("Where to go").
  - Recruiter sources sit at the bottom of the Map tab.
  - A New Brunswick student opening "Write your resume" sees five steps and no link until they switch tabs.
- *"This doesn't know where I am."*
  - **Late juniors get first-year catch-up.** A junior in spring with no experience gets resume, LinkedIn and "join 1–2 organizations" as this semester's priorities. For investment banking and accounting, the junior-summer internship moves to the "when you have more time" queue. Nothing says plainly that the main recruiting window has passed and what to do instead.
  - **The full-time job search is late.** It lands in year 4 spring, but most full-time recruiting runs in senior fall.
  - **Junior pre-med gets no honest guidance.** The medical school application sits in the queue, and there's no straight talk about a gap year.
  - **The nursing externship has no application step.** It's planned for the summer, but nothing in junior spring says to apply, though applications run January to March.
- *"I told it what I've done and it barely changed."*
  - Decent and no experience produce nearly the same plan size: 25.6 vs 26.1 goals on average.
  - 293 decent-experience first-years still get "Build a complete LinkedIn profile" in their first semester after saying they have one, with nothing like "finish what you started".
  - The page never echoes the student's experience back except in "What you have".
- *"I'm not at Rutgers, so half of this is empty."*
  - Non-Rutgers students average 9.9 goals with no resource at all (Rutgers students: 4.5).
  - "Write your first college resume" has no link for any of them (181 of 188 first-year runs).
  - "Meet a career advisor" and "Join organizations" have nothing either.
  - There's no requirements section and nothing in its place.
- **Goals that never have a link, even at Rutgers** (out of 1,204 plans):
  - Take an officer role: 1,185 plans.
  - 30-second introduction: 935.
  - Faculty relationships: 843.
  - Research assistant: 491.
  - Shadowing: 414.
- **Small irritations:**
  - On phone, the header (title, river, four buttons) fills the first screen.
  - Resource cards repeat filler ("Use the contact or apply page on the home site").
  - The 13 px mono fact lines are hard to read.
  - One campus row and one checkbox row render indented on phone.

## Plan

Effort is S (≤ ½ day), M (1–2 days) or L (3+ days). Each phase ends with a check the simulation can run, so we know it worked.

### Phase 1: Tell students the truth about timing (engine + data). M–L

| # | Change | Fixes | Check |
|---|---|---|---|
| 1.1 | **"Where you stand" message for late starters.** When a student is past a track's main recruiting window (for example, a junior in spring for investment banking, Big 4 or big tech), the top of the plan says so in one sentence. It then lists what still works now: off-cycle and smaller-firm internships, research, a relevant summer job, and targeting senior-fall full-time recruiting. | Junior IB and accounting show no window-passed message | Every spring-junior job-track plan has a "where you stand" line |
| 1.2 | **Move the full-time job search to senior fall** (it may continue into spring) for job-outcome tracks, and protect it as a must-do there. | Job search in year 4 spring | No job-track plan puts its first job-search step after year 4 fall |
| 1.3 | **Application steps before experiences.** Every summer experience with a known deadline gets an "apply" step in the term before: nursing externship (Jan–Mar), research programs, co-ops, internships. | Nursing externship with no application | Any summer experience in the plan has its application in the prior term |
| 1.4 | **Honest pre-med and pre-law timing for juniors.** If the MCAT or LSAT plus the application can't fit before the cycle, say "most students in your position apply next cycle (a gap year is common)" and plan that path. | Med-school application stuck in the queue | Junior pre-med plans name the cycle they're aiming at |
| 1.5 | **Catch-up goals rank below urgent ones for upper-years**, but stay in the plan. A junior's resume can share the term; it shouldn't lead it ahead of the application it serves. Order by "unlocks something due soon". | Resume, LinkedIn and join-orgs lead junior plans | Junior term 1 always contains the track's most urgent step |
| 1.6 | **Remove off-track filler.** For example, "Work as a research assistant" in an investment banking or accounting senior year. Only goals whose weight comes from the track, or that unlock a must-do, can fill the last terms. | Filler in senior terms | No goal below "Worth doing" in a final-year term unless it unlocks a must-do |

### Phase 2: Make direction and sources impossible to miss. M

| # | Change | Fixes |
|---|---|---|
| 2.1 | **Links inline on the Plan tab.** Each "This semester" row shows its best one or two places by name, linked ("Rutgers Career Exploration and Success: resume reviews ->"). Opening the goal is for the full detail. | One outbound link on the whole Plan tab |
| 2.2 | **Drawer opens to one scroll, not two tabs.** "What to do" steps, then "Where to go" right under them. Each step that names a place links it ("Get it reviewed at your career center" links to that campus's career center). | No link visible on the resume goal |
| 2.3 | **A "Why this order" link at the top of the plan,** showing the recruiter focus sentence and its sources. It moves out of the bottom of the Map tab. | Sources hard to find |
| 2.4 | **Fill the goals that never have a resource,** with real, checked pages only: officer role (campus student-involvement offices), 30-second introduction (career center guides), faculty relationships and research assistant (Aresty and the Newark and Camden research offices, plus faculty office-hour guides), shadowing (AAMC, the pre-health offices). Validator rule: every goal that can reach a plan has at least one resource per campus, or a national one. | Goals with no link, even at Rutgers |
| 2.5 | **Resource cards: cut the filler, lead with what to do.** "Who it's for · when to apply · cost/pay" on one line, then a single clear action. Drop "Use the contact or apply page on the home site". | Wordy, uniform cards |
| 2.6 | **Each step that has a guide shows its source** in small text ("from MIT CAPD"), so students can see the advice is sourced. | "Is this made up?" |

### Phase 3: Readability: change the design rules. M

Proposed rule changes for design/DESIGN.md (the palette stays; the colours just get jobs):

1. **Add one text colour: ink `#1A1F24`.**
   - Body text in ink: 13.1:1 on sage, against 4.54 for blue today.
   - Blue is kept for headings, links and buttons, so **blue means "you can act on this"**.
   - This is the "and black perhaps" you allowed earlier.
2. **Sand becomes the attention fill.**
   - Notices, "where you stand" and "due this semester" sit on a sand panel with ink text (9.2:1).
   - Sand stays out of text, where it's only 1.4:1 on sage.
3. **Green becomes "done and on track".**
   - Green fills with ink text (5.2:1), for ticks, done goals and the on-track counter.
   - Green is never used as text on sage (2.5:1).
4. **Type floor.**
   - No text under 15 px.
   - Mono only for numbers, codes and dates, never for sentences.
   - Fact lines move from 13 px mono to 15 px Plex Mono, numbers only.
5. **One "now" card per screen.** The top of the Plan tab becomes a single card:
   - where you stand (one line);
   - this semester's must-do;
   - its first step;
   - the place to go (linked).
   - Everything else is below the fold or behind "See the full plan".
6. **Compact results header on phone.** Title and summary, then the river as a thin band, with actions in one row (PDF, Share, Edit; "Start over" moves into Edit). Target: "This semester" visible within the first screen on a phone.
7. **Fix the indented rows** (campus radio, checkbox rows) caused by pressed and hover transforms on phone.

Check: an automated contrast test fails on any text pair under 7:1 (under 4.5:1 for large headings), and a phone screenshot test asserts "This semester" sits above the fold.

### Phase 4: A shorter, clearer page. M

| # | Change |
|---|---|
| 4.1 | **Collapse the Plan tab into three blocks:** Now (the card above), This semester, and Your path (milestones plus "Coming up" folded by year). Move "What you have / need" into Your path, and "Skills picture" into the Map tab only. Target: Plan tab under 3,000 px on desktop. |
| 4.2 | **"On track to graduate" gets its own tab ("Courses")** next to Plan, Map and Resources, with a one-line summary on Plan ("3 of 9 earlier requirements ticked -> Courses"). |
| 4.3 | **Resources tab defaults to "For this semester"** (8–12 cards), with "All 130" one tap away. |
| 4.4 | **Draft banner gets shorter:** one line plus two buttons. The explanation moves behind "How does this work?". |

### Phase 5: Make experience count. M

| # | Change |
|---|---|
| 5.1 | **Partly-done goals say so:** "Finish your LinkedIn (you've started)", with the remaining steps only. The engine already tracks strength below 1; the site should use it. |
| 5.2 | **Plans scale with experience.** A decent-experience junior should see fewer foundation goals and more advanced ones. The sweep target: decent plans have at least 20% fewer foundation goals than no-experience plans. |
| 5.3 | **"What you have" links to what it unlocked:** "You have an internship -> you can skip X; aim for Y". |
| 5.4 | **Intake:** add "Roughly how much experience do you have?" (none / some / a lot) as a quick shortcut before the long checklist, so students who skip the checklist still get a fitting plan. |

### Phase 6: A real path for non-Rutgers students. M

| # | Change |
|---|---|
| 6.1 | **National fallbacks for every foundation goal:** resume (national guides already in data), career advisor ("find your school's career center: search '<your school> career services'", plus Handshake), organizations, research, shadowing. Validator rule: every goal has at least one non-Rutgers resource. |
| 6.2 | **Replace "On track to graduate" with "Check your degree audit":** what a degree audit is, and the three things to look for (major courses, gen eds, credits by year), with a link pattern to find their catalog. |
| 6.3 | **Say up front what changes:** "Not at Rutgers: you'll see national and New Jersey programs. Your school's offices aren't listed, so here's how to find them." |

### Phase 7: Keep it honest over time. S–M

| # | Change |
|---|---|
| 7.1 | **Add these simulations to CI** (scripts/simulate.ts) as rules R27–R33 (one per check above), so regressions fail the build. |
| 7.2 | **Catalog watch:** a monthly check that flags when Rutgers' 2025–26 catalogs serve readable pages again, so the requirements can move to the newest edition. |
| 7.3 | **A small "Is this right for you?" feedback link,** opening a pre-filled email to the site owner, with no tracking. Optional. |

## Suggested order

1. **Phase 3 + 2.1–2.3 (one PR):** readability and visible links. This is the biggest felt change, and mostly CSS and layout. **Done 2026-11-23**, with Courses as its own tab (decision 2). Item 3.5's "where you stand" line is a plain count for now; Phase 1 makes it the blunt, first-things-first message (decision 4).
   **Visual refresh, 2026-11-23** (docs/VISUAL_REFRESH.md): Barlow Semi Condensed for bold headings and labels, section rules, the status strip with an hours control, time in words, the big picture after the work, a quieter "Good to know", resource cards without filler, filters folded on phones, and the Courses counter first.
2. **Phase 1:** timing honesty. Engine work, test-first, engine 0.10.0.
3. **Phase 4:** a shorter page, built on the new design rules. **Done 2026-11-24.**
   - **4.1:** the Plan tab is three blocks: Now, This semester, and Your path. Your path holds the milestones, the later semesters folded by year, "When you have more time" folded, and "What you have and what you need" folded. Desktop height for students A, B and E: 4,598 / 3,889 / 3,903 px → 3,059 / 2,763 / 2,884 px. On a phone: 5,470 / 5,087 / 4,747 → 3,470 / 3,308 / 3,336.
   - **4.2:** done earlier, with the Courses tab.
   - **4.3:** the Resources tab opens on "This semester" (13–16 cards; "Whole plan" one tap away), with a "When" row visible on phones too. It was 37–42 cards and 10,500–12,000 px; now 4,500–5,000 px on desktop.
   - **4.4:** the draft notice was already one line, with "Review on the Map tab", since the visual refresh.
4. **Phases 2.4–2.6 + 6:** filling resource gaps and the non-Rutgers path. **Done 2026-11-24** (engine 0.15.0, data 2026.11.24-4).
   - **2.4:** 13 new entries, each a page that came up in web searches on 2026-11-24 (`search-confirmed`; the weekly link check confirms or flags them):
     - volunteer offices at New Brunswick and Newark (two);
     - Rutgers Formula Racing;
     - Idealist volunteer search;
     - the Department of Labor's professional association search;
     - Red Cross BLS classes;
     - six how-to guides: student organizations (Penn State Smeal, Montana State), honors theses (UNC), GitHub Pages, a writing portfolio, case competitions (Yale SOM).
     Five resources were tagged for fewer majors than can use them (Formula SAE, MATLAB Onramp, Lean Six Sigma, IOPP AmeriStar, Rutgers Formula Racing) and now list them. Planned items with no link or guide went from 119 / 82 / 25 / 523 (New Brunswick / Newark / Camden / another school) to 0.
   - **Validator rules:** every goal has a resource or guide outside Rutgers (6.1), something usable at each campus (2.4), or one of two fields:
     - `findOnCampus`: what to look for at the student's own school, where no national page can stand in (a fellowships office, student media, a degree's field placement). The drawer and PDF say "At your school: look for …". After the new resources, it is the only help for 9 items across the 414 Rutgers plans and 35 across the 188 other-school plans.
     - `needsProgram`: a specific program, planned only for students who can enroll. The packaging certificate no longer reaches packaging majors or students at another school.
     `test/coverage.test.ts` checks every planned item at every school.
   - **2.5:** the filler line was already gone (visual refresh). The card's one action now sits right under what the resource is, before who it's for.
   - **2.6:** a goal with how-to guides says under its steps "Based on guides from MIT CAPD." (the source is the guide's name before the colon).
   - **6.2:** the Courses tab is always there. Without a course list (another school), it is "Check your degree audit": what an audit is, three things to look for, and how to find the right catalog year. Nothing is linked, since the right pages are on the student's own school's site.
   - **6.3:** "Another school" says under the option what changes, and the plan opens with the same note in "Good to know".
5. **Phase 5:** experience-aware plans. **Done 2026-11-24** (engine 0.14.0, data 2026.11.24-3).
   - **5.1:** a goal the student has partly done carries `started` (its share done). The row says "started, about 60% done", and that share of its steps starts checked (the student's own ticks win), so "Do this now" moves past them.
   - **5.2:** answers now credit what they imply, as partial strengths in `data/intake.json`:
     - an internship: a resume, interview practice, Handshake, and a pitch;
     - a job: interview practice;
     - a career fair: a pitch, Handshake, and a resume;
     - informational interviews: LinkedIn setup and networking, and a pitch;
     - leading a group: public speaking.
     A goal with less than an hour left counts as done. Juniors with decent experience get 6.1 → 3.7 foundation goals (39% fewer). First-years get fewer foundation goals and more advanced ones over the whole plan (12.5 vs 13.3, 26.3 vs 24.8), but not 20% fewer. Their foundation goals are mostly what any first-year needs whatever they've done (a FAFSA every year, an advisor, career research), so the 20% target applies to juniors (`test/experience.test.ts`).
   - **5.3:** "What you have" says what each answer counts for ("Counts for: Write your first college resume").
   - **5.4 (not built):** a "roughly how much experience?" shortcut would have to guess which boxes to tick. The "Already done?" card (T4) asks about the plan's actual goals instead, with no guessing.
6. **Phase 7:** alongside each of the above. **Done 2026-11-24.**
   - **7.1:** `scripts/simulate.ts` has rules R27–R33, which fail CI:
     - R27: the job search starts in senior fall unless the term was all must-dos;
     - R28: an experience comes after its application;
     - R29: at most 3 goals in the final semester besides must-dos;
     - R30: nothing starts with too few semesters left;
     - R31: no application while its round is closed;
     - R32: started goals are marked, and finished goals never come back;
     - R33: no timing text that has passed.

     They found two things, both fixed. "Needed before" named a goal whose time had passed for the student, by its old title. R27 at first flagged seniors with 2 h a week, where senior fall is all prep; it now flags only when other goals took the room.
   - **7.2:** the weekly link check (`scripts/check-links.mjs`) also checks the 34 catalog pages behind the course lists, report only (`--catalogs-only` runs just those). All 34 load. Rutgers' 2026–27 catalogs are readable, so the original "watch for 2025–26" goal no longer applies.
   - **7.3 (built 2026-11-24):** "Is this plan right for you? Email feedback" at the foot of the results page (`src/app/feedback/`).
     - It opens a pre-filled email in the student's own mail app, to the support address. The site sends nothing and stores no address.
     - The message has three prompts, including "Your email, so we can reply (required):", plus the dataset and engine versions. None of the student's answers are in it.
     - Rate limit: one every 10 minutes and 3 a day, kept in this browser (the site is static, so there is no server to limit at). Past the limit, it says when to try again.

## Decisions for you

1. **The design rules:** adding the ink text colour (3.1) and the 15 px type floor (3.4). These change the look the most.
2. **The tabs:** whether "Courses" becomes its own tab (4.2), or stays a section on Plan.
3. **The intake:** whether to add the quick experience question (5.4). It adds one screen to the intake.
4. **Phase 1 wording:** how blunt the "where you stand" message should be for late starters.
