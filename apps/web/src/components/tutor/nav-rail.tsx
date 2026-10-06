"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PUBLIC_LANDING_PATH } from "@/lib/auth/routes";
import type { AuthUser } from "@/lib/auth/types";
import {
  clearCopilotThreadStorage,
  createNewThread,
  getCurrentThreadId,
  readThreadHistory,
  setCurrentThreadId,
  THREAD_EVENT_NAME,
  type CopilotThreadSummary,
} from "@/lib/copilot-thread-history";
import { clearPendingCourseBuilds } from "@/lib/courses/course-build-session";
import { useT } from "@/lib/i18n/client";

type NavTab = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
};

const ICON_PROPS = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const TABS: NavTab[] = [
  {
    id: "messages",
    label: "Tutor",
    description: "Tutor messages and generated widgets.",
    href: "/",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M4 5h16v11H9l-5 4z" />
      </svg>
    ),
  },
  {
    id: "library",
    label: "Library",
    description: "Courses saved by the tutor.",
    href: "/library",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M5 4h4v16H5zM10 4h4v16h-4zM15.5 4.5l3.8 1-3.6 14.5-3.8-1z" />
      </svg>
    ),
  },
  {
    id: "stats",
    label: "Stats",
    description: "Learning statistics.",
    href: "/stats",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    ),
  },
  {
    id: "weekly",
    label: "Weekly report",
    description: "This week in review.",
    href: "/weekly-report",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M4 4h16v16H4zM4 9h16M9 9v11" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/library") {
    return pathname === "/library"
      || pathname.startsWith("/library/")
      || (pathname.startsWith("/course/") && pathname.endsWith("/outline"));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type TutorNavRailProps = {
  initialAuthState?: {
    authEnabled: boolean;
    user: AuthUser | null;
  };
};

export function TutorNavRail({ initialAuthState }: TutorNavRailProps = {}) {
  const t = useT();
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const hasInitialAuthState = Boolean(initialAuthState);
  const [localAuthState, setLocalAuthState] = useState<{
    authEnabled: boolean | null;
    user: AuthUser | null;
  } | null>(hasInitialAuthState ? null : { authEnabled: null, user: null });
  const authEnabled = localAuthState?.authEnabled ?? initialAuthState?.authEnabled ?? null;
  const user = localAuthState ? localAuthState.user : initialAuthState?.user ?? null;
  const [accountOpen, setAccountOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentThreadId, setCurrentThread] = useState("");
  const [sessions, setSessions] = useState<CopilotThreadSummary[]>([]);
  const [signingOut, setSigningOut] = useState(false);
  const accountRootRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const sidebarTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (hasInitialAuthState) return;
    let cancelled = false;
    fetch("/api/auth/me")
      .then((response) => response.json() as Promise<{ authEnabled: boolean; user: AuthUser | null }>)
      .then((data) => {
        if (cancelled) return;
        setLocalAuthState({ authEnabled: data.authEnabled, user: data.user });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pathname, hasInitialAuthState]);

  useEffect(() => {
    if (!accountOpen) return;
    function closeOnOutsideInteraction(event: PointerEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") setAccountOpen(false);
        return;
      }
      const target = event.target;
      if (target instanceof Node && !accountRootRef.current?.contains(target)) {
        setAccountOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideInteraction);
    document.addEventListener("keydown", closeOnOutsideInteraction);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideInteraction);
      document.removeEventListener("keydown", closeOnOutsideInteraction);
    };
  }, [accountOpen]);

  useEffect(() => {
    function refreshThreads() {
      setCurrentThread(getCurrentThreadId());
      setSessions(readThreadHistory().filter((session) => session.messageCount > 0));
    }
    refreshThreads();
    window.addEventListener(THREAD_EVENT_NAME, refreshThreads);
    return () => window.removeEventListener(THREAD_EVENT_NAME, refreshThreads);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;
    function closeSidebar(event: PointerEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") setSidebarOpen(false);
        return;
      }
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (sidebarRef.current?.contains(target) || sidebarTriggerRef.current?.contains(target)) return;
      setSidebarOpen(false);
    }

    document.addEventListener("pointerdown", closeSidebar);
    document.addEventListener("keydown", closeSidebar);
    return () => {
      document.removeEventListener("pointerdown", closeSidebar);
      document.removeEventListener("keydown", closeSidebar);
    };
  }, [sidebarOpen]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
      clearCopilotThreadStorage();
      clearPendingCourseBuilds();
      // Legacy purge: BYOK is removed; wipe any provider key left in localStorage by old builds.
      window.localStorage.removeItem("primoria:tutor-provider-settings");
      setLocalAuthState({ authEnabled: authEnabled ?? true, user: null });
      setAccountOpen(false);
      router.push(PUBLIC_LANDING_PATH);
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  const accountInitial = (user?.displayName ?? user?.email ?? "U").slice(0, 1).toUpperCase();
  const accountName = user?.displayName ?? t.nav.learner;
  const tabCopy: Record<string, string> = {
    messages: t.nav.tutor,
    library: t.nav.library,
    stats: t.nav.stats,
    weekly: t.nav.weeklyReport,
  };

  function startNewChat() {
    const threadId = createNewThread();
    setCurrentThread(threadId);
    setSidebarOpen(false);
    router.push("/");
  }

  function selectThread(threadId: string) {
    setCurrentThreadId(threadId);
    setCurrentThread(threadId);
    setSidebarOpen(false);
    router.push("/");
  }

  return (
    <aside className="nav-rail" aria-label={t.nav.aria}>
      <div className="nav-rail-head">
        <Link href="/" className="nav-brand" onClick={() => setSidebarOpen(false)}>Primoria</Link>
        <button
          type="button"
          className="nav-menu-toggle"
          aria-label={sidebarOpen ? t.nav.closeSidebar : t.nav.openSidebar}
          aria-expanded={sidebarOpen}
          aria-controls="primary-sidebar"
          ref={sidebarTriggerRef}
          onClick={() => setSidebarOpen((open) => !open)}
        >
          <svg {...ICON_PROPS} aria-hidden="true">
            {sidebarOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      <div id="primary-sidebar" className={`nav-panel${sidebarOpen ? " open" : ""}`} ref={sidebarRef}>
        <button type="button" className="nav-new-chat" onClick={startNewChat}>
          <svg {...ICON_PROPS} strokeWidth={2} aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>{t.nav.newChat}</span>
        </button>

        <nav className="nav-tabs" aria-label={t.nav.aria}>
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`nav-tab${active ? " active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  setAccountOpen(false);
                  setSidebarOpen(false);
                }}
              >
                <span className="nav-tab-icon" aria-hidden="true">{tab.icon}</span>
                <span>{tabCopy[tab.id] ?? tab.label}</span>
              </Link>
            );
          })}
        </nav>

        <section className="nav-sidebar-section" aria-label={t.nav.recentChats}>
          <span className="nav-sidebar-section-title">{t.nav.recentChats}</span>
          {sessions.length > 0 ? (
            <div className="nav-sidebar-thread-list">
              {sessions.map((session) => {
                const active = session.id === currentThreadId && pathname === "/";
                return (
                  <button
                    key={session.id}
                    type="button"
                    className={`nav-sidebar-thread${active ? " active" : ""}`}
                    aria-current={active ? "true" : undefined}
                    title={session.title || t.tutor.tutorChat}
                    onClick={() => selectThread(session.id)}
                  >
                    {session.title || t.tutor.tutorChat}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="nav-sidebar-empty">{t.tutor.noRecent}</p>
          )}
        </section>

        <div className="nav-account">
          {authEnabled === null ? (
            <span className="nav-account-hint">{t.nav.checkingWorkspace}</span>
          ) : !authEnabled ? (
            <span className="nav-account-hint">{t.nav.localJsonMode}</span>
          ) : user ? (
            <div className="nav-account-user" ref={accountRootRef}>
              <button
                type="button"
                className="nav-account-trigger"
                aria-label={`${t.nav.accountMenu}: ${accountName}`}
                aria-expanded={accountOpen}
                aria-controls="nav-account-menu"
                onClick={() => setAccountOpen((current) => !current)}
              >
                <span className="nav-account-avatar" aria-hidden="true">{accountInitial}</span>
                <span className="nav-account-name">{accountName}</span>
                <svg {...ICON_PROPS} width={14} height={14} aria-hidden="true">
                  <path d="M7 15l5-5 5 5" />
                </svg>
              </button>
              {accountOpen ? (
                <div id="nav-account-menu" className="nav-account-menu" role="menu">
                  <Link className="nav-account-menu-item" href="/profile" role="menuitem" onClick={() => setAccountOpen(false)}>
                    <svg {...ICON_PROPS} aria-hidden="true">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21a8 8 0 0 1 16 0" />
                    </svg>
                    <span>{t.common.profile}</span>
                  </Link>
                  <Link className="nav-account-menu-item" href="/settings" role="menuitem" onClick={() => setAccountOpen(false)}>
                    <svg {...ICON_PROPS} aria-hidden="true">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7.1 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 20.1 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
                    </svg>
                    <span>{t.common.settings}</span>
                  </Link>
                  <button
                    type="button"
                    className="nav-account-menu-item danger"
                    onClick={signOut}
                    role="menuitem"
                    disabled={signingOut}
                  >
                    <svg {...ICON_PROPS} aria-hidden="true">
                      <path d="M10 17 15 12l-5-5" />
                      <path d="M15 12H3" />
                      <path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" />
                    </svg>
                    {signingOut ? t.nav.signingOut : t.common.signOut}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="nav-account-links">
              <Link className="nav-account-link" href="/auth/sign-in">{t.common.signIn}</Link>
              <Link className="nav-account-link primary" href="/auth/sign-up">{t.common.signUp}</Link>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
