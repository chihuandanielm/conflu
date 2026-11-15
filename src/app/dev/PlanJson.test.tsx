import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { PlanJson } from "./PlanJson.tsx";

it("renders plan JSON for the sample student", () => {
  render(<PlanJson />);
  expect(screen.getByRole("heading", { name: "Engine check" })).toBeInTheDocument();
  expect(screen.getByLabelText("Plan output as JSON").textContent).toContain('"track": "software-engineering"');
});
