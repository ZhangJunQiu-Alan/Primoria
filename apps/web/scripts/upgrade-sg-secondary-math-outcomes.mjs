#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const TODAY = "2026-07-19";
const SOURCE_ID = "src_sg_moe_secondary_g2_g3_math_2020";
const FRAMEWORK_ID = "cfw_sg_moe_secondary_g2_g3_math_2020_outcomes";
const CURRICULUM_ID = "cur_sg_moe_secondary_g2_g3_math_2020";
const paths = {
  framework: resolve(ROOT, "data/knowledge-graphs/curricula/frameworks/sg_moe_secondary_g2_g3_math_2020.json"),
  mapping: resolve(ROOT, "data/knowledge-graphs/curricula/mappings/pending/sg_moe_secondary_g2_g3_math_2020.json"),
  gaps: resolve(ROOT, "data/knowledge-graphs/curricula/gaps/pending/sg_moe_secondary_g2_g3_math_2020_outcomes.json"),
  practices: resolve(ROOT, "data/knowledge-graphs/pedagogy/practices/sg_moe_secondary_g2_g3_math_2020.json"),
};

const C = {
  integerArithmetic: "pc_441e0e33915669e8b3319f4cd0d57068",
  sequenceLinear: "pc_14f1e53bf48e972800525aa7db57c70e",
  straightLine: "pc_2fd09e919b7e73069c83ce49007f17d2",
  quadratic: "pc_133d40fa0e72c29c5eb6ec7a9852c80c",
  inequalities: "pc_4307437065fb6fce9aa3b4c05e7ed82d",
  inequalityProperties: "pc_aae485f1637bdc81f7067c35dde3bef6",
  simultaneous: "pc_204206c0b72ea40b72d3055124b579af",
  formulateEquations: "pc_2c7c77c12eaf42efced7f2a956e1bb16",
  realExponents: "pc_0d9df5ce33dc2574f492f6528f380ffa",
  powerFunctions: "pc_a36a0e32990824d34dc04d553ec0dc45",
  exponential: "pc_81e5444941a3e64858bae20e97e58cf8",
  setsMembership: "pc_f9729a6d15dc682f677a3ab91f6b39d4",
  setsRelations: "pc_63e1c41b5a34e8ad98170b678d0a1387",
  setsOperations: "pc_a28a2c466a40fba9dbb862c5b26631d7",
  venn: "pc_c1ed59c17771ca7dfcca90c7c55fadc1",
  matrixOperations: "pc_2611e45b4d477c48a6d90293fa4f2784",
  trig: "pc_c756deb603e99d7fbb680d46214248e8",
  circle: "pc_3d12d114d1630b545655de686dae4630",
  radian: "pc_249bb1a239e11b22bde8356cc52a08a0",
  parallelPerpendicular: "pc_2a20781f550c684afa2cda1e4dde847d",
  surfaceVolume: "pc_75a504416c16571e44cc269b50bb6db3",
  vectorBasics: "pc_9ae5f17312ee21050edf3e4bd9b005a2",
  vectorGeometry: "pc_d4b7e2b6e2c8459d849405a8f6fc0b79",
  vectorApplications: "pc_08974dd9a6e44fc3fbcacdb999e75f58",
  dataRepresentation: "pc_9b449c02257babd62cc775a79704c117",
  centralTendency: "pc_35cb6bdf58ea092953596fd77759caf6",
  percentiles: "pc_91a531ff72a480f49160c7fc26db307a",
  probabilityFundamentals: "pc_b8d5720ccf68022f15e24275e67f5ded",
  probabilityRepresentations: "pc_d087f482be941779c1774129f95c83cb",
  probabilityRules: "pc_0c7c408f2fb208ecfb0b6758b1cd4a0a",
  independence: "pc_e49409332f2ff6e17899d2b7d3e6d7fe",
};

const outcomes = [];
function add(level, page, key, title, titleZh, summaryZh, canonicalIds = [], coverage = "unmapped", options = {}) {
  const index = outcomes.filter((outcome) => outcome.level === level).length + 1;
  outcomes.push({
    level,
    page,
    key,
    code: `${level.toUpperCase().replaceAll("_", "·")}·${String(index).padStart(2, "0")}`,
    title,
    titleZh,
    summaryZh,
    canonicalIds,
    coverage,
    requirementType: options.requirementType ?? "skill",
    cognitive: options.cognitive ?? ["understand", "apply"],
    gapAction: options.gapAction,
    rationaleZh: options.rationaleZh,
  });
}

const addModeling = (level, page, streamZh) => {
  add(level, page, "model_formulate", "Formulating a real-world problem", "建立现实问题的数学模型", `在${streamZh}问题中理解条件、作出适当假设与简化，并把现实问题表示为数学模型。`, [], "excluded", { requirementType: "practice", cognitive: ["model", "reason"], gapAction: "not_knowledge_concept" });
  add(level, page, "model_data", "Making sense of real data", "理解并讨论真实数据", `在${streamZh}情境中读取、质疑并讨论图表中的真实数据。`, [], "excluded", { requirementType: "practice", cognitive: ["analyze", "communicate"], gapAction: "not_knowledge_concept" });
  add(level, page, "model_solve", "Selecting methods and solving a model", "选择方法并求解模型", `为${streamZh}模型选择适当概念、技能和工具，完成求解并清楚呈现。`, [], "excluded", { requirementType: "practice", cognitive: ["apply", "model", "communicate"], gapAction: "not_knowledge_concept" });
  add(level, page, "model_interpret", "Interpreting a mathematical solution", "解释和评价模型解", `把数学解放回${streamZh}现实情境，检查合理性、局限和可改进之处。`, [], "excluded", { requirementType: "practice", cognitive: ["analyze", "evaluate", "communicate"], gapAction: "not_knowledge_concept" });
};

