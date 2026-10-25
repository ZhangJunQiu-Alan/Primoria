# 中国大陆 / 新加坡 10 张运行时图：联网复核与批准建议（2026-10）

> **批准状态（2026-10-25）**：项目所有者已按本包（含第 10 节追加内容）全部批准，落库记录见同目录 `approval.zh-CN.md`。以下正文保留批准前的建议原文，其中“状态保持 / 仍为 needs_review”的表述描述的是批准前状态。

> 本包由 Claude 联网下载官方课程文件逐页比对后整理，只是审核建议；在项目所有者明确批准前，所有记录保持 `needs_review`。机器可读决策见同目录 `review-decisions.json`，落库脚本为 `apps/web/scripts/apply-cn-sg-review-2026-10.mjs`。

## 1. 结论摘要

- **概念与主题**：10 张图共 453 个概念、169 个主题，全部能在官方课程原文中找到对应条目，**无需删除任何节点**；2 个概念描述与大纲口径不一致、3 个概念证据定位需调整（已修正）。
- **同图先修边**：349 条中建议**删除 130 条**（几乎全部来自“大纲条目相邻即连边”的派生规则，并非真实学习依赖），新增 5 条真实依赖，3 条硬边降为软边，47 条保留的派生边改写为真实依赖理由。
- **跨图先修边**：337 条中建议**删除 153 条**、保留 184 条，20 条硬边降为软边。
- **课程框架/映射**：H2 物理框架中的 18(h)“变压器效率与输电”在 SEAB 9478 原文中不存在，已删除；约 1,450 条映射逐条阅读，3 处修正；其余缺口与决议记录与映射一致。
- **教学法**：48 个档案的误区、纠正与探针逐条验算无科学错误，1 处与大纲口径对齐；5 条“有实证文献支持”的误区中 4 条已取得原文核实，1 条（RSC 2016）只能确认文献存在。
- **来源**：中国 4 科已迁移到教育部 2025 年 10 月印发的《普通高中课程标准日常修订版（2017年版2025年修订）》；新加坡有 249 个（去重后）证据定位页码有误，已逐条校正；连同中国迁移，共更新 4,683 处证据引用。

## 2. 来源复核

| 来源 | 结果 | 处理 |
|---|---|---|
| 中国高中数/理/化/生 2020 修订版 | 教育部官网附件 ZIP 仍可下载、SHA-256 一致，但已被 **2025 日常修订版** 取代（新华网 2026-01-05 报道 2025 年 10 月印发）。教育部官网未检索到通知原文，取得第三方转载 PDF（4 份元数据一致、无水印）。 | 新增 4 个 `*_2025` 来源；338 条中国证据定位按“模块+内容要求编号”（数学按“主题+单元”）迁移到 2025 版页码；2020 版来源加注已被取代。 |
| 2025 版内容差异 | 内容要求编号与知识点基本未变；章节号“四、课程内容”→“五、课程内容”，页码整体前移；个别措辞与等级变化（化学 5.1“绿色化学”→“绿色发展”、有机 2.4 改写并把绿色化学移入 2.3、结构 1.1“核外电子运动模型”→“原子结构模型”；数学“平面向量基本定理”理解→掌握；物理选修新增 2.4.5 人工智能）。 | 影响 KG 的 3 个化学概念证据与 1 个数学概念描述已修正；其余为学业要求/情境层面，不影响概念集合。 |
| SEAB H2 数学 9758、H2 物理 9478 | 原 `seab.gov.sg/files` 地址已 404；SEAB 2026 页面现链接 isomer 地址，**文件 SHA-256 不变**。2027 版除年份外内容一致。 | 更新 document_url，备注 2027 版校验值。 |
| SEAB H2 生物 9477 / 化学 9476 | 原文件仍可用、SHA 一致；9477 在 SEAB 页面被替换为修正字体嵌入的重传版（逐页内容一致）。2027 版内容一致。 | 备注。 |
| SEAB 页码 | 化学有机部分（11.1、11.2、11.4、11.5、11.7、11.10）与实验技能（P/MMO/PDO/ACE）共 30 条、物理 20(q)–(t) 4 条页码错 1–2 页。 | 按 outcome 实际所在页校正。 |
| MOE 初中科学 / 中学数学 | SHA 一致；但所有定位使用**印刷页码**却标为“PDF p.”（科学差 1 页、数学差 2 页；数学另有 2 条本身错 1 页）。 | 215 条定位换算为真实 PDF 页。 |
| H2 物理框架 18(h) | 9478（2026、2027 版）主题 18 只有 (a)–(g)，18(h) 系虚构条目。 | 删除该要求及其映射；生成脚本同步删除；测试计数 215→214。 |

## 3. 已落库的内容修正（状态仍为 needs_review）

- 概念描述：中国高中数学「平面向量基本定理与坐标」— 2025 日常修订把内容要求由“理解平面向量基本定理及其意义”提高为“掌握平面向量基本定理”，描述同步更新。
- 概念描述：新加坡 H2 物理「海森堡位置—动量不确定性」— SEAB 9478 19(h) 以 ∆x∆p ≳ h 的数量级形式表述并强调“局域化粒子需要动量弥散”；原描述写成 ΔxΔp ≥ ℏ/2 的严格形式，与大纲口径不一致。
- 概念证据：中国高中化学「绿色化学基本思想」— 2025 日常修订把必修内容要求 5.1 的“树立‘绿色化学’的观念”改为“树立‘绿色发展’的观念”；“绿色化学”现见于必修主题5学业要求第5条与选择性必修有机 2.3，补充这两处证据，5.1 保留为绿色发展背景。
- 概念证据：中国高中化学「清洁生产与循环利用」— 清洁生产与“物能循环利用”出自必修 5.1，“废弃物循环利用”出自 5.3；原证据 5.4 是环境污染成因与防治，不支持该概念。
- 概念证据：中国高中化学「有机物安全与绿色合成」— 2025 修订把“体会‘绿色化学’思想在有机合成中的重要意义”从有机 2.4 移入 2.3；2.4 仍覆盖有机物对环境与健康的影响和安全使用，故两处并列引用。
- 课程要求 `req_cn_sh_chem_2020_o_r_5_1b_green_chemistry_principles` — 2025 修订把必修 5.1 的“绿色化学”观念改为“绿色发展”，“绿色化学”现见于必修主题5学业要求第5条与选择性必修有机 2.3。
- 课程要求 `req_cn_sh_chem_2020_o_r_5_4b_clean_production_circularity` — 清洁生产与物能循环利用出自 5.1，废弃物循环利用出自 5.3；5.4 是污染成因与防治。
- 课程要求 `req_cn_sh_chem_2020_o_ss_1_1a_electron_model_history` — 2025 修订把“核外电子运动模型的历史发展”改为“原子结构模型的历史发展”。
- 课程要求 `req_cn_sh_chem_2020_o_so_2_4a_organic_safety_green_synthesis` — 2025 修订把有机合成中的“绿色化学”思想从 2.4 移入 2.3。
- 映射 `map_sg_h2_biology_9477_2026_o_2_j` — 9477 2(j) 同时要求 PCR、凝胶电泳与 Southern 印迹；前两者由 A-Level“基因技术”覆盖，原映射只列 Southern 印迹。
- 映射 `map_sg_h2_chemistry_9476_2026_o_11_5_d` — 9476 11.5(d) 以化学惰性解释氟代烷用途，依据是 C–F 键能，应补充“键能”。
- 映射 `req_cn_sh_bio_2020_o_sb_4_2_2_somatic_cell_nuclear_transfer` — 动物体细胞核移植不属于 A-Level“基因技术”（重组 DNA、PCR 等）范围，该附加映射不成立。
- 教学法 `mis_sg_physics_uncertainty_always_equality` — 与 9478 19(h) 的表述口径对齐，避免学习者误以为大纲公式错误。

## 4. 各图先修边审核

判定标准：学习终点概念时，是否确实需要先掌握起点概念。仅因官方大纲条目相邻而产生、两者并列或无关的边一律删除。

### 中国高中生物（`senior_secondary_biology`）

- 概念 75 个全部保留；同图边 50 条 → 删除 14、新增 0、降为软边 0、改写理由 7。
- 75 个概念均对照《普通高中生物学课程标准（2017年版2025年修订）》内容要求原文核对；2025 修订（如内分泌腺列举调整、个别行为动词变化）不改变本图概念集合，相关措辞在课程框架层另行同步。

