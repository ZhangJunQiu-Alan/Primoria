# 普通高中化学课程标准（2017年版2020年修订）：KG 映射待审核包

> 本文件只展示 AI 提出的待审建议。所有条目均为 `needs_review`，未经人工批准不会进入正式 KG。
> 当前集合是主题级导航映射，不是逐条学习成果覆盖矩阵；`部分覆盖` 不得解释为官方大纲已完整覆盖。

- 课程：`cur_cn_moe_senior_high_chemistry_2020`
- 课程框架：`cfw_cn_moe_senior_high_chemistry_2020_topics`
- 映射集合：`cms_cn_moe_senior_high_chemistry_2020`
- 地区：`CN-MAINLAND`
- 课程版本：`0.1.0`
- 映射版本：`0.2.1`
- 映射范围：`topic_alignment`
- 官方来源：`src_cn_moe_senior_high_chemistry_2020`
- 覆盖统计：完整 0；部分 13；未映射 1；排除 0
- KG 缺口建议：本主题级导航框架不生成逐成果缺口候选

## 1. 必修·主题1｜化学科学与实验探究

- 课程要求 ID：`req_cn_sh_chem_2020_r_science_experiment`
- 映射 ID：`map_cn_sh_chem_2020_r_science_experiment`
- 中文释义：理解化学研究的证据、模型与定量方法，能够提出问题、设计实验并安全规范地处理数据。
- 建议结论：部分覆盖；关系 `supporting`；置信度 `medium`
- 对应概念：浓度与滴定（`pc_40e84973ce28c8bfbe369bab4f213754`）；量热法（`pc_15992a7e0497388298726130f75cad83`）；色谱法（`pc_c4dd935c7ad3b4429321fa1c103185a4`）
- 判断理由：滴定、量热和色谱可支撑部分实验，但实验设计、证据推理和安全规范尚无通用实践概念。
- 官方证据：化学标准PDF p.19（正文p.11），必修主题1（`src_cn_moe_senior_high_chemistry_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 2. 必修·主题2｜常见的无机物及其应用

- 课程要求 ID：`req_cn_sh_chem_2020_r_inorganic_substances`
- 映射 ID：`map_cn_sh_chem_2020_r_inorganic_substances`
- 中文释义：从物质类别和元素价态理解无机物性质、氧化还原与离子反应，并用于制备、检验和转化。
- 建议结论：部分覆盖；关系 `required`；置信度 `low`
- 对应概念：氧化数（`pc_042f315c4fd69794846195086e9611ec`）；氧化还原方程（`pc_4b8778a639899b2be00ad35d38df1699`）
- 判断理由：氧化数和氧化还原方程可支撑元素价态与转化；Cambridge的第3周期、第2族、第17族及氮硫专门主题不能代替中国课标中的常见无机物，铁、铝、钠、氯及离子反应仍缺少准确概念。
- 官方证据：化学标准PDF p.22（正文p.14），必修主题2（`src_cn_moe_senior_high_chemistry_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 3. 必修·主题3｜物质结构基础与化学反应规律

- 课程要求 ID：`req_cn_sh_chem_2020_r_structure_reaction_rules`
- 映射 ID：`map_cn_sh_chem_2020_r_structure_reaction_rules`
- 中文释义：联系原子结构、周期律和化学键，理解反应速率、限度及化学能与电能转化。
- 建议结论：部分覆盖；关系 `required`；置信度 `high`
- 对应概念：电子排布（`pc_4ee1addaa1bb88db1bc738c8909840bb`）；离子键（`pc_4b92b05bd4662531b6bc415778fee240`）；共价键（`pc_76c78ee2b35eca2b943816eb56dbac2a`）；金属键（`pc_f2a9c19ab3c922280139d1ca1fda33ba`）；反应速率（`pc_9149d04521bbf394cffde8a4040d28ed`）；动态平衡（`pc_f2db072d9b9ecf3925965c5aec1b340e`）；焓变（`pc_e69d28c59b3a7c85a8366e77b73f49d0`）；电化学电池（`pc_ddaa179ab823ea748d4ad05e53ee9187`）
- 判断理由：电子排布、化学键、反应速率、平衡、能量和电化学有对应；电离能属于更深的选择性必修结构内容，已移除，中国必修层级的周期律与结构—性质统整仍需细化。
- 官方证据：化学标准PDF p.26（正文p.18），必修主题3（`src_cn_moe_senior_high_chemistry_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 4. 必修·主题4｜简单的有机化合物及其应用

- 课程要求 ID：`req_cn_sh_chem_2020_r_simple_organic`
- 映射 ID：`map_cn_sh_chem_2020_r_simple_organic`
- 中文释义：识别碳骨架与官能团，理解典型简单有机物的性质及其在材料、能源和生命中的应用。
- 建议结论：部分覆盖；关系 `required`；置信度 `high`
- 对应概念：官能团与有机结构表示（`pc_b7cf8d670e2f37db41a760a401141534`）；命名法（`pc_0b65c6a9710a1310be1f9b285ed88e74`）；烷烃（`pc_25af0b0d2ddbcd075e92f8f6d504dc1a`）；烯烃（`pc_ae2a8392fd9b93c33bc41d65e28fa8dc`）；醇的反应（`pc_42ea5b997cbab553b5f29d052a9d06aa`）；羧酸（`pc_3f37112bc196b1765029aad7952026ca`）；加聚反应（`pc_cd9220ccd4a94d9511b50e51680a585c`）；氨基酸与蛋白质（`pc_ae3e202342d0768f17e63d904381b461`）
- 判断理由：常见烃、醇、羧酸、聚合物和氨基酸蛋白质有对应；现有酯概念同时捆绑了超出必修的酰氯，故已移除，命名深度及食品、医药和材料应用情境仍需人工把关。
- 官方证据：化学标准PDF p.29（正文p.21），必修主题4（`src_cn_moe_senior_high_chemistry_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 5. 必修·主题5｜化学与社会发展

