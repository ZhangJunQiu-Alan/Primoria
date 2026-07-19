#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const TODAY = "2026-07-19";
const SOURCE_ID = "src_cn_moe_senior_high_chemistry_2020";
const FRAMEWORK_ID = "cfw_cn_moe_senior_high_chemistry_2020_outcomes";
const CURRICULUM_ID = "cur_cn_moe_senior_high_chemistry_2020";
const paths = {
  framework: resolve(ROOT, "data/knowledge-graphs/curricula/frameworks/cn_moe_senior_high_chemistry_2020.json"),
  mapping: resolve(ROOT, "data/knowledge-graphs/curricula/mappings/pending/cn_moe_senior_high_chemistry_2020.json"),
  gaps: resolve(ROOT, "data/knowledge-graphs/curricula/gaps/pending/cn_moe_senior_high_chemistry_2020_outcomes.json"),
  practices: resolve(ROOT, "data/knowledge-graphs/pedagogy/practices/cn_moe_senior_high_chemistry_2020.json"),
};

const levels = {
  r: { label: "Required", labelZh: "必修" },
  se: { label: "Selective required: Chemical reaction principles", labelZh: "选择性必修·化学反应原理" },
  ss: { label: "Selective required: Structure and properties", labelZh: "选择性必修·物质结构与性质" },
  so: { label: "Selective required: Organic chemistry", labelZh: "选择性必修·有机化学基础" },
};

const C = {
  subatomic: "pc_d3750ab7dae24f534aee9f39f91e5f71",
  isotopes: "pc_6a27f090d384dbc6be61017193c58dae",
  electronConfig: "pc_4ee1addaa1bb88db1bc738c8909840bb",
  orbitals: "pc_c68d18c005adce683dffeb83cd4cb895",
  ionisation: "pc_4e357bba20ab4ba89207b97a6dc2e610",
  mole: "pc_df12800116ac8b3b4f1232118ed6a5e6",
  titration: "pc_40e84973ce28c8bfbe369bab4f213754",
  ionic: "pc_4b92b05bd4662531b6bc415778fee240",
  covalent: "pc_76c78ee2b35eca2b943816eb56dbac2a",
  metallic: "pc_f2a9c19ab3c922280139d1ca1fda33ba",
  vsepr: "pc_efe51eb9f4ef6303c37411a09a459344",
  electronegativity: "pc_eed2c090eb2027bca1d0484dc93fee0f",
  imf: "pc_614f3b0e205dabe62760af3243c960e1",
  solids: "pc_a4b86c05308a1e5a1bda8192168cddbc",
  enthalpy: "pc_e69d28c59b3a7c85a8366e77b73f49d0",
  hess: "pc_5228fc493b409be3407c6661aed3da92",
  bondEnthalpy: "pc_b35d6548b40342a4e7e95af4650c7349",
  calorimetry: "pc_15992a7e0497388298726130f75cad83",
  rate: "pc_9149d04521bbf394cffde8a4040d28ed",
  collision: "pc_2a4571ab0da3a12f57b0c311f63f1bee",
  boltzmann: "pc_04253132571da061a274475a1620d120",
  catalysis: "pc_3acf09a2d45e4a4379136a369085e5f8",
  rds: "pc_cb40576691a93cdc979f318c9e746398",
  dynamicEq: "pc_f2db072d9b9ecf3925965c5aec1b340e",
  leChatelier: "pc_11136627f33775e0a74e8d42c8e86361",
  kcKp: "pc_4386477346f4fa3dfe6f31ec2435e3b2",
  bronsted: "pc_e0e23323fa5580b7eaff3277d809f5b1",
  strongWeak: "pc_f6b7711a788cbc8c837f448c591f0fa4",
  phKa: "pc_77fa4fcddfbfac708e8026c8cc77b391",
  buffers: "pc_82c006666402fb0151977a37993a8809",
  ksp: "pc_a4e09c1b07331a56753ee7884854992a",
  oxidation: "pc_042f315c4fd69794846195086e9611ec",
  redox: "pc_4b8778a639899b2be00ad35d38df1699",
  cells: "pc_ddaa179ab823ea748d4ad05e53ee9187",
  electrolysis: "pc_4375fb1d523a4b08df3b42fab0c0642e",
  entropy: "pc_796efe527a46546cb476af1d40c1c1f5",
  gibbs: "pc_c912d7aa7e95cc5c77a18f6f5aae0a0c",
  periodic: "pc_d8222e150de1d5b8d93389c00a07fabe",
  period3: "pc_c4ce91b9f4d4bfaccf0f26f7514f8896",
  group17: "pc_89785b3e05b48942229592971697422a",
  nitrogenSulfur: "pc_c48d9a41a4f7fd5a7ddc4ca53ba4a7ac",
  transition: "pc_db9856c274d202c3b699aa0300f025f9",
  complexes: "pc_1701653e84db7e3257e7e55c4b77abdc",
  organicRepresentation: "pc_b7cf8d670e2f37db41a760a401141534",
  nomenclature: "pc_0b65c6a9710a1310be1f9b285ed88e74",
  isomerism: "pc_e3ad1e8ae27f757ccf5d59c333f04d7a",
  bondFission: "pc_f04539036aca6084074f399276e5f01d",
  mechanisms: "pc_9826358783352bf325f9299146a78a37",
  alkanes: "pc_25af0b0d2ddbcd075e92f8f6d504dc1a",
  alkenes: "pc_ae2a8392fd9b93c33bc41d65e28fa8dc",
  additionPolymer: "pc_cd9220ccd4a94d9511b50e51680a585c",
  nucleophilicSub: "pc_0d3043e5274fde266129817ca29a57f7",
  elimination: "pc_aa4bce8524adca25c22fe40ce6e9f542",
  alcohol: "pc_42ea5b997cbab553b5f29d052a9d06aa",
  aldehydeKetone: "pc_0c458f45bd014438bcb506f21ad5e902",
  carboxylic: "pc_3f37112bc196b1765029aad7952026ca",
  esters: "pc_c9da2c88a8c94e76a31e705076b2a010",
  amines: "pc_1472e2980e7244beb53eecfa3bcd4051",
  aminoAcids: "pc_ae3e202342d0768f17e63d904381b461",
  condensationPolymer: "pc_4fa4bd24c7e8cdf839921a3fb5f37bde",
  amides: "pc_54969456882eab85ca38b2957992a4aa",
  benzene: "pc_d67a8e73f965a59d3be0c55d71b80819",
  phenol: "pc_306df7f024993644203ea5a1f13ff904",
  ir: "pc_be8194ec0ada9714cc5a11129041379c",
  nmr: "pc_726c4810fd4590e4416c4c336a4e4ef2",
};

