#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const TODAY = "2026-07-19";
const SOURCE_ID = "src_sg_moe_lower_secondary_g2_g3_science_2021";
const FRAMEWORK_ID = "cfw_sg_moe_lower_secondary_g2_g3_science_2021_outcomes";
const CURRICULUM_ID = "cur_sg_moe_lower_secondary_g2_g3_science_2021";
const GRAPH_ID = "singapore_lower_secondary_science";
const paths = {
  framework: resolve(ROOT, "data/knowledge-graphs/curricula/frameworks/sg_moe_lower_secondary_g2_g3_science_2021.json"),
  mapping: resolve(ROOT, "data/knowledge-graphs/curricula/mappings/pending/sg_moe_lower_secondary_g2_g3_science_2021.json"),
  gaps: resolve(ROOT, "data/knowledge-graphs/curricula/gaps/pending/sg_moe_lower_secondary_g2_g3_science_2021_outcomes.json"),
  practices: resolve(ROOT, "data/knowledge-graphs/pedagogy/practices/sg_moe_lower_secondary_g2_g3_science_2021.json"),
  sources: resolve(ROOT, "data/knowledge-graphs/governance/sources.json"),
};

const C = {
  densityPressure: "pc_4405d9d25f9715d1d5862ce1888d71bc",
  classification: "pc_71fd336e183a13297655fa7d7be1aa3e",
  substanceClassification: "pc_75b3836fc0d83d4b0cdc346c8ac5d125",
  colloids: "pc_beb45d013bb8fe55d38730f8c8caf40e",
  chromatography: "pc_c4dd935c7ad3b4429321fa1c103185a4",
  waveReflectionRefraction: "pc_baa60c957b8bd7b6c51f2aca82fea230",
  refractionLaw: "pc_f2190132d4ec3c5684fa2dc0daf6888a",
  organelles: "pc_cb341a51c60bb212ac55750a84630c03",
  cellularUnity: "pc_64852ab0501ee4d7b32d11655eb6b808",
  cellDifferentiation: "pc_603e03befcc0fac76e8a059261559f56",
  organSystemExchange: "pc_169fad745be0c7b18694394af7fb06fe",
  diffusionBrownian: "pc_cb05fe82422660602c2d01c5c94d17df",
  diffusionOsmosis: "pc_c2e6fec2c47cd86ee9b8726b908a7a8b",
  subatomic: "pc_d3750ab7dae24f534aee9f39f91e5f71",
  atomicNuclearModel: "pc_e180a73d3a69ee874db1ed7939a2c604",
  molecularFormulae: "pc_f143886b125448b751d8adcc1cc7aaa9",
  forceTypes: "pc_7a4b1f0c0833180c2f630c367c02cc0a",
  moments: "pc_e187e0ecc95069bb8486ab30bf437e00",
  elasticPlastic: "pc_0a3947e780f2fb38acc363f3429f9c06",
  work: "pc_a52c805e6ece9b48168340e9eb886aaf",
  energyConservation: "pc_16e60ad8536c19468a26bfce26abd36b",
  renewableEnergy: "pc_2b5c32948baf2a177d94d9e594242e82",
  temperature: "pc_c625010f4166e3a97ef4ebbd075529de",
  conservation: "pc_aa24b4324d962f7ab29f0ddeb0f63405",
  ecosystems: "pc_ecfaff613c7086e0cece6014f44b68ba",
  foodWebs: "pc_70da4d7e60b713056853543f2b486297",
  matterEnergyFlow: "pc_a26230828b27cf03028e959c4472f5f1",
  ecosystemDisturbance: "pc_cee4cb6816eac128a0e6f36535957b6a",
  currentCharge: "pc_62a6d88e535c20e54fc65c369645f13d",
  potentialDifference: "pc_2c6fac377de551f06f129beb0bd0767f",
  resistanceOhm: "pc_6a2c33585e2f59dc88ebd095503f1547",
  circuitComponents: "pc_ba42e2ddad519230d0c77b2fca8ae0cf",
  seriesParallel: "pc_bca889f92c123c04cec219d0a9311714",
  magneticFieldCurrent: "pc_21210700d95c5fb054342d60854fa86a",
  electricalWorkPower: "pc_d402d63a7ae8461cf8182aba31d92622",
  electricalSafety: "pc_29c1e5800d16e059b57e43dce0511d8f",
  enzymeAction: "pc_eb22ca391770b29f75a2f022a09e31af",
  bloodVessels: "pc_ff5a585bec0e26749bef92e5b2ec6c2c",
  xylem: "pc_eaac05ec18f4256f6a2eb41ca33b0969",
  phloem: "pc_fcdfd6ff2ea888cea137488f28fb500c",
  fertilisation: "pc_2bb6c5caf86fb9a1beb4b9ed7331d3fc",
  gene: "pc_4968ce1f12aa3d8827a46863b03b81d2",
  endocrine: "pc_73decdd85804bf6c56ea96df910916d1",
  antibiotics: "pc_cd2b7974451c31f7abce21cc90110697",
  virusClassification: "pc_a5f0cc3dc0636e18a4fef67d49bec23e",
};

const pages = {
  SE: "PDF p.30, The Scientific Endeavour learning outcomes",
  2: "PDF p.32, topic 2 learning outcomes",
  3: "PDF p.33, topic 3 learning outcomes",
  4: "PDF p.34, topic 4 learning outcomes",
  5: "PDF p.36, topic 5 learning outcomes",
  6: "PDF p.37, topic 6 learning outcomes",
  7: "PDF p.38, topic 7 learning outcomes",
  8: "PDF p.39, topic 8 learning outcomes",
  9: "PDF p.41, topic 9 learning outcomes",
  10: "PDF p.43, topic 10 learning outcomes",
  11: "PDF p.44, topic 11 learning outcomes",
  12: "PDF p.45, topic 12 learning outcomes",
  13: "PDF p.47, topic 13 learning outcomes",
  14: "PDF p.48, topic 14 learning outcomes",
  15: "PDF p.49, topic 15 learning outcomes",
  16: "PDF p.50, topic 16 learning outcomes",
};

const outcomes = [];
const counters = new Map();
function add(category, section, key, title, titleZh, summaryZh, options = {}) {
  const counterKey = `${section}:${category}`;
  const index = (counters.get(counterKey) ?? 0) + 1;
  counters.set(counterKey, index);
  const marker = category === "knowledge" ? "K" : category === "practice" ? "P" : "V";
  outcomes.push({
    category,
    section: String(section),
    key,
    code: `${section}.${marker}${String(index).padStart(2, "0")}`,
    title,
    titleZh,
    summaryZh: options.optionalG2
      ? `${summaryZh}（整项对 G2 可选；G3 范围内。）`
      : options.partialOptionalZh
        ? `${summaryZh}（其中${options.partialOptionalZh}对 G2 可选；其余部分对 G2 和 G3 均在范围内。）`
        : summaryZh,
    optionalG2: options.optionalG2 ?? false,
    canonicalIds: options.canonicalIds ?? [],
    coverage: category === "knowledge" ? (options.coverage ?? "unmapped") : "excluded",
    rationaleZh: options.rationaleZh,
    cognitive: options.cognitive ?? (category === "knowledge" ? ["understand", "apply"] : ["apply", "evaluate", "communicate"]),
  });
}
const k = (section, key, title, titleZh, summaryZh, options) => add("knowledge", section, key, title, titleZh, summaryZh, options);
const p = (section, key, title, titleZh, summaryZh, options) => add("practice", section, key, title, titleZh, summaryZh, options);
const v = (section, key, title, titleZh, summaryZh, options) => add("value", section, key, title, titleZh, summaryZh, options);

