import { useEffect, useMemo, useRef, useState } from "react";
import { PALETTE } from "../palette.ts";
import { layoutConfluence, type MapModel } from "./confluence-map.js";

const MONO = '"IBM Plex Mono", ui-monospace, monospace';
const TEXT = "Quantico, system-ui, sans-serif";
const r1 = (v: number) => Math.round(v * 10) / 10;

/**
 * The confluence map (design/DESIGN.md §7.5): every goal is a stream that joins the river in its semester and runs to
 * the outcome. All of the layout comes from layoutConfluence(); this only draws what it returns, with the same strokes
 * and sizes as the reference renderer (mapSvg). The drawing is one role="img"; each goal's name is laid over it, in
 * document order: a real button that opens the goal, or plain text when there is no `onOpen` (the landing's picture of
 * the sample plan, which is only to look at). The layout re-runs when the container's width changes.
 */
export function ConfluenceMap({ model, done, fontSize, label, termOf, onOpen }: {
  model: MapModel; done?: Iterable<string>; fontSize?: number; label: string;
  /** The semester a goal sits in, for the button's accessible name. */
  termOf?: (goalId: string) => string | undefined;
  /** Opens a goal. Without it the names are plain text: a picture, nothing to click. */
  onOpen?: (goalId: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setWidth(Math.round(el.getBoundingClientRect().width));
    measure();
    if (typeof ResizeObserver !== "function") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const w = width || 720; // before measuring (and in tests without layout), lay out at a common width
  const fs = fontSize ?? (w >= 700 ? 15 : 14);
  const L = useMemo(() => layoutConfluence(model, { width: w, fontSize: fs, done }), [model, w, fs, done]);
  const P = PALETTE;

  return (
    <div ref={box} className="relative w-full" style={{ height: L.height }}>
      <svg viewBox={`0 0 ${r1(L.width)} ${r1(L.height)}`} width={r1(L.width)} height={r1(L.height)} role="img" aria-label={label}
        className="absolute top-0 left-0 block">
        {/* Each semester begins at a dotted sand shoreline, its name in mono under it. */}
        {L.terms.map((t) => (
          <g key={t.code}>
            <line x1={0} x2={r1(L.width)} y1={r1(t.y + fs * 0.4)} y2={r1(t.y + fs * 0.4)} stroke={P.sand} strokeWidth={1.5} strokeDasharray="1.5 5" strokeLinecap="round" />
            <text x={r1(L.sides === 2 ? 0 : L.rightEdge - fs * 0.4)} y={r1(t.y + fs * 1.75)} fontFamily={MONO} fontSize={r1(L.metaSize)} fill={P.blue} letterSpacing="0.04em">
              {t.label.toLowerCase()}{t.more ? `  (+${t.more} more in the list)` : ""}
            </text>
          </g>
        ))}
        {/* Streams first, then the student's own line on top. */}
        {L.strands.map((s) => (
          <path key={s.id} d={s.d} fill="none" stroke={s.done ? P.green : P.blue} strokeWidth={s.gate ? 2.4 : 1.1} strokeLinejoin="round" />
        ))}
        <path d={L.own.d} fill="none" stroke={P.blue} strokeWidth={2.4} />
        {L.dots.map((d) => (
          <circle key={d.id} cx={r1(d.x)} cy={r1(d.y)} r={r1(d.r)} fill={d.done ? P.green : d.gate ? P.blue : P.sage} stroke={d.done ? P.green : P.blue} strokeWidth={1.5} />
        ))}
        {/* You are here: a ring with a green dot. */}
        <circle cx={r1(L.source.x)} cy={r1(L.source.y)} r={r1(L.source.r * 1.9)} fill={P.sage} stroke={P.blue} strokeWidth={1.5} />
        <circle cx={r1(L.source.x)} cy={r1(L.source.y)} r={r1(L.source.r * 0.8)} fill={P.green} />
        <text x={r1(L.source.textX)} y={r1(L.source.textY + L.metaSize * 0.35)} fontFamily={MONO} fontSize={r1(L.metaSize)} fill={P.blue} letterSpacing="0.04em">
          {L.source.label.toLowerCase()}
        </text>
        {/* The mouth: the streams end on a bar; one line carries on to the outcome. */}
        <line x1={r1(L.mouth.x0 - 4)} x2={r1(L.mouth.x1 + 4)} y1={r1(L.mouth.y)} y2={r1(L.mouth.y)} stroke={P.blue} strokeWidth={2.4} strokeLinecap="square" />
        <line x1={r1(L.mouth.cx)} x2={r1(L.mouth.cx)} y1={r1(L.mouth.y)} y2={r1(L.mouth.dotY)} stroke={P.blue} strokeWidth={2.4} />
        <circle cx={r1(L.mouth.cx)} cy={r1(L.mouth.dotY)} r={r1(L.mouth.r)} fill={P.blue} />
        {L.mouth.lines.map((ln, i) => (
          <text key={i} x={r1(L.mouth.textX)} y={r1(L.mouth.textY + i * L.mouth.fs * 1.25)} textAnchor={L.mouth.align === "middle" ? "middle" : "start"}
            fontFamily={TEXT} fontSize={r1(L.mouth.fs)} fontWeight={700} fill={P.blue}>{ln}</text>
        ))}
      </svg>
      {/* The names: real buttons at the places the layout gives, right-aligned on the left-hand side. */}
      <ol className="contents">
        {L.labels.map((l) => {
          const term = termOf?.(l.id);
          return (
            <li key={l.id} className="contents">
              {(() => {
                const place = { top: l.y, left: l.align === "right" ? l.x - l.w : l.x, width: l.w, fontSize: fs, lineHeight: `${L.lineHeight}px` };
                const align = l.align === "right" ? "text-right" : "text-left";
                const body = (
                  <>
                    <span className="line-clamp-2 underline-offset-4 group-hover:underline">{l.title}</span>
                    {term && <span className="sr-only">, {term}</span>}
                    <span className="block font-mono" style={{ fontSize: L.metaSize, lineHeight: `${L.metaSize * 1.5}px` }}>{l.done ? "done" : l.meta}</span>
                  </>
                );
                return onOpen
                  ? <button type="button" onClick={() => onOpen(l.id)} className={`group absolute block cursor-pointer bg-transparent p-0 ${align}`} style={place}>{body}</button>
                  : <span className={`absolute block ${align}`} style={place}>{body}</span>;
              })()}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
