// Link checker classification, against a local server (no internet needed).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
// @ts-expect-error plain JS module without type declarations
import { check, merge } from "../scripts/check-links.mjs";

let server: Server; let base = "";
before(async () => {
  server = createServer((req, res) => {
    const routes: Record<string, [number, string, Record<string, string>?]> = {
      "/ok": [200, "<h1>Program</h1>"],
      "/forbidden": [403, "denied"],
      "/gone": [404, "not found"],
      "/linkedin": [999, ""],
      "/wall": [200, "<title>Just a moment...</title>"],
      "/moved": [301, "", { location: "/ok" }],
      "/flaky": [500, "oops"],
      "/method": [405, ""],
      "/busy": [503, "maintenance"],
    };
    const [code, body, headers] = routes[req.url ?? ""] ?? [404, "no"];
    res.writeHead(code, { "content-type": "text/html", ...headers }); res.end(req.method === "HEAD" ? undefined : body);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const addr = server.address(); base = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
});
after(() => server.close());

test("classifies responses", async () => {
  assert.equal((await check(`${base}/ok`)).state, "link-checked");
  assert.equal((await check(`${base}/forbidden`)).state, "blocked");
  assert.equal((await check(`${base}/linkedin`)).state, "blocked");
  assert.equal((await check(`${base}/wall`)).state, "blocked");
  assert.equal((await check(`${base}/method`)).state, "blocked");
  assert.equal((await check(`${base}/busy`)).state, "blocked");
  assert.equal((await check(`${base}/gone`)).state, "broken");
  assert.equal((await check(`${base}/flaky`)).state, "broken");
  assert.equal((await check("https://does-not-exist.invalid/")).state, "broken");
  const moved = await check(`${base}/moved`);
  assert.equal(moved.state, "link-checked");
  assert.equal(moved.finalUrl, `${base}/ok`);
});

test("a refused check keeps an earlier search confirmation", () => {
  const prev = { url: "https://x.org", verification: { state: "search-confirmed", checkedOn: "2026-11-01" } };
  const v = merge(prev, { state: "blocked", httpStatus: 403, finalUrl: "https://x.org", why: "HTTP 403" }, "2026-11-20");
  assert.equal(v.state, "search-confirmed");
  assert.equal(v.checkedOn, "2026-11-20");
  assert.equal(merge(prev, { state: "broken", httpStatus: 404, finalUrl: "https://x.org", why: "HTTP 404" }, "2026-11-20").state, "broken");
  const ok = merge(prev, { state: "link-checked", httpStatus: 200, finalUrl: "https://www.x.org/" }, "2026-11-20");
  assert.equal(ok.state, "link-checked"); assert.equal(ok.finalUrl, undefined); assert.equal(ok.note, undefined);
});