| 删除的边 | 理由 |
|---|---|
| 细胞核与遗传信息 → 细胞结构的协调合作 | 细胞各部分协调合作不以“遗传信息主要储存在细胞核”为前提；原边仅来自 1.2.3→1.2.4 相邻顺序。 |
| 细胞分化 → 细胞衰老与死亡 | 细胞衰老与死亡是并列的细胞生命历程，不依赖细胞分化。 |
| 化石、比较解剖与胚胎学的共同祖先证据 → 细胞与分子层面的共同祖先证据 | 化石/比较解剖证据与细胞/分子证据是并列的两类共同祖先证据，不存在依赖。 |
| 自主神经调节内脏 → 大脑皮层高级神经活动 | 语言与条件反射等大脑皮层高级活动不依赖自主神经调节内脏；原边仅来自 1.3.5→1.3.6 相邻顺序。 |
| 神经与体液调节协调 → 体液成分调节呼吸 | 二氧化碳等体液成分对呼吸的调节不以神经—体液协调为前提；原边仅来自 1.4.3→1.4.4 相邻顺序。 |
| 种群特征的生物与非生物影响因素 → 群落垂直、水平结构及时间变化 | 群落垂直、水平结构不依赖种群影响因素；原边跨越种群与群落层次，仅来自相邻顺序。 |
| 生态规律与资源利用 → 数量、生物量和能量金字塔 | 生态金字塔依赖能量流动与物质循环（该边已保留），不依赖资源利用实例。 |
| 数量、生物量和能量金字塔 → 食物链中的有害物质富集 | 有害物质富集依赖食物链摄食关系（该边已保留），不依赖生态金字塔。 |
| 食物链中的有害物质富集 → 生态系统信息传递 | 生态系统信息传递与有害物质富集无依赖；原边仅来自 2.2.6→2.2.7 相邻顺序。 |
| 生态系统信息传递 → 营养结构的生物与非生物决定因素 | 营养结构的决定因素不依赖信息传递；原边仅来自 2.2.7→2.2.8 相邻顺序。 |
| 人口增长的环境压力 → 全球环境问题与生物圈稳态 | 全球气候变化、臭氧层破坏等环境问题不以人口压力为前提；二者并列。 |
| 无菌技术 → 培养基配方与目的培养 | 调整培养基配方进行目的培养不依赖无菌技术；原边仅来自 3.1.2→3.1.3 相邻顺序。 |
| 动物体细胞核移植 → 动物细胞融合 | 动物细胞融合不依赖体细胞核移植；二者都以动物细胞培养为基础（该边已保留）。 |
| 单克隆抗体制备 → 干细胞的生物医学应用 | 干细胞的生物医学应用不依赖单克隆抗体制备；原边仅来自 4.2.4→4.2.5 相邻顺序。 |

### 中国高中化学（`senior_secondary_chemistry`）

- 概念 49 个全部保留；同图边 34 条 → 删除 15、新增 0、降为软边 0、改写理由 4。
- 49 个概念均对照《普通高中化学课程标准（2017年版2025年修订）》内容要求原文核对；除上述 3 个证据调整外，2025 修订对本图概念范围无影响。

| 删除的边 | 理由 |
|---|---|
| 有机合成创造新物质 → 有机合成路线设计 | 认识“合成新物质是有机化学的价值”不是设计合成路线的前提；路线设计依赖反应类型与官能团转化（A-Level 图已有）。 |
| 物质分类与类别转化 → 元素价态与物质转化 | 物质类别与元素价态是认识物质转化的两个并列维度（“价—类”二维），不存在先修依赖；原边仅来自 2.1 内部顺序。 |
| 氧化剂与还原剂 → 电解质与电离 | 电解质电离不依赖氧化剂与还原剂；原边仅来自 2.2→2.3 相邻顺序。 |
| 常见离子的检验 → 钠及其重要化合物 | 钠及其化合物的性质不依赖离子检验；原边仅来自 2.3→2.4 相邻顺序。 |
| 钠及其重要化合物 → 铁及其重要化合物 | 钠与铁是并列的元素化合物学习对象，不存在依赖；原边仅来自 2.4 内部顺序。 |
| 氮及其重要化合物 → 硫及其重要化合物 | 氮与硫是并列的非金属元素化合物，不存在依赖；原边仅来自 2.5 内部顺序。 |
| 有机合成创造新物质 → 高分子与生物大分子应用初步 | 高分子、油脂、糖类、蛋白质的应用与“合成新物质的价值”并列，不存在依赖；原边仅来自 4.3 内部顺序。 |
| 绿色化学基本思想 → 化学与材料科学 | 化学与材料科学不依赖绿色化学思想；原边仅来自 5.1→5.2 相邻顺序。 |
| 化学与材料科学 → 化学与人类健康 | 化学与健康不依赖化学与材料；原边仅来自 5.2 内部顺序。 |
| 自然资源与能源综合利用 → 污染物检测与治理 | 污染物检测与治理不依赖能源方案评价；原边仅来自 5.3→5.4 相邻顺序。 |
| 清洁生产与循环利用 → 化学应用法律法规与规则意识 | 遵守化学品与环保法规的意识不依赖清洁生产原理；原边仅来自 5.4→5.5 相邻顺序。 |
| 过渡晶体与混合型晶体 → 聚集状态、微粒作用与材料性质 | 过渡晶体与聚集状态是 2.4 中并列的两点，不存在依赖。 |
| 光谱与晶体 X 射线结构测定 → 结构—性质与材料设计 | 依据结构—性质关系指导材料设计并不以掌握光谱/X 射线测定方法为前提；原边仅来自 3.2→3.3 相邻顺序。 |
| 结构—性质与材料设计 → 结构理论与生命科学 | 结构理论支持生命科学研究与材料设计是 3.3 中并列的两点，不存在依赖。 |
| DNA、RNA 结构与功能 → 合成高分子与新型材料 | 合成高分子材料不依赖核酸结构；原边仅来自 3.2→3.3 相邻顺序。 |

### 中国高中数学（`senior_secondary_mathematics`）

- 概念 70 个全部保留；同图边 79 条 → 删除 26、新增 0、降为软边 2、改写理由 8。
- 70 个概念均对照《普通高中数学课程标准（2017年版2025年修订）》对应单元核对；2025 修订仅在个别要求等级（如平面向量基本定理“理解→掌握”、立体图形结构“认识→掌握”）上有变化，不改变本图概念集合。

| 删除的边 | 理由 |
|---|---|
| 三角函数诱导公式 → 积化和差、和差化积与半角变换 | 积化和差、和差化积与半角公式由两角和差与倍角公式推出，诱导公式不是其前提。 |
| 必要、充分与充要条件 → 量词命题及其否定 | 全称/存在量词命题及其否定不依赖充分必要条件；原边仅来自主题一条目相邻顺序。 |
| 量词命题及其否定 → 不等式概念与性质 | 不等式性质不依赖量词命题；原边跨越单元，仅来自条目相邻顺序。 |
| 分段函数 → 函数单调性 | 函数单调性不以分段函数为前提，且被错误标为硬前置；原边仅来自主题二条目相邻顺序。 |
| 分段函数 → 函数最大值与最小值 | 最大值与最小值不以分段函数为前提，且被错误标为硬前置。 |
| 函数单调性 → 函数奇偶性 | 奇偶性与单调性是并列的函数性质，不存在依赖。 |
| 函数最大值与最小值 → 函数奇偶性 | 奇偶性不依赖最大(小)值，二者并列。 |
| 函数奇偶性 → 函数周期性 | 周期性不依赖奇偶性，二者并列（课标要求结合三角函数理解周期性）。 |
| 函数周期性 → 幂函数 | 幂函数不依赖周期性；原边跨越单元，仅来自条目相邻顺序。 |
| 幂函数 → 实数指数幂及运算性质 | 实数指数幂的运算性质不以幂函数为前提（若有依赖也应反向）；原边仅来自条目相邻顺序。 |
| 积化和差、和差化积与半角变换 → 三角函数建模 | 三角函数建模使用 y=Asin(ωx+φ) 等模型，不依赖积化和差与半角变换，且被错误标为硬前置。 |
| 比较函数增长速度 → 函数模型参数解释 | 参数解释依赖“选择函数模型”（该边已保留），对增长速度比较的依赖只是间接的；删除冗余的硬前置。 |
| 正弦定理与余弦定理 → 复数与数系扩充 | 复数与数系扩充不依赖正弦、余弦定理；原边跨越单元，仅来自条目相邻顺序。 |
| 复平面表示 → 复数代数形式四则运算 | 复数代数形式的四则运算不依赖复平面表示，且被错误标为硬前置。 |
| 复数代数形式四则运算 → 基本立体图形结构 | 立体图形结构与复数运算无关；原边跨越单元，仅来自条目相邻顺序。 |
| 复数加减的几何意义 → 基本立体图形结构 | 立体图形结构与复数几何意义无关；原边跨越单元。 |
| 几何体表面积与体积 → 空间图形直观图 | 斜二测直观图不依赖表面积与体积公式，且被错误标为硬前置。 |
| 空间图形直观图 → 空间点线面基本事实 | 点线面基本事实不依赖直观图画法；原边仅来自条目相邻顺序。 |
| 空间平行性质 → 空间平行判定 | 课标中判定定理由直观感知“归纳”，性质定理需“证明”，二者并列，判定不以性质为前提。 |
| 空间垂直属性 → 空间平行判定 | 平行判定不依赖垂直性质；原边仅来自条目相邻顺序。 |
| 空间平行性质 → 空间垂直判定 | 垂直判定不依赖平行性质；原边仅来自条目相邻顺序。 |
| 空间垂直属性 → 空间垂直判定 | 垂直判定由直观归纳得到，并不以垂直性质定理为前提，二者并列。 |
| 取值规律与百分位数 → 统计推断的或然性 | 统计推断的或然性（统计与确定性思维的区别）不依赖百分位数，且被错误标为硬前置。 |
| 圆锥曲线背景与作用 → 椭圆定义、方程与性质 | 了解圆锥曲线实际背景属于学习动机，不是椭圆定义与方程的前提。 |
| 椭圆定义、方程与性质 → 抛物线 | 抛物线的定义与标准方程不依赖椭圆，二者并列依赖“解析几何数形结合”。 |
| 回归预测及其限制 → 2×2 列联表 | 2×2 列联表不依赖一元线性回归；原边仅来自主题三条目相邻顺序。 |