const outcomes = [];
const add = (level, code, page, key, title, titleZh, summaryZh, canonicalIds = [], coverage = "unmapped", options = {}) => outcomes.push({
  level,
  code,
  page,
  key,
  title,
  titleZh,
  summaryZh,
  canonicalIds,
  coverage,
  requirementType: options.requirementType ?? "skill",
  cognitive: options.cognitive ?? ["understand", "apply"],
  gapAction: options.gapAction,
  practiceKind: options.practiceKind,
});
const practiceKinds = {
  inquiry_process: "inquiry_process",
  laboratory_practice: "inquiry_process",
  epistemic_practice: "inquiry_process",
  reporting_integrity: "reporting_integrity",
  safety_practice: "assessment_task",
  engineering_practice: "modelling_process",
  modeling_practice: "modelling_process",
};
const practice = (level, code, page, key, title, titleZh, summaryZh, kind = "inquiry_process") =>
  add(level, code, page, key, title, titleZh, summaryZh, [], "excluded", { requirementType: "practice", cognitive: ["apply", "analyze", "evaluate"], gapAction: "not_knowledge_concept", practiceKind: practiceKinds[kind] });

// Required curriculum: Theme 1, chemical science and experimental inquiry.
add("r", "1.1a", 19, "chemical_science_scope", "Scope of chemical science", "化学科学的研究对象与特征", "说明化学在原子、分子层次研究并创造物质的主要特征及发展趋势。", [], "unmapped");
practice("r", "1.1b", 19, "chemical_evidence_models", "Evidence and models in chemistry", "化学中的实证、推理与模型", "在化学问题中区分实验事实、假说、模型、比较和分类的作用。", "epistemic_practice");
add("r", "1.1c", 19, "amount_of_substance_quantities", "Amount of substance and related quantities", "物质的量及相关物理量", "使用物质的量、摩尔质量、气体摩尔体积和物质的量浓度进行简单换算与计算。", [C.mole], "full");
practice("r", "1.2a", 20, "inquiry_question_hypothesis", "Inquiry questions and hypotheses", "探究问题与假设", "从现象提出可检验问题，形成有依据的预测或假设。", "inquiry_process");
practice("r", "1.2b", 20, "inquiry_design_evidence", "Inquiry design and evidence", "探究方案、证据与结论", "依据目的设计方案、获取证据、分析解释并评价结论。", "inquiry_process");
practice("r", "1.3a", 20, "chemical_experiment_roles", "Roles of chemical experiments", "化学实验的功能", "根据研究目的选择性质研究、分离、检验或制备实验的基本思路。", "laboratory_practice");
practice("r", "1.3b", 20, "separation_purification_solution", "Separation, purification and solution preparation", "分离、提纯、检验与溶液配制", "规范选择和实施物质检验、分离、提纯与溶液配制的基本操作。", "laboratory_practice");
practice("r", "1.3c", 20, "experimental_condition_control", "Control of experimental conditions", "实验条件控制", "识别并控制影响化学实验结论的关键变量和条件。", "inquiry_process");
practice("r", "1.4a", 20, "scientific_attitude_collaboration", "Scientific attitude and collaboration", "科学态度、质疑与合作", "如实记录证据，严谨交流，并在合作中提出有依据的质疑和改进。", "reporting_integrity");
practice("r", "1.4b", 20, "laboratory_safety_waste", "Laboratory safety and waste", "实验安全、废弃物与突发事件", "识别化学品安全标识，选择废弃物处理和实验室突发事件应对措施。", "safety_practice");
practice("r", "1.5a", 20, "prepare_molar_solution", "Preparing a molar solution", "配制一定物质的量浓度的溶液", "选择容量仪器，完成称量或移液、溶解、转移、定容和误差检查。", "laboratory_practice");

