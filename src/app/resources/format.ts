import { LEGAL } from "../../engine/engine.ts";
import type { Resource } from "../../types.ts";
import { majors } from "../data/dataset.ts";
import { identityLabel } from "../intake/model.ts";

const YEAR = { 1: "first-year", 2: "second-year", 3: "third-year", 4: "fourth-year" } as Record<string, string>;

/** "Who it's for" in plain words: years, majors, and any group or legal requirement. */
export function audience(r: Resource): string {
  const years = r.years.filter((y) => typeof y === "number") as number[];
  const extra = r.years.filter((y) => typeof y === "string") as string[];
  const yearText = years.length === 4 ? "All undergraduate years" : years.length
    ? `${years.map((y) => YEAR[y]).join(", ").replace(/, ([^,]*)$/, " and $1")} students` : "";
  const after = extra.length ? `${yearText ? "; also " : ""}${extra.map((e) => (e === "grad" ? "graduate students" : "alumni")).join(" and ")}` : "";
  const majorText = r.majors.includes("all") ? "any major"
    : r.majors.map((m) => majors.find((x) => x.id === m)?.name ?? m).slice(0, 3).join(", ") + (r.majors.length > 3 ? `, and ${r.majors.length - 3} more` : "");
  const groups = r.identity.filter((x) => !LEGAL.has(x)).map(identityLabel);
  const legal = r.identity.filter((x) => LEGAL.has(x)).map(identityLabel);
  const parts = [`${capital(yearText)}${after}, ${majorText}.`];
  if (groups.length) parts.push(`For: ${groups.join("; ")}.`);
  if (legal.length) parts.push(`Requires: ${legal.join(" or ")}.`);
  return parts.join(" ");
}
const capital = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function contactParts(r: Resource): { label: string; value: string; href?: string }[] {
  const c = r.contact ?? { how: "" };
  const out: { label: string; value: string; href?: string }[] = [];
  if (c.email) out.push({ label: "Email", value: c.email, href: `mailto:${c.email}` });
  if (c.phone) out.push({ label: "Phone", value: c.phone, href: `tel:${c.phone.replace(/[^0-9+]/g, "")}` });
  if (c.location) out.push({ label: "Where", value: c.location });
  if (c.how) out.push({ label: "How", value: c.how });
  return out;
}
