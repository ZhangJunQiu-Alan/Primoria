# 数据库设计

## 表设计

### 1. 用户管理 (User Management)

#### profiles(用户档案)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 主键，引用 auth.users.id，用户 id 系统生成 |
| username | text | 用户昵称，唯一 |
| avatar_url | text | 头像 URL |
| bio | text | 个人简介（限定100汉字/200英文字符，超过2行约40字用...截断） |
| role | Enum ('user','subscriber','author','admin') | 用户角色：user-普通用户，subscriber-订阅用户，author-课程制作者，admin-管理员 |
| created_at | timestamp | 创建账户时间 |
| updated_at | timestamp | 更新时间（用于头像刷新、缓存更新、安全审计、权限变更追踪） |
| last_active_at | timestamp | 最后活跃时间（用于计算用户活跃度） |

#### user_settings(用户设置)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| user_id | UUID (PK, FK) | 用户 ID |
| theme_mode | Enum ('system','light','dark') | 主题模式 |
| notification_daily_reminder | Boolean | 每日提醒开关 |
| notification_reminder_time | Time | 提醒时间 |
| marketing_emails | Boolean | 营销邮件开关 |
| language | Text | 语言（默认'zh-CN'） |
| accessibility_mode | Boolean | 无障碍模式 |

### 2. 课程内容 (Course Content)

#### subjects(学科/分类)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| name | Text | 学科名称（如"Computer Science"、"Physics"） |
| icon_url | Text | 存储 SVG 或 PNG 图标的链接，用于在首页分类卡片上显示图标。|
| color_hex | Text | 存储颜色代码（如 #FF5733）。在 Flutter 端，这会被解析为 Color(0xFFFF5733)，用于渲染该学科的主题色背景或渐变 |
| parent_subject_id | UUID (FK) | 父分类ID（用于子分类，如 Math -> Algebra） |

#### courses(课程)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| author_id | UUID (FK) | 作者 ID，引用 profiles |
| subject_id | UUID (FK) | 学科 ID |
| title | Text | 课程标题 |
| slug | Text | 利于 SEO 和分享。必须全局唯一 |
| description | Text | 课程描述 |
| thumbnail_url | Text | 课程封面的图片地址 |
| difficulty_level | Enum ('beginner', 'intermediate', 'advanced') | 用于用户筛选课程，或根据用户水平推荐 |
| status | Enum ('draft', 'published', 'archived') | 发布状态:draft: 草稿，仅作者可见（Builder 中编辑中）。published: 已发布，学员可见（Viewer 中可学习）。archived: 已归档，不再展示但数据保留 |
| estimated_minutes | Integer | 预计完成时间，用于显示“约 2 小时课程” |
| tags | Array<Text> | PostgreSQL 数组类型。用于搜索优化，例如 ['递归', '算法', 'Python']|
| price_tier | Enum ('free', 'premium') | 区分免费课和付费课。前端据此判断是否显示“锁”图标 |
| created_at | Timestamp | 创建时间 |

#### chapters(章节/模块)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| course_id | UUID (FK) | 课程 ID |
| title | Text | 章节标题 |
| description | Text | 章节描述 |
| sequence_order | Integer | 决定章节的排列顺序（第1章、第2章）。Builder 端拖拽排序时更新此字段。|
| is_locked | Boolean | 游戏化设计。如果为 true，则必须完成上一章节才能解锁此章节（或者需要付费） |

#### lessons(课时/页面)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| chapter_id | UUID (FK) | 章节 ID |
| title | Text | 课时标题 |
| type | Enum ('interactive', 'quiz', 'video', 'article') | 课时类型 |
| sequence_order | Integer | 排序 |
| xp_reward | Integer | 完成课时奖励的 XP |
| duration_seconds | Integer | 预计耗时（秒） |
| content_json | JSONB | 页面完整结构（JSON 格式） |

#### content_blocks(内容块)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| lesson_id | UUID (FK) | 课时 ID |
| type | Enum ('text', 'image', 'code_playground', 'multiple_choice', 'slider', 'info_card') | 块类型 |
| content | JSONB | 具体内容（Markdown 文本、图片 URL、代码片段） |
| config | JSONB | 配置（正确答案、验证逻辑、滑块范围） |
| sequence_order | Integer | 排序 |
| is_interactive | Boolean | 是否需要用户操作 |

