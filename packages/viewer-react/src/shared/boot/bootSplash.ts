import { useEffect } from 'react';
import { VIEWER_PREFERENCES_STORAGE_KEY } from '@/shared/state/preferencesSlice';

const BOOT_SPLASH_ID = 'viewer-boot-splash';
const BOOT_SPLASH_LABEL_ID = 'viewer-boot-splash-label';
const EXIT_DURATION_MS = 280;

const EXPLICIT_BOOT_ROUTES = [
  /^\/home(?:\/|$)/,
  /^\/library(?:\/|$)/,
  /^\/profile(?:\/|$)/,
  /^\/course\/[^/]+(?:\/|$)/,
];

type BootSplashState = {
  active: boolean;
  authSettled: boolean;
  routeSettled: boolean;
  hidden: boolean;
  removalTimer: number | null;
};

const bootSplashState: BootSplashState = {
  active: false,
  authSettled: false,
  routeSettled: false,
  hidden: false,
  removalTimer: null,
};

function getBootSplashElement() {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(BOOT_SPLASH_ID);
}

function isExplicitBootRoute(pathname: string) {
  return EXPLICIT_BOOT_ROUTES.some((pattern) => pattern.test(pathname));
}

function syncBootSplashPreferences() {
  if (typeof window === 'undefined') {
    return;
  }

  let language = 'zh-CN';

  try {
    const raw = window.localStorage.getItem(VIEWER_PREFERENCES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        language?: string;
        themeMode?: 'light' | 'dark' | 'system';
      };
      if (parsed.language && parsed.language.trim().toLowerCase().startsWith('en')) {
        language = 'en';
      }
      if (parsed.themeMode === 'dark') {
        document.documentElement.dataset.theme = 'dark';
      } else if (parsed.themeMode === 'light') {
        document.documentElement.dataset.theme = 'light';
      }
    }
  } catch {
    // Ignore malformed local storage and fall back to defaults.
  }

  document.documentElement.lang = language;
  const label = document.getElementById(BOOT_SPLASH_LABEL_ID);
  if (label) {
    label.textContent = language === 'zh-CN' ? '正在准备学习空间' : 'Preparing your learning space';
  }
}

function hideBootSplash() {
  const element = getBootSplashElement();
  if (!element || bootSplashState.hidden) {
    return;
  }

  bootSplashState.hidden = true;
  element.dataset.state = 'exit';
  bootSplashState.removalTimer = window.setTimeout(() => {
    element.remove();
    bootSplashState.active = false;
    bootSplashState.removalTimer = null;
  }, EXIT_DURATION_MS);
}

function flushBootSplash() {
  if (!bootSplashState.active || bootSplashState.hidden) {
    return;
  }

  if (bootSplashState.authSettled && bootSplashState.routeSettled) {
    hideBootSplash();
  }
}

export function initializeBootSplash() {
  const element = getBootSplashElement();
  if (!element) {
    return;
  }

  syncBootSplashPreferences();
  bootSplashState.active = true;
  bootSplashState.hidden = false;
  bootSplashState.authSettled = false;
  bootSplashState.routeSettled =
    typeof window !== 'undefined' ? !isExplicitBootRoute(window.location.pathname) : true;
  element.dataset.state = 'visible';
}

export function trackBootSplashRoute(pathname: string) {
  if (!bootSplashState.active || bootSplashState.hidden) {
    return;
  }

  bootSplashState.routeSettled = !isExplicitBootRoute(pathname);
  flushBootSplash();
}

export function markBootSplashAuthSettled() {
  if (!bootSplashState.active || bootSplashState.hidden) {
    return;
  }

  bootSplashState.authSettled = true;
  flushBootSplash();
}

export function markBootSplashRouteSettled() {
  if (!bootSplashState.active || bootSplashState.hidden) {
    return;
  }

  bootSplashState.routeSettled = true;
  flushBootSplash();
}

export function useBootSplashGate(isReady: boolean) {
  useEffect(() => {
    if (isReady) {
      markBootSplashRouteSettled();
    }
  }, [isReady]);
}

export function resetBootSplashForTests() {
  if (bootSplashState.removalTimer != null) {
    window.clearTimeout(bootSplashState.removalTimer);
  }

  bootSplashState.active = false;
  bootSplashState.authSettled = false;
  bootSplashState.routeSettled = false;
  bootSplashState.hidden = false;
  bootSplashState.removalTimer = null;
}
