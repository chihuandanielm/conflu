# Confluence: design logic for Career Pathway Mapper

Read this before changing anything visual. It holds the rules; the prototypes in `preview/` show them applied; `river/river.js` and `map/confluence-map.js` are working code to reuse, not sketches.

The content of the site (questions, goals, tracks, resources, wording that comes from `data/`) will change. These rules should not need to. Every rule below is written so it holds for any number of questions, terms, goals or words.

---

## 1. The idea

A student's plan is a river. Things they have done and things they will do are streams. They join one at a time, the river gets wider, and it runs to one place: the outcome they chose.

That one picture is used three ways, and nowhere else is decorated:

| Where | What the picture is |
|---|---|
| Landing, questions, top of results | An animated ASCII river in perspective (`river/river.js`). One world, one camera. The camera moves; the picture never cuts. |
| Results page and PDF | The confluence map (`map/confluence-map.js`): every goal is a line that joins the river in its semester and stays in it to the end. |
| Small places | A fish on the progress line. A dot beside a goal. A dotted sand rule between parts of a page. |

The river is never seen from straight above. It always has a horizon.

## 2. Colour: sage paper, three inks, and ink for words

Five colours exist. Nothing else: no white, no tints made with opacity, no gradients, no shadows. (Ink was added on
2026-11-23 after student simulations found blue sentences hard to read; it is the "and black" the palette allowed.)

| Token | Hex | Job | Share of a screen |
|---|---|---|---|
| `--sage` | `#E0E7DA` | Paper. Every background. | most of it |
| `--ink` | `#1A1F24` | Words. Every sentence, label and fact: body text, step text, facts in mono. | the text |
| `--blue` | `#456894` | What you can act on, and structure: headings, links, buttons, tabs, every rule and border, water, the one solid block per screen. **Blue means "you can act on this".** | about a tenth |
| `--sand` | `#E6B989` | Ground and attention. Ground in the river picture, the dotted "shore" rule, and the **attention panel**: a sand fill with ink text behind a notice, "where you stand", or a missing answer. | a little |
| `--green` | `#00A37D` | Life and done. The fish, "you are here", done dots and streams, ticked boxes, and the on-track counter (a green fill with ink text). | almost none |

Rules that follow from the jobs:

