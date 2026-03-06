# Primoria 文档索引

最后更新：2026-03-06

Primoria 由两个 Flutter 应用组成：
- `Builder/`：课程创作端（Flutter Web + Riverpod + GoRouter + Supabase）
- `Viewer/`：学习端（Flutter + Provider + Supabase）

## 当前产品状态

- Builder 已具备登录鉴权与角色门禁（`author` / `admin` 才能访问 Builder 受保护页面）。
- Builder 支持 AI 生成、保存/发布、JSON 导入导出、课时级编辑。
- Dashboard 当前 4 个 Tab：
  - 首页：已重设计
  - 课程管理：沿用现有生产逻辑（本轮重设计保持不变）
  - 数据中心：已重设计
  - 粉丝管理：已重设计
- Viewer 支持课程发现、报名、课时学习、个人设置、XP/连续学习/成就，以及 markdown 文本渲染。

## Builder 核心路由

- `/`：落地页
- `/dashboard`：创作者工作台
- `/builder`：编辑器
- `/viewer`：Builder 内预览
- `/auth/callback`：OAuth 回调

## Block 类型（规范值）

`text`、`image`、`code-block`、`code-playground`、`code-execution`、`function-flow`、`multiple-choice`、`fill-blank`、`true-false`、`matching`、`animation`、`video`

## docs 目录文件说明

- `prd.md` / `prd-zh.md`：当前需求基线
- `database-schema.md` / `database-schema-zh.md`：Supabase 实际 schema 与迁移说明
- `course-json-guide.md` / `course-json-guide-zh.md`：课程 JSON 规范
- `dashboard.md` / `dashboard-zh.md`：Dashboard 架构与 Tab 说明
- `test-checklist.md` / `test-checklist-zh.md`：与当前代码一致的回归清单
- `todo.md` / `todo-zh.md`：仅保留当前待办
- `changelog.md`：近期版本和关键架构变更
- `prompt.txt`：当前 block 规划提示模板

## 运行与验证

```bash
# Builder
cd Builder
flutter pub get
flutter analyze lib/features/dashboard
flutter test

# Viewer
cd ../Viewer
flutter pub get
flutter analyze
flutter test
```

## 说明

- 文档按“当前实现状态”维护，不再保留已失效草案描述。
- 历史上下文请查 git 提交记录。
