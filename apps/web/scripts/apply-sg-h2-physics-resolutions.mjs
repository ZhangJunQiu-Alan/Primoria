#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const DATA = resolve(ROOT, "data/knowledge-graphs");
const TODAY = "2026-07-19";
const GRAPH_ID = "singapore_h2_physics";
const GAP_PREFIX = "gap_sg_h2_physics_9478_2026_o_";

const paths = {
  gaps: resolve(DATA, "curricula/gaps/pending/sg_seab_h2_physics_9478_2026_outcomes.json"),
  mappings: resolve(DATA, "curricula/mappings/pending/sg_seab_h2_physics_9478_2026.json"),
  resolutions: resolve(DATA, "curricula/resolutions/pending/sg_seab_h2_physics_9478_2026_outcomes.json"),
  graph: resolve(DATA, `source/${GRAPH_ID}.json`),
  registry: resolve(DATA, "governance/concept-registry.json"),
  review: resolve(DATA, "review/pending/curriculum-mapping/cms_sg_seab_h2_physics_9478_2026_outcomes.implementation-review.zh-CN.md"),
};

const SOURCES = {
  syllabus: "src_sg_seab_h2_physics_9478_2026",
  collegePhysics: "src_openstax_college_physics_2e_2022",
  universityPhysics2: "src_openstax_university_physics_v2_2016",
  universityPhysics3: "src_openstax_university_physics_v3_2016",
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
const nodeIdFor = (key) => `sg_h2_physics_${key}`;
const canonicalIdFor = (nodeId) => {
  const digest = createHash("sha256").update(`primoria-concept-v1\0${GRAPH_ID}\0${nodeId}`).digest("hex");
  return `pc_${digest.slice(0, 32)}`;
};

const CONCEPT_SPECS = [
  {
    key: "field_lines_equipotential_geometry",
    name: "Field-line and equipotential geometry",
    nameZh: "场线与等势面的几何关系",
    description: "Representing uniform and radial gravitational or electric fields with directed field lines and relating equipotential surfaces to field direction, zero tangential work and perpendicular intersection.",
    gapKeys: ["4_field_lines_equipotentials"],
    sourceId: SOURCES.universityPhysics2,
    locator: "OpenStax University Physics Volume 2 §§5.6 and 7.5, Electric Field Lines; Equipotential Surfaces and Conductors",
    additionalEvidence: [{ source_id: SOURCES.collegePhysics, locator: "OpenStax College Physics 2e §19.4, Equipotential Lines" }],
  },
  {
    key: "crossed_field_velocity_selector",
    name: "Crossed-field velocity selector",
    nameZh: "交叉电磁场速度选择器",
    description: "Deriving the selected speed of a charged particle by balancing electric and magnetic forces in perpendicular fields, with directions checked from charge sign and vector force laws.",
    gapKeys: ["17_crossed_field_velocity_selector"],
    sourceId: SOURCES.collegePhysics,
    locator: "OpenStax College Physics 2e §22.5, Force on a Moving Charge in a Magnetic Field: Examples and Applications",
  },
  {
    key: "wavefunction_probability_superposition",
    name: "Wavefunction probability and superposition",
    nameZh: "波函数概率解释与量子叠加",
    description: "Interpreting |ψ|² as probability density, normalising a one-dimensional wavefunction and applying linear superposition to admissible quantum states without treating ψ itself as a classical material wave.",
    gapKeys: ["19_wavefunction_probability_density", "19_wavefunction_superposition"],
    sourceId: SOURCES.universityPhysics3,
    locator: "OpenStax University Physics Volume 3 §7.1, Wave Functions",
  },
  {
    key: "heisenberg_position_momentum_uncertainty",
    name: "Heisenberg position-momentum uncertainty",
    nameZh: "海森堡位置—动量不确定性",
    description: "Using ΔxΔp ≥ ℏ/2 to reason about limits on simultaneous position and momentum precision while distinguishing intrinsic quantum uncertainty from measurement error or poor apparatus.",
    gapKeys: ["19_heisenberg_uncertainty"],
    sourceId: SOURCES.universityPhysics3,
    locator: "OpenStax University Physics Volume 3 §7.2, The Heisenberg Uncertainty Principle",
  },
  {
    key: "infinite_square_well_states",
    name: "Infinite square-well wavefunctions and energy levels",
    nameZh: "无限深方势阱波函数与能级",
    description: "Applying boundary conditions to one-dimensional stationary wavefunctions and deriving the discrete particle-in-a-box energies, including their dependence on quantum number, mass and well width.",
    gapKeys: ["19_infinite_well_wavefunctions", "19_infinite_well_energy_levels"],
    sourceId: SOURCES.universityPhysics3,
    locator: "OpenStax University Physics Volume 3 §7.4, The Quantum Particle in a Box",
  },
  {
    key: "background_radiation_properties",
    name: "Background radiation and alpha-beta-gamma properties",
    nameZh: "本底辐射与 α、β、γ 辐射性质",
    description: "Distinguishing common background sources and comparing alpha, beta and gamma radiation by composition, charge, ionising power, penetration and deflection, including subtraction of background count from measurements.",
    gapKeys: ["20_background_radiation", "20_alpha_beta_gamma_properties"],
    sourceId: SOURCES.universityPhysics3,
    locator: "OpenStax University Physics Volume 3 §§10.3-10.4, Radioactive Decay; Nuclear Reactions",
  },
  {
    key: "nuclear_equations_conservation",
    name: "Nuclear equations and conservation laws",
    nameZh: "核方程与守恒定律",
    description: "Completing and interpreting nuclear equations by conserving charge and nucleon number and checking energy-momentum conservation, without extending the syllabus to a general particle zoo.",
    gapKeys: ["20_nuclear_equations", "20_nuclear_conservation_laws"],
    sourceId: SOURCES.universityPhysics3,
    locator: "OpenStax University Physics Volume 3 §10.4, Nuclear Reactions; §11.2, Particle Conservation Laws",
  },
  {
    key: "beta_decay_neutrino_inference",
    name: "Neutrino inference from beta decay",
    nameZh: "由 β 衰变守恒缺口推断中微子",
    description: "Explaining why beta-decay energy and momentum observations motivated a neutral, weakly interacting particle and using the neutrino only to close the prescribed conservation argument; antineutrino detail remains outside scope.",
    gapKeys: ["20_neutrino_prediction"],
    sourceId: SOURCES.universityPhysics3,
    locator: "OpenStax University Physics Volume 3 §10.4, Nuclear Reactions; §11.2, Particle Conservation Laws",
  },
];

const TOPICS = [
  ["field_applications", "Field representations and applications", "场的表示与应用", ["field_lines_equipotential_geometry", "crossed_field_velocity_selector"]],
  ["quantum_foundations", "Quantum foundations", "量子物理基础", ["wavefunction_probability_superposition", "heisenberg_position_momentum_uncertainty", "infinite_square_well_states"]],
  ["nuclear_reasoning", "Nuclear radiation and conservation", "核辐射与守恒推理", ["background_radiation_properties", "nuclear_equations_conservation", "beta_decay_neutrino_inference"]],
];

const EDGES = [
  ["wavefunction_probability_superposition", "infinite_square_well_states", "求解无限深方势阱并解释定态概率前，需要先掌握波函数、归一化与概率密度。"],
  ["nuclear_equations_conservation", "beta_decay_neutrino_inference", "从 β 衰变观测缺口推断中微子，需要先能对核方程逐项检查电荷、核子数、能量和动量守恒。"],
];

const gaps = readJson(paths.gaps);
const mappings = readJson(paths.mappings);
const registry = readJson(paths.registry);
if (gaps.candidates.length !== 12) throw new Error(`Expected 12 H2 Physics gaps, got ${gaps.candidates.length}`);

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
  const candidates = spec.gapKeys.map((key) => candidatesByKey.get(key));
  const nodeId = nodeIdFor(spec.key);
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
      ...(spec.additionalEvidence ?? []),
    ]),
    review_status: "needs_review",
  };
});
const nodeBySpecKey = new Map(createdNodes.map((node) => [node.id.replace(/^sg_h2_physics_/, ""), node]));

