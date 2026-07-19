#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const TODAY = "2026-07-19";
const SOURCE_ID = "src_sg_seab_h2_math_9758_2026";
const FRAMEWORK_ID = "cfw_sg_seab_h2_math_9758_2026_outcomes";
const CURRICULUM_ID = "cur_sg_seab_h2_math_9758_2026";
const paths = {
  framework: resolve(ROOT, "data/knowledge-graphs/curricula/frameworks/sg_seab_h2_math_9758_2026.json"),
  mapping: resolve(ROOT, "data/knowledge-graphs/curricula/mappings/pending/sg_seab_h2_math_9758_2026.json"),
  gaps: resolve(ROOT, "data/knowledge-graphs/curricula/gaps/pending/sg_seab_h2_math_9758_2026_outcomes.json"),
  practices: resolve(ROOT, "data/knowledge-graphs/pedagogy/practices/sg_seab_h2_math_9758_2026.json"),
  sources: resolve(ROOT, "data/knowledge-graphs/governance/sources.json"),
};

const C = {
  function: "pc_d547d8eb03df4b28cc0357c7cae1d164",
  composite: "pc_6a6936f09677fca363b23f40f12d946d",
  graphTransform: "pc_1aaf98f8144a2f3b3fae833eb1370db8",
  quadratic: "pc_133d40fa0e72c29c5eb6ec7a9852c80c",
  ellipse: "pc_58591fb3c8294a83a9405568a100991e",
  parabola: "pc_76707a52fc4d807bbdfb0e56f509c17e",
  hyperbola: "pc_d236c68eb711f9a26eb4250a7843b517",
  straightLine: "pc_2fd09e919b7e73069c83ce49007f17d2",
  modulus: "pc_bbf60fbe4b8e3e3bd3bd64a1b5fc3475",
  simultaneous: "pc_204206c0b72ea40b72d3055124b579af",
  inequality: "pc_4307437065fb6fce9aa3b4c05e7ed82d",
  sequence: "pc_d628dbf58410331e403a76b3b121c7fd",
  arithmeticSeries: "pc_9e401fe846a8c086510b3ea2102be253",
  geometricSeries: "pc_ced3271242c9a0d6fe67d9a446214543",
  sequencesSeries: "pc_105655e3b7f36e0d0c2488e7d3e47a3a",
  vectorBasics: "pc_9ae5f17312ee21050edf3e4bd9b005a2",
  vectorMagnitude: "pc_64e61e1cee5471619fa54db48800b916",
  scalarProduct: "pc_3e68cc383e695a3ae1773f286b5221f3",
  crossProduct: "pc_909ca9d8010cb1a841ee03551e2afc16",
  vectorProjection: "pc_b70bbfb827c2b527f128f02bf360675e",
  vectorLines: "pc_0c3c2f35769f38762a59705783e03824",
  linesPlanes: "pc_8386363188df11ab28ae08ef72342a47",
  complexIntroduction: "pc_a2d1c2c86661b6706ceb2919619b89e5",
  complexArithmetic: "pc_84fa9a959816d2fd778aec459c7e0020",
  argand: "pc_8b0b34fcb52404046ccbf41b402895fd",
  complexRoots: "pc_fc9bb3961ffd0d45670252b69c41d19c",
  complexAdditionGeometry: "pc_c04ce0aed24384aaa5b223f59282d31c",
  curveSketching: "pc_f9249fb783344fbbcfe32c05267ebcb8",
  implicitDifferentiation: "pc_291eccaad32d6e2b88654e4670202509",
  parametricDifferentiation: "pc_7430a9a6308a8998f2a18d7a50c51616",
  stationaryPoints: "pc_61dadf3e646d2fed3a3b5b81630b2563",
  tangentNormal: "pc_e48516f32ed219bfab284968f67ba2b4",
  derivativeOptimisation: "pc_7f364bd0df6065095b932f11a00d4941",
  relatedRates: "pc_5ada2e4818384405fb8ea25e390ece93",
  taylorSeries: "pc_c1be934889ced7140179984f36bd37cf",
  powerSeries: "pc_b4706d8b591bf0b18ba7aefbab523c9c",
  standardIntegrals: "pc_ccdbe5629abf3bd57a2af7fed2325222",
  substitution: "pc_068c8dc8d8c675d3d5ce7ccecd096ffc",
  integrationParts: "pc_109312f1b6fc1335fa82c6f6af1f684c",
  definiteIntegral: "pc_440f4c4a56ad058d19d3aab4c136729d",
  definiteArea: "pc_70ca4e3f9288a539a0658a8bfc5fd30e",
  areaCurves: "pc_fdb8e34b296a1710202568026f99cc54",
  volumes: "pc_976815608b52b80566be2966aa010743",
  separation: "pc_19b4d23ab3a52e66c899dbf16e583835",
  formDifferentialEquation: "pc_1c40f01e7df9a2f35a81598b9edf2a2a",
  permutations: "pc_72b8e1a7b680bd575ff6d93a1e2c592b",
  probabilityRules: "pc_0c7c408f2fb208ecfb0b6758b1cd4a0a",
  venn: "pc_c1ed59c17771ca7dfcca90c7c55fadc1",
  conditional: "pc_cf8dbc5bcf596f0c4db74ea9886540a1",
  discreteRandomVariable: "pc_bd3e94ad62025e9a58ab6e2016182924",
  binomial: "pc_dab02572a5e34659342ea1fb544803f8",
  continuousRandomVariable: "pc_5f55e60931935e299996e34826f1a0e9",
  normal: "pc_23858effd2dd68284bd0c6b645607386",
  expectation: "pc_d9a0d8a8f6fc271c56cb2d9dde6576ec",
  variance: "pc_8d0a38a8e8f86cd83ae1f091a62f2cad",
  sampling: "pc_14be091db45947021ec317ac23ac5401",
  centralLimit: "pc_2e9fda1932139d389e99613d454f355c",
  estimation: "pc_327828115364d07966390e1866528270",
  hypothesis: "pc_5e8204fe2f43100f3de7f78a5824d321",
  sampleCorrelation: "pc_629b0c54807299e247ddd77ea5076dd6",
  linearRegression: "pc_ed18cde6c3d7e08e9e371061418a7424",
  regressionLimits: "pc_85acd13e8f4afec2979a3288f911c926",
  linearise: "pc_1ea1ea6ee0e270c4aad9c97a380db664",
};

