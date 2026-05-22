import type { Metadata } from "next";
import { CopilotKitProvider } from "@/components/copilot-provider";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Primoria AI Tutor",
  description: "Chat-first AI tutor with generative learning widgets.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <CopilotKitProvider>{children}</CopilotKitProvider>
      </body>
    </html>
  );
}
