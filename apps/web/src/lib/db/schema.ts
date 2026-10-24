import { sql } from "drizzle-orm";
import { boolean, check, doublePrecision, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

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
    goalTargetConceptIds: jsonb("goal_target_concept_ids"),
    goalScope: text("goal_scope"),
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
    factsIntakeStatus: text("facts_intake_status"),
    factsIntakeJobId: text("facts_intake_job_id"),
    factsIntakeMessage: text("facts_intake_message"),
    factsIntakeUpdatedAt: timestamp("facts_intake_updated_at", { withTimezone: true }),
    educationStage: text("education_stage"),
    curriculumSystem: text("curriculum_system"),
    educationContextSource: text("education_context_source"),
    educationContextConfirmedAt: timestamp("education_context_confirmed_at", { withTimezone: true }),
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
    factsIntakeStatusCheck: check("learner_profiles_facts_intake_status_check", sql`${table.factsIntakeStatus} is null or ${table.factsIntakeStatus} in ('pending', 'completed', 'skipped', 'failed')`),
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

export const interactiveComponentInstances = pgTable(
  "interactive_component_instances",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    instanceId: text("instance_id").notNull(),
    requestHash: text("request_hash").notNull(),
    componentId: text("component_id").notNull(),
    configVersion: integer("config_version").notNull(),
    initialConfig: jsonb("initial_config").$type<Record<string, unknown>>().notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull(),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    // Retention order: refreshed by saves and (at most hourly) by reads.
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerInstanceUnique: uniqueIndex("interactive_component_instances_owner_instance_uidx").on(table.ownerId, table.instanceId),
    ownerLastUsedIdx: index("interactive_component_instances_owner_last_used_idx").on(table.ownerId, table.lastUsedAt),
    versionCheck: check("interactive_component_instances_version_check", sql`${table.configVersion} >= 1 and ${table.revision} >= 1`),
  }),
);

export const interactiveComponentQuotas = pgTable(
  "interactive_component_quotas",
  {
    ownerId: text("owner_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
    requestCount: integer("request_count").notNull().default(0),
    inFlight: integer("in_flight").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    requestCountCheck: check("interactive_component_quotas_request_count_check", sql`${table.requestCount} >= 0`),
    inFlightCheck: check("interactive_component_quotas_in_flight_check", sql`${table.inFlight} >= 0`),
  }),
);

export const interactiveComponentRequests = pgTable(
  "interactive_component_requests",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    status: text("status").notNull().default("running"),
    responseStatus: integer("response_status"),
    response: jsonb("response"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerKeyUnique: uniqueIndex("interactive_component_requests_owner_key_uidx").on(table.ownerId, table.idempotencyKey),
    ownerStatusIdx: index("interactive_component_requests_owner_status_idx").on(table.ownerId, table.status, table.startedAt),
    expiresIdx: index("interactive_component_requests_expires_idx").on(table.expiresAt),
    statusCheck: check("interactive_component_requests_status_check", sql`${table.status} in ('running', 'completed', 'failed')`),
    responseStatusCheck: check(
      "interactive_component_requests_response_status_check",
      sql`${table.responseStatus} is null or (${table.responseStatus} >= 200 and ${table.responseStatus} <= 599)`,
    ),
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
    // Stable identity of the requested scope. Multiple active courses may use
    // the same source KG when their goal-specific concept scopes differ.
    scopeKey: text("scope_key"),
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
    // At most one active Course per learner and exact scope. A source KG may
    // back several active courses (for example canonical linear algebra and a
    // goal-scoped linear-algebra-for-deep-learning course).
    ownerScopeUnique: uniqueIndex("courses_owner_scope_uidx")
      .on(table.ownerId, table.scopeKey)
      .where(sql`${table.archivedAt} IS NULL and ${table.scopeKey} IS NOT NULL`),
    // Importing the same share twice is a no-op that returns the first copy.
    ownerImportedShareUnique: uniqueIndex("courses_owner_imported_share_uidx")
      .on(table.ownerId, table.importedFromShareId)
      .where(sql`${table.importedFromShareId} IS NOT NULL`),
    estimatedMinutesCheck: check("courses_estimated_minutes_check", sql`${table.estimatedMinutes} >= 0`),
    versionCheck: check("courses_version_check", sql`${table.version} >= 1`),
  }),
);

