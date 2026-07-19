#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { SECOND_BATCH_SPECS } from "./pedagogy-cn-sg-batch2.mjs";

const ROOT = resolve(import.meta.dirname, "../../..");
const DATA = resolve(ROOT, "data/knowledge-graphs");
const TODAY = "2026-07-20";
const outputPath = resolve(DATA, "pedagogy/core/cn_sg_core_pedagogy.v1.json");
const reviewPath = resolve(DATA, "review/pending/pedagogy/cn_sg_core_pedagogy.v1.review.zh-CN.md");

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};
const unique = (values) => [...new Set(values)];
const reviewField = (value) => value.replace(/[。；]+$/u, "");
const profile = (value) => value;

const FIRST_BATCH_SPECS = [
  profile({
    key: "cn_math_complex_arithmetic", subject: "Mathematics", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_mathematics", nodeId: "cn_sh_math_complex_arithmetic",
    misconceptions: [
      ["combine_real_imag", "复数加减时可以把实部和虚部交叉合并。", "把 (2+3i)+(4-i) 写成含 2+4i 或 3+4i 的结果。", "加减法必须分别合并实部与虚部；i 不是与实数同类的项。"],
      ["divide_components", "复数除法可以直接让实部除实部、虚部除虚部。", "把 (a+bi)/(c+di) 写成 a/c+(b/d)i。", "除法要乘分母共轭，使分母成为实数后再分别整理实部和虚部。"],
    ],
    sequence: ["先用有序对表示 a+bi，要求每一步分别处理两个分量。", "用一组正确与错误的除法展开对比，定位共轭因子只用于实化分母。", "最后回到代数形式，并以乘回原分母检查商。"],
    rationale: "有序对表征能把同类项规则显式化，共轭后的逆向检验可区分程序记忆与真正理解。",
    avoid: "不要把“乘共轭”教成无条件口诀；加减法和乘法不需要同一套除法程序。",
    probes: [
      ["error_analysis", "判断并纠正：(3+2i)/(1-i)=3/1+(2/-1)i。说明错误发生在哪一步。", "指出不能逐分量相除，并完成乘以 1+i 的正确计算。", ["明确识别非法除法规则", "共轭实化分母正确", "实部虚部整理正确"], ["divide_components"]],
      ["inverse_check", "求 (2-i)/(1+2i)，并用你的答案乘回 1+2i 验证。", "得到正确商并以复数乘法恢复 2-i。", ["计算过程可复核", "验证步骤与原式一致"], ["combine_real_imag", "divide_components"]],
    ],
  }),
  profile({
    key: "cn_math_derivative_optimisation", subject: "Mathematics", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_mathematics", nodeId: "cn_sh_math_derivative_optimisation",
    misconceptions: [
      ["stationary_is_max", "只要 f'(x)=0，该点就一定是最大值。", "找到驻点后不检查符号变化、端点或定义域就宣布最优。", "驻点只是候选；必须比较导数符号、端点和可行域。"],
      ["optimise_wrong_quantity", "实际问题中把任意给出的量写成函数并求导就能得到题目要求的最优值。", "求导对象与题目目标量不同，或漏掉约束关系。", "先定义决策变量、目标量和约束，再把目标化为一个可行域内的一元函数。"],
    ],
    sequence: ["先让学习者写出目标量、变量、单位和可行域，不立即求导。", "把约束代入形成一元目标函数，列出驻点和端点候选。", "用符号表或数值比较确认最优，并把结果翻译回实际语境。"],
    rationale: "把建模、微分判定和情境解释分开检查，可防止正确求导掩盖错误目标或不可行答案。",
    avoid: "不要只给内部驻点且必为最优的练习，否则无法检验端点和约束意识。",
    probes: [
      ["endpoint_case", "在闭区间 [0,4] 上给定成本函数 C(x)，说明寻找最小值必须检查哪些候选。", "列出区间内驻点和两个端点，并说明比较函数值或导数符号。", ["候选集合完整", "说明闭区间端点作用"], ["stationary_is_max"]],
      ["model_choice", "给出固定周长矩形问题，只写出决策变量、目标函数和可行域，不求导。", "以一边为变量，用约束消去另一边，面积为目标并给出正长度范围。", ["目标量正确", "约束使用正确", "可行域有实际意义"], ["optimise_wrong_quantity"]],
    ],
  }),
  profile({
    key: "cn_math_regression_limits", subject: "Mathematics", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_mathematics", nodeId: "cn_sh_math_regression_prediction_limits",
    misconceptions: [
      ["correlation_causation", "回归线斜率非零就证明一个变量导致另一个变量变化。", "把观察关联直接写成因果结论。", "回归描述样本中的线性关联；因果需要额外设计、机制和混杂控制。"],
      ["extrapolation_safe", "回归方程在任何自变量范围都同样可靠。", "把远离样本范围的外推值当作同等可信预测。", "预测可信度依赖数据范围、关系形态和条件稳定性；外推必须单独标注风险。"],
    ],
    sequence: ["先在散点图上标出观测范围、异常点和可能的非线性。", "再解释斜率、残差与拟合方向，但禁止使用因果词。", "给出区间内插值和区间外外推各一例，比较可辩护程度。"],
    rationale: "把图形范围和残差放在方程之前，可迫使学习者先检查模型适用条件。",
    avoid: "不要只要求代入回归方程算数值；这无法暴露因果和外推错误。",
    probes: [
      ["causal_claim", "一项观察研究得到学习时长与成绩正相关。哪些结论可以说，哪些不能说？", "允许描述关联和预测，拒绝无额外证据的因果断言，并指出可能混杂。", ["区分关联与因果", "至少提出一个混杂或设计限制"], ["correlation_causation"]],
      ["range_judgement", "样本年龄为 12–18 岁，是否可用回归线预测 60 岁人群？说明理由。", "判定为高风险外推，并说明关系可能在新范围失效。", ["识别超出数据范围", "说明模型稳定性未知"], ["extrapolation_safe"]],
    ],
  }),
  profile({
    key: "sg_math_quadratic_methods", subject: "Mathematics", jurisdiction: "SG",
    graphId: "singapore_secondary_mathematics", nodeId: "sg_sec_math_quadratic_formula_complete_graph",
    misconceptions: [
      ["formula_sign", "代入二次公式时，-b 只表示把 b 前面的书写符号原样抄下。", "当 b 为负数时仍写成负的数值，造成双重符号错误。", "先识别 a、b、c 的带符号数值，再整体计算 -b 和判别式。"],
      ["graph_root_integer", "图像法求根时，曲线最接近 x 轴的整点就是精确根。", "忽略交点位于两刻度之间或只给近似读数。", "根是与 x 轴交点的横坐标；图像读数通常是近似值并受刻度限制。"],
    ],
    sequence: ["同一道方程分别用配方、公式和图像处理，标注每种方法提供的精确或近似信息。", "要求先写带符号的 a、b、c，再代入公式。", "用代回原方程或交点检查候选根。"],
    rationale: "多表示对照能把方法选择、符号和精度问题分离出来。",
    avoid: "不要把三种方法当成互不相关的步骤清单；应比较它们如何表示同一组根。",
    probes: [
      ["negative_b", "用二次公式解 2x²-3x-2=0，先单独写出 a、b、c 和 -b。", "正确识别 b=-3、-b=3，并得到两个根。", ["系数带符号识别正确", "公式与根正确"], ["formula_sign"]],
      ["graph_precision", "图像显示交点约为 x=1.4。这个数值一定是精确根吗？如何验证？", "说明图像读数近似，可代入或用代数法验证并报告精度。", ["区分近似与精确", "给出合理验证方法"], ["graph_root_integer"]],
    ],
  }),
  profile({
    key: "sg_math_rational_inequalities", subject: "Mathematics", jurisdiction: "SG",
    graphId: "singapore_h2_mathematics", nodeId: "sg_h2_math_rational_quadratic_inequalities",
    misconceptions: [
      ["cross_multiply_unknown_sign", "解分式不等式时可以不判断分母符号直接交叉相乘。", "分母可能为负仍保持不等号方向。", "应先移到一边做整体符号分析，或分情况确认乘数符号。"],
      ["include_denominator_zero", "使分子或分母为零的点都属于等号成立的边界。", "在非严格不等式答案中包含令分母为零的值。", "分子零点可按不等号决定是否包含；分母零点永远不在定义域。"],
    ],
    sequence: ["先列出分子零点和分母零点，并用不同符号标记。", "在数轴区间选测试点或分析因式符号，得到整体正负。", "最后按严格性选择分子零点，并永久排除分母零点。"],
    rationale: "把零点类型和定义域显式分离，可避免机械交叉相乘造成的符号与端点错误。",
    avoid: "不要在分母符号未知时直接乘去分母。",
    probes: [
      ["domain_boundary", "解 (x-1)/(x+2)≥0，并解释 x=1 与 x=-2 是否包含。", "得到 x<-2 或 x≥1，说明 -2 无定义、1 使分式为零。", ["符号区间正确", "两类边界说明正确"], ["include_denominator_zero"]],
      ["method_critique", "评价“把不等式两边乘以 x+2”这一步在未讨论 x+2 符号时是否有效。", "指出不等号方向依赖乘数正负，必须分情况或改用符号表。", ["识别未知符号风险", "给出有效替代方法"], ["cross_multiply_unknown_sign"]],
    ],
  }),
  profile({
    key: "sg_math_probability_representations", subject: "Mathematics", jurisdiction: "SG",
    graphId: "singapore_h2_mathematics", nodeId: "sg_h2_math_probability_representations",
    misconceptions: [
      ["tree_branches_equal", "概率树上同一节点发出的各分支应当等长或等概率。", "没有依据就把分支概率平均分配。", "树的几何长度没有概率意义；同一节点条件下的分支概率总和为 1。"],
      ["add_along_path", "树图上一条完整路径的概率应把各分支概率相加。", "把连续发生的联合事件用加法计算。", "同一路径表示连续条件事件，通常相乘；互斥路径汇总目标事件时才相加。"],
    ],
    sequence: ["先用样本空间表格列出联合结果，再把同一信息转换成树图。", "在每个节点检查分支和为 1，在每条路径标明条件。", "最后把目标事件写成互斥路径集合，区分路径内乘法与路径间加法。"],
    rationale: "表示间转换能检验树图是否保留了样本空间和条件结构。",
    avoid: "不要从“乘法/加法口诀”开始；先明确事件结构和互斥关系。",
    probes: [
      ["path_rule", "给出两阶段抽样树图，说明为何一条路径相乘而两条互斥目标路径相加。", "用联合事件和互斥并集解释两种运算。", ["路径内条件概率乘法正确", "路径间互斥加法解释正确"], ["add_along_path"]],
      ["representation_check", "把一个 2×3 结果表转换成概率树，并说明每个节点的分支总和。", "树图完整保留六个联合结果，节点分支概率和为 1。", ["样本空间无遗漏重复", "条件概率标注一致"], ["tree_branches_equal"]],
    ],
  }),
  profile({
    key: "cn_physics_force_vectors", subject: "Physics", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_physics", nodeId: "cn_sh_physics_force_composition_vectors",
    misconceptions: [
      ["add_magnitudes", "两个力的合力大小总等于两个力大小之和。", "对非同向力仍直接相加标量。", "力是矢量；只有同向共线时合力大小才等于大小之和。"],
      ["components_extra_forces", "把一个力分解后，原力和两个分力会同时作为三个真实作用力存在。", "受力图同时画原力与其两个分量并全部求和。", "分力是同一力的等效表示；选定分解后不再重复计入原力。"],
    ],
    sequence: ["先只画真实相互作用产生的力，再选坐标轴。", "用平行四边形或正交分解表示同一矢量。", "用极端方向检查合力大小是否可能。"],
    rationale: "先区分真实力和表示方式，可避免把分量误当新增相互作用。",
    avoid: "不要在受力图尚未完成时直接套分量公式。",
    probes: [
      ["perpendicular_sum", "两个大小分别为 3 N 和 4 N 的垂直力，合力为何不是 7 N？", "用矢量三角形得到 5 N 并说明方向。", ["使用矢量合成", "大小与方向均说明"], ["add_magnitudes"]],
      ["diagram_audit", "受力图画了重力 mg 及其 mg sinθ、mg cosθ。指出重复计数并修正。", "说明保留重力或保留分量之一，不能三者同时作为独立力。", ["识别分量非新增力", "修正后的受力图逻辑一致"], ["components_extra_forces"]],
    ],
  }),
  profile({
    key: "cn_physics_kinetic_energy", subject: "Physics", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_physics", nodeId: "cn_sh_physics_kinetic_energy_theorem",
    misconceptions: [
      ["net_work_is_force", "动能变化由某一个最大的力做功决定。", "只计算重力或拉力而忽略摩擦等其他力。", "动能定理使用合力所做的总功，即所有力做功的代数和。"],
      ["negative_work_negative_energy", "总功为负意味着物体的动能变成负数。", "把 ΔK<0 直接解释为 K<0。", "负功表示动能减少；动能本身仍是非负量。"],
    ],
    sequence: ["明确初末状态并列出每个力的功。", "先求总功，再使用 W_net=ΔK。", "检查最终动能非负且与速度变化方向一致。"],
    rationale: "逐力记账再合并能暴露漏力和符号错误。",
    avoid: "不要把动能定理写成任意单力的功等于动能变化。",
    probes: [
      ["multi_force", "物体受拉力做功 20 J、摩擦力做功 -8 J，动能如何变化？", "总功 12 J，因此动能增加 12 J。", ["代数和正确", "动能变化解释正确"], ["net_work_is_force"]],
      ["negative_net_work", "初动能 30 J，总功 -10 J。末动能是多少？负功意味着什么？", "末动能 20 J，负功只表示减少。", ["区分 K 与 ΔK", "结果保持非负"], ["negative_work_negative_energy"]],
    ],
  }),
  profile({
    key: "cn_physics_electric_potential", subject: "Physics", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_physics", nodeId: "cn_sh_physics_electric_potential_quantities",
    misconceptions: [
      ["potential_depends_test_charge", "某点电势会随放入的试探电荷大小或正负改变。", "把 V=U/q 理解为改变 q 会改变场源建立的 V。", "电势是场在位置上的属性；试探电荷改变的是电势能 U=qV。"],
      ["field_always_high_to_low_for_charge", "任何电荷都沿电势降低方向运动。", "忽略负电荷受力方向与正电荷相反。", "电场方向指向电势降低；正电荷受力同向，负电荷受力反向。"],
    ],
    sequence: ["先固定场源，比较同一点放不同试探电荷时 V 与 U。", "画电势高低和电场方向，再分别放正负电荷。", "用 ΔU=qΔV 检查能量变化符号。"],
    rationale: "把场属性和粒子属性分层，可避免 V、U、q 混用。",
    avoid: "不要只背“沿电场电势降低”，却不检查电荷符号和受力。",
    probes: [
      ["test_charge_change", "同一点把 +q 换成 -2q，电势和电势能分别怎样变？", "V 不变，U 由 qV 改为 -2qV。", ["场属性判断正确", "电势能随电荷变化正确"], ["potential_depends_test_charge"]],
      ["negative_charge_motion", "负电荷从静止释放且仅受静电力时，会趋向高电势还是低电势？用能量说明。", "趋向较高电势，使 qV 降低并转为动能。", ["考虑负电荷符号", "能量链正确"], ["field_always_high_to_low_for_charge"]],
    ],
  }),
  profile({
    key: "sg_physics_velocity_selector", subject: "Physics", jurisdiction: "SG",
    graphId: "singapore_h2_physics", nodeId: "sg_h2_physics_crossed_field_velocity_selector",
    misconceptions: [
      ["forces_same_direction", "速度选择器中的电场力和磁场力应同向叠加才能选速。", "方向图中两力同向，却仍令 qE=qvB。", "无偏转要求两力大小相等、方向相反。"],
      ["selected_speed_charge_mass", "选定速度 v=E/B 会随粒子的质量或电荷量改变。", "在结果中保留 q 或 m，或认为负电荷选速大小不同。", "平衡式 qE=qvB 中 q 抵消；理想选速大小与质量、电荷量无关，但方向判断依赖电荷符号。"],
    ],
    sequence: ["先独立用 qE 和 qv×B 判断方向。", "只有两力相反时再写大小平衡。", "推导 v=E/B 后分别检查单位、正负电荷和偏离选速时的偏转方向。"],
    rationale: "先方向后大小能阻止学生用错误受力图得到形式正确的公式。",
    avoid: "不要跳过叉乘方向直接背 v=E/B。",
    probes: [
      ["direction_check", "给定 E、B、v 方向和正电荷，画出两力并判断能否无偏转。", "两力方向正确且只有相反时可平衡。", ["电场力方向正确", "磁场力方向正确", "平衡判断正确"], ["forces_same_direction"]],
      ["parameter_change", "质量加倍、电荷改为 -q 时，选定速度大小是否变化？", "理想大小仍为 E/B；负号只改变两力各自方向，仍可相互抵消。", ["q、m 依赖判断正确", "说明电荷符号的方向作用"], ["selected_speed_charge_mass"]],
    ],
  }),
  profile({
    key: "sg_physics_wavefunction_probability", subject: "Physics", jurisdiction: "SG",
    graphId: "singapore_h2_physics", nodeId: "sg_h2_physics_wavefunction_probability_superposition",
    misconceptions: [
      ["psi_is_probability", "波函数 ψ 本身就是位置概率。", "直接把负的 ψ 当成负概率。", "概率密度是 |ψ|²；ψ 可为负或复数而不代表负概率。"],
      ["superpose_probabilities", "量子叠加时可以先把各状态概率密度相加而忽略振幅。", "用 |ψ1|²+|ψ2|² 代替 |aψ1+bψ2|²。", "先线性叠加振幅再取模平方；交叉项体现干涉。"],
    ],
    sequence: ["用正负波函数值对比 ψ 与 |ψ|²。", "先归一化单个状态，再构造线性叠加。", "展开模平方并识别交叉项何时保留或消失。"],
    rationale: "把振幅、概率密度和归一化分开处理，可避免经典概率直觉直接替代量子叠加。",
    avoid: "不要把波函数描述成在空间起伏的物质波而不说明概率解释。",
    probes: [
      ["negative_psi", "若某处 ψ(x)<0，该处概率密度是否为负？说明。", "否；概率密度为 |ψ|²≥0。", ["区分 ψ 与概率密度", "非负性说明正确"], ["psi_is_probability"]],
      ["interference_term", "比较 |ψ1+ψ2|² 与 |ψ1|²+|ψ2|²，指出差异来源。", "写出交叉项并解释为振幅叠加产生的干涉。", ["先叠加振幅", "识别交叉项"], ["superpose_probabilities"]],
    ],
  }),
  profile({
    key: "sg_physics_beta_neutrino", subject: "Physics", jurisdiction: "SG",
    graphId: "singapore_h2_physics", nodeId: "sg_h2_physics_beta_decay_neutrino_inference",
    misconceptions: [
      ["energy_not_conserved", "β 衰变电子能谱连续说明单次衰变不守恒能量。", "把未观测能量直接视为消失。", "连续谱提示还有未探测粒子分担能量和动量，而不是放弃守恒。"],
      ["neutrino_added_by_formula", "中微子只是为了配平核电荷数而加入。", "只检查核子数与电荷，不讨论连续能谱和动量。", "中微子的推断来自能量、动量和角动量等守恒缺口；其电中性使核电荷配平不受影响。"],
    ],
    sequence: ["先列出母核、子核和电子可观测量。", "比较两体衰变应有的离散能量与实际连续谱。", "引入中性弱相互作用粒子并逐项检查守恒。"],
    rationale: "从观测异常到最小解释的推理链能体现中微子是证据驱动的模型修正。",
    avoid: "不要只给完整核方程让学生机械填空。",
    probes: [
      ["spectrum_inference", "为何连续 β 能谱与两体衰变预期冲突？", "两体运动学给定能量，连续谱说明还有粒子分担能量和动量。", ["指出两体预期", "用额外粒子解释连续性"], ["energy_not_conserved"]],
      ["conservation_audit", "在一个 β 衰变事件中，中微子需要补足哪些守恒量？", "至少讨论能量与动量，不把它仅作为电荷配平项。", ["守恒量不止电荷", "推断与观测缺口相连"], ["neutrino_added_by_formula"]],
    ],
  }),
  profile({
    key: "cn_chem_redox_agents", subject: "Chemistry", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_chemistry", nodeId: "cn_sh_chem_oxidising_reducing_agents",
    misconceptions: [
      ["oxidiser_is_oxidised", "氧化剂在反应中自身被氧化。", "把“使别人氧化”与“自身氧化”混为一谈。", "氧化剂接受电子并被还原；还原剂给出电子并被氧化。"],
      ["oxygen_required", "只有有氧元素参加的反应才是氧化还原反应。", "无法识别金属置换或卤素反应中的电子转移。", "氧化还原的核心是氧化数变化或电子转移，不要求含氧。"],
    ],
    sequence: ["先标氧化数并找升降，再写电子得失。", "根据谁使对方发生变化命名氧化剂和还原剂。", "用不含氧的反例检验定义。"],
    rationale: "把过程、物种和命名分开，可避免中文术语造成主客体混淆。",
    avoid: "不要只用得氧失氧作为唯一判据。",
    probes: [
      ["agent_role", "在 Zn+Cu²⁺→Zn²⁺+Cu 中指出氧化剂、还原剂及各自变化。", "Cu²⁺得电子被还原且为氧化剂；Zn失电子被氧化且为还原剂。", ["电子得失正确", "剂的命名正确"], ["oxidiser_is_oxidised"]],
      ["oxygen_free", "Cl₂+2Br⁻→2Cl⁻+Br₂ 是否为氧化还原反应？为何？", "是；氯得电子、溴离子失电子，虽无氧元素。", ["以电子或氧化数判断", "拒绝含氧必要条件"], ["oxygen_required"]],
    ],
  }),
  profile({
    key: "cn_chem_aqueous_equilibria", subject: "Chemistry", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_chemistry", nodeId: "cn_sh_chem_aqueous_equilibrium_applications",
    misconceptions: [
      ["equilibrium_stops", "离子平衡建立后，电离、沉淀或水解过程停止。", "用“反应结束”描述动态平衡。", "微观正逆过程仍持续，只是宏观组成在给定条件下稳定。"],
      ["k_changes_concentration", "加入同离子或稀释溶液会改变同温度下的平衡常数。", "把平衡组成变化等同于 K 改变。", "在给定温度下 K 固定；扰动改变反应商并使体系移动到新的组成。"],
    ],
    sequence: ["分别写出平衡表达式和当前反应商。", "判断扰动先改变哪些浓度，再比较 Q 与 K。", "追踪新平衡组成，同时声明温度不变时 K 不变。"],
    rationale: "Q 与 K 的分工能把瞬时扰动、移动方向和最终状态组织成因果链。",
    avoid: "不要只背勒夏特列方向而不写参与平衡的粒子。",
    probes: [
      ["dynamic_equilibrium", "饱和溶液中沉淀质量不变，是否表示溶解和结晶停止？", "否；两过程速率相等，宏观质量稳定。", ["微观动态说明", "宏观稳定说明"], ["equilibrium_stops"]],
      ["q_k_change", "恒温下加入同离子后，Ksp 和离子浓度怎样变化？", "Ksp 不变；瞬时 Q 改变并通过沉淀/溶解调整浓度。", ["K 与温度关系正确", "组成变化链正确"], ["k_changes_concentration"]],
    ],
  }),
  profile({
    key: "cn_chem_internal_energy", subject: "Chemistry", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_chemistry", nodeId: "cn_sh_chem_internal_energy_state",
    misconceptions: [
      ["heat_content", "体系内能就是体系中储存的热。", "把热量当作状态量并说物体“含有多少热”。", "内能是状态函数；热是因温差发生的能量传递过程。"],
      ["temperature_only", "只要温度相同，任何体系的内能都相同。", "忽略物质的量、组成和相态。", "内能依赖温度、组成、物质的量和聚集状态等体系状态。"],
    ],
    sequence: ["先区分状态量与过程量，用 U、q、w 标记。", "比较同温但质量、相态或组成不同的体系。", "用 ΔU=q+w 讨论能量传递后状态变化。"],
    rationale: "多维状态比较能阻止学习者把温度当作内能的唯一代理。",
    avoid: "不要使用“体系含有热量”这类措辞。",
    probes: [
      ["state_process", "把内能、热、功分别归为状态量或过程量，并说明理由。", "U 是状态量；q、w 描述跨边界传递，依赖路径。", ["分类正确", "传递过程解释正确"], ["heat_content"]],
      ["same_temperature", "同温的 1 mol 液态水和 2 mol 水蒸气内能是否必相同？", "不必；物质的量和相态不同。", ["拒绝温度唯一决定", "指出至少两个状态因素"], ["temperature_only"]],
    ],
  }),
  profile({
    key: "sg_chem_acid_base_models", subject: "Chemistry", jurisdiction: "SG",
    graphId: "singapore_h2_chemistry", nodeId: "sg_h2_chemistry_acid_base_models_arrhenius_lewis",
    misconceptions: [
      ["all_acids_release_h", "任何 Lewis 酸都必须在水中释放 H⁺。", "无法把 BF₃ 或金属离子识别为 Lewis 酸。", "Arrhenius 模型限于水溶液 H⁺/OH⁻；Lewis 酸接受电子对，不要求含氢。"],
      ["base_must_oh", "Lewis 碱必须含 OH⁻。", "忽略 NH₃ 等孤对电子给体。", "Lewis 碱的判据是提供电子对形成配位键。"],
    ],
    sequence: ["对同一反应分别询问 Arrhenius 和 Lewis 判据是否适用。", "画电子对箭头识别受体与给体。", "用无质子反应检验模型边界。"],
    rationale: "通过选择模型而不是背多个定义，可建立适用域意识。",
    avoid: "不要把三个酸碱模型排列成互相替代的口号。",
    probes: [
      ["bf3_nh3", "在 BF₃+NH₃→F₃B←NH₃ 中指出 Lewis 酸碱并说明电子对方向。", "NH₃ 给出孤对为碱，BF₃ 接受电子对为酸。", ["给受体识别正确", "配位键方向正确"], ["all_acids_release_h", "base_must_oh"]],
      ["model_scope", "为何 Arrhenius 定义不足以完整描述 BF₃ 与 NH₃ 的反应？", "该反应不依赖水中 H⁺/OH⁻，但可由电子对转移解释。", ["指出 Arrhenius 适用限制", "正确选用 Lewis 模型"], ["all_acids_release_h"]],
    ],
  }),
  profile({
    key: "sg_chem_titration_indicators", subject: "Chemistry", jurisdiction: "SG",
    graphId: "singapore_h2_chemistry", nodeId: "sg_h2_chemistry_titration_curves_indicator_selection",
    misconceptions: [
      ["equivalence_ph7", "所有酸碱滴定的等当点 pH 都等于 7。", "弱酸强碱或强酸弱碱仍把等当点标在 7。", "等当点的 pH 取决于生成盐的酸碱水解；只有特定强酸强碱体系近似为 7。"],
      ["indicator_midpoint_equivalence", "指示剂变色区间的中点必须精确等于等当点 pH。", "只找一个相等数值，不考虑陡跃范围。", "合适指示剂的变色区间应落在等当点附近的陡峭 pH 变化区。"],
    ],
    sequence: ["先依据酸碱强弱预测等当点溶液组成和 pH 方向。", "画出缓冲区、等当点和陡跃区。", "把候选指示剂变色范围叠加到曲线上选择。"],
    rationale: "从溶液物种到曲线再到指示剂，可避免只凭 pH=7 的记忆。",
    avoid: "不要只按“强酸用某指示剂”的配对表教学。",
    probes: [
      ["weak_acid_equivalence", "弱酸用强碱滴定时，等当点为何通常大于 7？", "生成的共轭碱水解产生 OH⁻。", ["识别等当点主要物种", "水解方向正确"], ["equivalence_ph7"]],
      ["indicator_range", "给出滴定曲线和三种指示剂变色范围，说明选择依据。", "选择区间完全或主要落在陡跃区者，而非要求中点精确重合。", ["利用完整变色区间", "联系陡跃区"], ["indicator_midpoint_equivalence"]],
    ],
  }),
  profile({
    key: "sg_chem_substitution_stereochemistry", subject: "Chemistry", jurisdiction: "SG",
    graphId: "singapore_h2_chemistry", nodeId: "sg_h2_chemistry_nucleophilic_substitution_stereochemistry",
    misconceptions: [
      ["sn2_retention", "SN2 反应中亲核体可从任意方向进攻，因此构型通常保留。", "画正面进攻或不改变立体构型。", "SN2 的背面进攻导致反应中心构型反转。"],
      ["sn1_single_inversion", "SN1 经平面碳正离子后仍只从背面进攻，所以只生成反转产物。", "忽略平面中间体两面可接近。", "平面碳正离子可从两面受攻，理想化结果趋向外消旋混合。"],
    ],
    sequence: ["用三维楔线标出反应中心和离去基团。", "分别画 SN2 同步背面进攻与 SN1 平面中间体。", "从几何路径预测构型结果，而非先背标签。"],
    rationale: "把机理几何与产物构型直接相连，能区分名称记忆和空间推理。",
    avoid: "不要把 SN1 外消旋和 SN2 反转当成无机理依据的配对表。",
    probes: [
      ["sn2_draw", "画出手性卤代烷发生 SN2 时的进攻方向和产物构型变化。", "亲核体从离去基团反面进攻，产物发生构型反转。", ["背面进攻正确", "构型结果正确"], ["sn2_retention"]],
      ["sn1_faces", "为何 SN1 中间体允许两面进攻？这对产物有什么影响？", "碳正离子近似平面，两面可接近，形成两种构型并趋向外消旋。", ["平面中间体说明", "产物构型推断正确"], ["sn1_single_inversion"]],
    ],
  }),
  profile({
    key: "cn_bio_gene_segment", subject: "Biology", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_biology", nodeId: "cn_sh_bio_gene_nucleic_acid_segment",
    misconceptions: [
      ["all_genes_dna", "所有生物和病毒的基因都一定由 DNA 构成。", "面对 RNA 病毒仍坚持基因只能是 DNA 片段。", "多数细胞生物基因位于 DNA；部分病毒以 RNA 作为遗传物质。"],
      ["gene_equals_chromosome", "一个基因就是一条完整染色体。", "无法区分基因、DNA 分子和染色体的层级。", "基因是具有功能的核酸片段；染色体包含一条长 DNA 及相关蛋白并承载许多基因。"],
    ],
    sequence: ["用层级图连接碱基—核酸片段—DNA 分子—染色体。", "比较细胞生物和 RNA 病毒的遗传材料。", "给多个结构实例让学习者判断哪个层级是基因。"],
    rationale: "层级表征与病毒反例共同限定“多数”而非“全部”。",
    avoid: "不要把“基因是有遗传效应的 DNA 片段”无条件推广到所有病毒。",
    probes: [
      ["rna_virus", "RNA 病毒的基因为什么不违背“基因是功能性核酸片段”？", "基因的上位概念是核酸功能片段，病毒可用 RNA 承载遗传信息。", ["承认 RNA 基因", "使用核酸层级定义"], ["all_genes_dna"]],
      ["levels", "按包含关系排列：基因、DNA 分子、染色体，并说明并非所有 DNA 片段都是基因。", "基因通常是 DNA 的功能片段，DNA 与蛋白组成染色体；非编码区域不必都是基因。", ["层级关系正确", "功能片段边界正确"], ["gene_equals_chromosome"]],
    ],
  }),
  profile({
    key: "cn_bio_immunity_types", subject: "Biology", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_biology", nodeId: "cn_sh_bio_innate_adaptive_immunity",
    misconceptions: [
      ["innate_no_specificity", "先天免疫完全随机，不能识别任何共同病原特征。", "把非特异性理解为没有识别机制。", "先天免疫识别共享的病原或损伤模式，但不产生与特定抗原相同的克隆性记忆。"],
      ["adaptive_immediate", "适应性免疫第一次遇到抗原就能立刻达到最大反应。", "忽略克隆选择、扩增和记忆细胞形成所需时间。", "初次应答需要激活和扩增；记忆细胞使后续应答更快更强。"],
    ],
    sequence: ["按识别对象、响应速度、效应机制和记忆四维比较两类免疫。", "用同一感染的时间轴标出先天反应与初次适应性反应。", "再加入二次暴露，解释记忆效应。"],
    rationale: "多维比较避免把先天/适应性简化为“无识别/有识别”。",
    avoid: "不要把所有免疫细胞硬分成只属于一种系统而忽略协同。",
    probes: [
      ["pattern_recognition", "“非特异性免疫不识别任何病原信息”是否正确？", "不正确；它可识别共享模式，但缺少针对特定抗原的克隆性记忆。", ["识别共享模式", "区分特异性记忆"], ["innate_no_specificity"]],
      ["response_timeline", "比较同一抗原初次和二次暴露的适应性免疫反应。", "二次反应更快更强，原因是记忆细胞。", ["时间差正确", "机制归因正确"], ["adaptive_immediate"]],
    ],
  }),
  profile({
    key: "cn_bio_matter_energy", subject: "Biology", jurisdiction: "CN-MAINLAND",
    graphId: "senior_secondary_biology", nodeId: "cn_sh_bio_matter_cycles_energy_flow",
    misconceptions: [
      ["energy_cycles", "生态系统中的能量会像碳、氮等物质一样循环回到生产者。", "画出能量从分解者返回太阳或生产者的闭环。", "物质可在生态系统中循环；能量单向流动并以热等形式逐级散失。"],
      ["matter_disappears", "呼吸或分解会把物质转化成能量，因此物质消失。", "把质量减少直接解释为物质变成能量而不追踪产物。", "应追踪二氧化碳、水和无机盐等物质去向；能量转化不替代物质守恒。"],
    ],
    sequence: ["同一食物网分别画物质流和能量流两张图。", "在每个营养级记录输入、储存、呼吸散热和废物。", "用分解者闭合物质循环，但保持能量箭头开放。"],
    rationale: "双图表征能把相同箭头背后的物质和能量含义分开。",
    avoid: "不要用一张无标注箭头图同时表示物质和能量。",
    probes: [
      ["two_diagrams", "画出碳与能量在“草—兔—鹰—分解者”中的路径，指出哪一个闭合。", "碳可经分解和无机环境循环；能量由太阳进入并逐级散失，不闭合。", ["物质循环正确", "能量单向正确"], ["energy_cycles"]],
      ["respiration_products", "兔呼吸时有机物减少，它去了哪里？", "物质转为 CO₂、水等，化学能部分转为可用能和热。", ["物质产物可追踪", "能量与物质不混同"], ["matter_disappears"]],
    ],
  }),
  profile({
    key: "sg_bio_virus_life_boundary", subject: "Biology", jurisdiction: "SG",
    graphId: "singapore_h2_biology", nodeId: "sg_h2_biology_virus_living_boundary",
    misconceptions: [
      ["virus_is_cell", "病毒有遗传物质和蛋白质，因此就是一种很小的细胞。", "把衣壳当细胞膜或认为病毒有独立细胞质代谢。", "病毒是非细胞结构，缺少独立代谢和核糖体，复制依赖宿主。", {
        claim_scope: "observed_in_study_population",
        population_zh: "奥地利 133 名七年级、199 名十年级、133 名生物专业大学一年级及 181 名非生物专业大学一年级学生。",
        study_context_zh: "横断面问卷、概念列举与病毒绘图任务；论文比较四组的病毒结构和健康知识。",
        finding_zh: "研究记录到把病毒画成或描述成原核/真核细胞的表征，PDF p.10 展示了大学一年级生物学生实例。",
        generalisability_zh: "证据来自奥地利样本，只支持该错误模型确实被观察到，不能代表新加坡学生的发生率。",
        evidence_refs: [{ source_id: "src_plos_virus_knowledge_2017", locator: "PDF p.10, Fig.4 and caption: first-year biology students represented/described viruses as prokaryotic or eukaryotic cells" }],
      }],
      ["virus_not_living_simple", "病毒不满足细胞学说，所以讨论生命边界时只需回答“完全不活”。", "忽略遗传、变异和进化等生命样特征。", "病毒同时表现遗传、变异、进化和宿主依赖等特征，因此挑战二元生命定义。"],
    ],
    sequence: ["建立生命判据表：细胞结构、代谢、稳态、复制、遗传和进化。", "把细菌与病毒逐项对照并注明是否依赖宿主。", "要求用证据写出有条件结论，而非只选“活/不活”。"],
    rationale: "多判据比较能保留细胞学说边界，又不抹去病毒的生命样特征。",
    avoid: "不要把争议结论教成单一标签；应评价判据。",
    probes: [
      ["cell_comparison", "列出病毒和细菌在细胞结构、独立代谢及复制方式上的三项差异。", "病毒非细胞、无独立代谢且依赖宿主复制；细菌为细胞并可独立代谢繁殖。", ["三项判据准确", "不把衣壳当细胞结构"], ["virus_is_cell"]],
      ["qualified_judgement", "用至少四个生命判据讨论病毒是否属于生命。", "同时呈现支持和反对证据，并形成有条件结论。", ["证据双向", "结论与判据一致"], ["virus_not_living_simple"]],
    ],
  }),
  profile({
    key: "sg_bio_multilevel_gene_regulation", subject: "Biology", jurisdiction: "SG",
    graphId: "singapore_h2_biology", nodeId: "sg_h2_biology_multilevel_eukaryotic_gene_regulation",
    misconceptions: [
      ["regulation_only_transcription", "真核基因表达调控只发生在转录起始。", "面对 RNA 剪接、稳定性或蛋白降解仍归为转录调控。", "调控可发生在染色质、转录、转录后、翻译和翻译后多个层级。"],
      ["methylation_always_activate", "DNA 甲基化总会打开基因表达。", "不考虑甲基化位置和染色质可及性就断言表达增加。", "课程范围内通常把启动子附近 DNA 甲基化与转录抑制联系，但作用须结合位置和调控情境。"],
    ],
    sequence: ["按 DNA 可及性—RNA 产生与加工—翻译—蛋白修饰/降解画流程。", "给每种调控机制定位到流程节点。", "改变一个环节，预测 mRNA 和蛋白水平是否同向变化。"],
    rationale: "流程定位能暴露“mRNA 不变但蛋白变化”等多层调控情形。",
    avoid: "不要把所有调控结果都简写成“基因开/关”而忽略中间可测量量。",
    probes: [
      ["level_classification", "把组蛋白修饰、可变剪接、RNA 半衰期和蛋白降解分别归类。", "依次归入染色质、转录后、转录后和翻译后调控。", ["层级分类正确", "每项有过程依据"], ["regulation_only_transcription"]],
      ["mrna_protein_mismatch", "某处理后 mRNA 不变但蛋白减少，列出两个可能调控层级。", "可提出翻译起始降低或蛋白降解加快等。", ["不局限转录", "机制能解释观测组合"], ["regulation_only_transcription", "methylation_always_activate"]],
    ],
  }),
  profile({
    key: "sg_bio_vaccination_tradeoffs", subject: "Biology", jurisdiction: "SG",
    graphId: "singapore_h2_biology", nodeId: "sg_h2_biology_vaccination_population_control_tradeoffs",
    misconceptions: [
      ["vaccine_immediate_perfect", "接种疫苗后立刻获得对所有感染的完全保护。", "忽略免疫应答时间、效力差异和突破感染。", "疫苗需时间建立特异性记忆，保护程度因疫苗、个体和病原变化而异。"],
      ["herd_immunity_individual", "群体免疫表示群体中的每个人都有免疫。", "把传播概率降低等同于人人不感染。", "群体效应来自足够覆盖降低传播链，但个体保护并非绝对且阈值依疾病条件而变。"],
    ],
    sequence: ["先画个体初次应答和记忆形成时间轴。", "再用传播网络比较不同覆盖率下的传播链。", "最后把收益、不良反应、效力和不确定性分栏评价。"],
    rationale: "个体免疫与群体传播分层，可防止把两个尺度的结论混为一谈。",
    avoid: "不要用“百分之百安全/有效”或“有风险所以无价值”的绝对措辞。",
    probes: [
      ["timing_efficacy", "为什么刚接种后仍可能感染？这是否自动证明疫苗无效？", "免疫记忆建立需要时间，且效力不是绝对；单例不能决定总体效力。", ["时间因素正确", "区分个案与效力"], ["vaccine_immediate_perfect"]],
      ["network_effect", "解释高覆盖率如何保护部分未接种者，同时说明其局限。", "传播链减少带来间接保护，但并非人人免疫，受 R0、效力和接触网络影响。", ["群体机制正确", "至少指出一个条件或局限"], ["herd_immunity_individual"]],
    ],
  }),
];

