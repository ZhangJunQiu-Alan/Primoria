import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

type MissingEnvScreenProps = {
  missingKeys: string[];
};

function MissingEnvScreen({ missingKeys }: MissingEnvScreenProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background: '#f9fafb',
        color: '#111827',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: 'min(720px, 100%)',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          background: '#ffffff',
          padding: '20px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
        }}
      >
        <h1 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', lineHeight: 1.2 }}>
          Builder setup required
        </h1>
        <p style={{ margin: '0 0 14px 0', color: '#374151' }}>
          Missing required env vars:
        </p>
        <pre
          style={{
            margin: '0 0 16px 0',
            padding: '12px',
            borderRadius: '8px',
            background: '#f3f4f6',
            overflowX: 'auto',
          }}
        >
{missingKeys.map((key) => `${key}=`).join('\n')}
        </pre>
        <p style={{ margin: 0, color: '#374151' }}>
          Create a root <code>.env</code> file with <code>SUPABASE_URL</code> and{' '}
          <code>SUPABASE_ANON_KEY</code>, then restart <code>./run.sh builder</code>.
        </p>
      </div>
    </div>
  );
}

const requiredEnv = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
};

const missingEnvKeys = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([key]) => key);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Missing root element');
}

const root = createRoot(rootElement);

if (missingEnvKeys.length > 0) {
  root.render(
    <StrictMode>
      <MissingEnvScreen missingKeys={missingEnvKeys} />
    </StrictMode>,
  );
} else {
  void import('./App').then(({ App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
}
