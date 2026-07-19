#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const DATA = resolve(ROOT, "data/knowledge-graphs");
const TODAY = "2026-07-19";
const SOURCE_ID = "src_sg_seab_h2_chemistry_9476_2026";
const FRAMEWORK_ID = "cfw_sg_seab_h2_chemistry_9476_2026_outcomes";
const CURRICULUM_ID = "cur_sg_seab_h2_chemistry_9476_2026";

const paths = {
  framework: resolve(DATA, "curricula/frameworks/sg_seab_h2_chemistry_9476_2026.json"),
  mapping: resolve(DATA, "curricula/mappings/pending/sg_seab_h2_chemistry_9476_2026.json"),
  gaps: resolve(DATA, "curricula/gaps/pending/sg_seab_h2_chemistry_9476_2026_outcomes.json"),
  practices: resolve(DATA, "pedagogy/practices/sg_seab_h2_chemistry_9476_2026.json"),
  review: resolve(DATA, "review/pending/curriculum-mapping/cms_sg_seab_h2_chemistry_9476_2026_outcomes.review.zh-CN.md"),
  sources: resolve(DATA, "governance/sources.json"),
  aLevel: resolve(DATA, "source/a_level_chemistry.json"),
  senior: resolve(DATA, "source/senior_secondary_chemistry.json"),
};

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};
const unique = (values) => [...new Set(values)];
const officialEvidence = (locator) => [{ source_id: SOURCE_ID, locator }];
const o = (key, summaryZh, legacyIds, options = {}) => ({ key, summaryZh, legacyIds, ...options });
const pageFor = (topicCode, key) => {
  const fixed = { "1": 13, "3": 15, "6": 18, "9": 21, "10_1": 22, "11_1": 25, "11_2": 26, "11_5": 29, "11_7": 31, "11_8": 31, "13": 34 };
  if (fixed[topicCode]) return fixed[topicCode];
  if (topicCode === "2") return key <= "i" ? 14 : 15;
  if (topicCode === "4") return key === "a" ? 15 : 16;
  if (topicCode === "5") return key <= "e" ? 16 : 17;
  if (topicCode === "7") return key === "a" ? 18 : 19;
  if (topicCode === "8") return key === "k" ? 21 : 20;
  if (topicCode === "10_2") return key === "c" ? 23 : 22;
  if (topicCode === "11_3") return key <= "j" ? 26 : 27;
  if (topicCode === "11_4") return key <= "b" ? 28 : 29;
  if (topicCode === "11_6") return key <= "c" ? 29 : 30;
  if (topicCode === "11_9") return key <= "c" ? 31 : 32;
  if (topicCode === "11_10") return key === "g" ? 33 : 32;
  if (topicCode === "12") return key <= "m" ? 33 : 34;
  throw new Error(`Missing exact page for topic ${topicCode} outcome ${key}`);
};

