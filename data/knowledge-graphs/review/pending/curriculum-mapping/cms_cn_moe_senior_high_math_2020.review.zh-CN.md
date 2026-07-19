# 普通高中数学课程标准（2017年版2020年修订）：KG 映射待审核包

> 本文件只展示 AI 提出的待审建议。所有条目均为 `needs_review`，未经人工批准不会进入正式 KG。
> 当前集合是主题级导航映射，不是逐条学习成果覆盖矩阵；`部分覆盖` 不得解释为官方大纲已完整覆盖。

- 课程：`cur_cn_moe_senior_high_math_2020`
- 课程框架：`cfw_cn_moe_senior_high_math_2020_topics`
- 映射集合：`cms_cn_moe_senior_high_math_2020`
- 地区：`CN-MAINLAND`
- 课程版本：`0.1.0`
- 映射版本：`0.2.1`
- 映射范围：`topic_alignment`
- 官方来源：`src_cn_moe_senior_high_math_2020`
- 覆盖统计：完整 0；部分 16；未映射 4；排除 0
- KG 缺口建议：本主题级导航框架不生成逐成果缺口候选

## 1. 必修·主题一·集合｜集合

- 课程要求 ID：`req_cn_sh_math_2020_r_sets`
- 映射 ID：`map_cn_sh_math_2020_r_sets`
- 中文释义：理解集合的概念、表示、基本关系和运算，并使用集合语言表达数学对象。
- 建议结论：尚未映射；关系 `not_applicable`；置信度 `high`
- 对应概念：无
- 判断理由：当前统一数学 KG 没有集合概念，不能以函数等相邻内容代替。
- 官方证据：数学课程标准PDF p.23（正文p.15），主题一‘集合’（`src_cn_moe_senior_high_math_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 2. 必修·主题一·常用逻辑用语｜常用逻辑用语

- 课程要求 ID：`req_cn_sh_math_2020_r_logic`
- 映射 ID：`map_cn_sh_math_2020_r_logic`
- 中文释义：辨析充分、必要和充要条件，理解全称量词、存在量词及相应命题的否定。
- 建议结论：尚未映射；关系 `not_applicable`；置信度 `high`
- 对应概念：无
- 判断理由：当前统一数学 KG 没有充分必要条件、量词或命题否定等逻辑概念。
- 官方证据：数学课程标准PDF p.24（正文p.16），主题一‘常用逻辑用语’（`src_cn_moe_senior_high_math_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 3. 必修·主题一·相等关系与不等关系｜相等关系、不等关系与一元二次问题

- 课程要求 ID：`req_cn_sh_math_2020_r_equations_inequalities`
- 映射 ID：`map_cn_sh_math_2020_r_equations_inequalities`
- 中文释义：从函数联系方程与不等式，处理一元二次方程、不等式及基本不等式的简单应用。
- 建议结论：部分覆盖；关系 `required`；置信度 `high`
- 对应概念：二次函数（`pc_133d40fa0e72c29c5eb6ec7a9852c80c`）；二次方程求解（`pc_2d2287436b31a462805b82876a1bc513`）；不等式（`pc_4307437065fb6fce9aa3b4c05e7ed82d`）
- 判断理由：已覆盖二次函数、二次方程和不等式；课标本主题未列联立方程，基本不等式及课程特定应用仍缺失。
- 官方证据：数学课程标准PDF pp.24-25（正文pp.16-17）（`src_cn_moe_senior_high_math_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 4. 必修·主题二·函数概念与性质｜函数概念与性质

- 课程要求 ID：`req_cn_sh_math_2020_r_function_concepts`
- 映射 ID：`map_cn_sh_math_2020_r_function_concepts`
- 中文释义：理解函数的概念和表示，分析定义域、值域、单调性、奇偶性等基本性质。
- 建议结论：部分覆盖；关系 `supporting`；置信度 `low`
- 对应概念：函数与反函数（`pc_d547d8eb03df4b28cc0357c7cae1d164`）
- 判断理由：现有复合概念可支撑函数概念，但同时包含本主题未要求的反函数；复合函数和图像变换不等价于定义域、值域、单调性、奇偶性与最值，故已移除。
- 官方证据：数学课程标准PDF pp.27-28（正文pp.19-20）（`src_cn_moe_senior_high_math_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 5. 必修·主题二·幂函数、指数函数、对数函数｜幂函数、指数函数与对数函数

