DO $$
BEGIN
  CREATE TYPE public.viewer_analytics_event_type AS ENUM ('course_view', 'lesson_started');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS public.course_analytics_baselines (
  course_id UUID PRIMARY KEY REFERENCES public.courses (id) ON DELETE CASCADE,
  seeded_view_count INTEGER NOT NULL DEFAULT 0 CHECK (seeded_view_count >= 0),
  seeded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.viewer_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses (id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons (id) ON DELETE CASCADE,
  event_type public.viewer_analytics_event_type NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (event_type = 'course_view' AND lesson_id IS NULL)
    OR (event_type = 'lesson_started' AND lesson_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_course_analytics_baselines_seeded_at
  ON public.course_analytics_baselines (seeded_at DESC);

CREATE INDEX IF NOT EXISTS idx_viewer_analytics_events_course
  ON public.viewer_analytics_events (course_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_viewer_analytics_events_actor
  ON public.viewer_analytics_events (actor_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_viewer_analytics_events_type
  ON public.viewer_analytics_events (event_type, occurred_at DESC);

ALTER TABLE public.course_analytics_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viewer_analytics_events ENABLE ROW LEVEL SECURITY;

INSERT INTO public.course_analytics_baselines (course_id, seeded_view_count, seeded_at)
SELECT
  c.id,
  COALESCE(COUNT(e.id), 0)::INTEGER,
  NOW()
FROM public.courses c
LEFT JOIN public.enrollments e
  ON e.course_id = c.id
GROUP BY c.id
ON CONFLICT (course_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.track_viewer_analytics_event(
  p_event_type public.viewer_analytics_event_type,
  p_course_id UUID,
  p_lesson_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_course_author_id UUID;
  v_course_status public.course_status;
  v_lesson_course_id UUID;
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT author_id, status
  INTO v_course_author_id, v_course_status
  FROM public.courses
  WHERE id = p_course_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_actor_id = v_course_author_id THEN
    RETURN FALSE;
  END IF;

  IF v_course_status <> 'published'::public.course_status THEN
    RETURN FALSE;
  END IF;

  IF p_event_type = 'lesson_started'::public.viewer_analytics_event_type THEN
    IF p_lesson_id IS NULL THEN
      RETURN FALSE;
    END IF;

    SELECT course_id
    INTO v_lesson_course_id
    FROM public.lessons
    WHERE id = p_lesson_id;

    IF v_lesson_course_id IS DISTINCT FROM p_course_id THEN
      RETURN FALSE;
    END IF;
  ELSE
    p_lesson_id := NULL;
  END IF;

  INSERT INTO public.viewer_analytics_events (
    actor_id,
    course_id,
    lesson_id,
    event_type
  )
  VALUES (
    v_actor_id,
    p_course_id,
    p_lesson_id,
    p_event_type
  );

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_author_dashboard_analytics(
  p_days INTEGER DEFAULT 7,
  p_months INTEGER DEFAULT 6
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id UUID := auth.uid();
  v_days INTEGER := GREATEST(COALESCE(p_days, 7), 1);
  v_months INTEGER := GREATEST(COALESCE(p_months, 6), 1);
  v_payload JSONB;
BEGIN
  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  WITH course_scope AS (
    SELECT
      c.id,
      c.status,
      c.updated_at
    FROM public.courses c
    WHERE c.author_id = v_author_id
  ),
  lesson_scope AS (
    SELECT
      l.id,
      l.course_id
    FROM public.lessons l
    JOIN course_scope cs
      ON cs.id = l.course_id
  ),
  bounds AS (
    SELECT
      CURRENT_DATE::DATE AS today,
      (CURRENT_DATE - (v_days - 1) * INTERVAL '1 day')::DATE AS current_start_date,
      (CURRENT_DATE - v_days * INTERVAL '1 day')::DATE AS previous_end_date,
      (CURRENT_DATE - ((v_days * 2) - 1) * INTERVAL '1 day')::DATE AS previous_start_date,
      date_trunc('month', CURRENT_DATE)::DATE AS current_month_start
  ),
  baseline_views AS (
    SELECT
      cs.id AS course_id,
      COALESCE(b.seeded_view_count, 0)::INTEGER AS seeded_view_count
    FROM course_scope cs
    LEFT JOIN public.course_analytics_baselines b
      ON b.course_id = cs.id
  ),
  course_view_events AS (
    SELECT
      e.course_id,
      COUNT(*)::INTEGER AS event_views,
      MAX(e.occurred_at) AS last_view_at
    FROM public.viewer_analytics_events e
    JOIN course_scope cs
      ON cs.id = e.course_id
    WHERE e.event_type = 'course_view'::public.viewer_analytics_event_type
    GROUP BY e.course_id
  ),
  lesson_start_events AS (
    SELECT
      e.course_id,
      MAX(e.occurred_at) AS last_started_at
    FROM public.viewer_analytics_events e
    JOIN course_scope cs
      ON cs.id = e.course_id
    WHERE e.event_type = 'lesson_started'::public.viewer_analytics_event_type
    GROUP BY e.course_id
  ),
  student_counts AS (
    SELECT
      cs.id AS course_id,
      COUNT(DISTINCT e.user_id)::INTEGER AS students,
      MAX(e.started_at) AS last_enrollment_at
    FROM course_scope cs
    LEFT JOIN public.enrollments e
      ON e.course_id = cs.id
     AND e.user_id <> v_author_id
    GROUP BY cs.id
  ),
  comment_counts AS (
    SELECT
      cs.id AS course_id,
      COUNT(cf.id)::INTEGER AS comments
    FROM course_scope cs
    LEFT JOIN public.course_feedback cf
      ON cf.course_id = cs.id
     AND NULLIF(BTRIM(COALESCE(cf.comment, '')), '') IS NOT NULL
    GROUP BY cs.id
  ),
  course_completion_totals AS (
    SELECT
      ls.course_id,
      COALESCE(SUM(lc.correct_count), 0)::INTEGER AS correct_total,
      COALESCE(SUM(lc.total_count), 0)::INTEGER AS total_total,
      COALESCE(SUM(COALESCE(lc.time_spent_seconds, 0)), 0)::INTEGER AS study_seconds,
      MAX(lc.completed_at) AS last_completion_at
    FROM lesson_scope ls
    LEFT JOIN public.lesson_completions lc
      ON lc.lesson_id = ls.id
     AND lc.user_id <> v_author_id
    GROUP BY ls.course_id
  ),
  course_metrics AS (
    SELECT
      cs.id AS course_id,
      cs.status,
      cs.updated_at,
      COALESCE(bv.seeded_view_count, 0) + COALESCE(cve.event_views, 0) AS views,
      COALESCE(sc.students, 0) AS students,
      COALESCE(cc.comments, 0) AS comments,
      CASE
        WHEN COALESCE(cct.total_total, 0) > 0
          THEN ROUND(cct.correct_total::NUMERIC / cct.total_total::NUMERIC, 4)
        ELSE 0::NUMERIC
      END AS completion_rate,
      NULLIF(
        GREATEST(
          EXTRACT(EPOCH FROM cs.updated_at),
          COALESCE(EXTRACT(EPOCH FROM cve.last_view_at), 0),
          COALESCE(EXTRACT(EPOCH FROM lse.last_started_at), 0),
          COALESCE(EXTRACT(EPOCH FROM sc.last_enrollment_at), 0),
          COALESCE(EXTRACT(EPOCH FROM cct.last_completion_at), 0)
        ),
        0
      ) AS last_activity_epoch
    FROM course_scope cs
    LEFT JOIN baseline_views bv
      ON bv.course_id = cs.id
    LEFT JOIN course_view_events cve
      ON cve.course_id = cs.id
    LEFT JOIN lesson_start_events lse
      ON lse.course_id = cs.id
    LEFT JOIN student_counts sc
      ON sc.course_id = cs.id
    LEFT JOIN comment_counts cc
      ON cc.course_id = cs.id
    LEFT JOIN course_completion_totals cct
      ON cct.course_id = cs.id
  ),
  recent_activity_users AS (
    SELECT DISTINCT user_id
    FROM (
      SELECT e.actor_id AS user_id
      FROM public.viewer_analytics_events e
      JOIN course_scope cs
        ON cs.id = e.course_id
      WHERE e.occurred_at >= NOW() - make_interval(days => v_days)

      UNION ALL

      SELECT e.user_id
      FROM public.enrollments e
      JOIN course_scope cs
        ON cs.id = e.course_id
      WHERE e.started_at >= NOW() - make_interval(days => v_days)

      UNION ALL

      SELECT lc.user_id
      FROM public.lesson_completions lc
      JOIN lesson_scope ls
        ON ls.id = lc.lesson_id
      WHERE lc.completed_at >= NOW() - make_interval(days => v_days)
    ) recent
    WHERE recent.user_id <> v_author_id
  ),
  window_completion AS (
    SELECT
      CASE
        WHEN COALESCE(SUM(current_window.total_count), 0) > 0
          THEN SUM(current_window.correct_count)::NUMERIC / SUM(current_window.total_count)::NUMERIC
        ELSE 0::NUMERIC
      END AS current_rate,
      CASE
        WHEN COALESCE(SUM(previous_window.total_count), 0) > 0
          THEN SUM(previous_window.correct_count)::NUMERIC / SUM(previous_window.total_count)::NUMERIC
        ELSE 0::NUMERIC
      END AS previous_rate
    FROM (
      SELECT lc.correct_count, lc.total_count
      FROM public.lesson_completions lc
      JOIN lesson_scope ls
        ON ls.id = lc.lesson_id
      JOIN bounds b
        ON lc.completed_at::DATE BETWEEN b.current_start_date AND b.today
      WHERE lc.user_id <> v_author_id
    ) current_window
    FULL OUTER JOIN (
      SELECT lc.correct_count, lc.total_count
      FROM public.lesson_completions lc
      JOIN lesson_scope ls
        ON ls.id = lc.lesson_id
      JOIN bounds b
        ON lc.completed_at::DATE BETWEEN b.previous_start_date AND b.previous_end_date
      WHERE lc.user_id <> v_author_id
    ) previous_window
      ON FALSE
  ),
  home_days AS (
    SELECT gs::DATE AS day
    FROM bounds b,
         generate_series(
           b.current_start_date,
           b.today,
           INTERVAL '1 day'
         ) gs
  ),
  home_completion_raw AS (
    SELECT
      lc.completed_at::DATE AS day,
      COALESCE(SUM(lc.correct_count), 0)::INTEGER AS correct_total,
      COALESCE(SUM(lc.total_count), 0)::INTEGER AS total_total
    FROM public.lesson_completions lc
    JOIN lesson_scope ls
      ON ls.id = lc.lesson_id
    JOIN bounds b
      ON lc.completed_at::DATE BETWEEN b.current_start_date AND b.today
    WHERE lc.user_id <> v_author_id
    GROUP BY lc.completed_at::DATE
  ),
  home_completion_series AS (
    SELECT
      hd.day,
      CASE
        WHEN COALESCE(hcr.total_total, 0) > 0
          THEN ROUND(hcr.correct_total::NUMERIC / hcr.total_total::NUMERIC, 4)
        ELSE 0::NUMERIC
      END AS completion_rate
    FROM home_days hd
    LEFT JOIN home_completion_raw hcr
      ON hcr.day = hd.day
    ORDER BY hd.day
  ),
  month_series AS (
    SELECT gs::DATE AS month_start
    FROM bounds b,
         generate_series(
           (b.current_month_start - ((v_months - 1) * INTERVAL '1 month'))::DATE,
           b.current_month_start,
           INTERVAL '1 month'
         ) gs
  ),
  month_activity_users AS (
    SELECT
      activity.month_start,
      COUNT(DISTINCT activity.user_id)::INTEGER AS active_learners
    FROM (
      SELECT DISTINCT
        date_trunc('month', e.occurred_at)::DATE AS month_start,
        e.actor_id AS user_id
      FROM public.viewer_analytics_events e
      JOIN course_scope cs
        ON cs.id = e.course_id

      UNION

      SELECT DISTINCT
        date_trunc('month', e.started_at)::DATE AS month_start,
        e.user_id
      FROM public.enrollments e
      JOIN course_scope cs
        ON cs.id = e.course_id

      UNION

      SELECT DISTINCT
        date_trunc('month', lc.completed_at)::DATE AS month_start,
        lc.user_id
      FROM public.lesson_completions lc
      JOIN lesson_scope ls
        ON ls.id = lc.lesson_id
    ) activity
    WHERE activity.user_id <> v_author_id
    GROUP BY activity.month_start
  ),
  month_completion_raw AS (
    SELECT
      date_trunc('month', lc.completed_at)::DATE AS month_start,
      COALESCE(SUM(lc.correct_count), 0)::INTEGER AS correct_total,
      COALESCE(SUM(lc.total_count), 0)::INTEGER AS total_total
    FROM public.lesson_completions lc
    JOIN lesson_scope ls
      ON ls.id = lc.lesson_id
    WHERE lc.user_id <> v_author_id
    GROUP BY date_trunc('month', lc.completed_at)::DATE
  ),
  monthly_activity_completion AS (
    SELECT
      ms.month_start,
      COALESCE(mau.active_learners, 0) AS active_learners,
      CASE
        WHEN COALESCE(mcr.total_total, 0) > 0
          THEN ROUND(mcr.correct_total::NUMERIC / mcr.total_total::NUMERIC, 4)
        ELSE 0::NUMERIC
      END AS completion_rate
    FROM month_series ms
    LEFT JOIN month_activity_users mau
      ON mau.month_start = ms.month_start
    LEFT JOIN month_completion_raw mcr
      ON mcr.month_start = ms.month_start
    ORDER BY ms.month_start
  ),
  summary AS (
    SELECT jsonb_build_object(
      'weekly_learners', COALESCE((SELECT COUNT(*)::INTEGER FROM recent_activity_users), 0),
      'total_study_hours', COALESCE((
        SELECT ROUND(COALESCE(SUM(cct.study_seconds), 0) / 3600.0)::INTEGER
        FROM course_completion_totals cct
      ), 0),
      'current_completion_rate', COALESCE((SELECT ROUND(current_rate, 4) FROM window_completion), 0),
      'completion_delta_pct', COALESCE((
        SELECT CASE
          WHEN previous_rate = 0::NUMERIC THEN ROUND(current_rate * 100, 1)
          ELSE ROUND(((current_rate - previous_rate) / previous_rate) * 100, 1)
        END
        FROM window_completion
      ), 0),
      'published_viewers', COALESCE((
        SELECT SUM(cm.views)::INTEGER
        FROM course_metrics cm
        WHERE cm.status = 'published'::public.course_status
      ), 0),
      'average_completion_rate', COALESCE((
        SELECT ROUND(
          COALESCE(SUM(cct.correct_total), 0)::NUMERIC
          / NULLIF(COALESCE(SUM(cct.total_total), 0), 0)::NUMERIC,
          4
        )
        FROM course_completion_totals cct
        JOIN course_scope cs
          ON cs.id = cct.course_id
        WHERE cs.status = 'published'::public.course_status
      ), 0)
    ) AS data
  )
  SELECT jsonb_build_object(
    'summary', COALESCE((SELECT data FROM summary), '{}'::JSONB),
    'home_daily_completion', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', hcs.day,
          'completion_rate', hcs.completion_rate
        )
        ORDER BY hcs.day
      )
      FROM home_completion_series hcs
    ), '[]'::JSONB),
    'monthly_activity_completion', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'month_start', mac.month_start,
          'active_learners', mac.active_learners,
          'completion_rate', mac.completion_rate
        )
        ORDER BY mac.month_start
      )
      FROM monthly_activity_completion mac
    ), '[]'::JSONB),
    'course_metrics', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'course_id', cm.course_id,
          'views', cm.views,
          'students', cm.students,
          'comments', cm.comments,
          'completion_rate', cm.completion_rate,
          'last_activity_at',
          CASE
            WHEN cm.last_activity_epoch IS NULL THEN NULL
            ELSE to_timestamp(cm.last_activity_epoch)
          END
        )
        ORDER BY cm.views DESC, cm.students DESC, cm.completion_rate DESC, cm.updated_at DESC
      )
      FROM course_metrics cm
    ), '[]'::JSONB)
  )
  INTO v_payload;

  RETURN COALESCE(v_payload, jsonb_build_object(
    'summary', jsonb_build_object(
      'weekly_learners', 0,
      'total_study_hours', 0,
      'current_completion_rate', 0,
      'completion_delta_pct', 0,
      'published_viewers', 0,
      'average_completion_rate', 0
    ),
    'home_daily_completion', '[]'::JSONB,
    'monthly_activity_completion', '[]'::JSONB,
    'course_metrics', '[]'::JSONB
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_viewer_analytics_event(
  public.viewer_analytics_event_type,
  UUID,
  UUID
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_author_dashboard_analytics(INTEGER, INTEGER)
TO authenticated;
