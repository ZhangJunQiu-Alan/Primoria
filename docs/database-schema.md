# Database Schema (Supabase/PostgreSQL)

Last updated: 2026-03-17

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

### Parent Mode

- `parent_child_binding_codes`
  - key fields: `child_id` (PK, FK → profiles), `code` (unique), `expires_at`
  - child generates a short-lived code; parent scans/enters it to link
- `parent_child_links`
  - key fields: `parent_id` (FK → profiles), `child_id` (FK → profiles), PK = (parent_id, child_id)
  - records confirmed parent–child relationships; RLS enforces parent-only SELECT
- `user_role` enum extended with `'parent'` value

### System

- `app_versions`
- `subscriptions`
- `course_versions` (historical/versioning support)

## Important Migration Notes

- `chapters` table was removed (migration `20260223000003`).
- `lessons.group_title` and `lessons.group_sort_key` were removed.
- Lesson ordering now relies on `lessons.sort_key`.
- `courses` gained AI planning fields (`animation_style`, `content_language`, `planning_json`) and pricing fields (`price_tier`, `price`).
- `profiles` gained `cover_image_url` and `pinned_achievement_ids` for achievement wall display.
- Parent Mode v1 added `parent_child_binding_codes`, `parent_child_links` tables and `'parent'` role enum value.
- Seed data course "Basics of Psychology" added as a published Social course (migration `20260308000001`).
- `publish_course` RPC rewritten to v2 (migration `20260317000001`): no longer joins on the removed `chapters` table; no longer overwrites `lessons.content_json` (Builder is sole writer of lesson content).

## RPC / SQL Functions Used by Apps

- `publish_course(p_course_id uuid)` — v2: only flips course `status` to `published`; content written exclusively by Builder via `lessons.content_json`
- `search_courses(p_query, p_subject_id, p_difficulty, p_tags, p_limit, p_offset)` — full-text search with filters
- `complete_lesson_and_award_xp(p_lesson_id, p_user_id, p_correct_count, p_total_count, p_difficulty_level)` — marks lesson complete, awards XP with streak bonus
- `upsert_daily_activity(p_user_id, p_xp, p_lessons)` — upserts daily activity log
- `update_user_streak(p_user_id uuid)` — updates learning streak counter
- `get_parent_child_report(p_child_id uuid, p_days integer)` — returns JSONB with stats, activity trend, courses, and recent lesson completions for a linked child; requires authenticated parent caller

## RLS

RLS is enabled on major business tables. Builder and Viewer flows depend on policy constraints tied to `auth.uid()` and course ownership/publication status.

## Known Technical Debt

1. Schema contains both snapshot-style (`lessons.content_json`) and normalized (`content_blocks`) representations.
2. Analytics/revenue domain tables are still incomplete for dashboard-grade metrics.
3. Some historical tables/functions are retained for compatibility and should be reviewed before major refactors.
