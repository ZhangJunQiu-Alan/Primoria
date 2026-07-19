#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const DATA_ROOT = resolve(REPO_ROOT, "data/knowledge-graphs");
const TODAY = "2026-07-19";
const GRAPH_ID = "senior_secondary_chemistry";
const GAP_PREFIX = "gap_cn_sh_chem_2020_o_";
const paths = {
  gaps: resolve(DATA_ROOT, "curricula/gaps/pending/cn_moe_senior_high_chemistry_2020_outcomes.json"),
  mappings: resolve(DATA_ROOT, "curricula/mappings/pending/cn_moe_senior_high_chemistry_2020.json"),
  resolutions: resolve(DATA_ROOT, "curricula/resolutions/pending/cn_moe_senior_high_chemistry_2020_outcomes.json"),
  graph: resolve(DATA_ROOT, `source/${GRAPH_ID}.json`),
  registry: resolve(DATA_ROOT, "governance/concept-registry.json"),
  sources: resolve(DATA_ROOT, "governance/sources.json"),
  review: resolve(DATA_ROOT, "review/pending/curriculum-mapping/cms_cn_moe_senior_high_chemistry_2020_outcomes.implementation-review.zh-CN.md"),
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
  .replace(/^(?:r|se|ss|so)_\d+_\d+[a-z]?_/, "");
const nodeIdFor = (key) => `cn_sh_chem_${key}`;
const canonicalIdFor = (nodeId) => {
  const digest = createHash("sha256").update(`primoria-concept-v1\0${GRAPH_ID}\0${nodeId}`).digest("hex");
  return `pc_${digest.slice(0, 32)}`;
};

const SOURCE_IDS = {
  moe: "src_cn_moe_senior_high_chemistry_2020",
  regulation: "src_cn_state_council_hazardous_chemicals_2013",
  chemistry: "src_openstax_chemistry_2e_2019",
  organic: "src_openstax_organic_chemistry_2023",
};

// These outcomes need no synthetic wrapper concept: the listed stable concepts,
// taken together, already cover the complete diagnostic boundary.
const PURE_REUSE = {
  redox_electron_transfer: [
    "pc_042f315c4fd69794846195086e9611ec",
    "pc_4b8778a639899b2be00ad35d38df1699",
  ],
  bond_changes_reaction_energy: ["pc_b35d6548b40342a4e7e95af4650c7349"],
  carbon_bonding_geometry: [
    "pc_b7cf8d670e2f37db41a760a401141534",
    "pc_76c78ee2b35eca2b943816eb56dbac2a",
  ],
  intro_organic_reaction_types: [
    "pc_9826358783352bf325f9299146a78a37",
    "pc_cd9220ccd4a94d9511b50e51680a585c",
    "pc_3ebd79c190b474a0044f5c7d9e8cd92f",
  ],
  reaction_path_activation: [
    "pc_2a4571ab0da3a12f57b0c311f63f1bee",
    "pc_cb40576691a93cdc979f318c9e746398",
  ],
  molecular_polarity_chirality: [
    "pc_eed2c090eb2027bca1d0484dc93fee0f",
    "pc_e3ad1e8ae27f757ccf5d59c333f04d7a",
  ],
  organic_connectivity_geometry: [
    "pc_b7cf8d670e2f37db41a760a401141534",
    "pc_76c78ee2b35eca2b943816eb56dbac2a",
  ],
};

const EVIDENCE = new Map();
const route = (keys, sourceId, locator) => {
  for (const key of keys) {
    if (EVIDENCE.has(key)) throw new Error(`Duplicate evidence route for ${key}`);
    EVIDENCE.set(key, [{ source_id: sourceId, locator }]);
  }
};
const addRoute = (key, sourceId, locator) => {
  EVIDENCE.set(key, [...(EVIDENCE.get(key) ?? []), { source_id: sourceId, locator }]);
};

route(["chemical_science_scope"], SOURCE_IDS.chemistry, "Web §1.1 Chemistry in Context");
route(["substance_classification_conversion"], SOURCE_IDS.chemistry, "Web §§1.2-1.3 Phases and Classification of Matter; Physical and Chemical Properties; §4.2 Classifying Chemical Reactions");
route(["element_valence_conversion", "redox_electron_transfer", "oxidising_reducing_agents"], SOURCE_IDS.chemistry, "Web §4.2 Classifying Chemical Reactions; §17.1 Review of Redox Chemistry");
route(["colloidal_dispersions"], SOURCE_IDS.chemistry, "Web §11.5 Colloids");
route(["electrolyte_ionisation", "ionic_reaction_conditions"], SOURCE_IDS.chemistry, "Web §11.2 Electrolytes; §4.2 Classifying Chemical Reactions");
route(["common_ion_tests"], SOURCE_IDS.chemistry, "Web §4.5 Quantitative Chemical Analysis; Chapter 15 Equilibria of Other Reaction Classes");
route(["sodium_compounds"], SOURCE_IDS.chemistry, "Web Chapter 18, sections on the occurrence, preparation, properties and uses of representative metals");
route(["iron_compounds"], SOURCE_IDS.chemistry, "Web Chapter 19 Transition Metals and Coordination Chemistry; occurrence, preparation and properties of iron");
route(["nitrogen_compounds", "sulfur_compounds"], SOURCE_IDS.chemistry, "Web Chapter 18, sections on the occurrence, preparation, properties and uses of nitrogen and sulfur");
route(["inorganic_conversion_pathways"], SOURCE_IDS.chemistry, "Web §4.2 Classifying Chemical Reactions; Chapters 18-19 representative and transition-element chemistry");
route(["inorganic_stse_value"], SOURCE_IDS.chemistry, "Web Chapters 18-19, preparation, uses and environmental context of inorganic substances");
route(["bond_changes_reaction_energy"], SOURCE_IDS.chemistry, "Web §7.5 Strengths of Ionic and Covalent Bonds; Chapter 5 Thermochemistry");
route(["fuel_battery_evaluation"], SOURCE_IDS.chemistry, "Web §17.5 Batteries and Fuel Cells");
route(["carbon_bonding_geometry", "organic_connectivity_geometry"], SOURCE_IDS.organic, "Web Chapters 1-2 Structure and Bonding; Polar Covalent Bonds, Acids, and Bases");
route(["intro_organic_reaction_types"], SOURCE_IDS.organic, "Web Chapter 6 An Overview of Organic Reactions; Chapters 7-11 addition, substitution and elimination; Chapter 31 Synthetic Polymers");
route(["organic_synthesis_value"], SOURCE_IDS.organic, "Web Chapter 6 An Overview of Organic Reactions; Chapter 31 Synthetic Polymers");
route(["intro_macromolecule_applications"], SOURCE_IDS.organic, "Web Chapters 25-28 Biomolecules; Chapter 31 Synthetic Polymers");
route(["chemistry_sustainable_development"], SOURCE_IDS.chemistry, "Web §1.1 Chemistry in Context; Chapters 17-20 energy, materials and organic-chemistry applications");
route(["green_chemistry_principles", "clean_production_circularity"], SOURCE_IDS.chemistry, "Web §4.4 Reaction Yields; Chapter 16 Thermodynamics; Chapters 18-20 resource and process applications");
route(["chemistry_materials"], SOURCE_IDS.chemistry, "Web §10.6 Lattice Structures in Crystalline Solids; Chapters 18-20 metals, nonmetals and organic materials");
route(["chemistry_health"], SOURCE_IDS.organic, "Web Chapters 25-28 carbohydrates, proteins, lipids and nucleic acids");
route(["fossil_resource_utilisation"], SOURCE_IDS.organic, "Web Chapters 3, 7 and 15 alkanes, alkenes and aromatic compounds");
route(["energy_resource_systems"], SOURCE_IDS.chemistry, "Web Chapter 5 Thermochemistry; §17.5 Batteries and Fuel Cells; Chapters 18 and 20 resource applications");
route(["pollutant_detection_treatment"], SOURCE_IDS.chemistry, "Web §4.5 Quantitative Chemical Analysis; Chapters 11 and 15 separation, precipitation and solution equilibria");
route(["chemical_rules_safe_use"], SOURCE_IDS.regulation, "第二条（生产、储存、使用、经营和运输的安全管理范围）与第四条（安全第一、预防为主、综合治理）");
route(["energy_forms_conservation", "internal_energy_state"], SOURCE_IDS.chemistry, "Web Chapter 5 Thermochemistry; Chapter 16 Thermodynamics");
route(["electrochemical_corrosion"], SOURCE_IDS.chemistry, "Web §17.6 Corrosion");
route(["reaction_quotient_direction"], SOURCE_IDS.chemistry, "Web §§13.2-13.3 Equilibrium Constants; Shifting Equilibria: Le Châtelier's Principle");
route(["reaction_path_activation"], SOURCE_IDS.chemistry, "Web §§12.5-12.7 Collision Theory; Reaction Mechanisms; Catalysis");
route(["industrial_condition_optimisation"], SOURCE_IDS.chemistry, "Web §12.7 Catalysis; §13.3 Shifting Equilibria: Le Châtelier's Principle");
route(["aqueous_electrolyte_systems"], SOURCE_IDS.chemistry, "Web §11.2 Electrolytes; Chapters 14-15 aqueous acid-base and solubility equilibria");
route(["water_ionisation_ph"], SOURCE_IDS.chemistry, "Web Chapter 14, water autoionisation, pH and pOH");
route(["salt_hydrolysis"], SOURCE_IDS.chemistry, "Web Chapter 14, acid-base properties and hydrolysis of salt solutions");
route(["aqueous_equilibrium_applications"], SOURCE_IDS.chemistry, "Web Chapters 14-15 acid-base, buffer, precipitation and complex-ion equilibria");
route(["quantised_levels_transitions"], SOURCE_IDS.chemistry, "Web §§6.1-6.3 Electromagnetic Energy; The Bohr Model; Development of Quantum Theory");
route(["structure_measurement", "spectroscopy_xrd_methods"], SOURCE_IDS.chemistry, "Web §10.6 Lattice Structures in Crystalline Solids; X-ray diffraction");
addRoute("structure_measurement", SOURCE_IDS.organic, "Web Chapters 12-14 mass spectrometry, infrared, nuclear magnetic resonance and ultraviolet spectroscopy");
addRoute("spectroscopy_xrd_methods", SOURCE_IDS.organic, "Web Chapters 12-14 mass spectrometry, infrared, nuclear magnetic resonance and ultraviolet spectroscopy");
route(["molecular_polarity_chirality"], SOURCE_IDS.organic, "Web Chapter 2 Polar Covalent Bonds; Chapter 5 Stereochemistry at Tetrahedral Centers");
route(["transitional_mixed_crystals", "aggregation_state_materials"], SOURCE_IDS.chemistry, "Web §§10.1-10.6 intermolecular forces, states of matter, phase behaviour and crystal structures");
route(["structure_guided_material_design"], SOURCE_IDS.chemistry, "Web Chapters 7 and 10 bonding, molecular geometry, intermolecular forces and crystal structures");
route(["structure_methods_life_science"], SOURCE_IDS.organic, "Web Chapters 12-14 structure determination; Chapters 25-28 biomolecular structure");
route(["functional_group_properties_conversion"], SOURCE_IDS.organic, "Web Chapters 6-24 reaction families and functional-group interconversions");
route(["functional_group_tests"], SOURCE_IDS.organic, "Web Chapters 12-14 spectroscopic identification; Chapters 17-24 characteristic functional-group reactions");
route(["organic_synthesis_routes"], SOURCE_IDS.organic, "Web Chapters 6-24 reaction mechanisms, carbon-skeleton construction and functional-group interconversions");
route(["organic_safety_green_synthesis"], SOURCE_IDS.chemistry, "Web §1.1 Chemistry in Context; §4.4 Reaction Yields; Chapter 16 Thermodynamics");
route(["polymer_monomer_repeat_unit", "synthetic_polymers_materials"], SOURCE_IDS.organic, "Web Chapter 31 Synthetic Polymers");
route(["carbohydrates"], SOURCE_IDS.organic, "Web Chapter 25 Biomolecules: Carbohydrates");
route(["dna_rna"], SOURCE_IDS.organic, "Web Chapter 28 Biomolecules: Nucleic Acids");

const TOPIC_GROUPS = [
  ["foundations", "Foundations of chemical science", "化学科学基础", ["chemical_science_scope", "substance_classification_conversion", "colloidal_dispersions"]],
  ["redox_ions", "Redox and ions", "氧化还原与离子", ["element_valence_conversion", "oxidising_reducing_agents", "electrolyte_ionisation"]],
  ["ionic_analysis", "Ionic reactions and analysis", "离子反应与分析", ["ionic_reaction_conditions", "common_ion_tests", "sodium_compounds"]],
  ["inorganic_elements", "Important inorganic elements", "重要无机元素", ["iron_compounds", "nitrogen_compounds", "sulfur_compounds"]],
  ["inorganic_stse", "Inorganic conversion and impact", "无机转化及社会影响", ["inorganic_conversion_pathways", "inorganic_stse_value", "fuel_battery_evaluation"]],
  ["organic_intro", "Organic chemistry and resources", "有机化学与资源", ["organic_synthesis_value", "intro_macromolecule_applications", "fossil_resource_utilisation"]],
  ["sustainability", "Sustainable chemistry", "可持续化学", ["chemistry_sustainable_development", "green_chemistry_principles", "clean_production_circularity"]],
  ["chemistry_society", "Chemistry, materials and health", "化学、材料与健康", ["chemistry_materials", "chemistry_health", "energy_resource_systems"]],
  ["environment_safety", "Environment and chemical rules", "环境与化学规则", ["pollutant_detection_treatment", "chemical_rules_safe_use"]],
  ["thermo_electrochem", "Thermodynamics and electrochemistry", "热力学与电化学", ["internal_energy_state", "energy_forms_conservation", "electrochemical_corrosion"]],
  ["equilibrium_kinetics", "Equilibrium and kinetics in production", "平衡、动力学与生产", ["reaction_quotient_direction", "industrial_condition_optimisation", "aqueous_electrolyte_systems"]],
  ["aqueous_chemistry", "Aqueous equilibria", "水溶液平衡", ["water_ionisation_ph", "salt_hydrolysis", "aqueous_equilibrium_applications"]],
  ["atomic_structure_methods", "Atomic structure and measurement", "原子结构与测定", ["quantised_levels_transitions", "spectroscopy_xrd_methods"]],
  ["materials_structure", "Structure of materials", "材料结构", ["transitional_mixed_crystals", "aggregation_state_materials", "structure_guided_material_design"]],
  ["structure_applications", "Structure and functional groups", "结构与官能团", ["structure_methods_life_science", "functional_group_properties_conversion", "functional_group_tests"]],
  ["organic_design", "Organic synthesis and polymer structure", "有机合成与聚合物结构", ["organic_synthesis_routes", "organic_safety_green_synthesis", "polymer_monomer_repeat_unit"]],
  ["biomolecules_polymers", "Biomolecules and polymers", "生物大分子与高分子", ["carbohydrates", "dna_rna", "synthetic_polymers_materials"]],
];

const EDGE_SPECS = [
  ["substance_classification_conversion", "inorganic_conversion_pathways", "设计无机物转化路径前需要先能按组成和性质分类物质。"],
  ["element_valence_conversion", "oxidising_reducing_agents", "判断氧化剂和还原剂需要先分析元素价态及其变化方向。"],
  ["electrolyte_ionisation", "ionic_reaction_conditions", "判断离子反应发生条件需要先识别电解质产生的溶液离子。"],
  ["ionic_reaction_conditions", "common_ion_tests", "设计离子检验需要先掌握特征离子反应及其发生条件。"],
  ["inorganic_conversion_pathways", "inorganic_stse_value", "评价无机化工的价值与影响需要先理解物质转化路径。"],
  ["green_chemistry_principles", "clean_production_circularity", "清洁生产和循环利用方案建立在绿色化学的原料、过程与废物原则上。"],
  ["internal_energy_state", "energy_forms_conservation", "分析化学能的转化和守恒需要先明确体系内能及其状态依赖。"],
  ["aqueous_electrolyte_systems", "water_ionisation_ph", "使用水的离子积和 pH 前需要先建立电解质水溶液的平衡模型。"],
  ["aqueous_electrolyte_systems", "salt_hydrolysis", "解释盐类水解需要先能分析溶液中的离子和电离平衡。"],
  ["water_ionisation_ph", "aqueous_equilibrium_applications", "综合应用水溶液平衡需要先能表示溶液酸碱性和水的电离。"],
  ["salt_hydrolysis", "aqueous_equilibrium_applications", "利用离子平衡解决物质转化问题需要先掌握盐类水解。"],
  ["aggregation_state_materials", "structure_guided_material_design", "用结构指导材料设计需要先理解微粒作用和聚集状态如何决定材料性质。"],
  ["functional_group_properties_conversion", "functional_group_tests", "选择官能团检验需要先掌握其特征性质、相互影响和转化。"],
  ["organic_synthesis_value", "organic_synthesis_routes", "比较具体合成路线前需要理解有机合成通过结构转化创造物质的基本价值。"],
  ["organic_synthesis_routes", "organic_safety_green_synthesis", "评价合成方案的安全性和绿色程度需要先能读懂并比较反应路线。"],
  ["polymer_monomer_repeat_unit", "synthetic_polymers_materials", "比较合成高分子材料需要先能从聚合物结构识别单体、链节和聚合方式。"],
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
const sharedNodeKey = (key) => key === "structure_measurement" ? "spectroscopy_xrd_methods" : key;
const sharedConceptDetails = {
  spectroscopy_xrd_methods: {
    name: "Spectroscopic and X-ray structure determination",
    nameZh: "光谱与晶体 X 射线结构测定",
    description: "说明原子光谱、分子光谱和晶体 X 射线衍射提供的结构信息，并用这些信息支持物质结构模型。",
  },
};
for (const candidate of gaps.candidates) {
  const key = gapKey(candidate.gap_id);
  const secondaryRefs = EVIDENCE.get(key);
  let resolution;
  if (PURE_REUSE[key]) {
    resolution = {
      gap_id: candidate.gap_id,
      resolution_action: "reuse_existing",
      canonical_ids: PURE_REUSE[key],
      created_node_ids: [],
      practice_ids: [],
      rationale_zh: "逐项定义复核确认现有 canonical 概念组合已完整覆盖该诊断结果；不创建捆绑式包装概念或一对多伪 alias。",
      evidence_refs: uniqueEvidence([...candidate.evidence_refs, ...secondaryRefs]),
      review_status: "needs_review",
    };
  } else {
    const nodeKey = sharedNodeKey(key);
    const nodeId = nodeIdFor(nodeKey);
    const canonicalId = canonicalIdFor(nodeId);
    const existingNode = createdNodes.find((node) => node.id === nodeId);
    if (existingNode) {
      existingNode.evidence_refs = uniqueEvidence([
        ...existingNode.evidence_refs,
        ...candidate.evidence_refs,
        ...secondaryRefs,
      ]);
    } else {
      const details = sharedConceptDetails[nodeKey];
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
    resolution = {
      gap_id: candidate.gap_id,
      resolution_action: "add_or_alias_concepts",
      canonical_ids: unique([...(candidate.existing_canonical_ids ?? []), canonicalId]),
      created_node_ids: [nodeId],
      practice_ids: [],
      rationale_zh: "现有统一 KG 只覆盖上位概念或部分边界，不能独立诊断该课标结果；新增窄粒度稳定概念并保留相关 canonical 映射。",
      evidence_refs: uniqueEvidence([...candidate.evidence_refs, ...secondaryRefs]),
      review_status: "needs_review",
    };
  }
  resolutions.push(resolution);
  resolutionByGapId.set(candidate.gap_id, resolution);
}

const createdByKey = new Map(createdNodes.map((node) => [node.id.replace(/^cn_sh_chem_/, ""), node]));
const topicNodes = [];
const groupedNodeIds = new Set();
for (const [index, [topicKey, name, nameZh, conceptKeys]] of TOPIC_GROUPS.entries()) {
  const topicId = `cn_sh_chem_topic_${topicKey}`;
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
  subject: "Chemistry",
  jurisdictions: ["CN"],
  source_ids: unique(createdNodes.flatMap((node) => node.evidence_refs.map((ref) => ref.source_id))),
  review_status: "needs_review",
  changelog: [{
    version: "0.1.0",
    date: TODAY,
    summary_zh: "依据中国普通高中化学成果级覆盖审查，新增最小可诊断概念、复用稳定 canonical 组合，并补齐第二类权威证据。",
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
    summary_zh: "应用全库定义复核与缺口解析：108 项知识成果闭合为 full，30 项实验、证据、模型或安全实践保持 excluded。",
  });
}

const resolutionSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  resolution_set_id: "cgr_cn_moe_senior_high_chemistry_2020_outcomes",
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
    summary_zh: "完成 57 项化学知识缺口逐项定义复核、稳定 ID 复用、新概念建立和双来源证据绑定。",
  }],
  resolutions,
};

