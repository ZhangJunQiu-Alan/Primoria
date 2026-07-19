# 中国大陆 + 新加坡核心概念教学知识审核包（前两批）

- 生成日期：2026-07-20
- 概念档案：48 个；误区候选 96 条；教学策略 48 条；评测探针 96 条。
- 证据边界：5 条误区有教育研究或官方阅卷报告直接支持，标为 `empirically_documented`；其余仍为 `diagnostic_hypothesis`，不声称具有经验发生率。
- 外推规则：研究统计只描述原研究样本或报告所述考生；跨地区复用概念时不得改写成中国或新加坡学生总体结论。
- 审核状态：全部 `needs_review`；代理人工复核不写入 human approval。

## 复数代数形式四则运算（Mathematics / CN-MAINLAND）

- 目标：`senior_secondary_mathematics:cn_sh_math_complex_arithmetic` / `pc_84fa9a959816d2fd778aec459c7e0020`
- 误区候选：复数加减时可以把实部和虚部交叉合并。（diagnostic_hypothesis）；复数除法可以直接让实部除实部、虚部除虚部。（diagnostic_hypothesis）
- 教学序列：先用有序对表示 a+bi，要求每一步分别处理两个分量。 → 用一组正确与错误的除法展开对比，定位共轭因子只用于实化分母。 → 最后回到代数形式，并以乘回原分母检查商。
- 避免：不要把“乘共轭”教成无条件口诀；加减法和乘法不需要同一套除法程序。
- 探针：判断并纠正：(3+2i)/(1-i)=3/1+(2/-1)i。说明错误发生在哪一步。；求 (2-i)/(1+2i)，并用你的答案乘回 1+2i 验证。
- 证据：数学课程标准PDF p.34-35（正文p.26-27），必修主题三·2‘复数’（`src_cn_moe_senior_high_math_2020`）；Chapter 9 §9.4, printed pp.425-426 (PDF pp.14-15): four operations and conjugate factor for division（`src_mit_ocw_strang_calculus_ch9_2023`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 导数解决实际优化（Mathematics / CN-MAINLAND）

- 目标：`senior_secondary_mathematics:cn_sh_math_derivative_optimisation` / `pc_7f364bd0df6065095b932f11a00d4941`
- 误区候选：只要 f'(x)=0，该点就一定是最大值。（diagnostic_hypothesis）；实际问题中把任意给出的量写成函数并求导就能得到题目要求的最优值。（diagnostic_hypothesis）
- 教学序列：先让学习者写出目标量、变量、单位和可行域，不立即求导。 → 把约束代入形成一元目标函数，列出驻点和端点候选。 → 用符号表或数值比较确认最优，并把结果翻译回实际语境。
- 避免：不要只给内部驻点且必为最优的练习，否则无法检验端点和约束意识。
- 探针：在闭区间 [0,4] 上给定成本函数 C(x)，说明寻找最小值必须检查哪些候选。；给出固定周长矩形问题，只写出决策变量、目标函数和可行域，不求导。
- 证据：数学课程标准PDF p.47-49（正文p.39-41），选择性必修主题一·2‘一元函数导数及其应用’（`src_cn_moe_senior_high_math_2020`）；Unit 2 Part B, Sessions 29-30: Optimization Problems（`src_mit_ocw_18_01sc_fall_2010`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 回归预测及其限制（Mathematics / CN-MAINLAND）

- 目标：`senior_secondary_mathematics:cn_sh_math_regression_prediction_limits` / `pc_85acd13e8f4afec2979a3288f911c926`
- 误区候选：回归线斜率非零就证明一个变量导致另一个变量变化。（diagnostic_hypothesis）；回归方程在任何自变量范围都同样可靠。（diagnostic_hypothesis）
- 教学序列：先在散点图上标出观测范围、异常点和可能的非线性。 → 再解释斜率、残差与拟合方向，但禁止使用因果词。 → 给出区间内插值和区间外外推各一例，比较可辩护程度。
- 避免：不要只要求代入回归方程算数值；这无法暴露因果和外推错误。
- 探针：一项观察研究得到学习时长与成绩正相关。哪些结论可以说，哪些不能说？；样本年龄为 12–18 岁，是否可用回归线预测 60 岁人群？说明理由。
- 证据：数学课程标准PDF p.56-57（正文p.48-49），选择性必修主题三·3‘统计’（`src_cn_moe_senior_high_math_2020`）；PDF §§12.3 and 12.5-12.6, pp.623-643; regression, prediction and outliers（`src_openstax_introductory_statistics_2e_2026`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 公式、配方与图像法解二次方程（Mathematics / SG）

- 目标：`singapore_secondary_mathematics:sg_sec_math_quadratic_formula_complete_graph` / `pc_17734ef6df479e2834d50b676271d92d`
- 误区候选：代入二次公式时，-b 只表示把 b 前面的书写符号原样抄下。（diagnostic_hypothesis）；图像法求根时，曲线最接近 x 轴的整点就是精确根。（diagnostic_hypothesis）
- 教学序列：同一道方程分别用配方、公式和图像处理，标注每种方法提供的精确或近似信息。 → 要求先写带符号的 a、b、c，再代入公式。 → 用代回原方程或交点检查候选根。
- 避免：不要把三种方法当成互不相关的步骤清单；应比较它们如何表示同一组根。
- 探针：用二次公式解 2x²-3x-2=0，先单独写出 a、b、c 和 -b。；图像显示交点约为 x=1.4。这个数值一定是精确根吗？如何验证？
- 证据：PDF p.19, g3 sec3 4, Solving quadratic equations by standard methods（`src_sg_moe_secondary_g2_g3_math_2020`）；PDF p.29, g2 sec3 4, Solving quadratic equations by standard methods（`src_sg_moe_secondary_g2_g3_math_2020`）；PDF §5.6 Quadratic Equations in One Variable, printed pp.403-426（`src_openstax_contemporary_mathematics_2026`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 一次与二次因式构成的分式不等式（Mathematics / SG）

- 目标：`singapore_h2_mathematics:sg_h2_math_rational_quadratic_inequalities` / `pc_afd49425ab0864c75dcf18868acbba73`
- 误区候选：解分式不等式时可以不判断分母符号直接交叉相乘。（diagnostic_hypothesis）；使分子或分母为零的点都属于等号成立的边界。（diagnostic_hypothesis）
- 教学序列：先列出分子零点和分母零点，并用不同符号标记。 → 在数轴区间选测试点或分析因式符号，得到整体正负。 → 最后按严格性选择分子零点，并永久排除分母零点。
- 避免：不要在分母符号未知时直接乘去分母。
- 探针：解 (x-1)/(x+2)≥0，并解释 x=1 与 x=-2 是否包含。；评价“把不等式两边乘以 x+2”这一步在未讨论 x+2 符号时是否有效。
- 证据：PDF p.7, sub-topic 1.3 Equations and inequalities（`src_sg_seab_h2_math_9758_2026`）；PDF §3.7 Rational Functions, printed pp.340-364; §9.3 Nonlinear Equations and Inequalities, printed pp.925-936（`src_openstax_precalculus_2e_2026`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 概率表示与样本空间转换（Mathematics / SG）

