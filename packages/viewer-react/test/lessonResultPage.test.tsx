import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { setSession } from '@/features/auth/authSlice';
import { ViewerRoutes } from '@/app/router';
import { createViewerQueryClient } from '@/shared/api/queryClient';
import { FeatureFlagsProvider } from '@/shared/platform/FeatureFlagsProvider';
import { createAppStore } from '@/shared/state/store';
import { DEMO_ROLE_STORAGE_KEY } from '@/shared/utils/demoMode';

describe('LessonResultPage', () => {
  it('renders completion summary cards and follow-up actions', async () => {
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
    expect(screen.getByText(/Matching question/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Correct match/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/The requirement is technical./i)).toBeInTheDocument();
    expect(screen.getByText(/Requirements describe user needs./i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Return to course/i })).toBeInTheDocument();
  });
});
