import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './features/public/builderAuth.css';
import { App } from './App';
import { initializeBootSplash } from './shared/boot/bootSplash';
import { ensureDefaultDemoRole } from './shared/utils/demoMode';

const PRELOAD_RECOVERY_STORAGE_KEY = 'viewer-preload-recovery';
const PRELOAD_RECOVERY_WINDOW_MS = 15_000;

function installPreloadRecovery() {
  if (typeof window === 'undefined') {
    return;
  }

  window.addEventListener('vite:preloadError', (event) => {
    let shouldReload = true;

    try {
      const raw = window.sessionStorage.getItem(PRELOAD_RECOVERY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { at?: number; path?: string };
        if (
          parsed.path === window.location.pathname &&
          typeof parsed.at === 'number' &&
          Date.now() - parsed.at < PRELOAD_RECOVERY_WINDOW_MS
        ) {
          shouldReload = false;
        }
      }

      if (shouldReload) {
        window.sessionStorage.setItem(
          PRELOAD_RECOVERY_STORAGE_KEY,
          JSON.stringify({
            at: Date.now(),
            path: window.location.pathname,
          }),
        );
      }
    } catch {
      shouldReload = true;
    }

    if (!shouldReload) {
      return;
    }

    event.preventDefault();
    window.location.reload();
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Missing root element');
}

ensureDefaultDemoRole();
initializeBootSplash();
installPreloadRecovery();

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
