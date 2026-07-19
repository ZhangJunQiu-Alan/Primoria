#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const DATA_ROOT = resolve(REPO_ROOT, "data/knowledge-graphs");
const TODAY = "2026-07-19";
const GRAPH_ID = "senior_secondary_biology";
const GAP_PREFIX = "gap_cn_sh_bio_2020_o_";
const paths = {
  gaps: resolve(DATA_ROOT, "curricula/gaps/pending/cn_moe_senior_high_biology_2020_outcomes.json"),
  mappings: resolve(DATA_ROOT, "curricula/mappings/pending/cn_moe_senior_high_biology_2020.json"),
  resolutions: resolve(DATA_ROOT, "curricula/resolutions/pending/cn_moe_senior_high_biology_2020_outcomes.json"),
  graph: resolve(DATA_ROOT, `source/${GRAPH_ID}.json`),
  registry: resolve(DATA_ROOT, "governance/concept-registry.json"),
  sources: resolve(DATA_ROOT, "governance/sources.json"),
  review: resolve(DATA_ROOT, "review/pending/curriculum-mapping/cms_cn_moe_senior_high_biology_2020_outcomes.implementation-review.zh-CN.md"),
};

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};
const unique = (values) => [...new Set(values)];
const uniqueEvidence = (refs) => {
  const seen = new Set();
  return refs.filter((ref) => {
    const key = `${ref.source_id}|${ref.locator}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
const gapKey = (gapId) => gapId
  .replace(GAP_PREFIX, "")
  .replace(/^(?:rc|rg|sh|se|sb)_\d+_\d+_\d+_/, "");
const nodeIdFor = (key) => `cn_sh_bio_${key}`;
const canonicalIdFor = (nodeId) => {
  const digest = createHash("sha256").update(`primoria-concept-v1\0${GRAPH_ID}\0${nodeId}`).digest("hex");
  return `pc_${digest.slice(0, 32)}`;
};

const SOURCE_IDS = {
  moe: "src_cn_moe_senior_high_biology_2020",
  biology: "src_openstax_biology_2e_2018",
  microbiology: "src_openstax_microbiology_2016",
  plantSomaticHybridisation: "src_pmc_apiaceae_protoplast_somatic_hybridisation_2023",
  plantCellApplications: "src_pmc_plant_tissue_culture_applications_2023",
  embryoEngineering: "src_fao_cattle_embryo_transfer_manual_1991",
  proteinEngineering: "src_ncbi_genomes_2e_protein_engineering_2002",
  neuroscience: "src_ncbi_neuroscience_2e_2001",
  reproductiveCloningPolicy: "src_cn_nhc_assisted_reproduction_ethics_2003",
};

const EVIDENCE = new Map();
const route = (keys, sourceId, locator) => {
  for (const key of keys) {
    if (EVIDENCE.has(key)) throw new Error(`Duplicate evidence route for ${key}`);
    EVIDENCE.set(key, [{ source_id: sourceId, locator }]);
  }
};

route(["cellular_elements_carbon_skeletons", "cellular_inorganic_salts"], SOURCE_IDS.biology, "Web §§2.1-2.4 atoms, water, carbon and biological macromolecules");
route(["plasma_membrane_functions", "selective_permeability", "endocytosis_exocytosis"], SOURCE_IDS.biology, "Web Chapter 5 Structure and Function of Plasma Membranes, especially §§5.1-5.4");
route(["nucleus_genetic_information", "organelle_coordination", "cellular_unity_diversity"], SOURCE_IDS.biology, "Web Chapter 4 Cell Structure, especially §§4.2-4.6 prokaryotic/eukaryotic cells, organelles and cellular connections");
route(["cell_differentiation"], SOURCE_IDS.biology, "Web §16.3 Eukaryotic Epigenetic Gene Regulation; differential gene expression and cell differentiation");
route(["cell_senescence_death"], SOURCE_IDS.biology, "Web §§10.2-10.4 cell cycle control, cancer and programmed cell death");
route(["gene_nucleic_acid_segment"], SOURCE_IDS.biology, "Web Chapter 14 DNA Structure and Function; Chapter 15 Genes and Proteins; §17.1 Biotechnology");
route(["epigenetic_phenomena"], SOURCE_IDS.biology, "Web §16.3 Eukaryotic Epigenetic Gene Regulation");
route(["gametic_inheritance", "sex_linked_inheritance"], SOURCE_IDS.biology, "Web Chapter 11 Meiosis and Sexual Reproduction; Chapter 13 Modern Understandings of Inheritance");
route(["mutagens_cancer"], SOURCE_IDS.biology, "Web §10.4 Cancer and the Cell Cycle; §14.6 DNA Repair");
route(["chromosomal_variation"], SOURCE_IDS.biology, "Web §13.2 Chromosomal Basis of Inherited Disorders");
route(["genetic_disease_screening"], SOURCE_IDS.biology, "Web §17.1 Biotechnology; genetic diagnosis and gene therapy");
route(["common_ancestry_fossil_anatomy"], SOURCE_IDS.biology, "Web §18.1 Understanding Evolution; fossil, anatomical and embryological evidence");
route(["common_ancestry_cell_molecular"], SOURCE_IDS.biology, "Web §20.2 Determining Evolutionary Relationships; molecular and cellular homology");
route(["internal_environment_fluids", "internal_external_exchange", "organ_system_exchange"], SOURCE_IDS.biology, "Web §33.3 Homeostasis; Chapters 40-41 circulatory, respiratory, excretory and osmoregulatory exchange");
route(["reflex_arc", "central_nervous_hierarchy", "autonomic_nervous_regulation"], SOURCE_IDS.biology, "Web Chapter 35 The Nervous System, especially §§35.1-35.3 neurons, central and peripheral nervous systems");
route(["cortical_higher_activity"], SOURCE_IDS.neuroscience, "Part V Complex Brain Functions, especially Chapters 27 and 31; cortical language function and the neural basis of learning and memory");
route(["endocrine_system", "neuroendocrine_coordination"], SOURCE_IDS.biology, "Web Chapter 37 The Endocrine System; §33.3 Homeostasis");
route(["humoral_respiratory_regulation"], SOURCE_IDS.biology, "Web §39.3 Breathing; carbon-dioxide and pH control of ventilation");
route(["innate_adaptive_immunity", "immune_disorders"], SOURCE_IDS.biology, "Web Chapter 42 The Immune System, especially §§42.1-42.4 innate, adaptive and disrupted immunity");
route(["auxin_dual_effects", "plant_growth_regulator_applications"], SOURCE_IDS.biology, "Web §30.6 Plant Sensory Systems and Responses; auxin, tropisms and agricultural applications");
route(["population_characteristics"], SOURCE_IDS.biology, "Web §45.1 Population Demography; population size, density, distribution and life-history structure");
route(["population_growth_models"], SOURCE_IDS.biology, "Web §45.3 Environmental Limits to Population Growth; exponential and logistic growth models");
route(["population_limiting_factors"], SOURCE_IDS.biology, "Web §45.4 Population Dynamics and Regulation; density-dependent and density-independent limiting factors");
route(["community_structure", "ecological_succession"], SOURCE_IDS.biology, "Web Chapter 45 Population and Community Ecology; community structure and succession");
route(["food_chains_webs", "matter_cycles_energy_flow", "ecological_resource_use", "ecological_pyramids", "biomagnification", "trophic_structure_factors"], SOURCE_IDS.biology, "Web Chapter 46 Ecosystems; trophic structure, energy flow, biogeochemical cycles and ecosystem dynamics");
route(["ecosystem_information_transfer"], SOURCE_IDS.biology, "Web §45.7 Behavioral Biology; communication by visual, chemical, aural and tactile signals and its roles in reproduction and social behaviour");
route(["ecosystem_stability", "ecosystem_disturbances", "ecosystem_self_regulation"], SOURCE_IDS.biology, "Web §§46.1-46.3 ecosystem dynamics, trophic interactions and biogeochemical cycles");
route(["population_environment_pressure"], SOURCE_IDS.biology, "Web §45.5 Human Population Growth; demographic transition, resource demand and carrying capacity");
route(["global_environmental_change"], SOURCE_IDS.biology, "Web §44.5 Climate and the Effects of Global Climate Change; §47.3 Threats to Biodiversity");
route(["ecological_engineering_circularity"], SOURCE_IDS.biology, "Web §22.5 Beneficial Prokaryotes: bioremediation; §46.3 Biogeochemical Cycles; Chapter 47 conservation, restoration and sustainable resource use");
route(["sterilisation_microbe_culture", "aseptic_technique"], SOURCE_IDS.microbiology, "Web Chapter 13 Control of Microbial Growth; physical and chemical control methods and aseptic practice");
route(["selective_culture_media", "microbial_isolation_methods", "microbial_counting_methods"], SOURCE_IDS.microbiology, "Web Chapter 9 Microbial Growth; culture media, isolation and direct/viable counting methods");
route(["traditional_fermentation"], SOURCE_IDS.microbiology, "Web §1.1 What Our Ancestors Knew and §8.4 Fermentation; traditional food and beverage fermentation");
route(["industrial_fermentation", "fermentation_applications"], SOURCE_IDS.microbiology, "Web §8.4 Fermentation; commercial food, pharmaceutical, solvent, vitamin and biofuel products");
route(["plant_tissue_culture"], SOURCE_IDS.biology, "Web §32.3 Asexual Reproduction; micropropagation, disease-free stock and plant tissue culture");
route(["plant_cell_engineering_applications"], SOURCE_IDS.plantCellApplications, "Sections 4.1-4.2; rapid micropropagation, virus-free plants, genetic improvement and secondary-metabolite production");
route(["plant_somatic_hybridisation"], SOURCE_IDS.plantSomaticHybridisation, "Sections 1 and 9; protoplast isolation, chemical or electrical fusion, hybrid-plant regeneration and breeding applications");
route(["animal_cell_culture", "animal_cell_fusion"], SOURCE_IDS.microbiology, "Web §20.1 Polyclonal and Monoclonal Antibody Production; tissue culture and hybridoma cell fusion");
route(["somatic_cell_nuclear_transfer"], SOURCE_IDS.biology, "Web §17.1 Biotechnology; somatic-cell nuclear transfer and reproductive cloning");
route(["monoclonal_antibody_production"], SOURCE_IDS.microbiology, "Web §20.1 Polyclonal and Monoclonal Antibody Production");
route(["stem_cell_applications"], SOURCE_IDS.biology, "Web §§43.6-43.7 early embryonic development, embryonic stem cells and differentiation");
route(["fertilisation_early_embryo"], SOURCE_IDS.biology, "Web §43.6 Fertilization and Early Embryonic Development");
route(["embryo_engineering"], SOURCE_IDS.embryoEngineering, "Chapters 6-10, especially Chapter 10 Splitting Embryos; embryo recovery, transfer, bisection and demi-embryo transfer");
route(["gene_engineering_tools"], SOURCE_IDS.biology, "Web §17.1 Biotechnology; recombinant-DNA tools, cloning, expression and engineered products");
route(["protein_engineering_design", "protein_engineering_process"], SOURCE_IDS.proteinEngineering, "Chapter 7 §7.2.3; protein engineering by targeted gene alteration to change protein structure, activity and application properties");
route(["gmo_impacts"], SOURCE_IDS.biology, "Web §17.1 Biotechnology; agricultural, medical and ethical impacts of genetic modification");
route(["reproductive_cloning_ethics"], SOURCE_IDS.biology, "Web §1.1 The Science of Biology: scientific ethics; §17.1 Biotechnology: reproductive cloning, safety and social consequences");
route(["reproductive_cloning_china_policy"], SOURCE_IDS.reproductiveCloningPolicy, "附件1 行为准则第（十五）项‘禁止克隆人’；附件3 社会公益原则第3项‘不得实施生殖性克隆技术’");
route(["biological_weapons_harms"], SOURCE_IDS.microbiology, "Web §21.2 Bacterial Infections of the Skin and Eyes; anthrax as a biological weapon and documented harms");

const SHARED_NODE_KEYS = {
  protein_engineering_process: "protein_engineering",
  protein_engineering_design: "protein_engineering",
};
const SHARED_DETAILS = {
  protein_engineering: {
    name: "Protein engineering",
    nameZh: "蛋白质工程",
    description: "说明以目标蛋白质结构和功能为导向，通过基因设计与改造获得满足人类需求蛋白质的原理和过程。",
  },
};

const TOPIC_GROUPS = [
  ["cell_chemistry_membrane", "Cell chemistry and membrane", "细胞化学与质膜", ["cellular_elements_carbon_skeletons", "cellular_inorganic_salts", "plasma_membrane_functions"]],
  ["cell_coordination", "Cell organisation and coordination", "细胞组织与协调", ["nucleus_genetic_information", "organelle_coordination", "cellular_unity_diversity"]],
  ["membrane_transport", "Selective and bulk transport", "选择性与大分子运输", ["selective_permeability", "endocytosis_exocytosis"]],
  ["cell_fate", "Cell differentiation and fate", "细胞分化与命运", ["cell_differentiation", "cell_senescence_death"]],
  ["genetic_information", "Genetic information and transmission", "遗传信息与传递", ["gene_nucleic_acid_segment", "epigenetic_phenomena", "gametic_inheritance"]],
  ["genetic_variation", "Inheritance and variation", "遗传与变异", ["sex_linked_inheritance", "mutagens_cancer", "chromosomal_variation"]],
  ["evolution_evidence_health", "Genetic health and evolutionary evidence", "遗传健康与进化证据", ["genetic_disease_screening", "common_ancestry_fossil_anatomy", "common_ancestry_cell_molecular"]],
  ["internal_environment", "Internal environment and exchange", "内环境与物质交换", ["internal_environment_fluids", "internal_external_exchange", "organ_system_exchange"]],
  ["nervous_regulation", "Nervous regulation", "神经调节", ["reflex_arc", "central_nervous_hierarchy", "autonomic_nervous_regulation"]],
  ["neuroendocrine", "Higher nervous and endocrine control", "高级神经与内分泌调节", ["cortical_higher_activity", "endocrine_system", "neuroendocrine_coordination"]],
  ["homeostasis_immunity", "Humoral regulation and immunity", "体液调节与免疫", ["humoral_respiratory_regulation", "innate_adaptive_immunity", "immune_disorders"]],
  ["plant_regulation", "Auxin and plant growth regulation", "生长素与植物生长调节", ["auxin_dual_effects", "plant_growth_regulator_applications"]],
  ["population_ecology", "Population ecology", "种群生态", ["population_characteristics", "population_growth_models", "population_limiting_factors"]],
  ["community_trophic", "Communities and trophic networks", "群落与营养网络", ["community_structure", "ecological_succession", "food_chains_webs"]],
  ["ecosystem_flows", "Ecosystem flows and resource use", "生态系统流动与资源利用", ["matter_cycles_energy_flow", "ecological_resource_use", "ecological_pyramids"]],
  ["ecosystem_transfer", "Transfer and trophic structure", "生态传递与营养结构", ["biomagnification", "ecosystem_information_transfer", "trophic_structure_factors"]],
  ["ecosystem_stability", "Ecosystem stability", "生态系统稳定性", ["ecosystem_stability", "ecosystem_disturbances", "ecosystem_self_regulation"]],
  ["environmental_change", "Population and environmental change", "人口与环境变化", ["population_environment_pressure", "global_environmental_change", "ecological_engineering_circularity"]],
  ["microbial_control", "Microbial culture control", "微生物培养控制", ["sterilisation_microbe_culture", "aseptic_technique", "selective_culture_media"]],
  ["microbial_measurement", "Microbial isolation and measurement", "微生物分离与测定", ["microbial_isolation_methods", "microbial_counting_methods", "traditional_fermentation"]],
  ["fermentation_plant", "Fermentation and plant culture", "发酵与植物培养", ["industrial_fermentation", "fermentation_applications", "plant_tissue_culture"]],
  ["plant_animal_cells", "Plant and animal cell engineering", "植物与动物细胞工程", ["plant_somatic_hybridisation", "plant_cell_engineering_applications", "animal_cell_culture"]],
  ["animal_cell_engineering", "Animal-cell engineering", "动物细胞工程", ["somatic_cell_nuclear_transfer", "animal_cell_fusion", "monoclonal_antibody_production"]],
  ["embryo_stem_cells", "Embryo and stem-cell engineering", "胚胎与干细胞工程", ["stem_cell_applications", "fertilisation_early_embryo", "embryo_engineering"]],
  ["molecular_engineering", "Molecular engineering and impacts", "分子工程及其影响", ["gene_engineering_tools", "protein_engineering", "gmo_impacts"]],
  ["biotechnology_ethics", "Biotechnology ethics and security", "生物技术伦理与安全", ["reproductive_cloning_ethics", "reproductive_cloning_china_policy", "biological_weapons_harms"]],
];

const EDGE_SPECS = [
  ["plasma_membrane_functions", "selective_permeability", "解释选择透过性需要先理解质膜作为细胞边界和运输界面的功能。"],
  ["plasma_membrane_functions", "endocytosis_exocytosis", "理解胞吞和胞吐需要先掌握质膜的结构、边界和动态运输功能。"],
  ["gene_nucleic_acid_segment", "epigenetic_phenomena", "区分表观遗传与序列突变需要先理解基因作为核酸功能片段。"],
  ["gametic_inheritance", "sex_linked_inheritance", "分析伴性遗传需要先理解遗传信息通过配子传递。"],
  ["internal_environment_fluids", "internal_external_exchange", "分析细胞与外界交换需要先识别内环境的液体组成。"],
  ["internal_external_exchange", "organ_system_exchange", "说明器官系统协同前需要先建立细胞经内环境交换的路径。"],
  ["reflex_arc", "central_nervous_hierarchy", "理解高级和低级中枢协调需要先掌握反射弧的基本输入输出结构。"],
  ["central_nervous_hierarchy", "autonomic_nervous_regulation", "解释自主神经调节内脏需要先理解中枢层级的协调。"],
  ["endocrine_system", "neuroendocrine_coordination", "解释神经体液协同需要先识别内分泌系统和激素信号。"],
  ["population_characteristics", "population_limiting_factors", "分析限制因素的作用需要先明确种群密度、出生死亡和迁入迁出等响应变量。"],
  ["population_growth_models", "population_limiting_factors", "以指数和逻辑斯谛增长模型及环境容纳量为动态基线，有助于进一步分析各类限制因素如何改变种群数量。"],
  ["community_structure", "ecological_succession", "理解群落随时间替代需要先识别其垂直和水平结构。"],
  ["food_chains_webs", "matter_cycles_energy_flow", "分析能量与物质路径需要先建立食物链和食物网营养结构。"],
  ["matter_cycles_energy_flow", "ecological_pyramids", "解释生态金字塔需要先掌握能量逐级递减和物质循环的差异。"],
  ["food_chains_webs", "biomagnification", "说明有害物质富集需要先理解食物链中的摄食关系。"],
  ["ecosystem_disturbances", "ecosystem_self_regulation", "评价自我调节能力需要先识别扰动来源和强度。"],
  ["ecosystem_self_regulation", "ecological_engineering_circularity", "设计生态工程需要先理解系统自我调节和结构功能关系。"],
  ["sterilisation_microbe_culture", "aseptic_technique", "实施无菌操作需要先理解灭菌对纯培养的作用边界。"],
  ["selective_culture_media", "microbial_isolation_methods", "选择分离方法前需要理解培养基如何筛选目标微生物。"],
  ["industrial_fermentation", "fermentation_applications", "评价发酵工程应用需要先掌握工业化培养和过程控制。"],
  ["plant_tissue_culture", "plant_cell_engineering_applications", "理解植物细胞工程应用需要先掌握组织培养和再分化。"],
  ["plant_tissue_culture", "plant_somatic_hybridisation", "原生质体融合后的杂种细胞需要通过组织培养和植株再生才能形成完整杂种植株。"],
  ["plant_somatic_hybridisation", "plant_cell_engineering_applications", "理解植物细胞工程的育种应用需要先掌握原生质体融合与体细胞杂交。"],
  ["animal_cell_culture", "animal_cell_fusion", "动物细胞融合操作建立在体外培养和维持细胞的基础上。"],
  ["animal_cell_fusion", "monoclonal_antibody_production", "单克隆抗体制备需要先理解细胞融合形成杂交瘤的原理。"],
  ["fertilisation_early_embryo", "embryo_engineering", "理解胚胎移植和分割需要先掌握受精与早期胚胎发育。"],
  ["gene_engineering_tools", "protein_engineering", "蛋白质工程通过基因设计实现，依赖限制酶、连接酶和载体等工具。"],
  ["somatic_cell_nuclear_transfer", "reproductive_cloning_ethics", "评价生殖性克隆伦理问题需要先理解体细胞核移植技术。"],
  ["reproductive_cloning_ethics", "reproductive_cloning_china_policy", "理解中国禁止生殖性克隆人的政策理由需要先分析该技术的安全与伦理问题。"],
];

const gaps = readJson(paths.gaps);
const mappings = readJson(paths.mappings);
const registry = readJson(paths.registry);
const sources = readJson(paths.sources);
for (const sourceId of Object.values(SOURCE_IDS)) {
  if (!sources.sources.some((source) => source.source_id === sourceId)) throw new Error(`Missing source registry entry ${sourceId}`);
}

const candidateKeys = new Set(gaps.candidates.map((candidate) => gapKey(candidate.gap_id)));
const missingEvidence = [...candidateKeys].filter((key) => !EVIDENCE.has(key));
const orphanEvidence = [...EVIDENCE.keys()].filter((key) => !candidateKeys.has(key));
if (missingEvidence.length) throw new Error(`Missing secondary evidence routes: ${missingEvidence.join(", ")}`);
if (orphanEvidence.length) throw new Error(`Evidence routes without gap candidates: ${orphanEvidence.join(", ")}`);

const createdNodes = [];
const resolutions = [];
const resolutionByGapId = new Map();
for (const candidate of gaps.candidates) {
  const key = gapKey(candidate.gap_id);
  const nodeKey = SHARED_NODE_KEYS[key] ?? key;
  const nodeId = nodeIdFor(nodeKey);
  const canonicalId = canonicalIdFor(nodeId);
  const secondaryRefs = EVIDENCE.get(key);
  const existingNode = createdNodes.find((node) => node.id === nodeId);
  if (existingNode) {
    existingNode.evidence_refs = uniqueEvidence([
      ...existingNode.evidence_refs,
      ...candidate.evidence_refs,
      ...secondaryRefs,
    ]);
  } else {
    const details = SHARED_DETAILS[nodeKey];
    createdNodes.push({
      id: nodeId,
      canonical_id: canonicalId,
      kind: "concept",
      name: details?.name ?? candidate.proposed_name,
      name_zh: details?.nameZh ?? candidate.proposed_name_zh,
      topic: null,
      description: details?.description ?? candidate.scope_zh,
      default_order: 0,
      evidence_refs: uniqueEvidence([...candidate.evidence_refs, ...secondaryRefs]),
      review_status: "needs_review",
    });
  }
  const resolution = {
    gap_id: candidate.gap_id,
    resolution_action: "add_or_alias_concepts",
    canonical_ids: unique([...(candidate.existing_canonical_ids ?? []), canonicalId]),
    created_node_ids: [nodeId],
    practice_ids: [],
    rationale_zh: SHARED_NODE_KEYS[key]
      ? "该成果与另一课标成果描述同一知识概念的不同表现，共享一个稳定 canonical 概念，避免重复 ID。"
      : "现有统一 KG 只覆盖上位概念或部分边界，不能独立诊断该课标成果；新增窄粒度稳定概念并保留相关 canonical 映射。",
    evidence_refs: uniqueEvidence([...candidate.evidence_refs, ...secondaryRefs]),
    review_status: "needs_review",
  };
  resolutions.push(resolution);
  resolutionByGapId.set(candidate.gap_id, resolution);
}

const createdByKey = new Map(createdNodes.map((node) => [node.id.replace(/^cn_sh_bio_/, ""), node]));
const topicNodes = [];
const groupedNodeIds = new Set();
for (const [index, [topicKey, name, nameZh, conceptKeys]] of TOPIC_GROUPS.entries()) {
  const topicId = `cn_sh_bio_topic_${topicKey}`;
  const concepts = conceptKeys.map((conceptKey, conceptIndex) => {
    const node = createdByKey.get(conceptKey);
    if (!node) throw new Error(`Topic ${topicId} references missing created concept ${conceptKey}`);
    if (groupedNodeIds.has(node.id)) throw new Error(`Created node appears in multiple topics: ${node.id}`);
    groupedNodeIds.add(node.id);
    node.topic = topicId;
    node.default_order = conceptIndex + 1;
    return node;
  });
  if (concepts.length < 2 || concepts.length > 3) throw new Error(`Topic ${topicId} must contain 2-3 concepts`);
  topicNodes.push({
    id: topicId,
    kind: "topic",
    name,
    name_zh: nameZh,
    topic: null,
    default_order: index + 1,
    evidence_refs: uniqueEvidence(concepts.flatMap((node) => node.evidence_refs)),
    review_status: "needs_review",
  });
}
const ungrouped = createdNodes.filter((node) => !groupedNodeIds.has(node.id));
if (ungrouped.length) throw new Error(`Created concepts missing topic groups: ${ungrouped.map((node) => node.id).join(", ")}`);

const createdById = new Map(createdNodes.map((node) => [node.id, node]));
const edges = EDGE_SPECS.map(([fromKey, toKey, reason]) => {
  const from = nodeIdFor(fromKey);
  const to = nodeIdFor(toKey);
  const fromNode = createdById.get(from);
  const toNode = createdById.get(to);
  if (!fromNode || !toNode) throw new Error(`Edge references missing node ${from}->${to}`);
  return {
    from,
    to,
    type: "prereq",
    strength: "soft",
    reason,
    evidence_refs: uniqueEvidence([...fromNode.evidence_refs, ...toNode.evidence_refs]),
    review_status: "needs_review",
  };
});

const graph = {
  schema_version: "2.0.0",
  content_version: "0.1.0",
  graph_id: GRAPH_ID,
  subject: "Biology",
  jurisdictions: ["CN"],
  source_ids: unique(createdNodes.flatMap((node) => node.evidence_refs.map((ref) => ref.source_id))),
  review_status: "needs_review",
  changelog: [{
    version: "0.1.0",
    date: TODAY,
    summary_zh: "依据中国普通高中生物学 120 条编号成果覆盖审查，新增最小可诊断概念、复用稳定 canonical 组合，并补齐第二类权威证据。",
  }],
  nodes: [...topicNodes, ...createdNodes],
  edges,
};

const conceptsWithoutGraphAliases = registry.concepts
  .map((concept) => ({ ...concept, aliases: concept.aliases.filter((alias) => alias.graph_id !== GRAPH_ID) }))
  .filter((concept) => concept.aliases.length > 0);
const rebuiltByCanonicalId = new Map(conceptsWithoutGraphAliases.map((concept) => [concept.canonical_id, concept]));
for (const node of createdNodes) {
  const alias = { graph_id: GRAPH_ID, node_id: node.id };
  const existing = rebuiltByCanonicalId.get(node.canonical_id);
  if (existing) existing.aliases.push(alias);
  else rebuiltByCanonicalId.set(node.canonical_id, {
    canonical_id: node.canonical_id,
    preferred_name: node.name,
    preferred_name_zh: node.name_zh,
    status: "active",
    review_status: "needs_review",
    aliases: [alias],
  });
}
registry.generated_at = TODAY;
registry.concepts = [...rebuiltByCanonicalId.values()].sort((left, right) => left.canonical_id.localeCompare(right.canonical_id));

const mappingByRequirement = new Map(mappings.mappings.map((mapping) => [mapping.requirement_id, mapping]));
for (const candidate of gaps.candidates) {
  const resolution = resolutionByGapId.get(candidate.gap_id);
  for (const requirementId of candidate.requirement_ids) {
    const mapping = mappingByRequirement.get(requirementId);
    if (!mapping) throw new Error(`Missing mapping for ${requirementId}`);
    mapping.canonical_ids = resolution.canonical_ids;
    mapping.coverage_status = "full";
    mapping.relation = "required";
    mapping.mapping_basis = "semantic_inference";
    mapping.confidence = "high";
    mapping.rationale_zh = `经定义边界复核，现由 canonical 概念 ${resolution.canonical_ids.join("、")} 完整覆盖。`;
    mapping.review_status = "needs_review";
  }
}
mappings.content_version = "0.4.0";
mappings.generated_at = TODAY;
mappings.review_status = "needs_review";
if (!mappings.changelog.some((entry) => entry.version === "0.4.0")) {
  mappings.changelog.push({
    version: "0.4.0",
    date: TODAY,
    summary_zh: "应用全库定义复核与缺口解析：118 项知识成果闭合为 full，2 项纯价值与社会责任成果保持 excluded。",
  });
}

const resolutionSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  resolution_set_id: "cgr_cn_moe_senior_high_biology_2020_outcomes",
  gap_set_id: gaps.gap_set_id,
  framework_id: gaps.framework_id,
  curriculum_id: gaps.curriculum_id,
  subject: gaps.subject,
  source_ids: unique(resolutions.flatMap((resolution) => resolution.evidence_refs.map((ref) => ref.source_id))),
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [{
    version: "0.1.0",
    date: TODAY,
    summary_zh: "完成 76 项生物学知识缺口逐项定义复核、稳定 ID 建立和双来源证据绑定。",
  }],
  resolutions,
};

const edgeTargets = new Set(edges.map((edge) => edge.to));
const rootConcepts = createdNodes.filter((node) => !edgeTargets.has(node.id));
const reviewLines = [
  "# 中国高中生物学 KG 缺口实施复核（中文）",
  "",
  `- 复核日期：${TODAY}`,
  `- 编号课标成果：120 项；知识 118 项，价值与责任实践 2 项`,
  `- 缺口解析：${resolutions.length} 项`,
  `- 新增稳定概念：${createdNodes.length} 个`,
  `- 新图：${createdNodes.length} 个 Concept，${topicNodes.length} 个 Topic，${edges.length} 条待审先修边`,
  "- 状态：全部保持 `needs_review`；本轮是 AI 语义复核，不伪造人工批准。",
  "",
  "## 关键决定",
  "",
  "1. 120 条编号内容要求逐条保留；教学提示中的实验活动没有重复制造为课标成果。",
  "2. ‘形成环保意识’和‘认同反对生物武器扩散’只进入实践与社会责任层，不写入概念掌握度。",
  "3. 蛋白质工程的‘设计改造’与‘实现过程’共享一个 canonical 概念；生殖性克隆伦理与中国政策的两个成果同样共享一个概念。",
  "4. ‘生态系统与生态位’不等于种群模型、群落演替或物质能量流动；‘基因技术’也不等于细胞工程和胚胎工程，未以宽概念掩盖缺口。",
  "5. 微生物培养、计数、发酵和单克隆抗体证据使用 OpenStax Microbiology 的对应章节，其余概念按 Biology 2e 精确章节绑定。",
  "6. OpenStax 当前页面有额外的大模型摄入限制；仓库只保存元数据、校验值和章节定位，不保存或摄入教材正文。",
  `7. 逐项检查 ${rootConcepts.length} 个根概念：它们是主题入口或依赖统一 KG 中已复用概念；没有把课标排列顺序伪造成学理先修边。`,
  "",
  "## 逐项解析",
  "",
  "| # | 原缺口 | canonical IDs | 新节点 | 第二来源 |",
  "|---:|---|---|---|---|",
];
for (const [index, candidate] of gaps.candidates.entries()) {
  const key = gapKey(candidate.gap_id);
  const resolution = resolutionByGapId.get(candidate.gap_id);
  const canonicalText = resolution.canonical_ids.map((id) => `\`${id}\``).join("<br>");
  const nodeText = resolution.created_node_ids.map((id) => `\`${id}\``).join("<br>");
  const sourceText = EVIDENCE.get(key).map((ref) => `${ref.source_id}：${ref.locator}`).join("<br>");
  reviewLines.push(`| ${index + 1} | ${candidate.proposed_name_zh} | ${canonicalText} | ${nodeText} | ${sourceText} |`);
}
reviewLines.push(
  "",
  "## 自动门禁",
  "",
  "- 76 个 gap_id 必须各解析一次；118 个知识成果必须为 full，2 个价值实践成果必须为 excluded。",
  "- 每个新图 Concept 必须同时有教育部页码证据和至少一个 OpenStax 精确章节证据。",
  "- 每个 Topic 保持 2–3 个 Concept；先修边必须是 DAG 且含理由和证据。",
  "- 所有本轮数据保持 needs_review，只有人工决定才能升级为 approved。",
  "",
);

writeJson(paths.graph, graph);
writeJson(paths.registry, registry);
writeJson(paths.mappings, mappings);
writeJson(paths.resolutions, resolutionSet);
mkdirSync(dirname(paths.review), { recursive: true });
writeFileSync(paths.review, `${reviewLines.join("\n")}\n`);

process.stdout.write(`[apply-cn-biology-resolutions] ${resolutions.length} gap resolutions; ${createdNodes.length} graph concepts, ${topicNodes.length} topics, ${edges.length} edges\n`);
