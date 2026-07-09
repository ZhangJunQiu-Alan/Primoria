# Primoria 本地浏览器 QA 问题清单

测试时间：2026-07-09  
测试环境：本地开发环境 `http://localhost:3000` + LangGraph agent `http://127.0.0.1:2024` + Docker Postgres  
测试方式：使用 Codex 内置浏览器创建测试账号，走注册、登录、onboarding、课程生成、课程大纲、课程阅读入口流程。

## P0 / 阻断级

### 1. 本地数据库缺 KG 表时，onboarding 直接向用户暴露数据库错误

- 状态：已确认；本地数据已通过迁移和 seed 修复，但产品层仍缺少友好错误兜底。
- 复现路径：新账号注册后进入 onboarding，填写学习目标并完成前几步。
- 用户看到：完成页出现 `relation "public.kg_node_embeddings" does not exist`。
- 影响：普通用户会看到内部数据库结构错误；同时无法完成正常课程定位和课程生成。
- 处理建议：
  - onboarding API 不要直接返回原始异常消息。
  - 对 KG 表/embedding 缺失做启动前健康检查或管理后台提示。
  - 本地开发文档中明确新库必须执行 KG migration、seed、embedding seed。

本地已执行修复数据的命令：

```bash
pnpm --filter @primoria/web db:migrate:kg
pnpm --filter @primoria/web db:seed:kg-all
pnpm --filter @primoria/web exec node scripts/seed-kg-embeddings.mjs all
```

### 2. 首次打开 Tutor 首页或课程阅读页时，Next dev server 会长时间无响应

- 状态：已确认。
- 复现路径：
  - 登录后首次访问 `/`。
  - 或直接访问 `/course/<courseId>?lessonId=<lessonId>`。
- 用户看到：浏览器长时间加载或超时；同时 `/login` 等其它 web 路由也会无响应。
- 观察证据：Next `next-server` 进程曾持续高 CPU，内存峰值约 5GB；`.next` 目录增长到约 2.9GB。
- 影响：本地开发和 QA 几乎被阻断；如果生产包也受类似 bundle/渲染成本影响，会导致首屏体验极差。
- 处理建议：
  - 分析 Tutor/lesson reader 首次加载 bundle，重点看 CopilotKit、代码编辑器、可视化渲染器、重型依赖是否被主路由同步加载。
  - 对课程阅读页和 Tutor 面板做懒加载拆包。
  - 给本地 dev 增加最小 smoke route，避免 QA 每次触发完整重型编译。

#### 2026-07-10 bundle analyzer 基线

执行结果：

- 已接入 `@next/bundle-analyzer@16.1.6`，通过 `ANALYZE=true` 开关启用。
- `ANALYZE=true pnpm build` 成功；Next 16 默认走 Turbopack，编译耗时约 2.7 分钟，但不会生成 `@next/bundle-analyzer` 报告，也不输出旧版 route size 列。
- `ANALYZE=true pnpm --filter @primoria/web exec next build --webpack` 成功；webpack analyzer 编译耗时约 5.2 分钟。
- analyzer 报告路径：
  - `apps/web/.next/analyze/client.html`
  - `apps/web/.next/analyze/nodejs.html`
  - `apps/web/.next/analyze/edge.html`

口径说明：

- 下表记录的是 browser page route 的 **First-load JS 体积**，不是实际加载时间。
- `raw` 为构建产物里 minified JS 文件大小；`gzip` 为本地 gzip 估算传输大小。
- 计算方式：`build-manifest.json` 的 `rootMainFiles` + 每个 app route 的 `page_client-reference-manifest.js` 中实际被该 route server bundle 引用的 client chunks。
- 仅统计 JS，不统计 CSS、图片、RSC payload、接口耗时或浏览器解析/执行耗时。

| Route | Client refs | First-load JS raw | First-load JS gzip | Route-specific JS chunks |
|---|---:|---:|---:|---|
| `/` | 5 | 2.04 MiB | 615.0 KiB | `page-7204afef5da6e181.js` |
| `/course/[id]` | 3 | 2.50 MiB | 778.2 KiB | `course/%5Bid%5D/page-d02233b9630a12b8.js` |
| `/course/[id]/outline` | 3 | 467.5 KiB | 145.6 KiB | `course/%5Bid%5D/outline/page-9e4a05354d7a2147.js` |
| `/library` | 5 | 477.4 KiB | 146.9 KiB | `library/page-47f6c32680d4d50f.js` |
| `/login` | 2 | 446.5 KiB | 139.0 KiB | `login/page-2ed425ae08667493.js` |
| `/signup` | 2 | 446.5 KiB | 139.0 KiB | `signup/page-2ed425ae08667493.js` |
| `/auth/sign-in` | 2 | 446.5 KiB | 139.0 KiB | `auth/sign-in/page-2ed425ae08667493.js` |
| `/auth/sign-up` | 2 | 446.5 KiB | 139.0 KiB | `auth/sign-up/page-2ed425ae08667493.js` |
| `/profile` | 3 | 455.9 KiB | 141.7 KiB | `profile/page-7a0a170e82e8db6c.js` |
| `/settings` | 6 | 457.9 KiB | 142.5 KiB | `settings/page-01b6dd98d63b0105.js` |
| `/settings/facts` | 5 | 457.6 KiB | 142.3 KiB | `settings/facts/page-abe18e3a24a2f958.js` |
| `/qa/widget-renderer` | 2 | 572.5 KiB | 164.0 KiB | `qa/widget-renderer/page-8b2846fb72241294.js` |
| `/qa/batch-visual-mode` | 2 | 668.0 KiB | 195.5 KiB | `qa/batch-visual-mode/page-ee7e706c512308e6.js` |
| `/qa/interactive-visual-results` | 2 | 659.0 KiB | 192.2 KiB | `qa/interactive-visual-results/page-a5923285803ce204.js` |
| `/dev/onboarding` | 2 | 428.4 KiB | 132.1 KiB | `dev/onboarding/page-4273dcc20d24843d.js` |
| `/debug/pipeline` | 2 | 400.1 KiB | 122.5 KiB | `debug/pipeline/page-22181e0a5d28017e.js` |
| `/stats` | 2 | 454.0 KiB | 141.0 KiB | `stats/page-6da3e6ba171eabe2.js` |
| `/weekly-report` | 2 | 454.0 KiB | 141.0 KiB | `weekly-report/page-6da3e6ba171eabe2.js` |
| `/upgrade` | 4 | 454.0 KiB | 141.0 KiB | `upgrade/page-6da3e6ba171eabe2.js` |

