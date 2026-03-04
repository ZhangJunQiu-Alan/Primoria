-- Remove lesson grouping columns and rely on lessons.sort_key for ordering.
-- This keeps lesson ordering stable while simplifying schema.

DROP INDEX IF EXISTS idx_lessons_course_group_sort;

ALTER TABLE lessons
    DROP COLUMN IF EXISTS group_title,
    DROP COLUMN IF EXISTS group_sort_key;

CREATE INDEX IF NOT EXISTS idx_lessons_course_sort
    ON lessons(course_id, sort_key, id);