- 目标：`singapore_h2_mathematics:sg_h2_math_probability_representations` / `pc_d087f482be941779c1774129f95c83cb`
- 误区候选：概率树上同一节点发出的各分支应当等长或等概率。（diagnostic_hypothesis）；树图上一条完整路径的概率应把各分支概率相加。（diagnostic_hypothesis）
- 教学序列：先用样本空间表格列出联合结果，再把同一信息转换成树图。 → 在每个节点检查分支和为 1，在每条路径标明条件。 → 最后把目标事件写成互斥路径集合，区分路径内乘法与路径间加法。
- 避免：不要从“乘法/加法口诀”开始；先明确事件结构和互斥关系。
- 探针：给出两阶段抽样树图，说明为何一条路径相乘而两条互斥目标路径相加。；把一个 2×3 结果表转换成概率树，并说明每个节点的分支总和。
- 证据：PDF p.11, sub-topic 6.1 Probability（`src_sg_seab_h2_math_9758_2026`）；PDF §11.7 Probability, printed pp.1154-1164（`src_openstax_precalculus_2e_2026`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 力的合成分解与矢量（Physics / CN-MAINLAND）

- 目标：`senior_secondary_physics:cn_sh_physics_force_composition_vectors` / `pc_123685f6debed5592b49d13d9647519f`
- 误区候选：两个力的合力大小总等于两个力大小之和。（diagnostic_hypothesis）；把一个力分解后，原力和两个分力会同时作为三个真实作用力存在。（diagnostic_hypothesis）
- 教学序列：先只画真实相互作用产生的力，再选坐标轴。 → 用平行四边形或正交分解表示同一矢量。 → 用极端方向检查合力大小是否可能。
- 避免：不要在受力图尚未完成时直接套分量公式。
- 探针：两个大小分别为 3 N 和 4 N 的垂直力，合力为何不是 7 N？；受力图画了重力 mg 及其 mg sinθ、mg cosθ。指出重复计数并修正。
- 证据：物理标准PDF p.21（正文对应内容要求 1.2.2），必修 1（`src_cn_moe_senior_high_physics_2020`）；Web §§2.1-2.3 Scalars and Vectors; Components; Algebra of Vectors（`src_openstax_university_physics_v1_2016`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 动能与动能定理（Physics / CN-MAINLAND）

- 目标：`senior_secondary_physics:cn_sh_physics_kinetic_energy_theorem` / `pc_84347af49c149c10e606c6999c858087`
- 误区候选：动能变化由某一个最大的力做功决定。（diagnostic_hypothesis）；总功为负意味着物体的动能变成负数。（diagnostic_hypothesis）
- 教学序列：明确初末状态并列出每个力的功。 → 先求总功，再使用 W_net=ΔK。 → 检查最终动能非负且与速度变化方向一致。
- 避免：不要把动能定理写成任意单力的功等于动能变化。
- 探针：物体受拉力做功 20 J、摩擦力做功 -8 J，动能如何变化？；初动能 30 J，总功 -10 J。末动能是多少？负功意味着什么？
- 证据：物理标准PDF p.23（正文对应内容要求 2.1.2），必修 2（`src_cn_moe_senior_high_physics_2020`）；Web §§7.2-7.4 Kinetic Energy and the Work-Energy Theorem（`src_openstax_university_physics_v1_2016`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 电势能、电势与电势差（Physics / CN-MAINLAND）

- 目标：`senior_secondary_physics:cn_sh_physics_electric_potential_quantities` / `pc_f2e136fce8543aed60ca1f7af1dfaf13`
- 误区候选：某点电势会随放入的试探电荷大小或正负改变。（diagnostic_hypothesis）；任何电荷都沿电势降低方向运动。（diagnostic_hypothesis）
- 教学序列：先固定场源，比较同一点放不同试探电荷时 V 与 U。 → 画电势高低和电场方向，再分别放正负电荷。 → 用 ΔU=qΔV 检查能量变化符号。
- 避免：不要只背“沿电场电势降低”，却不检查电荷符号和受力。
- 探针：同一点把 +q 换成 -2q，电势和电势能分别怎样变？；负电荷从静止释放且仅受静电力时，会趋向高电势还是低电势？用能量说明。
- 证据：物理标准PDF p.28（正文对应内容要求 3.1.5），必修 3（`src_cn_moe_senior_high_physics_2020`）；Web §§7.1-7.5 Electric Potential Energy, Potential and Equipotential Surfaces（`src_openstax_university_physics_v2_2016`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 交叉电磁场速度选择器（Physics / SG）

- 目标：`singapore_h2_physics:sg_h2_physics_crossed_field_velocity_selector` / `pc_ba46501edd6d23c79fe9c1e26a62f939`
- 误区候选：速度选择器中的电场力和磁场力应同向叠加才能选速。（diagnostic_hypothesis）；选定速度 v=E/B 会随粒子的质量或电荷量改变。（diagnostic_hypothesis）
- 教学序列：先独立用 qE 和 qv×B 判断方向。 → 只有两力相反时再写大小平衡。 → 推导 v=E/B 后分别检查单位、正负电荷和偏离选速时的偏转方向。
- 避免：不要跳过叉乘方向直接背 v=E/B。
- 探针：给定 E、B、v 方向和正电荷，画出两力并判断能否无偏转。；质量加倍、电荷改为 -q 时，选定速度大小是否变化？
- 证据：PDF p.26, topic 17 Electromagnetic Forces, outcome (m)（`src_sg_seab_h2_physics_9478_2026`）；OpenStax College Physics 2e §22.5, Force on a Moving Charge in a Magnetic Field: Examples and Applications（`src_openstax_college_physics_2e_2022`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 波函数概率解释与量子叠加（Physics / SG）

- 目标：`singapore_h2_physics:sg_h2_physics_wavefunction_probability_superposition` / `pc_a5f5680781febed7b189645c53ceb0f6`
- 误区候选：波函数 ψ 本身就是位置概率。（diagnostic_hypothesis）；量子叠加时可以先把各状态概率密度相加而忽略振幅。（diagnostic_hypothesis）
- 教学序列：用正负波函数值对比 ψ 与 |ψ|²。 → 先归一化单个状态，再构造线性叠加。 → 展开模平方并识别交叉项何时保留或消失。
- 避免：不要把波函数描述成在空间起伏的物质波而不说明概率解释。
- 探针：若某处 ψ(x)<0，该处概率密度是否为负？说明。；比较 |ψ1+ψ2|² 与 |ψ1|²+|ψ2|²，指出差异来源。
- 证据：PDF p.28, topic 19 Quantum Physics, outcome (f)（`src_sg_seab_h2_physics_9478_2026`）；PDF p.28, topic 19 Quantum Physics, outcome (g)（`src_sg_seab_h2_physics_9478_2026`）；OpenStax University Physics Volume 3 §7.1, Wave Functions（`src_openstax_university_physics_v3_2016`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 由 β 衰变守恒缺口推断中微子（Physics / SG）

- 目标：`singapore_h2_physics:sg_h2_physics_beta_decay_neutrino_inference` / `pc_eebf0fe57f217f74bfdd33901f77c63c`
- 误区候选：β 衰变电子能谱连续说明单次衰变不守恒能量。（diagnostic_hypothesis）；中微子只是为了配平核电荷数而加入。（diagnostic_hypothesis）
- 教学序列：先列出母核、子核和电子可观测量。 → 比较两体衰变应有的离散能量与实际连续谱。 → 引入中性弱相互作用粒子并逐项检查守恒。
- 避免：不要只给完整核方程让学生机械填空。
- 探针：为何连续 β 能谱与两体衰变预期冲突？；在一个 β 衰变事件中，中微子需要补足哪些守恒量？
- 证据：PDF p.29, topic 20 Nuclear Physics, outcome (o)（`src_sg_seab_h2_physics_9478_2026`）；OpenStax University Physics Volume 3 §10.4, Nuclear Reactions; §11.2, Particle Conservation Laws（`src_openstax_university_physics_v3_2016`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 氧化剂与还原剂（Chemistry / CN-MAINLAND）

