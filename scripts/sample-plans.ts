// Prints plans for a few example students. Run: node --experimental-strip-types scripts/sample-plans.ts
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
import { buildPlan } from "../src/engine/engine.ts";
import { loadDataset } from "../src/engine/load.ts";
import type { PlanInput } from "../src/engine/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = loadDataset(join(root, "data"));

export const PERSONAS: Record<string, PlanInput> = {
  "cs-sophomore-swe": {
    status: "college-student", majorId: "computer-science", year: 2, trackId: "software-engineering", horizon: "graduation",
    today: "2026-11-13", weeklyHours: 8, summer: "full", location: "nj", citizenship: "us-citizen",
    identity: ["first-generation"], experience: ["resume", "club", "linkedin", "job"], skills: ["python"],
  },
  "psych-junior-premed": {
    status: "college-student", majorId: "psychology", year: 3, trackId: "medicine", horizon: "after-graduation",
    today: "2026-11-13", weeklyHours: 10, summer: "full", location: "nj", citizenship: "us-citizen",
    experience: ["resume", "volunteer", "research", "shadowing"], skills: ["r"], credentials: ["bls"],
  },
  "accounting-freshman": {
    status: "college-student", majorId: "accounting", year: 1, trackId: "public-accounting", horizon: "graduation",
    today: "2026-11-13", weeklyHours: 5, summer: "part", location: "nj", citizenship: "us-pr", identity: ["latino", "low-income"],
  },
  "polisci-senior-short": {
    status: "college-student", majorId: "political-science", year: 4, trackId: "government-policy", horizon: "6mo",
    today: "2026-11-13", weeklyHours: 6, summer: "none", citizenship: "international",
    experience: ["resume", "club", "writing-clips"],
  },
  "newark-nursing-sophomore": {
    status: "college-student", majorId: "nursing", year: 2, trackId: "nursing-clinical", horizon: "graduation", school: "rutgers-newark",
    today: "2026-11-13", weeklyHours: 6, summer: "part", location: "nj", identity: ["first-generation"], experience: ["resume", "job"],
  },
  "camden-cs-junior": {
    status: "college-student", majorId: "computer-science", year: 3, trackId: "data-analytics", horizon: "graduation", school: "rutgers-camden",
    today: "2026-11-13", weeklyHours: 8, summer: "full", location: "nj", citizenship: "us-citizen", skills: ["python", "sql"],
  },
  "packaging-sophomore": {
    status: "college-student", majorId: "packaging-engineering", year: 2, trackId: "packaging-cpg", horizon: "graduation", school: "rutgers-nb",
    today: "2026-11-13", weeklyHours: 8, summer: "full", openToCoop: true, location: "nj", experience: ["resume"],
  },
};

const out: string[] = [];
for (const [name, input] of Object.entries(PERSONAS)) {
  const plan = buildPlan(input, data);
  out.push(`\n## ${name}  (${input.school ?? "rutgers-nb"}, ${input.majorId}, year ${input.year}, ${input.trackId}, horizon ${input.horizon}, ${input.weeklyHours}h/wk)`);
  out.push(`Biggest gaps: ${Object.entries(plan.competencies.gap).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 3).map(([c, v]) => `${c} ${v}`).join(", ")}`);
  for (const t of plan.terms) {
    out.push(`\n### ${t.label}  [${t.usedHours}/${t.capacityHours} flex hrs${t.summerBlock ? ", summer block used" : ""}]`);
    for (const i of t.items) out.push(`- (${i.lane}) ${i.title}${i.partial ? " (in progress)" : ""} · ${i.hours}h · score ${i.score.total}${i.gate ? " · MUST" : ""}\n    why: ${i.why.slice(0, 2).join(" ")}\n    resources: ${i.resources.map((r) => r.id).join(", ") || "—"}`);
  }
  out.push(`\nWarnings:\n${plan.warnings.map((w) => `- ${w}`).join("\n") || "- none"}`);
  out.push(`Backlog (${plan.backlog.length}): ${plan.backlog.slice(0, 8).map((b) => `${b.goalId} (${b.reason})`).join("; ")}${plan.backlog.length > 8 ? " …" : ""}`);
}
const text = `# Sample plans (engine output)\n${out.join("\n")}\n`;
writeFileSync(join(root, "docs/sample-plans.md"), text);
console.log(text.slice(0, 6000));
