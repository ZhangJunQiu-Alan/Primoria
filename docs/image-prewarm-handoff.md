# 课程配图离线预热：Codex 执行手册

> 交给 Codex 逐步执行。每一步都写了要做什么、跑什么命令、怎样算完成、什么情况必须停下来问用户。
> 标了 **【需用户确认】** 的步骤会写线上数据库、写 Supabase Storage 或花钱：先把计划和数字报给用户，得到明确同意后再执行。

## 0. 目标和边界

**目标**：给 31 个库内知识图谱的全部 **1,456 个概念**，各生成一张英文标准配图，上传到 Supabase Storage，并在 `media_assets` 登记。之后任何课程用到这些概念时，直接命中缓存，不再现场出图。

**这次不做**：

- `gen_*` 生成图谱（不在库内，概念不固定）。
- 类比插图（`analogy_illustration`），它画的是每节课自己的比喻，不能预生成。
- 中文版（列为后续可选轮次，见第 12 节）；当前用户要求先完成全部英文图，再统一导入 Supabase。
- 改运行时出图模型：没命中缓存的图，课程生成时仍由 Gemini 现场生成。

**必须遵守的仓库规则**（来自 `CLAUDE.md`）：

- 课程图片是全局公共池：`owner_id` 一律为 `NULL`。图片描述里不能出现任何学习者信息。
- 不 commit、不 push、不部署，除非用户明确要求。
- 新的 Web 测试写成 Vitest `tests/*.spec.ts`，不要新增自执行的 `*.unit.ts`。
- 所有中间文件放在仓库根目录的 `.private/image-prewarm/`（已在 `.gitignore`）。密钥只放在 `.env.supabase` / `apps/web/.env.local` 或当前 shell，绝不写进仓库文件。

**用户已确认的出图方式（2026-10-24）**：由 Codex 使用内置 `image_gen` 工具生成，不配置或调用 OpenAI 图片 API，不要求 `PREWARM_OPENAI_API_KEY`。一次调用对应一个概念的候选图，试点审核通过后再分批推进。工具额度、用时和费用以实际显示为准，不套用图片 API 单价，也不承诺免费。其他付费模型调用仍须先说明用途并获准。

**当前授权与参考图（2026-10-24）**：用户已明确要求生成全部英文图片，完成后导入 Supabase；选定的是第一张带中文标注、膜横贯画面的质膜图（本地 `candidates/cn_sh_bio_plasma_membrane_functions.v2.png`）作为风格参考。该授权覆盖本批必要的私有 Storage 上传和图片元数据写入，无需重复索要同一授权；不覆盖无关数据清理、commit、push 或部署。先全部生成和审查，再统一导入；不得把局部完成报告为全部完成。

**教学质量优先**：是否准确、清楚地解释知识点是主要验收标准，不再要求图内无字。允许有教学价值的标签、箭头、数字、公式、化学式和简短说明；文字须准确、清晰、与图中对象对应。`caption` 是图下说明，`alt` 是替代文字，两者都不能补救错误的图像内容。

## 本地执行入口与当前进度（2026-10-25）

已实现的辅助脚本：

```bash
# 仅首次导出；已有生产记录时不要覆盖 concepts.en.jsonl / run.json
pnpm --filter @primoria/web exec tsx scripts/image-prewarm/export-concepts.ts

# 只读检查数据库列、图片存量及 Storage bucket
node scripts/with-database-env.mjs runtime pnpm --filter @primoria/web exec tsx scripts/image-prewarm/preflight.ts

# 保留原图，生成 WebP、校验缓存键并更新本地预览与进度
pnpm --filter @primoria/web exec tsx scripts/image-prewarm/finalize-local.ts
```

所有生产记录位于忽略的 `.private/image-prewarm/en/`：`records/` 保存当前候选，
`replacements/` 和 `rejected/` 保留修订证据，`images/` 保存原图，`assets/` 保存 WebP。
`progress.json` 与 `review.html` 由本地整理脚本生成；`NEXT-RUN.md` 保存续跑顺序。
密钥仅保存在忽略的 `.env.supabase`，不进入 Git；图片文件也不进入 Git。

