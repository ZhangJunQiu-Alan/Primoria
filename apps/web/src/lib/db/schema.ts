import { sql } from "drizzle-orm";
import { boolean, doublePrecision, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const identities = pgTable(
  "identities",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    email: text("email"),
    phone: text("phone"),
    passwordHash: text("password_hash"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    providerUserUnique: uniqueIndex("identities_provider_user_uidx").on(table.provider, table.providerUserId),
    userIdx: index("identities_user_idx").on(table.userId),
    emailIdx: index("identities_email_idx").on(table.email),
    phoneIdx: index("identities_phone_idx").on(table.phone),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("sessions_token_hash_uidx").on(table.tokenHash),
    userIdx: index("sessions_user_idx").on(table.userId),
    expiresIdx: index("sessions_expires_idx").on(table.expiresAt),
  }),
);

export const learnerProfiles = pgTable(
  "learner_profiles",
  {
    ownerId: text("owner_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
    learningGoal: text("learning_goal"),
    goalGraphId: text("goal_graph_id"),
    goalStartTopicId: text("goal_start_topic_id"),
    goalTargetConceptId: text("goal_target_concept_id"),
    goalSkippedAt: timestamp("goal_skipped_at", { withTimezone: true }),
    goalPositioningStatus: text("goal_positioning_status"),
    goalPositioningMessage: text("goal_positioning_message"),
    goalPositioningCandidates: jsonb("goal_positioning_candidates"),
    goalPositioningAttemptId: text("goal_positioning_attempt_id"),
    goalPositioningUpdatedAt: timestamp("goal_positioning_updated_at", { withTimezone: true }),
    onboardingCourseStatus: text("onboarding_course_status"),
    onboardingCourseAttemptId: text("onboarding_course_attempt_id"),
    onboardingCourseMessage: text("onboarding_course_message"),
    onboardingCourseUpdatedAt: timestamp("onboarding_course_updated_at", { withTimezone: true }),
    knowledgeBackground: text("knowledge_background"),
    knowledgeBackgroundSkippedAt: timestamp("knowledge_background_skipped_at", { withTimezone: true }),
    tutorStyle: text("tutor_style"),
    tutorStyleSkippedAt: timestamp("tutor_style_skipped_at", { withTimezone: true }),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    onboardingSkippedAt: timestamp("onboarding_skipped_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    completedIdx: index("learner_profiles_completed_idx").on(table.onboardingCompletedAt),
  }),
);

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: text("id").primaryKey(),
    targetType: text("target_type").notNull(),
    target: text("target").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    targetIdx: index("otp_codes_target_idx").on(table.targetType, table.target),
    expiresIdx: index("otp_codes_expires_idx").on(table.expiresAt),
  }),
);

export const authRateLimits = pgTable(
  "auth_rate_limits",
  {
    id: text("id").primaryKey(),
    scope: text("scope").notNull(),
    identifierHash: text("identifier_hash").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    scopeHashIdx: index("auth_rate_limits_scope_hash_idx").on(table.scope, table.identifierHash),
    expiresIdx: index("auth_rate_limits_expires_idx").on(table.expiresAt),
  }),
);

export const courses = pgTable(
  "courses",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    topic: text("topic").notNull(),
    summary: text("summary").notNull(),
    estimatedMinutes: integer("estimated_minutes").notNull(),
    anchorConceptId: text("anchor_concept_id"),
    graphId: text("graph_id"),
    // Learner's content language (e.g. "zh", "en"), detected from their original
    // topic prompt. Drives the language of generated lesson content; KG topic/
    // concept names stay English for indexing.
    language: text("language"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    // Set when this course was created by importing a shared snapshot;
    // references course_share_links.id (no FK so revoking/deleting the share
    // never touches imported copies).
    importedFromShareId: text("imported_from_share_id"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    ownerUpdatedIdx: index("courses_owner_updated_idx").on(table.ownerId, table.updatedAt),
    ownerArchivedUpdatedIdx: index("courses_owner_archived_updated_idx").on(table.ownerId, table.archivedAt, table.updatedAt),
    // At most one active Course instance per user per subject KG. Archived
    // courses are historical records and should not block a clean restart.
    // graph_id NULL (free-form courses with no KG) is exempt because Postgres
    // treats NULLs as distinct.
    ownerGraphUnique: uniqueIndex("courses_owner_graph_uidx")
      .on(table.ownerId, table.graphId)
      .where(sql`${table.archivedAt} IS NULL`),
    // Importing the same share twice is a no-op that returns the first copy.
    ownerImportedShareUnique: uniqueIndex("courses_owner_imported_share_uidx")
      .on(table.ownerId, table.importedFromShareId)
      .where(sql`${table.importedFromShareId} IS NOT NULL`),
  }),
);