const pageBySection = {
  "GC": "PDF p.4, Use of a Graphing Calculator",
  "1.1": "PDF p.6, sub-topic 1.1 Functions",
  "1.2": "PDF p.6, sub-topic 1.2 Graphs and transformations",
  "1.3": "PDF p.7, sub-topic 1.3 Equations and inequalities",
  "2.1": "PDF p.7, sub-topic 2.1 Sequences and series",
  "3.1": "PDF p.7, sub-topic 3.1 Basic properties of vectors",
  "3.2": "PDF p.8, sub-topic 3.2 Scalar and vector products",
  "3.3": "PDF p.8, sub-topic 3.3 Three-dimensional vector geometry",
  "4.1": "PDF p.8, sub-topic 4.1 Complex numbers in cartesian form and Argand diagrams",
  "5.1": "PDF p.9, sub-topic 5.1 Differentiation",
  "5.2": "PDF p.9, sub-topic 5.2 Maclaurin series",
  "5.3": "PDF p.10, sub-topic 5.3 Integration techniques",
  "5.4": "PDF p.10, sub-topic 5.4 Definite integrals",
  "5.5": "PDF p.10, sub-topic 5.5 Differential equations",
  "6.1": "PDF p.11, sub-topic 6.1 Probability",
  "6.2": "PDF p.11, sub-topic 6.2 Discrete random variables",
  "6.3": "PDF p.12, sub-topic 6.3 Normal distribution",
  "6.4": "PDF p.12, sub-topic 6.4 Sampling",
  "6.5": "PDF p.13, sub-topic 6.5 Hypothesis testing",
  "6.6": "PDF p.13, sub-topic 6.6 Correlation and linear regression",
};

const outcomes = [];
function add(section, key, title, titleZh, summaryZh, canonicalIds, coverage, rationaleZh, options = {}) {
  const index = outcomes.filter((outcome) => outcome.section === section).length + 1;
  outcomes.push({
    section,
    key,
    code: `${section}.${String(index).padStart(2, "0")}`,
    title,
    titleZh,
    summaryZh,
    canonicalIds,
    coverage,
    rationaleZh,
    requirementType: options.requirementType ?? "skill",
    cognitive: options.cognitive ?? ["understand", "apply"],
    gapAction: options.gapAction,
  });
}

add("GC", "gc_evidence_limitations", "Graphing-calculator evidence and limitations", "图形计算器证据与局限", "正确使用获准图形计算器，识别精度和显示限制，并在题目要求时提交数学步骤或图像草图。", [], "excluded", "这是贯穿课程的工具使用和作答证据要求，应进入教学与评测知识层。", { requirementType: "practice", cognitive: ["apply", "evaluate", "communicate"], gapAction: "not_knowledge_concept" });

add("1.1", "function_domain_range", "Function, domain and range", "函数、定义域与值域", "理解函数、定义域和值域，并能在给定表示中确定它们。", [C.function], "full", "现有函数 canonical 概念直接覆盖定义域、值域与映射。", { requirementType: "knowledge" });
add("1.1", "inverse_existence_restriction", "Inverse existence and domain restriction", "反函数存在条件与定义域限制", "判断反函数是否存在，必要时限制定义域，并联系一一函数与反函数图像。", [C.function], "partial", "现有概念覆盖反函数，但没有独立诊断定义域限制和图像关系。", { cognitive: ["analyze", "reason"] });
add("1.1", "composite_conditions", "Composite functions and existence conditions", "复合函数及存在条件", "构造复合函数并依据定义域和值域判断复合是否有定义。", [C.composite], "full", "现有复合函数概念包含运算次序和定义域条件。", { cognitive: ["apply", "reason"] });

add("1.2", "standard_graph_characteristics", "Characteristics of standard graphs", "常见函数图像特征", "识别指定函数及圆锥曲线图像的对称性、截距、转折点和渐近线。", [C.quadratic, C.ellipse, C.parabola, C.hyperbola, C.straightLine], "partial", "已有多个函数和圆锥曲线概念，但缺少有理函数图像及统一的图像特征诊断。", { cognitive: ["analyze", "reason"] });
add("1.2", "graphing_function_technology", "Graphing functions with technology", "使用图形技术绘制函数", "使用图形计算器或绘图软件绘制给定函数，并保留能支持结论的图像信息。", [], "excluded", "这是图形技术操作及作答证据，不应写成学科概念掌握度。", { requirementType: "practice", cognitive: ["apply", "communicate"], gapAction: "not_knowledge_concept" });
add("1.2", "graph_transformations", "Graph transformations", "函数图像变换", "对 y=f(x) 应用平移、伸缩、反射及其组合，并解释参数影响。", [C.graphTransform], "full", "现有图像变换概念与官方变换范围一致。", { cognitive: ["apply", "analyze"] });
add("1.2", "related_function_graphs", "Related graphs and inverse relation", "相关函数图像与反函数关系", "由 y=f(x) 推出 y=|f(x)|、y=f(|x|) 及反函数关系图像。", [C.graphTransform, C.modulus, C.function], "full", "图像变换、绝对值和反函数概念组合覆盖该结果。", { cognitive: ["apply", "analyze"] });
add("1.2", "parametric_graphs", "Simple parametric equations and graphs", "简单参数方程与图像", "解释简单参数方程并画出或识别其平面曲线图像。", [], "unmapped", "现有参数曲线概念面向三维向量值函数，不能直接替代本课程的简单平面参数图像。", { gapAction: "add_concept" });