- 课程要求 ID：`req_cn_sh_math_2020_r_power_exp_log`
- 映射 ID：`map_cn_sh_math_2020_r_power_exp_log`
- 中文释义：掌握幂、指数和对数函数的表示与性质，理解指数函数和对数函数的互逆关系。
- 建议结论：部分覆盖；关系 `required`；置信度 `high`
- 对应概念：指数函数（`pc_81e5444941a3e64858bae20e97e58cf8`）；对数与法则（`pc_3845a20537e66fc1506222d98752aa3d`）；解指数与对数方程（`pc_6f7f45d6caa0f1b2ef2954812125da30`）
- 判断理由：指数、对数及其方程已有对应；幂函数未形成独立概念。
- 官方证据：数学课程标准PDF pp.28-29（正文pp.20-21）（`src_cn_moe_senior_high_math_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 6. 必修·主题二·三角函数｜三角函数

- 课程要求 ID：`req_cn_sh_math_2020_r_trigonometric_functions`
- 映射 ID：`map_cn_sh_math_2020_r_trigonometry`
- 中文释义：借助单位圆理解三角函数、图像、基本关系和恒等变换，并刻画周期现象。
- 建议结论：部分覆盖；关系 `required`；置信度 `high`
- 对应概念：三角函数与图像（`pc_c756deb603e99d7fbb680d46214248e8`）；弧度制（`pc_249bb1a239e11b22bde8356cc52a08a0`）；三角恒等式（`pc_deafae3a3962b29dc66b867691e8957e`）；解三角方程（`pc_ff8fc44580c50798ce8689e9774790ec`）；倍角与和差公式（`pc_abd2410d819fd0126e356cacadbbe4ac`）
- 判断理由：任意角三角函数、弧度、恒等变换、方程和和差倍角公式均有直接对应。 该判断仅表示主题级对齐，未逐条证明官方学习成果全覆盖。
- 官方证据：数学课程标准PDF pp.29-30（正文pp.21-22）（`src_cn_moe_senior_high_math_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 7. 必修·主题二·函数应用｜函数应用

- 课程要求 ID：`req_cn_sh_math_2020_r_function_applications`
- 映射 ID：`map_cn_sh_math_2020_r_function_applications`
- 中文释义：用函数模型分析现实变量关系，比较增长速度，并用数值方法求方程近似解。
- 建议结论：部分覆盖；关系 `supporting`；置信度 `medium`
- 对应概念：函数图像变换（`pc_1aaf98f8144a2f3b3fae833eb1370db8`）；指数函数（`pc_81e5444941a3e64858bae20e97e58cf8`）；对数与法则（`pc_3845a20537e66fc1506222d98752aa3d`）
- 判断理由：已有图像、指数与对数工具，但零点、二分法和课程要求的函数建模过程未完整覆盖。
- 官方证据：数学课程标准PDF pp.31-33（正文pp.23-25）（`src_cn_moe_senior_high_math_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 8. 必修·主题三·平面向量及其应用｜平面向量及其应用

- 课程要求 ID：`req_cn_sh_math_2020_r_plane_vectors`
- 映射 ID：`map_cn_sh_math_2020_r_plane_vectors`
- 中文释义：理解平面向量的表示、线性运算、数量积和基本几何应用。
- 建议结论：部分覆盖；关系 `required`；置信度 `medium`
- 对应概念：向量基础（`pc_9ae5f17312ee21050edf3e4bd9b005a2`）；大小与方向（`pc_64e61e1cee5471619fa54db48800b916`）；标量积（`pc_3e68cc383e695a3ae1773f286b5221f3`）
- 判断理由：向量运算、大小方向和数量积有对应，但现有概念同时覆盖二维与三维，未单独表达平面向量课程深度。
- 官方证据：数学课程标准PDF pp.33-34（正文pp.25-26）（`src_cn_moe_senior_high_math_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 9. 必修·主题三·复数｜复数

- 课程要求 ID：`req_cn_sh_math_2020_r_complex_numbers`
- 映射 ID：`map_cn_sh_math_2020_r_complex`
- 中文释义：理解复数的代数和几何表示，掌握复数四则运算及其基本几何意义。
- 建议结论：部分覆盖；关系 `required`；置信度 `high`
- 对应概念：复数运算（`pc_84fa9a959816d2fd778aec459c7e0020`）；阿根图（`pc_8b0b34fcb52404046ccbf41b402895fd`）
- 判断理由：复数运算与几何表示已有对应，课程中的数系扩充背景未形成独立概念。
- 官方证据：数学课程标准PDF p.35（正文p.27）（`src_cn_moe_senior_high_math_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 10. 必修·主题三·立体几何初步｜立体几何初步

- 课程要求 ID：`req_cn_sh_math_2020_r_solid_geometry`
- 映射 ID：`map_cn_sh_math_2020_r_solid_geometry`
- 中文释义：识别空间几何体，表示空间图形，并推理空间直线和平面的平行、垂直关系。
- 建议结论：尚未映射；关系 `not_applicable`；置信度 `high`
- 对应概念：无
- 判断理由：当前数学 KG 没有空间几何体、直线和平面位置关系或空间几何证明概念。
- 官方证据：数学课程标准PDF pp.35-38（正文pp.27-30）（`src_cn_moe_senior_high_math_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 11. 必修·主题四·概率｜概率