截至本次检查，705 个概念已生成并通过 Codex 复核，751 个尚未生成，导入数量为 0。
Codex 复核不代表用户逐张审图。下一科计算机系统的 55 份描述已保存，尚未出图。
用户已要求每小时在本聊天自动续跑；账号切换后的 PCR 修订图已成功生成，旧账号的
额度重置时间只作历史记录，当前剩余额度未报告。导入与命中验证脚本仍待实现，
必须全量完成并复核后再统一执行线上写入。此次用户另行授权提交当前相关脚本和手册；
自动续跑不包含后续自动 commit、push 或部署。

## 1. 先读懂：预热的图怎样被命中

运行时出图走 `apps/web/src/lib/ai/media/image-builder.ts` → `resolveImageAsset()`（`media-assets.ts`）。是否复用由缓存键决定：

```ts
// apps/web/src/lib/ai/media/image-brief.ts
imageCacheKey(brief) = sha256({
  conceptIds: 排序后的概念 id,          // 课程里每张图只绑定 1 个概念
  styleVersion: brief.styleVersion ?? STYLE_VERSION,
  aspectRatio: "16:9",
  language: imageLanguage(brief.language), // "zh-CN"/"zh" 都折成 "zh"
  // 只有 analogy_illustration 才额外带 imageKind + learningGoal
})
```

由此得出预热时的硬性要求：

1. `conceptIds` 只放一个概念 id。
2. `language` 写 `"en"`，图内标注、`alt` 和 `caption` 都用英文。
3. **不要设置** `styleVersion`，让它用默认的 `STYLE_VERSION`；改了就永远对不上。
4. `imageKind` 只能是 `educational_illustration`、`structure_diagram` 或 `realistic_scene`。它不进缓存键，命中后课程会沿用预热图的 kind、`alt`、`caption`。
5. 图片模型名不进缓存键，所以内置工具生成、按相同 brief 导入的图也能被运行时命中；模型来源必须如实记录。

字节存放：`media_assets.storage_path` 指向私有 bucket（默认 `lesson-media`，环境变量 `PRIMORIA_MEDIA_BUCKET`），路径为 `lesson-images/{assetId}.{按实际 MIME 确定的扩展名}`。读写封装在 `apps/web/src/lib/ai/media/media-storage.ts`，只在服务端用 `SUPABASE_URL` + `SUPABASE_SECRET_KEY`。浏览器通过 `/api/media/assets/{assetId}` 读图。

**导入时直接调用 `resolveImageAsset()`**，传一个返回本地文件字节的 `generate`。它会自己完成三件事：查缓存键（已有就跳过）、上传 Storage、插入 `media_assets`。不要自己拼 SQL 插行。

## 2. 前置条件

逐项核对。前三项需要用户操作或确认。

| # | 项目 | 怎么核对 |
|---|---|---|
| P1 | **【需用户确认】** 数据库迁移已应用：`0053_drop_tutor_style_facts`、`0054_media_assets_storage_path` | 用户执行 `pnpm db:bootstrap`。Codex 用只读查询确认 `media_assets.storage_path` 列存在 |
| P2 | `.env.supabase` 里有 `SUPABASE_URL`、`SUPABASE_SECRET_KEY`（`sb_secret_…` 或旧版 service_role key）、`PRIMORIA_MEDIA_BUCKET=lesson-media` | `node scripts/with-database-env.mjs runtime node -e "console.log(!!process.env.SUPABASE_URL, !!process.env.SUPABASE_SECRET_KEY)"` 输出 `true true` |
| P3 | **【需用户确认】** 旧图已迁到 Storage | `pnpm media:migrate-storage` 先 dry run，再由用户同意后跑 `pnpm media:migrate-storage -- --apply`；之后在 SQL editor 执行 `VACUUM (FULL) media_assets;` |
| P4 | 内置 `image_gen` 工具可用 | 不使用 OpenAI 图片 API Key；保留工具原始输出和生成记录 |
| P5 | 试点的教学目标、必要图中文字及审图标准已明确 | 见第 4 步，把出图方式和检查结果写进 `.private/image-prewarm/README.md` |
| P6 | 相关测试是绿的 | `pnpm --filter @primoria/web exec tsx tests/media-assets.unit.ts`、`pnpm --filter @primoria/web exec vitest run tests/media-storage.spec.ts` |

只读查询的写法：参考已有的模式，用 `getDb().$client.begin("read only", …)`，经 `node scripts/with-database-env.mjs runtime pnpm --filter @primoria/web exec tsx <脚本>` 运行。

## 3. 第 1 步：导出概念清单

