# A-Level 数学 KG 中文审核包

- 图：`a_level_mathematics`
- 官方 syllabus：Cambridge 9709
- 来源：`src_cambridge_9709_2026_2027`
- 状态：`needs_review`，本文件不能作为人工批准记录
- 官方小节：38；逐项要求：153
- 自动信号：候选覆盖 62；部分覆盖 91；歧义 0；未解析 0；已核实 Concept 缺口 0；需技能映射 0

> 版权说明：这里只保存小节标题、页码、关键词、文本指纹和 Primoria 候选映射，不复制 Cambridge syllabus 正文。分数只用于排序，不能作为审核结论。

## 小节覆盖索引

| 官方小节 | Syllabus 页 | 要求数 | Primoria 候选 Topic | 覆盖 / 部分 / 歧义 / 未解析 / Concept 缺口 / 技能 |
|---|---:|---:|---|---:|
| 1.1 Quadratics | 19 | 5 | 二次方程求解与联立方程 (mat_algebra_part1_mat_solve_quadratics)；指数与根式与二次函数 (mat_algebra_part1) | 3 / 2 / 0 / 0 / 0 / 0 |
| 1.2 Functions | 19 | 5 | 不等式与函数与反函数 (mat_algebra_part2)；复合函数、绝对值函数与图像变换 (mat_algebra_part2_mat_composite) | 3 / 2 / 0 / 0 / 0 / 0 |
| 1.3 Coordinate geometry | 20 | 5 | 坐标几何 (mat_coord_geom)；标量积与直线向量方程 (mat_vectors_mat_scalar_product) | 1 / 4 / 0 / 0 / 0 / 0 |
| 1.4 Circular measure | 20 | 2 | 三角学：比值与恒等式 (mat_trig_part1)；力学：连接体、能量与动量 (mat_mech_energy_momentum) | 0 / 2 / 0 / 0 / 0 / 0 |
| 1.5 Trigonometry | 21 | 5 | 三角学：比值与恒等式 (mat_trig_part1)；三角学：方程与公式 (mat_trig_part2) | 2 / 3 / 0 / 0 / 0 / 0 |
| 1.6 Series | 21 | 4 | 等差级数与等比级数 (mat_sequences)；二项展开（正整数）与二项展开（一般指数） (mat_sequences_mat_binomial_pos) | 1 / 3 / 0 / 0 / 0 / 0 |
| 1.7 Differentiation | 22 | 4 | 微分：应用 (mat_differentiation_part2)；隐函数微分与参数微分 (mat_differentiation_adv_mat_implicit) | 0 / 4 / 0 / 0 / 0 / 0 |
| 1.8 Integration | 22 | 4 | 不定积分与定积分与面积 (mat_integration_part1)；积分：进阶技巧 (mat_integration_part2) | 0 / 4 / 0 / 0 / 0 / 0 |
| 2.1 Algebra | 23 | 3 | 三角学：方程与公式 (mat_trig_part2)；复合函数、绝对值函数与图像变换 (mat_algebra_part2_mat_composite) | 3 / 0 / 0 / 0 / 0 / 0 |
| 2.2 Logarithmic and exponential functions | 23 | 4 | 指数函数与对数与法则 (mat_exp_log)；指数与根式与二次函数 (mat_algebra_part1) | 2 / 2 / 0 / 0 / 0 / 0 |
| 2.3 Trigonometry | 24 | 2 | 三角学：比值与恒等式 (mat_trig_part1)；三角学：方程与公式 (mat_trig_part2) | 1 / 1 / 0 / 0 / 0 / 0 |
| 2.4 Differentiation | 24 | 3 | 微分：应用 (mat_differentiation_part2)；隐函数微分与参数微分 (mat_differentiation_adv_mat_implicit) | 3 / 0 / 0 / 0 / 0 / 0 |
| 2.5 Integration | 25 | 3 | 不定积分与定积分与面积 (mat_integration_part1)；标准函数积分与换元积分 (mat_integration_part1_mat_standard_integrals) | 2 / 1 / 0 / 0 / 0 / 0 |
| 2.6 Numerical solution of equations | 25 | 3 | 二次方程求解与联立方程 (mat_algebra_part1_mat_solve_quadratics)；标量积与直线向量方程 (mat_vectors_mat_scalar_product) | 1 / 2 / 0 / 0 / 0 / 0 |
| 3.1 Algebra | 26 | 5 | 三角学：方程与公式 (mat_trig_part2)；复合函数、绝对值函数与图像变换 (mat_algebra_part2_mat_composite) | 5 / 0 / 0 / 0 / 0 / 0 |
| 3.2 Logarithmic and exponential functions | 27 | 4 | 指数函数与对数与法则 (mat_exp_log)；指数与根式与二次函数 (mat_algebra_part1) | 2 / 2 / 0 / 0 / 0 / 0 |
| 3.3 Trigonometry | 27 | 2 | 三角学：比值与恒等式 (mat_trig_part1)；三角学：方程与公式 (mat_trig_part2) | 1 / 1 / 0 / 0 / 0 / 0 |
| 3.4 Differentiation | 28 | 3 | 微分：应用 (mat_differentiation_part2)；隐函数微分与参数微分 (mat_differentiation_adv_mat_implicit) | 2 / 1 / 0 / 0 / 0 / 0 |
| 3.5 Integration | 28 | 6 | 不定积分与定积分与面积 (mat_integration_part1)；积分：进阶技巧 (mat_integration_part2) | 4 / 2 / 0 / 0 / 0 / 0 |
| 3.6 Numerical solution of equations | 29 | 3 | 二次方程求解与联立方程 (mat_algebra_part1_mat_solve_quadratics)；标量积与直线向量方程 (mat_vectors_mat_scalar_product) | 1 / 2 / 0 / 0 / 0 / 0 |
| 3.7 Vectors | 29 | 6 | 向量基础与大小与方向 (mat_vectors)；标准函数积分与换元积分 (mat_integration_part1_mat_standard_integrals) | 2 / 4 / 0 / 0 / 0 / 0 |
| 3.8 Differential equations | 30 | 4 | 建立微分方程与分离变量 (mat_numerical_methods_mat_form_de)；二次方程求解与联立方程 (mat_algebra_part1_mat_solve_quadratics) | 1 / 3 / 0 / 0 / 0 / 0 |
| 3.9 Complex numbers | 30 | 8 | 模角形式与复数根与轨迹 (mat_complex_mat_mod_arg)；复数运算与阿根图 (mat_complex) | 5 / 3 / 0 / 0 / 0 / 0 |
| 4.1 Forces and equilibrium | 31 | 7 | 力、平衡与接触模型 (mat_mech_forces)；质量、重量与牛顿定律 (mat_mech_dynamics) | 2 / 5 / 0 / 0 / 0 / 0 |
| 4.2 Kinematics of motion in a straight line | 32 | 4 | 运动学 (mat_mech_kinematics)；坐标几何 (mat_coord_geom) | 2 / 2 / 0 / 0 / 0 / 0 |
| 4.3 Momentum | 32 | 2 | 力学：连接体、能量与动量 (mat_mech_energy_momentum)；二次方程求解与联立方程 (mat_algebra_part1_mat_solve_quadratics) | 0 / 2 / 0 / 0 / 0 / 0 |
| 4.4 Newton’s laws of motion | 33 | 4 | 质量、重量与牛顿定律 (mat_mech_dynamics)；指数函数与对数与法则 (mat_exp_log) | 2 / 2 / 0 / 0 / 0 / 0 |
| 4.5 Energy, work and power | 33 | 5 | 力学：连接体、能量与动量 (mat_mech_energy_momentum)；微分：法则与技巧 (mat_differentiation_part1) | 1 / 4 / 0 / 0 / 0 / 0 |
| 5.1 Representation of data | 34 | 5 | 数据、计数与概率 (mat_data_counting_prob)；抽样、估计与假设检验 (mat_normal_inference_mat_sampling) | 0 / 5 / 0 / 0 / 0 / 0 |
| 5.2 Permutations and combinations | 34 | 2 | 数据、计数与概率 (mat_data_counting_prob)；微分：法则与技巧 (mat_differentiation_part1) | 1 / 1 / 0 / 0 / 0 / 0 |
| 5.3 Probability | 35 | 4 | 概率与离散随机变量 (mat_prob_random_vars)；数据、计数与概率 (mat_data_counting_prob) | 2 / 2 / 0 / 0 / 0 / 0 |
| 5.4 Discrete random variables | 35 | 3 | 概率与离散随机变量 (mat_prob_random_vars)；随机变量与分布 (mat_random_vars) | 1 / 2 / 0 / 0 / 0 / 0 |
| 5.5 The normal distribution | 36 | 3 | 正态分布与正态近似 (mat_normal_inference)；随机变量与分布 (mat_random_vars) | 0 / 3 / 0 / 0 / 0 / 0 |
| 6.1 The Poisson distribution | 37 | 5 | 随机变量与分布 (mat_random_vars)；正态分布与正态近似 (mat_normal_inference) | 1 / 4 / 0 / 0 / 0 / 0 |
| 6.2 Linear combinations of random variables | 37 | 1 | 随机变量与分布 (mat_random_vars)；概率与离散随机变量 (mat_prob_random_vars) | 0 / 1 / 0 / 0 / 0 / 0 |
| 6.3 Continuous random variables | 38 | 2 | 连续随机变量与概率密度 (mat_continuous_probability)；随机变量与分布 (mat_random_vars) | 2 / 0 / 0 / 0 / 0 / 0 |
| 6.4 Sampling and estimation | 38 | 8 | 抽样、估计与假设检验 (mat_normal_inference_mat_sampling)；不等式与函数与反函数 (mat_algebra_part2) | 3 / 5 / 0 / 0 / 0 / 0 |
| 6.5 Hypothesis tests | 39 | 5 | 抽样、估计与假设检验 (mat_normal_inference_mat_sampling)；标量积与直线向量方程 (mat_vectors_mat_scalar_product) | 0 / 5 / 0 / 0 / 0 / 0 |

