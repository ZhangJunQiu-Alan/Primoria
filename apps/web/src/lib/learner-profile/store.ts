import { eq } from "drizzle-orm";

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
  type OnboardingStep,
  type TutorStyle,
} from "./types";

const GOAL_POSITIONING_STATUSES: readonly GoalPositioningStatus[] = ["pending", "positioned", "clarify", "failed"];

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
  const rows = await getDb().select().from(learnerProfiles).where(eq(learnerProfiles.ownerId, ownerId)).limit(1);
  return rows[0] ? rowToLearnerProfile(rows[0]) : null;
}

export async function getLearnerOnboardingState(ownerId: string): Promise<LearnerOnboardingState> {
  const profile = await getLearnerProfile(ownerId);
  return {
    profile,
    nextStep: nextOnboardingStep(profile),
    complete: isLearnerOnboardingComplete(profile),
  };
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

function isGoalPositioningStatus(value: unknown): value is GoalPositioningStatus {
  return typeof value === "string" && (GOAL_POSITIONING_STATUSES as readonly string[]).includes(value);
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
  return upsertLearnerProfile(ownerId, {
    learningGoal,
    goalGraphId: null,
    goalStartTopicId: null,
    goalTargetConceptId: null,
    goalSkippedAt: null,
    goalPositioningStatus: "pending",
    goalPositioningMessage: null,
    goalPositioningCandidates: null,
    goalPositioningUpdatedAt: new Date(),
    onboardingSkippedAt: null,
  });
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
    goalPositioningUpdatedAt: new Date(),
    onboardingSkippedAt: null,
  });
}

export async function saveLearningGoalClarification(input: {
  ownerId: string;
  learningGoal: string;
  message: string;
  candidates: GoalPositioningCandidate[];
}) {
  return upsertLearnerProfile(input.ownerId, {
    learningGoal: input.learningGoal,
    goalGraphId: null,
    goalStartTopicId: null,
    goalTargetConceptId: null,
    goalSkippedAt: null,
    goalPositioningStatus: "clarify",
    goalPositioningMessage: input.message,
    goalPositioningCandidates: input.candidates,
    goalPositioningUpdatedAt: new Date(),
    onboardingSkippedAt: null,
  });
}

export async function saveLearningGoalPositioningFailure(input: {
  ownerId: string;
  learningGoal: string;
  message: string;
}) {
  return upsertLearnerProfile(input.ownerId, {
    learningGoal: input.learningGoal,
    goalGraphId: null,
    goalStartTopicId: null,
    goalTargetConceptId: null,
    goalSkippedAt: null,
    goalPositioningStatus: "failed",
    goalPositioningMessage: input.message,
    goalPositioningCandidates: null,
    goalPositioningUpdatedAt: new Date(),
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
    goalPositioningUpdatedAt: null,
    onboardingSkippedAt: null,
  });
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
