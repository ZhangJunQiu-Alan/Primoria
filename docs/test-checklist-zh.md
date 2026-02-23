# Builder MVP 手工测试清单

## 1. 基础启动

- [ ] `flutter run -d chrome` 启动成功
- [ ] Builder 正常显示三栏布局
- [ ] 左侧面板显示所有模块类型
- [ ] 画布显示空状态提示
- [ ] 右侧面板显示 “No module selected”

## 2. 拖拽

- [ ] 拖拽 Text 到画布后创建文本模块
- [ ] 拖拽 Image 到画布后创建图片模块
- [ ] 拖拽 Code Block 到画布后创建代码展示模块
- [ ] 拖拽 Code Playground 到画布后创建可运行模块（含 Run 按钮）
- [ ] 拖拽 Multiple Choice 到画布后创建选择题模块

## 3. 选中与属性编辑

- [ ] 点击模块后有高亮选中，右侧显示对应属性
- [ ] 编辑文本内容后画布实时更新
- [ ] 输入图片 URL 后画布显示图片
- [ ] 在 Image 模块导入本地图片文件后画布显示导入图
- [ ] 编辑代码运行模块的初始代码 / 期望输出
- [ ] 插入 Animation 模块，切换预设（`Bouncing Dot`/`Pulse Bars`）并调整 `durationMs` / `loop` / `speed`

## 4. Code Playground 运行

- [ ] 输入 `print("Hello")` → Run → 输出 `Hello`
- [ ] 输入 `print(type(5))`、`print(type(3.0))`、`print(int(3.9))`、`print(round(3.9))` → Run → 分行输出 `<class 'int'>`、`<class 'float'>`、`3`、`4`
- [ ] 设置 expected output 后可显示 “Correct” 或 “Try again”

## 5. 模块排序与删除

- [ ] 使用拖拽手柄可调整模块顺序
- [ ] 拖拽过程中插入位置有明显指示线/占位提示
- [ ] 拖拽到顶部/底部边缘时，长列表可自动滚动
- [ ] 点击删除后模块移除，右侧属性面板重置

## 6. 课程信息

- [ ] 点击课程标题可弹窗编辑并更新标题
- [ ] 修改后出现未保存提示（黄色圆点）

## 7. JSON 导出

- [ ] 导出时校验 title/pages 并下载 JSON
- [ ] 导出 JSON 含 `$schema` 与 `schemaVersion`
- [ ] JSON 含全部 pages 与 blocks

## 8. Schema 校验关卡

- [ ] 导入非法 JSON（例如 `correctAnswers` 包含不存在 option id）会被拦截，弹窗显示字段路径（如 `$.pages[0].blocks[0].content.correctAnswers[0]`）
- [ ] 导入历史无版本或 `0.9.x` JSON 时先迁移再校验，导入成功
- [ ] 导入不支持的 `schemaVersion`（例如 `9.0.0`）会被拦截并显示明确迁移错误
- [ ] 存在阻断级 schema 错误时，云端保存会被拦截并列出字段路径
- [ ] 存在阻断级 schema 错误时，发布会被拦截并列出字段路径
- [ ] 仅 warning（非阻断）时，保存/导入仍成功并报告 warning 数量

## 9. 预览

- [ ] 点击 Preview 可跳到 Viewer 并显示当前内容
- [ ] 对已有课程（`/builder?courseId=<id>`），Builder → Preview → Builder 往返时未保存内容不丢失
- [ ] 云端 Save 成功后，重新打开 Builder 不会恢复过期草稿
- [ ] Viewer 中 Animation 预览会反映 preset 与参数变更（duration/loop/speed）
- [ ] `visibilityRule: afterPreviousCorrect` 在解锁前显示真实空白（无锁占位）
- [ ] 对串联 gated blocks，若前序 gated block 未解锁，后续块保持隐藏
- [ ] Multiple Choice 可在属性面板切换 Single Select / Multi Select
- [ ] Multi Select 多正确答案可持久化（刷新/导出导入后保持）
- [ ] Multi Select 校验与顺序无关（`A+C` 与 `C+A` 等价），且必须完全匹配
- [ ] Matching：右列初始顺序会打乱（不同于左列）
- [ ] Matching：先点左再点右可创建带颜色和编号徽标的配对
- [ ] Matching：点击已配对项可取消配对（提交前撤销）
- [ ] Matching：点击 Check 后左右两列显示红/绿边框与对错图标
- [ ] Builder 画布中的 Matching 左右项显示圆圈编号