const TOPICS = [
  ["1", "Atomic Structure", "原子结构", "PDF p.13, topic 1 Atomic Structure", [
    o("a", "比较质子、中子和电子的相对质量与电荷", ["che_subatomic"]),
    o("b", "由带电性推断质子、中子和电子束在电场中的偏转", ["che_subatomic"]),
    o("c", "说明原子中质量与电荷的分布", ["che_subatomic"]),
    o("d", "由质子数、核子数和电荷确定原子或离子的质子、中子、电子数", ["che_subatomic"]),
    o("e", "用质子数、核子数和中子数区分原子核与同位素", ["che_subatomic", "che_isotopes"]),
    o("f", "说明 1–3 主量子层及 4s、4p 中 s、p、d 轨道的数目和相对能量", ["che_electron_config"]),
    o("g", "描述 s、p、d 原子轨道形状；不要求波函数", ["che_atomic_orbital_shapes"]),
    o("h", "由质子数和电荷写出原子与离子的电子排布", ["che_electron_config"]),
    o("i", "解释影响元素电离能的因素", ["che_ionisation"]),
    o("j", "由连续电离能数据推断电子排布", ["che_ionisation", "che_electron_config"]),
    o("k", "由连续电离能数据推断元素在周期表中的位置", ["che_ionisation", "che_periodic_trends"]),
  ]],
  ["2", "Chemical Bonding", "化学键", "PDF pp.14-15, topic 2 Chemical Bonding", [
    o("a", "以静电作用定义离子键、共价键和金属键", ["che_ionic", "che_covalent", "che_metallic"]),
    o("b", "用点叉图表示离子键、共价键和配位键", ["che_ionic", "che_covalent"]),
    o("c", "以 s、p 轨道重叠说明 σ 键与 π 键", ["che_covalent"]),
    o("d", "用 VSEPR 解释指定分子的形状和键角", ["che_vsepr"]),
    o("e", "预测与指定实例类似的分子形状和键角", ["che_vsepr"]),
    o("f", "用电负性解释并推断键的极性", ["che_electronegativity"]),
    o("g", "结合键极性与分子形状推断分子极性", ["che_electronegativity", "che_vsepr"]),
    o("h", "描述永久或瞬时偶极作用与氢键", ["che_imf"]),
    o("i", "说明氢键对冰、水等物质物理性质的重要性", ["che_imf"]),
    o("j", "解释共价键的键能与键长", ["che_bond_enthalpy"]),
    o("k", "用键能、键长和键极性比较共价键反应性", ["che_bond_enthalpy", "che_electronegativity"]),
    o("l", "描述离子、简单分子、巨型共价、氢键和金属晶格；不要求晶胞", ["che_solids"]),
    o("m", "解释并预测结构和成键类型对物理性质的影响", ["che_solids"]),
    o("n", "由物理化学信息推断物质的结构与成键类型", ["che_solids"]),
  ]],
  ["3", "The Gaseous State", "气态", "PDF p.15, topic 3 The Gaseous State", [
    o("a", "陈述理想气体动理论的基本假设", ["che_gas_laws"]),
    o("b", "从分子大小和分子间作用解释接近或偏离理想行为的条件", ["che_gas_laws"]),
    o("c", "用 pV=nRT 计算并测定相对分子质量", ["che_gas_laws"]),
    o("d", "用道尔顿分压定律计算混合气体分压", ["che_gas_laws"], { gap: "ideal_gas_mixture_partial_pressures" }),
  ]],
  ["4", "Theories of Acids and Bases", "酸碱理论", "PDF pp.15-16, topic 4 Theories of Acids and Bases", [
    o("a", "理解并应用 Arrhenius 酸碱理论", [], { gap: "acid_base_models_arrhenius_lewis" }),
    o("b", "应用 Brønsted–Lowry 酸碱和共轭酸碱对理论", ["che_bronsted"]),
    o("c", "应用 Lewis 酸碱理论分析非水体系与配位加合", [], { gap: "acid_base_models_arrhenius_lewis" }),
  ]],
  ["5", "The Periodic Table", "周期表", "PDF pp.16-17, topic 5 The Periodic Table", [
    o("a", "识别跨周期与沿族的电子排布变化", ["che_electron_config", "che_periodic_trends"]),
    o("b", "用屏蔽、核电荷和电子层解释原子半径、离子半径、电离能和电负性趋势", ["che_periodic_trends", "che_ionisation"]),
    o("c", "用结构与成键解释同周期熔点和电导率变化", ["che_periodic_trends", "che_solids"]),
    o("d", "用瞬时偶极—诱导偶极作用解释第 17 族挥发性趋势", ["che_group17", "che_imf"]),
    o("e", "解释第 3 周期氧化物和氯化物的氧化态、成键、水解及酸碱性质", ["che_period3"]),
    o("f", "用标准电极电势比较第 2 族还原性和第 17 族氧化性", ["che_group2", "che_group17", "che_electrode_potential"]),
    o("g", "解释第 2 族碳酸盐和第 17 族氢化物热稳定性趋势", ["che_group2", "che_group17", "che_bond_enthalpy"]),
    o("h", "依据周期性预测同族元素的特征性质", ["che_periodic_trends"]),
    o("i", "由物理化学性质推断未知元素的性质、周期表位置与身份", ["che_periodic_trends"]),
  ]],
  ["6", "The Mole Concept and Stoichiometry", "摩尔概念与化学计量", "PDF p.18, topic 6 The Mole Concept and Stoichiometry", [
    o("a", "定义相对原子质量、同位素质量、分子质量和式量", ["che_relative_masses"]),
    o("b", "用阿伏伽德罗常数定义摩尔", ["che_mole"]),
    o("c", "由同位素相对丰度计算相对原子质量", ["che_relative_masses", "che_isotopes"]),
    o("d", "定义实验式与分子式", ["che_formulae"]),
    o("e", "由燃烧数据或质量组成计算实验式与分子式", ["che_formulae"]),
    o("f", "书写并配平化学方程式", ["che_formulae", "che_reacting_masses"]),
    o("g", "用摩尔概念计算反应质量、气体体积和溶液体积浓度", ["che_reacting_masses", "che_titration"]),
    o("h", "由定量计算推断化学计量关系", ["che_reacting_masses"]),
  ]],
  ["7", "Chemical Energetics", "化学能量学", "PDF pp.18-20, topic 7 Chemical Energetics", [
    o("a", "联系化学键断裂形成解释放热与吸热反应", ["che_enthalpy", "che_bond_enthalpy"]),
    o("b", "构建并解释含焓变与活化能的能量剖面图", ["che_enthalpy"]),
    o("c", "解释标准反应焓、键能和晶格能等术语及符号约定", ["che_enthalpy", "che_bond_enthalpy", "che_born_haber"]),
    o("d", "由实验结果用 q=mcΔT 计算焓变", ["che_calorimetry"]),
    o("e", "定性解释离子电荷和半径对晶格能大小的影响", ["che_born_haber"], { gap: "lattice_energy_ionic_factors" }),
    o("f", "用 Hess 循环和 Born–Haber 循环计算不能直接测量的焓变", ["che_hess", "che_born_haber"]),
    o("g", "解释并使用熵的概念", ["che_entropy"]),
    o("h", "讨论温度、相态和粒子数变化对体系熵的定性影响", ["che_entropy"]),
    o("i", "判断过程或反应熵变的正负", ["che_entropy"]),
    o("j", "使用 ΔG°=ΔH°−TΔS°", ["che_gibbs"]),
    o("k", "用 ΔG° 符号判断反应或过程自发性", ["che_gibbs"]),
    o("l", "说明用标准 Gibbs 自由能预测自发性的限制", ["che_gibbs"], { gap: "standard_state_prediction_limits" }),
    o("m", "由标准焓变和熵变预测温度对自发性的影响", ["che_gibbs"]),
  ]],
  ["8", "Reaction Kinetics", "反应动力学", "PDF pp.20-21, topic 8 Reaction Kinetics", [
    o("a", "解释速率方程、级数、速率常数、半衰期、速控步、活化能和催化等术语", ["che_rate", "che_rate_equation", "che_rds", "che_catalysis"]),
    o("b", "由初速、浓度—时间图和机理构建并验证简单速率方程", ["che_rate_equation", "che_rds"]),
    o("c", "说明一级反应半衰期与浓度无关并进行计算", ["che_rate_equation"]),
    o("d", "用初速法计算速率常数", ["che_rate_equation"]),
    o("e", "由给定信息设计研究反应速率的实验技术", [], { practice: true }),
    o("f", "用碰撞频率解释浓度变化对反应速率的影响", ["che_collision"]),
    o("g", "结合 Boltzmann 分布理解活化能", ["che_boltzmann"]),
    o("h", "用 Boltzmann 分布和碰撞频率解释温度对速率常数与速率的影响", ["che_boltzmann", "che_collision"]),
    o("i", "解释催化剂以低活化能机理提高速率常数并联系 Boltzmann 分布", ["che_catalysis", "che_boltzmann"]),
    o("j", "说明均相和非均相催化在 Haber、尾气、酸雨及 Fe²⁺ 催化体系中的作用", ["che_catalysis", "che_nitrogen_sulfur"]),
    o("k", "说明酶作为蛋白质催化剂的专一性、锁钥模型及温度和 pH 敏感性", ["che_catalysis"], { gap: "enzyme_catalysis_specificity_conditions" }),
  ]],
  ["9", "Chemical Equilibria", "化学平衡", "PDF p.21, topic 9 Chemical Equilibria", [
    o("a", "用正逆反应速率解释可逆反应与动态平衡", ["che_dynamic_eq"]),
    o("b", "应用勒夏特列原理判断浓度、压力和温度对平衡组成的影响", ["che_le_chatelier"]),
    o("c", "判断浓度、压力、温度和催化剂是否改变平衡常数", ["che_le_chatelier", "che_kc_kp"]),
    o("d", "写出 Kc 与 Kp 表达式；不要求二者换算关系", ["che_kc_kp"]),
    o("e", "由浓度或分压数据计算平衡常数", ["che_kc_kp"]),
    o("f", "由给定数据计算平衡组成；不要求解二次方程", ["che_kc_kp"]),
    o("g", "结合工业取舍解释 Haber 法条件", ["che_le_chatelier", "che_catalysis"]),
  ]],
  ["10_1", "Acid-Base Equilibria", "酸碱平衡", "PDF p.22, topic 10.1 Acid-Base Equilibria", [
    o("a", "用解离程度解释强弱酸碱行为差异", ["che_strong_weak"]),
    o("b", "解释并计算 pH、Ka、pKa、Kb、pKb、Kw 及 Kw=KaKb", ["che_ph_ka"], { gap: "base_dissociation_and_water_ionic_product" }),
    o("c", "计算强弱单元酸碱的氢离子浓度与 pH；不要求解二次方程", ["che_ph_ka", "che_strong_weak"]),
    o("d", "描述酸碱滴定 pH 变化并以酸碱强度解释曲线", ["che_titration"], { gap: "titration_curves_and_indicators" }),
    o("e", "由数据选择适当酸碱滴定指示剂", ["che_titration"], { gap: "titration_curves_and_indicators" }),
    o("f", "解释缓冲作用、用途、海洋碳酸盐缓冲与二氧化碳驱动的海洋酸化", ["che_buffers"], { gap: "ocean_carbonate_buffer_acidification" }),
    o("g", "由给定数据计算缓冲溶液 pH", ["che_buffers", "che_ph_ka"]),
  ]],
  ["10_2", "Solubility Equilibria", "溶解平衡", "PDF pp.22-23, topic 10.2 Solubility Equilibria", [
    o("a", "理解并应用溶度积 Ksp", ["che_ksp"]),
    o("b", "在 Ksp 与平衡浓度之间进行计算", ["che_ksp"]),
    o("c", "讨论同离子效应和配离子形成对离子盐溶解度的影响", ["che_ksp", "che_complex_ions"], { gap: "complex_ion_solubility_control" }),
  ]],
  ["11_1", "Organic Chemistry Introduction", "有机化学导论", "PDF pp.23-25, topic 11.1 Introduction", [
    o("a", "解释并使用主要有机化合物类别的命名、通式与结构表示", ["che_organic_representations", "che_nomenclature"]),
    o("b", "用乙烷、乙烯、苯和乙炔说明 sp³、sp²、sp 杂化", ["che_covalent"]),
    o("c", "联系 σ、π 键解释指定有机分子的形状和键角", ["che_covalent", "che_vsepr"]),
    o("d", "预测相似有机分子的形状和键角", ["che_covalent", "che_vsepr"]),
  ]],
  ["11_2", "Isomerism", "同分异构", "PDF pp.25-26, topic 11.2 Isomerism", [
    o("a", "描述构造异构", ["che_isomerism"]),
    o("b", "从 π 键限制旋转解释烯烃顺反异构；不要求 E/Z 命名", ["che_isomerism"]),
    o("c", "解释手性中心", ["che_isomerism"]),
    o("d", "由手性中心与对称面判断分子是否手性", ["che_isomerism"]),
    o("e", "联系手性分子与旋转平面偏振光识别旋光样品", ["che_isomerism"]),
    o("f", "比较对映体除旋光方向外相同的物理性质", ["che_isomerism"]),
    o("g", "说明对映体通常化学性质相同但与手性对象作用可不同", ["che_isomerism"]),
    o("h", "说明立体异构体可能具有不同生物作用与药效", ["che_isomerism"]),
    o("i", "由分子式推断可能的有机异构体", ["che_isomerism"]),
    o("j", "从结构式识别手性中心和顺反异构", ["che_isomerism"]),
  ]],
  ["11_3", "Organic Reactions and Mechanisms", "有机反应与机理", "PDF pp.26-27, topic 11.3 Organic Reactions and Mechanisms", [
    o("a", "解释并使用官能团、取代度、键裂、反应物种及反应类型术语", ["che_bond_fission", "che_mechanism_types"]),
    o("b", "用离域、给吸电子效应和位阻解释有机反应性", ["che_mechanism_types"], { gap: "organic_electronic_steric_effects" }),
    o("c", "解释烷烃对极性试剂的一般惰性", ["che_alkanes"]),
    o("d", "解释烯烃对亲电试剂的一般反应性", ["che_alkenes"]),
    o("e", "用 π 电子离域比较苯和烯烃的反应性及苯偏好取代的原因", ["che_benzene"]),
    o("f", "用碳卤键强度解释卤代烷水解反应性差异", ["che_nucleophilic_sub"]),
    o("g", "用孤对电子离域与位阻解释氯苯对亲核取代的惰性", ["che_nucleophilic_sub", "che_benzene"]),
    o("h", "解释羰基化合物对氰化氢等亲核试剂的反应性", ["che_aldehydes_ketones", "che_nitriles"]),
    o("i", "把反应术语与反应性术语用于结构、成键和机理解释", ["che_mechanism_types", "che_bond_fission"]),
    o("j", "用电子从富电子位点流向缺电子位点解释极性反应机理", ["che_mechanism_types"]),
    o("k", "描述乙烷氯化自由基取代的引发、传播和终止", ["che_bond_fission", "che_alkanes"]),
    o("l", "描述乙烯与溴的亲电加成机理", ["che_alkenes", "che_mechanism_types"]),
    o("m", "描述苯单溴化的亲电取代机理及离域影响", ["che_electrophilic_sub", "che_benzene"]),
    o("n", "以碳正离子稳定性和位阻解释卤代烷 SN1 与 SN2 机理", ["che_nucleophilic_sub"]),
    o("o", "描述氰化氢与醛酮的亲核加成机理", ["che_nitriles", "che_aldehydes_ketones"]),
  ]],
  ["11_4", "Hydrocarbons", "烃", "PDF pp.27-29, topic 11.4 Hydrocarbons", [
    o("a", "描述乙烷燃烧和紫外光下自由基卤代", ["che_alkanes", "che_bond_fission"]),
    o("b", "描述乙烯的亲电加成、催化加氢及冷、热锰酸根氧化", ["che_alkenes"]),
    o("c", "应用 Markovnikov 规则并以碳正离子稳定性解释产物组成", ["che_alkenes"]),
    o("d", "描述苯和甲苯的卤化、硝化与 Friedel–Crafts 烷基化", ["che_electrophilic_sub", "che_benzene"]),
    o("e", "描述甲苯侧链的自由基卤代与完全氧化", ["che_alkanes", "che_benzene"]),
    o("f", "由条件判断芳烃卤化发生在侧链还是芳环", ["che_benzene", "che_electrophilic_sub"]),
    o("g", "应用单取代芳烃亲电取代的定位规律", ["che_electrophilic_sub"]),
    o("h", "说明内燃机污染物、催化净化及增强温室效应气体的环境后果", ["che_nitrogen_sulfur"], { gap: "combustion_pollutants_greenhouse" }),
  ]],
  ["11_5", "Halogen Derivatives", "卤素衍生物", "PDF p.29, topic 11.5 Halogen Derivatives", [
    o("a", "描述卤代烷的亲核取代与消去反应及条件", ["che_nucleophilic_sub", "che_elimination", "che_nitriles", "che_amines"]),
    o("b", "解释手性底物 SN2 构型反转与 SN1 外消旋化", ["che_nucleophilic_sub"], { gap: "nucleophilic_substitution_stereochemistry" }),
    o("c", "设计特征反应区分不同卤代烷及卤代烷与卤代芳烃", ["che_nucleophilic_sub", "che_group17"]),
    o("d", "用相对惰性解释氟代烷与氟卤代烷的用途", ["che_nucleophilic_sub"]),
    o("e", "说明 CFC 对臭氧层及 HFC、HCFC 替代物的显著环境影响", [], { gap: "halocarbon_environmental_impacts" }),
  ]],
  ["11_6", "Hydroxy Compounds", "羟基化合物", "PDF pp.29-30, topic 11.6 Hydroxy Compounds", [
    o("a", "描述乙醇燃烧、取代、与钠反应、氧化及脱水", ["che_alcohol_reactions", "che_alcohol_oxidation"]),
    o("b", "用特征反应区分伯、仲、叔醇", ["che_alcohol_reactions", "che_alcohol_oxidation"]),
    o("c", "用三碘甲烷反应检验 CH3CH(OH)– 结构", ["che_iodoform_test"]),
    o("d", "描述苯酚与碱、钠及芳环硝化和溴化反应", ["che_phenol_acid_base", "che_phenol_ring_reactivity"]),
    o("e", "从结构解释水、苯酚和乙醇在水中的相对酸性", ["che_phenol_acid_base", "che_bronsted"]),
  ]],
  ["11_7", "Carbonyl Compounds", "羰基化合物", "PDF pp.30-31, topic 11.7 Carbonyl Compounds", [
    o("a", "描述醛酮由醇形成及还原回伯仲醇", ["che_aldehydes_ketones", "che_alcohol_oxidation"]),
    o("b", "描述醛酮与氰化氢的反应", ["che_aldehydes_ketones", "che_nitriles"]),
    o("c", "用 2,4-DNPH 检验羰基化合物", ["che_aldehydes_ketones"]),
    o("d", "用 Fehling、Tollens 和氧化结果区分未知醛酮", ["che_aldehydes_ketones"]),
    o("e", "用三碘甲烷反应检验 CH3CO– 结构", ["che_iodoform_test", "che_aldehydes_ketones"]),
  ]],
  ["11_8", "Carboxylic Acids and Derivatives", "羧酸及其衍生物", "PDF pp.30-31, topic 11.8 Carboxylic Acids and Derivatives", [
    o("a", "由伯醇、醛和腈制备羧酸", ["che_carboxylic_acids", "che_nitriles"]),
    o("b", "描述羧酸形成盐、酯、酰氯及还原成伯醇", ["che_carboxylic_acids", "che_esters"]),
    o("c", "从结构解释羧酸和氯代乙酸的酸性", ["che_carboxylic_acids"]),
    o("d", "描述酰氯与水的水解", ["che_esters"]),
    o("e", "描述酰氯与醇、苯酚和伯胺的缩合", ["che_esters", "che_amides"]),
    o("f", "解释酰氯、卤代烷和卤代芳烃水解难易差异", ["che_esters", "che_nucleophilic_sub"]),
    o("g", "描述酰氯缩合形成酯", ["che_esters"]),
    o("h", "描述酯的酸性和碱性水解", ["che_esters"]),
  ]],
  ["11_9", "Nitrogen Compounds", "含氮化合物", "PDF pp.31-32, topic 11.9 Nitrogen Compounds", [
    o("a", "由酰胺、腈和硝基苯制备乙胺或苯胺", ["che_amines", "che_amides", "che_nitriles"]),
    o("b", "描述胺形成盐的反应", ["che_amines"]),
    o("c", "以 Lewis 碱解释气相伯仲叔胺碱性", ["che_amines"]),
    o("d", "从结构解释水相氨、乙胺和苯胺的相对碱性", ["che_amines"]),
    o("e", "描述苯胺与溴水反应", ["che_amines"]),
    o("f", "描述伯胺与酰氯缩合形成酰胺", ["che_amides"]),
    o("g", "用氮孤对电子离域解释酰胺中性", ["che_amides"]),
    o("h", "描述酰胺的酸碱水解及 LiAlH4 还原", ["che_amides"]),
    o("i", "描述氨基酸的酸碱性质", ["che_amino_acids"]),
  ]],
  ["11_10", "Polymers", "聚合物", "PDF pp.32-33, topic 11.10 Polymers", [
    o("a", "识别由单体构成且达到规定平均相对分子质量或重复单元数的聚合物", ["che_addition_polymer", "che_condensation_polymer"]),
    o("b", "分类并解释加聚与缩聚的差异", ["che_addition_polymer", "che_condensation_polymer"]),
    o("c", "把蛋白质描述为 α-氨基酸经肽键形成的缩聚物", ["che_amino_acids", "che_condensation_polymer"]),
    o("d", "描述蛋白质的酸碱水解", ["che_amino_acids"]),
    o("e", "联系化学惰性说明聚烯烃难生物降解", ["che_addition_polymer"]),
    o("f", "联系水解说明聚酯和聚酰胺通常可生物降解", ["che_condensation_polymer"]),
    o("g", "从经济、环境与社会因素评价塑料回收及有限资源使用", ["che_addition_polymer", "che_condensation_polymer"], { gap: "polymer_recycling_sustainability" }),
  ]],
  ["12", "Electrochemistry", "电化学", "PDF pp.33-34, topic 12 Electrochemistry", [
    o("a", "用电子转移和氧化数变化解释氧化还原过程", ["che_oxidation_number", "che_redox_equations"]),
    o("b", "定义标准电极电势和标准电池电势", ["che_electrode_potential", "che_cells"]),
    o("c", "描述标准氢电极", ["che_electrode_potential"]),
    o("d", "描述测量金属或非金属电极及同元素不同氧化态电极电势的方法", ["che_electrode_potential"]),
    o("e", "由两个标准电极电势计算标准电池电势", ["che_cells", "che_electrode_potential"]),
    o("f", "用标准电池电势推断电子流方向与反应自发性", ["che_cells"]),
    o("g", "说明用标准电池电势预测反应自发性的限制", ["che_cells"], { gap: "standard_state_prediction_limits" }),
    o("h", "用半反应构建氧化还原方程", ["che_redox_equations"]),
    o("i", "在电化学电池中应用 ΔG°=−nFE°", ["che_gibbs", "che_cells"]),
    o("j", "定性预测电极电势随水溶液离子浓度的变化", ["che_electrode_potential"], { gap: "electrode_potential_concentration_trends" }),
    o("k", "比较氢氧燃料电池和改良电池在尺寸、质量与电压上的潜在优势", ["che_cells"]),
    o("l", "应用 F=Le 联系法拉第常数、阿伏伽德罗常数和电子电荷", ["che_electrolysis", "che_mole"]),
    o("m", "由电解质状态、电势序列和浓度预测电解产物", ["che_electrolysis"]),
    o("n", "计算电解电量及析出物质的质量或体积", ["che_electrolysis"]),
    o("o", "用电极反应解释铝阳极氧化和铜电解精炼；不要求技术细节", ["che_electrolysis"], { gap: "industrial_electrolysis_applications" }),
  ]],
  ["13", "Chemistry of Transition Elements", "过渡元素化学", "PDF pp.34-35, topic 13 Chemistry of Transition Elements", [
    o("a", "以原子或离子具有未充满 d 亚层定义过渡元素", ["che_transition_props"]),
    o("b", "写出第一过渡系元素及其离子的电子排布", ["che_transition_props", "che_electron_config"]),
    o("c", "解释过渡元素原子半径和第一电离能相对不变", ["che_transition_props"], { gap: "transition_periodic_invariance" }),
    o("d", "定性比较过渡元素与典型 s 区钙的熔点和密度", ["che_transition_props"]),
    o("e", "描述过渡元素具有可变氧化态的倾向", ["che_transition_props"]),
    o("f", "由电子排布预测过渡元素可能氧化态", ["che_transition_props", "che_electron_config"]),
    o("g", "用 Fe³⁺/Fe²⁺、MnO4⁻/Mn²⁺、Cr2O7²⁻/Cr³⁺ 解释过渡元素氧化还原体系", ["che_transition_props", "che_redox_equations"]),
    o("h", "用标准电极电势预测过渡元素氧化还原反应可能性", ["che_transition_props", "che_electrode_potential"]),
    o("i", "以铜离子的水、氨和氯配合物定义配体与配合物", ["che_complex_ions"]),
    o("j", "解释配体交换、颜色变化及血红蛋白中 CO/O2 交换", ["che_complex_ions"], { gap: "ligand_exchange_complex_contexts" }),
    o("k", "用 d 轨道形状与方向说明八面体配合物 d 轨道分裂", ["che_colour_catalysis"]),
    o("l", "用 d 轨道分裂和 d-d 跃迁解释配合物通常有色", ["che_colour_catalysis"]),
    o("m", "解释过渡元素及其化合物的催化作用", ["che_colour_catalysis", "che_catalysis"]),
  ]],
];