add("g3_secondary_all", 13, "personal_finance", "Personal and household finance", "个人与家庭金融数学", "在简单及复利、税费、分期付款、公用事业账单和货币兑换情境中选择并运用数学关系。", [], "unmapped", { cognitive: ["apply", "model"] });
add("g3_secondary_all", 14, "motion_data_graphs", "Distance-time and speed-time graphs", "路程—时间与速度—时间图像", "解释表格、路程—时间图和速度—时间图中的变化关系，并把结论放回交通或运动情境。", [C.straightLine, C.dataRepresentation], "partial", { cognitive: ["analyze", "model", "communicate"] });
addModeling("g3_secondary_all", 14, "G3 四年");

add("g3_sec1", 15, "prime_factorisation", "Prime factorisation, HCF, LCM and roots", "质因数分解、HCF、LCM 与方根", "用质因数分解求最高公因数、最低公倍数、平方根与立方根。", [], "unmapped");
add("g3_sec1", 15, "real_number_operations", "Real-number operations and order", "实数运算、数轴与大小关系", "对负数、整数、有理数和实数进行四则运算，在数轴上表示排序并使用不等号。", [C.integerArithmetic], "partial");
add("g3_sec1", 15, "calculator_computation", "Calculator computation", "计算器数值计算", "正确输入和检查计算器计算，包括显示精度和结果合理性。", [], "excluded", { requirementType: "practice", gapAction: "not_knowledge_concept" });
add("g3_sec1", 15, "approximation_estimation", "Approximation and estimation", "近似、取整与估算", "按小数位或有效数字取整，并估算运算结果。", [], "unmapped");
add("g3_sec1", 15, "ratio", "Ratios with rational quantities", "有理数量的比", "化简含有理数的比并解决比例分配问题。", [], "unmapped");
add("g3_sec1", 15, "percentage", "Percentage comparison and change", "百分数比较与增减", "处理百分数比较、百分比点、反向百分数及超过 100% 的百分数问题。", [], "unmapped");
add("g3_sec1", 15, "rate_speed", "Rate and speed", "率、速度与单位换算", "区分平均率、速度、匀速和平均速度，换算单位并解决实际问题。", [], "unmapped");
add("g3_sec1", 15, "algebra_notation_evaluation", "Algebraic notation and evaluation", "代数记号与代入求值", "用字母表示数，解释代数记号并对代数式和公式代入求值。", [], "unmapped");
add("g3_sec1", 15, "algebra_translation", "Translating situations into algebra", "把简单情境表示为代数式", "把简单现实关系翻译为代数式，并说明各量的意义。", [C.formulateEquations], "partial");
add("g3_sec1", 15, "nth_term_patterns", "Algebraic nth-term patterns", "用通项表示规律", "识别数值或图形规律并写出第 n 项代数式。", [C.sequenceLinear], "partial");
add("g3_sec1", 15, "linear_expressions", "Operations on linear expressions", "一次式的运算与因式提取", "加减、化简含括号的一次式并提取公因式。", [], "unmapped");
add("g3_sec1", 16, "coordinate_relationships", "Coordinates and variable relationships", "坐标与变量关系表示", "用二维笛卡尔坐标和有序数对图表示两个变量的关系。", [C.straightLine], "partial");
add("g3_sec1", 16, "linear_functions_gradient", "Linear functions, graphs and gradient", "一次函数、图像与斜率", "绘制 y=ax+b 的图像，把斜率解释为纵向变化与横向变化之比。", [C.straightLine], "full");
add("g3_sec1", 16, "linear_fractional_equations", "Linear and reducible fractional equations", "一次方程与可化为一次的分式方程", "解一元一次方程和可约为一次方程的简单分式方程。", [], "unmapped");
add("g3_sec1", 16, "formulate_linear_equation", "Formulating a linear equation", "从情境建立一元一次方程", "从问题情境建立一元一次方程并解释解的现实意义。", [C.formulateEquations], "full");
add("g3_sec1", 16, "angle_relationships", "Angle relationships", "基本角与平行线角关系", "识别各类角，并运用对顶角、周角、直线角和平行线截角关系。", [], "unmapped");
add("g3_sec1", 16, "triangle_properties", "Triangle properties", "三角形性质", "使用三角形的边角关系和基本分类性质。", [], "unmapped");
add("g3_sec1", 16, "polygon_properties", "Quadrilaterals and regular polygons", "特殊四边形与正多边形", "分类特殊四边形，使用正多边形的性质、对称性及内外角和。", [], "unmapped");
add("g3_sec1", 16, "geometric_construction", "Geometric construction", "尺规与量角作图", "按给定数据选择圆规、直尺、三角尺和量角器作简单几何图形。", [], "unmapped");
add("g3_sec1", 16, "plane_mensuration", "Area and composite plane figures", "平面图形面积与组合图形", "计算平行四边形、梯形及组合平面图形的周长与面积。", [], "unmapped");
add("g3_sec1", 16, "solid_mensuration", "Prisms, cylinders and composite solids", "棱柱、圆柱与组合体的度量", "计算棱柱、圆柱和组合立体的体积、表面积并换算平方与立方单位。", [C.surfaceVolume], "partial");
add("g3_sec1", 16, "data_collection", "Collecting, classifying and tabulating data", "数据收集、分类与制表", "理解简单数据收集、分类和制表过程。", [], "unmapped");
add("g3_sec1", 16, "statistical_representations", "Reading and choosing statistical representations", "读取和选择统计图表", "分析表格、条形图、象形图、折线图和饼图，并比较各表示的用途与局限。", [C.dataRepresentation], "partial");
add("g3_sec1", 16, "misleading_diagrams", "Misleading statistical diagrams", "误导性统计图", "解释统计图为何可能造成数据误读。", [C.dataRepresentation], "partial");

