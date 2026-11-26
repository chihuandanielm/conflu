import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App.tsx";
import { createSaved, finalize, persist } from "../state/plan.ts";
import { SAMPLE_ANSWERS } from "../state/sample.ts";

/** Leaving the landing: the words fade, then the next screen fades in. */
const leave = async () => { for (let i = 0; i < 6; i++) { act(() => { vi.advanceTimersByTime(500); }); await act(async () => {}); } };
const TODAY = "2026-11-26";

describe("the landing's words and buttons", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it("has no 'no account needed' in the masthead, and the numbers end on 'No sign-up or account needed'", () => {
    render(<App />);
    expect(within(screen.getByRole("navigation")).queryByText(/no account needed/i)).toBeNull();
    const numbers = screen.getByRole("region", { name: "The numbers behind it" });
    expect(within(numbers).getByText("No sign-up or account needed")).toBeInTheDocument();
    expect(within(numbers).queryByText(/accounts or trackers/)).toBeNull();
    expect(within(numbers).queryByText(/^0$/)).toBeNull();
  });

  it("closes on 'Visualize your plan' with the one button after the story", () => {
    render(<App />);
    const panel = screen.getByRole("heading", { level: 2, name: "Visualize your plan" }).closest("section")!;
    expect(within(panel).getByRole("button", { name: /^Build my plan/ })).toBeInTheDocument();
    expect(screen.queryByText("Start your plan.")).toBeNull();
  });
});

describe("coming back with a plan", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("a finalized map: 'See my map', in the hero and the closing panel, opens the plan on its Map tab", async () => {
    persist(finalize(createSaved(SAMPLE_ANSWERS, TODAY), TODAY));
    render(<App />);
    expect(screen.getAllByRole("button", { name: /^See my map/ })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /^Continue your plan/ })).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: /^See my map/ })[0]); await leave();
    expect(screen.getByRole("tab", { name: /^Map/ })).toHaveAttribute("aria-selected", "true");
  });

  it("a plan whose map isn't finalized yet: 'Continue your plan', which opens on the Plan tab as before", async () => {
    persist(createSaved(SAMPLE_ANSWERS, TODAY));
    render(<App />);
    expect(screen.queryByRole("button", { name: /^See my map/ })).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: /^Continue your plan/ })[0]); await leave();
    expect(screen.getByRole("tab", { name: /^Plan/ })).toHaveAttribute("aria-selected", "true");
  });

  it("no plan yet: 'Build my plan'", () => {
    render(<App />);
    expect(screen.getAllByRole("button", { name: /^Build my plan/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /^(See my map|Continue your plan)/ })).toBeNull();
  });
});

describe("Privacy and data", () => {
  it("states the facts plainly: what's saved where, the outside services, and the security settings", () => {
    render(<App />);
    const privacy = screen.getByText("Privacy and data").closest("details")!;
    for (const s of ["on your device", "outside services", "security"]) expect(within(privacy).getByText(s)).toBeInTheDocument();
    for (const term of ["Your plan", "Also saved", "Deleting it", "Share links", "PDF", "GitHub Pages", "Formspree", "Code", "Links", "Fonts"])
      expect(within(privacy).getByText(term, { selector: "dt" })).toBeInTheDocument();
    expect(within(privacy).getByText(/Only used if you send feedback\. Gets your email, your message and your IP address\./)).toBeInTheDocument();
    expect(privacy.textContent).not.toMatch(/Under the hood|only hears from you|touch your visit/);
  });
});