/** Public share links for courses. `snapshot` is an immutable, sanitized copy
 * of the course (progress stripped, only global media referenced) taken when
 * sharing was enabled or last refreshed; the public /share/[token] page reads
 * only this table, never the live course. Revoking sets revoked_at; re-enabling
 * mints a new token so old links stay dead. */
export const courseShareLinks = pgTable(
  "course_share_links",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull(),
    courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    snapshot: jsonb("snapshot").notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    tokenUnique: uniqueIndex("course_share_links_token_uidx").on(table.token),
    courseUnique: uniqueIndex("course_share_links_course_uidx").on(table.courseId),
  }),
);

export const lessons = pgTable(
  "lessons",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    topicId: text("topic_id"),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    role: text("role").notNull().default("new"),
    progress: text("progress").notNull().default("not_started"),
    // Materialization axis, orthogonal to role/progress: a planned outline node
    // carries no blocks yet (LazyGeneration); "generating" guards against double
    // materialization; "generated" means blocks are present.
    status: text("status").notNull().default("planned"),
    sortKey: doublePrecision("sort_key").notNull(),
    triggeredFrom: text("triggered_from"),
    blocks: jsonb("blocks"),
    estimatedMinutes: integer("estimated_minutes"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    courseSortIdx: index("lessons_course_sort_idx").on(table.courseId, table.sortKey),
    ownerIdx: index("lessons_owner_idx").on(table.ownerId),
  }),
);

// Recoverable per-lesson background generation jobs (engineering doc §4.1). One
// row per lesson (unique lesson_id), reused for automatic and manual retry. The
// lease_token is a fencing token: every worker mutation must match it so a stale
// worker that lost its lease can never publish.
export const lessonGenerationJobs = pgTable(
  "lesson_generation_jobs",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    // queued | running | completed | failed
    status: text("status").notNull().default("queued"),
    // queued | planning | writing | imaging | validating | saving | completed | failed
    stage: text("stage").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(2),
    progressCompleted: integer("progress_completed").notNull().default(0),
    progressTotal: integer("progress_total").notNull().default(0),
    leaseOwner: text("lease_owner"),
    leaseToken: text("lease_token"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
    lastError: text("last_error"),
    errorCategory: text("error_category"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    lessonIdUnique: uniqueIndex("lesson_generation_jobs_lesson_id_uidx").on(table.lessonId),
    leaseTokenUnique: uniqueIndex("lesson_generation_jobs_lease_token_uidx").on(table.leaseToken),
    ownerStatusUpdatedIdx: index("lesson_generation_jobs_owner_status_updated_idx").on(table.ownerId, table.status, table.updatedAt),
    statusLeaseIdx: index("lesson_generation_jobs_status_lease_idx").on(table.status, table.leaseExpiresAt),
    courseStatusIdx: index("lesson_generation_jobs_course_status_idx").on(table.courseId, table.status),
  }),
);

// Successful Planner and Block-Batch results, keyed by a stable deterministic
// checkpoint key (engineering doc §4.2). A restarted worker reuses compatible
// checkpoints (matching ir/prompt/compiler versions) and regenerates only the
// missing batches.
export const lessonGenerationCheckpoints = pgTable(
  "lesson_generation_checkpoints",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id").notNull().references(() => lessonGenerationJobs.id, { onDelete: "cascade" }),
    checkpointKey: text("checkpoint_key").notNull(),
    // plan | batch
    kind: text("kind").notNull(),
    payload: jsonb("payload").notNull(),
    irVersion: integer("ir_version").notNull(),
    promptVersion: text("prompt_version").notNull(),
    compilerVersion: text("compiler_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    jobCheckpointUnique: uniqueIndex("lesson_generation_checkpoints_job_key_uidx").on(table.jobId, table.checkpointKey),
    jobKindIdx: index("lesson_generation_checkpoints_job_kind_idx").on(table.jobId, table.kind),
  }),
);

export const courseEditEvents = pgTable(
  "course_edit_events",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id"),
    blockId: text("block_id").notNull(),
    instruction: text("instruction").notNull(),
    beforeBlock: jsonb("before_block").notNull(),
    afterBlock: jsonb("after_block").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerCreatedIdx: index("course_edit_events_owner_created_idx").on(table.ownerId, table.createdAt),
    courseCreatedIdx: index("course_edit_events_course_created_idx").on(table.courseId, table.createdAt),
  }),
);

export const copilotChatThreads = pgTable(
  "copilot_chat_threads",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    preview: text("preview"),
    messageCount: integer("message_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerUpdatedIdx: index("copilot_chat_threads_owner_updated_idx").on(table.ownerId, table.updatedAt),
  }),
);

