# 新加坡 H2 化学 KG 缺口实施与代理人工复核（中文）

- 复核日期：2026-07-19
- 官方要求：201 项（193 项概念或知识技能、8 项实践）
- 完整概念覆盖：193 项
- 实践分流：8 项
- 新图：18 个 Concept，7 个 Topic，5 条待审先修边
- 入口概念：13 个；没有用 syllabus 章节顺序伪造先修关系。
- 审核状态：代理复核只给出可保留建议，全部保持 `needs_review`。

## 代理人工复核结论

- 194 项内容成果按 23 个官方 topic/subtopic 的字母编号逐项复算；加 7 项跨主题实践后总数 201。
- 21 个缺口并非一条 outcome 一个节点：Arrhenius/Lewis、滴定曲线、标准态限制等重复成果共享节点，最终归并为 18 个诊断概念。
- 没有把经典 Brønsted 概念冒充 Arrhenius/Lewis，也没有把一般气体定律冒充 Dalton 分压。
- 有机电子/位阻效应与 SN1/SN2 立体结果单独登记，避免用宽泛 reaction-mechanism 节点掩盖可测差异。
- 环境内容保留污染物、卤代烃和聚合物三类不同因果链；没有把价值判断写进概念定义。
- 每个新概念至少含一条 SEAB 页码级证据和一条 OpenStax 章节级学科证据。
- 12 类官方排除边界保持不变；尤其不扩展到波函数、积分速率式、E/Z 命名或配体场强弱序列。

## 概念逐项复核

### 理想气体混合物与分压

- 节点：`sg_h2_chemistry_ideal_gas_mixture_partial_pressures` / `pc_7d39e3cc0d5dad70557185c466c60fdd`
- 解析缺口：`gap_sg_h2_chemistry_9476_2026_o_3_d`
- 概念边界：Applying Dalton's law and mole fractions to determine component and total pressures in non-reacting ideal-gas mixtures, including gases collected over water.
- 证据：PDF p.15, topic 3 The Gaseous State, outcome (d)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Chemistry 2e §9.3, Stoichiometry of Gaseous Substances, Mixtures, and Reactions（`src_openstax_chemistry_2e_2019`）
- 复核建议：可保留；未发现范围、深度和诊断粒度均等价的既有 canonical；仍需项目所有者最终批准。

### Arrhenius 与 Lewis 酸碱模型

- 节点：`sg_h2_chemistry_acid_base_models_arrhenius_lewis` / `pc_e349920621ebd3ae42cabdebf4f12b67`
- 解析缺口：`gap_sg_h2_chemistry_9476_2026_o_4_a`、`gap_sg_h2_chemistry_9476_2026_o_4_c`
- 概念边界：Selecting the Arrhenius or Lewis acid-base model for the stated chemical system and using electron-pair donation and acceptance to represent non-aqueous adduct formation.
- 证据：PDF p.15, topic 4 Theories of Acids and Bases, outcome (a)（`src_sg_seab_h2_chemistry_9476_2026`）；PDF p.16, topic 4 Theories of Acids and Bases, outcome (c)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Chemistry 2e §14.1, Brønsted-Lowry Acids and Bases, historical Arrhenius model; §15.2, Lewis Acids and Bases（`src_openstax_chemistry_2e_2019`）
- 复核建议：可保留；未发现范围、深度和诊断粒度均等价的既有 canonical；仍需项目所有者最终批准。

### 离子电荷、半径与晶格能

- 节点：`sg_h2_chemistry_lattice_energy_ionic_factors` / `pc_57a133d096ce11555111fb8bc61b0ffb`
- 解析缺口：`gap_sg_h2_chemistry_9476_2026_o_7_e`
- 概念边界：Reasoning qualitatively about how ionic charge magnitude and ionic radius change electrostatic attraction and hence the magnitude of lattice energy, without introducing a full crystallographic model.
- 证据：PDF p.19, topic 7 Chemical Energetics, outcome (e)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Chemistry 2e §7.1, Ionic Bonding, lattice energy and ionic charge-distance effects（`src_openstax_chemistry_2e_2019`）
- 复核建议：可保留；未发现范围、深度和诊断粒度均等价的既有 canonical；仍需项目所有者最终批准。

### 标准态自发性预测的适用边界