v("SE", "science_beyond_laboratory", "Science beyond the laboratory", "科学不限于实验室", "认识科学存在于日常生活的各个方面。", { cognitive: ["understand", "reflect"] });
v("SE", "curiosity_natural_phenomena", "Curiosity about natural phenomena", "对自然现象保持好奇", "对世界中的自然现象表现出健康的好奇心。", { cognitive: ["observe", "reflect"] });
v("SE", "science_human_endeavour", "Science as a human endeavour", "科学是人类共同事业", "理解不同文明在数百年间共同贡献科学知识。", { cognitive: ["understand", "reflect"] });
p("SE", "evidence_types_senses_instruments", "Types and sources of scientific evidence", "科学证据的类型与来源", "辨认定量或定性证据，并理解感官与仪器都可用于收集证据。", { cognitive: ["understand", "analyze"] });
p("SE", "evidence_reasoning_knowledge_building", "Evidence and rigorous reasoning", "证据与严谨推理建构知识", "由系统收集、分析证据和基于证据的严谨推理说明科学知识如何形成。", { cognitive: ["analyze", "reason"] });
p("SE", "multiple_evidence_interpretations", "Multiple interpretations of evidence", "证据可能有多种解释", "识别同一科学证据可能支持多种解释，并比较解释的依据。", { cognitive: ["analyze", "evaluate"] });
p("SE", "scientific_inquiry_cycle", "Scientific inquiry cycle", "科学探究循环", "提出问题，规划和实施调查，评价实验结果并交流发现；在各主题中使用估测、SI 单位和合适单位。", { cognitive: ["inquire", "evaluate", "communicate"] });
p("SE", "measurement_accuracy", "Measurement accuracy", "测量准确度", "解释准确度是测量值与被测量真值接近的程度。", { cognitive: ["understand", "evaluate"] });
p("SE", "measurement_precision", "Measurement precision", "测量精密度", "解释精密度是重复测量所得数值彼此接近的程度。", { cognitive: ["understand", "evaluate"] });
p("SE", "zero_error", "Zero error", "零点误差", "识别仪器在本应无读数时仍显示读数的零点误差。", { cognitive: ["identify", "evaluate"] });
p("SE", "parallax_error", "Parallax error", "视差误差", "识别因观察方向不正确而造成的仪器刻度读数误差。", { cognitive: ["identify", "evaluate"] });
p("SE", "unpredictable_consistent_errors", "Unpredictable and consistent measurement errors", "不可预测误差与一致性误差", "区分不可预测误差与一致性误差，并说明它们可能同时存在。", { optionalG2: true, cognitive: ["understand", "analyze"] });
v("SE", "inquiry_dispositions", "Dispositions for scientific inquiry", "科学探究品质", "在探究中体现创造力、客观性、诚信、开放态度与毅力。", { cognitive: ["apply", "reflect"] });
p("SE", "investigation_safety", "Safe scientific investigation", "安全开展科学调查", "开展调查时保持安全意识并采用安全操作。", { cognitive: ["apply", "evaluate"] });
v("SE", "technology_benefits_harms", "Benefits and harms of science and technology", "科技应用的利弊", "讨论科学与技术应用给社会带来的有益和有害后果。", { cognitive: ["analyze", "evaluate"] });
v("SE", "science_social_ethics", "Science in social and ethical issues", "科学、社会与伦理议题", "把科学应用联系到具体社会和伦理问题。", { cognitive: ["analyze", "evaluate"] });
v("SE", "science_technology_limitations", "Limits of science and technology", "科学与技术的局限", "说明科学与技术解决社会问题时的当前局限。", { cognitive: ["evaluate", "communicate"] });
v("SE", "responsible_science_technology", "Responsible use of science and technology", "负责任地使用科技", "认识使用技术与科学知识时对社会和环境负有责任。", { cognitive: ["evaluate", "reflect"] });

k(2, "observable_measurable_physical_properties", "Observable and measurable physical properties", "可观察与可测量的物理性质", "描述导电性、导热性、熔沸点、密度以及材料强度、硬度和柔韧性等物理性质。", { canonicalIds: [C.densityPressure], coverage: "partial", partialOptionalZh: "强度、硬度和柔韧性", rationaleZh: "现有复合概念只直接覆盖密度且捆绑本成果未要求的压强；其他材料性质尚未建模。" });
k(2, "mass_volume_density_relation", "Mass, volume and density", "质量、体积与密度关系", "说明质量和体积如何共同影响密度。", { canonicalIds: [C.densityPressure], coverage: "partial", rationaleZh: "现有概念含密度定义和计算，但与压强捆绑，需更窄的低年级密度概念。" });
p(2, "classify_everyday_objects", "Classifying everyday objects", "日常物体的多重分类", "对常见物体分类，并认识同一组物体可按不同准则分类。", { cognitive: ["classify", "analyze"] });
p(2, "evaluate_material_use", "Evaluate material use from property data", "依据性质数据评价材料用途", "使用物理性质数据评价材料在产品或情境中的适用性。", { cognitive: ["analyze", "evaluate"] });
p(2, "communicate_classification", "Communicate and justify classification", "交流并论证分类", "交流分类结果并说明所选分类准则。", { cognitive: ["communicate", "reason"] });
p(2, "estimate_length_mass_volume", "Estimate length, mass and volume", "估测长度、质量与体积", "估测物体的长度、质量和体积。", { cognitive: ["estimate", "apply"] });
p(2, "measure_length_mass_volume", "Measure length, mass and volume", "测量长度、质量与体积", "用合适仪器和方法准确测量长度、质量以及液体和固体的体积。", { cognitive: ["measure", "evaluate"] });
p(2, "volume_displacement", "Volume displacement for irregular objects", "排水法测不规则物体体积", "应用体积排水原理求不规则物体的体积。", { optionalG2: true, cognitive: ["apply", "measure"] });
p(2, "density_sink_float_prediction", "Predict sinking or floating from density", "用密度预测沉浮", "比较物体与周围介质的密度，预测物体沉浮。", { cognitive: ["apply", "predict"] });
p(2, "density_calculation_units", "Calculate density with appropriate units", "密度计算与单位", "使用密度等于质量除以体积计算，并使用合适单位。", { cognitive: ["calculate", "apply"] });
v(2, "sustainable_material_choices", "Sustainable material choices", "基于性质作可持续材料选择", "依据材料物理性质，对家用产品作安全、适当且可持续的选择。", { cognitive: ["evaluate", "decide"] });
v(2, "alternative_materials_environment", "Alternative materials and environmental impact", "替代材料与环境影响", "认识以性质相近的替代材料减少不可持续材料用量可降低环境影响。", { cognitive: ["evaluate", "reflect"] });

