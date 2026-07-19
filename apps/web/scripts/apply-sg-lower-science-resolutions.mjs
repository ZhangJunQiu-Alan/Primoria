#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const DATA = resolve(ROOT, "data/knowledge-graphs");
const TODAY = "2026-07-19";
const GRAPH_ID = "singapore_lower_secondary_science";
const GAP_PREFIX = "gap_sg_lss_science_2021_o_";

const paths = {
  gaps: resolve(DATA, "curricula/gaps/pending/sg_moe_lower_secondary_g2_g3_science_2021_outcomes.json"),
  mappings: resolve(DATA, "curricula/mappings/pending/sg_moe_lower_secondary_g2_g3_science_2021.json"),
  resolutions: resolve(DATA, "curricula/resolutions/pending/sg_moe_lower_secondary_g2_g3_science_2021_outcomes.json"),
  graph: resolve(DATA, `source/${GRAPH_ID}.json`),
  registry: resolve(DATA, "governance/concept-registry.json"),
  review: resolve(DATA, "review/pending/curriculum-mapping/cms_sg_moe_lower_secondary_g2_g3_science_2021_outcomes.implementation-review.zh-CN.md"),
};

const SOURCES = {
  syllabus: "src_sg_moe_lower_secondary_g2_g3_science_2021",
  physics: "src_openstax_college_physics_2e_2022",
  universityPhysics2: "src_openstax_university_physics_v2_2016",
  chemistry: "src_openstax_chemistry_2e_2019",
  biology: "src_openstax_biology_2e_2018",
  microbiology: "src_openstax_microbiology_2016",
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
const nodeIdFor = (key) => `sg_lss_science_${key}`;
const canonicalIdFor = (nodeId) => {
  const digest = createHash("sha256").update(`primoria-concept-v1\0${GRAPH_ID}\0${nodeId}`).digest("hex");
  return `pc_${digest.slice(0, 32)}`;
};

const CONCEPT_SPECS = [
  {
    key: "physical_properties_density",
    name: "Physical properties, mass, volume and density",
    nameZh: "物理性质、质量、体积与密度",
    description: "Observing and measuring material properties, relating mass and volume to density, and using those properties to compare or classify materials at lower-secondary depth.",
    gapKeys: ["2_observable_measurable_physical_properties", "2_mass_volume_density_relation"],
    sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §§1.3-1.4, Physical and Chemical Properties; Measurements",
  },
  {
    key: "elements_compounds",
    name: "Elements, compounds and their distinguishing properties",
    nameZh: "元素、化合物及其性质边界",
    description: "Distinguishing elements from compounds, recognising metals and non-metals in the periodic table, and explaining why a compound has properties different from its constituent elements.",
    gapKeys: ["3_elements_building_blocks", "3_element_types_periodic_table", "3_compound_definition", "3_compound_properties"],
    sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §1.2, Phases and Classification of Matter; §2.5, The Periodic Table",
  },
  {
    key: "mixtures_solutions",
    name: "Mixtures, solutions and suspensions",
    nameZh: "混合物、溶液与悬浊液",
    description: "Explaining that mixtures are not chemically combined and retain constituent properties, while distinguishing solute, solvent, solution and suspension.",
    gapKeys: ["3_mixture_definition", "3_mixture_constituent_properties", "3_solute_solvent_solution", "3_solutions_suspensions_mixtures"],
    sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §1.2, Phases and Classification of Matter; §§11.1-11.3, Solutions and Solubility",
  },
  {
    key: "separation_principles",
    name: "Principles of mixture separation",
    nameZh: "混合物分离原理",
    description: "Selecting magnetic attraction, filtration, evaporation, distillation or paper chromatography according to differences in constituent properties.",
    gapKeys: ["4_separation_by_properties"],
    sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §1.2, physical separation of mixtures",
  },
  {
    key: "separation_applications",
    name: "Applications of separation techniques",
    nameZh: "分离技术的生活与工业应用",
    description: "Connecting separation principles to water treatment, food safety, recycling and waste-management applications without assuming that one method fits every mixture.",
    gapKeys: ["4_separation_applications"],
    sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §1.2, mixture classification and physical separation; Chapter 11, Solutions and Colloids",
  },
  {
    key: "ray_model_reflection",
    name: "Ray model and reflection from surfaces",
    nameZh: "射线模型与表面反射",
    description: "Using directed rays to represent light paths and distinguish reflection by plane, curved, smooth and rough surfaces, including image and application reasoning.",
    gapKeys: ["5_ray_model_path", "5_reflecting_surfaces_effects_uses", "5_smooth_rough_reflection"],
    sourceId: SOURCES.physics,
    locator: "OpenStax College Physics 2e §§25.1-25.2, The Ray Aspect of Light; The Law of Reflection",
  },
  {
    key: "refraction_dispersion",
    name: "Qualitative refraction and dispersion",
    nameZh: "定性折射与色散",
    description: "Explaining refraction as a change of light speed across media, describing observable effects, and representing prism dispersion without requiring angle calculations.",
    gapKeys: ["5_refraction_speed_media", "5_refraction_effects", "5_white_light_dispersion"],
    sourceId: SOURCES.physics,
    locator: "OpenStax College Physics 2e §§25.3 and 25.5, The Law of Refraction; Dispersion",
  },
  {
    key: "typical_cell_structure_function",
    name: "Typical plant and animal cell structures and functions",
    nameZh: "典型动植物细胞结构与功能",
    description: "Relating the cell wall, membrane, cytoplasm, nucleus, vacuole and chloroplast to their functions while treating typical plant and animal cells as simplified models.",
    gapKeys: ["6_typical_cell_part_functions"],
    sourceId: SOURCES.biology,
    locator: "OpenStax Biology 2e §§4.1-4.3, Studying Cells; Eukaryotic Cells",
  },
  {
    key: "multicellular_organisation_labour",
    name: "Multicellular organisation and division of labour",
    nameZh: "多细胞生物的结构层级与细胞分工",
    description: "Connecting specialised cells to tissues, organs and organ systems and explaining why division of labour supports multicellular functions.",
    gapKeys: ["6_cells_tissues_organs_systems", "6_cellular_division_of_labour"],
    sourceId: SOURCES.biology,
    locator: "OpenStax Biology 2e §4.1, Studying Cells, cells to tissues, organs and organ systems",
  },
  {
    key: "particle_model_states",
    name: "Particle model of solids, liquids and gases",
    nameZh: "固液气三态的粒子模型",
    description: "Representing matter as discrete particles in constant random motion and comparing particle arrangement and movement in solids, liquids and gases.",
    gapKeys: ["7_particulate_model_random_motion", "7_particle_arrangement_states"],
    sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §1.2, phases of matter; §§10.1-10.3, intermolecular forces and phase transitions",
  },
  {
    key: "particle_model_thermal_changes",
    name: "Particle explanation of thermal expansion and state change",
    nameZh: "粒子模型解释热胀冷缩与物态变化",
    description: "Using particle spacing and motion to explain expansion, contraction, melting and boiling while preserving mass through physical changes.",
    gapKeys: ["7_thermal_expansion_mass_conservation_model", "7_state_changes_particle_model"],
    sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §1.2, phases and conservation of matter; §10.3, Phase Transitions",
  },
  {
    key: "atomic_identity_mass",
    name: "Proton number, nuclear mass and elemental identity",
    nameZh: "质子数、原子核质量与元素身份",
    description: "Explaining that atomic mass is concentrated in the nucleus and that the number of protons uniquely identifies an element.",
    gapKeys: ["8_atomic_mass_nucleus", "8_element_unique_proton_number"],
    sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §§2.2-2.3, Evolution of Atomic Theory; Atomic Structure and Symbolism",
  },
  {
    key: "molecules_formula_reading",
    name: "Molecules and reading chemical formulae",
    nameZh: "分子及化学式信息读取",
    description: "Defining a molecule as chemically combined atoms and reading the types and counts of atoms from an element symbol or given compound formula without requiring formula construction.",
    gapKeys: ["8_molecule_definition", "8_read_atoms_from_symbols_formulae"],
    sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §1.2, Atoms and Molecules; §2.4, Chemical Formulas",
  },
  {
    key: "force_effects_energy_transfer",
    name: "Effects of force and associated energy transfer",
    nameZh: "力的效应及其能量转移",
    description: "Relating interactions and forces to changes in motion, turning, size or shape, while recognising that such interactions transfer energy.",
    gapKeys: ["9_force_effects_energy_transfer"],
    sourceId: SOURCES.physics,
    locator: "OpenStax College Physics 2e Chapter 4, Dynamics; Chapter 7, Work, Energy, and Energy Resources",
  },
  {
    key: "solid_atmospheric_liquid_pressure",
    name: "Solid, atmospheric and liquid pressure in context",
    nameZh: "固体、大气与液体压强情境",
    description: "Using force per area and fluid-pressure ideas to explain cutting edges, suction, drinking straws and depth-related pressure without adding advanced fluid dynamics.",
    gapKeys: ["9_pressure_everyday_phenomena"],
    sourceId: SOURCES.physics,
    locator: "OpenStax College Physics 2e Chapter 11, Fluid Statics, pressure and pressure variation with depth",
  },
  {
    key: "thermal_expansion_density",
    name: "Thermal expansion, contraction and density change",
    nameZh: "热胀冷缩与密度变化",
    description: "Explaining everyday expansion and contraction and inferring how a temperature-driven volume change affects density when mass is unchanged.",
    gapKeys: ["10_thermal_expansion_applications"],
    sourceId: SOURCES.universityPhysics2,
    locator: "OpenStax University Physics Volume 2 §1.3, Thermal Expansion",
  },
  {
    key: "heat_transfer_mechanisms",
    name: "Conduction, convection and thermal radiation",
    nameZh: "传导、对流与热辐射",
    description: "Distinguishing conduction, convection and radiation as heat-transfer mechanisms and applying them to heating, cooling, insulation and radiant-energy contexts.",
    gapKeys: ["10_heat_transfer_modes", "10_conduction_convection_applications", "10_radiation_applications"],
    sourceId: SOURCES.universityPhysics2,
    locator: "OpenStax University Physics Volume 2 §1.6, Mechanisms of Heat Transfer",
  },
  {
    key: "thermal_radiation_rate_factors",
    name: "Surface and temperature factors in thermal radiation",
    nameZh: "影响热辐射速率的表面与温度因素",
    description: "Reasoning qualitatively about how surface colour, texture and temperature affect the rate at which a body gains or loses energy by radiation.",
    gapKeys: ["10_radiation_rate_surface_temperature"],
    sourceId: SOURCES.universityPhysics2,
    locator: "OpenStax University Physics Volume 2 §1.6, radiation and net radiative heat transfer",
  },
  {
    key: "chemical_change_particle_conservation",
    name: "Chemical change, atomic rearrangement and mass conservation",
    nameZh: "化学变化、原子重排与质量守恒",
    description: "Identifying chemical change by formation of new substances and explaining reactions as atomic rearrangements that conserve atoms and total mass.",
    gapKeys: ["11_chemical_change_new_substances", "11_reaction_atomic_rearrangement", "11_reaction_mass_conservation"],
    sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §1.2, conservation of matter; §4.1, Writing and Balancing Chemical Equations",
  },
  {
    key: "word_equations_reaction_types",
    name: "Word equations and introductory reaction types",
    nameZh: "文字方程式与基础反应类型",
    description: "Representing reactions with reactant and product names and recognising combustion, thermal decomposition, oxidation and neutralisation without requiring symbolic balancing.",
    gapKeys: ["11_word_equations", "11_types_of_chemical_change"],
    sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §§4.1-4.2, Writing and Classifying Chemical Reactions",
  },
  {
    key: "ecosystem_factors_adaptation_interactions",
    name: "Abiotic factors, adaptations and community interactions",
    nameZh: "非生物因素、适应与群落关系",
    description: "Relating environmental factors and structural or behavioural adaptations to survival and distinguishing predator-prey, mutualistic and parasitic relationships.",
    gapKeys: ["12_abiotic_factors_survival", "12_adaptation_environment_survival", "12_community_interrelationships"],
    sourceId: SOURCES.biology,
    locator: "OpenStax Biology 2e §45.6, Community Ecology; §46.1, Ecology of Ecosystems",
  },
  {
    key: "decomposers_nutrient_cycle",
    name: "Decomposers and nutrient recycling",
    nameZh: "分解者与营养物质循环",
    description: "Explaining how decomposers return nutrients from dead organisms and wastes to the environment for reuse in ecosystem cycles.",
    gapKeys: ["12_decomposer_nutrient_recycling"],
    sourceId: SOURCES.biology,
    locator: "OpenStax Biology 2e §§46.1 and 46.3, Ecosystems; Biogeochemical Cycles",
  },
  {
    key: "current_chemical_heating_effects",
    name: "Chemical and heating effects of electric current",
    nameZh: "电流的化学效应与热效应",
    description: "Connecting current to resistive heating and introductory electrochemical changes, and selecting applications without requiring electrode-detail calculations.",
    gapKeys: ["13_current_chemical_heating_magnetic_effects"],
    sourceId: SOURCES.chemistry,
    locator: "OpenStax Chemistry 2e §17.7, Electrolysis",
    additionalEvidence: [{ source_id: SOURCES.physics, locator: "OpenStax College Physics 2e §20.4, Electric Power and Energy" }],
  },
  {
    key: "current_magnetic_effect",
    name: "Magnetic effect of electric current",
    nameZh: "电流的磁效应",
    description: "Explaining that electric current produces a magnetic field and relating that effect to simple devices and applications.",
    gapKeys: ["13_current_chemical_heating_magnetic_effects"],
    sourceId: SOURCES.physics,
    locator: "OpenStax College Physics 2e §22.1, Magnetic Fields Produced by Currents",
  },
  {
    key: "digestive_system_structure_process",
    name: "Digestive-system structure and the process of digestion",
    nameZh: "消化系统结构与消化过程",
    description: "Explaining why digestion is necessary and how the mouth, oesophagus, stomach, small and large intestines, rectum and anus work together in digestion, absorption and elimination.",
    gapKeys: ["14_digestive_system_importance", "14_digestive_parts_system_function", "14_digestion_of_food"],
    sourceId: SOURCES.biology,
    locator: "OpenStax Biology 2e §§34.1 and 34.3, Digestive Systems; Digestive System Processes",
  },
  {
    key: "digestion_products_cellular_use",
    name: "Absorbed digestion products in cellular processes",
    nameZh: "消化吸收产物在细胞过程中的用途",
    description: "Connecting absorbed small molecules to cellular respiration, growth and tissue repair without conflating digestion with those downstream cellular processes.",
    gapKeys: ["14_digestion_products_cellular_use"],
    sourceId: SOURCES.biology,
    locator: "OpenStax Biology 2e §34.3, digestion and absorption; §7.2, Glycolysis",
  },
  {
    key: "multicellular_transport_blood_exchange",
    name: "Need for multicellular transport and blood-vessel exchange",
    nameZh: "多细胞运输需求与血管交换",
    description: "Explaining why diffusion alone is insufficient over large multicellular distances and relating arteries, veins and capillaries to bulk transport and tissue exchange without requiring detailed vessel anatomy.",
    gapKeys: ["15_blood_vessel_transport_functions", "15_need_multicellular_transport", "15_diffusion_human_transport"],
    sourceId: SOURCES.biology,
    locator: "OpenStax Biology 2e §§40.1 and 40.3, Overview of the Circulatory System; Mammalian Heart and Blood Vessels",
  },
  {
    key: "plant_diffusion_transport",
    name: "Diffusion in plant transport",
    nameZh: "植物运输中的扩散",
    description: "Applying diffusion to gases and mineral ions moving into and out of plant cells while distinguishing it from xylem bulk flow and phloem translocation.",
    gapKeys: ["15_diffusion_plant_transport"],
    sourceId: SOURCES.biology,
    locator: "OpenStax Biology 2e §5.2, Passive Transport; §30.5, Transport of Water and Solutes in Plants",
  },
  {
    key: "sexual_reproduction_heredity_anatomy",
    name: "Human reproductive anatomy, fertilisation and heredity",
    nameZh: "人类生殖结构、受精与遗传",
    description: "Relating male and female reproductive structures to fertilisation and explaining how sexual reproduction transmits a unique combination of parental genetic information.",
    gapKeys: ["16_sexual_reproduction_heredity", "16_unique_parental_genetic_combination", "16_reproductive_parts_fertilisation"],
    sourceId: SOURCES.biology,
    locator: "OpenStax Biology 2e §43.3, Human Reproductive Anatomy and Gametogenesis",
  },
  {
    key: "puberty_menstrual_cycle",
    name: "Puberty and the menstrual cycle",
    nameZh: "青春期与月经周期",
    description: "Connecting hormonal changes to puberty and describing how female reproductive structures participate in the menstrual cycle without requiring detailed endocrine pathways.",
    gapKeys: ["16_puberty_hormone_changes", "16_female_parts_menstrual_cycle"],
    sourceId: SOURCES.biology,
    locator: "OpenStax Biology 2e §43.4, Hormonal Control of Human Reproduction",
  },
  {
    key: "contraception_mechanisms",
    name: "Temporary and permanent contraception mechanisms",
    nameZh: "临时与永久避孕机制",
    description: "Classifying contraception by the reproductive process or organ function it disrupts and distinguishing temporary from permanent approaches.",
    gapKeys: ["16_birth_control_mechanisms"],
    sourceId: SOURCES.biology,
    locator: "OpenStax Biology 2e §43.5, Human Pregnancy and Birth, Contraception and Birth Control",
  },
  {
    key: "sti_consequences_treatment",
    name: "Consequences and treatment boundaries of sexually transmitted infections",
    nameZh: "性传播感染的危害与治疗边界",
    description: "Relating selected bacterial and viral STIs to harmful consequences and explaining why antibiotics may treat susceptible bacterial infections but do not cure viral infections.",
    gapKeys: ["16_sti_harmful_consequences", "16_bacterial_viral_sti_treatment"],
    sourceId: SOURCES.microbiology,
    locator: "OpenStax Microbiology §§23.3-23.4, Bacterial and Viral Infections of the Reproductive System",
  },
];

const TOPICS = [
  ["matter_properties_composition", "Matter properties and composition", "物质性质与组成", ["physical_properties_density", "elements_compounds", "mixtures_solutions"]],
  ["mixture_separation", "Mixture separation", "混合物分离", ["separation_principles", "separation_applications"]],
  ["light_ray_model", "Ray model of light", "光的射线模型", ["ray_model_reflection", "refraction_dispersion"]],
  ["cell_model", "Cell models and organisation", "细胞模型与结构层级", ["typical_cell_structure_function", "multicellular_organisation_labour"]],
  ["particle_matter", "Particle model of matter", "物质粒子模型", ["particle_model_states", "particle_model_thermal_changes"]],
  ["atoms_molecules", "Atoms and molecules", "原子与分子", ["atomic_identity_mass", "molecules_formula_reading"]],
  ["forces_pressure", "Forces, energy transfer and pressure", "力、能量转移与压强", ["force_effects_energy_transfer", "solid_atmospheric_liquid_pressure"]],
  ["thermal_transfer", "Thermal transfer and expansion", "热传递与热膨胀", ["thermal_expansion_density", "heat_transfer_mechanisms", "thermal_radiation_rate_factors"]],
  ["chemical_change", "Chemical change", "化学变化", ["chemical_change_particle_conservation", "word_equations_reaction_types"]],
  ["ecosystem_interactions", "Ecosystem interactions and cycling", "生态相互作用与物质循环", ["ecosystem_factors_adaptation_interactions", "decomposers_nutrient_cycle"]],
  ["current_effects", "Effects of electric current", "电流的效应", ["current_chemical_heating_effects", "current_magnetic_effect"]],
  ["digestion", "Human digestion", "人体消化", ["digestive_system_structure_process", "digestion_products_cellular_use"]],
  ["transport", "Transport in living things", "生物体内的运输", ["multicellular_transport_blood_exchange", "plant_diffusion_transport"]],
  ["reproductive_foundations", "Human reproductive foundations", "人类生殖基础", ["sexual_reproduction_heredity_anatomy", "puberty_menstrual_cycle"]],
  ["reproductive_health", "Reproductive health", "生殖健康", ["contraception_mechanisms", "sti_consequences_treatment"]],
];

const EDGES = [
  ["elements_compounds", "mixtures_solutions", "区分混合物前需要先理解元素与化合物作为纯物质类别及其性质边界。"],
  ["physical_properties_density", "separation_principles", "依据物理性质选择分离方法，需要先能识别和比较相关性质。"],
  ["mixtures_solutions", "separation_principles", "分离混合物前需要先辨认组分、溶液与悬浊液的组成关系。"],
  ["separation_principles", "separation_applications", "评价水处理等应用前需要先理解各分离方法利用的性质差异。"],
  ["ray_model_reflection", "refraction_dispersion", "用射线表示折射和色散路径，需要先掌握射线模型的方向与画法。"],
  ["typical_cell_structure_function", "multicellular_organisation_labour", "理解细胞分工及结构层级需要先能联系典型细胞结构与功能。"],
  ["particle_model_states", "particle_model_thermal_changes", "用粒子运动解释熔化、沸腾和热胀冷缩，需要先掌握三态粒子排列与运动。"],
  ["atomic_identity_mass", "molecules_formula_reading", "理解分子和化学式中的原子种类，需要先掌握原子与元素身份。"],
  ["force_effects_energy_transfer", "solid_atmospheric_liquid_pressure", "压强是力在面积上的作用结果，解释压强情境前需先理解力的效应。"],
  ["heat_transfer_mechanisms", "thermal_radiation_rate_factors", "分析表面和温度对辐射速率的影响，需要先区分辐射与传导、对流。"],
  ["chemical_change_particle_conservation", "word_equations_reaction_types", "用文字方程式表示并分类反应前，需要先理解新物质形成、原子重排和质量守恒。"],
  ["ecosystem_factors_adaptation_interactions", "decomposers_nutrient_cycle", "解释分解者在生态系统中的循环作用，需要先理解环境因素与群落相互作用。"],
  ["digestive_system_structure_process", "digestion_products_cellular_use", "解释消化产物的细胞用途前，需要先理解消化、吸收和系统各部分的作用。"],
  ["sexual_reproduction_heredity_anatomy", "puberty_menstrual_cycle", "描述月经周期中各部分的作用，需要先认识生殖系统结构及基本功能。"],
  ["sexual_reproduction_heredity_anatomy", "contraception_mechanisms", "解释避孕方法中断何种过程或器官功能，需要先掌握生殖结构与受精过程。"],
];

const gaps = readJson(paths.gaps);
const mappings = readJson(paths.mappings);
const registry = readJson(paths.registry);
if (gaps.candidates.length !== 62) throw new Error(`Expected 62 lower-science gaps, got ${gaps.candidates.length}`);

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
const nodeBySpecKey = new Map(createdNodes.map((node) => [node.id.replace(/^sg_lss_science_/, ""), node]));

const grouped = new Set();
const topicNodes = TOPICS.map(([topicKey, name, nameZh, specKeys], topicIndex) => {
  if (specKeys.length < 2 || specKeys.length > 3) throw new Error(`Topic ${topicKey} must contain 2-3 concepts`);
  const concepts = specKeys.map((specKey, conceptIndex) => {
    const node = nodeBySpecKey.get(specKey);
    if (!node) throw new Error(`Topic ${topicKey} references missing concept ${specKey}`);
    if (grouped.has(specKey)) throw new Error(`Concept ${specKey} appears in multiple topics`);
    grouped.add(specKey);
    node.topic = `sg_lss_science_topic_${topicKey}`;
    node.default_order = conceptIndex + 1;
    return node;
  });
  return {
    id: `sg_lss_science_topic_${topicKey}`,
    kind: "topic",
    name,
    name_zh: nameZh,
    topic: null,
    default_order: topicIndex + 1,
    evidence_refs: uniqueEvidence(concepts.flatMap((node) => node.evidence_refs)),
    review_status: "needs_review",
  };
});
if (grouped.size !== createdNodes.length) {
  throw new Error(`Ungrouped concepts: ${[...nodeBySpecKey.keys()].filter((key) => !grouped.has(key)).join(", ")}`);
}

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
  subject: "Science",
  jurisdictions: ["SG"],
  source_ids: unique(createdNodes.flatMap((node) => node.evidence_refs.map((ref) => ref.source_id))),
  review_status: "needs_review",
  changelog: [{
    version: "0.1.0",
    date: TODAY,
    summary_zh: "根据 MOE 159 条学习成果审查建立 32 个最小可诊断概念；每个概念同时登记官方课程与开放学科教材证据。",
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
  const refs = uniqueEvidence(nodes.flatMap((node) => node.evidence_refs));
  const resolution = {
    gap_id: candidate.gap_id,
    resolution_action: "add_or_alias_concepts",
    canonical_ids: nodes.map((node) => node.canonical_id),
    created_node_ids: nodes.map((node) => node.id),
    practice_ids: [],
    rationale_zh: `把相近学习成果合并到 ${nodes.length} 个可独立出题诊断、但不过度切碎的低年级概念；未保留只部分匹配或捆绑高级内容的旧 canonical。`,
    evidence_refs: refs,
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
    mapping.rationale_zh = `经全库反向查重、年龄段边界和成果粒度复核，现由 ${resolution.canonical_ids.join("、")} 完整覆盖；新节点仍待人工批准。`;
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
  summary_zh: "将 62 项知识缺口解析为 32 个低年级科学概念；80 项 Core Ideas 均达到 full，79 项实践和价值要求继续保持 excluded。",
});

const resolutionSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  resolution_set_id: "cgr_sg_moe_lower_secondary_g2_g3_science_2021_outcomes",
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
    summary_zh: "完成 62 项低年级科学知识缺口的反向查重、概念归并、稳定 ID 和双类证据登记。",
  }],
  resolutions,
};

