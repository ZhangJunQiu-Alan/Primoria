# 技术债清单

最后更新：2026-04-16

## 目的

这份文档记录 Primoria 当前已确认的技术债，重点覆盖会直接影响稳定性、发布效率、测试可信度和后续开发速度的问题。

本清单基于 2026-04-16 的仓库快照整理，优先记录“已验证”的问题，而不是泛泛而谈的改进建议。

## 盘点范围

- `packages/viewer-react/`
- `packages/schema/`
- `packages/db/`
- `supabase/functions/`
- `.github/workflows/`

## 1. 高优先级

### 1.1 基线测试当前不是全绿

- 现状：
  - `pnpm test` 当前会失败。
  - 已确认失败用例：`packages/viewer-react/test/settingsPage.test.tsx`
- 影响：
  - 主干不具备“测试通过即可合并/发布”的最低可信度。
  - 后续改动很难判断是新回归还是旧问题未清。
- 证据：
  - `packages/viewer-react/test/settingsPage.test.tsx`
  - `packages/viewer-react/src/features/profile/SettingsPage.tsx`
- 建议：
  - 先修复设置中心到帮助中心的路由回归。
  - 将 `pnpm test` 恢复为稳定绿线后，再继续叠加功能开发。

### 1.2 根级 lint 治理链条缺失

- 现状：
  - 根脚本存在 `pnpm lint`，但各 workspace package 没有对应 `lint` script。
  - 当前执行根级 `pnpm lint` 会直接失败。
- 影响：
  - ESLint 无法作为真实门禁使用。
  - 代码风格、Hook 依赖、未使用变量等问题只能靠人工发现。
- 证据：
  - `package.json`
  - `packages/viewer-react/package.json`
  - `packages/schema/package.json`
  - `packages/db/package.json`
- 建议：
  - 为至少 `viewer-react` 补齐 ESLint 配置和 `lint` script。
  - 根级 `pnpm lint` 应恢复为可执行、可用于 CI 的命令。

### 1.3 环境策略与实际代码行为不一致

- 现状：
  - CI 声明“没有 Supabase env 时，非 fixture mode 的 build 应失败”。
  - 但前端代码在缺少 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 时，会 fallback 到默认 Supabase 项目配置并继续构建。
  - 已实际验证：移除相关 env 后，`pnpm --filter @primoria/viewer-react build` 仍能成功。
- 影响：
  - 本地、CI、预发、生产的环境行为预期不一致。
  - 开发时容易误连共享 Supabase 项目，造成联调混淆。
  - “严格环境防护”在当前并不可信。
- 证据：
  - `.github/workflows/viewer-react-ci.yml`
  - `packages/viewer-react/src/shared/api/supabase.ts`
- 建议：
  - 二选一并统一：
    - 真正禁止缺 env 构建；或
    - 明确允许 fallback，并修改 CI 预期与文档。
  - 不应继续保持“工作流一套说法、代码另一套行为”的状态。

### 1.4 AI 文档工具链缺少函数级测试护栏

- 现状：
  - `viewer-ai-quiz-from-docs` 和 `viewer-ai-mindmap-from-docs` 是高风险核心链路，但当前 `supabase/functions/` 下几乎没有对应单测。
  - 当前可见的函数侧测试只有 `gemini-generate/normalizeHtml.test.ts`。
- 影响：
  - Quiz / Mind Map 的真实远端逻辑容易在部署后才暴露问题。
  - 前端 mock 测试无法替代函数侧 schema、长度限制、错误处理和 Gemini 回包解析测试。
- 证据：
  - `supabase/functions/viewer-ai-quiz-from-docs/index.ts`
  - `supabase/functions/viewer-ai-mindmap-from-docs/index.ts`
  - `supabase/functions/gemini-generate/normalizeHtml.test.ts`
- 建议：
  - 为 Quiz / Mind Map Edge Function 补最少一层纯函数测试。
  - 优先覆盖：长度上限、Gemini 非法 JSON、空返回、权限失败、文档缺失。

## 2. 中优先级

### 2.1 关键前端页面过于单体

- 现状：
  - 多个核心页面体量已经明显偏大：
    - `DashboardPage.tsx`
    - `AiTutorPage.tsx`
    - `AiTutorMindMapEditorPage.tsx`
    - `CommunityPage.tsx`
    - `SettingsPage.tsx`
- 影响：
  - 单文件同时承载数据请求、副作用、状态同步和 UI，回归面过大。
  - 新人接手成本高，代码审查和重构成本都会持续升高。
- 证据：
  - `packages/viewer-react/src/pages/dashboard/DashboardPage.tsx`
  - `packages/viewer-react/src/features/ai-tutor/AiTutorPage.tsx`
  - `packages/viewer-react/src/features/ai-tutor/AiTutorMindMapEditorPage.tsx`
  - `packages/viewer-react/src/features/community/CommunityPage.tsx`
  - `packages/viewer-react/src/features/profile/SettingsPage.tsx`
- 建议：
  - 按“页面壳层 / 数据逻辑 / 交互 hooks / 纯展示组件”拆分。
  - 优先从 AI Tutor 和 Dashboard 这类变化最频繁的区域开始拆。

