import { randomUUID } from "node:crypto";

import { and, eq, inArray, isNull, lte, or } from "drizzle-orm";

import { getDb, hasDatabaseUrl } from "@/lib/db/client";
import { learnerProfiles, type LearnerProfileRow } from "@/lib/db/schema";
import {
  type GoalPositioningCandidate,
  type GoalPositioningStatus,
  isKnowledgeBackground,
  isTutorStyle,
  type KnowledgeBackground,
  type LearnerOnboardingState,
  type LearnerProfile,
  type OnboardingCourseStatus,
  type OnboardingStep,
  type TutorStyle,
} from "./types";

const GOAL_POSITIONING_STATUSES: readonly GoalPositioningStatus[] = ["pending", "positioned", "clarify", "failed"];
const ONBOARDING_COURSE_STATUSES: readonly OnboardingCourseStatus[] = ["pending", "building", "ready", "failed"];

function iso(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

export function rowToLearnerProfile(row: LearnerProfileRow): LearnerProfile {
  return {
    ownerId: row.ownerId,
    learningGoal: row.learningGoal ?? null,
    goalGraphId: row.goalGraphId ?? null,
    goalStartTopicId: row.goalStartTopicId ?? null,
    goalTargetConceptId: row.goalTargetConceptId ?? null,
    goalSkippedAt: iso(row.goalSkippedAt),
    goalPositioningStatus: isGoalPositioningStatus(row.goalPositioningStatus) ? row.goalPositioningStatus : null,
    goalPositioningMessage: row.goalPositioningMessage ?? null,
    goalPositioningCandidates: normalizeGoalPositioningCandidates(row.goalPositioningCandidates),
    goalPositioningUpdatedAt: iso(row.goalPositioningUpdatedAt),
    onboardingCourseStatus: isOnboardingCourseStatus(row.onboardingCourseStatus) ? row.onboardingCourseStatus : null,
    onboardingCourseMessage: row.onboardingCourseMessage ?? null,
    onboardingCourseUpdatedAt: iso(row.onboardingCourseUpdatedAt),
    knowledgeBackground: isKnowledgeBackground(row.knowledgeBackground) ? row.knowledgeBackground : null,
    knowledgeBackgroundSkippedAt: iso(row.knowledgeBackgroundSkippedAt),
    tutorStyle: isTutorStyle(row.tutorStyle) ? row.tutorStyle : null,
    tutorStyleSkippedAt: iso(row.tutorStyleSkippedAt),
    onboardingCompletedAt: iso(row.onboardingCompletedAt),
    onboardingSkippedAt: iso(row.onboardingSkippedAt),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

function hasGoal(profile: LearnerProfile | null) {
  return Boolean(profile?.goalSkippedAt || profile?.learningGoal?.trim() || (profile?.goalGraphId && profile.goalStartTopicId));
}

function hasBackground(profile: LearnerProfile | null) {
  return Boolean(profile?.knowledgeBackground || profile?.knowledgeBackgroundSkippedAt);
}

function hasStyle(profile: LearnerProfile | null) {
  return Boolean(profile?.tutorStyle || profile?.tutorStyleSkippedAt);
}

export function isLearnerOnboardingComplete(profile: LearnerProfile | null) {
  if (profile?.goalPositioningStatus === "clarify" && !profile.goalGraphId) return false;
  if (
    profile?.goalGraphId &&
    profile.onboardingCourseStatus &&
    profile.onboardingCourseStatus !== "ready"
  ) return false;
  return Boolean(profile?.onboardingCompletedAt || profile?.onboardingSkippedAt || (hasGoal(profile) && hasBackground(profile) && hasStyle(profile)));
}

export function nextOnboardingStep(profile: LearnerProfile | null): OnboardingStep {
  if (profile?.goalPositioningStatus === "clarify" && hasBackground(profile) && hasStyle(profile) && !profile.goalGraphId) return "done";
  if (isLearnerOnboardingComplete(profile)) return "done";
  if (!hasGoal(profile)) return "goal";
  if (!hasBackground(profile)) return "background";
  if (!hasStyle(profile)) return "style";
  return "done";
}

export async function getLearnerProfile(ownerId: string): Promise<LearnerProfile | null> {
  if (!hasDatabaseUrl()) return null;
  const rows = await getLearnerProfileRows(ownerId);
  return rows[0] ? rowToLearnerProfile(rows[0]) : null;
}

export async function getLearnerOnboardingState(ownerId: string): Promise<LearnerOnboardingState> {
  if (!hasDatabaseUrl()) {
    return { profile: null, nextStep: "goal", complete: false };
  }
  const rows = await getLearnerProfileRows(ownerId);
  const row = rows[0];
  let profile = row ? rowToLearnerProfile(row) : null;
  if (profile && row) {
    profile = await failStaleOnboardingWork(
      profile,
      row.goalPositioningAttemptId,
      row.onboardingCourseAttemptId,
    );
  }
  return {
    profile,
    nextStep: nextOnboardingStep(profile),
    complete: isLearnerOnboardingComplete(profile),
  };
}

function getLearnerProfileRows(ownerId: string) {
  return getDb().select().from(learnerProfiles).where(eq(learnerProfiles.ownerId, ownerId)).limit(1);
}

// after() background work has no persistence: if the process dies before the
// callback writes a terminal status, the profile stays in-flight forever and
// the done-page poll never ends. Reads repair anything in-flight past this
// window to "failed" so the learner gets the existing retry UI instead.
export const ONBOARDING_STALE_PENDING_MS = 5 * 60 * 1000;

export const GOAL_POSITIONING_INTERRUPTED_MESSAGE =
  "Positioning was interrupted before it finished. Please submit your goal again.";
export const COURSE_BUILD_INTERRUPTED_MESSAGE =
  "Course preparation was interrupted before it finished. Please retry.";

// A missing or unparseable timestamp on an in-flight status is itself broken
// state, so it counts as stale.
function isStaleTimestamp(value: string | null, cutoff: Date) {
  if (!value) return true;
  const parsed = Date.parse(value);
  return !Number.isFinite(parsed) || parsed <= cutoff.getTime();
}

async function failStaleOnboardingWork(
  profile: LearnerProfile,
  goalPositioningAttemptId: string | null,
  initialCourseAttemptId: string | null,
): Promise<LearnerProfile> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - ONBOARDING_STALE_PENDING_MS);
  let repaired = profile;
  let courseAttemptId = initialCourseAttemptId;

  if (repaired.goalPositioningStatus === "pending" && isStaleTimestamp(repaired.goalPositioningUpdatedAt, cutoff)) {
    const rows = await getDb()
      .update(learnerProfiles)
      .set({
        goalPositioningStatus: "failed",
        goalPositioningMessage: GOAL_POSITIONING_INTERRUPTED_MESSAGE,
        goalPositioningCandidates: null,
        goalPositioningUpdatedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(learnerProfiles.ownerId, repaired.ownerId),
          eq(learnerProfiles.goalPositioningStatus, "pending"),
          goalPositioningAttemptId
            ? eq(learnerProfiles.goalPositioningAttemptId, goalPositioningAttemptId)
            : isNull(learnerProfiles.goalPositioningAttemptId),
          // Re-check staleness inside the UPDATE so a goal submitted after our
          // read (fresh timestamp) is never clobbered.
          or(isNull(learnerProfiles.goalPositioningUpdatedAt), lte(learnerProfiles.goalPositioningUpdatedAt, cutoff)),
        ),
      )
      .returning();
    if (rows[0]) {
      console.error("[onboarding] goal positioning stalled past timeout; marked failed for retry", {
        ownerId: repaired.ownerId,
      });
      repaired = rowToLearnerProfile(rows[0]);
      courseAttemptId = rows[0].onboardingCourseAttemptId ?? null;
    } else {
      const currentRows = await getLearnerProfileRows(repaired.ownerId);
      if (currentRows[0]) {
        repaired = rowToLearnerProfile(currentRows[0]);
        courseAttemptId = currentRows[0].onboardingCourseAttemptId ?? null;
      }
    }
  }

  const courseStatus = repaired.onboardingCourseStatus;
  if (
    (courseStatus === "pending" || courseStatus === "building") &&
    isStaleTimestamp(repaired.onboardingCourseUpdatedAt, cutoff)
  ) {
    const rows = await getDb()
      .update(learnerProfiles)
      .set({
        onboardingCourseStatus: "failed",
        onboardingCourseMessage: COURSE_BUILD_INTERRUPTED_MESSAGE,
        onboardingCourseUpdatedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(learnerProfiles.ownerId, repaired.ownerId),
          courseAttemptId
            ? eq(learnerProfiles.onboardingCourseAttemptId, courseAttemptId)
            : isNull(learnerProfiles.onboardingCourseAttemptId),
          inArray(learnerProfiles.onboardingCourseStatus, ["pending", "building"]),
          or(isNull(learnerProfiles.onboardingCourseUpdatedAt), lte(learnerProfiles.onboardingCourseUpdatedAt, cutoff)),
        ),
      )
      .returning();
    if (rows[0]) {
      console.error("[onboarding] course preparation stalled past timeout; marked failed for retry", {
        ownerId: repaired.ownerId,
        attemptId: courseAttemptId,
      });
      repaired = rowToLearnerProfile(rows[0]);
    } else {
      repaired = (await getLearnerProfile(repaired.ownerId)) ?? repaired;
    }
  }

  return repaired;
}

type ProfilePatch = Partial<typeof learnerProfiles.$inferInsert>;

async function upsertLearnerProfile(ownerId: string, patch: ProfilePatch): Promise<LearnerProfile> {
  const now = new Date();
  const values = { ownerId, ...patch, createdAt: now, updatedAt: now };
  const set = { ...patch, updatedAt: now };
  const rows = await getDb()
    .insert(learnerProfiles)
    .values(values)
    .onConflictDoUpdate({
      target: learnerProfiles.ownerId,
      set,
    })
    .returning();
  return rowToLearnerProfile(rows[0]);
}

// A background resolver may finish after the learner has submitted another
// goal. The unique attempt ID is the request identity; goal text is retained as
// a defense-in-depth check, not as the identity because same-text retries exist.
async function updatePendingLearningGoal(
  ownerId: string,
  learningGoal: string,
  attemptId: string,
  patch: ProfilePatch,
): Promise<LearnerProfile | null> {
  const now = new Date();
  const rows = await getDb()
    .update(learnerProfiles)
    .set({ ...patch, updatedAt: now })
    .where(
      and(
        eq(learnerProfiles.ownerId, ownerId),
        eq(learnerProfiles.goalPositioningAttemptId, attemptId),
        eq(learnerProfiles.learningGoal, learningGoal),
        eq(learnerProfiles.goalPositioningStatus, "pending"),
      ),
    )
    .returning();
  return rows[0] ? rowToLearnerProfile(rows[0]) : null;
}

export async function isLearningGoalPositioningAttemptPending(ownerId: string, attemptId: string) {
  const rows = await getDb()
    .select({ ownerId: learnerProfiles.ownerId })
    .from(learnerProfiles)
    .where(
      and(
        eq(learnerProfiles.ownerId, ownerId),
        eq(learnerProfiles.goalPositioningAttemptId, attemptId),
        eq(learnerProfiles.goalPositioningStatus, "pending"),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

function isGoalPositioningStatus(value: unknown): value is GoalPositioningStatus {
  return typeof value === "string" && (GOAL_POSITIONING_STATUSES as readonly string[]).includes(value);
}

function isOnboardingCourseStatus(value: unknown): value is OnboardingCourseStatus {
  return typeof value === "string" && (ONBOARDING_COURSE_STATUSES as readonly string[]).includes(value);
}

function normalizeGoalPositioningCandidates(value: unknown): GoalPositioningCandidate[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const graphId = typeof record.graphId === "string" ? record.graphId : "";
    const subject = typeof record.subject === "string" ? record.subject : "";
    const startTopicId = typeof record.startTopicId === "string" ? record.startTopicId : "";
    return graphId && subject && startTopicId ? [{ graphId, subject, startTopicId }] : [];
  });
}

export async function savePendingLearningGoal(ownerId: string, learningGoal: string) {
  const attemptId = randomUUID();
  const profile = await upsertLearnerProfile(ownerId, {
    learningGoal,
    goalGraphId: null,
    goalStartTopicId: null,
    goalTargetConceptId: null,
    goalSkippedAt: null,
    goalPositioningStatus: "pending",
    goalPositioningMessage: null,
    goalPositioningCandidates: null,
    goalPositioningAttemptId: attemptId,
    goalPositioningUpdatedAt: new Date(),
    onboardingCourseStatus: null,
    onboardingCourseAttemptId: null,
    onboardingCourseMessage: null,
    onboardingCourseUpdatedAt: null,
    onboardingSkippedAt: null,
  });
  return { profile, attemptId };
}

export async function saveLearningGoal(input: {
  ownerId: string;
  learningGoal: string;
  graphId: string;
  startTopicId: string;
  targetConceptId: string | null;
}) {
  return upsertLearnerProfile(input.ownerId, {
    learningGoal: input.learningGoal,
    goalGraphId: input.graphId,
    goalStartTopicId: input.startTopicId,
    goalTargetConceptId: input.targetConceptId,
    goalSkippedAt: null,
    goalPositioningStatus: "positioned",
    goalPositioningMessage: null,
    goalPositioningCandidates: null,
    goalPositioningAttemptId: null,
    goalPositioningUpdatedAt: new Date(),
    onboardingCourseStatus: "pending",
    onboardingCourseAttemptId: null,
    onboardingCourseMessage: null,
    onboardingCourseUpdatedAt: new Date(),
    onboardingSkippedAt: null,
  });
}

export async function savePositionedLearningGoalIfPending(input: {
  ownerId: string;
  learningGoal: string;
  attemptId: string;
  graphId: string;
  startTopicId: string;
  targetConceptId: string | null;
}) {
  return updatePendingLearningGoal(input.ownerId, input.learningGoal, input.attemptId, {
    goalGraphId: input.graphId,
    goalStartTopicId: input.startTopicId,
    goalTargetConceptId: input.targetConceptId,
    goalSkippedAt: null,
    goalPositioningStatus: "positioned",
    goalPositioningMessage: null,
    goalPositioningCandidates: null,
    goalPositioningUpdatedAt: new Date(),
    onboardingCourseStatus: "pending",
    onboardingCourseAttemptId: null,
    onboardingCourseMessage: null,
    onboardingCourseUpdatedAt: new Date(),
    onboardingSkippedAt: null,
  });
}

export async function saveLearningGoalClarification(input: {
  ownerId: string;
  learningGoal: string;
  attemptId: string;
  message: string;
  candidates: GoalPositioningCandidate[];
}) {
  return updatePendingLearningGoal(input.ownerId, input.learningGoal, input.attemptId, {
    goalGraphId: null,
    goalStartTopicId: null,
    goalTargetConceptId: null,
    goalSkippedAt: null,
    goalPositioningStatus: "clarify",
    goalPositioningMessage: input.message,
    goalPositioningCandidates: input.candidates,
    goalPositioningUpdatedAt: new Date(),
    onboardingCourseStatus: null,
    onboardingCourseAttemptId: null,
    onboardingCourseMessage: null,
    onboardingCourseUpdatedAt: null,
    onboardingSkippedAt: null,
  });
}

export async function saveLearningGoalPositioningFailure(input: {
  ownerId: string;
  learningGoal: string;
  attemptId: string;
  message: string;
}) {
  return updatePendingLearningGoal(input.ownerId, input.learningGoal, input.attemptId, {
    goalGraphId: null,
    goalStartTopicId: null,
    goalTargetConceptId: null,
    goalSkippedAt: null,
    goalPositioningStatus: "failed",
    goalPositioningMessage: input.message,
    goalPositioningCandidates: null,
    goalPositioningUpdatedAt: new Date(),
    onboardingCourseStatus: null,
    onboardingCourseAttemptId: null,
    onboardingCourseMessage: null,
    onboardingCourseUpdatedAt: null,
    onboardingSkippedAt: null,
  });
}

export async function skipLearningGoal(ownerId: string) {
  const now = new Date();
  return upsertLearnerProfile(ownerId, {
    learningGoal: null,
    goalGraphId: null,
    goalStartTopicId: null,
    goalTargetConceptId: null,
    goalSkippedAt: now,
    goalPositioningStatus: null,
    goalPositioningMessage: null,
    goalPositioningCandidates: null,
    goalPositioningAttemptId: null,
    goalPositioningUpdatedAt: null,
    onboardingCourseStatus: null,
    onboardingCourseAttemptId: null,
    onboardingCourseMessage: null,
    onboardingCourseUpdatedAt: null,
    onboardingSkippedAt: null,
  });
}

export async function beginOnboardingCourseBuild(ownerId: string) {
  const attemptId = randomUUID();
  const profile = await upsertLearnerProfile(ownerId, {
    onboardingCourseStatus: "building",
    onboardingCourseAttemptId: attemptId,
    onboardingCourseMessage: null,
    onboardingCourseUpdatedAt: new Date(),
  });
  return { attemptId, profile };
}

async function finishOnboardingCourseBuild(input: {
  ownerId: string;
  attemptId: string;
  status: "ready" | "failed";
  message?: string | null;
}) {
  const now = new Date();
  const rows = await getDb()
    .update(learnerProfiles)
    .set({
      onboardingCourseStatus: input.status,
      onboardingCourseMessage: input.message ?? null,
      onboardingCourseUpdatedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(learnerProfiles.ownerId, input.ownerId),
        eq(learnerProfiles.onboardingCourseAttemptId, input.attemptId),
        eq(learnerProfiles.onboardingCourseStatus, "building"),
      ),
    )
    .returning();
  return rows[0] ? rowToLearnerProfile(rows[0]) : null;
}

export async function completeOnboardingCourseBuild(input: { ownerId: string; attemptId: string }) {
  return finishOnboardingCourseBuild({ ...input, status: "ready" });
}

export async function failOnboardingCourseBuild(input: {
  ownerId: string;
  attemptId: string;
  message: string;
}) {
  return finishOnboardingCourseBuild({ ...input, status: "failed" });
}

export async function saveKnowledgeBackground(ownerId: string, knowledgeBackground: KnowledgeBackground) {
  return upsertLearnerProfile(ownerId, {
    knowledgeBackground,
    knowledgeBackgroundSkippedAt: null,
    onboardingSkippedAt: null,
  });
}

export async function skipKnowledgeBackground(ownerId: string) {
  return upsertLearnerProfile(ownerId, {
    knowledgeBackground: null,
    knowledgeBackgroundSkippedAt: new Date(),
    onboardingSkippedAt: null,
  });
}

export async function saveTutorStyle(ownerId: string, tutorStyle: TutorStyle) {
  return upsertLearnerProfile(ownerId, {
    tutorStyle,
    tutorStyleSkippedAt: null,
    onboardingCompletedAt: new Date(),
    onboardingSkippedAt: null,
  });
}

export async function skipTutorStyle(ownerId: string) {
  return upsertLearnerProfile(ownerId, {
    tutorStyle: null,
    tutorStyleSkippedAt: new Date(),
    onboardingCompletedAt: new Date(),
    onboardingSkippedAt: null,
  });
}