/** Stable series identity for public course shares. Immutable snapshots and
 * capability tokens live in course_share_versions. */
export const courseShareLinks = pgTable(
  "course_share_links",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    courseUnique: uniqueIndex("course_share_links_course_uidx").on(table.courseId),
    ownerIdx: index("course_share_links_owner_idx").on(table.ownerId),
  }),
);

/** Immutable, sanitized versions within a course-share series. At most one
 * version per series is active; publishing a refresh revokes the prior token
 * and inserts a new row instead of overwriting its snapshot. */
export const courseShareVersions = pgTable(
  "course_share_versions",
  {
    id: text("id").primaryKey(),
    shareId: text("share_id").notNull().references(() => courseShareLinks.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    token: text("token").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    tokenUnique: uniqueIndex("course_share_versions_token_uidx").on(table.token),
    shareVersionUnique: uniqueIndex("course_share_versions_share_version_uidx").on(table.shareId, table.version),
    oneActiveVersion: uniqueIndex("course_share_versions_one_active_uidx")
      .on(table.shareId)
      .where(sql`${table.revokedAt} IS NULL`),
    shareCreatedIdx: index("course_share_versions_share_created_idx").on(table.shareId, table.createdAt),
    versionCheck: check("course_share_versions_version_check", sql`${table.version} >= 1`),
  }),
);

export const lessons = pgTable(
  "lessons",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    topicId: text("topic_id"),
    // Concept subset this lesson teaches (concept-frontier outline). Empty on
    // historical/freeform lessons, which fall back to resolving the whole topic.
    conceptIds: jsonb("concept_ids").$type<string[]>().notNull().default([]),
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
    roleCheck: check("lessons_role_check", sql`${table.role} in ('new', 'review', 'remediation')`),
    progressCheck: check("lessons_progress_check", sql`${table.progress} in ('not_started', 'in_progress', 'completed')`),
    statusCheck: check("lessons_status_check", sql`${table.status} in ('planned', 'generating', 'generated')`),
    estimatedMinutesCheck: check("lessons_estimated_minutes_check", sql`${table.estimatedMinutes} is null or ${table.estimatedMinutes} >= 0`),
    versionCheck: check("lessons_version_check", sql`${table.version} >= 1`),
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
    statusCheck: check("lesson_generation_jobs_status_check", sql`${table.status} in ('queued', 'running', 'completed', 'failed')`),
    stageCheck: check(
      "lesson_generation_jobs_stage_check",
      sql`${table.stage} in ('queued', 'planning', 'writing', 'imaging', 'validating', 'saving', 'completed', 'failed')`,
    ),
    attemptsCheck: check("lesson_generation_jobs_attempts_check", sql`${table.attempts} >= 0 and ${table.maxAttempts} > 0`),
    progressCheck: check(
      "lesson_generation_jobs_progress_check",
      sql`${table.progressCompleted} >= 0 and ${table.progressTotal} >= 0 and ${table.progressCompleted} <= ${table.progressTotal}`,
    ),
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
    kindCheck: check("lesson_generation_checkpoints_kind_check", sql`${table.kind} in ('plan', 'batch')`),
    irVersionCheck: check("lesson_generation_checkpoints_ir_version_check", sql`${table.irVersion} >= 1`),
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

export const playerProgress = pgTable(
  "player_progress",
  {
    ownerId: text("owner_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
    totalXp: integer("total_xp").notNull().default(0),
    currentStreak: integer("current_streak").notNull().default(0),
    longestStreak: integer("longest_streak").notNull().default(0),
    lastQuestDate: text("last_quest_date"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    totalXpCheck: check("player_progress_total_xp_check", sql`${table.totalXp} >= 0`),
    streakCheck: check(
      "player_progress_streak_check",
      sql`${table.currentStreak} >= 0 and ${table.longestStreak} >= ${table.currentStreak}`,
    ),
  }),
);

export const xpAwards = pgTable(
  "xp_awards",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    ruleCode: text("rule_code").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: text("source_id"),
    amount: integer("amount").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerRuleDedupeUnique: uniqueIndex("xp_awards_owner_rule_dedupe_uidx").on(table.ownerId, table.ruleCode, table.dedupeKey),
    ownerCreatedIdx: index("xp_awards_owner_created_idx").on(table.ownerId, table.createdAt),
    amountCheck: check("xp_awards_amount_check", sql`${table.amount} > 0`),
  }),
);

