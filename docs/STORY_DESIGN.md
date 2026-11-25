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
| **Returning student.** | "I've been here; just let me continue." | The button already says "Continue your plan". The story doesn't block it, and the skip link and hero button come first. |

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

## 3. Motion

All motion follows the site's rules:
- fades, short rises (16–24 px), lines drawing themselves, and the corner marks;
- no bounce, no spring overshoot, no flashing;
- one easing curve throughout, the site's `cubic-bezier(0.22, 0.61, 0.36, 1)`;
- the painting stays the only animated picture. The story is screens arriving and lines drawing, not illustration.

| Rule | Why |
|---|---|
| **Forward only.** Each step's progress follows scrolling down and never goes back; scrolling up leaves everything as it was. | Asked for: the page flows downward, and nothing that appeared disappears. |
| **Pinned briefly.** On a laptop each step holds for about 1.6 screens of scroll, on a phone about 1.3. Then the page carries on. | Long enough to see one idea; short enough that a fast scroller is never stuck. |
| **One focal action per step,** in three beats: the screen arrives (0–25%), the action happens (25–75%), the callout marks it (75–100%). | A visitor scrolling quickly still catches the action; one scrolling slowly sees it unfold. |
| **The spine leads.** It draws ahead of each step's screen, and its dot fills as that step's action completes. | It ties the steps into one journey and gives the eye somewhere to go next. |
| **The end isn't pinned.** The finished plan rises in once when it enters view, then stays. | It's the reward. The visitor can look at it as long as they like. |
| **Compositor-only.** Only `transform`, `opacity` and `clip-path` change, driven by motion values (no React render per frame). The map is revealed by clipping, not redrawn. | Smooth at the display's own refresh rate, 60, 120 Hz or more. |

## 4. Layout

**Desktop (900 px and wider):**
- the spine runs in a narrow gutter on the left;
- then the caption column (about 4 parts) and the frozen screen in a window frame (about 7 parts);
- the window is up to 680 px tall, at most 78% of the screen.

**Phone:**
- the spine is a thin line on the left edge;
- the caption is compact at the top of the pinned screen: "step 1", the title, one line;
- the window sits under it, at about 60% of the screen height.

**Each caption:**
- "step N" as a drafting kicker;
- the title in bold Barlow;
- one plain sentence;
- the callout's mono label appears in the screen, not the caption.

**Above the story:**
- the heading "How it works";
- one line: "One student, from the first question to a finished plan";
- a text link, "Skip to the finished plan".

## 5. Words

Plain, short, no hype (the owner's standing rule).

- **Intro:** "How it works". "One student, from the first question to a finished plan."
- **Step 1, "Tell it where you are":** "Your campus, major, year, the career you want, and your free time. About 3 minutes, no account, and it works for other schools too."
- **Step 2, "Get what to do now":** "This semester's goals, sized to your free hours, with one thing to do first and where to go for it."
- **Step 3, "See the whole path":** "Every goal joins the river in the semester it starts, all the way to your goal."
- **Step 4, "Do it, one step at a time":** "Every goal breaks into small steps, from real guides. Tick them off as you go."
- **End, "Your plan, start to finish":** "Every semester to graduation, with the places to go, a map, resources and your major's courses. This one is the sample student's." Then the button.

## 6. Accessibility

- **Frozen screens:** marked `aria-hidden` and `inert`. Nothing in them is focusable, and the global number-key shortcuts are off.
- **Captions:** each has a short screen-reader line saying what the screen shows.
- **Reduced motion:** no pinning and no movement. Every screen shows finished, with its callout drawn, and the spine is drawn complete.
- **Skip link:** "Skip to the finished plan" jumps past the pinned steps.
- **Headings:** the landing keeps one h1. The story uses h2 for the section and h3 for the steps; the frozen screens' own headings are hidden with them.
- **Contrast:** everything uses the existing tokens and contrast test. The axe scan runs at desktop and phone width.

## 7. Performance budget

- **Mounting:** each step's screen mounts only when it comes within one screen of the viewport, and stays mounted after.
- **Per frame:** no layout reads. Measurements (the map's height) happen once and on resize.
- **Test:** a scripted scroll through the whole story, at 60 Hz and with the processor slowed 4×, records frame times. The target is fewer than 5% of frames missing a refresh on the 4× run, and no frame over 50 ms while scrolling. A frame misses when it takes over 25 ms (1.5 refreshes at 60 Hz): timer jitter alone puts perfect frames at 16.6–17 ms, so "over 16.7 ms" counted a third of them.
- **Idle mounting:** the heavy screens also mount in idle time after the page loads, one per idle period, so a visitor reading the hero never pays for them mid-scroll.
- **Weight:** no new libraries. It uses `motion`, which the site already ships.

## 8. Acceptance

- At each step, a visitor sees the right focal action and callout: violet pick, ochre "Do this now", the map reaching the goal, verdigris ticks.
- Scrolling back up changes nothing that has already played.
- With reduced motion: no element is pinned, and everything shows finished.
- Nothing inside the story can be focused or clicked. The skip link and the buttons can.
- The finished plan shows at the end, then the button.
- Browser tests run on laptop and phone, with an axe scan and the frame-time test.
