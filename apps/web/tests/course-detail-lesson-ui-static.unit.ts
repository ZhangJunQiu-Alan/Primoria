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
  assert(page.includes("<CourseDetailClient"), "lesson route delegates the reader shell to the client component");
  assert(page.includes("initialLessonId={requestedLessonId ?? null}"), "lesson route passes the requested lesson into the reader");
  assert(page.includes("initialLessonJobs={lessonJobs}"), "lesson route keeps generation-job state available to pending lessons");
  assert(!page.includes("const lessonTitle = currentLesson?.title ?? course.title"), "lesson route no longer owns the visible lesson header");
  assert(!page.includes("<h1>{lessonTitle}</h1>"), "lesson route no longer renders the lesson title outside the reader");
  assert(!page.includes("<h1>{course.title}</h1>"), "lesson header does not render the parent course title");
  assert(!page.includes("<p className=\"course-summary-text\">{course.summary}</p>"), "lesson header does not render the parent course summary");
  assert(!page.includes("course-status-row"), "lesson route no longer renders the old header status row");
  assert(!page.includes("当前 lesson"), "course header does not repeat the current-lesson pill");
  assert(!page.includes("currentCourseLesson(course, requestedLessonId)"), "course route leaves current-lesson resolution to the reader client");
  assert(!page.includes("currentLessonBlocks(course, requestedLessonId)"), "course route leaves block progress to the reader client");

  assert(!detail.includes("expandedActionsBlockId"), "course detail no longer tracks the removed bottom block action tray");
  assert(detail.includes("function selectBlock(block: CourseBlock)"), "clicking a reader block only selects it for Tutor context");
  assert(!detail.includes("setExpandedActionsBlockId(block.id)"), "clicking a block no longer opens a bottom action drawer");
  assert(!detail.includes("setExpandedActionsBlockId(null)"), "course detail no longer clears removed action drawer state");
  assert(!detail.includes("CourseBlockActionTray"), "course detail no longer renders per-block learning actions under the reader card");
  assert(!detail.includes("data-actions-expanded"), "reader block no longer carries removed action drawer state");
  assert(!detail.includes("aria-expanded={actionsExpanded}"), "reader no longer renders a bottom action trigger with expanded state");
  assert(!detail.includes("aria-controls={`course-block-actions-${currentBlock.id}`}"), "reader no longer controls a hidden bottom action panel");
  assert(!detail.includes("course-block-action-trigger"), "course detail no longer renders the per-block action trigger");
  assert(!detail.includes('d="M12 5h.01"') && !detail.includes('d="M12 12h.01"') && !detail.includes('d="M12 19h.01"'), "reader no longer renders the top-right three-dot block action button");
  assert(!detail.includes("stopBlockActionEvent"), "removed block action tray no longer needs event shielding");
  assert(detail.includes("isCourseBlockInteractiveTarget"), "course block wrapper ignores internal interactive controls");
  assert(detail.includes("[data-course-interactive='true']"), "course block wrapper treats visual canvases as internal interactive zones");
  assert(!detail.includes("course-block-action-panel"), "course detail no longer renders a bottom action panel");
  assert(!detail.includes("针对当前 block"), "bottom action panel no longer repeats the current-block label");
  assert(!detail.includes("学习动作</button>"), "course detail uses an icon action trigger instead of a text-heavy button");
  assert(!detail.includes("course-block-action-toggle"), "course detail does not render the old visible action toggle");
  assert(!detail.includes("t.actionExplain"), "removed bottom action tray no longer renders explain action copy");
  assert(!detail.includes("t.actionExample"), "removed bottom action tray no longer renders example action copy");
  assert(!detail.includes("t.actionPractice"), "removed bottom action tray no longer renders practice action copy");
  assert(!detail.includes("t.actionCheck"), "removed bottom action tray no longer renders understanding-check action copy");
  assert(detail.includes("sendCoursePrompt(courseThreadId"), "Course Tutor suggestion prompts still route through the existing prompt bridge");
  assert(detail.includes("currentLessonBlocks(course, currentLessonId)"), "course detail renders only blocks from the active lesson");
  assert(detail.includes("const currentBlock = blocks[currentStepIndex] ?? null"), "course detail renders a single active block step");
  assert(detail.includes("const readerProgress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0"), "reader progress is based on current block over total lesson blocks");
  assert(detail.includes("readerStep.lessonId === currentLessonId ? Math.min(readerStep.index, maxStepIndex) : 0"), "reader starts each lesson at the first block and clamps edits without an effect");
  assert(detail.includes("goToStep(currentStepIndex + 1)"), "reader arrows advance by block step");
  assert(detail.includes("course-reader-topbar"), "reader renders its own close/title/progress top bar");
  assert(detail.includes("course-reader-card"), "reader renders the active block inside a central content panel");
  assert(detail.includes("course-reader-controls"), "reader renders bottom navigation controls");
  assert(detail.includes("router.push(`/course/${course.id}/outline`)"), "reader close and Done return to the course outline");
  assert(detail.includes("isPracticeBlock(currentBlock)"), "reader reserves Check behavior for practice blocks");
  assert(detail.includes("course-quiz-submit:not(:disabled)") && detail.includes("worksheet-reveal-btn"), "reader Check delegates to existing quiz and worksheet controls");
  assert(detail.includes("const [sidebarCollapsed, setSidebarCollapsed] = useState(true)"), "Course Tutor AI rail starts collapsed by default");
  assert(styles.includes("--course-collapsed-sidebar-width"), "Course Tutor collapsed rail uses CSS-owned responsive width");
  assert(detail.includes("if (collapsed) onCollapsedChange(false);"), "clicking the collapsed AI rail expands Course Tutor");
  assert(detail.includes("visibleBlocks={blocks}"), "Course Tutor receives the same active-lesson block list as the page");
  assert(detail.includes("currentLessonId={currentLessonId}"), "Course Tutor remains scoped to the current lesson");
  assert(!detail.includes("course-ai-context-strip"), "Course Tutor no longer renders the visible current-context card");
  assert(!detail.includes("t.noSelectedBlock"), "Course Tutor no longer renders a visible no-selection context state");
  assert(detail.includes("buildCourseContext(course, visibleBlocks, selectedBlock, selectedTextContext)"), "Course Tutor still receives hidden selected-block and selected-text context");
  assert(detail.includes("<strong>{t.tutorTitle}</strong>") && dictionaries.en.course.tutorTitle === "Course Tutor", "Course Tutor is the visible sidebar title");
  assert(detail.includes("placeholder={t.composerPlaceholder}") && dictionaries.zh.course.composerPlaceholder === "Ask More, Know You More", "Course Tutor input uses the updated placeholder");
  assert(!detail.includes("Course Copilot"), "Course Tutor code has no old visible Course Copilot copy");
  assert(!detail.includes("Ask about this course"), "Course Tutor sidebar does not repeat the old generic subtitle");
  assert(!detail.includes("text block · 点击下方建议或直接提问"), "Course Tutor context strip omits block-type helper copy");

  assert(!detail.includes("scrollSpy"), "course detail does not add scroll spy state");
  assert(!detail.includes("scroll-spy"), "course detail does not add scroll spy classes");
  assert(!detail.includes("course-scroll-directory"), "course detail does not add a scrolling directory");
  assert(!styles.includes("course-scroll-directory"), "styles do not add a scrolling directory");
  assert(!styles.includes(".course-block-action-trigger"), "styles no longer include the removed block action trigger");
  assert(!styles.includes(".course-block-action-toggle"), "styles do not keep the old learning-action toggle");

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

  assert(!styles.includes(".course-block-learning-actions"), "styles no longer include the removed block action tray");
  assert(!styles.includes(".course-block-action-panel"), "styles no longer include the removed bottom action panel");
  assert(!styles.includes(".course-block-action-panel::before"), "expanded block actions do not render an extra lower lip");
  assert(!styles.includes(".course-block-action-tray"), "styles no longer include the removed action tray buttons");
  assert(styles.includes(".app-shell.course-app-shell"), "course lesson shell removes the global nav column");
  assert(styles.includes("width: calc(100vw - var(--course-sidebar-width))"), "course workspace width only reserves space for the Tutor sidebar");
  assert(styles.includes(".course-reader {\n  width: 100%;\n  height: 100vh;"), "course detail renders as a full-height reader");
  assert(styles.includes("grid-template-rows: 96px minmax(0, 1fr) 118px"), "course reader reserves top progress, content, and bottom controls");
  assert(styles.includes(".course-reader-card .course-block"), "reader card keeps BlockRenderer responsible for the block body");
  assert(styles.includes("@keyframes course-reader-card-in"), "reader step changes have a restrained entrance transition");
  assert(styles.includes(".course-ai-sidebar.collapsed .course-ai-collapse"), "collapsed AI rail has dedicated affordance styling");
  assert(styles.includes("cursor: pointer;"), "collapsed AI rail signals that the whole strip can be opened");
  assert(!styles.includes("min-width: 30px;"), "empty reader progress does not force a visible orange segment");
  assert(!styles.includes(".course-ai-context-strip"), "styles no longer include the removed Course Tutor context strip");
  assert(styles.includes(".course-copilot-surface .copilotKitInputContainer"), "Course Tutor resets CopilotKit's input container chrome");
  assert(styles.includes(".course-copilot-surface .copilotKitInput"), "Course Tutor directly overrides CopilotKit's default large input");
  assert(styles.includes("min-height: 54px !important"), "Course Tutor input stays compact in the fixed sidebar");
  assert(styles.includes("grid-template-columns: 34px minmax(0, 1fr) 34px !important"), "Course Tutor input aligns upload, textarea, and send controls");
  assert(styles.includes('[data-testid="copilot-chat-input"] > div > div:nth-child(2)'), "Course Tutor keeps the textarea column visible in CopilotKit's v2 input grid");
  assert(styles.includes("overflow: hidden !important"), "Course Tutor input hides textarea scrollbars");
  assert(styles.includes("[data-testid=\"copilot-chat-textarea\"]::-webkit-scrollbar"), "Course Tutor hides WebKit textarea scrollbars");
  assert(styles.includes('[data-testid="copilot-send-button"][disabled]'), "Course Tutor styles the disabled send button without hiding the textarea");
  assert(detail.includes("--course-sidebar-width"), "course detail updates the reserved width as the AI rail expands or collapses");
  assert(detail.includes('style={collapsed ? undefined : { ["--course-sidebar-width" as string]: `${width}px` }}'), "collapsed Course Tutor rail uses CSS default width instead of inline desktop width");
  assert(styles.includes("--course-collapsed-sidebar-width: 84px"), "course workspace defaults to the narrow AI rail width");
  assert(styles.includes("--course-collapsed-sidebar-width: 68px"), "mobile course workspace keeps its narrower collapsed rail width");
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