- 目标：`senior_secondary_chemistry:cn_sh_chem_oxidising_reducing_agents` / `pc_377dad2703bed7f040a5cf507fd3022b`
- 误区候选：氧化剂在反应中自身被氧化。（diagnostic_hypothesis）；只有有氧元素参加的反应才是氧化还原反应。（diagnostic_hypothesis）
- 教学序列：先标氧化数并找升降，再写电子得失。 → 根据谁使对方发生变化命名氧化剂和还原剂。 → 用不含氧的反例检验定义。
- 避免：不要只用得氧失氧作为唯一判据。
- 探针：在 Zn+Cu²⁺→Zn²⁺+Cu 中指出氧化剂、还原剂及各自变化。；Cl₂+2Br⁻→2Cl⁻+Br₂ 是否为氧化还原反应？为何？
- 证据：化学标准PDF p.23（正文对应内容要求 2.2），必修（`src_cn_moe_senior_high_chemistry_2020`）；Web §4.2 Classifying Chemical Reactions; §17.1 Review of Redox Chemistry（`src_openstax_chemistry_2e_2019`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 水溶液离子平衡应用（Chemistry / CN-MAINLAND）

- 目标：`senior_secondary_chemistry:cn_sh_chem_aqueous_equilibrium_applications` / `pc_e65a80e3ebb618b67421efebbe223d4a`
- 误区候选：离子平衡建立后，电离、沉淀或水解过程停止。（diagnostic_hypothesis）；加入同离子或稀释溶液会改变同温度下的平衡常数。（diagnostic_hypothesis）
- 教学序列：分别写出平衡表达式和当前反应商。 → 判断扰动先改变哪些浓度，再比较 Q 与 K。 → 追踪新平衡组成，同时声明温度不变时 K 不变。
- 避免：不要只背勒夏特列方向而不写参与平衡的粒子。
- 探针：饱和溶液中沉淀质量不变，是否表示溶解和结晶停止？；恒温下加入同离子后，Ksp 和离子浓度怎样变化？
- 证据：化学标准PDF p.42（正文对应内容要求 3.5），选择性必修·化学反应原理（`src_cn_moe_senior_high_chemistry_2020`）；Web Chapters 14-15 acid-base, buffer, precipitation and complex-ion equilibria（`src_openstax_chemistry_2e_2019`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 内能与体系状态（Chemistry / CN-MAINLAND）

- 目标：`senior_secondary_chemistry:cn_sh_chem_internal_energy_state` / `pc_57e67f0b2d828d124fc1ed6b252442c7`
- 误区候选：体系内能就是体系中储存的热。（diagnostic_hypothesis）；只要温度相同，任何体系的内能都相同。（diagnostic_hypothesis）
- 教学序列：先区分状态量与过程量，用 U、q、w 标记。 → 比较同温但质量、相态或组成不同的体系。 → 用 ΔU=q+w 讨论能量传递后状态变化。
- 避免：不要使用“体系含有热量”这类措辞。
- 探针：把内能、热、功分别归为状态量或过程量，并说明理由。；同温的 1 mol 液态水和 2 mol 水蒸气内能是否必相同？
- 证据：化学标准PDF p.36（正文对应内容要求 1.1），选择性必修·化学反应原理（`src_cn_moe_senior_high_chemistry_2020`）；Web Chapter 5 Thermochemistry; Chapter 16 Thermodynamics（`src_openstax_chemistry_2e_2019`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## Arrhenius 与 Lewis 酸碱模型（Chemistry / SG）

- 目标：`singapore_h2_chemistry:sg_h2_chemistry_acid_base_models_arrhenius_lewis` / `pc_e349920621ebd3ae42cabdebf4f12b67`
- 误区候选：任何 Lewis 酸都必须在水中释放 H⁺。（diagnostic_hypothesis）；Lewis 碱必须含 OH⁻。（diagnostic_hypothesis）
- 教学序列：对同一反应分别询问 Arrhenius 和 Lewis 判据是否适用。 → 画电子对箭头识别受体与给体。 → 用无质子反应检验模型边界。
- 避免：不要把三个酸碱模型排列成互相替代的口号。
- 探针：在 BF₃+NH₃→F₃B←NH₃ 中指出 Lewis 酸碱并说明电子对方向。；为何 Arrhenius 定义不足以完整描述 BF₃ 与 NH₃ 的反应？
- 证据：PDF p.15, topic 4 Theories of Acids and Bases, outcome (a)（`src_sg_seab_h2_chemistry_9476_2026`）；PDF p.16, topic 4 Theories of Acids and Bases, outcome (c)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Chemistry 2e §14.1, Brønsted-Lowry Acids and Bases, historical Arrhenius model; §15.2, Lewis Acids and Bases（`src_openstax_chemistry_2e_2019`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 酸碱滴定曲线与指示剂选择（Chemistry / SG）

- 目标：`singapore_h2_chemistry:sg_h2_chemistry_titration_curves_indicator_selection` / `pc_8d1c44cf2a5bd1f8942eddce18c0704b`
- 误区候选：所有酸碱滴定的等当点 pH 都等于 7。（diagnostic_hypothesis）；指示剂变色区间的中点必须精确等于等当点 pH。（diagnostic_hypothesis）
- 教学序列：先依据酸碱强弱预测等当点溶液组成和 pH 方向。 → 画出缓冲区、等当点和陡跃区。 → 把候选指示剂变色范围叠加到曲线上选择。
- 避免：不要只按“强酸用某指示剂”的配对表教学。
- 探针：弱酸用强碱滴定时，等当点为何通常大于 7？；给出滴定曲线和三种指示剂变色范围，说明选择依据。
- 证据：PDF p.22, topic 10_1 Acid-Base Equilibria, outcome (d)（`src_sg_seab_h2_chemistry_9476_2026`）；PDF p.22, topic 10_1 Acid-Base Equilibria, outcome (e)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Chemistry 2e §14.7, Acid-Base Titrations（`src_openstax_chemistry_2e_2019`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## SN1 与 SN2 取代的立体化学结果（Chemistry / SG）

- 目标：`singapore_h2_chemistry:sg_h2_chemistry_nucleophilic_substitution_stereochemistry` / `pc_146233f82cd4fdbdf0addf3541ab2779`
- 误区候选：SN2 反应中亲核体可从任意方向进攻，因此构型通常保留。（diagnostic_hypothesis）；SN1 经平面碳正离子后仍只从背面进攻，所以只生成反转产物。（diagnostic_hypothesis）
- 教学序列：用三维楔线标出反应中心和离去基团。 → 分别画 SN2 同步背面进攻与 SN1 平面中间体。 → 从几何路径预测构型结果，而非先背标签。
- 避免：不要把 SN1 外消旋和 SN2 反转当成无机理依据的配对表。
- 探针：画出手性卤代烷发生 SN2 时的进攻方向和产物构型变化。；为何 SN1 中间体允许两面进攻？这对产物有什么影响？
- 证据：PDF p.29, topic 11_5 Halogen Derivatives, outcome (b)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Organic Chemistry §§11.2 and 11.4, The SN2 Reaction; The SN1 Reaction（`src_openstax_organic_chemistry_2023`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 基因是核酸功能片段（Biology / CN-MAINLAND）

