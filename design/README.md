# Confluence redesign (in progress)

A design package for the Career Pathway Mapper redesign: a river confluence drawn in ASCII, four colours, and the same thinking carried through the landing page, the questions, the results page and the PDF.

Status: first mockup only (landing and questions). The results page, the PDF, the written design system and the handoff prompt come after the direction is confirmed.

| Path | What it is |
|---|---|
| `preview/landing-to-questions.html` | One self-contained file. Open it in any browser: intro, confluence, Start, three sample questions, the move to the results header |
| `preview/screenshots/` | Desktop and phone stills of the same |
| `river/river.js` | The ASCII river: world, camera, scenes, fish. No dependencies |
| `tokens.css` | The four colours, type, buttons, the window frame |
| `prototypes/flow.html` | Source of the preview (needs a local server because it imports `river.js`) |
| `build-preview.mjs` | Rebuilds `preview/` from the sources: `node design/build-preview.mjs` |

Nothing in `src/`, `data/` or the engine has changed.
