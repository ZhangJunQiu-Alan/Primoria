#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { REPO_ROOT, graphPath, readJson } from "./kg-db-common.mjs";

const GENERATED_AT = "2026-07-18";
const cliArguments = process.argv.slice(2).filter((argument) => argument !== "--");
const inputDirArgument = cliArguments.find((argument) => !argument.startsWith("--"));
const graphIdArgument = cliArguments.find((argument) => argument.startsWith("--graph="))?.slice("--graph=".length);
const INPUT_DIR = resolve(REPO_ROOT, inputDirArgument ?? "tmp/pdfs");
const OUTPUT_DIR = resolve(REPO_ROOT, "data/knowledge-graphs/review/pending/a-level");
const STOP_WORDS = new Set([
  "a", "able", "all", "an", "and", "apply", "are", "as", "be", "by", "candidates", "describe", "determine",
  "explain", "for", "from", "give", "in", "including", "is", "it", "its", "may", "not", "of", "or", "recall",
  "should", "state", "that", "the", "their", "they", "this", "to", "understand", "use", "using", "will", "with", "within"
]);
const TOKEN_ALIASES = new Map([
  ["bacteria", "bacterium"],
  ["cells", "cell"],
  ["charges", "charge"],
  ["chlorine", "halogen"],
  ["electrons", "electron"],
  ["equations", "equation"],
  ["estimates", "estimate"],
  ["halogens", "halogen"],
  ["ions", "ion"],
  ["magnifications", "magnification"],
  ["masses", "mass"],
  ["measurements", "measurement"],
  ["micrographs", "micrograph"],
  ["microscopes", "microscope"],
  ["microscopy", "microscope"],
  ["neutrons", "neutron"],
  ["particles", "particle"],
  ["photomicrographs", "micrograph"],
  ["protons", "proton"],
  ["probabilities", "probability"],
  ["permutations", "permutation"],
  ["combinations", "combination"],
  ["quantities", "quantity"],
  ["reactions", "reaction"],
  ["roots", "root"],
  ["laws", "law"],
  ["units", "unit"]
]);
const SCIENCE_OUTCOME_VERBS = new Set([
  "add", "analyse", "appreciate", "apply", "calculate", "carry", "classify", "compare", "construct", "convert", "deduce",
  "define", "derive", "describe", "determine", "devise", "discuss", "distinguish", "draw", "explain",
  "express", "for", "identify", "illustrate", "infer", "interpret", "investigate", "make", "outline", "perform",
  "predict", "recall", "recognise", "relate", "represent", "select", "show", "sketch", "solve", "state",
  "suggest", "understand", "use", "work", "write"
]);

export const SUBJECTS = [
  {
    graphId: "a_level_mathematics",
    sourceId: "src_cambridge_9709_2026_2027",
    syllabusCode: "9709",
    textFile: "cambridge-9709.raw.txt",
    labelZh: "A-Level 数学"
  },
  {
    graphId: "a_level_biology",
    sourceId: "src_cambridge_9700_2025_2027",
    syllabusCode: "9700",
    textFile: "cambridge-9700.raw.txt",
    labelZh: "A-Level 生物"
  },
  {
    graphId: "a_level_chemistry",
    sourceId: "src_cambridge_9701_2025_2027",
    syllabusCode: "9701",
    textFile: "cambridge-9701.raw.txt",
    labelZh: "A-Level 化学"
  },
  {
    graphId: "a_level_physics",
    sourceId: "src_cambridge_9702_2025_2027",
    syllabusCode: "9702",
    textFile: "cambridge-9702.raw.txt",
    labelZh: "A-Level 物理"
  }
];

const APPROVED_OUTCOME_IDS = new Set([
  "9709:1.2:5",
  "9709:2.5:3",
  "9709:4.1:5",
  "9709:4.4:2",
  "9709:6.3:1",
  "9709:6.3:2",
  "9709:6.4:6",
  "9709:6.4:7",
  "9709:6.4:8",
  "9702:3.2:3",
  "9702:4.1:1",
  "9702:7.1:3",
  "9702:7.5:2",
  "9702:9.3:7",
  "9702:9.3:8",
  "9702:10.1:1",
  "9702:10.3:3",
  "9702:11.1:4",
  "9702:11.1:6",
  "9702:11.1:10",
  "9702:11.1:12",
  "9702:14.2:1",
  "9702:14.2:2",
  "9702:15.1:2",
  "9702:15.2:3",
  "9702:20.3:3",
  "9702:24.1:1",
  "9702:24.1:2",
  "9702:24.1:3",
  "9702:24.1:4",
  "9702:24.1:5",
  "9702:24.1:6",
  "9702:24.2:1",
  "9702:24.2:2",
  "9702:24.2:3",
  "9702:24.2:4",
  "9702:24.3:1",
  "9702:24.3:3",
  "9702:24.3:4",
  "9701:1.3:8",
  "9701:1.3:9",
  "9701:2.1:1",
  "9701:2.1:2",
  "9701:2.3:4",
  "9701:3.4:3",
  "9701:4.1:1",
  "9701:7.2:1",
  "9701:7.2:2",
  "9701:11.4:2",
  "9701:13.1:3",
  "9701:13.1:4",
  "9701:13.3:3",
  "9701:14.1:4",
  "9701:15.1:2",
  "9701:16.1:4",
  "9701:16.1:5",
  "9701:17.1:6",
  "9701:19.2:3",
  "9701:21.1:2",
  "9701:24.2:10",
  "9701:25.2:1",
  "9701:25.2:2",
  "9701:25.2:3",
  "9701:28.1:2",
  "9701:32.2:1",
  "9701:32.2:2",
  "9701:32.2:3",
  "9701:32.2:4",
  "9701:32.2:6",
  "9701:32.2:7",
  "9701:33.3:3",
  "9701:34.2:2",
  "9701:34.2:4",
  "9701:34.3:2",
  "9701:34.3:3",
  "9701:35.3:2",
  "9701:36.1:2",
  "9700:1.1:1",
  "9700:1.1:2",
  "9700:1.1:4",
  "9700:1.2:2",
  "9700:1.2:4",
  "9700:1.2:7",
  "9700:2.1:1",
  "9700:2.1:2",
  "9700:2.1:3",
  "9700:2.2:3",
  "9700:2.3:7",
  "9700:2.3:8",
  "9700:3.1:3",
  "9700:3.1:4",
  "9700:3.2:1",
  "9700:3.2:2",
  "9700:3.2:4",
  "9700:4.2:2",
  "9700:4.2:3",
  "9700:4.2:4",
  "9700:4.2:5",
  "9700:5.1:6",
  "9700:5.2:2",
  "9700:6.1:5",
  "9700:7.1:1",
  "9700:7.1:3",
  "9700:7.2:5",
  "9700:8.1:3",
  "9700:8.1:5",
  "9700:8.2:2",
  "9700:8.2:3",
  "9700:9.1:3",
  "9700:9.1:4",
  "9700:10.2:1",
  "9700:12.1:2",
  "9700:12.1:5",
  "9700:12.1:6",
  "9700:12.1:7",
  "9700:12.2:9",
  "9700:12.2:13",
  "9700:12.2:14",
  "9700:13.1:1",
  "9700:13.1:5",
  "9700:13.1:6",
  "9700:13.2:3",
  "9700:13.2:4",
  "9700:14.1:3",
  "9700:14.1:5",
  "9700:14.1:11",
  "9700:14.2:4",
  "9700:15.1:10",
  "9700:15.1:11",
  "9700:15.1:12",
  "9700:15.2:3",
  "9700:16.1:5",
  "9700:16.2:5",
  "9700:16.3:2",
  "9700:17.1:4",
  "9700:17.2:5",
  "9700:17.2:6",
  "9700:17.2:7",
  "9700:18.1:6",
  "9700:18.2:1",
  "9700:18.2:5",
  "9700:18.3:4",
  "9700:19.1:10",
  "9700:19.1:11"
]);