const SPECS = [...FIRST_BATCH_SPECS, ...SECOND_BATCH_SPECS];

const graphCache = new Map();
const getGraph = (graphId) => {
  if (!graphCache.has(graphId)) {
    graphCache.set(graphId, readJson(resolve(DATA, `source/${graphId}.json`)));
  }
  return graphCache.get(graphId);
};

const profiles = SPECS.map((spec) => {
  const graph = getGraph(spec.graphId);
  const node = graph.nodes.find((candidate) => candidate.id === spec.nodeId && candidate.kind === "concept");
  if (!node?.canonical_id) throw new Error(`Missing concept ${spec.graphId}:${spec.nodeId}`);
  if ((node.evidence_refs ?? []).length < 2) throw new Error(`Insufficient evidence ${spec.graphId}:${spec.nodeId}`);
  const evidenceRefs = node.evidence_refs;
  const profileEvidenceRefs = [
    ...evidenceRefs,
    ...spec.misconceptions.flatMap(([, , , , empirical]) => empirical?.evidence_refs ?? []),
  ].filter(
    (ref, index, refs) => refs.findIndex((candidate) =>
      candidate.source_id === ref.source_id && candidate.locator === ref.locator) === index,
  );
  const misconceptionIds = new Map(spec.misconceptions.map(([key]) => [key, `mis_${spec.key}_${key}`]));
  return {
    profile_id: `ped_profile_${spec.key}`,
    canonical_id: node.canonical_id,
    graph_id: spec.graphId,
    node_id: spec.nodeId,
    subject: spec.subject,
    jurisdictions: [spec.jurisdiction],
    title_zh: node.name_zh,
    misconception_candidates: spec.misconceptions.map(([key, statement, signal, correction, empirical]) => {
      const empiricalEvidenceRefs = empirical?.evidence_refs ?? [];
      const itemEvidenceRefs = [...evidenceRefs, ...empiricalEvidenceRefs].filter(
        (ref, index, refs) => refs.findIndex((candidate) =>
          candidate.source_id === ref.source_id && candidate.locator === ref.locator) === index,
      );
      const empiricalSupport = empirical ? {
        claim_scope: empirical.claim_scope,
        population_zh: empirical.population_zh,
        study_context_zh: empirical.study_context_zh,
        finding_zh: empirical.finding_zh,
        generalisability_zh: empirical.generalisability_zh,
      } : null;
      return {
        misconception_id: misconceptionIds.get(key),
        statement_zh: statement,
        diagnostic_signal_zh: signal,
        correction_zh: correction,
        prevalence_basis: empirical ? "empirically_documented" : "diagnostic_hypothesis",
        ...(empiricalSupport ? { empirical_support: empiricalSupport } : {}),
        evidence_refs: itemEvidenceRefs,
        review_status: "needs_review",
      };
    }),
    instructional_strategies: [{
      strategy_id: `strategy_${spec.key}_contrastive_sequence`,
      sequence_zh: spec.sequence,
      rationale_zh: spec.rationale,
      avoid_zh: spec.avoid,
      evidence_basis: "concept_boundary_design",
      evidence_refs: evidenceRefs,
      review_status: "needs_review",
    }],
    assessment_probes: spec.probes.map(([key, prompt, expected, criteria, targets]) => ({
      probe_id: `probe_${spec.key}_${key}`,
      prompt_zh: prompt,
      expected_evidence_zh: expected,
      scoring_criteria_zh: criteria,
      targets_misconception_ids: targets.map((target) => {
        const id = misconceptionIds.get(target);
        if (!id) throw new Error(`Unknown misconception target ${spec.key}:${target}`);
        return id;
      }),
      evidence_basis: "curriculum_assessment_alignment",
      evidence_refs: evidenceRefs,
      review_status: "needs_review",
    })),
    evidence_refs: profileEvidenceRefs,
    review_status: "needs_review",
  };
});

