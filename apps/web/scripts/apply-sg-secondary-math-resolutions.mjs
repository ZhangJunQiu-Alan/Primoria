#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const DATA = resolve(ROOT, "data/knowledge-graphs");
const TODAY = "2026-07-19";
const GRAPH_ID = "singapore_secondary_mathematics";
const GAP_PREFIX = "gap_sg_sec_math_2020_";
const LEVELS = [
  "g3_secondary_all", "g3_sec1", "g3_sec2", "g3_sec3_4",
  "g2_secondary_all", "g2_sec1", "g2_sec2", "g2_sec3_4", "g2_sec5_bridge",
];

const paths = {
  gaps: resolve(DATA, "curricula/gaps/pending/sg_moe_secondary_g2_g3_math_2020_outcomes.json"),
  mappings: resolve(DATA, "curricula/mappings/pending/sg_moe_secondary_g2_g3_math_2020.json"),
  resolutions: resolve(DATA, "curricula/resolutions/pending/sg_moe_secondary_g2_g3_math_2020_outcomes.json"),
  graph: resolve(DATA, `source/${GRAPH_ID}.json`),
  registry: resolve(DATA, "governance/concept-registry.json"),
  review: resolve(DATA, "review/pending/curriculum-mapping/cms_sg_moe_secondary_g2_g3_math_2020_outcomes.implementation-review.zh-CN.md"),
};

