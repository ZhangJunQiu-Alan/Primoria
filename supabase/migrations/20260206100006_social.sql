-- ============================================================
-- 5. Social
-- ============================================================

-- -------------------- follows (follow relationships) --------------------
CREATE TABLE follows (
    follower_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    following_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id <> following_id)
);

CREATE INDEX idx_follows_following ON follows(following_id);

-- RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_select_public"
    ON follows FOR SELECT USING (true);

CREATE POLICY "follows_insert_own"
    ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows_delete_own"
    ON follows FOR DELETE USING (auth.uid() = follower_id);

-- -------------------- course_feedback (course feedback) --------------------
CREATE TABLE course_feedback (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, course_id)
);

CREATE INDEX idx_course_feedback_course ON course_feedback(course_id);

-- RLS
ALTER TABLE course_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_select_public"
    ON course_feedback FOR SELECT USING (true);

CREATE POLICY "feedback_insert_own"
    ON course_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "feedback_update_own"
    ON course_feedback FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "feedback_delete_own"
    ON course_feedback FOR DELETE USING (auth.uid() = user_id);
