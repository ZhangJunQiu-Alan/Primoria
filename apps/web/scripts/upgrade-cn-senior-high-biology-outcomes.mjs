#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const TODAY = "2026-07-19";
const paths = {
  framework: resolve(ROOT, "data/knowledge-graphs/curricula/frameworks/cn_moe_senior_high_biology_2020.json"),
  mapping: resolve(ROOT, "data/knowledge-graphs/curricula/mappings/pending/cn_moe_senior_high_biology_2020.json"),
  gaps: resolve(ROOT, "data/knowledge-graphs/curricula/gaps/pending/cn_moe_senior_high_biology_2020_outcomes.json"),
  practices: resolve(ROOT, "data/knowledge-graphs/pedagogy/practices/cn_moe_senior_high_biology_2020.json"),
};

const SOURCE_ID = "src_cn_moe_senior_high_biology_2020";
const levels = {
  rc: { label: "Required: Molecules and Cells", labelZh: "必修·分子与细胞" },
  rg: { label: "Required: Genetics and Evolution", labelZh: "必修·遗传与进化" },
  sh: { label: "Selective required: Homeostasis and Regulation", labelZh: "选择性必修·稳态与调节" },
  se: { label: "Selective required: Biology and Environment", labelZh: "选择性必修·生物与环境" },
  sb: { label: "Selective required: Biotechnology and Engineering", labelZh: "选择性必修·生物技术与工程" },
};

const C = {
  water: "pc_63dfa087168bfb9834409155d515790e",
  carbohydrates: "pc_d2d44c20526a3ef06addda76bd0c3a1a",
  lipids: "pc_a25a3778f32928001d458246f6e48696",
  proteins: "pc_e6ccc14f032828a2848774a7431ee682",
  monomers: "pc_fa5e5c389a8f790944f2e6049357654b",
  dna: "pc_6a00c0df14c5b18459964bd5ccb5c243",
  rna: "pc_7c8644ecf9e964364af575d584241cf8",
  virus: "pc_a5f0cc3dc0636e18a4fef67d49bec23e",
  membrane: "pc_5ff2cda97c05cbe449e6d6bcff0c0834",
  organelles: "pc_cb341a51c60bb212ac55750a84630c03",
  prokaryotes: "pc_73b46a23c7b4bbe42eefc3cac483d36a",
  passive: "pc_c2e6fec2c47cd86ee9b8726b908a7a8b",
  active: "pc_0e1132fcaae68d745353f67bc9411890",
  enzyme: "pc_eb22ca391770b29f75a2f022a09e31af",
  enzymeFactors: "pc_564bc6d850ae2725515787c450597c10",
  atp: "pc_bd16e15b61962db0c5d04fea198cb45c",
  light: "pc_04f61e525cd19d1f02e6846892d426c8",
  calvin: "pc_4b41c3d012fb26c23a16100b7cbafcd5",
  glycolysis: "pc_2fbda0110630d41f4792066ddae82f27",
  krebs: "pc_ae13d4aab464e4aaeeb019b31d5433b1",
  oxidative: "pc_f9019fae31d0d89640aa7147bd1511ba",
  mitosis: "pc_e8a318724c6c8e8096b98fc763ca69c6",
  geneControl: "pc_56602e952c30d81d754e3900e34590cf",
  transcription: "pc_7674a139c06bd613155a2e3818756eb6",
  translation: "pc_5f5a971454fc73259add3a98f4ad69cd",
  replication: "pc_04b4d91c6cced626ffbf487f19cdfefe",
  chromosomes: "pc_41f9701a3bd0fb4527df662b596620b5",
  meiosis: "pc_9a64e0d9f35ef30bda722f5b7364e0c4",
  crosses: "pc_0a20187ab8711d84834ffc5e887d019b",
  mutation: "pc_aa917911c35a5a84a131d3c4b99b89af",
  linkage: "pc_cf480d2c17869e9f06f3980b2bd57ea2",
  variation: "pc_592a494ab52d102d4cb731b24a77b320",
  naturalSelection: "pc_a87eb54cbeafebfc2ba275effe0eaa14",
  speciation: "pc_1ff54d59bd08ce31d146088b725569e6",
  hardy: "pc_f0a830e611bfffffd41f5757e75d4804",
  homeostasis: "pc_2a9c578569ae3d146bdaf824188b711a",
  nervous: "pc_944f33c2a947e2a2f5d42856cb825a4a",
  synapses: "pc_0df40f95b0a4b28f4ac9880528a91fde",
  hormonal: "pc_c7f7ea6f7ce0f78324c900821216e75c",
  glucose: "pc_6f2fdad0698885c810176f4c7f506bae",
  kidney: "pc_dc1ea419f7f0124901b64a622aee0648",
  lungs: "pc_023dd94962e430b671d1014972b54342",
  bloodVessels: "pc_ff5a585bec0e26749bef92e5b2ec6c2c",
  co2: "pc_c9fd444d9acfb11faef011f5755c1418",
  immune: "pc_b396f7788c77baeecc089eeec83538e5",
  antibodies: "pc_4e3f76f101debb1e241b0bab776e4cf1",
  plantResponses: "pc_ec9ed2577284952c142079dc7a389627",
  aba: "pc_e8352e234d2f8fb344dafcdbd894f99e",
  ecosystems: "pc_ecfaff613c7086e0cece6014f44b68ba",
  biodiversity: "pc_ff6c4a398294b049cadd95acd7c8ace2",
  conservation: "pc_aa24b4324d962f7ab29f0ddeb0f63405",
  geneTech: "pc_0185ccac3ad47cd14f266d12099ab528",
  geneApplications: "pc_30f178143e2c42de28b6d054fb8f8e88",
};

