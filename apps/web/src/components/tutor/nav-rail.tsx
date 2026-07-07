"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AuthUser } from "@/lib/auth/types";
import { clearCopilotThreadStorage } from "@/lib/copilot-thread-history";
import { useT } from "@/lib/i18n/client";

type NavTab = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  disabled?: boolean;
};

const TABS: NavTab[] = [
  {
    id: "tutor",
    label: "AI Tutor",
    description: "Chat-first tutor with interactive widgets.",
    href: "/",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
  {
    id: "library",
    label: "Library",
    description: "Courses saved by the tutor.",
    href: "/library",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    id: "course",
    label: "Course Builder",
    description: "Plan and generate a full course (soon).",
    href: "#",
    disabled: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 4v16" />
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
  const [authEnabled, setAuthEnabled] = useState<boolean | null>(initialAuthState?.authEnabled ?? null);
  const [user, setUser] = useState<AuthUser | null>(initialAuthState?.user ?? null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const accountRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((response) => response.json() as Promise<{ authEnabled: boolean; user: AuthUser | null }>)
      .then((data) => {
        if (cancelled) return;
        setAuthEnabled(data.authEnabled);
        setUser(data.user);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pathname]);

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

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
      clearCopilotThreadStorage();
      window.localStorage.removeItem("primoria:tutor-provider-settings");
      setUser(null);
      setAccountOpen(false);
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  const accountInitial = (user?.displayName ?? user?.email ?? "U").slice(0, 1).toUpperCase();
  const accountName = user?.displayName ?? t.nav.learner;
  const tabCopy: Record<string, { label: string; description: string }> = {
    tutor: { label: t.nav.tutor, description: t.nav.tutorDescription },
    library: { label: t.nav.library, description: t.nav.libraryDescription },
    course: { label: t.nav.courseBuilder, description: t.nav.courseBuilderDescription },
  };

  return (
    <aside className="nav-rail" aria-label={t.nav.aria}>
      <div className="nav-brand">
        <div className="brand-symbol" aria-hidden="true" />
        <span className="nav-brand-text">Primoria</span>
      </div>
      <nav className="nav-tabs">
        {TABS.map((tab) => {
          const copy = tabCopy[tab.id] ?? { label: tab.label, description: tab.description };
          const active = isActive(pathname, tab.href);
          const className = `nav-tab${active ? " active" : ""}${tab.disabled ? " disabled" : ""}`;
          const inner = (
            <>
              <span className="nav-tab-icon" aria-hidden="true">{tab.icon}</span>
              <span className="nav-tab-copy">
                <strong>{copy.label}</strong>
                <span>{copy.description}</span>
              </span>
            </>
          );
          if (tab.disabled) {
            return (
              <button
                key={tab.id}
                type="button"
                className={className}
                disabled
                title={`${copy.label} · ${t.nav.comingSoon}`}
              >
                {inner}
              </button>
            );
          }
          return (
            <Link key={tab.id} href={tab.href} className={className} title={copy.label} onClick={() => setAccountOpen(false)}>
              {inner}
            </Link>
          );
        })}
      </nav>
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
            </button>
            {accountOpen ? (
              <div id="nav-account-menu" className="nav-account-menu" role="menu">
                <Link className="nav-account-menu-item" href="/profile" role="menuitem" onClick={() => setAccountOpen(false)}>
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21a8 8 0 0 1 16 0" />
                  </svg>
                  <span>{t.common.profile}</span>
                </Link>
                <Link className="nav-account-menu-item" href="/settings" role="menuitem" onClick={() => setAccountOpen(false)}>
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7.1 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 20.1 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
                  </svg>
                  <span>{t.common.settings}</span>
                </Link>
                <button
                  type="button"
                  className="nav-account-menu-item danger nav-account-signout"
                  onClick={signOut}
                  role="menuitem"
                  disabled={signingOut}
                >
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
          <>
            <Link className="nav-account-link" href="/auth/sign-in">{t.common.signIn}</Link>
            <Link className="nav-account-link primary" href="/auth/sign-up">{t.common.signUp}</Link>
          </>
        )}
      </div>
    </aside>
  );
}
