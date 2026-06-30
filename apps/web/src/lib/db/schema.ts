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

export const workspaces = pgTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    inviteCode: text("invite_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerUpdatedIdx: index("workspaces_owner_updated_idx").on(table.ownerId, table.updatedAt),
    inviteCodeIdx: uniqueIndex("workspaces_invite_code_idx").on(table.inviteCode),
  }),
);

export const workspaceAgentProfiles = pgTable(
  "workspace_agent_profiles",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    handle: text("handle").notNull(),
    description: text("description").notNull(),
    visibility: text("visibility").notNull(),
    templateKey: text("template_key"),
    systemPrompt: text("system_prompt").notNull(),
    defaultModel: text("default_model"),
    memoryScope: text("memory_scope").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index("workspace_agent_profiles_workspace_idx").on(table.workspaceId),
    ownerWorkspaceIdx: index("workspace_agent_profiles_owner_workspace_idx").on(table.ownerId, table.workspaceId),
    workspaceHandleUnique: uniqueIndex("workspace_agent_profiles_workspace_handle_uidx").on(table.workspaceId, table.handle),
  }),
);

export const workspaceAgentCapabilities = pgTable(
  "workspace_agent_capabilities",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id").notNull().references(() => workspaceAgentProfiles.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    source: text("source"),
    path: text("path"),
    toolName: text("tool_name"),
    connectionId: text("connection_id"),
    agentProfileId: text("agent_profile_id"),
    approval: text("approval"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    profileIdx: index("workspace_agent_capabilities_profile_idx").on(table.profileId),
    workspaceIdx: index("workspace_agent_capabilities_workspace_idx").on(table.workspaceId),
  }),
);

export const workspaceAgentConnections = pgTable(
  "workspace_agent_connections",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(),
    displayName: text("display_name").notNull(),
    transport: text("transport").notNull(),
    configRef: text("config_ref").notNull(),
    allowedToolNames: jsonb("allowed_tool_names").notNull(),
    status: text("status").notNull().default("available"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerScopeIdx: index("workspace_agent_connections_owner_scope_idx").on(table.ownerId, table.scope),
    workspaceScopeIdx: index("workspace_agent_connections_workspace_scope_idx").on(table.workspaceId, table.scope),
  }),
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    role: text("role").notNull(),
    status: text("status"),
    agentProfileId: text("agent_profile_id").references(() => workspaceAgentProfiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index("workspace_members_workspace_idx").on(table.workspaceId),
    ownerWorkspaceIdx: index("workspace_members_owner_workspace_idx").on(table.ownerId, table.workspaceId),
  }),
);

export const workspaceThreads = pgTable(
  "workspace_threads",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    agentTriggerMode: text("agent_trigger_mode").notNull().default("room_default"),
    allowedAgentProfileIds: jsonb("allowed_agent_profile_ids"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceTypeIdx: index("workspace_threads_workspace_type_idx").on(table.workspaceId, table.type),
    ownerUpdatedIdx: index("workspace_threads_owner_updated_idx").on(table.ownerId, table.updatedAt),
  }),
);

export const workspaceThreadMembers = pgTable(
  "workspace_thread_members",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    threadId: text("thread_id").notNull().references(() => workspaceThreads.id, { onDelete: "cascade" }),
    memberId: text("member_id").notNull().references(() => workspaceMembers.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    threadOwnerIdx: index("workspace_thread_members_thread_owner_idx").on(table.threadId, table.ownerId),
    memberThreadUnique: uniqueIndex("workspace_thread_members_member_thread_uidx").on(table.memberId, table.threadId),
  }),
);

export const workspaceMessages = pgTable(
  "workspace_messages",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    threadId: text("thread_id").notNull().references(() => workspaceThreads.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    senderName: text("sender_name").notNull(),
    senderKind: text("sender_kind").notNull(),
    content: text("content").notNull(),
    artifact: jsonb("artifact"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    threadCreatedIdx: index("workspace_messages_thread_created_idx").on(table.threadId, table.createdAt),
    ownerCreatedIdx: index("workspace_messages_owner_created_idx").on(table.ownerId, table.createdAt),
  }),
);

