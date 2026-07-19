# 新加坡 H2 数学 KG 缺口实施与第二轮复核（中文）

- 复核日期：2026-07-19
- 官方学习成果：80 项
- 完整学科覆盖：74 项
- 工具/作答实践分流：6 项
- 新图：33 个 Concept，14 个 Topic，12 条待审先修边
- 入口概念：22 个；均已逐项核对为独立基础或依赖图外既有概念，未用课程顺序伪造先修边。
- 审核状态：全部保持 `needs_review`；本轮是 AI 代行的人工式复核，不写入 human approval。

## 第一轮复核纠正

- 把图形计算器总则、绘图、方程求解、递推生成、导数/极值估计和定积分近似 6 项从概念掌握度分流到教学与评测知识。
- 将向量几何解释、三维线面位置、函数/导函数图像、概率多表示、正态反求、假设检验和二元最小二乘等误判为 full 的条目降为缺口后再解析。
- 收窄位置/位移向量、复二次根与复数模/辐角新节点，已有向量大小、数系扩充和共轭运算继续复用旧 canonical，避免重复建点。
- 删除 6 条仅反映课程顺序、依赖图外旧概念或不构成必要条件的候选先修边；入口点增加是保守建图的预期结果。
- 保留极形式、三重向量积、参数曲线旋转体、二项分布正态近似、回归假设检验等官方 Exclude 边界，不向 KG 偷渡超纲内容。

## 逐项缺口解析

### 反函数存在条件与定义域限制

- 缺口：`gap_sg_h2_math_9758_2026_o_inverse_existence_restriction`
- 新节点：反函数存在条件与定义域限制（`sg_h2_math_inverse_existence_restriction` / `pc_5f10437c0846188d853443ee76c29385`）
- 范围：判断反函数是否存在，必要时限制定义域，并联系一一函数与反函数图像。
- 保留相关概念：`pc_d547d8eb03df4b28cc0357c7cae1d164`
- 证据：PDF p.6, sub-topic 1.1 Functions（`src_sg_seab_h2_math_9758_2026`）；PDF §1.7 Inverse Functions, printed pp.130-149（`src_openstax_precalculus_2e_2026`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 常见代数函数图像特征

- 缺口：`gap_sg_h2_math_9758_2026_o_standard_graph_characteristics`
- 新节点：常见代数函数图像特征（`sg_h2_math_standard_graph_characteristics` / `pc_01bf6e2b919084e9537bb1dae27d1509`）
- 范围：识别指定函数及圆锥曲线图像的对称性、截距、转折点和渐近线。
- 保留相关概念：`pc_133d40fa0e72c29c5eb6ec7a9852c80c`、`pc_58591fb3c8294a83a9405568a100991e`、`pc_76707a52fc4d807bbdfb0e56f509c17e`、`pc_d236c68eb711f9a26eb4250a7843b517`、`pc_2fd09e919b7e73069c83ce49007f17d2`
- 证据：PDF p.6, sub-topic 1.2 Graphs and transformations（`src_sg_seab_h2_math_9758_2026`）；PDF §§3.2 and 3.7, printed pp.255-274 and 340-364; §§10.1-10.3, printed pp.1010-1055（`src_openstax_precalculus_2e_2026`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 简单参数方程与平面图像

- 缺口：`gap_sg_h2_math_9758_2026_o_parametric_graphs`
- 新节点：简单参数方程与平面图像（`sg_h2_math_parametric_graphs` / `pc_044eaaf9e74e43e4aee3e6898c91a012`）
- 范围：解释简单参数方程并画出或识别其平面曲线图像。
- 保留相关概念：无
- 证据：PDF p.6, sub-topic 1.2 Graphs and transformations（`src_sg_seab_h2_math_9758_2026`）；PDF §§8.6-8.7 Parametric Equations and Graphs, printed pp.839-863（`src_openstax_precalculus_2e_2026`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 从情境建立方程与不等式

