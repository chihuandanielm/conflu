// Bundles each prototype into one self-contained HTML file (fonts, CSS and every module inlined), so it
// opens from disk in any browser with no server:  node design/build-preview.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(join(here, f), "utf8");
const css = read("tokens.css").replace(/url\("\.\/prototypes\/fonts\/([^"]+)"\)/g, (_, f) =>
  `url("data:font/woff2;base64,${readFileSync(join(here, "prototypes/fonts", f)).toString("base64")}")`);
const mod = (f) => `data:text/javascript;base64,${Buffer.from(read(f)).toString("base64")}`;
const MODULES = { "../river/river.js": mod("river/river.js"), "../map/confluence-map.js": mod("map/confluence-map.js"),
  "./sample/cs-sophomore.js": mod("prototypes/sample/cs-sophomore.js"), "./sample/polisci-senior.js": mod("prototypes/sample/polisci-senior.js") };

mkdirSync(join(here, "preview"), { recursive: true });
for (const [src, out] of [["prototypes/site.html", "preview/site.html"], ["prototypes/pdf.html", "preview/pdf.html"]]) {
  let html = read(src).replace('<link rel="stylesheet" href="../tokens.css">', () => `<style>${css}</style>`);
  for (const [spec, url] of Object.entries(MODULES)) html = html.split(`from "${spec}"`).join(`from "${url}"`);
  // pdf.html picks its sample by name at run time.
  html = html.replace("await import(`./sample/${which}.js`)", () =>
    `await import(${JSON.stringify({ "cs-sophomore": MODULES["./sample/cs-sophomore.js"], "polisci-senior": MODULES["./sample/polisci-senior.js"] })}[which])`);
  writeFileSync(join(here, out), html);
  console.log(out, Math.round(html.length / 1024) + " KB");
}
