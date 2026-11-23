import { describe, expect, it } from "vitest";
import { buildPlan } from "../../engine/engine.ts";
import type { PlanInput } from "../../engine/types.ts";
import { dataset, goals } from "../data/dataset.ts";
import { audience } from "./format.ts";
import { applyFilters, noFilters, tailoredResources, whereLabel } from "./tailor.ts";

const base: PlanInput = { status: "college-student", majorId: "computer-science", year: 2, trackId: "software-engineering",
  horizon: "graduation", today: "2026-11-15", weeklyHours: 10, location: "nj", school: "rutgers-nb" };
const run = (over: Partial<PlanInput> = {}) => { const input = { ...base, ...over }; return tailoredResources(buildPlan(input, dataset), input); };

describe("tailored resources", () => {
  it("includes every eligible resource attached to a planned goal", () => {
    const input = base; const plan = buildPlan(input, dataset);
    const ids = new Set(tailoredResources(plan, input).map((t) => t.resource.id));
    for (const it of plan.terms.flatMap((t) => t.items)) for (const r of it.resources) expect(ids.has(r.id), r.id).toBe(true);
  });

  it("never lists ended programs, and only lists majors-and-year resources that fit", () => {
    for (const t of run()) {
      expect(t.resource.status).not.toBe("ended");
      if (!t.goals.length) {
        expect(t.resource.majors.includes("all") || t.resource.majors.includes("computer-science")).toBe(true);
        expect(t.resource.years).toContain(2);
      }
    }
  });

  it("lists Rutgers first for Rutgers students and not for others", () => {
    expect(run()[0].resource.scope).toBe("rutgers");
    expect(run({ school: "other", location: "us-other" })[0].resource.scope).not.toBe("rutgers");
  });

  it("hides citizen-only programs only when citizenship is stated", () => {
    const citizenOnly = (list: ReturnType<typeof run>) => list.filter((t) => t.resource.identity.includes("us-citizen")).length;
    expect(citizenOnly(run({ citizenship: "international" }))).toBe(0);
    expect(citizenOnly(run())).toBeGreaterThan(0);
  });

  it("identity answers only narrow group programs to the student's groups, and flag them", () => {
    // ALGORITHM.md §5: group programs show to students who skipped identity (labeled "check eligibility");
    // once a student answers, only programs for their groups (or broad "underrepresented" ones) remain.
    // The same plan both times, so only the identity filter differs (identity also reorders the plan itself).
    const plan = buildPlan(base, dataset);
    const without = tailoredResources(plan, base);
    const withId = tailoredResources(plan, { ...base, identity: ["first-generation", "low-income"] });
    const kept = new Set(withId.map((t) => t.resource.id));
    for (const t of without) if (!kept.has(t.resource.id)) {
      const groups = t.resource.identity.filter((x) => !["us-citizen", "us-citizen-or-pr", "nj-resident"].includes(x));
      expect(groups.length, `${t.resource.id} was dropped but is open to everyone`).toBeGreaterThan(0);
      expect(groups.some((g) => ["first-generation", "low-income", "underrepresented", "underrepresented-stem"].includes(g)), t.resource.id).toBe(false);
    }
    expect(withId.some((t) => t.forYou)).toBe(true);
    expect(run().some((t) => t.forYou)).toBe(false);
  });

  it("filters by type, scope, pay, and students like me", () => {
    const list = run({ identity: ["first-generation"] });
    expect(applyFilters(list, { ...noFilters, group: "aid" }).every((t) => t.group === "aid")).toBe(true);
    expect(applyFilters(list, { ...noFilters, scope: "new_jersey" }).every((t) => t.resource.scope === "new_jersey")).toBe(true);
    expect(applyFilters(list, { ...noFilters, pay: "free" }).every((t) => t.resource.pay === "free")).toBe(true);
    expect(applyFilters(list, { ...noFilters, forYou: true }).every((t) => t.forYou)).toBe(true);
  });

  it("attaches plan goal titles", () => {
    const withGoals = run().filter((t) => t.goals.length);
    expect(withGoals.length).toBeGreaterThan(0);
    const titles = new Set(goals.map((g) => g.title));
    for (const t of withGoals) for (const g of t.goals) expect(titles.has(g)).toBe(true);
  });

  it("lists only the student's own campus's Rutgers offices, first", () => {
    for (const [school, campus] of [["rutgers-nb", "nb"], ["rutgers-newark", "newark"], ["rutgers-camden", "camden"]] as const) {
      const list = run({ school });
      for (const t of list.filter((x) => x.resource.scope === "rutgers")) {
        expect(t.resource.campuses!.some((c) => c === "all" || c === campus), `${school}: ${t.resource.id}`).toBe(true);
      }
      expect(list[0].resource.scope).toBe("rutgers");
    }
    expect(run({ school: "rutgers-newark" }).some((t) => t.resource.id === "rutgers-newark-career")).toBe(true);
    expect(run({ school: "other" }).some((t) => t.resource.scope === "rutgers")).toBe(false);
  });

  it("names the campus on Rutgers resources", () => {
    expect(whereLabel({ scope: "rutgers", campuses: ["camden"] })).toBe("Rutgers–Camden");
    expect(whereLabel({ scope: "rutgers", campuses: ["all"] })).toBe("Rutgers (all campuses)");
    expect(whereLabel({ scope: "rutgers", campuses: ["nb", "newark"] })).toBe("Rutgers–New Brunswick and Newark");
    expect(whereLabel({ scope: "national" })).toBe("National");
  });

  it("lists how-to guides only for goals on the plan", () => {
    const input = base; const plan = buildPlan(input, dataset);
    const list = tailoredResources(plan, input);
    const guides = list.filter((t) => t.resource.type === "guide");
    expect(guides.length).toBeGreaterThan(0);
    const planGoals = new Set([...plan.terms.flatMap((t) => t.items.map((i) => i.goalId.split("@")[0])), ...plan.ongoing.map((o) => o.goalId)]);
    for (const t of guides) expect(goals.some((g) => planGoals.has(g.id) && g.guides?.includes(t.resource.id)), t.resource.id).toBe(true);
    expect(guides.every((t) => t.group === "guides")).toBe(true);
  });

  it("describes who a resource is for", () => {
    const r = dataset.resources.find((x) => x.id === "fafsa")!;
    expect(audience(r as never)).toMatch(/any major/);
  });
});
