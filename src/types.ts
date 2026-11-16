// Types for the career resource database. Import the JSON files and cast to these.

export type MajorId =
  | "computer-science" | "information-technology" | "mechanical-engineering" | "biomedical-engineering"
  | "biological-sciences" | "psychology" | "nursing" | "pharmacy" | "public-health" | "exercise-science"
  | "finance" | "accounting" | "marketing" | "supply-chain" | "economics" | "human-resource-management"
  | "communication" | "political-science" | "criminal-justice" | "social-work" | "packaging-engineering";

export type CampusId = "nb" | "newark" | "camden";

/** A Rutgers campus (data/campuses.json). `school` is the PlanInput.school value. */
export interface Campus { id: CampusId; name: string; short: string; school: "rutgers-nb" | "rutgers-newark" | "rutgers-camden"; url: string }

export interface Major {
  id: MajorId;
  name: string;
  cip: string;            // federal CIP code, joins to O*NET occupations
  cluster: "tech-engineering" | "health-life" | "business" | "social-communication";
  industries: string[];
  /** Campuses that offer the major, with the school and program page at each. */
  offeredAt: Partial<Record<CampusId, { school: string; url: string }>>;
}

export type Year = 1 | 2 | 3 | 4 | "grad" | "alumni";
export type Scope = "rutgers" | "new_jersey" | "national" | "international";
export type Status = "active" | "paused" | "changed" | "ended";

export interface Resource {
  id: string;
  name: string;
  type: string;                 // see data/vocab.json → types
  scope: Scope;
  /** Rutgers resources only: the campuses whose students can use it, or ["all"]. */
  campuses?: (CampusId | "all")[];
  majors: (MajorId | "all")[];
  years: Year[];
  identity: string[];           // empty = open to everyone; see vocab.json → identity
  interests: string[];
  pay: string | null;
  season: string | null;
  typicalDeadline: string | null;
  summary: string;
  url: string;                  // home site
  applyUrl: string | null;
  contact: { email?: string; phone?: string; location?: string; how: string };
  status: Status;
  statusNote: string | null;
  verification: {
    state: "search-confirmed" | "link-checked" | "blocked" | "unverified" | "broken";
    checkedOn: string | null;
    httpStatus?: number | null;   // last HTTP status the link checker saw
    finalUrl?: string;            // where the url redirected, when that differs
    note?: string;                // why a check failed or what to do
  };
  tags: string[];
}

export interface ResourceFile { _about: string; resources: Resource[] }

/** Resources that apply to a student's major and year, active ones first. */
export function forStudent(all: Resource[], major: MajorId, year: Year): Resource[] {
  const order: Record<Status, number> = { active: 0, changed: 1, paused: 2, ended: 3 };
  return all
    .filter((r) => (r.majors.includes("all") || r.majors.includes(major)) && r.years.includes(year))
    .sort((a, b) => order[a.status] - order[b.status]);
}
