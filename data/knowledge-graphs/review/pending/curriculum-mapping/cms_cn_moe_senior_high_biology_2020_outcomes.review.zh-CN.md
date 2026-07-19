# 中国普通高中生物学课程标准（2017 年版 2020 年修订）成果级覆盖：KG 映射待审核包

> 本文件只展示 AI 提出的待审建议。所有条目均为 `needs_review`，未经人工批准不会进入正式 KG。
> 当前集合按官方逐条学习成果核对，可用于判断课程覆盖缺口。

- 课程：`cur_cn_moe_senior_high_biology_2020`
- 课程框架：`cfw_cn_moe_senior_high_biology_2020_outcomes`
- 映射集合：`cms_cn_moe_senior_high_biology_2020_outcomes`
- 地区：`CN-MAINLAND`
- 课程版本：`0.3.0`
- 映射版本：`0.4.0`
- 映射范围：`outcome_coverage`
- 官方来源：`src_cn_moe_senior_high_biology_2020`
- 覆盖统计：完整 118；部分 0；未映射 0；排除 2
- KG 缺口建议：新增概念 48；拆分或收窄 28；不进入知识概念 0

## 1. 必修·分子与细胞·1.1.1｜细胞元素与碳链骨架

- 课程要求 ID：`req_cn_sh_bio_2020_o_rc_1_1_1_cellular_elements_carbon_skeletons`
- 映射 ID：`map_cn_sh_bio_2020_o_rc_1_1_1_cellular_elements_carbon_skeletons`
- 中文释义：说明细胞主要元素如何以碳链为骨架形成复杂生物大分子。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：单体、聚合物与共价连接（`pc_fa5e5c389a8f790944f2e6049357654b`）；细胞元素与碳链骨架（`pc_b010170fadec4b31174da9a87a4332e1`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_fa5e5c389a8f790944f2e6049357654b、pc_b010170fadec4b31174da9a87a4332e1 完整覆盖。
- 官方证据：生物学标准PDF p.21（正文对应内容要求 1.1.1），必修·分子与细胞（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“细胞元素与碳链骨架”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 2. 必修·分子与细胞·1.1.2｜细胞中的水

- 课程要求 ID：`req_cn_sh_bio_2020_o_rc_1_1_2_cellular_water`
- 映射 ID：`map_cn_sh_bio_2020_o_rc_1_1_2_cellular_water`
- 中文释义：说明自由水和结合水赋予细胞的特性及其生命活动作用。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：水（`pc_63dfa087168bfb9834409155d515790e`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.21（正文对应内容要求 1.1.2），必修·分子与细胞（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 3. 必修·分子与细胞·1.1.3｜细胞中的无机盐

- 课程要求 ID：`req_cn_sh_bio_2020_o_rc_1_1_3_cellular_inorganic_salts`
- 映射 ID：`map_cn_sh_bio_2020_o_rc_1_1_3_cellular_inorganic_salts`
- 中文释义：举例说明少量无机盐对细胞生命活动的重要作用。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：细胞中的无机盐（`pc_c088a7df0656c7e3658e30f9fda3d609`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_c088a7df0656c7e3658e30f9fda3d609 完整覆盖。
- 官方证据：生物学标准PDF p.21（正文对应内容要求 1.1.3），必修·分子与细胞（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“细胞中的无机盐”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 4. 必修·分子与细胞·1.1.4｜糖类的结构与供能作用

- 课程要求 ID：`req_cn_sh_bio_2020_o_rc_1_1_4_carbohydrate_roles`
- 映射 ID：`map_cn_sh_bio_2020_o_rc_1_1_4_carbohydrate_roles`
- 中文释义：概述糖类类型及其作为结构成分和主要能源物质的作用。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：碳水化合物（`pc_d2d44c20526a3ef06addda76bd0c3a1a`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.21（正文对应内容要求 1.1.4），必修·分子与细胞（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 5. 必修·分子与细胞·1.1.5｜脂质的结构与功能作用

- 课程要求 ID：`req_cn_sh_bio_2020_o_rc_1_1_5_lipid_roles`
- 映射 ID：`map_cn_sh_bio_2020_o_rc_1_1_5_lipid_roles`
- 中文释义：举例说明不同脂质维持细胞结构和功能的作用。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：脂质（`pc_a25a3778f32928001d458246f6e48696`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.21（正文对应内容要求 1.1.5），必修·分子与细胞（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 6. 必修·分子与细胞·1.1.6｜蛋白质结构与功能

- 课程要求 ID：`req_cn_sh_bio_2020_o_rc_1_1_6_protein_structure_function`
- 映射 ID：`map_cn_sh_bio_2020_o_rc_1_1_6_protein_structure_function`
- 中文释义：说明氨基酸序列、空间结构与蛋白质功能之间的关系。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：蛋白质（`pc_e6ccc14f032828a2848774a7431ee682`）；单体、聚合物与共价连接（`pc_fa5e5c389a8f790944f2e6049357654b`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.21（正文对应内容要求 1.1.6），必修·分子与细胞（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 7. 必修·分子与细胞·1.1.7｜核酸与遗传信息

- 课程要求 ID：`req_cn_sh_bio_2020_o_rc_1_1_7_nucleic_acids_information`
- 映射 ID：`map_cn_sh_bio_2020_o_rc_1_1_7_nucleic_acids_information`
- 中文释义：概述核苷酸聚合形成核酸及其储存和传递遗传信息的功能。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：DNA结构（`pc_6a00c0df14c5b18459964bd5ccb5c243`）；RNA 与 mRNA 结构（`pc_7c8644ecf9e964364af575d584241cf8`）；单体、聚合物与共价连接（`pc_fa5e5c389a8f790944f2e6049357654b`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.21（正文对应内容要求 1.1.7），必修·分子与细胞（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 8. 必修·分子与细胞·1.2.1｜质膜的边界、运输与交流功能

- 课程要求 ID：`req_cn_sh_bio_2020_o_rc_1_2_1_plasma_membrane_functions`
- 映射 ID：`map_cn_sh_bio_2020_o_rc_1_2_1_plasma_membrane_functions`
- 中文释义：说明质膜分隔环境、控制物质进出并参与细胞间信息交流。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：膜结构（`pc_5ff2cda97c05cbe449e6d6bcff0c0834`）；质膜的边界、运输与交流功能（`pc_7f67c92fa0c79a54f0822060ac8a4080`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_5ff2cda97c05cbe449e6d6bcff0c0834、pc_7f67c92fa0c79a54f0822060ac8a4080 完整覆盖。
- 官方证据：生物学标准PDF p.22（正文对应内容要求 1.2.1），必修·分子与细胞（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“质膜的边界、运输与交流功能”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 9. 必修·分子与细胞·1.2.2｜细胞器分工

- 课程要求 ID：`req_cn_sh_bio_2020_o_rc_1_2_2_organelle_functions`
- 映射 ID：`map_cn_sh_bio_2020_o_rc_1_2_2_organelle_functions`
- 中文释义：说明细胞器在运输、合成、分解、能量转换和信息传递中的分工。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：真核细胞器（`pc_cb341a51c60bb212ac55750a84630c03`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.22（正文对应内容要求 1.2.2），必修·分子与细胞（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 10. 必修·分子与细胞·1.2.3｜细胞核与遗传信息

- 课程要求 ID：`req_cn_sh_bio_2020_o_rc_1_2_3_nucleus_genetic_information`
- 映射 ID：`map_cn_sh_bio_2020_o_rc_1_2_3_nucleus_genetic_information`
- 中文释义：说明真核细胞遗传信息主要储存在细胞核中。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：DNA结构（`pc_6a00c0df14c5b18459964bd5ccb5c243`）；真核细胞器（`pc_cb341a51c60bb212ac55750a84630c03`）；细胞核与遗传信息（`pc_f25b23ea81c506e587d3067e86866c09`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_6a00c0df14c5b18459964bd5ccb5c243、pc_cb341a51c60bb212ac55750a84630c03、pc_f25b23ea81c506e587d3067e86866c09 完整覆盖。
- 官方证据：生物学标准PDF p.22（正文对应内容要求 1.2.3），必修·分子与细胞（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“细胞核与遗传信息”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 11. 必修·分子与细胞·1.2.4｜细胞结构的协调合作

- 课程要求 ID：`req_cn_sh_bio_2020_o_rc_1_2_4_organelle_coordination`
- 映射 ID：`map_cn_sh_bio_2020_o_rc_1_2_4_organelle_coordination`
- 中文释义：说明细胞各部分相互联系、协调执行生命活动。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：真核细胞器（`pc_cb341a51c60bb212ac55750a84630c03`）；细胞结构的协调合作（`pc_78dd182e4fbad59e57aeb4484e1c3954`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_cb341a51c60bb212ac55750a84630c03、pc_78dd182e4fbad59e57aeb4484e1c3954 完整覆盖。
- 官方证据：生物学标准PDF p.22（正文对应内容要求 1.2.4），必修·分子与细胞（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“细胞结构的协调合作”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 12. 必修·分子与细胞·1.3.1｜细胞结构统一性与形态功能多样性

- 课程要求 ID：`req_cn_sh_bio_2020_o_rc_1_3_1_cellular_unity_diversity`
- 映射 ID：`map_cn_sh_bio_2020_o_rc_1_3_1_cellular_unity_diversity`
- 中文释义：比较单细胞和多细胞生物的细胞结构共性及形态功能差异。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：细胞结构统一性与形态功能多样性（`pc_64852ab0501ee4d7b32d11655eb6b808`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_64852ab0501ee4d7b32d11655eb6b808 完整覆盖。
- 官方证据：生物学标准PDF p.22（正文对应内容要求 1.3.1），必修·分子与细胞（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“细胞结构统一性与形态功能多样性”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 13. 必修·分子与细胞·1.3.2｜原核细胞与真核细胞

- 课程要求 ID：`req_cn_sh_bio_2020_o_rc_1_3_2_prokaryotic_eukaryotic_cells`
- 映射 ID：`map_cn_sh_bio_2020_o_rc_1_3_2_prokaryotic_eukaryotic_cells`
- 中文释义：以是否具有核膜包被的细胞核区分原核细胞与真核细胞。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：原核细胞（`pc_73b46a23c7b4bbe42eefc3cac483d36a`）；真核细胞器（`pc_cb341a51c60bb212ac55750a84630c03`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.22（正文对应内容要求 1.3.2），必修·分子与细胞（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 14. 必修·分子与细胞·2.1.1｜质膜的选择透过性

