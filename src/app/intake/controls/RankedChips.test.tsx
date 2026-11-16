import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { dataset } from "../../data/dataset.ts";
import { ExperienceChips, RankedChips } from "./RankedChips.tsx";

const group = (name: string) => screen.getByRole("heading", { name }).closest("section")!;

describe("experience chips", () => {
  it("ends each group with its own + chip and no page-level Show more", () => {
    render(<ExperienceChips majorId="computer-science" trackId="software-engineering" selected={[]} onToggle={() => {}} />);
    expect(screen.queryByRole("button", { name: /^Show more/ })).toBeNull();
    for (const name of ["Getting started", "Online presence", "Experience", "Research and clinical", "Networking"]) {
      const items = within(group(name)).getAllByRole("listitem");
      expect(within(items.at(-1)!).getByRole("button", { name: new RegExp(`^Show \\d+ more ${name.toLowerCase()} options$`) })).toBeInTheDocument();
    }
  });

  it("expands only that group and moves focus to the first revealed option", () => {
    render(<ExperienceChips majorId="computer-science" trackId="software-engineering" selected={[]} onToggle={() => {}} />);
    const exp = group("Experience");
    const before = within(exp).getAllByRole("button", { pressed: false }).length;
    const othersBefore = within(group("Networking")).getAllByRole("button").length;
    fireEvent.click(within(exp).getByRole("button", { name: /^Show \d+ more experience options$/ }));
    const after = within(exp).getAllByRole("button");
    expect(after.length).toBeGreaterThan(before);
    expect(after.some((b) => /more experience options/.test(b.getAttribute("aria-label") ?? ""))).toBe(false);
    expect(document.activeElement).toBe(after[before]);
    expect(within(group("Networking")).getAllByRole("button")).toHaveLength(othersBefore);
  });

  it("can reach every option, even in a group with nothing relevant to the major", () => {
    render(<ExperienceChips majorId="nursing" trackId="nursing-clinical" selected={[]} onToggle={() => {}} />);
    const names = ["Getting started", "Online presence", "Experience", "Research and clinical", "Networking"];
    for (const n of names) {
      const more = within(group(n)).queryByRole("button", { name: /^Show \d+ more/ });
      if (more) fireEvent.click(more);
    }
    const all = names.flatMap((n) => within(group(n)).getAllByRole("button"));
    expect(all).toHaveLength(dataset.intake.experience.length);
  });
});

describe("skills chips", () => {
  it("ends the list with a + chip that reveals the rest", () => {
    render(<RankedChips label="Skills" options={dataset.intake.skills} majorId="finance" trackId="investment-banking" selected={[]} onToggle={() => {}} />);
    const more = screen.getByRole("button", { name: /^Show 10 more skills options$/ });
    fireEvent.click(more);
    expect(screen.getAllByRole("button")).toHaveLength(dataset.intake.skills.length);
  });
});
