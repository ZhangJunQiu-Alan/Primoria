-- Storage bucket for editor block images.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'course-block-images',
    'course-block-images',
    true,
    10485760,  -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'course_block_images_select_public'
  ) THEN
    CREATE POLICY course_block_images_select_public
      ON storage.objects FOR SELECT
      USING (bucket_id = 'course-block-images');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'course_block_images_insert_authenticated'
  ) THEN
    CREATE POLICY course_block_images_insert_authenticated
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'course-block-images'
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'course_block_images_update_own'
  ) THEN
    CREATE POLICY course_block_images_update_own
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'course-block-images' AND owner = auth.uid())
      WITH CHECK (bucket_id = 'course-block-images' AND owner = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'course_block_images_delete_own'
  ) THEN
    CREATE POLICY course_block_images_delete_own
      ON storage.objects FOR DELETE
      USING (bucket_id = 'course-block-images' AND owner = auth.uid());
  END IF;
END $$;