const AUDITED_OUTCOME_OVERRIDES = new Map([
  ["9700:1.1:3", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["bio_cell_size"], noteZh: "逐条复核：细胞尺寸与放大概念明确覆盖由图像计算放大倍数和实际尺寸。" }],
  ["9700:1.1:5", { requirementType: "concept", coverageSignal: "candidate_partial", candidateIds: ["bio_microscopy"], noteZh: "第四批终检修正：显微镜概念涉及分辨率、放大倍数以及光镜和电镜，但未完整定义并比较这些术语和两类显微镜。" }],
  ["9700:1.2:1", { requirementType: "concept", coverageSignal: "candidate_partial", candidateIds: ["bio_organelles"], noteZh: "逐条复核：真核细胞器概念覆盖主要结构与功能，但未逐一列出 syllabus 的全部细胞结构。" }],
  ["9700:1.2:2", { requirementType: "practical_skill", coverageSignal: "skill_mapping_required", candidateIds: ["bio_organelles"], noteZh: "逐条复核：识别和解读显微图、电子显微图及细胞图属于实践图像技能，细胞器概念提供背景。" }],
  ["9700:1.2:5", { coverageSignal: "candidate_partial", candidateIds: ["bio_prokaryotes"], noteZh: "逐条复核：原核细胞概念覆盖环状 DNA、小核糖体、细胞壁和无膜细胞器，但未完整包含尺寸、肽聚糖及双膜限定。" }],
  ["9700:1.2:7", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有生物 KG 没有病毒的非细胞性、核酸核心、衣壳和磷脂包膜结构概念。" }],
  ["9700:2.2:1", { coverageSignal: "candidate_partial", candidateIds: ["bio_carbohydrates"], noteZh: "逐条复核：碳水化合物概念覆盖葡萄糖和多糖，但未描述或绘制 α/β 葡萄糖环状结构。" }],
  ["9700:2.2:2", { coverageSignal: "candidate_partial", candidateIds: ["bio_carbohydrates", "bio_proteins"], noteZh: "逐条复核：两个概念提供单体与聚合物实例，但未完整定义单体、聚合物、大分子及三类糖。" }],
  ["9700:2.2:4", { coverageSignal: "candidate_partial", candidateIds: ["bio_carbohydrates", "bio_tests"], noteZh: "逐条复核：糖类与生化检验概念提供糖和 Benedict 检验背景，但未逐一判定所列还原糖与非还原糖。" }],
  ["9700:2.2:10", { coverageSignal: "candidate_partial", candidateIds: ["bio_lipids"], noteZh: "逐条复核：脂质概念覆盖甘油三酯的疏水性与储能功能，但未把分子结构逐项联系到功能。" }],
  ["9700:2.2:11", { coverageSignal: "candidate_partial", candidateIds: ["bio_lipids"], noteZh: "逐条复核：脂质概念覆盖磷脂双亲性和双层形成，但未明确极性磷酸头与非极性脂肪酸尾结构。" }],
  ["9700:2.3:6", { coverageSignal: "candidate_partial", candidateIds: ["bio_haemoglobin", "bio_proteins"], noteZh: "逐条复核：血红蛋白和蛋白质概念覆盖氧结合及蛋白结构背景，但未描述血红蛋白结构与血红素铁的重要性。" }],
  ["9700:2.3:7", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有生物 KG 没有胶原分子、纤维蛋白或胶原纤维排列概念。" }],
  ["9700:3.1:1", { coverageSignal: "candidate_partial", candidateIds: ["bio_enzyme_action", "bio_proteins"], noteZh: "逐条复核：酶作用和蛋白质概念覆盖蛋白催化剂，但未区分球状、胞内与胞外酶。" }],
  ["9700:3.1:4", { requirementType: "practical_skill", coverageSignal: "skill_mapping_required", candidateIds: ["bio_enzyme_action"], noteZh: "逐条复核：用比色计跟踪显色酶反应属于实践测量技能；现有概念只提供酶反应背景。" }],
  ["9700:3.2:2", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有生物 KG 没有 Vmax、Michaelis-Menten 常数 Km 或酶底物亲和力比较概念。" }],
  ["9700:4.1:3", { coverageSignal: "candidate_partial", candidateIds: ["bio_membrane_structure", "bio_active_transport"], noteZh: "逐条复核：膜结构和主动运输概念覆盖部分组分及运输作用，但未完整覆盖稳定性、流动性、信号和识别功能。" }],
  ["9700:4.1:4", { coverageSignal: "candidate_partial", candidateIds: ["bio_hormonal", "bio_membrane_structure"], noteZh: "逐条复核：激素控制和膜受体概念提供配体、靶细胞背景，但未完整列出细胞信号传递阶段。" }],
  ["9700:4.2:1", { coverageSignal: "candidate_covered", candidateIds: ["bio_passive_transport", "bio_active_transport"], noteZh: "逐条复核：被动与主动运输概念共同覆盖扩散、易化扩散、渗透、主动运输及胞吞胞吐。" }],
  ["9700:4.2:3", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有生物 KG 没有表面积体积比随尺寸变化及三维形体计算概念。" }],
  ["9700:4.2:4", { requirementType: "practical_skill", coverageSignal: "skill_mapping_required", candidateIds: ["bio_passive_transport"], noteZh: "逐条复核：用不同大小琼脂块研究表面积体积比对扩散的影响属于实践技能，扩散概念提供背景。" }],
  ["9700:4.2:6", { coverageSignal: "candidate_partial", candidateIds: ["bio_passive_transport"], noteZh: "逐条复核：渗透概念覆盖水跨膜移动，但未明确水势及植物、动物细胞的不同效应。" }],
  ["9700:5.1:1", { coverageSignal: "candidate_partial", candidateIds: ["bio_chromosomes"], noteZh: "逐条复核：染色体概念覆盖 DNA、组蛋白和复制凝缩，但未明确姐妹染色单体、着丝粒和端粒。" }],
  ["9700:5.1:2", { coverageSignal: "candidate_partial", candidateIds: ["bio_mitosis"], noteZh: "逐条复核：有丝分裂概念覆盖遗传相同子细胞、生长和修复，但未完整列出替换、组织修复与无性生殖。" }],
  ["9700:5.1:3", { coverageSignal: "candidate_partial", candidateIds: ["bio_dna_replication", "bio_mitosis"], noteZh: "逐条复核：DNA 复制和有丝分裂概念覆盖 S 期与核分裂，但未描述 G1、G2 和胞质分裂的完整细胞周期。" }],
  ["9700:5.1:4", { coverageSignal: "candidate_partial", candidateIds: ["bio_chromosomes", "bio_dna_replication"], noteZh: "逐条复核：染色体和复制概念提供端部复制背景，但未说明端粒防止基因从染色体末端丢失。" }],
  ["9700:5.1:5", { coverageSignal: "candidate_partial", candidateIds: ["bio_mitosis"], noteZh: "逐条复核：有丝分裂概念覆盖细胞替换与修复，但没有干细胞概念。" }],
  ["9700:5.1:6", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有生物 KG 没有失控细胞分裂或肿瘤形成概念。" }],
  ["9700:5.2:1", { coverageSignal: "candidate_partial", candidateIds: ["bio_mitosis", "bio_chromosomes"], noteZh: "逐条复核：有丝分裂和染色体概念覆盖主要阶段及染色体变化，但未完整描述核膜、细胞膜和纺锤体行为。" }],
  ["9700:6.1:1", { coverageSignal: "candidate_partial", candidateIds: ["bio_dna_structure"], noteZh: "逐条复核：DNA 结构概念包含核苷酸链，但未描述核苷酸组成和磷酸化核苷酸 ATP。" }],
  ["9700:6.1:3", { coverageSignal: "candidate_partial", candidateIds: ["bio_dna_structure"], noteZh: "逐条复核：DNA 概念覆盖双螺旋、反平行和互补配对，但未明确氢键数与磷酸二酯键。" }],
  ["9700:6.2:1", { coverageSignal: "candidate_partial", candidateIds: ["bio_transcription", "bio_translation"], noteZh: "逐条复核：转录和翻译概念覆盖基因信息到多肽，但未直接定义基因为 DNA 分子中的核苷酸序列。" }],
  ["9700:6.2:2", { coverageSignal: "candidate_partial", candidateIds: ["bio_translation"], noteZh: "逐条复核：翻译概念覆盖 mRNA 密码子与氨基酸配对，但未说明通用遗传密码及起始、终止密码子。" }],
  ["9700:6.2:7", { coverageSignal: "candidate_covered", candidateIds: ["bio_mutation"], noteZh: "逐条复核：突变概念明确覆盖替换、插入、缺失及对蛋白和表型的影响。" }],
  ["9700:7.1:3", { requirementType: "practical_skill", coverageSignal: "skill_mapping_required", candidateIds: ["bio_xylem", "bio_phloem"], noteZh: "逐条复核：从显微材料绘制并标注木质部、筛管和伴胞属于实践绘图技能。" }],
  ["9700:7.2:6", { coverageSignal: "candidate_covered", candidateIds: ["bio_phloem"], noteZh: "逐条复核：韧皮部概念明确覆盖蔗糖等同化物由源到库的转运。" }],
  ["9700:7.2:8", { coverageSignal: "candidate_covered", candidateIds: ["bio_phloem"], noteZh: "逐条复核：韧皮部概念明确说明由压力流实现从源到库的转运。" }],
  ["9700:8.1:1", { coverageSignal: "candidate_partial", candidateIds: ["bio_heart", "bio_blood_vessels"], noteZh: "逐条复核：心脏和血管概念覆盖循环组成，但未明确封闭双循环及全部血管层级。" }],
  ["9700:8.1:3", { requirementType: "practical_skill", coverageSignal: "skill_mapping_required", candidateIds: ["bio_blood_vessels"], noteZh: "逐条复核：显微识别血管并制作横纵切面图属于实践图像技能。" }],
  ["9700:8.1:5", { requirementType: "practical_skill", coverageSignal: "skill_mapping_required", candidateIds: ["bio_haemoglobin", "bio_immune_response"], noteZh: "逐条复核：显微识别并绘制红细胞和白细胞属于实践图像技能，两个概念提供细胞功能背景。" }],
  ["9700:8.1:7", { coverageSignal: "candidate_partial", candidateIds: ["bio_blood_vessels"], noteZh: "逐条复核：血管概念覆盖毛细血管物质交换，但未说明组织液形成和功能。" }],
  ["9700:8.2:2", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有生物 KG 没有氯离子转移或 chloride shift 概念。" }],
  ["9700:8.3:2", { coverageSignal: "candidate_partial", candidateIds: ["bio_heart"], noteZh: "逐条复核：心脏概念覆盖内部结构，但未解释心房/心室及左右心室壁厚差异。" }],
  ["9700:8.3:4", { coverageSignal: "candidate_partial", candidateIds: ["bio_heart"], noteZh: "逐条复核：心脏概念覆盖协调的心动周期，但未明确窦房结、房室结和浦肯野组织；激素控制不是相关候选。" }],
  ["9700:9.1:3", { requirementType: "practical_skill", coverageSignal: "skill_mapping_required", candidateIds: ["bio_lungs"], noteZh: "逐条复核：在显微材料中识别气体交换系统组织属于实践图像技能。" }],
  ["9700:9.1:4", { requirementType: "practical_skill", coverageSignal: "skill_mapping_required", candidateIds: ["bio_lungs"], noteZh: "逐条复核：显微识别气道并制作气管、支气管横切面图属于实践技能。" }],
  ["9700:10.1:3", { coverageSignal: "candidate_partial", candidateIds: ["bio_infectious"], noteZh: "逐条复核：感染病概念覆盖病原体传播，但未逐项说明霍乱、疟疾、结核病和 HIV 的传播途径。" }],
  ["9700:10.2:2", { coverageSignal: "candidate_partial", candidateIds: ["bio_infectious", "bio_natural_selection"], noteZh: "逐条复核：感染病和自然选择概念提供耐药后果与形成背景，但未说明降低影响的完整措施。" }],
  ["9700:11.1:4", { coverageSignal: "candidate_partial", candidateIds: ["bio_immune_response", "bio_antibodies"], noteZh: "逐条复核：免疫应答与抗体和疫苗概念共同覆盖记忆细胞和二次免疫，但未完整描述初次与二次应答的全部过程。" }],
  ["9700:11.2:5", { coverageSignal: "candidate_partial", candidateIds: ["bio_antibodies", "bio_immune_response"], noteZh: "第三批终检修正：抗体和疫苗概念覆盖记忆细胞与主动免疫，免疫应答概念提供特异性应答背景，但未明确疫苗含有抗原并由其刺激应答。" }],
  ["9700:11.2:6", { coverageSignal: "candidate_partial", candidateIds: ["bio_antibodies", "bio_infectious"], noteZh: "逐条复核：疫苗和传染病概念共同提供群体接种与传播背景，但未明确解释接种计划降低传播的群体免疫机制。" }],
  ["9700:12.1:1", { coverageSignal: "candidate_partial", candidateIds: ["bio_active_transport", "bio_dna_replication", "bio_translation"], noteZh: "逐条复核：主动运输、DNA 复制和翻译概念覆盖部分需能过程，但现有 KG 没有完整涵盖运动和全部合成反应。" }],
  ["9700:12.1:2", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有生物 KG 没有 ATP 作为细胞通用能量货币的结构、磷酸化与水解释能特征概念。" }],
  ["9700:12.1:4", { coverageSignal: "candidate_partial", candidateIds: ["bio_carbohydrates", "bio_lipids", "bio_proteins"], noteZh: "逐条复核：三类生物分子概念提供结构与功能背景，但未比较其呼吸释放的相对能量值。" }],
  ["9700:12.2:1", { coverageSignal: "candidate_partial", candidateIds: ["bio_glycolysis", "bio_krebs", "bio_oxidative"], noteZh: "逐条复核：三个呼吸概念覆盖糖酵解、连接反应、Krebs 循环和氧化磷酸化，但没有逐项定位四阶段的所有细胞区域。" }],
  ["9700:12.2:2", { coverageSignal: "candidate_partial", candidateIds: ["bio_glycolysis"], noteZh: "逐条复核：糖酵解概念覆盖葡萄糖到丙酮酸、少量 ATP 和还原型 NAD，但未完整描述磷酸化及中间步骤。" }],
  ["9700:12.2:3", { coverageSignal: "candidate_partial", candidateIds: ["bio_krebs"], noteZh: "第三批终检修正：连接反应概念覆盖丙酮酸转为乙酰辅酶 A，但未明确有氧条件下丙酮酸进入线粒体。" }],
  ["9700:12.2:4", { coverageSignal: "candidate_partial", candidateIds: ["bio_krebs"], noteZh: "逐条复核：连接反应与 Krebs 循环概念明确包含丙酮酸转为乙酰辅酶 A，但未说明辅酶 A 的转移作用。" }],
  ["9700:12.2:5", { coverageSignal: "candidate_partial", candidateIds: ["bio_krebs"], noteZh: "逐条复核：Krebs 循环概念覆盖乙酰辅酶 A 氧化、二氧化碳和还原型辅酶生成，但未明确草酰乙酸再生和柠檬酸形成。" }],
  ["9700:12.2:6", { coverageSignal: "candidate_partial", candidateIds: ["bio_krebs"], noteZh: "逐条复核：Krebs 循环概念涵盖脱羧及还原型辅酶，但未明确底物水平磷酸化、脱氢和 FAD 的全部要求。" }],
  ["9700:12.2:8", { coverageSignal: "candidate_partial", candidateIds: ["bio_oxidative"], noteZh: "逐条复核：氧化磷酸化概念覆盖电子传递链、化学渗透和内膜 ATP 合成，但未明确氢分离及氧作为最终电子受体。" }],
  ["9700:12.2:12", { coverageSignal: "candidate_partial", candidateIds: ["bio_anaerobic"], noteZh: "逐条复核：无氧呼吸概念覆盖植物乙醇发酵，但没有水稻茎通气组织和淹水适应。" }],
  ["9700:12.2:13", { requirementType: "practical_skill", coverageSignal: "skill_mapping_required", candidateIds: ["bio_glycolysis", "bio_anaerobic"], noteZh: "逐条复核：用氧化还原指示剂研究酵母呼吸属于实践测量技能，糖酵解和无氧呼吸提供过程背景。" }],
  ["9700:12.2:14", { requirementType: "practical_skill", coverageSignal: "skill_mapping_required", candidateIds: ["bio_glycolysis", "bio_oxidative"], noteZh: "逐条复核：用呼吸计研究温度对呼吸速率的影响属于实践测量技能，相关呼吸概念只提供理论背景。" }],
  ["9700:13.1:1", { requirementType: "practical_skill", coverageSignal: "skill_mapping_required", candidateIds: ["bio_organelles", "bio_light_dependent", "bio_calvin"], noteZh: "逐条复核：由图示或电子显微图解释叶绿体结构与功能关系属于图像技能，细胞器及两阶段光合作用概念提供背景。" }],
  ["9700:13.1:3", { coverageSignal: "candidate_partial", candidateIds: ["bio_light_dependent", "bio_calvin"], noteZh: "逐条复核：光反应和 Calvin 循环概念分别定位于类囊体和基质，但现有描述未完整说明基粒结构。" }],
  ["9700:13.1:5", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有生物 KG 没有光合色素吸收光谱与作用光谱的概念。" }],
  ["9700:13.1:6", { requirementType: "practical_skill", coverageSignal: "skill_mapping_required", candidateIds: ["bio_light_dependent"], noteZh: "逐条复核：用色谱分离光合色素并计算 Rf 值属于实践技能；光反应概念只提供色素吸光的学科背景。" }],
  ["9700:13.2:3", { requirementType: "practical_skill", coverageSignal: "skill_mapping_required", candidateIds: ["bio_light_dependent", "bio_limiting_factors"], noteZh: "逐条复核：用氧化还原指示剂研究分离叶绿体的光反应属于实践技能，两个概念提供过程和变量背景。" }],
  ["9700:14.1:3", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有生物 KG 没有肝脏中氨基酸脱氨及尿素形成概念。" }],
  ["9700:14.1:4", { coverageSignal: "candidate_partial", candidateIds: ["bio_kidney"], noteZh: "逐条复核：肾脏和渗透调节概念覆盖肾单位与尿液形成，但未描述肾脏、肾动脉、肾静脉和输尿管的宏观结构。" }],
  ["9700:14.1:6", { coverageSignal: "candidate_partial", candidateIds: ["bio_kidney"], noteZh: "第三批终检修正：肾脏概念覆盖肾单位超滤和选择性重吸收，但未明确肾小球、肾小球囊及近曲小管的滤液形成细节。" }],
  ["9700:14.1:7", { coverageSignal: "candidate_partial", candidateIds: ["bio_kidney"], noteZh: "逐条复核：肾脏概念覆盖超滤和选择性重吸收，但未完整说明肾小球囊与近曲小管的结构适应。" }],
  ["9700:14.1:8", { coverageSignal: "candidate_partial", candidateIds: ["bio_kidney", "bio_hormonal"], noteZh: "逐条复核：肾脏与激素控制概念覆盖 ADH 调节水分平衡，但未完整描述下丘脑、垂体后叶、集合管和水通道蛋白机制。" }],
  ["9700:14.1:9", { coverageSignal: "candidate_partial", candidateIds: ["bio_glucose_control", "bio_membrane_structure"], noteZh: "逐条复核：血糖调节和膜受体概念提供胰高血糖素、受体和信号背景，但未明确完整的第二信使级联。" }],
  ["9700:14.1:10", { coverageSignal: "candidate_covered", candidateIds: ["bio_glucose_control"], noteZh: "逐条复核：血糖调节概念直接覆盖胰岛素和胰高血糖素对血糖浓度的调节。" }],
  ["9700:14.2:3", { coverageSignal: "candidate_partial", candidateIds: ["bio_transpiration"], noteZh: "逐条复核：蒸腾概念覆盖气孔和影响蒸腾速率的因素，但没有保卫细胞离子运动与气孔开闭机制。" }],
  ["9700:15.1:1", { coverageSignal: "candidate_covered", candidateIds: ["bio_hormonal", "bio_kidney", "bio_glucose_control"], noteZh: "逐条复核：激素控制、肾脏和血糖调节概念共同覆盖 ADH、胰岛素和胰高血糖素的内分泌作用。" }],
  ["9700:15.1:3", { coverageSignal: "candidate_partial", candidateIds: ["bio_nervous"], noteZh: "逐条复核：神经传导概念覆盖神经元上的动作电位，但未比较感觉、运动和中间神经元的结构。" }],
  ["9700:15.1:8", { coverageSignal: "candidate_partial", candidateIds: ["bio_nervous"], noteZh: "逐条复核：神经传导概念覆盖动作电位产生，但未说明不应期限制动作电位频率的作用。" }],
  ["9700:15.1:11", { requirementType: "practical_skill", coverageSignal: "skill_mapping_required", candidateIds: [], noteZh: "逐条复核：从图示和电子显微图识别横纹肌超微结构属于图像技能；现有 KG 没有肌肉概念可作为可靠背景。" }],
  ["9700:15.2:1", { coverageSignal: "candidate_partial", candidateIds: ["bio_plant_responses"], noteZh: "逐条复核：植物响应概念涵盖对刺激的生长反应，但未描述捕蝇草的快速叶片闭合机制。" }],
  ["9700:15.2:2", { coverageSignal: "candidate_partial", candidateIds: ["bio_plant_responses"], noteZh: "逐条复核：植物响应概念覆盖生长素调控向性，但未说明质子泵、细胞壁酸化和细胞伸长的酸生长机制。" }],
  ["9700:16.1:1", { coverageSignal: "candidate_partial", candidateIds: ["bio_meiosis"], noteZh: "逐条复核：减数分裂概念说明单倍体配子，但未系统定义单倍体和二倍体状态。" }],
  ["9700:16.1:2", { coverageSignal: "candidate_partial", candidateIds: ["bio_meiosis", "bio_chromosomes"], noteZh: "逐条复核：减数分裂和染色体概念提供同源染色体背景，但未完整定义同源对及父母来源。" }],
  ["9700:16.1:5", { requirementType: "practical_skill", coverageSignal: "skill_mapping_required", candidateIds: ["bio_meiosis"], noteZh: "逐条复核：由图示或显微图识别减数分裂阶段属于图像技能，减数分裂概念提供阶段背景。" }],
  ["9700:16.1:7", { coverageSignal: "candidate_partial", candidateIds: ["bio_meiosis", "bio_variation"], noteZh: "逐条复核：减数分裂和变异概念覆盖配子的遗传差异，但未明确随机受精对变异的贡献。" }],
  ["9700:16.2:1", { coverageSignal: "candidate_partial", candidateIds: ["bio_genetic_crosses", "bio_linkage"], noteZh: "逐条复核：遗传杂交和连锁概念使用多项遗传术语，但未逐一定义基因座、等位基因、显隐性、纯合与杂合等全部术语。" }],
  ["9700:16.2:2", { coverageSignal: "candidate_partial", candidateIds: ["bio_genetic_crosses", "bio_linkage"], noteZh: "逐条复核：遗传杂交与连锁概念覆盖显性、共显性和连锁，但未完整覆盖多等位基因及伴性遗传的全部实例和概率计算。" }],
  ["9700:16.2:3", { coverageSignal: "candidate_partial", candidateIds: ["bio_genetic_crosses", "bio_linkage"], noteZh: "逐条复核：遗传杂交与连锁概念覆盖常染色体连锁及重组，但没有上位性概念。" }],
  ["9700:16.2:6", { coverageSignal: "candidate_partial", candidateIds: ["bio_mutation", "bio_gene_applications"], noteZh: "逐条复核：突变和遗传技术应用概念提供基因、蛋白与疾病背景，但未涵盖 syllabus 指定的命名基因、蛋白和疾病实例。" }],
  ["9700:16.2:7", { coverageSignal: "candidate_partial", candidateIds: ["bio_plant_responses", "bio_genetic_crosses"], noteZh: "逐条复核：植物响应和遗传杂交概念提供赤霉素与等位基因背景，但未解释基因编码酶如何改变赤霉素合成和株高。" }],
  ["9700:16.3:2", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有基因表达控制概念限定为真核转录调控，没有原核 lac 操纵子概念。" }],
  ["9700:16.3:4", { coverageSignal: "candidate_partial", candidateIds: ["bio_gene_control", "bio_plant_responses"], noteZh: "逐条复核：基因表达控制和植物响应概念提供转录调控与赤霉素背景，但未描述 DELLA 蛋白介导的基因激活机制。" }],
  ["9700:17.2:5", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有生物 KG 没有 Hardy-Weinberg 原理、等位基因频率计算及其成立条件。" }],
  ["9700:17.3:1", { coverageSignal: "candidate_partial", candidateIds: ["bio_natural_selection", "bio_speciation"], noteZh: "逐条复核：自然选择与物种形成概念覆盖种群随世代改变和分化，但未完整定义基因库及其随时间变化。" }],
  ["9700:17.3:3", { coverageSignal: "candidate_covered", candidateIds: ["bio_speciation"], noteZh: "逐条复核：物种形成概念直接覆盖生殖隔离以及异域和同域机制。" }],
  ["9700:18.1:1", { coverageSignal: "candidate_partial", candidateIds: ["bio_classification"], noteZh: "逐条复核：分类概念提供物种和分类背景，但未比较形态学、生态学和生物学物种概念。" }],
  ["9700:18.1:3", { coverageSignal: "candidate_partial", candidateIds: ["bio_prokaryotes", "bio_classification"], noteZh: "逐条复核：原核细胞和分类概念提供细菌及三域背景，但未系统比较古菌域与细菌域的细胞特征。" }],
  ["9700:18.1:4", { coverageSignal: "candidate_partial", candidateIds: ["bio_classification"], noteZh: "逐条复核：分类概念说明层级分类群，但未逐一列出域、界、门、纲、目、科、属、种及双名法。" }],
  ["9700:18.1:5", { coverageSignal: "candidate_partial", candidateIds: ["bio_classification"], noteZh: "逐条复核：分类概念提供分类层级和进化关系背景，但未描述真核各界的诊断特征。" }],
  ["9700:18.2:4", { coverageSignal: "candidate_partial", candidateIds: ["bio_biodiversity_sampling"], noteZh: "逐条复核：生物多样性取样概念覆盖随机取样，但未明确样方、样带和标志重捕法的使用与计算。" }],
  ["9700:18.2:5", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有生物 KG 没有 Spearman 等级相关或 Pearson 线性相关的选择、计算和解释概念。" }],
  ["9700:18.2:6", { coverageSignal: "candidate_covered", candidateIds: ["bio_biodiversity_sampling"], noteZh: "逐条复核：生物多样性取样概念明确包含 Simpson 指数以及物种丰富度和均匀度的量化。" }],
  ["9700:18.3:1", { coverageSignal: "candidate_partial", candidateIds: ["bio_conservation"], noteZh: "逐条复核：保护概念覆盖物种与栖息地保护，但未系统列出造成灭绝和生物多样性下降的因素。" }],
  ["9700:18.3:3", { coverageSignal: "candidate_partial", candidateIds: ["bio_conservation"], noteZh: "逐条复核：保护概念涵盖保护方法，但未具体说明动物园、植物园、种子库和保护区的作用。" }],
  ["9700:18.3:4", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "视觉复核修正：官方限定为体外受精（IVF）、胚胎移植和代孕；现有保护 Concept 未覆盖这些辅助生殖方法。" }],
  ["9700:18.3:5", { coverageSignal: "candidate_partial", candidateIds: ["bio_conservation"], noteZh: "逐条复核：保护概念可作为外来入侵种管理背景，但未描述控制措施及其生态权衡。" }],
  ["9700:19.1:2", { coverageSignal: "candidate_covered", candidateIds: ["bio_gene_tech"], noteZh: "逐条复核：基因技术概念明确覆盖通过重组 DNA 切接和插入基因来有意改变遗传物质。" }],
  ["9700:19.1:9", { coverageSignal: "candidate_covered", candidateIds: ["bio_pcr_electrophoresis"], noteZh: "逐条复核：PCR 与电泳概念明确说明凝胶电泳按 DNA 片段大小分离并用于分析。" }],
  ["9700:19.1:10", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有生物 KG 没有微阵列分析基因表达或基因组比较概念。" }],
  ["9700:19.1:11", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有生物 KG 没有核苷酸和氨基酸序列数据库及生物信息学比较的用途概念。" }],
  ["9700:19.2:3", { coverageSignal: "candidate_partial", candidateIds: ["bio_gene_applications"], noteZh: "逐条复核：遗传技术应用概念包含基因治疗，但未覆盖指定疾病实例、递送方式和局限。" }],
  ["9700:19.2:4", { coverageSignal: "candidate_partial", candidateIds: ["bio_gene_applications"], noteZh: "逐条复核：遗传技术应用概念提供筛查和基因治疗背景，但未系统讨论其社会与伦理问题。" }],
  ["9700:19.3:1", { coverageSignal: "candidate_partial", candidateIds: ["bio_gene_applications"], noteZh: "逐条复核：遗传技术应用概念包含农业转基因生物，但未说明指定作物或性状实例及其技术细节。" }],
  ["9709:1.1:2", { coverageSignal: "candidate_covered", candidateIds: ["mat_solve_quadratics"], noteZh: "逐条复核：二次方程概念明确用判别式确定实根数量。" }],
  ["9709:1.1:5", { coverageSignal: "candidate_partial", candidateIds: ["mat_solve_quadratics"], noteZh: "逐条复核：现有概念覆盖二次方程求解，但未明确把关于某函数的方程换元为二次式。" }],
  ["9709:1.2:2", { coverageSignal: "candidate_covered", candidateIds: ["mat_functions", "mat_composite"], noteZh: "逐条复核：函数与复合函数概念共同覆盖值域、复合及值域必须落入定义域的条件。" }],
  ["9709:1.2:5", { coverageSignal: "candidate_covered", candidateIds: ["mat_graph_transformations"], noteZh: "人工批准：函数图像变换 Concept 完整覆盖平移、反射、伸缩及组合变换。" }],
  ["9709:1.3:1", { coverageSignal: "candidate_covered", candidateIds: ["mat_straight_lines"], noteZh: "逐条复核：直线概念明确覆盖由点和梯度等条件求直线方程。" }],
  ["9709:1.3:3", { coverageSignal: "candidate_covered", candidateIds: ["mat_circles"], noteZh: "逐条复核：圆概念覆盖圆心、半径、标准式与坐标几何形式。" }],
  ["9709:1.5:3", { coverageSignal: "candidate_partial", candidateIds: ["mat_functions", "mat_trig_ratios"], noteZh: "逐条复核：反函数与三角函数概念提供背景，但未明确三种反三角关系的主值记号。" }],
  ["9709:1.5:4", { coverageSignal: "candidate_covered", candidateIds: ["mat_trig_identities"], noteZh: "逐条复核：三角恒等式概念直接覆盖商恒等式和勾股恒等式的证明、化简与解题。" }],
  ["9709:1.5:5", { coverageSignal: "candidate_covered", candidateIds: ["mat_solve_trig"], noteZh: "逐条复核：三角方程概念明确覆盖指定区间内利用恒等式、图像和对称性求解。" }],
  ["9709:1.6:3", { requirementType: "concept_and_skill", coverageSignal: "candidate_partial", candidateIds: ["mat_arithmetic", "mat_geometric"], noteZh: "第六批抽样修正：等差与等比数列概念覆盖第 n 项和前 n 项和，但未明确 2b=a+c、b²=ac 以及多重数列问题。" }],
  ["9709:1.7:4", { coverageSignal: "candidate_partial", candidateIds: ["mat_stationary"], noteZh: "逐条复核：驻点概念覆盖定位与分类，但描述未明确二阶导数判别和利用驻点草绘图像。" }],
  ["9709:1.8:1", { coverageSignal: "candidate_covered", candidateIds: ["mat_indefinite", "mat_standard_integrals"], noteZh: "逐条复核：不定积分和标准函数积分共同覆盖反向求导、有理幂及线性组合。" }],
  ["9709:2.1:3", { coverageSignal: "candidate_covered", candidateIds: ["mat_factor_theorem"], noteZh: "逐条复核：因式与余式定理概念覆盖求因式、余式、方程根和未知系数。" }],
  ["9709:2.2:1", { coverageSignal: "candidate_covered", candidateIds: ["mat_log_laws"], noteZh: "逐条复核：对数概念明确覆盖对数与指数互逆以及积、商、幂法则。" }],
  ["9709:2.2:2", { coverageSignal: "candidate_partial", candidateIds: ["mat_exp_func", "mat_log_laws"], noteZh: "逐条复核：指数函数和对数概念覆盖互逆与指数图像，但未完整描述 ln x 的性质和图像。" }],
  ["9709:2.4:1", { coverageSignal: "candidate_covered", candidateIds: ["mat_special_derivatives", "mat_chain_rule"], noteZh: "逐条复核：特殊函数导数与链式法则共同覆盖指数、对数、三角函数及复合函数求导。" }],
  ["9709:2.5:3", { coverageSignal: "candidate_covered", candidateIds: ["mat_trapezium_rule"], noteZh: "人工批准：梯形法则 Concept 覆盖定积分近似及由图像判断高估或低估。" }],
  ["9709:2.6:1", { coverageSignal: "candidate_covered", candidateIds: ["mat_locate_roots"], noteZh: "逐条复核：定位根概念明确覆盖图像判断和区间符号变化。" }],
  ["9709:2.6:2", { coverageSignal: "candidate_covered", candidateIds: ["mat_iteration"], noteZh: "逐条复核：迭代法概念覆盖逐次近似序列及收敛判断。" }],
  ["9709:2.6:3", { coverageSignal: "candidate_covered", candidateIds: ["mat_iteration"], noteZh: "逐条复核：迭代法概念覆盖由重排公式产生逐次近似并判断可能不收敛。" }],
  ["9709:3.1:2", { coverageSignal: "candidate_covered", candidateIds: ["mat_poly_division"], noteZh: "逐条复核：多项式除法概念明确覆盖线性或二次除式、商和余式。" }],
  ["9709:3.1:4", { coverageSignal: "candidate_covered", candidateIds: ["mat_partial_fractions"], noteZh: "逐条复核：部分分式概念覆盖一次、重复和二次因式的分解。" }],
  ["9709:3.2:2", { coverageSignal: "candidate_partial", candidateIds: ["mat_exp_func", "mat_log_laws"], noteZh: "逐条复核：指数函数和对数概念覆盖互逆与指数图像，但未完整描述 ln x 的性质和图像。" }],
  ["9709:3.2:4", { coverageSignal: "candidate_covered", candidateIds: ["mat_linearise"], noteZh: "逐条复核：对数线性化概念直接覆盖变换关系式并由梯度、截距求常数。" }],
  ["9709:3.4:2", { coverageSignal: "candidate_covered", candidateIds: ["mat_product_quotient"], noteZh: "逐条复核：乘积与商法则概念直接覆盖乘积和商的求导。" }],
  ["9709:3.5:1", { coverageSignal: "candidate_partial", candidateIds: ["mat_standard_integrals"], noteZh: "逐条复核：标准积分覆盖指数、三角和幂函数，但未明确 1/(x²+a²) 等全部所列形式。" }],
  ["9709:3.5:2", { coverageSignal: "candidate_covered", candidateIds: ["mat_standard_integrals", "mat_double_angle"], noteZh: "逐条复核：标准积分和倍角公式共同覆盖用三角关系积分平方三角函数。" }],
  ["9709:3.5:4", { coverageSignal: "candidate_partial", candidateIds: ["mat_standard_integrals", "mat_substitution"], noteZh: "逐条复核：标准积分和换元法提供 f′/f 型积分基础，但现有描述未明确这一模式及对数结果。" }],
  ["9709:3.6:1", { coverageSignal: "candidate_covered", candidateIds: ["mat_locate_roots"], noteZh: "逐条复核：定位根概念明确覆盖图像判断和区间符号变化。" }],
  ["9709:3.6:2", { coverageSignal: "candidate_covered", candidateIds: ["mat_iteration"], noteZh: "逐条复核：迭代法概念覆盖逐次近似序列及收敛判断。" }],
  ["9709:3.6:3", { requirementType: "concept_and_skill", coverageSignal: "candidate_partial", candidateIds: ["mat_iteration"], noteZh: "第六批抽样修正：迭代法概念覆盖由重排公式产生逐次近似和收敛判断，但未明确与原方程的关系及达到指定精度的停止条件。" }],
  ["9709:3.7:4", { coverageSignal: "candidate_covered", candidateIds: ["mat_vector_lines"], noteZh: "逐条复核：向量直线概念覆盖 r=a+tb 中点和方向向量含义及由给定信息求方程。" }],
  ["9709:3.9:1", { coverageSignal: "candidate_partial", candidateIds: ["mat_complex_arith", "mat_mod_arg"], noteZh: "逐条复核：复数运算和模辐角形式覆盖多数术语，但未完整说明复数相等条件与两种辐角区间。" }],
  ["9709:3.9:3", { coverageSignal: "candidate_covered", candidateIds: ["mat_complex_loci"], noteZh: "逐条复核：复根与轨迹概念明确覆盖实系数多项式的非实根成共轭对。" }],
  ["9709:3.9:7", { coverageSignal: "candidate_partial", candidateIds: ["mat_complex_arith", "mat_argand"], noteZh: "逐条复核：复数运算和 Argand 图共同提供几何解释，但未逐项描述四则运算与共轭的几何效果。" }],
  ["9709:4.1:2", { coverageSignal: "candidate_covered", candidateIds: ["mat_forces_equilibrium"], noteZh: "逐条复核：力与平衡概念明确覆盖力的分量、合力和向量解析。" }],
  ["9709:4.1:3", { coverageSignal: "candidate_covered", candidateIds: ["mat_forces_equilibrium"], noteZh: "逐条复核：力与平衡概念直接覆盖合力为零及各方向分量和为零。" }],
  ["9709:4.1:4", { coverageSignal: "candidate_partial", candidateIds: ["mat_friction"], noteZh: "逐条复核：摩擦概念覆盖粗糙接触和摩擦力，但未明确把接触力分解为法向与摩擦分量。" }],
  ["9709:4.1:6", { coverageSignal: "candidate_covered", candidateIds: ["mat_friction"], noteZh: "逐条复核：摩擦概念明确覆盖摩擦系数、极限平衡和粗糙面模型。" }],
  ["9709:4.2:1", { coverageSignal: "candidate_partial", candidateIds: ["mat_kin_constant", "mat_kin_variable"], noteZh: "逐条复核：两类运动学概念覆盖位移、速度、加速度，但未明确标量与向量术语对照。" }],
  ["9709:4.2:3", { coverageSignal: "candidate_covered", candidateIds: ["mat_kin_variable"], noteZh: "逐条复核：变加速运动概念直接覆盖对时间微积分联系位移、速度和加速度。" }],
  ["9709:4.4:1", { coverageSignal: "candidate_covered", candidateIds: ["mat_newton_laws", "mat_friction", "mat_connected_particles"], noteZh: "逐条复核：牛顿定律、摩擦和连接质点概念共同覆盖恒力下直线运动及绳张力、连杆推力。" }],
  ["9709:4.4:2", { coverageSignal: "candidate_covered", candidateIds: ["mat_mass_weight"], noteZh: "人工批准：质量与重量 Concept 覆盖 W=mg 及力学题中的重力加速度约定。" }],
  ["9709:4.4:3", { coverageSignal: "candidate_covered", candidateIds: ["mat_kin_constant", "mat_forces_equilibrium", "mat_friction"], noteZh: "逐条复核：匀加速运动、力平衡与摩擦概念共同覆盖竖直或粗糙斜面上的质点运动。" }],
  ["9709:4.5:1", { coverageSignal: "candidate_partial", candidateIds: ["mat_work_energy_power"], noteZh: "逐条复核：功、能、功率概念覆盖恒力做功，但描述未明确非平行位移下 W=Fd cosθ。" }],
  ["9709:4.5:3", { coverageSignal: "candidate_covered", candidateIds: ["mat_work_energy_power"], noteZh: "逐条复核：功、能、功率概念明确包含功-能原理与系统能量变化。" }],
  ["9709:4.5:5", { coverageSignal: "candidate_partial", candidateIds: ["mat_newton_laws", "mat_friction", "mat_work_energy_power"], noteZh: "逐条复核：三个概念提供合力、阻力和功率背景，但未整合山坡汽车瞬时加速度模型。" }],
  ["9709:5.1:5", { coverageSignal: "candidate_partial", candidateIds: ["mat_central_spread"], noteZh: "逐条复核：集中趋势与离散程度概念覆盖均值和标准差，但未明确分组数据、编码总和及两组数据计算。" }],
  ["9709:5.3:2", { coverageSignal: "candidate_covered", candidateIds: ["mat_prob_rules"], noteZh: "逐条复核：概率法则概念直接覆盖简单情形下的加法与乘法规则。" }],
  ["9709:5.3:3", { coverageSignal: "candidate_covered", candidateIds: ["mat_prob_rules"], noteZh: "逐条复核：概率法则概念明确覆盖互斥与独立事件及相应加乘规则。" }],
  ["9709:5.5:3", { coverageSignal: "candidate_covered", candidateIds: ["mat_normal_approx"], noteZh: "逐条复核：正态近似概念明确覆盖二项分布近似条件和连续性修正。" }],
  ["9709:6.2:1", { coverageSignal: "candidate_partial", candidateIds: ["mat_discrete_rv", "mat_normal_dist", "mat_poisson"], noteZh: "逐条复核：三个概念覆盖期望方差、正态及泊松背景，但未列出线性组合的全部期望与方差结果。" }],
  ["9709:6.3:1", { coverageSignal: "candidate_covered", candidateIds: ["mat_continuous_random_variables", "mat_probability_density_function"], noteZh: "人工批准：连续随机变量和概率密度函数共同覆盖连续取值域及密度性质。" }],
  ["9709:6.4:7", { coverageSignal: "candidate_covered", candidateIds: ["mat_statistical_estimation"], noteZh: "人工批准：统计估计 Concept 覆盖总体均值置信区间。" }],
  ["9709:6.5:3", { coverageSignal: "candidate_partial", candidateIds: ["mat_hypothesis", "mat_normal_dist"], noteZh: "逐条复核：假设检验和正态分布概念提供基础，但未明确已知方差或大样本的总体均值检验流程。" }],
  ["9709:3.8:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_form_de", "mat_separation"],
    noteZh: "已对照官方页：建立微分方程和分离变量概念共同覆盖现实情境建模与求解，但现有描述未明确把所得解回到情境中解释。"
  }],
  ["9700:19.2:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_gene_applications"],
    noteZh: "已对照官方页：遗传技术应用概念包含遗传筛查，但现有描述未解释其优势及 BRCA1/2、亨廷顿病和囊性纤维化实例。"
  }],
  ["9701:7.2:8", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_bronsted"],
    noteZh: "已对照官方页：Brønsted-Lowry 酸碱概念提供中和背景，但现有描述未明确中和反应生成盐；羧酸不是通用候选。"
  }],
  ["9702:6.1:4", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_hookes_law"],
    noteZh: "已对照官方页：Hooke 定律概念直接说明弹簧伸长与力成正比，覆盖 k=F/x 的定义和使用。"
  }],
  ["9702:7.1:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_progressive_waves"],
    noteZh: "已对照官方页：行波概念覆盖波传能及振幅、波长、频率、速度，但现有描述未列绳、弹簧和波纹槽示例。"
  }],
  ["9702:7.3:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_doppler"],
    noteZh: "已对照官方页：Doppler 效应概念覆盖移动声源导致观测频率变化，但现有描述未明确给定的声源移动公式；驻波不是相关候选。"
  }],
  ["9709:2.3:2", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_trig_identities", "mat_double_angle", "mat_rform", "mat_solve_trig"],
    noteZh: "逐条复核：恒等式、复合与倍角公式、R 公式和三角方程概念共同覆盖全部所列关系与应用。"
  }],
  ["9709:3.7:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_vector_basics"],
    noteZh: "已对照官方页：二维/三维向量概念明确覆盖加减和数乘，但现有描述未说明几何解释、平行四边形及中点位置向量。"
  }],
  ["9700:15.1:7", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_nervous"],
    noteZh: "已对照官方页：神经传导概念覆盖动作电位和离子移动，但现有描述未涉及髓鞘与跳跃式传导。"
  }],
  ["9701:13.3:3", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页并检索现有化学 KG：共价键概念只到单、双、三键，没有 sp、sp²、sp³ 杂化原子中的 σ/π 键排列概念。"
  }],
  ["9701:23.3:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_entropy"],
    noteZh: "已对照官方页：熵概念提供无序度和总熵趋势背景，但未逐项覆盖相变、温变及气体分子数变化时熵变符号的预测解释。"
  }],
  ["9702:10.2:5", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_kirchhoff", "phy_series_parallel"],
    noteZh: "已对照官方页：Kirchhoff 定律与串并联电阻概念共同覆盖推导两个或多个并联电阻的合成公式。"
  }],
  ["9709:1.5:1", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_trig_ratios"],
    noteZh: "已对照官方页：三角比与图像概念明确覆盖正弦、余弦、正切图像、周期及任意角使用。"
  }],
  ["9709:1.7:2", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_power_rule", "mat_chain_rule"],
    noteZh: "已对照官方页：幂函数求导和链式法则概念共同覆盖有理次幂、线性组合及复合函数求导。"
  }],
  ["9709:3.7:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_vector_magnitude", "mat_vector_basics"],
    noteZh: "已对照官方页：向量模方向及二维/三维向量概念共同覆盖模、单位向量和分量形式，但现有描述未明确位移向量与位置向量。"
  }],
  ["9700:11.1:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_immune_response"],
    noteZh: "已对照官方页：免疫反应概念覆盖吞噬细胞、细胞免疫和体液免疫，但未按顺序细分巨噬细胞、浆细胞、T 辅助与 T 杀伤细胞。"
  }],
  ["9700:19.1:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_gene_tech"],
    noteZh: "已对照官方页：基因技术概念覆盖把基因插入载体，但现有描述未区分从供体 DNA 提取、从 mRNA 反转录和化学合成三种来源。"
  }],
  ["9701:15.1:5", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_nucleophilic_sub"],
    noteZh: "已对照官方页：亲核取代概念明确包含 SN1 与 SN2 机理，但现有描述未解释烷基诱导效应。"
  }],
  ["9701:20.1:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_addition_polymer"],
    noteZh: "已对照官方页：加聚合概念覆盖聚烯烃处置的环境问题，但现有描述未明确不可生物降解和有害燃烧产物。"
  }],
  ["9701:26.1:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_rate_equation", "che_rate"],
    noteZh: "已对照官方页：速率方程与反应速率概念覆盖速率式、级数、速率常数和浓度变化，但未完整覆盖初始速率法、半衰期法及两类图像解读。"
  }],
  ["9702:25.2:1", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_stellar_radii"],
    noteZh: "已对照官方页：恒星半径概念明确包含用 Wien 定律和表面温度估算恒星性质，覆盖由峰值波长估计温度。"
  }],
  ["9709:1.8:4", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_definite_area", "mat_volumes"],
    noteZh: "已对照官方页：定积分面积与旋转体体积两个现有概念共同覆盖曲线间面积及绕坐标轴旋转所得体积。"
  }],
  ["9700:7.2:5", {
    requirementType: "practical_skill",
    coverageSignal: "skill_mapping_required",
    candidateIds: ["bio_transpiration"],
    noteZh: "已对照官方页：要求制作带注释的叶横切面图，属于实践绘图技能；蒸腾概念提供减少水分散失的解释背景。"
  }],
  ["9700:8.1:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_blood_vessels"],
    noteZh: "已对照官方页：血管概念覆盖动脉、静脉、毛细血管结构与功能适应，但未区分肌性动脉和弹性动脉。"
  }],
  ["9700:17.3:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_classification"],
    noteZh: "已对照官方页：分类概念说明系统反映进化关系，但现有描述未说明如何用 DNA 序列差异推断物种亲缘。"
  }],
  ["9701:3.1:1", {
    coverageSignal: "candidate_covered",
    candidateIds: ["che_electronegativity"],
    noteZh: "已对照官方页：电负性概念直接定义原子吸引共享电子对的能力。"
  }],
  ["9701:3.6:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_ionic", "che_covalent", "che_metallic", "che_imf"],
    noteZh: "已对照官方页：四个现有概念覆盖离子键、共价键、金属键和分子间作用力，但描述未直接比较前三类通常强于分子间力。"
  }],
  ["9701:5.1:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_bond_enthalpy"],
    noteZh: "已对照官方页：键焓概念覆盖断键能量和反应焓估算，但现有描述未直接说明断键吸能、成键放能造成反应能量转移。"
  }],
  ["9702:20.3:6", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_e_field_strength", "phy_force_charge"],
    noteZh: "已对照官方页：电场力和运动电荷磁力概念共同提供速度选择原理，但现有描述未明确交叉场中 qE=Bqv 的选择条件。"
  }],
  ["9702:20.5:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_flux_linkage"],
    noteZh: "已对照官方页：磁通与磁通链概念覆盖线圈磁通，但现有描述未明确垂直截面积下 Φ=BA 的定义。"
  }],
  ["9709:2.5:1", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_standard_integrals"],
    noteZh: "已对照官方页：标准函数积分概念覆盖幂、指数和三角函数的已知原函数；本要求明确不要求一般换元法。"
  }],
  ["9709:6.4:5", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_sampling", "mat_normal_dist"],
    noteZh: "已对照官方页：抽样和正态分布概念共同提供样本均值分布与正态近似背景，但现有描述未明确中央极限定理。"
  }],
  ["9700:2.2:9", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_lipids"],
    noteZh: "已对照官方页：脂质概念明确包含疏水性甘油三酯，但未描述甘油、饱和/不饱和脂肪酸和酯键形成的分子结构。"
  }],
  ["9700:14.2:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_transpiration"],
    noteZh: "已对照官方页：蒸腾概念覆盖气孔和光照对蒸腾的影响，但现有描述未明确气孔开闭的昼夜节律。"
  }],
  ["9701:1.4:5", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_ionisation", "che_periodic_trends"],
    noteZh: "已对照官方页：电离能和周期趋势概念共同提供去除外层电子、核电荷及屏蔽背景，但未直接陈述电离能来自原子核与外层电子的吸引。"
  }],
  ["9701:28.5:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_complex_ions"],
    noteZh: "已对照官方页：配合离子概念提供配合物形成背景，但现有描述没有 Kstab 表达式及其计算。"
  }],
  ["9702:12.2:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_centripetal_force", "phy_centripetal_accel"],
    noteZh: "已对照官方页：向心力和向心加速度概念共同覆盖力、速度、半径与角速度关系，但现有描述未明确两条公式。"
  }],
  ["9702:18.3:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_coulomb"],
    noteZh: "已对照官方页：Coulomb 定律提供点电荷模型，但现有描述未明确球形导体外部可等效为中心点电荷；运动电荷磁力不是相关候选。"
  }],
  ["9700:10.1:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_infectious"],
    noteZh: "已对照官方页：感染病概念覆盖细菌、病毒、真菌和原生生物病原体类型，但现有描述未逐一列出霍乱、疟疾、结核病和 HIV/AIDS 的病原体名称。"
  }],
  ["9700:12.1:6", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页并检索现有生物 KG：没有呼吸商定义或由呼吸方程计算不同底物 RQ 的概念。"
  }],
  ["9701:3.5:1", {
    coverageSignal: "candidate_covered",
    candidateIds: ["che_vsepr"],
    noteZh: "已对照官方页：VSEPR 概念直接覆盖用电子对排斥预测分子形状和键角，所列分子均属于该概念范围。"
  }],
  ["9701:28.2:9", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_redox_equations", "che_transition_props"],
    noteZh: "已对照官方页：氧化还原方程和过渡元素概念提供反应与变价背景，但未完整覆盖三组指定反应及其定量计算。"
  }],
  ["9701:32.2:6", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页并检索现有化学 KG：没有苯酚或羟基对 2、4、6 位定向效应概念。"
  }],
  ["9702:25.3:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_energy_levels", "phy_hubble"],
    noteZh: "已对照官方页：线光谱和 Hubble 概念分别提供已知谱线与退行背景，但现有描述未明确遥远天体谱线波长增加即红移。"
  }],
  ["9709:2.5:2", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_standard_integrals", "mat_double_angle"],
    noteZh: "逐条复核：标准积分和倍角公式共同覆盖用三角关系积分平方三角函数。"
  }],
  ["9700:3.2:3", {
    coverageSignal: "candidate_covered",
    candidateIds: ["bio_enzyme_inhibition"],
    noteZh: "已对照官方页：酶抑制概念明确区分竞争性抑制剂结合活性位点与非竞争性抑制剂在其他位置结合。"
  }],
  ["9700:13.1:8", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_light_dependent"],
    noteZh: "已对照官方页：光反应概念覆盖类囊体吸光和 ATP 合成，但现有描述未区分循环光合磷酸化只用 PSI、只产 ATP。"
  }],
  ["9700:17.2:6", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页并检索现有生物 KG：自然选择概念不能代替人为选择；当前没有选择育种原则概念。"
  }],
  ["9701:4.2:2", {
    coverageSignal: "candidate_covered",
    candidateIds: ["che_solids"],
    noteZh: "已对照官方页：固体结构概念明确覆盖离子、巨型共价、简单分子和金属结构，并以键合与排列解释物理性质。"
  }],
  ["9701:34.2:1", {
    requirementType: "concept",
    coverageSignal: "candidate_partial",
    candidateIds: ["che_benzene", "che_electrophilic_sub", "che_amines"],
    noteZh: "已对照官方页：该要求是描述合成路线而非实施实验；苯、亲电取代和胺概念提供路线背景，但未完整写出硝化、Sn/HCl 还原及 NaOH 条件。"
  }],
  ["9701:37.2:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_chromatography"],
    noteZh: "已对照官方页：色谱概念覆盖气相/液相分离和保留时间背景，但现有描述未明确由峰面积解释混合物百分组成。"
  }],
  ["9702:12.2:1", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_centripetal_force", "phy_centripetal_accel"],
    noteZh: "已对照官方页：向心力和向心加速度概念共同覆盖恒定大小、始终垂直速度方向的合力产生向心加速度。"
  }],
  ["9702:22.4:2", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_energy_levels"],
    noteZh: "已对照官方页：能级与线光谱概念明确说明电子能级跃迁时光子发射或吸收形成发射和吸收线光谱。"
  }],
  ["9700:4.2:5", {
    coverageSignal: "skill_mapping_required",
    candidateIds: ["bio_passive_transport"],
    noteZh: "已对照官方页：这是用植物组织估算水势的渗透实践技能，应映射到扩散与渗透概念供技能审核。"
  }],
  ["9700:8.2:3", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页并检索现有生物 KG：血红蛋白概念只覆盖氧运输和 Bohr 效应，没有血浆以溶解 CO₂/碳酸氢根运输二氧化碳的概念。"
  }],
  ["9700:12.2:11", {
    coverageSignal: "candidate_covered",
    candidateIds: ["bio_oxidative", "bio_anaerobic"],
    noteZh: "已对照官方页：氧化磷酸化概念说明合成大部分 ATP，无氧呼吸概念说明 ATP 产量低，两者共同覆盖能量产量差异。"
  }],
  ["9701:3.6:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_imf"],
    noteZh: "已对照官方页：分子间作用力概念覆盖氢键及其对沸点等性质的影响，但未完整覆盖冰/水密度、表面张力和所限定的 N–H/O–H 实例。"
  }],
  ["9702:1.3:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_uncertainty"],
    noteZh: "已对照官方页：误差与不确定度概念提供测量质量背景，但现有描述未直接区分精密度和准确度；波型不是相关候选。"
  }],
  ["9702:2.1:4", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_motion_graphs"],
    noteZh: "已对照官方页：运动图像概念明确说明位移-时间图的梯度给出速度。"
  }],
  ["9702:7.1:3", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页并检索现有物理 KG：没有阴极射线示波器的时基、Y 增益及频率/振幅测量概念。"
  }],
  ["9702:17.1:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_shm"],
    noteZh: "已对照官方页：简谐运动概念覆盖正弦运动，但现有描述未明确两条速度方程。"
  }],
  ["9709:3.2:1", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_log_laws"],
    noteZh: "已对照官方页：对数与对数律概念明确覆盖对数和指数的互逆关系以及积、商、幂的对数律。"
  }],
  ["9700:15.1:6", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_nervous"],
    noteZh: "已对照官方页：神经传导概念覆盖钠、钾离子产生动作电位，但现有描述未完整覆盖静息电位维持、复极和不应期恢复。"
  }],
  ["9700:16.3:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_gene_control"],
    noteZh: "已对照官方页：基因表达调控概念提供调控基因和开关背景，但现有描述未区分结构/调控基因及可阻遏/可诱导酶。"
  }],
  ["9701:28.2:8", {
    coverageSignal: "candidate_covered",
    candidateIds: ["che_electrode_potential"],
    noteZh: "已对照官方页：标准电极电势概念覆盖用 E° 比较半电池得电子倾向并预测氧化还原反应可行性。"
  }],
  ["9701:28.3:5", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_complex_ions", "che_colour_catalysis"],
    noteZh: "已对照官方页：配合物和颜色概念共同覆盖配体及颜色来源，但现有描述未包含铜(II)、钴(II)与水、氨、氢氧根、氯离子的换配体实例。"
  }],
  ["9709:1.3:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_straight_lines", "mat_parallel_perp"],
    noteZh: "已对照官方页：直线和垂直平行概念覆盖直线方程形式、梯度、截距及垂直平行关系，但现有描述未明确距离、中点和交点计算的全部范围。"
  }],
  ["9700:17.1:4", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页并检索现有生物 KG：没有双样本均值 t 检验概念。"
  }],
  ["9700:18.1:6", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页并检索现有生物 KG：感染病概念仅提到病毒是病原体，没有按 RNA/DNA 及单双链分类病毒的概念。"
  }],
  ["9701:16.1:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_alkenes", "che_nucleophilic_sub", "che_aldehydes_ketones", "che_carboxylic_acids", "che_esters"],
    noteZh: "已对照官方页：烯烃、亲核取代、羰基、羧酸和酯概念共同覆盖制备醇的反应来源，但现有描述未完整包含全部试剂、条件和还原/水解路线。"
  }],
  ["9701:25.1:6", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_buffers", "che_ph_ka"],
    noteZh: "已对照官方页：缓冲溶液和 pH/Ka 概念共同提供计算基础，但现有描述未明确缓冲液 pH 计算公式和步骤。"
  }],
  ["9701:32.2:1", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页并检索现有化学 KG：没有苯酚概念，也没有苯胺重氮化后水解制苯酚的路线。"
  }],
  ["9702:11.1:1", {
    requirementType: "concept",
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_nuclear_structure"],
    noteZh: "已对照官方页：这是由 α 散射结果推断原子核的概念证据，不是要求考生实施实验；核结构概念覆盖小而致密的原子核，但未描述散射证据链。"
  }],
  ["9702:11.1:3", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_nuclear_structure"],
    noteZh: "已对照官方页：核结构概念明确使用质子数和核子数描述原子核，覆盖两者区分。"
  }],
  ["9709:1.8:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_indefinite"],
    noteZh: "已对照官方页：不定积分概念覆盖积分常数，但现有描述未明确利用曲线上给定点求出该常数。"
  }],
  ["9709:3.4:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_special_derivatives", "mat_chain_rule"],
    noteZh: "已对照官方页：特殊函数导数和链式法则共同覆盖指数、对数、三角函数与复合函数求导，但现有描述未明确反正切导数。"
  }],
  ["9709:5.2:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_perm_comb"],
    noteZh: "已对照官方页：排列组合概念覆盖有序排列，但现有描述未明确重复元素、相邻限制和多排座位问题。"
  }],
  ["9700:11.1:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_antibodies", "bio_immune_response"],
    noteZh: "已对照官方页：抗体和免疫反应概念使用抗原这一术语，但现有描述未定义抗原，也未区分自身与非自身抗原。"
  }],
  ["9700:18.3:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_conservation"],
    noteZh: "已对照官方页：保护概念说明维持生物多样性和生态系统的方法，但现有描述未明确列出需要维持生物多样性的理由。"
  }],
  ["9701:9.1:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_periodic_trends", "che_period3"],
    noteZh: "已对照官方页：周期趋势和 Period 3 概念覆盖原子半径及元素性质变化，但未完整包含离子半径、熔点和电导率的周期性解释。"
  }],
  ["9701:21.1:2", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页并检索现有化学 KG：已有分散的有机反应概念，但没有设计多步有机合成路线的整合概念。"
  }],
  ["9701:33.1:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_carboxylic_acids"],
    noteZh: "已对照官方页：羧酸概念覆盖形成酰基衍生物，但现有描述未明确 PCl₃、PCl₅、SOCl₂ 和加热条件制酰氯。"
  }],
  ["9702:5.1:3", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_power_efficiency"],
    noteZh: "已对照官方页：功率与效率概念直接把效率定义为有用输出与总输入能量之比；能量守恒不是并列候选。"
  }],
  ["9702:15.3:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_kinetic_theory", "phy_ideal_gas"],
    noteZh: "已对照官方页：气体动理论和理想气体方程共同提供 pV 与均方速率、温度关系，但现有描述未明确推导并使用平均平动动能 3kT/2。"
  }],
  ["9709:3.7:1", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_vector_basics"],
    noteZh: "已对照官方页：二维与三维向量概念明确覆盖分量形式和单位向量形式的标准记号。"
  }],
  ["9700:2.2:5", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_carbohydrates"],
    noteZh: "已对照官方页：碳水化合物概念覆盖单糖经糖苷键构成多糖，但现有描述未明确缩合成键、蔗糖和二糖实例。"
  }],
  ["9700:16.1:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_meiosis"],
    noteZh: "已对照官方页：减数分裂概念覆盖减数分裂目的和遗传变异，但现有描述未逐阶段覆盖染色体、核膜、细胞膜及纺锤体行为。"
  }],
  ["9701:9.2:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_period3", "che_oxidation_number"],
    noteZh: "已对照官方页：Period 3 和氧化数概念共同提供元素、氧化物、氯化物和氧化数背景，但未完整解释所列物质中氧化数随价电子的变化。"
  }],
  ["9702:18.5:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_e_potential"],
    noteZh: "已对照官方页：电势概念覆盖单位正电荷做功的定义，但现有描述未明确点电荷电势公式 V=Q/(4πε₀r)。"
  }],
  ["9702:19.3:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_capacitor_discharge"],
    noteZh: "已对照官方页：电容充放电概念直接覆盖 RC 指数放电，但现有描述未明确电流、电荷和电势差的 x=x₀e^(−t/RC) 形式。"
  }],
  ["9702:20.5:5", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_faraday", "phy_lenz"],
    noteZh: "已对照官方页：Faraday 定律与 Lenz 定律两个现有概念共同完整覆盖该要求。"
  }],
  ["9702:23.2:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_radioactive_decay"],
    noteZh: "已对照官方页：放射性衰变概念明确覆盖随机性，但现有描述未说明计数率涨落是随机性的实验证据。"
  }],
  ["9709:5.1:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_central_spread"],
    noteZh: "已对照官方页：集中趋势与离散程度概念覆盖均值、中位数、方差、标准差和四分位数，但现有描述未明确众数、极差及四分位距。"
  }],
  ["9700:15.1:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_nervous"],
    noteZh: "已对照官方页：神经传导概念覆盖感觉神经元冲动传递，但现有描述未覆盖感受器细胞检测刺激并触发冲动。"
  }],
  ["9700:17.2:7", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页并检索现有生物 KG：没有人工选择或选择育种及所列作物、奶牛实例概念。"
  }],
  ["9700:18.3:6", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_conservation"],
    noteZh: "已对照官方页：保护生物学概念覆盖维持物种和栖息地，但现有描述未明确 IUCN 与 CITES 的制度角色。"
  }],
  ["9701:1.2:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_isotopes"],
    noteZh: "已对照官方页：同位素概念明确覆盖质量数不同及化学性质相同，但现有描述未明确密度这一物理性质差异。"
  }],
  ["9701:37.1:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_chromatography"],
    noteZh: "已对照官方页：色谱概念覆盖固定相、流动相和 Rf 值，但现有描述未明确溶剂前沿与基线。"
  }],
  ["9709:2.1:1", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_modulus"],
    noteZh: "已对照官方页：绝对值函数概念直接覆盖绝对值含义、图像以及相关方程和不等式；三角方程不是相关候选。"
  }],
  ["9709:2.2:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_solve_exp"],
    noteZh: "已对照官方页：指数与对数方程概念直接覆盖用对数解指数方程，但现有描述未明确指数不等式。"
  }],
  ["9700:11.1:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_immune_response"],
    noteZh: "已对照官方页：免疫反应概念覆盖吞噬细胞吞入病原体，但未细分巨噬细胞、中性粒细胞及吞噬过程的作用步骤。"
  }],
  ["9701:1.1:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_subatomic"],
    noteZh: "已对照官方页：亚原子粒子概念覆盖质子、中子、电子的相对质量和电荷，但现有描述未明确质量与电荷在原子内的空间分布；质谱不是本要求候选。"
  }],
  ["9701:7.1:8", {
    coverageSignal: "candidate_covered",
    candidateIds: ["che_kc_kp"],
    noteZh: "已对照官方页：Kc/Kp 概念用浓度或分压表达平衡位置，覆盖利用给定数据计算平衡组成。"
  }],
  ["9701:26.1:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_rate_equation", "che_rds"],
    noteZh: "已对照官方页：速率方程和决速步概念覆盖速率式、级数、速率常数与决速步，但未完整覆盖半衰期和中间体术语。"
  }],
  ["9701:29.2:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_electrophilic_sub", "che_mechanism_types"],
    noteZh: "已对照官方页：亲电取代概念完整覆盖第一类术语，机理分类提供加成/消除背景，但现有描述没有 addition–elimination 这一组合机理。"
  }],
  ["9702:3.2:3", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页并检索现有物理 KG：没有阻力下达到终端速度的概念。"
  }],
  ["9702:4.1:1", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页并检索现有物理 KG：没有重心及把重量视为作用于单点的概念。"
  }],
  ["9702:9.1:2", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_current_charge"],
    noteZh: "已对照官方页：电流与电荷概念明确说明电荷以元电荷为单位量子化。"
  }],
  ["9702:10.2:3", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_kirchhoff", "phy_series_parallel"],
    noteZh: "已对照官方页：Kirchhoff 定律与串并联电阻概念共同覆盖推导两个或多个串联电阻的合成公式。"
  }],
  ["9709:6.5:5", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_hypothesis", "mat_normal_dist", "mat_binomial_dist", "mat_poisson"],
    noteZh: "已对照官方页：假设检验及三种分布概念共同提供计算基础，但现有描述未覆盖 Type I、Type II 错误概率的完整流程。"
  }],
  ["9700:1.2:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_organelles"],
    noteZh: "已对照官方页：真核细胞器概念覆盖部分共同结构，但现有 KG 没有完整比较典型植物细胞与动物细胞的概念。"
  }],
  ["9701:6.1:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_oxidation_number", "che_redox_equations"],
    noteZh: "已对照官方页：氧化数和氧化还原方程概念提供电子转移背景，但现有描述未直接定义氧化剂和还原剂。"
  }],
  ["9702:9.3:6", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_resistivity"],
    noteZh: "已对照官方页：电阻率概念覆盖电阻与长度、截面积的关系，但现有描述未明确 R=ρL/A。"
  }],
  ["9702:13.1:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_grav_field_strength"],
    noteZh: "已对照官方页：引力场强概念提供场的方向与强度，但现有描述未明确用场线表示引力场。"
  }],
  ["9702:24.3:6", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_radioactive_decay", "phy_photon"],
    noteZh: "已对照官方页：放射性衰变和光子概念提供 β+ 与 γ 光子背景，但现有描述未覆盖湮灭光子探测、到达时间处理和 PET 图像重建。"
  }],
  ["9709:1.1:1", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_quadratics"],
    noteZh: "已对照官方页：二次函数概念明确覆盖配方并用配方形式定位顶点和草绘抛物线。"
  }],
  ["9709:6.4:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_sampling"],
    noteZh: "已对照官方页：抽样概念覆盖总体与样本，但现有描述未明确随机选择的必要性。"
  }],
  ["9700:1.1:4", {
    requirementType: "practical_skill",
    coverageSignal: "skill_mapping_required",
    candidateIds: ["bio_microscopy"],
    noteZh: "已对照官方页：目镜测微尺、载物台测微尺和单位换算属于显微测量实践技能，应映射到显微镜概念后人工审技能覆盖。"
  }],
  ["9700:2.2:6", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_carbohydrates", "bio_tests"],
    noteZh: "已对照官方页：碳水化合物和生化检验概念覆盖糖苷键与糖类检验背景，但未完整描述水解和非还原糖检验流程。"
  }],
  ["9700:2.2:8", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_carbohydrates"],
    noteZh: "已对照官方页：碳水化合物概念包含纤维素及结构功能，但未展开纤维素分子排列如何形成植物细胞壁。"
  }],
  ["9700:13.1:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_light_dependent"],
    noteZh: "已对照官方页：光反应概念覆盖类囊体吸光，但现有描述未列出叶绿素 a、叶绿素 b、胡萝卜素和叶黄素的作用。"
  }],
  ["9701:22.2:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_isotopes", "che_mass_spec"],
    noteZh: "已对照官方页：同位素和质谱概念提供必要背景，但现有描述未明确按同位素相对丰度计算相对原子质量。"
  }],
  ["9701:1.4:6", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_ionisation", "che_periodic_trends"],
    noteZh: "已对照官方页：电离能和周期趋势概念覆盖核电荷、半径和屏蔽因素，但未明确亚层与自旋成对排斥的全部影响。"
  }],
  ["9709:3.3:2", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_trig_identities", "mat_double_angle", "mat_rform", "mat_solve_trig"],
    noteZh: "逐条复核：恒等式、复合与倍角公式、R 公式和三角方程概念共同覆盖全部所列关系与应用。"
  }],
  ["9709:3.8:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_separation"],
    noteZh: "已对照官方页：分离变量概念覆盖微分方程通解，但现有描述未明确用初始条件求特解。"
  }],
  ["9700:12.1:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_glycolysis", "bio_oxidative", "bio_light_dependent"],
    noteZh: "已对照官方页：三个现有概念覆盖糖酵解产 ATP、线粒体化学渗透和叶绿体光反应产 ATP，但未明确概括底物水平磷酸化的磷酸转移。"
  }],
  ["9701:23.2:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_hess", "che_born_haber"],
    noteZh: "已对照官方页：Hess 定律和晶格能循环概念提供能量循环基础，但现有描述未完整覆盖溶解焓、晶格能和水合焓循环的计算。"
  }],
  ["9701:23.4:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_gibbs"],
    noteZh: "已对照官方页：Gibbs 自由能概念结合焓与熵，但现有描述未明确 ΔG°=ΔH°−TΔS° 及其计算。"
  }],
  ["9701:37.4:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_nmr"],
    noteZh: "已对照官方页：NMR 概念覆盖化学环境与结构判定，但现有描述未明确预测质子化学位移和裂分模式。"
  }],
  ["9702:3.1:2", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_newton_laws"],
    noteZh: "已对照官方页：牛顿运动定律概念直接覆盖合力、质量和加速度关系，即 F=ma 及合力与加速度同向。"
  }],
  ["9709:1.3:4", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_straight_lines", "mat_circles", "mat_parallel_perp"],
    noteZh: "已对照官方页：要求是用代数和初等圆几何处理直线与圆，且明确排除隐函数微分；直线、圆及垂直关系概念共同覆盖。"
  }],
  ["9709:3.5:5", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_by_parts"],
    noteZh: "已对照官方页：分部积分概念直接覆盖识别乘积型被积函数并应用分部积分。"
  }],
  ["9700:1.1:1", {
    coverageSignal: "skill_mapping_required",
    candidateIds: ["bio_microscopy"],
    noteZh: "已对照官方页：这是显微制片实践技能，应映射到显微镜概念供技能审核，不计为 Concept 缺口。"
  }],
  ["9700:2.2:7", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_carbohydrates"],
    noteZh: "已对照官方页：碳水化合物概念包含淀粉和糖原，但未细分直链淀粉、支链淀粉的分子结构及逐项结构功能关系。"
  }],
  ["9701:13.2:2", {
    coverageSignal: "candidate_covered",
    candidateIds: ["che_mechanism_types", "che_alkanes", "che_alkenes", "che_nucleophilic_sub", "che_aldehydes_ketones"],
    noteZh: "已对照官方页：反应机理分类及四类现有有机反应概念共同覆盖自由基取代、亲电加成、亲核取代、亲核加成和弯箭表示。"
  }],
  ["9701:23.3:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_entropy"],
    noteZh: "已对照官方页：熵概念方向正确，但现有描述未包含用反应物和生成物标准熵计算反应熵变的公式。"
  }],
  ["9701:34.3:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_amines", "che_esters"],
    noteZh: "已对照官方页：胺与酰氯概念提供反应物和酰化背景，但现有描述未明确氨或伯胺在室温与酰氯制备酰胺的两条路线。"
  }],
  ["9702:3.1:6", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_mass_weight"],
    noteZh: "已对照官方页：质量与重量概念直接覆盖重量是引力场对质量的作用以及 W=mg 关系。"
  }],
  ["9702:17.1:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_shm"],
    noteZh: "已对照官方页：简谐运动概念覆盖回复加速度与正弦运动，但现有描述未明确 a=-ω²x 和 x=x₀sinωt。"
  }],
  ["9702:19.1:2", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_capacitance_def"],
    noteZh: "已对照官方页：电容定义为单位电势差所存电荷，等价于 C=Q/V。"
  }],
  ["9702:24.3:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_radioactive_decay"],
    noteZh: "已对照官方页：放射性衰变概念覆盖 β 衰变背景，但现有描述未覆盖 β+ 示踪剂和正电子发射断层扫描应用。"
  }],
  ["9709:2.2:4", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_linearise"],
    noteZh: "已对照官方页：线性化概念直接覆盖用对数把关系式化为直线形式。"
  }],
  ["9709:2.4:2", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_product_quotient"],
    noteZh: "已对照官方页：乘积与商法则概念直接覆盖乘积和商的求导。"
  }],
  ["9709:6.3:2", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_probability_density_function"],
    noteZh: "人工批准：概率密度函数 Concept 覆盖概率、均值、方差、中位数和百分位数计算。"
  }],
  ["9700:7.1:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_xylem", "bio_phloem"],
    noteZh: "已对照官方页：木质部和韧皮部概念覆盖运输功能，但现有描述未完整覆盖导管、筛管和伴胞的结构适应。"
  }],
  ["9701:1.2:1", {
    coverageSignal: "candidate_covered",
    candidateIds: ["che_isotopes"],
    noteZh: "已对照官方页：同位素概念明确包含质子数相同而中子数不同的定义。"
  }],
  ["9701:3.1:2", {
    coverageSignal: "candidate_covered",
    candidateIds: ["che_periodic_trends"],
    noteZh: "已对照官方页：周期趋势概念已用核电荷、原子半径和屏蔽解释电负性变化。"
  }],
  ["9701:7.2:7", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_bronsted"],
    noteZh: "已对照官方页：质子酸碱概念提供中和反应基础，但现有描述未明确 H+ 与 OH- 生成水的离子方程式。"
  }],
  ["9701:19.2:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_nucleophilic_sub"],
    noteZh: "已对照官方页：亲核取代概念覆盖卤代烷反应方向，但现有描述未明确乙醇中 KCN、加热及腈产物。"
  }],
  ["9701:28.4:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_isomerism", "che_complex_ions"],
    noteZh: "已对照官方页：异构和配合物概念共同覆盖顺反及光学异构方向，但未完整列明过渡金属配合物与双齿配体实例。"
  }],
  ["9702:7.4:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_em_spectrum"],
    noteZh: "已对照官方页：电磁谱概念覆盖各波段顺序，但现有描述未给出各波段的近似波长范围。"
  }],
  ["9709:1.7:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_rates", "mat_tangent_normal"],
    noteZh: "已对照官方页：要求同时包含相关变化率、切线法线和单调性，现有两个候选只能覆盖其中部分。"
  }],
  ["9709:3.1:5", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_binomial_gen"],
    noteZh: "已对照官方页：有理或负指数的二项展开及收敛范围由现有一般指数二项展开概念覆盖。"
  }],
  ["9709:3.4:3", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_parametric", "mat_implicit", "mat_tangent_normal"],
    noteZh: "已对照官方页：参数微分、隐函数微分及切线法线三个现有概念共同覆盖该要求。"
  }],
  ["9709:6.4:8", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_statistical_estimation"],
    noteZh: "人工批准：统计估计 Concept 覆盖大样本总体比例的近似置信区间。"
  }],
  ["9709:3.7:6", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_scalar_product"],
    noteZh: "已对照官方页：标量积概念覆盖点积计算、夹角和垂直性，足以支撑直线与点的所列应用。"
  }],
  ["9709:6.1:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_poisson"],
    noteZh: "已对照官方页：泊松分布概念方向正确，但现有描述未明确均值和方差均等于参数。"
  }],
  ["9709:3.9:5", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_mod_arg"],
    noteZh: "已对照官方页：模角形式概念明确覆盖极形式复数乘除时模与辐角的组合规则。"
  }],
  ["9709:3.5:3", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_int_partial"],
    noteZh: "已对照官方页：部分分式积分概念完整覆盖先分解有理函数再逐项积分。"
  }],
  ["9709:3.9:2", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_complex_arith"],
    noteZh: "已对照官方页：复数运算概念明确覆盖笛卡尔形式的加减乘除。"
  }],
  ["9709:3.5:6", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_substitution"],
    noteZh: "已对照官方页：换元积分概念直接覆盖使用给定换元化简并求定积分或不定积分。"
  }],
  ["9709:6.5:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_hypothesis"],
    noteZh: "已对照官方页：假设检验概念方向正确，但现有描述没有 Type I 和 Type II 错误。"
  }],
  ["9709:5.5:2", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_normal_dist"],
    noteZh: "已对照官方页：正态分布概念覆盖均值方差参数和 z 分数标准化，可支撑所列概率问题。"
  }],
  ["9709:6.4:6", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_statistical_estimation"],
    noteZh: "人工批准：统计估计 Concept 覆盖由原始或汇总样本计算总体均值和方差的无偏估计。"
  }],
  ["9709:5.3:4", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_conditional"],
    noteZh: "已对照官方页：条件概率概念明确覆盖条件事件、树图和乘法法则。"
  }],
  ["9709:1.1:3", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_solve_quadratics", "mat_inequalities"],
    noteZh: "已对照官方页：二次方程求解和不等式概念共同覆盖因式分解、配方、公式及二次不等式。"
  }],
  ["9709:3.1:1", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_modulus"],
    noteZh: "已对照官方页：绝对值函数概念覆盖图像及含绝对值方程和不等式求解。"
  }],
  ["9709:3.1:3", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_factor_theorem"],
    noteZh: "已对照官方页：因式与余式定理概念直接覆盖所列因式、余式和多项式应用。"
  }],
  ["9709:1.2:1", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_functions", "mat_composite"],
    noteZh: "已对照官方页：函数与反函数、复合函数两个现有概念共同覆盖术语、定义域、值域、一一映射、逆函数和复合。"
  }],
  ["9709:1.5:2", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_trig_ratios"],
    noteZh: "已对照官方页：三角函数与图像概念明确包含标准角的正弦、余弦和正切精确值。"
  }],
  ["9709:3.8:2", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_separation"],
    noteZh: "已对照官方页：分离变量概念直接覆盖一阶可分离微分方程的积分通解。"
  }],
  ["9709:4.2:4", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_kin_constant"],
    noteZh: "已对照官方页：匀加速运动概念明确覆盖直线运动的 SUVAT 方程。"
  }],
  ["9709:1.8:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_definite_area"],
    noteZh: "已对照官方页：定积分概念覆盖有限区间求值，但现有描述未覆盖简单反常积分。"
  }],
  ["9709:6.1:5", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_normal_approx"],
    noteZh: "第六批抽样修正：正态近似概念覆盖连续性修正和泊松近似，但未明确 syllabus 给出的参数足够大条件。"
  }],
  ["9709:6.4:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_normal_dist"],
    noteZh: "已对照官方页：正态分布概念方向正确，但现有描述未明确正态总体的样本均值分布性质。"
  }],
  ["9709:4.3:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_momentum_impulse"],
    noteZh: "已对照官方页：动量与冲量概念方向正确，但现有描述未明确线性动量定义和矢量性质。"
  }],
  ["9709:6.4:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_sampling"],
    noteZh: "已对照官方页：抽样概念方向正确，但现有描述未覆盖不满意抽样原因和随机数使用。"
  }],
  ["9709:6.4:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_sampling"],
    noteZh: "已对照官方页：抽样概念提到样本均值分布，但未明确样本均值的期望和方差公式。"
  }],
  ["9709:1.2:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_functions"],
    noteZh: "已对照官方页：函数与反函数概念方向正确，但现有描述未明确反函数图像关于 y=x 对称。"
  }],
  ["9709:2.4:3", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_parametric", "mat_implicit", "mat_tangent_normal"],
    noteZh: "已对照官方页：参数微分、隐函数微分及切线法线三个现有概念共同覆盖该要求。"
  }],
  ["9709:3.2:3", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_solve_exp"],
    noteZh: "已对照官方页：解指数与对数方程概念明确覆盖用对数解未知数在指数中的方程。"
  }],
  ["9709:4.4:4", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_connected_particles"],
    noteZh: "已对照官方页：连接质点概念明确覆盖绳、滑轮及逐个应用牛顿定律的模型。"
  }],
  ["9709:6.1:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_poisson", "mat_binomial_dist"],
    noteZh: "已对照官方页：泊松和二项分布概念方向正确，但现有描述未覆盖 n 大、p 小的泊松近似条件。"
  }],
  ["9709:1.6:1", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_binomial_pos"],
    noteZh: "已对照官方页：正整数二项展开概念明确覆盖二项系数和正整数幂展开。"
  }],
  ["9709:5.4:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_binomial_dist", "mat_geometric_dist"],
    noteZh: "已对照官方页：两种分布概念方向正确，但现有描述未明确二项分布期望方差和几何分布期望公式。"
  }],
  ["9709:1.2:3", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_functions"],
    noteZh: "已对照官方页：函数与反函数概念明确覆盖一一函数判定和简单反函数求解。"
  }],
  ["9709:3.7:5", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_vector_lines"],
    noteZh: "已对照官方页：向量直线概念覆盖直线方程和相交，但现有描述未明确平行、异面及完整判定流程。"
  }],
  ["9709:4.1:5", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_smooth_contact"],
    noteZh: "人工批准：光滑接触模型 Concept 覆盖理想化接触假设及其局限。"
  }],
  ["9709:5.1:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_data_rep"],
    noteZh: "已对照官方页：数据表示概念包含累计频数图，但未明确从图估计中位数、四分位数、百分位数和区间比例。"
  }],
  ["9709:1.6:2", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_arithmetic", "mat_geometric"],
    noteZh: "已对照官方页：等差和等比级数两个概念共同覆盖两类数列的识别。"
  }],
  ["9709:6.5:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_hypothesis", "mat_binomial_dist", "mat_poisson", "mat_normal_approx"],
    noteZh: "已对照官方页：现有概念分别覆盖假设检验和所需分布，但未把单次观测、直接概率及正态近似流程完整整合。"
  }],
  ["9709:2.1:2", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_poly_division"],
    noteZh: "已对照官方页：多项式除法概念明确覆盖线性或二次除式、商和余式。"
  }],
  ["9709:3.8:1", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_form_de"],
    noteZh: "已对照官方页：建立微分方程概念直接覆盖把变化率陈述转化为方程。"
  }],
  ["9709:1.3:5", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_solve_quadratics", "mat_simultaneous"],
    noteZh: "已对照官方页：二次方程判别式和联立方程概念共同覆盖图像交点与相切/不相交条件。"
  }],
  ["9709:4.2:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_kin_constant", "mat_kin_variable"],
    noteZh: "已对照官方页：直线运动概念方向正确，但现有描述未明确位移-时间和速度-时间图的梯度、面积解释。"
  }],
  ["9709:1.6:4", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_geometric"],
    noteZh: "已对照官方页：等比级数概念明确覆盖收敛条件和收敛级数无穷和。"
  }],
  ["9709:1.4:2", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_radians"],
    noteZh: "已对照官方页：弧度制概念明确覆盖弧长和扇形面积公式。"
  }],
  ["9709:5.4:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_binomial_dist", "mat_geometric_dist"],
    noteZh: "已对照官方页：二项和几何分布概念方向正确，但现有描述未明确概率公式和 B(n,p)、Geo(p) 记号。"
  }],
  ["9709:3.9:8", {
    coverageSignal: "candidate_covered",
    candidateIds: ["mat_complex_loci", "mat_argand"],
    noteZh: "已对照官方页：要求是用 Argand 图表示复数轨迹，主概念应为复数轨迹，Argand 图为共同覆盖概念。"
  }],
  ["9709:4.1:7", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_newton_laws"],
    noteZh: "已对照官方页：要求明确为牛顿第三定律；现有概念方向正确，但描述只明确第二定律关系。"
  }],
  ["9709:5.3:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["mat_perm_comb", "mat_prob_rules"],
    noteZh: "已对照官方页：要求同时涉及等可能事件枚举和排列组合计算，单个现有概念不能完整覆盖。"
  }],
  ["9700:14.2:4", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有 ABA、气孔关闭和钙离子第二信使的可信概念。"
  }],
  ["9700:13.1:10", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_light_dependent"],
    noteZh: "已对照官方页：光依赖反应方向正确，但现有描述没有完整列出电子传递链、质子梯度和 ATP 合酶机制。"
  }],
  ["9700:1.2:4", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有把 ATP 作为细胞耗能过程通用能量来源的独立概念。"
  }],
  ["9700:2.3:5", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_proteins", "bio_haemoglobin"],
    noteZh: "已对照官方页：蛋白质和血红蛋白概念方向正确，但现有描述未完整覆盖四聚体、α/β 链和 haem 基团结构。"
  }],
  ["9700:14.2:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_transpiration"],
    noteZh: "已对照官方页：蒸腾概念覆盖气孔水分散失和环境因素，但未完整覆盖气孔开闭对二氧化碳吸收的权衡。"
  }],
  ["9700:6.2:5", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_transcription"],
    noteZh: "已对照官方页：转录概念方向正确，但现有描述未覆盖内含子去除和外显子拼接。"
  }],
  ["9700:2.3:8", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有胶原分子和胶原纤维结构功能概念。"
  }],
  ["9700:16.2:5", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有卡方检验概念。"
  }],
  ["9700:2.2:3", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有以共价键连接单体形成聚合物的通用概念。"
  }],
  ["9700:18.2:1", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有 ecosystem 和 niche 的定义概念。"
  }],
  ["9700:2.4:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_water"],
    noteZh: "已对照官方页：水概念覆盖氢键、溶剂和高比热容，但现有描述未覆盖汽化潜热。"
  }],
  ["9700:19.2:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_gene_tech"],
    noteZh: "已对照官方页：基因技术概念支持重组蛋白生产，但未覆盖医疗优势和 insulin、factor VIII、ADA 三个例子。"
  }],
  ["9700:12.2:9", {
    coverageSignal: "skill_mapping_required",
    candidateIds: ["bio_organelles", "bio_oxidative"],
    noteZh: "已对照官方页：该项包含图和电镜判读技能；细胞器与氧化磷酸化是正确的结构功能上下文。"
  }],
  ["9700:15.1:10", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有神经肌肉接头、T 管和肌浆网刺激横纹肌收缩的概念。"
  }],
  ["9700:12.1:5", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有呼吸商 RQ 的定义概念。"
  }],
  ["9700:12.1:7", {
    coverageSignal: "skill_mapping_required",
    candidateIds: [],
    noteZh: "已对照官方页：这是使用呼吸计测 RQ 的实践技能；现有 KG 没有可靠的 RQ 概念上下文。"
  }],
  ["9700:7.2:1", {
    coverageSignal: "candidate_covered",
    candidateIds: ["bio_xylem", "bio_phloem"],
    noteZh: "已对照官方页：木质部覆盖水和矿物离子，韧皮部覆盖蔗糖等有机同化物，两者共同覆盖。"
  }],
  ["9700:2.1:3", {
    coverageSignal: "skill_mapping_required",
    candidateIds: ["bio_tests"],
    noteZh: "已对照官方页：这是非还原糖检验的实践技能；生化检测是正确上下文，但现有描述未列酸水解步骤。"
  }],
  ["9700:10.2:1", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有青霉素作用细菌及抗生素不作用于病毒的概念。"
  }],
  ["9700:2.3:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_proteins"],
    noteZh: "已对照官方页：蛋白质概念方向正确，但未覆盖球状/纤维状蛋白的溶解性和生理/结构角色对比。"
  }],
  ["9700:2.1:2", {
    coverageSignal: "skill_mapping_required",
    candidateIds: ["bio_tests"],
    noteZh: "已对照官方页：这是标准化半定量 Benedict 检验的实践技能；生化检测是正确上下文。"
  }],
  ["9700:2.3:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_proteins"],
    noteZh: "已对照官方页：蛋白质概念涉及折叠层级，但未列出疏水、氢键、离子键和二硫键等稳定作用。"
  }],
  ["9700:14.1:5", {
    coverageSignal: "skill_mapping_required",
    candidateIds: ["bio_kidney"],
    noteZh: "已对照官方页：这是图和显微图中的肾单位结构识别技能；肾脏与渗透压调节是正确上下文。"
  }],
  ["9700:15.2:3", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有赤霉素促进大麦萌发的概念。"
  }],
  ["9700:19.1:1", {
    coverageSignal: "candidate_covered",
    candidateIds: ["bio_gene_tech"],
    noteZh: "已对照官方页：基因技术概念对重组 DNA 的切割、连接和载体插入已有实质定义。"
  }],
  ["9700:13.1:9", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_light_dependent"],
    noteZh: "已对照官方页：光依赖反应概念方向正确，但未完整覆盖 PSI/PSII、光活化、放氧复合体和非循环光合磷酸化步骤。"
  }],
  ["9700:14.1:6", {
    coverageSignal: "candidate_covered",
    candidateIds: ["bio_kidney"],
    noteZh: "已对照官方页：肾脏概念明确覆盖肾单位超滤、选择性重吸收和尿液形成。"
  }],
  ["9700:14.1:11", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有葡萄糖氧化酶/过氧化物酶试纸和生物传感器原理概念。"
  }],
  ["9700:14.1:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_homeostasis_principles"],
    noteZh: "已对照官方页：体内平衡概念覆盖稳定内环境和负反馈，但未明确其在哺乳动物中的重要性。"
  }],
  ["9700:15.1:9", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_synapses"],
    noteZh: "已对照官方页：突触概念方向正确，但未覆盖胆碱能突触结构、乙酰胆碱和钙离子作用。"
  }],
  ["9700:15.1:5", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_nervous"],
    noteZh: "已对照官方页：神经传导概念覆盖动作电位，但未覆盖味蕾化学感受器引发动作电位的事件序列。"
  }],
  ["9700:15.1:12", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有滑动肌丝模型及 troponin、tropomyosin、Ca²⁺、ATP 作用概念。"
  }],
  ["9700:5.2:2", {
    coverageSignal: "skill_mapping_required",
    candidateIds: ["bio_mitosis"],
    noteZh: "已对照官方页：这是显微图、图示和切片中的有丝分裂阶段识别技能；有丝分裂是正确上下文。"
  }],
  ["9700:15.1:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_nervous", "bio_hormonal"],
    noteZh: "已对照官方页：神经传导和激素控制概念共同相关，但现有描述未完整组织成两系统特征对比。"
  }],
  ["9700:7.1:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_xylem", "bio_phloem"],
    noteZh: "已对照官方页：木质部和韧皮部概念方向正确，但未覆盖双子叶植物茎、根、叶横切面的组织分布。"
  }],
  ["9700:10.1:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_infectious"],
    noteZh: "已对照官方页：传染病概念覆盖病原和传播，但未覆盖霍乱、疟疾、TB、HIV 防控中的生物、社会和经济因素。"
  }],
  ["9700:11.2:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_antibodies"],
    noteZh: "已对照官方页：抗体与疫苗概念涉及主动免疫，但未完整对比主动/被动和自然/人工免疫。"
  }],
  ["9700:18.2:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_biodiversity_sampling"],
    noteZh: "已对照官方页：生物多样性调查概念覆盖物种丰富度和均匀度，但未覆盖生态系统/栖息地范围和种内遗传变异层级。"
  }],
  ["9700:6.1:5", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有 RNA/mRNA 分子结构概念。"
  }],
  ["9700:9.1:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["bio_lungs"],
    noteZh: "已对照官方页：肺部气体交换概念覆盖肺泡，但未覆盖气管、支气管、细支气管及整套系统结构。"
  }],
  ["9700:6.2:3", {
    coverageSignal: "candidate_covered",
    candidateIds: ["bio_transcription", "bio_translation"],
    noteZh: "已对照官方页：转录与翻译两个概念共同覆盖 RNA 聚合酶、mRNA、密码子、tRNA、反密码子和核糖体流程。"
  }],
  ["9700:7.1:1", {
    coverageSignal: "skill_mapping_required",
    candidateIds: ["bio_xylem", "bio_phloem"],
    noteZh: "已对照官方页：这是显微切片/照片的双子叶植物运输组织平面图技能；木质部和韧皮部是正确上下文。"
  }],
  ["9701:11.4:2", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有第17族概念未覆盖氯净水、HOCl 和 ClO− 活性物种。"
  }],
  ["9701:25.1:1", {
    coverageSignal: "candidate_covered",
    candidateIds: ["che_bronsted"],
    noteZh: "已对照官方页：Brønsted-Lowry 概念明确包含共轭酸碱对。"
  }],
  ["9701:25.1:7", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有溶度积 Ksp 概念。"
  }],
  ["9701:25.1:9", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有 Ksp 与浓度互算概念。"
  }],
  ["9701:35.3:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_condensation_polymer", "che_esters"],
    noteZh: "已对照官方页：缩聚物和酯水解概念相关，但未完整覆盖聚酯、聚酰胺的酸碱水解与可降解性。"
  }],
  ["9701:4.2:1", {
    coverageSignal: "candidate_covered",
    candidateIds: ["che_solids"],
    noteZh: "已对照官方页：固体结构概念明确覆盖巨型离子、巨型共价、简单分子和金属晶格。"
  }],
  ["9701:28.1:2", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有 3dxy 和 3dz² 轨道形状概念。"
  }],
  ["9701:28.1:3", {
    coverageSignal: "candidate_covered",
    candidateIds: ["che_transition_props"],
    noteZh: "已对照官方页：过渡金属性质概念明确列出可变氧化态、催化、配合物和有色化合物四项要求。"
  }],
  ["9701:11.2:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_group17"],
    noteZh: "已对照官方页：第17族概念方向正确，但现有描述未覆盖卤化氢热稳定性与键强关系。"
  }],
  ["9701:7.2:10", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_titration"],
    noteZh: "已对照官方页：滴定概念包含终点，但现有描述未覆盖依据数据选择酸碱指示剂。"
  }],
  ["9701:22.2:3", {
    coverageSignal: "candidate_covered",
    candidateIds: ["che_mass_spec"],
    noteZh: "已对照官方页：质谱概念明确覆盖由离子质荷比确定相对分子质量。"
  }],
  ["9701:28.3:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_colour_catalysis"],
    noteZh: "已对照官方页：d 轨道分裂概念方向正确，但现有描述未定义简并和非简并。"
  }],
  ["9701:34.1:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_amines", "che_esters"],
    noteZh: "已对照官方页：胺和酰氯概念共同相关，但现有描述未明确室温缩合生成酰胺。"
  }],
  ["9701:28.1:5", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_transition_props", "che_colour_catalysis"],
    noteZh: "已对照官方页：现有概念记录催化性质，但没有完整解释稳定氧化态、可用空 d 轨道和配体配位原因。"
  }],
  ["9701:3.4:3", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有键能、键长及其与共价分子反应性关系的概念。"
  }],
  ["9701:33.1:5", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_carboxylic_acids"],
    noteZh: "已对照官方页：羧酸概念方向正确，但未覆盖氯取代的诱导效应和相对酸性。"
  }],
  ["9701:9.2:5", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_period3"],
    noteZh: "已对照官方页：第3周期元素及氯化物概念方向正确，但未完整列出各氯化物水解方程和溶液 pH。"
  }],
  ["9701:26.1:5", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_rds"],
    noteZh: "已对照官方页：速控步概念只覆盖部分要求，未完整覆盖机理推导、中间体和催化剂识别。"
  }],
  ["9701:23.4:3", {
    coverageSignal: "candidate_covered",
    candidateIds: ["che_gibbs"],
    noteZh: "已对照官方页：吉布斯自由能概念明确说明负 ΔG 表示热力学可行。"
  }],
  ["9701:13.1:4", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有有机物通式、结构式、显示式和骨架式的表示概念。"
  }],
  ["9701:28.3:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_colour_catalysis"],
    noteZh: "已对照官方页：颜色与催化概念覆盖 d 轨道分裂，但未完整覆盖配体改变 ΔE、吸收频率和互补色链条。"
  }],
  ["9701:14.1:6", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_alkanes", "che_catalysis"],
    noteZh: "已对照官方页：烷烃燃烧和催化概念相关，但未完整覆盖 CO、NOx、未燃烃的环境后果与催化清除。"
  }],
  ["9701:11.3:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_group17"],
    noteZh: "已对照官方页：第17族概念覆盖氧化能力和置换反应，但未明确卤离子还原性趋势。"
  }],
  ["9701:7.1:10", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_le_chatelier"],
    noteZh: "已对照官方页：勒夏特列原理方向正确，但现有描述未覆盖 Haber 和 Contact 工艺的具体条件与工业权衡。"
  }],
  ["9701:23.3:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_entropy"],
    noteZh: "已对照官方页：熵概念方向正确，但现有描述以无序度概括，未明确粒子及能量可能排列数的定义。"
  }],
  ["9701:29.4:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_isomerism"],
    noteZh: "已对照官方页：同分异构概念包含光学异构体，但未覆盖旋光性和潜在生物活性差异。"
  }],
  ["9701:32.2:3", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有苯酚酸性及其共轭碱稳定性的概念。"
  }],
  ["9701:14.2:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_alkenes", "che_addition_polymer"],
    noteZh: "已对照官方页：烯烃和加聚概念覆盖部分反应，但现有描述未完整覆盖水合、卤化氢加成和两种 KMnO4 氧化。"
  }],
  ["9701:16.1:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_alcohol_reactions", "che_alcohol_oxidation"],
    noteZh: "已对照官方页：两个醇反应概念覆盖燃烧、取代、氧化、脱水和酯化，但未完整列出全部试剂条件及与钠反应。"
  }],
  ["9701:28.3:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_colour_catalysis"],
    noteZh: "已对照官方页：颜色与催化概念包含 d 轨道分裂，但未覆盖八面体和四面体能级数目。"
  }],
  ["9701:22.2:4", {
    coverageSignal: "candidate_covered",
    candidateIds: ["che_mass_spec"],
    noteZh: "已对照官方页：质谱概念明确覆盖利用离子化分子碎片的质荷比推断结构。"
  }],
  ["9701:10.1:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_group2"],
    noteZh: "已对照官方页：第2族概念覆盖水、氧反应及反应性和热稳定性趋势，但未完整覆盖所引用各项物理与化学性质。"
  }],
  ["9701:2.3:1", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有由离子电荷和氧化数写离子化合物式及常见多原子离子表的概念。"
  }],
  ["9701:17.1:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_aldehydes_ketones"],
    noteZh: "已对照官方页：醛和酮概念提到特征检测，但未明确 2,4-DNPH 试剂及现象。"
  }],
  ["9701:13.1:6", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_formulae"],
    noteZh: "已对照官方页：实验式与分子式概念方向正确，但未覆盖从结构式、显示式或骨架式直接推导。"
  }],
  ["9701:15.1:2", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有卤代烷一级、二级和三级分类概念。"
  }],
  ["9701:14.1:4", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有重质原油馏分裂化得到较低 Mr 烷烃和烯烃的概念。"
  }],
  ["9701:2.1:1", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有统一原子质量单位为碳-12 原子质量十二分之一的定义。"
  }],
  ["9701:11.2:1", {
    coverageSignal: "candidate_covered",
    candidateIds: ["che_group17"],
    noteZh: "已对照官方页：第17族概念明确包含卤素氧化能力趋势。"
  }],
  ["9701:1.3:7", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_electron_config"],
    noteZh: "已对照官方页：电子排布概念覆盖轨道填充规则，但未明确电子方框表示法。"
  }],
  ["9701:35.3:2", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有聚合物光降解概念。"
  }],
  ["9701:6.1:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_oxidation_number"],
    noteZh: "已对照官方页：氧化数概念支持跟踪电子转移，但现有描述未明确用氧化数变化配平方程。"
  }],
  ["9701:34.3:3", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有酰胺碱性弱于胺及共振解释概念。"
  }],
  ["9701:34.1:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_amines"],
    noteZh: "已对照官方页：胺概念涵盖生成和反应，但未列出卤代烷、酰胺、腈的各条制备路线和条件。"
  }],
  ["9701:7.2:9", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_strong_weak", "che_titration"],
    noteZh: "已对照官方页：酸强弱和滴定概念共同相关，但未覆盖四类强弱酸碱组合的 pH 滴定曲线。"
  }],
  ["9701:30.1:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_electrophilic_sub"],
    noteZh: "已对照官方页：亲电取代概念覆盖卤化和硝化，但未完整覆盖 Friedel-Crafts、侧链氧化和芳环加氢。"
  }],
  ["9701:32.2:4", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有水、苯酚和乙醇相对酸性及解释概念。"
  }],
  ["9701:1.3:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_electron_config"],
    noteZh: "已对照官方页：电子排布概念方向正确，但未明确前三电子层及 4s、4p 亚层能量次序。"
  }],
  ["9701:6.1:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_oxidation_number", "che_redox_equations"],
    noteZh: "已对照官方页：氧化数和氧化还原方程概念相关，但未完整定义 disproportionation。"
  }],
  ["9701:26.2:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["che_catalysis"],
    noteZh: "已对照官方页：催化概念方向正确，但未覆盖异相催化的吸附、键弱化、解吸步骤及两个实例。"
  }],
  ["9702:22.2:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_photoelectric", "phy_photon"],
    noteZh: "已对照官方页：光电效应和光子能量方向正确，但现有描述未明确爱因斯坦光电方程。"
  }],
  ["9702:5.1:7", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_power_efficiency"],
    noteZh: "已对照官方页：P = Fv 属于功率概念；现有描述未明确该式及其推导。"
  }],
  ["9702:10.3:3", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有电流计零示法概念。"
  }],
  ["9702:2.1:7", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_suvat"],
    noteZh: "已对照官方页：匀加速直线运动方程覆盖无空气阻力的匀强重力场落体应用。"
  }],
  ["9702:24.2:1", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有 X 射线产生机制概念。"
  }],
  ["9702:24.2:4", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有 CT 多角度 X 射线断层重建概念。"
  }],
  ["9702:7.5:2", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有偏振和 Malus 定律概念。"
  }],
  ["9702:4.1:4", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_moments"],
    noteZh: "已对照官方页：力矩与力偶概念覆盖力偶的转动效应和力矩计算。"
  }],
  ["9702:18.1:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_e_field_strength"],
    noteZh: "已对照官方页：电场强度概念提供场的方向与强度，但现有描述未明确用场线表示电场，不能判为无概念缺口。"
  }],
  ["9702:20.1:1", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有由运动电荷或永磁体产生磁场的基础概念。"
  }],
  ["9702:9.2:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_power_efficiency"],
    noteZh: "已对照官方页：功率概念方向正确，但现有描述未明确 P = VI、I²R 和 V²/R。"
  }],
  ["9702:8.4:1", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_diffraction_grating"],
    noteZh: "已对照官方页：衍射光栅概念明确包含光栅方程和由角度测波长。"
  }],
  ["9702:11.2:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_fundamental_particles"],
    noteZh: "已对照官方页：基本粒子概念覆盖强子由夸克组成，但未明确重子三夸克和介子夸克-反夸克分类。"
  }],
  ["9702:14.2:2", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有热力学温标独立于测温物质性质的概念。"
  }],
  ["9702:22.3:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_wave_particle"],
    noteZh: "已对照官方页：波粒二象性概念提到德布罗意波长，但现有描述未明确 λ = h/p。"
  }],
  ["9702:14.2:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_temperature"],
    noteZh: "已对照官方页：温度与热平衡概念提供温标背景，但现有描述未明确开尔文和摄氏温度换算及 273.15 常数。"
  }],
  ["9702:15.3:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_kinetic_theory"],
    noteZh: "已对照官方页：气体动理论概念覆盖压强与均方速率关系，但现有描述未明确关系式及推导。"
  }],
  ["9702:21.1:3", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_ac_rms"],
    noteZh: "已对照官方页：交流电与 RMS 概念方向正确，但现有描述未明确平均功率为最大功率的一半。"
  }],
  ["9702:17.2:1", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_shm_energy"],
    noteZh: "已对照官方页：SHM 能量概念明确覆盖动能与势能的相互转化。"
  }],
  ["9702:2.1:5", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_motion_graphs"],
    noteZh: "已对照官方页：运动图像概念明确说明速度-时间图梯度给出加速度。"
  }],
  ["9702:5.1:5", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_power_efficiency"],
    noteZh: "已对照官方页：功率与效率概念明确把功率定义为做功或能量转移的速率。"
  }],
  ["9702:25.1:2", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_luminosity"],
    noteZh: "已对照官方页：亮度与辐射通量概念方向正确，但现有描述未明确反平方公式 F = L/(4πd²)。"
  }],
  ["9702:6.1:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_stress_strain"],
    noteZh: "已对照官方页：应力应变概念覆盖拉伸，但现有描述未明确压缩力导致的一维形变。"
  }],
  ["9702:4.3:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_density_pressure"],
    noteZh: "已对照官方页：密度与压强概念包含流体压强随深度变化，但现有描述未明确 Δp = ρgΔh。"
  }],
  ["9702:24.3:3", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有粒子-反粒子湮灭及质量能量、动量守恒概念。"
  }],
  ["9702:14.2:1", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有利用随温度变化的物理属性测温及所列测温属性概念。"
  }],
  ["9702:2.1:3", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_motion_graphs"],
    noteZh: "已对照官方页：运动图像概念明确说明速度-时间图下面积给出位移。"
  }],
  ["9702:7.4:1", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_em_spectrum"],
    noteZh: "已对照官方页：电磁波谱概念明确说明所有电磁波为横波并以光速传播。"
  }],
  ["9702:11.1:12", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有统一原子质量单位 u 的概念。"
  }],
  ["9702:21.2:4", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_rectification", "phy_capacitor_discharge"],
    noteZh: "已对照官方页：整流和电容充放电概念共同相关，但未完整覆盖单电容平滑及电容、负载电阻的影响。"
  }],
  ["9702:19.1:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_capacitance_def"],
    noteZh: "已对照官方页：电容概念给出单位电势差储存电荷的定义，但未覆盖孤立球导体和平行板两种应用。"
  }],
  ["9702:18.1:2", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_e_field_strength"],
    noteZh: "已对照官方页：电场强度定义为单位正电荷受力，直接等价于 F=qE。"
  }],
  ["9702:5.2:2", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_ke_pe"],
    noteZh: "已对照官方页：动能与势能概念包含均匀重力场重力势能的定义公式。"
  }],
  ["9702:11.1:6", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有核过程中核子数和电荷守恒概念。"
  }],
  ["9702:10.2:6", {
    coverageSignal: "candidate_covered",
    candidateIds: ["phy_series_parallel"],
    noteZh: "已对照官方页：串并联电阻概念明确覆盖并联总电阻规则。"
  }],
  ["9702:22.3:1", {
    coverageSignal: "candidate_partial",
    candidateIds: ["phy_wave_particle"],
    noteZh: "已对照官方页：波粒二象性概念方向正确，但未明确用光电效应与干涉/衍射分别作为粒子性和波动性证据。"
  }],
  ["9702:9.3:7", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有 LDR 电阻随光强增加而下降的概念。"
  }],
  ["9702:11.1:4", {
    coverageSignal: "candidate_gap",
    candidateIds: [],
    noteZh: "已对照官方页：现有 KG 没有同位素为同元素不同中子数的概念。"
  }],
  ["9701:1.1:1", { coverageSignal: "candidate_partial", candidateIds: ["che_subatomic"], noteZh: "逐条复核：亚原子粒子概念覆盖原子核中的质子和中子及核外电子，但未明确原子大部分为空间的模型。" }],
  ["9701:1.3:2", { coverageSignal: "candidate_partial", candidateIds: ["che_electron_config"], noteZh: "逐条复核：电子排布概念覆盖壳层、亚层和轨道，但未列出各层级可容纳电子的数目。" }],
  ["9701:1.3:5", { coverageSignal: "candidate_partial", candidateIds: ["che_electron_config"], noteZh: "逐条复核：电子排布概念包含 Hund 规则和 Pauli 原理，但未完整解释能量与电子间排斥对排布的影响。" }],
  ["9701:1.3:8", { requirementType: "concept_and_skill", coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有化学 KG 没有 s、p 轨道形状及其绘制概念。" }],
  ["9701:1.3:9", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有化学 KG 没有以未成对电子定义自由基的概念。" }],
  ["9701:2.1:2", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有化学 KG 没有相对同位素质量、相对原子质量、相对分子质量和相对式量的系统定义。" }],
  ["9701:2.3:1", { coverageSignal: "candidate_partial", candidateIds: ["che_ionic"], noteZh: "逐条复核：离子键概念覆盖离子形成与电荷，但未明确由给定离子电荷写出全部化合物式。" }],
  ["9701:2.3:2", { requirementType: "concept_and_skill", coverageSignal: "candidate_partial", candidateIds: ["che_reacting_masses"], noteZh: "逐条复核：反应量计算概念以配平方程为基础，但未专门覆盖构造完整方程和净离子方程的规则。" }],
  ["9701:2.3:4", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有化学 KG 没有结晶水、无水盐和水合盐概念。" }],
  ["9701:3.1:4", { coverageSignal: "candidate_covered", candidateIds: ["che_electronegativity", "che_ionic", "che_covalent"], noteZh: "逐条复核：电负性、离子键和共价键概念共同覆盖用 Pauling 电负性差判断键的离子性或共价性。" }],
  ["9701:3.7:1", { requirementType: "concept_and_skill", coverageSignal: "candidate_partial", candidateIds: ["che_ionic", "che_covalent"], noteZh: "逐条复核：离子键与共价键概念提供成键背景，但点叉图的绘制与解读规则未在概念描述中完整表达。" }],
  ["9701:4.1:1", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有化学 KG 有理想气体方程，但没有由分子碰撞解释气体压强的动理论概念。" }],
  ["9701:4.2:3", { coverageSignal: "candidate_covered", candidateIds: ["che_solids"], noteZh: "逐条复核：固体结构概念覆盖由给定性质判断离子、金属、巨型共价或简单分子结构。" }],
  ["9701:5.1:2", { requirementType: "concept_and_skill", coverageSignal: "candidate_partial", candidateIds: ["che_enthalpy", "che_collision"], noteZh: "逐条复核：焓变和碰撞理论概念提供反应焓与活化能背景，但没有完整覆盖反应路径图的构造与解读。" }],
  ["9701:5.1:3", { coverageSignal: "candidate_partial", candidateIds: ["che_enthalpy"], noteZh: "逐条复核：焓变概念包含标准生成焓、燃烧焓和反应焓，但未列出 298 K、101 kPa 等标准条件。" }],
  ["9701:5.1:5", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["che_bond_enthalpy"], noteZh: "逐条复核：键焓概念明确覆盖用断键吸热与成键放热估算反应焓。" }],
  ["9701:5.1:7", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["che_calorimetry"], noteZh: "逐条复核：量热法概念直接覆盖由温度变化和 q=mcΔT 求实验焓变。" }],
  ["9701:5.2:2", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["che_hess", "che_enthalpy", "che_bond_enthalpy"], noteZh: "第二批终检修正：这是利用 Hess 循环及给定焓变、键焓数据完成计算的要求，不是实验技能；三个概念共同覆盖。" }],
  ["9701:6.1:5", { coverageSignal: "candidate_partial", candidateIds: ["che_oxidation_number"], noteZh: "逐条复核：氧化数概念提供数值规则，但未明确用罗马数字在化合物名称中标示氧化态。" }],
  ["9701:7.1:2", { coverageSignal: "candidate_covered", candidateIds: ["che_le_chatelier", "che_dynamic_eq"], noteZh: "逐条复核：动态平衡和勒夏特列原理共同覆盖平衡受外界变化时的响应。" }],
  ["9701:7.1:9", { coverageSignal: "candidate_partial", candidateIds: ["che_dynamic_eq", "che_catalysis"], noteZh: "第四批终检修正：动态平衡与催化概念共同提供催化剂加快正逆反应的背景，但未显式说明其不改变平衡组成和 Kc/Kp。" }],
  ["9701:7.2:1", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有化学 KG 有酸碱理论，但没有 syllabus 所列常见酸名称与化学式的资料概念。" }],
  ["9701:7.2:2", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有化学 KG 没有 syllabus 所列常见碱和碱液的名称与化学式资料概念。" }],
  ["9701:8.1:1", { coverageSignal: "candidate_covered", candidateIds: ["che_rate", "che_collision"], noteZh: "第四批终检修正：反应速率和碰撞理论共同覆盖反应速率、碰撞频率以及有效和无效碰撞的定义。" }],
  ["9701:9.2:1", { coverageSignal: "candidate_partial", candidateIds: ["che_period3"], noteZh: "逐条复核：第三周期概念涵盖元素、氧化物和氯化物，但未逐一给出与氧、氯反应的方程。" }],
  ["9701:9.2:3", { coverageSignal: "candidate_partial", candidateIds: ["che_period3"], noteZh: "逐条复核：第三周期概念提供周期变化背景，但未完整覆盖由趋势预测指定氧化物反应方程。" }],
  ["9701:9.2:4", { coverageSignal: "candidate_partial", candidateIds: ["che_period3"], noteZh: "逐条复核：第三周期氧化物概念覆盖由金属性到共价性的变化，但未明确全部酸性、碱性与两性反应。" }],
  ["9701:9.3:1", { coverageSignal: "candidate_partial", candidateIds: ["che_periodic_trends"], noteZh: "逐条复核：周期趋势概念支持由族和周期位置预测性质；过渡元素概念不是此通用周期性要求的合适候选。" }],
  ["9701:9.3:2", { coverageSignal: "candidate_partial", candidateIds: ["che_periodic_trends"], noteZh: "逐条复核：周期趋势概念提供由物理化学信息推断元素身份和性质的基础，但未覆盖所有题型细节。" }],
  ["9701:10.1:2", { coverageSignal: "candidate_partial", candidateIds: ["che_group2"], noteZh: "逐条复核：第二族概念涵盖化合物反应和趋势，但未逐一写出氧化物、氢氧化物、碳酸盐与酸反应的方程。" }],
  ["9701:10.1:3", { coverageSignal: "candidate_partial", candidateIds: ["che_group2"], noteZh: "逐条复核：第二族概念提及化合物热稳定性趋势，但未明确碳酸盐和硝酸盐的全部分解方程。" }],
  ["9701:10.1:5", { coverageSignal: "candidate_partial", candidateIds: ["che_group2"], noteZh: "逐条复核：第二族概念提供族趋势背景，但未明确氢氧化物和硫酸盐溶解度的相反趋势。" }],
  ["9701:11.1:2", { coverageSignal: "candidate_partial", candidateIds: ["che_group17"], noteZh: "逐条复核：卤素概念覆盖族内趋势，但未明确卤素分子键强的非单调变化。" }],
  ["9701:11.1:3", { coverageSignal: "candidate_partial", candidateIds: ["che_group17", "che_imf"], noteZh: "逐条复核：卤素与分子间作用力概念共同解释分子大小、瞬时偶极和挥发性趋势，但未逐项给出卤素实例。" }],
  ["9701:11.2:2", { coverageSignal: "candidate_partial", candidateIds: ["che_group17"], noteZh: "逐条复核：卤素概念覆盖反应性趋势，但未逐一描述卤素与氢的反应条件和相对速率。" }],
  ["9701:11.3:2", { coverageSignal: "candidate_partial", candidateIds: ["che_group17", "che_complex_ions"], noteZh: "逐条复核：卤素和配合离子概念提供卤离子与氨配合物背景，但未完整覆盖硝酸银检验的方程、沉淀颜色和溶解性。" }],
  ["9701:11.4:1", { coverageSignal: "candidate_partial", candidateIds: ["che_group17", "che_oxidation_number"], noteZh: "逐条复核：卤素和氧化数概念提供歧化反应背景，但未给出氯与冷、热氢氧化物的完整条件和方程。" }],
  ["9701:12.1:2", { coverageSignal: "candidate_partial", candidateIds: ["che_bronsted", "che_nitrogen_sulfur"], noteZh: "第三批终检修正：Brønsted-Lowry 理论和氮化学提供氨的碱性背景，但未完整覆盖氨与酸形成铵盐及铵盐置换反应。" }],
  ["9701:13.1:1", { coverageSignal: "candidate_partial", candidateIds: ["che_alkanes", "che_alkenes"], noteZh: "逐条复核：烷烃与烯烃概念提供仅由碳氢组成的烃实例，但没有独立的烃定义条目。" }],
  ["9701:13.1:2", { coverageSignal: "candidate_covered", candidateIds: ["che_alkanes"], noteZh: "逐条复核：烷烃概念明确将其定义为只有碳碳单键的饱和烃。" }],
  ["9701:13.1:3", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有化学 KG 没有统摄各有机官能团并说明其决定特征反应的一般概念。" }],
  ["9701:13.1:5", { coverageSignal: "candidate_partial", candidateIds: ["che_nomenclature"], noteZh: "逐条复核：有机命名概念覆盖碳链、官能团和取代基位置，但未明确 syllabus 所列全部六碳以内脂肪族类别。" }],
  ["9701:13.2:1", { coverageSignal: "candidate_partial", candidateIds: ["che_mechanism_types", "che_alcohol_oxidation", "che_esters", "che_condensation_polymer"], noteZh: "逐条复核：反应机理类型及相关概念覆盖取代、加成、消去、氧化、水解与缩合中的大部分，但没有单一完整反应符号体系。" }],
  ["9701:13.3:1", { coverageSignal: "candidate_partial", candidateIds: ["che_nomenclature"], noteZh: "逐条复核：有机命名概念以碳链为基础，但未完整定义直链、支链和环状分子。" }],
  ["9701:13.3:4", { coverageSignal: "candidate_partial", candidateIds: ["che_alkenes", "che_vsepr"], noteZh: "逐条复核：烯烃与分子形状概念提供双键和平面构型背景，但未明确由 sp² 杂化解释乙烯平面结构。" }],
  ["9701:13.4:1", { coverageSignal: "candidate_covered", candidateIds: ["che_isomerism"], noteZh: "逐条复核：异构概念覆盖结构异构及其链异构、位置异构和官能团异构分类。" }],
  ["9701:13.4:3", { coverageSignal: "candidate_partial", candidateIds: ["che_isomerism", "che_alkenes"], noteZh: "逐条复核：异构与烯烃概念覆盖顺反异构和碳碳双键，但未明确受限旋转和每个碳上取代基条件。" }],
  ["9701:13.4:4", { coverageSignal: "candidate_partial", candidateIds: ["che_isomerism"], noteZh: "逐条复核：异构概念包含光学异构，但未完整定义手性中心和对映体。" }],
  ["9701:13.4:6", { coverageSignal: "candidate_partial", candidateIds: ["che_isomerism"], noteZh: "逐条复核：异构概念提供推导可能结构的理论基础，但未说明系统枚举给定分子式所有异构体的方法。" }],
  ["9701:14.1:1", { coverageSignal: "candidate_partial", candidateIds: ["che_alkenes"], noteZh: "逐条复核：烯烃概念覆盖双键加成并可形成烷烃，但未明确氢化试剂、催化剂和条件。" }],
  ["9701:14.1:6", { coverageSignal: "candidate_partial", candidateIds: ["che_alkanes", "che_nitrogen_sulfur"], noteZh: "逐条复核：烷烃和氮硫化学概念提供燃烧与废气污染背景，但未完整覆盖不完全燃烧和催化转化器的环境后果。" }],
  ["9701:14.2:1", { coverageSignal: "candidate_covered", candidateIds: ["che_alcohol_reactions"], noteZh: "逐条复核：醇反应概念明确覆盖醇脱水生成烯烃。" }],
  ["9701:15.1:1", { coverageSignal: "candidate_partial", candidateIds: ["che_alcohol_reactions", "che_alkanes", "che_alkenes"], noteZh: "逐条复核：醇取代、烷烃自由基取代和烯烃加成共同覆盖卤代烷的主要制备路线，但条件未完整列出。" }],
  ["9701:15.1:6", { coverageSignal: "candidate_covered", candidateIds: ["che_nucleophilic_sub"], noteZh: "逐条复核：亲核取代概念明确包含 SN1、SN2 机理及卤代烷结构对机理的影响。" }],
  ["9701:15.1:7", { coverageSignal: "candidate_partial", candidateIds: ["che_nucleophilic_sub", "che_bond_enthalpy"], noteZh: "逐条复核：亲核取代和键焓概念提供水解与碳卤键强度背景，但未完整覆盖硝酸银实验和各卤代烷速率比较。" }],
  ["9701:16.1:1", { coverageSignal: "candidate_partial", candidateIds: ["che_alcohol_reactions", "che_aldehydes_ketones", "che_carboxylic_acids"], noteZh: "逐条复核：相关概念覆盖醇与羰基、羧酸之间的部分转化，但未完整列出制醇的全部试剂、条件和方程。" }],
  ["9701:16.1:4", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有化学 KG 没有碘仿反应及可发生反应的醇结构概念。" }],
  ["9701:16.1:5", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有化学 KG 没有比较醇与水酸性的概念。" }],
  ["9701:17.1:1", { coverageSignal: "candidate_covered", candidateIds: ["che_alcohol_oxidation", "che_aldehydes_ketones"], noteZh: "逐条复核：醇氧化和醛酮概念共同覆盖通过氧化伯醇、仲醇制备羰基化合物。" }],
  ["9701:17.1:5", { coverageSignal: "candidate_partial", candidateIds: ["che_aldehydes_ketones"], noteZh: "逐条复核：醛酮概念说明可由氧化及特征检验区分，但未明确 Tollens 和 Fehling 试剂的全部观察。" }],
  ["9701:17.1:6", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有化学 KG 没有羰基化合物的碘仿反应结构判据。" }],
  ["9701:18.1:2", { coverageSignal: "candidate_partial", candidateIds: ["che_carboxylic_acids"], noteZh: "逐条复核：羧酸概念覆盖酸性、成盐和酯化，但未逐一列出与金属、碱和碳酸盐的反应方程。" }],
  ["9701:18.2:1", { coverageSignal: "candidate_covered", candidateIds: ["che_esters"], noteZh: "逐条复核：酯概念明确覆盖羧酸与醇缩合生成酯。" }],
  ["9701:19.1:1", { coverageSignal: "candidate_partial", candidateIds: ["che_amines"], noteZh: "逐条复核：胺概念覆盖有机碱及其制备和反应，但未完整列出伯、仲、叔胺分类与具体合成条件。" }],
  ["9701:19.2:3", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有化学 KG 没有腈在酸或碱条件下水解为羧酸的概念。" }],
  ["9701:21.1:1", { coverageSignal: "candidate_partial", candidateIds: ["che_mechanism_types"], noteZh: "逐条复核：有机反应机理类型可支持识别多官能团分子的反应，但不能覆盖全部官能团特异转化。" }],
  ["9701:21.1:3", { coverageSignal: "candidate_partial", candidateIds: ["che_mechanism_types"], noteZh: "逐条复核：反应机理类型提供分析试剂和产物的框架，但没有整合全部有机反应路线。" }],
  ["9701:22.2:5", { coverageSignal: "candidate_partial", candidateIds: ["che_mass_spec"], noteZh: "逐条复核：质谱概念覆盖分子离子和同位素峰背景，但未明确由 M+1 丰度推断碳原子数的规则。" }],
  ["9701:22.2:6", { coverageSignal: "candidate_partial", candidateIds: ["che_mass_spec", "che_isotopes"], noteZh: "逐条复核：质谱与同位素概念提供峰形和丰度背景，但未明确由溴的 M/M+2 峰型识别卤素。" }],
  ["9701:23.1:2", { coverageSignal: "candidate_partial", candidateIds: ["che_born_haber"], noteZh: "逐条复核：Born-Haber 概念使用电子亲和能，但未独立定义第一、第二电子亲和能及其周期趋势。" }],
  ["9701:23.2:1", { coverageSignal: "candidate_partial", candidateIds: ["che_enthalpy", "che_born_haber"], noteZh: "逐条复核：焓变和 Born-Haber 概念提供热化学循环背景，但未独立定义水合焓与溶解焓。" }],
  ["9701:23.2:4", { coverageSignal: "candidate_partial", candidateIds: ["che_born_haber"], noteZh: "逐条复核：Born-Haber 概念提供离子能量循环背景，但未明确离子电荷和半径对水合焓大小的影响。" }],
  ["9701:23.4:4", { coverageSignal: "candidate_covered", candidateIds: ["che_gibbs"], noteZh: "逐条复核：Gibbs 自由能概念以焓与熵共同判断反应可行性，覆盖两者变化对可行性的影响。" }],
  ["9701:24.1:1", { coverageSignal: "candidate_covered", candidateIds: ["che_electrolysis"], noteZh: "逐条复核：电解概念明确覆盖熔融或水溶液中电极产物及电极反应的预测。" }],
  ["9701:24.1:2", { coverageSignal: "candidate_partial", candidateIds: ["che_mole", "che_electrolysis"], noteZh: "逐条复核：摩尔与电解概念共同提供电子物质的量和电荷背景，但未明确 Faraday 常数等于一摩尔电子电荷。" }],
  ["9701:24.1:3", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["che_electrolysis"], noteZh: "逐条复核：电解概念明确包含 Faraday 定律，可由通过电荷计算析出物质量。" }],
  ["9701:24.1:4", { coverageSignal: "candidate_partial", candidateIds: ["che_mole", "che_electrolysis"], noteZh: "逐条复核：摩尔和电解概念提供实验测定 Avogadro 常数的量电关系，但未描述具体电解实验步骤。" }],
  ["9701:24.2:5", { coverageSignal: "candidate_covered", candidateIds: ["che_cells", "che_electrode_potential"], noteZh: "逐条复核：电化学电池与电极电势概念共同覆盖半电池组合、外电路电子方向和电池电势。" }],
  ["9701:24.2:6", { coverageSignal: "candidate_partial", candidateIds: ["che_electrode_potential"], noteZh: "逐条复核：电极电势可比较得电子趋势，从而判断氧化剂、还原剂和反应性，但现有描述未明确完整排序规则。" }],
  ["9701:24.2:10", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有 KG 分别有 Gibbs 自由能和电化学电池，但没有 ΔG=-nFE 的连接关系。" }],
  ["9701:25.1:2", { coverageSignal: "candidate_covered", candidateIds: ["che_bronsted"], noteZh: "逐条复核：Brønsted-Lowry 概念明确覆盖共轭酸碱对及反应中的识别。" }],
  ["9701:25.1:3", { coverageSignal: "candidate_partial", candidateIds: ["che_ph_ka"], noteZh: "逐条复核：pH 与 Ka 概念覆盖氢离子浓度和酸解离常数，但没有完整包含 Kb、Kw 及所有相互关系。" }],
  ["9701:25.1:4", { requirementType: "concept_and_skill", coverageSignal: "candidate_partial", candidateIds: ["che_strong_weak", "che_ph_ka"], noteZh: "逐条复核：强弱酸碱与 pH/Ka 概念共同支持 pH 计算，但未覆盖全部强碱、弱酸近似和边界条件。" }],
  ["9701:25.1:5", { coverageSignal: "candidate_partial", candidateIds: ["che_buffers"], noteZh: "逐条复核：缓冲溶液概念覆盖抵抗少量酸碱引起的 pH 变化，但未解释血液缓冲体系。" }],
  ["9701:25.1:7", { coverageSignal: "candidate_covered", candidateIds: ["che_ksp"], noteZh: "逐条复核：溶度积概念直接定义难溶盐溶解的 Ksp。" }],
  ["9701:25.1:8", { coverageSignal: "candidate_covered", candidateIds: ["che_ksp"], noteZh: "逐条复核：溶度积概念覆盖写出难溶盐的平衡常数表达式。" }],
  ["9701:25.1:9", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["che_ksp"], noteZh: "逐条复核：溶度积概念支持在 Ksp 与平衡离子浓度之间双向计算。" }],
  ["9701:25.1:10", { requirementType: "concept_and_skill", coverageSignal: "candidate_partial", candidateIds: ["che_ksp"], noteZh: "逐条复核：溶度积概念包含同离子效应，但未完整说明不同化学计量盐类的所有计算。" }],
  ["9701:25.2:1", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有化学 KG 没有分配系数定义。" }],
  ["9701:25.2:2", { requirementType: "concept_and_skill", coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有化学 KG 没有同一溶质在两种溶剂间的分配系数计算。" }],
  ["9701:25.2:3", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有化学 KG 没有由溶质和溶剂极性解释分配系数的概念。" }],
  ["9701:26.1:3", { coverageSignal: "candidate_partial", candidateIds: ["che_rate_equation"], noteZh: "逐条复核：速率方程概念覆盖反应级数与速率常数，但未明确一级反应半衰期与初始浓度无关。" }],
  ["9701:26.1:6", { coverageSignal: "candidate_partial", candidateIds: ["che_rate_equation", "che_boltzmann", "che_collision"], noteZh: "终检修正：速率方程、Maxwell-Boltzmann 分布和碰撞理论共同提供温度影响速率常数与反应速率的背景，但未显式给出两者的完整定性链条。" }],
  ["9701:26.2:1", { coverageSignal: "candidate_covered", candidateIds: ["che_catalysis"], noteZh: "逐条复核：催化概念明确把催化剂分为均相与非均相；过渡金属颜色概念不是必要候选。" }],
  ["9701:27.1:1", { coverageSignal: "candidate_partial", candidateIds: ["che_group2"], noteZh: "逐条复核：第二族概念覆盖碳酸盐和硝酸盐热稳定性趋势，但未明确大阴离子极化模型。" }],
  ["9701:27.1:2", { coverageSignal: "candidate_partial", candidateIds: ["che_group2", "che_born_haber"], noteZh: "逐条复核：第二族与晶格能概念提供溶解度及能量背景，但未完整比较氢氧化物晶格焓和水合焓变化。" }],
  ["9701:28.2:3", { coverageSignal: "candidate_partial", candidateIds: ["che_complex_ions"], noteZh: "逐条复核：配合离子概念定义配体和配位数，但未列出 syllabus 要求的单齿、双齿配体实例。" }],
  ["9701:28.2:5", { coverageSignal: "candidate_partial", candidateIds: ["che_complex_ions"], noteZh: "逐条复核：配合离子概念覆盖配位数和形状，但未逐一给出线形、四面体、平面四方与八面体键角。" }],
  ["9701:28.2:7", { coverageSignal: "candidate_partial", candidateIds: ["che_complex_ions"], noteZh: "逐条复核：配合离子概念提供铜、钴等配合物背景，但未完整描述配体交换反应、颜色和方程。" }],
  ["9701:28.2:10", { requirementType: "concept_and_skill", coverageSignal: "candidate_partial", candidateIds: ["che_redox_equations", "che_mole"], noteZh: "逐条复核：氧化还原方程和摩尔概念支持滴定型计算，但没有专门覆盖题目所列全部过渡元素定量反应。" }],
  ["9701:28.3:3", { coverageSignal: "candidate_covered", candidateIds: ["che_colour_catalysis"], noteZh: "逐条复核：过渡金属颜色概念明确由 d 轨道能级分裂及电子跃迁解释有色配合物。" }],
  ["9701:28.4:2", { coverageSignal: "candidate_partial", candidateIds: ["che_complex_ions", "che_electronegativity"], noteZh: "逐条复核：配合物几何与键极性概念可用于判断整体极性，但现有描述未提供配合物偶极抵消规则。" }],
  ["9701:28.5:2", { coverageSignal: "candidate_partial", candidateIds: ["che_complex_ions"], noteZh: "逐条复核：配合离子概念提供形成平衡背景，但未显式定义稳定常数表达式及水配体省略约定。" }],
  ["9701:29.1:1", { coverageSignal: "candidate_partial", candidateIds: ["che_nomenclature"], noteZh: "逐条复核：有机命名概念覆盖官能团、主链和取代基，但未说明官能团决定全部特征反应。" }],
  ["9701:29.1:2", { coverageSignal: "candidate_partial", candidateIds: ["che_nomenclature"], noteZh: "逐条复核：有机命名概念使用各类结构表示，但未完整覆盖 syllabus 所列全部类别的一般式和显示式。" }],
  ["9701:29.1:3", { coverageSignal: "candidate_partial", candidateIds: ["che_nomenclature"], noteZh: "逐条复核：有机命名概念覆盖脂肪链和官能团，但未明确六碳以内含酰胺等全部类别。" }],
  ["9701:29.1:4", { coverageSignal: "candidate_partial", candidateIds: ["che_nomenclature", "che_benzene"], noteZh: "逐条复核：命名和苯结构概念提供简单芳香族分子背景，但未完整覆盖含一个或多个苯环的全部命名。" }],
  ["9701:29.3:1", { coverageSignal: "candidate_partial", candidateIds: ["che_benzene"], noteZh: "逐条复核：苯结构概念覆盖平面环和离域 π 电子，但未明确用 sp² 杂化轨道描述成键。" }],
  ["9701:29.4:2", { coverageSignal: "candidate_partial", candidateIds: ["che_isomerism"], noteZh: "逐条复核：异构概念包含光学异构，但未定义外消旋混合物。" }],
  ["9701:29.4:3", { coverageSignal: "candidate_partial", candidateIds: ["che_isomerism"], noteZh: "逐条复核：异构概念包含光学异构体，但未说明单一对映体旋转平面偏振光的方向关系。" }],
  ["9701:29.4:4", { requirementType: "concept", coverageSignal: "candidate_partial", candidateIds: ["che_isomerism"], noteZh: "逐条复核：异构概念提供对映体背景，但未讨论纯对映体不同生物活性的实例。" }],
  ["9701:30.1:2", { coverageSignal: "candidate_partial", candidateIds: ["che_benzene", "che_electrophilic_sub"], noteZh: "第六批抽样修正：苯与芳香亲电取代概念覆盖硝化、卤化和离域稳定性，但未完整描述两种反应的逐步机理。" }],
  ["9701:30.1:3", { coverageSignal: "candidate_partial", candidateIds: ["che_alkanes", "che_electrophilic_sub"], noteZh: "逐条复核：自由基取代和芳环亲电取代概念提供侧链与环上卤化背景，但未完整比较条件。" }],
  ["9701:30.1:4", { coverageSignal: "candidate_partial", candidateIds: ["che_electrophilic_sub"], noteZh: "逐条复核：芳香亲电取代概念覆盖反应类型，但未说明不同取代基的邻、间、对位定位效应。" }],
  ["9701:31.1:1", { coverageSignal: "candidate_partial", candidateIds: ["che_electrophilic_sub"], noteZh: "逐条复核：芳香亲电取代概念包含卤化，但未完整覆盖卤代芳烃与苄基卤化物的全部制备路线。" }],
  ["9701:31.1:2", { coverageSignal: "candidate_partial", candidateIds: ["che_nucleophilic_sub", "che_benzene"], noteZh: "逐条复核：亲核取代和苯离域概念可解释卤代烷与卤代芳烃反应性差异，但现有描述未明确比较。" }],
  ["9701:32.2:2", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有化学 KG 没有苯酚与氢氧化钠生成苯氧负离子的反应概念。" }],
  ["9701:32.2:5", { coverageSignal: "candidate_partial", candidateIds: ["che_electrophilic_sub"], noteZh: "逐条复核：芳香亲电取代概念覆盖苯的硝化和卤化，但没有苯酚活化后条件变化的内容。" }],
  ["9701:32.2:7", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有化学 KG 没有萘酚等其他酚类化合物的反应概念。" }],
  ["9701:33.1:1", { coverageSignal: "candidate_partial", candidateIds: ["che_carboxylic_acids"], noteZh: "逐条复核：羧酸概念提供苯甲酸产物背景，但未明确烷基苯侧链氧化的试剂、条件和方程。" }],
  ["9701:33.1:3", { coverageSignal: "candidate_partial", candidateIds: ["che_alkenes", "che_carboxylic_acids"], noteZh: "逐条复核：烯烃和羧酸概念提供氧化裂解的反应物与产物背景，但未完整说明热酸化高锰酸钾的结构判定规则。" }],
  ["9701:33.1:4", { coverageSignal: "candidate_partial", candidateIds: ["che_carboxylic_acids"], noteZh: "逐条复核：羧酸概念覆盖酸性，但未比较羧酸、酚和醇的相对酸性及共轭碱稳定性。" }],
  ["9701:33.2:1", { coverageSignal: "candidate_covered", candidateIds: ["che_esters"], noteZh: "逐条复核：酯和酰氯概念明确覆盖酰氯与醇反应生成酯。" }],
  ["9701:33.3:1", { coverageSignal: "candidate_partial", candidateIds: ["che_carboxylic_acids", "che_esters"], noteZh: "逐条复核：羧酸及酰氯概念覆盖相互转化背景，但未完整列出制备试剂和条件。" }],
  ["9701:33.3:3", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有化学 KG 没有酰氯的加成-消去机理概念；卤代烷消去不是相关候选。" }],
  ["9701:34.2:1", { requirementType: "concept", coverageSignal: "candidate_partial", candidateIds: ["che_amines", "che_benzene"], noteZh: "逐条复核：胺和苯概念提供苯胺背景，但未完整描述由硝基苯还原制备苯胺的条件。" }],
  ["9701:34.2:2", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有化学 KG 没有苯胺重氮化生成重氮盐的概念。" }],
  ["9701:34.2:3", { coverageSignal: "candidate_partial", candidateIds: ["che_amines"], noteZh: "逐条复核：胺概念覆盖氮孤对电子导致碱性，但未比较氨、乙胺和苯胺的电子效应及碱性。" }],
  ["9701:34.2:4", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有化学 KG 没有重氮盐偶联生成偶氮染料的概念。" }],
  ["9701:34.3:2", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有化学 KG 没有酰胺在酸或碱中水解的概念。" }],
  ["9701:35.1:1", { coverageSignal: "candidate_covered", candidateIds: ["che_condensation_polymer", "che_esters"], noteZh: "逐条复核：缩聚物和酯概念共同覆盖二元醇与二元酸或二酰氯形成聚酯。" }],
  ["9701:35.1:2", { coverageSignal: "candidate_covered", candidateIds: ["che_condensation_polymer", "che_amino_acids"], noteZh: "逐条复核：缩聚物和氨基酸概念共同覆盖二胺/二酸或氨基酸形成聚酰胺。" }],
  ["9701:35.1:3", { coverageSignal: "candidate_partial", candidateIds: ["che_condensation_polymer"], noteZh: "逐条复核：缩聚概念覆盖聚酯与聚酰胺生成，但未明确由单体系统推导重复单元的表示规则。" }],
  ["9701:35.1:4", { coverageSignal: "candidate_partial", candidateIds: ["che_condensation_polymer"], noteZh: "逐条复核：缩聚概念提供由聚合物反推单体的键型背景，但未明确完整反推步骤。" }],
  ["9701:35.2:1", { coverageSignal: "candidate_partial", candidateIds: ["che_addition_polymer", "che_condensation_polymer"], noteZh: "逐条复核：加聚和缩聚概念共同覆盖由单体判断聚合类型和副产物。" }],
  ["9701:35.2:2", { coverageSignal: "candidate_partial", candidateIds: ["che_addition_polymer", "che_condensation_polymer"], noteZh: "逐条复核：两类聚合概念支持由给定分子推断聚合物，但未覆盖全部结构表示题。" }],
  ["9701:35.3:1", { coverageSignal: "candidate_partial", candidateIds: ["che_addition_polymer"], noteZh: "逐条复核：加聚物概念包含处置环境问题，但未明确碳碳主链化学惰性导致难降解。" }],
  ["9701:36.1:1", { coverageSignal: "candidate_partial", candidateIds: ["che_mechanism_types"], noteZh: "逐条复核：有机反应机理类型可支持多官能团反应预测，但不能覆盖全部高级有机转化。" }],
  ["9701:36.1:2", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有化学 KG 没有整合全部高级有机反应的多步合成路线设计概念。" }],
  ["9701:36.1:3", { coverageSignal: "candidate_partial", candidateIds: ["che_mechanism_types"], noteZh: "逐条复核：机理类型提供分析试剂、产物和路线的框架，但没有整合所有高级有机反应。" }],
  ["9701:37.2:1", { coverageSignal: "candidate_partial", candidateIds: ["che_chromatography"], noteZh: "逐条复核：色谱概念覆盖流动相、固定相和保留时间，但未完整比较气液色谱与高效液相色谱的相态和适用条件。" }],
  ["9701:37.4:3", { coverageSignal: "candidate_partial", candidateIds: ["che_nmr"], noteZh: "逐条复核：NMR 概念覆盖化学位移，但未明确以 TMS 为零点内标的测量约定。" }],
  ["9701:37.4:5", { coverageSignal: "candidate_partial", candidateIds: ["che_nmr"], noteZh: "逐条复核：NMR 概念提供质子环境背景，但未明确用 D₂O 交换识别 OH/NH 质子的操作与现象。" }],
  ["9702:1.2:3", { coverageSignal: "candidate_covered", candidateIds: ["phy_homogeneity", "phy_si_units"], noteZh: "逐条复核：方程齐次性和 SI 单位概念共同覆盖用基本单位检查物理方程。" }],
  ["9702:1.4:3", { coverageSignal: "candidate_covered", candidateIds: ["phy_scalars_vectors"], noteZh: "逐条复核：标量与矢量概念明确包含矢量分解，可用两个互相垂直分量表示矢量。" }],
  ["9702:2.1:6", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["phy_suvat", "phy_motion_graphs"], noteZh: "逐条复核：匀加速方程与运动图像概念共同覆盖由定义和直线图像推导运动方程。" }],
  ["9702:3.1:4", { coverageSignal: "candidate_partial", candidateIds: ["phy_newton_laws", "phy_momentum"], noteZh: "逐条复核：牛顿定律和动量概念提供力等于动量变化率的基础，但现有描述未显式写出一般形式。" }],
  ["9702:3.2:1", { coverageSignal: "candidate_partial", candidateIds: ["phy_force_types"], noteZh: "逐条复核：力的类型概念包含摩擦阻力，但未描述空气阻力随速度、形状和面积变化。" }],
  ["9702:3.2:2", { coverageSignal: "candidate_partial", candidateIds: ["phy_force_types", "phy_mass_weight"], noteZh: "逐条复核：阻力与重量概念可支持定性分析重力场中运动，但没有完整的速度变化过程。" }],
  ["9702:4.1:2", { coverageSignal: "candidate_covered", candidateIds: ["phy_moments"], noteZh: "逐条复核：力矩概念直接定义力乘以作用线到转轴的垂直距离。" }],
  ["9702:4.1:3", { coverageSignal: "candidate_covered", candidateIds: ["phy_moments"], noteZh: "逐条复核：力矩与力偶概念明确包含一对只产生转动效应的力偶。" }],
  ["9702:5.1:6", { requirementType: "concept_and_skill", coverageSignal: "candidate_partial", candidateIds: ["phy_work", "phy_power_efficiency", "phy_energy_conservation"], noteZh: "逐条复核：功、功率效率和能量守恒概念覆盖该综合计算的学理基础，但题目未对应单一概念。" }],
  ["9702:5.2:1", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["phy_ke_pe", "phy_work"], noteZh: "逐条复核：动能势能与功概念共同覆盖由恒定重力做功推导 ΔEp=mgΔh。" }],
  ["9702:5.2:4", { coverageSignal: "candidate_covered", candidateIds: ["phy_ke_pe"], noteZh: "逐条复核：动能和势能概念直接包含 Ek=½mv²。" }],
  ["9702:6.2:4", { coverageSignal: "candidate_partial", candidateIds: ["phy_strain_energy"], noteZh: "第六批抽样修正：弹性应变能概念覆盖力—伸长图面积和 Ep=½Fx，但未明确 Ep=½kx² 及比例极限条件。" }],
  ["9702:7.1:5", { coverageSignal: "candidate_covered", candidateIds: ["phy_progressive_waves"], noteZh: "逐条复核：行波概念包含波速、频率和波长，覆盖 v=fλ。" }],
  ["9702:7.4:3", { coverageSignal: "candidate_partial", candidateIds: ["phy_em_spectrum"], noteZh: "逐条复核：电磁波谱概念包含可见光区域，但未明确人眼约 400–700 nm 的波长范围。" }],
  ["9702:8.2:2", { requirementType: "practical_skill", coverageSignal: "skill_mapping_required", candidateIds: ["phy_diffraction"], noteZh: "逐条复核：演示缝宽与波长对衍射的影响属于实验技能，衍射概念提供理论背景。" }],
  ["9702:8.3:4", { coverageSignal: "candidate_partial", candidateIds: ["phy_interference"], noteZh: "逐条复核：双源干涉概念覆盖明暗条纹形成，但未显式给出双缝条纹间距公式。" }],
  ["9702:9.1:3", { coverageSignal: "candidate_covered", candidateIds: ["phy_current_charge"], noteZh: "逐条复核：电流定义为电荷流率，直接覆盖 Q=It。" }],
  ["9702:9.2:2", { coverageSignal: "candidate_covered", candidateIds: ["phy_pd_emf"], noteZh: "逐条复核：电势差概念定义为单位电荷转移能量，直接覆盖 V=W/Q。" }],
  ["9702:9.3:1", { coverageSignal: "candidate_covered", candidateIds: ["phy_resistance_ohm"], noteZh: "逐条复核：电阻与欧姆定律概念直接把电阻定义为电势差与电流之比；电阻率不是此定义。" }],
  ["9702:9.3:2", { coverageSignal: "candidate_covered", candidateIds: ["phy_resistance_ohm"], noteZh: "逐条复核：电阻与欧姆定律概念直接覆盖 V=IR。" }],
  ["9702:9.3:3", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["phy_iv_characteristics"], noteZh: "逐条复核：I–V 特性概念专门覆盖金属导体、灯丝灯和二极管的特性曲线。" }],
  ["9702:9.3:8", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有物理 KG 没有负温度系数热敏电阻及其电阻随温度下降的概念。" }],
  ["9702:10.1:1", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有物理 KG 没有 syllabus 指定电路符号的集中资料概念。" }],
  ["9702:10.1:2", { requirementType: "concept_and_skill", coverageSignal: "skill_mapping_required", candidateIds: ["phy_kirchhoff", "phy_series_parallel"], noteZh: "逐条复核：绘制和解读标准电路图属于表示技能，Kirchhoff 定律和串并联概念提供电路背景。" }],
  ["9702:10.2:4", { coverageSignal: "candidate_covered", candidateIds: ["phy_series_parallel"], noteZh: "逐条复核：串并联电阻概念直接覆盖串联总电阻公式。" }],
  ["9702:10.3:4", { coverageSignal: "candidate_partial", candidateIds: ["phy_potential_divider"], noteZh: "终检修正：电势分压器概念覆盖传感器分压应用，但现有 KG 缺少 LDR 电阻随光强变化的具体关系，因此只能判为部分覆盖。" }],
  ["9702:11.1:5", { coverageSignal: "candidate_partial", candidateIds: ["phy_nuclear_structure"], noteZh: "逐条复核：原子核结构概念包含质子数和核子数，但未明确核素符号的上下标书写约定。" }],
  ["9702:11.1:7", { coverageSignal: "candidate_partial", candidateIds: ["phy_radioactive_decay", "phy_nuclear_structure"], noteZh: "逐条复核：放射性衰变与核结构概念共同提供 α、β、γ 辐射组成背景，但未逐项列出电荷和质量。" }],
  ["9702:11.1:8", { coverageSignal: "candidate_partial", candidateIds: ["phy_fundamental_particles"], noteZh: "逐条复核：基本粒子概念包含粒子和反粒子框架，但未明确每种反粒子质量相同、电荷相反。" }],
  ["9702:11.1:9", { coverageSignal: "candidate_partial", candidateIds: ["phy_fundamental_particles", "phy_radioactive_decay"], noteZh: "逐条复核：基本粒子与放射性衰变概念提供中微子和 β 衰变背景，但未明确电子中微子或反中微子的产生规则。" }],
  ["9702:11.1:10", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有物理 KG 没有用中微子分能解释 β 粒子连续能谱的概念。" }],
  ["9702:11.2:2", { coverageSignal: "candidate_partial", candidateIds: ["phy_fundamental_particles"], noteZh: "逐条复核：基本粒子概念包含夸克和反夸克，但未列出各味夸克电荷及反夸克相反电荷。" }],
  ["9702:11.2:5", { coverageSignal: "candidate_partial", candidateIds: ["phy_fundamental_particles", "phy_radioactive_decay"], noteZh: "逐条复核：夸克组成和放射性衰变概念提供背景，但未明确 β 衰变中的夸克味变化。" }],
  ["9702:12.1:3", { coverageSignal: "candidate_covered", candidateIds: ["phy_angular_speed"], noteZh: "逐条复核：弧度与角速度概念直接覆盖 v=rω 和一周 2π 弧度。" }],
  ["9702:12.2:3", { coverageSignal: "candidate_covered", candidateIds: ["phy_centripetal_accel"], noteZh: "逐条复核：向心加速度概念明确包含 a=v²/r=rω²。" }],
  ["9702:12.2:4", { coverageSignal: "candidate_covered", candidateIds: ["phy_centripetal_force"], noteZh: "逐条复核：向心力概念直接覆盖 F=mv²/r=mrω²。" }],
  ["9702:13.2:3", { coverageSignal: "candidate_covered", candidateIds: ["phy_orbits", "phy_centripetal_accel"], noteZh: "逐条复核：轨道运动与向心加速度概念共同覆盖万有引力提供向心力的圆轨道分析。" }],
  ["9702:13.2:4", { coverageSignal: "candidate_partial", candidateIds: ["phy_orbits"], noteZh: "逐条复核：轨道运动概念覆盖轨道半径、周期和速度，但未明确地球同步卫星的 24 小时、赤道上空和由西向东条件。" }],
  ["9702:13.3:1", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["phy_newton_gravitation", "phy_grav_field_strength"], noteZh: "逐条复核：万有引力与引力场强概念共同覆盖由定义推导 g=GM/r²。" }],
  ["9702:13.3:2", { coverageSignal: "candidate_covered", candidateIds: ["phy_grav_field_strength", "phy_newton_gravitation"], noteZh: "逐条复核：引力场强与万有引力概念直接覆盖点质量场强 GM/r²。" }],
  ["9702:13.3:3", { coverageSignal: "candidate_partial", candidateIds: ["phy_grav_field_strength"], noteZh: "逐条复核：引力场强概念提供地表附近 g 的背景，但未明确高度远小于地球半径时可视为常量。" }],
  ["9702:13.4:3", { coverageSignal: "candidate_partial", candidateIds: ["phy_grav_potential"], noteZh: "第三批终检修正：引力势概念定义了单位质量做功，但未显式给出质量 m 的引力势能 Ep=mφ=-GMm/r。" }],
  ["9702:14.2:4", { coverageSignal: "candidate_partial", candidateIds: ["phy_temperature"], noteZh: "逐条复核：温度与热平衡概念提供绝对温标背景，但未明确绝对零度为 Kelvin 标度的最低可能温度。" }],
  ["9702:15.1:2", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有物理 KG 没有 Avogadro 常数及一摩尔所含粒子数的概念。" }],
  ["9702:15.2:3", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有物理 KG 没有 Boltzmann 常数及 k=R/NA 的关系。" }],
  ["9702:16.2:1", { coverageSignal: "candidate_partial", candidateIds: ["phy_internal_energy"], noteZh: "逐条复核：内能和热力学第一定律概念包含气体做功，但未明确恒压过程的 pΔV 或 p–V 图面积。" }],
  ["9702:17.1:1", { coverageSignal: "candidate_partial", candidateIds: ["phy_shm"], noteZh: "逐条复核：简谐运动概念覆盖正弦运动，但未逐一定义振幅、周期、频率和角频率及其关系。" }],
  ["9702:17.2:2", { coverageSignal: "candidate_partial", candidateIds: ["phy_shm_energy"], noteZh: "第六批抽样修正：简谐运动能量概念覆盖总能量守恒和动势能交换，但未明确 E=½mω²x₀²。" }],
  ["9702:17.3:1", { coverageSignal: "candidate_covered", candidateIds: ["phy_damping"], noteZh: "逐条复核：阻尼概念明确由能量损失导致振幅衰减，覆盖阻力造成阻尼。" }],
  ["9702:19.2:2", { coverageSignal: "candidate_covered", candidateIds: ["phy_capacitor_energy"], noteZh: "逐条复核：电容器储能概念由 Q–V 图面积直接得到 W=½QV=½CV²=Q²/2C。" }],
  ["9702:19.3:1", { coverageSignal: "candidate_covered", candidateIds: ["phy_capacitor_discharge"], noteZh: "逐条复核：电容器充放电概念直接覆盖电荷、电流和电势差随时间的图像；电势差定义不是主要候选。" }],
  ["9702:20.1:1", { coverageSignal: "candidate_partial", candidateIds: ["phy_flux_density", "phy_force_charge"], noteZh: "逐条复核：磁通密度和运动电荷受力概念提供磁场力的定义实例，但未形成涵盖磁体和电荷的通用磁场定义。" }],
  ["9702:20.3:3", { requirementType: "concept_and_skill", coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有物理 KG 没有 Hall 电压的起源与 VH=BI/ntq 推导概念。" }],
  ["9702:20.3:5", { coverageSignal: "candidate_covered", candidateIds: ["phy_force_charge"], noteZh: "第三批终检修正：运动电荷受力概念明确说明垂直磁场力导致带电粒子沿圆周路径运动，直接覆盖该要求。" }],
  ["9702:20.5:2", { coverageSignal: "candidate_covered", candidateIds: ["phy_flux_linkage"], noteZh: "逐条复核：磁通与磁通链概念直接覆盖垂直截面上的 Φ=BA。" }],
  ["9702:21.1:1", { coverageSignal: "candidate_partial", candidateIds: ["phy_ac_rms"], noteZh: "第二批终检修正：交流与有效值概念覆盖正弦交流和 RMS，但未逐一定义周期、频率、峰值和瞬时值。" }],
  ["9702:22.1:1", { coverageSignal: "candidate_covered", candidateIds: ["phy_photon", "phy_wave_particle"], noteZh: "逐条复核：光子和波粒二象性概念共同覆盖电磁辐射的粒子性。" }],
  ["9702:22.2:1", { coverageSignal: "candidate_covered", candidateIds: ["phy_photoelectric"], noteZh: "逐条复核：光电效应概念直接定义金属表面受高于阈频光照时发射电子。" }],
  ["9702:22.2:3", { coverageSignal: "candidate_partial", candidateIds: ["phy_photoelectric", "phy_photon"], noteZh: "逐条复核：光电效应和光子能量概念提供功函数与光子能量背景，但未独立完整定义功函数。" }],
  ["9702:22.4:3", { coverageSignal: "candidate_covered", candidateIds: ["phy_energy_levels", "phy_photon"], noteZh: "逐条复核：能级与光子概念共同覆盖跃迁能差 E1-E2=hf。" }],
  ["9702:23.1:2", { coverageSignal: "candidate_partial", candidateIds: ["phy_radioactive_decay", "phy_fission_fusion"], noteZh: "逐条复核：放射性衰变和裂变聚变概念提供核反应背景，但未系统说明用核素符号配平简单核方程。" }],
  ["9702:23.2:5", { coverageSignal: "candidate_covered", candidateIds: ["phy_half_life", "phy_radioactive_decay"], noteZh: "逐条复核：半衰期和衰变常数概念共同覆盖 λt½=ln2。" }],
  ["9702:24.1:1", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有物理 KG 没有压电晶体在外加电场下形变及受压生电的概念。" }],
  ["9702:24.1:2", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有物理 KG 没有压电换能器产生和探测超声波的概念。" }],
  ["9702:24.1:3", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有物理 KG 没有超声波在组织边界反射形成诊断信息的概念。" }],
  ["9702:24.1:4", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有物理 KG 没有声阻抗 Z=ρc 的定义。" }],
  ["9702:24.1:5", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有物理 KG 没有由两介质声阻抗计算超声强度反射系数的概念。" }],
  ["9702:24.1:6", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有物理 KG 没有超声在物质中指数衰减 I=I₀e^-μx 的概念。" }],
  ["9702:24.2:2", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有物理 KG 没有 X 射线医学成像中组织吸收差异和造影剂的概念。" }],
  ["9702:24.2:3", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有物理 KG 没有 X 射线在物质中指数衰减 I=I₀e^-μx 的概念。" }],
  ["9702:24.3:1", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有物理 KG 没有放射性示踪剂在身体组织中选择性吸收的概念。" }],
  ["9702:24.3:4", { coverageSignal: "candidate_gap", candidateIds: [], noteZh: "逐条复核：现有物理 KG 没有 PET 中正电子与电子湮灭产生反向双光子的概念。" }],
  ["9702:24.3:5", { requirementType: "concept_and_skill", coverageSignal: "candidate_partial", candidateIds: ["phy_binding_energy", "phy_photon"], noteZh: "逐条复核：质能关系与光子能量概念可计算湮灭光子能量，但现有 KG 没有 PET 湮灭过程概念。" }],
  ["9702:25.3:2", { coverageSignal: "candidate_partial", candidateIds: ["phy_doppler", "phy_hubble"], noteZh: "逐条复核：Doppler 效应与 Hubble 定律提供相对运动和红移背景，但未明确宇宙学红移的波长定义式。" }],
  ["9702:3.2:3", { coverageSignal: "candidate_covered", candidateIds: ["phy_terminal_velocity"], noteZh: "人工批准：阻力与终端速度 Concept 覆盖阻力随速度变化、合力趋零和终端速度。" }],
  ["9702:4.1:1", { coverageSignal: "candidate_covered", candidateIds: ["phy_centre_of_gravity"], noteZh: "人工批准：重心 Concept 覆盖物体总重量的等效作用点。" }],
  ["9702:7.1:3", { requirementType: "concept_and_skill", coverageSignal: "skill_mapping_required", candidateIds: ["phy_progressive_waves"], noteZh: "人工批准：CRO 时基、Y 增益及波形读数属于仪器操作技能，行波 Concept 提供周期、频率和振幅背景。" }],
  ["9702:7.5:2", { coverageSignal: "candidate_covered", candidateIds: ["phy_polarisation_malus"], noteZh: "人工批准：偏振与 Malus 定律 Concept 覆盖透射强度计算。" }],
  ["9702:9.3:7", { coverageSignal: "candidate_covered", candidateIds: ["phy_resistive_sensors"], noteZh: "人工批准：电阻式传感器 Concept 覆盖 LDR 的光强响应。" }],
  ["9702:9.3:8", { coverageSignal: "candidate_covered", candidateIds: ["phy_resistive_sensors"], noteZh: "人工批准：电阻式传感器 Concept 覆盖 NTC 热敏电阻的温度响应。" }],
  ["9702:10.1:1", { requirementType: "concept_and_skill", coverageSignal: "skill_mapping_required", candidateIds: ["phy_series_parallel"], noteZh: "人工批准：标准电路符号属于受控资料和图示识读技能，串并联电路 Concept 提供电路背景。" }],
  ["9702:10.3:3", { coverageSignal: "candidate_covered", candidateIds: ["phy_potentiometer_null_methods"], noteZh: "人工批准：电位计与零示法 Concept 覆盖电流计零读数和平衡判据。" }],
  ["9702:11.1:4", { coverageSignal: "candidate_covered", candidateIds: ["phy_isotopes"], noteZh: "人工批准：物理图复用同位素 canonical concept。" }],
  ["9702:11.1:6", { coverageSignal: "candidate_covered", candidateIds: ["phy_radioactive_decay"], noteZh: "人工批准：扩充后的放射性衰变 Concept 覆盖核子数和电荷守恒。" }],
  ["9702:11.1:10", { coverageSignal: "candidate_covered", candidateIds: ["phy_radioactive_decay"], noteZh: "人工批准：扩充后的放射性衰变 Concept 用（反）中微子分能解释连续 β 能谱。" }],
  ["9702:11.1:12", { coverageSignal: "candidate_covered", candidateIds: ["phy_binding_energy"], noteZh: "人工批准：扩充后的质量亏损与结合能 Concept 覆盖统一原子质量单位 u。" }],
  ["9702:14.2:1", { coverageSignal: "candidate_covered", candidateIds: ["phy_thermometry"], noteZh: "人工批准：测温与热力学温标 Concept 覆盖随温度变化的测温属性。" }],
  ["9702:14.2:2", { coverageSignal: "candidate_covered", candidateIds: ["phy_thermometry"], noteZh: "人工批准：测温与热力学温标 Concept 覆盖温标不依赖特定物质属性。" }],
  ["9702:15.1:2", { coverageSignal: "candidate_covered", candidateIds: ["phy_mole_avogadro"], noteZh: "人工批准：物理图复用摩尔与阿伏伽德罗常数 canonical concept。" }],
  ["9702:15.2:3", { coverageSignal: "candidate_covered", candidateIds: ["phy_ideal_gas"], noteZh: "人工批准：扩充后的理想气体 Concept 覆盖 pV=NkT 与 k=R/NA。" }],
  ["9702:20.3:3", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["phy_hall_effect"], noteZh: "人工批准：Hall 效应 Concept 覆盖 Hall 电压来源、公式和推导。" }],
  ["9702:24.1:1", { coverageSignal: "candidate_covered", candidateIds: ["phy_piezoelectric_transducers"], noteZh: "人工批准：压电换能器 Concept 覆盖正逆压电效应。" }],
  ["9702:24.1:2", { coverageSignal: "candidate_covered", candidateIds: ["phy_piezoelectric_transducers"], noteZh: "人工批准：压电换能器 Concept 覆盖超声的产生和探测。" }],
  ["9702:24.1:3", { coverageSignal: "candidate_covered", candidateIds: ["phy_ultrasound_imaging"], noteZh: "人工批准：超声成像与衰减 Concept 覆盖组织边界回波。" }],
  ["9702:24.1:4", { coverageSignal: "candidate_covered", candidateIds: ["phy_acoustic_impedance_reflection"], noteZh: "人工批准：声阻抗与反射 Concept 覆盖 Z=ρc。" }],
  ["9702:24.1:5", { coverageSignal: "candidate_covered", candidateIds: ["phy_acoustic_impedance_reflection"], noteZh: "人工批准：声阻抗与反射 Concept 覆盖强度反射系数。" }],
  ["9702:24.1:6", { coverageSignal: "candidate_covered", candidateIds: ["phy_ultrasound_imaging"], noteZh: "人工批准：超声成像与衰减 Concept 覆盖超声指数衰减。" }],
  ["9702:24.2:1", { coverageSignal: "candidate_covered", candidateIds: ["phy_xray_production"], noteZh: "人工批准：X 射线产生 Concept 覆盖电子轰击金属靶及最短波长。" }],
  ["9702:24.2:2", { coverageSignal: "candidate_covered", candidateIds: ["phy_xray_imaging_attenuation"], noteZh: "人工批准：X 射线成像与衰减 Concept 覆盖组织吸收差异和造影剂。" }],
  ["9702:24.2:3", { coverageSignal: "candidate_covered", candidateIds: ["phy_xray_imaging_attenuation"], noteZh: "人工批准：X 射线成像与衰减 Concept 覆盖指数衰减。" }],
  ["9702:24.2:4", { coverageSignal: "candidate_covered", candidateIds: ["phy_computed_tomography"], noteZh: "人工批准：CT Concept 覆盖二维切片重建和三维图像组合。" }],
  ["9702:24.3:1", { coverageSignal: "candidate_covered", candidateIds: ["phy_radioactive_tracers_pet"], noteZh: "人工批准：放射性示踪剂与 PET Concept 覆盖示踪剂选择性吸收。" }],
  ["9702:24.3:3", { coverageSignal: "candidate_covered", candidateIds: ["phy_particle_antiparticle_annihilation"], noteZh: "人工批准：粒子-反粒子湮灭 Concept 覆盖电子与正电子湮灭。" }],
  ["9702:24.3:4", { coverageSignal: "candidate_covered", candidateIds: ["phy_particle_antiparticle_annihilation", "phy_radioactive_tracers_pet"], noteZh: "人工批准：湮灭与 PET 两个 Concept 共同覆盖反向双光子和符合探测链路。" }]
  ,
  ["9700:6.2:4", { coverageSignal: "candidate_partial", candidateIds: ["bio_transcription"], noteZh: "第五批高风险复核修正：转录概念覆盖以 DNA 为模板合成 RNA，但未明确区分转录链（模板链）和非转录链及二者序列关系。" }],
  ["9700:16.3:3", { coverageSignal: "candidate_partial", candidateIds: ["bio_gene_control"], noteZh: "第五批高风险复核修正：基因表达调控概念覆盖转录调节背景，但未明确转录因子与 DNA 结合后可提高或降低基因转录。" }],
  ["9700:17.1:3", { coverageSignal: "candidate_partial", candidateIds: ["bio_variation"], noteZh: "第五批高风险复核修正：变异概念区分连续与不连续变异，但未完整解释两类变异各自的遗传基础。" }],
  ["9701:7.1:3", { coverageSignal: "candidate_partial", candidateIds: ["che_le_chatelier", "che_catalysis"], noteZh: "第五批高风险复核修正：Le Chatelier 原理与催化概念覆盖浓度、压力、温度和催化剂背景，但现有节点未完整说明催化剂不改变平衡组成。" }],
  ["9701:8.1:2", { coverageSignal: "candidate_covered", candidateIds: ["che_rate", "che_collision"], noteZh: "第五批高风险复核修正：反应速率和碰撞理论共同覆盖浓度或气体压力通过改变碰撞频率影响反应速率。" }],
  ["9701:17.1:3", { coverageSignal: "candidate_partial", candidateIds: ["che_aldehydes_ketones", "che_mechanism_types"], noteZh: "第五批高风险复核修正：醛酮反应与机理类型概念提供亲核加成背景，但未完整呈现 HCN 对羰基化合物加成的逐步机理。" }],
  ["9701:24.2:4", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["che_electrode_potential", "che_cells"], noteZh: "第五批高风险复核修正：标准电极电势与电化学电池概念共同覆盖由两个标准电极电势计算标准电池电势。" }],
  ["9701:28.1:1", { coverageSignal: "candidate_partial", candidateIds: ["che_transition_props", "che_electron_config"], noteZh: "第五批高风险复核修正：过渡元素性质与电子排布概念提供 d 区背景，但未完整定义形成至少一种具有不完整 d 亚层离子的元素。" }],
  ["9702:6.2:2", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["phy_work", "phy_strain_energy"], noteZh: "第五批高风险复核修正：功与应变能概念共同覆盖力—伸长图下的面积表示所做功。" }],
  ["9702:11.2:3", { coverageSignal: "candidate_partial", candidateIds: ["phy_fundamental_particles"], noteZh: "第五批高风险复核修正：基本粒子概念覆盖夸克和强子背景，但未明确质子为 uud、中子为 udd。" }],
  ["9702:13.4:2", { coverageSignal: "candidate_partial", candidateIds: ["phy_grav_potential", "phy_newton_gravitation"], noteZh: "第五批高风险复核修正：引力势与万有引力概念提供点质量场背景，但未明确给出 φ=-GM/r 并限定零势能参考点。" }],
  ["9702:15.3:1", { coverageSignal: "candidate_partial", candidateIds: ["phy_kinetic_theory"], noteZh: "第五批高风险复核修正：气体动理论概念覆盖微观模型，但未逐项列出理想气体分子运动论的全部假设。" }],
  ["9702:17.1:5", { requirementType: "concept_and_skill", coverageSignal: "candidate_partial", candidateIds: ["phy_shm"], noteZh: "第五批高风险复核修正：简谐运动概念覆盖正弦变化，但未完整覆盖位移、速度和加速度随时间及相互关系的图像表示。" }],
  ["9702:17.3:2", { requirementType: "concept_and_skill", coverageSignal: "candidate_partial", candidateIds: ["phy_damping"], noteZh: "第五批高风险复核修正：阻尼概念覆盖振幅衰减，但未完整覆盖不同阻尼程度的位移—时间图像。" }],
  ["9702:18.2:2", { requirementType: "concept_and_skill", coverageSignal: "candidate_partial", candidateIds: ["phy_e_field_strength", "phy_motion_quantities"], noteZh: "第五批高风险复核修正：电场强度与运动学概念提供受力和运动背景，但未完整组织带电粒子在均匀电场中的运动分析。" }],
  ["9702:18.4:1", { coverageSignal: "candidate_covered", candidateIds: ["phy_e_field_strength", "phy_coulomb"], noteZh: "第五批高风险复核修正：电场强度与 Coulomb 定律概念共同覆盖点电荷电场强度 E=Q/(4πε₀r²)。" }],
  ["9702:18.5:2", { coverageSignal: "candidate_partial", candidateIds: ["phy_e_potential", "phy_e_field_strength"], noteZh: "第五批高风险复核修正：电势与电场强度概念覆盖二者定义，但未明确电场强度等于电势梯度的负值。" }],
  ["9702:18.5:4", { coverageSignal: "candidate_partial", candidateIds: ["phy_e_potential", "phy_coulomb"], noteZh: "第五批高风险复核修正：电势与 Coulomb 定律概念提供点电荷能量背景，但未明确给出 Ep=Qq/(4πε₀r)。" }],
  ["9702:20.3:4", { requirementType: "practical_skill", coverageSignal: "candidate_partial", candidateIds: ["phy_flux_density"], noteZh: "第五批高风险复核修正：磁通密度概念提供测量对象背景，但未覆盖用校准 Hall 探头测量磁通密度的实践流程。" }],
  ["9700:7.2:3", { coverageSignal: "candidate_partial", candidateIds: ["bio_transpiration"], noteZh: "第六批抽样修正：蒸腾概念覆盖气孔失水及影响因素，但未明确叶片内表面蒸发后水蒸气扩散到大气的连续过程。" }],
  ["9700:8.3:1", { coverageSignal: "candidate_partial", candidateIds: ["bio_heart"], noteZh: "第六批抽样修正：心脏概念说明哺乳动物心脏和心动周期，但未具体描述其外部与内部结构。" }],
  ["9700:18.1:2", { coverageSignal: "candidate_partial", candidateIds: ["bio_classification"], noteZh: "第六批抽样修正：分类概念提到三域系统，但未明确列出 Archaea、Bacteria 和 Eukarya。" }],
  ["9701:1.2:2", { coverageSignal: "candidate_partial", candidateIds: ["che_isotopes"], noteZh: "第六批抽样修正：同位素概念覆盖质子、中子和质量数，但未明确核素符号中质量数与原子序数的上下标记法。" }],
  ["9701:28.2:4", { coverageSignal: "candidate_partial", candidateIds: ["che_complex_ions"], noteZh: "第六批抽样修正：配位离子概念覆盖中心金属离子与配体，但未完整覆盖中心原子或离子以及中性配合物的定义范围。" }],
  ["9702:4.2:2", { coverageSignal: "candidate_covered", candidateIds: ["phy_equilibrium"], noteZh: "第六批抽样修正：力的平衡概念明确说明合力和合力矩均为零时物体处于平衡，完整覆盖该要求。" }],
  ["9701:1.3:8", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["che_atomic_orbital_shapes"], noteZh: "人工批准：原子轨道形状 Concept 覆盖 s、p 轨道的描述与绘制。" }],
  ["9701:1.3:9", { coverageSignal: "candidate_covered", candidateIds: ["che_bond_fission"], noteZh: "人工批准：扩充后的键断裂与反应物种 Concept 明确定义自由基含一个或多个未成对电子。" }],
  ["9701:2.1:1", { coverageSignal: "candidate_covered", candidateIds: ["che_relative_masses"], noteZh: "人工批准：相对质量 Concept 定义统一原子质量单位为碳-12 原子质量的十二分之一。" }],
  ["9701:2.1:2", { coverageSignal: "candidate_covered", candidateIds: ["che_relative_masses"], noteZh: "人工批准：相对质量 Concept 区分相对同位素、原子、分子和式量。" }],
  ["9701:2.3:4", { coverageSignal: "candidate_covered", candidateIds: ["che_formulae"], noteZh: "人工批准：扩充后的化学式 Concept 覆盖无水盐、水合盐和结晶水。" }],
  ["9701:3.4:3", { coverageSignal: "candidate_covered", candidateIds: ["che_bond_enthalpy"], noteZh: "人工批准：扩充后的键能与键长 Concept 覆盖定义和反应性比较。" }],
  ["9701:4.1:1", { coverageSignal: "candidate_covered", candidateIds: ["che_gas_laws"], noteZh: "人工批准：扩充后的理想气体行为 Concept 用分子碰撞解释气体压强。" }],
  ["9701:7.2:1", { requirementType: "concept_and_skill", coverageSignal: "skill_mapping_required", candidateIds: ["che_bronsted", "che_strong_weak"], noteZh: "人工批准：常见酸的名称与化学式属于受控词表识读，酸碱理论 Concept 提供背景。" }],
  ["9701:7.2:2", { requirementType: "concept_and_skill", coverageSignal: "skill_mapping_required", candidateIds: ["che_bronsted", "che_strong_weak"], noteZh: "人工批准：常见碱和碱液的名称与化学式属于受控词表识读。" }],
  ["9701:11.4:2", { coverageSignal: "candidate_covered", candidateIds: ["che_group17"], noteZh: "人工批准：扩充后的第 17 族 Concept 覆盖氯净水及 HOCl、ClO− 活性物种。" }],
  ["9701:13.1:3", { coverageSignal: "candidate_covered", candidateIds: ["che_organic_representations"], noteZh: "人工批准：有机结构表示 Concept 覆盖官能团决定特征性质和反应。" }],
  ["9701:13.1:4", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["che_organic_representations"], noteZh: "人工批准：有机结构表示 Concept 覆盖通式、结构式、显示式和骨架式。" }],
  ["9701:13.3:3", { coverageSignal: "candidate_covered", candidateIds: ["che_covalent"], noteZh: "人工批准：扩充后的共价键 Concept 覆盖 sp、sp²、sp³ 杂化原子中的 σ/π 键排列。" }],
  ["9701:14.1:4", { coverageSignal: "candidate_covered", candidateIds: ["che_alkanes"], noteZh: "人工批准：扩充后的烷烃 Concept 覆盖重质馏分裂化。" }],
  ["9701:15.1:2", { coverageSignal: "candidate_covered", candidateIds: ["che_nucleophilic_sub"], noteZh: "人工批准：扩充后的亲核取代 Concept 覆盖卤代烷的一、二、三级分类。" }],
  ["9701:16.1:4", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["che_iodoform_test"], noteZh: "人工批准：碘仿检验 Concept 覆盖可发生反应的醇结构和黄色沉淀。" }],
  ["9701:16.1:5", { coverageSignal: "candidate_covered", candidateIds: ["che_alcohol_reactions"], noteZh: "人工批准：扩充后的醇反应 Concept 覆盖醇与水的相对酸性。" }],
  ["9701:17.1:6", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["che_iodoform_test"], noteZh: "人工批准：碘仿检验 Concept 覆盖甲基羰基结构判据。" }],
  ["9701:19.2:3", { coverageSignal: "candidate_covered", candidateIds: ["che_nitriles"], noteZh: "人工批准：腈与羟基腈 Concept 覆盖酸性或碱性水解为羧酸。" }],
  ["9701:21.1:2", { requirementType: "concept_and_skill", coverageSignal: "skill_mapping_required", candidateIds: ["che_organic_representations", "che_mechanism_types"], noteZh: "人工批准：设计多步有机合成路线属于综合规划技能，不新增伪 Concept。" }],
  ["9701:24.2:10", { coverageSignal: "candidate_covered", candidateIds: ["che_gibbs", "che_cells"], noteZh: "人工批准：扩充后的 Gibbs 自由能与电池 Concept 共同覆盖 ΔG°=-nFE°cell。" }],
  ["9701:25.2:1", { coverageSignal: "candidate_covered", candidateIds: ["che_partition_coefficient"], noteZh: "人工批准：分配系数 Concept 覆盖平衡浓度比定义。" }],
  ["9701:25.2:2", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["che_partition_coefficient"], noteZh: "人工批准：分配系数 Concept 覆盖同一物态溶质在两种溶剂间的计算。" }],
  ["9701:25.2:3", { coverageSignal: "candidate_covered", candidateIds: ["che_partition_coefficient"], noteZh: "人工批准：分配系数 Concept 覆盖溶质和溶剂极性解释。" }],
  ["9701:28.1:2", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["che_atomic_orbital_shapes"], noteZh: "人工批准：原子轨道形状 Concept 覆盖 3dxy 和 3dz² 轨道绘制。" }],
  ["9701:32.2:1", { coverageSignal: "candidate_covered", candidateIds: ["che_diazonium_azo", "che_phenol_acid_base"], noteZh: "人工批准：重氮盐与苯酚 Concept 共同覆盖苯胺经重氮盐制苯酚。" }],
  ["9701:32.2:2", { coverageSignal: "candidate_covered", candidateIds: ["che_phenol_acid_base"], noteZh: "人工批准：苯酚酸碱 Concept 覆盖与 NaOH 生成苯氧负离子。" }],
  ["9701:32.2:3", { coverageSignal: "candidate_covered", candidateIds: ["che_phenol_acid_base"], noteZh: "人工批准：苯酚酸碱 Concept 覆盖苯酚酸性和共轭碱共振稳定。" }],
  ["9701:32.2:4", { coverageSignal: "candidate_covered", candidateIds: ["che_phenol_acid_base"], noteZh: "人工批准：苯酚酸碱 Concept 覆盖水、苯酚和乙醇的相对酸性。" }],
  ["9701:32.2:6", { coverageSignal: "candidate_covered", candidateIds: ["che_phenol_ring_reactivity"], noteZh: "人工批准：苯酚芳环反应 Concept 覆盖羟基对 2、4、6 位的定位效应。" }],
  ["9701:32.2:7", { coverageSignal: "candidate_covered", candidateIds: ["che_phenol_ring_reactivity"], noteZh: "人工批准：苯酚芳环反应 Concept 覆盖将规律迁移到萘酚等酚类。" }],
  ["9701:33.3:3", { coverageSignal: "candidate_covered", candidateIds: ["che_esters"], noteZh: "人工批准：扩充后的酯与酰氯 Concept 覆盖加成-消去机理。" }],
  ["9701:34.2:2", { coverageSignal: "candidate_covered", candidateIds: ["che_diazonium_azo"], noteZh: "人工批准：重氮盐与偶氮化合物 Concept 覆盖苯胺低温重氮化。" }],
  ["9701:34.2:4", { coverageSignal: "candidate_covered", candidateIds: ["che_diazonium_azo"], noteZh: "人工批准：重氮盐与偶氮化合物 Concept 覆盖偶氮偶联和染料。" }],
  ["9701:34.3:2", { coverageSignal: "candidate_covered", candidateIds: ["che_amides"], noteZh: "人工批准：酰胺 Concept 覆盖酸性或碱性水解。" }],
  ["9701:34.3:3", { coverageSignal: "candidate_covered", candidateIds: ["che_amides"], noteZh: "人工批准：酰胺 Concept 覆盖弱碱性及孤对电子离域解释。" }],
  ["9701:35.3:2", { coverageSignal: "candidate_covered", candidateIds: ["che_addition_polymer"], noteZh: "人工批准：扩充后的加聚物 Concept 覆盖某些聚合物的光降解。" }],
  ["9701:36.1:2", { requirementType: "concept_and_skill", coverageSignal: "skill_mapping_required", candidateIds: ["che_organic_representations", "che_mechanism_types"], noteZh: "人工批准：高级多步合成路线设计仍作为综合规划技能映射。" }],
  ["9700:1.2:4", { coverageSignal: "candidate_covered", candidateIds: ["bio_atp_energy_currency"], noteZh: "人工批准：ATP 与细胞能量耦联 Concept 覆盖细胞耗能过程的通用能量来源。" }],
  ["9700:1.2:7", { coverageSignal: "candidate_covered", candidateIds: ["bio_virus_structure_classification"], noteZh: "人工批准：病毒结构与核酸分类 Concept 覆盖非细胞性、核心、衣壳和可选包膜。" }],
  ["9700:2.2:3", { coverageSignal: "candidate_covered", candidateIds: ["bio_monomers_polymers"], noteZh: "人工批准：单体、聚合物与共价连接 Concept 覆盖小分子由共价键连接成聚合物。" }],
  ["9700:2.3:7", { coverageSignal: "candidate_covered", candidateIds: ["bio_collagen"], noteZh: "人工批准：胶原 Concept 覆盖胶原分子及其形成纤维的排列。" }],
  ["9700:2.3:8", { coverageSignal: "candidate_covered", candidateIds: ["bio_collagen"], noteZh: "人工批准：胶原 Concept 覆盖分子和纤维结构与抗张功能的关系。" }],
  ["9700:3.2:2", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["bio_michaelis_menten"], noteZh: "人工批准：Michaelis-Menten 动力学 Concept 覆盖 Vmax、Km 及亲和力比较。" }],
  ["9700:4.2:3", { coverageSignal: "candidate_covered", candidateIds: ["bio_surface_area_volume_ratio"], noteZh: "人工批准：表面积体积比 Concept 覆盖三维形体计算及随尺寸增大的变化规律。" }],
  ["9700:5.1:6", { coverageSignal: "candidate_covered", candidateIds: ["bio_mitosis"], noteZh: "人工批准：扩充后的有丝分裂 Concept 覆盖失控分裂和肿瘤形成。" }],
  ["9700:6.1:5", { coverageSignal: "candidate_covered", candidateIds: ["bio_rna_structure"], noteZh: "人工批准：RNA 与 mRNA 结构 Concept 覆盖该分子结构要求。" }],
  ["9700:8.2:2", { coverageSignal: "candidate_covered", candidateIds: ["bio_carbon_dioxide_transport"], noteZh: "人工批准：二氧化碳运输 Concept 覆盖 chloride shift 及其重要性。" }],
  ["9700:8.2:3", { coverageSignal: "candidate_covered", candidateIds: ["bio_carbon_dioxide_transport"], noteZh: "人工批准：二氧化碳运输 Concept 覆盖血浆中的溶解态和碳酸氢根运输。" }],
  ["9700:10.2:1", { coverageSignal: "candidate_covered", candidateIds: ["bio_antibiotics"], noteZh: "人工批准：抗生素选择性作用 Concept 覆盖青霉素对细菌的作用以及对病毒无效。" }],
  ["9700:12.1:2", { coverageSignal: "candidate_covered", candidateIds: ["bio_atp_energy_currency"], noteZh: "人工批准：ATP Concept 覆盖其适合作为通用能量货币的特征。" }],
  ["9700:12.1:5", { coverageSignal: "candidate_covered", candidateIds: ["bio_respiratory_quotient"], noteZh: "人工批准：呼吸商 Concept 覆盖 RQ 定义。" }],
  ["9700:12.1:6", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["bio_respiratory_quotient"], noteZh: "人工批准：呼吸商 Concept 覆盖由呼吸方程计算不同底物 RQ。" }],
  ["9700:13.1:5", { coverageSignal: "candidate_covered", candidateIds: ["bio_photosynthetic_pigments_spectra"], noteZh: "人工批准：光合色素与光谱 Concept 覆盖吸收光谱和作用光谱解释。" }],
  ["9700:14.1:3", { coverageSignal: "candidate_covered", candidateIds: ["bio_deamination_urea"], noteZh: "人工批准：脱氨与尿素形成 Concept 覆盖肝脏处理过量氨基酸。" }],
  ["9700:14.1:11", { coverageSignal: "candidate_covered", candidateIds: ["bio_glucose_biosensors"], noteZh: "人工批准：葡萄糖试纸与生物传感器 Concept 覆盖 glucose oxidase 和 peroxidase 原理。" }],
  ["9700:14.2:4", { coverageSignal: "candidate_covered", candidateIds: ["bio_aba_stomatal_closure"], noteZh: "人工批准：ABA 与气孔关闭 Concept 覆盖 Ca2+ 第二信使和水分胁迫反应。" }],
  ["9700:15.1:10", { coverageSignal: "candidate_covered", candidateIds: ["bio_neuromuscular_activation"], noteZh: "人工批准：神经肌肉激活 Concept 覆盖神经肌肉接头、T 管和肌浆网。" }],
  ["9700:15.1:12", { coverageSignal: "candidate_covered", candidateIds: ["bio_sliding_filament_contraction"], noteZh: "人工批准：滑动肌丝 Concept 覆盖 troponin、tropomyosin、Ca2+ 与 ATP。" }],
  ["9700:15.2:3", { coverageSignal: "candidate_covered", candidateIds: ["bio_plant_responses"], noteZh: "人工批准：扩充后的植物响应 Concept 覆盖赤霉素参与大麦萌发和 DELLA 调控边界。" }],
  ["9700:16.2:5", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["bio_chi_square_test"], noteZh: "人工批准：卡方检验 Concept 覆盖观察值与期望值差异的显著性检验。" }],
  ["9700:16.3:2", { coverageSignal: "candidate_covered", candidateIds: ["bio_lac_operon"], noteZh: "人工批准：lac 操纵子 Concept 覆盖原核诱导调控并排除不要求的 cAMP 机制。" }],
  ["9700:17.1:4", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["bio_t_test"], noteZh: "人工批准：两独立样本 t 检验 Concept 覆盖均值比较和显著性判断。" }],
  ["9700:17.2:5", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["bio_hardy_weinberg"], noteZh: "人工批准：Hardy-Weinberg Concept 覆盖频率计算及成立条件。" }],
  ["9700:17.2:6", { coverageSignal: "candidate_covered", candidateIds: ["bio_selective_breeding"], noteZh: "人工批准：选择育种 Concept 覆盖人工选择、近交和杂交原则。" }],
  ["9700:17.2:7", { coverageSignal: "candidate_covered", candidateIds: ["bio_selective_breeding"], noteZh: "人工批准：选择育种 Concept 覆盖官方指定的谷物、玉米和奶牛实例。" }],
  ["9700:18.1:6", { coverageSignal: "candidate_covered", candidateIds: ["bio_virus_structure_classification"], noteZh: "人工批准：病毒结构与核酸分类 Concept 覆盖 DNA/RNA 及单双链分类。" }],
  ["9700:18.2:1", { coverageSignal: "candidate_covered", candidateIds: ["bio_ecosystems_niches"], noteZh: "人工批准：生态系统与生态位 Concept 覆盖两个术语定义。" }],
  ["9700:18.2:5", { requirementType: "concept_and_skill", coverageSignal: "candidate_covered", candidateIds: ["bio_correlation_tests"], noteZh: "人工批准：Spearman 与 Pearson 相关检验 Concept 覆盖两个变量关系分析。" }],
  ["9700:18.3:4", { coverageSignal: "candidate_covered", candidateIds: ["bio_conservation"], noteZh: "人工批准：扩充后的保护 Concept 覆盖 IVF、胚胎移植和代孕，不包含人工授精。" }],
  ["9700:19.1:10", { coverageSignal: "candidate_covered", candidateIds: ["bio_microarrays"], noteZh: "人工批准：DNA 微阵列 Concept 覆盖基因组分析和 mRNA 表达检测。" }],
  ["9700:19.1:11", { coverageSignal: "candidate_covered", candidateIds: ["bio_bioinformatics_databases"], noteZh: "人工批准：序列数据库与生物信息学 Concept 覆盖数据库的用途和收益。" }],
  ["9700:4.2:4", { requirementType: "practical_skill", coverageSignal: "skill_mapping_required", candidateIds: ["bio_passive_transport", "bio_surface_area_volume_ratio"], noteZh: "人工批准 Skill 映射：不同尺寸琼脂块实验由扩散和表面积体积比共同提供背景。" }],
  ["9700:12.1:7", { requirementType: "practical_skill", coverageSignal: "skill_mapping_required", candidateIds: ["bio_respiratory_quotient"], noteZh: "人工批准 Skill 映射：呼吸计测 RQ 的实践技能由呼吸商 Concept 提供背景。" }],
  ["9700:13.1:6", { requirementType: "practical_skill", coverageSignal: "skill_mapping_required", candidateIds: ["bio_photosynthetic_pigments_spectra"], noteZh: "人工批准 Skill 映射：色素色谱与 Rf 计算由光合色素 Concept 提供背景。" }],
  ["9700:15.1:11", { requirementType: "practical_skill", coverageSignal: "skill_mapping_required", candidateIds: ["bio_neuromuscular_activation", "bio_sliding_filament_contraction"], noteZh: "人工批准 Skill 映射：横纹肌超微结构判读由神经肌肉激活与滑动肌丝两个 Concept 提供背景。" }]
]);

const AUDITED_COVERAGE_DOWNGRADES = new Map([
  ["9700:3.1:2", "酶概念覆盖活性位点、活化能和诱导契合，但未覆盖锁钥假说及两种模型的完整比较。"],
  ["9700:4.1:1", "膜结构概念列出磷脂双层和嵌入蛋白，但未解释亲水、疏水相互作用如何决定双层及蛋白排列。"],
  ["9700:6.2:7", "突变概念列出替换、插入和缺失，但未分别说明三类变化对多肽的不同影响。"],
  ["9700:7.2:1", "木质部和韧皮部概念覆盖运输对象，但未明确矿物离子和有机物以溶于水的形式运输。"],
  ["9700:7.2:6", "韧皮部概念覆盖同化物由源到库，但未明确氨基酸及溶于水的限定。"],
  ["9700:7.2:8", "韧皮部概念提到压力流，但未明确沿源到库的静水压力梯度。"],
  ["9700:8.1:6", "水概念覆盖溶剂作用和高比热容，但未说明水是血液及组织液的主要成分。"],
  ["9700:13.2:2", "限制因素概念列出光强、二氧化碳和温度，但未解释三者变化如何影响光合速率。"],
  ["9700:14.1:10", "血糖调节概念提到胰岛素和胰高血糖素，但未分别说明其对肌肉细胞和肝细胞的作用。"],
  ["9700:16.1:3", "减数分裂概念说明产生单倍体配子，但未解释受精恢复二倍体所要求的减数分裂必要性。"],
  ["9700:17.1:1", "变异概念覆盖遗传、环境及交互作用，但未提供 syllabus 要求的实例。"],
  ["9700:17.1:2", "变异概念提到连续与不连续变异，但未定义两者的分布特征。"],
  ["9700:17.3:3", "物种形成概念提到异域和同域机制，但未具体解释地理、生态及行为隔离路径。"],
  ["9700:18.2:3", "生物多样性抽样概念使用随机抽样，但未解释随机性对避免偏差和代表性的意义。"],
  ["9700:18.2:6", "多样性概念提到 Simpson 指数，但未覆盖计算方法及不同 D 值的意义。"],
  ["9700:19.1:1", "基因技术概念描述重组 DNA 技术，但未精确定义重组 DNA 本身。"],

  ["9701:1.1:2", "亚原子粒子概念提到相对质量和电荷，但未给出质子、中子和电子各自的相对值。"],
  ["9701:1.1:3", "亚原子粒子概念使用原子序数和质量数，但未分别定义原子/质子数及质量/核子数。"],
  ["9701:1.2:3", "同位素概念陈述化学性质相同，但未用相同电子排布解释原因。"],
  ["9701:1.3:1", "电子排布概念覆盖壳层、亚层和轨道，但未明确主量子数和基态。"],
  ["9701:1.4:1", "电离能概念描述从气态原子移除电子的能量，但未完整定义第一电离能的粒子数和状态限定。"],
  ["9701:1.4:7", "电离能概念说明连续电离能反映电子结构，但未覆盖由数据推导完整电子排布的方法。"],
  ["9701:1.4:8", "电离能概念未明确由连续电离能跃迁判断元素在周期表中的位置。"],
  ["9701:3.6:3", "分子间力概念列出主要类型，但未完整定义瞬时偶极、永久偶极及氢键的各项限定。"],
  ["9701:4.2:1", "固体结构概念覆盖四类晶体，但未覆盖 syllabus 列出的各个典型物质及其结构细节。"],
  ["9701:4.2:2", "固体结构概念笼统关联结构与物性，但未逐项解释熔沸点、导电性和溶解性。"],
  ["9701:5.1:1", "焓变概念未明确放热反应 ΔH 为负、吸热反应 ΔH 为正。"],
  ["9701:5.1:7", "量热概念覆盖 q=mcΔT，但未覆盖由实验量换算摩尔焓变的 ΔH=-mcΔT/n。"],
  ["9701:7.1:8", "平衡常数概念覆盖 Kc、Kp 表达式，但未明确由给定数据计算平衡组成。"],
  ["9701:7.2:4", "强弱酸概念覆盖酸的完全或部分解离，但未覆盖强碱和弱碱。"],
  ["9701:13.1:2", "烷烃概念定义为饱和烃，但未明确其没有官能团。"],
  ["9701:13.2:2", "机理概念覆盖四类反应和弯箭含义，但未明确弯箭必须从化学键或孤电子对起始。"],
  ["9701:13.4:1", "异构概念提到结构异构，但未明确链异构、位置异构和官能团异构三类。"],
  ["9701:13.4:5", "异构概念提到顺反和光学异构，但未覆盖由结构式识别手性中心及环状化合物。"],
  ["9701:14.1:2", "烷烃概念涵盖燃烧和自由基取代，但未完整区分完全/不完全燃烧及紫外光、氯溴和乙烷实例。"],
  ["9701:14.1:5", "烷烃概念陈述相对不活泼，但未用 C-H 键强度和低极性解释对极性试剂不活泼。"],
  ["9701:14.2:1", "醇反应概念只覆盖脱水制烯烃，未覆盖卤代烷消除和长链烷烃裂化两条路线。"],
  ["9701:15.1:4", "消除反应概念覆盖脱卤化氢，但未明确乙醇 NaOH、加热及溴乙烷实例。"],
  ["9701:15.1:6", "亲核取代概念涵盖 SN1、SN2，但未说明一级、二级、三级卤代烷的机理倾向。"],
  ["9701:17.1:1", "醇氧化概念覆盖产物类型，但未完整列出酸化重铬酸钾或高锰酸钾、蒸馏等试剂和条件。"],
  ["9701:18.2:1", "酯概念覆盖酸醇缩合，但未明确浓硫酸催化条件。"],
  ["9701:20.1:1", "加聚概念覆盖烯烃单体成链，但未明确聚乙烯和 PVC 两个示例。"],
  ["9701:23.4:4", "Gibbs 自由能概念未明确利用给定 ΔH、ΔS 判断温度改变对可行性的影响。"],
  ["9701:24.1:1", "电解概念覆盖产物预测，但未完整列出熔融/水溶、氧化还原序和浓度三个判据。"],
  ["9701:24.1:3", "电解概念提到 Faraday 定律，但未明确 Q=It 以及质量和气体体积的计算关系。"],
  ["9701:24.2:2", "电极电势概念只把标准氢电极作为参照，未描述其装置和标准条件。"],
  ["9701:24.2:5", "电池和电极电势概念提供背景，但未完整覆盖电极极性、外电路电子方向和反应可行性判断。"],
  ["9701:25.1:8", "Ksp 概念定义溶度积，但未明确按化学计量指数书写表达式。"],
  ["9701:25.1:9", "Ksp 概念未明确由浓度计算 Ksp 及反向求浓度的方法。"],
  ["9701:28.2:6", "配位离子概念提到配位数和形状，但未覆盖由金属、配体及配位数预测化学式和电荷。"],
  ["9701:28.2:8", "标准电极电势概念未明确用 E° 值判断过渡元素及其离子参与的氧化还原反应可行性。"],
  ["9701:28.3:3", "过渡金属颜色概念提到 d 轨道分裂，但未完整解释吸收特定频率光导致非简并 d 轨道间跃迁。"],
  ["9701:32.1:1", "酯概念提到酰氯可作酰化剂，但未描述以乙酸乙酯为例的生成反应。"],
  ["9701:33.2:1", "酯概念未完整覆盖醇与酰氯反应的条件及乙酸乙酯、苯甲酸苯酯实例。"],
  ["9701:35.1:1", "缩聚和酯概念覆盖聚酯大类，但未完整列出二醇/二酸或二酰氯及羟基酸两条路线。"],
  ["9701:35.1:2", "缩聚和氨基酸概念覆盖聚酰胺大类，但未完整列出二胺、二酸/二酰氯及氨基酸路线。"],
  ["9701:37.1:2", "色谱概念提到 Rf 值，但未覆盖如何解释和比较 Rf。"],

  ["9709:1.3:3", "圆概念覆盖圆心半径式，但未明确展开式及两种形式之间的转换。"],
  ["9709:1.3:4", "直线和圆概念覆盖交点、切线与垂直关系，但未完整覆盖半圆角和对称性等指定圆几何性质。"],
  ["9709:1.4:2", "弧度概念覆盖弧长和扇形面积，但未覆盖题目可要求的三角形边角及面积计算。"],
  ["9709:1.5:1", "三角函数概念覆盖基本图像和周期性，但未明确伸缩、平移及任意度数或弧度下的变换图像。"],
  ["9709:1.5:4", "三角恒等式概念覆盖化简和证明，但未覆盖用所列恒等式求解方程。"],
  ["9709:1.6:4", "等比数列概念覆盖无穷和，但未明确收敛条件。"],
  ["9709:1.8:1", "积分概念覆盖反向求导和标准函数，但未明确 (ax+b)^n、任意有理 n 及 n≠-1 的完整范围。"],
  ["9709:1.8:4", "面积与旋转体概念覆盖基本情形，但未明确两曲线之间及旋转区域不贴轴的情形。"],
  ["9709:2.5:1", "标准积分概念覆盖指数和三角函数，但未明确全部 eax+b、1/(ax+b) 及线性复合形式。"],
  ["9709:2.6:3", "迭代概念覆盖逐次近似和收敛，但未明确与原方程的关系及达到指定精度的停止条件。"],
  ["9709:3.2:3", "指数方程概念覆盖用对数解方程，但未覆盖指数不等式。"],
  ["9709:3.7:6", "数量积概念覆盖夹角和垂直判定，但未明确点到直线垂足及三维几何应用。"],
  ["9709:4.1:2", "力平衡概念覆盖分解力，但未完整覆盖非平衡情形下的合力计算。"],
  ["9709:4.4:1", "牛顿定律、摩擦和连接质点概念覆盖主要情形，但未明确刚性连杆推力等全部恒力模型。"],
  ["9709:4.4:3", "匀加速和摩擦概念提供背景，但未完整覆盖竖直或粗糙斜面上下行加速度不同的建模。"],
  ["9709:5.5:2", "正态分布概念覆盖标准化，但未明确由给定概率反求 x、均值或标准差的全部题型。"],
  ["9709:5.5:3", "正态近似概念覆盖连续性修正，但未明确 np>5 且 nq>5 的适用条件。"],

  ["9702:1.2:1", "SI 单位概念未明确列出质量、长度、时间、电流和温度及其单位符号。"],
  ["9702:1.2:2", "SI 单位概念说明导出单位来自基本单位，但未覆盖乘积/商表达及 syllabus 全部量的实际使用。"],
  ["9702:1.3:1", "误差概念列出系统误差和随机误差，但未解释各自影响及零误差。"],
  ["9702:2.1:1", "运动量概念覆盖位移、速度和加速度，但未定义距离与速率。"],
  ["9702:2.1:6", "运动方程和图像概念给出关系，但未覆盖从速度、加速度定义推导全部匀加速方程。"],
  ["9702:2.1:7", "SUVAT 概念覆盖匀加速问题，但未明确无空气阻力的匀强重力场落体情形。"],
  ["9702:3.1:2", "牛顿定律概念未明确 F=ma 的使用及加速度与合力同向。"],
  ["9702:3.1:5", "牛顿定律概念概括三定律，但未完整陈述并应用每一条定律。"],
  ["9702:4.1:3", "力矩概念提到力偶产生转动，但未明确力偶由一对只产生转动效应的力组成。"],
  ["9702:4.1:4", "力矩概念未精确定义并应用力偶矩。"],
  ["9702:7.1:5", "行波概念列出波速、频率和波长，但未明确 v=fλ 的计算关系。"],
  ["9702:7.2:2", "波型概念区分横波和纵波，但未覆盖图像分析与解释。"],
  ["9702:8.4:1", "衍射光栅概念提到光栅方程，但未明确 d sinθ=nλ 及级次使用。"],
  ["9702:9.3:3", "I-V 概念列出三类元件，但未明确各曲线的形状和草绘要求。"],
  ["9702:11.1:3", "核结构概念提到质子数和核子数，但未分别定义并比较二者。"],
  ["9702:11.2:6", "基本粒子概念区分夸克与轻子，但未明确电子和中微子均属于轻子。"],
  ["9702:12.1:1", "角运动概念使用弧度，但未定义一弧度及用弧度表示角位移。"],
  ["9702:12.1:3", "角运动概念覆盖角速度和线速度关系，但未明确 ω=2π/T 与 v=rω 两式。"],
  ["9702:12.2:2", "向心加速度概念说明方向和大小，但未明确其导致恒定角速度圆周运动。"],
  ["9702:12.2:3", "向心加速度概念未完整给出 a=rω² 和 a=v²/r。"],
  ["9702:12.2:4", "向心力概念未完整给出 F=mrω² 和 F=mv²/r。"],
  ["9702:14.3:1", "热容量概念描述能量、质量和温度关系，但未精确定义并使用比热容。"],
  ["9702:15.1:1", "SI 单位概念未明确物质的量是基本量且单位为 mol。"],
  ["9702:15.2:2", "理想气体概念覆盖 pV=nRT，但未覆盖分子数形式 pV=NkT。"],
  ["9702:16.1:2", "内能概念给出微观组成，但未明确温度升高与内能增加的关系。"],
  ["9702:16.2:2", "内能概念提到热力学第一定律，但未明确 ΔU=q+W 的符号约定和各项含义。"],
  ["9702:19.1:3", "电容网络概念给出串并联规则，但未覆盖从 C=Q/V 推导规则的过程。"],
  ["9702:19.2:2", "电容储能概念覆盖 Q-V 图面积，但未明确 W=½QV=½CV² 两式。"],
  ["9702:19.3:1", "电容放电概念说明指数规律，但未覆盖电势差、电荷和电流三类随时间图像的分析。"],
  ["9702:20.2:3", "磁通密度概念由载流导线受力定义，但未明确单位电流、单位长度和垂直场条件。"],
  ["9702:20.3:1", "运动电荷受力概念给出大小和圆周效应，但未说明如何确定受力方向。"],
  ["9702:20.5:2", "磁通和磁通链概念未明确 Φ=BA 及面积垂直条件。"],
  ["9702:21.2:1", "整流概念覆盖半波与全波电路，但未覆盖两者输出图像的区分。"],
  ["9702:21.2:2", "整流概念提到二极管，但未解释单二极管实现半波整流的导通过程。"],
  ["9702:21.2:3", "整流概念提到桥式电路，但未解释四二极管如何实现全波整流。"],
  ["9702:23.2:5", "半衰期和衰变概念说明二者相关，但未明确 λ=0.693/t½。"],
  ["9702:25.2:1", "恒星半径概念提到 Wien 定律，但未明确 λmax∝1/T 及由峰值波长估算温度。"],

  ["9700:1.2:6", "原核细胞概念列出细菌特征并笼统对照真核细胞，但未分别覆盖典型植物细胞和动物细胞结构。"],
  ["9700:2.3:2", "蛋白质概念列出四级结构名称，但未分别解释一级、二级、三级和四级结构的含义。"],
  ["9700:19.1:2", "基因技术概念覆盖基因插入和表达，但未完整说明以改变特定性状为目的的主动遗传物质操纵。"],

  ["9701:3.5:1", "VSEPR 概念覆盖形状和键角预测，但未明确 syllabus 所列七个分子的具体形状和键角。"],
  ["9701:4.1:3", "理想气体概念覆盖 pV=nRT，但未明确由该式进行 Mr 测定。"],
  ["9701:4.2:3", "固体结构概念列出结构与性质关系，但未明确由给定实验信息反推结构和键合类型。"],
  ["9701:7.1:1", "动态平衡概念覆盖封闭体系、等速率和浓度不变，但未独立定义可逆反应。"],
  ["9701:7.1:4", "平衡常数概念说明 Kc 使用浓度，但未明确由平衡方程推导浓度幂次表达式。"],
  ["9701:7.1:6", "平衡常数概念说明 Kp 使用分压，但未明确由平衡方程推导分压幂次表达式。"],
  ["9701:8.1:3", "反应速率概念给出浓度随时间变化的定义，但未明确从实验数据计算速率。"],
  ["9701:22.2:3", "质谱概念说明可求相对分子质量，但未明确由分子离子峰直接判定分子质量。"],
  ["9701:22.2:4", "质谱概念提到离子碎片和结构分析，但未明确由简单碎裂峰建议碎片分子身份。"],
  ["9701:25.1:2", "Brønsted-Lowry 概念提到共轭酸碱对，但未明确在具体反应中识别配对。"],

  ["9709:1.1:2", "二次方程概念覆盖判别式判断实根数，但未明确重根情形。"],
  ["9709:1.2:2", "函数和复合函数概念关注定义域和值域，但未明确复合成立要求前一函数值域包含于后一函数定义域。"],
  ["9709:1.3:5", "二次方程和联立方程概念覆盖公共解，但未明确图像交点与代数解以及相交、相切、不相交的对应。"],
  ["9709:1.6:1", "二项展开概念覆盖正整数幂和二项式系数，但未明确 nCr 与 n! 记号。"],
  ["9709:1.7:2", "幂法则和链式法则覆盖多项式与复合函数，但未明确任意有理指数的完整范围。"],
  ["9709:2.6:2", "迭代概念覆盖逐次近似和收敛，但未明确收敛根序列的标准记号。"],
  ["9709:3.6:2", "迭代概念覆盖逐次近似和收敛，但未明确收敛根序列的标准记号。"],
  ["9709:3.8:1", "微分方程建模概念覆盖由变化率形成方程，但未明确必要时引入并求定比例常数。"],
  ["9709:5.3:3", "概率法则覆盖互斥和独立事件，但未明确通过 P(A∩B) 与 P(A)P(B) 比较判断独立性。"],

  ["9702:6.1:4", "Hooke 定律概念说明力与伸长成正比，但未明确 k=F/x 及其使用。"],
  ["9702:10.2:7", "Kirchhoff 概念陈述两条定律，但未明确联立应用两定律求解电路。"],
  ["9702:14.1:2", "温度概念以无净热流定义热平衡，但未明确等温区域处于热平衡。"],
  ["9702:16.1:1", "内能概念覆盖随机动能和势能之和，但未明确内能由系统状态决定。"],
  ["9702:17.3:1", "阻尼概念覆盖能量损失和振幅衰减，但未明确振荡系统上的阻力导致阻尼。"],
  ["9700:14.1:6", "肾脏概念覆盖超滤和选择性重吸收，但未明确 Bowman's capsule 与近曲小管两个指定位置。"],
  ["9701:37.2:3", "色谱概念提到固定相和保留时间，但未解释保留时间如何随与固定相的相互作用而改变。"],
  ["9702:8.3:3", "双源干涉概念提到相干波，但未明确观察稳定条纹所需的同频率和恒定相位差条件。"],
  ["9702:12.2:1", "向心力和向心加速度概念说明指向圆心，但未完整陈述恒定大小且始终垂直运动方向的力条件。"],
  ["9700:8.2:4", "血红蛋白概念指出氧解离曲线呈 S 形，但未解释成人血红蛋白曲线形状和结合行为。"],
  ["9709:4.1:6", "摩擦概念提到摩擦系数和极限平衡，但未明确 F=μR 与 F≤μR 的使用条件。"]
]);

const AUDITED_AS_IS_OUTCOME_IDS = new Set([
  "9700:1.1:2",
  "9700:1.2:6",
  "9700:2.1:1",
  "9700:2.3:1",
  "9700:2.3:2",
  "9700:3.1:2",
  "9700:3.1:3",
  "9700:3.2:1",
  "9700:3.2:4",
  "9700:4.1:1",
  "9700:4.1:2",
  "9700:4.2:2",
  "9700:6.1:2",
  "9700:6.1:4",
  "9700:6.2:4",
  "9700:6.2:6",
  "9700:7.2:2",
  "9700:7.2:3",
  "9700:7.2:4",
  "9700:7.2:7",
  "9700:8.1:2",
  "9700:8.1:6",
  "9700:8.2:1",
  "9700:8.2:4",
  "9700:8.2:5",
  "9700:8.2:6",
  "9700:8.3:1",
  "9700:8.3:3",
  "9700:9.1:2",
  "9700:9.1:5",
  "9700:9.1:6",
  "9700:9.1:7",
  "9700:10.1:1",
  "9700:11.2:1",
  "9700:11.2:2",
  "9700:11.2:3",
  "9700:12.2:3",
  "9700:12.2:7",
  "9700:12.2:10",
  "9700:13.1:2",
  "9700:13.1:7",
  "9700:13.1:11",
  "9700:13.1:12",
  "9700:13.2:1",
  "9700:13.2:2",
  "9700:13.2:4",
  "9700:14.1:2",
  "9700:16.1:3",
  "9700:16.1:6",
  "9700:16.2:4",
  "9700:16.3:3",
  "9700:17.1:1",
  "9700:17.1:2",
  "9700:17.1:3",
  "9700:17.2:1",
  "9700:17.2:2",
  "9700:17.2:3",
  "9700:17.2:4",
  "9700:18.1:2",
  "9700:18.2:3",
  "9700:19.1:4",
  "9700:19.1:5",
  "9700:19.1:6",
  "9700:19.1:7",
  "9700:19.1:8",
  "9700:19.3:2",
  "9709:1.1:4",
  "9709:1.4:1",
  "9709:1.7:1",
  "9709:2.3:1",
  "9709:3.3:1",
  "9709:3.9:4",
  "9709:3.9:6",
  "9709:4.1:1",
  "9709:4.3:2",
  "9709:4.5:2",
  "9709:4.5:4",
  "9709:5.1:1",
  "9709:5.1:2",
  "9709:5.2:1",
  "9709:5.4:1",
  "9709:5.5:1",
  "9709:6.1:1",
  "9709:6.1:3",
  "9709:6.5:1"
]);

const FULLY_MANUALLY_AUDITED_SYLLABUS_CODES = new Set(["9700", "9701", "9702", "9709"]);

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function normalizeForMatching(value) {
  const expanded = value.replace(/\bp\s*=\s*fv\b/gi, "$& power force velocity");
  return normalize(expanded)
    .split(/\s+/)
    .map((token) => TOKEN_ALIASES.get(token) ?? token)
    .join(" ");
}

function tokenSet(value) {
  return new Set(normalizeForMatching(value).split(/\s+/).filter((token) => token.length > 1 && !STOP_WORDS.has(token)));
}

function tokenList(value) {
  return normalizeForMatching(value).split(/\s+/).filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function containsTokenSequence(haystack, needle) {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  return haystack.some((_, index) => needle.every((token, offset) => haystack[index + offset] === token));
}

function jaccard(left, right) {
  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

function directionalCoverage(needles, haystack) {
  if (needles.size === 0) return 0;
  return [...needles].filter((token) => haystack.has(token)).length / needles.size;
}

function topKeywords(value, limit = 8) {
  const counts = new Map();
  for (const token of normalizeForMatching(value).split(/\s+/)) {
    if (token.length < 2 || STOP_WORDS.has(token) || /^\d+$/.test(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

function cleanLine(line) {
  return line.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/\s+/g, " ").trim();
}

function parsePrintedPage(pageText, pdfPage) {
  const match = pageText.match(/^\s*(\d+)\s+www\.cambridgeinternational\.org\/alevel/m);
  return match ? Number(match[1]) : pdfPage;
}

function isBoilerplate(line) {
  return (
    line === "Back to contents page" ||
    line.includes("www.cambridgeinternational.org/alevel") ||
    /^Cambridge International AS/.test(line) ||
    line === "Notes and examples" ||
    line === "Learning outcomes"
  );
}

function isScienceOutcomeText(value) {
  const firstWord = value
    .replace(/^\([a-z]\)\s*/i, "")
    .match(/^([\p{L}-]+)/u)?.[1]
    ?.toLowerCase();
  return firstWord ? SCIENCE_OUTCOME_VERBS.has(firstWord) : false;
}

function cleanSectionTitle(value) {
  return cleanLine(value)
    .replace(/\s+Learning outcomes(?:\s+continued)?$/i, "")
    .replace(/\s*\(continued\)\s*$/i, "")
    .trim();
}

function isTitleContinuation(line, sectionCode) {
  return !(
    line === "Learning outcomes" ||
    /^Candidates should be able to:$/i.test(line) ||
    /^(?:AS|A) Level subject content$/i.test(line) ||
    new RegExp(`^In ${sectionCode.replace(".", "\\.")}\\b`, "i").test(line) ||
    /^(?:Only|This|The)\b/.test(line)
  );
}

export function parseSyllabus(text, isMathematics) {
  const sections = new Map();
  let currentSection = null;
  let currentOutcome = null;
  let titleContinuationRemaining = 0;
  let inOutcomes = false;

  function ensureSection(code, title, pdfPage, printedPage) {
    const existing = sections.get(code);
    if (existing) {
      currentSection = existing;
      return existing;
    }
    const section = { code, title, pdf_pages: [pdfPage], printed_pages: [printedPage], outcomes: [] };
    sections.set(code, section);
    currentSection = section;
    return section;
  }

  function flushOutcome() {
    if (!currentOutcome || !currentSection) return;
    const textValue = cleanLine(currentOutcome.lines.join(" "));
    if (textValue) currentSection.outcomes.push({ ...currentOutcome, text: textValue });
    currentOutcome = null;
  }

  const pages = text.split("\f");
  pages.forEach((pageText, pageIndex) => {
    if (!/Subject content/.test(pageText)) return;
    flushOutcome();
    inOutcomes = false;
    titleContinuationRemaining = 0;
    const pdfPage = pageIndex + 1;
    const printedPage = parsePrintedPage(pageText, pdfPage);
    const lines = pageText.split(/\r?\n/).map(cleanLine);
    for (const line of lines) {
      if (!line) continue;
      if (line === "Learning outcomes") {
        titleContinuationRemaining = 0;
        continue;
      }
      if (isBoilerplate(line)) continue;
      const sectionMatch = line.match(/^(\d+\.\d+)\s+(.+)$/);
      if (sectionMatch && /^\p{L}/u.test(sectionMatch[2])) {
        flushOutcome();
        const existed = sections.has(sectionMatch[1]);
        const title = cleanSectionTitle(sectionMatch[2]);
        const section = ensureSection(sectionMatch[1], title, pdfPage, printedPage);
        if (!section.pdf_pages.includes(pdfPage)) section.pdf_pages.push(pdfPage);
        if (!section.printed_pages.includes(printedPage)) section.printed_pages.push(printedPage);
        titleContinuationRemaining = !isMathematics && !existed && !/Learning outcomes/i.test(sectionMatch[2]) ? 1 : 0;
        inOutcomes = false;
        continue;
      }
      if (!currentSection) continue;
      if (/^Candidates should be able to:$/.test(line)) {
        titleContinuationRemaining = 0;
        inOutcomes = true;
        continue;
      }
      if (titleContinuationRemaining > 0) {
        titleContinuationRemaining = 0;
        if (isTitleContinuation(line, currentSection.code)) {
          currentSection.title = cleanSectionTitle(`${currentSection.title} ${line}`);
          continue;
        }
      }
      if (!inOutcomes) continue;
      const outcomeMatch = isMathematics ? line.match(/^•\s*(.+)$/) : line.match(/^(\d+)\s+(.+)$/);
      const previousOutcomeNumber = isMathematics
        ? 0
        : Math.max(
            0,
            ...currentSection.outcomes.map((outcome) => Number(outcome.number)),
            currentOutcome ? Number(currentOutcome.number) : 0
          );
      const isAcceptedOutcome = outcomeMatch && (
        isMathematics ||
        (isScienceOutcomeText(outcomeMatch[2]) && Number(outcomeMatch[1]) > previousOutcomeNumber)
      );
      if (isAcceptedOutcome) {
        flushOutcome();
        currentOutcome = {
          number: isMathematics ? String(currentSection.outcomes.length + 1) : outcomeMatch[1],
          pdf_page: pdfPage,
          printed_page: printedPage,
          lines: [isMathematics ? outcomeMatch[1] : outcomeMatch[2]]
        };
        continue;
      }
      if (!isMathematics && outcomeMatch) {
        const previousLine = currentOutcome?.lines.at(-1) ?? "";
        if (
          currentOutcome &&
          Number(outcomeMatch[1]) <= previousOutcomeNumber &&
          /SN$/i.test(previousLine)
        ) {
          currentOutcome.lines.push(`${outcomeMatch[1]} ${outcomeMatch[2]}`);
        }
        continue;
      }
      if (
        currentOutcome &&
        !/^continued$/i.test(line) &&
        !/^\d+\s+(Pure Mathematics|Mechanics|Probability and Statistics)/.test(line)
      ) {
        currentOutcome.lines.push(line);
      }
    }
  });
  flushOutcome();
  return [...sections.values()].filter((section) => section.outcomes.length > 0);
}

function graphIndex(graph) {
  const topics = graph.nodes.filter((node) => node.kind === "topic");
  const concepts = graph.nodes.filter((node) => node.kind === "concept");
  return {
    topics: topics.map((topic) => {
      const children = concepts.filter((concept) => concept.topic === topic.id);
      return {
        ...topic,
        childIds: children.map((concept) => concept.id),
        children: children.map((concept) => ({
          name: concept.name,
          searchText: `${concept.name} ${concept.description}`
        })),
        searchText: `${topic.name} ${children.map((concept) => `${concept.name} ${concept.description}`).join(" ")}`
      };
    }),
    concepts: concepts.map((concept) => ({
      ...concept,
      searchText: `${concept.name} ${concept.description}`
    }))
  };
}

function classifyRequirement(outcomeText, syllabusCode) {
  const text = normalizeForMatching(outcomeText);
  if (syllabusCode === "9709") {
    return /\b(?:calculate|construct|derive|draw|perform|plot|sketch|solve)\b/.test(text)
      ? "concept_and_skill"
      : "concept";
  }
  if (
    /\b(?:microscope|micrograph|apparatus|experiments?|investigations?|investigate|preparations?|specimens?)\b/.test(text) ||
    /\bmicroscope slide\b/.test(text) ||
    /\bcarry out (?:a |an |the )?(?:test|procedure|investigation)\b/.test(text) ||
    /\bcarry out\b.*\btests?\b/.test(text)
  ) return "practical_skill";
  if (/\b(?:reasonable estimate|estimate physical quantity)\b/.test(text)) return "general_skill";
  if (/\b(?:calculate|construct|derive|draw|perform|plot|sketch|solve)\b/.test(text)) return "concept_and_skill";
  return "concept";
}

function rankTopics(section, outcome, index) {
  const sectionTokens = tokenSet(section.title);
  const outcomeTokens = tokenSet(outcome.text);
  const combinedTokens = new Set([...sectionTokens, ...outcomeTokens]);
  return index.topics
    .map((topic) => {
      const titleScore = Math.max(
        jaccard(sectionTokens, tokenSet(topic.name)),
        ...topic.children.map((concept) => jaccard(sectionTokens, tokenSet(concept.name)))
      );
      const searchScore = Math.max(
        jaccard(combinedTokens, tokenSet(topic.searchText)),
        ...topic.children.map((concept) => jaccard(outcomeTokens, tokenSet(concept.searchText)))
      );
      return { topic, score: Math.min(1, titleScore * 0.65 + searchScore * 0.35) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function rankCandidates(section, outcome, index) {
  const sectionTokens = tokenSet(section.title);
  const outcomeTokens = tokenSet(outcome.text);
  const combinedTokens = new Set([...sectionTokens, ...outcomeTokens]);
  const topics = rankTopics(section, outcome, index);
  const topicScores = new Map(topics.map(({ topic, score }) => [topic.id, score]));
  const allowedTopicIds = new Set(topics.filter(({ score }) => score > 0.01).map(({ topic }) => topic.id));
  const conceptPool = allowedTopicIds.size > 0
    ? index.concepts.filter((concept) => allowedTopicIds.has(concept.topic))
    : index.concepts;
  const concepts = conceptPool
    .map((concept) => {
      const nameTokens = tokenSet(concept.name);
      const searchTokens = tokenSet(concept.searchText);
      const nameScore = jaccard(combinedTokens, nameTokens);
      const descriptionScore = jaccard(outcomeTokens, searchTokens);
      const sectionScore = jaccard(sectionTokens, searchTokens);
      const topicScore = topicScores.get(concept.topic) ?? 0;
      const matchedTokens = [...outcomeTokens].filter((token) => searchTokens.has(token)).length;
      const keywordCoverage = outcomeTokens.size === 0 ? 0 : matchedTokens / outcomeTokens.size;
      const outcomeNameCoverage = directionalCoverage(nameTokens, outcomeTokens);
      const combinedNameCoverage = directionalCoverage(nameTokens, combinedTokens);
      const exactNameInOutcome = normalizeForMatching(outcome.text).includes(normalizeForMatching(concept.name));
      const nameTokenCount = nameTokens.size;
      const leadingNamePhraseInOutcome =
        nameTokenCount >= 2 && containsTokenSequence(tokenList(outcome.text), tokenList(concept.name).slice(0, 2));
      const score = Math.min(
        1,
        nameScore * 0.15 +
          descriptionScore * 0.15 +
          sectionScore * 0.08 +
          topicScore * 0.07 +
          keywordCoverage * 0.15 +
          outcomeNameCoverage ** 2 * 0.25 +
          combinedNameCoverage ** 2 * 0.15 +
          (exactNameInOutcome && nameTokenCount >= 2 ? 0.15 : 0) +
          (leadingNamePhraseInOutcome ? 0.12 : 0)
      );
      return {
        concept,
        score,
        keywordCoverage,
        outcomeNameCoverage,
        combinedNameCoverage,
        exactNameInOutcome,
        leadingNamePhraseInOutcome,
        nameTokenCount
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  return { concepts, topics };
}

function isCredibleCandidate(candidate) {
  return Boolean(
    candidate &&
    candidate.score >= 0.1 &&
    (candidate.keywordCoverage >= 0.3 ||
      candidate.leadingNamePhraseInOutcome ||
      candidate.exactNameInOutcome && candidate.nameTokenCount >= 2 ||
      candidate.nameTokenCount >= 2 && candidate.outcomeNameCoverage >= 0.75 ||
      candidate.nameTokenCount >= 2 && candidate.outcomeNameCoverage >= 0.5 && candidate.score >= 0.22)
  );
}

function coverageSignal(ranked, requirementType) {
  if (requirementType === "practical_skill" || requirementType === "general_skill") return "skill_mapping_required";
  const first = ranked.concepts[0];
  const second = ranked.concepts[1];
  if (!isCredibleCandidate(first)) return "unresolved_mapping";
  if (isCredibleCandidate(second) && first.score - second.score < 0.03) return "ambiguous";
  if (
    (first.exactNameInOutcome || first.leadingNamePhraseInOutcome) && first.keywordCoverage >= 0.25 ||
    first.outcomeNameCoverage >= 0.75 && first.keywordCoverage >= 0.4
  ) return "candidate_covered";
  if (first.score < 0.16 || first.keywordCoverage < 0.65) return "candidate_partial";
  return "candidate_covered";
}

function summaryZh(signal, requirementType, ranked) {
  const first = ranked.concepts[0]?.concept;
  const second = ranked.concepts[1]?.concept;
  if (signal === "skill_mapping_required") {
    const label = requirementType === "practical_skill" ? "实践技能" : "通用技能";
    return `该要求主要属于${label}；应进入技能覆盖表，不应直接计为 Concept 缺口。`;
  }
  if (signal === "candidate_gap") {
    return "未找到可信 Concept 候选；需由人工从官方小节重新定位，不展示低分候选。";
  }
  if (signal === "unresolved_mapping") {
    return "自动证据不足，尚不能判断现有 KG 是部分覆盖还是真实缺口；不展示低分候选，需人工定位。";
  }
  if (signal === "candidate_partial") {
    return `首选候选为“${first?.name_zh ?? "无"}”，但当前 KG 只覆盖部分要求；需人工确认扩充范围或记录缺口。`;
  }
  if (signal === "ambiguous") {
    return `候选存在歧义：${first?.name_zh ?? "无"}${second ? ` / ${second.name_zh}` : ""}；需人工核对范围。`;
  }
  return `候选映射为“${first?.name_zh ?? "无"}”；仍需核对完整范围和页码证据。`;
}

function buildReview(subject) {
  const text = readFileSync(resolve(INPUT_DIR, subject.textFile), "utf8");
  const graph = readJson(graphPath(subject.graphId));
  const index = graphIndex(graph);
  const parsedSections = parseSyllabus(text, subject.syllabusCode === "9709");
  const matchedConceptIds = new Set();
  const sections = parsedSections.map((section) => {
    const outcomes = section.outcomes.map((outcome) => {
      const outcomeId = `${subject.syllabusCode}:${section.code}:${outcome.number}`;
      const baseAuditOverride = AUDITED_OUTCOME_OVERRIDES.get(outcomeId);
      const coverageDowngradeReason = AUDITED_COVERAGE_DOWNGRADES.get(outcomeId);
      const auditOverride = coverageDowngradeReason
        ? {
            ...baseAuditOverride,
            coverageSignal: "candidate_partial",
            noteZh: `第七批完整覆盖全量复核修正：${coverageDowngradeReason}`
          }
        : baseAuditOverride;
      const auditedAsIs = FULLY_MANUALLY_AUDITED_SYLLABUS_CODES.has(subject.syllabusCode)
        || AUDITED_AS_IS_OUTCOME_IDS.has(outcomeId);
      const requirementType = auditOverride?.requirementType ?? classifyRequirement(outcome.text, subject.syllabusCode);
      const ranked = rankCandidates(section, outcome, index);
      const hasAuditedCandidateIds = Array.isArray(auditOverride?.candidateIds);
      const auditedCandidates = auditOverride?.candidateIds
        ?.map((candidateId) => index.concepts.find((concept) => concept.id === candidateId))
        .filter(Boolean)
        .map((concept) => ({
          concept,
          score: null,
          keywordCoverage: null,
          outcomeNameCoverage: null,
          combinedNameCoverage: null
        })) ?? [];
      const credibleCandidates = ranked.concepts.filter(isCredibleCandidate);
      const machineRanked = { ...ranked, concepts: credibleCandidates };
      const signal = auditOverride?.coverageSignal ?? coverageSignal(machineRanked, requirementType);
      const selectedCandidates = hasAuditedCandidateIds
        ? auditedCandidates
        : requirementType === "practical_skill" || requirementType === "general_skill"
          ? credibleCandidates.slice(0, 1)
          : signal === "ambiguous"
            ? credibleCandidates.slice(0, 2)
            : credibleCandidates.slice(0, 1);
      const selectedRanked = { ...ranked, concepts: selectedCandidates };
      if (signal === "candidate_covered" && selectedCandidates[0]) matchedConceptIds.add(selectedCandidates[0].concept.id);
      const candidateConcepts = signal === "candidate_gap" || signal === "unresolved_mapping" ? [] : selectedCandidates;
      return {
        outcome_id: outcomeId,
        source_locator: `${section.code} outcome ${outcome.number}`,
        pdf_page: outcome.pdf_page,
        printed_page: outcome.printed_page,
        text_sha256: createHash("sha256").update(normalize(outcome.text)).digest("hex"),
        keywords: topKeywords(outcome.text),
        requirement_type: requirementType,
        review_status: APPROVED_OUTCOME_IDS.has(outcomeId) ? "approved" : "needs_review",
        coverage_signal: signal,
        summary_zh: summaryZh(signal, requirementType, selectedRanked),
        machine_audit_override: Boolean(auditOverride || auditedAsIs),
        machine_audit_note_zh:
          auditOverride?.noteZh ?? (auditedAsIs ? "人工逐条复核：原候选及覆盖结论无需调整。" : null),
        candidate_concepts: candidateConcepts.map(({
          concept,
          score,
          keywordCoverage,
          outcomeNameCoverage,
          combinedNameCoverage
        }) => ({
          node_id: concept.id,
          canonical_id: concept.canonical_id,
          name: concept.name,
          name_zh: concept.name_zh,
          score: score === null ? null : Number(score.toFixed(3)),
          keyword_coverage: keywordCoverage === null ? null : Number(keywordCoverage.toFixed(3)),
          outcome_name_coverage: outcomeNameCoverage === null ? null : Number(outcomeNameCoverage.toFixed(3)),
          combined_name_coverage: combinedNameCoverage === null ? null : Number(combinedNameCoverage.toFixed(3))
        }))
      };
    });
    const topicRanking = rankCandidates(section, section.outcomes[0], index).topics;
    return {
      section_code: section.code,
      title: section.title,
      pdf_pages: section.pdf_pages,
      printed_pages: section.printed_pages,
      candidate_topics: topicRanking.map(({ topic, score }) => ({
        topic_id: topic.id,
        name: topic.name,
        name_zh: topic.name_zh,
        score: Number(score.toFixed(3))
      })),
      outcomes
    };
  });
  const allOutcomes = sections.flatMap((section) => section.outcomes);
  return {
    schema_version: "1.0.0",
    generated_at: GENERATED_AT,
    graph_id: subject.graphId,
    syllabus_code: subject.syllabusCode,
    source_id: subject.sourceId,
    review_status: "needs_review",
    method: "官方 outcome 逐项建立指纹和页码定位，使用保守词汇相似度生成候选；不得自动批准、合并或新增节点。",
    summary: {
      official_sections: sections.length,
      official_outcomes: allOutcomes.length,
      candidate_covered: allOutcomes.filter((item) => item.coverage_signal === "candidate_covered").length,
      candidate_partial: allOutcomes.filter((item) => item.coverage_signal === "candidate_partial").length,
      ambiguous: allOutcomes.filter((item) => item.coverage_signal === "ambiguous").length,
      unresolved_mapping: allOutcomes.filter((item) => item.coverage_signal === "unresolved_mapping").length,
      candidate_gaps: allOutcomes.filter((item) => item.coverage_signal === "candidate_gap").length,
      skill_mapping_required: allOutcomes.filter((item) => item.coverage_signal === "skill_mapping_required").length,
      requirement_types: Object.fromEntries(
        [...new Set(allOutcomes.map((item) => item.requirement_type))]
          .sort()
          .map((type) => [type, allOutcomes.filter((item) => item.requirement_type === type).length])
      ),
      existing_topics: index.topics.length,
      existing_concepts: index.concepts.length
    },
    sections,
    unmatched_existing_concepts: index.concepts
      .filter((concept) => !matchedConceptIds.has(concept.id))
      .map((concept) => ({
        node_id: concept.id,
        canonical_id: concept.canonical_id,
        name: concept.name,
        name_zh: concept.name_zh,
        review_status: "needs_review",
        note_zh: "自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。"
      }))
  };
}

function markdown(review, subject) {
  const lines = [
    `# ${subject.labelZh} KG 中文审核包`,
    "",
    `- 图：\`${review.graph_id}\``,
    `- 官方 syllabus：Cambridge ${review.syllabus_code}`,
    `- 来源：\`${review.source_id}\``,
    `- 状态：\`needs_review\`，本文件不能作为人工批准记录`,
    `- 官方小节：${review.summary.official_sections}；逐项要求：${review.summary.official_outcomes}`,
    `- 自动信号：候选覆盖 ${review.summary.candidate_covered}；部分覆盖 ${review.summary.candidate_partial}；歧义 ${review.summary.ambiguous}；未解析 ${review.summary.unresolved_mapping}；已核实 Concept 缺口 ${review.summary.candidate_gaps}；需技能映射 ${review.summary.skill_mapping_required}`,
    "",
    "> 版权说明：这里只保存小节标题、页码、关键词、文本指纹和 Primoria 候选映射，不复制 Cambridge syllabus 正文。分数只用于排序，不能作为审核结论。",
    "",
    "## 小节覆盖索引",
    "",
    "| 官方小节 | Syllabus 页 | 要求数 | Primoria 候选 Topic | 覆盖 / 部分 / 歧义 / 未解析 / Concept 缺口 / 技能 |",
    "|---|---:|---:|---|---:|"
  ];
  for (const section of review.sections) {
    const covered = section.outcomes.filter((item) => item.coverage_signal === "candidate_covered").length;
    const partial = section.outcomes.filter((item) => item.coverage_signal === "candidate_partial").length;
    const ambiguous = section.outcomes.filter((item) => item.coverage_signal === "ambiguous").length;
    const unresolved = section.outcomes.filter((item) => item.coverage_signal === "unresolved_mapping").length;
    const gaps = section.outcomes.filter((item) => item.coverage_signal === "candidate_gap").length;
    const skills = section.outcomes.filter((item) => item.coverage_signal === "skill_mapping_required").length;
    const topics = section.candidate_topics.slice(0, 2).map((topic) => `${topic.name_zh} (${topic.topic_id})`).join("；");
    lines.push(`| ${section.section_code} ${section.title} | ${section.printed_pages.join(", ")} | ${section.outcomes.length} | ${topics || "无"} | ${covered} / ${partial} / ${ambiguous} / ${unresolved} / ${gaps} / ${skills} |`);
  }
  lines.push("", "## 待人工判断项", "", "| 定位 | 类型 | Syllabus 页 | 关键词 | 候选或相关概念 | 信号 |", "|---|---|---:|---|---|---|");
  for (const section of review.sections) {
    for (const outcome of section.outcomes.filter((item) => item.coverage_signal !== "candidate_covered")) {
      const candidate = outcome.candidate_concepts[0];
      const candidateLabel = candidate
        ? outcome.machine_audit_override
          ? `${candidate.name_zh} (${candidate.node_id}，已抽样核验)`
          : `${candidate.name_zh} (${candidate.node_id}, score ${candidate.score}, coverage ${candidate.keyword_coverage})`
        : "无";
      lines.push(
        `| ${outcome.source_locator} | ${outcome.requirement_type} | ${outcome.printed_page} | ${outcome.keywords.join(", ")} | ${candidateLabel} | ${outcome.coverage_signal} |`
      );
    }
  }
  lines.push("", "## 现有 KG 中未被高置信命中的概念", "");
  for (const concept of review.unmatched_existing_concepts) {
    lines.push(`- ${concept.name_zh}（${concept.name}，\`${concept.node_id}\`）：${concept.note_zh}`);
  }
  lines.push("", "## 审核规则", "", "1. 打开来源页和对应 syllabus 页核对原文。", "2. 将每项标记为覆盖、部分覆盖、缺失或排除，并写明理由。", "3. 只有人工确认后，才可修改正式 KG 的 evidence_refs/review_status。", "4. 新增、删除、合并或先修边调整必须单独形成变更记录。", "");
  return lines.join("\n");
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const index = [];
  const subjects = graphIdArgument ? SUBJECTS.filter((subject) => subject.graphId === graphIdArgument) : SUBJECTS;
  if (subjects.length === 0) throw new Error(`Unknown A-Level graph: ${graphIdArgument}`);
  for (const subject of subjects) {
    const review = buildReview(subject);
    const jsonPath = resolve(OUTPUT_DIR, `${subject.graphId}.coverage.json`);
    const markdownPath = resolve(OUTPUT_DIR, `${subject.graphId}.review.zh-CN.md`);
    writeFileSync(jsonPath, `${JSON.stringify(review, null, 2)}\n`);
    writeFileSync(markdownPath, markdown(review, subject));
    index.push({ graph_id: subject.graphId, ...review.summary });
    process.stdout.write(
      `[build-a-level-review-packs] ${subject.graphId}: ${review.summary.official_outcomes} outcomes, ${review.summary.candidate_gaps} candidate gaps\n`
    );
  }
  if (!graphIdArgument) {
    writeFileSync(
      resolve(OUTPUT_DIR, "README.md"),
      [
      "# A-Level KG 待审核包",
      "",
      "这些文件是官方 syllabus 与当前 KG 的候选映射，不是批准结果。",
      "",
      ...index.map(
        (item) => `- ${item.graph_id}: ${item.official_sections} 小节，${item.official_outcomes} 项要求，${item.candidate_covered} 项候选覆盖，${item.candidate_partial} 项部分覆盖，${item.ambiguous} 项歧义，${item.unresolved_mapping} 项未解析，${item.candidate_gaps} 项已核实 Concept 缺口，${item.skill_mapping_required} 项需技能映射`
      ),
      "",
      "## 再生成（官方 PDF 不提交仓库）",
      "",
      "1. 按 `data/knowledge-graphs/governance/sources.json` 下载四科官方 PDF，并核对 SHA-256。",
      "2. 用 `pdftotext -raw` 分别生成 `cambridge-9700.raw.txt`、`cambridge-9701.raw.txt`、`cambridge-9702.raw.txt`、`cambridge-9709.raw.txt`。",
      "3. 运行 `pnpm --filter @primoria/web build:kg-review-packs -- <文本目录>`。",
      "4. 生成物只含页码、定位、关键词、文本指纹和候选映射；不得提交 Cambridge PDF 或正文。",
      ""
      ].join("\n")
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
