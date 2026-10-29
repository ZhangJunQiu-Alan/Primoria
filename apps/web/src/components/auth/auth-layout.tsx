"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowIcon } from "@/components/arrow-icon";
import { AuthPlate } from "@/components/auth/auth-plate";
import { BrandLogo } from "@/components/brand-logo";
import { msg, useT } from "@/lib/i18n/client";

export const MIN_PASSWORD_LENGTH = 8;

/** Form column (brand, form, privacy note) beside the deep-pine plate. */
export function AuthLayout({ plate, children }: { plate: "sign-in" | "sign-up"; children: ReactNode }) {
  const t = useT();
  return (
    <div className="auth-page">
      <section className="auth-side">
        <header className="auth-side-head">
          <Link href="/welcome" aria-label="Primoria">
            <BrandLogo />
          </Link>
        </header>
        <div className="auth-form-wrap">{children}</div>
        <footer className="auth-side-foot">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="7" width="10" height="7" rx="1.5" />
            <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
          </svg>
          {t.auth.privacyNote}
        </footer>
      </section>
      <AuthPlate variant={plate} />
    </div>
  );
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="auth-heading">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}

export function AuthBackLink() {
  const t = useT();
  return (
    <Link className="auth-back" href="/login">
      <ArrowIcon size={14} back />
      {t.auth.backToLogin}
    </Link>
  );
}

export function AuthAlert({ children }: { children: ReactNode }) {
  return (
    <div className="auth-alert" role="alert">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" />
        <path d="M8 4.8v3.6M8 10.9v.1" />
      </svg>
      <span>{children}</span>
    </div>
  );
}

type PasswordInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  disabled?: boolean;
  minLength?: number;
  describedBy?: string;
  invalid?: boolean;
};

/** Password input with a text Show/Hide toggle. */
export function PasswordInput({ id, value, onChange, autoComplete, placeholder, disabled, minLength, describedBy, invalid }: PasswordInputProps) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  return (
    <div className="auth-password">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        minLength={minLength}
        autoComplete={autoComplete}
        required
        disabled={disabled}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        disabled={disabled || value.length === 0}
        aria-label={visible ? t.auth.hidePassword : t.auth.showPassword}
        aria-pressed={visible}
      >
        {visible ? t.auth.hide : t.auth.show}
      </button>
    </div>
  );
}

/** Eight-segment length meter plus the live hint that describes the password input. */
export function PasswordLengthHint({ id, length }: { id: string; length: number }) {
  const t = useT();
  const ready = length >= MIN_PASSWORD_LENGTH;
  const hint = length === 0
    ? t.auth.passwordEmptyHint
    : ready
      ? t.auth.passwordGoodHint
      : msg(t.auth.passwordMoreHint, { count: MIN_PASSWORD_LENGTH - length });
  return (
    <>
      <div className="auth-meter" data-ready={ready} aria-hidden="true">
        {Array.from({ length: MIN_PASSWORD_LENGTH }, (_, index) => (
          <i key={index} data-filled={index < length} />
        ))}
      </div>
      <p id={id} className="auth-hint" data-ready={length > 0 && ready}>{hint}</p>
    </>
  );
}
