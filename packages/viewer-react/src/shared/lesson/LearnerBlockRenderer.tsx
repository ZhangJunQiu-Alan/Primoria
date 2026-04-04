import { useEffect, useId, useState } from 'react';
import { BlockRenderer } from '@/shared/lesson/BlockRenderer';
import type { LessonBlock, SortingBlock } from '@/shared/lesson/types';
import { cn } from '@/shared/utils/cn';

export function LearnerBlockRenderer({
  block,
  checkVersion,
  onAnswered,
}: {
  block: LessonBlock;
  checkVersion: number;
  onAnswered: (isCorrect: boolean) => void;
}) {
  if (block.type === 'sorting') {
    return <SortingPreview block={block} checkVersion={checkVersion} onAnswered={onAnswered} />;
  }

  switch (block.type) {
    case 'multiple-choice':
      return <MultipleChoicePreview block={block} checkVersion={checkVersion} onAnswered={onAnswered} />;
    case 'true-false':
      return <TrueFalsePreview block={block} checkVersion={checkVersion} onAnswered={onAnswered} />;
    case 'fill-blank':
      return <FillBlankPreview block={block} checkVersion={checkVersion} onAnswered={onAnswered} />;
    case 'matching':
      return <MatchingPreview block={block} checkVersion={checkVersion} onAnswered={onAnswered} />;
    default:
      return <BlockRenderer block={block} />;
  }
}

function MultipleChoicePreview({
  block,
  checkVersion,
  onAnswered,
}: {
  block: LessonBlock;
  checkVersion: number;
  onAnswered: (isCorrect: boolean) => void;
}) {
  const content = block.content as {
    question?: string;
    allowMultiple?: boolean;
    options?: Array<{ id: string; text: string; isCorrect?: boolean }>;
  };
  const options = content.options ?? [];
  const allowMultiple = content.allowMultiple ?? false;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds([]);
  }, [block.id]);

  const isCorrect =
    options.length > 0 &&
    options.every((option) => {
      const selected = selectedIds.includes(option.id);
      return Boolean(option.isCorrect) === selected;
    });

  useEffect(() => {
    if (checkVersion === 0) return;
    onAnswered(isCorrect);
  }, [checkVersion, isCorrect, onAnswered]);

  return (
    <div className="space-y-3">
      <p className="font-semibold text-[var(--viewer-text)]">{String(content.question ?? '')}</p>
      <div className="space-y-2">
        {options.map((option) => {
          const selected = selectedIds.includes(option.id);
          return (
            <label
              key={option.id}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition',
                selected
                  ? 'border-[var(--viewer-primary)] bg-indigo-50 text-indigo-700'
                  : 'border-[var(--viewer-border)] text-[var(--viewer-text)] hover:bg-[var(--viewer-surface-muted)]',
              )}
            >
              <input
                type={allowMultiple ? 'checkbox' : 'radio'}
                name={block.id}
                checked={selected}
                onChange={() => {
                  if (allowMultiple) {
                    setSelectedIds((current) =>
                      current.includes(option.id)
                        ? current.filter((id) => id !== option.id)
                        : [...current, option.id],
                    );
                    return;
                  }
                  setSelectedIds([option.id]);
                }}
              />
              <span>{option.text}</span>
            </label>
          );
        })}
      </div>
      <AnswerState checkVersion={checkVersion} isCorrect={isCorrect} />
    </div>
  );
}