const counts = resolutions.reduce((result, resolution) => {
  result[resolution.resolution_action] = (result[resolution.resolution_action] ?? 0) + 1;
  return result;
}, {});
const edgeTargets = new Set(edges.map((edge) => edge.to));
const rootConcepts = createdNodes.filter((node) => !edgeTargets.has(node.id));
const reviewLines = [
  "# 中国高中化学 KG 缺口实施复核（中文）",
  "",
  `- 复核日期：${TODAY}`,
  `- 缺口解析：${resolutions.length} 项`,
  `- 直接复用现有 canonical 组合：${counts.reuse_existing ?? 0} 项`,
  `- 需要新增或补充稳定概念的成果：${counts.add_or_alias_concepts ?? 0} 项`,
  `- 新图：${createdNodes.length} 个 Concept，${topicNodes.length} 个 Topic，${edges.length} 条待审先修边`,
  "- 状态：全部保持 `needs_review`；本轮是 AI 语义复核，不伪造人工批准。",
  "",
  "## 关键纠错",
  "",
  "1. 7 项原缺口实际可由现有 canonical 概念组合完整覆盖，已改为直接复用，未创建一对多伪 alias。",
  "2. 删除脚本从课标 5.5 额外推导出的‘化学品风险评估’成果；原文只支持化学应用法律法规与规则意识。",
  "3. ‘分子结构测定方法’和‘光谱与 X 射线衍射’是同一知识边界的两种学业表现，共享一个 canonical 概念。",
  "4. ‘氧化数’不等于‘元素价态与物质转化’，‘酸碱理论’不等于完整‘电解质水溶液体系’；部分覆盖仍保留独立诊断概念。",
  "5. 结构测定同时绑定 Chemistry 2e 的 X 射线衍射章节与 Organic Chemistry 的波谱章节；规则意识改用国家行政法规库条款。",
  "6. OpenStax 当前页面有额外的大模型摄入限制；仓库只保存元数据、校验值和章节定位，不保存或摄入教材正文。",
  `7. 逐项检查 ${rootConcepts.length} 个根概念：它们是主题入口或依赖统一 KG 中已复用概念；没有把课标排列顺序伪造成学理先修边。`,
  "",
  "## 逐项解析",
  "",
  "| # | 原缺口 | 动作 | canonical IDs | 新节点 | 第二来源 |",
  "|---:|---|---|---|---|---|",
];
for (const [index, candidate] of gaps.candidates.entries()) {
  const key = gapKey(candidate.gap_id);
  const resolution = resolutionByGapId.get(candidate.gap_id);
  const canonicalText = resolution.canonical_ids.map((id) => `\`${id}\``).join("<br>");
  const nodeText = resolution.created_node_ids.map((id) => `\`${id}\``).join("<br>") || "—";
  const sourceText = EVIDENCE.get(key).map((ref) => `${ref.source_id}：${ref.locator}`).join("<br>");
  reviewLines.push(`| ${index + 1} | ${candidate.proposed_name_zh} | \`${resolution.resolution_action}\` | ${canonicalText} | ${nodeText} | ${sourceText} |`);
}
reviewLines.push(
  "",
  "## 自动门禁",
  "",
  "- 57 个 gap_id 必须各解析一次；108 个知识成果必须为 full，30 个实践成果必须为 excluded。",
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

process.stdout.write(`[apply-cn-chemistry-resolutions] ${resolutions.length} gaps: ${counts.reuse_existing ?? 0} reuse, ${counts.add_or_alias_concepts ?? 0} add resolutions; ${createdNodes.length} graph concepts, ${topicNodes.length} topics, ${edges.length} edges\n`);
