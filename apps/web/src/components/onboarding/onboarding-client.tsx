"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  isTutorStyle,
  type GoalPositioningCandidate,
  type LearnerOnboardingState,
  type OnboardingStep,
  type TutorStyle,
} from "@/lib/learner-profile/types";

type GoalAnchorSummary = {
  graphSubject: string;
  topicName: string;
  branch: "specific" | "subject_start" | "directed" | "generated";
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

const GOAL_EXAMPLES = [
  "I want to learn data structures and algorithms",
  "我想弄懂链式法则",
  "Teach me Python from the beginning",
];

const FACTS_EXAMPLES = [
  "I study computer science and have taken CS61A and CS61B",
  "我对算法和大模型架构感兴趣",
  "I learn best from concrete examples before formal definitions",
];

const TUTOR_STYLES: Array<{
  id: TutorStyle;
  title: string;
  person: string;
  meta: string;
  imageSrc: string;
}> = [
  {
    id: "socratic",
    title: "Socratic",
    person: "Socrates",
    meta: "Guiding questions before answers",
    imageSrc: "/onboarding/tutors/socratic.webp",
  },
  {
    id: "feynman",
    title: "Feynman",
    person: "Richard Feynman",
    meta: "Intuition and analogies first",
    imageSrc: "/onboarding/tutors/feynman.webp",
  },
  {
    id: "euclid",
    title: "Euclid",
    person: "Euclid",
    meta: "Precise definitions and structure",
    imageSrc: "/onboarding/tutors/euclid.webp",
  },
];

const STEP_VISUALS: Record<OnboardingStep, OnboardingVisual> = {
  goal: {
    src: "/onboarding/goal-map.svg",
    title: "Locate the first anchor",
    body: "A broad goal starts at the subject root; a precise goal starts at the matched topic.",
    mark: "01",
    width: 720,
    height: 840,
  },
  facts: {
    src: "/onboarding/background-layers.svg",
    title: "Build your starting context",
    body: "Share what you have studied, what interests you, and how you like to learn.",
    mark: "02",
    width: 720,
    height: 840,
  },
  style: {
    src: "/onboarding/tutor-atelier.svg",
    title: "Choose the tutor voice",
    body: "This shapes dialogue only. Lesson generation keeps its own structure.",
    mark: "03",
    width: 720,
    height: 840,
  },
  done: {
    src: "/onboarding/course-ready.svg",
    title: "Open the outline",
    body: "The course path is ready to continue in your learning space.",
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
    return {
      profile: {
        ...profile,
        factsIntakeStatus: body.skip ? "skipped" : "completed",
        factsIntakeJobId: body.skip ? null : "debug-intake-job",
        factsIntakeMessage: null,
        factsIntakeUpdatedAt: now,
        knowledgeBackground: null,
        knowledgeBackgroundSkippedAt: body.skip ? now : null,
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

export function OnboardingClient({ initialState, debugMode = false }: OnboardingClientProps) {
  const [state, setState] = useState<LearnerOnboardingState>(initialState);
  const [learningGoal, setLearningGoal] = useState(initialState.profile?.learningGoal ?? "");
  const [factsIntroduction, setFactsIntroduction] = useState("");
  const [style, setStyle] = useState<TutorStyle>(() => normalizeTutorStyle(initialState.profile?.tutorStyle));
  const [anchor, setAnchor] = useState<GoalAnchorSummary | null>(null);
  const [clarify, setClarify] = useState<GoalClarify | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const step = state.nextStep;
  const index = stepIndex(step);
  const progress = Math.min(100, ((index + 1) / STEP_ORDER.length) * 100);
  const visual = STEP_VISUALS[step];
  const selectedTutorStyle = TUTOR_STYLES.find((item) => item.id === style) ?? TUTOR_STYLES[1];
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
  const completionLabel = courseReady ? "Open course outline" : "Enter workspace";
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
    const images = TUTOR_STYLES.map(({ imageSrc }) => {
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
    setStyle(normalizeTutorStyle(initialState.profile?.tutorStyle));
    setAnchor(null);
    setClarify(null);
    setCourseId(null);
    setError("");
  }

  return (
    <div className="onboarding-screen">
      <section className="onboarding-panel" aria-live="polite">
        <div className="onboarding-form-pane">
          <header className="onboarding-topbar">
            <button type="button" className="onboarding-back" onClick={goBack} disabled={index <= 0 || busy} aria-label="Back">
              ←
            </button>
            <span className="onboarding-brand">Primoria</span>
            <div className="onboarding-progress" aria-label={`Step ${Math.min(index + 1, STEP_ORDER.length)} of ${STEP_ORDER.length}`}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <span className="onboarding-count">{Math.min(index + 1, STEP_ORDER.length)}/{STEP_ORDER.length}</span>
          </header>

          {step === "goal" ? (
            <div className="onboarding-step">
              <div className="onboarding-step-copy">
                <p className="onboarding-kicker">Learning goal</p>
                <h1>Name the first thing you want to learn.</h1>
                <p className="onboarding-copy">Use a broad subject or a specific topic. Primoria will place it on the knowledge graph.</p>
              </div>
              <div className="onboarding-control-region">
                <textarea
                  value={learningGoal}
                  onChange={(event) => {
                    setLearningGoal(event.target.value);
                    if (clarify) setClarify(null);
                  }}
                  placeholder="e.g. I want to learn data structures and algorithms"
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
                    {GOAL_EXAMPLES.map((example) => (
                      <button key={example} type="button" onClick={() => setLearningGoal(example)}>
                        {example}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className={`onboarding-note ${goalSummary ? "" : "onboarding-note-empty"}`}>
                {goalSummary || "Learning goal will be matched to the knowledge graph."}
              </p>
              <div className="onboarding-actions">
                <button
                  type="button"
                  className="onboarding-primary"
                  disabled={busy || !learningGoal.trim()}
                  onClick={() => run(() => submit("/api/onboarding/goal", { learningGoal }))}
                >
                  {busy ? "Locating…" : "Continue"}
                </button>
                <button type="button" className="onboarding-skip" disabled={busy} onClick={() => run(() => submit("/api/onboarding/goal", { skip: true }))}>
                  Skip this question
                </button>
              </div>
            </div>
          ) : null}

          {step === "facts" ? (
            <div className="onboarding-step">
              <div className="onboarding-step-copy">
                <p className="onboarding-kicker">About your learning</p>
                <h1>Tell Primoria what you already bring.</h1>
                <p className="onboarding-copy">Share your studies, interests, goals, or learning preferences in your own words.</p>
              </div>
              <div className="onboarding-control-region">
                <textarea
                  value={factsIntroduction}
                  maxLength={2_000}
                  onChange={(event) => setFactsIntroduction(event.target.value)}
                  placeholder="e.g. I study at JCU, I am interested in algorithms and LLM architecture, and I have taken CS61A and CS61B"
                  rows={5}
                  className="onboarding-goal-input onboarding-facts-input"
                />
                <div className="onboarding-example-list" aria-label="Introduction examples">
                  {FACTS_EXAMPLES.map((example) => (
                    <button key={example} type="button" onClick={() => setFactsIntroduction(example)}>
                      {example}
                    </button>
                  ))}
                </div>
              </div>
              <p className="onboarding-note onboarding-note-empty">Continue immediately; Primoria will organize useful facts in the background.</p>
              <div className="onboarding-actions">
                <button
                  type="button"
                  className="onboarding-primary"
                  disabled={busy || factsIntroduction.trim().length < 2}
                  onClick={() => run(() => submit("/api/onboarding/facts", { text: factsIntroduction }))}
                >
                  {busy ? "Saving…" : "Continue"}
                </button>
                <button type="button" className="onboarding-skip" disabled={busy} onClick={() => run(() => submit("/api/onboarding/facts", { skip: true }))}>
                  Skip this question
                </button>
              </div>
            </div>
          ) : null}

          {step === "style" ? (
            <div className="onboarding-step">
              <div className="onboarding-step-copy">
                <p className="onboarding-kicker">Tutor style</p>
                <h1>Choose how the tutor should think with you.</h1>
                <p className="onboarding-copy">This preference applies to chat, not to the course outline or lesson content.</p>
              </div>
              <div className="onboarding-control-region">
                <div className="onboarding-choice-list tutor-style-list">
                  {TUTOR_STYLES.map((item) => (
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
              <p className="onboarding-note onboarding-note-empty">Tutor style affects dialogue only.</p>
              <div className="onboarding-actions">
                <button
                  type="button"
                  className="onboarding-primary"
                  disabled={busy || !isTutorStyle(style)}
                  onClick={() => run(() => submit("/api/onboarding/style", { tutorStyle: style }))}
                >
                  {busy ? "Saving…" : "Finish"}
                </button>
                <button type="button" className="onboarding-skip" disabled={busy} onClick={() => run(() => submit("/api/onboarding/style", { skip: true }))}>
                  Skip this question
                </button>
              </div>
            </div>
          ) : null}

          {step === "done" ? (
            <div className="onboarding-step onboarding-step-complete">
              <div className="onboarding-step-copy">
                <p className="onboarding-kicker">
                  {finalClarify
                    ? "Choose a subject"
                    : goalStatus === "pending"
                      ? "Preparing path"
                      : factsWaiting
                        ? "Personalizing"
                      : courseFailed
                        ? "Course preparation failed"
                        : courseWaiting
                          ? "Preparing course"
                          : "Onboarding complete"}
                </p>
                <h1>
                  {finalClarify
                    ? "Which subject should Primoria start from?"
                    : goalStatus === "pending"
                      ? "Your learning path is being prepared."
                      : factsWaiting
                        ? "Your course will be prepared in the background."
                      : courseFailed
                        ? "We couldn't prepare your course."
                        : courseWaiting
                          ? "Your course is being prepared."
                      : goalStatus === "failed"
                        ? "Your workspace is ready."
                        : courseReady
                          ? "Your learning path is ready."
                          : "Your workspace is ready."}
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