const GLOBAL_PRACTICES = [
  ["pos_wotd", "科学思维与实践：提出问题、形成假设、用证据和模型解释化学系统", "PDF p.4, Practices of Science, component 1"],
  ["pos_nos", "科学知识本质：评价模型、理论、证据、可重复性与知识限制", "PDF p.4, Practices of Science, component 2"],
  ["pos_stse", "科学、技术、社会与环境：评价化学应用的收益、风险、伦理和可持续性", "PDF p.4, Practices of Science, component 3"],
  ["practical_planning", "实验计划：定义问题、设计步骤、使用数据、评估风险并控制风险", "PDF p.36, Practical Assessment, Planning; assessment summary on p.9"],
  ["practical_mmo", "实验操作、测量与观察：安全操作、精确记录、选择测量并识别异常", "PDF p.36, Practical Assessment, MMO; assessment summary on p.9"],
  ["practical_pdo", "数据与观察呈现：选择适当形式、处理测量并识别趋势", "PDF p.37, Practical Assessment, PDO; assessment summary on p.9"],
  ["practical_ace", "分析、结论与评价：解释数据、处理不确定度、评价方法并提出改进", "PDF p.37, Practical Assessment, ACE; assessment summary on p.9"],
];

const sourceGraphs = [readJson(paths.aLevel), readJson(paths.senior)];
const legacyById = new Map();
for (const graph of sourceGraphs) {
  for (const node of graph.nodes.filter((candidate) => candidate.kind === "concept")) {
    if (!legacyById.has(node.id)) legacyById.set(node.id, node);
  }
}
const canonicalIds = (legacyIds) => unique(legacyIds.map((id) => {
  const node = legacyById.get(id);
  if (!node?.canonical_id) throw new Error(`Unknown chemistry legacy concept ${id}`);
  return node.canonical_id;
}));

