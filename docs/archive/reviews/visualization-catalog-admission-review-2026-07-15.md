# 交互组件入库审核报告

状态：2026-07-15 入库证据，已归档。测试数量、延迟和路径记录保留历史语境。

审核对象:《Primoria全学科交互可视化Catalog工作报告》交付的 19 个声明式组件。
审核标准:审核当时版本的 `docs/交互组件规范.md` 第 10 节；[现行门禁](../../交互组件规范.md)见该规范第 9 节。
审核日期:2026-07-15。

本文保留入库时的审核证据。组件已迁入生产目录并接入主 Tutor；最新路径和
运行约束以 [`docs/交互组件规范.md`](../../交互组件规范.md) 为准，后续事项关闭情况见第 7 节。

## 结论

**19 个组件全部入库。** 其中 7 处返修级问题由审核方直接代修完成(清单见第 3 节),修复后所有验证重新跑绿。

| 检查 | 结果 |
|---|---|
| 一票否决项(z.any/视觉字段/未批准依赖/渲染层计算/网络/DB/innerHTML) | 全部未触发 |
| G1 契约(教学字段、有界、有默认、patch 可独立修改) | 通过 |
| G2 计算(纯函数、无随机、奇点显式处理、数值与规范一致) | 通过 |
| G3 渲染(参数域无溢出、交互写回 config、调色板、a11y、动画清理) | 修复 2 处后通过 |
| G4 文档(schemaDoc 逐项一致、patchHints ≥2) | 修复 14 处后通过 |
| G5 实测(真实 LLM create/adjust) | 12 条全部正确 |

## 1. 审核范围与证据

- 组件模块 19 个:现位于 `apps/web/src/lib/interactive/components/*.ts`。
- 19 个 Widget 实现现位于 `apps/web/src/components/generative-ui/interactive/`，并共享 Widget Map、primitives 与 palette。
- 生产共享文件包括 `configure.ts`、`registry.ts`、`interactive-component/route.ts` 和 `InteractiveComponentCard`。
- Catalog:`data/visualization-components/catalog.v1.json` 结构完整(双语、JSON Schema、patchHints、降级条件),校验器含视觉字段黑名单 ✓。
- 元测试质量高:registry↔WIDGETS 一一对应、19 个组件默认 config 可 SSR 渲染、catalog 默认值与 Zod 默认值同步。
- 规范 §9 数值断言全部在测:滴定 4 个 pH 点、波相长/相消、冒泡/选择精确 trace、函数变换点值。

`batch-visual-mode` 路由/页面为独立 QA 能力，不是生产 Catalog 主链路。

## 2. 抽查亮点(维持原样)

- 滴定 pH、排序 trace、波叠加、函数变换的纯函数数值全部与规范一致(等当点浮点容差、sqrt 域外返回 null、u=f 不成像等奇点处理规范)。
- 人文组件对失效引用(事件/人物/依存 id)统一过滤并显示「已忽略 N 条失效引用」,时间先后不自动当因果、政策组件不宣告赢家。
- 节奏组件 Web Audio 在停止/卸载时关闭 AudioContext;波叠加 rAF 正确清理。
- 文本高亮用 segment+button 实现,无 innerHTML。

## 3. 发现的问题与代修记录