- 缺口：`gap_sg_h2_math_9758_2026_o_formulate_equations`
- 新节点：从情境建立方程与不等式（`sg_h2_math_formulate_equations` / `pc_2c7c77c12eaf42efced7f2a956e1bb16`）
- 范围：从问题情境建立方程、线性方程组或不等式并解释变量约束。
- 保留相关概念：`pc_204206c0b72ea40b72d3055124b579af`、`pc_4307437065fb6fce9aa3b4c05e7ed82d`
- 证据：PDF p.7, sub-topic 1.3 Equations and inequalities（`src_sg_seab_h2_math_9758_2026`）；PDF §2.3 Modeling with Linear Functions, printed pp.206-219; §§9.1-9.3, printed pp.896-936（`src_openstax_precalculus_2e_2026`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 一次与二次因式构成的分式不等式

- 缺口：`gap_sg_h2_math_9758_2026_o_rational_quadratic_inequalities`
- 新节点：一次与二次因式构成的分式不等式（`sg_h2_math_rational_quadratic_inequalities` / `pc_afd49425ab0864c75dcf18868acbba73`）
- 范围：用代数或图像方法求解由一次式或二次式组成的分式不等式。
- 保留相关概念：`pc_4307437065fb6fce9aa3b4c05e7ed82d`
- 证据：PDF p.7, sub-topic 1.3 Equations and inequalities（`src_sg_seab_h2_math_9758_2026`）；PDF §3.7 Rational Functions, printed pp.340-364; §9.3 Nonlinear Equations and Inequalities, printed pp.925-936（`src_openstax_precalculus_2e_2026`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 递推数列

- 缺口：`gap_sg_h2_math_9758_2026_o_recurrence_sequences`
- 新节点：递推数列（`sg_h2_math_recurrence_sequences` / `pc_751f6453ef98be2b89e76c9a253bef03`）
- 范围：由递推关系生成数列，计算后继项并分析数列行为。
- 保留相关概念：无
- 证据：PDF p.7, sub-topic 2.1 Sequences and series（`src_sg_seab_h2_math_9758_2026`）；PDF §11.1 Sequences and Their Notations, printed pp.1089-1103（`src_openstax_precalculus_2e_2026`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 级数运算、收敛与无穷和

- 缺口：`gap_sg_h2_math_9758_2026_o_series_operations_convergence`
- 新节点：级数运算、收敛与无穷和（`sg_h2_math_series_operations_convergence` / `pc_08b1eb5f8f685706a847adee808f59f9`）
- 范围：完成两个级数的和差，判断收敛并解释无穷和。
- 保留相关概念：`pc_105655e3b7f36e0d0c2488e7d3e47a3a`
- 证据：PDF p.7, sub-topic 2.1 Sequences and series（`src_sg_seab_h2_math_9758_2026`）；PDF §11.4 Series and Their Notations, printed pp.1124-1136（`src_openstax_precalculus_2e_2026`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 向量运算的几何解释

- 缺口：`gap_sg_h2_math_9758_2026_o_vector_operations_geometry`
- 新节点：向量运算的几何解释（`sg_h2_math_vector_operations_geometry` / `pc_d4b7e2b6e2c8459d849405a8f6fc0b79`）
- 范围：在二维和三维中完成向量加减与数乘，并解释其几何意义。
- 保留相关概念：`pc_9ae5f17312ee21050edf3e4bd9b005a2`
- 证据：PDF p.7, sub-topic 3.1 Basic properties of vectors（`src_sg_seab_h2_math_9758_2026`）；Unit 1 Part A, Sessions 1-4: vectors, dot products, lengths, angles and components（`src_mit_ocw_18_02sc_fall_2010`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 位置、位移向量与两点距离