// Required curriculum: Theme 2, common inorganic substances.
add("r", "2.1a", 22, "substance_classification_conversion", "Substance classification and conversion", "物质分类与类别转化", "依据组成和性质分类物质，并说明同类物质的共性及类别间转化条件。", [], "unmapped");
add("r", "2.1b", 22, "element_valence_conversion", "Element valence-state conversion", "元素价态与物质转化", "依据元素价态分析同一元素不同价态物质间的氧化还原转化。", [C.oxidation], "partial");
add("r", "2.1c", 22, "colloidal_dispersions", "Colloidal dispersions", "胶体与分散系", "区分溶液、胶体等分散系并解释胶体的典型特征。", [], "unmapped");
add("r", "2.2a", 23, "redox_electron_transfer", "Redox and electron transfer", "氧化还原与电子转移", "从化合价变化和电子转移判断氧化还原反应并说明其本质。", [C.oxidation, C.redox], "partial");
add("r", "2.2b", 23, "oxidising_reducing_agents", "Oxidising and reducing agents", "氧化剂与还原剂", "识别常见氧化剂和还原剂并判断反应中的氧化、还原过程。", [C.oxidation], "partial");
add("r", "2.3a", 23, "electrolyte_ionisation", "Electrolyte ionisation", "电解质与电离", "说明酸、碱、盐等电解质在水溶液或熔融状态中的电离并书写简单电离方程式。", [C.bronsted, C.strongWeak], "partial");
add("r", "2.3b", 23, "ionic_reaction_conditions", "Conditions for ionic reactions", "离子反应及发生条件", "从溶液中离子变化判断离子反应发生条件并书写简单离子方程式。", [], "unmapped");
add("r", "2.3c", 23, "common_ion_tests", "Tests for common ions", "常见离子的检验", "根据特征反应和干扰因素选择试剂并解释常见离子检验现象。", [], "unmapped");
add("r", "2.4a", 23, "sodium_compounds", "Sodium and its compounds", "钠及其重要化合物", "说明钠及其重要化合物的主要性质、转化和生产生活应用。", [], "unmapped");
add("r", "2.4b", 23, "iron_compounds", "Iron and its compounds", "铁及其重要化合物", "说明铁及其重要化合物不同价态的性质、转化和应用。", [C.transition], "partial");
add("r", "2.5a", 23, "chlorine_compounds", "Chlorine and its compounds", "氯及其重要化合物", "说明氯及其重要化合物的性质、转化、应用和安全使用。", [C.group17], "full");
add("r", "2.5b", 23, "nitrogen_compounds", "Nitrogen and its compounds", "氮及其重要化合物", "说明氮及其重要化合物的性质、转化和工业应用。", [C.nitrogenSulfur], "partial");
add("r", "2.5c", 23, "sulfur_compounds", "Sulfur and its compounds", "硫及其重要化合物", "说明硫及其重要化合物的价态、性质、转化和工业应用。", [C.nitrogenSulfur], "partial");
add("r", "2.6a", 23, "inorganic_conversion_pathways", "Inorganic conversion pathways", "无机物性质与转化路径", "从物质类别和元素价态设计常见无机物的转化路径。", [], "unmapped");
add("r", "2.6b", 23, "inorganic_stse_value", "Value and impact of inorganic chemistry", "无机物应用价值与环境影响", "评价常见无机物转化对资源利用、社会发展和环境的影响。", [], "unmapped");
practice("r", "2.7a", 23, "iron_compounds_lab", "Iron-compound investigation", "铁及其化合物性质实验", "设计并实施铁及其化合物性质和价态转化实验。", "laboratory_practice");
practice("r", "2.7b", 23, "sulfur_valence_lab", "Sulfur valence-state conversion", "不同价态含硫物质转化实验", "通过证据判断不同价态含硫物质间的氧化还原转化。", "laboratory_practice");
practice("r", "2.7c", 23, "coarse_salt_purification", "Purifying crude salt", "粗盐杂质离子的沉淀去除", "选择沉淀剂和操作顺序去除粗盐中杂质离子并评价方案。", "laboratory_practice");

// Required curriculum: Theme 3, structure and reaction regularities.
add("r", "3.1a", 26, "atomic_structure_nuclides", "Atomic structure, elements and nuclides", "原子结构、元素与核素", "使用原子结构说明元素和核素含义及核外电子的基本排布。", [C.subatomic, C.isotopes, C.electronConfig], "full");
add("r", "3.1b", 26, "periodic_table_structure_trends", "Periodic table and trends", "元素周期表结构与递变规律", "说明周期表的周期和主族结构，并比较第三周期、碱金属和卤族性质递变。", [C.periodic, C.period3, C.group17], "full");
add("r", "3.1c", 26, "periodic_prediction", "Periodic-law prediction", "元素周期律的解释与预测", "从原子结构解释元素性质周期性，并利用周期律预测简单性质。", [C.periodic], "full");
add("r", "3.2a", 26, "ionic_covalent_bonding", "Ionic and covalent bonding", "离子键与共价键", "从微粒相互作用说明离子键和共价键的形成及典型物质构成。", [C.ionic, C.covalent], "full");
add("r", "3.2b", 26, "intro_molecular_geometry", "Introductory molecular geometry", "分子空间结构初步", "识别简单分子的空间结构，并联系成键方式进行解释。", [C.vsepr], "full");
add("r", "3.2c", 26, "bond_changes_reaction_energy", "Bond changes and reaction energy", "化学键变化与反应能量", "用化学键断裂与形成解释物质变化和反应能量变化。", [C.bondEnthalpy], "partial");
add("r", "3.3a", 26, "reversible_dynamic_equilibrium", "Reversible reactions and equilibrium", "可逆反应与化学平衡", "说明可逆反应达到动态平衡的条件和宏观特征。", [C.dynamicEq], "full");
add("r", "3.3b", 26, "average_rate_factors", "Average rate and influencing factors", "平均反应速率与影响因素", "表示平均反应速率，并解释浓度、温度和催化剂等因素的影响。", [C.rate, C.collision, C.catalysis], "full");
practice("r", "3.3c", 26, "rate_variable_control", "Variable control in rate studies", "反应速率变量控制", "使用控制变量法探究影响反应速率的因素并评价证据。", "inquiry_process");
add("r", "3.4a", 26, "endo_exothermic_bond_energy", "Endothermic and exothermic reactions", "吸热、放热与化学键", "区分吸热和放热反应，并从化学键变化解释体系能量改变。", [C.enthalpy, C.bondEnthalpy], "full");
add("r", "3.4b", 26, "intro_galvanic_cell", "Introductory galvanic cells", "原电池工作原理初步", "从氧化还原反应分析简单原电池的构成、电子和离子迁移及能量转化。", [C.cells, C.redox], "full");
add("r", "3.4c", 26, "fuel_battery_evaluation", "Fuel and battery evaluation", "燃料效率与化学电源价值", "从能量、资源和环境角度比较燃料与化学电源的使用价值。", [], "unmapped");
practice("r", "3.5a", 27, "periodic_trends_lab", "Periodic-trend investigation", "同周期同主族性质递变实验", "用实验事实和数据检验同周期、同主族元素性质递变。", "laboratory_practice");
practice("r", "3.5b", 27, "rate_factors_lab", "Reaction-rate factors investigation", "反应速率影响因素实验", "控制变量并测量影响反应速率的因素。", "laboratory_practice");
practice("r", "3.5c", 27, "chemical_to_electrical_lab", "Chemical-to-electrical energy experiment", "化学能转化为电能实验", "搭建并检验简单原电池，记录电极和电流方向证据。", "laboratory_practice");