k(3, "elements_building_blocks", "Elements as building blocks of matter", "元素是物质的基本构成", "说明元素是生物与非生物物质的基本构成。", { canonicalIds: [C.substanceClassification], coverage: "partial", rationaleZh: "现有物质分类概念范围更高且未独立诊断元素的入门定义。" });
k(3, "element_types_periodic_table", "Types of elements in the Periodic Table", "周期表中的元素类型", "认识周期表中有不同类型的元素，例如金属与非金属。", { coverage: "unmapped", rationaleZh: "现有周期性概念超出本成果，缺少按金属与非金属识别元素的低年级概念。" });
k(3, "compound_definition", "Compounds as chemically combined elements", "化合物由元素化学结合形成", "说明化合物由两种或以上元素化学结合而成。", { canonicalIds: [C.substanceClassification], coverage: "partial", rationaleZh: "现有分类概念包含化合物，但没有适合低年级独立诊断的定义边界。" });
k(3, "compound_properties", "Properties of compounds and constituent elements", "化合物与组成元素的性质差异", "说明化合物的性质不同于组成它的元素。", { coverage: "unmapped", rationaleZh: "统一 KG 没有该入门层次的独立概念。" });
k(3, "mixture_definition", "Mixtures are not chemically combined", "混合物未经化学结合", "说明混合物由两种或以上未发生化学结合的元素和/或化合物组成。", { canonicalIds: [C.substanceClassification], coverage: "partial", rationaleZh: "现有分类概念覆盖类别，但没有独立诊断未化学结合这一边界。" });
k(3, "mixture_constituent_properties", "Mixtures retain constituent properties", "混合物保留组分性质", "说明混合物表现其各组分的性质。", { coverage: "unmapped", rationaleZh: "统一 KG 没有该入门层次的独立概念。" });
k(3, "solute_solvent_solution", "Solute, solvent and solution", "溶质、溶剂与溶液", "区分溶质、溶剂和溶液。", { coverage: "unmapped", rationaleZh: "现有胶体和溶液相关高级内容不能替代三个基础术语。" });
k(3, "solutions_suspensions_mixtures", "Solutions and suspensions as mixtures", "溶液与悬浊液属于混合物", "说明溶液和悬浊液都属于混合物。", { canonicalIds: [C.colloids], coverage: "partial", rationaleZh: "现有分散系概念可支撑悬浊液边界，但范围更高且未独立覆盖溶液。" });
p(3, "distinguish_element_compound_mixture", "Distinguish elements, compounds and mixtures", "区分元素、化合物与混合物", "依据组成与结合方式区分元素、化合物和混合物。", { cognitive: ["classify", "analyze"] });
p(3, "classify_by_chemical_composition", "Classify matter by chemical composition", "按化学组成分类物质", "依据化学组成把物质分类为元素、化合物或混合物。", { cognitive: ["classify", "reason"] });
p(3, "dissolving_rate_solubility_factors", "Factors affecting dissolving and solubility", "影响溶解速率与溶解度的因素", "调查影响溶解速率以及物质溶解度的因素。", { partialOptionalZh: "溶解度部分", cognitive: ["inquire", "analyze"] });
v(3, "waste_classification_recycling", "Chemical classification for recycling", "以化学组成促进回收再用", "理解按化学组成分类废物可促进贵重材料回收与再利用。", { cognitive: ["understand", "evaluate"] });
v(3, "composition_benefits_harms", "Benefits and harms of knowing composition", "了解日用品化学组成的利弊", "认识了解日用品化学组成可帮助判断其有益或有害用途。", { cognitive: ["analyze", "evaluate"] });

k(4, "separation_by_properties", "Separating mixtures by physical properties", "依据物理性质分离混合物", "解释如何用磁吸、过滤、蒸发、蒸馏和纸色谱按性质分离混合物组分。", { canonicalIds: [C.chromatography], coverage: "partial", rationaleZh: "纸色谱已有直接概念，其余四种基础分离方法未覆盖。" });
k(4, "separation_applications", "Applications of separation techniques", "分离技术的生活与工业应用", "说明分离技术在水处理、食品安全和废物管理等生活与工业情境中的应用。", { canonicalIds: [C.chromatography], coverage: "partial", partialOptionalZh: "反渗透示例", rationaleZh: "现有色谱概念只覆盖一种技术，不能覆盖水处理等多方法应用。" });
p(4, "investigate_mixture_separation", "Investigate separation of mixtures", "实验分离混合物", "依据基本原理实验比较磁吸、过滤、蒸发、蒸馏和纸色谱。", { cognitive: ["inquire", "apply", "evaluate"] });
v(4, "water_precious_conservation", "Water as a precious resource", "珍惜并节约水资源", "理解水是珍贵资源并需要节约。", { cognitive: ["understand", "reflect"] });
v(4, "singapore_sustainable_water", "Singapore's sustainable potable water", "新加坡可持续饮用水来源", "理解新加坡如何利用分离技术保障可持续饮用水来源。", { cognitive: ["understand", "evaluate"] });

k(5, "ray_model_path", "Ray model as the path of light", "射线模型表示光的路径", "说明射线模型表示光传播所经过的路径。", { canonicalIds: [C.waveReflectionRefraction], coverage: "partial", rationaleZh: "现有概念覆盖波的反射折射，但未独立定义射线模型及其适用范围。" });
k(5, "reflecting_surfaces_effects_uses", "Effects and uses of reflecting surfaces", "反射面的效果与用途", "描述平面和曲面反射面的效果与用途。", { canonicalIds: [C.waveReflectionRefraction], coverage: "partial", rationaleZh: "现有概念没有区分平面、曲面反射面及其日常用途。" });
k(5, "smooth_rough_reflection", "Reflection from smooth and rough surfaces", "光滑与粗糙表面的反射", "用射线模型解释光滑与粗糙表面对反射的影响。", { canonicalIds: [C.waveReflectionRefraction], coverage: "partial", rationaleZh: "现有反射概念没有独立覆盖镜面反射与漫反射的表面条件。" });
k(5, "refraction_speed_media", "Refraction from speed change between media", "介质中光速变化导致折射", "说明光在不同介质中速度改变可导致折射，不要求角度计算。", { canonicalIds: [C.refractionLaw], coverage: "partial", optionalG2: true, rationaleZh: "现有折射定律范围更高并包含角度定量关系；需保留本大纲的定性边界。" });
k(5, "refraction_effects", "Effects of refraction", "折射现象的效果", "描述若干折射造成的可观察效果。", { canonicalIds: [C.refractionLaw], coverage: "partial", optionalG2: true, rationaleZh: "折射定律提供原理，但未独立覆盖低年级观察与解释任务。" });
k(5, "white_light_dispersion", "Dispersion of white light by a prism", "棱镜对白光的色散", "用射线模型描述棱镜使白光发生色散。", { coverage: "unmapped", optionalG2: true, rationaleZh: "统一 KG 尚无棱镜色散的窄概念。" });
p(5, "plane_mirror_image_investigation", "Investigate plane-mirror images", "调查平面镜成像特征", "实验调查平面镜所成像的特征。", { cognitive: ["inquire", "measure", "analyze"] });
p(5, "law_of_reflection_investigation", "Investigate the law of reflection", "实验验证反射定律", "相对法线调查反射角等于入射角。", { optionalG2: true, cognitive: ["inquire", "measure", "evaluate"] });
v(5, "em_radiation_benefits_harms", "Benefits and harms of EM radiation", "电磁辐射的利与弊", "认识红外线、紫外线和可见光等电磁辐射既有益也可能有害。", { cognitive: ["understand", "evaluate"] });
v(5, "technology_light_impact", "Societal and environmental impact of artificial light", "技术照明的社会与环境影响", "评价技术产生的光对社会和环境的正负影响，例如夜间可见度、光污染、鸟类迷航和能源使用。", { cognitive: ["analyze", "evaluate"] });

k(6, "typical_cell_part_functions", "Functions of parts of a typical cell", "典型细胞各部分的功能", "说明细胞壁、细胞膜、细胞质、细胞核、液泡和叶绿体等结构的功能，并认识细胞核含可遗传的 DNA。", { canonicalIds: [C.organelles, C.gene], coverage: "partial", rationaleZh: "细胞器与基因概念可支撑主要结构和遗传材料，但范围高于典型低年级细胞模型。" });
k(6, "plant_animal_cell_models", "Typical plant and animal cells as models", "典型动植物细胞是模型", "说明典型植物细胞和动物细胞是代表多样细胞形态的模型。", { canonicalIds: [C.cellularUnity], coverage: "full", rationaleZh: "细胞结构统一性与多样性概念直接覆盖典型模型与真实细胞差异。" });
k(6, "cells_tissues_organs_systems", "Cells, tissues, organs and systems", "细胞、组织、器官与系统层级", "说明多细胞生物由细胞组成组织、器官和系统。", { canonicalIds: [C.organSystemExchange], coverage: "partial", rationaleZh: "现有概念涉及器官系统，但没有独立覆盖由细胞到系统的结构层级。" });
k(6, "cellular_division_of_labour", "Division of labour among cells", "细胞层级的分工", "解释多细胞生物中细胞分工的重要性。", { canonicalIds: [C.cellDifferentiation], coverage: "partial", optionalG2: true, rationaleZh: "细胞分化提供形成分工的机制，但未独立诊断分工的系统意义。" });
p(6, "microscope_cell_identification", "Identify cell parts with a microscope", "使用显微镜辨认细胞结构", "使用显微镜辨认典型植物或动物细胞的主要结构。", { partialOptionalZh: "安全且正确操作显微镜的部分", cognitive: ["apply", "observe", "identify"] });
p(6, "infer_plant_or_animal_cell", "Infer plant or animal from cell structures", "由细胞结构推断动植物", "依据细胞结构推断生物属于动物还是植物。", { cognitive: ["analyze", "infer"] });
v(6, "microscope_technology_knowledge", "Microscopy and knowledge-building", "显微技术推动知识建构", "理解显微镜等技术进步与科学知识建构之间的关系。", { cognitive: ["understand", "reflect"] });

