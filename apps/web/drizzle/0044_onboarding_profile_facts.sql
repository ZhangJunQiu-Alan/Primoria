WITH source AS (
  SELECT
    owner_id,
    'fact_ob_' || substr(md5(owner_id || ':learning_goal'), 1, 20) AS id,
    'Wants to learn: ' || trim(learning_goal) AS text,
    jsonb_build_array(jsonb_build_object(
      'lessonId', NULL,
      'eventIds', jsonb_build_array('onboarding:learning_goal'),
      'at', now()::text
    )) AS evidence
  FROM learner_profiles
  WHERE nullif(trim(learning_goal), '') IS NOT NULL
)
INSERT INTO learner_facts (
  id, owner_id, text, category, status, confidence, evidence, occurrences,
  source_lesson_id, last_seen_at, created_at, updated_at
)
SELECT id, owner_id, text, 'goal', 'active', 1, evidence, 1, NULL, now(), now(), now()
FROM source
ON CONFLICT (id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  status = 'active',
  confidence = 1,
  evidence = excluded.evidence,
  last_seen_at = now(),
  updated_at = now();

WITH source AS (
  SELECT
    owner_id,
    'fact_ob_' || substr(md5(owner_id || ':knowledge_background'), 1, 20) AS id,
    'Knowledge background: ' || CASE knowledge_background
      WHEN 'high_school' THEN 'High school'
      WHEN 'undergraduate' THEN 'University'
      WHEN 'graduate' THEN 'Graduate'
    END AS text,
    jsonb_build_array(jsonb_build_object(
      'lessonId', NULL,
      'eventIds', jsonb_build_array('onboarding:knowledge_background'),
      'at', now()::text
    )) AS evidence
  FROM learner_profiles
  WHERE knowledge_background IN ('high_school', 'undergraduate', 'graduate')
)
INSERT INTO learner_facts (
  id, owner_id, text, category, status, confidence, evidence, occurrences,
  source_lesson_id, last_seen_at, created_at, updated_at
)
SELECT id, owner_id, text, 'prior_knowledge', 'active', 1, evidence, 1, NULL, now(), now(), now()
FROM source
ON CONFLICT (id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  status = 'active',
  confidence = 1,
  evidence = excluded.evidence,
  last_seen_at = now(),
  updated_at = now();

WITH source AS (
  SELECT
    owner_id,
    'fact_ob_' || substr(md5(owner_id || ':tutor_style'), 1, 20) AS id,
    CASE tutor_style
      WHEN 'socratic' THEN 'Selected Socrates as tutor; prefers guiding questions before direct answers.'
      WHEN 'feynman' THEN 'Selected Richard Feynman as tutor; prefers intuition and analogies before formal details.'
      WHEN 'euclid' THEN 'Selected Euclid as tutor; prefers precise definitions and structured reasoning.'
    END AS text,
    jsonb_build_array(jsonb_build_object(
      'lessonId', NULL,
      'eventIds', jsonb_build_array('onboarding:tutor_style'),
      'at', now()::text
    )) AS evidence
  FROM learner_profiles
  WHERE tutor_style IN ('socratic', 'feynman', 'euclid')
)
INSERT INTO learner_facts (
  id, owner_id, text, category, status, confidence, evidence, occurrences,
  source_lesson_id, last_seen_at, created_at, updated_at
)
SELECT id, owner_id, text, 'preference', 'active', 1, evidence, 1, NULL, now(), now(), now()
FROM source
ON CONFLICT (id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  status = 'active',
  confidence = 1,
  evidence = excluded.evidence,
  last_seen_at = now(),
  updated_at = now();
