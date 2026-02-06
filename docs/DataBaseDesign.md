# 数据库设计 使用PostgreSQL
系统原则:任何“用户行为导致的状态字段更新”，默认采用 5 分钟去抖；任何“审计/分析事件”，采用 append-only + 分区。
last_active：去抖 5 分钟
last_accessed：去抖 5 分钟
streak/day log：按天 upsert
interactions：insert-only，按月分区

## 表设计

### 1. 用户管理 (User Management)

#### profiles(用户档案)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | PK，FK → auth.users.id,用户 id 系统生成 |
| username | text | UNIQUE，CHECK (length(username) between 3 and 32)昵称，唯一 |
| avatar_url | text | 头像 URL |
| bio | text | 个人简介（限定100汉字/200英文字符，超过2行约40字用...截断） |
| role | Enum ('user','subscriber','author','admin') | 用户角色：user-普通用户，subscriber-订阅用户，author-课程制作者，admin-管理员 |
| created_at | timestamp | 创建账户时间 |
| updated_at | timestamp | 由 trigger 自动维护,更新时间（用于头像刷新、缓存更新、安全审计、权限变更追踪） |
| last_active_at | timestamp | 最后活跃时间（用于计算用户活跃度）,请求到来时不直接写 Postgres,只在 Redis/内存里记录 “user_id 最近活跃时间”,每5 分钟把这一批用户统一写回数据库 |

#### user_settings(用户设置)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| user_id | UUID (PK, FK) | PK & FK → profiles.id 用户 ID |
| theme_mode | Enum ('system','light','dark') | 默认值:system  主题模式 |
| notification_daily_reminder | Boolean | 默认值:false 每日提醒开关 |
| notification_reminder_time | Time | 默认值:'09:00'  提醒时间 |
| marketing_emails | Boolean | 默认值:false  营销邮件开关 |
| language | Text | 语言（默认'zh-CN'） |
| accessibility_mode | Boolean | 默认值:false 无障碍模式 |

### 2. 课程内容 (Course Content)

#### subjects(学科/分类)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) |  默认值: gen_random_uuid() 主键 |
| name | Text | UNIQUE 学科名称（如"Computer Science"、"Physics"） |
| icon_url | Text | 存储 SVG 或 PNG 图标的链接，用于在首页分类卡片上显示图标。|
| color_hex | Text | CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'), 存储颜色代码（如 #FF5733）。在 Flutter 端，这会被解析为 Color(0xFFFF5733)，用于渲染该学科的主题色背景或渐变 |
| parent_subject_id | UUID (FK) | FK → subjects.id（可 NULL） 父分类ID（用于子分类，如 Math -> Algebra） |

#### courses(课程)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 默认值:gen_random_uuid() 主键 |
| author_id | UUID (FK) | FK → profiles.id 作者 ID， |
| subject_id | UUID (FK) |FK → subjects.id  学科 ID  |
| title | Text | 课程标题 |
| slug | Text | UNIQUE（全小写+短横线；应用层生成） 利于 SEO 和分享。必须全局唯一 |
| description | Text | 课程描述 |
| thumbnail_url | Text | 课程封面的图片地址 |
| difficulty_level | Enum ('beginner', 'intermediate', 'advanced') | 默认值:'beginner' 用于用户筛选课程，或根据用户水平推荐 |
| status | Enum ('draft', 'published', 'archived') | 默认值'draft' 发布状态:draft: 草稿，仅作者可见（Builder 中编辑中）。published: 已发布，学员可见（Viewer 中可学习）。archived: 已归档，不再展示但数据保留 |
| estimated_minutes | Integer | 默认值: 0 预计完成时间，用于显示“约 2 小时课程” |
| tags | Array<Text> | 默认值:{} PostgreSQL 数组类型。用于搜索优化，例如 ['递归', '算法', 'Python']|
| price_tier | Enum ('free', 'premium') | 默认值:free 区分免费课和付费课。前端据此判断是否显示“锁”图标 |
| created_at | Timestamp | 默认值:now() 创建时间 |
| updated_at	| timestamptz	| 默认值:now()	trigger
| published_at | timestamptz | 仅 published 时填
| search_tsv	| tsvector	| 生成列（title/description/tags）用于全文检索

