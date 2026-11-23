// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { buildPlan } from "../../engine/engine.ts";
import type { PlanInput } from "../../engine/types.ts";
import { dataset } from "../data/dataset.ts";
import { tailoredResources } from "../resources/tailor.ts";
import { pdfFileName } from "./download.ts";
import { RoadmapPdf, registerFonts, urlBreaks } from "./RoadmapPdf.tsx";

const input: PlanInput = { status: "college-student", majorId: "computer-science", year: 2, trackId: "software-engineering",
  horizon: "graduation", today: "2026-11-15", weeklyHours: 10 };

const hasPdftotext = (() => { try { execFileSync("pdftotext", ["-v"], { stdio: "ignore" }); return true; } catch { return false; } })();

describe("PDF", () => {
  it("names the file career-roadmap-{track}-{date}.pdf", () => {
    expect(pdfFileName("software-engineering", "2026-11-15")).toBe("career-roadmap-software-engineering-2026-11-15.pdf");
  });

  it("lets long URLs wrap at slashes without changing them", () => {
    const url = "https://www.opm.gov/policy-data-oversight/hiring-information/students-recent-graduates/";
    expect(urlBreaks(url).join("")).toBe(url);
    expect(urlBreaks(url)).toContain("");
    expect(urlBreaks("internship")).toEqual(["internship"]);
  });

  const fonts = { regular: "public/fonts/quantico-400.ttf", bold: "public/fonts/quantico-700.ttf", mono: "public/fonts/ibm-plex-mono-400.ttf",
    display: "public/fonts/barlow-semi-condensed-600.ttf", displayBold: "public/fonts/barlow-semi-condensed-700.ttf" };
  const render = async (inp: PlanInput, campus = "Rutgers–Newark") => {
    registerFonts(fonts);
    const plan = buildPlan(inp, dataset);
    const buf = await renderToBuffer(<RoadmapPdf plan={plan} input={inp} date="2026-11-15" resources={tailoredResources(plan, inp)}
      summary={{ track: "Software engineering", trackId: inp.trackId, campus, major: "Computer Science", year: inp.year, horizon: "By graduation", hours: inp.weeklyHours ?? 5, have: ["I have a resume"] }} />);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    return { plan, buf };
  };
  const text = (buf: Buffer, page?: number) => {
    const dir = mkdtempSync(join(tmpdir(), "pdf-")); const f = join(dir, "r.pdf"); writeFileSync(f, buf);
    return execFileSync("pdftotext", [...(page ? ["-f", String(page), "-l", String(page)] : []), "-layout", f, "-"]).toString();
  };

  it("renders the roadmap as real text: page 1 is the map, then every section, the semesters, and the resources", async () => {
    const { buf } = await render(input);
    if (!hasPdftotext) return; // text checks need poppler; CI images usually have it
    const all = text(buf);
    for (const str of ["Your plan", "What you have", "What you need", "Do this now", "This semester", "Done when:",
      "When you have more time", "Habits to keep", "Later semesters", "Where to start", "All resources", "Rutgers–Newark", "a general trajectory, not a blueprint", "page 1 of", "studentaid.gov"]) {
      expect(all, str).toContain(str);
    }
    expect(all).not.toMatch(/\/-\n/); // no hyphen inserted into wrapped URLs
    // Page 1 alone tells a student where they are going and in what order: the map, and nothing from page 2.
    const one = text(buf, 1);
    expect(one).toContain("you are here");
    expect(one).toContain("Land your first role in software engineering");
    expect(one).toMatch(/year 2 · fall/);
    expect(one).not.toContain("What you have");
  }, 60_000);

  it("keeps the core (map, where you stand, the semesters, and the resources to start with) within 10 pages", async () => {
    // Engine 0.9.0: the draft map (more options) too; its options are listed briefly, so the core still fits.
    for (const inp of [input, { ...input, year: 1 as const, semester: 1 as const, weeklyHours: 15 }, { ...input, draft: true }, { ...input, year: 1 as const, semester: 1 as const, weeklyHours: 15, draft: true }]) {
      const { buf } = await render(inp);
      if (!hasPdftotext) return;
      const pages = Number(execFileSync("pdfinfo", ["-"], { input: buf }).toString().match(/Pages:\s+(\d+)/)![1]);
      const pageOf = (str: string) => { for (let n = 1; n <= pages; n++) if (text(buf, n).includes(str)) return n; return -1; };
      const start = pageOf("Where to start"), appendix = pageOf("All resources");
      expect(start, "Where to start").toBeGreaterThan(1);
      expect(start, "Where to start").toBeLessThanOrEqual(10);
      // The appendix starts on a fresh page right after the core, so the core is everything before it.
      expect(appendix - 1, "core pages").toBeLessThanOrEqual(10);
      expect(text(buf, appendix - 1)).not.toContain("All resources");
      if (inp.draft) { const all = text(buf); expect(all).toContain("Your draft plan"); expect(all).toContain("more options on your draft map"); }
    }
  }, 480_000);

  it("fits the longest plan's map on page 1 (trimmed, with counts) and draws the shortest in full", async () => {
    const long = await render({ ...input, year: 1, semester: 1, weeklyHours: 15 });
    const short = await render({ ...input, majorId: "political-science", trackId: "law-school", year: 4, semester: 2, horizon: "6mo", weeklyHours: 5 });
    if (!hasPdftotext) return;
    const one = text(long.buf, 1);
    expect(one).toMatch(/more in the list/); // too many goals for one page: the fullest semesters say what they left out
    expect(one).not.toContain("What you have");
    const sOne = text(short.buf, 1);
    expect(sOne).not.toMatch(/more in the list/);
    for (const it of short.plan.terms.flatMap((t) => t.items)) expect(sOne.replace(/\s+/g, " ")).toContain(it.title.slice(0, 20));
  }, 120_000);

  it.skipIf(!hasPdftotext)("opens on a centered conflu masthead, not an ASCII banner", async () => {
    const { buf } = await render(input, "Rutgers–New Brunswick");
    if (process.env.PDF_PREVIEW) writeFileSync(process.env.PDF_PREVIEW, buf);
    const first = text(buf, 1);
    const head = first.split("\n").filter((l) => l.trim()).slice(0, 4).map((l) => l.trim());
    expect(head[0]).toBe("conflu");
    expect(head[1]).toBe("career pathway mapper");
    expect(first).not.toMatch(/[\\/:#*+~]{6,}/); // no runs of river glyphs
  });
});
