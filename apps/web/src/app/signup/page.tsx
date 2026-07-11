import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <main className="app-shell auth-shell">
      <section className="workspace auth-workspace">
        <Suspense fallback={<div className="p-8 text-center text-muted">Loading authentication...</div>}>
          <AuthForm mode="signup" />
        </Suspense>
      </section>
    </main>
  );
}