- 课程要求 ID：`req_cn_sh_chem_2020_r_society_sustainability`
- 映射 ID：`map_cn_sh_chem_2020_r_society_sustainability`
- 中文释义：评价化学在材料、健康、资源、能源与环境中的作用，识别应用风险并形成安全责任意识。
- 建议结论：尚未映射；关系 `not_applicable`；置信度 `high`
- 对应概念：无
- 判断理由：该要求侧重资源、环境、材料和社会责任，当前统一 KG 没有相应社会技术系统概念，不能用单个反应概念代替。
- 官方证据：化学标准PDF p.31（正文p.23），必修主题5（`src_cn_moe_senior_high_chemistry_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 6. 化学反应原理·主题1｜化学反应与能量

- 课程要求 ID：`req_cn_sh_chem_2020_sr_energy`
- 映射 ID：`map_cn_sh_chem_2020_sr_energy`
- 中文释义：定量分析焓变，理解原电池、电解池和化学电源中的能量转化与守恒。
- 建议结论：部分覆盖；关系 `required`；置信度 `high`
- 对应概念：焓变（`pc_e69d28c59b3a7c85a8366e77b73f49d0`）；盖斯定律（`pc_5228fc493b409be3407c6661aed3da92`）；量热法（`pc_15992a7e0497388298726130f75cad83`）；电化学电池（`pc_ddaa179ab823ea748d4ad05e53ee9187`）；电解（`pc_4375fb1d523a4b08df3b42fab0c0642e`）
- 判断理由：反应焓、Hess定律、量热法、电池和电解有直接对应；课标本主题未列标准电极电势，已删除。该判断仅表示主题级对齐，未逐条证明官方学习成果全覆盖。
- 官方证据：化学标准PDF p.36（正文p.28），选择性必修主题1（`src_cn_moe_senior_high_chemistry_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 7. 化学反应原理·主题2｜化学反应的方向、限度和速率