const requirements = [];
const mappings = [];
const gapCandidates = [];
const practiceItems = [];
for (const [topicCode, title, titleZh, locator, outcomes] of TOPICS) {
  for (const outcome of outcomes) {
    const requirementId = `req_sg_h2_chemistry_9476_2026_o_${topicCode}_${outcome.key}`;
    const ids = canonicalIds(outcome.legacyIds);
    const evidenceRefs = officialEvidence(`PDF p.${pageFor(topicCode, outcome.key)}, topic ${topicCode} ${title}, outcome (${outcome.key})`);
    const requirementType = outcome.practice ? "practice" : "knowledge";
    requirements.push({
      requirement_id: requirementId,
      code: `${topicCode}.${outcome.key}`,
      title,
      title_zh: titleZh,
      summary_zh: outcome.summaryZh,
      requirement_type: requirementType,
      level_id: "h2_9476",
      cognitive_processes: outcome.practice ? ["create", "evaluate"] : ["understand", "apply"],
      parent_requirement_id: null,
      evidence_refs: evidenceRefs,
      review_status: "needs_review",
    });

    let coverageStatus = "full";
    let relation = "required";
    let rationaleZh = "现有统一 KG 中存在范围与 H2 诊断粒度相符的概念，可直接复用稳定 canonical ID。";
    if (outcome.practice) {
      coverageStatus = "excluded";
      relation = "not_applicable";
      rationaleZh = "这是可观察的实验设计实践，应进入教学与评测知识层，而不是独立概念掌握度。";
      practiceItems.push({
        practice_id: `practice_sg_h2_chemistry_9476_2026_${topicCode}_${outcome.key}`,
        requirement_ids: [requirementId],
        kind: "assessment_task",
        name: "Design a reaction-rate investigation",
        name_zh: outcome.summaryZh,
        description_zh: outcome.summaryZh,
        instructional_use_zh: "给出反应体系和可用仪器，让学习者明确自变量、因变量、控制变量、测量间隔、风险及数据处理。",
        assessment_evidence_zh: "提交可执行计划、变量控制、数据表设计和风险控制；按可重复性、有效性与安全性评分。",
        evidence_refs: evidenceRefs,
        review_status: "needs_review",
      });
    } else if (outcome.gap) {
      coverageStatus = ids.length ? "partial" : "unmapped";
      relation = ids.length ? "required" : "not_applicable";
      rationaleZh = ids.length
        ? "现有概念只覆盖组成部分或范围过宽，不能把名称相近当作完整 outcome 覆盖。"
        : "统一 KG 尚无范围与 H2 课程深度相符的可诊断概念。";
      gapCandidates.push({
        gap_id: `gap_sg_h2_chemistry_9476_2026_o_${topicCode}_${outcome.key}`,
        requirement_ids: [requirementId],
        action: ids.length ? "split_or_narrow_existing" : "add_concept",
        proposed_name: outcome.gap,
        proposed_name_zh: outcome.summaryZh,
        scope_zh: outcome.summaryZh,
        existing_canonical_ids: ids,
        suggested_graph_id: "singapore_h2_chemistry",
        rationale_zh: rationaleZh,
        evidence_refs: evidenceRefs,
        review_status: "needs_review",
      });
    }
    mappings.push({
      mapping_id: `map_sg_h2_chemistry_9476_2026_o_${topicCode}_${outcome.key}`,
      requirement_id: requirementId,
      canonical_ids: outcome.practice ? [] : ids,
      coverage_status: coverageStatus,
      relation,
      mapping_basis: "semantic_inference",
      confidence: coverageStatus === "full" || coverageStatus === "excluded" ? "high" : "medium",
      rationale_zh: rationaleZh,
      evidence_refs: evidenceRefs,
      review_status: "needs_review",
    });
  }
}