- 节点：`sg_h2_chemistry_standard_state_prediction_limits` / `pc_07b55d0cfd5599dbd5c011cf702082bf`
- 解析缺口：`gap_sg_h2_chemistry_9476_2026_o_7_l`、`gap_sg_h2_chemistry_9476_2026_o_12_g`
- 概念边界：Distinguishing standard-state ΔG° or E° predictions from actual nonstandard conditions and explaining why kinetics, composition and reaction quotient can limit a simple spontaneity claim.
- 证据：PDF p.19, topic 7 Chemical Energetics, outcome (l)（`src_sg_seab_h2_chemistry_9476_2026`）；PDF p.33, topic 12 Electrochemistry, outcome (g)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Chemistry 2e §16.4, Free Energy; §17.4, Potential, Free Energy, and Equilibrium（`src_openstax_chemistry_2e_2019`）
- 复核建议：可保留；未发现范围、深度和诊断粒度均等价的既有 canonical；仍需项目所有者最终批准。

### 酶催化的专一性与条件敏感性

- 节点：`sg_h2_chemistry_enzyme_catalysis_specificity_conditions` / `pc_87c55b2fc3a957385772212c65ab3929`
- 解析缺口：`gap_sg_h2_chemistry_9476_2026_o_8_k`
- 概念边界：Using an active-site lock-and-key model to explain substrate and reaction specificity and reasoning qualitatively about temperature and pH sensitivity without requiring protein-structure levels or detailed denaturation pathways.
- 证据：PDF p.21, topic 8 Reaction Kinetics, outcome (k)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Chemistry 2e §12.7, Catalysis, Enzyme Structure and Function（`src_openstax_chemistry_2e_2019`）
- 复核建议：可保留；未发现范围、深度和诊断粒度均等价的既有 canonical；仍需项目所有者最终批准。

### 碱解离与水的离子积

- 节点：`sg_h2_chemistry_base_dissociation_water_ionic_product` / `pc_25a151cded112622c6511c38293ea36f`
- 解析缺口：`gap_sg_h2_chemistry_9476_2026_o_10_1_b`
- 概念边界：Relating Kb and pKb to base strength, using Kw to connect hydronium and hydroxide concentrations and applying KaKb=Kw to conjugate acid-base pairs.
- 证据：PDF p.22, topic 10_1 Acid-Base Equilibria, outcome (b)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Chemistry 2e §§14.1-14.3, Brønsted-Lowry Acids and Bases; pH and pOH; Relative Strengths of Acids and Bases（`src_openstax_chemistry_2e_2019`）
- 复核建议：可保留；未发现范围、深度和诊断粒度均等价的既有 canonical；仍需项目所有者最终批准。

### 酸碱滴定曲线与指示剂选择

- 节点：`sg_h2_chemistry_titration_curves_indicator_selection` / `pc_8d1c44cf2a5bd1f8942eddce18c0704b`
- 解析缺口：`gap_sg_h2_chemistry_9476_2026_o_10_1_d`、`gap_sg_h2_chemistry_9476_2026_o_10_1_e`
- 概念边界：Explaining the characteristic pH regions of strong and weak acid-base titrations and selecting an indicator whose transition interval lies within the steep equivalence-region change.
- 证据：PDF p.22, topic 10_1 Acid-Base Equilibria, outcome (d)（`src_sg_seab_h2_chemistry_9476_2026`）；PDF p.22, topic 10_1 Acid-Base Equilibria, outcome (e)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Chemistry 2e §14.7, Acid-Base Titrations（`src_openstax_chemistry_2e_2019`）
- 复核建议：可保留；未发现范围、深度和诊断粒度均等价的既有 canonical；仍需项目所有者最终批准。

### 海洋碳酸盐缓冲与酸化

- 节点：`sg_h2_chemistry_ocean_carbonate_buffer_acidification` / `pc_9b34bdf046e84b83e6eb72fb0ba9718b`
- 解析缺口：`gap_sg_h2_chemistry_9476_2026_o_10_1_f`
- 概念边界：Applying carbonate-bicarbonate acid-base equilibria to ocean buffering and explaining how added atmospheric carbon dioxide shifts coupled equilibria toward higher acidity.
- 证据：PDF p.22, topic 10_1 Acid-Base Equilibria, outcome (f)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Chemistry 2e §14.6, Buffers; §15.3, Coupled Equilibria, ocean acidification（`src_openstax_chemistry_2e_2019`）
- 复核建议：可保留；未发现范围、深度和诊断粒度均等价的既有 canonical；仍需项目所有者最终批准。

