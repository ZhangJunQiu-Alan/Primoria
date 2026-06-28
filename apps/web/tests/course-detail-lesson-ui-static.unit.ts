#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { join } from "node:path";

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

  assert(page.includes("course-status-row"), "course header exposes a clearer lesson status row");
  assert(page.includes("当前 lesson"), "course header labels the current lesson surface");
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
  assert(detail.includes("解释这一段"), "block action tray includes explain action");
  assert(detail.includes("给我一个例子"), "block action tray includes example action");
  assert(detail.includes("出 3 道练习"), "block action tray includes practice action");
  assert(detail.includes("检查我是否理解"), "block action tray includes understanding-check action");
  assert(detail.includes("sendCoursePrompt(courseThreadId"), "block actions still route through the existing Course Copilot prompt bridge");
  assert(detail.includes("currentLessonBlocks(course, currentLessonId)"), "course detail renders only blocks from the active lesson");
  assert(detail.includes("visibleBlocks={blocks}"), "Course Copilot receives the same active-lesson block list as the page");
  assert(detail.includes("currentLessonId={currentLessonId}"), "upcoming lesson view is anchored to the current lesson");
  assert(detail.includes("course-ai-context-strip"), "Course Copilot renders current block context");
  assert(detail.includes("还没有选中的 block"), "Course Copilot has a no-selection empty context state");
  assert(detail.includes("setSidebarCollapsed(false)"), "block actions reopen the Copilot sidebar before sending prompts");

  assert(!detail.includes("scrollSpy"), "course detail does not add scroll spy state");
  assert(!detail.includes("scroll-spy"), "course detail does not add scroll spy classes");
  assert(!detail.includes("course-scroll-directory"), "course detail does not add a scrolling directory");
  assert(!styles.includes("course-scroll-directory"), "styles do not add a scrolling directory");
  assert(!styles.includes(".course-block-action-toggle"), "styles do not keep the visible learning-action trigger");

  assert(blockRenderer.includes("function BlockShell"), "BlockRenderer remains focused on rendering block content");
  assert(!blockRenderer.includes("CourseBlockActionTray"), "learning actions are not embedded in BlockRenderer");
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
  assert(styles.includes("border-top: 1px solid rgba(23, 19, 15, 0.08)"), "expanded block actions sit inside the block as a clean footer");
  assert(styles.includes("flex-direction: column"), "block actions stack the trigger and bottom panel instead of rendering inline");
  assert(styles.includes(".course-block-action-tray"), "expanded block actions have dedicated styling");
  assert(styles.includes(".course-ai-context-strip.empty"), "Course Copilot empty context state has dedicated styling");
  assert(styles.includes(".course-copilot-surface .copilotKitInputContainer"), "Course Copilot resets CopilotKit's input container chrome");
  assert(styles.includes(".course-copilot-surface .copilotKitInput"), "Course Copilot directly overrides CopilotKit's default large input");
  assert(styles.includes("min-height: 54px !important"), "Course Copilot input stays compact in the fixed sidebar");
  assert(styles.includes("grid-template-columns: 32px minmax(0, 1fr) 32px"), "Course Copilot input aligns upload, textarea, and send controls");
  assert(styles.includes(".course-copilot-surface .copilotKitInputControls"), "Course Copilot aligns CopilotKit input controls");
  assert(detail.includes("--course-content-margin-end"), "course detail switches content alignment when the Copilot panel is collapsed");
  assert(detail.includes('sidebarCollapsed ? "auto" : "var(--course-content-gutter)"'), "collapsed Copilot sidebar recenters the lesson column");
  assert(styles.includes("--course-content-margin-end: var(--course-content-gutter)"), "expanded course detail content stays aligned closer to the fixed Copilot panel");
  assert(styles.includes("margin-right: var(--course-content-margin-end)"), "course detail header and blocks share the same responsive horizontal alignment");
  assert(styles.includes(".course-transfer-path"), "transfer block path has dedicated styling");
  assert(styles.includes(".course-transfer-example"), "transfer block example has dedicated styling");
  assert(styles.includes(".course-transfer-example-body ol"), "transfer block example lists keep readable indentation");
  assert(styles.includes(".course-visual-frame"), "course visual shell has dedicated styling");
  assert(styles.includes(".course-visual-canvas"), "course visual canvas has dedicated styling");

  process.stdout.write("[course-detail-lesson-ui-static.unit] ALL CHECKS PASSED\n");
}

main();
