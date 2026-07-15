# Primoria 全学科交互可视化 Catalog 工作报告

## 1. 当前环境

- 仓库：`/Users/zhangjunqiu/Documents/Project/Primoria`
- 分支：`main`
- HEAD：`5c9dec08`
- 状态：代码未提交、未推送，工作树包含其他任务的既有改动
- 本任务未引入数据库迁移、外部依赖或生产部署变更

## 2. 任务目标与最终决策

最初方向是根据 KG 中约 355 个 concept 逐个制作 Visualization，后来调整为：

- 不按 KG concept 数量机械生产组件
- 建设 Primoria 项目级、跨学科 Visualization Catalog
- 覆盖所有学科，而非局限于 STEM
- 每个组件对应一个清晰的教学场景
- 学科通过 `disciplineTags` 多对多复用组件
- Catalog 外需求继续降级到现有 sandbox HTML Widget
- Config 只描述教学语义，不包含坐标、颜色、尺寸等视觉实现字段
- 每个组件独立实现学科逻辑，不建立万能 JSON 渲染器

Catalog 策略：

```text
disciplinePolicy = all-subjects
selectionUnit = one-teaching-scene
fallbackPolicy = sandbox-widget
```

## 3. 核心交付物

### Catalog

- `data/visualization-components/catalog.v1.json`
- `data/visualization-components/catalog.schema.json`
- `scripts/validate-visualization-catalog.mjs`

根目录新增命令：

```bash
pnpm catalog:validate
```

Catalog 每个条目包含：

- 双语名称、目录描述和教学目的
- `componentId`、版本和 `rendererKey`
- 学科标签、能力标签、主要交互方式
- 完整 JSON Schema 和默认 config
- Patch 语义提示
- 降级条件
- 中英文示例指令
- 实现状态

当前统计：

```text
组件总数：19
implemented：19
学科标签：37
planned/prototype：0
```

### 声明式组件运行时

组件契约与纯计算：

- `apps/web/src/lib/qa/components/`
- `apps/web/src/lib/qa/components/registry.ts`
- `apps/web/src/lib/qa/components/types.ts`

每个组件模块提供：

```text
Zod 完整 config schema
Zod 最小 patch schema
默认 config
纯计算/分析函数
ImplementedComponent 元数据
Schema 文档和自然语言 patch 提示
```

React 渲染层：

- `apps/web/src/app/qa/declarative-lens/widgets/`
- `apps/web/src/app/qa/declarative-lens/widgets/index.tsx`
- `apps/web/src/app/qa/declarative-lens/widgets/palette.ts`
- `apps/web/src/app/qa/declarative-lens/widgets/primitives/controls.tsx`
- `apps/web/src/app/qa/declarative-lens/widgets/primitives/widget-shell.tsx`

共用部分只抽取了：

- Widget 外壳
- Slider
- Segmented control
- Readout
- Primoria 统一 Palette

学科计算和可视化仍由各组件独立实现。

## 4. 已实现的 19 个组件

### 数学、科学与计算

- `physics.lens-imaging`
- `chem.acid-base-titration`
- `physics.wave-superposition`
- `cs.sorting-steps`
- `math.function-explorer`
- `math.angle-measure`

包含薄透镜公式、滴定 pH、简谐波叠加、三种排序轨迹、函数变换和角度分类等纯计算逻辑。

### 通用、人文与语言

- `general.timeline-causality`
- `general.process-sequence`
- `humanities.source-comparison`
- `humanities.argument-map`
- `literature.narrative-arc`
- `literature.character-relationships`
- `literature.close-reading`
- `language.sentence-structure`

特别处理了：

- 时间先后不自动等同因果
- 失效事件、人物和依存引用会被过滤
- 文本高亮不使用 `innerHTML`
- 政治、文学和历史材料避免自动替学生得出唯一结论

### 社会科学、地理与艺术

- `social.policy-tradeoff`
- `geography.climate-comparison`
- `arts.color-harmony`
- `music.rhythm-pattern`
- `psychology.experiment-design`

实现说明：

- 政策组件只展示标准权重与利益相关者，不自动宣布“赢家”
- 色彩组件中的动态 HSL 是教学对象，不是 UI 主题漂移
- 节奏组件使用浏览器 Web Audio API，无外部音频依赖
- 拍号会影响每小节步数
- 实验设计会检查对照组并分配样本量

## 5. QA 路由与两阶段 LLM 流程

页面：

- `apps/web/src/app/qa/declarative-lens/page.tsx`
- `apps/web/src/app/qa/declarative-lens/declarative-lens-client.tsx`

