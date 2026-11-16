// The "Your resources" list: everything attached to the student's planned goals, plus every resource
// for their major and year. Eligibility uses the engine's own rule (eligibleFor), so the tab and the plan
// never disagree: identity only adds, and citizenship hides only when the student stated it.
import { availableAt, eligibleFor, identitySet, LEGAL } from "../../engine/engine.ts";
import type { Plan, PlanInput, ResourceLite } from "../../engine/types.ts";
import type { Resource } from "../../types.ts";
import { campuses, goals, resources } from "../data/dataset.ts";
import uiResources from "../../../data/ui/resources.json";

export type GroupId = "programs" | "research" | "aid" | "orgs" | "tools" | "offices" | "guides";
export const GROUPS = uiResources.groups as { id: GroupId; label: string; types: string[] }[];
const groupOfType = new Map(GROUPS.flatMap((g) => g.types.map((t) => [t, g.id] as const)));
export const groupOf = (r: Resource): GroupId => groupOfType.get(r.type) ?? "programs";
export const PAY = uiResources.pay as Record<"paid" | "free" | "other", string[]>;
export const payLabel = (v: string | null) => (v ? (uiResources.payLabels as Record<string, string>)[v] ?? v : null);
export const scopeLabel = (v: string) => (uiResources.scopeLabels as Record<string, string>)[v] ?? v;
/** Where a resource applies, naming the campus for Rutgers ones: "Rutgers–Camden", "Rutgers (all campuses)". */
export function whereLabel(r: Pick<Resource, "scope" | "campuses">): string {
  if (r.scope !== "rutgers" || !r.campuses?.length) return scopeLabel(r.scope);
  if (r.campuses.includes("all")) return "Rutgers (all campuses)";
  const names = campuses.filter((c) => r.campuses!.includes(c.id));
  return names.length === 1 ? names[0].name : `Rutgers–${names.map((c) => c.short).join(" and ")}`;
}
export const seasonLabel = (v: string | null) => (v ? (uiResources.seasonLabels as Record<string, string>)[v] ?? v : null);

export interface Tailored {
  resource: Resource;
  group: GroupId;
  /** Matches one of the student's identity answers (a program "for students like me"). */
  forYou: boolean;
  /** Plan goals this resource is attached to, by title. */
  goals: string[];
  score: number;
}

const goalById = new Map(goals.map((g) => [g.id, g]));

export function tailoredResources(plan: Plan, input: PlanInput): Tailored[] {
  const identity = identitySet(input);
  const stated = new Set(input.identity ?? []);

  // Goals on the plan (placed, ongoing, and backlog all count: the student may pick them up).
  const planGoalIds = new Set<string>();
  for (const t of plan.terms) for (const it of t.items) planGoalIds.add(it.goalId.split("@")[0]);
  for (const o of plan.ongoing) planGoalIds.add(o.goalId);
  const attached = new Map<string, Set<string>>();
  for (const gid of planGoalIds) for (const rid of [...(goalById.get(gid)?.resources ?? []), ...(goalById.get(gid)?.guides ?? [])]) {
    attached.set(rid, (attached.get(rid) ?? new Set()).add(goalById.get(gid)!.title));
  }

  const out: Tailored[] = [];
  for (const r of resources) {
    if (r.status === "ended") continue;
    if (!availableAt(r as unknown as ResourceLite, input)) continue; // another campus's office, or Rutgers-only for another school
    // How-to guides only show when a goal on the plan uses them; otherwise every student would see all of them.
    const forMajorYear = r.type !== "guide" && (r.majors.includes("all") || r.majors.includes(input.majorId as never)) && r.years.includes(input.year);
    if (!attached.has(r.id) && !forMajorYear) continue;
    if (!eligibleFor(r as unknown as ResourceLite, identity, input)) continue;
    const forYou = r.identity.some((x) => !LEGAL.has(x) && stated.has(x));
    // Same ranking as the engine's resource cards (ALGORITHM.md §5).
    const score = (r.scope === "rutgers" ? 3 : 0) + (r.scope === "new_jersey" && input.location === "nj" ? 2 : 0)
      + (r.scope === "national" ? 1 : 0) + (r.status === "active" ? 1 : 0)
      + (r.verification.state === "link-checked" || r.verification.state === "search-confirmed" ? 0.5 : 0) + (forYou ? 2 : 0);
    out.push({ resource: r, group: groupOf(r), forYou, goals: [...(attached.get(r.id) ?? [])].sort(), score });
  }
  const statusRank = { active: 0, changed: 1, paused: 2, ended: 3 } as const;
  return out.sort((a, b) => b.score - a.score || statusRank[a.resource.status] - statusRank[b.resource.status]
    || a.resource.name.localeCompare(b.resource.name));
}

export interface ResourceFilters { group: GroupId | "all"; scope: string | "all"; pay: "all" | "paid" | "free"; forYou: boolean }
export const noFilters: ResourceFilters = { group: "all", scope: "all", pay: "all", forYou: false };

export function applyFilters(list: Tailored[], f: ResourceFilters): Tailored[] {
  return list.filter((t) => (f.group === "all" || t.group === f.group)
    && (f.scope === "all" || t.resource.scope === f.scope)
    && (f.pay === "all" || (t.resource.pay !== null && PAY[f.pay].includes(t.resource.pay)))
    && (!f.forYou || t.forYou));
}

export function byGroup(list: Tailored[]): { id: GroupId; label: string; items: Tailored[] }[] {
  return GROUPS.map((g) => ({ id: g.id, label: g.label, items: list.filter((t) => t.group === g.id) })).filter((g) => g.items.length);
}
