# Career Pathway Mapper

A free website that turns a college student's answers into a semester-by-semester career roadmap, with the programs and resources that fit them. It starts with Rutgers–New Brunswick undergraduates in 20 majors.

- **One question at a time:** a 3-minute intake, by keyboard or touch, that saves as you go.
- **A plan, not a list:** "Your next moves" for this term, a roadmap chart (a vertical timeline on phones), notices, a skills picture, and a drawer for each goal with its reasons, resources, and a "Mark as done" button that re-plans around it.
- **Your resources:** every eligible program tied to the plan, plus everything for the student's major and year, with filters.
- **A PDF** with real text, generated in the browser.
- **Private by default:** no accounts, no names, no analytics, no cookies, no third-party requests, no AI. Everything runs in the browser from the JSON data in this repo, and answers stay in `localStorage`.

It's a general trajectory, not a blueprint. **Start with `docs/ALGORITHM.md`** for how plans are built, and `docs/sample-plans.md` for example output.

## Run it

Needs Node 22.6 or newer (CI uses Node 24).

```bash
npm install
```

```bash
npm run dev
```

The dev server prints a local URL. Other commands:

| Command | What it does |
|---|---|
| `npm run build` | Production build into `dist/` (also generates the PDF fonts and type-checks) |
| `npm run serve` | Serves `dist/` locally, compressed, the way GitHub Pages does |
| `npm run validate` | Data integrity: references, vocabularies, UI groupings |
| `npm test` | Engine invariants and link-checker tests (Node's built-in runner) |
| `npm run test:ui` | Vitest and Testing Library: components, intake, results, chart layout, resources, PDF, contrast |
| `npm run e2e` | Playwright: builds for `/conflu/`, serves it like GitHub Pages, runs the full flow on desktop and phone |
| `npm run samples` | Regenerates `docs/sample-plans.md` |
| `npm run check-links` | Visits every resource URL (needs internet; CI runs it weekly) |

The first `npm run e2e` on a new machine needs a browser: `npx playwright install chromium`.

## Deploy to GitHub Pages

The site is fully static and deploys from `main` with `.github/workflows/pages.yml`. It's published at `https://chihuandanielm.github.io/conflu/`.

One-time setup:
1. In the repository, open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**. If it's set to "Deploy from a branch", GitHub publishes the unbuilt source files instead.

After that, every push to `main` validates the data, runs the engine tests, builds with `BASE_PATH=/conflu/` (the repository path), and publishes `dist/`. You can also run the workflow by hand from the Actions tab.

**Security on GitHub Pages:** GitHub Pages can't send custom response headers, so the Content-Security-Policy ships in `index.html` as a `<meta>` tag, added to production builds by `vite.config.ts`.
- **What the policy allows:** `default-src 'self'`, so nothing loads from another site. The only extras are for the PDF library's WebAssembly layout engine: `'wasm-unsafe-eval'` (compiling WebAssembly, not JavaScript eval) and `connect-src data:` (reading that module).
- **Referrer policy:** a `<meta name="referrer" content="no-referrer">` tag covers it.
- **Not possible on GitHub Pages:** blocking other sites from framing the page, a Permissions-Policy, and custom caching. The site uses no camera, microphone, or location anyway.
- **Tested:** the end-to-end test runs under the meta-tag policy and fails if it stops blocking an injected script, if anything violates it, or if any request leaves the site.

To use a custom domain, set it under **Settings → Pages** and change `BASE_PATH` in the workflow to `/`.

## Site layout

```
src/engine/            planning engine: pure, deterministic, no DOM (see docs/ALGORITHM.md)
src/app/
  data/                builds the engine's Dataset from the JSON in the browser
  intake/              one-question-at-a-time intake, review screen, model (steps, branching, relevance ranking)
  results/             results page, next moves, notices, timeline, goal drawer, skills picture
  chart/               desktop roadmap chart (React Flow, lazy-loaded) and its pure layout function
  resources/           "Your resources" tab: tailoring (reuses the engine's eligibility), filters, cards
  pdf/                 PDF document and download (lazy-loaded on click)
  state/               localStorage, saved plan and re-planning, share links
data/ui/               UI-only data: question copy, experience groups, identity labels, resource groups
scripts/               validate, check-links, woff-to-ttf (PDF fonts), serve (local GitHub Pages stand-in), sample plans
test/                  engine and link-checker tests
e2e/                   Playwright end-to-end tests
```

Saved state lives only in the browser: `cpm.intake.v1` (answers in progress), `cpm.plan.v1` (answers, check-offs, last placements, engine and data versions), and `cpm.roadmap-view` (chart or list). A share link puts the answers in the URL hash, which browsers never send to a server. It never includes identity or citizenship answers.

## The data

- **285 resources** for 20 Rutgers–New Brunswick majors: Rutgers offices, labs, and programs; NJ state aid and employers; national fellowships, internships, scholarships, professional societies, certifications, access programs; and professional-presence tools.
- **109 career goals** and **27 career tracks** that the engine turns into a semester-by-semester roadmap.

## Why JSON files

The site is a static TypeScript app with no server, so the data ships as JSON next to the code:

- The site imports it directly, with types in `src/types.ts`.
- Every change shows up as a readable diff in GitHub, so you can review edits.
- `scripts/validate.mjs` rejects bad entries (unknown majors, typos in tags, missing fields) before they reach the site.
- The fields map one-to-one to database tables if you later move to SQLite or Supabase.

## Data files

```
data/
  majors.json        20 majors with CIP codes (for joining to O*NET occupations)
  goals.json         109 milestones: competencies, weights, hours, time windows, prerequisites, linked resources
  tracks.json        27 career targets: per-goal weight boosts, must-do gates, suppressed goals, timing overrides
  intake.json        intake questions and which goals each answer marks done
  vocab.json         allowed values for type, scope, status, years, pay, season, identity
  version.json       data version stamped into every plan
  resources/
    professional-presence.json                35  LinkedIn, GitHub, open source, portfolios, practice platforms
    rutgers.json                              59  offices, programs, labs, centers, student media
    new-jersey.json                           19  EOF, TAG, Garden State Guarantee, NJ employers
    national-access.json                      47  identity, income, first-gen, disability, undocumented, transfer
    national-fellowships-research-federal.json 28  Goldwater, Truman, REUs, NIH, Pathways, service corps
    majors-tech-engineering.json              20
    majors-health-life.json                   26
    majors-business.json                      21
    majors-social-communication.json          18
    skills-tools-basics.json                  12  free certs, FAFSA, O*NET, job boards
src/types.ts         TypeScript resource types + a forStudent(resources, major, year) filter
src/engine/          planning engine: types.ts, engine.ts (buildPlan), load.ts
test/engine.test.ts  invariant tests
docs/ALGORITHM.md    systems design (read first)
docs/sample-plans.md example engine output
scripts/validate.mjs        run on every change
scripts/check-links.mjs     visits every url and records the result
.github/workflows/check-links.yml   runs both on every data change and weekly
```

## Resource fields

| Field | Meaning |
|---|---|
| `majors` | Major ids, or `["all"]` |
| `years` | 1–4, `grad`, `alumni` |
| `identity` | Who it is for (empty = everyone): race/ethnicity, women, LGBTQ+, first-gen, low-income, Pell, disability, veteran, international, undocumented, transfer, NJ resident, citizenship |
| `interests` | Free tags (research, pre-health, cybersecurity…) |
| `pay`, `season`, `typicalDeadline` | What it pays and when it runs |
| `url` | The program's home site |
| `contact` | Email, phone, and location where known; `how` says how to reach them |
| `status`, `statusNote` | `active`, `paused`, `changed`, or `ended`, with why |
| `verification` | `link-checked`, `search-confirmed`, `blocked`, `unverified`, or `broken`, plus the date (see below) |

## Verification status: read this

Every resource has a `verification.state` (allowed values in `data/vocab.json`):

| State | Meaning |
|---|---|
| `link-checked` | The page loaded for the automated checker on `checkedOn`. |
| `search-confirmed` | The program and this exact URL were confirmed by web search on `checkedOn`. A later refused check keeps this state. |
| `blocked` | The site refused the automated checker (bot protection: LinkedIn, Glassdoor, LeetCode, many .gov sites). Usually fine in a browser; open it by hand. |
| `broken` | The page is gone (404/410) or the host doesn't resolve. Needs a new URL. |
| `unverified` | Not yet checked. |

The checker also records `httpStatus`, `finalUrl` (when a redirect moved the page), and a `note`. `finalUrl` leaves out one-time tokens (session IDs, sign-in tokens, tracking parameters), so the bot only commits when a page really moves.

- **How links are checked:** the "Validate data and check links" workflow runs `scripts/check-links.mjs` on every data change and every Monday, writes the results back, and posts a report (loaded / blocked / broken / redirected) to the run summary. It sends a normal browser user agent and reads the page body, so bot walls are labeled `blocked`, not `broken`.
- **2026-11-15 review:** the first run marked 56 links broken. Web research found correct landing pages for 41 (wrong domains such as Emma Bowen's `.org`, Kenvue's `jobs.kenvue.com`, the Rutgers Energy Institute's merger into RCEI, and homepages replaced with the specific program page) and confirmed that 12 others are real sites that block bots. Two still need a person: `phi-alpha` and `nj-biomaterials`. (`bloomberg-bmc` loaded on a later run.)
- **First run of the new checker (2026-11-15):** 212 loaded, 42 blocked, 6 broken, about 40 redirected. Clean redirects were adopted as the new URLs. Real changes were recorded as `status: changed`: getINVOLVED became The Arc, the LSAMP site redirects to a general page, Public Health AmeriCorps moved under Healthy Futures, and Aresty's summer research list page was removed. Prudential's student page moved to `jobs.prudential.com/us-en/early-talent/programs/internships`.

## Known limits

- **Clubs:** most club entries point to the national organization; `contact.how` says to find the Rutgers chapter on The Arc (getINVOLVED moved there in 2026). Chapter pages change every year.
- **Employer programs:** company program names change yearly. The entries link to careers pages and say so.
- **2025–26 changes:** several federal and identity-based programs were paused, renamed, defunded, or changed eligibility (SHPEP ended, Pickering/Rangel paused, CyberCorps renamed, McNair criteria changed). Those are marked in `status`. Re-check every identity-based program each semester.
- **Guessed Rutgers URLs:** `hpo.rutgers.edu`, `pharmafellows.rutgers.edu`, `ruoffcampus.rutgers.edu`, `rscj.newark.rutgers.edu`, and `njstep.newark.rutgers.edu` all loaded in the 2026-11-15 check. The next run records `finalUrl`, which shows whether any of them now redirect to a generic page.
- **Goal weights are informed defaults**, not measured. Calibrate them with tester feedback and advisor review (see ALGORITHM.md §10).

## Adding a resource

1. Copy an existing entry in the right file and give it a new kebab-case `id`.
2. Use only values from `data/vocab.json`; add a new value there first if needed.
3. Run `npm run validate`.
4. Commit. The workflow checks the link.
