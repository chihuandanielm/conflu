// Bundles a prototype into one self-contained HTML file (fonts, CSS and the river inlined),
// so it opens anywhere with no server: node design/build-preview.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(join(here, f), "utf8");
const css = read("tokens.css").replace(/url\("\.\/prototypes\/fonts\/([^"]+)"\)/g, (_, f) =>
  `url("data:font/woff2;base64,${readFileSync(join(here, "prototypes/fonts", f)).toString("base64")}")`);
const river = read("river/river.js").replace(/^export /gm, "");

mkdirSync(join(here, "preview"), { recursive: true });
for (const [src, out] of [["prototypes/flow.html", "preview/landing-to-questions.html"]]) {
  const html = read(src)
    .replace('<link rel="stylesheet" href="../tokens.css">', () => `<style>${css}</style>`)
    .replace(/import \{[^}]+\} from "\.\.\/river\/river\.js";/, () => river);
  writeFileSync(join(here, out), html);
  console.log(out, Math.round(html.length / 1024) + " KB");
}
