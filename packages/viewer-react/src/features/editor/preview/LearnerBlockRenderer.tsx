import { useEffect, useId, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Block } from '@primoria/schema';
import { seededShuffle } from '@/shared/utils/seededShuffle';
import { BlockRenderer } from './BlockRenderer';

interface LearnerBlockRendererProps {
  block: Block;
  checkVersion: number;
  onAnswered: (isCorrect: boolean) => void;
}

export function LearnerBlockRenderer({
  block,
  checkVersion,
  onAnswered,
}: LearnerBlockRendererProps) {
  switch (block.type) {
    case 'multiple-choice':
      return (
        <MultipleChoicePreview
          block={block}
          checkVersion={checkVersion}
          onAnswered={onAnswered}
        />
      );
    case 'true-false':
      return (
        <TrueFalsePreview
          block={block}
          checkVersion={checkVersion}
          onAnswered={onAnswered}
        />
      );
    case 'fill-blank':
      return (
        <FillBlankPreview
          block={block}
          checkVersion={checkVersion}
          onAnswered={onAnswered}
        />
      );
    case 'matching':
      return (
        <MatchingPreview
          block={block}
          checkVersion={checkVersion}
          onAnswered={onAnswered}
        />
      );
    default:
      return <BlockRenderer block={block} />;
  }
}

function MultipleChoicePreview({
  block,
  checkVersion,
  onAnswered,
}: LearnerBlockRendererProps) {
  const c = block.content as {
    question?: string;
    allowMultiple?: boolean;
    options?: Array<{ id: string; text: string; isCorrect?: boolean }>;
  };
  const options = c.options ?? [];
  const allowMultiple = c.allowMultiple ?? false;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
      <p className="font-medium">{String(c.question ?? '')}</p>
      <div className="space-y-2">
        {options.map((option) => {
          const selected = selectedIds.includes(option.id);
          return (
            <label
              key={option.id}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 transition-colors',
                selected ? 'border-primary bg-primary/5' : 'hover:bg-accent',
              )}
            >
              <input
                type={allowMultiple ? 'checkbox' : 'radio'}
                name={block.id}
                className="h-4 w-4"
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
              <span className="text-sm">{option.text}</span>
            </label>
          );
        })}
      </div>
      <PreviewAnswerState checkVersion={checkVersion} isCorrect={isCorrect} />
    </div>
  );
}

function TrueFalsePreview({
  block,
  checkVersion,
  onAnswered,
}: LearnerBlockRendererProps) {
  const c = block.content as { statement?: string; isTrue?: boolean };
  const groupName = useId();
  const [selectedValue, setSelectedValue] = useState<boolean | null>(null);
  const isCorrect = selectedValue !== null && selectedValue === (c.isTrue ?? true);

  useEffect(() => {
    if (checkVersion === 0) return;
    onAnswered(isCorrect);
  }, [checkVersion, isCorrect, onAnswered]);

  return (
    <div className="space-y-3">
      <p className="font-medium">{String(c.statement ?? '')}</p>
      <div className="flex gap-3">
        {[
          { label: 'True', value: true },
          { label: 'False', value: false },
        ].map((option) => (
          <label
            key={option.label}
            className={cn(
              'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-6 py-2.5 transition-colors',
              selectedValue === option.value
                ? 'border-primary bg-primary/5'
                : 'hover:bg-accent',
            )}
          >
            <input
              type="radio"
              name={groupName}
              className="h-4 w-4"
              checked={selectedValue === option.value}
              onChange={() => setSelectedValue(option.value)}
            />
            <span className="text-sm font-medium">{option.label}</span>
          </label>
        ))}
      </div>
      <PreviewAnswerState checkVersion={checkVersion} isCorrect={isCorrect} />
    </div>
  );
}

