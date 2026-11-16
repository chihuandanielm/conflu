import { useCallback, useEffect, useReducer, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { intake, uiIntake } from "../data/dataset.ts";
import { load, save } from "../state/storage.ts";
import { todayISO } from "../today.ts";
import { COPY } from "./copy.ts";
import { Intro } from "./Intro.tsx";
import { QuestionShell } from "./QuestionShell.tsx";
import { Review } from "./Review.tsx";
import { ChipList } from "./controls/ChipChecklist.tsx";
import { MajorPicker } from "./controls/MajorPicker.tsx";
import { ExperienceChips, RankedChips } from "./controls/RankedChips.tsx";
import { SingleChoice, type Choice } from "./controls/SingleChoice.tsx";
import { TrackPicker } from "./controls/TrackPicker.tsx";
import { Button } from "../ui/Button.tsx";
import {
  emptyAnswers, firstIncomplete, identityLabel, isAnswered, isSummerBreak, majorOfferedAt, questionSteps, stepsFor,
  type Answers, type School, type StepId,
} from "./model.ts";

export const INTAKE_KEY = "cpm.intake.v1";
const ADVANCE_MS = 250;

export interface IntakeState { answers: Answers; step: StepId; returnToReview: boolean }
type Action =
  | { type: "set"; patch: Partial<Answers> }
  | { type: "toggle"; field: "experience" | "skills" | "credentials" | "identity"; id: string }
  | { type: "next" } | { type: "back" } | { type: "go"; step: StepId; returnToReview?: boolean } | { type: "reset" };

const seen = (a: Answers, s: StepId): Answers => (a.seen.includes(s) ? a : { ...a, seen: [...a.seen, s] });

export function reducer(state: IntakeState, action: Action): IntakeState {
  const { answers, step } = state;
  switch (action.type) {
    case "set": return { ...state, answers: { ...answers, ...action.patch } };
    case "toggle": {
      const list = answers[action.field];
      return { ...state, answers: { ...answers, [action.field]: list.includes(action.id) ? list.filter((x) => x !== action.id) : [...list, action.id] } };
    }
    case "next": {
      const a = seen(answers, step);
      if (state.returnToReview) return { answers: a, step: "review", returnToReview: false };
      const steps = stepsFor(a);
      return { ...state, answers: a, step: steps[Math.min(steps.indexOf(step) + 1, steps.length - 1)] };
    }
    case "back": {
      if (state.returnToReview) return { ...state, step: "review", returnToReview: false };
      const steps = stepsFor(answers);
      return { ...state, step: steps[Math.max(steps.indexOf(step) - 1, 0)] };
    }
    case "go": return { ...state, step: action.step, returnToReview: !!action.returnToReview };
    case "reset": return { answers: emptyAnswers(), step: "status", returnToReview: false };
  }
}

export function initialIntake(): IntakeState {
  const saved = load<IntakeState>(INTAKE_KEY);
  if (saved?.answers && saved.step) return { ...saved, answers: { ...emptyAnswers(), ...saved.answers }, step: "intro" };
  return { answers: emptyAnswers(), step: "intro", returnToReview: false };
}

/** Where a returning student picks up: the step they were on, unless an earlier required answer is missing. */
function resumeStep(): StepId {
  const saved = load<IntakeState>(INTAKE_KEY);
  if (!saved?.answers) return "status";
  const a = { ...emptyAnswers(), ...saved.answers };
  return saved.step === "intro" ? "status" : (firstIncomplete(a) && saved.step === "review" ? firstIncomplete(a)! : saved.step);
}

export function IntakeFlow({ onBuild, startAt, onContinuePlan, onStartOver, initialAnswers }: {
  onBuild: (a: Answers) => void; startAt?: StepId; onContinuePlan?: () => void; onStartOver?: () => void; initialAnswers?: Answers;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const s = initialIntake();
    if (initialAnswers) return { answers: initialAnswers, step: startAt ?? "review", returnToReview: false };
    return startAt ? { ...s, step: startAt } : s;
  });
  const { answers, step } = state;
  const hasProgress = useRef(!!load<IntakeState>(INTAKE_KEY)?.answers?.seen?.length).current;
  const timer = useRef<number | undefined>(undefined);
  const reduce = useReducedMotion();

  // Save on every change (except the intro screen, so "Continue where you left off" keeps the real step).
  useEffect(() => { if (step !== "intro") save(INTAKE_KEY, state); }, [state, step]);

  const cancelAdvance = () => { window.clearTimeout(timer.current); timer.current = undefined; };
  useEffect(() => cancelAdvance, []);
  const next = useCallback(() => { cancelAdvance(); dispatch({ type: "next" }); }, []);
  const back = useCallback(() => { cancelAdvance(); dispatch({ type: "back" }); }, []);
  /** Single-choice answers: show the selection, then advance after a short beat. */
  const choose = useCallback((patch: Partial<Answers>) => {
    cancelAdvance();
    dispatch({ type: "set", patch });
    timer.current = window.setTimeout(() => dispatch({ type: "next" }), ADVANCE_MS);
  }, []);

  const qSteps = questionSteps(answers);
  const qIndex = qSteps.indexOf(step);
  const canContinue = isAnswered(step, answers);

  // Keyboard: Enter continues, Escape goes back. Buttons and text fields handle their own Enter.
  useEffect(() => {
    if (step === "intro") return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "Escape") { e.preventDefault(); back(); }
      else if (e.key === "Enter" && tag !== "BUTTON" && tag !== "INPUT" && tag !== "A" && step !== "review" && canContinue) { e.preventDefault(); next(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, canContinue, back, next]);

  const headingId = `q-${step}`;
  let screen: ReactNode;
  if (step === "intro") {
    screen = <Intro hasProgress={hasProgress} onStart={() => dispatch({ type: "go", step: "status" })}
      onResume={() => dispatch({ type: "go", step: resumeStep() })} onContinuePlan={onContinuePlan}
      onStartOver={() => { onStartOver?.(); dispatch({ type: "reset" }); }} />;
  } else if (step === "review") {
    screen = <Review answers={answers} canBuild={!firstIncomplete(answers)} onBack={back}
      onEdit={(s) => dispatch({ type: "go", step: s, returnToReview: true })} onBuild={() => onBuild(answers)} />;
  } else {
    const body = renderStep(step, answers, headingId, choose, (field, id) => dispatch({ type: "toggle", field, id }));
    const optional = step === "location" || step === "citizenship" || step === "identity" || step === "credentials";
    screen = (
      <QuestionShell focusHeading={step !== "major"} copy={COPY[step]} headingId={headingId} step={qIndex + 1} total={qSteps.length}
        onBack={back} onContinue={next} canContinue={canContinue}
        continueLabel={state.returnToReview ? "Back to review" : "Continue"}
        onSkip={optional ? () => {
          const clear: Partial<Answers> = step === "location" ? { location: undefined }
            : step === "citizenship" ? { citizenship: undefined } : step === "identity" ? { identity: [] } : { credentials: [] };
          dispatch({ type: "set", patch: clear }); next();
        } : undefined}
        secondary={step === "experience" ? (
          <Button variant="secondary" onClick={() => { dispatch({ type: "set", patch: { experience: [] } }); next(); }}>None yet</Button>
        ) : undefined}>
        {body}
      </QuestionShell>
    );
  }

  const announce = qIndex >= 0 ? `Question ${qIndex + 1} of ${qSteps.length}. ${COPY[step as keyof typeof COPY].question}`
    : step === "review" ? "Check your answers." : "";

  return (
    <>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{announce}</p>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step}
          initial={{ opacity: 0, x: reduce ? 0 : 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduce ? 0 : -16 }}
          transition={{ duration: reduce ? 0.01 : 0.2, ease: "easeOut" }}>
          {screen}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

function renderStep(step: StepId, a: Answers, labelledBy: string, choose: (p: Partial<Answers>) => void,
  toggle: (field: "experience" | "skills" | "credentials" | "identity", id: string) => void): ReactNode {
  const single = <V extends string | number>(choices: Choice<V>[], value: V | undefined, patch: (v: V) => Partial<Answers>) =>
    <SingleChoice labelledBy={labelledBy} choices={choices} value={value} onSelect={(v) => choose(patch(v))} />;
  const noSkip = <T extends { id: string }>(xs: T[]) => xs.filter((x) => x.id !== "skip");

  switch (step) {
    case "status":
      return single(intake.status.map((s) => ({ value: s.id, label: s.label, disabled: !s.enabled, note: s.enabled ? undefined : "Coming soon" })),
        a.status, () => ({ status: "college-student" }));
    case "major":
      return <MajorPicker labelledBy={labelledBy} school={a.school} value={a.majorId} onSelect={(id) => choose({ majorId: id })} />;
    case "year":
      return (
        <>
          {isSummerBreak(todayISO()) && <p className="mb-4 rounded-md bg-blue-tint px-4 py-3 text-sm text-ink">{uiIntake.year.summerHint}</p>}
          {single(intake.years.map((y) => ({ value: y.id as 1 | 2 | 3 | 4, label: y.label })), a.year, (v) => ({ year: v }))}
        </>
      );
    case "school":
      // A campus that doesn't offer the chosen major clears it (and the co-op answer that depended on it).
      return single(uiIntake.school.options.map((o) => ({ value: o.id as School, label: o.label })), a.school,
        (v) => (majorOfferedAt(a.majorId, v) || !a.majorId ? { school: v } : { school: v, majorId: undefined, openToCoop: undefined }));
    case "track":
      return <TrackPicker labelledBy={labelledBy} majorId={a.majorId} value={a.trackId} onSelect={(id) => choose({ trackId: id })} />;
    case "horizon":
      return single(intake.horizons.map((h) => ({ value: h.id as Answers["horizon"] & string, label: h.label })), a.horizon, (v) => ({ horizon: v }));
    case "experience":
      return <ExperienceChips majorId={a.majorId} trackId={a.trackId} selected={a.experience} onToggle={(id) => toggle("experience", id)} />;
    case "skills":
      return <RankedChips label="Skills" options={intake.skills} majorId={a.majorId} trackId={a.trackId} selected={a.skills} onToggle={(id) => toggle("skills", id)} />;
    case "credentials":
      return <RankedChips label="Certifications" options={intake.credentials} majorId={a.majorId} trackId={a.trackId} selected={a.credentials} onToggle={(id) => toggle("credentials", id)} />;
    case "hours":
      return single(intake.weeklyHours.map((h) => ({ value: h, label: `${h} hours a week` })), a.weeklyHours, (v) => ({ weeklyHours: v }));
    case "summer":
      return single(intake.summerAvailability.map((s) => ({ value: s.id as NonNullable<Answers["summer"]>, label: s.label })), a.summer, (v) => ({ summer: v }));
    case "coop":
      return single(uiIntake.coop.options.map((o) => ({ value: o.id, label: o.label })),
        a.openToCoop === undefined ? undefined : a.openToCoop ? "yes" : "no", (v) => ({ openToCoop: v === "yes" }));
    case "location":
      return single(noSkip(intake.location).map((o) => ({ value: o.id as NonNullable<Answers["location"]>, label: o.label })), a.location, (v) => ({ location: v }));
    case "citizenship":
      return single(noSkip(intake.citizenship).map((o) => ({ value: o.id as NonNullable<Answers["citizenship"]>, label: o.label })), a.citizenship, (v) => ({ citizenship: v }));
    case "identity":
      return <ChipList label="About you" chips={intake.optionalIdentity.tags.map((t) => ({ id: t, label: identityLabel(t) }))}
        selected={a.identity} onToggle={(id) => toggle("identity", id)} />;
    default:
      return null;
  }
}