add("g3_sec2", 17, "scale_proportion", "Map scales and proportion", "地图比例尺与正反比例", "处理距离或面积比例尺，以及正比例与反比例关系。", [], "unmapped");
add("g3_sec2", 17, "algebra_expansion_identities", "Expansion and algebraic identities", "代数展开与恒等式", "展开代数式并使用平方和、平方差等基本恒等式。", [], "unmapped");
add("g3_sec2", 17, "formula_rearrangement", "Changing the subject of a formula", "公式变形与未知量求值", "改变公式主项并求给定公式中的未知量。", [], "unmapped");
add("g3_sec2", 17, "factorisation", "Linear and quadratic factorisation", "一次式与二次式因式分解", "按分组或二次式结构完成因式分解。", [], "unmapped");
add("g3_sec2", 17, "algebraic_fractions_multiply_divide", "Multiplying and dividing algebraic fractions", "代数分式乘除", "对简单代数分式进行乘法和除法。", [], "unmapped");
add("g3_sec2", 17, "algebraic_fractions_add_subtract", "Adding and subtracting algebraic fractions", "代数分式加减", "对含一次或二次分母的代数分式通分并加减。", [], "unmapped");
add("g3_sec2", 17, "quadratic_functions", "Quadratic functions and their graphs", "二次函数及图像性质", "理解一般二次函数图像的开口、最大最小点和对称性。", [C.quadratic], "full");
add("g3_sec2", 17, "simple_linear_inequalities", "Simple linear inequalities", "简单一元一次不等式", "解简单一元一次不等式并在数轴上表示解集。", [C.inequalities, C.inequalityProperties], "partial");
add("g3_sec2", 17, "two_variable_linear_graphs", "Graphs of linear equations in two variables", "二元一次方程图像", "把 ax+by=c 表示为平面直线图像。", [C.straightLine], "full");
add("g3_sec2", 17, "simultaneous_linear_equations", "Simultaneous linear equations", "二元一次联立方程", "用代入、消元和图像方法解二元一次联立方程。", [C.simultaneous], "full");
add("g3_sec2", 17, "quadratic_factorisation_solve", "Solving quadratics by factorisation", "因式分解法解二次方程", "用因式分解法解一元二次方程。", [], "unmapped");
add("g3_sec2", 17, "formulate_pair_linear", "Formulating a pair of linear equations", "从情境建立二元一次方程组", "从问题情境建立二元一次方程组并解释解。", [C.formulateEquations, C.simultaneous], "full");
add("g3_sec2", 18, "congruence_similarity_foundations", "Congruence and similarity foundations", "全等与相似基础", "识别全等和相似图形，使用相似三角形及多边形的对应角边关系。", [], "unmapped");
add("g3_sec2", 18, "congruence_similarity_enlargement", "Enlargement and reduction", "平面图形放大与缩小", "按比例因子放大或缩小平面图形，并解决简单全等相似问题。", [], "unmapped");
add("g3_sec2", 18, "pythagoras", "Pythagoras theorem and converse", "勾股定理及逆定理", "用勾股定理求长度，并由三边判断直角三角形。", [], "unmapped");
add("g3_sec2", 18, "right_triangle_trig", "Trigonometry in right triangles", "直角三角形三角比", "用锐角正弦、余弦和正切求直角三角形的边与角。", [C.trig], "partial");
add("g3_sec2", 18, "curved_solids", "Pyramids, cones and spheres", "棱锥、圆锥与球的度量", "计算棱锥、圆锥和球的体积与表面积。", [C.surfaceVolume], "full");
add("g3_sec2", 18, "distribution_diagrams", "Dot plots, histograms and stem-and-leaf diagrams", "点图、直方图与茎叶图", "分析解释三种分布图，判断表示方法的用途与局限，并说明图表可能造成的误读。", [C.dataRepresentation], "partial");
add("g3_sec2", 18, "central_tendency", "Measures of central tendency", "集中趋势与分组数据均值", "计算和选择平均数、众数、中位数，并计算分组数据平均数。", [C.centralTendency], "partial");
add("g3_sec2", 18, "single_event_probability", "Probability of single events", "单一事件概率", "把概率理解为机会度量，列出简单样本结果并计算单一事件概率。", [C.probabilityFundamentals, C.probabilityRepresentations], "full");

