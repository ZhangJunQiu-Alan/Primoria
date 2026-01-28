# Builder 可执行技术任务清单

> 目标：将 PRD 中 Phase 1 的 Builder MVP 拆成可落地的技术任务，支撑“Builder → JSON → Viewer”闭环。

---

- [x] 1. Builder 基础工程骨架（Flutter Web + 状态管理）
  - 背景：PRD 指定 Flutter Web + Riverpod/Bloc。
  - 技术任务：
    - [x] 在 `Builder/` 初始化或验证 Flutter Web 项目可运行（`flutter run -d chrome`）。
    - [x] 统一目录结构：`lib/app`, `lib/features/builder`, `lib/models`, `lib/services`, `lib/widgets`。
    - [x] 接入 Riverpod 或 Bloc，建立全局 ProviderScope / BlocProvider。
    - [x] 配置路由入口（`/builder`, `/viewer`）并添加占位页面。
    - [x] 建立全局主题入口（`theme.dart`），留出 tokens 接口。
  - 验收：浏览器可启动并进入 Builder 首页。

- [x] 2. Builder 主布局（三栏 + 顶部操作栏）
  - 背景：PRD 3.1 三栏结构 + 顶部"预览/保存/导出/发布"。
  - 技术任务：
    - [x] 实现顶栏（课程名、按钮区、用户入口占位）。
    - [x] 实现三栏布局：左侧模块面板、中央画布、右侧属性面板。
    - [x] 布局适配桌面宽屏，最小宽度下支持滚动或折叠。
    - [x] 建立布局状态（当前页面、选中模块、是否预览）。
    - [x] 预览按钮可返回 Builder，并展示当前课程内容（Viewer）。
    - [x] 顶栏移除保存按钮（需求调整）。
  - 验收：UI 布局稳定，控件可点击但业务可为空。

- [x] 3. 核心数据模型（Course / Page / Block）
  - 背景：PRD 5.1/5.2 JSON Schema 是 Builder 输出标准。
  - 技术任务：
    - [x] 定义 `Course`, `Page`, `Block` Dart model（含 `metadata`, `settings`, `blocks`）。
    - [x] 定义 `BlockType` 枚举（text, image, code-block, code-playground, multiple-choice）。
    - [x] 实现 JSON 序列化/反序列化（`toJson` / `fromJson`）。
    - [x] 实现 `id` 生成工具（UUID 或时间戳+随机）。
  - 验收：模型可独立序列化/反序列化且字段与 PRD 对齐。

- [x] 4. 模块面板（基础模块清单 + 拖拽入口）
  - 背景：PRD 3.2 MVP 基础模块列表。
  - 技术任务：
    - [x] 建立 `BlockRegistry`（类型 → 名称 → 图标 → 默认内容）。
    - [x] 左侧面板渲染模块卡片（列表或网格）。
    - [x] 支持拖拽开始（`Draggable`）并携带 `BlockType`。
    - [x] 窄屏仅显示 logo + 图标卡片，宽屏显示文字。
  - 验收：拖拽一个模块卡片可携带类型信息。

- [x] 5. 画布区域（模块实例渲染 + 顺序管理）
  - 背景：PRD 3.3 DragTarget + Stack 示例。
  - 技术任务：
    - [x] 实现 `BuilderCanvas` 组件（接收 blocks 列表）。
    - [x] 在画布中按 `position.order` 渲染模块组件。
    - [x] 支持空状态提示（"从左侧拖拽模块"）。
  - 验收：blocks 列表变化可实时反映在画布。

- [x] 6. 拖拽放置与模块实例化
  - 背景：Builder 核心体验是拖拽搭建。
  - 技术任务：
    - [x] 画布支持 `DragTarget` 接收 `BlockType`。
    - [x] Drop 时生成默认 `Block`（含 `id`, `type`, `content`, `style`）。
    - [x] 新 block 插入当前 page 的 `blocks` 列表末尾。
    - [x] 更新 state 后触发画布重新渲染。
  - 验收：拖拽模块后画布生成对应模块实例。

- [x] 7. 选中与属性面板联动
  - 背景：PRD 3.1 属性面板依赖选中态。
  - 技术任务：
    - [x] 支持画布模块点击选中（高亮样式）。
    - [x] 选中 block 写入全局状态（currentBlockId）。
    - [x] 属性面板读取选中 block 数据并展示。
    - [x] 属性修改回写 `Block` 数据并触发画布更新。
    - [x] 修复选中 block 查找（移除 `firstOrNull` 编译错误）。
  - 验收：点击模块后属性面板显示对应内容并可编辑。

