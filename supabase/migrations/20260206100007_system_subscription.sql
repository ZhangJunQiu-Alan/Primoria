-- ============================================================
-- 6. System & Subscription
-- ============================================================

-- -------------------- app_versions (version control) --------------------
CREATE TABLE app_versions (
    version         TEXT NOT NULL,
    platform        app_platform NOT NULL,
    is_mandatory    BOOLEAN NOT NULL DEFAULT false,
    changelog       TEXT,
    PRIMARY KEY (version, platform)
);

-- RLS
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_versions_select_public"
    ON app_versions FOR SELECT USING (true);

-- -------------------- subscriptions (subscriptions) --------------------
CREATE TABLE subscriptions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan_id     TEXT NOT NULL,
    status      subscription_status NOT NULL DEFAULT 'active',
    start_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date    TIMESTAMPTZ
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own"
    ON subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_insert_own"
    ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscriptions_update_own"
    ON subscriptions FOR UPDATE USING (auth.uid() = user_id);