- 目标：`senior_secondary_biology:cn_sh_bio_gene_nucleic_acid_segment` / `pc_4968ce1f12aa3d8827a46863b03b81d2`
- 误区候选：所有生物和病毒的基因都一定由 DNA 构成。（diagnostic_hypothesis）；一个基因就是一条完整染色体。（diagnostic_hypothesis）
- 教学序列：用层级图连接碱基—核酸片段—DNA 分子—染色体。 → 比较细胞生物和 RNA 病毒的遗传材料。 → 给多个结构实例让学习者判断哪个层级是基因。
- 避免：不要把“基因是有遗传效应的 DNA 片段”无条件推广到所有病毒。
- 探针：RNA 病毒的基因为什么不违背“基因是功能性核酸片段”？；按包含关系排列：基因、DNA 分子、染色体，并说明并非所有 DNA 片段都是基因。
- 证据：生物学标准PDF p.25（正文对应内容要求 3.1.1），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）；Web Chapter 14 DNA Structure and Function; Chapter 15 Genes and Proteins; §17.1 Biotechnology（`src_openstax_biology_2e_2018`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 非特异性与特异性免疫（Biology / CN-MAINLAND）

- 目标：`senior_secondary_biology:cn_sh_bio_innate_adaptive_immunity` / `pc_94f54f11e23c1c3e407c8036fb6321b6`
- 误区候选：先天免疫完全随机，不能识别任何共同病原特征。（diagnostic_hypothesis）；适应性免疫第一次遇到抗原就能立刻达到最大反应。（diagnostic_hypothesis）
- 教学序列：按识别对象、响应速度、效应机制和记忆四维比较两类免疫。 → 用同一感染的时间轴标出先天反应与初次适应性反应。 → 再加入二次暴露，解释记忆效应。
- 避免：不要把所有免疫细胞硬分成只属于一种系统而忽略协同。
- 探针：“非特异性免疫不识别任何病原信息”是否正确？；比较同一抗原初次和二次暴露的适应性免疫反应。
- 证据：生物学标准PDF p.30（正文对应内容要求 1.5.2），选择性必修·稳态与调节（`src_cn_moe_senior_high_biology_2020`）；Web Chapter 42 The Immune System, especially §§42.1-42.4 innate, adaptive and disrupted immunity（`src_openstax_biology_2e_2018`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 物质循环与能量流动（Biology / CN-MAINLAND）

- 目标：`senior_secondary_biology:cn_sh_bio_matter_cycles_energy_flow` / `pc_a26230828b27cf03028e959c4472f5f1`
- 误区候选：生态系统中的能量会像碳、氮等物质一样循环回到生产者。（diagnostic_hypothesis）；呼吸或分解会把物质转化成能量，因此物质消失。（diagnostic_hypothesis）
- 教学序列：同一食物网分别画物质流和能量流两张图。 → 在每个营养级记录输入、储存、呼吸散热和废物。 → 用分解者闭合物质循环，但保持能量箭头开放。
- 避免：不要用一张无标注箭头图同时表示物质和能量。
- 探针：画出碳与能量在“草—兔—鹰—分解者”中的路径，指出哪一个闭合。；兔呼吸时有机物减少，它去了哪里？
- 证据：生物学标准PDF p.33（正文对应内容要求 2.2.3），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）；Web Chapter 46 Ecosystems; trophic structure, energy flow, biogeochemical cycles and ecosystem dynamics（`src_openstax_biology_2e_2018`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 病毒与生命边界（Biology / SG）

- 目标：`singapore_h2_biology:sg_h2_biology_virus_living_boundary` / `pc_6dc6738077c8e4b6d5ce05c88301b7f1`
- 误区候选：病毒有遗传物质和蛋白质，因此就是一种很小的细胞。（empirically_documented）；病毒不满足细胞学说，所以讨论生命边界时只需回答“完全不活”。（diagnostic_hypothesis）
- 教学序列：建立生命判据表：细胞结构、代谢、稳态、复制、遗传和进化。 → 把细菌与病毒逐项对照并注明是否依赖宿主。 → 要求用证据写出有条件结论，而非只选“活/不活”。
- 避免：不要把争议结论教成单一标签；应评价判据。
- 探针：列出病毒和细菌在细胞结构、独立代谢及复制方式上的三项差异。；用至少四个生命判据讨论病毒是否属于生命。
- 证据：PDF p.12, topic 1 The Cell and Biomolecules of Life, outcome (f)（`src_sg_seab_h2_biology_9477_2026`）；OpenStax Microbiology §6.1, Viruses, noncellular infectious agents and host dependence（`src_openstax_microbiology_2016`）；PDF p.10, Fig.4 and caption: first-year biology students represented/described viruses as prokaryotic or eukaryotic cells（`src_plos_virus_knowledge_2017`）
- 实证范围（`mis_sg_bio_virus_life_boundary_virus_is_cell`）：样本：奥地利 133 名七年级、199 名十年级、133 名生物专业大学一年级及 181 名非生物专业大学一年级学生；研究情境：横断面问卷、概念列举与病毒绘图任务；论文比较四组的病毒结构和健康知识；发现：研究记录到把病毒画成或描述成原核/真核细胞的表征，PDF p.10 展示了大学一年级生物学生实例；外推限制：证据来自奥地利样本，只支持该错误模型确实被观察到，不能代表新加坡学生的发生率。
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 真核基因表达的多层调控（Biology / SG）

- 目标：`singapore_h2_biology:sg_h2_biology_multilevel_eukaryotic_gene_regulation` / `pc_7e223bfc05f6ec9124d8aee5193decc1`
- 误区候选：真核基因表达调控只发生在转录起始。（diagnostic_hypothesis）；DNA 甲基化总会打开基因表达。（diagnostic_hypothesis）
- 教学序列：按 DNA 可及性—RNA 产生与加工—翻译—蛋白修饰/降解画流程。 → 给每种调控机制定位到流程节点。 → 改变一个环节，预测 mRNA 和蛋白水平是否同向变化。
- 避免：不要把所有调控结果都简写成“基因开/关”而忽略中间可测量量。
- 探针：把组蛋白修饰、可变剪接、RNA 半衰期和蛋白降解分别归类。；某处理后 mRNA 不变但蛋白减少，列出两个可能调控层级。
- 证据：PDF p.15, topic 2 Genetics and Inheritance, outcome (i)（`src_sg_seab_h2_biology_9477_2026`）；OpenStax Biology 2e §§16.2-16.5, Eukaryotic Epigenetic, Transcriptional, Post-transcriptional and Translational Regulation（`src_openstax_biology_2e_2018`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 疫苗的群体控制与权衡（Biology / SG）

- 目标：`singapore_h2_biology:sg_h2_biology_vaccination_population_control_tradeoffs` / `pc_2a1d5be94da2719c6b406a95faba674e`
- 误区候选：接种疫苗后立刻获得对所有感染的完全保护。（diagnostic_hypothesis）；群体免疫表示群体中的每个人都有免疫。（diagnostic_hypothesis）
- 教学序列：先画个体初次应答和记忆形成时间轴。 → 再用传播网络比较不同覆盖率下的传播链。 → 最后把收益、不良反应、效力和不确定性分栏评价。
- 避免：不要用“百分之百安全/有效”或“有风险所以无价值”的绝对措辞。
- 探针：为什么刚接种后仍可能感染？这是否自动证明疫苗无效？；解释高覆盖率如何保护部分未接种者，同时说明其局限。
- 证据：PDF p.20, topic A Infectious Diseases, outcome (e)（`src_sg_seab_h2_biology_9477_2026`）；PDF p.20, topic A Infectious Diseases, outcome (f)（`src_sg_seab_h2_biology_9477_2026`）；OpenStax Microbiology §18.5, Vaccines, herd immunity, benefits and adverse effects（`src_openstax_microbiology_2016`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 全概率公式（Mathematics / CN-MAINLAND）

