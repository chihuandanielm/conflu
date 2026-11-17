import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { tracksForMajor } from "../model.ts";
import { SingleChoice, type Choice } from "./SingleChoice.tsx";

/** Tracks suggested for the major first, the rest behind "See all paths", and "Still exploring" always. */
export function TrackPicker({ majorId, value, onSelect, labelledBy, invalid, describedBy }: {
  majorId?: string; value?: string; onSelect: (id: string) => void; labelledBy: string; invalid?: boolean; describedBy?: string;
}) {
  const { suggested, others, exploring } = tracksForMajor(majorId);
  const [showAll, setShowAll] = useState(() => !!value && others.some((t) => t.id === value));
  const choices: Choice<string>[] = [
    ...suggested.map((t) => ({ value: t.id, label: t.name, description: t.description, section: "Common for your major" })),
    ...(showAll ? others.map((t) => ({ value: t.id, label: t.name, description: t.description, section: "Other paths" })) : []),
    ...(exploring ? [{ value: exploring.id, label: exploring.name, description: exploring.description, section: "Not sure yet" }] : []),
  ];
  return (
    <div className="flex flex-col gap-4">
      <SingleChoice labelledBy={labelledBy} invalid={invalid} describedBy={describedBy} value={value} onSelect={onSelect} choices={choices} />
      {!showAll && others.length > 0 && (
        <button type="button" aria-expanded={false} onClick={() => setShowAll(true)}
          className="inline-flex items-center gap-1 self-start rounded-md px-2 py-1 font-semibold text-blue hover:bg-blue-tint">
          See all paths ({others.length} more) <ChevronDown size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
