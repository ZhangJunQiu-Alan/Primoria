#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

async function main() {
  const profilePage = read("src/app/profile/page.tsx");
  const weeklyPage = read("src/app/weekly-report/page.tsx");
  const statsPage = read("src/app/stats/page.tsx");
  const settingsPage = read("src/app/settings/page.tsx");
  const upgradePage = read("src/app/upgrade/page.tsx");
  const profileEditModal = read("src/components/profile/profile-edit-modal.tsx");
  const profileStats = read("src/lib/profile/stats.ts");
  const profileApi = read("src/app/api/profile/route.ts");
  const navRail = read("src/components/tutor/nav-rail.tsx");
  const styles = read("src/app/globals.css");

  assert(profilePage.includes("profile-hero-card"), "profile page renders the profile hero card");
  assert(profilePage.includes("profile-hero-identity"), "profile hero separates identity from metrics");
  assert(profilePage.includes("profile-hero-action"), "profile hero keeps profile editing in the header action area");
  assert(profilePage.includes("stats.lessonsCompleted"), "profile hero surfaces completed lessons");
  assert(profilePage.includes("stats.questionsPracticed"), "profile hero surfaces practiced questions");
  assert(profilePage.includes("profile-section-header"), "profile progress section has explanatory header copy");
  assert(profilePage.includes("profile-list-copy"), "profile progress links include descriptions");
  assert(profilePage.includes("My Progress"), "profile page renders the progress section");
  assert(profilePage.includes("Weekly Report"), "profile page links to weekly report");
  assert(profilePage.includes("Learning Stats"), "profile page links to learning stats");
  assert(!profilePage.includes("Course Stats"), "profile page omits Course Stats as requested");

  assert(profileEditModal.includes("Edit Profile"), "profile edit modal copies the expected title");
  assert(profileEditModal.includes("Edit profile"), "profile edit trigger uses readable sentence case");
  assert(profileEditModal.includes("Display Name"), "profile edit modal edits display name");
  assert(profileEditModal.includes('fetch("/api/profile"'), "profile edit modal saves through the profile API");
  assert(profileApi.includes(".update(users)"), "profile API updates the app-owned users table");

  assert(weeklyPage.includes("Daily Breakdown"), "weekly report renders daily breakdown");
  assert(weeklyPage.includes("Courses Worked On"), "weekly report renders worked-on courses");
  assert(statsPage.includes("Daily Activity (Last 30 Days)"), "stats page renders heatmap section");
  assert(statsPage.includes("Today's Summary"), "stats page renders today summary");
  assert(statsPage.includes("Lifetime Statistics"), "stats page renders lifetime statistics");
  assert(settingsPage.includes("Facts About You"), "settings page renders facts section");
  assert(settingsPage.includes("FactsAboutYou") && settingsPage.includes("listActiveFacts"), "settings page renders distilled facts from the store");
  assert(!settingsPage.includes("EDIT FACTS"), "static EDIT FACTS action is replaced by the live facts list");
  assert(settingsPage.includes("Content Language"), "settings page renders language section");

  const factsComponent = read("src/components/profile/facts-about-you.tsx");
  assert(factsComponent.includes('method: "DELETE"') && factsComponent.includes("/api/learner-facts"), "facts component deletes via the learner-facts API");
  assert(factsComponent.includes("won’t come back") || factsComponent.includes("hasn’t learned"), "facts component explains the dismiss/empty behavior");
  const factsRoute = read("src/app/api/learner-facts/route.ts");
  assert(factsRoute.includes("export async function GET") && factsRoute.includes("listActiveFacts"), "facts API lists active facts");
  assert(factsRoute.includes("export async function DELETE") && factsRoute.includes("dismissFact"), "facts API dismisses on delete");
  assert(styles.includes(".facts-list"), "facts list has dedicated styling");
  assert(upgradePage.includes("Learn without limits with Pro"), "upgrade page renders Pro headline");

  assert(navRail.includes('href="/profile"'), "avatar menu links to profile");
  assert(navRail.includes('href="/settings"'), "avatar menu links to settings");
  assert(!navRail.includes('id: "profile"'), "profile is only available from the avatar menu, not the primary rail");
  assert(!navRail.includes("nav-progress-strip"), "temporary streak and XP rail widgets are removed");
  assert(!navRail.includes("nav-upgrade-link"), "temporary upgrade rail shortcut is removed");
  assert(styles.includes(".profile-shell"), "profile pages have dedicated shell styling");
  assert(styles.includes(".profile-hero-identity"), "profile hero identity has dedicated styling");
  assert(styles.includes("grid-template-areas"), "profile hero uses a deliberate dashboard layout");
  assert(styles.includes(".profile-section-header"), "profile progress section header has dedicated styling");
  assert(styles.includes(".profile-list-copy"), "profile progress row copy has dedicated styling");
  assert(styles.includes(".profile-list-card"), "profile progress list has dedicated styling");
  assert(styles.includes(".activity-heatmap"), "stats heatmap has dedicated styling");
  assert(styles.includes(".settings-card"), "settings cards have dedicated styling");
  assert(styles.includes(".upgrade-card"), "upgrade page has dedicated styling");

  assert(profileStats.includes("quizAttempts"), "profile stats read quiz attempts");
  assert(profileStats.includes("learningEvents"), "profile stats read learning events");

  process.stdout.write("[profile-pages-static.unit] ALL CHECKS PASSED\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
