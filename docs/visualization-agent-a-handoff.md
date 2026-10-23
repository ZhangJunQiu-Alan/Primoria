# Agent A 进展与交接

2026-10-22：正在编码；不得据本文认定全量覆盖或完整工程验收已经通过。

已建立 `visualization-interface-contract.md`，已读到 B 的接口确认。B 的场景模块、绘图 primitives 和 Catalog 条目继续由 B 编辑；A 不覆盖这些路径。

A 已写入：活动 JSON Catalog 的共享索引生成/校验、只读语义检索工具、组件懒加载、课程 `engine: interactive` 分支与参数校验、聊天配置持久化/乐观锁、聊天工具信号保存恢复、分享快照兼容、静态回放导出器。

基础针对性检查 35 项已通过；此前一次 Web 全套单元测试 638 项通过、18 项跳过。后续新增历史恢复/分享测试和迁移正在完整回归中，这些旧数字不代表当前最终基线通过。

## 给 B 的批次交接要求

- 已看到 calculus/projectile/refraction 模块，但尚未看到正式批次的 Catalog 条目/完整样例与检查结果；A 暂不提前注册为生产可调用。
- 请在 B 的交接记录中列明“可集成批次”、组件与 widget 导出名、版本、Catalog 条目完成情况、默认/变化/边界/模式样例及实际测试结果。A 读到后负责 registry/widget map 和紧凑索引生成。
- 参考清单按接口约定写入；如果需要额外字段，保留约定的必需字段。全站快照未冻结前，20 条测试仅可标为平台基线，不能报告全量验收通过。
- `.next` 构建、typegen 和完整 DB/browser 回归由 A 协调。B 可运行场景局部 Vitest；请勿并发启动完整构建或改动全局依赖。

## 当前回放验证

样例导出目录 `/tmp/primoria-visualization-a-gallery`，静态服务 `http://127.0.0.1:4178/`。这是现有组件默认样例，不是 20 条真实 Prompt 的最终交付。

2026-10-22 批次 001 已登记 6 个组件到 registry/widget lazy map，重建 Catalog 后共 25 项。批次计算、默认配置和 SSR/注册同步检查共 65 项通过。A 的完整回归正在运行，后续以最终日志为准。

浏览器发现：旧 `interactive/lens-imaging.tsx` 自行绘制头部，仍向学习者显示 `physics.lens-imaging`；共享 WidgetShell 的修改无法覆盖它。请 B 在其场景文件中移除这处可见内部 ID，并保留 `data-component-id` 供生产集成和回放检查使用。A 不直接竞争编辑 B 的场景文件。

批次 002 的 6 项也已登记，共 31 项。该批次与索引/配置/控件相关检查合计 96 项通过。25 项基线的静态回放已通过 390/768/1440 三种宽度，未产生 API 请求；31 项回放仍需重新跑。

全量发现清单目前 1,018 个候选案例、2,275 个来源要点，未冻结；A 保留 coverage gate 失败状态，不把默认样例算作参考能力 verified。后续正式 20 条输入仍依赖冻结、核实后的全量能力。

回归调度调整：限制 Vitest worker/并发数，DB 与 browser 层串行运行，避免本机冷编译与 DB fixture 清理互相争用资源。未提高产品 Mermaid 超时、未跳过测试或降低断言。完整收口以 `/tmp/primoria-viz-a-regression5.log` 为当前运行日志，未结束前不能宣称通过。

批次 003 已登记，当前 34 项；注册/索引/第三批/SSR 检查 77 项通过。课程 trusted visual 编辑新增保持 component/version 的硬校验，4 项针对性测试通过。构建+bundle gate 已通过；隔离 DB 层已全部通过；browser 层仍串行运行中。当前本机仅 8GB RAM，冷编译期间已出现明显换页，请 B 暂缓并发完整 Vitest（允许继续编码/参考发现），待 A 交接浏览器回归结束后再收口本地测试。

批次 004 已登记，准备在38项 Catalog 上冻结并执行平台基线实测。请 B 暂时保持活动 Catalog 条目/metadata 不变，后续新批次可写独立模块/待入库片段；待 A 记录本次实测完成后再合入活动 Catalog。此短暂索引冻结不是参考站点快照冻结，也不计全量通过。

2026-10-22 平台基线已冻结在38项 Catalog（hash 7e08432e…），首个真实案例为串并联电路。首次发现 Supabase session pool 15连接限制被 Agent 两个隐式池耗尽；现已给 run-store/checkpointer 限流并将选中云端每进程池设为1，隔离 Agent DB/HTTP 回归通过。第二次实际页面正确，但 Playwright捕获的中文乱码；已给 Web SSE 声明UTF-8，保留两次失败记录并补充原文一致性检查。38项×3宽度的静态回放检查通过。完整回归9正在串行执行，日志 /tmp/primoria-viz-a-regression9.log。基线20条仍未跑完，不计全量验收。

2026-10-22 追加：完整回归10的快速/构建/隔离DB层通过，Web 815 passed、18 skipped，四条生产业务浏览器旅程通过；sandbox widget E2E未通过，故整套不计通过。随后确定并修复iframe初始空白页load抢先触发的问题：改为source+channel验证的shell-ready握手，新增测试先复现失败、修复后通过，原widget E2E全部断言复测通过（`/tmp/primoria-viz-a-widget-handshake.log`）。

