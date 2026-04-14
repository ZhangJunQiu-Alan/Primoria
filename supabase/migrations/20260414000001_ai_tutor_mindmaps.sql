CREATE TABLE ai_tutor_mindmaps (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    source_document_ids UUID[] NOT NULL DEFAULT '{}',
    user_prompt         TEXT NOT NULL DEFAULT '',
    document            JSONB NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_ai_tutor_mindmaps_updated_at
    BEFORE UPDATE ON ai_tutor_mindmaps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_ai_tutor_mindmaps_user_updated_at
    ON ai_tutor_mindmaps(user_id, updated_at DESC);

ALTER TABLE ai_tutor_mindmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_tutor_mindmaps_select_own"
    ON ai_tutor_mindmaps FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "ai_tutor_mindmaps_insert_own"
    ON ai_tutor_mindmaps FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_tutor_mindmaps_update_own"
    ON ai_tutor_mindmaps FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "ai_tutor_mindmaps_delete_own"
    ON ai_tutor_mindmaps FOR DELETE
    USING (auth.uid() = user_id);
