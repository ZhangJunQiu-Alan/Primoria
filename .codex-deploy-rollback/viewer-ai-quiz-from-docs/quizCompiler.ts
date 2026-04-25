import { z } from 'npm:zod@3.25.76';

const questionBaseSchema = z.object({
  type: z.enum(['mc', 'mc_multi', 'tf', 'match']),
});

const multipleChoiceQuestionSchema = questionBaseSchema.extend({
  type: z.literal('mc'),
  q: z.string().min(1),
  opts: z.array(z.string().min(1)).min(2),
  exp: z.string().min(1),
});

const multiSelectQuestionSchema = questionBaseSchema.extend({
  type: z.literal('mc_multi'),
  q: z.string().min(1),
  opts: z.array(z.string().min(1)).min(2),
  exp: z.string().min(1),
});

const trueFalseQuestionSchema = questionBaseSchema.extend({
  type: z.literal('tf'),
  stmt: z.string().min(1),
  ans: z.boolean(),
  exp: z.string().min(1),
});

const matchingQuestionSchema = questionBaseSchema.extend({
  type: z.literal('match'),
  pairs: z.array(z.tuple([z.string().min(1), z.string().min(1)])).min(2),
});

export const QuizDslSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  questions: z.array(
    z.union([
      multipleChoiceQuestionSchema,
      multiSelectQuestionSchema,
      trueFalseQuestionSchema,
      matchingQuestionSchema,
    ]),
  ),
});

export type QuizDsl = z.infer<typeof QuizDslSchema>;

type QuizQuestion = QuizDsl['questions'][number];

function normalizeOption(option: string) {
  const trimmed = option.trim();
  const isCorrect = /\*$/.test(trimmed);
  return {
    text: trimmed.replace(/\*$/, '').trim(),
    isCorrect,
  };
}

function randomId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function buildMultipleChoiceBlock(question: Extract<QuizQuestion, { type: 'mc' | 'mc_multi' }>, order: number) {
  const options = question.opts.map((option, index) => {
    const normalized = normalizeOption(option);
    return {
      id: randomId(`option-${order}-${index}`),
      text: normalized.text,
      isCorrect: normalized.isCorrect,
    };
  });

  const correctCount = options.filter((option) => option.isCorrect).length;
  if (question.type === 'mc' && correctCount !== 1) {
    throw new Error(`Question ${order + 1} must contain exactly one correct option.`);
  }
  if (question.type === 'mc_multi' && correctCount < 2) {
    throw new Error(`Question ${order + 1} must contain at least two correct options.`);
  }

  return {
    id: randomId('block-mc'),
    type: 'multiple-choice',
    position: { order },
    content: {
      question: question.q,
      allowMultiple: question.type === 'mc_multi',
      options,
      explanation: question.exp,
    },
  };
}

function buildTrueFalseBlock(question: Extract<QuizQuestion, { type: 'tf' }>, order: number) {
  return {
    id: randomId('block-tf'),
    type: 'true-false',
    position: { order },
    content: {
      statement: question.stmt,
      isTrue: question.ans,
      explanation: question.exp,
    },
  };
}

function buildMatchingBlock(question: Extract<QuizQuestion, { type: 'match' }>, order: number) {
  return {
    id: randomId('block-match'),
    type: 'matching',
    position: { order },
    content: {
      pairs: question.pairs.map(([left, right]) => ({
        id: randomId('pair'),
        left,
        right,
      })),
    },
  };
}

function buildBlock(question: QuizQuestion, order: number) {
  if (question.type === 'mc' || question.type === 'mc_multi') {
    return buildMultipleChoiceBlock(question, order);
  }

  if (question.type === 'tf') {
    return buildTrueFalseBlock(question, order);
  }

  return buildMatchingBlock(question, order);
}

export function compileQuizDslToLessonContent(dsl: QuizDsl) {
  const pages = dsl.questions.reduce<Array<{ page_id: string; order: number; blocks: unknown[] }>>(
    (accumulator, question, index) => {
      const pageIndex = Math.floor(index / 5);
      const current =
        accumulator[pageIndex] ??
        {
          page_id: randomId('page'),
          order: pageIndex,
          blocks: [],
        };

      current.blocks.push(buildBlock(question, current.blocks.length));
      accumulator[pageIndex] = current;
      return accumulator;
    },
    [],
  );

  const lessonId = crypto.randomUUID();
  return {
    lessonId,
    lessonTitle: dsl.title,
    contentJson: {
      lesson_id: lessonId,
      title: dsl.title,
      pages,
    },
  };
}
