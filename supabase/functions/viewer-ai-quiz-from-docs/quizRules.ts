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
  let selectedTrueFalseCount = 0;

  for (const question of questions) {
    if (selected.length >= questionCount) {
      break;
    }

    if (question.type === 'tf') {
      if (selectedTrueFalseCount >= trueFalseLimit) {
        continue;
      }
      selectedTrueFalseCount += 1;
    }

    selected.push(question);
  }

  if (selected.length < questionCount) {
    const trueFalseCount = questions.filter((question) => question.type === 'tf').length;
    throw new Error(
      `Quiz candidate pool violates the true/false cap: received ${trueFalseCount} tf questions for a ${questionCount}-question quiz.`,
    );
  }

  return selected;
}
