"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { AuthUser } from "@/lib/auth/types";
import { TutorNavRail } from "./nav-rail";
import { useT } from "@/lib/i18n/client";

const TutorChatWithProvider = dynamic(
  async () => {
    const [{ CopilotKitProvider }, { TutorChatCopilot }] = await Promise.all([
      import("@/components/copilot-provider"),
      import("./tutor-chat-copilot"),
    ]);

    return function TutorChatWithProvider() {
      return (
        <CopilotKitProvider>
          <TutorChatCopilot />
        </CopilotKitProvider>
      );
    };
  },
  {
    ssr: false,
    loading: () => <TutorChatLoadingPanel />,
  },
);

type AuthState = {
  authEnabled: boolean;
  user: AuthUser | null;
  loaded: boolean;
};

export function TutorWorkspaceClient({ initialAuthState }: { initialAuthState: AuthState }) {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);

  useEffect(() => {
    if (initialAuthState.loaded) return;
    let cancelled = false;
    async function loadAuth() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await response.json()) as { authEnabled: boolean; user: AuthUser | null };
        if (!cancelled) setAuthState({ authEnabled: data.authEnabled, user: data.user, loaded: true });
      } catch {
        if (!cancelled) setAuthState((current) => ({ ...current, loaded: true }));
      }
    }
    void loadAuth();
    return () => {
      cancelled = true;
    };
  }, [initialAuthState.loaded]);

  const authRequired = authState.loaded && authState.authEnabled && !authState.user;

  return (
    <>
      <TutorNavRail initialAuthState={{ authEnabled: authState.authEnabled, user: authState.user }} />
      <section className="workspace">
        {!authState.loaded ? (
          <AuthLoadingPanel />
        ) : authRequired ? (
          <AuthRequiredPanel />
        ) : (
          <TutorChatWithProvider />
        )}
      </section>
    </>
  );
}

function AuthLoadingPanel() {
  const t = useT();
  return (
    <div className="auth-required-shell">
      <article className="auth-required-card">
        <span className="course-block-tag">{t.tutor.checkingSession}</span>
        <h1>{t.tutor.loadingWorkspace}</h1>
        <p>{t.tutor.verifyingAccount}</p>
      </article>
    </div>
  );
}

function TutorChatLoadingPanel() {
  const t = useT();
  return (
    <div className="auth-required-shell">
      <article className="auth-required-card">
        <span className="course-block-tag">{t.tutor.loadingWorkspace}</span>
        <h1>{t.tutor.loadingWorkspace}</h1>
        <p>{t.tutor.verifyingAccount}</p>
      </article>
    </div>
  );
}

function AuthRequiredPanel() {
  const t = useT();
  return (
    <div className="auth-required-shell">
      <article className="auth-required-card">
        <span className="course-block-tag">{t.tutor.accountRequired}</span>
        <h1>{t.tutor.privateWorkspace}</h1>
        <p>{t.tutor.authRequiredCopy}</p>
        <div className="auth-required-actions">
          <Link href="/auth/sign-in">{t.common.signIn}</Link>
          <Link href="/auth/sign-up">{t.common.signUp}</Link>
        </div>
      </article>
    </div>
  );
}