const addUpperSecondary = (level, pages, options = {}) => {
  const includeQuadraticSketch = options.includeQuadraticSketch ?? true;
  const includeAdvancedAlgebra = options.includeAdvancedAlgebra ?? false;
  add(level, pages.number, "standard_form", "Standard form", "标准式", "用 A×10^n 表示和处理数，其中 n 为整数且 1≤A<10。", [], "unmapped");
  add(level, pages.number, "indices", "Indices and their laws", "整数与分数指数及指数律", "使用正、负、零和分数指数及指数律。", [C.realExponents], "partial");
  if (includeQuadraticSketch) add(level, pages.number, "quadratic_sketch", "Sketching quadratic graphs from structured forms", "由结构式草绘二次函数", "由顶点式或因式分解式确定关键点并草绘二次函数。", [C.quadratic], "full");
  add(level, pages.number, "power_graphs", "Power-function graphs", "幂函数图像", "识别和绘制指定整数指数幂函数及不超过三项的简单和。", [C.powerFunctions], "full");
  add(level, pages.number, "exponential_graphs", "Exponential-function graphs", "指数函数图像", "识别和绘制 y=ka^x 型指数函数。", [C.exponential], "full");
  add(level, pages.number, "tangent_gradient", "Estimating curve gradient with a tangent", "用切线估计曲线斜率", "在曲线上作切线并估计指定点的梯度。", [], "unmapped");
  add(level, pages.number, options.includeFactorisation ? "quadratic_methods" : "quadratic_formula_complete_graph", "Solving quadratic equations by standard methods", "用标准方法解二次方程", options.includeFactorisation
    ? "用因式分解、公式、配方法或图像法解一元二次方程。"
    : "用公式、配方法或图像法解一元二次方程；因式分解法已在 G3 中二单独记录。", [], "unmapped");
  add(level, pages.number, "fractional_quadratic_equations", "Fractional equations reducible to quadratics", "可化为二次方程的分式方程", "解可约为二次方程的简单分式方程，并检查分母限制。", [], "unmapped");
  add(level, pages.number, "formulate_quadratic", "Formulating a quadratic equation", "从情境建立一元二次方程", "从问题情境建立一元二次方程并解释有效解。", [C.formulateEquations], "full");
  if (includeAdvancedAlgebra) {
    add(level, pages.number, "grouped_linear_factorisation", "Factorising grouped linear expressions", "分组法分解一次式", "用分组和提取公因式分解 ax+bx+kay+kby 型一次式。", [], "unmapped");
    add(level, pages.number, "algebra_expansion_identities", "Expansion of algebraic expressions", "代数式展开", "展开代数式并使用已有恒等式检查结果。", [], "unmapped");
    add(level, pages.number, "formula_rearrangement", "Changing the subject and evaluating formulae", "公式变形与未知量求值", "改变公式主项并求给定公式中的未知量。", [], "unmapped");
    add(level, pages.number, "algebraic_fractions_add_subtract", "Adding and subtracting algebraic fractions", "代数分式加减", "对含一次或二次分母的代数分式通分并加减。", [], "unmapped");
  }
  add(level, pages.geometry, "congruence_similarity_enlargement", "Scale drawings, enlargement and reduction", "比例作图与平面放缩", "完成比例作图，并按比例因子放大或缩小平面图形。", [], "unmapped");
  add(level, pages.geometry, "bisector_construction", "Perpendicular and angle bisectors", "垂直平分线与角平分线", "使用垂直平分线和角平分线的性质并完成相应作图。", [], "unmapped");
  add(level, pages.geometry, "circle_chord_tangent", "Chord and tangent properties", "圆的弦与切线性质", "使用等弦、弦的垂直平分线及同一点引切线的对称性质。", [C.circle], "partial");
  add(level, pages.geometry, "circle_angles", "Circle angle properties", "圆的角性质", "使用半圆角、圆心角、圆周角、同弓形角和对弓形角关系。", [C.circle], "partial");
  add(level, pages.geometry, "triangle_trigonometry", "Trigonometry for general triangles", "任意三角形的三角计算", "使用钝角正余弦、三角形面积公式、正弦定理和余弦定理。", [C.trig], "partial");
  add(level, pages.geometry, "spatial_trigonometry", "Two- and three-dimensional trigonometric problems", "二维与三维三角问题", "解决含仰角、俯角和方位角的二维或三维问题。", [C.trig], "partial");
  add(level, pages.geometry, "circle_mensuration", "Arc, sector and segment measures", "弧长、扇形与弓形度量", "计算弧长、扇形面积和弓形面积。", [], "unmapped");
  add(level, pages.geometry, "radian_measure", "Radian measure", "弧度制", "在弧度与角度之间换算并用于圆的度量。", [C.radian], "full");
  add(level, pages.geometry, "coordinate_geometry", "Coordinate geometry of straight lines", "直线坐标几何", "由两点求斜率和距离，建立 y=mx+c 并解决坐标几何问题。", [C.straightLine, C.parallelPerpendicular], "full");
  add(level, pages.statistics, "quartiles_spread", "Quartiles, percentiles and spread", "四分位数、百分位数与离散程度", "使用极差、四分位距、标准差、四分位数和百分位数描述分布。", [C.centralTendency, C.percentiles], "partial");
  add(level, pages.statistics, "cumulative_box", "Cumulative-frequency and box plots", "累积频数图与箱线图", "分析解释累积频数图和箱线图并比较表示方式。", [C.dataRepresentation, C.percentiles], "partial");
  add(level, pages.statistics, "standard_deviation_compare", "Calculating and comparing standard deviation", "计算标准差并比较数据集", "计算分组或未分组数据标准差，用平均数和标准差比较两个数据集。", [C.centralTendency], "partial");
  add(level, pages.statistics, "combined_probability", "Combined-event probability representations", "复合事件概率表示", "用可能性图或树状图表示并计算简单复合事件概率。", [C.probabilityRepresentations, C.probabilityRules], "partial");
  add(level, pages.statistics, "probability_laws", "Addition and multiplication laws", "概率加法与乘法法则", "对互斥事件使用加法法则，对独立事件使用乘法法则。", [C.probabilityRules, C.independence], "full");
};

