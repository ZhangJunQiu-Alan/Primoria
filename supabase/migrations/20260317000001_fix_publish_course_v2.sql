-- Fix publish_course v2:
-- 1. Rewrite publish_course RPC to only update course status.
--    The old implementations joined on the removed `chapters` table and
--    unconditionally overwrote lessons.content_json (clearing Builder snapshots).
--    Content is now written exclusively by the Builder via _saveCourseSnapshot.
-- 2. Drop the legacy content_blocks table (no active data).

CREATE OR REPLACE FUNCTION publish_course(p_course_id UUID)
RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM courses WHERE id = p_course_id AND author_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    UPDATE courses
    SET status       = 'published',
        published_at = NOW(),
        updated_at   = NOW()
    WHERE id = p_course_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TABLE IF EXISTS content_blocks CASCADE;
