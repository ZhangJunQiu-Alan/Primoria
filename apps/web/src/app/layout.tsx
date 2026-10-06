import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader, Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import "katex/dist/katex.min.css";
import "mind-elixir/style.css";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/client";
import { getCurrentUiLanguage } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const newsreader = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-newsreader" });
// CJK faces ship as unicode-range slices; there is no subset to preload.
const notoSansSC = Noto_Sans_SC({ weight: ["400", "500"], preload: false, variable: "--font-noto-sans-sc" });
const notoSerifSC = Noto_Serif_SC({ weight: ["400", "500", "600"], preload: false, variable: "--font-noto-serif-sc" });

const fontVariables = [geist, geistMono, newsreader, notoSansSC, notoSerifSC].map((font) => font.variable).join(" ");

export const metadata: Metadata = {
  title: "Primoria | Adaptive STEM Learning",
  description: "Adaptive STEM learning paths with knowledge graphs, interactive visualization, code, quiz, and Course Tutor.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const language = await getCurrentUiLanguage();
  const dictionary = getDictionary(language);

  return (
    <html lang={language} className={fontVariables} suppressHydrationWarning>
      <body>
        <I18nProvider initialLanguage={language} initialDictionary={dictionary}>{children}</I18nProvider>
      </body>
    </html>
  );
}
