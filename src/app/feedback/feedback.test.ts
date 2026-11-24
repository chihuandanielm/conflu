import { describe, expect, it } from "vitest";
import { FEEDBACK_EMAIL, LIMIT, feedbackMailto, nextAllowed, record } from "./feedback.ts";

const MIN = 60_000, DAY = 24 * 60 * MIN;
const t0 = Date.UTC(2026, 10, 24, 12);

describe("feedback email", () => {
  it("goes to the support address, with the subject and the versions filled in", () => {
    const url = new URL(feedbackMailto({ dataVersion: "2026.11.24-4", engineVersion: "0.15.0" }));
    expect(url.protocol).toBe("mailto:");
    expect(url.pathname).toBe(FEEDBACK_EMAIL);
    expect(url.searchParams.get("subject")).toBe("Career Pathway Mapper feedback");
    const body = url.searchParams.get("body")!;
    expect(body).toContain("Your email, so we can reply (required):");
    expect(body).toContain("dataset 2026.11.24-4, engine 0.15.0");
  });

  it("carries nothing the student entered", () => {
    const body = new URL(feedbackMailto({ dataVersion: "d", engineVersion: "e" })).searchParams.get("body")!;
    for (const w of ["major", "campus", "year", "computer"]) expect(body.toLowerCase()).not.toContain(w);
  });
});

describe("rate limit", () => {
  it("allows the first one", () => expect(nextAllowed([], t0)).toBeNull());

  it(`waits ${LIMIT.gapMinutes} minutes between emails`, () => {
    const sent = record([], t0);
    expect(nextAllowed(sent, t0 + MIN)).toBe(t0 + LIMIT.gapMinutes * MIN);
    expect(nextAllowed(sent, t0 + LIMIT.gapMinutes * MIN)).toBeNull();
  });

  it(`allows at most ${LIMIT.perDay} a day`, () => {
    let sent: number[] = [];
    for (let i = 0; i < LIMIT.perDay; i++) sent = record(sent, t0 + i * LIMIT.gapMinutes * MIN);
    const later = t0 + LIMIT.perDay * LIMIT.gapMinutes * MIN;
    expect(nextAllowed(sent, later)).toBe(t0 + DAY);
    expect(nextAllowed(sent, t0 + DAY)).toBeNull();
  });

  it("forgets anything older than a day, and ignores bad stored values", () => {
    expect(record([t0 - 2 * DAY, t0 - DAY - 1], t0)).toEqual([t0]);
    expect(nextAllowed(["x", null, -5] as unknown as number[], t0)).toBeNull();
  });
});
