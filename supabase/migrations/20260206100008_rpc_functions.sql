-- ============================================================
-- 7. RPC business functions
-- ============================================================

-- -------------------- Full-text search courses --------------------
CREATE OR REPLACE FUNCTION search_courses(
    p_query      TEXT    DEFAULT NULL,
    p_subject_id UUID    DEFAULT NULL,
    p_difficulty difficulty_level DEFAULT NULL,
    p_tags       TEXT[]  DEFAULT NULL,
    p_limit      INTEGER DEFAULT 20,
    p_offset     INTEGER DEFAULT 0
)
RETURNS SETOF courses AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM courses c
    WHERE c.status = 'published'
      AND (p_query IS NULL      OR c.search_tsv @@ plainto_tsquery('simple', p_query))
      AND (p_subject_id IS NULL OR c.subject_id = p_subject_id)
      AND (p_difficulty IS NULL OR c.difficulty_level = p_difficulty)
      AND (p_tags IS NULL       OR c.tags && p_tags)
    ORDER BY
        CASE WHEN p_query IS NOT NULL
             THEN ts_rank(c.search_tsv, plainto_tsquery('simple', p_query))
             ELSE 0 END DESC,
        c.published_at DESC NULLS LAST
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------- Publish course (aggregate content_blocks -> lessons.content_json) --------------------
CREATE OR REPLACE FUNCTION publish_course(p_course_id UUID)
RETURNS VOID AS $$
DECLARE
    v_lesson RECORD;
    v_blocks JSONB;
BEGIN
    -- Permission check
    IF NOT EXISTS (
        SELECT 1 FROM courses WHERE id = p_course_id AND author_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    -- Aggregate content_blocks snapshot for each lesson in the course
    FOR v_lesson IN
        SELECT l.id AS lesson_id
        FROM lessons l
        JOIN chapters ch ON ch.id = l.chapter_id
        WHERE ch.course_id = p_course_id
    LOOP
        SELECT coalesce(jsonb_agg(
            jsonb_build_object(
                'block_id',       cb.id,
                'type',           cb.type,
                'content',        cb.content,
                'config',         cb.config,
                'is_interactive', cb.is_interactive,
                'sort_key',       cb.sort_key
            ) ORDER BY cb.sort_key
        ), '[]'::jsonb)
        INTO v_blocks
        FROM content_blocks cb
        WHERE cb.lesson_id = v_lesson.lesson_id;

        UPDATE lessons
        SET content_json = v_blocks,
            content_hash = md5(v_blocks::text),
            updated_at   = NOW()
        WHERE id = v_lesson.lesson_id;
    END LOOP;

    -- Update course status
    UPDATE courses
    SET status       = 'published',
        published_at = NOW(),
        updated_at   = NOW()
    WHERE id = p_course_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------- Daily activity upsert (for GitHub heatmap) --------------------
CREATE OR REPLACE FUNCTION upsert_daily_activity(
    p_user_id UUID,
    p_xp      INTEGER DEFAULT 0,
    p_lessons INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO daily_activity_log (user_id, date, xp_earned, lessons_count)
    VALUES (p_user_id, CURRENT_DATE, p_xp, p_lessons)
    ON CONFLICT (user_id, date)
    DO UPDATE SET
        xp_earned     = daily_activity_log.xp_earned     + EXCLUDED.xp_earned,
        lessons_count = daily_activity_log.lessons_count  + EXCLUDED.lessons_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------- Update user streak --------------------
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_last_date DATE;
    v_today     DATE := CURRENT_DATE;
BEGIN
    SELECT last_activity_date INTO v_last_date
    FROM user_stats WHERE user_id = p_user_id;

    IF v_last_date IS NULL THEN
        -- First activity, initialize
        INSERT INTO user_stats (user_id, current_streak, longest_streak, last_activity_date)
        VALUES (p_user_id, 1, 1, v_today)
        ON CONFLICT (user_id) DO UPDATE SET
            current_streak     = 1,
            longest_streak     = GREATEST(user_stats.longest_streak, 1),
            last_activity_date = v_today;
    ELSIF v_last_date = v_today THEN
        -- Already recorded today, skip
        NULL;
    ELSIF v_last_date = v_today - 1 THEN
        -- Consecutive streak
        UPDATE user_stats SET
            current_streak     = current_streak + 1,
            longest_streak     = GREATEST(longest_streak, current_streak + 1),
            last_activity_date = v_today
        WHERE user_id = p_user_id;
    ELSE
        -- Streak broken, reset
        UPDATE user_stats SET
            current_streak     = 1,
            last_activity_date = v_today
        WHERE user_id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
