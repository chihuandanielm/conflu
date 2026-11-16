// Converts the self-hosted IBM Plex WOFF files from @fontsource into TTF for the PDF renderer,
// which can't parse WOFF in the browser build. WOFF 1 is TrueType with zlib-compressed tables,
// so this only needs node:zlib. Output: public/fonts/*.ttf (IBM Plex is under the SIL Open Font License).
// Run: node scripts/woff-to-ttf.mjs   (also runs before every build)
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public/fonts");
const FONTS = [
  ["@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff", "ibm-plex-sans-400.ttf"],
  ["@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff", "ibm-plex-sans-600.ttf"],
  ["@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff", "ibm-plex-mono-400.ttf"],
];

export function woffToSfnt(woff) {
  if (woff.toString("ascii", 0, 4) !== "wOFF") throw new Error("not a WOFF 1 file");
  const flavor = woff.readUInt32BE(4), numTables = woff.readUInt16BE(12);
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const o = 44 + i * 20;
    const t = { tag: woff.readUInt32BE(o), offset: woff.readUInt32BE(o + 4), comp: woff.readUInt32BE(o + 8), orig: woff.readUInt32BE(o + 12), sum: woff.readUInt32BE(o + 16) };
    const raw = woff.subarray(t.offset, t.offset + t.comp);
    t.data = t.comp < t.orig ? inflateSync(raw) : Buffer.from(raw);
    if (t.data.length !== t.orig) throw new Error("table size mismatch");
    tables.push(t);
  }
  let pow = 1, log = 0; while (pow * 2 <= numTables) { pow *= 2; log++; }
  const headerLen = 12 + 16 * numTables;
  const size = headerLen + tables.reduce((n, t) => n + ((t.orig + 3) & ~3), 0);
  const buf = Buffer.alloc(size);
  buf.writeUInt32BE(flavor, 0); buf.writeUInt16BE(numTables, 4);
  buf.writeUInt16BE(pow * 16, 6); buf.writeUInt16BE(log, 8); buf.writeUInt16BE(numTables * 16 - pow * 16, 10);
  let offset = headerLen;
  tables.sort((a, b) => a.tag - b.tag).forEach((t, i) => {
    const r = 12 + i * 16;
    buf.writeUInt32BE(t.tag, r); buf.writeUInt32BE(t.sum, r + 4); buf.writeUInt32BE(offset, r + 8); buf.writeUInt32BE(t.orig, r + 12);
    t.data.copy(buf, offset); offset += (t.orig + 3) & ~3;
  });
  return buf;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync(out, { recursive: true });
  for (const [src, name] of FONTS) writeFileSync(join(out, name), woffToSfnt(readFileSync(join(root, "node_modules", src))));
  const license = join(root, "node_modules/@fontsource/ibm-plex-sans/LICENSE");
  if (existsSync(license)) copyFileSync(license, join(out, "OFL-LICENSE.txt"));
  console.log(`Wrote ${FONTS.length} TTF files to public/fonts`);
}