if (requirements.length !== 194) throw new Error(`Expected 194 chemistry outcomes, got ${requirements.length}`);
for (const [key, summaryZh, locator] of GLOBAL_PRACTICES) {
  const requirementId = `req_sg_h2_chemistry_9476_2026_o_practice_${key}`;
  const evidenceRefs = officialEvidence(locator);
  requirements.push({
    requirement_id: requirementId,
    code: `P.${key}`,
    title: "Practices of Science and Practical Assessment",
    title_zh: "科学实践与实验评测",
    summary_zh: summaryZh,
    requirement_type: "practice",
    level_id: "h2_9476",
    cognitive_processes: ["apply", "evaluate", "communicate"],
    parent_requirement_id: null,
    evidence_refs: evidenceRefs,
    review_status: "needs_review",
  });
  mappings.push({
    mapping_id: `map_sg_h2_chemistry_9476_2026_o_practice_${key}`,
    requirement_id: requirementId,
    canonical_ids: [],
    coverage_status: "excluded",
    relation: "not_applicable",
    mapping_basis: "semantic_inference",
    confidence: "high",
    rationale_zh: "这是跨主题科学实践或实验能力，进入教学与评测知识层，不作为化学概念掌握度。",
    evidence_refs: evidenceRefs,
    review_status: "needs_review",
  });
  practiceItems.push({
    practice_id: `practice_sg_h2_chemistry_9476_2026_${key}`,
    requirement_ids: [requirementId],
    kind: key.startsWith("pos_") ? "inquiry_process" : "assessment_task",
    name: "Chemistry scientific practice",
    name_zh: summaryZh,
    description_zh: summaryZh,
    instructional_use_zh: "在具体化学内容中明确证据、模型、实验步骤、风险和社会环境权衡，让实践表现可观察、可留痕。",
    assessment_evidence_zh: "检查实验计划、原始记录、图表、推理链、误差评价或论证文本；评价证据质量而非只看最终答案。",
    evidence_refs: evidenceRefs,
    review_status: "needs_review",
  });
}