export const achievementUnlocks = pgTable(
  "achievement_unlocks",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    sourceId: text("source_id"),
    metadata: jsonb("metadata").notNull().default({}),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerCodeUnique: uniqueIndex("achievement_unlocks_owner_code_uidx").on(table.ownerId, table.code),
    ownerUnlockedIdx: index("achievement_unlocks_owner_unlocked_idx").on(table.ownerId, table.unlockedAt),
  }),
);

export const dailyQuestCompletions = pgTable(
  "daily_quest_completions",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    localDate: text("local_date").notNull(),
    questCode: text("quest_code").notNull(),
    sourceId: text("source_id"),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerDateQuestUnique: uniqueIndex("daily_quest_completions_owner_date_quest_uidx").on(
      table.ownerId,
      table.localDate,
      table.questCode,
    ),
    ownerDateIdx: index("daily_quest_completions_owner_date_idx").on(table.ownerId, table.localDate),
    localDateCheck: check("daily_quest_completions_local_date_check", sql`${table.localDate} ~ '^\\d{4}-\\d{2}-\\d{2}$'`),
  }),
);

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
    scoreCheck: check("quiz_attempts_score_check", sql`${table.total} > 0 and ${table.score} >= 0 and ${table.score} <= ${table.total}`),
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
    typeCreatedIdx: index("learning_events_type_created_idx").on(table.type, table.createdAt),
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
    statusCheck: check("learning_progress_jobs_status_check", sql`${table.status} in ('queued', 'running', 'completed', 'failed')`),
    stageCheck: check("learning_progress_jobs_stage_check", sql`${table.stage} in ('queued', 'mastery', 'deciding', 'completed', 'failed')`),
    attemptsCheck: check("learning_progress_jobs_attempts_check", sql`${table.attempts} >= 0 and ${table.maxAttempts} > 0`),
    decisionStatusCheck: check(
      "learning_progress_jobs_decision_status_check",
      sql`${table.decisionStatus} in ('none', 'pending', 'accepted', 'dismissed')`,
    ),
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
    statusCheck: check("user_concept_mastery_status_check", sql`${table.status} in ('untested', 'weak', 'learning', 'mastered')`),
    scoreCheck: check("user_concept_mastery_score_check", sql`${table.score} is null or (${table.score} >= 0 and ${table.score} <= 1)`),
  }),
);

