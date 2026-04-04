type FeatureFlagName =
  | 'viewer_react_enabled'
  | 'viewer_ai_tutor_enabled'
  | 'viewer_community_enabled';

function readEnv(name: string) {
  const raw = import.meta.env[name as keyof ImportMetaEnv];
  return typeof raw === 'string' ? raw.trim() : '';
}

function readBooleanEnv(name: string): boolean | null {
  const raw = readEnv(name).toLowerCase();
  if (raw === '1' || raw === 'true') {
    return true;
  }
  if (raw === '0' || raw === 'false') {
    return false;
  }
  return null;
}

function readFeatureFlagOverride(flag: FeatureFlagName) {
  const envName = `VITE_${flag.toUpperCase()}`;
  return readBooleanEnv(envName);
}

export const runtimeEnv = {
  fixtureMode:
    readEnv('VITE_VIEWER_DEMO_MODE') === '1' ||
    (import.meta.env.MODE === 'test' && readEnv('VITE_VIEWER_TEST_FIXTURES') !== '0'),
  sentryDsn: readEnv('VITE_SENTRY_DSN'),
  posthogKey: readEnv('VITE_POSTHOG_KEY'),
  posthogHost: readEnv('VITE_POSTHOG_HOST'),
  webPushPublicKey: readEnv('VITE_WEB_PUSH_PUBLIC_KEY'),
  viewerRelease: readEnv('VITE_VIEWER_RELEASE') || 'viewer-react-local',
  featureFlagOverrides: {
    viewer_react_enabled: readFeatureFlagOverride('viewer_react_enabled'),
    viewer_ai_tutor_enabled: readFeatureFlagOverride('viewer_ai_tutor_enabled'),
    viewer_community_enabled: readFeatureFlagOverride('viewer_community_enabled'),
  },
} as const;

export type ViewerFeatureFlag = keyof typeof runtimeEnv.featureFlagOverrides;
