# Viewer React 发布与恢复手册

最后更新：2026-04-19

## 目的

本文档描述统一 React 前端的发布、验收和恢复方式。Primoria 当前只维护一个前端应用：`packages/viewer-react`，其中同时包含学习端和 Builder 工作台。

## 覆盖范围

- 前端：`packages/viewer-react`
- Builder 路由：
  - `/builder/dashboard`
  - `/builder/editor`
  - `/builder/editor/:courseId`
- AI Tutor 默认聊天后端：`supabase/functions/viewer-ai-tutor`
- AI Tutor 可选聊天后端：`agent-service/`（仅当配置 `VITE_AGENT_SERVICE_URL` 时启用）
- 文档转产物函数：
  - `supabase/functions/viewer-ai-quiz-from-docs`
  - `supabase/functions/viewer-ai-mindmap-from-docs`
- 推送函数：
  - `supabase/functions/viewer-push-subscribe`
  - `supabase/functions/viewer-push-unsubscribe`
  - `supabase/functions/viewer-push-dispatch`
- 相关数据库迁移：`supabase/migrations/`

## 运行环境

### 前端必需环境变量

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 前端可选环境变量

- `VITE_AGENT_SERVICE_URL`
- `VITE_GEMINI_MODEL`
- `VITE_VIEWER_DEMO_MODE`
- `VITE_GEMINI_API_KEY`
- `VITE_SENTRY_DSN`
- `VITE_POSTHOG_KEY`
- `VITE_POSTHOG_HOST`
- `VITE_VIEWER_RELEASE`
- `VITE_VIEWER_REACT_ENABLED`
- `VITE_VIEWER_AI_TUTOR_ENABLED`
- `VITE_VIEWER_COMMUNITY_ENABLED`

### Supabase / 函数侧密钥

- `GEMINI_API_KEY`

### Cloud smoke 所需变量

- `VIEWER_BASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- 烟测账号相关变量（学习者、家长、创作者）

## 后端选择顺序

- AI Tutor 聊天请求：
  - 如果设置了 `VITE_AGENT_SERVICE_URL`，前端聊天与流式回复优先走 `agent-service`
  - 如果未设置，聊天回退到 `viewer-ai-tutor`
- 文档转 quiz / 文档转 mind map：
  - 仍固定走 Supabase Edge Functions

## 发布链路

### 1. CI 主链路

- `.github/workflows/viewer-react-ci.yml`
- 当前职责：
  - Deno 测试
  - 本地 Supabase 校验
  - `viewer-react` 的 lint / typecheck / unit test / e2e / build / bundle budget
  - 主分支推送后自动执行 `deploy-supabase-functions`

### 2. 预览发布

- `.github/workflows/viewer-react-preview.yml`
- 构建预览产物，具备条件时部署到 Cloudflare Pages，并执行 preview smoke

### 3. 生产发布

- `.github/workflows/viewer-react-production.yml`
- 构建生产产物，发布到 Cloudflare Pages，并执行发布后 smoke

## 发布步骤

1. 确认数据库迁移状态

```bash
supabase db push
```

2. 确认本次需要变更的 Edge Functions

- 如果走 `main` 分支标准发布，CI 会调用 `scripts/deploy-supabase-functions.sh`
- 如果需要手工补发，可执行：

```bash
./scripts/deploy-supabase-functions.sh
```

3. 确认前端环境变量

- 生产和预览环境必须提供 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`
- 如果要启用 agent service，必须同时配置 `VITE_AGENT_SERVICE_URL`
- 如果要启用 AI 相关函数，确认 `GEMINI_API_KEY` 已就绪

4. 执行预览或生产工作流

- Cloudflare Pages 配置位于 `packages/viewer-react/wrangler.toml`

## 发布前最低验收

### 自动化命令

```bash
pnpm --filter @primoria/viewer-react lint
pnpm --filter @primoria/viewer-react typecheck
pnpm --filter @primoria/viewer-react test
pnpm --filter @primoria/viewer-react e2e
deno test --allow-env supabase/functions/
pnpm --filter @primoria/viewer-react check:bundle
```

### 人工 smoke 清单

- 学习者：
  - 登录后进入 `/home`
  - 打开课程库、报名、开始课程、完成一节课
- 个人中心与设置：
  - 保存个人资料
  - 修改一个本地偏好并刷新验证
  - 生成绑定码
- 家长：
  - 登录后确认跳转 `/parent`
  - 切换已绑定孩子并检查报告刷新
- Builder：
  - 打开 `/builder/dashboard`
  - 进入 `/builder/editor/:courseId`
  - 验证保存、发布和返回导航
- 社区与 AI Tutor：
  - 社区里的消息/笔记/学习房间至少验证一个持久化路径
  - AI Tutor 聊天可正常返回
  - 资料上传后能生成 quiz 或 mind map

## 恢复步骤

1. 先暂停有问题的生产发布，或关闭受影响的 feature flag
2. 记录失败时间、页面、账号、环境变量版本和最近提交
3. 默认优先 fix forward，不在没有明确批准时回滚数据库迁移
4. 在预览环境重跑 smoke 后再重新发版

## 责任边界

- 前端：`packages/viewer-react`
- 数据库与函数：`supabase/`
- 可选 AI 聊天服务：`agent-service/`
- 发布窗口和验收：当前发布负责人