// Mastery for owner-private mat_* graphs. user_concept_mastery carries a
// foreign key into the library KG tables (knowledge_graph_concepts), which
// material concepts — stored inside material_topic_graphs.graph — never enter.
// Same columns and rules; rows outlive a re-assembled folder graph and go
// with the folder (or the owner).
export const materialConceptMastery = pgTable(
  "material_concept_mastery",
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
    pk: uniqueIndex("material_concept_mastery_owner_graph_concept_uidx").on(table.ownerId, table.graphId, table.conceptId),
    statusCheck: check("material_concept_mastery_status_check", sql`${table.status} in ('untested', 'weak', 'learning', 'mastered')`),
    scoreCheck: check("material_concept_mastery_score_check", sql`${table.score} is null or (${table.score} >= 0 and ${table.score} <= 1)`),
    graphCheck: check("material_concept_mastery_graph_check", sql`starts_with(${table.graphId}, 'mat_')`),
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
    // Bytes live in Supabase Storage at storage_path; data_base64 is the legacy
    // in-row copy, kept for rows written before Storage (or without it).
    dataBase64: text("data_base64"),
    storagePath: text("storage_path"),
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
    bytesLocationCheck: check("media_assets_bytes_location_check", sql`${table.dataBase64} is not null or ${table.storagePath} is not null`),
  }),
);

// Core memory layer: distilled "facts about the learner" produced from explicit
// profile intake or learning events. One row per fact. `category` routes
// consumption; goal/profile_context remain profile-only and interest is bounded
// below higher-priority teaching signals. `status`
// active facts apply immediately; a user-dismissed fact becomes a permanent
// tombstone the extractor must never re-create (semantic skip). `evidence` keeps
// the supporting events or intake quote for grounding/decay.
export const learnerFacts = pgTable(
  "learner_facts",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    // preference | prior_knowledge | learning_gap | interest | goal | profile_context
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
    categoryCheck: check("learner_facts_category_check", sql`${table.category} in ('preference', 'prior_knowledge', 'learning_gap', 'interest', 'goal', 'profile_context')`),
    statusCheck: check("learner_facts_status_check", sql`${table.status} in ('active', 'dismissed')`),
    confidenceCheck: check("learner_facts_confidence_check", sql`${table.confidence} is null or (${table.confidence} >= 0 and ${table.confidence} <= 1)`),
    occurrencesCheck: check("learner_facts_occurrences_check", sql`${table.occurrences} >= 1`),
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
    statusCheck: check("extractor_jobs_status_check", sql`${table.status} in ('queued', 'running', 'completed', 'failed')`),
    attemptsCheck: check("extractor_jobs_attempts_check", sql`${table.attempts} >= 0 and ${table.maxAttempts} > 0`),
  }),
);

// Durable, owner-scoped onboarding/Settings source-text intake. This is
// separate from extractor_jobs because lesson/course foreign keys do not apply.
// Raw source_text is retained only while queued/running and is cleared at every
// terminal transition.
export const profileFactIntakeJobs = pgTable(
  "profile_fact_intake_jobs",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sourceKind: text("source_kind").notNull(),
    sourceText: text("source_text"),
    sourceHash: text("source_hash").notNull(),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(2),
    leaseOwner: text("lease_owner"),
    leaseToken: text("lease_token"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
    result: jsonb("result"),
    lastError: text("last_error"),
    errorCategory: text("error_category"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    activeOwnerUnique: uniqueIndex("profile_fact_intake_jobs_active_owner_uidx")
      .on(table.ownerId)
      .where(sql`${table.status} in ('queued', 'running')`),
    leaseTokenUnique: uniqueIndex("profile_fact_intake_jobs_lease_token_uidx").on(table.leaseToken),
    ownerStatusUpdatedIdx: index("profile_fact_intake_jobs_owner_status_updated_idx").on(table.ownerId, table.status, table.updatedAt),
    statusLeaseIdx: index("profile_fact_intake_jobs_status_lease_idx").on(table.status, table.leaseExpiresAt),
    sourceKindCheck: check("profile_fact_intake_jobs_source_kind_check", sql`${table.sourceKind} in ('onboarding', 'settings')`),
    statusCheck: check("profile_fact_intake_jobs_status_check", sql`${table.status} in ('queued', 'running', 'completed', 'failed')`),
    attemptsCheck: check("profile_fact_intake_jobs_attempts_check", sql`${table.attempts} >= 0 and ${table.maxAttempts} > 0`),
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
    statusCheck: check("generated_topic_graphs_status_check", sql`${table.status} in ('candidate', 'promoted', 'retired')`),
    usageCountCheck: check("generated_topic_graphs_usage_count_check", sql`${table.usageCount} >= 1`),
  }),
);

