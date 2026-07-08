# Primoria 腾讯云 PostgreSQL 迁移与模型配置评估报告

日期：2026-07-08  
报告范围：本报告覆盖本轮从 Supabase 运行依赖切到腾讯云 PostgreSQL、自研认证、MiniMax/OpenRouter 模型配置、KG embeddings 补齐与验证的工作。  
敏感信息处理：本文不记录任何 API key、数据库密码、服务器密码或完整连接串。

## 1. 结论摘要

Primoria 目前已经可以脱离 Supabase 作为运行依赖。当前运行目标是腾讯云服务器上的独立 PostgreSQL 数据库 `primoria`，应用侧认证切到自研 `users / identities / sessions`，KG 基础数据和 MiniMax embeddings 已写入腾讯云库。

当前状态：

| 项目 | 状态 |
| --- | --- |
| 腾讯云独立数据库 | 已创建 `primoria` 数据库和 `primoria_app` 用户 |
| Supabase runtime 依赖 | 已从主要运行路径移除 |
| 本地 web env | 已指向腾讯云 PostgreSQL SSH tunnel |
| agent env | 已写入 MiniMax/OpenRouter 可用模型配置 |
| Drizzle 迁移 | 已应用到当前最新迁移，迁移记录 34 条，对应 `0033` 为最新文件 |
| KG graph 数据 | 已导入，20 graphs / 366 topics / 879 concepts / 1043 edges |
| KG embeddings | 已补齐，MiniMax `embo-01` 1245 / 1245，无缺失 |
| 备份 | 已配置每日 `pg_dump -Fc`，手动备份已验证 |
| Supabase 旧业务数据 | 未迁移；按当前测试阶段判断可以丢弃 |
| 生产部署 | 未做，仅完成本地和服务器数据库侧准备 |

需要评估的核心判断：

1. 如果测试阶段数据可以丢弃，则不需要再从 Supabase 做数据迁移。
2. 腾讯云库已经具备从空用户状态重新开始测试的条件。
3. MiniMax embedding 已实际跑通，比继续等待 Supabase/旧 embedding 数据更直接。
4. 账号找回/重置密码目前被降级为不可用，需要产品上决定是接入自研邮件流程，还是先隐藏入口。
5. 提交时应继续按主题拆分：数据库/auth/embedding、运行时安全加固、Tutor UI 文案、文档口径分别评审。

## 2. 当前数据库状态

目标数据库：腾讯云 PostgreSQL，数据库名 `primoria`，应用用户 `primoria_app`。  
连接方式：本地开发通过 SSH tunnel `127.0.0.1:15432 -> 服务器 127.0.0.1:5432`。  
公网暴露：PostgreSQL 继续只监听服务器本机 `127.0.0.1:5432`，未开放公网 5432。

服务器只读核验结果：

| 指标 | 数量 |
| --- | ---: |
| public tables | 25 |
| workspace tables | 0 |
| Drizzle migrations | 34 |
| KG graphs | 20 |
| KG topics | 366 |
| KG concepts | 879 |
| KG edges | 1043 |
| source nodes for embedding | 1245 |
| MiniMax embeddings | 1245 |
| missing MiniMax embeddings | 0 |
| users | 0 |
| courses | 0 |

说明：

- `users=0`、`courses=0` 是预期状态，因为没有从 Supabase 迁移旧测试数据。
- `workspace_tables=0` 符合前面砍掉 workspace 线后的目标状态。
- `source_nodes=1245` 等于 `MiniMax embeddings=1245`，说明所有 topic/concept 节点均有对应向量。

## 3. 已完成的服务器侧工作

### 3.1 独立数据库与角色

已在腾讯云服务器上完成：

- 创建独立 PostgreSQL 数据库：`primoria`
- 创建独立数据库用户：`primoria_app`
- 生成独立强密码，仅写入本项目 ignored env
- 未复用 `lumina` 数据库、用户、JWT secret 或 PostgREST token
- 未修改 `/home/ubuntu/lumina`

