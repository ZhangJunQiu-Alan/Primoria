"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AuthUser } from "@/lib/auth/types";
import { createNewThread } from "@/lib/copilot-thread-history";
import { ChatHistoryPopup } from "./history-popup";
import { TutorNavRail } from "./nav-rail";
import { TutorChatCopilot } from "./tutor-chat-copilot";
import { TutorTopbar } from "./topbar";

type AuthState = {
  authEnabled: boolean;
  user: AuthUser | null;
  loaded: boolean;
};

export function TutorWorkspaceClient({ initialAuthState }: { initialAuthState: AuthState }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);

  useEffect(() => {
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
  }, []);

  const authRequired = authState.loaded && authState.authEnabled && !authState.user;

  return (
    <>
      <TutorNavRail initialAuthState={{ authEnabled: authState.authEnabled, user: authState.user }} />
      <section className="workspace">
        <TutorTopbar
          onOpenHistory={() => setHistoryOpen((open) => !open)}
          onNewChat={() => {
            createNewThread();
            setHistoryOpen(false);
          }}
        />
        {!authState.loaded ? (
          <AuthLoadingPanel />
        ) : authRequired ? (
          <AuthRequiredPanel />
        ) : (
          <TutorChatCopilot />
        )}
        <ChatHistoryPopup
          open={historyOpen && !authRequired}
          onClose={() => setHistoryOpen(false)}
          onSelectChat={() => {}}
        />
      </section>
    </>
  );
}

function AuthLoadingPanel() {
  return (
    <div className="auth-required-shell">
      <article className="auth-required-card">
        <span className="course-block-tag">Checking session</span>
        <h1>Loading your workspace…</h1>
        <p>Primoria is verifying your account before opening the tutor.</p>
      </article>
    </div>
  );
}

function AuthRequiredPanel() {
  return (
    <div className="auth-required-shell">
      <article className="auth-required-card">
        <span className="course-block-tag">Account required</span>
        <h1>Your tutor workspace is private now</h1>
        <p>
          Sign in to use AI chat, save CopilotKit threads, generate courses, and keep Library data in Postgres.
        </p>
        <div className="auth-required-actions">
          <Link href="/auth/sign-in">Sign in</Link>
          <Link href="/auth/sign-up">Create account</Link>
        </div>
      </article>
    </div>
  );
}
