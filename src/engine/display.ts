// Display helpers shared by the site and the simulation audit. Pure: no DOM, no fetch.
import type { Goal, ResourceLite, TermCode } from "./types.ts";

/** The school year a term belongs to; terms after graduation (G1, G2) count as the final year. */
export const yearOfTerm = (code: TermCode | string): number => (code.startsWith("G") ? 4 : Math.min(4, Number(code[0])));

/**
 * A goal's how-to guides for a given term: only guides written for that year (a first-year career fair guide isn't
 * shown to a senior). If none of a goal's guides fit the year, all are kept, so a goal never loses its guides.
 */
export function guidesFor<R extends Pick<ResourceLite, "id"> & { years?: (number | string)[] }>(goal: Pick<Goal, "guides">, term: TermCode | string, byId: Map<string, R>): R[] {
  const all = (goal.guides ?? []).map((id) => byId.get(id)).filter((r): r is R => !!r);
  const y = yearOfTerm(term);
  const fit = all.filter((r) => !r.years || r.years.includes(y));
  return fit.length ? fit : all;
}
