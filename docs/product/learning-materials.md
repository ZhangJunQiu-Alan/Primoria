# 用户上传学习资料 → 基于资料建课

Status: v1 design + first implementation slice, October 2026. Runtime
contracts, schemas, and tests remain the final source of truth.

## 1. 目标

学习者上传自己的学习资料（讲义、教材章节、论文、笔记），Primoria 基于资料
本身生成课程：课程结构来自资料，课时内容以资料原文为依据，并标注来源。资料与由
资料派生的一切内容都属于该学习者私有。

## 2. 已确认的产品决策

| 决策 | 结论 |
| --- | --- |
| 课程结构来源 | 由资料自建 owner 私有的 `mat_*` 图谱；不映射到库内 KG（预留以后对齐） |
| 入口 | 资料库页面（`/materials`）上的按钮；v1 不加 Tutor 工具、不自动转存聊天附件 |
| 图片与分享 | 资料课程的课时图片走 owner 私有媒体通道；资料课程默认不能生成分享链接 |
| 产出范围 | 课程（含测验块）→ Tutor 基于资料问答（RAG）→ 资料题库/练习，按此顺序分阶段交付 |
| 问答入口 | 只在资料课程的侧栏 Tutor 里基于资料回答；不做资料页"问 Tutor"，主 Tutor 不自动检索资料 |
| 回答策略 | 资料优先并注明出处；资料没覆盖的部分可用通用知识补充，但必须放在"资料外补充"段落里 |

## 3. 与现有系统的边界

- **聊天附件不变**：`apps/web/src/lib/ai/attachments.ts` 仍是一次性的消息上下文
  （不落库、截断）。资料库复用它的 PDF/DOCX/TXT/MD 文本抽取，但持久化、分块、
  建课是独立路径。
- **`mat_*` ≠ `gen_*`**：`gen_*` 图谱按主题 key 跨用户共享并可被提升进正式库；
  `mat_*` 图谱只属于一个 owner，永不跨用户复用、永不提升、永不进入
  `generated_topic_graphs`。
- **图片池**：库内/生成课程的课时图片仍是全局公开池（`owner_id = NULL`）。只有
  `mat_*` 课程写 owner 私有资产：缓存 key 带 owner 前缀，媒体路由按 owner 鉴权并
  `private` 缓存。资料原文可能出现在图片 brief 中，因此这些 brief 绝不进入全局池。
  学习者 Facts 仍然不进入任何图片 brief。
- **分享**：`mat_*` 课程的分享接口返回 403，课程页不显示分享入口。
- **掌握度/Facts/XP**：不变。`mat_*` 概念与其他图谱一样按 `(owner, graphId,
  conceptId)` 记录掌握度；资料本身不是 learner fact，也不写掌握度。

## 4. 数据模型（Drizzle 拥有）

```text
learning_materials        一份上传资料（owner 隔离）
  id, owner_id → users (cascade), title, file_name, mime_type, byte_length,
  content_sha256 (owner 内唯一 → 重复上传幂等), char_count, chunk_count,
  page_count, language, created_at, updated_at

learning_material_chunks  资料的有序文本片段
  (material_id → learning_materials cascade, ordinal) PK, owner_id,
  text, heading, page_start, page_end, char_count

material_topic_graphs     由资料派生的私有课程图谱
  graph_id ("mat_<hash>") PK, owner_id → users (cascade), material_ids jsonb,
  title, language, graph jsonb (TopicGraph), concept_sources jsonb
  (conceptId → [{materialId, ordinal}]), created_at, updated_at
```

- v1 只保存抽取后的文本片段，不保存原始文件字节。
- `graph_id` 由 owner 与排序后的资料 id 确定性派生：同一组资料重复建课复用同一图谱
  （不再调用模型），课程按 `scope_key = graph:<mat_id>:full` 在 owner 内复用。
- 删除资料：若仍有课程（含已归档）使用由它派生的图谱，返回 409 并列出课程；否则
  在一个事务里删除派生图谱与资料（片段级联删除）。已有掌握度行保留（owner 私有）。
- 课时 grounding 用图谱构建时记录的 `concept_sources`，确定性取回片段，不依赖向量。
- 问答的语义索引在 KG 拥有的 SQL 里（pgvector 归 KG SQL 管，Drizzle 迁移不依赖扩展）：

  ```text
  material_chunk_embeddings   (KG SQL migration 0003)
    (material_id, ordinal, model_version) PK, owner_id, embedding vector(1536), created_at
    FK (material_id, ordinal) → learning_material_chunks ON DELETE CASCADE
  ```

  全新 bootstrap 时 KG 迁移先于 Drizzle 运行、片段表还不存在，外键由 Drizzle 迁移 0056 补上；
  先跑过 Drizzle 的库则由 KG 0003 补上（与 0026 的跨所有者外键同一模式）。

## 5. 流程

### 5.1 上传 `POST /api/materials`（multipart，单文件）