- 缺口：`gap_sg_h2_math_9758_2026_o_vector_types_magnitude`
- 新节点：位置、位移向量与两点距离（`sg_h2_math_vector_types_magnitude` / `pc_621b21298876e61af0ada0dde5521dd6`）
- 范围：区分位置、位移和方向向量，计算向量大小、单位向量及两点距离。
- 保留相关概念：`pc_9ae5f17312ee21050edf3e4bd9b005a2`、`pc_64e61e1cee5471619fa54db48800b916`
- 证据：PDF p.7, sub-topic 3.1 Basic properties of vectors（`src_sg_seab_h2_math_9758_2026`）；Unit 1 Part A, Sessions 1-4: vector components, lengths and directions（`src_mit_ocw_18_02sc_fall_2010`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 向量共线与比例定理

- 缺口：`gap_sg_h2_math_9758_2026_o_collinearity_ratio`
- 新节点：向量共线与比例定理（`sg_h2_math_collinearity_ratio` / `pc_c4a9b18aaa8cac61cd5719c4de9d6879`）
- 范围：用向量判断共线，并使用比例定理解决几何分点问题。
- 保留相关概念：`pc_9ae5f17312ee21050edf3e4bd9b005a2`
- 证据：PDF p.7, collinearity; PDF p.8, ratio theorem, sub-topic 3.1（`src_sg_seab_h2_math_9758_2026`）；Unit 1 Part A, Sessions 1-4: vector components and geometric vector reasoning（`src_mit_ocw_18_02sc_fall_2010`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 垂足及点到直线或平面的距离

- 缺口：`gap_sg_h2_math_9758_2026_o_point_line_plane_distance`
- 新节点：垂足及点到直线或平面的距离（`sg_h2_math_point_line_plane_distance` / `pc_44258dcc263e1037c0cac100f62afaa6`）
- 范围：求点到直线或平面的垂足和距离。
- 保留相关概念：`pc_b70bbfb827c2b527f128f02bf360675e`、`pc_8386363188df11ab28ae08ef72342a47`
- 证据：PDF p.8, sub-topic 3.3 Three-dimensional vector geometry（`src_sg_seab_h2_math_9758_2026`）；Unit 1 Sessions 3, 8, 12, 15 and 16: projections, planes, lines and intersections（`src_mit_ocw_18_02sc_fall_2010`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 三维直线与平面的相对位置

- 缺口：`gap_sg_h2_math_9758_2026_o_relative_positions_3d`
- 新节点：三维直线与平面的相对位置（`sg_h2_math_relative_positions_3d` / `pc_e6bc28a8a732ece9251e6d7d12525dee`）
- 范围：判断两直线、线面或两平面的平行、相交、重合及异面关系。
- 保留相关概念：`pc_8386363188df11ab28ae08ef72342a47`
- 证据：PDF p.8, sub-topic 3.3 Three-dimensional vector geometry（`src_sg_seab_h2_math_9758_2026`）；Unit 1 Sessions 8, 12, 15 and 16: equations and intersections of lines and planes（`src_mit_ocw_18_02sc_fall_2010`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 实系数二次方程的非实根

- 缺口：`gap_sg_h2_math_9758_2026_o_complex_extension_roots`
- 新节点：实系数二次方程的非实根（`sg_h2_math_complex_extension_roots` / `pc_24330767cc56747db538e56a7aaff4d4`）
- 范围：从实数扩充到复数并求实系数二次方程的复根。
- 保留相关概念：`pc_a2d1c2c86661b6706ceb2919619b89e5`、`pc_fc9bb3961ffd0d45670252b69c41d19c`
- 证据：PDF p.8, sub-topic 4.1 Complex numbers in cartesian form and Argand diagrams（`src_sg_seab_h2_math_9758_2026`）；PDF §§3.1 and 3.6 Complex Numbers and Polynomial Zeros, printed pp.245-254 and 326-339（`src_openstax_precalculus_2e_2026`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 由笛卡尔形式求模与主辐角

