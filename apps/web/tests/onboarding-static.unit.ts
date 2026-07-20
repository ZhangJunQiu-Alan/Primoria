#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { isLearnerOnboardingComplete, nextOnboardingStep } from "../src/lib/learner-profile/store.ts";
import type { LearnerProfile } from "../src/lib/learner-profile/types.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

const here = dirname(fileURLToPath(import.meta.url));
const src = (path: string) => readFileSync(resolve(here, "../src", path), "utf8");
const app = (path: string) => readFileSync(resolve(here, "..", path), "utf8");

function profile(patch: Partial<LearnerProfile> = {}): LearnerProfile {
  return {
    ownerId: "u1",
    learningGoal: null,
    goalGraphId: null,
    goalStartTopicId: null,
    goalTargetConceptId: null,
    goalTargetConceptIds: [],
    goalScope: null,
    goalSkippedAt: null,
    goalPositioningStatus: null,
    goalPositioningMessage: null,
    goalPositioningCandidates: [],
    goalPositioningUpdatedAt: null,
    onboardingCourseStatus: null,
    onboardingCourseMessage: null,
    onboardingCourseUpdatedAt: null,
    factsIntakeStatus: null,
    factsIntakeJobId: null,
    factsIntakeMessage: null,
    factsIntakeUpdatedAt: null,
    educationStage: null,
    curriculumSystem: null,
    educationContextSource: null,
    educationContextConfirmedAt: null,
    knowledgeBackground: null,
    knowledgeBackgroundSkippedAt: null,
    tutorStyle: null,
    tutorStyleSkippedAt: null,
    onboardingCompletedAt: null,
    onboardingSkippedAt: null,
    createdAt: null,
    updatedAt: null,
    ...patch,
  };
}