const outcomes = [];
const practices = [];
const locator = (level, code, page) => `生物学标准PDF p.${page}（正文对应内容要求 ${code.replace(/[a-z]$/, "")}），${levels[level].labelZh}`;
const add = (level, code, page, key, title, titleZh, descriptionZh, canonicalIds, coverage) => {
  outcomes.push({
    requirement_id: `req_cn_sh_bio_2020_o_${level}_${code.replaceAll(".", "_")}_${key}`,
    parent_requirement_id: null,
    code: `${levels[level].labelZh}·${code}`,
    title,
    title_zh: titleZh,
    summary_zh: descriptionZh,
    requirement_type: "knowledge",
    level_id: level,
    cognitive_processes: ["understand", "apply"],
    evidence_refs: [{ source_id: SOURCE_ID, locator: locator(level, code, page) }],
    review_status: "needs_review",
    canonicalIds,
    coverage,
  });
};
const practice = (level, code, page, key, title, titleZh, descriptionZh, practiceType) => {
  const requirementId = `req_cn_sh_bio_2020_o_${level}_${code.replaceAll(".", "_")}_${key}`;
  outcomes.push({
    requirement_id: requirementId,
    parent_requirement_id: null,
    code: `${levels[level].labelZh}·${code}`,
    title,
    title_zh: titleZh,
    summary_zh: descriptionZh,
    requirement_type: "practice",
    level_id: level,
    cognitive_processes: ["evaluate", "communicate"],
    evidence_refs: [{ source_id: SOURCE_ID, locator: locator(level, code, page) }],
    review_status: "needs_review",
    canonicalIds: [],
    coverage: "excluded",
  });
  practices.push({
    practice_id: `practice_cn_sh_bio_2020_${level}_${code.replaceAll(".", "_")}_${key}`,
    requirement_ids: [requirementId],
    name: title,
    name_zh: titleZh,
    kind: practiceType === "values_and_responsibility" ? "assessment_task" : practiceType,
    description_zh: descriptionZh,
    instructional_use_zh: "以真实生物学与社会情境组织证据阅读、立场辨析和责任决策，要求区分事实判断、价值判断和可执行行动。",
    assessment_evidence_zh: "提交基于课标事实和可核验资料的立场说明、理由、影响分析或行动方案；不能仅以口号替代证据与推理。",
    evidence_refs: [{ source_id: SOURCE_ID, locator: locator(level, code, page) }],
    review_status: "needs_review",
  });
};

