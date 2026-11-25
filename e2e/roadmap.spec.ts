import { expect, test, type Page } from "@playwright/test";

/** Collects CSP violations and any request that leaves the site. Both must stay empty. The CSP comes from the page's meta tag. */
function watch(page: Page) {
  const violations: string[] = [];
  const offsite: string[] = [];
  page.on("console", (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text()); });
  page.on("request", (r) => { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol) && u.host !== "localhost:4321") offsite.push(r.url()); });
  return { violations, offsite };
}

const heading = (page: Page) => page.getByRole("heading", { level: 1 });

test("CS sophomore on the software track: intake to plan, mark done, PDF", async ({ page }) => {
  const seen = watch(page);
  await page.goto("./");
  await expect(heading(page)).toHaveText("Know what to do now.");
  // The landing's painted scene is a canvas; the old session river is gone everywhere.
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.locator("canvas[data-river]")).toHaveCount(0);

  // The CSP (a meta tag, since GitHub Pages can't send headers) is active: an injected inline script must not run.
  const ran = await page.evaluate(() => new Promise<boolean>((resolve) => {
    const w = window as unknown as { __cspProbe?: boolean };
    const el = document.createElement("script");
    el.textContent = "window.__cspProbe = true";
    document.head.append(el);
    setTimeout(() => resolve(w.__cspProbe === true), 50);
  }));
  expect(ran).toBe(false);
  seen.violations.length = 0; // that probe's own violation is expected

  // Build my plan: the landing fades to the sage of the questions, which have no canvas behind them.
  await page.getByRole("button", { name: /^Build my plan/ }).first().click();

  // Campus and major share a screen; picking the major moves on.
  await expect(heading(page)).toHaveText("What do you study?");
  await page.getByRole("radio", { name: "Rutgers–New Brunswick" }).click();
  await page.getByRole("searchbox", { name: "Search majors" }).fill("Computer Science");
  await page.keyboard.press("Enter");
  // The goal comes right after the major, then the time frame.
  await expect(heading(page)).toHaveText("Where do you want to end up?");
  await page.getByRole("radio", { name: /Software engineering/ }).click();
  await expect(heading(page)).toHaveText("How soon do you want to get there?");
  await page.getByRole("radio", { name: "By graduation" }).click();

  // Year and full-time/part-time share a screen. Continue with one missing marks it instead of greying out.
  await expect(heading(page)).toHaveText("Where are you in school?");
  await page.getByRole("radio", { name: "Second year" }).click();
  await page.getByRole("radio", { name: "Fall semester" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert")).toHaveText("1 question on this page still needs an answer.");
  await expect(page.getByText("Pick full-time or part-time to continue.")).toBeVisible();
  await page.getByRole("radio", { name: /Full-time/ }).click();
  // Graduation (engine 0.13.0) is already set to the usual four years: continue.
  await expect(page.getByRole("radio", { name: /At the end of my fourth year/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(heading(page)).toHaveText("What have you already done?");
  await expect(page.getByRole("button", { name: "None yet, continue" })).toBeVisible();
  await page.getByRole("button", { name: "I have a resume" }).click();
  await page.getByRole("searchbox", { name: "Search what you've done" }).fill("hack");
  await page.getByRole("button", { name: "A hackathon" }).click();
  await expect(page.getByRole("heading", { name: "Your picks (2)" })).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(heading(page)).toHaveText("What can you already do?");
  await page.getByRole("button", { name: "Python" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(heading(page)).toHaveText("How much time do you have?");
  await page.getByRole("radio", { name: "10 hours a week outside class" }).click();
  await page.getByRole("radio", { name: "Free for a full-time summer role" }).click();
  await expect(heading(page)).toHaveText("About you (optional)");
  await page.getByRole("radio", { name: "New Jersey" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(heading(page)).toHaveText("Check your answers");
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByText("Computer Science", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Build my plan" }).click();

  await expect(heading(page)).toHaveText("your plan Land your first role in software engineering");
  await expect(page.getByText("software engineering · computer science · second year, fall semester · rutgers–new brunswick · 10 free hours a week")).toBeVisible();
  for (const name of ["Do this now", "This semester", "Your path", "Where you're headed", "Semester by semester"]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }

  await expect(page.locator("canvas")).toHaveCount(0);

  // Open a goal from the full map (the Map tab) and mark it done.
  await page.getByRole("button", { name: "See the full map" }).click();
  await expect(page.getByRole("tab", { name: /^Map/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Your full map" })).toBeVisible();
  const card = page.getByRole("tabpanel").locator("ol button").first();
  await expect(card).toBeVisible();
  const title = (await card.locator("span").first().textContent())!.trim();
  const escaped = title.replace(/[()[\]?*+.]/g, "\\$&");
  const sameTitle = page.getByRole("tabpanel").getByRole("button", { name: new RegExp(`^${escaped}\\s?, `) });
  const before = await sameTitle.count();
  await card.click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("heading", { name: title })).toBeVisible();
  await expect(drawer.getByRole("heading", { name: "Why it's here" })).toBeVisible();
  await expect(drawer.getByRole("heading", { name: "What to do" })).toBeVisible();
  await drawer.getByRole("checkbox").first().check();
  await expect(drawer.getByText(/^1 of \d+ done$/)).toBeVisible();
  await drawer.getByRole("button", { name: "Mark as done" }).click();
  await expect(drawer).toBeHidden();

  // The plan updates: the goal leaves the map (a yearly goal like FAFSA keeps its later-year streams),
  // and back on the Plan tab the goal is under "Checked off".
  await expect(sameTitle).toHaveCount(before - 1);
  await expect(page.getByText(/Plan updated/)).toBeAttached();
  await page.getByRole("tab", { name: "Plan" }).click();
  await expect(page.getByRole("heading", { name: "Checked off" })).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(`^Undo ${title.replace(/[()]/g, "\\$&")}`) })).toBeVisible();

  // Courses tab: the major's courses by year, dated, linked to the official 2026–27 catalog page, tickable.
  await page.getByRole("tab", { name: /^Courses/ }).click();
  const onTrack = page.getByRole("heading", { name: "On track to graduate" }).locator("xpath=ancestor::section[1]");
  await expect(onTrack.getByRole("link", { name: /Official requirements for your major/ })).toHaveAttribute("href", /catalogs\.rutgers\.edu/);
  await expect(onTrack.getByText(/2026–2027 New Brunswick Undergraduate Catalog \(last checked/)).toBeVisible();
  await onTrack.getByRole("checkbox").first().check();
  await expect(onTrack.getByText(/1 of \d+ requirements from earlier years ticked/)).toBeVisible();
  await page.getByRole("tab", { name: "Plan" }).click();

  // The draft map (engine 0.9.0): one line on the Plan tab leads to the Map tab, where the banner says it can be
  // edited; cross a goal out, undo it, then finalize.
  await expect(page.getByRole("heading", { name: "This is a draft map" })).toBeVisible();
  await page.getByRole("button", { name: /Review on the Map tab/ }).click();
  await expect(page.getByRole("heading", { name: "Edit your map" })).toBeFocused();
  await expect(page.getByRole("heading", { name: "This is your draft map" })).toBeVisible();
  await expect(page.getByText("Essential must-do").first()).toBeVisible();
  await page.getByRole("button", { name: /^Not for me: / }).nth(1).click();
  await expect(page.getByRole("heading", { name: "Not for me" })).toBeVisible();
  await page.getByRole("button", { name: /^Undo: / }).click();
  await expect(page.getByRole("heading", { name: "Not for me" })).toBeHidden();
  await page.getByRole("button", { name: "Finalize my map" }).click();
  await expect(page.getByRole("heading", { name: "Your final map" })).toBeVisible();

  // Download the PDF.
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download PDF" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^career-roadmap-software-engineering-\d{4}-\d{2}-\d{2}\.pdf$/);
  const path = await download.path();
  const { readFileSync } = await import("node:fs");
  expect(readFileSync(path!).subarray(0, 5).toString()).toBe("%PDF-");

  expect(seen.violations).toEqual([]);
  expect(seen.offsite).toEqual([]);
});

test("phone: a Newark student gets a one-sided map, a bottom-sheet drawer, and Newark offices @phone", async ({ page }) => {
  const seen = watch(page);
  // Start from a shared link to skip the intake (identity and citizenship are never in it).
  const share = { v: 1, m: "nursing", y: 3, q: "3F", t: "nursing-clinical", h: "graduation", s: "rutgers-newark", w: 10, u: "full", l: "nj", e: ["resume"], k: [], r: [] };
  const hash = Buffer.from(JSON.stringify(share)).toString("base64url");
  await page.goto(`./#plan=${hash}`);
  await expect(heading(page)).toHaveText("Check your answers");
  expect(new URL(page.url()).hash).toBe("");
  await page.getByRole("button", { name: "Build my plan" }).click();
  await expect(heading(page)).toHaveText(/^your plan /);
  await expect(page.getByText(/nursing · third year, fall semester · rutgers–newark ·/)).toBeVisible();
  // The first screen on a phone: the header's actions in one row, the tabs, where you stand, and "Do this now".
  // Measure once the self-hosted fonts are in (a fallback font is wider and would skew the layout).
  await page.evaluate(() => document.fonts.ready);
  const vh = page.viewportSize()!.height;
  const now = (await page.getByRole("heading", { name: "Do this now" }).boundingBox())!;
  expect(now.y + now.height).toBeLessThan(vh);
  // Where you stand (the status strip, with the hours control) is on the first screen too.
  await expect(page.getByTestId("standing")).toBeInViewport();
  await expect(page.getByLabel("Free hours a week:")).toBeInViewport();
  const tops = await Promise.all(["Download PDF", "Share link", "Edit answers"].map(async (n) => (await page.getByRole("button", { name: n }).boundingBox())!.y));
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(4);
  // Every tab label fits.
  for (const t of await page.getByRole("tab").all()) {
    const box = (await t.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  }
  // A narrower phone (360px): the actions may wrap, but nothing scrolls sideways.
  const size = page.viewportSize()!;
  await page.setViewportSize({ width: 360, height: size.height });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize(size);
  await page.getByRole("heading", { name: "This semester" }).scrollIntoViewIfNeeded();
  await page.locator("section[aria-labelledby=next-h] li button").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  // Resources name Newark's offices, and never New Brunswick's.
  await page.getByRole("tab", { name: /^Resources/ }).click();
  await expect(page.getByText(/^rutgers–newark /).first()).toBeVisible();
  // A New Brunswick-only office would read "rutgers–new brunswick  <kind>"; shared ones name both campuses.
  await expect(page.getByText(/^rutgers–new brunswick {2}/)).toHaveCount(0);
  expect(seen.violations).toEqual([]);
  expect(seen.offsite).toEqual([]);
});

/** Scrolls the page down to `to` a little each frame, like a steady trackpad, so the story's forward-only progress plays. */
const scrollDown = (page: Page, to: number) => page.evaluate(async (to) => {
  while (scrollY < to - 2) { scrollTo(0, Math.min(to, scrollY + 60)); await new Promise((r) => requestAnimationFrame(r)); if (scrollY + innerHeight >= document.body.scrollHeight) break; }
}, to);
const topOf = (page: Page, sel: string) => page.evaluate((sel) => document.querySelector(sel)!.getBoundingClientRect().top + scrollY, sel);
/** Everything a keyboard could reach inside the story, outside the frozen screens. */
const reachable = (page: Page) => page.evaluate(() => [...document.querySelector("section[aria-labelledby=how-h]")!.querySelectorAll<HTMLElement>("a, button, input, select, textarea, [tabindex]")]
  .filter((el) => !el.closest("[inert]") && el.tabIndex >= 0).map((el) => el.textContent!.trim()));

// The landing (direction A) and its story, "How it works" (docs/STORY_DESIGN.md), on a laptop and on a phone.
// The laptop plays the story by scrolling; the phone runs with reduced motion, where nothing pins and everything shows finished.
for (const phone of [false, true]) {
  test(`landing and how it works${phone ? " @phone" : ""}`, async ({ page }) => {
    const w = watch(page);
    await page.goto("./");
    await expect(heading(page)).toHaveText("Know what to do now.");
    await expect(page.getByText("A confluence of streams will carry you toward your goal")).toBeVisible();
    await expect(page.getByText("no account needed")).toBeVisible();
    await expect(page.getByRole("img", { name: "conflu" })).toBeVisible();
    for (const gone of ["confluence.txt", "fig. 1", "free · no account"]) await expect(page.getByText(gone, { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /sample plan/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Build my plan/ }).first()).toBeInViewport();
    expect((await page.locator("canvas").first().boundingBox())!.width).toBeGreaterThan(200);

    const story = page.locator("section[aria-labelledby=how-h]");
    await expect(story.locator("[inert]")).toHaveCount(5);
    expect(await reachable(page)).toEqual([expect.stringMatching(/^Skip to the finished plan/), expect.stringMatching(/^Build my plan/)]);
    const step = (n: number) => story.locator(`[data-story-step="${n}"]`);
    const picked = step(1).locator("[inert] [role=radio][aria-checked=true]");
    const ticks = step(4).locator("input.tick");

    if (!phone) {
      // Pinned: each step is a tall section whose screen stays put while it plays.
      const tall = await step(1).evaluate((el) => (el as HTMLElement).offsetHeight / innerHeight);
      expect(tall).toBeGreaterThan(2.3);
      await expect(picked).toHaveCount(0);
      // Step 1 plays: a campus, then 5 hours, picked in violet; the label "your pick" appears in the window's bar.
      await scrollDown(page, (await topOf(page, '[data-story-step="1"]')) + 1200);
      await expect(step(1).locator("h3")).toBeInViewport();
      await expect(picked).toHaveText(["Rutgers–New Brunswick", "5 hours a week outside class"]);
      await expect.poll(() => picked.last().evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(84, 86, 132)");
      // Steps 2 to 4: Do this now, the map down to the goal, and the steps ticked off in verdigris.
      await scrollDown(page, (await topOf(page, '[data-story-step="4"]')) + 1250);
      await expect(step(2).locator("[inert]").getByText("Do this now", { exact: true })).toBeAttached();
      await expect(step(3).locator("[inert]").getByText("Land your first role in software engineering", { exact: true })).toBeAttached();
      await expect(step(4).getByText(/^(\d) of \1 done$/)).toBeVisible();
      // Forward only: scrolling back up leaves everything as it played.
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(300);
      await expect(picked).toHaveCount(2);
      await expect(step(4).getByText(/^(\d) of \1 done$/)).toBeAttached();
    } else {
      // Reduced motion: nothing pinned, every step finished.
      for (const n of [1, 2, 3, 4]) expect(await step(n).evaluate((el) => (el as HTMLElement).offsetHeight / innerHeight)).toBeLessThan(1.6);
      await expect(picked).toHaveCount(2);
      for (const t of await ticks.all()) await expect(t).toBeChecked();
    }

    // Skip to the finished plan: focus lands on the end, and the finished sample plan is there, frozen, then the button.
    await page.evaluate(() => scrollTo(0, 0));
    await story.getByRole("button", { name: /^Skip to the finished plan/ }).click();
    const end = page.getByRole("heading", { level: 3, name: "Your plan, start to finish" });
    await expect(end).toBeFocused();
    await expect(end).toBeInViewport();
    const finale = page.locator("section[aria-labelledby=story-end]");
    await expect(finale.locator("[inert]").getByText("Do this now", { exact: true })).toBeVisible();
    await expect(finale.getByRole("button", { name: /^Build my plan/ })).toBeVisible();

    // Privacy and data at the very end: open it, and it links nowhere off the site.
    await page.getByText("Privacy and data").click();
    await expect(page.getByText("No tracking or analytics")).toBeVisible();
    await expect(page.locator("footer a[href*='github.com']")).toHaveCount(0);

    expect(await page.evaluate(() => [localStorage.getItem("cpm.plan.v1"), localStorage.getItem("cpm.steps.v1")])).toEqual([null, null]);
    await finale.getByRole("button", { name: /^Build my plan/ }).click();
    await expect(heading(page)).toHaveText("What do you study?");
    expect(w.violations).toEqual([]);
    expect(w.offsite).toEqual([]);
  });
}

// The story's frame budget (docs/STORY_DESIGN.md §7): a steady scroll through all of it with the processor slowed 4×.
// A frame "misses" when it takes more than 1.5 display refreshes (25 ms at 60 Hz); timer jitter alone puts perfect frames at 16.6–17 ms.
test("how it works stays smooth with the processor slowed 4x", async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto("./");
  await page.waitForTimeout(3000); // a visitor reading the hero; the frozen screens mount in idle time meanwhile
  const r = await page.evaluate(async () => {
    const start = document.querySelector("[data-story-step='1']")!.getBoundingClientRect().top + scrollY - innerHeight;
    const end = document.getElementById("story-end")!.getBoundingClientRect().top + scrollY + 400;
    scrollTo(0, start); await new Promise((r) => setTimeout(r, 300));
    const d: number[] = []; let last = performance.now();
    while (scrollY < end - 2) {
      await new Promise((r) => requestAnimationFrame(r));
      const now = performance.now(); d.push(now - last); last = now;
      scrollTo(0, scrollY + 40);
    }
    d.shift();
    return { frames: d.length, missed: d.filter((x) => x > 25).length / d.length, worst: Math.max(...d) };
  });
  console.log(`story frames at 4x: ${r.frames} frames, ${(r.missed * 100).toFixed(1)}% missed, worst ${r.worst.toFixed(1)} ms`);
  expect(r.frames).toBeGreaterThan(150);
  expect(r.missed).toBeLessThan(0.05);
  expect(r.worst).toBeLessThan(50);
});
