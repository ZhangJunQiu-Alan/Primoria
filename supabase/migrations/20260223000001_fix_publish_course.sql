-- Fix publish_course: only overwrite lessons.content_json when content_blocks
-- exist for that lesson. This preserves the Builder JSON snapshot stored
-- directly in content_json (via _saveCourseSnapshot) when a course is
-- published without using the content_blocks table.

CREATE OR REPLACE FUNCTION publish_course(p_course_id UUID)
RETURNS VOID AS $$
DECLARE
    v_lesson      RECORD;
    v_blocks      JSONB;
    v_block_count INTEGER;
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
        -- Count blocks so we don't overwrite a Builder JSON snapshot with []
        SELECT COUNT(*) INTO v_block_count
        FROM content_blocks cb
        WHERE cb.lesson_id = v_lesson.lesson_id;

        IF v_block_count > 0 THEN
            SELECT jsonb_agg(
                jsonb_build_object(
                    'block_id',       cb.id,
                    'type',           cb.type,
                    'content',        cb.content,
                    'config',         cb.config,
                    'is_interactive', cb.is_interactive,
                    'sort_key',       cb.sort_key
                ) ORDER BY cb.sort_key
            )
            INTO v_blocks
            FROM content_blocks cb
            WHERE cb.lesson_id = v_lesson.lesson_id;

            UPDATE lessons
            SET content_json = v_blocks,
                content_hash = md5(v_blocks::text),
                updated_at   = NOW()
            WHERE id = v_lesson.lesson_id;
        END IF;
        -- When v_block_count = 0, leave content_json untouched
        -- so any Builder JSON snapshot is preserved.
    END LOOP;

    -- Mark course as published
    UPDATE courses
    SET status       = 'published',
        published_at = NOW(),
        updated_at   = NOW()
    WHERE id = p_course_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
