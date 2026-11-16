// Builds the engine's Dataset in the browser from static JSON imports.
// Mirrors src/engine/load.ts without fs: everything is bundled, nothing is fetched at runtime.
import type { Dataset, Goal, Track, ResourceLite } from "../../engine/types.ts";
import type { Major, Resource } from "../../types.ts";
import goalsFile from "../../../data/goals.json";
import tracksFile from "../../../data/tracks.json";
import intakeFile from "../../../data/intake.json";
import majorsFile from "../../../data/majors.json";
import versionFile from "../../../data/version.json";
import uiIntakeFile from "../../../data/ui/intake.json";

const resourceFiles = import.meta.glob<{ resources: Resource[] }>("../../../data/resources/*.json", { eager: true, import: "default" });

/** Full resource records (the engine only needs the ResourceLite subset). Sorted by file name for determinism. */
export const resources: Resource[] = Object.keys(resourceFiles).sort().flatMap((k) => resourceFiles[k].resources);
export const majors = majorsFile.majors as Major[];
export const goals = goalsFile.goals as unknown as Goal[];
export const tracks = tracksFile.tracks as unknown as Track[];
export const intake = intakeFile;
export const uiIntake = uiIntakeFile;
export const dataVersion: string = versionFile.version;
export const competencyNames = goalsFile.competencies as unknown as Record<string, string>;

export const dataset: Dataset = {
  version: dataVersion,
  terms: goalsFile.terms,
  goals,
  tracks,
  resources: resources as unknown as ResourceLite[],
  intake: intakeFile as unknown as Dataset["intake"],
};
