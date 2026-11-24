# Design research for the next look (2026-11-24)

The owner found the current design "a bit lackluster" and asked for real reference sites, then for mockups that take from them without copying the owner's personal style too closely. This file records what was looked at, what each source does well, and the three directions mocked up in `design/prototypes/redesign-2026-11/`.

Screenshots were taken at 1440×900 in a browser that loaded each public home page and scrolled twice. Nothing was clicked, so some captures show cookie banners. Screenshots of other sites are not stored in this repository.

## Sources

### Round 1: student learning and career sites, chosen to lean playful

| Site | What works | Worth taking |
|---|---|---|
| Handshake (joinhandshake.com) | A very tall, narrow all-caps headline (86px, leading about 0.8) carries the screen. One lime for every action. The main action is a big search bar. | Condensed type set huge and tight: Barlow Semi Condensed can do this. |
| The Forage (theforage.com) | A calm centred stack (two-line headline, one sentence, one button). A numbered 1→4 stepper joined by a line. A solid stats band. | A stepper on a line explains the product in four stops. |
| Roadtrip Nation (roadtripnation.com) | A green route line with map pins winds down the page and ties the sections together. Faint topographic contours fill the white space. | A path through the page, and texture instead of emptiness. |
| roadmap.sh | A dense directory: section labels with counts on the right, then tiles. | Counts on the right of section labels (the site already does this). |
| Brilliant (brilliant.org) | A serif headline with one italic phrase. The product (real lesson cards) is the decoration. A warm off-white background. | Show the plan itself on the landing. |
| Codecademy | Monospace as the brand voice. The headline sits in black label blocks over a photo. A faint dot grid. | Mono labels and a dot texture. |
| Scrimba | The home page is the catalogue: sidebar, filters, small tags. | Little; useful as a contrast. |
| Exercism (exercism.org) | Personality from small marks on the words: a highlighter stripe, underlines, a squiggle under headings. | Cheap playfulness using only type and colour. |
| Duolingo | One green does all the shouting. Short lowercase headlines. One idea per screen. Buttons with a darker bottom edge instead of a shadow. | One accent colour with one job. |
| Mimo (mimo.org) | A two-tone headline. Small monospaced labels in capitals above each heading. The real app shown in a frame. | Labels above headings; the product in a frame. |

### Round 2: award galleries and design-led references

Awwwards returned errors to the automated browser, so its winners were found by web search and then visited directly. Httpster, Minimal Gallery and CSS Design Awards were browsed directly.

