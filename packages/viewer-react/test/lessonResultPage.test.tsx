import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { setSession } from '@/features/auth/authSlice';
import { ViewerRoutes } from '@/app/router';
import { createViewerQueryClient } from '@/shared/api/queryClient';
import { FeatureFlagsProvider } from '@/shared/platform/FeatureFlagsProvider';
import { createAppStore } from '@/shared/state/store';
import { DEMO_ROLE_STORAGE_KEY } from '@/shared/utils/demoMode';

describe('LessonResultPage', () => {
  it('renders completion summary cards and focuses wrong review on answer diffs', async () => {
    window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, 'user');
    const store = createAppStore();
    store.dispatch(
      setSession({
        user: {
          id: 'demo-user',
          email: 'user@demo.primoria.dev',
          displayName: 'Demo Learner',
        },
        role: 'user',
        source: 'demo',
      }),
    );
    const queryClient = createViewerQueryClient();

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <FeatureFlagsProvider>
            <MemoryRouter
              initialEntries={[
                {
                  pathname: '/lesson/lesson-demo-1/result',
                  state: {
                    lessonTitle: 'Foundations',
                    xpAwarded: 120,
                    correctCount: 3,
                    totalCount: 4,
                    pageCount: 2,
                    unlockedAchievements: [{ id: 'achievement-first-course', name: 'Feedback Loop' }],
                    courseCompleted: true,
                    wrongReviewItems: [
                      {
                        blockId: 'match-1',
                        review: {
                          kind: 'matching',
                          prompt: '',
                          explanation: undefined,
                          selectedAnswer: 'A -> Alpha | B -> Alpha',
                          correctAnswer: 'A -> Alpha | B -> Beta',
                          rows: [
                            { id: 'pair-1', left: 'A', selectedRight: 'Alpha', correctRight: 'Alpha', isCorrect: true },
                            { id: 'pair-2', left: 'B', selectedRight: 'Alpha', correctRight: 'Beta', isCorrect: false },
                          ],
                        },
                      },
                      {
                        blockId: 'mc-1',
                        review: {
                          kind: 'multiple-choice',
                          prompt:
                            'According to the learning material, what are the key benefits of short iterations in software development? Select all that apply.',
                          explanation: 'Short iterations facilitate quicker feedback and adaptation to change.',
                          selectedAnswer:
                            'They help deal with change and keep the team motivated. | They ensure that all features are fully tested and bug-free before release.',
                          correctAnswer:
                            'They help deal with change and keep the team motivated. | They allow for earlier feedback and adjustments to the plan.',
                          selectedOptionTexts: [
                            'They help deal with change and keep the team motivated.',
                            'They ensure that all features are fully tested and bug-free before release.',
                          ],
                          correctOptionTexts: [
                            'They help deal with change and keep the team motivated.',
                            'They allow for earlier feedback and adjustments to the plan.',
                          ],
                        },
                      },
                      {
                        blockId: 'tf-1',
                        review: {
                          kind: 'true-false',
                          prompt: 'The requirement is technical.',
                          explanation: 'Requirements describe user needs.',
                          selectedAnswer: 'false',
                          correctAnswer: 'true',
                          selectedValue: false,
                          correctValue: true,
                        },
                      },
                    ],
                  },
                },
              ]}
            >
              <ViewerRoutes />
            </MemoryRouter>
          </FeatureFlagsProvider>
        </QueryClientProvider>
      </Provider>,
    );

    expect(await screen.findByRole('heading', { name: /Result summary/i }, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByText(/^120$/i)).toBeInTheDocument();
    expect(screen.getByText(/^3\/4$/i)).toBeInTheDocument();
    expect(screen.getByText(/^2$/i)).toBeInTheDocument();
    expect(screen.getByText(/Feedback Loop/i)).toBeInTheDocument();
    expect(screen.getByText(/completed the current course enrollment/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Review wrong answers/i })).toBeInTheDocument();
    const matchingReviewCard = screen.getByText(/Matching question/i).closest('article');
    expect(matchingReviewCard).not.toBeNull();
    const scopedMatchingReview = within(matchingReviewCard!);
    expect(scopedMatchingReview.getAllByText(/Correct match/i)).toHaveLength(1);
    expect(scopedMatchingReview.queryByText(/^A$/)).not.toBeInTheDocument();
    expect(scopedMatchingReview.getByText(/^B$/)).toBeInTheDocument();

    const multipleChoiceReviewCard = screen.getByText(/According to the learning material/i).closest('article');
    expect(multipleChoiceReviewCard).not.toBeNull();
    const scopedMultipleChoiceReview = within(multipleChoiceReviewCard!);
    expect(scopedMultipleChoiceReview.getByText(/Incorrect selections/i)).toBeInTheDocument();
    expect(scopedMultipleChoiceReview.getByText(/Missed correct answers/i)).toBeInTheDocument();
    expect(scopedMultipleChoiceReview.queryByText(/^Your answer$/i)).not.toBeInTheDocument();
    expect(scopedMultipleChoiceReview.queryByText(/^Correct answer$/i)).not.toBeInTheDocument();
    expect(scopedMultipleChoiceReview.getByText(/They ensure that all features are fully tested and bug-free before release\./i)).toBeInTheDocument();
    expect(scopedMultipleChoiceReview.getByText(/They allow for earlier feedback and adjustments to the plan\./i)).toBeInTheDocument();
    expect(screen.getByText(/The requirement is technical./i)).toBeInTheDocument();
    expect(screen.getByText(/Requirements describe user needs./i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Return to course/i })).toBeInTheDocument();
  });

  it('renders only the missed-correct panel when a multiple-choice answer has no wrong selections', async () => {
    window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, 'user');
    const store = createAppStore();
    store.dispatch(
      setSession({
        user: {
          id: 'demo-user',
          email: 'user@demo.primoria.dev',
          displayName: 'Demo Learner',
        },
        role: 'user',
        source: 'demo',
      }),
    );
    const queryClient = createViewerQueryClient();

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <FeatureFlagsProvider>
            <MemoryRouter
              initialEntries={[
                {
                  pathname: '/lesson/lesson-demo-1/result',
                  state: {
                    lessonTitle: 'Foundations',
                    xpAwarded: 120,
                    correctCount: 1,
                    totalCount: 2,
                    pageCount: 1,
                    wrongReviewItems: [
                      {
                        blockId: 'mc-2',
                        review: {
                          kind: 'multiple-choice',
                          prompt: 'Select all practices that support reliable releases.',
                          explanation: 'Reliable releases still require targeted testing and review.',
                          selectedAnswer: 'Collect early feedback',
                          correctAnswer: 'Collect early feedback | Review test coverage',
                          selectedOptionTexts: ['Collect early feedback'],
                          correctOptionTexts: ['Collect early feedback', 'Review test coverage'],
                        },
                      },
                    ],
                  },
                },
              ]}
            >
              <ViewerRoutes />
            </MemoryRouter>
          </FeatureFlagsProvider>
        </QueryClientProvider>
      </Provider>,
    );

    expect(await screen.findByRole('heading', { name: /Result summary/i }, { timeout: 10000 })).toBeInTheDocument();
    const reviewCard = screen.getByText(/Select all practices that support reliable releases\./i).closest('article');
    expect(reviewCard).not.toBeNull();
    const scopedReview = within(reviewCard!);

    expect(scopedReview.queryByText(/Incorrect selections/i)).not.toBeInTheDocument();
    expect(scopedReview.getByText(/Missed correct answers/i)).toBeInTheDocument();
    expect(scopedReview.getByText(/Review test coverage/i)).toBeInTheDocument();
  });
});
