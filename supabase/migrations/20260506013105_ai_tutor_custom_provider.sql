ALTER TABLE user_settings
  ADD COLUMN ai_provider text NOT NULL DEFAULT 'google'
    CHECK (ai_provider IN ('google', 'openai', 'anthropic')),
  ADD COLUMN ai_base_url text,
  ADD COLUMN ai_api_key text;

CREATE POLICY "user_settings_ai_credentials_select_own"
    ON user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "user_settings_ai_credentials_update_own"
    ON user_settings FOR UPDATE
    USING (auth.uid() = user_id);
