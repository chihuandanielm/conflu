import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { FeedbackForm } from "./FeedbackForm.tsx";
import { FEEDBACK_ACTION, FEEDBACK_KEY, FEEDBACK_SUBJECT } from "./feedback.ts";

const t0 = Date.UTC(2026, 10, 24, 12);
const form = () => screen.getByRole("button", { name: "Send" }).closest("form")!;

describe("FeedbackForm", () => {
  beforeEach(() => localStorage.clear());

  it("posts to Formspree in a new tab, requires the student's email, and carries a subject and a honeypot", () => {
    render(<FeedbackForm dataVersion="d1" engineVersion="e1" now={() => t0} />);
    const f = form();
    expect(f.getAttribute("action")).toBe(FEEDBACK_ACTION);
    expect(f.getAttribute("method")).toBe("POST");
    expect(f.getAttribute("target")).toBe("_blank");
    const email = screen.getByLabelText("Your email") as HTMLInputElement;
    expect(email.required).toBe(true);
    expect(email.name).toBe("email");
    expect((screen.getByLabelText("Message") as HTMLTextAreaElement).required).toBe(true);
    const hidden = Object.fromEntries([...f.querySelectorAll<HTMLInputElement>("input[name]")].map((i) => [i.name, i.value]));
    expect(hidden._subject).toBe(FEEDBACK_SUBJECT);
    expect(hidden["built-with"]).toBe("dataset d1, engine e1");
    expect("_gotcha" in hidden).toBe(true);
    // Nothing from the plan: only these fields are sent.
    expect(Object.keys(hidden).sort()).toEqual(["_gotcha", "_subject", "built-with", "email"]);
  });

  it("fills an email ending and a message opening", () => {
    render(<FeedbackForm dataVersion="d" engineVersion="e" />);
    const email = screen.getByLabelText("Your email") as HTMLInputElement;
    fireEvent.change(email, { target: { value: "sam" } });
    fireEvent.click(screen.getByRole("button", { name: "@gmail.com" }));
    expect(email.value).toBe("sam@gmail.com");
    fireEvent.click(screen.getByRole("button", { name: /A link is broken/ }));
    expect((screen.getByLabelText("Message") as HTMLTextAreaElement).value).toBe("A link is broken or out of date: [which one]");
  });

  it("sends the first message, then holds the next one and says when", () => {
    let now = t0;
    render(<FeedbackForm dataVersion="d" engineVersion="e" now={() => now} />);
    expect(fireEvent.submit(form())).toBe(true); // not prevented: the browser posts it
    expect(JSON.parse(localStorage.getItem(FEEDBACK_KEY)!)).toEqual([t0]);
    now = t0 + 3 * 60_000;
    expect(fireEvent.submit(form())).toBe(false); // prevented
    expect(screen.getByRole("status").textContent).toBe("You sent feedback recently. You can send more in 7 minutes.");
    now = t0 + 10 * 60_000;
    expect(fireEvent.submit(form())).toBe(true);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
