import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { FeedbackLink } from "./FeedbackLink.tsx";
import { FEEDBACK_EMAIL, FEEDBACK_KEY } from "./feedback.ts";

const t0 = Date.UTC(2026, 10, 24, 12);

describe("FeedbackLink", () => {
  beforeEach(() => localStorage.clear());

  it("opens an email to support and asks for the student's email", () => {
    render(<FeedbackLink dataVersion="d" engineVersion="e" now={() => t0} />);
    const a = screen.getByRole("link", { name: "Email feedback" });
    expect(a.getAttribute("href")).toMatch(new RegExp(`^mailto:${FEEDBACK_EMAIL}\\?`));
    expect(screen.getByText(/add your email in the message/)).toBeInTheDocument();
  });

  it("lets the first email through, then holds the next one and says when", () => {
    let now = t0;
    render(<FeedbackLink dataVersion="d" engineVersion="e" now={() => now} />);
    const a = screen.getByRole("link", { name: "Email feedback" });
    expect(fireEvent.click(a)).toBe(true); // not prevented: the mail app opens
    expect(JSON.parse(localStorage.getItem(FEEDBACK_KEY)!)).toEqual([t0]);
    now = t0 + 3 * 60_000;
    expect(fireEvent.click(a)).toBe(false); // prevented
    expect(screen.getByRole("status").textContent).toBe("You sent feedback recently. You can send more in 7 minutes.");
    now = t0 + 10 * 60_000;
    expect(fireEvent.click(a)).toBe(true);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
