#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const DATA = resolve(ROOT, "data/knowledge-graphs");
const TODAY = "2026-07-19";
const GRAPH_ID = "singapore_h2_mathematics";
const GAP_PREFIX = "gap_sg_h2_math_9758_2026_o_";

const paths = {
  gaps: resolve(DATA, "curricula/gaps/pending/sg_seab_h2_math_9758_2026_outcomes.json"),
  mappings: resolve(DATA, "curricula/mappings/pending/sg_seab_h2_math_9758_2026.json"),
  resolutions: resolve(DATA, "curricula/resolutions/pending/sg_seab_h2_math_9758_2026_outcomes.json"),
  graph: resolve(DATA, `source/${GRAPH_ID}.json`),
  registry: resolve(DATA, "governance/concept-registry.json"),
  review: resolve(DATA, "review/pending/curriculum-mapping/cms_sg_seab_h2_math_9758_2026_outcomes.implementation-review.zh-CN.md"),
};

const SOURCES = {
  seab: "src_sg_seab_h2_math_9758_2026",
  precalculus: "src_openstax_precalculus_2e_2026",
  statistics: "src_openstax_introductory_statistics_2e_2026",
  calculus: "src_mit_ocw_18_01sc_fall_2010",
  multivariable: "src_mit_ocw_18_02sc_fall_2010",
  strangComplex: "src_mit_ocw_strang_calculus_ch9_2023",
  berkeleyProbability: "src_berkeley_cs70_summer_2026",
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
const keyFor = (gapId) => gapId.replace(GAP_PREFIX, "");
const nodeIdFor = (key) => `sg_h2_math_${key}`;
const canonicalIdFor = (nodeId) => {
  const digest = createHash("sha256").update(`primoria-concept-v1\0${GRAPH_ID}\0${nodeId}`).digest("hex");
  return `pc_${digest.slice(0, 32)}`;
};

const SPECS = {
  inverse_existence_restriction: [
    "Inverse-function existence and domain restriction",
    "反函数存在条件与定义域限制",
    "Determining whether an inverse exists, restricting a domain to make a function one-to-one, and relating inverse graphs by reflection.",
    SOURCES.precalculus,
    "PDF §1.7 Inverse Functions, printed pp.130-149",
  ],
  standard_graph_characteristics: [
    "Characteristics of standard algebraic graphs",
    "常见代数函数图像特征",
    "Identifying symmetry, intercepts, turning points, asymptotes and value restrictions for the prescribed polynomial, rational and conic graphs.",
    SOURCES.precalculus,
    "PDF §§3.2 and 3.7, printed pp.255-274 and 340-364; §§10.1-10.3, printed pp.1010-1055",
  ],
  parametric_graphs: [
    "Simple parametric equations and plane graphs",
    "简单参数方程与平面图像",
    "Eliminating or varying a parameter to interpret and sketch a plane curve given by simple parametric equations.",
    SOURCES.precalculus,
    "PDF §§8.6-8.7 Parametric Equations and Graphs, printed pp.839-863",
  ],
  formulate_equations: [
    "Formulating equations and inequalities from context",
    "从情境建立方程与不等式",
    "Selecting variables and constraints to translate a problem situation into an equation, linear system or inequality and interpreting admissible solutions.",
    SOURCES.precalculus,
    "PDF §2.3 Modeling with Linear Functions, printed pp.206-219; §§9.1-9.3, printed pp.896-936",
  ],
  rational_quadratic_inequalities: [
    "Rational inequalities with linear and quadratic factors",
    "一次与二次因式构成的分式不等式",
    "Solving rational inequalities whose numerator and denominator contain linear or quadratic expressions by sign analysis or graph reasoning.",
    SOURCES.precalculus,
    "PDF §3.7 Rational Functions, printed pp.340-364; §9.3 Nonlinear Equations and Inequalities, printed pp.925-936",
  ],
  recurrence_sequences: [
    "Recurrence-generated sequences",
    "递推数列",
    "Using initial values and a recurrence relation to generate successive terms and analyse the resulting sequence.",
    SOURCES.precalculus,
    "PDF §11.1 Sequences and Their Notations, printed pp.1089-1103",
  ],
  series_operations_convergence: [
    "Series operations, convergence and infinite sums",
    "级数运算、收敛与无穷和",
    "Adding or subtracting series, distinguishing convergence from divergence, and interpreting a convergent infinite sum.",
    SOURCES.precalculus,
    "PDF §11.4 Series and Their Notations, printed pp.1124-1136",
  ],
  vector_operations_geometry: [
    "Geometric interpretation of vector operations",
    "向量运算的几何解释",
    "Interpreting vector addition, subtraction and scalar multiplication geometrically in two and three dimensions.",
    SOURCES.multivariable,
    "Unit 1 Part A, Sessions 1-4: vectors, dot products, lengths, angles and components",
  ],
  vector_types_magnitude: [
    "Position and displacement vectors with point distance",
    "位置、位移向量与两点距离",
    "Distinguishing position and displacement vectors and connecting their component difference to the distance between two points; magnitude, direction and unit-vector skills remain mapped to the existing canonical concept.",
    SOURCES.multivariable,
    "Unit 1 Part A, Sessions 1-4: vector components, lengths and directions",
  ],
  collinearity_ratio: [
    "Vector collinearity and ratio theorem",
    "向量共线与比例定理",
    "Testing collinearity with vectors and using internal or external division ratios in geometric applications.",
    SOURCES.multivariable,
    "Unit 1 Part A, Sessions 1-4: vector components and geometric vector reasoning",
  ],
  point_line_plane_distance: [
    "Perpendicular feet and point-to-line or plane distance",
    "垂足及点到直线或平面的距离",
    "Finding perpendicular feet and distances from a point to a line or plane using projections and vector equations.",
    SOURCES.multivariable,
    "Unit 1 Sessions 3, 8, 12, 15 and 16: projections, planes, lines and intersections",
  ],
  relative_positions_3d: [
    "Relative positions of lines and planes in three dimensions",
    "三维直线与平面的相对位置",
    "Classifying intersections, parallelism, coincidence, coplanarity and skewness for pairs of lines, a line and plane, or two planes.",
    SOURCES.multivariable,
    "Unit 1 Sessions 8, 12, 15 and 16: equations and intersections of lines and planes",
  ],
  complex_extension_roots: [
    "Non-real roots of real-coefficient quadratic equations",
    "实系数二次方程的非实根",
    "Solving real-coefficient quadratic equations with non-real roots; the number-system extension remains mapped to the existing complex-introduction canonical concept.",
    SOURCES.precalculus,
    "PDF §§3.1 and 3.6 Complex Numbers and Polynomial Zeros, printed pp.245-254 and 326-339",
  ],
  complex_mod_arg_conjugate: [
    "Modulus and principal argument from Cartesian form",
    "由笛卡尔形式求模与主辐角",
    "Finding modulus and principal argument directly from Cartesian form without requiring polar or exponential representation; conjugation remains mapped to the existing complex-arithmetic canonical concept.",
    SOURCES.precalculus,
    "PDF §3.1 Complex Numbers, printed pp.245-254; complex plane, modulus and conjugates",
  ],
  conjugate_polynomial_roots: [
    "Conjugate roots of real-coefficient polynomials",
    "实系数多项式的共轭根",
    "Using the conjugate-root theorem to identify or construct non-real roots of polynomials with real coefficients.",
    SOURCES.precalculus,
    "PDF §3.6 Zeros of Polynomial Functions, printed pp.326-339",
  ],
  complex_geometric_effects: [
    "Geometric effects of Cartesian complex operations",
    "复数运算的几何效果",
    "Interpreting conjugation, negation, addition, subtraction and multiplication by i as transformations in the Argand plane.",
    SOURCES.strangComplex,
    "Chapter 9 §9.4, printed pp.425-426 (PDF pp.14-15): complex operations and vector geometry",
  ],
  derivative_graph_relations: [
    "Relations among a function and its derivative graphs",
    "函数与导函数图像关系",
    "Inferring the sign and qualitative behaviour of first and second derivatives from a function graph and conversely reconstructing function behaviour from derivative graphs.",
    SOURCES.calculus,
    "Unit 2 Part A, Sessions 27-28: curve sketching from first and second derivatives",
  ],
  series_approximations: [
    "Maclaurin and small-angle approximations",
    "麦克劳林与小角近似",
    "Using truncated Maclaurin series as local approximations, including the prescribed small-angle approximations and their range of validity.",
    SOURCES.calculus,
    "Unit 5 Part B, Sessions 98-99: Taylor series and approximation",
  ],
  separable_ode_solutions: [
    "Separable differential equations with initial conditions and substitution",
    "含初值与给定换元的可分离微分方程",
    "Finding general and particular solutions of separable first-order differential equations, including equations reduced to separable form by a given substitution.",
    SOURCES.calculus,
    "Unit 2 Part C, Sessions 39-40: introduction to differential equations and separation of variables",
  ],
  interpret_ode_solution: [
    "Interpreting differential equations and solutions in context",
    "情境中解释微分方程及其解",
    "Interpreting variables, initial conditions, solution behaviour and limitations of a differential-equation model in its problem context.",
    SOURCES.calculus,
    "Unit 2 Part C, Sessions 39-40 and worked examples on differential equations",
  ],
  counting_arrangements: [
    "Restricted, repeated and circular arrangements",
    "受限、重复与圆周排列",
    "Applying addition and multiplication principles, permutations and combinations to linear or circular arrangements with restrictions or repeated objects.",
    SOURCES.precalculus,
    "PDF §11.5 Counting Principles, printed pp.1137-1147",
  ],
  probability_representations: [
    "Probability representations and sample-space conversion",
    "概率表示与样本空间转换",
    "Organising and translating a probability problem among outcome tables, Venn diagrams, tree diagrams and counting representations.",
    SOURCES.precalculus,
    "PDF §11.7 Probability, printed pp.1154-1164",
  ],
  normal_probabilities_parameters: [
    "Normal probabilities and inverse parameter problems",
    "正态概率与参数反求",
    "Using standardisation and symmetry to calculate normal probabilities and solve inverse problems for thresholds, means or standard deviations.",
    SOURCES.statistics,
    "PDF §§6.1-6.2 The Standard Normal Distribution and Using the Normal Distribution, printed pp.336-346",
  ],
  linear_transform_moments: [
    "Expectation and variance under an affine transformation",
    "随机变量线性变换的期望与方差",
    "Applying E(aX+b)=aE(X)+b and Var(aX+b)=a²Var(X) to a transformed random variable.",
    SOURCES.berkeleyProbability,
    "Summer 2026 Notes 16-17: Random Variables I (Distribution and Expectation) and II (Variance and Covariance)",
  ],
  independent_sum_moments: [
    "Moments of independent linear combinations",
    "独立随机变量线性组合的期望与方差",
    "Computing expectation and variance of aX+bY when X and Y are independent, including the absence of a covariance term.",
    SOURCES.berkeleyProbability,
    "Summer 2026 Notes 16-17: Random Variables I (Distribution and Expectation) and II (Variance and Covariance)",
  ],
  hypothesis_test_concepts: [
    "Hypothesis-test concepts, critical regions and p-values",
    "假设检验概念、临界域与 p 值",
    "Relating null and alternative hypotheses, test statistics, critical values and regions, significance levels and p-values.",
    SOURCES.statistics,
    "PDF §§9.1 and 9.4, printed pp.462-463 and 467-468",
  ],
  one_mean_hypothesis_test: [
    "One-sample tests for a population mean",
    "单总体均值假设检验",
    "Formulating and performing a one-sample mean test for a normal population with known variance or a large sample from any population.",
    SOURCES.statistics,
    "PDF §§9.3 and 9.6, printed pp.466 and 483-485",
  ],
  one_two_tailed_tests: [
    "One-tailed and two-tailed hypothesis tests",
    "单尾与双尾假设检验",
    "Selecting a one- or two-tailed test from the alternative hypothesis and allocating the critical region consistently.",
    SOURCES.statistics,
    "PDF §§9.1 and 9.4-9.5, printed pp.462-463 and 467-482",
  ],
  interpret_hypothesis_result: [
    "Interpreting hypothesis-test decisions in context",
    "情境中解释假设检验结论",
    "Expressing reject or do-not-reject decisions in the problem context without claiming proof or introducing excluded error terminology.",
    SOURCES.statistics,
    "PDF §§9.4-9.5 Rare Events, Decision and Full Examples, printed pp.467-482",
  ],
  scatter_linear_plausibility: [
    "Scatter plots and plausibility of a linear relationship",
    "散点图与线性关系合理性",
    "Using the form, direction and anomalies of a scatter plot to judge whether a linear relationship is plausible.",
    SOURCES.statistics,
    "PDF §12.2 Scatter Plots, printed pp.620-622",
  ],
  pmcc_interpretation: [
    "Product-moment correlation coefficient interpretation",
    "积矩相关系数解释",
    "Interpreting a product-moment correlation coefficient as the direction and strength of linear fit, especially near -1, 0 and 1.",
    SOURCES.statistics,
    "PDF §§12.3-12.4 Regression and Correlation, printed pp.623-634",
  ],
  least_squares_regression: [
    "Least-squares regression for bivariate data",
    "二元数据最小二乘回归",
    "Finding and interpreting the least-squares regression line for two variables by minimising the sum of squared residuals.",
    SOURCES.statistics,
    "PDF §12.3 The Regression Equation, printed pp.623-630",
  ],
  transform_to_linearity: [
    "Transforming variables to achieve linearity",
    "变量变换实现线性化",
    "Applying square, reciprocal or logarithmic transformations and fitting a line to determine parameters of a non-linear relationship.",
    SOURCES.precalculus,
    "PDF §§2.4 and 4.7 Fitting and Modeling, printed pp.220-232 and 484-502",
  ],
};

const TOPICS = [
  ["function_graphs", "Functions and graphs", "函数与图像", ["inverse_existence_restriction", "standard_graph_characteristics", "parametric_graphs"]],
  ["algebraic_modelling", "Algebraic modelling and inequalities", "代数建模与不等式", ["formulate_equations", "rational_quadratic_inequalities"]],
  ["sequences_series", "Sequences and series", "数列与级数", ["recurrence_sequences", "series_operations_convergence"]],
  ["vector_foundations", "Vector foundations and geometry", "向量基础与几何", ["vector_types_magnitude", "vector_operations_geometry", "collinearity_ratio"]],
  ["vector_geometry_3d", "Three-dimensional vector geometry", "三维向量几何", ["point_line_plane_distance", "relative_positions_3d"]],
  ["complex_foundations", "Complex number foundations", "复数基础", ["complex_extension_roots", "complex_mod_arg_conjugate"]],
  ["complex_roots_geometry", "Complex roots and geometry", "复数根与几何", ["conjugate_polynomial_roots", "complex_geometric_effects"]],
  ["calculus_approximations", "Calculus graphs and approximations", "微积分图像与近似", ["derivative_graph_relations", "series_approximations"]],
  ["differential_equations", "Differential equations", "微分方程", ["separable_ode_solutions", "interpret_ode_solution"]],
  ["counting_probability", "Counting and probability representations", "计数与概率表示", ["counting_arrangements", "probability_representations"]],
  ["normal_moments", "Normal distributions and moments", "正态分布与矩", ["normal_probabilities_parameters", "linear_transform_moments", "independent_sum_moments"]],
  ["hypothesis_testing", "Hypothesis testing", "假设检验", ["hypothesis_test_concepts", "one_two_tailed_tests", "one_mean_hypothesis_test"]],
  ["statistical_interpretation", "Statistical evidence interpretation", "统计证据解释", ["interpret_hypothesis_result", "scatter_linear_plausibility", "pmcc_interpretation"]],
  ["regression", "Regression and linearisation", "回归与线性化", ["least_squares_regression", "transform_to_linearity"]],
];

const EDGES = [
  ["vector_operations_geometry", "collinearity_ratio", "向量共线与分点计算建立在加减和数乘的几何解释之上。"],
  ["vector_operations_geometry", "point_line_plane_distance", "投影和距离算法需要能正确组合与缩放向量。"],
  ["complex_extension_roots", "conjugate_polynomial_roots", "使用实系数多项式共轭根定理前，需要先能求二次方程的非实根并识别共轭对。"],
  ["separable_ode_solutions", "interpret_ode_solution", "解释微分方程解的情境含义需要先能求出通解和满足初值的特解。"],
  ["counting_arrangements", "probability_representations", "使用排列组合构造概率表示需要先能准确计数受限样本空间。"],
  ["normal_probabilities_parameters", "one_mean_hypothesis_test", "已知方差总体均值检验需要先能进行正态标准化和反向概率判断。"],
  ["linear_transform_moments", "independent_sum_moments", "计算独立随机变量线性组合的矩需要先掌握单个随机变量仿射变换的期望与方差法则。"],
  ["hypothesis_test_concepts", "one_two_tailed_tests", "选择检验尾部和临界域需要先理解假设、显著性水平与 p 值。"],
  ["one_two_tailed_tests", "one_mean_hypothesis_test", "执行总体均值检验前需要依据备择假设确定单尾或双尾程序。"],
  ["one_mean_hypothesis_test", "interpret_hypothesis_result", "解释检验结论需要先正确完成检验并得到拒绝或不拒绝决策。"],
  ["scatter_linear_plausibility", "pmcc_interpretation", "解释相关系数前应先确认散点图中线性关系是否合理。"],
  ["least_squares_regression", "transform_to_linearity", "用变量变换实现线性化后拟合参数，需要先理解最小二乘回归线。"],
];

const gaps = readJson(paths.gaps);
const mappings = readJson(paths.mappings);
const registry = readJson(paths.registry);

if (gaps.candidates.length !== 33) throw new Error(`Expected 33 H2 mathematics gaps, got ${gaps.candidates.length}`);
const gapKeys = gaps.candidates.map((candidate) => keyFor(candidate.gap_id));
const missingSpecs = gapKeys.filter((key) => !SPECS[key]);
const unusedSpecs = Object.keys(SPECS).filter((key) => !gapKeys.includes(key));
if (missingSpecs.length || unusedSpecs.length) {
  throw new Error(`Resolution spec mismatch; missing=${missingSpecs.join(",")}; unused=${unusedSpecs.join(",")}`);
}

const createdNodes = [];
const resolutions = [];
const resolutionByGap = new Map();
for (const candidate of gaps.candidates) {
  const key = keyFor(candidate.gap_id);
  const [name, nameZh, description, sourceId, locator] = SPECS[key];
  const nodeId = nodeIdFor(key);
  const canonicalId = canonicalIdFor(nodeId);
  const refs = uniqueEvidence([...candidate.evidence_refs, { source_id: sourceId, locator }]);
  createdNodes.push({
    id: nodeId,
    canonical_id: canonicalId,
    kind: "concept",
    name,
    name_zh: nameZh,
    topic: null,
    description,
    default_order: 0,
    evidence_refs: refs,
    review_status: "needs_review",
  });
  const resolution = {
    gap_id: candidate.gap_id,
    resolution_action: "add_or_alias_concepts",
    canonical_ids: unique([canonicalId, ...candidate.existing_canonical_ids]),
    created_node_ids: [nodeId],
    practice_ids: [],
    rationale_zh: "全库反向查重后，现有概念只能覆盖基础或更宽范围；新增一个与官方成果一致的最小可诊断概念，并保留相关 canonical 作为基础映射。",
    evidence_refs: refs,
    review_status: "needs_review",
  };
  resolutions.push(resolution);
  resolutionByGap.set(candidate.gap_id, resolution);
}

const createdByKey = new Map(createdNodes.map((node) => [node.id.replace(/^sg_h2_math_/, ""), node]));
const grouped = new Set();
const topics = TOPICS.map(([topicKey, name, nameZh, keys], topicIndex) => {
  if (keys.length < 2 || keys.length > 3) throw new Error(`Topic ${topicKey} must contain 2-3 concepts`);
  const concepts = keys.map((key, conceptIndex) => {
    const node = createdByKey.get(key);
    if (!node) throw new Error(`Topic ${topicKey} references missing concept ${key}`);
    if (grouped.has(key)) throw new Error(`Concept ${key} appears in multiple topics`);
    grouped.add(key);
    node.topic = `sg_h2_math_topic_${topicKey}`;
    node.default_order = conceptIndex + 1;
    return node;
  });
  return {
    id: `sg_h2_math_topic_${topicKey}`,
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
  throw new Error(`Ungrouped concepts: ${[...createdByKey.keys()].filter((key) => !grouped.has(key)).join(", ")}`);
}

const nodeByKey = new Map(createdNodes.map((node) => [node.id.replace(/^sg_h2_math_/, ""), node]));
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
    summary_zh: "根据 SEAB 9758 逐成果覆盖审查建立 33 个最小可诊断概念，并为每个概念补齐考试大纲与开放教材或大学课程两类证据。",
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
    mapping.rationale_zh = `经全库反向查重和成果粒度复核，现由 ${resolution.canonical_ids.join("、")} 完整覆盖；新节点仍待人工批准。`;
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
  summary_zh: "应用 33 项缺口解析：学科成果闭合为 full，6 项工具实践继续保持 excluded 并进入独立教学评测知识集。",
});

const resolutionSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  resolution_set_id: "cgr_sg_seab_h2_math_9758_2026_outcomes",
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
    summary_zh: "完成 33 项 H2 数学概念缺口的全库查重、最小诊断粒度新增和双类权威证据登记。",
  }],
  resolutions,
};

