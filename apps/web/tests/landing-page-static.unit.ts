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
  const welcomePage = read("src/app/welcome/page.tsx");
  const authRoutes = read("src/lib/auth/routes.ts");
  const proxy = read("src/proxy.ts");
  const landingPage = read("src/components/landing/landing-page.tsx");
  const rootLayout = read("src/app/layout.tsx");
  const styles = read("src/app/globals.css");

  assert(authRoutes.includes('PUBLIC_LANDING_PATH = "/welcome"'), "public landing path is centralized");
  assert(authRoutes.includes("PUBLIC_ROUTE_PATTERNS"), "public route patterns live in the shared auth route module");
  assert(proxy.includes('from "@/lib/auth/routes"'), "proxy reads the shared auth route module");
  assert(!proxy.includes("const PUBLIC_PATTERNS"), "proxy does not maintain a private public-route list");
  assert(welcomePage.includes('import { LandingPage } from "@/components/landing/landing-page"'), "welcome route imports the public landing page");
  assert(welcomePage.includes("return <LandingPage />;"), "welcome route renders the public landing page");
  assert(homePage.includes('import { LandingPage } from "@/components/landing/landing-page"'), "home imports the shared public landing page");
  assert(homePage.includes("if (authEnabled && !user) return <LandingPage />"), "home renders landing content for signed-out visitors");

  assert(!landingPage.includes("CopilotKitProvider"), "public landing component does not mount CopilotKit");

  // Landing copy now resolves from the i18n dictionary.
  const zhLanding = JSON.stringify(dictionaries.zh.landing);
  const enLanding = JSON.stringify(dictionaries.en.landing);
  assert(landingPage.includes("useT"), "landing resolves copy from the i18n dictionary");
  assert(landingPage.includes("PUBLIC_LANDING_PATH"), "landing brand links back to the public welcome route");
  assert(landingPage.includes("t.landing.headlineLines.map"), "landing hero headline is dictionary-driven in both languages");
  assert(dictionaries.zh.landing.headlineLines.join("").includes("说出你想学会的"), "landing hero leads with the learner's goal");
  assert(dictionaries.en.landing.headlineLines.join(" ").includes("Say what you want to learn"), "English hero mirrors the learner-goal headline");
  assert(zhLanding.includes("STEM") && enLanding.includes("STEM"), "landing explains STEM coverage");
  assert(zhLanding.includes("交互可视化") && enLanding.includes("Interactive visual"), "landing highlights interactive visualization");
  assert(zhLanding.includes("知识图谱") && enLanding.includes("knowledge graph"), "landing names knowledge graph positioning");
  assert(zhLanding.includes("课程助教") && enLanding.includes("Course Tutor"), "landing explains the course tutor");
  assert(!zhLanding.includes("Course Copilot") && !enLanding.includes("Course Copilot"), "landing does not use the old Course Copilot name");
  assert(zhLanding.includes("掌握") && enLanding.toLowerCase().includes("mastery"), "landing explains adaptive learning mastery");
  assert(enLanding.includes("Lesson-by-lesson") && zhLanding.includes("逐节"), "landing explains lesson-by-lesson generation");
  assert(!zhLanding.includes("KG") && !zhLanding.includes("Lazy") && !zhLanding.includes("DAG"), "zh landing copy avoids internal jargon");
  assert(!/\p{Extended_Pictographic}/u.test(zhLanding + enLanding), "landing copy does not use emoji icons");
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