#### chapters(章节/模块)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 默认值:gen_random_uuid() 主键 |
| course_id | UUID (FK) |FK → courses.id 课程 ID |
| title | Text | 章节标题 |
| description | Text | 章节描述 |
| sort_key | bigint | 默认值:1000 留空隙方便插入/拖拽（如 1000,2000,3000）决定章节的排列顺序（第1章、第2章）。Builder 端手动点击保存更新字段。|
| is_locked | Boolean | 默认值: True 游戏化设计。第一课为 false,如果为 true，则必须完成上一章节才能解锁此章节（或者需要付费） |
UNIQUE(course_id, sort_key),防止顺序冲突

#### lessons(子课程) 包含用于 Viewer 快速渲染的 快照数据
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| chapter_id | UUID (FK) | FK → chapters.id 章节 ID |
| title | Text | 子课程标题 |
| type | Enum ('interactive', 'quiz', 'video', 'article') | 默认值:interactive 子课程类型 |
| sort_key | bigint | 默认值:1000 约束:UNIQUE(chapter_id, sort_key) 子课程顺序,Builder 端手动点击保存更新字段。 |
| xp_reward | Integer | 默认值: 0 CHECK (xp_reward >= 0) 完成子课程奖励的 XP |
| duration_seconds | Integer |默认值: 0  预计耗时（秒） |
| content_json | JSONB | 默认值:'{}' 这是该子课程下所有 content_blocks 的聚合快照，包含了排序后的完整页面结构） |
| content_hash | text | 课程内容的哈希值，用于变更检测和缓存验证 |
| created_at | timestamptz | now() | 创建时间 |
| updated_at | timestamptz | now() | trigger 自动维护，更新时间 |

#### content_blocks(内容块) 作为内容的 Source of Truth (唯一真相源)，Builder 的所有增删改查操作均直接针对此表
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| lesson_id | UUID (FK) | FK → lessons.id 归属的子课程 |
| type | Enum ('text', 'image', 'code_playground', 'multiple_choice', 'slider', 'info_card') | 组件类型,决定渲染逻辑 |
| content | JSONB | 静态显示数据（如题目文本、默认代码） |
| config | JSONB | 逻辑配置数据（如验证规则、答案、取值范围）|
| sort_key | bigint | 默认值:1000 约束:UNIQUE(lesson_id, sort_key) 决定块在页面中的排列顺序，支持拖拽排序,Builder 端手动点击保存更新字段。 |
| is_interactive | Boolean | 是否需要用户操作 |
| created_at | timestamptz | 默认值:now() 创建时间 |
| updated_at | timestamptz | 默认值:now() trigger 自动维护，更新时间 |
| updated_by | uuid | FK → profiles.id（用于审计/协作） |

策略详细说明与工作流

本策略的核心逻辑在于将“编辑”与“阅读”的关注点分离：

1. **写流程 (Builder & Authoring)**：
* 作者在 Builder 中编辑课程后,点击保存或者发布，系统对 `content_blocks` 表进行原子操作（Insert/Update/Delete）。允许我们在数据库层面进行精细的内容搜索（例如：“查找所有包含 Python 2 代码的块”）。
* **同步机制 (Snapshot)**：每当作者执行“保存”或“发布”操作时，后端触发聚合逻辑：查询该 Lesson 下所有 Block，按 `sequence_order` 排序，打包生成一个完整的 JSON 对象，并更新到 `lessons` 表的 `content_json` 字段中。