addUpperSecondary("g3_sec3_4", { number: 19, geometry: 20, statistics: 21 });
add("g3_sec3_4", 19, "compound_linear_inequalities", "Compound linear inequalities", "联立一元一次不等式", "解含联立约束的一元一次不等式并在数轴上表示解集。", [C.inequalities, C.inequalityProperties], "partial");
add("g3_sec3_4", 19, "set_language", "Set language and operations", "集合语言与基本运算", "使用元素、子集、全集、空集、补集、并集和交集的标准记号。", [C.setsMembership, C.setsRelations, C.setsOperations], "full");
add("g3_sec3_4", 19, "venn_diagrams", "Venn diagrams", "文氏图", "用文氏图表示两个集合及其并、交和补集。", [C.venn], "full");
add("g3_sec3_4", 19, "elementary_matrices", "Elementary matrix representation and operations", "初等矩阵表示与运算", "用任意阶矩阵表示和解释信息，并完成数乘、加减和矩阵乘法。", [C.matrixOperations], "partial");
add("g3_sec3_4", 20, "congruence_similarity_tests", "Triangle congruence, similarity and scale ratios", "三角形全等相似判定与面积体积比", "判定三角形全等或相似，并使用相似图形面积比和相似立体体积比。", [], "unmapped");
add("g3_sec3_4", 20, "vector_representation", "Plane-vector representation", "平面向量表示", "使用列向量、有向线段、位置向量和模表示平面向量与位移。", [C.vectorBasics], "partial");
add("g3_sec3_4", 20, "vector_operations", "Plane-vector operations", "平面向量运算", "用向量表示平移，并完成平面向量的和、差与数乘。", [C.vectorGeometry], "partial");
add("g3_sec3_4", 20, "vector_geometry", "Geometric problems with vectors", "用向量解决平面几何问题", "把平面向量运算用于几何关系和问题求解。", [C.vectorApplications], "full");

add("g2_secondary_all", 23, "personal_finance", "Personal and household finance", "个人与家庭金融数学", "在简单及复利、税费、分期付款、公用事业账单和货币兑换情境中选择并运用数学关系。", [], "unmapped", { cognitive: ["apply", "model"] });
add("g2_secondary_all", 24, "motion_data_graphs", "Distance-time and speed-time graphs", "路程—时间与速度—时间图像", "解释表格、路程—时间图和速度—时间图中的变化关系，并把结论放回交通或运动情境。", [C.straightLine, C.dataRepresentation], "partial", { cognitive: ["analyze", "model", "communicate"] });
addModeling("g2_secondary_all", 24, "G2 四年");

add("g2_sec1", 25, "prime_factorisation", "Prime factorisation, HCF, LCM and roots", "质因数分解、HCF、LCM 与方根", "用质因数分解求最高公因数、最低公倍数、平方根与立方根。", [], "unmapped");
add("g2_sec1", 25, "real_number_operations", "Real-number operations and order", "实数运算、数轴与大小关系", "对负数、整数、有理数和实数进行四则运算，在数轴上表示排序并使用不等号。", [C.integerArithmetic], "partial");
add("g2_sec1", 25, "calculator_computation", "Calculator computation", "计算器数值计算", "正确输入和检查计算器计算，包括显示精度和结果合理性。", [], "excluded", { requirementType: "practice", gapAction: "not_knowledge_concept" });
add("g2_sec1", 25, "approximation_estimation", "Approximation and estimation", "近似、取整与估算", "按小数位或有效数字取整，并估算运算结果。", [], "unmapped");
add("g2_sec1", 25, "ratio", "Ratio, fractions and division", "比、分数关系与按比分配", "比较数量，联系比与分数，使用等价比、最简比并按比分配。", [], "unmapped");
add("g2_sec1", 25, "percentage", "Percentage forms and change", "百分数表示、比较与增减", "在分数、小数和百分数之间转换，处理百分比变化、百分比点和反向百分数。", [], "unmapped");
add("g2_sec1", 25, "rate_speed", "Distance, time, rate and speed", "路程、时间、率与速度", "联系路程、时间和速度，换算速度单位并解决平均率与速度问题。", [], "unmapped");
add("g2_sec1", 25, "algebra_notation_evaluation", "Algebraic notation and evaluation", "代数记号与代入求值", "用字母表示数，解释代数记号并对代数式和公式代入求值。", [], "unmapped");
add("g2_sec1", 26, "algebra_translation", "Translating situations into algebra", "把简单情境表示为代数式", "把简单现实关系翻译为代数式，并说明各量的意义。", [C.formulateEquations], "partial");
add("g2_sec1", 26, "nth_term_patterns", "Algebraic nth-term patterns", "用通项表示规律", "识别数值或图形规律并写出第 n 项代数式。", [C.sequenceLinear], "partial");
add("g2_sec1", 26, "linear_expressions", "Operations on linear expressions", "一次式的运算与化简", "对整数系数一次式进行加减、去括号和化简。", [], "unmapped");
add("g2_sec1", 26, "linear_integer_equations", "Linear equations with integer coefficients", "整数系数一元一次方程", "解整数系数一元一次方程。", [], "unmapped");
add("g2_sec1", 26, "formulate_linear_equation", "Formulating a linear equation", "从情境建立一元一次方程", "从问题情境建立一元一次方程并解释解。", [C.formulateEquations], "full");
add("g2_sec1", 26, "angle_relationships", "Angle relationships", "基本角与平行线角关系", "识别各类角，并使用对顶角、直线角、周角和平行线截角关系。", [], "unmapped");
add("g2_sec1", 26, "triangle_properties", "Triangle properties", "三角形性质", "使用三角形的边角关系和基本分类性质。", [], "unmapped");
add("g2_sec1", 26, "plane_mensuration", "Area and composite plane figures", "平面图形面积与组合图形", "计算平行四边形、梯形及组合平面图形的周长与面积。", [], "unmapped");
add("g2_sec1", 26, "solid_mensuration", "Prisms, cylinders and composite solids", "棱柱、圆柱与组合体的度量", "计算棱柱、圆柱和组合立体的体积、表面积并换算平方与立方单位。", [C.surfaceVolume], "partial");
add("g2_sec1", 26, "data_collection", "Collecting, classifying and tabulating data", "数据收集、分类与制表", "理解简单数据收集、分类和制表过程。", [], "unmapped");
add("g2_sec1", 26, "statistical_representations", "Reading and choosing statistical representations", "读取和选择统计图表", "分析表格、条形图、象形图、折线图和饼图，并比较不同表示的用途与局限。", [C.dataRepresentation], "partial");
add("g2_sec1", 26, "misleading_diagrams", "Misleading statistical diagrams", "误导性统计图", "解释统计图为何可能造成数据误读。", [C.dataRepresentation], "partial");