- 课程要求 ID：`req_cn_sh_chem_2020_sr_direction_rate_equilibrium`
- 映射 ID：`map_cn_sh_chem_2020_sr_direction_rate_equilibrium`
- 中文释义：运用热力学、动力学和平衡常数分析反应可行性、速率、限度及调控条件。
- 建议结论：部分覆盖；关系 `required`；置信度 `high`
- 对应概念：熵（`pc_796efe527a46546cb476af1d40c1c1f5`）；吉布斯自由能（`pc_c912d7aa7e95cc5c77a18f6f5aae0a0c`）；反应速率（`pc_9149d04521bbf394cffde8a4040d28ed`）；碰撞理论（`pc_2a4571ab0da3a12f57b0c311f63f1bee`）；催化（`pc_3acf09a2d45e4a4379136a369085e5f8`）；动态平衡（`pc_f2db072d9b9ecf3925965c5aec1b340e`）；勒夏特列原理（`pc_11136627f33775e0a74e8d42c8e86361`）；平衡常数 Kc 与 Kp（`pc_4386477346f4fa3dfe6f31ec2435e3b2`）
- 判断理由：熵与Gibbs能、反应速率、碰撞理论、催化、平衡移动及平衡常数有对应；反应级数、速率方程和决速步超出课标条目，已删除。平衡常数候选还包含Kp，需在后续成果级映射中限制范围。
- 官方证据：化学标准PDF p.38（正文p.30），选择性必修主题2（`src_cn_moe_senior_high_chemistry_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 8. 化学反应原理·主题3｜水溶液中的离子反应与平衡

- 课程要求 ID：`req_cn_sh_chem_2020_sr_aqueous_equilibria`
- 映射 ID：`map_cn_sh_chem_2020_sr_aqueous_equilibria`
- 中文释义：处理酸碱、电离、水解和沉淀溶解平衡，计算与测量pH并解释溶液性质。
- 建议结论：部分覆盖；关系 `required`；置信度 `high`
- 对应概念：布朗斯特-洛瑞理论（`pc_e0e23323fa5580b7eaff3277d809f5b1`）；强酸与弱酸（`pc_f6b7711a788cbc8c837f448c591f0fa4`）；pH 与酸解离常数（`pc_77fa4fcddfbfac708e8026c8cc77b391`）；缓冲剂（`pc_82c006666402fb0151977a37993a8809`）；溶度积（`pc_a4e09c1b07331a56753ee7884854992a`）
- 判断理由：酸碱理论、强弱酸碱、pH 与电离常数、缓冲和溶度积均有直接对应。 该判断仅表示主题级对齐，未逐条证明官方学习成果全覆盖。
- 官方证据：化学标准PDF p.41（正文p.33），选择性必修主题3（`src_cn_moe_senior_high_chemistry_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 9. 物质结构与性质·主题1｜原子结构与元素的性质

- 课程要求 ID：`req_cn_sh_chem_2020_ss_atomic_structure`
- 映射 ID：`map_cn_sh_chem_2020_ss_atomic_structure`
- 中文释义：理解轨道和电子排布，联系电离能、电负性与元素周期性解释和预测性质。
- 建议结论：部分覆盖；关系 `required`；置信度 `high`
- 对应概念：亚原子粒子（`pc_d3750ab7dae24f534aee9f39f91e5f71`）；同位素（`pc_6a27f090d384dbc6be61017193c58dae`）；电子排布（`pc_4ee1addaa1bb88db1bc738c8909840bb`）；原子轨道形状（`pc_c68d18c005adce683dffeb83cd4cb895`）；电离能（`pc_4e357bba20ab4ba89207b97a6dc2e610`）；周期趋势（`pc_d8222e150de1d5b8d93389c00a07fabe`）
- 判断理由：亚原子结构、同位素、电子排布、轨道、离子化能和周期趋势均有直接对应。 该判断仅表示主题级对齐，未逐条证明官方学习成果全覆盖。
- 官方证据：化学标准PDF p.44（正文p.36），选择性必修主题1（`src_cn_moe_senior_high_chemistry_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 10. 物质结构与性质·主题2｜微粒间的相互作用与物质的性质

- 课程要求 ID：`req_cn_sh_chem_2020_ss_interactions_properties`
- 映射 ID：`map_cn_sh_chem_2020_ss_interactions_properties`
- 中文释义：从离子键、共价键、配位键和分子间作用理解分子形状、晶体结构及宏观性质。
- 建议结论：部分覆盖；关系 `required`；置信度 `high`
- 对应概念：离子键（`pc_4b92b05bd4662531b6bc415778fee240`）；共价键（`pc_76c78ee2b35eca2b943816eb56dbac2a`）；金属键（`pc_f2a9c19ab3c922280139d1ca1fda33ba`）；VSEPR 分子形状（`pc_efe51eb9f4ef6303c37411a09a459344`）；电负性与极性（`pc_eed2c090eb2027bca1d0484dc93fee0f`）；分子间作用力（`pc_614f3b0e205dabe62760af3243c960e1`）；固体结构（`pc_a4b86c05308a1e5a1bda8192168cddbc`）
- 判断理由：离子键、共价键、金属键、分子构型、电负性、分子间作用力和固体结构均有直接对应。 该判断仅表示主题级对齐，未逐条证明官方学习成果全覆盖。
- 官方证据：化学标准PDF p.47（正文p.39），选择性必修主题2（`src_cn_moe_senior_high_chemistry_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 11. 物质结构与性质·主题3｜研究物质结构的方法与价值

