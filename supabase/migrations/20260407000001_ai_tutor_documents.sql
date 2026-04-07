CREATE TABLE tutor_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    filename        TEXT NOT NULL,
    mime_type       TEXT NOT NULL,
    extracted_text  TEXT NOT NULL CHECK (char_length(extracted_text) > 0),
    extracted_chars INTEGER NOT NULL DEFAULT 0 CHECK (extracted_chars >= 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tutor_documents_updated_at
    BEFORE UPDATE ON tutor_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_tutor_documents_user_created_at
    ON tutor_documents(user_id, created_at DESC);

ALTER TABLE tutor_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tutor_documents_select_own"
    ON tutor_documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "tutor_documents_insert_own"
    ON tutor_documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tutor_documents_update_own"
    ON tutor_documents FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "tutor_documents_delete_own"
    ON tutor_documents FOR DELETE
    USING (auth.uid() = user_id);
