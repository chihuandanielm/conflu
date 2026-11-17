# Confluence: the redesign package

Everything needed to rebuild the site's look, in one folder. Nothing here is wired into the app yet, and nothing in `src/`, `data/` or the engine has changed.

## Start here

| To do this | Open this |
|---|---|
| See it | `preview/site.html` and `preview/pdf.html`. Each is one self-contained file; double-click it. In the site: wait for the intro or press "Skip intro", Start, answer three sample questions, Build my plan, open a goal, See the full map. |
| Understand the rules | `DESIGN.md` |
| Change or reuse the river | `RIVER.md`, then `river/river.js` |
| Hand it to another Claude session to build | `HANDOFF_PROMPT.md` (paste it) |

## What is in the folder

| Path | What it is |
|---|---|
| `DESIGN.md` | The design logic: colour jobs, type, line, words, every screen, the map, the PDF, motion, and what happens when content changes |
| `RIVER.md` | How the animated river works, its API, every tuning number, and the measured frame rates |
| `HANDOFF_PROMPT.md` | A paste-ready build prompt with milestones and acceptance checks |
| `tokens.css` | The four colours, type scale, buttons, dot, shore rule, drafting corners |
| `river/river.js` | The ASCII river: world, camera, scenes, shading, fish. No dependencies |
| `map/confluence-map.js` | Lays out any plan as a confluence (pure geometry) and a reference SVG renderer |
| `prototypes/site.html` | The whole flow: landing, questions, results, full map, goal drawer |
| `prototypes/pdf.html` | The PDF layout at US Letter size. `?plan=polisci-senior` shows a short plan |
| `prototypes/scene.html` | Every camera preset and the glide between them |
| `prototypes/sample/` | Two real plans from the real engine and data (a sophomore to graduation, a senior with six months) |
| `prototypes/fonts/` | Quantico and IBM Plex Mono (SIL Open Font License) |
| `preview/` | The prototypes bundled into single files, and screenshots |
| `make-sample.ts` | Regenerates the sample plans: `node --experimental-strip-types design/make-sample.ts` |
| `build-preview.mjs` | Rebuilds `preview/` from the prototypes: `node design/build-preview.mjs` |
| `check-smoothness.cjs` | Measures every camera move at three screen sizes and three CPU speeds: `node design/check-smoothness.cjs` (needs Playwright) |

The prototypes in `prototypes/` import modules, so they need a local server (any static server pointed at `design/`). The files in `preview/` do not.

## Keeping it up to date

- After changing `river.js`, `confluence-map.js`, `tokens.css` or a prototype, run `node design/build-preview.mjs`.
- After a data or engine change, run `make-sample.ts` and then `build-preview.mjs`, so the prototypes show current content.
- The design rules do not depend on the data. `DESIGN.md` section 10 lists what follows automatically when content changes.

## Known gaps

- The prototype shows three of the sixteen questions, single-choice only. The multi-select, picker and review screens are specified in `DESIGN.md` section 7.2 but not drawn.
- "All resources", the skills picture and the returning-visitor landing are specified but not drawn.
- The PDF prototype is HTML at page size, not a real `@react-pdf/renderer` document.
- Blue on sage is 4.47:1, just under the 4.5:1 WCAG AA line for small text. The design keeps sentences at 17px or larger because of it.
- Frame rates were measured in headless Chromium without a graphics card, at 60Hz. Real phones and faster displays were not measured.