| # | 级别 | 问题 | 修复 |
|---|---|---|---|
| 1 | G4 系统性 | 14 个组件的 schemaDoc 过薄:缺默认值/单位/含义(规范 §6 要求逐项一致);报告 §7 中 LLM 把默认 true 的 `showClassification` 猜成 false 即为此缺陷的直接证据 | 全部重写为逐字段「含义、单位、范围、默认值」格式,并补齐 patchHints 至 ≥2 条(对齐 catalog 中已有的双语 hints) |
| 2 | G3 | wave-superposition 固定 42px 振幅比例,A₁+A₂=4 时合成波峰 168px 超出 H/2=135,曲线顶部被裁且无提示 | 改为动态比例 `(H/2−14)/max(2, A₁+A₂)`,全参数域不再溢出 |
| 3 | G3 | climate-comparison 的 `comparisonFocus` 是死字段:切换后渲染无任何变化 | 焦点高亮对应读数(年温差/年降水),hemisphere 焦点显示南北半球 chip |
| 4 | G3 | lens-imaging.tsx(参考样板自身)残留 5 处裸 hex(#fff/#f3efe4/#f7f3e9),违反调色板规则 | 全部改为 `WIDGET_COLORS.surface/surfaceSoft/chipBg` |
| 5 | 测试缺口 | 插入排序无任何断言(规范只强制冒泡/选择,但「任意输入终态有序」未覆盖插入) | 新增插入排序终态 + 已排序输入零交换断言 |
| 6 | 交付物越界 | `apps/web/public/qa-angle-components.html`(角度组件设计稿)放在 public/,会随生产构建公开发布 | 当时移至 `docs/角度组件设计稿.html`；现归档为 `docs/archive/design-research/angle-component-exploration-2026-07.html` |
| 7 | 路由质量 | 内容型组件 create 时 fast-tier LLM 输出「待补充」占位文本(实测 source-comparison 首跑复现) | route.ts create 提示增加一条通用约束:文本内容字段必须生成具体教学内容、禁止占位文本;复测生成了恩格斯 vs 尤尔的实质性史料对比 |

另有两处记录在案、不要求返修:客户端示例 prompt 与空态文案已顺手更新为跨学科版本;process-sequence / argument-map / timeline 三个 widget 的 onChange 未使用(其学生交互仅为浏览选择,参数调整全走 LLM patch,符合规范对「学生调的参数必须进 config」的定义)。

## 4. G5 真实 LLM 实测记录(DeepSeek fast tier)

Create(7 条,全部路由与参数正确):

| Prompt | 路由 | 关键参数 |
|---|---|---|
| 0.2M NaOH 滴定 25mL 0.1M 盐酸 | chem.acid-base-titration | baseConcentration=0.2,其余默认 ✓ |
| 两列相位差 180° 的波叠加 | physics.wave-superposition | phaseDiffDeg=180 ✓ |
| 选择排序 [9,4,7,2] | cs.sorting-steps | algorithm=selection, values=[9,4,7,2] ✓ |
| 对比工业革命两份史料的局限 | humanities.source-comparison | comparisonFocus=limitations + 实质史料内容 ✓ |
| 三四拍 120bpm 节奏练习 | music.rhythm-pattern | timeSignature=3/4, tempoBpm=120 ✓ |
| 法国大革命因果链 | general.timeline-causality | 7 事件 + 6 条因果链,史实正确 ✓ |
| 什么是化学平衡? | chat(不出组件)✓ | — |

Adjust(4 条,全部为最小补丁且语义正确):

| Prompt(模糊口语) | 补丁 | 判定 |
|---|---|---|
| 「滴到终点看看」 | `{"addedBaseVolume":12.5}` | 按 patchHints 公式 0.1×25÷0.2 精确算出等当点 ✓ |
| 「让第二列波再快一点」 | `{"frequency2":1.3}` | +30% 约定 ✓ |
| 「抛物线右移两个单位,开口朝下」 | `{"a":-1,"h":2}` | 双字段最小补丁 ✓ |
| 「再快一点」(节奏) | `{"tempoBpm":144}` | +20% 约定 ✓ |

延迟:stage-1 2.2~4.6s,stage-2 1.7~24.5s(内容型组件明显更长)。

## 5. 入库时最终验证

```text
pnpm --filter @primoria/web typecheck   通过
pnpm lint                               0 errors(1 条既有无关 warning)
pnpm --filter @primoria/web test        75 文件 374 项通过,1 项按约定跳过
pnpm catalog:validate                   OK: 19 components (implemented=19)
```

当时复现的 `next-env.d.ts` 工作树污染已在后续修复：文件取消跟踪并加入
`.gitignore`，`typecheck` 先运行 `next typegen`，旧静态测试不再读取该文件。

## 6. 当前非阻塞边界

1. 滴定组件在 `equivalenceVolume > 100mL` 时辅助线会落在 viewBox 外并被
   SVG 安全裁剪；功能不错误，但未来可增加“超出量程”提示。
2. 新组件优先级需要 2–4 周真实 `visualization.render` 数据，当前不根据
   主观偏好继续扩容。

## 7. 后续事项关闭状态

| 原事项 | 当前状态 |
| --- | --- |
| 生产 Agent/contracts 接入 | 已完成：`open_interactive_component` + 共享 Agent Catalog + Web Stage 2 |
| Catalog 外 sandbox fallback | 已保留，并排在结构化 renderer 之后 |
| 内容型组件质量 | 已完成：`AI_MODEL_CONTENT`/默认质量模型，绝不回落 fast tier |
| 史实类免责提示 | 已完成：timeline/source-comparison 显示核验提醒 |
| 人文交互深化 | 已完成第一步：逐事件/逐材料学生标注 |
| 生产主题 token | 已完成：`WIDGET_COLORS` 绑定语义 token |
| i18n | 已完成：卡片和组件固定文案进入中英文字典 |
| 路由回归 | 已完成：28 条固定评测集，最近真实模型 28/28 |
| 埋点下游 | 已完成：14/28 天内部聚合页和生产邮箱白名单 |
| next-env 污染 | 已根治：生成文件不跟踪，typecheck 主动 typegen |
