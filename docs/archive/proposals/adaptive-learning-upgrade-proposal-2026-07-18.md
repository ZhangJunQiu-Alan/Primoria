# Primoria 自适应学习平台技术升级方案
## 融合当前版本 A 生产健壮性、Junjie 重构版(B)与港大 DeepTutor 架构实践

> **状态：设计提案，不是当前实现或已批准路线图。** 当前架构、接口和数据库事实以
> `README.md`、`AGENTS.md`、`CLAUDE.md` 与 `docs/*` 为准。本文中的 Trace Forest、
> REST/SSE 替换 CopilotKit、Better Auth、四包拆分和 Solve-Check Loop 都需要单独的
> 产品与架构决策，不能据此修改现有生产路径。

本方案旨在为 **Primoria** 个性化自适应学习平台制定一套清晰、严谨的系统升级蓝图。我们将继续保留**当前版本 A** 在生产环境沉重教案生成中所具备的工业级工程防御能力（异步任务队列、行锁租约、分步快照续传），同时吸收 **Junjie 重构版(B)** 在标准化 REST API、better-auth 上的实践，并深度借鉴香港大学 **HKUDS DeepTutor** 在多分辨率记忆（Trace Forest）、解题自检协同网络（Solve-Check Loop）等算法前沿的优秀特性。

---

## 1. 核心设计原则

*   **原则一：工程稳定性第一 (Stability First)**
    坚持“Web为脑（Web-as-brain）”的原则，即核心的课程大纲、课时状态、自适应掌握度数据必须托管在 Postgres 关系型数据库中，大模型及 Agent 仅作为 stateless 的触发和渲染工具。绝对不把重度教案生成等慢请求暴露在同步 HTTP 请求中，坚持采用 A 的 **Background Workers 异步生成架构**。
*   **原则二：适度解耦，防止过度设计 (Pragmatic Decoupling)**
    吸收 Junjie 项目（B）中 packages 的解耦思想。但不应采用 17 个分包的过度拆分（这会导致本地构建和代码跳转成本高昂），而是收缩为 **4 个核心业务共享包**，在 Next.js 前端和 Agent 后端之间确立物理边界。
*   **原则三：自适应画像多分辨率化 (Multi-Resolution Profiling)**
    在现有 evidence-backed `learner_facts` 基线上评估 **Trace Forest** 三层记忆是否能带来可测量收益。当前事实并非无类别的扁平 key-value：系统持久化 `preference`、`prior_knowledge`、`learning_gap`、`interest`、`goal`、`profile_context` 六类事实，并保留来源、证据、置信度与 dismissed tombstone。树状记忆若实施，应是兼容扩展，而不是未经迁移与评估的直接替换。

---

## 2. 升级模块规划与详细改动建议

### 模块一：自适应记忆层升级（借鉴 DeepTutor "Trace Forest"）

#### 改造目标：
在不破坏现有六类 Facts、证据链、Settings 修正能力和 mastery 边界的前提下，验证分级索引是否能让 `learning-progress-decider` 做出更精准的复习推荐。

#### 具体改动：
1.  **数据库 Schema 调整（未来示意，字段与类别尚未批准）**：
    在 `schema.ts` 中，为 `learner_facts` 扩展层级与溯源字段：
    ```typescript
    export const learnerFacts = pgTable("learner_facts", {
      id: text("id").primaryKey(),
      ownerId: text("owner_id").notNull(),
      category: text("category").notNull(), // 保留现有六类；execution_trace 需另行决策
      conceptId: text("concept_id"), // 关联的知识点 ID
      factText: text("fact_text").notNull(), // 蒸馏事实陈述
      parentId: text("parent_id"), // 树状层级关系指向
      sourceEventId: text("source_event_id"), // 关联的答题/反馈事件 ID (用于 Citation 溯源)
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
    });
    ```
2.  **升级 Extractor Worker**：
    在 `extractor-processor.ts` 中，将原先仅对反馈/提问进行扁平蒸馏的逻辑，重构为根据答题事件中学生选择的干扰项（`distractor_tag`）进行错因深度分析：
    *   **Level 1 (会话级)**：大模型分析当前 Session 的学习节奏与态度；
    *   **Level 2 (概念级)**：大模型提取当前的知识遗漏与薄弱前置条件；
    *   **Level 3 (执行级)**：记录该知识点的错因追踪（如：“在进行负重加速度计算时，常忘记扣除摩擦力开销”）。

---

### 模块二：AI Tutor 解题协同与自检（借鉴 DeepTutor "Solve-Check Loop"）

#### 改造目标：
提升 AI Tutor 伴读对复杂理科（数学、物理、算法）问题的求解准确度，消除计算幻觉，并在输出时提供 citation 标注。

#### 具体改动：
1.  **引入 Solve-Check 双 Agent 拓扑**：
    在 A 项目的 Agent 核心 `graph.mjs` 中，重构伴读解题节点。当检测到学生发送复杂的数理公式或做题请求时，进入自检协同环：
    *   **步骤 A (Plan & Solve)**：Tutor 节点先产生解题计划并计算每一步的公式推导。
    *   **步骤 B (Validation)**：流转到自检节点（`CheckAgent`），对推导过程中的数值计算，利用 Node 环境下的 `mathjs` 库进行计算验证；如果发现大模型推导出的数值错误，直接在后台自我修正，不向前端吐出错误数据。
