import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EMAIL_PATTERN, FEEDBACK_ACTION, LIMIT, nextAllowed, record, waitText, withDomain } from "./feedback.ts";

const MIN = 60_000, DAY = 24 * 60 * MIN;
const t0 = Date.UTC(2026, 10, 24, 12);

describe("feedback form setup", () => {
  it("posts to Formspree, and the security policy allows only that", () => {
    expect(FEEDBACK_ACTION).toMatch(/^https:\/\/formspree\.io\/f\/\w+$/);
    expect(readFileSync("vite.config.ts", "utf8")).toContain(`"form-action https://formspree.io"`);
  });

  it("checks the email and fills endings like the portfolio", () => {
    const re = new RegExp(`^(?:${EMAIL_PATTERN})$`);
    expect(re.test("sam@gmail.com")).toBe(true);
    for (const bad of ["sam", "sam@", "sam@gmail", "s am@gmail.com"]) expect(re.test(bad)).toBe(false);
    expect(withDomain("sam@yah", "gmail.com")).toBe("sam@gmail.com");
    expect(withDomain("", "gmail.com")).toBe("@gmail.com");
  });
});

describe("rate limit", () => {
  it("allows the first one", () => expect(nextAllowed([], t0)).toBeNull());

  it(`waits ${LIMIT.gapMinutes} minutes between messages`, () => {
    const sent = record([], t0);
    expect(nextAllowed(sent, t0 + MIN)).toBe(t0 + LIMIT.gapMinutes * MIN);
    expect(waitText(t0 + LIMIT.gapMinutes * MIN, t0 + 3 * MIN)).toBe("You sent feedback recently. You can send more in 7 minutes.");
    expect(nextAllowed(sent, t0 + LIMIT.gapMinutes * MIN)).toBeNull();
  });

  it(`allows at most ${LIMIT.perDay} a day`, () => {
    let sent: number[] = [];
    for (let i = 0; i < LIMIT.perDay; i++) sent = record(sent, t0 + i * LIMIT.gapMinutes * MIN);
    expect(nextAllowed(sent, t0 + LIMIT.perDay * LIMIT.gapMinutes * MIN)).toBe(t0 + DAY);
    expect(nextAllowed(sent, t0 + DAY)).toBeNull();
  });

  it("forgets anything older than a day, and ignores bad stored values", () => {
    expect(record([t0 - 2 * DAY, t0 - DAY - 1], t0)).toEqual([t0]);
    expect(nextAllowed(["x", null, -5] as unknown as number[], t0)).toBeNull();
  });
});
