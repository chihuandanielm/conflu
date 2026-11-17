# Build prompt: Career Pathway Mapper draft site

Paste everything below the line into Claude Code, run from the repo root.

---

You are building the first working draft of **Career Pathway Mapper**, a free website that turns a college student's answers into a semester-by-semester career roadmap with tailored resources. The data and the planning engine already exist in this repo. Your job is the website around them: a one-question-at-a-time intake, a readable roadmap chart, a resources view, and a downloadable PDF.

Work like a senior engineer on a small product team: read before you build, keep the engine pure, ship in milestones, test as you go, and tell me plainly what's done, what isn't, and what you decided.

## 1. Read these first, in this order

1. `docs/ALGORITHM.md`: the full systems design. It defines the inputs, the scoring and scheduling, and the exact `Plan` output you will render. Treat it as the spec.
2. `src/engine/types.ts` and `src/engine/engine.ts`: `buildPlan(input: PlanInput, data: Dataset): Plan`. Pure, deterministic, no DOM, no network.
3. `data/intake.json`: every question and answer option. The intake UI is driven by this file.
4. `data/tracks.json`, `data/goals.json`, `data/majors.json`, `data/resources/*.json`, `data/vocab.json`.
5. `docs/sample-plans.md`: what real engine output looks like for four example students.
6. `README.md`: repo layout and data verification status.

Before writing code, run `npm run validate` and `npm test`. Both should pass (Node 22.6+). Then reply with a short build plan (stack, folder structure, milestones) and wait for my OK.

## 2. Product context (what I've decided)

- **Who it's for:** college students, starting with Rutgers–New Brunswick undergrads. The data covers 20 majors and is Rutgers-first, then New Jersey, then national. Other statuses (recent grad, professional, not working) appear in the first question as "coming soon" and are disabled.
- **The problem:** students have resources everywhere but no order to take them in. The site gives a **general trajectory, not a blueprint**. Say that on the intro screen and on the results page, in plain words, once each.
- **No AI.** No LLM calls, no API keys, no "AI-powered" language anywhere. Every result comes from the engine and the JSON data.
- **No accounts and no name.** Never ask for a name, email, or school ID.
- **Private by default.** Everything runs in the browser. Answers live in `localStorage` only. No analytics, no trackers, no cookies, no third-party scripts, and self-hosted fonts. Identity questions are optional, explained, and never sent anywhere.
- **Don't invent content.** Every resource, goal, and reason shown must come from the data or the engine. No placeholder programs and no lorem ipsum. If something is missing, show an honest empty state and list it in your report.

## 3. Stack

- **Vite + React + TypeScript**, built as a fully static site, deployed to **Cloudflare Pages**. If you think Next.js static export is clearly better here, say why before switching.
- Import the engine directly from `src/engine/engine.ts`. Its imports use `.ts` extensions, so enable `allowImportingTsExtensions` and `noEmit` in tsconfig (Vite handles the rest).
- Build the `Dataset` in the browser by statically importing the JSON files. Use `import.meta.glob` for `data/resources/*.json`. Mirror `src/engine/load.ts`, but without `fs`.
- **Animation:** Motion (Framer Motion). **Chart:** React Flow (`@xyflow/react`), with node positions computed by you from the plan's term and lane, not by an auto-layout library. **PDF:** `@react-pdf/renderer`, generated client-side as real text (no screenshots of the page). **Styling:** Tailwind CSS with the design tokens below as CSS variables. **Fonts:** self-hosted through `@fontsource`.
- **Tests:** keep the existing engine tests. Add **Vitest + Testing Library** for components and **Playwright** for one end-to-end run.
- Keep dependencies minimal. Ask before adding anything not listed here.

## 4. Visual direction

This is a **clean, corporate, trustworthy** product, closer to a well-made banking or healthcare app than a startup landing page. It should feel calm and considered, and must **not** look like a generic AI-generated template.