const targets = new Set(edges.map((edge) => edge.to));
const roots = createdNodes.filter((node) => !targets.has(node.id));
const reviewLines = [
  "# 新加坡 G2/G3 初中科学 KG 缺口实施与人工式复核（中文）",
  "",
  `- 复核日期：${TODAY}`,
  `- 官方学习成果：${mappings.mappings.length} 项（80 项知识、79 项实践与价值要求）`,
  `- 完整知识覆盖：${mappings.mappings.filter((mapping) => mapping.coverage_status === "full").length} 项`,
  `- 实践与价值分流：${mappings.mappings.filter((mapping) => mapping.coverage_status === "excluded").length} 项`,
  `- 新图：${createdNodes.length} 个 Concept，${topicNodes.length} 个 Topic，${edges.length} 条待审先修边`,
  `- 入口概念：${roots.length} 个；未用课程主题顺序伪造先修关系。`,
  "- 审核状态：全部保持 `needs_review`；本轮不写入 human approval。",
  "",
  "## 本轮纠正",
  "",
  "- 纠正旧汇总：官方表格实际为 80 项 Core Ideas、46 项 Practices、33 项 Values/Ethics/Attitudes，总计 159 项，不是 81 项知识成果。",
  "- 把 79 项科学实践与价值要求从掌握度概念中分流，按主题归并成可观察教学与评测任务。",
  "- 保留所有星号成果的 G2 可选边界；G3 仍在范围内，不能统一删掉或统一设为必修。",
  "- 将 62 个条目级缺口归并为 32 个诊断概念，避免一条句子一个节点，也没有以主题级大包掩盖可测差异。",
  "- 新概念不复用只部分匹配、捆绑高阶内容或违反官方排除边界的旧 canonical；18 项精确既有概念映射保持复用。",
  "- 每个新概念至少含一条 MOE 官方课程证据和一条开放学科教材证据。",
  "- 删除纯课程顺序型候选边；只保留 15 条有学理依赖理由的软先修边。",
  "",
  "## 概念抽查清单",
  "",
];
for (const spec of CONCEPT_SPECS) {
  const node = nodeBySpecKey.get(spec.key);
  reviewLines.push(
    `### ${node.name_zh}`,
    "",
    `- 节点：\`${node.id}\` / \`${node.canonical_id}\``,
    `- 解析缺口：${spec.gapKeys.map((key) => `\`${GAP_PREFIX}${key}\``).join("、")}`,
    `- 边界：${node.description}`,
    `- 证据：${node.evidence_refs.map((ref) => `${ref.locator}（\`${ref.source_id}\`）`).join("；")}`,
    "- 复核结论：未发现语义等价且年龄段、排除项和诊断粒度均一致的既有 canonical；新增节点不自动批准。",
    "",
  );
}

writeJson(paths.graph, graph);
writeJson(paths.registry, registry);
writeJson(paths.mappings, mappings);
writeJson(paths.resolutions, resolutionSet);
mkdirSync(dirname(paths.review), { recursive: true });
writeFileSync(paths.review, `${reviewLines.join("\n")}\n`);

process.stdout.write(`[apply-sg-lower-science-resolutions] ${resolutions.length} gaps -> ${createdNodes.length} concepts, ${topicNodes.length} topics, ${edges.length} edges; ${roots.length} roots\n`);
