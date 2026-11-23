// The downloadable roadmap (design/DESIGN.md §7.6, design/prototypes/pdf.html): real, selectable text laid out with
// @react-pdf/renderer (never a screenshot), in the four colours, Quantico and IBM Plex Mono. Loaded only when a student
// clicks Download PDF. Page 1 is the confluence map, fitted to the page; then where you stand; then every semester, each
// goal drawn as a piece of its stream with its steps as boxes to tick with a pen; then the resources, as boxes.
import { Circle, Document, Font, Line, Link, Page, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { Plan, PlanInput, PlanItem } from "../../engine/types.ts";
import { factLine, mapModel } from "../map/facts.ts";
import { layoutConfluence, type MapLayout } from "../map/confluence-map.js";
import { PALETTE } from "../river/river.js";
import { audience, contactParts, shortUrl } from "../resources/format.ts";
import { byGroup, payLabel, seasonLabel, whereLabel, type Tailored } from "../resources/tailor.ts";
import { lastChecked } from "../data/resources.ts";
import { howTo } from "../state/steps.ts";
import { inWorkOrder } from "../results/order.ts";
import { byImportance } from "../results/EditMap.tsx";
import { moreTime, needs, outcomeText } from "../results/summary.ts";

export interface FontFiles { regular: string; bold: string; mono: string }

/** Hyphenation callback: whole words, except long URLs, which get break points after each slash. */
export function urlBreaks(word: string): string[] {
  if (word.length <= 40 || !word.includes("/")) return [word];
  return word.split(/(?<=\/)/).flatMap((part, i, all) => (i < all.length - 1 ? [part, ""] : [part]));
}

let registered = false;
export function registerFonts(f: FontFiles) {
  if (registered) return;
  Font.register({ family: "Quantico", fonts: [{ src: f.regular, fontWeight: 400 }, { src: f.bold, fontWeight: 700 }] });
  Font.register({ family: "PlexMono", src: f.mono });
  // Never hyphenate words. Long URLs may wrap after a slash: an empty "syllable" between parts becomes a
  // zero-width break point in react-pdf's line breaker, so no hyphen is drawn and the printed URL stays exact.
  Font.registerHyphenationCallback(urlBreaks);
  registered = true;
}

// sage, blue, green, sand, plus ink for sentences (design/DESIGN.md §2): headings and links stay blue.
const C = { ...PALETTE, ink: "#1A1F24" };
// US Letter is 612 x 792 pt; 40pt side margins (54px in the prototype).
const PAGE = { w: 612, h: 792, side: 40, top: 33, bottom: 52 };
const W = PAGE.w - PAGE.side * 2;
/** The centered masthead on page 1: the conflu mark, the name, and a drafting rule. Its height in points. */
const MAST = 124;
const MAP_FONT = 7.5; // goal names on the map (10px in the prototype)
/** The core of the PDF (the map, where you stand, this semester and next in full, later semesters in brief, and the
 *  resources to start with) fits in 10 pages; everything else follows as an appendix. */
const FULL_TERMS = 2, KEY_RESOURCES = 12;
const HALF = (W - 16) / 2;

const s = StyleSheet.create({
  // No lineHeight on the page or a wrapper: in @react-pdf/renderer 4.9 a page-level lineHeight breaks the page-number
  // footer, and an inherited one double-spaces smaller text. Set it per style.
  page: { fontFamily: "Quantico", fontSize: 9.5, color: C.ink, backgroundColor: C.sage, paddingTop: PAGE.top, paddingBottom: PAGE.bottom, paddingHorizontal: PAGE.side },
  fact: { fontFamily: "PlexMono", fontSize: 7.5, letterSpacing: 0.2 },
  title: { fontSize: 26, marginTop: 6, color: C.blue },
  summary: { fontSize: 9.5, marginTop: 3, lineHeight: 1.3 },
  outcome: { fontSize: 16.5, marginTop: 12, lineHeight: 1.15, color: C.blue },
  h2: { fontSize: 14, color: C.blue },
  body: { fontSize: 9, lineHeight: 1.35 },
  small: { fontSize: 8.5, lineHeight: 1.35 },
  footer: { position: "absolute", bottom: 19.5, left: PAGE.side, right: PAGE.side, flexDirection: "row", justifyContent: "space-between",
    paddingTop: 6, borderTopWidth: 1.5, borderTopStyle: "dotted", borderTopColor: C.sand, fontFamily: "PlexMono", fontSize: 7 },
  term: { flexDirection: "row", alignItems: "baseline", gap: 9, marginTop: 16, paddingTop: 7.5, borderTopWidth: 1.5, borderTopStyle: "dotted", borderTopColor: C.sand },
  notice: { marginTop: 7.5, paddingLeft: 9, borderLeftWidth: 3, borderLeftColor: C.sand, fontSize: 9, lineHeight: 1.35 },
  link: { color: C.blue, textDecoration: "none" },
});

/**
 * The masthead (design/DESIGN.md §7.6): centered, calm. The conflu mark (the favicon's confluence drawn out: three
 * parallel streams that join at a green dot and run on to a ring with a small dot beside it), the name in Quantico,
 * and a faint drafting rule with ticks that ends in a dot at each side.
 */
const Masthead = () => {
  const rule = 168, ticks = Array.from({ length: 15 }, (_, i) => 6 + i * 11.14);
  return (
    <View style={{ height: MAST, alignItems: "center" }}>
      <Svg width={58} height={68} viewBox="0 0 44 52">
        <Path d="M7 3 C7 15 22 17 22 29" fill="none" stroke={C.blue} strokeWidth={1.5} />
        <Path d="M22 3 L22 29" fill="none" stroke={C.blue} strokeWidth={1.5} />
        <Path d="M37 3 C37 15 22 17 22 29" fill="none" stroke={C.blue} strokeWidth={1.5} />
        <Line x1={22} y1={29} x2={22} y2={42.5} stroke={C.blue} strokeWidth={2.4} />
        <Circle cx={22} cy={29} r={3.4} fill={C.green} />
        <Circle cx={22} cy={46} r={3.4} fill={C.sage} stroke={C.blue} strokeWidth={1.5} />
        <Circle cx={30} cy={46} r={1.3} fill={C.blue} />
      </Svg>
      <Text style={{ fontSize: 22, color: C.blue, marginTop: 6, letterSpacing: 1.5 }}>conflu</Text>
      <Svg width={rule} height={9} viewBox={`0 0 ${rule} 9`} style={{ marginTop: 5 }}>
        <Line x1={4} y1={4.5} x2={rule - 4} y2={4.5} stroke={C.blue} strokeWidth={0.75} />
        {ticks.map((x, i) => <Line key={x} x1={x} y1={i % 7 === 0 ? 1.5 : 3} x2={x} y2={4.5} stroke={C.sand} strokeWidth={0.75} />)}
        <Circle cx={3} cy={4.5} r={2} fill={C.blue} />
        <Circle cx={rule - 3} cy={4.5} r={2} fill={C.sage} stroke={C.blue} strokeWidth={0.75} />
      </Svg>
      <Text style={[s.fact, { marginTop: 4, color: C.ink }]}>career pathway mapper</Text>
    </View>
  );
};

/** The mark beside a goal: an open ring, solid for a must-do, green once done. */
const Dot = ({ gate = false, done = false, size = 6.75, style = {} }: { gate?: boolean; done?: boolean; size?: number; style?: object }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: done ? C.green : C.blue,
    backgroundColor: done ? C.green : gate ? C.blue : C.sage, ...style }} />
);
const Marks = ({ items }: { items: { text: string; small?: string; done?: boolean }[] }) => (
  <View>
    {items.map((m) => (
      <View key={m.text + (m.small ?? "")} style={{ flexDirection: "row", gap: 7, paddingVertical: 2.25 }} wrap={false}>
        <Dot done={m.done} style={{ marginTop: 2.5 }} />
        <View style={{ flex: 1 }}>
          <Text style={s.body}>{m.text}</Text>
          {m.small && <Text style={s.small}>{m.small}</Text>}
        </View>
      </View>
    ))}
  </View>
);

