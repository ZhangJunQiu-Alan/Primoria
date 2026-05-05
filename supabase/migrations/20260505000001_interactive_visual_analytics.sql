CREATE TABLE IF NOT EXISTS public.interactive_visual_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses (id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES public.lessons (id) ON DELETE SET NULL,
  surface TEXT NOT NULL CHECK (surface IN ('lesson', 'ai-tutor', 'builder-preview')),
  block_id TEXT NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'input', 'action', 'custom')),
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interactive_visual_events_actor_time
  ON public.interactive_visual_events (actor_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_interactive_visual_events_lesson_time
  ON public.interactive_visual_events (lesson_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_interactive_visual_events_course_time
  ON public.interactive_visual_events (course_id, occurred_at DESC);

ALTER TABLE public.interactive_visual_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interactive_visual_events_select_own"
  ON public.interactive_visual_events FOR SELECT
  USING (auth.uid() = actor_id);

CREATE POLICY "interactive_visual_events_insert_own"
  ON public.interactive_visual_events FOR INSERT
  WITH CHECK (auth.uid() = actor_id);

CREATE OR REPLACE FUNCTION public.track_interactive_visual_event(
  p_surface TEXT,
  p_course_id UUID DEFAULT NULL,
  p_lesson_id UUID DEFAULT NULL,
  p_block_id TEXT DEFAULT '',
  p_interaction_type TEXT DEFAULT 'custom',
  p_event_name TEXT DEFAULT 'unknown',
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF COALESCE(BTRIM(p_block_id), '') = '' OR COALESCE(BTRIM(p_event_name), '') = '' THEN
    RETURN FALSE;
  END IF;

  IF p_surface NOT IN ('lesson', 'ai-tutor', 'builder-preview') THEN
    RETURN FALSE;
  END IF;

  IF p_interaction_type NOT IN ('view', 'input', 'action', 'custom') THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.interactive_visual_events (
    actor_id,
    course_id,
    lesson_id,
    surface,
    block_id,
    interaction_type,
    event_name,
    payload
  )
  VALUES (
    v_actor_id,
    p_course_id,
    p_lesson_id,
    p_surface,
    p_block_id,
    p_interaction_type,
    p_event_name,
    COALESCE(p_payload, '{}'::jsonb)
  );

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_interactive_visual_event(TEXT, UUID, UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
