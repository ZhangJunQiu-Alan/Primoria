# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
You are Claude Code, working in the root directory of the Primoria repository. Users will directly input tasks in the terminal (e.g., Fix / Implement / Refactor…).

Your responsibility is to deliver workable, testable, and rollbackable changes without breaking existing architecture and data constraints.

## Project Overview

Primoria is a two-part Flutter system for interactive STEM courses:
- **Builder** (`Builder/`) — Flutter Web course authoring tool (drag-and-drop block editor, Riverpod state management, GoRouter)
- **Viewer** (`Viewer/`) — Flutter multi-platform learning app (Brilliant.org-inspired, Provider state management)
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
# Builder
cd Builder && flutter pub get
cd Builder && flutter run -d chrome
cd Builder && flutter build web
cd Builder && flutter analyze
cd Builder && flutter test

# Viewer
cd Viewer && flutter pub get
cd Viewer && flutter run -d chrome
cd Viewer && flutter build web
cd Viewer && flutter analyze
cd Viewer && flutter test

# Supabase (requires Docker for local dev)
cd supabase && supabase start
cd supabase && supabase db push          # apply migrations
cd supabase && supabase migration new <name>  # create migration
```

## Architecture

```
Builder (Flutter Web) --export JSON--> Supabase (PostgreSQL) <--fetch-- Viewer (Flutter)
```

### Builder (`Builder/lib/`)
- **State**: Riverpod (`providers/builder_state.dart`, `providers/course_provider.dart`)
- **Routing**: GoRouter (`app/router.dart`) — routes: `/` (landing), `/dashboard`, `/builder`, `/viewer`
- **Models**: `Course → Page → Block` hierarchy (`models/`)
- **Block types**: text, image, codeBlock, codePlayground, multipleChoice, fillBlank, video — registered in `services/block_registry.dart`
- **Backend**: `services/supabase_service.dart` — auth (email/Google/GitHub), course CRUD, versioned content storage
- **AI**: `services/ai_course_generator.dart` — Gemini API for PDF-to-course generation
- **Design tokens**: `theme/design_tokens.dart` — `AppColors`, `AppSpacing`, `AppBorderRadius`, `AppShadows`, `AppFontSize`

### Viewer (`Viewer/lib/`)
- **State**: Provider (`providers/user_provider.dart`, `providers/theme_provider.dart`)
- **Screens**: home, search, courses, course detail, lesson, profile, login, demo
- **Services**: audio (sound effects), notifications (daily reminders), storage (SharedPreferences + SQLite)
- **Theme**: `theme/colors.dart`, `theme/typography.dart`, `theme/spacing.dart`

### Database (`supabase/migrations/`)
Key tables: `profiles`, `courses`, `course_versions`, `chapters`, `lessons`, `content_blocks`, `enrollments`, `lesson_completions`, `user_stats`, `achievements`, `xp_transactions`

Courses use versioned content: `courses.current_draft_version_id` / `current_published_version_id` → `course_versions.content` (JSON).

## Key Patterns

- Builder screens often define a private `_C` class with color constants matching CSS variables from HTML templates in `Builder_temple/`
- Design mockups are in `Design/` — reference these when asked about visual styling
- Supabase credentials are hardcoded in `Builder/lib/main.dart` as compile-time constants (anon key only)
- Builder tests are in `Builder/test/` — 26 model unit tests pass; `widget_test.dart` fails due to Supabase init requirement
- Course JSON format is documented in `Builder/docs/course-json-guide.md`


### 3.3 Quality gates（必须过）
在提交最终结果前，至少完成：
- `flutter format`（或 `dart format .`）
- `flutter analyze`
- `flutter test`

### 3.4 自动测试与 Bug 修复（强制执行）

**每次完成功能代码编写后，必须立即执行以下流程，不需要用户提示：**

1. **运行 analyze**
   ```bash
   cd <受影响的 app 目录> && flutter analyze --no-pub
   ```
   - 若有 `error` → 立即修复，再次运行直到零 error
   - `warning` 若为新引入的（非 Pre-existing Issues 列表中的）→ 修复
   - `info` → 可忽略

2. **运行 test**
   ```bash
   cd <受影响的 app 目录> && flutter test
   ```
   - 若有新增测试失败 → 定位根因，修复代码或测试，重新运行
   - 已知的两个 pre-existing 失败可忽略：
     - `widget_test.dart`（需要 Supabase 初始化，无法在 CI 外运行）
     - `code_runner_test.dart` 中的 `unsupported function` 超时用例
   - 除上述两项外，所有测试必须通过

3. **修复循环**
   - analyze / test → 失败 → 修复代码 → 重新 analyze / test → 直到全部通过
   - 每轮修复后重新跑完整 test suite，不允许只跑单个文件绕过其他失败
   - 若 3 轮循环后仍有无法修复的失败，向用户说明原因并提供选项

4. **Edge Function（TypeScript）**
   - 修改 `supabase/functions/` 后，部署前在本地检查语法：
     ```bash
     cd supabase/functions/<function-name> && deno check index.ts
     ```
   - 部署后用 `curl` 做冒烟测试验证关键路径

5. **范围判定**
   - 若改动只涉及 `Builder/` → 仅跑 Builder analyze + test
   - 若改动只涉及 `Viewer/` → 仅跑 Viewer analyze + test
   - 若同时涉及两个 app → 两个都跑
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

- Flutter SDK ≥ 3.9.0, Dart ≥ 3.9.0
- Supabase CLI + Docker for local backend development
- Chrome for Builder web development
