CREATE TABLE IF NOT EXISTS web_push_subscriptions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    endpoint         TEXT NOT NULL UNIQUE,
    p256dh           TEXT NOT NULL,
    auth             TEXT NOT NULL,
    user_agent       TEXT,
    permission_state TEXT NOT NULL DEFAULT 'default' CHECK (permission_state IN ('default', 'granted', 'denied', 'unsupported')),
    active           BOOLEAN NOT NULL DEFAULT true,
    last_sent_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_user_active
    ON web_push_subscriptions (user_id, active);

ALTER TABLE web_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "web_push_subscriptions_select_own" ON web_push_subscriptions;
CREATE POLICY "web_push_subscriptions_select_own"
    ON web_push_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "web_push_subscriptions_insert_own" ON web_push_subscriptions;
CREATE POLICY "web_push_subscriptions_insert_own"
    ON web_push_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "web_push_subscriptions_update_own" ON web_push_subscriptions;
CREATE POLICY "web_push_subscriptions_update_own"
    ON web_push_subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_web_push_subscriptions_updated_at ON web_push_subscriptions;
CREATE TRIGGER trg_web_push_subscriptions_updated_at
    BEFORE UPDATE ON web_push_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