add("1.3", "formulate_equations", "Formulating equations and inequalities", "从情境建立方程与不等式", "从问题情境建立方程、线性方程组或不等式并解释变量约束。", [C.simultaneous, C.inequality], "partial", "已有求解概念，但从情境建模和解的适用范围未被独立覆盖。", { cognitive: ["model", "reason"] });
add("1.3", "gc_equation_solving", "Equation solving with graphing technology", "使用图形技术求解方程与方程组", "用图形计算器或软件精确或近似求解方程与线性方程组，并保留必要数学依据。", [], "excluded", "图形技术操作属于工具使用与评测策略，不应写成学科概念掌握度。", { requirementType: "practice", cognitive: ["apply", "communicate"], gapAction: "not_knowledge_concept" });
add("1.3", "rational_quadratic_inequalities", "Rational and quadratic inequalities", "分式与二次不等式", "用代数或图像方法求解由一次式或二次式组成的分式不等式。", [C.inequality], "partial", "现有不等式概念覆盖一次和二次不等式，但未明确分式符号分析。", { cognitive: ["apply", "reason"] });
add("1.3", "modulus_inequalities", "Modulus equations and inequalities", "绝对值方程与不等式", "理解绝对值并使用等价关系求解绝对值方程和不等式。", [C.modulus], "full", "现有绝对值函数概念直接覆盖图像、方程和不等式。", { cognitive: ["understand", "apply"] });

add("2.1", "sequence_series_representation", "Sequence and series representation", "数列、级数与表示", "理解有限和无限数列与级数，把数列表示为正整数定义域上的函数，并联系通项与部分和。", [C.sequence, C.sequencesSeries], "full", "中国高中数列表示和 MIT 数列级数概念组合覆盖定义与表示。", { requirementType: "knowledge", cognitive: ["understand", "reason"] });
add("2.1", "recurrence_sequences", "Recurrence-generated sequences", "递推数列", "由递推关系生成数列，计算后继项并分析数列行为。", [], "unmapped", "现有 KG 没有可独立诊断的递推数列概念。", { gapAction: "add_concept" });
add("2.1", "recurrence_technology", "Generating recurrence sequences with technology", "使用技术生成递推数列", "使用图形计算器或程序按递推关系生成数列并检查项值。", [], "excluded", "这是工具实践和过程证据，应进入教学与评测知识层。", { requirementType: "practice", cognitive: ["apply", "evaluate"], gapAction: "not_knowledge_concept" });
add("2.1", "series_operations_convergence", "Series operations and convergence", "级数运算与收敛", "完成两个级数的和差，判断收敛并解释无穷和。", [C.sequencesSeries], "partial", "现有概念含数列、级数和收敛，但未覆盖级数和差运算与无穷和。", { cognitive: ["apply", "reason"] });
add("2.1", "arithmetic_series", "Arithmetic sequences and series", "等差数列与级数", "使用等差数列通项和有限项和公式解决问题。", [C.arithmeticSeries], "full", "现有等差级数概念直接覆盖通项与有限和。", { cognitive: ["apply", "model"] });
add("2.1", "geometric_series", "Geometric sequences and infinite series", "等比数列与无穷级数", "使用等比数列通项、有限和、收敛条件与无穷和公式。", [C.geometricSeries], "full", "现有等比级数概念直接覆盖有限与无穷情形。", { cognitive: ["apply", "reason"] });

add("3.1", "vector_operations_geometry", "Vector operations and geometry", "向量运算及几何解释", "在二维和三维中完成向量加减与数乘，并解释其几何意义。", [C.vectorBasics], "partial", "现有向量基础覆盖分量运算，但没有明确向量加减和数乘的几何解释。", { cognitive: ["understand", "apply"] });
add("3.1", "vector_types_magnitude", "Position, displacement and direction vectors", "位置、位移、方向与单位向量", "区分位置、位移和方向向量，计算向量大小、单位向量及两点距离。", [C.vectorBasics, C.vectorMagnitude], "partial", "现有概念覆盖大小、方向和单位向量，但没有独立描述位置向量、位移向量与两点距离的联系。", { cognitive: ["understand", "apply"] });
add("3.1", "collinearity_ratio", "Collinearity and ratio theorem", "共线与向量比例定理", "用向量判断共线，并使用比例定理解决几何分点问题。", [C.vectorBasics], "partial", "向量基础支持共线判断，但没有独立覆盖比例定理和分点应用。", { cognitive: ["apply", "reason"] });

add("3.2", "scalar_cross_products", "Scalar and cross products", "标量积与向量积", "理解标量积、向量积及其性质，并计算夹角和垂直关系。", [C.scalarProduct, C.crossProduct], "full", "既有标量积和 MIT 叉积概念直接覆盖。", { cognitive: ["understand", "apply"] });
add("3.2", "product_geometric_meaning", "Geometric meanings of vector products", "向量积的几何意义", "解释向量在单位方向上的投影及叉积在法向方向和面积上的意义。", [C.vectorProjection, C.crossProduct], "full", "向量投影与叉积概念组合直接覆盖几何意义。", { cognitive: ["understand", "reason"] });

add("3.3", "line_plane_equations", "Equations of lines and planes", "直线与平面方程", "写出三维直线和平面的向量式与直角坐标式。", [C.vectorLines, C.linesPlanes], "full", "现有直线向量方程和 MIT 直线平面概念直接覆盖。", { cognitive: ["apply", "reason"] });
add("3.3", "point_line_plane_distance", "Perpendicular foot and distance", "垂足及点到直线或平面的距离", "求点到直线或平面的垂足和距离。", [C.vectorProjection, C.linesPlanes], "partial", "概念组合提供投影和方程基础，但没有独立覆盖完整距离算法。", { cognitive: ["apply", "reason"] });
add("3.3", "line_plane_angles", "Angles between lines and planes", "直线与平面夹角", "求两直线、线面及两平面之间的夹角。", [C.scalarProduct, C.linesPlanes], "full", "标量积和直线平面表示组合覆盖夹角计算。", { cognitive: ["apply", "reason"] });
add("3.3", "relative_positions_3d", "Relative positions in three dimensions", "三维线面位置关系", "判断两直线、线面或两平面的平行、相交、重合及异面关系。", [C.linesPlanes], "partial", "现有直线和平面概念覆盖表示方法，但没有独立描述共面、异面及各类相对位置判定。", { cognitive: ["analyze", "reason"] });

