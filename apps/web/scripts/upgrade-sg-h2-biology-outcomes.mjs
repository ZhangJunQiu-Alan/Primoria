#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const DATA = resolve(ROOT, "data/knowledge-graphs");
const TODAY = "2026-07-19";
const SOURCE_ID = "src_sg_seab_h2_biology_9477_2026";
const FRAMEWORK_ID = "cfw_sg_seab_h2_biology_9477_2026_outcomes";
const CURRICULUM_ID = "cur_sg_seab_h2_biology_9477_2026";

const paths = {
  framework: resolve(DATA, "curricula/frameworks/sg_seab_h2_biology_9477_2026.json"),
  mapping: resolve(DATA, "curricula/mappings/pending/sg_seab_h2_biology_9477_2026.json"),
  gaps: resolve(DATA, "curricula/gaps/pending/sg_seab_h2_biology_9477_2026_outcomes.json"),
  practices: resolve(DATA, "pedagogy/practices/sg_seab_h2_biology_9477_2026.json"),
  review: resolve(DATA, "review/pending/curriculum-mapping/cms_sg_seab_h2_biology_9477_2026_outcomes.review.zh-CN.md"),
  sources: resolve(DATA, "governance/sources.json"),
  aLevel: resolve(DATA, "source/a_level_biology.json"),
  senior: resolve(DATA, "source/senior_secondary_biology.json"),
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
  if (topicCode === "1") return key <= "h" ? 12 : 13;
  if (topicCode === "2") {
    if (["x", "y", "z", "aa", "bb", "cc", "dd"].includes(key)) return 16;
    return key <= "h" ? 14 : 15;
  }
  if (topicCode === "3") return key <= "l" ? 17 : 18;
  if (topicCode === "4") return 19;
  if (topicCode === "A") return 20;
  if (topicCode === "B") return 21;
  throw new Error(`Missing page for ${topicCode}.${key}`);
};