// Required: Molecules and Cells.
add("rc", "1.1.1", 21, "cellular_elements_carbon_skeletons", "Cellular elements and carbon skeletons", "细胞元素与碳链骨架", "说明细胞主要元素如何以碳链为骨架形成复杂生物大分子。", [C.monomers], "partial");
add("rc", "1.1.2", 21, "cellular_water", "Water in cells", "细胞中的水", "说明自由水和结合水赋予细胞的特性及其生命活动作用。", [C.water], "full");
add("rc", "1.1.3", 21, "cellular_inorganic_salts", "Inorganic salts in cells", "细胞中的无机盐", "举例说明少量无机盐对细胞生命活动的重要作用。", [], "unmapped");
add("rc", "1.1.4", 21, "carbohydrate_roles", "Cellular roles of carbohydrates", "糖类的结构与供能作用", "概述糖类类型及其作为结构成分和主要能源物质的作用。", [C.carbohydrates], "full");
add("rc", "1.1.5", 21, "lipid_roles", "Cellular roles of lipids", "脂质的结构与功能作用", "举例说明不同脂质维持细胞结构和功能的作用。", [C.lipids], "full");
add("rc", "1.1.6", 21, "protein_structure_function", "Protein structure and function", "蛋白质结构与功能", "说明氨基酸序列、空间结构与蛋白质功能之间的关系。", [C.proteins, C.monomers], "full");
add("rc", "1.1.7", 21, "nucleic_acids_information", "Nucleic acids and information", "核酸与遗传信息", "概述核苷酸聚合形成核酸及其储存和传递遗传信息的功能。", [C.dna, C.rna, C.monomers], "full");
add("rc", "1.2.1", 22, "plasma_membrane_functions", "Plasma-membrane functions", "质膜的边界、运输与交流功能", "说明质膜分隔环境、控制物质进出并参与细胞间信息交流。", [C.membrane], "partial");
add("rc", "1.2.2", 22, "organelle_functions", "Organelle functions", "细胞器分工", "说明细胞器在运输、合成、分解、能量转换和信息传递中的分工。", [C.organelles], "full");
add("rc", "1.2.3", 22, "nucleus_genetic_information", "Nucleus and genetic information", "细胞核与遗传信息", "说明真核细胞遗传信息主要储存在细胞核中。", [C.dna, C.organelles], "partial");
add("rc", "1.2.4", 22, "organelle_coordination", "Coordination among cell structures", "细胞结构的协调合作", "说明细胞各部分相互联系、协调执行生命活动。", [C.organelles], "partial");
add("rc", "1.3.1", 22, "cellular_unity_diversity", "Cellular unity and diversity", "细胞结构统一性与形态功能多样性", "比较单细胞和多细胞生物的细胞结构共性及形态功能差异。", [], "unmapped");
add("rc", "1.3.2", 22, "prokaryotic_eukaryotic_cells", "Prokaryotic and eukaryotic cells", "原核细胞与真核细胞", "以是否具有核膜包被的细胞核区分原核细胞与真核细胞。", [C.prokaryotes, C.organelles], "full");
add("rc", "2.1.1", 22, "selective_permeability", "Selective permeability", "质膜的选择透过性", "说明质膜选择性控制不同物质通过。", [C.membrane, C.passive], "partial");
add("rc", "2.1.2", 22, "passive_active_transport", "Passive and active transport", "被动运输与主动运输", "比较顺浓度梯度的被动运输和需要能量、载体的主动运输。", [C.passive, C.active], "full");
add("rc", "2.1.3", 22, "endocytosis_exocytosis", "Endocytosis and exocytosis", "胞吞与胞吐", "说明大分子通过胞吞和胞吐进出细胞。", [], "unmapped");
add("rc", "2.2.1", 22, "enzymes_environment", "Enzymes and environmental factors", "酶及其环境影响因素", "说明酶的蛋白质本质、催化作用及温度和 pH 对活性的影响。", [C.enzyme, C.enzymeFactors, C.proteins], "full");
add("rc", "2.2.2", 22, "atp_direct_energy", "ATP as direct energy source", "ATP 是直接能源物质", "解释 ATP 如何直接驱动细胞生命活动。", [C.atp], "full");
add("rc", "2.2.3", 22, "photosynthetic_energy_conversion", "Photosynthetic energy conversion", "光合作用能量转换", "说明叶绿体将光能转换并储存在糖分子的化学能中。", [C.light, C.calvin], "full");
add("rc", "2.2.4", 23, "respiratory_energy_conversion", "Respiratory energy conversion", "细胞呼吸能量转换", "说明细胞呼吸将有机分子能量转化为生命活动可利用的能量。", [C.glycolysis, C.krebs, C.oxidative], "full");
add("rc", "2.3.1", 23, "mitosis_information_continuity", "Mitosis and genetic continuity", "有丝分裂与遗传信息连续性", "说明有丝分裂保证亲代与子代细胞遗传信息一致。", [C.mitosis], "full");
add("rc", "2.3.2", 23, "cell_differentiation", "Cell differentiation", "细胞分化", "说明细胞形态、结构和功能的特异性分化如何形成多细胞生物体。", [C.geneControl], "partial");
add("rc", "2.3.3", 23, "cell_senescence_death", "Cellular senescence and death", "细胞衰老与死亡", "说明正常细胞衰老和死亡是自然生理过程。", [], "unmapped");

