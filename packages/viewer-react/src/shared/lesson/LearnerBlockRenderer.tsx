import { useId, useMemo } from 'react';
import { BlockRenderer } from '@/shared/lesson/BlockRenderer';
import type { LessonBlock, SortingBlock } from '@/shared/lesson/types';
import type { QuestionEvaluation, QuestionResponse } from '@/shared/lesson/questionFlow';
import { useProductLanguage } from '@/shared/i18n/useProductLanguage';
import { cn } from '@/shared/utils/cn';
import { seededShuffle } from '@/shared/utils/seededShuffle';

type SelectableOptionState = 'default' | 'selected' | 'correct' | 'incorrect';

export function LearnerBlockRenderer({
  block,
  response,
  evaluation,
  locked = false,
  onResponseChange,
}: {
  block: LessonBlock;
  response?: QuestionResponse;
  evaluation?: QuestionEvaluation;
  locked?: boolean;
  onResponseChange?: (response: QuestionResponse) => void;
}) {
  if (block.type === 'sorting') {
    return (
      <SortingPreview
        block={block}
        response={response}
        evaluation={evaluation}
        locked={locked}
        onResponseChange={onResponseChange}
      />
    );
  }

  switch (block.type) {
    case 'multiple-choice':
      return (
        <MultipleChoicePreview
          block={block}
          response={response}
          evaluation={evaluation}
          locked={locked}
          onResponseChange={onResponseChange}
        />
      );
    case 'true-false':
      return (
        <TrueFalsePreview
          block={block}
          response={response}
          evaluation={evaluation}
          locked={locked}
          onResponseChange={onResponseChange}
        />
      );
    case 'fill-blank':
      return (
        <FillBlankPreview
          block={block}
          response={response}
          evaluation={evaluation}
          locked={locked}
          onResponseChange={onResponseChange}
        />
      );
    case 'matching':
      return (
        <MatchingPreview
          block={block}
          response={response}
          evaluation={evaluation}
          locked={locked}
          onResponseChange={onResponseChange}
        />
      );
    default:
      return <BlockRenderer block={block} />;
  }
}

function resolveSelectableOptionState({
  evaluation,
  selected,
  isCorrect,
}: {
  evaluation?: QuestionEvaluation;
  selected: boolean;
  isCorrect: boolean;
}): SelectableOptionState {
  if (!evaluation) {
    return selected ? 'selected' : 'default';
  }

  if (isCorrect) {
    return 'correct';
  }

  if (selected) {
    return 'incorrect';
  }

  return 'default';
}

function selectableOptionClasses(state: SelectableOptionState) {
  switch (state) {
    case 'selected':
      return 'border-[#b9d1bc] bg-[#edf5ec] text-[#5c7d60]';
    case 'correct':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'incorrect':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-[var(--viewer-border)] text-[var(--viewer-text)] hover:bg-[var(--viewer-surface-muted)]';
  }
}

function MultipleChoicePreview({
  block,
  response,
  evaluation,
  locked,
  onResponseChange,
}: {
  block: LessonBlock;
  response?: QuestionResponse;
  evaluation?: QuestionEvaluation;
  locked: boolean;
  onResponseChange?: (response: QuestionResponse) => void;
}) {
  const content = block.content as {
    question?: string;
    allowMultiple?: boolean;
    options?: Array<{ id: string; text: string; isCorrect?: boolean }>;
  };
  const options = content.options ?? [];
  const allowMultiple = content.allowMultiple ?? false;
  const selectedIds = Array.isArray(response)
    ? response.filter((value): value is string => typeof value === 'string')
    : [];

  return (
    <div className="space-y-3">
      <p className="font-semibold text-[var(--viewer-text)]">{String(content.question ?? '')}</p>
      <div className="space-y-2">
        {options.map((option) => {
          const selected = selectedIds.includes(option.id);
          const optionState = resolveSelectableOptionState({
            evaluation,
            selected,
            isCorrect: Boolean(option.isCorrect),
          });
          return (
            <label
              key={option.id}
              data-option-state={optionState}
              className={cn(
                'flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition',
                locked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer',
                selectableOptionClasses(optionState),
              )}
            >
              <input
                type={allowMultiple ? 'checkbox' : 'radio'}
                name={block.id}
                checked={selected}
                disabled={locked}
                onChange={() => {
                  if (!onResponseChange) {
                    return;
                  }

                  if (allowMultiple) {
                    onResponseChange(
                      selected
                        ? selectedIds.filter((id) => id !== option.id)
                        : [...selectedIds, option.id],
                    );
                    return;
                  }

                  onResponseChange([option.id]);
                }}
              />
              <span>{option.text}</span>
            </label>
          );
        })}
      </div>
      <AnswerState evaluation={evaluation} />
    </div>
  );
}

