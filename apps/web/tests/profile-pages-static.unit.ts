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

// Copy now lives in the i18n dictionary. Assert the key resolves in both
// languages instead of expecting a hardcoded string in the component source.
function bilingual(zh: string, en: string, message: string) {
  assert(typeof zh === "string" && zh.length > 0, `${message} (zh)`);
  assert(typeof en === "string" && en.length > 0, `${message} (en)`);
  assert(zh !== en, `${message} (zh/en differ)`);
}

async function main() {
  const profilePage = read("src/app/profile/page.tsx");
  const weeklyPage = read("src/app/weekly-report/page.tsx");
  const statsPage = read("src/app/stats/page.tsx");
  const settingsPage = read("src/app/settings/page.tsx");
  const settingsFactsPage = read("src/app/settings/facts/page.tsx");
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
  assert(profilePage.includes("getDictionaryForUser"), "profile page resolves copy from the i18n dictionary without re-reading auth");
  bilingual(dictionaries.zh.profile.myProgress, dictionaries.en.profile.myProgress, "profile page renders the progress section");
  bilingual(dictionaries.zh.profile.weeklyReport, dictionaries.en.profile.weeklyReport, "profile page links to weekly report");
  bilingual(dictionaries.zh.profile.learningStats, dictionaries.en.profile.learningStats, "profile page links to learning stats");
  assert(!profilePage.includes("Course Stats"), "profile page omits Course Stats as requested");

  assert(profileEditModal.includes("useT"), "profile edit modal resolves copy from the i18n dictionary");
  bilingual(dictionaries.zh.profile.editTitle, dictionaries.en.profile.editTitle, "profile edit modal copies the expected title");
  bilingual(dictionaries.zh.profile.editProfile, dictionaries.en.profile.editProfile, "profile edit trigger uses readable label");
  bilingual(dictionaries.zh.profile.displayName, dictionaries.en.profile.displayName, "profile edit modal edits display name");
  assert(profileEditModal.includes('fetch("/api/profile"'), "profile edit modal saves through the profile API");
  assert(profileApi.includes(".update(users)"), "profile API updates the app-owned users table");

  bilingual(dictionaries.zh.weekly.dailyBreakdown, dictionaries.en.weekly.dailyBreakdown, "weekly report renders daily breakdown");
  bilingual(dictionaries.zh.weekly.coursesWorkedOn, dictionaries.en.weekly.coursesWorkedOn, "weekly report renders worked-on courses");
  assert(weeklyPage.includes("stats.weekLabel"), "weekly report uses a computed week label");
  assert(weeklyPage.includes("stats.bestWeekDay?.display"), "weekly report uses the computed best active day");
  assert(weeklyPage.includes("stats.weeklyLessonsCompleted"), "weekly report uses weekly completed lesson data");
  assert(weeklyPage.includes("stats.weeklyQuestionsPracticed"), "weekly report uses weekly quiz practice data");
  assert(weeklyPage.includes("stats.weeklyActivityEvents"), "weekly report uses weekly activity events");
  assert(!weeklyPage.includes("Jun 29 - Jul 5"), "weekly report does not hardcode a fake week range");
  assert(!weeklyPage.includes("Monday, Jun 29"), "weekly report does not hardcode a fake best day");
  assert(!weeklyPage.includes("cardsCollected"), "weekly report does not render fake collected-card data");
  assert(statsPage.includes("getDictionaryForUser"), "stats page resolves copy from the i18n dictionary without re-reading auth");
  bilingual(dictionaries.zh.stats.dailyActivity, dictionaries.en.stats.dailyActivity, "stats page renders heatmap section");
  bilingual(dictionaries.zh.stats.todaySummary, dictionaries.en.stats.todaySummary, "stats page renders today summary");
  bilingual(dictionaries.zh.stats.lifetime, dictionaries.en.stats.lifetime, "stats page renders lifetime statistics");
  assert(statsPage.includes("stats.todayLessonsCompleted"), "today summary uses today's completed lessons");
  assert(statsPage.includes("stats.todayQuestionsPracticed"), "today summary uses today's quiz practice");
  assert(statsPage.includes("stats.todayActivityEvents"), "today summary uses today's recorded activity");
  bilingual(dictionaries.zh.stats.plannedLessonTime, dictionaries.en.stats.plannedLessonTime, "stats page labels course estimates as planned lesson time");
  assert(!statsPage.includes("Total Learning Time"), "stats page does not present planned course estimates as actual learning time");
  assert(settingsPage.includes("getDictionaryForUser"), "settings page resolves copy from the i18n dictionary without re-reading auth");
  bilingual(dictionaries.zh.settings.factsTitle, dictionaries.en.settings.factsTitle, "settings page renders facts section");
  assert(settingsPage.includes('href="/settings/facts"'), "settings page links to the facts editor");
  assert(settingsPage.includes("ContentLanguageSelect") && settingsPage.includes("getUserPreferences"), "settings page renders saved language preference");
  assert(settingsPage.includes("LanguageSwitcher"), "settings page exposes an interface language switcher");
  assert(settingsPage.includes("listActiveFacts"), "settings page reads live fact previews");
  assert(!settingsPage.includes("JOIN OUR DISCORD"), "settings page removes fake community action");
  assert(!settingsPage.includes("DELETE ACCOUNT"), "settings page removes fake destructive account action");
  bilingual(dictionaries.zh.language.contentTitle, dictionaries.en.language.contentTitle, "settings page renders content language section");
  bilingual(dictionaries.zh.language.interfaceTitle, dictionaries.en.language.interfaceTitle, "settings page renders interface language section");
  bilingual(dictionaries.zh.settings.backSettings, dictionaries.en.settings.backSettings, "facts page returns to settings");
  assert(settingsFactsPage.includes("FactsAboutYou") && settingsFactsPage.includes("listActiveFacts"), "facts page renders live facts from the store");

  const factsComponent = read("src/components/profile/facts-about-you.tsx");
  assert(factsComponent.includes('method = editingId ? "PATCH" : "POST"'), "facts component saves add and edit through the API");
  assert(factsComponent.includes('method: "DELETE"') && factsComponent.includes("/api/learner-facts"), "facts component deletes via the learner-facts API");
  assert(factsComponent.includes("disabled"), "facts component does not expose a fake extractor action");
  const factsRoute = read("src/app/api/learner-facts/route.ts");
  assert(factsRoute.includes("export async function GET") && factsRoute.includes("listActiveFacts"), "facts API lists active facts");
  assert(factsRoute.includes("export async function POST") && factsRoute.includes("addManualFact"), "facts API adds manual facts");
  assert(factsRoute.includes("export async function PATCH") && factsRoute.includes("updateFact"), "facts API edits manual facts");
  assert(factsRoute.includes("export async function DELETE") && factsRoute.includes("dismissFact"), "facts API dismisses on delete");
  const preferencesRoute = read("src/app/api/settings/preferences/route.ts");
  assert(preferencesRoute.includes("export async function PUT") && preferencesRoute.includes("saveUserPreferences"), "preferences API saves content language");
  const settingsStore = read("src/lib/settings/user-settings.ts");
  assert(settingsStore.includes("CONTENT_LANGUAGES") && settingsStore.includes("contentLanguage"), "settings store models content language");
  assert(styles.includes(".facts-list"), "facts list has dedicated styling");
  assert(styles.includes(".settings-wide-action"), "settings overview has a dedicated wide action style");
  assert(styles.includes(".facts-composer"), "facts editor has dedicated composer styling");
  assert(upgradePage.includes("getDictionaryForUser"), "upgrade page resolves copy from the i18n dictionary without re-reading auth");
  bilingual(dictionaries.zh.upgrade.title, dictionaries.en.upgrade.title, "upgrade page renders Pro headline");

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
  assert(profileStats.includes("plannedLessonMinutes"), "profile stats exposes planned lesson minutes separately");
  assert(profileStats.includes("weeklyActivityEvents"), "profile stats exposes weekly activity event count");
  assert(profileStats.includes("todayQuestionsPracticed"), "profile stats exposes today's quiz practice");
  assert(profileStats.includes("ProfileCourseActivity"), "profile stats returns typed course activity rows");
  assert(!profileStats.includes("cardsCollected"), "profile stats no longer exposes fake collected-card data");
  assert(!profileStats.includes("learningMinutes"), "profile stats no longer exposes estimated minutes as actual learning time");

  process.stdout.write("[profile-pages-static.unit] ALL CHECKS PASSED\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
