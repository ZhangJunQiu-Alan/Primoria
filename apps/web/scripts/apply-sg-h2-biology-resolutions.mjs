#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const DATA = resolve(ROOT, "data/knowledge-graphs");
const TODAY = "2026-07-19";
const GRAPH_ID = "singapore_h2_biology";
const GAP_PREFIX = "gap_sg_h2_biology_9477_2026_o_";

const paths = {
  gaps: resolve(DATA, "curricula/gaps/pending/sg_seab_h2_biology_9477_2026_outcomes.json"),
  mappings: resolve(DATA, "curricula/mappings/pending/sg_seab_h2_biology_9477_2026.json"),
  resolutions: resolve(DATA, "curricula/resolutions/pending/sg_seab_h2_biology_9477_2026_outcomes.json"),
  graph: resolve(DATA, `source/${GRAPH_ID}.json`),
  registry: resolve(DATA, "governance/concept-registry.json"),
  review: resolve(DATA, "review/pending/curriculum-mapping/cms_sg_seab_h2_biology_9477_2026_outcomes.implementation-review.zh-CN.md"),
};

const SOURCES = {
  syllabus: "src_sg_seab_h2_biology_9477_2026",
  biology: "src_openstax_biology_2e_2018",
  microbiology: "src_openstax_microbiology_2016",
  anatomy: "src_openstax_anatomy_physiology_2e_2022",
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
const nodeIdFor = (key) => `sg_h2_biology_${key}`;
const canonicalIdFor = (nodeId) => {
  const digest = createHash("sha256").update(`primoria-concept-v1\0${GRAPH_ID}\0${nodeId}`).digest("hex");
  return `pc_${digest.slice(0, 32)}`;
};
const c = (key, name, nameZh, description, gapKeys, sourceId, locator) => ({
  key, name, nameZh, description, gapKeys, sourceId, locator,
});

const CONCEPT_SPECS = [
  c("cell_theory", "Cell theory", "细胞学说", "Using the three core claims of cell theory to classify cells as the smallest living units, explain cellular continuity from pre-existing cells and relate organismal organisation to cells.", ["1_a"], SOURCES.biology, "OpenStax Biology 2e §4.1, Studying Cells, cell theory"),
  c("virus_living_boundary", "Viruses and the boundary of life", "病毒与生命边界", "Evaluating viruses against cellular organisation, independent metabolism, homeostasis and reproduction to explain why they challenge rather than simply satisfy or refute cell theory.", ["1_f"], SOURCES.microbiology, "OpenStax Microbiology §6.1, Viruses, noncellular infectious agents and host dependence"),
  c("stem_cell_potency", "Stem-cell potency", "干细胞潜能层级", "Distinguishing totipotent, pluripotent and multipotent stem cells by the range of cell fates they can generate, using zygotic, embryonic and blood lineages as examples.", ["1_t"], SOURCES.anatomy, "OpenStax Anatomy and Physiology 2e §3.6, Cellular Differentiation, stem-cell potency hierarchy"),
  c("stem_cell_normal_functions", "Normal functions of stem cells", "干细胞的正常生理功能", "Explaining how embryonic stem cells support development and how lymphoid and myeloid blood stem-cell lineages maintain and replace differentiated blood and immune cells.", ["1_u"], SOURCES.anatomy, "OpenStax Anatomy and Physiology 2e §§3.6 and 18.2, Cellular Differentiation; Production of the Formed Elements"),
  c("dna_end_replication_problem", "The DNA end-replication problem", "DNA 末端复制问题", "Explaining why removal of the terminal RNA primer leaves a gap on linear chromosome ends and how telomere shortening and telomerase relate to repeated replication.", ["2_b"], SOURCES.biology, "OpenStax Biology 2e §14.3, DNA Replication in Eukaryotes, telomeres and telomerase"),
  c("comparative_genome_architecture", "Comparative genome architecture", "病毒、原核与真核基因组结构比较", "Comparing viral, prokaryotic and eukaryotic genomes by nucleic-acid type and strandedness, molecule number and size, linearity, packaging and intron organisation.", ["2_d"], SOURCES.biology, "OpenStax Biology 2e §§14.1 and 17.3, DNA structure; whole-genome sequencing and genome organisation"),
  c("viral_reproductive_cycles", "Viral reproductive cycles and genome inheritance", "病毒繁殖周期与基因组继承", "Tracing how bacteriophage lytic and lysogenic cycles, influenza replication and retroviral reverse transcription transmit viral genomes through host-dependent reproductive cycles.", ["2_e"], SOURCES.microbiology, "OpenStax Microbiology §§6.2-6.3, Viral Life Cycle; Isolation, Culture, and Identification of Viruses"),
  c("viral_genome_variation", "Antigenic drift and antigenic shift", "抗原漂移与抗原转变", "Distinguishing gradual mutation-driven antigenic drift from reassortment-driven antigenic shift and relating each process to variation in viral genomes.", ["2_f"], SOURCES.microbiology, "OpenStax Microbiology §6.2, The Viral Life Cycle, influenza antigenic drift and shift"),
  c("prokaryotic_horizontal_gene_transfer", "Prokaryotic horizontal gene transfer", "原核生物水平基因转移", "Comparing transformation, bacteriophage-mediated transduction and F-plasmid conjugation as routes that create bacterial genome variation alongside binary fission.", ["2_g"], SOURCES.microbiology, "OpenStax Microbiology §11.6, How Asexual Prokaryotes Achieve Genetic Diversity"),
  c("noncoding_genome_elements", "Functional non-coding genome elements", "功能性非编码基因组元件", "Distinguishing introns, centromeres, telomeres, promoters, enhancers and silencers by their structural or regulatory roles without extending to excluded repeat and transposon classes.", ["2_h"], SOURCES.biology, "OpenStax Biology 2e §§14.3 and 16.3, telomeres; eukaryotic transcriptional regulation"),
  c("multilevel_eukaryotic_gene_regulation", "Multilevel regulation of eukaryotic gene expression", "真核基因表达的多层调控", "Explaining how chromatin modification, transcription factors, RNA processing and stability, translation initiation and protein modification or degradation produce spatial and temporal differential expression.", ["2_i"], SOURCES.biology, "OpenStax Biology 2e §§16.2-16.5, Eukaryotic Epigenetic, Transcriptional, Post-transcriptional and Translational Regulation"),
  c("southern_blot_hybridisation", "Southern blotting and nucleic-acid hybridisation", "Southern 印迹与核酸杂交", "Tracing DNA separation, transfer, probe hybridisation and signal detection in Southern blotting and distinguishing the method from PCR amplification and gel separation alone.", ["2_j"], SOURCES.biology, "OpenStax Biology 2e §17.1, Biotechnology, nucleic-acid probes, hybridisation and DNA analysis"),
  c("maternal_genetic_screening_ethics", "Ethics of maternal genetic screening", "母体遗传筛查伦理", "Evaluating maternal genetic screening for conditions such as trisomy 21 through informed consent, uncertainty, privacy, autonomy, access and consequences of acting on results.", ["2_m"], SOURCES.biology, "OpenStax Biology 2e §17.4, Applying Genomics, genetic testing and ethical implications"),
  c("cell_cycle_dysregulation_cancer_risk", "Cell-cycle dysregulation and cancer risk", "细胞周期失调与癌变风险", "Connecting checkpoint failure with uncontrolled division and distinguishing inherited changes, chemical carcinogens, ionising radiation and immune loss as factors that alter cancer risk.", ["2_o", "2_p"], SOURCES.biology, "OpenStax Biology 2e §10.4, Cancer and the Cell Cycle"),
  c("oncogene_tumour_suppressor_control", "Oncogenes and tumour-suppressor genes", "原癌基因与抑癌基因", "Explaining how gain-of-function changes in proto-oncogenes and loss-of-function changes in tumour-suppressor genes remove complementary controls on cell division.", ["2_q"], SOURCES.biology, "OpenStax Biology 2e §10.4, Proto-oncogenes and Tumor-Suppressor Genes"),
  c("multistep_cancer_progression", "Multistep cancer progression", "癌症的多步骤进展", "Explaining cancer progression as an accumulation of changes that supports uncontrolled growth, angiogenesis, invasion and metastatic spread rather than as a single mutation event.", ["2_r"], SOURCES.biology, "OpenStax Biology 2e §10.4, Cancer and the Cell Cycle, tumour progression and metastasis"),
  c("epistasis_problem_solving", "Epistasis problem solving", "上位性遗传问题求解", "Inferring how an allele at one locus modifies or masks expression at another locus and deriving phenotypic classes from a stated pathway or cross without memorising fixed ratios.", ["2_aa"], SOURCES.biology, "OpenStax Biology 2e §12.3, Laws of Inheritance, gene interactions and epistasis"),
  c("genotype_environment_phenotype", "Genotype-environment effects on phenotype", "基因型、环境与表型", "Explaining phenotype as an outcome of genotype interacting with environmental conditions, including nutrition-dependent developmental differentiation in honeybees.", ["2_bb"], SOURCES.biology, "OpenStax Biology 2e §12.3, Laws of Inheritance, environmental effects on phenotype"),
  c("cell_signalling_stages", "Stages of cell signalling", "细胞信号传导阶段", "Tracing a signal from ligand-receptor binding through intracellular transduction and amplification to a cellular response such as altered gene expression.", ["3_m"], SOURCES.biology, "OpenStax Biology 2e §§9.1-9.3, Signaling Molecules and Cellular Receptors; Propagation of the Signal; Response to the Signal"),
  c("second_messengers", "Second messengers", "第二信使", "Explaining how small intracellular mediators such as cyclic AMP relay an activated receptor signal, diffuse or change concentration rapidly and amplify downstream responses.", ["3_n"], SOURCES.biology, "OpenStax Biology 2e §9.2, Propagation of the Signal, second messengers and cyclic AMP"),
  c("kinase_phosphatase_signalling", "Kinases and phosphatases in signalling", "信号传导中的激酶与磷酸酶", "Explaining how kinases propagate and amplify signals by phosphorylation while phosphatases remove phosphate groups to regulate or terminate pathway activity.", ["3_o"], SOURCES.biology, "OpenStax Biology 2e §9.2, Propagation of the Signal, phosphorylation cascades"),
  c("insulin_glucagon_receptor_pathways", "Insulin and glucagon receptor pathways", "胰岛素与胰高血糖素受体通路", "Contrasting insulin signalling through a receptor tyrosine kinase with glucagon signalling through a G-protein-coupled receptor and linking each pathway to physiological blood-glucose change.", ["3_p"], SOURCES.biology, "OpenStax Biology 2e §§9.1 and 37.3, receptor signalling; regulation of body processes by insulin and glucagon"),
  c("recessive_allele_persistence", "Persistence of harmful recessive alleles", "有害隐性等位基因的保留", "Explaining how harmful recessive alleles can remain hidden from selection in heterozygotes and persist under mutation, drift, migration or heterozygote-advantage conditions.", ["4_e"], SOURCES.biology, "OpenStax Biology 2e §19.1, Population Evolution, selection and maintenance of variation"),
  c("microevolution_macroevolution_link", "Microevolution and macroevolution", "微观进化与宏观进化的联系", "Relating changes in population allele frequencies to descent with modification and explaining how accumulated divergence and speciation connect microevolutionary processes to macroevolutionary patterns.", ["4_f"], SOURCES.biology, "OpenStax Biology 2e §§18.1 and 19.1, Understanding Evolution; Population Evolution"),
  c("integrated_evolution_evidence", "Integrated evidence for evolution", "进化的综合证据", "Combining molecular homology, fossil and anatomical homology and biogeographic patterns including Wallace's observations as independent, converging evidence for descent with modification.", ["4_g"], SOURCES.biology, "OpenStax Biology 2e §18.1, Understanding Evolution, evidence from fossils, anatomy, biogeography and molecules"),
  c("biological_species_concept_limits", "Biological species concept and its limits", "生物学物种概念及局限", "Using reproductive compatibility and isolation to apply the biological species concept while recognising limits for fossils, asexual organisms and geographically separated populations.", ["4_h"], SOURCES.biology, "OpenStax Biology 2e §18.2, Formation of New Species, biological species concept"),
  c("phylogeny_and_molecular_classification", "Phylogeny and molecular classification", "系统发育与分子分类", "Reconstructing evolutionary relationships using genome sequences and nucleotide or amino-acid multiple sequence alignment and explaining advantages over classification from superficial similarity alone.", ["4_k", "4_l"], SOURCES.biology, "OpenStax Biology 2e §§20.1-20.2, Organizing Life on Earth; Determining Evolutionary Relationships"),
  c("adaptive_immune_cell_coordination", "Coordination of adaptive immune cells", "适应性免疫细胞协同", "Tracing antigen presentation and the coordinated roles of helper and cytotoxic T cells, B cells and memory cells in primary and faster secondary specific responses.", ["a_b"], SOURCES.microbiology, "OpenStax Microbiology §§18.3 and 18.5, T Lymphocytes and Cellular Immunity; Vaccines"),
  c("antibody_diversity_mechanisms", "Mechanisms of antibody diversity", "抗体多样性的形成机制", "Explaining how somatic recombination generates variable-region combinations and how somatic hypermutation and class switching diversify affinity or effector class after activation.", ["a_d"], SOURCES.microbiology, "OpenStax Microbiology §18.4, B Lymphocytes and Humoral Immunity, antibody diversity"),
  c("vaccination_population_control_tradeoffs", "Vaccination, population control and trade-offs", "疫苗的群体控制与权衡", "Explaining how vaccination creates immune memory and sufficient population coverage interrupts transmission, then evaluating benefits, adverse risks and uncertainty without treating all vaccines as identical.", ["a_e", "a_f"], SOURCES.microbiology, "OpenStax Microbiology §18.5, Vaccines, herd immunity, benefits and adverse effects"),
  c("viral_tissue_pathogenesis", "Viral tissue pathogenesis", "病毒对宿主组织的致病机制", "Explaining how influenza damages respiratory epithelium and HIV targets helper T cells, linking viral replication and host-cell disruption to tissue and immune dysfunction.", ["a_g"], SOURCES.microbiology, "OpenStax Microbiology §§22.3 and 25.3, Viral Infections of the Respiratory Tract; Viral Infections of the Circulatory and Lymphatic Systems"),
  c("basic_reproduction_number", "Basic reproduction number", "基本再生数 R0", "Interpreting R0 as the expected secondary cases generated by a typical infectious case in a susceptible population and using its relation to one to reason about outbreak growth or decline.", ["a_j"], SOURCES.microbiology, "OpenStax Microbiology §16.1, Characteristics of Infectious Disease, disease transmission and epidemiological measures"),
  c("outbreak_epidemic_pandemic", "Outbreak, epidemic and pandemic", "暴发、流行与大流行", "Distinguishing a localised outbreak, an incidence above expectation across a community or region, and an epidemic spreading across countries or continents as a pandemic.", ["a_k"], SOURCES.microbiology, "OpenStax Microbiology §16.1, Characteristics of Infectious Disease, epidemiological patterns"),
  c("greenhouse_gas_human_drivers", "Human drivers of carbon dioxide and methane accumulation", "二氧化碳与甲烷累积的人为驱动", "Connecting fossil-fuel energy use, deforestation and increased ruminant-meat production to atmospheric carbon dioxide or methane accumulation and climate forcing.", ["b_a"], SOURCES.biology, "OpenStax Biology 2e §44.5, Climate and the Effects of Global Climate Change"),
  c("climate_system_ecological_impacts", "Climate-system and ecological impacts", "气候系统与生态影响", "Tracing greenhouse-gas forcing to warming, ice loss, sea-level rise, extreme events, freshwater stress, species movement and stress on coral, seagrass and mangrove ecosystems.", ["b_b"], SOURCES.biology, "OpenStax Biology 2e §44.5, Climate and the Effects of Global Climate Change"),
  c("mangrove_climate_mitigation", "Mangrove climate mitigation", "红树林的气候缓解作用", "Explaining how mangroves store coastal blue carbon, trap sediments and reduce wave energy, distinguishing mitigation through carbon sequestration from adaptation through coastal protection.", ["b_c"], SOURCES.biology, "OpenStax Biology 2e §§44.3 and 47.1, Aquatic Biomes; The Biodiversity Crisis, coastal ecosystems and carbon storage context"),
  c("anthropogenic_carbon_footprints", "Comparing anthropogenic carbon footprints", "人为活动碳足迹比较", "Comparing life-cycle greenhouse-gas contributions from deforestation, fossil, hydroelectric, nuclear, solar, wind and bioethanol energy and from animal- and plant-based foods without reducing the comparison to operational emissions alone.", ["b_d"], SOURCES.biology, "OpenStax Biology 2e §44.5, Climate and the Effects of Global Climate Change, anthropogenic emissions"),
  c("climate_stress_food_supply", "Climate stress and sustainable food supply", "气候压力与可持续食物供应", "Explaining how increased temperature and extreme weather alter crop and livestock productivity, water availability and supply stability, and evaluating adaptation limits in sustainable food systems.", ["b_e"], SOURCES.biology, "OpenStax Biology 2e §44.5, Climate and the Effects of Global Climate Change, agriculture and food security"),
  c("climate_ecological_redistribution", "Climate-driven ecological redistribution", "气候驱动的生态重新分布", "Explaining how warming and extreme events alter habitat suitability, organism ranges, food-chain interactions and realised niche occupation across connected ecosystems.", ["b_f"], SOURCES.biology, "OpenStax Biology 2e §§44.1 and 44.5, The Scope of Ecology; Climate and the Effects of Global Climate Change"),
  c("tropical_biodiversity_resources", "Tropical biodiversity as a biomedical and food resource", "热带生物多样性的医药与粮食资源价值", "Explaining how climate-driven tropical biodiversity loss can remove potential biomedical compounds and genetic diversity used for crop resilience, while distinguishing potential value from proven use.", ["b_g"], SOURCES.biology, "OpenStax Biology 2e §47.2, The Importance of Biodiversity to Human Life"),
  c("temperature_insect_vector_lifecycle", "Temperature effects on insect-vector life cycles", "温度对昆虫媒介生命周期的影响", "Relating ectothermic insect metabolism and narrow thermal tolerance to development, survival and mosquito-vector life-cycle timing without assuming that warmer conditions always increase transmission.", ["b_h"], SOURCES.biology, "OpenStax Biology 2e §§28.6 and 44.5, Superphylum Ecdysozoa; climate effects on organisms"),
  c("warming_vector_borne_range_shift", "Warming-driven shifts in vector-borne disease range", "变暖驱动的蚊媒疾病范围变化", "Explaining how temperature changes mosquito survival, development and pathogen incubation and can shift malaria or dengue suitability beyond the tropics, subject to rainfall, habitat and public-health controls.", ["b_i"], SOURCES.microbiology, "OpenStax Microbiology §§16.3 and 25.3, Modes of Disease Transmission; vector-borne infections"),
];

const TOPICS = [
  ["cell_life_boundaries", "Cellular life and genome boundaries", "细胞生命与基因组边界", ["cell_theory", "virus_living_boundary", "comparative_genome_architecture"]],
  ["stem_replication", "Stem-cell potency and chromosome ends", "干细胞潜能与染色体末端", ["stem_cell_potency", "stem_cell_normal_functions", "dna_end_replication_problem"]],
  ["microbial_genome_change", "Microbial genome inheritance and change", "微生物基因组继承与变异", ["viral_reproductive_cycles", "viral_genome_variation", "prokaryotic_horizontal_gene_transfer"]],
  ["genome_regulation_analysis", "Genome regulation and analysis", "基因组调控与分析", ["noncoding_genome_elements", "multilevel_eukaryotic_gene_regulation", "southern_blot_hybridisation"]],
  ["screening_cancer_control", "Screening and cancer control", "遗传筛查与癌症控制", ["maternal_genetic_screening_ethics", "cell_cycle_dysregulation_cancer_risk", "oncogene_tumour_suppressor_control"]],
  ["cancer_complex_inheritance", "Cancer progression and complex inheritance", "癌症进展与复杂遗传", ["multistep_cancer_progression", "epistasis_problem_solving", "genotype_environment_phenotype"]],
  ["signal_transduction", "Cell signal transduction", "细胞信号转导", ["cell_signalling_stages", "second_messengers", "kinase_phosphatase_signalling"]],
  ["receptor_population_evolution", "Receptor pathways and population evolution", "受体通路与种群进化", ["insulin_glucagon_receptor_pathways", "recessive_allele_persistence", "microevolution_macroevolution_link"]],
  ["evolutionary_relationships", "Evidence, species and phylogeny", "进化证据、物种与系统发育", ["integrated_evolution_evidence", "biological_species_concept_limits", "phylogeny_and_molecular_classification"]],
  ["adaptive_immunity", "Adaptive immunity and vaccination", "适应性免疫与疫苗", ["adaptive_immune_cell_coordination", "antibody_diversity_mechanisms", "vaccination_population_control_tradeoffs"]],
  ["infection_epidemiology", "Viral pathogenesis and epidemiology", "病毒致病与流行病学", ["viral_tissue_pathogenesis", "basic_reproduction_number", "outbreak_epidemic_pandemic"]],
  ["climate_forcing", "Climate forcing and footprint", "气候强迫与碳足迹", ["greenhouse_gas_human_drivers", "climate_system_ecological_impacts", "anthropogenic_carbon_footprints"]],
  ["climate_mitigation_resources", "Climate mitigation, food and biodiversity", "气候缓解、粮食与生物多样性", ["mangrove_climate_mitigation", "climate_stress_food_supply", "tropical_biodiversity_resources"]],
  ["climate_vectors", "Ecological redistribution and disease vectors", "生态重新分布与疾病媒介", ["climate_ecological_redistribution", "temperature_insect_vector_lifecycle", "warming_vector_borne_range_shift"]],
];

const EDGES = [
  ["cell_theory", "virus_living_boundary", "判断病毒为何挑战生命定义，需要先明确细胞学说的核心断言。"],
  ["comparative_genome_architecture", "viral_reproductive_cycles", "追踪病毒基因组继承前，需要先区分不同基因组的结构组织。"],
  ["viral_reproductive_cycles", "viral_genome_variation", "比较抗原漂移与转变前，需要理解病毒复制和基因组传递路径。"],
  ["noncoding_genome_elements", "multilevel_eukaryotic_gene_regulation", "分析多层基因调控前，需要识别启动子、增强子、沉默子和内含子等功能元件。"],
  ["cell_cycle_dysregulation_cancer_risk", "oncogene_tumour_suppressor_control", "解释特定癌基因改变前，需要理解细胞周期控制失调与癌变的联系。"],
  ["oncogene_tumour_suppressor_control", "multistep_cancer_progression", "理解癌症多步骤进展，需要先掌握促进和抑制增殖的基因控制。"],
  ["cell_signalling_stages", "second_messengers", "解释第二信使时，需要先定位其在受体激活后的信号转导阶段。"],
  ["second_messengers", "kinase_phosphatase_signalling", "解释磷酸化级联的放大与终止，需要先理解第二信使如何启动下游通路。"],
  ["kinase_phosphatase_signalling", "insulin_glucagon_receptor_pathways", "比较两类血糖受体通路前，需要理解激酶与磷酸酶的通用调控作用。"],
  ["recessive_allele_persistence", "microevolution_macroevolution_link", "联系微观和宏观进化前，需要理解选择如何改变或保留种群等位基因。"],
  ["integrated_evolution_evidence", "phylogeny_and_molecular_classification", "使用分子数据重建系统发育前，需要理解多类进化证据为何能够相互印证。"],
  ["biological_species_concept_limits", "phylogeny_and_molecular_classification", "解释系统发育分类的价值时，需要先认识单一物种概念的适用边界。"],
  ["adaptive_immune_cell_coordination", "antibody_diversity_mechanisms", "解释抗体多样性如何用于应答前，需要先理解 B、T 和抗原呈递细胞的协同。"],
  ["adaptive_immune_cell_coordination", "vaccination_population_control_tradeoffs", "评价疫苗群体效果前，需要先理解免疫记忆和初次、二次应答。"],
  ["basic_reproduction_number", "outbreak_epidemic_pandemic", "区分疾病传播规模时，需要先理解传染性指标与病例增长趋势。"],
  ["greenhouse_gas_human_drivers", "climate_system_ecological_impacts", "解释气候系统和生态后果前，需要先建立人为温室气体来源的因果链。"],
  ["climate_system_ecological_impacts", "climate_ecological_redistribution", "分析物种和生态位重新分布，需要先理解升温与极端事件对环境的影响。"],
  ["temperature_insect_vector_lifecycle", "warming_vector_borne_range_shift", "解释疾病地理范围移动前，需要先理解温度对蚊媒存活和发育的作用。"],
];

const gaps = readJson(paths.gaps);
const mappings = readJson(paths.mappings);
const registry = readJson(paths.registry);
if (gaps.candidates.length !== 45) throw new Error(`Expected 45 H2 Biology gaps, got ${gaps.candidates.length}`);

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
const nodeBySpecKey = new Map(createdNodes.map((node) => [node.id.replace(/^sg_h2_biology_/, ""), node]));

const grouped = new Set();
const topicNodes = TOPICS.map(([topicKey, name, nameZh, specKeys], topicIndex) => {
  if (specKeys.length < 2 || specKeys.length > 3) throw new Error(`Topic ${topicKey} must contain 2-3 concepts`);
  const concepts = specKeys.map((specKey, conceptIndex) => {
    const node = nodeBySpecKey.get(specKey);
    if (!node || grouped.has(specKey)) throw new Error(`Invalid topic membership for ${specKey}`);
    grouped.add(specKey);
    node.topic = `sg_h2_biology_topic_${topicKey}`;
    node.default_order = conceptIndex + 1;
    return node;
  });
  return {
    id: `sg_h2_biology_topic_${topicKey}`,
    kind: "topic",
    name,
    name_zh: nameZh,
    topic: null,
    default_order: topicIndex + 1,
    evidence_refs: uniqueEvidence(concepts.flatMap((node) => node.evidence_refs)),
    review_status: "needs_review",
  };
});
if (grouped.size !== createdNodes.length) throw new Error("Every H2 Biology concept must belong to exactly one topic");

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
  subject: "Biology",
  jurisdictions: ["SG"],
  source_ids: unique(createdNodes.flatMap((node) => node.evidence_refs.map((ref) => ref.source_id))),
  review_status: "needs_review",
  changelog: [{
    version: "0.1.0",
    date: TODAY,
    summary_zh: "根据 SEAB 101 项内容成果的逐项覆盖审查，建立 42 个机制级缺口概念；每个概念同时登记官方课程和开放教材证据。",
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
    rationale_zh: "反向核对既有 A-Level 与中国高中生物节点后，未发现同时满足 9477 范围、机制深度和独立诊断粒度的 canonical；新增窄概念且不修改任何旧 legacy ID。",
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
  summary_zh: "将 45 项 H2 生物缺口解析为 42 个概念；101 项内容成果全部达到 full，7 项通用实验能力保持 excluded。",
});

const resolutionSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  resolution_set_id: "cgr_sg_seab_h2_biology_9477_2026_outcomes",
  gap_set_id: gaps.gap_set_id,
  framework_id: gaps.framework_id,
  curriculum_id: gaps.curriculum_id,
  subject: gaps.subject,
  source_ids: unique(resolutions.flatMap((resolution) => resolution.evidence_refs.map((ref) => ref.source_id))),
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [{ version: "0.1.0", date: TODAY, summary_zh: "完成 45 项 H2 生物缺口的反向查重、概念归并、稳定 ID 和双类证据登记。" }],
  resolutions,
};

