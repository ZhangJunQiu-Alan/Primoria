"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  isTutorStyle,
  type KnowledgeBackground,
  type LearnerOnboardingState,
  type OnboardingStep,
  type TutorStyle,
} from "@/lib/learner-profile/types";

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

type OnboardingVisual = {
  src: string;
  title: string;
  body: string;
  mark: string;
  width: number;
  height: number;
};

const STEP_ORDER: OnboardingStep[] = ["goal", "background", "style"];
const DEFAULT_TUTOR_STYLE: TutorStyle = "feynman";

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
  background: {
    src: "/onboarding/background-layers.svg",
    title: "Set the starting depth",
    body: "The first lesson adjusts its pace before any course content is written.",
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
    body: "The course path is ready to continue in the workspace.",
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
      tutorStyle: body.skip ? null : normalizeTutorStyle(body.tutorStyle),
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
  const [style, setStyle] = useState<TutorStyle>(() => normalizeTutorStyle(initialState.profile?.tutorStyle));
  const [anchor, setAnchor] = useState<GoalAnchorSummary | null>(null);
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
  const completionHref = courseId ? `/course/${encodeURIComponent(courseId)}/outline` : "/";
  const completionLabel = courseId ? "Open course outline" : "Enter homepage";

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
    setStyle(normalizeTutorStyle(initialState.profile?.tutorStyle));
    setAnchor(null);
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
            <div className="onboarding-progress" aria-label={`Step ${index + 1} of ${STEP_ORDER.length}`}>
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

          {step === "background" ? (
            <div className="onboarding-step">
              <div className="onboarding-step-copy">
                <p className="onboarding-kicker">Knowledge background</p>
                <h1>Set the level of the first explanation.</h1>
                <p className="onboarding-copy">This changes the pace and prerequisite assumptions of the generated course.</p>
              </div>
              <div className="onboarding-control-region">
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
              </div>
              <p className="onboarding-note onboarding-note-empty">Background controls the generated lesson depth.</p>
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
                <p className="onboarding-kicker">Onboarding complete</p>
                <h1>Your learning path is ready.</h1>
                <p className="onboarding-copy">The course outline can now open from the workspace.</p>
              </div>
              <div className="onboarding-control-region onboarding-complete-region" />
              <p className="onboarding-note">
                {courseId ? "The next screen will open the generated course outline." : "No course was created because the learning goal was skipped."}
              </p>
              <div className="onboarding-actions">
                <Link className="onboarding-primary" href={completionHref}>
                  {completionLabel}
                </Link>
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
            <strong>{visual.title}</strong>
            <p>{visual.body}</p>
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