降为软边：
- 平面向量应用 → 正弦定理与余弦定理：课标要求借助向量运算探索三角形边角关系，依赖成立；但真正的前提是向量运算而非“向量应用”本身，降为软前置。
- 复数代数表示与相等 → 复数加减的几何意义：依赖经由“四则运算”与“复平面表示”间接成立，降为软前置。

### 中国高中物理（`senior_secondary_physics`）

- 概念 73 个全部保留；同图边 48 条 → 删除 23、新增 1、降为软边 0、改写理由 8。
- 73 个概念均对照《普通高中物理课程标准（2017年版2025年修订）》内容要求及其例子核对（如 2.3.2 例 1–2、2.3.3 例 3、3.1.4 例 3–4）；2025 修订对本图概念范围无影响。

| 删除的边 | 理由 |
|---|---|
| 麦克斯韦电磁场理论初步 → 电磁振荡 | LC 电磁振荡中电场能与磁场能的转换不以麦克斯韦理论为前提（课标亦先学振荡）；麦克斯韦理论真正支撑的是电磁波，改为新增“麦克斯韦理论→电磁波的发射、传播与接收”。 |
| 静摩擦与滑动摩擦 → 力的合成分解与矢量 | 力的合成分解与矢量概念不依赖摩擦力；原边仅来自 1.2.1→1.2.2 相邻顺序。 |
| 动能与动能定理 → 重力势能 | 重力势能依赖重力做功（A-Level 图“功”），不依赖动能定理；原边仅来自 2.1.2→2.1.3 相邻顺序。 |
| 相对论时空观初步 → 宇宙起源与演化 | 宇宙起源与恒星演化的研究进展不以相对论时空观为前提；原边仅来自 2.3.2→2.3.3 相邻顺序。 |
| 静电现象与电荷守恒 → 点电荷模型 | 点电荷模型是理想化条件判断，不依赖起电方式与电荷守恒，且被错误标为硬前置。 |
| 电场线模型 → 静电利用与防护 | 静电利用与防护不依赖电场线描述；原边仅来自 3.1.3→3.1.4 相邻顺序。 |
| 静电利用与防护 → 电势能、电势与电势差 | 电势能、电势与电势差不依赖静电应用；原边仅来自 3.1.4→3.1.5 相邻顺序。 |
| 带电粒子在电场中的运动 → 电容器与电容 | 电容器与电容不依赖带电粒子在电场中的运动；原边仅来自 3.1.5→3.1.6 相邻顺序。 |
| 电路元件及作用 → 电阻与材料、长度和横截面积 | 电阻定律不依赖识别电路元件；原边仅来自 3.2.1→3.2.2 相邻顺序。 |
| 闭合电路欧姆定律 → 电功与电功率 | 电功与电功率（W=UIt、P=UI）不依赖闭合电路欧姆定律；原边仅来自 3.2.4→3.2.5 相邻顺序。 |
| 水能、风能与太阳能利用 → 核能利用初步 | 核裂变与核聚变不依赖水能、风能、太阳能利用方式；二者并列。 |
| 可再生能源与环境影响 → 污染防治与协调发展 | 环境污染危害与协调发展意识不依赖能源分类，且被错误标为硬前置。 |
| 单摆周期规律 → 受迫振动 | 受迫振动与共振依赖固有频率与简谐运动（A-Level 图已有），不依赖单摆周期公式。 |
| 光的偏振与横波性质 → 激光特性与应用 | 激光特性不依赖偏振；原边仅来自 1.3.3→1.3.4 相邻顺序。 |
| 自感现象 → 涡流现象 | 自感与涡流是并列的电磁感应现象，共同依赖法拉第定律与楞次定律。 |
| 涡流现象 → 正弦交变电流 | 正弦交变电流不依赖涡流；原边仅来自 2.2.3→2.2.4 相邻顺序。 |
| 远距离高压输电 → 发电机与电动机能量转化 | 发电机与电动机的能量转化不依赖远距离输电；原边仅来自 2.2.5→2.2.6 相邻顺序。 |
| 扩散与布朗运动 → 分子运动速率分布 | 速率分布统计规律与扩散、布朗运动并列，共同依赖分子动理论（该边已保留）。 |
| 分子运动速率分布 → 晶体与非晶体 | 晶体与非晶体不依赖分子速率分布；原边仅来自 3.1.2→3.1.3 相邻顺序。 |
| 液晶性质与应用 → 半导体材料 | 半导体材料不依赖液晶；原边仅来自 3.1.3→3.1.4 相邻顺序。 |
| 半导体材料 → 纳米材料 | 纳米材料与半导体是 3.1.4 下并列的材料实例，不存在依赖。 |
| 原子核式结构模型 → 四种基本相互作用 | 四种基本相互作用与原子核式结构模型无直接依赖；与核力的联系已由“原子核组成与核力→四种基本相互作用”表达。 |
| 四种基本相互作用 → 核反应方程 | 核反应方程依据质量数与电荷守恒，不依赖四种基本相互作用。 |

新增：
- 麦克斯韦电磁场理论初步 → 电磁波的发射、传播与接收（soft）：电磁波的发射与传播以“变化的电场与磁场相互激发”这一麦克斯韦电磁场理论基本思想为基础。

### 新加坡 H2 生物（`singapore_h2_biology`）

- 概念 42 个全部保留；同图边 31 条 → 删除 14、新增 1、降为软边 0、改写理由 2。
- 42 个概念均逐条对照 SEAB 9477 outcome 原文（topic 1–4 与拓展主题 A、B），排除边界（如不含转座子、卫星 DNA、Hfr、细胞内受体）与大纲一致。