- 缺口：`gap_sg_h2_math_9758_2026_o_complex_mod_arg_conjugate`
- 新节点：由笛卡尔形式求模与主辐角（`sg_h2_math_complex_mod_arg_conjugate` / `pc_08a0b36d500f85a79ecd1a38f6cef808`）
- 范围：在不使用极形式的前提下求复数的模、主辐角和共轭。
- 保留相关概念：`pc_84fa9a959816d2fd778aec459c7e0020`、`pc_8b0b34fcb52404046ccbf41b402895fd`
- 证据：PDF p.8, sub-topic 4.1 Complex numbers in cartesian form and Argand diagrams（`src_sg_seab_h2_math_9758_2026`）；PDF §3.1 Complex Numbers, printed pp.245-254; complex plane, modulus and conjugates（`src_openstax_precalculus_2e_2026`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 实系数多项式的共轭根

- 缺口：`gap_sg_h2_math_9758_2026_o_conjugate_polynomial_roots`
- 新节点：实系数多项式的共轭根（`sg_h2_math_conjugate_polynomial_roots` / `pc_8b92b1da4df755ca8679ce69d4471470`）
- 范围：使用实系数多项式的非实根成共轭对性质。
- 保留相关概念：`pc_fc9bb3961ffd0d45670252b69c41d19c`
- 证据：PDF p.8, sub-topic 4.1 Complex numbers in cartesian form and Argand diagrams（`src_sg_seab_h2_math_9758_2026`）；PDF §3.6 Zeros of Polynomial Functions, printed pp.326-339（`src_openstax_precalculus_2e_2026`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 复数运算的几何效果

- 缺口：`gap_sg_h2_math_9758_2026_o_complex_geometric_effects`
- 新节点：复数运算的几何效果（`sg_h2_math_complex_geometric_effects` / `pc_415bf497b8b12033e4f00630f6180261`）
- 范围：在阿根图解释共轭、取负、加减及乘以 i 的几何效果。
- 保留相关概念：`pc_8b0b34fcb52404046ccbf41b402895fd`、`pc_c04ce0aed24384aaa5b223f59282d31c`
- 证据：PDF p.8, sub-topic 4.1 Complex numbers in cartesian form and Argand diagrams（`src_sg_seab_h2_math_9758_2026`）；Chapter 9 §9.4, printed pp.425-426 (PDF pp.14-15): complex operations and vector geometry（`src_mit_ocw_strang_calculus_ch9_2023`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 函数与导函数图像关系

- 缺口：`gap_sg_h2_math_9758_2026_o_derivative_graph_relations`
- 新节点：函数与导函数图像关系（`sg_h2_math_derivative_graph_relations` / `pc_4d08149f9dd7b5784cadd265396b01c3`）
- 范围：由一阶、二阶导数符号解释函数图像，并联系 f 与 f' 的图像。
- 保留相关概念：`pc_f9249fb783344fbbcfe32c05267ebcb8`
- 证据：PDF p.9, sub-topic 5.1 Differentiation（`src_sg_seab_h2_math_9758_2026`）；Unit 2 Part A, Sessions 27-28: curve sketching from first and second derivatives（`src_mit_ocw_18_01sc_fall_2010`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 麦克劳林与小角近似

- 缺口：`gap_sg_h2_math_9758_2026_o_series_approximations`
- 新节点：麦克劳林与小角近似（`sg_h2_math_series_approximations` / `pc_155158921b82586ddb35fdb4e5be126e`）
- 范围：把麦克劳林级数作为函数近似，并使用规定的小角近似。
- 保留相关概念：`pc_c1be934889ced7140179984f36bd37cf`
- 证据：PDF p.9, sub-topic 5.2 Maclaurin series（`src_sg_seab_h2_math_9758_2026`）；Unit 5 Part B, Sessions 98-99: Taylor series and approximation（`src_mit_ocw_18_01sc_fall_2010`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 含初值与给定换元的可分离微分方程