新建 `apps/web/scripts/image-prewarm/export-concepts.ts`：

- 用 `listTopicGraphIds()` + `getTopicGraph()`（`src/lib/knowledge-graph/topic-graph.ts`）遍历所有概念。
- 每行输出 JSON：`conceptId, graphId, graphTitle, topicId, topicName, name, nameZh, visual, visualHint, cacheKey`。
- `cacheKey` 用 `imageCacheKey({ conceptIds: [conceptId], language: "en", imageKind: "educational_illustration", learningGoal: "", prompt: "", alt: "", caption: "" })` 计算。
- 写到 `.private/image-prewarm/concepts.en.jsonl`。

另写一个只读查询：统计这些 `cacheKey` 在 `media_assets` 里已经存在多少（已存在的后面直接跳过）。

**验收**：

- 总行数 **1,456**，`conceptId` 无重复，`nameZh` 全部非空（2026-10-24 实测如此）。
- 打印每个图谱的概念数。试点图谱 `senior_secondary_biology` 应为 **75**。

## 4. 第 2 步：确定教学表达和出图记录

- 明确这张图要解释的一个知识点，以及必须正确呈现的结构、关系或过程。
- 逐项列出必要标签、公式、数字及短说明的准确文字；英文试点使用英文，通用符号按学科规范保留。不需要文字的画面不强加标签。
- 优先横向 16:9、适合课程栏宽的构图；实际尺寸、格式以工具输出为准，不伪装成 WebP，也不裁掉教学内容。
- 使用内置 `image_gen`；保存完整提示词、原始图片、实际尺寸、MIME 类型、字节数和审核状态。工具未报告模型、用量或费用时明确记为未报告，不填写猜测值。

把结论写进 `.private/image-prewarm/README.md`。工具不可用或需要切换到外部付费 API 时，先报告并等待用户决定。

## 5. 第 3 步：写图片描述（brief）

新建 `apps/web/scripts/image-prewarm/write-briefs.ts`：

- 读 `concepts.en.jsonl`。每次调用处理 20 个概念，用 `invokeJson()`（`src/lib/ai/course-generation/model-json.ts`）调用：参数 `settings: fastTierSettings()`、`utility: true`（不思考），并传 zod schema。
- 每个概念产出：

```ts
{
  conceptId: string,
  imageKind: "educational_illustration" | "structure_diagram" | "realistic_scene",
  learningGoal: string,   // 英文，一句话：这张图帮学习者认出什么
  prompt: string,         // 英文，描述要画的场景/物体/结构
  alt: string,            // 英文，替代文字
  caption: string,        // 英文，告诉学习者该注意看什么
  negativePrompt?: string
}
```

- 给模型的规则，沿用课程写作时的图片要求（`block-writer.ts` 里的 image 字段说明）：
  - 以讲清知识点为目标；必要时使用标签、箭头、数字、坐标刻度、公式、化学式或简短说明。提示词须写出准确的图中文字，要求术语、拼写、符号和指向正确，课程栏宽下可读，避免文字遮挡结构或挤满画面。
  - 一张图只表达这一个概念，画具体可见的东西。
  - `structure_diagram` 用于结构、组成、流程；`realistic_scene` 用于真实场景、实验装置、自然现象；其余用 `educational_illustration`。
  - 抽象概念（比如复杂度、证明方法）选一个最直观的具体比方来画，但 `imageKind` 不能用 analogy。
  - 根据图谱判断学段（初高中、A-Level、大学），措辞和难度要匹配。
- 输出 `.private/image-prewarm/briefs.en.jsonl`，支持断点续跑（已有的 `conceptId` 跳过）。

**验收**：

- 1,456 条全部通过 schema 校验。
- 随机抽 20 条打印出来给用户看。
- `caption` 和 `alt` 都是英文且与实际画面一致；`prompt` 明确教学目标、关键结构关系和必要图中文字，不能含糊要求模型自行编造标注。

## 6. 第 4 步：试点出图（75 张，分小批审查）

新建 `apps/web/scripts/image-prewarm/generate-images.ts`，只准备本地出图任务和记录，不调用外部图片 API：