// Required curriculum: Theme 4, introductory organic chemistry.
add("r", "4.1a", 29, "carbon_bonding_geometry", "Carbon bonding and molecular geometry", "碳原子成键与有机分子空间结构", "以甲烷、乙烯、乙炔和苯说明碳原子的成键特点和分子空间结构。", [C.organicRepresentation, C.covalent], "partial");
add("r", "4.1b", 29, "intro_functional_groups", "Introductory functional groups", "有机化合物官能团初步", "在乙烯、乙醇、乙酸和乙酸乙酯中识别官能团并联系分类。", [C.organicRepresentation], "full");
add("r", "4.1c", 29, "intro_isomerism", "Introductory isomerism", "同分异构现象初步", "说明同分异构现象并辨识简单有机物的结构差异。", [C.isomerism], "full");
add("r", "4.2a", 29, "ethene_properties", "Ethene properties and applications", "乙烯的性质与应用", "从碳碳双键解释乙烯的主要反应、性质和应用。", [C.alkenes], "full");
add("r", "4.2b", 29, "ethanol_ethanoic_properties", "Ethanol and ethanoic acid", "乙醇与乙酸的性质", "联系羟基和羧基说明乙醇、乙酸的主要性质、反应和应用。", [C.alcohol, C.carboxylic], "full");
add("r", "4.2c", 29, "intro_organic_reaction_types", "Introductory organic reaction types", "有机反应类型与转化初步", "识别氧化、加成、取代和聚合反应，并说明简单有机物间的转化。", [C.mechanisms, C.additionPolymer], "partial");
add("r", "4.3a", 29, "organic_synthesis_value", "Value of organic synthesis", "有机合成创造新物质", "说明有机合成在创造新物质和改善生活中的作用。", [], "unmapped");
add("r", "4.3b", 29, "intro_macromolecule_applications", "Introductory macromolecule applications", "高分子与生物大分子应用初步", "概述高分子、油脂、糖类和蛋白质在生产生活中的应用。", [C.additionPolymer, C.condensationPolymer, C.aminoAcids], "partial");
practice("r", "4.4a", 30, "organic_model_building", "Organic molecular model building", "有机分子球棍模型", "搭建球棍模型并用模型比较有机分子结构。", "modeling_practice");
practice("r", "4.4b", 30, "ethanol_ethanoic_lab", "Ethanol and ethanoic-acid experiment", "乙醇、乙酸性质实验", "实施乙醇、乙酸性质实验并以证据联系官能团。", "laboratory_practice");

// Required curriculum: Theme 5, chemistry and society.
add("r", "5.1a", 31, "chemistry_sustainable_development", "Chemistry and sustainable development", "化学促进可持续发展", "从资源、能源、材料和环境案例说明化学对可持续发展的作用与限制。", [], "unmapped");
add("r", "5.1b", 31, "green_chemistry_principles", "Green chemistry principles", "绿色化学基本思想", "从原料、过程、能耗、产物和废物角度解释绿色化学的基本取向。", [], "unmapped");
add("r", "5.2a", 32, "chemistry_materials", "Chemistry in materials science", "化学与材料科学", "说明化学在金属、无机非金属、高分子和复合材料开发中的作用。", [], "unmapped");
add("r", "5.2b", 32, "chemistry_health", "Chemistry and human health", "化学与人类健康", "说明化学在药物、营养、检测和健康风险管理中的作用。", [], "unmapped");
add("r", "5.3a", 32, "fossil_resource_utilisation", "Integrated use of fossil resources", "化石资源综合利用", "比较煤、石油和天然气的组成、加工转化与综合利用路径。", [C.alkanes, C.alkenes, C.benzene], "partial");
add("r", "5.3b", 32, "energy_resource_systems", "Energy-resource systems", "自然资源与能源综合利用", "从物质转化、能量效率和环境影响评价自然资源与能源利用方案。", [], "unmapped");
add("r", "5.4a", 32, "pollutant_detection_treatment", "Pollutant detection and treatment", "污染物检测与治理", "根据污染物性质选择检测、分离、转化或无害化处理思路。", [], "unmapped");
add("r", "5.4b", 32, "clean_production_circularity", "Clean production and circularity", "清洁生产与循环利用", "说明清洁生产、废物资源化和循环利用中的化学原理。", [], "unmapped");
add("r", "5.5a", 32, "chemical_rules_safe_use", "Chemical application laws and rules", "化学应用法律法规与规则意识", "说明遵守化学品应用、化工生产、环境保护、食品与药品安全等法律法规的重要性。", [], "unmapped");

