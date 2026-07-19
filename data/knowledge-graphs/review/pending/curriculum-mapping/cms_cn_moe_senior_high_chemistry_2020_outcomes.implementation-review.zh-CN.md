# 中国高中化学 KG 缺口实施复核（中文）

- 复核日期：2026-07-19
- 缺口解析：57 项
- 直接复用现有 canonical 组合：7 项
- 需要新增或补充稳定概念的成果：50 项
- 新图：49 个 Concept，17 个 Topic，16 条待审先修边
- 状态：全部保持 `needs_review`；本轮是 AI 语义复核，不伪造人工批准。

## 关键纠错

1. 7 项原缺口实际可由现有 canonical 概念组合完整覆盖，已改为直接复用，未创建一对多伪 alias。
2. 删除脚本从课标 5.5 额外推导出的‘化学品风险评估’成果；原文只支持化学应用法律法规与规则意识。
3. ‘分子结构测定方法’和‘光谱与 X 射线衍射’是同一知识边界的两种学业表现，共享一个 canonical 概念。
4. ‘氧化数’不等于‘元素价态与物质转化’，‘酸碱理论’不等于完整‘电解质水溶液体系’；部分覆盖仍保留独立诊断概念。
5. 结构测定同时绑定 Chemistry 2e 的 X 射线衍射章节与 Organic Chemistry 的波谱章节；规则意识改用国家行政法规库条款。
6. OpenStax 当前页面有额外的大模型摄入限制；仓库只保存元数据、校验值和章节定位，不保存或摄入教材正文。
7. 逐项检查 34 个根概念：它们是主题入口或依赖统一 KG 中已复用概念；没有把课标排列顺序伪造成学理先修边。

## 逐项解析

