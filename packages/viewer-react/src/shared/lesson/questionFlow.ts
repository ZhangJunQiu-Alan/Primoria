import { isQuestionBlock } from '@/shared/lesson/blockVisibility';
import type { LessonBlock } from '@/shared/lesson/types';

export type QuestionPhase = 'answering' | 'review';

export type MultipleChoiceResponse = string[];
export type TrueFalseResponse = boolean | null;
export type FillBlankResponse = string[];
export type MatchingResponse = Record<string, string>;
export type SortingResponse = string[];

export type QuestionResponse =
  | MultipleChoiceResponse
  | TrueFalseResponse
  | FillBlankResponse
  | MatchingResponse
  | SortingResponse
  | undefined;

export type QuestionEvaluation = {
  isCorrect: boolean;
  explanation?: string;
};

export type LessonPageSessionState = {
  currentQuestionIndex: number;
  phase: QuestionPhase;
  responses: Record<string, QuestionResponse>;
  evaluations: Record<string, QuestionEvaluation>;
  pageCompleted: boolean;
};

export type QuestionDescriptor = {
  blockId: string;
  blockIndex: number;
  questionIndex: number;
};

export type DerivedLessonPageState = {
  currentQuestion: QuestionDescriptor | null;
  questionDescriptors: QuestionDescriptor[];
  visibleBlockIndexes: Set<number>;
  primaryAction: 'disabled' | 'evaluate-question' | 'next-question' | 'next-page' | 'complete-lesson';
  canCheck: boolean;
  canAdvancePage: boolean;
};

type MultipleChoiceContent = {
  explanation?: string;
  options?: Array<{ id: string; text: string; isCorrect?: boolean }>;
};

type TrueFalseContent = {
  explanation?: string;
  isTrue?: boolean;
};

type FillBlankContent = {
  blanks?: Array<{ answer: string; alternatives?: string[] }>;
};

type MatchingContent = {
  pairs?: Array<{ id: string; left: string; right: string }>;
};

export function getQuestionDescriptors(blocks: LessonBlock[]): QuestionDescriptor[] {
  return blocks.reduce<QuestionDescriptor[]>((descriptors, block, blockIndex) => {
    if (!isQuestionBlock(block)) {
      return descriptors;
    }

    descriptors.push({
      blockId: block.id,
      blockIndex,
      questionIndex: descriptors.length,
    });
    return descriptors;
  }, []);
}

export function createLessonPageSession(blocks: LessonBlock[]): LessonPageSessionState {
  const questionDescriptors = getQuestionDescriptors(blocks);
  return {
    currentQuestionIndex: questionDescriptors.length > 0 ? 0 : 0,
    phase: questionDescriptors.length > 0 ? 'answering' : 'review',
    responses: {},
    evaluations: {},
    pageCompleted: questionDescriptors.length === 0,
  };
}

export function ensureLessonPageSession(
  blocks: LessonBlock[],
  session?: LessonPageSessionState,
): LessonPageSessionState {
  const questionDescriptors = getQuestionDescriptors(blocks);
  if (!session) {
    return createLessonPageSession(blocks);
  }

  const questionIds = new Set(questionDescriptors.map((descriptor) => descriptor.blockId));
  const responses = Object.fromEntries(
    Object.entries(session.responses).filter(([blockId]) => questionIds.has(blockId)),
  );
  const evaluations = Object.fromEntries(
    Object.entries(session.evaluations).filter(([blockId]) => questionIds.has(blockId)),
  );

  if (questionDescriptors.length === 0) {
    return {
      currentQuestionIndex: 0,
      phase: 'review',
      responses,
      evaluations,
      pageCompleted: true,
    };
  }

  const lastQuestionIndex = questionDescriptors.length - 1;
  const currentQuestionIndex = Math.min(session.currentQuestionIndex, lastQuestionIndex);
  const currentQuestionId = questionDescriptors[currentQuestionIndex]?.blockId;
  const pageCompleted = Boolean(
    session.pageCompleted &&
      questionDescriptors[lastQuestionIndex] &&
      evaluations[questionDescriptors[lastQuestionIndex]!.blockId],
  );
  const phase = pageCompleted
    ? 'review'
    : currentQuestionId && evaluations[currentQuestionId]
      ? 'review'
      : 'answering';

  return {
    currentQuestionIndex: pageCompleted ? lastQuestionIndex : currentQuestionIndex,
    phase,
    responses,
    evaluations,
    pageCompleted,
  };
}