| 删除的边 | 理由 |
|---|---|
| 第二信使 → 信号传导中的激酶与磷酸酶 | 磷酸化级联可不经第二信使（如受体酪氨酸激酶通路）；两者都是信号转导阶段的组成部分，应共同依赖“信号传导阶段”，而非相互依赖。 |
| 有害隐性等位基因的保留 → 微观进化与宏观进化的联系 | 微观—宏观进化的联系依赖等位基因频率变化（A-Level 图的自然选择/遗传漂变），不依赖“有害隐性等位基因如何被保留”。 |
| 基本再生数 R0 → 暴发、流行与大流行 | 暴发、流行、大流行按传播范围定义，不需要先理解 R0；原边仅来自 A(j)→(k) 的相邻顺序。 |
| 抗原漂移与抗原转变 → 原核生物水平基因转移 | 原核水平基因转移与流感抗原漂移/转变是并列的变异来源，不存在依赖；原边仅来自 2(f)→(g) 的相邻顺序。 |
| 原核生物水平基因转移 → 功能性非编码基因组元件 | 真核非编码 DNA 的结构与功能不依赖原核水平基因转移；原边仅来自 2(g)→(h) 的相邻顺序。 |
| 真核基因表达的多层调控 → Southern 印迹与核酸杂交 | Southern 印迹与核酸杂交依赖 DNA 结构、凝胶电泳与探针互补配对，不依赖真核基因表达调控；原边仅来自 2(i)→(j) 的相邻顺序。 |
| 上位性遗传问题求解 → 基因型、环境与表型 | 环境对表型的影响（如蜜蜂饮食与分化）不以上位性问题求解为前提；原边仅来自 2(aa)→(bb) 的相邻顺序。 |
| 微观进化与宏观进化的联系 → 进化的综合证据 | 分子同源、化石与生物地理证据支持进化论，并不以“微观—宏观进化的联系”为前提；原边仅来自 4(f)→(g) 的相邻顺序。 |
| 进化的综合证据 → 生物学物种概念及局限 | 生物学物种概念及其局限不依赖进化证据的整合；原边仅来自 4(g)→(h) 的相邻顺序。 |
| 抗体多样性的形成机制 → 疫苗的群体控制与权衡 | 疫苗控制疾病依赖免疫记忆与群体覆盖（已由“适应性免疫细胞协同”提供），不依赖体细胞重组与类别转换机制。 |
| 疫苗的群体控制与权衡 → 病毒对宿主组织的致病机制 | 流感与 HIV 的致病机制不以疫苗知识为前提；原边仅来自 A(f)→(g) 的相邻顺序。 |
| 人为活动碳足迹比较 → 气候压力与可持续食物供应 | 气候压力对食物供应的影响不依赖不同活动碳足迹的比较；原边仅来自 B(d)→(e) 的相邻顺序。 |
| 气候压力与可持续食物供应 → 气候驱动的生态重新分布 | 生境、食物链与生态位的重新分布不依赖食物供应分析，二者并列依赖“气候系统与生态影响”（该边已保留）。 |
| 热带生物多样性的医药与粮食资源价值 → 温度对昆虫媒介生命周期的影响 | 温度对昆虫代谢与蚊媒生命周期的影响不依赖热带生物多样性的资源价值；原边仅来自 B(g)→(h) 的相邻顺序。 |

新增：
- 细胞信号传导阶段 → 信号传导中的激酶与磷酸酶（soft）：解释激酶放大与磷酸酶终止信号前，需要先掌握“配体—受体结合、信号转导、细胞应答”三阶段框架。

主题结构问题（待你决定）：
- T2 干细胞潜能与染色体末端：干细胞与 DNA 末端复制问题无关
- T5 遗传筛查与癌症控制：母体筛查伦理与细胞周期/癌变混在一起
- T6 癌症进展与复杂遗传：癌症多步骤进展与上位性、G×E 混在一起
- T8 受体通路与种群进化：胰岛素/胰高血糖素信号与种群进化混在一起

### 新加坡 H2 化学（`singapore_h2_chemistry`）

- 概念 18 个全部保留；同图边 6 条 → 删除 2、新增 0、降为软边 0、改写理由 0。
- 18 个概念均逐条对应 SEAB 9476 outcome 原文（3(d)、4(a)(c)、7(e)(l)、8(k)、10.1(b)(d)(e)(f)、10.2(c)、11.3(b)、11.4(h)、11.5(b)(e)、11.10(g)、12(g)(j)(o)、13(c)(j)）。

| 删除的边 | 理由 |
|---|---|
| Arrhenius 与 Lewis 酸碱模型 → 碱解离与水的离子积 | Kb、pKb、Kw 与 KaKb=Kw 依赖的是 Brønsted–Lowry 共轭酸碱框架（A-Level 图已有），而非 Arrhenius/Lewis 模型的选择；不构成先修。 |
| 酸碱滴定曲线与指示剂选择 → 海洋碳酸盐缓冲与酸化 | 缓冲作用与海洋酸化只依赖弱酸平衡与 Ka/Kb，并不以滴定曲线和指示剂选择为前提；原边仅来自 10.1(e)→(f) 的相邻顺序。 |

### 新加坡 H2 数学（`singapore_h2_mathematics`）

- 概念 33 个全部保留；同图边 20 条 → 删除 5、新增 0、降为软边 1、改写理由 3。
- 33 个概念均对照 SEAB 9758 内容表（PDF p.6–13）逐项核对，包含/排除边界（如复数不含极坐标式、检验不含 Type I/II 术语）与大纲一致。

| 删除的边 | 理由 |
|---|---|
| 从情境建立方程与不等式 → 一次与二次因式构成的分式不等式 | 求解 f(x)/g(x)>0 型分式不等式只需符号分析或图像法，不以“从情境建立方程”为前提；原边仅来自 1.3 条目相邻顺序。 |
| 递推数列 → 级数运算、收敛与无穷和 | 级数加减、收敛与无穷和不依赖由 u(n+1)=f(u(n)) 生成数列；原边仅来自 2.1 条目相邻顺序。 |
| 实系数二次方程的非实根 → 由笛卡尔形式求模与主辐角 | 由笛卡尔形式求模与主辐角只依赖复数及其表示，不需要先会解有复根的二次方程；原边仅来自 4.1 条目相邻顺序。 |
| 正态概率与参数反求 → 随机变量线性变换的期望与方差 | E(aX+b)、Var(aX+b) 的运算法则适用于任意随机变量，不以正态概率计算为前提；原边仅来自 6.3 条目相邻顺序。 |
| 积矩相关系数解释 → 二元数据最小二乘回归 | 最小二乘回归线的求法与解释不以积矩相关系数解释为前提；两者并列建立在散点图之上，原边仅来自 6.6 条目相邻顺序。 |

降为软边：
- 单尾与双尾假设检验 → 情境中解释假设检验结论：依赖经由“单总体均值检验”间接成立，检验结论解释不能被单尾/双尾选择直接阻断，降为软前置。

### 新加坡 H2 物理（`singapore_h2_physics`）

- 概念 8 个全部保留；同图边 4 条 → 删除 1、新增 0、降为软边 0、改写理由 1。
- 8 个缺口概念均逐条对应 SEAB 9478 outcome 原文（19(f)–(j)、20(f)(g)(m)–(o)、4(h)、17(m)）。

| 删除的边 | 理由 |
|---|---|
| 海森堡位置—动量不确定性 → 无限深方势阱波函数与能级 | 19(i)(j) 的驻波解与能级公式只依赖波函数与边界条件，不依赖不确定性原理；原边仅来自 outcome 相邻顺序。 |

### 新加坡初中科学（`singapore_lower_secondary_science`）

- 概念 32 个全部保留；同图边 19 条 → 删除 3、新增 0、降为软边 0、改写理由 1。
- 32 个概念均已对照 MOE 2021 G2/G3 Lower Secondary Science（PDF p.33–52）的 learning outcomes 原文，范围与 G2 可选（*）标注一致。

| 删除的边 | 理由 |
|---|---|
| 热胀冷缩与密度变化 → 传导、对流与热辐射 | 传导、对流、辐射三种热传递方式并不以热胀冷缩与密度变化为前提；原边仅来自 topic 10 outcome 相邻顺序。 |
| 多细胞运输需求与血管交换 → 植物运输中的扩散 | 植物细胞的气体与矿质离子扩散不依赖人体血管交换知识；两者共同依赖“扩散”本身，原边仅来自 topic 15 outcome 相邻顺序。 |
| 临时与永久避孕机制 → 性传播感染的危害与治疗边界 | STI 的危害及抗生素只对细菌性 STI 有效，并不以避孕机制为前提；原边仅来自 topic 16 outcome 相邻顺序。 |

### 新加坡中学数学 G2/G3（`singapore_secondary_mathematics`）

- 概念 53 个全部保留；同图边 58 条 → 删除 27、新增 3、降为软边 0、改写理由 13。
- 53 个概念均对照 MOE 2020 G2/G3 Mathematics 内容表（PDF p.15–35）；派生边多数跨越“数与代数/几何与度量/统计与概率”分支，系条目相邻顺序造成。

