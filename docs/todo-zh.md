# 待办（TODO）

## 全局
1. [ ] 统一 UI 风格
2. [x] 多语言支持

## Builder
1. [x] 文本模块支持 Markdown 渲染：画布使用 MarkdownBody，属性面板支持格式切换（2026-02-11）
2. [x] 课程 Prompt 适配新流程：Gemini 单页生成（最多 20 blocks）、按课程类型自适应模块、JSON 归一化/修复（2026-02-13）
3. [x] 课程管理系统与子课程流程：Dashboard 增加 Course Manage（2026-02-09）
4. [x] 首页常见能力（Profile、成就等）：Dashboard 首页含课程数据、收入、评论（2026-02-09）
5. [x] 模块面板基础分类（物理/化学/生物/数学/编程/通用）：现已调整为 General + Programming 分类 + 搜索；General 包含 Text/Image/Animation/Multiple Choice/True-False/Matching，Programming 包含 Code Block/Code Playground（2026-03-03）
6. [~] 增加更多题型：True/False 已完成（2026-02-11），Matching 体验增强（2026-02-12），Animation MVP 已完成（2026-02-14）；剩余高级 Matching 模式等
7. [ ] 多人协作
8. [x] 落地页 + 登录弹窗 + Supabase 认证集成（2026-02-09）
9. [x] Builder UI 重构：圆角卡片、胶囊按钮、简化空状态（2026-02-09）
10. [x] 在 Supabase 创建测试账号用于登录验证
11. [x] Dashboard 接入真实 Supabase 课程数据（2026-02-10）
12. [ ] Google 登录（OAuth 回调处理与会话恢复）
13. [ ] Block 重排/插入体验继续优化
14. [~] 更多 Block 类型：True/False（2026-02-11）与 Animation MVP（2026-02-14）已完成；剩余高级 Matching 模式等
15. [x] Builder 预览按钮：手机壳 Viewer + 交互题型 + visibilityRule 门控 + 页面导航（2026-02-12）
16. [x] Dashboard 首页后端接线：fans/likes/shares 来自 DB，评论带数量规则，收入支持兜底（2026-02-11）
17. [x] Create Course 弹窗持久化到 DB：名称输入、校验、错误反馈、自动刷新列表（2026-02-11）
18. [x] Create Course 保持在 Course Manage：轻量 `createCourseRow()`，不自动跳 Builder，新课程仅显示 “Add lesson”，Builder 保存标题后可回写同步（2026-02-11）
19. [x] 解决 Preview 往返导致未保存数据丢失：按课程浏览器草稿自动保存/恢复（`/builder?courseId=<id>`），云端 Save 后清理草稿（2026-02-12）
20. [x] MultipleChoice 多选编辑 + 无序校验：新增 `correctAnswers`、单选/多选切换、Preview 精确集合匹配（2026-02-12）
21. [x] Block 重排/插入优化：插入指示器、边缘自动滚动、拖拽手柄点击区域扩大（2026-02-12）
22. [x] Matching 体验优化：颜色配对、编号徽标、打乱排序、点击解绑、导出校验、单测覆盖（2026-02-12）
23. [x] Code Playground 输出可靠性：支持 Python-like 表达式求值 + 期望输出忽略空白差异（2026-02-13）
24. [x] AI 诊断 + 校验关卡：Prompt 版本/指纹/来源埋点，解析/校验阶段诊断，AI 输出阻断级 Schema 校验（2026-02-14）
25. [x] 健壮 Schema 校验：集中校验器 + 导入/保存/发布统一拦截，字段路径级错误 + warning/error 级别（2026-02-12）
17. [ ] 区域化登录方式（最低优先级；需 Apple Developer Program 会员）

