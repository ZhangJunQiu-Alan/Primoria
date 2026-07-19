# 中国高中生物学 KG 缺口实施复核（中文）

- 复核日期：2026-07-19
- 编号课标成果：120 项；知识 118 项，价值与责任实践 2 项
- 缺口解析：76 项
- 新增稳定概念：75 个
- 新图：75 个 Concept，26 个 Topic，29 条待审先修边
- 状态：全部保持 `needs_review`；本轮是 AI 语义复核，不伪造人工批准。

## 关键决定

1. 120 条编号内容要求逐条保留；教学提示中的实验活动没有重复制造为课标成果。
2. ‘形成环保意识’和‘认同反对生物武器扩散’只进入实践与社会责任层，不写入概念掌握度。
3. 蛋白质工程的‘设计改造’与‘实现过程’共享一个 canonical 概念；生殖性克隆伦理与中国政策的两个成果同样共享一个概念。
4. ‘生态系统与生态位’不等于种群模型、群落演替或物质能量流动；‘基因技术’也不等于细胞工程和胚胎工程，未以宽概念掩盖缺口。
5. 微生物培养、计数、发酵和单克隆抗体证据使用 OpenStax Microbiology 的对应章节，其余概念按 Biology 2e 精确章节绑定。
6. OpenStax 当前页面有额外的大模型摄入限制；仓库只保存元数据、校验值和章节定位，不保存或摄入教材正文。
7. 逐项检查 47 个根概念：它们是主题入口或依赖统一 KG 中已复用概念；没有把课标排列顺序伪造成学理先修边。

## 逐项解析

