// Measures how smooth the three camera moves are in the built app (design/check-smoothness.cjs, pointed at dist/),
// at normal speed and with the CPU slowed 4x and 6x (a rough stand-in for a mid-range and a low-end phone). For each
// move it records every frame the browser presented and reports the frame rate, the slowest frames, and how long the
// river took to draw.
//
// Run: npm run build && node scripts/check-smoothness.cjs   (serves dist/ itself on port 4329)
// Pass (design/RIVER.md §5): at full speed and 4x slower, on desktop and phone sizes, no move averages under 50 frames a
// second and fewer than 3% of frames take longer than 34 ms. The 6x and 2560x1440 runs are reported, not required.
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");

const PORT = 4329, URL = `http://localhost:${PORT}/`;
const share = Buffer.from(JSON.stringify({ v: 1, m: "computer-science", y: 2, q: "2F", t: "software-engineering", h: "graduation",
  s: "rutgers-nb", n: "full-time", w: 8, u: "full", l: "nj", e: ["resume"], k: ["python"], r: [] })).toString("base64url");

(async () => {
  const server = spawn("node", [path.join(__dirname, "serve.mjs"), String(PORT), "/"], { stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 800));
  const browser = await chromium.launch();
  const rows = [];
  try {
    for (const [device, vp] of [["desktop 1440x900", { width: 1440, height: 900 }], ["phone 390x844", { width: 390, height: 844 }], ["large 2560x1440", { width: 2560, height: 1440 }]]) {
      for (const slow of [1, 4, 6]) {
        const page = await browser.newPage({ viewport: vp, deviceScaleFactor: device.startsWith("phone") ? 3 : 1 });
        const cdp = await page.context().newCDPSession(page);
        const ready = async () => {
          await page.waitForFunction(() => window.__river);
          await cdp.send("Emulation.setCPUThrottlingRate", { rate: slow });
          await page.evaluate(() => {
            window.__f = []; let last = performance.now();
            const tick = (t) => { window.__f.push(t - last); last = t; requestAnimationFrame(tick); };
            requestAnimationFrame(tick);
          });
        };
        const measure = async (name, startMove, ms) => {
          await page.evaluate(() => { window.__f.length = 0; window.__river.resetStats(); });
          await startMove();
          await page.waitForTimeout(ms);
          const r = await page.evaluate(() => {
            const f = window.__f.slice(2).sort((a, b) => a - b), n = f.length, sum = f.reduce((a, b) => a + b, 0);
            return { n, fps: 1000 / (sum / n), p95: f[Math.floor(n * 0.95)], worst: f[n - 1], long: f.filter((x) => x > 34).length / n, st: window.__river.stats };
          });
          rows.push({ device, slow: slow + "x", move: name, fps: r.fps.toFixed(1), "95% under (ms)": r.p95.toFixed(1), "worst (ms)": r.worst.toFixed(1),
            "long frames": (r.long * 100).toFixed(1) + "%", "draw avg (ms)": r.st.avgMs.toFixed(1), glyphs: r.st.cells, "glyph scale": r.st.quality.toFixed(2) });
        };
        // 1. The intro: hold low over the water, then the rise to the landing.
        await page.goto(URL + "?measure");
        await ready();
        await measure("intro to landing", async () => {}, 5600);
        // 2. Start: down the stem to the water's edge.
        await measure("landing to questions", () => page.getByRole("button", { name: "Start", exact: true }).click(), 3600);
        // 3. Build my plan: the burst of hops, then the turn downstream (from a shared link's review screen).
        await page.goto(URL + "?measure#plan=" + share);
        await page.reload();
        await ready();
        await page.waitForTimeout(600);
        await measure("questions to results", () => page.getByRole("button", { name: "Build my plan" }).click(), 3800);
        await page.close();
      }
    }
  } finally {
    await browser.close();
    server.kill();
  }
  console.table(rows);
  const required = rows.filter((r) => !r.device.startsWith("large") && (r.slow === "1x" || r.slow === "4x"));
  const bad = required.filter((r) => Number(r.fps) < 50 || parseFloat(r["long frames"]) > 3);
  console.log(bad.length ? `NOT SMOOTH in ${bad.length} of ${required.length} required runs` : `Smooth in all ${required.length} required runs (full speed and 4x slower, desktop and phone)`);
  process.exitCode = bad.length ? 1 : 0;
})();
