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
  await expect(heading(page)).toHaveText("Many streams, one plan.");
  await expect(page.getByText(/general trajectory, not a blueprint/)).toBeVisible();

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

  // One river for the whole session: remember the canvas, and check it is the same one on every screen.
  await page.evaluate(() => { (window as unknown as { __river?: Element }).__river = document.querySelector("canvas[data-river]")!; });
  const sameRiver = () => page.evaluate(() => document.querySelectorAll("canvas").length === 1
    && document.querySelector("canvas[data-river]") === (window as unknown as { __river?: Element }).__river);
  expect(await sameRiver()).toBe(true);
  await page.getByRole("button", { name: "Start", exact: true }).click();

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
  expect(await sameRiver()).toBe(true);
  await expect(page.getByText("Computer Science", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Build my plan" }).click();

  await expect(heading(page)).toHaveText("Your plan");
  await expect(page.getByText("Software engineering · Computer Science · Second year, fall semester · Rutgers–New Brunswick · 10 free hours a week")).toBeVisible();
  for (const name of ["Do this now", "This semester", "Where you're headed", "What you have", "What you need", "Coming up"]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }

  expect(await sameRiver()).toBe(true);

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
  const onTrack = page.getByRole("heading", { name: "On track to graduate" }).locator("xpath=..");
  await expect(onTrack.getByRole("link", { name: /Official requirements for your major/ })).toHaveAttribute("href", /catalogs\.rutgers\.edu/);
  await expect(onTrack.getByText(/2026–2027 New Brunswick Undergraduate Catalog \(last checked/)).toBeVisible();
  await onTrack.getByRole("checkbox").first().check();
  await expect(onTrack.getByText(/1 of \d+ requirements from earlier years ticked/)).toBeVisible();
  await page.getByRole("tab", { name: "Plan" }).click();

  // The draft map (engine 0.9.0): the banner says it can be edited; cross a goal out, undo it, then finalize.
  await expect(page.getByRole("heading", { name: "This is your draft map" })).toBeVisible();
  await page.getByRole("button", { name: "Edit your map" }).click();
  await expect(page.getByRole("heading", { name: "Edit your map" })).toBeFocused();
  await expect(page.getByText("Essential must-do").first()).toBeVisible();
  await page.getByRole("button", { name: /^Not for me: / }).nth(1).click();
  await expect(page.getByRole("heading", { name: "Not for me" })).toBeVisible();
  await page.getByRole("button", { name: /^Undo: / }).click();
  await expect(page.getByRole("heading", { name: "Not for me" })).toBeHidden();
  await page.getByRole("tab", { name: "Plan" }).click();
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
  await expect(heading(page)).toHaveText("Your plan");
  await expect(page.getByText(/Nursing · Third year, fall semester · Rutgers–Newark ·/)).toBeVisible();
  // The first screen on a phone: the header's actions in one row, the tabs, and "Do this now" with this semester.
  // Measure once the self-hosted fonts are in (a fallback font is wider and would skew the layout).
  await page.evaluate(() => document.fonts.ready);
  const vh = page.viewportSize()!.height;
  const now = (await page.getByRole("heading", { name: "Do this now" }).boundingBox())!;
  expect(now.y + now.height).toBeLessThan(vh);
  await expect(page.getByRole("heading", { name: "Do this now" }).locator("xpath=ancestor::section[1]").getByText(/^This semester: /)).toBeInViewport();
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