const SOURCES = {
  moe: "src_sg_moe_secondary_g2_g3_math_2020",
  contemporary: "src_openstax_contemporary_mathematics_2026",
  precalculus: "src_openstax_precalculus_2e_2026",
  statistics: "src_openstax_introductory_statistics_2e_2026",
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
const keyFor = (gapId) => {
  const tail = gapId.replace(GAP_PREFIX, "");
  const level = LEVELS.find((candidate) => tail.startsWith(`${candidate}_`));
  if (!level) throw new Error(`Unknown level in ${gapId}`);
  return tail.slice(level.length + 1);
};
const nodeIdFor = (key) => `sg_sec_math_${key}`;
const canonicalIdFor = (nodeId) => {
  const digest = createHash("sha256").update(`primoria-concept-v1\0${GRAPH_ID}\0${nodeId}`).digest("hex");
  return `pc_${digest.slice(0, 32)}`;
};

const spec = (name, nameZh, description, sourceId, locator) => ({ name, nameZh, description, sourceId, locator });
const SPECS = {
  prime_factorisation: spec("Prime factorisation, common factors and roots", "质因数分解、公因倍数与方根", "Using prime factorisation to determine HCF, LCM, square roots and cube roots where the factorisation method applies.", SOURCES.contemporary, "PDF §3.1 Prime and Composite Numbers, printed pp.128-148"),
  real_number_operations: spec("Real-number operations and order", "实数运算、数轴与大小关系", "Operating with integers, rational and irrational numbers, ordering real numbers on a number line and expressing comparisons with inequality symbols.", SOURCES.contemporary, "PDF §§3.2-3.6 Real Number Systems, printed pp.149-210"),
  approximation_estimation: spec("Rounding, approximation and estimation", "取整、近似与估算", "Rounding to required decimal places or significant figures and using estimation to check the scale and plausibility of a computation.", SOURCES.contemporary, "PDF §3.9 Scientific Notation, printed pp.227-238"),
  ratio: spec("Ratio reasoning and proportional division", "比与按比分配", "Comparing quantities by ratio, connecting ratios to fractions, simplifying equivalent ratios and dividing a quantity in a given ratio.", SOURCES.contemporary, "PDF §5.4 Ratios and Proportions, printed pp.366-375"),
  percentage: spec("Percentage representation, comparison and change", "百分数表示、比较与变化", "Converting percentage forms, comparing quantities, calculating percentage increase or decrease, reverse percentages and percentage points.", SOURCES.contemporary, "PDF §§6.1-6.2 Percent, Discounts, Markups and Sales Tax, printed pp.544-565"),
  scale_proportion: spec("Map scales and direct or inverse proportion", "地图比例尺与正反比例", "Using distance and area scales and distinguishing direct from inverse proportional relationships in problems.", SOURCES.contemporary, "PDF §5.4 Ratios and Proportions, printed pp.366-375"),
  rate_speed: spec("Rate, distance, time and speed", "率、路程、时间与速度", "Relating rate, distance and time, distinguishing constant from average speed and converting compound units.", SOURCES.precalculus, "PDF §1.3 Rates of Change and Behavior of Graphs, printed pp.27-39"),
  personal_finance: spec("Personal and household financial mathematics", "个人与家庭金融数学", "Applying percentages, simple and compound interest, taxes, instalments, utility charges and currency conversion to personal finance decisions.", SOURCES.contemporary, "PDF Chapter 6 Money Management, printed pp.543-706"),
  motion_data_graphs: spec("Distance-time and speed-time graph interpretation", "路程—时间与速度—时间图像", "Interpreting slope, intervals and changing quantities in distance-time and speed-time graphs and relating them to a motion context.", SOURCES.precalculus, "PDF §§1.3 and 2.2, printed pp.27-39 and 189-205"),
  algebra_notation_evaluation: spec("Algebraic notation and substitution", "代数记号与代入求值", "Interpreting standard algebraic notation, using letters for quantities and evaluating expressions or formulae by substitution.", SOURCES.contemporary, "PDF §5.1 Algebraic Expressions, printed pp.334-345"),
  algebra_translation: spec("Translating simple situations into algebraic expressions", "把简单情境表示为代数式", "Choosing variables and translating a simple real-world relationship into an algebraic expression without yet requiring an equation-solving model.", SOURCES.contemporary, "PDF §§5.1-5.2 Algebraic Expressions and Applications, printed pp.334-355"),
  nth_term_patterns: spec("Algebraic nth terms for patterns", "用代数通项表示规律", "Recognising a numerical or visual pattern and expressing its nth term algebraically.", SOURCES.contemporary, "PDF §3.10 Arithmetic Sequences, printed pp.239-245"),
  linear_expressions: spec("Operations on linear expressions", "一次式的运算与化简", "Adding, subtracting, expanding and simplifying linear expressions with integer or fractional coefficients and extracting a common factor.", SOURCES.contemporary, "PDF §5.1 Algebraic Expressions, printed pp.334-345"),
  linear_integer_equations: spec("Linear equations with integer coefficients", "整数系数一元一次方程", "Solving one-variable linear equations with integer coefficients and checking the resulting value.", SOURCES.contemporary, "PDF §5.2 Linear Equations in One Variable, printed pp.346-355"),
  linear_fractional_equations: spec("Linear equations with fractional forms", "含分数形式的一次方程", "Solving linear equations with fractional coefficients and simple fractional equations reducible to a linear equation, while checking denominator restrictions.", SOURCES.precalculus, "PDF §2.1 Linear Functions and §3.7 Rational Functions, printed pp.170-188 and 340-364"),
  algebra_expansion_identities: spec("Expansion and elementary algebraic identities", "代数展开与基本恒等式", "Expanding products of algebraic expressions and using square and difference-of-squares identities in both directions.", SOURCES.precalculus, "PDF §§3.2-3.4 Quadratic and Polynomial Functions, printed pp.255-315"),
  factorisation: spec("Factorising linear and quadratic expressions", "一次式与二次式因式分解", "Factorising by common factors, grouping and quadratic structure, including ax+bx+kay+kby and ax²+bx+c forms.", SOURCES.precalculus, "PDF §§3.2-3.5 Quadratic and Polynomial Functions, printed pp.255-325"),
  formula_rearrangement: spec("Changing the subject and evaluating formulae", "改变公式主项与未知量求值", "Rearranging a formula to isolate a specified variable and determining an unknown quantity from the rearranged or original formula.", SOURCES.contemporary, "PDF §§5.1-5.2 Algebraic Expressions and Linear Equations, printed pp.334-355"),
  algebraic_fractions_multiply_divide: spec("Multiplying and dividing algebraic fractions", "代数分式乘除", "Simplifying, multiplying and dividing algebraic fractions while retaining excluded-value restrictions.", SOURCES.precalculus, "PDF §3.7 Rational Functions, printed pp.340-364"),
  algebraic_fractions_add_subtract: spec("Adding and subtracting algebraic fractions", "代数分式加减", "Finding common denominators and adding or subtracting algebraic fractions with linear or quadratic denominators.", SOURCES.precalculus, "PDF §3.7 Rational Functions, printed pp.340-364"),
  coordinate_relationships: spec("Coordinate representation of two-variable relationships", "二维坐标中的变量关系表示", "Representing ordered pairs and a relationship between two variables in the Cartesian plane before assuming a particular function family.", SOURCES.precalculus, "PDF §§1.1 and 2.2, printed pp.7-21 and 189-205"),
  linear_inequalities: spec("Simple and compound linear inequalities", "简单与联立一元一次不等式", "Solving one-variable linear inequalities, including simultaneous constraints, and representing solution sets on a number line.", SOURCES.contemporary, "PDF §5.3 Linear Inequalities in One Variable, printed pp.356-365"),
  standard_form: spec("Scientific notation with integer powers", "整数次幂标准式", "Writing and operating with A×10^n where n is an integer and 1≤A<10.", SOURCES.contemporary, "PDF §3.9 Scientific Notation, printed pp.227-238"),
  indices: spec("Integer and fractional indices", "整数与分数指数及指数律", "Interpreting positive, zero, negative and fractional indices and applying the laws of indices within their valid domains.", SOURCES.contemporary, "PDF §3.8 Exponents, printed pp.218-226"),
  tangent_gradient: spec("Estimating curve gradient with a tangent", "用切线估计曲线斜率", "Drawing a tangent at a point on a curve and using its rise-over-run to estimate instantaneous gradient.", SOURCES.precalculus, "PDF §1.3 Rates of Change and Behavior of Graphs, printed pp.27-39"),
  quadratic_factorisation_solve: spec("Solving quadratic equations by factorisation", "因式分解法解二次方程", "Writing a quadratic expression as factors, applying the zero-product property and checking candidate roots.", SOURCES.contemporary, "PDF §5.6 Quadratic Equations in One Variable, printed pp.403-426"),
  quadratic_formula_complete_graph: spec("Quadratic formula, completing the square and graphical solution", "公式、配方与图像法解二次方程", "Solving a quadratic equation by the formula, completing the square or graph intersections without adding discriminant classification as a separate requirement.", SOURCES.contemporary, "PDF §5.6 Quadratic Equations in One Variable, printed pp.403-426"),
  fractional_quadratic_equations: spec("Fractional equations reducible to quadratics", "可化为二次方程的分式方程", "Clearing denominators to obtain a quadratic equation and rejecting values that violate the original denominator restrictions.", SOURCES.precalculus, "PDF §§3.7 and 9.3, printed pp.340-364 and 925-936"),
  angle_relationships: spec("Angle types and angle relationships", "角的类型与基本关系", "Using angle types, vertically opposite angles, angles at a point or on a line and angles formed by a transversal of parallel lines.", SOURCES.contemporary, "PDF §10.2 Angles, printed pp.1007-1018"),
  triangle_properties: spec("Triangle properties and classification", "三角形性质与分类", "Classifying triangles and using their side-angle relationships and basic angle properties.", SOURCES.contemporary, "PDF §10.3 Triangles, printed pp.1019-1034"),
  polygon_properties: spec("Quadrilateral and polygon properties", "四边形与多边形性质", "Classifying special quadrilaterals, using symmetry and calculating interior or exterior angle sums of convex polygons.", SOURCES.contemporary, "PDF §10.4 Polygons, Perimeter and Circumference, printed pp.1035-1051"),
  geometric_construction: spec("Instrument-based geometric construction", "几何作图", "Constructing simple figures, perpendicular bisectors and angle bisectors from given data with appropriate geometric instruments.", SOURCES.contemporary, "PDF §§10.1-10.3 Points, Lines, Angles and Triangles, printed pp.994-1034"),
  plane_mensuration: spec("Perimeter and area of composite plane figures", "组合平面图形的周长与面积", "Calculating perimeter and area of parallelograms, trapezia and composite plane figures with consistent units.", SOURCES.contemporary, "PDF §§9.2 and 10.6 Measuring Area, printed pp.952-959 and 1068-1086"),
  congruence_similarity_foundations: spec("Congruence and similarity foundations", "全等与相似基础", "Identifying congruent or similar figures and using equality of corresponding angles and proportionality of corresponding sides.", SOURCES.contemporary, "PDF §§10.3-10.4 Triangles and Polygons, printed pp.1019-1051"),
  congruence_similarity_enlargement: spec("Enlargement, reduction and scale drawings", "放缩与比例作图", "Applying a scale factor to enlarge or reduce a plane figure and interpreting distance or area scale in a drawing.", SOURCES.contemporary, "PDF §§5.4 and 10.3-10.4, printed pp.366-375 and 1019-1051"),
  congruence_similarity_tests: spec("Triangle congruence and similarity tests with scale ratios", "三角形全等相似判定与尺度比", "Selecting valid triangle congruence or similarity criteria and applying squared or cubed scale factors to area and volume ratios.", SOURCES.precalculus, "PDF §8.1-8.2 Non-right Triangles, printed pp.767-805"),
  pythagoras: spec("Pythagoras theorem and its converse", "勾股定理及逆定理", "Using the Pythagorean relation to find a side and its converse to determine whether three side lengths form a right triangle.", SOURCES.contemporary, "PDF §§10.3 and 10.8, printed pp.1019-1034 and 1098-1116"),
  right_triangle_trig: spec("Right-triangle trigonometric ratios", "直角三角形三角比", "Using sine, cosine and tangent of an acute angle to determine unknown sides or angles in a right triangle.", SOURCES.contemporary, "PDF §10.8 Right Triangle Trigonometry, printed pp.1098-1116"),
  circle_chord_tangent: spec("Circle chord and tangent properties", "圆的弦与切线性质", "Using equal-chord, perpendicular-bisector and equal-tangent properties, including the centre line that bisects the angle between tangents.", SOURCES.contemporary, "PDF §§10.1-10.4 Euclidean Geometry Foundations, printed pp.994-1051"),
  circle_angles: spec("Circle angle properties", "圆的角性质", "Applying the angle in a semicircle, tangent-radius perpendicularity, centre-circumference angle relation, same-segment and opposite-segment properties.", SOURCES.contemporary, "PDF §§10.2-10.4 Angles, Triangles and Polygons, printed pp.1007-1051"),
  triangle_trigonometry: spec("Trigonometry for non-right triangles", "任意三角形的三角计算", "Extending sine and cosine to obtuse angles and using triangle area, sine rule and cosine rule for non-right triangles.", SOURCES.precalculus, "PDF §§8.1-8.2 Law of Sines and Law of Cosines, printed pp.767-805"),
  spatial_trigonometry: spec("Trigonometric problems in two and three dimensions", "二维与三维三角问题", "Selecting right- or non-right-triangle methods in multi-step 2D and 3D problems involving elevation, depression and bearings.", SOURCES.precalculus, "PDF §§7.2 and 8.1-8.2, printed pp.713-729 and 767-805"),
  circle_mensuration: spec("Arc length, sector area and segment area", "弧长、扇形面积与弓形面积", "Calculating arc length, sector area and segment area using fractions of a circle or radian measure.", SOURCES.precalculus, "PDF §5.1 Angles, printed pp.507-520"),
  data_collection: spec("Collecting, classifying and tabulating data", "数据收集、分类与制表", "Identifying data sources and variables, collecting observations, classifying values and organising them in a frequency table.", SOURCES.contemporary, "PDF §8.1 Gathering and Organizing Data, printed pp.816-826"),
  statistical_representations: spec("Selecting and interpreting statistical representations", "选择和解释统计表示", "Reading tables, bar charts, pictograms, line graphs and pie charts and selecting a form based on purpose, advantage and limitation.", SOURCES.contemporary, "PDF §8.2 Visualizing Data, printed pp.827-856"),
  misleading_diagrams: spec("Detecting misleading statistical diagrams", "识别误导性统计图", "Explaining how scale, truncated axes, unequal bins, area encoding or omitted context can make a statistical display misleading.", SOURCES.contemporary, "PDF §8.2 Visualizing Data, printed pp.827-856"),
  distribution_diagrams: spec("Dot plots, histograms and stem-and-leaf plots", "点图、直方图与茎叶图", "Constructing or interpreting dot plots, histograms and stem-and-leaf plots and judging which representation preserves needed distribution information.", SOURCES.contemporary, "PDF §8.2 Visualizing Data, printed pp.827-856"),
  central_tendency: spec("Mean, median, mode and grouped mean", "平均数、中位数、众数与分组均值", "Calculating and selecting mean, median or mode for a dataset and estimating the mean from grouped frequency data.", SOURCES.contemporary, "PDF §8.3 Mean, Median and Mode, printed pp.857-872"),
  quartiles_spread: spec("Quartiles, percentiles and measures of spread", "四分位数、百分位数与离散程度", "Determining quartiles and percentiles and using range, interquartile range and standard deviation to describe spread.", SOURCES.statistics, "PDF §§2.2 and 2.5 Measures of Location and Spread, printed pp.77-93 and 99-111"),
  cumulative_box: spec("Cumulative-frequency diagrams and box plots", "累积频数图与箱线图", "Constructing or interpreting cumulative-frequency diagrams and box plots to locate percentiles and compare distributions.", SOURCES.statistics, "PDF §2.4 Box Plots, printed pp.94-98; cumulative-frequency tables in Chapter 1"),
  standard_deviation_compare: spec("Calculating standard deviation and comparing datasets", "计算标准差并比较数据集", "Calculating standard deviation for grouped or ungrouped data and comparing datasets jointly by centre and spread.", SOURCES.contemporary, "PDF §8.4 Range and Standard Deviation, printed pp.873-878"),
  combined_probability: spec("Representing simple combined-event probability", "复合事件概率表示", "Using possibility diagrams, tables or tree diagrams to enumerate simple combined events before applying probability rules.", SOURCES.contemporary, "PDF §§7.4-7.5 Tree Diagrams, Tables, Outcomes and Probability, printed pp.738-762"),
  elementary_matrices: spec("Elementary matrix representation and operations", "初等矩阵表示与运算", "Representing and interpreting information in a matrix and applying scalar multiplication, addition, subtraction and matrix multiplication without requiring inverses.", SOURCES.precalculus, "PDF §9.5 Matrices and Matrix Operations, printed pp.946-960"),
};

const GAP_TO_CONCEPTS = {
  algebra_expansion_identities: ["algebra_expansion_identities"],
  algebra_notation_evaluation: ["algebra_notation_evaluation"],
  algebra_translation: ["algebra_translation"],
  algebraic_fractions_add_subtract: ["algebraic_fractions_add_subtract"],
  algebraic_fractions_multiply_divide: ["algebraic_fractions_multiply_divide"],
  angle_relationships: ["angle_relationships"],
  approximation_estimation: ["approximation_estimation"],
  central_tendency: ["central_tendency"],
  circle_angles: ["circle_angles"],
  circle_chord_tangent: ["circle_chord_tangent"],
  circle_mensuration: ["circle_mensuration"],
  combined_probability: ["combined_probability"],
  compound_linear_inequalities: ["linear_inequalities"],
  congruence_similarity_enlargement: ["congruence_similarity_enlargement"],
  congruence_similarity_foundations: ["congruence_similarity_foundations"],
  congruence_similarity_problems: ["congruence_similarity_foundations"],
  congruence_similarity_tests: ["congruence_similarity_tests"],
  coordinate_relationships: ["coordinate_relationships"],
  cumulative_box: ["cumulative_box"],
  data_collection: ["data_collection"],
  distribution_diagrams: ["distribution_diagrams"],
  elementary_matrices: ["elementary_matrices"],
  bisector_construction: ["geometric_construction"],
  factorisation: ["factorisation"],
  formula_rearrangement: ["formula_rearrangement"],
  fractional_quadratic_equations: ["fractional_quadratic_equations"],
  geometric_construction: ["geometric_construction"],
  grouped_linear_factorisation: ["factorisation"],
  indices: ["indices"],
  linear_expressions: ["linear_expressions"],
  linear_fractional_coefficients: ["linear_expressions"],
  linear_fractional_equations: ["linear_fractional_equations"],
  linear_integer_equations: ["linear_integer_equations"],
  misleading_diagrams: ["misleading_diagrams"],
  motion_data_graphs: ["motion_data_graphs"],
  nth_term_patterns: ["nth_term_patterns"],
  percentage: ["percentage"],
  personal_finance: ["personal_finance"],
  plane_mensuration: ["plane_mensuration"],
  polygon_properties: ["polygon_properties"],
  prime_factorisation: ["prime_factorisation"],
  pythagoras: ["pythagoras"],
  quadratic_factorisation_solve: ["quadratic_factorisation_solve"],
  quadratic_formula_complete_graph: ["quadratic_formula_complete_graph"],
  quadratic_methods: ["quadratic_factorisation_solve", "quadratic_formula_complete_graph"],
  quartiles_spread: ["quartiles_spread"],
  rate_speed: ["rate_speed"],
  ratio: ["ratio"],
  real_number_operations: ["real_number_operations"],
  right_triangle_trig: ["right_triangle_trig"],
  scale_proportion: ["scale_proportion"],
  simple_linear_inequalities: ["linear_inequalities"],
  spatial_trigonometry: ["spatial_trigonometry"],
  standard_deviation_compare: ["standard_deviation_compare"],
  standard_form: ["standard_form"],
  statistical_representations: ["statistical_representations"],
  tangent_gradient: ["tangent_gradient"],
  triangle_properties: ["triangle_properties"],
  triangle_trigonometry: ["triangle_trigonometry"],
};
const REUSE_ONLY = new Set(["solid_mensuration", "vector_representation", "vector_operations"]);
const REUSE_EVIDENCE = {
  solid_mensuration: { source_id: SOURCES.contemporary, locator: "PDF §10.7 Volume and Surface Area, printed pp.1087-1097" },
  vector_representation: { source_id: SOURCES.precalculus, locator: "PDF §8.8 Vectors, printed pp.864-883" },
  vector_operations: { source_id: SOURCES.precalculus, locator: "PDF §8.8 Vectors, printed pp.864-883" },
};

const TOPICS = [
  ["number_structure", "Number structure and approximation", "数的结构与近似", ["prime_factorisation", "real_number_operations", "approximation_estimation"]],
  ["ratio_percentage", "Ratio, percentage and proportion", "比、百分数与比例", ["ratio", "percentage", "scale_proportion"]],
  ["quantitative_contexts", "Rates and quantitative contexts", "率与数量情境", ["rate_speed", "personal_finance", "motion_data_graphs"]],
  ["algebra_language", "Algebraic language and patterns", "代数语言与规律", ["algebra_notation_evaluation", "algebra_translation", "nth_term_patterns"]],
  ["linear_foundations", "Linear expressions and equations", "一次式与一次方程", ["linear_expressions", "linear_integer_equations", "linear_fractional_equations"]],
  ["expansion_factorisation", "Expansion, factorisation and formulae", "展开、因式分解与公式", ["algebra_expansion_identities", "factorisation", "formula_rearrangement"]],
  ["algebraic_fractions", "Algebraic fractions", "代数分式", ["algebraic_fractions_multiply_divide", "algebraic_fractions_add_subtract"]],
  ["representations_constraints", "Representations and constraints", "表示与约束", ["coordinate_relationships", "linear_inequalities", "elementary_matrices"]],
  ["indices_gradient", "Standard form, indices and gradient", "标准式、指数与斜率", ["standard_form", "indices", "tangent_gradient"]],
  ["quadratic_equations", "Quadratic equation methods", "二次方程方法", ["quadratic_factorisation_solve", "quadratic_formula_complete_graph", "fractional_quadratic_equations"]],
  ["elementary_geometry", "Angles, triangles and polygons", "角、三角形与多边形", ["angle_relationships", "triangle_properties", "polygon_properties"]],
  ["construction_similarity", "Construction and similarity", "作图与相似", ["geometric_construction", "congruence_similarity_foundations", "congruence_similarity_enlargement"]],
  ["triangle_reasoning", "Triangle measurement and reasoning", "三角形度量与推理", ["plane_mensuration", "pythagoras", "right_triangle_trig"]],
  ["triangle_similarity_trig", "Triangle similarity and trigonometry", "三角形相似与三角计算", ["congruence_similarity_tests", "triangle_trigonometry", "spatial_trigonometry"]],
  ["circle_geometry", "Circle geometry and measurement", "圆的几何与度量", ["circle_chord_tangent", "circle_angles", "circle_mensuration"]],
  ["data_foundations", "Data collection and representation", "数据收集与表示", ["data_collection", "statistical_representations", "misleading_diagrams"]],
  ["distribution_description", "Describing distributions", "描述数据分布", ["distribution_diagrams", "central_tendency", "quartiles_spread"]],
  ["distribution_probability", "Distribution comparison and probability", "分布比较与概率", ["cumulative_box", "standard_deviation_compare", "combined_probability"]],
];

const EDGES = [
  ["ratio", "scale_proportion", "比例尺和正反比例需要先能解释、化简并按比推理。"],
  ["percentage", "personal_finance", "利息、税费和分期付款的数量关系需要百分数变化基础。"],
  ["rate_speed", "motion_data_graphs", "解释路程—时间和速度—时间图像需要先理解路程、时间、速度与单位。"],
  ["algebra_notation_evaluation", "linear_expressions", "一次式化简依赖对代数记号和代入意义的理解。"],
  ["linear_expressions", "linear_integer_equations", "移项和保持等式需要先能正确展开与合并一次式。"],
  ["linear_integer_equations", "linear_fractional_equations", "含分数形式的一次方程建立在基本一元一次方程求解之上。"],
  ["algebra_expansion_identities", "factorisation", "把恒等式反向用于因式分解需要先能正确展开并识别结构。"],
  ["algebraic_fractions_multiply_divide", "algebraic_fractions_add_subtract", "代数分式通分加减需要先掌握约分、乘除和非零限制。"],
  ["linear_integer_equations", "linear_inequalities", "一元一次不等式求解复用一次方程的等价变形，并增加乘除负数时反向规则。"],
  ["angle_relationships", "triangle_properties", "三角形角关系和分类需要先能识别并计算基本角关系。"],
  ["triangle_properties", "polygon_properties", "四边形与多边形性质建立在三角形分割和角关系之上。"],
  ["congruence_similarity_foundations", "congruence_similarity_tests", "使用判定条件和尺度比前需要理解对应角边及比例关系。"],
  ["pythagoras", "right_triangle_trig", "直角三角形三角计算需要先能识别直角结构并处理边长关系。"],
  ["right_triangle_trig", "triangle_trigonometry", "正弦定理、余弦定理与三角形面积公式建立在正弦余弦比的含义上。"],
  ["triangle_trigonometry", "spatial_trigonometry", "三维和方位问题需要先能在单个任意三角形中选择正确的三角方法。"],
  ["statistical_representations", "misleading_diagrams", "识别误导性图表需要先理解各统计表示的正常编码与用途。"],
  ["quartiles_spread", "cumulative_box", "累积频数图和箱线图依赖四分位数、百分位数与四分位距。"],
  ["central_tendency", "standard_deviation_compare", "联合比较中心与离散程度需要先会计算并选择集中趋势指标。"],
];

const gaps = readJson(paths.gaps);
const mappings = readJson(paths.mappings);
const registry = readJson(paths.registry);
const gapKeys = unique(gaps.candidates.map((candidate) => keyFor(candidate.gap_id)));
const missingGapRules = gapKeys.filter((key) => !GAP_TO_CONCEPTS[key] && !REUSE_ONLY.has(key));
const unusedGapRules = Object.keys(GAP_TO_CONCEPTS).filter((key) => !gapKeys.includes(key));
if (missingGapRules.length || unusedGapRules.length) {
  throw new Error(`Gap rule mismatch; missing=${missingGapRules.join(",")}; unused=${unusedGapRules.join(",")}`);
}

const usedSpecKeys = unique(Object.values(GAP_TO_CONCEPTS).flat());
const missingSpecs = usedSpecKeys.filter((key) => !SPECS[key]);
const unusedSpecs = Object.keys(SPECS).filter((key) => !usedSpecKeys.includes(key));
if (missingSpecs.length || unusedSpecs.length) {
  throw new Error(`Concept spec mismatch; missing=${missingSpecs.join(",")}; unused=${unusedSpecs.join(",")}`);
}

const candidatesByConcept = new Map(usedSpecKeys.map((key) => [key, []]));
for (const candidate of gaps.candidates) {
  for (const conceptKey of GAP_TO_CONCEPTS[keyFor(candidate.gap_id)] ?? []) {
    candidatesByConcept.get(conceptKey).push(candidate);
  }
}

const createdNodes = usedSpecKeys.map((key) => {
  const details = SPECS[key];
  const nodeId = nodeIdFor(key);
  return {
    id: nodeId,
    canonical_id: canonicalIdFor(nodeId),
    kind: "concept",
    name: details.name,
    name_zh: details.nameZh,
    topic: null,
    description: details.description,
    default_order: 0,
    evidence_refs: uniqueEvidence([
      ...candidatesByConcept.get(key).flatMap((candidate) => candidate.evidence_refs),
      { source_id: details.sourceId, locator: details.locator },
    ]),
    review_status: "needs_review",
  };
});
const nodeByKey = new Map(createdNodes.map((node) => [node.id.replace(/^sg_sec_math_/, ""), node]));

const grouped = new Set();
const topics = TOPICS.map(([topicKey, name, nameZh, keys], topicIndex) => {
  if (keys.length < 2 || keys.length > 3) throw new Error(`Topic ${topicKey} must contain 2-3 concepts`);
  const concepts = keys.map((key, conceptIndex) => {
    const node = nodeByKey.get(key);
    if (!node) throw new Error(`Topic ${topicKey} references missing concept ${key}`);
    if (grouped.has(key)) throw new Error(`Concept ${key} appears in multiple topics`);
    grouped.add(key);
    node.topic = `sg_sec_math_topic_${topicKey}`;
    node.default_order = conceptIndex + 1;
    return node;
  });
  return {
    id: `sg_sec_math_topic_${topicKey}`,
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
  throw new Error(`Ungrouped concepts: ${[...nodeByKey.keys()].filter((key) => !grouped.has(key)).join(",")}`);
}

const edges = EDGES.map(([fromKey, toKey, reason]) => {
  const from = nodeByKey.get(fromKey);
  const to = nodeByKey.get(toKey);
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
  subject: "Mathematics",
  jurisdictions: ["SG"],
  source_ids: unique(createdNodes.flatMap((node) => node.evidence_refs.map((ref) => ref.source_id))),
  review_status: "needs_review",
  changelog: [{
    version: "0.1.0",
    date: TODAY,
    summary_zh: `根据 MOE G2/G3 逐成果覆盖审查建立 ${createdNodes.length} 个去重后的最小可诊断概念；每个概念同时保留官方 syllabus 与开放教材证据。`,
  }],
  nodes: [...topics, ...createdNodes],
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
  const key = keyFor(candidate.gap_id);
  const conceptKeys = GAP_TO_CONCEPTS[key] ?? [];
  const nodes = conceptKeys.map((conceptKey) => nodeByKey.get(conceptKey));
  const reuseOnly = REUSE_ONLY.has(key);
  const canonicalIds = reuseOnly ? candidate.existing_canonical_ids : nodes.map((node) => node.canonical_id);
  const refs = uniqueEvidence([
    ...candidate.evidence_refs,
    ...(reuseOnly ? [REUSE_EVIDENCE[key]] : []),
    ...nodes.flatMap((node) => node.evidence_refs.filter((ref) => ref.source_id !== SOURCES.moe)),
  ]);
  const resolution = {
    gap_id: candidate.gap_id,
    resolution_action: reuseOnly ? "reuse_existing" : "add_or_alias_concepts",
    canonical_ids: unique(canonicalIds),
    created_node_ids: nodes.map((node) => node.id),
    practice_ids: [],
    rationale_zh: reuseOnly
      ? "第二轮逐定义复核确认，现有 canonical 组合已经完整覆盖该成果；原先 partial 是主题级保守判定，不需要复制新节点。"
      : `跨 G2/G3 去重后，以 ${nodes.map((node) => node.name_zh).join("、")} 的最小诊断边界解析；不同年级条目共享 canonical ID，但各自保留官方页码证据。`,
    evidence_refs: refs,
    review_status: "needs_review",
  };
  if (!resolution.canonical_ids.length) throw new Error(`Resolution has no canonical ID: ${candidate.gap_id}`);
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
    mapping.rationale_zh = `经跨层级反向查重与第二轮粒度复核，现由 ${resolution.canonical_ids.join("、")} 完整覆盖；新增节点仍为 needs_review。`;
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
  summary_zh: `应用 ${resolutions.length} 项缺口解析并去重为 ${createdNodes.length} 个概念；学科成果闭合为 full，10 项计算器与建模实践继续保持 excluded。`,
});

const resolutionSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  resolution_set_id: "cgr_sg_moe_secondary_g2_g3_math_2020_outcomes",
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
    summary_zh: `完成 ${resolutions.length} 项 G2/G3 数学缺口的跨层级查重、${createdNodes.length} 个概念新增或 alias 解析及双类证据登记。`,
  }],
  resolutions,
};