add("4.1", "complex_extension_roots", "Number-system extension and complex roots", "数系扩充与复二次根", "从实数扩充到复数并求实系数二次方程的复根。", [C.complexIntroduction, C.complexRoots], "partial", "数系扩充已覆盖；既有复数根概念同时捆绑轨迹，范围偏宽。", { cognitive: ["understand", "apply"] });
add("4.1", "complex_mod_arg_conjugate", "Modulus, argument and conjugate in cartesian form", "笛卡尔形式的模、辐角与共轭", "在不使用极形式的前提下求复数的模、主辐角和共轭。", [C.complexArithmetic, C.argand], "partial", "现有概念支持共轭与复平面，但没有严格排除极形式的窄范围概念。", { cognitive: ["understand", "apply"] });
add("4.1", "complex_operations_equality", "Complex operations and equality", "复数四则运算与相等", "在 a+bi 形式完成四则运算，并依据实部和虚部分别相等判断复数相等。", [C.complexArithmetic], "full", "既有复数运算 canonical 直接覆盖 a+bi 四则运算。", { cognitive: ["apply", "reason"] });
add("4.1", "conjugate_polynomial_roots", "Conjugate roots of real polynomials", "实系数多项式的共轭根", "使用实系数多项式的非实根成共轭对性质。", [C.complexRoots], "partial", "既有概念含共轭根，但同时包含超出本课程的复数轨迹。", { cognitive: ["understand", "apply"] });
add("4.1", "argand_representation", "Argand representation", "阿根图表示", "把复数表示为阿根图中的点或向量。", [C.argand], "full", "既有阿根图概念直接覆盖。", { cognitive: ["understand", "apply"] });
add("4.1", "complex_geometric_effects", "Geometric effects of complex operations", "复数运算的几何效果", "在阿根图解释共轭、取负、加减及乘以 i 的几何效果。", [C.argand, C.complexAdditionGeometry], "partial", "现有概念覆盖表示和加减几何意义，但缺少共轭、取负和乘 i 的完整变换集合。", { cognitive: ["analyze", "reason"] });

add("5.1", "derivative_graph_relations", "Derivative signs and graph relations", "导数符号与函数图像关系", "由一阶、二阶导数符号解释函数图像，并联系 f 与 f' 的图像。", [C.curveSketching], "partial", "现有曲线草图概念覆盖导数符号和曲线形态，但没有独立覆盖 f 与 f' 图像间的双向关系。", { cognitive: ["analyze", "reason"] });
add("5.1", "implicit_parametric_differentiation", "Implicit and parametric differentiation", "隐函数与参数函数求导", "对简单隐函数和参数函数求导。", [C.implicitDifferentiation, C.parametricDifferentiation], "full", "两个既有概念分别完整覆盖。", { cognitive: ["apply", "reason"] });
add("5.1", "stationary_point_classification", "Stationary-point classification", "驻点分类", "使用一阶或二阶导数检验分类局部极大、极小和驻点拐点。", [C.stationaryPoints], "full", "既有驻点概念直接覆盖定位与分类。", { cognitive: ["apply", "analyze"] });
add("5.1", "gc_derivative_extrema", "Numerical derivatives and extrema with graphing technology", "用图形技术估计导数与极值", "用图形计算器或软件估计指定点导数并定位极值。", [], "excluded", "这是图形技术操作和评测证据，不应成为独立学科概念。", { requirementType: "practice", cognitive: ["apply", "communicate"], gapAction: "not_knowledge_concept" });
add("5.1", "tangents_normals", "Tangents and normals", "切线与法线", "求显式、隐式或参数曲线的切线与法线。", [C.tangentNormal, C.implicitDifferentiation, C.parametricDifferentiation], "full", "现有切法线及两类求导概念组合覆盖。", { cognitive: ["apply", "reason"] });
add("5.1", "local_optimisation", "Local optimisation", "局部最优化", "建立一元函数并用导数解决局部最大最小实际问题。", [C.derivativeOptimisation], "full", "中国高中导数优化窄概念直接覆盖同一诊断目标。", { cognitive: ["model", "apply"] });
add("5.1", "connected_rates", "Connected rates of change", "相关变化率", "由变量关系建立导数联系并求未知变化率。", [C.relatedRates], "full", "既有相关变化率 canonical 在 A-Level 与 MIT 图中共享。", { cognitive: ["model", "apply"] });

add("5.2", "standard_maclaurin_series", "Standard Maclaurin series", "标准麦克劳林展开", "使用规定函数的标准麦克劳林展开到所需阶数。", [C.taylorSeries], "full", "MIT Taylor/Maclaurin 概念直接覆盖标准展开。", { cognitive: ["remember", "apply"] });
add("5.2", "derive_maclaurin_terms", "Deriving Maclaurin terms", "推导麦克劳林前若干项", "通过重复求导、隐式求导或已知级数推导新展开的前若干项。", [C.taylorSeries, C.implicitDifferentiation], "full", "Taylor 展开与隐式求导组合覆盖指定方法。", { cognitive: ["apply", "reason"] });
add("5.2", "series_convergence_range", "Convergence range of series", "级数收敛范围", "确定标准幂级数适用的 x 范围。", [C.powerSeries], "full", "MIT 幂级数概念直接包含收敛半径和区间。", { cognitive: ["understand", "apply"] });
add("5.2", "series_approximations", "Series and small-angle approximations", "级数近似与小角近似", "把麦克劳林级数作为函数近似，并使用规定的小角近似。", [C.taylorSeries], "partial", "Taylor 概念覆盖函数近似，但没有独立覆盖规定的小角近似集合。", { cognitive: ["apply", "evaluate"] });

add("5.3", "standard_integration_forms", "Standard integration forms", "标准积分形式", "识别并积分规定的幂、指数、三角和有理标准形式。", [C.standardIntegrals], "full", "现有标准函数积分概念直接覆盖。", { cognitive: ["remember", "apply"] });
add("5.3", "given_substitution", "Integration by a given substitution", "给定换元积分", "按给定换元完成不定积分。", [C.substitution], "full", "既有换元积分概念直接覆盖。", { cognitive: ["apply", "reason"] });
add("5.3", "integration_by_parts", "Integration by parts", "分部积分", "使用分部积分处理函数乘积。", [C.integrationParts], "full", "既有分部积分概念直接覆盖。", { cognitive: ["apply", "reason"] });