共同基线：

- shared root JS：392.0 KiB raw / 119.1 KiB gzip。
- 普通页面大多落在 400-480 KiB raw；`/` 和 `/course/[id]` 明显偏高。

重点 route 的大 chunk：

| Route | Chunk | Raw | Gzip | 主要内容 |
|---|---|---:|---:|---|
| `/`、`/course/[id]` | `static/chunks/1020-d7d648360dbd66a0.js` | 855.5 KiB | 253.3 KiB | CopilotKit、streamdown、remark/rehype、Radix dropdown 等 |
| `/`、`/course/[id]` | `static/chunks/6b5bb80a-eaa9fcd46a803c06.js` | 257.8 KiB | 74.1 KiB | KaTeX |
| `/course/[id]` | `static/chunks/8688-3dea65253128c968.js` | 292.5 KiB | 105.0 KiB | CodeMirror language/state/autocomplete |
| `/course/[id]` | `static/chunks/806a9f72-6e90b7a36b6c179d.js` | 190.6 KiB | 60.3 KiB | CodeMirror view |
| analyzer 全局最大非首屏 chunk | `static/chunks/3165.e5d496f773bad8de.js` | 1.06 MiB | 357.7 KiB | ECharts |

复核结论：

- `/` 首屏偏高的直接原因是 `app/page.tsx` 同步包含 Landing、onboarding、CopilotKit provider、Tutor workspace 多条分支，最终首屏 client chunk 达到 2.04 MiB raw。
- `/course/[id]` 更重，达到 2.50 MiB raw；除了 CopilotKit/markdown 相关 chunk，还同步进入了 CodeMirror 和 KaTeX。
- ECharts 确实是全局最大的单独 client chunk，但当前计算口径下不是 `/` 或 `/course/[id]` 的 first-load JS；它仍应作为可视化路径的懒加载重点。
- 下一步优化优先级：先拆 `/course/[id]` 的 CodeMirror/可视化/数学渲染器，再拆 Tutor/CopilotKit 面板；优化后用同一口径重跑本节表格。

#### 2026-07-10 懒加载拆分后复测

执行结果：

- `ANALYZE=true pnpm --filter @primoria/web exec next build --webpack` 成功；webpack 编译约 98 秒，完整 build 成功。
- 保留同一 raw/gzip manifest 口径：`build-manifest.json` 的 `rootMainFiles` + route client-reference manifest 中被 server bundle 直接引用的 client chunks。
- 同步拆分点：
  - `/` 不再在页面顶层静态引用 Tutor workspace / Copilot provider；命中登录后 workspace 分支时再导入。
  - Home chat 内部把 Copilot provider + chat surface 改为动态 client island。
  - `/course/[id]` 不再由 route page 顶层包 Copilot provider；Course AI sidebar 首次展开时才加载 Copilot/chat/tool 注册。
  - Course block renderer 的 CodeMirror、mind map、widget、ECharts、Mermaid、physics、algorithm、math explorer renderer 改为按 block 动态加载。

| Route | Client refs | First-load JS raw | First-load JS gzip | Route-specific JS chunks |
|---|---:|---:|---:|---|
| `/` | 2 | 487.8 KiB | 152.4 KiB | `page-3930af749bf059f4.js` |
| `/course/[id]` | 1 | 898.0 KiB | 272.2 KiB | `course/%5Bid%5D/page-a09f2ed8fb069648.js` |
| `/course/[id]/outline` | 2 | 468.2 KiB | 146.0 KiB | `course/%5Bid%5D/outline/page-fc8c5d760cc865c0.js` |
| `/library` | 3 | 478.1 KiB | 147.2 KiB | `library/page-6b051bf22ca3fa51.js` |
| `/login` | 1 | 447.1 KiB | 139.3 KiB | `login/page-2ed425ae08667493.js` |
| `/signup` | 1 | 447.1 KiB | 139.3 KiB | `signup/page-2ed425ae08667493.js` |
| `/auth/sign-in` | 1 | 447.1 KiB | 139.3 KiB | `auth/sign-in/page-2ed425ae08667493.js` |
| `/auth/sign-up` | 1 | 447.1 KiB | 139.3 KiB | `auth/sign-up/page-2ed425ae08667493.js` |
| `/profile` | 2 | 456.6 KiB | 142.1 KiB | `profile/page-27e05ecaaee05e4e.js` |
| `/settings` | 4 | 458.6 KiB | 142.8 KiB | `settings/page-201495212d9910f1.js` |
| `/settings/facts` | 3 | 458.3 KiB | 142.7 KiB | `settings/facts/page-d2f3cacc0e3fddbf.js` |
| `/qa/widget-renderer` | 1 | 573.3 KiB | 164.3 KiB | `qa/widget-renderer/page-efd0a4fde2e3186b.js` |
| `/qa/batch-visual-mode` | 1 | 669.0 KiB | 196.8 KiB | `qa/batch-visual-mode/page-2a1d678d76056d7e.js` |
| `/qa/interactive-visual-results` | 1 | 660.0 KiB | 193.5 KiB | `qa/interactive-visual-results/page-ae826a05aee7e3c2.js` |
| `/dev/onboarding` | 1 | 429.0 KiB | 132.4 KiB | `dev/onboarding/page-4273dcc20d24843d.js` |
| `/debug/pipeline` | 1 | 400.8 KiB | 122.9 KiB | `debug/pipeline/page-22181e0a5d28017e.js` |
| `/stats` | 1 | 454.8 KiB | 141.3 KiB | `stats/page-9b2a8a2e015c132f.js` |
| `/weekly-report` | 1 | 454.8 KiB | 141.3 KiB | `weekly-report/page-9b2a8a2e015c132f.js` |
| `/upgrade` | 2 | 454.8 KiB | 141.3 KiB | `upgrade/page-9b2a8a2e015c132f.js` |

