# 技术债清单

最后更新：2026-04-16

## 目的

记录 Primoria 当前已确认的技术债，重点覆盖会直接影响稳定性、发布效率、测试可信度和后续开发速度的问题。

## 1. 高优先级

### 1.1 基线测试当前不是全绿

- 现状：`pnpm test` 当前会失败。已确认失败用例：`packages/viewer-react/test/settingsPage.test.tsx`
- 影响：主干不具备"测试通过即可合并/发布"的最低可信度；后续改动很难判断是新回归还是旧问题未清。
- 建议：修复设置中心到帮助中心的路由回归，将 `pnpm test` 恢复为稳定绿线。

## 2. 中优先级

### 2.1 关键前端页面过于单体

- 现状：`DashboardPage.tsx`、`AiTutorPage.tsx`、`AiTutorMindMapEditorPage.tsx`、`CommunityPage.tsx`、`SettingsPage.tsx` 体量偏大，单文件同时承载数据请求、副作用、状态同步和 UI。
- 影响：回归面过大，审查和重构成本持续升高。
- 建议：按"页面壳层 / 数据逻辑 / 交互 hooks / 纯展示组件"拆分，优先从 AI Tutor 和 Dashboard 开始。

### 2.2 编辑器状态同步模型仍偏脆弱

- 现状：多处使用 `eslint-disable-line react-hooks/exhaustive-deps` 压掉 Hook 依赖检查，主要集中在编辑器属性面板和编辑器壳层。
- 影响：表单重置、局部同步、草稿切换容易出现陈旧闭包或状态覆盖，以"偶发 UI 不同步"形式出现，难排查。
- 建议：统一梳理编辑器面板的"外部 block → form reset → watch → dispatch"模式，能抽共享 hook 的尽量抽。

### 2.3 Demo / fixture 分支对真实后端路径形成遮蔽

- 现状：`usesViewerFixtures()` 深入大量 viewer API 模块；E2E 主要覆盖 demo role + localStorage 场景。
- 影响：本地测试通过不等于真实 Supabase/RLS/Edge Function 链路可靠，容易误判生产态稳定性。
- 建议：保留 fixture 支持开发，但明确区分 fixture 回归测试与真实 Supabase smoke / integration 测试。

### 2.4 Edge Function 共享能力抽取不足

- 现状：Quiz 和 Mind Map 两条函数链路内存在相似的 Gemini 调用、env 获取、用户 client 创建、错误兜底与长度校验逻辑。
- 影响：一处修复无法自动继承到另一处，同类 bug 容易重复出现。
- 建议：将公共错误处理、Gemini 返回解析、请求校验、超限判断沉到 `supabase/functions/_shared/`。

### 2.5 Edge Function 部署还未纳入自动化发布闭环

- 现状：GitHub Actions 已覆盖 viewer 前端 CI / preview / production，但 AI Tutor 相关 Edge Function 仍依赖手工部署。
- 影响：前端与函数版本容易错配，修复上线和回退依赖人工记忆。
- 建议：补一条可手动触发的 Edge Function deploy workflow，再逐步接入预发 / 生产发布流程。

## 3. 低优先级

### 3.1 服务端可观测性不足

- 现状：前端已接入基础 observability；Edge Function 侧主要还是 `console.error`。
- 影响：远端异常排查依赖手工复现和日志翻查。
- 建议：补最少一层函数级错误分类和请求上下文打点。

### 3.2 DB types 校验尚未接入常规 CI 主路径

- 现状：仓库已有 `db:types` 和 `db:types:check`，但未成为默认 CI 门禁。
- 影响：数据库 schema 演进后，前端 / 函数侧类型漂移风险仍存在。
- 建议：视团队节奏决定是否将 `db:types:check` 纳入 CI。