1. **Sentences are ink on sage or ink on sand.** Ink on sage is 13.1:1 and ink on sand 9.2:1, both past the 7:1 of WCAG AAA. Headings, links, buttons and tabs are blue on sage (4.54:1) or sage on blue. Ink on a green fill (5.2:1) is only for a short done or on-track label. Sand and green never carry words on sage (1.42:1 and 2.54:1).
2. **Green means alive, you, or done.** As a fill it only sits behind a done or on-track label, a progress gauge (the drawer's steps bar), or a mark. As a line, only the 3px bar beside "Done when" in the goal drawer.
3. **Sand never means "selected".** It is ground, and it asks for attention: the shore rule separates; the sand panel says "read this".
4. **Selected is solid blue with sage text.** No green edge, no offset block, no glow.
5. **One solid blue block per screen**, at most: the Start button, the Continue button, the "Do this now" card. A selected state (an answer, the current tab, an active filter) is also solid blue; that is a state, not an action, and does not count.
6. **Meaning never rests on colour alone.** A must-do has a filled dot and the word "must-do". A done goal has a green dot and the word "done". The eight kinds of goal are told apart by a glyph and a word (section 6), not by eight colours.
7. Tone comes from **density and weight**: more or darker glyphs in the river, a 3px line for a must-do against 1.5px for the rest.
8. **Nothing moves when pressed or hovered.** Hover underlines a row's title or fills a button; rows never shift sideways and buttons never drop (on a phone a shifted row looks indented).

`src/app/contrast.test.ts` reads the five tokens: it fails if ink on sage or ink on sand falls under 7:1, if blue on sage, sage on blue or ink on green falls under 4.5:1, if any other colour appears, if words are set in sand or green, or if a sand fill carries anything but ink.

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

- The canvas fills the viewport, fixed, behind everything.
- **Intro (about 5 seconds, skippable):** the camera starts low over the water, looking upstream. Fish hop close by. After about 2.3s it rises for 2.8s and the tributaries open up, running down from the ridge and joining in front of you. The words fade in during the last second of the rise. "Skip intro" sits top right as a text link. A returning visitor (saved answers or a saved plan) gets the short version: no hold, a 1.2s rise.
- **Words** sit top left, left-aligned, in a column no wider than 600px. On screens 900px and wider the river takes the right two thirds and the words sit over the land on the left; the river dissolves out from under them (`setMasks`). On narrower screens the words sit in the sky and the horizon is placed below them (`setHints({ sky })`), so longer copy pushes the river down instead of colliding with it.
- **Buttons** are stacked under the words, left-aligned. "Start" is solid. A returning visitor sees "Continue your plan" (solid) or "Continue where you left off" (solid) with "Start over" as an outline button under it.

### 7.2 Questions

Every question uses one shell. Changing, adding or removing questions never touches layout.

- **Background:** the `ask` scene. You are at the water's edge on the reach; the river is the bottom fifth of the screen, the far bank and the ridge sit just above it, fish hop.
- **Progress** (top, 640px column): one mono line. Water behind the fish, a green fish at the current position, dots ahead. Under it, "Question 2 of 16" in words. `role="progressbar"`. The fish count comes from the number of question steps, whatever that is.
- **The sheet** (640px column, drafting corners, solid sage so it covers the river when a long question scrolls over it):
  1. the question (`--text-h1`)
  2. help, if any (body)
  3. why we ask, if any (`--text-small`)
  4. the control
  5. Back (outline, left) ... Skip (text button, when optional) and Continue (solid, right)
  6. the keyboard hint in mono, hidden under 600px
- **Controls, all the same language:**
  - *One choice:* ruled rows, 54px tall, a mono key number in a small square, the label, an optional second line. Hover indents the row 8px. Selected is solid blue.
  - *Many choices (experience, skills, identity):* the same ruled rows with an open square instead of a key number; selected rows are solid blue with a tick in the square. Groups get a `--text-lead` heading and a shore rule between them. Search is a ruled input (bottom line only).
  - *Pickers with long lists (major, track):* suggested rows first, then "Show all" as a text button that opens the rest in the same list.
  - *Hours:* five rows like any single choice. No slider.
- **Review screen:** the same sheet. Each answer is a ruled row: the question in `--text-small`, the answer in body, "Change" as a text button on the right. "Build my plan" is the solid button.
- **Between questions:** the sheet slides 18px left and fades out (260ms), the next comes in from 18px right. The river does not react.
- Bottom padding of the page equals the river's height, so the last control always ends above the water.

### 7.3 Building the plan

There is no separate "Building your plan" screen. Pressing "Build my plan":

1. the questions fade out and the fish hop faster for about a second (`celebrate`);
2. the camera turns to face downstream and rises (2.6s): the reach now winds away toward the horizon across the top of the page;
3. the results page fades in during the last second.

The engine is instant; the move is the transition. With reduced motion all three steps happen at once.

### 7.4 Results

Top to bottom (2026-11-23, docs/VISUAL_REFRESH.md). The first screen answers "where do I stand and what do I do now?";
the big picture comes after the work.

| # | Part | Design |
|---|---|---|
| 0 | **Header** (300px; 250px on a phone) | The river, facing downstream, behind. "Your plan" (`--text-h1`, bold), then "headed for" in mono and the destination in Barlow 600, then the summary line (`--text-small`), then outline buttons in one row: Download PDF, Share link, Edit answers. "Start over" is on the Edit answers screen. The page below is solid sage and scrolls over the river. |
| 1 | **Where you stand + Do this now** | A sand status strip: the term in bold, "4 goals · 1 must-do · 0 done" in mono, "Uses about 4 of your 5 free hours a week.", and a "Free hours a week" control that re-plans at once. Under it the one solid blue block: "Do this now" with a rule after it, the step in bold Barlow, "Part of (goal) · step 1 of 5 · must-do", a framed "go to (place) ->" link, and "Open the full goal" as a text button. |
| 2 | **This semester** | Section head with the goal count. Ruled rows: dot, title in Barlow 600, a priority tag (must-do solid, others outlined) and the time in words, "Next: (first unticked step)", and "Go to:" with the best one or two places, linked. Three shown, "Show all N". Then **Good to know**: quiet notes with a 3px sand bar (never a sand fill, so a tip never looks as urgent as the status strip). Then "Why this order" as a text button. |
| 3 | **Coming up** | Section head with the semester count. Each semester is a band: an open one solid blue with sage text, a folded one outlined; "+"/"-", the term in Barlow 600, the count in mono. The next two are open, with smaller rows. Then "When you have more time". |
| 4 | **The big picture** | Section head with the milestone count. An outlined box: "Where you're headed" in mono, the outcome in Barlow 600, the milestone map, "See the full map". Then What you have / What you need. |
| 5 | Draft line | One dashed box: "This is a draft map · N extra options to review" and "Review on the Map tab ->". The full banner and "Finalize my map" are on the Map tab, so "Do this now" stays the one solid block. |
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
- **Resources tab:** boxes in a grid, 340px minimum column, 16px gaps, one column on a phone. Grouped by the groups in `data/ui/resources.json`, each group under a `--text-h2` heading with its count in mono and a shore rule above. Boxes in a row are the same height; the links sit at the bottom of each.
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
| Hover, press, select | 140ms | `--ease` | Colour swap; a pressed button moves down 1px |
| A sheet, a drawer, a question | 260ms | `--ease` | Opacity and transform only |
| A whole screen fading during a camera move | 520ms | `--ease` | Opacity only |
| Camera: intro rise | 2.8s (1.2s short) | quintic in-out | |
| Camera: landing to questions | 3.2s | quintic in-out | Follows the stem round the bend (`along: true`) |
| Camera: questions to results | 2.6s | quintic in-out | Turns 90 degrees |
| The river itself | always | none | Never pauses, never loops visibly, never reacts to clicks |

Rules:

- **Nothing is cut.** Every change of screen is a camera move through the same world. If a new screen is ever added, add a scene (a camera preset) and move to it.
- **Everything is time-based**, not frame-based, so it runs at the same speed on a 60Hz phone and a 144Hz monitor.
- Interface motion uses only `opacity` and `transform`.
- The river draws on every animation frame. It holds its frame rate by adjusting how many glyphs it draws (section 5 of `RIVER.md`), never by skipping frames.
- **Reduced motion:** the river is one still frame per scene, there are no fish, camera moves are instant, and interface transitions are off. Nothing is lost: every screen still has its picture.
- The river pauses when the tab is hidden and when it has scrolled out of view.

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
