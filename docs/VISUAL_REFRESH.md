# Visual refresh: bold type, clearer sections, honest time (2026-11-23)

Source: a student simulation on phones (a first-semester CS freshman at New Brunswick, a spring accounting junior at
Camden, a second-year psychology student outside Rutgers), the approved mockup, and the decisions below.

## Decisions

- Third font: **Barlow Semi Condensed** (700 for headings and the "Do this now" step, 600 for goal titles, resource
  names and labels). Quantico stays for sentences; IBM Plex Mono for numbers, codes and dates. Self-hosted.
- Keep the free-hours question; change how time is shown (see "Time").
- The mockup's layout, separations and order (below).

## What students struggled with (ranked by harm)

1. Everything had the same weight: light headings, light titles, light body. No anchor for the eye.
2. The destination ("Land your first role in ...") sat two screens down, under the draft banner.
3. The draft banner's solid "Finalize my map" competed with "Do this now" in the middle of the Plan tab.
4. Sections blurred: a faint dotted rule was the only separation.
5. "Good to know" looked as urgent as "where you stand" (both sand panels).
6. Fact lines read as code (`:: foundation 4 h`, `>> experience 300 h`); priority only showed inside the drawer.
7. Hours read as impossible: "Learn Python basics 30 h" next to "5 free hours a week".
8. Coming up looked like This semester, so later work felt urgent.
9. Resources on a phone: a full screen of filters before the first resource, and filler on every card.
10. Courses: four paragraphs before the first course; the progress counter mid-page.

## Visibility order (Plan tab)

1. Do this now: the one action and where to go.
2. Where you stand, in numbers (term, goals, must-dos, done, hours used of hours free).
3. This semester's goals, each with its priority, time and places.
4. The destination, as one line in the header.
5. Coming up (the next two semesters as bands; later ones folded).
6. The big picture: milestones, what you have, what you need.
7. Housekeeping: a one-line draft-map note, habits, footer.

## Build order (one PR, staged commits)

| Step | What | Files |
|---|---|---|
| R1 | Type foundation: Barlow, `--font-display`, bold headings and titles; DESIGN.md rules (3px section rule, next-semester band, green progress bar in the drawer); contrast and type tests | styles.css, DESIGN.md, tokens.css, CLAUDE.md, contrast.test.ts |
| R2 | Time: per-week for this semester and total, "once" for short tasks, "full-time, one summer" for blocks; fact lines in words; "uses about X of your Y free hours a week"; question reworded; an hours control in the status strip that re-plans | map/facts.ts, results/*, intake/copy.ts, state/plan.ts |
| R3 | Plan tab: header "headed for", status strip, Do this now with a go-to box, SectionHead, goal rows with priority tags, quiet Good to know, Coming up bands, The big picture, draft one-liner | results/* |
| R4 | Drawer (bold title, progress bar, numbered steps, done when, then where to go); resource cards (bold name, one fact line, how to reach on sand, no filler); Resources filters folded on phones; Courses counter first; Map keeps the full draft banner | GoalDrawer, ResourceCard, ResourcesTab, OnTrack, EditMap |
| R5 | PDF type and time labels; docs; validate, test, vitest, tsc, e2e (desktop and phone); screenshots; PR | pdf/*, docs |
