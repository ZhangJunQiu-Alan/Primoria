# Lesson Composition Contract v1 — 工作报告

日期：2026-06-29

工作目录：`/Users/zhangjunqiu/Desktop/primoria`

状态：代码实现已完成，进入评估 / code review 阶段。

## 1. 背景

本轮目标是把 lesson 的 block 组成机制从“固定文字/代码模板”改成跨学科适配的 composition contract。

核心产品方向：

- 不默认生成 Code Block。
- 每个 concept 都有自己的 concept-closing quiz。
- `image` 和 `visual` 由 planner 按教学价值选择，不按硬编码数量凑结构。
- `image + visual` 合计保持在 lesson blocks 的 30%-45%。
- Image Block 可以帮助理解，但不能替代核心解释。
- 不新增数据库结构，不新增 block type。

## 2. Contract 更新结果

实现后的 lesson contract：

- 2-concept lesson：13-15 blocks。
- 3-concept lesson：16-20 blocks。
- 异常 concept 数：继续走保守 fallback。
- 每个 concept 必须有且只有一个 `quiz` block。
- Quiz 必须绑定当前 concept，不能用一个综合 quiz 覆盖所有 concepts。
- Quiz 放在对应 concept 教学小节收尾，而不是集中放到 lesson 末尾。
- `image + visual` 合计 30%-45%。
- 每个 media block 必须绑定 concept，并且有非空教学目标。
- `image` 只能承担 `example` 或 `deepening` 角色，不能承担 `explanation` 覆盖。
- `visual` 不再被 KG visual-worthy 标记硬限制；KG visual 只作为 planner 强提示。
- `code` 只允许出现在代码适配主题或用户明确要求写代码/运行代码/用编程语言/代码实现/实现算法函数接口的场景；裸词“实现”不能单独触发。

同步更新位置：

- `temple/feature_specification.md`

## 3. 主要实现位置

### 3.1 Lesson IR

文件：

- `apps/web/src/lib/ai/course-generation/lesson-plan-ir.ts`

变化：

- Lesson plan IR 支持 `I=image`。
- `image` 与 `visual` 都进入 planner/validator 的 media contract。
- `Code Block` 保留能力，但不再作为默认 lesson template。

### 3.2 Planner Prompt

文件：

- `apps/web/src/lib/ai/course-generation/lesson-planner.ts`

变化：

- 明确 Code Block 默认关闭。
- 只有编程语言、算法/数据结构、Web/软件工程、数值/科学计算、机器学习实现类主题，或用户明确要求“写代码/运行代码/用某编程语言/代码实现/实现算法函数接口”时允许 `C=code`。
- 生物、化学、物理、数学概念教学默认用 `text/example`、`image`、`visual`、`analogy`，不得为了凑结构生成 code。
- Planner 负责根据学科选择 block 类型：
  - 具体结构、场景、类比图像：`image`
  - 动态机制、变量关系、交互探索：`visual`
  - 可执行实现：`code`
- 每个 concept 末尾必须有自己的 `Q=quiz`。
- Quiz 的 `conceptIds` 只能绑定当前 concept。
- KG visual affordance 变成强提示，不再是 exactly-one 硬约束。

### 3.3 Compiler / Validator

文件：

- `apps/web/src/lib/ai/course-generation/lesson-plan-compiler.ts`
- `apps/web/src/lib/ai/course-generation/lesson-validator.ts`

变化：

- `expectedBlockRange` 改为：
  - 2 concepts：13-15
  - 3 concepts：16-20
  - fallback：8-20
- `validateLessonComposition` 从 “exactly one quiz” 改为 “one quiz per concept”。
- `validateQuizCoverage` 改为检查：
  - 每个 quiz 只绑定一个 concept。
  - 所有 concepts 都被 quiz 覆盖。
  - 每个 concept 不能缺 quiz，不能重复 quiz。
  - quiz 之前必须已有 explanation 和非 image 的 example。
  - quiz 后、transfer 前不能继续出现同 concept 的教学 block。
- `validateMediaRules` 检查：
  - `image + visual` media density 是否在 30%-45%。
  - media block 是否绑定 concept。
  - media block 是否有教学目标。
- `validateImageRules` 保留 image 边界：
  - image 必须绑定 concept。
  - image 只能是 `example` 或 `deepening`。
  - image 不能补足 explanation/example 的核心覆盖。
- `validateCodeEligibility` 新增 code eligibility guard：
  - 非代码适配 topic 出现 `code` 时拒绝。
- topic/subject 明确是编程、算法、软件、数值计算、机器学习实现等时允许；context hint 只有出现明确代码动作时才允许。

### 3.4 Block Writer / Job Processor

文件：