- 目标：`senior_secondary_mathematics:cn_sh_math_total_probability_formula` / `pc_b51add1da3c3312a95ec3d5f88c2558c`
- 误区候选：全概率公式可以直接相加各条件下的概率，不需要乘条件所占权重。（diagnostic_hypothesis）；全概率公式中的分组可以重叠，只要把所有情况列出来即可。（diagnostic_hypothesis）
- 教学序列：先画出完备且互斥的分组树。 → 在每条路径标出 P(Bᵢ) 与 P(A|Bᵢ) 并相乘。 → 汇总前检查分组是否遗漏或重叠。
- 避免：不要只要求背写求和符号而不检验分组条件。
- 探针：某产品来自两条产线的比例为 0.3、0.7，次品率分别为 0.02、0.01。写出总次品率而不先计算。；分组 B₁=‘偶数’、B₂=‘大于3’能否直接用于掷骰子的全概率公式？
- 证据：数学课程标准PDF p.55-56（正文p.47-48），选择性必修主题三·2‘概率’（`src_cn_moe_senior_high_math_2020`）；Summer 2026 Note 14 §3-§3.2, PDF pp.4-6; Total Probability Rule and Eq. (4)（`src_berkeley_cs70_summer_2026`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 向量投影（Mathematics / CN-MAINLAND）

- 目标：`senior_secondary_mathematics:cn_sh_math_vector_projection` / `pc_b70bbfb827c2b527f128f02bf360675e`
- 误区候选：向量投影一定是非负长度。（diagnostic_hypothesis）；求 a 在 b 上的向量投影时只需用 a·b 除以 |b|。（diagnostic_hypothesis）
- 教学序列：先画 b 的正方向和 a 的垂足。 → 分别计算带符号的标量投影与向量投影。 → 用结果是否与 b 共线及点积符号检查。
- 避免：不要把‘投影长度’与‘投影向量’混用。
- 探针：a 与 b 夹角为 120°，a 在 b 方向的标量投影符号是什么？；给出 a=(2,1)、b=(1,1)，求 a 在 b 上的向量投影并验证与 b 共线。
- 证据：数学课程标准PDF p.33-34（正文p.25-26），必修主题三·1‘平面向量及其应用’（`src_cn_moe_senior_high_math_2020`）；Unit 1 Part A, Sessions 2-4: Dot Products, Lengths/Angles and Vector Components（`src_mit_ocw_18_02sc_fall_2010`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 对数函数图像与单调性（Mathematics / CN-MAINLAND）

- 目标：`senior_secondary_mathematics:cn_sh_math_logarithmic_function_behavior` / `pc_e1d320d8e044c96c4d56792624b1e685`
- 误区候选：所有底数的对数函数都随 x 增大而增大。（diagnostic_hypothesis）；对数函数图像可以穿过 y 轴并在 x≤0 处继续。（diagnostic_hypothesis）
- 教学序列：用指数函数的反函数关系确定定义域和值域。 → 比较 a>1 与 0<a<1 两类图像。 → 用关键点 (1,0) 和渐近线 x=0 校验草图。
- 避免：不要用一个底数的图像代表所有对数函数。
- 探针：不列表计算，判断 y=log₁⁄₂x 的单调性并说明原因。；评价‘log₂0=0，所以图像过原点’。
- 证据：数学课程标准PDF p.28（正文p.20），必修主题二·2‘对数函数’（`src_cn_moe_senior_high_math_2020`）；PDF §§4.3-4.5 Logarithmic Functions and Properties, pp.429-471（`src_openstax_precalculus_2e_2026`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 对数与法则（Mathematics / SG）

- 目标：`a_level_mathematics:mat_log_laws` / `pc_3845a20537e66fc1506222d98752aa3d`
- 误区候选：对数记号可以像代数公因子一样在分子分母中约去。（empirically_documented）；ln(x-5) 可以展开成 ln x-ln 5。（empirically_documented）
- 教学序列：先把 logₐb 读作‘以 a 为底，得到 b 所需的指数’。 → 用具体数值检验乘积、商与错误的和差展开。 → 让学习者分类哪些变形来自指数律，哪些没有对应指数律。
- 避免：不要只增加同型操练；研究显示部分错误来自规则过度泛化而非练习量不足。
- 探针：评价 (log₂8)/(log₂4)=8/4，并给出正确值。；用 x=7 检验 ln(x-5)=ln x-ln5 是否成立。
- 证据：PDF p.23; 2.2 outcome 1（`src_cambridge_9709_2026_2027`）；PDF p.23; 2.2 outcome 2（`src_cambridge_9709_2026_2027`）；PDF p.27; 3.2 outcome 1（`src_cambridge_9709_2026_2027`）；PDF p.27; 3.2 outcome 2（`src_cambridge_9709_2026_2027`）；PDF pp.7-8（期刊 pp.58-59）, 81 participants and 79 analysed scripts; PDF p.14（期刊 p.65）, cancelling log_a as a common factor（`src_nie_sg_logarithm_misconceptions_2005`）；PDF p.20, Paper 9709/31, Question 2: most common error ln(x-5)=ln x-ln 5（`src_cambridge_9709_examiner_report_june_2024`）
- 实证范围（`mis_sg_math_log_laws_cancel_log_operator`）：样本：两所新加坡中学共有 81 名中三学生参加测验；剔除 2 份因学生不适而无效的答卷后，错误分析使用 79 份答卷；研究情境：47 题纸笔 ToSUL 对数理解测验，并对错误作概念、过度泛化与其他错误分类；发现：研究在讨论中记录了把 logₐ 当作变量或公因子并进行约分的作答；外推限制：只说明该研究样本中观察到此推理，不代表全部新加坡学生或当前届学生的发生率。
- 实证范围（`mis_sg_math_log_laws_distribute_subtraction`）：样本：参加 2024 年 6 月 Cambridge 9709/31 的考生；报告未披露样本量；研究情境：Cambridge International A Level Mathematics 9709 官方阅卷报告对具体试题作答的总结；发现：阅卷报告把 ln(x-5)=ln x-ln 5 列为该题最常见错误；外推限制：仅能说明该次 9709/31 考生群体的阅卷观察，不能换算为新加坡学生发生率。
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 由笛卡尔形式求模与主辐角（Mathematics / SG）

- 目标：`singapore_h2_mathematics:sg_h2_math_complex_mod_arg_conjugate` / `pc_08a0b36d500f85a79ecd1a38f6cef808`
- 误区候选：计算 arctan(y/x) 得到的数值总是复数的主辐角。（diagnostic_hypothesis）；共轭复数与原复数具有相同主辐角。（diagnostic_hypothesis）
- 教学序列：先在 Argand 图定位点与象限。 → 再求模和参考角，并按象限确定主辐角。 → 画共轭点检查模不变、辐角反号。
- 避免：不要只教 atan(y/x) 而不要求画象限草图。
- 探针：求 z=-1+i 的主辐角，并说明为何不是 -π/4。；若 arg z=2π/3，写出 arg(conj z) 并画出两点关系。
- 证据：PDF p.8, sub-topic 4.1 Complex numbers in cartesian form and Argand diagrams（`src_sg_seab_h2_math_9758_2026`）；PDF §3.1 Complex Numbers, printed pp.245-254; complex plane, modulus and conjugates（`src_openstax_precalculus_2e_2026`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 正态概率与参数反求（Mathematics / SG）

- 目标：`singapore_h2_mathematics:sg_h2_math_normal_probabilities_parameters` / `pc_d3fe5191e8f9cbcc11d138b2398d7d39`
- 误区候选：正态分布 N(μ,σ²) 中第二个参数就是标准差 σ。（diagnostic_hypothesis）；标准分数 z 与原变量具有相同单位。（diagnostic_hypothesis）
- 教学序列：先在 N(μ,σ²) 标出均值、方差和标准差。 → 把原变量转换为无量纲 z。 → 用概率对称性和数量级反查结果。
- 避免：不要把 N(μ,σ²) 的第二参数口头简称为‘散布’而不说明平方。
- 探针：X~N(10,25)，标准化 x=15 时分母是多少？；身高标准化后的 z=1.2 是否应写 1.2 cm？
- 证据：PDF p.12, sub-topic 6.3 Normal distribution（`src_sg_seab_h2_math_9758_2026`）；PDF §§6.1-6.2 The Standard Normal Distribution and Using the Normal Distribution, printed pp.336-346（`src_openstax_introductory_statistics_2e_2026`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 静摩擦与滑动摩擦（Physics / CN-MAINLAND）

