"use client";

import { CourseInlineMarkdown, CourseMarkdown } from "@/components/course/course-markdown";

import { useRef, useState } from "react";
import { msg, useI18n } from "@/lib/i18n/client";
import type { FolderQuizOutcome, FolderQuizStart } from "@/lib/materials/folder-quiz";

type Phase =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "answering"; quiz: FolderQuizStart }
  | { kind: "submitted"; quiz: FolderQuizStart; outcome: FolderQuizOutcome };

type StartResponse = { quiz?: FolderQuizStart; error?: string; code?: string };
type SubmitResponse = { outcome?: FolderQuizOutcome; error?: string; code?: string };

// Weakness-weighted multiple-choice quiz over a subject folder's whole KG
// (docs/product/subject-folders.md §4.5). Grading and mastery are server-side.
export function FolderQuiz({ folderId, ready, onFinished }: { folderId: string; ready: boolean; onFinished: () => void }) {
  const { dictionary } = useI18n();
  const t = dictionary.folderQuiz;
  const status = dictionary.course.conceptStatus;
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submission = useRef<{ id: string; fingerprint: string } | null>(null);

  async function start(size: 10 | 20) {
    setPhase({ kind: "starting" });
    setSelections({});
    setError(null);
    submission.current = null;
    try {
      const res = await fetch(`/api/folders/${encodeURIComponent(folderId)}/quizzes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size }),
      });
      const body = (await res.json().catch(() => ({}))) as StartResponse;
      if (!res.ok || !body.quiz) throw new Error(body.code ?? "start failed");
      setPhase({ kind: "answering", quiz: body.quiz });
    } catch {
      setPhase({ kind: "idle" });
      setError(t.startFailed);
    }
  }

  async function submit(quiz: FolderQuizStart) {
    if (saving) return;
    const answers = quiz.questions
      .filter((question) => selections[question.questionId])
      .map((question) => ({ questionId: question.questionId, selectedId: selections[question.questionId] }));
    const fingerprint = JSON.stringify(answers);
    // A retry of the same answers reuses its submission id, so the server
    // replays instead of grading twice.
    if (submission.current?.fingerprint !== fingerprint) submission.current = { id: crypto.randomUUID(), fingerprint };
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/folders/${encodeURIComponent(folderId)}/quizzes/${encodeURIComponent(quiz.sessionId)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: submission.current.id, answers }),
      });
      const body = (await res.json().catch(() => ({}))) as SubmitResponse;
      if (!res.ok || !body.outcome) throw new Error(body.code ?? "submit failed");
      setPhase({ kind: "submitted", quiz, outcome: body.outcome });
      onFinished();
    } catch {
      setError(t.submitFailed);
    } finally {
      setSaving(false);
    }
  }

  const startButtons = (
    <div className="folder-quiz-start">
      <button type="button" className="library-create-course" disabled={!ready} onClick={() => void start(10)}>{t.start10}</button>
      <button type="button" className="materials-delete" disabled={!ready} onClick={() => void start(20)}>{t.start20}</button>
    </div>
  );

  return (
    <section className="materials-list-card folder-quiz" aria-label={t.title}>
      <header className="materials-list-header">
        <span>{t.title}</span>
        {phase.kind === "answering" ? (
          <span>{msg(t.progress, { answered: Object.keys(selections).length, total: phase.quiz.questions.length })}</span>
        ) : null}
        {phase.kind === "submitted" ? <span>{msg(t.score, { score: phase.outcome.score, total: phase.outcome.total })}</span> : null}
      </header>

      {phase.kind === "idle" ? (
        <div className="folder-quiz-body">
          <p className="folder-graph-empty">{ready ? t.intro : t.needsGraph}</p>
          {startButtons}
        </div>
      ) : null}
      {phase.kind === "starting" ? <p className="folder-graph-empty" role="status">{t.starting}</p> : null}

      {phase.kind === "answering" || phase.kind === "submitted" ? (
        <div className="folder-quiz-body">
          {phase.quiz.questions.length < phase.quiz.size ? (
            <p className="folder-quiz-note">{msg(t.short, { count: phase.quiz.questions.length })}</p>
          ) : null}
          <ol className="course-quiz folder-quiz-questions">
            {phase.quiz.questions.map((question, index) => {
              const result = phase.kind === "submitted" ? phase.outcome.results.find((entry) => entry.questionId === question.questionId) : undefined;
              const selected = selections[question.questionId];
              return (
                <li
                  key={question.questionId}
                  className={`course-quiz-question ${result ? (result.correct ? "is-correct" : "is-wrong") : ""}`}
                >
                  <div className="course-quiz-q-header">
                    <span className="course-quiz-q-index">{index + 1}</span>
                    <span className="course-quiz-q-kind">{[question.lectureTitle, question.conceptName].filter(Boolean).join(" · ")}</span>
                    {result ? (
                      <span className={`course-quiz-q-result ${result.correct ? "correct" : "wrong"}`}>
                        {result.correct ? `✓ ${t.correct}` : result.selectedId ? `✗ ${t.wrong}` : t.unanswered}
                      </span>
                    ) : null}
                  </div>
                  <p className="course-quiz-q-text"><CourseInlineMarkdown markdown={question.question} /></p>
                  <div className="course-quiz-choices" role="radiogroup" aria-label={question.question}>
                    {question.choices.map((choice) => {
                      const isSelected = selected === choice.id;
                      const isCorrectChoice = result && choice.id === result.correctId;
                      const isWrongSelection = result && isSelected && choice.id !== result.correctId;
                      return (
                        <button
                          key={choice.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          disabled={Boolean(result) || saving}
                          className={`course-quiz-choice ${isSelected ? "selected" : ""} ${isCorrectChoice ? "correct" : ""} ${isWrongSelection ? "wrong" : ""}`}
                          onClick={() => setSelections((current) => ({ ...current, [question.questionId]: choice.id }))}
                        >
                          <CourseInlineMarkdown markdown={choice.text} />
                        </button>
                      );
                    })}
                  </div>
                  {result ? (
                    <div className="course-quiz-explanation">
                      {result.explanation ? <CourseMarkdown markdown={result.explanation} /> : null}
                      {result.sources.length ? (
                        <small>
                          {t.source}: {result.sources.map((source) => [source.title, source.locator].filter(Boolean).join(" · ")).join("；")}
                        </small>
                      ) : null}
                      {!result.firstAttempt && result.selectedId ? <small>{t.repeat}</small> : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>

          {phase.kind === "answering" ? (
            <div className="materials-actions">
              <button
                type="button"
                className="library-create-course"
                disabled={saving || Object.keys(selections).length < phase.quiz.questions.length}
                onClick={() => void submit(phase.quiz)}
              >
                {saving ? t.submitting : t.submit}
              </button>
              <button type="button" className="materials-delete" disabled={saving} onClick={() => setPhase({ kind: "idle" })}>{t.close}</button>
            </div>
          ) : null}

          {phase.kind === "submitted" ? (
            <div className="folder-quiz-summary" role="status">
              <strong>{t.masteryTitle}</strong>
              {phase.outcome.masteryChanges.length === 0 ? (
                <p>{t.masteryNone}</p>
              ) : (
                <ul>
                  {phase.outcome.masteryChanges.map((change) => (
                    <li key={change.conceptId} className={`folder-graph-concept concept-${change.to}`}>
                      <span className="course-lesson-concept-dot" aria-hidden="true" />
                      {change.conceptName}: {status[change.from]} → {status[change.to]}
                    </li>
                  ))}
                </ul>
              )}
              {startButtons}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="folder-quiz-error" role="alert">{error}</p> : null}
    </section>
  );
}
