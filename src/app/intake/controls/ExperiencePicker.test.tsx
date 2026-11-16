import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { dataset } from "../../data/dataset.ts";
import { ExperiencePicker } from "./ExperiencePicker.tsx";

function Harness({ majorId, initial = [] }: { majorId: string; initial?: string[] }) {
  const [sel, setSel] = useState<string[]>(initial);
  return <ExperiencePicker majorId={majorId} selected={sel} onToggle={(id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))} />;
}
const options = () => within(screen.getByRole("list", { name: /^Options:/ })).getAllByRole("button").map((b) => b.textContent);

describe("experience picker", () => {
  it("opens on suggestions for the student's major", () => {
    render(<Harness majorId="psychology" />);
    expect(screen.getByRole("button", { name: "Suggested", pressed: true })).toBeInTheDocument();
    expect(options()).toHaveLength(8);
    expect(options()).toContain("Research with a professor");
    expect(options()).not.toContain("A hackathon");
  });

  it("switches groups, renamed for clarity, and tucks options from other majors behind a link", () => {
    render(<Harness majorId="psychology" />);
    expect(screen.queryByRole("button", { name: "Getting started" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Jobs and activities" }));
    expect(options()).not.toContain("A hackathon");
    fireEvent.click(screen.getByRole("button", { name: /^Show \d+ more, less common for Psychology$/ }));
    expect(options()).toContain("A hackathon");
    fireEvent.click(screen.getByRole("button", { name: "Career basics" }));
    expect(options()).toContain("I have a resume");
  });

  it("reveals follow-ups after their starting option is picked", () => {
    render(<Harness majorId="computer-science" />);
    expect(options()).not.toContain("I commit code regularly");
    fireEvent.click(screen.getByRole("button", { name: "I have a GitHub with projects on it" }));
    expect(options()).toContain("I commit code regularly");
  });

  it("search replaces the groups with matches, and picks show in one removable list", () => {
    render(<Harness majorId="nursing" />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search what you've done" }), { target: { value: "intern" } });
    expect(screen.queryByRole("button", { name: "Suggested" })).toBeNull();
    expect(screen.getByRole("heading", { name: /^\d+ matches$/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "A co-op" }));
    expect(screen.getByRole("heading", { name: "Your picks (1)" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove A co-op" }));
    expect(screen.queryByRole("heading", { name: /Your picks/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("button", { name: "Suggested" })).toBeInTheDocument();
  });

  it("says so when nothing matches, and every option is reachable by browsing", () => {
    render(<Harness majorId="nursing" initial={["github", "linkedin", "club"]} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search what you've done" }), { target: { value: "zzzz" } });
    expect(screen.getByText(/Nothing matches that word/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    const seen = new Set<string>();
    for (const g of ["Jobs and activities", "Research and clinical", "Career basics", "Networking", "Online presence"]) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${g}`) }));
      const more = screen.queryByRole("button", { name: /^Show \d+ more/ });
      if (more) fireEvent.click(more);
      for (const t of options()) seen.add(t!);
    }
    expect(seen.size).toBe(dataset.intake.experience.length);
  });
});
