# Database Schema (Supabase/PostgreSQL)

Last updated: 2026-03-06

This document reflects the effective schema as evolved by migrations in `supabase/migrations/` and current app usage.

## High-Level Domains

1. Identity & profile
2. Course authoring and publication
3. Learning progress
4. Gamification
5. Social
6. System/versioning

## Core Tables in Active Use

### Identity

- `profiles`
  - key fields: `id`, `username`, `avatar_url`, `cover_image_url`, `bio`, `role`, `pinned_achievement_ids`, timestamps
- `user_settings`
  - user-level preferences (theme/language/notification)

### Course Authoring

- `subjects`
- `courses`
  - key fields: `id`, `author_id`, `title`, `description`, `thumbnail_url`, `difficulty_level`, `status`, `estimated_minutes`, `tags`, `price_tier`, `price`, `published_at`
  - AI agentic additions:
    - `animation_style`
    - `content_language`
    - `planning_json`
- `lessons`
  - key fields: `id`, `course_id`, `title`, `type`, `sort_key`, `content_json`, `content_hash`, lock fields
  - lock fields:
    - `is_locked`
    - `unlock_type`
    - `prerequisite_lesson_id`
    - `paywall_product_id`
- `content_blocks`
  - legacy normalized block storage table; still exists with RLS and indexes

### Learning Progress

- `enrollments`
- `lesson_completions`
  - includes `correct_count`, `total_count` (gamification v2)
- `block_interactions`

### Gamification

- `user_stats`
- `daily_activity_log`
- `xp_transactions`
- `achievements`
  - includes `rarity`
- `user_achievements`
- `daily_tasks`

### Social

- `follows`
- `course_feedback`

### System

- `app_versions`
- `subscriptions`
- `course_versions` (historical/versioning support)

## Important Migration Notes

- `chapters` table was removed.
- `lessons.group_title` and `lessons.group_sort_key` were removed.
- Lesson ordering now relies on `lessons.sort_key`.
- `courses` gained AI planning fields and pricing fields.
- `profiles` gained `cover_image_url` and pinned achievement list support.

## RPC / SQL Functions Used by Apps

- `publish_course(p_course_id uuid)`
- `search_courses(...)`
- `recommend_courses(...)`
- `complete_lesson_and_award_xp(...)`
- `upsert_daily_activity(...)`
- `update_user_streak(...)`

## RLS

RLS is enabled on major business tables. Builder and Viewer flows depend on policy constraints tied to `auth.uid()` and course ownership/publication status.

## Known Technical Debt

1. Schema contains both snapshot-style (`lessons.content_json`) and normalized (`content_blocks`) representations.
2. Analytics/revenue domain tables are still incomplete for dashboard-grade metrics.
3. Some historical tables/functions are retained for compatibility and should be reviewed before major refactors.