- 课程要求 ID：`req_cn_sh_bio_2020_o_rc_2_1_1_selective_permeability`
- 映射 ID：`map_cn_sh_bio_2020_o_rc_2_1_1_selective_permeability`
- 中文释义：说明质膜选择性控制不同物质通过。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：膜结构（`pc_5ff2cda97c05cbe449e6d6bcff0c0834`）；扩散与渗透（`pc_c2e6fec2c47cd86ee9b8726b908a7a8b`）；质膜的选择透过性（`pc_4e487be68da0fcc9a3f8c5df2493c062`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_5ff2cda97c05cbe449e6d6bcff0c0834、pc_c2e6fec2c47cd86ee9b8726b908a7a8b、pc_4e487be68da0fcc9a3f8c5df2493c062 完整覆盖。
- 官方证据：生物学标准PDF p.22（正文对应内容要求 2.1.1），必修·分子与细胞（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“质膜的选择透过性”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 15. 必修·分子与细胞·2.1.2｜被动运输与主动运输

- 课程要求 ID：`req_cn_sh_bio_2020_o_rc_2_1_2_passive_active_transport`
- 映射 ID：`map_cn_sh_bio_2020_o_rc_2_1_2_passive_active_transport`
- 中文释义：比较顺浓度梯度的被动运输和需要能量、载体的主动运输。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：扩散与渗透（`pc_c2e6fec2c47cd86ee9b8726b908a7a8b`）；主动运输（`pc_0e1132fcaae68d745353f67bc9411890`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.22（正文对应内容要求 2.1.2），必修·分子与细胞（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 16. 必修·分子与细胞·2.1.3｜胞吞与胞吐

- 课程要求 ID：`req_cn_sh_bio_2020_o_rc_2_1_3_endocytosis_exocytosis`
- 映射 ID：`map_cn_sh_bio_2020_o_rc_2_1_3_endocytosis_exocytosis`
- 中文释义：说明大分子通过胞吞和胞吐进出细胞。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：胞吞与胞吐（`pc_1264ba133e13ba77487296037ce4c00e`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_1264ba133e13ba77487296037ce4c00e 完整覆盖。
- 官方证据：生物学标准PDF p.22（正文对应内容要求 2.1.3），必修·分子与细胞（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“胞吞与胞吐”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 17. 必修·分子与细胞·2.2.1｜酶及其环境影响因素

- 课程要求 ID：`req_cn_sh_bio_2020_o_rc_2_2_1_enzymes_environment`
- 映射 ID：`map_cn_sh_bio_2020_o_rc_2_2_1_enzymes_environment`
- 中文释义：说明酶的蛋白质本质、催化作用及温度和 pH 对活性的影响。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：酶作用（`pc_eb22ca391770b29f75a2f022a09e31af`）；影响酶活性的因素（`pc_564bc6d850ae2725515787c450597c10`）；蛋白质（`pc_e6ccc14f032828a2848774a7431ee682`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.22（正文对应内容要求 2.2.1），必修·分子与细胞（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 18. 必修·分子与细胞·2.2.2｜ATP 是直接能源物质

- 课程要求 ID：`req_cn_sh_bio_2020_o_rc_2_2_2_atp_direct_energy`
- 映射 ID：`map_cn_sh_bio_2020_o_rc_2_2_2_atp_direct_energy`
- 中文释义：解释 ATP 如何直接驱动细胞生命活动。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：ATP 与细胞能量耦联（`pc_bd16e15b61962db0c5d04fea198cb45c`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.22（正文对应内容要求 2.2.2），必修·分子与细胞（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 19. 必修·分子与细胞·2.2.3｜光合作用能量转换

- 课程要求 ID：`req_cn_sh_bio_2020_o_rc_2_2_3_photosynthetic_energy_conversion`
- 映射 ID：`map_cn_sh_bio_2020_o_rc_2_2_3_photosynthetic_energy_conversion`
- 中文释义：说明叶绿体将光能转换并储存在糖分子的化学能中。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：光依赖反应（`pc_04f61e525cd19d1f02e6846892d426c8`）；Calvin循环（`pc_4b41c3d012fb26c23a16100b7cbafcd5`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.22（正文对应内容要求 2.2.3），必修·分子与细胞（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 20. 必修·分子与细胞·2.2.4｜细胞呼吸能量转换

- 课程要求 ID：`req_cn_sh_bio_2020_o_rc_2_2_4_respiratory_energy_conversion`
- 映射 ID：`map_cn_sh_bio_2020_o_rc_2_2_4_respiratory_energy_conversion`
- 中文释义：说明细胞呼吸将有机分子能量转化为生命活动可利用的能量。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：糖酵解（`pc_2fbda0110630d41f4792066ddae82f27`）；连接反应与Krebs循环（`pc_ae13d4aab464e4aaeeb019b31d5433b1`）；氧化磷酸化（`pc_f9019fae31d0d89640aa7147bd1511ba`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.23（正文对应内容要求 2.2.4），必修·分子与细胞（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 21. 必修·分子与细胞·2.3.1｜有丝分裂与遗传信息连续性

- 课程要求 ID：`req_cn_sh_bio_2020_o_rc_2_3_1_mitosis_information_continuity`
- 映射 ID：`map_cn_sh_bio_2020_o_rc_2_3_1_mitosis_information_continuity`
- 中文释义：说明有丝分裂保证亲代与子代细胞遗传信息一致。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：有丝分裂（`pc_e8a318724c6c8e8096b98fc763ca69c6`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.23（正文对应内容要求 2.3.1），必修·分子与细胞（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 22. 必修·分子与细胞·2.3.2｜细胞分化

- 课程要求 ID：`req_cn_sh_bio_2020_o_rc_2_3_2_cell_differentiation`
- 映射 ID：`map_cn_sh_bio_2020_o_rc_2_3_2_cell_differentiation`
- 中文释义：说明细胞形态、结构和功能的特异性分化如何形成多细胞生物体。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：基因表达控制（`pc_56602e952c30d81d754e3900e34590cf`）；细胞分化（`pc_603e03befcc0fac76e8a059261559f56`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_56602e952c30d81d754e3900e34590cf、pc_603e03befcc0fac76e8a059261559f56 完整覆盖。
- 官方证据：生物学标准PDF p.23（正文对应内容要求 2.3.2），必修·分子与细胞（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“细胞分化”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 23. 必修·分子与细胞·2.3.3｜细胞衰老与死亡

- 课程要求 ID：`req_cn_sh_bio_2020_o_rc_2_3_3_cell_senescence_death`
- 映射 ID：`map_cn_sh_bio_2020_o_rc_2_3_3_cell_senescence_death`
- 中文释义：说明正常细胞衰老和死亡是自然生理过程。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：细胞衰老与死亡（`pc_53d0352a79deedffc387d00ac17676a7`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_53d0352a79deedffc387d00ac17676a7 完整覆盖。
- 官方证据：生物学标准PDF p.23（正文对应内容要求 2.3.3），必修·分子与细胞（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“细胞衰老与死亡”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 24. 必修·遗传与进化·3.1.1｜基因是核酸功能片段

- 课程要求 ID：`req_cn_sh_bio_2020_o_rg_3_1_1_gene_nucleic_acid_segment`
- 映射 ID：`map_cn_sh_bio_2020_o_rg_3_1_1_gene_nucleic_acid_segment`
- 中文释义：说明多数生物基因位于 DNA，部分病毒基因位于 RNA。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：DNA结构（`pc_6a00c0df14c5b18459964bd5ccb5c243`）；RNA 与 mRNA 结构（`pc_7c8644ecf9e964364af575d584241cf8`）；病毒结构与核酸分类（`pc_a5f0cc3dc0636e18a4fef67d49bec23e`）；基因是核酸功能片段（`pc_4968ce1f12aa3d8827a46863b03b81d2`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_6a00c0df14c5b18459964bd5ccb5c243、pc_7c8644ecf9e964364af575d584241cf8、pc_a5f0cc3dc0636e18a4fef67d49bec23e、pc_4968ce1f12aa3d8827a46863b03b81d2 完整覆盖。
- 官方证据：生物学标准PDF p.25（正文对应内容要求 3.1.1），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“基因是核酸功能片段”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 25. 必修·遗传与进化·3.1.2｜DNA 结构与遗传信息编码

- 课程要求 ID：`req_cn_sh_bio_2020_o_rg_3_1_2_dna_structure_information`
- 映射 ID：`map_cn_sh_bio_2020_o_rg_3_1_2_dna_structure_information`
- 中文释义：说明 DNA 双螺旋、反向平行和碱基互补配对如何承载遗传信息。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：DNA结构（`pc_6a00c0df14c5b18459964bd5ccb5c243`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.25（正文对应内容要求 3.1.2），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 26. 必修·遗传与进化·3.1.3｜DNA 半保留复制

- 课程要求 ID：`req_cn_sh_bio_2020_o_rg_3_1_3_semiconservative_replication`
- 映射 ID：`map_cn_sh_bio_2020_o_rg_3_1_3_semiconservative_replication`
- 中文释义：概述 DNA 的半保留复制。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：DNA复制（`pc_04b4d91c6cced626ffbf487f19cdfefe`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.25（正文对应内容要求 3.1.3），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 27. 必修·遗传与进化·3.1.4｜遗传信息表达、分化与性状

- 课程要求 ID：`req_cn_sh_bio_2020_o_rg_3_1_4_gene_expression_traits`
- 映射 ID：`map_cn_sh_bio_2020_o_rg_3_1_4_gene_expression_traits`
- 中文释义：说明转录和翻译、基因选择性表达以及蛋白质与性状的关系。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：转录（`pc_7674a139c06bd613155a2e3818756eb6`）；翻译（`pc_5f5a971454fc73259add3a98f4ad69cd`）；基因表达控制（`pc_56602e952c30d81d754e3900e34590cf`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.25（正文对应内容要求 3.1.4），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 28. 必修·遗传与进化·3.1.5｜表观遗传现象