- 缺口：`gap_sg_h2_math_9758_2026_o_separable_ode_solutions`
- 新节点：含初值与给定换元的可分离微分方程（`sg_h2_math_separable_ode_solutions` / `pc_3abc241a0eedef6ba58bf1ae2d6eb93a`）
- 范围：求可分离一阶微分方程的通解和满足初值的特解，包括按给定换元化为可分离形式。
- 保留相关概念：`pc_19b4d23ab3a52e66c899dbf16e583835`
- 证据：PDF p.10, sub-topic 5.5 Differential equations（`src_sg_seab_h2_math_9758_2026`）；Unit 2 Part C, Sessions 39-40: introduction to differential equations and separation of variables（`src_mit_ocw_18_01sc_fall_2010`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 情境中解释微分方程及其解

- 缺口：`gap_sg_h2_math_9758_2026_o_interpret_ode_solution`
- 新节点：情境中解释微分方程及其解（`sg_h2_math_interpret_ode_solution` / `pc_baed7089af5b006e15f04221326d2a5d`）
- 范围：在问题情境中解释微分方程、初值和解的含义及限制。
- 保留相关概念：`pc_1c40f01e7df9a2f35a81598b9edf2a2a`、`pc_19b4d23ab3a52e66c899dbf16e583835`
- 证据：PDF p.10, sub-topic 5.5 Differential equations（`src_sg_seab_h2_math_9758_2026`）；Unit 2 Part C, Sessions 39-40 and worked examples on differential equations（`src_mit_ocw_18_01sc_fall_2010`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 受限、重复与圆周排列

- 缺口：`gap_sg_h2_math_9758_2026_o_counting_arrangements`
- 新节点：受限、重复与圆周排列（`sg_h2_math_counting_arrangements` / `pc_eef96c990935a92e07a3e4f266c6d8b7`）
- 范围：使用加法、乘法原理及排列组合处理直线或圆周排列、重复和限制。
- 保留相关概念：`pc_72b8e1a7b680bd575ff6d93a1e2c592b`
- 证据：PDF p.11, sub-topic 6.1 Probability（`src_sg_seab_h2_math_9758_2026`）；PDF §11.5 Counting Principles, printed pp.1137-1147（`src_openstax_precalculus_2e_2026`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 概率表示与样本空间转换

- 缺口：`gap_sg_h2_math_9758_2026_o_probability_representations`
- 新节点：概率表示与样本空间转换（`sg_h2_math_probability_representations` / `pc_d087f482be941779c1774129f95c83cb`）
- 范围：使用结果表、Venn 图、树图及排列组合方法组织样本空间并计算概率。
- 保留相关概念：`pc_c1ed59c17771ca7dfcca90c7c55fadc1`、`pc_cf8dbc5bcf596f0c4db74ea9886540a1`、`pc_0c7c408f2fb208ecfb0b6758b1cd4a0a`、`pc_72b8e1a7b680bd575ff6d93a1e2c592b`
- 证据：PDF p.11, sub-topic 6.1 Probability（`src_sg_seab_h2_math_9758_2026`）；PDF §11.7 Probability, printed pp.1154-1164（`src_openstax_precalculus_2e_2026`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 正态概率与参数反求

- 缺口：`gap_sg_h2_math_9758_2026_o_normal_probabilities_parameters`
- 新节点：正态概率与参数反求（`sg_h2_math_normal_probabilities_parameters` / `pc_d3fe5191e8f9cbcc11d138b2398d7d39`）
- 范围：标准化正态变量，利用对称性求概率或由概率反求阈值和参数关系。
- 保留相关概念：`pc_23858effd2dd68284bd0c6b645607386`
- 证据：PDF p.12, sub-topic 6.3 Normal distribution（`src_sg_seab_h2_math_9758_2026`）；PDF §§6.1-6.2 The Standard Normal Distribution and Using the Normal Distribution, printed pp.336-346（`src_openstax_introductory_statistics_2e_2026`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 随机变量线性变换的期望与方差