已确认：

- `lumina` 数据库仍存在，未被本次操作改动
- `lumina` 角色仍存在，未被本次操作改动
- PostgreSQL 5432 仅对服务器本机监听

### 3.2 Drizzle 迁移

已对腾讯云目标库执行当前代码库的 Drizzle 迁移。迁移结果：

- 迁移成功完成
- 迁移记录表存在
- `drizzle.__drizzle_migrations` 当前为 34 条
- 本地迁移目录最新 SQL 文件为 `0033_mature_big_bertha.sql`

### 3.3 KG 数据导入

已执行 KG schema 和数据种子：

- `migrate-kg`
- `seed-kg all`
- `seed-kg-cross`

导入结果：

- 20 个 graph
- 366 个 topic
- 879 个 concept
- 1043 条 edge

### 3.4 pgvector

迁移过程中发现目标 PostgreSQL 没有 `vector` extension。已处理：

- 在服务器安装 `postgresql-16-pgvector`
- 在 `primoria` 数据库中启用 `CREATE EXTENSION vector`

这是 KG embeddings 能写入 `vector(1536)` 的前提。

### 3.5 备份

已配置：

- 备份目录：`/home/ubuntu/backups/primoria`
- 备份脚本：`/home/ubuntu/bin/backup-primoria-db.sh`
- cron：`/etc/cron.d/primoria-db-backup`
- 格式：`pg_dump -Fc`
- 保留策略：仅作用于 Primoria backup 目录

已验证：

- 手动备份生成：`primoria-20260707T193730Z.dump`
- `pg_restore --list` 可读取备份
- cron 文件存在

## 4. 本地 env 状态

以下文件已写入，并确认被 git ignore：

| 文件 | 状态 | 用途 |
| --- | --- | --- |
| `apps/web/.env.local` | ignored | web 本地开发、数据库、模型、KG embedding |
| `apps/agent/.env` | ignored | LangGraph agent 模型配置 |
| `ops/.env.tencent-primoria` | ignored | 腾讯云服务器和数据库运维信息 |

`apps/web/.env.local` 当前包含的 key 名称：

- `DATABASE_URL`
- `AI_PROVIDER`
- `ANTHROPIC_BASE_URL`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `OPENAI_BASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `NEXT_PUBLIC_USE_COPILOTKIT`
- `KG_EMBEDDING_PROVIDER`
- `MINIMAX_API_KEY`
- `MINIMAX_EMBEDDING_BASE_URL`
- `MINIMAX_EMBEDDING_MODEL`
- `KG_EMBEDDING_MODEL_VERSION`

`apps/agent/.env` 当前包含的 key 名称：

- `AI_PROVIDER`
- `ANTHROPIC_BASE_URL`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `OPENAI_BASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

`ops/.env.tencent-primoria` 当前包含腾讯云服务器和数据库连接所需变量，包含敏感值，禁止提交。

重要说明：

- 没有写入 Supabase frontend URL 或 anon key。
- 没有写入 `PRIMORIA_WORKSPACE_DEEPAGENT*`，因为 workspace 运行线已被删除。
- OpenRouter 的 `deepseek/deepseek-v4-flash:free` 实测不可用，因此 env 中写的是可用的 `deepseek/deepseek-v4-flash`。

## 5. 模型与 API Key 验证结果

### 5.1 MiniMax chat

配置：

- provider：`anthropic-compatible`
- base URL：MiniMax Anthropic-compatible endpoint
- model：`MiniMax-M2.7`

最小请求结果：

- HTTP 200
- 有正常 content 返回
- 判定：可用

用途：

- web tutor / agent 主模型可以使用 MiniMax
- `AI_PROVIDER=anthropic-compatible`
- `ANTHROPIC_MODEL=MiniMax-M2.7`

### 5.2 MiniMax embedding

配置：

