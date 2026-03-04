-- ============================================================
-- Gamification v2: rarity, daily_tasks, lesson accuracy
-- ============================================================

-- 1. Add 'challenge' to achievement_category enum
ALTER TYPE achievement_category ADD VALUE IF NOT EXISTS 'challenge';

-- 2. Achievement rarity enum
DO $$ BEGIN
  CREATE TYPE achievement_rarity AS ENUM ('common', 'rare', 'epic', 'legendary');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Add rarity column to achievements
ALTER TABLE achievements
  ADD COLUMN IF NOT EXISTS rarity achievement_rarity NOT NULL DEFAULT 'common';

-- 4. Pinned achievements on profiles (up to 3 UUIDs)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pinned_achievement_ids UUID[] NOT NULL DEFAULT '{}';

-- 5. Track correct / total answers on lesson_completions
ALTER TABLE lesson_completions
  ADD COLUMN IF NOT EXISTS correct_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_count   INTEGER NOT NULL DEFAULT 0;

-- 6. daily_tasks table
CREATE TABLE IF NOT EXISTS daily_tasks (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    task_date     DATE    NOT NULL,
    task_type     TEXT    NOT NULL,
    display_label TEXT    NOT NULL,
    target_value  INTEGER NOT NULL DEFAULT 1,
    current_value INTEGER NOT NULL DEFAULT 0,
    reward_xp     INTEGER NOT NULL DEFAULT 20,
    is_completed  BOOLEAN NOT NULL DEFAULT false,
    completed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, task_date, task_type)
);

CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date
    ON daily_tasks(user_id, task_date DESC);

ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_tasks_select_own"
    ON daily_tasks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "daily_tasks_insert_own"
    ON daily_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_tasks_update_own"
    ON daily_tasks FOR UPDATE USING (auth.uid() = user_id);