add("g2_sec2", 27, "scale_proportion", "Map scales and proportion", "地图比例尺与正反比例", "处理距离或面积比例尺，以及正比例与反比例关系。", [], "unmapped");
add("g2_sec2", 27, "linear_fractional_coefficients", "Linear expressions with fractional coefficients", "分数系数一次式", "化简含分数系数的一次式。", [], "unmapped");
add("g2_sec2", 27, "algebra_expansion_identities", "Expansion and algebraic identities", "代数展开与恒等式", "展开两个一次式，并使用平方和、平方差等基本恒等式。", [], "unmapped");
add("g2_sec2", 27, "factorisation", "Common-factor and quadratic factorisation", "公因式与二次式因式分解", "提取公因式并因式分解 ax²+bx+c 型二次式。", [], "unmapped");
add("g2_sec2", 27, "algebraic_fractions_multiply_divide", "Multiplying and dividing algebraic fractions", "代数分式乘除", "对简单代数分式进行乘法和除法。", [], "unmapped");
add("g2_sec2", 27, "linear_functions_gradient", "Linear functions, graphs and gradient", "一次函数、图像与斜率", "用坐标和有序数对表示关系，绘制 y=ax+b 并解释正负斜率。", [C.straightLine], "full");
add("g2_sec2", 27, "linear_fractional_equations", "Linear and reducible fractional equations", "一次方程与可化为一次的分式方程", "解含分数系数的一元一次方程和可约为一次方程的简单分式方程。", [], "unmapped");
add("g2_sec2", 27, "simple_linear_inequalities", "Simple linear inequalities", "简单一元一次不等式", "解简单一元一次不等式并在数轴上表示解集。", [C.inequalities, C.inequalityProperties], "partial");
add("g2_sec2", 27, "two_variable_linear_graphs", "Graphs of linear equations in two variables", "二元一次方程图像", "把 ax+by=c 表示为平面直线图像。", [C.straightLine], "full");
add("g2_sec2", 27, "simultaneous_linear_equations", "Simultaneous linear equations", "二元一次联立方程", "用代入、消元和图像方法解二元一次联立方程。", [C.simultaneous], "full");
add("g2_sec2", 27, "formulate_linear_systems", "Formulating linear equations and systems", "从情境建立一次方程或方程组", "从问题情境建立一元一次方程或二元一次方程组。", [C.formulateEquations, C.simultaneous], "full");
add("g2_sec2", 28, "polygon_properties", "Quadrilaterals and regular polygons", "特殊四边形与正多边形", "分类特殊四边形，使用正多边形的性质、对称性及内外角和。", [], "unmapped");
add("g2_sec2", 28, "geometric_construction", "Geometric construction", "尺规与量角作图", "按给定数据选择圆规、直尺、三角尺和量角器作简单几何图形。", [], "unmapped");
add("g2_sec2", 28, "congruence_similarity_foundations", "Congruence and similarity foundations", "全等与相似基础", "识别全等和相似图形，使用相似三角形及多边形的对应角边关系。", [], "unmapped");
add("g2_sec2", 28, "pythagoras", "Pythagoras theorem and converse", "勾股定理及逆定理", "用勾股定理求长度，并由三边判断直角三角形。", [], "unmapped");
add("g2_sec2", 28, "curved_solids", "Pyramids, cones and spheres", "棱锥、圆锥与球的度量", "计算棱锥、圆锥和球的体积与表面积。", [C.surfaceVolume], "full");
add("g2_sec2", 28, "distribution_diagrams", "Dot plots, histograms and stem-and-leaf diagrams", "点图、直方图与茎叶图", "分析解释三种分布图并判断表示方法的用途、局限和潜在误导。", [C.dataRepresentation], "partial");
add("g2_sec2", 28, "central_tendency", "Measures of central tendency", "集中趋势与分组数据均值", "计算和选择平均数、众数、中位数，并计算分组数据平均数。", [C.centralTendency], "partial");
add("g2_sec2", 28, "single_event_probability", "Probability of single events", "单一事件概率", "把概率理解为机会度量，列出简单样本结果并计算单一事件概率。", [C.probabilityFundamentals, C.probabilityRepresentations], "full");

addUpperSecondary("g2_sec3_4", { number: 29, geometry: 30, statistics: 31 }, { includeQuadraticSketch: false, includeAdvancedAlgebra: true, includeFactorisation: true });
add("g2_sec3_4", 29, "quadratic_functions", "Quadratic functions and their graphs", "二次函数及图像性质", "理解一般二次函数图像的开口、最大最小点和对称性。", [C.quadratic], "full");
add("g2_sec3_4", 30, "congruence_similarity_problems", "Congruence and similarity problems", "全等与相似问题", "解决使用全等和相似关系的简单问题。", [], "unmapped");
add("g2_sec3_4", 30, "right_triangle_trig", "Trigonometry in right triangles", "直角三角形三角比", "用锐角正弦、余弦和正切求直角三角形的边与角。", [C.trig], "partial");