- 缺口：`gap_sg_h2_math_9758_2026_o_linear_transform_moments`
- 新节点：随机变量线性变换的期望与方差（`sg_h2_math_linear_transform_moments` / `pc_6e5628aaaaa688905edfcdb9e9bd31de`）
- 范围：计算 E(aX+b) 与 Var(aX+b)。
- 保留相关概念：`pc_d9a0d8a8f6fc271c56cb2d9dde6576ec`、`pc_8d0a38a8e8f86cd83ae1f091a62f2cad`
- 证据：PDF p.12, sub-topic 6.3 Normal distribution（`src_sg_seab_h2_math_9758_2026`）；Summer 2026 Notes 16-17: Random Variables I (Distribution and Expectation) and II (Variance and Covariance)（`src_berkeley_cs70_summer_2026`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 独立随机变量线性组合的期望与方差

- 缺口：`gap_sg_h2_math_9758_2026_o_independent_sum_moments`
- 新节点：独立随机变量线性组合的期望与方差（`sg_h2_math_independent_sum_moments` / `pc_b6ae379a519add3186b6f9563641f292`）
- 范围：对独立 X、Y 计算 E(aX+bY) 与 Var(aX+bY)。
- 保留相关概念：`pc_d9a0d8a8f6fc271c56cb2d9dde6576ec`、`pc_8d0a38a8e8f86cd83ae1f091a62f2cad`
- 证据：PDF p.12, sub-topic 6.3 Normal distribution（`src_sg_seab_h2_math_9758_2026`）；Summer 2026 Notes 16-17: Random Variables I (Distribution and Expectation) and II (Variance and Covariance)（`src_berkeley_cs70_summer_2026`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 假设检验概念、临界域与 p 值

- 缺口：`gap_sg_h2_math_9758_2026_o_hypothesis_test_concepts`
- 新节点：假设检验概念、临界域与 p 值（`sg_h2_math_hypothesis_test_concepts` / `pc_1b57223154105f385a53683ed93b8917`）
- 范围：理解原假设、备择假设、检验统计量、临界域、显著性水平和 p 值。
- 保留相关概念：`pc_5e8204fe2f43100f3de7f78a5824d321`
- 证据：PDF p.13, sub-topic 6.5 Hypothesis testing（`src_sg_seab_h2_math_9758_2026`）；PDF §§9.1 and 9.4, printed pp.462-463 and 467-468（`src_openstax_introductory_statistics_2e_2026`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 单总体均值假设检验

- 缺口：`gap_sg_h2_math_9758_2026_o_one_mean_hypothesis_test`
- 新节点：单总体均值假设检验（`sg_h2_math_one_mean_hypothesis_test` / `pc_0c7cea3a120654ca950f6328bada7f29`）
- 范围：针对已知方差正态总体样本或任意总体大样本建立并执行总体均值检验。
- 保留相关概念：`pc_5e8204fe2f43100f3de7f78a5824d321`、`pc_14be091db45947021ec317ac23ac5401`、`pc_23858effd2dd68284bd0c6b645607386`
- 证据：PDF p.13, sub-topic 6.5 Hypothesis testing（`src_sg_seab_h2_math_9758_2026`）；PDF §§9.3 and 9.6, printed pp.466 and 483-485（`src_openstax_introductory_statistics_2e_2026`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 单尾与双尾假设检验

- 缺口：`gap_sg_h2_math_9758_2026_o_one_two_tailed_tests`
- 新节点：单尾与双尾假设检验（`sg_h2_math_one_two_tailed_tests` / `pc_f415daef0495c59dcc47d3019cc79bc6`）
- 范围：根据备择假设选择单尾或双尾检验及相应临界域。
- 保留相关概念：`pc_5e8204fe2f43100f3de7f78a5824d321`
- 证据：PDF p.13, sub-topic 6.5 Hypothesis testing（`src_sg_seab_h2_math_9758_2026`）；PDF §§9.1 and 9.4-9.5, printed pp.462-463 and 467-482（`src_openstax_introductory_statistics_2e_2026`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 情境中解释假设检验结论