对比结论：

- `/`：2.04 MiB raw / 615.0 KiB gzip -> 487.8 KiB raw / 152.4 KiB gzip，约减少 76.6% raw、75.2% gzip。
- `/course/[id]`：2.50 MiB raw / 778.2 KiB gzip -> 898.0 KiB raw / 272.2 KiB gzip，约减少 64.9% raw、65.0% gzip。
- CopilotKit / streamdown / remark 相关 855.5 KiB 大 chunk 已不再进入 `/` 或 `/course/[id]` 首屏；Course AI sidebar 展开时才加载。
- CodeMirror 的 292.5 KiB + 190.6 KiB chunk 已不再进入 `/course/[id]` 首屏；遇到 code block 时才加载。
- `/course/[id]` 仍有 KaTeX 257.8 KiB 首屏 chunk，原因是 reader 仍静态使用 `CourseMarkdown` 渲染普通课程内容；这是下一轮可选优化点，但风险高于本轮面板/互动块拆分。

## P1 / 高优先级

### 3. “Teach me Python from the beginning” 生成的课程明显跑偏

- 状态：已确认。
- 复现路径：新账号 onboarding 学习目标输入 `Teach me Python from the beginning`。
- 实际结果：生成课程标题为 `Structure and Interpretation of Computer Programs`。
- 大纲偏差：包含 Scheme、SQL、higher-order functions、tail calls、macros 等内容，不符合 Python beginner 目标。
- 影响：用户第一条目标就被错误定位，会显著降低信任感。
- 处理建议：
  - 对 onboarding goal positioning 增加“入门/从零开始/初学者”语义约束。
  - Python 入门应优先定位到 Python graph 的基础主题，而不是 SICP 风格课程。
  - 在生成前显示可确认的定位结果，例如“我们将从 Python -> Syntax basics 开始”，允许用户改选。

### 4. onboarding 等待时间过长且缺少进度解释

- 状态：已确认。
- 复现路径：新账号完成 onboarding。
- 实测耗时：
  - 学习目标定位约 45 秒。
  - 背景选择后课程预生成约 90 秒。
- 用户看到：只有 `Locating...` 或 `Preparing course...`，没有进度、原因、预计耗时或后台继续提示。
- 影响：用户很容易认为页面卡死。
- 处理建议：
  - 把长任务改为明确的后台任务状态。
  - 展示阶段性进度，例如“匹配知识图谱 / 生成课程骨架 / 写入第一课”。
  - 超过固定阈值后提示“可先进入 workspace，课程会继续生成”。

### 5. 未登录首页 LandingPage 分支实际不可达

- 状态：已确认。
- 复现路径：无登录 cookie 访问 `/`。
- 实际结果：proxy 先重定向到 `/login?next=/`。
- 代码现象：首页 `page.tsx` 里有未登录时返回 `LandingPage` 的分支，但请求到不了这个分支。
- 影响：产品入口行为和代码意图不一致；如果预期是公开 landing，则当前被 auth gate 截断。
- 处理建议：
  - 明确 `/` 是公开 landing 还是登录后 tutor workspace。
  - 如果 `/` 应公开，需要把 `/` 加入 public path 或调整 proxy。
  - 如果 `/` 应登录后使用，应删除或改造不可达的 `LandingPage` 分支，避免维护误导。

## P2 / 中优先级

### 6. 课程生成后第一课入口点击行为不稳定

- 状态：需要进一步复测；浏览器实测中普通点击未跳转，强制点击或直接访问 href 可进入目标 URL。
- 复现路径：课程大纲页点击第一课 `Open`。
- 观察结果：
  - DOM 上存在正确 href：`/course/<courseId>?lessonId=<lessonId>`。
  - 普通点击和坐标点击曾停留在 outline 页面。
  - 直接打开 href 后进入课程阅读页，但触发了 dev server 长时间无响应。
- 影响：用户可能无法从大纲自然进入第一课。
- 处理建议：
  - 用真实 Chrome/Playwright 在 dev server 恢复后单独复测。
  - 检查 outline 页是否有点击事件、overlay、route transition 或 pending state 拦截链接跳转。

### 7. 注册成功跳转曾出现无反馈停留

- 状态：不稳定复现。
- 复现路径：第一次测试账号在 `/auth/sign-up` 提交注册。
- 观察结果：
  - 数据库用户和 session 已创建。
  - 同浏览器直接访问 `/library` 是登录态。
  - 页面当时停留在注册页，没有成功提示，也没有错误提示。
  - 第二个账号注册时正常跳转到 `/library`。
- 影响：如果在 web dev 编译或请求慢时出现，用户会重复提交或误以为注册失败。
- 处理建议：
  - 注册成功后给明确成功状态或跳转 fallback。
  - 对 `router.replace(next)` 后的长时间无导航做兜底提示。

## P3 / 体验与文案

### 8. 新账号 Library 空状态太弱

- 状态：已观察。
- 现象：新账号进入 Library 只显示 `No courses yet.` 和一个 CTA。
- 影响：对于第一次使用者，缺少“下一步会发生什么”的说明，尤其 onboarding 还没完成时更容易迷路。
- 处理建议：
  - 根据 onboarding 状态显示更明确 CTA：继续设置学习目标、进入 Tutor、查看正在生成的课程。

### 9. 课程大纲文案重复且偏模板化

