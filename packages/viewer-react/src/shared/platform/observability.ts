import { runtimeEnv, type ViewerFeatureFlag } from '@/shared/config/runtimeEnv';

type ViewerUserContext = {
  id: string;
  email?: string;
  displayName?: string;
  role?: string | null;
};

type ViewerEventProperties = Record<string, string | number | boolean | null | undefined>;
type SentryModule = typeof import('@sentry/browser');
type PostHogModule = typeof import('posthog-js');

const defaultFlags: Record<ViewerFeatureFlag, boolean> = {
  viewer_react_enabled: true,
  viewer_ai_tutor_enabled: true,
  viewer_community_enabled: true,
};

let initialized = false;
let initializationPromise: Promise<void> | null = null;
let sentryPromise: Promise<SentryModule> | null = null;
let posthogPromise: Promise<PostHogModule> | null = null;
let posthogClient: PostHogModule['default'] | null = null;

function observabilityEnabled() {
  return typeof window !== 'undefined' && !runtimeEnv.fixtureMode;
}

function posthogReady() {
  return Boolean(runtimeEnv.posthogKey && runtimeEnv.posthogHost);
}

async function loadSentry() {
  if (!sentryPromise) {
    sentryPromise = import('@sentry/browser');
  }
  return sentryPromise;
}

async function loadPostHog() {
  if (!posthogPromise) {
    posthogPromise = import('posthog-js');
  }
  return posthogPromise;
}

export function initObservability() {
  if (initialized || !observabilityEnabled()) {
    return initializationPromise ?? Promise.resolve();
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      if (runtimeEnv.sentryDsn) {
        const Sentry = await loadSentry();
        Sentry.init({
          dsn: runtimeEnv.sentryDsn,
          release: runtimeEnv.viewerRelease,
          environment: import.meta.env.MODE,
          tracesSampleRate: 0.2,
        });
      }

      if (posthogReady()) {
        const posthog = (await loadPostHog()).default;
        posthog.init(runtimeEnv.posthogKey, {
          api_host: runtimeEnv.posthogHost,
          capture_pageview: false,
          capture_pageleave: true,
          persistence: 'localStorage+cookie',
          loaded: (client) => {
            client.register({
              viewer_release: runtimeEnv.viewerRelease,
              viewer_runtime_mode: import.meta.env.MODE,
            });
          },
        });
        posthogClient = posthog;
      }

      initialized = true;
    })();
  }

  return initializationPromise;
}

export function captureViewerError(error: unknown, context?: ViewerEventProperties) {
  if (!observabilityEnabled()) {
    return;
  }

  const normalized = error instanceof Error ? error : new Error(String(error));

  if (runtimeEnv.sentryDsn) {
    void loadSentry().then((Sentry) => {
      Sentry.captureException(normalized, { extra: context });
    });
  }

  if (posthogReady()) {
    void initObservability().then(() => {
      posthogClient?.capture('viewer_error', {
        message: normalized.message,
        ...context,
      });
    });
  }
}

export function captureViewerEvent(name: string, properties?: ViewerEventProperties) {
  if (!observabilityEnabled()) {
    return;
  }

  if (runtimeEnv.sentryDsn) {
    void loadSentry().then((Sentry) => {
      Sentry.addBreadcrumb({
        category: 'viewer.event',
        message: name,
        level: 'info',
        data: properties,
      });
    });
  }

  if (posthogReady()) {
    void initObservability().then(() => {
      posthogClient?.capture(name, properties);
    });
  }
}

export function trackViewerRoute(pathname: string) {
  captureViewerEvent('viewer_page_view', { pathname });
}

export function setViewerUserContext(user: ViewerUserContext) {
  if (!observabilityEnabled()) {
    return;
  }

  if (runtimeEnv.sentryDsn) {
    void loadSentry().then((Sentry) => {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.displayName,
      });
    });
  }

  if (posthogReady()) {
    void initObservability().then(() => {
      posthogClient?.identify(user.id, {
        email: user.email,
        display_name: user.displayName,
        role: user.role ?? undefined,
      });
    });
  }
}

export function clearViewerUserContext() {
  if (!observabilityEnabled()) {
    return;
  }

  if (runtimeEnv.sentryDsn) {
    void loadSentry().then((Sentry) => {
      Sentry.setUser(null);
    });
  }

  if (posthogReady()) {
    void initObservability().then(() => {
      posthogClient?.reset();
    });
  }
}

function resolveFeatureFlag(flag: ViewerFeatureFlag) {
  const override = runtimeEnv.featureFlagOverrides[flag];
  if (override !== null) {
    return override;
  }
  if (!posthogClient) {
    return defaultFlags[flag];
  }
  const next = posthogClient.isFeatureEnabled(flag);
  return typeof next === 'boolean' ? next : defaultFlags[flag];
}

export function getViewerFeatureFlags() {
  return {
    viewer_react_enabled: resolveFeatureFlag('viewer_react_enabled'),
    viewer_ai_tutor_enabled: resolveFeatureFlag('viewer_ai_tutor_enabled'),
    viewer_community_enabled: resolveFeatureFlag('viewer_community_enabled'),
  };
}

export function subscribeViewerFeatureFlags(onChange: (flags: Record<ViewerFeatureFlag, boolean>) => void) {
  onChange(getViewerFeatureFlags());
  if (!posthogReady()) {
    return () => undefined;
  }

  let active = true;
  void initObservability().then(() => {
    if (!active || !posthogClient) {
      return;
    }
    onChange(getViewerFeatureFlags());
    posthogClient.onFeatureFlags(() => {
      if (active) {
        onChange(getViewerFeatureFlags());
      }
    });
  });

  return () => {
    active = false;
  };
}