add("g2_sec5_bridge", 32, "quadratic_sketch", "Sketching quadratic graphs from structured forms", "由结构式草绘二次函数", "由顶点式或因式分解式确定关键点并草绘二次函数。", [C.quadratic], "full");
add("g2_sec5_bridge", 32, "compound_linear_inequalities", "Compound linear inequalities", "联立一元一次不等式", "解含联立约束的一元一次不等式并在数轴上表示解集。", [C.inequalities, C.inequalityProperties], "partial");
add("g2_sec5_bridge", 32, "set_language_venn", "Set language, operations and Venn diagrams", "集合语言、运算与文氏图", "使用集合标准记号、并交补运算和文氏图。", [C.setsMembership, C.setsRelations, C.setsOperations, C.venn], "full");
add("g2_sec5_bridge", 32, "elementary_matrices", "Elementary matrix representation and operations", "初等矩阵表示与运算", "用矩阵表示和解释信息，并完成数乘、加减和矩阵乘法。", [C.matrixOperations], "partial");
add("g2_sec5_bridge", 33, "congruence_similarity_tests", "Triangle congruence, similarity and scale ratios", "三角形全等相似判定与面积体积比", "判定三角形全等或相似，并使用相似图形面积比和相似立体体积比。", [], "unmapped");
add("g2_sec5_bridge", 33, "vector_representation", "Plane-vector representation", "平面向量表示", "使用列向量、有向线段、位置向量和模表示平面向量与位移。", [C.vectorBasics], "partial");
add("g2_sec5_bridge", 33, "vector_operations", "Plane-vector operations", "平面向量运算", "用向量表示平移，并完成平面向量的和、差与数乘。", [C.vectorGeometry], "partial");
add("g2_sec5_bridge", 33, "vector_geometry", "Geometric problems with vectors", "用向量解决平面几何问题", "把平面向量运算用于几何关系和问题求解。", [C.vectorApplications], "full");

const evidence = (outcome) => [{
  source_id: SOURCE_ID,
  locator: `PDF p.${outcome.page}, ${outcome.level.replaceAll("_", " ")}, ${outcome.title}`,
}];

const requirements = outcomes.map((outcome) => ({
  requirement_id: `req_sg_sec_math_2020_${outcome.level}_${outcome.key}`,
  parent_requirement_id: null,
  code: outcome.code,
  title: outcome.title,
  title_zh: outcome.titleZh,
  summary_zh: outcome.summaryZh,
  requirement_type: outcome.requirementType,
  level_id: outcome.level,
  cognitive_processes: outcome.cognitive,
  evidence_refs: evidence(outcome),
  review_status: "needs_review",
}));

const framework = {
  schema_version: "2.0.0",
  content_version: "0.3.0",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  curriculum_kind: "national_syllabus",
  title: "Singapore MOE G2 and G3 Secondary Mathematics outcome coverage",
  title_zh: "新加坡教育部 G2/G3 中学数学（2020 中一批次）学习成果级覆盖",
  subject: "Mathematics",
  jurisdiction: "SG",
  education_stage: "secondary",
  requirement_granularity: "outcome",
  levels: [
    { level_id: "g3_secondary_all", label: "G3 Secondary 1-4", label_zh: "G3 中一至中四贯穿实践" },
    { level_id: "g3_sec1", label: "G3 Secondary 1", label_zh: "G3 中一" },
    { level_id: "g3_sec2", label: "G3 Secondary 2", label_zh: "G3 中二" },
    { level_id: "g3_sec3_4", label: "G3 Secondary 3-4", label_zh: "G3 中三至中四" },
    { level_id: "g2_secondary_all", label: "G2 Secondary 1-4", label_zh: "G2 中一至中四贯穿实践" },
    { level_id: "g2_sec1", label: "G2 Secondary 1", label_zh: "G2 中一" },
    { level_id: "g2_sec2", label: "G2 Secondary 2", label_zh: "G2 中二" },
    { level_id: "g2_sec3_4", label: "G2 Secondary 3-4", label_zh: "G2 中三至中四" },
    { level_id: "g2_sec5_bridge", label: "G3 content for Secondary 5 students taking G2 Mathematics", label_zh: "修读 G2 数学的中五学生所需 G3 衔接内容" },
  ],
  languages: ["en", "zh-CN"],
  source_ids: [SOURCE_ID],
  valid_from: "2020-01-01",
  valid_to: null,
  review_status: "needs_review",
  scope_exclusions: [],
  changelog: [
    { version: "0.1.0", date: "2026-07-18", summary_zh: "建立 G2/G3 年级段与内容领域基线。" },
    { version: "0.2.1", date: "2026-07-18", summary_zh: "第二轮复核主题边界并撤销未经证明的完整覆盖声明。" },
    { version: "0.3.0", date: TODAY, summary_zh: "按可独立出题诊断粒度拆分官方学习成果，补入中五 G3 衔接内容，并分离计算器和数学建模实践。" },
  ],
  requirements,
};

const defaultRationale = {
  full: "现有 canonical 概念与该官方学习成果的知识边界一致；不同 G2/G3 层级保留各自课程证据。",
  partial: "现有 canonical 概念提供直接支撑，但范围更宽或尚未覆盖该成果全部可诊断细节，因此不能声明完整覆盖。",
  unmapped: "统一 KG 中尚无边界足够准确、可独立诊断且不捆绑超范围内容的概念。",
  excluded: "这是工具操作、数学建模或作答过程要求，应进入教学与评测知识层，不写成学科概念掌握度。",
};

