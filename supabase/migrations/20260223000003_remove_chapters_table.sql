-- Remove chapters table.
-- Lessons become direct children of courses and keep lightweight grouping metadata.

ALTER TABLE lessons
    ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS group_title TEXT,
    ADD COLUMN IF NOT EXISTS group_sort_key BIGINT;

-- Backfill new lesson ownership/group fields from chapters.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'chapters'
    ) THEN
        UPDATE lessons l
        SET
            course_id = ch.course_id,
            group_title = COALESCE(NULLIF(ch.title, ''), 'Chapter 1'),
            group_sort_key = COALESCE(ch.sort_key, 1000)
        FROM chapters ch
        WHERE ch.id = l.chapter_id
          AND (
              l.course_id IS NULL
              OR l.group_title IS NULL
              OR l.group_sort_key IS NULL
          );
    END IF;
END $$;

UPDATE lessons
SET group_title = 'Chapter 1'
WHERE group_title IS NULL OR btrim(group_title) = '';

UPDATE lessons
SET group_sort_key = 1000
WHERE group_sort_key IS NULL;

DO $$
DECLARE
    v_missing INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_missing
    FROM lessons
    WHERE course_id IS NULL;

    IF v_missing > 0 THEN
        RAISE EXCEPTION 'Cannot remove chapters: % lessons still missing course_id', v_missing;
    END IF;
END $$;

ALTER TABLE lessons
    ALTER COLUMN course_id SET NOT NULL,
    ALTER COLUMN group_title SET NOT NULL,
    ALTER COLUMN group_title SET DEFAULT 'Chapter 1',
    ALTER COLUMN group_sort_key SET NOT NULL,
    ALTER COLUMN group_sort_key SET DEFAULT 1000;

CREATE INDEX IF NOT EXISTS idx_lessons_course_group_sort
    ON lessons(course_id, group_sort_key, sort_key, id);

CREATE INDEX IF NOT EXISTS idx_lessons_course_sort
    ON lessons(course_id, sort_key, id);

ALTER TABLE lessons
    DROP CONSTRAINT IF EXISTS lessons_chapter_id_sort_key_key,
    DROP CONSTRAINT IF EXISTS lessons_chapter_id_fkey;

DROP INDEX IF EXISTS idx_lessons_chapter_sort;

-- Rebuild lesson policies to reference lessons.course_id directly.
DROP POLICY IF EXISTS "lessons_select_via_course" ON lessons;
DROP POLICY IF EXISTS "lessons_insert_author" ON lessons;
DROP POLICY IF EXISTS "lessons_update_author" ON lessons;
DROP POLICY IF EXISTS "lessons_delete_author" ON lessons;

CREATE POLICY "lessons_select_via_course"
    ON lessons FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = lessons.course_id
              AND (courses.status = 'published' OR courses.author_id = auth.uid())
        )
    );

CREATE POLICY "lessons_insert_author"
    ON lessons FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = lessons.course_id
              AND courses.author_id = auth.uid()
        )
    );

CREATE POLICY "lessons_update_author"
    ON lessons FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = lessons.course_id
              AND courses.author_id = auth.uid()
        )
    );

CREATE POLICY "lessons_delete_author"
    ON lessons FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = lessons.course_id
              AND courses.author_id = auth.uid()
        )
    );

-- Rebuild content_blocks policies now that lessons no longer join chapters.
DROP POLICY IF EXISTS "blocks_select_via_course" ON content_blocks;
DROP POLICY IF EXISTS "blocks_insert_author" ON content_blocks;
DROP POLICY IF EXISTS "blocks_update_author" ON content_blocks;
DROP POLICY IF EXISTS "blocks_delete_author" ON content_blocks;

CREATE POLICY "blocks_select_via_course"
    ON content_blocks FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM lessons
            JOIN courses ON courses.id = lessons.course_id
            WHERE lessons.id = content_blocks.lesson_id
              AND (courses.status = 'published' OR courses.author_id = auth.uid())
        )
    );

CREATE POLICY "blocks_insert_author"
    ON content_blocks FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM lessons
            JOIN courses ON courses.id = lessons.course_id
            WHERE lessons.id = content_blocks.lesson_id
              AND courses.author_id = auth.uid()
        )
    );

CREATE POLICY "blocks_update_author"
    ON content_blocks FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM lessons
            JOIN courses ON courses.id = lessons.course_id
            WHERE lessons.id = content_blocks.lesson_id
              AND courses.author_id = auth.uid()
        )
    );

CREATE POLICY "blocks_delete_author"
    ON content_blocks FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM lessons
            JOIN courses ON courses.id = lessons.course_id
            WHERE lessons.id = content_blocks.lesson_id
              AND courses.author_id = auth.uid()
        )
    );

-- Keep latest publish behavior: update content_json only when content_blocks exist.
CREATE OR REPLACE FUNCTION publish_course(p_course_id UUID)
RETURNS VOID AS $$
DECLARE
    v_lesson      RECORD;
    v_blocks      JSONB;
    v_block_count INTEGER;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM courses WHERE id = p_course_id AND author_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    FOR v_lesson IN
        SELECT l.id AS lesson_id
        FROM lessons l
        WHERE l.course_id = p_course_id
    LOOP
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
    END LOOP;

    UPDATE courses
    SET status       = 'published',
        published_at = NOW(),
        updated_at   = NOW()
    WHERE id = p_course_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE lessons DROP COLUMN IF EXISTS chapter_id;

DROP TABLE IF EXISTS chapters;