- 课程要求 ID：`req_cn_sh_bio_2020_o_rg_3_1_5_epigenetic_phenomena`
- 映射 ID：`map_cn_sh_bio_2020_o_rg_3_1_5_epigenetic_phenomena`
- 中文释义：说明碱基序列不变而表型改变的表观遗传现象。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：表观遗传现象（`pc_db8e1b5b05c1c8cc184a64e1c68c3435`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_db8e1b5b05c1c8cc184a64e1c68c3435 完整覆盖。
- 官方证据：生物学标准PDF p.25（正文对应内容要求 3.1.5），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“表观遗传现象”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 29. 必修·遗传与进化·3.2.1｜减数分裂与染色体减半

- 课程要求 ID：`req_cn_sh_bio_2020_o_rg_3_2_1_meiotic_reduction`
- 映射 ID：`map_cn_sh_bio_2020_o_rg_3_2_1_meiotic_reduction`
- 中文释义：说明减数分裂产生染色体数量减半的精细胞或卵细胞。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：减数分裂（`pc_9a64e0d9f35ef30bda722f5b7364e0c4`）；染色体行为（`pc_41f9701a3bd0fb4527df662b596620b5`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.25（正文对应内容要求 3.2.1），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 30. 必修·遗传与进化·3.2.2｜遗传信息经配子传递

- 课程要求 ID：`req_cn_sh_bio_2020_o_rg_3_2_2_gametic_inheritance`
- 映射 ID：`map_cn_sh_bio_2020_o_rg_3_2_2_gametic_inheritance`
- 中文释义：说明有性生殖中遗传信息通过配子传给子代。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：减数分裂（`pc_9a64e0d9f35ef30bda722f5b7364e0c4`）；遗传信息经配子传递（`pc_f90fa4062e2970091368eb5d22919cf4`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_9a64e0d9f35ef30bda722f5b7364e0c4、pc_f90fa4062e2970091368eb5d22919cf4 完整覆盖。
- 官方证据：生物学标准PDF p.25（正文对应内容要求 3.2.2），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“遗传信息经配子传递”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 31. 必修·遗传与进化·3.2.3｜分离与自由组合

- 课程要求 ID：`req_cn_sh_bio_2020_o_rg_3_2_3_segregation_independent_assortment`
- 映射 ID：`map_cn_sh_bio_2020_o_rg_3_2_3_segregation_independent_assortment`
- 中文释义：使用基因分离和自由组合预测子代基因型与表型。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：遗传杂交（`pc_0a20187ab8711d84834ffc5e887d019b`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.25（正文对应内容要求 3.2.3），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 32. 必修·遗传与进化·3.2.4｜伴性遗传

- 课程要求 ID：`req_cn_sh_bio_2020_o_rg_3_2_4_sex_linked_inheritance`
- 映射 ID：`map_cn_sh_bio_2020_o_rg_3_2_4_sex_linked_inheritance`
- 中文释义：说明性染色体基因的传递与性别相关联。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：伴性遗传（`pc_8533c5cf0c58c968c6990001ab576642`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_8533c5cf0c58c968c6990001ab576642 完整覆盖。
- 官方证据：生物学标准PDF p.25（正文对应内容要求 3.2.4），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“伴性遗传”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 33. 必修·遗传与进化·3.3.1｜基因突变的序列改变

- 课程要求 ID：`req_cn_sh_bio_2020_o_rg_3_3_1_mutation_sequence_changes`
- 映射 ID：`map_cn_sh_bio_2020_o_rg_3_3_1_mutation_sequence_changes`
- 中文释义：说明碱基替换、插入或缺失如何改变基因序列。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：基因突变（`pc_aa917911c35a5a84a131d3c4b99b89af`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.26（正文对应内容要求 3.3.1），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 34. 必修·遗传与进化·3.3.2｜突变、蛋白质与细胞功能

- 课程要求 ID：`req_cn_sh_bio_2020_o_rg_3_3_2_mutation_protein_function`
- 映射 ID：`map_cn_sh_bio_2020_o_rg_3_3_2_mutation_protein_function`
- 中文释义：说明基因序列改变可能影响蛋白质、细胞功能和个体生存。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：基因突变（`pc_aa917911c35a5a84a131d3c4b99b89af`）；翻译（`pc_5f5a971454fc73259add3a98f4ad69cd`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.26（正文对应内容要求 3.3.2），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 35. 必修·遗传与进化·3.3.3｜诱变因素与癌变

- 课程要求 ID：`req_cn_sh_bio_2020_o_rg_3_3_3_mutagens_cancer`
- 映射 ID：`map_cn_sh_bio_2020_o_rg_3_3_3_mutagens_cancer`
- 中文释义：说明化学物质、射线和病毒可能提高突变概率，部分突变导致分裂失控。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：基因突变（`pc_aa917911c35a5a84a131d3c4b99b89af`）；诱变因素与癌变（`pc_043f05d8ef096d7bbdf67578bcc00662`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_aa917911c35a5a84a131d3c4b99b89af、pc_043f05d8ef096d7bbdf67578bcc00662 完整覆盖。
- 官方证据：生物学标准PDF p.26（正文对应内容要求 3.3.3），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“诱变因素与癌变”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 36. 必修·遗传与进化·3.3.4｜减数分裂中的基因重组

- 课程要求 ID：`req_cn_sh_bio_2020_o_rg_3_3_4_meiotic_recombination`
- 映射 ID：`map_cn_sh_bio_2020_o_rg_3_3_4_meiotic_recombination`
- 中文释义：说明自由组合和交叉互换如何导致基因重组和子代变异。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：减数分裂（`pc_9a64e0d9f35ef30bda722f5b7364e0c4`）；基因连锁与交换（`pc_cf480d2c17869e9f06f3980b2bd57ea2`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.26（正文对应内容要求 3.3.4），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 37. 必修·遗传与进化·3.3.5｜染色体结构与数量变异

- 课程要求 ID：`req_cn_sh_bio_2020_o_rg_3_3_5_chromosomal_variation`
- 映射 ID：`map_cn_sh_bio_2020_o_rg_3_3_5_chromosomal_variation`
- 中文释义：说明染色体结构和数量变异可能改变性状甚至导致死亡。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：染色体行为（`pc_41f9701a3bd0fb4527df662b596620b5`）；变异（`pc_592a494ab52d102d4cb731b24a77b320`）；染色体结构与数量变异（`pc_86f481ac1e4983f5844e9bf459df5d7e`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_41f9701a3bd0fb4527df662b596620b5、pc_592a494ab52d102d4cb731b24a77b320、pc_86f481ac1e4983f5844e9bf459df5d7e 完整覆盖。
- 官方证据：生物学标准PDF p.26（正文对应内容要求 3.3.5），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“染色体结构与数量变异”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 38. 必修·遗传与进化·3.3.6｜人类遗传病检测与预防

- 课程要求 ID：`req_cn_sh_bio_2020_o_rg_3_3_6_genetic_disease_screening`
- 映射 ID：`map_cn_sh_bio_2020_o_rg_3_3_6_genetic_disease_screening`
- 中文释义：举例说明人类遗传病的检测和预防。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：人类遗传病检测与预防（`pc_2fa1c85e0d7a4075a6c60f671d363261`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_2fa1c85e0d7a4075a6c60f671d363261 完整覆盖。
- 官方证据：生物学标准PDF p.26（正文对应内容要求 3.3.6），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“人类遗传病检测与预防”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 39. 必修·遗传与进化·4.1.1｜化石、比较解剖与胚胎学的共同祖先证据

- 课程要求 ID：`req_cn_sh_bio_2020_o_rg_4_1_1_common_ancestry_fossil_anatomy`
- 映射 ID：`map_cn_sh_bio_2020_o_rg_4_1_1_common_ancestry_fossil_anatomy`
- 中文释义：使用化石、比较解剖和胚胎学事实说明共同祖先。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：化石、比较解剖与胚胎学的共同祖先证据（`pc_67cb55267032c55bab697c87ee0f205f`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_67cb55267032c55bab697c87ee0f205f 完整覆盖。
- 官方证据：生物学标准PDF p.26（正文对应内容要求 4.1.1），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“化石、比较解剖与胚胎学的共同祖先证据”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 40. 必修·遗传与进化·4.1.2｜细胞与分子层面的共同祖先证据

- 课程要求 ID：`req_cn_sh_bio_2020_o_rg_4_1_2_common_ancestry_cell_molecular`
- 映射 ID：`map_cn_sh_bio_2020_o_rg_4_1_2_common_ancestry_cell_molecular`
- 中文释义：使用代谢和 DNA 结构功能共性说明共同祖先。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：细胞与分子层面的共同祖先证据（`pc_d83debf48c4c993831d6b7beb3321029`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_d83debf48c4c993831d6b7beb3321029 完整覆盖。
- 官方证据：生物学标准PDF p.26（正文对应内容要求 4.1.2），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“细胞与分子层面的共同祖先证据”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 41. 必修·遗传与进化·4.2.1｜可遗传变异与适合度优势

- 课程要求 ID：`req_cn_sh_bio_2020_o_rg_4_2_1_heritable_advantage`
- 映射 ID：`map_cn_sh_bio_2020_o_rg_4_2_1_heritable_advantage`
- 中文释义：说明某些可遗传变异在特定环境中带来生存和繁殖优势。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：变异（`pc_592a494ab52d102d4cb731b24a77b320`）；自然选择（`pc_a87eb54cbeafebfc2ba275effe0eaa14`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.26（正文对应内容要求 4.2.1），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 42. 必修·遗传与进化·4.2.2｜选择导致性状频率变化

- 课程要求 ID：`req_cn_sh_bio_2020_o_rg_4_2_2_selection_frequency_change`
- 映射 ID：`map_cn_sh_bio_2020_o_rg_4_2_2_selection_frequency_change`
- 中文释义：说明优势性状个体在种群中的比例随选择而增加。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：自然选择（`pc_a87eb54cbeafebfc2ba275effe0eaa14`）；Hardy–Weinberg 原理（`pc_f0a830e611bfffffd41f5757e75d4804`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.26（正文对应内容要求 4.2.2），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 43. 必修·遗传与进化·4.2.3｜自然选择与适应

- 课程要求 ID：`req_cn_sh_bio_2020_o_rg_4_2_3_adaptation_natural_selection`
- 映射 ID：`map_cn_sh_bio_2020_o_rg_4_2_3_adaptation_natural_selection`
- 中文释义：说明自然选择促进种群适应特定环境。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：自然选择（`pc_a87eb54cbeafebfc2ba275effe0eaa14`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.26（正文对应内容要求 4.2.3），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 44. 必修·遗传与进化·4.2.4｜现代生物进化理论

