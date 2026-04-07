import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './features/public/builderAuth.css';
import { App } from './App';
import { initializeBootSplash } from './shared/boot/bootSplash';
import { ensureDefaultDemoRole } from './shared/utils/demoMode';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Missing root element');
}

ensureDefaultDemoRole();
initializeBootSplash();

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