1. 校验登录、类型（PDF/DOCX/TXT/MD）、大小（≤ 8 MiB；`proxy.ts` 只缓冲 10 MB 请求体）。
2. 同步抽取文本（PDF 按页，`apps/web/src/lib/ai/document-text.ts` 与聊天附件共用解析器），
   无可抽取文本（扫描件）时返回 422。
3. 按段落/标题分块（目标 ~1200 字符，单块 ≤ 1800），记录标题与页码区间。PDF 页文本只有
   视觉换行、几乎没有空行，因此按行重建段落：标题行独立成段，硬换行合并（中文不加空格、
   英文去连字符），句末标点且明显短于整行的行视为段落结束。
4. 一个事务写入资料与全部片段；`content_sha256` 冲突时返回已有资料。

`GET /api/materials` 列出资料；`DELETE /api/materials/[id]` 按 §4 规则删除。

### 5.2 建课 `POST /api/materials/courses`

1. 载入 1–5 份 owner 资料（总字符 ≤ 600k）。
2. 复用或构建 `mat_*` 图谱（与 `gen_*` 同样使用 utility/fast 模型层）：把片段压缩成带标签的资料目录（`[S12] (文件 p.3 · 标题) 开头…`，
   总预算 ~40k 字符；片段过多时合并成区间 `[S12-S15]`），一次模型调用产出与 `gen_*`
   同形的 TopicGraph（每个 topic 2–3 个概念，线性链，`reason`/`assessmentHint`），
   并为每个概念给出 `sources`。不合法的来源引用被丢弃；概念无来源时继承同 topic
   兄弟概念的来源；整个 topic 无来源则丢弃。
3. 复用 `initializeCourseOutline`（concept-frontier 大纲 + 懒生成）并入队首课时任务。

### 5.3 课时生成（grounding）

`loadLessonGenerationContext` 通过共享的课程图谱解析器识别 `mat_*`，按本课概念的
`concept_sources` 取回片段（每概念 ≤ 4 段，每课 ≤ 12k 字符），作为
`CourseContext.sourceExcerpts` 注入 Planner 与 Block Writer：

- 讲解、例子、测验以资料为依据，沿用资料的术语、记号和例子；
- 资料未覆盖的衔接性解释可以简短补充，但不得与资料矛盾；
- 片段被包在 `<source_excerpts>` 中并声明为数据而非指令（防提示注入）。

来源展示为概念级：课程页的课时概念列表显示「来源：文件名 · 第 x–y 页」。

`apps/web/src/lib/courses/course-graph.ts` 是课程 `graphId` → TopicGraph 的唯一解析器
（库内 / `gen_*` / 仅 owner 可读的 `mat_*`），课时生成、课程页概念列表、学习进度 worker
与 Extractor worker 都经由它。此前学习进度与 Extractor 只认静态库图谱，`gen_*` 课程的
课后任务会失败；本切片一并修复，决策器改为使用解析后的图谱。

### 5.4 资料课程侧栏 Tutor 问答（第 2 阶段）

```text
upload / build course → after(): embed missing chunks (KG embedding provider, batches of 16)
course rail question → /api/copilotkit
  → course id + block ids from readable context (only these are read from the browser)
  → getCourse(owner) + getMaterialGraph(owner)        (non-material course → no-op)
  → lesson = server-side lesson owning the selected/visible block
  → retrieval over the course's own chunks:
      BM25 (Latin words + CJK bigrams) ┐
      pgvector similarity (≥ 0.2)      ├─ reciprocal-rank fusion → ≤ 6 excerpts, ≤ 6k chars
      lesson concepts' cited chunks ×½ ┘
  → hidden "COURSE MATERIAL EXCERPTS" block next to COURSE DETAIL MODE
```

- 回答规则写在隐藏上下文里：先依据片段回答并标出处（"（来源：资料名 · 第 3 页）"），不打印
  片段标签；片段不够时可补充通用知识，但必须放在以"资料外补充："开头的独立段落；与资料
  不一致时指出差异；完全无关时先说明资料没有覆盖。片段同样声明为数据而非指令。
- 课程内的 chat quiz 也会看到这些片段，题目以资料为准（仍不写掌握度）。
- 降级：没有配置 embedding 服务、向量查询失败或超时（3s）时只用词法 + 当前课时先验；检索整体
  失败时按普通课程模式回答，不中断对话。检索发现有未索引片段时安排一次补索引。
- 库内与 `gen_*` 课程、主 Tutor 不受影响：只有服务端确认是该 owner 的 `mat_*` 课程才注入。

### 5.5 代码位置

- 资料库：`apps/web/src/lib/materials/{limits,chunking,ingest,store,types}.ts`，
  路由 `apps/web/src/app/api/materials/**`，页面 `apps/web/src/app/materials/page.tsx`
  与 `apps/web/src/components/materials/material-library.tsx`。
- 图谱：`apps/web/src/lib/materials/material-graph.ts`（纯函数：资料目录、提示词、解析、
  TopicGraph 转换）与 `material-graph-store.ts`（复用或构建、持久化）。