- 缺口：`gap_sg_h2_math_9758_2026_o_interpret_hypothesis_result`
- 新节点：情境中解释假设检验结论（`sg_h2_math_interpret_hypothesis_result` / `pc_5199b5ff650e904e87b0e95d4228f807`）
- 范围：在问题语境中解释拒绝或不拒绝原假设的含义，不扩展到大纲排除的错误类型。
- 保留相关概念：`pc_5e8204fe2f43100f3de7f78a5824d321`
- 证据：PDF p.13, sub-topic 6.5 Hypothesis testing（`src_sg_seab_h2_math_9758_2026`）；PDF §§9.4-9.5 Rare Events, Decision and Full Examples, printed pp.467-482（`src_openstax_introductory_statistics_2e_2026`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 散点图与线性关系合理性

- 缺口：`gap_sg_h2_math_9758_2026_o_scatter_linear_plausibility`
- 新节点：散点图与线性关系合理性（`sg_h2_math_scatter_linear_plausibility` / `pc_e509f13c1e239978b74733175b7f064c`）
- 范围：由散点图判断变量间是否存在可信的线性关系。
- 保留相关概念：`pc_629b0c54807299e247ddd77ea5076dd6`
- 证据：PDF p.13, sub-topic 6.6 Correlation and linear regression（`src_sg_seab_h2_math_9758_2026`）；PDF §12.2 Scatter Plots, printed pp.620-622（`src_openstax_introductory_statistics_2e_2026`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 积矩相关系数解释

- 缺口：`gap_sg_h2_math_9758_2026_o_pmcc_interpretation`
- 新节点：积矩相关系数解释（`sg_h2_math_pmcc_interpretation` / `pc_ad7a1774c52a28bad236b9cd642c8867`）
- 范围：把积矩相关系数解释为线性模型拟合程度，特别解释接近 -1、0、1 的情形。
- 保留相关概念：`pc_629b0c54807299e247ddd77ea5076dd6`
- 证据：PDF p.13, sub-topic 6.6 Correlation and linear regression（`src_sg_seab_h2_math_9758_2026`）；PDF §§12.3-12.4 Regression and Correlation, printed pp.623-634（`src_openstax_introductory_statistics_2e_2026`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 二元数据最小二乘回归

- 缺口：`gap_sg_h2_math_9758_2026_o_least_squares_regression`
- 新节点：二元数据最小二乘回归（`sg_h2_math_least_squares_regression` / `pc_8c40d58addedb33cf22ac1efd9905af4`）
- 范围：使用最小二乘法求二元数据的线性回归方程。
- 保留相关概念：`pc_ed18cde6c3d7e08e9e371061418a7424`
- 证据：PDF p.13, sub-topic 6.6 Correlation and linear regression（`src_sg_seab_h2_math_9758_2026`）；PDF §12.3 The Regression Equation, printed pp.623-630（`src_openstax_introductory_statistics_2e_2026`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 变量变换实现线性化

- 缺口：`gap_sg_h2_math_9758_2026_o_transform_to_linearity`
- 新节点：变量变换实现线性化（`sg_h2_math_transform_to_linearity` / `pc_e36b98906e813a98f82ca4c1f2f8a68c`）
- 范围：使用平方、倒数或对数变换把关系转化为线性形式。
- 保留相关概念：`pc_1ea1ea6ee0e270c4aad9c97a380db664`
- 证据：PDF p.13, sub-topic 6.6 Correlation and linear regression（`src_sg_seab_h2_math_9758_2026`）；PDF §§2.4 and 4.7 Fitting and Modeling, printed pp.220-232 and 484-502（`src_openstax_precalculus_2e_2026`）
- 复核结论：没有找到语义等价且粒度相同的既有 canonical；新增点不自动批准。