const sources = readJson(paths.sources);
const source = sources.sources.find((candidate) => candidate.source_id === SOURCE_ID);
if (!source) throw new Error(`Missing source ${SOURCE_ID}`);
source.retrieved_at = TODAY;
source.verification_status = "verified";
source.notes_zh = "2026 首次考试的新版 9476 官方 PDF 已通过 SEAB 页面、官方 Isomer 内容地址和 46 页正文逐项复核；仅保存元数据、校验值、页码定位和中文释义，不保存正文。";

const framework = {
  schema_version: "2.0.0",
  content_version: "0.3.0",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  curriculum_kind: "examination_syllabus",
  title: "Singapore-Cambridge GCE Advanced Level H2 Chemistry 9476 outcome coverage",
  title_zh: "新加坡剑桥 GCE A-Level H2 化学 9476（2026）学习成果级覆盖",
  jurisdiction: "SG",
  subject: "Chemistry",
  education_stage: "pre_university",
  levels: [{ level_id: "h2_9476", label: "H2 Chemistry 9476", label_zh: "H2 化学 9476" }],
  languages: ["en", "zh-CN"],
  valid_from: "2026-01-01",
  valid_to: null,
  source_ids: [SOURCE_ID],
  requirement_granularity: "outcome",
  review_status: "needs_review",
  changelog: [{
    version: "0.3.0",
    date: TODAY,
    summary_zh: "用官方 194 项字母编号学科成果和 7 项跨主题实践取代 13 个主题导航映射。",
  }],
  scope_exclusions: [
    ["atomic orbital wave functions", "Topic 1(g) 明确不要求波函数知识。"],
    ["quantitative electronegativity", "Topic 2(f) 只要求定性使用电负性。"],
    ["crystallographic unit cells", "Topic 2(l) 明确不要求晶胞概念。"],
    ["Kp-Kc conversion relationship", "Topic 9(d) 明确不要求 Kp 与 Kc 的换算关系。"],
    ["integrated rate equations", "Topic 8(b) 明确不要求积分速率方程。"],
    ["quantitative entropy from standard entropy tables", "Topic 7 不要求定量熵处理或由标准熵计算反应熵。"],
    ["quadratic equilibrium and weak-acid calculations", "Topics 9–10 不要求需要解二次方程的平衡计算。"],
    ["E/Z nomenclature and diastereomer terminology", "Topic 11.2 不要求 E/Z 命名和非对映体术语。"],
    ["detailed enzyme protein structure and denaturation", "Topic 8(k) 不要求蛋白质结构层级与变性细节。"],
    ["mechanistic ozone-depletion chemistry", "Topic 11.5(e) 不要求 CFC 与 HCFC 破坏臭氧层的机理细节。"],
    ["industrial electrolysis technical details", "Topic 12(o) 不要求工业过程技术细节。"],
    ["relative ligand-field strength ordering", "Topic 13(l) 不要求配体场强弱序列。"],
  ].map(([scope, rationale_zh]) => ({ scope, rationale_zh, evidence_refs: officialEvidence("PDF pp.13-35, explicit bracketed scope statements") })),
  requirements,
};

