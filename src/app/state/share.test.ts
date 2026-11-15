import { describe, expect, it } from "vitest";
import { emptyAnswers, type Answers } from "../intake/model.ts";
import { parseShareHash, shareHash } from "./share.ts";

const a: Answers = { ...emptyAnswers(), status: "college-student", majorId: "pharmacy", year: 3, trackId: "pharmacist", horizon: "1yr",
  school: "rutgers-nb", weeklyHours: 10, summer: "part", openToCoop: false, location: "nj", experience: ["resume", "pharm-intern"],
  skills: ["excel"], credentials: ["pharm-tech"], citizenship: "international", identity: ["first-generation", "latino"] };

describe("share link", () => {
  it("round-trips the plan answers", () => {
    const b = parseShareHash(shareHash(a))!;
    for (const k of ["majorId", "year", "trackId", "horizon", "school", "weeklyHours", "summer", "openToCoop", "location", "experience", "skills", "credentials"] as const) {
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
