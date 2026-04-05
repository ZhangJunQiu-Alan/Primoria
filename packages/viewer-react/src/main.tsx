import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { ensureDefaultDemoRole } from './shared/utils/demoMode';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Missing root element');
}

ensureDefaultDemoRole();

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