k(7, "particulate_model_random_motion", "Particulate model and random motion", "粒子模型与随机运动", "说明物质粒子模型把物质表示为不断随机运动的微小离散粒子。", { canonicalIds: [C.diffusionBrownian], coverage: "partial", rationaleZh: "扩散与布朗运动支持随机运动证据，但未独立覆盖三态通用粒子模型。" });
k(7, "particle_arrangement_states", "Particle arrangement and motion in states", "三态粒子排列与运动", "用粒子模型描述固态、液态和气态中粒子的排列与运动。", { coverage: "unmapped", rationaleZh: "统一 KG 尚无面向三态的基础粒子模型概念。" });
k(7, "diffusion_concentration_gradient", "Diffusion down a concentration gradient", "沿浓度梯度扩散", "说明扩散是粒子从较高浓度区域向较低浓度区域的净运动。", { canonicalIds: [C.diffusionBrownian, C.diffusionOsmosis], coverage: "full", rationaleZh: "一般扩散与生物被动运输两个概念共同直接覆盖定义和浓度梯度。" });
k(7, "thermal_expansion_mass_conservation_model", "Expansion, contraction and mass conservation", "热胀冷缩及质量守恒模型", "用模型解释膨胀、收缩以及这些过程中质量守恒。", { coverage: "unmapped", rationaleZh: "统一 KG 没有把粒子模型、体积变化与质量守恒连在一起的低年级概念。" });
k(7, "state_changes_particle_model", "Melting and boiling in the particle model", "粒子模型解释熔化与沸腾", "用粒子模型解释三态转换中的熔化和沸腾。", { coverage: "unmapped", optionalG2: true, rationaleZh: "现有比热和潜热概念深度过高，不能替代三态粒子解释。" });
v(7, "model_creativity_revision", "Creativity and revision in model-building", "模型建构中的创造与修正", "欣赏以创造力和开放态度建构、检验并修正物质粒子模型的科学实践。", { cognitive: ["evaluate", "reflect"] });

k(8, "neutral_atom_structure", "Structure of a neutral atom", "中性原子的结构", "描述电中性原子由含质子和中子的正电原子核以及核外负电子组成。", { canonicalIds: [C.subatomic, C.atomicNuclearModel], coverage: "full", rationaleZh: "亚原子粒子与核式结构模型组合直接覆盖电荷、组成和核外电子。" });
k(8, "atomic_mass_nucleus", "Atomic mass is concentrated in the nucleus", "原子质量主要集中在原子核", "认识原子质量主要由原子核质量贡献。", { canonicalIds: [C.atomicNuclearModel], coverage: "partial", optionalG2: true, rationaleZh: "核式结构概念提供基础，但没有独立诊断质量集中这一结论。" });
k(8, "element_unique_proton_number", "Elements have unique proton numbers", "元素具有唯一质子数", "认识同一元素的原子具有唯一的质子数。", { canonicalIds: [C.subatomic], coverage: "partial", rationaleZh: "亚原子概念含质子，但未独立覆盖以质子数确定元素身份。" });
k(8, "molecule_definition", "Molecules as chemically combined atoms", "分子由原子化学结合形成", "说明分子是两个或以上原子化学结合形成的粒子。", { coverage: "unmapped", rationaleZh: "现有分子式与成键概念范围更高，缺少分子的入门定义。" });
k(8, "read_atoms_from_symbols_formulae", "Read atoms from symbols and formulae", "由符号和化学式读取原子", "由元素符号或化合物化学式说出原子的种类和数目，不要求书写化学式。", { canonicalIds: [C.molecularFormulae], coverage: "partial", rationaleZh: "现有实验式与分子式概念包含公式读取，但捆绑了本大纲不要求的公式推导。" });
p(8, "compare_atom_everyday_size", "Compare atomic and everyday scales", "比较原子与日常物体尺度", "比较原子与日常物体的大小尺度。", { cognitive: ["compare", "reason"] });
p(8, "compare_atoms_molecules", "Compare atoms and molecules", "比较原子与分子", "比较原子和分子的共同点与差异。", { cognitive: ["compare", "analyze"] });
v(8, "atomic_models_revision", "Construction and revision of atomic models", "原子模型的建构与修正", "理解原子模型如何依据新现象和数据被建构、论证并持续修正。", { optionalG2: true, cognitive: ["understand", "evaluate"] });
v(8, "atomic_technology_ethics", "Social and ethical effects of atomic technology", "原子科技的社会伦理影响", "认识原子知识衍生技术带来的社会伦理问题、风险和成本。", { cognitive: ["analyze", "evaluate"] });

k(9, "contact_noncontact_forces", "Contact and non-contact forces", "接触力与非接触力", "区分摩擦等接触力和磁力、重力等非接触力。", { canonicalIds: [C.forceTypes], coverage: "full", rationaleZh: "现有力的类型概念直接覆盖接触力和非接触力分类。" });
k(9, "force_effects_energy_transfer", "Force effects and energy transfer", "力的效应与能量转移", "说明物体相互作用伴随能量转移，并可能改变静止或运动状态、产生转动、形变或压强。", { canonicalIds: [C.forceTypes, C.moments, C.elasticPlastic, C.densityPressure], coverage: "partial", rationaleZh: "既有概念覆盖力、转动、形变和压强，但未形成低年级的统一因果链。" });
k(9, "pressure_everyday_phenomena", "Pressure phenomena in daily life", "日常生活中的压强现象", "解释固体压强、大气压和液体压强的日常现象。", { canonicalIds: [C.densityPressure], coverage: "partial", optionalG2: true, rationaleZh: "现有密度与压强复合概念没有按三类生活情境独立诊断。" });
k(9, "joule_unit_work_energy", "Joule as the unit of work and energy", "功和能量的单位焦耳", "说明功和能量的 SI 单位是焦耳。", { canonicalIds: [C.work], coverage: "full", partialOptionalZh: "功的单位部分", rationaleZh: "现有做功概念直接包含焦耳单位和能量转移。" });
k(9, "work_as_energy_transfer", "Work as force-mediated energy transfer", "做功是力引起的能量转移", "识别物体沿力的方向移动时做功，是能量转移的一种形式。", { canonicalIds: [C.work], coverage: "full", optionalG2: true, rationaleZh: "现有做功概念直接覆盖位移、力和能量转移。" });
k(9, "energy_conservation_transfer_conversion", "Energy conservation in transfer and conversion", "能量转移与转化中的守恒", "说明能量不能被创造或消灭，在物体间转移或形式转化时总量守恒。", { canonicalIds: [C.energyConservation], coverage: "full", rationaleZh: "现有能量守恒概念直接覆盖。" });
p(9, "measure_force_newton", "Measure force in newtons", "用牛顿测量力", "使用合适仪器测量力并以牛顿为 SI 单位。", { cognitive: ["measure", "apply"] });
p(9, "compare_mass_weight", "Compare mass and weight", "比较质量与重量", "比较质量和重量的含义与单位。", { cognitive: ["compare", "analyze"] });
p(9, "investigate_pressure_formula", "Investigate pressure as force per area", "实验研究压强等于力除以面积", "通过调查应用压强等于力除以面积的关系。", { optionalG2: true, cognitive: ["inquire", "calculate", "analyze"] });
p(9, "infer_energy_conversion", "Infer energy conversion", "推断能量形式转化", "依据现象推断能量可由一种形式转化为另一种形式。", { cognitive: ["infer", "reason"] });
v(9, "natural_force_hazards_curiosity", "Curiosity about destructive natural forces", "关注自然力的破坏作用", "对地震、海啸、火山喷发和热带气旋等自然力的破坏作用保持求知意识。", { cognitive: ["understand", "reflect"] });
v(9, "energy_sources_environment", "Energy sources and environmental impact", "能源利用及环境影响", "评价化石燃料、太阳能、水能、风能、地热能、生物燃料和核能的用途及环境影响。", { cognitive: ["analyze", "evaluate"] });