- 课程要求 ID：`req_cn_sh_bio_2020_o_rg_4_2_4_modern_evolutionary_theory`
- 映射 ID：`map_cn_sh_bio_2020_o_rg_4_2_4_modern_evolutionary_theory`
- 中文释义：概述以自然选择为核心的现代生物进化理论。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：变异（`pc_592a494ab52d102d4cb731b24a77b320`）；自然选择（`pc_a87eb54cbeafebfc2ba275effe0eaa14`）；Hardy–Weinberg 原理（`pc_f0a830e611bfffffd41f5757e75d4804`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.26（正文对应内容要求 4.2.4），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 45. 必修·遗传与进化·4.2.5｜变异、选择、隔离与物种形成

- 课程要求 ID：`req_cn_sh_bio_2020_o_rg_4_2_5_speciation_variation_selection_isolation`
- 映射 ID：`map_cn_sh_bio_2020_o_rg_4_2_5_speciation_variation_selection_isolation`
- 中文释义：说明变异、选择和隔离如何导致新物种形成。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：变异（`pc_592a494ab52d102d4cb731b24a77b320`）；自然选择（`pc_a87eb54cbeafebfc2ba275effe0eaa14`）；物种形成（`pc_1ff54d59bd08ce31d146088b725569e6`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.26（正文对应内容要求 4.2.5），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 46. 选择性必修·稳态与调节·1.1.1｜内环境的细胞外液组成

- 课程要求 ID：`req_cn_sh_bio_2020_o_sh_1_1_1_internal_environment_fluids`
- 映射 ID：`map_cn_sh_bio_2020_o_sh_1_1_1_internal_environment_fluids`
- 中文释义：说明血浆、组织液和淋巴等细胞外液共同构成内环境。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：内环境的细胞外液组成（`pc_990d45746021a0258ffce6947d5c9c25`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_990d45746021a0258ffce6947d5c9c25 完整覆盖。
- 官方证据：生物学标准PDF p.29（正文对应内容要求 1.1.1），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“内环境的细胞外液组成”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 47. 选择性必修·稳态与调节·1.1.2｜细胞经内环境与外界交换

- 课程要求 ID：`req_cn_sh_bio_2020_o_sh_1_1_2_internal_external_exchange`
- 映射 ID：`map_cn_sh_bio_2020_o_sh_1_1_2_internal_external_exchange`
- 中文释义：说明细胞通过内环境与外界交换并参与内环境维持。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：细胞经内环境与外界交换（`pc_fea026b56e9f7d027299b4484d6be477`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_fea026b56e9f7d027299b4484d6be477 完整覆盖。
- 官方证据：生物学标准PDF p.29（正文对应内容要求 1.1.2），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“细胞经内环境与外界交换”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 48. 选择性必修·稳态与调节·1.1.3｜器官系统参与内外环境物质交换

- 课程要求 ID：`req_cn_sh_bio_2020_o_sh_1_1_3_organ_system_exchange`
- 映射 ID：`map_cn_sh_bio_2020_o_sh_1_1_3_organ_system_exchange`
- 中文释义：说明呼吸、消化、循环和泌尿系统如何参与内外环境交换。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：肺部气体交换（`pc_023dd94962e430b671d1014972b54342`）；血管（`pc_ff5a585bec0e26749bef92e5b2ec6c2c`）；肾脏与渗透压调节（`pc_dc1ea419f7f0124901b64a622aee0648`）；器官系统参与内外环境物质交换（`pc_169fad745be0c7b18694394af7fb06fe`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_023dd94962e430b671d1014972b54342、pc_ff5a585bec0e26749bef92e5b2ec6c2c、pc_dc1ea419f7f0124901b64a622aee0648、pc_169fad745be0c7b18694394af7fb06fe 完整覆盖。
- 官方证据：生物学标准PDF p.29（正文对应内容要求 1.1.3），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“器官系统参与内外环境物质交换”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 49. 选择性必修·稳态与调节·1.2.1｜血糖、体温、pH 与渗透压稳态

- 课程要求 ID：`req_cn_sh_bio_2020_o_sh_1_2_1_homeostatic_variables`
- 映射 ID：`map_cn_sh_bio_2020_o_sh_1_2_1_homeostatic_variables`
- 中文释义：以血糖、体温、pH 和渗透压说明内环境相对稳定。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：体内平衡原理（`pc_2a9c578569ae3d146bdaf824188b711a`）；血糖控制（`pc_6f2fdad0698885c810176f4c7f506bae`）；肾脏与渗透压调节（`pc_dc1ea419f7f0124901b64a622aee0648`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.29（正文对应内容要求 1.2.1），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 50. 选择性必修·稳态与调节·1.2.2｜器官系统协调维持稳态

- 课程要求 ID：`req_cn_sh_bio_2020_o_sh_1_2_2_organ_coordination_homeostasis`
- 映射 ID：`map_cn_sh_bio_2020_o_sh_1_2_2_organ_coordination_homeostasis`
- 中文释义：说明器官和系统协调是维持内环境稳态的基础。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：体内平衡原理（`pc_2a9c578569ae3d146bdaf824188b711a`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.29（正文对应内容要求 1.2.2），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 51. 选择性必修·稳态与调节·1.3.1｜反射与反射弧

- 课程要求 ID：`req_cn_sh_bio_2020_o_sh_1_3_1_reflex_arc`
- 映射 ID：`map_cn_sh_bio_2020_o_sh_1_3_1_reflex_arc`
- 中文释义：说明条件和非条件反射及反射弧结构。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：反射与反射弧（`pc_46347b1ad33ab3d77b635c228957c4fd`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_46347b1ad33ab3d77b635c228957c4fd 完整覆盖。
- 官方证据：生物学标准PDF p.29（正文对应内容要求 1.3.1），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“反射与反射弧”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 52. 选择性必修·稳态与调节·1.3.2｜静息电位、动作电位与传导

- 课程要求 ID：`req_cn_sh_bio_2020_o_sh_1_3_2_resting_action_potentials`
- 映射 ID：`map_cn_sh_bio_2020_o_sh_1_3_2_resting_action_potentials`
- 中文释义：说明神经细胞静息电位、动作电位及沿神经纤维传导。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：神经传导（`pc_944f33c2a947e2a2f5d42856cb825a4a`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.29（正文对应内容要求 1.3.2），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 53. 选择性必修·稳态与调节·1.3.3｜突触的化学传递

- 课程要求 ID：`req_cn_sh_bio_2020_o_sh_1_3_3_chemical_synaptic_transmission`
- 映射 ID：`map_cn_sh_bio_2020_o_sh_1_3_3_chemical_synaptic_transmission`
- 中文释义：说明神经冲动通常在突触处通过化学方式传递。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：突触（`pc_0df40f95b0a4b28f4ac9880528a91fde`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.29（正文对应内容要求 1.3.3），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 54. 选择性必修·稳态与调节·1.3.4｜脊髓与脑高级中枢协调

- 课程要求 ID：`req_cn_sh_bio_2020_o_sh_1_3_4_central_nervous_hierarchy`
- 映射 ID：`map_cn_sh_bio_2020_o_sh_1_3_4_central_nervous_hierarchy`
- 中文释义：说明低级和高级神经中枢协调调控器官和系统。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：神经传导（`pc_944f33c2a947e2a2f5d42856cb825a4a`）；脊髓与脑高级中枢协调（`pc_7865cefc3b34beceb184b410f393c1ba`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_944f33c2a947e2a2f5d42856cb825a4a、pc_7865cefc3b34beceb184b410f393c1ba 完整覆盖。
- 官方证据：生物学标准PDF p.29（正文对应内容要求 1.3.4），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“脊髓与脑高级中枢协调”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 55. 选择性必修·稳态与调节·1.3.5｜自主神经调节内脏

- 课程要求 ID：`req_cn_sh_bio_2020_o_sh_1_3_5_autonomic_nervous_regulation`
- 映射 ID：`map_cn_sh_bio_2020_o_sh_1_3_5_autonomic_nervous_regulation`
- 中文释义：说明中枢神经系统通过自主神经调节内脏活动。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：自主神经调节内脏（`pc_05a4fbd93dd3ebc240adc1e06c52f9a1`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_05a4fbd93dd3ebc240adc1e06c52f9a1 完整覆盖。
- 官方证据：生物学标准PDF p.29（正文对应内容要求 1.3.5），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“自主神经调节内脏”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 56. 选择性必修·稳态与调节·1.3.6｜大脑皮层高级神经活动

- 课程要求 ID：`req_cn_sh_bio_2020_o_sh_1_3_6_cortical_higher_activity`
- 映射 ID：`map_cn_sh_bio_2020_o_sh_1_3_6_cortical_higher_activity`
- 中文释义：说明语言活动和条件反射由大脑皮层控制。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：大脑皮层高级神经活动（`pc_0083b75b35558081f0f25304f33efa6e`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_0083b75b35558081f0f25304f33efa6e 完整覆盖。
- 官方证据：生物学标准PDF p.29（正文对应内容要求 1.3.6），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“大脑皮层高级神经活动”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 57. 选择性必修·稳态与调节·1.4.1｜内分泌系统组成

- 课程要求 ID：`req_cn_sh_bio_2020_o_sh_1_4_1_endocrine_system`
- 映射 ID：`map_cn_sh_bio_2020_o_sh_1_4_1_endocrine_system`
- 中文释义：识别主要内分泌腺及其激素调节作用。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：激素控制（`pc_c7f7ea6f7ce0f78324c900821216e75c`）；内分泌系统组成（`pc_73decdd85804bf6c56ea96df910916d1`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_c7f7ea6f7ce0f78324c900821216e75c、pc_73decdd85804bf6c56ea96df910916d1 完整覆盖。
- 官方证据：生物学标准PDF p.30（正文对应内容要求 1.4.1），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“内分泌系统组成”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 58. 选择性必修·稳态与调节·1.4.2｜激素的分级与反馈调节