function main() {
  assert(nextOnboardingStep(null) === "goal", "missing profile starts at goal");
  assert(nextOnboardingStep(profile({ goalSkippedAt: "now" })) === "facts", "goal can be skipped");
  assert(
    nextOnboardingStep(profile({ learningGoal: "learn DSA", goalPositioningStatus: "pending" })) === "facts",
    "pending goal positioning does not block facts step",
  );
  assert(
    nextOnboardingStep(profile({ goalGraphId: "g", goalStartTopicId: "t", factsIntakeStatus: "skipped" })) === "style",
    "facts intake can be skipped after goal anchor",
  );
  assert(
    nextOnboardingStep(profile({ learningGoal: "science", goalPositioningStatus: "clarify", knowledgeBackgroundSkippedAt: "now", tutorStyleSkippedAt: "now" })) === "done",
    "clarification is surfaced at the final step",
  );
  assert(
    isLearnerOnboardingComplete(profile({ goalSkippedAt: "now", knowledgeBackgroundSkippedAt: "now", tutorStyleSkippedAt: "now" })),
    "all three skipped steps count as complete",
  );
  assert(
    !isLearnerOnboardingComplete(profile({ learningGoal: "science", goalPositioningStatus: "clarify", knowledgeBackgroundSkippedAt: "now", tutorStyleSkippedAt: "now" })),
    "clarification must be resolved before onboarding is complete",
  );
  assert(
    !isLearnerOnboardingComplete(profile({ learningGoal: "science", goalGraphId: "g", goalStartTopicId: "t", onboardingCourseStatus: "failed", knowledgeBackgroundSkippedAt: "now", tutorStyleSkippedAt: "now", onboardingCompletedAt: "now" })),
    "failed course preparation keeps onboarding open for retry",
  );
  assert(
    isLearnerOnboardingComplete(profile({ learningGoal: "science", goalGraphId: "g", goalStartTopicId: "t", onboardingCourseStatus: "ready", knowledgeBackgroundSkippedAt: "now", tutorStyleSkippedAt: "now", onboardingCompletedAt: "now" })),
    "ready course preparation allows onboarding completion",
  );

  const page = src("app/page.tsx");
  assert(page.includes("getLearnerOnboardingState"), "homepage loads onboarding state");
  assert(page.includes("<OnboardingClient initialState={onboarding} suggestedRegion={curriculumRegion} />"), "homepage gates into onboarding client with an ephemeral curriculum suggestion");

  const devOnboardingPage = src("app/dev/onboarding/page.tsx");
  assert(devOnboardingPage.includes("debugMode"), "dev onboarding route renders client in debug mode");
  assert(devOnboardingPage.includes('process.env.NODE_ENV === "production"'), "dev onboarding route is hidden in production by default");

  const proxy = src("proxy.ts");
  const authRoutes = src("lib/auth/routes.ts");
  assert(proxy.includes("isPublicPath"), "proxy delegates public route checks to the shared auth route policy");
  assert(authRoutes.includes("^\\/dev\\/onboarding"), "dev onboarding route bypasses auth proxy");

  const onboardingPositioning = src("lib/learner-profile/onboarding-positioning.ts");
  assert(onboardingPositioning.includes("getOrCreateGeneratedGraph"), "out-of-library goals reuse the Home generated-graph path");
  assert(onboardingPositioning.includes('branch: "generated"'), "generated anchors are tagged for the client");

  const onboardingCourse = src("lib/learner-profile/onboarding-course.ts");
  assert(onboardingCourse.includes("GENERATED_GRAPH_PREFIX"), "course build routes gen_* anchors to the generated graph");
  assert(onboardingCourse.includes("generatedGraph: graph"), "generated onboarding courses build from the stored graph");

  const goalRoute = src("app/api/onboarding/goal/route.ts");
  assert(goalRoute.includes("resolveOnboardingGoalAnchor"), "goal route resolves KG anchor");
  assert(goalRoute.includes("after(() => positionLearningGoalInBackground"), "goal route positions KG anchor after the response");
  assert(goalRoute.includes("savePendingLearningGoal"), "goal route saves the raw goal before background positioning");
  assert(goalRoute.includes("savePositionedLearningGoalIfPending"), "background goal result uses an atomic pending-goal write fence");
  assert(goalRoute.includes("skipLearningGoal"), "goal route supports step skip");

  const factsRoute = src("app/api/onboarding/facts/route.ts");
  assert(factsRoute.includes("enqueueProfileFactIntakeJob"), "facts route enqueues background extraction without calling the model");
  assert(factsRoute.includes("skipFactsIntake"), "facts route supports step skip");
  assert(factsRoute.includes("saveEducationContext"), "facts route persists confirmed structured education context");

  const courseGenerator = src("lib/ai/deepagent/course-generator.ts");
  assert(courseGenerator.includes("isOwnerScopeUniqueViolation"), "course init recovers from owner+scope race");
  assert(courseGenerator.includes("courses_owner_scope_uidx"), "course init targets owner+scope unique constraint");
  assert(courseGenerator.includes("getCourseByScopeKey(ownerId, scopeKey)"), "course init reloads winning scoped course after race");

  const courseStore = src("lib/courses/store.ts");
  assert(courseStore.includes("eq(coursesTable.scopeKey, scopeKey), isNull(coursesTable.archivedAt)"), "course scope reuse ignores archived courses");

  const schema = src("lib/db/schema.ts");
  assert(schema.includes(".where(sql`${table.archivedAt} IS NULL and ${table.scopeKey} IS NOT NULL`)"), "course scope uniqueness only applies to active scoped courses");

  const activeCourseGraphMigration = app("drizzle/0030_active_course_graph_unique.sql");
  assert(activeCourseGraphMigration.includes('DROP INDEX IF EXISTS "courses_owner_graph_uidx"'), "migration removes global course graph uniqueness");
  assert(activeCourseGraphMigration.includes('WHERE "archived_at" IS NULL'), "migration creates active-only course graph uniqueness");

  const scopedCourseMigration = app("drizzle/0049_quick_malcolm_colcord.sql");
  assert(scopedCourseMigration.includes('CREATE UNIQUE INDEX "courses_owner_scope_uidx"'), "migration creates active-only course scope uniqueness");

  const styleRoute = src("app/api/onboarding/style/route.ts");
  assert(styleRoute.includes("saveTutorStyle"), "style route saves tutor style");
  assert(styleRoute.includes("buildOnboardingCourse"), "style route can build the course if goal positioning finished late");
  assert(styleRoute.includes("skipTutorStyle"), "style route supports step skip");

  const onboardingClient = src("components/onboarding/onboarding-client.tsx");
  assert(onboardingClient.includes("normalizeTutorStyle"), "onboarding client normalizes tutor style");
  assert(onboardingClient.includes("new window.Image()"), "onboarding client preloads tutor persona images");
  assert(onboardingClient.includes('goalStatus === "pending"'), "onboarding client handles pending background positioning");
  assert(onboardingClient.includes("finalClarify"), "onboarding client asks ambiguous goals at the final step");
  assert(onboardingClient.includes("disabled={busy || !isTutorStyle(style)}"), "style submit blocks invalid tutor style");
  assert(onboardingClient.includes("unoptimized"), "onboarding visuals use direct public assets for cached preloads");
  assert(!onboardingClient.includes("key={visualImage.src}"), "onboarding visual image does not force remount on style change");

  const positioning = src("lib/learner-profile/onboarding-positioning.ts");
  assert(positioning.includes('branch: "subject_start"'), "broad onboarding goal starts from subject root");
  assert(positioning.includes("sort((a, b) => a.defaultOrder - b.defaultOrder)"), "subject root uses first default_order topic");

  const profileStore = src("lib/learner-profile/store.ts");
  assert(profileStore.includes("goalPositioningStatus"), "profile store persists goal positioning status");
  assert(profileStore.includes('eq(learnerProfiles.goalPositioningStatus, "pending")'), "profile store fences stale background goal writes");
  assert(profileStore.includes("goalPositioningAttemptId"), "profile store fences same-text goal retries by attempt ID");
  assert(goalRoute.includes("isLearningGoalPositioningAttemptPending"), "goal callback checks its attempt identity before resolving");
  assert(profileStore.includes("onboardingCourseStatus"), "profile store persists onboarding course status");

  const onboardingCourseBuild = src("lib/learner-profile/onboarding-course-build.ts");
  assert(onboardingCourseBuild.includes("beginOnboardingCourseBuild"), "course build records a new building attempt");
  assert(onboardingCourseBuild.includes("failOnboardingCourseBuild"), "course build records failure through its attempt fence");

  const onboardingRetryRoute = src("app/api/onboarding/course/route.ts");
  assert(onboardingRetryRoute.includes("buildOnboardingCourseIfReady"), "course retry route uses the facts-aware readiness gate");

  const lessonContext = src("lib/courses/lesson-generation-context.ts");
  assert(lessonContext.includes("getLearnerProfile"), "lesson generation loads learner profile");
  assert(lessonContext.includes("knowledgeBackground,"), "lesson KG context carries knowledge background");

  const planner = src("lib/ai/course-generation/lesson-planner.ts");
  const writer = src("lib/ai/course-generation/block-writer.ts");
  assert(planner.includes("knowledgeBackgroundDirective"), "planner prompt includes background directive");
  assert(writer.includes("knowledgeBackgroundDirective"), "writer prompt includes background directive");

  const copilotRoute = src("app/api/copilotkit/route.ts");
  assert(copilotRoute.includes("tutorStyleDirective"), "copilot route injects tutor style");
  assert(copilotRoute.includes("dialogue only"), "tutor style stays dialogue-only");

  process.stdout.write("[onboarding-static.unit] ALL CHECKS PASSED\n");
}

main();