| 删除的边 | 理由 |
|---|---|
| 个人与家庭金融数学 → 路程—时间与速度—时间图像 | 运动图像解释与个人金融无依赖关系；原边仅来自 G3 Secondary All 条目相邻顺序，且被错误标为硬前置。 |
| 质因数分解、公因倍数与方根 → 实数运算、数轴与大小关系 | 实数运算、数轴与大小比较不以质因数分解为前提；原边仅来自 Sec1 条目相邻顺序。 |
| 取整、近似与估算 → 比与按比分配 | 比与按比分配不依赖取整与估算；原边仅来自 Sec1 条目相邻顺序。 |
| 百分数表示、比较与变化 → 率、路程、时间与速度 | 率、路程与速度不依赖百分数；原边仅来自 Sec1 条目相邻顺序。 |
| 率、路程、时间与速度 → 代数记号与代入求值 | 代数记号与代入求值不依赖速度问题；原边跨越“数与代数”内不同分支，仅来自条目相邻顺序。 |
| 用代数通项表示规律 → 一次式的运算与化简 | 一次式运算与化简不以通项规律为前提；原边仅来自 Sec1 条目相邻顺序。 |
| 一次式的运算与化简 → 二维坐标中的变量关系表示 | 用坐标表示两变量关系不依赖一次式化简；原边仅来自 Sec1 条目相邻顺序。 |
| 四边形与多边形性质 → 几何作图 | 尺规作图（中垂线、角平分线等）不以多边形性质为前提；原边仅来自 Sec1 条目相邻顺序。 |
| 几何作图 → 组合平面图形的周长与面积 | 组合图形周长与面积计算不依赖几何作图；原边仅来自 Sec1 条目相邻顺序。 |
| 地图比例尺与正反比例 → 代数展开与基本恒等式 | 代数展开与恒等式不依赖比例尺；原边跨分支，仅来自 Sec2 条目相邻顺序。 |
| 代数展开与基本恒等式 → 改变公式主项与未知量求值 | 改变公式主项依赖的是等式变形（解方程），而非展开恒等式；以新增“整数系数一元一次方程→改变公式主项”替代。 |
| 放缩与比例作图 → 勾股定理及逆定理 | 勾股定理不依赖放缩作图；原边仅来自 Sec2 条目相邻顺序。 |
| 点图、直方图与茎叶图 → 平均数、中位数、众数与分组均值 | 平均数、中位数、众数的计算与选择不以点图/直方图/茎叶图为前提；原边仅来自 Sec2 条目相邻顺序。 |
| 整数次幂标准式 → 整数与分数指数及指数律 | 方向不成立：A×10ⁿ（含负整数 n）以指数概念为基础，而指数律并不依赖标准式；原边仅来自条目相邻顺序。 |
| 用切线估计曲线斜率 → 公式、配方与图像法解二次方程 | 公式法、配方法与图像法解二次方程不依赖切线估计斜率；以新增“展开与恒等式→公式/配方/图像法”替代。 |
| 几何作图 → 圆的弦与切线性质 | 圆的弦与切线性质不依赖几何作图；原边仅来自 Sec3/4 条目相邻顺序。 |
| 二维与三维三角问题 → 弧长、扇形面积与弓形面积 | 弧长、扇形与弓形面积不依赖二维/三维三角问题；原边仅来自 Sec3/4 条目相邻顺序。 |
| 累积频数图与箱线图 → 计算标准差并比较数据集 | 标准差的计算与比较不依赖累积频数图与箱线图（已由“集中趋势”提供前置）；原边仅来自条目相邻顺序。 |
| 计算标准差并比较数据集 → 复合事件概率表示 | 复合事件概率表示与标准差无依赖；原边跨越统计与概率分支，仅来自条目相邻顺序。 |
| 初等矩阵表示与运算 → 三角形全等相似判定与尺度比 | 三角形全等相似判定与矩阵无依赖；原边仅来自 Sec3/4 条目相邻顺序。 |
| 地图比例尺与正反比例 → 一次式的运算与化简 | 一次式运算不依赖比例尺；原边仅来自 G2 Sec2 条目相邻顺序。 |
| 含分数形式的一次方程 → 简单与联立一元一次不等式 | 一元一次不等式已依赖整数系数一次方程，并不需要含分数形式的方程；原边仅来自 G2 Sec2 条目相邻顺序。 |
| 几何作图 → 全等与相似基础 | 全等与相似的识别不依赖尺规作图；原边仅来自 G2 Sec2 条目相邻顺序。 |
| 全等与相似基础 → 勾股定理及逆定理 | 勾股定理的应用与逆定理不依赖全等相似；原边仅来自 G2 Sec2 条目相邻顺序。 |
| 用切线估计曲线斜率 → 因式分解法解二次方程 | 因式分解法解二次方程不依赖切线估计斜率；以新增“因式分解→因式分解法解二次方程”替代。 |
| 改变公式主项与未知量求值 → 代数分式加减 | 代数分式加减依赖因式分解与分式乘除，不依赖改变公式主项；原边仅来自 G2 Sec3/4 条目相邻顺序。 |
| 代数分式加减 → 放缩与比例作图 | 放缩与比例作图与代数分式无依赖；原边跨越代数与几何分支，仅来自条目相邻顺序。 |

新增：
- 整数系数一元一次方程 → 改变公式主项与未知量求值（soft）：改变公式主项沿用解一次方程时的等式两边同时运算与逆运算思路。
- 一次式与二次式因式分解 → 因式分解法解二次方程（hard）：因式分解法解二次方程必须先把二次式写成因式乘积，再用零乘积性质。
- 代数展开与基本恒等式 → 公式、配方与图像法解二次方程（soft）：配方法依赖完全平方恒等式的正反使用，公式法亦由配方推出。

## 5. 跨图先修边

- 337 条跨图派生边逐条按“学习终点概念是否需要先掌握起点概念”判定；运行时仅用于目标限定课程的确定性先修目标选择。

删除理由分布：

- 123 条：仅来自官方大纲条目相邻顺序，两概念间不存在学习依赖。
- 7 条：起点概念的范围已覆盖终点概念（课程映射已表达覆盖关系），作为先修边会在目标限定课程中重复引入同一内容。
- 6 条：仅来自官方大纲条目相邻顺序，两概念间不存在学习依赖。（且起点为高中概念、终点为初中概念）
- 5 条：仅来自官方大纲条目相邻顺序，两概念间不存在学习依赖。（且起点为 H2 预科概念、终点为初中概念，方向倒置）
- 2 条：方向不成立：终点概念比起点概念更基础。
- 2 条：起点为大学课程概念，且终点已由 A-Level 同类概念提供先修（第 122、126 条），属于冗余跨层级先修。
- 1 条：方向不成立：终点概念比起点概念更基础。（大学机器学习中的线性回归以高中回归为基础）
- 1 条：起点“原子核结构”与本图“原子核式结构模型”为同一 canonical 概念；同图对应边已判定不成立。
- 1 条：两端为同一 canonical 概念（实物粒子波动性/波粒二象性），不应表示为先修关系。
- 1 条：方向不成立：终点概念比起点概念更基础。（A-Level 复数轨迹以模与辐角为基础）
- 1 条：大学课程“序列与级数”不是递推数列的先修，且已有中国课标“数列概念与表示”提供先修。
- 1 条：与另一条跨图边指向同一 canonical 概念对，属于重复表达。（与第 290 条相同）
- 1 条：方向不成立：终点概念比起点概念更基础。（初中“生殖结构与受精”比高中“受精与早期胚胎发育”更基础）
- 1 条：与另一条跨图边指向同一 canonical 概念对，属于重复表达。（与第 301 条相同）

<details><summary>删除的 153 条跨图边明细</summary>

