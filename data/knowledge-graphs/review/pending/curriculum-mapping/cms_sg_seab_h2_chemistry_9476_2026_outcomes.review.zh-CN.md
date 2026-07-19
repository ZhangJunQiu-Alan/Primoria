# 新加坡 H2 化学 9476 逐成果映射审核包（中文）

- 生成日期：2026-07-19
- 官方版本：2026 首次考试，Syllabus 9476，46 页。
- 要求总数：201 项；学科成果 194 项，跨主题实践 7 项。
- 现有 KG 完整覆盖：172 项。
- 待解析概念缺口：21 项。
- 实践分流：8 项。
- 状态：全部 `needs_review`；本脚本不写 human approval。

## 审核重点

- 旧 13 项 topic navigation 不再被当作 outcome coverage。
- 只复用范围和课程深度相符的 canonical；Arrhenius/Lewis、道尔顿分压、量子化学未要求项等不做名称猜测。
- 把实验设计与跨主题实践分流，不把操作能力伪装成概念掌握度。
- 保留官方 12 类明确排除边界。

## 21 项待解析缺口

### 用道尔顿分压定律计算混合气体分压

- 缺口：`gap_sg_h2_chemistry_9476_2026_o_3_d`
- 动作：`split_or_narrow_existing`
- 既有 canonical：`pc_18388a54522ee3202a5121faa939f897`
- 原因：现有概念只覆盖组成部分或范围过宽，不能把名称相近当作完整 outcome 覆盖。
- 证据：PDF p.15, topic 3 The Gaseous State, outcome (d)（`src_sg_seab_h2_chemistry_9476_2026`）

### 理解并应用 Arrhenius 酸碱理论

- 缺口：`gap_sg_h2_chemistry_9476_2026_o_4_a`
- 动作：`add_concept`
- 既有 canonical：无
- 原因：统一 KG 尚无范围与 H2 课程深度相符的可诊断概念。
- 证据：PDF p.15, topic 4 Theories of Acids and Bases, outcome (a)（`src_sg_seab_h2_chemistry_9476_2026`）

### 应用 Lewis 酸碱理论分析非水体系与配位加合

- 缺口：`gap_sg_h2_chemistry_9476_2026_o_4_c`
- 动作：`add_concept`
- 既有 canonical：无
- 原因：统一 KG 尚无范围与 H2 课程深度相符的可诊断概念。
- 证据：PDF p.16, topic 4 Theories of Acids and Bases, outcome (c)（`src_sg_seab_h2_chemistry_9476_2026`）

### 定性解释离子电荷和半径对晶格能大小的影响

- 缺口：`gap_sg_h2_chemistry_9476_2026_o_7_e`
- 动作：`split_or_narrow_existing`
- 既有 canonical：`pc_b07a0adc94a1badb983bbfc538a4e611`
- 原因：现有概念只覆盖组成部分或范围过宽，不能把名称相近当作完整 outcome 覆盖。
- 证据：PDF p.19, topic 7 Chemical Energetics, outcome (e)（`src_sg_seab_h2_chemistry_9476_2026`）

### 说明用标准 Gibbs 自由能预测自发性的限制

- 缺口：`gap_sg_h2_chemistry_9476_2026_o_7_l`
- 动作：`split_or_narrow_existing`
- 既有 canonical：`pc_c912d7aa7e95cc5c77a18f6f5aae0a0c`
- 原因：现有概念只覆盖组成部分或范围过宽，不能把名称相近当作完整 outcome 覆盖。
- 证据：PDF p.19, topic 7 Chemical Energetics, outcome (l)（`src_sg_seab_h2_chemistry_9476_2026`）

### 说明酶作为蛋白质催化剂的专一性、锁钥模型及温度和 pH 敏感性

- 缺口：`gap_sg_h2_chemistry_9476_2026_o_8_k`
- 动作：`split_or_narrow_existing`
- 既有 canonical：`pc_3acf09a2d45e4a4379136a369085e5f8`
- 原因：现有概念只覆盖组成部分或范围过宽，不能把名称相近当作完整 outcome 覆盖。
- 证据：PDF p.21, topic 8 Reaction Kinetics, outcome (k)（`src_sg_seab_h2_chemistry_9476_2026`）