1. **读流程 (Viewer & Rendering)**：
* Viewer 端仅需请求 `lessons` 表。通过读取 `content_json` 字段，客户端可以在一次网络请求（1 RTT）中获取渲染页面所需的所有数据，无需进行复杂的表连接（JOIN），极大提升了首屏加载速度和用户体验。


3. **分析流程 (Analytics)**：
* 虽然 Viewer 使用 JSON 渲染，但每个组件内部依然保留了原始的 `block_id`。
* 当用户进行交互（如提交代码、拖动滑块）时，数据上报包含 `block_id`。这使我们能够回溯到 `content_blocks` 表，精准分析每个知识点的通过率和交互详情，从而实现精细化的教学质量优化。

上述三表的`sort_key`,仅点击保存或者发布才会更新,避免频繁写数据库.
**`sort_key` 的坏处**和**对应的解决方案**
### 1️⃣ 空隙耗尽（理论问题）
**问题**
* 多次在同一区间插入，key 间距缩小
**解决方案**
* 使用 `BIGINT`
* 当相邻差值 ≤ 2 时，对**该章节/lesson**做一次重排
* 重排仅在「保存 / 发布」时发生
> 发生概率极低，可接受
---
### 2️⃣ 排序键不直观
**问题**
* `sort_key` 数值不适合人看
**解决方案**
* UI 使用 `row_number()` 生成展示顺序
* 文档说明：`sort_key` 是内部实现细节
---
### 3️⃣ 查询必须有索引
**问题**
* `order by sort_key` 没索引会慢
**解决方案**
* 建立复合索引：
  * `(course_id, sort_key)`
  * `(chapter_id, sort_key)`
  * `(lesson_id, sequence_order)`

### 3. 学习进度与追踪 (Learning & Progress)

#### enrollments(选课记录)
| 列名 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| id | uuid | gen_random_uuid() | PK 主键 |
| user_id | uuid | | FK → profiles.id 用户 ID |
| course_id | uuid | | FK → courses.id 课程 ID |
| status | Enum ('in_progress', 'completed', 'dropped') | 默认值:'in_progress' 用户的当前状态（进行中、已完成、已放弃） |
| progress_bp | integer | 0 | 基点 0~10000（替代 float，更可控）CHECK (progress_bp between 0 and 10000)。前端进度条直接读取此字段，无需每次实时计算。每当完成一个 Lesson 时，触发后端函数更新此字段 |
| last_accessed_at | timestamptz | now() | 最后访问时间 |
| started_at | timestamptz | now() | 开始时间 |
| completed_at | timestamptz | | 完成时间 |
| | | | UNIQUE(user_id, course_id) 防止重复选课 |

#### lesson_completions(完课记录)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| user_id | UUID (FK) | 用户 ID |
| lesson_id | UUID (FK) | 子课程 ID |
| score | Integer | 子课程分数（如果是测验） |
| time_spent_seconds | Integer | 该子课程最终耗时（秒） |
| completed_at | Timestamp | 完成时间日期 |

#### block_interactions(交互详情)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| user_id | UUID (FK) | 用户 ID |
| block_id | UUID (FK) | 内容块 ID |
| user_input | JSONB | 记录用户具体干了什么,用户输入（代码、选项、滑块值） |
| is_correct | Boolean | 记录这次交互是否成功。用于分析某个具体知识点（Block）的通过率，帮助作者优化内容。 |
| created_at | Timestamp | 创建时间 |

### 4. 游戏化与成就 (Gamification)

#### user_stats(用户统计 - 实时缓存,不要每次加载个人主页时都去遍历所有历史记录计算总分。这会导致数据库慢查询。)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| user_id | UUID (PK, FK) | 用户 ID |
| total_xp | Integer | 总获得XP |
| current_streak | Integer | 当前连续打卡天数，这是这类应用最重要的留存指标 |
| longest_streak | Integer | 历史最高连续天数 |
| courses_completed | Integer | 完成课程数 |
| lessons_completed | Integer | 完成子课程数 |
| last_activity_date | Date | 最后活跃日期（用于计算 Streak） |