// Required: Genetics and Evolution.
add("rg", "3.1.1", 25, "gene_nucleic_acid_segment", "Genes as nucleic-acid segments", "基因是核酸功能片段", "说明多数生物基因位于 DNA，部分病毒基因位于 RNA。", [C.dna, C.rna, C.virus], "partial");
add("rg", "3.1.2", 25, "dna_structure_information", "DNA structure and encoded information", "DNA 结构与遗传信息编码", "说明 DNA 双螺旋、反向平行和碱基互补配对如何承载遗传信息。", [C.dna], "full");
add("rg", "3.1.3", 25, "semiconservative_replication", "Semiconservative DNA replication", "DNA 半保留复制", "概述 DNA 的半保留复制。", [C.replication], "full");
add("rg", "3.1.4", 25, "gene_expression_traits", "Gene expression and traits", "遗传信息表达、分化与性状", "说明转录和翻译、基因选择性表达以及蛋白质与性状的关系。", [C.transcription, C.translation, C.geneControl], "full");
add("rg", "3.1.5", 25, "epigenetic_phenomena", "Epigenetic phenomena", "表观遗传现象", "说明碱基序列不变而表型改变的表观遗传现象。", [], "unmapped");
add("rg", "3.2.1", 25, "meiotic_reduction", "Meiotic chromosome reduction", "减数分裂与染色体减半", "说明减数分裂产生染色体数量减半的精细胞或卵细胞。", [C.meiosis, C.chromosomes], "full");
add("rg", "3.2.2", 25, "gametic_inheritance", "Inheritance through gametes", "遗传信息经配子传递", "说明有性生殖中遗传信息通过配子传给子代。", [C.meiosis], "partial");
add("rg", "3.2.3", 25, "segregation_independent_assortment", "Segregation and independent assortment", "分离与自由组合", "使用基因分离和自由组合预测子代基因型与表型。", [C.crosses], "full");
add("rg", "3.2.4", 25, "sex_linked_inheritance", "Sex-linked inheritance", "伴性遗传", "说明性染色体基因的传递与性别相关联。", [], "unmapped");
add("rg", "3.3.1", 26, "mutation_sequence_changes", "Mutation as sequence change", "基因突变的序列改变", "说明碱基替换、插入或缺失如何改变基因序列。", [C.mutation], "full");
add("rg", "3.3.2", 26, "mutation_protein_function", "Mutation, protein and cell function", "突变、蛋白质与细胞功能", "说明基因序列改变可能影响蛋白质、细胞功能和个体生存。", [C.mutation, C.translation], "full");
add("rg", "3.3.3", 26, "mutagens_cancer", "Mutagens and cancer", "诱变因素与癌变", "说明化学物质、射线和病毒可能提高突变概率，部分突变导致分裂失控。", [C.mutation], "partial");
add("rg", "3.3.4", 26, "meiotic_recombination", "Meiotic recombination", "减数分裂中的基因重组", "说明自由组合和交叉互换如何导致基因重组和子代变异。", [C.meiosis, C.linkage], "full");
add("rg", "3.3.5", 26, "chromosomal_variation", "Chromosomal variation", "染色体结构与数量变异", "说明染色体结构和数量变异可能改变性状甚至导致死亡。", [C.chromosomes, C.variation], "partial");
add("rg", "3.3.6", 26, "genetic_disease_screening", "Genetic-disease screening and prevention", "人类遗传病检测与预防", "举例说明人类遗传病的检测和预防。", [], "unmapped");
add("rg", "4.1.1", 26, "common_ancestry_fossil_anatomy", "Evidence from fossils and comparative anatomy", "化石、比较解剖与胚胎学的共同祖先证据", "使用化石、比较解剖和胚胎学事实说明共同祖先。", [], "unmapped");
add("rg", "4.1.2", 26, "common_ancestry_cell_molecular", "Cellular and molecular evidence of common ancestry", "细胞与分子层面的共同祖先证据", "使用代谢和 DNA 结构功能共性说明共同祖先。", [], "unmapped");
add("rg", "4.2.1", 26, "heritable_advantage", "Heritable variation and advantage", "可遗传变异与适合度优势", "说明某些可遗传变异在特定环境中带来生存和繁殖优势。", [C.variation, C.naturalSelection], "full");
add("rg", "4.2.2", 26, "selection_frequency_change", "Selection and frequency change", "选择导致性状频率变化", "说明优势性状个体在种群中的比例随选择而增加。", [C.naturalSelection, C.hardy], "full");
add("rg", "4.2.3", 26, "adaptation_natural_selection", "Adaptation by natural selection", "自然选择与适应", "说明自然选择促进种群适应特定环境。", [C.naturalSelection], "full");
add("rg", "4.2.4", 26, "modern_evolutionary_theory", "Modern evolutionary theory", "现代生物进化理论", "概述以自然选择为核心的现代生物进化理论。", [C.variation, C.naturalSelection, C.hardy], "full");
add("rg", "4.2.5", 26, "speciation_variation_selection_isolation", "Variation, selection, isolation and speciation", "变异、选择、隔离与物种形成", "说明变异、选择和隔离如何导致新物种形成。", [C.variation, C.naturalSelection, C.speciation], "full");