| Site | Recognition | What works | Worth taking |
|---|---|---|---|
| aino.agency | Awwwards Site of the Day, 20 May 2026: "explore text as a medium" with ASCII, 2D physics and real-time morphing in about 30 kB of JavaScript | The whole page is a monospaced grid of characters. Shapes are drawn from ASCII on bone-white paper, with tiny type in the corners. | ASCII can carry a whole identity, not just a hero image. Restraint: one ink colour on paper. |
| GFI Career Pathways (pathways.gfi.org) | Listed on Awwwards; a career-map site for students | Bold illustrated scenes, a rounded menu pill, one yellow for actions, and career maps as the core content. | A career site can be warm and illustrated without looking childish. |
| Webflow University, interactive learning (Layout Land, by Refokus) | Refokus lists it as a Site of the Day | Black ground. Each game is a flat geometric drawing in one bright colour on a card. A huge tight headline. | Flat geometric marks (dots, lines, arches), close to the owner's Stereolab references. |
| teenage.engineering | A long-standing design reference (catalogue style) | Tiny labels in odd corners, ruled boxes, drafting-style product names, bilingual micro-type, products photographed like specimens. | The catalogue layout: small type in corners and ruled frames. |
| Stripe Press (press.stripe.com) | A long-standing editorial reference | A sliding marquee of book titles in a condensed serif, alternating italic and roman. Painted landscapes behind 3D books. Tiny bracketed mono labels: "[ NEW & FEATURED RELEASES ]". | Painterly landscape plus calm type. This site's ASCII landscape is the same idea in text. |
| The Pudding (pudding.cool) | A long-standing editorial reference | A grid of story cards, each in its own saturated colour field. Numbered issues (#229) with dates. Lowercase titles in a heavy condensed serif. | Numbered entries with dates, and one colour field per card. |
| Are.na | A long-standing design reference | Lettered lists ("a. b. c."), Times-style body, small grey text, lots of white. | Lettered lists for steps; quiet hierarchy. |
| NTS (nts.live) | A long-standing design reference | Univers Condensed in caps on black. A dense grid of cards with tag chips. A live bar on top. | Condensed caps for labels, tag chips. |
| Poolsuite (poolsuite.net) | A long-standing retro-OS reference | A Mac OS 9-style window on a flat pink ground, with a dock of icons. | The window frame for the ASCII (the owner's own "retro Mac window" component). |
| Gianluca Boccia (gianlucaboccia.me) | CSS Design Awards | A blank white page where a single line draws itself as you scroll. | One line drawing itself is enough motion. |

Not usable: Quizlet (a "verify you are human" check), Khan Academy (an error page for automated browsers), makingsoftware.com (a Vercel bot check), panic.com (server error 520). Godly didn't resolve, and SiteInspire rate-limited the visit.

## What the strongest references share

1. **One idea carries the identity.** aino is text; Stripe Press is painting plus type; Roadtrip Nation is the route line. This site's idea is its ASCII landscape of three streams joining one river, so it should appear beyond the cover.
2. **Small type in the corners, large type in the middle.** Seen on teenage engineering, aino and Stripe Press. A big condensed headline next to 15px mono labels gives the contrast the current page lacks.
3. **One loud colour with one job.** Duolingo, Handshake and GFI. On this site, sand should only ever mean "do this now".
4. **The product is the picture.** Brilliant, Mimo and Stripe Press. The plan should be visible on the landing.
5. **Texture instead of empty space.** Contours, dot grids, paper grain. The ASCII and a faint dot grid can do this.
6. **Playfulness from marks, not mascots.** Exercism's highlighter, Pudding's numbered entries, Are.na's lettered lists.

## Three directions (`design/prototypes/redesign-2026-11/`)

Each mockup shows the landing and the top of the Plan tab, desktop and phone, with real plan data: a computer science sophomore in fall, 5 hours a week. The ASCII landscape is kept in all three, with its sky hatching removed (the owner asked to keep it with a bit taken out). The scene is a prototype copy (`scene-proto.ts`) with a palette option; the shipped scene is unchanged.

- **A. Field guide** (Stripe Press, teenage engineering, the owner's drafting marks). Bone paper with a faint dot grain, warm charcoal ink, slate violet as the one highlight.
  - The ASCII sits in a retro window titled "confluence.txt", with crop marks and a ruler under it.
  - The plan reads like a catalogue page: the semester on the left with an hours meter, "Do this now" in a window, and goals as ruled rows.
  - It leaves the current four-colour palette, so adopting it means rewriting the colour rules in design/DESIGN.md.
- **B. Route** (Roadtrip Nation, GFI, Stereolab's dot on a line). Keeps the site's four colours and navy landing.
  - The ASCII becomes a wide band along the bottom of the landing, with three stops on a line under it: where you are, where you're headed, this semester's steps.
  - The plan becomes a route: a vertical line, solid through this semester and dashed ahead, with a pin per semester and "you are here".
  - The smallest change from today.
- **C. Text mode** (aino, Are.na, NTS). Dark warm umber landing, bone plan, sand as the one highlight.
  - A four-column strip of mono labels at the top and bottom; the ASCII fills the right half.
  - Lettered steps (a. b. c.) and a text hours bar `[####·] 4 / 5 h a week`.
  - Also leaves the four-colour palette.

Open a mockup with the dev server running: `npm run dev`, then `/design/prototypes/redesign-2026-11/a-field-guide.html` (or `b-route.html`, `c-text-mode.html`).

## Chosen: A, Field guide (2026-11-24)

The owner picked direction A. `app-field-guide.html` loads the real app with `field-guide-theme.css` laid over it, to show how the intake and results pages change. It's a light touch: the same layout, with new tokens and a few component tweaks. Open it with `npm run dev`, then `/design/prototypes/redesign-2026-11/app-field-guide.html`.

- **Tokens:**
  - sage becomes bone paper (#e8e3d7) with a faint dot grain;
  - blue (structure) and ink (sentences) both become warm charcoal (#34302c);
  - sand becomes window chrome (#dcd6c8);
  - green (done) becomes verdigris (#4e716d);
  - slate violet (#545684) is new, for must-do dots and link underlines.
- **"Do this now"** becomes a retro window with a striped title bar, in place of the solid blue block.
- **Small mono facts** turn warm grey, and headings are set a little tighter and larger.
- **Unchanged:** the question sheet's drafting corners, the progress river, the drawer, the tabs and the resource cards. They only take the new colours.

Shipping it means updating design/DESIGN.md's colour rules and the contrast test, then moving these overrides into `src/app/styles.css`, together with the new landing from the mockup.

## Colour with a job (v2, 2026-11-24)

The owner found v1 hard to read with so little colour. Two simulated students went through the v1 prototype end to end with a scripted browser, then through v2:
- **Maya:** first year, on a phone, Rutgers–Newark.
- **Sam:** third year, on a laptop, another school.

Each run covers landing, every intake screen (including pressing Continue with nothing picked), review, the Plan tab, a goal drawer with two steps ticked, marking the goal done, then Map, Resources and Courses.

### Where charcoal alone failed

| Moment | What the student needs to see | What v1 showed |
|---|---|---|
| Continue with an answer missing | Which question, and what to do | A grey panel and bar nearly the colour of the paper; the screen barely changed |
| Picking an answer | That it took, and that it's theirs | A charcoal bar, the same as the Continue button, the active tab and a must-do tag |
| Opening the plan | Where to look first | The semester strip and "Do this now" with the same weight as everything below |
| "Go to: FAFSA, …" in goal rows | That these are places to go | Charcoal text with a thin underline, lost in dense rows |
| Ticking steps, marking done | That progress happened | Verdigris so dark it read as charcoal |

Tabs, filters, headings, must-do tags, the map and the resource cards read fine in charcoal. They stay charcoal.

### The rule: one colour per job (`field-guide-theme-v2.css`)

| Colour | Job | Used for | Contrast |
|---|---|---|---|
| Slate violet #545684 | Yours, or a way out | Answers you picked (radios, checklist picks, "Already done?" picks) and links | 5.4:1 on bone, both ways |
| Ochre #dcb878 (line #96773d) | Look here first | This semester's strip and the "Do this now" title bar; a missing answer (bar and panel); the line beside a notice | Charcoal on it 7.0:1; the line 3.3:1 (non-text) |
| Verdigris #3f7f73 | Done | Ticks, the drawer's progress bar, done dots | 3.7:1 (non-text, never words) |

Nothing else gets colour. To view it, run `npm run dev` and open `/design/prototypes/redesign-2026-11/app-field-guide-v2.html`.

## Built (2026-11-24)

Direction A with the v2 colour jobs is now the site. design/DESIGN.md §2 and §7 hold the rules.
- **Colours:** in `src/app/styles.css`, enforced by `src/app/contrast.test.ts`.
- **Landing:** the hero from the mockup, with "this semester." on the ochre band (the owner chose ochre over violet, which is kept for picks and links). The ASCII painting sits in its window, warm-toned, with no sky hatching.
- **See a sample plan:** a made-up student, held in memory only. It never touches a saved plan.
- **Plan tab:** the mockup's two-column sheet. On the left, this semester with the hours meter; on the right, "Do this now" as a window. On a phone, the panel is compact so it and "Do this now" share the first screen.

Checks run:
- unit tests, browser tests on laptop and phone (landing and sample plan included);
- an axe WCAG 2.1 AA scan of the landing, sample plan, resources, and a question with a missing and a picked answer, at 1440 and 390 px (no violations);
- the two simulated students end to end.
