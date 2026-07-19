# 中国高中数学 KG 缺口实施复核（中文）

- 复核日期：2026-07-19
- 缺口解析：101 项
- 直接复用现有 canonical：29 项
- 新增或建立 jurisdiction alias：64 项
- 分流到教学/评测知识：8 项
- 新图节点：70 个 Concept，27 个 Topic，46 条待审先修边
- 状态：全部保持 `needs_review`；本轮为 AI 人工式复核，不伪造 human approval decision。

## 关键纠错

1. 原缺口表漏检 `Bisection Method`：统一 KG 已有 `pc_d14f06a56976778d0616245d88284721`，已改为复用。
2. 原缺口表漏检 `Linear Regression Model`：统一 KG 已有 `pc_ed18cde6c3d7e08e9e371061418a7424`，已改为复用。
3. 一般 Chain Rule 仍不替代课标限定的 `f(ax+b)` 简单复合求导；保留独立窄概念。
4. 平面投影与空间投影共享同一数学定义和 canonical ID，避免重复建点。
5. 抛物线/双曲线、函数单调性/最值、空间平行/垂直性质与判定均按独立出题粒度拆分。
6. 原二级证据曾把基本不等式、斜二测画法和全概率公式指向不直接支持结论的资料；已分别改为人教版数学5 §3.4、人教社斜二测教学设计和 Berkeley CS70 Note 14 §3-§3.2。
7. 原“复数四则运算不含共轭”范围不成立：复数除法可使用共轭因子。现已纠正描述，并与 A-Level `Complex Number Arithmetic` 共用 `pc_84fa9a959816d2fd778aec459c7e0020`，不再制造重复 canonical ID。
8. 复数加减的几何意义改用 MIT Strang Calculus Chapter 9 §9.4（printed pp.425-426）直接证据，不再用泛化的极坐标章节代替。
9. 逐条检查 30 个根概念：它们是独立主题入口，或其前置知识由本轮复用的外部 canonical 概念承担；未用课程顺序伪造先修边。

## 双类权威证据

每个新建 Concept 同时包含中国教育部课程标准页码级证据，以及 OpenStax、MIT OCW、Berkeley CS70 或人民教育出版社中直接支持该表述的第二类证据。所有已核验来源均登记 SHA-256；受版权限制资料只提交元数据和精确定位，不提交正文。

## 逐项解析