const mappings = outcomes.map((outcome) => ({
  mapping_id: `map_sg_sec_math_2020_${outcome.level}_${outcome.key}`,
  requirement_id: `req_sg_sec_math_2020_${outcome.level}_${outcome.key}`,
  canonical_ids: outcome.canonicalIds,
  coverage_status: outcome.coverage,
  relation: ["unmapped", "excluded"].includes(outcome.coverage) ? "not_applicable" : "required",
  mapping_basis: "semantic_inference",
  confidence: ["full", "excluded"].includes(outcome.coverage) ? "high" : outcome.coverage === "partial" ? "medium" : "low",
  rationale_zh: outcome.rationaleZh ?? defaultRationale[outcome.coverage],
  evidence_refs: evidence(outcome),
  review_status: "needs_review",
}));

const mappingSet = {
  schema_version: "3.0.0",
  content_version: "0.3.0",
  mapping_set_id: "cms_sg_moe_secondary_g2_g3_math_2020_outcomes",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Mathematics",
  mapping_scope: "outcome_coverage",
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [
    { version: "0.1.0", date: "2026-07-18", summary_zh: "建立 G2/G3 主题级候选映射。" },
    { version: "0.2.1", date: "2026-07-18", summary_zh: "复核主题映射并清理跨层级和超范围概念。" },
    { version: "0.3.0", date: TODAY, summary_zh: `替换为 ${outcomes.length} 项成果级映射；同一知识要求在不同层级共享 canonical ID，但保留独立课程证据。` },
  ],
  mappings,
};

const gapCandidates = outcomes
  .filter((outcome) => ["partial", "unmapped"].includes(outcome.coverage))
  .map((outcome) => ({
    gap_id: `gap_sg_sec_math_2020_${outcome.level}_${outcome.key}`,
    requirement_ids: [`req_sg_sec_math_2020_${outcome.level}_${outcome.key}`],
    action: outcome.gapAction ?? (outcome.coverage === "unmapped" ? "add_concept" : "split_or_narrow_existing"),
    proposed_name: outcome.title,
    proposed_name_zh: outcome.titleZh,
    scope_zh: outcome.summaryZh,
    existing_canonical_ids: outcome.canonicalIds,
    suggested_graph_id: "singapore_secondary_mathematics",
    rationale_zh: outcome.coverage === "unmapped"
      ? "统一 KG 没有足以独立诊断该成果的概念，建议跨 G2/G3 重复要求去重后新增待审概念。"
      : "已有概念仅覆盖部分范围或边界过宽，需复用更窄 alias 或建立精确的中学层级概念。",
    evidence_refs: evidence(outcome),
    review_status: "needs_review",
  }));

const gapSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  gap_set_id: "cgs_sg_moe_secondary_g2_g3_math_2020_outcomes",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Mathematics",
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [{ version: "0.1.0", date: TODAY, summary_zh: "逐项反向查重后记录 partial 与 unmapped 候选；不同层级的同一知识边界在后续 resolution 中合并。" }],
  candidates: gapCandidates,
};

const practiceItems = outcomes
  .filter((outcome) => outcome.coverage === "excluded")
  .map((outcome) => ({
    practice_id: `practice_sg_sec_math_2020_${outcome.level}_${outcome.key}`,
    requirement_ids: [`req_sg_sec_math_2020_${outcome.level}_${outcome.key}`],
    kind: outcome.key === "calculator_computation" ? "assessment_task" : "modelling_process",
    name: outcome.title,
    name_zh: outcome.titleZh,
    description_zh: outcome.summaryZh,
    instructional_use_zh: outcome.key === "calculator_computation"
      ? "要求学习者先估计数量级，再输入计算器并用逆运算、替代算法或情境范围检查输出。"
      : "在真实问题中明确建模阶段和当前决策，要求记录假设、数据解释、方法选择以及解回到情境后的合理性检查。",
    assessment_evidence_zh: outcome.key === "calculator_computation"
      ? "输入、括号、精度和单位正确；结果通过独立估算或反向检查，且不会把显示值误当无限精确值。"
      : "学习者提交可追踪的假设、数学表示、求解过程与情境解释；结论包含合理性和局限，而非只给数值答案。",
    evidence_refs: evidence(outcome),
    review_status: "needs_review",
  }));

const practiceSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  practice_set_id: "cpk_sg_moe_secondary_g2_g3_math_2020",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Mathematics",
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [{ version: "0.1.0", date: TODAY, summary_zh: `把 ${practiceItems.length} 项计算器和 G2/G3 数学建模过程要求从知识概念分流至教学与评测知识层。` }],
  items: practiceItems,
};

const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
writeJson(paths.framework, framework);
writeJson(paths.mapping, mappingSet);
writeJson(paths.gaps, gapSet);
writeJson(paths.practices, practiceSet);

const counts = mappings.reduce((result, mapping) => {
  result[mapping.coverage_status] = (result[mapping.coverage_status] ?? 0) + 1;
  return result;
}, {});
process.stdout.write(`[upgrade-sg-secondary-math] ${outcomes.length} outcomes; ${counts.full ?? 0} full, ${counts.partial ?? 0} partial, ${counts.unmapped ?? 0} unmapped, ${counts.excluded ?? 0} excluded; ${gapCandidates.length} gaps; ${practiceItems.length} practices\n`);
