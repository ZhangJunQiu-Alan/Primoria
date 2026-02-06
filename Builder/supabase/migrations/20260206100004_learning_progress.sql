-- ============================================================
-- 3. 学习进度与追踪 (Learning & Progress)
-- ============================================================

-- -------------------- enrollments (选课记录) --------------------
CREATE TABLE enrollments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status          enrollment_status NOT NULL DEFAULT 'in_progress',
    progress_bp     INTEGER NOT NULL DEFAULT 0 CHECK (progress_bp BETWEEN 0 AND 10000),
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    UNIQUE (user_id, course_id)
);

CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);

-- RLS
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrollments_select_own"
    ON enrollments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "enrollments_insert_own"
    ON enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "enrollments_update_own"
    ON enrollments FOR UPDATE USING (auth.uid() = user_id);

-- -------------------- lesson_completions (完课记录) --------------------
CREATE TABLE lesson_completions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id           UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    score               INTEGER,
    time_spent_seconds  INTEGER,
    completed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, lesson_id)
);

CREATE INDEX idx_lesson_completions_user ON lesson_completions(user_id);
CREATE INDEX idx_lesson_completions_lesson ON lesson_completions(lesson_id);

-- RLS
ALTER TABLE lesson_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lesson_completions_select_own"
    ON lesson_completions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "lesson_completions_insert_own"
    ON lesson_completions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- -------------------- block_interactions (交互详情) --------------------
-- append-only，按月可分区
CREATE TABLE block_interactions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    block_id    UUID NOT NULL REFERENCES content_blocks(id) ON DELETE CASCADE,
    user_input  JSONB,
    is_correct  BOOLEAN,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_block_interactions_user ON block_interactions(user_id);
CREATE INDEX idx_block_interactions_block ON block_interactions(block_id);
CREATE INDEX idx_block_interactions_created ON block_interactions(created_at);

-- RLS
ALTER TABLE block_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "block_interactions_select_own"
    ON block_interactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "block_interactions_insert_own"
    ON block_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);
