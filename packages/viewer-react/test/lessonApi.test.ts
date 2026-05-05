const singleMock = vi.fn();
const eqMock = vi.fn(() => ({ single: singleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock('@/shared/api/supabase', () => ({
  supabase: {
    from: fromMock,
    rpc: vi.fn(),
  },
}));

describe('fetchLessonRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
  });

  it('applies the default visibility rule to page blocks when legacy content omits visibilityRule', async () => {
    singleMock.mockResolvedValue({
      data: {
        id: 'lesson-visibility',
        course_id: 'course-1',
        title: 'Visibility lesson',
        xp_reward: 12,
        duration_seconds: 180,
        content_json: {
          lesson_id: 'lesson-visibility',
          title: 'Visibility lesson',
          pages: [
            {
              page_id: 'page-1',
              order: 0,
              blocks: [
                {
                  id: 'question-1',
                  type: 'multiple-choice',
                  content: {
                    question: 'Question 1',
                    options: [{ id: 'option-1', text: 'A', isCorrect: true }],
                  },
                },
                {
                  id: 'text-1',
                  type: 'text',
                  content: {
                    text: 'This block should stay gated by default.',
                  },
                },
                {
                  id: 'text-2',
                  type: 'text',
                  visibility_rule: 'always',
                  content: {
                    text: 'This block is explicitly always visible.',
                  },
                },
              ],
            },
          ],
        },
      },
      error: null,
    });

    const { fetchLessonRuntime } = await import('@/shared/api/viewer/lessonApi');
    const runtime = await fetchLessonRuntime('lesson-visibility');

    expect(runtime?.pages[0]?.blocks.map((block) => block.visibilityRule)).toEqual([
      'always',
      'afterPreviousCorrect',
      'always',
    ]);
  });

  it('preserves explanation fields for multiple-choice and true-false blocks', async () => {
    singleMock.mockResolvedValue({
      data: {
        id: 'lesson-explanation',
        course_id: 'course-2',
        title: 'Explanation lesson',
        xp_reward: 20,
        duration_seconds: 240,
        content_json: {
          lesson_id: 'lesson-explanation',
          title: 'Explanation lesson',
          pages: [
            {
              page_id: 'page-1',
              order: 0,
              blocks: [
                {
                  id: 'question-1',
                  type: 'multiple-choice',
                  content: {
                    question: 'Question 1',
                    explanation: 'Pick A because it matches the reading.',
                    options: [{ id: 'option-1', text: 'A', isCorrect: true }],
                  },
                },
                {
                  id: 'question-2',
                  type: 'true-false',
                  content: {
                    statement: 'Statement 2',
                    isTrue: false,
                    explanation: 'This statement is false in the source material.',
                  },
                },
              ],
            },
          ],
        },
      },
      error: null,
    });

    const { fetchLessonRuntime } = await import('@/shared/api/viewer/lessonApi');
    const runtime = await fetchLessonRuntime('lesson-explanation');

    expect(runtime?.pages[0]?.blocks[0]?.content).toMatchObject({
      explanation: 'Pick A because it matches the reading.',
    });
    expect(runtime?.pages[0]?.blocks[1]?.content).toMatchObject({
      explanation: 'This statement is false in the source material.',
    });
  });

  it('preserves generated interactive visual HTML and metadata for lesson runtime rendering', async () => {
    singleMock.mockResolvedValue({
      data: {
        id: 'lesson-interactive-visual',
        course_id: 'course-3',
        title: 'Interactive visual lesson',
        xp_reward: 25,
        duration_seconds: 300,
        content_json: {
          lesson_id: 'lesson-interactive-visual',
          title: 'Interactive visual lesson',
          pages: [
            {
              page_id: 'page-1',
              order: 0,
              blocks: [
                {
                  id: 'visual-1',
                  type: 'interactive-visual',
                  content: {
                    template: 'unit-circle-sine-cosine',
                    title: 'Trig explorer',
                    description: 'Interactive trig graph',
                    generated_html: '<div>visual</div>',
                    theme_tone: 'botanical-sage',
                    ai_prompt: 'Show sin and cosine together',
                  },
                },
              ],
            },
          ],
        },
      },
      error: null,
    });

    const { fetchLessonRuntime } = await import('@/shared/api/viewer/lessonApi');
    const runtime = await fetchLessonRuntime('lesson-interactive-visual');

    expect(runtime?.pages[0]?.blocks[0]?.content).toMatchObject({
      template: 'unit-circle-sine-cosine',
      title: 'Trig explorer',
      description: 'Interactive trig graph',
      generatedHtml: '<div>visual</div>',
      themeTone: 'botanical-sage',
      aiPrompt: 'Show sin and cosine together',
    });
  });
});
