import { getTrueFalseQuestionLimit, selectQuestionsForQuiz } from './quizRules.ts';

type Question = {
  type: 'mc' | 'mc_multi' | 'tf' | 'match';
  label: string;
};

function mc(label: string): Question {
  return { type: 'mc', label };
}

function tf(label: string): Question {
  return { type: 'tf', label };
}

function assertEquals<T>(actual: T, expected: T, label?: string) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(`${label ? label + ': ' : ''}expected ${b}, got ${a}`);
  }
}

Deno.test('getTrueFalseQuestionLimit: allows one tf per full ten questions', () => {
  assertEquals(getTrueFalseQuestionLimit(5), 0, '5 questions');
  assertEquals(getTrueFalseQuestionLimit(10), 1, '10 questions');
  assertEquals(getTrueFalseQuestionLimit(15), 1, '15 questions');
  assertEquals(getTrueFalseQuestionLimit(20), 2, '20 questions');
});

Deno.test('selectQuestionsForQuiz: keeps tf within cap when extra non-tf questions exist', () => {
  const selected = selectQuestionsForQuiz(
    [
      mc('mc-1'),
      tf('tf-1'),
      mc('mc-2'),
      tf('tf-2'),
      mc('mc-3'),
      mc('mc-4'),
      mc('mc-5'),
      mc('mc-6'),
      mc('mc-7'),
      mc('mc-8'),
      mc('mc-9'),
      tf('tf-3'),
    ],
    10,
  );

  assertEquals(selected.length, 10, 'selected length');
  assertEquals(
    selected.filter((question) => question.type === 'tf').map((question) => question.label),
    ['tf-1'],
    'tf questions',
  );
  assertEquals(
    selected.map((question) => question.label),
    ['mc-1', 'tf-1', 'mc-2', 'mc-3', 'mc-4', 'mc-5', 'mc-6', 'mc-7', 'mc-8', 'mc-9'],
    'selection order',
  );
});

Deno.test('selectQuestionsForQuiz: rejects candidate pools that cannot satisfy the tf cap', () => {
  let thrown: unknown = null;

  try {
    selectQuestionsForQuiz(
      [
        mc('mc-1'),
        tf('tf-1'),
        mc('mc-2'),
        tf('tf-2'),
        mc('mc-3'),
        mc('mc-4'),
        mc('mc-5'),
        mc('mc-6'),
        mc('mc-7'),
        mc('mc-8'),
      ],
      10,
    );
  } catch (error) {
    thrown = error;
  }

  if (!(thrown instanceof Error)) {
    throw new Error('expected selection to throw');
  }
});
