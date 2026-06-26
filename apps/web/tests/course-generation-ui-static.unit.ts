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
  const libraryPage = read("src/app/library/page.tsx");
  const libraryGrid = read("src/components/library/course-library-grid.tsx");
  const courseRoute = read("src/app/api/courses/[id]/route.ts");
  const courseStore = read("src/lib/courses/store.ts");
  const courseOutlinePage = read("src/app/course/[id]/outline/page.tsx");
  const courseOutlineView = read("src/components/course/course-outline-view.tsx");
  const courseDetailClient = read("src/components/course/course-detail-client.tsx");
  const generativeUi = read("src/hooks/use-primoria-copilot.tsx");
  const tutorChat = read("src/components/tutor/tutor-chat-copilot.tsx");
  const copilotChatSurface = read("src/components/tutor/copilot-chat-surface.tsx");
  const copilotProvider = read("src/components/copilot-provider.tsx");
  const homePage = read("src/app/page.tsx");
  const coursePage = read("src/app/course/[id]/page.tsx");
  const tutorTopbar = read("src/components/tutor/topbar.tsx");
  const tutorNavRail = read("src/components/tutor/nav-rail.tsx");
  const historyPopup = read("src/components/tutor/history-popup.tsx");
  const toolCard = read("src/components/generative-ui/tool-card.tsx");
  const styles = read("src/app/globals.css");

  assert(libraryPage.includes("CourseLibraryGrid"), "library delegates course grid to client component");
  assert(libraryPage.includes("listActiveLessonGenerationJobsByOwner"), "library fetches active lesson generation jobs");
  assert(libraryGrid.includes("/api/lesson-generation-jobs"), "library course grid polls lesson generation jobs");
  assert(libraryGrid.includes("/api/courses"), "library course grid refreshes completed courses");
  assert(libraryGrid.includes("library-card-generating"), "library renders generating placeholders");
  assert(libraryGrid.includes("library-card-failed"), "library renders failed placeholders");
  assert(libraryGrid.includes("window.setInterval"), "library keeps polling while jobs are active");
  assert(libraryGrid.includes("INITIAL_REFRESH_WINDOW_MS"), "library polls briefly after opening to catch newly-started jobs");
  assert(libraryGrid.includes('kind: "job"'), "library can render generation jobs before course details sync");
  assert(libraryGrid.includes("Filter by Status"), "library exposes a status filter menu");
  assert(libraryGrid.includes("SortHeaderButton"), "library exposes sortable table headers");
  assert(libraryGrid.includes("sortEntries"), "library sorts course rows client-side");
  assert(libraryGrid.includes("<colgroup>"), "library table declares responsive column widths");
  assert(!libraryGrid.includes("<p>{course.summary}</p>"), "library no longer displays generated course summary copy");
  assert(!libraryGrid.includes("lessonStateText"), "library no longer displays generated lesson state filler copy");
  assert(!libraryGrid.includes("first lesson job"), "library no longer displays internal lesson job identifiers");
  assert(!libraryGrid.includes("shortId("), "library no longer formats internal identifiers for display");
  assert(!/className="library-row-action"[\s\S]*?>\s*Review\s*<\/Link>/.test(libraryGrid), "library rows no longer expose a Review action button");
  assert(libraryGrid.includes("/outline"), "library row menu links to the full lesson outline page");
  assert(libraryGrid.includes("DeleteCourseDialog"), "library rows delete through a confirmation dialog");
  assert(libraryGrid.includes('method: "DELETE"'), "library delete action calls the course delete endpoint");
  assert(courseRoute.includes("export async function DELETE"), "course API exposes a delete endpoint");
  assert(courseStore.includes("export async function deleteCourse"), "course store can permanently delete a course");
  assert(courseOutlinePage.includes("CourseOutlineView"), "course outline route delegates to the shared outline view");
  assert(courseDetailClient.includes("CourseOutlineView"), "course detail page reuses the shared outline view for upcoming lessons");
  assert(courseDetailClient.includes('visibleLessons="upcoming"'), "course detail page requests the upcoming lesson view");
  assert(courseOutlineView.includes("selectVisibleLessons"), "shared course outline centralizes lesson visibility selection");
  assert(courseOutlineView.includes('visibleLessons !== "upcoming"'), "full course outline still shows all lessons");
  assert(courseOutlineView.includes("lessons.find((lesson) => lesson.status !== \"generated\")"), "upcoming course detail view selects only the next ungenerated lesson");
  assert(courseOutlineView.includes("return nextLesson ? [nextLesson] : [];"), "upcoming course detail view renders at most one follow-up lesson");
  assert(courseOutlineView.includes("course-outline-summary"), "shared course outline renders a compact course summary header");
  assert(courseOutlineView.includes("course-outline-ready-count"), "shared course outline shows ready lesson count in the summary");
  assert(courseOutlineView.includes("course-outline-progress"), "shared course outline renders ready progress");
  assert(courseOutlineView.includes('role="progressbar"'), "course outline progress exposes accessible semantics");
  assert(courseOutlineView.includes("course-outline-node-wrap"), "shared course outline renders lesson timeline nodes");
  assert(courseOutlineView.includes("course-outline-state-note"), "shared course outline explains unavailable lesson states");
  assert(courseOutlineView.includes("disabled={!canGenerate}"), "unavailable lesson actions use disabled buttons");
  assert(courseOutlineView.includes("course-outline-remediation"), "shared course outline marks inserted remediation lessons");
  assert(courseOutlineView.includes("LockIcon"), "shared course outline renders locked lessons with a lock icon");
  assert(courseOutlineView.includes("Locked"), "shared course outline labels ungenerated lessons as locked");
  assert(courseOutlineView.includes("Retry"), "shared course outline preserves retry for failed lesson generation");
  assert(!courseOutlineView.includes("course-outline-pill"), "lesson rows no longer render redundant state pills");
  assert(!courseOutlineView.includes("roleLabel("), "lesson rows no longer render lesson role metadata");
  assert(!courseOutlineView.includes("CalendarIcon"), "lesson rows no longer render update date metadata");
  assert(!courseDetailClient.includes("course-lesson-outline"), "course detail no longer renders the old upcoming-lessons list");
  assert(!styles.includes(".course-outline-pill"), "redundant lesson state pill styles are removed");
  assert(!styles.includes(".course-lesson-outline"), "old course detail outline styles are removed");
  assert(tutorNavRail.includes("accountOpen"), "nav rail stores account popover state");
  assert(tutorNavRail.includes("nav-account-trigger"), "signed-in nav rail shows an avatar menu trigger");
  assert(tutorNavRail.includes("aria-expanded={accountOpen}"), "avatar menu trigger exposes expanded state");
  assert(tutorNavRail.includes("nav-account-menu"), "signed-in email and sign-out live in an account popover");
  assert(tutorNavRail.includes("title={accountEmail}"), "account popover preserves the full email as hover text");
  assert(tutorNavRail.includes('role="menuitem"'), "account popover exposes sign out as a menu item");
  assert(!tutorNavRail.includes("<button type=\"button\" onClick={signOut}>Sign out</button>"), "sign out is no longer flattened into the rail");
  assert(styles.includes(".nav-account-menu"), "account popover has dedicated styling");
  assert(styles.includes("left: calc(100% + 14px)"), "account popover opens beside the desktop rail");
  assert(styles.includes("overflow-wrap: anywhere"), "account popover can show long emails without rail truncation");
  assert(styles.includes(".workspace-shell .nav-account-menu"), "account popover has a mobile workspace-shell placement");
  assert(styles.includes(".library-card-generating"), "generating placeholders have dedicated styling");
  assert(styles.includes(".library-card-failed"), "failed placeholders have dedicated styling");
  assert(styles.includes(".library-filter-menu"), "status filter menu has dedicated styling");
  assert(styles.includes(".library-sort-button"), "sortable headers have dedicated styling");
  assert(styles.includes("scrollbar-width: none"), "global UI hides scrollbar tracks");
  assert(styles.includes("table-layout: fixed"), "library table fits within its container without horizontal scrolling");
  assert(styles.includes(".library-col-actions"), "library reserves width for row actions");
  assert(libraryGrid.includes("library-actions-header"), "library actions column has a dedicated aligned header");
  assert(styles.includes(".library-actions-heading"), "library actions heading aligns with the primary row action");
  assert(!styles.includes(".library-table-card {\n  overflow-x: auto;"), "library table card no longer creates a horizontal scrollbar");
  assert(styles.includes(".library-row-menu"), "library row overflow menu has dedicated styling");
  assert(styles.includes(".library-confirm-dialog"), "course deletion confirmation has dedicated styling");
  assert(styles.includes(".course-outline-summary"), "course outline summary has dedicated styling");
  assert(styles.includes(".course-outline-progress"), "course outline progress has dedicated styling");
  assert(styles.includes(".course-outline-node-wrap::after"), "course outline timeline draws connecting lines");
  assert(styles.includes(".course-outline-ready .course-outline-node"), "course outline page styles ready lessons");
  assert(styles.includes(".course-outline-locked .course-outline-node"), "course outline page styles locked lessons");
  assert(styles.includes(".course-outline-row-action"), "course outline page styles row actions");
  assert(styles.includes("max-width: 1440px"), "course outline content is constrained on wide displays");
  assert(styles.includes(".course-outline-row.course-outline-remediation"), "course outline page styles inserted remediation lessons");

  assert(tutorChat.includes("getCurrentThreadId()"), "home chat restores the existing thread instead of always starting fresh");
  assert(!tutorChat.includes("startFreshCurrentThread"), "home chat does not force a new thread on remount");
  assert(tutorChat.includes("RestoredLessonGenerationCards"), "home chat restores active lesson generation cards after reload");
  assert(!copilotProvider.includes("if (!enabled) return"), "CopilotKit provider stays mounted so client auth refresh cannot leave chat without context");
  assert(homePage.includes("<CopilotKitProvider>"), "home tutor page always mounts the CopilotKit provider");
  assert(coursePage.includes("<CopilotKitProvider>"), "course detail page always mounts the CopilotKit provider");
  assert(copilotChatSurface.includes("chatView={PrimoriaChatView}"), "chat uses a stable chat view component while messages stream");
  assert(copilotChatSurface.includes("PrimoriaComposerContext.Provider"), "chat passes composer context without creating an inline component type");
  assert(!copilotChatSurface.includes("chatView={((props"), "chat no longer remounts its message tree with an inline view component");
  assert(!copilotChatSurface.includes("restoration.agent === agent"), "agent identity changes no longer hide the restored conversation");
  assert(copilotChatSurface.includes("finally"), "chat restoration always resolves instead of leaving the restore panel stuck");
  assert(!styles.includes("animation: primoria-message-enter"), "message rows do not replay opacity animations when remounted");
  assert(!styles.includes("animation: primoria-user-pop"), "user bubbles do not replay entry animations while the assistant streams");
  assert(tutorTopbar.includes("New Chat"), "topbar exposes New Chat");
  assert(!tutorTopbar.includes("Settings"), "topbar no longer exposes Settings");
  assert(tutorNavRail.includes('pathname.endsWith("/outline")'), "course outlines keep Library selected in navigation");
  assert(toolCard.includes("}/outline`"), "home generated course card opens the unified outline page");
  assert(generativeUi.includes("}/outline`"), "restored lesson-generation cards open the unified outline page");
  assert(historyPopup.includes("Recent"), "history popup is scoped to recent chats");
  assert(!historyPopup.includes("Start a new tutor chat"), "history popup no longer owns new-chat creation");
  assert(generativeUi.includes("/api/lesson-generation-jobs"), "home restore fetches active lesson generation jobs");
  assert(generativeUi.includes("selectRestorableLessonJobs"), "home restore dedupes restorable lesson jobs");

  for (const blockType of ["quiz", "mind_map", "slide", "worksheet"]) {
    assert(generativeUi.includes(`"${blockType}"`), `course card parser accepts ${blockType} outline items`);
  }

  assert(
    toolCard.includes('artifact.status === "ready"'),
    "chat course card only navigates once a course is ready",
  );

  process.stdout.write("[course-generation-ui-static.unit] ALL CHECKS PASSED\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
