# Primoria 后端（省运维方案：Supabase + PostgreSQL）

你需要的能力：**账号 / 云端保存课程 / 发布课程 / 复杂筛选+搜索+推荐**，同时希望**省运维**。最适合的落地方案是：

- **Supabase**：Auth + Postgres + Storage + RLS（权限）+ Edge Functions（少量自定义逻辑）
- **PostgreSQL**：课程内容用 `jsonb` 存整份 Course JSON；搜索用 `tsvector` + GIN；推荐可先规则化，后续用 `pgvector` 做 embedding

本仓库已提供一份可直接在 Supabase 里执行的 SQL（见 `supabase/migrations/20260131_000001_init.sql`）。

---

## 1) 在 Supabase 创建项目（一次性）

1. 创建 Supabase project
2. Auth → Providers：开启 Email/Password（后续可加 Google/GitHub）
3. Storage：新建 bucket（建议）
   - `course-assets`（封面、图片、附件）
4. SQL Editor：执行 migration（推荐用 CLI，见下一节）

---

## 2) 用 Supabase CLI 管理数据库（推荐）

安装并登录（本地只做一次）：

```bash
brew install supabase/tap/supabase
supabase login
```

在仓库根目录初始化（如果你已经有 supabase 目录可跳过）：

```bash
supabase init
```

把本仓库的 migration 应用到远端（做法有多种，最简单是在 Dashboard 的 SQL Editor 直接粘贴执行）。

---

## 3) 数据模型（核心思路）

- `profiles`：用户公开资料（由 `auth.users` 同步创建）
- `courses`：课程“索引/元信息”（title/desc/tags/difficulty/status/作者/搜索向量）
- `course_versions`：课程版本（`content jsonb` = 完整 Course JSON）
- `user_course_progress`：学习进度（`state jsonb` 可存题目状态/最后一页/自定义字段）
- `user_course_favorites`：收藏

权限（RLS）原则：

- **所有人**：只能读取 `published` 的课程
- **作者本人**：可读写自己的 draft、创建版本、发布/撤回
- **进度/收藏**：只有本人可读写

---

## 4) 搜索 / 筛选（Postgres 原生）

在 `courses` 里用生成列 `search_tsv`（title/description/tags）+ GIN 索引：

- 关键词：`websearch_to_tsquery` / `plainto_tsquery`
- 筛选：`tags @> ARRAY[...]`、`difficulty = ...`、`status = 'published'`
- 排序：`ts_rank_cd(...)` + `published_at desc`

如需“模糊搜索”（拼写/前缀），可用 `pg_trgm`（migration 里已开启并给 title 建了 trigram 索引）。

---

## 5) 推荐（先省事，后进阶）

### MVP 推荐（不引入向量）

- 同标签/同难度优先（tag overlap）
- 叠加热度/新鲜度（published_at、收藏数、完课数等）
- 个性化：根据用户最近学习过的课程标签做加权

这部分本仓库提供了一个 `recommend_courses()` SQL 函数（见 migration），无需额外服务。

### 进阶推荐（embedding + pgvector）

当你想要“语义推荐/语义搜索”：

- `courses.embedding vector(...)`
- 用 Edge Function 生成 embedding（标题+简介+tags 拼成一段 text）
- 向量近邻搜索：`order by embedding <=> query_embedding`

---

## 6) Flutter 端怎么接（建议做法）

你有两个 Flutter Web 应用（`Builder/`、`Viewer/`），建议都用同一套 Supabase 项目：

1. 用 `supabase_flutter` 做 Auth（注册/登录/自动刷新 token）
2. Builder 侧：
   - 保存：写 `courses`（upsert 元信息）+ 插入一条 `course_versions`（content=Course JSON）
   - 发布：调用 `publish_course(course_id, version_id)` RPC
3. Viewer 侧：
   - 列表：读 `courses`（`status='published'`）
   - 搜索：调用 `search_courses(...)` RPC
   - 推荐：调用 `recommend_courses(limit)` RPC
   - 课程详情：拿 `courses.current_published_version_id` 再读对应 `course_versions.content`

建议把 Supabase URL / anon key 用 `--dart-define` 注入（不要写死在代码里），同时把 `.env` 加进 `.gitignore`。