**Palette** (white background; soothing greens and blues; color is for meaning, not decoration):

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#FFFFFF` | Page background |
| `--surface` | `#F6F8FA` | Panels, chart canvas |
| `--border` | `#E2E8EE` | Hairlines, card borders |
| `--ink` | `#13293D` | Headings and body (deep navy, not black) |
| `--muted` | `#5B6B7B` | Secondary text (passes 4.5:1 on white) |
| `--blue` | `#1F5F99` | Primary actions, links, focus rings |
| `--blue-tint` | `#EAF2FA` | Selected states, highlights |
| `--green` | `#1F7A63` | Progress, completed, positive states |
| `--green-tint` | `#E8F4F0` | Completed backgrounds |
| `--amber` | `#9A6A12` | Warnings only, used sparingly |

Give each of the 8 chart lanes a quiet tint in the blue–green range. Check every text and background pair against WCAG AA.

**Typography:** IBM Plex Sans for UI and body, with IBM Plex Mono only for small labels like term codes. Two weights (400 and 600). A clear type scale. Sentence case everywhere. No all-caps headings.

**Do:** generous whitespace, a visible 8-pt spacing grid, 1px borders, 6–8px radius, flat surfaces, real hierarchy, simple line icons (Lucide), and data shown precisely.

**Don't:** gradients, glassmorphism, glows, purple, emoji, drop-shadow-heavy cards, stock illustrations, oversized hero type, endless uniform card grids, decorative blobs, or filler marketing copy.

**Motion:** purposeful and quick: 150–250ms ease-out fades and short slides. Specifically:
- question-to-question transitions
- chart nodes fading in by term
- a progress bar that fills smoothly
- a drawer sliding in from the right

No bouncing, parallax, typewriter effects, or confetti. Respect `prefers-reduced-motion` by swapping transitions to instant fades.

## 5. The intake: one question at a time

The intake is a **conversation, not a form**. Each question owns the screen:
- vertically and horizontally centered, max width about 640px
- one clear question (h1-sized)
- one line of help text when needed
- the answer controls
- Back and Continue

A thin progress bar sits at the top, with a step count ("4 of 12"). No sidebar and no visible list of upcoming questions.

**Interaction rules**
- Single-choice answers advance automatically after a short beat (about 250ms), showing the selection first. Multi-select and optional questions use Continue.
- Keyboard: Enter continues, number keys pick options, Escape goes back, Tab order is logical.
- Optional questions show "Skip" and a one-line note on why the question is asked.
- Answers save to `localStorage` on every step, so a refresh resumes where the student left off.
- Announce each new question with `aria-live` so screen readers follow along.

**Question order** (build it from `data/intake.json`; branching noted). *Superseded: the intake now groups these into 8 screens, goal first. See `docs/INTAKE_ORDER.md`.*

1. **Intro screen.** One sentence on what the site does. The "general trajectory, not a blueprint" note. About 3 minutes. Nothing is stored outside your browser. Start button.
2. **Where are you right now?** Status. Only "College student" is enabled; the others show "coming soon".
3. **What's your major?** Searchable list of the 20 majors from `majors.json`.
4. **What year are you in?** 1–4.
5. **Which school?** "Rutgers–New Brunswick" or "Another school". Optional. It only changes resource ranking.
6. **Where do you want to end up?** Tracks from `tracks.json`:
   - Show tracks whose `suggestedMajors` include the student's major first, with the track description.
   - Then a "See all paths" expander.
   - Always offer "Still exploring".
