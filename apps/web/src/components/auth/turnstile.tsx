"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

// Cloudflare Turnstile, explicit render. Env-gated by the caller — only mounted
// when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. `resetKey` forces a fresh widget
// (call after a failed submit, since tokens are single-use).
export function TurnstileWidget({
  siteKey,
  onToken,
  resetKey,
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
  resetKey: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onToken);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    callbackRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    const el = containerRef.current;
    if (!ready || !el || !window.turnstile) return;

    const id = window.turnstile.render(el, {
      sitekey: siteKey,
      callback: (token: string) => callbackRef.current(token),
      "expired-callback": () => callbackRef.current(null),
      "error-callback": () => callbackRef.current(null),
    });

    return () => {
      window.turnstile?.remove(id);
    };
  }, [ready, siteKey, resetKey]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onLoad={() => setReady(true)}
      />
      <div ref={containerRef} style={{ marginTop: 4 }} />
    </>
  );
}