### 配离子形成对溶解度的调控

- 节点：`sg_h2_chemistry_complex_ion_solubility_control` / `pc_67e0b7f2de055a585de0d8a32c508d20`
- 解析缺口：`gap_sg_h2_chemistry_9476_2026_o_10_2_c`
- 概念边界：Explaining how complex-ion formation couples to a dissolution equilibrium and can increase ionic-salt solubility, alongside but distinct from the common-ion effect.
- 证据：PDF p.23, topic 10_2 Solubility Equilibria, outcome (c)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Chemistry 2e §§15.2-15.3, Lewis Acids and Bases; Coupled Equilibria（`src_openstax_chemistry_2e_2019`）
- 复核建议：可保留；未发现范围、深度和诊断粒度均等价的既有 canonical；仍需项目所有者最终批准。

### 有机反应性中的电子效应与位阻效应

- 节点：`sg_h2_chemistry_organic_electronic_steric_effects` / `pc_0cc9920d6c67e98c3dd9404cd91f8510`
- 解析缺口：`gap_sg_h2_chemistry_9476_2026_o_11_3_b`
- 概念边界：Using delocalisation, electron-donating or withdrawing effects and steric hindrance to compare organic reactant, intermediate and transition-state reactivity without replacing an explicit mechanism.
- 证据：PDF p.26, topic 11_3 Organic Reactions and Mechanisms, outcome (b)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Organic Chemistry §§6.2, 7.9 and 11.3, mechanisms, electronic effects and steric effects in substitution（`src_openstax_organic_chemistry_2023`）
- 复核建议：可保留；未发现范围、深度和诊断粒度均等价的既有 canonical；仍需项目所有者最终批准。

### SN1 与 SN2 取代的立体化学结果

- 节点：`sg_h2_chemistry_nucleophilic_substitution_stereochemistry` / `pc_146233f82cd4fdbdf0addf3541ab2779`
- 解析缺口：`gap_sg_h2_chemistry_9476_2026_o_11_5_b`
- 概念边界：Relating backside attack in SN2 to inversion of configuration and planar carbocation attack in SN1 to racemisation at an initially optically active reaction centre.
- 证据：PDF p.29, topic 11_5 Halogen Derivatives, outcome (b)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Organic Chemistry §§11.2 and 11.4, The SN2 Reaction; The SN1 Reaction（`src_openstax_organic_chemistry_2023`）
- 复核建议：可保留；未发现范围、深度和诊断粒度均等价的既有 canonical；仍需项目所有者最终批准。

### 燃烧污染物与温室效应影响

- 节点：`sg_h2_chemistry_combustion_pollutants_greenhouse` / `pc_bd4d1bfb66e3b10472e49fdc81a72eef`
- 解析缺口：`gap_sg_h2_chemistry_9476_2026_o_11_4_h`
- 概念边界：Connecting carbon monoxide, nitrogen oxides and unburnt hydrocarbons from internal-combustion engines to health or atmospheric impacts, and distinguishing these from gases that enhance the greenhouse effect.
- 证据：PDF p.29, topic 11_4 Hydrocarbons, outcome (h)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Chemistry 2e §§12.7 and 18.9, catalytic converters; atmospheric oxygen compounds and combustion impacts（`src_openstax_chemistry_2e_2019`）
- 复核建议：可保留；未发现范围、深度和诊断粒度均等价的既有 canonical；仍需项目所有者最终批准。

### CFC、HCFC 与 HFC 的环境影响

- 节点：`sg_h2_chemistry_halocarbon_environmental_impacts` / `pc_3fac0ca9aef16809a14f9562a720c6f1`
- 解析缺口：`gap_sg_h2_chemistry_9476_2026_o_11_5_e`
- 概念边界：Comparing the chemical persistence and ozone or climate impacts of CFCs and proposed HCFC/HFC replacements while respecting the syllabus exclusion of detailed ozone-depletion mechanisms.
- 证据：PDF p.29, topic 11_5 Halogen Derivatives, outcome (e)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Chemistry 2e §18.8, Occurrence, Preparation, and Properties of the Halogens, halocarbon environmental context（`src_openstax_chemistry_2e_2019`）
- 复核建议：可保留；未发现范围、深度和诊断粒度均等价的既有 canonical；仍需项目所有者最终批准。