const TOPICS = [
  ["1", "The Cell and Biomolecules of Life", "细胞与生命的生物分子", [
    o("a", "概述细胞是生命最小单位、来自已有细胞且生物由细胞组成的细胞学说", [], { gap: "cell_theory" }),
    o("b", "识别显微图像中的细胞结构与细胞器，并理解显微镜测量情境", ["bio_microscopy", "bio_organelles"]),
    o("c", "概述指定细胞结构和细胞器的功能", ["bio_organelles"]),
    o("d", "描述典型细菌细胞的结构特征", ["bio_prokaryotes"]),
    o("e", "描述包膜病毒和噬菌体等病毒的结构组分并解释图像", ["bio_virus_structure_classification"]),
    o("f", "讨论病毒如何挑战细胞学说与生命定义", ["bio_virus_structure_classification"], { gap: "virus_living_boundary" }),
    o("g", "描述 α/β-葡萄糖、甘油和脂肪酸、氨基酸等单体的结构与性质", ["bio_monomers_polymers", "bio_carbohydrates", "bio_lipids", "bio_proteins"]),
    o("h", "描述糖苷键、酯键和肽键的形成与断裂", ["bio_monomers_polymers", "bio_carbohydrates", "bio_lipids", "bio_proteins"]),
    o("i", "联系淀粉、纤维素、糖原、甘油三酯和磷脂的结构、性质与功能", ["bio_carbohydrates", "bio_lipids"]),
    o("j", "解释流动镶嵌模型及膜中磷脂、蛋白质、糖脂、糖蛋白和胆固醇的作用", ["bio_membrane_structure"]),
    o("k", "概述细胞表面膜和细胞内膜的功能", ["bio_membrane_structure"]),
    o("l", "解释物质通过扩散、渗透、易化扩散、主动运输、胞吞和胞吐跨膜移动", ["bio_passive_transport", "bio_active_transport", "cn_sh_bio_endocytosis_exocytosis"]),
    o("m", "解释蛋白质四级结构层次及维持构象的作用力", ["bio_proteins"]),
    o("n", "解释温度和 pH 对蛋白质结构的影响", ["bio_proteins"]),
    o("o", "联系血红蛋白和胶原蛋白的分子结构与运输或支撑功能", ["bio_haemoglobin", "bio_collagen"]),
    o("p", "用活性位点、酶底物复合物、活化能、锁钥和诱导契合解释酶作用", ["bio_enzyme_action"]),
    o("q", "探究并解释温度、pH、酶浓度和底物浓度对酶促反应速率的影响", ["bio_enzyme_factors"], { mixedPractice: true }),
    o("r", "联系结合位点描述竞争性和非竞争性抑制剂的结构", ["bio_enzyme_inhibition"]),
    o("s", "解释竞争性、非竞争性及变构抑制剂对酶活性的影响", ["bio_enzyme_inhibition"]),
    o("t", "比较合子、胚胎及血液干细胞的全能性、多能性和多潜能性", ["cn_sh_bio_stem_cell_applications"], { gap: "stem_cell_potency" }),
    o("u", "解释胚胎干细胞与淋巴系、髓系血液干细胞在生物体内的正常功能", ["cn_sh_bio_stem_cell_applications"], { gap: "stem_cell_normal_functions" }),
  ]],
  ["2", "Genetics and Inheritance", "遗传与继承", [
    o("a", "描述 DNA 及 tRNA、rRNA、mRNA 的结构和作用", ["bio_dna_structure", "bio_rna_structure"]),
    o("b", "描述 DNA 复制并解释末端复制问题如何产生", ["bio_dna_replication"], { gap: "dna_end_replication_problem" }),
    o("c", "描述转录、真核 pre-mRNA 加工和翻译如何把 DNA 信息用于合成多肽", ["bio_transcription", "bio_translation"]),
    o("d", "比较病毒、原核和真核基因组的核酸类型、链型、包装、线性及内含子组织", ["bio_virus_structure_classification", "bio_dna_structure"], { gap: "comparative_genome_architecture" }),
    o("e", "概述噬菌体裂解/溶原、流感病毒和 HIV 的繁殖周期及基因组继承", ["bio_virus_structure_classification"], { gap: "viral_reproductive_cycles" }),
    o("f", "描述抗原漂移和抗原转变等病毒基因组变异来源", ["bio_mutation"], { gap: "viral_genome_variation" }),
    o("g", "概述细菌二分裂及转化、转导和含 F 质粒接合造成的基因组变异", ["bio_prokaryotes"], { gap: "prokaryotic_horizontal_gene_transfer" }),
    o("h", "描述内含子、着丝粒、端粒、启动子、增强子和沉默子等非编码 DNA 的结构与功能", ["bio_chromosomes", "bio_gene_control"], { gap: "noncoding_genome_elements" }),
    o("i", "解释真核差异基因表达在染色质、转录、转录后、翻译和翻译后层面的调控", ["bio_gene_control"], { gap: "multilevel_eukaryotic_gene_regulation" }),
    o("j", "描述 PCR、凝胶电泳、Southern 印迹和核酸杂交的原理与步骤", ["bio_pcr_electrophoresis"], { gap: "southern_blot_hybridisation" }),
    o("k", "区分基因突变和染色体畸变并解释碱基改变、移码、非整倍体和结构畸变", ["bio_mutation", "cn_sh_bio_chromosomal_variation"]),
    o("l", "解释基因突变如何导致包括镰状细胞贫血在内的疾病", ["bio_mutation"]),
    o("m", "讨论包括 21 三体在内的遗传性母体筛查生物伦理", ["cn_sh_bio_genetic_disease_screening"], { gap: "maternal_genetic_screening_ethics" }),
    o("n", "描述有丝分裂细胞周期事件及染色体、核膜、细胞膜和中心粒行为", ["bio_mitosis"]),
    o("o", "解释有丝分裂在生长、修复和无性生殖中的意义及检查点失调与癌症的联系", ["bio_mitosis", "cn_sh_bio_mutagens_cancer"], { gap: "cell_cycle_dysregulation_cancer_risk" }),
    o("p", "识别遗传因素、化学致癌物、电离辐射和免疫丧失等癌变危险因素", ["cn_sh_bio_mutagens_cancer"], { gap: "cell_cycle_dysregulation_cancer_risk" }),
    o("q", "解释抑癌基因功能缺失和原癌基因功能增强如何造成细胞分裂失控", ["cn_sh_bio_mutagens_cancer"], { gap: "oncogene_tumour_suppressor_control" }),
    o("r", "描述癌症通过突变积累、血管生成和转移发展的多步骤过程", ["cn_sh_bio_mutagens_cancer"], { gap: "multistep_cancer_progression" }),
    o("s", "描述减数分裂周期的主要阶段及细胞结构行为", ["bio_meiosis"]),
    o("t", "解释减数分裂和随机受精如何产生遗传变异", ["bio_meiosis", "bio_variation"]),
    o("u", "正确解释基因、等位基因、位点、纯合、杂合、显隐性、基因型和表型等遗传术语", ["bio_genetic_crosses"]),
    o("v", "解释基因如何通过生殖细胞或配子代际遗传", ["cn_sh_bio_gametic_inheritance"]),
    o("w", "解释基因型与表型的联系", ["bio_genetic_crosses", "bio_variation"]),
    o("x", "用遗传图解解决含共显性、多等位、伴性、常染色体连锁和上位性的双因子问题", ["bio_genetic_crosses", "bio_linkage"]),
    o("y", "用遗传图解解决测交问题", ["bio_genetic_crosses"]),
    o("z", "解释连锁和交换及其对双因子杂交表型比例的影响", ["bio_linkage"]),
    o("aa", "描述位点间上位性并预测表型比例，而不背诵固定比例", ["bio_genetic_crosses"], { gap: "epistasis_problem_solving" }),
    o("bb", "用蜜蜂营养分化等实例解释环境如何影响表型", ["bio_variation"], { gap: "genotype_environment_phenotype" }),
    o("cc", "比较多基因加性控制的连续变异与少数基因控制的不连续变异", ["bio_variation"]),
    o("dd", "用卡方检验判断观察值与期望值差异的显著性", ["bio_chi_square_test"]),
  ]],
  ["3", "Energy and Equilibrium", "能量与平衡", [
    o("a", "在图像和显微图中识别叶绿体和线粒体组分", ["bio_organelles"]),
    o("b", "解释光合色素的吸收光谱和作用光谱", ["bio_photosynthetic_pigments_spectra"]),
    o("c", "联系叶绿体结构解释光反应如何把光能转为化学能", ["bio_light_dependent"]),
    o("d", "概述 C3 植物 Calvin 循环的固定、还原和 RuBP 再生及 rubisco、ATP、NADPH 作用", ["bio_calvin"]),
    o("e", "讨论并探究温度、光强和二氧化碳浓度等光合作用限制因素", ["bio_limiting_factors"], { mixedPractice: true }),
    o("f", "概述糖酵解的位置、原料和产物", ["bio_glycolysis"]),
    o("g", "概述连接反应和 Krebs 循环的位置、原料、产物、脱氢和脱羧", ["bio_krebs"]),
    o("h", "概述氧化磷酸化中氧和电子传递链的作用", ["bio_oxidative"]),
    o("i", "解释酵母和哺乳动物肌肉在无氧条件下产生少量 ATP", ["bio_anaerobic"]),
    o("j", "解释形成乙醇或乳酸对再生 NAD 的意义", ["bio_anaerobic"]),
    o("k", "探究底物浓度、氧浓度和温度对呼吸速率的影响", ["bio_glycolysis", "bio_krebs", "bio_oxidative", "bio_anaerobic"], { mixedPractice: true }),
    o("l", "概述光合作用和呼吸作用中的化学渗透", ["bio_light_dependent", "bio_oxidative"]),
    o("m", "概述配体受体结合、磷酸化级联、信号放大和基因表达响应等细胞信号阶段", [], { gap: "cell_signalling_stages" }),
    o("n", "解释包括 cAMP 在内的第二信使的性质和作用", [], { gap: "second_messengers" }),
    o("o", "解释激酶和磷酸酶在信号放大中的作用", [], { gap: "kinase_phosphatase_signalling" }),
    o("p", "概述胰岛素和胰高血糖素分别经受体酪氨酸激酶和 G 蛋白偶联受体调节血糖", ["bio_glucose_control"], { gap: "insulin_glucagon_receptor_pathways" }),
  ]],
  ["4", "Biological Evolution", "生物进化", [
    o("a", "解释由突变、减数分裂和有性生殖产生的变异为何是自然选择的基础", ["bio_variation", "bio_natural_selection"]),
    o("b", "用实例解释环境因素如何形成自然选择压力", ["bio_natural_selection"]),
    o("c", "解释自然选择在进化中的作用", ["bio_natural_selection"]),
    o("d", "解释种群为何是能够进化的最小单位", ["bio_natural_selection", "bio_hardy_weinberg"]),
    o("e", "解释包括有害隐性等位基因在内的遗传变异如何在自然种群中保留", ["bio_hardy_weinberg"], { gap: "recessive_allele_persistence" }),
    o("f", "定义进化为伴随改变的传承并联系微观进化与宏观进化", ["bio_natural_selection"], { gap: "microevolution_macroevolution_link" }),
    o("g", "综合分子同源、化石解剖同源和 Wallace 生物地理证据支持进化理论", ["cn_sh_bio_common_ancestry_fossil_anatomy", "cn_sh_bio_common_ancestry_cell_molecular"], { gap: "integrated_evolution_evidence" }),
    o("h", "解释生物学物种概念及其局限", ["bio_speciation"], { gap: "biological_species_concept_limits" }),
    o("i", "定义生物分类并说明共享特征如何用于建立进化关系", ["bio_classification"]),
    o("j", "解释地理隔离的异域物种形成和同地行为或生理隔离的物种形成", ["bio_speciation"]),
    o("k", "定义以进化关系组织物种的系统发育", ["bio_classification"], { gap: "phylogeny_and_molecular_classification" }),
    o("l", "解释基因组序列和核苷酸/氨基酸多序列比对重建系统发育的优势", ["bio_bioinformatics_databases"], { gap: "phylogeny_and_molecular_classification" }),
    o("m", "解释 Hardy-Weinberg 模型及其成立条件", ["bio_hardy_weinberg"]),
    o("n", "用 Hardy-Weinberg 方程计算双等位基因的等位、基因型和表型频率", ["bio_hardy_weinberg"]),
  ]],
  ["A", "Infectious Diseases", "传染病", [
    o("a", "比较特异性和非特异性免疫，以及主动、被动、自然获得和人工获得免疫", ["cn_sh_bio_innate_adaptive_immunity", "bio_immune_response"]),
    o("b", "概述 B/T 淋巴细胞、抗原呈递细胞和记忆细胞在初次及二次免疫应答中的作用", ["bio_immune_response"], { gap: "adaptive_immune_cell_coordination" }),
    o("c", "以 IgG 为例联系抗体分子结构与功能", ["bio_antibodies"]),
    o("d", "解释体细胞重组、超突变和类别转换如何产生大量不同抗体", ["bio_antibodies"], { gap: "antibody_diversity_mechanisms" }),
    o("e", "讨论疫苗如何诱导免疫、通过群体覆盖打断传播并控制或消灭疾病", ["bio_antibodies"], { gap: "vaccination_population_control_tradeoffs" }),
    o("f", "讨论疫苗接种的收益与风险", ["bio_antibodies"], { gap: "vaccination_population_control_tradeoffs" }),
    o("g", "解释流感病毒和 HIV 如何破坏宿主组织与功能而致病", ["bio_infectious"], { gap: "viral_tissue_pathogenesis" }),
    o("h", "用典型细菌病原体解释传播方式和感染过程", ["bio_infectious"]),
    o("i", "描述包括青霉素在内的抗生素对细菌的作用方式", ["bio_antibiotics"]),
    o("j", "解释基本再生数 R0 的含义及其对传染性和暴发进程预测的用途", [], { gap: "basic_reproduction_number" }),
    o("k", "区分传染病的暴发、流行和大流行", [], { gap: "outbreak_epidemic_pandemic" }),
  ]],
  ["B", "Impact of Climate Change on Animals and Plants", "气候变化对动植物的影响", [
    o("a", "解释化石燃料、清林和肉类消费如何增加二氧化碳或甲烷并推动气候变化", ["cn_sh_bio_global_environmental_change"], { gap: "greenhouse_gas_human_drivers" }),
    o("b", "解释温室气体排放造成海冰消融、海平面上升、极端天气、水压力和生态迁移等影响", ["cn_sh_bio_global_environmental_change"], { gap: "climate_system_ecological_impacts" }),
    o("c", "解释红树林生态系统如何缓解气候变化影响", ["bio_conservation"], { gap: "mangrove_climate_mitigation" }),
    o("d", "比较清林、不同能源和动植物食物生产活动的相对碳足迹", [], { gap: "anthropogenic_carbon_footprints" }),
    o("e", "讨论升温和极端天气造成的环境压力对可持续食物供应的后果", ["cn_sh_bio_global_environmental_change"], { gap: "climate_stress_food_supply" }),
    o("f", "讨论气候压力对栖息地、生物、食物链和生态位占据的影响", ["cn_sh_bio_ecosystem_disturbances", "cn_sh_bio_food_chains_webs", "bio_ecosystems_niches"], { gap: "climate_ecological_redistribution" }),
    o("g", "讨论气候变化对热带生物多样性、潜在生物医药和粮食遗传资源的影响", ["bio_conservation"], { gap: "tropical_biodiversity_resources" }),
    o("h", "解释温度如何影响昆虫代谢、耐受范围和蚊媒生命周期", [], { gap: "temperature_insect_vector_lifecycle" }),
    o("i", "解释全球变暖如何使疟疾和登革热等蚊媒传染病扩展到热带以外", ["bio_infectious"], { gap: "warming_vector_borne_range_shift" }),
  ]],
];

