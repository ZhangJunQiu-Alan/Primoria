# Code Block 可执行化 — 实现文档

> 本文档是 Course Code Block「可编辑 + 可运行 + 可保存」功能的实现规格与计划。
> 实现时严格以本文档为准；与 `feature_specification.md` 冲突时，以 feature_specification.md 为最高约束。
> 本功能在 feature_specification.md 中未定义，已获用户单独授权（迭代三范畴）。

## 1. 目标

课程 lesson 里的 `code` block 从「只读展示」升级为交互单元：
- 内嵌代码编辑器，用户可修改代码。
- 「Run」运行代码，底部 output 面板显示结果。
- 「Save」覆盖保存到该用户的 lesson 副本。
- 「恢复初始代码」可还原 AI 生成的原始代码。

## 2. 已确定的边界（决策记录）

| # | 边界 | 决策 |
|---|------|------|
| 1 | 执行后端 | 混合：JS / Python 走浏览器；其它语言不显示 Run 按钮 |
| 2 | Python 运行时 | Pyodide（WASM），懒加载、同页共享实例、按需自动装包 |
| 3 | 首次加载体感 | 接受首次 Run 数秒「正在加载运行环境…」 |
| 4 | 执行隔离 | Web Worker；死循环 / 超时 **5s** 后 terminate 并提示 |
| 5 | 命名空间 | 每次 Run 重置，不保留上次变量 |
| 6 | `input()` | 不支持，命中报「暂不支持输入」 |
| 7 | 输出 | stdout/stderr 文本 + matplotlib PNG 图，依次内嵌在 output 面板 |
| 8 | 编辑器 | CodeMirror 6（不用 Monaco，过重） |
| 9 | 持久化 | lesson 为 per-user 可编辑副本；Save 覆盖 `block.code` |
| 10 | 原始代码 | 新增 `originalCode` 字段保留生成版本，提供「恢复初始代码」 |
| 11 | 未保存离开 | beforeunload / 路由切换提示 |
| 12 | 可运行语言 | 仅 `language ∈ {python, javascript}` 显示 Run；其它只读 |
| 13 | learning_events | 本期**不写入** |
| 14 | 可编辑范围 | 本期仅 `code` block 可编辑 |

## 3. 类型变更

`apps/web/src/lib/courses/types.ts` — `CodeBlock` 增加可选字段：

```ts
export type CodeBlock = BlockBase & {
  type: "code";
  language: string;
  code: string;          // 当前（可能被用户改过）的代码
  explanation: string;
  originalCode?: string;  // AI 生成的初始代码；首次保存时若缺失则回填，用于「恢复初始」
};
```

- 历史 block 没有 `originalCode`；首次编辑/保存时，把当前 `code` 写入 `originalCode`（仅当为空），保证「恢复初始」始终有目标。
- 「恢复初始」= 把编辑器内容设回 `originalCode`（不自动保存，由用户再点 Save 落库）。

## 4. 执行内核（前端）

新建 `apps/web/src/lib/code-runner/`：

```
code-runner/
  index.ts          // 对外 API: runCode(language, source) -> Promise<RunResult>
  worker.ts         // Web Worker 入口；按语言分派
  pyodide-runtime.ts// Pyodide 懒加载 + matplotlib patch + 自动装包
  js-runtime.ts     // JS 执行 + console 捕获
  types.ts          // RunResult / OutputChunk
```

### 4.1 RunResult / 输出模型

```ts
type OutputChunk =
  | { kind: "stdout"; text: string }
  | { kind: "stderr"; text: string }
  | { kind: "image"; mime: "image/png"; dataBase64: string }; // matplotlib

type RunResult = {
  status: "ok" | "error" | "timeout";
  chunks: OutputChunk[];
  errorMessage?: string;
};
```

### 4.2 隔离与超时

- 所有执行进 **Web Worker**（`worker.ts`）。主线程发 `{ language, source }`，Worker 回 `RunResult`。
- 主线程设 5s 定时器；超时则 `worker.terminate()`，返回 `{ status: "timeout" }`，并销毁缓存的 Worker（下次 Run 重建）。这能杀掉同步死循环。
- 每个 lesson 页面维护**一个共享 Worker**（含已初始化的 Pyodide）；只有 timeout 后才重建。

### 4.3 Python（Pyodide）

- 首次需要时 `loadPyodide()` 从 CDN 加载（见 §7 CSP/allowlist）。期间向 UI 发「正在加载运行环境…」状态。
- 装包：核心 + 运行用户代码前调用 `pyodide.loadPackagesFromImports(source)` 自动加载 numpy / pandas / matplotlib 等可用包。
- **命名空间重置**：每次 Run 用全新 dict 作为 globals 执行，不复用上次。
- **stdout/stderr 捕获**：重定向 `sys.stdout` / `sys.stderr` 到缓冲，运行后回收为文本 chunk。
- **matplotlib**：设 `matplotlib.use("AGG")`；运行后遍历所有 figure，`savefig` 到 PNG buffer → base64 → image chunk；然后 `plt.close('all')`。
- **`input()`**：在 globals 注入一个抛 `NotImplementedError("暂不支持输入")` 的 `input`，运行时命中即报错。