k(10, "kelvin_temperature_unit", "Kelvin as the SI unit of temperature", "温度的 SI 单位开尔文", "说明温度的 SI 单位是开尔文。", { canonicalIds: [C.temperature], coverage: "full", rationaleZh: "现有温度与热平衡概念直接包含开尔文温标。" });
k(10, "thermal_expansion_applications", "Effects and applications of thermal expansion", "热胀冷缩的效应与应用", "描述日常生活中热胀冷缩的效应和应用。", { coverage: "unmapped", rationaleZh: "统一 KG 没有热膨胀及工程应用的窄概念。" });
k(10, "heat_transfer_modes", "Conduction, convection and radiation", "传导、对流与辐射", "解释热能通过传导、对流和辐射传递。", { coverage: "unmapped", rationaleZh: "现有热学概念集中于温度、热容与热力学，未覆盖三种基础传热方式。" });
k(10, "radiation_rate_surface_temperature", "Factors affecting thermal-radiation rate", "影响热辐射速率的因素", "说明物体通过辐射得失热能的速率受表面颜色、质地和表面温度影响。", { coverage: "unmapped", rationaleZh: "统一 KG 没有该定性辐射模型。" });
k(10, "conduction_convection_applications", "Applications of conduction and convection", "传导与对流的应用", "解释传导与对流在冷却、加热和隔热中的应用。", { coverage: "unmapped", rationaleZh: "统一 KG 没有基础传热应用概念。" });
k(10, "radiation_applications", "Applications of thermal radiation", "热辐射的应用", "解释辐射加热器和太阳辐射等热辐射应用。", { coverage: "unmapped", rationaleZh: "统一 KG 没有基础热辐射应用概念。" });
p(10, "infer_thermal_expansion", "Infer expansion and contraction from heat transfer", "由热能得失推断热胀冷缩", "推断固体、液体和气体通常在吸热时膨胀、放热时收缩。", { cognitive: ["infer", "reason"] });
p(10, "infer_expansion_density_change", "Infer density change from thermal expansion", "由热膨胀推断密度变化", "由热膨胀造成体积变化，推断物质密度随之改变。", { cognitive: ["infer", "reason"] });
p(10, "compare_heat_transfer_rates", "Compare heat-transfer rates of materials", "比较材料传热速率", "由实验推断不同材料具有不同热能传递速率。", { cognitive: ["inquire", "compare", "infer"] });
v(10, "climate_change_causes", "Proposed causes of climate change", "气候变化成因", "认识气候变化可能有多种人为和自然原因。", { cognitive: ["analyze", "evaluate"] });

k(11, "chemical_change_new_substances", "Chemical changes form new substances", "化学变化生成新物质", "识别导致新物质形成的变化是化学变化。", { canonicalIds: [C.substanceClassification], coverage: "partial", rationaleZh: "现有物质分类与转化概念包含化学转化，但未提供低年级的可观察判据。" });
k(11, "word_equations", "Word equations for chemical reactions", "用文字方程式表示化学反应", "使用文字方程式表示化学反应，不要求化学方程式。", { coverage: "unmapped", rationaleZh: "现有反应方程式概念要求更高，缺少只使用物质名称的入门表示。" });
k(11, "reaction_atomic_rearrangement", "Atomic rearrangement in reactions", "反应中的原子重排", "说明化学反应涉及原子重新排列，原子既不产生也不消失。", { coverage: "unmapped", rationaleZh: "统一 KG 没有该低年级粒子解释概念。" });
k(11, "reaction_mass_conservation", "Conservation of mass in reactions", "化学反应中的质量守恒", "说明化学反应过程中质量守恒。", { coverage: "unmapped", rationaleZh: "现有能量守恒概念不能替代化学反应质量守恒。" });
k(11, "types_of_chemical_change", "Types of chemical change", "化学变化的类型", "认识燃烧、热分解、氧化、中和等不同类型的化学变化。", { canonicalIds: [C.substanceClassification], coverage: "partial", rationaleZh: "现有物质转化概念范围较高，未按本大纲四类入门反应组织。" });
p(11, "investigate_acid_reactions", "Investigate reactions of acids", "实验研究酸的反应", "调查酸与碱、金属和碳酸盐的反应。", { partialOptionalZh: "酸与金属、酸与碳酸盐反应", cognitive: ["inquire", "observe", "analyze"] });
p(11, "investigate_indicators", "Investigate acid-base indicators", "实验研究酸碱指示剂", "调查酸性、碱性和中性溶液对石蕊、通用指示剂和天然指示剂的影响。", { cognitive: ["inquire", "classify", "analyze"] });
p(11, "investigate_chemical_change_conditions", "Investigate conditions causing chemical change", "调查引发化学变化的条件", "调查混合、加热、光照、与氧相互作用及电流作用下的化学变化。", { partialOptionalZh: "电流作用（电镀）示例", cognitive: ["inquire", "compare", "analyze"] });
v(11, "chemical_reactions_benefit_harm", "Benefits and harms of chemical reactions", "化学反应的利与弊", "认识化学反应可有益于生活，也可能危害健康和环境。", { cognitive: ["analyze", "evaluate"] });

k(12, "environmental_conservation_importance", "Importance of environmental conservation", "保护环境的重要性", "解释保护环境的重要性。", { canonicalIds: [C.conservation], coverage: "full", rationaleZh: "现有保护概念直接覆盖保护价值、威胁和行动。" });
k(12, "abiotic_factors_survival", "Abiotic factors and organism survival", "非生物因素与生物生存", "解释空气、水、温度、光、矿物质和酸碱性等物理因素对生物生存的重要性。", { canonicalIds: [C.ecosystems], coverage: "partial", rationaleZh: "生态系统与生态位概念包含非生物环境，但未逐项覆盖本成果因素。" });
k(12, "adaptation_environment_survival", "Adaptive traits, environmental change and survival", "适应性特征、环境变化与生存", "说明结构或行为适应性特征及环境条件变化如何影响生物生存。", { canonicalIds: [C.ecosystemDisturbance], coverage: "partial", rationaleZh: "生态干扰概念覆盖环境变化，但缺少适应性特征与存活的直接映射。" });
k(12, "ecosystem_community_environment", "Ecosystem as community-environment interaction", "生态系统是群落与环境的相互作用", "说明生态系统由群落与其物理环境相互作用构成。", { canonicalIds: [C.ecosystems], coverage: "full", rationaleZh: "现有生态系统与生态位概念直接覆盖定义。" });
k(12, "community_interrelationships", "Interrelationships within a community", "群落中的生物关系", "说明捕食、互利共生和寄生等群落生物关系。", { canonicalIds: [C.ecosystems], coverage: "partial", rationaleZh: "现有概念覆盖生态位和种间关系，但未按本成果三类关系独立诊断。" });
k(12, "food_web_energy_flow", "Energy flow through food chains and food webs", "食物链食物网中的能量流动", "说明能量如何沿食物链和食物网流动，并联系光合作用和呼吸作用。", { canonicalIds: [C.foodWebs, C.matterEnergyFlow], coverage: "full", rationaleZh: "食物链食物网和能量流动概念组合直接覆盖。" });
k(12, "decomposer_nutrient_recycling", "Nutrient recycling by decomposers", "分解者参与营养物质循环", "描述分解者如何使生物体内的营养物质在环境中循环。", { canonicalIds: [C.matterEnergyFlow], coverage: "partial", optionalG2: true, rationaleZh: "物质循环概念提供框架，但未独立诊断分解者作用。" });
p(12, "measure_environmental_factors", "Investigate environmental physical factors", "测量环境物理因素", "用数据记录器和探头等仪器收集 pH、温度和光照强度数据。", { optionalG2: true, cognitive: ["inquire", "measure", "analyze"] });
v(12, "human_technology_environment_impact", "Human and technological impact on environments", "人类活动与技术对环境的影响", "评价机动车和现代生活方式等人类活动与技术对环境的影响。", { cognitive: ["analyze", "evaluate"] });
v(12, "cultural_sustainable_living", "Cultural practices of sustainable living", "文化中的可持续生活实践", "认识某些文化如何通过与环境互动践行可持续生活。", { optionalG2: true, cognitive: ["understand", "reflect"] });

