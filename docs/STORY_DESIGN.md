# How it works: the landing's story (design scheme, 2026-11-25)

The landing's hook. One sample student, a computer science sophomore aiming for software engineering, goes from the first question to a finished plan while the visitor scrolls down. Nothing in it is clickable. Every screen is the app's own component with that student's real plan, frozen.

This file has two parts:
- how six different visitors would meet the section, and what each needs from it;
- the scheme that comes out of that: structure, motion, layout, words, accessibility and performance.

## 1. Six visitors

| Who, where | What they're thinking | What the section must do for them |
|---|---|---|
| **First-year, first-generation.** Phone (older Android, mobile data), between classes, thumb-scrolling fast. | "Is this for me? Is it free? What do I get?" Leaves within seconds if it's unclear. | Say the outcome in the first frame. One idea per step, in a short line. Light on data and processor. Never trap the scroll: each step pins briefly and the page keeps flowing. A way to skip the walkthrough. |
| **Junior who transferred to Newark.** Laptop, evening, anxious about being behind. | "I'm not a freshman. Will it just tell me to do freshman things?" | Show that the plan fits the student: their year, their free hours ("uses 4 of your 5 hours"), and one thing to do now, not a wall of tasks. |
| **Student at another school.** Laptop. | "It says Rutgers. Does it work for me?" | Say early that it works for other schools too. Stay on what's universal: questions, plan, map, steps. |
| **Screen-reader user, or someone sensitive to motion** (reduced motion on). | "Don't make me sit through an animation to find out what this is." | Every step's meaning is in its words, not the animation. With reduced motion: nothing pins, every screen shows finished, no movement. Frozen screens are hidden from screen readers; the caption says what they show. |
| **Career-centre advisor or parent.** Desktop, judging whether it's trustworthy. | "Where does the advice come from? Is it selling something?" | Show real names: real programs (CS50, freeCodeCamp), real guides, recruiter-based ordering. Privacy at the bottom. No hype in the words. |
| **Returning student.** | "I've been here; just let me continue." | The button says "See my map" (finalized map) or "Continue your plan". The story doesn't block it, and the skip link and hero button come first. |

**What they share:**
1. The outcome comes first, then the process.
2. Each step shows one idea.
3. Meaning lives in the words; motion is the illustration.
4. It never traps the scroll or rewinds.
5. It must be fast on a cheap phone.

## 2. The idea: a line of stops, ending at the goal

The new logo ends in a line with two dots and a ring: stops on a route, then the goal. The site's whole metaphor is streams joining one river. So the story is built on one **spine**: a single charcoal line that runs down the left of the section.
- It draws itself as the visitor scrolls.
- A dot fills at each step as that step plays.
- It ends in the logo's ring at "Your plan, start to finish".

The visitor literally follows the line from the first question to the goal. The spine is what carries the eye between steps, so the steps don't feel like separate slides.

**Each step teaches one colour's job.** That way the story is also the key to reading the real plan later:

| Step | What happens on the screen | The colour it teaches |
|---|---|---|
| 1. Tell it where you are | A campus gets picked, then 5 free hours a week | **Violet:** your picks |
| 2. Get what to do now | This semester's panel arrives, the hours meter fills, "Do this now" lands | **Ochre:** look here first |
| 3. See the whole path | The map draws itself downward from "you are here" to the career goal | **Charcoal streams:** the plan's shape |
| 4. Do it, one step at a time | A goal's steps tick off one by one, the bar fills | **Verdigris:** done |
| End | The finished plan rises into view, with the button | All of them together |

**Callouts instead of spotlights.** The rules allow no tints or dimming, so the thing to look at is framed with **drafting marks** instead: four small corner marks that draw in around it, and a short mono label in the window's title bar ("your pick", "look here first", "your goal", "done"). It's the same drafting language as the hero's crop marks and ruler.

## 3. Motion (revision 2, 2026-11-25)

The first build pinned each step for 1.6 screens and scrubbed it with the scroll: about 6.5 screens to get through. The owner found it took far too long, asked for minimal scrolling with things animating as you pass, and for the animations to feel playful and inviting. The map step also broke: scrolling back up after it left only the bottom of the map in view, because the map had been slid up inside a fixed window to follow the drawing.