- 状态：已观察。
- 现象：多个 lesson 描述都是 `Builds the core understanding of ... through ...`。
- 影响：大纲可读性弱，像机器模板，不像真正为用户目标设计的课程。
- 处理建议：
  - 生成课程大纲时加入更具体的学习产出和练习目标。
  - 避免 title 和 description 重复堆叠。

## 已验证正常的部分

- 本地 Postgres 可用。
- LangGraph agent `/info` 可用。
- KG migration、graph seed、embedding seed 完成后，onboarding 可以生成课程和第一课。
- 第二个测试账号注册后正常进入 Library。
- 课程 outline 可打开，第一课最终生成到 `generated`，数据库里有 14 个 lesson blocks。

## 本地记录

测试账号、密码和截图路径见：

- `temple/local-browser-qa-2026-07-09.md`

---

# 代码审查复核（2026-07-09，基于源码逐条核实）

复核方式：不依赖复跑浏览器，直接读当前 `main` 分支源码（截至 `1b6cdd49 Reuse RSC auth state on pages`），对每个问题定位到具体文件行号，确认根因、纠正误判、补充清单遗漏的缺陷，并给出多个可选方案。

## 整体概览

这批改动（auth 收敛、course reader 重构、本地 Postgres 化）方向是对的：ownership 过滤在 store 层做得干净（`getCourse`/`getCourseByGraph` 都强制 ownerId），课程创建的并发竞态有 unique-index + 恢复路径兜底（`initializeCourseOutline` 里的 `courses_owner_graph_uidx` 恢复逻辑是业界标准写法）。**最大的两个系统性风险不在清单里最显眼的位置**：

1. **错误处理是"裸透传"模式**——onboarding 三条路径都把 `error.message` 原样送到用户或直接吞掉，既泄露内部结构（P0-1 的真正根因），又制造了"静默失败"（见下文新缺陷 N-1，比清单里任何一条都更伤用户信任）。
2. **P1-3 的根因被清单定错了层**——不是定位算法跑偏，而是知识图谱数据本身标注错位。按清单的建议去改 routing 会白费功夫。

逐条核实结论速览：

| # | 清单判定 | 复核结论 |
|---|---------|---------|
| 1 | 属实 | **属实，且泄露面比清单描述更广（3 个独立泄露点）** |
| 2 | 属实 | 结构性属实（重依赖全部同步打包，有代码证据） |
| 3 | 属实 | 现象属实，**但根因在 KG 数据层，清单建议的修法无效** |
| 4 | 属实 | **部分过时**：goal 定位已是后台异步；45s 数据与当前代码矛盾，需重新测量；90s 的 background 步骤确实是同步阻塞 |
| 5 | 属实 | 属实，但有一个清单没发现的补充：**过期 cookie 可以穿透 proxy，LandingPage 分支"偶发可达"**，行为比"不可达"更混乱 |
| 6 | 待复测 | 代码侧无拦截因素，`Open` 是裸 `<Link>`；大概率是问题 2 的衍生现象。但暴露了一个真实缺陷：**课程路由无任何导航 pending 反馈** |
| 7 | 不稳定复现 | **机制已从代码确认**，不是玄学：导航期间 `pending` 被 `finally` 重置 |
| 8 | 属实 | 属实但比描述的略好（已有 `checkingBuilds` 分支） |
| 9 | 属实 | 属实，**但定性错误**：描述不是 LLM 生成得差，而是硬编码模板，根本没走 LLM |

---

## 逐条核实与方案

### 问题 1：数据库错误裸露给用户 —— 属实，泄露点有三处

清单只说"onboarding API 不要直接返回原始异常消息"，实际有三条独立的泄露路径，只堵一条没用：

- **泄露点 A**：`apps/web/src/app/api/onboarding/goal/route.ts:133` —— 同步路径（点 clarify chip 提交 graphId 时）catch 后直接 `error.message` 返回 422。
- **泄露点 B**：`apps/web/src/app/api/onboarding/background/route.ts:43` —— `buildOnboardingCourse` 在请求内同步执行，任何 DB/生成错误的 `error.message` 原样返回 503。
- **泄露点 C**：`apps/web/src/app/api/onboarding/goal/route.ts:72-76` —— 后台定位失败时 `saveLearningGoalPositioningFailure` 把 `error.message` **持久化进 profile**（`goalPositioningMessage`），再由 `onboarding-client.tsx:334` 和 `:585` 直接渲染。QA 看到的 `relation "public.kg_node_embeddings" does not exist` 就是走的这条路——错误被存进了数据库，之后每次打开 onboarding 都会再展示一次。

**用户角度**：看到 SQL 报错的用户会立刻断定"这产品不成熟"；更糟的是泄露点 C 把报错存了下来，即使后端已修复，老用户的 profile 里还留着那句报错。

**生产角度**：泄露表名/schema 结构给攻击者提供了侦察信息（虽然本项目参数化查询做得好，SQL 注入风险低，但信息泄露本身是 OWASP A05 范畴）。

**行为期望更新（2026-07-09 补充）**：产品期望是——库定位不可用（含缺 KG 表）时，onboarding 应像 Home 一样降级到自建 generated KG（gen_* 图谱）并基于它产出 lesson，两条路径口径统一。

针对这个期望，先核实两个事实：

- **Home 现在也做不到这一点。** 两条路径共用同一个定位核心 `positionLearningGoal`（`position-learning-goal.ts:87`）；缺表时 `searchKnowledgeGraphNodes` 直接 throw（`search.ts:108` 查询 `kg_node_embeddings`，无兜底），Home 的 `/api/knowledge-graph/position` 只是 catch 后返回白名单友好文案（`position/route.ts:21-31` 的 `userFacingError`），并不会转入自建 KG。`out_of_library` → `getOrCreateGeneratedGraph` 只在**搜索成功但相似度低于 floor** 时触发。所以"口径统一"实际拆成两件事：(a) 错误文案口径——onboarding 落后于 Home，Home 已有白名单映射；(b) 降级建 KG 的行为——两边都还没有，是新能力。
- **"表存在但没有 seed 数据"今天已经符合期望**：搜索返回 0 结果 → floor gate → freeform gate → `out_of_library` → generated graph（`position-learning-goal.ts:100-122`）。缺口只在"表不存在"这一类会 throw 的基础设施错误。另外 `getOrCreateGeneratedGraph` 写入的是主 schema 的 `generated_topic_graphs` 表（`generated-graph.ts:262`），不依赖 KG seed 表，所以降级路径在缺 KG 表的环境下确实可用。

