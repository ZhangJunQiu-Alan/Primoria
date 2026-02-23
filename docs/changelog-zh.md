# 变更日志

## [未发布] - 2026-02-18（Viewer 数据库集成）

### 摘要
Viewer 与 Supabase 数据库已完成全链路接入：四个核心页面（Home、Search、Course、Lesson）均可读写真实数据。新增受保护路由、登录 Remember Me、退出确认弹窗、Profile 统计同步，以及两个迁移（课时完成 RPC + 种子数据）与 8 个课程/游戏化服务方法。

### 新增
- **`complete_lesson_and_award_xp` RPC**（`supabase/migrations/20260218000001_complete_lesson_rpc.sql`）：原子 PostgreSQL 函数，upsert `lesson_completions`，通过 `xp_transactions` 幂等检查保证仅首次完成发放 XP，并更新 `user_stats`、每日活跃日志与连续打卡。`SECURITY DEFINER`，使用 `auth.uid()`。
- **种子数据迁移**（`supabase/migrations/20260218000002_seed_data.sql`）：幂等（`ON CONFLICT DO NOTHING`）本地开发数据，包含 5 学科（CS/Math/Science/Business/Social）、8 门已发布课程、10 个章节、19 个课时（`content_json` 含 info_card/multiple_choice/slider）及 9 个成就定义。
- **`SupabaseService` 课程方法**：`getSubjects()`、`getCourses({subjectId, searchQuery})`（含 `search_courses` RPC 回退）、`getEnrollments()`、`getCourseDetail(courseId)`、`getLessonContent(lessonId)`、`enrollInCourse(courseId)`、`updateEnrollmentProgress({courseId, progressBp})`、`completeLessonAndAwardXp({lessonId, score, timeSpentSeconds})`。
- **认证守卫**（`Viewer/lib/main.dart`）：`_AuthGuard` 包装 `/home`、`/course`、`/lesson` 路由；在 `UserProvider` 初始化期间显示 loading，未登录通过 `addPostFrameCallback` 跳转 `/login`。
- **Remember Me**（`Viewer/lib/screens/login_screen.dart`、`storage_service.dart`）：`StorageService.saveRememberMe()` / `getRememberMe()` / `getRememberedEmail()` 将勾选状态和邮箱持久化到 SharedPreferences；`initState` 自动回填。
- **退出确认弹窗**（`Viewer/lib/screens/profile_screen.dart`）：`_showLogoutDialog()` 使用 `StatefulBuilder` 展示 loading 状态，确认后调用 `userProvider.logout()` 并 `pushReplacementNamed('/login')`。
- **`UserProvider.refreshStats()`**：对 `_loadStatsFromBackend()` 的公共封装，便于课时完成后主动刷新 XP/统计。

### 变更
- **HomeScreen**：改为 `StatefulWidget`，`_loadHomeData()` 拉取当前在学课程与 `getCourseDetail()`；展示真实课程名、`LESSON X/N`、章节完成点；无在学课程时显示 “Browse Courses”；XP 计数读取 `userProvider.totalXp`。
- **SearchScreen**：重写为数据库驱动；分类标签从 DB 加载，课程按学科或搜索词加载；课程卡携带真实 `courseId` 跳转 `CourseScreen`。
- **CourseScreen**：从 `StatelessWidget` 改为 `StatefulWidget`；`_loadCourseData()` 拉取章节/课时/完成状态；章节节点展示 completed/inProgress/available；底部弹层展示真实课时并可跳转；未报名时显示 “Enroll in Course”。
- **LessonScreen**：`_initLesson()` 读取 `content_json` 并解析 block（`info_card`/`multiple_choice`/`slider`）；在 `lessonId` 为空或失败时回退 demo；最后一页调用 `completeLessonAndAwardXp` 并 `userProvider.refreshStats()`；滑块默认值按题目初始化。
- **ProfileScreen**：统计行改为读取后端同步值（`totalXp`、`followingCount`、`followersCount`），`bio` 非空时显示；退出按钮改为弹窗；新增 `_formatStat()`（1,234 / 12K / 1.5M）。
- **UserProvider**：新增 `_isInitialized` 与 `isInitialized` 供 auth guard 使用；`UserData` 增加 `bio`；`initialize()` 与 `login()` 后异步触发统计/资料同步；新增 `_followingCount` / `_followersCount` 状态。

