ALTER TABLE public.community_notes
  ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_notes_owner_lesson_unique
  ON public.community_notes (owner_id, lesson_id)
  WHERE lesson_id IS NOT NULL;