if (profiles.length !== 48) throw new Error(`Expected 48 profiles, got ${profiles.length}`);
const allEvidenceRefs = profiles.flatMap((item) => [
  ...item.evidence_refs,
  ...item.misconception_candidates.flatMap((candidate) => candidate.evidence_refs),
  ...item.instructional_strategies.flatMap((strategy) => strategy.evidence_refs),
  ...item.assessment_probes.flatMap((probe) => probe.evidence_refs),
]);
const empiricalCount = profiles.flatMap((item) => item.misconception_candidates)
  .filter((item) => item.prevalence_basis === "empirically_documented").length;
const result = {
  schema_version: "1.0.0",
  content_version: "0.2.0",
  profile_set_id: "pps_cn_sg_core_pedagogy_v1",
  jurisdictions: ["CN-MAINLAND", "SG"],
  subjects: ["Mathematics", "Physics", "Chemistry", "Biology"],
  source_ids: unique(allEvidenceRefs.map((ref) => ref.source_id)).sort(),
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [
    {
      version: "0.1.0",
      date: "2026-07-19",
      summary_zh: "人工编写中国大陆与新加坡四学科各 6 个核心概念的错误模型、对比教学序列和可判分诊断探针；不声称错误模型具有未经证实的普遍性。",
    },
    {
      version: "0.2.0",
      date: TODAY,
      summary_zh: "人工新增 24 个概念教学档案，并用教育研究与官方阅卷报告将 5 条有直接证据的错误模型提升为 empirically_documented；所有统计结论保留样本与外推限制。",
    },
  ],
  profiles,
};