const GLOBAL_PRACTICES = [
  ["planning", "界定实验问题并给出清晰、合逻辑和可执行的实验程序", "PDF p.22, Practical Assessment, Planning"],
  ["risk", "评估实验风险并说明把风险降至最低的防护措施", "PDF p.22, Practical Assessment, Planning"],
  ["manipulation_measurement", "熟练操作并以适当精度记录观察和测量，识别异常值", "PDF p.22, Practical Assessment, MMO"],
  ["data_presentation", "以恰当形式、精度和有效数据处理呈现观察与定量结果", "PDF p.22, Practical Assessment, PDO"],
  ["analysis", "依据任务和生物学原理分析、解释数据或观察", "PDF p.22, Practical Assessment, ACE"],
  ["conclusion_prediction", "由证据得出结论并作出有依据的预测", "PDF p.22, Practical Assessment, ACE"],
  ["evaluation_improvement", "识别重要误差和局限，解释影响并提出可验证的改进", "PDF p.22, Practical Assessment, ACE"],
];

const sourceGraphs = [readJson(paths.aLevel), readJson(paths.senior)];
const legacyById = new Map(sourceGraphs.flatMap((graph) => graph.nodes
  .filter((node) => node.kind === "concept")
  .map((node) => [node.id, node])));
const canonicalIds = (legacyIds) => unique(legacyIds.map((id) => {
  const node = legacyById.get(id);
  if (!node?.canonical_id) throw new Error(`Unknown biology legacy concept ${id}`);
  return node.canonical_id;
}));