## 待人工判断项

| 定位 | 类型 | Syllabus 页 | 关键词 | 候选或相关概念 | 信号 |
|---|---|---:|---|---|---|
| 1.1 outcome 2 | concept | 19 | ax2, bx, discriminant, root, equation, find, included, knowledge | 二次方程求解 (mat_solve_quadratics，已抽样核验) | candidate_partial |
| 1.1 outcome 5 | concept_and_skill | 19 | 5x2, equation, function, quadratic, recognise, solve, some, tan2 | 二次方程求解 (mat_solve_quadratics，已抽样核验) | candidate_partial |
| 1.2 outcome 2 | concept | 19 | range, function, given, can, cases, composite, composition, condition | 函数与反函数 (mat_functions，已抽样核验) | candidate_partial |
| 1.2 outcome 4 | concept | 19 | one, between, function, graphical, illustrate, include, indication, inverse | 函数与反函数 (mat_functions，已抽样核验) | candidate_partial |
| 1.3 outcome 2 | concept | 20 | gradients, any, ax, between, calculations, distances, forms, interpret | 直线 (mat_straight_lines，已抽样核验) | candidate_partial |
| 1.3 outcome 3 | concept | 20 | 2fy, 2gx, centre, circle, equation, expanded, form, r2 | 圆 (mat_circles，已抽样核验) | candidate_partial |
| 1.3 outcome 4 | concept_and_skill | 20 | circles, algebraic, angle, differentiation, elementary, geometrical, implicit, included | 直线 (mat_straight_lines，已抽样核验) | candidate_partial |
| 1.3 outcome 5 | concept | 20 | between, equation, relationship, algebraic, associated, curve, does, graph | 二次方程求解 (mat_solve_quadratics，已抽样核验) | candidate_partial |
| 1.4 outcome 1 | concept | 20 | between, definition, degrees, radian, radians, relationship | 弧度制 (mat_radians，已抽样核验) | candidate_partial |
| 1.4 outcome 2 | concept | 20 | triangles, angles, arc, area, areas, calculation, circle, concerning | 弧度制 (mat_radians，已抽样核验) | candidate_partial |
| 1.5 outcome 1 | concept_and_skill | 21 | 3sinx, angles, any, cos2x, cosine, degrees, either, functions | 三角函数与图像 (mat_trig_ratios，已抽样核验) | candidate_partial |
| 1.5 outcome 3 | concept | 21 | functions, inverse, but, cos, denote, examples, expected, knowledge | 函数与反函数 (mat_functions，已抽样核验) | candidate_partial |
| 1.5 outcome 4 | concept | 21 | cos, identities, sin, equation, expressions, proving, simplifying, solving | 三角恒等式 (mat_trig_identities，已抽样核验) | candidate_partial |
| 1.6 outcome 1 | concept | 21 | coefficients, expansion, greatest, integer, knowledge, notations, positive, properties | 二项展开（正整数） (mat_binomial_pos，已抽样核验) | candidate_partial |
| 1.6 outcome 3 | concept_and_skill | 21 | progression, arithmetic, equivalent, geometric, if, 2b, ac, b2 | 等差级数 (mat_arithmetic，已抽样核验) | candidate_partial |
| 1.6 outcome 4 | concept | 21 | geometric, progression, condition, convergence, convergent, formula, infinity, sum | 等比级数 (mat_geometric，已抽样核验) | candidate_partial |
| 1.7 outcome 1 | concept | 22 | curve, first, gradient, limit, at, chord, chords, consideration | 从原理求导 (mat_first_principles，已抽样核验) | candidate_partial |
| 1.7 outcome 2 | concept | 22 | functions, any, chain, composite, constant, derivative, differences, find | 幂法则 (mat_power_rule，已抽样核验) | candidate_partial |
| 1.7 outcome 3 | concept | 22 | change, increase, rate, rates, area, circle, connected, decreasing | 相关变化率 (mat_rates，已抽样核验) | candidate_partial |
| 1.7 outcome 4 | concept | 22 | points, stationary, about, alternatives, derivative, graphs, identifying, included | 极值点 (mat_stationary，已抽样核验) | candidate_partial |
| 1.8 outcome 1 | concept | 22 | any, ax, constant, differences, differentiation, except, integrate, integration | 不定积分 (mat_indefinite，已抽样核验) | candidate_partial |
| 1.8 outcome 2 | concept_and_skill | 22 | constant, curve, equation, evaluation, find, integration, involving, problems | 不定积分 (mat_indefinite，已抽样核验) | candidate_partial |
| 1.8 outcome 3 | concept | 22 | integrals, cases, definite, evaluate, improper, simple, such | 定积分与面积 (mat_definite_area，已抽样核验) | candidate_partial |
| 1.8 outcome 4 | concept | 22 | between, region, about, axes, axis, bounded, curve, revolution | 定积分与面积 (mat_definite_area，已抽样核验) | candidate_partial |
| 2.2 outcome 2 | concept | 23 | both, definition, ekx, ex, functions, graph, graphs, inverse | 指数函数 (mat_exp_func，已抽样核验) | candidate_partial |
| 2.2 outcome 3 | concept_and_skill | 23 | appears, equation, indices, inequalities, logarithms, solve, unknown, which | 解指数与对数方程 (mat_solve_exp，已抽样核验) | candidate_partial |
| 2.3 outcome 1 | concept | 24 | functions, angles, any, cosecant, cosine, cotangent, graphs, magnitude | 三角函数与图像 (mat_trig_ratios，已抽样核验) | candidate_partial |
| 2.5 outcome 1 | concept | 25 | ax, integration, cos, differentiation, eax, extend, general, idea | 标准函数积分 (mat_standard_integrals，已抽样核验) | candidate_partial |
| 2.6 outcome 2 | concept | 25 | approximations, converges, equation, idea, notation, root, sequence, which | 迭代法 (mat_iteration，已抽样核验) | candidate_partial |
| 2.6 outcome 3 | concept | 25 | given, iteration, equation, xn, accuracy, based, being, but | 迭代法 (mat_iteration，已抽样核验) | candidate_partial |
| 3.2 outcome 2 | concept | 27 | both, definition, ekx, ex, functions, graph, graphs, inverse | 指数函数 (mat_exp_func，已抽样核验) | candidate_partial |
| 3.2 outcome 3 | concept_and_skill | 27 | appears, equation, indices, inequalities, logarithms, solve, unknown, which | 解指数与对数方程 (mat_solve_exp，已抽样核验) | candidate_partial |
| 3.3 outcome 1 | concept | 27 | functions, angles, any, cosecant, cosine, cotangent, graphs, magnitude | 三角函数与图像 (mat_trig_ratios，已抽样核验) | candidate_partial |
| 3.4 outcome 1 | concept | 28 | derivatives, composites, constant, cos, cosx, differences, ex, lnx | 特殊函数导数 (mat_special_derivatives，已抽样核验) | candidate_partial |
| 3.5 outcome 1 | concept | 28 | ax, cos, differentiation, eax, examples, extend, idea, include | 标准函数积分 (mat_standard_integrals，已抽样核验) | candidate_partial |
| 3.5 outcome 4 | concept | 28 | fl, form, functions, integrand, integrate, integration, recognise, such | 标准函数积分 (mat_standard_integrals，已抽样核验) | candidate_partial |
| 3.6 outcome 2 | concept | 29 | approximations, converges, equation, idea, notation, root, sequence, which | 迭代法 (mat_iteration，已抽样核验) | candidate_partial |
| 3.6 outcome 3 | concept_and_skill | 29 | given, iteration, equation, xn, accuracy, based, being, but | 迭代法 (mat_iteration，已抽样核验) | candidate_partial |
| 3.7 outcome 2 | concept | 29 | oa, ob, vector, ab, addition, but, carry, equivalent | 向量基础 (mat_vector_basics，已抽样核验) | candidate_partial |
| 3.7 outcome 3 | concept_and_skill | 29 | vectors, calculate, dimensions, displacement, magnitude, position, unit, vector | 大小与方向 (mat_vector_magnitude，已抽样核验) | candidate_partial |
| 3.7 outcome 5 | concept | 29 | lines, two, skew, required, also, between, calculation, common | 直线向量方程 (mat_vector_lines，已抽样核验) | candidate_partial |
| 3.7 outcome 6 | concept_and_skill | 29 | finding, lines, product, scalar, two, 3d, angle, between | 标量积 (mat_scalar_product，已抽样核验) | candidate_partial |
| 3.8 outcome 1 | concept | 30 | change, constant, differential, equation, evaluation, formulate, included, introduction | 建立微分方程 (mat_form_de，已抽样核验) | candidate_partial |
| 3.8 outcome 3 | concept | 30 | condition, find, initial, particular, solution | 分离变量 (mat_separation，已抽样核验) | candidate_partial |
| 3.8 outcome 4 | concept | 30 | equation, context, differential, being, interpret, knowledge, life, model | 建立微分方程 (mat_form_de，已抽样核验) | candidate_partial |
| 3.9 outcome 1 | concept | 30 | complex, argument, equal, if, imaginary, interval, number, part | 复数运算 (mat_complex_arith，已抽样核验) | candidate_partial |
| 3.9 outcome 6 | concept | 30 | root, square, 12i, cartesian, complex, details, exact, find | 复数运算 (mat_complex_arith，已抽样核验) | candidate_partial |
| 3.9 outcome 7 | concept | 30 | complex, adding, conjugating, dividing, effects, geometrical, multiplying, number | 复数运算 (mat_complex_arith，已抽样核验) | candidate_partial |
| 4.1 outcome 1 | concept | 31 | acting, diagram, drawing, force, forces, given, identify, situation | 力与平衡 (mat_forces_equilibrium，已抽样核验) | candidate_partial |
| 4.1 outcome 2 | concept | 31 | always, approximate, calculations, components, drawing, find, force, nature | 力与平衡 (mat_forces_equilibrium，已抽样核验) | candidate_partial |
| 4.1 outcome 4 | concept | 31 | component, two, between, can, components, contact, force, frictional | 摩擦 (mat_friction，已抽样核验) | candidate_partial |
| 4.1 outcome 6 | concept | 31 | limiting, equilibrium, friction, about, appropriate, coefficient, concepts, definition | 摩擦 (mat_friction，已抽样核验) | candidate_partial |
| 4.1 outcome 7 | concept | 31 | exerted, force, ground, on, particle, equal, law, newton | 牛顿运动定律 (mat_newton_laws，已抽样核验) | candidate_partial |
| 4.2 outcome 1 | concept | 32 | quantity, speed, acceleration, concepts, context, deceleration, decreasing, dimension | 匀加速运动 (mat_kin_constant，已抽样核验) | candidate_partial |
| 4.2 outcome 2 | concept_and_skill | 32 | time, velocity, displacement, graph, represents, gradient, graphs, acceleration | 匀加速运动 (mat_kin_constant，已抽样核验) | candidate_partial |
| 4.3 outcome 1 | concept | 32 | definition, dimension, linear, momentum, motion, nature, one, only | 动量与冲量 (mat_momentum_impulse，已抽样核验) | candidate_partial |
| 4.3 outcome 2 | concept_and_skill | 32 | bodies, impact, direct, two, coalesce, coefficient, conservation, impulse | 动量与冲量 (mat_momentum_impulse，已抽样核验) | candidate_partial |
| 4.4 outcome 1 | concept | 33 | motion, constant, forces, action, air, any, connecting, considered | 牛顿运动定律 (mat_newton_laws，已抽样核验) | candidate_partial |
| 4.4 outcome 3 | concept_and_skill | 33 | plane, acceleration, moving, motion, on, particle, while, constant | 匀加速运动 (mat_kin_constant，已抽样核验) | candidate_partial |
| 4.5 outcome 1 | concept_and_skill | 33 | force, done, work, application, calculate, concept, constant, cos | 功、能、功率 (mat_work_energy_power，已抽样核验) | candidate_partial |
| 4.5 outcome 2 | concept | 33 | energy, appropriate, concepts, formulae, gravitational, kinetic, potential | 功、能、功率 (mat_work_energy_power，已抽样核验) | candidate_partial |
| 4.5 outcome 4 | concept | 33 | force, power, velocity, work, acting, at, average, between | 功、能、功率 (mat_work_energy_power，已抽样核验) | candidate_partial |
| 4.5 outcome 5 | concept_and_skill | 33 | acceleration, against, car, example, hill, instantaneous, involving, moving | 牛顿运动定律 (mat_newton_laws，已抽样核验) | candidate_partial |
| 5.1 outcome 1 | concept | 34 | advantages, data, disadvantages, discuss, have, particular, presenting, raw | 数据表示 (mat_data_rep，已抽样核验) | candidate_partial |
| 5.1 outcome 2 | concept_and_skill | 34 | back, diagrams, leaf, stem, box, cumulative, draw, frequency | 数据表示 (mat_data_rep，已抽样核验) | candidate_partial |
| 5.1 outcome 3 | concept | 34 | range, central, comparing, contrasting, data, deviation, different, interquartile | 中心趋势与离散 (mat_central_spread，已抽样核验) | candidate_partial |
| 5.1 outcome 4 | concept | 34 | above, below, between, cumulative, distribution, estimate, frequency, given | 数据表示 (mat_data_rep，已抽样核验) | candidate_partial |
| 5.1 outcome 5 | concept_and_skill | 34 | data, totals, calculate, coded, deviation, either, given, grouped | 中心趋势与离散 (mat_central_spread，已抽样核验) | candidate_partial |
| 5.2 outcome 2 | concept_and_skill | 34 | people, about, line, must, number, objects, questions, stand | 排列组合 (mat_perm_comb，已抽样核验) | candidate_partial |
| 5.3 outcome 1 | concept | 35 | balls, at, bag, calculation, cases, colours, combination, containing | 排列组合 (mat_perm_comb，已抽样核验) | candidate_partial |
| 5.3 outcome 3 | concept | 35 | events, independent, comparing, determination, exclusive, meaning, values, whether | 概率法则 (mat_prob_rules，已抽样核验) | candidate_partial |
| 5.4 outcome 2 | concept | 35 | distributions, geo, binomial, denotes, distribution, formulae, geometric, models | 二项分布 (mat_binomial_dist，已抽样核验) | candidate_partial |
| 5.4 outcome 3 | concept | 35 | distribution, expectation, formulae, binomial, geometric, proofs, required, variance | 二项分布 (mat_binomial_dist，已抽样核验) | candidate_partial |
| 5.5 outcome 1 | concept | 36 | normal, distribution, continuous, curves, distributions, illustrate, model, probability | 正态分布 (mat_normal_dist，已抽样核验) | candidate_partial |
| 5.5 outcome 2 | concept_and_skill | 36 | finding, given, probability, related, value, x1, between, calculations | 正态分布 (mat_normal_dist，已抽样核验) | candidate_partial |
| 5.5 outcome 3 | concept | 36 | approximation, distribution, binomial, both, can, conditions, continuity, correction | 正态近似 (mat_normal_approx，已抽样核验) | candidate_partial |
| 6.1 outcome 1 | concept_and_skill | 37 | calculate, distribution, formulae, po, probability | 泊松分布 (mat_poisson，已抽样核验) | candidate_partial |
| 6.1 outcome 2 | concept | 37 | each, equal, fact, if, mean, po, proofs, required | 泊松分布 (mat_poisson，已抽样核验) | candidate_partial |
| 6.1 outcome 4 | concept | 37 | distribution, appropriate, approximately, approximation, binomial, conditions, known, large | 泊松分布 (mat_poisson，已抽样核验) | candidate_partial |
| 6.1 outcome 5 | concept | 37 | distribution, appropriate, approximately, approximation, condition, continuity, correction, known | 正态近似 (mat_normal_approx，已抽样核验) | candidate_partial |
| 6.2 outcome 1 | concept | 37 | ax, var, distribution, has, if, independent, normal, then | 离散随机变量 (mat_discrete_rv，已抽样核验) | candidate_partial |
| 6.4 outcome 1 | concept | 38 | appreciate, between, choosing, distinction, necessity, population, randomness, sample | 抽样 (mat_sampling，已抽样核验) | candidate_partial |
| 6.4 outcome 2 | concept | 38 | sampling, random, elementary, given, knowledge, method, methods, numbers | 抽样 (mat_sampling，已抽样核验) | candidate_partial |
| 6.4 outcome 3 | concept | 38 | can, facts, mean, random, recognise, regarded, sample, var | 抽样 (mat_sampling，已抽样核验) | candidate_partial |
| 6.4 outcome 4 | concept | 38 | distribution, has, normal, fact, if | 正态分布 (mat_normal_dist，已抽样核验) | candidate_partial |
| 6.4 outcome 5 | concept | 38 | central, limit, sample, theorem, appropriate, approximately, clt, distribution | 抽样 (mat_sampling，已抽样核验) | candidate_partial |
| 6.5 outcome 1 | concept | 39 | hypothesis, region, tailed, terms, test, tests, acceptance, alternative | 假设检验 (mat_hypothesis，已抽样核验) | candidate_partial |
| 6.5 outcome 2 | concept | 39 | binomial, distribution, poisson, appropriate, approximation, carry, context, direct | 假设检验 (mat_hypothesis，已抽样核验) | candidate_partial |
| 6.5 outcome 3 | concept | 39 | population, where, carry, cases, concerning, distributed, formulate, hypotheses | 假设检验 (mat_hypothesis，已抽样核验) | candidate_partial |
| 6.5 outcome 4 | concept | 39 | error, type, hypothesis, ii, relation, terms, tests | 假设检验 (mat_hypothesis，已抽样核验) | candidate_partial |
| 6.5 outcome 5 | concept_and_skill | 39 | probability, type, based, binomial, calculate, direct, distribution, errors | 假设检验 (mat_hypothesis，已抽样核验) | candidate_partial |