- 课程要求 ID：`req_cn_sh_chem_2020_ss_structure_methods`
- 映射 ID：`map_cn_sh_chem_2020_ss_structure_methods`
- 中文释义：认识光谱、衍射等结构研究方法及模型演进，评价多尺度结构知识的科学价值。
- 建议结论：部分覆盖；关系 `required`；置信度 `high`
- 对应概念：质谱分析（`pc_6db4c3c8a688125ae68bfe172a744ac5`）；红外光谱（`pc_be8194ec0ada9714cc5a11129041379c`）；NMR光谱（`pc_726c4810fd4590e4416c4c336a4e4ef2`）
- 判断理由：质谱、红外和核磁共振已有对应；X 射线衍射等结构测定方法未覆盖。
- 官方证据：化学标准PDF p.51（正文p.43），选择性必修主题3（`src_cn_moe_senior_high_chemistry_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 12. 有机化学基础·主题1｜有机化合物的组成与结构

- 课程要求 ID：`req_cn_sh_chem_2020_so_organic_structure`
- 映射 ID：`map_cn_sh_chem_2020_so_organic_structure`
- 中文释义：通过官能团、化学键和同分异构理解有机结构，并使用谱学信息推断分子。
- 建议结论：部分覆盖；关系 `required`；置信度 `high`
- 对应概念：官能团与有机结构表示（`pc_b7cf8d670e2f37db41a760a401141534`）；命名法（`pc_0b65c6a9710a1310be1f9b285ed88e74`）；同分异构（`pc_e3ad1e8ae27f757ccf5d59c333f04d7a`）；质谱分析（`pc_6db4c3c8a688125ae68bfe172a744ac5`）；红外光谱（`pc_be8194ec0ada9714cc5a11129041379c`）；NMR光谱（`pc_726c4810fd4590e4416c4c336a4e4ef2`）
- 判断理由：有机表示与命名、同分异构及三类主要谱学鉴定方法均有直接对应。 该判断仅表示主题级对齐，未逐条证明官方学习成果全覆盖。
- 官方证据：化学标准PDF p.53（正文p.45），选择性必修主题1（`src_cn_moe_senior_high_chemistry_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 13. 有机化学基础·主题2｜烃及其衍生物的性质与应用

- 课程要求 ID：`req_cn_sh_chem_2020_so_hydrocarbons_derivatives`
- 映射 ID：`map_cn_sh_chem_2020_so_hydrocarbons_derivatives`
- 中文释义：理解烃及含氧、含氮衍生物的典型反应、机理与转化，完成检验、推断和简单合成。
- 建议结论：部分覆盖；关系 `required`；置信度 `high`
- 对应概念：烷烃（`pc_25af0b0d2ddbcd075e92f8f6d504dc1a`）；烯烃（`pc_ae2a8392fd9b93c33bc41d65e28fa8dc`）；苯的结构（`pc_d67a8e73f965a59d3be0c55d71b80819`）；醇的反应（`pc_42ea5b997cbab553b5f29d052a9d06aa`）；醛和酮（`pc_0c458f45bd014438bcb506f21ad5e902`）；羧酸（`pc_3f37112bc196b1765029aad7952026ca`）；胺（`pc_1472e2980e7244beb53eecfa3bcd4051`）；酰胺（`pc_54969456882eab85ca38b2957992a4aa`）
- 判断理由：主要烃及醇、醛酮、羧酸、胺和酰胺有对应；腈、羟基腈以及A-Level反应物种与机理分类超出课标条目，已删除。酯候选捆绑酰氯，故也未映射。
- 官方证据：化学标准PDF p.56（正文p.48），选择性必修主题2（`src_cn_moe_senior_high_chemistry_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 14. 有机化学基础·主题3｜生物大分子及合成高分子

- 课程要求 ID：`req_cn_sh_chem_2020_so_macromolecules`
- 映射 ID：`map_cn_sh_chem_2020_so_macromolecules`
- 中文释义：联系单体与聚合物结构，理解糖类、蛋白质、核酸和合成高分子的组成、性质与应用。
- 建议结论：部分覆盖；关系 `required`；置信度 `high`
- 对应概念：加聚反应（`pc_cd9220ccd4a94d9511b50e51680a585c`）；缩聚反应（`pc_4fa4bd24c7e8cdf839921a3fb5f37bde`）；氨基酸与蛋白质（`pc_ae3e202342d0768f17e63d904381b461`）
- 判断理由：加成聚合、缩合聚合和氨基酸蛋白质已有对应；糖类、油脂及核酸的有机化学结构未完整覆盖。
- 官方证据：化学标准PDF p.58（正文p.50），选择性必修主题3（`src_cn_moe_senior_high_chemistry_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`
