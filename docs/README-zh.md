# Primoria 文档索引

最后更新：2026-03-20

Primoria 当前是混合技术栈产品：
- `packages/builder/`：创作者端 Builder（React 19 + TypeScript + Redux Toolkit + React Router + Supabase）
- `packages/schema/`：共享课程 schema、fixtures 与迁移辅助
- `Viewer/`：学习端应用（Flutter + Provider + Supabase）

历史 Flutter 创作端 `Builder/` 已退役，并从当前代码库中移除。

## 部署

- Viewer 已通过 GitHub Pages 部署至 **[primoria.dpdns.org](https://primoria.dpdns.org)**（`.github/workflows/deploy-viewer.yml`）。
  推送到 `main` 分支的 `Viewer/**` 变更会自动触发构建部署。

## 当前产品状态

- React Builder 已成为唯一主创作端。
- Builder 支持鉴权、Dashboard、编辑器、自动保存、保存/发布、JSON 导入导出、课程复制，以及基于 schema 的校验。
- Builder 画布支持 `text`、`code-block`、`code-playground` 直接内联编辑，并支持接入 Supabase 的图片上传。
- Block 可见性已支持按答题正确性逐步解锁（`afterPreviousCorrect`），并带有“每页首块始终可见”的安全默认值。
- 编辑器内 learner preview 已更接近 Flutter Viewer 的流程：页进度、按答题解锁，以及居中 lesson stage 中的 `Prev / Check / Next` 导航。
- Dashboard 当前有 4 个 Tab：
  - Home
  - Course Management
  - Data Center
  - Fan Management
- Viewer 仍然是面向学习者的 Flutter 应用，包含 landing、鉴权、课程发现、课时学习、个人页与设置等流程。

## React Builder 核心路由

- `/`：落地页
- `/dashboard`：创作者工作台
- `/builder`：编辑器
- `/viewer`：Builder 内 learner preview
- `/auth/callback`：OAuth 回调

## Block 类型（规范值）

`text`、`image`、`code-block`、`code-playground`、`code-execution`、`function-flow`、`multiple-choice`、`fill-blank`、`true-false`、`matching`、`interactive-visual`、`video`

## docs 目录文件说明

- `prd.md` / `prd-zh.md`：需求基线
- `database-schema.md` / `database-schema-zh.md`：Supabase 实际 schema 与迁移说明
- `course-json-guide.md` / `course-json-guide-zh.md`：课程 JSON 规范
- `dashboard.md` / `dashboard-zh.md`：React Dashboard 架构与 Tab 说明
- `test-checklist.md` / `test-checklist-zh.md`：当前回归清单
- `todo.md` / `todo-zh.md`：当前待办
- `changelog.md`：版本与关键架构变更
- `prompt.txt`：当前 AI 规划提示词

## 运行与验证

```bash
pnpm install

# 共享 schema
pnpm --filter @primoria/schema exec vitest run test/blocks.test.ts test/migrations.test.ts

# React Builder
pnpm --filter @primoria/builder typecheck
pnpm --filter @primoria/builder test

# Viewer
cd Viewer
flutter pub get
flutter analyze
flutter test test/viewer_layout_metrics_test.dart test/viewer_page_shell_test.dart
flutter test
```

## 说明

- 文档按当前实现维护，而不是按历史架构维护。
- 旧 Flutter Builder 的细节保留在 git 历史和旧 changelog 记录中。