/** The confluence map as react-pdf drawing primitives: exactly what layoutConfluence returns, as mapSvg draws it. */
function PdfMap({ L, k }: { L: MapLayout; k: number }) {
  const fs = L.fontSize, mf = L.metaSize;
  /** Top of a line of text whose SVG baseline is at `y`. */
  const topOf = (y: number, size: number) => (y - size * 0.82) * k;
  return (
    <View style={{ position: "relative", width: L.width * k, height: L.height * k, alignSelf: "center", marginTop: 8 }}>
      <Svg width={L.width * k} height={L.height * k} viewBox={`0 0 ${L.width} ${L.height}`}>
        {L.terms.map((t) => (
          <Line key={t.code} x1={0} x2={L.width} y1={t.y + fs * 0.4} y2={t.y + fs * 0.4} stroke={C.sand} strokeWidth={1.5} strokeDasharray="1.5 5" strokeLinecap="round" />
        ))}
        {L.strands.map((st) => <Path key={st.id} d={st.d} fill="none" stroke={st.done ? C.green : C.blue} strokeWidth={st.gate ? 2.4 : 1.1} strokeLinejoin="round" />)}
        <Path d={L.own.d} fill="none" stroke={C.blue} strokeWidth={2.4} />
        {L.dots.map((d) => <Circle key={d.id} cx={d.x} cy={d.y} r={d.r} fill={d.done ? C.green : d.gate ? C.blue : C.sage} stroke={d.done ? C.green : C.blue} strokeWidth={1.5} />)}
        <Circle cx={L.source.x} cy={L.source.y} r={L.source.r * 1.9} fill={C.sage} stroke={C.blue} strokeWidth={1.5} />
        <Circle cx={L.source.x} cy={L.source.y} r={L.source.r * 0.8} fill={C.green} />
        <Line x1={L.mouth.x0 - 4} x2={L.mouth.x1 + 4} y1={L.mouth.y} y2={L.mouth.y} stroke={C.blue} strokeWidth={2.4} strokeLinecap="square" />
        <Line x1={L.mouth.cx} x2={L.mouth.cx} y1={L.mouth.y} y2={L.mouth.dotY} stroke={C.blue} strokeWidth={2.4} />
        <Circle cx={L.mouth.cx} cy={L.mouth.dotY} r={L.mouth.r} fill={C.blue} />
      </Svg>
      {L.terms.map((t) => (
        <Text key={t.code} style={[s.fact, { position: "absolute", fontSize: mf * k, left: (L.sides === 2 ? 0 : L.rightEdge - fs * 0.4) * k, top: topOf(t.y + fs * 1.75, mf) }]}>
          {t.label.toLowerCase()}{t.more ? `  (+${t.more} more in the list)` : ""}
        </Text>
      ))}
      <Text style={[s.fact, { position: "absolute", fontSize: mf * k, left: L.source.textX * k, top: topOf(L.source.textY + mf * 0.35, mf) }]}>{L.source.label.toLowerCase()}</Text>
      {L.labels.map((l) => (
        <View key={l.id} style={{ position: "absolute", top: l.y * k, left: (l.align === "right" ? l.x - l.w : l.x) * k, width: l.w * k }}>
          {l.lines.map((ln, i) => (
            <Text key={i} style={{ fontSize: fs * k, lineHeight: L.lineHeight / fs, textAlign: l.align }}>{ln}</Text>
          ))}
          <Text style={[s.fact, { fontSize: mf * k, lineHeight: 1.5, textAlign: l.align }]}>{l.done ? "done" : l.meta}</Text>
        </View>
      ))}
      {L.mouth.lines.map((ln, i) => (
        <Text key={i} style={{ position: "absolute", fontWeight: 700, fontSize: L.mouth.fs * k, top: topOf(L.mouth.textY + i * L.mouth.fs * 1.25, L.mouth.fs),
          ...(L.mouth.align === "middle" ? { left: 0, width: L.width * k, textAlign: "center" as const } : { left: L.mouth.textX * k }) }}>{ln}</Text>
      ))}
    </View>
  );
}