- 课程要求 ID：`req_cn_sh_bio_2020_o_sh_1_4_2_hormonal_feedback_hierarchies`
- 映射 ID：`map_cn_sh_bio_2020_o_sh_1_4_2_hormonal_feedback_hierarchies`
- 中文释义：说明激素分级和反馈调节维持甲状腺与血糖稳态。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：激素控制（`pc_c7f7ea6f7ce0f78324c900821216e75c`）；血糖控制（`pc_6f2fdad0698885c810176f4c7f506bae`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.30（正文对应内容要求 1.4.2），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 59. 选择性必修·稳态与调节·1.4.3｜神经与体液调节协调

- 课程要求 ID：`req_cn_sh_bio_2020_o_sh_1_4_3_neuroendocrine_coordination`
- 映射 ID：`map_cn_sh_bio_2020_o_sh_1_4_3_neuroendocrine_coordination`
- 中文释义：说明神经和体液调节共同维持体温与水盐平衡。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：神经传导（`pc_944f33c2a947e2a2f5d42856cb825a4a`）；激素控制（`pc_c7f7ea6f7ce0f78324c900821216e75c`）；肾脏与渗透压调节（`pc_dc1ea419f7f0124901b64a622aee0648`）；神经与体液调节协调（`pc_a129b516baefe0c88abd508e71bb0e00`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_944f33c2a947e2a2f5d42856cb825a4a、pc_c7f7ea6f7ce0f78324c900821216e75c、pc_dc1ea419f7f0124901b64a622aee0648、pc_a129b516baefe0c88abd508e71bb0e00 完整覆盖。
- 官方证据：生物学标准PDF p.30（正文对应内容要求 1.4.3），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“神经与体液调节协调”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 60. 选择性必修·稳态与调节·1.4.4｜体液成分调节呼吸

- 课程要求 ID：`req_cn_sh_bio_2020_o_sh_1_4_4_humoral_respiratory_regulation`
- 映射 ID：`map_cn_sh_bio_2020_o_sh_1_4_4_humoral_respiratory_regulation`
- 中文释义：说明二氧化碳等体液成分参与呼吸运动调节。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：二氧化碳运输与氯离子转移（`pc_c9fd444d9acfb11faef011f5755c1418`）；肺部气体交换（`pc_023dd94962e430b671d1014972b54342`）；体液成分调节呼吸（`pc_c351ce3400d2b06f7e3fb6a7f25c9528`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_c9fd444d9acfb11faef011f5755c1418、pc_023dd94962e430b671d1014972b54342、pc_c351ce3400d2b06f7e3fb6a7f25c9528 完整覆盖。
- 官方证据：生物学标准PDF p.30（正文对应内容要求 1.4.4），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“体液成分调节呼吸”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 61. 选择性必修·稳态与调节·1.5.1｜免疫系统的结构与物质基础

- 课程要求 ID：`req_cn_sh_bio_2020_o_sh_1_5_1_immune_system_components`
- 映射 ID：`map_cn_sh_bio_2020_o_sh_1_5_1_immune_system_components`
- 中文释义：说明免疫细胞、器官和活性物质构成免疫调节基础。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：免疫应答（`pc_b396f7788c77baeecc089eeec83538e5`）；抗体与疫苗接种（`pc_4e3f76f101debb1e241b0bab776e4cf1`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.30（正文对应内容要求 1.5.1），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 62. 选择性必修·稳态与调节·1.5.2｜非特异性与特异性免疫

- 课程要求 ID：`req_cn_sh_bio_2020_o_sh_1_5_2_innate_adaptive_immunity`
- 映射 ID：`map_cn_sh_bio_2020_o_sh_1_5_2_innate_adaptive_immunity`
- 中文释义：比较先天非特异性免疫和后天特异性免疫。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：免疫应答（`pc_b396f7788c77baeecc089eeec83538e5`）；非特异性与特异性免疫（`pc_94f54f11e23c1c3e407c8036fb6321b6`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_b396f7788c77baeecc089eeec83538e5、pc_94f54f11e23c1c3e407c8036fb6321b6 完整覆盖。
- 官方证据：生物学标准PDF p.30（正文对应内容要求 1.5.2），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“非特异性与特异性免疫”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 63. 选择性必修·稳态与调节·1.5.3｜体液免疫与细胞免疫

- 课程要求 ID：`req_cn_sh_bio_2020_o_sh_1_5_3_humoral_cellular_immunity`
- 映射 ID：`map_cn_sh_bio_2020_o_sh_1_5_3_humoral_cellular_immunity`
- 中文释义：说明特异性免疫通过体液免疫和细胞免疫应答特定病原体。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：免疫应答（`pc_b396f7788c77baeecc089eeec83538e5`）；抗体与疫苗接种（`pc_4e3f76f101debb1e241b0bab776e4cf1`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.30（正文对应内容要求 1.5.3），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 64. 选择性必修·稳态与调节·1.5.4｜免疫功能异常与疾病

- 课程要求 ID：`req_cn_sh_bio_2020_o_sh_1_5_4_immune_disorders`
- 映射 ID：`map_cn_sh_bio_2020_o_sh_1_5_4_immune_disorders`
- 中文释义：比较过敏、自身免疫病、艾滋病和先天免疫缺陷。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：免疫功能异常与疾病（`pc_5f99a9c2ac6e1cab9e53477e2842eb6b`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_5f99a9c2ac6e1cab9e53477e2842eb6b 完整覆盖。
- 官方证据：生物学标准PDF p.30（正文对应内容要求 1.5.4），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“免疫功能异常与疾病”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 65. 选择性必修·稳态与调节·1.6.1｜生长素发现与两重性

- 课程要求 ID：`req_cn_sh_bio_2020_o_sh_1_6_1_auxin_dual_effects`
- 映射 ID：`map_cn_sh_bio_2020_o_sh_1_6_1_auxin_dual_effects`
- 中文释义：说明生长素的发现及其促进或抑制生长的两重性。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：植物响应（`pc_ec9ed2577284952c142079dc7a389627`）；生长素发现与两重性（`pc_3b0475fedf65a19d4227115cc008b92d`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_ec9ed2577284952c142079dc7a389627、pc_3b0475fedf65a19d4227115cc008b92d 完整覆盖。
- 官方证据：生物学标准PDF p.30（正文对应内容要求 1.6.1），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“生长素发现与两重性”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 66. 选择性必修·稳态与调节·1.6.2｜植物激素的协同与拮抗

- 课程要求 ID：`req_cn_sh_bio_2020_o_sh_1_6_2_plant_hormone_coordination`
- 映射 ID：`map_cn_sh_bio_2020_o_sh_1_6_2_plant_hormone_coordination`
- 中文释义：说明主要植物激素通过协同或拮抗共同调节生命活动。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：植物响应（`pc_ec9ed2577284952c142079dc7a389627`）；ABA 与气孔关闭（`pc_e8352e234d2f8fb344dafcdbd894f99e`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.30（正文对应内容要求 1.6.2），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 67. 选择性必修·稳态与调节·1.6.3｜植物激素及类似物的生产应用

- 课程要求 ID：`req_cn_sh_bio_2020_o_sh_1_6_3_plant_growth_regulator_applications`
- 映射 ID：`map_cn_sh_bio_2020_o_sh_1_6_3_plant_growth_regulator_applications`
- 中文释义：说明主要植物激素及类似物在生产中的应用。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：植物响应（`pc_ec9ed2577284952c142079dc7a389627`）；ABA 与气孔关闭（`pc_e8352e234d2f8fb344dafcdbd894f99e`）；植物激素及类似物的生产应用（`pc_0758d51c8b98059f1780aee07c326953`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_ec9ed2577284952c142079dc7a389627、pc_e8352e234d2f8fb344dafcdbd894f99e、pc_0758d51c8b98059f1780aee07c326953 完整覆盖。
- 官方证据：生物学标准PDF p.31（正文对应内容要求 1.6.3），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“植物激素及类似物的生产应用”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 68. 选择性必修·稳态与调节·1.6.4｜光、重力和温度调节植物活动

- 课程要求 ID：`req_cn_sh_bio_2020_o_sh_1_6_4_environmental_plant_regulation`
- 映射 ID：`map_cn_sh_bio_2020_o_sh_1_6_4_environmental_plant_regulation`
- 中文释义：说明光、重力和温度等非激素因素参与植物生命活动调节。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：植物响应（`pc_ec9ed2577284952c142079dc7a389627`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.31（正文对应内容要求 1.6.4），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 69. 选择性必修·生物与环境·2.1.1｜种群特征

- 课程要求 ID：`req_cn_sh_bio_2020_o_se_2_1_1_population_characteristics`
- 映射 ID：`map_cn_sh_bio_2020_o_se_2_1_1_population_characteristics`
- 中文释义：说明种群密度、出生死亡率、迁入迁出率、年龄结构和性别比例。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：种群特征（`pc_a9447add767e7c509fb5f3725435137d`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_a9447add767e7c509fb5f3725435137d 完整覆盖。
- 官方证据：生物学标准PDF p.33（正文对应内容要求 2.1.1），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“种群特征”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 70. 选择性必修·生物与环境·2.1.2｜种群数量变化模型

- 课程要求 ID：`req_cn_sh_bio_2020_o_se_2_1_2_population_growth_models`
- 映射 ID：`map_cn_sh_bio_2020_o_se_2_1_2_population_growth_models`
- 中文释义：建立数学模型解释种群数量变动。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：种群数量变化模型（`pc_ceeb7c1f2db353b57d85fa869f5bda71`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_ceeb7c1f2db353b57d85fa869f5bda71 完整覆盖。
- 官方证据：生物学标准PDF p.33（正文对应内容要求 2.1.2），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“种群数量变化模型”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 71. 选择性必修·生物与环境·2.1.3｜种群特征的生物与非生物影响因素

- 课程要求 ID：`req_cn_sh_bio_2020_o_se_2_1_3_population_limiting_factors`
- 映射 ID：`map_cn_sh_bio_2020_o_se_2_1_3_population_limiting_factors`
- 中文释义：说明非生物因素和种间作用如何影响种群特征。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：生态系统与生态位（`pc_ecfaff613c7086e0cece6014f44b68ba`）；种群特征的生物与非生物影响因素（`pc_7634f823e7f43393e5a89d2fb684676e`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_ecfaff613c7086e0cece6014f44b68ba、pc_7634f823e7f43393e5a89d2fb684676e 完整覆盖。
- 官方证据：生物学标准PDF p.33（正文对应内容要求 2.1.3），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“种群特征的生物与非生物影响因素”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 72. 选择性必修·生物与环境·2.1.4｜群落垂直、水平结构及时间变化