const requirements = [];
const mappings = [];
const gapCandidates = [];
const practiceItems = [];
for (const [topicCode, title, titleZh, outcomes] of TOPICS) {
  for (const outcome of outcomes) {
    const idTopicCode = topicCode.toLowerCase();
    const requirementId = `req_sg_h2_biology_9477_2026_o_${idTopicCode}_${outcome.key}`;
    const ids = canonicalIds(outcome.legacyIds);
    const evidenceRefs = officialEvidence(`PDF p.${pageFor(topicCode, outcome.key)}, topic ${topicCode} ${title}, outcome (${outcome.key})`);
    requirements.push({
      requirement_id: requirementId,
      code: `${topicCode}.${outcome.key}`,
      title,
      title_zh: titleZh,
      summary_zh: outcome.summaryZh,
      requirement_type: outcome.mixedPractice ? "skill" : "knowledge",
      level_id: "h2_9477",
      cognitive_processes: outcome.mixedPractice ? ["apply", "analyze", "evaluate"] : ["understand", "apply"],
      parent_requirement_id: null,
      evidence_refs: evidenceRefs,
      review_status: "needs_review",
    });

    let coverageStatus = "full";
    let rationaleZh = "现有统一 KG 中存在范围与 H2 诊断粒度相符的概念，可直接复用稳定 canonical ID。";
    if (outcome.gap) {
      coverageStatus = ids.length ? "partial" : "unmapped";
      rationaleZh = ids.length
        ? "现有概念只覆盖组成部分或范围过宽，不能把名称相近当作完整 outcome 覆盖。"
        : "统一 KG 尚无范围与 H2 课程深度相符的可诊断概念。";
      gapCandidates.push({
        gap_id: `gap_sg_h2_biology_9477_2026_o_${idTopicCode}_${outcome.key}`,
        requirement_ids: [requirementId],
        action: ids.length ? "split_or_narrow_existing" : "add_concept",
        proposed_name: outcome.gap,
        proposed_name_zh: outcome.summaryZh,
        scope_zh: outcome.summaryZh,
        existing_canonical_ids: ids,
        suggested_graph_id: "singapore_h2_biology",
        rationale_zh: rationaleZh,
        evidence_refs: evidenceRefs,
        review_status: "needs_review",
      });
    }
    mappings.push({
      mapping_id: `map_sg_h2_biology_9477_2026_o_${idTopicCode}_${outcome.key}`,
      requirement_id: requirementId,
      canonical_ids: ids,
      coverage_status: coverageStatus,
      relation: "required",
      mapping_basis: "semantic_inference",
      confidence: coverageStatus === "full" ? "high" : "medium",
      rationale_zh: rationaleZh,
      evidence_refs: evidenceRefs,
      review_status: "needs_review",
    });
    if (outcome.mixedPractice) {
      practiceItems.push({
        practice_id: `practice_sg_h2_biology_9477_2026_${idTopicCode}_${outcome.key}`,
        requirement_ids: [requirementId],
        kind: "assessment_task",
        name: "Biology content-linked investigation",
        name_zh: outcome.summaryZh,
        description_zh: outcome.summaryZh,
        instructional_use_zh: "把变量控制、可重复测量和数据解释嵌入对应生物学机制，不以实验操作替代概念解释。",
        assessment_evidence_zh: "同时检查实验设计与生物学因果解释；分别记录实践表现和概念覆盖证据。",
        evidence_refs: evidenceRefs,
        review_status: "needs_review",
      });
    }
  }
}