#### daily_activity_log(每日活跃日志,设计意图：用于生成类似 GitHub 的“绿墙”（热力图 Contribution Graph）)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| user_id | UUID (FK) | 用户 ID |
| date | Date | 日期 |
| xp_earned | Integer | 当天获得的总XP |
| lessons_count | Integer | 当天完成子课程数 |
| **Primary Key** | **(user_id, date)** | 复合主键,保证一个用户每天只有一条记录。每天一行，任何新的 XP 事件都 INSERT ... ON CONFLICT (user_id, date) DO UPDATE SET xp_earned = xp_earned + EXCLUDED.xp_earned ...，从而生成 GitHub 式绿墙且避免重复行

#### achievements(成就定义)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| slug | Text | 程序代码引用的唯一标识（如 'first_lesson', '7_day_streak'） |
| name | Text | 成就名称 |
| description | Text | 成就描述 |
| icon_url | Text | 成就图标 |
| category | Enum ('streak', 'learning', 'social') | 分类成就，用于在 UI 上分标签页展示（如“学习成就”、“社交成就”） |

#### user_achievements(用户获得成就)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| user_id | UUID (FK) | 用户 ID |
| achievement_id | UUID (FK) | 成就 ID |
| earned_at | Timestamp | 获得时间 |

#### xp_transactions(XP 流水)设计意图: 审计日志。如果用户投诉 XP 不对，或者管理员需要手动补偿 XP，都在这里记录。
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| user_id | UUID (FK) | 用户 ID |
| amount | Integer | XP 数量 |
| source_type | Enum ('lesson_complete', 'daily_bonus', 'admin_adjustment') | 说明 XP 来源。防止作弊（例如限制每日通过 daily_bonus 获取的上限 |
| reference_id | UUID | 关联 ID（lesson_id） |
| created_at | Timestamp | 创建时间 |

### 5. 社交与互动 (Social)

#### follows(关注关系,标准的社交网络模型。允许用户关注优秀的课程作者或其他学霸)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| follower_id | UUID (FK) | 粉丝 ID，引用 profiles |
| following_id | UUID (FK) | 被关注人 ID，引用 profiles |
| created_at | Timestamp | 创建时间 |
| **Primary Key** | **(follower_id, following_id)** | 复合主键 |
CHECK (follower_id <> following_id) + PK(follower_id, following_id) 防止自我关注

#### course_feedback(课程反馈,课程反馈)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| user_id | UUID (FK) | 用户 ID |
| course_id | UUID (FK) | 课程 ID |
| rating | Integer | 评分(1-5): 星级评价 |
| comment | Text | 文字评论。这些数据会展示在课程介绍页，帮助其他用户决策是否学习该课程 |
| created_at | Timestamp | 创建时间 |

### 6. 系统与订阅 (System & Subscription)

#### app_versions(版本控制)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| version | Text | 版本号（如 '1.0.2'） |
| platform | Enum ('ios', 'android', 'web') | 平台 |
| is_mandatory | Boolean | 强制更新开关(如果API 接口发生了重大破坏性变更（Breaking Change），旧版 App 会崩溃。此时将新版本设为 mandatory=true，旧版 App 启动时检测到此标志，会弹窗强制用户去商店更新，否则无法使用)|
| changelog | Text | 更新说明 |

#### subscriptions(会员订阅)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| user_id | UUID (FK) | 用户 ID |
| plan_id | Text | 计划 ID（Stripe/AppStore）对应第三方支付平台（如 Stripe, Apple IAP, Google Play Billing）的产品 ID |
| status | Enum ('active', 'canceled', 'expired') | active: 正常付费中，解锁所有 price_tier = premium 的课程,canceled: 用户已取消自动续费，但当前周期未结束，仍有权限。expired: 订阅已过期，权限收回|
| start_date | Timestamp | 开始时间 |
| end_date | Timestamp | 结束时间 |