- 课程要求 ID：`req_cn_sh_bio_2020_o_se_2_1_4_community_structure`
- 映射 ID：`map_cn_sh_bio_2020_o_se_2_1_4_community_structure`
- 中文释义：描述群落的垂直和水平结构及其时间变化。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：生态系统与生态位（`pc_ecfaff613c7086e0cece6014f44b68ba`）；群落垂直、水平结构及时间变化（`pc_738afe02309cf9d584681e013e11fe69`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_ecfaff613c7086e0cece6014f44b68ba、pc_738afe02309cf9d584681e013e11fe69 完整覆盖。
- 官方证据：生物学标准PDF p.33（正文对应内容要求 2.1.4），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“群落垂直、水平结构及时间变化”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 73. 选择性必修·生物与环境·2.1.5｜初生演替与次生演替

- 课程要求 ID：`req_cn_sh_bio_2020_o_se_2_1_5_ecological_succession`
- 映射 ID：`map_cn_sh_bio_2020_o_se_2_1_5_ecological_succession`
- 中文释义：说明群落演替及初生、次生演替的区别。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：初生演替与次生演替（`pc_40daa84cf8496038cb7d02572227bac9`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_40daa84cf8496038cb7d02572227bac9 完整覆盖。
- 官方证据：生物学标准PDF p.33（正文对应内容要求 2.1.5），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“初生演替与次生演替”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 74. 选择性必修·生物与环境·2.1.6｜群落生物的适应特征

- 课程要求 ID：`req_cn_sh_bio_2020_o_se_2_1_6_community_adaptations`
- 映射 ID：`map_cn_sh_bio_2020_o_se_2_1_6_community_adaptations`
- 中文释义：分析群落生物与环境相适应的形态、生理和分布特点。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：生态系统与生态位（`pc_ecfaff613c7086e0cece6014f44b68ba`）；自然选择（`pc_a87eb54cbeafebfc2ba275effe0eaa14`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.33（正文对应内容要求 2.1.6），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 75. 选择性必修·生物与环境·2.2.1｜生态系统组成与统一结构

- 课程要求 ID：`req_cn_sh_bio_2020_o_se_2_2_1_ecosystem_components`
- 映射 ID：`map_cn_sh_bio_2020_o_se_2_2_1_ecosystem_components`
- 中文释义：说明生产者、消费者、分解者和非生物因素构成生态系统。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：生态系统与生态位（`pc_ecfaff613c7086e0cece6014f44b68ba`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.33（正文对应内容要求 2.2.1），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 76. 选择性必修·生物与环境·2.2.2｜食物链与食物网

- 课程要求 ID：`req_cn_sh_bio_2020_o_se_2_2_2_food_chains_webs`
- 映射 ID：`map_cn_sh_bio_2020_o_se_2_2_2_food_chains_webs`
- 中文释义：说明生产者和消费者通过食物链、食物网形成营养结构。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：食物链与食物网（`pc_70da4d7e60b713056853543f2b486297`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_70da4d7e60b713056853543f2b486297 完整覆盖。
- 官方证据：生物学标准PDF p.33（正文对应内容要求 2.2.2），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“食物链与食物网”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 77. 选择性必修·生物与环境·2.2.3｜物质循环与能量流动

- 课程要求 ID：`req_cn_sh_bio_2020_o_se_2_2_3_matter_cycles_energy_flow`
- 映射 ID：`map_cn_sh_bio_2020_o_se_2_2_3_matter_cycles_energy_flow`
- 中文释义：说明物质循环、能量单向流动和逐级递减规律。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：物质循环与能量流动（`pc_a26230828b27cf03028e959c4472f5f1`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_a26230828b27cf03028e959c4472f5f1 完整覆盖。
- 官方证据：生物学标准PDF p.33（正文对应内容要求 2.2.3），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“物质循环与能量流动”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 78. 选择性必修·生物与环境·2.2.4｜生态规律与资源利用

- 课程要求 ID：`req_cn_sh_bio_2020_o_se_2_2_4_ecological_resource_use`
- 映射 ID：`map_cn_sh_bio_2020_o_se_2_2_4_ecological_resource_use`
- 中文释义：应用物质循环和能量流动规律提高生态资源利用效率。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：生态系统与生态位（`pc_ecfaff613c7086e0cece6014f44b68ba`）；保护（`pc_aa24b4324d962f7ab29f0ddeb0f63405`）；生态规律与资源利用（`pc_3104e1f4e490282faddf07783c2399b8`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_ecfaff613c7086e0cece6014f44b68ba、pc_aa24b4324d962f7ab29f0ddeb0f63405、pc_3104e1f4e490282faddf07783c2399b8 完整覆盖。
- 官方证据：生物学标准PDF p.33（正文对应内容要求 2.2.4），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“生态规律与资源利用”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 79. 选择性必修·生物与环境·2.2.5｜数量、生物量和能量金字塔

- 课程要求 ID：`req_cn_sh_bio_2020_o_se_2_2_5_ecological_pyramids`
- 映射 ID：`map_cn_sh_bio_2020_o_se_2_2_5_ecological_pyramids`
- 中文释义：说明生态金字塔如何表征营养级数量、生物量和能量关系。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：数量、生物量和能量金字塔（`pc_305adf8ebeefac092af08b8ad4ce31b5`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_305adf8ebeefac092af08b8ad4ce31b5 完整覆盖。
- 官方证据：生物学标准PDF p.34（正文对应内容要求 2.2.5），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“数量、生物量和能量金字塔”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 80. 选择性必修·生物与环境·2.2.6｜食物链中的有害物质富集

- 课程要求 ID：`req_cn_sh_bio_2020_o_se_2_2_6_biomagnification`
- 映射 ID：`map_cn_sh_bio_2020_o_se_2_2_6_biomagnification`
- 中文释义：说明有害物质沿食物链不断富集。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：食物链中的有害物质富集（`pc_eec94f4451e73065d30fd63abe099466`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_eec94f4451e73065d30fd63abe099466 完整覆盖。
- 官方证据：生物学标准PDF p.34（正文对应内容要求 2.2.6），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“食物链中的有害物质富集”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 81. 选择性必修·生物与环境·2.2.7｜生态系统信息传递

- 课程要求 ID：`req_cn_sh_bio_2020_o_se_2_2_7_ecosystem_information_transfer`
- 映射 ID：`map_cn_sh_bio_2020_o_se_2_2_7_ecosystem_information_transfer`
- 中文释义：说明物理、化学和行为信息对生命活动、繁衍和种间关系的作用。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：生态系统信息传递（`pc_ba3fe6583fb4d40f15c1573e314b2897`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_ba3fe6583fb4d40f15c1573e314b2897 完整覆盖。
- 官方证据：生物学标准PDF p.34（正文对应内容要求 2.2.7），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“生态系统信息传递”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 82. 选择性必修·生物与环境·2.2.8｜营养结构的生物与非生物决定因素

- 课程要求 ID：`req_cn_sh_bio_2020_o_se_2_2_8_trophic_structure_factors`
- 映射 ID：`map_cn_sh_bio_2020_o_se_2_2_8_trophic_structure_factors`
- 中文释义：分析特定生态系统的生物和非生物因素如何决定营养结构。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：生态系统与生态位（`pc_ecfaff613c7086e0cece6014f44b68ba`）；营养结构的生物与非生物决定因素（`pc_5e3af190cf5d812135bc6cfb8de91b73`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_ecfaff613c7086e0cece6014f44b68ba、pc_5e3af190cf5d812135bc6cfb8de91b73 完整覆盖。
- 官方证据：生物学标准PDF p.34（正文对应内容要求 2.2.8），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“营养结构的生物与非生物决定因素”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 83. 选择性必修·生物与环境·2.3.1｜生态系统稳定性

- 课程要求 ID：`req_cn_sh_bio_2020_o_se_2_3_1_ecosystem_stability`
- 映射 ID：`map_cn_sh_bio_2020_o_se_2_3_1_ecosystem_stability`
- 中文释义：说明生态系统保持或恢复结构功能和动态平衡的能力。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：生态系统稳定性（`pc_a853ca2b6804c3743c7a40f1c2ae5081`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_a853ca2b6804c3743c7a40f1c2ae5081 完整覆盖。
- 官方证据：生物学标准PDF p.34（正文对应内容要求 2.3.1），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“生态系统稳定性”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 84. 选择性必修·生物与环境·2.3.2｜生态系统干扰因素

- 课程要求 ID：`req_cn_sh_bio_2020_o_se_2_3_2_ecosystem_disturbances`
- 映射 ID：`map_cn_sh_bio_2020_o_se_2_3_2_ecosystem_disturbances`
- 中文释义：说明气候、自然事件、人类活动和外来物种对稳定性的影响。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：生态系统与生态位（`pc_ecfaff613c7086e0cece6014f44b68ba`）；生态系统干扰因素（`pc_cee4cb6816eac128a0e6f36535957b6a`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_ecfaff613c7086e0cece6014f44b68ba、pc_cee4cb6816eac128a0e6f36535957b6a 完整覆盖。
- 官方证据：生物学标准PDF p.34（正文对应内容要求 2.3.2），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“生态系统干扰因素”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 85. 选择性必修·生物与环境·2.3.3｜生态系统自我调节

- 课程要求 ID：`req_cn_sh_bio_2020_o_se_2_3_3_ecosystem_self_regulation`
- 映射 ID：`map_cn_sh_bio_2020_o_se_2_3_3_ecosystem_self_regulation`
- 中文释义：说明生态系统在一定干扰限度内通过自我调节维持稳定。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：生态系统自我调节（`pc_e842f2edde8b384472460c753b197e3f`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_e842f2edde8b384472460c753b197e3f 完整覆盖。
- 官方证据：生物学标准PDF p.34（正文对应内容要求 2.3.3），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“生态系统自我调节”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 86. 选择性必修·生物与环境·2.4.1｜人口增长的环境压力

