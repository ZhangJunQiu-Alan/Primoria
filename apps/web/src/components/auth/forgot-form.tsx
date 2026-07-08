"use client";

import Link from "next/link";

import { authStyles } from "@/components/auth/styles";
import { useT } from "@/lib/i18n/client";

export function ForgotForm() {
  const t = useT();

  return (
    <div style={authStyles.container}>
      <h1 style={authStyles.title}>{t.auth.passwordRecoveryUnavailableTitle}</h1>
      <p style={authStyles.label} role="status">{t.auth.passwordRecoveryUnavailableCopy}</p>

      <p style={authStyles.footer}>
        <Link href="/login">{t.auth.backToLogin}</Link>
      </p>
    </div>
  );
}