**What the research says:**
- Nielsen Norman Group: scroll-triggered effects should run once, the first time the visitor scrolls down, and stay off the main text ([scroll animations](https://www.nngroup.com/articles/scroll-animations/)).
- GSAP's default trigger is "play once when it enters, then do nothing", and teams that tried pin + scrub + play-once together found the three don't combine; they chose an unpinned section that plays once ([Bitovi](https://bitovi.com/blog/prepare-for-anything-with-gsap)).
- Playful product demos animate the real interface doing its job: a choice being made, a result arriving, a line being drawn ("show the work happening", [Advids](https://advids.co/blog/30-captivating-interface-animation-video-examples-for-modern-products)). Lines that draw themselves use `stroke-dasharray`/`stroke-dashoffset` with a measured path length; ticks get a small scale pop ([motion.dev SVG](https://motion.dev/docs/svg-animation)).
- Grouped entrances stagger 30–80 ms apart; longer feels slow. Springs read as lively for small feedback (a press, a tick); standard easing stays for big panels.

**The rules now:**

| Rule | Why |
|---|---|
| **No pinning.** Each step is a normal row, about one window tall on a laptop (caption beside a window) and a caption over a window on a phone. The four steps take about 3 screens on a laptop instead of 6.5. | Minimal scrolling. |
| **Play once on entering.** When a step is 40% in view, its scene plays on a clock (about 2 s), not tied to scroll speed. It never replays or rewinds; scrolling up leaves it finished. | A fast scroller still sees it; a slow one isn't made to scroll to advance it. |
| **The spine follows the scroll.** The one charcoal line down the left grows with scrolling (forward only), so something answers every scroll. Each step's dot pops when its scene plays. | Something moves as you scroll, without making scroll the engine of every step. |
| **Playful, in the field-guide way.** Small marks get a gentle spring with a little overshoot (a pick being pressed, a tick, a dot, the corner marks snapping in). Panels and windows use the site's easing (`cubic-bezier(0.22,0.61,0.36,1)`), no bounce. | Lively without becoming a cartoon; the screens stay readable. |
| **The map is never cropped.** Its window is as tall as the map, and the map draws itself: each stream traces from where it joins down to the river, semester by semester, the goal dot pops last. The story shows the must-do goals, so it stays short. | Fixes the scroll-back bug and makes the whole path visible. |
| **Compositor-friendly.** Transforms and opacity for movement; the only paint work is the map's strokes drawing once and the meter cells. | Smooth at 60, 120 Hz or more. |

**Each step's scene (about 2 s):**
1. **Tell it where you are:** the campus options cascade in (40 ms apart); one is pressed (a quick dip) and turns violet; the sheet slides away left and the time question slides in from the right, like turning to the next question; 5 hours gets pressed; the corners snap round it; "your pick" appears in the window bar.
2. **Get what to do now:** this semester's panel slides in; the hours meter's cells pop in one by one, 4 of the 5 filled ochre; the "Do this now" window opens down from its title bar; the corners snap round it; "look here first".
3. **See the whole path:** the semester lines fade in, the streams trace down semester by semester, the names fade in beside them, the river's mouth and the goal dot pop; "your goal".
4. **Do it, one step at a time:** the goal's steps tick off one by one (each tick pops, the line strikes through, the count goes up, the bar fills verdigris); "done".
- **End:** the finished plan rises in once, the spine reaches the ring and the ring pops. The button follows in the landing's closing panel.

**Reduced motion:** no movement at all; every scene is shown finished from the start.

### Revision 3: smoother flow, nothing cut off (2026-11-25)

On a phone, step 4's list and the finished plan were cut off at the window's edge, and the owner found the motion not smooth enough: more fades, transitions and frames.

**Research:**
- Ease-out for anything entering, with a strong curve such as `cubic-bezier(0.23, 1, 0.32, 1)`; never ease-in on UI ([Emil Kowalski](https://emilkowal.ski/ui/great-animations)).
- Overlapping action and follow-through: parts of a scene move at different times and settle after one another, rather than all at once or one-strictly-after-another ([Toptal](https://www.toptal.com/designers/ui/motion-design-principles), [Material choreography](https://m1.material.io/motion/choreography.html)).
- Short travel (16–24 px) and light stagger; large distances read as jank ([entrance animations guide](https://camoa.github.io/dev-guides/css/css-craft/entrance-animations)).

**What changed:**
- **The frame arrives first.** Each window glides in as a whole (fade, 28 px rise, 98.5% to full size, 0.9 s) and its caption comes in line by line with it; then the screen's pieces follow, each starting before the last has finished.
- **One curve.** Everything entering uses `--glide` (`cubic-bezier(0.23,1,0.32,1)`); small marks keep a softer spring.
- **Crossfades, not cuts.** Step 1 now has three question screens (campus, career goal, free hours) that crossfade like pages turning: the old one drifts left and fades away while the next comes in. A pick's violet fades in rather than switching on. "Do this now" opens downward with a clip reveal instead of a squash. Struck-through steps draw left to right.
- **Fade-aways instead of hard edges.** The question window and the finished plan fade out at the bottom (a 96 px mask), so the cut reads as "it carries on", not as a bug.
- **Nothing cut off.** Steps 2, 3 and 4 are as tall as their screens. The question screens show only their question line, so on a phone the picks stay in the window. On a phone the finished plan takes the full width (out past the spine) and a fixed 640 px height.
- **The spine glides.** Its growth is smoothed with a spring, so it follows the scroll without stepping on each wheel notch.

## 4. Layout (revision 2)

- **Laptop (900 px and wider):** the spine in a narrow gutter on the left; the caption (about 4 parts) and the window (about 7 parts) side by side. The question window is up to 540 px tall and fades out at the bottom; the others are as tall as their screens.
- **Phone:** the spine on the left edge; the caption on top, the window under it. Only the question window has a fixed height (460 px, fading out at the bottom); the others are as tall as their screens.
- **Each caption:** "step N", the title in bold Barlow, one plain sentence.
- **Above the story:** "How it works", the one line, and "Skip to the finished plan".

## 5. Words

Plain, short, no hype (the owner's standing rule).

- **Intro:** "How it works" (the line under it was removed on 2026-11-26, at the owner's request).
- **Step 1, "Tell it where you are":** "Your campus, major, year, the career you want, and your free time. About 3 minutes, no account, and it works for other schools too."
- **Step 2, "Get what to do now":** "This semester's goals, sized to your free hours, with one thing to do first and where to go for it."
- **Step 3, "See the whole path":** "Every goal joins the river in the semester it starts, all the way to your goal."
- **Step 4, "Do it, one step at a time":** "Every goal breaks into small steps, from real guides. Tick them off as you go."
- **End, "Your plan, start to finish":** "Every semester to graduation, with the places to go, a map, resources and your major's courses. This one is the sample student's." (No button here: the closing panel, just after, has it.)

## 6. Accessibility

- **Frozen screens:** marked `aria-hidden` and `inert`. Nothing in them is focusable, and the global number-key shortcuts are off.
- **Captions:** each has a short screen-reader line saying what the screen shows.
- **Reduced motion:** no movement. Every screen shows finished, with its callout drawn, and the spine is drawn complete.
- **Skip link:** "Skip to the finished plan" jumps past the steps.
- **Headings:** the landing keeps one h1. The story uses h2 for the section and h3 for the steps; the frozen screens' own headings are hidden with them.
- **Contrast:** everything uses the existing tokens and contrast test. The axe scan runs at desktop and phone width.

## 7. Performance budget

- **Mounting:** each step's screen mounts in idle time after load, or when it comes within one screen of the viewport, and stays mounted after.
- **Per frame:** no layout reads. Measurements (the map's height) happen once and on resize.
- **Test:** a scripted scroll through the whole story, at 60 Hz and with the processor slowed 4×, records frame times. The target is fewer than 5% of frames missing a refresh on the 4× run, and no frame over 50 ms while scrolling. A frame misses when it takes over 25 ms (1.5 refreshes at 60 Hz): timer jitter alone puts perfect frames at 16.6–17 ms, so "over 16.7 ms" counted a third of them.
- **Idle mounting:** the heavy screens also mount in idle time after the page loads, one per idle period, so a visitor reading the hero never pays for them mid-scroll.
- **Weight:** no new libraries. It uses `motion`, which the site already ships.

## 8. Acceptance

- At each step, a visitor sees the right focal action and callout: violet pick, ochre "Do this now", the map reaching the goal, verdigris ticks.
- Scrolling back up changes nothing that has already played, and the whole map stays in view.
- The four steps take about 3 screens of scrolling on a laptop.
- With reduced motion: nothing moves, and everything shows finished.
- Nothing inside the story can be focused or clicked. The skip link and the buttons can.
- The finished plan shows at the end; the button follows in the landing's closing panel.
- Browser tests run on laptop and phone, with an axe scan and the frame-time test.