7. **How soon do you want to get there?** Horizons from `intake.json`.
8. **What have you already done?** Experience checklist as selectable chips. There are 43 options, which is too many for one screen:
   - Group them: getting started, online presence, experience, research and clinical, networking.
   - Show the groups most relevant to the chosen track and major first (rank by whether the option's `completes` goals are boosted by the track or allowed for the major).
   - Collapse the rest behind "Show more".
   - "None yet" is a valid, friendly answer.
9. **Skills you're comfortable with.** Same chip pattern, relevance-ranked.
10. **Certifications you already have.** Same, optional.
11. **How many hours a week can you put toward this?** 2/5/10/15/20, default 5. Help text: "Be realistic. The plan fits to this."
12. **What about summers?** Full / part / none.
13. **Open to a co-op?** Only for mechanical engineering, biomedical engineering, pharmacy, and supply chain.
14. **Where are you based?** Optional (NJ / elsewhere in the US / outside the US).
15. **Citizenship status.** Optional. Explain that it's only used to hide programs the student legally can't apply to.
16. **Anything else we should know?** Optional identity tags. Explain that these only add programs a student may be eligible for, never remove anything, and never leave the browser.
17. **Review screen.** A compact summary of every answer, each with an Edit link that jumps back to that question and returns to the review. "Build my plan" button.

Then show a short, honest loading transition (the engine is instant, so no more than about 600ms) and go to results.

## 6. The results: a plan that doesn't overwhelm

Use **progressive disclosure**. The student should understand their next steps in 10 seconds and be able to explore the full map when they want.

**Top of page**
- One-line summary: "{Track} · {Major}, year {N} · by {horizon} · {hours} hrs/week".
- The general-trajectory note, small.
- Actions: Download PDF, Edit answers, Start over.

**1. "Your next moves."** The current term's items, up to 5, as clean rows: title, hours, the first `why[]` reason, and its top resource. Show this first.

**2. Notices.** `plan.warnings` as calm, dismissible notices: amber only for real problems (hours shortfall, missed must-do), blue for timeline info.

**3. The roadmap chart** (React Flow)
- Columns are `plan.terms`, labeled with `label` and used/available hours.
- Rows are the 8 lanes in `ALGORITHM.md` §7 order. Hide lanes with no items.
- Nodes are `PlanItem`s: compact cards with title and hours, a small "Must-do" tag when `gate`, and a "continues" marker when `partial`.
- A goal split across terms appears once per term, joined by a dotted continuation line.
- `plan.edges` are thin arrows.
- Summer columns with `summerBlock` show the block goal as a full-width bar.
- **Not overwhelming:**
  - Open zoomed to fit the current term plus the next two, with a "Show full timeline" toggle.
  - Lane filter chips.
  - Hovering or selecting a node dims everything except its prerequisites and dependents.
  - Pan and zoom, plus a fit button.
- **Node click** opens a right-side drawer with the title, hours and term, all `why[]` reasons in order, the resources (name, one-line summary, link opening in a new tab, and any status note such as "paused in 2026"), and a **Mark as done** button. Marking done re-runs `buildPlan` with the goal added to `completedGoals` and the current placements as `previousPlan`, then animates the changes.
- **Mobile (under 768px):** replace the chart with a vertical timeline (terms as sections, items as rows, same drawer as a bottom sheet). The chart must not overflow sideways.
- **Accessibility:** add a "View as list" toggle on desktop that shows the same timeline.

**4. Your skills picture.** `plan.competencies` as 8 horizontal bars (current vs. target), labeled with the full competency names from `goals.json`. No radar chart.

**5. Ongoing habits.** `plan.ongoing` as a short list.

**6. If you have more time.** `plan.backlog`, collapsed by default, each item with its reason.

## 7. Resources tab: tailored, not a directory dump

A second tab on the results page, "Your resources", collects every resource attached to the student's planned goals, plus all resources whose `majors` include their major (or "all") and whose `years` include their year.

- Apply the same eligibility rules the engine uses (identity only adds; citizenship hides only when stated). Reuse or export the engine's filtering instead of rewriting it.
- Default sort matches the engine's ranking: Rutgers first if the school is Rutgers, then NJ if the student is NJ-based, then national; active before paused.
- Group by type: programs and internships, research, scholarships and aid, organizations and clubs, tools and skills, campus offices.
- Filters: type, scope, paid/free, "for students like me" (identity matches).
- Each resource shows:
  - name and summary
  - who it's for
  - pay and season
  - typical deadline
  - contact (email, phone, location, or `how`)
  - the home link
  - a quiet status line for anything not active
- Show "link last checked {date}" only when `verification.checkedOn` exists. Don't show "unverified" labels to students.

## 8. PDF download

Generate it client-side with `@react-pdf/renderer`, styled like the site (white, navy text, blue/green accents, Plex fonts), as real selectable text. Contents:

1. **Cover:** "Your career roadmap", track, major, year, horizon, hours per week, generated date, data version, and the general-trajectory note. No name.
2. **Your next moves:** the current term's items.
3. **Semester by semester:** one section per term, each item with hours, its reasons, and its resources with full URLs written out.
4. **Ongoing habits** and **If you have more time.**
5. **Resources:** the tailored list, grouped, with URLs and contacts.
6. **Footer on every page:** page number, "Generated by Career Pathway Mapper", and the date.

File name: `career-roadmap-{track}-{yyyy-mm-dd}.pdf`.

## 9. State, persistence, re-planning

- Store `{ input, previousPlan, engineVersion, dataVersion }` in `localStorage`. On return, offer "Continue your plan" or "Start over".
- If the saved `dataVersion` differs from `data/version.json`, show a notice: "Your plan was built on older data. Refresh it." Refreshing re-runs with `previousPlan`.
- Pass `today` from the browser's clock into the engine. Never call `Date.now()` inside the engine.
- Shareable link: encode only non-identity, non-citizenship inputs in the URL hash. Opening it pre-fills the review screen.

## 10. Engineering rules

- **Don't change the engine's math or the data** unless you find a real bug. If you do, add a failing test first, fix it, update `ALGORITHM.md`, bump `ENGINE_VERSION`, and tell me. UI needs (labels, grouping) belong in UI code or a new UI-only data file, not in the engine.
- Keep `npm run validate` and `npm test` green. Add `npm run test:ui` (Vitest) and `npm run e2e` (Playwright).
- **The Playwright test:** completes the intake as a CS sophomore on the software track, reaches results, opens a node drawer, marks a goal done, sees the plan update, and downloads the PDF.
- **Accessibility:** WCAG 2.2 AA, visible focus rings, labeled controls, keyboard-only completion of the whole flow, and Lighthouse accessibility ≥ 95.
- **Performance:** Lighthouse performance ≥ 90 on mobile. Lazy-load the PDF library and the chart.
- **Security headers:** add a Cloudflare Pages `_headers` file with a strict Content-Security-Policy (`default-src 'self'`), `Referrer-Policy: no-referrer`, and `Permissions-Policy` denying camera, mic, and geolocation.
- **CI:** add a GitHub Actions workflow that runs validate, engine tests, UI tests, and the build on every push. Keep the existing link-check workflow.
- Small, focused components. No `any`. Strict TypeScript. Commit at the end of each milestone with a clear message.

## 11. Milestones

1. **Scaffold:** Vite/React/TS/Tailwind, tokens, fonts, data loading, engine wired in, CI. Show me a page that renders `buildPlan` output as JSON for a hard-coded student.
2. **Intake flow:** all questions, branching, keyboard support, persistence, review screen.
3. **Results:** next moves, notices, mobile timeline, list view, drawer, mark-as-done re-planning.
4. **Roadmap chart:** desktop React Flow chart with focus mode, lane filters, and dimming.
5. **Resources tab** and **PDF**.
6. **Polish:** motion, accessibility pass, Lighthouse, Playwright, `_headers`, README update with run and deploy steps.

After each milestone, stop and report:
- what you built
- screenshots or a short description of each screen
- test results
- any decision you made that I should know about

Then wait for my go-ahead.

## 12. Definition of done for this draft

- A student can go from the intro to a full plan in about 3 minutes using only the keyboard or only touch, on desktop and phone.
- The first screen of results tells them what to do this semester and why.
- Every goal shows real reasons and tailored, eligible resources from the data.
- The full chart is explorable without feeling crowded, and there's a list alternative.
- The PDF downloads and reads well when printed.
- No names, accounts, network calls for data, trackers, or AI anywhere.
- All validation and tests pass in CI.
