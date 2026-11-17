# Handoff prompt: build the Confluence redesign

Paste everything below the line into a Claude Code session at the repo root.

---

You are implementing a finished visual redesign of **Career Pathway Mapper** called Confluence. The design decisions are made. Your job is to build them into the React app faithfully, not to redesign. Where this prompt and the design files are silent, choose the plainest option that follows the rules in `design/DESIGN.md` and tell me what you chose.

## 1. Read first, in this order

1. `design/DESIGN.md`: the rules (colour, type, line, words, every screen, the map, the PDF, motion). This is the spec.
2. `design/RIVER.md`: how the animated river works and its API.
3. Open `design/preview/site.html` and `design/preview/pdf.html` in a browser (they are self-contained). Click through: intro, Start, three questions, Build my plan, a goal, See the full map. `pdf.html?plan=polisci-senior` shows a short plan. These are the visual reference. `design/preview/screenshots/` has stills.
4. `design/river/river.js`, `design/map/confluence-map.js`, `design/tokens.css`: working code. Reuse it; do not rewrite the look from scratch.
5. `docs/ALGORITHM.md` section 7 and `CLAUDE.md`, for what must not change.

Before writing code, run `npm run validate`, `npm test`, `npm run test:ui`. Then reply with a short plan and wait for my OK.

## 2. What must not change

- `src/engine/` and `data/`: no changes at all. This is a visual redesign.
- The content and order of the results page, the questions, their wording from `copy.ts` and `data/`, saved-state keys, share links, privacy rules (no network, no analytics, no third-party scripts, no AI).
- The Content-Security-Policy. The river is a same-origin canvas and needs nothing new. Fonts stay self-hosted.

## 3. Step zero: the standing rules

`CLAUDE.md` still describes the old look. Replace its design line with:

> Design: follow `design/DESIGN.md`. Four colours only (`#E0E7DA`, `#466995`, `#00A37D`, `#E6B989`), Quantico and IBM Plex Mono, no shadows, gradients, emoji or icons-as-decoration. One river (`src/app/river/`) for the whole session; screens change by moving its camera. Respect prefers-reduced-motion.

Show me that edit before making it; it is my file.

## 4. The work, in milestones

Stop after each milestone, show me screenshots (desktop 1440 by 900 and phone 390 by 844), and wait.

**M1. Foundations**
- Add `@fontsource/quantico` (400, 700) and the 600 weight of `@fontsource/ibm-plex-mono`. Remove IBM Plex Sans from the UI once nothing uses it.
- Replace the tokens in `src/app/styles.css` with the four colours and the scale in `design/tokens.css` (keep Tailwind; expose them through `@theme`). Delete every old colour token, including the eight lane tints.
- Rebuild `Button` (solid, outline, text), the dot, the shore rule and the drafting corners as in `tokens.css`.
- Rewrite `src/app/contrast.test.ts`: only blue on sage and sage on blue may carry text; floor 4.4:1.

**M2. The river**
- Move `design/river/river.js` to `src/app/river/` (TypeScript if you like; keep it dependency-free and keep the exports).
- Mount **one** canvas for the whole app in `App.tsx`, fixed behind the views, with a small context (`useRiver()`) so each view can call `goTo`, `setHints`, `setMasks`, `celebrate`, `pause`, `resume`.
- Add tests: `asciiFrame` is deterministic (same input, same output); `waterInk` stays within 0 to 1 for a sweep of inputs; reduced motion draws and does not start a loop.

**M3. Landing and questions**
- `Intro.tsx`: the layout and words of `preview/site.html`. Sequence: `low` scene, 2.3s, then `goTo("landing", 2800)`, words fade in over the last second. "Skip intro" text link. Returning visitors (saved plan or saved answers) get the short version (no hold, 1.2s rise) with their existing buttons.
- `QuestionShell.tsx` and every control in `intake/controls/`: the sheet, ruled rows, gauge and nav of section 7.2. `ProgressBar` becomes the fish gauge (keep `role="progressbar"`).
- Start: `setMasks([])`, `goTo("ask", { ms: 3200, along: true })`, questions fade in near the end.
- `Review.tsx`: section 7.2.

