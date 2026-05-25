DO $$
BEGIN
  CREATE TYPE public.interactive_visual_generation_job_status AS ENUM ('queued', 'running', 'succeeded', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.interactive_visual_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.interactive_visual_generation_job_status NOT NULL DEFAULT 'queued',
  prompt TEXT NOT NULL,
  request_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  result_artifact JSONB,
  last_error TEXT,
  error_history JSONB NOT NULL DEFAULT '[]'::JSONB,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_interactive_visual_generation_jobs_user_created
  ON public.interactive_visual_generation_jobs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interactive_visual_generation_jobs_due
  ON public.interactive_visual_generation_jobs(status, next_attempt_at, updated_at)
  WHERE status IN ('queued', 'running');

DROP TRIGGER IF EXISTS trg_interactive_visual_generation_jobs_updated_at
  ON public.interactive_visual_generation_jobs;
CREATE TRIGGER trg_interactive_visual_generation_jobs_updated_at
  BEFORE UPDATE ON public.interactive_visual_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.interactive_visual_generation_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interactive_visual_generation_jobs_select_own"
  ON public.interactive_visual_generation_jobs;
CREATE POLICY "interactive_visual_generation_jobs_select_own"
  ON public.interactive_visual_generation_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
BEGIN
  PERFORM cron.unschedule('interactive-visual-generation-queue');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'interactive-visual-generation-queue',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://rygafvlzzkvqhhenajzi.functions.supabase.co/viewer-ai-interactive-visual',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5Z2Fmdmx6emt2cWhoZW5hanppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDg5NzgsImV4cCI6MjA4NTQyNDk3OH0.8oRsXVtdb3DnDEusJzHao3P4w-6D_-i-z9S787D8BWo',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5Z2Fmdmx6emt2cWhoZW5hanppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDg5NzgsImV4cCI6MjA4NTQyNDk3OH0.8oRsXVtdb3DnDEusJzHao3P4w-6D_-i-z9S787D8BWo'
    ),
    body := jsonb_build_object('action', 'process', 'source', 'cron')
  );
  $cron$
);
