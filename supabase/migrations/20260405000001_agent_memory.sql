-- ============================================================
-- Agent memory / tutor persistence
-- ============================================================

CREATE TABLE public.agent_threads (
    id               TEXT PRIMARY KEY,
    user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    surface          TEXT NOT NULL DEFAULT 'ai-tutor',
    title            TEXT,
    course_id        TEXT,
    lesson_id        TEXT,
    locale           TEXT,
    status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at  TIMESTAMPTZ
);
CREATE INDEX idx_agent_threads_user_updated
    ON public.agent_threads(user_id, updated_at DESC);
CREATE INDEX idx_agent_threads_user_surface
    ON public.agent_threads(user_id, surface);
CREATE TRIGGER trg_agent_threads_updated_at
    BEFORE UPDATE ON public.agent_threads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE public.agent_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_threads_select_own"
    ON public.agent_threads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "agent_threads_insert_own"
    ON public.agent_threads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agent_threads_update_own"
    ON public.agent_threads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "agent_threads_delete_own"
    ON public.agent_threads FOR DELETE USING (auth.uid() = user_id);
CREATE TABLE public.agent_thread_messages (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id      TEXT NOT NULL REFERENCES public.agent_threads(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role           TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'system')),
    content        TEXT NOT NULL,
    tool_name      TEXT,
    tool_call_id   TEXT,
    metadata       JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_agent_thread_messages_thread_created
    ON public.agent_thread_messages(thread_id, created_at ASC);
CREATE INDEX idx_agent_thread_messages_user_created
    ON public.agent_thread_messages(user_id, created_at DESC);
ALTER TABLE public.agent_thread_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_thread_messages_select_own"
    ON public.agent_thread_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "agent_thread_messages_insert_own"
    ON public.agent_thread_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agent_thread_messages_update_own"
    ON public.agent_thread_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "agent_thread_messages_delete_own"
    ON public.agent_thread_messages FOR DELETE USING (auth.uid() = user_id);
CREATE TABLE public.agent_thread_checkpoints (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id             TEXT NOT NULL REFERENCES public.agent_threads(id) ON DELETE CASCADE,
    user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    checkpoint_ns         TEXT NOT NULL DEFAULT '',
    checkpoint_id         TEXT NOT NULL,
    parent_checkpoint_id  TEXT,
    checkpoint            JSONB,
    metadata              JSONB,
    writes                JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (thread_id, checkpoint_ns, checkpoint_id)
);
CREATE INDEX idx_agent_thread_checkpoints_thread_created
    ON public.agent_thread_checkpoints(thread_id, created_at DESC);
CREATE INDEX idx_agent_thread_checkpoints_user_created
    ON public.agent_thread_checkpoints(user_id, created_at DESC);
ALTER TABLE public.agent_thread_checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_thread_checkpoints_select_own"
    ON public.agent_thread_checkpoints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "agent_thread_checkpoints_insert_own"
    ON public.agent_thread_checkpoints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agent_thread_checkpoints_update_own"
    ON public.agent_thread_checkpoints FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "agent_thread_checkpoints_delete_own"
    ON public.agent_thread_checkpoints FOR DELETE USING (auth.uid() = user_id);
CREATE TABLE public.agent_memories (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    kind               TEXT NOT NULL,
    scope_type         TEXT NOT NULL CHECK (scope_type IN ('global', 'daily', 'course', 'lesson', 'episode')),
    scope_key          TEXT NOT NULL,
    day_key            DATE,
    course_id          TEXT,
    lesson_id          TEXT,
    content            TEXT NOT NULL,
    content_md         TEXT,
    metadata           JSONB NOT NULL DEFAULT '{}'::JSONB,
    source             TEXT NOT NULL DEFAULT 'agent',
    captured_from      TEXT,
    is_summary         BOOLEAN NOT NULL DEFAULT FALSE,
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    importance         SMALLINT NOT NULL DEFAULT 0,
    fingerprint        TEXT,
    version            INTEGER NOT NULL DEFAULT 1,
    summarized_from_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
    last_recalled_at   TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_agent_memories_user_scope_updated
    ON public.agent_memories(user_id, scope_type, updated_at DESC);
CREATE INDEX idx_agent_memories_user_scope_key
    ON public.agent_memories(user_id, scope_key, updated_at DESC);
CREATE INDEX idx_agent_memories_user_kind_updated
    ON public.agent_memories(user_id, kind, updated_at DESC);
CREATE INDEX idx_agent_memories_user_course_lesson
    ON public.agent_memories(user_id, course_id, lesson_id, updated_at DESC);
CREATE INDEX idx_agent_memories_user_day
    ON public.agent_memories(user_id, day_key DESC);
CREATE INDEX idx_agent_memories_user_active
    ON public.agent_memories(user_id, is_active, is_summary, updated_at DESC);
CREATE INDEX idx_agent_memories_fingerprint
    ON public.agent_memories(user_id, fingerprint)
    WHERE fingerprint IS NOT NULL;
CREATE TRIGGER trg_agent_memories_updated_at
    BEFORE UPDATE ON public.agent_memories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_memories_select_own"
    ON public.agent_memories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "agent_memories_insert_own"
    ON public.agent_memories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agent_memories_update_own"
    ON public.agent_memories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "agent_memories_delete_own"
    ON public.agent_memories FOR DELETE USING (auth.uid() = user_id);