---

## [未发布] - 2026-02-18

### 摘要
Viewer 登录后首页重构：将 Figma 导出的 React/TSX 模板（`temple/`）迁移到 Flutter，形成 4 Tab（Home、Library、Community、Profile）+ LevelMap 导航，并适配 Web 大屏。

### 新增
- **LevelMapScreen**（`Viewer/lib/screens/level_map_screen.dart`）：新增纵向关卡图，包含已完成节点（绿色勾）、当前节点（发光卡片 + “Start Coding” 按钮）、锁定节点（灰锁），并采用左右交错布局；从 Home push 进入。
- **靛蓝色系**（`Viewer/lib/theme/colors.dart`）：`indigo` / `indigo50`–`indigo700`、`indigoGradient`、`profileBannerGradient`（indigo→purple→pink）、`galaxyGradient`（深色太空主题）。
- **React/TSX 设计模板**（`temple/`）：Figma 导出的原型，含 6 个页面组件（Home、Library、Friends、Profile、LevelMap、Content）、BottomNav 与 Shadcn UI，作为 Viewer 视觉基线。

### 变更
- **BottomNavBar**：Tab 从 Home/Search/Courses/Profile 改为 **Home/Library/Community/Profile**，图标更新（`local_library`、`people`），激活色由绿色改为靛蓝。
- **HomeScreen**：重写为星星计数头部、居中标题（Data Structures / LEVEL 4）、蓝靛渐变 Logo 区块、白色抽屉课程列表与 “Learning” 按钮；点击课程区进入 LevelMap。
- **SearchScreen → Library**：重写为搜索栏 + 5 分类标签（CS/Math/Science/Business/Social）+ 推荐课程横向卡片 + 热门列表；切换分类联动更新。
- **CoursesScreen → Community**：重写为 find/message 双视图；find 显示深色银河背景与 27 个浮动星球点（`AnimationController` 驱动）；message 显示搜索框 + 会话列表（头像、名称、消息、时间、未读红点）。
- **ProfileScreen**：重写为 indigo→purple→pink 渐变头图、3° 旋转头像、用户名与 @handle、2×2 统计卡、Daily Badge（读取 `UserProvider` streak）、4 列成就、设置列表（保留 `UserProvider` 与 `ThemeProvider` 绑定）。
- **Web 响应式**：四个 Tab 与 LevelMap 均包裹 `Center > ConstrainedBox(maxWidth: 600)`，在宽屏下保持移动端观感。
- **代码格式化**：对 Viewer `lib` 下所有改动文件执行 `dart format`。

### 移除
- **`viewer_temple/`**：删除旧 HTML/CSS/JS 登录注册模板及图片资源（已被 Flutter 页面与 `temple/` React 模板替代）。

---

## [未发布] - 2026-02-17

### 摘要
Viewer 接入 Supabase 认证，完成 landing/login/register 页面重构，并支持社交登录。

### 新增
- **Viewer Supabase 认证**：新增 `supabase_flutter` 依赖与 `SupabaseService`（认证版，移植自 Builder），支持 `signIn`、`signUp`、`signOut`、`resetPassword`、`signInWithGoogle`、`getProfile`、`updateProfile`、`_translateAuthError`。
- **Viewer `main.dart` 初始化**：`Supabase.initialize()` 通过 `String.fromEnvironment` 注入 URL/anonKey（与 Builder 一致）。
- **Viewer Landing 页面**：新增 `LandingScreen` 作为初始路由，提供 “Get Start” 入口。
- **Viewer 注册页**：新增 `RegisterScreen`，支持邮箱密码注册、确认密码、协议勾选、社交登录入口，并接入 Supabase。
- **Viewer 登录页重构**：左右分栏布局（图片+表单）、颜色常量对齐设计稿、Google OAuth 按钮、“Forgot password?” 弹窗发送重置邮件。
- **Viewer 视觉资源**：`login.jpg`、`register.jpg`、`logo_with_bg.png`、`google.png`、`wechat.png`、`ins.png`、`whatsapp.png`。

