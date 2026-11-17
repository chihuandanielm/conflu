import type { Goal } from "../../engine/types.ts";

export type Lane = Goal["category"];
/** ALGORITHM.md §7 order. */
export const LANES: Lane[] = ["foundation", "presence", "skills", "experience", "network", "credentials", "academics", "applications"];
export const LANE_LABEL: Record<Lane, string> = {
  foundation: "Foundation", presence: "Online presence", skills: "Skills", experience: "Experience",
  network: "Networking", credentials: "Credentials", academics: "Academics", applications: "Applications",
};
/** Kinds of goal are no longer told apart by colour (design/DESIGN.md §6: a glyph and a word). Paper for every lane. */
export const laneTint = (_l: Lane) => "var(--sage)";
