# 中国大陆 / 新加坡 10 张运行时图批准记录（2026-10-25）

- 审核授权：Primoria 项目所有者于 2026-10-25 明确“按审核包全部批准”，并在过目第 10 节追加内容（H2 生物主题重组、4 个同层级新概念、6 条新增先修边、11 条映射替换）后“批准，一起落库”。
- 方法：Claude 联网下载官方课程文件逐页比对，逐条给出保留/修正/删除建议（`review.zh-CN.md`、`review-decisions.json`）；项目所有者批准后由落库脚本写入。每条决定记录 `reviewer_type: human`、`reviewer_id: primoria_owner`，`rationale_zh` 注明“AI 辅助逐条对照官方原文核验，经项目所有者批准”。
- 落库脚本：`apps/web/scripts/apply-cn-sg-review-2026-10.mjs --approve --owner-approved --reviewed-at=2026-10-25T04:34:00Z --apply`（幂等；批准后 `--corrections` 会拒绝运行）。
- 来源迁移脚本：`apps/web/scripts/apply-source-verification-2026-10.mjs`，定位改写表见 `review/pending/source-verification/2026-10-25.locator-rewrites.json`。
- 数据库：2026-10-25 已把 10 张图与 234 条跨图边导入共享 Supabase 库，并为 `embedding-rebuild-required.json` 所列 4 张图重建 embeddings（MiniMax `embo-01`，`minimax:embo-01:1536`，共 2,043 条向量）；只读比对确认 31 张图的节点、边、跨图边与 `embed_text` 与源数据零差异。KG embedding 快照未导出。

## 范围与决定数

共写入 6,123 条人工决定（`governance/review-decisions.json`，`reviewed_at = 2026-10-25T04:34:00Z`）：

| 对象 | 决定数 |
|---|---:|
| 图 / Topic+Concept 节点 / 同图先修边 | 10 / 630 / 230 |
| canonical 概念 | 451 |
| 跨图先修边 | 184 |
| 课程框架 / 要求 | 11 / 1,465 |
| 映射集 / 映射 | 11 / 1,465 |
| 缺口集 / 缺口候选 | 10 / 607 |
| 决议集 / 决议 | 10 / 607 |
| 实践集 / 实践条目 | 10 / 133 |
| 教学法档案集 / 档案 / 误区 / 策略 / 探针 | 1 / 48 / 96 / 48 / 96 |

## 结构变化

- 同图先修边：删除 130 条（大纲条目相邻派生、非真实依赖），新增 5 条真实依赖 + 第 10 节 6 条，3 条硬边降为软边，47 条改写依赖理由。删除的边连同理由归档于 `removed-edges.json`。
- 跨图先修边：删除 153 条，保留并批准 184 条，20 条硬边降为软边；运行时跨图边从 50 条增至 234 条。
- 新增概念：`sg_sec_math_formulate_linear_equations`、`sg_sec_math_formulate_quadratic_equations`、`sg_sec_math_single_event_probability`、`cn_sh_math_linear_regression_least_squares`；新增主题：`sg_h2_biology_topic_molecular_analysis_screening`、`sg_h2_biology_topic_population_evolution`、`sg_sec_math_topic_equation_modelling`、`sg_sec_math_topic_probability`。原主题 ID 全部保留。
- 删除虚构的 H2 物理要求 18(h)（`req_sg_h2_physics_9478_2026_o_18_transformer_power_transmission`）及其映射。
- RSC 2016 误区保留 `empirically_documented`（所有者决定；文献存在已确认，全文未能核对）。

## 批准后全图状态

| graph_id | content_version | Topics | Concepts | Edges | Status |
|---|---:|---:|---:|---:|---|
| senior_secondary_biology | 0.1.3 | 26 | 75 | 36 | approved |
| senior_secondary_chemistry | 0.1.4 | 17 | 49 | 19 | approved |
| senior_secondary_mathematics | 0.1.4 | 27 | 71 | 54 | approved |
| senior_secondary_physics | 0.1.3 | 28 | 73 | 26 | approved |
| singapore_h2_biology | 0.1.3 | 16 | 42 | 18 | approved |
| singapore_h2_chemistry | 0.1.3 | 7 | 18 | 4 | approved |
| singapore_h2_mathematics | 0.1.2 | 14 | 33 | 15 | approved |
| singapore_h2_physics | 0.1.3 | 3 | 8 | 3 | approved |
| singapore_lower_secondary_science | 0.1.3 | 15 | 32 | 16 | approved |
| singapore_secondary_mathematics | 0.1.4 | 20 | 56 | 39 | approved |

合计 173 个主题、457 个概念、230 条同图先修边。运行时注册表 31 张图全部为 `approved`。

## 回归

- `pnpm --filter @primoria/web validate:kg`：31 图与治理语料通过（概览图仍有 root-concept 内容质量警告）。
- 学习目标路由夹具重生成为 1,726 例（原 1,718 例；新增 4 个主题各 2 例，SG 中学数学的均匀抽样概念例由 `quadratic_factorisation_solve` 换为 `fractional_quadratic_equations`），所有既有案例的 gold policy 与期望（除 `startTopicIds` 外）不变；`pnpm test:learning-goal-routing` 通过。
- Web 全量单测、typecheck、lint 通过。

## 后续

- KG embedding 快照授权的 `covered_graph_ids` 现为空集；导出快照需另行授权。
- 项目所有者决定默认开启冷启动路由的 approved-only 门禁（`PRIMORIA_REQUIRE_APPROVED_KG=0` 可关闭）；当前 31 张图均已批准，门禁不排除任何图。
- 9 张图的 root-concept 内容质量警告暂不处理（所有者决定）。
