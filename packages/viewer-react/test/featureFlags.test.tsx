import { render, screen, waitFor } from '@testing-library/react';

describe('FeatureFlagsProvider', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('respects environment flag overrides before PostHog loads', async () => {
    vi.stubEnv('VITE_VIEWER_REACT_ENABLED', 'false');
    vi.stubEnv('VITE_VIEWER_AI_TUTOR_ENABLED', 'true');
    vi.stubEnv('VITE_VIEWER_COMMUNITY_ENABLED', 'false');

    const { FeatureFlagsProvider, useFeatureFlags } = await import('@/shared/platform/FeatureFlagsProvider');

    function Probe() {
      const { ready, flags } = useFeatureFlags();
      return (
        <div>
          <span data-testid="ready">{ready ? 'ready' : 'booting'}</span>
          <span data-testid="viewer-react">{String(flags.viewer_react_enabled)}</span>
          <span data-testid="viewer-ai">{String(flags.viewer_ai_tutor_enabled)}</span>
          <span data-testid="viewer-community">{String(flags.viewer_community_enabled)}</span>
        </div>
      );
    }

    render(
      <FeatureFlagsProvider>
        <Probe />
      </FeatureFlagsProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('ready'));
    expect(screen.getByTestId('viewer-react')).toHaveTextContent('false');
    expect(screen.getByTestId('viewer-ai')).toHaveTextContent('true');
    expect(screen.getByTestId('viewer-community')).toHaveTextContent('false');
  });
});
