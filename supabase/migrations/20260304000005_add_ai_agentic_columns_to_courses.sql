-- Migration: add AI Agentic columns to courses
-- Milestone 2: CoursePlanJson storage
-- Added: animation_style, content_language, planning_json

ALTER TABLE courses
  ADD COLUMN animation_style  text
    CHECK (animation_style IN ('cartoon', 'minimal', 'realistic')),
  ADD COLUMN content_language text
    CHECK (content_language IN ('zh', 'en')),
  ADD COLUMN planning_json    jsonb;

COMMENT ON COLUMN courses.animation_style  IS 'Visual style hint used by AI block generation (cartoon / minimal / realistic)';
COMMENT ON COLUMN courses.content_language IS 'Language of the course content, used for Viewer filtering (zh / en)';
COMMENT ON COLUMN courses.planning_json    IS 'Raw CoursePlanJson from /ai/plan-course; per-lesson objective and key_points consumed by Phase 2C block generation';
