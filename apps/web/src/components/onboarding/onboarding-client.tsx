"use client";

import { useEffect, useMemo, useState } from "react";

import type { LearnerOnboardingState, KnowledgeBackground, OnboardingStep, TutorStyle } from "@/lib/learner-profile/types";

type GoalAnchorSummary = {
  graphSubject: string;
  topicName: string;
  branch: "specific" | "subject_start";
};

type OnboardingApiResponse = LearnerOnboardingState & {
  anchor?: GoalAnchorSummary;
  course?: { courseId: string | null; lessonId: string | null };
  courseId?: string | null;
  error?: string;
};

type OnboardingClientProps = {
  initialState: LearnerOnboardingState;
  debugMode?: boolean;
};

const STEP_ORDER: OnboardingStep[] = ["goal", "background", "style"];

const GOAL_EXAMPLES = [
  "I want to learn data structures and algorithms",
  "我想弄懂链式法则",
  "Teach me Python from the beginning",
];

const BACKGROUNDS: Array<{
  id: KnowledgeBackground;
  title: string;
  meta: string;
}> = [
  { id: "high_school", title: "High school", meta: "高中" },
  { id: "undergraduate", title: "University", meta: "大学" },
  { id: "graduate", title: "Graduate", meta: "研究生" },
];

const TUTOR_STYLES: Array<{
  id: TutorStyle;
  title: string;
  person: string;
  meta: string;
}> = [
  { id: "socratic", title: "Socratic", person: "Socrates", meta: "Guiding questions before answers" },
  { id: "feynman", title: "Feynman", person: "Richard Feynman", meta: "Intuition and analogies first" },
  { id: "euclid", title: "Euclid", person: "Euclid", meta: "Precise definitions and structure" },
];

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
    goalSkippedAt: null,
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
        nextStep: "background",
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
        updatedAt: now,
      },
      nextStep: "background",
      complete: false,
      anchor: {
        graphSubject: "Data Structures and Algorithms",
        topicName: "Arrays and Strings",
        branch: "subject_start",
      },
    };
  }

  if (path.endsWith("/background")) {
    return {
      profile: {
        ...profile,
        knowledgeBackground: body.skip ? null : (body.knowledgeBackground as KnowledgeBackground),
        knowledgeBackgroundSkippedAt: body.skip ? now : null,
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
      tutorStyle: body.skip ? null : (body.tutorStyle as TutorStyle),
      tutorStyleSkippedAt: body.skip ? now : null,
      onboardingCompletedAt: now,
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
  const [background, setBackground] = useState<KnowledgeBackground | "">(
    initialState.profile?.knowledgeBackground ?? "",
  );
  const [style, setStyle] = useState<TutorStyle | "">(initialState.profile?.tutorStyle ?? "feynman");
  const [anchor, setAnchor] = useState<GoalAnchorSummary | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const step = state.nextStep;
  const index = stepIndex(step);
  const progress = Math.min(100, ((index + 1) / STEP_ORDER.length) * 100);

  useEffect(() => {
    if (!state.complete || debugMode) return;
    window.location.assign(courseId ? `/course/${encodeURIComponent(courseId)}/outline` : "/");
  }, [courseId, debugMode, state.complete]);

  const goalSummary = useMemo(() => {
    if (anchor) {
      return anchor.branch === "subject_start"
        ? `Matched ${anchor.graphSubject}. We'll start from ${anchor.topicName}.`
        : `Matched ${anchor.topicName} in ${anchor.graphSubject}.`;
    }
    if (state.profile?.goalStartTopicId) return "Learning goal saved.";
    if (state.profile?.goalSkippedAt) return "Learning goal skipped.";
    return "";
  }, [anchor, state.profile?.goalSkippedAt, state.profile?.goalStartTopicId]);

  function applyResponse(data: OnboardingApiResponse) {
    setState({ profile: data.profile ?? null, nextStep: data.nextStep, complete: data.complete });
    if (data.anchor) setAnchor(data.anchor);
    const nextCourseId = data.course?.courseId ?? data.courseId ?? null;
    if (nextCourseId) setCourseId(nextCourseId);
  }

  async function run(action: () => Promise<OnboardingApiResponse>) {
    setBusy(true);
    setError("");
    try {
      applyResponse(await action());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
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
    setBackground(initialState.profile?.knowledgeBackground ?? "");
    setStyle(initialState.profile?.tutorStyle ?? "feynman");
    setAnchor(null);
    setCourseId(null);
    setError("");
  }

  return (
    <div className="onboarding-screen">
      <section className="onboarding-panel" aria-live="polite">
        <header className="onboarding-topbar">
          <button type="button" className="onboarding-back" onClick={goBack} disabled={index <= 0 || busy} aria-label="Back">
            ←
          </button>
          <div className="onboarding-progress" aria-label={`Step ${index + 1} of ${STEP_ORDER.length}`}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <span className="onboarding-count">{index + 1}/{STEP_ORDER.length}</span>
        </header>

        {step === "goal" ? (
          <div className="onboarding-step">
            <p className="onboarding-kicker">Learning goal</p>
            <h1>What do you want to learn first?</h1>
            <textarea
              value={learningGoal}
              onChange={(event) => setLearningGoal(event.target.value)}
              placeholder="e.g. I want to learn data structures and algorithms"
              rows={4}
              className="onboarding-goal-input"
            />
            <div className="onboarding-example-list" aria-label="Goal examples">
              {GOAL_EXAMPLES.map((example) => (
                <button key={example} type="button" onClick={() => setLearningGoal(example)}>
                  {example}
                </button>
              ))}
            </div>
            {goalSummary ? <p className="onboarding-note">{goalSummary}</p> : null}
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

        {step === "background" ? (
          <div className="onboarding-step">
            <p className="onboarding-kicker">Knowledge background</p>
            <h1>Where should the first lesson meet you?</h1>
            <div className="onboarding-choice-list">
              {BACKGROUNDS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={background === item.id ? "selected" : ""}
                  onClick={() => setBackground(item.id)}
                >
                  <strong>{item.title}</strong>
                  <span>{item.meta}</span>
                </button>
              ))}
            </div>
            <div className="onboarding-actions">
              <button
                type="button"
                className="onboarding-primary"
                disabled={busy || !background}
                onClick={() => run(() => submit("/api/onboarding/background", { knowledgeBackground: background }))}
              >
                {busy ? "Preparing course…" : "Continue"}
              </button>
              <button type="button" className="onboarding-skip" disabled={busy} onClick={() => run(() => submit("/api/onboarding/background", { skip: true }))}>
                Skip this question
              </button>
            </div>
          </div>
        ) : null}

        {step === "style" ? (
          <div className="onboarding-step">
            <p className="onboarding-kicker">Tutor style</p>
            <h1>Pick one voice for your AI tutor.</h1>
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
            <div className="onboarding-actions">
              <button
                type="button"
                className="onboarding-primary"
                disabled={busy || !style}
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
          <div className="onboarding-step">
            <p className="onboarding-kicker">Onboarding complete</p>
            <h1>Your learning path is ready.</h1>
            <p className="onboarding-note">
              {courseId ? "The next screen will open the generated course outline." : "No course was created because the learning goal was skipped."}
            </p>
            {debugMode ? (
              <div className="onboarding-actions">
                <button type="button" className="onboarding-primary" onClick={resetPreview}>
                  Restart preview
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="onboarding-error">{error}</p> : null}
      </section>
    </div>
  );
}