**M4. Results**
- Replace the "Building your plan" view with the camera move in section 7.3 (`celebrate`, then `goTo("results", 2600)`); keep it instant under reduced motion and keep the `role="status"` announcement for screen readers.
- Restyle every part of `ResultsPage.tsx` and its children per the table in section 7.4. Keep their logic, props and the copy that tests rely on where you can.
- Move `design/map/confluence-map.js` to `src/app/map/`. Build a `ConfluenceMap` component: SVG for the lines (from `layoutConfluence`), real `<button>`s for the names positioned from `layout.labels`, opening the goal drawer. Use it for the milestone map in "Where you're headed" and for the full map view.
- The full map view replaces `chart/RoadmapChart.tsx`, `chart/nodes.tsx`, `chart/layout.ts`, `Timeline.tsx` and the chart/list switch. Remove `@xyflow/react` and its CSS overrides. **Confirm this removal with me before doing it.**
- `Competencies.tsx`: the dot-and-ring rows of section 7.4.
- `GoalDrawer.tsx`, `ResourcesTab.tsx`, `ResourceCard.tsx`: section 7.4.
- Drop `lucide-react` icons from these surfaces in favour of words and typed arrows. Remove the dependency if nothing uses it.

**M5. The PDF**
- Rewrite `pdf/RoadmapPdf.tsx` to match `preview/pdf.html` and section 7.6: sage page background, the banner, the fitted confluence map on page 1 (`layoutConfluence` with `maxHeight`, drawn with react-pdf's `Svg`, `Path`, `Circle`, `Line`, `Text`), then the stand, the semesters with tick boxes, and the footer.
- Fonts: extend `scripts/woff-to-ttf.mjs` to produce Quantico 400 and 700 TTFs next to Plex Mono, and register them. Check Quantico's licence file is copied the way the Plex one is.
- The banner is two absolutely positioned `Text` blocks (sand, then blue) from `asciiFrame("banner", 175, 13, { cell: [4.2, 8] })` in Plex Mono at 5.25pt with a 6pt line height. If react-pdf offers a way to mark it as an artifact, do that; if not, say so.
- Keep the URL-wrapping behaviour and all existing PDF tests' intent.

**M6. Proof**
- Update Vitest and Playwright tests for the new structure. Add: map layout tests (no two labels on one side overlap; every strand ends at the mouth; `maxHeight` is respected or the function returns its minimum; one-sided under 560px), and an e2e check that the canvas exists exactly once across all views.
- Copy `design/check-smoothness.cjs` to run against the built app (`npm run serve`) and report its table.
- Run axe on landing, a question, results, map, drawer.
- `npm run validate`, `npm test`, `npm run test:ui`, `npm run e2e`, `npm run build` all pass.

## 5. Rules of the look you will be tempted to break

- No fifth colour, no `opacity` or `rgba` to make tints, no shadows, no gradients, no rounded corners (dots excepted).
- Green only on the fish, "you are here", and done things.
- Selected is solid blue with sage text. Nothing else marks selection.
- One solid blue block per screen.
- Rows with rules, not cards with borders.
- No decorative underlines, highlight bars, eyebrow labels in capitals, emoji, or icon grids.
- No new copy in a marketing voice. If you need a sentence I have not given you, write it plainly and flag it.
- The river never reacts to input, never restarts, and exists once.

## 6. Acceptance

1. Side by side with `design/preview/site.html` at 1440 by 900 and 390 by 844, each screen matches in layout, colour, type and spacing.
2. The canvas is created once and never unmounted from first paint to the results page; each change of screen is a camera move.
3. With reduced motion: no animation anywhere, every screen still shows its still river, and the flow works.
4. Any plan the engine can produce renders: check a first-year "by graduation" plan (the longest), a senior six-month plan (the shortest), and one with a goal title over 80 characters, on the page, the map and the PDF.
5. PDF page 1 is the confluence map; steps print as boxes; text is selectable; nothing overflows a page.
6. The smoothness check passes at full speed and at 4 times slower on desktop and phone sizes.
7. `grep` of the built CSS finds no colour other than the four.
8. All test suites pass; engine and data are untouched (`git diff --stat` shows nothing under `src/engine` or `data`).

## 7. Report at the end

What is done, what is not, every decision you made that the design files did not cover, and anything in the design you think is wrong, with a screenshot.