- provider：`minimax`
- endpoint：MiniMax native `/v1/embeddings`
- model：`embo-01`
- request body：`texts + type`
- document embedding：`type=db`
- query embedding：`type=query`

最小请求结果：

- HTTP 200
- 返回 1536 维向量
- 不需要 `GroupId`
- 判定：可用

用途：

- KG 节点向量写库
- KG search 查询向量生成

### 5.3 OpenRouter chat

你提供的原始模型：

- `deepseek/deepseek-v4-flash:free`

实测结果：

- HTTP 404
- OpenRouter 返回免费版本不可用
- 需要使用 paid slug：`deepseek/deepseek-v4-flash`

改用 paid slug 后：

- HTTP 200
- 有正常 content 返回
- 判定：可用

### 5.4 OpenRouter embedding

测试模型：

- `openai/text-embedding-3-small`

实测结果：

- HTTP 200
- 返回 1536 维向量
- 判定：可用

当前选择：

- 虽然 OpenRouter embedding 可用，但本项目现在已将 KG embedding 配成 MiniMax `embo-01`。
- 原因是 MiniMax key 已能覆盖 chat + embedding，且返回维度与现有 `vector(1536)` 完全兼容。

## 6. KG embeddings 已完成补齐

本轮已用 MiniMax `embo-01` 跑完整 KG embeddings。

执行对象：

- `temple/*.json` 中的 20 个 subject graph
- topic 节点
- concept 节点

写入表：

- `public.kg_node_embeddings`

写入字段：

- `graph_id`
- `node_id`
- `kind`
- `embed_text`
- `embedding`
- `model_version`
- `created_at`
- `updated_at`

当前 model version：

```text
minimax:embo-01:1536
```

逐 graph seed 输出：

| graph | embeddings |
| --- | ---: |
| Python | 57 |
| a_level_biology | 83 |
| a_level_chemistry | 102 |
| a_level_mathematics | 112 |
| a_level_physics | 135 |
| artificial_intelligence | 45 |
| computer_architecture | 54 |
| computer_network | 30 |
| computer_systems | 78 |
| data_structures_and_algorithms | 77 |
| deep_learning | 54 |
| discrete_math_and_probability | 95 |
| information_theory | 20 |
| introduction_to_computer_science | 66 |
| linear_algebra | 34 |
| machine_learning | 59 |
| mit_calculus | 72 |
| numerical_analysis | 23 |
| software_construction | 23 |
| web_applications | 26 |
| Total | 1245 |

验证结果：

```text
source_nodes=1245
minimax_embeddings=1245
minimax_graphs=20
missing_minimax_embeddings=0
```

真实 KG search 测试：

输入：

```text
I want to learn neural networks
```

结果：

```json
{
  "modelVersion": "minimax:embo-01:1536",
  "count": 3,
  "top": [
    {
      "graphId": "deep_learning",
      "kind": "topic",
      "nodeId": "dl_architectures_transfer_dl_transfer_learning",
      "similarity": 0.931
    },
    {
      "graphId": "deep_learning",
      "kind": "concept",
      "nodeId": "dl_transfer_learning",
      "similarity": 0.8807
    },
    {
      "graphId": "deep_learning",
      "kind": "topic",
      "nodeId": "dl_rnn_seq_dl_lstm",
      "similarity": 0.8716
    }
  ]
}
```

结论：

- 查询端也在使用 MiniMax query embedding。
- 写入端和召回端的 `modelVersion` 一致。
- KG search 链路可用。

## 7. 代码改动摘要

### 7.1 自研认证替代 Supabase runtime

核心变化：

- `requireAuth()` 改为基于自研 `getCurrentUser()` / DB session。
- `proxy.ts` 改为检查 `primoria_session` cookie。
- 登录/注册 UI 固定走 `/api/auth/sign-in` 和 `/api/auth/sign-up`。
- 账号页改为使用自研用户数据。
- 登出改为清理自研 session。
- `mastery/store.ts` 改为 Drizzle + 当前用户，不再依赖 Supabase client。
- 忘记密码/重置密码暂时显示不可用，避免继续调用已移除的 Supabase recovery。