if (requirements.length !== 101) throw new Error(`Expected 101 biology outcomes, got ${requirements.length}`);
for (const [key, summaryZh, locator] of GLOBAL_PRACTICES) {
  const requirementId = `req_sg_h2_biology_9477_2026_o_practice_${key}`;
  const evidenceRefs = officialEvidence(locator);
  requirements.push({
    requirement_id: requirementId,
    code: `P.${key}`,
    title: "Practical Assessment",
    title_zh: "实验评测",
    summary_zh: summaryZh,
    requirement_type: "practice",
    level_id: "h2_9477",
    cognitive_processes: ["apply", "evaluate", "communicate"],
    parent_requirement_id: null,
    evidence_refs: evidenceRefs,
    review_status: "needs_review",
  });
  mappings.push({
    mapping_id: `map_sg_h2_biology_9477_2026_o_practice_${key}`,
    requirement_id: requirementId,
    canonical_ids: [],
    coverage_status: "excluded",
    relation: "not_applicable",
    mapping_basis: "semantic_inference",
    confidence: "high",
    rationale_zh: "这是实验实践能力，进入教学与评测知识层，不作为生物学概念掌握度。",
    evidence_refs: evidenceRefs,
    review_status: "needs_review",
  });
  practiceItems.push({
    practice_id: `practice_sg_h2_biology_9477_2026_${key}`,
    requirement_ids: [requirementId],
    kind: "assessment_task",
    name: "Biology practical assessment",
    name_zh: summaryZh,
    description_zh: summaryZh,
    instructional_use_zh: "在具体生物材料和问题情境中练习，并把过程证据与概念掌握分开记录。",
    assessment_evidence_zh: "检查计划、风险、原始记录、呈现、分析、结论或改进中与本项对应的可观察证据。",
    evidence_refs: evidenceRefs,
    review_status: "needs_review",
  });
}