// Selective required: Chemical reaction principles.
add("se", "1.1a", 36, "energy_forms_conservation", "Energy forms and conservation", "化学能转化与能量守恒", "说明化学能与热能、电能等形式相互转化且遵循能量守恒。", [C.enthalpy, C.cells], "partial");
add("se", "1.1b", 36, "internal_energy_state", "Internal energy and state variables", "内能与体系状态", "说明内能与体系温度、压强、组成和聚集状态的关系。", [], "unmapped");
add("se", "1.2a", 36, "enthalpy_thermochemical_equations", "Enthalpy and thermochemical equations", "焓变与热化学方程式", "用焓变表示恒温恒压反应热，书写并解释热化学方程式。", [C.enthalpy], "full");
add("se", "1.2b", 36, "hess_law_application", "Hess's law applications", "盖斯定律及应用", "使用盖斯定律计算简单反应焓变并说明路径无关性。", [C.hess], "full");
add("se", "1.3a", 36, "electrochemical_cells_sources", "Galvanic cells and chemical sources", "原电池与化学电源", "分析原电池和常见化学电源的电极反应、载流路径和能量转化。", [C.cells], "full");
add("se", "1.3b", 36, "electrolytic_cells_applications", "Electrolytic cells and applications", "电解池原理与应用", "分析电解池工作原理并解释电解在物质转化和储能中的应用。", [C.electrolysis], "full");
add("se", "1.3c", 36, "electrochemical_corrosion", "Electrochemical corrosion and protection", "金属电化学腐蚀与防护", "从电化学过程解释金属腐蚀，并比较常见防腐措施。", [], "unmapped");
practice("se", "1.4a", 36, "electroplating_lab", "Electroplating experiment", "简单电镀实验", "搭建电解装置实施简单电镀并解释电极产物。", "laboratory_practice");
practice("se", "1.4b", 36, "fuel_cell_build", "Building a fuel cell", "制作简单燃料电池", "制作简单燃料电池并用电极反应证据评价其工作。", "engineering_practice");
add("se", "2.1a", 38, "reaction_direction_enthalpy_entropy", "Reaction direction, enthalpy and entropy", "反应方向、焓变与熵变", "使用焓变和熵变定性判断化学变化的方向和条件。", [C.entropy, C.gibbs], "full");
add("se", "2.1b", 38, "equilibrium_constant_extent", "Equilibrium constant and reaction extent", "平衡常数与反应限度", "书写并解释平衡常数表达式，计算简单平衡组成和转化率。", [C.kcKp], "full");
add("se", "2.1c", 38, "reaction_quotient_direction", "Reaction quotient and direction", "浓度商与反应方向", "比较浓度商与平衡常数，判断是否平衡及净反应方向。", [C.kcKp], "partial");
add("se", "2.1d", 38, "equilibrium_factor_effects", "Effects on equilibrium", "浓度、压强和温度对平衡的影响", "预测浓度、压强和温度改变引起的平衡移动及相关量变化。", [C.leChatelier], "full");
add("se", "2.2a", 39, "rate_representation_measurement", "Rate representation and measurement", "反应速率表示与测定", "计算反应速率并根据可测物理量选择简单的速率测定方法。", [C.rate], "full");
add("se", "2.2b", 39, "rate_factor_models", "Models for rate factors", "反应速率影响因素模型", "用碰撞和能量分布模型解释温度、浓度、压强和催化剂对速率的影响。", [C.collision, C.boltzmann, C.catalysis], "full");
add("se", "2.2c", 39, "reaction_path_activation", "Reaction pathways and activation energy", "反应历程与活化能", "说明基元反应、反应历程和活化能如何约束宏观反应速率。", [C.collision, C.rds], "partial");
add("se", "2.3a", 39, "industrial_condition_optimisation", "Industrial condition optimisation", "化工反应条件综合优化", "从速率、限度、能耗、安全和成本综合比较生产条件。", [], "unmapped");
add("se", "2.3b", 39, "catalyst_pathway_control", "Catalyst pathway control", "催化剂与反应历程调控", "说明催化剂通过改变反应历程和活化能调控速率但不改变平衡常数。", [C.catalysis], "full");
practice("se", "2.4a", 39, "equilibrium_shift_lab", "Equilibrium-shift investigation", "影响化学平衡移动因素实验", "控制变量探究浓度、压强或温度对平衡移动的影响。", "inquiry_process");
add("se", "3.1a", 41, "aqueous_electrolyte_systems", "Aqueous electrolyte systems", "电解质水溶液体系", "从电离、离子反应和化学平衡统一分析电解质水溶液的组成、性质和反应。", [C.bronsted, C.strongWeak], "partial");
add("se", "3.2a", 41, "weak_electrolyte_equilibrium", "Weak-electrolyte equilibrium", "弱电解质电离平衡", "说明弱电解质电离平衡和电离常数含义，并进行简单比较。", [C.strongWeak, C.phKa], "full");
add("se", "3.2b", 41, "water_ionisation_ph", "Water ionisation, ionic product and pH", "水的电离、离子积与 pH", "使用水的离子积和 pH 表示溶液酸碱性并进行简单计算。", [C.phKa], "partial");
practice("se", "3.2c", 41, "ph_measurement", "Measuring solution pH", "溶液 pH 检测", "选择试纸或仪器测定 pH，记录并评价测量精度。", "laboratory_practice");
add("se", "3.3a", 42, "salt_hydrolysis", "Salt hydrolysis", "盐类水解平衡", "从离子与水反应解释盐溶液酸碱性及影响水解的主要因素。", [], "unmapped");
add("se", "3.4a", 42, "precipitation_dissolution", "Precipitation-dissolution equilibrium", "沉淀溶解平衡", "使用沉淀溶解平衡解释难溶电解质的生成、溶解和转化。", [C.ksp], "full");
add("se", "3.5a", 42, "aqueous_equilibrium_applications", "Applications of aqueous equilibria", "水溶液离子平衡应用", "综合电离、水解和沉淀平衡解决检测、分离和物质转化问题。", [], "unmapped");
add("se", "3.5b", 42, "ph_control_buffers", "pH control and buffers", "pH 调控与缓冲", "解释 pH 调控的生产研究应用和缓冲溶液抵抗 pH 变化的原理。", [C.buffers], "full");
practice("se", "3.6a", 42, "acid_base_titration", "Strong acid-base titration", "强酸强碱中和滴定", "规范实施中和滴定，判断终点并计算未知浓度。", "laboratory_practice");
practice("se", "3.6b", 42, "salt_hydrolysis_application_lab", "Salt-hydrolysis application", "盐类水解应用实验", "设计实验检验盐类水解及其影响因素和应用。", "laboratory_practice");

