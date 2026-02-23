# 数据库设计（PostgreSQL）
系统原则：凡是“由用户动作触发的状态字段更新”，默认采用 5 分钟防抖；凡是“审计/分析事件”，采用 append-only + 分区策略。
last_active：5 分钟防抖
last_accessed：5 分钟防抖
streak/day log：按天 upsert
interactions：仅插入，按月分区

## 表设计

### 1. 用户管理

#### profiles（用户资料）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 主键，外键 -> auth.users.id，系统生成的用户 ID |
| username | text | UNIQUE，CHECK (length(username) between 3 and 32)，展示名，唯一 |
| avatar_url | text | 头像 URL |
| bio | text | 个性签名（中文 100 字 / 英文 200 字上限；展示层约 2 行或约 40 字后截断并加 `...`） |
| role | Enum ('user','subscriber','author','admin') | 用户角色：user 普通用户、subscriber 订阅用户、author 创作者、admin 管理员 |
| created_at | timestamp | 账号创建时间 |
| updated_at | timestamp | 由触发器维护，更新时间（用于头像刷新、缓存更新、安全审计、权限变更跟踪） |
| last_active_at | timestamp | 最近活跃时间（用于活跃度指标）。请求过程中不直接写 Postgres，先写 Redis/内存，再每 5 分钟批量回写 |

#### user_settings（用户设置）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| user_id | UUID (PK, FK) | 主键且外键 -> profiles.id，用户 ID |
| theme_mode | Enum ('system','light','dark') | 默认：system，主题模式 |
| notification_daily_reminder | Boolean | 默认：false，每日提醒开关 |
| notification_reminder_time | Time | 默认：`09:00`，提醒时间 |
| marketing_emails | Boolean | 默认：false，营销邮件开关 |
| language | Text | 语言（默认 `zh-CN`） |
| accessibility_mode | Boolean | 默认：false，无障碍模式 |

### 2. 课程内容

#### subjects（学科/分类）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 默认：gen_random_uuid() 主键 |
| name | Text | UNIQUE 学科名（如 “Computer Science”“Physics”） |
| icon_url | Text | SVG/PNG 图标链接，用于首页分类卡 |
| color_hex | Text | CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$')，存储十六进制颜色（如 #FF5733）。Flutter 侧解析为 `Color(0xFFFF5733)` 作为主题色/渐变背景 |
| parent_subject_id | UUID (FK) | 外键 -> subjects.id（可空），父分类 ID（例如 Math -> Algebra） |

#### courses（课程）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 默认：gen_random_uuid() 主键 |
| author_id | UUID (FK) | 外键 -> profiles.id，作者 ID |
| subject_id | UUID (FK) | 外键 -> subjects.id，学科 ID |
| title | Text | 课程标题 |
| slug | Text | UNIQUE（小写 + 连字符，应用层生成）。用于 SEO 与分享，需全局唯一 |
| description | Text | 课程简介 |
| thumbnail_url | Text | 课程封面图 URL |
| difficulty_level | Enum ('beginner', 'intermediate', 'advanced') | 默认 `beginner`，用于筛选与推荐 |
| status | Enum ('draft', 'published', 'archived') | 默认 `draft`。draft：仅作者可见（Builder 编辑）；published：学习者可见（Viewer 学习）；archived：隐藏但保留数据 |
| estimated_minutes | Integer | 默认 0，预计学习时长（用于展示“约 2 小时”） |
| tags | Array<Text> | 默认 `{}`，PostgreSQL 数组。用于搜索优化，例如 `['recursion','algorithms','Python']` |
| price_tier | Enum ('free', 'premium') | 默认 `free`，区分免费/付费。前端可据此展示“锁”图标 |
| created_at | Timestamp | 默认 now() 创建时间 |
| updated_at | timestamptz | 默认 now()，触发器更新 |
| published_at | timestamptz | 发布时写入 |
| search_tsv | tsvector | 生成列（title/description/tags）用于全文检索 |

#### lessons（课时）包含用于 Viewer 快速渲染的快照数据
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| course_id | UUID (FK) | 外键 -> courses.id，课程 ID（课时直接隶属课程） |
| group_title | Text | 默认 `Chapter 1`。用于 Viewer/Builder 的分组展示文案（不再有独立 chapters 表） |
| group_sort_key | bigint | 默认 1000。分组排序键，支持插入与拖拽重排 |
| title | Text | 课时标题 |
| type | Enum ('interactive', 'quiz', 'video', 'article') | 默认 interactive，课时类型 |
| sort_key | bigint | 默认 1000。组内课时排序键；Builder 保存时更新 |
| xp_reward | Integer | 默认 0，CHECK (xp_reward >= 0)，完成课时的 XP 奖励 |
| duration_seconds | Integer | 默认 0，预计时长（秒） |
| is_locked | Boolean | 默认 true，课时锁状态 |
| unlock_type | Enum ('none','prerequisite','paid','prerequisite_or_paid','prerequisite_and_paid') | 默认 `none`，解锁策略 |
| prerequisite_lesson_id | UUID (FK -> lessons.id) | 可空，前置课时 ID |
| paywall_product_id | Text | 可空，付费商品 ID |
| content_json | JSONB | 默认 `{}`，该课时下全部 `content_blocks` 的聚合快照，含排序后的页面结构 |
| content_hash | text | 内容哈希，用于变更检测与缓存校验 |
| created_at | timestamptz | now() 创建时间 |
| updated_at | timestamptz | now() 触发器更新时间 |