方案（按此期望修订）：

- **方案 D（实现行为期望，推荐；落点必须在共享核心）**：在 `positionLearningGoal` 内（不是 onboarding route 内）对搜索错误做分类——命中"KG 基础设施缺失"类（Postgres `42P01` relation does not exist；可选：该 model_version 下 0 条 embedding）时，**合成一个空搜索结果**继续走下去，后面的 floor gate → freeform gate → out_of_library → generated graph 全部复用现有分支，一行新路径都不加。因为 Home 和 onboarding 都调这个函数，口径自动统一；在 onboarding route 里单独实现会立刻制造第二次口径分裂。
  - **错误分类必须用 error code 判断（`error.code === "42P01"`），不要用 message 正则**；且**只**对 schema 缺失类降级——`ECONNREFUSED`/超时这类瞬时故障必须照旧抛错，否则一次 DB 抖动就会把库内主题（如 Python）静默送去生成 gen 图，污染 `generated_topic_graphs` 且给用户更差的课程。
  - **降级必须响亮**：这条路径掩盖的是环境配置错误（没跑 KG migration）。要求同时：`console.error` 一次性告警 + `/api/health` 报 degraded（结合方案 C）+ positioning 日志里标记 `degraded: true`。静默降级是这个方案最大的坑。
  - **接受的代价要明说**：降级期间所有目标（包括库内主题）都会锚定到 gen_* 图；用户 profile 和课程会**永久**留在 generated 图上，之后补跑 migration 也不会迁回。对本地开发这是可接受的便利，对生产这是质量事故的放大器——生产环境更应该靠健康检查阻止带病启动，而不是依赖这条降级路。
- **方案 A（文案口径统一，仍然必须做，与 D 正交）**：把 Home 已有的 `userFacingError` 白名单映射抽成共享 helper，onboarding 三个泄露点（`goal/route.ts:133`、`background/route.ts:43`、`goal/route.ts:72-76` 持久化路径）接入。方案 D 只消化"缺表"这一类错误，LLM 超时、embedding 服务不可达、DB 整体宕机等其余错误仍会走到 catch，裸透传问题原样存在。注意同时**清洗已入库的 `goalPositioningMessage`**。
- **方案 B（升级版 A，业界标准）**：引入 `class UserFacingError extends Error`，业务代码中"允许用户看到的错误"显式用它抛出，API 层 `instanceof UserFacingError ? error.message : GENERIC_MESSAGE`。白名单思维（默认不可见）比正则过滤更不容易漏，且新错误类型默认安全。配合 500 响应带 correlation id。
- **方案 C（角色调整：从"拦截"变"可观测"）**：原建议是启动健康检查 fail-fast；在方案 D 落地后缺表不再阻断用户流程，健康检查的作用变为**让降级模式可见**——`instrumentation.ts` 启动时探测关键表，缺失则日志告警 + `/api/health` 返回 degraded。仍建议做，它是方案 D "响亮降级"要求的载体；生产环境可以额外配置为拒绝启动（env flag 控制严格程度）。

推荐组合：**D + A（或 B）+ C**。D 满足行为期望并统一口径；A/B 兜住 D 覆盖不了的所有其他错误；C 保证降级不静默。若只做 D 不做 A/B，QA 看到的裸 SQL 报错在 LLM/网络故障场景下依然会复现。

业界通行做法：RFC 9457 (Problem Details for HTTP APIs) 的错误响应结构 + 错误分类（user error / system error / dependency error）+ 显式降级模式（graceful degradation with health signal，参考断路器模式的半开状态语义）+ Sentry 类工具捕获未分类异常。

### 问题 2：dev server 首次编译阻塞 —— 结构性属实

代码证据支持清单的猜测：

- `apps/web/src/app/page.tsx:1-2` 和 `apps/web/src/app/course/[id]/page.tsx` 都**同步** import `CopilotKitProvider` + 完整 workspace/reader 客户端组件。
- `apps/web/src/components/course/block-renderer.tsx:26-34` 静态 import 了全部重型渲染器：`MermaidRenderer`（mermaid ~2MB+）、`EChartsRenderer`、`WidgetRenderer`、`PhysicsSceneRenderer`、`AlgorithmVisualizer`、`MathExplorerRenderer`。package.json 里 katex / mermaid / codemirror 全家桶都在依赖里。
- 整个 `apps/web/src` 只有一处 `next/dynamic`（`code-block-view.tsx:4`）。

也就是说：首次命中 `/` 或 `/course/[id]`，Turbopack 要编译 CopilotKit + mermaid + echarts + katex + codemirror 的完整模块图。5GB 内存峰值和 2.9GB `.next` 与这个规模一致。**生产 build 会好一些（编译是离线的），但首屏 JS 体积问题会原样带到生产。**

方案：

- **方案 A（收益最大，推荐先做）**：`block-renderer.tsx` 里按 block type 懒加载——每个可视化渲染器改 `next/dynamic(() => import(...), { loading: <Skeleton/> })`。一篇课文里没有 mermaid 块就永远不下载 mermaid。这是一次性的机械改动，风险低。
- **方案 B**：chat surface 懒加载——课程阅读页的 Copilot 面板在用户展开前不加载 `@copilotkit/react-core`。需要评估 `useFrontendTool` 等 hook 在 `course-detail-client.tsx:6` 的耦合程度，改动比 A 大。
- **方案 C（先量化再动手）**：接 `@next/bundle-analyzer` 跑一次 `pnpm build`，把每个 route 的 first-load JS 记录进文档，之后在 CI 里加 size budget（`size-limit` 或 Next 自带的 `experimental.largePageDataBytes` 告警思路）。业界做法是先有数字再优化，避免拍脑袋。