| # | 原缺口 | 动作 | canonical IDs | 新节点 | 第二来源 |
|---:|---|---|---|---|---|
| 1 | 化学科学的研究对象与特征 | `add_or_alias_concepts` | `pc_b793cabfc6adc098cd6407d4d067ef2f` | `cn_sh_chem_chemical_science_scope` | src_openstax_chemistry_2e_2019：Web §1.1 Chemistry in Context |
| 2 | 物质分类与类别转化 | `add_or_alias_concepts` | `pc_75b3836fc0d83d4b0cdc346c8ac5d125` | `cn_sh_chem_substance_classification_conversion` | src_openstax_chemistry_2e_2019：Web §§1.2-1.3 Phases and Classification of Matter; Physical and Chemical Properties; §4.2 Classifying Chemical Reactions |
| 3 | 元素价态与物质转化 | `add_or_alias_concepts` | `pc_042f315c4fd69794846195086e9611ec`<br>`pc_48c23386b228371864ca5fe0f1632f1d` | `cn_sh_chem_element_valence_conversion` | src_openstax_chemistry_2e_2019：Web §4.2 Classifying Chemical Reactions; §17.1 Review of Redox Chemistry |
| 4 | 胶体与分散系 | `add_or_alias_concepts` | `pc_beb45d013bb8fe55d38730f8c8caf40e` | `cn_sh_chem_colloidal_dispersions` | src_openstax_chemistry_2e_2019：Web §11.5 Colloids |
| 5 | 氧化还原与电子转移 | `reuse_existing` | `pc_042f315c4fd69794846195086e9611ec`<br>`pc_4b8778a639899b2be00ad35d38df1699` | — | src_openstax_chemistry_2e_2019：Web §4.2 Classifying Chemical Reactions; §17.1 Review of Redox Chemistry |
| 6 | 氧化剂与还原剂 | `add_or_alias_concepts` | `pc_042f315c4fd69794846195086e9611ec`<br>`pc_377dad2703bed7f040a5cf507fd3022b` | `cn_sh_chem_oxidising_reducing_agents` | src_openstax_chemistry_2e_2019：Web §4.2 Classifying Chemical Reactions; §17.1 Review of Redox Chemistry |
| 7 | 电解质与电离 | `add_or_alias_concepts` | `pc_e0e23323fa5580b7eaff3277d809f5b1`<br>`pc_f6b7711a788cbc8c837f448c591f0fa4`<br>`pc_f7c04a5105eb18e7aff30b03775453df` | `cn_sh_chem_electrolyte_ionisation` | src_openstax_chemistry_2e_2019：Web §11.2 Electrolytes; §4.2 Classifying Chemical Reactions |
| 8 | 离子反应及发生条件 | `add_or_alias_concepts` | `pc_a45921260ca525ac9bf3e69edfc293ab` | `cn_sh_chem_ionic_reaction_conditions` | src_openstax_chemistry_2e_2019：Web §11.2 Electrolytes; §4.2 Classifying Chemical Reactions |
| 9 | 常见离子的检验 | `add_or_alias_concepts` | `pc_2d39a426abf9824742b1287d073caf9b` | `cn_sh_chem_common_ion_tests` | src_openstax_chemistry_2e_2019：Web §4.5 Quantitative Chemical Analysis; Chapter 15 Equilibria of Other Reaction Classes |
| 10 | 钠及其重要化合物 | `add_or_alias_concepts` | `pc_e5aff6eb70c25f008fbf7139bccb2f5e` | `cn_sh_chem_sodium_compounds` | src_openstax_chemistry_2e_2019：Web Chapter 18, sections on the occurrence, preparation, properties and uses of representative metals |
| 11 | 铁及其重要化合物 | `add_or_alias_concepts` | `pc_db9856c274d202c3b699aa0300f025f9`<br>`pc_bfed5c3af1308dfe9e373df84e4f47c7` | `cn_sh_chem_iron_compounds` | src_openstax_chemistry_2e_2019：Web Chapter 19 Transition Metals and Coordination Chemistry; occurrence, preparation and properties of iron |
| 12 | 氮及其重要化合物 | `add_or_alias_concepts` | `pc_c48d9a41a4f7fd5a7ddc4ca53ba4a7ac`<br>`pc_fa18ca8a34ff92855c12ed2a9333b352` | `cn_sh_chem_nitrogen_compounds` | src_openstax_chemistry_2e_2019：Web Chapter 18, sections on the occurrence, preparation, properties and uses of nitrogen and sulfur |
| 13 | 硫及其重要化合物 | `add_or_alias_concepts` | `pc_c48d9a41a4f7fd5a7ddc4ca53ba4a7ac`<br>`pc_1ba2aafb506f153663e2ec775895f553` | `cn_sh_chem_sulfur_compounds` | src_openstax_chemistry_2e_2019：Web Chapter 18, sections on the occurrence, preparation, properties and uses of nitrogen and sulfur |
| 14 | 无机物性质与转化路径 | `add_or_alias_concepts` | `pc_73476caa93ea9100a33aa2cb05d49c25` | `cn_sh_chem_inorganic_conversion_pathways` | src_openstax_chemistry_2e_2019：Web §4.2 Classifying Chemical Reactions; Chapters 18-19 representative and transition-element chemistry |
| 15 | 无机物应用价值与环境影响 | `add_or_alias_concepts` | `pc_cfad06f00128c04d39e47fa742513249` | `cn_sh_chem_inorganic_stse_value` | src_openstax_chemistry_2e_2019：Web Chapters 18-19, preparation, uses and environmental context of inorganic substances |
| 16 | 化学键变化与反应能量 | `reuse_existing` | `pc_b35d6548b40342a4e7e95af4650c7349` | — | src_openstax_chemistry_2e_2019：Web §7.5 Strengths of Ionic and Covalent Bonds; Chapter 5 Thermochemistry |
| 17 | 燃料效率与化学电源价值 | `add_or_alias_concepts` | `pc_7eed0f70fe0b90b51729bf5de0a91ac2` | `cn_sh_chem_fuel_battery_evaluation` | src_openstax_chemistry_2e_2019：Web §17.5 Batteries and Fuel Cells |
| 18 | 碳原子成键与有机分子空间结构 | `reuse_existing` | `pc_b7cf8d670e2f37db41a760a401141534`<br>`pc_76c78ee2b35eca2b943816eb56dbac2a` | — | src_openstax_organic_chemistry_2023：Web Chapters 1-2 Structure and Bonding; Polar Covalent Bonds, Acids, and Bases |
| 19 | 有机反应类型与转化初步 | `reuse_existing` | `pc_9826358783352bf325f9299146a78a37`<br>`pc_cd9220ccd4a94d9511b50e51680a585c`<br>`pc_3ebd79c190b474a0044f5c7d9e8cd92f` | — | src_openstax_organic_chemistry_2023：Web Chapter 6 An Overview of Organic Reactions; Chapters 7-11 addition, substitution and elimination; Chapter 31 Synthetic Polymers |
| 20 | 有机合成创造新物质 | `add_or_alias_concepts` | `pc_96c8edf3efb4fb0b372ae363534dec31` | `cn_sh_chem_organic_synthesis_value` | src_openstax_organic_chemistry_2023：Web Chapter 6 An Overview of Organic Reactions; Chapter 31 Synthetic Polymers |
| 21 | 高分子与生物大分子应用初步 | `add_or_alias_concepts` | `pc_cd9220ccd4a94d9511b50e51680a585c`<br>`pc_4fa4bd24c7e8cdf839921a3fb5f37bde`<br>`pc_ae3e202342d0768f17e63d904381b461`<br>`pc_6584aaea12fe36af1f97d5ade42e4386` | `cn_sh_chem_intro_macromolecule_applications` | src_openstax_organic_chemistry_2023：Web Chapters 25-28 Biomolecules; Chapter 31 Synthetic Polymers |
| 22 | 化学促进可持续发展 | `add_or_alias_concepts` | `pc_c3131ea59560f498b6982176cdeb8913` | `cn_sh_chem_chemistry_sustainable_development` | src_openstax_chemistry_2e_2019：Web §1.1 Chemistry in Context; Chapters 17-20 energy, materials and organic-chemistry applications |
| 23 | 绿色化学基本思想 | `add_or_alias_concepts` | `pc_2c0adadb1e67172588d738b6b7641726` | `cn_sh_chem_green_chemistry_principles` | src_openstax_chemistry_2e_2019：Web §4.4 Reaction Yields; Chapter 16 Thermodynamics; Chapters 18-20 resource and process applications |
| 24 | 化学与材料科学 | `add_or_alias_concepts` | `pc_d929d58ea205d5447fbe57bd97b9739d` | `cn_sh_chem_chemistry_materials` | src_openstax_chemistry_2e_2019：Web §10.6 Lattice Structures in Crystalline Solids; Chapters 18-20 metals, nonmetals and organic materials |
| 25 | 化学与人类健康 | `add_or_alias_concepts` | `pc_0e325dcddd180ae322ba3e28f7d99c25` | `cn_sh_chem_chemistry_health` | src_openstax_organic_chemistry_2023：Web Chapters 25-28 carbohydrates, proteins, lipids and nucleic acids |
| 26 | 化石资源综合利用 | `add_or_alias_concepts` | `pc_25af0b0d2ddbcd075e92f8f6d504dc1a`<br>`pc_ae2a8392fd9b93c33bc41d65e28fa8dc`<br>`pc_d67a8e73f965a59d3be0c55d71b80819`<br>`pc_25bba2e8b8bf7802c9e134ed6ab58e21` | `cn_sh_chem_fossil_resource_utilisation` | src_openstax_organic_chemistry_2023：Web Chapters 3, 7 and 15 alkanes, alkenes and aromatic compounds |
| 27 | 自然资源与能源综合利用 | `add_or_alias_concepts` | `pc_bcee33dfe384aed022e1af81bfb9384f` | `cn_sh_chem_energy_resource_systems` | src_openstax_chemistry_2e_2019：Web Chapter 5 Thermochemistry; §17.5 Batteries and Fuel Cells; Chapters 18 and 20 resource applications |
| 28 | 污染物检测与治理 | `add_or_alias_concepts` | `pc_78a50d8641d4b0678e159d7c139530f4` | `cn_sh_chem_pollutant_detection_treatment` | src_openstax_chemistry_2e_2019：Web §4.5 Quantitative Chemical Analysis; Chapters 11 and 15 separation, precipitation and solution equilibria |
| 29 | 清洁生产与循环利用 | `add_or_alias_concepts` | `pc_a933378eb31c78b07a59cc030c9fafc4` | `cn_sh_chem_clean_production_circularity` | src_openstax_chemistry_2e_2019：Web §4.4 Reaction Yields; Chapter 16 Thermodynamics; Chapters 18-20 resource and process applications |
| 30 | 化学应用法律法规与规则意识 | `add_or_alias_concepts` | `pc_5ec1709b8d3d731aa8552cf0828ef253` | `cn_sh_chem_chemical_rules_safe_use` | src_cn_state_council_hazardous_chemicals_2013：第二条（生产、储存、使用、经营和运输的安全管理范围）与第四条（安全第一、预防为主、综合治理） |
| 31 | 化学能转化与能量守恒 | `add_or_alias_concepts` | `pc_e69d28c59b3a7c85a8366e77b73f49d0`<br>`pc_ddaa179ab823ea748d4ad05e53ee9187`<br>`pc_24ba4230641410361421c44883b583a4` | `cn_sh_chem_energy_forms_conservation` | src_openstax_chemistry_2e_2019：Web Chapter 5 Thermochemistry; Chapter 16 Thermodynamics |
| 32 | 内能与体系状态 | `add_or_alias_concepts` | `pc_57e67f0b2d828d124fc1ed6b252442c7` | `cn_sh_chem_internal_energy_state` | src_openstax_chemistry_2e_2019：Web Chapter 5 Thermochemistry; Chapter 16 Thermodynamics |
| 33 | 金属电化学腐蚀与防护 | `add_or_alias_concepts` | `pc_eb79e19103c45ee35d2e6d1e7bf11c08` | `cn_sh_chem_electrochemical_corrosion` | src_openstax_chemistry_2e_2019：Web §17.6 Corrosion |
| 34 | 浓度商与反应方向 | `add_or_alias_concepts` | `pc_4386477346f4fa3dfe6f31ec2435e3b2`<br>`pc_89e2557a2afb5105f1b6fdb45f2c8557` | `cn_sh_chem_reaction_quotient_direction` | src_openstax_chemistry_2e_2019：Web §§13.2-13.3 Equilibrium Constants; Shifting Equilibria: Le Châtelier's Principle |
| 35 | 反应历程与活化能 | `reuse_existing` | `pc_2a4571ab0da3a12f57b0c311f63f1bee`<br>`pc_cb40576691a93cdc979f318c9e746398` | — | src_openstax_chemistry_2e_2019：Web §§12.5-12.7 Collision Theory; Reaction Mechanisms; Catalysis |
| 36 | 化工反应条件综合优化 | `add_or_alias_concepts` | `pc_7c98c67402dacc3d9d7e3db6b4c7b1f4` | `cn_sh_chem_industrial_condition_optimisation` | src_openstax_chemistry_2e_2019：Web §12.7 Catalysis; §13.3 Shifting Equilibria: Le Châtelier's Principle |
| 37 | 电解质水溶液体系 | `add_or_alias_concepts` | `pc_e0e23323fa5580b7eaff3277d809f5b1`<br>`pc_f6b7711a788cbc8c837f448c591f0fa4`<br>`pc_4d60857bbc8efac2d15739195c48b4fb` | `cn_sh_chem_aqueous_electrolyte_systems` | src_openstax_chemistry_2e_2019：Web §11.2 Electrolytes; Chapters 14-15 aqueous acid-base and solubility equilibria |
| 38 | 水的电离、离子积与 pH | `add_or_alias_concepts` | `pc_77fa4fcddfbfac708e8026c8cc77b391`<br>`pc_9bbd098371d4d3b54f8c721fa44edce9` | `cn_sh_chem_water_ionisation_ph` | src_openstax_chemistry_2e_2019：Web Chapter 14, water autoionisation, pH and pOH |
| 39 | 盐类水解平衡 | `add_or_alias_concepts` | `pc_328cda31419ed2b8c55cf39d1cc44cae` | `cn_sh_chem_salt_hydrolysis` | src_openstax_chemistry_2e_2019：Web Chapter 14, acid-base properties and hydrolysis of salt solutions |
| 40 | 水溶液离子平衡应用 | `add_or_alias_concepts` | `pc_e65a80e3ebb618b67421efebbe223d4a` | `cn_sh_chem_aqueous_equilibrium_applications` | src_openstax_chemistry_2e_2019：Web Chapters 14-15 acid-base, buffer, precipitation and complex-ion equilibria |
| 41 | 电子能级、激发与跃迁 | `add_or_alias_concepts` | `pc_4ee1addaa1bb88db1bc738c8909840bb`<br>`pc_18741f38cfd4c697036aee6fe4658797` | `cn_sh_chem_quantised_levels_transitions` | src_openstax_chemistry_2e_2019：Web §§6.1-6.3 Electromagnetic Energy; The Bohr Model; Development of Quantum Theory |
| 42 | 分子结构测定方法 | `add_or_alias_concepts` | `pc_be8194ec0ada9714cc5a11129041379c`<br>`pc_726c4810fd4590e4416c4c336a4e4ef2`<br>`pc_c65a64a6433978912db1af23a08dd44b` | `cn_sh_chem_spectroscopy_xrd_methods` | src_openstax_chemistry_2e_2019：Web §10.6 Lattice Structures in Crystalline Solids; X-ray diffraction<br>src_openstax_organic_chemistry_2023：Web Chapters 12-14 mass spectrometry, infrared, nuclear magnetic resonance and ultraviolet spectroscopy |
| 43 | 分子极性与手性 | `reuse_existing` | `pc_eed2c090eb2027bca1d0484dc93fee0f`<br>`pc_e3ad1e8ae27f757ccf5d59c333f04d7a` | — | src_openstax_organic_chemistry_2023：Web Chapter 2 Polar Covalent Bonds; Chapter 5 Stereochemistry at Tetrahedral Centers |
| 44 | 过渡晶体与混合型晶体 | `add_or_alias_concepts` | `pc_09d7deaa84a83cf94fcb0b1c3f8d1b48` | `cn_sh_chem_transitional_mixed_crystals` | src_openstax_chemistry_2e_2019：Web §§10.1-10.6 intermolecular forces, states of matter, phase behaviour and crystal structures |
| 45 | 聚集状态、微粒作用与材料性质 | `add_or_alias_concepts` | `pc_ad4a725dfac81fa47283f00bb46d8b4c` | `cn_sh_chem_aggregation_state_materials` | src_openstax_chemistry_2e_2019：Web §§10.1-10.6 intermolecular forces, states of matter, phase behaviour and crystal structures |
| 46 | 光谱与晶体 X 射线衍射 | `add_or_alias_concepts` | `pc_be8194ec0ada9714cc5a11129041379c`<br>`pc_726c4810fd4590e4416c4c336a4e4ef2`<br>`pc_c65a64a6433978912db1af23a08dd44b` | `cn_sh_chem_spectroscopy_xrd_methods` | src_openstax_chemistry_2e_2019：Web §10.6 Lattice Structures in Crystalline Solids; X-ray diffraction<br>src_openstax_organic_chemistry_2023：Web Chapters 12-14 mass spectrometry, infrared, nuclear magnetic resonance and ultraviolet spectroscopy |
| 47 | 结构—性质与材料设计 | `add_or_alias_concepts` | `pc_bc4434394172ce6789e764c282f12a2e` | `cn_sh_chem_structure_guided_material_design` | src_openstax_chemistry_2e_2019：Web Chapters 7 and 10 bonding, molecular geometry, intermolecular forces and crystal structures |
| 48 | 结构理论与生命科学 | `add_or_alias_concepts` | `pc_06a35cc7966558ea8c51e3c5184153fe` | `cn_sh_chem_structure_methods_life_science` | src_openstax_organic_chemistry_2023：Web Chapters 12-14 structure determination; Chapters 25-28 biomolecular structure |
| 49 | 有机分子连接、成键与空间排布 | `reuse_existing` | `pc_b7cf8d670e2f37db41a760a401141534`<br>`pc_76c78ee2b35eca2b943816eb56dbac2a` | — | src_openstax_organic_chemistry_2023：Web Chapters 1-2 Structure and Bonding; Polar Covalent Bonds, Acids, and Bases |
| 50 | 官能团性质、相互影响与转化 | `add_or_alias_concepts` | `pc_b7cf8d670e2f37db41a760a401141534`<br>`pc_9826358783352bf325f9299146a78a37`<br>`pc_1b9d0c4713e1e96792abd35a2860e4e8` | `cn_sh_chem_functional_group_properties_conversion` | src_openstax_organic_chemistry_2023：Web Chapters 6-24 reaction families and functional-group interconversions |
| 51 | 常见官能团检验 | `add_or_alias_concepts` | `pc_0c458f45bd014438bcb506f21ad5e902`<br>`pc_b1b08174971c68ef5b60cadcd6c7f22a` | `cn_sh_chem_functional_group_tests` | src_openstax_organic_chemistry_2023：Web Chapters 12-14 spectroscopic identification; Chapters 17-24 characteristic functional-group reactions |
| 52 | 有机合成路线设计 | `add_or_alias_concepts` | `pc_e27c68a56f8ce39167fc39768f956ba0` | `cn_sh_chem_organic_synthesis_routes` | src_openstax_organic_chemistry_2023：Web Chapters 6-24 reaction mechanisms, carbon-skeleton construction and functional-group interconversions |
| 53 | 有机物安全与绿色合成 | `add_or_alias_concepts` | `pc_98510162e1e934be009d93665229c064` | `cn_sh_chem_organic_safety_green_synthesis` | src_openstax_chemistry_2e_2019：Web §1.1 Chemistry in Context; §4.4 Reaction Yields; Chapter 16 Thermodynamics |
| 54 | 聚合物、单体与链节 | `add_or_alias_concepts` | `pc_cd9220ccd4a94d9511b50e51680a585c`<br>`pc_4fa4bd24c7e8cdf839921a3fb5f37bde`<br>`pc_886ababec38c47f72220f747b1afd3d8` | `cn_sh_chem_polymer_monomer_repeat_unit` | src_openstax_organic_chemistry_2023：Web Chapter 31 Synthetic Polymers |
| 55 | 糖类、葡萄糖、淀粉与纤维素 | `add_or_alias_concepts` | `pc_e19f4ce3dfe214b9941a293fb43de7b0` | `cn_sh_chem_carbohydrates` | src_openstax_organic_chemistry_2023：Web Chapter 25 Biomolecules: Carbohydrates |
| 56 | DNA、RNA 结构与功能 | `add_or_alias_concepts` | `pc_86fb27c4713339280eebe9dac099b314` | `cn_sh_chem_dna_rna` | src_openstax_organic_chemistry_2023：Web Chapter 28 Biomolecules: Nucleic Acids |
| 57 | 合成高分子与新型材料 | `add_or_alias_concepts` | `pc_cd9220ccd4a94d9511b50e51680a585c`<br>`pc_4fa4bd24c7e8cdf839921a3fb5f37bde`<br>`pc_3cab9d25d2a79faaf4e4267df1439df1` | `cn_sh_chem_synthetic_polymers_materials` | src_openstax_organic_chemistry_2023：Web Chapter 31 Synthetic Polymers |

## 自动门禁

- 57 个 gap_id 必须各解析一次；108 个知识成果必须为 full，30 个实践成果必须为 excluded。
- 每个新图 Concept 必须同时有教育部页码证据和至少一个 OpenStax 精确章节证据。
- 每个 Topic 保持 2–3 个 Concept；先修边必须是 DAG 且含理由和证据。
- 所有本轮数据保持 needs_review，只有人工决定才能升级为 approved。