export function deriveLessonPageState(
  blocks: LessonBlock[],
  session: LessonPageSessionState,
  options: { isLastPage?: boolean } = {},
): DerivedLessonPageState {
  const safeSession = ensureLessonPageSession(blocks, session);
  const questionDescriptors = getQuestionDescriptors(blocks);
  const advanceAction = options.isLastPage ? 'complete-lesson' : 'next-page';

  if (questionDescriptors.length === 0) {
    return {
      currentQuestion: null,
      questionDescriptors,
      visibleBlockIndexes: new Set(blocks.map((_, index) => index)),
      primaryAction: advanceAction,
      canCheck: false,
      canAdvancePage: true,
    };
  }

  if (safeSession.pageCompleted) {
    return {
      currentQuestion: null,
      questionDescriptors,
      visibleBlockIndexes: new Set(blocks.map((_, index) => index)),
      primaryAction: advanceAction,
      canCheck: false,
      canAdvancePage: true,
    };
  }

  const currentQuestion = questionDescriptors[safeSession.currentQuestionIndex] ?? questionDescriptors[0] ?? null;
  const currentBlock = currentQuestion ? blocks[currentQuestion.blockIndex] : null;
  const currentResponse = currentQuestion ? safeSession.responses[currentQuestion.blockId] : undefined;
  const isCurrentAnswerComplete = currentBlock ? isQuestionResponseComplete(currentBlock, currentResponse) : false;
  const visibleBlockIndexes = new Set(
    blocks.reduce<number[]>((visible, _, blockIndex) => {
      if (currentQuestion && blockIndex <= currentQuestion.blockIndex) {
        visible.push(blockIndex);
      }
      return visible;
    }, []),
  );

  return {
    currentQuestion,
    questionDescriptors,
    visibleBlockIndexes,
    primaryAction:
      safeSession.phase === 'review'
        ? 'next-question'
        : isCurrentAnswerComplete
          ? 'evaluate-question'
          : 'disabled',
    canCheck:
      safeSession.phase === 'review'
        ? safeSession.currentQuestionIndex < questionDescriptors.length - 1
        : isCurrentAnswerComplete,
    canAdvancePage: false,
  };
}

export function updateQuestionResponse(
  blocks: LessonBlock[],
  session: LessonPageSessionState,
  blockId: string,
  response: QuestionResponse,
): LessonPageSessionState {
  const safeSession = ensureLessonPageSession(blocks, session);
  if (safeSession.pageCompleted) {
    return safeSession;
  }

  const questionDescriptors = getQuestionDescriptors(blocks);
  const currentQuestion = questionDescriptors[safeSession.currentQuestionIndex];
  if (!currentQuestion || currentQuestion.blockId !== blockId || safeSession.phase !== 'answering') {
    return safeSession;
  }

  return {
    ...safeSession,
    responses: {
      ...safeSession.responses,
      [blockId]: response,
    },
  };
}

export function stepLessonPageSession(
  blocks: LessonBlock[],
  session: LessonPageSessionState,
): LessonPageSessionState {
  const safeSession = ensureLessonPageSession(blocks, session);
  if (safeSession.pageCompleted) {
    return safeSession;
  }

  const questionDescriptors = getQuestionDescriptors(blocks);
  const currentQuestion = questionDescriptors[safeSession.currentQuestionIndex];
  if (!currentQuestion) {
    return {
      ...safeSession,
      pageCompleted: true,
    };
  }

  if (safeSession.phase === 'review') {
    if (safeSession.currentQuestionIndex >= questionDescriptors.length - 1) {
      return safeSession;
    }

    return {
      ...safeSession,
      currentQuestionIndex: safeSession.currentQuestionIndex + 1,
      phase: 'answering',
    };
  }

  const currentBlock = blocks[currentQuestion.blockIndex];
  if (!currentBlock) {
    return safeSession;
  }

  const response = safeSession.responses[currentQuestion.blockId];
  if (!isQuestionResponseComplete(currentBlock, response)) {
    return safeSession;
  }

  const evaluation = evaluateQuestionBlock(currentBlock, response);
  return {
    ...safeSession,
    evaluations: {
      ...safeSession.evaluations,
      [currentQuestion.blockId]: evaluation,
    },
    phase: 'review',
    pageCompleted: safeSession.currentQuestionIndex >= questionDescriptors.length - 1,
  };
}