const mappingSet = {
  schema_version: "3.0.0",
  content_version: "0.3.0",
  mapping_set_id: "cms_sg_seab_h2_chemistry_9476_2026_outcomes",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Chemistry",
  source_ids: [SOURCE_ID],
  mapping_scope: "outcome_coverage",
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [{
    version: "0.3.0",
    date: TODAY,
    summary_zh: "逐项映射 194 项学科成果，分流 8 项实验或跨主题实践，并保守登记 21 项概念覆盖缺口。",
  }],
  mappings,
};

const gapSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  gap_set_id: "cgs_sg_seab_h2_chemistry_9476_2026_outcomes",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Chemistry",
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [{ version: "0.1.0", date: TODAY, summary_zh: "登记 21 项需新增或收窄概念的 H2 化学成果。" }],
  candidates: gapCandidates,
};

const practiceSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  practice_set_id: "cpk_sg_seab_h2_chemistry_9476_2026",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Chemistry",
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [{ version: "0.1.0", date: TODAY, summary_zh: "把 1 项内容内实验设计和 7 项跨主题实践转为教学评测知识。" }],
  items: practiceItems,
};

const reviewLines = [
  "# 新加坡 H2 化学 9476 逐成果映射审核包（中文）",
  "",
  `- 生成日期：${TODAY}`,
  "- 官方版本：2026 首次考试，Syllabus 9476，46 页。",
  `- 要求总数：${requirements.length} 项；学科成果 194 项，跨主题实践 7 项。`,
  `- 现有 KG 完整覆盖：${mappings.filter((mapping) => mapping.coverage_status === "full").length} 项。`,
  `- 待解析概念缺口：${gapCandidates.length} 项。`,
  `- 实践分流：${mappings.filter((mapping) => mapping.coverage_status === "excluded").length} 项。`,
  "- 状态：全部 `needs_review`；本脚本不写 human approval。",
  "",
  "## 审核重点",
  "",
  "- 旧 13 项 topic navigation 不再被当作 outcome coverage。",
  "- 只复用范围和课程深度相符的 canonical；Arrhenius/Lewis、道尔顿分压、量子化学未要求项等不做名称猜测。",
  "- 把实验设计与跨主题实践分流，不把操作能力伪装成概念掌握度。",
  "- 保留官方 12 类明确排除边界。",
  "",
  "## 21 项待解析缺口",
  "",
];
for (const candidate of gapCandidates) {
  reviewLines.push(
    `### ${candidate.proposed_name_zh}`,
    "",
    `- 缺口：\`${candidate.gap_id}\``,
    `- 动作：\`${candidate.action}\``,
    `- 既有 canonical：${candidate.existing_canonical_ids.length ? candidate.existing_canonical_ids.map((id) => `\`${id}\``).join("、") : "无"}`,
    `- 原因：${candidate.rationale_zh}`,
    `- 证据：${candidate.evidence_refs.map((ref) => `${ref.locator}（\`${ref.source_id}\`）`).join("；")}`,
    "",
  );
}

writeJson(paths.sources, sources);
writeJson(paths.framework, framework);
writeJson(paths.mapping, mappingSet);
writeJson(paths.gaps, gapSet);
writeJson(paths.practices, practiceSet);
mkdirSync(dirname(paths.review), { recursive: true });
writeFileSync(paths.review, `${reviewLines.join("\n")}\n`);

process.stdout.write(`[upgrade-sg-h2-chemistry] ${requirements.length} requirements; ${mappings.filter((mapping) => mapping.coverage_status === "full").length} full, ${mappings.filter((mapping) => mapping.coverage_status === "partial").length} partial, ${mappings.filter((mapping) => mapping.coverage_status === "unmapped").length} unmapped, ${mappings.filter((mapping) => mapping.coverage_status === "excluded").length} excluded; ${gapCandidates.length} gaps; ${practiceItems.length} practices\n`);
