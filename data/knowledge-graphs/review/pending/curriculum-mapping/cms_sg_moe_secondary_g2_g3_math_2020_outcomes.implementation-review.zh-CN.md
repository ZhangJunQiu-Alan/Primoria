# 新加坡 G2/G3 中学数学 KG 缺口实施与第二轮复核（中文）

- 复核日期：2026-07-19
- 官方成果与实践：163 项
- 完整学科覆盖：153 项
- 工具/建模实践分流：10 项
- 缺口解析：118 项，跨 G2/G3 去重后新增 53 个 Concept
- 新图：18 个 Topic，18 条待审软先修边，35 个入口概念
- 审核状态：全部保持 `needs_review`；本轮是 AI 代行的人工式复核，不写入 human approval。

## 第二轮复核纠正

- 删除模板误带入 G3 中三/中四的 G2 代数复习项，并按官方页码区分 G3 和 G2 的二次方程方法。
- 把 G2 中二的方程与不等式、G2 中三/中四的代数复习，以及统计图表条目拆成可独立出题诊断的成果。
- 补入 syllabus 明确要求贯穿四年的个人/家庭金融数学、路程—时间与速度—时间图像应用。
- 补入官方第 32–33 页中五 G3 衔接内容，使用独立 level_id，未错误并入普通 G2 中三/中四。
- 107 个原始 partial/unmapped 条目按语义边界去重为 52 个新增概念；重复出现只共享 canonical ID，不丢失层级和页码证据。
- 棱柱/圆柱/组合体度量与平面向量表示经定义复核后复用现有 canonical 组合，没有重复建点。
- 计算器操作和两套四阶段数学建模流程共 10 项继续留在教学与评测知识层。
- 先修边只保留可解释的学理依赖；课程先后、年级顺序和图外基础未被伪造成图内边。

## 新增概念抽查清单

### 代数展开与基本恒等式

- 节点：`sg_sec_math_algebra_expansion_identities` / `pc_37efdccc48565e833f89715be7bcdb65`
- 定义：Expanding products of algebraic expressions and using square and difference-of-squares identities in both directions.
- 课程证据：PDF p.17, g3 sec2, Expansion and algebraic identities；PDF p.27, g2 sec2, Expansion and algebraic identities；PDF p.29, g2 sec3 4, Expansion of algebraic expressions
- 第二类证据：PDF §§3.2-3.4 Quadratic and Polynomial Functions, printed pp.255-315（`src_openstax_precalculus_2e_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 代数记号与代入求值

- 节点：`sg_sec_math_algebra_notation_evaluation` / `pc_5e0f4f344259b5ebc17ecb23c9c49115`
- 定义：Interpreting standard algebraic notation, using letters for quantities and evaluating expressions or formulae by substitution.
- 课程证据：PDF p.15, g3 sec1, Algebraic notation and evaluation；PDF p.25, g2 sec1, Algebraic notation and evaluation
- 第二类证据：PDF §5.1 Algebraic Expressions, printed pp.334-345（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 把简单情境表示为代数式

- 节点：`sg_sec_math_algebra_translation` / `pc_b8681872460e1ec21b74eafa7d1620a7`
- 定义：Choosing variables and translating a simple real-world relationship into an algebraic expression without yet requiring an equation-solving model.
- 课程证据：PDF p.15, g3 sec1, Translating situations into algebra；PDF p.26, g2 sec1, Translating situations into algebra
- 第二类证据：PDF §§5.1-5.2 Algebraic Expressions and Applications, printed pp.334-355（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 代数分式加减

- 节点：`sg_sec_math_algebraic_fractions_add_subtract` / `pc_ee5e980fe9f65a9f13a1edb86253a1bf`
- 定义：Finding common denominators and adding or subtracting algebraic fractions with linear or quadratic denominators.
- 课程证据：PDF p.17, g3 sec2, Adding and subtracting algebraic fractions；PDF p.29, g2 sec3 4, Adding and subtracting algebraic fractions
- 第二类证据：PDF §3.7 Rational Functions, printed pp.340-364（`src_openstax_precalculus_2e_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 代数分式乘除