k(13, "current_voltage_resistance_units", "Current, potential difference and resistance", "电流、电势差与电阻", "描述电学系统中的电流、电势差和电阻，并说明各自 SI 单位。", { canonicalIds: [C.currentCharge, C.potentialDifference, C.resistanceOhm], coverage: "full", rationaleZh: "三个现有 canonical 概念直接覆盖相应量、关系和单位。" });
k(13, "current_chemical_heating_magnetic_effects", "Chemical, heating and magnetic effects of current", "电流的化学、热和磁效应", "描述电流的化学效应、热效应和磁效应的应用。", { canonicalIds: [C.currentCharge, C.magneticFieldCurrent, C.electricalWorkPower], coverage: "partial", rationaleZh: "磁效应和热功率有基础概念，电流化学效应及三者应用未形成低年级完整概念。" });
k(13, "electrical_hazards_from_system_changes", "Electrical hazards from system changes", "电学系统改变引发的危险", "说明电学系统的改变如何造成若干用电危险。", { canonicalIds: [C.electricalSafety], coverage: "full", rationaleZh: "家庭电路与安全用电概念直接覆盖过载、短路和触电等风险。" });
k(13, "household_electrical_precautions", "Household electrical precautions", "家庭安全用电措施", "说明保障家庭安全使用电能的预防措施。", { canonicalIds: [C.electricalSafety], coverage: "full", rationaleZh: "现有家庭电路安全概念直接覆盖。" });
k(13, "electrical_power_output_unit", "Electrical power, output and unit", "电功率、输出与单位", "解释电功率是电学系统的输出速率并说明其 SI 单位。", { canonicalIds: [C.electricalWorkPower], coverage: "full", rationaleZh: "现有电功与电功率概念直接覆盖定义、输出和单位。" });
p(13, "draw_build_measure_circuits", "Draw, build and measure circuits", "画图、搭建并测量电路", "绘制和解释电路图，搭建含电源、开关、灯、定值与可变电阻、电流表和电压表的电路。", { cognitive: ["model", "apply", "measure"] });
p(13, "series_parallel_resistor_investigation", "Investigate series and parallel resistors", "调查串并联电阻", "调查定值电阻串联或并联如何影响电路电流。", { optionalG2: true, cognitive: ["inquire", "measure", "analyze"] });
p(13, "resistance_current_investigation", "Investigate resistance and current", "调查电阻对电流的影响", "用定值或可变电阻调查改变电阻对电流的影响，不要求 V=IR。", { optionalG2: true, cognitive: ["inquire", "measure", "analyze"] });
p(13, "electricity_cost_kwh", "Calculate electricity cost in kilowatt-hours", "用千瓦时计算电费", "使用千瓦时作为电能消耗单位，计算使用电器的成本。", { optionalG2: true, cognitive: ["calculate", "apply"] });
v(13, "reduce_household_electricity", "Reduce household electricity consumption", "减少家庭用电", "认识减少家庭电能消耗的方法。", { cognitive: ["evaluate", "decide"] });

k(14, "digestive_system_importance", "Importance of the digestive system", "消化系统的重要性", "解释人体消化系统的重要性。", { coverage: "unmapped", rationaleZh: "统一 KG 尚无人体消化系统入门概念。" });
k(14, "digestive_parts_system_function", "Digestive-system parts working together", "消化系统各部分协同工作", "说明口腔、食道、胃、小肠、大肠、直肠和肛门如何协同完成消化功能。", { coverage: "unmapped", rationaleZh: "统一 KG 尚无消化器官与系统协同概念。" });
k(14, "digestion_of_food", "Digestion of food", "食物的消化", "描述人体消化系统如何消化食物。", { canonicalIds: [C.enzymeAction], coverage: "partial", rationaleZh: "酶作用概念可支撑化学消化，但不覆盖机械消化、器官过程和吸收。" });
k(14, "digestion_products_cellular_use", "Cellular uses of digestion products", "消化终产物的细胞用途", "说明消化终产物用于呼吸作用、生长和组织修复等细胞过程。", { coverage: "unmapped", optionalG2: true, rationaleZh: "现有细胞呼吸与生长概念没有把营养吸收和这些用途连成低年级概念。" });
p(14, "digestive_enzyme_investigation", "Investigate digestive enzymes", "调查消化酶作用", "调查糖酶、蛋白酶和脂肪酶等酶类在消化中的作用，不要求具体酶名。", { optionalG2: true, cognitive: ["inquire", "observe", "analyze"] });
v(14, "food_lifestyle_diabetes", "Food and lifestyle choices against diabetes", "合理饮食生活方式与糖尿病", "理解合理饮食和生活方式选择对预防糖尿病的重要性。", { cognitive: ["evaluate", "decide"] });
v(14, "gut_bacteria_benefits_harms", "Benefits and harms of gut bacteria", "肠道细菌的利与弊", "认识消化道细菌可能帮助消化，也可能引起感染。", { cognitive: ["analyze", "evaluate"] });

k(15, "blood_vessel_transport_functions", "Transport functions of blood vessels", "血管的运输功能", "描述动脉把血液带离心脏、静脉把血液送回心脏、毛细血管是物质交换场所；不要求血管和心脏结构。", { canonicalIds: [C.bloodVessels], coverage: "partial", rationaleZh: "现有血管概念包含所需功能，但也包含官方明确不要求的结构细节，需建立窄映射。" });
k(15, "xylem_phloem_transport", "Xylem and phloem transport", "木质部与韧皮部运输", "说明木质部把水和无机盐从根运输到植物其他部位，韧皮部把食物从叶运输到其他部位。", { canonicalIds: [C.xylem, C.phloem], coverage: "full", optionalG2: true, rationaleZh: "两个现有 canonical 概念分别直接覆盖木质部和韧皮部运输。" });
k(15, "need_multicellular_transport", "Need for transport in multicellular organisms", "多细胞生物需要运输系统", "解释多细胞生物为什么需要运输系统。", { canonicalIds: [C.organSystemExchange], coverage: "partial", optionalG2: true, rationaleZh: "现有器官系统物质交换概念提供背景，但未独立诊断表面积体积比和距离限制。" });
k(15, "diffusion_human_transport", "Diffusion in human transport", "扩散促进人体物质运输", "解释已消化食物和氧等物质如何由血液扩散到组织。", { canonicalIds: [C.diffusionOsmosis, C.bloodVessels], coverage: "partial", rationaleZh: "扩散与血管概念提供机制和场所，但没有低年级的人体运输情境窄概念。" });
k(15, "diffusion_plant_transport", "Diffusion in plant transport", "扩散促进植物物质运输", "解释气体和无机盐如何扩散进出植物细胞。", { canonicalIds: [C.diffusionOsmosis], coverage: "partial", rationaleZh: "被动运输概念提供机制，但未独立限定植物气体与无机盐情境。" });
k(15, "osmosis_root_water_absorption", "Osmosis in root water absorption", "根部渗透吸水", "说明渗透作用促进根部吸收水。", { canonicalIds: [C.diffusionOsmosis, C.xylem], coverage: "full", optionalG2: true, rationaleZh: "渗透与木质部水分运输概念组合直接覆盖。" });
p(15, "investigate_xylem_transport", "Investigate xylem transport", "实验推断木质部运输", "由调查推断木质部运输水和无机盐。", { optionalG2: true, cognitive: ["inquire", "observe", "infer"] });
v(15, "drug_abuse_transport_system", "Drug abuse and transport-system harm", "药物滥用损害运输系统", "认识药物滥用会损害人体多个系统，包括运输系统。", { cognitive: ["understand", "evaluate"] });
v(15, "heart_transplant_ethics", "Ethics of heart transplantation", "心脏移植伦理", "讨论捐献者同意和器官分配优先次序等心脏移植伦理问题。", { cognitive: ["analyze", "evaluate"] });

