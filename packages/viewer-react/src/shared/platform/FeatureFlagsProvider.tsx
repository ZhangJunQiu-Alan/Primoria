import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  getViewerFeatureFlags,
  initObservability,
  subscribeViewerFeatureFlags,
} from '@/shared/platform/observability';
import type { ViewerFeatureFlag } from '@/shared/config/runtimeEnv';

type FeatureFlagContextValue = {
  ready: boolean;
  flags: Record<ViewerFeatureFlag, boolean>;
};

const defaultFlags = getViewerFeatureFlags();

const FeatureFlagsContext = createContext<FeatureFlagContextValue>({
  ready: false,
  flags: defaultFlags,
});

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState(defaultFlags);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initObservability();
    const unsubscribe = subscribeViewerFeatureFlags((next) => {
      setFlags(next);
      setReady(true);
    });
    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      ready,
      flags,
    }),
    [flags, ready],
  );

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}

export function useFeatureFlag(flag: ViewerFeatureFlag) {
  return useFeatureFlags().flags[flag];
}
