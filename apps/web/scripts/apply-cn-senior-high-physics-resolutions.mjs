#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const DATA_ROOT = resolve(REPO_ROOT, "data/knowledge-graphs");
const TODAY = "2026-07-19";
const GRAPH_ID = "senior_secondary_physics";
const GAP_PREFIX = "gap_cn_sh_physics_2020_o_";
const paths = {
  gaps: resolve(DATA_ROOT, "curricula/gaps/pending/cn_moe_senior_high_physics_2020_outcomes.json"),
  mappings: resolve(DATA_ROOT, "curricula/mappings/pending/cn_moe_senior_high_physics_2020.json"),
  resolutions: resolve(DATA_ROOT, "curricula/resolutions/pending/cn_moe_senior_high_physics_2020_outcomes.json"),
  graph: resolve(DATA_ROOT, `source/${GRAPH_ID}.json`),
  registry: resolve(DATA_ROOT, "governance/concept-registry.json"),
  sources: resolve(DATA_ROOT, "governance/sources.json"),
  review: resolve(DATA_ROOT, "review/pending/curriculum-mapping/cms_cn_moe_senior_high_physics_2020_outcomes.implementation-review.zh-CN.md"),
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
  .replace(/^(?:r|sr)\d+_\d+_\d+_\d+[a-z]?_/, "");
const nodeIdFor = (key) => `cn_sh_physics_${key}`;
const canonicalIdFor = (nodeId) => {
  const digest = createHash("sha256").update(`primoria-concept-v1\0${GRAPH_ID}\0${nodeId}`).digest("hex");
  return `pc_${digest.slice(0, 32)}`;
};

const SOURCE_IDS = {
  moe: "src_cn_moe_senior_high_physics_2020",
  v1: "src_openstax_university_physics_v1_2016",
  v2: "src_openstax_university_physics_v2_2016",
  v3: "src_openstax_university_physics_v3_2016",
  college: "src_openstax_college_physics_2e_2022",
};

// These outcomes are already fully covered by a combination of stable concepts.
// They remain mappings only; creating a synthetic one-to-many alias would violate
// the invariant that one alias resolves to exactly one canonical concept.
const PURE_REUSE = {
  magnetic_field_lines: ["pc_21210700d95c5fb054342d60854fa86a", "pc_9647bc019f27fd232ce00c144b507faa"],
  induction_conditions: ["pc_ef89f015bb0ebd4763d7cc0623222573"],
  wave_interference_diffraction: ["pc_96e41b9ba6a6d60711d999b04e3ee970", "pc_e7db3c8e907de6d7f3bef2c8cccc4eb1"],
  charged_particle_magnetic_motion: ["pc_1ca0904b6ae91d6ca3fc8e304aaf7ed2", "pc_564a46a0b8681d3ee2bfb13b78e2cbe0"],
  sensor_principles: ["pc_59edde8ba6869a6d649ea0bead7ef1d5", "pc_1930b8c847023ca24d637697d9313a1f"],
};

// Exact cross-jurisdiction aliases: the Chinese outcome changes curriculum wording,
// not the underlying concept identity.
const ALIAS_CANONICAL_IDS = {
  light_energy_quantisation: "pc_667d6af1c79afd71fbd2dedbccfcc217",
  nuclear_energy_intro: "pc_45e557e295944b395f08bb30c4bb963e",
  atomic_nuclear_model: "pc_e180a73d3a69ee874db1ed7939a2c604",
  matter_waves_quantisation: "pc_5214d7b845cac7c061ea53ff5618d522",
};

const SECONDARY_EVIDENCE = [
  [/^particle_model$/, SOURCE_IDS.v1, "Web §§1.1-1.2 The Scope and Scale of Physics; Units and Standards"],
  [/^si_mechanics_units$/, SOURCE_IDS.v1, "Web §§1.2-1.4 Units and Standards; Unit Conversion; Dimensional Analysis"],
  [/^free_fall$/, SOURCE_IDS.v1, "Web §§3.4-3.5 Motion with Constant Acceleration; Free Fall"],
  [/^gravity_elastic_force$/, SOURCE_IDS.v1, "Web §5.6 Common Forces; §12.3 Stress, Strain, and Elastic Modulus"],
  [/^friction$/, SOURCE_IDS.v1, "Web §6.2 Friction"],
  [/^force_composition_vectors$/, SOURCE_IDS.v1, "Web §§2.1-2.3 Scalars and Vectors; Components; Algebra of Vectors"],
  [/^overweight_weightlessness$/, SOURCE_IDS.v1, "Web §6.1 Solving Problems with Newton's Laws; Chapter 6 conceptual questions on free-fall scale readings"],
  [/^kinetic_energy_theorem$/, SOURCE_IDS.v1, "Web §§7.2-7.4 Kinetic Energy and the Work-Energy Theorem"],
  [/^gravitational_potential_energy$/, SOURCE_IDS.v1, "Web §8.1 Potential Energy of a System"],
  [/^elastic_potential_energy$/, SOURCE_IDS.v1, "Web §8.2 Conservative and Non-Conservative Forces; spring potential energy"],
  [/^curvilinear_motion_condition$/, SOURCE_IDS.v1, "Web §§4.1-4.4 Motion in Two and Three Dimensions"],
  [/^centrifugal_phenomena$/, SOURCE_IDS.v1, "Web §6.3 Centripetal Force"],
  [/^cosmic_velocities$/, SOURCE_IDS.v1, "Web §§13.3-13.5 Gravitational Potential Energy; Satellite Orbits; Kepler's Laws"],
  [/^newtonian_limits$/, SOURCE_IDS.v3, "Web §5.1 Invariance of Physical Laws; classical-limit discussion"],
  [/^relativistic_spacetime$/, SOURCE_IDS.v3, "Web §§5.3-5.7 Time Dilation, Length Contraction, Lorentz Transformation and Relativistic Velocity"],
  [/^cosmic_evolution$/, SOURCE_IDS.v3, "Web §§11.5-11.7 Cosmology, The Big Bang and Evolution of the Early Universe"],
  [/^electrostatic_charge_conservation$/, SOURCE_IDS.v2, "Web §5.1 Electric Charge"],
  [/^point_charge_model$/, SOURCE_IDS.v2, "Web §5.2 Conductors, Insulators, and Charging by Induction; §5.3 Coulomb's Law"],
  [/^electric_field_lines$/, SOURCE_IDS.v2, "Web §5.6 Electric Field Lines"],
  [/^electrostatic_applications$/, SOURCE_IDS.v2, "Web §§5.2 and 6.4 Charging by Induction; Conductors in Electrostatic Equilibrium"],
  [/^electric_potential_quantities$/, SOURCE_IDS.v2, "Web §§7.1-7.5 Electric Potential Energy, Potential and Equipotential Surfaces"],
  [/^charged_particle_electric_motion$/, SOURCE_IDS.v2, "Web §§5.4-5.5 Electric Field and Calculating Electric Fields"],
  [/^capacitance$/, SOURCE_IDS.v2, "Web §§8.1-8.2 Capacitors and Capacitance; Capacitors in Series and Parallel"],
  [/^capacitor_charge_discharge$/, SOURCE_IDS.v2, "Web §10.5 RC Circuits"],
  [/^circuit_components$/, SOURCE_IDS.v2, "Web Chapter 10 introduction and §§10.1-10.5 Direct-Current Circuits"],
  [/^resistance_geometry_material$/, SOURCE_IDS.v2, "Web §§9.3-9.4 Resistivity and Resistance; Ohm's Law"],
  [/^closed_circuit_ohm$/, SOURCE_IDS.v2, "Web §10.1 Electromotive Force; internal resistance and terminal voltage"],
  [/^electrical_work_power$/, SOURCE_IDS.v2, "Web §9.5 Electrical Energy and Power"],
  [/^joule_law$/, SOURCE_IDS.v2, "Web §9.5 Electrical Energy and Power; resistive heating"],
  [/^household_electricity_safety$/, SOURCE_IDS.v2, "Web §10.6 Household Wiring and Electrical Safety"],
  [/^magnetism_applications_history$/, SOURCE_IDS.v2, "Web Chapter 11 introduction and §§11.1-11.5 Magnetic Forces and Fields"],
  [/^magnetic_field_lines$/, SOURCE_IDS.v2, "Web §§11.2-11.4 Magnetic Fields and Forces; Chapter 12 current-source field patterns"],
  [/^induction_conditions$/, SOURCE_IDS.v2, "Web §13.1 Faraday's Law"],
  [/^electromagnetic_field_waves$/, SOURCE_IDS.v2, "Web §§16.1-16.2 Maxwell's Equations and Electromagnetic Waves"],
  [/^electromagnetic_wave_applications$/, SOURCE_IDS.v2, "Web §16.5 The Electromagnetic Spectrum"],
  [/^light_energy_quantisation$/, SOURCE_IDS.v3, "Web §§6.1-6.2 Blackbody Radiation and Photoelectric Effect; photon energy"],
  [/^renewable_energy_technologies$/, SOURCE_IDS.v1, "Web §8.5 Sources of Energy; hydropower, wind power and solar power"],
  [/^nuclear_energy_intro$/, SOURCE_IDS.v3, "Web §§10.5-10.6 Fission and Nuclear Fusion"],
  [/^energy_conversion_directionality$/, SOURCE_IDS.v2, "Web Chapter 4 The Second Law of Thermodynamics, especially §§4.5-4.7"],
  [/^(renewable_environment|pollution_sustainable_development)$/, SOURCE_IDS.college, "Web §7.9 World Energy Use; renewable/nonrenewable resources, sustainability and environmental effects"],
  [/^simple_pendulum_period$/, SOURCE_IDS.v1, "Web §15.4 Pendulums"],
  [/^forced_vibration$/, SOURCE_IDS.v1, "Web §15.6 Forced Oscillations"],
  [/^wave_reflection_refraction$/, SOURCE_IDS.v1, "Web Chapter 16 Waves, §§16.4-16.6 boundary behaviour, interference and standing waves"],
  [/^doppler_effect$/, SOURCE_IDS.v1, "Web §17.7 The Doppler Effect"],
  [/^light_refraction_law$/, SOURCE_IDS.v3, "Web §1.3 Refraction"],
  [/^total_internal_reflection$/, SOURCE_IDS.v3, "Web §1.4 Total Internal Reflection"],
  [/^optical_fibre$/, SOURCE_IDS.v3, "Web §1.4 Total Internal Reflection; optical-fibre applications"],
  [/^light_polarisation$/, SOURCE_IDS.v3, "Web §1.7 Polarization"],
  [/^laser$/, SOURCE_IDS.v3, "Web §8.6 Lasers"],
  [/^wave_interference_diffraction$/, SOURCE_IDS.v1, "Web §§16.5-16.6 Interference of Waves and Standing Waves and Resonance"],
  [/^charged_particle_magnetic_motion$/, SOURCE_IDS.v2, "Web §11.4 Motion of a Charged Particle in a Magnetic Field"],
  [/^self_induction$/, SOURCE_IDS.v2, "Web §14.2 Self-Inductance and Inductors"],
  [/^eddy_currents$/, SOURCE_IDS.v2, "Web §13.6 Eddy Currents"],
  [/^sinusoidal_ac$/, SOURCE_IDS.v2, "Web §§15.1-15.5 AC Sources and RLC Circuits"],
  [/^high_voltage_transmission$/, SOURCE_IDS.v2, "Web §15.6 Transformers"],
  [/^generator_motor_energy$/, SOURCE_IDS.v2, "Web §§13.7-13.8 Electric Generators, Motors and Back EMF"],
  [/^maxwell_field_theory$/, SOURCE_IDS.v2, "Web §16.1 Maxwell's Equations and Electromagnetic Waves"],
  [/^electromagnetic_oscillation$/, SOURCE_IDS.v2, "Web §14.6 RLC Series Circuits; electromagnetic energy exchange"],
  [/^em_wave_transmission$/, SOURCE_IDS.v2, "Web §§16.2-16.4 Plane Electromagnetic Waves, Energy and Momentum"],
  [/^sensor_conversion$/, SOURCE_IDS.v2, "Web §10.4 Electrical Measuring Instruments; measurement conversion chain"],
  [/^sensor_principles$/, SOURCE_IDS.v2, "Web §9.3 Resistivity and Resistance; thermistors and photoresistors; §10.2 potential-divider circuits"],
  [/^sensor_applications$/, SOURCE_IDS.v3, "Web §§9.6-9.7 Semiconductors, Doping and Semiconductor Devices"],
  [/^molecular_kinetic_theory_evidence$/, SOURCE_IDS.v2, "Web §§2.1-2.3 Molecular Model, Pressure and Temperature in the Kinetic Theory of Gases"],
  [/^diffusion_brownian$/, SOURCE_IDS.v2, "Web §2.1 Molecular Model of an Ideal Gas; microscopic evidence for molecular motion"],
  [/^molecular_speed_distribution$/, SOURCE_IDS.v2, "Web §2.4 Distribution of Molecular Speeds"],
  [/^crystalline_amorphous$/, SOURCE_IDS.v3, "Web §9.3 Bonding in Crystalline Solids; amorphous-solid comparison"],
  [/^liquid_crystals$/, SOURCE_IDS.v3, "Web §1.7 Polarization; Liquid Crystals and Other Polarization Effects in Materials"],
  [/^semiconductor_materials$/, SOURCE_IDS.v3, "Web §§9.5-9.7 Band Theory, Semiconductors and Semiconductor Devices"],
  [/^nanomaterials$/, SOURCE_IDS.v3, "Web §§6.6 and 7.6 Electron microscopy, nanotechnology and quantum tunnelling devices"],
  [/^surface_tension_capillarity$/, SOURCE_IDS.college, "Web §11.8 Cohesion and Adhesion in Liquids: Surface Tension and Capillary Action"],
  [/^second_law_thermodynamics$/, SOURCE_IDS.v2, "Web Chapter 4 The Second Law of Thermodynamics, §§4.1-4.7"],
  [/^atomic_nuclear_model$/, SOURCE_IDS.v3, "Web §6.4 Bohr's Model of the Hydrogen Atom; Rutherford nuclear model"],
  [/^nuclear_composition_force$/, SOURCE_IDS.v3, "Web §§10.1-10.2 Properties of Nuclei and Nuclear Binding Energy"],
  [/^fundamental_interactions$/, SOURCE_IDS.v3, "Web §11.1 Introduction to Particle Physics; fundamental interactions"],
  [/^nuclear_reaction_equations$/, SOURCE_IDS.v3, "Web §10.4 Nuclear Reactions"],
  [/^radioisotope_application_safety$/, SOURCE_IDS.v3, "Web §§10.3 and 10.7 Radioactive Decay; Medical Applications and Biological Effects"],
  [/^matter_waves_quantisation$/, SOURCE_IDS.v3, "Web §§6.5-6.6 De Broglie's Matter Waves and Wave-Particle Duality"],
];

function secondaryEvidence(key) {
  const route = SECONDARY_EVIDENCE.find(([pattern]) => pattern.test(key));
  if (!route) throw new Error(`No secondary evidence route for ${key}`);
  return { source_id: route[1], locator: route[2] };
}

const TOPIC_GROUPS = [
  ["mechanics_models_units", "Models and units in mechanics", "力学模型与单位", ["particle_model", "si_mechanics_units"]],
  ["kinematics_common_forces", "Kinematics and common forces", "运动学与常见力", ["free_fall", "gravity_elastic_force", "friction"]],
  ["force_motion_analysis", "Force and motion analysis", "受力与运动分析", ["force_composition_vectors", "overweight_weightlessness", "curvilinear_motion_condition"]],
  ["work_energy", "Work and potential energy", "功与势能", ["kinetic_energy_theorem", "gravitational_potential_energy", "elastic_potential_energy"]],
  ["circular_cosmic_motion", "Circular and cosmic motion", "圆周与宇宙运动", ["centrifugal_phenomena", "cosmic_velocities"]],
  ["relativity_cosmology", "Relativity and cosmology", "相对论与宇宙学", ["newtonian_limits", "relativistic_spacetime", "cosmic_evolution"]],
  ["electrostatic_models", "Electrostatic models", "静电模型", ["electrostatic_charge_conservation", "point_charge_model", "electric_field_lines"]],
  ["electric_field_applications", "Electric-field applications", "电场及其应用", ["electrostatic_applications", "electric_potential_quantities", "charged_particle_electric_motion"]],
  ["capacitors_components", "Capacitors and circuit components", "电容器与电路元件", ["capacitance", "capacitor_charge_discharge", "circuit_components"]],
  ["dc_circuit_analysis", "Direct-current circuit analysis", "直流电路分析", ["resistance_geometry_material", "closed_circuit_ohm", "electrical_work_power"]],
  ["electrical_heating_safety", "Electrical heating and safety", "电热与用电安全", ["joule_law", "household_electricity_safety"]],
  ["magnetism_em_waves", "Magnetism and electromagnetic waves", "磁现象与电磁波", ["magnetism_applications_history", "electromagnetic_field_waves", "electromagnetic_wave_applications"]],
  ["quantum_wave_particle", "Wave-particle quantisation", "波粒二象性与量子化", ["light_energy_quantisation", "matter_waves_quantisation"]],
  ["energy_technologies", "Energy technologies", "能源技术", ["renewable_energy_technologies", "nuclear_energy_intro"]],
  ["thermodynamic_directionality", "Thermodynamic directionality", "能量方向性", ["energy_conversion_directionality", "second_law_thermodynamics"]],
  ["energy_environment", "Energy and environment", "能源与环境", ["renewable_environment", "pollution_sustainable_development"]],
  ["oscillations_sound", "Oscillations and sound", "振动与声学", ["simple_pendulum_period", "forced_vibration", "doppler_effect"]],
  ["wave_refraction", "Wave and light refraction", "波与光的折射", ["wave_reflection_refraction", "light_refraction_law", "total_internal_reflection"]],
  ["optical_applications", "Optical applications", "光学应用", ["optical_fibre", "light_polarisation", "laser"]],
  ["induction_ac", "Induction and alternating current", "自感、涡流与交流", ["self_induction", "eddy_currents", "sinusoidal_ac"]],
  ["power_machines", "Power transmission and machines", "输电与电机", ["high_voltage_transmission", "generator_motor_energy"]],
  ["electromagnetic_theory", "Electromagnetic theory and transmission", "电磁理论与传播", ["maxwell_field_theory", "electromagnetic_oscillation", "em_wave_transmission"]],
  ["sensor_systems", "Sensor systems", "传感器系统", ["sensor_conversion", "sensor_applications"]],
  ["molecular_kinetic_evidence", "Molecular motion and evidence", "分子运动与证据", ["molecular_kinetic_theory_evidence", "diffusion_brownian", "molecular_speed_distribution"]],
  ["states_of_matter", "States and interfaces of matter", "物态与界面", ["crystalline_amorphous", "liquid_crystals", "surface_tension_capillarity"]],
  ["advanced_materials", "Advanced materials", "先进材料", ["semiconductor_materials", "nanomaterials"]],
  ["nuclear_structure", "Nuclear structure and interactions", "原子核结构与相互作用", ["atomic_nuclear_model", "nuclear_composition_force", "fundamental_interactions"]],
  ["nuclear_reactions", "Nuclear reactions and radiation", "核反应与辐射", ["nuclear_reaction_equations", "radioisotope_application_safety"]],
];

const EDGE_SPECS = [
  ["particle_model", "free_fall", "自由落体建模需要先判断研究对象何时可抽象为质点。"],
  ["force_composition_vectors", "overweight_weightlessness", "分析支持力变化前需要能合成竖直方向上的力。"],
  ["curvilinear_motion_condition", "centrifugal_phenomena", "解释离心现象需要先理解速度方向与合力方向不共线时的曲线运动。"],
  ["capacitance", "capacitor_charge_discharge", "分析充放电过程需要先理解电容和储电能力。"],
  ["circuit_components", "closed_circuit_ohm", "闭合电路分析需要先识别电源、负载和测量元件的作用。"],
  ["resistance_geometry_material", "closed_circuit_ohm", "分析闭合电路电流需要理解外电路电阻的来源和变化。"],
  ["electrical_work_power", "joule_law", "焦耳热计算建立在电能转化和电功率关系上。"],
  ["light_refraction_law", "total_internal_reflection", "判断全反射临界条件需要先掌握折射定律。"],
  ["total_internal_reflection", "optical_fibre", "光纤导光原理直接依赖全反射条件。"],
  ["maxwell_field_theory", "electromagnetic_oscillation", "理解振荡电场与磁场的耦合需要先掌握电磁场统一观点。"],
  ["electromagnetic_oscillation", "em_wave_transmission", "说明电磁波发射需要先理解振荡电荷和电磁振荡。"],
  ["sensor_conversion", "sensor_applications", "解释传感器应用需要先理解非电学量到电学量的转换链路。"],
  ["molecular_kinetic_theory_evidence", "diffusion_brownian", "用分子热运动解释扩散和布朗运动需要先掌握分子动理论。"],
  ["molecular_kinetic_theory_evidence", "molecular_speed_distribution", "理解分子速率分布需要先掌握大量分子无规则运动的统计模型。"],
  ["crystalline_amorphous", "semiconductor_materials", "理解半导体能带与材料性质需要先认识固体微观结构。"],
  ["atomic_nuclear_model", "nuclear_composition_force", "核力和核组成建立在原子核式结构模型上。"],
  ["nuclear_composition_force", "nuclear_reaction_equations", "书写核反应方程需要先识别核子组成、质量数和电荷数。"],
  ["energy_conversion_directionality", "renewable_environment", "评价能源环境影响需要理解能量转化中的不可逆损耗和资源品质变化。"],
];

const gaps = readJson(paths.gaps);
const mappings = readJson(paths.mappings);
const registry = readJson(paths.registry);
const sources = readJson(paths.sources);
for (const sourceId of Object.values(SOURCE_IDS)) {
  if (!sources.sources.some((source) => source.source_id === sourceId)) throw new Error(`Missing source registry entry ${sourceId}`);
}

const createdNodes = [];
const resolutions = [];
const resolutionByGapId = new Map();
for (const candidate of gaps.candidates) {
  const key = gapKey(candidate.gap_id);
  const secondRef = secondaryEvidence(key);
  let resolution;
  if (PURE_REUSE[key]) {
    resolution = {
      gap_id: candidate.gap_id,
      resolution_action: "reuse_existing",
      canonical_ids: PURE_REUSE[key],
      created_node_ids: [],
      practice_ids: [],
      rationale_zh: "逐项定义复核确认现有 canonical 概念组合已完整覆盖知识结果；实验动作属于教学实施方式，不据此制造重复概念。",
      evidence_refs: uniqueEvidence([...candidate.evidence_refs, secondRef]),
      review_status: "needs_review",
    };
  } else {
    const nodeId = nodeIdFor(key);
    const canonicalId = ALIAS_CANONICAL_IDS[key] ?? canonicalIdFor(nodeId);
    createdNodes.push({
      id: nodeId,
      canonical_id: canonicalId,
      kind: "concept",
      name: candidate.proposed_name,
      name_zh: candidate.proposed_name_zh,
      topic: null,
      description: candidate.scope_zh,
      default_order: 0,
      evidence_refs: uniqueEvidence([...candidate.evidence_refs, secondRef]),
      review_status: "needs_review",
    });
    resolution = {
      gap_id: candidate.gap_id,
      resolution_action: "add_or_alias_concepts",
      canonical_ids: unique([...(candidate.existing_canonical_ids ?? []), canonicalId]),
      created_node_ids: [nodeId],
      practice_ids: [],
      rationale_zh: ALIAS_CANONICAL_IDS[key]
        ? "定义边界与现有全局概念一致；建立中国高中课程 alias 并复用稳定 canonical ID。"
        : "现有统一 KG 只覆盖上位概念或部分公式，不能独立诊断该课标结果；新增窄粒度稳定概念并保留相关 canonical 映射。",
      evidence_refs: uniqueEvidence([...candidate.evidence_refs, secondRef]),
      review_status: "needs_review",
    };
  }
  resolutions.push(resolution);
  resolutionByGapId.set(candidate.gap_id, resolution);
}

const createdByKey = new Map(createdNodes.map((node) => [node.id.replace(/^cn_sh_physics_/, ""), node]));
const topicNodes = [];
const groupedNodeIds = new Set();
for (const [index, [topicKey, name, nameZh, conceptKeys]] of TOPIC_GROUPS.entries()) {
  const topicId = `cn_sh_physics_topic_${topicKey}`;
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
  subject: "Physics",
  jurisdictions: ["CN"],
  source_ids: unique(createdNodes.flatMap((node) => node.evidence_refs.map((ref) => ref.source_id))),
  review_status: "needs_review",
  changelog: [{
    version: "0.1.0",
    date: TODAY,
    summary_zh: "依据中国普通高中物理成果级覆盖审查，新增最小可诊断概念、复用稳定 canonical alias，并补齐第二类权威证据。",
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
    summary_zh: "应用全库定义复核与缺口解析：121 项知识成果闭合为 full，14 项实验、历史或方法成果保持 excluded。",
  });
}

const resolutionSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  resolution_set_id: "cgr_cn_moe_senior_high_physics_2020_outcomes",
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
    summary_zh: "完成 78 项物理知识缺口逐项定义复核、稳定 ID 复用、新概念建立和双来源证据绑定。",
  }],
  resolutions,
};

