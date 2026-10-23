# Agent B 交接记录

2026-10-22：已读取并接受 Agent A 的 `visualization-interface-contract.md` v1。沿用 `ImplementedComponent`、Zod config/patch 和 `{ config, onChange }`，不修改 contracts、registry、widget map、课程接入及全局脚本。

全站盘点已确认 8 个学科入口：物理、化学、生物、数学、语文、地理、自然科学、小学奥数。参考快照尚未冻结；目录可见不代表案例运行和能力已经验证。

Agent B 正在编写独立组件模块和共享场景绘制 primitives。新组件批次通过本文件交接，A 注册前不宣称生产路径已经可调用。活动 Catalog 条目由 B 编辑，生成的紧凑索引交由 A 生成。

## 浏览器边界

参考站点使用内置浏览器独立标签页，不操作 Supabase 标签。开发应用连接和模型配置不变。全部源码参考仅用于技术研究，生产场景独立编写。

## 批次 001：6 个组件可注册

精确模块路径、导出名、配置版本、4 组有效样例见 `data/visualization-components/batches/agent-b-001.json`。新增组件：

- `math.calculus-lab` — 割线/切线/有向积分；绝对值尖点和零差商有明确状态。
- `physics.refraction-lab` — Snell/Fresnel、临界角、全反射、s/p 偏振。
- `physics.projectile-lab` — 平抛/斜抛、线性阻力、速度分解；物理高度参数名为 `launchHeight`。
- `physics.circuit-lab` — 双电阻串并联、分压分流、功率与断路。
- `astronomy.moon-phases` — 八大月相、日地月位置与南北观测朝向。
- `biology.mendelian-genetics` — 单基因杂交、配子、显性关系与理论概率。

共享绘制模块：`interactive/primitives/scene-frame.tsx`。`WidgetShell` 的内部 ID 改为 `data-component-id`，不再显示给学习者，现有调用接口不变。

已运行 `pnpm --filter @primoria/web exec vitest run tests/visualization-science-batch-one.spec.ts`：34 项通过，覆盖独立公式预期、边界、严格配置与 SSR。尚未完成浏览器视觉验收，未计入参考能力的 verified 覆盖。

A 待办：登记 registry/widget map、生成紧凑目录、更新旧 Catalog 默认值同步测试的固定 19 项清单。Catalog 中的 implemented 表示代码实现已交付；生产注册和浏览器验收状态分别保存在批次文件，不据此宣称全量上线。不要在未完成上述登记时运行真实模型并把“未知组件”记为能力失败。

## 批次 002：再交付 6 个组件

精确路径/导出/默认、变化、边界、多模式样例见 `data/visualization-components/batches/agent-b-002.json`：

- `math.fraction-equivalence` — 等值扩分、约分、假分数、多整体面积与数轴。
- `math.chicken-rabbit` — 头脚约束、假设法、方程和无解状态。
- `geography.earth-seasons` — 倾角、纬度、太阳高度、昼长与极昼极夜；圆轨道近似。
- `chem.ideal-gas` — PV=nRT、等温/等容曲线与分子方均根速率。
- `chem.reaction-kinetics` — 零/一/二级积分速率、半衰期和 Arrhenius 温度依赖。
- `physics.oscillation-lab` — 弹簧与非线性单摆、周期与动势能交换。

共享 `primitives/scene-playback.tsx` 已用于抛射与振动。播放状态不逐帧回写 config；暂停保留当前位置，重置回到捕获配置，离屏/后台取消 RAF，卸载清理 Observer/监听器，尊重减少动态效果偏好。动画只应用一次时间增量。

三份 B 测试合计 73 项通过：`visualization-science-batch-one.spec.ts`、`visualization-science-batch-two.spec.ts`、`visualization-scene-playback.spec.ts`。首批浏览器已验证 cubic 在 Δx=0.02 时差商 0.0604，以及玻璃→空气60°全反射的 100% 反射率；不等于所有模式/宽度已验收。