- 节点：`sg_sec_math_algebraic_fractions_multiply_divide` / `pc_15c649df7800fe1b3ca94e60f96513d8`
- 定义：Simplifying, multiplying and dividing algebraic fractions while retaining excluded-value restrictions.
- 课程证据：PDF p.17, g3 sec2, Multiplying and dividing algebraic fractions；PDF p.27, g2 sec2, Multiplying and dividing algebraic fractions
- 第二类证据：PDF §3.7 Rational Functions, printed pp.340-364（`src_openstax_precalculus_2e_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 角的类型与基本关系

- 节点：`sg_sec_math_angle_relationships` / `pc_04ea2830751757a6b38f545e638bb3f6`
- 定义：Using angle types, vertically opposite angles, angles at a point or on a line and angles formed by a transversal of parallel lines.
- 课程证据：PDF p.16, g3 sec1, Angle relationships；PDF p.26, g2 sec1, Angle relationships
- 第二类证据：PDF §10.2 Angles, printed pp.1007-1018（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 取整、近似与估算

- 节点：`sg_sec_math_approximation_estimation` / `pc_2fafc753b71eb0586f200d6255e6d156`
- 定义：Rounding to required decimal places or significant figures and using estimation to check the scale and plausibility of a computation.
- 课程证据：PDF p.15, g3 sec1, Approximation and estimation；PDF p.25, g2 sec1, Approximation and estimation
- 第二类证据：PDF §3.9 Scientific Notation, printed pp.227-238（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 平均数、中位数、众数与分组均值

- 节点：`sg_sec_math_central_tendency` / `pc_b0f426fa7ff2e1150d95beab326aa71d`
- 定义：Calculating and selecting mean, median or mode for a dataset and estimating the mean from grouped frequency data.
- 课程证据：PDF p.18, g3 sec2, Measures of central tendency；PDF p.28, g2 sec2, Measures of central tendency
- 第二类证据：PDF §8.3 Mean, Median and Mode, printed pp.857-872（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 圆的角性质

- 节点：`sg_sec_math_circle_angles` / `pc_d46035586f5c24f181969a36ed456bf5`
- 定义：Applying the angle in a semicircle, tangent-radius perpendicularity, centre-circumference angle relation, same-segment and opposite-segment properties.
- 课程证据：PDF p.20, g3 sec3 4, Circle angle properties；PDF p.30, g2 sec3 4, Circle angle properties
- 第二类证据：PDF §§10.2-10.4 Angles, Triangles and Polygons, printed pp.1007-1051（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 圆的弦与切线性质

- 节点：`sg_sec_math_circle_chord_tangent` / `pc_367201efd937747abdefe2f3739e5132`
- 定义：Using equal-chord, perpendicular-bisector and equal-tangent properties, including the centre line that bisects the angle between tangents.
- 课程证据：PDF p.20, g3 sec3 4, Chord and tangent properties；PDF p.30, g2 sec3 4, Chord and tangent properties
- 第二类证据：PDF §§10.1-10.4 Euclidean Geometry Foundations, printed pp.994-1051（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 弧长、扇形面积与弓形面积

- 节点：`sg_sec_math_circle_mensuration` / `pc_04897092166e867a8d93f1382fb4e3c1`
- 定义：Calculating arc length, sector area and segment area using fractions of a circle or radian measure.
- 课程证据：PDF p.20, g3 sec3 4, Arc, sector and segment measures；PDF p.30, g2 sec3 4, Arc, sector and segment measures
- 第二类证据：PDF §5.1 Angles, printed pp.507-520（`src_openstax_precalculus_2e_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 复合事件概率表示

- 节点：`sg_sec_math_combined_probability` / `pc_368281a2f6ec71f3e8a782e510871a58`
- 定义：Using possibility diagrams, tables or tree diagrams to enumerate simple combined events before applying probability rules.
- 课程证据：PDF p.21, g3 sec3 4, Combined-event probability representations；PDF p.31, g2 sec3 4, Combined-event probability representations
- 第二类证据：PDF §§7.4-7.5 Tree Diagrams, Tables, Outcomes and Probability, printed pp.738-762（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 简单与联立一元一次不等式

- 节点：`sg_sec_math_linear_inequalities` / `pc_b8e922438c5de1840ad2ef00400070be`
- 定义：Solving one-variable linear inequalities, including simultaneous constraints, and representing solution sets on a number line.
- 课程证据：PDF p.17, g3 sec2, Simple linear inequalities；PDF p.19, g3 sec3 4, Compound linear inequalities；PDF p.27, g2 sec2, Simple linear inequalities；PDF p.32, g2 sec5 bridge, Compound linear inequalities
- 第二类证据：PDF §5.3 Linear Inequalities in One Variable, printed pp.356-365（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 放缩与比例作图

