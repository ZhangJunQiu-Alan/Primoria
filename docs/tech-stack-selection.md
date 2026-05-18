# AI 教育产品技术选型建议

## 1. 项目目标

这个项目计划构建一个 AI 教育软件，目标同时覆盖：

- Web 端
- iOS 端
- Android 端
- 后端 AI 能力、任务编排、用户数据、课程内容和学习流程

产品早期应优先保证：

- 三端尽快上线
- 前后端开发效率高
- AI 能力容易迭代
- 后续可以扩展到实时互动、智能助教、多 Agent 工作流
- 技术栈不要过度复杂

## 2. 推荐结论

推荐采用：

- Web 端：Next.js
- iOS / Android：Expo + React Native
- 后端主语言：TypeScript / Node.js
- AI 编排与异步任务：iii SDK
- 数据库：PostgreSQL
- 缓存与队列：Redis，必要时结合 iii 的 queue / trigger 能力
- 文件存储：S3 兼容对象存储
- AI 模型接入：OpenAI / Anthropic / 本地模型网关，统一封装在后端

核心思路是：

前端用 React 技术栈统一 Web 和移动端开发体验；后端用 TypeScript 保持团队语言一致；AI 任务流、Agent 编排、触发器、队列和共享状态交给 iii SDK 承担。

## 3. 为什么选 Next.js 做 Web 端

Next.js 适合承担 AI 教育产品的 Web 端和管理后台。

适合的原因：

- 适合做登录、课程页、学习面板、教师后台、管理后台
- SEO 和内容页能力强，适合教育类产品做公开课程页、介绍页、知识库
- React 生态成熟，组件库、表单、富文本、图表、权限管理都容易找到方案
- 可以做全栈 Web 应用，也可以只作为前端调用独立后端 API

在本项目里，Next.js 建议承担：

- 官网和课程展示页
- 学生 Web 学习端
- 教师后台
- 管理后台
- 运营配置页面

## 4. Expo 是什么，为什么选它

Expo 可以理解为 React Native 的完整开发工具链。React Native 负责跨 iOS / Android 的界面开发，Expo 负责让开发、调试、构建、发布和更新更顺畅。

Expo 的价值：

- 一套代码覆盖 iOS 和 Android
- 开发体验比裸 React Native 更简单
- 官方提供构建、发布、OTA 更新等工具
- 支持相机、通知、文件、权限等常见移动端能力
- 与 React / TypeScript 技术栈一致，团队可以复用很多前端经验

在本项目里，Expo 建议承担：

- 学生移动端 App
- 练习、答题、AI 对话、学习进度查看
- 推送通知
- 离线或弱网学习能力的逐步增强

## 5. iii SDK 能不能用于后端

可以。

iii SDK 更适合放在后端，不建议早期直接暴露给普通前端客户端。

iii 适合承担：

- AI Agent 工作流
- 后台异步任务
- 队列任务
- 多步骤学习任务生成
- 作业批改流程
- 内容生成和审核流程
- 学习报告生成
- 实时事件和触发器

可以设计成：

```text
Web / iOS / Android
        |
        v
应用后端 API
        |
        v
iii workers / triggers / queues
        |
        v
AI 模型、数据库、文件存储、通知服务
```

这样前端只调用稳定的业务 API，iii 负责后端内部的 AI 编排和任务执行。

## 6. 推荐后端架构

后端建议分成三层：

### 6.1 API 层

负责：

- 用户登录和权限
- 课程、班级、作业、学习记录 API
- 支付和订阅接口
- 前端请求鉴权
- 聚合数据返回

推荐技术：

- Node.js + TypeScript
- NestJS 或 Fastify
- PostgreSQL
- Prisma 或 Drizzle

### 6.2 AI 服务层

负责：

- AI 对话
- 学习路径生成
- 作业批改
- 题目生成
- 课程摘要
- 学情分析
- Prompt 管理
- 模型路由和成本控制

推荐技术：

- iii SDK
- TypeScript workers
- 必要时引入 Python workers 处理 NLP、数据分析或模型推理

### 6.3 数据与基础设施层

负责：

- 用户数据：PostgreSQL
- 缓存：Redis
- 文件：S3 兼容对象存储
- 搜索：Meilisearch / Elasticsearch，早期可以暂缓
- 向量检索：pgvector，早期优先使用 PostgreSQL 内置扩展
- 日志与监控：OpenTelemetry + 云服务日志

## 7. 推荐代码仓库结构

早期建议使用 monorepo：

```text
primoria/
  apps/
    web/          # Next.js Web 端
    mobile/       # Expo iOS / Android
    api/          # 后端 API
  workers/
    ai/           # iii AI workers
  packages/
    shared/       # 共享类型、工具函数
    ui/           # 可复用 UI 组件，后期再抽
    config/       # ESLint、TSConfig 等配置
  docs/
    tech-stack-selection.md
```

monorepo 的好处：

- Web、App、API 共享 TypeScript 类型
- 接口变更更容易同步
- 早期团队协作成本低
- 便于统一 lint、测试和 CI

## 8. 备选方案对比

### 8.1 Flutter

Flutter 也能同时覆盖 iOS、Android 和 Web。

适合 Flutter 的情况：

- 团队更熟悉 Dart
- 希望移动端体验高度一致
- 产品更偏 App，而不是 Web 内容和后台

不优先推荐 Flutter 的原因：

- AI 教育产品通常需要强 Web 能力、后台、内容页和运营页
- React / Next.js 生态在 Web 产品和后台系统上更成熟
- 如果 Web 和 App 都很重要，Next.js + Expo 更灵活

### 8.2 原生 iOS + 原生 Android

原生开发体验最好，但早期成本最高。

不建议早期采用，除非：

- App 性能要求极高
- 有大量原生音视频、图形、硬件能力
- 团队已有成熟 iOS / Android 工程能力

### 8.3 纯 Web / PWA

可以作为早期低成本验证方案，但不适合作为最终移动端方案。

原因：

- iOS 上 PWA 能力仍有限
- 推送、系统集成、App Store 分发体验不如原生 App
- 教育产品通常需要更稳定的移动端体验

## 9. 第一阶段实施建议

第一阶段不要一开始做太重。建议按以下顺序推进：

1. 建立 monorepo
2. 初始化 Next.js Web 端
3. 初始化 Expo 移动端
4. 初始化 API 服务
5. 建立 PostgreSQL 数据模型
6. 接入登录系统
7. 做一个最小学习闭环：课程 -> 练习 -> AI 反馈 -> 学习记录
8. 再接入 iii SDK 做异步 AI 任务和 Agent 编排

第一个 MVP 不建议一开始就做复杂多 Agent。应先把学习主流程跑通，再把 AI 能力逐步拆进 iii workers。

## 10. 当前建议

当前最稳妥的技术路线是：

```text
Next.js + Expo + TypeScript API + PostgreSQL + iii SDK
```

这套方案兼顾：

- 三端覆盖
- Web 和后台能力
- 移动端上线速度
- AI 后端扩展能力
- 团队长期维护成本

后续如果产品确认以移动端为绝对核心，再评估是否需要更深的原生能力；如果产品以 Web 学习和教师后台为核心，则这套方案可以长期使用。

## 11. 参考资料

- Next.js: https://nextjs.org/docs
- Expo: https://docs.expo.dev
- React Native: https://reactnative.dev
- Flutter Web: https://docs.flutter.dev/platform-integration/web
- iii Browser SDK: https://iii.dev/docs/api-reference/sdk-browser
- iii Functions / Triggers / Workers: https://iii.dev/docs/primitives-and-concepts/functions-triggers-workers