// Selective required: Homeostasis and Regulation.
add("sh", "1.1.1", 29, "internal_environment_fluids", "Internal-environment fluids", "内环境的细胞外液组成", "说明血浆、组织液和淋巴等细胞外液共同构成内环境。", [], "unmapped");
add("sh", "1.1.2", 29, "internal_external_exchange", "Exchange through the internal environment", "细胞经内环境与外界交换", "说明细胞通过内环境与外界交换并参与内环境维持。", [], "unmapped");
add("sh", "1.1.3", 29, "organ_system_exchange", "Organ systems in material exchange", "器官系统参与内外环境物质交换", "说明呼吸、消化、循环和泌尿系统如何参与内外环境交换。", [C.lungs, C.bloodVessels, C.kidney], "partial");
add("sh", "1.2.1", 29, "homeostatic_variables", "Homeostatic variables", "血糖、体温、pH 与渗透压稳态", "以血糖、体温、pH 和渗透压说明内环境相对稳定。", [C.homeostasis, C.glucose, C.kidney], "full");
add("sh", "1.2.2", 29, "organ_coordination_homeostasis", "Organ coordination in homeostasis", "器官系统协调维持稳态", "说明器官和系统协调是维持内环境稳态的基础。", [C.homeostasis], "full");
add("sh", "1.3.1", 29, "reflex_arc", "Reflexes and the reflex arc", "反射与反射弧", "说明条件和非条件反射及反射弧结构。", [], "unmapped");
add("sh", "1.3.2", 29, "resting_action_potentials", "Resting and action potentials", "静息电位、动作电位与传导", "说明神经细胞静息电位、动作电位及沿神经纤维传导。", [C.nervous], "full");
add("sh", "1.3.3", 29, "chemical_synaptic_transmission", "Chemical synaptic transmission", "突触的化学传递", "说明神经冲动通常在突触处通过化学方式传递。", [C.synapses], "full");
add("sh", "1.3.4", 29, "central_nervous_hierarchy", "Coordination of spinal and brain centres", "脊髓与脑高级中枢协调", "说明低级和高级神经中枢协调调控器官和系统。", [C.nervous], "partial");
add("sh", "1.3.5", 29, "autonomic_nervous_regulation", "Autonomic nervous regulation", "自主神经调节内脏", "说明中枢神经系统通过自主神经调节内脏活动。", [], "unmapped");
add("sh", "1.3.6", 29, "cortical_higher_activity", "Cortical higher nervous activity", "大脑皮层高级神经活动", "说明语言活动和条件反射由大脑皮层控制。", [], "unmapped");
add("sh", "1.4.1", 30, "endocrine_system", "Endocrine-system organisation", "内分泌系统组成", "识别主要内分泌腺及其激素调节作用。", [C.hormonal], "partial");
add("sh", "1.4.2", 30, "hormonal_feedback_hierarchies", "Hormonal feedback and hierarchical control", "激素的分级与反馈调节", "说明激素分级和反馈调节维持甲状腺与血糖稳态。", [C.hormonal, C.glucose], "full");
add("sh", "1.4.3", 30, "neuroendocrine_coordination", "Neuroendocrine coordination", "神经与体液调节协调", "说明神经和体液调节共同维持体温与水盐平衡。", [C.nervous, C.hormonal, C.kidney], "partial");
add("sh", "1.4.4", 30, "humoral_respiratory_regulation", "Humoral regulation of breathing", "体液成分调节呼吸", "说明二氧化碳等体液成分参与呼吸运动调节。", [C.co2, C.lungs], "partial");
add("sh", "1.5.1", 30, "immune_system_components", "Immune-system components", "免疫系统的结构与物质基础", "说明免疫细胞、器官和活性物质构成免疫调节基础。", [C.immune, C.antibodies], "full");
add("sh", "1.5.2", 30, "innate_adaptive_immunity", "Innate and adaptive immunity", "非特异性与特异性免疫", "比较先天非特异性免疫和后天特异性免疫。", [C.immune], "partial");
add("sh", "1.5.3", 30, "humoral_cellular_immunity", "Humoral and cellular immunity", "体液免疫与细胞免疫", "说明特异性免疫通过体液免疫和细胞免疫应答特定病原体。", [C.immune, C.antibodies], "full");
add("sh", "1.5.4", 30, "immune_disorders", "Immune disorders", "免疫功能异常与疾病", "比较过敏、自身免疫病、艾滋病和先天免疫缺陷。", [], "unmapped");
add("sh", "1.6.1", 30, "auxin_dual_effects", "Auxin discovery and dual effects", "生长素发现与两重性", "说明生长素的发现及其促进或抑制生长的两重性。", [C.plantResponses], "partial");
add("sh", "1.6.2", 30, "plant_hormone_coordination", "Coordination among plant hormones", "植物激素的协同与拮抗", "说明主要植物激素通过协同或拮抗共同调节生命活动。", [C.plantResponses, C.aba], "full");
add("sh", "1.6.3", 31, "plant_growth_regulator_applications", "Applications of plant growth regulators", "植物激素及类似物的生产应用", "说明主要植物激素及类似物在生产中的应用。", [C.plantResponses, C.aba], "partial");
add("sh", "1.6.4", 31, "environmental_plant_regulation", "Environmental regulation of plants", "光、重力和温度调节植物活动", "说明光、重力和温度等非激素因素参与植物生命活动调节。", [C.plantResponses], "full");

