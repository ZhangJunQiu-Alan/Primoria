"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] root error boundary", {
      digest: error.digest ?? null,
      name: error.name,
    });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f5f7f8", color: "#172026", fontFamily: "system-ui, sans-serif" }}>
        <main
          style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, boxSizing: "border-box" }}
        >
          <section
            role="alert"
            style={{ width: "min(100%, 440px)", padding: 24, border: "1px solid #d9e0e3", background: "#ffffff" }}
          >
            <h1 style={{ margin: 0, fontSize: 24, lineHeight: 1.25 }}>Service temporarily unavailable</h1>
            <p style={{ margin: "12px 0 20px", lineHeight: 1.6, color: "#536168" }}>
              We could not load this page right now. Your account and data are not affected. Please try again in a moment.
            </p>
            <button
              type="button"
              autoFocus
              onClick={reset}
              style={{ minHeight: 44, padding: "0 18px", border: 0, background: "#172026", color: "#ffffff", cursor: "pointer" }}
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