### 2.2 编辑器状态同步模型仍偏脆弱

- 现状：
  - 多处使用 `eslint-disable-line react-hooks/exhaustive-deps` 压掉 Hook 依赖检查。
  - 当前看起来主要集中在编辑器属性面板和编辑器壳层。
- 影响：
  - 表单重置、局部同步、草稿切换容易出现陈旧闭包或状态覆盖。
  - 问题往往不是立刻报错，而是以“偶发 UI 不同步”形式出现，更难排查。
- 证据：
  - `packages/viewer-react/src/features/editor/properties/panels/MultipleChoicePanel.tsx`
  - `packages/viewer-react/src/features/editor/EditorLayout.tsx`
  - 以及同目录下其他 panel 文件
- 建议：
  - 统一梳理编辑器面板的“外部 block -> form reset -> watch -> dispatch”模式。
  - 能抽成共享 hook 的尽量抽，减少每个 panel 单独维护副作用。

### 2.3 Demo / fixture 分支对真实后端路径形成遮蔽

- 现状：
  - `usesViewerFixtures()` 已深入大量 viewer API 模块。
  - E2E 也主要覆盖 demo role + localStorage 场景。
- 影响：
  - 本地测试通过，并不等于真实 Supabase/RLS/Edge Function 链路可靠。
  - 容易把“演示态稳定”误判成“生产态稳定”。
- 证据：
  - `packages/viewer-react/src/shared/api/viewer/core.ts`
  - `packages/viewer-react/test/e2e/viewer.spec.ts`
- 建议：
  - 保留 fixture 以支持开发提效，但要明确区分：
    - fixture 回归测试
    - 真实 Supabase smoke / integration 测试

### 2.4 Edge Function 共享能力抽取不足

- 现状：
  - Quiz 和 Mind Map 两条函数链路内存在相似的 Gemini 调用、env 获取、用户 client 创建、错误兜底与长度校验逻辑。
- 影响：
  - 一处修复无法自动继承到另一处。
  - 同类 bug 容易在两个函数中重复出现。
- 证据：
  - `supabase/functions/viewer-ai-quiz-from-docs/index.ts`
  - `supabase/functions/viewer-ai-mindmap-from-docs/index.ts`
- 建议：
  - 将稳定且纯粹的共性逻辑沉到 `supabase/functions/_shared/`。
  - 优先抽公共错误处理、Gemini 返回解析、请求校验、超限判断。

### 2.5 Edge Function 部署还未纳入自动化发布闭环

- 现状：
  - 当前 GitHub Actions 已覆盖 viewer 前端 CI / preview / production。
  - 但 AI Tutor 相关 Supabase Edge Function 仍依赖手工部署。
- 影响：
  - 前端与函数版本容易错配。
  - 修复上线、回退和环境核对的操作成本高，且依赖人工记忆。
- 证据：
  - `.github/workflows/viewer-react-preview.yml`
  - `.github/workflows/viewer-react-production.yml`
- 建议：
  - 后续至少补一条可手动触发的 Edge Function deploy workflow。
  - 再逐步考虑将函数部署接入预发 / 生产发布流程。

## 3. 低优先级

### 3.1 服务端可观测性不足

- 现状：
  - 前端已经接入基础 observability。
  - Edge Function 侧主要还是 `console.error`。
- 影响：
  - 远端异常排查依赖手工复现和日志翻查，问题定位效率较低。
- 证据：
  - `packages/viewer-react/src/shared/platform/observability.ts`
  - `supabase/functions/viewer-ai-quiz-from-docs/index.ts`
  - `supabase/functions/viewer-ai-mindmap-from-docs/index.ts`
- 建议：
  - 后续补最少一层函数级错误分类和请求上下文打点。

### 3.2 DB types 校验尚未接入常规 CI 主路径

- 现状：
  - 仓库已有 `db:types` 和 `db:types:check`。
  - 但当前未见其成为默认 CI 门禁的一部分。
- 影响：
  - 数据库 schema 演进后，前端 / 函数侧类型漂移风险仍存在。
- 证据：
  - `package.json`
  - `scripts/check-db-types.js`
- 建议：
  - 视团队节奏决定是否将 `db:types:check` 纳入 CI。

## 4. 推荐处理顺序

1. 修复基线失败测试，恢复 `pnpm test` 绿线。
2. 补齐 lint 脚本和 ESLint 门禁。
3. 统一 Supabase env 策略，消除 CI 与代码行为冲突。
4. 为 Quiz / Mind Map Edge Function 补函数级测试。
5. 逐步拆分 AI Tutor、Dashboard、Settings 等大页面。
6. 将 Edge Function 部署与回退流程文档化并纳入自动化。

## 5. 本次盘点说明

- 本文优先记录“已验证问题”，不追求一次性覆盖所有潜在重构方向。
- 这不是产品 roadmap，也不是功能 TODO；它更偏向工程稳定性和维护成本视角。
- 后续每次解决一项技术债时，建议直接更新本文件，而不是散落在聊天记录里。
