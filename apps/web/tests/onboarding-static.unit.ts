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
    goalSkippedAt: null,
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
  assert(nextOnboardingStep(profile({ goalSkippedAt: "now" })) === "background", "goal can be skipped");
  assert(
    nextOnboardingStep(profile({ goalGraphId: "g", goalStartTopicId: "t", knowledgeBackgroundSkippedAt: "now" })) === "style",
    "background can be skipped after goal anchor",
  );
  assert(
    isLearnerOnboardingComplete(profile({ goalSkippedAt: "now", knowledgeBackgroundSkippedAt: "now", tutorStyleSkippedAt: "now" })),
    "all three skipped steps count as complete",
  );

  const page = src("app/page.tsx");
  assert(page.includes("getLearnerOnboardingState"), "homepage loads onboarding state");
  assert(page.includes("<OnboardingClient initialState={onboarding} />"), "homepage gates into onboarding client");

  const devOnboardingPage = src("app/dev/onboarding/page.tsx");
  assert(devOnboardingPage.includes("debugMode"), "dev onboarding route renders client in debug mode");
  assert(devOnboardingPage.includes('process.env.NODE_ENV === "production"'), "dev onboarding route is hidden in production by default");

  const supabaseMiddleware = src("lib/supabase/middleware.ts");
  assert(supabaseMiddleware.includes("^\\/dev\\/onboarding"), "dev onboarding route bypasses auth proxy");

  const goalRoute = src("app/api/onboarding/goal/route.ts");
  assert(goalRoute.includes("resolveOnboardingGoalAnchor"), "goal route resolves KG anchor");
  assert(goalRoute.includes("skipLearningGoal"), "goal route supports step skip");

  const backgroundRoute = src("app/api/onboarding/background/route.ts");
  assert(backgroundRoute.includes("buildOnboardingCourse"), "background route triggers course build");
  assert(backgroundRoute.includes("skipKnowledgeBackground"), "background route supports step skip");

  const courseGenerator = src("lib/ai/deepagent/course-generator.ts");
  assert(courseGenerator.includes("isOwnerGraphUniqueViolation"), "course init recovers from owner+graph race");
  assert(courseGenerator.includes("courses_owner_graph_uidx"), "course init targets owner+graph unique constraint");
  assert(courseGenerator.includes("getCourseByGraph(ownerId, graphId)"), "course init reloads winning course after race");

  const courseStore = src("lib/courses/store.ts");
  assert(courseStore.includes("eq(coursesTable.graphId, graphId), isNull(coursesTable.archivedAt)"), "course graph reuse ignores archived courses");

  const schema = src("lib/db/schema.ts");
  assert(schema.includes(".where(sql`${table.archivedAt} IS NULL`)"), "course graph uniqueness only applies to active courses");

  const activeCourseGraphMigration = app("drizzle/0030_active_course_graph_unique.sql");
  assert(activeCourseGraphMigration.includes('DROP INDEX IF EXISTS "courses_owner_graph_uidx"'), "migration removes global course graph uniqueness");
  assert(activeCourseGraphMigration.includes('WHERE "archived_at" IS NULL'), "migration creates active-only course graph uniqueness");

  const styleRoute = src("app/api/onboarding/style/route.ts");
  assert(styleRoute.includes("saveTutorStyle"), "style route saves tutor style");
  assert(styleRoute.includes("skipTutorStyle"), "style route supports step skip");

  const onboardingClient = src("components/onboarding/onboarding-client.tsx");
  assert(onboardingClient.includes("normalizeTutorStyle"), "onboarding client normalizes tutor style");
  assert(onboardingClient.includes("new window.Image()"), "onboarding client preloads tutor persona images");
  assert(onboardingClient.includes("disabled={busy || !isTutorStyle(style)}"), "style submit blocks invalid tutor style");
  assert(onboardingClient.includes("unoptimized"), "onboarding visuals use direct public assets for cached preloads");
  assert(!onboardingClient.includes("key={visualImage.src}"), "onboarding visual image does not force remount on style change");

  const positioning = src("lib/learner-profile/onboarding-positioning.ts");
  assert(positioning.includes('branch: "subject_start"'), "broad onboarding goal starts from subject root");
  assert(positioning.includes("sort((a, b) => a.defaultOrder - b.defaultOrder)"), "subject root uses first default_order topic");

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
