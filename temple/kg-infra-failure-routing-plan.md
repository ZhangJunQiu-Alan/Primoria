# KG Infrastructure Failure Routing Plan

本文档给后续 Coding Agent 使用，目标是一次性修复 `temple/browser-qa-issue-list-2026-07-09.md` 的问题 1：

> 本地数据库缺 KG 表时，onboarding 直接向用户暴露数据库错误。

本方案只提供实现上下文和目标行为。当前请求不要求直接改代码。

## 最终决策

必须区分两类情况：

1. **KG coverage miss**：KG 系统正常，但课程库没有覆盖用户目标。
   - 示例：用户输入 `我想了解一下五四精神及背后的意义`，但正式 KG 没有人文主题。
   - 目标行为：允许走 `out_of_library`，生成 `gen_*` 自定义图谱和课程。
2. **KG infrastructure failure**：KG 系统本身坏了。
   - 示例：`public.kg_node_embeddings` 表不存在、DB 连不上、embedding provider 不可用。
   - 目标行为：生产环境友好失败并报警，不能把所有用户目标静默转成 `gen_*`。

一句话原则：

```txt
业务没覆盖，生成自定义课程；系统坏了，友好失败并报警；本地调试需要继续跑，用显式开关临时降级。
```

## 明确非目标

本任务**不做**历史数据清理。

不要新增脚本或 migration 去清理已经写入 profile 的旧 SQL 错误文案，例如：

```txt
relation "public.kg_node_embeddings" does not exist
```

只需要保证新错误不再裸露、不再被原样持久化。

## 当前代码路径

### KG 搜索

`apps/web/src/lib/knowledge-graph/search.ts`

- `searchKnowledgeGraphNodes()` 会先创建 query embedding。
- 然后查询 `public.kg_node_embeddings`，并 join `knowledge_graph_topics` / `knowledge_graph_concepts`。
- 如果 `kg_node_embeddings` 表不存在，Postgres 会抛 `42P01`。
- 当前该错误会一路向上 throw。

关键点：

```ts
const queryEmbedding = await createKnowledgeGraphEmbedding(encodedQuery.embeddingQuery);
const result = await pool.query(... from public.kg_node_embeddings ...)
```

这意味着：

- embedding provider 失败发生在查表之前。
- 表缺失失败发生在 DB query 阶段。
- 这两类错误不能混为一谈。

### 目标定位核心

`apps/web/src/lib/knowledge-graph/position-learning-goal.ts`

当前 `positionLearningGoal()` 已经支持低相似度/无结果时走 freeform gate：

```txt
searchKnowledgeGraphNodes
  -> 如果 results 为空或 maxSimilarity < floor
  -> runFreeformGoalGate
  -> finalizeStage2
  -> out_of_library 或 fallback
```

但如果 `searchKnowledgeGraphNodes()` 自身 throw，代码还没有机会进入 freeform gate。

这就是问题 1 的关键缺口。

### Freeform Gate

`apps/web/src/lib/knowledge-graph/freeform-goal-gate.ts`

`runFreeformGoalGate()` 用于判断低置信召回后的用户目标：

- `out_of_library`：真实、具体、可教学，且库里没有覆盖。
- `fallback`：太泛、无意义、不是学习目标，或已经被库内主题覆盖。

这个 gate 应继续作为“KG 正常但没有合适命中”的判断层。

### Generated Graph

`apps/web/src/lib/knowledge-graph/generated-graph.ts`

`getOrCreateGeneratedGraph()` 写入 `generated_topic_graphs`，用于库外目标沉淀。它不依赖正式 KG seed 数据。

注意：这不代表系统故障时可以无条件生成 `gen_*`。`gen_*` 是业务扩展能力，不是掩盖生产 KG 故障的兜底。

### Onboarding 泄露点

`apps/web/src/app/api/onboarding/goal/route.ts`

- 后台定位失败时，当前会把 `error.message` 传给 `saveLearningGoalPositioningFailure()`。
- 同步提交 clarify graphId 失败时，当前 catch 会直接返回 `error.message`。

`apps/web/src/app/api/onboarding/background/route.ts`

- `buildOnboardingCourse()` 失败时，当前 catch 会直接返回 `error.message`。

这些 route 都需要接入安全错误映射。

## 目标行为矩阵

| 场景 | 生产环境 | 本地开发 / QA |
|---|---|---|
| KG 正常，命中正式图谱 | 使用正式 KG 创建课程 | 同生产 |
| KG 正常，但目标库外 | 走 freeform gate，生成 `gen_*` | 同生产 |
| 用户输入太模糊 | 友好提示用户说具体一点 | 同生产 |
| `kg_node_embeddings` 表不存在 | 友好失败 + 日志/health degraded，不生成 `gen_*` | 仅当显式开关开启时可降级到 freeform gate |
| DB 连不上或超时 | 友好失败 + 日志/health unhealthy，不生成 `gen_*` | 不建议降级 |
| embedding provider 缺配置/不可用 | 友好失败 + 日志，不生成 `gen_*` | 不建议降级 |