const counts = resolutions.reduce((result, resolution) => {
  result[resolution.resolution_action] = (result[resolution.resolution_action] ?? 0) + 1;
  return result;
}, {});
const newCanonicalCount = createdNodes.filter((node) => !ALIAS_CANONICAL_IDS[gapKey(`${GAP_PREFIX}${node.id.replace(/^cn_sh_physics_/, "")}`)]).length;
const edgeTargets = new Set(edges.map((edge) => edge.to));
const rootConcepts = createdNodes.filter((node) => !edgeTargets.has(node.id));
const reviewLines = [
  "# 中国高中物理 KG 缺口实施复核（中文）",
  "",
  `- 复核日期：${TODAY}`,
  `- 缺口解析：${resolutions.length} 项`,
  `- 直接复用现有 canonical 组合：${counts.reuse_existing ?? 0} 项`,
  `- 新增节点或 jurisdiction alias：${counts.add_or_alias_concepts ?? 0} 项`,
  `- 其中新 canonical：${newCanonicalCount} 个；复用 canonical alias：${createdNodes.length - newCanonicalCount} 个`,
  `- 新图：${createdNodes.length} 个 Concept，${topicNodes.length} 个 Topic，${edges.length} 条待审先修边`,
  "- 状态：全部保持 `needs_review`；本轮是 AI 语义复核，不伪造人工批准。",
  "",
  "## 关键纠错",
  "",
  "1. 5 项原缺口实际可由现有 canonical 概念或概念组合完整覆盖，已改为直接复用，未创建一对多伪 alias。",
  "2. 光能量量子化、核能初步、原子核式模型和实物粒子波动性与现有全局定义相同，只建立中国课程 alias，不产生新 canonical ID。",
  "3. ‘运动方程’不等于‘自由落体’，‘动能与势能’不等于‘动能定理’，‘电阻与欧姆定律’不等于‘闭合电路欧姆定律’；这些仍保留独立诊断概念。",
  "4. 能源、污染与表面张力未使用不直接支持结论的泛化章节，分别改用 OpenStax §8.5、College Physics 2e §7.9 与 §11.8。",
  "5. OpenStax 当前页面有额外的大模型摄入限制；仓库只保存元数据、校验值和章节定位，不保存或摄入教材正文。",
  `6. 逐项检查 ${rootConcepts.length} 个根概念：它们是主题入口或依赖统一 KG 中已复用概念；没有把课程排列顺序伪造成学理先修边。`,
  "",
  "## 逐项解析",
  "",
  "| # | 原缺口 | 动作 | canonical IDs | 新节点 | 证据二 |",
  "|---:|---|---|---|---|---|",
];
for (const [index, candidate] of gaps.candidates.entries()) {
  const resolution = resolutionByGapId.get(candidate.gap_id);
  const canonicalText = resolution.canonical_ids.map((id) => `\`${id}\``).join("<br>");
  const nodeText = resolution.created_node_ids.map((id) => `\`${id}\``).join("<br>") || "—";
  const secondRef = secondaryEvidence(gapKey(candidate.gap_id));
  reviewLines.push(`| ${index + 1} | ${candidate.proposed_name_zh} | \`${resolution.resolution_action}\` | ${canonicalText} | ${nodeText} | ${secondRef.source_id}：${secondRef.locator} |`);
}
reviewLines.push(
  "",
  "## 自动门禁",
  "",
  "- 78 个 gap_id 必须各解析一次；121 个知识成果必须为 full，14 个实践成果必须为 excluded。",
  "- 每个新图 Concept 必须同时有教育部页码证据和 OpenStax 精确章节证据。",
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

process.stdout.write(`[apply-cn-physics-resolutions] ${resolutions.length} gaps: ${counts.reuse_existing ?? 0} reuse, ${counts.add_or_alias_concepts ?? 0} add/alias; ${createdNodes.length} graph concepts, ${newCanonicalCount} new canonical IDs\n`);