- 节点：`sg_sec_math_congruence_similarity_enlargement` / `pc_762c0ab945b9e36ad8fc899b2d596340`
- 定义：Applying a scale factor to enlarge or reduce a plane figure and interpreting distance or area scale in a drawing.
- 课程证据：PDF p.18, g3 sec2, Enlargement and reduction；PDF p.20, g3 sec3 4, Scale drawings, enlargement and reduction；PDF p.30, g2 sec3 4, Scale drawings, enlargement and reduction
- 第二类证据：PDF §§5.4 and 10.3-10.4, printed pp.366-375 and 1019-1051（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 全等与相似基础

- 节点：`sg_sec_math_congruence_similarity_foundations` / `pc_e6ca7a0d3df677d8c407bd47798531d9`
- 定义：Identifying congruent or similar figures and using equality of corresponding angles and proportionality of corresponding sides.
- 课程证据：PDF p.18, g3 sec2, Congruence and similarity foundations；PDF p.28, g2 sec2, Congruence and similarity foundations；PDF p.30, g2 sec3 4, Congruence and similarity problems
- 第二类证据：PDF §§10.3-10.4 Triangles and Polygons, printed pp.1019-1051（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 三角形全等相似判定与尺度比

- 节点：`sg_sec_math_congruence_similarity_tests` / `pc_e2a2524edb746a003e7b535fa8188937`
- 定义：Selecting valid triangle congruence or similarity criteria and applying squared or cubed scale factors to area and volume ratios.
- 课程证据：PDF p.20, g3 sec3 4, Triangle congruence, similarity and scale ratios；PDF p.33, g2 sec5 bridge, Triangle congruence, similarity and scale ratios
- 第二类证据：PDF §8.1-8.2 Non-right Triangles, printed pp.767-805（`src_openstax_precalculus_2e_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 二维坐标中的变量关系表示

- 节点：`sg_sec_math_coordinate_relationships` / `pc_43232f4e8e5445fc6169006d5681f732`
- 定义：Representing ordered pairs and a relationship between two variables in the Cartesian plane before assuming a particular function family.
- 课程证据：PDF p.16, g3 sec1, Coordinates and variable relationships
- 第二类证据：PDF §§1.1 and 2.2, printed pp.7-21 and 189-205（`src_openstax_precalculus_2e_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 累积频数图与箱线图

- 节点：`sg_sec_math_cumulative_box` / `pc_daa080e67e644277c09d3965ff40ef90`
- 定义：Constructing or interpreting cumulative-frequency diagrams and box plots to locate percentiles and compare distributions.
- 课程证据：PDF p.21, g3 sec3 4, Cumulative-frequency and box plots；PDF p.31, g2 sec3 4, Cumulative-frequency and box plots
- 第二类证据：PDF §2.4 Box Plots, printed pp.94-98; cumulative-frequency tables in Chapter 1（`src_openstax_introductory_statistics_2e_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 数据收集、分类与制表

- 节点：`sg_sec_math_data_collection` / `pc_d496e16963961ec00c57f63bdc93ab19`
- 定义：Identifying data sources and variables, collecting observations, classifying values and organising them in a frequency table.
- 课程证据：PDF p.16, g3 sec1, Collecting, classifying and tabulating data；PDF p.26, g2 sec1, Collecting, classifying and tabulating data
- 第二类证据：PDF §8.1 Gathering and Organizing Data, printed pp.816-826（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 点图、直方图与茎叶图

- 节点：`sg_sec_math_distribution_diagrams` / `pc_6d74d544d28698e9d61d7ae1e5691cab`
- 定义：Constructing or interpreting dot plots, histograms and stem-and-leaf plots and judging which representation preserves needed distribution information.
- 课程证据：PDF p.18, g3 sec2, Dot plots, histograms and stem-and-leaf diagrams；PDF p.28, g2 sec2, Dot plots, histograms and stem-and-leaf diagrams
- 第二类证据：PDF §8.2 Visualizing Data, printed pp.827-856（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 初等矩阵表示与运算

- 节点：`sg_sec_math_elementary_matrices` / `pc_565f1698f0475654a9d3e8fe5ce43bf4`
- 定义：Representing and interpreting information in a matrix and applying scalar multiplication, addition, subtraction and matrix multiplication without requiring inverses.
- 课程证据：PDF p.19, g3 sec3 4, Elementary matrix representation and operations；PDF p.32, g2 sec5 bridge, Elementary matrix representation and operations
- 第二类证据：PDF §9.5 Matrices and Matrix Operations, printed pp.946-960（`src_openstax_precalculus_2e_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 几何作图