#### content_blocks（内容块）是唯一事实来源（Source of Truth），Builder 的 CRUD 直接落这个表
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| lesson_id | UUID (FK) | 外键 -> lessons.id，所属课时 |
| type | Enum ('text', 'image', 'code_playground', 'multiple_choice', 'slider', 'info_card') | 组件类型，决定渲染逻辑 |
| content | JSONB | 静态展示数据（如提示文案、默认代码） |
| config | JSONB | 逻辑配置数据（如校验规则、答案、范围） |
| sort_key | bigint | 默认 1000，约束：UNIQUE(lesson_id, sort_key)。决定页面内顺序，支持拖拽排序；Builder 在保存时更新 |
| is_interactive | Boolean | 是否需要用户交互 |
| created_at | timestamptz | 默认 now() 创建时间 |
| updated_at | timestamptz | 默认 now()，触发器更新时间 |
| updated_by | uuid | 外键 -> profiles.id（审计/协作） |

策略与流程说明

核心思路是分离“编辑”与“读取”两种职责：

1. **写入链路（Builder 创作侧）**：
* 作者在 Builder 编辑后点击 Save/Publish，系统对 `content_blocks` 执行原子化增删改（Insert/Update/Delete）。这样可支持数据库层面的细粒度搜索（例如“查找所有包含 Python 2 代码的 Block”）。
* **同步机制（快照）**：当作者触发 Save/Publish 时，后端聚合该 Lesson 下所有 Block，按 `sort_key` 排序，封装成完整 JSON，回写到 `lessons.content_json`。

2. **读取链路（Viewer 渲染侧）**：
* Viewer 只需请求 `lessons` 表，读取 `content_json` 即可一次请求拿到完整渲染数据（1 RTT），避免复杂 Join，显著改善首屏与交互体验。

3. **分析链路（Analytics）**：
* 虽然 Viewer 读的是 JSON 快照，但每个组件仍保留原始 `block_id`。
* 用户交互（如代码提交、滑块拖动）上报包含 `block_id`，可反查 `content_blocks` 进行知识点粒度的通过率与交互分析，支撑教学质量优化。

排序相关字段（`group_sort_key`、`sort_key`）仅在 Save/Publish 时更新，避免频繁写库。
**`sort_key` 的潜在问题**与**对应方案**：

### 1. 间隔耗尽（理论问题）
**问题**
* 同一区间频繁插入会压缩 key 间距。

**方案**
* 使用 `BIGINT`
* 当相邻差值 <= 2 时，对课时分组/课时做重排
* 重排只在 Save/Publish 触发
> 概率极低，可接受

---

### 2. sort_key 不直观
**问题**
* `sort_key` 不是面向人的展示序号。

**方案**
* UI 使用 `row_number()` 生成展示顺序
* 文档明确 `sort_key` 为内部实现细节

---

### 3. 查询必须有索引
**问题**
* `order by sort_key` 无索引会很慢。

**方案**
* 建立复合索引：
  * `(course_id, group_sort_key, sort_key, id)`
  * `(course_id, sort_key, id)`
  * `(lesson_id, sort_key)`

### 3. 学习与进度

#### enrollments（选课关系）
| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| id | uuid | gen_random_uuid() | 主键 |
| user_id | uuid |  | 外键 -> profiles.id，用户 ID |
| course_id | uuid |  | 外键 -> courses.id，课程 ID |
| status | Enum ('in_progress', 'completed', 'dropped') | `in_progress` | 当前状态（进行中/已完成/已放弃） |
| progress_bp | integer | 0 | 进度基点 0~10000（替代浮点，控制更稳定），CHECK (progress_bp between 0 and 10000)。前端进度条直接读该字段。每次课时完成由后端函数更新 |
| last_accessed_at | timestamptz | now() | 最近访问时间 |
| started_at | timestamptz | now() | 开始时间 |
| completed_at | timestamptz |  | 完成时间 |
|  |  |  | UNIQUE(user_id, course_id) 防止重复选课 |

#### lesson_completions（课时完成记录）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| user_id | UUID (FK) | 用户 ID |
| lesson_id | UUID (FK) | 课时 ID |
| score | Integer | 课时得分（如 quiz） |
| time_spent_seconds | Integer | 本次完成耗时（秒） |
| completed_at | Timestamp | 完成时间 |