API：

- `apps/web/src/app/api/qa/declarative-lens/route.ts`

流程：

```text
用户消息
  → Stage 1：只读取精简 Catalog，选择 componentId 和 intent
  → Stage 2：只读取选中组件的完整 schema
  → 生成完整 config 或最小 patch
  → Zod 校验
  → 对应 React Widget 渲染
```

Intent：

```text
create
adjust
off_catalog
chat
```

安全边界：

```text
仅 NODE_ENV !== production
并且 PRIMORIA_ENABLE_QA_ROUTES=1
页面仍受现有登录策略保护
```

启动方式：

```bash
PRIMORIA_ENABLE_QA_ROUTES=1 pnpm --filter @primoria/web dev
```

登录后访问：

```text
http://localhost:3000/qa/declarative-lens
```

## 6. 测试覆盖

测试位置：

- `apps/web/tests/declarative-*.spec.ts`
- `apps/web/tests/visualization-catalog-implemented.spec.ts`
- `apps/web/tests/visualization-widgets-render.spec.ts`

每个新增组件都有独立测试，覆盖：

- 默认 config
- Patch schema
- 上下界
- 学科计算正确性
- 失效引用过滤
- Catalog 默认值与 Zod 默认值一致性
- Registry 与 Widget renderer 一一对应
- 19 个默认组件均可实际 SSR 渲染

最终验证结果：

```text
pnpm --filter @primoria/web test
75 个测试文件通过
1 个按项目约定跳过
373 项测试通过
1 项跳过
```

其他验证：

```text
pnpm --filter @primoria/web typecheck   通过
pnpm catalog:validate                  通过
pnpm --filter @primoria/web build      通过
git diff --check                       通过
pnpm lint                              0 errors
```

Lint 有一条与本任务无关的既有警告：

```text
apps/web/src/components/course/block-renderer.tsx:315
@next/next/no-img-element
```

## 7. 运行态验证

已在开发模式真实调用：

```text
POST /api/qa/declarative-lens
prompt = "show a 90 degree angle"
```

结果：

```json
{
  "intent": "create",
  "componentId": "math.angle-measure",
  "config": {
    "angleDeg": 90,
    "showClassification": false,
    "showProtractor": false
  }
}
```

HTTP 状态为 `200`，Stage 1 路由和 Stage 2 config 生成均成功。

## 8. 重要陷阱

运行 `next dev` 会把：

```ts
import "./.next/types/routes.d.ts";
```

自动改成：

```ts
import "./.next/dev/types/routes.d.ts";
```

但现有静态测试要求生产路径。如果直接执行完整测试，真正断言失败有时会被 Vitest 包装成：

```text
SyntaxError: Unexpected token '�', "�" is not valid JSON
convert-source-map
```

这不是 Visualization 测试失败。

处理方式：

- 运行 `next build` 恢复生产声明；或
- 将 `apps/web/next-env.d.ts` 恢复为 `.next/types/routes.d.ts`

当前文件已经恢复，完整测试为绿色。

## 9. 工作树边界

当前工作树很脏，而且相关目录多数仍是 untracked。不要执行：

```bash
git add -A
git reset --hard
git checkout -- .
```

以下修改属于其他已有任务，不能假定由 Visualization 工作产生：

```text
apps/web/src/components/library/course-library-grid.tsx
apps/web/src/components/tutor/nav-rail.tsx
apps/web/src/components/tutor/tutor-chat-copilot.tsx
apps/web/src/hooks/use-primoria-copilot.tsx
apps/web/src/lib/i18n/dictionaries.ts
apps/web/src/lib/knowledge-graph/generated-graph.ts
apps/web/tests/course-generation-ui-static.unit.ts
apps/web/tests/library-outline-recovery.spec.ts
apps/web/src/lib/courses/*
apps/web/src/lib/http/*
相关 course/fetch/generated-graph tests
temple/*
```

如果后续要提交，必须先按路径和功能边界重新审查、选择性暂存。

## 10. 明确未做的事项

以下不是遗漏，而是当前范围之外：

- 没有提交或推送
- 没有替换生产 Tutor 的 `plan_visualization → widgetRenderer` HTML 流程
- 没有让生产环境开放 QA 页面
- 没有新增数据库表或持久化实例
- 没有为 Catalog 外场景取消 sandbox fallback
- 没有做所有组件的登录态浏览器截图基线；已用 SSR 渲染烟测和真实 API 调用覆盖运行时装载
