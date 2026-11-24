# Confluence: design logic for Career Pathway Mapper

Read this before changing anything visual. It holds the rules; the prototypes in `preview/` show them applied; `map/confluence-map.js` is working code to reuse (`river/river.js` is the retired session river, kept for reference), not sketches.

The content of the site (questions, goals, tracks, resources, wording that comes from `data/`) will change. These rules should not need to. Every rule below is written so it holds for any number of questions, terms, goals or words.

---

## 1. The idea

A student's plan is a river. Things they have done and things they will do are streams. They join one at a time, the river gets wider, and it runs to one place: the outcome they chose.

That one picture is used in three places, and nowhere else is decorated (2026-11-23, docs/LANDING_REDESIGN.md):

| Where | What the picture is |
|---|---|
| Landing | A painted ASCII landscape on navy (`src/app/landing/scene.ts`): three streams in the foreground join one river that runs to a vanishing point under a low sun. It paints itself in once per visit; then only the water moves. |
| Results page and PDF | The confluence map (`map/confluence-map.js`): every goal is a line that joins the river in its semester and stays in it to the end. |
| Small places | A fish on the progress line. A dot beside a goal. A dotted sand rule between parts of a page. |

The animated river that used to run behind every screen (and the camera moves between screens) is gone: the questions and the results sit on plain sage, and screens change by fading.

## 2. Colour: bone paper, warm charcoal, and three accents with one job each

Direction A, "Field guide" (2026-11-24, docs/DESIGN_RESEARCH.md). The page is bone paper and warm charcoal. Colour is
added only where a student needs it: simulated students walked the site in charcoal alone, and five moments failed (a
missing answer, a picked answer, where to look first, links in goal rows, done). Each accent has one job and is used
for nothing else. No white, no tints made with opacity, no shadows. The paper has a faint dot grain (an SVG tile).

The token names are kept from the first palette so class names stay stable.

| Token | Hex | Job | Share of a screen |
|---|---|---|---|
| `--sage` | `#E8E3D7` | Paper: bone. Every background. | most of it |
| `--ink` | `#34302C` | Words: warm charcoal. Every sentence, label and fact. | the text |
| `--blue` | `#34302C` | Structure, in the same charcoal: headings, rules, borders, buttons, tabs, filters. | lines |
| `--violet` | `#545684` | **Yours, or a way out.** The answers you picked (radios, checklist picks, "Already done?" picks), links, a must-do dot, the focus ring. | a few marks |
| `--sand` | `#E2C38A` | **Look here first** (an ochre fill, ink on it). The headline's "this semester." band, the "Do this now" title bar, a missing answer's panel, the sample plan's note, the closing panel on the landing. | a little |
| `--ochre` | `#96773D` | The line for "look here first": the bar beside a missing answer or a notice, and the hours meter. Never words. | almost none |
| `--green` | `#356B61` | **Done** (verdigris). Ticks, the drawer's progress bar, done dots, the on-track label (paper text on it). | almost none |
| `--umber` | `#2B2420` | The dark ground inside the landing's window, behind the ASCII painting. | one window |

Rules that follow from the jobs:

1. **Sentences are ink on paper (10.2:1) or ink on the ochre fill (7.7:1)**, past the 7:1 of WCAG AAA. Paper text on violet (5.4:1) or on green (4.8:1) is for short labels: a picked answer, a done label.
2. **Violet means it's yours, or it takes you somewhere.** A picked answer is a violet fill with paper text, so it never looks like the Continue button or a tab. Links are violet text. Tabs, filters and the experience tabs are views, not answers, so they stay charcoal.
3. **Ochre means look here first.** This semester's panel and "Do this now" read as one warm block; a missing answer gets the ochre bar and panel. Ochre never decorates.
4. **Green means done.** As a fill it only sits behind a tick, a done label or a progress gauge; as a line, only beside "Done when".
5. **Meaning never rests on colour alone.** A must-do has a filled dot and the word "must-do". A picked answer is also a filled block (`aria-checked`). A missing answer also has words saying what to pick.
6. **Nothing moves when pressed or hovered.** Hover fills a button or underlines a row's title; rows never shift sideways.