- 节点：`sg_sec_math_geometric_construction` / `pc_8204d8e8132790908d8ac9cfd08014ca`
- 定义：Constructing simple figures, perpendicular bisectors and angle bisectors from given data with appropriate geometric instruments.
- 课程证据：PDF p.16, g3 sec1, Geometric construction；PDF p.20, g3 sec3 4, Perpendicular and angle bisectors；PDF p.28, g2 sec2, Geometric construction；PDF p.30, g2 sec3 4, Perpendicular and angle bisectors
- 第二类证据：PDF §§10.1-10.3 Points, Lines, Angles and Triangles, printed pp.994-1034（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 一次式与二次式因式分解

- 节点：`sg_sec_math_factorisation` / `pc_f0f451916c42f12800200d683aef2376`
- 定义：Factorising by common factors, grouping and quadratic structure, including ax+bx+kay+kby and ax²+bx+c forms.
- 课程证据：PDF p.17, g3 sec2, Linear and quadratic factorisation；PDF p.27, g2 sec2, Common-factor and quadratic factorisation；PDF p.29, g2 sec3 4, Factorising grouped linear expressions
- 第二类证据：PDF §§3.2-3.5 Quadratic and Polynomial Functions, printed pp.255-325（`src_openstax_precalculus_2e_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 改变公式主项与未知量求值

- 节点：`sg_sec_math_formula_rearrangement` / `pc_93a0d2c5aebad77851a87bb60b75f16b`
- 定义：Rearranging a formula to isolate a specified variable and determining an unknown quantity from the rearranged or original formula.
- 课程证据：PDF p.17, g3 sec2, Changing the subject of a formula；PDF p.29, g2 sec3 4, Changing the subject and evaluating formulae
- 第二类证据：PDF §§5.1-5.2 Algebraic Expressions and Linear Equations, printed pp.334-355（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 可化为二次方程的分式方程

- 节点：`sg_sec_math_fractional_quadratic_equations` / `pc_1a74a0765adb9da5ef0aae6b6558f3b6`
- 定义：Clearing denominators to obtain a quadratic equation and rejecting values that violate the original denominator restrictions.
- 课程证据：PDF p.19, g3 sec3 4, Fractional equations reducible to quadratics；PDF p.29, g2 sec3 4, Fractional equations reducible to quadratics
- 第二类证据：PDF §§3.7 and 9.3, printed pp.340-364 and 925-936（`src_openstax_precalculus_2e_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 整数与分数指数及指数律

- 节点：`sg_sec_math_indices` / `pc_1add3aa204b9f7ebde97168966ddc984`
- 定义：Interpreting positive, zero, negative and fractional indices and applying the laws of indices within their valid domains.
- 课程证据：PDF p.19, g3 sec3 4, Indices and their laws；PDF p.29, g2 sec3 4, Indices and their laws
- 第二类证据：PDF §3.8 Exponents, printed pp.218-226（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 一次式的运算与化简

- 节点：`sg_sec_math_linear_expressions` / `pc_8269caa3a2876c8df937c31ec1fa8cf7`
- 定义：Adding, subtracting, expanding and simplifying linear expressions with integer or fractional coefficients and extracting a common factor.
- 课程证据：PDF p.15, g3 sec1, Operations on linear expressions；PDF p.26, g2 sec1, Operations on linear expressions；PDF p.27, g2 sec2, Linear expressions with fractional coefficients
- 第二类证据：PDF §5.1 Algebraic Expressions, printed pp.334-345（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 含分数形式的一次方程

