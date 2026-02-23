-- Add lesson-level lock fields and migrate chapter-level lock semantics.
-- Target model:
--   - lessons carry lock state
--   - chapters remain grouping only

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'lesson_unlock_type'
    ) THEN
        CREATE TYPE lesson_unlock_type AS ENUM (
            'none',
            'prerequisite',
            'paid',
            'prerequisite_or_paid',
            'prerequisite_and_paid'
        );
    END IF;
END $$;

ALTER TABLE lessons
    ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS unlock_type lesson_unlock_type NOT NULL DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS prerequisite_lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS paywall_product_id TEXT;

CREATE INDEX IF NOT EXISTS idx_lessons_prerequisite
    ON lessons(prerequisite_lesson_id);

CREATE INDEX IF NOT EXISTS idx_lessons_unlock
    ON lessons(is_locked, unlock_type);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'lessons_prerequisite_not_self'
    ) THEN
        ALTER TABLE lessons
            ADD CONSTRAINT lessons_prerequisite_not_self
            CHECK (
                prerequisite_lesson_id IS NULL
                OR prerequisite_lesson_id <> id
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'lessons_unlock_fields_consistent'
    ) THEN
        ALTER TABLE lessons
            ADD CONSTRAINT lessons_unlock_fields_consistent
            CHECK (
                (
                    is_locked = false
                    AND unlock_type = 'none'
                    AND prerequisite_lesson_id IS NULL
                    AND paywall_product_id IS NULL
                )
                OR
                (
                    is_locked = true
                    AND (
                        unlock_type = 'none'
                        OR (unlock_type = 'prerequisite' AND prerequisite_lesson_id IS NOT NULL)
                        OR (unlock_type = 'paid' AND paywall_product_id IS NOT NULL)
                        OR (
                            unlock_type = 'prerequisite_or_paid'
                            AND prerequisite_lesson_id IS NOT NULL
                            AND paywall_product_id IS NOT NULL
                        )
                        OR (
                            unlock_type = 'prerequisite_and_paid'
                            AND prerequisite_lesson_id IS NOT NULL
                            AND paywall_product_id IS NOT NULL
                        )
                    )
                )
            );
    END IF;
END $$;

-- Backfill from chapter lock:
-- - chapter unlocked  -> lesson unlocked
-- - chapter locked    -> lesson locked by prerequisite(previous lesson in course order)
-- - first lesson in a course stays unlocked (no prerequisite available)
WITH ordered_lessons AS (
    SELECT
        l.id AS lesson_id,
        ch.is_locked AS chapter_locked,
        lag(l.id) OVER (
            PARTITION BY ch.course_id
            ORDER BY ch.sort_key, l.sort_key, l.id
        ) AS prev_lesson_id
    FROM lessons l
    JOIN chapters ch ON ch.id = l.chapter_id
)
UPDATE lessons l
SET
    is_locked = CASE
        WHEN ol.chapter_locked = true AND ol.prev_lesson_id IS NOT NULL THEN true
        ELSE false
    END,
    unlock_type = CASE
        WHEN ol.chapter_locked = true AND ol.prev_lesson_id IS NOT NULL
            THEN 'prerequisite'::lesson_unlock_type
        ELSE 'none'::lesson_unlock_type
    END,
    prerequisite_lesson_id = CASE
        WHEN ol.chapter_locked = true AND ol.prev_lesson_id IS NOT NULL
            THEN ol.prev_lesson_id
        ELSE NULL
    END,
    paywall_product_id = NULL
FROM ordered_lessons ol
WHERE l.id = ol.lesson_id;

