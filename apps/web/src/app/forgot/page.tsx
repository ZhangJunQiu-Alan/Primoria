import { ForgotForm } from "@/components/auth/forgot-form";

export const dynamic = "force-dynamic";

export default function ForgotPage() {
  return (
    <main className="app-shell auth-shell">
      <section className="workspace auth-workspace">
        <ForgotForm />
      </section>
    </main>
  );
}