### 解释并计算 pH、Ka、pKa、Kb、pKb、Kw 及 Kw=KaKb

- 缺口：`gap_sg_h2_chemistry_9476_2026_o_10_1_b`
- 动作：`split_or_narrow_existing`
- 既有 canonical：`pc_77fa4fcddfbfac708e8026c8cc77b391`
- 原因：现有概念只覆盖组成部分或范围过宽，不能把名称相近当作完整 outcome 覆盖。
- 证据：PDF p.22, topic 10_1 Acid-Base Equilibria, outcome (b)（`src_sg_seab_h2_chemistry_9476_2026`）

### 描述酸碱滴定 pH 变化并以酸碱强度解释曲线

- 缺口：`gap_sg_h2_chemistry_9476_2026_o_10_1_d`
- 动作：`split_or_narrow_existing`
- 既有 canonical：`pc_40e84973ce28c8bfbe369bab4f213754`
- 原因：现有概念只覆盖组成部分或范围过宽，不能把名称相近当作完整 outcome 覆盖。
- 证据：PDF p.22, topic 10_1 Acid-Base Equilibria, outcome (d)（`src_sg_seab_h2_chemistry_9476_2026`）

### 由数据选择适当酸碱滴定指示剂

- 缺口：`gap_sg_h2_chemistry_9476_2026_o_10_1_e`
- 动作：`split_or_narrow_existing`
- 既有 canonical：`pc_40e84973ce28c8bfbe369bab4f213754`
- 原因：现有概念只覆盖组成部分或范围过宽，不能把名称相近当作完整 outcome 覆盖。
- 证据：PDF p.22, topic 10_1 Acid-Base Equilibria, outcome (e)（`src_sg_seab_h2_chemistry_9476_2026`）

### 解释缓冲作用、用途、海洋碳酸盐缓冲与二氧化碳驱动的海洋酸化

- 缺口：`gap_sg_h2_chemistry_9476_2026_o_10_1_f`
- 动作：`split_or_narrow_existing`
- 既有 canonical：`pc_82c006666402fb0151977a37993a8809`
- 原因：现有概念只覆盖组成部分或范围过宽，不能把名称相近当作完整 outcome 覆盖。
- 证据：PDF p.22, topic 10_1 Acid-Base Equilibria, outcome (f)（`src_sg_seab_h2_chemistry_9476_2026`）

### 讨论同离子效应和配离子形成对离子盐溶解度的影响

- 缺口：`gap_sg_h2_chemistry_9476_2026_o_10_2_c`
- 动作：`split_or_narrow_existing`
- 既有 canonical：`pc_a4e09c1b07331a56753ee7884854992a`、`pc_1701653e84db7e3257e7e55c4b77abdc`
- 原因：现有概念只覆盖组成部分或范围过宽，不能把名称相近当作完整 outcome 覆盖。
- 证据：PDF p.23, topic 10_2 Solubility Equilibria, outcome (c)（`src_sg_seab_h2_chemistry_9476_2026`）

### 用离域、给吸电子效应和位阻解释有机反应性

- 缺口：`gap_sg_h2_chemistry_9476_2026_o_11_3_b`
- 动作：`split_or_narrow_existing`
- 既有 canonical：`pc_9826358783352bf325f9299146a78a37`
- 原因：现有概念只覆盖组成部分或范围过宽，不能把名称相近当作完整 outcome 覆盖。
- 证据：PDF p.26, topic 11_3 Organic Reactions and Mechanisms, outcome (b)（`src_sg_seab_h2_chemistry_9476_2026`）

### 说明内燃机污染物、催化净化及增强温室效应气体的环境后果

- 缺口：`gap_sg_h2_chemistry_9476_2026_o_11_4_h`
- 动作：`split_or_narrow_existing`
- 既有 canonical：`pc_c48d9a41a4f7fd5a7ddc4ca53ba4a7ac`
- 原因：现有概念只覆盖组成部分或范围过宽，不能把名称相近当作完整 outcome 覆盖。
- 证据：PDF p.29, topic 11_4 Hydrocarbons, outcome (h)（`src_sg_seab_h2_chemistry_9476_2026`）

### 解释手性底物 SN2 构型反转与 SN1 外消旋化

