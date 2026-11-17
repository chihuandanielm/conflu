// Measures how smooth the three camera moves are, at normal speed and with the CPU slowed 4x and 6x
// (a rough stand-in for a mid-range and a low-end phone). For each move it records every frame the browser
// presented and reports the frame rate, the slowest frames, and how long the river took to draw.
//
// Run from the repo root (needs Playwright with Chromium):  node design/check-smoothness.cjs
// Pass: no move drops below 50 frames a second on average, and fewer than 3% of frames are longer than 34 ms.
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const ROOT = __dirname;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2" };

(async () => {
  const browser = await chromium.launch();
  const rows = [];
  for (const [device, vp] of [["desktop 1440x900", { width: 1440, height: 900 }], ["phone 390x844", { width: 390, height: 844 }], ["large 2560x1440", { width: 2560, height: 1440 }]]) {
    for (const slow of [1, 4, 6]) {
      const page = await browser.newPage({ viewport: vp, deviceScaleFactor: device.startsWith("phone") ? 3 : 1 });
      await page.route("http://proto.local/**", (route) => {
        const f = path.join(ROOT, new URL(route.request().url()).pathname);
        if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: "" });
        route.fulfill({ status: 200, contentType: TYPES[path.extname(f)] ?? "application/octet-stream", body: fs.readFileSync(f) });
      });
      const cdp = await page.context().newCDPSession(page);
      await page.goto("http://proto.local/prototypes/site.html");
      await page.waitForFunction(() => window.river);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: slow });
      // Record the time between every presented frame.
      await page.evaluate(() => {
        window.__f = []; let last = performance.now();
        const tick = (t) => { window.__f.push(t - last); last = t; requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      });
      const measure = async (name, startMove, ms) => {
        await page.evaluate(() => { window.__f.length = 0; window.river.resetStats(); });
        await startMove();
        await page.waitForTimeout(ms);
        const r = await page.evaluate(() => {
          const f = window.__f.slice(2).sort((a, b) => a - b), n = f.length, sum = f.reduce((a, b) => a + b, 0);
          return { n, fps: 1000 / (sum / n), p95: f[Math.floor(n * 0.95)], worst: f[n - 1], long: f.filter((x) => x > 34).length / n, st: window.river.stats };
        });
        rows.push({ device, slow: slow + "x", move: name, fps: r.fps.toFixed(1), "95% under (ms)": r.p95.toFixed(1), "worst (ms)": r.worst.toFixed(1),
          "long frames": (r.long * 100).toFixed(1) + "%", "draw avg (ms)": r.st.avgMs.toFixed(1), "draw worst (ms)": r.st.worstMs.toFixed(1), glyphs: r.st.cells, "glyph scale": r.st.quality.toFixed(2) });
      };
      await measure("intro to landing", async () => {}, 5600);
      await measure("landing to questions", () => page.click("#start"), 3600);
      await page.keyboard.press("1"); await page.click("#next"); await page.waitForTimeout(500);
      await page.keyboard.press("1"); await page.click("#next"); await page.waitForTimeout(500);
      await page.keyboard.press("1");
      await measure("questions to results", () => page.click("#next"), 3800);
      await page.close();
    }
  }
  await browser.close();
  console.table(rows);
  const bad = rows.filter((r) => Number(r.fps) < 50 || parseFloat(r["long frames"]) > 3);
  console.log(bad.length ? `NOT SMOOTH in ${bad.length} of ${rows.length} runs` : `Smooth in all ${rows.length} runs`);
  process.exitCode = bad.length ? 1 : 0;
})();