/** One goal, as a piece of its stream: a line down the left (heavier for a must-do), a dot on it, and what to do. */
function GoalBlock({ it, again }: { it: PlanItem; again: boolean }) {
  const how = howTo(it);
  return (
    <View style={{ position: "relative", paddingLeft: 19.5, paddingVertical: 6.75 }} wrap={false}>
      <View style={{ position: "absolute", left: it.gate ? 2.4 : 3, top: 0, bottom: 0, borderLeftWidth: it.gate ? 3 : 1.5, borderLeftColor: C.blue }} />
      <Dot gate={it.gate} style={{ position: "absolute", left: 0, top: 9.75 }} />
      <Text style={{ fontSize: 10.5, lineHeight: 1.2 }}>{it.title}</Text>
      <Text style={s.fact}>{factLine(it)}{again ? "  keep going" : ""}</Text>
      {!again && (
        <>
          {it.why.length > 0 && <Text style={[s.small, { marginTop: 2 }]}>{it.why[it.why.length - 1]}</Text>}
          {how.steps.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 3.5, columnGap: 16 }}>
              {how.steps.map((st, i) => (
                <View key={i} style={{ width: (W - 19.5 - 16) / 2, flexDirection: "row", gap: 5, paddingVertical: 1.5 }} wrap={false}>
                  <View style={{ width: 7.5, height: 7.5, marginTop: 2, borderWidth: 1.5, borderColor: C.blue }} />
                  <Text style={[s.small, { flex: 1 }]}>{st}</Text>
                </View>
              ))}
            </View>
          )}
          {how.doneWhen && <Text style={[s.small, { marginTop: 3 }]}>Done when: {how.doneWhen}</Text>}
          {it.resources.length > 0 && (
            <Text style={[s.fact, { marginTop: 3 }]}>
              {it.resources.slice(0, 3).map((r, i) => <Text key={r.id}>{i ? "  /  " : ""}<Link src={r.url} style={s.link}>{r.name}</Link></Text>)}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

/** A later semester's goal in brief: its dot, title and fact line, half a column wide. */
function LaterRow({ it, again }: { it: PlanItem; again: boolean }) {
  return (
    <View style={{ width: HALF, flexDirection: "row", gap: 6, paddingVertical: 2 }} wrap={false}>
      <Dot gate={it.gate} style={{ marginTop: 2.5 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 9, lineHeight: 1.25 }}>{it.title}</Text>
        <Text style={[s.fact, { fontSize: 7 }]}>{factLine(it)}{again ? "  keep going" : ""}{it.option ? "  option" : ""}</Text>
      </View>
    </View>
  );
}

/** A resource box (design/DESIGN.md §7.4b), for print: the address is written out in full under the name, and is still a live link. */
function ResourceBox({ t }: { t: Tailored }) {
  const r = t.resource;
  const facts = [payLabel(r.pay), seasonLabel(r.season), r.typicalDeadline ? `Typical deadline: ${r.typicalDeadline}` : null].filter(Boolean).join("  ");
  const contact = contactParts(r);
  const checked = lastChecked(r);
  return (
    <View style={{ width: (W - 9) / 2, borderWidth: 1.5, borderColor: C.blue, padding: 9, marginBottom: 9, gap: 2.5 }} wrap={false}>
      <Text style={{ fontSize: 10.5, lineHeight: 1.2 }}>{r.name}{t.forYou ? "  (for students like you)" : ""}</Text>
      {[r.url, ...(r.applyUrl && r.applyUrl !== r.url ? [r.applyUrl] : [])].map((u, i) => (
        <Link key={u} src={u} style={[s.fact, s.link]}>{i ? "Apply: " : ""}{shortUrl(u)}</Link>
      ))}
      <Text style={s.fact}>{whereLabel(r).toLowerCase()}  {r.type.replace(/[_-]+/g, " ")}</Text>
      {r.summary && <Text style={s.small}>{r.summary}</Text>}
      <Text style={s.small}>{audience(r)}</Text>
      {facts && <Text style={s.fact}>{facts}</Text>}
      {t.goals.length > 0 && <Text style={s.small}>Helps with: {t.goals.join("; ")}</Text>}
      {contact.length > 0 && <Text style={s.small}>{contact.map((c) => (c.label === "How" ? c.value : `${c.label}: ${c.value}`)).join("  ")}</Text>}
      {checked && <Text style={s.fact}>Link last checked {checked}</Text>}
      {r.status !== "active" && <Text style={[s.notice, { fontSize: 8.5 }]}>{r.statusNote ?? `Status: ${r.status}`}</Text>}
    </View>
  );
}

export interface PdfProps {
  plan: Plan; input: PlanInput; resources: Tailored[]; date: string; done?: string[];
  summary: { track: string; trackId?: string; campus: string; major: string; year: number; yearLabel?: string; horizon: string; hours: number; have?: string[]; line?: string };
}

/** Rough height of wrapped text, for fitting the map to what is left of page 1 (react-pdf can't measure ahead). */
const textHeight = (text: string, size: number, lh: number) => Math.max(1, Math.ceil((text.length * size * 0.52) / W)) * size * lh;

export function RoadmapPdf({ plan, input, summary, resources, date, done = [] }: PdfProps) {
  // The draft map (engine 0.9.0): the map shows every option; the semesters describe in full only what the student's
  // time fits, and list the extra options briefly, so the core stays within 10 pages.
  const mine = (t: Plan["terms"][number]) => inWorkOrder(t.items.filter((i) => !i.option), plan.edges);
  const extras = (t: Plan["terms"][number]) => byImportance(t.items.filter((i) => i.option));
  const draft = plan.terms.some((t) => t.items.some((i) => i.option));
  const now = plan.terms[0];
  const first = now ? mine(now).find((it) => howTo(it).steps.length) : undefined;
  const line = summary.line ?? `${summary.track} · ${summary.major} · ${summary.yearLabel ?? `Year ${summary.year}`} · ${summary.campus} · ${summary.hours} free hours a week`;
  const outcome = outcomeText(summary.trackId);
  const need = needs(plan);
  const more = moreTime(plan);
  // Where to start: the resources this semester's and next semester's goals point to, in the plan's order, at most
  // KEY_RESOURCES; then every other resource in the appendix after the core pages.
  const byId = new Map(resources.map((t) => [t.resource.id, t]));
  const key: Tailored[] = [];
  for (const t of plan.terms.slice(0, FULL_TERMS)) for (const it of mine(t))
    for (const r of it.resources) { const hit = byId.get(r.id); if (hit && !key.includes(hit) && key.length < KEY_RESOURCES) key.push(hit); }
  const rest = resources.filter((t) => !key.includes(t));

  // Page 1: the banner, the title, then the confluence map in whatever height is left. The fullest semesters give up
  // their last rows until it fits, and say how many they left out; if it is still too tall (very many semesters), the
  // whole drawing is scaled down.
  const room = PAGE.h - PAGE.top - PAGE.bottom - MAST - (26 * 1.25 + 6)
    - (textHeight(line, 9.5, 1.3) + 3) - (textHeight(outcome, 16.5, 1.15) + 12) - 8 - 10;
  // Always two-sided in print: the layout's 560 threshold is in screen pixels, and the page is 532pt wide.
  const L = layoutConfluence(mapModel(plan, outcome), { width: W, sides: 2, fontSize: MAP_FONT, maxHeight: room, done });
  const k = Math.min(1, room / L.height);

  const told = new Set<string>(); // a goal that continues is described once, then named again with "keep going"
  const footer = (
    <View style={s.footer} fixed>
      <Text>Career Pathway Mapper  a general trajectory, not a blueprint</Text>
      <Text render={({ pageNumber, totalPages }) => `dataset ${plan.meta.dataVersion}  engine ${plan.meta.engineVersion}  page ${pageNumber} of ${totalPages}`} />
    </View>
  );

  return (
    <Document title={`Career roadmap: ${summary.track}`} author="Career Pathway Mapper" subject="Semester-by-semester career roadmap" creator="Career Pathway Mapper" producer="Career Pathway Mapper" language="en-US">
      <Page size="LETTER" style={s.page}>
        <Masthead />
        <Text style={s.title}>{draft ? "Your draft plan" : "Your plan"}</Text>
        <Text style={s.summary}>{line}</Text>
        <Text style={s.outcome}>{outcome}</Text>
        <PdfMap L={L} k={k} />
        {footer}
      </Page>

      <Page size="LETTER" style={s.page}>
        {/* Where you stand. */}
        <View style={{ flexDirection: "row", gap: 21 }}>
          <View style={{ flex: 1 }}>
            <Text style={[s.h2, { marginBottom: 6 }]}>What you have</Text>
            {(summary.have ?? []).length
              ? <Marks items={(summary.have ?? []).map((h) => ({ text: h, done: true }))} />
              : <Text style={s.body}>Nothing yet, and that's normal. Every plan starts with a first step.</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.h2, { marginBottom: 6 }]}>What you need</Text>
            <Marks items={need.map((n) => ({ text: n.label, small: n.detail }))} />
          </View>
        </View>
        {first && (
          <View style={{ marginTop: 15, backgroundColor: C.blue, color: C.sage, padding: 13 }} wrap={false}>
            <Text style={[s.fact, { color: C.sage }]}>Start here</Text>
            <Text style={{ fontSize: 13, lineHeight: 1.25, marginTop: 3 }}>{howTo(first).steps[0]}</Text>
            <Text style={[s.small, { marginTop: 4 }]}>Part of: {first.title}</Text>
          </View>
        )}
        {plan.warnings.length > 0 && (
          <View style={{ marginTop: 9 }}>
            {plan.warnings.map((w) => <Text key={w} style={s.notice}>{w}</Text>)}
          </View>
        )}

        {/* This semester and next, in full: each goal a piece of its stream, its steps as boxes to tick. */}
        {plan.terms.slice(0, FULL_TERMS).map((t, i) => (
          <View key={t.code}>
            <View style={s.term} minPresenceAhead={110}>
              <Text style={s.h2}>{i ? t.label : "This semester"}</Text>
              <Text style={s.fact}>{i ? `${t.items.length} ${t.items.length === 1 ? "goal" : "goals"}` : `${t.label.toLowerCase()}  sized to your ${summary.hours} free hours a week`}</Text>
            </View>
            {t.items.length === 0 && <Text style={[s.small, { marginTop: 4 }]}>{t.capacityHours === 0 ? "A break: no plan this term." : "Nothing scheduled."}</Text>}
            {mine(t).map((it) => {
              const again = told.has(it.goalId);
              told.add(it.goalId);
              return <GoalBlock key={it.goalId} it={it} again={again} />;
            })}
            {extras(t).length > 0 && (
              <View style={{ marginTop: 6 }} wrap={false}>
                <Text style={[s.fact, { marginBottom: 2 }]}>more options on your draft map, most important first</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 16 }}>
                  {extras(t).map((it) => { told.add(it.goalId); return <LaterRow key={it.goalId} it={it} again={false} />; })}
                </View>
              </View>
            )}
          </View>
        ))}

        {/* Later semesters, one line per goal (two columns): the steps are on the site and come into this PDF as the
            semester gets close. */}
        {plan.terms.length > FULL_TERMS && (
          <View>
            <View style={s.term} minPresenceAhead={90}>
              <Text style={s.h2}>Later semesters</Text>
              <Text style={s.fact}>each goal in brief</Text>
            </View>
            {plan.terms.slice(FULL_TERMS).map((t) => (
              <View key={t.code} style={{ marginTop: 7 }} wrap={false}>
                <Text style={[s.fact, { marginBottom: 2 }]}>{t.label.toLowerCase()}  {t.items.length ? `${t.items.length} ${t.items.length === 1 ? "goal" : "goals"}` : t.capacityHours === 0 ? "a break" : "open"}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 16 }}>
                  {inWorkOrder(t.items, plan.edges).map((it) => {
                    const again = told.has(it.goalId);
                    told.add(it.goalId);
                    return <LaterRow key={it.goalId} it={it} again={again} />;
                  })}
                </View>
              </View>
            ))}
          </View>
        )}

        {more.length > 0 && (
          <View>
            <View style={s.term} minPresenceAhead={70}>
              <Text style={s.h2}>When you have more time</Text>
              <Text style={s.fact}>start any of them whenever you like</Text>
            </View>
            <View style={{ marginTop: 4, flexDirection: "row", flexWrap: "wrap", columnGap: 16 }}>
              {more.map((m) => <View key={m.goalId} style={{ width: HALF }}><Marks items={[{ text: m.title }]} /></View>)}
            </View>
          </View>
        )}
        {plan.ongoing.length > 0 && (
          <View>
            <View style={s.term} minPresenceAhead={70}><Text style={s.h2}>Habits to keep</Text></View>
            <View style={{ marginTop: 4 }}><Marks items={plan.ongoing.map((o) => ({ text: o.title, small: o.why }))} /></View>
          </View>
        )}

        {/* The few resources that matter most now: the ones this semester's and next semester's goals point to, in the
            plan's own order. The same boxes as the site, two to a row. */}
        {key.length > 0 && (
          <View>
            <View style={s.term} minPresenceAhead={160}>
              <Text style={s.h2}>Where to start</Text>
              <Text style={s.fact}>for this semester's and next semester's goals</Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 9, marginTop: 7.5 }}>
              {key.map((t) => <ResourceBox key={t.resource.id} t={t} />)}
            </View>
          </View>
        )}
        <Text style={[s.small, { marginTop: 14 }]}>A starting point, not a rulebook. Built from your answers in your own browser on {date}; nothing you entered was sent anywhere.</Text>

        {/* Everything else, after the core pages: grouped the same way as the site's Resources tab. */}
        {rest.length > 0 && (
          <View break>
            <Text style={[s.h2, { fontSize: 18 }]}>All resources</Text>
            <Text style={[s.body, { marginTop: 3 }]}>
              The rest of the resources tied to your plan, plus everything for year {input.year} students in your major. Check each program's site for current dates and eligibility.
            </Text>
            {byGroup(rest).map((g) => (
              <View key={g.id}>
                <View style={[s.term, { marginBottom: 7.5 }]} minPresenceAhead={120}>
                  <Text style={s.h2}>{g.label}</Text>
                  <Text style={s.fact}>{g.items.length}</Text>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 9 }}>
                  {g.items.map((t) => <ResourceBox key={t.resource.id} t={t} />)}
                </View>
              </View>
            ))}
          </View>
        )}
        {footer}
      </Page>
    </Document>
  );
}
