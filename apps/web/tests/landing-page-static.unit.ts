#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dictionaries } from "../src/lib/i18n/dictionaries.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

async function main() {
  const homePage = read("src/app/page.tsx");
  const landingPage = read("src/components/landing/landing-page.tsx");
  const rootLayout = read("src/app/layout.tsx");
  const styles = read("src/app/globals.css");

  assert(homePage.includes('import { LandingPage } from "@/components/landing/landing-page"'), "home imports the public landing page");
  assert(homePage.includes("if (authEnabled && !user) return <LandingPage />;"), "unauthenticated visitors see the public landing page");
  assert(homePage.includes("<CopilotKitProvider>"), "authenticated visitors still enter the AI Tutor workspace");
  assert(
    homePage.indexOf("if (authEnabled && !user) return <LandingPage />;") < homePage.indexOf("<CopilotKitProvider>"),
    "landing branch resolves before the CopilotKit tutor tree renders",
  );

  assert(!landingPage.includes("CopilotKitProvider"), "public landing component does not mount CopilotKit");

  // Landing copy now resolves from the i18n dictionary.
  const zhLanding = JSON.stringify(dictionaries.zh.landing);
  const enLanding = JSON.stringify(dictionaries.en.landing);
  assert(landingPage.includes("useT"), "landing resolves copy from the i18n dictionary");
  assert(landingPage.includes("<span>{t.landing.headlineProduct}</span>"), "landing hero makes the product name a first-class part of the headline");
  assert(dictionaries.zh.landing.headlineProduct === "Primoria" && dictionaries.en.landing.headlineProduct === "Primoria", "landing product name is Primoria in both languages");
  assert(dictionaries.zh.landing.headline.includes("学习更加智能、更加定制化、更加高效"), "landing hero uses the product positioning line");
  assert(zhLanding.includes("STEM") && enLanding.includes("STEM"), "landing explains STEM coverage");
  assert(zhLanding.includes("Interactive Visualization") && enLanding.includes("Interactive Visualization"), "landing highlights interactive visualization");
  assert(zhLanding.includes("KG") && enLanding.includes("KG"), "landing names knowledge graph positioning");
  assert(zhLanding.includes("Course Tutor") && enLanding.includes("Course Tutor"), "landing explains the course tutor");
  assert(!zhLanding.includes("Course Copilot") && !enLanding.includes("Course Copilot"), "landing does not use the old Course Copilot name");
  assert(zhLanding.toLowerCase().includes("mastery") && enLanding.toLowerCase().includes("mastery"), "landing explains adaptive learning mastery");
  assert((enLanding.includes("Lazy Generation") || enLanding.includes("Lazy")) && (zhLanding.includes("逐节") || zhLanding.includes("Lazy")), "landing explains lesson-by-lesson generation");
  assert(landingPage.includes("landing-map-stage"), "landing hero uses one dominant learning-map visual anchor");
  assert(landingPage.includes("landing-capability-list"), "landing product section uses a restrained capability list");
  assert(landingPage.includes("landing-workflow-line"), "landing workflow uses a linear path instead of card grid clutter");
  assert(landingPage.includes('href="/auth/sign-up?next=/"'), "primary CTA points to sign-up with tutor return");
  assert(landingPage.includes('href="/auth/sign-in?next=/"'), "secondary CTA points to sign-in with tutor return");

  assert(rootLayout.includes("Adaptive STEM Learning"), "metadata title is suitable for a public landing page");
  assert(rootLayout.includes("knowledge graphs, interactive visualization, code, quiz, and Course Tutor"), "metadata describes public product value");

  assert(styles.includes(".landing-shell"), "landing has a dedicated shell style");
  assert(styles.includes(".landing-hero-visual"), "landing has a product visual scene");
  assert(styles.includes(".landing-map-stage"), "landing has a dedicated map-stage visual anchor");
  assert(styles.includes(".landing-capability-list"), "landing uses list structure for product capabilities");
  assert(styles.includes(".landing-subject-cloud"), "landing has dedicated STEM subject styling");
  assert(styles.includes(".landing-workflow-line"), "landing has dedicated workflow path styling");
  assert(!landingPage.includes("landing-visual-card"), "landing no longer uses stacked hero cards");
  assert(!landingPage.includes("landing-product-grid"), "landing no longer uses a generic SaaS card grid for capabilities");
  assert(styles.includes("@media (max-width: 720px)"), "landing has mobile responsive behavior");
  assert(styles.includes("@media (prefers-reduced-motion: reduce)"), "landing respects reduced motion preferences");

  process.stdout.write("[landing-page-static.unit] ALL CHECKS PASSED\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