`src/app/contrast.test.ts` reads the tokens: it fails if ink on paper or on the ochre fill falls under 7:1, if charcoal or violet on paper, paper on violet or paper on green falls under 4.5:1, if the ochre line or green falls under 3:1 against paper, if any other colour appears, if words are set in sand, ochre or green, if a sand fill carries anything but ink, or if a violet or green fill carries anything but paper-coloured text.

## 3. Type

Three families, all self-hosted through `@fontsource` (no third-party requests). Barlow Semi Condensed was added on 2026-11-23 so the site has real bold type for what matters; see docs/VISUAL_REFRESH.md.

| Family | Used for |
|---|---|
| **Barlow Semi Condensed** 700 / 600 | 700: every heading (`h1`–`h3`), the "Do this now" step, the one solid button, "conflu" in the PDF masthead. 600 (`.title`, `.label`): goal titles in lists, resource names, the term in the status strip, semester bands, "Part of", the destination line. Never a sentence. |
| **Quantico** 400 | Everything meant to be read as sentences: body, questions, options, steps, buttons. |
| **IBM Plex Mono** 400 (600 for the fish) | The river. Numbers, codes and dates: hours, term names, kinds of goal, course codes, dataset and engine versions, key hints. Never a sentence. |

| Token | Size | Use |
|---|---|---|
| `--text-hero` | 36 to 64px, fluid | Landing headline only |
| `--text-h1` | 28 to 40px | The question; "Your plan"; the outcome |
| `--text-h2` | 22 to 28px | Section headings; the step in "Do this now" |
| `--text-lead` | 20px | A goal's title in a list |
| `--text-body` | 17px | Body. |
| `--text-small` | 15px | Supporting sentences under a title. **The floor: nothing on screen is smaller than 15px.** |
| `--text-fact` | 15px mono | Numbers, codes and dates only |

Sentence case everywhere. No all-caps labels, no letter-spaced eyebrows, no decorative underlines, no highlight bars behind words. The only underline is on a text link.

## 4. Line, space, shape

- One line weight, **1.5px**, for every rule and border. **3px** for a must-do stream, the bar beside a note, and the rule above every major section heading (`SectionHead`: a 3px blue rule, the bold title, a count in mono on the right). The section rule replaces the dotted shore between parts of the results page; the shore stays for semesters on the map and the PDF.
- Corners are square. No radius except the round dots.
- No shadows of any kind, including flat offset ones.
- Spacing steps: 8, 16, 24, 40, 64, 96.
- **Rows for choices and goals, boxes for resources.** A list of options or goals is a ruled list: a 1.5px blue line above the first row and under each row. A resource (a program, office, tool or guide the student will leave the site to use) gets a box, because it is a thing to pick up and act on: see 7.4b. Nothing else is boxed.
- **Drafting corners** (`.corners` in `tokens.css`): four small corner marks frame the question sheet. They frame without boxing. Use them on the question sheet only.
- **The shore** (`.shore`): a 1.5px dotted sand rule between major parts of a page, and across the map at each semester.
- **The dot** (`.dot`): 11px. Open ring = a goal. Solid blue = a must-do. Solid green = done.

## 5. Words

The landing page explains the site in plain sentences a student would say to a friend. The pattern to keep when the wording changes:

1. The name of the site, small, as plain text.
2. The headline: "Many streams, one plan."
3. One or two sentences on what you tell it and what it gives back.
4. One or two sentences on time, privacy and what kind of thing the result is. The phrase "a general trajectory, not a blueprint" stays.
5. The button.

Not used anywhere: bullets drawn with symbols, taglines, three-word slogans in a row, icons beside every sentence, words like "journey", "unlock", "seamless", "empower", exclamation marks. Buttons say what they do ("Start", "Continue", "Build my plan", "Open this goal", "Mark as done").

Arrows are typed (`->`, `<-`), in mono. Icons are not needed on any primary surface; if one is ever required, it is a 1.5px blue line icon and it sits beside a word, never alone.

## 6. The eight kinds of goal

