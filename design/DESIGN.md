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

## 2. Colour: three inks on sage paper

Four colours exist. Nothing else: no white, no black, no tints made with opacity, no gradients, no shadows.

| Token | Hex | Job | Share of a screen |
|---|---|---|---|
| `--sage` | `#E0E7DA` | Paper. Every background. | most of it |
| `--blue` | `#466995` | Key ink. Everything read or pressed: all text, all rules and borders, water, the one solid block per screen. | about a tenth |
| `--sand` | `#E6B989` | Land ink. Ground in the river picture, the dotted "shore" rule between parts of a page, the bar beside a notice. | a little |
| `--green` | `#00A37D` | Life ink. The fish, "you are here", and anything the student has done. | almost none |

Rules that follow from the jobs:

1. **Text is blue on sage, or sage on blue. Never anything else.** Blue on sage is 4.47:1. Sand and green are too faint on sage to carry words (1.42:1 and 2.54:1), so they never do.
2. **Green is never a background, a border or a shadow.** If something is green, it is alive (a fish), it is the student (the "you are here" dot, the fish on the progress line), or it is finished (a done dot, a done stream, a ticked box). One glance at a page should show where you are and what you've finished, and nothing else should compete for that.
3. **Sand never means "selected" or "important".** It is ground. In the interface it only separates (the dotted shore rule) or sits beside a notice.
4. **Selected is solid blue with sage text.** No green edge, no offset block, no glow.
5. **One solid blue block per screen**, at most: the Start button, the Continue button, the "Start here" block. If two things are solid blue, one of them is wrong.
6. **Meaning never rests on colour alone.** A must-do has a filled dot and the word "must-do". A done goal has a green dot and the word "done". The eight kinds of goal are told apart by a glyph and a word (section 6), not by eight colours.
7. Tone comes from **density and weight**: more or darker glyphs in the river, a 3px line for a must-do against 1.5px for the rest.

Contrast, plainly: 4.47:1 is just under the 4.5:1 that WCAG AA asks for small text and well over the 3:1 it asks for large text and controls. So body text is never smaller than 17px, the only smaller text is 13px mono for short facts (hours, terms, kinds), and nothing is ever lighter than full blue. `src/app/contrast.test.ts` must be rewritten for the four tokens with 4.4 as the floor for blue on sage, and it should fail if any other text pair appears.

## 3. Type

Two families, both self-hosted through `@fontsource` (no third-party requests).

| Family | Used for |
|---|---|
| **Quantico** 400 | Everything meant to be read: headings, questions, options, body, buttons. 700 only on the one solid button of a screen and the outcome line at the foot of the map. |
| **IBM Plex Mono** 400 (600 for the fish) | The river. Short facts: hours, term names on the map, kinds of goal, dataset and engine versions, key hints. |

| Token | Size | Use |
|---|---|---|
| `--text-hero` | 36 to 64px, fluid | Landing headline only |
| `--text-h1` | 28 to 40px | The question; "Your plan"; the outcome |
| `--text-h2` | 22 to 28px | Section headings; the step in "Start here" |
| `--text-lead` | 20px | A goal's title in a list |
| `--text-body` | 17px | Body. The floor for sentences. |
| `--text-small` | 15px | Supporting sentences under a title |
| `--text-fact` | 13px mono | Facts only, never sentences |

Sentence case everywhere. No all-caps labels, no letter-spaced eyebrows, no decorative underlines, no highlight bars behind words. The only underline is on a text link.

## 4. Line, space, shape

- One line weight, **1.5px**, for every rule and border. **3px** only for a must-do stream and the bar beside a notice.
- Corners are square. No radius except the round dots.
- No shadows of any kind, including flat offset ones.
- Spacing steps: 8, 16, 24, 40, 64, 96.
- **Rows, not cards.** A list of options or goals is a ruled list: a 1.5px blue line above the first row and under each row. Boxes around every item are not used.
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

Top to bottom. The order is the product's (engine 0.8 redesign) and does not change; this is how each part looks.