const grouped = new Set();
const topicNodes = TOPICS.map(([topicKey, name, nameZh, specKeys], topicIndex) => {
  if (specKeys.length < 2 || specKeys.length > 3) throw new Error(`Topic ${topicKey} must contain 2-3 concepts`);
  const concepts = specKeys.map((specKey, conceptIndex) => {
    const node = nodeBySpecKey.get(specKey);
    if (!node) throw new Error(`Topic ${topicKey} references missing concept ${specKey}`);
    if (grouped.has(specKey)) throw new Error(`Concept ${specKey} appears in multiple topics`);
    grouped.add(specKey);
    node.topic = `sg_h2_physics_topic_${topicKey}`;
    node.default_order = conceptIndex + 1;
    return node;
  });
  return {
    id: `sg_h2_physics_topic_${topicKey}`,
    kind: "topic",
    name,
    name_zh: nameZh,
    topic: null,
    default_order: topicIndex + 1,
    evidence_refs: uniqueEvidence(concepts.flatMap((node) => node.evidence_refs)),
    review_status: "needs_review",
  };
});
if (grouped.size !== createdNodes.length) throw new Error("Every H2 Physics concept must belong to exactly one topic");

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
  subject: "Physics",
  jurisdictions: ["SG"],
  source_ids: unique(createdNodes.flatMap((node) => node.evidence_refs.map((ref) => ref.source_id))),
  review_status: "needs_review",
  changelog: [{
    version: "0.1.0",
    date: TODAY,
    summary_zh: "根据 SEAB 205 条物理内容要求的逐项覆盖审查，建立 8 个缺口概念；每个概念同时登记官方课程和开放教材证据。",
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
  const gapKey = keyForGap(candidate.gap_id);
  const nodes = specsByGap.get(gapKey).map((spec) => nodeBySpecKey.get(spec.key));
  const resolution = {
    gap_id: candidate.gap_id,
    resolution_action: "add_or_alias_concepts",
    canonical_ids: nodes.map((node) => node.canonical_id),
    created_node_ids: nodes.map((node) => node.id),
    practice_ids: [],
    rationale_zh: `将相近官方成果归并到 ${nodes.length} 个可独立诊断、但不过度切碎的 H2 物理概念；不以名称近似自动复用范围不足的既有 canonical。`,
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
    mapping.rationale_zh = `经概念边界、排除项和诊断粒度复核，现由 ${resolution.canonical_ids.join("、")} 完整覆盖；新增节点仍待人工批准。`;
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
  summary_zh: "将 12 项概念缺口解析为 8 个 H2 物理概念；201 项非实践内容均达到 full，14 项实践要求继续保持 excluded。",
});

const resolutionSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  resolution_set_id: "cgr_sg_seab_h2_physics_9478_2026_outcomes",
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
    summary_zh: "完成 12 项 H2 物理知识缺口的反向查重、概念归并、稳定 ID 和双类证据登记。",
  }],
  resolutions,
};

