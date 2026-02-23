# Primoria（中文文档）

Primoria 是一个由两部分组成的 Flutter 系统，用于创建和学习交互式 STEM 课程。

- **Builder**：基于 Flutter Web 的课程创作工具，支持拖拽模块搭课并导出 JSON。
- **Viewer**：受 Brilliant.org 启发的 Flutter Web 学习端，用于消费课程内容并完成交互式学习。

本仓库包含这两个应用，以及共享课程 Schema 与产品文档。

## 系统架构

```
[Builder (Flutter Web)]
        |
        |  导出课程 JSON
        v
[课程 Schema (Course/Page/Block)]
        |
        |  在网站端加载/预览
        v
[Viewer (Flutter Website)]
```

后端：**Supabase（Postgres）**，用于账号、课程云端保存/发布、搜索/推荐等能力。

## 仓库结构

```
Primoria/
├── Builder/                     # 课程创作应用（Flutter Web）
├── Viewer/                      # 学习应用（Flutter Web）
├── supabase/                    # Supabase 后端（迁移、配置）
├── docs/                        # 项目文档
├── Design/                      # UI 设计稿（PNG）
├── Builder_temple/              # HTML 模板/原型
├── img/                         # 项目图片资源
├── CLAUDE.md                    # Claude Code 项目指南
└── .env.example                 # 环境变量模板
```

## 环境准备

### 前置要求
- **Flutter SDK**：3.35.0 或更高版本
- **Dart SDK**：3.9.0 或更高版本
- **IDE**：VS Code（Flutter 插件）或 Android Studio（Flutter 插件）

### 安装步骤

1. **安装 Flutter**：参考 [Flutter 官方安装文档](https://docs.flutter.dev/get-started/install)。

2. **验证安装**
   ```bash
   flutter doctor
   ```

3. **克隆仓库并安装依赖**
   ```bash
   git clone https://github.com/ZhangJunQiu-Alan/primoria.git
   cd primoria
   cd Builder && flutter pub get
   cd ../Viewer && flutter pub get
   ```

4. **运行应用**
   ```bash
   # Builder（Flutter Web）
   cd Builder && flutter run -d chrome

   # Viewer（Flutter Web）
   cd Viewer && flutter run -d chrome
   ```

## Builder 概览

**路由流程：** `/`（Landing）→ `/dashboard`（控制台）→ `/builder`（编辑器）→ `/viewer`（预览）

**核心能力：**
- 带登录弹窗的落地页（Supabase 认证：邮箱/Google）
- 含课程管理、数据概览、收入/评论卡片的 Dashboard
- 可搜索、分类的拖拽式模块编辑器
- 模块选中与属性编辑
- JSON 导入/导出与 AI 课程生成（Gemini）
- 代码运行模块（本地 Python-like 模拟器）

**源码结构：**
```
Builder/lib/
├── app/                         # GoRouter 路由
├── features/landing/            # 落地页 + 登录弹窗
├── features/dashboard/          # 课程管理控制台
├── features/builder/            # 模块编辑器 UI
├── features/viewer/             # 应用内预览
├── models/                      # 课程 Schema（Riverpod）
├── providers/                   # 状态管理
├── services/                    # Supabase、AI、导入导出
└── widgets/                     # 面板、画布、模块组件
```

## Viewer 概览

**核心能力：**
- 首页、搜索、课程、课时、个人中心等页面
- 交互式组件（滑块、反馈、动画）
- 本地持久化与基础服务
- 明暗主题支持

**源码结构：**
```
Viewer/lib/
├── components/                  # UI 组件
├── models/                      # 数据模型
├── providers/                   # 状态管理（Provider）
├── screens/                     # 页面
├── services/                    # 应用服务
└── theme/                       # 设计系统
```

## 文档索引

| 文件 | 用途 |
|------|------|
| `docs/prd.md` | 产品需求文档 |
| `docs/database-schema.md` | PostgreSQL 表结构设计 |
| `docs/course-json-guide.md` | Course JSON 编写指南 |
| `docs/dashboard.md` | Dashboard 架构说明 |
| `docs/test-checklist.md` | MVP 手工测试清单 |
| `docs/changelog.md` | 变更日志 |
| `docs/todo.md` | 任务待办 |

## 贡献

欢迎贡献。请提交清晰描述的问题或 PR。

## 许可证

当前许可证见 `Viewer/LICENSE`。

## 致谢

- 设计灵感：Brilliant.org
- 技术栈：Flutter
