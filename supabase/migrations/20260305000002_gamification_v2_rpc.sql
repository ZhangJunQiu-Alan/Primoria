-- ============================================================
-- Updated complete_lesson_and_award_xp
-- Now accepts correct_count / total_count and returns XP breakdown.
-- ============================================================

CREATE OR REPLACE FUNCTION complete_lesson_and_award_xp(
    p_lesson_id     UUID,
    p_score         INTEGER DEFAULT 0,
    p_seconds       INTEGER DEFAULT 0,
    p_correct_count INTEGER DEFAULT 0,
    p_total_count   INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_base_xp        INTEGER := 50;
    v_accuracy_xp    INTEGER := 0;
    v_streak_xp      INTEGER := 0;
    v_first_today_xp INTEGER := 0;
    v_total_xp       INTEGER;
    v_already        BOOLEAN;
    v_streak         INTEGER;
    v_accuracy_pct   INTEGER := 100;
    v_is_first_today BOOLEAN;
BEGIN
    -- Accuracy bonus
    IF p_total_count > 0 THEN
        v_accuracy_pct := ROUND(p_correct_count::NUMERIC / p_total_count::NUMERIC * 100);
        IF p_correct_count = p_total_count THEN
            v_accuracy_xp := 35;
        ELSIF v_accuracy_pct >= 80 THEN
            v_accuracy_xp := 20;
        END IF;
    END IF;

    -- Is this the first lesson completed today?
    SELECT NOT EXISTS (
        SELECT 1 FROM daily_activity_log
        WHERE user_id = auth.uid()
          AND date = CURRENT_DATE
          AND lessons_count > 0
    ) INTO v_is_first_today;

    IF v_is_first_today THEN
        v_first_today_xp := 5;
    END IF;

    -- Streak bonus
    SELECT current_streak INTO v_streak
    FROM user_stats WHERE user_id = auth.uid();
    v_streak := COALESCE(v_streak, 0);

    IF v_streak >= 30 THEN
        v_streak_xp := 20;
    ELSIF v_streak >= 7 THEN
        v_streak_xp := 10;
    END IF;

    v_total_xp := v_base_xp + v_accuracy_xp + v_streak_xp + v_first_today_xp;

    -- Upsert lesson completion (with accuracy data)
    INSERT INTO lesson_completions
        (user_id, lesson_id, score, time_spent_seconds, correct_count, total_count)
    VALUES
        (auth.uid(), p_lesson_id, p_score, p_seconds, p_correct_count, p_total_count)
    ON CONFLICT (user_id, lesson_id) DO UPDATE SET
        score              = EXCLUDED.score,
        time_spent_seconds = EXCLUDED.time_spent_seconds,
        correct_count      = EXCLUDED.correct_count,
        total_count        = EXCLUDED.total_count,
        completed_at       = NOW();

    -- Award XP only on first completion
    SELECT EXISTS (
        SELECT 1 FROM xp_transactions
        WHERE user_id    = auth.uid()
          AND reference_id = p_lesson_id
          AND source_type  = 'lesson_complete'
    ) INTO v_already;

    IF NOT v_already THEN
        INSERT INTO xp_transactions (user_id, amount, source_type, reference_id)
        VALUES (auth.uid(), v_total_xp, 'lesson_complete', p_lesson_id);

        INSERT INTO user_stats (user_id, total_xp, lessons_completed)
        VALUES (auth.uid(), v_total_xp, 1)
        ON CONFLICT (user_id) DO UPDATE SET
            total_xp          = user_stats.total_xp + EXCLUDED.total_xp,
            lessons_completed = user_stats.lessons_completed + 1;
    END IF;

    -- Update daily activity log
    PERFORM upsert_daily_activity(
        auth.uid(),
        CASE WHEN v_already THEN 0 ELSE v_total_xp END,
        1
    );

    -- Update streak
    PERFORM update_user_streak(auth.uid());

    RETURN jsonb_build_object(
        'xp_earned',       CASE WHEN v_already THEN 0 ELSE v_total_xp END,
        'base_xp',         v_base_xp,
        'accuracy_xp',     v_accuracy_xp,
        'streak_xp',       v_streak_xp,
        'first_today_xp',  v_first_today_xp,
        'accuracy_pct',    v_accuracy_pct,
        'is_first_today',  v_is_first_today,
        'already_completed', v_already
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