### 聚合物回收与可持续性权衡

- 节点：`sg_h2_chemistry_polymer_recycling_sustainability` / `pc_96b9e7054c566e5de380ab0cd98a508b`
- 解析缺口：`gap_sg_h2_chemistry_9476_2026_o_11_10_g`
- 概念边界：Evaluating polymer recycling as a finite-resource decision across material properties, process feasibility and economic, environmental and social consequences rather than assuming all plastics share one recycling route.
- 证据：PDF p.33, topic 11_10 Polymers, outcome (g)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Organic Chemistry Chapter 31, Synthetic Polymers; Chapter 11 Chemistry Matters—Green Chemistry（`src_openstax_organic_chemistry_2023`）
- 复核建议：可保留；未发现范围、深度和诊断粒度均等价的既有 canonical；仍需项目所有者最终批准。

### 浓度变化下的电极电势趋势

- 节点：`sg_h2_chemistry_electrode_potential_concentration_trends` / `pc_8464330d881b25624fdd2e71b0ffb90e`
- 解析缺口：`gap_sg_h2_chemistry_9476_2026_o_12_j`
- 概念边界：Predicting qualitatively how changing the concentration of an aqueous redox species shifts electrode potential, while distinguishing this nonstandard trend from a tabulated standard potential.
- 证据：PDF p.33, topic 12 Electrochemistry, outcome (j)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Chemistry 2e §17.4, Potential, Free Energy, and Equilibrium, nonstandard conditions and the Nernst equation（`src_openstax_chemistry_2e_2019`）
- 复核建议：可保留；未发现范围、深度和诊断粒度均等价的既有 canonical；仍需项目所有者最终批准。

### 阳极氧化与铜电解精炼的电极反应

- 节点：`sg_h2_chemistry_industrial_electrolysis_applications` / `pc_666ec83467e2fd50bdae1ffb00690078`
- 解析缺口：`gap_sg_h2_chemistry_9476_2026_o_12_o`
- 概念边界：Explaining aluminium anodising and electrolytic copper purification from electrode reactions, material transfer and product identity without requiring industrial equipment details.
- 证据：PDF p.34, topic 12 Electrochemistry, outcome (o)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Chemistry 2e §17.7, Electrolysis, electroplating and metal purification applications（`src_openstax_chemistry_2e_2019`）
- 复核建议：可保留；未发现范围、深度和诊断粒度均等价的既有 canonical；仍需项目所有者最终批准。

### 第一过渡系半径与第一电离能的相对稳定

- 节点：`sg_h2_chemistry_transition_periodic_invariance` / `pc_93d9babd0894b9a85da3874f2c9e6228`
- 解析缺口：`gap_sg_h2_chemistry_9476_2026_o_13_c`
- 概念边界：Explaining why added 3d electrons partly offset increasing nuclear charge so atomic radii and first ionisation energies vary less across the first transition series than across a typical main-group period.
- 证据：PDF p.34, topic 13 Chemistry of Transition Elements, outcome (c)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Chemistry 2e §§6.5 and 19.1, Periodic Variations in Element Properties; Properties of Transition Metals（`src_openstax_chemistry_2e_2019`）
- 复核建议：可保留；未发现范围、深度和诊断粒度均等价的既有 canonical；仍需项目所有者最终批准。

### 配位化合物中的配体交换

- 节点：`sg_h2_chemistry_ligand_exchange_complex_contexts` / `pc_3e5fd22316ea97b5c19b13761d4d624b`
- 解析缺口：`gap_sg_h2_chemistry_9476_2026_o_13_j`
- 概念边界：Representing ligand-exchange equilibria and associated colour changes in copper complexes and applying competitive ligand binding qualitatively to oxygen-carbon monoxide exchange in haemoglobin.
- 证据：PDF p.34, topic 13 Chemistry of Transition Elements, outcome (j)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Chemistry 2e §19.2, Coordination Chemistry of Transition Metals, ligand substitution and complex formation（`src_openstax_chemistry_2e_2019`）
- 复核建议：可保留；未发现范围、深度和诊断粒度均等价的既有 canonical；仍需项目所有者最终批准。
