# A-Level 化学 KG 中文审核包

- 图：`a_level_chemistry`
- 官方 syllabus：Cambridge 9701
- 来源：`src_cambridge_9701_2025_2027`
- 状态：`needs_review`，本文件不能作为人工批准记录
- 官方小节：90；逐项要求：351
- 自动信号：候选覆盖 65；部分覆盖 277；歧义 1；未解析 3；已核实 Concept 缺口 0；需技能映射 5

> 版权说明：这里只保存小节标题、页码、关键词、文本指纹和 Primoria 候选映射，不复制 Cambridge syllabus 正文。分数只用于排序，不能作为审核结论。

## 小节覆盖索引

| 官方小节 | Syllabus 页 | 要求数 | Primoria 候选 Topic | 覆盖 / 部分 / 歧义 / 未解析 / Concept 缺口 / 技能 |
|---|---:|---:|---|---:|
| 1.1 Particles in the atom and atomic radius | 16 | 7 | 亚原子粒子与同位素 (che_atomic)；电子排布、原子轨道与电离能 (che_atomic_che_electron_config) | 0 / 6 / 0 / 1 / 0 / 0 |
| 1.2 Isotopes | 16 | 4 | 亚原子粒子与同位素 (che_atomic)；平衡常数 Kc 与 Kp与布朗斯特-洛瑞理论 (che_equilibria_acidbase_che_kc_kp) | 1 / 3 / 0 / 0 / 0 / 0 |
| 1.3 Electrons, energy levels and atomic orbitals | 17 | 9 | 电子排布、原子轨道与电离能 (che_atomic_che_electron_config)；自由能与周期性 (che_free_energy_periodicity) | 2 / 7 / 0 / 0 / 0 / 0 |
| 1.4 Ionisation energy | 17 | 8 | 电子排布、原子轨道与电离能 (che_atomic_che_electron_config)；自由能与周期性 (che_free_energy_periodicity) | 1 / 7 / 0 / 0 / 0 / 0 |
| 2.1 Relative masses of atoms and molecules | 18 | 2 | 相对质量、摩尔与化学式 (che_stoichiometry)；芳香烃与质谱分析 (che_arenes_mass_spec) | 2 / 0 / 0 / 0 / 0 / 0 |
| 2.2 The mole and the Avogadro constant | 18 | 1 | 相对质量、摩尔与化学式 (che_stoichiometry)；强酸与弱酸与pH 与酸解离常数 (che_acids) | 1 / 0 / 0 / 0 / 0 / 0 |
| 2.3 Formulas | 18 | 5 | 过渡金属元素 (che_transition)；亚原子粒子与同位素 (che_atomic) | 3 / 2 / 0 / 0 / 0 / 0 |
| 2.4 Reacting masses and volumes (of solutions and gases) | 19 | 1 | 反应质量与气体体积与浓度与滴定 (che_stoichiometry_che_reacting_masses)；芳香烃与质谱分析 (che_arenes_mass_spec) | 0 / 1 / 0 / 0 / 0 / 0 |
| 3.1 Electronegativity and bonding | 19 | 4 | 化学键：分子形状与分子间作用力 (che_bonding_part2)；化学键：成键类型 (che_bonding_part1) | 4 / 0 / 0 / 0 / 0 / 0 |
| 3.2 Ionic bonding | 19 | 2 | 化学键：成键类型 (che_bonding_part1)；化学键：分子形状与分子间作用力 (che_bonding_part2) | 1 / 1 / 0 / 0 / 0 / 0 |
| 3.3 Metallic bonding | 20 | 1 | 化学键：成键类型 (che_bonding_part1)；化学键：分子形状与分子间作用力 (che_bonding_part2) | 1 / 0 / 0 / 0 / 0 / 0 |
| 3.4 Covalent bonding and coordinate (dative covalent) bonding | 20 | 3 | 化学键：成键类型 (che_bonding_part1)；化学键：分子形状与分子间作用力 (che_bonding_part2) | 2 / 1 / 0 / 0 / 0 / 0 |
| 3.5 Shapes of molecules | 21 | 2 | 化学键：分子形状与分子间作用力 (che_bonding_part2)；电子排布、原子轨道与电离能 (che_atomic_che_electron_config) | 0 / 2 / 0 / 0 / 0 / 0 |
| 3.6 Intermolecular forces, electronegativity and bond properties | 21 | 4 | 化学键：分子形状与分子间作用力 (che_bonding_part2)；过渡金属元素 (che_transition) | 1 / 3 / 0 / 0 / 0 / 0 |
| 3.7 Dot-and-cross diagrams | 22 | 1 | 物态与焓变 (che_states_enthalpy)；氧化还原与电化学 (che_redox) | 0 / 1 / 0 / 0 / 0 / 0 |
| 4.1 The gaseous state: ideal and real gases and pV = nRT | 22 | 3 | 物态与焓变 (che_states_enthalpy)；化学键：分子形状与分子间作用力 (che_bonding_part2) | 1 / 2 / 0 / 0 / 0 / 0 |
| 4.2 Bonding and structure | 22 | 3 | 化学键：成键类型 (che_bonding_part1)；芳香烃与质谱分析 (che_arenes_mass_spec) | 0 / 3 / 0 / 0 / 0 / 0 |
| 5.1 Enthalpy change, ΔH | 23 | 7 | 物态与焓变 (che_states_enthalpy)；化学能 (che_energetics) | 1 / 5 / 0 / 1 / 0 / 0 |
| 5.2 Hess’s law | 23 | 2 | 化学能 (che_energetics)；晶格能与玻恩-哈伯循环与熵 (che_electrochem_thermo_che_born_haber) | 2 / 0 / 0 / 0 / 0 / 0 |
| 6.1 Redox processes: electron transfer and changes in oxidation number (oxidation state) | 23 | 5 | 氧化还原与电化学 (che_redox)；醇的反应、氧化与碘仿检验 (che_halogenoalkanes_alcohols_che_alcohol_reactions) | 1 / 4 / 0 / 0 / 0 / 0 |
| 7.1 Chemical equilibria: reversible reactions, dynamic equilibrium | 24 | 10 | 动态平衡与勒夏特列原理 (che_equilibria_acidbase)；反应动力学：速率与碰撞理论 (che_kinetics_part1) | 1 / 9 / 0 / 0 / 0 / 0 |
| 7.2 Brønsted–Lowry theory of acids and bases | 24 | 10 | 平衡常数 Kc 与 Kp与布朗斯特-洛瑞理论 (che_equilibria_acidbase_che_kc_kp)；羰基化合物 (che_carbonyls) | 1 / 7 / 0 / 0 / 0 / 2 |
| 8.1 Rate of reaction | 25 | 3 | 反应动力学：速率与碰撞理论 (che_kinetics_part1)；反应动力学：速率方程与催化 (che_kinetics_part2) | 2 / 1 / 0 / 0 / 0 / 0 |
| 8.2 Effect of temperature on reaction rates and the concept of activation energy | 25 | 3 | 反应动力学：速率与碰撞理论 (che_kinetics_part1)；电子排布、原子轨道与电离能 (che_atomic_che_electron_config) | 0 / 3 / 0 / 0 / 0 / 0 |
| 8.3 Homogeneous and heterogeneous catalysts | 25 | 1 | 反应动力学：速率方程与催化 (che_kinetics_part2)；反应动力学：速率与碰撞理论 (che_kinetics_part1) | 0 / 1 / 0 / 0 / 0 / 0 |
| 9.1 Periodicity of physical properties of the elements in Period 3 | 26 | 2 | 自由能与周期性 (che_free_energy_periodicity)；过渡金属元素 (che_transition) | 0 / 2 / 0 / 0 / 0 / 0 |
| 9.2 Periodicity of chemical properties of the elements in Period 3 | 26 | 7 | 自由能与周期性 (che_free_energy_periodicity)；过渡金属元素 (che_transition) | 0 / 7 / 0 / 0 / 0 / 0 |
| 9.3 Chemical periodicity of other elements | 26 | 2 | 过渡金属元素 (che_transition)；化学能 (che_energetics) | 0 / 2 / 0 / 0 / 0 / 0 |
| 10.1 Similarities and trends in the properties of the Group 2 metals, magnesium to barium, and their compounds | 27 | 5 | 无机元素族化学 (che_groups)；自由能与周期性 (che_free_energy_periodicity) | 0 / 5 / 0 / 0 / 0 / 0 |
| 11.1 Physical properties of the Group 17 elements | 27 | 3 | 无机元素族化学 (che_groups)；过渡金属元素 (che_transition) | 0 / 3 / 0 / 0 / 0 / 0 |
| 11.2 The chemical properties of the halogen elements and the hydrogen halides | 27 | 3 | 过渡金属元素 (che_transition)；无机元素族化学 (che_groups) | 1 / 2 / 0 / 0 / 0 / 0 |
| 11.3 Some reactions of the halide ions | 28 | 2 | 亲核取代与消去反应 (che_halogenoalkanes_alcohols)；醇的反应、氧化与碘仿检验 (che_halogenoalkanes_alcohols_che_alcohol_reactions) | 0 / 2 / 0 / 0 / 0 / 0 |
| 11.4 The reactions of chlorine | 28 | 2 | 醇的反应、氧化与碘仿检验 (che_halogenoalkanes_alcohols_che_alcohol_reactions)；亲核取代与消去反应 (che_halogenoalkanes_alcohols) | 1 / 1 / 0 / 0 / 0 / 0 |
| 12.1 Nitrogen and sulfur | 28 | 5 | 无机元素族化学 (che_groups)；含氮化合物 (che_nitrogen_org) | 0 / 5 / 0 / 0 / 0 / 0 |
| 13.1 Formulas, functional groups and the naming of organic compounds | 31 | 6 | 有机结构表示、命名法与同分异构 (che_organic_basics)；含氮化合物 (che_nitrogen_org) | 2 / 4 / 0 / 0 / 0 / 0 |
| 13.2 Characteristic organic reactions | 31 | 2 | 亲核取代与消去反应 (che_halogenoalkanes_alcohols)；键断裂与反应物种与反应机理类型 (che_organic_basics_che_bond_fission) | 0 / 2 / 0 / 0 / 0 / 0 |
| 13.3 Shapes of organic molecules; σ and π bonds | 32 | 4 | 化学键：分子形状与分子间作用力 (che_bonding_part2)；电子排布、原子轨道与电离能 (che_atomic_che_electron_config) | 1 / 3 / 0 / 0 / 0 / 0 |
| 13.4 Isomerism: structural isomerism and stereoisomerism | 32 | 6 | 有机结构表示、命名法与同分异构 (che_organic_basics)；醇的反应、氧化与碘仿检验 (che_halogenoalkanes_alcohols_che_alcohol_reactions) | 1 / 5 / 0 / 0 / 0 / 0 |
| 14.1 Alkanes | 33 | 6 | 烃 (che_hydrocarbons)；亲核取代与消去反应 (che_halogenoalkanes_alcohols) | 1 / 5 / 0 / 0 / 0 / 0 |
| 14.2 Alkenes | 33, 34 | 2 | 烃 (che_hydrocarbons)；醇的反应、氧化与碘仿检验 (che_halogenoalkanes_alcohols_che_alcohol_reactions) | 0 / 2 / 0 / 0 / 0 / 0 |
| 15.1 Halogenoalkanes | 34 | 7 | 亲核取代与消去反应 (che_halogenoalkanes_alcohols)；烃 (che_hydrocarbons) | 1 / 6 / 0 / 0 / 0 / 0 |
| 16.1 Alcohols | 35 | 5 | 醇的反应、氧化与碘仿检验 (che_halogenoalkanes_alcohols_che_alcohol_reactions)；腈与酰胺 (che_nitriles_amides) | 2 / 2 / 1 / 0 / 0 / 0 |
| 17.1 Aldehydes and ketones | 36 | 6 | 羰基化合物 (che_carbonyls)；醇的反应、氧化与碘仿检验 (che_halogenoalkanes_alcohols_che_alcohol_reactions) | 1 / 5 / 0 / 0 / 0 / 0 |
| 18.1 Carboxylic acids | 36 | 2 | 羰基化合物 (che_carbonyls)；强酸与弱酸与pH 与酸解离常数 (che_acids) | 0 / 2 / 0 / 0 / 0 / 0 |
| 18.2 Esters | 37 | 2 | 羰基化合物 (che_carbonyls)；苯酚、重氮盐与偶氮化合物 (che_phenols_diazonium) | 0 / 1 / 0 / 1 / 0 / 0 |
| 19.1 Primary amines | 37 | 1 | 含氮化合物 (che_nitrogen_org)；物态与焓变 (che_states_enthalpy) | 0 / 1 / 0 / 0 / 0 / 0 |
| 19.2 Nitriles and hydroxynitriles | 37 | 3 | 腈与酰胺 (che_nitriles_amides)；氧化还原与电化学 (che_redox) | 1 / 2 / 0 / 0 / 0 / 0 |
| 20.1 Addition polymerisation | 37 | 4 | 烃 (che_hydrocarbons)；芳香烃与质谱分析 (che_arenes_mass_spec) | 0 / 4 / 0 / 0 / 0 / 0 |
| 21.1 Organic synthesis | 38 | 3 | 有机结构表示、命名法与同分异构 (che_organic_basics)；羰基化合物 (che_carbonyls) | 0 / 2 / 0 / 0 / 0 / 1 |
| 22.1 Infrared spectroscopy | 38 | 1 | 分析技术 (che_analysis)；有机结构表示、命名法与同分异构 (che_organic_basics) | 0 / 1 / 0 / 0 / 0 / 0 |
| 22.2 Mass spectrometry | 38 | 6 | 芳香烃与质谱分析 (che_arenes_mass_spec)；相对质量、摩尔与化学式 (che_stoichiometry) | 0 / 6 / 0 / 0 / 0 / 0 |
| 23.1 Lattice energy and Born-Haber cycles | 39 | 5 | 晶格能与玻恩-哈伯循环与熵 (che_electrochem_thermo_che_born_haber)；电子排布、原子轨道与电离能 (che_atomic_che_electron_config) | 0 / 5 / 0 / 0 / 0 / 0 |
| 23.2 Enthalpies of solution and hydration | 39 | 4 | 化学能 (che_energetics)；晶格能与玻恩-哈伯循环与熵 (che_electrochem_thermo_che_born_haber) | 0 / 4 / 0 / 0 / 0 / 0 |
| 23.3 Entropy change, ΔS | 40 | 3 | 晶格能与玻恩-哈伯循环与熵 (che_electrochem_thermo_che_born_haber)；相对质量、摩尔与化学式 (che_stoichiometry) | 0 / 3 / 0 / 0 / 0 / 0 |
| 23.4 Gibbs free energy change, ΔG | 40 | 4 | 自由能与周期性 (che_free_energy_periodicity)；电子排布、原子轨道与电离能 (che_atomic_che_electron_config) | 1 / 3 / 0 / 0 / 0 / 0 |
| 24.1 Electrolysis | 40 | 4 | 电化学电池与电解 (che_electrochem_thermo)；动态平衡与勒夏特列原理 (che_equilibria_acidbase) | 0 / 4 / 0 / 0 / 0 / 0 |
| 24.2 Standard electrode potentials E ⦵ | 41 | 10 | 氧化还原与电化学 (che_redox)；电化学电池与电解 (che_electrochem_thermo) | 3 / 7 / 0 / 0 / 0 / 0 |
| 25.1 Acids and bases | 42 | 10 | 羰基化合物 (che_carbonyls)；强酸与弱酸与pH 与酸解离常数 (che_acids) | 2 / 8 / 0 / 0 / 0 / 0 |
| 25.2 Partition coefficients | 42 | 3 | 缓冲、溶度积与分配平衡 (che_acids_che_buffers)；分析技术 (che_analysis) | 3 / 0 / 0 / 0 / 0 / 0 |
| 26.1 Simple rate equations, orders of reaction and rate constants | 43 | 6 | 反应动力学：速率方程与催化 (che_kinetics_part2)；反应动力学：速率与碰撞理论 (che_kinetics_part1) | 0 / 6 / 0 / 0 / 0 / 0 |
| 26.2 Homogeneous and heterogeneous catalysts | 43 | 3 | 过渡金属元素 (che_transition)；反应动力学：速率方程与催化 (che_kinetics_part2) | 1 / 2 / 0 / 0 / 0 / 0 |
| 27.1 Similarities and trends in the properties of the Group 2 metals, magnesium to barium, and their compounds | 44 | 2 | 无机元素族化学 (che_groups)；自由能与周期性 (che_free_energy_periodicity) | 0 / 2 / 0 / 0 / 0 / 0 |
| 28.1 General physical and chemical properties of the first row of transition elements, titanium to copper | 44 | 6 | 过渡金属元素 (che_transition)；化学能 (che_energetics) | 2 / 4 / 0 / 0 / 0 / 0 |
| 28.2 General characteristic chemical properties of the first set of transition elements, titanium to copper | 45 | 10 | 过渡金属元素 (che_transition)；化学能 (che_energetics) | 0 / 10 / 0 / 0 / 0 / 0 |
| 28.3 Colour of complexes | 45 | 5 | 过渡金属元素 (che_transition)；平衡常数 Kc 与 Kp与布朗斯特-洛瑞理论 (che_equilibria_acidbase_che_kc_kp) | 0 / 5 / 0 / 0 / 0 / 0 |
| 28.4 Stereoisomerism in transition element complexes | 46 | 2 | 过渡金属元素 (che_transition)；有机结构表示、命名法与同分异构 (che_organic_basics) | 0 / 2 / 0 / 0 / 0 / 0 |
| 28.5 Stability constants, Kstab | 46 | 4 | 平衡常数 Kc 与 Kp与布朗斯特-洛瑞理论 (che_equilibria_acidbase_che_kc_kp)；缓冲、溶度积与分配平衡 (che_acids_che_buffers) | 0 / 4 / 0 / 0 / 0 / 0 |
| 29.1 Formulas, functional groups and the naming of organic compounds | 48 | 4 | 有机结构表示、命名法与同分异构 (che_organic_basics)；羰基化合物 (che_carbonyls) | 0 / 4 / 0 / 0 / 0 / 0 |
| 29.2 Characteristic organic reactions | 48 | 1 | 键断裂与反应物种与反应机理类型 (che_organic_basics_che_bond_fission)；亲核取代与消去反应 (che_halogenoalkanes_alcohols) | 0 / 1 / 0 / 0 / 0 / 0 |
| 29.3 Shapes of aromatic organic molecules; σ and π bonds | 48 | 1 | 化学键：分子形状与分子间作用力 (che_bonding_part2)；化学键：成键类型 (che_bonding_part1) | 0 / 1 / 0 / 0 / 0 / 0 |
| 29.4 Isomerism: optical | 48 | 4 | 有机结构表示、命名法与同分异构 (che_organic_basics)；亚原子粒子与同位素 (che_atomic) | 0 / 4 / 0 / 0 / 0 / 0 |
| 30.1 Arenes | 49 | 4 | 芳香烃与质谱分析 (che_arenes_mass_spec)；苯酚、重氮盐与偶氮化合物 (che_phenols_diazonium) | 0 / 4 / 0 / 0 / 0 / 0 |
| 31.1 Halogen compounds | 49 | 2 | 羰基化合物 (che_carbonyls)；无机元素族化学 (che_groups) | 0 / 2 / 0 / 0 / 0 / 0 |
| 32.1 Alcohols | 50 | 1 | 醇的反应、氧化与碘仿检验 (che_halogenoalkanes_alcohols_che_alcohol_reactions)；羰基化合物 (che_carbonyls) | 0 / 1 / 0 / 0 / 0 / 0 |
| 32.2 Phenol | 50 | 7 | 苯酚、重氮盐与偶氮化合物 (che_phenols_diazonium)；氧化还原与电化学 (che_redox) | 6 / 1 / 0 / 0 / 0 / 0 |
| 33.1 Carboxylic acids | 50 | 5 | 羰基化合物 (che_carbonyls)；强酸与弱酸与pH 与酸解离常数 (che_acids) | 0 / 5 / 0 / 0 / 0 / 0 |
| 33.2 Esters | 51 | 1 | 羰基化合物 (che_carbonyls)；物态与焓变 (che_states_enthalpy) | 0 / 1 / 0 / 0 / 0 / 0 |
| 33.3 Acyl chlorides | 51 | 4 | 羰基化合物 (che_carbonyls)；腈与酰胺 (che_nitriles_amides) | 1 / 3 / 0 / 0 / 0 / 0 |
| 34.1 Primary and secondary amines | 51 | 3 | 含氮化合物 (che_nitrogen_org)；腈与酰胺 (che_nitriles_amides) | 1 / 2 / 0 / 0 / 0 / 0 |
| 34.2 Phenylamine and azo compounds | 52 | 4 | 苯酚、重氮盐与偶氮化合物 (che_phenols_diazonium)；羰基化合物 (che_carbonyls) | 2 / 2 / 0 / 0 / 0 / 0 |
| 34.3 Amides | 52 | 3 | 腈与酰胺 (che_nitriles_amides)；物态与焓变 (che_states_enthalpy) | 2 / 1 / 0 / 0 / 0 / 0 |
| 34.4 Amino acids | 52 | 3 | 含氮化合物 (che_nitrogen_org)；羰基化合物 (che_carbonyls) | 0 / 2 / 0 / 0 / 0 / 1 |
| 35.1 Condensation polymerisation | 53 | 4 | 含氮化合物 (che_nitrogen_org)；烃 (che_hydrocarbons) | 0 / 4 / 0 / 0 / 0 / 0 |
| 35.2 Predicting the type of polymerisation | 53 | 2 | 烃 (che_hydrocarbons)；含氮化合物 (che_nitrogen_org) | 0 / 2 / 0 / 0 / 0 / 0 |
| 35.3 Degradable polymers | 53 | 3 | 含氮化合物 (che_nitrogen_org)；烃 (che_hydrocarbons) | 1 / 2 / 0 / 0 / 0 / 0 |
| 36.1 Organic synthesis | 53 | 3 | 有机结构表示、命名法与同分异构 (che_organic_basics)；羰基化合物 (che_carbonyls) | 0 / 2 / 0 / 0 / 0 / 1 |
| 37.1 Thin-layer chromatography | 54 | 3 | 分析技术 (che_analysis)；反应动力学：速率与碰撞理论 (che_kinetics_part1) | 0 / 3 / 0 / 0 / 0 / 0 |
| 37.2 Gas/liquid chromatography | 54 | 3 | 分析技术 (che_analysis)；反应质量与气体体积与浓度与滴定 (che_stoichiometry_che_reacting_masses) | 0 / 3 / 0 / 0 / 0 / 0 |
| 37.3 Carbon-13 NMR spectroscopy | 54 | 2 | 分析技术 (che_analysis)；有机结构表示、命名法与同分异构 (che_organic_basics) | 0 / 2 / 0 / 0 / 0 / 0 |
| 37.4 Proton (1 H) NMR spectroscopy | 55 | 5 | 分析技术 (che_analysis)；亚原子粒子与同位素 (che_atomic) | 0 / 5 / 0 / 0 / 0 / 0 |

