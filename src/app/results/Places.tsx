import type { PlanItem } from "../../engine/types.ts";

/** The places a goal sends the student, best first (the engine ranks them): its resources, at most `max`. */
export const placesOf = (it: PlanItem, max = 2) => it.resources.slice(0, max);

/** One place, linked by name; opens in a new tab. */
export function PlaceLink({ name, url }: { name: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
      {name}<span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/**
 * "Go to: Rutgers Career Exploration and Success, Handshake" under a goal row (design/DESIGN.md §7.4 #4): the best one
 * or two places for the goal, linked, so the student can act without opening it. Nothing when the goal has none.
 */
export function PlaceLinks({ it, max = 2, className = "" }: { it: PlanItem; max?: number; className?: string }) {
  const places = placesOf(it, max);
  if (!places.length) return null;
  return (
    <p className={`text-small ${className}`}>
      Go to:{" "}
      {places.map((p, i) => <span key={p.id}>{i > 0 && ", "}<PlaceLink name={p.name} url={p.url} /></span>)}
    </p>
  );
}
