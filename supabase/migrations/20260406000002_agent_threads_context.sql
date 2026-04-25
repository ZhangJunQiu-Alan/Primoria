ALTER TABLE public.agent_threads
    ADD COLUMN IF NOT EXISTS block_id TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB;
CREATE INDEX IF NOT EXISTS idx_agent_threads_user_course_lesson
    ON public.agent_threads(user_id, course_id, lesson_id, updated_at DESC);
