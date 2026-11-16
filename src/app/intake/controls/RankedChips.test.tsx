import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { dataset } from "../../data/dataset.ts";
import { RankedChips } from "./RankedChips.tsx";

describe("skills chips", () => {
  it("ends the list with a + chip that reveals the rest", () => {
    render(<RankedChips label="Skills" options={dataset.intake.skills} majorId="finance" trackId="investment-banking" selected={[]} onToggle={() => {}} />);
    const more = screen.getByRole("button", { name: /^Show 10 more skills options$/ });
    fireEvent.click(more);
    expect(screen.getAllByRole("button")).toHaveLength(dataset.intake.skills.length);
  });
});
