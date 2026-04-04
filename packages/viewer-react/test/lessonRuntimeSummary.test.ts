import { buildLessonCompletionSummary } from '@/shared/lesson/LessonRuntimePlayer';

describe('buildLessonCompletionSummary', () => {
  it('counts correct and total answers from the recorded result map', () => {
    expect(
      buildLessonCompletionSummary(
        {
          a: true,
          b: false,
          c: true,
        },
        4,
      ),
    ).toEqual({
      correctCount: 2,
      totalCount: 3,
      pageCount: 4,
    });
  });
});
