// Requests every resource's url and records the result in its verification field.
// Run: node scripts/check-links.mjs   (needs Node 18+ and internet access)
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const resDir = join(root, "data/resources");
const today = new Date().toISOString().slice(0, 10);
const broken = [];

async function check(url) {
  for (const method of ["HEAD", "GET"]) {
    try {
      const res = await fetch(url, { method, redirect: "follow", signal: AbortSignal.timeout(20000),
        headers: { "user-agent": "career-pathway-mapper-linkcheck" } });
      if (res.ok) return true;
      if (res.status === 403 || res.status === 405) continue; // some sites block HEAD or bots
    } catch {}
  }
  return false;
}

for (const file of readdirSync(resDir).filter((f) => f.endsWith(".json"))) {
  const path = join(resDir, file);
  const data = JSON.parse(readFileSync(path, "utf8"));
  for (const r of data.resources) {
    const ok = await check(r.url);
    r.verification = { state: ok ? "link-checked" : "broken", checkedOn: today };
    if (!ok) broken.push(`${file} › ${r.id} › ${r.url}`);
  }
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

console.log(broken.length ? `Broken or blocked:\n${broken.join("\n")}` : "All links responded.");
process.exitCode = broken.length ? 1 : 0;