- `apps/web/src/lib/ai/course-generation/block-writer.ts`
- `apps/web/src/lib/ai/course-generation/lesson-assembler.ts`
- `apps/web/src/lib/courses/lesson-generation-processor.ts`

变化：

- Batch 逻辑支持多个 quiz batch。
- `transfer` batch 不再只按 block type 判断，也按 pedagogical role 判断。
- Quiz writer prompt 改成 concept-closing quiz。
- Processor 在 recompile / fresh compile 时传入 course topic 作为 context hint。
- Planner 也接收 course topic，方便判断用户是否明确要求实现/写代码。
- Validation failure 后仍清理 batch checkpoints，不发布部分 lesson。
- Progress total 继续按 `batch count + validation + saving` 计算，现在 batch count 会自然包含 N 个 concept quiz batches。

### 3.5 Legacy Web Generator

文件：

- `apps/web/src/lib/ai/deepagent/course-generator.ts`

变化：

- legacy one-shot generator 的 prompt 同步成：
  - 2 concepts：13-15 blocks。
  - 3 concepts：16-20 blocks。
  - 每个 concept 一个 quiz。
  - code opt-in。
  - visual media rhythm 30%-45%。
- legacy normalizer 增加相同方向的 composition guard。
- 本次检查时发现 legacy prompt 仍残留 “visual at most one per course”，已修正为允许多个 visual，只要求每个 visual 有独立教学目的并满足 30%-45% media rhythm。
- 已补测试防止这个旧规则回归。

边界说明：

- legacy full-course schema 当前仍以 `visual` 作为 media rhythm，不在 full-course JSON schema 里直接生成 `image`。
- Image Block 的主生成路径在 lesson planner + imaging pipeline；单 block add/transform path 也支持 image。

## 4. 测试覆盖

重点测试文件：

- `apps/web/tests/lesson-plan-compiler.unit.ts`
- `apps/web/tests/lesson-planner.unit.ts`
- `apps/web/tests/block-content-compiler.unit.ts`
- `apps/web/tests/image-pipeline.unit.ts`
- `apps/web/tests/lesson-assembler.unit.ts`
- `apps/web/tests/lesson-generation-jobs.unit.ts`
- `apps/web/tests/lesson-generation-processor.unit.ts`
- `apps/web/tests/lesson-generation-worker.db.ts`
- `apps/web/tests/course-lesson-composition.unit.ts`
- `apps/web/tests/image-block-static.unit.ts`
- `apps/web/tests/lesson-generation-labels.unit.ts`

覆盖点：

- 2-concept plan 接受 13-15 blocks。
- 3-concept plan 接受 16-20 blocks。
- 2 concepts 必须有 2 个 quiz。
- 3 concepts 必须有 3 个 quiz。
- 单个综合 quiz 覆盖所有 concepts 会被拒绝。
- image 作为 `explanation` 会被拒绝。
- image 作为 `example` / `deepening` 可接受。
- 非代码学科出现 `code` 会被拒绝。
- 代码适配学科或明确实现目标时 `code` 可通过。
- media density 低于 30% 或高于 45% 会被拒绝。
- 多个 visual 不再因 “最多一个” 被拒绝。
- 多个 quiz batch 可以生成、checkpoint、resume、发布。
- validation failure 后清理 batch checkpoints，不发布部分 lesson。
- `feature_specification.md` 不再保留旧的 per-concept visual cap 表述。

## 5. 验证结果

已执行并通过：

```bash
./node_modules/.bin/tsx apps/web/tests/lesson-plan-compiler.unit.ts
./node_modules/.bin/tsx apps/web/tests/lesson-planner.unit.ts
./node_modules/.bin/tsx apps/web/tests/block-content-compiler.unit.ts
./node_modules/.bin/tsx apps/web/tests/image-pipeline.unit.ts
./node_modules/.bin/tsx apps/web/tests/lesson-assembler.unit.ts
./node_modules/.bin/tsx apps/web/tests/lesson-generation-jobs.unit.ts
./node_modules/.bin/tsx apps/web/tests/lesson-generation-processor.unit.ts
./node_modules/.bin/tsx apps/web/tests/course-lesson-composition.unit.ts
./node_modules/.bin/tsx apps/web/tests/lesson-generation-labels.unit.ts
cd apps/web && ../../node_modules/.bin/tsx tests/image-block-static.unit.ts
```

类型检查通过：

```bash
cd apps/web && ./node_modules/.bin/tsc --noEmit
```

Diff 检查通过：

```bash
git diff --check
```

说明：

- `image-pipeline.unit.ts` 会打印一条 `gemini quota exceeded` 日志，这是测试故意模拟 image generation failure path，不是真实调用失败。

## 6. 建议评估顺序

建议按这个顺序 review：

