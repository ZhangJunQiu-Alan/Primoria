# 数据库 Schema（Supabase/PostgreSQL）

最后更新：2026-05-13

本文档基于 `supabase/migrations/` 的迁移结果与当前代码实际使用状态整理。

## 领域划分

1. 身份与资料
2. 课程创作与发布
3. 学习进度
4. 游戏化
5. 社交
6. 系统与版本

## 当前活跃使用表

### 身份

- `profiles`
  - 关键字段：`id`、`username`、`avatar_url`、`cover_image_url`、`bio`、`role`、`pinned_achievement_ids`、时间戳
- `user_settings`
  - 用户级偏好（主题/语言/通知等）

### 课程创作

- `subjects`
- `courses`
  - 关键字段：`id`、`author_id`、`title`、`description`、`thumbnail_url`、`difficulty_level`、`status`、`estimated_minutes`、`tags`、`price_tier`、`price`、`published_at`
  - AI Agentic 新增字段：
    - `animation_style`
    - `content_language`
    - `planning_json`：保存自然语言生成完整课程时的规划、结构化意图、质量约束和生成上下文
- `lessons`
  - 关键字段：`id`、`course_id`、`title`、`type`、`sort_key`、`content_json`、`content_hash`、解锁相关字段
  - `content_json` 的规范内容层级应为 `lessons[].pages[].blocks[]`；历史 flat blocks 或顶层 pages 只作为导入兼容格式存在
  - 解锁字段：
    - `is_locked`
    - `unlock_type`
    - `prerequisite_lesson_id`
    - `paywall_product_id`
- `content_blocks`
  - 仍保留的规范化块表（含 RLS 与索引），当前与快照模式并存

### 学习进度

- `enrollments`
- `lesson_completions`
  - gamification v2 增加：`correct_count`、`total_count`
- `block_interactions`

### 游戏化

- `user_stats`
- `daily_activity_log`
- `xp_transactions`
- `achievements`
  - 包含 `rarity`
- `user_achievements`
- `daily_tasks`

### 社交

- `follows`
- `course_feedback`

### 家长模式

- `parent_child_binding_codes`
  - 主要字段：`child_id`（主键，FK → profiles）、`code`（唯一短时效码）、`expires_at`
  - 子账号生成短时效码，家长扫码/输入后完成绑定
- `parent_child_links`
  - 主要字段：`parent_id`（FK → profiles）、`child_id`（FK → profiles），联合主键 (parent_id, child_id)
  - 记录已确认的家长–子账号关系；RLS 限制仅家长可查询
- `user_role` 枚举新增 `'parent'` 值

### 系统

- `app_versions`
- `subscriptions`
- `course_versions`（历史版本支持）

## 关键迁移结论

- `chapters` 表已移除。
- `lessons.group_title` 与 `lessons.group_sort_key` 已移除。
- 课时顺序统一由 `lessons.sort_key` 控制。
- `courses` 已增加 AI 规划字段与价格字段。
- 当前产品口径下，AI 规划字段服务于“自然语言 -> 完整 Course -> Lesson -> Page -> Block”的课程生成链路，不应只被理解为单个草稿增强字段。
- `profiles` 已增加 `cover_image_url` 与 pinned achievements 支持。
- 家长模式 v1 新增 `parent_child_binding_codes`、`parent_child_links` 表及 `'parent'` role 枚举值。
- 种子数据课程「心理学基础」（Basics of Psychology）已作为已发布社会学课程插入（迁移 `20260308000001`）。

## 代码使用的主要 RPC / SQL 函数

- `publish_course(p_course_id uuid)`
- `search_courses(...)`
- `recommend_courses(...)`
- `complete_lesson_and_award_xp(...)`
- `upsert_daily_activity(...)`
- `update_user_streak(...)`
- `get_parent_child_report(p_child_id uuid, p_days integer)` — 返回指定子账号的 JSONB 报告（统计数据、活跃趋势、课程、近期课时完成记录）；调用者须为已认证家长

## RLS 说明

核心业务表已启用 RLS。Builder 与 Viewer 的读写依赖 `auth.uid()`、课程作者归属与发布状态策略。

## 已知技术债

1. 课程内容存在快照（`lessons.content_json`）与规范化（`content_blocks`）双轨并存。
2. Dashboard 深度分析/收入统计所需数据表尚不完整。
3. 部分历史表/函数为兼容保留，后续大改前需先清点。