k(16, "fertilisation_new_individual", "Fertilisation and development of a new individual", "受精与新个体发育", "说明卵细胞核与精子细胞核结合形成受精卵，并发育为新个体。", { canonicalIds: [C.fertilisation], coverage: "full", rationaleZh: "现有受精与早期胚胎发育概念直接覆盖。" });
k(16, "sexual_reproduction_heredity", "Sexual reproduction and heredity", "有性生殖与遗传", "说明有性生殖系统使遗传物质能够由一代传到下一代。", { canonicalIds: [C.fertilisation, C.gene], coverage: "partial", rationaleZh: "受精和基因概念提供基础，但没有把生殖系统功能与遗传传递连成低年级概念。" });
k(16, "unique_parental_genetic_combination", "Unique parental genetic combination", "双亲遗传信息的独特组合", "说明有性生殖产生的新个体从父母双方获得独特遗传信息组合，因而与父母及兄弟姐妹既相似又不同。", { canonicalIds: [C.fertilisation, C.gene], coverage: "partial", optionalG2: true, rationaleZh: "现有概念没有独立覆盖双亲组合与个体差异。" });
k(16, "puberty_hormone_changes", "Hormonal changes during puberty", "青春期激素引起的身体变化", "说明青春期和早期青少年阶段由激素影响其他系统而产生的若干身体变化，不要求激素系统细节。", { canonicalIds: [C.endocrine], coverage: "partial", rationaleZh: "内分泌系统概念深度更高，未限定青春期身体变化和官方排除边界。" });
k(16, "reproductive_parts_fertilisation", "Reproductive-system parts in fertilisation", "生殖系统各部分参与受精", "简述男女生殖系统各部分如何参与受精。", { canonicalIds: [C.fertilisation], coverage: "partial", rationaleZh: "现有受精概念覆盖过程，但没有独立覆盖男女生殖器官及其功能。" });
k(16, "female_parts_menstrual_cycle", "Female reproductive parts in the menstrual cycle", "女性生殖系统与月经周期", "描述女性生殖系统各部分如何参与月经周期。", { coverage: "unmapped", rationaleZh: "统一 KG 尚无月经周期及相应器官功能概念。" });
k(16, "birth_control_mechanisms", "Temporary and permanent birth control", "临时与永久避孕机制", "概述临时和永久避孕方法如何通过中断生殖过程或器官功能来防止受孕。", { coverage: "unmapped", rationaleZh: "统一 KG 尚无避孕方法及机制概念。" });
k(16, "sti_harmful_consequences", "Harmful consequences of sexually transmitted infections", "性传播感染的危害", "说明梅毒、淋病和艾滋病等性传播感染的有害后果。", { coverage: "unmapped", rationaleZh: "现有感染与免疫内容未独立覆盖性传播感染的课程范围。" });
k(16, "bacterial_viral_sti_treatment", "Bacterial and viral STI treatment", "细菌性与病毒性 STI 的治疗差异", "说明部分细菌性性传播感染可用抗生素治愈，而病毒性性传播感染不能。", { canonicalIds: [C.antibiotics, C.virusClassification], coverage: "partial", rationaleZh: "抗生素选择性和病毒分类概念提供机制，但没有落到 STI 的窄情境。" });
p(16, "evaluate_abortion_premarital_sex", "Evaluate issues around abortion and pre-marital sex", "评价堕胎与婚前性行为议题", "评价堕胎和婚前性行为的后果与相关问题。", { cognitive: ["analyze", "evaluate", "communicate"] });
v(16, "substance_abuse_foetus", "Substance abuse and foetal harm", "物质滥用对胎儿的伤害", "认识吸烟、饮酒和滥用药物可对胎儿造成负面影响。", { cognitive: ["understand", "evaluate"] });
v(16, "human_population_growth_reasons", "Reasons for human population growth", "世界人口增长的原因", "提出医学进步和卫生改善等世界人口增长原因。", { optionalG2: true, cognitive: ["analyze", "reason"] });

const countsByCategory = outcomes.reduce((result, outcome) => {
  result[outcome.category] = (result[outcome.category] ?? 0) + 1;
  return result;
}, {});
if (outcomes.length !== 159 || countsByCategory.knowledge !== 80) {
  throw new Error(`Expected 159 outcomes with 80 knowledge outcomes, got ${outcomes.length} / ${JSON.stringify(countsByCategory)}`);
}

const locatorOverrides = {
  energy_conservation_transfer_conversion: "PDF p.42, topic 9 learning outcomes",
  birth_control_mechanisms: "PDF p.51, topic 16 learning outcomes",
  sti_harmful_consequences: "PDF p.51, topic 16 learning outcomes",
  bacterial_viral_sti_treatment: "PDF p.51, topic 16 learning outcomes",
};
const evidence = (outcome) => [{ source_id: SOURCE_ID, locator: locatorOverrides[outcome.key] ?? pages[outcome.section] }];
const requirementId = (outcome) => `req_sg_lss_science_2021_o_${outcome.section.toLowerCase()}_${outcome.key}`;
const cognitiveAliases = {
  calculate: "apply",
  classify: "analyze",
  compare: "analyze",
  decide: "evaluate",
  estimate: "apply",
  identify: "understand",
  infer: "reason",
  inquire: "create",
  measure: "apply",
  observe: "analyze",
  predict: "reason",
  reflect: "evaluate",
};
const requirements = outcomes.map((outcome) => ({
  requirement_id: requirementId(outcome),
  parent_requirement_id: null,
  code: outcome.code,
  title: outcome.title,
  title_zh: outcome.titleZh,
  summary_zh: outcome.summaryZh,
  requirement_type: outcome.category === "knowledge" ? "knowledge" : "practice",
  level_id: "g2_g3_lower_secondary",
  cognitive_processes: [...new Set(outcome.cognitive.map((process) => cognitiveAliases[process] ?? process))],
  evidence_refs: evidence(outcome),
  review_status: "needs_review",
}));

const framework = {
  schema_version: "2.0.0",
  content_version: "0.3.0",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  curriculum_kind: "national_syllabus",
  title: "Singapore G2/G3 Lower Secondary Science outcome coverage",
  title_zh: "新加坡 G2/G3 初中科学逐项学习成果覆盖",
  subject: "Science",
  jurisdiction: "SG",
  education_stage: "secondary",
  requirement_granularity: "outcome",
  levels: [{ level_id: "g2_g3_lower_secondary", label: "G2/G3 Lower Secondary", label_zh: "G2/G3 初中" }],
  languages: ["en", "zh-CN"],
  source_ids: [SOURCE_ID],
  valid_from: "2021-01-01",
  valid_to: null,
  review_status: "needs_review",
  scope_exclusions: [
    {
      scope: "G2 optional outcomes marked with an asterisk in the official syllabus",
      rationale_zh: "带星号成果仅对 G2 可选；对 G3 仍在课程范围内。每条成果的中文摘要已显式保留该边界。",
      evidence_refs: [{ source_id: SOURCE_ID, locator: "PDF pp.32-51, footnote: Optional for G2 Lower Secondary Science" }],
    },
    {
      scope: "structures of blood vessels and the heart",
      rationale_zh: "主题 15 只要求血管运输功能，官方明确不要求血管和心脏结构。",
      evidence_refs: [{ source_id: SOURCE_ID, locator: "PDF p.49, topic 15 note" }],
    },
    {
      scope: "details of the hormonal system",
      rationale_zh: "主题 16 只要求青春期激素造成的身体变化，官方明确不要求激素系统细节。",
      evidence_refs: [{ source_id: SOURCE_ID, locator: "PDF p.50, topic 16 note" }],
    },
  ],
  changelog: [
    { version: "0.1.0", date: "2026-07-18", summary_zh: "按官方 16 个主题建立主题级基线。" },
    { version: "0.2.1", date: "2026-07-18", summary_zh: "复核课程版本、页码和主题边界。" },
    { version: "0.3.0", date: TODAY, summary_zh: "人工转录并拆分 159 条官方学习成果；把 81 条知识要求与 78 条科学实践和价值要求分流。" },
  ],
  requirements,
};

