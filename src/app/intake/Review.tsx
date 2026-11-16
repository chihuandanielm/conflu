import { useEffect, useRef } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { intake, uiIntake } from "../data/dataset.ts";
import { Button } from "../ui/Button.tsx";
import { ProgressBar } from "../ui/ProgressBar.tsx";
import { COPY } from "./copy.ts";
import {
  identityLabel, majorName, optionLabel, OPTIONAL, questionSteps, trackName, type Answers, type StepId,
} from "./model.ts";

const list = (ids: string[], options: { id: string; label: string }[]) =>
  ids.map((id) => options.find((o) => o.id === id)?.label ?? id).join(", ");

/** Plain-language value for each answer. */
export function answerText(s: StepId, a: Answers): string {
  const skipped = OPTIONAL.has(s) ? "Skipped" : "Not answered";
  switch (s) {
    case "status": return optionLabel(intake.status, a.status) ?? skipped;
    case "major": return majorName(a.majorId) ?? skipped;
    case "year": return optionLabel(intake.years, a.year) ?? skipped;
    case "school": return optionLabel(uiIntake.school.options, a.school) ?? skipped;
    case "track": return trackName(a.trackId) ?? skipped;
    case "horizon": return optionLabel(intake.horizons, a.horizon) ?? skipped;
    case "experience": return a.experience.length ? list(a.experience, intake.experience) : "None yet";
    case "skills": return a.skills.length ? list(a.skills, intake.skills) : "None picked";
    case "credentials": return a.credentials.length ? list(a.credentials, intake.credentials) : a.seen.includes("credentials") ? "None" : skipped;
    case "hours": return `${a.weeklyHours} hours a week outside class`;
    case "enrollment": return optionLabel(intake.enrollment, a.enrollment) ?? skipped;
    case "summer": return optionLabel(intake.summerAvailability, a.summer) ?? skipped;
    case "coop": return a.openToCoop === undefined ? skipped : a.openToCoop ? "Yes" : "No";
    case "location": return optionLabel(intake.location, a.location) ?? skipped;
    case "citizenship": return optionLabel(intake.citizenship, a.citizenship) ?? skipped;
    case "identity": return a.identity.length ? a.identity.map(identityLabel).join(", ") : skipped;
    default: return "";
  }
}

const SHORT: Partial<Record<StepId, string>> = {
  status: "Status", major: "Major", year: "Year", school: "Campus", track: "Goal", horizon: "Time frame", experience: "Experience",
  skills: "Skills", credentials: "Certifications", hours: "Free hours a week", enrollment: "Enrollment", summer: "Summers", coop: "Co-op",
  location: "Based in", citizenship: "Citizenship", identity: "About you",
};

export function Review({ answers, onEdit, onBack, onBuild, canBuild }: {
  answers: Answers; onEdit: (s: StepId) => void; onBack: () => void; onBuild: () => void; canBuild: boolean;
}) {
  const h1 = useRef<HTMLHeadingElement>(null);
  useEffect(() => { h1.current?.focus({ preventScroll: true }); }, []);
  const steps = questionSteps(answers);
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto w-full max-w-[640px] px-4 pt-6 sm:px-6">
        <ProgressBar value={steps.length} max={steps.length} label="Intake progress" />
      </header>
      <main className="mx-auto w-full max-w-[640px] flex-1 px-4 py-10 sm:px-6">
        <h1 ref={h1} tabIndex={-1} className="text-2xl font-semibold outline-none">Check your answers</h1>
        <p className="mt-2 text-muted">Edit anything that's off, then build your plan.</p>
        <dl className="mt-8 divide-y divide-border rounded-md border border-border">
          {steps.map((s) => (
            <div key={s} className="flex items-start gap-4 px-4 py-3">
              <dt className="w-32 shrink-0 text-sm text-muted">{SHORT[s]}</dt>
              <dd className="flex-1 text-sm text-ink">{answerText(s, answers)}</dd>
              <dd>
                <button type="button" onClick={() => onEdit(s)}
                  aria-label={`Edit ${SHORT[s]?.toLowerCase()}: ${COPY[s as keyof typeof COPY].question}`}
                  className="inline-flex items-center gap-1 rounded-sm px-1 text-sm font-semibold text-blue hover:underline">
                  <Pencil size={14} aria-hidden="true" /> Edit
                </button>
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={onBack}><ArrowLeft size={18} aria-hidden="true" /> Back</Button>
          <span className="flex-1" />
          <Button onClick={onBuild} disabled={!canBuild}>Build my plan</Button>
        </div>
      </main>
    </div>
  );
}