add("5.4", "riemann_sum_area", "Definite integral as limit and area", "定积分作为和式极限与面积", "理解定积分是和式极限和有向面积。", [C.definiteIntegral], "full", "MIT 定积分概念明确以黎曼和极限定义并解释有向面积。", { requirementType: "knowledge", cognitive: ["understand", "reason"] });
add("5.4", "definite_integral_evaluation", "Evaluation of definite integrals", "定积分计算", "使用原函数和积分上下限解析计算定积分。", [C.definiteArea], "full", "现有定积分与面积概念明确覆盖使用微积分基本定理计算定积分。", { cognitive: ["apply", "evaluate"] });
add("5.4", "definite_integral_technology", "Approximating definite integrals with technology", "使用图形技术近似定积分", "使用图形计算器或绘图软件获得定积分近似值并检查合理性。", [], "excluded", "这是图形技术操作及作答证据，应进入教学与评测知识层。", { requirementType: "practice", cognitive: ["apply", "evaluate"], gapAction: "not_knowledge_concept" });
add("5.4", "bounded_areas", "Areas bounded by curves", "曲线围成面积", "求曲线与坐标轴平行线、直线或另一曲线围成的面积，包括 x 轴下方情形。", [C.definiteArea, C.areaCurves], "full", "A-Level 定积分面积和 MIT 曲线间面积组合完整覆盖。", { cognitive: ["apply", "reason"] });
add("5.4", "volumes_of_revolution", "Volumes of revolution", "旋转体体积", "求绕 x 轴或 y 轴旋转所得立体体积。", [C.volumes], "full", "现有旋转体体积概念直接覆盖。", { cognitive: ["apply", "model"] });

add("5.5", "separable_ode_solutions", "Separable differential-equation solutions", "可分离微分方程通解与特解", "求可分离一阶微分方程的通解和满足初值的特解，包括按给定换元化为可分离形式。", [C.separation], "partial", "分离变量已覆盖，但给定换元降阶范围未单独表示。", { cognitive: ["apply", "reason"] });
add("5.5", "form_differential_equation", "Forming differential equations", "从情境建立微分方程", "把问题情境中的变化率关系表示为微分方程。", [C.formDifferentialEquation], "full", "既有建立微分方程概念直接覆盖。", { cognitive: ["model", "reason"] });
add("5.5", "interpret_ode_solution", "Interpreting differential-equation solutions", "解释微分方程及其解", "在问题情境中解释微分方程、初值和解的含义及限制。", [C.formDifferentialEquation, C.separation], "partial", "现有概念覆盖建立与求解，但未把情境解释作为独立诊断结果。", { cognitive: ["understand", "evaluate"] });

add("6.1", "counting_arrangements", "Counting principles and arrangements", "计数原理与排列组合", "使用加法、乘法原理及排列组合处理直线或圆周排列、重复和限制。", [C.permutations], "partial", "既有排列组合概念覆盖基本计数，但没有明确圆排列、重复和限制的完整范围。", { cognitive: ["apply", "reason"] });
add("6.1", "probability_laws_independence", "Probability laws and event relations", "概率法则与事件关系", "使用概率加法、乘法规则并辨析互斥与独立事件。", [C.probabilityRules], "full", "现有概率法则概念直接覆盖。", { cognitive: ["understand", "apply"] });
add("6.1", "probability_representations", "Probability representations", "概率表格、Venn 图与树图", "使用结果表、Venn 图、树图及排列组合方法组织样本空间并计算概率。", [C.venn, C.conditional, C.probabilityRules, C.permutations], "partial", "现有概念覆盖 Venn 图、树图和排列组合，但没有独立登记结果表与多表示转换。", { cognitive: ["apply", "communicate"] });
add("6.1", "conditional_probability", "Conditional probability", "条件概率", "在简单情形计算条件概率并使用标准公式。", [C.conditional], "full", "既有条件概率概念直接覆盖。", { cognitive: ["apply", "reason"] });

add("6.2", "discrete_distribution_moments", "Discrete distributions, expectation and variance", "离散分布、期望与方差", "构造离散随机变量概率分布并计算期望和方差。", [C.discreteRandomVariable], "full", "既有离散随机变量概念直接覆盖。", { cognitive: ["understand", "apply"] });
add("6.2", "binomial_model_conditions", "Binomial model and suitability", "二项分布模型及适用条件", "识别二项分布并判断固定试验次数、独立性和恒定成功概率等适用条件。", [C.binomial], "full", "既有二项分布概念直接包含模型条件。", { cognitive: ["understand", "analyze"] });
add("6.2", "binomial_mean_variance", "Binomial mean and variance", "二项分布均值与方差", "使用二项分布均值和方差公式解决问题。", [C.binomial], "full", "同一二项分布 canonical 覆盖参数、均值和方差。", { cognitive: ["remember", "apply"] });

add("6.3", "continuous_normal_model", "Continuous variables and normal model", "连续随机变量与正态模型", "理解连续随机变量，并使用均值和方差定义的正态分布作为概率模型。", [C.continuousRandomVariable, C.normal], "full", "两个既有 canonical 概念分别覆盖连续变量和正态模型。", { requirementType: "knowledge", cognitive: ["understand", "apply"] });
add("6.3", "normal_probabilities_parameters", "Normal probabilities and inverse problems", "正态概率与参数反求", "标准化正态变量，利用对称性求概率或由概率反求阈值和参数关系。", [C.normal], "partial", "现有正态分布概念覆盖标准化和正向概率计算，但没有独立覆盖由概率反求阈值或参数关系。", { cognitive: ["apply", "reason"] });
add("6.3", "linear_transform_moments", "Moments of a linear transform", "线性变换的期望与方差", "计算 E(aX+b) 与 Var(aX+b)。", [C.expectation, C.variance], "partial", "期望、方差概念提供基础，但没有独立登记随机变量线性变换法则。", { cognitive: ["apply", "reason"] });
add("6.3", "independent_sum_moments", "Moments of independent linear combinations", "独立随机变量线性组合的期望与方差", "对独立 X、Y 计算 E(aX+bY) 与 Var(aX+bY)。", [C.expectation, C.variance], "partial", "现有概念覆盖期望和方差，但未明确独立线性组合的方差法则。", { cognitive: ["apply", "reason"] });

