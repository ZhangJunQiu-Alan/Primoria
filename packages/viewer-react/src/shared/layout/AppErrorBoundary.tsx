import { Component, type ErrorInfo, type ReactNode } from 'react';
import { normalizeViewerLanguage } from '@/shared/i18n/locale';
import { captureViewerError } from '@/shared/platform/observability';
import { getViewerCopy } from '@/shared/theme/copy';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureViewerError(error, { componentStack: info.componentStack ?? '' });
  }

  render() {
    if (this.state.error) {
      const copy = getViewerCopy(
        typeof document === 'undefined' ? undefined : normalizeViewerLanguage(document.documentElement.lang),
      );

      return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--viewer-page)] px-4">
          <div className="viewer-surface max-w-xl space-y-4 p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-600">
                {copy.common.errorTitle}
              </p>
              <h1 className="mt-2 text-3xl font-black text-[var(--viewer-text)]">
                {copy.common.fatalTitle}
              </h1>
              <p className="mt-2 text-sm font-medium text-[var(--viewer-text-muted)]">
                {copy.common.fatalMessage}
              </p>
            </div>
            <button
              type="button"
              className="rounded-2xl bg-[var(--viewer-primary)] px-4 py-3 text-sm font-black text-white"
              onClick={() => window.location.reload()}
            >
              {copy.common.reload}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
