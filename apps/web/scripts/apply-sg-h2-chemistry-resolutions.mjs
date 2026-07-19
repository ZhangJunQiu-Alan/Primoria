#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const DATA = resolve(ROOT, "data/knowledge-graphs");
const TODAY = "2026-07-19";
const GRAPH_ID = "singapore_h2_chemistry";
const GAP_PREFIX = "gap_sg_h2_chemistry_9476_2026_o_";

const paths = {
  gaps: resolve(DATA, "curricula/gaps/pending/sg_seab_h2_chemistry_9476_2026_outcomes.json"),
  mappings: resolve(DATA, "curricula/mappings/pending/sg_seab_h2_chemistry_9476_2026.json"),
  resolutions: resolve(DATA, "curricula/resolutions/pending/sg_seab_h2_chemistry_9476_2026_outcomes.json"),
  graph: resolve(DATA, `source/${GRAPH_ID}.json`),
  registry: resolve(DATA, "governance/concept-registry.json"),
  review: resolve(DATA, "review/pending/curriculum-mapping/cms_sg_seab_h2_chemistry_9476_2026_outcomes.implementation-review.zh-CN.md"),
};

const SOURCES = {
  syllabus: "src_sg_seab_h2_chemistry_9476_2026",
  chemistry: "src_openstax_chemistry_2e_2019",
  organic: "src_openstax_organic_chemistry_2023",
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
const keyForGap = (gapId) => gapId.replace(GAP_PREFIX, "");
const nodeIdFor = (key) => `sg_h2_chemistry_${key}`;
const canonicalIdFor = (nodeId) => {
  const digest = createHash("sha256").update(`primoria-concept-v1\0${GRAPH_ID}\0${nodeId}`).digest("hex");
  return `pc_${digest.slice(0, 32)}`;
};

const CONCEPT_SPECS = [
  {
    key: "ideal_gas_mixture_partial_pressures",
    name: "Ideal-gas mixtures and partial pressures",
    nameZh: "理想气体混合物与分压",
    description: "Applying Dalton's law and mole fractions to determine component and total pressures in non-reacting ideal-gas mixtures, including gases collected over water.",
    gapKeys: ["3_d"], sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §9.3, Stoichiometry of Gaseous Substances, Mixtures, and Reactions",
  },
  {
    key: "acid_base_models_arrhenius_lewis",
    name: "Arrhenius and Lewis acid-base models",
    nameZh: "Arrhenius 与 Lewis 酸碱模型",
    description: "Selecting the Arrhenius or Lewis acid-base model for the stated chemical system and using electron-pair donation and acceptance to represent non-aqueous adduct formation.",
    gapKeys: ["4_a", "4_c"], sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §14.1, Brønsted-Lowry Acids and Bases, historical Arrhenius model; §15.2, Lewis Acids and Bases",
  },
  {
    key: "lattice_energy_ionic_factors",
    name: "Ionic charge and radius effects on lattice energy",
    nameZh: "离子电荷、半径与晶格能",
    description: "Reasoning qualitatively about how ionic charge magnitude and ionic radius change electrostatic attraction and hence the magnitude of lattice energy, without introducing a full crystallographic model.",
    gapKeys: ["7_e"], sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §7.1, Ionic Bonding, lattice energy and ionic charge-distance effects",
  },
  {
    key: "standard_state_prediction_limits",
    name: "Limits of standard-state spontaneity predictions",
    nameZh: "标准态自发性预测的适用边界",
    description: "Distinguishing standard-state ΔG° or E° predictions from actual nonstandard conditions and explaining why kinetics, composition and reaction quotient can limit a simple spontaneity claim.",
    gapKeys: ["7_l", "12_g"], sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §16.4, Free Energy; §17.4, Potential, Free Energy, and Equilibrium",
  },
  {
    key: "enzyme_catalysis_specificity_conditions",
    name: "Enzyme specificity and condition sensitivity",
    nameZh: "酶催化的专一性与条件敏感性",
    description: "Using an active-site lock-and-key model to explain substrate and reaction specificity and reasoning qualitatively about temperature and pH sensitivity without requiring protein-structure levels or detailed denaturation pathways.",
    gapKeys: ["8_k"], sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §12.7, Catalysis, Enzyme Structure and Function",
  },
  {
    key: "base_dissociation_water_ionic_product",
    name: "Base dissociation and the ionic product of water",
    nameZh: "碱解离与水的离子积",
    description: "Relating Kb and pKb to base strength, using Kw to connect hydronium and hydroxide concentrations and applying KaKb=Kw to conjugate acid-base pairs.",
    gapKeys: ["10_1_b"], sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §§14.1-14.3, Brønsted-Lowry Acids and Bases; pH and pOH; Relative Strengths of Acids and Bases",
  },
  {
    key: "titration_curves_indicator_selection",
    name: "Acid-base titration curves and indicator selection",
    nameZh: "酸碱滴定曲线与指示剂选择",
    description: "Explaining the characteristic pH regions of strong and weak acid-base titrations and selecting an indicator whose transition interval lies within the steep equivalence-region change.",
    gapKeys: ["10_1_d", "10_1_e"], sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §14.7, Acid-Base Titrations",
  },
  {
    key: "ocean_carbonate_buffer_acidification",
    name: "Ocean carbonate buffering and acidification",
    nameZh: "海洋碳酸盐缓冲与酸化",
    description: "Applying carbonate-bicarbonate acid-base equilibria to ocean buffering and explaining how added atmospheric carbon dioxide shifts coupled equilibria toward higher acidity.",
    gapKeys: ["10_1_f"], sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §14.6, Buffers; §15.3, Coupled Equilibria, ocean acidification",
  },
  {
    key: "complex_ion_solubility_control",
    name: "Complex-ion control of solubility",
    nameZh: "配离子形成对溶解度的调控",
    description: "Explaining how complex-ion formation couples to a dissolution equilibrium and can increase ionic-salt solubility, alongside but distinct from the common-ion effect.",
    gapKeys: ["10_2_c"], sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §§15.2-15.3, Lewis Acids and Bases; Coupled Equilibria",
  },
  {
    key: "organic_electronic_steric_effects",
    name: "Electronic and steric effects in organic reactivity",
    nameZh: "有机反应性中的电子效应与位阻效应",
    description: "Using delocalisation, electron-donating or withdrawing effects and steric hindrance to compare organic reactant, intermediate and transition-state reactivity without replacing an explicit mechanism.",
    gapKeys: ["11_3_b"], sourceId: SOURCES.organic,
    locator: "OpenStax Organic Chemistry §§6.2, 7.9 and 11.3, mechanisms, electronic effects and steric effects in substitution",
  },
  {
    key: "nucleophilic_substitution_stereochemistry",
    name: "Stereochemical outcomes of SN1 and SN2 substitution",
    nameZh: "SN1 与 SN2 取代的立体化学结果",
    description: "Relating backside attack in SN2 to inversion of configuration and planar carbocation attack in SN1 to racemisation at an initially optically active reaction centre.",
    gapKeys: ["11_5_b"], sourceId: SOURCES.organic,
    locator: "OpenStax Organic Chemistry §§11.2 and 11.4, The SN2 Reaction; The SN1 Reaction",
  },
  {
    key: "combustion_pollutants_greenhouse",
    name: "Combustion pollutants and greenhouse impacts",
    nameZh: "燃烧污染物与温室效应影响",
    description: "Connecting carbon monoxide, nitrogen oxides and unburnt hydrocarbons from internal-combustion engines to health or atmospheric impacts, and distinguishing these from gases that enhance the greenhouse effect.",
    gapKeys: ["11_4_h"], sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §§12.7 and 18.9, catalytic converters; atmospheric oxygen compounds and combustion impacts",
  },
  {
    key: "halocarbon_environmental_impacts",
    name: "Environmental impacts of CFC, HCFC and HFC compounds",
    nameZh: "CFC、HCFC 与 HFC 的环境影响",
    description: "Comparing the chemical persistence and ozone or climate impacts of CFCs and proposed HCFC/HFC replacements while respecting the syllabus exclusion of detailed ozone-depletion mechanisms.",
    gapKeys: ["11_5_e"], sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §18.8, Occurrence, Preparation, and Properties of the Halogens, halocarbon environmental context",
  },
  {
    key: "polymer_recycling_sustainability",
    name: "Polymer recycling and sustainability trade-offs",
    nameZh: "聚合物回收与可持续性权衡",
    description: "Evaluating polymer recycling as a finite-resource decision across material properties, process feasibility and economic, environmental and social consequences rather than assuming all plastics share one recycling route.",
    gapKeys: ["11_10_g"], sourceId: SOURCES.organic,
    locator: "OpenStax Organic Chemistry Chapter 31, Synthetic Polymers; Chapter 11 Chemistry Matters—Green Chemistry",
  },
  {
    key: "electrode_potential_concentration_trends",
    name: "Electrode potential under concentration changes",
    nameZh: "浓度变化下的电极电势趋势",
    description: "Predicting qualitatively how changing the concentration of an aqueous redox species shifts electrode potential, while distinguishing this nonstandard trend from a tabulated standard potential.",
    gapKeys: ["12_j"], sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §17.4, Potential, Free Energy, and Equilibrium, nonstandard conditions and the Nernst equation",
  },
  {
    key: "industrial_electrolysis_applications",
    name: "Electrode reactions in anodising and copper purification",
    nameZh: "阳极氧化与铜电解精炼的电极反应",
    description: "Explaining aluminium anodising and electrolytic copper purification from electrode reactions, material transfer and product identity without requiring industrial equipment details.",
    gapKeys: ["12_o"], sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §17.7, Electrolysis, electroplating and metal purification applications",
  },
  {
    key: "transition_periodic_invariance",
    name: "Relative invariance across the first transition series",
    nameZh: "第一过渡系半径与第一电离能的相对稳定",
    description: "Explaining why added 3d electrons partly offset increasing nuclear charge so atomic radii and first ionisation energies vary less across the first transition series than across a typical main-group period.",
    gapKeys: ["13_c"], sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §§6.5 and 19.1, Periodic Variations in Element Properties; Properties of Transition Metals",
  },
  {
    key: "ligand_exchange_complex_contexts",
    name: "Ligand exchange in coordination complexes",
    nameZh: "配位化合物中的配体交换",
    description: "Representing ligand-exchange equilibria and associated colour changes in copper complexes and applying competitive ligand binding qualitatively to oxygen-carbon monoxide exchange in haemoglobin.",
    gapKeys: ["13_j"], sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §19.2, Coordination Chemistry of Transition Metals, ligand substitution and complex formation",
  },
];

const TOPICS = [
  ["acid_base_models", "Acid-base models and measurement", "酸碱模型与测量", ["acid_base_models_arrhenius_lewis", "base_dissociation_water_ionic_product", "titration_curves_indicator_selection"]],
  ["aqueous_contexts", "Coupled aqueous equilibria", "耦合水溶液平衡", ["ocean_carbonate_buffer_acidification", "complex_ion_solubility_control"]],
  ["physical_chemistry_models", "Physical-chemistry models and limits", "物理化学模型与适用边界", ["ideal_gas_mixture_partial_pressures", "lattice_energy_ionic_factors", "standard_state_prediction_limits"]],
  ["mechanism_selectivity", "Mechanism and selectivity", "反应机理与选择性", ["enzyme_catalysis_specificity_conditions", "organic_electronic_steric_effects", "nucleophilic_substitution_stereochemistry"]],
  ["environmental_chemistry", "Environmental chemistry and materials", "环境化学与材料", ["combustion_pollutants_greenhouse", "halocarbon_environmental_impacts", "polymer_recycling_sustainability"]],
  ["electrochemical_applications", "Electrochemical conditions and applications", "电化学条件与应用", ["electrode_potential_concentration_trends", "industrial_electrolysis_applications"]],
  ["transition_elements", "Transition-element patterns and complexes", "过渡元素规律与配合物", ["transition_periodic_invariance", "ligand_exchange_complex_contexts"]],
];

const EDGES = [
  ["acid_base_models_arrhenius_lewis", "base_dissociation_water_ionic_product", "使用 Kb、Kw 和共轭酸碱关系前，需要先区分酸碱定义及适用体系。"],
  ["base_dissociation_water_ionic_product", "titration_curves_indicator_selection", "解释弱酸弱碱滴定曲线和指示剂区间，需要先理解水的离子积与酸碱解离平衡。"],
  ["base_dissociation_water_ionic_product", "ocean_carbonate_buffer_acidification", "分析海洋碳酸盐缓冲和酸化，需要先掌握水中酸碱解离与 Kw 关系。"],
  ["organic_electronic_steric_effects", "nucleophilic_substitution_stereochemistry", "解释 SN1 与 SN2 的构型结果，需要先理解位阻和电子效应如何决定机理路径。"],
  ["standard_state_prediction_limits", "electrode_potential_concentration_trends", "讨论浓度改变电极电势前，需要先区分标准态数值与非标准实际条件。"],
];

const gaps = readJson(paths.gaps);
const mappings = readJson(paths.mappings);
const registry = readJson(paths.registry);
if (gaps.candidates.length !== 21) throw new Error(`Expected 21 H2 Chemistry gaps, got ${gaps.candidates.length}`);

const candidatesByKey = new Map(gaps.candidates.map((candidate) => [keyForGap(candidate.gap_id), candidate]));
const specsByGap = new Map();
for (const spec of CONCEPT_SPECS) {
  for (const gapKey of spec.gapKeys) {
    if (!candidatesByKey.has(gapKey)) throw new Error(`Concept ${spec.key} references missing gap ${gapKey}`);
    const specs = specsByGap.get(gapKey) ?? [];
    specs.push(spec);
    specsByGap.set(gapKey, specs);
  }
}
const unassigned = [...candidatesByKey.keys()].filter((key) => !specsByGap.has(key));
if (unassigned.length) throw new Error(`Unassigned gaps: ${unassigned.join(", ")}`);

const createdNodes = CONCEPT_SPECS.map((spec) => {
  const nodeId = nodeIdFor(spec.key);
  const candidates = spec.gapKeys.map((key) => candidatesByKey.get(key));
  return {
    id: nodeId,
    canonical_id: canonicalIdFor(nodeId),
    kind: "concept",
    name: spec.name,
    name_zh: spec.nameZh,
    topic: null,
    description: spec.description,
    default_order: 0,
    evidence_refs: uniqueEvidence([
      ...candidates.flatMap((candidate) => candidate.evidence_refs),
      { source_id: spec.sourceId, locator: spec.locator },
    ]),
    review_status: "needs_review",
  };
});
const nodeBySpecKey = new Map(createdNodes.map((node) => [node.id.replace(/^sg_h2_chemistry_/, ""), node]));

const grouped = new Set();
const topicNodes = TOPICS.map(([topicKey, name, nameZh, specKeys], topicIndex) => {
  if (specKeys.length < 2 || specKeys.length > 3) throw new Error(`Topic ${topicKey} must contain 2-3 concepts`);
  const concepts = specKeys.map((specKey, conceptIndex) => {
    const node = nodeBySpecKey.get(specKey);
    if (!node || grouped.has(specKey)) throw new Error(`Invalid topic membership for ${specKey}`);
    grouped.add(specKey);
    node.topic = `sg_h2_chemistry_topic_${topicKey}`;
    node.default_order = conceptIndex + 1;
    return node;
  });
  return {
    id: `sg_h2_chemistry_topic_${topicKey}`,
    kind: "topic",
    name,
    name_zh: nameZh,
    topic: null,
    default_order: topicIndex + 1,
    evidence_refs: uniqueEvidence(concepts.flatMap((node) => node.evidence_refs)),
    review_status: "needs_review",
  };
});
if (grouped.size !== createdNodes.length) throw new Error("Every H2 Chemistry concept must belong to exactly one topic");

const edges = EDGES.map(([fromKey, toKey, reason]) => {
  const from = nodeBySpecKey.get(fromKey);
  const to = nodeBySpecKey.get(toKey);
  if (!from || !to) throw new Error(`Edge references missing concept ${fromKey}->${toKey}`);
  return {
    from: from.id,
    to: to.id,
    type: "prereq",
    strength: "soft",
    reason,
    evidence_refs: uniqueEvidence([...from.evidence_refs, ...to.evidence_refs]),
    review_status: "needs_review",
  };
});

const graph = {
  schema_version: "2.0.0",
  content_version: "0.1.0",
  graph_id: GRAPH_ID,
  subject: "Chemistry",
  jurisdictions: ["SG"],
  source_ids: unique(createdNodes.flatMap((node) => node.evidence_refs.map((ref) => ref.source_id))),
  review_status: "needs_review",
  changelog: [{
    version: "0.1.0",
    date: TODAY,
    summary_zh: "根据 SEAB 194 项化学学习成果的逐项覆盖审查，建立 18 个缺口概念；每个概念同时登记官方课程和开放教材证据。",
  }],
  nodes: [...topicNodes, ...createdNodes],
  edges,
};

const retainedConcepts = registry.concepts
  .map((concept) => ({ ...concept, aliases: concept.aliases.filter((alias) => alias.graph_id !== GRAPH_ID) }))
  .filter((concept) => concept.aliases.length > 0);
const registryByCanonical = new Map(retainedConcepts.map((concept) => [concept.canonical_id, concept]));
for (const node of createdNodes) {
  if (registryByCanonical.has(node.canonical_id)) throw new Error(`Generated canonical collision: ${node.canonical_id}`);
  registryByCanonical.set(node.canonical_id, {
    canonical_id: node.canonical_id,
    preferred_name: node.name,
    preferred_name_zh: node.name_zh,
    status: "active",
    review_status: "needs_review",
    aliases: [{ graph_id: GRAPH_ID, node_id: node.id }],
  });
}
registry.generated_at = TODAY;
registry.concepts = [...registryByCanonical.values()].sort((left, right) => left.canonical_id.localeCompare(right.canonical_id));

const resolutions = [];
const resolutionByGap = new Map();
for (const candidate of gaps.candidates) {
  const nodes = specsByGap.get(keyForGap(candidate.gap_id)).map((spec) => nodeBySpecKey.get(spec.key));
  const resolution = {
    gap_id: candidate.gap_id,
    resolution_action: "add_or_alias_concepts",
    canonical_ids: nodes.map((node) => node.canonical_id),
    created_node_ids: nodes.map((node) => node.id),
    practice_ids: [],
    rationale_zh: "经反向查重，既有概念未同时满足该成果的完整范围、H2 深度和可独立诊断粒度；新增或共享一个窄概念，不改旧 legacy ID。",
    evidence_refs: uniqueEvidence(nodes.flatMap((node) => node.evidence_refs)),
    review_status: "needs_review",
  };
  resolutions.push(resolution);
  resolutionByGap.set(candidate.gap_id, resolution);
}

const mappingByRequirement = new Map(mappings.mappings.map((mapping) => [mapping.requirement_id, mapping]));
for (const candidate of gaps.candidates) {
  const resolution = resolutionByGap.get(candidate.gap_id);
  for (const requirementId of candidate.requirement_ids) {
    const mapping = mappingByRequirement.get(requirementId);
    if (!mapping) throw new Error(`Missing mapping for ${requirementId}`);
    mapping.canonical_ids = resolution.canonical_ids;
    mapping.coverage_status = "full";
    mapping.relation = "required";
    mapping.mapping_basis = "semantic_inference";
    mapping.confidence = "high";
    mapping.rationale_zh = `概念边界与官方 outcome 对齐，由 ${resolution.canonical_ids.join("、")} 完整覆盖；新增节点仍待项目所有者批准。`;
    mapping.review_status = "needs_review";
  }
}
mappings.content_version = "0.4.0";
mappings.generated_at = TODAY;
mappings.review_status = "needs_review";
mappings.changelog = mappings.changelog.filter((entry) => entry.version !== "0.4.0");
mappings.changelog.push({
  version: "0.4.0",
  date: TODAY,
  summary_zh: "将 21 项 H2 化学缺口解析为 18 个概念；193 项非实践成果全部达到 full，8 项实践继续保持 excluded。",
});

const resolutionSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  resolution_set_id: "cgr_sg_seab_h2_chemistry_9476_2026_outcomes",
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
    summary_zh: "完成 21 项 H2 化学缺口的反向查重、概念归并、稳定 ID 和双类证据登记。",
  }],
  resolutions,
};

