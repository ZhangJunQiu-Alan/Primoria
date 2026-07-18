# Primoria 21 图最终来源治理与批准记录

- 审核授权：Primoria 项目所有者于 2026-07-18 明确“全部批准，按批量方案完成全部 KG”。
- 方法：官方 syllabus、大学课程材料、官方文档或开放教材；所有证据至少定位到 syllabus 页码、课程章节、讲次或文档模块。
- 许可：开放许可按 SPDX 保存；许可不明的课程站点只保存元数据、SHA-256 和知识映射。
- 数据库：本步骤未连接共享数据库，未重建 embeddings。

## 全图状态

| graph_id | content_version | Topics | Concepts | Edges | Sources | Status |
|---|---:|---:|---:|---:|---|---|
| a_level_mathematics | 1.2.0 | 35 | 86 | 102 | src_cambridge_9709_2026_2027<br>src_cambridge_9709_2026_2027_update | approved |
| a_level_physics | 1.2.0 | 46 | 112 | 126 | src_cambridge_9702_2025_2027 | approved |
| a_level_chemistry | 1.2.0 | 31 | 83 | 106 | src_cambridge_9701_2025_2027 | approved |
| a_level_biology | 1.2.0 | 34 | 84 | 98 | src_cambridge_9700_2025_2027 | approved |
| artificial_intelligence | 1.1.0 | 13 | 32 | 33 | src_berkeley_cs188_textbook_2026 | approved |
| computer_architecture | 1.1.0 | 16 | 38 | 39 | src_berkeley_cs61c_summer_2026 | approved |
| computer_network | 1.1.0 | 9 | 21 | 26 | src_stanford_cs144_2026 | approved |
| computer_systems | 1.1.0 | 23 | 55 | 57 | src_cmu_15213_2026 | approved |
| data_structures_and_algorithms | 1.1.0 | 23 | 54 | 63 | src_berkeley_cs61b_fall_2024 | approved |
| deep_learning | 1.1.0 | 15 | 39 | 45 | src_d2l_1_0_3<br>src_stanford_cs236g_2026 | approved |
| discrete_math_and_probability | 1.1.0 | 30 | 65 | 65 | src_berkeley_cs70_summer_2026 | approved |
| information_theory | 1.1.0 | 5 | 15 | 14 | src_mit_ocw_6_441_spring_2010 | approved |
| introduction_to_computer_science | 1.1.0 | 18 | 48 | 49 | src_harvard_cs50x_2026 | approved |
| linear_algebra | 1.1.0 | 11 | 23 | 22 | src_mit_ocw_18_06sc_fall_2011 | approved |
| machine_learning | 1.1.0 | 18 | 41 | 44 | src_stanford_cs229_2026 | approved |
| mit_calculus | 1.1.0 | 21 | 51 | 77 | src_mit_ocw_18_01sc_fall_2010<br>src_mit_ocw_18_02sc_fall_2010 | approved |
| numerical_analysis | 1.1.0 | 6 | 17 | 16 | src_mit_ocw_18_330_spring_2012 | approved |
| python_fundamentals | 1.1.0 | 24 | 65 | 93 | src_python_docs_3_14 | approved |
| sicp_cs61a | 1.1.0 | 18 | 39 | 45 | src_berkeley_cs61a_summer_2026 | approved |
| software_construction | 1.1.0 | 7 | 16 | 16 | src_mit_6_031_spring_2018 | approved |
| web_applications | 1.1.0 | 7 | 19 | 21 | src_mdn_curriculum_2025<br>src_react_learn_2026<br>src_node_learn_2026<br>src_express_docs_2026<br>src_mongodb_manual_2026<br>src_owasp_wstg_2026 | approved |

## 稳定 ID

- canonical 概念：947
- legacy aliases：1003
- canonical redirects：51
- 自动候选中批准合并：45
- 自动候选中拒绝合并：6
- 额外人工确认合并：7

- 拒绝合并：a_level_mathematics:mat_iteration ↔ numerical_analysis:c_mit18330_iterative_linear；同名但语义范围不同。
- 拒绝合并：discrete_math_and_probability:trees ↔ introduction_to_computer_science:c_trees；同名但语义范围不同。
- 拒绝合并：deep_learning:dl_regularization ↔ machine_learning:ml_regularization；同名但语义范围不同。
- 拒绝合并：computer_systems:c7_1 ↔ introduction_to_computer_science:c_exceptions；同名但语义范围不同。
- 拒绝合并：computer_systems:c7_1 ↔ sicp_cs61a:exceptions；同名但语义范围不同。
- 拒绝合并：computer_systems:c7_1 ↔ software_construction:c_mit6031_exceptions；同名但语义范围不同。

## 跨图先修

- 保留并批准：50
- 删除：12
- discrete_math_and_probability.json:bayes_rule → artificial_intelligence.json:ai_bayes_rule：端点已合并为同一 canonical 概念，不应再表示为先修关系。
- sicp_cs61a.json:data_abs → data_structures_and_algorithms.json:c_ucb61b_java_basics：人工复核后判定先修方向或必要性不成立。
- introduction_to_computer_science.json:c_trees → data_structures_and_algorithms.json:c_ucb61b_trees_intro：端点已合并为同一 canonical 概念，不应再表示为先修关系。
- data_structures_and_algorithms.json:c_ucb61b_bst_operations → software_construction.json:c_mit6031_recursive_data：人工复核后判定先修方向或必要性不成立。
- computer_architecture.json:concept_integer_rep → computer_systems.json:c1_2：端点已合并为同一 canonical 概念，不应再表示为先修关系。
- computer_architecture.json:concept_floating_point → computer_systems.json:c1_4：端点已合并为同一 canonical 概念，不应再表示为先修关系。
- computer_network.json:net_tcp → computer_systems.json:c10_3：端点已合并为同一 canonical 概念，不应再表示为先修关系。
- introduction_to_computer_science.json:c_js → web_applications.json:web_javascript：端点已合并为同一 canonical 概念，不应再表示为先修关系。
- introduction_to_computer_science.json:c_html → web_applications.json:web_html：端点已合并为同一 canonical 概念，不应再表示为先修关系。
- introduction_to_computer_science.json:c_relational_db → web_applications.json:web_relational：端点已合并为同一 canonical 概念，不应再表示为先修关系。
- computer_network.json:net_http → web_applications.json:web_http：端点已合并为同一 canonical 概念，不应再表示为先修关系。
- data_structures_and_algorithms.json:c_ucb61b_big_theta → machine_learning.json:ml_gradient_descent：人工复核后判定先修方向或必要性不成立。

## A-Level 页码回退审计

- a_level_mathematics: 0 个节点使用 Topic 级 syllabus locator
- a_level_physics: 0 个节点使用 Topic 级 syllabus locator
- a_level_chemistry: 0 个节点使用 Topic 级 syllabus locator
- a_level_biology: 0 个节点使用 Topic 级 syllabus locator
