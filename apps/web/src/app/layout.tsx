import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "mind-elixir/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Primoria | Adaptive STEM Learning",
  description: "Adaptive STEM learning paths with knowledge graphs, interactive visualization, code, quiz, and Course Tutor.",
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
