# Knowledge Graph Import Runbook

Status: current operational runbook, July 2026.

Current source of truth: KG source JSON files live in
`data/knowledge-graphs/source/`. Generated graph candidates awaiting review live
in `data/knowledge-graphs/generated/`. Runtime topic DAG artifacts are generated
under `apps/web/src/lib/knowledge-graph/data/`.

## 来源治理与稳定概念 ID

- `data/knowledge-graphs/governance/sources.json` 是来源、版本、许可和保存策略注册表；节点与边必须以 `evidence_refs` 指向具体章节、页码或条款。
- `data/knowledge-graphs/governance/concept-registry.json` 维护全局 `canonical_id`、各图 legacy ID alias 和历史重定向。legacy ID 继续作为图内主键，名称、翻译或 Topic 变化不得生成新的 canonical ID。
- 图、Topic、Concept 和边使用 `unreviewed / needs_review / approved / rejected / superseded`；只有带人工审核者的 decision record 可以进入 `approved`。
- 数据库 `knowledge_graph_concepts.canonical_id` 由 `0002_canonical_concept_ids.sql` 以兼容方式新增。迁移允许既有行暂时为空，但 `seed-kg.mjs` 会拒绝缺少或格式错误的 canonical ID；完成全量 seed 后不得存在空值。
- 版权受限或许可不明的材料只提交元数据、校验值和知识映射，不把公开下载误判为允许再发布全文。

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
4. **先修关系学理正确**：方向对、hard/soft 强度对、关键前置不漏、不堆冗余边。边可选带 `reason`(一句话、≤240 字，说明为何 `to` 需先学 `from`)——`validate-kg.mjs` 只校验类型与长度,非必填;`build-topic-graph.mjs` 会带进 `conceptEdges` 供建课时铺垫动机。
5. **教学顺序合理**：default_order 排出的路径符合实际教学，且不与 prereq 边冲突。
6. **可诊断/可出题性**：每个 concept 能独立出 quiz；相邻 concept「会分别做错」才拆，「一起记忆的清单」不拆。concept 可选带 `assessment_hint`(一句话、≤240 字,点明该考的可观察技能)——`validate-kg.mjs` 只校验类型与长度,非必填;`build-topic-graph.mjs` 带进概念,**仅**供 block-writer 出题用,不参与 mastery 判定。

## 导入新KG的步骤（顺序）

前置：脚本在 `apps/web/scripts/`，DB 表为 `knowledge_graphs / _topics / _concepts / _edges`(+embeddings)。

1. **过门禁**：全量运行 `pnpm --filter @primoria/web validate:kg`；单图运行 `node apps/web/scripts/validate-kg.mjs <graph_id>`。校验直接读取 source JSON，并检查中英文名称、引用完整性与每个 topic 2–3 个 concept 的粒度门禁。根目录旧 Python 校验器不是当前主门禁。
2. **放入 source 目录**：新增或更新 `data/knowledge-graphs/source/<graph_id>.json`；`kg-db-common.mjs graphPath()` 会按 `graph_id` 读取同名 JSON。
3. **初始化 schema**：新环境运行 `pnpm db:bootstrap`；只维护 KG schema 时可运行 `pnpm --filter @primoria/web db:migrate:kg`。两个命令都可重复执行。
4. **导入图**：`pnpm --filter @primoria/web db:seed:kg <graph_id>`（校验并写入 canonical ID，upsert 节点/边，并删除该图中已移除的行）。
5. **跨学科边**：`seed-kg` 只写同图边；更新 `data/knowledge-graphs/source/cross_subject_edges.json` 后运行 `pnpm --filter @primoria/web db:seed:kg-cross`。这些审核通过的边也用于目标范围裁剪，必须在步骤 7 重建运行时派生件。
6. **嵌入**：`pnpm --filter @primoria/web db:seed:kg-embeddings <graph_id>`，供定位/RAG 使用。Provider 由 `KG_EMBEDDING_PROVIDER` 配置，当前支持 `openai-compatible` 与 `minimax`；嵌入模型与维度必须和数据库数据一致。
7. **topic/范围派生件**：`pnpm --filter @primoria/web build:topic-graph <graph_id>` → `apps/web/src/lib/knowledge-graph/data/topic-graph.<id>.json`（入口分类/下一 topic）并同步生成 `cross-subject-edges.generated.json`（确定性 goal scope）。新增/删除图时使用 `pnpm --filter @primoria/web build:topic-graph all` 重建 barrel。
8. **接消费端**：确认 `search.ts`、图路由和显示名称能找到新图；不要另建与 source 目录并行的图注册表。

新环境全量导入：`pnpm db:initialize:kg`（所有 subject graphs + retired graph cleanup + cross-subject edges + 所有 embeddings）。单图维护按步骤 4、6 分别传 `<graph_id>`；任何 source 变更都必须重新执行步骤 1。