删除的 Supabase runtime 文件：

- `apps/web/src/lib/supabase/client.ts`
- `apps/web/src/lib/supabase/env.ts`
- `apps/web/src/lib/supabase/middleware.ts`
- `apps/web/src/lib/supabase/server.ts`

依赖变化：

- 移除 web app 直接依赖 `@supabase/ssr`
- 移除 web app 直接依赖 `@supabase/supabase-js`

注意：

- lockfile 中仍可能存在 Supabase 包作为其它依赖的传递依赖，这不等于 Primoria runtime 仍直接依赖 Supabase。

### 7.2 KG embedding provider 支持

新增/修改：

- `apps/web/src/lib/knowledge-graph/embeddings.ts`
- `apps/web/scripts/kg-db-common.mjs`
- `apps/web/scripts/seed-kg-embeddings.mjs`

支持两种 provider：

```text
KG_EMBEDDING_PROVIDER=openai-compatible
KG_EMBEDDING_PROVIDER=minimax
```

MiniMax 分支：

- 使用 `MINIMAX_API_KEY`
- 默认 endpoint：`https://api.minimax.chat/v1`
- 当前 env 实际使用：`https://api.minimaxi.com/v1`
- 默认模型：`embo-01`
- 写库时使用 `type=db`
- 查询时使用 `type=query`
- 强校验维度为 1536

### 7.3 文档和 env 示例

已同步：

- `README.md`
- `apps/web/.env.example`
- `docs/supabase-cloud.md`
- `apps/web/scripts/check-database.ts`

文档方向：

- Primoria 不再要求 Supabase URL / anon key。
- 本地开发通过 SSH tunnel 连接腾讯云私有 PostgreSQL。
- KG embeddings 支持 OpenAI-compatible 和 MiniMax 两种配置。

## 8. 验证记录

本轮已执行或核验：

| 验证项 | 结果 |
| --- | --- |
| SSH 登录腾讯云 | 通过 |
| `sudo -u postgres psql` | 通过 |
| PostgreSQL 私有监听 | 通过 |
| 独立 `primoria` DB / `primoria_app` 用户 | 通过 |
| 未改动 `lumina` DB / 用户 / 目录 | 通过 |
| Drizzle migrate | 通过 |
| KG schema/data seed | 通过 |
| pgvector 安装和 extension 启用 | 通过 |
| MiniMax chat key | 通过 |
| MiniMax embedding key | 通过 |
| OpenRouter key | 通过 |
| OpenRouter `:free` DeepSeek slug | 不通过，已改 paid slug |
| OpenRouter paid DeepSeek slug | 通过 |
| KG embeddings full seed | 通过 |
| KG search real query | 通过 |
| backup script manual run | 通过 |
| `git diff --check` | 通过 |
| typecheck | 通过，基于迁移后代码状态已跑过 |
| vitest | 44 / 44 通过，基于迁移后代码状态已跑过 |
| lint | 0 errors，仍有 2 个既有 warnings |
| Next build | 通过，基于迁移后代码状态已跑过 |
| 自研 sign-up + `/api/auth/me` | 通过，测试用户已清理 |

lint 既有 warnings：

- `apps/web/src/components/course/block-renderer.tsx` 使用 `<img>`
- `apps/web/src/components/course/course-detail-client.tsx` effect 内同步 `setState`

这两个 warning 不是本次数据库迁移引入的。

## 9. 未完成或刻意不做的部分

### 9.1 未迁移 Supabase 旧数据

原因：

- 你已确认当前仍是测试阶段，Supabase 旧数据可以丢弃。
- 因此没有继续要求 Supabase PostgreSQL `DATABASE_URL`。
- 没有做 `pg_dump` / `pg_restore` 数据迁移。

影响：

