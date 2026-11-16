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

test("redirect addresses drop one-time tokens so repeated runs record the same thing", () => {
  const prev = { url: "https://www.ismworld.org", verification: { state: "link-checked", checkedOn: "2026-11-15" } };
  const run = (token: string) => merge(prev, { state: "blocked", httpStatus: 200, why: "bot wall",
    finalUrl: `https://ecommerce.ismworld.org/SSO/Login.aspx?DPLF=Y&vi=10&vt=${token}` }, "2026-11-16");
  const a = run("92a64be4023f37b7f620e8211de5ca35366837314979ea5a2d2c05f89d1e1f4edea0fc5d43861bc4c457bd140b570688");
  const b = run("8e85f0fcfb4e4a63356093bc30e839ea23b7eea62196d3f9820137a7e6bc9b2b8f8ce03c7d07f2c8fd8ed2ba47710078");
  assert.deepEqual(a, b);
  assert.equal(a.finalUrl, "https://ecommerce.ismworld.org/SSO/Login.aspx?DPLF=Y&vi=10");

  // Meaningful parameters stay: a redirect to a search page keeps its search term.
  const search = merge({ url: "https://success.rutgers.edu/resource/cultural-centers", verification: { state: "link-checked", checkedOn: "x" } },
    { state: "link-checked", httpStatus: 200, finalUrl: "https://success.rutgers.edu/resources?keys=Cultural%20Centers" }, "2026-11-16");
  assert.equal(search.finalUrl, "https://success.rutgers.edu/resources?keys=Cultural%20Centers");

  // Common session and tracking parameters are dropped too, and a URL that only differs by them isn't "moved".
  const same = merge({ url: "https://example.org/apply", verification: { state: "link-checked", checkedOn: "x" } },
    { state: "link-checked", httpStatus: 200, finalUrl: "https://example.org/apply?utm_source=x&sessionid=abc123&state=zz" }, "2026-11-16");
  assert.equal(same.finalUrl, undefined);
});