- 缺口：`gap_sg_h2_chemistry_9476_2026_o_11_5_b`
- 动作：`split_or_narrow_existing`
- 既有 canonical：`pc_0d3043e5274fde266129817ca29a57f7`
- 原因：现有概念只覆盖组成部分或范围过宽，不能把名称相近当作完整 outcome 覆盖。
- 证据：PDF p.29, topic 11_5 Halogen Derivatives, outcome (b)（`src_sg_seab_h2_chemistry_9476_2026`）

### 说明 CFC 对臭氧层及 HFC、HCFC 替代物的显著环境影响

- 缺口：`gap_sg_h2_chemistry_9476_2026_o_11_5_e`
- 动作：`add_concept`
- 既有 canonical：无
- 原因：统一 KG 尚无范围与 H2 课程深度相符的可诊断概念。
- 证据：PDF p.29, topic 11_5 Halogen Derivatives, outcome (e)（`src_sg_seab_h2_chemistry_9476_2026`）

### 从经济、环境与社会因素评价塑料回收及有限资源使用

- 缺口：`gap_sg_h2_chemistry_9476_2026_o_11_10_g`
- 动作：`split_or_narrow_existing`
- 既有 canonical：`pc_cd9220ccd4a94d9511b50e51680a585c`、`pc_4fa4bd24c7e8cdf839921a3fb5f37bde`
- 原因：现有概念只覆盖组成部分或范围过宽，不能把名称相近当作完整 outcome 覆盖。
- 证据：PDF p.33, topic 11_10 Polymers, outcome (g)（`src_sg_seab_h2_chemistry_9476_2026`）

### 说明用标准电池电势预测反应自发性的限制

- 缺口：`gap_sg_h2_chemistry_9476_2026_o_12_g`
- 动作：`split_or_narrow_existing`
- 既有 canonical：`pc_ddaa179ab823ea748d4ad05e53ee9187`
- 原因：现有概念只覆盖组成部分或范围过宽，不能把名称相近当作完整 outcome 覆盖。
- 证据：PDF p.33, topic 12 Electrochemistry, outcome (g)（`src_sg_seab_h2_chemistry_9476_2026`）

### 定性预测电极电势随水溶液离子浓度的变化

- 缺口：`gap_sg_h2_chemistry_9476_2026_o_12_j`
- 动作：`split_or_narrow_existing`
- 既有 canonical：`pc_bfa955bbd69e70b920c7ee7eb712d904`
- 原因：现有概念只覆盖组成部分或范围过宽，不能把名称相近当作完整 outcome 覆盖。
- 证据：PDF p.33, topic 12 Electrochemistry, outcome (j)（`src_sg_seab_h2_chemistry_9476_2026`）

### 用电极反应解释铝阳极氧化和铜电解精炼；不要求技术细节

- 缺口：`gap_sg_h2_chemistry_9476_2026_o_12_o`
- 动作：`split_or_narrow_existing`
- 既有 canonical：`pc_4375fb1d523a4b08df3b42fab0c0642e`
- 原因：现有概念只覆盖组成部分或范围过宽，不能把名称相近当作完整 outcome 覆盖。
- 证据：PDF p.34, topic 12 Electrochemistry, outcome (o)（`src_sg_seab_h2_chemistry_9476_2026`）

### 解释过渡元素原子半径和第一电离能相对不变

- 缺口：`gap_sg_h2_chemistry_9476_2026_o_13_c`
- 动作：`split_or_narrow_existing`
- 既有 canonical：`pc_db9856c274d202c3b699aa0300f025f9`
- 原因：现有概念只覆盖组成部分或范围过宽，不能把名称相近当作完整 outcome 覆盖。
- 证据：PDF p.34, topic 13 Chemistry of Transition Elements, outcome (c)（`src_sg_seab_h2_chemistry_9476_2026`）

### 解释配体交换、颜色变化及血红蛋白中 CO/O2 交换

- 缺口：`gap_sg_h2_chemistry_9476_2026_o_13_j`
- 动作：`split_or_narrow_existing`
- 既有 canonical：`pc_1701653e84db7e3257e7e55c4b77abdc`
- 原因：现有概念只覆盖组成部分或范围过宽，不能把名称相近当作完整 outcome 覆盖。
- 证据：PDF p.34, topic 13 Chemistry of Transition Elements, outcome (j)（`src_sg_seab_h2_chemistry_9476_2026`）
