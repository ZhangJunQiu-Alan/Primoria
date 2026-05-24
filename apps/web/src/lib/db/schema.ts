import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

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
    blocks: jsonb("blocks").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    ownerUpdatedIdx: index("courses_owner_updated_idx").on(table.ownerId, table.updatedAt),
    ownerArchivedUpdatedIdx: index("courses_owner_archived_updated_idx").on(table.ownerId, table.archivedAt, table.updatedAt),
  }),
);

export const learningApps = pgTable(
  "learning_apps",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    displayName: text("display_name").notNull(),
    description: text("description"),
    tags: jsonb("tags").notNull(),
    template: jsonb("template").notNull(),
    origin: jsonb("origin").notNull(),
    composition: jsonb("composition"),
    capabilities: jsonb("capabilities"),
    metadata: jsonb("metadata").notNull(),
    htmlSignature: text("html_signature"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    ownerUpdatedIdx: index("learning_apps_owner_updated_idx").on(table.ownerId, table.updatedAt),
    ownerArchivedUpdatedIdx: index("learning_apps_owner_archived_updated_idx").on(table.ownerId, table.archivedAt, table.updatedAt),
    ownerSignatureUnique: uniqueIndex("learning_apps_owner_signature_uidx").on(table.ownerId, table.htmlSignature),
  }),
);

export const courseEditEvents = pgTable(
  "course_edit_events",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
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

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    role: text("role").notNull(),
    status: text("status"),
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceTypeIdx: index("workspace_threads_workspace_type_idx").on(table.workspaceId, table.type),
    ownerUpdatedIdx: index("workspace_threads_owner_updated_idx").on(table.ownerId, table.updatedAt),
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

export const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  preferences: jsonb("preferences").notNull().default({}),
  providerSettings: jsonb("provider_settings"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserRow = typeof users.$inferSelect;
export type IdentityRow = typeof identities.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
