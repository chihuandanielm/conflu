import { describe, expect, it } from "vitest";
import { emptyAnswers, type Answers } from "../intake/model.ts";
import { parseShareHash, shareHash } from "./share.ts";

const a: Answers = { ...emptyAnswers(), status: "college-student", majorId: "pharmacy", year: 3, trackId: "pharmacist", horizon: "1yr",
  school: "rutgers-nb", enrollment: "full-time", weeklyHours: 10, summer: "part", openToCoop: false, location: "nj", experience: ["resume", "pharm-intern"],
  skills: ["excel"], credentials: ["pharm-tech"], citizenship: "international", identity: ["first-generation", "latino"] };

describe("share link", () => {
  it("round-trips the plan answers", () => {
    const b = parseShareHash(shareHash(a))!;
    for (const k of ["majorId", "year", "trackId", "horizon", "school", "enrollment", "weeklyHours", "summer", "openToCoop", "location", "experience", "skills", "credentials"] as const) {
      expect(b[k], k).toEqual(a[k]);
    }
  });
  it("never includes identity or citizenship", () => {
    const hash = shareHash(a);
    const b = parseShareHash(hash)!;
    expect(b.identity).toEqual([]);
    expect(b.citizenship).toBeUndefined();
    const decoded = atob(hash.split("=")[1].replace(/-/g, "+").replace(/_/g, "/"));
    for (const word of ["international", "first-generation", "latino", "citizenship", "identity"]) expect(decoded).not.toContain(word);
  });
  it("carries the campus and rejects a major that campus doesn't offer", () => {
    const camden = parseShareHash(shareHash({ ...a, school: "rutgers-camden", majorId: "human-resource-management" }))!;
    expect(camden.school).toBe("rutgers-camden");
    const enc = (o: object) => "#plan=" + btoa(JSON.stringify(o)).replace(/=+$/, "");
    expect(parseShareHash(enc({ v: 1, m: "pharmacy", y: 2, t: "pharma-industry", s: "rutgers-newark" }))).toBeNull();
    expect(parseShareHash(enc({ v: 1, m: "computer-science", y: 2, t: "software-engineering", s: "rutgers-mars" }))).toBeNull();
    // Links made before the campus question default to New Brunswick, as plans did then.
    expect(parseShareHash(enc({ v: 1, m: "pharmacy", y: 2, t: "pharma-industry" }))!.school).toBe("rutgers-nb");
  });

  it("carries part-time enrollment, and old links default to full-time", () => {
    expect(parseShareHash(shareHash({ ...a, enrollment: "part-time" }))!.enrollment).toBe("part-time");
    const old = "#plan=" + btoa(JSON.stringify({ v: 1, m: "computer-science", y: 2, t: "software-engineering" })).replace(/=+$/, "");
    expect(parseShareHash(old)!.enrollment).toBe("full-time");
  });

  it("carries when a grad-school applicant will apply (engine 0.11.0)", () => {
    const phd = { ...a, majorId: "biological-sciences", trackId: "research-phd", gradApps: "this-cycle" as const };
    expect(parseShareHash(shareHash(phd))!.gradApps).toBe("this-cycle");
    expect(parseShareHash(shareHash({ ...phd, gradApps: undefined }))!.gradApps).toBeUndefined();
  });

  it("carries graduating a year later, and old links default to on time (engine 0.13.0)", () => {
    expect(parseShareHash(shareHash({ ...a, graduation: "year-later" }))!.graduation).toBe("year-later");
    expect(parseShareHash(shareHash({ ...a, graduation: "on-time" }))!.graduation).toBe("on-time");
    const old = "#plan=" + btoa(JSON.stringify({ v: 1, m: "computer-science", y: 2, t: "software-engineering" })).replace(/=+$/, "");
    expect(parseShareHash(old)!.graduation).toBe("on-time");
  });

  it("rejects malformed or unknown values", () => {
    expect(parseShareHash("#plan=not-json")).toBeNull();
    expect(parseShareHash("#other=1")).toBeNull();
    const bad = "#plan=" + btoa(JSON.stringify({ v: 1, m: "astrology", y: 2, t: "software-engineering" }));
    expect(parseShareHash(bad)).toBeNull();
    const junk = "#plan=" + btoa(JSON.stringify({ v: 1, m: "computer-science", y: 2, t: "software-engineering", e: ["resume", "<script>"], w: 99 })).replace(/=+$/, "");
    const p = parseShareHash(junk)!;
    expect(p.experience).toEqual(["resume"]);
    expect(p.weeklyHours).toBe(5);
  });
});
