# A-Level 数学 9 项 Concept 缺口批准记录

- 图：`a_level_mathematics`
- 来源：[`src_cambridge_9709_2026_2027`](https://www.cambridgeinternational.org/Images/697427-2026-2027-syllabus.pdf)，Cambridge 9709，2026–2027，Version 4（2025-12）
- 状态：`approved`，已应用于 `a_level_mathematics` content version `1.1.0`
- 结论：9 项已核实缺口建议由 7 个 Concept 覆盖；新增 4 个 canonical concept，复用 3 个现有 canonical concept
- 边界：本次只批准下列 9 项缺口及对应新增边；其余数学节点、边和 syllabus 映射仍保持原审核状态。未写数据库，未执行 embeddings，不改变 Tutor UI 或 API

## 批准结论

| 提案 | 覆盖的官方要求 | 处理方式 | Topic | 建议结论 |
|---|---|---|---|---|
| D1 函数图像变换 | `9709:1.2:5` | 新增 Concept | 复合函数、绝对值函数与图像变换 | 批准 |
| D2 梯形法则 | `9709:2.5:3` | 新增 Concept | 不定积分、定积分与面积 | 批准 |
| D3 光滑接触模型 | `9709:4.1:5` | 新增 Concept | 力、平衡与接触模型 | 批准 |
| D4 质量与重量 | `9709:4.4:2` | 复用物理图 canonical ID | 质量、重量与牛顿定律 | 批准 |
| D5 连续随机变量 | `9709:6.3:1` | 复用离散数学图 canonical ID | 连续随机变量与概率密度 | 批准 |
| D6 概率密度函数 | `9709:6.3:1–2` | 复用离散数学图 canonical ID | 连续随机变量与概率密度 | 批准 |
| D7 统计估计 | `9709:6.4:6–8` | 新增 Concept | 抽样、估计与假设检验 | 批准，但保留以后按测评需要拆分的可能性 |

## 逐项审批

### D1 函数图像变换

- 官方证据：PDF 第 19 页，`1.2 outcome 5`
- 当前状态：`mat_functions` 只覆盖函数、定义域/值域与反函数；`mat_modulus` 只覆盖绝对值函数，二者都没有覆盖一般图像变换。
- legacy ID：`mat_graph_transformations`
- 候选 canonical ID：`pc_1aaf98f8144a2f3b3fae833eb1370db8`
- 中文名：函数图像变换
- 建议描述：识别并组合由 `f(x)+a`、`f(x+a)`、`af(x)`、`f(ax)` 引起的平移、反射和伸缩，并从代数形式判断图像特征如何变化。
- Topic：将 `mat_algebra_part2_mat_composite` 改名为“复合函数、绝对值函数与图像变换”，Concept 数由 2 增至 3。
- 建议先修边：`mat_functions -> mat_graph_transformations`，`hard`；理由是必须先理解函数表示与定义域，才能解释输入/输出变换。
- 审核判断：这是独立、可教学、可测评的概念，不应塞进 `mat_functions` 的描述中。

### D2 梯形法则

- 官方证据：PDF 第 25 页，`2.5 outcome 3`
- 当前状态：`mat_definite_area` 只覆盖解析求积分与面积，没有数值近似和误差方向判断。
- legacy ID：`mat_trapezium_rule`
- 候选 canonical ID：`pc_eee05d840b05cd617b46eb6beb86630d`
- 中文名：梯形法则
- 建议描述：用梯形法则近似定积分，并结合函数图像的弯曲方向判断近似值是高估还是低估。
- Topic：加入 `mat_integration_part1`，Concept 数由 2 增至 3。
- 建议先修边：`mat_definite_area -> mat_trapezium_rule`，`hard`；理由是数值积分以定积分及面积解释为前提。
- 不合并项：现有 `Newton-Cotes Formulas`（`pc_7af257eea265c94808fe3a9552d89587`）同时覆盖梯形法与 Simpson 法，语义范围明显更宽；不能仅因包含梯形法就共享 canonical ID。
- 审核判断：新增窄范围 canonical concept，避免错误合并。

### D3 光滑接触模型

- 官方证据：PDF 第 31 页，`4.1 outcome 5`
- 当前状态：`mat_forces_equilibrium` 和 `mat_friction` 都没有说明“光滑接触”假设及其局限。
- legacy ID：`mat_smooth_contact`
- 候选 canonical ID：`pc_25cce3124e597a28882fe769fb413cad`
- 中文名：光滑接触模型
- 建议描述：把光滑接触建模为只存在法向反作用力、忽略切向摩擦，并能说明该理想化假设在真实接触面上的局限。
- Topic：保留在 `mat_mech_forces`；该 Topic 调整为“力、平衡与接触模型”，包含 `mat_forces_equilibrium`、`mat_smooth_contact`、`mat_friction`。
- 建议先修边：`mat_forces_equilibrium -> mat_smooth_contact`，`hard`；理由是需先识别接触力并进行受力分析。
- 审核判断：不能只给 `mat_forces_equilibrium` 补一句话；模型假设与局限本身需要单独教学和测评。

### D4 质量与重量

- 官方证据：PDF 第 33 页，`4.4 outcome 2`
- 当前状态：`mat_newton_laws` 没有明确 `W=mg`、重力方向以及题目中采用的近似重力加速度。
- legacy ID：`mat_mass_weight`
- 复用 canonical ID：`pc_e89c4895cbf9c4d6568f7dfad6ffb5eb`
- 现有 alias：`a_level_physics + phy_mass_weight`
- 中文名：质量与重量
- 建议描述：区分质量和重量，把重量视为重力 `W=mg`，在力学问题中正确确定方向，并按题目约定使用重力加速度近似值。
- Topic：新建 `mat_mech_dynamics`（“质量、重量与牛顿定律”），包含 `mat_mass_weight` 与原有 `mat_newton_laws`；`mat_newton_laws` 只移动 Topic，不改变 legacy ID 或 canonical ID。
- 建议先修边：`mat_mass_weight -> mat_newton_laws`，`hard`；保留现有 `mat_forces_equilibrium -> mat_newton_laws`。
- 审核判断：与物理图概念语义一致，应共享 canonical ID，不能创建数学专用重复概念。

### D5 连续随机变量

- 官方证据：PDF 第 38 页，`6.3 outcome 1`
- 当前状态：数学图只有 `mat_discrete_rv`，没有连续型随机变量。
- legacy ID：`mat_continuous_random_variables`
- 复用 canonical ID：`pc_5f55e60931935e299996e34826f1a0e9`
- 现有 alias：`discrete_math_and_probability + continuous_random_variables`
- 中文名：连续随机变量
- 建议描述：理解连续随机变量在连续取值域上取值，并用概率密度而非概率质量描述；取值域可为有限或无限区间。
- Topic：新建 `mat_continuous_probability`（“连续随机变量与概率密度”）。
- 可选先修边：`mat_discrete_rv -> mat_continuous_random_variables`，`soft`；只表示离散/连续对比有助于学习，不把离散随机变量误当成数学必需前提。
- 审核判断：与现有跨图概念语义相同，应共享 canonical ID。

### D6 概率密度函数

- 官方证据：PDF 第 38 页，`6.3 outcome 1–2`
- 当前状态：数学图没有概率密度函数，也没有由密度求概率、均值、方差、中位数和百分位数的知识单元。
- legacy ID：`mat_probability_density_function`
- 复用 canonical ID：`pc_e21f9bf6f3f146e8a0b6e61e0b0adf33`
- 现有 alias：`discrete_math_and_probability + probability_density_function`
- 中文名：概率密度函数
- 建议描述：检查概率密度的非负性和总面积，利用积分求区间概率、均值与方差，并用面积条件求中位数和百分位数。
- Topic：与 D5 同属 `mat_continuous_probability`，Topic 共 2 个 Concept。
- 建议先修边：`mat_continuous_random_variables -> mat_probability_density_function`，`hard`。
- 明确排除：不加入显式累积分布函数（CDF）作为课程要求；官方页明确把它排除在本课程范围之外。
- 不新增边：不建议加入 `mat_probability_density_function -> mat_normal_dist`。Cambridge 在更早的 5.5 已教授正态分布，本课程深度下的一般概率密度不是其硬前提。
- 审核判断：复用现有 canonical ID，但 A-Level alias 使用与 syllabus 深度相符的描述。

### D7 统计估计

- 官方证据：PDF 第 38 页，`6.4 outcome 6–8`
- 当前状态：`mat_sampling` 覆盖总体、样本和抽样分布，未覆盖无偏点估计和置信区间。
- legacy ID：`mat_statistical_estimation`
- 候选 canonical ID：`pc_327828115364d07966390e1866528270`
- 中文名：统计估计
- 建议描述：从原始或汇总样本计算总体均值与方差的无偏估计，理解无偏的基本含义；构造并解释总体均值的置信区间，以及大样本总体比例的近似置信区间。
- Topic：将 `mat_normal_inference_mat_sampling` 改名为“抽样、估计与假设检验”，包含 `mat_sampling`、`mat_statistical_estimation`、`mat_hypothesis`，Concept 数由 2 增至 3。
- 建议先修边：`mat_sampling -> mat_statistical_estimation`，`hard`；`mat_normal_dist -> mat_statistical_estimation`，`hard`。
- 粒度判断：三项要求都是同一“点估计与区间估计”教学单元。现在拆成三个 Concept 会过细；如果以后测评系统需要分别追踪点估计、均值区间和比例区间，再在不改变本 canonical ID 的前提下设计 Skill 或子概念。
- 审核判断：当前以一个 Concept 覆盖三项要求最符合 2–3 Concept 的 Topic 粒度。

## Topic 结构变化

| Topic | 变更后 Concept | 数量 | 结构影响 |
|---|---|---:|---|
| `mat_algebra_part2_mat_composite` | 复合函数；绝对值函数；函数图像变换 | 3 | 改名，不移动现有 Concept |
| `mat_integration_part1` | 不定积分；定积分与面积；梯形法则 | 3 | 不改名 |
| `mat_mech_forces` | 力与平衡；光滑接触模型；摩擦 | 3 | 改名；移出 `mat_newton_laws` |
| `mat_mech_dynamics` | 质量与重量；牛顿运动定律 | 2 | 新 Topic；接收原有 `mat_newton_laws` |
| `mat_continuous_probability` | 连续随机变量；概率密度函数 | 2 | 新 Topic |
| `mat_normal_inference_mat_sampling` | 抽样；统计估计；假设检验 | 3 | 改名，不移动现有 Concept |

插入两个新 Topic 后会重新计算后续 `default_order`，但不会修改任何现有 Topic/Concept 的 legacy ID。正式应用前必须重建派生 topic graph，并把 Topic 移动与名称变化加入 embeddings 重建清单。

## 已应用范围

1. 7 个 alias 节点已写入正式数学图，其中 4 个创建 canonical registry 记录、3 个追加现有 canonical alias。
2. 7 个批准节点和 8 条批准先修边均写入页码级 `evidence_refs`，并在 `review-decisions.json` 保留人工作出批准的记录。
3. Topic 与先修边变更已应用，`a_level_mathematics` content version 提升为 `1.1.0`。
4. 9 项 coverage 映射由缺口更新为人工批准覆盖，并重新生成中文审核包。
5. 派生 topic graph 和仓库门禁按本次变更重建及验证；本轮不写共享数据库。

## Embeddings 发布清单

- 发布时必须对 `a_level_mathematics` 整图重建 embeddings。
- 新增 Concept：`mat_graph_transformations`、`mat_trapezium_rule`、`mat_smooth_contact`、`mat_mass_weight`、`mat_continuous_random_variables`、`mat_probability_density_function`、`mat_statistical_estimation`。
- Topic 名称变化：`mat_algebra_part2_mat_composite`、`mat_mech_forces`、`mat_normal_inference_mat_sampling`。
- 新增 Topic：`mat_mech_dynamics`、`mat_continuous_probability`。
- 结构变化：`mat_newton_laws` 移动 Topic；`mat_friction`、`mat_hypothesis` 调整 Topic 内顺序；新增 8 条先修边。
- 本次未执行 embeddings，也未写任何数据库。

## 人工审批记录

- 审批日期：2026-07-18
- 审批人：Primoria 项目所有者
- 用户指令：数学 9 项全部批准
- 机器可校验记录：`data/knowledge-graphs/governance/review-decisions.json`
