import { useEffect, useRef } from "react";
import { intake, uiIntake } from "../data/dataset.ts";
import { Button } from "../ui/Button.tsx";
import { COPY } from "./copy.ts";
import {
  identityLabel, yearTermLabel, majorName, missingSteps, optionLabel, OPTIONAL, questionSteps, trackName, type Answers, type StepId,
} from "./model.ts";

const list = (ids: string[], options: { id: string; label: string }[]) =>
  ids.map((id) => options.find((o) => o.id === id)?.label ?? id).join(", ");

/** Plain-language value for each answer. */
export function answerText(s: StepId, a: Answers): string {
  const skipped = OPTIONAL.has(s) ? "Skipped" : "Not answered";
  switch (s) {
    case "status": return optionLabel(intake.status, a.status) ?? skipped;
    case "major": return majorName(a.majorId) ?? skipped;
    case "year": return yearTermLabel(a) ?? skipped;
    case "gender": return optionLabel(intake.gender.options, a.gender) ?? skipped;
    case "school": return optionLabel(uiIntake.school.options, a.school) ?? skipped;
    case "track": return trackName(a.trackId) ?? skipped;
    case "horizon": return optionLabel(intake.horizons, a.horizon) ?? skipped;
    case "graduation": return optionLabel(intake.graduation, a.graduation) ?? "At the end of my fourth year";
    case "gradApps": return optionLabel(intake.gradApps, a.gradApps) ?? skipped;
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
  status: "Status", major: "Major", year: "Year and semester", gender: "Gender", school: "Campus", track: "Goal", horizon: "Time frame", gradApps: "Applying", graduation: "Graduating", experience: "Experience",
  skills: "Skills", credentials: "Certifications", hours: "Free hours a week", enrollment: "Enrollment", summer: "Summers", coop: "Co-op",
  location: "Based in", citizenship: "Citizenship", identity: "About you",
};

/**
 * Check your answers (design/DESIGN.md §7.2): the same sheet as the questions. Each answer is a ruled row, its question
 * in small type, the answer in body type, and "Change" on the right. Missing required answers are listed at the top
 * and marked in place with the sand bar, and the main button is never disabled: with something missing, it takes the
 * student straight to the first missing question.
 */
export function Review({ answers, onEdit, onBack, onBuild, onStartOver }: {
  answers: Answers; onEdit: (s: StepId) => void; onBack: () => void; onBuild: () => void;
  /** Editing an existing plan: "Start over" clears it and the answers (it moved here from the results header). */
  onStartOver?: () => void;
}) {
  const missing = missingSteps(answers);
  const h1 = useRef<HTMLHeadingElement>(null);
  useEffect(() => { h1.current?.focus({ preventScroll: true }); }, []);
  const steps = questionSteps(answers);
  return (
    <main className="corners w-full bg-sage px-[clamp(16px,4vw,30px)] pt-[26px] pb-[22px]">
      <h1 ref={h1} tabIndex={-1} className="text-h1">Check your answers</h1>
      <p className="mt-2.5">Edit anything that's off, then build your plan.</p>
      {missing.length > 0 && (
        <div role="alert" className="notice mt-6">
          <p>{missing.length === 1 ? "1 answer is still needed before we can build your plan." : `${missing.length} answers are still needed before we can build your plan.`}</p>
          <ul className="mt-1 flex flex-wrap gap-x-2">
            {missing.map((s) => (
              <li key={s}>
                <button type="button" onClick={() => onEdit(s)} aria-label={`Answer: ${SHORT[s]}`} className="btn btn--text -ml-2">{SHORT[s]}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <dl className="mt-6 border-t-[1.5px] border-blue">
        {steps.map((s) => {
          const needed = missing.includes(s);
          return (
            <div key={s} className={`grid grid-cols-[1fr_auto] items-center gap-x-4 border-b-[1.5px] border-blue py-2.5 ${needed ? "border-l-[3px] border-l-sand pl-3" : "pl-0"}`}>
              <dt className="col-start-1 text-small">{SHORT[s]}</dt>
              <dd className="col-start-1 min-w-0">{needed ? "Needed" : answerText(s, answers)}</dd>
              <dd className="col-start-2 row-span-2 row-start-1">
                <button type="button" onClick={() => onEdit(s)} className="btn btn--text"
                  aria-label={`${needed ? "Answer" : "Change"} ${SHORT[s]?.toLowerCase()}: ${COPY[s as keyof typeof COPY].question}`}>
                  {needed ? "Answer" : "Change"}
                </button>
              </dd>
            </div>
          );
        })}
      </dl>
      <nav aria-label="Review navigation" className="mt-6 flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={onBack}>Back</Button>
        {onStartOver && <Button variant="text" onClick={onStartOver}>Start over</Button>}
        <span className="flex-1" />
        <Button onClick={() => (missing.length ? onEdit(missing[0]) : onBuild())}>
          {missing.length ? "Answer the missing question first" : "Build my plan"}
        </Button>
      </nav>
    </main>
  );
}