### 3. 学习进度与追踪 (Learning & Progress)

#### enrollments(选课记录)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| user_id | UUID (FK) | 用户 ID |
| course_id | UUID (FK) | 课程 ID |
| status | Enum ('in_progress', 'completed', 'dropped') | 状态 |
| progress_percentage | Float | 进度百分比 |
| last_accessed_at | Timestamp | 最后访问时间 |
| started_at | Timestamp | 开始时间 |
| completed_at | Timestamp | 完成时间 |

#### lesson_completions(完课记录)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| user_id | UUID (FK) | 用户 ID |
| lesson_id | UUID (FK) | 课时 ID |
| score | Integer | 分数（如果是测验） |
| time_spent_seconds | Integer | 耗时（秒） |
| attempts_count | Integer | 尝试次数 |
| completed_at | Timestamp | 完成时间 |

#### block_interactions(交互详情)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| user_id | UUID (FK) | 用户 ID |
| block_id | UUID (FK) | 内容块 ID |
| user_input | JSONB | 用户输入（代码、选项、滑块值） |
| is_correct | Boolean | 是否正确 |
| created_at | Timestamp | 创建时间 |

### 4. 游戏化与成就 (Gamification)

#### user_stats(用户统计 - 实时缓存)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| user_id | UUID (PK, FK) | 用户 ID |
| total_xp | Integer | 总 XP |
| current_streak | Integer | 当前连续天数 |
| longest_streak | Integer | 历史最高连续天数 |
| courses_completed | Integer | 完成课程数 |
| lessons_completed | Integer | 完成课时数 |
| last_activity_date | Date | 最后活跃日期（用于计算 Streak） |

#### daily_activity_log(每日活跃日志)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| user_id | UUID (FK) | 用户 ID |
| date | Date | 日期 |
| xp_earned | Integer | 获得 XP |
| lessons_count | Integer | 完成课时数 |
| **Primary Key** | **(user_id, date)** | 复合主键 |

#### achievements(成就定义)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| slug | Text | 唯一标识（如 'first_lesson', '7_day_streak'） |
| name | Text | 成就名称 |
| description | Text | 成就描述 |
| icon_url | Text | 成就图标 |
| category | Enum ('streak', 'learning', 'social') | 成就分类 |
| xp_bonus | Integer | XP 奖励 |

#### user_achievements(用户获得成就)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| user_id | UUID (FK) | 用户 ID |
| achievement_id | UUID (FK) | 成就 ID |
| earned_at | Timestamp | 获得时间 |

#### xp_transactions(XP 流水)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| user_id | UUID (FK) | 用户 ID |
| amount | Integer | XP 数量 |
| source_type | Enum ('lesson_complete', 'daily_bonus', 'achievement', 'admin_adjustment') | 来源类型 |
| reference_id | UUID | 关联 ID（lesson_id 或 achievement_id） |
| created_at | Timestamp | 创建时间 |

### 5. 社交与互动 (Social)

#### follows(关注关系)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| follower_id | UUID (FK) | 粉丝 ID，引用 profiles |
| following_id | UUID (FK) | 被关注人 ID，引用 profiles |
| created_at | Timestamp | 创建时间 |
| **Primary Key** | **(follower_id, following_id)** | 复合主键 |

#### course_feedback(课程反馈)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| user_id | UUID (FK) | 用户 ID |
| course_id | UUID (FK) | 课程 ID |
| rating | Integer | 评分（1-5） |
| comment | Text | 评论 |
| created_at | Timestamp | 创建时间 |

### 6. 系统与订阅 (System & Subscription)

#### app_versions(版本控制)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| version | Text | 版本号（如 '1.0.2'） |
| platform | Enum ('ios', 'android', 'web') | 平台 |
| is_mandatory | Boolean | 是否强制更新 |
| changelog | Text | 更新说明 |

#### subscriptions(会员订阅 - 预留)
| 列名 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID (PK) | 主键 |
| user_id | UUID (FK) | 用户 ID |
| plan_id | Text | 计划 ID（Stripe/AppStore） |
| status | Enum ('active', 'canceled', 'expired') | 状态 |
| start_date | Timestamp | 开始时间 |
| end_date | Timestamp | 结束时间 |