## Viewer
1. [x] 学习首页建设（Profile、成就等）：Home/Library/Community/Profile 四 Tab 重构并移植 Figma 模板，支持 LevelMap 导航（2026-02-18）
2. [x] 社交/好友能力：Community Tab 含银河 Find 可视化 + Message 会话列表（2026-02-18）
3. [x] 完课后产生日志：`complete_lesson_and_award_xp` RPC（原子 XP 发放 + 连续打卡更新），在 LessonScreen 最后一页触发（2026-02-18）
4. [ ] 课时内每个 block 完成后在顶栏显示当前进度；整节课完成前不写入 DB
5. [x] Viewer 全页面接入 Supabase DB：Home/Search/Course/Lesson 全部读写实时数据；本地开发含 seed migration（2026-02-18）
6. [x] Supabase 用户认证：邮箱登录/注册、Google OAuth、密码重置、会话恢复、错误翻译（2026-02-17）
7. [x] 受保护路由鉴权：未登录访问 Home/Course/Lesson 自动跳 `/login`（2026-02-18）
8. [x] 登录 Remember Me：邮箱 + 复选框持久化到 SharedPreferences，下次自动回填（2026-02-18）
9. [x] 退出确认弹窗：自定义对话框含 loading，确认后跳 `/login`（2026-02-18）
10. [x] Profile 后端统计：XP、关注数、粉丝数、bio 来自 user_stats + follows + profiles（2026-02-18）
11. [x] CourseScreen 报名流程：未报名时显示 “Enroll in Course”，调用 enrollInCourse upsert（2026-02-18）
12. [ ] 云端数据同步（实时 / 离线）
13. [ ] 实时学习进度更新
14. [ ] 离线缓存模式
15. [x] Landing + 登录/注册页重构：左右分栏、CSS 对齐设计 Token、社交登录网格（2026-02-17）
16. [x] Profile 右上角菜单 + 独立设置流：`Settings/About/Help/Log out`，点击 Settings 进入 Personal Info 页面（2026-02-23）
17. [x] Personal Info 全量接库：支持修改 `username`、`bio`，展示 `role`，并按月年展示 `profiles.created_at`（2026-02-23）
18. [x] Settings 头像上传打通：Web/非 Web 图片选择 + Supabase Storage `avatars` + 立即回写数据库并刷新资料（2026-02-23）
19. [x] 移除 Profile 页底部冗余设置区域，仅保留右上角菜单入口（2026-02-23）
20. [x] 首页右上角星标口径修正：由总 XP 改为连续学习天数（按“当日有正向 XP 入账”定义学习日）（2026-03-05）
21. [x] 星链活跃日与连续天数统一口径：改为基于 `xp_transactions.amount > 0` 的本地日期连续计算（2026-03-05）
22. [x] 首页滚动条位置修复：滚动容器改为全宽，内容保持 `maxWidth: 600` 居中，滚动条贴右侧视口边缘（2026-03-05）
23. [x] 课时练习渲染修复：顶部标题改为当前 lesson 名（优先 DB 标题），正文去重同名标题，支持 Markdown 渲染，并在当前 lesson 行为空时回退读取同课程首个非空快照（2026-03-06）

