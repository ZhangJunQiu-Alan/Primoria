-- ============================================================
-- 4. Gamification
-- ============================================================

-- -------------------- user_stats (user stats - realtime cache) --------------------
CREATE TABLE user_stats (
    user_id             UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    total_xp            INTEGER NOT NULL DEFAULT 0,
    current_streak      INTEGER NOT NULL DEFAULT 0,
    longest_streak      INTEGER NOT NULL DEFAULT 0,
    courses_completed   INTEGER NOT NULL DEFAULT 0,
    lessons_completed   INTEGER NOT NULL DEFAULT 0,
    last_activity_date  DATE
);

-- RLS
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_stats_select_public"
    ON user_stats FOR SELECT USING (true);

CREATE POLICY "user_stats_insert_own"
    ON user_stats FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_stats_update_own"
    ON user_stats FOR UPDATE USING (auth.uid() = user_id);

-- -------------------- daily_activity_log (daily activity log - GitHub heatmap) --------------------
CREATE TABLE daily_activity_log (
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    xp_earned       INTEGER NOT NULL DEFAULT 0,
    lessons_count   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, date)
);

CREATE INDEX idx_daily_activity_user_date ON daily_activity_log(user_id, date DESC);

-- RLS
ALTER TABLE daily_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_activity_select_own"
    ON daily_activity_log FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "daily_activity_insert_own"
    ON daily_activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_activity_update_own"
    ON daily_activity_log FOR UPDATE USING (auth.uid() = user_id);

-- -------------------- achievements (achievement definitions) --------------------
CREATE TABLE achievements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    description TEXT,
    icon_url    TEXT,
    category    achievement_category NOT NULL
);

-- RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "achievements_select_public"
    ON achievements FOR SELECT USING (true);

-- -------------------- user_achievements (user earned achievements) --------------------
CREATE TABLE user_achievements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_id  UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- RLS
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_achievements_select_own"
    ON user_achievements FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_achievements_insert_own"
    ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- -------------------- xp_transactions (XP ledger - audit log) --------------------
CREATE TABLE xp_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount          INTEGER NOT NULL,
    source_type     xp_source_type NOT NULL,
    reference_id    UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_xp_transactions_user ON xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_created ON xp_transactions(created_at);

-- RLS
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xp_transactions_select_own"
    ON xp_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "xp_transactions_insert_own"
    ON xp_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
