"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AuthUser } from "@/lib/auth/types";
import { clearCopilotThreadStorage } from "@/lib/copilot-thread-history";

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
    id: "workspace",
    label: "Workspace",
    description: "Shared room for humans and agents.",
    href: "/workspace",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
  return pathname === href || pathname.startsWith(`${href}/`);
}

type TutorNavRailProps = {
  initialAuthState?: {
    authEnabled: boolean;
    user: AuthUser | null;
  };
};

export function TutorNavRail({ initialAuthState }: TutorNavRailProps = {}) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [authEnabled, setAuthEnabled] = useState<boolean | null>(initialAuthState?.authEnabled ?? null);
  const [user, setUser] = useState<AuthUser | null>(initialAuthState?.user ?? null);

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

  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    clearCopilotThreadStorage();
    window.localStorage.removeItem("primoria:tutor-provider-settings");
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="nav-rail" aria-label="Primoria sections">
      <div className="nav-brand">
        <div className="brand-symbol" aria-hidden="true" />
        <span className="nav-brand-text">Primoria</span>
      </div>
      <nav className="nav-tabs">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          const className = `nav-tab${active ? " active" : ""}${tab.disabled ? " disabled" : ""}`;
          const inner = (
            <>
              <span className="nav-tab-icon" aria-hidden="true">{tab.icon}</span>
              <span className="nav-tab-copy">
                <strong>{tab.label}</strong>
                <span>{tab.description}</span>
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
                title={`${tab.label} · coming soon`}
              >
                {inner}
              </button>
            );
          }
          return (
            <Link key={tab.id} href={tab.href} className={className} title={tab.label}>
              {inner}
            </Link>
          );
        })}
      </nav>
      <div className="nav-account">
        {authEnabled === null ? (
          <span className="nav-account-hint">Checking workspace…</span>
        ) : !authEnabled ? (
          <span className="nav-account-hint">Local JSON mode</span>
        ) : user ? (
          <>
            <span className="nav-account-avatar" aria-hidden="true">{(user.displayName ?? user.email ?? "U").slice(0, 1).toUpperCase()}</span>
            <span className="nav-account-copy">
              <strong>{user.displayName ?? "Learner"}</strong>
              <span>{user.email}</span>
            </span>
            <button type="button" onClick={signOut}>Sign out</button>
          </>
        ) : (
          <>
            <Link className="nav-account-link" href="/auth/sign-in">Sign in</Link>
            <Link className="nav-account-link primary" href="/auth/sign-up">Create account</Link>
          </>
        )}
      </div>
    </aside>
  );
}
