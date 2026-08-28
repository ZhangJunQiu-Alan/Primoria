import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "mind-elixir/style.css";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/client";
import { getCurrentUiLanguage } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const metadata: Metadata = {
  title: "Primoria | Adaptive STEM Learning",
  description: "Adaptive STEM learning paths with knowledge graphs, interactive visualization, code, quiz, and Course Tutor.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const language = await getCurrentUiLanguage();
  const dictionary = getDictionary(language);

  return (
    <html lang={language} suppressHydrationWarning>
      <body>
        <I18nProvider initialLanguage={language} initialDictionary={dictionary}>{children}</I18nProvider>
      </body>
    </html>
  );
}