#### block_interactions（交互明细）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| user_id | UUID (FK) | 用户 ID |
| block_id | UUID (FK) | 内容块 ID |
| user_input | JSONB | 用户交互输入（代码、选项、滑块值等） |
| is_correct | Boolean | 交互是否正确。用于分析知识点通过率并帮助作者优化内容 |
| created_at | Timestamp | 创建时间 |

### 4. 游戏化

#### user_stats（用户统计，实时缓存；避免每次进 Profile 都全量扫历史导致慢查询）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| user_id | UUID (PK, FK) | 用户 ID |
| total_xp | Integer | 累计 XP |
| current_streak | Integer | 当前连续打卡天数，关键留存指标 |
| longest_streak | Integer | 历史最长连续天数 |
| courses_completed | Integer | 完成课程数 |
| lessons_completed | Integer | 完成课时数 |
| last_activity_date | Date | 最近活跃日期（用于计算连续天数） |

#### daily_activity_log（每日活跃日志；设计目标是生成 GitHub 风格“绿墙”热力图）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| user_id | UUID (FK) | 用户 ID |
| date | Date | 日期 |
| xp_earned | Integer | 当日累计 XP |
| lessons_count | Integer | 当日完成课时数 |
| **主键** | **(user_id, date)** | 复合主键，保证每个用户每天仅一条。每次 XP 事件执行 `INSERT ... ON CONFLICT (user_id, date) DO UPDATE SET xp_earned = xp_earned + EXCLUDED.xp_earned ...`，避免重复并便于热力图统计 |

#### achievements（成就定义）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| slug | Text | 代码中的唯一标识（如 `first_lesson`、`7_day_streak`） |
| name | Text | 成就名称 |
| description | Text | 成就描述 |
| icon_url | Text | 成就图标 |
| category | Enum ('streak', 'learning', 'social') | 分类，用于 UI 分栏（如“学习成就”“社交成就”） |

#### user_achievements（用户已获得成就）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| user_id | UUID (FK) | 用户 ID |
| achievement_id | UUID (FK) | 成就 ID |
| earned_at | Timestamp | 获得时间 |

#### xp_transactions（XP 流水）设计目标：审计账本。若用户反馈 XP 异常或管理员手动修正，可追溯于此。
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| user_id | UUID (FK) | 用户 ID |
| amount | Integer | XP 数值 |
| source_type | Enum ('lesson_complete', 'daily_bonus', 'admin_adjustment') | XP 来源描述，用于防刷（如限制 daily_bonus） |
| reference_id | UUID | 关联 ID（如 lesson_id） |
| created_at | Timestamp | 创建时间 |

### 5. 社交

#### follows（关注关系，标准社交网络模型；支持关注优质作者或高阶学习者）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| follower_id | UUID (FK) | 关注者 ID，引用 profiles |
| following_id | UUID (FK) | 被关注者 ID，引用 profiles |
| created_at | Timestamp | 创建时间 |
| **主键** | **(follower_id, following_id)** | 复合主键 |
CHECK (follower_id <> following_id) + PK(follower_id, following_id) 可防止自关注

#### course_feedback（课程反馈）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| user_id | UUID (FK) | 用户 ID |
| course_id | UUID (FK) | 课程 ID |
| rating | Integer | 评分（1-5） |
| comment | Text | 文本评价。展示在课程详情页，帮助其他用户做决策 |
| created_at | Timestamp | 创建时间 |

### 6. 存储桶（Storage Buckets）

#### avatars（Supabase Storage）
| 属性 | 值 |
| --- | --- |
| Bucket ID | `avatars` |
| Public | 是（公开读，无需鉴权） |
| 最大文件大小 | 5 MB |
| 允许 MIME 类型 | `image/jpeg`, `image/png`, `image/webp`, `image/gif` |
| Insert | 仅认证用户 |
| Update / Delete | 仅对象 owner（`storage.objects.owner = auth.uid()`） |
| 路径规范 | `public/<user_uuid>/avatar_<timestamp>.<ext>` |

由迁移 `20260223000004_profile_avatar_storage.sql` 创建。`SupabaseService.uploadAvatar()` 返回的公开 URL 存储在 `profiles.avatar_url`。

---

### 7. 系统与订阅

#### app_versions（版本控制）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| version | Text | 版本号（如 `1.0.2`） |
| platform | Enum ('ios', 'android', 'web') | 平台 |
| is_mandatory | Boolean | 是否强更。若 API 发生破坏性变更导致旧版不可用，设为 true，旧端需强制升级后才能继续使用 |
| changelog | Text | 更新日志 |

#### subscriptions（会员订阅）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| user_id | UUID (FK) | 用户 ID |
| plan_id | Text | 套餐 ID（Stripe/AppStore），对应支付平台商品 ID（Stripe、Apple IAP、Google Play Billing） |
| status | Enum ('active', 'canceled', 'expired') | active：订阅中可访问全部高级课程；canceled：取消续费但当前周期有效；expired：订阅过期，权限回收 |
| start_date | Timestamp | 开始时间 |
| end_date | Timestamp | 结束时间 |
