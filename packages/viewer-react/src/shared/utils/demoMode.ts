export const DEMO_ROLE_STORAGE_KEY = 'primoria.viewer.demo-role';

function readDefaultDemoRole() {
  const raw = (import.meta.env.VITE_VIEWER_DEFAULT_DEMO_ROLE as string | undefined)?.trim().toLowerCase() ?? '';
  return raw || null;
}

export function isFixtureModeEnabled() {
  const explicitDemoMode = (import.meta.env.VITE_VIEWER_DEMO_MODE as string | undefined)?.trim() === '1';
  const disableTestFixtures = (import.meta.env.VITE_VIEWER_TEST_FIXTURES as string | undefined)?.trim() === '0';
  return explicitDemoMode || (import.meta.env.MODE === 'test' && !disableTestFixtures);
}

function canUseDemoMode() {
  return isFixtureModeEnabled();
}

export function getDemoRole() {
  if (!canUseDemoMode() || typeof window === 'undefined') {
    return null;
  }

  const value = window.localStorage.getItem(DEMO_ROLE_STORAGE_KEY)?.trim().toLowerCase() ?? '';
  return value || null;
}

export function isDemoModeEnabled() {
  return getDemoRole() !== null;
}

export function seedDemoRole(role: string) {
  if (!canUseDemoMode() || typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, role);
}

export function clearDemoRole() {
  if (!canUseDemoMode() || typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(DEMO_ROLE_STORAGE_KEY);
}

export function ensureDefaultDemoRole() {
  if (!canUseDemoMode() || typeof window === 'undefined') {
    return;
  }

  const current = window.localStorage.getItem(DEMO_ROLE_STORAGE_KEY)?.trim().toLowerCase() ?? '';
  if (current) {
    return;
  }

  const fallbackRole = readDefaultDemoRole();
  if (fallbackRole) {
    window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, fallbackRole);
  }
}