// Subject folders for uploaded materials (docs/product/subject-folders.md). A
// subject folder groups one subject's lectures and owns one assembled KG; each
// owner also has exactly one system "unsorted" inbox folder.
export const materialFolders = pgTable(
  "material_folders",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // subject | unsorted
    kind: text("kind").notNull().default("subject"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerUnsortedUnique: uniqueIndex("material_folders_owner_unsorted_uidx")
      .on(table.ownerId)
      .where(sql`${table.kind} = 'unsorted'`),
    ownerNameUnique: uniqueIndex("material_folders_owner_name_uidx")
      .on(table.ownerId, sql`lower(${table.name})`)
      .where(sql`${table.kind} = 'subject'`),
    ownerCreatedIdx: index("material_folders_owner_created_idx").on(table.ownerId, table.createdAt),
    kindCheck: check("material_folders_kind_check", sql`${table.kind} in ('subject', 'unsorted')`),
  }),
);

// Learner-uploaded study material (docs/product/learning-materials.md). Only
// the extracted text is kept (as ordered chunks), never the original bytes.
// content_sha256 makes a re-upload of the same file idempotent per owner.
export const learningMaterials = pgTable(
  "learning_materials",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    byteLength: integer("byte_length").notNull(),
    contentSha256: text("content_sha256").notNull(),
    charCount: integer("char_count").notNull(),
    chunkCount: integer("chunk_count").notNull(),
    pageCount: integer("page_count"),
    language: text("language"),
    folderId: text("folder_id").notNull().references(() => materialFolders.id, { onDelete: "restrict" }),
    // lecture: part of the folder KG sequence | reference: sources only
    role: text("role").notNull().default("lecture"),
    // Order inside the folder (fractional, so an insert never renumbers).
    position: doublePrecision("position").notNull().default(0),
    // Lecture number parsed from the file name ("第3讲", "Lecture 03"); null when absent.
    lectureNumber: doublePrecision("lecture_number"),
    // How position was decided: filename | ai | manual | upload (appended)
    orderSource: text("order_source").notNull().default("upload"),
    // Per-lecture KG state: pending | processing | ready | failed | skipped
    // (references and unsorted files are skipped).
    kgStatus: text("kg_status").notNull().default("skipped"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerShaUnique: uniqueIndex("learning_materials_owner_sha_uidx").on(table.ownerId, table.contentSha256),
    ownerCreatedIdx: index("learning_materials_owner_created_idx").on(table.ownerId, table.createdAt),
    folderPositionIdx: index("learning_materials_folder_position_idx").on(table.folderId, table.position),
    roleCheck: check("learning_materials_role_check", sql`${table.role} in ('lecture', 'reference')`),
    orderSourceCheck: check("learning_materials_order_source_check", sql`${table.orderSource} in ('filename', 'ai', 'manual', 'upload')`),
    kgStatusCheck: check("learning_materials_kg_status_check", sql`${table.kgStatus} in ('pending', 'processing', 'ready', 'failed', 'skipped')`),
    countsCheck: check(
      "learning_materials_counts_check",
      sql`${table.byteLength} >= 0 and ${table.charCount} >= 0 and ${table.chunkCount} >= 0 and (${table.pageCount} is null or ${table.pageCount} >= 0)`,
    ),
  }),
);

