// Serves dist/ the way GitHub Pages does: under the repository path (e.g. /conflu/), compressed, with no
// extra response headers (the Content-Security-Policy ships inside index.html as a meta tag).
// Run: node scripts/serve.mjs [port] [base]   e.g. node scripts/serve.mjs 4321 /conflu/   (after building with the same BASE_PATH)
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, normalize, dirname } from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../dist");
const port = Number(process.argv[2] ?? 4321);
const base = (process.argv[3] ?? "/").replace(/\/?$/, "/");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".json": "application/json", ".txt": "text/plain; charset=utf-8" };

createServer((req, res) => {
  const full = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (full === base.slice(0, -1)) { res.writeHead(301, { Location: base }).end(); return; }
  if (!full.startsWith(base)) { res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found"); return; }
  const path = "/" + full.slice(base.length);
  let file = normalize(join(root, path));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, "index.html");
  const type = TYPES[extname(file)] ?? "application/octet-stream";
  res.setHeader("Content-Type", type);
  // Compress text like GitHub Pages does, so local Lighthouse numbers match production.
  let body = readFileSync(file);
  const accept = String(req.headers["accept-encoding"] ?? "");
  if (/text|javascript|json|svg/.test(type)) {
    if (accept.includes("br")) { body = brotliCompressSync(body); res.setHeader("Content-Encoding", "br"); }
    else if (accept.includes("gzip")) { body = gzipSync(body); res.setHeader("Content-Encoding", "gzip"); }
    res.setHeader("Vary", "Accept-Encoding");
  }
  res.end(body);
}).listen(port, () => console.log(`Serving dist/ on http://localhost:${port}${base}`));