const targets = new Set(edges.map((edge) => edge.to));
const roots = createdNodes.filter((node) => !targets.has(node.id));
const reviewLines = [
  "# 新加坡 H2 物理 KG 缺口实施与代理人工复核（中文）",
  "",
  `- 复核日期：${TODAY}`,
  `- 官方要求：${mappings.mappings.length} 项（205 项学科内容、10 项跨主题实践）`,
  `- 完整概念覆盖：${mappings.mappings.filter((mapping) => mapping.coverage_status === "full").length} 项`,
  `- 实践分流：${mappings.mappings.filter((mapping) => mapping.coverage_status === "excluded").length} 项`,
  `- 新图：${createdNodes.length} 个 Concept，${topicNodes.length} 个 Topic，${edges.length} 条待审先修边`,
  `- 入口概念：${roots.length} 个；没有用课程章节顺序伪造先修关系。`,
  "- 审核状态：代理复核只给出建议，数据全部保持 `needs_review`，没有冒充 human approval。",
  "",
  "## 代理人工复核结论",
  "",
  "- 205 项内容计数按 20 个官方 Topic 的 outcome 编号重算，章节合计无缺项；此前粗算 206 已纠正为 205。",
  "- 4 项具体实验或表示任务与 10 项跨主题科学实践分流到教学评测层，不写入概念掌握度。",
  "- 12 项覆盖缺口合并为 8 个概念；波函数两项、势阱两项、辐射两项、核方程两项分别保持可共同诊断的最小边界。",
  "- 场线节点不把电场线既有窄节点误判成完整覆盖；速度选择器也不以电场力和磁场力两个分散节点代替交叉场平衡。",
  "- 量子波函数没有复用经典波叠加；核守恒没有复用范围过宽的核结构或衰变节点。",
  "- 每个新概念至少含 SEAB 页码级课程证据和 OpenStax 章节级学科证据。",
  "- 只保留 2 条能说明知识依赖的软先修边；其余课程相邻关系未转成先修边。",
  "- 反中微子细节、正电子发射、光谱仪结构与使用、恢复系数、摩擦系数和黏度继续遵守官方排除边界。",
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
    "- 复核建议：概念可保留；既有 KG 没有同时满足范围、课程深度与诊断粒度的等价 canonical；仍需项目所有者最终批准。",
    "",
  );
}

writeJson(paths.graph, graph);
writeJson(paths.registry, registry);
writeJson(paths.mappings, mappings);
writeJson(paths.resolutions, resolutionSet);
mkdirSync(dirname(paths.review), { recursive: true });
writeFileSync(paths.review, `${reviewLines.join("\n")}\n`);

process.stdout.write(`[apply-sg-h2-physics-resolutions] ${resolutions.length} gaps -> ${createdNodes.length} concepts, ${topicNodes.length} topics, ${edges.length} edges; ${roots.length} roots\n`);