const sources = readJson(paths.sources);
const source = sources.sources.find((candidate) => candidate.source_id === SOURCE_ID);
if (!source) throw new Error(`Missing source ${SOURCE_ID}`);
source.retrieved_at = TODAY;
source.verification_status = "verified";
source.notes_zh = "采用 2026 首次考试的新 Syllabus 9477；已逐项复核 101 项内容 outcome 和 Practical Assessment。只保存元数据、校验值、页码定位和中文释义。";
const anatomySourceId = "src_openstax_anatomy_physiology_2e_2022";
const anatomySource = {
  source_id: anatomySourceId,
  title: "OpenStax Anatomy and Physiology 2e",
  publisher: "OpenStax, Rice University",
  authority_tier: "B",
  verification_status: "verified",
  jurisdiction: "US",
  languages: ["en"],
  resource_type: "textbook",
  landing_page_url: "https://openstax.org/details/books/anatomy-and-physiology-2e/",
  document_url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/preface",
  document_version: "2e official web edition snapshot 2026-07-19",
  issued_at: "2022-04-20",
  valid_from: null,
  valid_to: null,
  retrieved_at: TODAY,
  sha256: "a0b98418dc04b0290c09879f203f32954e170f1b20601e4dec7f3fea53da1dd3",
  license_expression: "CC-BY-NC-SA-4.0",
  rights: {
    metadata: true,
    fulltext: false,
    excerpts: false,
    derivatives: false,
    redistribution: false,
    commercial_use: false,
  },
  storage_policy: "metadata_only",
  notes_zh: "官方出版日期和 CC BY-NC-SA 4.0 已核验；3.6 节精确覆盖全能、多能、多潜能干细胞及造血干细胞分化。因当前页面另有大模型摄入限制，只保存元数据、校验值和章节定位。",
};
const anatomyIndex = sources.sources.findIndex((candidate) => candidate.source_id === anatomySourceId);
if (anatomyIndex >= 0) sources.sources[anatomyIndex] = anatomySource;
else sources.sources.push(anatomySource);
sources.sources.sort((left, right) => left.source_id.localeCompare(right.source_id));