const reviewLines = [
  "# 中国大陆 + 新加坡核心概念教学知识审核包（前两批）",
  "",
  `- 生成日期：${TODAY}`,
  `- 概念档案：${profiles.length} 个；误区候选 ${profiles.reduce((sum, item) => sum + item.misconception_candidates.length, 0)} 条；教学策略 ${profiles.reduce((sum, item) => sum + item.instructional_strategies.length, 0)} 条；评测探针 ${profiles.reduce((sum, item) => sum + item.assessment_probes.length, 0)} 条。`,
  `- 证据边界：${empiricalCount} 条误区有教育研究或官方阅卷报告直接支持，标为 \`empirically_documented\`；其余仍为 \`diagnostic_hypothesis\`，不声称具有经验发生率。`,
  "- 外推规则：研究统计只描述原研究样本或报告所述考生；跨地区复用概念时不得改写成中国或新加坡学生总体结论。",
  "- 审核状态：全部 `needs_review`；代理人工复核不写入 human approval。",
  "",
];
for (const item of profiles) {
  reviewLines.push(
    `## ${item.title_zh}（${item.subject} / ${item.jurisdictions.join("、")}）`,
    "",
    `- 目标：\`${item.graph_id}:${item.node_id}\` / \`${item.canonical_id}\``,
    `- 误区候选：${item.misconception_candidates.map((candidate) => `${candidate.statement_zh}（${candidate.prevalence_basis}）`).join("；")}`,
    `- 教学序列：${item.instructional_strategies[0].sequence_zh.join(" → ")}`,
    `- 避免：${item.instructional_strategies[0].avoid_zh}`,
    `- 探针：${item.assessment_probes.map((probe) => probe.prompt_zh).join("；")}`,
    `- 证据：${item.evidence_refs.map((ref) => `${ref.locator}（\`${ref.source_id}\`）`).join("；")}`,
    ...item.misconception_candidates
      .filter((candidate) => candidate.empirical_support)
      .map((candidate) => `- 实证范围（\`${candidate.misconception_id}\`）：样本：${reviewField(candidate.empirical_support.population_zh)}；研究情境：${reviewField(candidate.empirical_support.study_context_zh)}；发现：${reviewField(candidate.empirical_support.finding_zh)}；外推限制：${reviewField(candidate.empirical_support.generalisability_zh)}。`),
    "- 代理复核：题干可独立作答，评分点能观察目标错误模型；未把态度、表达风格或实验操作直接当作概念掌握。",
    "",
  );
}

writeJson(outputPath, result);
mkdirSync(dirname(reviewPath), { recursive: true });
writeFileSync(reviewPath, `${reviewLines.join("\n")}\n`);

process.stdout.write(`[build-cn-sg-core-pedagogy] ${profiles.length} profiles, ${profiles.reduce((sum, item) => sum + item.misconception_candidates.length, 0)} misconceptions, ${profiles.reduce((sum, item) => sum + item.assessment_probes.length, 0)} probes\n`);