export const copilotChatMessages = pgTable(
  "copilot_chat_messages",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id").notNull().references(() => copilotChatThreads.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    threadCreatedIdx: index("copilot_chat_messages_thread_created_idx").on(table.threadId, table.createdAt),
    ownerCreatedIdx: index("copilot_chat_messages_owner_created_idx").on(table.ownerId, table.createdAt),
  }),
);

export const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  preferences: jsonb("preferences").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id"),
    blockId: text("block_id").notNull(),
    submissionId: text("submission_id").notNull(),
    answers: jsonb("answers").notNull(),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerCourseIdx: index("quiz_attempts_owner_course_idx").on(table.ownerId, table.courseId),
    blockIdx: index("quiz_attempts_block_idx").on(table.blockId),
    ownerBlockSubmissionUnique: uniqueIndex("quiz_attempts_owner_block_submission_uidx").on(
      table.ownerId,
      table.blockId,
      table.submissionId,
    ),
  }),
);

export const learningEvents = pgTable(
  "learning_events",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    courseId: text("course_id"),
    lessonId: text("lesson_id"),
    blockId: text("block_id"),
    graphId: text("graph_id"),
    conceptId: text("concept_id"),
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerCreatedIdx: index("learning_events_owner_created_idx").on(table.ownerId, table.createdAt),
    ownerTypeIdx: index("learning_events_owner_type_idx").on(table.ownerId, table.type),
    ownerConceptIdx: index("learning_events_owner_concept_idx").on(table.ownerId, table.conceptId),
  }),
);

// Recoverable post-lesson learning-progress orchestration jobs. One row per
// completed lesson (unique lesson_id), reused on re-run. Mirrors the lease/
// fencing model of lesson_generation_jobs: every worker mutation is fenced by
// the active (status=running, lease_owner, lease_token, unexpired-lease) tuple.
// The job runs two stages — mastery update, then diagnosis — and records its
// outcome in `decision` for the user to confirm before any lesson is generated.
export const learningProgressJobs = pgTable(
  "learning_progress_jobs",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    graphId: text("graph_id"),
    // queued | running | completed | failed
    status: text("status").notNull().default("queued"),
    // queued | mastery | deciding | completed | failed
    stage: text("stage").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(2),
    // The orchestration outcome (kind/reason/target) once deciding completes.
    decision: jsonb("decision"),
    // none | pending | accepted | dismissed
    decisionStatus: text("decision_status").notNull().default("none"),
    leaseOwner: text("lease_owner"),
    leaseToken: text("lease_token"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
    lastError: text("last_error"),
    errorCategory: text("error_category"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    lessonIdUnique: uniqueIndex("learning_progress_jobs_lesson_id_uidx").on(table.lessonId),
    leaseTokenUnique: uniqueIndex("learning_progress_jobs_lease_token_uidx").on(table.leaseToken),
    ownerStatusUpdatedIdx: index("learning_progress_jobs_owner_status_updated_idx").on(table.ownerId, table.status, table.updatedAt),
    statusLeaseIdx: index("learning_progress_jobs_status_lease_idx").on(table.status, table.leaseExpiresAt),
    courseDecisionIdx: index("learning_progress_jobs_course_decision_idx").on(table.courseId, table.decisionStatus),
  }),
);

// Per-user concept mastery (docs/product/feature_specification.md §156). Second memory layer:
// concept-level state only, no chat summaries. Drives skip / quick-review /
// remediation decisions. Written owner-scoped from the learning-progress worker
// (no request session). The migration creates it idempotently because this table
// existed before the current Drizzle-first migration sequence.
export const userConceptMastery = pgTable(
  "user_concept_mastery",
  {
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    graphId: text("graph_id").notNull(),
    conceptId: text("concept_id").notNull(),
    // untested | weak | learning | mastered
    status: text("status").notNull().default("untested"),
    score: doublePrecision("score"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: uniqueIndex("user_concept_mastery_owner_graph_concept_uidx").on(table.ownerId, table.graphId, table.conceptId),
    ownerGraphIdx: index("user_concept_mastery_owner_graph_idx").on(table.ownerId, table.graphId),
  }),
);