- 目标：`senior_secondary_physics:cn_sh_physics_friction` / `pc_fc76f40e045f7ff96fc05caea20f543d`
- 误区候选：摩擦力总与物体的运动方向相反。（empirically_documented）；静摩擦力一出现就等于最大静摩擦力 μₛN。（diagnostic_hypothesis）
- 教学序列：先确定接触面之间的相对运动趋势。 → 区分静摩擦的自适应范围与滑动摩擦模型。 → 用整体运动结果反查摩擦方向和大小。
- 避免：不要把摩擦方向口诀绑定在物体对地速度上。
- 探针：物块无滑动地随向右加速的传送带启动，物块所受摩擦方向为何向右？；水平面上最大静摩擦为 10 N，外推力为 4 N 且物体静止，摩擦力多大？
- 证据：物理标准PDF p.21（正文对应内容要求 1.2.1），必修 1（`src_cn_moe_senior_high_physics_2020`）；Web §6.2 Friction（`src_openstax_university_physics_v1_2016`）；Article p.7 Participants: 496 students across schools in Shandong, Guizhou and Xinjiang; pp.10-12 Fig.7/A2: M14 p≈0.47 among 194 A2 non-mastery students; abstract: analysis of 492（`src_aps_cn_forces_motion_diagnostic_2026`）
- 实证范围（`mis_cn_physics_friction_always_opposes_motion`）：样本：山东、贵州、新疆多所中学共有 496 名约 15—16 岁学生参加；论文摘要报告总体分析数据为 492 人，此项结果对应其中 194 名 A2 基础力概念未掌握子样本；研究情境：33 题力与运动纸笔诊断测验，以选项级 Q 矩阵和 TS-MC-DINA-H 模型估计错误模型概率；发现：M14‘摩擦力总是反对运动’在 A2 未掌握子样本中的平均后验概率约为 0.47；外推限制：该数值是特定模型对特定未掌握子样本的估计，不是中国高中生总体发生率。
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 电场线模型（Physics / CN-MAINLAND）

- 目标：`senior_secondary_physics:cn_sh_physics_electric_field_lines` / `pc_6320bd87e27eecb487c13e120a8f578f`
- 误区候选：电场线就是带电粒子实际运动轨迹。（diagnostic_hypothesis）；两条电场线可以在同一点交叉，表示两个方向叠加。（diagnostic_hypothesis）
- 教学序列：先把场线切向定义为局部电场方向。 → 在同一场中分别给正负试探电荷和不同初速度。 → 用方向唯一性检查交叉、闭合和箭头。
- 避免：不要用会运动的粒子动画却不区分场线、速度矢量和轨迹。
- 探针：正电荷以横向初速度进入匀强竖直电场，轨迹为何不是一条竖直场线？；若两条电场线在一点交叉，会造成什么物理矛盾？
- 证据：物理标准PDF p.27（正文对应内容要求 3.1.3），必修 3（`src_cn_moe_senior_high_physics_2020`）；Web §5.6 Electric Field Lines（`src_openstax_university_physics_v2_2016`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 自感现象（Physics / CN-MAINLAND）

- 目标：`senior_secondary_physics:cn_sh_physics_self_induction` / `pc_4a30c7ba9271dd524cee1cb3e6bdab46`
- 误区候选：自感电动势总与电流方向相反。（diagnostic_hypothesis）；含电感电路开关动作后电流可以瞬间跳变。（diagnostic_hypothesis）
- 教学序列：先判断电流正在增大还是减小。 → 用楞次定律确定自感电动势试图维持的变化方向。 → 画开关前、瞬间和稳态三时刻的电流。
- 避免：不要把‘反向’省略成无条件口诀。
- 探针：线圈原有向右电流，断电瞬间自感电流方向如何？；为何理想电感支路电流不能从 2 A 瞬间变为 0？
- 证据：物理标准PDF p.38（正文对应内容要求 2.2.3），选择性必修 2（`src_cn_moe_senior_high_physics_2020`）；Web §14.2 Self-Inductance and Inductors（`src_openstax_university_physics_v2_2016`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 场线与等势面的几何关系（Physics / SG）

- 目标：`singapore_h2_physics:sg_h2_physics_field_lines_equipotential_geometry` / `pc_2b7eda0a0df626958a966c48865d9809`
- 误区候选：等势线与电场线是同一种线，因此应彼此平行。（diagnostic_hypothesis）；相邻等势线几何间距相等就保证电势差相等。（diagnostic_hypothesis）
- 教学序列：先在电势图上标出高低值。 → 画出垂直等势线且指向低电势的电场线。 → 用 ΔV/Δs 比较不同区域场强。
- 避免：不要提供无数值标签的等势图后要求比较场强。
- 探针：给出同心圆等势线，画出电场方向并说明正交关系。；两个区域等势线间距相同，但电势差分别为 5 V 和 20 V，哪处场强更大？
- 证据：PDF p.14, topic 4 Energy and Fields, outcome (h)（`src_sg_seab_h2_physics_9478_2026`）；OpenStax University Physics Volume 2 §§5.6 and 7.5, Electric Field Lines; Equipotential Surfaces and Conductors（`src_openstax_university_physics_v2_2016`）；OpenStax College Physics 2e §19.4, Equipotential Lines（`src_openstax_college_physics_2e_2022`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 无限深方势阱波函数与能级（Physics / SG）

- 目标：`singapore_h2_physics:sg_h2_physics_infinite_square_well_states` / `pc_c597719cddd0d41276acc705aa3972e6`
- 误区候选：无限深方势阱的基态能量可以为零。（diagnostic_hypothesis）；粒子被无限势垒限制时，波函数在势阱边界仍可取非零值。（diagnostic_hypothesis）
- 教学序列：先施加两端 ψ=0 的边界条件。 → 由允许驻波得到 n 从 1 开始。 → 比较 ψ、|ψ|² 的节点和能量随 n² 变化。
- 避免：不要直接给 En 公式而不解释 n=0 为何无物理解。
- 探针：把 n=0 代入 En 得 0，为什么这不是允许基态？；在 0≤x≤L 画基态波函数并标出边界值。
- 证据：PDF p.28, topic 19 Quantum Physics, outcome (i)（`src_sg_seab_h2_physics_9478_2026`）；PDF p.28, topic 19 Quantum Physics, outcome (j)（`src_sg_seab_h2_physics_9478_2026`）；OpenStax University Physics Volume 3 §7.4, The Quantum Particle in a Box（`src_openstax_university_physics_v3_2016`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 海森堡位置—动量不确定性（Physics / SG）

