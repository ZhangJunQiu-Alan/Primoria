# Wondering.app — 左下角头像入口 & Profile 界面 交互复刻文档

## 一、整体侧边栏结构（Sidebar）

侧边栏固定在左侧，宽度约 80px，分上中下三区。

### 上区：主导航图标按钮

| 图标 | Label | 行为 | 路由 |
|------|-------|------|------|
| 🏠 房子 | Home | 进入当前课程学习主页，展示课程章节地图 | `/` + `?project=<id>` |
| ✨ 星光 | Create | AI 对话框输入学习主题，生成个性化课程 | `/create` |
| 📚 书架 | Courses | 课程管理列表，显示所有课程及进度状态 | `/courses` |
| 👤 人形 | Profile | 个人主页，查看进度统计和学习历史 | `/profile` |

### 下区：固定功能按钮（从上到下）

| 元素 | Label | 行为 |
|------|-------|------|
| 🔥`1` / ⭐`40` | Progress Streak & XP | 显示当日连续打卡天数和 XP 值，点击无跳转（仅展示） |
| ✨ 魔法棒 | Upgrade to Pro | 跳转 `/upgrade` 付费订阅页 |
| 🟢 **A** 圆形头像 | Avatar 用户菜单 | 点击弹出下拉菜单（见下方） |

---

## 二、头像按钮（左下角）下拉菜单

点击头像按钮后弹出浮层菜单，包含三项：
┌─────────────────┐
│ 👤 Profile │ → 跳转 /profile
│ ⚙️ Settings │ → 跳转 /settings
│ 🔴 Sign Out │ → 退出登录
└─────────────────┘

| 菜单项 | 图标颜色 | 行为 | 路由 |
|--------|----------|------|------|
| Profile | 默认色 | 进入个人资料页 | `/profile` |
| Settings | 默认色 | 进入设置页 | `/settings` |
| Sign Out | 🔴 红色 | 退出当前登录账号 | 触发登出逻辑 |

---

## 三、Profile 页面（`/profile`）

### 页面结构
┌─────────────────────────────────┐
│ [头像] alan musk │
│ 🔥 1 Days | ⭐ 40 XP │
│ [EDIT] │
├─────────────────────────────────┤
│ My Progress │
│ ├── 📅 Weekly Report > │
│ ├── 📊 Learning Stats > │
│ └── 📖 Course Stats > │
└─────────────────────────────────┘

### Profile 页各按钮行为

#### 1. EDIT 按钮
- **触发方式**：点击头像卡片下方的 `EDIT` 按钮
- **行为**：弹出 Modal 弹窗 "Edit Profile"
- **Modal 内容**：
  - 标题：`Edit Profile`
  - 副标题：`Update your display name.`
  - 输入框：`Display Name`（预填当前用户名）
  - 操作按钮：`CANCEL`（关闭弹窗） / `SAVE`（保存修改）
  - 右上角：`X` 关闭按钮

#### 2. Weekly Report 行
- **触发方式**：点击整行（chevron `>` 样式）
- **行为**：跳转 `/weekly-report`
- **目标页面内容**：
  - 标题：`Weekly Report`
  - 左右箭头切换周次（`< Jun 29 - Jul 5 >`）
  - 统计卡片（2x grid）：
    - 📖 Lessons completed
    - ⚡ Questions practiced
    - 🕐 Learning time
    - ⭐ XP earned
    - 💡 Cards collected
  - 进度条：Active Days（如 1/7 days）
  - Daily Breakdown：Mon～Sun 每日格子
  - 返回按钮：`← Back to Profile`

#### 3. Learning Stats 行
- **触发方式**：点击整行
- **行为**：跳转 `/stats`
- **目标页面内容**：
  - 标题：`Detailed Statistics`
  - 热力图：`Daily Activity (Last 30 Days)`（GitHub 风格方格热力图，按 S M T W T F S 排列）
  - Today's Summary（2x grid）：
    - 📖 Lessons
    - ⚡ Questions
    - 🕐 Learning Time
    - 🔥 Current Streak
  - 返回按钮：`← Back to Profile`