## 批次 003：3 个组件可注册

`data/visualization-components/batches/agent-b-003.json` 已交付模块/导出/版本/有效样例与 Catalog 条目：`math.trigonometry-circle`（三角函数与奇点）、`chem.chemical-equilibrium`（A⇌B 一级可逆反应）、`chem.molecular-geometry`（7种典型分子、孤电子对、键角和本地旋转）。相邻能力边界已写入 search.excludes，不宣称覆盖多反应物平衡或量子轨道。

已按 A 反馈移除旧 lens-imaging 自绘头部的可见内部 ID，保留 `data-component-id`。局部 TypeScript 检查退出0；最终全套检查仍由 A 串行收口。第三批31项测试通过。

## 批次 004：4 个组件可注册

`data/visualization-components/batches/agent-b-004.json`：`physics.lever-balance`、`physics.buoyancy-lab`、`physics.electric-field`、`math.binomial-distribution`。前两项的模块和 widget 均在 `lever-buoyancy` 文件中，导出名不同，不能只凭文件名推断 ID。

已交付共19个新组件（原19项 + 新19项 = Catalog 38项）。5份场景/播放测试共125项通过。极小正阻力数值稳定性、场源奇点、极点昼长、正切奇点、无解头脚、零/一概率等边界均有独立预期或不变量检查。未宣称参考全量覆盖。

本地场景检查页：`artifacts/visualization-agent-b/quality-review/index.html`，使用独立打包的生产组件，默认/变化/边界/其他模式共76组配置，并可切换中英文。它是B的局部QA页，不是20条真实Prompt验收页。

当前检查服务：`http://127.0.0.1:4189/quality-review/`。页面与引用资源无需模型、数据库或第三方CDN。生产Widget映射、懒加载和索引生成仍归A。

## 批次 005：4 个组件待解除 Catalog 短暂冻结后注册

已遵守 A 的 38 项平台实测短暂冻结，**没有改动活动 Catalog**。模块、完整样例、导出名见 `data/visualization-components/batches/agent-b-005.json`；候选 Catalog 条目单独存放于 `agent-b-005.catalog.json`，由 B 在 A 实测完成后合并，A 再登记 registry/widget map 并生成索引。

- `biology.cell-division`：有丝/减数分裂关键阶段、按着丝粒计数、DNA 含量；有丝后期的暂时染色体加倍不误称为稳定四倍体。
- `biology.osmosis-lab`：只通水、等静水压可变容积模型，溶质各侧守恒；单侧纯水末态明确为耗尽极限，不伪称普通浓度平衡。
- `physics.magnetic-motion`：电子/质子匀强磁场解析圆周/螺旋线，平行入射直线与洛伦兹力方向。
- `physics.photoelectric-effect`：精确能量方程、阈值与遏止电压；电流曲线明确标注简化收集假设。

本地 QA 页已包含23个新组件、92组配置，仍不等于20条真实 Prompt 或参考全量覆盖。第五批测试的初次边界检查发现平行运动产生负零，已规范零速度分量；复测19项通过。当前6份场景/播放测试合计144项通过。

## 参考盘点状态（续）

`reference-inventory.v1.json` 已写入 1,018 个候选条目/2,275 个来源教学要点，覆盖8门学科。快照尚未冻结，所有案例运行能力维持 unverified，覆盖文件不伪造已验证映射。自然科学 UI=71/公开课程=82、数学 UI=100+107/公开课程=214，差异正在核实。化学10个主入口及嵌套模型仍需继续浏览核对，当前分母是发现下限，不是全站最终总量。


## 2026-10-22 布局与交互复核

23个新组件×4组配置×中英两语言×390/768/1440三宽度，共552个DOM布局状态通过；另逐个操作23个真实控件，读数/图形均更新。播放/暂停/重置以及分子旋转恢复也已在浏览器观察。日志与截图见 `artifacts/visualization-agent-b/quality-review/evidence/`，哈希见 `verification.json`。