### 变更
- **`UserProvider.login()`**：由 mock `Future.delayed` 改为 `SupabaseService.signIn()`，并基于 Supabase metadata 构造 `UserData`。
- **`UserProvider.register()`**：由 mock 改为 `SupabaseService.signUp()`，处理邮箱确认场景。
- **`UserProvider.logout()`**：先调 `SupabaseService.signOut()` 再清理本地存储。
- **`UserProvider.initialize()`**：从 `SupabaseService.currentUser` 恢复会话，不再只读本地缓存；若无远端会话则清理本地脏状态。
- **`UserProvider` 新 API**：新增 `errorMessage` getter 与 `resetPassword()`。
- **登录/注册错误展示**：改为显示 Supabase `AuthResult.message`（翻译后），不再使用统一 “Unable to login”。
- **Viewer 路由**：初始路由由 `AppEntryPoint`（自动进 Home）改为 `LandingScreen`；新增 `/register`。

---

## [未发布] - 2026-02-14

### 摘要
Phone-mockup Viewer 与交互块增强、Schema 迁移与校验加固、AI 单页生成诊断、Animation Block MVP、Code Playground 运行修复。

### 新增
- **Matching 交互优化（Viewer）**：左右列配对色板、编号徽标、右列随机打乱、防止位置记忆；支持点击已配对项取消；Check 后左右列增强红/绿反馈。
- **Matching 编号预览（Builder 画布）**：`_MatchingBlockContent` 左右项显示圆圈编号，作者可快速核对正确映射。
- **Matching 导出校验**：`CourseExport._validateMatching()` 校验左项 >=2、右项 >=2、题干非空、ID 不重复、pair 引用有效。
- 10 个单测：`MatchingContent` 模型 6 个 + 导出校验 4 个。
- **Phone-mockup Viewer**：`ViewerScreen` 改为 375×812 手机壳预览（状态栏、Home indicator、圆角与阴影），替代原平面 TabBarView。
- **Viewer 交互题型可用**：MultipleChoice、FillBlank、TrueFalse、Matching 支持选择、Check、对错反馈与解释展示。
- **Block `visibilityRule`**：新增 `visibilityRule`（`always` / `afterPreviousCorrect`），控制 gated blocks 显隐。
- **Builder Gated 徽标**：`visibilityRule: afterPreviousCorrect` 时，在 block 头部显示橙色锁标识。
- **PropertyPanel 可配置可见性**：新增可见性下拉（Always visible / After previous correct）。
- **`renameCourse()` API**：Dashboard 编辑动作可直接更新 `courses.title`，带所有权校验。
- 6 个 visibilityRule 单测：默认、序列化、反序列化、JSON 缺失回退、copyWith、roundtrip。
- **按课程草稿存储**：`StorageService` 新增 `saveCourseDraft`、`loadCourseDraft`、`hasCourseDraft`、`clearCourseDraft`。
- **草稿存储测试**：新增 `test/storage_service_test.dart`。
- **Viewer 可见性测试**：新增 `test/viewer_visibility_test.dart`。
- **多选题编辑与校验**：MultipleChoice 支持 `correctAnswers` 列表与单/多选模式切换。
- **多选题 Viewer 测试**：新增 `test/viewer_multi_select_test.dart`，确保答案无序匹配。
- **Builder 图片本地导入**：Image 模块支持导入 PNG/JPEG/GIF/WEBP 并保存 data URL。
- **Builder 拖拽重排可视化**：新增拖拽插入指示（Drop here）与更大手柄命中区。
- **集中式 schema 校验器**：`course_schema_validator.dart` 统一导入/保存/发布/导出校验，支持 warning vs blocking error。
- **校验器测试**：`test/course_schema_validator_test.dart`。
- **历史 JSON 迁移链路**：`course_schema_migrator.dart` 接入 `CourseImport`，支持无版本/`0.8.x`/`0.9.x` 迁移到 `1.0.0`。
- **迁移诊断信息**：`ImportResult` 增加迁移细节，导入日志输出每步结果。
- **迁移样例与测试**：新增 legacy fixture 与 `test/course_schema_migration_test.dart`。
- **AI 模型回退策略**：`AICourseGenerator` 优先高阶 Gemini，再向下回退可用模型。
- **AI 单页输出契约**：Prompt + 后处理强制单页、最多 20 blocks，并按课程类型适配 block 组合。
- **AI JSON 修复与归一化**：提升模型返回 malformed/legacy 结构时的容错。
- **AI Prompt 版本与诊断**：新增 `promptVersion` 与每次请求诊断（指纹/来源、模型、阶段、耗时、解析结果、校验结果）。
- **Code Playground 回归测试**：新增 `test/code_runner_test.dart`。
- **AI 诊断回归测试**：新增 `test/ai_generation_diagnostics_test.dart`。
- **Animation Block MVP**：新增 `animation` 类型，预设 `bouncing-dot` / `pulse-bars`，参数 `durationMs` / `loop` / `speed`，支持 Builder 属性编辑与 Builder/Viewer 轻量预览。

