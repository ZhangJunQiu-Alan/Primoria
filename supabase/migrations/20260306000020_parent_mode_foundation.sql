-- ============================================================
-- Parent Mode v1 backend foundation
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role'
      AND e.enumlabel = 'parent'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'parent';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS parent_child_binding_codes (
  child_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_child_binding_codes_code
  ON parent_child_binding_codes (code);

CREATE TABLE IF NOT EXISTS parent_child_links (
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (parent_id, child_id),
  CONSTRAINT parent_child_links_no_self_link CHECK (parent_id <> child_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_child_links_parent_id
  ON parent_child_links (parent_id);

CREATE INDEX IF NOT EXISTS idx_parent_child_links_child_id
  ON parent_child_links (child_id);

ALTER TABLE parent_child_binding_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_child_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "binding_codes_child_all" ON parent_child_binding_codes;
CREATE POLICY "binding_codes_child_all"
  ON parent_child_binding_codes
  FOR ALL
  USING (auth.uid() = child_id)
  WITH CHECK (auth.uid() = child_id);

DROP POLICY IF EXISTS "parent_child_links_parent_select" ON parent_child_links;
CREATE POLICY "parent_child_links_parent_select"
  ON parent_child_links
  FOR SELECT
  USING (auth.uid() = parent_id);

DROP POLICY IF EXISTS "parent_child_links_child_select" ON parent_child_links;
CREATE POLICY "parent_child_links_child_select"
  ON parent_child_links
  FOR SELECT
  USING (auth.uid() = child_id);

CREATE OR REPLACE FUNCTION public.is_parent_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND role = 'parent'::user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.generate_child_binding_code(
  p_ttl_minutes INTEGER DEFAULT 30
)
RETURNS TABLE(code TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_child_id UUID := auth.uid();
  v_code TEXT;
  v_expires_at TIMESTAMPTZ;
  v_ttl INTEGER;
BEGIN
  IF v_child_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF public.is_parent_user(v_child_id) THEN
    RAISE EXCEPTION 'Only child/non-parent users can generate binding codes';
  END IF;

  v_ttl := GREATEST(COALESCE(p_ttl_minutes, 30), 1);

  v_code := UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8));
  v_expires_at := NOW() + make_interval(mins => v_ttl);

  INSERT INTO public.parent_child_binding_codes (child_id, code, expires_at)
  VALUES (v_child_id, v_code, v_expires_at)
  ON CONFLICT (child_id)
  DO UPDATE SET
    code = EXCLUDED.code,
    expires_at = EXCLUDED.expires_at,
    updated_at = NOW();

  RETURN QUERY SELECT v_code, v_expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.bind_child_with_code(
  p_code TEXT
)
RETURNS TABLE(parent_id UUID, child_id UUID, created BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id UUID := auth.uid();
  v_child_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_inserted INTEGER;
BEGIN
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_parent_user(v_parent_id) THEN
    RAISE EXCEPTION 'Only parent users can bind children';
  END IF;

  IF p_code IS NULL OR LENGTH(TRIM(p_code)) = 0 THEN
    RAISE EXCEPTION 'Binding code is required';
  END IF;

  SELECT bc.child_id, bc.expires_at
  INTO v_child_id, v_expires_at
  FROM public.parent_child_binding_codes bc
  WHERE bc.code = UPPER(TRIM(p_code));

  IF v_child_id IS NULL THEN
    RAISE EXCEPTION 'Invalid binding code';
  END IF;

  IF v_expires_at <= NOW() THEN
    RAISE EXCEPTION 'Binding code has expired';
  END IF;

  IF v_child_id = v_parent_id THEN
    RAISE EXCEPTION 'Cannot bind yourself';
  END IF;

  INSERT INTO public.parent_child_links(parent_id, child_id)
  VALUES (v_parent_id, v_child_id)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN QUERY
  SELECT v_parent_id, v_child_id, (v_inserted > 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.unbind_child(
  p_child_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id UUID := auth.uid();
  v_deleted INTEGER;
BEGIN
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_parent_user(v_parent_id) THEN
    RAISE EXCEPTION 'Only parent users can unbind children';
  END IF;

  DELETE FROM public.parent_child_links
  WHERE parent_id = v_parent_id
    AND child_id = p_child_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_parent_children_overview()
RETURNS TABLE(
  child_id UUID,
  username TEXT,
  avatar_url TEXT,
  xp_points INTEGER,
  streak_days INTEGER,
  lessons_completed INTEGER,
  courses_completed INTEGER,
  last_active_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id UUID := auth.uid();
BEGIN
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_parent_user(v_parent_id) THEN
    RAISE EXCEPTION 'Only parent users can access parent overview';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    COALESCE(us.total_xp, 0)::INTEGER AS xp_points,
    COALESCE(us.current_streak, 0)::INTEGER AS streak_days,
    COALESCE((
      SELECT COUNT(*)
      FROM public.lesson_completions lc
      WHERE lc.user_id = p.id
    ), 0)::INTEGER AS lessons_completed,
    COALESCE((
      SELECT COUNT(*)
      FROM public.enrollments e
      WHERE e.user_id = p.id
        AND e.status = 'completed'::enrollment_status
    ), 0)::INTEGER AS courses_completed,
    us.last_activity_date::TIMESTAMPTZ AS last_active_at
  FROM public.parent_child_links l
  JOIN public.profiles p ON p.id = l.child_id
  LEFT JOIN public.user_stats us ON us.user_id = p.id
  WHERE l.parent_id = v_parent_id
  ORDER BY p.username;
END;
$$;

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
     AND xt.created_at::DATE = td.day
    GROUP BY td.day
    ORDER BY td.day
  ),
  courses AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'course_id', c.id,
      'title', c.title,
      'status', e.status,
      'progress_percentage', e.progress_percentage,
      'completed_lessons', e.completed_lessons,
      'last_accessed_at', e.last_accessed_at
    ) ORDER BY e.updated_at DESC), '[]'::JSONB) AS data
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

GRANT EXECUTE ON FUNCTION public.generate_child_binding_code(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bind_child_with_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unbind_child(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_children_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_child_report(UUID, INTEGER) TO authenticated;