真实20条仍使用冻结v2输入，原有失败不删改。已修复中文组合学科过滤误判、配置校验一次有界修复、失败预算释放、最小patch约束、Web配置原文由Agent运行状态读取（ToolNode实测保持空格）。配置调用禁用DeepSeek thinking，继续保留Flash/Pro分层；42项针对性测试通过。课程规划器现提前读取最多4项模板能力/限制，保持KG概念覆盖与scope；不以强制模板覆盖不支持的教学机制。最新快速回归见`/tmp/primoria-viz-a-fast12.log`，运行结束前不计通过。

课程17已真实生成，但四个visual均为库外HTML，按预期模板要求判失败；课程18因物理/化学目标重叠而澄清，没有创建课程。第8条没有提供待分析句子，模型正确追问，仍按冻结的可视化输出要求记录失败。不得修改这批输入或放宽断言补成成功。课程持久化旁路快照保存在本次artifact目录，清理合成账号前保存，禁止将旁路证据说成原runner已完整采集。

最新复测：四条连续调整均已实际通过。对现有场景具体状态的假设问题会演示调整，同时不把一般概念问答强制改成可视化。住房补贴定量模型确实超出现有policy-tradeoff能力边界，保留实际sandbox输出并继续判模板命中失败；回放已增加无外部依赖HTML的隔离离线展示，禁止模型/API网络连接。

课程17第二次真实生成的持久化检查点已出现可信组件：功率分配采用`physics.circuit-lab`；ρL/A、电源内阻以及含内阻的综合挑战尊重排除项、使用HTML。完整课程仍在保存前的生成流程中，不能只凭batch checkpoint宣称课程验收通过。B可优先评估参考站对应的“电阻定律/电池内阻/闭合电路”能力缺口，不要将这些能力算入现有理想串并联组件的覆盖。

最新快速回归12（Web852 passed、18 skipped）、独立生产构建+bundle gate、隔离DB12、完整browser12均已通过。browser12包括四条生产业务旅程、widget沙箱及38项×3宽度的离线回放。日志位于`/tmp/primoria-viz-a-{fast,build,db,browser}12.log`。追加的离线fallback/配置严格修复/iframe握手7项测试通过；最新Web/Agent typecheck与Web lint通过。全量参考覆盖和20条全部产出预期模板仍未通过。

20:50追加：课程写入改为保留显式模型/Pro与Flash分层、使用非thinking结构化调用后，真实lesson在38,245ms完成保存；两个visual为`physics.circuit-lab`，其余不支持的机制保留HTML。前次thinking调用产生截断JSON并耗尽多次修复，记录未删除。JSON提取现在拒绝不完整外层中的内部对象；prompt/compiler checkpoint版本随Catalog hash更新，避免重用旧计划/批次。

B新增拖拽生命周期测试引用`@testing-library/react`但原package未声明；A已补devDependency和lockfile。fast14其余881项通过，但缺依赖suite失败，整体不能计通过；fast15正在重跑。B无需重复安装该依赖。暂保持38项活动目录，等当前实际课程页导航验收与独立回放包封存后，解除Catalog冻结并接入005/007/008七项。

20:57解除活动Catalog冻结：已封存38项实测回放于`artifacts/visualization-acceptance/platform-baseline-20261022/replay-catalog38/`，最新16/20命中预期，课程17和19均实际生成/保存/导航至可信visual通过。原输入与全部重试保留；8缺句子、10定量政策超范围、18追问、20定位fallback仍失败。正式全量门槛未通过。

**005/007/008已由A集成，不要重复合入候选条目。** A直接复制B已编写的`.catalog.json`条目，未改动其语义，登记7项registry/widget map并重建共享索引；活动目录45项。B具体场景/组件源码仍归B。下一轮为45项构建/全回归；38项历史证据保持原Catalog hash，不能用新hash冒充重新测试。待新批次继续走独立交接片段，无需维持38冻结。

20:59：已看到B将drag lifecycle测试切回原生React/ReactDOM，A同步移除不再使用的Testing Library依赖，避免留下无用包。当前全回归16暂以45项目录为基线，009及后续继续交付独立片段；本轮不并发改动活动条目，待45项回归/实测收口再按批次集成。


最终45项平台回归16已退出0：Web901 passed、18 skipped；Agent/typecheck/lint、1718路由、31KG、构建/bundle、隔离DB、四条生产浏览器旅程、widget沙箱、45项×三宽离线检查均通过。后续针对性21项通过；当前45项目录的弱酸缓冲/二次方程两个真实调用均走检索→打开组件并通过。固定20输入保持16/20，4失败与全部重试保留。

稳定工程报告与日志哈希已保存到`artifacts/visualization-acceptance/platform-baseline-20261022/verification.json`；验收入口`http://127.0.0.1:4179/`，当前平台报告`docs/visualization-agent-a-validation.md`。正式全量来源清单/能力映射和完整usage关联仍未通过；009及后续不在45项基线内。本轮45项冻结检查结束，可按既定独立批次继续交接；A后续再统一集成，勿重复注册005/007/008。


人工验收清单交付：已核对B批次011最终交接，当前仍45生产注册+4待集成（009/010/011），来源清单更新为1018案例/2296能力。B资源哈希核对通过；A执行候选预检，45+4目录及16样例通过，不将其说成生产注册。总人工清单位于`docs/visualization-human-acceptance-checklist.md`及`http://127.0.0.1:4179/human-acceptance.html`，7组103项；人工结果初始全部待验收。浏览器已验证记录/备注刷新持久化，并恢复自检输入为空。最终49项集成/最新源码回归/覆盖等仍是明确待办。
