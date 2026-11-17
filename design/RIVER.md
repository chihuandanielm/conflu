# The river: how it works and how to change it

`design/river/river.js` is one file with no dependencies. It draws the ASCII river on a `<canvas>`. Open `prototypes/scene.html` (through a local server) to see each camera preset and the glide between them.

## 1. The model

```
world (river geometry)  ─┐
camera (a scene)        ─┼─► for every glyph cell: what am I looking at?  ─► a glyph and an ink
time                    ─┘        (water / land / ridge / nothing)
```

- **World** (`buildWorld(aspect)`): a stem and seven tributaries as smooth paths with widths. North is up-river. The tributaries start beyond the horizon and join the stem one after another; the stem flows south, bends, and runs east as a long, gently winding reach. The fan of tributaries is built wider on wide screens. `world.query(x, y)` answers, for any ground point: how far from the nearest bank, how far along the river (`s`), how far across (`cross`), which way the water flows.
- **Camera** (`makeView`): a perspective camera with a target point, heading, pitch, zoom and a screen anchor. It is always pitched low (4 to 24 degrees), so there is always a horizon. `unproject` turns a screen pixel into a ground point; `project` turns a world point (with height) into a pixel.
- **Rows that grow toward you:** glyph rows are small at the horizon and large at the bottom of the screen (`layoutRows`). That is what gives the picture depth, and it is why the foreground reads as close water.
- **Shading** (`waterInk`): each water cell gets an ink from 0 to 1 and is drawn with one of ten glyphs (`WATER_RAMP`). Ink is the sum of: depth (dark mid-channel, pale shallows at the banks), broad dark pools drifting downstream, and seven wave trains (`TRAINS`) with wavelengths from 17 world units down to half a unit. A wave train is only drawn where the glyphs are fine enough to show it (about four glyphs per wave); otherwise it is left out. That is why far water is calm, near water is detailed, and nothing ever turns to noise. The middle of each ramp follows the direction of flow on screen (`-~=` across, `:;!|` toward you, slashes on the diagonals); the dark end (`* # % @`) is shared.
- **Land** is sand: a firm shoreline at the water's edge, thinning stipple behind it, and a ridge of peaks above the horizon that turns with the camera.
- **Fish** are the only green. Four fish, each on its own clock (4.3, 5.9, 7.7 and 9.1 seconds), each picking a visible spot by hash. A hop is a real arc in the world (along or against the current), drawn at sub-pixel positions and rotated along its path, with a ring that opens where it leaves and lands. Because the periods share no common multiple, the pattern does not visibly repeat.
- **Nothing is random.** Positions come from `hash()`. The same viewport at the same time draws the same frame on every device.

## 2. Scenes

A scene is a function `(W, H, hints) => camera`. They are in `SCENES`.

| Scene | Where the camera is | Used for |
|---|---|---|
| `low` | Just above the stem, looking upstream | The first two seconds of the landing page |
| `landing` | Risen, looking upstream over the confluence | Landing page |
| `ask` | At the water's edge on the reach, looking across | Every question |
| `results` | Over a bend of the reach, looking downstream | Top of the results page |
| `banner` | Like `ask`, framed for a wide short strip | The still at the top of the PDF |

`hints.sky` is the height in pixels of whatever text sits above the picture. `landing` (on narrow screens) and `results` (on narrow screens) place the horizon below it.

**To add a scene:** add one function to `SCENES`, then `river.goTo("name")`. Work it out in `scene.html`. Keep the pitch between 4 and 30.

## 3. Using it

```js
import { createRiver } from "./river.js";

const river = createRiver(canvas, { scene: "low" });   // canvas: position fixed, inset 0
river.setHints({ sky: heroBottomPx });                  // re-frames now, and on resize
river.setMasks([{ x, y, w, h }], { fadeMs: 1400 });     // keep the river clear of text; dissolves in
await river.goTo("landing", { ms: 2800 });              // resolves on arrival
await river.goTo("ask", { ms: 3200, along: true });     // along: follow the stem between the two places
river.celebrate(1.8);                                   // a burst of hops
await river.goTo("results", { ms: 2600 });
river.pause(); river.resume();                          // when scrolled out of view
river.setClip(bandBottomPx);                            // only the band above an opaque page is visible; null = all
river.destroy();
```

Also exported, for places with no canvas:

- `asciiFrame(scene, cols, rows, { cell, t })` returns one still frame as rows of `{ blue, sand }` strings. The PDF banner and tests use it.
- `makeView`, `buildWorld`, `waterInk`, `waterGlyph`, `hash`, `WATER_RAMP`, `PALETTE`.

In the app there is **one** river for the whole session. Mount the canvas once, above the views, and let each view tell it which scene to be in. Do not create a river per screen: the point is that it never cuts.