// Selective required: Structure and properties.
practice("ss", "1.1a", 44, "electron_model_history", "History of electron models", "核外电子运动模型演进", "用光谱等证据比较核外电子运动模型及其局限。", "epistemic_practice");
add("ss", "1.1b", 44, "quantised_levels_transitions", "Quantised energy levels and transitions", "电子能级、激发与跃迁", "说明电子能量状态量子化以及能级间激发和跃迁。", [C.electronConfig], "partial");
add("ss", "1.1c", 44, "orbitals_electron_clouds", "Orbitals and electron clouds", "原子轨道与电子云", "用原子轨道和电子云描述电子空间分布和能量状态。", [C.orbitals], "full");
add("ss", "1.2a", 45, "aufbau_energy_order", "Orbital-energy order and Aufbau", "能级顺序与构造原理", "使用能级高低和构造原理确定基态电子排布顺序。", [C.electronConfig], "full");
add("ss", "1.2b", 45, "pauli_hund_configurations", "Pauli, Hund and configurations", "泡利原理、洪特规则与电子排布", "依据能量最低、泡利不相容和洪特规则书写 1—36 号元素基态排布。", [C.electronConfig], "full");
add("ss", "1.3a", 45, "advanced_periodic_properties", "Atomic radius, ionisation energy and electronegativity", "原子半径、电离能与电负性周期性", "解释原子半径、第一电离能和电负性的周期变化与例外。", [C.periodic, C.ionisation, C.electronegativity], "full");
add("ss", "1.3b", 45, "periodic_blocks_valence", "Periodic blocks and valence configurations", "元素周期表分区与价电子排布", "从价电子排布解释周期表分区、周期和族，并用于性质预测。", [C.electronConfig, C.periodic], "full");
add("ss", "2.1a", 47, "bonding_structure_properties", "Bonding, structure and properties", "微粒作用、结构与性质", "比较离子键、共价键和金属键模型，并由构成微粒和作用解释典型性质。", [C.ionic, C.covalent, C.metallic], "full");
add("ss", "2.1b", 47, "coordination_bonding", "Coordination bonding and complexes", "配位键与配位化合物", "说明配位键、中心离子、配体和简单配合物的成键特征及应用。", [C.complexes], "full");
add("ss", "2.1c", 47, "van_der_waals_hydrogen_bond", "Van der Waals forces and hydrogen bonding", "范德华力与氢键", "比较范德华力、分子内和分子间氢键及其对物质性质的影响。", [C.imf], "full");
add("ss", "2.2a", 47, "orbital_overlap_sigma_pi", "Orbital overlap, sigma and pi bonds", "轨道重叠、σ 键与 π 键", "用原子轨道重叠解释共价键方向性、饱和性以及 σ、π 键。", [C.covalent], "full");
add("ss", "2.2b", 47, "bond_polarity_metrics", "Bond polarity and bond metrics", "键极性、键能、键长与键角", "使用电负性、键能、键长和键角描述共价键和分子结构。", [C.electronegativity, C.bondEnthalpy], "full");
add("ss", "2.3a", 48, "molecular_shape_models", "Molecular-shape models", "分子空间结构模型", "用相关理论和模型解释、预测简单共价分子的空间结构。", [C.vsepr], "full");
add("ss", "2.3b", 48, "structure_measurement", "Molecular-structure measurement", "分子结构测定方法", "说明波谱和晶体 X 射线衍射信息如何支持分子结构模型。", [C.ir, C.nmr], "partial");
add("ss", "2.3c", 48, "molecular_polarity_chirality", "Molecular polarity and chirality", "分子极性与手性", "由键极性和空间结构判断分子极性，并说明手性对性质的影响。", [C.electronegativity, C.isomerism], "partial");
add("ss", "2.4a", 48, "crystal_cells_types", "Unit cells and crystal types", "晶胞与晶体类型", "描述晶体周期性和简单晶胞，比较分子、共价、离子和金属晶体结构。", [C.solids], "full");
add("ss", "2.4b", 48, "transitional_mixed_crystals", "Transitional and mixed crystals", "过渡晶体与混合型晶体", "解释典型晶体模型之间存在连续过渡和混合型结构。", [], "unmapped");
add("ss", "2.4c", 48, "aggregation_state_materials", "Aggregation states and materials", "聚集状态、微粒作用与材料性质", "从微粒种类、作用和聚集程度解释聚集状态与材料性质。", [], "unmapped");
practice("ss", "2.5a", 48, "prepare_complex_lab", "Preparing a simple complex", "简单配合物制备", "制备简单配合物并用现象支持配位形成判断。", "laboratory_practice");
practice("ss", "3.1a", 51, "structure_scale_model_evolution", "Structure scales and model evolution", "物质结构尺度与模型演进", "比较原子、分子和超分子尺度模型，并用证据说明模型演进。", "epistemic_practice");
add("ss", "3.2a", 51, "spectroscopy_xrd_methods", "Spectroscopy and X-ray diffraction", "光谱与晶体 X 射线衍射", "区分原子光谱、分子光谱和晶体 X 射线衍射所提供的结构信息。", [C.ir, C.nmr], "partial");
add("ss", "3.3a", 51, "structure_guided_material_design", "Structure-guided material design", "结构—性质与材料设计", "利用结构—性质关系解释材料优化和预期性质新物质设计。", [], "unmapped");
add("ss", "3.3b", 51, "structure_methods_life_science", "Structure methods in life science", "结构理论与生命科学", "说明结构理论和分析测试技术对生命科学问题研究的支持。", [], "unmapped");

