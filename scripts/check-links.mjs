// Requests every resource's url (and applyUrl) and records the result in its verification field.
// Run: node scripts/check-links.mjs   (needs Node 22+ and internet access; CI runs it weekly)
//
// States it writes:
//   link-checked  the page loaded (2xx after redirects)
//   blocked       the site answered but refused an automated visitor (401/403/429/999, bot walls, timeouts).
//                 Most of these work fine in a browser. A previous search-confirmed state is kept.
//   broken        the page is gone (404/410), the host doesn't resolve, or it fails with a server error twice
// It also records httpStatus and finalUrl (when a redirect changed the address), so moved pages are easy to spot.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const resDir = join(root, "data/resources");
const today = new Date().toISOString().slice(0, 10);
const CONCURRENCY = 8;

// A normal browser request. Many university and government sites reject unknown user agents outright.
const HEADERS = {
  "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
};
const BLOCK_CODES = new Set([401, 403, 406, 429, 999]);
const GONE_CODES = new Set([404, 410]);

/** @returns {Promise<{ state: "link-checked" | "blocked" | "broken", httpStatus: number | null, finalUrl: string, why?: string }>} */
export async function check(url) {
  let last = { state: "broken", httpStatus: null, finalUrl: url, why: "no response" };
  for (let attempt = 0; attempt < 2; attempt++) { // GET, not HEAD: bot walls answer 200 and only the body tells
    const method = "GET";
    try {
      const res = await fetch(url, { method, redirect: "follow", headers: HEADERS, signal: AbortSignal.timeout(25000) });
      const finalUrl = res.url || url;
      if (res.ok) {
        const body = (await res.text()).slice(0, 20000).toLowerCase();
        if (/just a moment|attention required|cf-chl|captcha|access denied/.test(body)) return { state: "blocked", httpStatus: res.status, finalUrl, why: "bot wall" };
        return { state: "link-checked", httpStatus: res.status, finalUrl };
      }
      await res.body?.cancel();
      if (GONE_CODES.has(res.status)) return { state: "broken", httpStatus: res.status, finalUrl, why: `HTTP ${res.status}` };
      last = { state: BLOCK_CODES.has(res.status) ? "blocked" : "broken", httpStatus: res.status, finalUrl, why: `HTTP ${res.status}` };
    } catch (e) {
      const code = e?.cause?.code ?? e?.name ?? "error";
      if (code === "ENOTFOUND") return { state: "broken", httpStatus: null, finalUrl: url, why: "host not found" };
      last = { state: "blocked", httpStatus: null, finalUrl: url, why: code === "TimeoutError" ? "timed out" : String(code) };
    }
  }
  return last;
}

/** Merge a check result into the stored verification. A blocked check never erases a search confirmation. */
export function merge(prev, result, day) {
  const moved = result.finalUrl && normalize(result.finalUrl) !== normalize(prev.url) ? { finalUrl: result.finalUrl } : {};
  const base = { checkedOn: day, httpStatus: result.httpStatus, ...moved };
  if (result.state === "blocked" && prev.verification?.state === "search-confirmed") {
    return { ...prev.verification, ...base, state: "search-confirmed", note: `Confirmed by search; automated check was refused (${result.why}).` };
  }
  const note = result.state === "link-checked" ? undefined
    : result.state === "blocked" ? `Site refused the automated check (${result.why}); open it by hand.`
    : `Link failed (${result.why}); needs a new URL.`;
  return { state: result.state, ...base, ...(note ? { note } : {}) };
}
const normalize = (u) => u.replace(/\/+$/, "").replace(/^https?:\/\/www\./, "https://").toLowerCase();

async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = readdirSync(resDir).filter((f) => f.endsWith(".json")).sort();
  const report = { "link-checked": 0, blocked: 0, broken: [], moved: [], applyBroken: [] };
  for (const file of files) {
    const path = join(resDir, file);
    const data = JSON.parse(readFileSync(path, "utf8"));
    const results = await pool(data.resources, CONCURRENCY, async (r) => ({ main: await check(r.url), apply: r.applyUrl ? await check(r.applyUrl) : null }));
    data.resources.forEach((r, k) => {
      const { main, apply } = results[k];
      r.verification = merge(r, main, today);
      const s = r.verification.state;
      if (s === "broken") report.broken.push(`${file} › ${r.id} › ${r.url} (${main.why})`);
      else report[s === "blocked" ? "blocked" : "link-checked"]++;
      if (r.verification.finalUrl) report.moved.push(`${r.id}: ${r.url} → ${r.verification.finalUrl}`);
      if (apply?.state === "broken") report.applyBroken.push(`${r.id}: applyUrl ${r.applyUrl} (${apply.why})`);
    });
    writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
  }
  console.log(`Loaded: ${report["link-checked"]}  Blocked (check by hand): ${report.blocked}  Broken: ${report.broken.length}`);
  if (report.moved.length) console.log(`\nRedirected (consider updating):\n${report.moved.join("\n")}`);
  if (report.applyBroken.length) console.log(`\nBroken apply links:\n${report.applyBroken.join("\n")}`);
  if (report.broken.length) console.log(`\nBroken:\n${report.broken.join("\n")}`);
  process.exitCode = report.broken.length ? 1 : 0;
}
