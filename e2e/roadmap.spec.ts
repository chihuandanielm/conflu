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
  await expect(heading(page)).toContainText("semester-by-semester career plan");
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

  await page.getByRole("button", { name: "Start" }).click();

  await expect(heading(page)).toHaveText("Where are you right now?");
  await page.keyboard.press("1");                                         // college student (auto-advances)
  await expect(heading(page)).toHaveText("Which Rutgers campus are you at?");
  await page.getByRole("radio", { name: "Rutgers–New Brunswick" }).click();
  await expect(heading(page)).toHaveText("What's your major?");
  await page.getByRole("searchbox", { name: "Search majors" }).fill("Computer Science");
  await page.keyboard.press("Enter");
  await expect(heading(page)).toHaveText("What year are you in?");
  await page.keyboard.press("2");
  await expect(heading(page)).toHaveText("Where do you want to end up?");
  await page.getByRole("radio", { name: /Software engineering/ }).click();
  await expect(heading(page)).toHaveText("How soon do you want to get there?");
  await page.getByRole("radio", { name: "By graduation" }).click();

  await expect(heading(page)).toHaveText("What have you already done?");
  await expect(page.getByRole("button", { name: "None yet, continue" })).toBeVisible();
  await page.getByRole("button", { name: "I have a resume" }).click();
  await page.getByRole("searchbox", { name: "Search what you've done" }).fill("hack");
  await page.getByRole("button", { name: "A hackathon" }).click();
  await expect(page.getByRole("heading", { name: "Your picks (2)" })).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(heading(page)).toHaveText("Which skills are you comfortable with?");
  await page.getByRole("button", { name: "Python" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(heading(page)).toHaveText("Do you have any of these certifications?");
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(heading(page)).toHaveText("How many hours a week can you put toward this?");
  await page.getByRole("radio", { name: "10 hours a week" }).click();
  await expect(heading(page)).toHaveText("What about summers?");
  await page.keyboard.press("1");
  await expect(heading(page)).toHaveText("Where are you based?");
  await page.getByRole("radio", { name: "New Jersey" }).click();
  await expect(heading(page)).toHaveText("What's your citizenship status?");
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(heading(page)).toHaveText("Anything else we should know?");
  await page.getByRole("button", { name: "Skip" }).click();

  await expect(heading(page)).toHaveText("Check your answers");
  await expect(page.getByText("Computer Science", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Build my plan" }).click();

  await expect(heading(page)).toHaveText("Your career roadmap");
  await expect(page.getByText("Software engineering · Computer Science, year 2 · Rutgers–New Brunswick · by graduation · 10 hrs/week")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your next moves" })).toBeVisible();

  // Open a goal from the chart and mark it done.
  const card = page.locator(".react-flow__node-item button").first();
  await expect(card).toBeVisible();
  const title = (await card.locator("span").first().textContent())!.trim();
  const goal = (await card.getAttribute("data-goal"))!;
  const sameTitle = page.locator(`.react-flow__node-item button[data-goal^="${goal.split("@")[0]}"]`);
  const before = await sameTitle.count();
  await card.click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("heading", { name: title })).toBeVisible();
  await expect(drawer.getByText("Why it's in your plan")).toBeVisible();
  await expect(drawer.getByRole("heading", { name: "What to do" })).toBeVisible();
  await drawer.getByRole("checkbox").first().check();
  await expect(drawer.getByText(/^1 of \d+ done$/)).toBeVisible();
  await drawer.getByRole("button", { name: "Mark as done" }).click();
  await expect(drawer).toBeHidden();

  // The plan updates: the goal moves to "Checked off" and its card leaves the chart
  // (a yearly goal like FAFSA keeps its later-year cards).
  await expect(page.getByRole("heading", { name: "Checked off" })).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(`^Undo ${title.replace(/[()]/g, "\\$&")}`) })).toBeVisible();
  await expect(sameTitle).toHaveCount(before - 1);
  await expect(page.getByText(/Plan updated/)).toBeAttached();

  // Download the PDF.
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download PDF" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^career-roadmap-software-engineering-\d{4}-\d{2}-\d{2}\.pdf$/);
  const path = await download.path();
  const { readFileSync } = await import("node:fs");
  expect(readFileSync(path!).subarray(0, 5).toString()).toBe("%PDF-");

  expect(seen.violations).toEqual([]);
  expect(seen.offsite).toEqual([]);
});

test("phone: a Newark student gets a timeline, a bottom-sheet drawer, and Newark offices @phone", async ({ page }) => {
  const seen = watch(page);
  // Start from a shared link to skip the intake (identity and citizenship are never in it).
  const share = { v: 1, m: "nursing", y: 3, t: "nursing-clinical", h: "graduation", s: "rutgers-newark", w: 10, u: "full", l: "nj", e: ["resume"], k: [], r: [] };
  const hash = Buffer.from(JSON.stringify(share)).toString("base64url");
  await page.goto(`./#plan=${hash}`);
  await expect(heading(page)).toHaveText("Check your answers");
  expect(new URL(page.url()).hash).toBe("");
  await page.getByRole("button", { name: "Build my plan" }).click();
  await expect(heading(page)).toHaveText("Your career roadmap");
  await expect(page.getByText(/Nursing, year 3 · Rutgers–Newark ·/)).toBeVisible();
  await expect(page.locator(".react-flow")).toHaveCount(0);
  await page.getByRole("heading", { name: "Semester by semester" }).scrollIntoViewIfNeeded();
  await page.locator("section[aria-labelledby=roadmap-h] li button").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  // Resources name Newark's offices, and never New Brunswick's.
  await page.getByRole("tab", { name: "Your resources" }).click();
  await expect(page.getByText("Rutgers–Newark", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Rutgers–New Brunswick", { exact: true })).toHaveCount(0);
  expect(seen.violations).toEqual([]);
  expect(seen.offsite).toEqual([]);
});