// Selective required: Organic chemistry.
add("so", "1.1a", 53, "organic_connectivity_geometry", "Organic connectivity, bonding and geometry", "有机分子连接、成键与空间排布", "说明原子连接顺序、成键方式和空间排布共同决定有机分子结构。", [C.organicRepresentation, C.covalent], "partial");
add("so", "1.1b", 53, "constitutional_stereoisomerism", "Constitutional and stereoisomerism", "构造异构与立体异构", "辨识构造异构和立体异构并写出符合简单条件的异构体。", [C.isomerism], "full");
add("so", "1.1c", 53, "organic_ir_nmr", "IR and NMR for organic structure", "红外与核磁共振测定有机结构", "结合简单红外和核磁共振信息判断官能团和分子结构。", [C.ir, C.nmr], "full");
add("so", "1.2a", 53, "functional_groups_classification_naming", "Functional groups, classification and naming", "官能团、分类与命名", "辨识课标所列官能团，按官能团分类并命名简单有机物。", [C.organicRepresentation, C.nomenclature], "full");
add("so", "1.2b", 53, "functional_group_properties_conversion", "Functional-group properties and conversion", "官能团性质、相互影响与转化", "由官能团和基团间相互影响预测特征性质与官能团转化。", [C.organicRepresentation, C.mechanisms], "partial");
add("so", "1.2c", 53, "functional_group_tests", "Tests for functional groups", "常见官能团检验", "根据特征反应和干扰选择常见官能团检验并解释现象。", [C.aldehydeKetone], "partial");
add("so", "1.3a", 54, "organic_bond_polarity_reactivity", "Organic bond polarity and reactivity", "有机化学键极性与反应", "从共价键类型、极性和基团相互影响判断可能断键成键位置与转化。", [C.bondFission, C.mechanisms, C.electronegativity], "full");
add("so", "2.1a", 56, "hydrocarbon_classes", "Hydrocarbon classes and applications", "烷烃、烯烃、炔烃与芳香烃", "比较主要烃类的组成、结构、性质和生产生活应用。", [C.alkanes, C.alkenes, C.benzene], "full");
add("so", "2.2a", 56, "halogenoalkanes_alcohols", "Halogenoalkanes and alcohols", "卤代烃与醇", "由结构解释卤代烃和醇的主要性质、转化与应用。", [C.nucleophilicSub, C.elimination, C.alcohol], "full");
add("so", "2.2b", 56, "carbonyl_acid_ester", "Carbonyls, carboxylic acids and esters", "醛、酮、羧酸与酯", "比较醛、酮、羧酸和酯的结构、特征反应、转化和应用。", [C.aldehydeKetone, C.carboxylic, C.esters], "full");
add("so", "2.2c", 56, "phenols_amines_amides", "Phenols, amines and amides", "酚、胺与酰胺", "说明酚、胺和酰胺的结构特点、典型性质和应用。", [C.phenol, C.amines, C.amides], "full");
add("so", "2.3a", 56, "organic_reaction_patterns", "Organic reaction patterns", "有机反应类型与规律", "从官能团和断键成键识别加成、取代、消去和氧化还原反应规律。", [C.mechanisms, C.nucleophilicSub, C.elimination], "full");
add("so", "2.3b", 56, "organic_synthesis_routes", "Organic synthesis routes", "有机合成路线设计", "围绕碳骨架构建和官能团转化设计、比较简单有机合成路线。", [], "unmapped");
add("so", "2.4a", 56, "organic_safety_green_synthesis", "Organic safety and green synthesis", "有机物安全与绿色合成", "评价有机物对环境健康的影响，并用绿色化学思想比较合成方案。", [], "unmapped");
practice("so", "2.5a", 56, "ethyl_ethanoate_lab", "Ethyl ethanoate preparation", "乙酸乙酯制备与性质", "制备乙酸乙酯，控制条件并检验产物性质。", "laboratory_practice");
practice("so", "2.5b", 56, "functional_group_test_lab", "Functional-group testing", "有机官能团检验实验", "设计并实施常见官能团检验，处理干扰并解释证据。", "laboratory_practice");
add("so", "3.1a", 58, "polymer_monomer_repeat_unit", "Polymer, monomer and repeat unit", "聚合物、单体与链节", "由聚合物结构识别单体、链节和聚合方式。", [C.additionPolymer, C.condensationPolymer], "partial");
add("so", "3.1b", 58, "addition_condensation_polymerisation", "Addition and condensation polymerisation", "加聚与缩聚", "比较加聚、缩聚反应的单体特征、成键和小分子副产物。", [C.additionPolymer, C.condensationPolymer], "full");
add("so", "3.2a", 59, "carbohydrates", "Carbohydrates", "糖类、葡萄糖、淀粉与纤维素", "说明葡萄糖、淀粉和纤维素的结构关系、主要性质和应用。", [], "unmapped");
add("so", "3.2b", 59, "amino_acids_proteins", "Amino acids and proteins", "氨基酸与蛋白质", "说明氨基酸结构与性质、肽键形成及蛋白质结构性质和健康意义。", [C.aminoAcids], "full");
add("so", "3.2c", 59, "dna_rna", "DNA and RNA", "DNA、RNA 结构与功能", "概述 DNA、RNA 的基本结构特点、生物功能及人工合成意义。", [], "unmapped");
add("so", "3.3a", 59, "synthetic_polymers_materials", "Synthetic polymers and advanced materials", "合成高分子与新型材料", "比较塑料、合成橡胶、合成纤维的结构特点和新型高分子材料应用。", [C.additionPolymer, C.condensationPolymer], "partial");
practice("so", "3.4a", 59, "carbohydrate_properties_lab", "Carbohydrate properties", "糖类性质实验", "实施糖类性质实验并用反应证据区分相关物质。", "laboratory_practice");

const requirementId = (outcome) => `req_cn_sh_chem_2020_o_${outcome.level}_${outcome.code.replaceAll(".", "_")}_${outcome.key}`;
const evidence = (outcome) => [{
  source_id: SOURCE_ID,
  locator: `化学标准PDF p.${outcome.page}（正文对应内容要求 ${outcome.code.replace(/[a-z]$/, "")}），${levels[outcome.level].labelZh}`,
}];
const requirements = outcomes.map((outcome) => ({
  requirement_id: requirementId(outcome),
  parent_requirement_id: null,
  code: `${levels[outcome.level].labelZh}·${outcome.code}`,
  title: outcome.title,
  title_zh: outcome.titleZh,
  summary_zh: outcome.summaryZh,
  requirement_type: outcome.requirementType,
  level_id: outcome.level,
  cognitive_processes: outcome.cognitive,
  evidence_refs: evidence(outcome),
  review_status: "needs_review",
}));