A legend, like a map's. The glyph and the word always appear together, in mono.

| Kind | Glyph | Shown as |
|---|---|---|
| foundation | `::` | `:: foundation` |
| presence | `@` | `@ online presence` |
| skills | `#` | `# skills` |
| experience | `>>` | `>> experience` |
| network | `&` | `& networking` |
| credentials | `*` | `* credentials` |
| academics | `=` | `= academics` |
| applications | `->` | `-> applications` |

They live in `LANE_GLYPH` and `LANE_NAME` in `map/confluence-map.js`. A new kind of goal needs one new entry there and nothing else.

The fact line under any goal is always in this order: kind, hours, `must-do` if it is one, `continues` if it runs past the term. Example: `# skills  15 h  must-do  continues`.

---

## 7. Screens

### 7.1 Landing

Direction A, "Field guide" (2026-11-24, docs/DESIGN_RESEARCH.md): a catalogue page on bone paper.

- **Masthead:** the conflu mark and name on the left, "a career plan, one semester at a time" in mono in the middle (from 900px), "no account needed" in mono on the right, a 1.5px rule under it. No buttons in it.
- **Hero:** words on the left, the painting on the right (from 900px; on a phone the words come first and the window sits under them). A drafting kicker ("for college students" after a short rule); the headline "Know what to do **now.**" in bold Barlow, the last word on the ochre "look here first" band with charcoal text; "Tell it your major, your year and your career goal. You get a plan for each semester, with proper resources and programs in about 3 minutes."; then stacked square buttons: **Build my plan** (solid charcoal) and **See a sample plan** (outline, "+", which becomes "Hide the sample plan", "-"). A returning visitor sees "Continue your plan" or "Continue where you left off", and "Start over" as a text button.
- **The painting** sits in a retro window (a striped charcoal-hairline title bar with two small squares, no label), on the umber ground, with two crop corners outside it, a ruler under it, and the caption "A confluence of streams will carry you toward your goal". The sky hatching is gone: the sky is the window's umber, and only the sun's glow is drawn.
- **The paint-in (first visit in a browser session):** back to front over about 2.6 s; the sun blooms, the peaks resolve with each cell flickering through random glyphs for 0.18 s, the tree line, meadow and pines fill in, and the river is traced last. Afterwards only the water shimmers (30 fps). Reduced motion: the finished painting, still.
- **Then:** How it works (three cells, "step 1" in mono), "The whole path, as a map": the sample student's plan drawn as the confluence map (its must-do and high-priority goals, yearly rounds left out, each a stream joining the river toward the career goal) in a window; any goal name expands the sample plan, four numbers from the data, an ochre closing panel with the button, and the large wordmark.
- **The painting's colours** are seven warm tones in `scene.ts` (umber, warm grey, slate violet, grey-violet, dusty rose, ochre, bone). They are the one exception to the colour tokens and only ever appear in the painting. Its glyphs are 6px: an image made of characters, not text to read.
- **See a sample plan** expands the full, working results page for a made-up student (`src/app/state/sample.ts`) in place, right under the hero, and scrolls to it. The landing's headline stays the page's one h1; the plan's title is an h2 ("sample plan" as its kicker). An ochre note says whose plan it is and that nothing is saved, with "Build my own plan ->", which starts the questions; "Edit answers" opens the review filled with the sample's answers. Everything works (drawers, ticks, done, the hours, every tab), all in memory: no plan, answers, step ticks or course ticks are stored, so it never mixes with a student's own plan.
- **Leaving:** every button runs the same exit. The words fade (0.35 s), the page jumps to the top while nothing shows, then the next screen fades in.

### 7.2 Questions

Every question uses one shell. Changing, adding or removing questions never touches layout.

- **Background:** plain sage. No picture behind the questions.
- **Progress** (top, 640px column): one mono line. Water behind the fish, a green fish at the current position, dots ahead. Under it, "Question 2 of 16" in words. `role="progressbar"`. The fish count comes from the number of question steps, whatever that is.
- **The sheet** (640px column, drafting corners):
  1. the question (`--text-h1`)
  2. help, if any (body)
  3. why we ask, if any (`--text-small`)
  4. the control
  5. Back (outline, left) ... Skip (text button, when optional) and Continue (solid, right)
  6. the keyboard hint in mono, hidden under 600px