export const workspaceArtifacts = pgTable(
  "workspace_artifacts",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    threadId: text("thread_id").notNull().references(() => workspaceThreads.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    reviewStatus: text("review_status").notNull().default("reviewed"),
    sourceMessageId: text("source_message_id").notNull().references(() => workspaceMessages.id, { onDelete: "cascade" }),
    sourceRunId: text("source_run_id"),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceCreatedIdx: index("workspace_artifacts_workspace_created_idx").on(table.workspaceId, table.createdAt),
    threadCreatedIdx: index("workspace_artifacts_thread_created_idx").on(table.threadId, table.createdAt),
    sourceMessageUnique: uniqueIndex("workspace_artifacts_source_message_uidx").on(table.sourceMessageId),
    sourceRunIdx: index("workspace_artifacts_source_run_idx").on(table.sourceRunId),
  }),
);

export const workspaceTasks = pgTable(
  "workspace_tasks",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    threadId: text("thread_id").notNull().references(() => workspaceThreads.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    scope: text("scope").notNull(),
    status: text("status").notNull().default("open"),
    progress: text("progress").notNull(),
    dueAt: text("due_at"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    threadStatusIdx: index("workspace_tasks_thread_status_idx").on(table.threadId, table.status),
    ownerUpdatedIdx: index("workspace_tasks_owner_updated_idx").on(table.ownerId, table.updatedAt),
  }),
);

export const workspaceAgentRuns = pgTable(
  "workspace_agent_runs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    threadId: text("thread_id").notNull().references(() => workspaceThreads.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    agentProfileId: text("agent_profile_id").notNull().references(() => workspaceAgentProfiles.id, { onDelete: "cascade" }),
    agentMemberId: text("agent_member_id").references(() => workspaceMembers.id, { onDelete: "set null" }),
    trigger: text("trigger").notNull(),
    status: text("status").notNull(),
    inputMessageId: text("input_message_id").references(() => workspaceMessages.id, { onDelete: "set null" }),
    outputMessageId: text("output_message_id").references(() => workspaceMessages.id, { onDelete: "set null" }),
    taskId: text("task_id").references(() => workspaceTasks.id, { onDelete: "set null" }),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    workspaceStatusIdx: index("workspace_agent_runs_workspace_status_idx").on(table.workspaceId, table.status),
    threadStartedIdx: index("workspace_agent_runs_thread_started_idx").on(table.threadId, table.startedAt),
    profileStartedIdx: index("workspace_agent_runs_profile_started_idx").on(table.agentProfileId, table.startedAt),
  }),
);