- 节点：`sg_sec_math_linear_fractional_equations` / `pc_f8029da3342530575f9ea5dae5ddd1f7`
- 定义：Solving linear equations with fractional coefficients and simple fractional equations reducible to a linear equation, while checking denominator restrictions.
- 课程证据：PDF p.16, g3 sec1, Linear and reducible fractional equations；PDF p.27, g2 sec2, Linear and reducible fractional equations
- 第二类证据：PDF §2.1 Linear Functions and §3.7 Rational Functions, printed pp.170-188 and 340-364（`src_openstax_precalculus_2e_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 整数系数一元一次方程

- 节点：`sg_sec_math_linear_integer_equations` / `pc_7a3ed0313c37ee78a2ffc1d5f58fa52d`
- 定义：Solving one-variable linear equations with integer coefficients and checking the resulting value.
- 课程证据：PDF p.26, g2 sec1, Linear equations with integer coefficients
- 第二类证据：PDF §5.2 Linear Equations in One Variable, printed pp.346-355（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 识别误导性统计图

- 节点：`sg_sec_math_misleading_diagrams` / `pc_556fa04ba7f3b979476b0cc147b23720`
- 定义：Explaining how scale, truncated axes, unequal bins, area encoding or omitted context can make a statistical display misleading.
- 课程证据：PDF p.16, g3 sec1, Misleading statistical diagrams；PDF p.26, g2 sec1, Misleading statistical diagrams
- 第二类证据：PDF §8.2 Visualizing Data, printed pp.827-856（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 路程—时间与速度—时间图像

- 节点：`sg_sec_math_motion_data_graphs` / `pc_2773177458caa7328645c0f0d304fbc9`
- 定义：Interpreting slope, intervals and changing quantities in distance-time and speed-time graphs and relating them to a motion context.
- 课程证据：PDF p.14, g3 secondary all, Distance-time and speed-time graphs；PDF p.24, g2 secondary all, Distance-time and speed-time graphs
- 第二类证据：PDF §§1.3 and 2.2, printed pp.27-39 and 189-205（`src_openstax_precalculus_2e_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 用代数通项表示规律

- 节点：`sg_sec_math_nth_term_patterns` / `pc_fa3d1adfea0227a8f6b9c9b24b726304`
- 定义：Recognising a numerical or visual pattern and expressing its nth term algebraically.
- 课程证据：PDF p.15, g3 sec1, Algebraic nth-term patterns；PDF p.26, g2 sec1, Algebraic nth-term patterns
- 第二类证据：PDF §3.10 Arithmetic Sequences, printed pp.239-245（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 百分数表示、比较与变化

- 节点：`sg_sec_math_percentage` / `pc_6c734715b50b77ef6f24871baa834f83`
- 定义：Converting percentage forms, comparing quantities, calculating percentage increase or decrease, reverse percentages and percentage points.
- 课程证据：PDF p.15, g3 sec1, Percentage comparison and change；PDF p.25, g2 sec1, Percentage forms and change
- 第二类证据：PDF §§6.1-6.2 Percent, Discounts, Markups and Sales Tax, printed pp.544-565（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 个人与家庭金融数学

- 节点：`sg_sec_math_personal_finance` / `pc_0035396047335920724c5a50e48736a4`
- 定义：Applying percentages, simple and compound interest, taxes, instalments, utility charges and currency conversion to personal finance decisions.
- 课程证据：PDF p.13, g3 secondary all, Personal and household finance；PDF p.23, g2 secondary all, Personal and household finance
- 第二类证据：PDF Chapter 6 Money Management, printed pp.543-706（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 组合平面图形的周长与面积

- 节点：`sg_sec_math_plane_mensuration` / `pc_2fea18f07e7d3874be1ad3c07a2e7d43`
- 定义：Calculating perimeter and area of parallelograms, trapezia and composite plane figures with consistent units.
- 课程证据：PDF p.16, g3 sec1, Area and composite plane figures；PDF p.26, g2 sec1, Area and composite plane figures
- 第二类证据：PDF §§9.2 and 10.6 Measuring Area, printed pp.952-959 and 1068-1086（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 四边形与多边形性质

- 节点：`sg_sec_math_polygon_properties` / `pc_f6953bbfa35fb2292dad3e721606667a`
- 定义：Classifying special quadrilaterals, using symmetry and calculating interior or exterior angle sums of convex polygons.
- 课程证据：PDF p.16, g3 sec1, Quadrilaterals and regular polygons；PDF p.28, g2 sec2, Quadrilaterals and regular polygons
- 第二类证据：PDF §10.4 Polygons, Perimeter and Circumference, printed pp.1035-1051（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 质因数分解、公因倍数与方根

- 节点：`sg_sec_math_prime_factorisation` / `pc_ef2bd7b2bbab07b9c004309c8f0bae24`
- 定义：Using prime factorisation to determine HCF, LCM, square roots and cube roots where the factorisation method applies.
- 课程证据：PDF p.15, g3 sec1, Prime factorisation, HCF, LCM and roots；PDF p.25, g2 sec1, Prime factorisation, HCF, LCM and roots
- 第二类证据：PDF §3.1 Prime and Composite Numbers, printed pp.128-148（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 勾股定理及逆定理

