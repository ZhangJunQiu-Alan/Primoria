# 新加坡剑桥 GCE A-Level H2 数学 9758（2026）学习成果级覆盖：KG 映射待审核包

> 本文件只展示 AI 提出的待审建议。所有条目均为 `needs_review`，未经人工批准不会进入正式 KG。
> 当前集合按官方逐条学习成果核对，可用于判断课程覆盖缺口。

- 课程：`cur_sg_seab_h2_math_9758_2026`
- 课程框架：`cfw_sg_seab_h2_math_9758_2026_outcomes`
- 映射集合：`cms_sg_seab_h2_math_9758_2026_outcomes`
- 地区：`SG`
- 课程版本：`0.3.1`
- 映射版本：`0.4.0`
- 映射范围：`outcome_coverage`
- 官方来源：`src_sg_seab_h2_math_9758_2026`
- 覆盖统计：完整 74；部分 0；未映射 0；排除 6
- KG 缺口建议：新增概念 2；拆分或收窄 31；不进入知识概念 0

## 1. GC.01｜图形计算器证据与局限

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_gc_evidence_limitations`
- 映射 ID：`map_sg_h2_math_9758_2026_o_gc_evidence_limitations`
- 中文释义：正确使用获准图形计算器，识别精度和显示限制，并在题目要求时提交数学步骤或图像草图。
- 建议结论：有理由排除；关系 `not_applicable`；置信度 `high`
- 对应概念：无
- 判断理由：这是贯穿课程的工具使用和作答证据要求，应进入教学与评测知识层。
- 官方证据：PDF p.4, Use of a Graphing Calculator（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 2. 1.1.01｜函数、定义域与值域

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_function_domain_range`
- 映射 ID：`map_sg_h2_math_9758_2026_o_function_domain_range`
- 中文释义：理解函数、定义域和值域，并能在给定表示中确定它们。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：函数与反函数（`pc_d547d8eb03df4b28cc0357c7cae1d164`）
- 判断理由：现有函数 canonical 概念直接覆盖定义域、值域与映射。
- 官方证据：PDF p.6, sub-topic 1.1 Functions（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 3. 1.1.02｜反函数存在条件与定义域限制

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_inverse_existence_restriction`
- 映射 ID：`map_sg_h2_math_9758_2026_o_inverse_existence_restriction`
- 中文释义：判断反函数是否存在，必要时限制定义域，并联系一一函数与反函数图像。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：反函数存在条件与定义域限制（`pc_5f10437c0846188d853443ee76c29385`）；函数与反函数（`pc_d547d8eb03df4b28cc0357c7cae1d164`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_5f10437c0846188d853443ee76c29385、pc_d547d8eb03df4b28cc0357c7cae1d164 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.6, sub-topic 1.1 Functions（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“反函数存在条件与定义域限制”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 4. 1.1.03｜复合函数及存在条件

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_composite_conditions`
- 映射 ID：`map_sg_h2_math_9758_2026_o_composite_conditions`
- 中文释义：构造复合函数并依据定义域和值域判断复合是否有定义。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：复合函数（`pc_6a6936f09677fca363b23f40f12d946d`）
- 判断理由：现有复合函数概念包含运算次序和定义域条件。
- 官方证据：PDF p.6, sub-topic 1.1 Functions（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 5. 1.2.01｜常见函数图像特征

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_standard_graph_characteristics`
- 映射 ID：`map_sg_h2_math_9758_2026_o_standard_graph_characteristics`
- 中文释义：识别指定函数及圆锥曲线图像的对称性、截距、转折点和渐近线。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：常见代数函数图像特征（`pc_01bf6e2b919084e9537bb1dae27d1509`）；二次函数（`pc_133d40fa0e72c29c5eb6ec7a9852c80c`）；椭圆定义、方程与性质（`pc_58591fb3c8294a83a9405568a100991e`）；抛物线（`pc_76707a52fc4d807bbdfb0e56f509c17e`）；双曲线（`pc_d236c68eb711f9a26eb4250a7843b517`）；直线（`pc_2fd09e919b7e73069c83ce49007f17d2`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_01bf6e2b919084e9537bb1dae27d1509、pc_133d40fa0e72c29c5eb6ec7a9852c80c、pc_58591fb3c8294a83a9405568a100991e、pc_76707a52fc4d807bbdfb0e56f509c17e、pc_d236c68eb711f9a26eb4250a7843b517、pc_2fd09e919b7e73069c83ce49007f17d2 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.6, sub-topic 1.2 Graphs and transformations（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“常见函数图像特征”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 6. 1.2.02｜使用图形技术绘制函数

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_graphing_function_technology`
- 映射 ID：`map_sg_h2_math_9758_2026_o_graphing_function_technology`
- 中文释义：使用图形计算器或绘图软件绘制给定函数，并保留能支持结论的图像信息。
- 建议结论：有理由排除；关系 `not_applicable`；置信度 `high`
- 对应概念：无
- 判断理由：这是图形技术操作及作答证据，不应写成学科概念掌握度。
- 官方证据：PDF p.6, sub-topic 1.2 Graphs and transformations（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 7. 1.2.03｜函数图像变换

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_graph_transformations`
- 映射 ID：`map_sg_h2_math_9758_2026_o_graph_transformations`
- 中文释义：对 y=f(x) 应用平移、伸缩、反射及其组合，并解释参数影响。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：函数图像变换（`pc_1aaf98f8144a2f3b3fae833eb1370db8`）
- 判断理由：现有图像变换概念与官方变换范围一致。
- 官方证据：PDF p.6, sub-topic 1.2 Graphs and transformations（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 8. 1.2.04｜相关函数图像与反函数关系

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_related_function_graphs`
- 映射 ID：`map_sg_h2_math_9758_2026_o_related_function_graphs`
- 中文释义：由 y=f(x) 推出 y=|f(x)|、y=f(|x|) 及反函数关系图像。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：函数图像变换（`pc_1aaf98f8144a2f3b3fae833eb1370db8`）；绝对值函数（`pc_bbf60fbe4b8e3e3bd3bd64a1b5fc3475`）；函数与反函数（`pc_d547d8eb03df4b28cc0357c7cae1d164`）
- 判断理由：图像变换、绝对值和反函数概念组合覆盖该结果。
- 官方证据：PDF p.6, sub-topic 1.2 Graphs and transformations（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 9. 1.2.05｜简单参数方程与图像

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_parametric_graphs`
- 映射 ID：`map_sg_h2_math_9758_2026_o_parametric_graphs`
- 中文释义：解释简单参数方程并画出或识别其平面曲线图像。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：简单参数方程与平面图像（`pc_044eaaf9e74e43e4aee3e6898c91a012`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_044eaaf9e74e43e4aee3e6898c91a012 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.6, sub-topic 1.2 Graphs and transformations（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`add_concept`；候选“简单参数方程与图像”；统一 KG 没有足以独立诊断该成果的概念，建议新增待审概念。
- 审核状态：`needs_review`

## 10. 1.3.01｜从情境建立方程与不等式

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_formulate_equations`
- 映射 ID：`map_sg_h2_math_9758_2026_o_formulate_equations`
- 中文释义：从问题情境建立方程、线性方程组或不等式并解释变量约束。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：从情境建立方程与不等式（`pc_2c7c77c12eaf42efced7f2a956e1bb16`）；联立方程（`pc_204206c0b72ea40b72d3055124b579af`）；不等式（`pc_4307437065fb6fce9aa3b4c05e7ed82d`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_2c7c77c12eaf42efced7f2a956e1bb16、pc_204206c0b72ea40b72d3055124b579af、pc_4307437065fb6fce9aa3b4c05e7ed82d 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.7, sub-topic 1.3 Equations and inequalities（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“从情境建立方程与不等式”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 11. 1.3.02｜使用图形技术求解方程与方程组

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_gc_equation_solving`
- 映射 ID：`map_sg_h2_math_9758_2026_o_gc_equation_solving`
- 中文释义：用图形计算器或软件精确或近似求解方程与线性方程组，并保留必要数学依据。
- 建议结论：有理由排除；关系 `not_applicable`；置信度 `high`
- 对应概念：无
- 判断理由：图形技术操作属于工具使用与评测策略，不应写成学科概念掌握度。
- 官方证据：PDF p.7, sub-topic 1.3 Equations and inequalities（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 12. 1.3.03｜分式与二次不等式

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_rational_quadratic_inequalities`
- 映射 ID：`map_sg_h2_math_9758_2026_o_rational_quadratic_inequalities`
- 中文释义：用代数或图像方法求解由一次式或二次式组成的分式不等式。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：一次与二次因式构成的分式不等式（`pc_afd49425ab0864c75dcf18868acbba73`）；不等式（`pc_4307437065fb6fce9aa3b4c05e7ed82d`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_afd49425ab0864c75dcf18868acbba73、pc_4307437065fb6fce9aa3b4c05e7ed82d 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.7, sub-topic 1.3 Equations and inequalities（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“分式与二次不等式”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 13. 1.3.04｜绝对值方程与不等式

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_modulus_inequalities`
- 映射 ID：`map_sg_h2_math_9758_2026_o_modulus_inequalities`
- 中文释义：理解绝对值并使用等价关系求解绝对值方程和不等式。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：绝对值函数（`pc_bbf60fbe4b8e3e3bd3bd64a1b5fc3475`）
- 判断理由：现有绝对值函数概念直接覆盖图像、方程和不等式。
- 官方证据：PDF p.7, sub-topic 1.3 Equations and inequalities（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 14. 2.1.01｜数列、级数与表示

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_sequence_series_representation`
- 映射 ID：`map_sg_h2_math_9758_2026_o_sequence_series_representation`
- 中文释义：理解有限和无限数列与级数，把数列表示为正整数定义域上的函数，并联系通项与部分和。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：数列概念与表示（`pc_d628dbf58410331e403a76b3b121c7fd`）；序列与级数（`pc_105655e3b7f36e0d0c2488e7d3e47a3a`）
- 判断理由：中国高中数列表示和 MIT 数列级数概念组合覆盖定义与表示。
- 官方证据：PDF p.7, sub-topic 2.1 Sequences and series（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 15. 2.1.02｜递推数列

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_recurrence_sequences`
- 映射 ID：`map_sg_h2_math_9758_2026_o_recurrence_sequences`
- 中文释义：由递推关系生成数列，计算后继项并分析数列行为。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：递推数列（`pc_751f6453ef98be2b89e76c9a253bef03`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_751f6453ef98be2b89e76c9a253bef03 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.7, sub-topic 2.1 Sequences and series（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`add_concept`；候选“递推数列”；统一 KG 没有足以独立诊断该成果的概念，建议新增待审概念。
- 审核状态：`needs_review`

## 16. 2.1.03｜使用技术生成递推数列

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_recurrence_technology`
- 映射 ID：`map_sg_h2_math_9758_2026_o_recurrence_technology`
- 中文释义：使用图形计算器或程序按递推关系生成数列并检查项值。
- 建议结论：有理由排除；关系 `not_applicable`；置信度 `high`
- 对应概念：无
- 判断理由：这是工具实践和过程证据，应进入教学与评测知识层。
- 官方证据：PDF p.7, sub-topic 2.1 Sequences and series（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 17. 2.1.04｜级数运算与收敛

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_series_operations_convergence`
- 映射 ID：`map_sg_h2_math_9758_2026_o_series_operations_convergence`
- 中文释义：完成两个级数的和差，判断收敛并解释无穷和。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：级数运算、收敛与无穷和（`pc_08b1eb5f8f685706a847adee808f59f9`）；序列与级数（`pc_105655e3b7f36e0d0c2488e7d3e47a3a`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_08b1eb5f8f685706a847adee808f59f9、pc_105655e3b7f36e0d0c2488e7d3e47a3a 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.7, sub-topic 2.1 Sequences and series（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“级数运算与收敛”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 18. 2.1.05｜等差数列与级数

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_arithmetic_series`
- 映射 ID：`map_sg_h2_math_9758_2026_o_arithmetic_series`
- 中文释义：使用等差数列通项和有限项和公式解决问题。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：等差级数（`pc_9e401fe846a8c086510b3ea2102be253`）
- 判断理由：现有等差级数概念直接覆盖通项与有限和。
- 官方证据：PDF p.7, sub-topic 2.1 Sequences and series（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 19. 2.1.06｜等比数列与无穷级数

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_geometric_series`
- 映射 ID：`map_sg_h2_math_9758_2026_o_geometric_series`
- 中文释义：使用等比数列通项、有限和、收敛条件与无穷和公式。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：等比级数（`pc_ced3271242c9a0d6fe67d9a446214543`）
- 判断理由：现有等比级数概念直接覆盖有限与无穷情形。
- 官方证据：PDF p.7, sub-topic 2.1 Sequences and series（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 20. 3.1.01｜向量运算及几何解释

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_vector_operations_geometry`
- 映射 ID：`map_sg_h2_math_9758_2026_o_vector_operations_geometry`
- 中文释义：在二维和三维中完成向量加减与数乘，并解释其几何意义。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：向量运算的几何解释（`pc_d4b7e2b6e2c8459d849405a8f6fc0b79`）；向量基础（`pc_9ae5f17312ee21050edf3e4bd9b005a2`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_d4b7e2b6e2c8459d849405a8f6fc0b79、pc_9ae5f17312ee21050edf3e4bd9b005a2 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.7, sub-topic 3.1 Basic properties of vectors（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“向量运算及几何解释”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 21. 3.1.02｜位置、位移、方向与单位向量

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_vector_types_magnitude`
- 映射 ID：`map_sg_h2_math_9758_2026_o_vector_types_magnitude`
- 中文释义：区分位置、位移和方向向量，计算向量大小、单位向量及两点距离。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：位置、位移向量与两点距离（`pc_621b21298876e61af0ada0dde5521dd6`）；向量基础（`pc_9ae5f17312ee21050edf3e4bd9b005a2`）；大小与方向（`pc_64e61e1cee5471619fa54db48800b916`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_621b21298876e61af0ada0dde5521dd6、pc_9ae5f17312ee21050edf3e4bd9b005a2、pc_64e61e1cee5471619fa54db48800b916 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.7, sub-topic 3.1 Basic properties of vectors（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“位置、位移、方向与单位向量”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 22. 3.1.03｜共线与向量比例定理

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_collinearity_ratio`
- 映射 ID：`map_sg_h2_math_9758_2026_o_collinearity_ratio`
- 中文释义：用向量判断共线，并使用比例定理解决几何分点问题。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：向量共线与比例定理（`pc_c4a9b18aaa8cac61cd5719c4de9d6879`）；向量基础（`pc_9ae5f17312ee21050edf3e4bd9b005a2`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_c4a9b18aaa8cac61cd5719c4de9d6879、pc_9ae5f17312ee21050edf3e4bd9b005a2 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.7, collinearity; PDF p.8, ratio theorem, sub-topic 3.1（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“共线与向量比例定理”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 23. 3.2.01｜标量积与向量积

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_scalar_cross_products`
- 映射 ID：`map_sg_h2_math_9758_2026_o_scalar_cross_products`
- 中文释义：理解标量积、向量积及其性质，并计算夹角和垂直关系。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：标量积（`pc_3e68cc383e695a3ae1773f286b5221f3`）；叉积（`pc_909ca9d8010cb1a841ee03551e2afc16`）
- 判断理由：既有标量积和 MIT 叉积概念直接覆盖。
- 官方证据：PDF p.8, sub-topic 3.2 Scalar and vector products（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 24. 3.2.02｜向量积的几何意义

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_product_geometric_meaning`
- 映射 ID：`map_sg_h2_math_9758_2026_o_product_geometric_meaning`
- 中文释义：解释向量在单位方向上的投影及叉积在法向方向和面积上的意义。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：向量投影（`pc_b70bbfb827c2b527f128f02bf360675e`）；叉积（`pc_909ca9d8010cb1a841ee03551e2afc16`）
- 判断理由：向量投影与叉积概念组合直接覆盖几何意义。
- 官方证据：PDF p.8, sub-topic 3.2 Scalar and vector products（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 25. 3.3.01｜直线与平面方程

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_line_plane_equations`
- 映射 ID：`map_sg_h2_math_9758_2026_o_line_plane_equations`
- 中文释义：写出三维直线和平面的向量式与直角坐标式。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：直线向量方程（`pc_0c3c2f35769f38762a59705783e03824`）；直线与平面（`pc_8386363188df11ab28ae08ef72342a47`）
- 判断理由：现有直线向量方程和 MIT 直线平面概念直接覆盖。
- 官方证据：PDF p.8, sub-topic 3.3 Three-dimensional vector geometry（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 26. 3.3.02｜垂足及点到直线或平面的距离

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_point_line_plane_distance`
- 映射 ID：`map_sg_h2_math_9758_2026_o_point_line_plane_distance`
- 中文释义：求点到直线或平面的垂足和距离。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：垂足及点到直线或平面的距离（`pc_44258dcc263e1037c0cac100f62afaa6`）；向量投影（`pc_b70bbfb827c2b527f128f02bf360675e`）；直线与平面（`pc_8386363188df11ab28ae08ef72342a47`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_44258dcc263e1037c0cac100f62afaa6、pc_b70bbfb827c2b527f128f02bf360675e、pc_8386363188df11ab28ae08ef72342a47 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.8, sub-topic 3.3 Three-dimensional vector geometry（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“垂足及点到直线或平面的距离”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 27. 3.3.03｜直线与平面夹角

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_line_plane_angles`
- 映射 ID：`map_sg_h2_math_9758_2026_o_line_plane_angles`
- 中文释义：求两直线、线面及两平面之间的夹角。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：标量积（`pc_3e68cc383e695a3ae1773f286b5221f3`）；直线与平面（`pc_8386363188df11ab28ae08ef72342a47`）
- 判断理由：标量积和直线平面表示组合覆盖夹角计算。
- 官方证据：PDF p.8, sub-topic 3.3 Three-dimensional vector geometry（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 28. 3.3.04｜三维线面位置关系

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_relative_positions_3d`
- 映射 ID：`map_sg_h2_math_9758_2026_o_relative_positions_3d`
- 中文释义：判断两直线、线面或两平面的平行、相交、重合及异面关系。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：三维直线与平面的相对位置（`pc_e6bc28a8a732ece9251e6d7d12525dee`）；直线与平面（`pc_8386363188df11ab28ae08ef72342a47`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_e6bc28a8a732ece9251e6d7d12525dee、pc_8386363188df11ab28ae08ef72342a47 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.8, sub-topic 3.3 Three-dimensional vector geometry（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“三维线面位置关系”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 29. 4.1.01｜数系扩充与复二次根

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_complex_extension_roots`
- 映射 ID：`map_sg_h2_math_9758_2026_o_complex_extension_roots`
- 中文释义：从实数扩充到复数并求实系数二次方程的复根。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：实系数二次方程的非实根（`pc_24330767cc56747db538e56a7aaff4d4`）；复数与数系扩充（`pc_a2d1c2c86661b6706ceb2919619b89e5`）；复数根与轨迹（`pc_fc9bb3961ffd0d45670252b69c41d19c`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_24330767cc56747db538e56a7aaff4d4、pc_a2d1c2c86661b6706ceb2919619b89e5、pc_fc9bb3961ffd0d45670252b69c41d19c 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.8, sub-topic 4.1 Complex numbers in cartesian form and Argand diagrams（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“数系扩充与复二次根”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 30. 4.1.02｜笛卡尔形式的模、辐角与共轭

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_complex_mod_arg_conjugate`
- 映射 ID：`map_sg_h2_math_9758_2026_o_complex_mod_arg_conjugate`
- 中文释义：在不使用极形式的前提下求复数的模、主辐角和共轭。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：由笛卡尔形式求模与主辐角（`pc_08a0b36d500f85a79ecd1a38f6cef808`）；复数运算（`pc_84fa9a959816d2fd778aec459c7e0020`）；阿根图（`pc_8b0b34fcb52404046ccbf41b402895fd`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_08a0b36d500f85a79ecd1a38f6cef808、pc_84fa9a959816d2fd778aec459c7e0020、pc_8b0b34fcb52404046ccbf41b402895fd 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.8, sub-topic 4.1 Complex numbers in cartesian form and Argand diagrams（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“笛卡尔形式的模、辐角与共轭”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 31. 4.1.03｜复数四则运算与相等

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_complex_operations_equality`
- 映射 ID：`map_sg_h2_math_9758_2026_o_complex_operations_equality`
- 中文释义：在 a+bi 形式完成四则运算，并依据实部和虚部分别相等判断复数相等。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：复数运算（`pc_84fa9a959816d2fd778aec459c7e0020`）
- 判断理由：既有复数运算 canonical 直接覆盖 a+bi 四则运算。
- 官方证据：PDF p.8, sub-topic 4.1 Complex numbers in cartesian form and Argand diagrams（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 32. 4.1.04｜实系数多项式的共轭根

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_conjugate_polynomial_roots`
- 映射 ID：`map_sg_h2_math_9758_2026_o_conjugate_polynomial_roots`
- 中文释义：使用实系数多项式的非实根成共轭对性质。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：实系数多项式的共轭根（`pc_8b92b1da4df755ca8679ce69d4471470`）；复数根与轨迹（`pc_fc9bb3961ffd0d45670252b69c41d19c`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_8b92b1da4df755ca8679ce69d4471470、pc_fc9bb3961ffd0d45670252b69c41d19c 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.8, sub-topic 4.1 Complex numbers in cartesian form and Argand diagrams（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“实系数多项式的共轭根”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 33. 4.1.05｜阿根图表示

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_argand_representation`
- 映射 ID：`map_sg_h2_math_9758_2026_o_argand_representation`
- 中文释义：把复数表示为阿根图中的点或向量。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：阿根图（`pc_8b0b34fcb52404046ccbf41b402895fd`）
- 判断理由：既有阿根图概念直接覆盖。
- 官方证据：PDF p.8, sub-topic 4.1 Complex numbers in cartesian form and Argand diagrams（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 34. 4.1.06｜复数运算的几何效果

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_complex_geometric_effects`
- 映射 ID：`map_sg_h2_math_9758_2026_o_complex_geometric_effects`
- 中文释义：在阿根图解释共轭、取负、加减及乘以 i 的几何效果。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：复数运算的几何效果（`pc_415bf497b8b12033e4f00630f6180261`）；阿根图（`pc_8b0b34fcb52404046ccbf41b402895fd`）；复数加减的几何意义（`pc_c04ce0aed24384aaa5b223f59282d31c`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_415bf497b8b12033e4f00630f6180261、pc_8b0b34fcb52404046ccbf41b402895fd、pc_c04ce0aed24384aaa5b223f59282d31c 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.8, sub-topic 4.1 Complex numbers in cartesian form and Argand diagrams（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“复数运算的几何效果”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 35. 5.1.01｜导数符号与函数图像关系

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_derivative_graph_relations`
- 映射 ID：`map_sg_h2_math_9758_2026_o_derivative_graph_relations`
- 中文释义：由一阶、二阶导数符号解释函数图像，并联系 f 与 f' 的图像。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：函数与导函数图像关系（`pc_4d08149f9dd7b5784cadd265396b01c3`）；曲线草图（`pc_f9249fb783344fbbcfe32c05267ebcb8`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_4d08149f9dd7b5784cadd265396b01c3、pc_f9249fb783344fbbcfe32c05267ebcb8 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.9, sub-topic 5.1 Differentiation（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“导数符号与函数图像关系”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 36. 5.1.02｜隐函数与参数函数求导

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_implicit_parametric_differentiation`
- 映射 ID：`map_sg_h2_math_9758_2026_o_implicit_parametric_differentiation`
- 中文释义：对简单隐函数和参数函数求导。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：隐函数微分（`pc_291eccaad32d6e2b88654e4670202509`）；参数微分（`pc_7430a9a6308a8998f2a18d7a50c51616`）
- 判断理由：两个既有概念分别完整覆盖。
- 官方证据：PDF p.9, sub-topic 5.1 Differentiation（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 37. 5.1.03｜驻点分类

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_stationary_point_classification`
- 映射 ID：`map_sg_h2_math_9758_2026_o_stationary_point_classification`
- 中文释义：使用一阶或二阶导数检验分类局部极大、极小和驻点拐点。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：极值点（`pc_61dadf3e646d2fed3a3b5b81630b2563`）
- 判断理由：既有驻点概念直接覆盖定位与分类。
- 官方证据：PDF p.9, sub-topic 5.1 Differentiation（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 38. 5.1.04｜用图形技术估计导数与极值

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_gc_derivative_extrema`
- 映射 ID：`map_sg_h2_math_9758_2026_o_gc_derivative_extrema`
- 中文释义：用图形计算器或软件估计指定点导数并定位极值。
- 建议结论：有理由排除；关系 `not_applicable`；置信度 `high`
- 对应概念：无
- 判断理由：这是图形技术操作和评测证据，不应成为独立学科概念。
- 官方证据：PDF p.9, sub-topic 5.1 Differentiation（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 39. 5.1.05｜切线与法线

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_tangents_normals`
- 映射 ID：`map_sg_h2_math_9758_2026_o_tangents_normals`
- 中文释义：求显式、隐式或参数曲线的切线与法线。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：切线与法线（`pc_e48516f32ed219bfab284968f67ba2b4`）；隐函数微分（`pc_291eccaad32d6e2b88654e4670202509`）；参数微分（`pc_7430a9a6308a8998f2a18d7a50c51616`）
- 判断理由：现有切法线及两类求导概念组合覆盖。
- 官方证据：PDF p.9, sub-topic 5.1 Differentiation（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 40. 5.1.06｜局部最优化

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_local_optimisation`
- 映射 ID：`map_sg_h2_math_9758_2026_o_local_optimisation`
- 中文释义：建立一元函数并用导数解决局部最大最小实际问题。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：导数解决实际优化（`pc_7f364bd0df6065095b932f11a00d4941`）
- 判断理由：中国高中导数优化窄概念直接覆盖同一诊断目标。
- 官方证据：PDF p.9, sub-topic 5.1 Differentiation（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 41. 5.1.07｜相关变化率

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_connected_rates`
- 映射 ID：`map_sg_h2_math_9758_2026_o_connected_rates`
- 中文释义：由变量关系建立导数联系并求未知变化率。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：相关变化率（`pc_5ada2e4818384405fb8ea25e390ece93`）
- 判断理由：既有相关变化率 canonical 在 A-Level 与 MIT 图中共享。
- 官方证据：PDF p.9, sub-topic 5.1 Differentiation（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 42. 5.2.01｜标准麦克劳林展开

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_standard_maclaurin_series`
- 映射 ID：`map_sg_h2_math_9758_2026_o_standard_maclaurin_series`
- 中文释义：使用规定函数的标准麦克劳林展开到所需阶数。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：泰勒级数（`pc_c1be934889ced7140179984f36bd37cf`）
- 判断理由：MIT Taylor/Maclaurin 概念直接覆盖标准展开。
- 官方证据：PDF p.9, sub-topic 5.2 Maclaurin series（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 43. 5.2.02｜推导麦克劳林前若干项

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_derive_maclaurin_terms`
- 映射 ID：`map_sg_h2_math_9758_2026_o_derive_maclaurin_terms`
- 中文释义：通过重复求导、隐式求导或已知级数推导新展开的前若干项。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：泰勒级数（`pc_c1be934889ced7140179984f36bd37cf`）；隐函数微分（`pc_291eccaad32d6e2b88654e4670202509`）
- 判断理由：Taylor 展开与隐式求导组合覆盖指定方法。
- 官方证据：PDF p.9, sub-topic 5.2 Maclaurin series（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 44. 5.2.03｜级数收敛范围

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_series_convergence_range`
- 映射 ID：`map_sg_h2_math_9758_2026_o_series_convergence_range`
- 中文释义：确定标准幂级数适用的 x 范围。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：幂级数（`pc_b4706d8b591bf0b18ba7aefbab523c9c`）
- 判断理由：MIT 幂级数概念直接包含收敛半径和区间。
- 官方证据：PDF p.9, sub-topic 5.2 Maclaurin series（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 45. 5.2.04｜级数近似与小角近似

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_series_approximations`
- 映射 ID：`map_sg_h2_math_9758_2026_o_series_approximations`
- 中文释义：把麦克劳林级数作为函数近似，并使用规定的小角近似。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：麦克劳林与小角近似（`pc_155158921b82586ddb35fdb4e5be126e`）；泰勒级数（`pc_c1be934889ced7140179984f36bd37cf`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_155158921b82586ddb35fdb4e5be126e、pc_c1be934889ced7140179984f36bd37cf 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.9, sub-topic 5.2 Maclaurin series（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“级数近似与小角近似”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 46. 5.3.01｜标准积分形式

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_standard_integration_forms`
- 映射 ID：`map_sg_h2_math_9758_2026_o_standard_integration_forms`
- 中文释义：识别并积分规定的幂、指数、三角和有理标准形式。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：标准函数积分（`pc_ccdbe5629abf3bd57a2af7fed2325222`）
- 判断理由：现有标准函数积分概念直接覆盖。
- 官方证据：PDF p.10, sub-topic 5.3 Integration techniques（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 47. 5.3.02｜给定换元积分

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_given_substitution`
- 映射 ID：`map_sg_h2_math_9758_2026_o_given_substitution`
- 中文释义：按给定换元完成不定积分。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：换元积分（`pc_068c8dc8d8c675d3d5ce7ccecd096ffc`）
- 判断理由：既有换元积分概念直接覆盖。
- 官方证据：PDF p.10, sub-topic 5.3 Integration techniques（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 48. 5.3.03｜分部积分

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_integration_by_parts`
- 映射 ID：`map_sg_h2_math_9758_2026_o_integration_by_parts`
- 中文释义：使用分部积分处理函数乘积。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：分部积分（`pc_109312f1b6fc1335fa82c6f6af1f684c`）
- 判断理由：既有分部积分概念直接覆盖。
- 官方证据：PDF p.10, sub-topic 5.3 Integration techniques（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 49. 5.4.01｜定积分作为和式极限与面积

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_riemann_sum_area`
- 映射 ID：`map_sg_h2_math_9758_2026_o_riemann_sum_area`
- 中文释义：理解定积分是和式极限和有向面积。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：定积分（`pc_440f4c4a56ad058d19d3aab4c136729d`）
- 判断理由：MIT 定积分概念明确以黎曼和极限定义并解释有向面积。
- 官方证据：PDF p.10, sub-topic 5.4 Definite integrals（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 50. 5.4.02｜定积分计算

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_definite_integral_evaluation`
- 映射 ID：`map_sg_h2_math_9758_2026_o_definite_integral_evaluation`
- 中文释义：使用原函数和积分上下限解析计算定积分。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：定积分与面积（`pc_70ca4e3f9288a539a0658a8bfc5fd30e`）
- 判断理由：现有定积分与面积概念明确覆盖使用微积分基本定理计算定积分。
- 官方证据：PDF p.10, sub-topic 5.4 Definite integrals（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 51. 5.4.03｜使用图形技术近似定积分

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_definite_integral_technology`
- 映射 ID：`map_sg_h2_math_9758_2026_o_definite_integral_technology`
- 中文释义：使用图形计算器或绘图软件获得定积分近似值并检查合理性。
- 建议结论：有理由排除；关系 `not_applicable`；置信度 `high`
- 对应概念：无
- 判断理由：这是图形技术操作及作答证据，应进入教学与评测知识层。
- 官方证据：PDF p.10, sub-topic 5.4 Definite integrals（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 52. 5.4.04｜曲线围成面积

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_bounded_areas`
- 映射 ID：`map_sg_h2_math_9758_2026_o_bounded_areas`
- 中文释义：求曲线与坐标轴平行线、直线或另一曲线围成的面积，包括 x 轴下方情形。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：定积分与面积（`pc_70ca4e3f9288a539a0658a8bfc5fd30e`）；曲线间面积（`pc_fdb8e34b296a1710202568026f99cc54`）
- 判断理由：A-Level 定积分面积和 MIT 曲线间面积组合完整覆盖。
- 官方证据：PDF p.10, sub-topic 5.4 Definite integrals（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 53. 5.4.05｜旋转体体积

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_volumes_of_revolution`
- 映射 ID：`map_sg_h2_math_9758_2026_o_volumes_of_revolution`
- 中文释义：求绕 x 轴或 y 轴旋转所得立体体积。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：旋转体体积（`pc_976815608b52b80566be2966aa010743`）
- 判断理由：现有旋转体体积概念直接覆盖。
- 官方证据：PDF p.10, sub-topic 5.4 Definite integrals（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 54. 5.5.01｜可分离微分方程通解与特解

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_separable_ode_solutions`
- 映射 ID：`map_sg_h2_math_9758_2026_o_separable_ode_solutions`
- 中文释义：求可分离一阶微分方程的通解和满足初值的特解，包括按给定换元化为可分离形式。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：含初值与给定换元的可分离微分方程（`pc_3abc241a0eedef6ba58bf1ae2d6eb93a`）；分离变量（`pc_19b4d23ab3a52e66c899dbf16e583835`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_3abc241a0eedef6ba58bf1ae2d6eb93a、pc_19b4d23ab3a52e66c899dbf16e583835 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.10, sub-topic 5.5 Differential equations（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“可分离微分方程通解与特解”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 55. 5.5.02｜从情境建立微分方程

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_form_differential_equation`
- 映射 ID：`map_sg_h2_math_9758_2026_o_form_differential_equation`
- 中文释义：把问题情境中的变化率关系表示为微分方程。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：建立微分方程（`pc_1c40f01e7df9a2f35a81598b9edf2a2a`）
- 判断理由：既有建立微分方程概念直接覆盖。
- 官方证据：PDF p.10, sub-topic 5.5 Differential equations（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 56. 5.5.03｜解释微分方程及其解

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_interpret_ode_solution`
- 映射 ID：`map_sg_h2_math_9758_2026_o_interpret_ode_solution`
- 中文释义：在问题情境中解释微分方程、初值和解的含义及限制。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：情境中解释微分方程及其解（`pc_baed7089af5b006e15f04221326d2a5d`）；建立微分方程（`pc_1c40f01e7df9a2f35a81598b9edf2a2a`）；分离变量（`pc_19b4d23ab3a52e66c899dbf16e583835`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_baed7089af5b006e15f04221326d2a5d、pc_1c40f01e7df9a2f35a81598b9edf2a2a、pc_19b4d23ab3a52e66c899dbf16e583835 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.10, sub-topic 5.5 Differential equations（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“解释微分方程及其解”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 57. 6.1.01｜计数原理与排列组合

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_counting_arrangements`
- 映射 ID：`map_sg_h2_math_9758_2026_o_counting_arrangements`
- 中文释义：使用加法、乘法原理及排列组合处理直线或圆周排列、重复和限制。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：受限、重复与圆周排列（`pc_eef96c990935a92e07a3e4f266c6d8b7`）；排列组合（`pc_72b8e1a7b680bd575ff6d93a1e2c592b`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_eef96c990935a92e07a3e4f266c6d8b7、pc_72b8e1a7b680bd575ff6d93a1e2c592b 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.11, sub-topic 6.1 Probability（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“计数原理与排列组合”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 58. 6.1.02｜概率法则与事件关系

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_probability_laws_independence`
- 映射 ID：`map_sg_h2_math_9758_2026_o_probability_laws_independence`
- 中文释义：使用概率加法、乘法规则并辨析互斥与独立事件。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：概率法则（`pc_0c7c408f2fb208ecfb0b6758b1cd4a0a`）
- 判断理由：现有概率法则概念直接覆盖。
- 官方证据：PDF p.11, sub-topic 6.1 Probability（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 59. 6.1.03｜概率表格、Venn 图与树图

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_probability_representations`
- 映射 ID：`map_sg_h2_math_9758_2026_o_probability_representations`
- 中文释义：使用结果表、Venn 图、树图及排列组合方法组织样本空间并计算概率。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：概率表示与样本空间转换（`pc_d087f482be941779c1774129f95c83cb`）；Venn 图表达（`pc_c1ed59c17771ca7dfcca90c7c55fadc1`）；条件概率（`pc_cf8dbc5bcf596f0c4db74ea9886540a1`）；概率法则（`pc_0c7c408f2fb208ecfb0b6758b1cd4a0a`）；排列组合（`pc_72b8e1a7b680bd575ff6d93a1e2c592b`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_d087f482be941779c1774129f95c83cb、pc_c1ed59c17771ca7dfcca90c7c55fadc1、pc_cf8dbc5bcf596f0c4db74ea9886540a1、pc_0c7c408f2fb208ecfb0b6758b1cd4a0a、pc_72b8e1a7b680bd575ff6d93a1e2c592b 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.11, sub-topic 6.1 Probability（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“概率表格、Venn 图与树图”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 60. 6.1.04｜条件概率

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_conditional_probability`
- 映射 ID：`map_sg_h2_math_9758_2026_o_conditional_probability`
- 中文释义：在简单情形计算条件概率并使用标准公式。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：条件概率（`pc_cf8dbc5bcf596f0c4db74ea9886540a1`）
- 判断理由：既有条件概率概念直接覆盖。
- 官方证据：PDF p.11, sub-topic 6.1 Probability（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 61. 6.2.01｜离散分布、期望与方差

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_discrete_distribution_moments`
- 映射 ID：`map_sg_h2_math_9758_2026_o_discrete_distribution_moments`
- 中文释义：构造离散随机变量概率分布并计算期望和方差。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：离散随机变量（`pc_bd3e94ad62025e9a58ab6e2016182924`）
- 判断理由：既有离散随机变量概念直接覆盖。
- 官方证据：PDF p.11, sub-topic 6.2 Discrete random variables（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 62. 6.2.02｜二项分布模型及适用条件

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_binomial_model_conditions`
- 映射 ID：`map_sg_h2_math_9758_2026_o_binomial_model_conditions`
- 中文释义：识别二项分布并判断固定试验次数、独立性和恒定成功概率等适用条件。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：二项分布（`pc_dab02572a5e34659342ea1fb544803f8`）
- 判断理由：既有二项分布概念直接包含模型条件。
- 官方证据：PDF p.11, sub-topic 6.2 Discrete random variables（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 63. 6.2.03｜二项分布均值与方差

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_binomial_mean_variance`
- 映射 ID：`map_sg_h2_math_9758_2026_o_binomial_mean_variance`
- 中文释义：使用二项分布均值和方差公式解决问题。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：二项分布（`pc_dab02572a5e34659342ea1fb544803f8`）
- 判断理由：同一二项分布 canonical 覆盖参数、均值和方差。
- 官方证据：PDF p.11, sub-topic 6.2 Discrete random variables（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 64. 6.3.01｜连续随机变量与正态模型

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_continuous_normal_model`
- 映射 ID：`map_sg_h2_math_9758_2026_o_continuous_normal_model`
- 中文释义：理解连续随机变量，并使用均值和方差定义的正态分布作为概率模型。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：连续随机变量（`pc_5f55e60931935e299996e34826f1a0e9`）；正态分布（`pc_23858effd2dd68284bd0c6b645607386`）
- 判断理由：两个既有 canonical 概念分别覆盖连续变量和正态模型。
- 官方证据：PDF p.12, sub-topic 6.3 Normal distribution（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 65. 6.3.02｜正态概率与参数反求

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_normal_probabilities_parameters`
- 映射 ID：`map_sg_h2_math_9758_2026_o_normal_probabilities_parameters`
- 中文释义：标准化正态变量，利用对称性求概率或由概率反求阈值和参数关系。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：正态概率与参数反求（`pc_d3fe5191e8f9cbcc11d138b2398d7d39`）；正态分布（`pc_23858effd2dd68284bd0c6b645607386`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_d3fe5191e8f9cbcc11d138b2398d7d39、pc_23858effd2dd68284bd0c6b645607386 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.12, sub-topic 6.3 Normal distribution（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“正态概率与参数反求”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 66. 6.3.03｜线性变换的期望与方差

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_linear_transform_moments`
- 映射 ID：`map_sg_h2_math_9758_2026_o_linear_transform_moments`
- 中文释义：计算 E(aX+b) 与 Var(aX+b)。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：随机变量线性变换的期望与方差（`pc_6e5628aaaaa688905edfcdb9e9bd31de`）；期望（`pc_d9a0d8a8f6fc271c56cb2d9dde6576ec`）；方差与协方差（`pc_8d0a38a8e8f86cd83ae1f091a62f2cad`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_6e5628aaaaa688905edfcdb9e9bd31de、pc_d9a0d8a8f6fc271c56cb2d9dde6576ec、pc_8d0a38a8e8f86cd83ae1f091a62f2cad 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.12, sub-topic 6.3 Normal distribution（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“线性变换的期望与方差”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 67. 6.3.04｜独立随机变量线性组合的期望与方差

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_independent_sum_moments`
- 映射 ID：`map_sg_h2_math_9758_2026_o_independent_sum_moments`
- 中文释义：对独立 X、Y 计算 E(aX+bY) 与 Var(aX+bY)。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：独立随机变量线性组合的期望与方差（`pc_b6ae379a519add3186b6f9563641f292`）；期望（`pc_d9a0d8a8f6fc271c56cb2d9dde6576ec`）；方差与协方差（`pc_8d0a38a8e8f86cd83ae1f091a62f2cad`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_b6ae379a519add3186b6f9563641f292、pc_d9a0d8a8f6fc271c56cb2d9dde6576ec、pc_8d0a38a8e8f86cd83ae1f091a62f2cad 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.12, sub-topic 6.3 Normal distribution（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“独立随机变量线性组合的期望与方差”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 68. 6.4.01｜总体与简单随机样本

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_population_random_sample`
- 映射 ID：`map_sg_h2_math_9758_2026_o_population_random_sample`
- 中文释义：理解总体、简单随机样本及抽样中的随机性。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：抽样（`pc_14be091db45947021ec317ac23ac5401`）
- 判断理由：既有抽样 canonical 明确覆盖总体与样本。
- 官方证据：PDF p.12, sub-topic 6.4 Sampling（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 69. 6.4.02｜样本均值的分布

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_sample_mean_distribution`
- 映射 ID：`map_sg_h2_math_9758_2026_o_sample_mean_distribution`
- 中文释义：把样本均值视为随机变量，使用其期望与方差，并处理正态总体下的精确分布。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：抽样（`pc_14be091db45947021ec317ac23ac5401`）；正态分布（`pc_23858effd2dd68284bd0c6b645607386`）
- 判断理由：抽样 canonical 和正态分布组合覆盖。
- 官方证据：PDF p.12, sub-topic 6.4 Sampling（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 70. 6.4.03｜样本均值的中心极限定理

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_central_limit_sample_mean`
- 映射 ID：`map_sg_h2_math_9758_2026_o_central_limit_sample_mean`
- 中文释义：在样本量足够大时用中心极限定理近似样本均值分布。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：中心极限定理（`pc_2e9fda1932139d389e99613d454f355c`）；抽样（`pc_14be091db45947021ec317ac23ac5401`）
- 判断理由：CLT 与抽样概念组合直接覆盖。
- 官方证据：PDF p.12, sub-topic 6.4 Sampling（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 71. 6.4.04｜样本无偏估计

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_unbiased_sample_estimates`
- 映射 ID：`map_sg_h2_math_9758_2026_o_unbiased_sample_estimates`
- 中文释义：由原始或汇总数据计算总体均值和方差的无偏估计。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：统计估计（`pc_327828115364d07966390e1866528270`）
- 判断理由：既有统计估计 canonical 直接覆盖无偏均值和方差估计。
- 官方证据：PDF p.12, sub-topic 6.4 Sampling（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 72. 6.5.01｜假设检验基本概念

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_hypothesis_test_concepts`
- 映射 ID：`map_sg_h2_math_9758_2026_o_hypothesis_test_concepts`
- 中文释义：理解原假设、备择假设、检验统计量、临界域、显著性水平和 p 值。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：假设检验概念、临界域与 p 值（`pc_1b57223154105f385a53683ed93b8917`）；假设检验（`pc_5e8204fe2f43100f3de7f78a5824d321`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_1b57223154105f385a53683ed93b8917、pc_5e8204fe2f43100f3de7f78a5824d321 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.13, sub-topic 6.5 Hypothesis testing（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“假设检验基本概念”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 73. 6.5.02｜总体均值假设检验

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_one_mean_hypothesis_test`
- 映射 ID：`map_sg_h2_math_9758_2026_o_one_mean_hypothesis_test`
- 中文释义：针对已知方差正态总体样本或任意总体大样本建立并执行总体均值检验。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：单总体均值假设检验（`pc_0c7cea3a120654ca950f6328bada7f29`）；假设检验（`pc_5e8204fe2f43100f3de7f78a5824d321`）；抽样（`pc_14be091db45947021ec317ac23ac5401`）；正态分布（`pc_23858effd2dd68284bd0c6b645607386`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_0c7cea3a120654ca950f6328bada7f29、pc_5e8204fe2f43100f3de7f78a5824d321、pc_14be091db45947021ec317ac23ac5401、pc_23858effd2dd68284bd0c6b645607386 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.13, sub-topic 6.5 Hypothesis testing（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“总体均值假设检验”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 74. 6.5.03｜单尾与双尾检验

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_one_two_tailed_tests`
- 映射 ID：`map_sg_h2_math_9758_2026_o_one_two_tailed_tests`
- 中文释义：根据备择假设选择单尾或双尾检验及相应临界域。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：单尾与双尾假设检验（`pc_f415daef0495c59dcc47d3019cc79bc6`）；假设检验（`pc_5e8204fe2f43100f3de7f78a5824d321`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_f415daef0495c59dcc47d3019cc79bc6、pc_5e8204fe2f43100f3de7f78a5824d321 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.13, sub-topic 6.5 Hypothesis testing（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“单尾与双尾检验”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 75. 6.5.04｜解释假设检验结论

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_interpret_hypothesis_result`
- 映射 ID：`map_sg_h2_math_9758_2026_o_interpret_hypothesis_result`
- 中文释义：在问题语境中解释拒绝或不拒绝原假设的含义，不扩展到大纲排除的错误类型。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：情境中解释假设检验结论（`pc_5199b5ff650e904e87b0e95d4228f807`）；假设检验（`pc_5e8204fe2f43100f3de7f78a5824d321`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_5199b5ff650e904e87b0e95d4228f807、pc_5e8204fe2f43100f3de7f78a5824d321 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.13, sub-topic 6.5 Hypothesis testing（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“解释假设检验结论”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 76. 6.6.01｜散点图与线性关系判断

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_scatter_linear_plausibility`
- 映射 ID：`map_sg_h2_math_9758_2026_o_scatter_linear_plausibility`
- 中文释义：由散点图判断变量间是否存在可信的线性关系。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：散点图与线性关系合理性（`pc_e509f13c1e239978b74733175b7f064c`）；样本相关系数（`pc_629b0c54807299e247ddd77ea5076dd6`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_e509f13c1e239978b74733175b7f064c、pc_629b0c54807299e247ddd77ea5076dd6 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.13, sub-topic 6.6 Correlation and linear regression（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“散点图与线性关系判断”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 77. 6.6.02｜积矩相关系数解释

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_pmcc_interpretation`
- 映射 ID：`map_sg_h2_math_9758_2026_o_pmcc_interpretation`
- 中文释义：把积矩相关系数解释为线性模型拟合程度，特别解释接近 -1、0、1 的情形。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：积矩相关系数解释（`pc_ad7a1774c52a28bad236b9cd642c8867`）；样本相关系数（`pc_629b0c54807299e247ddd77ea5076dd6`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_ad7a1774c52a28bad236b9cd642c8867、pc_629b0c54807299e247ddd77ea5076dd6 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.13, sub-topic 6.6 Correlation and linear regression（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“积矩相关系数解释”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 78. 6.6.03｜最小二乘线性回归

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_least_squares_regression`
- 映射 ID：`map_sg_h2_math_9758_2026_o_least_squares_regression`
- 中文释义：使用最小二乘法求二元数据的线性回归方程。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：二元数据最小二乘回归（`pc_8c40d58addedb33cf22ac1efd9905af4`）；线性回归（`pc_ed18cde6c3d7e08e9e371061418a7424`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_8c40d58addedb33cf22ac1efd9905af4、pc_ed18cde6c3d7e08e9e371061418a7424 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.13, sub-topic 6.6 Correlation and linear regression（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“最小二乘线性回归”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`

## 79. 6.6.04｜回归预测、内插外推与限制

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_regression_prediction_limits`
- 映射 ID：`map_sg_h2_math_9758_2026_o_regression_prediction_limits`
- 中文释义：选择适当回归线进行内插或外推，预测并评价线性模型和相关非因果等限制。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：回归预测及其限制（`pc_85acd13e8f4afec2979a3288f911c926`）
- 判断理由：中国高中回归预测窄概念直接覆盖相同统计边界。
- 官方证据：PDF p.13, sub-topic 6.6 Correlation and linear regression（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 80. 6.6.05｜变量变换实现线性化

- 课程要求 ID：`req_sg_h2_math_9758_2026_o_transform_to_linearity`
- 映射 ID：`map_sg_h2_math_9758_2026_o_transform_to_linearity`
- 中文释义：使用平方、倒数或对数变换把关系转化为线性形式。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：变量变换实现线性化（`pc_e36b98906e813a98f82ca4c1f2f8a68c`）；对数线性化（`pc_1ea1ea6ee0e270c4aad9c97a380db664`）
- 判断理由：经全库反向查重和成果粒度复核，现由 pc_e36b98906e813a98f82ca4c1f2f8a68c、pc_1ea1ea6ee0e270c4aad9c97a380db664 完整覆盖；新节点仍待人工批准。
- 官方证据：PDF p.13, sub-topic 6.6 Correlation and linear regression（`src_sg_seab_h2_math_9758_2026`）
- KG 后续动作：`split_or_narrow_existing`；候选“变量变换实现线性化”；已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。
- 审核状态：`needs_review`
