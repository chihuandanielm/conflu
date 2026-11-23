# Landing redesign: the painted confluence, and the end of the session river (2026-11-23)

## Decisions

- The landing is a navy page (`#2F3F6E`) with an ASCII landscape: three streams in the foreground join one river that
  runs to a vanishing point under a low sun. It paints itself in once per visit (about 2.6 s), then only the water moves.
- The animated ASCII river that ran behind every screen is gone: no river behind the landing, the questions, the build
  step, or the results header. The results page keeps its confluence maps (goal streams with dots joining one river).
- "Build my plan" fades the navy away into the sage of the questions, slowly enough that the colour change is gentle.
- The results header loses the "headed for" label.

## What changes

| Area | Before | After |
|---|---|---|
| App shell (`App.tsx`) | `RiverProvider` mounts one canvas for the whole session; a "building" view runs `river.celebrate` for 900 ms before results | No river provider. Intake hands straight to results with the shared 520 ms screen fade |
| Landing (`intake/Intro.tsx`) | Camera starts low over the river, holds 2.3 s, rises; "Skip intro"; words masked out of the river | `landing/Landing.tsx`: navy page, painted scene (`landing/scene.ts`) with a paint-in, headline and button fade in at 0.8 s, then How it works, A real plan (built by the engine), numbers, closing button. The returning-visitor buttons stay |
| Landing to questions | Camera follows the river to the water's edge (3.2 s); questions fade in after 1.78 s | Landing words fade out (0.35 s), the page scrolls to the top while nothing shows, the navy layer fades to sage (1.1 s), then the question sheet fades in (0.35 s) |
| Questions (`IntakeFlow.tsx`) | River band at the bottom of the screen; 34 dvh bottom margin to keep controls above the water | Plain sage page; normal bottom margin |
| Questions to results | Questions fade, fish hop faster for 0.9 s, camera turns downstream (2.6 s), results words fade in at 1.5 s, staged mount | One 520 ms fade between two sage screens; results render at once |
| Results header | River behind the header, masks under the title and buttons, clip as the page scrolls, pause when hidden; "headed for" label | Plain header on sage; the destination line stays, without the label |
| Results back to questions | River given the whole screen back before leaving | Plain fade |
| River code | `src/app/river/` (river.js, RiverProvider, tests), `design/check-smoothness.cjs` measuring it | Removed. `PALETTE` (used by the confluence map and the PDF) moves to `src/app/palette.ts` |
| Colour tokens | Five colours | Plus `--navy` `#2F3F6E` for the landing (sage on navy 8.1:1, sand on navy 5.7:1). The painting's own tints live in `scene.ts` and are documented as the one exception |
| Rules | CLAUDE.md: "One river for the whole session; screens change by moving its camera" | The landing's painted scene; screens change by fades |

## The paint-in (landing/scene.ts)

- Computed once per size: every cell's glyph, tone and the time it appears. Frames only decide which cells are visible.
- Order, back to front: sky hatching sweeps down from the top (0–0.7 s); the sun and its glow come up (0.3–0.9 s);
  mountains resolve from the horizon upward, each cell flickering through random glyphs for 0.18 s before it settles
  (0.5–1.5 s); tree line and meadow (1.1–1.8 s); then the river is traced last, the three streams from the bottom up,
  joining and running to the vanishing point (1.5–2.6 s). Every cell has a little jitter so edges grow organically.
- Drawn as one string per tone per row (about 7 × rows calls to `fillText`), so a frame costs a few milliseconds even
  with 40,000 cells; it runs on every animation frame (60 fps or the display's rate).
- After the paint-in, the still scene is cached on an offscreen canvas and only the water is redrawn, at 30 fps.
- Plays once per browser session (`sessionStorage`); coming back to the landing shows the finished painting.
- Reduced motion: the finished painting, no shimmer. Paused when scrolled out of view or when the tab is hidden.
- The button works from the first frame.

## Things that could glitch, and the guard for each

- Clicking the closing button at the bottom of a long landing: scroll to the top only while everything is invisible.
- Resizing during the paint-in: rebuild the cells and finish at once (no half-painted resize).
- Fonts: the canvas waits for the self-hosted Plex Mono before measuring glyph widths.
- Unmounting during the paint-in (a fast click): the animation frame and observers are cancelled in cleanup.
- Back from the first question to the landing: the same fade in reverse (sage to navy), and the painting shows finished.
- A shared link that opens the review: starts on sage, no navy layer.
- Tests run in jsdom (no canvas): the scene does nothing there.