- 参数：`--graph <graphId>`（可重复）、`--only <file>`（只重做列出的 conceptId）、`--max-images <n>`（任务数量硬上限，默认 80）。
- 对每条 brief 拼出 `{ conceptIds: [conceptId], language: "en", ...brief }`，用 `buildImagePrompt(brief)`（`image-brief.ts`）生成最终提示词；包含画风、教学目标、文字准确性和可读性要求。
- Codex 对每个任务调用一次内置 `image_gen`，把输出复制到 `.private/image-prewarm/images/{conceptId}.v{attempt}.{真实扩展名}`，保留原始输出，不覆盖前一版。
- 往 `status.en.jsonl` 追加 `{conceptId, file, mimeType, bytes, width, height, generationMethod, model, usage, ms, attempt, reviewStatus}`；`generationMethod` 为 `built-in image_gen`，工具未报告的字段记为 `null`。
- 已审核通过的任务跳过；被拒绝的候选按新版本重做，保证断点续跑和审核记录可追溯。超过 `--max-images` 停止，不自动切换出图渠道。
- 先对 `senior_secondary_biology` 生成少量候选，核对教学准确性和文字可读性，再推进其余试点。

**验收**：

- 75 个通过审核的文件都在，扩展名与实际 MIME 一致；逐张核对结构、标签、公式、数字和说明。
- 汇总张数、总大小、平均大小和工具实际报告的用量或费用；未报告则写未知。

**停下来的情况**：发现系统性知识错误、必要文字在课程栏宽下不可读，或工具额度/费用阻止继续。图片偏大时先汇报，不为压缩体积牺牲教学清晰度。

## 7. 第 5 步：人工审图

新建 `apps/web/scripts/image-prewarm/contact-sheet.ts`，生成 `.private/image-prewarm/review.html`：

- 网格展示每张图，并附上概念中英文名、`imageKind`、`alt` 和 `caption`。
- 用户在页面里勾掉不合格的图，导出 `rejects.txt`（每行一个 conceptId）。页面是本地静态 HTML，用 `localStorage` 暂存勾选即可。

把页面路径告诉用户，请用户审图。不合格标准：

- 图中标签、术语、拼写、公式或数字错误，指示线指错对象，或文字过小、拥挤遮挡；有文字本身不是拒绝理由。
- 画的不是这个概念，或有事实错误。
- 风格明显偏离（不是扁平矢量风，`realistic_scene` 除外）。

用 `generate-images.ts --only rejects.txt` 准备重做任务，再由 Codex 使用内置工具生成新版本；同一概念最多重做 2 次。保留旧候选和拒绝原因。重做前可以手动或用模型改写该概念的 `prompt`、`negativePrompt`。

**停下来的情况**：试点不合格率超过 15%。这时先改 `write-briefs.ts` 的规则并汇报给用户，不要直接进入全量。

## 8. 第 6 步：导入试点 【需用户确认：写线上 Storage 和数据库】

新建 `apps/web/scripts/image-prewarm/import-images.ts`：

- 默认 dry run，只打印"将导入 / 已存在跳过"的数量。加 `--apply` 才写入。
- 对每个已通过审核的图调用：

```ts
await resolveImageAsset({
  brief,                       // { conceptIds:[id], language:"en", imageKind, learningGoal, prompt, alt, caption, negativePrompt? }
  model: recordedModel ?? "image_gen:unreported", // 不猜测工具未报告的模型
  provider: "codex-imagegen",
  ownerId: null,               // 全局公共池
  generate: async () => ({ mimeType, dataBase64: <文件 base64>, model: recordedModel ?? "image_gen:unreported", width, height }),
});                            // objects 不传：默认使用已配置的 Supabase Storage
```

- 返回 `reused: true` 的，说明这个概念已经有图（比如运行时 Gemini 先生成过），记为"跳过"，不要覆盖。
- 运行方式：`node scripts/with-database-env.mjs runtime pnpm --filter @primoria/web exec tsx scripts/image-prewarm/import-images.ts --graph senior_secondary_biology [--apply]`。
- 先确认 Storage 已配置：`isMediaStorageConfigured()` 为 false 时直接退出，避免把字节写进 Postgres。

**验收**：

- 新增行数 + 跳过数 = 审核通过数。新行的 `storage_path` 非空、`data_base64` 为空、`provider = 'codex-imagegen'`，MIME 与本地文件一致。
- 用 `readMediaAssetBytes()` 随机读回 5 张，字节数与本地文件一致。

## 9. 第 7 步：确认运行时真的命中

新建 `apps/web/scripts/image-prewarm/verify-hits.ts`，只读：

