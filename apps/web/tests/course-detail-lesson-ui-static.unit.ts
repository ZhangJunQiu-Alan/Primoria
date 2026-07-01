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

function main() {
  const page = read("src/app/course/[id]/page.tsx");
  const detail = read("src/components/course/course-detail-client.tsx");
  const blockRenderer = read("src/components/course/block-renderer.tsx");
  const styles = read("src/app/globals.css");

  assert(!page.includes('import { TutorNavRail } from "@/components/tutor/nav-rail"'), "lesson page does not import the left nav rail");
  assert(!page.includes("<TutorNavRail"), "lesson page does not render the left nav rail");
  assert(page.includes('className="app-shell course-app-shell"'), "lesson page uses a single-column app shell");
  assert(page.includes("const lessonTitle = currentLesson?.title ?? course.title"), "lesson header title is derived from the current lesson");
  assert(page.includes("<h1>{lessonTitle}</h1>"), "lesson header renders the current lesson title");
  assert(!page.includes("<h1>{course.title}</h1>"), "lesson header does not render the parent course title");
  assert(!page.includes("<p className=\"course-summary-text\">{course.summary}</p>"), "lesson header does not render the parent course summary");
  assert(page.includes("course-status-row"), "course header exposes a clearer lesson status row");
  assert(!page.includes("当前 lesson"), "course header does not repeat the current-lesson pill");
  assert(page.includes("currentCourseLesson(course, requestedLessonId)"), "course page resolves the current lesson from progress or lessonId");
  assert(page.includes("currentLessonBlocks(course, requestedLessonId)"), "course page counts only the current lesson blocks");

  assert(detail.includes("expandedActionsBlockId"), "course detail tracks the expanded block action tray");
  assert(detail.includes("setExpandedActionsBlockId(block.id)"), "clicking a block opens that block action drawer and keeps it open");
  assert(!detail.includes("current === block.id ? null : block.id"), "clicking the same block no longer toggles the action drawer closed");
  assert(detail.includes("setExpandedActionsBlockId((current) =>"), "course detail clears stale action drawers only when the selected block leaves the visible lesson");
  assert(detail.includes("CourseBlockActionTray"), "course detail renders per-block learning actions outside BlockRenderer");
  assert(detail.includes('data-actions-expanded={expandedActionsBlockId === block.id ? "true" : "false"}'), "block itself tracks expanded state without a visible trigger");
  assert(detail.includes("aria-controls={`course-block-actions-${block.id}`}"), "block itself controls the hidden bottom action panel");
  assert(detail.includes("stopBlockActionEvent"), "block action tray stops events from selecting text or blocks accidentally");
  assert(detail.includes("isCourseBlockInteractiveTarget"), "course block wrapper ignores internal interactive controls");
  assert(detail.includes("[data-course-interactive='true']"), "course block wrapper treats visual canvases as internal interactive zones");
  assert(detail.includes("course-block-action-panel"), "expanded actions render as a hidden-until-click bottom panel");
  assert(!detail.includes("针对当前 block"), "bottom action panel no longer repeats the current-block label");
  assert(!detail.includes("学习动作</button>"), "course detail does not render a visible learning-action trigger button");
  assert(!detail.includes("course-block-action-toggle"), "course detail does not render the old visible action toggle");
  assert(detail.includes("t.actionExplain") && dictionaries.zh.course.actionExplain === "解释这一段", "block action tray includes explain action");
  assert(detail.includes("t.actionExample") && dictionaries.zh.course.actionExample === "给我一个例子", "block action tray includes example action");
  assert(detail.includes("t.actionPractice") && dictionaries.zh.course.actionPractice === "出 3 道练习", "block action tray includes practice action");
  assert(detail.includes("t.actionCheck") && dictionaries.zh.course.actionCheck === "检查我是否理解", "block action tray includes understanding-check action");
  assert(detail.includes("sendCoursePrompt(courseThreadId"), "block actions still route through the existing Course Tutor prompt bridge");
  assert(detail.includes("currentLessonBlocks(course, currentLessonId)"), "course detail renders only blocks from the active lesson");
  assert(detail.includes("visibleBlocks={blocks}"), "Course Tutor receives the same active-lesson block list as the page");
  assert(detail.includes("currentLessonId={currentLessonId}"), "upcoming lesson view is anchored to the current lesson");
  assert(detail.includes("course-ai-context-strip"), "Course Tutor renders current block context");
  assert(detail.includes("t.noSelectedBlock") && dictionaries.zh.course.noSelectedBlock === "还没有选中的 block", "Course Tutor has a no-selection empty context state");
  assert(detail.includes("<strong>{t.tutorTitle}</strong>") && dictionaries.en.course.tutorTitle === "Course Tutor", "Course Tutor is the visible sidebar title");
  assert(detail.includes("placeholder={t.composerPlaceholder}") && dictionaries.zh.course.composerPlaceholder === "Ask More, Know You More", "Course Tutor input uses the updated placeholder");
  assert(!detail.includes("Course Copilot"), "Course Tutor code has no old visible Course Copilot copy");
  assert(!detail.includes("Ask about this course"), "Course Tutor sidebar does not repeat the old generic subtitle");
  assert(!detail.includes("text block · 点击下方建议或直接提问"), "Course Tutor context strip omits block-type helper copy");
  assert(detail.includes("setSidebarCollapsed(false)"), "block actions reopen the Tutor sidebar before sending prompts");

  assert(!detail.includes("scrollSpy"), "course detail does not add scroll spy state");
  assert(!detail.includes("scroll-spy"), "course detail does not add scroll spy classes");
  assert(!detail.includes("course-scroll-directory"), "course detail does not add a scrolling directory");
  assert(!styles.includes("course-scroll-directory"), "styles do not add a scrolling directory");
  assert(!styles.includes(".course-block-action-toggle"), "styles do not keep the visible learning-action trigger");

  assert(blockRenderer.includes("function BlockShell"), "BlockRenderer remains focused on rendering block content");
  assert(!blockRenderer.includes("CourseBlockActionTray"), "learning actions are not embedded in BlockRenderer");
  assert(!blockRenderer.includes("course-block-tag"), "block renderer no longer displays block type tags");
  assert(blockRenderer.includes("course-transfer-path"), "transfer block renders source and target as a structured path");
  assert(blockRenderer.includes("course-transfer-example-label"), "transfer block renders a dedicated example label");
  assert(blockRenderer.includes('CourseMarkdown markdown={block.example} className="course-transfer-example-body"'), "transfer examples render as block markdown for lists and paragraphs");
  assert(!blockRenderer.includes("<em>Example.</em> <CourseInlineMarkdown markdown={block.example}"), "transfer examples are not rendered through inline markdown");
  assert(blockRenderer.includes("CourseVisualFrame"), "visual blocks render inside a clean course visual shell");
  assert(blockRenderer.includes('data-course-interactive="true"'), "visual blocks mark their canvas as interactive");
  assert(blockRenderer.includes('variant="course"'), "course visual renderers suppress their internal tool-card title bars");

  assert(styles.includes(".course-block-learning-actions"), "block action tray has dedicated styling");
  assert(styles.includes(".course-block-action-panel"), "expanded block actions use a bottom panel style");
  assert(!styles.includes(".course-block-action-panel::before"), "expanded block actions do not render an extra lower lip");
  assert(styles.includes(".course-block-learning-actions {\n  margin: 4px 0 0;\n  padding: 0;\n  border-top: 0;"), "expanded block actions sit close to the block without a separator line");
  assert(styles.includes("flex-direction: column"), "block actions stack the trigger and bottom panel instead of rendering inline");
  assert(styles.includes(".course-block-action-tray"), "expanded block actions have dedicated styling");
  assert(styles.includes(".app-shell.course-app-shell"), "course lesson shell removes the global nav column");
  assert(styles.includes("width: calc(100vw - var(--course-sidebar-width))"), "course workspace width only reserves space for the Tutor sidebar");
  assert(styles.includes(".course-ai-context-strip.empty"), "Course Tutor empty context state has dedicated styling");
  assert(styles.includes(".course-copilot-surface .copilotKitInputContainer"), "Course Tutor resets CopilotKit's input container chrome");
  assert(styles.includes(".course-copilot-surface .copilotKitInput"), "Course Tutor directly overrides CopilotKit's default large input");
  assert(styles.includes("min-height: 54px !important"), "Course Tutor input stays compact in the fixed sidebar");
  assert(styles.includes("grid-template-columns: 34px minmax(0, 1fr) 34px !important"), "Course Tutor input aligns upload, textarea, and send controls");
  assert(styles.includes('[data-testid="copilot-chat-input"] > div > div:nth-child(2)'), "Course Tutor keeps the textarea column visible in CopilotKit's v2 input grid");
  assert(styles.includes("overflow: hidden !important"), "Course Tutor input hides textarea scrollbars");
  assert(styles.includes("[data-testid=\"copilot-chat-textarea\"]::-webkit-scrollbar"), "Course Tutor hides WebKit textarea scrollbars");
  assert(styles.includes('[data-testid="copilot-send-button"][disabled]'), "Course Tutor styles the disabled send button without hiding the textarea");
  assert(detail.includes("--course-content-margin-end"), "course detail switches content alignment when the Copilot panel is collapsed");
  assert(detail.includes('sidebarCollapsed ? "auto" : "var(--course-content-gutter)"'), "collapsed Copilot sidebar recenters the lesson column");
  assert(styles.includes("--course-content-margin-end: var(--course-content-gutter)"), "expanded course detail content stays aligned closer to the fixed Copilot panel");
  assert(styles.includes("margin-right: var(--course-content-margin-end)"), "course detail header and blocks share the same responsive horizontal alignment");
  assert(styles.includes(".course-transfer-path"), "transfer block path has dedicated styling");
  assert(styles.includes(".course-transfer-example"), "transfer block example has dedicated styling");
  assert(styles.includes(".course-transfer-example-body ol"), "transfer block example lists keep readable indentation");
  assert(styles.includes(".course-visual-frame"), "course visual shell has dedicated styling");
  assert(styles.includes(".course-visual-canvas"), "course visual canvas has dedicated styling");
  assert(/\.course-visual-frame\s*{[^}]*border:\s*0;[^}]*border-radius:\s*0;[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;/s.test(styles), "course visual shell removes the extra inner frame chrome");
  assert(/\.course-visual-frame \.widget-frame\s*{[^}]*border:\s*0;[^}]*background:\s*transparent;/s.test(styles), "course visual iframe has no extra rendered border background");
  assert(/\.course-image\s*{[^}]*border-radius:\s*0;[^}]*background:\s*transparent;[^}]*border:\s*0;/s.test(styles), "image blocks remove the extra inner image frame chrome");

  process.stdout.write("[course-detail-lesson-ui-static.unit] ALL CHECKS PASSED\n");
}

main();