add("6.4", "population_random_sample", "Population and simple random sample", "总体与简单随机样本", "理解总体、简单随机样本及抽样中的随机性。", [C.sampling], "full", "既有抽样 canonical 明确覆盖总体与样本。", { requirementType: "knowledge", cognitive: ["understand", "reason"] });
add("6.4", "sample_mean_distribution", "Distribution of the sample mean", "样本均值的分布", "把样本均值视为随机变量，使用其期望与方差，并处理正态总体下的精确分布。", [C.sampling, C.normal], "full", "抽样 canonical 和正态分布组合覆盖。", { cognitive: ["understand", "apply"] });
add("6.4", "central_limit_sample_mean", "Central limit theorem for the sample mean", "样本均值的中心极限定理", "在样本量足够大时用中心极限定理近似样本均值分布。", [C.centralLimit, C.sampling], "full", "CLT 与抽样概念组合直接覆盖。", { cognitive: ["apply", "evaluate"] });
add("6.4", "unbiased_sample_estimates", "Unbiased estimates from samples", "样本无偏估计", "由原始或汇总数据计算总体均值和方差的无偏估计。", [C.estimation], "full", "既有统计估计 canonical 直接覆盖无偏均值和方差估计。", { cognitive: ["apply", "reason"] });

add("6.5", "hypothesis_test_concepts", "Hypothesis-test concepts", "假设检验基本概念", "理解原假设、备择假设、检验统计量、临界域、显著性水平和 p 值。", [C.hypothesis], "partial", "既有假设检验概念覆盖原假设、备择假设、检验统计量和显著性水平，但没有明确临界值、临界域与 p 值的完整关系。", { requirementType: "knowledge", cognitive: ["understand", "reason"] });
add("6.5", "one_mean_hypothesis_test", "One-mean hypothesis tests", "总体均值假设检验", "针对已知方差正态总体样本或任意总体大样本建立并执行总体均值检验。", [C.hypothesis, C.sampling, C.normal], "partial", "现有概念提供一般检验、抽样和正态分布基础，但没有独立限定这两类总体均值检验程序。", { cognitive: ["apply", "reason"] });
add("6.5", "one_two_tailed_tests", "One- and two-tailed tests", "单尾与双尾检验", "根据备择假设选择单尾或双尾检验及相应临界域。", [C.hypothesis], "partial", "现有假设检验概念未独立描述单尾、双尾选择与临界域配置。", { cognitive: ["analyze", "reason"] });
add("6.5", "interpret_hypothesis_result", "Interpreting test results", "解释假设检验结论", "在问题语境中解释拒绝或不拒绝原假设的含义，不扩展到大纲排除的错误类型。", [C.hypothesis], "partial", "既有概念覆盖决策，但没有显式限制语境解释和排除项。", { cognitive: ["evaluate", "communicate"] });

add("6.6", "scatter_linear_plausibility", "Scatter diagrams and linear plausibility", "散点图与线性关系判断", "由散点图判断变量间是否存在可信的线性关系。", [C.sampleCorrelation], "partial", "现有样本相关系数概念没有独立覆盖散点图形态和线性关系合理性判断。", { cognitive: ["analyze", "evaluate"] });
add("6.6", "pmcc_interpretation", "Product-moment correlation coefficient", "积矩相关系数解释", "把积矩相关系数解释为线性模型拟合程度，特别解释接近 -1、0、1 的情形。", [C.sampleCorrelation], "partial", "现有样本相关概念覆盖系数及方向强度，但未明确 PMCC 和线性拟合表述。", { cognitive: ["understand", "evaluate"] });
add("6.6", "least_squares_regression", "Least-squares linear regression", "最小二乘线性回归", "使用最小二乘法求二元数据的线性回归方程。", [C.linearRegression], "partial", "机器学习图的线性回归概念覆盖平方误差最小化，但没有独立描述二元样本回归线及其课程计算边界。", { cognitive: ["apply", "reason"] });
add("6.6", "regression_prediction_limits", "Regression prediction and limitations", "回归预测、内插外推与限制", "选择适当回归线进行内插或外推，预测并评价线性模型和相关非因果等限制。", [C.regressionLimits], "full", "中国高中回归预测窄概念直接覆盖相同统计边界。", { cognitive: ["apply", "evaluate"] });
add("6.6", "transform_to_linearity", "Transforming data to linearity", "变量变换实现线性化", "使用平方、倒数或对数变换把关系转化为线性形式。", [C.linearise], "partial", "现有概念只明确对数线性化，未覆盖平方和倒数变换。", { cognitive: ["apply", "analyze"] });

if (outcomes.length !== 80) throw new Error(`Expected 80 H2 mathematics outcomes, got ${outcomes.length}`);

const locatorByOutcome = {
  collinearity_ratio: "PDF p.7, collinearity; PDF p.8, ratio theorem, sub-topic 3.1",
};
const evidence = (outcome) => [{
  source_id: SOURCE_ID,
  locator: locatorByOutcome[outcome.key] ?? pageBySection[outcome.section],
}];
const requirements = outcomes.map((outcome) => ({
  requirement_id: `req_sg_h2_math_9758_2026_o_${outcome.key}`,
  parent_requirement_id: null,
  code: outcome.code,
  title: outcome.title,
  title_zh: outcome.titleZh,
  summary_zh: outcome.summaryZh,
  requirement_type: outcome.requirementType,
  level_id: "h2_9758",
  cognitive_processes: outcome.cognitive,
  evidence_refs: evidence(outcome),
  review_status: "needs_review",
}));