// Ordered text chunks of one material. owner_id is denormalized so every read
// is owner-scoped without a join. Lesson grounding addresses chunks by
// (material_id, ordinal) through material_topic_graphs.concept_sources.
export const learningMaterialChunks = pgTable(
  "learning_material_chunks",
  {
    materialId: text("material_id").notNull().references(() => learningMaterials.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    heading: text("heading"),
    pageStart: integer("page_start"),
    pageEnd: integer("page_end"),
    charCount: integer("char_count").notNull(),
  },
  (table) => ({
    pk: primaryKey({ name: "learning_material_chunks_pk", columns: [table.materialId, table.ordinal] }),
    ownerMaterialIdx: index("learning_material_chunks_owner_material_idx").on(table.ownerId, table.materialId),
    ordinalCheck: check("learning_material_chunks_ordinal_check", sql`${table.ordinal} >= 0 and ${table.charCount} >= 0`),
  }),
);

// Owner-private course graphs derived from uploaded materials. Same TopicGraph
// shape as library/gen_* graphs so outline building, lesson planning, and
// mastery run unchanged — but unlike generated_topic_graphs a row is never
// shared across users or promoted. graph_id is derived from owner + sorted
// material ids, so rebuilding from the same materials reuses the graph.
// concept_sources maps conceptId → [{ materialId, ordinal }] for grounding.
export const materialTopicGraphs = pgTable(
  "material_topic_graphs",
  {
    graphId: text("graph_id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    // Set on a subject folder's assembled graph (one per folder); null on the
    // phase-1 graphs built from a hand-picked material set.
    folderId: text("folder_id").references(() => materialFolders.id, { onDelete: "set null" }),
    materialIds: jsonb("material_ids").$type<string[]>().notNull(),
    title: text("title").notNull(),
    language: text("language"),
    graph: jsonb("graph").notNull(),
    conceptSources: jsonb("concept_sources").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerCreatedIdx: index("material_topic_graphs_owner_created_idx").on(table.ownerId, table.createdAt),
    folderUnique: uniqueIndex("material_topic_graphs_folder_uidx").on(table.folderId).where(sql`${table.folderId} IS NOT NULL`),
  }),
);

// One lecture's small KG inside a subject folder (docs/product/subject-folders.md §3).
// Concepts carry their folder-wide concept id: a new id when the lecture
// introduces the concept, an existing one when the model judged it the same
// idea (sameAs). The folder graph is a deterministic assembly of these rows.
export const materialSubgraphs = pgTable(
  "material_subgraphs",
  {
    materialId: text("material_id").primaryKey().references(() => learningMaterials.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    folderId: text("folder_id").notNull().references(() => materialFolders.id, { onDelete: "cascade" }),
    graph: jsonb("graph").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    folderIdx: index("material_subgraphs_folder_idx").on(table.ownerId, table.folderId),
  }),
);

// Recoverable per-lecture KG jobs. One row per material (reused on retry or
// when the file moves to another subject folder). Lease/fencing mirrors
// profile_fact_intake_jobs; the claim never starts a second job in a folder
// whose job is still running, so concept merging always sees the latest graph.
export const materialKgJobs = pgTable(
  "material_kg_jobs",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    materialId: text("material_id").notNull().references(() => learningMaterials.id, { onDelete: "cascade" }),
    folderId: text("folder_id").notNull().references(() => materialFolders.id, { onDelete: "cascade" }),
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
    materialUnique: uniqueIndex("material_kg_jobs_material_uidx").on(table.materialId),
    leaseTokenUnique: uniqueIndex("material_kg_jobs_lease_token_uidx").on(table.leaseToken),
    statusLeaseIdx: index("material_kg_jobs_status_lease_idx").on(table.status, table.leaseExpiresAt),
    folderStatusIdx: index("material_kg_jobs_folder_status_idx").on(table.folderId, table.status),
    statusCheck: check("material_kg_jobs_status_check", sql`${table.status} in ('queued', 'running', 'completed', 'failed')`),
    attemptsCheck: check("material_kg_jobs_attempts_check", sql`${table.attempts} >= 0 and ${table.maxAttempts} > 0`),
  }),
);