- **Controls, all the same language:**
  - *One choice:* ruled rows, 54px tall, a mono key number in a small square, the label, an optional second line. Hover underlines the label. Selected is solid blue.
  - *Many choices (experience, skills, identity):* the same ruled rows with an open square instead of a key number; selected rows are solid blue with a tick in the square. Groups get a `--text-lead` heading and a shore rule between them. Search is a ruled input (bottom line only).
  - *Pickers with long lists (major, track):* suggested rows first, then "Show all" as a text button that opens the rest in the same list.
  - *Hours:* five rows like any single choice. No slider.
- **Review screen:** the same sheet. Each answer is a ruled row: the question in `--text-small`, the answer in body, "Change" as a text button on the right. "Build my plan" is the solid button.
- **Between questions:** the sheet slides 18px left and fades out (260ms), the next comes in from 18px right.

### 7.3 Building the plan

There is no separate screen and no camera move. "Build my plan" fades the review out and the results in (300 ms each), and the results page starts at the top. The engine is instant.

### 7.4 Results

Top to bottom (2026-11-23, docs/VISUAL_REFRESH.md). The first screen answers "where do I stand and what do I do now?";
the big picture comes after the work.

| # | Part | Design |
|---|---|---|
| 0 | **Header** | Paper, no picture. The title is where the student is headed, large ("Land your first role in software engineering"), after a drafting kicker "your plan"; the summary line in lowercase mono; then outline buttons in one row: Download PDF, Share link, Edit answers. "Start over" is on the Edit answers screen. |
| 1 | **This semester + Do this now** (direction A) | A two-column sheet from 900px. Left: "this semester" in mono, the term in large bold Barlow, "Uses about 4 of your 5 free hours a week. 4 goals · 1 must-do · 0 done.", the **hours meter** (one cell per free hour a week: ochre for hours this term uses, open for hours left, an ochre outline past the budget) and the "Free hours a week" control, which re-plans at once; it stays in view while the right column scrolls. Right: **Do this now** as a retro window with an ochre striped title bar: "step 1 of 5 · part of (goal) · must-do" in mono, the step in bold Barlow, a framed violet "go to (place) ->" link, "Open the full goal". Then "Already done any of these?". On a phone the panel comes first in a compact form (no mono labels, a smaller term), so the hours control and "Do this now" are both on the first screen. |
| 2 | **This semester** | Section head with the goal count. Ruled rows: dot, title in Barlow 600, a priority tag (must-do solid, others outlined) and the time in words, "Next: (first unticked step)", and "Go to:" with the best one or two places, linked. Three shown, "Show all N". Then **Good to know**: quiet notes with a 3px ochre line (never a fill, so a tip never looks as urgent as "Do this now"). Then "Why this order" as a text button. |
| 3 | **Your path** (Phase 4, 2026-11-24) | Section head with the milestone count. An outlined box: "Where you're headed" in mono, the outcome in Barlow 600, the milestone map, "See the full map". Then "Semester by semester": one folded band per year ("+"/"-", the year in Barlow 600, "3 semesters · 15 goals" in mono; solid blue while open), each holding its semesters under small headings with the smaller rows. Then two more folded bands: "When you have more time" and "What you have and what you need". Everything after this semester is one tap away, so the Plan tab stays under about 3,000 px on desktop. |
| 5 | Draft line | One dashed box: "This is a draft map · N extra options to review" and "Review on the Map tab ->". The full banner and "Finalize my map" are on the Map tab. |
| 6 | Checked off, Habits to keep | Checked off: rows with green dots and "Undo". Habits: open dots, the reason in `--text-small`. |
| 7 | Footer | The footer sentence with dataset and engine versions in mono. |