export function buildRecordedResults(
  pages: Array<{ page_id: string; blocks: LessonBlock[] }>,
  sessions: Record<string, LessonPageSessionState>,
): Record<string, boolean> {
  return pages.reduce<Record<string, boolean>>((results, page) => {
    const session = ensureLessonPageSession(page.blocks, sessions[page.page_id]);
    for (const descriptor of getQuestionDescriptors(page.blocks)) {
      const evaluation = session.evaluations[descriptor.blockId];
      if (evaluation) {
        results[descriptor.blockId] = evaluation.isCorrect;
      }
    }
    return results;
  }, {});
}

export function isQuestionResponseComplete(block: LessonBlock, response: QuestionResponse): boolean {
  switch (block.type) {
    case 'multiple-choice':
      return Array.isArray(response) && response.length > 0;
    case 'true-false':
      return typeof response === 'boolean';
    case 'fill-blank': {
      const content = block.content as FillBlankContent;
      const blanks = Array.isArray(content.blanks) ? content.blanks : [];
      return (
        Array.isArray(response) &&
        blanks.length > 0 &&
        blanks.every((_, index) => typeof response[index] === 'string' && response[index]!.trim().length > 0)
      );
    }
    case 'matching': {
      const content = block.content as MatchingContent;
      const pairs = Array.isArray(content.pairs) ? content.pairs : [];
      if (!response || Array.isArray(response) || typeof response !== 'object') {
        return false;
      }
      return pairs.length > 0 && pairs.every((pair) => typeof response[pair.id] === 'string' && response[pair.id]!.length > 0);
    }
    case 'sorting':
      return true;
    default:
      return false;
  }
}

export function evaluateQuestionBlock(
  block: LessonBlock,
  response: QuestionResponse,
): QuestionEvaluation {
  switch (block.type) {
    case 'multiple-choice': {
      const content = block.content as MultipleChoiceContent;
      const selectedIds = Array.isArray(response) ? response.filter((value): value is string => typeof value === 'string') : [];
      const options = Array.isArray(content.options) ? content.options : [];
      return {
        isCorrect:
          options.length > 0 &&
          options.every((option) => Boolean(option.isCorrect) === selectedIds.includes(option.id)),
        explanation: normalizeFeedback(content.explanation),
      };
    }
    case 'true-false': {
      const content = block.content as TrueFalseContent;
      return {
        isCorrect: typeof response === 'boolean' && response === Boolean(content.isTrue ?? true),
        explanation: normalizeFeedback(content.explanation),
      };
    }
    case 'fill-blank': {
      const content = block.content as FillBlankContent;
      const blanks = Array.isArray(content.blanks) ? content.blanks : [];
      const answers = Array.isArray(response) ? response : [];
      return {
        isCorrect:
          blanks.length > 0 &&
          blanks.every((blank, index) => {
            const value = normalizeText(answers[index]);
            const accepted = [blank.answer, ...(blank.alternatives ?? [])]
              .map((item) => normalizeText(item))
              .filter(Boolean);
            return accepted.includes(value);
          }),
      };
    }
    case 'matching': {
      const content = block.content as MatchingContent;
      const pairs = Array.isArray(content.pairs) ? content.pairs : [];
      const selectedPairs =
        response && !Array.isArray(response) && typeof response === 'object'
          ? (response as Record<string, string>)
          : {};
      return {
        isCorrect:
          pairs.length > 0 &&
          pairs.every((pair) => selectedPairs[pair.id] !== undefined && selectedPairs[pair.id] === pair.right),
      };
    }
    case 'sorting': {
      const items = Array.isArray(response)
        ? response.filter((value): value is string => typeof value === 'string')
        : block.content.items;
      const isCorrect = JSON.stringify(items) === JSON.stringify(block.content.correctOrder);
      return {
        isCorrect,
        explanation: normalizeFeedback(isCorrect ? block.content.successMsg : block.content.failMsg),
      };
    }
    default:
      return {
        isCorrect: false,
      };
  }
}

function normalizeText(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function normalizeFeedback(value: string | undefined): string | undefined {
  const feedback = value?.trim();
  return feedback ? feedback : undefined;
}
