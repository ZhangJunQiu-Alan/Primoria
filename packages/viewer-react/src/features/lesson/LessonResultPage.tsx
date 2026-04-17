import { Link, useLocation } from 'react-router-dom';
import { PageContainer } from '@/shared/layout/PageContainer';
import { SurfaceCard } from '@/shared/layout/SurfaceCard';
import type { LessonWrongReviewItem, QuestionReview } from '@/shared/lesson/questionFlow';
import { useProductLanguage } from '@/shared/i18n/useProductLanguage';
import { useViewerCopy } from '@/shared/theme/copy';

type ResultState = {
  lessonTitle?: string;
  xpAwarded?: number;
  correctCount?: number;
  totalCount?: number;
  pageCount?: number;
  unlockedAchievements?: Array<{ id: string; name: string }>;
  courseCompleted?: boolean;
  wrongReviewItems?: LessonWrongReviewItem[];
};

export function LessonResultPage() {
  const location = useLocation();
  const language = useProductLanguage();
  const copy = useViewerCopy();
  const state = (location.state ?? {}) as ResultState;
  const wrongReviewItems = state.wrongReviewItems ?? [];

  return (
    <PageContainer title={copy.result.title} subtitle={`${copy.result.finishedPrefix}${state.lessonTitle ?? copy.lesson.titleFallback}`}>
      <div className="grid gap-4 md:grid-cols-3">
        <SurfaceCard className="bg-[linear-gradient(180deg,rgba(255,252,247,0.94)_0%,rgba(247,242,231,0.9)_100%)]">
          <p className="viewer-botanical-eyebrow text-[0.72rem]">{copy.result.xpAwarded}</p>
          <p className="mt-3 text-4xl font-semibold text-[var(--viewer-text)]">{state.xpAwarded ?? 0}</p>
        </SurfaceCard>
        <SurfaceCard className="bg-[linear-gradient(180deg,rgba(255,252,247,0.94)_0%,rgba(238,245,236,0.88)_100%)]">
          <p className="viewer-botanical-eyebrow text-[0.72rem]">{copy.result.correctAnswers}</p>
          <p className="mt-3 text-4xl font-semibold text-[var(--viewer-text)]">
            {state.correctCount ?? 0}/{state.totalCount ?? 0}
          </p>
        </SurfaceCard>
        <SurfaceCard className="bg-[linear-gradient(180deg,rgba(255,252,247,0.94)_0%,rgba(244,235,223,0.9)_100%)]">
          <p className="viewer-botanical-eyebrow text-[0.72rem]">{copy.result.pagesCompleted}</p>
          <p className="mt-3 text-4xl font-semibold text-[var(--viewer-text)]">{state.pageCount ?? 0}</p>
        </SurfaceCard>
      </div>

      {state.unlockedAchievements?.length ? (
        <SurfaceCard className="space-y-3">
          <p className="viewer-botanical-eyebrow text-[0.72rem]">{copy.result.unlockedAchievements}</p>
          {state.unlockedAchievements.map((achievement) => (
            <div key={achievement.id} className="rounded-[20px] border border-[#dfd3c4] bg-[rgba(255,252,247,0.88)] px-4 py-3 text-sm font-semibold text-[var(--viewer-text)]">
              {achievement.name}
            </div>
          ))}
        </SurfaceCard>
      ) : null}

      {state.courseCompleted ? (
        <SurfaceCard className="bg-[rgba(255,252,247,0.88)]">
          <p className="text-sm font-semibold text-[var(--viewer-text)]">{copy.result.courseCompleted}</p>
        </SurfaceCard>
      ) : null}

      {wrongReviewItems.length ? (
        <SurfaceCard className="space-y-4 bg-[linear-gradient(180deg,rgba(255,252,247,0.96)_0%,rgba(250,244,238,0.92)_100%)]">
          <div className="space-y-1">
            <p className="viewer-botanical-eyebrow text-[0.72rem]">{copy.result.wrongReviewTitle}</p>
            <h2
              className="text-[2rem] font-semibold tracking-[-0.04em] text-[#3d342a]"
              style={{ fontFamily: '"Cormorant Garamond", serif' }}
            >
              {copy.result.wrongReviewTitle}
            </h2>
          </div>

          <div className="space-y-4">
            {wrongReviewItems.map((item) => (
              <article
                key={item.blockId}
                className="space-y-4 rounded-[24px] border border-[#e5d8ca] bg-[rgba(255,252,247,0.9)] px-5 py-5 shadow-[0_12px_24px_rgba(90,70,50,0.06)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <span className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
                      {language === 'zh-CN' ? '还不正确' : 'Not correct yet'}
                    </span>
                    <h3 className="text-lg font-semibold leading-7 text-[var(--viewer-text)]">
                      {resolveReviewPrompt(item.review, copy.result.matchingPromptFallback)}
                    </h3>
                  </div>
                </div>

                {item.review.kind === 'matching' ? (
                  <MatchingWrongReviewCard review={item.review} correctMatchLabel={copy.result.correctMatch} language={language} />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    <ReviewAnswerPanel
                      label={copy.result.yourAnswer}
                      tone="rose"
                      value={formatReviewAnswer(item.review, 'selected', language)}
                    />
                    <ReviewAnswerPanel
                      label={copy.result.correctAnswer}
                      tone="emerald"
                      value={formatReviewAnswer(item.review, 'correct', language)}
                    />
                  </div>
                )}

                {item.review.explanation ? (
                  <div className="rounded-[20px] border border-[#dfd3c4] bg-[rgba(255,250,245,0.86)] px-4 py-4">
                    <p className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[var(--viewer-text-muted)]">
                      {copy.result.explanation}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--viewer-text-muted)]">{item.review.explanation}</p>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </SurfaceCard>
      ) : null}

      <SurfaceCard className="flex flex-wrap gap-3">
        <Link
          to="/home"
          className="viewer-botanical-button viewer-botanical-button--primary"
        >
          {copy.result.primary}
        </Link>
        <Link
          to="/library"
          className="viewer-botanical-button viewer-botanical-button--secondary"
        >
          {copy.result.secondary}
        </Link>
      </SurfaceCard>
    </PageContainer>
  );
}

function resolveReviewPrompt(review: QuestionReview, matchingFallback: string) {
  const prompt = review.prompt.trim();
  if (prompt) {
    return prompt;
  }

  if (review.kind === 'matching') {
    return matchingFallback;
  }

  return '';
}

function formatReviewAnswer(
  review: QuestionReview,
  variant: 'selected' | 'correct',
  language: 'zh-CN' | 'en',
) {
  switch (review.kind) {
    case 'multiple-choice': {
      const values = variant === 'selected' ? review.selectedOptionTexts : review.correctOptionTexts;
      return values.length ? values.join(' | ') : language === 'zh-CN' ? '未作答' : 'No answer';
    }
    case 'true-false': {
      const value = variant === 'selected' ? review.selectedValue : review.correctValue;
      if (value === null) {
        return language === 'zh-CN' ? '未作答' : 'No answer';
      }
      if (language === 'zh-CN') {
        return value ? '正确' : '错误';
      }
      return value ? 'True' : 'False';
    }
    case 'fill-blank': {
      const values = variant === 'selected' ? review.submittedAnswers : review.correctAnswers;
      const compact = values.map((value) => value.trim()).filter(Boolean);
      return compact.length ? compact.join(' | ') : language === 'zh-CN' ? '未作答' : 'No answer';
    }
    case 'sorting': {
      const values = variant === 'selected' ? review.orderedItems : review.correctOrder;
      return values.length ? values.join(' -> ') : language === 'zh-CN' ? '未作答' : 'No answer';
    }
    case 'matching':
      return variant === 'selected' ? review.selectedAnswer : review.correctAnswer;
  }
}

function ReviewAnswerPanel({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'rose' | 'emerald';
}) {
  const toneClasses =
    tone === 'rose'
      ? 'border-rose-200 bg-rose-50/70 text-rose-700'
      : 'border-emerald-200 bg-emerald-50/70 text-emerald-700';

  return (
    <div className={`rounded-[20px] border px-4 py-4 ${toneClasses}`}>
      <p className="text-[0.72rem] font-bold uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-7">{value}</p>
    </div>
  );
}

function MatchingWrongReviewCard({
  review,
  correctMatchLabel,
  language,
}: {
  review: Extract<QuestionReview, { kind: 'matching' }>;
  correctMatchLabel: string;
  language: 'zh-CN' | 'en';
}) {
  return (
    <div className="space-y-3">
      {review.rows.map((row) => (
        <div
          key={row.id}
          className={`rounded-[22px] border px-4 py-4 ${
            row.isCorrect
              ? 'border-emerald-200 bg-emerald-50/65 text-emerald-700'
              : 'border-rose-200 bg-rose-50/70 text-rose-700'
          }`}
        >
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[var(--viewer-text-muted)]">
                {row.left}
              </p>
              <p className="mt-2 text-sm font-semibold leading-7">
                {row.selectedRight ?? (language === 'zh-CN' ? '未选择匹配项' : 'No match selected')}
              </p>
            </div>
            <div>
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[var(--viewer-text-muted)]">
                {correctMatchLabel}
              </p>
              <p className="mt-2 text-sm font-semibold leading-7">{row.correctRight}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