2.  **精准 Citation 标注**：
    在 Agent RAG 阶段，将召回的课程 Block 元数据拼入上下文。伴读输出正文时，强制要求模型返回类似 `[1]` 的标记，并在正文最下方以 `[1] 出自本课《阿基米德浮力定律》的“胡克定律类比”` 展现给学生，提升专业沉浸感。

---

### 三、 系统分包重构与接口标准化（吸纳 Junjie 重构版 B 的优点）

#### 改造目标：
物理隔离 Next.js 臃肿的单体，将 API 接口从 CopilotKit 专有协议解耦为标准的 REST / SSE 模式，提高前端响应性能和多大模型源的热切换能力。

#### 具体改动：
1.  **架构适度解耦（分包计划）**：
    在 `packages/` 目录下确立 4 个基础业务包：
    *   `@primoria/database`：管理 Drizzle schema 和 repositories，解耦底层 CRUD。
    *   `@primoria/types`：管理前后端及 Agent 的共享 Zod 模式与 TS 接口契约。
    *   `@primoria/prompts`：管理全系统的 Prompt 模板（如教案生成、事实蒸馏提示词）。
    *   `@primoria/kg`：提取知识图谱算法与 SQL positioning 算路核心。
2.  **评估 REST + SSE 与现有 CopilotKit / AG-UI 路径的成本收益**：
    当前生产路径是 Browser CopilotKit UI → Web proxy → 自托管 AG-UI Agent，且具备持久化 run、event、lease、cancel、retry 与 checkpoint。只有在协议锁定、性能或多客户端需求有真实证据时，才另开迁移设计；不得同时维护两条隐性生产 Tutor 路径。
3.  **评估 Auth 迁移，而不是默认替换**：
    当前 Web 自有 Postgres Auth 已覆盖用户、identity、session 与限流。只有当微信、OTP 或第三方身份需求明确，并完成迁移、回滚与会话兼容设计后，再比较 `better-auth`；现阶段不视为既定方向。

---

## 4. 集成内容防污染校验层（移植 Junjie 项目质量防御）

#### 改造目标：
防止大模型在后台异步生成 Block 正文时“摆烂”（输出 TODO、占位符、AI 废话等），在 `saving` 阶段前进行内容阻断并触发自动重试。

#### 具体改动：
修改 A 项目的验证器模块 `lesson-validator.ts`，新增 `getBlockTextIssue(text: string): string | null` 校验辅助：
*   **字数卡点**：除去 markdown 标记后，可见正文字数必须大于 80 个字，防止 AI 偷懒敷衍；
*   **敏感正则拦截**：拦截含有 `(todo|placeholder|lorem ipsum|作为AI|我会|接下来我会)` 等干扰性强的过程问候语；
*   **教学引导词强校验**：要求文本中必须存在 `(例如|比如|想象|场景|观察|问题|为什么)` 中的至少一个词，保证教案的启发性；
*   **测试与生产同规则**：测试必须验证真实校验逻辑，不允许用 `process.env.VITEST` 绕过生产门槛；若 fixture 不合格，应修正 fixture 或把可配置阈值作为显式依赖注入。

---

## 5. 分阶段实施路线图

### 第一阶段：短期 (1 - 2 周) - 质量安全网建立
*   **开发任务**：
    *   在 `lesson-validator.ts` 中增加**文本质量防御正则**与字数硬门槛；
    *   参考 Junjie 项目的 **Playwright E2E 测试套件**及 `smoke-test.mjs` 冒烟脚本，在 CI 中自动跑通一次完整的课程创建、学习与答题流程；Primoria 没有“课程购买”产品路径。
*   **收益**：拦截了大模型所有的生成废话与 TODO，保证前端发布质量，同时通过 E2E 规避了因 Prompt 改动导致的页面崩溃。

### 第二阶段：中期 (3 - 6 周) - 适度解耦与 Auth 规范
*   **开发任务**：
    *   在 pnpm workspaces 中拆分出 `@primoria/database` 和 `@primoria/types`；
    *   移除手写 Auth，迁移至 `better-auth` 会话托管；
    *   在 Next.js 前端引入 `zustand` 统一管理课程进度和掌握度状态，开启 `swr` 网络缓存，提升前端页面的跳转与渲染速度。
*   **收益**：Next.js 代码明显轻量化，数据库逻辑内聚，前端体验明显变快。

### 第三阶段：长期 (2 - 3 个月) - 多分辨率记忆与解题自检上线
*   **开发任务**：
    *   设计 Trace Forest 的三级数据库关联，重构 `extractor-worker`；
    *   在 `graph.mjs` 中引入 `CheckAgent` 校验节点，上线伴读答题自检与 citation 引用功能。
*   **收益**：AI Tutor 几乎彻底消除了数理计算幻觉，且能够根据学生精细的学习瓶颈（如具体的错因和 Distractor 反馈）实施精准的复习推送。