export const workspaceAgentRunEvents = pgTable(
  "workspace_agent_run_events",
  {
    id: text("id").primaryKey(),
    runId: text("run_id").notNull().references(() => workspaceAgentRuns.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    threadId: text("thread_id").notNull().references(() => workspaceThreads.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    label: text("label").notNull(),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    runCreatedIdx: index("workspace_agent_run_events_run_created_idx").on(table.runId, table.createdAt),
    threadCreatedIdx: index("workspace_agent_run_events_thread_created_idx").on(table.threadId, table.createdAt),
  }),
);

export const workspaceAgentApprovals = pgTable(
  "workspace_agent_approvals",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    threadId: text("thread_id").notNull().references(() => workspaceThreads.id, { onDelete: "cascade" }),
    runId: text("run_id").notNull().references(() => workspaceAgentRuns.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    agentProfileId: text("agent_profile_id").notNull().references(() => workspaceAgentProfiles.id, { onDelete: "cascade" }),
    agentMemberId: text("agent_member_id").references(() => workspaceMembers.id, { onDelete: "set null" }),
    toolName: text("tool_name").notNull(),
    status: text("status").notNull(),
    input: jsonb("input"),
    policy: jsonb("policy"),
    deepAgentThreadId: text("deep_agent_thread_id"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: text("decided_by"),
    decisionReason: text("decision_reason"),
  },
  (table) => ({
    runStatusIdx: index("workspace_agent_approvals_run_status_idx").on(table.runId, table.status),
    workspaceStatusIdx: index("workspace_agent_approvals_workspace_status_idx").on(table.workspaceId, table.status),
    threadRequestedIdx: index("workspace_agent_approvals_thread_requested_idx").on(table.threadId, table.requestedAt),
  }),
);

export const workspaceAgentMemories = pgTable(
  "workspace_agent_memories",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    threadId: text("thread_id").references(() => workspaceThreads.id, { onDelete: "cascade" }),
    agentProfileId: text("agent_profile_id").notNull().references(() => workspaceAgentProfiles.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    sourceRunId: text("source_run_id").references(() => workspaceAgentRuns.id, { onDelete: "set null" }),
    sourceMessageId: text("source_message_id").references(() => workspaceMessages.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => ({
    workspaceScopeIdx: index("workspace_agent_memories_workspace_scope_idx").on(table.workspaceId, table.scope),
    userScopeIdx: index("workspace_agent_memories_user_scope_idx").on(table.userId, table.scope),
    threadIdx: index("workspace_agent_memories_thread_idx").on(table.threadId),
    profileIdx: index("workspace_agent_memories_profile_idx").on(table.agentProfileId),
  }),
);

export const workspaceAgentSkills = pgTable(
  "workspace_agent_skills",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    instructions: text("instructions").notNull(),
    markdown: text("markdown").notNull(),
    currentVersion: integer("current_version").notNull().default(1),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index("workspace_agent_skills_workspace_idx").on(table.workspaceId),
    ownerIdx: index("workspace_agent_skills_owner_idx").on(table.ownerId),
    workspaceSlugUnique: uniqueIndex("workspace_agent_skills_workspace_slug_uidx").on(table.source, table.workspaceId, table.slug),
    userSlugUnique: uniqueIndex("workspace_agent_skills_user_slug_uidx").on(table.source, table.ownerId, table.slug),
  }),
);

export const workspaceAgentSkillVersions = pgTable(
  "workspace_agent_skill_versions",
  {
    id: text("id").primaryKey(),
    skillId: text("skill_id").notNull().references(() => workspaceAgentSkills.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    instructions: text("instructions").notNull(),
    markdown: text("markdown").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    skillVersionUnique: uniqueIndex("workspace_agent_skill_versions_skill_version_uidx").on(table.skillId, table.version),
    skillIdx: index("workspace_agent_skill_versions_skill_idx").on(table.skillId),
    workspaceIdx: index("workspace_agent_skill_versions_workspace_idx").on(table.workspaceId),
    ownerIdx: index("workspace_agent_skill_versions_owner_idx").on(table.ownerId),
  }),
);

export const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  preferences: jsonb("preferences").notNull().default({}),
  providerSettings: jsonb("provider_settings"),
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
    answers: jsonb("answers").notNull(),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerCourseIdx: index("quiz_attempts_owner_course_idx").on(table.ownerId, table.courseId),
    blockIdx: index("quiz_attempts_block_idx").on(table.blockId),
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

// Per-user concept mastery (feature_specification.md §156). Second memory layer:
// concept-level state only, no chat summaries. Drives skip / quick-review /
// remediation decisions. Written owner-scoped from the learning-progress worker
// (no request session). NOTE: this table predates Drizzle (it exists in Supabase
// with RLS); the migration creates it idempotently (IF NOT EXISTS).
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

// Core memory layer (feature_specification.md §101): distilled "facts about the
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

export type UserRow = typeof users.$inferSelect;
export type MediaAssetRow = typeof mediaAssets.$inferSelect;
export type LearnerProfileRow = typeof learnerProfiles.$inferSelect;
export type LearnerFactRow = typeof learnerFacts.$inferSelect;
export type ExtractorJobRow = typeof extractorJobs.$inferSelect;
export type IdentityRow = typeof identities.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