- 目标：`singapore_h2_physics:sg_h2_physics_heisenberg_position_momentum_uncertainty` / `pc_71a8c4a7750a98f29a83a217310abff5`
- 误区候选：任何量子态都严格满足 ΔxΔp=ℏ/2。（diagnostic_hypothesis）；位置—动量不确定性完全由测量仪器不够精密造成，改进仪器即可同时消除。（diagnostic_hypothesis）
- 教学序列：先把 Δx、Δp 定义为同一量子态中两种测量分布的标准差。 → 区分不等式下限与只在最小不确定态成立的等号。 → 比较仪器误差与量子态本征展宽，检验能否靠校准同时消除。
- 避免：不要只用‘观察会撞到粒子’的经典显微镜比喻解释不确定性。
- 探针：某量子态测得 ΔxΔp=3ℏ/2，这是否违反不确定关系？说明理由。；若位置与动量仪器都没有校准误差，是否可让同一量子态的 Δx、Δp 同时趋近 0？
- 证据：PDF p.28, topic 19 Quantum Physics, outcome (h)（`src_sg_seab_h2_physics_9478_2026`）；OpenStax University Physics Volume 3 §7.2, The Heisenberg Uncertainty Principle（`src_openstax_university_physics_v3_2016`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 化学能转化与能量守恒（Chemistry / CN-MAINLAND）

- 目标：`senior_secondary_chemistry:cn_sh_chem_energy_forms_conservation` / `pc_24ba4230641410361421c44883b583a4`
- 误区候选：放热反应会把体系中的能量消耗掉，因此总能量减少。（diagnostic_hypothesis）；断裂化学键会释放储存在键里的能量。（diagnostic_hypothesis）
- 教学序列：先明确体系与环境边界。 → 分别记账断键吸能与成键放能。 → 用能量流图核对体系变化与环境变化符号相反。
- 避免：不要用‘键中藏着能量，打断就放出’这类比喻。
- 探针：放热 50 kJ 时体系和环境能量各怎样变化？；为何燃烧虽要先断键却仍可总体放热？
- 证据：化学标准PDF p.36（正文对应内容要求 1.1），选择性必修·化学反应原理（`src_cn_moe_senior_high_chemistry_2020`）；Web Chapter 5 Thermochemistry; Chapter 16 Thermodynamics（`src_openstax_chemistry_2e_2019`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 电子能级、激发与跃迁（Chemistry / CN-MAINLAND）

- 目标：`senior_secondary_chemistry:cn_sh_chem_quantised_levels_transitions` / `pc_18741f38cfd4c697036aee6fe4658797`
- 误区候选：原子可以吸收任意能量的光子，只是跃迁高度不同。（diagnostic_hypothesis）；电子停留在同一能级也会持续发射该能级的能量。（diagnostic_hypothesis）
- 教学序列：先画离散能级而非连续高度。 → 将每个光子能量与两能级差匹配。 → 分别用向上、向下箭头表示吸收与发射。
- 避免：不要把能级图画成电子可停在任意高度的斜坡。
- 探针：能级差为 3.0 eV，入射光子为 2.5 eV，理想孤立原子是否完成该跃迁？；在能级图上表示 5 eV 到 2 eV 的发射并给出光子能量。
- 证据：化学标准PDF p.44（正文对应内容要求 1.1），选择性必修·物质结构与性质（`src_cn_moe_senior_high_chemistry_2020`）；Web §§6.1-6.3 Electromagnetic Energy; The Bohr Model; Development of Quantum Theory（`src_openstax_chemistry_2e_2019`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 盐类水解平衡（Chemistry / CN-MAINLAND）

- 目标：`senior_secondary_chemistry:cn_sh_chem_salt_hydrolysis` / `pc_328cda31419ed2b8c55cf39d1cc44cae`
- 误区候选：盐溶液都呈中性，因为盐来自酸碱中和。（diagnostic_hypothesis）；强酸强碱形成的所有离子都会明显水解。（diagnostic_hypothesis）
- 教学序列：把盐拆成阳离子与阴离子。 → 追溯各离子的共轭酸或共轭碱强弱。 → 只为会显著与水反应的离子写平衡并判断 pH。
- 避免：不要只按盐名背酸性或碱性。
- 探针：NH₄Cl 溶液为何可呈酸性？；NaCl 溶液中 Na⁺、Cl⁻为何通常不主导 pH？
- 证据：化学标准PDF p.42（正文对应内容要求 3.3），选择性必修·化学反应原理（`src_cn_moe_senior_high_chemistry_2020`）；Web Chapter 14, acid-base properties and hydrolysis of salt solutions（`src_openstax_chemistry_2e_2019`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 碱解离与水的离子积（Chemistry / SG）

- 目标：`singapore_h2_chemistry:sg_h2_chemistry_base_dissociation_water_ionic_product` / `pc_25a151cded112622c6511c38293ea36f`
- 误区候选：碱越强就表示它的初始浓度一定越高。（empirically_documented）；水的离子积 Kw 就是纯水中 H⁺ 的浓度。（diagnostic_hypothesis）
- 教学序列：先分开标注初始浓度、平衡浓度和 Kb。 → 用平衡表达式求解弱碱解离。 → 再由 Kw 连接 [H⁺] 与 [OH⁻]，并检查单位和数量级。
- 避免：不要用‘强=多’的日常语言代替强度定义。
- 探针：0.001 mol dm⁻³ 强碱与 0.1 mol dm⁻³ 弱碱，能否只凭初始浓度判断哪一个‘更强’？；25°C 时若 [OH⁻]=10⁻⁵ mol dm⁻³，求 [H⁺]。
- 证据：PDF p.22, topic 10_1 Acid-Base Equilibria, outcome (b)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Chemistry 2e §§14.1-14.3, Brønsted-Lowry Acids and Bases; pH and pOH; Relative Strengths of Acids and Bases（`src_openstax_chemistry_2e_2019`）；Web article, Main study and Results, lines 366-411; Appendix D AC11, 10.87% of 92 complete scripts（`src_rsc_sg_acid_base_conceptions_2016`）
- 实证范围（`mis_sg_chem_base_dissociation_strength_equals_concentration`）：样本：主研究招募 141 名新加坡九年级学生；结果分析使用其中 92 份无缺失作答的完整答卷；研究情境：25 题四层选择—理由—信心诊断工具，用于区分猜测、知识不足与替代概念；发现：研究把‘初始浓度越高，碱越强’记录为 AC11；在 92 份完整答卷中占 10.87%；外推限制：只说明论文样本及其诊断定义中的观察，不能直接外推到 H2 学生或全国发生率。
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 理想气体混合物与分压（Chemistry / SG）

- 目标：`singapore_h2_chemistry:sg_h2_chemistry_ideal_gas_mixture_partial_pressures` / `pc_7d39e3cc0d5dad70557185c466c60fdd`
- 误区候选：同一容器中的各种气体分压必然相等。（diagnostic_hypothesis）；计算分压时应给每种气体分配一部分容器体积。（diagnostic_hypothesis）
- 教学序列：先确定各组分摩尔数与总摩尔数。 → 用摩尔分数求分压并检查分压和。 → 再用同一总容积的理想气体式交叉验证。
- 避免：不要用液体分层类比气体分压。
- 探针：1 mol N₂ 与 3 mol H₂ 的总压为 200 kPa，分别求分压。；为何混合气中每个组分计算 pᵢ 时都使用容器总容积？
- 证据：PDF p.15, topic 3 The Gaseous State, outcome (d)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Chemistry 2e §9.3, Stoichiometry of Gaseous Substances, Mixtures, and Reactions（`src_openstax_chemistry_2e_2019`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 海洋碳酸盐缓冲与酸化（Chemistry / SG）

