import { AppProviders } from '@/app/AppProviders';
import { AppRouter } from '@/app/router';
import { FeatureDisabledState } from '@/shared/layout/AsyncState';
import { AppErrorBoundary } from '@/shared/layout/AppErrorBoundary';
import { useFeatureFlag } from '@/shared/platform/FeatureFlagsProvider';
import { useCoreCopy } from '@/shared/theme/coreCopy';

function ViewerReleaseGate() {
  const enabled = useFeatureFlag('viewer_react_enabled');
  const copy = useCoreCopy();

  if (enabled) {
    return <AppRouter />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--viewer-page)] px-4">
      <div className="w-full max-w-xl">
        <FeatureDisabledState
          title={copy.releaseGate.title}
          message={copy.releaseGate.message}
        />
      </div>
    </div>
  );
}

export function App() {
  return (
    <AppProviders>
      <AppErrorBoundary>
        <ViewerReleaseGate />
      </AppErrorBoundary>
    </AppProviders>
  );
}