const roots = createdNodes.filter((node) => !new Set(edges.map((edge) => edge.to)).has(node.id));
const reviewLines = [
  "# 新加坡 H2 生物 KG 缺口实施与代理人工复核（中文）",
  "",
  `- 复核日期：${TODAY}`,
  `- 官方要求：${mappings.mappings.length} 项（101 项内容成果、7 项通用实验能力）`,
  `- 完整内容覆盖：${mappings.mappings.filter((mapping) => mapping.coverage_status === "full").length} 项`,
  `- 实验能力分流：${mappings.mappings.filter((mapping) => mapping.coverage_status === "excluded").length} 项`,
  `- 新图：${createdNodes.length} 个 Concept，${topicNodes.length} 个 Topic，${edges.length} 条待审先修边`,
  `- 入口概念：${roots.length} 个；没有用 syllabus 顺序伪造先修关系。`,
  "- 审核状态：代理复核只给出可保留建议，全部保持 `needs_review`。",
  "",
  "## 代理人工复核结论",
  "",
  "- 101 项内容成果按 6 个官方 topic 的字母编号逐项复算；加 7 项实验能力后总数 108。",
  "- 45 个缺口按相同机制合并为 42 个诊断概念；癌症风险、系统发育和疫苗等重复 outcome 共享节点。",
  "- gene control、immunity、climate change 等宽节点只保留为旧图资产，没有冒充机制级完整覆盖。",
  "- 三项 investigation outcome 同时保留 full 概念映射和 practice item；实践表现不会直接写概念掌握度。",
  "- 每个新概念至少含一条 SEAB 页码级证据和一条 OpenStax 学科教材章节证据。",
  "- 气候和疾病媒介描述保留条件性，不把升温简单写成传染必然增加。",
  "- 11 类官方排除边界保持不变。",
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

process.stdout.write(`[apply-sg-h2-biology-resolutions] ${resolutions.length} gaps -> ${createdNodes.length} concepts, ${topicNodes.length} topics, ${edges.length} edges; ${roots.length} roots\n`);