补充说明：dev 下 5GB/长时间无响应还可能叠加 Turbopack 自身问题，方案 A/B 做完后如果 dev 仍卡，再单独排查 Next 版本/Turbopack issue，不要混在一起归因。

### 问题 3：Python 入门被定位到 SICP —— 现象属实，根因定错层

**这是本次复核最重要的纠偏。** 实际检查 `apps/web/src/lib/knowledge-graph/data/topic-graph.Python.json`：

```
graphId: "Python"
subject: "Structure and Interpretation of Computer Programs"
topics: topic_intro → topic_hof (Higher-Order Functions) → Currying and Decorators → ...
```

这份图谱本身就是一门 CS61A（Berkeley 的 SICP-in-Python）风格课程，只是文件名叫 Python。定位管线**工作正常**：`Teach me Python from the beginning` 正确路由到了 `graphId=Python`，课程标题取自 `graph.subject`（`course-generator.ts:314-337` 的 `buildOutlineCourse`），于是用户看到 SICP。

**结论：清单建议的"对 goal positioning 增加语义约束"改不了这个 bug**——无论 routing 多聪明，库里就没有一份真正的 Python 入门图谱。

方案：

- **方案 A（数据修复，治本）**：二选一——(a) 把这份图谱的 subject/文件名改成如实的 `SICP with Python (CS61A)`，另建一份真正的 Python 入门图谱（语法→数据类型→控制流→函数→...）；(b) 只改 subject 标注，让 `Teach me Python` 走 out-of-library 的 generated-graph 路径（现有能力，`onboarding-positioning.ts:69-89` 已支持）。
- **方案 B（元数据 + 过滤）**：给每份图谱加 `audience` / `difficulty` 元数据，Stage-2 定位 prompt 里带上，"from the beginning / 从零开始"这类意图匹配 beginner 图谱。这是方案 A 的一般化，但没有 A 就没有可匹配的目标，**B 不能替代 A**。
- **方案 C（产品层保险丝，清单已提，值得做）**：定位结果先给用户一张确认卡（"将从 *SICP* 的 *Expressions and Statements* 开始 → 确认 / 换一个"）。这不修数据问题，但把所有未来的定位错误从"生成完才发现"变成"生成前可纠正"。onboarding 里 clarify chips 的 UI 模式可以直接复用。

业界通行做法：内容库带受众/难度元数据是在线教育产品的标配（Coursera/Khan 的 course metadata）；另外建议为 goal→graph 路由维护一组 **golden queries 回归集**（`Teach me Python from the beginning` 就该是第一条），每次改 positioning 跑一遍，这是 LLM 路由系统防回归的标准手段（vitest 里已有 `course-route-freeform.spec.ts` 的雏形，扩充即可）。

### 问题 4：onboarding 等待过长无反馈 —— 部分过时，需重新测量

当前代码与 QA 观测有矛盾，逐点核实：

- **goal 定位已经是异步的**：`goal/route.ts:96-99`——无 graphId 的提交只做 `savePendingLearningGoal` + `after()` 后台定位，应当亚秒返回。**45 秒的 `Locating…` 与当前代码不符**，可能测的是旧版本、clarify-chip 同步路径、或 dev 首次编译 API route 的时间。→ 需要带打点重测，不要按 45s 立项优化。
- **background 步骤确实同步阻塞**：`background/route.ts:33` 在请求内 await `buildOnboardingCourse`。不过对 library 图谱这条路径是确定性的（KG 展开 + DB 写入 + 入队，无 LLM 调用，`initializeCourseOutline` 和 `enqueueLessonGenerationJob` 都核实过）；90 秒不能由这段代码解释，嫌疑仍是 dev 编译或 DB 冷连接。→ 同样需要打点。
- 进度反馈的骨架其实已存在：done 步骤有 2.5s 轮询（`onboarding-client.tsx:301-321`）和"后台继续"文案。清单说"没有后台继续提示"不准确。

方案：

- **方案 A（先测量）**：给两个 onboarding 路由加 `Server-Timing` 头或结构化日志（positioning / graph-gen / outline / enqueue 各段耗时），复测一轮拿到真实分布再决定优化哪段。**推荐先做这个，成本半小时。**
- **方案 B（对称化）**：把 background 路由改成与 goal 一致的 `after()` 异步 + 轮询模式，`Preparing course…` 变成即时返回 + done 页轮询课程状态。改动小，且消除了下面 N-3 提到的 after() 单点问题的一半暴露面。
- **方案 C（统一 job 模型，中期）**：项目里已有一套设计良好的 `lesson_generation_jobs`（带 lease/heartbeat/stage）。onboarding 课程预生成本质是同类工作，长期应收敛为一种 job 表 + 一种轮询协议，而不是 `after()`、轮询、job 表三种机制并存。这是当前架构里"新旧风格混用"最明显的一处。

### 问题 5：LandingPage 分支不可达 —— 属实，但补充一个更微妙的行为

`proxy.ts:5-14` 的 `PUBLIC_PATTERNS` 不含 `/`，未登录访问 `/` 302 到 `/login?next=/`，`page.tsx:14` 的 LandingPage 分支正常流量到不了——清单正确。

**清单遗漏的部分**：`proxy.ts:44` 对页面路由**只检查 cookie 是否存在**，不校验有效性。持有过期/已注销 session cookie 的用户会穿透 proxy，`getCurrentUserForRsc()` 返回 null，于是 **LandingPage 会渲染**。也就是说这个分支不是死代码，而是"只对 session 过期的老用户可见"——同一个 URL，新用户看到 login，过期用户看到 landing，行为不一致比单纯不可达更难排查。

