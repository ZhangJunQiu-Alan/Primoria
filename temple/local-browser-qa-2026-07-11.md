# Primoria 本地真实用户浏览器 QA 记录

测试时间：2026-07-11 19:18 CST
测试方式：Codex in-app Browser（`browser@openai-bundled`），真实本地服务 `http://localhost:3000`
测试账号：沿用当前浏览器会话中已登录的 Codex QA 测试账号；本记录不保存密码或会话凭证。

## 环境

- Web：`http://localhost:3000`
- Agent：`http://localhost:2024` 可达，根路径返回 `404 Not Found`（符合非根入口服务）
- 浏览器页面标题：`Primoria | Adaptive STEM Learning`
- 首屏状态：已登录，进入 Messages 首页
- 控制台：本轮各阶段未捕获相关 `warn` / `error`

## 真实用户路径与耗时

| 步骤 | 结果 | 耗时 |
| --- | --- | ---: |
| 打开 `http://localhost:3000` | 进入 Messages 首页，首屏有左侧导航、输入框、prompt chips | 约 4.5s |
| 从侧边栏进入 Library | 成功进入 `/library`，课程表格渲染 | 3.293s |
| 从 Library 回到 Messages | 成功回到 `/` | 3.102s |
| 点击 `Visualize` prompt chip | 直接发起 Newton's cradle 可视化请求 | 0.805s |
| Newton's cradle 响应首个可见 widget | 生成可见互动 widget，包含 Pause 控件 | 约 5.0s |
| 等待 widget 稳定 | 90s 内无控制台 warning/error，widget 保持可见 | 90.9s |
| 输入并发送短问题 | `Explain photosynthesis in one sentence.` 成功返回答案 | 12.380s |
| 打开账号菜单 | 菜单显示 Profile / Settings / Sign out | 0.868s |
| Library 搜索 `Python` | 表格过滤到 `Python Fundamentals` | 4.001s |
| 切换 Compact cards | 列表切换为卡片视图 | 1.000s |
| 打开 `Python Fundamentals` 课程 | 进入课程页，显示 `Running Python Programs` 1/14 | 4.299s |
| 点击课程内 `Continue` | 课程内容推进到 2/14 | 1.534s |

本轮从首个浏览器检查到课程 Continue 验证完成，总耗时约 228.467s，其中包含 90s 稳定性等待。

## 通过项

- 首屏不是空白页，也不是 Next.js / Vite / Webpack 错误 overlay。
- Messages 首页、Library、课程详情页均能渲染真实内容。
- Tutor 示例请求能生成可见 Newton's cradle widget。
- 手动输入的短问题能提交并返回答案。
- Library 搜索、表格/卡片视图切换、课程入口可用。
- 课程内 Continue 能推进学习步骤。
- 本轮所有已检查阶段未发现相关控制台 warning/error。

## 新发现

### BQA-2026-07-11-01：Composer 图标按钮缺少可访问名称

严重程度：低

现象：主输入框右侧发送按钮、禁用态按钮以及左侧附件按钮在 DOM / accessibility snapshot 中表现为无名称的 `button`。视觉上用户能看到图标，但自动化和屏幕阅读器无法从 accessible name 判断按钮用途。

复现步骤：

1. 打开 `http://localhost:3000` 并进入 Messages 首页。
2. 查看输入框周围可访问结构。
3. 观察到输入框右侧按钮显示为 `button` 或 `button [disabled]`，没有 `aria-label` / 可访问名称。

证据：

- 首屏 DOM snapshot 中输入框后方仅显示 `button [disabled]`。
- 输入文本后 DOM 中发送按钮仍是无 `aria-label` 的 `type="button"` 图标按钮。
- 坐标点击可以发送消息，说明功能可用；问题集中在可访问性和自动化可定位性。

建议修复：

- 给发送按钮增加稳定的 `aria-label`，例如 `Send message`。
- 给停止按钮、附件按钮也增加明确的 `aria-label`，例如 `Stop response`、`Attach file`。
- 如无特殊原因，提交按钮可考虑使用表单语义或明确 `aria-label`，避免只依赖图标。

## 观察项

- 点击 `Visualize` chip 会直接发起内置 Newton's cradle 请求，而不是只把 prompt 填入输入框。本轮未判定为 bug，因为它可能是设计意图；若产品期望 chip 只是填充输入框，需要单独调整交互文案或行为。
- 课程 Continue 会改变当前测试账号的本地课程进度；本轮已从 1/14 推进到 2/14。

## 截图

- Codex Browser 本轮已在对话中输出首屏、Library、账号菜单、Tutor 响应和课程 Continue 后截图。
- 本地临时截图：`/tmp/primoria-browser-qa-2026-07-11/final-course-step2.png`

## 未覆盖

- 移动端 viewport。
- 退出登录/重新登录流程。
- 创建新课程完整链路。
- 文件上传。
- Profile / Settings 详情页。
- LangGraph agent 非根 API 的深度健康检查。