- 目标：`singapore_h2_chemistry:sg_h2_chemistry_ocean_carbonate_buffer_acidification` / `pc_9b34bdf046e84b83e6eb72fb0ba9718b`
- 误区候选：缓冲体系能把 pH 永久固定，不受加入酸的量影响。（diagnostic_hypothesis）；海洋吸收更多 CO₂ 只会增加 CO₃²⁻，因此一定利于碳酸盐形成。（diagnostic_hypothesis）
- 教学序列：写出 CO₂(aq)—H₂CO₃—HCO₃⁻—CO₃²⁻ 平衡链。 → 加入 CO₂ 后逐步判断 H⁺ 与物种分布移动。 → 用缓冲容量和碳酸盐饱和度讨论生态后果。
- 避免：不要把所有无机碳物种合并成单一‘碳酸盐’量。
- 探针：为什么少量酸加入缓冲液 pH 变化小，但持续加入仍会明显变化？；海水吸收 CO₂ 后，H⁺、HCO₃⁻、CO₃²⁻通常怎样变化？
- 证据：PDF p.22, topic 10_1 Acid-Base Equilibria, outcome (f)（`src_sg_seab_h2_chemistry_9476_2026`）；OpenStax Chemistry 2e §14.6, Buffers; §15.3, Coupled Equilibria, ocean acidification（`src_openstax_chemistry_2e_2019`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 染色体结构与数量变异（Biology / CN-MAINLAND）

- 目标：`senior_secondary_biology:cn_sh_bio_chromosomal_variation` / `pc_86f481ac1e4983f5844e9bf459df5d7e`
- 误区候选：单个碱基改变就一定属于染色体结构变异。（diagnostic_hypothesis）；非整倍体表示细胞中每条染色体都多一份或少一份。（diagnostic_hypothesis）
- 教学序列：按碱基—基因—染色体片段—整套基因组建立尺度轴。 → 将实例放入结构变异、非整倍体或多倍体。 → 追踪每类变化影响的基因数量和剂量。
- 避免：不要把所有遗传物质变化都统称为染色体变异。
- 探针：比较一个碱基替换与一段染色体缺失的结构尺度。；某二倍体个体的一条染色体有三份，这是否表示所有染色体都三份？
- 证据：生物学标准PDF p.26（正文对应内容要求 3.3.5），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）；Web §13.2 Chromosomal Basis of Inherited Disorders（`src_openstax_biology_2e_2018`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 人类遗传病检测与预防（Biology / CN-MAINLAND）

- 目标：`senior_secondary_biology:cn_sh_bio_genetic_disease_screening` / `pc_2fa1c85e0d7a4075a6c60f671d363261`
- 误区候选：遗传筛查阳性就等于已经确诊患病。（diagnostic_hypothesis）；筛查阴性表示遗传病风险必定为零。（diagnostic_hypothesis）
- 教学序列：先区分筛查目标、检测范围与确认诊断。 → 用 2×2 表解释真/假阳性与真/假阴性。 → 在结果解释中加入外显率、家族史和知情选择。
- 避免：不要把概率性结果转述成确定命运。
- 探针：某携带者筛查阳性后为什么还可能需要确认检测？；一项只检测常见变异的结果为阴性，可以排除所有遗传风险吗？
- 证据：生物学标准PDF p.26（正文对应内容要求 3.3.6），必修·遗传与进化（`src_cn_moe_senior_high_biology_2020`）；Web §17.1 Biotechnology; genetic diagnosis and gene therapy（`src_openstax_biology_2e_2018`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 生态系统稳定性（Biology / CN-MAINLAND）

- 目标：`senior_secondary_biology:cn_sh_bio_ecosystem_stability` / `pc_a853ca2b6804c3743c7a40f1c2ae5081`
- 误区候选：稳定生态系统的种群数量和环境条件应保持完全不变。（diagnostic_hypothesis）；物种数增加必然让任何生态系统更稳定。（diagnostic_hypothesis）
- 教学序列：分别定义抵抗力、恢复力和波动范围。 → 比较同一扰动下两个系统的时间序列。 → 再分析物种功能冗余与强相互作用对稳定性的条件影响。
- 避免：不要把多样性与稳定性教成无条件单调关系。
- 探针：系统受扰后偏离原状态并逐渐返回，扰动期间是否一定不稳定？；增加一个外来物种为何可能降低而非提高稳定性？
- 证据：生物学标准PDF p.34（正文对应内容要求 2.3.1），选择性必修·生物与环境（`src_cn_moe_senior_high_biology_2020`）；Web §§46.1-46.3 ecosystem dynamics, trophic interactions and biogeochemical cycles（`src_openstax_biology_2e_2018`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 细胞信号传导阶段（Biology / SG）

- 目标：`singapore_h2_biology:sg_h2_biology_cell_signalling_stages` / `pc_3ac937bdebb4ad7797e85cc8b7d9f724`
- 误区候选：所有信号分子都必须进入细胞核才能产生反应。（diagnostic_hypothesis）；信号放大表示细胞凭空制造更多原始配体。（diagnostic_hypothesis）
- 教学序列：把过程分成接收、转导和响应。 → 比较膜受体与胞内受体的配体性质。 → 沿级联逐层记录分子数量和状态变化。
- 避免：不要用一条无细胞区室的箭头代表全部信号传导。
- 探针：亲水配体不能穿膜时如何改变细胞核中的转录？；一个受体激活多个激酶说明什么，是否产生了更多配体？
- 证据：PDF p.18, topic 3 Energy and Equilibrium, outcome (m)（`src_sg_seab_h2_biology_9477_2026`）；OpenStax Biology 2e §§9.1-9.3, Signaling Molecules and Cellular Receptors; Propagation of the Signal; Response to the Signal（`src_openstax_biology_2e_2018`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 系统发育与分子分类（Biology / SG）

- 目标：`singapore_h2_biology:sg_h2_biology_phylogeny_and_molecular_classification` / `pc_39ea2f145fd0890bf614289d08b77ce3`
- 误区候选：系统发育树末端相邻的两个现生物种中，一个是另一个的祖先。（diagnostic_hypothesis）；只要一个可见性状相同，就能确定两个物种亲缘最近。（diagnostic_hypothesis）
- 教学序列：先只按节点和共同祖先读树，不看末端左右顺序。 → 旋转节点验证拓扑不变。 → 比较形态同源证据与多序列分子证据。
- 避免：不要用末端横向距离表示亲缘远近。
- 探针：树上 A、B 从同一最近节点分叉，A 是否是 B 的祖先？；鲨鱼和海豚体形相似为何不能单独证明亲缘最近？
- 证据：PDF p.19, topic 4 Biological Evolution, outcome (k)（`src_sg_seab_h2_biology_9477_2026`）；PDF p.19, topic 4 Biological Evolution, outcome (l)（`src_sg_seab_h2_biology_9477_2026`）；OpenStax Biology 2e §§20.1-20.2, Organizing Life on Earth; Determining Evolutionary Relationships（`src_openstax_biology_2e_2018`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。

## 气候驱动的生态重新分布（Biology / SG）

- 目标：`singapore_h2_biology:sg_h2_biology_climate_ecological_redistribution` / `pc_6ecac9d7cebd37963fde0acddff3be22`
- 误区候选：气候变暖会让所有物种都整齐向两极移动。（diagnostic_hypothesis）；物种分布范围移动本身就是个体完成了遗传适应。（diagnostic_hypothesis）
- 教学序列：先区分个体迁移、物种分布变化与遗传适应三个尺度。 → 在地图上叠加气候梯度、地形和栖息地屏障。 → 对不同扩散能力物种预测方向、速度和滞后。
- 避免：不要把‘向极地移动’当成所有类群的普遍定律。
- 探针：温度适生区北移但中间城市化严重，物种一定能同步北移吗？；一代内个体迁入较凉地区是否已经证明遗传适应？
- 证据：PDF p.21, topic B Impact of Climate Change on Animals and Plants, outcome (f)（`src_sg_seab_h2_biology_9477_2026`）；OpenStax Biology 2e §§44.1 and 44.5, The Scope of Ecology; Climate and the Effects of Global Climate Change（`src_openstax_biology_2e_2018`）
- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。
