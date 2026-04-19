export type QuizQuestionType = 'mc' | 'mc_multi' | 'tf' | 'match';

export type QuizQuestionLike = {
  type: QuizQuestionType;
};

export function getTrueFalseQuestionLimit(questionCount: number) {
  return Math.floor(questionCount / 10);
}

export function selectQuestionsForQuiz<T extends QuizQuestionLike>(questions: T[], questionCount: number) {
  const trueFalseLimit = getTrueFalseQuestionLimit(questionCount);
  const selected: T[] = [];
  const deferredTrueFalse: T[] = [];
  let selectedTrueFalseCount = 0;

  for (const question of questions) {
    if (selected.length >= questionCount) {
      break;
    }

    if (question.type === 'tf' && selectedTrueFalseCount >= trueFalseLimit) {
      deferredTrueFalse.push(question);
      continue;
    }

    if (question.type === 'tf') {
      selectedTrueFalseCount += 1;
    }

    selected.push(question);
  }

  // Exact count is the non-negotiable guarantee. If respecting the tf cap
  // leaves us short of questionCount, backfill from the deferred tf pool so
  // the caller always sees exactly N questions when Gemini supplied enough
  // raw items.
  for (const question of deferredTrueFalse) {
    if (selected.length >= questionCount) {
      break;
    }
    selected.push(question);
  }

  return selected;
}
