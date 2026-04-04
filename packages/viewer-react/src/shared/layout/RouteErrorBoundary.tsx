import { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';
import { ErrorStateCard } from '@/shared/layout/AsyncState';
import { PageContainer } from '@/shared/layout/PageContainer';
import { captureViewerError } from '@/shared/platform/observability';

export function RouteErrorBoundary({ scope }: { scope: string }) {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : `Unexpected ${scope} failure.`;

  useEffect(() => {
    captureViewerError(error, { scope });
  }, [error, scope]);

  return (
    <PageContainer title="Viewer recovery" subtitle={`Recovered from a ${scope} failure.`}>
      <ErrorStateCard
        message={message}
        onRetry={() => window.location.reload()}
      />
    </PageContainer>
  );
}
