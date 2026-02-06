-- ============================================================
-- 0. 公共枚举类型 & 通用函数
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------- Enums --------------------

CREATE TYPE user_role AS ENUM ('user', 'subscriber', 'author', 'admin');
CREATE TYPE theme_mode AS ENUM ('system', 'light', 'dark');
CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE course_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE lesson_type AS ENUM ('interactive', 'quiz', 'video', 'article');
CREATE TYPE block_type AS ENUM ('text', 'image', 'code_playground', 'multiple_choice', 'slider', 'info_card');
CREATE TYPE enrollment_status AS ENUM ('in_progress', 'completed', 'dropped');
CREATE TYPE achievement_category AS ENUM ('streak', 'learning', 'social');
CREATE TYPE xp_source_type AS ENUM ('lesson_complete', 'daily_bonus', 'admin_adjustment');
CREATE TYPE price_tier AS ENUM ('free', 'premium');
CREATE TYPE app_platform AS ENUM ('ios', 'android', 'web');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'expired');

-- -------------------- 通用 Trigger 函数 --------------------

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
