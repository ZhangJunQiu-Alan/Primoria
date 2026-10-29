"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ArrowIcon } from "@/components/arrow-icon";
import { BrandLogo } from "@/components/brand-logo";
import { OnboardingPlate, TUTOR_PORTRAITS, type DoneState, type GoalMode } from "@/components/onboarding/onboarding-plate";
import {
  EDUCATION_STAGES,
  isEducationCurriculum,
  isEducationStage,
  isTutorStyle,
  resolveTutorStyle,
  type EducationContextSource,
  type EducationCurriculum,
  type EducationStage,
  type GoalPositioningCandidate,
  type LearnerOnboardingState,
  type OnboardingStep,
  type TutorStyle,
} from "@/lib/learner-profile/types";
import {
  curriculumOptionsForStage,
  suggestEducationCurriculum,
  type SuggestedCurriculumRegion,
} from "@/lib/learner-profile/education-context";
import { msg, useT } from "@/lib/i18n/client";

type GoalAnchorSummary = {
  graphSubject: string;
  topicName: string;
  branch: "specific" | "subject_start" | "directed" | "goal_scoped" | "generated";
};

type GoalClarify = {
  message: string;
  candidates: GoalPositioningCandidate[];
};

type OnboardingApiResponse = LearnerOnboardingState & {
  anchor?: GoalAnchorSummary;
  clarify?: GoalClarify;
  course?: { courseId: string | null; lessonId: string | null };
  courseId?: string | null;
  error?: string;
};

type OnboardingClientProps = {
  initialState: LearnerOnboardingState;
  suggestedRegion?: SuggestedCurriculumRegion;
  debugMode?: boolean;
};

const STEP_ORDER: OnboardingStep[] = ["goal", "facts", "style"];
const TUTOR_STYLES: TutorStyle[] = ["socratic", "feynman", "euclid"];
/** The goal examples are two whole subjects and one single topic (the chain rule). */
const TOPIC_EXAMPLE_INDEX = 1;

function stepIndex(step: OnboardingStep) {
  const index = STEP_ORDER.indexOf(step);
  return index < 0 ? STEP_ORDER.length : index;
}

async function postOnboarding(path: string, body: Record<string, unknown>): Promise<OnboardingApiResponse> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as OnboardingApiResponse;
  if (!response.ok) throw new Error(data.error || "Could not save onboarding step.");
  return data;
}