// Selective required: Biology and Environment.
add("se", "2.1.1", 33, "population_characteristics", "Population characteristics", "种群特征", "说明种群密度、出生死亡率、迁入迁出率、年龄结构和性别比例。", [], "unmapped");
add("se", "2.1.2", 33, "population_growth_models", "Population-growth models", "种群数量变化模型", "建立数学模型解释种群数量变动。", [], "unmapped");
add("se", "2.1.3", 33, "population_limiting_factors", "Factors affecting populations", "种群特征的生物与非生物影响因素", "说明非生物因素和种间作用如何影响种群特征。", [C.ecosystems], "partial");
add("se", "2.1.4", 33, "community_structure", "Community structure", "群落垂直、水平结构及时间变化", "描述群落的垂直和水平结构及其时间变化。", [C.ecosystems], "partial");
add("se", "2.1.5", 33, "ecological_succession", "Ecological succession", "初生演替与次生演替", "说明群落演替及初生、次生演替的区别。", [], "unmapped");
add("se", "2.1.6", 33, "community_adaptations", "Adaptations within communities", "群落生物的适应特征", "分析群落生物与环境相适应的形态、生理和分布特点。", [C.ecosystems, C.naturalSelection], "full");
add("se", "2.2.1", 33, "ecosystem_components", "Ecosystem components", "生态系统组成与统一结构", "说明生产者、消费者、分解者和非生物因素构成生态系统。", [C.ecosystems], "full");
add("se", "2.2.2", 33, "food_chains_webs", "Food chains and food webs", "食物链与食物网", "说明生产者和消费者通过食物链、食物网形成营养结构。", [], "unmapped");
add("se", "2.2.3", 33, "matter_cycles_energy_flow", "Matter cycling and energy flow", "物质循环与能量流动", "说明物质循环、能量单向流动和逐级递减规律。", [], "unmapped");
add("se", "2.2.4", 33, "ecological_resource_use", "Ecological resource use", "生态规律与资源利用", "应用物质循环和能量流动规律提高生态资源利用效率。", [C.ecosystems, C.conservation], "partial");
add("se", "2.2.5", 34, "ecological_pyramids", "Ecological pyramids", "数量、生物量和能量金字塔", "说明生态金字塔如何表征营养级数量、生物量和能量关系。", [], "unmapped");
add("se", "2.2.6", 34, "biomagnification", "Biomagnification", "食物链中的有害物质富集", "说明有害物质沿食物链不断富集。", [], "unmapped");
add("se", "2.2.7", 34, "ecosystem_information_transfer", "Information transfer in ecosystems", "生态系统信息传递", "说明物理、化学和行为信息对生命活动、繁衍和种间关系的作用。", [], "unmapped");
add("se", "2.2.8", 34, "trophic_structure_factors", "Determinants of trophic structure", "营养结构的生物与非生物决定因素", "分析特定生态系统的生物和非生物因素如何决定营养结构。", [C.ecosystems], "partial");
add("se", "2.3.1", 34, "ecosystem_stability", "Ecosystem stability", "生态系统稳定性", "说明生态系统保持或恢复结构功能和动态平衡的能力。", [], "unmapped");
add("se", "2.3.2", 34, "ecosystem_disturbances", "Ecosystem disturbances", "生态系统干扰因素", "说明气候、自然事件、人类活动和外来物种对稳定性的影响。", [C.ecosystems], "partial");
add("se", "2.3.3", 34, "ecosystem_self_regulation", "Ecosystem self-regulation", "生态系统自我调节", "说明生态系统在一定干扰限度内通过自我调节维持稳定。", [], "unmapped");
add("se", "2.4.1", 34, "population_environment_pressure", "Population pressure on the environment", "人口增长的环境压力", "说明人口增长如何对环境造成压力。", [], "unmapped");
add("se", "2.4.2", 34, "global_environmental_change", "Global environmental change", "全球环境问题与生物圈稳态", "说明气候、水资源、臭氧、酸雨、荒漠化和污染对生物圈与人的影响。", [C.conservation], "partial");
add("se", "2.4.3", 34, "biodiversity_importance", "Importance of biodiversity", "生物多样性的生态与社会价值", "说明生物多样性对生态稳定和人类发展的重要性。", [C.biodiversity, C.conservation], "full");
add("se", "2.4.4", 34, "ecological_engineering_circularity", "Ecological engineering and circularity", "生态工程与资源循环利用", "说明依据生态学原理和系统工程实现资源多层次循环利用。", [C.ecosystems, C.conservation], "partial");
practice("se", "2.4.5", 34, "environmental_responsibility", "Environmental responsibility", "从我做起的环境保护意识", "形成个人参与环境保护的责任意识。", "values_and_responsibility");