## Builder（续）
32. [x] Builder + Viewer 迁移至云端 Supabase — 两端默认连接 `rygafvlzzkvqhhenajzi.supabase.co`；18 条迁移全部推送；`uuid_generate_v4()` → `gen_random_uuid()` 适配云端（2026-02-25）
33. [x] Builder 角色鉴权（RBAC）— `BuilderAccessNotifier` 单例在冷启动和认证事件时即时检查角色；`user` 角色被拦截；路由守卫已更新；落地页展示检查中 spinner + 访问拒绝横幅（2026-02-25）
34. [x] 修复退出红屏崩溃 — (a) 弹出菜单：延迟 300 ms 等关闭动画完成再 signOut；(b) Dashboard 异步回调：在 await 前捕获 ScaffoldMessenger，用 messenger.mounted 替代 mounted；(c) Profile 弹窗：先 pop 再 signOut；(d) 落地页 onSuccess 改为 null（2026-02-25）
35. [x] 恢复 hackathon 网页自定义域名 — 新增 `hackathon/web/CNAME` 写入 `primoria.dpdns.org`；通过 GitHub API 重新绑定；网站已正常访问 https://primoria.dpdns.org（2026-02-26）
36. [x] 登录/注册表单支持浏览器自动填充密码 — Builder 登录弹窗及 Viewer 登录/注册页均加入 `AutofillGroup` + `autofillHints`；浏览器现在会弹出"保存密码"提示，下次访问自动填充（2026-02-26）
37. [x] AI 后端 Edge Function 接入 — Gemini 调用与 Prompt 迁移到 `supabase/functions/ai-generate-course-json`；新增 `generateViaApi()`；Dashboard 一句话生成改走服务端；PDF 生成弹窗移除 API Key 输入（2026-03-03）
38. [x] 修复拖拽 Block 红屏崩溃 — `ReorderableListView` 拖拽项进入 Overlay 后，`localToGlobal(ancestor: viewportBox)` 可能抛出空值异常；已在 `builder_canvas.dart` 增加保护（2026-03-03）
39. [x] 修复无 courseId 进入 Builder 初始化问题 — `initState` 归一化空 courseId，`/builder` 显式执行空白课程初始化（2026-03-03）
40. [x] 课程管理入口体验简化 — 移除左侧「创建课程」按钮；「添加课时」改为进入空白 Builder（`/builder`），不再直接带当前课程 id（2026-03-03）
41. [x] 解决空白课程「预览往返丢内容」— 空白 Builder 会立刻分配本地临时 `courseId` 并启用草稿自动保存；预览始终携带 `courseId`，返回后可恢复 block/AI 生成内容（2026-03-03）
42. [x] Builder 默认空白标题调整 — 默认标题由 `Untitled Course` 改为 `Untitled Lesson`（`builder_state` + `course_provider`）（2026-03-03）
43. [x] AI 多课时生成能力 — Edge Function 可生成 2-4 个结构化课时（每课时 6-9 个 block）；服务端 TypeScript Schema 校验；截断检测 + 模型回退链修复；生成后留在 Dashboard；`_saveCourseSnapshot` 按 page 同步多条 lesson 快照（2026-03-04）
44. [x] Function Flow 新 block 类型 — 用节点/连线可视化 caller-callee 执行路径；支持逐步播放；属性面板可编辑；完成 schema 迁移与校验器接入；补齐测试（2026-03-04）
45. [x] Add Lesson 流程 — 新增 `/builder?addLesson=1&courseId=…&draftId=…`；通过 `saveLessonToCourse()` 作为独立课时写入目标课程；支持草稿持久化；Viewer 返回 Builder 时保持 add-lesson 上下文（2026-03-04）
46. [x] Function Flow 发布后稳定性收尾 — `function_flow_block_widget.dart` 改为迭代器方式读取 path metrics（箭头/标签渲染更稳）；viewer smoke test 改为断言 `function_flow_step` 控件存在，降低偶发波动（2026-03-04）
47. [x] Code Execution 新 block 类型 — 完成 `code-execution` 全链路接入：model/registry/模块面板、属性编辑器、Builder+Viewer 交互渲染（播放/暂停/步进/回退/重置、当前行高亮、变量/输出面板、checkpoint 作答）、schema 迁移别名（`codeExecution`/`code_execution`）、路径级校验，以及 smoke/model/migration/validator 测试（2026-03-04）
48. [x] Builder 顶部课时命名语义修正 — 点击 `课程/课时` 只编辑当前课时名（不再改课程名）；新增“编辑课时标题/输入课时标题”文案；`lesson1` 不再被误判为占位标题（2026-03-06）
49. [x] Text / Code Block / Code Playground 支持块内直接编辑 — 在画布中可直接改文本与代码（含语言/期望输出），并移除这三类在 Property Panel 的重复内容编辑器（2026-03-06）
50. [x] Block 可见性默认规则加固 — 首个 block 默认 `always`，其余默认 `afterPreviousCorrect`；Block 模型、AI 生成器、Schema 迁移器统一了可见性别名归一化并补充测试（2026-03-06）
51. [x] Logo 全局跳转 Dashboard — Builder 顶栏 Logo、Dashboard 侧边栏品牌区、Landing 顶部 Logo 全部支持点击进入 `/dashboard`（2026-03-06）
52. [x] 发布后课时名一致性修复 — `saveLessonToCourse()` 以 lesson 标题为准写入；publish 快照回写优先使用首课标题（不再覆盖为课程标题）；Dashboard 课程列表刷新时清空课时标题缓存，确保改名后立即可见（2026-03-06）
53. [x] Dashboard 三大核心页重设计 — 首页/数据中心/粉丝管理完成响应式改版；新增 tabs/providers/widgets 模块化结构与图表分析能力；课程管理（Course Manage）保持原有行为不变（2026-03-06）

## 内容与课程体系
1. [ ] 课程内容管理系统
2. [ ] 多学科分类（数学、科学、逻辑等）
3. [x] 难度分级
4. [ ] 前置知识与学习路径

## 游戏化
1. [ ] 徽章成就系统
2. [ ] XP 与等级系统
3. [ ] 连续打卡奖励

## 社交
1. [ ] 用户主页
2. [ ] 好友与关注
3. [ ] 课程讨论
4. [ ] 社交媒体分享学习进展

## 数据库
1. [ ] 家长模式
2. [x] 种子测试账号：`20260218000002_seed_data.sql` 含 5 学科、8 门课程、10 章节、19 课时（2026-02-18）

## 质量
1. [ ] 扩展单元测试
2. [ ] Widget 测试
3. [ ] 集成测试
4. [ ] 性能优化
5. [ ] 错误追踪与上报
6. [ ] 无障碍改进
