# A-Level 生物批准记录：34 项 Concept 缺口与 33 项 Skill 映射

- 图：`a_level_biology`
- 来源：[`src_cambridge_9700_2025_2027`](https://www.cambridgeinternational.org/Images/664560-2025-2027-syllabus.pdf)，Cambridge 9700，2025–2027，Version 1
- 官方文件 SHA-256：`5e6fe634a2c2ae95bf823c742e585140e7a4495224373b5aaaccb78fe2e35db1`
- 状态：`approved`，已应用于 `a_level_biology` content version `1.1.0`
- 原规模：24 个 Topic、59 个 Concept、68 条边
- 应用结果：34 个缺口合并为 28 个审批决定；新增 25 个 Concept；定向扩充 3 个现有 Concept；33 项实践要求合并为 20 个 Skill 定义
- 当前规模：34 个 Topic、84 个 Concept、98 条边；所有 Topic 维持 2–3 个 Concept
- canonical 变化：新增 25 个 canonical concept；全库检索未发现语义范围完全相同的可复用 canonical ID，不按关键词相似强行合并
- 边界：本次只批准下列 34 项 Concept 缺口、33 项 Skill 映射、对应结构和先修边；其余生物节点、边和 syllabus 映射仍保持原审核状态。未写数据库、未执行 embeddings，也不改变 Tutor UI、API 或课程行为
- 版权边界：Cambridge 文件为 `LicenseRef-Cambridge-Copyrighted-MetadataOnly`；仓库只保存来源元数据、页码、映射和文本指纹，不保存或再发布 syllabus 正文

## 一、34 项 Concept 缺口：28 个集中审批决定

| 编号 | 官方要求 | 页 | 审核结论 | 对应处理 |
|---|---|---:|---|---|
| D1 | `9700:1.2:4`、`9700:12.1:2` | 16、32 | 两项共享“ATP 通用能量货币”知识单元 | 新增 `bio_atp_energy_currency` |
| D2 | `9700:1.2:7`、`9700:18.1:6` | 16、45 | 病毒结构与核酸分类属于同一概念边界 | 新增 `bio_virus_structure_classification` |
| D3 | `9700:2.2:3` | 17 | 通用单体—聚合物关系不能归入某一种大分子 | 新增 `bio_monomers_polymers` |
| D4 | `9700:2.3:7`、`9700:2.3:8` | 18 | 胶原层级结构和功能不可由通用蛋白质节点替代 | 新增 `bio_collagen` |
| D5 | `9700:3.2:2` | 20 | `Vmax`、`Km` 和亲和力比较构成独立酶动力学单元 | 新增 `bio_michaelis_menten` |
| D6 | `9700:4.2:3` | 21 | 表面积体积比的尺度规律与交换意义可独立测评 | 新增 `bio_surface_area_volume_ratio` |
| D7 | `9700:5.1:6` | 23 | 肿瘤是失控有丝分裂的后果，不另建疾病孤岛 | 扩充 `bio_mitosis`，旧节点仍为 `unreviewed` |
| D8 | `9700:6.1:5` | 24 | RNA/mRNA 结构不是“转录过程”的同义内容 | 新增 `bio_rna_structure` |
| D9 | `9700:8.2:2`、`9700:8.2:3` | 28 | 氯离子转移与 CO₂ 三种运输形式属于同一生理链路 | 新增 `bio_carbon_dioxide_transport` |
| D10 | `9700:10.2:1` | 30 | 青霉素靶向细菌细胞壁及抗生素对病毒无效需要明确机制 | 新增 `bio_antibiotics` |
| D11 | `9700:12.1:5`、`9700:12.1:6` | 32 | RQ 的定义与由方程计算不能拆开 | 新增 `bio_respiratory_quotient` |
| D12 | `9700:13.1:5` | 35 | 吸收光谱、作用光谱及色素贡献构成独立光合基础 | 新增 `bio_photosynthetic_pigments_spectra` |
| D13 | `9700:14.1:3` | 37 | 肝脏脱氨与尿素形成不是肾单位过程 | 新增 `bio_deamination_urea` |
| D14 | `9700:14.1:11` | 38 | 固定化酶、换能器和读数构成葡萄糖生物传感原理 | 新增 `bio_glucose_biosensors` |
| D15 | `9700:14.2:4` | 38 | ABA、Ca²⁺ 第二信使和保卫细胞关闭构成因果链 | 新增 `bio_aba_stomatal_closure` |
| D16 | `9700:15.1:10` | 39 | 神经肌肉接头、T 管和肌浆网解释兴奋—收缩耦联 | 新增 `bio_neuromuscular_activation` |
| D17 | `9700:15.1:12` | 39 | 肌节、滑动肌丝及 troponin/tropomyosin/Ca²⁺/ATP 构成独立模型 | 新增 `bio_sliding_filament_contraction` |
| D18 | `9700:15.2:3` | 40 | 赤霉素促大麦萌发属于现有植物激素响应范围 | 扩充 `bio_plant_responses`，旧节点仍为 `unreviewed` |
| D19 | `9700:16.2:5` | 41 | 卡方检验包含适用问题、期望值、自由度及显著性解释 | 新增 `bio_chi_square_test` |
| D20 | `9700:16.3:2` | 42 | 原核 lac 操纵子不能并入限定为真核调控的旧节点 | 新增 `bio_lac_operon` |
| D21 | `9700:17.1:4` | 43 | 两独立样本均值比较及显著性解释是独立统计单元 | 新增 `bio_t_test` |
| D22 | `9700:17.2:5` | 43 | 等位基因/基因型频率计算和成立条件构成完整原理 | 新增 `bio_hardy_weinberg` |
| D23 | `9700:17.2:6`、`9700:17.2:7` | 43 | 选择育种原理与官方实例必须共同教学 | 新增 `bio_selective_breeding` |
| D24 | `9700:18.2:1` | 45 | ecosystem 与 niche 是生态学基础术语，不等同于抽样 | 新增 `bio_ecosystems_niches` |
| D25 | `9700:18.2:5` | 46 | Spearman 与 Pearson 的选择、计算和解释构成相关检验单元 | 新增 `bio_correlation_tests` |
| D26 | `9700:18.3:4` | 46 | IVF、胚胎移植和代孕是现有保护方法的具体范围，不另建孤立节点 | 扩充 `bio_conservation`，旧节点仍为 `unreviewed` |
| D27 | `9700:19.1:10` | 47 | 微阵列的杂交信号和表达/基因组比较可独立测评 | 新增 `bio_microarrays` |
| D28 | `9700:19.1:11` | 47 | 序列数据库和生物信息学比较不同于微阵列表达测量 | 新增 `bio_bioinformatics_databases` |

## 二、25 个候选新 Concept

| legacy ID | canonical ID | 中文名 | 官方证据 | 建议描述边界 |
|---|---|---|---|---|
| `bio_atp_energy_currency` | `pc_bd16e15b61962db0c5d04fea198cb45c` | ATP 与细胞能量耦联 | p.16 1.2(4)；p.32 12.1(2) | ATP 的小量即时供能、可水解磷酸键、磷酸化耦联和快速再生；不重复具体呼吸路径 |
| `bio_virus_structure_classification` | `pc_a5f0cc3dc0636e18a4fef67d49bec23e` | 病毒结构与核酸分类 | p.16 1.2(7)；p.45 18.1(6) | 非细胞性、DNA/RNA 核心、蛋白衣壳、可选磷脂包膜，以及 DNA/RNA、单双链分类 |
| `bio_monomers_polymers` | `pc_fa5e5c389a8f790944f2e6049357654b` | 单体、聚合物与共价连接 | p.17 2.2(2–3) | 区分单体、聚合物和大分子，并说明较小分子通过共价键连接成聚合物；具体键型留给各大分子节点 |
| `bio_collagen` | `pc_11471626c86cc0bd6446e054bb89757f` | 胶原的层级结构与功能 | p.18 2.3(7–8) | 三条多肽形成胶原分子，分子错位排列成原纤维和纤维，以交联和抗张强度联系结构与功能 |
| `bio_michaelis_menten` | `pc_d73e8ae492113d4145d983a48c98a111` | Michaelis–Menten 动力学 | p.20 3.2(2) | 从速率—底物浓度关系求 `Vmax`、`Km`，并以较低 `Km` 表示较高底物亲和力 |
| `bio_surface_area_volume_ratio` | `pc_a311497a8ada69679cf8442da822748c` | 表面积体积比与交换 | p.21 4.2(3) | 计算三维形体的 SA:V，解释尺寸增大时比值下降及其对交换速率和多细胞结构的限制 |
| `bio_rna_structure` | `pc_7c8644ecf9e964364af575d584241cf8` | RNA 与 mRNA 结构 | p.24 6.1(5) | 核糖、磷酸、A/U/C/G 组成的单链多核苷酸，以及 mRNA 作为线性密码子模板 |
| `bio_carbon_dioxide_transport` | `pc_c9fd444d9acfb11faef011f5755c1418` | 二氧化碳运输与氯离子转移 | p.28 8.2(2–3) | CO₂ 以溶解态、碳酸氢根和氨基甲酰血红蛋白运输；红细胞内碳酸酐酶及 chloride shift |
| `bio_antibiotics` | `pc_cd2b7974451c31f7abce21cc90110697` | 抗生素的选择性作用 | p.30 10.2(1) | 青霉素抑制细菌肽聚糖细胞壁形成；病毒无细胞壁且依赖宿主过程，因此抗生素无效 |
| `bio_respiratory_quotient` | `pc_ed98208fe11f1d3e0cce7a19f5270c45` | 呼吸商 | p.32 12.1(5–6) | `RQ = CO₂ 产生量 / O₂ 摄取量`，由总反应方程计算并区分糖、脂质和蛋白质底物 |
| `bio_photosynthetic_pigments_spectra` | `pc_977c5f3889a072ba8904338b9ddf03a7` | 光合色素与光谱 | p.35 13.1(5) | 区分吸收光谱和作用光谱，解释叶绿素及辅助色素对不同波长的吸收和光合贡献 |
| `bio_deamination_urea` | `pc_836539cc28f32764f290b41af21471dc` | 脱氨与尿素形成 | p.37 14.1(3) | 过量氨基酸在肝脏脱氨，含氮部分转化为毒性较低的尿素并由肾排出 |
| `bio_glucose_biosensors` | `pc_741be376203b33aa29b3da95c147223e` | 葡萄糖试纸与生物传感器 | p.38 14.1(11) | 固定化 glucose oxidase/peroxidase 的反应、颜色或电信号换能以及血糖浓度读数 |
| `bio_aba_stomatal_closure` | `pc_e8352e234d2f8fb344dafcdbd894f99e` | ABA 与气孔关闭 | p.38 14.2(4) | 水分胁迫下 ABA 信号、Ca²⁺ 第二信使、离子外流、保卫细胞失水及气孔关闭 |
| `bio_neuromuscular_activation` | `pc_847c9f7d1469b264070cc3f7651a68b1` | 神经肌肉激活与兴奋—收缩耦联 | p.39 15.1(10) | 神经肌肉接头触发肌膜动作电位，经 T 管促使肌浆网释放 Ca²⁺ |
| `bio_sliding_filament_contraction` | `pc_494276c0931395240447f3ed14ae9315` | 肌节与滑动肌丝模型 | p.39 15.1(11–12) | 肌节和粗细肌丝结构、troponin/tropomyosin 调控、横桥循环及 ATP/Ca²⁺ 作用 |
| `bio_chi_square_test` | `pc_c19d99d4e72b2403c4a171b6d31c3c94` | 卡方检验 | p.41 16.2(5) | 比较观察值与期望值，计算 χ²、确定自由度并用临界值判断差异是否显著 |
| `bio_lac_operon` | `pc_f8f492dd44bddf661b72393796961c7c` | lac 操纵子 | p.42 16.3(1–2) | 区分结构/调控基因和诱导酶，解释无乳糖与有乳糖时 repressor、operator 和结构基因的转录控制；明确排除官方不要求的 cAMP 机制 |
| `bio_t_test` | `pc_6fa5d3f2332e87d78b3cbc7db729e4fc` | 两独立样本 t 检验 | p.43 17.1(4) | 检验两个独立样本均值差异，使用给定公式、自由度和临界值解释显著性 |
| `bio_hardy_weinberg` | `pc_f0a830e611bfffffd41f5757e75d4804` | Hardy–Weinberg 原理 | p.43 17.2(5) | 使用 `p + q = 1`、`p² + 2pq + q² = 1` 计算频率，并列明随机交配、大种群、无选择/突变/迁移等条件 |
| `bio_selective_breeding` | `pc_0bd550531981771a371395e5a07a3dbd` | 选择育种 | p.43 17.2(6–7) | 人工选择、近交和杂交的循环，以及抗病小麦/水稻、杂交玉米和高产奶牛实例 |
| `bio_ecosystems_niches` | `pc_ecfaff613c7086e0cece6014f44b68ba` | 生态系统与生态位 | p.45 18.2(1) | ecosystem 的生物群落与非生物环境交互，以及 niche 作为物种角色、资源利用与环境条件组合 |
| `bio_correlation_tests` | `pc_36accdd741466f0aec58630c1ae3ea63` | Spearman 与 Pearson 相关检验 | p.46 18.2(5) | 使用 Spearman 等级相关和 Pearson 线性相关分析两个变量的关系，并解释相关方向与强度；不把 syllabus 未明示的因果推断规则并入本批批准范围 |
| `bio_microarrays` | `pc_095528b74ad784ace982978c2ca8da1a` | DNA 微阵列 | p.47 19.1(10) | 标记核酸与探针杂交，通过信号模式比较基因组或检测 mRNA/基因表达 |
| `bio_bioinformatics_databases` | `pc_4791da912983a17b9474706ebf55d28a` | 序列数据库与生物信息学比较 | p.47 19.1(11) | 使用核苷酸、氨基酸和蛋白结构数据库进行序列比较、功能推断、进化分析及协作共享 |

## 三、3 个现有 Concept 的定向扩充

| 当前节点 | 官方证据 | 只扩充的范围 | 不整节点批准的原因 |
|---|---|---|---|
| `bio_mitosis` / `pc_e8a318724c6c8e8096b98fc763ca69c6` | p.23 5.1(6) | 加入细胞周期控制失效导致持续分裂和肿瘤形成 | 证据只覆盖新增范围，不足以替旧节点全部描述背书 |
| `bio_plant_responses` / `pc_ec9ed2577284952c142079dc7a389627` | p.40 15.2(3)；p.42 16.3(4) | 加入赤霉素参与大麦萌发，并通过促使 DELLA 抑制蛋白降解来激活转录；不在本批加入 syllabus 未明示的糊粉层/淀粉酶细节 | 不把整个植物激素和向性范围一并批准 |
| `bio_conservation` / `pc_aa24b4324d962f7ab29f0ddeb0f63405` | p.46 18.3(4) | 加入 IVF、胚胎移植和代孕对濒危哺乳动物保护的作用与限制；不加入官方未列的人工授精 | 不把全部保护政策和方法一并批准 |

## 四、33 项 Skill 映射：合并为 20 个可复用技能定义

| Skill ID | 官方要求 | 页 | 背景 Concept | 审核判断 |
|---|---|---:|---|---|
| `skill_bio_microscope_preparation_drawing_measurement` | `9700:1.1:1`、`9700:1.1:2`、`9700:1.1:4` | 15 | `bio_microscopy` | 制片、观察绘图、测微尺校准和单位换算属于一组显微实践技能 |
| `skill_bio_cell_micrograph_interpretation` | `9700:1.2:2` | 16 | `bio_organelles` | 从光镜、电镜和细胞图识别结构是图像判读，不新增 Concept |
| `skill_bio_biochemical_testing` | `9700:2.1:1`、`9700:2.1:2`、`9700:2.1:3` | 17 | `bio_tests` | 定性检验、Benedict 半定量比较和非还原糖酸水解是同一实验技能族 |
| `skill_bio_enzyme_rate_investigation` | `9700:3.1:3`、`9700:3.2:1` | 20 | `bio_enzyme_action`、`bio_enzyme_factors` | 设计速率测量并控制温度、pH、浓度和抑制剂变量 |
| `skill_bio_colorimetry` | `9700:3.1:4` | 20 | `bio_enzyme_action` | 比色计记录显色反应属于仪器测量技能 |
| `skill_bio_immobilised_enzyme_investigation` | `9700:3.2:4` | 20 | `bio_enzyme_action` | 海藻酸盐固定化、比较游离/固定化酶及评价优势属于实验应用 |
| `skill_bio_diffusion_osmosis_investigation` | `9700:4.2:2`、`9700:4.2:4`、`9700:4.2:5` | 21–22 | `bio_passive_transport`、候选 `bio_surface_area_volume_ratio` | 琼脂/透析材料、不同尺寸琼脂块和植物组织水势估计统一为膜运输实验技能 |
| `skill_bio_mitosis_stage_identification` | `9700:5.2:2` | 23 | `bio_mitosis` | 显微图中识别细胞周期和有丝分裂阶段 |
| `skill_bio_plant_transport_microscopy` | `9700:7.1:1`、`9700:7.1:3`、`9700:7.2:5` | 26 | `bio_xylem`、`bio_phloem`、`bio_transpiration` | 双子叶根茎叶切片、运输组织识别和叶横切面注释图属于同一植物解剖技能族 |
| `skill_bio_circulatory_tissue_microscopy` | `9700:8.1:3`、`9700:8.1:5` | 27 | `bio_blood_vessels`、`bio_haemoglobin`、`bio_immune_response` | 血管及红/白细胞的显微识别与绘图 |
| `skill_bio_gas_exchange_microscopy` | `9700:9.1:3`、`9700:9.1:4` | 29 | `bio_lungs` | 气体交换组织、气管和支气管切片判读与平面图 |
| `skill_bio_respirometry` | `9700:12.1:7`、`9700:12.2:14` | 32、34 | 候选 `bio_respiratory_quotient`、`bio_glycolysis`、`bio_oxidative` | 呼吸计测 RQ 或呼吸速率，包含装置、变量、单位及误差控制 |
| `skill_bio_mitochondrial_micrograph_interpretation` | `9700:12.2:9` | 33 | `bio_organelles`、`bio_oxidative` | 从图/电镜连接线粒体结构与功能 |
| `skill_bio_anaerobic_respiration_indicator` | `9700:12.2:13` | 34 | `bio_glycolysis`、`bio_anaerobic` | 用氧化还原指示剂研究酵母呼吸属于实验测量 |
| `skill_bio_chloroplast_micrograph_interpretation` | `9700:13.1:1` | 35 | `bio_organelles`、`bio_light_dependent`、`bio_calvin` | 从图/电镜连接叶绿体结构与功能 |
| `skill_bio_pigment_chromatography` | `9700:13.1:6` | 35 | 候选 `bio_photosynthetic_pigments_spectra` | 色谱分离、`Rf` 计算和参照值鉴定是实践技能 |
| `skill_bio_photosynthesis_investigation` | `9700:13.2:3`、`9700:13.2:4` | 36 | `bio_light_dependent`、`bio_limiting_factors` | DCPIP/氧化还原指示剂和水生植物变量实验属于一个技能族 |
| `skill_bio_nephron_image_interpretation` | `9700:14.1:5` | 37 | `bio_kidney` | 从图和显微图识别肾单位及相关血管结构 |
| `skill_bio_striated_muscle_image_interpretation` | `9700:15.1:11` | 39 | 候选 `bio_neuromuscular_activation`、`bio_sliding_filament_contraction` | 肌节和横纹肌超微结构图像判读，不应留下空背景映射 |
| `skill_bio_meiosis_stage_identification` | `9700:16.1:5` | 41 | `bio_meiosis` | 由图示或显微图识别减数分裂阶段 |

33 个 outcome 已全部出现一次且仅一次；其中原来没有背景候选的 `9700:12.1:7` 和 `9700:15.1:11`，分别由本提案的 RQ 和肌肉 Concept 补齐。Skill 只记录动作、输入、输出、判据和误差控制，不伪装成 Concept 节点。

## 五、Topic 重排与容量预检

| 变更后 Topic | Concept（按建议顺序） | 数量 | 结构变化 |
|---|---|---:|---|
| 显微镜、细胞器与细胞尺度 | `bio_microscopy`、`bio_organelles`、`bio_cell_size` | 3 | 移入 `bio_cell_size` |
| 原核细胞与病毒 | `bio_prokaryotes`、`bio_virus_structure_classification` | 2 | 原 Topic 改组 |
| 水、单体与碳水化合物 | `bio_water`、`bio_monomers_polymers`、`bio_carbohydrates` | 3 | 新增 1 |
| 脂质、蛋白质与胶原 | `bio_lipids`、`bio_proteins`、`bio_collagen` | 3 | 移出 `bio_tests` |
| 生化检测与酶作用 | `bio_tests`、`bio_enzyme_action` | 2 | 新 Topic 边界 |
| 酶活性、动力学与抑制 | `bio_enzyme_factors`、`bio_michaelis_menten`、`bio_enzyme_inhibition` | 3 | 新增 1 |
| 膜、被动运输与交换尺度 | `bio_membrane_structure`、`bio_passive_transport`、`bio_surface_area_volume_ratio` | 3 | 移出主动运输 |
| ATP 与主动运输 | `bio_atp_energy_currency`、`bio_active_transport` | 2 | 新 Topic |
| DNA、RNA 与复制 | `bio_dna_structure`、`bio_rna_structure`、`bio_dna_replication` | 3 | 新增 1 |
| 血红蛋白、CO₂ 运输与气体交换 | `bio_haemoglobin`、`bio_carbon_dioxide_transport`、`bio_lungs` | 3 | 新增 1 |
| 传染病与抗生素 | `bio_infectious`、`bio_antibiotics` | 2 | 原免疫 Topic 拆分 |
| 免疫应答与抗体 | `bio_immune_response`、`bio_antibodies` | 2 | 原免疫 Topic 拆分 |
| 呼吸商、糖酵解与 Krebs 循环 | `bio_respiratory_quotient`、`bio_glycolysis`、`bio_krebs` | 3 | 新增 1 |
| 光合色素与光反应 | `bio_photosynthetic_pigments_spectra`、`bio_light_dependent` | 2 | 原光合 Topic 拆分 |
| Calvin 循环与限制因素 | `bio_calvin`、`bio_limiting_factors` | 2 | 原光合 Topic 拆分 |
| 稳态、肾脏与含氮排泄 | `bio_homeostasis_principles`、`bio_kidney`、`bio_deamination_urea` | 3 | 移出血糖调节 |
| 血糖调节与生物传感 | `bio_glucose_control`、`bio_glucose_biosensors` | 2 | 新 Topic |
| 神经肌肉激活与肌肉收缩 | `bio_neuromuscular_activation`、`bio_sliding_filament_contraction` | 2 | 新 Topic |
| 激素与植物响应 | `bio_hormonal`、`bio_plant_responses`、`bio_aba_stomatal_closure` | 3 | 新增 1 |
| 减数分裂、遗传杂交与连锁 | `bio_meiosis`、`bio_genetic_crosses`、`bio_linkage` | 3 | 将连锁并入遗传分析 Topic |
| 真核与原核基因表达调控 | `bio_gene_control`、`bio_lac_operon` | 2 | 新 Topic；明确两种调控边界 |
| 生物统计推断 | `bio_chi_square_test`、`bio_t_test`、`bio_correlation_tests` | 3 | 新 Topic |
| 群体遗传与选择育种 | `bio_hardy_weinberg`、`bio_selective_breeding` | 2 | 新 Topic |
| 生态系统、生态位与分类 | `bio_ecosystems_niches`、`bio_classification` | 2 | 原生物多样性 Topic 拆分 |
| 生物多样性调查与保护 | `bio_biodiversity_sampling`、`bio_conservation` | 2 | 原生物多样性 Topic 拆分 |
| 基因组分析与生物信息学 | `bio_microarrays`、`bio_bioinformatics_databases` | 2 | 新 Topic |

未列出的 Topic 保持现有 2–3 Concept 结构。预排后全图为 34 个 Topic、84 个 Concept，没有机械的 Part 1/2 命名，也没有 1 Concept Topic。

## 六、主要先修边提案

- 细胞与分子：`bio_prokaryotes -> bio_virus_structure_classification`；`bio_monomers_polymers -> bio_carbohydrates`；`bio_monomers_polymers -> bio_proteins`；`bio_proteins -> bio_collagen`。
- 酶与交换：`bio_enzyme_action -> bio_michaelis_menten`；`bio_enzyme_factors -> bio_michaelis_menten`；`bio_cell_size -> bio_surface_area_volume_ratio`；`bio_atp_energy_currency -> bio_active_transport`。
- 核酸：`bio_rna_structure -> bio_transcription`；保留 `bio_dna_replication -> bio_transcription`。
- 运输、疾病与能量：`bio_blood_vessels -> bio_carbon_dioxide_transport`；`bio_infectious -> bio_antibiotics`；`bio_atp_energy_currency -> bio_glycolysis`。
- 光合与稳态：`bio_photosynthetic_pigments_spectra -> bio_light_dependent`；`bio_proteins -> bio_deamination_urea`；`bio_glucose_control -> bio_glucose_biosensors`；`bio_enzyme_action -> bio_glucose_biosensors`。
- 协调：`bio_hormonal -> bio_plant_responses -> bio_aba_stomatal_closure`；`bio_nervous -> bio_neuromuscular_activation`；`bio_synapses -> bio_neuromuscular_activation`；`bio_neuromuscular_activation -> bio_sliding_filament_contraction`；`bio_atp_energy_currency -> bio_sliding_filament_contraction`。
- 遗传与统计：`bio_genetic_crosses -> bio_chi_square_test`；`bio_transcription -> bio_lac_operon`；`bio_variation -> bio_t_test`；`bio_genetic_crosses -> bio_hardy_weinberg`；`bio_variation -> bio_selective_breeding`。
- 生态与技术：`bio_speciation -> bio_classification`；`bio_ecosystems_niches -> bio_biodiversity_sampling`；`bio_gene_tech -> bio_microarrays`；`bio_dna_structure -> bio_bioinformatics_databases`。

正式应用前会让完整课程顺序通过 DAG 拓扑预检；边的 `reason`、证据页码和人工状态必须与节点一起写入，不能用 syllabus 顺序冒充学理先修。

## 七、人工审批与应用结果

本包未要求逐条回复 67 次，而是由项目所有者集中批准：

- 审批人：Primoria 项目所有者（`primoria_owner`）
- 审批日期：2026-07-18
- 审批结论：D1–D28、合计 34 项 Concept 缺口，以及 33 项 Skill 映射全部批准。
- 应用结果：67 个 outcome 均为 `approved`；覆盖矩阵为 48 项候选覆盖、177 项部分覆盖、1 项歧义、0 项未解析、0 项 Concept 缺口、33 项 Skill 映射。唯一歧义项不属于本批批准范围，继续留在 pending。
- 稳定 ID：新增 25 个 canonical concept 和 25 个 legacy alias，未替换或删除任何既有 ID。
- 派生结构：重建为 34 个 Topic、45 条 Topic 边；课程作者顺序、硬先修拓扑和 2–3 Concept 粒度测试通过。

已执行稳定 ID、页码证据、2–3 Concept 粒度、全局 alias、DAG 和派生 topic graph 门禁；Web 全量测试、typecheck 和 lint 纳入本批最终验收。自动化只负责机械一致性，`approved` 由项目所有者的明确决定写入。
