"use client";

import { useEffect } from "react";

// Root error boundary. Reached when a server component throws — most notably
// when the database is unreachable and session/profile loads fail. Must stay
// dependency-free (no i18n/provider hooks): those may be part of the failure.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] route error boundary:", error);
  }, [error]);

  return (
    <main className="app-shell auth-shell" style={{ placeItems: "center", padding: 24 }}>
      <div className="auth-card" role="alert">
        <div className="auth-heading">
          <h1>Service temporarily unavailable</h1>
          <p>
            We could not load this page right now. Your account and data are not
            affected — please try again in a moment.
          </p>
        </div>
        <button className="auth-submit" type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
