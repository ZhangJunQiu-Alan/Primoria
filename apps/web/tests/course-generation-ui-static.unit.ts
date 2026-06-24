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
  const generativeUi = read("src/hooks/use-primoria-copilot.tsx");
  const tutorChat = read("src/components/tutor/tutor-chat-copilot.tsx");
  const copilotChatSurface = read("src/components/tutor/copilot-chat-surface.tsx");
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
  assert(courseOutlinePage.includes("course-outline-summary"), "course outline page renders a compact course summary header");
  assert(courseOutlinePage.includes("course-outline-ready-count"), "course outline page shows ready lesson count in the summary");
  assert(courseOutlinePage.includes("course-outline-progress"), "course outline page renders ready progress");
  assert(courseOutlinePage.includes('role="progressbar"'), "course outline progress exposes accessible semantics");
  assert(courseOutlinePage.includes("course-outline-node-wrap"), "course outline page renders lesson timeline nodes");
  assert(courseOutlinePage.includes("course-outline-state-note"), "course outline page explains unavailable lesson states");
  assert(courseOutlinePage.includes("<button type=\"button\" disabled"), "unavailable lesson actions use disabled buttons");
  assert(courseOutlinePage.includes("course-outline-remediation"), "course outline page marks inserted remediation lessons");
  assert(courseOutlinePage.includes("LockIcon"), "course outline page renders locked lessons with a lock icon");
  assert(courseOutlinePage.includes("Locked"), "course outline page labels ungenerated lessons as locked");
  assert(!courseOutlinePage.includes("course-outline-pill"), "lesson rows no longer render redundant state pills");
  assert(!courseOutlinePage.includes("roleLabel("), "lesson rows no longer render lesson role metadata");
  assert(!courseOutlinePage.includes("CalendarIcon"), "lesson rows no longer render update date metadata");
  assert(!styles.includes(".course-outline-pill"), "redundant lesson state pill styles are removed");
  assert(styles.includes(".library-card-generating"), "generating placeholders have dedicated styling");
  assert(styles.includes(".library-card-failed"), "failed placeholders have dedicated styling");
  assert(styles.includes(".library-filter-menu"), "status filter menu has dedicated styling");
  assert(styles.includes(".library-sort-button"), "sortable headers have dedicated styling");
  assert(styles.includes("scrollbar-width: none"), "global UI hides scrollbar tracks");
  assert(styles.includes("table-layout: fixed"), "library table fits within its container without horizontal scrolling");
  assert(styles.includes(".library-col-actions"), "library reserves width for row actions");
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
  assert(copilotChatSurface.includes("chatView={PrimoriaChatView}"), "chat uses a stable chat view component while messages stream");
  assert(copilotChatSurface.includes("PrimoriaComposerContext.Provider"), "chat passes composer context without creating an inline component type");
  assert(!copilotChatSurface.includes("chatView={((props"), "chat no longer remounts its message tree with an inline view component");
  assert(!copilotChatSurface.includes("restoration.agent === agent"), "agent identity changes no longer hide the restored conversation");
  assert(!styles.includes("animation: primoria-message-enter"), "message rows do not replay opacity animations when remounted");
  assert(!styles.includes("animation: primoria-user-pop"), "user bubbles do not replay entry animations while the assistant streams");
  assert(tutorTopbar.includes("New Chat"), "topbar exposes New Chat");
  assert(!tutorTopbar.includes("Settings"), "topbar no longer exposes Settings");
  assert(tutorNavRail.includes('pathname.endsWith("/outline")'), "course outlines keep Library selected in navigation");
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
