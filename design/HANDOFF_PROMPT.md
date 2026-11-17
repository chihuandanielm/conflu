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

## 1a. How to use the confluence map

The map is the centrepiece of the results page and of page 1 of the PDF. All of its logic is in one pure function; you only draw what it returns.

```ts
import { layoutConfluence, LANE_GLYPH, LANE_NAME } from "../map/confluence-map";

const layout = layoutConfluence(
  {
    outcome: outcomeText(answers.trackId),            // the sentence at the mouth; "" to leave it off
    terms: plan.terms.map((t) => ({
      code: t.code, label: t.label,
      items: inWorkOrder(t.items).map((it) => ({     // priority order: the first ones survive a trim
        goalId: it.goalId, title: it.title, lane: it.lane,
        hours: Math.round(it.hours), gate: it.gate, late: it.late,
      })),
    })),
  },
  {
    width,                     // the width you have, in px (page) or pt (PDF)
    fontSize: 14,              // goal title size; everything else scales from it
    done: saved.completedGoals,
    // maxHeight: 520,         // PDF only: trims rows until it fits, see below
    // sides: 1,               // optional; default is 2 from 560 wide, 1 below
  },
);
```

What comes back, and what to do with each part:

| Field | Draw it as |
|---|---|
| `width`, `height` | The size of the drawing. Set the SVG `viewBox` to it. |
| `own.d` | The student's own line. `<path>`, blue, 2.4. |
| `strands[]` (`d`, `gate`, `done`) | One `<path>` each, no fill. Blue 1.1; 2.4 if `gate`; green if `done`. Draw these before `own`. |
| `dots[]` (`x`, `y`, `r`, `gate`, `done`) | A circle: open (sage fill, blue stroke), solid blue if `gate`, solid green if `done`. |
| `labels[]` (`x`, `y`, `w`, `align`, `lines`, `meta`, `title`, `id`) | **On the page:** a real `<button>` absolutely positioned over the SVG at `x, y`, `w` wide, right-aligned when `align === "right"`, showing the title (clamped to two lines) and under it the mono fact line `meta` (or "done"). It opens the goal drawer for `id`. **In the PDF:** `<Text>` using the pre-wrapped `lines`, then `meta`. |
| `terms[]` (`y`, `label`, `more`) | A dotted sand line across the full width at `y + 0.4 × fontSize`, and the label in mono under it. If `more > 0`, add "(+N more in the list)". |
| `source` | A ring with a green dot at `x, y`, and its `label` beside it in mono. |
| `mouth` | A short bar from `x0` to `x1` at `y`, a line down to a solid dot at `dotY`, and `lines` (the outcome) in bold at `textX, textY`. |
| `shown`, `total` | How many goals are drawn out of how many there are. |

Three places use it:

1. **"Where you're headed" on the Plan tab:** pass only the milestone goals (filter each term's items to the ids from `milestones(plan)`, drop empty terms) and `outcome: ""`, because the outcome is already the heading above it.
2. **The Map tab:** pass the whole plan. No `maxHeight`; the page scrolls.
3. **PDF page 1:** pass the whole plan with `maxHeight` set to the space left on the page. The function removes the last row from whichever term has the most rows until it fits, and reports what it left out in `terms[].more`. If `layout.height` is still larger than the space (a plan with very many terms), scale the whole drawing down to fit.

`mapSvg(layout)` in the same file is a complete reference renderer (it is what the prototypes use). Read it before writing the React and react-pdf versions; match its strokes and sizes.

Rules: never reorder or re-space what the function returns, never draw a strand that crosses another, and re-run the layout when the width changes (use a `ResizeObserver` on the container, not the window).

## 2. What must not change

- `src/engine/` and `data/`: no changes at all. This is a visual redesign.
- The content and order of the Plan tab, the questions, their wording from `copy.ts` and `data/`, saved-state keys, share links, privacy rules (no network, no analytics, no third-party scripts, no AI).
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
- **Tabs** (`DESIGN.md` 7.4a): Plan, Map, Resources under the header, sticky, as a real tablist. They replace the current `view` state's "Back to your plan" header and the two buttons at the foot of the page. "See the full map" under the milestone map switches to the Map tab. The prototype still shows the older doors; follow `DESIGN.md`.
- Move `design/map/confluence-map.js` to `src/app/map/`. Build a `ConfluenceMap` component as described in section 1a. Use it for the milestone map in "Where you're headed" and for the Map tab.
- **Resource boxes** (`DESIGN.md` 7.4b): rebuild `ResourceCard.tsx` as the box, line for line from the table there, using the fields and helpers it already uses (`summary`, `audience`, `needsEligibilityCheck`, `payLabel`, `seasonLabel`, `whereLabel`, `contactParts`, `lastChecked`, `t.goals`, `t.forYou`, `applyUrl`, `statusNote`). Show the summary in full and show the link's address in mono under the buttons. Use the box in the Resources tab (grid, grouped, filters above) and in the goal drawer's "Where to go". Do not write any new description text: if a field is empty, leave its line out.
- The Map tab replaces `chart/RoadmapChart.tsx`, `chart/nodes.tsx`, `chart/layout.ts`, `Timeline.tsx` and the chart/list switch. Remove `@xyflow/react` and its CSS overrides. **Confirm this removal with me before doing it.**
- `Competencies.tsx`: the dot-and-ring rows of section 7.4.
- `GoalDrawer.tsx` and `ResourcesTab.tsx`: sections 7.4 and 7.4b. In the drawer, split into two tabs (What to do / Where to go) only when a goal has more than three resources.
- Drop `lucide-react` icons from these surfaces in favour of words and typed arrows. Remove the dependency if nothing uses it.

**M5. The PDF**
- Rewrite `pdf/RoadmapPdf.tsx` to match `preview/pdf.html` and section 7.6: sage page background, the banner, the fitted confluence map on page 1 (`layoutConfluence` with `maxHeight`, drawn with react-pdf's `Svg`, `Path`, `Circle`, `Line`, `Text`), then the stand, the semesters with tick boxes, the resource boxes at the end (two to a row, the address printed in full under each name), and the footer.
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
- One solid blue call to action per screen. The current tab, a selected answer and an active filter are also solid blue; those are states and do not count.
- Rows with rules for choices and goals. Boxes only for resources. Tabs only where `DESIGN.md` 7.4a puts them.
- No decorative underlines, highlight bars, eyebrow labels in capitals, emoji, or icon grids.
- No new copy in a marketing voice. If you need a sentence I have not given you, write it plainly and flag it.
- The river never reacts to input, never restarts, and exists once.

## 6. Acceptance

1. Side by side with `design/preview/site.html` at 1440 by 900 and 390 by 844, each screen matches in layout, colour, type and spacing.
2. The canvas is created once and never unmounted from first paint to the results page; each change of screen is a camera move.
3. With reduced motion: no animation anywhere, every screen still shows its still river, and the flow works.
4. Any plan the engine can produce renders: check a first-year "by graduation" plan (the longest), a senior six-month plan (the shortest), and one with a goal title over 80 characters, on the page, the map and the PDF.
5. The three tabs work by mouse, touch and arrow keys, and stay reachable while scrolling. Every resource box shows what the resource is, who it is for, and at least one working link with its address visible; no box contains text that is not in `data/`.
6. PDF page 1 is the confluence map; steps print as boxes; text is selectable; nothing overflows a page.
7. The smoothness check passes at full speed and at 4 times slower on desktop and phone sizes.
8. `grep` of the built CSS finds no colour other than the four.
9. All test suites pass; engine and data are untouched (`git diff --stat` shows nothing under `src/engine` or `data`).

## 7. Report at the end

What is done, what is not, every decision you made that the design files did not cover, and anything in the design you think is wrong, with a screenshot.
