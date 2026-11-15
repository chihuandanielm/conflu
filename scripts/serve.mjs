// Serves dist/ with the headers from dist/_headers applied the way Cloudflare Pages applies them, so the
// strict Content-Security-Policy is exercised locally and in the end-to-end test.
// Run: node scripts/serve.mjs [port]   (after npm run build)
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, normalize, dirname } from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../dist");
const port = Number(process.argv[2] ?? 4321);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".json": "application/json", ".txt": "text/plain; charset=utf-8" };

/** Parses Cloudflare's _headers format: a path pattern line, then indented "Name: value" lines. */
export function parseHeaders(text) {
  const rules = []; let cur = null;
  for (const line of text.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) { cur = { pattern: line.trim(), headers: {} }; rules.push(cur); continue; }
    const i = line.indexOf(":"); if (cur && i > 0) cur.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return rules;
}
const matches = (pattern, path) => new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`).test(path);

const rules = existsSync(join(root, "_headers")) ? parseHeaders(readFileSync(join(root, "_headers"), "utf8")) : [];
createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = normalize(join(root, path));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, "index.html");
  for (const r of rules) if (matches(r.pattern, path)) for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v);
  const type = TYPES[extname(file)] ?? "application/octet-stream";
  res.setHeader("Content-Type", type);
  // Compress text like Cloudflare does, so local Lighthouse numbers match production.
  let body = readFileSync(file);
  const accept = String(req.headers["accept-encoding"] ?? "");
  if (/text|javascript|json|svg/.test(type)) {
    if (accept.includes("br")) { body = brotliCompressSync(body); res.setHeader("Content-Encoding", "br"); }
    else if (accept.includes("gzip")) { body = gzipSync(body); res.setHeader("Content-Encoding", "gzip"); }
    res.setHeader("Vary", "Accept-Encoding");
  }
  res.end(body);
}).listen(port, () => console.log(`Serving dist/ with _headers on http://localhost:${port}`));
