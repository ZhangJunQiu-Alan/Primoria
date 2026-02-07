-- ============================================================
-- Reset: drop old initial schema to make room for the new design
-- ============================================================

-- Drop old triggers
DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop old functions
DROP FUNCTION IF EXISTS publish_course(TEXT, TEXT);
DROP FUNCTION IF EXISTS search_courses(TEXT, TEXT[], TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS recommend_courses(INTEGER);
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS handle_new_user();

-- Drop old tables (order matters for FK)
DROP TABLE IF EXISTS course_versions CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