// Cached AI-generated media (lesson `image` blocks). The block JSONB only
// references an asset by id/URL; the bytes live here. `cache_key` is the reuse
// core — a hash over the image brief (model/concepts/goal/kind/style/etc) so an
// identical brief returns the same asset without a second generation call.
// `owner_id` NULL means a globally reusable/readable asset. Lesson images use
// global assets because the cache key is global; owner-scoped assets would 404
// for later users who reuse the same cached image. Bytes-in-DB is a deliberate
// v1 shortcut; a later migration can move them to object storage behind the same
// API by adding storage_url/storage_key.
export const mediaAssets = pgTable(
  "media_assets",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").references(() => users.id, { onDelete: "cascade" }),
    cacheKey: text("cache_key").notNull(),
    provider: text("provider").notNull().default("google"),
    model: text("model").notNull(),
    mimeType: text("mime_type").notNull(),
    dataBase64: text("data_base64").notNull(),
    prompt: text("prompt").notNull(),
    brief: jsonb("brief").notNull(),
    alt: text("alt").notNull(),
    caption: text("caption").notNull(),
    width: integer("width"),
    height: integer("height"),
    byteLength: integer("byte_length"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    cacheKeyUnique: uniqueIndex("media_assets_cache_key_uidx").on(table.cacheKey),
    ownerCreatedIdx: index("media_assets_owner_created_idx").on(table.ownerId, table.createdAt),
  }),
);

// Core memory layer (docs/product/feature_specification.md §101): distilled "facts about the
// learner" produced by the Extractor Agent from learning_events. One row per
// fact. `category` routes consumption (preference/prior_knowledge/learning_gap
// feed the lesson Planner + tutor; goal is long-term profile only). `status`
// active facts apply immediately; a user-dismissed fact becomes a permanent
// tombstone the extractor must never re-create (semantic skip). `evidence` keeps
// the supporting events ([{ lessonId, eventIds[], at }]) for grounding/decay.
export const learnerFacts = pgTable(
  "learner_facts",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    // preference | prior_knowledge | learning_gap | goal
    category: text("category").notNull(),
    // active | dismissed
    status: text("status").notNull().default("active"),
    confidence: doublePrecision("confidence"),
    evidence: jsonb("evidence").notNull().default([]),
    occurrences: integer("occurrences").notNull().default(1),
    sourceLessonId: text("source_lesson_id"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerStatusIdx: index("learner_facts_owner_status_idx").on(table.ownerId, table.status),
    ownerCategoryIdx: index("learner_facts_owner_category_idx").on(table.ownerId, table.category),
  }),
);

// Recoverable post-lesson Extractor jobs. One row per completed lesson (unique
// lesson_id), reused on re-run. Mirrors the lease/fencing model of
// learning_progress_jobs, but simpler: a single LLM distillation step (no stage,
// no decision gate — extracted facts auto-apply). A crashed worker's lease
// expires and another worker re-runs the (idempotent on lesson_id) job.
export const extractorJobs = pgTable(
  "extractor_jobs",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    graphId: text("graph_id"),
    // queued | running | completed | failed
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(2),
    leaseOwner: text("lease_owner"),
    leaseToken: text("lease_token"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
    lastError: text("last_error"),
    errorCategory: text("error_category"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    lessonIdUnique: uniqueIndex("extractor_jobs_lesson_id_uidx").on(table.lessonId),
    leaseTokenUnique: uniqueIndex("extractor_jobs_lease_token_uidx").on(table.leaseToken),
    ownerStatusUpdatedIdx: index("extractor_jobs_owner_status_updated_idx").on(table.ownerId, table.status, table.updatedAt),
    statusLeaseIdx: index("extractor_jobs_status_lease_idx").on(table.status, table.leaseExpiresAt),
  }),
);

export const workerHeartbeats = pgTable("worker_heartbeats", {
  workerType: text("worker_type").primaryKey(),
  workerId: text("worker_id").notNull(),
  heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// LLM-generated topic graphs for out-of-library learning goals (沉淀机制).
// One row per normalized topic; `graph` holds the full TopicGraph JSON in the
// exact shape of the static library graphs, so generated subjects can later be
// reviewed and promoted into the formal library (status: candidate → promoted).
// usage_count records demand and drives what is worth promoting.
export const generatedTopicGraphs = pgTable(
  "generated_topic_graphs",
  {
    graphId: text("graph_id").primaryKey(),
    // normalized learner topic used for dedup/reuse across users
    topicKey: text("topic_key").notNull(),
    topic: text("topic").notNull(),
    subject: text("subject").notNull(),
    language: text("language"),
    graph: jsonb("graph").notNull(),
    // candidate | promoted | retired
    status: text("status").notNull().default("candidate"),
    usageCount: integer("usage_count").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    topicKeyUnique: uniqueIndex("generated_topic_graphs_topic_key_uidx").on(table.topicKey),
    statusUsageIdx: index("generated_topic_graphs_status_usage_idx").on(table.status, table.usageCount),
  }),
);

export type UserRow = typeof users.$inferSelect;
export type MediaAssetRow = typeof mediaAssets.$inferSelect;
export type LearnerProfileRow = typeof learnerProfiles.$inferSelect;
export type LearnerFactRow = typeof learnerFacts.$inferSelect;
export type ExtractorJobRow = typeof extractorJobs.$inferSelect;
export type IdentityRow = typeof identities.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
