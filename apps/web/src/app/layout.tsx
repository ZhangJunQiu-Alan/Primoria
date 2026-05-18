import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Primoria AI Tutor",
  description: "Chat-first AI tutor with generative learning widgets.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