## 10. 认证与路由

- [ ] 未登录访问 `/dashboard` → 重定向到 `/`
- [ ] 未登录访问 `/builder` → 重定向到 `/`
- [ ] 落地页登录成功后自动跳转 `/dashboard`
- [ ] 头像菜单执行 Sign out 后重定向到 `/`

## 11. Dashboard — 首页

- [ ] 可看到 Course Data、Income Overview、Comments 卡片
- [ ] 宽屏和窄屏下均能正常渲染
- [ ] 右上角显示头像圆形组件

## 12. Dashboard — 课程管理

- [ ] 先显示 loading，再显示课程列表
- [ ] 未登录显示登录提示
- [ ] 无课程时显示空状态与 Create Course 按钮
- [ ] 课程卡显示：标题、相对时间、课时盒子
- [ ] 排序下拉含 3 个选项（time/student/comments）
- [ ] Edit 跳转 `/builder?courseId=<id>`
- [ ] Delete 二次确认后删除并刷新
- [ ] Add lesson 跳转 `/builder?courseId=<id>`
- [ ] Create Course 跳转 `/builder`

## 13. 用户头像

- [ ] Dashboard 和 Builder 都显示蓝色圆形头像
- [ ] 已登录点击头像弹出菜单（Profile/Dashboard/Sign out）
- [ ] 未登录点击头像打开登录弹窗
- [ ] OAuth 用户显示真实头像

## 14. Builder — 课程加载

- [ ] `/builder` 打开空白新课程
- [ ] `/builder?courseId=<id>` 可加载已有课程

## 15. AI 诊断（回归）

- [ ] 触发一次 AI 生成，开发者日志应包含一行简洁诊断信息：`promptVersion`、选中的 `model`、延迟字段（`total/generate/parse/validate`）、`parseResult`、`validation.passed`、最终 `stage`

## 16. Viewer — 登录后首页（4 Tab）

- [ ] `flutter run -d chrome` → 登录后默认落在 Home
- [ ] 底部导航有 4 个 Tab：Home / Library / Community / Profile，激活色为靛蓝
- [ ] **Home Tab**：右上星星计数、“Data Structures” + “LEVEL 4”、蓝靛渐变 logo 区块、白色抽屉课程列表 + “Learning” 按钮
- [ ] **Home → LevelMap**：点击课程区进入 LevelMapScreen，含返回按钮、“Module 1” 标题、已完成/当前/锁定节点
- [ ] **LevelMap → Lesson**：点击当前节点的 “Start Coding” 进入 LessonScreen
- [ ] **Library Tab**：搜索栏、5 分类标签（CS/Math/Science/Business/Social）、推荐轮播、热门列表；切分类时两个区域同步变化
- [ ] **Community Tab — Find**：深色银河背景 + 浮动星球点 + “Find” 按钮
- [ ] **Community Tab — Message**：搜索框 + 会话列表（含未读角标）
- [ ] **Community Tab 切换**：点击 “find” / “message” 头部可切换视图
- [ ] **Profile Tab**：靛蓝→紫→粉渐变头图、旋转头像、用户名+handle、2×2 统计卡、Daily Badge、4 列成就、设置项列表
- [ ] **Profile — Settings**：主题切换可用（Follow System / Light / Dark）
- [ ] **Profile — Logout**：登录状态下可见退出按钮，成功后出现 snackbar
- [ ] **宽屏浏览器**：所有 Tab 内容居中，最大宽度 600px

## 已知问题

1. Builder 文本块暂不渲染 Markdown（Viewer 会渲染）
2. 按 student/comments 排序仍是占位逻辑
3. Data Center / Fans Manage 仍是占位页
4. “Learned X times” 显示的是课时数，不是学习人数