## 环境策略

不要用 `NODE_ENV !== "production"` 自动决定降级。

必须使用显式开关：

```bash
PRIMORIA_ALLOW_KG_INFRA_FALLBACK=1
```

默认关闭。

含义：

- 未配置时：KG infrastructure failure 只返回安全错误，不生成 `gen_*`。
- 配置为 `1` 时：只允许 `kg_schema_missing` 这一类错误合成 empty search，然后继续走 freeform gate。

不要把 DB 连接失败、embedding 失败、超时、provider quota 等错误纳入这个降级开关。

## 推荐实现步骤

### 1. 新增 KG 错误分类模块

建议新增：

```txt
apps/web/src/lib/knowledge-graph/errors.ts
```

建议类型：

```ts
export type KnowledgeGraphFailureKind =
  | "kg_schema_missing"
  | "kg_schema_drift"
  | "kg_unseeded"
  | "embedding_unavailable"
  | "db_unavailable"
  | "unknown";

export class KnowledgeGraphUnavailableError extends Error {
  readonly kind: KnowledgeGraphFailureKind;
  readonly cause?: unknown;
}
```

分类建议：

- `42P01`：`kg_schema_missing`
  - Postgres undefined table，例如 `relation "public.kg_node_embeddings" does not exist`。
- `42703`：`kg_schema_drift`
  - Postgres undefined column，说明 schema 和代码不匹配。
- `ECONNREFUSED` / `ECONNRESET` / `ETIMEDOUT` / `ENOTFOUND` / `EHOSTUNREACH` / `57P01` / `57P02` / `57P03` / `53300`：`db_unavailable`
- `Missing OPENAI` / `Embedding request failed` / provider timeout / provider network：`embedding_unavailable`
- 其他：`unknown`

优先用结构化字段：

```ts
const code = typeof record.code === "string" ? record.code : "";
```

不要把 message regex 当主判断。message 只能作为 provider 这类没有 code 的次级 fallback。

### 2. 在 `positionLearningGoal()` 共享核心中处理 search failure

不要只在 onboarding API route 里 catch。

`positionLearningGoal()` 是 Home 和 onboarding 共用的目标定位核心，策略应放在这里。

建议结构：

```ts
let search: KnowledgeGraphSearchResponse;
try {
  search = await searchKnowledgeGraphNodes(input);
} catch (error) {
  const kind = classifyKnowledgeGraphFailure(error);
  if (kind === "kg_schema_missing" && allowKgInfraFallback()) {
    logKgInfraFallback(error);
    search = makeEmptyKnowledgeGraphSearchResponse(input, {
      degraded: true,
      reason: kind,
    });
  } else {
    throw new KnowledgeGraphUnavailableError(kind, error);
  }
}
```

之后继续走现有代码：

```txt
empty results
  -> runFreeformGoalGate
  -> out_of_library 或 fallback
```

### 3. 合成 empty search response 时保持最小真实上下文

需要一个 helper，例如：

```ts
makeEmptyKnowledgeGraphSearchResponse(input)
```

它应返回 `KnowledgeGraphSearchResponse` shape：

```ts
{
  encodedQuery: encodeKnowledgeGraphQuery(input.query),
  graphId: input.graphId ?? ALL_KG_GRAPHS,
  modelVersion: input.modelVersion ?? getKnowledgeGraphEmbeddingModelVersion(),
  topK: clampTopK(input.topK),
  results: [],
}
```

注意：

- 如果当前 `clampTopK` 没有 export，不要为了一行逻辑暴露过多内部实现。可以新增专门 helper 或保守复用默认 topK。
- 这里不应创建 embedding。表缺失时的本地降级不能依赖 embedding provider。
- 如果 embedding provider 已经失败，不能走这里。

### 4. 安全错误映射

新增或复用一个 helper，建议放在：

```txt
apps/web/src/lib/knowledge-graph/errors.ts
```

示例：

```ts
export function toSafeKnowledgeGraphError(error: unknown): {
  status: number;
  code: string;
  message: string;
} {
  if (error instanceof KnowledgeGraphUnavailableError) {
    return {
      status: 503,
      code: "knowledge_graph_unavailable",
      message: "Learning goal positioning is temporarily unavailable. Please retry later.",
    };
  }
  return {
    status: 503,
    code: "learning_goal_positioning_failed",
    message: "Could not locate that learning goal. Please retry.",
  };
}
```

接入点：

- `apps/web/src/app/api/onboarding/goal/route.ts`
- `apps/web/src/app/api/onboarding/background/route.ts`
- `apps/web/src/app/api/knowledge-graph/position/route.ts`

要求：

