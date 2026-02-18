-- ============================================================
-- complete_lesson_and_award_xp
-- Atomically records lesson completion, awards XP (once per lesson),
-- updates user_stats, and refreshes the streak.
-- ============================================================

CREATE OR REPLACE FUNCTION complete_lesson_and_award_xp(
    p_lesson_id UUID,
    p_score     INTEGER DEFAULT 0,
    p_seconds   INTEGER DEFAULT 0
)
RETURNS VOID AS $$
DECLARE
    v_xp       INTEGER;
    v_already  BOOLEAN;
BEGIN
    -- Look up the lesson's XP reward
    SELECT xp_reward INTO v_xp FROM lessons WHERE id = p_lesson_id;
    v_xp := COALESCE(v_xp, 0);

    -- Upsert lesson completion record
    INSERT INTO lesson_completions (user_id, lesson_id, score, time_spent_seconds)
    VALUES (auth.uid(), p_lesson_id, p_score, p_seconds)
    ON CONFLICT (user_id, lesson_id) DO UPDATE SET
        score              = EXCLUDED.score,
        time_spent_seconds = EXCLUDED.time_spent_seconds,
        completed_at       = NOW();

    -- Only award XP on the FIRST completion
    SELECT EXISTS (
        SELECT 1 FROM xp_transactions
        WHERE user_id     = auth.uid()
          AND reference_id = p_lesson_id
          AND source_type  = 'lesson_complete'
    ) INTO v_already;

    IF NOT v_already AND v_xp > 0 THEN
        INSERT INTO xp_transactions (user_id, amount, source_type, reference_id)
        VALUES (auth.uid(), v_xp, 'lesson_complete', p_lesson_id);

        -- Increment total_xp + lessons_completed in user_stats
        INSERT INTO user_stats (user_id, total_xp, lessons_completed)
        VALUES (auth.uid(), v_xp, 1)
        ON CONFLICT (user_id) DO UPDATE SET
            total_xp          = user_stats.total_xp + EXCLUDED.total_xp,
            lessons_completed = user_stats.lessons_completed + 1;
    END IF;

    -- Update daily activity log (for heatmap)
    PERFORM upsert_daily_activity(auth.uid(), v_xp, 1);

    -- Update streak
    PERFORM update_user_streak(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
