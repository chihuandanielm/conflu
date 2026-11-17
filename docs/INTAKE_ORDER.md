# Intake order: grouped screens

Status: done (Nov 2026). This replaces the one-question-per-screen order in `docs/BUILD_PROMPT.md` §5. Only grouping and order changed. The questions, options, answers, share links and planning engine are the same.

## 1. The problem

The intake had 17–18 screens, one question each. Several were a single tap (status, full/part-time, summers, location). The question students care most about, "Where do you want to end up?", came sixth, after a run of paperwork.

A second problem: when a required answer was empty, Continue and "Build my plan" were greyed out with no reason given.

## 2. The order

| # | Screen | Questions | Moves on by itself |
|---|---|---|---|
| — | Intro | "I'm a college student, start" answers the old status question | — |
| 1 | What do you study? | campus, major | after the major |
| 2 | Where do you want to end up? | goal | yes |
| 3 | How soon do you want to get there? | time frame | yes |
| 4 | Where are you in school? | year and semester, full-time or part-time | after full/part-time |
| 5 | What have you already done? | experience | no (multi-select) |
| 6 | What can you already do? | skills, certifications (optional) | no (multi-select) |
| 7 | How much time do you have? | hours outside class, summers, co-op (co-op majors only) | after summers (or co-op) |
| 8 | About you (optional) | location, citizenship, gender, about you | no; Continue reads "Skip these" until something is picked |
| — | Check your answers | every answer, with Edit / Answer | — |

A screen moves on by itself only when the student picks the **last required question** on it and nothing required is missing. Picking an earlier question (the campus, the year) never jumps away. An optional screen never moves on by itself. Number keys pick options only on screens with one list of options. With two lists, "2" would be ambiguous.

Older saved progress (one step per question) resumes on the screen that now asks that question (`screenOf` in `src/app/intake/model.ts`).

## 3. Why this order

- **Lead with what matters to the student.** Questions about their own major and goal hold attention better than logistics. A goal picked early also makes the later questions feel purposeful: they're about *their* path.
- **Small yeses first** (foot in the door). Each screen is quick, and commitment builds before anything personal is asked.
- **Strengths before limits.** "What you've done" and "what you can do" come before "how much time you have", so students reach the limits feeling capable rather than short on time. This matches the strengths-first results page (`docs/REDESIGN_PLAN.md` §4).
- **Personal questions last.** Survey practice puts personal questions at the end, once the student is invested. They're all optional and share one screen, so skipping them takes one tap.
- **Fewer, related choices per screen** (Hick's law, chunking). Each screen groups questions the student already thinks of together: where they study; where they are in school; their time.
- **Shorter visible progress.** "3 of 8" feels closer to done than "3 of 17" (goal gradient).

## 4. Missing answers are marked, never greyed out

- Continue is never disabled. Pressing it with a required answer missing keeps the student on the screen and marks each missing question:
  - an amber tint and border around the question;
  - a colored line saying exactly what to pick ("Pick full-time or part-time to continue.");
  - a summary by the buttons ("1 question on this page still needs an answer.", `role="alert"`).
- Focus moves to the first missing question. Its options get `aria-invalid` and `aria-describedby` pointing at the message.
- The review lists every missing answer at the top, with a button to each. Missing rows say "Needed", with an Answer button. "Build my plan" becomes "Answer the missing question first" and opens the first one. A question opened from the review shows its mark right away.
- Marking text uses `--amber-strong` (#80520a): 6.7:1 on white and 6.1:1 on the amber tint (`src/app/contrast.test.ts`).
