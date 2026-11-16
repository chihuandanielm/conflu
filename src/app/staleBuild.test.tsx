import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChunkBoundary, isStaleBuildError } from "./staleBuild.tsx";

describe("stale build detection", () => {
  it("recognizes each browser's error for a file that a newer deploy removed", () => {
    expect(isStaleBuildError(new TypeError("Failed to fetch dynamically imported module: https://x/assets/react-pdf-abc.js"))).toBe(true); // Chrome
    expect(isStaleBuildError(new TypeError("Importing a module script failed."))).toBe(true); // Safari
    expect(isStaleBuildError(new TypeError("error loading dynamically imported module: https://x/a.js"))).toBe(true); // Firefox
    expect(isStaleBuildError(new Error("Unknown font format"))).toBe(false);
    expect(isStaleBuildError("nope")).toBe(false);
  });

  it("shows a reload prompt instead of crashing when a lazy part of the page can't load", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Broken = () => { throw new TypeError("Failed to fetch dynamically imported module: x"); };
    render(<ChunkBoundary fallback={<p>chart unavailable</p>}><Broken /></ChunkBoundary>);
    expect(screen.getByText(/site was updated/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();
  });

  it("falls back to the given content for other errors", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Broken = () => { throw new Error("something else"); };
    render(<ChunkBoundary fallback={<p>chart unavailable</p>}><Broken /></ChunkBoundary>);
    expect(screen.getByText("chart unavailable")).toBeInTheDocument();
  });
});