## 待人工判断项

| 定位 | 类型 | Syllabus 页 | 关键词 | 候选或相关概念 | 信号 |
|---|---|---:|---|---|---|
| 1.1 outcome 1 | concept | 16 | empty, nucleus, space, around, atoms, contains, dense, electron | 亚原子粒子 (che_subatomic，已抽样核验) | candidate_partial |
| 1.1 outcome 2 | concept | 16 | relative, charge, electron, identify, mass, neutron, proton, terms | 亚原子粒子 (che_subatomic，已抽样核验) | candidate_partial |
| 1.1 outcome 3 | concept | 16 | number, atomic, mass, nucleon, proton, terms | 亚原子粒子 (che_subatomic，已抽样核验) | candidate_partial |
| 1.1 outcome 4 | concept | 16 | atom, charge, distribution, mass | 亚原子粒子 (che_subatomic，已抽样核验) | candidate_partial |
| 1.1 outcome 5 | concept | 16 | at, beams, behaviour, electric, electron, field, moving, neutron | 亚原子粒子 (che_subatomic，已抽样核验) | candidate_partial |
| 1.1 outcome 6 | concept | 16 | number, proton, atomic, atoms, both, charge, electron, given | 亚原子粒子 (che_subatomic，已抽样核验) | candidate_partial |
| 1.1 outcome 7 | concept | 16 | radius, across, atomic, down, group, ionic, period, qualitatively | 无 | unresolved_mapping |
| 1.2 outcome 2 | concept | 16 | number, atomic, isotopes, mass, notation, nucleon, proton, where | 同位素 (che_isotopes，已抽样核验) | candidate_partial |
| 1.2 outcome 3 | concept | 16 | same, chemical, element, have, isotopes, properties, why | 同位素 (che_isotopes，已抽样核验) | candidate_partial |
| 1.2 outcome 4 | concept | 16 | density, different, element, have, isotopes, limited, mass, physical | 同位素 (che_isotopes，已抽样核验) | candidate_partial |
| 1.3 outcome 1 | concept | 17 | shells, configuration, electronic, ground, limited, number, orbitals, principal | 电子排布 (che_electron_config，已抽样核验) | candidate_partial |
| 1.3 outcome 2 | concept | 17 | number, shells, sub, can, electron, fill, making, orbitals | 电子排布 (che_electron_config，已抽样核验) | candidate_partial |
| 1.3 outcome 3 | concept | 17 | shells, sub, 4p, 4s, energy, first, increasing, order | 电子排布 (che_electron_config，已抽样核验) | candidate_partial |
| 1.3 outcome 4 | concept | 17 | shell, configurations, each, electron, electronic, include, number, orbital | 电子排布 (che_electron_config，已抽样核验) | candidate_partial |
| 1.3 outcome 5 | concept | 17 | electron, configurations, electronic, energy, inter, repulsion, terms | 电子排布 (che_electron_config，已抽样核验) | candidate_partial |
| 1.3 outcome 6 | concept | 17 | configuration, electronic, 3d6, 4s2, 1s2, 2p6, 2s2, 3p6 | 电子排布 (che_electron_config，已抽样核验) | candidate_partial |
| 1.3 outcome 7 | concept | 17 | ar, boxes, electron, fe, notation | 电子排布 (che_electron_config，已抽样核验) | candidate_partial |
| 1.4 outcome 1 | concept | 17 | define, energy, first, ie, ionisation, term | 电离能 (che_ionisation，已抽样核验) | candidate_partial |
| 1.4 outcome 2 | concept_and_skill | 17 | construct, energies, equation, first, ionisation, represent, second, subsequent | 电离能 (che_ionisation，已抽样核验) | candidate_partial |
| 1.4 outcome 4 | concept | 17 | element, energies, identify, ionisation, successive, variation | 电离能 (che_ionisation，已抽样核验) | candidate_partial |
| 1.4 outcome 5 | concept | 17 | attraction, between, due, electron, energies, ionisation, nucleus, outer | 电离能 (che_ionisation，已抽样核验) | candidate_partial |
| 1.4 outcome 6 | concept | 17 | shells, atomic, charge, elements, energies, factors, influencing, inner | 电离能 (che_ionisation，已抽样核验) | candidate_partial |
| 1.4 outcome 7 | concept | 17 | configurations, data, deduce, electronic, elements, energy, ionisation, successive | 电离能 (che_ionisation，已抽样核验) | candidate_partial |
| 1.4 outcome 8 | concept | 17 | data, deduce, element, energy, ionisation, periodic, position, successive | 电离能 (che_ionisation，已抽样核验) | candidate_partial |
| 2.3 outcome 1 | concept | 18 | ionic, charge, formulas, ag, co3, compounds, element, following | 离子键 (che_ionic，已抽样核验) | candidate_partial |
| 2.3 outcome 2 | concept_and_skill | 18 | equation, which, appropriate, balanced, construct, include, ion, ionic | 反应质量与气体体积 (che_reacting_masses，已抽样核验) | candidate_partial |
| 2.4 outcome 1 | concept_and_skill | 19 | calculations, figures, reagent, significant, volumes, when, also, answers | 反应质量与气体体积 (che_reacting_masses，已抽样核验) | candidate_partial |
| 3.2 outcome 2 | concept | 19 | bonding, calcium, chloride, examples, fluoride, ionic, magnesium, oxide | 离子键 (che_ionic，已抽样核验) | candidate_partial |
| 3.4 outcome 1 | concept | 20 | bonding, covalent, hydrogen, ammonia, between, c2, chloride, dioxide | 共价键 (che_covalent，已抽样核验) | candidate_partial |
| 3.5 outcome 1 | concept | 21 | linear, trigonal, angles, bf3, bipyramidal, bond, ch4, co2 | VSEPR 分子形状 (che_vsepr，已抽样核验) | candidate_partial |
| 3.5 outcome 2 | concept | 21 | analogous, angles, bond, ion, molecules, predict, shapes, specified | VSEPR 分子形状 (che_vsepr，已抽样核验) | candidate_partial |
| 3.6 outcome 1 | concept | 21 | water, bonding, high, hydrogen, ice, relatively, ammonia, anomalous | 分子间作用力 (che_imf，已抽样核验) | candidate_partial |
| 3.6 outcome 3 | concept | 21 | forces, dipole, hydrogen, permanent, bonding, der, van, waals | 分子间作用力 (che_imf，已抽样核验) | candidate_partial |
| 3.6 outcome 4 | concept | 21 | bonding, covalent, forces, general, intermolecular, ionic, metallic, stronger | 离子键 (che_ionic，已抽样核验) | candidate_partial |
| 3.7 outcome 1 | concept_and_skill | 22 | cross, diagrams, dot, species, any, atoms, bonding, compounds | 离子键 (che_ionic，已抽样核验) | candidate_partial |
| 4.1 outcome 2 | concept | 22 | attraction, forces, gases, have, ideal, intermolecular, no, particle | 分子间作用力 (che_imf，已抽样核验) | candidate_partial |
| 4.1 outcome 3 | concept | 22 | calculations, determination, equation, gas, ideal, mr, nrt, pv | 气体动理论模型与理想气体行为 (che_gas_laws，已抽样核验) | candidate_partial |
| 4.2 outcome 1 | concept | 22 | giant, molecular, oxide, simple, buckminsterfullerene, c60, chloride, copper | 固体结构 (che_solids，已抽样核验) | candidate_partial |
| 4.2 outcome 2 | concept | 22 | point, boiling, bonding, conductivity, different, effect, electrical, interpret | 固体结构 (che_solids，已抽样核验) | candidate_partial |
| 4.2 outcome 3 | concept | 22 | bonding, deduce, given, information, present, structure, substance, type | 固体结构 (che_solids，已抽样核验) | candidate_partial |
| 5.1 outcome 1 | concept | 23 | changes, δh, accompanied, can, chemical, endothermic, enthalpy, exothermic | 焓变 (che_enthalpy，已抽样核验) | candidate_partial |
| 5.1 outcome 2 | concept_and_skill | 23 | reaction, activation, change, construct, diagram, energy, enthalpy, interpret | 焓变 (che_enthalpy，已抽样核验) | candidate_partial |
| 5.1 outcome 3 | concept | 23 | 101kpa, 298k, assumes, change, combustion, conditions, define, enthalpy | 焓变 (che_enthalpy，已抽样核验) | candidate_partial |
| 5.1 outcome 4 | concept | 23 | chemical, because, bonds, breaking, during, energy, making, occur | 键能与键长 (che_bond_enthalpy，已抽样核验) | candidate_partial |
| 5.1 outcome 6 | concept | 23 | bond, energies, some, averages, exact | 无 | unresolved_mapping |
| 5.1 outcome 7 | concept_and_skill | 23 | mcδt, appropriate, calculate, changes, enthalpy, experimental, relationships, results | 量热法 (che_calorimetry，已抽样核验) | candidate_partial |
| 6.1 outcome 2 | concept | 23 | balance, changes, chemical, equation, help, numbers, oxidation | 氧化数 (che_oxidation_number，已抽样核验) | candidate_partial |
| 6.1 outcome 3 | concept | 23 | oxidation, terms, changes, disproportionation, electron, number, redox, reduction | 氧化数 (che_oxidation_number，已抽样核验) | candidate_partial |
| 6.1 outcome 4 | concept | 23 | agent, oxidising, reducing, terms | 氧化数 (che_oxidation_number，已抽样核验) | candidate_partial |
| 6.1 outcome 5 | concept | 23 | element, indicate, magnitude, number, numeral, oxidation, roman | 氧化数 (che_oxidation_number，已抽样核验) | candidate_partial |
| 7.1 outcome 1 | concept | 24 | dynamic, equilibrium, meant, reaction, what, being, closed, concentration | 动态平衡 (che_dynamic_eq，已抽样核验) | candidate_partial |
| 7.1 outcome 3 | concept | 24 | appropriate, at, catalyst, changes, chatelier, concentration, deduce, effects | 勒夏特列原理 (che_le_chatelier，已抽样核验) | candidate_partial |
| 7.1 outcome 4 | concept | 24 | concentrations, constants, deduce, equilibrium, expressions, kc, terms | 平衡常数 Kc 与 Kp (che_kc_kp，已抽样核验) | candidate_partial |
| 7.1 outcome 5 | concept | 24 | fraction, mole, partial, pressure, terms | 平衡常数 Kc 与 Kp (che_kc_kp，已抽样核验) | candidate_partial |
| 7.1 outcome 6 | concept | 24 | kp, between, constants, deduce, equilibrium, expressions, kc, partial | 平衡常数 Kc 与 Kp (che_kc_kp，已抽样核验) | candidate_partial |
| 7.1 outcome 7 | concept | 24 | calculations, carry, equation, expressions, kc, kp, out, quadratic | 平衡常数 Kc 与 Kp (che_kc_kp，已抽样核验) | candidate_partial |
| 7.1 outcome 8 | concept_and_skill | 24 | appropriate, at, calculate, data, equilibrium, given, present, quantity | 平衡常数 Kc 与 Kp (che_kc_kp，已抽样核验) | candidate_partial |
| 7.1 outcome 9 | concept | 24 | affect, catalyst, changes, concentration, constant, equilibrium, presence, pressure | 动态平衡 (che_dynamic_eq，已抽样核验) | candidate_partial |
| 7.1 outcome 10 | concept | 24 | process, application, chatelier, chemical, conditions, contact, dynamic, equilibrium | 勒夏特列原理 (che_le_chatelier，已抽样核验) | candidate_partial |
| 7.2 outcome 1 | concept_and_skill | 24 | acid, acids, ch3, common, cooh, ethanoic, formulas, h2 | 布朗斯特-洛瑞理论 (che_bronsted，已抽样核验) | skill_mapping_required |
| 7.2 outcome 2 | concept_and_skill | 24 | hydroxide, alkalis, ammonia, common, formulas, koh, limited, names | 布朗斯特-洛瑞理论 (che_bronsted，已抽样核验) | skill_mapping_required |
| 7.2 outcome 4 | concept | 24 | acids, aqueous, bases, dissociated, solution, strong, weak, fully | 强酸与弱酸 (che_strong_weak，已抽样核验) | candidate_partial |
| 7.2 outcome 5 | concept | 24 | ph, solutions, above, acid, alkaline, appreciate, below, has | pH 与酸解离常数 (che_ph_ka，已抽样核验) | candidate_partial |
| 7.2 outcome 6 | concept | 24 | ph, acids, behaviour, between, conductivity, difference, differences, indicator | 强酸与弱酸 (che_strong_weak，已抽样核验) | candidate_partial |
| 7.2 outcome 7 | concept | 24 | aq, form, h2, neutralisation, occur, oh, reaction, when | 布朗斯特-洛瑞理论 (che_bronsted，已抽样核验) | candidate_partial |
| 7.2 outcome 8 | concept | 24 | formed, neutralisation, reaction, salts | 布朗斯特-洛瑞理论 (che_bronsted，已抽样核验) | candidate_partial |
| 7.2 outcome 9 | concept_and_skill | 24 | strong, weak, acids, alkalis, combination, curves, ph, sketch | 强酸与弱酸 (che_strong_weak，已抽样核验) | candidate_partial |
| 7.2 outcome 10 | concept | 24 | acid, alkali, appropriate, data, given, indicators, pka, select | 浓度与滴定 (che_titration，已抽样核验) | candidate_partial |
| 8.1 outcome 3 | concept_and_skill | 25 | calculate, data, experimental, rate, reaction | 反应速率 (che_rate，已抽样核验) | candidate_partial |
| 8.2 outcome 1 | concept | 25 | energy, activation, collision, define, ea, effective, minimum, required | 碰撞理论 (che_collision，已抽样核验) | candidate_partial |
| 8.2 outcome 2 | concept_and_skill | 25 | activation, boltzmann, distribution, energy, significance, sketch | Maxwell-Boltzmann分布 (che_boltzmann，已抽样核验) | candidate_partial |
| 8.2 outcome 3 | concept | 25 | boltzmann, both, change, collisions, distribution, effect, effective, frequency | 反应速率 (che_rate，已抽样核验) | candidate_partial |
| 8.3 outcome 1 | concept_and_skill | 25 | catalyst, reaction, presence, terms, absence, activation, boltzmann, catalysis | Maxwell-Boltzmann分布 (che_boltzmann，已抽样核验) | candidate_partial |
| 9.1 outcome 1 | concept | 26 | radius, atomic, conductivity, electrical, elements, indicate, ionic, melting | 周期趋势 (che_periodic_trends，已抽样核验) | candidate_partial |
| 9.1 outcome 2 | concept | 26 | bonding, conductivity, electrical, elements, melting, point, structure, terms | 金属键 (che_metallic，已抽样核验) | candidate_partial |
| 9.2 outcome 1 | concept | 26 | al2, alcl3, elements, equation, halogen, mg, mgcl2, mgo | 第3周期元素与氧化物 (che_period3，已抽样核验) | candidate_partial |
| 9.2 outcome 2 | concept | 26 | only, shell, al2, alcl3, chlorides, electron, mgcl2, mgo | 第3周期元素与氧化物 (che_period3，已抽样核验) | candidate_partial |
| 9.2 outcome 3 | concept | 26 | al2, any, equation, if, likely, mgo, na2, o10 | 第3周期元素与氧化物 (che_period3，已抽样核验) | candidate_partial |
| 9.2 outcome 4 | concept | 26 | behaviour, oh, acid, acids, al, al2, amphoteric, base | 第3周期元素与氧化物 (che_period3，已抽样核验) | candidate_partial |
| 9.2 outcome 5 | concept | 26 | al, chlorides, cl3, equation, likely, mgcl2, nacl, obtained | 第3周期元素与氧化物 (che_period3，已抽样核验) | candidate_partial |
| 9.2 outcome 6 | concept | 26 | bonding, electronegativity, terms, trends, variations | 周期趋势 (che_periodic_trends，已抽样核验) | candidate_partial |
| 9.2 outcome 7 | concept | 26 | chemical, bonding, chlorides, observations, oxides, physical, present, properties | 第3周期元素与氧化物 (che_period3，已抽样核验) | candidate_partial |
| 9.3 outcome 1 | concept | 26 | characteristic, chemical, element, given, group, knowledge, periodicity, predict | 周期趋势 (che_periodic_trends，已抽样核验) | candidate_partial |
| 9.3 outcome 2 | concept | 26 | about, chemical, deduce, elements, given, identity, information, nature | 周期趋势 (che_periodic_trends，已抽样核验) | candidate_partial |
| 10.1 outcome 1 | concept | 27 | acids, dilute, elements, equation, hydrochloric, oxygen, reaction, sulfuric | 第2族元素化学 (che_group2，已抽样核验) | candidate_partial |
| 10.1 outcome 2 | concept | 27 | acids, carbonates, dilute, equation, hydrochloric, hydroxides, oxides, reaction | 第2族元素化学 (che_group2，已抽样核验) | candidate_partial |
| 10.1 outcome 3 | concept | 27 | thermal, carbonates, decomposition, equation, include, nitrates, stabilities, trend | 第2族元素化学 (che_group2，已抽样核验) | candidate_partial |
| 10.1 outcome 4 | concept | 27 | involved, chemical, compounds, elements, make, physical, predictions, properties | 第2族元素化学 (che_group2，已抽样核验) | candidate_partial |
| 10.1 outcome 5 | concept | 27 | hydroxides, solubilities, sulfates, variation | 第2族元素化学 (che_group2，已抽样核验) | candidate_partial |
| 11.1 outcome 1 | concept | 27 | bromine, colours, halogen, iodine, trend, volatility | 第17族卤素 (che_group17，已抽样核验) | candidate_partial |
| 11.1 outcome 2 | concept | 27 | bond, halogen, molecules, strength, trend | 第17族卤素 (che_group17，已抽样核验) | candidate_partial |
| 11.1 outcome 3 | concept | 27 | dipole, elements, forces, induced, instantaneous, interpret, terms, volatility | 第17族卤素 (che_group17，已抽样核验) | candidate_partial |
| 11.2 outcome 2 | concept | 27 | reaction, elements, hydrogen, reactivity, relative, these | 第17族卤素 (che_group17，已抽样核验) | candidate_partial |
| 11.2 outcome 3 | concept | 27 | bond, halides, hydrogen, relative, stabilities, strengths, terms, thermal | 第17族卤素 (che_group17，已抽样核验) | candidate_partial |
| 11.3 outcome 1 | concept | 28 | agents, halide, ion, reactivity, reducing, relative | 第17族卤素 (che_group17，已抽样核验) | candidate_partial |
| 11.3 outcome 2 | concept | 28 | aqueous, ion, acid, ag, ammonia, balanced, chemical, complex | 第17族卤素 (che_group17，已抽样核验) | candidate_partial |
| 11.4 outcome 1 | concept | 28 | reaction, aqueous, changes, cold, disproportionation, halogen, hot, hydroxide | 第17族卤素 (che_group17，已抽样核验) | candidate_partial |
| 12.1 outcome 1 | concept | 28 | lack, bond, nitrogen, polarity, reactivity, reference, strength, triple | 氮和硫 (che_nitrogen_sulfur，已抽样核验) | candidate_partial |
| 12.1 outcome 2 | concept | 28 | acid, ammonia, ammonium, base, reaction, basicity, brønsted, displacement | 布朗斯特-洛瑞理论 (che_bronsted，已抽样核验) | candidate_partial |
| 12.1 outcome 3 | concept | 28 | catalytic, combustion, engines, exhaust, gases, internal, made, man | 氮和硫 (che_nitrogen_sulfur，已抽样核验) | candidate_partial |
| 12.1 outcome 4 | concept | 28 | atmospheric, can, component, form, hydrocarbons, nitrate, nitrogen, no | 氮和硫 (che_nitrogen_sulfur，已抽样核验) | candidate_partial |
| 12.1 outcome 5 | concept | 28 | role, acid, atmospheric, both, catalytic, dioxide, directly, formation | 氮和硫 (che_nitrogen_sulfur，已抽样核验) | candidate_partial |
| 13.1 outcome 1 | concept | 31 | atoms, compound, define, hydrocarbon, made, only, term, up | 烷烃 (che_alkanes，已抽样核验) | candidate_partial |
| 13.1 outcome 2 | concept | 31 | alkanes, functional, group, hydrocarbons, no, simple | 烷烃 (che_alkanes，已抽样核验) | candidate_partial |
| 13.1 outcome 5 | concept | 31 | six, esters, aliphatic, atoms, carbon, chains, detailed, functional | 命名法 (che_nomenclature，已抽样核验) | candidate_partial |
| 13.1 outcome 6 | concept | 31 | formula, compound, deduce, displayed, empirical, given, molecular, skeletal | 实验式与分子式 (che_formulae，已抽样核验) | candidate_partial |
| 13.2 outcome 1 | concept | 31 | agent, atom, one, organic, reaction, represent, symbol, addition | 反应机理类型 (che_mechanism_types，已抽样核验) | candidate_partial |
| 13.2 outcome 2 | concept | 31 | addition, electron, mechanisms, nucleophilic, organic, substitution, arrow, arrows | 反应机理类型 (che_mechanism_types，已抽样核验) | candidate_partial |
| 13.3 outcome 1 | concept | 32 | branched, chained, cyclic, either, molecules, organic, straight | 命名法 (che_nomenclature，已抽样核验) | candidate_partial |
| 13.3 outcome 2 | concept | 32 | angles, atoms, bond, containing, hybridised, molecules, shape, sp | VSEPR 分子形状 (che_vsepr，已抽样核验) | candidate_partial |
| 13.3 outcome 4 | concept | 32 | arrangement, atoms, describing, ethene, example, molecules, organic, planar | 烯烃 (che_alkenes，已抽样核验) | candidate_partial |
| 13.4 outcome 1 | concept | 32 | isomerism, chain, division, functional, group, into, positional, structural | 同分异构 (che_isomerism，已抽样核验) | candidate_partial |
| 13.4 outcome 3 | concept | 32 | alkenes, bonds, cis, due, geometrical, isomerism, origin, presence | 同分异构 (che_isomerism，已抽样核验) | candidate_partial |
| 13.4 outcome 4 | concept | 32 | centre, chiral, compounds, such, appreciate, but, can, contain | 同分异构 (che_isomerism，已抽样核验) | candidate_partial |
| 13.4 outcome 5 | concept | 32 | centres, chiral, cis, compounds, cyclic, formula, geometrical, given | 同分异构 (che_isomerism，已抽样核验) | candidate_partial |
| 13.4 outcome 6 | concept | 32 | deduce, formula, isomers, known, molecular, molecule, organic, possible | 同分异构 (che_isomerism，已抽样核验) | candidate_partial |
| 14.1 outcome 1 | concept | 33 | heat, reaction, addition, al2, alkane, alkanes, alkene, can | 烯烃 (che_alkenes，已抽样核验) | candidate_partial |
| 14.1 outcome 2 | concept | 33 | alkanes, br2, cl2, combustion, complete, ethane, exemplified, free | 烷烃 (che_alkanes，已抽样核验) | candidate_partial |
| 14.1 outcome 3 | concept | 33 | free, initiation, mechanism, propagation, radical, reference, steps, substitution | 烷烃 (che_alkanes，已抽样核验) | candidate_partial |
| 14.1 outcome 5 | concept | 33 | alkanes, bonds, general, lack, polar, polarity, reagents, relative | 无 | candidate_partial |
| 14.1 outcome 6 | concept | 33 | combustion, alkanes, arising, carbon, catalytic, consequences, engine, environmental | 烷烃 (che_alkanes，已抽样核验) | candidate_partial |
| 14.2 outcome 1 | concept | 33 | concentrated, acid, al2, alcohol, alkane, alkenes, can, catalyst | 醇的反应 (che_alcohol_reactions，已抽样核验) | candidate_partial |
| 14.2 outcome 2 | concept | 33 | reaction, acidified, addition, carbon, catalyst, h2, hydrogen, kmno4 | 烯烃 (che_alkenes，已抽样核验) | candidate_partial |
| 15.1 outcome 1 | concept | 34 | reaction, concentrated, hx, substitution, addition, alcohol, alkanes, alkene | 醇的反应 (che_alcohol_reactions，已抽样核验) | candidate_partial |
| 15.1 outcome 3 | concept | 34 | reaction, ethanol, produce, heat, alcohol, amine, aq, aqueous | 亲核取代 (che_nucleophilic_sub，已抽样核验) | candidate_partial |
| 15.1 outcome 4 | concept | 34 | alkene, bromoethane, elimination, ethanol, exemplified, heat, naoh, produce | 消去反应 (che_elimination，已抽样核验) | candidate_partial |
| 15.1 outcome 5 | concept | 34 | sn, alkyl, effects, groups, halogenoalkanes, inductive, mechanisms, nucleophilic | 亲核取代 (che_nucleophilic_sub，已抽样核验) | candidate_partial |
| 15.1 outcome 6 | concept | 34 | halogenoalkanes, mechanism, sn, via, depending, mixture, on, primary | 亲核取代 (che_nucleophilic_sub，已抽样核验) | candidate_partial |
| 15.1 outcome 7 | concept | 34 | halogenoalkanes, aqueous, bonds, different, exemplified, nitrates, particular, reaction | 亲核取代 (che_nucleophilic_sub，已抽样核验) | candidate_partial |
| 16.1 outcome 1 | concept | 35 | dilute, acid, heat, lialh4, reaction, reduction, acidified, addition | 醇的反应 (che_alcohol_reactions，已抽样核验) | candidate_partial |
| 16.1 outcome 2 | concept | 35 | concentrated, reaction, acids, alcohols, carboxylic, acidified, catalyst, h2 | 醇的反应 (che_alcohol_reactions，已抽样核验) | candidate_partial |
| 16.1 outcome 3 | concept | 35 | alcohols, acidified, alcohol, change, characteristic, classify, colour, cr2 | 醇的氧化 (che_alcohol_oxidation，已抽样核验) | ambiguous |
| 17.1 outcome 1 | concept | 36 | acidified, alcohols, aldehydes, cr2, distillation, k2, ketones, kmno4 | 醇的氧化 (che_alcohol_oxidation，已抽样核验) | candidate_partial |
| 17.1 outcome 2 | concept | 36 | aldehydes, ketones, produce, alcohols, catalyst, ethanal, exemplified, hcn | 醛和酮 (che_aldehydes_ketones，已抽样核验) | candidate_partial |
| 17.1 outcome 3 | concept | 36 | addition, aldehydes, cyanide, hydrogen, ketones, mechanism, nucleophilic, reaction | 醛和酮 (che_aldehydes_ketones，已抽样核验) | candidate_partial |
| 17.1 outcome 4 | concept | 36 | carbonyl, compounds, detect, dinitrophenylhydrazine, dnph, presence, reagent | 醛和酮 (che_aldehydes_ketones，已抽样核验) | candidate_partial |
| 17.1 outcome 5 | concept | 36 | aldehyde, carbonyl, compound, deduce, ease, fehling, ketone, nature | 醛和酮 (che_aldehydes_ketones，已抽样核验) | candidate_partial |
| 18.1 outcome 1 | concept | 36 | dilute, acid, acidification, acidified, alkali, followed, hydrolysis, acids | 羧酸 (che_carboxylic_acids，已抽样核验) | candidate_partial |
| 18.1 outcome 2 | concept | 36 | h2, produce, reaction, salt, acid, alcohol, alcohols, alkalis | 羧酸 (che_carboxylic_acids，已抽样核验) | candidate_partial |
| 18.2 outcome 1 | concept | 37 | reaction, acid, alcohol, between, can, carboxylic, catalyst, concentrated | 酯和酰氯 (che_esters，已抽样核验) | candidate_partial |
| 18.2 outcome 2 | concept | 37 | dilute, acid, alkali, esters, heat, hydrolysis | 无 | unresolved_mapping |
| 19.1 outcome 1 | concept | 37 | amines, reaction, at, can, classification, ethanol, halogenoalkane, heated | 胺 (che_amines，已抽样核验) | candidate_partial |
| 19.2 outcome 1 | concept | 37 | reaction, can, ethanol, halogenoalkane, heat, kcn, nitriles, produced | 亲核取代 (che_nucleophilic_sub，已抽样核验) | candidate_partial |
| 19.2 outcome 2 | concept | 37 | reaction, aldehydes, can, catalyst, hcn, heat, hydroxynitriles, kcn | 醛和酮 (che_aldehydes_ketones，已抽样核验) | candidate_partial |
| 20.1 outcome 1 | concept | 37 | poly, addition, chloroethene, ethene, exemplified, polymerisation, pvc | 加聚反应 (che_addition_polymer，已抽样核验) | candidate_partial |
| 20.1 outcome 2 | concept | 37 | addition, deduce, given, monomer, obtained, polymer, repeat, unit | 加聚反应 (che_addition_polymer，已抽样核验) | candidate_partial |
| 20.1 outcome 3 | concept | 37 | addition, given, identify, molecule, monomer, polymer, present, section | 加聚反应 (che_addition_polymer，已抽样核验) | candidate_partial |
| 20.1 outcome 4 | concept | 37 | alkene, biodegradability, combustion, difficulty, disposal, harmful, non, poly | 加聚反应 (che_addition_polymer，已抽样核验) | candidate_partial |
| 21.1 outcome 1 | concept | 38 | functional, groups, organic, reaction, containing, identify, molecule, predict | 反应机理类型 (che_mechanism_types，已抽样核验) | candidate_partial |
| 21.1 outcome 2 | concept_and_skill | 38 | devise, molecules, multi, organic, preparing, reaction, routes, step | 官能团与有机结构表示 (che_organic_representations，已抽样核验) | skill_mapping_required |
| 21.1 outcome 3 | concept | 38 | analyse, analysis, each, given, possible, products, reaction, reagents | 反应机理类型 (che_mechanism_types，已抽样核验) | candidate_partial |
| 22.1 outcome 1 | concept | 38 | functional, groups, analyse, data, identify, infrared, molecule, required | 红外光谱 (che_ir，已抽样核验) | candidate_partial |
| 22.2 outcome 1 | concept | 38 | mass, abundances, analyse, isotopic, knowledge, required, spectra, spectrometer | 质谱分析 (che_mass_spec，已抽样核验) | candidate_partial |
| 22.2 outcome 2 | concept_and_skill | 38 | mass, relative, abundances, atomic, calculate, element, given, isotopes | 同位素 (che_isotopes，已抽样核验) | candidate_partial |
| 22.2 outcome 3 | concept | 38 | mass, molecular, deduce, ion, molecule, organic, peak, spectrum | 质谱分析 (che_mass_spec，已抽样核验) | candidate_partial |
| 22.2 outcome 4 | concept | 38 | formed, fragmentation, given, identity, mass, molecules, simple, spectrum | 质谱分析 (che_mass_spec，已抽样核验) | candidate_partial |
| 22.2 outcome 5 | concept | 38 | ion, abundance, atoms, carbon, compound, deduce, formula, number | 质谱分析 (che_mass_spec，已抽样核验) | candidate_partial |
| 22.2 outcome 6 | concept | 38 | atoms, bromine, compound, deduce, halogen, peak, presence | 质谱分析 (che_mass_spec，已抽样核验) | candidate_partial |
| 23.1 outcome 1 | concept | 39 | change, lattice, atomisation, define, energy, enthalpy, gas, ion | 晶格能与玻恩-哈伯循环 (che_born_haber，已抽样核验) | candidate_partial |
| 23.1 outcome 2 | concept | 39 | electron, affinities, elements, group, affecting, affinity, define, ea | 晶格能与玻恩-哈伯循环 (che_born_haber，已抽样核验) | candidate_partial |
| 23.1 outcome 3 | concept_and_skill | 39 | anions, born, cations, construct, cycles, haber, ionic, limited | 晶格能与玻恩-哈伯循环 (che_born_haber，已抽样核验) | candidate_partial |
| 23.1 outcome 4 | concept | 39 | born, calculations, carry, cycles, haber, involving, out | 晶格能与玻恩-哈伯循环 (che_born_haber，已抽样核验) | candidate_partial |
| 23.1 outcome 5 | concept | 39 | ionic, charge, effect, energy, lattice, magnitude, numerical, on | 晶格能与玻恩-哈伯循环 (che_born_haber，已抽样核验) | candidate_partial |
| 23.2 outcome 1 | concept | 39 | change, define, enthalpy, hydration, reference, solution, term, δhhyd | 焓变 (che_enthalpy，已抽样核验) | candidate_partial |
| 23.2 outcome 2 | concept_and_skill | 39 | change, energy, enthalpy, construct, cycle, hydration, involving, lattice | 晶格能与玻恩-哈伯循环 (che_born_haber，已抽样核验) | candidate_partial |
| 23.2 outcome 3 | concept | 39 | calculations, carry, cycles, energy, involving, out | 盖斯定律 (che_hess，已抽样核验) | candidate_partial |
| 23.2 outcome 4 | concept | 39 | ionic, change, charge, effect, enthalpy, hydration, magnitude, numerical | 晶格能与玻恩-哈伯循环 (che_born_haber，已抽样核验) | candidate_partial |
| 23.3 outcome 1 | concept | 40 | arrangements, define, energy, entropy, given, number, particle, possible | 熵 (che_entropy，已抽样核验) | candidate_partial |
| 23.3 outcome 2 | concept | 40 | change, during, boiling, changes, dissolving, entropy, gaseous, melting | 熵 (che_entropy，已抽样核验) | candidate_partial |
| 23.3 outcome 3 | concept_and_skill | 40 | δs, products, reactants, σs, calculate, change, entropies, entropy | 熵 (che_entropy，已抽样核验) | candidate_partial |
| 23.4 outcome 1 | concept | 40 | equation, gibbs, tδs, δg, δh | 吉布斯自由能 (che_gibbs，已抽样核验) | candidate_partial |
| 23.4 outcome 2 | concept_and_skill | 40 | calculations, equation, perform, tδs, δg, δh | 吉布斯自由能 (che_gibbs，已抽样核验) | candidate_partial |
| 23.4 outcome 4 | concept | 40 | change, changes, effect, enthalpy, entropy, feasibility, given, on | 吉布斯自由能 (che_gibbs，已抽样核验) | candidate_partial |
| 24.1 outcome 1 | concept | 40 | aqueous, concentration, during, electrode, electrolysis, electrolyte, identities, liberated | 电解 (che_electrolysis，已抽样核验) | candidate_partial |
| 24.1 outcome 2 | concept | 40 | constant, avogadro, between, charge, electron, faraday, le, on | 摩尔与阿伏伽德罗常数 (che_mole，已抽样核验) | candidate_partial |
| 24.1 outcome 3 | concept_and_skill | 40 | during, electrolysis, calculate, charge, liberated, mass, passed, quantity | 电解 (che_electrolysis，已抽样核验) | candidate_partial |
| 24.1 outcome 4 | concept | 40 | avogadro, constant, determination, electrolytic, method, value | 摩尔与阿伏伽德罗常数 (che_mole，已抽样核验) | candidate_partial |
| 24.2 outcome 1 | concept | 41 | potential, standard, cell, define, electrode, reduction, terms | 电极电势 (che_electrode_potential，已抽样核验) | candidate_partial |
| 24.2 outcome 2 | concept | 41 | electrode, hydrogen, standard | 电极电势 (che_electrode_potential，已抽样核验) | candidate_partial |
| 24.2 outcome 3 | concept | 41 | ion, metals, aqueous, contact, different, electrode, element, measure | 电极电势 (che_electrode_potential，已抽样核验) | candidate_partial |
| 24.2 outcome 5 | concept | 41 | cell, deduce, circuit, direction, each, electrode, electron, external | 电化学电池 (che_cells，已抽样核验) | candidate_partial |
| 24.2 outcome 6 | concept | 41 | agents, compounds, deduce, elements, ion, oxidising, reactivity, reducing | 电极电势 (che_electrode_potential，已抽样核验) | candidate_partial |
| 24.2 outcome 8 | concept | 41 | aqueous, concentrations, electrode, how, ion, potential, predict, qualitatively | 电极电势 (che_electrode_potential，已抽样核验) | candidate_partial |
| 24.2 outcome 9 | concept | 41 | aq, species, 2e, aqueous, concentrations, cu, cu2, electrode | 电极电势 (che_electrode_potential，已抽样核验) | candidate_partial |
| 25.1 outcome 2 | concept | 42 | pairs, acid, base, conjugate, define, identifying, reaction, such | 布朗斯特-洛瑞理论 (che_bronsted，已抽样核验) | candidate_partial |
| 25.1 outcome 3 | concept | 42 | ka, kb, kw, calculations, define, equation, mathematically, ph | pH 与酸解离常数 (che_ph_ka，已抽样核验) | candidate_partial |
| 25.1 outcome 4 | concept_and_skill | 42 | acids, strong, alkalis, aq, calculate, ph, values, weak | 强酸与弱酸 (che_strong_weak，已抽样核验) | candidate_partial |
| 25.1 outcome 5 | concept | 42 | buffer, how, ph, solution, solutions, blood, can, chemical | 缓冲剂 (che_buffers，已抽样核验) | candidate_partial |
| 25.1 outcome 6 | concept_and_skill | 42 | appropriate, buffer, calculate, data, given, ph, solutions | 缓冲剂 (che_buffers，已抽样核验) | candidate_partial |
| 25.1 outcome 8 | concept | 42 | expression, ksp, write | 溶度积 (che_ksp，已抽样核验) | candidate_partial |
| 25.1 outcome 9 | concept_and_skill | 42 | calculate, concentrations, ksp, versa, vice | 溶度积 (che_ksp，已抽样核验) | candidate_partial |
| 25.1 outcome 10 | concept_and_skill | 42 | common, ion, calculations, compound, concentration, containing, different, effect | 溶度积 (che_ksp，已抽样核验) | candidate_partial |
| 26.1 outcome 1 | concept | 43 | rate, order, reaction, constant, determining, equation, half, intermediate | 速率方程与反应级数 (che_rate_equation，已抽样核验) | candidate_partial |
| 26.1 outcome 2 | concept_and_skill | 43 | rate, concentration, data, equation, experimental, form, graphs, initial | 速率方程与反应级数 (che_rate_equation，已抽样核验) | candidate_partial |
| 26.1 outcome 3 | concept | 43 | first, half, life, order, reaction, calculations, concentration, independent | 速率方程与反应级数 (che_rate_equation，已抽样核验) | candidate_partial |
| 26.1 outcome 4 | concept_and_skill | 43 | equation, rate, t1, calculate, constant, example, half, initial | 速率方程与反应级数 (che_rate_equation，已抽样核验) | candidate_partial |
| 26.1 outcome 5 | concept | 43 | reaction, rate, given, mechanism, equation, step, determining, identify | 速控步 (che_rds，已抽样核验) | candidate_partial |
| 26.1 outcome 6 | concept | 43 | rate, change, constant, effect, hence, on, qualitatively, reaction | 速率方程与反应级数 (che_rate_equation，已抽样核验) | candidate_partial |
| 26.2 outcome 2 | concept | 43 | action, adsorption, bond, car, catalyst, catalytic, desorption, engines | 催化 (che_catalysis，已抽样核验) | candidate_partial |
| 26.2 outcome 3 | concept | 43 | atmospheric, step, action, being, catalyst, dioxide, example, fe2 | 氮和硫 (che_nitrogen_sulfur，已抽样核验) | candidate_partial |
| 27.1 outcome 1 | concept | 44 | anion, carbonates, effect, ionic, large, nitrates, on, polarisation | 第2族元素化学 (che_group2，已抽样核验) | candidate_partial |
| 27.1 outcome 2 | concept | 44 | change, enthalpy, energy, hydration, hydroxides, lattice, magnitudes, qualitatively | 第2族元素化学 (che_group2，已抽样核验) | candidate_partial |
| 28.1 outcome 1 | concept | 44 | element, block, define, forms, incomplete, ion, more, one | 过渡金属性质 (che_transition_props，已抽样核验) | candidate_partial |
| 28.1 outcome 4 | concept | 44 | 3d, 4s, elements, energy, have, oxidation, shells, similarity | 过渡金属性质 (che_transition_props，已抽样核验) | candidate_partial |
| 28.1 outcome 5 | concept | 44 | accessible, behave, bonds, can, catalysts, dative, elements, energetically | 过渡金属性质 (che_transition_props，已抽样核验) | candidate_partial |
| 28.1 outcome 6 | concept | 44 | accessible, complex, elements, energetically, form, ion, orbitals, terms | 配位离子与配体 (che_complex_ions，已抽样核验) | candidate_partial |
| 28.2 outcome 1 | concept | 45 | complexes, ii, ion, ammonia, chloride, cobalt, copper, elements | 配位离子与配体 (che_complex_ions，已抽样核验) | candidate_partial |
| 28.2 outcome 2 | concept | 45 | atom, bond, central, contains, covalent, dative, define, electron | 共价键 (che_covalent，已抽样核验) | candidate_partial |
| 28.2 outcome 3 | concept | 45 | ligand, examples, h2, bidentate, c2, ch2, cl, cn | 配位离子与配体 (che_complex_ions，已抽样核验) | candidate_partial |
| 28.2 outcome 4 | concept | 45 | ion, atom, central, complex, define, formed, ligands, metal | 配位离子与配体 (che_complex_ions，已抽样核验) | candidate_partial |
| 28.2 outcome 5 | concept | 45 | angles, bond, complexes, element, geometry, linear, octahedral, planar | 配位离子与配体 (che_complex_ions，已抽样核验) | candidate_partial |
| 28.2 outcome 6 | concept | 45 | charge, coordination, ion, number, complex, formula, geometry, given | 配位离子与配体 (che_complex_ions，已抽样核验) | candidate_partial |
| 28.2 outcome 7 | concept | 45 | ion, ii, ammonia, can, chloride, cobalt, complexes, copper | 配位离子与配体 (che_complex_ions，已抽样核验) | candidate_partial |
| 28.2 outcome 8 | concept | 45 | elements, feasibility, involving, ion, predict, reaction, redox, transition | 电极电势 (che_electrode_potential，已抽样核验) | candidate_partial |
| 28.2 outcome 9 | concept_and_skill | 45 | data, given, suitable, acid, mno4, solution, c2, calculations | 氧化还原方程 (che_redox_equations，已抽样核验) | candidate_partial |
| 28.2 outcome 10 | concept_and_skill | 45 | calculations, data, given, involving, other, perform, redox, suitable | 氧化还原方程 (che_redox_equations，已抽样核验) | candidate_partial |
| 28.3 outcome 1 | concept | 45 | degenerate, define, non, orbitals, terms | 颜色与催化 (che_colour_catalysis，已抽样核验) | candidate_partial |
| 28.3 outcome 2 | concept | 45 | orbitals, higher, two, complexes, degenerate, lower, three, energy | 颜色与催化 (che_colour_catalysis，已抽样核验) | candidate_partial |
| 28.3 outcome 3 | concept | 45 | absorbed, between, coloured, compounds, degenerate, electron, elements, form | 颜色与催化 (che_colour_catalysis，已抽样核验) | candidate_partial |
| 28.3 outcome 4 | concept | 45 | absorbed, colour, complementary, different, effects, frequency, hence, ligands | 颜色与催化 (che_colour_catalysis，已抽样核验) | candidate_partial |
| 28.3 outcome 5 | concept | 45 | ion, ii, affecting, ammonia, chloride, cobalt, colour, complexes | 配位离子与配体 (che_complex_ions，已抽样核验) | candidate_partial |
| 28.4 outcome 1 | concept | 46 | h2, ch2, nch2, nh2, ni, isomerism, nh3, such | 同分异构 (che_isomerism，已抽样核验) | candidate_partial |
| 28.4 outcome 2 | concept | 46 | complexes, deduce, described, overall, polarity, such, those | 配位离子与配体 (che_complex_ions，已抽样核验) | candidate_partial |
| 28.5 outcome 1 | concept | 46 | complex, constant, ion, constituent, define, equilibrium, formation, kstab | 配位离子与配体 (che_complex_ions，已抽样核验) | candidate_partial |
| 28.5 outcome 2 | concept | 46 | complex, expression, h2o, included, kstab, write | 配位离子与配体 (che_complex_ions，已抽样核验) | candidate_partial |
| 28.5 outcome 3 | concept_and_skill | 46 | calculations, expressions, kstab, perform | 配位离子与配体 (che_complex_ions，已抽样核验) | candidate_partial |
| 28.5 outcome 4 | concept | 46 | kstab, complex, due, exchanges, formation, ion, large, ligand | 配位离子与配体 (che_complex_ions，已抽样核验) | candidate_partial |
| 29.1 outcome 1 | concept | 48 | chemical, compounds, contain, dictates, functional, group, on, page | 命名法 (che_nomenclature，已抽样核验) | candidate_partial |
| 29.1 outcome 2 | concept | 48 | classes, compound, displayed, formulas, general, interpret, on, page | 命名法 (che_nomenclature，已抽样核验) | candidate_partial |
| 29.1 outcome 3 | concept | 48 | six, atoms, carbon, esters, up, aliphatic, amides, chains | 命名法 (che_nomenclature，已抽样核验) | candidate_partial |
| 29.1 outcome 4 | concept | 48 | one, simple, acid, aromatic, benzene, example, molecules, more | 命名法 (che_nomenclature，已抽样核验) | candidate_partial |
| 29.2 outcome 1 | concept | 48 | addition, associated, electrophilic, elimination, following, mechanisms, organic, substitution | 亲电取代 (che_electrophilic_sub，已抽样核验) | candidate_partial |
| 29.3 outcome 1 | concept | 48 | aromatic, benzene, bonds, delocalised, hybridisation, molecules, other, shape | 苯的结构 (che_benzene，已抽样核验) | candidate_partial |
| 29.4 outcome 1 | concept | 48 | ability, activity, apart, biological, chemical, enantiomers, have, identical | 同分异构 (che_isomerism，已抽样核验) | candidate_partial |
| 29.4 outcome 2 | concept | 48 | active, mixture, optically, racemic, terms | 同分异构 (che_isomerism，已抽样核验) | candidate_partial |
| 29.4 outcome 3 | concept | 48 | effect, isomers, light, on, optical, plane, polarised, single | 同分异构 (che_isomerism，已抽样核验) | candidate_partial |
| 29.4 outcome 4 | concept | 48 | chiral, compounds, enantiomers, pure, two, activity, appreciate, biological | 同分异构 (che_isomerism，已抽样核验) | candidate_partial |
| 30.1 outcome 1 | concept | 49 | alcl3, heat, acid, benzene, catalyst, concentrated, crafts, form | 亲电取代 (che_electrophilic_sub，已抽样核验) | candidate_partial |
| 30.1 outcome 2 | concept | 49 | arenes, substitution, addition, aromatic, bromobenzene, delocalisation, effect, electron | 苯的结构 (che_benzene，已抽样核验) | candidate_partial |
| 30.1 outcome 3 | concept | 49 | arenes, aromatic, chain, conditions, depending, halogenation, occur, on | 烷烃 (che_alkanes，已抽样核验) | candidate_partial |
| 30.1 outcome 4 | concept | 49 | different, arenes, cooh, cor, direct, directing, effects, electrophilic | 亲电取代 (che_electrophilic_sub，已抽样核验) | candidate_partial |
| 31.1 outcome 1 | concept | 49 | form, chloromethylbenzene, albr3, alcl3, arene, benzene, br2, can | 亲电取代 (che_electrophilic_sub，已抽样核验) | candidate_partial |
| 31.1 outcome 2 | concept | 49 | between, chlorobenzene, chloroethane, difference, exemplified, halogenoalkane, halogenoarene, reactivity | 亲核取代 (che_nucleophilic_sub，已抽样核验) | candidate_partial |
| 32.1 outcome 1 | concept | 50 | acyl, chlorides, esters, ethanoate, ethyl, form, reaction | 酯和酰氯 (che_esters，已抽样核验) | candidate_partial |
| 32.2 outcome 5 | concept | 50 | benzene, bromination, conditions, different, nitration, phenol, reagents, those | 亲电取代 (che_electrophilic_sub，已抽样核验) | candidate_partial |
| 33.1 outcome 1 | concept | 50 | acid, reaction, alkaline, alkylbenzene, benzoic, can, dilute, exemplified | 羧酸 (che_carboxylic_acids，已抽样核验) | candidate_partial |
| 33.1 outcome 2 | concept | 50 | acids, acyl, carboxylic, chlorides, form, heat, pcl3, pcl5 | 羧酸 (che_carboxylic_acids，已抽样核验) | candidate_partial |
| 33.1 outcome 3 | concept | 50 | acidified, acid, carbon, dioxide, kmno4, oxidation, reagent, acids | 烯烃 (che_alkenes，已抽样核验) | candidate_partial |
| 33.1 outcome 4 | concept | 50 | acidities, acids, alcohols, carboxylic, phenols, relative | 羧酸 (che_carboxylic_acids，已抽样核验) | candidate_partial |
| 33.1 outcome 5 | concept | 50 | acidities, acids, carboxylic, halogen, relative, substituted | 羧酸 (che_carboxylic_acids，已抽样核验) | candidate_partial |
| 33.2 outcome 1 | concept | 51 | reaction, acyl, alcohols, benzoate, can, chlorides, esters, ethanoate | 酯和酰氯 (che_esters，已抽样核验) | candidate_partial |
| 33.3 outcome 1 | concept | 51 | reaction, acids, acyl, can, carboxylic, chlorides, conditions, heat | 羧酸 (che_carboxylic_acids，已抽样核验) | candidate_partial |
| 33.3 outcome 2 | concept | 51 | at, hcl, reaction, room, temperature, produce, amide, ester | 酯和酰氯 (che_esters，已抽样核验) | candidate_partial |
| 33.3 outcome 4 | concept | 51 | chlorides, acyl, alkyl, aryl, ease, halogenoarenes, hydrolysis, relative | 酯和酰氯 (che_esters，已抽样核验) | candidate_partial |
| 34.1 outcome 1 | concept | 51 | reaction, amines, ethanol, halogenoalkanes, heated, lialh4, pressure, primary | 胺 (che_amines，已抽样核验) | candidate_partial |
| 34.1 outcome 2 | concept | 51 | acyl, amide, amine, ammonia, at, chloride, condensation, reaction | 胺 (che_amines，已抽样核验) | candidate_partial |
| 34.2 outcome 1 | concept | 52 | followed, aq, benzene, concentrated, form, hcl, hot, naoh | 胺 (che_amines，已抽样核验) | candidate_partial |
| 34.2 outcome 3 | concept | 52 | ammonia, aqueous, basicities, ethylamine, phenylamine, relative | 胺 (che_amines，已抽样核验) | candidate_partial |
| 34.3 outcome 1 | concept | 52 | reaction, acyl, at, between, chloride, room, temperature, amides | 胺 (che_amines，已抽样核验) | candidate_partial |
| 34.4 outcome 1 | concept | 52 | acid, acids, amino, base, formation, include, isoelectric, point | 氨基酸与蛋白质 (che_amino_acids，已抽样核验) | candidate_partial |
| 34.4 outcome 2 | concept | 52 | acids, amide, amino, between, bonds, di, formation, peptide | 氨基酸与蛋白质 (che_amino_acids，已抽样核验) | candidate_partial |
| 34.4 outcome 3 | practical_skill | 52 | acids, amino, apparatus, assembling, at, dipeptides, electrophoresis, interpret | 氨基酸与蛋白质 (che_amino_acids，已抽样核验) | skill_mapping_required |
| 35.1 outcome 1 | concept | 53 | acid, reaction, between, chloride, dicarboxylic, diol, dioyl, formation | 缩聚反应 (che_condensation_polymer，已抽样核验) | candidate_partial |
| 35.1 outcome 2 | concept | 53 | reaction, acid, between, acids, amino, aminocarboxylic, chloride, diamine | 缩聚反应 (che_condensation_polymer，已抽样核验) | candidate_partial |
| 35.1 outcome 3 | concept | 53 | condensation, deduce, given, monomer, monomers, obtained, pair, polymer | 缩聚反应 (che_condensation_polymer，已抽样核验) | candidate_partial |
| 35.1 outcome 4 | concept | 53 | condensation, given, identify, molecule, monomer, polymer, present, section | 缩聚反应 (che_condensation_polymer，已抽样核验) | candidate_partial |
| 35.2 outcome 1 | concept | 53 | given, monomer, monomers, pair, polymerisation, predict, reaction, type | 加聚反应 (che_addition_polymer，已抽样核验) | candidate_partial |
| 35.2 outcome 2 | concept | 53 | deduce, given, molecule, polymer, polymerisation, produces, reaction, section | 加聚反应 (che_addition_polymer，已抽样核验) | candidate_partial |
| 35.3 outcome 1 | concept | 53 | alkenes, biodegrade, can, chemically, difficult, inert, poly, recognise | 加聚反应 (che_addition_polymer，已抽样核验) | candidate_partial |
| 35.3 outcome 3 | concept | 53 | acidic, alkaline, biodegradable, hydrolysis, polyamides, polyesters, recognise | 缩聚反应 (che_condensation_polymer，已抽样核验) | candidate_partial |
| 36.1 outcome 1 | concept | 53 | functional, groups, organic, reaction, containing, identify, molecule, predict | 反应机理类型 (che_mechanism_types，已抽样核验) | candidate_partial |
| 36.1 outcome 2 | concept_and_skill | 53 | devise, molecules, multi, organic, preparing, reaction, routes, step | 官能团与有机结构表示 (che_organic_representations，已抽样核验) | skill_mapping_required |
| 36.1 outcome 3 | concept | 53 | analyse, each, given, possible, products, reaction, reagents, route | 反应机理类型 (che_mechanism_types，已抽样核验) | candidate_partial |
| 37.1 outcome 1 | concept | 54 | phase, polar, solvent, aluminium, baseline, example, front, mobile | 色谱法 (che_chromatography，已抽样核验) | candidate_partial |
| 37.1 outcome 2 | concept | 54 | interpret, rf, values | 色谱法 (che_chromatography，已抽样核验) | candidate_partial |
| 37.1 outcome 3 | concept | 54 | phase, differences, interaction, mobile, relative, rf, solubility, stationary | 色谱法 (che_chromatography，已抽样核验) | candidate_partial |
| 37.2 outcome 1 | concept | 54 | phase, boiling, gas, high, liquid, mobile, non, on | 色谱法 (che_chromatography，已抽样核验) | candidate_partial |
| 37.2 outcome 2 | concept | 54 | chromatograms, composition, gas, interpret, liquid, mixture, percentage, terms | 色谱法 (che_chromatography，已抽样核验) | candidate_partial |
| 37.2 outcome 3 | concept | 54 | interaction, phase, retention, stationary, terms, times | 色谱法 (che_chromatography，已抽样核验) | candidate_partial |
| 37.3 outcome 1 | concept | 54 | carbon, molecule, analyse, atoms, deduce, different, environments, interpret | NMR光谱 (che_nmr，已抽样核验) | candidate_partial |
| 37.3 outcome 2 | concept | 54 | carbon, given, molecule, nmr, number, peaks, predict, spectrum | NMR光谱 (che_nmr，已抽样核验) | candidate_partial |
| 37.4 outcome 1 | concept | 55 | proton, molecule, present, relative, adjacent, analyse, areas, atom | NMR光谱 (che_nmr，已抽样核验) | candidate_partial |
| 37.4 outcome 2 | concept | 55 | chemical, given, molecule, patterns, predict, proton, shifts, splitting | NMR光谱 (che_nmr，已抽样核验) | candidate_partial |
| 37.4 outcome 3 | concept | 55 | chemical, measurement, shift, standard, tetramethylsilane, tms | NMR光谱 (che_nmr，已抽样核验) | candidate_partial |
| 37.4 outcome 4 | concept | 55 | cdcl3, deuterated, need, nmr, obtaining, proton, solvents, spectrum | NMR光谱 (che_nmr，已抽样核验) | candidate_partial |
| 37.4 outcome 5 | concept | 55 | proton, d2o, exchange, identification | NMR光谱 (che_nmr，已抽样核验) | candidate_partial |