### 变更
- **Viewer 路由**：`/viewer` 支持 `?courseId=<id>`；返回 Builder 时保留 `/builder?courseId=<id>` 上下文。
- **Builder Preview 按钮**：有 `courseId` 时跳 `/viewer?courseId=<id>`。
- **Dashboard 课时标签**：优先显示 DB 中真实课时标题，不再统一 `Lesson N`。
- **`saveCourse` 修复**：移除重复 title 更新（title 由 `renameCourse` 管理）。
- **代码格式化**：对相关文件执行 `dart format`。
- **CLAUDE.md**：补充质量关卡、任务输入模板、关键文档引用。
- **Viewer `afterPreviousCorrect` 渲染**：隐藏 gated block 时显示真正空白，不显示锁占位；并按顺序计算可见性，保证链路门控一致。
- **Builder 课程加载流**：优先恢复本地草稿，再拉云端快照，并同步标题/未保存状态。
- **预览导航安全**：点击 Preview 前先写本地草稿；云端 Save 成功后清理对应草稿。
- **MultipleChoice 校验**：多选按“无序集合完全匹配”判断。
- **导出校验复用**：`CourseExport.validateForExport()` 改为复用集中 schema 校验器。
- **图片兼容性**：Builder 与 Viewer 同时支持网络 URL 与 data URL。
- **长列表拖拽体验**：边缘自动滚动 + 精准插入索引追踪。
- **生命周期统一校验**：导入/保存/发布全部走同一 schema 关卡。
- **AI 对话文案**：说明单页/20 块策略，并在成功提示中显示选用模型。
- **Schema 常量统一**：`CourseSchemaValidator` 从 `Course` 模型读取 schema URL/version。
- **AI 输出质量关卡**：解析归一化后必须通过 schema 校验，阻断错误会直接失败并输出诊断。
- **动画兼容迁移**：校验器与迁移器识别并归一化 `animation`，保证导入导出链路一致。

### 修复
- **Code Playground “(no output)” 误判**：支持常见表达式求值（`type`、`int`、`float`、`round`、赋值、算术），不再只匹配 `print("literal")`。
- **期望输出比较鲁棒性**：忽略空格/换行差异，减少误报“Try again”。
- **PropertyPanel Block ID 截断崩溃**：处理短 ID 时避免 substring 越界。

---

## [未发布] - 2026-02-11

### 摘要
新增 True/False 题型、Markdown 渲染、Dashboard 后端接线、Create Course 流程重构与 SupabaseService 重构。

### 新增
- **True/False 题型**：贯通 Builder 全链路：枚举、模型（`TrueFalseContent`）、注册表、属性编辑器（`SegmentedButton`）、预览组件、模块面板（Chemical 分类）、Viewer 渲染。JSON 类型值：`true-false`；字段：`question`、`correctAnswer`（bool）、`explanation`（可选）。
- **Builder 画布 Markdown 渲染**：`format: 'markdown'` 的文本块通过 `MarkdownBody` 渲染，支持标题、加粗/斜体、列表、行内代码、代码块、链接。
- **属性面板格式切换**：Markdown/Plain 分段按钮，markdown 模式使用等宽字体和提示文案。
- 6 个 TextContent 测试：默认、copyWith、roundtrip、异常 markdown 等。
- **Dashboard HomePage 后端接线**：Course Data（fans/likes/shares）来自 `follows` 与 `course_feedback`；Income Overview 支持 DB 值 + `$0` 兜底；移除重复 fans 卡。
- **评论区**：读取 `course_feedback` 并 enrich 用户资料；0 条显示虚线占位、1-4 条按卡片展示、5+ 只展示 4 条；“more” 跳 Data Center。
- **新增服务方法**：`getDashboardMetrics()`、`getRecentComments()`、`_getMyCourseIds()`、`createCourseRow()`、`getCourseLessonTitles()`。

