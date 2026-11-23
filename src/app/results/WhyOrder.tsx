import { useId, useState } from "react";
import { tracks } from "../data/dataset.ts";

const host = (u: string) => new URL(u).hostname.replace(/^www\./, "");

/**
 * "Why this order" (design/DESIGN.md §7.4 #2): a text button near the top of the Plan tab that opens the career path's
 * recruiter focus sentence and the sources it comes from, so the student can see the ranking isn't made up.
 */
export function WhyOrder({ trackId }: { trackId?: string }) {
  const track = tracks.find((t) => t.id === trackId);
  const [open, setOpen] = useState(false);
  const panel = useId();
  if (!track?.recruiterFocus) return null;
  return (
    <div>
      <button type="button" className="btn btn--text -ml-2" aria-expanded={open} aria-controls={panel} onClick={() => setOpen((x) => !x)}>
        Why this order
      </button>
      <div id={panel} hidden={!open} className="mt-2 max-w-[44em]">
        <p>Each semester lists the most important goals first, ranked by what {track.name.toLowerCase()} recruiters look for.</p>
        <p className="mt-1.5">{track.recruiterFocus}</p>
        {track.recruiterSources?.length ? (
          <p className="mt-1.5 text-small">Sources:{" "}
            {track.recruiterSources.map((u, i) => (
              <span key={u}>{i > 0 && ", "}<a href={u} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{host(u)}<span className="sr-only"> (opens in a new tab)</span></a></span>
            ))}
          </p>
        ) : null}
      </div>
    </div>
  );
}
