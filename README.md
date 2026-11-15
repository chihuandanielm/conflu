# Career Pathway Mapper: data and planning engine (draft core)

- **285 resources** for 20 Rutgers–New Brunswick majors: Rutgers offices, labs, and programs; NJ state aid and employers; national fellowships, internships, scholarships, professional societies, certifications, access programs; and professional-presence tools (LinkedIn, GitHub, open source, Kaggle, CAD, Figma, LSAT prep).
- **109 career goals** and **27 career tracks** that the engine turns into a semester-by-semester roadmap.
- A **reference planning engine** (`src/engine/`) with passing invariant tests.

**Start with `docs/ALGORITHM.md`.** It is the full systems design and the handoff document for Claude Code. `docs/sample-plans.md` shows the engine's output for four example students.

```
npm run validate   # data integrity (Node 22.6+)
npm test           # engine invariants
npm run samples    # regenerate docs/sample-plans.md
```

## Why JSON files

The site is a static TypeScript app with no server, so the data ships as JSON next to the code:

- The site imports it directly, with types in `src/types.ts`.
- Every change shows up as a readable diff in GitHub, so you can review edits.
- `scripts/validate.mjs` rejects bad entries (unknown majors, typos in tags, missing fields) before they reach the site.
- The fields map one-to-one to database tables if you later move to SQLite or Supabase.

## Layout

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
| `verification` | `search-confirmed`, `link-checked`, `unverified`, or `broken`, plus the date |

## Verification status: read this

- **51 entries are `search-confirmed`**: the program and its home URL appeared in web searches on 2026-11-13.
- **The rest (234) are `unverified`**: well-known programs whose URLs came from general knowledge. Most will be right; some will have moved.
- The drafting environment could not load websites directly, so links have not been visited yet. **Push the repo to GitHub and run the "Validate data and check links" workflow** (Actions tab → Run workflow). It visits every URL, marks each one `link-checked` or `broken`, and commits the result.
- Some sites block automated requests, so a `broken` result can be a false alarm. Open those by hand.

## Known limits

- **Clubs:** most club entries point to the national organization; `contact.how` says to find the Rutgers chapter on getINVOLVED. Chapter pages change every year.
- **Employer programs:** company program names change yearly. The entries link to careers pages and say so.
- **2025–26 changes:** several federal and identity-based programs were paused, renamed, defunded, or changed eligibility (SHPEP ended, Pickering/Rangel paused, CyberCorps renamed, McNair criteria changed). Those are marked in `status`. Re-check every identity-based program each semester.
- **Guessed Rutgers URLs to check first:** `hpo.rutgers.edu`, `pharmafellows.rutgers.edu`, `usacs.rutgers.edu`, `ruoffcampus.rutgers.edu` (food pantry), `rutgers.campuslabs.com/engage`, `rscj.newark.rutgers.edu`, `njstep.newark.rutgers.edu`.
- **Goal weights are informed defaults**, not measured. Calibrate them with tester feedback and advisor review (see ALGORITHM.md §10).

## Adding a resource

1. Copy an existing entry in the right file and give it a new kebab-case `id`.
2. Use only values from `data/vocab.json`; add a new value there first if needed.
3. Run `npm run validate`.
4. Commit. The workflow checks the link.