| # | 原缺口 | 解析动作 | canonical IDs | 新节点/实践项 | 复核理由 |
|---:|---|---|---|---|---|
| 1 | 集合、元素与表示 | `add_or_alias_concepts` | `pc_f9729a6d15dc682f677a3ab91f6b39d4` | `cn_sh_math_set_membership_representation` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 2 | 集合关系、全集与空集 | `add_or_alias_concepts` | `pc_63e1c41b5a34e8ad98170b678d0a1387` | `cn_sh_math_set_relations_special_sets` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 3 | 集合基本运算 | `add_or_alias_concepts` | `pc_a28a2c466a40fba9dbb862c5b26631d7` | `cn_sh_math_set_operations` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 4 | Venn 图表达 | `add_or_alias_concepts` | `pc_c1ed59c17771ca7dfcca90c7c55fadc1` | `cn_sh_math_venn_diagrams` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 5 | 必要、充分与充要条件 | `add_or_alias_concepts` | `pc_19a11c9b22457a598968483fe980764b` | `cn_sh_math_logical_conditions` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 6 | 量词命题及其否定 | `add_or_alias_concepts` | `pc_8962bef26df2340d5287b935038f2558` | `cn_sh_math_quantifiers_negation` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 7 | 不等式概念与性质 | `add_or_alias_concepts` | `pc_aae485f1637bdc81f7067c35dde3bef6` | `cn_sh_math_inequality_properties` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 8 | 基本不等式与最值 | `add_or_alias_concepts` | `pc_184e9cd37fc2cb53ccf90c19cab834d8` | `cn_sh_math_basic_inequality_optimization` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 9 | 二次函数图像与方程实根 | `reuse_existing` | `pc_133d40fa0e72c29c5eb6ec7a9852c80c`<br>`pc_2d2287436b31a462805b82876a1bc513`<br>`pc_e1ed93beb5e81e2b78ce90172be70927` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 10 | 一元二次不等式 | `reuse_existing` | `pc_133d40fa0e72c29c5eb6ec7a9852c80c`<br>`pc_4307437065fb6fce9aa3b4c05e7ed82d` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 11 | 函数、方程与不等式联系 | `reuse_existing` | `pc_133d40fa0e72c29c5eb6ec7a9852c80c`<br>`pc_2d2287436b31a462805b82876a1bc513`<br>`pc_4307437065fb6fce9aa3b4c05e7ed82d` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 12 | 函数概念、要素与定义域 | `reuse_existing` | `pc_d547d8eb03df4b28cc0357c7cae1d164` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 13 | 函数的表示方法 | `add_or_alias_concepts` | `pc_1abd7d45eab051de2e62001ebd63bd29` | `cn_sh_math_function_representations` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 14 | 分段函数 | `add_or_alias_concepts` | `pc_0ddde34f5a5afbdc4685665038267156` | `cn_sh_math_piecewise_functions` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 15 | 函数单调性与最值 | `add_or_alias_concepts` | `pc_9abfc4bcaa6851c3fc5391a79ee13004`<br>`pc_074dbbcc90f3e6e537ee800002487ba7` | `cn_sh_math_function_monotonicity`<br>`cn_sh_math_function_extrema` | 原课程成果包含多个可独立出题诊断的知识点，已按最小诊断粒度拆分并保留同一成果映射。 |
| 16 | 函数奇偶性 | `add_or_alias_concepts` | `pc_9b78e9d12272cec7c1b044cf8764b84a` | `cn_sh_math_function_parity` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 17 | 函数周期性 | `add_or_alias_concepts` | `pc_72496adc94c0a591f57930a8a062338c` | `cn_sh_math_function_periodicity` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 18 | 幂函数 | `add_or_alias_concepts` | `pc_a36a0e32990824d34dc04d553ec0dc45` | `cn_sh_math_power_functions` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 19 | 实数指数幂及运算性质 | `add_or_alias_concepts` | `pc_0d9df5ce33dc2574f492f6528f380ffa` | `cn_sh_math_real_exponents_laws` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 20 | 对数与对数函数 | `add_or_alias_concepts` | `pc_3845a20537e66fc1506222d98752aa3d`<br>`pc_e1d320d8e044c96c4d56792624b1e685` | `cn_sh_math_logarithmic_function_behavior` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 21 | 指数函数与对数函数互逆 | `reuse_existing` | `pc_d547d8eb03df4b28cc0357c7cae1d164`<br>`pc_3845a20537e66fc1506222d98752aa3d`<br>`pc_81e5444941a3e64858bae20e97e58cf8` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 22 | 任意角与弧度制 | `reuse_existing` | `pc_249bb1a239e11b22bde8356cc52a08a0` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 23 | 三角函数性质与诱导公式 | `add_or_alias_concepts` | `pc_c756deb603e99d7fbb680d46214248e8`<br>`pc_8adf13a8bdba5b3bf91f59d23e0bfd43` | `cn_sh_math_trig_reduction_formulas` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 24 | 正弦型函数参数 | `reuse_existing` | `pc_c756deb603e99d7fbb680d46214248e8`<br>`pc_1aaf98f8144a2f3b3fae833eb1370db8` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 25 | 三角恒等变换 | `add_or_alias_concepts` | `pc_deafae3a3962b29dc66b867691e8957e`<br>`pc_abd2410d819fd0126e356cacadbbe4ac`<br>`pc_2a9323cc28f9abfbb2171fbf1866c1d7` | `cn_sh_math_trig_product_sum_half_angle` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 26 | 三角函数建模 | `add_or_alias_concepts` | `pc_c756deb603e99d7fbb680d46214248e8`<br>`pc_432f6e31350cbefe8de68398ab907582` | `cn_sh_math_trig_modelling` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 27 | 函数零点与方程解 | `reuse_existing` | `pc_e1ed93beb5e81e2b78ce90172be70927` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 28 | 二分法求方程近似解 | `reuse_existing` | `pc_e1ed93beb5e81e2b78ce90172be70927`<br>`pc_d14f06a56976778d0616245d88284721` | — | 全库反向查重确认 MIT 数值分析图已有二分法 canonical 概念；原候选为漏检，不再重复建点。 |
| 29 | 选择函数模型 | `add_or_alias_concepts` | `pc_f6592e5f1b68ea3b26ca39779c0b28d9` | `cn_sh_math_choose_function_models` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 30 | 比较函数增长速度 | `add_or_alias_concepts` | `pc_81e5444941a3e64858bae20e97e58cf8`<br>`pc_3845a20537e66fc1506222d98752aa3d`<br>`pc_121d75d21e3d60388c331b791cb51454` | `cn_sh_math_compare_growth_rates` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 31 | 函数模型参数解释 | `add_or_alias_concepts` | `pc_cf2cd50926224dd7b501720474116d45` | `cn_sh_math_interpret_model_parameters` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 32 | 平面向量概念与表示 | `reuse_existing` | `pc_9ae5f17312ee21050edf3e4bd9b005a2`<br>`pc_64e61e1cee5471619fa54db48800b916` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 33 | 平面向量线性运算 | `reuse_existing` | `pc_9ae5f17312ee21050edf3e4bd9b005a2` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 34 | 平面向量数量积、投影与垂直 | `add_or_alias_concepts` | `pc_3e68cc383e695a3ae1773f286b5221f3`<br>`pc_b70bbfb827c2b527f128f02bf360675e` | `cn_sh_math_vector_projection` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 35 | 平面向量基本定理与坐标 | `add_or_alias_concepts` | `pc_9ae5f17312ee21050edf3e4bd9b005a2`<br>`pc_b6cdf73ef35e6e93376d1e6a2bd60b8f` | `cn_sh_math_plane_vector_basis_coordinates` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 36 | 平面向量坐标运算 | `reuse_existing` | `pc_9ae5f17312ee21050edf3e4bd9b005a2`<br>`pc_3e68cc383e695a3ae1773f286b5221f3` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 37 | 平面向量应用 | `add_or_alias_concepts` | `pc_9ae5f17312ee21050edf3e4bd9b005a2`<br>`pc_3e68cc383e695a3ae1773f286b5221f3`<br>`pc_08974dd9a6e44fc3fbcacdb999e75f58` | `cn_sh_math_vector_applications` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 38 | 正弦定理与余弦定理 | `add_or_alias_concepts` | `pc_e62097020611844e72491ccab9cc29d4` | `cn_sh_math_sine_cosine_laws` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 39 | 复数与数系扩充 | `add_or_alias_concepts` | `pc_a2d1c2c86661b6706ceb2919619b89e5` | `cn_sh_math_complex_introduction` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 40 | 复数代数与几何表示 | `add_or_alias_concepts` | `pc_4fd2ad2b9b71d4427e9ebeb4d81159ec`<br>`pc_8b0b34fcb52404046ccbf41b402895fd` | `cn_sh_math_complex_algebraic_representation`<br>`cn_sh_math_complex_argand_representation` | 原课程成果包含多个可独立出题诊断的知识点，已按最小诊断粒度拆分并保留同一成果映射。 |
| 41 | 复数四则运算 | `add_or_alias_concepts` | `pc_84fa9a959816d2fd778aec459c7e0020`<br>`pc_c04ce0aed24384aaa5b223f59282d31c` | `cn_sh_math_complex_arithmetic`<br>`cn_sh_math_complex_addition_geometry` | 原课程成果包含多个可独立出题诊断的知识点，已按最小诊断粒度拆分并保留同一成果映射。 |
| 42 | 基本立体图形结构 | `add_or_alias_concepts` | `pc_fabec640e7079cf5c178b549320b08bc` | `cn_sh_math_solid_structures` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 43 | 几何体表面积与体积 | `add_or_alias_concepts` | `pc_75a504416c16571e44cc269b50bb6db3` | `cn_sh_math_solid_surface_volume` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 44 | 空间图形直观图 | `add_or_alias_concepts` | `pc_7628ed564e93f03488bf5d3935266f24` | `cn_sh_math_oblique_drawings` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 45 | 空间点线面基本事实 | `add_or_alias_concepts` | `pc_50eba6efb1284a4956afe205751471f0` | `cn_sh_math_spatial_axioms` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 46 | 空间平行与垂直性质 | `add_or_alias_concepts` | `pc_9e7b9db8c8e0380cbd642ce8338f1d2e`<br>`pc_7030797af1bb287d3f65cef7cf757802` | `cn_sh_math_spatial_parallel_properties`<br>`cn_sh_math_spatial_perpendicular_properties` | 原课程成果包含多个可独立出题诊断的知识点，已按最小诊断粒度拆分并保留同一成果映射。 |
| 47 | 空间平行与垂直判定 | `add_or_alias_concepts` | `pc_0f342f34179aaa62e710d24849918e27`<br>`pc_9e7320a9eb8d1d0efedb9aba3c644a7e` | `cn_sh_math_spatial_parallel_criteria`<br>`cn_sh_math_spatial_perpendicular_criteria` | 原课程成果包含多个可独立出题诊断的知识点，已按最小诊断粒度拆分并保留同一成果映射。 |
| 48 | 立体几何简单证明 | `add_or_alias_concepts` | `pc_8e4564aac6db3fc263d20845b8ec5c13` | `cn_sh_math_solid_geometry_proofs` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 49 | 有限样本空间与随机事件 | `reuse_existing` | `pc_4dc6f43a3fef8af04213c7aa936a2031`<br>`pc_0c7c408f2fb208ecfb0b6758b1cd4a0a` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 50 | 古典概型 | `add_or_alias_concepts` | `pc_0c7c408f2fb208ecfb0b6758b1cd4a0a`<br>`pc_724ec6e8c8af72823a404e9fdafd5dbe` | `cn_sh_math_classical_probability` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 51 | 用频率估计概率 | `add_or_alias_concepts` | `pc_fe3e74b4da89b7d64d5b398cbdeef154` | `cn_sh_math_frequency_probability` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 52 | 数据来源、总体与样本 | `add_or_alias_concepts` | `pc_14be091db45947021ec317ac23ac5401`<br>`pc_2d318e7e89bb828e43ea5fd2364aa316` | `cn_sh_math_data_sources_population` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 53 | 简单随机抽样 | `add_or_alias_concepts` | `pc_14be091db45947021ec317ac23ac5401`<br>`pc_35cb6bdf58ea092953596fd77759caf6`<br>`pc_e4bc1b9803eeefd0aa1f24a68121dee8` | `cn_sh_math_simple_random_sampling` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 54 | 分层随机抽样 | `add_or_alias_concepts` | `pc_14be091db45947021ec317ac23ac5401`<br>`pc_35cb6bdf58ea092953596fd77759caf6`<br>`pc_4804c70e1e2965acbc7c3cfe09e11a3d` | `cn_sh_math_stratified_sampling` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 55 | 抽样方案选择 | `add_or_alias_concepts` | `pc_28e40edd140ccc548060052b3b445e5a` | `cn_sh_math_sampling_design` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 56 | 统计图表选择 | `reuse_existing` | `pc_9b449c02257babd62cc775a79704c117` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 57 | 取值规律与百分位数 | `add_or_alias_concepts` | `pc_9b449c02257babd62cc775a79704c117`<br>`pc_35cb6bdf58ea092953596fd77759caf6`<br>`pc_91a531ff72a480f49160c7fc26db307a` | `cn_sh_math_distribution_percentiles` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 58 | 统计推断的或然性 | `add_or_alias_concepts` | `pc_92b380d1c47e89f15ddb38bffe3675bc` | `cn_sh_math_statistical_inference_uncertainty` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 59 | 发现问题并数学化表达 | `route_practice` | — | `practice_cn_sh_math_2020_modelling_formulate` | 该要求评价建模、探究或成果表达过程，不写入学科概念掌握度；已分流到教学与评测知识层。 |
| 60 | 构建并求解模型 | `route_practice` | — | `practice_cn_sh_math_2020_modelling_solve` | 该要求评价建模、探究或成果表达过程，不写入学科概念掌握度；已分流到教学与评测知识层。 |
| 61 | 检验并改进模型 | `route_practice` | — | `practice_cn_sh_math_2020_modelling_validate` | 该要求评价建模、探究或成果表达过程，不写入学科概念掌握度；已分流到教学与评测知识层。 |
| 62 | 数学探究问题与猜想 | `route_practice` | — | `practice_cn_sh_math_2020_inquiry_pose_conjecture` | 该要求评价建模、探究或成果表达过程，不写入学科概念掌握度；已分流到教学与评测知识层。 |
| 63 | 探究方案与论证 | `route_practice` | — | `practice_cn_sh_math_2020_inquiry_plan_prove` | 该要求评价建模、探究或成果表达过程，不写入学科概念掌握度；已分流到教学与评测知识层。 |
| 64 | 研究报告、交流与学术规范 | `route_practice` | — | `practice_cn_sh_math_2020_research_report_integrity` | 该要求评价建模、探究或成果表达过程，不写入学科概念掌握度；已分流到教学与评测知识层。 |
| 65 | 数列概念与表示 | `add_or_alias_concepts` | `pc_d628dbf58410331e403a76b3b121c7fd` | `cn_sh_math_sequence_concept_representation` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 66 | 等差数列建模 | `add_or_alias_concepts` | `pc_9e401fe846a8c086510b3ea2102be253`<br>`pc_268309b2a09956425be392cca04f360c` | `cn_sh_math_arithmetic_sequence_modelling` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 67 | 等差数列与一次函数 | `add_or_alias_concepts` | `pc_9e401fe846a8c086510b3ea2102be253`<br>`pc_14f1e53bf48e972800525aa7db57c70e` | `cn_sh_math_arithmetic_linear_relation` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 68 | 等比数列通项与前 n 项和 | `reuse_existing` | `pc_ced3271242c9a0d6fe67d9a446214543` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 69 | 等比数列建模 | `add_or_alias_concepts` | `pc_ced3271242c9a0d6fe67d9a446214543`<br>`pc_b635d15e8f965d7215734c93032e303f` | `cn_sh_math_geometric_sequence_modelling` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 70 | 等比数列与指数函数 | `add_or_alias_concepts` | `pc_ced3271242c9a0d6fe67d9a446214543`<br>`pc_81e5444941a3e64858bae20e97e58cf8`<br>`pc_cf08704d6dec3fc5cf1314e2f26f655d` | `cn_sh_math_geometric_exponential_relation` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 71 | 导数的变化率意义 | `reuse_existing` | `pc_10673fbc68b0db5d92e2eccb2616c7a6`<br>`pc_30962a9bea6ad49ace59c1ad3e902c12` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 72 | 基本求导公式与四则运算 | `reuse_existing` | `pc_d35baa6e4598b25c22ba867ed2a4f82f`<br>`pc_4536621b5e542d2b820ea7b67abd0bb3`<br>`pc_31bfe71fa0fb4cdd31cba73b08b409b8` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 73 | 简单线性复合函数求导 | `add_or_alias_concepts` | `pc_592fd805a5b6dadfe8e0826c7d467419` | `cn_sh_math_simple_linear_composites` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 74 | 用导数研究单调性 | `reuse_existing` | `pc_61dadf3e646d2fed3a3b5b81630b2563`<br>`pc_f9249fb783344fbbcfe32c05267ebcb8` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 75 | 用导数求极值与最值 | `reuse_existing` | `pc_61dadf3e646d2fed3a3b5b81630b2563`<br>`pc_f9249fb783344fbbcfe32c05267ebcb8` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 76 | 导数解决实际优化 | `add_or_alias_concepts` | `pc_61dadf3e646d2fed3a3b5b81630b2563`<br>`pc_7f364bd0df6065095b932f11a00d4941` | `cn_sh_math_derivative_optimisation` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 77 | 空间直角坐标系与两点距离 | `add_or_alias_concepts` | `pc_9ae5f17312ee21050edf3e4bd9b005a2`<br>`pc_64e61e1cee5471619fa54db48800b916`<br>`pc_fbe862fa74f322ae90465e6dfb1def7a` | `cn_sh_math_spatial_coordinates_distance` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 78 | 空间向量概念与运算 | `reuse_existing` | `pc_9ae5f17312ee21050edf3e4bd9b005a2` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 79 | 空间向量基本定理与坐标 | `add_or_alias_concepts` | `pc_9ae5f17312ee21050edf3e4bd9b005a2`<br>`pc_83dcad323dc19ea3b6357b3155211a10` | `cn_sh_math_spatial_vector_basis` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 80 | 空间向量投影 | `reuse_existing` | `pc_3e68cc383e695a3ae1773f286b5221f3`<br>`pc_b70bbfb827c2b527f128f02bf360675e` | — | 平面与空间中的向量投影共享同一数学定义，复用本轮建立的向量投影 canonical ID。 |
| 81 | 直线方向向量与平面法向量 | `reuse_existing` | `pc_0c3c2f35769f38762a59705783e03824`<br>`pc_8386363188df11ab28ae08ef72342a47` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 82 | 空间夹角及平行垂直 | `reuse_existing` | `pc_3e68cc383e695a3ae1773f286b5221f3`<br>`pc_0c3c2f35769f38762a59705783e03824`<br>`pc_8386363188df11ab28ae08ef72342a47` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 83 | 向量法证明立体几何定理 | `add_or_alias_concepts` | `pc_9ae5f17312ee21050edf3e4bd9b005a2`<br>`pc_3e68cc383e695a3ae1773f286b5221f3`<br>`pc_c91bb66b227d5404c87e08b45f62d18c` | `cn_sh_math_vector_geometry_proofs` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 84 | 空间距离与夹角问题 | `reuse_existing` | `pc_9ae5f17312ee21050edf3e4bd9b005a2`<br>`pc_3e68cc383e695a3ae1773f286b5221f3`<br>`pc_8386363188df11ab28ae08ef72342a47` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 85 | 直线交点与距离 | `add_or_alias_concepts` | `pc_2fd09e919b7e73069c83ce49007f17d2`<br>`pc_bea43d1a52b8d8840817983b273c7dda` | `cn_sh_math_line_intersections_distances` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 86 | 圆的标准方程与一般方程 | `reuse_existing` | `pc_3d12d114d1630b545655de686dae4630` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 87 | 直线与圆、圆与圆的位置关系 | `reuse_existing` | `pc_3d12d114d1630b545655de686dae4630`<br>`pc_2fd09e919b7e73069c83ce49007f17d2` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 88 | 圆锥曲线背景与作用 | `add_or_alias_concepts` | `pc_2c7728a895c147c0e2c232582c1e6b64` | `cn_sh_math_conic_context` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 89 | 椭圆定义、方程与性质 | `add_or_alias_concepts` | `pc_58591fb3c8294a83a9405568a100991e` | `cn_sh_math_ellipse` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 90 | 抛物线与双曲线 | `add_or_alias_concepts` | `pc_76707a52fc4d807bbdfb0e56f509c17e`<br>`pc_d236c68eb711f9a26eb4250a7843b517` | `cn_sh_math_parabola`<br>`cn_sh_math_hyperbola` | 原课程成果包含多个可独立出题诊断的知识点，已按最小诊断粒度拆分并保留同一成果映射。 |
| 91 | 解析几何数形结合 | `add_or_alias_concepts` | `pc_2fd09e919b7e73069c83ce49007f17d2`<br>`pc_3d12d114d1630b545655de686dae4630`<br>`pc_5a15abbfb73000d73e62d0f659cc8df2` | `cn_sh_math_analytic_geometry_method` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 92 | 全概率公式 | `add_or_alias_concepts` | `pc_b51add1da3c3312a95ec3d5f88c2558c` | `cn_sh_math_total_probability_formula` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 93 | 连续型随机变量初步 | `reuse_existing` | `pc_5f55e60931935e299996e34826f1a0e9`<br>`pc_23858effd2dd68284bd0c6b645607386`<br>`pc_bd3e94ad62025e9a58ab6e2016182924` | — | 逐项复核确认现有 canonical 概念组合已覆盖该成果，无需为课程表述重复创建概念。 |
| 94 | 样本相关系数 | `add_or_alias_concepts` | `pc_8d0a38a8e8f86cd83ae1f091a62f2cad`<br>`pc_629b0c54807299e247ddd77ea5076dd6` | `cn_sh_math_sample_correlation` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 95 | 比较成对数据相关性 | `reuse_existing` | `pc_8d0a38a8e8f86cd83ae1f091a62f2cad`<br>`pc_629b0c54807299e247ddd77ea5076dd6` | — | 比较相关程度是样本相关系数的直接应用，复用本轮建立的样本相关系数 canonical ID。 |
| 96 | 一元线性回归与最小二乘 | `reuse_existing` | `pc_ed18cde6c3d7e08e9e371061418a7424` | — | 全库反向查重确认机器学习图已有线性回归 canonical 概念，且定义覆盖预测与平方误差拟合；复用稳定 ID。 |
| 97 | 线性回归预测 | `add_or_alias_concepts` | `pc_ed18cde6c3d7e08e9e371061418a7424`<br>`pc_85acd13e8f4afec2979a3288f911c926` | `cn_sh_math_regression_prediction_limits` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 98 | 2×2 列联表 | `add_or_alias_concepts` | `pc_223557a1ed16ebd3dac3d0f499d14268` | `cn_sh_math_contingency_table` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 99 | 列联表独立性检验 | `add_or_alias_concepts` | `pc_5e8204fe2f43100f3de7f78a5824d321`<br>`pc_029c971a0c9f5d5bb93bba1d0a12f4bf` | `cn_sh_math_contingency_independence_test` | 现有统一 KG 无法完整覆盖该可独立诊断成果；已新增稳定 canonical 概念并保留原有相关概念映射。 |
| 100 | 完成进阶建模或探究课题 | `route_practice` | — | `practice_cn_sh_math_2020_extended_research_project` | 该要求评价建模、探究或成果表达过程，不写入学科概念掌握度；已分流到教学与评测知识层。 |
| 101 | 进阶课题成果与说明 | `route_practice` | — | `practice_cn_sh_math_2020_extended_project_report` | 该要求评价建模、探究或成果表达过程，不写入学科概念掌握度；已分流到教学与评测知识层。 |

## 自动门禁

- 101 个 gap_id 必须恰好解析一次。
- `full` 映射必须与解析后的 canonical_ids 完全一致。
- `excluded` 只能指向教学/评测知识项，不能写入 canonical concept。
- 新建 Concept 必须同时具有两种来源类型的精确证据。
- 新图 Topic 仍保持每组 2–3 个 Concept，先修边必须为 DAG。