const framework = {
  schema_version: "2.0.0",
  content_version: "0.3.0",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  curriculum_kind: "examination_syllabus",
  title: "Singapore-Cambridge GCE Advanced Level H2 Biology 9477 outcome coverage",
  title_zh: "新加坡剑桥 GCE A-Level H2 生物 9477（2026）学习成果级覆盖",
  jurisdiction: "SG",
  subject: "Biology",
  education_stage: "pre_university",
  levels: [{ level_id: "h2_9477", label: "H2 Biology 9477", label_zh: "H2 生物 9477" }],
  languages: ["en", "zh-CN"],
  valid_from: "2026-01-01",
  valid_to: null,
  source_ids: [SOURCE_ID],
  requirement_granularity: "outcome",
  review_status: "needs_review",
  changelog: [{ version: "0.3.0", date: TODAY, summary_zh: "用官方 101 项内容成果和 7 项实验能力取代 6 个主题导航映射。" }],
  scope_exclusions: [
    ["specific amino-acid R-group formulae", "Topic 1(g) 明确不要求不同氨基酸 R 基的具体化学式。"],
    ["haemoglobin and collagen residue counts or detailed secondary structures", "Topic 1(o) 明确不要求氨基酸数量及详细二级结构。"],
    ["mitochondrial and chloroplast DNA structure and roles", "Topic 2(a) 明确不要求线粒体和叶绿体 DNA。"],
    ["Hfr conjugation", "Topic 2(g) 明确不要求 Hfr。"],
    ["transposons, satellite DNA, pseudogenes and segmental duplication", "Topic 2(h) 明确排除这些非编码 DNA 细节。"],
    ["detailed mitotic checkpoint mechanisms", "Topic 2(o) 只要求检查点失调与癌症的联系。"],
    ["meiotic prophase subdivisions", "Topic 2(s) 不要求前期各亚阶段。"],
    ["named ETC complexes, detailed ATP synthase mechanism and total ATP yield", "Topic 3(c,h,l) 明确排除电子传递链复合体名称、ATP 合酶细节和总 ATP 产量。"],
    ["intracellular receptor signalling", "Topic 3(m) 明确不要求细胞内受体。"],
    ["specific second messengers and kinases in insulin/glucagon pathways", "Topic 3(p) 明确不要求具体第二信使和激酶细节。"],
    ["memorised epistasis ratios", "Topic 2(aa) 明确强调问题解决而非背诵固定比例。"],
  ].map(([scope, rationale_zh]) => ({ scope, rationale_zh, evidence_refs: officialEvidence("PDF pp.12-21, explicit bracketed scope statements") })),
  requirements,
};