const targets = new Set(edges.map((edge) => edge.to));
const roots = createdNodes.filter((node) => !targets.has(node.id));
const reviewLines = [
  "# 新加坡 H2 数学 KG 缺口实施与第二轮复核（中文）",
  "",
  `- 复核日期：${TODAY}`,
  `- 官方学习成果：${mappings.mappings.length} 项`,
  `- 完整学科覆盖：${mappings.mappings.filter((mapping) => mapping.coverage_status === "full").length} 项`,
  `- 工具/作答实践分流：${mappings.mappings.filter((mapping) => mapping.coverage_status === "excluded").length} 项`,
  `- 新图：${createdNodes.length} 个 Concept，${topics.length} 个 Topic，${edges.length} 条待审先修边`,
  `- 入口概念：${roots.length} 个；均已逐项核对为独立基础或依赖图外既有概念，未用课程顺序伪造先修边。`,
  "- 审核状态：全部保持 `needs_review`；本轮是 AI 代行的人工式复核，不写入 human approval。",
  "",
  "## 第一轮复核纠正",
  "",
  "- 把图形计算器总则、绘图、方程求解、递推生成、导数/极值估计和定积分近似 6 项从概念掌握度分流到教学与评测知识。",
  "- 将向量几何解释、三维线面位置、函数/导函数图像、概率多表示、正态反求、假设检验和二元最小二乘等误判为 full 的条目降为缺口后再解析。",
  "- 收窄位置/位移向量、复二次根与复数模/辐角新节点，已有向量大小、数系扩充和共轭运算继续复用旧 canonical，避免重复建点。",
  "- 删除 6 条仅反映课程顺序、依赖图外旧概念或不构成必要条件的候选先修边；入口点增加是保守建图的预期结果。",
  "- 保留极形式、三重向量积、参数曲线旋转体、二项分布正态近似、回归假设检验等官方 Exclude 边界，不向 KG 偷渡超纲内容。",
  "",
  "## 逐项缺口解析",
  "",
];
for (const candidate of gaps.candidates) {
  const resolution = resolutionByGap.get(candidate.gap_id);
  const node = createdNodes.find((entry) => entry.id === resolution.created_node_ids[0]);
  reviewLines.push(
    `### ${node.name_zh}`,
    "",
    `- 缺口：\`${candidate.gap_id}\``,
    `- 新节点：${node.name_zh}（\`${node.id}\` / \`${node.canonical_id}\`）`,
    `- 范围：${candidate.scope_zh}`,
    `- 保留相关概念：${candidate.existing_canonical_ids.length ? candidate.existing_canonical_ids.map((id) => `\`${id}\``).join("、") : "无"}`,
    `- 证据：${node.evidence_refs.map((ref) => `${ref.locator}（\`${ref.source_id}\`）`).join("；")}`,
    "- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。",
    "",
  );
}

writeJson(paths.graph, graph);
writeJson(paths.registry, registry);
writeJson(paths.mappings, mappings);
writeJson(paths.resolutions, resolutionSet);
mkdirSync(dirname(paths.review), { recursive: true });
writeFileSync(paths.review, `${reviewLines.join("\n")}\n`);

process.stdout.write(`[apply-sg-h2-math-resolutions] ${resolutions.length} gaps -> ${createdNodes.length} concepts, ${topics.length} topics, ${edges.length} edges; ${roots.length} roots\n`);