| # | Part | Design |
|---|---|---|
| 0 | **Header** (300px; 380px on a phone) | The river, facing downstream, behind. "Your plan" (`--text-h1`), the summary line (`--text-small`), then outline buttons: Download PDF, Share link, Edit answers, and Start over as a text button. On wide screens the river sits to the right of the title; on a phone it sits between the title and the buttons. The page below is solid sage and scrolls over the river; the river stops drawing once it is off screen. |
| 1 | **Where you're headed** | The outcome as one line in `--text-h1`. Under it the confluence map of the milestones only (up to five). "See the full map" outline button. |
| | shore | |
| 2 | **What you have / What you need** | Two columns (one on a phone). Have: green dots. Need: open dots, with when in `--text-small`. |
| 3 | **Start here** | The one solid blue block on the page. "Start here" in mono, the step itself in `--text-h2`, "Part of: ..." under it, and "Open this goal" as an outline button in sage. |
| 4 | **This semester** | Heading, then a fact line (`year 2 · fall  sized to your 8 free hours a week`). A ruled list of goals: dot, title in `--text-lead`, the fact line, "Next: (the first unticked step)", and `->` at the right. Three shown, "Show all N" as a text button if there are more. |
| | Good to know | Under the list. Each notice is a paragraph with a 3px sand bar on its left. "Dismiss" as a text button. |
| | shore | |
| 5 | **Coming up** | One fold per semester (`+` / `-` in mono, the semester in `--text-lead`, the count in mono). The next two are open. Inside, the same ruled rows, smaller, without the "Next:" line. Then "When you have more time": a short list with open dots. |
| | shore | |
| 6 | Checked off, Habits to keep | Checked off: rows with green dots and "Undo" as a text button. Habits: open dots, the reason in `--text-small`. |
| | shore | |
| 7 | Doors | "See the full map" and "All resources", outline buttons, then the footer sentence with dataset and engine versions in mono. |

**The goal drawer** opens from any goal, anywhere. A side sheet on the right (480px, 1.5px blue left edge) on wide screens; a bottom sheet under 600px. No dimming behind it (there is no fifth colour to dim with); the page behind is inert. Order inside: Close, the fact line, the title, **What to do** (steps as tick boxes; a ticked box is green), **Done when**, **Why it's here**, **Where to go** (resources as text links), then "Mark as done" as the solid button. It slides in over 260ms.

**The full map** is its own view ("<- Back to your plan" at the top). It is the confluence map with every goal. Each name is a real button that opens the drawer. Under the map, the skills picture: one row per competency, a 1.5px line from 0 to 1 with a green dot at "now" and an open blue ring at "target", the name on the left. This view replaces the React Flow chart and the chart/list switch: the map is already a list in document order, and it is one-sided on a phone.

**All resources** is its own view. Filters are text toggles in a row (selected = solid blue). Each resource is a ruled row: name (`--text-lead`), one sentence, a fact line (where, pay, season, deadline), the link. Group headings in `--text-h2` with a shore rule between groups.

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
| **1. The map** | A still ASCII banner of the river across the top (`asciiFrame("banner", ...)`, two overlaid mono text blocks, sand then blue, 7px). "Your plan", the summary line, the outcome. Then the confluence map, two-sided, fitted to the rest of the page with `maxHeight`. This page alone should tell a student where they are going and in what order. |
| **2. Where you stand** | What you have / What you need in two columns. The "Start here" block, solid blue. Notices with the sand bar. Then "This semester" begins. |
| **2 onward. Every semester** | A semester heading on a dotted sand rule. Each goal is drawn as a piece of its stream: a vertical line down the left (3px for a must-do), a dot on it, and to the right the title, the fact line, one sentence of why, **the steps as empty boxes to tick with a pen** in two columns, "Done when", and up to three links. A goal that continues from an earlier semester is named again with "keep going", not repeated in full. A goal block never splits across pages. |
| **Last** | "When you have more time", "Habits to keep". The resources list, if kept, uses the same ruled rows as the site. |
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
| The number of semesters or goals | The map adds rows and lanes; the PDF map trims to fit and says how many it left out | Nothing |
| A goal's title length | It wraps to two lines, then ends in an ellipsis on the map; lists show it in full | Nothing |
| A new kind of goal | | One entry in `LANE_GLYPH` and `LANE_NAME` |
| A new screen | | One scene in `SCENES`, one `goTo` |
| A colour | | The four tokens in one CSS file and `PALETTE` in `river.js`. Then re-check contrast: the rules in section 2 assume blue is the only ink dark enough to read. |