const framework = {
  schema_version: "2.0.0",
  content_version: "0.3.1",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  curriculum_kind: "examination_syllabus",
  title: "Singapore-Cambridge GCE Advanced Level H2 Mathematics 9758 outcome coverage",
  title_zh: "新加坡剑桥 GCE A-Level H2 数学 9758（2026）学习成果级覆盖",
  subject: "Mathematics",
  jurisdiction: "SG",
  education_stage: "pre_university",
  requirement_granularity: "outcome",
  levels: [{ level_id: "h2_9758", label: "H2 Mathematics 9758", label_zh: "H2 数学 9758" }],
  languages: ["en", "zh-CN"],
  source_ids: [SOURCE_ID],
  valid_from: "2026-01-01",
  valid_to: "2026-12-31",
  review_status: "needs_review",
  scope_exclusions: [
    {
      scope: "inverse-composition identities and restricting a domain to obtain a composite function",
      rationale_zh: "官方 1.1 明确排除复合函数逆运算恒等式及为获得复合函数而限制定义域。",
      evidence_refs: [{ source_id: SOURCE_ID, locator: "PDF p.6, sub-topic 1.1 Functions, Exclude" }],
    },
    {
      scope: "triple scalar and vector products",
      rationale_zh: "官方 3.2 明确排除三重标量积与三重向量积。",
      evidence_refs: [{ source_id: SOURCE_ID, locator: "PDF p.8, sub-topic 3.2 Scalar and vector products, Exclude" }],
    },
    {
      scope: "shortest distance and common perpendicular between two skew lines",
      rationale_zh: "官方 3.3 明确排除两异面直线最短距离与公垂线。",
      evidence_refs: [{ source_id: SOURCE_ID, locator: "PDF p.8, sub-topic 3.3 Three-dimensional vector geometry, Exclude" }],
    },
    {
      scope: "complex numbers in polar, modulus-argument or exponential form",
      rationale_zh: "官方 4.1 只要求笛卡尔形式，明确排除极形式、模辐角形式与指数形式。",
      evidence_refs: [{ source_id: SOURCE_ID, locator: "PDF p.8, sub-topic 4.1 Complex numbers, Exclude" }],
    },
    {
      scope: "non-stationary points of inflexion and second derivatives of parametric functions",
      rationale_zh: "官方 5.1 明确排除非驻点拐点和参数函数二阶导数。",
      evidence_refs: [{ source_id: SOURCE_ID, locator: "PDF p.9, sub-topic 5.1 Differentiation, Exclude" }],
    },
    {
      scope: "deriving the general term of a Maclaurin series",
      rationale_zh: "官方 5.2 只要求前若干项和规定展开，明确排除通项推导。",
      evidence_refs: [{ source_id: SOURCE_ID, locator: "PDF p.9, sub-topic 5.2 Maclaurin series, Exclude" }],
    },
    {
      scope: "reduction formulae for integration",
      rationale_zh: "官方 5.3 明确排除积分递推公式。",
      evidence_refs: [{ source_id: SOURCE_ID, locator: "PDF p.10, sub-topic 5.3 Integration techniques, Exclude" }],
    },
    {
      scope: "areas and volumes of revolution for parametrically defined curves",
      rationale_zh: "官方 5.4 明确排除参数曲线围成面积及其绕坐标轴旋转体体积。",
      evidence_refs: [{ source_id: SOURCE_ID, locator: "PDF p.10, sub-topic 5.4 Definite integrals, Exclude" }],
    },
    {
      scope: "cumulative distribution functions of discrete random variables",
      rationale_zh: "官方 6.2 明确排除离散随机变量累积分布函数。",
      evidence_refs: [{ source_id: SOURCE_ID, locator: "PDF p.11, sub-topic 6.2 Discrete random variables, Exclude" }],
    },
    {
      scope: "normal approximation to the binomial distribution",
      rationale_zh: "官方 6.3 明确排除二项分布的正态近似。",
      evidence_refs: [{ source_id: SOURCE_ID, locator: "PDF p.12, sub-topic 6.3 Normal distribution, Exclude" }],
    },
    {
      scope: "Type I and Type II error terminology and tests for differences between two population means",
      rationale_zh: "官方 6.5 明确排除第一类/第二类错误术语与两个总体均值差的检验。",
      evidence_refs: [{ source_id: SOURCE_ID, locator: "PDF p.13, sub-topic 6.5 Hypothesis testing, Exclude" }],
    },
    {
      scope: "derivation of regression formulae, the r-squared regression-coefficient identity, and regression hypothesis tests",
      rationale_zh: "官方 6.6 明确排除回归公式推导、指定回归系数恒等式及回归假设检验。",
      evidence_refs: [{ source_id: SOURCE_ID, locator: "PDF p.13, sub-topic 6.6 Correlation and linear regression, Exclude" }],
    },
  ],
  changelog: [
    { version: "0.1.0", date: "2026-07-18", summary_zh: "建立官方 2026 syllabus 的小节级基线。" },
    { version: "0.2.1", date: "2026-07-18", summary_zh: "复核官方 PDF 页码和小节边界。" },
    { version: "0.3.0", date: TODAY, summary_zh: "按可独立出题诊断粒度拆分 80 项学习成果，并把工具使用要求从知识概念中分离。" },
    { version: "0.3.1", date: TODAY, summary_zh: "第二轮人工复核：把官方 12 组 Exclude 边界结构化写入框架，防止后续课程生成引入超纲内容。" },
  ],
  requirements,
};

const mappings = outcomes.map((outcome) => ({
  mapping_id: `map_sg_h2_math_9758_2026_o_${outcome.key}`,
  requirement_id: `req_sg_h2_math_9758_2026_o_${outcome.key}`,
  canonical_ids: outcome.canonicalIds,
  coverage_status: outcome.coverage,
  relation: ["unmapped", "excluded"].includes(outcome.coverage) ? "not_applicable" : "required",
  mapping_basis: "semantic_inference",
  confidence: outcome.coverage === "full" ? "high" : outcome.coverage === "excluded" ? "high" : "medium",
  rationale_zh: outcome.rationaleZh,
  evidence_refs: evidence(outcome),
  review_status: "needs_review",
}));

const mappingSet = {
  schema_version: "3.0.0",
  content_version: "0.3.0",
  mapping_set_id: "cms_sg_seab_h2_math_9758_2026_outcomes",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Mathematics",
  mapping_scope: "outcome_coverage",
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [
    { version: "0.1.0", date: "2026-07-18", summary_zh: "建立 H2 数学主题级候选映射。" },
    { version: "0.2.1", date: "2026-07-18", summary_zh: "复核主题映射的范围与排除项。" },
    { version: "0.3.0", date: TODAY, summary_zh: "替换为 76 项成果级映射，保守区分 full、partial、unmapped 与工具实践 excluded。" },
  ],
  mappings,
};