## 现有 KG 中未被高置信命中的概念

- 亚原子粒子（Subatomic Particles，`che_subatomic`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 电子排布（Electronic Configuration，`che_electron_config`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 电离能（Ionisation Energy，`che_ionisation`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 反应质量与气体体积（Reacting Masses and Gas Volumes，`che_reacting_masses`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 浓度与滴定（Concentration and Titration，`che_titration`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- VSEPR 分子形状（Shapes of Molecules (VSEPR)，`che_vsepr`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 分子间作用力（Intermolecular Forces，`che_imf`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 固体结构（Solid Structures，`che_solids`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 焓变（Enthalpy Changes，`che_enthalpy`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 量热法（Calorimetry，`che_calorimetry`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 碰撞理论（Collision Theory，`che_collision`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- Maxwell-Boltzmann分布（Maxwell-Boltzmann Distribution，`che_boltzmann`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 速率方程与反应级数（Rate Equations and Orders，`che_rate_equation`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 速控步（Rate-Determining Step，`che_rds`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 动态平衡（Dynamic Equilibrium，`che_dynamic_eq`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 平衡常数 Kc 与 Kp（Equilibrium Constants Kc and Kp，`che_kc_kp`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 强酸与弱酸（Strong and Weak Acids，`che_strong_weak`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- pH 与酸解离常数（pH and Acid Dissociation Constant，`che_ph_ka`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 缓冲剂（Buffers，`che_buffers`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 电化学电池（Electrochemical Cells，`che_cells`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 电解（Electrolysis，`che_electrolysis`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 晶格能与玻恩-哈伯循环（Lattice Energy and Born-Haber Cycles，`che_born_haber`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 熵（Entropy，`che_entropy`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 第3周期元素与氧化物（Period 3 Elements and Oxides，`che_period3`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 第2族元素化学（Group 2 Chemistry，`che_group2`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 氮和硫（Nitrogen and Sulfur，`che_nitrogen_sulfur`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 配位离子与配体（Complex Ions and Ligands，`che_complex_ions`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 颜色与催化（Colour and Catalysis，`che_colour_catalysis`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 命名法（Nomenclature，`che_nomenclature`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 反应机理类型（Reaction Mechanism Types，`che_mechanism_types`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 烯烃（Alkenes，`che_alkenes`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 消去反应（Elimination Reactions，`che_elimination`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 醇的氧化（Oxidation of Alcohols，`che_alcohol_oxidation`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 醛和酮（Aldehydes and Ketones，`che_aldehydes_ketones`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 羧酸（Carboxylic Acids，`che_carboxylic_acids`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 氨基酸与蛋白质（Amino Acids and Proteins，`che_amino_acids`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 缩聚反应（Condensation Polymers，`che_condensation_polymer`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 苯的结构（Benzene Structure，`che_benzene`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 亲电取代（Electrophilic Substitution，`che_electrophilic_sub`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 质谱分析（Mass Spectrometry，`che_mass_spec`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 红外光谱（Infrared Spectroscopy，`che_ir`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- NMR光谱（NMR Spectroscopy，`che_nmr`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 色谱法（Chromatography，`che_chromatography`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。

## 审核规则

1. 打开来源页和对应 syllabus 页核对原文。
2. 将每项标记为覆盖、部分覆盖、缺失或排除，并写明理由。
3. 只有人工确认后，才可修改正式 KG 的 evidence_refs/review_status。
4. 新增、删除、合并或先修边调整必须单独形成变更记录。