- 课程要求 ID：`req_cn_sh_math_2020_r_probability`
- 映射 ID：`map_cn_sh_math_2020_r_probability`
- 中文释义：理解有限样本空间、随机事件和古典概型，并用概率模型解决简单问题。
- 建议结论：部分覆盖；关系 `required`；置信度 `high`
- 对应概念：概率法则（`pc_0c7c408f2fb208ecfb0b6758b1cd4a0a`）
- 判断理由：概率法则可支撑古典概型；条件概率属于选择性必修，已从本必修主题移除，随机试验、样本空间和频率稳定性仍没有独立概念。
- 官方证据：数学课程标准PDF p.39（正文p.31）（`src_cn_moe_senior_high_math_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 12. 必修·主题四·统计｜统计

- 课程要求 ID：`req_cn_sh_math_2020_r_statistics`
- 映射 ID：`map_cn_sh_math_2020_r_statistics`
- 中文释义：获取和整理数据，实施抽样，使用统计图表和数字特征从样本推断总体。
- 建议结论：部分覆盖；关系 `required`；置信度 `high`
- 对应概念：数据表示（`pc_9b449c02257babd62cc775a79704c117`）；中心趋势与离散（`pc_35cb6bdf58ea092953596fd77759caf6`）；抽样（`pc_14be091db45947021ec317ac23ac5401`）
- 判断理由：数据表示、集中离散和抽样有对应；分层抽样、百分位数等课程细项未完整拆分。
- 官方证据：数学课程标准PDF pp.40-42（正文pp.32-34）（`src_cn_moe_senior_high_math_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 13. 必修·主题五·数学建模与数学探究｜数学建模活动与数学探究活动

- 课程要求 ID：`req_cn_sh_math_2020_r_modeling_inquiry`
- 映射 ID：`map_cn_sh_math_2020_r_modeling_inquiry`
- 中文释义：经历提出问题、建立模型、求解检验、改进表达和报告交流的完整实践过程。
- 建议结论：尚未映射；关系 `not_applicable`；置信度 `high`
- 对应概念：无
- 判断理由：数学建模活动和数学探究是实践要求，当前 KG 只有学科概念，没有对应的可复用实践概念。
- 官方证据：数学课程标准PDF pp.42-44（正文pp.34-36）（`src_cn_moe_senior_high_math_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 14. 选择性必修·主题一·数列｜数列

- 课程要求 ID：`req_cn_sh_math_2020_sr_sequences`
- 映射 ID：`map_cn_sh_math_2020_sr_sequences`
- 中文释义：理解数列及递推表示，掌握等差、等比数列的通项与前若干项和并解决实际问题。
- 建议结论：部分覆盖；关系 `required`；置信度 `high`
- 对应概念：等差级数（`pc_9e401fe846a8c086510b3ea2102be253`）；等比级数（`pc_ced3271242c9a0d6fe67d9a446214543`）
- 判断理由：等差与等比数列、级数已有直接对应。 该判断仅表示主题级对齐，未逐条证明官方学习成果全覆盖。
- 官方证据：数学课程标准PDF pp.46-49（正文pp.38-41）（`src_cn_moe_senior_high_math_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 15. 选择性必修·主题一·导数及其应用｜导数及其应用

- 课程要求 ID：`req_cn_sh_math_2020_sr_derivatives`
- 映射 ID：`map_cn_sh_math_2020_sr_derivatives`
- 中文释义：理解导数的几何和变化率意义，掌握基本求导方法并用于函数性质和优化分析。
- 建议结论：部分覆盖；关系 `required`；置信度 `high`
- 对应概念：从原理求导（`pc_10673fbc68b0db5d92e2eccb2616c7a6`）；幂法则（`pc_d35baa6e4598b25c22ba867ed2a4f82f`）；切线与法线（`pc_e48516f32ed219bfab284968f67ba2b4`）；极值点（`pc_61dadf3e646d2fed3a3b5b81630b2563`）
- 判断理由：导数概念、幂函数求导、切线和极值应用有对应；课标未列链式法则和相关变化率，已删除，特定函数与优化情境仍需逐项核对。
- 官方证据：数学课程标准PDF pp.47-49（正文pp.39-41）（`src_cn_moe_senior_high_math_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 16. 选择性必修·主题二·空间向量与立体几何｜空间向量与立体几何

- 课程要求 ID：`req_cn_sh_math_2020_sr_spatial_vectors`
- 映射 ID：`map_cn_sh_math_2020_sr_spatial_vectors`
- 中文释义：将向量方法扩展到三维空间，用于描述和求解直线、平面的位置与度量关系。
- 建议结论：部分覆盖；关系 `required`；置信度 `medium`
- 对应概念：向量基础（`pc_9ae5f17312ee21050edf3e4bd9b005a2`）；大小与方向（`pc_64e61e1cee5471619fa54db48800b916`）；标量积（`pc_3e68cc383e695a3ae1773f286b5221f3`）；直线向量方程（`pc_0c3c2f35769f38762a59705783e03824`）
- 判断理由：三维向量、大小方向、数量积和直线方程有对应；平面向量方程及空间距离关系缺失。
- 官方证据：数学课程标准PDF pp.50-51（正文pp.42-43）（`src_cn_moe_senior_high_math_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 17. 选择性必修·主题二·平面解析几何｜平面解析几何