- 水（a_level_biology）→ 细胞中的无机盐（senior_secondary_biology）
- DNA结构（a_level_biology）→ 细胞结构的协调合作（senior_secondary_biology）
- 扩散与渗透（a_level_biology）→ 胞吞与胞吐（senior_secondary_biology）
- 主动运输（a_level_biology）→ 胞吞与胞吐（senior_secondary_biology）
- 有丝分裂（a_level_biology）→ 细胞分化（senior_secondary_biology）
- 基因表达控制（a_level_biology）→ 细胞衰老与死亡（senior_secondary_biology）
- 翻译（a_level_biology）→ 表观遗传现象（senior_secondary_biology）
- 翻译（a_level_biology）→ 诱变因素与癌变（senior_secondary_biology）
- 基因连锁与交换（a_level_biology）→ 染色体结构与数量变异（senior_secondary_biology）
- 染色体行为（a_level_biology）→ 人类遗传病检测与预防（senior_secondary_biology）
- 激素控制（a_level_biology）→ 体液成分调节呼吸（senior_secondary_biology）
- 肾脏与渗透压调节（a_level_biology）→ 体液成分调节呼吸（senior_secondary_biology）
- 抗体与疫苗接种（a_level_biology）→ 非特异性与特异性免疫（senior_secondary_biology）
- 生态系统与生态位（a_level_biology）→ 初生演替与次生演替（senior_secondary_biology）
- 保护（a_level_biology）→ 数量、生物量和能量金字塔（senior_secondary_biology）
- 生物多样性调查（a_level_biology）→ 生态工程与资源循环利用（senior_secondary_biology）
- 保护（a_level_biology）→ 生态工程与资源循环利用（senior_secondary_biology）
- 基因技术（a_level_biology）→ 动物细胞融合（senior_secondary_biology）
- 抗体与疫苗接种（a_level_biology）→ 干细胞的生物医学应用（senior_secondary_biology）
- 基因技术（a_level_biology）→ 限制酶、连接酶与载体（senior_secondary_biology）
- 氧化数（a_level_chemistry）→ 胶体与分散系（senior_secondary_chemistry）
- 氧化数（a_level_chemistry）→ 电解质与电离（senior_secondary_chemistry）
- 布朗斯特-洛瑞理论（a_level_chemistry）→ 离子反应及发生条件（senior_secondary_chemistry）
- 第17族卤素（a_level_chemistry）→ 氮及其重要化合物（senior_secondary_chemistry）
- 氮和硫（a_level_chemistry）→ 硫及其重要化合物（senior_secondary_chemistry）
- 氧化还原方程（a_level_chemistry）→ 燃料效率与化学电源价值（senior_secondary_chemistry）
- 反应机理类型（a_level_chemistry）→ 有机合成创造新物质（senior_secondary_chemistry）
- 加聚反应（a_level_chemistry）→ 有机合成创造新物质（senior_secondary_chemistry）
- 醇的氧化（a_level_chemistry）→ 有机合成创造新物质（senior_secondary_chemistry）
- 烯烃（a_level_chemistry）→ 自然资源与能源综合利用（senior_secondary_chemistry）
- 苯的结构（a_level_chemistry）→ 自然资源与能源综合利用（senior_secondary_chemistry）
- 焓变（a_level_chemistry）→ 内能与体系状态（senior_secondary_chemistry）
- 电化学电池（a_level_chemistry）→ 内能与体系状态（senior_secondary_chemistry）
- 速控步（a_level_chemistry）→ 化工反应条件综合优化（senior_secondary_chemistry）
- 强酸与弱酸（a_level_chemistry）→ 水的电离、离子积与 pH（senior_secondary_chemistry）
- pH 与酸解离常数（a_level_chemistry）→ 水的电离、离子积与 pH（senior_secondary_chemistry）
- VSEPR 分子形状（a_level_chemistry）→ 光谱与晶体 X 射线结构测定（senior_secondary_chemistry）
- 红外光谱（a_level_chemistry）→ 结构—性质与材料设计（senior_secondary_chemistry）
- NMR光谱（a_level_chemistry）→ 结构—性质与材料设计（senior_secondary_chemistry）
- 命名法（a_level_chemistry）→ 官能团性质、相互影响与转化（senior_secondary_chemistry）
- 加聚反应（a_level_chemistry）→ 糖类、葡萄糖、淀粉与纤维素（senior_secondary_chemistry）
- 氨基酸与蛋白质（a_level_chemistry）→ DNA、RNA 结构与功能（senior_secondary_chemistry）
- 函数与反函数（a_level_mathematics）→ 函数的表示方法（senior_secondary_mathematics）
- 三角恒等式（a_level_mathematics）→ 三角函数建模（senior_secondary_mathematics）
- 倍角与和差公式（a_level_mathematics）→ 三角函数建模（senior_secondary_mathematics）
- 根的定位（a_level_mathematics）→ 选择函数模型（senior_secondary_mathematics）
- 标量积（a_level_mathematics）→ 平面向量基本定理与坐标（senior_secondary_mathematics）
- 阿根图（a_level_mathematics）→ 复数代数形式四则运算（senior_secondary_mathematics）
- 复数运算（a_level_mathematics）→ 基本立体图形结构（senior_secondary_mathematics）
- 概率法则（a_level_mathematics）→ 用频率估计概率（senior_secondary_mathematics）
- 中心趋势与离散（a_level_mathematics）→ 抽样方案选择（senior_secondary_mathematics）
- 数据表示（a_level_mathematics）→ 统计推断的或然性（senior_secondary_mathematics）
- 中心趋势与离散（a_level_mathematics）→ 统计推断的或然性（senior_secondary_mathematics）
- 积商法则（a_level_mathematics）→ 简单线性复合函数求导（senior_secondary_mathematics）
- 圆（a_level_mathematics）→ 圆锥曲线背景与作用（senior_secondary_mathematics）
- 直线（a_level_mathematics）→ 圆锥曲线背景与作用（senior_secondary_mathematics）
- 连续随机变量（a_level_mathematics）→ 样本相关系数（senior_secondary_mathematics）
- 正态分布（a_level_mathematics）→ 样本相关系数（senior_secondary_mathematics）
- 离散随机变量（a_level_mathematics）→ 样本相关系数（senior_secondary_mathematics）
- 事件独立性（discrete_math_and_probability）→ 数据来源、总体与样本（senior_secondary_mathematics）
- 连续随机变量（discrete_math_and_probability）→ 样本相关系数（senior_secondary_mathematics）
- 正态分布（discrete_math_and_probability）→ 样本相关系数（senior_secondary_mathematics）
- 离散随机变量（discrete_math_and_probability）→ 样本相关系数（senior_secondary_mathematics）
- 线性回归（machine_learning）→ 回归预测及其限制（senior_secondary_mathematics）
- 线性回归（machine_learning）→ 2×2 列联表（senior_secondary_mathematics）
- 曲线草图（mit_calculus）→ 导数解决实际优化（senior_secondary_mathematics）
- 直线与平面（mit_calculus）→ 向量法证明立体几何定理（senior_secondary_mathematics）
- 二分法（numerical_analysis）→ 选择函数模型（senior_secondary_mathematics）
- 牛顿运动定律（a_level_mathematics）→ 电容器与电容（senior_secondary_physics）
- 胡克定律（a_level_physics）→ 静摩擦与滑动摩擦（senior_secondary_physics）
- 功率与效率（a_level_physics）→ 动能与动能定理（senior_secondary_physics）
- 动能与势能（a_level_physics）→ 重力势能（senior_secondary_physics）
- 动能与势能（a_level_physics）→ 弹性势能（senior_secondary_physics）
- 电场强度（a_level_physics）→ 静电利用与防护（senior_secondary_physics）
- 电场强度（a_level_physics）→ 电容器与电容（senior_secondary_physics）
- 牛顿运动定律（a_level_physics）→ 电容器与电容（senior_secondary_physics）
- 叠加原理（a_level_physics）→ 多普勒效应（senior_secondary_physics）
- 衍射（a_level_physics）→ 多普勒效应（senior_secondary_physics）
- 双源干涉（a_level_physics）→ 光的偏振与横波性质（senior_secondary_physics）
- 衍射（a_level_physics）→ 光的偏振与横波性质（senior_secondary_physics）
- 变压器（a_level_physics）→ 发电机与电动机能量转化（senior_secondary_physics）
- 气体动理论（a_level_physics）→ 晶体与非晶体（senior_secondary_physics）
- 能级与线光谱（a_level_physics）→ 原子核式结构模型（senior_secondary_physics）
- 能级与线光谱（a_level_physics）→ 原子核组成与核力（senior_secondary_physics）
- 原子核结构（a_level_physics）→ 四种基本相互作用（senior_secondary_physics）
- 光电效应（a_level_physics）→ 实物粒子波动性与量子化（senior_secondary_physics）
- 光子能量（a_level_physics）→ 实物粒子波动性与量子化（senior_secondary_physics）
- 波粒二象性（a_level_physics）→ 实物粒子波动性与量子化（senior_secondary_physics）
- 酶抑制（a_level_biology）→ 干细胞潜能层级（singapore_h2_biology）
- RNA 与 mRNA 结构（a_level_biology）→ DNA 末端复制问题（singapore_h2_biology）
- 转录（a_level_biology）→ 病毒、原核与真核基因组结构比较（singapore_h2_biology）
- 翻译（a_level_biology）→ 病毒、原核与真核基因组结构比较（singapore_h2_biology）
- 基因连锁与交换（a_level_biology）→ 上位性遗传问题求解（singapore_h2_biology）
- 光依赖反应（a_level_biology）→ 细胞信号传导阶段（singapore_h2_biology）
- 氧化磷酸化（a_level_biology）→ 细胞信号传导阶段（singapore_h2_biology）
- 免疫应答（a_level_biology）→ 适应性免疫细胞协同（singapore_h2_biology）
- 抗生素的选择性作用（a_level_biology）→ 基本再生数 R0（singapore_h2_biology）
- 量热法（a_level_chemistry）→ 离子电荷、半径与晶格能（singapore_h2_chemistry）
- 氮和硫（a_level_chemistry）→ 酶催化的专一性与条件敏感性（singapore_h2_chemistry）
- 亲电取代（a_level_chemistry）→ 燃烧污染物与温室效应影响（singapore_h2_chemistry）
- 消去反应（a_level_chemistry）→ SN1 与 SN2 取代的立体化学结果（singapore_h2_chemistry）
- 腈与羟基腈（a_level_chemistry）→ SN1 与 SN2 取代的立体化学结果（singapore_h2_chemistry）
- 胺（a_level_chemistry）→ SN1 与 SN2 取代的立体化学结果（singapore_h2_chemistry）
- 亲核取代（a_level_chemistry）→ CFC、HCFC 与 HFC 的环境影响（singapore_h2_chemistry）
- 缩聚反应（a_level_chemistry）→ 聚合物回收与可持续性权衡（singapore_h2_chemistry）
- 吉布斯自由能（a_level_chemistry）→ 浓度变化下的电极电势趋势（singapore_h2_chemistry）
- 函数图像变换（a_level_mathematics）→ 简单参数方程与平面图像（singapore_h2_mathematics）
- 绝对值函数（a_level_mathematics）→ 简单参数方程与平面图像（singapore_h2_mathematics）
- 函数与反函数（a_level_mathematics）→ 简单参数方程与平面图像（singapore_h2_mathematics）
- 联立方程（a_level_mathematics）→ 一次与二次因式构成的分式不等式（singapore_h2_mathematics）
- 复数根与轨迹（a_level_mathematics）→ 由笛卡尔形式求模与主辐角（singapore_h2_mathematics）
- 正态分布（a_level_mathematics）→ 随机变量线性变换的期望与方差（singapore_h2_mathematics）
- 抽样（a_level_mathematics）→ 单尾与双尾假设检验（singapore_h2_mathematics）
- 正态分布（a_level_mathematics）→ 单尾与双尾假设检验（singapore_h2_mathematics）
- 正态分布（discrete_math_and_probability）→ 随机变量线性变换的期望与方差（singapore_h2_mathematics）
- 正态分布（discrete_math_and_probability）→ 单尾与双尾假设检验（singapore_h2_mathematics）
- 序列与级数（mit_calculus）→ 递推数列（singapore_h2_mathematics）
- 样本相关系数（senior_secondary_mathematics）→ 积矩相关系数解释（singapore_h2_mathematics）
- 样本相关系数（senior_secondary_mathematics）→ 二元数据最小二乘回归（singapore_h2_mathematics）
- 实物粒子波动性与量子化（senior_secondary_physics）→ 波函数概率解释与量子叠加（singapore_h2_physics）
- 放射性同位素应用与射线防护（senior_secondary_physics）→ 核方程与守恒定律（singapore_h2_physics）
- 扩散与渗透（a_level_biology）→ 粒子模型解释热胀冷缩与物态变化（singapore_lower_secondary_science）
- 保护（a_level_biology）→ 非生物因素、适应与群落关系（singapore_lower_secondary_science）
- 木质部与水分运输（a_level_biology）→ 多细胞运输需求与血管交换（singapore_lower_secondary_science）
- 韧皮部与转运（a_level_biology）→ 多细胞运输需求与血管交换（singapore_lower_secondary_science）
- 电势差与EMF（a_level_physics）→ 电流的化学效应与热效应（singapore_lower_secondary_science）
- 电势差与EMF（a_level_physics）→ 电流的磁效应（singapore_lower_secondary_science）
- 电阻与欧姆定律（a_level_physics）→ 电流的磁效应（singapore_lower_secondary_science）
- 受精与早期胚胎发育（senior_secondary_biology）→ 人类生殖结构、受精与遗传（singapore_lower_secondary_science）
- 扩散与布朗运动（senior_secondary_physics）→ 粒子模型解释热胀冷缩与物态变化（singapore_lower_secondary_science）
- 原子核式结构模型（senior_secondary_physics）→ 质子数、原子核质量与元素身份（singapore_lower_secondary_science）
- 直线（a_level_mathematics）→ 含分数形式的一次方程（singapore_secondary_mathematics）
- 二次函数（a_level_mathematics）→ 简单与联立一元一次不等式（singapore_secondary_mathematics）
- 联立方程（a_level_mathematics）→ 因式分解法解二次方程（singapore_secondary_mathematics）
- 联立方程（a_level_mathematics）→ 全等与相似基础（singapore_secondary_mathematics）
- 指数函数（a_level_mathematics）→ 用切线估计曲线斜率（singapore_secondary_mathematics）
- 直线（a_level_mathematics）→ 四分位数、百分位数与离散程度（singapore_secondary_mathematics）
- 平行与垂直直线（a_level_mathematics）→ 四分位数、百分位数与离散程度（singapore_secondary_mathematics）
- 概率法则（a_level_mathematics）→ 简单与联立一元一次不等式（singapore_secondary_mathematics）
- 联立方程（a_level_mathematics）→ 四边形与多边形性质（singapore_secondary_mathematics）
- 二次函数（a_level_mathematics）→ 全等与相似基础（singapore_secondary_mathematics）
- 事件独立性（discrete_math_and_probability）→ 简单与联立一元一次不等式（singapore_secondary_mathematics）
- 几何体表面积与体积（senior_secondary_mathematics）→ 数据收集、分类与制表（singapore_secondary_mathematics）
- 几何体表面积与体积（senior_secondary_mathematics）→ 点图、直方图与茎叶图（singapore_secondary_mathematics）
- Venn 图表达（senior_secondary_mathematics）→ 初等矩阵表示与运算（singapore_secondary_mathematics）
- 集合、元素与表示（senior_secondary_mathematics）→ 初等矩阵表示与运算（singapore_secondary_mathematics）
- 集合关系、全集与空集（senior_secondary_mathematics）→ 初等矩阵表示与运算（singapore_secondary_mathematics）
- 集合基本运算（senior_secondary_mathematics）→ 初等矩阵表示与运算（singapore_secondary_mathematics）
- 从情境建立方程与不等式（singapore_h2_mathematics）→ 角的类型与基本关系（singapore_secondary_mathematics）
- 从情境建立方程与不等式（singapore_h2_mathematics）→ 全等与相似基础（singapore_secondary_mathematics）
- 从情境建立方程与不等式（singapore_h2_mathematics）→ 放缩与比例作图（singapore_secondary_mathematics）
- 从情境建立方程与不等式（singapore_h2_mathematics）→ 四边形与多边形性质（singapore_secondary_mathematics）
- 从情境建立方程与不等式（singapore_h2_mathematics）→ 一次式与二次式因式分解（singapore_secondary_mathematics）

