"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  EDUCATION_STAGES,
  isEducationCurriculum,
  isEducationStage,
  isTutorStyle,
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
import { useT } from "@/lib/i18n/client";

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

type OnboardingVisual = {
  src: string;
  title: string;
  body: string;
  mark: string;
  width: number;
  height: number;
};

const STEP_ORDER: OnboardingStep[] = ["goal", "facts", "style"];
const DEFAULT_TUTOR_STYLE: TutorStyle = "feynman";

const STEP_VISUALS: Record<OnboardingStep, { src: string; mark: string; width: number; height: number }> = {
  goal: {
    src: "/onboarding/goal-map.svg",
    mark: "01",
    width: 720,
    height: 840,
  },
  facts: {
    src: "/onboarding/background-layers.svg",
    mark: "02",
    width: 720,
    height: 840,
  },
  style: {
    src: "/onboarding/tutor-atelier.svg",
    mark: "03",
    width: 720,
    height: 840,
  },
  done: {
    src: "/onboarding/course-ready.svg",
    mark: "04",
    width: 720,
    height: 840,
  },
};

function stepIndex(step: OnboardingStep) {
  const index = STEP_ORDER.indexOf(step);
  return index < 0 ? STEP_ORDER.length : index;
}

function normalizeTutorStyle(value: unknown): TutorStyle {
  return isTutorStyle(value) ? value : DEFAULT_TUTOR_STYLE;
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
      tutorStyle: body.skip ? null : normalizeTutorStyle(body.tutorStyle),
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
  const [curriculumMenuOpen, setCurriculumMenuOpen] = useState(false);
  const [style, setStyle] = useState<TutorStyle>(() => normalizeTutorStyle(initialState.profile?.tutorStyle));
  const [anchor, setAnchor] = useState<GoalAnchorSummary | null>(null);
  const [clarify, setClarify] = useState<GoalClarify | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const tutorStylesList = useMemo<Array<{
    id: TutorStyle;
    title: string;
    person: string;
    meta: string;
    imageSrc: string;
  }>>(() => [
    {
      id: "socratic",
      ...t.onboarding.styles.socratic,
      imageSrc: "/onboarding/tutors/socratic.webp",
    },
    {
      id: "feynman",
      ...t.onboarding.styles.feynman,
      imageSrc: "/onboarding/tutors/feynman.webp",
    },
    {
      id: "euclid",
      ...t.onboarding.styles.euclid,
      imageSrc: "/onboarding/tutors/euclid.webp",
    },
  ], [t.onboarding.styles]);

  const step = state.nextStep;
  const index = stepIndex(step);
  const progress = Math.min(100, ((index + 1) / STEP_ORDER.length) * 100);
  const visualMeta = t.onboarding.visuals[step];
  const visual = {
    ...STEP_VISUALS[step],
    title: visualMeta.title,
    body: visualMeta.body,
  };
  const selectedTutorStyle = tutorStylesList.find((item) => item.id === style) ?? tutorStylesList[1];
  const curriculumOptions = educationStage
    ? curriculumOptionsForStage(educationStage, suggestedRegion)
    : [];
  const visualImage =
    step === "style"
      ? { src: selectedTutorStyle.imageSrc, width: 1024, height: 1536 }
      : { src: visual.src, width: visual.width, height: visual.height };
  const savedLearningGoal = state.profile?.learningGoal ?? learningGoal;
  const goalStatus = state.profile?.goalPositioningStatus ?? null;
  const factsWaiting = state.profile?.factsIntakeStatus === "pending";
  const courseStatus =
    state.profile?.onboardingCourseStatus ??
    (courseId ? "ready" : state.profile?.goalGraphId ? "pending" : null);
  const courseFailed = courseStatus === "failed";
  const courseWaiting = courseStatus === "pending" || courseStatus === "building";
  const courseReady = courseStatus === "ready" && Boolean(courseId);
  const completionHref = courseReady ? `/course/${encodeURIComponent(courseId!)}/outline` : "/";
  const completionLabel = courseReady ? t.onboarding.completion.openOutline : t.onboarding.completion.enterWorkspace;
  const finalClarify =
    clarify ??
    (goalStatus === "clarify" && state.profile?.goalPositioningCandidates.length
      ? {
          message: state.profile.goalPositioningMessage ?? "A few subjects match your goal. Pick where to start.",
          candidates: state.profile.goalPositioningCandidates,
        }
      : null);

  function applyResponse(data: OnboardingApiResponse) {
    setState({ profile: data.profile ?? null, nextStep: data.nextStep, complete: data.complete });
    setClarify(data.clarify ?? null);
    if (data.anchor) setAnchor(data.anchor);
    const nextCourseId = data.course?.courseId ?? data.courseId ?? null;
    if ("course" in data || "courseId" in data) setCourseId(nextCourseId);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const images = tutorStylesList.map(({ imageSrc }) => {
      const image = new window.Image();
      image.decoding = "async";
      image.src = imageSrc;
      return image;
    });
    return () => {
      images.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, [tutorStylesList]);

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

  const goalSummary = useMemo(() => {
    if (anchor) {
      if (anchor.branch === "generated") {
        return `Designed a custom path for ${anchor.graphSubject}. We'll start from ${anchor.topicName}.`;
      }
      return anchor.branch === "specific"
        ? `Matched ${anchor.topicName} in ${anchor.graphSubject}.`
        : `Matched ${anchor.graphSubject}. We'll start from ${anchor.topicName}.`;
    }
    if (state.profile?.goalPositioningStatus === "pending") return "Learning goal saved. Matching the knowledge graph in the background.";
    if (state.profile?.goalPositioningStatus === "clarify") return "Learning goal saved. Choose a subject later if needed.";
    if (state.profile?.goalPositioningStatus === "failed") return state.profile.goalPositioningMessage ?? "Learning goal saved. Course origin needs confirmation.";
    if (state.profile?.goalStartTopicId) return "Learning goal saved.";
    if (state.profile?.goalSkippedAt) return "Learning goal skipped.";
    return "";
  }, [
    anchor,
    state.profile?.goalPositioningMessage,
    state.profile?.goalPositioningStatus,
    state.profile?.goalSkippedAt,
    state.profile?.goalStartTopicId,
  ]);

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
    setCurriculumMenuOpen(false);
    setStyle(normalizeTutorStyle(initialState.profile?.tutorStyle));
    setAnchor(null);
    setClarify(null);
    setCourseId(null);
    setError("");
  }

  function chooseEducationStage(nextStage: EducationStage) {
    const suggestion = suggestEducationCurriculum(nextStage, suggestedRegion);
    setEducationStage(nextStage);
    setCurriculumSystem(suggestion);
    setEducationContextSource(suggestion ? "confirmed_suggestion" : null);
    setCurriculumMenuOpen(!suggestion);
  }

  function chooseCurriculum(nextCurriculum: EducationCurriculum) {
    setCurriculumSystem(nextCurriculum);
    setEducationContextSource("user_selected");
    setCurriculumMenuOpen(false);
  }

  function submitFacts() {
    if (!educationStage || !curriculumSystem || !educationContextSource) {
      return Promise.reject(new Error(t.onboarding.factsStageRequired));
    }
    const text = factsIntroduction.trim();
    return submit("/api/onboarding/facts", {
      educationStage,
      curriculumSystem,
      educationContextSource,
      ...(text.length >= 2 ? { text } : {}),
    });
  }

  return (
    <div className="onboarding-screen">
      <section className="onboarding-panel" aria-live="polite">
        <div className="onboarding-form-pane">
          <header className="onboarding-topbar">
            <button type="button" className="onboarding-back" onClick={goBack} disabled={index <= 0 || busy} aria-label={t.onboarding.back}>
              ←
            </button>
            <span className="onboarding-brand">Primoria</span>
            <div className="onboarding-progress" aria-label={`Step ${Math.min(index + 1, STEP_ORDER.length)} of ${STEP_ORDER.length}`}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <span className="onboarding-count">{Math.min(index + 1, STEP_ORDER.length)}/{STEP_ORDER.length}</span>
          </header>

          {step === "goal" ? (
            <div className="onboarding-step onboarding-step-facts">
              <div className="onboarding-step-copy">
                <p className="onboarding-kicker">{t.onboarding.goalKicker}</p>
                <h1>{t.onboarding.goalTitle}</h1>
                <p className="onboarding-copy">{t.onboarding.goalCopy}</p>
              </div>
              <div className="onboarding-control-region">
                <textarea
                  value={learningGoal}
                  onChange={(event) => {
                    setLearningGoal(event.target.value);
                    if (clarify) setClarify(null);
                  }}
                  placeholder={t.onboarding.goalPlaceholder}
                  rows={4}
                  className="onboarding-goal-input"
                />
                {clarify ? (
                  <div className="onboarding-clarify">
                    <p className="onboarding-clarify-message">{clarify.message}</p>
                    <div className="onboarding-choice-list onboarding-clarify-list">
                      {clarify.candidates.map((candidate) => (
                        <button
                          key={candidate.graphId}
                          type="button"
                          disabled={busy}
                          onClick={() => run(() => submit("/api/onboarding/goal", { learningGoal, graphId: candidate.graphId }))}
                        >
                          <strong>{candidate.subject}</strong>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="onboarding-example-list" aria-label="Goal examples">
                    {t.onboarding.goalExamples.map((example) => (
                      <button key={example} type="button" onClick={() => setLearningGoal(example)}>
                        {example}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className={`onboarding-note ${goalSummary ? "" : "onboarding-note-empty"}`}>
                {goalSummary || t.onboarding.goalNote}
              </p>
              <div className="onboarding-actions">
                <button
                  type="button"
                  className="onboarding-primary"
                  disabled={busy || !learningGoal.trim()}
                  onClick={() => run(() => submit("/api/onboarding/goal", { learningGoal }))}
                >
                  {busy ? t.onboarding.locating : t.onboarding.continue}
                </button>
                <button type="button" className="onboarding-skip" disabled={busy} onClick={() => run(() => submit("/api/onboarding/goal", { skip: true }))}>
                  {t.onboarding.skipQuestion}
                </button>
              </div>
            </div>
          ) : null}

          {step === "facts" ? (
            <div className="onboarding-step">
              <div className="onboarding-step-copy">
                <p className="onboarding-kicker">{t.onboarding.factsKicker}</p>
                <h1>{t.onboarding.factsTitle}</h1>
                <p className="onboarding-copy">{t.onboarding.factsCopy}</p>
              </div>
              <div className="onboarding-control-region">
                <section className="onboarding-education-question" aria-labelledby="education-stage-question">
                  <div className="onboarding-question-heading">
                    <span className="onboarding-question-index">Q1</span>
                    <h2 id="education-stage-question">{t.onboarding.factsQ1}</h2>
                    {educationStage ? (
                      <button
                        type="button"
                        className={`onboarding-curriculum-badge ${curriculumSystem ? "selected" : "needs-selection"}`}
                        aria-expanded={curriculumMenuOpen}
                        onClick={() => setCurriculumMenuOpen((open) => !open)}
                      >
                        {curriculumSystem ? t.onboarding.curricula[curriculumSystem] : t.onboarding.chooseCurriculum}
                        <span aria-hidden="true">⌄</span>
                      </button>
                    ) : null}
                  </div>
                  <div className="onboarding-stage-options" role="radiogroup" aria-label="Current learning stage">
                    {EDUCATION_STAGES.map((stageOption) => (
                      <button
                        key={stageOption}
                        type="button"
                        role="radio"
                        aria-checked={educationStage === stageOption}
                        className={educationStage === stageOption ? "selected" : ""}
                        onClick={() => chooseEducationStage(stageOption)}
                      >
                        <span aria-hidden="true" />
                        {t.onboarding.stages[stageOption]}
                      </button>
                    ))}
                  </div>
                  {educationStage && curriculumMenuOpen ? (
                    <div className="onboarding-curriculum-menu" role="listbox" aria-label="Curriculum system">
                      {curriculumOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          role="option"
                          aria-selected={curriculumSystem === option}
                          className={curriculumSystem === option ? "selected" : ""}
                          onClick={() => chooseCurriculum(option)}
                        >
                          {t.onboarding.curricula[option]}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </section>
                <textarea
                  value={factsIntroduction}
                  maxLength={2_000}
                  onChange={(event) => setFactsIntroduction(event.target.value)}
                  placeholder={t.onboarding.factsPlaceholder}
                  rows={3}
                  className="onboarding-goal-input onboarding-facts-input"
                />
              </div>
              <div className="onboarding-actions">
                <button
                  type="button"
                  className="onboarding-primary"
                  disabled={busy || !educationStage || !curriculumSystem}
                  onClick={() => run(submitFacts)}
                >
                  {busy ? t.onboarding.saving : t.onboarding.continue}
                </button>
                <span className="onboarding-optional-note">{t.onboarding.factsOptionalNote}</span>
              </div>
            </div>
          ) : null}

          {step === "style" ? (
            <div className="onboarding-step">
              <div className="onboarding-step-copy">
                <p className="onboarding-kicker">{t.onboarding.styleKicker}</p>
                <h1>{t.onboarding.styleTitle}</h1>
                <p className="onboarding-copy">{t.onboarding.styleCopy}</p>
              </div>
              <div className="onboarding-control-region">
                <div className="onboarding-choice-list tutor-style-list">
                  {tutorStylesList.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={style === item.id ? "selected" : ""}
                      onClick={() => setStyle(item.id)}
                    >
                      <strong>{item.title}</strong>
                      <span>{item.person}</span>
                      <small>{item.meta}</small>
                    </button>
                  ))}
                </div>
              </div>
              <p className="onboarding-note onboarding-note-empty">{t.onboarding.styleNote}</p>
              <div className="onboarding-actions">
                <button
                  type="button"
                  className="onboarding-primary"
                  disabled={busy || !isTutorStyle(style)}
                  onClick={() => run(() => submit("/api/onboarding/style", { tutorStyle: style }))}
                >
                  {busy ? t.onboarding.saving : t.onboarding.finish}
                </button>
                <button type="button" className="onboarding-skip" disabled={busy} onClick={() => run(() => submit("/api/onboarding/style", { skip: true }))}>
                  {t.onboarding.skipQuestion}
                </button>
              </div>
            </div>
          ) : null}

          {step === "done" ? (
            <div className="onboarding-step onboarding-step-complete">
              <div className="onboarding-step-copy">
                <p className="onboarding-kicker">
                  {finalClarify
                    ? t.onboarding.completion.kicker.chooseSubject
                    : goalStatus === "pending"
                      ? t.onboarding.completion.kicker.preparingPath
                      : factsWaiting
                        ? t.onboarding.completion.kicker.personalizing
                      : courseFailed
                        ? t.onboarding.completion.kicker.courseFailed
                        : courseWaiting
                          ? t.onboarding.completion.kicker.preparingCourse
                          : t.onboarding.completion.kicker.complete}
                </p>
                <h1>
                  {finalClarify
                    ? t.onboarding.completion.h1.chooseSubject
                    : goalStatus === "pending"
                      ? t.onboarding.completion.h1.preparingPath
                      : factsWaiting
                        ? t.onboarding.completion.h1.personalizing
                      : courseFailed
                        ? t.onboarding.completion.h1.courseFailed
                        : courseWaiting
                          ? t.onboarding.completion.h1.preparingCourse
                          : t.onboarding.completion.h1.complete}
                </h1>
                <p className="onboarding-copy">
                  {finalClarify
                    ? finalClarify.message
                    : goalStatus === "pending"
                      ? "Primoria is matching your goal in the background. You can enter the workspace while it finishes."
                      : factsWaiting
                        ? "Primoria is organizing your introduction first. You can enter the workspace while it finishes."
                      : courseFailed
                        ? (state.profile?.onboardingCourseMessage ?? "We couldn't prepare your course right now. Please retry.")
                        : courseWaiting
                          ? "Primoria is building your course outline. This page will update when it is ready."
                      : goalStatus === "failed"
                        ? "We saved your goal, but the course origin still needs confirmation."
                        : courseReady
                          ? "The course outline can now open from your learning space."
                          : "Your onboarding preferences have been saved."}
                </p>
              </div>
              <div className="onboarding-control-region onboarding-complete-region">
                {finalClarify ? (
                  <div className="onboarding-choice-list onboarding-clarify-list">
                    {finalClarify.candidates.map((candidate) => (
                      <button
                        key={candidate.graphId}
                        type="button"
                        disabled={busy}
                        onClick={() => run(() => submit("/api/onboarding/goal", { learningGoal: savedLearningGoal, graphId: candidate.graphId }))}
                      >
                        <strong>{candidate.subject}</strong>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <p className="onboarding-note">
                {finalClarify
                  ? "Pick one subject to generate the course outline from a stable graph anchor."
                  : courseReady
                    ? "The next screen will open the generated course outline."
                    : goalStatus === "pending"
                      ? "Course preparation will continue in the background."
                      : factsWaiting
                        ? "Course preparation starts automatically when personalization finishes."
                      : courseFailed
                        ? "Retry keeps your learning goal and starts course preparation again."
                        : courseWaiting
                          ? "Course preparation is still running in the background."
                      : goalStatus === "failed"
                        ? (state.profile?.goalPositioningMessage ?? "You can continue and confirm the course starting point later.")
                        : "No course was created because the learning goal was skipped."}
              </p>
              <div className="onboarding-actions">
                {finalClarify ? null : factsWaiting ? (
                  <button type="button" className="onboarding-primary" disabled>
                    Preparing profile…
                  </button>
                ) : courseFailed || courseStatus === "pending" ? (
                  <button
                    type="button"
                    className="onboarding-primary"
                    disabled={busy}
                    onClick={() => run(() => submit("/api/onboarding/course", {}))}
                  >
                    {busy ? "Preparing course…" : courseFailed ? "Retry course preparation" : "Prepare course"}
                  </button>
                ) : courseStatus === "building" ? (
                  <button type="button" className="onboarding-primary" disabled>
                    Preparing course…
                  </button>
                ) : (
                  <Link className="onboarding-primary" href={completionHref}>
                    {completionLabel}
                  </Link>
                )}
                {courseWaiting ? <Link className="onboarding-skip" href="/">Enter workspace while this continues</Link> : null}
                {debugMode ? (
                  <button type="button" className="onboarding-skip" onClick={resetPreview}>
                    Restart preview
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {error ? <p className="onboarding-error">{error}</p> : null}
        </div>

        <aside className="onboarding-visual-pane" aria-hidden="true">
          <div className="onboarding-visual-copy">
            <span>{visual.mark}</span>
            <strong>
              {step === "done" && courseFailed
                ? "Course preparation paused"
                : step === "done" && courseWaiting
                  ? "Building the outline"
                  : visual.title}
            </strong>
            <p>
              {step === "done" && courseFailed
                ? "Your goal is safe. Retry when you are ready to prepare the course again."
                : step === "done" && courseWaiting
                  ? "Primoria is turning your goal into a course outline."
                  : visual.body}
            </p>
          </div>
          <Image
            className="onboarding-visual-image"
            src={visualImage.src}
            alt=""
            width={visualImage.width}
            height={visualImage.height}
            sizes="(max-width: 900px) 210px, 430px"
            priority
            unoptimized
          />
        </aside>
      </section>
    </div>
  );
}
