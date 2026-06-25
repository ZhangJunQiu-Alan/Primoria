import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default function SignUpPage() {
  return (
    <main className="app-shell auth-shell">
      <section className="workspace auth-workspace">
        <Suspense fallback={<div className="p-8 text-center text-muted">Loading authentication...</div>}>
          <AuthForm mode="sign-up" />
        </Suspense>
      </section>
    </main>
  );
}