### 4.4 JavaScript

- 在 Worker 内执行用户源码（`new Function` 或动态 import blob）。
- 捕获 `console.log/info/warn/error` → stdout/stderr chunk。
- 无 DOM 访问（Worker 环境天然无 `document`）。
- 5s 超时由主线程 terminate 兜底。

## 5. UI 变更

`apps/web/src/components/course/block-renderer.tsx` — 替换 `CodeBlockView`，并抽出独立组件 `apps/web/src/components/course/code-block-view.tsx`（client）。

结构：
```
BlockShell(kind="code")
  explanation (CourseMarkdown)
  CodeMirror 编辑器（language 高亮）
  工具条: [Run] [Save] [恢复初始]   语言标签
  Output 面板（折叠/展开；文本 + PNG 图依次堆叠；运行中 spinner；超时/错误样式）
```

- Run/Save/恢复 仅当 `language ∈ {python, javascript}`（归一化大小写：`py`→python, `js`→javascript）。其它语言渲染保持原只读 `<pre>`。
- **脏状态**：编辑器内容 ≠ 已保存 `code` 时标记 dirty → Save 高亮；注册 `beforeunload` 提示；课程内路由切换也提示（见 §6）。
- Save 成功后清除 dirty、更新基线。
- 只需 `courseId`（已透传）+ block 自带的 `id`。保存无需 lessonId：`updateBlock`/`mutateBlocks` 已按 blockId 跨所有 lesson 定位，故不改透传链。

依赖（新增到 `apps/web/package.json`）：
- `codemirror` / `@codemirror/lang-python` / `@codemirror/lang-javascript`（或合并的 `@uiw/react-codemirror` 简化集成——实现时二选一，优先 `@uiw/react-codemirror`）。
- Pyodide 通过 CDN 运行时加载，**不**作为 npm 依赖（与现有 widget 库加载方式一致）。

## 6. 持久化 API

复用 `PATCH /api/courses/[id]/blocks/[blockId]`（`route.ts`），扩展其 schema：

```ts
const PatchSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("mind_map"), root: z.unknown() }),
  z.object({ type: z.literal("code"), code: z.string() }),
]);
```

- `code` 分支：读取现有 block，仅覆盖 `code`；若 `originalCode` 为空则把**旧的** `code` 写入 `originalCode`。其余字段不动。
- **补齐鉴权**：当前该路由未调用 auth/owner 校验。改为 `requireAuth` 取得 ownerId，并把 ownerId 传给 `updateBlock(courseId, blockId, next, ownerId)`，确保只能改自己的副本。
- 「恢复初始」在前端把编辑器设回 `originalCode`，由用户再 Save 落库（无需新端点）。

`updateBlock` / `mutateBlocks` 已能按 lesson 定位 block，无需改动 store 逻辑（仅传 ownerId）。

## 7. CSP / 依赖 allowlist

- Pyodide 从 CDN（`cdn.jsdelivr.net/pyodide/...`）加载脚本 + WASM + 包。需确认：
  - 项目无全局 CSP 阻断（已查：当前无 next.config/middleware 级 CSP，默认放行；若后续加 CSP 需 allow `script-src`/`connect-src`/`wasm-unsafe-eval` 指向该 CDN）。
  - 与 widget 的 `ALLOWED_DEPENDENCY_URLS` 是两套机制：widget 在 iframe 内，code-runner 在 Worker 内，互不影响。code-runner 的 CDN 地址在 `pyodide-runtime.ts` 内常量固定。

## 8. 测试

项目无 test runner，按现有约定用 tsx/node 直跑：
- `apps/web/tests/code-block-runner.unit.ts` — JS 执行：stdout 捕获、错误、超时返回形态（Worker 在 node 下需 mock，或抽纯函数测分派逻辑）。
- `apps/web/tests/code-block-view-static.unit.ts` — 静态断言：Run 按钮仅在 python/javascript 出现；恢复/Save 存在。
- 手测脚本：跑一段含 `print` + matplotlib 的 Python、一段死循环验 5s 超时、一段 `input()` 验报错。
- `node --check` 不涉及（无 agent 改动）。

## 9. 实现顺序

1. 类型：`CodeBlock.originalCode`（types.ts）。
2. 执行内核：`code-runner/`（JS 先通，Python 后通），独立可单测。
3. UI：`code-block-view.tsx` + 接入 block-renderer；先编辑器+Run+output，后接 Save/恢复/脏状态。
4. 持久化：扩展 PATCH schema + 补鉴权 + originalCode 回填（getCourse 内读现有 block，不需 lessonId）。
5. CSP/allowlist 核验。
6. 测试 + 手测。

## 10. 明确不做（本期）

- 不写 learning_events（`chat.code_run` / 课程 code_run 事件留待后续）。
- 仅 code block 可编辑，其它 block 类型不加编辑。
- 不支持 `input()` / 交互式 stdin。
- 不支持 JS/Python 以外语言运行。
- 不跨 Run 保留命名空间状态。