- 节点：`sg_sec_math_pythagoras` / `pc_cd44c4602467808d0664260064ac2f58`
- 定义：Using the Pythagorean relation to find a side and its converse to determine whether three side lengths form a right triangle.
- 课程证据：PDF p.18, g3 sec2, Pythagoras theorem and converse；PDF p.28, g2 sec2, Pythagoras theorem and converse
- 第二类证据：PDF §§10.3 and 10.8, printed pp.1019-1034 and 1098-1116（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 因式分解法解二次方程

- 节点：`sg_sec_math_quadratic_factorisation_solve` / `pc_178d30f2870e67bdf24249ddba825997`
- 定义：Writing a quadratic expression as factors, applying the zero-product property and checking candidate roots.
- 课程证据：PDF p.17, g3 sec2, Solving quadratics by factorisation；PDF p.29, g2 sec3 4, Solving quadratic equations by standard methods
- 第二类证据：PDF §5.6 Quadratic Equations in One Variable, printed pp.403-426（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 公式、配方与图像法解二次方程

- 节点：`sg_sec_math_quadratic_formula_complete_graph` / `pc_17734ef6df479e2834d50b676271d92d`
- 定义：Solving a quadratic equation by the formula, completing the square or graph intersections without adding discriminant classification as a separate requirement.
- 课程证据：PDF p.19, g3 sec3 4, Solving quadratic equations by standard methods；PDF p.29, g2 sec3 4, Solving quadratic equations by standard methods
- 第二类证据：PDF §5.6 Quadratic Equations in One Variable, printed pp.403-426（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 四分位数、百分位数与离散程度

- 节点：`sg_sec_math_quartiles_spread` / `pc_e27f4d18434be33a5d90fcbf0ac6926c`
- 定义：Determining quartiles and percentiles and using range, interquartile range and standard deviation to describe spread.
- 课程证据：PDF p.21, g3 sec3 4, Quartiles, percentiles and spread；PDF p.31, g2 sec3 4, Quartiles, percentiles and spread
- 第二类证据：PDF §§2.2 and 2.5 Measures of Location and Spread, printed pp.77-93 and 99-111（`src_openstax_introductory_statistics_2e_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 率、路程、时间与速度

- 节点：`sg_sec_math_rate_speed` / `pc_48618600ad3adf13d961a619b532eedd`
- 定义：Relating rate, distance and time, distinguishing constant from average speed and converting compound units.
- 课程证据：PDF p.15, g3 sec1, Rate and speed；PDF p.25, g2 sec1, Distance, time, rate and speed
- 第二类证据：PDF §1.3 Rates of Change and Behavior of Graphs, printed pp.27-39（`src_openstax_precalculus_2e_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 比与按比分配

- 节点：`sg_sec_math_ratio` / `pc_8396d50d2a90e5d83b9dc099398d8ef3`
- 定义：Comparing quantities by ratio, connecting ratios to fractions, simplifying equivalent ratios and dividing a quantity in a given ratio.
- 课程证据：PDF p.15, g3 sec1, Ratios with rational quantities；PDF p.25, g2 sec1, Ratio, fractions and division
- 第二类证据：PDF §5.4 Ratios and Proportions, printed pp.366-375（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 实数运算、数轴与大小关系

- 节点：`sg_sec_math_real_number_operations` / `pc_215f79963d339e5cdffa19299629d2fe`
- 定义：Operating with integers, rational and irrational numbers, ordering real numbers on a number line and expressing comparisons with inequality symbols.
- 课程证据：PDF p.15, g3 sec1, Real-number operations and order；PDF p.25, g2 sec1, Real-number operations and order
- 第二类证据：PDF §§3.2-3.6 Real Number Systems, printed pp.149-210（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 直角三角形三角比

- 节点：`sg_sec_math_right_triangle_trig` / `pc_55b7ab76aeec1ea42cda56f714fc2853`
- 定义：Using sine, cosine and tangent of an acute angle to determine unknown sides or angles in a right triangle.
- 课程证据：PDF p.18, g3 sec2, Trigonometry in right triangles；PDF p.30, g2 sec3 4, Trigonometry in right triangles
- 第二类证据：PDF §10.8 Right Triangle Trigonometry, printed pp.1098-1116（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 地图比例尺与正反比例

