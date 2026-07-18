# Primoria 全学科交互可视化 Catalog 工作报告

状态：2026-07-15 交付快照，已归档。当前组件清单以 Catalog JSON 为准，
开发规范以 [`交互组件规范.md`](../../交互组件规范.md) 为准。

## 1. 决策与范围

Catalog 不再按 KG 中约 355 个 concept 逐个制造组件，而以“一个可复用的
教学场景”为选择单位：

```text
disciplinePolicy = all-subjects
selectionUnit = one-teaching-scene
primaryPath = schema-driven-react-component
fallbackPolicy = specialized-renderer-or-sandbox-widget
```

核心约束：

- 覆盖所有学科，不局限于 STEM；
- `disciplineTags` 多对多复用组件；
- config 只描述教学语义，不含颜色、坐标、尺寸；
- 每个组件独立实现领域计算，不建设万能 JSON renderer；
- Catalog 外需求保留结构化 renderer 和 sandbox fallback；
- 扩容优先级由真实未命中和成功率数据决定。

## 2. 当前交付物

Catalog 与共享契约：

- `data/visualization-components/catalog.v1.json`
- `data/visualization-components/catalog.schema.json`
- `scripts/validate-visualization-catalog.mjs`
- `packages/contracts/src/artifacts/interactive-catalog.mjs`
- `packages/contracts/src/artifacts/schemas.mjs`

生产运行时：

- `apps/agent/src/tools/interactive.mjs`
- `apps/web/src/lib/interactive/components/`
- `apps/web/src/lib/interactive/configure.ts`
- `apps/web/src/app/api/interactive-component/route.ts`
- `apps/web/src/components/generative-ui/interactive/`
- `apps/web/src/components/generative-ui/interactive-component-card.tsx`

评测与观测：

- `apps/web/tests/fixtures/interactive-routing.v1.json`
- `apps/web/scripts/eval-interactive-routing.ts`
- `apps/web/src/lib/telemetry/visualization-analytics.ts`
- `apps/web/src/app/internal/visualization-analytics/page.tsx`

统计：

```text
组件总数：19
implemented：19
planned/prototype：0
```

## 3. 已实现的 19 个组件

### 数学、科学与计算

- `physics.lens-imaging`
- `chem.acid-base-titration`
- `physics.wave-superposition`
- `cs.sorting-steps`
- `math.function-explorer`
- `math.angle-measure`

### 通用、人文与语言

- `general.timeline-causality`
- `general.process-sequence`
- `humanities.source-comparison`
- `humanities.argument-map`
- `literature.narrative-arc`
- `literature.character-relationships`
- `literature.close-reading`
- `language.sentence-structure`

### 社会科学、地理与艺术

- `social.policy-tradeoff`
- `geography.climate-comparison`
- `arts.color-harmony`
- `music.rhythm-pattern`
- `psychology.experiment-design`

人文组件不是静态卡片堆叠：时间线可选择事件并记录逐事件标注；史料比较
可切换比较维度、选择材料并记录逐材料标注；两者都展示 AI 内容核验提示。

## 4. 生产路由

主 Tutor：

```text
用户请求
→ 主模型命中 Catalog
→ open_interactive_component(component_id, request)
→ InteractiveComponentCard
→ Web Stage 2
→ 完整 config 或最小 patch
→ Zod 全量校验
→ React Widget
```

后续口语调整再次调用同一个工具和 componentId，卡片携带当前 config；
Web 只生成变化字段，合并后重新校验完整对象。Agent 不读取具体 config。

未命中 Catalog 时，Agent 继续路由到结构化 renderer；再不匹配才进入
`plan_visualization → widgetRenderer` sandbox fallback。

QA 路由保留 `create / adjust / off_catalog / chat` 四类意图，用于隔离
Stage-1 评测。它不是生产 Tutor 的第二条主链路。

## 5. 模型与内容质量

- Stage-1 QA 路由和普通组件 Stage 2 使用 `AI_MODEL_FAST`（如配置）。
- `general.timeline-causality` 和 `humanities.source-comparison` 使用
  `AI_MODEL_CONTENT`；未配置时使用默认模型，不回落到 fast tier。
- 史实、日期和材料主张显示核验提醒。
- 固定 UI 文案全部进入中英文 dictionaries。

## 6. 主题与交互状态

`WIDGET_COLORS` 已从 QA 占位色迁移到生产语义 token，并为独立 SSR/QA
保留 fallback。拖拽、滑块、按钮和自然语言 patch 共享 config；播放态、
当前选择和学生临时标注等非教学参数可保留为局部 UI state。

## 7. 测试与真实验证

自动门禁覆盖：

- 19 个组件的默认 config、patch schema、边界和领域计算；
- JSON Catalog 默认值与 Zod 默认值同步；
- Agent Catalog 与 Web Registry 的 id/名称/描述同步；
- Registry 与 Widget Map 一一对应；
- 19 个默认组件全部可 SSR；
- 卡片中英文文案；
- 内容质量模型选择；
- 内部分析聚合与生产访问门禁；
- `next-env.d.ts` 生成文件卫生契约。

固定路由集包含 28 条跨学科、英文/中文、模糊调整、目录外和普通聊天
prompt。2026-07-15 对配置的真实模型执行结果为 28/28；该结果应在 Catalog
或 prompt 变更后重跑，不应被当作永久常量。

登录态全链路人工验证已完成：主 Tutor 对“演示凸透镜成像”选择
`open_interactive_component`，卡片正确渲染，后续口语调整走 patch。

最新合并前验证基线：

```text
Web unit：394 passed，1 skipped
Agent unit/typecheck：通过
Web typecheck：通过
Web production build：通过
Catalog validate：通过
真实路由评测：28/28
```

## 8. 观测闭环

每次渲染写 `visualization.render` learning event：

- `source=sandbox`：目录未命中/兜底需求；
- `source=interactive`：Catalog 组件；
- status：`rendered`、`script_error`、`config_invalid`、`api_error`；
- interactive 事件附 `component_id`。

内部页 `/internal/visualization-analytics` 支持 14/28 天窗口，按规范化 topic
聚类 sandbox 需求，并按 componentId 展示 interactive 成功率。生产访问使用
开关 + 邮箱白名单，默认失败关闭。

## 9. 已关闭的历史问题

旧报告中以下表述已经失效：

- 组件代码不再位于 `src/lib/qa` 或 QA 页面目录；已迁入生产路径。
- 不再是“未接生产 Agent/contracts”；主 Tutor 已注册工具和共享 Catalog。
- `next-env.d.ts` 不再需要 dev/build 后手工 checkout：文件已取消跟踪并由
  `next typegen` 生成，相关测试不再读取它。
- 内容型组件的 pro/default-quality tier、史实提醒、生产 token 和 i18n 已完成。

## 10. 下一阶段

不立即堆第二批组件。先积累 2–4 周真实流量，再按以下顺序决策：

1. sandbox 高频 topic；
2. 当前组件失败率；
3. 是否能形成可工程化、可验证的学生操作；
4. 是否应先深化现有人文组件，而不是增加浅层展示组件。