function FillBlankPreview({
  block,
  checkVersion,
  onAnswered,
}: LearnerBlockRendererProps) {
  const c = block.content as {
    template?: string;
    blanks?: Array<{ id: string; answer: string; alternatives?: string[] }>;
  };
  const blanks = c.blanks ?? [];
  const parts = String(c.template ?? '').split('___');
  const [answers, setAnswers] = useState<string[]>(() =>
    Array.from({ length: Math.max(blanks.length, parts.length - 1) }, () => ''),
  );

  const isCorrect =
    blanks.length > 0 &&
    blanks.every((blank, index) => {
      const value = normalizeAnswer(answers[index]);
      if (!value) return false;
      const accepted = [
        normalizeAnswer(blank.answer),
        ...(blank.alternatives ?? []).map(normalizeAnswer),
      ].filter(Boolean);
      return accepted.includes(value);
    });

  useEffect(() => {
    setAnswers(Array.from({ length: Math.max(blanks.length, parts.length - 1) }, () => ''));
  }, [blanks.length, parts.length]);

  useEffect(() => {
    if (checkVersion === 0) return;
    onAnswered(isCorrect);
  }, [checkVersion, isCorrect, onAnswered]);

  return (
    <div className="space-y-3">
      <p className="text-sm leading-loose">
        {parts.map((part, index) => (
          <span key={`${block.id}-part-${index}`}>
            {part}
            {index < parts.length - 1 ? (
              <input
                type="text"
                value={answers[index] ?? ''}
                onChange={(event) => {
                  setAnswers((current) => {
                    const next = [...current];
                    next[index] = event.target.value;
                    return next;
                  });
                }}
                className="mx-1 inline-block w-24 border-b-2 border-primary bg-transparent text-center outline-none"
              />
            ) : null}
          </span>
        ))}
      </p>
      <PreviewAnswerState checkVersion={checkVersion} isCorrect={isCorrect} />
    </div>
  );
}

function MatchingPreview({
  block,
  checkVersion,
  onAnswered,
}: LearnerBlockRendererProps) {
  const c = block.content as {
    pairs?: Array<{ id: string; left: string; right: string }>;
  };
  const pairs = c.pairs ?? [];
  const shuffledRightOptions = useMemo(
    () => seededShuffle(pairs, `${block.id}:right`),
    [block.id, pairs],
  );
  const [selectedPairs, setSelectedPairs] = useState<Record<string, string>>({});

  const isCorrect =
    pairs.length > 0 &&
    pairs.every((pair) => {
      const selected = selectedPairs[pair.id];
      return selected !== undefined && selected === pair.right;
    });

  useEffect(() => {
    if (checkVersion === 0) return;
    onAnswered(isCorrect);
  }, [checkVersion, isCorrect, onAnswered]);

  return (
    <div className="space-y-2">
      {pairs.map((pair) => (
        <div
          key={pair.id}
          className="grid grid-cols-[minmax(0,1fr)_auto_minmax(180px,1fr)] items-center gap-3"
        >
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{pair.left}</div>
          <span className="text-muted-foreground">↔</span>
          <select
            value={selectedPairs[pair.id] ?? ''}
            onChange={(event) =>
              setSelectedPairs((current) => ({
                ...current,
                [pair.id]: event.target.value,
              }))
            }
            className="rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
          >
            <option value="">Select a match</option>
            {shuffledRightOptions.map((option) => (
              <option key={`${pair.id}-${option.id}`} value={option.right}>
                {option.right}
              </option>
            ))}
          </select>
        </div>
      ))}
      <PreviewAnswerState checkVersion={checkVersion} isCorrect={isCorrect} />
    </div>
  );
}

function PreviewAnswerState({
  checkVersion,
  isCorrect,
}: {
  checkVersion: number;
  isCorrect: boolean;
}) {
  if (checkVersion === 0) return null;

  return (
    <div
      className={cn(
        'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
        isCorrect
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-rose-100 text-rose-700',
      )}
    >
      {isCorrect ? 'Correct' : 'Not correct yet'}
    </div>
  );
}

function normalizeAnswer(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}
