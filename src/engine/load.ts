// Node-side loader for tests and scripts. The website imports the same JSON files directly.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Dataset } from "./types.ts";

export function loadDataset(dataDir: string): Dataset {
  const read = (f: string) => JSON.parse(readFileSync(join(dataDir, f), "utf8"));
  const goals = read("goals.json");
  const resources = readdirSync(join(dataDir, "resources")).filter((f) => f.endsWith(".json"))
    .flatMap((f) => read(join("resources", f)).resources);
  return {
    version: read("version.json").version,
    terms: goals.terms,
    goals: goals.goals,
    tracks: read("tracks.json").tracks,
    resources,
    intake: read("intake.json"),
  };
}