function debugOnboardingResponse(
  path: string,
  body: Record<string, unknown>,
  current: LearnerOnboardingState,
): OnboardingApiResponse {
  const now = new Date().toISOString();
  const profile = current.profile ?? {
    ownerId: "debug-user",
    learningGoal: null,
    goalGraphId: null,
    goalStartTopicId: null,
    goalTargetConceptId: null,
    goalTargetConceptIds: [],
    goalScope: null,
    goalSkippedAt: null,
    goalPositioningStatus: null,
    goalPositioningMessage: null,
    goalPositioningCandidates: [],
    goalPositioningUpdatedAt: null,
    onboardingCourseStatus: null,
    onboardingCourseMessage: null,
    onboardingCourseUpdatedAt: null,
    factsIntakeStatus: null,
    factsIntakeJobId: null,
    factsIntakeMessage: null,
    factsIntakeUpdatedAt: null,
    educationStage: null,
    curriculumSystem: null,
    educationContextSource: null,
    educationContextConfirmedAt: null,
    knowledgeBackground: null,
    knowledgeBackgroundSkippedAt: null,
    tutorStyle: null,
    tutorStyleSkippedAt: null,
    onboardingCompletedAt: null,
    onboardingSkippedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  if (path.endsWith("/goal")) {
    if (body.skip) {
      return {
        profile: { ...profile, goalSkippedAt: now, learningGoal: null, updatedAt: now },
        nextStep: "facts",
        complete: false,
      };
    }
    return {
      profile: {
        ...profile,
        learningGoal: String(body.learningGoal ?? ""),
        goalGraphId: "data_structures_and_algorithms",
        goalStartTopicId: "arrays_and_strings",
        goalTargetConceptId: null,
        goalTargetConceptIds: [],
        goalScope: "canonical",
        goalSkippedAt: null,
        goalPositioningStatus: "positioned",
        goalPositioningMessage: null,
        goalPositioningCandidates: [],
        goalPositioningUpdatedAt: now,
        onboardingCourseStatus: "pending",
        onboardingCourseMessage: null,
        onboardingCourseUpdatedAt: now,
        updatedAt: now,
      },
      nextStep: "facts",
      complete: false,
      anchor: {
        graphSubject: "Data Structures and Algorithms",
        topicName: "Arrays and Strings",
        branch: "subject_start",
      },
    };
  }

  if (path.endsWith("/facts")) {
    const educationStage = isEducationStage(body.educationStage) ? body.educationStage : null;
    const curriculumSystem = isEducationCurriculum(body.curriculumSystem) ? body.curriculumSystem : null;
    return {
      profile: {
        ...profile,
        factsIntakeStatus: body.text ? "completed" : "skipped",
        factsIntakeJobId: body.text ? "debug-intake-job" : null,
        factsIntakeMessage: null,
        factsIntakeUpdatedAt: now,
        educationStage,
        curriculumSystem,
        educationContextSource: body.educationContextSource === "confirmed_suggestion" ? "confirmed_suggestion" : "user_selected",
        educationContextConfirmedAt: now,
        knowledgeBackground: educationStage === "middle_school" || educationStage === "high_school" || educationStage === "undergraduate" || educationStage === "graduate"
          ? educationStage
          : null,
        knowledgeBackgroundSkippedAt: educationStage === "professional" || educationStage === "other" ? now : null,
        onboardingCourseStatus: profile.goalSkippedAt ? null : "ready",
        onboardingCourseMessage: null,
        onboardingCourseUpdatedAt: profile.goalSkippedAt ? null : now,
        updatedAt: now,
      },
      nextStep: "style",
      complete: false,
      course: profile.goalSkippedAt
        ? { courseId: null, lessonId: null }
        : { courseId: "debug-course", lessonId: "debug-lesson" },
    };
  }

  return {
    profile: {
      ...profile,
      tutorStyle: body.skip ? null : resolveTutorStyle(body.tutorStyle),
      tutorStyleSkippedAt: body.skip ? now : null,
      onboardingCompletedAt: now,
      onboardingCourseStatus: profile.goalSkippedAt ? null : "ready",
      onboardingCourseMessage: null,
      onboardingCourseUpdatedAt: profile.goalSkippedAt ? null : now,
      updatedAt: now,
    },
    nextStep: "done",
    complete: true,
    courseId: profile.goalSkippedAt ? null : "debug-course",
  };
}

export function OnboardingClient({ initialState, suggestedRegion = "international", debugMode = false }: OnboardingClientProps) {
  const t = useT();
  const [state, setState] = useState<LearnerOnboardingState>(initialState);
  const [learningGoal, setLearningGoal] = useState(initialState.profile?.learningGoal ?? "");
  const [factsIntroduction, setFactsIntroduction] = useState("");
  const [educationStage, setEducationStage] = useState<EducationStage | null>(
    initialState.profile?.educationStage ?? null,
  );
  const [curriculumSystem, setCurriculumSystem] = useState<EducationCurriculum | null>(
    initialState.profile?.curriculumSystem ?? null,
  );
  const [educationContextSource, setEducationContextSource] = useState<EducationContextSource | null>(
    initialState.profile?.educationContextSource ?? null,
  );
  const [style, setStyle] = useState<TutorStyle>(() => resolveTutorStyle(initialState.profile?.tutorStyle));
  const [anchor, setAnchor] = useState<GoalAnchorSummary | null>(null);
  const [clarify, setClarify] = useState<GoalClarify | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [goalMode, setGoalMode] = useState<GoalMode>("topic");
  const [goalModeLocked, setGoalModeLocked] = useState(false);

  const step = state.nextStep;
  const index = stepIndex(step);
  const curriculumOptions = educationStage
    ? curriculumOptionsForStage(educationStage, suggestedRegion)
    : [];
  const savedLearningGoal = state.profile?.learningGoal ?? learningGoal;
  const goalSkipped = step !== "goal" && Boolean(state.profile?.goalSkippedAt);
  const goalStatus = state.profile?.goalPositioningStatus ?? null;
  const factsWaiting = state.profile?.factsIntakeStatus === "pending";
  const courseStatus =
    state.profile?.onboardingCourseStatus ??
    (courseId ? "ready" : state.profile?.goalGraphId ? "pending" : null);
  const courseFailed = courseStatus === "failed";
  const courseWaiting = courseStatus === "pending" || courseStatus === "building";
  const courseReady = courseStatus === "ready" && Boolean(courseId);
  const completionHref = courseReady ? `/course/${encodeURIComponent(courseId!)}/outline` : "/";
  const finalClarify =
    clarify ??
    (goalStatus === "clarify" && state.profile?.goalPositioningCandidates.length
      ? {
          message: state.profile.goalPositioningMessage ?? "",
          candidates: state.profile.goalPositioningCandidates,
        }
      : null);
  const doneState: DoneState = finalClarify
    ? "clarify"
    : goalStatus === "pending"
      ? "preparingPath"
      : factsWaiting
        ? "personalizing"
        : courseFailed
          ? "failed"
          : courseWaiting
            ? "building"
            : goalStatus === "failed"
              ? "goalFailed"
              : courseReady
                ? "ready"
                : state.profile?.goalSkippedAt
                  ? "skipped"
                  : "saved";

  const plateCopy = t.onboarding.plate;
  const goalPlacement = anchor
    ? anchor.branch === "generated"
      ? msg(plateCopy.customPath, { subject: anchor.graphSubject })
      : anchor.branch === "subject_start"
        ? msg(plateCopy.matched, { subject: anchor.graphSubject })
        : msg(plateCopy.matchedTopic, { subject: anchor.graphSubject, topic: anchor.topicName })
    : goalStatus === "pending"
      ? plateCopy.placing
      : goalStatus === "clarify"
        ? plateCopy.several
        : goalStatus === "failed"
          ? plateCopy.needsStart
          : state.profile?.goalStartTopicId
            ? plateCopy.placed
            : null;

  function applyResponse(data: OnboardingApiResponse) {
    setState({ profile: data.profile ?? null, nextStep: data.nextStep, complete: data.complete });
    setClarify(data.clarify ?? null);
    if (data.anchor) setAnchor(data.anchor);
    const nextCourseId = data.course?.courseId ?? data.courseId ?? null;
    if ("course" in data || "courseId" in data) setCourseId(nextCourseId);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const images = TUTOR_STYLES.map((id) => {
      const image = new window.Image();
      image.decoding = "async";
      image.src = TUTOR_PORTRAITS[id];
      return image;
    });
    return () => {
      images.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, []);

  useEffect(() => {
    if (debugMode || step !== "done" || (goalStatus !== "pending" && !courseWaiting)) return;
    let cancelled = false;

    async function pollOnboarding() {
      try {
        const response = await fetch("/api/onboarding", { cache: "no-store" });
        const data = (await response.json().catch(() => ({}))) as OnboardingApiResponse;
        if (!cancelled && response.ok) applyResponse(data);
      } catch {
        // The final screen remains usable even if a background status poll fails.
      }
    }

    const timer = window.setInterval(() => void pollOnboarding(), 2500);
    void pollOnboarding();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [courseWaiting, debugMode, goalStatus, step]);

  async function run(action: () => Promise<OnboardingApiResponse>) {
    setBusy(true);
    setError("");
    try {
      applyResponse(await action());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      if (!debugMode) {
        try {
          const response = await fetch("/api/onboarding", { cache: "no-store" });
          const data = (await response.json().catch(() => ({}))) as OnboardingApiResponse;
          if (response.ok) applyResponse(data);
        } catch {
          // Keep the original action error visible when status refresh also fails.
        }
      }
    } finally {
      setBusy(false);
    }
  }

  function submit(path: string, body: Record<string, unknown>) {
    return debugMode ? Promise.resolve(debugOnboardingResponse(path, body, state)) : postOnboarding(path, body);
  }

  function goBack() {
    const previous = STEP_ORDER[Math.max(0, index - 1)];
    setState((current) => ({ ...current, nextStep: previous }));
    setError("");
  }

  function resetPreview() {
    setState(initialState);
    setLearningGoal(initialState.profile?.learningGoal ?? "");
    setFactsIntroduction("");
    setEducationStage(initialState.profile?.educationStage ?? null);
    setCurriculumSystem(initialState.profile?.curriculumSystem ?? null);
    setEducationContextSource(initialState.profile?.educationContextSource ?? null);
    setStyle(resolveTutorStyle(initialState.profile?.tutorStyle));
    setAnchor(null);
    setClarify(null);
    setCourseId(null);
    setError("");
    setGoalModeLocked(false);
  }

  function pickExample(example: string, exampleIndex: number) {
    setLearningGoal(example);
    setClarify(null);
    setGoalMode(exampleIndex === TOPIC_EXAMPLE_INDEX ? "topic" : "subject");
    setGoalModeLocked(true);
  }

  function chooseEducationStage(nextStage: EducationStage) {
    const suggestion = suggestEducationCurriculum(nextStage, suggestedRegion);
    setEducationStage(nextStage);
    setCurriculumSystem(suggestion);
    setEducationContextSource(suggestion ? "confirmed_suggestion" : null);
  }

  function chooseCurriculum(nextCurriculum: EducationCurriculum) {
    setCurriculumSystem(nextCurriculum);
    setEducationContextSource("user_selected");
  }

  function submitFacts() {
    if (!educationStage || !curriculumSystem || !educationContextSource) {
      return Promise.reject(new Error(t.onboarding.facts.required));
    }
    const text = factsIntroduction.trim();
    return submit("/api/onboarding/facts", {
      educationStage,
      curriculumSystem,
      educationContextSource,
      ...(text.length >= 2 ? { text } : {}),
    });
  }

  function pickCandidate(candidate: GoalPositioningCandidate, goal: string) {
    return run(() => submit("/api/onboarding/goal", { learningGoal: goal, graphId: candidate.graphId }));
  }

  const goalCopy = t.onboarding.goal;
  const factsCopy = t.onboarding.facts;
  const styleCopy = t.onboarding.style;
  const doneCopy = t.onboarding.done;
  const done = doneCopy.states[doneState];

  return (
    <div className="onboarding-screen">
      <div className="onboarding-page">
        <section className="onboarding-side">
          <header className="onboarding-side-head">
            <BrandLogo />
            <div className="onboarding-meter">
              <span>
                {step === "done"
                  ? t.onboarding.setUp
                  : msg(t.onboarding.stepOf, { current: index + 1, total: STEP_ORDER.length })}
              </span>
              <span className="onboarding-meter-bars" aria-hidden="true">
                {STEP_ORDER.map((id, barIndex) => (
                  <i key={id} data-state={barIndex < index ? "done" : barIndex === index ? "now" : undefined} />
                ))}
              </span>
            </div>
          </header>

          <div className="onboarding-main" aria-live="polite">
            {index > 0 && step !== "done" ? (
              <button type="button" className="onboarding-back" onClick={goBack} disabled={busy}>
                <ArrowIcon size={14} back />
                {t.onboarding.back}
              </button>
            ) : null}

            {step === "goal" ? (
              <>
                <div className="onboarding-head">
                  <span className="onboarding-kicker">{goalCopy.kicker}</span>
                  <h1>{goalCopy.title}</h1>
                  <p>{goalCopy.copy}</p>
                </div>
                <div className="onboarding-body">
                  <div className="onboarding-field">
                    <label htmlFor="onboarding-goal">{goalCopy.label}</label>
                    <textarea
                      id="onboarding-goal"
                      value={learningGoal}
                      onChange={(event) => {
                        setLearningGoal(event.target.value);
                        if (clarify) setClarify(null);
                      }}
                      placeholder={goalCopy.placeholder}
                      rows={3}
                    />
                    {clarify ? (
                      <div className="onboarding-clarify">
                        <p>{goalCopy.clarify}</p>
                        <div className="onboarding-candidates">
                          {clarify.candidates.map((candidate) => (
                            <button key={candidate.graphId} type="button" className="onboarding-candidate" disabled={busy} onClick={() => pickCandidate(candidate, learningGoal)}>
                              {candidate.subject}
                              <ArrowIcon />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="onboarding-examples">
                        <span>{goalCopy.tryLabel}</span>
                        {goalCopy.examples.map((example, exampleIndex) => (
                          <button key={example} type="button" onClick={() => pickExample(example, exampleIndex)}>
                            {example}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="onboarding-actions">
                  <button
                    type="button"
                    className="onboarding-primary"
                    disabled={busy || !learningGoal.trim()}
                    aria-busy={busy || undefined}
                    onClick={() => run(() => submit("/api/onboarding/goal", { learningGoal }))}
                  >
                    {busy ? goalCopy.locating : goalCopy.continue}
                    <ArrowIcon />
                  </button>
                  <button type="button" className="onboarding-secondary" disabled={busy} onClick={() => run(() => submit("/api/onboarding/goal", { skip: true }))}>
                    {goalCopy.skip}
                  </button>
                </div>
              </>
            ) : null}

            {step === "facts" ? (
              <>
                <div className="onboarding-head">
                  <span className="onboarding-kicker">{factsCopy.kicker}</span>
                  <h1>{factsCopy.title}</h1>
                  <p>{factsCopy.copy}</p>
                </div>
                <div className="onboarding-body">
                  <div className="onboarding-field">
                    <span className="onboarding-label" id="onboarding-stage-label">{factsCopy.stageLabel}</span>
                    <div className="onboarding-choices" data-wrap="true" role="radiogroup" aria-labelledby="onboarding-stage-label">
                      {EDUCATION_STAGES.map((stageOption) => (
                        <button
                          key={stageOption}
                          type="button"
                          role="radio"
                          aria-checked={educationStage === stageOption}
                          className="onboarding-choice"
                          onClick={() => chooseEducationStage(stageOption)}
                        >
                          <i />
                          {t.onboarding.stages[stageOption]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="onboarding-field">
                    <span className="onboarding-label" id="onboarding-curriculum-label">
                      {factsCopy.curriculumLabel}
                      {educationStage && (curriculumOptions.length === 1 || !curriculumSystem) ? (
                        <small>{curriculumOptions.length === 1 ? factsCopy.matched : factsCopy.pick}</small>
                      ) : null}
                    </span>
                    {educationStage ? (
                      <div className="onboarding-choices" role="radiogroup" aria-labelledby="onboarding-curriculum-label">
                        {curriculumOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            role="radio"
                            aria-checked={curriculumSystem === option}
                            className="onboarding-choice"
                            onClick={() => chooseCurriculum(option)}
                          >
                            <i />
                            {t.onboarding.curricula[option]}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="onboarding-placeholder">{factsCopy.stageFirst}</p>
                    )}
                  </div>
                  <div className="onboarding-field">
                    <label className="onboarding-label" htmlFor="onboarding-note">
                      {factsCopy.noteLabel}
                      <small>{factsCopy.optional}</small>
                    </label>
                    <textarea
                      id="onboarding-note"
                      value={factsIntroduction}
                      maxLength={2_000}
                      onChange={(event) => setFactsIntroduction(event.target.value)}
                      placeholder={factsCopy.notePlaceholder}
                      rows={3}
                      aria-describedby="onboarding-note-help"
                    />
                    <p className="onboarding-help" id="onboarding-note-help">{factsCopy.noteHelp}</p>
                  </div>
                </div>
                <div className="onboarding-actions">
                  <button
                    type="button"
                    className="onboarding-primary"
                    disabled={busy || !educationStage || !curriculumSystem}
                    aria-busy={busy || undefined}
                    onClick={() => run(submitFacts)}
                  >
                    {busy ? factsCopy.saving : factsCopy.continue}
                    <ArrowIcon />
                  </button>
                </div>
              </>
            ) : null}

            {step === "style" ? (
              <>
                <div className="onboarding-head">
                  <span className="onboarding-kicker">{styleCopy.kicker}</span>
                  <h1>{styleCopy.title}</h1>
                  <p>{styleCopy.copy}</p>
                </div>
                <div className="onboarding-body">
                  <div className="onboarding-styles" role="radiogroup" aria-label={styleCopy.kicker}>
                    {TUTOR_STYLES.map((id) => (
                      <button key={id} type="button" role="radio" aria-checked={style === id} className="onboarding-style" onClick={() => setStyle(id)}>
                        <span className="onboarding-style-portrait">
                          <Image src={TUTOR_PORTRAITS[id]} alt="" width={1024} height={1536} sizes="46px" unoptimized />
                        </span>
                        <b>{t.onboarding.styles[id].title}</b>
                        <small>{t.onboarding.styles[id].meta}</small>
                        {id === "feynman" ? <span className="onboarding-tag">{styleCopy.defaultTag}</span> : null}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="onboarding-actions">
                  <button
                    type="button"
                    className="onboarding-primary"
                    disabled={busy || !isTutorStyle(style)}
                    aria-busy={busy || undefined}
                    onClick={() => run(() => submit("/api/onboarding/style", { tutorStyle: style }))}
                  >
                    {busy ? styleCopy.saving : styleCopy.finish}
                    <ArrowIcon />
                  </button>
                  <button type="button" className="onboarding-secondary" disabled={busy} onClick={() => run(() => submit("/api/onboarding/style", { skip: true }))}>
                    {styleCopy.skip}
                  </button>
                </div>
              </>
            ) : null}

            {step === "done" ? (
              <>
                <div className="onboarding-head">
                  <span className="onboarding-kicker" data-tone={doneState === "failed" ? "wrong" : doneState === "ready" || doneState === "saved" || doneState === "skipped" ? "pine" : undefined}>
                    {done.kicker}
                  </span>
                  <h1>{done.title}</h1>
                  <p>{done.copy}</p>
                </div>
                <div className="onboarding-actions">
                  {finalClarify ? (
                    <div className="onboarding-candidates">
                      {finalClarify.candidates.map((candidate) => (
                        <button key={candidate.graphId} type="button" className="onboarding-candidate" disabled={busy} onClick={() => pickCandidate(candidate, savedLearningGoal)}>
                          {candidate.subject}
                          <ArrowIcon />
                        </button>
                      ))}
                    </div>
                  ) : factsWaiting ? (
                    <button type="button" className="onboarding-primary" disabled aria-busy="true">
                      {doneCopy.preparingProfile}
                    </button>
                  ) : courseFailed || courseStatus === "pending" ? (
                    <button
                      type="button"
                      className="onboarding-primary"
                      disabled={busy}
                      aria-busy={busy || undefined}
                      onClick={() => run(() => submit("/api/onboarding/course", {}))}
                    >
                      {busy ? doneCopy.preparingCourse : courseFailed ? doneCopy.retry : doneCopy.prepareCourse}
                      <ArrowIcon />
                    </button>
                  ) : courseStatus === "building" ? (
                    <button type="button" className="onboarding-primary" disabled aria-busy="true">
                      {doneCopy.preparingCourse}
                    </button>
                  ) : (
                    <Link className="onboarding-primary" href={completionHref}>
                      {courseReady ? doneCopy.openOutline : doneCopy.enterWorkspace}
                      <ArrowIcon />
                    </Link>
                  )}
                  {courseWaiting || factsWaiting || courseFailed ? (
                    <Link className="onboarding-secondary" href="/">{courseFailed ? doneCopy.enterWorkspace : doneCopy.enterNow}</Link>
                  ) : null}
                  {debugMode ? (
                    <button type="button" className="onboarding-secondary" onClick={resetPreview}>
                      {doneCopy.restartPreview}
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}

            {error ? <p className="onboarding-alert" role="alert">{error}</p> : null}
          </div>
        </section>

        <OnboardingPlate
          step={step}
          goal={{ text: savedLearningGoal && step !== "goal" ? savedLearningGoal : learningGoal, skipped: goalSkipped, status: goalPlacement, typing: step === "goal" && Boolean(learningGoal.trim()) }}
          start={{ stage: educationStage, curriculum: curriculumSystem, options: curriculumOptions, note: factsIntroduction }}
          style={style}
          doneState={doneState}
          courseName={anchor?.graphSubject ?? savedLearningGoal ?? ""}
          goalMode={goalMode}
          setGoalMode={setGoalMode}
          goalModeLocked={goalModeLocked}
        />
      </div>
    </div>
  );
}