// Selective required: Biotechnology and Engineering.
add("sb", "3.1.1", 36, "sterilisation_microbe_culture", "Sterilisation for pure culture", "纯培养中的灭菌", "说明灭菌是获得纯净微生物培养物的前提。", [], "unmapped");
add("sb", "3.1.2", 36, "aseptic_technique", "Aseptic technique", "无菌技术", "说明操作中保持无菌物品和区域不被污染的技术。", [], "unmapped");
add("sb", "3.1.3", 36, "selective_culture_media", "Selective culture media", "培养基配方与目的培养", "说明调整培养基配方可有目的地培养微生物。", [], "unmapped");
add("sb", "3.1.4", 36, "microbial_isolation_methods", "Microbial isolation methods", "平板划线与稀释涂布分离", "比较平板划线法和稀释涂布平板法的分离纯化用途。", [], "unmapped");
add("sb", "3.1.5", 36, "microbial_counting_methods", "Microbial counting methods", "稀释涂布与显微镜计数", "比较稀释涂布平板法和显微镜计数法测定微生物数量。", [], "unmapped");
add("sb", "3.2.1", 37, "traditional_fermentation", "Traditional fermentation", "传统发酵食品", "说明微生物在传统发酵食品生产中的作用。", [], "unmapped");
add("sb", "3.2.2", 37, "industrial_fermentation", "Industrial fermentation", "现代发酵工程", "说明现代工程技术利用微生物功能工业化生产产品。", [], "unmapped");
add("sb", "3.2.3", 37, "fermentation_applications", "Applications of fermentation engineering", "发酵工程应用", "说明发酵工程在医药、食品和工农业中的应用价值。", [], "unmapped");
add("sb", "4.1.1", 37, "plant_tissue_culture", "Plant tissue culture", "植物组织培养", "说明离体材料形成愈伤组织、再分化并形成完整植株的过程。", [], "unmapped");
add("sb", "4.1.2", 37, "plant_somatic_hybridisation", "Plant somatic hybridisation", "植物体细胞杂交", "说明不同植物体细胞融合并培育新植物体的技术。", [], "unmapped");
add("sb", "4.1.3", 37, "plant_cell_engineering_applications", "Applications of plant-cell engineering", "植物细胞工程应用", "说明快速繁殖、脱毒、次生代谢产物生产和育种应用。", [], "unmapped");
add("sb", "4.2.1", 37, "animal_cell_culture", "Animal cell culture", "动物细胞培养", "说明动物组织分散成细胞并在适宜条件下培养增殖的过程。", [], "unmapped");
add("sb", "4.2.2", 38, "somatic_cell_nuclear_transfer", "Somatic-cell nuclear transfer", "动物体细胞核移植", "说明体细胞核移入去核卵母细胞并发育为新个体的过程。", [C.geneTech], "partial");
add("sb", "4.2.3", 38, "animal_cell_fusion", "Animal cell fusion", "动物细胞融合", "说明物理、化学或生物手段使动物细胞融合。", [], "unmapped");
add("sb", "4.2.4", 38, "monoclonal_antibody_production", "Monoclonal-antibody production", "单克隆抗体制备", "说明细胞融合技术在单克隆抗体制备中的作用。", [C.antibodies], "partial");
add("sb", "4.2.5", 38, "stem_cell_applications", "Stem-cell applications", "干细胞的生物医学应用", "说明干细胞在生物医学工程中的应用价值。", [], "unmapped");
add("sb", "4.3.1", 38, "fertilisation_early_embryo", "Fertilisation and early embryonic development", "受精与早期胚胎发育", "说明胚胎形成经历受精和早期发育。", [], "unmapped");
add("sb", "4.3.2", 38, "embryo_engineering", "Embryo engineering", "体外受精、胚胎移植与分割", "说明体外受精、胚胎移植和胚胎分割等胚胎工程技术。", [], "unmapped");
add("sb", "5.1.1", 38, "gene_engineering_foundations", "Foundations of genetic engineering", "基因工程的学科基础", "说明基因工程建立在遗传、微生物、生化和分子生物学之上。", [C.geneTech], "full");
add("sb", "5.1.2", 38, "gene_engineering_tools", "Tools of genetic engineering", "限制酶、连接酶与载体", "说明限制性内切核酸酶、DNA 连接酶和载体的作用。", [C.geneTech], "partial");
add("sb", "5.1.3", 38, "gene_engineering_workflow", "Genetic-engineering workflow", "基因工程基本操作程序", "说明目的基因获取、载体构建、导入和检测鉴定的流程。", [C.geneTech], "full");
add("sb", "5.1.4", 38, "gene_engineering_applications", "Applications of genetic engineering", "基因工程的行业应用", "说明基因工程在农牧、食品和医药行业中的应用。", [C.geneApplications], "full");
add("sb", "5.2.1", 38, "protein_engineering_design", "Protein-engineering design", "蛋白质工程设计与改造", "说明依据基因工程原理设计、改造蛋白质以满足需求。", [], "unmapped");
add("sb", "5.2.2", 38, "protein_engineering_process", "Protein-engineering process", "蛋白质工程实现过程", "说明通过基因改造生产目标蛋白的过程。", [], "unmapped");
add("sb", "6.1.1", 38, "gmo_products", "Genetically modified products", "转基因产品实例", "识别日常生活中的转基因产品。", [C.geneApplications], "full");
add("sb", "6.1.2", 38, "gmo_impacts", "Impacts of genetically modified technology", "转基因技术影响", "比较转基因技术应用可能带来的收益、风险和社会影响。", [], "unmapped");
add("sb", "6.2.1", 38, "reproductive_cloning_ethics", "Ethics of human reproductive cloning", "生殖性克隆人的伦理问题", "说明生殖性克隆人面临的伦理问题。", [], "unmapped");
add("sb", "6.2.2", 38, "reproductive_cloning_china_policy", "China policy on reproductive cloning", "中国禁止生殖性克隆人", "说明中国不赞成、不允许、不支持、不接受生殖性克隆人实验的理由。", [], "unmapped");
add("sb", "6.3.1", 38, "biological_weapons_harms", "Harms of biological weapons", "生物武器的威胁与伤害", "说明生物武器对人类造成的严重威胁和伤害。", [], "unmapped");
practice("sb", "6.3.2", 38, "oppose_biological_weapons", "Opposition to biological weapons", "反对生物武器扩散的立场", "认同反对生物武器及其技术和设备扩散的社会责任。", "values_and_responsibility");