function TrueFalsePreview({
  block,
  checkVersion,
  onAnswered,
}: {
  block: LessonBlock;
  checkVersion: number;
  onAnswered: (isCorrect: boolean) => void;
}) {
  const content = block.content as { statement?: string; isTrue?: boolean };
  const group = useId();
  const [selectedValue, setSelectedValue] = useState<boolean | null>(null);
  const isCorrect = selectedValue !== null && selectedValue === Boolean(content.isTrue ?? true);

  useEffect(() => {
    setSelectedValue(null);
  }, [block.id]);

  useEffect(() => {
    if (checkVersion === 0) return;
    onAnswered(isCorrect);
  }, [checkVersion, isCorrect, onAnswered]);

  return (
    <div className="space-y-3">
      <p className="font-semibold text-[var(--viewer-text)]">{String(content.statement ?? '')}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: 'True', value: true },
          { label: 'False', value: false },
        ].map((option) => (
          <label
            key={option.label}
            className={cn(
              'flex cursor-pointer items-center justify-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition',
              selectedValue === option.value
                ? 'border-[var(--viewer-primary)] bg-indigo-50 text-indigo-700'
                : 'border-[var(--viewer-border)] text-[var(--viewer-text)]',
            )}
          >
            <input
              type="radio"
              name={group}
              checked={selectedValue === option.value}
              onChange={() => setSelectedValue(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      <AnswerState checkVersion={checkVersion} isCorrect={isCorrect} />
    </div>
  );
}

function FillBlankPreview({
  block,
  checkVersion,
  onAnswered,
}: {
  block: LessonBlock;
  checkVersion: number;
  onAnswered: (isCorrect: boolean) => void;
}) {
  const content = block.content as {
    template?: string;
    blanks?: Array<{ answer: string; alternatives?: string[] }>;
  };
  const template = String(content.template ?? '');
  const blanks = content.blanks ?? [];
  const parts = template.split('___');
  const [answers, setAnswers] = useState<string[]>(() => Array.from({ length: Math.max(parts.length - 1, blanks.length) }, () => ''));

  useEffect(() => {
    setAnswers(Array.from({ length: Math.max(parts.length - 1, blanks.length) }, () => ''));
  }, [block.id, parts.length, blanks.length]);

  const isCorrect =
    blanks.length > 0 &&
    blanks.every((blank, index) => {
      const value = answers[index]?.trim().toLowerCase() ?? '';
      const accepted = [blank.answer, ...(blank.alternatives ?? [])]
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
      return accepted.includes(value);
    });

  useEffect(() => {
    if (checkVersion === 0) return;
    onAnswered(isCorrect);
  }, [checkVersion, isCorrect, onAnswered]);

  return (
    <div className="space-y-3">
      <p className="text-sm leading-loose text-[var(--viewer-text)]">
        {parts.map((part, index) => (
          <span key={`${block.id}-${index}`}>
            {part}
            {index < parts.length - 1 ? (
              <input
                className="mx-1 inline-block min-w-24 rounded-lg border border-[var(--viewer-border)] bg-transparent px-2 py-1 text-center outline-none focus:border-[var(--viewer-primary)]"
                value={answers[index] ?? ''}
                onChange={(event) =>
                  setAnswers((current) => {
                    const next = [...current];
                    next[index] = event.target.value;
                    return next;
                  })
                }
              />
            ) : null}
          </span>
        ))}
      </p>
      <AnswerState checkVersion={checkVersion} isCorrect={isCorrect} />
    </div>
  );
}

function MatchingPreview({
  block,
  checkVersion,
  onAnswered,
}: {
  block: LessonBlock;
  checkVersion: number;
  onAnswered: (isCorrect: boolean) => void;
}) {
  const content = block.content as { pairs?: Array<{ id: string; left: string; right: string }> };
  const pairs = content.pairs ?? [];
  const [selectedPairs, setSelectedPairs] = useState<Record<string, string>>({});

  useEffect(() => {
    setSelectedPairs({});
  }, [block.id]);

  const isCorrect =
    pairs.length > 0 &&
    pairs.every((pair) => selectedPairs[pair.id] !== undefined && selectedPairs[pair.id] === pair.right);

  useEffect(() => {
    if (checkVersion === 0) return;
    onAnswered(isCorrect);
  }, [checkVersion, isCorrect, onAnswered]);

  return (
    <div className="space-y-2">
      {pairs.map((pair) => (
        <div key={pair.id} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(180px,1fr)] items-center gap-3">
          <div className="rounded-2xl border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] px-4 py-3 text-sm font-medium text-[var(--viewer-text)]">
            {pair.left}
          </div>
          <span className="text-[var(--viewer-text-muted)]">↔</span>
          <select
            value={selectedPairs[pair.id] ?? ''}
            onChange={(event) =>
              setSelectedPairs((current) => ({
                ...current,
                [pair.id]: event.target.value,
              }))
            }
            className="rounded-2xl border border-[var(--viewer-border)] bg-white px-4 py-3 text-sm font-medium text-[var(--viewer-text)] outline-none focus:border-[var(--viewer-primary)]"
          >
            <option value="">Select a match</option>
            {pairs.map((option) => (
              <option key={`${pair.id}-${option.id}`} value={option.right}>
                {option.right}
              </option>
            ))}
          </select>
        </div>
      ))}
      <AnswerState checkVersion={checkVersion} isCorrect={isCorrect} />
    </div>
  );
}

function SortingPreview({
  block,
  checkVersion,
  onAnswered,
}: {
  block: SortingBlock;
  checkVersion: number;
  onAnswered: (isCorrect: boolean) => void;
}) {
  const [items, setItems] = useState(block.content.items);

  useEffect(() => {
    setItems(block.content.items);
  }, [block.id, block.content.items]);

  const isCorrect = JSON.stringify(items) === JSON.stringify(block.content.correctOrder);

  useEffect(() => {
    if (checkVersion === 0) return;
    onAnswered(isCorrect);
  }, [checkVersion, isCorrect, onAnswered]);

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
                className="rounded-full border border-[var(--viewer-border)] px-3 py-1 text-xs font-semibold text-[var(--viewer-text-muted)]"
                onClick={() =>
                  setItems((current) => {
                    if (index === 0) return current;
                    const next = [...current];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    return next;
                  })
                }
              >
                Up
              </button>
              <button
                type="button"
                className="rounded-full border border-[var(--viewer-border)] px-3 py-1 text-xs font-semibold text-[var(--viewer-text-muted)]"
                onClick={() =>
                  setItems((current) => {
                    if (index >= current.length - 1) return current;
                    const next = [...current];
                    [next[index], next[index + 1]] = [next[index + 1], next[index]];
                    return next;
                  })
                }
              >
                Down
              </button>
            </div>
          </div>
        ))}
      </div>
      <AnswerState checkVersion={checkVersion} isCorrect={isCorrect} />
    </div>
  );
}

function AnswerState({ checkVersion, isCorrect }: { checkVersion: number; isCorrect: boolean }) {
  if (checkVersion === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'inline-flex rounded-full px-3 py-1 text-xs font-bold',
        isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700',
      )}
    >
      {isCorrect ? 'Correct' : 'Not correct yet'}
    </div>
  );
}
