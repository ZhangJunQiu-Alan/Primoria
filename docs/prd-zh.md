# Primoria 产品需求文档（当前基线）

最后更新：2026-04-19

## 1. 产品定义

Primoria 是一个“创作者到学习者”的统一平台：

- Builder：创作、编辑、发布结构化互动课程
- Viewer：学习已发布课程，并获得进度、成就和社区反馈

当前核心目标：

1. 让创作者更快搭课
2. 保证课程发布与播放链路稳定
3. 让学习过程可追踪、可复盘、可持续优化

## 2. 用户角色

1. 学习者（`user`）：在 Viewer 学习课程
2. 订阅用户（`subscriber`）：后续付费能力扩展预留
3. 创作者（`author`）：重点使用 Builder 工作台
4. 管理员（`admin`）：平台管理与治理

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

### 3.2 Builder 当前能力

- 统一认证与路由守卫
- Dashboard：首页、课程管理、数据中心、粉丝管理
- 编辑器：
  - block 增删改排
  - `text`、`code-block`、`code-playground` 支持块内编辑
  - 手动保存、发布、导入、导出
  - AI 生成与草稿增强
- 课程可见性规则与学习端预览链路已经打通

### 3.3 Viewer 当前能力

- 登录注册、受保护路由与角色归一
- 首页、课程库、课程详情、学习、完课结果
- 社区：消息、讨论、学习房间、学习笔记
- AI Tutor：聊天、资料上传、文档转 quiz、文档转 mind map
- 个人中心、设置、成就墙

### 3.4 数据与内容兼容

- 课程 JSON 顶层规范键：`lessons`
- 历史 `pages` 仍兼容并自动迁移
- 当前 schema 版本：`1.0.0`
- 历史 block type 与可见性别名会在导入时自动归一化

## 4. 已交付的重点体验

- Dashboard 已完成统一重设计并并入主应用
- 课程管理支持创作主流程的关键操作
- 学习端具备从报名到完课的闭环
- AI Tutor 已支持聊天和基于资料的辅助生成
- 成就、XP 等学习反馈能力已接入当前体验

## 5. 非功能要求

1. 响应式布局覆盖桌面、平板、移动
2. 关键页面具备加载、空状态和错误状态
3. 课程 JSON 导入兼容历史结构
4. Builder 与 Viewer 在同一应用内保持一致导航和权限体验
5. 关键主流程应具备可回归的自动化验证

## 6. 本页不重复维护的内容

- 具体技术债、半成品功能和产品待办统一见 [technical-debt-register-zh.md](./technical-debt-register-zh.md)
- 历史变更统一见 [changelog.md](./changelog.md)
- 运行、发布和恢复步骤统一见 [viewer-react-cutover-runbook.md](./viewer-react-cutover-runbook.md)
