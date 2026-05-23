import type { Metadata } from "next";
import { CopilotKitProvider } from "@/components/copilot-provider";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Primoria AI Tutor",
  description: "Chat-first AI tutor with generative learning widgets.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUser();
  const copilotEnabled = !authEnabled || Boolean(user);

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <CopilotKitProvider enabled={copilotEnabled}>{children}</CopilotKitProvider>
      </body>
    </html>
  );
}
