import { LEGAL } from "../../engine/engine.ts";
import type { Resource } from "../../types.ts";
import { resources } from "./dataset.ts";

export const resourceById = new Map<string, Resource>(resources.map((r) => [r.id, r]));

/** Group-specific programs shown to a student who skipped the identity questions get a "check eligibility" label (ALGORITHM.md §5). */
export function needsEligibilityCheck(r: Resource, studentIdentity: string[]): boolean {
  const groups = r.identity.filter((x) => !LEGAL.has(x) && x !== "underrepresented" && x !== "underrepresented-stem");
  return groups.length > 0 && studentIdentity.length === 0;
}

/** "link last checked {date}" only when the link checker actually loaded it. */
export function lastChecked(r: Resource): string | null {
  return r.verification.state === "link-checked" && r.verification.checkedOn ? r.verification.checkedOn : null;
}
