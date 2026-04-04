# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
You are Claude Code, working in the root directory of the Primoria repository. Users will directly input tasks in the terminal (e.g., Fix / Implement / Refactor…).

Your responsibility is to deliver workable, testable, and rollbackable changes without breaking existing architecture and data constraints.

## 指令澄清原则（强制执行）

每当收到的指令存在歧义（多种可能的解读方式），必须：
1. 列出所有可能的解读方向
2. 等待用户明确选择后，再开始任何实际操作

不允许猜测意图后直接执行。

## Project Overview

Primoria is a mixed-stack course platform:
- **Schema** (`packages/schema/`) — canonical course schema, fixtures, and migration helpers
- **Viewer** (`packages/viewer-react/`) — unified React/TypeScript learner + builder app (React Router, Redux Toolkit, React Query, Supabase)
- **supabase/** — PostgreSQL backend (migrations, auth, course storage, gamification)

关键文档（每次做任务先快速扫一遍相关部分再动手）：
- docs/prd.md
- docs/database-schema.md
- docs/course-json-guide.md
- docs/dashboard.md
- docs/test-checklist.md
- docs/changelog.md
- docs/todo.md
- README.md（仓库布局、启动方式）

## Common Commands

```bash
pnpm install

# Viewer (React, includes Builder workspace)
pnpm --filter @primoria/viewer-react dev
pnpm --filter @primoria/viewer-react build
pnpm --filter @primoria/viewer-react typecheck
pnpm --filter @primoria/viewer-react test
pnpm --filter @primoria/schema exec vitest run test/blocks.test.ts test/migrations.test.ts

# Supabase (requires Docker for local dev)
cd supabase && supabase start
cd supabase && supabase db push          # apply migrations
cd supabase && supabase migration new <name>  # create migration
```

## Architecture

```
Viewer Builder Workspace --export/save JSON--> Supabase (PostgreSQL) <--fetch-- Viewer Learner Runtime
```

### Builder Workspace (`packages/viewer-react/src/`)
- **State**: shared Redux Toolkit store plus builder editor slice and feature-local hooks/utilities
- **Routing**: React Router — builder routes live under `/builder/dashboard`, `/builder/editor`, `/builder/editor/:courseId`
- **Models**: `Course → Lesson → Page → Block` hierarchy comes from `@primoria/schema`
- **Block types** (12 total, registered in `features/editor/blockRegistry.ts`):
  `text`, `image`, `code-block`, `code-playground`, `code-execution`, `function-flow`, `multiple-choice`, `fill-blank`, `true-false`, `matching`, `interactive-visual`, `video`
- **Backend**: Supabase auth + course CRUD + local/remote draft persistence
- **Editor**: inline block editing, page navigation, visibility gating, learner preview, publish validation
- **Design system**: builder workspace CSS lives in `features/editor/editor.css` and `pages/dashboard/dashboard.css`

### Viewer (`packages/viewer-react/src/`)
- **State**: Redux Toolkit + React Query (`shared/state`, `shared/api`)
- **Routes**: landing, login, register, home, library, builder dashboard/editor, course detail, lesson, lesson result, community, AI tutor, profile, settings, achievement wall, parent dashboard
- **Backend**: Supabase auth + viewer domain APIs + Edge Functions (`viewer-ai-tutor`, viewer push functions)
- **Theme**: Tailwind-driven token layer with shared layout primitives in `shared/layout` and centralized copy in `shared/theme/copy.ts`

### Database (`supabase/migrations/`)
Key active tables: `profiles`, `subjects`, `courses`, `lessons`, `content_blocks`, `enrollments`, `lesson_completions`, `block_interactions`, `user_stats`, `daily_activity_log`, `xp_transactions`, `achievements`, `user_achievements`, `daily_tasks`, `follows`, `course_feedback`, `parent_child_binding_codes`, `parent_child_links`, `app_versions`, `subscriptions`

Content storage: `lessons.content_json` holds per-lesson course JSON snapshots written by Builder. `course_versions` exists for historical versioning but is not actively used in current flows. The `chapters` table was removed (migration 20260223000003).

## Key Patterns

- Shared course types and migrations come from `packages/schema`
- Design mockups are in `Design/` — reference these when asked about visual styling
- Unified app source lives under `packages/viewer-react/src/`
- Course JSON format is documented in `docs/course-json-guide.md`


### 3.3 Quality gates（必须过）
在提交最终结果前，至少完成：
- 若改 Viewer：`pnpm --filter @primoria/viewer-react typecheck`
- 若改 Viewer：`pnpm --filter @primoria/viewer-react test`

### 3.4 自动测试与 Bug 修复（强制执行）

**每次完成功能代码编写后，必须立即执行以下流程，不需要用户提示：**

1. **运行静态检查**
   ```bash
   # Viewer
   pnpm --filter @primoria/viewer-react typecheck
   ```
   - 若有 `error` → 立即修复，再次运行直到零 error
   - `warning` 若为新引入的（非 Pre-existing Issues 列表中的）→ 修复
   - `info` → 可忽略

2. **运行 test**
   ```bash
   # Viewer
   pnpm --filter @primoria/viewer-react test
   ```
   - 若有新增测试失败 → 定位根因，修复代码或测试，重新运行
   - 除已明确说明的 pre-existing/flaky 失败外，所有测试必须通过

3. **修复循环**
   - 静态检查 / test → 失败 → 修复代码 → 重新运行 → 直到全部通过
   - 每轮修复后重新跑完整 test suite，不允许只跑单个文件绕过其他失败
   - 若 3 轮循环后仍有无法修复的失败，向用户说明原因并提供选项

4. **Edge Function（TypeScript）**
   - 修改 `supabase/functions/` 后，部署前在本地检查语法：
     ```bash
     cd supabase/functions/<function-name> && deno check index.ts
     ```
   - 部署后用 `curl` 做冒烟测试验证关键路径

5. **范围判定**
   - 若改动只涉及 `packages/schema/` → 跑相关 schema tests
   - 若改动只涉及 `packages/viewer-react/` → 仅跑 Viewer typecheck + test
   - 若同时涉及 Viewer / Schema → 受影响部分都跑
   - 若只改 `supabase/` → 仅做 deno check + 部署后冒烟测试

## 6) Task Input Template (Optional but recommended)

用户在终端输入任务时，推荐用以下格式（你要能识别并执行）：

TASK: <一句话要做什么>
CONTEXT: <涉及页面/模块/数据表>
ACCEPTANCE: <验收标准>
OUT_OF_SCOPE: <不做什么>
NOTES: <任何硬约束/偏好>

如果用户没写这些字段，你要自己从代码与 docs 推导，并把推导结果写进 plan/assumptions。

## Requirements

- Node.js + pnpm for unified Viewer development
- Supabase CLI + Docker for local backend development
- Chrome for Viewer / Builder workspace web development