const framework = {
  schema_version: "2.0.0",
  content_version: "0.3.0",
  framework_id: "cfw_cn_moe_senior_high_biology_2020_outcomes",
  curriculum_id: "cur_cn_moe_senior_high_biology_2020",
  curriculum_kind: "national_standard",
  title: "China senior-high biology curriculum-standard outcome coverage",
  title_zh: "中国普通高中生物学课程标准（2017 年版 2020 年修订）成果级覆盖",
  subject: "Biology",
  jurisdiction: "CN-MAINLAND",
  education_stage: "senior_secondary",
  requirement_granularity: "outcome",
  levels: Object.entries(levels).map(([levelId, value]) => ({
    level_id: levelId,
    label: value.label,
    label_zh: value.labelZh,
  })),
  languages: ["zh-CN", "en"],
  source_ids: [SOURCE_ID],
  valid_from: "2020-05-11",
  valid_to: null,
  review_status: "needs_review",
  scope_exclusions: [],
  changelog: [
    { version: "0.1.0", date: "2026-07-18", summary_zh: "建立主题级候选框架。" },
    { version: "0.2.1", date: "2026-07-18", summary_zh: "复核主题边界并撤销未经逐项证明的完整覆盖声明。" },
    { version: "0.3.0", date: TODAY, summary_zh: "按课程标准 120 条编号内容要求建立成果级框架，并将两项纯价值立场分流至实践层。" },
  ],
  requirements: outcomes.map(({ canonicalIds, coverage, ...requirement }) => requirement),
};

const mapping = {
  schema_version: "3.0.0",
  content_version: "0.3.0",
  mapping_set_id: "cms_cn_moe_senior_high_biology_2020_outcomes",
  framework_id: framework.framework_id,
  curriculum_id: framework.curriculum_id,
  subject: framework.subject,
  mapping_scope: "outcome_coverage",
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [
    { version: "0.1.0", date: "2026-07-18", summary_zh: "建立主题级候选映射。" },
    { version: "0.2.1", date: "2026-07-18", summary_zh: "复核主题边界和跨层级误映射。" },
    { version: "0.3.0", date: TODAY, summary_zh: "替换为 120 个编号成果的保守映射。" },
  ],
  mappings: outcomes.map((outcome) => ({
    mapping_id: outcome.requirement_id.replace(/^req_/, "map_"),
    requirement_id: outcome.requirement_id,
    canonical_ids: outcome.canonicalIds,
    coverage_status: outcome.coverage,
    relation: outcome.coverage === "full" ? "required" : outcome.coverage === "partial" ? "supporting" : "not_applicable",
    mapping_basis: "semantic_inference",
    confidence: outcome.coverage === "full" || outcome.coverage === "excluded" ? "high" : outcome.coverage === "partial" ? "medium" : "low",
    rationale_zh: outcome.coverage === "full"
      ? "现有 canonical 概念组合与该诊断成果的定义和课程深度一致。"
      : outcome.coverage === "excluded"
        ? "该成果只要求形成价值立场和社会责任，不写入学科概念掌握度。"
        : outcome.coverage === "partial"
          ? "现有概念只覆盖部分定义边界，需要新增窄概念后才能独立诊断。"
          : "统一 KG 中尚无边界足够准确、可独立诊断且不捆绑超范围内容的概念。",
    evidence_refs: outcome.evidence_refs,
    review_status: "needs_review",
  })),
};

const gapCandidates = outcomes
  .filter((outcome) => outcome.coverage === "partial" || outcome.coverage === "unmapped")
  .map((outcome) => ({
    gap_id: outcome.requirement_id.replace(/^req_/, "gap_"),
    requirement_ids: [outcome.requirement_id],
    action: outcome.coverage === "partial" ? "split_or_narrow_existing" : "add_concept",
    proposed_name: outcome.title,
    proposed_name_zh: outcome.title_zh,
    scope_zh: outcome.summary_zh,
    existing_canonical_ids: outcome.canonicalIds,
    suggested_graph_id: "senior_secondary_biology",
    rationale_zh: outcome.coverage === "partial"
      ? "现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确复用。"
      : "全库未找到语义等价且粒度相同的现有概念。",
    evidence_refs: outcome.evidence_refs,
    review_status: "needs_review",
  }));

const gapSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  gap_set_id: "cgs_cn_moe_senior_high_biology_2020_outcomes",
  framework_id: framework.framework_id,
  curriculum_id: framework.curriculum_id,
  subject: framework.subject,
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [{ version: "0.1.0", date: TODAY, summary_zh: "逐成果反向查重并记录 partial 与 unmapped 缺口；纯价值立场不进入概念缺口。" }],
  candidates: gapCandidates,
};

const practiceSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  practice_set_id: "cpk_cn_moe_senior_high_biology_2020",
  framework_id: framework.framework_id,
  curriculum_id: framework.curriculum_id,
  subject: framework.subject,
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [{ version: "0.1.0", date: TODAY, summary_zh: "将纯价值立场成果分流为教学与社会责任实践。" }],
  items: practices,
};

const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};
for (const [path, value] of [[paths.framework, framework], [paths.mapping, mapping], [paths.gaps, gapSet], [paths.practices, practiceSet]]) {
  writeJson(path, value);
}

const counts = mapping.mappings.reduce((result, item) => {
  result[item.coverage_status] = (result[item.coverage_status] ?? 0) + 1;
  return result;
}, {});
process.stdout.write(`[upgrade-cn-biology] 20 official content sections -> ${outcomes.length} numbered outcomes; ${counts.full ?? 0} full, ${counts.partial ?? 0} partial, ${counts.unmapped ?? 0} unmapped, ${counts.excluded ?? 0} excluded; ${gapCandidates.length} gaps\n`);
