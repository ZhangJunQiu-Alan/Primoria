-- Storage bucket for course thumbnail images.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'course-thumbnails',
    'course-thumbnails',
    true,
    5242880,  -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
    public            = EXCLUDED.public,
    file_size_limit   = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'course_thumbnails_select_public'
  ) THEN
    CREATE POLICY course_thumbnails_select_public
      ON storage.objects FOR SELECT
      USING (bucket_id = 'course-thumbnails');
  END IF;
END $$;

-- Authenticated insert
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'course_thumbnails_insert_authenticated'
  ) THEN
    CREATE POLICY course_thumbnails_insert_authenticated
      ON storage.objects FOR INSERT
      WITH CHECK (
          bucket_id = 'course-thumbnails'
          AND auth.role() = 'authenticated'
      );
  END IF;
END $$;

-- Own update / delete
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'course_thumbnails_update_own'
  ) THEN
    CREATE POLICY course_thumbnails_update_own
      ON storage.objects FOR UPDATE
      USING  (bucket_id = 'course-thumbnails' AND owner = auth.uid())
      WITH CHECK (bucket_id = 'course-thumbnails' AND owner = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'course_thumbnails_delete_own'
  ) THEN
    CREATE POLICY course_thumbnails_delete_own
      ON storage.objects FOR DELETE
      USING (bucket_id = 'course-thumbnails' AND owner = auth.uid());
  END IF;
END $$;