</details>

## 6. 课程框架、映射、缺口与决议

- SEAB 物理/化学/生物：按大纲逐条解析 outcome 字母并与框架编码比对，除物理 18(h) 外完全一致（物理 204、化学 194、生物 101 条内容 outcome）。
- 中国 4 科：框架要求编号全部能在 2025 版中找到对应内容要求；涉及 2025 措辞变化的要求已同步摘要或证据。
- 映射：约 1,450 条逐条阅读，未发现错误的“完全覆盖”声明；修正 3 处（见第 3 节）。
- 观察（不阻断批准）：部分新加坡中学数学条目映射到 H2 预科概念（“从情境建立方程与不等式”）或大学 AI 课程“概率基础”，部分 H2 数学/中国数学回归条目映射到大学“机器学习·线性回归”，属于层级错配；部分新加坡条目映射到中国图概念（统一 canonical 设计下可接受）。

## 7. 教学法

- 48 个档案、96 条误区候选、96 个探针：数学/物理/化学/生物答案逐条验算无误。
- 实证文献核实：PLOS ONE 2017（病毒被描述为原核/真核细胞）✔；NIE 2005（约去 log 的错误）✔；剑桥 9709 2024 年 6 月考官报告第 20 页“ln(x−5)=ln x−ln 5”✔；PRPER 2026（山东、贵州、新疆 496 名学生，M14“摩擦力总是阻碍运动”，194 名 A2 未掌握者）✔；RSC CERP 2016（新加坡九年级酸碱迷思，4 层诊断）文献存在，但本次网络 403，**未能核对 AC11 与 10.87%**。

