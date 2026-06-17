import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "mind-elixir/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Primoria AI Tutor",
  description: "Chat-first AI tutor with generative learning widgets.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  );
}