const targets = new Set(edges.map((edge) => edge.to));
const roots = createdNodes.filter((node) => !targets.has(node.id));
const reviewLines = [
  "# 新加坡 G2/G3 中学数学 KG 缺口实施与第二轮复核（中文）",
  "",
  `- 复核日期：${TODAY}`,
  `- 官方成果与实践：${mappings.mappings.length} 项`,
  `- 完整学科覆盖：${mappings.mappings.filter((mapping) => mapping.coverage_status === "full").length} 项`,
  `- 工具/建模实践分流：${mappings.mappings.filter((mapping) => mapping.coverage_status === "excluded").length} 项`,
  `- 缺口解析：${resolutions.length} 项，跨 G2/G3 去重后新增 ${createdNodes.length} 个 Concept`,
  `- 新图：${topics.length} 个 Topic，${edges.length} 条待审软先修边，${roots.length} 个入口概念`,
  "- 审核状态：全部保持 `needs_review`；本轮是 AI 代行的人工式复核，不写入 human approval。",
  "",
  "## 第二轮复核纠正",
  "",
  "- 删除模板误带入 G3 中三/中四的 G2 代数复习项，并按官方页码区分 G3 和 G2 的二次方程方法。",
  "- 把 G2 中二的方程与不等式、G2 中三/中四的代数复习，以及统计图表条目拆成可独立出题诊断的成果。",
  "- 补入 syllabus 明确要求贯穿四年的个人/家庭金融数学、路程—时间与速度—时间图像应用。",
  "- 补入官方第 32–33 页中五 G3 衔接内容，使用独立 level_id，未错误并入普通 G2 中三/中四。",
  "- 107 个原始 partial/unmapped 条目按语义边界去重为 52 个新增概念；重复出现只共享 canonical ID，不丢失层级和页码证据。",
  "- 棱柱/圆柱/组合体度量与平面向量表示经定义复核后复用现有 canonical 组合，没有重复建点。",
  "- 计算器操作和两套四阶段数学建模流程共 10 项继续留在教学与评测知识层。",
  "- 先修边只保留可解释的学理依赖；课程先后、年级顺序和图外基础未被伪造成图内边。",
  "",
  "## 新增概念抽查清单",
  "",
];
for (const node of createdNodes) {
  reviewLines.push(
    `### ${node.name_zh}`,
    "",
    `- 节点：\`${node.id}\` / \`${node.canonical_id}\``,
    `- 定义：${node.description}`,
    `- 课程证据：${node.evidence_refs.filter((ref) => ref.source_id === SOURCES.moe).map((ref) => ref.locator).join("；")}`,
    `- 第二类证据：${node.evidence_refs.filter((ref) => ref.source_id !== SOURCES.moe).map((ref) => `${ref.locator}（\`${ref.source_id}\`）`).join("；")}`,
    "- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。",
    "",
  );
}

writeJson(paths.graph, graph);
writeJson(paths.registry, registry);
writeJson(paths.mappings, mappings);
writeJson(paths.resolutions, resolutionSet);
mkdirSync(dirname(paths.review), { recursive: true });
writeFileSync(paths.review, `${reviewLines.join("\n")}\n`);

process.stdout.write(`[apply-sg-secondary-math-resolutions] ${resolutions.length} gaps -> ${createdNodes.length} concepts, ${topics.length} topics, ${edges.length} edges; ${roots.length} roots\n`);
