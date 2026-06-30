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
  const courseTypes = read("src/lib/courses/types.ts");
  const courseGenerator = read("src/lib/ai/deepagent/course-generator.ts");
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
  const lessonDescriptionMigration = read("drizzle/0032_lesson_descriptions.sql");

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
  assert(courseTypes.includes("description: string;"), "lesson model stores a first-class description");
  assert(courseStore.includes("description: lesson.description ?? \"\""), "course store persists lesson descriptions");
  assert(courseStore.includes("description: row.description ?? \"\""), "course store reads lesson descriptions");
  assert(courseGenerator.includes("plannedLessonDescription"), "course outline generation produces lesson descriptions");
  assert(courseGenerator.includes("conceptIds.map((concept) => lessonConceptName"), "lesson descriptions are derived from KG concept names");
  assert(lessonDescriptionMigration.includes('ADD COLUMN "description" text DEFAULT \'\''), "database migration adds persisted lesson descriptions");
  assert(courseOutlinePage.includes("CourseOutlineView"), "course outline route delegates to the shared outline view");
  assert(courseDetailClient.includes("CourseOutlineView"), "course detail page reuses the shared outline view for upcoming lessons");
  assert(courseDetailClient.includes('visibleLessons="upcoming"'), "course detail page requests the upcoming lesson view");
  assert(courseDetailClient.includes("currentLessonBlocks(course, currentLessonId)"), "course detail renders only the active lesson's blocks");
  assert(courseDetailClient.includes("visibleBlocks={blocks}"), "course detail gives Course Tutor only the visible lesson blocks");
  assert(coursePage.includes("currentLessonBlocks(course, requestedLessonId)"), "course page header counts only the active lesson's blocks");
  assert(courseOutlineView.includes("selectVisibleLessons"), "shared course outline centralizes lesson visibility selection");
  assert(courseOutlineView.includes('visibleLessons !== "upcoming"'), "full course outline still shows all lessons");
  assert(courseOutlineView.includes("lessons[currentIndex + 1]"), "upcoming course detail view selects the next outline lesson after the active lesson");
  assert(courseOutlineView.includes("return nextLesson ? [nextLesson] : [];"), "upcoming course detail view renders at most one follow-up lesson");
  assert(courseOutlineView.includes("?lessonId=${encodeURIComponent(lesson.id)}"), "generated outline lessons open as an explicit lesson jump link");
  assert(courseOutlineView.includes("course-outline-summary"), "shared course outline renders a compact course summary header");
  assert(courseOutlineView.includes("course-outline-ready-count"), "shared course outline shows ready lesson count in the summary");
  assert(courseOutlineView.includes("course-outline-progress"), "shared course outline renders ready progress");
  assert(courseOutlineView.includes('role="progressbar"'), "course outline progress exposes accessible semantics");
  assert(courseOutlineView.includes("course-outline-node-wrap"), "shared course outline renders lesson timeline nodes");
  assert(courseOutlineView.includes("course-outline-description"), "shared course outline renders each lesson description");
  assert(courseOutlineView.includes("lesson.description.trim()"), "outline uses persisted lesson descriptions before fallback copy");
  assert(courseOutlineView.includes("course-outline-state-note"), "shared course outline explains unavailable lesson states");
  assert(courseOutlineView.includes("disabled={!canGenerate}"), "unavailable lesson actions use disabled buttons");
  assert(courseOutlineView.includes("course-outline-remediation"), "shared course outline marks inserted remediation lessons");
  assert(courseOutlineView.includes("LockIcon"), "shared course outline renders locked lessons with a lock icon");
  assert(courseOutlineView.includes("Jump ahead"), "planned lessons can be explicitly generated and opened out of order");
  assert(courseOutlineView.includes("course-outline-jump-dialog"), "jump ahead uses a confirmation dialog before generating");
  assert(courseOutlineView.includes("Generate and jump ahead"), "jump ahead dialog exposes the generate-and-open action");
  assert(courseOutlineView.includes("router.push(`/course/${displayCourse.id}?lessonId=${encodeURIComponent(lessonId)}`)"), "jump ahead routes to the selected lesson after enqueueing generation");
  assert(courseOutlineView.includes("Retry"), "shared course outline preserves retry for failed lesson generation");
  assert(!courseOutlineView.includes("course-outline-pill"), "lesson rows no longer render redundant state pills");
  assert(!courseOutlineView.includes("roleLabel("), "lesson rows no longer render lesson role metadata");
  assert(!courseOutlineView.includes("CalendarIcon"), "lesson rows no longer render update date metadata");
  assert(!courseDetailClient.includes("course-lesson-outline"), "course detail no longer renders the old upcoming-lessons list");
  assert(!styles.includes(".course-outline-pill"), "redundant lesson state pill styles are removed");
  assert(!styles.includes(".course-lesson-outline"), "old course detail outline styles are removed");
  assert(courseDetailClient.includes("CourseLessonPendingState"), "course detail shows a waiting state for explicit jumps to generating lessons");
  assert(courseDetailClient.includes("currentLessonJob?.status !== \"completed\""), "course detail refreshes once a jumped-to lesson finishes generating");
  assert(tutorNavRail.includes("accountOpen"), "nav rail stores account popover state");
  assert(tutorNavRail.includes("nav-account-trigger"), "signed-in nav rail shows an avatar menu trigger");
  assert(tutorNavRail.includes("aria-expanded={accountOpen}"), "avatar menu trigger exposes expanded state");
  assert(tutorNavRail.includes("nav-account-menu"), "signed-in profile actions and sign-out live in an account popover");
  assert(tutorNavRail.includes("signingOut"), "sign out exposes a pending state instead of appearing unresponsive");
  assert(tutorNavRail.includes("disabled={signingOut}"), "sign out cannot be double-submitted while the request is pending");
  assert(tutorNavRail.includes('href="/profile"'), "account popover links to the copied Profile page");
  assert(tutorNavRail.includes('href="/settings"'), "account popover links to Settings");
  assert(!tutorNavRail.includes('id: "profile"'), "profile is not duplicated as a primary rail tab");
  assert(!tutorNavRail.includes("nav-progress-strip"), "nav rail no longer shows temporary streak and XP widgets");
  assert(!tutorNavRail.includes("nav-upgrade-link"), "nav rail no longer exposes the temporary upgrade shortcut");
  assert(tutorNavRail.includes('role="menuitem"'), "account popover exposes sign out as a menu item");
  assert(!tutorNavRail.includes("<button type=\"button\" onClick={signOut}>Sign out</button>"), "sign out is no longer flattened into the rail");
  assert(styles.includes(".nav-account-menu"), "account popover has dedicated styling");
  assert(styles.includes(".nav-rail {\n  background: rgba(255, 253, 248, 0.82);"), "nav rail keeps the account popover in its own layout layer");
  assert(styles.includes("z-index: 30;\n  height: 100vh;\n  overflow: visible;"), "nav rail paints above the workspace so the account popover remains clickable");
  assert(styles.includes("z-index: 80;"), "account popover sits above the app workspace");
  assert(styles.includes("pointer-events: auto;"), "account popover explicitly receives pointer events");
  assert(styles.includes(".nav-account .nav-account-signout:disabled"), "sign out pending state has dedicated styling");
  assert(styles.includes("left: calc(100% + 10px)"), "account popover opens tightly beside the desktop rail");
  assert(styles.includes(".nav-account-menu-item"), "account popover menu rows have dedicated copied-profile styling");
  assert(styles.includes("width: 188px;"), "account popover is compact instead of a large panel");
  assert(styles.includes("min-height: 48px;"), "account popover rows use compact menu sizing");
  assert(!styles.includes(".nav-progress-strip"), "removed streak and XP rail widget styles");
  assert(!styles.includes(".nav-upgrade-link"), "removed upgrade rail shortcut styles");
  assert(styles.includes(".workspace-shell .nav-account-menu"), "account popover has a mobile workspace-shell placement");
  assert(styles.includes(".library-card-generating"), "generating placeholders have dedicated styling");
  assert(styles.includes(".library-card-failed"), "failed placeholders have dedicated styling");
  assert(styles.includes(".library-filter-menu"), "status filter menu has dedicated styling");
  assert(styles.includes(".library-sort-button"), "sortable headers have dedicated styling");
  assert(styles.includes("color: #5b534b;"), "tool card status headers use readable mid-contrast text");
  assert(styles.includes("color: #625950;"), "generated course summaries use readable mid-contrast text");
  assert(styles.includes(".course-meta {\n  font-size: 12px;\n  color: var(--muted);"), "generated course meta text is not rendered with low-contrast quiet color");
  assert(styles.includes(".tool-note {\n  color: #625950;"), "restored course status notes use readable mid-contrast text on warm cards");
  assert(styles.includes(".course-generation-notice"), "restored course generation notice has dedicated styling");
  assert(styles.includes(".course-generation-notice.failed"), "restored course generation failure state has dedicated styling");
  assert(styles.includes(".course-generation-notice-actions a"), "restored course generation notice actions are styled as buttons");
  assert(styles.includes("scrollbar-width: none"), "global UI hides scrollbar tracks");
  assert(styles.includes("table-layout: fixed"), "library table fits within its container without horizontal scrolling");
  assert(styles.includes(".library-col-actions"), "library reserves width for row actions");
  assert(libraryGrid.includes("library-actions-header"), "library actions column has a dedicated aligned header");
  assert(libraryGrid.includes("menuPlacement={index === entries.length - 1 ? \"up\" : \"down\"}"), "last visible library row opens its overflow menu upward");
  assert(libraryGrid.includes("library-row-menu${menuPlacement === \"up\" ? \" drop-up\" : \"\"}"), "library row menu receives a drop-up class when needed");
  assert(!libraryGrid.includes("Showing {visibleEntries.length}"), "library footer no longer shows item count copy");
  assert(libraryGrid.includes("ShareCourseDialog"), "library has a share course modal");
  assert(libraryGrid.includes("Share course"), "library row menu exposes share course");
  assert(libraryGrid.includes("courseShareUrl(course.id)"), "share modal derives a course share link");
  assert(libraryGrid.includes("/learn/${encodeURIComponent(courseId)}"), "share links use the public learn URL shape");
  assert(libraryGrid.includes("copyTextToClipboard(shareUrl)"), "share modal can copy the generated link");
  assert(libraryGrid.includes("if (event.target === event.currentTarget) onClose();"), "share modal closes when clicking outside the card");
  assert(styles.includes(".library-actions-heading"), "library actions heading aligns with the primary row action");
  assert(styles.includes(".library-row-menu.drop-up"), "library row menu has a drop-up placement style");
  assert(styles.includes("bottom: calc(100% + 8px)"), "drop-up row menu opens above the row instead of overlapping pagination");
  assert(styles.includes(".library-share-backdrop"), "share course modal has a centered overlay style");
  assert(styles.includes(".library-share-dialog"), "share course modal has a floating card style");
  assert(styles.includes(".library-share-link-row"), "share course modal has a dedicated link copy row");
  assert(styles.includes("justify-content: flex-end;"), "library footer right-aligns pagination after removing count copy");
  assert(!styles.includes(".library-table-card {\n  overflow-x: auto;"), "library table card no longer creates a horizontal scrollbar");
  assert(styles.includes(".library-row-menu"), "library row overflow menu has dedicated styling");
  assert(styles.includes(".library-confirm-dialog"), "course deletion confirmation has dedicated styling");
  assert(styles.includes(".course-outline-summary"), "course outline summary has dedicated styling");
  assert(styles.includes(".course-outline-progress"), "course outline progress has dedicated styling");
  assert(styles.includes(".course-outline-node-wrap::after"), "course outline timeline draws connecting lines");
  assert(styles.includes(".course-outline-ready .course-outline-node"), "course outline page styles ready lessons");
  assert(styles.includes(".course-outline-locked .course-outline-node"), "course outline page styles locked lessons");
  assert(styles.includes(".course-outline-row-action"), "course outline page styles row actions");
  assert(styles.includes(".course-outline-description"), "course outline page styles lesson descriptions");
  assert(styles.includes(".course-outline-jump-dialog"), "course outline page styles the jump-ahead dialog");
  assert(styles.includes(".course-lesson-pending-card"), "course detail page styles the jumped-to lesson waiting state");
  assert(styles.includes("max-width: 1440px"), "course outline content is constrained on wide displays");
  assert(styles.includes(".course-outline-row.course-outline-remediation"), "course outline page styles inserted remediation lessons");

  assert(tutorChat.includes("getCurrentThreadId()"), "home chat restores the existing thread instead of always starting fresh");
  assert(!tutorChat.includes("startFreshCurrentThread"), "home chat does not force a new thread on remount");
  assert(tutorChat.includes("RestoredLessonGenerationCards"), "home chat restores active lesson generation cards after reload");
  assert(generativeUi.includes("course-generation-notice"), "restored course generation jobs render as compact notices");
  assert(generativeUi.includes("course-generation-notice-actions"), "restored course generation notices expose clear actions");
  assert(generativeUi.includes("打开课程"), "restored course generation notice uses learner-facing Chinese course action copy");
  assert(generativeUi.includes("查看学习库"), "restored course generation notice uses learner-facing Chinese library action copy");
  assert(!generativeUi.includes("restored-course-job-status"), "restored course generation jobs no longer reuse generic tool-card status UI");
  assert(generativeUi.includes("function CourseGenerationNotice"), "course generation status UI is centralized in a compact notice component");
  assert(!generativeUi.includes("firstLessonStatus"), "live course generation status no longer renders the old stacked status tool card");
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