const mappingSet = {
  schema_version: "3.0.0",
  content_version: "0.3.0",
  mapping_set_id: "cms_sg_seab_h2_biology_9477_2026_outcomes",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Biology",
  source_ids: [SOURCE_ID],
  mapping_scope: "outcome_coverage",
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [{ version: "0.3.0", date: TODAY, summary_zh: "逐项映射 101 项内容成果，另外分流 7 项实验能力，并保守登记真实概念缺口。" }],
  mappings,
};

const gapSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  gap_set_id: "cgs_sg_seab_h2_biology_9477_2026_outcomes",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Biology",
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [{ version: "0.1.0", date: TODAY, summary_zh: "逐项登记不能由既有宽概念完整覆盖的 H2 生物成果。" }],
  candidates: gapCandidates,
};

const practiceSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  practice_set_id: "cpk_sg_seab_h2_biology_9477_2026",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Biology",
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [{ version: "0.1.0", date: TODAY, summary_zh: "把 3 项内容内探究和 7 项实验评测能力转为教学评测知识。" }],
  items: practiceItems,
};

const reviewLines = [
  "# 新加坡 H2 生物 9477 逐成果映射审核包（中文）",
  "",
  `- 生成日期：${TODAY}`,
  "- 官方版本：2026 首次考试，Syllabus 9477，28 页。",
  `- 要求总数：${requirements.length} 项；内容成果 101 项，跨主题实验能力 7 项。`,
  `- 现有 KG 完整覆盖：${mappings.filter((mapping) => mapping.coverage_status === "full").length} 项。`,
  `- 待解析概念缺口：${gapCandidates.length} 项。`,
  `- 实践知识条目：${practiceItems.length} 项，其中 3 项仍保留内容概念映射。`,
  "- 状态：全部 `needs_review`；代理复核不写 human approval。",
  "",
  "## 审核重点",
  "",
  "- 旧 6 项 topic navigation 不再被当作 outcome coverage。",
  "- 没有用宽泛的 gene control、immunity、climate change 节点冒充 H2 的机制级要求。",
  "- 三项 investigation outcome 同时保留概念映射和实践条目；七项通用实验能力不进入概念掌握度。",
  "- 官方明确排除的分子细节和实验范围保留为 scope exclusions。",
  "",
  `## ${gapCandidates.length} 项待解析缺口`,
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

process.stdout.write(`[upgrade-sg-h2-biology] ${requirements.length} requirements; ${mappings.filter((mapping) => mapping.coverage_status === "full").length} full, ${mappings.filter((mapping) => mapping.coverage_status === "partial").length} partial, ${mappings.filter((mapping) => mapping.coverage_status === "unmapped").length} unmapped, ${mappings.filter((mapping) => mapping.coverage_status === "excluded").length} excluded; ${gapCandidates.length} gaps; ${practiceItems.length} practices\n`);
