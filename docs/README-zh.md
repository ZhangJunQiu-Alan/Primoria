# Primoria 文档索引

最后更新：2026-04-19

## 文档原则

- `docs/` 只保留当前仍用于开发、测试、发布和运维的活文档。
- 中文是唯一维护主档；英文重复文档和课程作业/汇报模板页已移除。
- 所有技术债、半成品功能和产品待办统一收敛到 [technical-debt-register-zh.md](./technical-debt-register-zh.md)。
- [changelog.md](./changelog.md) 只记录已经落地的历史变更，不代表当前健康度。

## 仓库组成

- `packages/schema/`：课程 JSON schema、迁移兼容与 fixtures
- `packages/db/`：Supabase 生成类型
- `packages/viewer-react/`：统一的 Viewer + Builder React 应用
- `supabase/`：数据库迁移、RLS、RPC 与 Edge Functions
- `agent-service/`：可选 AI Tutor 聊天服务
- `external-tests/`：独立的 Python API 级黑盒测试

## 当前质量基线（2026-04-19）

- `pnpm --filter @primoria/viewer-react typecheck`：通过
- `pnpm --filter @primoria/viewer-react lint`：通过，当前有 `0 errors / 52 warnings`
- `pnpm --filter @primoria/viewer-react test`：通过，当前工作区 `141/141` 通过
- `deno test --allow-env supabase/functions/`：`62/62` 通过
- `cd agent-service && uv run pytest -q`：`2/2` 通过
- 详细背景、影响和解决顺序见 [technical-debt-register-zh.md](./technical-debt-register-zh.md)

## 验证入口速查

| 我现在要验证什么 | 推荐命令 | 说明 |
| --- | --- | --- |
| 本地静态检查与单测 | `pnpm --filter @primoria/viewer-react lint` / `typecheck` / `test` | 不依赖真实后端烟测账号 |
| 本地 fixture 浏览器回归 | `pnpm --filter @primoria/viewer-react e2e:fixture` | 兼容旧入口 `e2e`；只验证 `VITE_VIEWER_DEMO_MODE=1` 的本地链路 |
| 已部署预览环境 smoke | `VIEWER_PREVIEW_URL=... pnpm --filter @primoria/viewer-react verify:preview` | 兼容旧入口 `smoke:preview`；只验证部署壳层、静态资源和响应头 |
| 真实 Supabase / 浏览器 smoke | `VIEWER_BASE_URL=... SUPABASE_URL=... SUPABASE_SECRET_KEY=... pnpm --filter @primoria/viewer-react verify:cloud` | 兼容旧入口 `smoke:cloud`；验证真实账号、真实数据读写和 Dashboard analytics |

## 活文档

- [technical-debt-register-zh.md](./technical-debt-register-zh.md)：唯一技术债总账与处理顺序
- [prd-zh.md](./prd-zh.md)：当前产品基线与范围边界
- [database-schema-zh.md](./database-schema-zh.md)：Supabase 实际 schema 与迁移说明
- [course-json-guide-zh.md](./course-json-guide-zh.md)：课程 JSON 当前规范
- [dashboard-zh.md](./dashboard-zh.md)：Builder Dashboard 当前结构说明
- [test-checklist-zh.md](./test-checklist-zh.md)：统一回归清单
- [viewer-react-cutover-runbook.md](./viewer-react-cutover-runbook.md)：发布、验收与恢复手册
- [viewer-react-interactions.md](./viewer-react-interactions.md)：当前关键交互清单
- [user-survey-nonusers-zh.md](./user-survey-nonusers-zh.md)：潜在用户问卷
- [changelog.md](./changelog.md)：历史变更记录

## 常用命令

```bash
pnpm install

# 前端主应用
pnpm --filter @primoria/viewer-react lint
pnpm --filter @primoria/viewer-react typecheck
pnpm --filter @primoria/viewer-react test
pnpm --filter @primoria/viewer-react build
pnpm --filter @primoria/viewer-react e2e:fixture

# 已部署预览环境 smoke（兼容旧入口 smoke:preview）
VIEWER_PREVIEW_URL=https://<preview-url> pnpm --filter @primoria/viewer-react verify:preview

# 真实后端 cloud smoke（兼容旧入口 smoke:cloud）
VIEWER_BASE_URL=https://<viewer-url> SUPABASE_URL=... SUPABASE_SECRET_KEY=... pnpm --filter @primoria/viewer-react verify:cloud

# Edge Functions
deno test --allow-env supabase/functions/

# Agent Service
cd agent-service && uv run pytest -q

# 外部黑盒测试（需要本地 Supabase 和 external-tests/.env）
cd external-tests && pytest -q
```

## 维护约定

- 文档描述“当前真实状态”，不再重复维护第二份待办页。
- 架构说明页只描述已经落地的结构；未完成项统一链接回技术债总账。
- 如果代码与文档冲突，以代码和验证结果为准，并优先更新文档。