- 课程要求 ID：`req_cn_sh_bio_2020_o_se_2_4_1_population_environment_pressure`
- 映射 ID：`map_cn_sh_bio_2020_o_se_2_4_1_population_environment_pressure`
- 中文释义：说明人口增长如何对环境造成压力。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：人口增长的环境压力（`pc_d736b9e86a2f00629df578cf4d065b89`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_d736b9e86a2f00629df578cf4d065b89 完整覆盖。
- 官方证据：生物学标准PDF p.34（正文对应内容要求 2.4.1），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“人口增长的环境压力”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 87. 选择性必修·生物与环境·2.4.2｜全球环境问题与生物圈稳态

- 课程要求 ID：`req_cn_sh_bio_2020_o_se_2_4_2_global_environmental_change`
- 映射 ID：`map_cn_sh_bio_2020_o_se_2_4_2_global_environmental_change`
- 中文释义：说明气候、水资源、臭氧、酸雨、荒漠化和污染对生物圈与人的影响。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：保护（`pc_aa24b4324d962f7ab29f0ddeb0f63405`）；全球环境问题与生物圈稳态（`pc_3c7141a671b5d3b21d36e648301947f1`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_aa24b4324d962f7ab29f0ddeb0f63405、pc_3c7141a671b5d3b21d36e648301947f1 完整覆盖。
- 官方证据：生物学标准PDF p.34（正文对应内容要求 2.4.2），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“全球环境问题与生物圈稳态”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 88. 选择性必修·生物与环境·2.4.3｜生物多样性的生态与社会价值

- 课程要求 ID：`req_cn_sh_bio_2020_o_se_2_4_3_biodiversity_importance`
- 映射 ID：`map_cn_sh_bio_2020_o_se_2_4_3_biodiversity_importance`
- 中文释义：说明生物多样性对生态稳定和人类发展的重要性。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：生物多样性调查（`pc_ff6c4a398294b049cadd95acd7c8ace2`）；保护（`pc_aa24b4324d962f7ab29f0ddeb0f63405`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.34（正文对应内容要求 2.4.3），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 89. 选择性必修·生物与环境·2.4.4｜生态工程与资源循环利用

- 课程要求 ID：`req_cn_sh_bio_2020_o_se_2_4_4_ecological_engineering_circularity`
- 映射 ID：`map_cn_sh_bio_2020_o_se_2_4_4_ecological_engineering_circularity`
- 中文释义：说明依据生态学原理和系统工程实现资源多层次循环利用。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：生态系统与生态位（`pc_ecfaff613c7086e0cece6014f44b68ba`）；保护（`pc_aa24b4324d962f7ab29f0ddeb0f63405`）；生态工程与资源循环利用（`pc_d31768fc6f80dfb5ffee5fdcb356a5dd`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_ecfaff613c7086e0cece6014f44b68ba、pc_aa24b4324d962f7ab29f0ddeb0f63405、pc_d31768fc6f80dfb5ffee5fdcb356a5dd 完整覆盖。
- 官方证据：生物学标准PDF p.34（正文对应内容要求 2.4.4），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“生态工程与资源循环利用”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 90. 选择性必修·生物与环境·2.4.5｜从我做起的环境保护意识

- 课程要求 ID：`req_cn_sh_bio_2020_o_se_2_4_5_environmental_responsibility`
- 映射 ID：`map_cn_sh_bio_2020_o_se_2_4_5_environmental_responsibility`
- 中文释义：形成个人参与环境保护的责任意识。
- 建议结论：有理由排除；关系 `not_applicable`；置信度 `high`
- 对应概念：无
- 判断理由：该成果只要求形成价值立场和社会责任，不写入学科概念掌握度。
- 官方证据：生物学标准PDF p.34（正文对应内容要求 2.4.5），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 91. 选择性必修·生物技术与工程·3.1.1｜纯培养中的灭菌

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_3_1_1_sterilisation_microbe_culture`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_3_1_1_sterilisation_microbe_culture`
- 中文释义：说明灭菌是获得纯净微生物培养物的前提。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：纯培养中的灭菌（`pc_02db8c75f6ee755edfdd44db1800d190`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_02db8c75f6ee755edfdd44db1800d190 完整覆盖。
- 官方证据：生物学标准PDF p.36（正文对应内容要求 3.1.1），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“纯培养中的灭菌”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 92. 选择性必修·生物技术与工程·3.1.2｜无菌技术

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_3_1_2_aseptic_technique`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_3_1_2_aseptic_technique`
- 中文释义：说明操作中保持无菌物品和区域不被污染的技术。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：无菌技术（`pc_da199aa16f2cf927e3eb52617c37220d`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_da199aa16f2cf927e3eb52617c37220d 完整覆盖。
- 官方证据：生物学标准PDF p.36（正文对应内容要求 3.1.2），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“无菌技术”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 93. 选择性必修·生物技术与工程·3.1.3｜培养基配方与目的培养

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_3_1_3_selective_culture_media`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_3_1_3_selective_culture_media`
- 中文释义：说明调整培养基配方可有目的地培养微生物。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：培养基配方与目的培养（`pc_3ffc91735aa4009319d97d82b2bd6cb1`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_3ffc91735aa4009319d97d82b2bd6cb1 完整覆盖。
- 官方证据：生物学标准PDF p.36（正文对应内容要求 3.1.3），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“培养基配方与目的培养”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 94. 选择性必修·生物技术与工程·3.1.4｜平板划线与稀释涂布分离

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_3_1_4_microbial_isolation_methods`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_3_1_4_microbial_isolation_methods`
- 中文释义：比较平板划线法和稀释涂布平板法的分离纯化用途。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：平板划线与稀释涂布分离（`pc_9d5bceaf3c265dcafdaa249db80ad329`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_9d5bceaf3c265dcafdaa249db80ad329 完整覆盖。
- 官方证据：生物学标准PDF p.36（正文对应内容要求 3.1.4），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“平板划线与稀释涂布分离”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 95. 选择性必修·生物技术与工程·3.1.5｜稀释涂布与显微镜计数

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_3_1_5_microbial_counting_methods`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_3_1_5_microbial_counting_methods`
- 中文释义：比较稀释涂布平板法和显微镜计数法测定微生物数量。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：稀释涂布与显微镜计数（`pc_d5a40034050d02c152d7f51ce3bd2513`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_d5a40034050d02c152d7f51ce3bd2513 完整覆盖。
- 官方证据：生物学标准PDF p.36（正文对应内容要求 3.1.5），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“稀释涂布与显微镜计数”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 96. 选择性必修·生物技术与工程·3.2.1｜传统发酵食品

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_3_2_1_traditional_fermentation`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_3_2_1_traditional_fermentation`
- 中文释义：说明微生物在传统发酵食品生产中的作用。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：传统发酵食品（`pc_316272b1915e07a00215e5b2801d2772`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_316272b1915e07a00215e5b2801d2772 完整覆盖。
- 官方证据：生物学标准PDF p.37（正文对应内容要求 3.2.1），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“传统发酵食品”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 97. 选择性必修·生物技术与工程·3.2.2｜现代发酵工程

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_3_2_2_industrial_fermentation`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_3_2_2_industrial_fermentation`
- 中文释义：说明现代工程技术利用微生物功能工业化生产产品。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：现代发酵工程（`pc_339a5f3174c1fa2f8c4273228d1abe4d`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_339a5f3174c1fa2f8c4273228d1abe4d 完整覆盖。
- 官方证据：生物学标准PDF p.37（正文对应内容要求 3.2.2），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“现代发酵工程”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 98. 选择性必修·生物技术与工程·3.2.3｜发酵工程应用

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_3_2_3_fermentation_applications`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_3_2_3_fermentation_applications`
- 中文释义：说明发酵工程在医药、食品和工农业中的应用价值。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：发酵工程应用（`pc_1fffd89a6d612ed5bd06d8559028652b`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_1fffd89a6d612ed5bd06d8559028652b 完整覆盖。
- 官方证据：生物学标准PDF p.37（正文对应内容要求 3.2.3），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“发酵工程应用”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 99. 选择性必修·生物技术与工程·4.1.1｜植物组织培养

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_4_1_1_plant_tissue_culture`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_4_1_1_plant_tissue_culture`
- 中文释义：说明离体材料形成愈伤组织、再分化并形成完整植株的过程。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：植物组织培养（`pc_6cc7ae70a5a7f498efda3c0155ece301`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_6cc7ae70a5a7f498efda3c0155ece301 完整覆盖。
- 官方证据：生物学标准PDF p.37（正文对应内容要求 4.1.1），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“植物组织培养”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 100. 选择性必修·生物技术与工程·4.1.2｜植物体细胞杂交

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_4_1_2_plant_somatic_hybridisation`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_4_1_2_plant_somatic_hybridisation`
- 中文释义：说明不同植物体细胞融合并培育新植物体的技术。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：植物体细胞杂交（`pc_23f52412736512b8f40fac9958079322`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_23f52412736512b8f40fac9958079322 完整覆盖。
- 官方证据：生物学标准PDF p.37（正文对应内容要求 4.1.2），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“植物体细胞杂交”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 101. 选择性必修·生物技术与工程·4.1.3｜植物细胞工程应用

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_4_1_3_plant_cell_engineering_applications`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_4_1_3_plant_cell_engineering_applications`
- 中文释义：说明快速繁殖、脱毒、次生代谢产物生产和育种应用。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：植物细胞工程应用（`pc_d30f1f836c9100c1462e7a4a389ce02f`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_d30f1f836c9100c1462e7a4a389ce02f 完整覆盖。
- 官方证据：生物学标准PDF p.37（正文对应内容要求 4.1.3），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“植物细胞工程应用”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 102. 选择性必修·生物技术与工程·4.2.1｜动物细胞培养

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_4_2_1_animal_cell_culture`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_4_2_1_animal_cell_culture`
- 中文释义：说明动物组织分散成细胞并在适宜条件下培养增殖的过程。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：动物细胞培养（`pc_df3d6997dd440131a8dad40c4acbc338`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_df3d6997dd440131a8dad40c4acbc338 完整覆盖。
- 官方证据：生物学标准PDF p.37（正文对应内容要求 4.2.1），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“动物细胞培养”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 103. 选择性必修·生物技术与工程·4.2.2｜动物体细胞核移植

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_4_2_2_somatic_cell_nuclear_transfer`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_4_2_2_somatic_cell_nuclear_transfer`
- 中文释义：说明体细胞核移入去核卵母细胞并发育为新个体的过程。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：基因技术（`pc_0185ccac3ad47cd14f266d12099ab528`）；动物体细胞核移植（`pc_73b8a50a14796395bbb0ae7525ab1b99`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_0185ccac3ad47cd14f266d12099ab528、pc_73b8a50a14796395bbb0ae7525ab1b99 完整覆盖。
- 官方证据：生物学标准PDF p.38（正文对应内容要求 4.2.2），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“动物体细胞核移植”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 104. 选择性必修·生物技术与工程·4.2.3｜动物细胞融合

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_4_2_3_animal_cell_fusion`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_4_2_3_animal_cell_fusion`
- 中文释义：说明物理、化学或生物手段使动物细胞融合。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：动物细胞融合（`pc_ab54a12e8f3ea29b213314991f5dccfc`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_ab54a12e8f3ea29b213314991f5dccfc 完整覆盖。
- 官方证据：生物学标准PDF p.38（正文对应内容要求 4.2.3），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“动物细胞融合”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 105. 选择性必修·生物技术与工程·4.2.4｜单克隆抗体制备

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_4_2_4_monoclonal_antibody_production`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_4_2_4_monoclonal_antibody_production`
- 中文释义：说明细胞融合技术在单克隆抗体制备中的作用。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：抗体与疫苗接种（`pc_4e3f76f101debb1e241b0bab776e4cf1`）；单克隆抗体制备（`pc_076accb0e6c48dc5a6b42dcc36152da3`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_4e3f76f101debb1e241b0bab776e4cf1、pc_076accb0e6c48dc5a6b42dcc36152da3 完整覆盖。
- 官方证据：生物学标准PDF p.38（正文对应内容要求 4.2.4），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“单克隆抗体制备”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 106. 选择性必修·生物技术与工程·4.2.5｜干细胞的生物医学应用

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_4_2_5_stem_cell_applications`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_4_2_5_stem_cell_applications`
- 中文释义：说明干细胞在生物医学工程中的应用价值。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：干细胞的生物医学应用（`pc_f24ca070bfceb1f905930f4386fc0b75`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_f24ca070bfceb1f905930f4386fc0b75 完整覆盖。
- 官方证据：生物学标准PDF p.38（正文对应内容要求 4.2.5），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“干细胞的生物医学应用”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 107. 选择性必修·生物技术与工程·4.3.1｜受精与早期胚胎发育

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_4_3_1_fertilisation_early_embryo`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_4_3_1_fertilisation_early_embryo`
- 中文释义：说明胚胎形成经历受精和早期发育。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：受精与早期胚胎发育（`pc_2bb6c5caf86fb9a1beb4b9ed7331d3fc`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_2bb6c5caf86fb9a1beb4b9ed7331d3fc 完整覆盖。
- 官方证据：生物学标准PDF p.38（正文对应内容要求 4.3.1），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“受精与早期胚胎发育”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 108. 选择性必修·生物技术与工程·4.3.2｜体外受精、胚胎移植与分割

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_4_3_2_embryo_engineering`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_4_3_2_embryo_engineering`
- 中文释义：说明体外受精、胚胎移植和胚胎分割等胚胎工程技术。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：体外受精、胚胎移植与分割（`pc_fea1ab91762f39ce21af7aee8d10f9b1`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_fea1ab91762f39ce21af7aee8d10f9b1 完整覆盖。
- 官方证据：生物学标准PDF p.38（正文对应内容要求 4.3.2），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“体外受精、胚胎移植与分割”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 109. 选择性必修·生物技术与工程·5.1.1｜基因工程的学科基础

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_5_1_1_gene_engineering_foundations`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_5_1_1_gene_engineering_foundations`
- 中文释义：说明基因工程建立在遗传、微生物、生化和分子生物学之上。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：基因技术（`pc_0185ccac3ad47cd14f266d12099ab528`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.38（正文对应内容要求 5.1.1），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 110. 选择性必修·生物技术与工程·5.1.2｜限制酶、连接酶与载体

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_5_1_2_gene_engineering_tools`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_5_1_2_gene_engineering_tools`
- 中文释义：说明限制性内切核酸酶、DNA 连接酶和载体的作用。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：基因技术（`pc_0185ccac3ad47cd14f266d12099ab528`）；限制酶、连接酶与载体（`pc_2453884856757a434254e3d2465428a9`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_0185ccac3ad47cd14f266d12099ab528、pc_2453884856757a434254e3d2465428a9 完整覆盖。
- 官方证据：生物学标准PDF p.38（正文对应内容要求 5.1.2），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`split_or_narrow_existing`；候选“限制酶、连接酶与载体”；现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。
- 审核状态：`needs_review`