const mappings = outcomes.map((outcome) => ({
  mapping_id: `map_sg_lss_science_2021_o_${outcome.section.toLowerCase()}_${outcome.key}`,
  requirement_id: requirementId(outcome),
  canonical_ids: outcome.canonicalIds,
  coverage_status: outcome.coverage,
  relation: ["unmapped", "excluded"].includes(outcome.coverage) ? "not_applicable" : "required",
  mapping_basis: "semantic_inference",
  confidence: ["full", "excluded"].includes(outcome.coverage) ? "high" : "medium",
  rationale_zh: outcome.category === "knowledge"
    ? `${outcome.rationaleZh}${outcome.optionalG2 ? " 本成果对 G2 可选，不能作为所有 G2 学习者的强制掌握度。" : ""}`
    : `${outcome.category === "value" ? "价值、伦理与态度要求" : "科学实践要求"}不应伪装成可独立掌握的学科概念，转入教学与评测知识层。${outcome.optionalG2 ? " 本成果对 G2 可选。" : ""}`,
  evidence_refs: evidence(outcome),
  review_status: "needs_review",
}));

const mappingSet = {
  schema_version: "3.0.0",
  content_version: "0.3.0",
  mapping_set_id: "cms_sg_moe_lower_secondary_g2_g3_science_2021_outcomes",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Science",
  mapping_scope: "outcome_coverage",
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [
    { version: "0.1.0", date: "2026-07-18", summary_zh: "建立主题级保守映射。" },
    { version: "0.2.1", date: "2026-07-18", summary_zh: "撤销未经逐条成果证明的完整覆盖声明。" },
    { version: "0.3.0", date: TODAY, summary_zh: "替换为 159 条成果级映射，严格区分知识概念、科学实践和价值伦理要求。" },
  ],
  mappings,
};

const gapCandidates = outcomes
  .filter((outcome) => outcome.category === "knowledge" && ["partial", "unmapped"].includes(outcome.coverage))
  .map((outcome) => ({
    gap_id: `gap_sg_lss_science_2021_o_${outcome.section.toLowerCase()}_${outcome.key}`,
    requirement_ids: [requirementId(outcome)],
    action: outcome.coverage === "unmapped" ? "add_concept" : "split_or_narrow_existing",
    proposed_name: outcome.title,
    proposed_name_zh: outcome.titleZh,
    scope_zh: outcome.summaryZh,
    existing_canonical_ids: outcome.canonicalIds,
    suggested_graph_id: GRAPH_ID,
    rationale_zh: outcome.coverage === "unmapped"
      ? "统一 KG 没有足以按本课程深度独立诊断该成果的概念，建议新增待审概念。"
      : "现有概念只覆盖部分范围、捆绑超出本课程的内容或缺少该年龄段边界，需新增窄概念或精确 alias。",
    evidence_refs: evidence(outcome),
    review_status: "needs_review",
  }));

const gapSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  gap_set_id: "cgs_sg_moe_lower_secondary_g2_g3_science_2021_outcomes",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Science",
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [{ version: "0.1.0", date: TODAY, summary_zh: "逐条记录 80 项知识成果中的 partial 与 unmapped 缺口；实践和价值要求不作为 KG 缺口。" }],
  candidates: gapCandidates,
};

const groupLabels = {
  SE: "科学探究事业",
  2: "物质的物理性质",
  3: "物质的化学组成",
  4: "混合物分离",
  5: "光的射线模型",
  6: "细胞模型",
  7: "物质粒子模型",
  8: "原子与分子模型",
  9: "力与能量转移",
  10: "热能传递",
  11: "化学变化",
  12: "生态系统相互作用",
  13: "电学系统",
  14: "人体消化系统",
  15: "生物运输系统",
  16: "人类有性生殖系统",
};
const practiceGroups = new Map();
for (const outcome of outcomes.filter((candidate) => candidate.category !== "knowledge")) {
  const groupKey = `${outcome.section}:${outcome.category}`;
  const group = practiceGroups.get(groupKey) ?? { section: outcome.section, category: outcome.category, outcomes: [] };
  group.outcomes.push(outcome);
  practiceGroups.set(groupKey, group);
}
const practiceItems = [...practiceGroups.values()].map((group) => {
  const isValue = group.category === "value";
  const requirementIds = group.outcomes.map(requirementId);
  const optionalCount = group.outcomes.filter((outcome) => outcome.optionalG2).length;
  return {
    practice_id: `practice_sg_lss_science_2021_${group.section.toLowerCase()}_${group.category}`,
    requirement_ids: requirementIds,
    kind: isValue ? "assessment_task" : "inquiry_process",
    name: `${groupLabels[group.section]} ${isValue ? "values and ethics" : "scientific practices"}`,
    name_zh: `${groupLabels[group.section]}：${isValue ? "价值、伦理与态度" : "科学实践"}`,
    description_zh: group.outcomes.map((outcome) => outcome.summaryZh).join("；"),
    instructional_use_zh: isValue
      ? "用真实科学、社会和环境情境组织资料辨析与责任决策；教师应区分事实判断、价值判断和可执行行动，不把态度口号当作学科知识。"
      : "以可观察的调查、测量、建模、分类、推理或交流任务教学；先明确变量、仪器、单位、安全和证据要求，再让学习者解释结论与局限。",
    assessment_evidence_zh: isValue
      ? "学习者提交有事实依据的立场、影响分析或行动方案，能说明权衡和证据局限；不得仅凭表态判定通过。"
      : "学习者提交可复核的过程证据、数据、图表、模型或解释；评价操作正确性、推理链、误差与安全，而非只看最终答案。",
    evidence_refs: [{ source_id: SOURCE_ID, locator: `${pages[group.section]}；本组覆盖 ${requirementIds.length} 项${optionalCount ? `，其中 ${optionalCount} 项对 G2 可选` : ""}` }],
    review_status: "needs_review",
  };
});

const practiceSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  practice_set_id: "cpk_sg_moe_lower_secondary_g2_g3_science_2021",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Science",
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [{ version: "0.1.0", date: TODAY, summary_zh: `将 ${countsByCategory.practice} 项科学实践与 ${countsByCategory.value} 项价值伦理成果按主题归并到教学与评测知识层。` }],
  items: practiceItems,
};

const sourceRegistry = JSON.parse(readFileSync(paths.sources, "utf8"));
const source = sourceRegistry.sources.find((candidate) => candidate.source_id === SOURCE_ID);
if (!source) throw new Error(`Missing source ${SOURCE_ID}`);
if (source.sha256 !== "dfaf177b1407371002a3b00633c04f09d873376f8b20170b437008cc70871106") {
  throw new Error(`Unexpected source checksum for ${SOURCE_ID}: ${source.sha256}`);
}
source.retrieved_at = TODAY;
source.notes_zh = "MOE 官方 PDF 已复核：Implementation starting with 2021 Secondary One Cohort，封面 ©2024；带星号成果仅对 G2 可选。仓库只保存元数据、校验值、页码定位和中文释义。";

const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
writeJson(paths.framework, framework);
writeJson(paths.mapping, mappingSet);
writeJson(paths.gaps, gapSet);
writeJson(paths.practices, practiceSet);
writeJson(paths.sources, sourceRegistry);

const coverageCounts = mappings.reduce((result, mapping) => {
  result[mapping.coverage_status] = (result[mapping.coverage_status] ?? 0) + 1;
  return result;
}, {});
process.stdout.write(`[upgrade-sg-lower-science] ${outcomes.length} outcomes (${countsByCategory.knowledge} knowledge, ${countsByCategory.practice} practices, ${countsByCategory.value} values); ${coverageCounts.full ?? 0} full, ${coverageCounts.partial ?? 0} partial, ${coverageCounts.unmapped ?? 0} unmapped, ${coverageCounts.excluded ?? 0} excluded; ${gapCandidates.length} gaps; ${practiceItems.length} grouped practice items\n`);
