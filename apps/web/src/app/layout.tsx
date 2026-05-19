import type { Metadata } from "next";
import { CopilotKitProvider } from "@/components/copilot-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Primoria AI Tutor",
  description: "Chat-first AI tutor with generative learning widgets.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CopilotKitProvider>{children}</CopilotKitProvider>
      </body>
    </html>
  );
}