## 111. 选择性必修·生物技术与工程·5.1.3｜基因工程基本操作程序

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_5_1_3_gene_engineering_workflow`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_5_1_3_gene_engineering_workflow`
- 中文释义：说明目的基因获取、载体构建、导入和检测鉴定的流程。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：基因技术（`pc_0185ccac3ad47cd14f266d12099ab528`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.38（正文对应内容要求 5.1.3），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 112. 选择性必修·生物技术与工程·5.1.4｜基因工程的行业应用

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_5_1_4_gene_engineering_applications`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_5_1_4_gene_engineering_applications`
- 中文释义：说明基因工程在农牧、食品和医药行业中的应用。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：遗传技术应用（`pc_30f178143e2c42de28b6d054fb8f8e88`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.38（正文对应内容要求 5.1.4），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 113. 选择性必修·生物技术与工程·5.2.1｜蛋白质工程设计与改造

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_5_2_1_protein_engineering_design`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_5_2_1_protein_engineering_design`
- 中文释义：说明依据基因工程原理设计、改造蛋白质以满足需求。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：蛋白质工程（`pc_c106243302f8fd6e37f9a27d11d0c458`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_c106243302f8fd6e37f9a27d11d0c458 完整覆盖。
- 官方证据：生物学标准PDF p.38（正文对应内容要求 5.2.1），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“蛋白质工程设计与改造”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 114. 选择性必修·生物技术与工程·5.2.2｜蛋白质工程实现过程

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_5_2_2_protein_engineering_process`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_5_2_2_protein_engineering_process`
- 中文释义：说明通过基因改造生产目标蛋白的过程。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：蛋白质工程（`pc_c106243302f8fd6e37f9a27d11d0c458`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_c106243302f8fd6e37f9a27d11d0c458 完整覆盖。
- 官方证据：生物学标准PDF p.38（正文对应内容要求 5.2.2），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“蛋白质工程实现过程”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 115. 选择性必修·生物技术与工程·6.1.1｜转基因产品实例

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_6_1_1_gmo_products`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_6_1_1_gmo_products`
- 中文释义：识别日常生活中的转基因产品。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：遗传技术应用（`pc_30f178143e2c42de28b6d054fb8f8e88`）
- 判断理由：现有 canonical 概念组合与该诊断成果的定义和课程深度一致。
- 官方证据：生物学标准PDF p.38（正文对应内容要求 6.1.1），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 116. 选择性必修·生物技术与工程·6.1.2｜转基因技术影响

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_6_1_2_gmo_impacts`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_6_1_2_gmo_impacts`
- 中文释义：比较转基因技术应用可能带来的收益、风险和社会影响。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：转基因技术影响（`pc_c3e39f880db577df6f6c3b5c414c354c`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_c3e39f880db577df6f6c3b5c414c354c 完整覆盖。
- 官方证据：生物学标准PDF p.38（正文对应内容要求 6.1.2），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“转基因技术影响”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 117. 选择性必修·生物技术与工程·6.2.1｜生殖性克隆人的伦理问题

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_6_2_1_reproductive_cloning_ethics`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_6_2_1_reproductive_cloning_ethics`
- 中文释义：说明生殖性克隆人面临的伦理问题。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：生殖性克隆人的伦理问题（`pc_8fdb51d08a8ed66fb99b97be9cfdd375`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_8fdb51d08a8ed66fb99b97be9cfdd375 完整覆盖。
- 官方证据：生物学标准PDF p.38（正文对应内容要求 6.2.1），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“生殖性克隆人的伦理问题”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 118. 选择性必修·生物技术与工程·6.2.2｜中国禁止生殖性克隆人

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_6_2_2_reproductive_cloning_china_policy`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_6_2_2_reproductive_cloning_china_policy`
- 中文释义：说明中国不赞成、不允许、不支持、不接受生殖性克隆人实验的理由。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：中国禁止生殖性克隆人（`pc_daad7f4952e846d491f4766b7ec46c7a`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_daad7f4952e846d491f4766b7ec46c7a 完整覆盖。
- 官方证据：生物学标准PDF p.38（正文对应内容要求 6.2.2），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“中国禁止生殖性克隆人”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 119. 选择性必修·生物技术与工程·6.3.1｜生物武器的威胁与伤害

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_6_3_1_biological_weapons_harms`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_6_3_1_biological_weapons_harms`
- 中文释义：说明生物武器对人类造成的严重威胁和伤害。
- 建议结论：完整覆盖；关系 `required`；置信度 `high`
- 对应概念：生物武器的威胁与伤害（`pc_1a63fde8aa0fbbde94fa5ea18f52d1a5`）
- 判断理由：经定义边界复核，现由 canonical 概念 pc_1a63fde8aa0fbbde94fa5ea18f52d1a5 完整覆盖。
- 官方证据：生物学标准PDF p.38（正文对应内容要求 6.3.1），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：`add_concept`；候选“生物武器的威胁与伤害”；全库未找到语义等价且粒度相同的现有概念。
- 审核状态：`needs_review`

## 120. 选择性必修·生物技术与工程·6.3.2｜反对生物武器扩散的立场

- 课程要求 ID：`req_cn_sh_bio_2020_o_sb_6_3_2_oppose_biological_weapons`
- 映射 ID：`map_cn_sh_bio_2020_o_sb_6_3_2_oppose_biological_weapons`
- 中文释义：认同反对生物武器及其技术和设备扩散的社会责任。
- 建议结论：有理由排除；关系 `not_applicable`；置信度 `high`
- 对应概念：无
- 判断理由：该成果只要求形成价值立场和社会责任，不写入学科概念掌握度。
- 官方证据：生物学标准PDF p.38（正文对应内容要求 6.3.2），选择性必修·生物技术与工程（`src_cn_moe_senior_high_biology_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`