1. `temple/feature_specification.md`
   - 先确认产品 contract 是否符合预期。
   - 重点看 block 数量、media density、per-concept quiz、Code Block 边界。

2. `apps/web/src/lib/ai/course-generation/lesson-planner.ts`
   - 确认 prompt 是否把“planner 按教学价值选择 media”讲清楚。
   - 确认跨学科例子不会默认诱导 code。

3. `apps/web/src/lib/ai/course-generation/lesson-plan-compiler.ts`
   - 这是 plan 进入系统前最重要的 contract gate。
   - 重点看 quiz coverage、media density、image role、code eligibility。

4. `apps/web/src/lib/ai/course-generation/lesson-validator.ts`
   - 这是 block writer 和 image finalization 后的最终 guard。
   - 重点看它是否和 compiler 保持一致。

5. `apps/web/src/lib/ai/course-generation/block-writer.ts`
   - 确认 quiz prompt 是 concept-closing，而不是 lesson-final comprehensive quiz。
   - 确认 batch 分组支持多个 quiz。

6. `apps/web/src/lib/courses/lesson-generation-processor.ts`
   - 确认 checkpoint/resume/publish 流程对多 quiz batch 没有旧假设。

7. `apps/web/src/lib/ai/deepagent/course-generator.ts`
   - 确认 legacy path 没有继续要求单 quiz、默认 code、visual 最多一个。

## 7. 已知边界与风险

### 7.1 Media density 是硬校验

当前 validator 会把 30%-45% 当作 hard gate。好处是能稳定避免纯文字 lesson；风险是某些高度抽象或短 lesson 可能被拒绝，即使文字讲解本身质量不错。

如果后续发现生成失败率偏高，可以考虑把 hard reject 改成 planner retry / backfill 策略，而不是直接放宽 contract。

### 7.2 Code eligibility 是关键词/上下文判断

当前 guard 已拆成两层：KG/topic/subject 只走代码适配学科白名单；context hint 只接受明确代码动作（写代码、运行代码、用 Python、代码实现、实现算法/函数/API/接口等）。裸词“实现”不会单独触发 code eligibility。

这仍然不是深度学科分类器。后续如果有更丰富的 subject metadata，可以把这个判断从关键词白名单升级为结构化 subject capability。

### 7.3 Quiz close rule 比较严格

当前规则要求 quiz 是 concept 小节收尾：quiz 之后、transfer 之前不能再出现同 concept 的教学 block。

这个规则能阻止“所有 quiz 堆到末尾”，但也会拒绝某些“先 quiz 再解释错因”的结构。当前符合你的需求；如果以后要做 Brilliant 风格的答后讲解，建议把答后讲解放到 quiz block 内部，而不是 quiz 后再追加同 concept teaching block。

### 7.4 Live AI 质量还需要样本评估

本轮完成的是 contract、prompt、validator、processor 和测试层实现。还没有用真实模型批量生成不同学科 lesson 做人工质量评估。

建议后续至少抽样：

- 生物 / 化学：确认不会生成 code，image 是否是静态认知锚点。
- 物理 / 数学：确认 visual 用在变量关系和动态机制，不滥用 image。
- 算法 / 软件工程：确认 code 只在实现确实有教学价值时出现。
- 机器学习 / 数值计算：确认 code eligibility 不会误拒绝实现类 lesson。

### 7.5 `apps/agent` 未作为本轮 lesson generation 主路径修改

当前 `apps/agent/src/graph.mjs` 的 course branch 文案显示：KG 定位、course generation 和 persistence 由 web side 执行，agent 不直接建课。

因此本轮主要覆盖 web lesson-generation 主链路和 web legacy generator。若未来恢复 agent-side course generation，需要单独审计 agent 生成路径是否也遵守同一 contract。

## 8. 当前工作区注意事项

当前工作区还有与本任务无关的已修改 / 未跟踪内容：

- `apps/web/src/app/globals.css`
- `apps/web/src/components/onboarding/onboarding-client.tsx`
- `apps/web/public/`

这些不是本轮 Lesson Composition Contract v1 的实现范围，评估本任务时建议单独排除。

## 9. 结论

Lesson Composition Contract v1 的代码层已经从“模板式 block 产出”推进到“planner 选择 + compiler/validator 守合同”的结构。

当前实现可以支撑：

- lesson 内 per-concept quiz；
- image/visual 合理占比；
- image 与 visual 教学边界；
- Code Block 按需启用；
- 多 quiz batch 的生成、checkpoint、resume、publish；
- 文档 contract、prompt contract、运行时 validator 和测试之间的同步。

下一步建议进入真实样本质量评估，重点看不同学科下 planner 是否能稳定做出合理的 media/code/quiz 决策。
