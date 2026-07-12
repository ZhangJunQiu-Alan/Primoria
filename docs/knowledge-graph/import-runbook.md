# Knowledge Graph Import Runbook

Current source of truth: KG source JSON files live in
`data/knowledge-graphs/source/`. Generated graph candidates awaiting review live
in `data/knowledge-graphs/generated/`. Runtime topic DAG artifacts are generated
under `apps/web/src/lib/knowledge-graph/data/`.

## KG 质量评估方向

衡量标准从「KG 被谁消费」倒推：定位(RAG)、建课(喂 lesson)、诊断+排课(prereq/order)。分为硬门禁与内容质量两层。

### 一、硬门禁（任一不过 = 不可用，可脚本校验）
1. Schema 完整：有 concept 节点、有 prereq 边、concept 有 default_order。
2. id 全局唯一（允许跨学科先修边）。
3. prereq 边无环（必须是 DAG，才能排课）。
4. 引用完整：边端点、concept 的 topic 字段都指向存在节点。
5. 入口可控：无入边的起点 concept 是该学科真正入门概念，数量合理。

### 二、内容质量（满足门禁后人工/LLM 审）
1. **覆盖完整性**：对标权威大纲（MIT 课程 / A-Level 考纲），不缺核心、不越界。
2. **概念正确性**：术语真实、description 定义学理正确，无幻觉、无张冠李戴。
3. **粒度一致性**：同层 concept 尺度相当；topic 子图约 2–3 个 concept。
4. **先修关系学理正确**：方向对、hard/soft 强度对、关键前置不漏、不堆冗余边。
5. **教学顺序合理**：default_order 排出的路径符合实际教学，且不与 prereq 边冲突。
6. **可诊断/可出题性**：每个 concept 能独立出 quiz；相邻 concept「会分别做错」才拆，「一起记忆的清单」不拆。

## 导入新KG的步骤（顺序）

前置：脚本在 `apps/web/scripts/`，DB 表为 `knowledge_graphs / _topics / _concepts / _edges`(+embeddings)。

1. **过门禁**：`python3 scripts/validate_kg.py` 全绿；spec 构建的图最后跑 `enrich_manual.py` 补描述。
2. **放入 source 目录**：新增或更新 `data/knowledge-graphs/source/<graph_id>.json`；`kg-db-common.mjs graphPath()` 会按 `graph_id` 读取同名 JSON。
3. **初始化 schema**：新环境运行 `pnpm db:bootstrap`；只维护 KG schema 时可运行 `pnpm --filter @primoria/web db:migrate:kg`。两个命令都可重复执行。
4. **导入图**：`pnpm db:seed:kg <graph_id>`（upsert 节点/边，并删除该图中已移除的行）。
5. **跨学科边**：`seed-kg` 只写同图边；`cross_subject_edges.json`(from≠to graph) 要单独插入 `knowledge_graph_edges`。
6. **嵌入**：`pnpm db:seed:kg-embeddings <graph_id>`（需 OpenAI text-embedding-3-small，供定位/RAG）。
7. **topic 派生件**：`pnpm build:topic-graph <graph_id>` → `src/lib/knowledge-graph/data/topic-graph.<id>.json`（入口分类/下一 topic）。
8. **接消费端**：按需更新 `search.ts` 的 `DEFAULT_KG_GRAPH_ID` / 图注册表。

新环境全量导入：`pnpm db:initialize:kg`（所有 subject graphs + retired graph cleanup + cross-subject edges + 所有 embeddings）。单图维护按步骤 4、6 分别传 `<graph_id>`。