| # | 原缺口 | canonical IDs | 新节点 | 第二来源 |
|---:|---|---|---|---|
| 1 | 细胞元素与碳链骨架 | `pc_fa5e5c389a8f790944f2e6049357654b`<br>`pc_b010170fadec4b31174da9a87a4332e1` | `cn_sh_bio_cellular_elements_carbon_skeletons` | src_openstax_biology_2e_2018：Web §§2.1-2.4 atoms, water, carbon and biological macromolecules |
| 2 | 细胞中的无机盐 | `pc_c088a7df0656c7e3658e30f9fda3d609` | `cn_sh_bio_cellular_inorganic_salts` | src_openstax_biology_2e_2018：Web §§2.1-2.4 atoms, water, carbon and biological macromolecules |
| 3 | 质膜的边界、运输与交流功能 | `pc_5ff2cda97c05cbe449e6d6bcff0c0834`<br>`pc_7f67c92fa0c79a54f0822060ac8a4080` | `cn_sh_bio_plasma_membrane_functions` | src_openstax_biology_2e_2018：Web Chapter 5 Structure and Function of Plasma Membranes, especially §§5.1-5.4 |
| 4 | 细胞核与遗传信息 | `pc_6a00c0df14c5b18459964bd5ccb5c243`<br>`pc_cb341a51c60bb212ac55750a84630c03`<br>`pc_f25b23ea81c506e587d3067e86866c09` | `cn_sh_bio_nucleus_genetic_information` | src_openstax_biology_2e_2018：Web Chapter 4 Cell Structure, especially §§4.2-4.6 prokaryotic/eukaryotic cells, organelles and cellular connections |
| 5 | 细胞结构的协调合作 | `pc_cb341a51c60bb212ac55750a84630c03`<br>`pc_78dd182e4fbad59e57aeb4484e1c3954` | `cn_sh_bio_organelle_coordination` | src_openstax_biology_2e_2018：Web Chapter 4 Cell Structure, especially §§4.2-4.6 prokaryotic/eukaryotic cells, organelles and cellular connections |
| 6 | 细胞结构统一性与形态功能多样性 | `pc_64852ab0501ee4d7b32d11655eb6b808` | `cn_sh_bio_cellular_unity_diversity` | src_openstax_biology_2e_2018：Web Chapter 4 Cell Structure, especially §§4.2-4.6 prokaryotic/eukaryotic cells, organelles and cellular connections |
| 7 | 质膜的选择透过性 | `pc_5ff2cda97c05cbe449e6d6bcff0c0834`<br>`pc_c2e6fec2c47cd86ee9b8726b908a7a8b`<br>`pc_4e487be68da0fcc9a3f8c5df2493c062` | `cn_sh_bio_selective_permeability` | src_openstax_biology_2e_2018：Web Chapter 5 Structure and Function of Plasma Membranes, especially §§5.1-5.4 |
| 8 | 胞吞与胞吐 | `pc_1264ba133e13ba77487296037ce4c00e` | `cn_sh_bio_endocytosis_exocytosis` | src_openstax_biology_2e_2018：Web Chapter 5 Structure and Function of Plasma Membranes, especially §§5.1-5.4 |
| 9 | 细胞分化 | `pc_56602e952c30d81d754e3900e34590cf`<br>`pc_603e03befcc0fac76e8a059261559f56` | `cn_sh_bio_cell_differentiation` | src_openstax_biology_2e_2018：Web §16.3 Eukaryotic Epigenetic Gene Regulation; differential gene expression and cell differentiation |
| 10 | 细胞衰老与死亡 | `pc_53d0352a79deedffc387d00ac17676a7` | `cn_sh_bio_cell_senescence_death` | src_openstax_biology_2e_2018：Web §§10.2-10.4 cell cycle control, cancer and programmed cell death |
| 11 | 基因是核酸功能片段 | `pc_6a00c0df14c5b18459964bd5ccb5c243`<br>`pc_7c8644ecf9e964364af575d584241cf8`<br>`pc_a5f0cc3dc0636e18a4fef67d49bec23e`<br>`pc_4968ce1f12aa3d8827a46863b03b81d2` | `cn_sh_bio_gene_nucleic_acid_segment` | src_openstax_biology_2e_2018：Web Chapter 14 DNA Structure and Function; Chapter 15 Genes and Proteins; §17.1 Biotechnology |
| 12 | 表观遗传现象 | `pc_db8e1b5b05c1c8cc184a64e1c68c3435` | `cn_sh_bio_epigenetic_phenomena` | src_openstax_biology_2e_2018：Web §16.3 Eukaryotic Epigenetic Gene Regulation |
| 13 | 遗传信息经配子传递 | `pc_9a64e0d9f35ef30bda722f5b7364e0c4`<br>`pc_f90fa4062e2970091368eb5d22919cf4` | `cn_sh_bio_gametic_inheritance` | src_openstax_biology_2e_2018：Web Chapter 11 Meiosis and Sexual Reproduction; Chapter 13 Modern Understandings of Inheritance |
| 14 | 伴性遗传 | `pc_8533c5cf0c58c968c6990001ab576642` | `cn_sh_bio_sex_linked_inheritance` | src_openstax_biology_2e_2018：Web Chapter 11 Meiosis and Sexual Reproduction; Chapter 13 Modern Understandings of Inheritance |
| 15 | 诱变因素与癌变 | `pc_aa917911c35a5a84a131d3c4b99b89af`<br>`pc_043f05d8ef096d7bbdf67578bcc00662` | `cn_sh_bio_mutagens_cancer` | src_openstax_biology_2e_2018：Web §10.4 Cancer and the Cell Cycle; §14.6 DNA Repair |
| 16 | 染色体结构与数量变异 | `pc_41f9701a3bd0fb4527df662b596620b5`<br>`pc_592a494ab52d102d4cb731b24a77b320`<br>`pc_86f481ac1e4983f5844e9bf459df5d7e` | `cn_sh_bio_chromosomal_variation` | src_openstax_biology_2e_2018：Web §13.2 Chromosomal Basis of Inherited Disorders |
| 17 | 人类遗传病检测与预防 | `pc_2fa1c85e0d7a4075a6c60f671d363261` | `cn_sh_bio_genetic_disease_screening` | src_openstax_biology_2e_2018：Web §17.1 Biotechnology; genetic diagnosis and gene therapy |
| 18 | 化石、比较解剖与胚胎学的共同祖先证据 | `pc_67cb55267032c55bab697c87ee0f205f` | `cn_sh_bio_common_ancestry_fossil_anatomy` | src_openstax_biology_2e_2018：Web §18.1 Understanding Evolution; fossil, anatomical and embryological evidence |
| 19 | 细胞与分子层面的共同祖先证据 | `pc_d83debf48c4c993831d6b7beb3321029` | `cn_sh_bio_common_ancestry_cell_molecular` | src_openstax_biology_2e_2018：Web §20.2 Determining Evolutionary Relationships; molecular and cellular homology |
| 20 | 内环境的细胞外液组成 | `pc_990d45746021a0258ffce6947d5c9c25` | `cn_sh_bio_internal_environment_fluids` | src_openstax_biology_2e_2018：Web §33.3 Homeostasis; Chapters 40-41 circulatory, respiratory, excretory and osmoregulatory exchange |
| 21 | 细胞经内环境与外界交换 | `pc_fea026b56e9f7d027299b4484d6be477` | `cn_sh_bio_internal_external_exchange` | src_openstax_biology_2e_2018：Web §33.3 Homeostasis; Chapters 40-41 circulatory, respiratory, excretory and osmoregulatory exchange |
| 22 | 器官系统参与内外环境物质交换 | `pc_023dd94962e430b671d1014972b54342`<br>`pc_ff5a585bec0e26749bef92e5b2ec6c2c`<br>`pc_dc1ea419f7f0124901b64a622aee0648`<br>`pc_169fad745be0c7b18694394af7fb06fe` | `cn_sh_bio_organ_system_exchange` | src_openstax_biology_2e_2018：Web §33.3 Homeostasis; Chapters 40-41 circulatory, respiratory, excretory and osmoregulatory exchange |
| 23 | 反射与反射弧 | `pc_46347b1ad33ab3d77b635c228957c4fd` | `cn_sh_bio_reflex_arc` | src_openstax_biology_2e_2018：Web Chapter 35 The Nervous System, especially §§35.1-35.3 neurons, central and peripheral nervous systems |
| 24 | 脊髓与脑高级中枢协调 | `pc_944f33c2a947e2a2f5d42856cb825a4a`<br>`pc_7865cefc3b34beceb184b410f393c1ba` | `cn_sh_bio_central_nervous_hierarchy` | src_openstax_biology_2e_2018：Web Chapter 35 The Nervous System, especially §§35.1-35.3 neurons, central and peripheral nervous systems |
| 25 | 自主神经调节内脏 | `pc_05a4fbd93dd3ebc240adc1e06c52f9a1` | `cn_sh_bio_autonomic_nervous_regulation` | src_openstax_biology_2e_2018：Web Chapter 35 The Nervous System, especially §§35.1-35.3 neurons, central and peripheral nervous systems |
| 26 | 大脑皮层高级神经活动 | `pc_0083b75b35558081f0f25304f33efa6e` | `cn_sh_bio_cortical_higher_activity` | src_ncbi_neuroscience_2e_2001：Part V Complex Brain Functions, especially Chapters 27 and 31; cortical language function and the neural basis of learning and memory |
| 27 | 内分泌系统组成 | `pc_c7f7ea6f7ce0f78324c900821216e75c`<br>`pc_73decdd85804bf6c56ea96df910916d1` | `cn_sh_bio_endocrine_system` | src_openstax_biology_2e_2018：Web Chapter 37 The Endocrine System; §33.3 Homeostasis |
| 28 | 神经与体液调节协调 | `pc_944f33c2a947e2a2f5d42856cb825a4a`<br>`pc_c7f7ea6f7ce0f78324c900821216e75c`<br>`pc_dc1ea419f7f0124901b64a622aee0648`<br>`pc_a129b516baefe0c88abd508e71bb0e00` | `cn_sh_bio_neuroendocrine_coordination` | src_openstax_biology_2e_2018：Web Chapter 37 The Endocrine System; §33.3 Homeostasis |
| 29 | 体液成分调节呼吸 | `pc_c9fd444d9acfb11faef011f5755c1418`<br>`pc_023dd94962e430b671d1014972b54342`<br>`pc_c351ce3400d2b06f7e3fb6a7f25c9528` | `cn_sh_bio_humoral_respiratory_regulation` | src_openstax_biology_2e_2018：Web §39.3 Breathing; carbon-dioxide and pH control of ventilation |
| 30 | 非特异性与特异性免疫 | `pc_b396f7788c77baeecc089eeec83538e5`<br>`pc_94f54f11e23c1c3e407c8036fb6321b6` | `cn_sh_bio_innate_adaptive_immunity` | src_openstax_biology_2e_2018：Web Chapter 42 The Immune System, especially §§42.1-42.4 innate, adaptive and disrupted immunity |
| 31 | 免疫功能异常与疾病 | `pc_5f99a9c2ac6e1cab9e53477e2842eb6b` | `cn_sh_bio_immune_disorders` | src_openstax_biology_2e_2018：Web Chapter 42 The Immune System, especially §§42.1-42.4 innate, adaptive and disrupted immunity |
| 32 | 生长素发现与两重性 | `pc_ec9ed2577284952c142079dc7a389627`<br>`pc_3b0475fedf65a19d4227115cc008b92d` | `cn_sh_bio_auxin_dual_effects` | src_openstax_biology_2e_2018：Web §30.6 Plant Sensory Systems and Responses; auxin, tropisms and agricultural applications |
| 33 | 植物激素及类似物的生产应用 | `pc_ec9ed2577284952c142079dc7a389627`<br>`pc_e8352e234d2f8fb344dafcdbd894f99e`<br>`pc_0758d51c8b98059f1780aee07c326953` | `cn_sh_bio_plant_growth_regulator_applications` | src_openstax_biology_2e_2018：Web §30.6 Plant Sensory Systems and Responses; auxin, tropisms and agricultural applications |
| 34 | 种群特征 | `pc_a9447add767e7c509fb5f3725435137d` | `cn_sh_bio_population_characteristics` | src_openstax_biology_2e_2018：Web §45.1 Population Demography; population size, density, distribution and life-history structure |
| 35 | 种群数量变化模型 | `pc_ceeb7c1f2db353b57d85fa869f5bda71` | `cn_sh_bio_population_growth_models` | src_openstax_biology_2e_2018：Web §45.3 Environmental Limits to Population Growth; exponential and logistic growth models |
| 36 | 种群特征的生物与非生物影响因素 | `pc_ecfaff613c7086e0cece6014f44b68ba`<br>`pc_7634f823e7f43393e5a89d2fb684676e` | `cn_sh_bio_population_limiting_factors` | src_openstax_biology_2e_2018：Web §45.4 Population Dynamics and Regulation; density-dependent and density-independent limiting factors |
| 37 | 群落垂直、水平结构及时间变化 | `pc_ecfaff613c7086e0cece6014f44b68ba`<br>`pc_738afe02309cf9d584681e013e11fe69` | `cn_sh_bio_community_structure` | src_openstax_biology_2e_2018：Web Chapter 45 Population and Community Ecology; community structure and succession |
| 38 | 初生演替与次生演替 | `pc_40daa84cf8496038cb7d02572227bac9` | `cn_sh_bio_ecological_succession` | src_openstax_biology_2e_2018：Web Chapter 45 Population and Community Ecology; community structure and succession |
| 39 | 食物链与食物网 | `pc_70da4d7e60b713056853543f2b486297` | `cn_sh_bio_food_chains_webs` | src_openstax_biology_2e_2018：Web Chapter 46 Ecosystems; trophic structure, energy flow, biogeochemical cycles and ecosystem dynamics |
| 40 | 物质循环与能量流动 | `pc_a26230828b27cf03028e959c4472f5f1` | `cn_sh_bio_matter_cycles_energy_flow` | src_openstax_biology_2e_2018：Web Chapter 46 Ecosystems; trophic structure, energy flow, biogeochemical cycles and ecosystem dynamics |
| 41 | 生态规律与资源利用 | `pc_ecfaff613c7086e0cece6014f44b68ba`<br>`pc_aa24b4324d962f7ab29f0ddeb0f63405`<br>`pc_3104e1f4e490282faddf07783c2399b8` | `cn_sh_bio_ecological_resource_use` | src_openstax_biology_2e_2018：Web Chapter 46 Ecosystems; trophic structure, energy flow, biogeochemical cycles and ecosystem dynamics |
| 42 | 数量、生物量和能量金字塔 | `pc_305adf8ebeefac092af08b8ad4ce31b5` | `cn_sh_bio_ecological_pyramids` | src_openstax_biology_2e_2018：Web Chapter 46 Ecosystems; trophic structure, energy flow, biogeochemical cycles and ecosystem dynamics |
| 43 | 食物链中的有害物质富集 | `pc_eec94f4451e73065d30fd63abe099466` | `cn_sh_bio_biomagnification` | src_openstax_biology_2e_2018：Web Chapter 46 Ecosystems; trophic structure, energy flow, biogeochemical cycles and ecosystem dynamics |
| 44 | 生态系统信息传递 | `pc_ba3fe6583fb4d40f15c1573e314b2897` | `cn_sh_bio_ecosystem_information_transfer` | src_openstax_biology_2e_2018：Web §45.7 Behavioral Biology; communication by visual, chemical, aural and tactile signals and its roles in reproduction and social behaviour |
| 45 | 营养结构的生物与非生物决定因素 | `pc_ecfaff613c7086e0cece6014f44b68ba`<br>`pc_5e3af190cf5d812135bc6cfb8de91b73` | `cn_sh_bio_trophic_structure_factors` | src_openstax_biology_2e_2018：Web Chapter 46 Ecosystems; trophic structure, energy flow, biogeochemical cycles and ecosystem dynamics |
| 46 | 生态系统稳定性 | `pc_a853ca2b6804c3743c7a40f1c2ae5081` | `cn_sh_bio_ecosystem_stability` | src_openstax_biology_2e_2018：Web §§46.1-46.3 ecosystem dynamics, trophic interactions and biogeochemical cycles |
| 47 | 生态系统干扰因素 | `pc_ecfaff613c7086e0cece6014f44b68ba`<br>`pc_cee4cb6816eac128a0e6f36535957b6a` | `cn_sh_bio_ecosystem_disturbances` | src_openstax_biology_2e_2018：Web §§46.1-46.3 ecosystem dynamics, trophic interactions and biogeochemical cycles |
| 48 | 生态系统自我调节 | `pc_e842f2edde8b384472460c753b197e3f` | `cn_sh_bio_ecosystem_self_regulation` | src_openstax_biology_2e_2018：Web §§46.1-46.3 ecosystem dynamics, trophic interactions and biogeochemical cycles |
| 49 | 人口增长的环境压力 | `pc_d736b9e86a2f00629df578cf4d065b89` | `cn_sh_bio_population_environment_pressure` | src_openstax_biology_2e_2018：Web §45.5 Human Population Growth; demographic transition, resource demand and carrying capacity |
| 50 | 全球环境问题与生物圈稳态 | `pc_aa24b4324d962f7ab29f0ddeb0f63405`<br>`pc_3c7141a671b5d3b21d36e648301947f1` | `cn_sh_bio_global_environmental_change` | src_openstax_biology_2e_2018：Web §44.5 Climate and the Effects of Global Climate Change; §47.3 Threats to Biodiversity |
| 51 | 生态工程与资源循环利用 | `pc_ecfaff613c7086e0cece6014f44b68ba`<br>`pc_aa24b4324d962f7ab29f0ddeb0f63405`<br>`pc_d31768fc6f80dfb5ffee5fdcb356a5dd` | `cn_sh_bio_ecological_engineering_circularity` | src_openstax_biology_2e_2018：Web §22.5 Beneficial Prokaryotes: bioremediation; §46.3 Biogeochemical Cycles; Chapter 47 conservation, restoration and sustainable resource use |
| 52 | 纯培养中的灭菌 | `pc_02db8c75f6ee755edfdd44db1800d190` | `cn_sh_bio_sterilisation_microbe_culture` | src_openstax_microbiology_2016：Web Chapter 13 Control of Microbial Growth; physical and chemical control methods and aseptic practice |
| 53 | 无菌技术 | `pc_da199aa16f2cf927e3eb52617c37220d` | `cn_sh_bio_aseptic_technique` | src_openstax_microbiology_2016：Web Chapter 13 Control of Microbial Growth; physical and chemical control methods and aseptic practice |
| 54 | 培养基配方与目的培养 | `pc_3ffc91735aa4009319d97d82b2bd6cb1` | `cn_sh_bio_selective_culture_media` | src_openstax_microbiology_2016：Web Chapter 9 Microbial Growth; culture media, isolation and direct/viable counting methods |
| 55 | 平板划线与稀释涂布分离 | `pc_9d5bceaf3c265dcafdaa249db80ad329` | `cn_sh_bio_microbial_isolation_methods` | src_openstax_microbiology_2016：Web Chapter 9 Microbial Growth; culture media, isolation and direct/viable counting methods |
| 56 | 稀释涂布与显微镜计数 | `pc_d5a40034050d02c152d7f51ce3bd2513` | `cn_sh_bio_microbial_counting_methods` | src_openstax_microbiology_2016：Web Chapter 9 Microbial Growth; culture media, isolation and direct/viable counting methods |
| 57 | 传统发酵食品 | `pc_316272b1915e07a00215e5b2801d2772` | `cn_sh_bio_traditional_fermentation` | src_openstax_microbiology_2016：Web §1.1 What Our Ancestors Knew and §8.4 Fermentation; traditional food and beverage fermentation |
| 58 | 现代发酵工程 | `pc_339a5f3174c1fa2f8c4273228d1abe4d` | `cn_sh_bio_industrial_fermentation` | src_openstax_microbiology_2016：Web §8.4 Fermentation; commercial food, pharmaceutical, solvent, vitamin and biofuel products |
| 59 | 发酵工程应用 | `pc_1fffd89a6d612ed5bd06d8559028652b` | `cn_sh_bio_fermentation_applications` | src_openstax_microbiology_2016：Web §8.4 Fermentation; commercial food, pharmaceutical, solvent, vitamin and biofuel products |
| 60 | 植物组织培养 | `pc_6cc7ae70a5a7f498efda3c0155ece301` | `cn_sh_bio_plant_tissue_culture` | src_openstax_biology_2e_2018：Web §32.3 Asexual Reproduction; micropropagation, disease-free stock and plant tissue culture |
| 61 | 植物体细胞杂交 | `pc_23f52412736512b8f40fac9958079322` | `cn_sh_bio_plant_somatic_hybridisation` | src_pmc_apiaceae_protoplast_somatic_hybridisation_2023：Sections 1 and 9; protoplast isolation, chemical or electrical fusion, hybrid-plant regeneration and breeding applications |
| 62 | 植物细胞工程应用 | `pc_d30f1f836c9100c1462e7a4a389ce02f` | `cn_sh_bio_plant_cell_engineering_applications` | src_pmc_plant_tissue_culture_applications_2023：Sections 4.1-4.2; rapid micropropagation, virus-free plants, genetic improvement and secondary-metabolite production |
| 63 | 动物细胞培养 | `pc_df3d6997dd440131a8dad40c4acbc338` | `cn_sh_bio_animal_cell_culture` | src_openstax_microbiology_2016：Web §20.1 Polyclonal and Monoclonal Antibody Production; tissue culture and hybridoma cell fusion |
| 64 | 动物体细胞核移植 | `pc_0185ccac3ad47cd14f266d12099ab528`<br>`pc_73b8a50a14796395bbb0ae7525ab1b99` | `cn_sh_bio_somatic_cell_nuclear_transfer` | src_openstax_biology_2e_2018：Web §17.1 Biotechnology; somatic-cell nuclear transfer and reproductive cloning |
| 65 | 动物细胞融合 | `pc_ab54a12e8f3ea29b213314991f5dccfc` | `cn_sh_bio_animal_cell_fusion` | src_openstax_microbiology_2016：Web §20.1 Polyclonal and Monoclonal Antibody Production; tissue culture and hybridoma cell fusion |
| 66 | 单克隆抗体制备 | `pc_4e3f76f101debb1e241b0bab776e4cf1`<br>`pc_076accb0e6c48dc5a6b42dcc36152da3` | `cn_sh_bio_monoclonal_antibody_production` | src_openstax_microbiology_2016：Web §20.1 Polyclonal and Monoclonal Antibody Production |
| 67 | 干细胞的生物医学应用 | `pc_f24ca070bfceb1f905930f4386fc0b75` | `cn_sh_bio_stem_cell_applications` | src_openstax_biology_2e_2018：Web §§43.6-43.7 early embryonic development, embryonic stem cells and differentiation |
| 68 | 受精与早期胚胎发育 | `pc_2bb6c5caf86fb9a1beb4b9ed7331d3fc` | `cn_sh_bio_fertilisation_early_embryo` | src_openstax_biology_2e_2018：Web §43.6 Fertilization and Early Embryonic Development |
| 69 | 体外受精、胚胎移植与分割 | `pc_fea1ab91762f39ce21af7aee8d10f9b1` | `cn_sh_bio_embryo_engineering` | src_fao_cattle_embryo_transfer_manual_1991：Chapters 6-10, especially Chapter 10 Splitting Embryos; embryo recovery, transfer, bisection and demi-embryo transfer |
| 70 | 限制酶、连接酶与载体 | `pc_0185ccac3ad47cd14f266d12099ab528`<br>`pc_2453884856757a434254e3d2465428a9` | `cn_sh_bio_gene_engineering_tools` | src_openstax_biology_2e_2018：Web §17.1 Biotechnology; recombinant-DNA tools, cloning, expression and engineered products |
| 71 | 蛋白质工程设计与改造 | `pc_c106243302f8fd6e37f9a27d11d0c458` | `cn_sh_bio_protein_engineering` | src_ncbi_genomes_2e_protein_engineering_2002：Chapter 7 §7.2.3; protein engineering by targeted gene alteration to change protein structure, activity and application properties |
| 72 | 蛋白质工程实现过程 | `pc_c106243302f8fd6e37f9a27d11d0c458` | `cn_sh_bio_protein_engineering` | src_ncbi_genomes_2e_protein_engineering_2002：Chapter 7 §7.2.3; protein engineering by targeted gene alteration to change protein structure, activity and application properties |
| 73 | 转基因技术影响 | `pc_c3e39f880db577df6f6c3b5c414c354c` | `cn_sh_bio_gmo_impacts` | src_openstax_biology_2e_2018：Web §17.1 Biotechnology; agricultural, medical and ethical impacts of genetic modification |
| 74 | 生殖性克隆人的伦理问题 | `pc_8fdb51d08a8ed66fb99b97be9cfdd375` | `cn_sh_bio_reproductive_cloning_ethics` | src_openstax_biology_2e_2018：Web §1.1 The Science of Biology: scientific ethics; §17.1 Biotechnology: reproductive cloning, safety and social consequences |
| 75 | 中国禁止生殖性克隆人 | `pc_daad7f4952e846d491f4766b7ec46c7a` | `cn_sh_bio_reproductive_cloning_china_policy` | src_cn_nhc_assisted_reproduction_ethics_2003：附件1 行为准则第（十五）项‘禁止克隆人’；附件3 社会公益原则第3项‘不得实施生殖性克隆技术’ |
| 76 | 生物武器的威胁与伤害 | `pc_1a63fde8aa0fbbde94fa5ea18f52d1a5` | `cn_sh_bio_biological_weapons_harms` | src_openstax_microbiology_2016：Web §21.2 Bacterial Infections of the Skin and Eyes; anthrax as a biological weapon and documented harms |

## 自动门禁

- 76 个 gap_id 必须各解析一次；118 个知识成果必须为 full，2 个价值实践成果必须为 excluded。
- 每个新图 Concept 必须同时有教育部页码证据和至少一个 OpenStax 精确章节证据。
- 每个 Topic 保持 2–3 个 Concept；先修边必须是 DAG 且含理由和证据。
- 所有本轮数据保持 needs_review，只有人工决定才能升级为 approved。
