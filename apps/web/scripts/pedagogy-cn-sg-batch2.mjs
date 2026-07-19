const profile = (value) => value;

export const SECOND_BATCH_SPECS = [
  profile({
    key: "cn_math_total_probability", subject: "Mathematics", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_mathematics", nodeId: "cn_sh_math_total_probability_formula",
    misconceptions: [
      ["add_conditionals", "全概率公式可以直接相加各条件下的概率，不需要乘条件所占权重。", "写成 P(A)=ΣP(A|Bᵢ)，遗漏 P(Bᵢ)。", "各分支对 A 的贡献是 P(Bᵢ)P(A|Bᵢ)，再对完备互斥分组求和。"],
      ["overlapping_partition", "全概率公式中的分组可以重叠，只要把所有情况列出来即可。", "同一样本结果被两个 Bᵢ 同时覆盖并重复计数。", "Bᵢ 必须两两互斥且并集覆盖样本空间；否则不能直接按该公式求和。"],
    ],
    sequence: ["先画出完备且互斥的分组树。", "在每条路径标出 P(Bᵢ) 与 P(A|Bᵢ) 并相乘。", "汇总前检查分组是否遗漏或重叠。"],
    rationale: "把公式还原为互斥路径概率，可同时暴露漏权重与重复计数。",
    avoid: "不要只要求背写求和符号而不检验分组条件。",
    probes: [
      ["weighted_branches", "某产品来自两条产线的比例为 0.3、0.7，次品率分别为 0.02、0.01。写出总次品率而不先计算。", "写成 0.3×0.02+0.7×0.01。", ["分支权重完整", "路径内使用乘法"], ["add_conditionals"]],
      ["partition_audit", "分组 B₁=‘偶数’、B₂=‘大于3’能否直接用于掷骰子的全概率公式？", "不能；4、6 重叠且 1、3 未覆盖，应重新构造完备互斥分组。", ["识别重叠", "识别未覆盖"], ["overlapping_partition"]],
    ],
  }),
  profile({
    key: "cn_math_vector_projection", subject: "Mathematics", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_mathematics", nodeId: "cn_sh_math_vector_projection",
    misconceptions: [
      ["projection_is_length", "向量投影一定是非负长度。", "夹角为钝角时仍把投影写成正数。", "标量投影含方向符号，a 在 b 方向上的投影为 a·b/|b|，可为负。"],
      ["divide_by_wrong_norm", "求 a 在 b 上的向量投影时只需用 a·b 除以 |b|。", "把标量投影直接当成向量投影，遗漏单位方向或第二个 |b|。", "向量投影为 (a·b/|b|²)b；标量投影与向量投影必须区分。"],
    ],
    sequence: ["先画 b 的正方向和 a 的垂足。", "分别计算带符号的标量投影与向量投影。", "用结果是否与 b 共线及点积符号检查。"],
    rationale: "几何方向、标量值和向量结果分层后，公式中的范数次数不再是孤立记忆。",
    avoid: "不要把‘投影长度’与‘投影向量’混用。",
    probes: [
      ["obtuse_sign", "a 与 b 夹角为 120°，a 在 b 方向的标量投影符号是什么？", "cos120°<0，因此投影为负，表示沿 b 的反方向。", ["符号正确", "方向解释正确"], ["projection_is_length"]],
      ["vector_check", "给出 a=(2,1)、b=(1,1)，求 a 在 b 上的向量投影并验证与 b 共线。", "得到 (3/2,3/2)，两个分量比例与 b 一致。", ["公式正确", "共线检查完成"], ["divide_by_wrong_norm"]],
    ],
  }),
  profile({
    key: "cn_math_logarithmic_behavior", subject: "Mathematics", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_mathematics", nodeId: "cn_sh_math_logarithmic_function_behavior",
    misconceptions: [
      ["all_increasing", "所有底数的对数函数都随 x 增大而增大。", "对 0<a<1 的 logₐx 仍画成递增。", "a>1 时递增；0<a<1 时递减，且两者定义域均为 x>0。"],
      ["cross_y_axis", "对数函数图像可以穿过 y 轴并在 x≤0 处继续。", "把 x=0 当截距或在负半轴画实数图像。", "实数对数函数的定义域是 x>0，x=0 是竖直渐近线而非图像点。"],
    ],
    sequence: ["用指数函数的反函数关系确定定义域和值域。", "比较 a>1 与 0<a<1 两类图像。", "用关键点 (1,0) 和渐近线 x=0 校验草图。"],
    rationale: "从反函数和关键结构恢复图像，比单独记忆弯曲方向更稳健。",
    avoid: "不要用一个底数的图像代表所有对数函数。",
    probes: [
      ["base_half", "不列表计算，判断 y=log₁⁄₂x 的单调性并说明原因。", "底数在 0 与 1 之间，函数递减。", ["单调性正确", "底数条件完整"], ["all_increasing"]],
      ["domain_audit", "评价‘log₂0=0，所以图像过原点’。", "错误；0 不在定义域，log₂1=0，图像过 (1,0)。", ["定义域正确", "关键点纠正正确"], ["cross_y_axis"]],
    ],
  }),
  profile({
    key: "sg_math_log_laws", subject: "Mathematics", jurisdiction: "SG",
    graphId: "a_level_mathematics", nodeId: "mat_log_laws",
    misconceptions: [
      ["cancel_log_operator", "对数记号可以像代数公因子一样在分子分母中约去。", "把 logₐx/logₐy 化为 x/y，或把 logₐ 当成变量。", "logₐ 是运算符；商法则是 logₐx-logₐy=logₐ(x/y)，不能删除运算符。", {
        claim_scope: "observed_in_study_population",
        population_zh: "两所新加坡中学共有 81 名中三学生参加测验；剔除 2 份因学生不适而无效的答卷后，错误分析使用 79 份答卷。",
        study_context_zh: "47 题纸笔 ToSUL 对数理解测验，并对错误作概念、过度泛化与其他错误分类。",
        finding_zh: "研究在讨论中记录了把 logₐ 当作变量或公因子并进行约分的作答。",
        generalisability_zh: "只说明该研究样本中观察到此推理，不代表全部新加坡学生或当前届学生的发生率。",
        evidence_refs: [{ source_id: "src_nie_sg_logarithm_misconceptions_2005", locator: "PDF pp.7-8（期刊 pp.58-59）, 81 participants and 79 analysed scripts; PDF p.14（期刊 p.65）, cancelling log_a as a common factor" }],
      }],
      ["distribute_subtraction", "ln(x-5) 可以展开成 ln x-ln 5。", "把对数的乘除法则错误推广到和差。", "只有乘积和商可按法则拆分；对数一般不对加减分配。", {
        claim_scope: "reported_by_examiners",
        population_zh: "参加 2024 年 6 月 Cambridge 9709/31 的考生；报告未披露样本量。",
        study_context_zh: "Cambridge International A Level Mathematics 9709 官方阅卷报告对具体试题作答的总结。",
        finding_zh: "阅卷报告把 ln(x-5)=ln x-ln 5 列为该题最常见错误。",
        generalisability_zh: "仅能说明该次 9709/31 考生群体的阅卷观察，不能换算为新加坡学生发生率。",
        evidence_refs: [{ source_id: "src_cambridge_9709_examiner_report_june_2024", locator: "PDF p.20, Paper 9709/31, Question 2: most common error ln(x-5)=ln x-ln 5" }],
      }],
    ],
    sequence: ["先把 logₐb 读作‘以 a 为底，得到 b 所需的指数’。", "用具体数值检验乘积、商与错误的和差展开。", "让学习者分类哪些变形来自指数律，哪些没有对应指数律。"],
    rationale: "把符号恢复成运算意义，并用反例检验过度泛化，可针对研究与阅卷报告记录的错误。",
    avoid: "不要只增加同型操练；研究显示部分错误来自规则过度泛化而非练习量不足。",
    probes: [
      ["operator_not_factor", "评价 (log₂8)/(log₂4)=8/4，并给出正确值。", "不能约去 log₂；原式为 3/2。", ["拒绝约运算符", "数值计算正确"], ["cancel_log_operator"]],
      ["subtraction_counterexample", "用 x=7 检验 ln(x-5)=ln x-ln5 是否成立。", "左侧 ln2，右侧 ln(7/5)，二者不同。", ["构造有效反例", "指出和差无分配律"], ["distribute_subtraction"]],
    ],
  }),
  profile({
    key: "sg_math_complex_mod_arg", subject: "Mathematics", jurisdiction: "SG",
    graphId: "singapore_h2_mathematics", nodeId: "sg_h2_math_complex_mod_arg_conjugate",
    misconceptions: [
      ["atan_sets_quadrant", "计算 arctan(y/x) 得到的数值总是复数的主辐角。", "x<0 时仍使用计算器返回的锐角而不修正象限。", "主辐角要由 (x,y) 所在象限确定；arctan 比值只提供参考角。"],
      ["conjugate_same_argument", "共轭复数与原复数具有相同主辐角。", "只看到模相同而忽略虚部符号反转。", "非实数共轭关于实轴对称，辐角通常由 θ 变为 -θ，并按主值区间处理。"],
    ],
    sequence: ["先在 Argand 图定位点与象限。", "再求模和参考角，并按象限确定主辐角。", "画共轭点检查模不变、辐角反号。"],
    rationale: "图形先行可避免把计算器反正切的值直接当成带象限信息的答案。",
    avoid: "不要只教 atan(y/x) 而不要求画象限草图。",
    probes: [
      ["quadrant_two", "求 z=-1+i 的主辐角，并说明为何不是 -π/4。", "点在第二象限，主辐角为 3π/4。", ["象限正确", "主辐角正确"], ["atan_sets_quadrant"]],
      ["conjugate_geometry", "若 arg z=2π/3，写出 arg(conj z) 并画出两点关系。", "主辐角为 -2π/3，关于实轴对称。", ["辐角反号", "几何关系正确"], ["conjugate_same_argument"]],
    ],
  }),
  profile({
    key: "sg_math_normal_parameters", subject: "Mathematics", jurisdiction: "SG",
    graphId: "singapore_h2_mathematics", nodeId: "sg_h2_math_normal_probabilities_parameters",
    misconceptions: [
      ["variance_is_sd", "正态分布 N(μ,σ²) 中第二个参数就是标准差 σ。", "标准化时直接用题给第二参数作分母。", "第二参数是方差 σ²；标准化分母应为其正平方根 σ。"],
      ["z_keeps_units", "标准分数 z 与原变量具有相同单位。", "给 z 标注厘米、秒等单位。", "z=(x-μ)/σ 是同单位量之比，因此无量纲。"],
    ],
    sequence: ["先在 N(μ,σ²) 标出均值、方差和标准差。", "把原变量转换为无量纲 z。", "用概率对称性和数量级反查结果。"],
    rationale: "参数语义和单位检查能在查表前截获最常见的标准化错误。",
    avoid: "不要把 N(μ,σ²) 的第二参数口头简称为‘散布’而不说明平方。",
    probes: [
      ["variance_five", "X~N(10,25)，标准化 x=15 时分母是多少？", "分母是 σ=5，不是 25。", ["识别方差", "开方正确"], ["variance_is_sd"]],
      ["unit_check", "身高标准化后的 z=1.2 是否应写 1.2 cm？", "不应；减法后除以同单位标准差，单位约掉。", ["无量纲判断正确", "单位消去解释正确"], ["z_keeps_units"]],
    ],
  }),
  profile({
    key: "cn_physics_friction", subject: "Physics", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_physics", nodeId: "cn_sh_physics_friction",
    misconceptions: [
      ["always_opposes_motion", "摩擦力总与物体的运动方向相反。", "传送带加速物体或驱动车轮情境中仍画成反向。", "摩擦力反对接触面的相对运动或相对运动趋势，不必反对物体相对地面的速度。", {
        claim_scope: "observed_in_study_population",
        population_zh: "山东、贵州、新疆多所中学共有 496 名约 15—16 岁学生参加；论文摘要报告总体分析数据为 492 人，此项结果对应其中 194 名 A2 基础力概念未掌握子样本。",
        study_context_zh: "33 题力与运动纸笔诊断测验，以选项级 Q 矩阵和 TS-MC-DINA-H 模型估计错误模型概率。",
        finding_zh: "M14‘摩擦力总是反对运动’在 A2 未掌握子样本中的平均后验概率约为 0.47。",
        generalisability_zh: "该数值是特定模型对特定未掌握子样本的估计，不是中国高中生总体发生率。",
        evidence_refs: [{ source_id: "src_aps_cn_forces_motion_diagnostic_2026", locator: "Article p.7 Participants: 496 students across schools in Shandong, Guizhou and Xinjiang; pp.10-12 Fig.7/A2: M14 p≈0.47 among 194 A2 non-mastery students; abstract: analysis of 492" }],
      }],
      ["static_always_max", "静摩擦力一出现就等于最大静摩擦力 μₛN。", "在较小外力下仍直接代入 μₛN。", "静摩擦在 0 到最大值之间按平衡需要调节；临界滑动时才取最大值。"],
    ],
    sequence: ["先确定接触面之间的相对运动趋势。", "区分静摩擦的自适应范围与滑动摩擦模型。", "用整体运动结果反查摩擦方向和大小。"],
    rationale: "以接触面相对运动为判断对象，能替代‘总与速度反向’的过度简化。",
    avoid: "不要把摩擦方向口诀绑定在物体对地速度上。",
    probes: [
      ["conveyor_acceleration", "物块无滑动地随向右加速的传送带启动，物块所受摩擦方向为何向右？", "物块相对带面有向左滑动趋势，静摩擦向右使其加速。", ["相对趋势正确", "方向与加速度相容"], ["always_opposes_motion"]],
      ["subcritical_force", "水平面上最大静摩擦为 10 N，外推力为 4 N 且物体静止，摩擦力多大？", "静摩擦为 4 N，反向平衡外力。", ["未直接取最大值", "平衡条件正确"], ["static_always_max"]],
    ],
  }),
  profile({
    key: "cn_physics_electric_field_lines", subject: "Physics", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_physics", nodeId: "cn_sh_physics_electric_field_lines",
    misconceptions: [
      ["lines_are_trajectories", "电场线就是带电粒子实际运动轨迹。", "把任意场线直接当作粒子路径而不考虑初速度和惯性。", "电场线给出各点电场方向；粒子轨迹还取决于电荷符号、初速度和动力学过程。"],
      ["line_crossing_allowed", "两条电场线可以在同一点交叉，表示两个方向叠加。", "在同一点画出两条不同切向。", "静电场中每一点的合电场方向唯一，因此场线不能交叉。"],
    ],
    sequence: ["先把场线切向定义为局部电场方向。", "在同一场中分别给正负试探电荷和不同初速度。", "用方向唯一性检查交叉、闭合和箭头。"],
    rationale: "把场的表示与粒子的运动方程分开，可防止线条相似导致概念混同。",
    avoid: "不要用会运动的粒子动画却不区分场线、速度矢量和轨迹。",
    probes: [
      ["initial_velocity", "正电荷以横向初速度进入匀强竖直电场，轨迹为何不是一条竖直场线？", "水平方向保留速度，竖直方向受力加速，形成曲线。", ["区分场方向与速度", "运动分解正确"], ["lines_are_trajectories"]],
      ["crossing_contradiction", "若两条电场线在一点交叉，会造成什么物理矛盾？", "同一点将有两个切向即两个电场方向，违背合场唯一性。", ["指出方向冲突", "使用合电场唯一性"], ["line_crossing_allowed"]],
    ],
  }),
  profile({
    key: "cn_physics_self_induction", subject: "Physics", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_physics", nodeId: "cn_sh_physics_self_induction",
    misconceptions: [
      ["opposes_current", "自感电动势总与电流方向相反。", "电流减小时仍画成阻止原电流的方向。", "自感电动势反对电流的变化：增大时反向，减小时维持原方向。"],
      ["instant_current_change", "含电感电路开关动作后电流可以瞬间跳变。", "把电感支路电流直接从原值改为零或最终值。", "理想电感电流连续；突变需要无限大电压。"],
    ],
    sequence: ["先判断电流正在增大还是减小。", "用楞次定律确定自感电动势试图维持的变化方向。", "画开关前、瞬间和稳态三时刻的电流。"],
    rationale: "围绕变化率而非当前方向组织推理，可统一通断电两类情境。",
    avoid: "不要把‘反向’省略成无条件口诀。",
    probes: [
      ["switch_off_direction", "线圈原有向右电流，断电瞬间自感电流方向如何？", "仍趋向向右，以阻止电流减小。", ["识别减小", "维持方向正确"], ["opposes_current"]],
      ["continuity", "为何理想电感支路电流不能从 2 A 瞬间变为 0？", "di/dt 若无限大则 Ldi/dt 需要无限大电压。", ["电流连续性", "电压关系解释正确"], ["instant_current_change"]],
    ],
  }),
  profile({
    key: "sg_physics_field_equipotential", subject: "Physics", jurisdiction: "SG",
    graphId: "singapore_h2_physics", nodeId: "sg_h2_physics_field_lines_equipotential_geometry",
    misconceptions: [
      ["parallel_same_object", "等势线与电场线是同一种线，因此应彼此平行。", "把两个图层画成同方向。", "电场线沿电势下降最快方向，处处垂直于等势线或等势面。"],
      ["equal_spacing_equal_potential", "相邻等势线几何间距相等就保证电势差相等。", "不读取标注数值，只凭距离判断。", "场强近似为电势梯度；必须同时知道电势差和空间距离。"],
    ],
    sequence: ["先在电势图上标出高低值。", "画出垂直等势线且指向低电势的电场线。", "用 ΔV/Δs 比较不同区域场强。"],
    rationale: "数值梯度与几何正交结合，可避免只靠线条外观判断。",
    avoid: "不要提供无数值标签的等势图后要求比较场强。",
    probes: [
      ["orthogonal_draw", "给出同心圆等势线，画出电场方向并说明正交关系。", "电场沿径向并垂直圆，方向由高电势指向低电势。", ["几何正交", "方向依据正确"], ["parallel_same_object"]],
      ["gradient_compare", "两个区域等势线间距相同，但电势差分别为 5 V 和 20 V，哪处场强更大？", "20 V 区域更大，因为 |E|≈|ΔV|/Δs。", ["同时使用差值和距离", "比较正确"], ["equal_spacing_equal_potential"]],
    ],
  }),
  profile({
    key: "sg_physics_infinite_well", subject: "Physics", jurisdiction: "SG",
    graphId: "singapore_h2_physics", nodeId: "sg_h2_physics_infinite_square_well_states",
    misconceptions: [
      ["ground_zero_energy", "无限深方势阱的基态能量可以为零。", "把 n=0 当作允许量子数。", "边界条件要求 n=1,2,...；基态具有非零零点能。"],
      ["psi_nonzero_wall", "粒子被无限势垒限制时，波函数在势阱边界仍可取非零值。", "画出的驻波在墙处不是节点。", "无限势垒要求边界处及阱外 ψ=0。"],
    ],
    sequence: ["先施加两端 ψ=0 的边界条件。", "由允许驻波得到 n 从 1 开始。", "比较 ψ、|ψ|² 的节点和能量随 n² 变化。"],
    rationale: "从边界条件推导量子数，可避免把经典静止状态直接移入量子体系。",
    avoid: "不要直接给 En 公式而不解释 n=0 为何无物理解。",
    probes: [
      ["n_zero", "把 n=0 代入 En 得 0，为什么这不是允许基态？", "对应 ψ 处处为零，无法归一化为一个粒子状态。", ["识别零波函数", "归一化解释正确"], ["ground_zero_energy"]],
      ["wall_nodes", "在 0≤x≤L 画基态波函数并标出边界值。", "半个正弦波，ψ(0)=ψ(L)=0。", ["边界节点正确", "基态形状正确"], ["psi_nonzero_wall"]],
    ],
  }),
  profile({
    key: "sg_physics_uncertainty", subject: "Physics", jurisdiction: "SG",
    graphId: "singapore_h2_physics", nodeId: "sg_h2_physics_heisenberg_position_momentum_uncertainty",
    misconceptions: [
      ["always_equality", "任何量子态都严格满足 ΔxΔp=ℏ/2。", "把不等式下限写成所有状态的固定乘积。", "一般关系是 ΔxΔp≥ℏ/2；只有特定最小不确定态才取等号。"],
      ["instrument_only", "位置—动量不确定性完全由测量仪器不够精密造成，改进仪器即可同时消除。", "把量子态本身的统计展宽归为经典测量误差。", "不确定关系约束同一量子态的位置与动量分布宽度，不只是仪器扰动。"],
    ],
    sequence: ["先把 Δx、Δp 定义为同一量子态中两种测量分布的标准差。", "区分不等式下限与只在最小不确定态成立的等号。", "比较仪器误差与量子态本征展宽，检验能否靠校准同时消除。"],
    rationale: "先明确统计量和适用对象，能同时纠正固定乘积与纯仪器误差两种解释。",
    avoid: "不要只用‘观察会撞到粒子’的经典显微镜比喻解释不确定性。",
    probes: [
      ["greater_product", "某量子态测得 ΔxΔp=3ℏ/2，这是否违反不确定关系？说明理由。", "不违反；3ℏ/2 大于下限 ℏ/2，等号不是所有态的固定要求。", ["正确使用不等式", "区分下限与等号"], ["always_equality"]],
      ["ideal_instrument", "若位置与动量仪器都没有校准误差，是否可让同一量子态的 Δx、Δp 同时趋近 0？", "不能；即使去除仪器误差，量子态分布仍受 ΔxΔp≥ℏ/2 约束。", ["区分仪器误差与态展宽", "应用同一量子态约束"], ["instrument_only"]],
    ],
  }),
  profile({
    key: "cn_chem_energy_conservation", subject: "Chemistry", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_chemistry", nodeId: "cn_sh_chem_energy_forms_conservation",
    misconceptions: [
      ["energy_consumed", "放热反应会把体系中的能量消耗掉，因此总能量减少。", "只记录体系热量变化，不记录环境获得的能量。", "能量在体系与环境之间转移或改变形式；选定完整边界后总能量守恒。"],
      ["bond_break_releases", "断裂化学键会释放储存在键里的能量。", "把所有断键项写成负能量。", "断键需要吸收能量，成键释放能量；反应净效应取决于两者差额。"],
    ],
    sequence: ["先明确体系与环境边界。", "分别记账断键吸能与成键放能。", "用能量流图核对体系变化与环境变化符号相反。"],
    rationale: "边界与分项记账能纠正‘能量被消耗’及断键符号倒置。",
    avoid: "不要用‘键中藏着能量，打断就放出’这类比喻。",
    probes: [
      ["system_surroundings", "放热 50 kJ 时体系和环境能量各怎样变化？", "体系减少 50 kJ，环境增加 50 kJ（忽略其他交换）。", ["边界明确", "能量收支相反"], ["energy_consumed"]],
      ["bond_ledger", "为何燃烧虽要先断键却仍可总体放热？", "断键吸能，但形成更稳定产物键释放更多能量。", ["断键吸能", "净差解释正确"], ["bond_break_releases"]],
    ],
  }),
  profile({
    key: "cn_chem_quantised_levels", subject: "Chemistry", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_chemistry", nodeId: "cn_sh_chem_quantised_levels_transitions",
    misconceptions: [
      ["any_photon_absorbed", "原子可以吸收任意能量的光子，只是跃迁高度不同。", "光子能量不匹配能级差时仍画跃迁。", "理想化离散能级间吸收要求光子能量与允许能级差匹配。"],
      ["emission_same_level", "电子停留在同一能级也会持续发射该能级的能量。", "没有能级下降却画出光子。", "发射来自较高能级向较低能级跃迁，光子能量等于能级差。"],
    ],
    sequence: ["先画离散能级而非连续高度。", "将每个光子能量与两能级差匹配。", "分别用向上、向下箭头表示吸收与发射。"],
    rationale: "把光谱线和能级差一一对应，可阻止连续经典能量图景替代量子化。",
    avoid: "不要把能级图画成电子可停在任意高度的斜坡。",
    probes: [
      ["mismatch", "能级差为 3.0 eV，入射光子为 2.5 eV，理想孤立原子是否完成该跃迁？", "不能；能量不匹配指定跃迁。", ["匹配条件正确", "不主张部分跃迁"], ["any_photon_absorbed"]],
      ["emission_arrow", "在能级图上表示 5 eV 到 2 eV 的发射并给出光子能量。", "向下箭头，光子能量 3 eV。", ["跃迁方向正确", "能级差正确"], ["emission_same_level"]],
    ],
  }),
  profile({
    key: "cn_chem_salt_hydrolysis", subject: "Chemistry", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_chemistry", nodeId: "cn_sh_chem_salt_hydrolysis",
    misconceptions: [
      ["all_salts_neutral", "盐溶液都呈中性，因为盐来自酸碱中和。", "NH₄Cl、Na₂CO₃ 等仍判断 pH=7。", "盐离子可与水发生酸碱平衡；溶液酸碱性取决于共轭酸碱强弱。"],
      ["spectator_hydrolyses", "强酸强碱形成的所有离子都会明显水解。", "对 Na⁺、Cl⁻ 写出主导 pH 的水解方程。", "强酸强碱的共轭离子酸碱性极弱，通常视为旁观离子。"],
    ],
    sequence: ["把盐拆成阳离子与阴离子。", "追溯各离子的共轭酸或共轭碱强弱。", "只为会显著与水反应的离子写平衡并判断 pH。"],
    rationale: "从离子来源和共轭强弱判断，比‘盐等于中性’的产物标签可靠。",
    avoid: "不要只按盐名背酸性或碱性。",
    probes: [
      ["ammonium_chloride", "NH₄Cl 溶液为何可呈酸性？", "NH₄⁺是弱碱 NH₃ 的共轭酸并向水供质子，Cl⁻近似旁观。", ["识别活跃离子", "水解方向正确"], ["all_salts_neutral"]],
      ["nacl", "NaCl 溶液中 Na⁺、Cl⁻为何通常不主导 pH？", "它们分别来自强碱和强酸，共轭酸碱性很弱。", ["来源追溯正确", "旁观近似说明正确"], ["spectator_hydrolyses"]],
    ],
  }),
  profile({
    key: "sg_chem_base_dissociation", subject: "Chemistry", jurisdiction: "SG",
    graphId: "singapore_h2_chemistry", nodeId: "sg_h2_chemistry_base_dissociation_water_ionic_product",
    misconceptions: [
      ["strength_equals_concentration", "碱越强就表示它的初始浓度一定越高。", "用浓度大小直接替代 Kb 或解离程度比较碱强弱。", "强弱是平衡常数或解离倾向；浓度是配制量，两者是不同变量。", {
        claim_scope: "observed_in_study_population",
        population_zh: "主研究招募 141 名新加坡九年级学生；结果分析使用其中 92 份无缺失作答的完整答卷。",
        study_context_zh: "25 题四层选择—理由—信心诊断工具，用于区分猜测、知识不足与替代概念。",
        finding_zh: "研究把‘初始浓度越高，碱越强’记录为 AC11；在 92 份完整答卷中占 10.87%。",
        generalisability_zh: "只说明论文样本及其诊断定义中的观察，不能直接外推到 H2 学生或全国发生率。",
        evidence_refs: [{ source_id: "src_rsc_sg_acid_base_conceptions_2016", locator: "Web article, Main study and Results, lines 366-411; Appendix D AC11, 10.87% of 92 complete scripts" }],
      }],
      ["kw_is_h_concentration", "水的离子积 Kw 就是纯水中 H⁺ 的浓度。", "把 Kw=10⁻¹⁴ 写成 [H⁺]=10⁻¹⁴ mol dm⁻³。", "Kw=[H⁺][OH⁻]；25°C 中性水两者相等，各约为 10⁻⁷ mol dm⁻³。"],
    ],
    sequence: ["先分开标注初始浓度、平衡浓度和 Kb。", "用平衡表达式求解弱碱解离。", "再由 Kw 连接 [H⁺] 与 [OH⁻]，并检查单位和数量级。"],
    rationale: "显式分离体系配制量与物种固有平衡倾向，可针对研究记录的混同。",
    avoid: "不要用‘强=多’的日常语言代替强度定义。",
    probes: [
      ["dilute_strong_vs_concentrated_weak", "0.001 mol dm⁻³ 强碱与 0.1 mol dm⁻³ 弱碱，能否只凭初始浓度判断哪一个‘更强’？", "不能；强弱由解离/平衡常数定义，浓度另行影响最终 pH。", ["区分强弱与浓度", "拒绝仅凭浓度判断"], ["strength_equals_concentration"]],
      ["kw_product", "25°C 时若 [OH⁻]=10⁻⁵ mol dm⁻³，求 [H⁺]。", "由 Kw/[OH⁻] 得 10⁻⁹ mol dm⁻³。", ["使用乘积关系", "数量级正确"], ["kw_is_h_concentration"]],
    ],
  }),
  profile({
    key: "sg_chem_partial_pressures", subject: "Chemistry", jurisdiction: "SG",
    graphId: "singapore_h2_chemistry", nodeId: "sg_h2_chemistry_ideal_gas_mixture_partial_pressures",
    misconceptions: [
      ["equal_partial_pressures", "同一容器中的各种气体分压必然相等。", "忽略摩尔分数，平均分配总压。", "理想混合物中 pᵢ=xᵢP；只有摩尔数相等时分压才相等。"],
      ["partial_uses_component_volume", "计算分压时应给每种气体分配一部分容器体积。", "用 nᵢRT/Vᵢ 且各 Vᵢ 之和为容器体积。", "理想混合物各组分都占据整个容器体积，pᵢ=nᵢRT/V_total。"],
    ],
    sequence: ["先确定各组分摩尔数与总摩尔数。", "用摩尔分数求分压并检查分压和。", "再用同一总容积的理想气体式交叉验证。"],
    rationale: "用两条等价路径和总压守恒检查，可暴露平均分配与分割体积错误。",
    avoid: "不要用液体分层类比气体分压。",
    probes: [
      ["mole_fraction", "1 mol N₂ 与 3 mol H₂ 的总压为 200 kPa，分别求分压。", "50 kPa 与 150 kPa。", ["摩尔分数正确", "分压和为总压"], ["equal_partial_pressures"]],
      ["same_volume", "为何混合气中每个组分计算 pᵢ 时都使用容器总容积？", "分子在理想模型下遍及整个可用体积，各组分压力是对壁碰撞贡献。", ["总容积判断正确", "微观解释合理"], ["partial_uses_component_volume"]],
    ],
  }),
  profile({
    key: "sg_chem_ocean_buffer", subject: "Chemistry", jurisdiction: "SG",
    graphId: "singapore_h2_chemistry", nodeId: "sg_h2_chemistry_ocean_carbonate_buffer_acidification",
    misconceptions: [
      ["buffer_fixed_ph", "缓冲体系能把 pH 永久固定，不受加入酸的量影响。", "不讨论容量就声称任意 CO₂ 输入都不改变 pH。", "缓冲只能在有限容量内减小 pH 变化；组分耗尽后缓冲失效。"],
      ["co2_only_carbonate_increase", "海洋吸收更多 CO₂ 只会增加 CO₃²⁻，因此一定利于碳酸盐形成。", "忽略酸化平衡使 CO₃²⁻被转为 HCO₃⁻。", "溶解 CO₂ 增加碳酸体系酸度，通常降低 pH 并减少可用 CO₃²⁻。"],
    ],
    sequence: ["写出 CO₂(aq)—H₂CO₃—HCO₃⁻—CO₃²⁻ 平衡链。", "加入 CO₂ 后逐步判断 H⁺ 与物种分布移动。", "用缓冲容量和碳酸盐饱和度讨论生态后果。"],
    rationale: "平衡链与容量边界能避免把‘缓冲’理解为无限恒定。",
    avoid: "不要把所有无机碳物种合并成单一‘碳酸盐’量。",
    probes: [
      ["capacity", "为什么少量酸加入缓冲液 pH 变化小，但持续加入仍会明显变化？", "共轭组分有限，会被逐步消耗并超过缓冲容量。", ["有限容量", "组分消耗机制"], ["buffer_fixed_ph"]],
      ["carbonate_shift", "海水吸收 CO₂ 后，H⁺、HCO₃⁻、CO₃²⁻通常怎样变化？", "H⁺和 HCO₃⁻增加，CO₃²⁻减少。", ["平衡方向正确", "物种不混同"], ["co2_only_carbonate_increase"]],
    ],
  }),
  profile({
    key: "cn_bio_chromosomal_variation", subject: "Biology", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_biology", nodeId: "cn_sh_bio_chromosomal_variation",
    misconceptions: [
      ["gene_mutation_equals_chromosome", "单个碱基改变就一定属于染色体结构变异。", "把点突变归入缺失、重复、倒位或易位。", "基因突变发生在核苷酸序列尺度；染色体结构变异涉及较大片段重排。"],
      ["aneuploid_all_genes", "非整倍体表示细胞中每条染色体都多一份或少一份。", "把三体解释成全套染色体数同时增加。", "非整倍体通常是个别染色体数目异常；整套增加属于多倍体等另一类型。"],
    ],
    sequence: ["按碱基—基因—染色体片段—整套基因组建立尺度轴。", "将实例放入结构变异、非整倍体或多倍体。", "追踪每类变化影响的基因数量和剂量。"],
    rationale: "尺度轴能防止名称中的‘突变/变异’掩盖层级差异。",
    avoid: "不要把所有遗传物质变化都统称为染色体变异。",
    probes: [
      ["point_vs_deletion", "比较一个碱基替换与一段染色体缺失的结构尺度。", "前者是序列级基因突变，后者是染色体片段结构变异。", ["尺度区分正确", "类别正确"], ["gene_mutation_equals_chromosome"]],
      ["trisomy", "某二倍体个体的一条染色体有三份，这是否表示所有染色体都三份？", "不是；这是特定染色体三体，属于非整倍体。", ["局部数目异常", "不误判多倍体"], ["aneuploid_all_genes"]],
    ],
  }),
  profile({
    key: "cn_bio_genetic_screening", subject: "Biology", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_biology", nodeId: "cn_sh_bio_genetic_disease_screening",
    misconceptions: [
      ["positive_is_diagnosis", "遗传筛查阳性就等于已经确诊患病。", "忽略假阳性、外显率和确认性检测。", "筛查改变风险估计；诊断通常需确认性检测并结合临床情境。"],
      ["negative_zero_risk", "筛查阴性表示遗传病风险必定为零。", "忽略检测覆盖范围、灵敏度和未知变异。", "阴性降低特定检测范围内的风险，但不排除未覆盖变异或其他病因。"],
    ],
    sequence: ["先区分筛查目标、检测范围与确认诊断。", "用 2×2 表解释真/假阳性与真/假阴性。", "在结果解释中加入外显率、家族史和知情选择。"],
    rationale: "把检测结果放回条件概率和范围，可避免阳性/阴性的绝对化。",
    avoid: "不要把概率性结果转述成确定命运。",
    probes: [
      ["positive_followup", "某携带者筛查阳性后为什么还可能需要确认检测？", "筛查并非零假阳性，且检测目标与临床诊断不同。", ["区分筛查与诊断", "指出不确定来源"], ["positive_is_diagnosis"]],
      ["coverage_limit", "一项只检测常见变异的结果为阴性，可以排除所有遗传风险吗？", "不能；罕见或未覆盖变异仍可能存在。", ["识别检测范围", "结论不过度"], ["negative_zero_risk"]],
    ],
  }),
  profile({
    key: "cn_bio_ecosystem_stability", subject: "Biology", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_biology", nodeId: "cn_sh_bio_ecosystem_stability",
    misconceptions: [
      ["stable_no_change", "稳定生态系统的种群数量和环境条件应保持完全不变。", "把季节波动或恢复过程直接判为失稳。", "稳定性可表现为围绕范围波动、抵抗扰动或扰动后恢复，不要求静止。"],
      ["more_species_always_stable", "物种数增加必然让任何生态系统更稳定。", "不考虑功能角色、相互作用强度和外来入侵。", "多样性可能提高冗余与韧性，但稳定性取决于网络结构、功能与扰动情境。"],
    ],
    sequence: ["分别定义抵抗力、恢复力和波动范围。", "比较同一扰动下两个系统的时间序列。", "再分析物种功能冗余与强相互作用对稳定性的条件影响。"],
    rationale: "时间序列与多维指标可替代‘不变=稳定’的静态直觉。",
    avoid: "不要把多样性与稳定性教成无条件单调关系。",
    probes: [
      ["recovery_curve", "系统受扰后偏离原状态并逐渐返回，扰动期间是否一定不稳定？", "应结合偏离幅度与恢复速度评价，短期变化不等于永久失稳。", ["使用恢复力", "不要求完全不变"], ["stable_no_change"]],
      ["invasive_species", "增加一个外来物种为何可能降低而非提高稳定性？", "可能破坏关键相互作用、竞争本地种或改变能量网络。", ["提出机制", "承认情境依赖"], ["more_species_always_stable"]],
    ],
  }),
  profile({
    key: "sg_bio_cell_signalling", subject: "Biology", jurisdiction: "SG",
    graphId: "singapore_h2_biology", nodeId: "sg_h2_biology_cell_signalling_stages",
    misconceptions: [
      ["signal_enters_cell", "所有信号分子都必须进入细胞核才能产生反应。", "对不能穿膜的配体仍画其直接进入细胞核。", "许多亲水配体在膜受体处被接收，经胞内转导级联改变效应器或基因表达。"],
      ["amplification_creates_signal", "信号放大表示细胞凭空制造更多原始配体。", "把第二信使增加画成细胞外配体复制。", "放大发生在转导级联：一个激活分子可激活多个下游分子。"],
    ],
    sequence: ["把过程分成接收、转导和响应。", "比较膜受体与胞内受体的配体性质。", "沿级联逐层记录分子数量和状态变化。"],
    rationale: "阶段和空间位置共同标注，可防止把配体、第二信使和响应混成一个过程。",
    avoid: "不要用一条无细胞区室的箭头代表全部信号传导。",
    probes: [
      ["hydrophilic_ligand", "亲水配体不能穿膜时如何改变细胞核中的转录？", "先结合膜受体，再由胞内级联和转录因子传递信息。", ["膜受体接收", "跨阶段机制完整"], ["signal_enters_cell"]],
      ["cascade_count", "一个受体激活多个激酶说明什么，是否产生了更多配体？", "说明级联放大；配体不必增加。", ["放大层级正确", "不混同配体"], ["amplification_creates_signal"]],
    ],
  }),
  profile({
    key: "sg_bio_phylogeny", subject: "Biology", jurisdiction: "SG",
    graphId: "singapore_h2_biology", nodeId: "sg_h2_biology_phylogeny_and_molecular_classification",
    misconceptions: [
      ["tips_are_ancestors", "系统发育树末端相邻的两个现生物种中，一个是另一个的祖先。", "沿树梢从左到右读成进化阶梯。", "末端通常表示并列现生类群；共同祖先位于其分叉节点。"],
      ["similarity_single_trait", "只要一个可见性状相同，就能确定两个物种亲缘最近。", "忽略趋同演化及多基因证据。", "分类应综合同源性状和分子序列；单一相似可能来自趋同。"],
    ],
    sequence: ["先只按节点和共同祖先读树，不看末端左右顺序。", "旋转节点验证拓扑不变。", "比较形态同源证据与多序列分子证据。"],
    rationale: "节点阅读和旋转操作能破除把树当线性进步阶梯的视觉偏误。",
    avoid: "不要用末端横向距离表示亲缘远近。",
    probes: [
      ["sister_taxa", "树上 A、B 从同一最近节点分叉，A 是否是 B 的祖先？", "不是；A、B 是姐妹群，共享该节点代表的祖先。", ["节点解释正确", "不把末端当祖先"], ["tips_are_ancestors"]],
      ["convergence", "鲨鱼和海豚体形相似为何不能单独证明亲缘最近？", "相似可由水生环境下趋同演化产生，应结合更多同源与分子证据。", ["识别趋同", "要求多证据"], ["similarity_single_trait"]],
    ],
  }),
  profile({
    key: "sg_bio_climate_redistribution", subject: "Biology", jurisdiction: "SG",
    graphId: "singapore_h2_biology", nodeId: "sg_h2_biology_climate_ecological_redistribution",
    misconceptions: [
      ["all_move_poleward", "气候变暖会让所有物种都整齐向两极移动。", "忽略海拔、微气候、屏障和物种生态位差异。", "重新分布的方向和速度取决于温度、水分、栖息地连通性及物种迁移能力。"],
      ["range_shift_is_adaptation", "物种分布范围移动本身就是个体完成了遗传适应。", "把迁移、种群筛选和个体生理适应混为一谈。", "范围移动可由个体迁移和种群周转产生；遗传适应需跨代等位基因频率变化。"],
    ],
    sequence: ["先区分个体迁移、物种分布变化与遗传适应三个尺度。", "在地图上叠加气候梯度、地形和栖息地屏障。", "对不同扩散能力物种预测方向、速度和滞后。"],
    rationale: "空间约束与时间尺度并列，可避免单因子、单方向叙事。",
    avoid: "不要把‘向极地移动’当成所有类群的普遍定律。",
    probes: [
      ["barrier_case", "温度适生区北移但中间城市化严重，物种一定能同步北移吗？", "不一定；连通性和扩散能力可能造成滞后或局部灭绝。", ["考虑屏障", "结论有条件"], ["all_move_poleward"]],
      ["migration_vs_evolution", "一代内个体迁入较凉地区是否已经证明遗传适应？", "没有；这是迁移，需跨代遗传组成改变才能称为进化适应。", ["尺度区分正确", "遗传证据要求正确"], ["range_shift_is_adaptation"]],
    ],
  }),
];
