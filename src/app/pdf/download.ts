// Builds and downloads the PDF in the browser. The PDF library and fonts load only on click.
import { createElement } from "react";
import type { SavedPlan } from "../state/plan.ts";
import { intake } from "../data/dataset.ts";
import { campusName, majorName, toPlanInput, trackName, yearTermLabel } from "../intake/model.ts";
import { haves, planSummary } from "../results/summary.ts";
import { tailoredResources } from "../resources/tailor.ts";
import { todayISO } from "../today.ts";

export const pdfFileName = (trackId: string, date: string) => `career-roadmap-${trackId}-${date}.pdf`;

export async function downloadRoadmapPdf(saved: SavedPlan): Promise<void> {
  const [{ pdf }, { RoadmapPdf, registerFonts }] = await Promise.all([import("@react-pdf/renderer"), import("./RoadmapPdf.tsx")]);
  // TTF copies of the self-hosted Quantico and Plex Mono fonts (scripts/woff-to-ttf.mjs): the browser build of the
  // PDF renderer can't read WOFF.
  const base = import.meta.env.BASE_URL;
  registerFonts({ regular: `${base}fonts/quantico-400.ttf`, bold: `${base}fonts/quantico-700.ttf`, mono: `${base}fonts/ibm-plex-mono-400.ttf`,
    display: `${base}fonts/barlow-semi-condensed-600.ttf`, displayBold: `${base}fonts/barlow-semi-condensed-700.ttf` });
  const date = todayISO();
  const a = saved.answers;
  const input = toPlanInput(a, date, { completedGoals: saved.completedGoals, previousPlan: saved.previousPlan });
  const doc = createElement(RoadmapPdf, {
    plan: saved.plan, input, date, resources: tailoredResources(saved.plan, input), done: saved.completedGoals,
    summary: { line: planSummary(a), track: trackName(a.trackId) ?? "", trackId: a.trackId, yearLabel: yearTermLabel(a), have: haves(a), campus: campusName(a.school), major: majorName(a.majorId) ?? "", year: a.year ?? 1,
      horizon: intake.horizons.find((h) => h.id === (a.horizon ?? "graduation"))?.label ?? "", hours: a.weeklyHours },
  });
  // react-pdf's types want a <Document> element; RoadmapPdf renders one.
  const blob = await pdf(doc as Parameters<typeof pdf>[0]).toBlob();
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: pdfFileName(a.trackId ?? "plan", date) });
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
