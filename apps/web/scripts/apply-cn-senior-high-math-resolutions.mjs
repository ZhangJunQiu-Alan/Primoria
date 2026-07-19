#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const DATA_ROOT = resolve(REPO_ROOT, "data/knowledge-graphs");
const TODAY = "2026-07-19";
const GRAPH_ID = "senior_secondary_mathematics";
const GAP_PREFIX = "gap_cn_sh_math_2020_o_";
const paths = {
  gaps: resolve(DATA_ROOT, "curricula/gaps/pending/cn_moe_senior_high_math_2020_outcomes.json"),
  mappings: resolve(DATA_ROOT, "curricula/mappings/pending/cn_moe_senior_high_math_2020_outcomes.json"),
  resolutions: resolve(DATA_ROOT, "curricula/resolutions/pending/cn_moe_senior_high_math_2020_outcomes.json"),
  practices: resolve(DATA_ROOT, "pedagogy/practices/cn_moe_senior_high_math_2020.json"),
  graph: resolve(DATA_ROOT, `source/${GRAPH_ID}.json`),
  registry: resolve(DATA_ROOT, "governance/concept-registry.json"),
  sources: resolve(DATA_ROOT, "governance/sources.json"),
  review: resolve(DATA_ROOT, "review/pending/curriculum-mapping/cms_cn_moe_senior_high_math_2020_outcomes.implementation-review.zh-CN.md"),
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
const gapKey = (gapId) => gapId.replace(GAP_PREFIX, "");
const canonicalIdFor = (nodeId) => {
  const digest = createHash("sha256").update(`primoria-concept-v1\0${GRAPH_ID}\0${nodeId}`).digest("hex");
  return `pc_${digest.slice(0, 32)}`;
};
const nodeIdFor = (key) => `cn_sh_math_${key}`;

const SOURCE_IDS = {
  moe: "src_cn_moe_senior_high_math_2020",
  contemporary: "src_openstax_contemporary_mathematics_2026",
  precalculus: "src_openstax_precalculus_2e_2026",
  statistics: "src_openstax_introductory_statistics_2e_2026",
  calculus: "src_mit_ocw_18_01sc_fall_2010",
  multivariable: "src_mit_ocw_18_02sc_fall_2010",
  berkeleyProbability: "src_berkeley_cs70_summer_2026",
  pepMath2: "src_pep_high_school_math_2a_2015",
  pepMath5: "src_pep_high_school_math_5a_2007",
  pepLogic: "src_pep_math_sufficient_necessary_conditions_2023",
  pepOblique: "src_pep_math_oblique_drawing_2023",
  mitStrangComplex: "src_mit_ocw_strang_calculus_ch9_2023",
};

const openStaxSource = ({ id, title, landing, document, issuedAt, sha256 }) => ({
  source_id: id,
  title,
  publisher: "OpenStax, Rice University",
  authority_tier: "B",
  verification_status: "verified",
  jurisdiction: "US",
  languages: ["en"],
  resource_type: "textbook",
  landing_page_url: landing,
  document_url: document,
  document_version: "web/PDF updated 2026-04-23",
  issued_at: issuedAt,
  valid_from: null,
  valid_to: null,
  retrieved_at: TODAY,
  sha256,
  license_expression: "CC-BY-NC-SA-4.0",
  rights: {
    metadata: true,
    fulltext: true,
    excerpts: true,
    derivatives: true,
    redistribution: true,
    commercial_use: false,
  },
  storage_policy: "licensed_fulltext",
  notes_zh: "Browser 核验出版日期、2026-04-23 Web 版本更新时间与 CC BY-NC-SA 4.0；SHA-256 为官方 PDF 下载文件。",
});

const OPENSTAX_SOURCES = [
  openStaxSource({
    id: SOURCE_IDS.precalculus,
    title: "OpenStax Precalculus 2e",
    landing: "https://openstax.org/details/books/precalculus-2e",
    document: "https://assets.openstax.org/oscms-prodcms/media/documents/precalculus-2e_-_WEB.pdf",
    issuedAt: "2021-12-21",
    sha256: "4b7018778433d2c125229a35315cf70e0813cbaacb04118b7265baae625372b5",
  }),
  openStaxSource({
    id: SOURCE_IDS.contemporary,
    title: "OpenStax Contemporary Mathematics",
    landing: "https://openstax.org/details/books/contemporary-mathematics",
    document: "https://assets.openstax.org/oscms-prodcms/media/documents/contemporary-mathematics_-_WEB.pdf",
    issuedAt: "2023-03-22",
    sha256: "300726c9820a8d0822c56e33582a44dffa47111147d64e9cb936b316c448ab38",
  }),
  openStaxSource({
    id: SOURCE_IDS.statistics,
    title: "OpenStax Introductory Statistics 2e",
    landing: "https://openstax.org/details/books/introductory-statistics-2e",
    document: "https://assets.openstax.org/oscms-prodcms/media/documents/introductory-statistics-2e_-_WEB.pdf",
    issuedAt: "2023-12-13",
    sha256: "a79a953b75e570030c74ea6f700b8bd70f41dc8c01bf4e9618e6a0adba3a382a",
  }),
];

const metadataOnlySource = ({
  id,
  title,
  resourceType,
  landing,
  document = null,
  version,
  issuedAt = null,
  sha256,
  notes,
}) => ({
  source_id: id,
  title,
  publisher: "People's Education Press",
  authority_tier: "B",
  verification_status: "verified",
  jurisdiction: "CN",
  languages: ["zh-CN"],
  resource_type: resourceType,
  landing_page_url: landing,
  document_url: document,
  document_version: version,
  issued_at: issuedAt,
  valid_from: null,
  valid_to: null,
  retrieved_at: TODAY,
  sha256,
  license_expression: "LicenseRef-PEP-Copyrighted-MetadataOnly",
  rights: {
    metadata: true,
    fulltext: false,
    excerpts: false,
    derivatives: false,
    redistribution: false,
    commercial_use: false,
  },
  storage_policy: "metadata_only",
  notes_zh: notes,
});

const PEP_SOURCES = [
  metadataOnlySource({
    id: SOURCE_IDS.pepMath2,
    title: "普通高中课程标准实验教科书 数学2（必修）A版",
    resourceType: "textbook",
    landing: "https://www.pep.com.cn/products/jc/gzjks/201510/t20151026_1250736.shtml",
    version: "2015年5月版；ISBN 9787107177064",
    sha256: "4bcaeca4a69d82b4b9c5e5807c82d63a08809aa554223f07f7107d92ddaf4976",
    notes: "用于核对稳定的立体几何、直线与圆知识；课程边界仍以2020年教育部课程标准为准。SHA-256 对应2026-07-19抓取的官方教材介绍页，不保存教材正文。",
  }),
  metadataOnlySource({
    id: SOURCE_IDS.pepMath5,
    title: "普通高中课程标准实验教科书 数学5（必修）A版",
    resourceType: "textbook",
    landing: "https://www.pep.com.cn/products/jc/gzjks/201510/t20151026_1250733.shtml",
    version: "2007年1月版；ISBN 9787107177095",
    sha256: "aad3c51475cd8bf51e1af67ff0aa5492f0d9299c71c0adf156a7cb1c8a7ca676",
    notes: "用于核对不等式性质、基本不等式及其简单应用；课程边界仍以2020年教育部课程标准为准。SHA-256 对应2026-07-19抓取的官方教材介绍页，不保存教材正文。",
  }),
  metadataOnlySource({
    id: SOURCE_IDS.pepLogic,
    title: "人民教育出版社教学设计：1.2.1 充要条件",
    resourceType: "course_material",
    landing: "https://www.pep.com.cn/zzggjc/sx2023/jcmks/jxsj/202303/P020230302365867302908.pdf",
    document: "https://www.pep.com.cn/zzggjc/sx2023/jcmks/jxsj/202303/P020230302365867302908.pdf",
    version: "2023-03 official teaching design",
    issuedAt: "2023-03-02",
    sha256: "778ea6f56738a6a272e772dd54f43bf38043f9d03e93a913b3cfa2862c5661ad",
    notes: "官方教学设计明确覆盖充分条件、必要条件和充要条件。SHA-256 对应官方PDF；版权受限，仅提交元数据与精确页码。",
  }),
  metadataOnlySource({
    id: SOURCE_IDS.pepOblique,
    title: "人民教育出版社教学设计：7.2 空间几何体的三视图与直观图",
    resourceType: "course_material",
    landing: "https://www.pep.com.cn/zzggjc/sx2023/jcmkx/jxsj/202307/t20230725_1984520.shtml",
    document: "https://www.pep.com.cn/zzggjc/sx2023/jcmkx/jxsj/202307/P020230725378170724595.pdf",
    version: "2023-07-25 official teaching design",
    issuedAt: "2023-07-25",
    sha256: "cb136e1616a22861a76960bbdadbe4ef3bf627a471c54c052081eaeaa1154d7f",
    notes: "官方页面与10页教学设计明确覆盖斜二测画法。SHA-256 对应官方PDF；版权受限，仅提交元数据与精确页码。",
  }),
];

const MIT_STRANG_COMPLEX_SOURCE = {
  source_id: SOURCE_IDS.mitStrangComplex,
  title: "MIT OpenCourseWare Calculus by Gilbert Strang, Chapter 9",
  publisher: "Massachusetts Institute of Technology OpenCourseWare",
  authority_tier: "B",
  verification_status: "verified",
  jurisdiction: "US",
  languages: ["en"],
  resource_type: "textbook",
  landing_page_url: "https://ocw.mit.edu/courses/res-18-001-calculus-fall-2023/resources/mitres_18_001_f17_ch09_pdf/",
  document_url: "https://ocw.mit.edu/courses/res-18-001-calculus-fall-2023/mitres_18_001_f17_ch09.pdf",
  document_version: "Fall 2023 OCW resource; PDF modified 2023-10-07",
  issued_at: "2023-10-07",
  valid_from: null,
  valid_to: null,
  retrieved_at: TODAY,
  sha256: "48ce4331688fb283ce6f51e08546f9dc83b9a55d4ba1197f4af82bcee916cfb0",
  license_expression: "CC-BY-NC-SA-4.0",
  rights: {
    metadata: true,
    fulltext: true,
    excerpts: true,
    derivatives: true,
    redistribution: true,
    commercial_use: false,
  },
  storage_policy: "licensed_fulltext",
  notes_zh: "MIT OCW 官方开放教材；Chapter 9 §9.4 直接说明复数除法中的共轭因子、复平面表示及复数加法的向量解释。",
};

const SECONDARY_SOURCES = [...OPENSTAX_SOURCES, ...PEP_SOURCES, MIT_STRANG_COMPLEX_SOURCE];

// Existing concepts confirmed by a second, full-graph reverse lookup.
const PURE_REUSE = {
  quadratic_roots_graph: ["pc_133d40fa0e72c29c5eb6ec7a9852c80c", "pc_2d2287436b31a462805b82876a1bc513", "pc_e1ed93beb5e81e2b78ce90172be70927"],
  quadratic_inequalities: ["pc_133d40fa0e72c29c5eb6ec7a9852c80c", "pc_4307437065fb6fce9aa3b4c05e7ed82d"],
  function_equation_inequality_link: ["pc_133d40fa0e72c29c5eb6ec7a9852c80c", "pc_2d2287436b31a462805b82876a1bc513", "pc_4307437065fb6fce9aa3b4c05e7ed82d"],
  function_definition_domain: ["pc_d547d8eb03df4b28cc0357c7cae1d164"],
  exp_log_inverse: ["pc_d547d8eb03df4b28cc0357c7cae1d164", "pc_3845a20537e66fc1506222d98752aa3d", "pc_81e5444941a3e64858bae20e97e58cf8"],
  radian_measure: ["pc_249bb1a239e11b22bde8356cc52a08a0"],
  sine_parameter_effects: ["pc_c756deb603e99d7fbb680d46214248e8", "pc_1aaf98f8144a2f3b3fae833eb1370db8"],
  function_zeros_equations: ["pc_e1ed93beb5e81e2b78ce90172be70927"],
  bisection_method: ["pc_e1ed93beb5e81e2b78ce90172be70927", "pc_d14f06a56976778d0616245d88284721"],
  plane_vector_concept: ["pc_9ae5f17312ee21050edf3e4bd9b005a2", "pc_64e61e1cee5471619fa54db48800b916"],
  plane_vector_linear_operations: ["pc_9ae5f17312ee21050edf3e4bd9b005a2"],
  plane_vector_coordinate_operations: ["pc_9ae5f17312ee21050edf3e4bd9b005a2", "pc_3e68cc383e695a3ae1773f286b5221f3"],
  finite_sample_spaces_events: ["pc_4dc6f43a3fef8af04213c7aa936a2031", "pc_0c7c408f2fb208ecfb0b6758b1cd4a0a"],
  statistical_charts: ["pc_9b449c02257babd62cc775a79704c117"],
  geometric_sequence_formulae: ["pc_ced3271242c9a0d6fe67d9a446214543"],
  derivative_rate_meaning: ["pc_10673fbc68b0db5d92e2eccb2616c7a6", "pc_30962a9bea6ad49ace59c1ad3e902c12"],
  basic_derivative_rules: ["pc_d35baa6e4598b25c22ba867ed2a4f82f", "pc_4536621b5e542d2b820ea7b67abd0bb3", "pc_31bfe71fa0fb4cdd31cba73b08b409b8"],
  derivative_monotonicity: ["pc_61dadf3e646d2fed3a3b5b81630b2563", "pc_f9249fb783344fbbcfe32c05267ebcb8"],
  derivative_extrema: ["pc_61dadf3e646d2fed3a3b5b81630b2563", "pc_f9249fb783344fbbcfe32c05267ebcb8"],
  spatial_vectors_operations: ["pc_9ae5f17312ee21050edf3e4bd9b005a2"],
  line_plane_vectors: ["pc_0c3c2f35769f38762a59705783e03824", "pc_8386363188df11ab28ae08ef72342a47"],
  spatial_angles_relations: ["pc_3e68cc383e695a3ae1773f286b5221f3", "pc_0c3c2f35769f38762a59705783e03824", "pc_8386363188df11ab28ae08ef72342a47"],
  spatial_distance_angle_problems: ["pc_9ae5f17312ee21050edf3e4bd9b005a2", "pc_3e68cc383e695a3ae1773f286b5221f3", "pc_8386363188df11ab28ae08ef72342a47"],
  circle_equations: ["pc_3d12d114d1630b545655de686dae4630"],
  circle_positional_relations: ["pc_3d12d114d1630b545655de686dae4630", "pc_2fd09e919b7e73069c83ce49007f17d2"],
  continuous_random_variable_context: ["pc_5f55e60931935e299996e34826f1a0e9", "pc_23858effd2dd68284bd0c6b645607386", "pc_bd3e94ad62025e9a58ab6e2016182924"],
  linear_regression: ["pc_ed18cde6c3d7e08e9e371061418a7424"],
};

const SPECIAL_CONCEPTS = {
  function_monotonicity_extrema: [
    ["function_monotonicity", "Function monotonicity", "函数单调性", "根据图像或符号条件判断并表达函数在区间上的递增与递减。"],
    ["function_extrema", "Function maxima and minima", "函数最大值与最小值", "从图像、解析式或情境识别并求简单函数的最大值和最小值。"],
  ],
  logarithms: [
    ["logarithmic_function_behavior", "Logarithmic function behaviour", "对数函数图像与单调性", "分析对数函数的定义域、图像和单调性，并把这些性质与底数联系起来。"],
  ],
  trig_properties_reduction: [
    ["trig_reduction_formulas", "Trigonometric reduction formulas", "三角函数诱导公式", "利用单位圆和角的对称关系推导并使用基本诱导公式。"],
  ],
  trig_transformations: [
    ["trig_product_sum_half_angle", "Product-sum and half-angle transformations", "积化和差、和差化积与半角变换", "按需要由和差角与倍角关系推出并使用积化和差、和差化积和半角公式。"],
  ],
  plane_dot_projection: [
    ["vector_projection", "Vector projection", "向量投影", "解释投影向量与数量投影，并用数量积计算投影和判断垂直。"],
  ],
  complex_representation: [
    ["complex_algebraic_representation", "Complex algebraic representation and equality", "复数代数表示与相等", "使用 a+bi 表示复数，依据实部和虚部分别相等判断两个复数相等。"],
    ["complex_argand_representation", "Argand diagram", "复平面表示", "把复数表示为复平面上的点或向量，并解释代数表示与几何表示的对应关系。", "pc_8b0b34fcb52404046ccbf41b402895fd"],
  ],
  complex_arithmetic: [
    ["complex_arithmetic", "Complex arithmetic in algebraic form", "复数代数形式四则运算", "完成复数代数形式的加、减、乘、除；除法可使用共轭因子，但不把共轭复数扩为独立课程结果。", "pc_84fa9a959816d2fd778aec459c7e0020"],
    ["complex_addition_geometry", "Geometric meaning of complex addition and subtraction", "复数加减的几何意义", "在复平面中用向量的平行四边形法则解释复数加法和减法。"],
  ],
  spatial_parallel_perpendicular_properties: [
    ["spatial_parallel_properties", "Spatial parallelism properties", "空间平行性质", "理解并证明直线与平面、平面与平面平行的课程规定性质。"],
    ["spatial_perpendicular_properties", "Spatial perpendicularity properties", "空间垂直属性", "理解并证明直线与平面、平面与平面垂直的课程规定性质。"],
  ],
  spatial_parallel_perpendicular_criteria: [
    ["spatial_parallel_criteria", "Spatial parallelism criteria", "空间平行判定", "使用课程规定的线面与面面平行判定条件判断空间位置关系。"],
    ["spatial_perpendicular_criteria", "Spatial perpendicularity criteria", "空间垂直判定", "使用课程规定的线面与面面垂直判定条件判断空间位置关系。"],
  ],
  parabola_hyperbola: [
    ["parabola", "Parabola", "抛物线", "理解抛物线的定义、图形、标准方程与简单几何性质。"],
    ["hyperbola", "Hyperbola", "双曲线", "理解双曲线的定义、图形、标准方程与简单几何性质。"],
  ],
  regression_prediction: [
    ["regression_prediction_limits", "Regression prediction and limitations", "回归预测及其限制", "使用一元线性回归进行预测，检查适用范围并解释外推和相关不等于因果等限制。"],
  ],
};

const EXTRA_CANONICAL_IDS = {
  logical_conditions: [],
  inequality_properties: [],
  basic_inequality_optimization: [],
  function_monotonicity_extrema: [],
  function_parity: [],
  function_periodicity: [],
  power_functions: [],
  real_exponents_laws: [],
  logarithms: ["pc_3845a20537e66fc1506222d98752aa3d"],
  trig_properties_reduction: ["pc_c756deb603e99d7fbb680d46214248e8"],
  trig_transformations: ["pc_deafae3a3962b29dc66b867691e8957e", "pc_abd2410d819fd0126e356cacadbbe4ac"],
  plane_dot_projection: ["pc_3e68cc383e695a3ae1773f286b5221f3"],
  complex_representation: [],
  complex_arithmetic: [],
  complex_introduction: [],
  sequence_concept_representation: [],
  sampling_design: [],
  regression_prediction: ["pc_ed18cde6c3d7e08e9e371061418a7424"],
};

const PRACTICE_DETAILS = {
  modelling_formulate: ["modelling_process", "使用真实情境引导学习者明确问题、变量、参数、约束和可检验假设，再形成数学表达。", "问题陈述、变量与参数表、假设及约束说明、数学化表达之间能够相互对应。"],
  modelling_solve: ["modelling_process", "要求学习者说明模型选择、求解路径、工具使用和关键决策，而不只提交数值答案。", "模型结构、推导或计算过程、工具输出与关键决策记录完整且可复核。"],
  modelling_validate: ["modelling_process", "把数学结果带回原情境，通过数据、边界情形或敏感性分析检验并改进模型。", "现实检验、误差或局限分析、改进理由以及改进前后比较均有明确证据。"],
  inquiry_pose_conjecture: ["inquiry_process", "从实例、反例和模式观察中形成边界明确、能够被证明或否证的数学猜想。", "探究问题有数学对象和范围，猜想可检验，并记录支持例与潜在反例。"],
  inquiry_plan_prove: ["inquiry_process", "在证明前明确探究步骤、所需定义与定理、分工和反例检查，再形成论证链。", "方案可执行，论证每一步有依据，能够处理反例或说明结论成立的条件。"],
  research_report_integrity: ["reporting_integrity", "把资料管理、引用归因、过程记录、报告结构和答辩交流作为项目教学的一部分。", "报告、引用、数据或代码来源、过程记录与答辩材料完整，且不存在未归因使用。"],
  extended_research_project: ["assessment_task", "在必修项目基础上增加新的问题范围、方法、数据或验证深度，并明确与旧项目的差异。", "完整项目档案能够证明问题、方法或结果至少一项较必修项目有实质推进。"],
  extended_project_report: ["assessment_task", "允许报告、程序、测量记录等多种成果形式，但必须解释新思路、新方法、新结果及局限。", "成果物可运行或可复核，说明材料明确标出创新点、证据、限制和与必修课题的差异。"],
};

const SECONDARY_EVIDENCE = [
  [/^set_membership_/, SOURCE_IDS.contemporary, "PDF §1.1 Basic Set Concepts, pp.6-13"],
  [/^set_relations_/, SOURCE_IDS.contemporary, "PDF §1.2 Subsets, pp.14-19"],
  [/^set_operations/, SOURCE_IDS.contemporary, "PDF §§1.4-1.5 Set Operations, pp.29-59"],
  [/^venn_diagrams/, SOURCE_IDS.contemporary, "PDF §1.3 Understanding Venn Diagrams, pp.20-28"],
  [/^logical_conditions/, SOURCE_IDS.pepLogic, "PDF pp.1-3, ‘教学目标’及‘命题与推出/充要条件’"],
  [/^quantifiers_negation/, SOURCE_IDS.contemporary, "PDF §2.1 Statements and Quantifiers, pp.60-69"],
  [/^inequality_properties/, SOURCE_IDS.pepMath5, "官方教材目录及内容说明：第三章 §3.1 不等关系与不等式"],
  [/^basic_inequality_optimization/, SOURCE_IDS.pepMath5, "官方教材目录及内容说明：第三章 §3.4 基本不等式及简单应用"],
  [/^quadratic_roots_graph/, SOURCE_IDS.precalculus, "PDF §§3.2, 3.6 and 9.3, pp.255-274, 326-339 and 925-936"],
  [/^quadratic_inequalities/, SOURCE_IDS.precalculus, "PDF §9.3 Systems of Nonlinear Equations and Inequalities, pp.925-936"],
  [/^function_equation_inequality_link/, SOURCE_IDS.precalculus, "PDF §§3.2, 3.6 and 9.3, pp.255-274, 326-339 and 925-936"],
  [/^function_definition_domain/, SOURCE_IDS.precalculus, "PDF §§1.1-1.2 Functions, Domain and Range, pp.7-53"],
  [/^function_representations/, SOURCE_IDS.precalculus, "PDF §1.1 Functions and Function Notation, pp.7-32"],
  [/^piecewise_functions/, SOURCE_IDS.precalculus, "PDF §1.2 Domain and Range, pp.33-53; piecewise-defined functions"],
  [/^function_monotonicity_extrema/, SOURCE_IDS.precalculus, "PDF §1.3 Rates of Change and Behavior of Graphs, pp.54-69"],
  [/^function_(monotonicity|extrema)/, SOURCE_IDS.precalculus, "PDF §1.3 Rates of Change and Behavior of Graphs, pp.54-69"],
  [/^function_parity/, SOURCE_IDS.precalculus, "PDF §1.5 Transformation of Functions, pp.86-116; even and odd functions"],
  [/^function_periodicity/, SOURCE_IDS.precalculus, "PDF Chapter 6 introduction and §6.1, pp.615-633; periodic functions"],
  [/^power_functions/, SOURCE_IDS.precalculus, "PDF §3.3 Power Functions and Polynomial Functions, pp.275-294"],
  [/^real_exponents_laws/, SOURCE_IDS.precalculus, "PDF §4.1 Exponential Functions, pp.398-415"],
  [/^logarithms/, SOURCE_IDS.precalculus, "PDF §§4.3-4.5 Logarithmic Functions and Properties, pp.429-471"],
  [/^logarithmic_function_behavior/, SOURCE_IDS.precalculus, "PDF §§4.3-4.4 Logarithmic Functions and Graphs, pp.429-459"],
  [/^exp_log_inverse/, SOURCE_IDS.precalculus, "PDF §§1.7 and 4.3, pp.130-158 and 429-438"],
  [/^radian_measure/, SOURCE_IDS.precalculus, "PDF §5.1 Angles, pp.536-558"],
  [/^trig_properties_reduction/, SOURCE_IDS.precalculus, "PDF §7.3 Double-Angle, Half-Angle, and Reduction Formulas, pp.700-711"],
  [/^trig_reduction_formulas/, SOURCE_IDS.precalculus, "PDF §7.3 Double-Angle, Half-Angle, and Reduction Formulas, pp.700-711"],
  [/^sine_parameter_effects/, SOURCE_IDS.precalculus, "PDF §6.1 Graphs of the Sine and Cosine Functions, pp.615-633"],
  [/^trig_transformations/, SOURCE_IDS.precalculus, "PDF §§7.2-7.4 Trigonometric Identities and Transformations, pp.685-718"],
  [/^trig_product_sum_half_angle/, SOURCE_IDS.precalculus, "PDF §§7.3-7.4, pp.700-718"],
  [/^trig_modelling/, SOURCE_IDS.precalculus, "PDF §7.6 Modeling with Trigonometric Functions, pp.734-764"],
  [/^sine_cosine_laws/, SOURCE_IDS.precalculus, "PDF §§8.1-8.2 Laws of Sines and Cosines, pp.765-795"],
  [/^function_zeros_equations/, SOURCE_IDS.precalculus, "PDF §3.6 Zeros of Polynomial Functions, pp.326-339"],
  [/^bisection_method/, "src_mit_ocw_18_330_spring_2012", "Lecture-notes unit ‘Root Finding’: bisection method"],
  [/^choose_function_models/, SOURCE_IDS.precalculus, "PDF §§2.3 and 4.7 Modeling with Linear, Exponential and Logarithmic Functions, pp.206-219 and 484-502"],
  [/^compare_growth_rates/, SOURCE_IDS.precalculus, "PDF §§3.3, 4.1 and 4.3, pp.275-294 and 398-438; end behavior and exponential/logarithmic growth"],
  [/^interpret_model_parameters/, SOURCE_IDS.precalculus, "PDF §§2.3 and 4.7 Modeling, pp.206-219 and 484-502"],
  [/^(plane_vector_concept|plane_vector_linear_operations|plane_vector_coordinate_operations|plane_vector_basis_coordinates)/, SOURCE_IDS.multivariable, "Unit 1 Part A, Sessions 1-4: Vectors, Dot Products, Lengths/Angles and Vector Components"],
  [/^(plane_dot_projection|vector_projection|spatial_projection)/, SOURCE_IDS.multivariable, "Unit 1 Part A, Sessions 2-4: Dot Products, Lengths/Angles and Vector Components"],
  [/^vector_applications/, SOURCE_IDS.multivariable, "Unit 1 Part A, Sessions 1-4 and worked examples ‘Force is a Vector’ and ‘Proofs Using Vectors’"],
  [/^complex_arithmetic complex_addition_geometry/, SOURCE_IDS.mitStrangComplex, "Chapter 9 §9.4, printed pp.425-426 (PDF pp.14-15): complex addition as vector addition"],
  [/^complex_arithmetic complex_arithmetic/, SOURCE_IDS.mitStrangComplex, "Chapter 9 §9.4, printed pp.425-426 (PDF pp.14-15): four operations and conjugate factor for division"],
  [/^complex_representation complex_argand_representation/, SOURCE_IDS.precalculus, "PDF §3.1 Complex Numbers, pp.245-254: complex plane"],
  [/^complex_/, SOURCE_IDS.precalculus, "PDF §3.1 Complex Numbers, pp.245-254"],
  [/^solid_structures/, SOURCE_IDS.pepMath2, "官方教材目录及内容说明：第一章 §1.1 空间几何体的结构"],
  [/^solid_surface_volume/, SOURCE_IDS.pepMath2, "官方教材目录及内容说明：第一章 §1.3 空间几何体的表面积与体积"],
  [/^oblique_drawings/, SOURCE_IDS.pepOblique, "官方页面‘教学目标’第2项；附件PDF pp.1-7 斜二测画法教学过程"],
  [/^spatial_axioms/, SOURCE_IDS.pepMath2, "官方教材目录及内容说明：第二章 §2.1 空间点、直线、平面之间的位置关系"],
  [/spatial_parallel_(properties|criteria)/, SOURCE_IDS.pepMath2, "官方教材目录及内容说明：第二章 §2.2 直线、平面平行的判定及其性质"],
  [/spatial_perpendicular_(properties|criteria)/, SOURCE_IDS.pepMath2, "官方教材目录及内容说明：第二章 §2.3 直线、平面垂直的判定及其性质"],
  [/^solid_geometry_proofs/, SOURCE_IDS.pepMath2, "官方教材目录及内容说明：第二章 §§2.1-2.3 空间位置关系、判定及性质"],
  [/^(finite_sample_spaces_events|classical_probability)/, SOURCE_IDS.statistics, "PDF §3.1 Terminology, pp.168-171"],
  [/^frequency_probability/, SOURCE_IDS.statistics, "PDF §3.1 Terminology, pp.168-171; long-run relative frequency and theoretical probability"],
  [/^total_probability_formula/, SOURCE_IDS.berkeleyProbability, "Summer 2026 Note 14 §3-§3.2, PDF pp.4-6; Total Probability Rule and Eq. (4)"],
  [/^(data_sources_population|simple_random_sampling|stratified_sampling|sampling_design)/, SOURCE_IDS.statistics, "PDF §§1.1-1.2 Definitions, Data and Sampling, pp.5-25"],
  [/^statistical_charts/, SOURCE_IDS.statistics, "PDF §§2.1-2.2 Statistical Graphs, pp.66-85"],
  [/^distribution_percentiles/, SOURCE_IDS.statistics, "PDF §2.3 Measures of the Location of the Data, pp.86-93"],
  [/^statistical_inference_uncertainty/, SOURCE_IDS.statistics, "PDF §§1.1-1.2, pp.5-25, and Chapter 8 Confidence Intervals, pp.407-461"],
  [/^sequence_concept_representation/, SOURCE_IDS.precalculus, "PDF §11.1 Sequences and Their Notations, pp.1089-1103"],
  [/^(arithmetic_sequence_modelling|arithmetic_linear_relation)/, SOURCE_IDS.precalculus, "PDF §11.2 Arithmetic Sequences, pp.1104-1114"],
  [/^(geometric_sequence_formulae|geometric_sequence_modelling|geometric_exponential_relation)/, SOURCE_IDS.precalculus, "PDF §11.3 Geometric Sequences, pp.1115-1123"],
  [/^derivative_rate_meaning/, SOURCE_IDS.calculus, "Unit 1 Part A, Sessions 1-3: derivative definition, examples and rate of change"],
  [/^basic_derivative_rules/, SOURCE_IDS.calculus, "Unit 1 Part A, Sessions 6-11: calculation, trigonometric, product, quotient and chain rules"],
  [/^simple_linear_composites/, SOURCE_IDS.calculus, "Unit 1 Part A, Session 11: Chain Rule; local concept is intentionally restricted to f(ax+b)"],
  [/^(derivative_monotonicity|derivative_extrema)/, SOURCE_IDS.calculus, "Unit 2 Part A, Sessions 27-28: curve sketching from first and second derivatives"],
  [/^derivative_optimisation/, SOURCE_IDS.calculus, "Unit 2 Part B, Sessions 29-30: Optimization Problems"],
  [/^(spatial_vectors_operations|spatial_vector_basis|spatial_coordinates_distance)/, SOURCE_IDS.multivariable, "Unit 1 Part A, Sessions 1-4: Vectors, Dot Products, Lengths/Angles and Vector Components"],
  [/^(line_plane_vectors|spatial_angles_relations|spatial_distance_angle_problems)/, SOURCE_IDS.multivariable, "Unit 1 Sessions 3, 8, 12, 15 and 16: lengths/angles, equations of planes, lines and line-plane intersections"],
  [/^vector_geometry_proofs/, SOURCE_IDS.multivariable, "Unit 1 Part A, Sessions 1-8 and worked example ‘Proofs Using Vectors’"],
  [/^line_intersections_distances/, SOURCE_IDS.pepMath2, "官方教材目录及内容说明：第三章 §3.3 直线的交点坐标与距离公式"],
  [/^circle_equations/, SOURCE_IDS.pepMath2, "官方教材目录及内容说明：第四章 §4.1 圆的方程"],
  [/^circle_positional_relations/, SOURCE_IDS.pepMath2, "官方教材目录及内容说明：第四章 §4.2 直线、圆的位置关系"],
  [/^conic_context/, SOURCE_IDS.precalculus, "PDF Chapter 10 introduction and §§10.1-10.3, pp.1009-1055"],
  [/^ellipse/, SOURCE_IDS.precalculus, "PDF §10.1 The Ellipse, pp.1010-1025"],
  [/ parabola$/, SOURCE_IDS.precalculus, "PDF §10.3 The Parabola, pp.1042-1055"],
  [/ hyperbola$/, SOURCE_IDS.precalculus, "PDF §10.2 The Hyperbola, pp.1026-1041"],
  [/^analytic_geometry_method/, SOURCE_IDS.precalculus, "PDF Chapter 10 Conic Sections, pp.1009-1088; geometric constraints translated into equations"],
  [/^continuous_random_variable_context/, SOURCE_IDS.statistics, "PDF §5.1 Continuous Probability Functions, pp.292-294"],
  [/^(sample_correlation|compare_correlations)/, SOURCE_IDS.statistics, "PDF §§12.2-12.4 Scatter Plots, Regression and Correlation, pp.620-634"],
  [/^linear_regression/, SOURCE_IDS.statistics, "PDF §12.3 The Regression Equation, pp.623-630"],
  [/^regression_prediction/, SOURCE_IDS.statistics, "PDF §§12.3 and 12.5-12.6, pp.623-643; regression, prediction and outliers"],
  [/^contingency_table/, SOURCE_IDS.statistics, "PDF §3.4 Contingency Tables, pp.183-188"],
  [/^contingency_independence_test/, SOURCE_IDS.statistics, "PDF §11.3 Test of Independence, pp.574-577"],
];

function secondaryEvidence(key, nodeId) {
  const lookup = `${key} ${nodeId.replace(/^cn_sh_math_/, "")}`;
  const route = SECONDARY_EVIDENCE.find(([pattern]) => pattern.test(lookup));
  if (!route) throw new Error(`No secondary evidence route for ${key}:${nodeId}`);
  return { source_id: route[1], locator: route[2] };
}

const TOPIC_GROUPS = [
  ["set_foundations", "Set foundations", "集合基础", ["set_membership_representation", "set_relations_special_sets", "set_operations"]],
  ["sets_and_logic", "Sets and logic", "集合表达与逻辑", ["venn_diagrams", "logical_conditions", "quantifiers_negation"]],
  ["inequalities_and_optimisation", "Inequalities and optimisation", "不等式与最值", ["inequality_properties", "basic_inequality_optimization"]],
  ["function_representations", "Function representations", "函数表示", ["function_representations", "piecewise_functions"]],
  ["function_qualitative_properties", "Qualitative properties of functions", "函数定性性质", ["function_monotonicity", "function_extrema", "function_parity"]],
  ["elementary_function_behaviour", "Elementary function behaviour", "基本初等函数性质", ["function_periodicity", "power_functions", "real_exponents_laws"]],
  ["logarithmic_growth", "Logarithmic behaviour and growth", "对数函数与增长比较", ["logarithmic_function_behavior", "compare_growth_rates"]],
  ["trigonometric_transformations", "Trigonometric transformations", "三角函数变换", ["trig_reduction_formulas", "trig_product_sum_half_angle", "trig_modelling"]],
  ["function_modelling", "Function modelling", "函数建模", ["choose_function_models", "interpret_model_parameters"]],
  ["plane_vector_foundations", "Plane vector foundations", "平面向量基础", ["plane_vector_basis_coordinates", "vector_projection"]],
  ["vector_triangle_applications", "Vector and triangle applications", "向量与三角形应用", ["vector_applications", "sine_cosine_laws"]],
  ["complex_foundations", "Complex number foundations", "复数表示基础", ["complex_introduction", "complex_algebraic_representation", "complex_argand_representation"]],
  ["complex_operations", "Complex number operations", "复数运算", ["complex_arithmetic", "complex_addition_geometry"]],
  ["solid_structures", "Solid structures and representation", "立体结构与表示", ["solid_structures", "solid_surface_volume", "oblique_drawings"]],
  ["spatial_relations", "Spatial relations", "空间位置关系性质", ["spatial_axioms", "spatial_parallel_properties", "spatial_perpendicular_properties"]],
  ["spatial_criteria_and_proof", "Spatial criteria and proof", "空间判定与证明", ["spatial_parallel_criteria", "spatial_perpendicular_criteria", "solid_geometry_proofs"]],
  ["probability_models", "Probability models", "概率模型", ["classical_probability", "frequency_probability", "total_probability_formula"]],
  ["sampling_methods", "Sampling methods", "抽样方法", ["data_sources_population", "simple_random_sampling", "stratified_sampling"]],
  ["sampling_and_inference", "Sampling and inference", "抽样设计与推断", ["sampling_design", "distribution_percentiles", "statistical_inference_uncertainty"]],
  ["arithmetic_sequences", "Arithmetic sequences", "等差数列", ["sequence_concept_representation", "arithmetic_sequence_modelling", "arithmetic_linear_relation"]],
  ["geometric_sequences", "Geometric sequences", "等比数列", ["geometric_sequence_modelling", "geometric_exponential_relation"]],
  ["derivative_applications", "Derivative applications", "导数应用", ["simple_linear_composites", "derivative_optimisation"]],
  ["spatial_vectors", "Spatial vectors", "空间向量", ["spatial_coordinates_distance", "spatial_vector_basis", "vector_geometry_proofs"]],
  ["analytic_geometry_methods", "Analytic geometry methods", "解析几何方法", ["line_intersections_distances", "analytic_geometry_method", "conic_context"]],
  ["conic_sections", "Conic sections", "圆锥曲线", ["ellipse", "parabola", "hyperbola"]],
  ["quantitative_association", "Quantitative association", "定量关联分析", ["sample_correlation", "regression_prediction_limits"]],
  ["categorical_association", "Categorical association", "分类变量关联", ["contingency_table", "contingency_independence_test"]],
];

const EDGE_SPECS = [
  ["set_membership_representation", "set_relations_special_sets", "集合关系以集合、元素和属于关系为基础。"],
  ["set_relations_special_sets", "set_operations", "并、交、补运算需要先识别集合包含关系以及全集和空集。"],
  ["set_operations", "venn_diagrams", "Venn 图表达集合运算需要先掌握并、交、补。"],
  ["inequality_properties", "basic_inequality_optimization", "基本不等式的变形和最值应用依赖不等式基本性质。"],
  ["function_representations", "piecewise_functions", "理解分段函数需要能在解析式、图像和列表表示之间转换。"],
  ["function_representations", "function_monotonicity", "判断函数在区间上的变化需要先能读取函数图像、解析式或列表表示。"],
  ["function_representations", "function_parity", "判断奇偶性及其几何意义需要先能在解析式与图像表示之间转换。"],
  ["function_representations", "function_periodicity", "识别周期性及其几何意义需要先能读取函数图像和解析表示。"],
  ["function_representations", "power_functions", "识别幂函数典型图像及变化规律需要先掌握函数的基本表示。"],
  ["function_monotonicity", "function_extrema", "由函数变化趋势识别区间或全局最大值和最小值。"],
  ["logarithmic_function_behavior", "compare_growth_rates", "比较对数与其他函数增长速度需要先理解对数函数图像和单调性。"],
  ["compare_growth_rates", "choose_function_models", "选择函数模型需要先能区分常见模型的增长规律。"],
  ["choose_function_models", "interpret_model_parameters", "解释参数前需要先明确模型类型和变量关系。"],
  ["trig_reduction_formulas", "trig_product_sum_half_angle", "积和与半角变换建立在基本诱导及和差、倍角关系之上。"],
  ["plane_vector_basis_coordinates", "vector_applications", "向量解决平面问题需要先能建立基底和坐标表示。"],
  ["vector_projection", "vector_applications", "力学和几何中的分解应用依赖向量投影。"],
  ["complex_introduction", "complex_algebraic_representation", "复数的代数表示和相等关系建立在数系扩充与复数定义之上。"],
  ["complex_algebraic_representation", "complex_argand_representation", "复平面表示需要先能把复数写为 a+bi 并识别实部和虚部。"],
  ["complex_algebraic_representation", "complex_arithmetic", "复数四则运算需要先掌握 a+bi 形式及复数相等。"],
  ["complex_argand_representation", "complex_addition_geometry", "解释复数加减的几何意义需要先掌握复平面的点和向量表示。"],
  ["complex_arithmetic", "complex_addition_geometry", "把加减运算解释为向量运算需要先能完成复数加减。"],
  ["solid_structures", "solid_surface_volume", "表面积和体积计算需要先识别几何体结构及组成。"],
  ["solid_structures", "oblique_drawings", "绘制空间直观图需要先识别基本立体及其组合关系。"],
  ["spatial_axioms", "spatial_parallel_criteria", "空间平行判定建立在点、线、面基本事实和位置关系上。"],
  ["spatial_axioms", "spatial_perpendicular_criteria", "空间垂直判定建立在点、线、面基本事实和位置关系上。"],
  ["spatial_parallel_criteria", "solid_geometry_proofs", "证明空间平行命题需要能正确选用平行判定。"],
  ["spatial_perpendicular_criteria", "solid_geometry_proofs", "证明空间垂直命题需要能正确选用垂直判定。"],
  ["spatial_parallel_properties", "solid_geometry_proofs", "证明空间位置关系命题还需要能正确使用平行性质定理。"],
  ["spatial_perpendicular_properties", "solid_geometry_proofs", "证明空间位置关系命题还需要能正确使用垂直性质定理。"],
  ["classical_probability", "total_probability_formula", "全概率计算需要先能在有限样本模型中计算分支事件概率。"],
  ["data_sources_population", "simple_random_sampling", "实施简单随机抽样前必须明确总体、样本和数据来源。"],
  ["data_sources_population", "stratified_sampling", "实施分层抽样前必须明确总体结构、样本和数据来源。"],
  ["simple_random_sampling", "sampling_design", "选择抽样方案需要理解简单随机抽样的适用条件和限制。"],
  ["stratified_sampling", "sampling_design", "选择抽样方案需要理解分层抽样的适用条件和限制。"],
  ["sequence_concept_representation", "arithmetic_sequence_modelling", "识别和建立等差模型需要先理解数列及其表示。"],
  ["sequence_concept_representation", "geometric_sequence_modelling", "识别和建立等比模型需要先理解数列及其表示。"],
  ["arithmetic_sequence_modelling", "arithmetic_linear_relation", "比较等差数列与一次函数需要先理解等差模型。"],
  ["geometric_sequence_modelling", "geometric_exponential_relation", "比较等比数列与指数函数需要先理解等比模型。"],
  ["spatial_coordinates_distance", "spatial_vector_basis", "空间向量坐标分解需要先建立空间直角坐标系。"],
  ["spatial_vector_basis", "vector_geometry_proofs", "使用向量证明空间命题需要先掌握空间向量基底与坐标表示。"],
  ["line_intersections_distances", "analytic_geometry_method", "解析几何方法需要能把直线交点和距离条件转写为方程。"],
  ["analytic_geometry_method", "ellipse", "建立椭圆方程需要先能把几何约束转化为代数关系。"],
  ["analytic_geometry_method", "parabola", "建立抛物线方程需要先能把几何约束转化为代数关系。"],
  ["analytic_geometry_method", "hyperbola", "建立双曲线方程需要先能把几何约束转化为代数关系。"],
  ["sample_correlation", "regression_prediction_limits", "解释线性回归预测需要先理解样本相关性的强弱和方向。"],
  ["contingency_table", "contingency_independence_test", "独立性检验需要先能正确整理和解释列联表。"],
];

const gaps = readJson(paths.gaps);
const mappings = readJson(paths.mappings);
const registry = readJson(paths.registry);
const sourceRegistry = readJson(paths.sources);

for (const source of SECONDARY_SOURCES) {
  const index = sourceRegistry.sources.findIndex((candidate) => candidate.source_id === source.source_id);
  if (index === -1) sourceRegistry.sources.push(source);
  else sourceRegistry.sources[index] = source;
}
sourceRegistry.sources.sort((left, right) => left.source_id.localeCompare(right.source_id));

const createdNodes = [];
const practiceItems = [];
const resolutions = [];
const resolutionByGapId = new Map();

function conceptSpecsFor(candidate) {
  const key = gapKey(candidate.gap_id);
  const compactSpecs = SPECIAL_CONCEPTS[key];
  if (compactSpecs) {
    return compactSpecs.map(([nodeKey, name, nameZh, description, canonicalId]) => ({
      node_id: nodeIdFor(nodeKey),
      name,
      name_zh: nameZh,
      description,
      ...(canonicalId ? { canonical_id: canonicalId } : {}),
    }));
  }
  return [{
    node_id: nodeIdFor(key),
    name: candidate.proposed_name,
    name_zh: candidate.proposed_name_zh,
    description: candidate.scope_zh,
  }];
}

for (const candidate of gaps.candidates) {
  const key = gapKey(candidate.gap_id);
  let resolution;
  if (candidate.action === "not_knowledge_concept") {
    const details = PRACTICE_DETAILS[key];
    if (!details) throw new Error(`Missing practice details for ${key}`);
    const practiceId = `practice_cn_sh_math_2020_${key}`;
    practiceItems.push({
      practice_id: practiceId,
      requirement_ids: candidate.requirement_ids,
      kind: details[0],
      name: candidate.proposed_name,
      name_zh: candidate.proposed_name_zh,
      description_zh: candidate.scope_zh,
      instructional_use_zh: details[1],
      assessment_evidence_zh: details[2],
      evidence_refs: candidate.evidence_refs,
      review_status: "needs_review",
    });
    resolution = {
      gap_id: candidate.gap_id,
      resolution_action: "route_practice",
      canonical_ids: [],
      created_node_ids: [],
      practice_ids: [practiceId],
      rationale_zh: "该要求评价建模、探究或成果表达过程，不写入学科概念掌握度；已分流到教学与评测知识层。",
      evidence_refs: candidate.evidence_refs,
      review_status: "needs_review",
    };
  } else if (PURE_REUSE[key]) {
    resolution = {
      gap_id: candidate.gap_id,
      resolution_action: "reuse_existing",
      canonical_ids: PURE_REUSE[key],
      created_node_ids: [],
      practice_ids: [],
      rationale_zh: key === "bisection_method"
        ? "全库反向查重确认 MIT 数值分析图已有二分法 canonical 概念；原候选为漏检，不再重复建点。"
        : key === "linear_regression"
          ? "全库反向查重确认机器学习图已有线性回归 canonical 概念，且定义覆盖预测与平方误差拟合；复用稳定 ID。"
          : "逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。",
      evidence_refs: uniqueEvidence([...candidate.evidence_refs, secondaryEvidence(key, nodeIdFor(key))]),
      review_status: "needs_review",
    };
  } else if (key === "spatial_projection") {
    resolution = {
      gap_id: candidate.gap_id,
      resolution_action: "reuse_existing",
      canonical_ids: ["pc_3e68cc383e695a3ae1773f286b5221f3", canonicalIdFor(nodeIdFor("vector_projection"))],
      created_node_ids: [],
      practice_ids: [],
      rationale_zh: "平面与空间中的向量投影共享同一数学定义，复用本轮建立的向量投影 canonical ID。",
      evidence_refs: uniqueEvidence([...candidate.evidence_refs, secondaryEvidence(key, nodeIdFor(key))]),
      review_status: "needs_review",
    };
  } else if (key === "compare_correlations") {
    resolution = {
      gap_id: candidate.gap_id,
      resolution_action: "reuse_existing",
      canonical_ids: ["pc_8d0a38a8e8f86cd83ae1f091a62f2cad", canonicalIdFor(nodeIdFor("sample_correlation"))],
      created_node_ids: [],
      practice_ids: [],
      rationale_zh: "比较相关程度是样本相关系数的直接应用，复用本轮建立的样本相关系数 canonical ID。",
      evidence_refs: uniqueEvidence([...candidate.evidence_refs, secondaryEvidence(key, nodeIdFor(key))]),
      review_status: "needs_review",
    };
  } else {
    const specs = conceptSpecsFor(candidate);
    const createdNodeIds = [];
    const createdCanonicalIds = [];
    for (const spec of specs) {
      const canonicalId = spec.canonical_id ?? canonicalIdFor(spec.node_id);
      const secondRef = secondaryEvidence(key, spec.node_id);
      createdNodes.push({
        id: spec.node_id,
        canonical_id: canonicalId,
        kind: "concept",
        name: spec.name,
        name_zh: spec.name_zh,
        topic: null,
        description: spec.description,
        default_order: 0,
        evidence_refs: uniqueEvidence([...candidate.evidence_refs, secondRef]),
        review_status: "needs_review",
      });
      createdNodeIds.push(spec.node_id);
      createdCanonicalIds.push(canonicalId);
    }
    resolution = {
      gap_id: candidate.gap_id,
      resolution_action: "add_or_alias_concepts",
      canonical_ids: unique([...(EXTRA_CANONICAL_IDS[key] ?? candidate.existing_canonical_ids), ...createdCanonicalIds]),
      created_node_ids: createdNodeIds,
      practice_ids: [],
      rationale_zh: specs.length > 1
        ? "原课程成果包含多个可独立出题诊断的知识点，已按最小诊断粒度拆分并保留同一成果映射。"
        : specs.some((spec) => spec.canonical_id)
          ? "该节点是现有全局概念在中国高中课程中的 jurisdiction alias，复用 canonical ID 并补充本地课程证据。"
          : "现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。",
      evidence_refs: uniqueEvidence([...candidate.evidence_refs, ...specs.map((spec) => secondaryEvidence(key, spec.node_id))]),
      review_status: "needs_review",
    };
  }
  resolutions.push(resolution);
  resolutionByGapId.set(candidate.gap_id, resolution);
}

const duplicateNodeIds = createdNodes.map((node) => node.id).filter((id, index, values) => values.indexOf(id) !== index);
if (duplicateNodeIds.length) throw new Error(`Duplicate created node IDs: ${unique(duplicateNodeIds).join(", ")}`);

const createdById = new Map(createdNodes.map((node) => [node.id, node]));
const topicNodes = [];
const groupedNodeIds = new Set();
for (const [index, [key, name, nameZh, conceptKeys]] of TOPIC_GROUPS.entries()) {
  const topicId = `cn_sh_math_topic_${key}`;
  const concepts = conceptKeys.map((conceptKey, conceptIndex) => {
    const nodeId = nodeIdFor(conceptKey);
    const node = createdById.get(nodeId);
    if (!node) throw new Error(`Topic ${topicId} references missing created node ${nodeId}`);
    if (groupedNodeIds.has(nodeId)) throw new Error(`Created node appears in multiple topics: ${nodeId}`);
    groupedNodeIds.add(nodeId);
    node.topic = topicId;
    node.default_order = conceptIndex + 1;
    return node;
  });
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
if (ungrouped.length) throw new Error(`Created nodes missing topic groups: ${ungrouped.map((node) => node.id).join(", ")}`);

const graphNodeById = new Map(createdNodes.map((node) => [node.id, node]));
const edges = EDGE_SPECS.map(([fromKey, toKey, reason]) => {
  const from = nodeIdFor(fromKey);
  const to = nodeIdFor(toKey);
  const fromNode = graphNodeById.get(from);
  const toNode = graphNodeById.get(to);
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
  subject: "Mathematics",
  jurisdictions: ["CN"],
  source_ids: unique(createdNodes.flatMap((node) => node.evidence_refs.map((ref) => ref.source_id))),
  review_status: "needs_review",
  changelog: [{
    version: "0.1.0",
    date: TODAY,
    summary_zh: "根据中国普通高中数学成果级覆盖审查，新增最小可诊断概念、复用 canonical alias，并补齐双类权威证据。",
  }],
  nodes: [...topicNodes, ...createdNodes],
  edges,
};

const conceptsWithoutGraphAliases = registry.concepts
  .map((concept) => ({ ...concept, aliases: concept.aliases.filter((alias) => alias.graph_id !== GRAPH_ID) }))
  .filter((concept) => concept.aliases.length > 0);
const rebuiltByCanonicalId = new Map(conceptsWithoutGraphAliases.map((concept) => [concept.canonical_id, concept]));
for (const node of createdNodes) {
  const existing = rebuiltByCanonicalId.get(node.canonical_id);
  const alias = { graph_id: GRAPH_ID, node_id: node.id };
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
    mapping.coverage_status = resolution.resolution_action === "route_practice" ? "excluded" : "full";
    mapping.relation = resolution.resolution_action === "route_practice" ? "not_applicable" : "required";
    mapping.mapping_basis = "semantic_inference";
    mapping.confidence = "high";
    mapping.rationale_zh = resolution.resolution_action === "route_practice"
      ? `已分流到教学与评测知识：${resolution.practice_ids.join("、")}；不写入学科概念掌握度。`
      : `经全库查重和最小诊断粒度复核，现由 canonical 概念 ${resolution.canonical_ids.join("、")} 完整覆盖。`;
    mapping.review_status = "needs_review";
  }
}
mappings.content_version = "0.3.0";
mappings.generated_at = TODAY;
mappings.review_status = "needs_review";
if (!mappings.changelog.some((entry) => entry.version === "0.3.0")) {
  mappings.changelog.push({
    version: "0.3.0",
    date: TODAY,
    summary_zh: "应用全库反向查重和缺口解析：学科成果闭合为 full，8 项实践成果分流为 excluded。",
  });
}

const resolutionSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  resolution_set_id: "cgr_cn_moe_senior_high_math_2020_outcomes",
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
    summary_zh: "完成 101 项缺口逐项解析、全库反向查重、概念新增或 alias 复用及实践知识分流。",
  }],
  resolutions,
};

const practiceSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  practice_set_id: "cpk_cn_moe_senior_high_math_2020",
  framework_id: gaps.framework_id,
  curriculum_id: gaps.curriculum_id,
  subject: gaps.subject,
  source_ids: [SOURCE_IDS.moe],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [{
    version: "0.1.0",
    date: TODAY,
    summary_zh: "将建模、探究、报告与进阶项目要求从学科概念掌握度分流到教学和评测知识层。",
  }],
  items: practiceItems,
};

const counts = resolutions.reduce((result, resolution) => {
  result[resolution.resolution_action] = (result[resolution.resolution_action] ?? 0) + 1;
  return result;
}, {});
const edgeTargets = new Set(edges.map((edge) => edge.to));
const rootConcepts = createdNodes.filter((node) => !edgeTargets.has(node.id));
const reviewLines = [
  "# 中国高中数学 KG 缺口实施复核（中文）",
  "",
  `- 复核日期：${TODAY}`,
  `- 缺口解析：${resolutions.length} 项`,
  `- 直接复用现有 canonical：${counts.reuse_existing ?? 0} 项`,
  `- 新增或建立 jurisdiction alias：${counts.add_or_alias_concepts ?? 0} 项`,
  `- 分流到教学/评测知识：${counts.route_practice ?? 0} 项`,
  `- 新图节点：${createdNodes.length} 个 Concept，${topicNodes.length} 个 Topic，${edges.length} 条待审先修边`,
  "- 状态：全部保持 `needs_review`；本轮为 AI 人工式复核，不伪造 human approval decision。",
  "",
  "## 关键纠错",
  "",
  "1. 原缺口表漏检 `Bisection Method`：统一 KG 已有 `pc_d14f06a56976778d0616245d88284721`，已改为复用。",
  "2. 原缺口表漏检 `Linear Regression Model`：统一 KG 已有 `pc_ed18cde6c3d7e08e9e371061418a7424`，已改为复用。",
  "3. 一般 Chain Rule 仍不替代课标限定的 `f(ax+b)` 简单复合求导；保留独立窄概念。",
  "4. 平面投影与空间投影共享同一数学定义和 canonical ID，避免重复建点。",
  "5. 抛物线/双曲线、函数单调性/最值、空间平行/垂直性质与判定均按独立出题粒度拆分。",
  "6. 原二级证据曾把基本不等式、斜二测画法和全概率公式指向不直接支持结论的资料；已分别改为人教版数学5 §3.4、人教社斜二测教学设计和 Berkeley CS70 Note 14 §3-§3.2。",
  "7. 原“复数四则运算不含共轭”范围不成立：复数除法可使用共轭因子。现已纠正描述，并与 A-Level `Complex Number Arithmetic` 共用 `pc_84fa9a959816d2fd778aec459c7e0020`，不再制造重复 canonical ID。",
  "8. 复数加减的几何意义改用 MIT Strang Calculus Chapter 9 §9.4（printed pp.425-426）直接证据，不再用泛化的极坐标章节代替。",
  `9. 逐条检查 ${rootConcepts.length} 个根概念：它们是独立主题入口，或其前置知识由本轮复用的外部 canonical 概念承担；未用课程顺序伪造先修边。`,
  "",
  "## 双类权威证据",
  "",
  "每个新建 Concept 同时包含中国教育部课程标准页码级证据，以及 OpenStax、MIT OCW、Berkeley CS70 或人民教育出版社中直接支持该表述的第二类证据。所有已核验来源均登记 SHA-256；受版权限制资料只提交元数据和精确定位，不提交正文。",
  "",
  "## 逐项解析",
  "",
  "| # | 原缺口 | 解析动作 | canonical IDs | 新节点/实践项 | 复核理由 |",
  "|---:|---|---|---|---|---|",
];
for (const [index, candidate] of gaps.candidates.entries()) {
  const resolution = resolutionByGapId.get(candidate.gap_id);
  const canonicalText = resolution.canonical_ids.map((id) => `\`${id}\``).join("<br>") || "—";
  const targetText = [...resolution.created_node_ids, ...resolution.practice_ids].map((id) => `\`${id}\``).join("<br>") || "—";
  reviewLines.push(`| ${index + 1} | ${candidate.proposed_name_zh} | \`${resolution.resolution_action}\` | ${canonicalText} | ${targetText} | ${resolution.rationale_zh} |`);
}
reviewLines.push(
  "",
  "## 自动门禁",
  "",
  "- 101 个 gap_id 必须恰好解析一次。",
  "- `full` 映射必须与解析后的 canonical_ids 完全一致。",
  "- `excluded` 只能指向教学/评测知识项，不能写入 canonical concept。",
  "- 新建 Concept 必须同时具有两种来源类型的精确证据。",
  "- 新图 Topic 仍保持每组 2–3 个 Concept，先修边必须为 DAG。",
  "",
);

writeJson(paths.sources, sourceRegistry);
writeJson(paths.graph, graph);
writeJson(paths.registry, registry);
writeJson(paths.mappings, mappings);
writeJson(paths.resolutions, resolutionSet);
writeJson(paths.practices, practiceSet);
mkdirSync(dirname(paths.review), { recursive: true });
writeFileSync(paths.review, `${reviewLines.join("\n")}\n`);

process.stdout.write(`[apply-cn-math-resolutions] ${resolutions.length} gaps: ${counts.reuse_existing ?? 0} reuse, ${counts.add_or_alias_concepts ?? 0} concept, ${counts.route_practice ?? 0} practice; ${createdNodes.length} graph concepts\n`);