1. 对试点的每个概念，用一个故意不同的 brief 算缓存键：`imageKind` 改成 `structure_diagram`，`learningGoal`、`prompt`、`caption` 随便写，`language: "en-US"`。然后用 `dbMediaAssetStore.findByCacheKey()` 查。应 **100% 命中**。
2. 可选（约 $0.03/节）：参照 `tests/lesson-generation-processor.unit.ts` 的内存 store，对试点图谱跑 1 节真实课程生成。`imageGenerate` 要传一个"被调用就计数"的函数，`mediaStore` 用只读包装：`findByCacheKey`、`getById` 走真实库，`insert` 直接抛错。预期该课的非类比图片全部命中，计数为 0。
3. 如果本地能起 Web，访问一张图的 `/api/media/assets/{assetId}`，应返回 200，Content-Type 与本地图片实际 MIME 一致。

**停下来的情况**：命中率低于 100%。先排查 `language` 和 `styleVersion`，不要继续全量。

## 10. 第 8 步：全量（分批生成，线上导入仍需确认）

按图谱分批跑，建议每批 3–5 个图谱、约 250 张：

1. 先报告这一批数量、工具额度或费用信息；未知的费用不猜测，额外付费操作须先获准。
2. `generate-images.ts --graph … --max-images <这批数量>`。
3. 审图（第 5 步）。全量阶段每个图谱至少抽查 20%；任一图谱抽查的不合格率超过 15%，就整个图谱全审。
4. 导入（第 6 步，`--apply` 需确认）。
5. 跑 `verify-hits.ts`。

全量继续使用内置 `image_gen`，不自动改用 OpenAI 图片 API 或 Batch API。

**全部完成后的验收**：

- 按本次导入清单核对新增行数 + 已存在跳过数 = 1,456，不能用不带批次范围的全库 provider 计数替代。
- 在 Supabase 后台确认 Storage 总用量低于 1 GB（WebP 预计 150–400 MB），数据库大小没有明显增长。
- 给用户一份总结：张数、不合格率、实际花费、Storage 用量、各图谱命中验证结果。

## 11. 回滚

- **还没有课程用到预热图时**：删除这批行和对应的 Storage 对象。先确认 `lessons.blocks` 里没有引用这些 `assetId`，因为课程块里存的是 `assetId`，删了会让已生成的课程图片 404。
  - 查行：按本批导入清单中的明确 `assetId` 查询 `id, storage_path`，并核对 `provider = 'codex-imagegen'`；不得仅凭 provider 或时间范围批量删除。
  - 删对象：Storage REST `DELETE {SUPABASE_URL}/storage/v1/object/{bucket}`，body 为 `{"prefixes": [<storage_path>…]}`，请求头同 `storageHeaders()`。
  - **【需用户确认】** 删除前把清单发给用户。
- **已经有课程用了**：不要删除。如果整体画风要换，修改 `@primoria/contracts/visual-style` 里的 `LEARNING_OBJECT_STYLE_VERSION`，让所有图片按新风格重新生成。旧图留着，旧课程照常显示。

## 12. 可选第二轮：中文版

中文课程的 `language` 是 `zh`，缓存键不同，需要另做一套：`alt`、`caption`、`learningGoal` 用中文写，`language: "zh"`。

无图内文字或仅有通用符号的图片，经审核后可以复用原文件，并改写 `alt`、`caption` 和 `learningGoal`。带英文标签或说明的图片需要生成或编辑中文版，并重新审图，不能仅改元数据后当作中文图导入。这一轮先问用户要不要做。

## 13. 交付物清单

- `apps/web/scripts/image-prewarm/{export-concepts,write-briefs,generate-images,contact-sheet,import-images,verify-hits}.ts`
- `apps/web/tests/image-prewarm.spec.ts`：覆盖纯函数部分，包括 brief schema 校验、断点续跑的跳过逻辑、预算上限、缓存键与运行时一致。
- `.private/image-prewarm/`：`README.md`（参数核实记录）、`concepts.en.jsonl`、`briefs.en.jsonl`、`status.en.jsonl`、`images/`、`review.html`、`rejects*.txt`。都不进 Git。
- 结束时：`pnpm --filter @primoria/web typecheck`、`pnpm lint`、`pnpm --filter @primoria/web test` 全绿。另外更新 `docs/supabase-deployment.md` 的 Lesson image Storage 小节，写上预热脚本的用法。
