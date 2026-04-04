export const DEMO_ROLE_STORAGE_KEY = 'primoria.viewer.demo-role';

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