**Time, in words** (`src/app/map/facts.ts`). A goal's time is never a bare "30 h", which reads as 30 hours a week. A short task (6 hours or less in all) reads "about 4 hours, once"; a longer one "~2 h a week this semester (30 h in all)", divided by the weeks left in the term (the current term is partly over); a full-time block "full-time, one summer"; a goal done in coursework "inside your coursework". The fact line is "kind · time · must-do · continues", with no glyphs; the map uses a short form ("~2 h a week").

**The goal drawer** opens from any goal, anywhere. A side sheet on the right (480px, 1.5px blue left edge) on wide screens; a bottom sheet under 600px. No dimming behind it; the page behind is inert. One scroll, in this order: Close, the term, the title in bold Barlow, the priority tag and the time in words, **What to do** under a 3px rule (a green progress bar, then numbered steps as tick boxes; a ticked step turns green and is struck through in green; a step that names one of the goal's places, or "your career center" when one of them is a career office, links it), **Done when** with a 3px green bar, **Where to go** under a 3px rule with a place count (resource boxes), **Why it's here**, then "Mark as done" as the solid button. It slides in over 260ms.

**The full map** is the Map tab. It is the confluence map with every goal. Each name is a real button that opens the drawer. Under the map, the skills picture: one row per competency, a 1.5px line from 0 to 1 with a green dot at "now" and an open blue ring at "target", the name on the left. This view replaces the React Flow chart and the chart/list switch: the map is already a list in document order, and it is one-sided on a phone.

**All resources** is the Resources tab: see 7.4b.

### 7.4a Tabs

The results page has up to four tabs, directly under the header: **Plan**, **Map**, **Resources**, and **Courses** (for a Rutgers major: the courses the major requires by year, from the newest catalog, with the catalog's name, the date it was last checked, and a link to the official page).

- A row of text tabs sitting on a 1.5px blue line that runs the width of the content. Each tab is at least 48px tall; 20px side padding and `--text-body` on wide screens, 6px and `--text-small` on a phone, sized to its label so every label fits.
- The current tab is solid blue with sage text. The others are plain blue text; hover fills them the same way a button does.
- A count in mono follows the label where it helps: `Map  28`, `Resources  41`.
- The tab row sticks to the top of the window once the header has scrolled away, on a solid sage background with the blue line under it, so the student can switch from anywhere on the page.
- There are only ever a few tabs. Do not turn them into a menu.
- Real tabs: `role="tablist"`, `role="tab"` with `aria-selected`, `role="tabpanel"`; left and right arrow keys move between them; the choice is not saved (a returning student lands on Plan).
- Switching tabs fades the panel (260ms, opacity only) and scrolls to the top of the panel. The river in the header does not react.
- The goal drawer has no tabs: it is one scroll (7.4).

### 7.4b Resource boxes

A resource is where the plan hands the student to the real world, so each one says plainly what it is, who it is for, what it costs or pays, when, and exactly where to click. Every word in a box comes from `data/resources/*.json` or the existing helpers in `src/app/resources/`; nothing is written for the box.

The box: a 1.5px blue border, square corners, sage inside, 20px padding, no shadow. Inside, top to bottom:

| Line | Content | Source | Style |
|---|---|---|---|
| 1 | Name | `name` | bold Barlow, 21px |
| 2 | Where it is from, and the kind of thing | `whereLabel(r)`, `type` | mono fact line, for example `rutgers new brunswick  campus office` |
| 3 | What it is | `summary` | body, in full, never cut short |
| 4 | Who it is for | `audience(r)`; add "Check eligibility." when `needsEligibilityCheck` | `--text-small` |
| 5 | Cost or pay, season, deadline | `payLabel`, `seasonLabel`, `typicalDeadline` | joined onto line 2's fact line with " · "; leave out what is empty |
| 6 | Helps with | the goals from the plan that point to it (`t.goals`) | `--text-small`, "Helps with: ..." |
| 7 | How to reach them | `contact.how`, then email, phone, place from `contactParts(r)` | `contact.how` on a sand panel (it is the thing to do), the rest `--text-small`; email and phone are links. A `how` that only says "Use the contact or apply page on the home site" is left out: the Visit site button says it |
| 8 | Links | "Visit site ->" always; "Apply ->" when `applyUrl` exists. Under them the address itself in mono (`careers.rutgers.edu`), so the student sees where the link goes before clicking | outline buttons, 42px; the first one in a box is never solid |
| 9 | Small print | "Link last checked 16 Nov 2026" from `lastChecked(r)`; and the status note when `status` is not `active` | mono; the status note gets the 3px sand bar on its left, like any notice |

- "For students like you" (when `t.forYou`) is a green dot before the name with those words after it in `--text-small`. It is about the student, so it may be green; it is still said in words.
- **Resources tab:** opens on **This semester** (Phase 4.3): a "When" row ("This semester" / "Whole plan"), shown on phones too, keeps only the resources for this semester's goals; "Whole plan" shows every resource tied to the plan or open to the student's year and major. Boxes in a grid, 340px minimum column, 16px gaps, one column on a phone. Grouped by the groups in `data/ui/resources.json`, each group under a `--text-h2` heading with its count in mono and a shore rule above. Boxes in a row are the same height; the links sit at the bottom of each.
- **Filters** sit above the grid as a row of text toggles (selected = solid blue), with "Clear" as a text button. The existing filter logic stays.
- **In the goal drawer** ("Where to go"): the same box, full width, stacked with 12px gaps. Lines 6 and 9 may be left out there.
- **Links open in a new tab** with `rel="noopener noreferrer"` and a screen-reader phrase naming the resource, as today.

### 7.5 The confluence map

`layoutConfluence(model, options)` returns plain geometry; draw it with SVG on the page and with `<Svg>` in the PDF. `mapSvg()` is the reference renderer.

How to read it, and so how it must be drawn:

- A ring with a green dot at the top: **you are here**. From it runs the student's own line, 2.4px.
- Each semester begins at a dotted sand rule with its name in mono.
- Each goal is a dot beside its name. A line leaves the dot, runs toward the middle, turns downstream with a small curve, and then runs straight down beside the others to the bottom. Lines never cross: a goal on the left always takes the next lane on the left, a goal on the right the next on the right.
- A must-do has a solid dot and a 2.4px line. Other goals have an open dot and a 1.1px line. A finished goal has a green dot and a green line, and its fact line reads "done".
- At the bottom the lines end on a short bar; one line carries on to a solid dot, and the outcome is written there in bold.
- A goal that runs over several semesters joins once, where it starts.
- **Wide (560px and up):** river in the middle, names on both sides, two to a row. **Narrow:** river on the left, names on the right.
- **Too much to fit** (`maxHeight`, used by the PDF): the semester with the most rows gives up its last row, repeatedly, until the map fits. Each semester then says "(+3 more in the list)". Goals are already in priority order, so the ones that stay are the ones that matter most. If a plan has so many semesters that one row each is still too tall, the caller scales the drawing down.

### 7.6 The PDF

US Letter, sage background on every page, 54px (40pt) side margins. `prototypes/pdf.html` is the reference at the same size; build the real one with `@react-pdf/renderer` from the same data and the same `layoutConfluence`.

| Page | Contents |
|---|---|
| **1. The map** | A centered masthead: the conflu mark (the favicon's confluence drawn out: three parallel streams joining at a green dot, running on to a ring with a small dot beside it), "conflu" in Quantico, a faint drafting rule with sand ticks ending in a dot at each side, and "career pathway mapper" in mono. No ASCII on the page. "Your plan", the summary line, the outcome. Then the confluence map, two-sided, fitted to the rest of the page with `maxHeight`. This page alone should tell a student where they are going and in what order. |
| **2. Where you stand** | What you have / What you need in two columns. The "Start here" block, solid blue. Notices with the sand bar. Then "This semester" begins. (The PDF keeps this order; sentences are ink, headings blue.) |
| **2 onward. This semester and next** | A semester heading on a dotted sand rule. Each goal is drawn as a piece of its stream: a vertical line down the left (3px for a must-do), a dot on it, and to the right the title, the fact line, one sentence of why, **the steps as empty boxes to tick with a pen** in two columns, "Done when", and up to three links. A goal that continues from an earlier semester is named again with "keep going", not repeated in full. A goal block never splits across pages. |
| **Then. Later semesters** | One heading, "Later semesters", then each later semester as a mono label and its goals in brief, two columns: dot, title, fact line ("keep going" for one that continues). Their steps come into the PDF as the semester gets close. |
| **Then** | "When you have more time" (two columns), "Habits to keep". Then **Where to start**: the resources this semester's and next semester's goals point to, in the plan's order, at most 12, as the same boxes as the site (7.4b), two to a row. In print the address is written out in full in mono under the name, because a printed link cannot be clicked; it is still a live link in the file. A box never splits across pages. **Everything up to here (the core) is at most 10 pages**, even for the longest plan (a first-year "by graduation" plan is 9); `pdf.test.tsx` checks it. |
| **Appendix** | On a new page after the core: **All resources**, every other resource tied to the plan or open to the student's year and major, grouped the same way as the site's Resources tab. It can run long; it never pushes the core past 10 pages. |
| **Every page** | A footer on a dotted sand rule: "Career Pathway Mapper  a general trajectory, not a blueprint" on the left; dataset, engine and "page 2 of 11" on the right, in mono. |

Type in the PDF: Quantico for everything read, Plex Mono for facts and the banner. Sizes: title 26pt, outcome 16.5pt, section headings 14pt, goal titles 10.5pt, body 8.5 to 9.5pt, facts 7.5pt, banner 5.25pt. All real, selectable text. The banner is decoration made of text: keep it out of the reading order if the renderer allows (see the handoff notes).

---

## 8. Motion

| What | How long | Easing | Notes |
|---|---|---|---|
| Hover, press, select | 140ms | `--ease` | Colour swap only; nothing moves |
| A sheet, a drawer, a question | 260ms | `--ease` | Opacity and transform only |
| Questions to results, results to questions | 300ms out, 300ms in | `--ease` | Opacity only; the new screen starts at the top |
| Landing paint-in | about 2.6s, once per session | per cell | See 7.1 |
| Landing to questions | 0.35s words, 1.1s navy to sage, 0.35s sheet in | ease in-out | The colour never changes all at once |
| Questions back to landing | 0.35s sheet out, 0.9s navy in, words at 0.8s | ease in-out | The painting shows finished |
| Landing water | always, 30 fps | none | Pauses off screen and when the tab is hidden |

Rules:

- **Screens change by fading**, never by cutting. A colour change between screens (navy to sage) is a slow fade of the navy layer, after the words have gone.
- **Everything is time-based**, not frame-based, so it runs at the same speed at 60Hz and 144Hz.
- Interface motion uses only `opacity` and `transform`. The paint-in draws on every animation frame from cells computed once.
- **Reduced motion:** the painting is finished and still, every fade is instant.

## 9. Accessibility

- The canvas is `aria-hidden`. Everything it shows is decoration; nothing on it is information.
- Focus is always visible: a 1.5px blue outline, 3px off the element.
- Headings are focused by script when a screen or question changes, as today.
- Targets are at least 48px tall (42px for the secondary buttons in the results header).
- The map's names are buttons in document order; the drawing itself is `role="img"` with a label.
- Colour is never the only signal (section 2, rule 6).

## 10. When the content changes

| If you change | What happens | What to touch |
|---|---|---|
| The wording on the landing page | The river moves to make room | Nothing |
| The number or order of questions | The fish gauge and "Question n of N" follow | Nothing |
| A question's options | The ruled list grows or shrinks; long lists scroll over the river | Nothing |
| The number of resources or their fields | The grid grows; empty lines drop out of each box | Nothing |
| The number of semesters or goals | The map adds rows and lanes; the PDF map trims to fit and says how many it left out | Nothing |
| A goal's title length | It wraps to two lines, then ends in an ellipsis on the map; lists show it in full | Nothing |
| A new kind of goal | | One entry in `LANE_GLYPH` and `LANE_NAME` |
| A new screen | | One scene in `SCENES`, one `goTo` |
| A colour | | The four tokens in one CSS file and `PALETTE` in `river.js`. Then re-check contrast: the rules in section 2 assume blue is the only ink dark enough to read. |