检查实际修复了手机刻度裁切、轴标题重叠、英文棋盘格文字重叠和液面标注裁切。SliderRow增加稳定的可访问名称与单位读法；CartesianPlot为离散二项分布提供整数横轴刻度。局部ESLint源文件检查0错误，测试目录被仓库lint策略忽略，测试由Vitest验证。

**提醒A：活动Catalog仍38项，但B的生产绘图源码已因这些实际布局问题修正。平台回放若在修复前导出，需要按源码指纹重新导出；本记录不宣称A的最终回归/20条真实模型验收已通过。**


## 批次006与007：既有组件修复和两项数学场景

006是既有组件 refinement：文本细读直接展示当前维度全部解释、论证图窄屏纵排、时间线窄屏改为纵向并修正详情列宽。原19项补齐只读 `data-component-id`，不改变配置/版本/目录条目。选定配置×中英×三宽度共456项布局测量通过；文本细读3项测试通过。证据见 `artifacts/visualization-agent-b/existing-library-review/`，不把这4组样例说成原19项全部模式已覆盖。

007新增 `math.linear-system` 与 `math.quadratic-equation`，组件/样例见 `agent-b-007.json`，候选条目在 `agent-b-007.catalog.json`。和005一样未修改活动Catalog，待A解除短暂冻结后由B合并、A注册。16项数学边界/不变量/SSR检查通过，覆盖解集退化、十进制格点判秩、Vieta关系、复根和一次退化。极小非格点系数被严格拒绝，避免校验通过后计算舍入成零。

参考目录差异已逐题核对：初中数学107来源/100可见，差7条；自然科学82来源/71可见，差11条。保留18条来源候选并记录可见状态，没有缩减全量范围。完整盘点说明已写入 `docs/visualization-reference-inventory.md`；快照仍未冻结。


## 批次008与当前收口记录

新增 `chem.weak-acid-buffer`：单元弱酸/共轭盐、固定体积酸碱扰动、含水自解离的物料/电荷守恒、局部缓冲容量。初次测试找到强碱环境下微量HA相减的消减误差，已改为稳定解析比例；8项边界/守恒/独立导数验证通过。`agent-b-008.json` 与 `.catalog.json` 同样待解除冻结后合入。

二次方程增加 `domain=real|complex`，默认实数范围，避免默认向初中案例强行输出复数；复数探索显式选择。007当前17项测试通过，交接样例与候选Catalog已重新生成，未改变活动目录。

**当前B局部检查：9个测试文件172项全部通过；26新组件×4样例×中英×3宽度=624个布局状态；26个实际控件操作均更新读数或图形。** 原19项的选定配置另有456个布局状态。原19项不是逐模式全部已验收，不与新组件计数重复相加宣称全量。

可重建检查页：`node artifacts/visualization-agent-b/build-review.mjs`；服务 `http://127.0.0.1:4189/quality-review/`；新场景104组配置。验证摘要和哈希见该目录 `verification.json`。静态检查页不调用模型，不替代A的20条真实Prompt。

活动目录保持38项：已注册的新组件19项，005/007/008待注册合计7项。A完成此次38项基线后，请先由B合并3份候选条目，再由A统一登记7项registry/widget map并重建共享索引；不要把B测试页能显示当作生产注册已经通过。B修复绘图源码后，A旧回放导出应按源码指纹重新生成。

## 20:55 拖拽生命周期与后续批次

拖拽生命周期测试已改为仓库既有 React `act` + ReactDOM `createRoot`，不依赖 Testing Library；5项通过，覆盖模型变更时镜头稳定、适配/缩放、无效倍率、异指针取消和活动控件卸载释放。A若已增加Testing Library依赖，此变更无需其依赖即可运行。

009新增 `math.parabola-intersections`，包括水平求交、斜线联立、拱桥水位；配置/候选目录见同名批次文件。10项测试通过，真实参考例的水平根距与斜弦长度分别计算。009仍未生产注册，不改变38项目录冻结。B继续补ρL/A与含电源内阻闭合电路的独立组件。