- [x] 8. 基础模块渲染（text / image / code-block / multiple-choice）
  - 背景：MVP 必须可见可编辑。
  - 技术任务：
    - [x] `TextBlock`：支持 markdown/plain 渲染 + 对齐/间距样式。
    - [x] `ImageBlock`：支持 URL / 本地占位 + 尺寸样式。
    - [x] `CodeBlock`：只读代码渲染 + 语言标签。
    - [x] `MultipleChoiceBlock`：题干、选项列表、单选/多选标记。
    - [x] 文本块对齐/间距在画布与预览中生效。
    - [x] 预览端支持 Markdown 渲染（Builder 端仍为纯文本展示）。
  - 验收：四类模块在画布中可正常显示内容。

- [x] 9. Code Playground（编辑器 + 运行按钮 UI）
  - 背景：Python 课程核心模块，P0。
  - 技术任务：
    - [x] 集成代码编辑器组件（`code_text_field` 或替代方案）。
    - [x] 提供运行按钮与输出区（先做本地假数据回显）。
    - [x] 预留执行服务接口 `runCode()`（暂时返回占位）。
    - [x] 代码输入区背景加深，提升可读性。
  - 验收：代码输入、运行按钮、输出区可见且可交互。

- [x] 10. JSON 导出（Course → Schema）
  - 背景：Builder → Viewer 的关键出口。
  - 技术任务：
    - [x] 实现 `exportCourse()` 返回 JSON 字符串。
    - [x] 导出按钮触发文件下载（`course.json`）。
    - [x] 导出前做最小校验（是否存在页面与标题）。
    - [x] Web 下载与测试环境解耦（条件导入 + 平台 stub）。
  - 验收：点击导出生成符合结构的 JSON 文件。

- [x] 11. 基础保存机制（本地/远端占位）
  - 背景：MVP 交付物包含云端保存。
  - 技术任务：
    - [x] 本地保存（`localStorage` 或文件）实现快速持久化。
    - [x] 预留后端 API 接口（`saveCourse()`）。
    - [x] 添加保存状态提示（"已保存/未保存"）。
    - [x] 保存按钮入口已移除（需求调整，服务层保留）。
  - 验收：刷新页面后可恢复最近一次保存内容。

- [x] 12. 页面管理（多页面切换 + 新增）
  - 背景：course schema 以 pages 数组组织内容。
  - 技术任务：
    - [x] 页面切换 UI（顶部或底部 tabs）。
    - [x] 新增页面功能（默认标题 + 空 blocks）。
    - [x] 页面删除与重命名（基础功能即可）。
  - 验收：可新增多页并在页面间切换编辑。

- [x] 13. Design Tokens 接入（颜色/间距/字体）
  - 背景：PRD 5.3 tokens 保证 UI 一致性。
  - 技术任务：
    - [x] 定义 `design_tokens.dart`（颜色、间距、字体大小）。
    - [x] 全局主题映射 tokens 到 `ThemeData`。
    - [x] 关键组件（按钮、面板、模块）使用 tokens 替代硬编码。
  - 验收：UI 颜色/间距来源统一且可集中调整。

- [ ] 14. MVP 验收清单与内部测试
  - 背景：PRD Week 11-12 需要打磨与测试。
  - 技术任务：
    - [ ] 编写“Builder MVP 手工测试清单”（拖拽、编辑、导出、导入、预览）。
    - [ ] 补充关键 widget / model 测试（序列化、导入导出）。
    - [ ] 性能与稳定性自检（大课程渲染、频繁拖拽）。
    - [x] 修复 `flutter test` 环境（`dart:html` 条件导入）。
    - [x] 新增 Builder smoke test 并通过。
  - 验收：清单全部通过并记录问题清单。

---

# 近期修复与调整记录（互动纠正整合）

- [x] 窄屏模块库仅显示 logo + 图标，宽屏显示文字。
- [x] 代码运行块输入区背景修正为深色，输入可读。
- [x] 预览页返回按钮可用，且展示当前课程内容。
- [x] 顶栏保存按钮移除（需求调整）。
- [x] 文本块对齐/间距样式生效（画布 + 预览）。
- [x] 修复 `firstOrNull` 导致的编译错误。
- [x] `CourseExport` Web/VM 分离以通过测试。
- [x] `flutter test` 已可通过。

# 当前待补/注意

- [ ] 画布渲染尚未按 `position.order` 排序。
- [ ] Code Playground 输入内容未写回 block content。
- [ ] Builder 端文本块未启用 Markdown 渲染（预览端已支持）。
