import type { Metadata } from "next";
import { CopilotKitProvider } from "@/components/copilot-provider";
import { AuthBar } from "@/components/auth/auth-bar";
import { getUser } from "@/lib/supabase/server";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Primoria AI Tutor",
  description: "Chat-first AI tutor with generative learning widgets.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {user?.email ? <AuthBar email={user.email} /> : null}
        <CopilotKitProvider>{children}</CopilotKitProvider>
      </body>
    </html>
  );
}