## 批次010：电阻定律与含内阻闭合电路

`agent-b-010.json`及`.catalog.json`交付 `physics.wire-resistance`、`physics.closed-circuit`。前者严格区分截面积与直径、μΩ·m与mm²单位换算，温度为外部给定的线性修正；后者包括E/(R+r)、路端电压、断路/短路、U-I特性、功率分配与R=r最大功率匹配，明确50%效率不等于最高效率。零内阻理想短路显示无有限稳态解，不伪造0A。

010新增15项测试通过；B当前13份测试208项通过，局部tsc退出0、源文件ESLint通过。29个新组件×4样例×两语言×三宽度=696个布局状态通过，29个实际控件均联动。手机实际顶点拖拽目标误差0.49px，生命周期释放检查通过。证据见`quality-review/evidence/`。新修复包括最多约定数量的简洁坐标刻度，以及按步长保留小数精度的SliderRow。

**活动目录仍保留38项；待注册005/007/008/009/010共10个组件。** 请A解除冻结时一并纳入009和010，不仅此前的7项。待注册不等于生产Tutor可调用；静态QA页不等于20条真实Prompt验收。共享绘图源码已再次修复，A的封存回放应按新源码指纹重新导出。

参考证据：物理电路预览可见，进入实验被订阅页拦截，已在inventory标blocked。判别式课件按实际5模式及扫描/拖拽/缩放/挑战拆成子能力，当前1018案例/2289能力；正式覆盖表维持未验证，校验结构errors=[]而complete=false。未注册组件的9条候选映射另存`batches/agent-b-reference-candidates.v1.json`，不冒充正式verified覆盖。

## 批次011与当前状态校正

已读取A最新交接，确认005/007/008的7项已经集成，当前活动Catalog实读**45项**，此前本记录的38项/10项待注册是当时状态。B不重复合入这7项；009/010/011保持独立候选片段，当前待注册**4项**：抛物线求交、导线电阻、含内阻闭合电路、诗词意象。

011为`chinese.poetry-imagery`：三首内置公版作品《天净沙·秋思》《登鹳雀楼》《静夜思》，分别绘制原创诗景，词语与图形/观察/表达效果联动，证据模式直接展示全部解读，归类与词语补全在本地运行。没有音频朗读、没有任意文本生成，不宣称整套语文参考课件已覆盖。10项测试通过；三首×四模式×两语言×三宽另有72项布局检查；键盘选图、错误归类和订正已实际操作。

本轮最终B检查：**14个B测试文件218项通过，加参考契约3项，合计15文件221项通过**。tsc退出0、B源文件ESLint通过。新30组件/120配置/两语言/三宽度共720个布局状态通过，30项实际控件操作有联动；原19项4组样例另456状态通过。原19项依然不是全部 authored modes 已验收。检查页和既有组件页均可用`node artifacts/visualization-agent-b/build-review.mjs`重建。

待注册009/010/011四个条目已补齐双语能力边界、参数含义与单位、相邻场景选择提示和已发现reference IDs；这些关联只是来源候选，不能当成verified覆盖。A复制片段集成后需重建紧凑索引，并以新源码/目录指纹重新跑平台验收。本记录不将A的45项平台回归当作49项回归通过。

候选预检命令：`pnpm --filter @primoria/web exec tsx ../../artifacts/visualization-agent-b/verify-pending-batches.mjs`，以JSON Schema 2020和实际Zod导出同时验证45+4候选目录、四项默认值和16个完整样例，通过。011同时声明language/literature/chinese标签，适配共享检索中“语文→language”的硬筛选。仅在目录加chinese会被该筛选排除，已在交接前修正。

参考诗词已补录原文、意象证据、归类、默写、媒体、播放方式和训练栏目的实际观察层级，当前能力总数**2296**，正式verified仍为0。候选映射13条，未冒充全量覆盖；音频、连续/引导播放及完整训练流程仍列为未覆盖。
