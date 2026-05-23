import { TutorNavRail } from "@/components/tutor/nav-rail";
import { AuthForm } from "@/components/auth/auth-form";

export default function SignInPage() {
  return (
    <main className="app-shell">
      <TutorNavRail />
      <section className="workspace auth-workspace">
        <AuthForm mode="sign-in" />
      </section>
    </main>
  );
}