## 现有 KG 中未被高置信命中的概念

- 指数与根式（Indices and Surds，`mat_indices_surds`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 不等式（Inequalities，`mat_inequalities`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 复合函数（Composite Functions，`mat_composite`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 平行与垂直直线（Parallel and Perpendicular Lines，`mat_parallel_perp`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 圆（Circles，`mat_circles`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 等比级数（Geometric Series，`mat_geometric`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 二项展开（正整数）（Binomial Expansion (positive integer)，`mat_binomial_pos`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 弧度制（Radian Measure，`mat_radians`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 倍角与和差公式（Compound and Double Angle Formulae，`mat_double_angle`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- R 公式（R-Formula，`mat_rform`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 指数函数（Exponential Functions，`mat_exp_func`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 解指数与对数方程（Solving Exponential and Log Equations，`mat_solve_exp`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 从原理求导（Differentiation from First Principles，`mat_first_principles`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 幂法则（Power Rule，`mat_power_rule`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 链式法则（Chain Rule，`mat_chain_rule`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 切线与法线（Tangents and Normals，`mat_tangent_normal`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 极值点（Stationary Points，`mat_stationary`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 相关变化率（Connected Rates of Change，`mat_rates`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 隐函数微分（Implicit Differentiation，`mat_implicit`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 不定积分（Indefinite Integration，`mat_indefinite`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 定积分与面积（Definite Integration and Area，`mat_definite_area`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 旋转体体积（Volumes of Revolution，`mat_volumes`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 迭代法（Iterative Methods，`mat_iteration`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 建立微分方程（Forming Differential Equations，`mat_form_de`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 大小与方向（Magnitude and Direction，`mat_vector_magnitude`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 标量积（Scalar Product，`mat_scalar_product`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 抛体运动（Projectiles，`mat_projectiles`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 摩擦（Friction，`mat_friction`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 牛顿运动定律（Newton's Laws of Motion，`mat_newton_laws`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 动量与冲量（Momentum and Impulse，`mat_momentum_impulse`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 数据表示（Representation of Data，`mat_data_rep`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 中心趋势与离散（Central Tendency and Spread，`mat_central_spread`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 二项分布（Binomial Distribution，`mat_binomial_dist`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 几何分布（Geometric Distribution，`mat_geometric_dist`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 正态分布（Normal Distribution，`mat_normal_dist`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 正态近似（Normal Approximations，`mat_normal_approx`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 抽样（Sampling，`mat_sampling`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 假设检验（Hypothesis Testing，`mat_hypothesis`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。

## 审核规则

1. 打开来源页和对应 syllabus 页核对原文。
2. 将每项标记为覆盖、部分覆盖、缺失或排除，并写明理由。
3. 只有人工确认后，才可修改正式 KG 的 evidence_refs/review_status。
4. 新增、删除、合并或先修边调整必须单独形成变更记录。