const gapCandidates = outcomes
  .filter((outcome) => ["partial", "unmapped"].includes(outcome.coverage))
  .map((outcome) => {
    const action = outcome.gapAction ?? (outcome.coverage === "unmapped" ? "add_concept" : "split_or_narrow_existing");
    return {
      gap_id: `gap_sg_h2_math_9758_2026_o_${outcome.key}`,
      requirement_ids: [`req_sg_h2_math_9758_2026_o_${outcome.key}`],
      action,
      proposed_name: outcome.title,
      proposed_name_zh: outcome.titleZh,
      scope_zh: outcome.summaryZh,
      existing_canonical_ids: outcome.canonicalIds,
      suggested_graph_id: "singapore_h2_mathematics",
      rationale_zh: action === "add_concept"
          ? "统一 KG 没有足以独立诊断该成果的概念，建议新增待审概念。"
          : "已有概念仅覆盖部分范围或捆绑大纲排除内容，需新增窄概念或复用更准确 alias。",
      evidence_refs: evidence(outcome),
      review_status: "needs_review",
    };
  });

const gapSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  gap_set_id: "cgs_sg_seab_h2_math_9758_2026_outcomes",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Mathematics",
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [{ version: "0.1.0", date: TODAY, summary_zh: "成果级反向查重后记录全部 partial 与 unmapped 候选；明确排除项只保留在覆盖矩阵，不作为 KG 缺口。" }],
  candidates: gapCandidates,
};

const practiceDetails = {
  gc_evidence_limitations: {
    instructional_use_zh: "在首次使用图形计算器前明确显示窗口、数值精度、追踪误差与 unsupported answer 规则；要求学习者用草图或数学步骤支撑关键结论。",
    assessment_evidence_zh: "工具输出与题目要求一致；必要步骤、图像草图、精度说明和局限判断齐全，且不会把追踪值误报为精确根。",
  },
  graphing_function_technology: {
    instructional_use_zh: "让学习者先预测定义域、关键点和渐近行为，再设置窗口绘图，并用代数或特征检查图像是否可信。",
    assessment_evidence_zh: "图像窗口合适，关键特征可见；草图标注截距、转折点或渐近线，并能说明图像与函数表达式一致。",
  },
  gc_equation_solving: {
    instructional_use_zh: "把图形交点或零点作为近似求解方法，同时要求学习者记录所绘函数、搜索区间、精度及可能漏根的检查。",
    assessment_evidence_zh: "给出所用图像或方程、全部相关交点或零点、适当精度和必要数学依据；窗口限制不会导致静默漏解。",
  },
  recurrence_technology: {
    instructional_use_zh: "要求学习者先写清初值与递推规则，再用序列模式或程序生成项，并用手算前几项核验索引和实现。",
    assessment_evidence_zh: "初值、递推式、索引范围和生成结果一致；至少有若干手算项或独立检查证明工具配置无偏移。",
  },
  gc_derivative_extrema: {
    instructional_use_zh: "先用图像估计导数或极值位置，再通过局部缩放、数值读数和解析导数进行交叉检查。",
    assessment_evidence_zh: "报告的导数或极值位置有适当精度，并附图像、区间或解析依据；能区分局部极值、端点和显示伪影。",
  },
  definite_integral_technology: {
    instructional_use_zh: "在数值积分前先判断积分号、区间和预期符号或数量级，再用图形技术计算并与面积或解析结果核对。",
    assessment_evidence_zh: "输入的被积函数和上下限正确，近似值精度合理；符号、数量级和必要的面积解释能够相互验证。",
  },
};

const practiceItems = outcomes
  .filter((outcome) => outcome.coverage === "excluded")
  .map((outcome) => {
    const details = practiceDetails[outcome.key];
    if (!details) throw new Error(`Missing practice details for ${outcome.key}`);
    return {
      practice_id: `practice_sg_h2_math_9758_2026_${outcome.key}`,
      requirement_ids: [`req_sg_h2_math_9758_2026_o_${outcome.key}`],
      kind: "assessment_task",
      name: outcome.title,
      name_zh: outcome.titleZh,
      description_zh: outcome.summaryZh,
      ...details,
      evidence_refs: evidence(outcome),
      review_status: "needs_review",
    };
  });

const practiceSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  practice_set_id: "cpk_sg_seab_h2_math_9758_2026",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Mathematics",
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [{ version: "0.1.0", date: TODAY, summary_zh: "将 6 项图形计算器、软件操作和作答证据要求从概念掌握度分流到教学与评测知识层。" }],
  items: practiceItems,
};

const sourceRegistry = JSON.parse(readFileSync(paths.sources, "utf8"));
const source = sourceRegistry.sources.find((candidate) => candidate.source_id === SOURCE_ID);
if (!source) throw new Error(`Missing source ${SOURCE_ID}`);
source.document_url = "https://www.seab.gov.sg/files/A%20Level%20Syllabus%20Sch%20Cddts/2026/9758_y26_sy.pdf";
source.retrieved_at = TODAY;
source.notes_zh = "2026 学校考生官方页面与 SEAB /files PDF 已由内置浏览器复核；isomer-user-content 旧地址现对终端请求返回 403。仓库只保存元数据、页码定位和释义。";

const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
writeJson(paths.framework, framework);
writeJson(paths.mapping, mappingSet);
writeJson(paths.gaps, gapSet);
writeJson(paths.practices, practiceSet);
writeJson(paths.sources, sourceRegistry);

const counts = mappings.reduce((result, mapping) => {
  result[mapping.coverage_status] = (result[mapping.coverage_status] ?? 0) + 1;
  return result;
}, {});
process.stdout.write(`[upgrade-sg-h2-math] ${outcomes.length} outcomes; ${counts.full ?? 0} full, ${counts.partial ?? 0} partial, ${counts.unmapped ?? 0} unmapped, ${counts.excluded ?? 0} excluded; ${gapCandidates.length} gaps; ${practiceItems.length} practices\n`);