- API response 不返回 raw `error.message`。
- `saveLearningGoalPositioningFailure()` 不保存 raw `error.message`。
- server log 继续记录原始 error。
- response 最好带稳定 `code`，便于前端做状态区分。

### 5. Health Check

当前代码里没有明显统一 `/api/health`。建议新增：

```txt
apps/web/src/app/api/health/route.ts
```

或如果已有内部健康检查体系，接入现有体系。

建议返回：

```ts
{
  status: "ok" | "degraded" | "unhealthy",
  database: "ok" | "unavailable",
  kg: {
    schema: "ok" | "missing" | "drift" | "unknown",
    embeddings: "ok" | "empty" | "unknown",
    modelVersion: string | null
  }
}
```

最小检查：

- DB 是否可连。
- `knowledge_graph_topics` 是否存在。
- `knowledge_graph_concepts` 是否存在。
- `kg_node_embeddings` 是否存在。
- 当前 embedding model 下是否有至少一条 embedding。

本地 fallback 开启时，如果 KG schema missing，health 应返回 `degraded`，不能返回 `ok`。

### 6. 日志要求

当发生 KG infrastructure failure：

```txt
[kg] positioning unavailable
```

日志字段至少包含：

- `kind`
- `route` 或 caller context
- 原始 error

当显式 fallback 生效：

```txt
[kg] degraded fallback enabled: kg_schema_missing -> freeform gate
```

必须响亮。不要静默降级。

## 不要做的事

- 不要在 onboarding route 内单独实现 generated graph fallback。这样 Home 和 onboarding 会再次分裂。
- 不要对所有 search errors 都生成 `gen_*`。
- 不要把 DB 连接失败、embedding provider 失败、provider quota、timeout 降级成 generated graph。
- 不要用 `NODE_ENV` 自动启用降级。
- 不要把 `error.message` 写入 `goalPositioningMessage`。
- 不要为了“友好提示”吞掉 server log。
- 不要做历史 profile message 清理。本任务明确排除。

## 测试清单

### Unit tests

建议新增：

```txt
apps/web/tests/kg-error-handling.spec.ts
```

覆盖：

1. `classifyKnowledgeGraphFailure({ code: "42P01" })` -> `kg_schema_missing`
2. `classifyKnowledgeGraphFailure({ code: "42703" })` -> `kg_schema_drift`
3. DB unavailable codes -> `db_unavailable`
4. embedding provider shaped errors -> `embedding_unavailable`
5. unknown error -> `unknown`
6. `toSafeKnowledgeGraphError()` 不返回 raw SQL message

### Positioning tests

扩展 `apps/web/tests/out-of-library.spec.ts` 或新增 dedicated spec：

1. KG 正常但 search results 空：
   - 调用 freeform gate。
   - gate 返回 `out_of_library` 时结果为 `branch: "out_of_library"`。
2. KG search 抛 `42P01`，fallback flag 关闭：
   - 抛 `KnowledgeGraphUnavailableError`
   - 不调用 freeform gate
3. KG search 抛 `42P01`，fallback flag 开启：
   - 合成 empty search
   - 调用 freeform gate
   - 可返回 `out_of_library`
4. DB 连接失败：
   - 不调用 freeform gate
   - 不生成 `gen_*`
5. embedding provider 失败：
   - 不调用 freeform gate
   - 不生成 `gen_*`

### Onboarding route tests

需要验证：

1. background positioning failure 持久化安全 message。
2. sync graphId path failure 返回安全 response。
3. background course build failure 返回安全 response。
4. response body 不包含 `relation`, `public.`, `kg_node_embeddings`, `SQL`, `Postgres` 等内部字样。

如果 route-level mock 复杂，可以先把 error mapping 抽成纯函数并做单测，再补最小 route integration。

### Health tests

如果新增 `/api/health`：

1. DB ok + KG tables ok + embeddings ok -> `ok`
2. DB ok + KG table missing -> `degraded`
3. DB unavailable -> `unhealthy`

## 验收命令

建议后续实现后至少运行：

```bash
cd apps/web
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run tests/out-of-library.spec.ts tests/kg-error-handling.spec.ts
./node_modules/.bin/tsx tests/onboarding-static.unit.ts
```

如果新增 route-level tests，把对应 spec 加进上面的 vitest 命令。

从仓库根目录运行：

```bash
node --check apps/agent/src/graph.mjs
git diff --check
```

## 最终验收标准

实现完成后应满足：

- 用户不会看到 SQL 表名、schema 名、Postgres 原始错误。
- 新的 `goalPositioningMessage` 不会保存 raw `error.message`。
- KG 正常但没有覆盖主题时，仍可生成 `gen_*` 自定义课程。
- KG infrastructure failure 默认不会生成 `gen_*`。
- 只有 `PRIMORIA_ALLOW_KG_INFRA_FALLBACK=1` 且错误为 `kg_schema_missing` 时，才允许本地降级到 freeform gate。
- 降级发生时有明确日志和 health degraded 信号。

