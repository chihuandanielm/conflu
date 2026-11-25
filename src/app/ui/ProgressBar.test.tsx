import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProgressBar } from "./ProgressBar.tsx";

describe("ProgressBar (the fish gauge)", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("fits its line to the box at the gauge's 15px mono, so the fish is never cut off at the end", () => {
    // A 270px box holds 30 characters of 15px IBM Plex Mono (0.6em each). At 13px it guessed 34 and overflowed.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 270, height: 18, top: 0, left: 0, right: 270, bottom: 18, x: 0, y: 0, toJSON: () => ({}) });
    render(<ProgressBar label="Intake progress" value={7} max={8} />);
    const line = screen.getByRole("progressbar").textContent!;
    expect(line).toHaveLength(30);
    expect(line).toContain("><>");
  });
});