function TrueFalsePreview({
  block,
  response,
  evaluation,
  locked,
  onResponseChange,
}: {
  block: LessonBlock;
  response?: QuestionResponse;
  evaluation?: QuestionEvaluation;
  locked: boolean;
  onResponseChange?: (response: QuestionResponse) => void;
}) {
  const content = block.content as { statement?: string; isTrue?: boolean };
  const language = useProductLanguage();
  const group = useId();
  const selectedValue = typeof response === 'boolean' ? response : null;
  const labels =
    language === 'zh-CN'
      ? [
          { label: '正确', value: true },
          { label: '错误', value: false },
        ]
      : [
          { label: 'True', value: true },
          { label: 'False', value: false },
        ];

  return (
    <div className="space-y-3">
      <p className="font-semibold text-[var(--viewer-text)]">{String(content.statement ?? '')}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {labels.map((option) => {
          const optionState = resolveSelectableOptionState({
            evaluation,
            selected: selectedValue === option.value,
            isCorrect: option.value === Boolean(content.isTrue ?? true),
          });

          return (
            <label
              key={option.label}
              data-option-state={optionState}
              className={cn(
                'flex items-center justify-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                locked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer',
                selectableOptionClasses(optionState),
              )}
            >
              <input
                type="radio"
                name={group}
                checked={selectedValue === option.value}
                disabled={locked}
                onChange={() => onResponseChange?.(option.value)}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
      <AnswerState evaluation={evaluation} />
    </div>
  );
}

function FillBlankPreview({
  block,
  response,
  evaluation,
  locked,
  onResponseChange,
}: {
  block: LessonBlock;
  response?: QuestionResponse;
  evaluation?: QuestionEvaluation;
  locked: boolean;
  onResponseChange?: (response: QuestionResponse) => void;
}) {
  const content = block.content as {
    template?: string;
    blanks?: Array<{ answer: string; alternatives?: string[] }>;
  };
  const template = String(content.template ?? '');
  const blanks = content.blanks ?? [];
  const parts = template.split('___');
  const answerCount = Math.max(parts.length - 1, blanks.length);
  const answers = Array.isArray(response)
    ? Array.from({ length: answerCount }, (_, index) => String(response[index] ?? ''))
    : Array.from({ length: answerCount }, () => '');

  return (
    <div className="space-y-3">
      <p className="text-sm leading-loose text-[var(--viewer-text)]">
        {parts.map((part, index) => (
          <span key={`${block.id}-${index}`}>
            {part}
            {index < parts.length - 1 ? (
              <input
                className="mx-1 inline-block min-w-24 rounded-lg border border-[var(--viewer-border)] bg-transparent px-2 py-1 text-center outline-none focus:border-[var(--viewer-primary)] disabled:cursor-not-allowed disabled:opacity-80"
                value={answers[index] ?? ''}
                disabled={locked}
                onChange={(event) => {
                  if (!onResponseChange) {
                    return;
                  }

                  const nextAnswers = [...answers];
                  nextAnswers[index] = event.target.value;
                  onResponseChange(nextAnswers);
                }}
              />
            ) : null}
          </span>
        ))}
      </p>
      <AnswerState evaluation={evaluation} />
    </div>
  );
}

function MatchingPreview({
  block,
  response,
  evaluation,
  locked,
  onResponseChange,
}: {
  block: LessonBlock;
  response?: QuestionResponse;
  evaluation?: QuestionEvaluation;
  locked: boolean;
  onResponseChange?: (response: QuestionResponse) => void;
}) {
  const content = block.content as { pairs?: Array<{ id: string; left: string; right: string }> };
  const language = useProductLanguage();
  const pairs = content.pairs ?? [];
  const shuffledRightOptions = useMemo(
    () => seededShuffle(pairs, `${block.id}:right`),
    [block.id, pairs],
  );
  const selectedPairs =
    response && !Array.isArray(response) && typeof response === 'object'
      ? (response as Record<string, string>)
      : {};
  const matchingRows =
    evaluation?.review?.kind === 'matching'
      ? evaluation.review.rows
      : [];

  return (
    <div className="space-y-2">
      {pairs.map((pair) => {
        const rowReview = matchingRows.find((row) => row.id === pair.id);
        const isRowCorrect = rowReview?.isCorrect ?? false;
        const hasRowEvaluation = Boolean(rowReview);
        const rowToneClasses = !hasRowEvaluation
          ? 'border-[var(--viewer-border)] bg-transparent'
          : isRowCorrect
            ? 'border-emerald-200 bg-emerald-50/70'
            : 'border-rose-200 bg-rose-50/75';
        const selectToneClasses = !hasRowEvaluation
          ? 'border-[var(--viewer-border)] bg-white text-[var(--viewer-text)]'
          : isRowCorrect
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-rose-200 bg-rose-50 text-rose-700';

        return (
          <div key={pair.id} className={cn('space-y-2 rounded-[22px] border px-3 py-3 transition', rowToneClasses)}>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(180px,1fr)] items-center gap-3">
              <div
                className={cn(
                  'rounded-2xl border px-4 py-3 text-sm font-medium',
                  hasRowEvaluation
                    ? isRowCorrect
                      ? 'border-emerald-200 bg-emerald-50/70 text-emerald-700'
                      : 'border-rose-200 bg-rose-50/80 text-rose-700'
                    : 'border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] text-[var(--viewer-text)]',
                )}
              >
                {pair.left}
              </div>
              <span className="text-[var(--viewer-text-muted)]">↔</span>
              <select
                value={selectedPairs[pair.id] ?? ''}
                disabled={locked}
                onChange={(event) =>
                  onResponseChange?.({
                    ...selectedPairs,
                    [pair.id]: event.target.value,
                  })
                }
                className={cn(
                  'rounded-2xl border px-4 py-3 text-sm font-medium outline-none focus:border-[var(--viewer-primary)] disabled:cursor-not-allowed disabled:opacity-80',
                  selectToneClasses,
                )}
              >
                <option value="">{language === 'zh-CN' ? '选择匹配项' : 'Select a match'}</option>
                {shuffledRightOptions.map((option) => (
                  <option key={`${pair.id}-${option.id}`} value={option.right}>
                    {option.right}
                  </option>
                ))}
              </select>
            </div>

            {hasRowEvaluation && !isRowCorrect ? (
              <div className="rounded-2xl border border-rose-200 bg-white/60 px-4 py-3 text-sm font-medium text-rose-700">
                <span className="font-bold">
                  {language === 'zh-CN' ? '正确匹配：' : 'Correct match: '}
                </span>
                {rowReview?.correctRight}
              </div>
            ) : null}
          </div>
        );
      })}
      <AnswerState evaluation={evaluation} />
    </div>
  );
}

function SortingPreview({
  block,
  response,
  evaluation,
  locked,
  onResponseChange,
}: {
  block: SortingBlock;
  response?: QuestionResponse;
  evaluation?: QuestionEvaluation;
  locked: boolean;
  onResponseChange?: (response: QuestionResponse) => void;
}) {
  const language = useProductLanguage();
  const items = Array.isArray(response)
    ? response.filter((value): value is string => typeof value === 'string')
    : block.content.items;

  return (
    <div className="space-y-3">
      <p className="font-semibold text-[var(--viewer-text)]">{block.content.prompt}</p>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="flex items-center justify-between rounded-2xl border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] px-4 py-3">
            <span className="text-sm font-medium text-[var(--viewer-text)]">{item}</span>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-full border border-[var(--viewer-border)] px-3 py-1 text-xs font-semibold text-[var(--viewer-text-muted)] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={locked || index === 0}
                onClick={() => {
                  if (!onResponseChange || index === 0) {
                    return;
                  }

                  const nextItems = [...items];
                  [nextItems[index - 1], nextItems[index]] = [nextItems[index], nextItems[index - 1]];
                  onResponseChange(nextItems);
                }}
              >
                {language === 'zh-CN' ? '上移' : 'Up'}
              </button>
              <button
                type="button"
                className="rounded-full border border-[var(--viewer-border)] px-3 py-1 text-xs font-semibold text-[var(--viewer-text-muted)] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={locked || index >= items.length - 1}
                onClick={() => {
                  if (!onResponseChange || index >= items.length - 1) {
                    return;
                  }

                  const nextItems = [...items];
                  [nextItems[index], nextItems[index + 1]] = [nextItems[index + 1], nextItems[index]];
                  onResponseChange(nextItems);
                }}
              >
                {language === 'zh-CN' ? '下移' : 'Down'}
              </button>
            </div>
          </div>
        ))}
      </div>
      <AnswerState evaluation={evaluation} />
    </div>
  );
}

function AnswerState({ evaluation }: { evaluation?: QuestionEvaluation }) {
  const language = useProductLanguage();
  if (!evaluation) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'inline-flex rounded-full px-3 py-1 text-xs font-bold',
          evaluation.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700',
        )}
      >
        {evaluation.isCorrect
          ? language === 'zh-CN'
            ? '回答正确'
            : 'Correct'
          : language === 'zh-CN'
            ? '还不正确'
            : 'Not correct yet'}
      </div>
      {evaluation.explanation ? (
        <div className="rounded-2xl border border-[var(--viewer-border)] bg-[rgba(255,252,247,0.72)] px-4 py-3 text-sm leading-6 text-[var(--viewer-text-muted)]">
          {evaluation.explanation}
        </div>
      ) : null}
    </div>
  );
}