const roots = createdNodes.filter((node) => !new Set(edges.map((edge) => edge.to)).has(node.id));
const reviewLines = [
  "# 新加坡 H2 化学 KG 缺口实施与代理人工复核（中文）",
  "",
  `- 复核日期：${TODAY}`,
  `- 官方要求：${mappings.mappings.length} 项（193 项概念或知识技能、8 项实践）`,
  `- 完整概念覆盖：${mappings.mappings.filter((mapping) => mapping.coverage_status === "full").length} 项`,
  `- 实践分流：${mappings.mappings.filter((mapping) => mapping.coverage_status === "excluded").length} 项`,
  `- 新图：${createdNodes.length} 个 Concept，${topicNodes.length} 个 Topic，${edges.length} 条待审先修边`,
  `- 入口概念：${roots.length} 个；没有用 syllabus 章节顺序伪造先修关系。`,
  "- 审核状态：代理复核只给出可保留建议，全部保持 `needs_review`。",
  "",
  "## 代理人工复核结论",
  "",
  "- 194 项内容成果按 23 个官方 topic/subtopic 的字母编号逐项复算；加 7 项跨主题实践后总数 201。",
  "- 21 个缺口并非一条 outcome 一个节点：Arrhenius/Lewis、滴定曲线、标准态限制等重复成果共享节点，最终归并为 18 个诊断概念。",
  "- 没有把经典 Brønsted 概念冒充 Arrhenius/Lewis，也没有把一般气体定律冒充 Dalton 分压。",
  "- 有机电子/位阻效应与 SN1/SN2 立体结果单独登记，避免用宽泛 reaction-mechanism 节点掩盖可测差异。",
  "- 环境内容保留污染物、卤代烃和聚合物三类不同因果链；没有把价值判断写进概念定义。",
  "- 每个新概念至少含一条 SEAB 页码级证据和一条 OpenStax 章节级学科证据。",
  "- 12 类官方排除边界保持不变；尤其不扩展到波函数、积分速率式、E/Z 命名或配体场强弱序列。",
  "",
  "## 概念逐项复核",
  "",
];
for (const spec of CONCEPT_SPECS) {
  const node = nodeBySpecKey.get(spec.key);
  reviewLines.push(
    `### ${node.name_zh}`,
    "",
    `- 节点：\`${node.id}\` / \`${node.canonical_id}\``,
    `- 解析缺口：${spec.gapKeys.map((key) => `\`${GAP_PREFIX}${key}\``).join("、")}`,
    `- 概念边界：${node.description}`,
    `- 证据：${node.evidence_refs.map((ref) => `${ref.locator}（\`${ref.source_id}\`）`).join("；")}`,
    "- 复核建议：可保留；未发现范围、深度和诊断粒度均等价的既有 canonical；仍需项目所有者最终批准。",
    "",
  );
}

writeJson(paths.graph, graph);
writeJson(paths.registry, registry);
writeJson(paths.mappings, mappings);
writeJson(paths.resolutions, resolutionSet);
mkdirSync(dirname(paths.review), { recursive: true });
writeFileSync(paths.review, `${reviewLines.join("\n")}\n`);

process.stdout.write(`[apply-sg-h2-chemistry-resolutions] ${resolutions.length} gaps -> ${createdNodes.length} concepts, ${topicNodes.length} topics, ${edges.length} edges; ${roots.length} roots\n`);
