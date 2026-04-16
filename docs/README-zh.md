# Primoria 文档索引

最后更新：2026-04-04

Primoria 当前是 React + Supabase 技术栈产品：
- `packages/schema/`：共享课程 schema、fixtures 与迁移辅助
- `packages/viewer-react/`：统一的 Viewer 应用，覆盖学习端与 Builder 工作台（React 19 + TypeScript + React Router + React Query + Redux Toolkit + Supabase）
- `supabase/`：后端 schema、RLS、RPC 与 Edge Functions

## 部署

- Viewer React 预览工作流：`.github/workflows/viewer-react-preview.yml`
- Viewer React 生产工作流：`.github/workflows/viewer-react-production.yml`
- Viewer React CI 工作流：`.github/workflows/viewer-react-ci.yml`

## 当前产品状态

- Viewer React 已经是唯一受支持的前端应用，覆盖 landing、鉴权、首页、课程库、学习链路、社区、AI 导师、个人页、设置、成就墙、家长面板，以及 Builder Dashboard / 编辑器。
- Builder 工作台支持 Dashboard、编辑器、手动保存/发布、JSON 导入导出、课程复制，以及基于 schema 的校验。
- Builder 画布支持 `text`、`code-block`、`code-playground` 直接内联编辑，并支持接入 Supabase 的图片上传。
- Block 可见性支持按答题正确性逐步解锁（`afterPreviousCorrect`），并带有“每页首块始终可见”的安全默认值。
- 编辑器内 learner preview 现在按学习端运行时流程工作：页进度、按答题解锁，以及居中 lesson stage 中的 `Prev / Check / Next` 导航。

## 核心路由

Viewer React：
- `/`
- `/login`
- `/register`
- `/auth/callback`
- `/home`
- `/library`
- `/community`
- `/ai-tutor`
- `/profile`
- `/settings`
- `/achievements`
- `/parent`
- `/builder/dashboard`
- `/builder/editor`
- `/builder/editor/:courseId`

## Block 类型（规范值）

`text`、`image`、`code-block`、`code-playground`、`code-execution`、`function-flow`、`multiple-choice`、`fill-blank`、`true-false`、`matching`、`interactive-visual`、`video`

## docs 目录文件说明

- `prd.md` / `prd-zh.md`：需求基线
- `database-schema.md` / `database-schema-zh.md`：Supabase 实际 schema 与迁移说明
- `course-json-guide.md` / `course-json-guide-zh.md`：课程 JSON 规范
- `dashboard.md` / `dashboard-zh.md`：统一 Viewer 内 Builder Dashboard 架构与 Tab 说明
- `test-checklist.md` / `test-checklist-zh.md`：当前回归清单
- `todo.md` / `todo-zh.md`：当前待办
- `technical-debt-register-zh.md`：当前已确认的技术债清单与处理优先级
- `changelog.md`：版本与关键架构变更
- `viewer-react-cutover-runbook.md`：当前 viewer 部署与恢复说明
- `prompt.txt`：当前 AI 规划提示词

## 运行与验证

```bash
pnpm install

# 共享 schema
pnpm --filter @primoria/schema exec vitest run test/blocks.test.ts test/migrations.test.ts

# Viewer React（含 Builder 工作台）
pnpm --filter @primoria/viewer-react typecheck
pnpm --filter @primoria/viewer-react test
pnpm --filter @primoria/viewer-react build
```

## 说明

- 文档按当前实现维护，而不是按历史架构维护。
