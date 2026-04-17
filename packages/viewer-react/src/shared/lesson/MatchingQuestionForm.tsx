import * as Select from '@radix-ui/react-select';
import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import { cn } from '@/shared/utils/cn';

const CLEAR_SELECTION_VALUE = '__matching-clear__';

export interface MatchingPairOption {
  id: string;
  left: string;
  right: string;
}

export interface MatchingReviewRow {
  id: string;
  correctRight: string;
  isCorrect: boolean;
}

interface MatchingQuestionCopy {
  leftLabel: string;
  choiceLabel: string;
  placeholder: string;
  menuLabel: string;
  clearSelection: string;
  correctMatch: string;
}

export function MatchingQuestionForm({
  pairs,
  options,
  selectedPairs,
  onSelectionChange,
  disabled = false,
  reviewRows = [],
  copy,
}: {
  pairs: MatchingPairOption[];
  options: MatchingPairOption[];
  selectedPairs: Record<string, string>;
  onSelectionChange: (pairId: string, nextRight?: string) => void;
  disabled?: boolean;
  reviewRows?: MatchingReviewRow[];
  copy: MatchingQuestionCopy;
}) {
  const reviewById = new Map(reviewRows.map((row) => [row.id, row]));

  return (
    <div className="space-y-3">
      {pairs.map((pair, index) => {
        const review = reviewById.get(pair.id);
        const hasReview = Boolean(review);
        const isCorrect = review?.isCorrect ?? false;
        const selectedRight = selectedPairs[pair.id];
        const selectedOptionId = options.find((option) => option.right === selectedRight)?.id;

        return (
          <div
            key={pair.id}
            className={cn(
              'rounded-[28px] border p-4 shadow-[0_18px_36px_rgba(90,70,50,0.08)] transition-colors',
              !hasReview
                ? 'border-[var(--viewer-border)] bg-[linear-gradient(180deg,rgba(255,252,247,0.94),rgba(250,245,238,0.88))]'
                : isCorrect
                  ? 'border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.96),rgba(220,252,231,0.9))]'
                  : 'border-rose-200 bg-[linear-gradient(180deg,rgba(255,241,242,0.96),rgba(255,228,230,0.9))]',
            )}
          >
            <div className="grid gap-3 md:grid-cols-[minmax(0,0.92fr)_auto_minmax(0,1.08fr)] md:items-center">
              <div
                className={cn(
                  'min-w-0 rounded-[22px] border px-4 py-4',
                  !hasReview
                    ? 'border-[var(--viewer-border)] bg-[rgba(237,231,218,0.62)]'
                    : isCorrect
                      ? 'border-emerald-200 bg-white/60'
                      : 'border-rose-200 bg-white/70',
                )}
              >
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-[var(--viewer-text-muted)]">
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-current/15 bg-white/60 px-2 text-[10px] font-bold text-[var(--viewer-text)]">
                    {index + 1}
                  </span>
                  <span>{copy.leftLabel}</span>
                </div>
                <p className="break-words text-sm font-semibold leading-6 text-[var(--viewer-text)]">
                  {pair.left}
                </p>
              </div>

              <div className="hidden items-center justify-center md:flex">
                <span
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border bg-white/75 text-base text-[var(--viewer-text-muted)] shadow-[0_6px_14px_rgba(90,70,50,0.08)]',
                    !hasReview
                      ? 'border-[var(--viewer-border)]'
                      : isCorrect
                        ? 'border-emerald-200 text-emerald-700'
                        : 'border-rose-200 text-rose-700',
                  )}
                >
                  ↔
                </span>
              </div>

              <Select.Root
                disabled={disabled}
                value={selectedOptionId ?? ''}
                onValueChange={(nextValue) => {
                  if (nextValue === CLEAR_SELECTION_VALUE) {
                    onSelectionChange(pair.id, undefined);
                    return;
                  }

                  onSelectionChange(
                    pair.id,
                    options.find((option) => option.id === nextValue)?.right,
                  );
                }}
              >
                <Select.Trigger
                  aria-label={`${pair.left} ${copy.choiceLabel}`}
                  className={cn(
                    'group flex min-h-[84px] w-full items-center justify-between gap-3 rounded-[22px] border px-4 py-3 text-left shadow-[0_8px_18px_rgba(90,70,50,0.06)] outline-none transition-all focus-visible:ring-2 focus-visible:ring-[var(--viewer-primary)]/30 disabled:cursor-not-allowed disabled:opacity-65',
                    !hasReview
                      ? 'border-[var(--viewer-border)] bg-white/92 hover:border-[var(--viewer-primary)]/30'
                      : isCorrect
                        ? 'border-emerald-200 bg-white/90'
                        : 'border-rose-200 bg-white/92',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 text-[11px] font-semibold tracking-[0.16em] text-[var(--viewer-text-muted)]">
                      {copy.choiceLabel}
                    </div>
                    <Select.Value
                      placeholder={copy.placeholder}
                      className="block whitespace-normal break-words text-sm font-semibold leading-6 text-[var(--viewer-text)]"
                    />
                  </div>

                  <Select.Icon
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors',
                      !hasReview
                        ? 'border-[var(--viewer-border)] bg-[rgba(237,231,218,0.72)] text-[var(--viewer-text-muted)] group-hover:text-[var(--viewer-text)]'
                        : isCorrect
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-rose-200 bg-rose-50 text-rose-700',
                    )}
                  >
                    <ChevronDownIcon className="h-4 w-4" />
                  </Select.Icon>
                </Select.Trigger>

                <Select.Portal>
                  <Select.Content
                    position="popper"
                    side="bottom"
                    align="start"
                    sideOffset={10}
                    className="z-[80] max-h-[22rem] w-[min(32rem,calc(100vw-2rem))] overflow-hidden rounded-[24px] border border-[var(--viewer-border)] bg-[rgba(255,251,246,0.98)] text-[var(--viewer-text)] shadow-[0_28px_48px_rgba(90,70,50,0.2)] backdrop-blur-xl sm:min-w-[var(--radix-select-trigger-width)] dark:bg-[rgba(15,27,47,0.98)]"
                  >
                    <div className="border-b border-[var(--viewer-border)]/70 px-4 py-3 text-[11px] font-semibold tracking-[0.18em] text-[var(--viewer-text-muted)]">
                      {copy.menuLabel}
                    </div>
                    <Select.Viewport className="max-h-[22rem] p-2">
                      <MatchingSelectItem value={CLEAR_SELECTION_VALUE} muted>
                        {copy.clearSelection}
                      </MatchingSelectItem>
                      {options.map((option) => (
                        <MatchingSelectItem key={`${pair.id}-${option.id}`} value={option.id}>
                          {option.right}
                        </MatchingSelectItem>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {hasReview && !isCorrect ? (
              <div className="mt-3 rounded-[22px] border border-rose-200 bg-white/75 px-4 py-3 text-sm leading-6 text-rose-700">
                <span className="font-bold">{copy.correctMatch}</span>
                {review?.correctRight}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function MatchingSelectItem({
  children,
  value,
  muted = false,
}: {
  children: React.ReactNode;
  value: string;
  muted?: boolean;
}) {
  return (
    <Select.Item
      value={value}
      className={cn(
        'relative flex cursor-pointer select-none items-start gap-3 rounded-[18px] border border-transparent px-4 py-3 text-sm leading-6 outline-none transition',
        'data-[highlighted]:border-[var(--viewer-primary)]/15 data-[highlighted]:bg-[rgba(122,158,126,0.12)]',
        'data-[state=checked]:border-[var(--viewer-primary)]/25 data-[state=checked]:bg-[rgba(122,158,126,0.16)]',
        muted ? 'text-[var(--viewer-text-muted)]' : 'text-[var(--viewer-text)]',
      )}
    >
      <div className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--viewer-border)] bg-white/85">
        <Select.ItemIndicator className="flex h-full w-full items-center justify-center rounded-full bg-[var(--viewer-primary)] text-white">
          <CheckIcon className="h-3.5 w-3.5" />
        </Select.ItemIndicator>
      </div>
      <Select.ItemText>
        <span className="block break-words font-medium">{children}</span>
      </Select.ItemText>
    </Select.Item>
  );
}
