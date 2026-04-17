import { interleaveQuestionTypes } from './quizCompiler.ts';
import type { QuizDsl } from './quizCompiler.ts';

type Question = QuizDsl['questions'][number];

function mc(tag: string): Question {
  return {
    type: 'mc',
    q: tag,
    opts: ['a', 'b*'],
    exp: 'e',
  };
}

function tf(tag: string): Question {
  return {
    type: 'tf',
    stmt: tag,
    ans: true,
    exp: 'e',
  };
}

function match(tag: string): Question {
  return {
    type: 'match',
    pairs: [
      [`${tag}-L1`, `${tag}-R1`],
      [`${tag}-L2`, `${tag}-R2`],
    ],
  };
}

Deno.test('interleaveQuestionTypes: avoids adjacent same-type when possible', () => {
  const input: Question[] = [
    mc('1'), mc('2'), mc('3'), mc('4'), mc('5'), mc('6'),
    tf('a'), tf('b'),
    match('x'), match('y'),
  ];

  const output = interleaveQuestionTypes(input);

  if (output.length !== input.length) {
    throw new Error(`expected length ${input.length}, got ${output.length}`);
  }

  for (let i = 1; i < output.length; i += 1) {
    const prev = output[i - 1];
    const curr = output[i];
    if (prev.type === curr.type && curr.type !== 'mc') {
      throw new Error(`tf/match should not cluster at index ${i}: ${prev.type} -> ${curr.type}`);
    }
  }
});

Deno.test('interleaveQuestionTypes: preserves every original question exactly once', () => {
  const input: Question[] = [mc('1'), tf('a'), match('x'), mc('2'), tf('b')];
  const output = interleaveQuestionTypes(input);

  if (output.length !== input.length) {
    throw new Error(`length mismatch: ${output.length} vs ${input.length}`);
  }

  for (const original of input) {
    if (!output.includes(original)) {
      throw new Error(`missing question: ${JSON.stringify(original)}`);
    }
  }
});

Deno.test('interleaveQuestionTypes: empty input returns empty', () => {
  const output = interleaveQuestionTypes([]);
  if (output.length !== 0) {
    throw new Error('expected empty output');
  }
});
