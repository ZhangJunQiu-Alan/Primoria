-- ============================================================
-- Fix: IOWait spike caused by index-defeating ::DATE cast and
--      missing composite index on xp_transactions.
--
-- Root cause:
--   1. get_parent_child_report used `xt.created_at::DATE = td.day`
--      which prevents PostgreSQL from using the created_at index,
--      causing a Seq Scan on xp_transactions every call.
--   2. complete_lesson_and_award_xp checks (user_id, reference_id,
--      source_type) with only a single-column user_id index.
-- ============================================================

-- 1. Composite index to support complete_lesson_and_award_xp EXISTS check
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_ref_src
    ON xp_transactions (user_id, reference_id, source_type);

-- 2. Composite index to support date-range scans per user
--    (used by get_parent_child_report trend_values CTE)
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_created
    ON xp_transactions (user_id, created_at);

-- 3. Rewrite get_parent_child_report: replace ::DATE cast with a range
--    condition so PostgreSQL can use the new composite index.
CREATE OR REPLACE FUNCTION public.get_parent_child_report(
  p_child_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id UUID := auth.uid();
  v_days INTEGER := GREATEST(COALESCE(p_days, 7), 1);
  v_report JSONB;
BEGIN
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_parent_user(v_parent_id) THEN
    RAISE EXCEPTION 'Only parent users can access child reports';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.parent_child_links l
    WHERE l.parent_id = v_parent_id
      AND l.child_id = p_child_id
  ) THEN
    RAISE EXCEPTION 'Access denied for this child';
  END IF;

  WITH bounds AS (
    SELECT
      (CURRENT_DATE - (v_days - 1) * INTERVAL '1 day')::DATE AS start_date,
      CURRENT_DATE::DATE AS end_date
  ),
  trend_days AS (
    SELECT gs::DATE AS day
    FROM bounds,
         generate_series(
           (SELECT start_date FROM bounds),
           (SELECT end_date FROM bounds),
           INTERVAL '1 day'
         ) gs
  ),
  trend_values AS (
    SELECT
      td.day,
      COALESCE(SUM(xt.amount), 0)::INTEGER AS xp_points
    FROM trend_days td
    LEFT JOIN public.xp_transactions xt
      ON xt.user_id = p_child_id
     -- Use range condition instead of ::DATE cast so the index is usable
     AND xt.created_at >= td.day::TIMESTAMPTZ
     AND xt.created_at <  td.day::TIMESTAMPTZ + INTERVAL '1 day'
    GROUP BY td.day
    ORDER BY td.day
  ),
  courses AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'course_id', c.id,
      'title', c.title,
      'status', e.status,
      'progress_percentage', ROUND(e.progress_bp / 100.0)::INTEGER,
      'completed_lessons', COALESCE((
        SELECT COUNT(*)
        FROM public.lesson_completions lc
        JOIN public.lessons l ON l.id = lc.lesson_id
        WHERE lc.user_id = p_child_id
          AND l.course_id = e.course_id
      ), 0)::INTEGER,
      'last_accessed_at', e.last_accessed_at
    ) ORDER BY COALESCE(e.last_accessed_at, e.completed_at, e.started_at) DESC), '[]'::JSONB) AS data
    FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.user_id = p_child_id
  ),
  recent_lessons AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'lesson_id', lc.lesson_id,
      'lesson_title', l.title,
      'score', lc.score,
      'correct_count', lc.correct_count,
      'total_count', lc.total_count,
      'completed_at', lc.completed_at
    ) ORDER BY lc.completed_at DESC), '[]'::JSONB) AS data
    FROM (
      SELECT *
      FROM public.lesson_completions
      WHERE user_id = p_child_id
      ORDER BY completed_at DESC
      LIMIT 20
    ) lc
    LEFT JOIN public.lessons l ON l.id = lc.lesson_id
  ),
  stats AS (
    SELECT
      COALESCE(us.total_xp, 0)::INTEGER AS total_xp,
      COALESCE(us.current_streak, 0)::INTEGER AS current_streak,
      COALESCE((
        SELECT COUNT(*) FROM public.lesson_completions lc WHERE lc.user_id = p_child_id
      ), 0)::INTEGER AS lessons_completed,
      COALESCE((
        SELECT COUNT(*) FROM public.enrollments e
        WHERE e.user_id = p_child_id
          AND e.status = 'completed'::enrollment_status
      ), 0)::INTEGER AS courses_completed,
      us.last_activity_date::TIMESTAMPTZ AS last_activity_at
    FROM public.profiles p
    LEFT JOIN public.user_stats us ON us.user_id = p.id
    WHERE p.id = p_child_id
  )
  SELECT jsonb_build_object(
    'child_id', p_child_id,
    'days', v_days,
    'stats', COALESCE((SELECT to_jsonb(s) FROM stats s), '{}'::JSONB),
    'activity_trend', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('date', tv.day, 'xp_points', tv.xp_points) ORDER BY tv.day)
      FROM trend_values tv
    ), '[]'::JSONB),
    'courses', (SELECT data FROM courses),
    'recent_lessons', (SELECT data FROM recent_lessons)
  ) INTO v_report;

  RETURN COALESCE(v_report, jsonb_build_object(
    'child_id', p_child_id,
    'days', v_days,
    'stats', '{}'::JSONB,
    'activity_trend', '[]'::JSONB,
    'courses', '[]'::JSONB,
    'recent_lessons', '[]'::JSONB
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_parent_child_report(UUID, INTEGER) TO authenticated;
