-- ============================================================
-- 1. User Management
-- ============================================================

-- -------------------- profiles (user profiles) --------------------
CREATE TABLE profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username    TEXT UNIQUE CHECK (length(username) BETWEEN 3 AND 32),
    avatar_url  TEXT,
    bio         TEXT,
    role        user_role NOT NULL DEFAULT 'user',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ
);

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_public"
    ON profiles FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own"
    ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- -------------------- user_settings (user settings) --------------------
CREATE TABLE user_settings (
    user_id                     UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    theme_mode                  theme_mode NOT NULL DEFAULT 'system',
    notification_daily_reminder BOOLEAN NOT NULL DEFAULT false,
    notification_reminder_time  TIME NOT NULL DEFAULT '09:00',
    marketing_emails            BOOLEAN NOT NULL DEFAULT false,
    language                    TEXT NOT NULL DEFAULT 'zh-CN',
    accessibility_mode          BOOLEAN NOT NULL DEFAULT false
);

-- RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_select_own"
    ON user_settings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_settings_insert_own"
    ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_update_own"
    ON user_settings FOR UPDATE USING (auth.uid() = user_id);