- 腾讯云库里 `users=0`、`courses=0`。
- 所有用户需要重新注册。
- 旧课程、旧聊天、旧学习事件不会保留。

判断：

- 对测试阶段是合理取舍。
- 如果后续突然需要保留旧数据，仍需要 Supabase Database connection string，而不是 frontend URL / anon key。

### 9.2 未恢复 workspace flags

你提供的 env 中有：

```text
PRIMORIA_WORKSPACE_DEEPAGENT=1
PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE=memory
```

未写入原因：

- workspace 运行线已删除。
- 继续写入这些 flags 会制造误导，让人以为 workspace runtime 仍存在。

### 9.3 密码找回/重置

当前状态：

- `forgot` / `reset-password` 已接入自研一次性 token 流程。
- token 只以 hash 形式存入 `otp_codes`，过期时间默认 30 分钟。
- 邮件发送层使用腾讯云 SES `SendEmail` API + 已审核模板。
- 重置成功后会更新 `identities.password_hash` 并删除该用户旧 session。

仍需业务侧完成：

1. 在腾讯云 SES 控制台开通服务。
2. 验证发信域名和发信地址。
3. 创建并等待密码重置模板审核通过。
4. 将 SES SecretId/SecretKey、发信地址、模板 ID 写入部署环境。

### 9.4 未部署生产环境

当前完成的是：

- 本地 env
- 腾讯云数据库
- 服务器备份
- 代码改动
- 本地验证

尚未完成：

- 正式部署 web/agent 到服务器
- 设置服务器应用进程管理
- 设置生产环境变量
- 绑定域名/HTTPS
- 生产日志/监控

## 10. 当前工作树注意事项

报告生成时，git 工作树除了迁移/auth/embedding/env/docs 相关改动，还存在若干额外改动，例如：

- `apps/agent/src/graph.mjs`
- `apps/web/src/app/globals.css`
- `apps/web/src/components/generative-ui/*`
- `apps/web/src/components/tutor/copilot-chat-surface.tsx`
- `apps/web/src/hooks/use-primoria-copilot.tsx`
- 若干测试文件

这些文件不全部属于数据库迁移工作。评估和提交时建议分开处理：

1. 数据库迁移 + auth cutover + env/docs。
2. KG embedding provider + MiniMax seed。
3. 其它 UI / generative-ui / tutor 体验改动。

## 11. 风险清单

### 11.1 API key 已在对话中出现

你把 MiniMax 和 OpenRouter key 直接发在对话里。虽然我只写入 ignored env，没有写进 git，但对正式生产来说，建议：

- 当前验证完成后生成新 key。
- 替换本地 env 和部署 env。
- 将旧 key 作废或限制额度。

### 11.2 腾讯云单机数据库是轻量方案

当前腾讯云服务器被定位为共享轻量 DB 服务器。风险：

- 单机故障会影响所有项目。
- 默认没有托管数据库的自动高可用。
- 备份恢复需要人工演练。

建议：

- 保留每日 dump。
- 定期把备份同步到另一个位置。
- 做一次 `pg_restore` 到临时库的恢复演练。

### 11.3 MiniMax embedding 召回阈值需要重新校准

之前 KG recall 阈值是基于旧 embedding provider 调出来的。现在换成 MiniMax `embo-01` 后：

- similarity 分布可能变化。
- `KG_POSITION_TAU`
- `KG_POSITION_FLOOR`
- `KG_BROAD_MENU_SIMILARITY_WINDOW`
- Stage-2 candidate window

这些都应该用真实 query 重新扫一遍。当前只验证“能召回”，还没有重新做阈值评估。

### 11.4 自研 auth 还缺产品化账号能力

当前自研 auth 已能注册、登录、session、登出，但还缺：

- 邮箱验证策略
- 忘记密码
- 重置密码
- 账号删除
- 登录安全事件
- 多设备 session 管理

测试阶段可以接受，正式上线前要补。

已补充：

- 登录/注册接口共享 PostgreSQL-backed 限流，默认 IP 和邮箱各 60 秒 5 次。

