-- Avatar storage bucket + RLS policies for Viewer profile image upload.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'avatars_select_public'
    ) THEN
        CREATE POLICY avatars_select_public
            ON storage.objects FOR SELECT
            USING (bucket_id = 'avatars');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'avatars_insert_authenticated'
    ) THEN
        CREATE POLICY avatars_insert_authenticated
            ON storage.objects FOR INSERT
            WITH CHECK (
                bucket_id = 'avatars'
                AND auth.role() = 'authenticated'
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'avatars_update_own'
    ) THEN
        CREATE POLICY avatars_update_own
            ON storage.objects FOR UPDATE
            USING (
                bucket_id = 'avatars'
                AND owner = auth.uid()
            )
            WITH CHECK (
                bucket_id = 'avatars'
                AND owner = auth.uid()
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'avatars_delete_own'
    ) THEN
        CREATE POLICY avatars_delete_own
            ON storage.objects FOR DELETE
            USING (
                bucket_id = 'avatars'
                AND owner = auth.uid()
            );
    END IF;
END $$;
