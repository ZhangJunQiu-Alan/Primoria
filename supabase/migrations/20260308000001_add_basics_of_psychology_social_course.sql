-- Add a new published Social course: Basics of Psychology.
-- Idempotent: safe to run multiple times.

WITH intro_social AS (
    SELECT author_id, subject_id, published_at
    FROM courses
    WHERE slug = 'intro-to-psychology'
    LIMIT 1
),
resolved_author AS (
    SELECT COALESCE(
        (
            SELECT author_id
            FROM intro_social
            LIMIT 1
        ),
        (
            SELECT id
            FROM profiles
            WHERE id = '00000000-0000-0000-0000-000000000001'
        ),
        (
            SELECT id
            FROM profiles
            ORDER BY created_at NULLS LAST, id
            LIMIT 1
        )
    ) AS id
),
resolved_social AS (
    SELECT COALESCE(
        (
            SELECT subject_id
            FROM intro_social
            LIMIT 1
        ),
        (
            SELECT id
            FROM subjects
            WHERE lower(name) = 'social'
            ORDER BY id
            LIMIT 1
        )
    ) AS id
),
upsert_course AS (
    INSERT INTO courses (
        id,
        author_id,
        subject_id,
        title,
        slug,
        description,
        difficulty_level,
        status,
        estimated_minutes,
        tags,
        price_tier,
        published_at
    )
    SELECT
        '20000000-0000-0000-0000-000000000009',
        a.id,
        s.id,
        'Basics of Psychology',
        'basics-of-psychology',
        'Learn the core ideas of psychology, including cognition, emotion, and social behavior.',
        'beginner',
        'published',
        75,
        ARRAY['psychology', 'social', 'mind', 'behavior'],
        'free',
        COALESCE(i.published_at - INTERVAL '1 minute', NOW())
    FROM resolved_author a
    CROSS JOIN resolved_social s
    LEFT JOIN intro_social i ON true
    WHERE a.id IS NOT NULL
      AND s.id IS NOT NULL
    ON CONFLICT (slug) DO UPDATE SET
        subject_id = EXCLUDED.subject_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        difficulty_level = EXCLUDED.difficulty_level,
        status = EXCLUDED.status,
        estimated_minutes = EXCLUDED.estimated_minutes,
        tags = EXCLUDED.tags,
        price_tier = EXCLUDED.price_tier,
        published_at = EXCLUDED.published_at,
        updated_at = NOW()
    RETURNING id
)
INSERT INTO lessons (
    id,
    course_id,
    title,
    type,
    sort_key,
    xp_reward,
    duration_seconds,
    content_json,
    is_locked,
    unlock_type,
    prerequisite_lesson_id,
    paywall_product_id
)
SELECT
    '40000000-0000-0000-0000-000000000020',
    c.id,
    'Basics of Psychology',
    'interactive',
    1000,
    10,
    240,
    '[
      {
        "block_id": "c4000000-0001-0000-0000-000000000001",
        "type": "info_card",
        "content": {
          "title": "What is Psychology?",
          "body": "Psychology is the scientific study of mind and behavior. It explores how people think, feel, and act in everyday life."
        },
        "config": {},
        "is_interactive": false,
        "sort_key": 1000
      },
      {
        "block_id": "c4000000-0001-0000-0000-000000000002",
        "type": "multiple_choice",
        "content": {
          "title": "Core Goal",
          "body": "What does psychology mainly study?"
        },
        "config": {
          "options": ["Planet motion", "Mind and behavior", "Computer hardware", "Chemical reactions"],
          "correct_index": 1,
          "success_msg": "Correct. Psychology focuses on mental processes and behavior.",
          "fail_msg": "Try again. Psychology is about mind and behavior."
        },
        "is_interactive": true,
        "sort_key": 2000
      }
    ]'::jsonb,
    false,
    'none',
    NULL,
    NULL
FROM upsert_course c
ON CONFLICT (id) DO UPDATE SET
    course_id = EXCLUDED.course_id,
    title = EXCLUDED.title,
    type = EXCLUDED.type,
    sort_key = EXCLUDED.sort_key,
    xp_reward = EXCLUDED.xp_reward,
    duration_seconds = EXCLUDED.duration_seconds,
    content_json = EXCLUDED.content_json,
    is_locked = EXCLUDED.is_locked,
    unlock_type = EXCLUDED.unlock_type,
    prerequisite_lesson_id = EXCLUDED.prerequisite_lesson_id,
    paywall_product_id = EXCLUDED.paywall_product_id,
    updated_at = NOW();

INSERT INTO lessons (
    id,
    course_id,
    title,
    type,
    sort_key,
    xp_reward,
    duration_seconds,
    content_json,
    is_locked,
    unlock_type,
    prerequisite_lesson_id,
    paywall_product_id
)
SELECT
    '40000000-0000-0000-0000-000000000021',
    c.id,
    'Social Influence and Behavior',
    'interactive',
    2000,
    12,
    260,
    '[
      {
        "block_id": "c5000000-0001-0000-0000-000000000001",
        "type": "info_card",
        "content": {
          "title": "Why Social Context Matters",
          "body": "People often adjust their actions based on groups, norms, and relationships. Social influence shapes decisions, attitudes, and behavior."
        },
        "config": {},
        "is_interactive": false,
        "sort_key": 1000
      },
      {
        "block_id": "c5000000-0001-0000-0000-000000000002",
        "type": "multiple_choice",
        "content": {
          "title": "Social Norms",
          "body": "A social norm is best described as:"
        },
        "config": {
          "options": ["A private thought", "A law in physics", "A shared expectation in a group", "A random event"],
          "correct_index": 2,
          "success_msg": "Correct. Norms are shared expectations that guide behavior.",
          "fail_msg": "Not quite. Norms are shared expectations in groups."
        },
        "is_interactive": true,
        "sort_key": 2000
      }
    ]'::jsonb,
    true,
    'prerequisite',
    '40000000-0000-0000-0000-000000000020',
    NULL
FROM courses c
WHERE c.slug = 'basics-of-psychology'
ON CONFLICT (id) DO UPDATE SET
    course_id = EXCLUDED.course_id,
    title = EXCLUDED.title,
    type = EXCLUDED.type,
    sort_key = EXCLUDED.sort_key,
    xp_reward = EXCLUDED.xp_reward,
    duration_seconds = EXCLUDED.duration_seconds,
    content_json = EXCLUDED.content_json,
    is_locked = EXCLUDED.is_locked,
    unlock_type = EXCLUDED.unlock_type,
    prerequisite_lesson_id = EXCLUDED.prerequisite_lesson_id,
    paywall_product_id = EXCLUDED.paywall_product_id,
    updated_at = NOW();
