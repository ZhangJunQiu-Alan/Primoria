# Primoria 产品需求文档（当前基线）

最后更新：2026-05-13

## 1. 产品定义

Primoria 的最终产品目标是：用户用自然语言把学习主题、目标人群、难度、范围和风格告诉人工智能，系统生成一整套类似教科书的高质量完整课程。课程不是一组松散内容，而是可发布、可学习、可追踪的结构化互动课程。

课程内容的规范层级固定为：

```txt
Course -> Lesson -> Page -> Block
```

- 一个 `Course` 包含多个 `Lesson`
- 一个 `Lesson` 包含多个 `Page`
- 一个 `Page` 包含多个 `Block`
- `interactive-visual` 是最关键的 Block 类型，目标质量对齐 Brilliant 式互动学习体验：让学习者通过操作、观察、推理和即时反馈理解概念，而不是只看静态图文或装饰性动画

Primoria 是一个 AI 原生的“课程生成到互动学习”统一平台：

- Builder：通过自然语言和人工编辑共同完成完整课程生成、审校、编辑、发布
- Viewer：学习已发布课程，并获得互动练习、进度、成就和社区反馈

当前核心目标：

1. 支持从自然语言生成完整 Course，而不只是生成单个内容片段或轻量草稿
2. 保证生成结果符合 `Course -> Lesson -> Page -> Block` 结构，并能进入 Builder 审校、编辑和发布链路
3. 把 interactive visualization block 做成核心学习体验，承担概念解释、参数探索、过程演示和反馈引导
4. 保证课程发布与播放链路稳定
5. 让学习过程可追踪、可复盘、可持续优化

## 2. 用户角色

1. 学习者（`user`）：在 Viewer 学习课程
2. 订阅用户（`subscriber`）：后续付费能力扩展预留
3. 创作者（`author`）：重点使用 Builder 工作台
4. 管理员（`admin`）：平台管理与治理
5. 家长（parent 视图）：查看绑定学习者的学习情况

## 3. 当前功能范围

### 3.1 统一前端应用

- Primoria 当前只维护一个 React 前端：`packages/viewer-react`
- Builder 工作台已并入统一应用，核心路由为：
  - `/builder/dashboard`
  - `/builder/editor`
  - `/builder/editor/:courseId`
- 学习端核心路由为：
  - `/home`
  - `/library`
  - `/community`
  - `/ai-tutor`
  - `/profile`
  - `/settings`
  - `/achievements`
  - `/parent`

### 3.2 Builder 当前能力

- 统一认证与路由守卫
- Dashboard：首页、课程管理、数据中心、粉丝管理
- 编辑器：
  - block 增删改排
  - `text`、`code-block`、`code-playground` 支持块内编辑
  - 手动保存、发布、导入、导出
  - AI 生成完整课程草稿与结构审校，目标方向是从自然语言生成完整 Course 结构
  - interactive visualization 生成链路，用于把抽象概念转成可操作、可观察、可反馈的互动学习块
- 课程可见性规则与学习端预览链路已经打通

### 3.3 Viewer 当前能力

- 登录注册、受保护路由与角色归一
- 首页、课程库、课程详情、学习、完课结果
- Lesson Runtime 按 `Page` 推进学习，渲染 Page 内多个 Block，并记录学习行为
- 社区：消息、讨论、学习房间、学习笔记
- AI Tutor：聊天、资料上传、文档转 quiz、文档转 mind map
- 个人中心、设置、成就墙、家长面板

### 3.4 数据与内容兼容

- 课程 JSON 顶层规范键：`lessons`
- `lessons[].pages[].blocks[]` 是当前规范内容层级
- 历史顶层 `pages` 或 lesson 内直接 `blocks` 仍兼容并自动迁移为规范层级
- 当前 schema 版本：`1.0.0`
- 历史 block type 与可见性别名会在导入时自动归一化

## 4. 已交付的重点体验

- Dashboard 已完成统一重设计并并入主应用
- 课程管理支持创作主流程的关键操作
- 学习端具备从报名到完课的闭环
- AI Tutor 已支持聊天和基于资料的辅助生成
- interactive visualization block 已进入生成、预览和学习端渲染链路，后续质量目标是 Brilliant 式互动概念学习，而不是轻量展示组件
- 成就、XP、家长视图等学习反馈能力已接入当前体验

## 5. 非功能要求

1. 响应式布局覆盖桌面、平板、移动
2. 关键页面具备加载、空状态和错误状态
3. AI 生成的课程必须可被 schema 校验、可被 Builder 编辑、可被 Viewer 播放
4. Builder 与 Viewer 在同一应用内保持一致导航和权限体验
5. 关键主流程应具备可回归的自动化验证
6. interactive visualization block 必须优先验证默认可见状态、操作控件、实时反馈、移动端布局和学习目标一致性

## 6. 本页不重复维护的内容

- 具体技术债、半成品功能和产品待办统一见 [technical-debt-register-zh.md](./technical-debt-register-zh.md)
- 历史变更统一见 [changelog.md](./changelog.md)
- 运行、发布和恢复步骤统一见 [viewer-react-cutover-runbook.md](./viewer-react-cutover-runbook.md)
