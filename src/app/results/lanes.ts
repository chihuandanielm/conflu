import type { Goal } from "../../engine/types.ts";

export type Lane = Goal["category"];
/** ALGORITHM.md §7 order. */
export const LANES: Lane[] = ["foundation", "presence", "skills", "experience", "network", "credentials", "academics", "applications"];
export const LANE_LABEL: Record<Lane, string> = {
  foundation: "Foundation", presence: "Online presence", skills: "Skills", experience: "Experience",
  network: "Networking", credentials: "Credentials", academics: "Academics", applications: "Applications",
};
/** Quiet blue–green tint per lane (CSS variables in styles.css), plus a slightly stronger accent for the lane marker. */
export const laneTint = (l: Lane) => `var(--lane-${l})`;