const framework = {
  schema_version: "2.0.0",
  content_version: "0.3.0",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  curriculum_kind: "national_standard",
  title: "China senior-high chemistry curriculum-standard outcome coverage",
  title_zh: "中国普通高中化学课程标准（2017 年版 2020 年修订）成果级覆盖",
  subject: "Chemistry",
  jurisdiction: "CN-MAINLAND",
  education_stage: "senior_secondary",
  requirement_granularity: "outcome",
  levels: Object.entries(levels).map(([level_id, level]) => ({ level_id, label: level.label, label_zh: level.labelZh })),
  languages: ["zh-CN", "en"],
  source_ids: [SOURCE_ID],
  valid_from: "2020-05-11",
  valid_to: null,
  review_status: "needs_review",
  scope_exclusions: [],
  changelog: [
    { version: "0.1.0", date: "2026-07-18", summary_zh: "建立必修与选择性必修主题级基线。" },
    { version: "0.2.1", date: "2026-07-18", summary_zh: "复核主题边界并撤销未经逐项证明的完整覆盖声明。" },
    { version: "0.3.0", date: TODAY, summary_zh: `按 63 个正式编号内容段落拆为 ${outcomes.length} 个可独立诊断成果，实验探究与安全实践不写入学科概念。` },
  ],
  requirements,
};

const rationale = {
  full: "现有 canonical 概念组合与该诊断成果的定义和课程深度一致。",
  partial: "现有 canonical 概念提供直接支撑，但缺少该成果中的窄范围、应用边界或中国课程表述，不能声明完整覆盖。",
  unmapped: "统一 KG 中尚无边界足够准确、可独立诊断且不捆绑超范围内容的概念。",
  excluded: "该成果评价实验、探究、证据、安全或工程过程，进入教学与评测知识层，不写入学科概念掌握度。",
};
const mappings = outcomes.map((outcome) => ({
  mapping_id: requirementId(outcome).replace(/^req_/, "map_"),
  requirement_id: requirementId(outcome),
  canonical_ids: outcome.canonicalIds,
  coverage_status: outcome.coverage,
  relation: ["unmapped", "excluded"].includes(outcome.coverage) ? "not_applicable" : "required",
  mapping_basis: "semantic_inference",
  confidence: ["full", "excluded"].includes(outcome.coverage) ? "high" : outcome.coverage === "partial" ? "medium" : "low",
  rationale_zh: rationale[outcome.coverage],
  evidence_refs: evidence(outcome),
  review_status: "needs_review",
}));
const mappingSet = {
  schema_version: "3.0.0",
  content_version: "0.3.0",
  mapping_set_id: "cms_cn_moe_senior_high_chemistry_2020_outcomes",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Chemistry",
  mapping_scope: "outcome_coverage",
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [
    { version: "0.1.0", date: "2026-07-18", summary_zh: "建立主题级候选映射。" },
    { version: "0.2.1", date: "2026-07-18", summary_zh: "复核主题边界和跨层级误映射。" },
    { version: "0.3.0", date: TODAY, summary_zh: `替换为 ${outcomes.length} 个成果的保守映射。` },
  ],
  mappings,
};

const gapCandidates = outcomes
  .filter((outcome) => ["partial", "unmapped"].includes(outcome.coverage))
  .map((outcome) => ({
    gap_id: requirementId(outcome).replace(/^req_/, "gap_"),
    requirement_ids: [requirementId(outcome)],
    action: outcome.coverage === "unmapped" ? "add_concept" : "split_or_narrow_existing",
    proposed_name: outcome.title,
    proposed_name_zh: outcome.titleZh,
    scope_zh: outcome.summaryZh,
    existing_canonical_ids: outcome.canonicalIds,
    suggested_graph_id: "senior_secondary_chemistry",
    rationale_zh: outcome.coverage === "unmapped" ? "全库未找到语义等价且粒度相同的现有概念。" : "现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确 alias。",
    evidence_refs: evidence(outcome),
    review_status: "needs_review",
  }));
const gapSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  gap_set_id: "cgs_cn_moe_senior_high_chemistry_2020_outcomes",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Chemistry",
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [{ version: "0.1.0", date: TODAY, summary_zh: "逐成果反向查重并记录 partial 与 unmapped 缺口；实验和安全实践不进入概念缺口。" }],
  candidates: gapCandidates,
};

const practiceItems = outcomes.filter((outcome) => outcome.coverage === "excluded").map((outcome) => ({
  practice_id: `practice_cn_sh_chem_2020_${outcome.level}_${outcome.code.replaceAll(".", "_")}_${outcome.key}`,
  requirement_ids: [requirementId(outcome)],
  kind: outcome.practiceKind ?? "inquiry_process",
  name: outcome.title,
  name_zh: outcome.titleZh,
  description_zh: outcome.summaryZh,
  instructional_use_zh: "以真实化学问题组织可复核的实验、证据或安全决策过程，要求说明变量、操作、证据与结论的关系。",
  assessment_evidence_zh: "提交可复核的方案、操作记录、现象或数据、风险控制及基于证据的解释；不能只用记忆性结论替代过程证据。",
  evidence_refs: evidence(outcome),
  review_status: "needs_review",
}));
const practiceSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  practice_set_id: "cpk_cn_moe_senior_high_chemistry_2020",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Chemistry",
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [{ version: "0.1.0", date: TODAY, summary_zh: `把 ${practiceItems.length} 项实验、探究、证据、安全和工程实践分流到教学评测知识层。` }],
  items: practiceItems,
};

const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
writeJson(paths.framework, framework);
writeJson(paths.mapping, mappingSet);
writeJson(paths.gaps, gapSet);
writeJson(paths.practices, practiceSet);
const counts = mappings.reduce((result, mapping) => {
  result[mapping.coverage_status] = (result[mapping.coverage_status] ?? 0) + 1;
  return result;
}, {});
process.stdout.write(`[upgrade-cn-chemistry] 63 official content sections -> ${outcomes.length} diagnostic outcomes; ${counts.full ?? 0} full, ${counts.partial ?? 0} partial, ${counts.unmapped ?? 0} unmapped, ${counts.excluded ?? 0} excluded; ${gapCandidates.length} gaps\n`);