- 节点：`sg_sec_math_scale_proportion` / `pc_14da60ce2cc89759b132a22227040e3e`
- 定义：Using distance and area scales and distinguishing direct from inverse proportional relationships in problems.
- 课程证据：PDF p.17, g3 sec2, Map scales and proportion；PDF p.27, g2 sec2, Map scales and proportion
- 第二类证据：PDF §5.4 Ratios and Proportions, printed pp.366-375（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 二维与三维三角问题

- 节点：`sg_sec_math_spatial_trigonometry` / `pc_6ee0bb592a0fde530ae9f3ec96dfd28f`
- 定义：Selecting right- or non-right-triangle methods in multi-step 2D and 3D problems involving elevation, depression and bearings.
- 课程证据：PDF p.20, g3 sec3 4, Two- and three-dimensional trigonometric problems；PDF p.30, g2 sec3 4, Two- and three-dimensional trigonometric problems
- 第二类证据：PDF §§7.2 and 8.1-8.2, printed pp.713-729 and 767-805（`src_openstax_precalculus_2e_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 计算标准差并比较数据集

- 节点：`sg_sec_math_standard_deviation_compare` / `pc_f622b985ca319c5dafccfad432b71c27`
- 定义：Calculating standard deviation for grouped or ungrouped data and comparing datasets jointly by centre and spread.
- 课程证据：PDF p.21, g3 sec3 4, Calculating and comparing standard deviation；PDF p.31, g2 sec3 4, Calculating and comparing standard deviation
- 第二类证据：PDF §8.4 Range and Standard Deviation, printed pp.873-878（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 整数次幂标准式

- 节点：`sg_sec_math_standard_form` / `pc_ba9ab55c8fa45ca1d909474c1482313c`
- 定义：Writing and operating with A×10^n where n is an integer and 1≤A<10.
- 课程证据：PDF p.19, g3 sec3 4, Standard form；PDF p.29, g2 sec3 4, Standard form
- 第二类证据：PDF §3.9 Scientific Notation, printed pp.227-238（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 选择和解释统计表示

- 节点：`sg_sec_math_statistical_representations` / `pc_8c501cd4b04f2e3ab0c424ad09fcc14e`
- 定义：Reading tables, bar charts, pictograms, line graphs and pie charts and selecting a form based on purpose, advantage and limitation.
- 课程证据：PDF p.16, g3 sec1, Reading and choosing statistical representations；PDF p.26, g2 sec1, Reading and choosing statistical representations
- 第二类证据：PDF §8.2 Visualizing Data, printed pp.827-856（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 用切线估计曲线斜率

- 节点：`sg_sec_math_tangent_gradient` / `pc_d15e4876926cc2580ff4808653357b4f`
- 定义：Drawing a tangent at a point on a curve and using its rise-over-run to estimate instantaneous gradient.
- 课程证据：PDF p.19, g3 sec3 4, Estimating curve gradient with a tangent；PDF p.29, g2 sec3 4, Estimating curve gradient with a tangent
- 第二类证据：PDF §1.3 Rates of Change and Behavior of Graphs, printed pp.27-39（`src_openstax_precalculus_2e_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 三角形性质与分类

- 节点：`sg_sec_math_triangle_properties` / `pc_dddd87a5aa9f0d0de98de641d2e71916`
- 定义：Classifying triangles and using their side-angle relationships and basic angle properties.
- 课程证据：PDF p.16, g3 sec1, Triangle properties；PDF p.26, g2 sec1, Triangle properties
- 第二类证据：PDF §10.3 Triangles, printed pp.1019-1034（`src_openstax_contemporary_mathematics_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。

### 任意三角形的三角计算

- 节点：`sg_sec_math_triangle_trigonometry` / `pc_217987a9c88ae06397d8e62abf847891`
- 定义：Extending sine and cosine to obtuse angles and using triangle area, sine rule and cosine rule for non-right triangles.
- 课程证据：PDF p.20, g3 sec3 4, Trigonometry for general triangles；PDF p.30, g2 sec3 4, Trigonometry for general triangles
- 第二类证据：PDF §§8.1-8.2 Law of Sines and Law of Cosines, printed pp.767-805（`src_openstax_precalculus_2e_2026`）
- 复核结论：未找到语义等价且粒度相同的既有 canonical；新增点不自动批准。