export type UserRow = typeof users.$inferSelect;
export type MediaAssetRow = typeof mediaAssets.$inferSelect;
export type LearnerProfileRow = typeof learnerProfiles.$inferSelect;
export type LearnerFactRow = typeof learnerFacts.$inferSelect;
export type ExtractorJobRow = typeof extractorJobs.$inferSelect;
export type ProfileFactIntakeJobRow = typeof profileFactIntakeJobs.$inferSelect;
export type MaterialFolderRow = typeof materialFolders.$inferSelect;
export type LearningMaterialRow = typeof learningMaterials.$inferSelect;
export type LearningMaterialChunkRow = typeof learningMaterialChunks.$inferSelect;
export type MaterialTopicGraphRow = typeof materialTopicGraphs.$inferSelect;
// Subject-folder multiple-choice quizzes (docs/product/subject-folders.md §4.5).
// The bank accumulates per concept and is reused: a session prefers questions
// the learner has never answered, and only the first answer to a question is
// mastery evidence. Choices are stored already shuffled; `sources` holds the
// MaterialChunkRef[] the question was written from.
export const folderQuizQuestions = pgTable(
  "folder_quiz_questions",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    folderId: text("folder_id").notNull().references(() => materialFolders.id, { onDelete: "cascade" }),
    conceptId: text("concept_id").notNull(),
    language: text("language").notNull(),
    question: text("question").notNull(),
    choices: jsonb("choices").notNull(),
    correctId: text("correct_id").notNull(),
    explanation: text("explanation").notNull().default(""),
    sources: jsonb("sources").notNull().default([]),
    generatorVersion: integer("generator_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    conceptIdx: index("folder_quiz_questions_concept_idx").on(table.ownerId, table.folderId, table.conceptId),
  }),
);

// One quiz over a folder graph. `items` lists the questions in order with the
// concept and lecture they test; submit is idempotent on `submission_id` and
// stores the graded `results` it returned.
export const folderQuizSessions = pgTable(
  "folder_quiz_sessions",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    folderId: text("folder_id").notNull().references(() => materialFolders.id, { onDelete: "cascade" }),
    graphId: text("graph_id").notNull(),
    size: integer("size").notNull(),
    items: jsonb("items").notNull(),
    // open | submitted
    status: text("status").notNull().default("open"),
    submissionId: text("submission_id"),
    answers: jsonb("answers"),
    score: integer("score"),
    total: integer("total"),
    results: jsonb("results"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (table) => ({
    ownerFolderIdx: index("folder_quiz_sessions_owner_folder_idx").on(table.ownerId, table.folderId, table.createdAt),
    statusCheck: check("folder_quiz_sessions_status_check", sql`${table.status} in ('open', 'submitted')`),
  }),
);

// Graded answers: the rolling mastery window (last five first attempts per
// concept) reads these. At most one first attempt per owner and question.
export const folderQuizAnswers = pgTable(
  "folder_quiz_answers",
  {
    sessionId: text("session_id").notNull().references(() => folderQuizSessions.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull().references(() => folderQuizQuestions.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    graphId: text("graph_id").notNull(),
    conceptId: text("concept_id").notNull(),
    ordinal: integer("ordinal").notNull(),
    selectedId: text("selected_id").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    firstAttempt: boolean("first_attempt").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.sessionId, table.questionId] }),
    firstAttemptUidx: uniqueIndex("folder_quiz_answers_first_attempt_uidx").on(table.ownerId, table.questionId).where(sql`${table.firstAttempt}`),
    windowIdx: index("folder_quiz_answers_window_idx").on(table.ownerId, table.graphId, table.conceptId, table.createdAt),
  }),
);

export type MaterialSubgraphRow = typeof materialSubgraphs.$inferSelect;
export type MaterialKgJobRow = typeof materialKgJobs.$inferSelect;
export type FolderQuizQuestionRow = typeof folderQuizQuestions.$inferSelect;
export type FolderQuizSessionRow = typeof folderQuizSessions.$inferSelect;
export type IdentityRow = typeof identities.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