- 课程要求 ID：`req_cn_sh_math_2020_sr_analytic_geometry`
- 映射 ID：`map_cn_sh_math_2020_sr_analytic_geometry`
- 中文释义：建立直线、圆和圆锥曲线方程，并用代数方法研究位置关系和简单实际问题。
- 建议结论：部分覆盖；关系 `required`；置信度 `high`
- 对应概念：直线（`pc_2fd09e919b7e73069c83ce49007f17d2`）；平行与垂直直线（`pc_2a20781f550c684afa2cda1e4dde847d`）；圆（`pc_3d12d114d1630b545655de686dae4630`）
- 判断理由：直线与圆已有对应；椭圆、双曲线、抛物线等圆锥曲线尚未进入统一 KG。
- 官方证据：数学课程标准PDF pp.51-54（正文pp.43-46）（`src_cn_moe_senior_high_math_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 18. 选择性必修·主题三·计数原理｜计数原理

- 课程要求 ID：`req_cn_sh_math_2020_sr_counting`
- 映射 ID：`map_cn_sh_math_2020_sr_counting`
- 中文释义：运用分类和分步计数、排列组合与二项式定理解决有限计数问题。
- 建议结论：部分覆盖；关系 `required`；置信度 `high`
- 对应概念：排列组合（`pc_72b8e1a7b680bd575ff6d93a1e2c592b`）；二项展开（正整数）（`pc_57ca5674eaf8c8ddc02a9fd067f2bc9d`）
- 判断理由：排列组合与正整数指数二项展开已有直接对应。 该判断仅表示主题级对齐，未逐条证明官方学习成果全覆盖。
- 官方证据：数学课程标准PDF pp.54-55（正文pp.46-47）（`src_cn_moe_senior_high_math_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 19. 选择性必修·主题三·概率｜条件概率与概率分布

- 课程要求 ID：`req_cn_sh_math_2020_sr_probability_distributions`
- 映射 ID：`map_cn_sh_math_2020_sr_probability_distributions`
- 中文释义：理解条件概率、独立性、离散随机变量及常用分布，并计算和解释相应概率特征。
- 建议结论：部分覆盖；关系 `required`；置信度 `high`
- 对应概念：条件概率（`pc_cf8dbc5bcf596f0c4db74ea9886540a1`）；事件独立性（`pc_e49409332f2ff6e17899d2b7d3e6d7fe`）；离散随机变量（`pc_bd3e94ad62025e9a58ab6e2016182924`）；二项分布（`pc_dab02572a5e34659342ea1fb544803f8`）；正态分布（`pc_23858effd2dd68284bd0c6b645607386`）
- 判断理由：条件概率、事件独立性、离散随机变量、二项分布与正态分布均有直接对应；当前仍是主题级导航映射，未逐条证明官方学习成果全覆盖。
- 官方证据：数学课程标准PDF pp.55-56（正文pp.47-48）（`src_cn_moe_senior_high_math_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`

## 20. 选择性必修·主题三·统计｜相关、回归与统计推断

- 课程要求 ID：`req_cn_sh_math_2020_sr_statistics_regression`
- 映射 ID：`map_cn_sh_math_2020_sr_statistics_regression`
- 中文释义：分析成对数据相关性，理解一元线性回归和列联表，并借助工具解释统计结果。
- 建议结论：部分覆盖；关系 `required`；置信度 `high`
- 对应概念：抽样（`pc_14be091db45947021ec317ac23ac5401`）；统计估计（`pc_327828115364d07966390e1866528270`）；假设检验（`pc_5e8204fe2f43100f3de7f78a5824d321`）
- 判断理由：抽样、统计估计和假设检验已有对应；成对数据、相关分析与线性回归缺失。
- 官方证据：数学课程标准PDF pp.56-57（正文pp.48-49）（`src_cn_moe_senior_high_math_2020`）
- KG 后续动作：无，当前概念覆盖边界可接受
- 审核状态：`needs_review`