### 变更
- **Create Course 流程**：创建后不再跳 Builder，留在 Course Manage 并刷新；使用轻量 `createCourseRow()`（只插 `courses`，不建章节/课时/快照）。新课程仅显示 “Add lesson”，点击后进入 Builder。
- **Dashboard 课时加载**：`_loadCourseLessons()` 改为直接查 `chapters`→`lessons`（`getCourseLessonTitles()`），不再通过 `getCourseContent()` 拉全量 JSON。
- **SupabaseService 重构**：从 `course_versions` 迁移到 snapshot 流（`_saveCourseSnapshot` / `_loadCourseSnapshot`）；`owner_id` 改 `author_id`；新增 slug 生成；`difficulty` 改 `difficulty_level` 并规范化；`courseId()` 改为纯 UUID（去掉 `course-` 前缀）。
- **Builder 标题同步**：在 Builder 改标题并保存会回写 `courses.title`；返回 Dashboard 重新拉取后标题一致。

---

## [未发布] - 2026-02-10

### 摘要
Dashboard 课程管理页、路由鉴权、UserAvatar 组件、Builder 课程 ID 加载。

### 新增
- **Course Manage Tab**：从 Supabase 拉课程，排序下拉（time/student/comments），课程卡带 Edit/Delete、异步课时盒、Add lesson / Create Course。
- **UserAvatar 组件**（`widgets/user_avatar.dart`）：Dashboard + Builder 共享圆形头像，支持 OAuth 头像与首字母回退，弹出菜单（Profile/Dashboard/Sign out）。
- **路由鉴权**（`router.dart`）：`/dashboard` 和 `/builder` 需登录；已登录访问 `/` 自动跳 `/dashboard`。
- **Builder 按 courseId 加载**：支持 `?courseId=<id>` 打开已有课程。

### 变更
- Dashboard 首页：`IntrinsicHeight + GridView` 改为 `Row + Wrap`（修复空白渲染问题）。
- Dashboard + Builder：顶部 “Profile” 文本按钮改为 `UserAvatar`。

---

## [未发布] - 2026-02-09

### 摘要
落地页、Dashboard 外壳、Builder UI 重设计、Supabase 认证接入。

### 新增
- **Landing Page**（`/`）：Header、Hero、特性卡片、动态模糊背景、登录弹窗（Google/Apple/邮箱密码）。
- **Dashboard**（`/dashboard`）：侧边导航、Home Page（课程数据/收入/评论卡），响应式布局（<1024px 折叠为抽屉）。
- **CLAUDE.md**：项目级 Claude Code 指南。

### 变更
- **Builder UI**：胶囊按钮、AI 按钮（橙色强调）、Publish（绿色）、logo 图、可展开模块面板 + 搜索。
- **`supabase_service.dart`**：新增 `isEmailRegistered()`，并在 `signIn()` 返回 `isUserNotFound` 标识。

### 移除
- 删除 Builder 中的 `bottomNavigationBar` 及相关页面管理方法。

---

## [未发布] - 2026-01-31

### 摘要
AI 课程生成、Supabase 后端、课程导入、主题重构、跨平台文件选择、模型测试。

### 新增
- **AI 课程生成器**：集成 Gemini API，支持 PDF 生成课程。
- **课程导入**：JSON 导入与校验。
- **文件选择器**：跨平台条件导入（web/stub）。
- **Supabase 服务**：认证 + 云存储。
- **UI 对话框**：AI 生成、认证、个人资料。
- **模型测试**：26 个单测（Block/CoursePage/Course）。
- **文档**：`MVP_TEST_CHECKLIST.md`、`course-json-guide.md`。
- **后端**：新增 `supabase/` 目录与迁移脚本。

### 变更
- 主题系统重构（`design_tokens.dart`、`theme.dart`）。
- Builder 工具栏加入 New/Import/Export、AI 按钮、认证 UI。

### 修复
- 解决 VM 测试环境下 `dart:html` 不可用问题（改用条件导入）。