方案（先做产品决策，再改代码，三选一）：

- **方案 A**：`/` 是公开 landing → `PUBLIC_PATTERNS` 加 `/^\/$/`。注意 `page.tsx` 里已登录逻辑不变，代价是 `/` 的 RSC 对匿名流量也要执行。
- **方案 B**：`/` 是登录后工作台 → 删除 LandingPage 分支，改成 `redirect("/login")`，让 page 层和 proxy 层语义一致（过期 cookie 用户也会被正确送去登录，顺带修掉上面的不一致）。
- **方案 C**：landing 独立成 `/welcome`（public），`/` 永远 gate。营销页和应用壳解耦，后续 landing 要上静态化/SEO 时不受 `force-dynamic` 拖累。

业界做法：边缘层（middleware/proxy）做粗粒度 gate + 页面层做真实校验的双层结构本身是标准的；关键是**两层的 public 路由集合要出自同一份定义**（shared constant），现在 `PUBLIC_PATTERNS` 和各页面的 gate 逻辑是两份人肉同步的清单，这就是本问题的病根。

### 问题 6：第一课 Open 点击不跳转 —— 代码侧无拦截，判定为问题 2 的衍生现象

`course-outline-view.tsx:322`：`Open` 是纯 `<Link href=...>`，无 onClick、无 preventDefault；jump dialog 的遮罩只在 `jumpTarget` 非空时渲染（`:209`），正常列表状态没有 overlay。代码里找不到能吃掉点击的东西。

最可能的解释链：点击 → App Router 客户端导航 → 目标路由 `/course/[id]` 触发 dev 编译（问题 2）→ 页面长时间停留在 outline，**且没有任何 pending 指示**（`apps/web/src/app/course/[id]/` 下没有 `loading.tsx`）→ 肉眼判定"没跳转"。

**这暴露了一个清单没写的真实缺陷**：全站课程路由都没有导航 pending 反馈。即使生产环境 RSC 只慢 2 秒，用户的体感也是"点了没反应"，会连点。

方案：

- **方案 A（一行级）**：给 `course/[id]`（以及 outline、library）加 `loading.tsx` 骨架屏。App Router 原生机制，导航瞬间出骨架。
- **方案 B**：`Open` 链接用 `useLinkStatus`（Next 15.3+）或包一层 pending 样式，点击后按钮自身进入 loading 态。
- 复测方式照清单建议：dev 恢复后 Playwright 复测；若真还复现再深挖。

### 问题 7：注册成功后停留 —— 机制已从代码确认

不是不稳定的玄学，`auth-form.tsx:56-75` 的时序问题是确定的：

```
router.replace(next)      // 只是发起导航，不等完成
} finally {
  setPending(false)       // 导航还没完成，按钮立刻恢复可点
}
```

`router.replace` 返回后导航才刚开始；目标路由慢（dev 编译 / RSC 查询）期间，表单回到可提交状态、无成功提示——和 QA 观测完全吻合。第二次测试"正常"只是因为目标路由已编译过。**衍生风险**：用户此时再点一次"Create account"，同邮箱二次注册请求的行为（409 还是 500）需要确认幂等性。

方案：

- **方案 A（最小修复，推荐）**：成功路径不要在 `finally` 里重置——`setStatus("Signed in, entering workspace…")` 并保持 `pending=true`，只在 catch 里 `setPending(false)`。三行改动。
- **方案 B**：`startTransition(() => router.replace(next))` + `useTransition` 的 `isPending` 驱动按钮状态，导航完成前 UI 都处于过渡态。这是 App Router 的正统写法。
- **方案 C**：`window.location.assign(next)` 整页跳转。放弃 SPA 平滑性换取绝对可靠（浏览器自己会显示加载态），登录/注册这种一次性入口页用整页跳转在业界很常见（还能顺带刷掉所有客户端残留状态）。

### 问题 8：Library 空状态 —— 属实，程度比清单描述轻

`course-library-grid.tsx:200-202`。补充：`:201` 已有 `initialRefreshOpen ? checkingBuilds : noCourses` 分支，即"有课程在构建中"时文案会变，不是完全静态。缺的是 onboarding 未完成时的引导分支。改进方向清单已写对；实现上 `LibraryPage` 的 RSC 里已经能拿到 user，加一次 `getLearnerOnboardingState` 查询按 `complete` 分支文案即可，属于低风险小改。

### 问题 9：大纲文案模板化 —— 属实，但定性纠正

`Builds the core understanding of ... through ...` 不是"LLM 生成得像模板"，它就是硬编码模板：`course-generator.ts:351-360` 的 `plannedLessonDescription`，前端 `course-outline-view.tsx:411-438` 的 `lessonSummary` 兜底也是同构模板。**大纲描述从未经过 LLM**——outline 是 KG topics 的确定性展开，这是刻意的设计（快、免费、可预测）。

所以清单建议"生成课程大纲时加入更具体的学习产出"实际是一个**新功能**（引入 LLM enrich），不是修 bug。方案：

- **方案 A（零成本改良）**：模板本身多样化——按 topic 在 3-4 个句式间轮换 + 更充分利用 conceptNames。治标，但把"复读机感"降一档。
- **方案 B（推荐的中期方案）**：课程创建后，`after()` 里用**一次** LLM 调用为整个 outline 批量生成描述（一个 prompt 出全部 lesson 描述，JSON 返回，写回 lessons 表）。单次调用成本可控，用户打开 outline 时大概率已就绪；未就绪时回退模板。
- **方案 C**：随首课生成顺带 enrich 相邻 2-3 课的描述（渐进式）。实现最复杂，收益不一定比 B 高。

---

## 清单遗漏的缺陷（新发现）

### N-1（高）onboarding 课程预生成失败被静默吞掉，用户被告知"path is ready"

`goal/route.ts:37-42`：

