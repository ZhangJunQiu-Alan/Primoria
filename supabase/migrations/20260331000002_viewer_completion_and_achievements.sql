-- ============================================================
-- React Viewer completion + achievement cutover
-- ============================================================

CREATE OR REPLACE FUNCTION public.award_viewer_achievements(
  p_user_id UUID,
  p_accuracy_pct INTEGER DEFAULT NULL,
  p_time_spent_seconds INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_streak INTEGER := 0;
  v_lessons_completed INTEGER := 0;
  v_courses_completed INTEGER := 0;
  v_total_xp INTEGER := 0;
  v_following_count INTEGER := 0;
  v_followers_count INTEGER := 0;
  v_completed_daily_task_days INTEGER := 0;
  v_unlocked JSONB := '[]'::JSONB;
BEGIN
  SELECT
    COALESCE(current_streak, 0),
    COALESCE(lessons_completed, 0),
    COALESCE(courses_completed, 0),
    COALESCE(total_xp, 0)
  INTO
    v_current_streak,
    v_lessons_completed,
    v_courses_completed,
    v_total_xp
  FROM public.user_stats
  WHERE user_id = p_user_id;

  SELECT COUNT(*)::INTEGER INTO v_following_count
  FROM public.follows
  WHERE follower_id = p_user_id;

  SELECT COUNT(*)::INTEGER INTO v_followers_count
  FROM public.follows
  WHERE following_id = p_user_id;

  SELECT COUNT(*)::INTEGER INTO v_completed_daily_task_days
  FROM (
    SELECT task_date
    FROM public.daily_tasks
    WHERE user_id = p_user_id
    GROUP BY task_date
    HAVING bool_and(is_completed)
  ) completed_days;

  WITH eligible AS (
    SELECT a.*
    FROM public.achievements a
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.user_achievements ua
      WHERE ua.user_id = p_user_id
        AND ua.achievement_id = a.id
    )
      AND CASE a.slug
        WHEN 'streak_3' THEN v_current_streak >= 3
        WHEN 'streak_7' THEN v_current_streak >= 7
        WHEN 'streak_30' THEN v_current_streak >= 30
        WHEN 'streak_100' THEN v_current_streak >= 100
        WHEN 'first_lesson' THEN v_lessons_completed >= 1
        WHEN 'first_course' THEN v_courses_completed >= 1
        WHEN 'courses_5' THEN v_courses_completed >= 5
        WHEN 'lessons_100' THEN v_lessons_completed >= 100
        WHEN 'courses_50' THEN v_courses_completed >= 50
        WHEN 'perfect_lesson' THEN COALESCE(p_accuracy_pct, -1) = 100
        WHEN 'speed_lesson' THEN COALESCE(p_time_spent_seconds, 0) > 0 AND COALESCE(p_time_spent_seconds, 0) <= 900
        WHEN 'first_follow' THEN v_following_count >= 1
        WHEN 'followers_10' THEN v_followers_count >= 10
        WHEN 'xp_100' THEN v_total_xp >= 100
        WHEN 'xp_500' THEN v_total_xp >= 500
        WHEN 'daily_tasks_30' THEN v_completed_daily_task_days >= 30
        ELSE FALSE
      END
  ),
  inserted AS (
    INSERT INTO public.user_achievements (user_id, achievement_id)
    SELECT p_user_id, id
    FROM eligible
    ON CONFLICT DO NOTHING
    RETURNING achievement_id, earned_at
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'slug', a.slug,
    'name', a.name,
    'description', a.description,
    'category', a.category,
    'rarity', a.rarity,
    'earned_at', inserted.earned_at
  )), '[]'::JSONB)
  INTO v_unlocked
  FROM inserted
  JOIN public.achievements a ON a.id = inserted.achievement_id;

  RETURN v_unlocked;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_lesson_and_award_xp(
  p_lesson_id UUID,
  p_score INTEGER DEFAULT 0,
  p_seconds INTEGER DEFAULT 0,
  p_correct_count INTEGER DEFAULT 0,
  p_total_count INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id UUID;
  v_base_xp INTEGER := 50;
  v_accuracy_xp INTEGER := 0;
  v_streak_xp INTEGER := 0;
  v_first_today_xp INTEGER := 0;
  v_total_xp_award INTEGER := 0;
  v_total_xp_after INTEGER := 0;
  v_already BOOLEAN := FALSE;
  v_streak INTEGER := 0;
  v_accuracy_pct INTEGER := 100;
  v_is_first_today BOOLEAN := FALSE;
  v_total_lessons INTEGER := 0;
  v_completed_lessons INTEGER := 0;
  v_progress_bp INTEGER := 0;
  v_course_completed BOOLEAN := FALSE;
  v_course_already_completed BOOLEAN := FALSE;
  v_unlocked_achievements JSONB := '[]'::JSONB;
BEGIN
  SELECT course_id, COALESCE(xp_reward, 50)
  INTO v_course_id, v_base_xp
  FROM public.lessons
  WHERE id = p_lesson_id;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Lesson not found';
  END IF;

  IF p_total_count > 0 THEN
    v_accuracy_pct := ROUND(p_correct_count::NUMERIC / p_total_count::NUMERIC * 100);
    IF p_correct_count = p_total_count THEN
      v_accuracy_xp := 35;
    ELSIF v_accuracy_pct >= 80 THEN
      v_accuracy_xp := 20;
    END IF;
  END IF;

  SELECT NOT EXISTS (
    SELECT 1
    FROM public.daily_activity_log
    WHERE user_id = auth.uid()
      AND date = CURRENT_DATE
      AND lessons_count > 0
  ) INTO v_is_first_today;

  IF v_is_first_today THEN
    v_first_today_xp := 5;
  END IF;

  SELECT COALESCE(current_streak, 0)
  INTO v_streak
  FROM public.user_stats
  WHERE user_id = auth.uid();

  IF v_streak >= 30 THEN
    v_streak_xp := 20;
  ELSIF v_streak >= 7 THEN
    v_streak_xp := 10;
  END IF;

  v_total_xp_award := v_base_xp + v_accuracy_xp + v_streak_xp + v_first_today_xp;

  INSERT INTO public.lesson_completions (
    user_id,
    lesson_id,
    score,
    time_spent_seconds,
    correct_count,
    total_count
  )
  VALUES (
    auth.uid(),
    p_lesson_id,
    p_score,
    p_seconds,
    p_correct_count,
    p_total_count
  )
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET
    score = EXCLUDED.score,
    time_spent_seconds = EXCLUDED.time_spent_seconds,
    correct_count = EXCLUDED.correct_count,
    total_count = EXCLUDED.total_count,
    completed_at = NOW();

  SELECT EXISTS (
    SELECT 1
    FROM public.xp_transactions
    WHERE user_id = auth.uid()
      AND reference_id = p_lesson_id
      AND source_type = 'lesson_complete'
  ) INTO v_already;

  IF NOT v_already AND v_total_xp_award > 0 THEN
    INSERT INTO public.xp_transactions (user_id, amount, source_type, reference_id)
    VALUES (auth.uid(), v_total_xp_award, 'lesson_complete', p_lesson_id);

    INSERT INTO public.user_stats (user_id, total_xp, lessons_completed)
    VALUES (auth.uid(), v_total_xp_award, 1)
    ON CONFLICT (user_id) DO UPDATE SET
      total_xp = public.user_stats.total_xp + EXCLUDED.total_xp,
      lessons_completed = public.user_stats.lessons_completed + EXCLUDED.lessons_completed;
  END IF;

  SELECT status = 'completed'
  INTO v_course_already_completed
  FROM public.enrollments
  WHERE user_id = auth.uid()
    AND course_id = v_course_id;

  v_course_already_completed := COALESCE(v_course_already_completed, FALSE);

  SELECT COUNT(*)::INTEGER
  INTO v_total_lessons
  FROM public.lessons
  WHERE course_id = v_course_id;

  SELECT COUNT(*)::INTEGER
  INTO v_completed_lessons
  FROM public.lesson_completions lc
  JOIN public.lessons l ON l.id = lc.lesson_id
  WHERE lc.user_id = auth.uid()
    AND l.course_id = v_course_id;

  v_progress_bp := CASE
    WHEN v_total_lessons <= 0 THEN 0
    ELSE LEAST(10000, ROUND(v_completed_lessons::NUMERIC / v_total_lessons::NUMERIC * 10000))
  END;

  v_course_completed := v_total_lessons > 0 AND v_completed_lessons >= v_total_lessons;

  INSERT INTO public.enrollments (
    user_id,
    course_id,
    status,
    progress_bp,
    last_accessed_at,
    started_at,
    completed_at
  )
  VALUES (
    auth.uid(),
    v_course_id,
    CASE WHEN v_course_completed THEN 'completed'::enrollment_status ELSE 'in_progress'::enrollment_status END,
    v_progress_bp,
    NOW(),
    NOW(),
    CASE WHEN v_course_completed THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, course_id) DO UPDATE SET
    status = CASE
      WHEN v_course_completed THEN 'completed'::enrollment_status
      ELSE 'in_progress'::enrollment_status
    END,
    progress_bp = v_progress_bp,
    last_accessed_at = NOW(),
    completed_at = CASE
      WHEN v_course_completed THEN COALESCE(public.enrollments.completed_at, NOW())
      ELSE public.enrollments.completed_at
    END;

  IF v_course_completed AND NOT v_course_already_completed THEN
    INSERT INTO public.user_stats (user_id, courses_completed)
    VALUES (auth.uid(), 1)
    ON CONFLICT (user_id) DO UPDATE SET
      courses_completed = public.user_stats.courses_completed + 1;
  END IF;

  PERFORM public.upsert_daily_activity(
    auth.uid(),
    CASE WHEN v_already THEN 0 ELSE v_total_xp_award END,
    CASE WHEN v_already THEN 0 ELSE 1 END
  );

  IF NOT v_already THEN
    UPDATE public.daily_tasks
    SET
      current_value = LEAST(target_value, current_value + 1),
      is_completed = LEAST(target_value, current_value + 1) >= target_value,
      completed_at = CASE
        WHEN LEAST(target_value, current_value + 1) >= target_value AND completed_at IS NULL THEN NOW()
        ELSE completed_at
      END
    WHERE user_id = auth.uid()
      AND task_date = CURRENT_DATE
      AND task_type IN ('lesson_complete', 'lessons', 'lessons_completed');

    UPDATE public.daily_tasks
    SET
      current_value = LEAST(target_value, current_value + v_total_xp_award),
      is_completed = LEAST(target_value, current_value + v_total_xp_award) >= target_value,
      completed_at = CASE
        WHEN LEAST(target_value, current_value + v_total_xp_award) >= target_value AND completed_at IS NULL THEN NOW()
        ELSE completed_at
      END
    WHERE user_id = auth.uid()
      AND task_date = CURRENT_DATE
      AND task_type IN ('xp', 'xp_earned');
  END IF;

  PERFORM public.update_user_streak(auth.uid());

  SELECT public.award_viewer_achievements(auth.uid(), v_accuracy_pct, p_seconds)
  INTO v_unlocked_achievements;

  SELECT COALESCE(total_xp, 0)
  INTO v_total_xp_after
  FROM public.user_stats
  WHERE user_id = auth.uid();

  RETURN jsonb_build_object(
    'xp_earned', CASE WHEN v_already THEN 0 ELSE v_total_xp_award END,
    'total_xp', v_total_xp_after,
    'base_xp', v_base_xp,
    'accuracy_xp', v_accuracy_xp,
    'streak_xp', v_streak_xp,
    'first_today_xp', v_first_today_xp,
    'accuracy_pct', v_accuracy_pct,
    'already_completed', v_already,
    'course_completed', v_course_completed,
    'progress_bp', v_progress_bp,
    'completed_lessons', v_completed_lessons,
    'total_lessons', v_total_lessons,
    'unlocked_achievements', v_unlocked_achievements
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_viewer_achievements(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_lesson_and_award_xp(UUID, INTEGER, INTEGER, INTEGER, INTEGER) TO authenticated;
