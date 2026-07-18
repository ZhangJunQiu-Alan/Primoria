# A-Level 化学 38 项缺口批准记录

- 图：`a_level_chemistry`
- 来源：[`src_cambridge_9701_2025_2027`](https://www.cambridgeinternational.org/Images/664563-2025-2027-syllabus.pdf)，Cambridge 9701，2025–2027，Version 1
- 官方文件 SHA-256：`bc40af1d0789b3217524f380337d3a36e49264f5f28ab991e3e85c9102d53ad2`
- 状态：`approved`，已应用于 `a_level_chemistry` content version `1.1.0`
- 原规模：29 个 Topic、73 个 Concept、90 条边
- 应用结果：新增 10 个 Concept；扩充 12 个现有 Concept；4 项改为 Skill/资料映射；新增 2 个 Topic
- 当前规模：31 个 Topic、83 个 Concept、106 条边
- canonical 变化：新增 10 个 canonical concept；本批没有仅凭名称相似而复用跨图 canonical ID
- 边界：本次只批准下列 38 项缺口、对应结构和先修边；其余化学节点、边和 syllabus 映射仍保持原审核状态。未写数据库，未执行 embeddings，不改变 Tutor UI、API 或课程行为
- 版权边界：Cambridge 文件为 `LicenseRef-Cambridge-Copyrighted-MetadataOnly`；仓库只保存来源元数据、页码、映射和文本指纹，不保存或再发布 syllabus 正文

## 38 项处理总表

| 编号 | 官方要求 | 页 | 审核结论 | 对应处理 |
|---|---|---:|---|---|
| D1 | `9701:1.3:8`、`9701:28.1:2` | 17、44 | 两项共享一个轨道形状 Concept | 新增 `che_atomic_orbital_shapes` |
| D2 | `9701:1.3:9` | 17 | 是现有自由基内容的定义缺失 | 扩充 `che_bond_fission` |
| D3 | `9701:2.1:1`、`9701:2.1:2` | 18 | 两项组成一个相对质量 Concept | 新增 `che_relative_masses` |
| D4 | `9701:2.3:4` | 18 | 是化学式与化学计量术语，不需独立节点 | 扩充 `che_formulae` |
| D5 | `9701:3.4:3` | 20 | 现有键能 Concept 已覆盖一半范围 | 扩充 `che_bond_enthalpy` |
| D6 | `9701:4.1:1` | 22 | 是现有理想气体行为的微观解释 | 扩充 `che_gas_laws` |
| D7 | `9701:7.2:1`、`9701:7.2:2` | 24 | 名称和化学式属于受控词表识读 | 改为 Skill/资料映射，不新增 Concept |
| D8 | `9701:11.4:2` | 28 | 是第 17 族氯化学的应用范围缺失 | 扩充 `che_group17` |
| D9 | `9701:13.1:3`、`9701:13.1:4` | 31 | 官能团与有机式表示可组成一个知识单元 | 新增 `che_organic_representations` |
| D10 | `9701:13.3:3` | 32 | 是共价键的轨道重叠与杂化范围缺失 | 扩充 `che_covalent` |
| D11 | `9701:14.1:4` | 33 | 裂化属于烷烃反应范围 | 扩充 `che_alkanes` |
| D12 | `9701:15.1:2` | 34 | 一级、二级、三级分类服务于 SN1/SN2 | 扩充 `che_nucleophilic_sub` |
| D13 | `9701:16.1:4`、`9701:17.1:6` | 35、36 | 两项是同一个碘仿结构判据与检验 | 新增 `che_iodoform_test` |
| D14 | `9701:16.1:5` | 35 | 是现有醇反应 Concept 的酸性范围缺失 | 扩充 `che_alcohol_reactions` |
| D15 | `9701:19.2:3` | 37 | 腈的生成、羟基腈与水解应形成完整单元 | 新增 `che_nitriles` |
| D16 | `9701:21.1:2`、`9701:36.1:2` | 38、53 | 设计多步路线是综合操作技能，不是新的物质或原理 | 改为 Skill 映射，不新增 Concept |
| D17 | `9701:24.2:10` | 41 | 是 Gibbs 自由能与电池电势的连接关系 | 扩充 `che_gibbs`，映射 `che_cells` |
| D18 | `9701:25.2:1`、`9701:25.2:2`、`9701:25.2:3` | 42 | 定义、计算和极性解释组成一个 Concept | 新增 `che_partition_coefficient` |
| D19 | `9701:32.2:1`、`9701:32.2:2`、`9701:32.2:3`、`9701:32.2:4`、`9701:32.2:6`、`9701:32.2:7` | 50 | 六项合并为两个可教学的苯酚 Concept | 新增 `che_phenol_acid_base`、`che_phenol_ring_reactivity` |
| D20 | `9701:33.3:3` | 51 | 酰氯节点已有物质与反应范围，只缺机理 | 扩充 `che_esters` |
| D21 | `9701:34.2:2`、`9701:34.2:4`，并参与 `9701:32.2:1` | 50、52 | 重氮化、重氮盐水解和偶氮偶联为一个反应链 | 新增 `che_diazonium_azo` |
| D22 | `9701:34.3:2`、`9701:34.3:3` | 52 | 酰胺水解和弱碱性属于同一酰胺 Concept | 新增 `che_amides` |
| D23 | `9701:35.3:2` | 53 | 光降解是现有聚合物环境范围的补充 | 扩充 `che_addition_polymer` |

## 逐项审批

### D1 原子轨道形状

- 官方证据：PDF 第 17 页 `1.3 outcome 8`；第 44 页 `28.1 outcome 2`
- legacy ID：`che_atomic_orbital_shapes`
- 候选 canonical ID：`pc_c68d18c005adce683dffeb83cd4cb895`
- 中文名：原子轨道形状
- 建议描述：描述并绘制球形 s 轨道、具有方向性的 p 轨道，以及 syllabus 指定的 `3dxy` 和 `3dz²` 轨道；轨道图只表达电子出现概率分布的形状与方向，不把轨道画成电子运行路径。
- Topic：加入 `che_atomic_che_electron_config`，与电子排布和电离能组成 3 个 Concept。
- 建议先修边：`che_electron_config -> che_atomic_orbital_shapes`，`hard`。
- 审核判断：s/p 与指定 d 轨道都是同一“轨道形状”概念；不应按轨道类型拆成多个节点。

### D2 自由基定义

- 官方证据：PDF 第 17 页，`1.3 outcome 9`
- 当前节点：`che_bond_fission` / `pc_f04539036aca6084074f399276e5f01d`
- 建议扩充：明确自由基是含一个或多个未成对电子的物种，并保留均裂产生自由基、异裂产生离子的关系。
- 审核判断：自由基已在节点名称、描述和后续机理中出现；这里只是定义不完整，新增节点会重复。

### D3 相对原子、分子与式量

- 官方证据：PDF 第 18 页，`2.1 outcomes 1–2`
- legacy ID：`che_relative_masses`
- 候选 canonical ID：`pc_7dba846520d7d616e9cf39e1d16905b3`
- 中文名：相对原子、分子与式量
- 建议描述：把统一原子质量单位定义为一个碳-12 原子质量的十二分之一，并区分相对同位素质量、相对原子质量、相对分子质量和相对式量；这些相对量均以该基准比较且无量纲。
- Topic：加入 `che_stoichiometry`，顺序调整为相对质量、摩尔与阿伏伽德罗常数、实验式与分子式。
- 建议先修边：`che_relative_masses -> che_mole`，`hard`。
- 审核判断：四个相对质量术语共享同一基准和比较逻辑，合并为一个 Concept 比逐术语建节点更稳定。

### D4 无水盐、水合盐与结晶水

- 官方证据：PDF 第 18 页，`2.3 outcome 4`
- 当前节点：`che_formulae` / `pc_f143886b125448b751d8adcc1cc7aaa9`
- 建议扩充：加入 anhydrous、hydrated 和 water of crystallisation 的定义以及水合盐化学式表示；不把“结晶水”单独建成概念。
- 审核判断：这是化学式表示和化学计量计算使用的术语集合，独立节点没有额外先修关系。

### D5 键能、键长与反应性

- 官方证据：PDF 第 20 页，`3.4 outcome 3`
- 当前节点：`che_bond_enthalpy` / `pc_b35d6548b40342a4e7e95af4650c7349`
- 建议扩充并改名为“键能与键长”：保留气相中断裂一摩尔特定共价键的能量定义，加入键长的核间距定义，并用较短、较强的键通常更难断裂来比较共价分子反应性。
- 审核判断：当前节点已准确覆盖 bond energy；新建一个“Bond Length”节点会把官方同一 outcome 拆得过细。

### D6 气体压强的微观解释

- 官方证据：PDF 第 22 页，`4.1 outcomes 1–3`
- 当前节点：`che_gas_laws` / `pc_18388a54522ee3202a5121faa939f897`
- 建议扩充：气体分子与容器壁碰撞并交换动量产生压强；理想气体假设粒子体积可忽略且分子间无吸引力，再连接到 `pV=nRT`。
- 审核判断：化学图已有“理想气体行为”节点。复用物理图“气体动理论” canonical ID 会把两个已有、范围不同的稳定概念强行合并，因此本批不复用。

### D7 常见酸碱名称与化学式

- 官方证据：PDF 第 24 页，`7.2 outcomes 1–2`
- 建议 Skill ID：`skill_che_common_acid_base_formula_literacy`
- 建议资料 ID：`ref_cambridge_9701_common_acids_alkalis`
- 背景 Concept：`che_bronsted`、`che_strong_weak`
- 建议处理：两个 outcome 均改为 `concept_and_skill` / `skill_mapping_required`；资料只保存名称、化学式、类别和 syllabus 页码，不复制官方页面。
- 审核判断：记住限定清单并在名称与化学式之间转换是受控词表识读，不是新的酸碱原理。

### D8 氯用于净水

- 官方证据：PDF 第 28 页，`11.4 outcome 2`
- 当前节点：`che_group17` / `pc_89785b3e05b48942229592971697422a`
- 建议扩充：氯与水建立平衡并生成 `HOCl` 和 `ClO−`，二者作为活性含氯物种杀灭细菌；保留反应方程和氧化数语境。
- 审核判断：这是第 17 族氯化学的明确应用，不需要“Water Purification”专用概念。

### D9 官能团与有机式表示

- 官方证据：PDF 第 31 页，`13.1 outcomes 3–4`
- legacy ID：`che_organic_representations`
- 候选 canonical ID：`pc_b7cf8d670e2f37db41a760a401141534`
- 中文名：官能团与有机结构表示
- 建议描述：官能团决定有机物的特征物理、化学性质和反应；在通式、结构式、显示式和骨架式之间识别并转换同一有机结构。
- Topic：加入 `che_organic_basics`，顺序为有机结构表示、命名法、同分异构。
- 建议先修边：`che_organic_representations -> che_nomenclature`，`hard`；保留 `che_nomenclature -> che_isomerism`。
- 审核判断：官能团和表示法共同回答“结构如何被表达并决定分类”，合并后仍保持可独立教学和测评。

### D10 σ/π 键与杂化

- 官方证据：PDF 第 20 页 `3.4 outcome 2`；第 32 页 `13.3 outcomes 2–3`
- 当前节点：`che_covalent` / `pc_76c78ee2b35eca2b943816eb56dbac2a`
- 建议扩充：直接重叠形成 σ 键、相邻 p 轨道侧向重叠形成 π 键；用 `sp`、`sp²`、`sp³` 杂化解释分子形状、键角和 σ/π 排列。
- 审核判断：这些内容是共价键的轨道模型，不应另建一个只覆盖单条有机 outcome 的“Hybridisation”孤立节点。

### D11 裂化

- 官方证据：PDF 第 33 页，`14.1 outcomes 1、4`
- 当前节点：`che_alkanes` / `pc_25af0b0d2ddbcd075e92f8f6d504dc1a`
- 建议扩充：重质原油馏分中的长链烷烃在加热和氧化铝催化下裂化，生成较低相对分子质量的烷烃和烯烃，从而得到更有用的燃料和化工原料。
- 审核判断：裂化是 syllabus 明列的烷烃反应和制备路线，扩充现有烷烃 Concept 即可。

### D12 卤代烷分类

- 官方证据：PDF 第 34 页，`15.1 outcomes 2、5–6`
- 当前节点：`che_nucleophilic_sub` / `pc_0d3043e5274fde266129817ca29a57f7`
- 建议扩充：按连接卤素的碳所连烷基数区分一级、二级和三级卤代烷，并用该结构分类解释 SN2、SN1 或混合机理倾向。
- 审核判断：分类的教学目的就是预测亲核取代机理，单独建“Halogenoalkane Classification”会割裂因果关系。

### D13 碘仿检验

- 官方证据：PDF 第 35 页 `16.1 outcome 4`；第 36 页 `17.1 outcome 6`
- legacy ID：`che_iodoform_test`
- 候选 canonical ID：`pc_e98424171f151c698ea7358b432dc4e2`
- 中文名：碘仿检验
- 建议描述：含 `CH3CH(OH)–` 的醇以及含 `CH3CO–` 的醛或酮与碱性碘反应，生成黄色碘仿沉淀 `CHI3` 和相应羧酸根；由结构或现象判断阳性结果。
- Topic：加入 `che_halogenoalkanes_alcohols_che_alcohol_reactions`，作为醇反应和醇氧化之后的第 3 个 Concept。
- 建议先修边：`che_alcohol_oxidation -> che_iodoform_test`，`hard`；`che_aldehydes_ketones -> che_iodoform_test` 不设硬边，避免其较晚 Topic 反向破坏课程拓扑序。
- 审核判断：两个 outcome 使用完全相同的结构判据和实验现象，应共享一个 Concept。

### D14 醇与水的相对酸性

- 官方证据：PDF 第 35 页，`16.1 outcome 5`
- 当前节点：`che_alcohol_reactions` / `pc_42ea5b997cbab553b5f29d052a9d06aa`
- 建议扩充：比较醇和水的酸性，并从烷基给电子效应及共轭碱稳定性解释醇通常比水更弱酸。
- 审核判断：这是醇的反应性质之一；高级苯酚比较由 D19 单独承接。

### D15 腈与羟基腈

- 官方证据：PDF 第 37 页，`19.2 outcomes 1–3`
- legacy ID：`che_nitriles`
- 候选 canonical ID：`pc_823cebac5cc9eb243690a3fd84a6fda0`
- 中文名：腈与羟基腈
- 建议描述：卤代烷与乙醇中 `KCN` 反应生成腈；羰基化合物与 `HCN/KCN` 生成羟基腈；腈经稀酸或稀碱加热水解，并在碱性水解后酸化得到羧酸。
- Topic：与 D22 的酰胺共同组成新 Topic `che_nitriles_amides`（“腈与酰胺”）。
- 建议先修边：`che_nucleophilic_sub -> che_nitriles`，`hard`；`che_aldehydes_ketones -> che_nitriles`，`hard`。
- 审核判断：只给羧酸节点补一句“腈水解”会继续遗漏腈和羟基腈的形成，完整新节点更可靠。

### D16 多步有机合成路线设计

- 官方证据：PDF 第 38 页 `21.1 outcomes 1–3`；第 53 页 `36.1 outcomes 1–3`
- 建议 Skill ID：`skill_che_multistep_synthesis_planning`
- 背景 Concept：`che_organic_representations`、`che_mechanism_types` 以及所有具体官能团反应 Concept
- 建议处理：`9701:21.1:2`、`9701:36.1:2` 改为 `concept_and_skill` / `skill_mapping_required`；Skill 记录起始物/目标物分析、逆向选择官能团转化、试剂与条件、步骤顺序及副产物检查。
- 审核判断：官方动词是 devise。正确与否取决于一系列选择和步骤，应该作为综合能力测评；新建“Organic Synthesis” Concept 不能保证学生会设计路线。

### D17 Gibbs 自由能与电池电势

- 官方证据：PDF 第 41 页，`24.2 outcome 10`
- 当前节点：`che_gibbs`、`che_cells`
- 建议扩充：在 `che_gibbs` 中加入 `ΔG° = -nFE°cell`，说明电子转移数、Faraday 常数、电池电势与反应热力学可行性的联系；coverage 同时映射两个现有节点。
- 建议先修边：保留 `che_electrode_potential -> che_cells`，新增 `che_cells -> che_gibbs` 为 `soft`，避免把电化学误当作理解 Gibbs 定义的硬前提。
- 审核判断：一个连接方程不具备独立 Topic 粒度，扩充现有两个概念的交叉范围更准确。

### D18 分配系数

- 官方证据：PDF 第 42 页，`25.2 outcomes 1–3`
- legacy ID：`che_partition_coefficient`
- 候选 canonical ID：`pc_a57bbd08c3a0bfb6af4a73b3266e3be6`
- 中文名：分配系数
- 建议描述：分配系数是在平衡时同一物理状态溶质在两种不互溶溶剂中的浓度比；能按约定方向计算并用溶质与溶剂极性解释数值大小。
- Topic：加入 `che_acids_che_buffers` 并改名为“缓冲、溶度积与分配平衡”，形成 3 个 Concept。
- 建议先修边：`che_dynamic_eq -> che_partition_coefficient`，`hard`；`che_imf -> che_partition_coefficient`，`hard`。
- 审核判断：定义、计算和极性解释是同一平衡分配模型的三个方面，不应拆分。

### D19 苯酚的酸碱与芳环反应

- 官方证据：PDF 第 50 页，`32.2 outcomes 1–7`
- 建议新建两个 Concept：

| legacy ID | canonical ID | 中文名 | 覆盖范围 |
|---|---|---|---|
| `che_phenol_acid_base` | `pc_306df7f024993644203ea5a1f13ff904` | 苯酚的制备与酸碱性质 | 重氮盐水解制苯酚；与 NaOH/Na 的反应；苯氧负离子共振稳定；比较水、苯酚和乙醇酸性 |
| `che_phenol_ring_reactivity` | `pc_1a0fc6f9c22a749712e97711b0fdd625` | 苯酚芳环反应与定位效应 | 羟基活化芳环；温和硝化/溴化；2、4、6 位定位；把规律迁移到萘酚等酚类 |

- Topic：与 D21 的 `che_diazonium_azo` 共同组成新 Topic `che_phenols_diazonium`（“苯酚、重氮盐与偶氮化合物”），共 3 个 Concept。
- 建议先修边：`che_alcohol_reactions -> che_phenol_acid_base`，`soft`；`che_benzene -> che_phenol_ring_reactivity`，`hard`；`che_electrophilic_sub -> che_phenol_ring_reactivity`，`hard`。
- 审核判断：把全部苯酚内容塞入一个节点会同时混合酸碱平衡和芳环取代两种不同因果模型；拆成两个恰好对应可独立测评的单元。

### D20 酰氯的加成-消去机理

- 官方证据：PDF 第 51 页，`33.3 outcomes 2–3`
- 当前节点：`che_esters` / `pc_c9da2c88a8c94e76a31e705076b2a010`
- 建议扩充：在“Esters and Acyl Chlorides”中加入酰氯与水、醇、苯酚、氨和胺反应的加成-消去机理，包括亲核进攻、四面体中间体、氯离去和质子转移。
- 审核判断：节点已明确包含酰氯和酰化反应，只缺机理深度；不应复制一个同义酰氯节点。

### D21 重氮盐与偶氮化合物

- 官方证据：PDF 第 50 页 `32.2 outcome 1`；第 52 页 `34.2 outcomes 2、4`
- legacy ID：`che_diazonium_azo`
- 候选 canonical ID：`pc_c5af15dfcdc42e1427ccb6272309fbb1`
- 中文名：重氮盐与偶氮化合物
- 建议描述：苯胺在低于 10°C 与亚硝酸/亚硝酸钠和稀酸反应形成重氮盐；重氮盐温热水解生成苯酚，或在碱性条件下与苯酚偶联形成含 `–N=N–` 的偶氮化合物和染料。
- Topic：见 D19。
- 建议先修边：`che_amines -> che_diazonium_azo`，`hard`；`che_phenol_ring_reactivity -> che_diazonium_azo`，`soft`。
- 审核判断：重氮化、水解和偶氮偶联是同一中间体驱动的反应网络，合并后语义完整且不过细。

### D22 酰胺

- 官方证据：PDF 第 52 页，`34.3 outcomes 1–3`
- legacy ID：`che_amides`
- 候选 canonical ID：`pc_54969456882eab85ca38b2957992a4aa`
- 中文名：酰胺
- 建议描述：酰氯与氨或一级胺生成酰胺；酰胺在水溶酸或碱中水解并可被 `LiAlH4` 还原；氮孤对电子与羰基离域使酰胺远弱于胺碱性。
- Topic：与 D15 组成 `che_nitriles_amides`。
- 建议先修边：`che_esters -> che_amides`，`hard`（现节点包含酰氯）；`che_amines -> che_amides`，`hard`。
- 审核判断：水解、还原与弱碱性都由酰胺官能团结构决定，合为一个 Concept。

### D23 聚合物光降解

- 官方证据：PDF 第 53 页，`35.3 outcomes 1–3`
- 当前节点：`che_addition_polymer` / `pc_cd9220ccd4a94d9511b50e51680a585c`
- 建议扩充：聚烯烃碳链化学惰性导致难生物降解；某些聚合物可加入光敏结构或添加剂，在光照下发生链断裂并加速碎化，同时不把“碎化”错误等同于完全生物降解。
- 审核判断：这是当前节点已包含的聚合物处置与环境问题范围，不新增单独光降解节点。

## Topic 结构变化

| Topic | 变更后 Concept | 数量 | 结构影响 |
|---|---|---:|---|
| `che_atomic_che_electron_config` | 电子排布；原子轨道形状；电离能 | 3 | 新增 1 个 Concept 并调整顺序 |
| `che_stoichiometry` | 相对质量；摩尔与阿伏伽德罗常数；实验式与分子式 | 3 | 新增 1 个 Concept |
| `che_acids_che_buffers` | 缓冲剂；溶度积；分配系数 | 3 | 新增 1 个 Concept 并改名 |
| `che_organic_basics` | 官能团与有机结构表示；命名法；同分异构 | 3 | 新增 1 个 Concept |
| `che_halogenoalkanes_alcohols_che_alcohol_reactions` | 醇的反应；醇的氧化；碘仿检验 | 3 | 新增 1 个 Concept |
| `che_nitriles_amides` | 腈与羟基腈；酰胺 | 2 | 新 Topic |
| `che_phenols_diazonium` | 苯酚的制备与酸碱性质；苯酚芳环反应；重氮盐与偶氮化合物 | 3 | 新 Topic |

两个新 Topic 已插入有机部分并重新计算后续 `default_order`；全部新旧边已通过课程顺序和 DAG 拓扑检查。

## 不新增 Concept 的理由

- 常见酸、碱名称和化学式：受控词表识读，存为 Skill/参考资料。
- 多步合成路线：综合规划和操作技能，正确性来自已有官能团反应知识的组合使用。
- 自由基定义、结晶水、键长、气体碰撞压强、氯净水、裂化、卤代烷分类、醇相对酸性、`ΔG°=-nFE°cell`、酰氯机理和聚合物光降解：均属于现有 Concept 的必要内部范围。
- `che_gas_laws` 不与物理 `phy_kinetic_theory` 自动合并：前者是化学课程中的理想气体行为和状态方程，后者是更广的微观气体动理论；名称相关但边界不同。
- 苯酚内容不压成一个节点：酸碱/共轭碱稳定与芳环活化/定位使用不同解释模型，保留两个 Concept 才能独立诊断。

## 已应用范围

1. 已写入 10 个化学图节点并创建 10 个 canonical registry 记录，未替换任何现有 legacy ID。
2. 已扩充 12 个现有 Concept 的描述和页码级证据；这些旧节点仍保持 `unreviewed`，未因局部扩充而整节点越权批准。
3. 已把 4 项伪 Concept 缺口改为两个 Skill/资料映射，未写入正式 Concept 节点。
4. 已新增 2 个 Topic，调整 5 个现有 Topic 的内容和顺序，并只应用经批准且通过拓扑检查的先修边。
5. 已将 38 项 coverage 更新为 Concept 覆盖或技能映射；当前覆盖矩阵为 65 项候选覆盖、277 项部分覆盖、1 项歧义、3 项未解析、0 项 Concept 缺口、5 项 Skill 映射。歧义和未解析项不属于本次获批的 38 项，继续留在 pending。
6. 已提升 `content_version` 并重建派生 topic graph；以下 10 个新增 Concept 以及 12 个描述扩充节点必须在单独授权的发布步骤重建 embeddings。本阶段仍未写数据库、未执行 embeddings。
7. 中央 Schema、全量 KG 校验和派生图重建已通过；Web 单元测试、typecheck 和 lint 见本批最终验收记录。

## 人工审批

- 审批人：Primoria 项目所有者（`primoria_owner`）
- 审批日期：2026-07-18
- 审批结论：D1–D23、合计 38 项全部批准。
