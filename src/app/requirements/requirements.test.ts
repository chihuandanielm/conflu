import { beforeEach, describe, expect, it } from "vitest";
import { COURSES_KEY, dueStatus, loadTicks, progressFor, requirementsFor, toggleTick } from "./requirements.ts";
import { majors } from "../data/dataset.ts";

describe("major requirements", () => {
  beforeEach(() => window.localStorage.clear());

  it("has one official page for every major at every campus that offers it", () => {
    for (const m of majors) for (const campus of Object.keys(m.offeredAt)) {
      const school = campus === "nb" ? "rutgers-nb" : campus === "newark" ? "rutgers-newark" : "rutgers-camden";
      const r = requirementsFor(m.id, school);
      expect(r, `${campus}/${m.id}`).not.toBeNull();
      expect(r!.pageUrl).toMatch(/^https:\/\/[^\s]*rutgers\.edu\//);
      expect(r!.items.some((i) => i.kind === "course")).toBe(true);
    }
  });

  it("says which catalog edition each list comes from and when it was last checked", () => {
    for (const m of majors) for (const campus of Object.keys(m.offeredAt)) {
      const school = campus === "nb" ? "rutgers-nb" : campus === "newark" ? "rutgers-newark" : "rutgers-camden";
      const r = requirementsFor(m.id, school)!;
      expect(r.checked, `${campus}/${m.id}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (r.edition === "2026–2027") expect(r.pageUrl, `${campus}/${m.id}`).toMatch(/-26-27[.-]/);
    }
    // The newest catalogs: engineering's first year has the 14:440:101/102 design sequence, not 14:440:127.
    const me = requirementsFor("mechanical-engineering", "rutgers-nb")!;
    const codes = me.items.flatMap((i) => (i.kind === "course" ? i.options.map((o) => o.code) : []));
    expect(me.edition).toBe("2026–2027");
    expect(codes).toContain("14:440:101");
    expect(codes).not.toContain("14:440:127");
  });

  it("has nothing for a school outside Rutgers or a major the campus doesn't offer", () => {
    expect(requirementsFor("computer-science", "other")).toBeNull();
    expect(requirementsFor("packaging-engineering", "rutgers-camden")).toBeNull();
    expect(requirementsFor(undefined, "rutgers-nb")).toBeNull();
  });

  it("marks what should be done by now, this year, and later", () => {
    expect(dueStatus(1, 2)).toBe("done-by-now");
    expect(dueStatus(2, 2)).toBe("this-year");
    expect(dueStatus(3, 2)).toBe("later");
    expect(dueStatus(null, 2)).toBe("any-time");
    // Fifth-year students: everything through year 4 is due.
    expect(dueStatus(4, 5)).toBe("done-by-now");
  });

  it("counts ticked courses that are due, and keeps ticks per major and campus in the browser", () => {
    const r = requirementsFor("computer-science", "rutgers-nb")!;
    const due = r.items.filter((i) => i.year !== null && i.year < 3);
    let ticks = loadTicks();
    expect(progressFor(r, 3, ticks)).toEqual({ due: due.length, done: 0 });
    ticks = toggleTick(ticks, r, due[0].id);
    expect(progressFor(r, 3, ticks)).toEqual({ due: due.length, done: 1 });
    expect(JSON.parse(window.localStorage.getItem(COURSES_KEY)!)).toEqual({ "nb/computer-science": [due[0].id] });
    expect(loadTicks()).toEqual(ticks);
    ticks = toggleTick(ticks, r, due[0].id);
    expect(progressFor(r, 3, ticks).done).toBe(0);
    // Another campus's computer science keeps its own ticks.
    expect(progressFor(requirementsFor("computer-science", "rutgers-camden")!, 3, ticks).done).toBe(0);
  });
});