## 4. Tuning

Everything is a number in `river.js`. The ones worth knowing:

| What | Where | Now | Effect of raising it |
|---|---|---|---|
| Speed of the current | second column of `TRAINS` | 3.1 to 10.3 units a second | Water moves faster |
| Water darkness overall | `0.14 + 0.32 * mid + ...` in `waterInk` | 0.14 base | Darker, denser water everywhere |
| Wave contrast | `0.42 * n` in `waterInk` | 0.42 | Stronger light and dark bands |
| Pools | `0.24 * slow * mid` | 0.24 | Bigger dark patches drifting down |
| Detail cut-off | `amp()` in `waterInk` | 1.9 − fl·k·1.25 | Finer waves survive further away (too high turns to noise) |
| Shade glyphs | `WATER_RAMP` | ten per direction | Change the character of the water |
| Glyph size | `fsMin`, `fsMax` in `layoutRows` | 8.5 to 19px (7.5 to 15 on phones) | Bigger, fewer glyphs |
| Depth exaggeration | exponent `0.55` in `layoutRows` | 0.55 | Rows grow more slowly toward you |
| Ridge height | `RIDGE` | 12% of height, 52 to 124px | Taller peaks |
| Shoreline strength | `ink = ... 0.8` in `classify` | 0.8 near, 0.34 far | Heavier sand edge |
| How often fish hop | `FISHES` periods | 4.3 to 9.1s | Fewer hops |
| Hop size | `LEN`, `UP` in `drawFish` | 30 to 120px long, 18 to 60px high | Bigger leaps |
| Channel widths | third number of each point in `buildWorld` | stem 7, tributaries 1.4 to 3.8 | Wider water |

Change one number, look at all four scenes on a desktop and a phone, then run the smoothness check.

## 5. Staying smooth

The work per frame is one pass over the glyph cells. When the camera is still, each cell's place in the world is cached and only the ink is recomputed (about 1 to 4 ms). While the camera moves, every cell is re-placed each frame (about 2 to 9 ms).

Four things keep the frame rate up on any device (the last was added when the app measured the results page on very large screens: the browser copies and composites the whole canvas every frame, so its size in pixels matters as much as the glyphs drawn):

1. **Glyph size follows screen size.** A 2560 by 1440 monitor gets proportionally larger glyphs than a 1440 by 900 one, so both draw roughly the same number.
2. **It watches itself.** It tracks the real time between frames. If that falls under about 50 a second, it enlarges the glyphs by a quarter (fewer to draw), up to 2.3 times. If that is not enough it lowers the canvas resolution. It only ever steps one way, a handful of times, so the picture does not flicker between sizes.
3. **Everything is time-based**, so a slow frame costs smoothness for that frame only; the move still ends on time.
4. **A clip.** When an opaque page covers all but a band at the top (the results page), `setClip(bottom)` shrinks the canvas element and its bitmap to that band, rounded up to 64px. The framing still uses the full screen height, so the picture never moves. Cleared before the page leaves.

`node design/check-smoothness.cjs` runs the real flow at three screen sizes with the CPU at full speed, slowed 4 times and slowed 6 times, and records every frame of each camera move. Last run (headless Chromium, software rendering, no GPU):

| Screen | CPU | Intro rise | Landing to questions | Questions to results |
|---|---|---|---|---|
| 1440 by 900 | full | 60.0 | 60.0 | 60.0 |
| 1440 by 900 | 4 times slower | 58.4 | 60.0 | 59.7 |
| 1440 by 900 | 6 times slower | 53.6 | 58.2 | 55.3 |
| 390 by 844 phone | full | 60.0 | 60.0 | 60.0 |
| 390 by 844 phone | 4 times slower | 59.5 | 59.7 | 59.5 |
| 390 by 844 phone | 6 times slower | 58.0 | 58.2 | 59.0 |
| 2560 by 1440 | full | 60.0 | 60.0 | 59.7 |
| 2560 by 1440 | 4 times slower | 54.1 | 59.5 | 53.0 |
| 2560 by 1440 | 6 times slower | 35.9 | 43.4 | 41.4 |

Frames a second, averaged over the move. The only runs under 50 are a very large screen on a CPU slowed six times with no graphics card, which is not a real device. Displays faster than 60Hz were not measured here; the code is time-based and draws on every frame the browser offers.

## 6. What not to change

- Do not look straight down. Pitch stays low.
- Do not add a colour to the picture. Water is blue, land is sand, fish are green.
- Do not make the river react to the pointer, to scroll, or to clicks. It is a place, not a toy.
- Do not use `Math.random()` or `Date.now()` in it. Use `hash()` and the clock that is passed in.
- Do not pause or restart the flow between screens.
- Do not put information on the canvas. It is hidden from assistive technology.