## 8. 需要你决定的事项

- RSC 2016（新加坡九年级酸碱迷思）文献已确认存在，但本次网络无法取得全文核对 AC11 与 10.87% 的具体数字。
- 新加坡 H2 生物有 4 个主题把不相关概念打包（见 graphs.singapore_h2_biology.topic_coherence_zh）。
- 新加坡中学数学 G3/G2 中“从情境建立方程”映射到 H2 概念、“概率基础”映射到大学 AI 课程概念，存在层级错配。

## 9. 批准后执行

```bash
node apps/web/scripts/apply-cn-sg-review-2026-10.mjs --approve --owner-approved --reviewed-at=<批准时间> --apply
pnpm --filter @primoria/web validate:kg
pnpm --filter @primoria/web build:topic-graph all
pnpm generate:learning-goal-routing && pnpm test:learning-goal-routing
pnpm --filter @primoria/web test
```

同时更新：治理测试中的状态与边数断言、`kg-review-status-gate` 测试（改用夹具，因为不再有 needs_review 图）、`docs/knowledge-graph/catalog.md`、根 README、CLAUDE.md 与产品文档中“10 张图仍为 needs_review”的表述，以及生成新的批准记录 `review/approved/cn-sg-2026-10/`。共享数据库与 embeddings 不在本次范围。

## 10. 追加：主题重组与同层级新概念（所有者已过目并批准）

- H2 生物原有 4 个主题把不相关概念打包；按生物学主题重新归组并新增 2 个主题（校验规则要求每个主题 2–3 个概念），原主题 ID 保持不变以保证稳定引用。新加坡中学数学因新增同层级概念新增“从情境建立方程”“概率”两个主题。
- 原映射把中学/高中层级要求映射到 H2 预科概念、大学 AI 课程“概率基础”或大学“机器学习·线性回归”，层级错配会把高层级内容带入低层级课程；新增同层级最小可诊断概念替代。
- 学习目标路由夹具重新生成为 1,726 条（≥1,718 下限），所有 gold 策略标签不变，只有起始主题 ID 随结构更新；所有保留的先修边仍与作者排序同向。

### 新加坡 H2 生物（16 个主题）

- 1. 细胞生命与基因组边界：细胞学说、病毒与生命边界、病毒、原核与真核基因组结构比较
- 2. 干细胞潜能与功能：干细胞潜能层级、干细胞的正常生理功能
- 3. 微生物基因组继承与变异：病毒繁殖周期与基因组继承、抗原漂移与抗原转变、原核生物水平基因转移
- 4. 真核基因组维持与表达调控：DNA 末端复制问题、功能性非编码基因组元件、真核基因表达的多层调控
- 5. 分子检测技术与遗传筛查伦理：Southern 印迹与核酸杂交、母体遗传筛查伦理
- 6. 细胞周期调控与癌变：细胞周期失调与癌变风险、原癌基因与抑癌基因、癌症的多步骤进展
- 7. 上位性与环境对表型的影响：上位性遗传问题求解、基因型、环境与表型
- 8. 细胞信号传导阶段与第二信使：细胞信号传导阶段、第二信使
- 9. 激酶级联与血糖受体通路：信号传导中的激酶与磷酸酶、胰岛素与胰高血糖素受体通路
- 10. 种群遗传变异与进化尺度：有害隐性等位基因的保留、微观进化与宏观进化的联系
- 11. 进化证据、物种与系统发育：进化的综合证据、生物学物种概念及局限、系统发育与分子分类
- 12. 适应性免疫与疫苗：适应性免疫细胞协同、抗体多样性的形成机制、疫苗的群体控制与权衡
- 13. 病毒致病与流行病学：病毒对宿主组织的致病机制、基本再生数 R0、暴发、流行与大流行
- 14. 气候强迫与碳足迹：二氧化碳与甲烷累积的人为驱动、气候系统与生态影响、人为活动碳足迹比较
- 15. 气候缓解、粮食与生物多样性：红树林的气候缓解作用、气候压力与可持续食物供应、热带生物多样性的医药与粮食资源价值
- 16. 生态重新分布与疾病媒介：气候驱动的生态重新分布、温度对昆虫媒介生命周期的影响、变暖驱动的蚊媒疾病范围变化

### 新加坡中学数学新增/调整的主题

- 11. 从情境建立方程：从情境建立一次方程与方程组、从情境建立一元二次方程
- 19. 累积频数、箱线图与离散比较：累积频数图与箱线图、计算标准差并比较数据集
- 20. 概率：单一事件概率、复合事件概率表示

### 新增概念

- **从情境建立一次方程与方程组**（`singapore_secondary_mathematics:sg_sec_math_formulate_linear_equations`）：Choosing unknowns in a problem situation to form a one-variable linear equation or a pair of linear equations, then solving, checking and interpreting the solution in context. 证据：PDF p.18, g3 sec1, Formulating a linear equation；PDF p.19, g3 sec2, Formulating a pair of linear equations；PDF p.28, g2 sec1, Formulating a linear equation；PDF p.29, g2 sec2, Formulating linear equations and systems；PDF §5.2 Linear Equations in One Variable with Applications, printed pp.346-355; §5.9 Systems of Linear Equations in Two Variables, printed pp.473-489
- **从情境建立一元二次方程**（`singapore_secondary_mathematics:sg_sec_math_formulate_quadratic_equations`）：Forming a quadratic equation from a problem situation, solving it and rejecting roots that violate the contextual constraints before interpreting the valid solution. 证据：PDF p.21, g3 sec3 4, Formulating a quadratic equation；PDF p.31, g2 sec3 4, Formulating a quadratic equation；PDF §5.6 Quadratic Equations in One Variable with Applications, printed pp.403-426
- **单一事件概率**（`singapore_secondary_mathematics:sg_sec_math_single_event_probability`）：Treating probability as a measure of chance between 0 and 1, listing equally likely outcomes of a simple experiment and calculating the probability of a single event. 证据：PDF p.20, g3 sec2, Probability of single events；PDF p.30, g2 sec2, Probability of single events；PDF §7.5 Basic Concepts of Probability, printed pp.751-762
- **一元线性回归模型与最小二乘**（`senior_secondary_mathematics:cn_sh_math_linear_regression_least_squares`）：理解一元线性回归模型及参数的统计意义，用最小二乘原理估计回归系数并解释拟合直线。 证据：数学课程标准PDF p.50-51（正文p.47-48），选择性必修主题三·3‘统计’；PDF §12.3 The Regression Equation, pp.623-630

### 新增先修边

- 把简单情境表示为代数式 → 从情境建立一次方程与方程组（soft）：从情境建立方程前需要先能把数量关系翻译为代数式。
- 整数系数一元一次方程 → 从情境建立一次方程与方程组（soft）：建立方程后需要求解并检验，依赖一元一次方程的解法。
- 从情境建立一次方程与方程组 → 从情境建立一元二次方程（soft）：建立一元二次方程沿用从情境选未知量、写等量关系并检验解的建模步骤。
- 因式分解法解二次方程 → 从情境建立一元二次方程（soft）：建立二次方程后需要求根并按情境取舍，依赖二次方程的解法。
- 单一事件概率 → 复合事件概率表示（hard）：复合事件概率在可能性图或树状图中枚举结果，前提是会计算单一事件的概率。
- 一元线性回归模型与最小二乘 → 回归预测及其限制（hard）：用回归方程进行预测并讨论外推限制，前提是能用最小二乘建立一元线性回归模型。

### 映射替换

- 新加坡中学数学：G3/G2 的“从情境建立一元一次方程/方程组/一元二次方程”由 H2 概念改为新的同层级概念（方程组条目保留 A-Level“联立方程”）；“单一事件概率”由大学 AI“概率基础”+ H2 概念改为新概念。
- 中国数学：选择性必修主题三.16/.17 由大学“机器学习·线性回归”改为新概念“一元线性回归模型与最小二乘”；H2 数学 6.6.03 去掉“机器学习·线性回归”，只保留 H2“二元数据最小二乘回归”。
- 相应缺口/决议记录同步：新增 4 条新加坡缺口与决议，中国“一元线性回归”决议由复用改为新增。
