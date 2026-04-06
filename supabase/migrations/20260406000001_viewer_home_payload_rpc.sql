CREATE OR REPLACE FUNCTION public.get_viewer_home_payload(
  p_selected_course_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_payload JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  WITH stats_row AS (
    SELECT
      us.current_streak,
      us.longest_streak,
      us.courses_completed,
      us.lessons_completed,
      us.total_xp,
      us.last_activity_date
    FROM public.user_stats us
    WHERE us.user_id = v_user_id
  ),
  total_minutes AS (
    SELECT
      COALESCE(SUM(ROUND(COALESCE(lc.time_spent_seconds, 0) / 60.0)), 0)::INTEGER AS total_study_minutes
    FROM public.lesson_completions lc
    WHERE lc.user_id = v_user_id
  ),
  in_progress_enrollments AS (
    SELECT
      ROW_NUMBER() OVER (
        ORDER BY
          COALESCE(e.last_accessed_at, e.started_at, 'epoch'::timestamptz) DESC,
          COALESCE(e.started_at, 'epoch'::timestamptz) DESC,
          COALESCE(e.progress_bp, 0) DESC,
          e.course_id
      ) AS sort_index,
      e.id,
      e.course_id,
      e.status,
      e.progress_bp,
      e.started_at,
      e.completed_at,
      e.last_accessed_at,
      jsonb_build_object(
        'id', c.id,
        'title', c.title,
        'slug', c.slug,
        'description', c.description,
        'thumbnail_url', c.thumbnail_url,
        'content_language', c.content_language,
        'difficulty_level', c.difficulty_level,
        'estimated_minutes', c.estimated_minutes,
        'tags', COALESCE(to_jsonb(c.tags), '[]'::jsonb),
        'subject_id', c.subject_id,
        'published_at', c.published_at,
        'subjects', jsonb_build_object(
          'id', s.id,
          'name', s.name,
          'color_hex', s.color_hex
        )
      ) AS course_json
    FROM public.enrollments e
    JOIN public.courses c
      ON c.id = e.course_id
    LEFT JOIN public.subjects s
      ON s.id = c.subject_id
    WHERE e.user_id = v_user_id
      AND e.status = 'in_progress'
  ),
  resolved_selection AS (
    SELECT
      COALESCE(
        (
          SELECT ipe.course_id
          FROM in_progress_enrollments ipe
          WHERE ipe.course_id = p_selected_course_id
          LIMIT 1
        ),
        (
          SELECT ipe.course_id
          FROM in_progress_enrollments ipe
          ORDER BY ipe.sort_index
          LIMIT 1
        )
      ) AS course_id
  ),
  selected_course AS (
    SELECT
      c.id,
      jsonb_build_object(
        'id', c.id,
        'title', c.title,
        'slug', c.slug,
        'description', c.description,
        'thumbnail_url', c.thumbnail_url,
        'content_language', c.content_language,
        'difficulty_level', c.difficulty_level,
        'estimated_minutes', c.estimated_minutes,
        'tags', COALESCE(to_jsonb(c.tags), '[]'::jsonb),
        'subject_id', c.subject_id,
        'published_at', c.published_at,
        'subjects', jsonb_build_object(
          'id', s.id,
          'name', s.name,
          'color_hex', s.color_hex
        )
      ) AS course_json
    FROM resolved_selection rs
    JOIN public.courses c
      ON c.id = rs.course_id
    LEFT JOIN public.subjects s
      ON s.id = c.subject_id
  ),
  selected_lessons AS (
    SELECT
      l.id,
      l.title,
      l.sort_key,
      l.xp_reward,
      l.duration_seconds,
      l.is_locked,
      l.unlock_type
    FROM resolved_selection rs
    JOIN public.lessons l
      ON l.course_id = rs.course_id
    ORDER BY l.sort_key
  ),
  selected_completed_lessons AS (
    SELECT
      sl.id AS lesson_id,
      sl.sort_key
    FROM selected_lessons sl
    JOIN public.lesson_completions lc
      ON lc.lesson_id = sl.id
     AND lc.user_id = v_user_id
  ),
  selected_enrollment AS (
    SELECT
      e.id,
      e.course_id,
      e.status,
      e.progress_bp,
      e.started_at,
      e.completed_at,
      e.last_accessed_at
    FROM resolved_selection rs
    JOIN public.enrollments e
      ON e.course_id = rs.course_id
    WHERE e.user_id = v_user_id
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'stats',
    jsonb_build_object(
      'current_streak', COALESCE((SELECT sr.current_streak FROM stats_row sr), 0),
      'longest_streak', COALESCE((SELECT sr.longest_streak FROM stats_row sr), 0),
      'courses_completed', COALESCE((SELECT sr.courses_completed FROM stats_row sr), 0),
      'lessons_completed', COALESCE((SELECT sr.lessons_completed FROM stats_row sr), 0),
      'total_xp', COALESCE((SELECT sr.total_xp FROM stats_row sr), 0),
      'total_study_minutes', COALESCE((SELECT tm.total_study_minutes FROM total_minutes tm), 0),
      'last_activity_date', (SELECT sr.last_activity_date FROM stats_row sr)
    ),
    'in_progress_enrollments',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', ipe.id,
            'course_id', ipe.course_id,
            'status', ipe.status,
            'progress_bp', ipe.progress_bp,
            'started_at', ipe.started_at,
            'completed_at', ipe.completed_at,
            'last_accessed_at', ipe.last_accessed_at,
            'courses', ipe.course_json
          )
          ORDER BY ipe.sort_index
        )
        FROM in_progress_enrollments ipe
      ),
      '[]'::jsonb
    ),
    'resolved_selected_course_id',
    (SELECT rs.course_id FROM resolved_selection rs),
    'selected_course_detail',
    CASE
      WHEN (SELECT rs.course_id FROM resolved_selection rs) IS NULL THEN NULL
      ELSE jsonb_build_object(
        'course',
        (SELECT sc.course_json FROM selected_course sc),
        'lessons',
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', sl.id,
                'title', sl.title,
                'sort_key', sl.sort_key,
                'xp_reward', sl.xp_reward,
                'duration_seconds', sl.duration_seconds,
                'is_locked', sl.is_locked,
                'unlock_type', sl.unlock_type
              )
              ORDER BY sl.sort_key
            )
            FROM selected_lessons sl
          ),
          '[]'::jsonb
        ),
        'completed_lesson_ids',
        COALESCE(
          (
            SELECT jsonb_agg(scl.lesson_id ORDER BY scl.sort_key)
            FROM selected_completed_lessons scl
          ),
          '[]'::jsonb
        ),
        'enrollment',
        (
          SELECT to_jsonb(se)
          FROM selected_enrollment se
        )
      )
    END
  )
  INTO v_payload;

  RETURN COALESCE(v_payload, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_viewer_home_payload(UUID) TO authenticated;