#### 4. Course Stats 行
- **触发方式**：点击整行
- **行为**：跳转 `/course-stats`
- **目标页面内容**：
  - 标题：`Course Stats`
  - Filter Tabs（圆角 pill 样式）：`Done` / `In Progress` / `Not Started`
  - 返回按钮：`← Back to Profile`

#### 5. Learning 课程卡片
- **触发方式**：点击任意课程卡片
- **行为**：跳转 `/?project=urse_id>`，切换到对应课程首页
- **视觉样式**：左侧课程缩略图 + 课程名称，2列 grid 布局

---

## 四、Settings 页面（`/settings`）

从头像菜单 → Settings 进入，URL：`/settings`，有返回按钮 `← Back to Profile`

### 各 Section 说明

| Section | 描述 | 交互元素 | 行为 |
|---------|------|----------|------|
| **Facts About You** | 用户背景信息，影响 AI 课程个性化质量 | `EDIT FACTS` 按钮（灰色大按钮） | 弹出编辑表单 |
| **Content Language** | AI 生成内容和响应的语言设置 | 下拉选择框（`<select>`） | 切换语言（当前：简体中文） |
| **Subscription** | 当前订阅计划 | `UPGRADE TO PRO` 蓝色大按钮 | 跳转 `/upgrade` |
| **Community** | Discord 社区入口 | `JOIN OUR DISCORD` 灰色大按钮 | 外链打开 Discord |
| **App Information** | 显示版本号（如 `0.21.17`） | 无，仅展示 | — |
| **Account** | 危险区：永久删除账号 | `DELETE ACCOUNT` 红色大按钮 | 不可逆删除操作 |
| 底部独立行 | 退出登录 | `SIGN OUT` 全宽按钮 | 退出当前账号 |

---

## 五、Upgrade to Pro 页面（`/upgrade`）

- 背景：渐变蓝色
- 吉祥物插图 + 标题：`Learn without limits with Pro`

| 功能 | Free | Pro |
|------|------|-----|
| Personalized courses | ✅ | ✅ |
| Unlimited lessons | ❌ | ✅ |
| Unlimited AI chats | ❌ | ✅ |
| Up to 15 courses/mo | ❌ | ✅ |
| Jump ahead in courses | ❌ | ✅ |
| Early access to memory | ❌ | ✅ |

- 底部 CTA 按钮：`CONTINUE`（蓝色全宽，进入支付流程）

---

## 六、路由汇总

| 路由 | 页面 | 入口 |
|------|------|------|
| `/` | Home 课程学习地图 | 侧边栏 Home 图标 |
| `/create` | 创建课程（AI 对话） | 侧边栏 Create 图标 |
| `/courses` | 课程列表管理 | 侧边栏 Courses 图标 |
| `/profile` | 个人主页 | 侧边栏 Profile 图标 / 头像菜单 |
| `/weekly-report` | 本周学习报告 | Profile → Weekly Report |
| `/stats` | 详细学习统计 | Profile → Learning Stats |
| `/course-stats` | 课程完成统计 | Profile → Course Stats |
| `/settings` | 账号设置 | 头像菜单 → Settings |
| `/upgrade` | Pro 订阅升级 | 侧边栏魔法棒 / Settings |

---

## 七、UI 模式总结（供 Codex 参考）

1. **侧边栏图标按钮**：仅图标，hover 显示 Tooltip（label），active 状态深色背景圆角
2. **列表行导航**：图标 + 文字 + 右侧 chevron `>`，整行可点击，跳转子页
3. **子页返回**：统一使用 `← Back to Profile` 文字链接（左上角）
4. **弹窗 Modal**：居中遮罩弹窗，含输入框 + CANCEL/SAVE 两个按钮 + 右上 X 关闭
5. **下拉菜单**：头像点击触发，浮层显示在头像上方，点击外部关闭
6. **危险操作按钮**：红色（Delete Account），普通操作灰色，CTA 蓝色
7. **Filter Tabs**：圆角 pill 样式，点击切换 active 状态（如 Course Stats 的三个 tab）
8. **进度指标**：火焰图标（streak）+ 星星图标（XP），橙/金色区分