- Grounding：`apps/web/src/lib/materials/grounding.ts`（取片段、概念来源）与
  `apps/web/src/lib/ai/course-generation/source-grounding.ts`（提示词段落）。
- 问答：`apps/web/src/lib/materials/semantic-index.ts`（索引与向量检索）、`retrieval.ts`
  （BM25、融合、取片段）、`tutor-context.ts`（解析课程上下文、组装隐藏上下文），接入点
  `apps/web/src/app/api/copilotkit/route.ts`；批量 embedding 在
  `apps/web/src/lib/knowledge-graph/embeddings.ts`。

## 6. 当前限制（v1，2026-10-24）

### 6.1 功能限制

- 不支持扫描件 OCR 与图片资料：没有文字层的 PDF 上传时返回 `no_text`（以后用视觉模型补）。
- 单文件 ≤ 8 MiB、≤ 400k 字符；每人 ≤ 50 份资料；一门课 ≤ 5 份资料、合计 ≤ 600k 字符。
  超长教材需要拆成多个文件上传。
- 图谱构建是一次同步模型调用（与 `gen_*` 的自由主题建课路径一致，fast/utility 模型层，超时 120s）；
  长资料只能以压缩目录（约 40k 字符，片段过多时合并成区间）呈现给模型，细节覆盖取决于目录质量。
- 复用的图谱保留首次构建时的课程语言与标题；如需换语言，需要换一组资料（以后提供"重新设计"）。
- 课程编辑器的单块新增/改写（`course-editor.ts`）还不注入资料片段，编辑生成的块可能脱离资料。
- 来源标注是概念级（"文件 · 第 x–y 页"），不是逐句引用；Writer 被要求不在正文里打印片段标签。
- 删除资料与并发建课之间存在窄竞态：若课程恰好在删除检查之后创建，其课时生成会以
  "资料不可用"的不可重试错误失败，而不会静默生成脱离资料的内容。上传配额检查同样不是
  事务性的，并发上传可能短暂超出 50 份。
- 删除资料会删除片段与派生图谱，但保留该图谱下已有的掌握度行（owner 私有、只含概念 id）。
- 资料课程只能从 `/materials` 页面创建；Tutor 不会主动用资料建课。
- 基于资料的问答只在资料课程的侧栏 Tutor 里生效；主 Tutor 和资料页都不能直接"问资料"。
- 检索只针对每条提问做一次（不做多轮/多跳检索），只看当前这一问加选中文本；追问"那第二点呢"
  依赖当前课时先验和对话上下文。
- 引用出处由模型按规则写在回答文本里，没有独立的结构化引用 UI，也没有校验模型是否真的引用正确。
- 语义索引是上传后尽力完成的：embedding 服务不可用时只靠词法检索，跨语言提问（如用中文问英文
  教材）效果会明显变差；索引会在下次检索或建课时补齐。
- 注入的片段随最后一条用户消息进入 Agent，会和其他运行数据一样保存在 `agent_runtime` 检查点里。

### 6.2 尚未验证

- 没有用真实模型跑过资料 → 图谱构建和资料课时生成；提示词与解析只经过离线测试（模型输出用桩替代），
  生成质量需要在配置了模型的环境里人工验收。
- 没有在浏览器里对完整数据库做端到端演练：本地缺少 pgvector，无法跑 KG 迁移。存储层在临时
  PostgreSQL 16 上单独验证过（去重、owner 隔离、删除拦截、级联删除），路由与页面用 mock 测试覆盖。
- DOCX 解析沿用聊天附件的 mammoth 路径，没有单独用真实 DOCX 文件验证；PDF 用 Chromium 生成的
  双页中英文样例验证过按页、按标题分块。
- 问答：在装了 pgvector 的临时 PostgreSQL 16 上跑过完整 `db:bootstrap`（含两个方向的外键补齐）
  和索引 → 向量检索 → 隐藏上下文 → 删除级联，embedding 用确定性哈希向量代替；真实 embedding
  服务（MiniMax/OpenAI 兼容）与真实模型的回答质量、引用格式遵守情况都还没有验证。

## 7. 分阶段交付

1. **资料 → 课程**（已完成）：资料库表与 API、`/materials` 页面、`mat_*` 图谱、
   建课、grounded 课时生成、概念级来源、私有图片、禁止分享。
2. **Tutor 基于资料问答**（已完成第一版）：片段 embedding + 混合检索；资料课程的侧栏 Tutor
   资料优先回答并注明出处（§5.4）。主 Tutor / 资料页入口留待以后。
3. **资料题库/练习**：从资料生成可计入证据的练习（需走课程测验路径，chat quiz 不更新掌握度）。
4. 以后：OCR/图片资料、与库内 KG 的概念对齐、资料版本更新后的课程刷新。

### 待办备忘

- **PPT/PPTX 支持（暂缓，2026-10-24 决定）**：当前不做。产品负责人之后会调研 GitHub 上能可靠
  识别 PPT/PPTX 的开源方案（含演讲者备注、图片/图表内文字），再决定是否接入；在那之前课件需先
  导出为 PDF 上传。