### 11.5 AI endpoint 限流仍未完成

之前项目审查里已指出：AI 端点没有限流。迁到腾讯云不会自动解决这个问题。

仍建议优先做：

- `/api/copilotkit` 用户级限流
- 课程生成限流
- 图片/媒体生成限流
- KG position/search 的滥用保护

### 11.6 iframe sandbox 问题仍未处理

之前安全审查中提到的 widget iframe `allow-scripts allow-same-origin` 问题仍属于高优先级安全项。本次迁移没有处理。

## 12. 建议评估清单

你可以按这个顺序评估：

### 12.1 数据库

- 确认 Supabase 旧数据确实可以丢弃。
- 确认腾讯云 `primoria` 是新的唯一开发数据库。
- 确认 `users=0`、`courses=0` 是可接受状态。
- 确认 KG count 和 embedding count 满足预期。

### 12.2 模型

- 用 MiniMax 跑几条真实 tutor 对话。
- 用 KG positioning 跑 20-50 条真实学习目标。
- 检查 MiniMax embedding 的召回排序是否符合直觉。
- 对比 OpenRouter `text-embedding-3-small` 是否有必要作为 fallback。

### 12.3 认证

- 注册新账号。
- 登录。
- 刷新页面保持 session。
- 登出。
- 访问受保护页面时未登录跳转。
- API route 未登录时拒绝。

### 12.4 课程链路

- 注册新账号后创建课程。
- 进入课程详情页。
- lesson generation worker 正常处理。
- quiz / learning event / mastery 能写入腾讯云 DB。
- learner facts / extractor job 如仍使用，确认同一 `DATABASE_URL`。

### 12.5 备份

- 手动运行 backup。
- `pg_restore --list` 检查 dump。
- 做一次临时库恢复演练。

## 13. 建议下一步

优先级建议：

1. 重新跑一组 KG positioning 真实样本，校准 MiniMax embedding 下的阈值。
2. 推送并跑真实 GitHub CI。
3. 启动本地完整链路：web + agent + worker + Tencent DB。
4. 增加 AI endpoint 限流。
5. 修 iframe sandbox。
6. 决定忘记密码/重置密码的产品策略。
7. 做一次腾讯云备份恢复演练。

## 14. 建议提交拆分

如果要提交，建议至少拆成：

### Commit 1: Move Primoria auth/runtime off Supabase

包含：

- 自研 auth guard / proxy
- 登录注册 UI 切换
- account / signout / forgot / reset 调整
- 腾讯云 SES 密码重置邮件
- 删除 Supabase runtime helper
- 移除 direct Supabase deps
- README / env example / docs 更新

### Commit 2: Add MiniMax KG embedding support

包含：

- `embeddings.ts`
- `kg-db-common.mjs`
- `seed-kg-embeddings.mjs`
- env example 的 MiniMax embedding 配置
- README 的 KG embedding provider 说明

### Commit 3: Add runtime hardening

包含：

- QA route gating
- 多实例安全的 session 校验
- 数据库 SSL 配置
- 登录/注册限流

### Commit 4: Add migration evaluation report and docs cleanup

包含：

- 本报告文件
- README / docs / AGENTS / CLAUDE 口径统一

其它 generative-ui / tutor UI 改动建议另行审查后单独提交。

## 15. 评估结论

从工程状态看，本次迁移已经达到“可以停止依赖 Supabase、以腾讯云 PostgreSQL 作为新测试起点”的标准。

从产品上线标准看，还没达到生产就绪。主要差距不在数据库迁移，而在：

- 自研账号能力不完整
- AI 成本端点限流缺失
- widget sandbox 风险未修
- MiniMax embedding 后的 KG 阈值未重新系统评估
- 备份恢复还未演练

如果当前目标是继续测试核心学习链路，那么可以基于腾讯云库继续；如果目标是对外开放真实用户，应先补上述风险项。