```ts
async function buildCourseIfReady(...) {
  try {
    await buildOnboardingCourse(ownerId, profile);
  } catch (error) {
    console.warn("[onboarding] course prebuild failed:", ...);  // 到此为止
  }
}
```

后台定位成功但课程创建失败（LLM 超时、DB 抖动、gen-graph 失败）时：`goalPositioningStatus` 已是 `positioned`，**失败不落任何状态**。done 页轮询发现 status 不再 pending，就显示 "Your learning path is ready"，但 `courseId` 是 null，CTA 退化成 "Enter workspace"。用户永远等不到课程，也没有重试入口，也没有解释。**这比清单里任何一条对信任的伤害都大**：P0-1 至少让用户知道出错了，这条让用户以为一切正常。

修复思路：给 profile 增加课程预生成状态（或直接复用 job 表，见问题 4 方案 C）；失败时置 `failed` + 用户安全文案；done 页对 `positioned && !courseId` 的组合给出"课程创建中/失败，点此重试"而不是"ready"。同时 `console.warn` 升级为 `console.error` 并带 ownerId。

### N-2（中）goal 重提交存在 TOCTOU 竞态，旧目标可覆盖新目标

`goal/route.ts:44-78`：后台定位器在 LLM/embedding 调用结束后 `:49` 检查了一次 `goalStillPending`，但 `:62` 的 `saveLearningGoal` 不是条件更新。窗口期内用户提交了新目标 B（`savePendingLearningGoal(B)`），A 的定位器随后无条件 `saveLearningGoal(A)` 覆盖 → B 的定位器醒来发现 learningGoal 已不是 B，直接放弃 → 最终 profile 停在 A 的定位结果，用户最后输入的 B 丢失。

低概率但真实存在（定位耗时数秒到数十秒，窗口不小）。业界标准修法是**乐观并发**：`saveLearningGoal` 的 UPDATE 加 `WHERE learning_goal = $goal AND goal_positioning_status = 'pending'`，检查受影响行数为 0 则放弃——把 check-then-act 压成单条原子语句，比再读一次干净。

### N-3（中）`after()` 是无持久化的单点：进程重启 = 永久 pending

goal 定位和课程预生成都挂在 Next 的 `after()` 回调上，没有持久化队列。进程在回调完成前重启/崩溃（dev 下天天发生，生产部署时也会），`goalPositioningStatus` 永远停在 `pending`；done 页轮询无超时，用户看到 "being prepared" 直到天荒地老。

修复思路（按成本递增）：(a) 轮询侧兜底——`goalPositioningUpdatedAt` 超过 N 分钟仍 pending 就展示 failed 态文案和重试按钮；(b) GET `/api/onboarding` 服务端做同样的超时判定并顺带修状态；(c) 长期并入 job 表模型（有 lease/heartbeat，天然抗进程死亡）。业界共识：`after()`/fire-and-forget 只适合 telemetry 这类丢了无所谓的工作，**改变用户可见状态的工作必须可恢复**。

### N-4（低）public 路由集合双份维护

`proxy.ts` 的 `PUBLIC_PATTERNS` 与各页面自身的 gate 判断（如 `library/page.tsx` 的 `shouldGate`）是两套人肉同步的真相。问题 5 就是这种双份维护的第一次翻车。建议抽一个 `lib/auth/routes.ts` 常量，proxy 和页面共用。

### N-5（低）`course-outline-view.tsx:67-75` 课程刷新失败静默忽略

lesson job 完成后拉取新课程数据失败时 catch 后不做任何事（注释也承认了）。可接受的取舍，但配合 `refreshedRef` 去重意味着**这个 lessonId 永远不会再重试刷新**——失败一次就停留在旧数据直到手动刷新页面。把 `refreshedRef.current.add` 移到 fetch 成功之后即可修复，一行改动。

---

## 需要补充的信息

给出结论时假设的是"单实例 Node 部署 + 单 Postgres 的中小型生产环境"。以下信息会影响方案选型，请补充：

1. **生产部署形态**：单进程 self-host 还是多实例/serverless？决定 N-3 的严重度（serverless 下 `after()` 更不可靠）和问题 4 方案 C 的紧迫性。
2. **`/` 的产品定位**：公开 landing 还是登录墙？问题 5 的三个方案完全取决于这个决策。
3. **QA 45s/90s 的测量条件**：是否为 dev server 首次编译期间测得？建议按问题 4 方案 A 打点后重测一轮，再决定是否立项性能优化。
4. **注册接口幂等性**：同邮箱重复 sign-up 的预期行为（问题 7 的衍生确认项）。

## 后续行动建议（按优先级）

1. **修 N-1（静默失败）+ 问题 1 三个泄露点**——同一批改动：引入 `UserFacingError` + 统一 catch 收口 + 失败状态持久化 + 清洗已入库的报错文案。这是信任层面的止血，先于一切性能工作。若同批实现问题 1 方案 D（缺表降级自建 KG），注意落点必须在 `positionLearningGoal` 共享核心，且只对 `42P01` 类错误降级。
2. **问题 3 方案 A（KG 数据修复）**：改 Python 图谱标注 / 补真正的 Python 入门图，同时把该 query 加入 golden 回归集。数据改完前，问题 3 无解。
3. **问题 7 方案 A + 问题 6 方案 A**：注册 pending 态三行修复 + 课程路由 `loading.tsx`。半天内可完成的体验止血。
4. **问题 4 方案 A（打点）→ 问题 2 方案 A（block renderer 懒加载）**：先拿到真实耗时分布，再做收益最大的拆包。
5. **N-2 / N-3 兜底**（条件 UPDATE + pending 超时）：低成本防御性修复，可与 1 同批。
6. **可暂缓**：问题 5（等产品决策）、问题 8/9（体验增强）、问题 4 方案 C 与 N-4（架构收敛，放进下个重构窗口）。

不建议做的：按清单原文给 positioning 加"入门语义约束"（打错层，见问题 3）；在拿到打点数据前直接优化 onboarding 的 45s（数据与当前代码矛盾）。
