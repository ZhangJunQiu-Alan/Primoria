-- Seed three browseable STEM test courses for the learner library.
-- Idempotent: safe to run multiple times.

WITH resolved_author AS (
  SELECT COALESCE(
    (
      SELECT id
      FROM profiles
      WHERE id = '00000000-0000-0000-0000-000000000001'
    ),
    (
      SELECT id
      FROM profiles
      WHERE role IN ('author', 'admin')
      ORDER BY created_at NULLS LAST, id
      LIMIT 1
    ),
    (
      SELECT id
      FROM profiles
      ORDER BY created_at NULLS LAST, id
      LIMIT 1
    )
  ) AS id
),
inserted_subject AS (
  INSERT INTO subjects (id, name, color_hex)
  SELECT
    '10000000-0000-0000-0000-000000000101',
    'Physics',
    '#D19A5F'
  WHERE NOT EXISTS (
    SELECT 1
    FROM subjects
    WHERE lower(name) = 'physics'
  )
  RETURNING id
),
resolved_subject AS (
  SELECT id FROM inserted_subject
  UNION ALL
  SELECT id
  FROM subjects
  WHERE lower(name) = 'physics'
  LIMIT 1
)
INSERT INTO courses (
  id,
  author_id,
  subject_id,
  title,
  slug,
  description,
  difficulty_level,
  status,
  estimated_minutes,
  tags,
  price_tier,
  published_at
)
SELECT
  '20000000-0000-0000-0000-000000000101',
  author.id,
  subject.id,
  '运动与力学观察',
  'motion-and-mechanics-observation',
  '用图像、受力图和能量判断，把力学里最常见的三类问题看得更清楚。',
  'beginner',
  'published',
  48,
  ARRAY['physics', 'mechanics', 'graphs'],
  'free',
  TIMESTAMPTZ '2026-04-04 08:00:00+00'
FROM resolved_author author
CROSS JOIN resolved_subject subject
WHERE author.id IS NOT NULL
ON CONFLICT (slug) DO UPDATE SET
  subject_id = EXCLUDED.subject_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  difficulty_level = EXCLUDED.difficulty_level,
  status = EXCLUDED.status,
  estimated_minutes = EXCLUDED.estimated_minutes,
  tags = EXCLUDED.tags,
  price_tier = EXCLUDED.price_tier,
  published_at = EXCLUDED.published_at,
  updated_at = NOW();

WITH resolved_author AS (
  SELECT COALESCE(
    (
      SELECT id
      FROM profiles
      WHERE id = '00000000-0000-0000-0000-000000000001'
    ),
    (
      SELECT id
      FROM profiles
      WHERE role IN ('author', 'admin')
      ORDER BY created_at NULLS LAST, id
      LIMIT 1
    ),
    (
      SELECT id
      FROM profiles
      ORDER BY created_at NULLS LAST, id
      LIMIT 1
    )
  ) AS id
),
inserted_subject AS (
  INSERT INTO subjects (id, name, color_hex)
  SELECT
    '10000000-0000-0000-0000-000000000102',
    'Computer Science',
    '#7A9E7E'
  WHERE NOT EXISTS (
    SELECT 1
    FROM subjects
    WHERE lower(name) = 'computer science'
  )
  RETURNING id
),
resolved_subject AS (
  SELECT id FROM inserted_subject
  UNION ALL
  SELECT id
  FROM subjects
  WHERE lower(name) = 'computer science'
  LIMIT 1
)
INSERT INTO courses (
  id,
  author_id,
  subject_id,
  title,
  slug,
  description,
  difficulty_level,
  status,
  estimated_minutes,
  tags,
  price_tier,
  published_at
)
SELECT
  '20000000-0000-0000-0000-000000000102',
  author.id,
  subject.id,
  '编程思维与网页交互',
  'programming-thinking-and-web-interaction',
  '从变量和条件开始，再进入网页结构、按钮交互和调试修复，把编程直觉搭起来。',
  'beginner',
  'published',
  54,
  ARRAY['coding', 'web', 'debugging'],
  'free',
  TIMESTAMPTZ '2026-04-04 08:02:00+00'
FROM resolved_author author
CROSS JOIN resolved_subject subject
WHERE author.id IS NOT NULL
ON CONFLICT (slug) DO UPDATE SET
  subject_id = EXCLUDED.subject_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  difficulty_level = EXCLUDED.difficulty_level,
  status = EXCLUDED.status,
  estimated_minutes = EXCLUDED.estimated_minutes,
  tags = EXCLUDED.tags,
  price_tier = EXCLUDED.price_tier,
  published_at = EXCLUDED.published_at,
  updated_at = NOW();

WITH resolved_author AS (
  SELECT COALESCE(
    (
      SELECT id
      FROM profiles
      WHERE id = '00000000-0000-0000-0000-000000000001'
    ),
    (
      SELECT id
      FROM profiles
      WHERE role IN ('author', 'admin')
      ORDER BY created_at NULLS LAST, id
      LIMIT 1
    ),
    (
      SELECT id
      FROM profiles
      ORDER BY created_at NULLS LAST, id
      LIMIT 1
    )
  ) AS id
),
inserted_subject AS (
  INSERT INTO subjects (id, name, color_hex)
  SELECT
    '10000000-0000-0000-0000-000000000103',
    'Data Science & AI',
    '#9481A8'
  WHERE NOT EXISTS (
    SELECT 1
    FROM subjects
    WHERE lower(name) = 'data science & ai'
  )
  RETURNING id
),
resolved_subject AS (
  SELECT id FROM inserted_subject
  UNION ALL
  SELECT id
  FROM subjects
  WHERE lower(name) = 'data science & ai'
  LIMIT 1
)
INSERT INTO courses (
  id,
  author_id,
  subject_id,
  title,
  slug,
  description,
  difficulty_level,
  status,
  estimated_minutes,
  tags,
  price_tier,
  published_at
)
SELECT
  '20000000-0000-0000-0000-000000000103',
  author.id,
  subject.id,
  '数据与 AI 入门',
  'data-and-ai-basics',
  '把数据、特征、预测和 prompt 评估连成一条线，理解 AI 系统最基础的工作方式。',
  'intermediate',
  'published',
  52,
  ARRAY['data', 'ai', 'prompting'],
  'free',
  TIMESTAMPTZ '2026-04-04 08:04:00+00'
FROM resolved_author author
CROSS JOIN resolved_subject subject
WHERE author.id IS NOT NULL
ON CONFLICT (slug) DO UPDATE SET
  subject_id = EXCLUDED.subject_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  difficulty_level = EXCLUDED.difficulty_level,
  status = EXCLUDED.status,
  estimated_minutes = EXCLUDED.estimated_minutes,
  tags = EXCLUDED.tags,
  price_tier = EXCLUDED.price_tier,
  published_at = EXCLUDED.published_at,
  updated_at = NOW();

INSERT INTO lessons (
  id,
  course_id,
  title,
  type,
  sort_key,
  xp_reward,
  duration_seconds,
  content_json,
  is_locked,
  unlock_type,
  prerequisite_lesson_id,
  paywall_product_id
)
SELECT
  '40000000-0000-0000-0000-000000000101',
  c.id,
  '用图像读懂速度与位移',
  'interactive',
  1000,
  120,
  540,
  $$
  {
    "pages": [
      {
        "page_id": "physics-1-page-1",
        "order": 0,
        "title": "图像和运动",
        "blocks": [
          {
            "id": "physics-1-intro",
            "type": "text",
            "position": { "order": 0 },
            "content": {
              "format": "richtext",
              "value": { "ops": [{ "insert": "位移-时间图的斜率表示速度。先看线条是变陡、变平，还是保持恒定，再判断运动状态。\\n" }] }
            }
          },
          {
            "id": "physics-1-mc",
            "type": "multiple-choice",
            "position": { "order": 1 },
            "content": {
              "question": "位移-时间图是一条向上且斜率恒定的直线，这意味着什么？",
              "options": [
                { "id": "a", "text": "物体静止不动", "isCorrect": false },
                { "id": "b", "text": "物体做匀速前进", "isCorrect": true },
                { "id": "c", "text": "物体速度不断增大", "isCorrect": false }
              ]
            }
          }
        ]
      },
      {
        "page_id": "physics-1-page-2",
        "order": 1,
        "title": "读图步骤",
        "blocks": [
          {
            "id": "physics-1-visual",
            "type": "interactive-visual",
            "position": { "order": 0 },
            "content": {
              "template": "motion-graph-observer",
              "title": "观察位移图和速度变化"
            }
          },
          {
            "id": "physics-1-match",
            "type": "matching",
            "position": { "order": 1 },
            "content": {
              "pairs": [
                { "id": "p1", "left": "斜率为零", "right": "速度为零" },
                { "id": "p2", "left": "斜率变大", "right": "速度增大" },
                { "id": "p3", "left": "斜率为负", "right": "向反方向运动" }
              ]
            }
          }
        ]
      },
      {
        "page_id": "physics-1-page-3",
        "order": 2,
        "title": "一句总结",
        "blocks": [
          {
            "id": "physics-1-fill",
            "type": "fill-blank",
            "position": { "order": 0 },
            "content": {
              "template": "读位移-时间图时，先看斜率，再判断 ___ 。",
              "blanks": [{ "id": "physics-1-fill-blank", "answer": "速度" }]
            }
          }
        ]
      }
    ]
  }
  $$::jsonb,
  false,
  'none',
  NULL,
  NULL
FROM courses c
WHERE c.slug = 'motion-and-mechanics-observation'
ON CONFLICT (id) DO UPDATE SET
  course_id = EXCLUDED.course_id,
  title = EXCLUDED.title,
  type = EXCLUDED.type,
  sort_key = EXCLUDED.sort_key,
  xp_reward = EXCLUDED.xp_reward,
  duration_seconds = EXCLUDED.duration_seconds,
  content_json = EXCLUDED.content_json,
  is_locked = EXCLUDED.is_locked,
  unlock_type = EXCLUDED.unlock_type,
  prerequisite_lesson_id = EXCLUDED.prerequisite_lesson_id,
  paywall_product_id = EXCLUDED.paywall_product_id,
  updated_at = NOW();

INSERT INTO lessons (
  id, course_id, title, type, sort_key, xp_reward, duration_seconds, content_json, is_locked, unlock_type, prerequisite_lesson_id, paywall_product_id
)
SELECT
  '40000000-0000-0000-0000-000000000102',
  c.id,
  '受力分析与牛顿定律',
  'interactive',
  2000,
  130,
  600,
  $$
  {
    "pages": [
      {
        "page_id": "physics-2-page-1",
        "order": 0,
        "title": "受力图",
        "blocks": [
          {
            "id": "physics-2-intro",
            "type": "text",
            "position": { "order": 0 },
            "content": {
              "format": "richtext",
              "value": { "ops": [{ "insert": "受力分析时先找研究对象，再列出真实存在的力，最后判断合力方向和加速度方向。\\n" }] }
            }
          },
          {
            "id": "physics-2-sort",
            "type": "sorting",
            "position": { "order": 1 },
            "content": {
              "prompt": "把受力分析的顺序排正确",
              "items": ["判断合力", "选研究对象", "画出各个力"],
              "correctOrder": ["选研究对象", "画出各个力", "判断合力"]
            }
          }
        ]
      },
      {
        "page_id": "physics-2-page-2",
        "order": 1,
        "title": "牛顿第二定律",
        "blocks": [
          {
            "id": "physics-2-mc",
            "type": "multiple-choice",
            "position": { "order": 0 },
            "content": {
              "question": "如果合力方向向右，那么物体的加速度方向通常是？",
              "options": [
                { "id": "a", "text": "向左", "isCorrect": false },
                { "id": "b", "text": "向右", "isCorrect": true },
                { "id": "c", "text": "与质量方向相同", "isCorrect": false }
              ]
            }
          },
          {
            "id": "physics-2-fill",
            "type": "fill-blank",
            "position": { "order": 1 },
            "content": {
              "template": "牛顿第二定律常写成 F = m × ___ 。",
              "blanks": [{ "id": "physics-2-fill-blank", "answer": "a", "alternatives": ["加速度"] }]
            }
          }
        ]
      }
    ]
  }
  $$::jsonb,
  false,
  'none',
  NULL,
  NULL
FROM courses c
WHERE c.slug = 'motion-and-mechanics-observation'
ON CONFLICT (id) DO UPDATE SET
  course_id = EXCLUDED.course_id,
  title = EXCLUDED.title,
  type = EXCLUDED.type,
  sort_key = EXCLUDED.sort_key,
  xp_reward = EXCLUDED.xp_reward,
  duration_seconds = EXCLUDED.duration_seconds,
  content_json = EXCLUDED.content_json,
  is_locked = EXCLUDED.is_locked,
  unlock_type = EXCLUDED.unlock_type,
  prerequisite_lesson_id = EXCLUDED.prerequisite_lesson_id,
  paywall_product_id = EXCLUDED.paywall_product_id,
  updated_at = NOW();

INSERT INTO lessons (
  id, course_id, title, type, sort_key, xp_reward, duration_seconds, content_json, is_locked, unlock_type, prerequisite_lesson_id, paywall_product_id
)
SELECT
  '40000000-0000-0000-0000-000000000103',
  c.id,
  '能量守恒与实验判断',
  'interactive',
  3000,
  150,
  660,
  $$
  {
    "pages": [
      {
        "page_id": "physics-3-page-1",
        "order": 0,
        "title": "能量视角",
        "blocks": [
          {
            "id": "physics-3-intro",
            "type": "text",
            "position": { "order": 0 },
            "content": {
              "format": "richtext",
              "value": { "ops": [{ "insert": "当题目出现高度、速度、弹簧形变时，可以优先切换到能量视角：动能、重力势能和弹性势能如何转化。\\n" }] }
            }
          },
          {
            "id": "physics-3-mc",
            "type": "multiple-choice",
            "position": { "order": 1 },
            "content": {
              "question": "忽略阻力时，小球从高处滑下，重力势能主要转化为什么？",
              "options": [
                { "id": "a", "text": "热量", "isCorrect": false },
                { "id": "b", "text": "动能", "isCorrect": true },
                { "id": "c", "text": "质量", "isCorrect": false }
              ]
            }
          }
        ]
      },
      {
        "page_id": "physics-3-page-2",
        "order": 1,
        "title": "实验判断",
        "blocks": [
          {
            "id": "physics-3-fill",
            "type": "fill-blank",
            "position": { "order": 0 },
            "content": {
              "template": "实验误差较小时，机械能总量可以近似看作 ___ 。",
              "blanks": [{ "id": "physics-3-fill-blank", "answer": "守恒" }]
            }
          },
          {
            "id": "physics-3-match",
            "type": "matching",
            "position": { "order": 1 },
            "content": {
              "pairs": [
                { "id": "p1", "left": "高度增加", "right": "重力势能增加" },
                { "id": "p2", "left": "速度增加", "right": "动能增加" },
                { "id": "p3", "left": "弹簧压缩", "right": "弹性势能增加" }
              ]
            }
          }
        ]
      }
    ]
  }
  $$::jsonb,
  false,
  'none',
  NULL,
  NULL
FROM courses c
WHERE c.slug = 'motion-and-mechanics-observation'
ON CONFLICT (id) DO UPDATE SET
  course_id = EXCLUDED.course_id,
  title = EXCLUDED.title,
  type = EXCLUDED.type,
  sort_key = EXCLUDED.sort_key,
  xp_reward = EXCLUDED.xp_reward,
  duration_seconds = EXCLUDED.duration_seconds,
  content_json = EXCLUDED.content_json,
  is_locked = EXCLUDED.is_locked,
  unlock_type = EXCLUDED.unlock_type,
  prerequisite_lesson_id = EXCLUDED.prerequisite_lesson_id,
  paywall_product_id = EXCLUDED.paywall_product_id,
  updated_at = NOW();

INSERT INTO lessons (
  id, course_id, title, type, sort_key, xp_reward, duration_seconds, content_json, is_locked, unlock_type, prerequisite_lesson_id, paywall_product_id
)
SELECT
  '40000000-0000-0000-0000-000000000104',
  c.id,
  '变量、条件与流程',
  'interactive',
  1000,
  110,
  540,
  $$
  {
    "pages": [
      {
        "page_id": "cs-1-page-1",
        "order": 0,
        "title": "变量是什么",
        "blocks": [
          {
            "id": "cs-1-intro",
            "type": "text",
            "position": { "order": 0 },
            "content": {
              "format": "richtext",
              "value": { "ops": [{ "insert": "变量像一个带名字的抽屉，用来保存当前需要反复读取或更新的信息。条件语句则决定程序接下来走哪条路。\\n" }] }
            }
          },
          {
            "id": "cs-1-mc",
            "type": "multiple-choice",
            "position": { "order": 1 },
            "content": {
              "question": "下面哪一项最适合作为变量的用途？",
              "options": [
                { "id": "a", "text": "保存用户当前分数", "isCorrect": true },
                { "id": "b", "text": "替代所有按钮", "isCorrect": false },
                { "id": "c", "text": "让代码自动运行更快", "isCorrect": false }
              ]
            }
          }
        ]
      },
      {
        "page_id": "cs-1-page-2",
        "order": 1,
        "title": "流程判断",
        "blocks": [
          {
            "id": "cs-1-sort",
            "type": "sorting",
            "position": { "order": 0 },
            "content": {
              "prompt": "把一段最基础的判断流程排成顺序",
              "items": ["执行对应动作", "检查条件", "准备输入数据"],
              "correctOrder": ["准备输入数据", "检查条件", "执行对应动作"]
            }
          },
          {
            "id": "cs-1-fill",
            "type": "fill-blank",
            "position": { "order": 1 },
            "content": {
              "template": "当条件为 true 时，程序会进入对应的 ___ 分支。",
              "blanks": [{ "id": "cs-1-fill-blank", "answer": "if" }]
            }
          }
        ]
      }
    ]
  }
  $$::jsonb,
  false,
  'none',
  NULL,
  NULL
FROM courses c
WHERE c.slug = 'programming-thinking-and-web-interaction'
ON CONFLICT (id) DO UPDATE SET
  course_id = EXCLUDED.course_id,
  title = EXCLUDED.title,
  type = EXCLUDED.type,
  sort_key = EXCLUDED.sort_key,
  xp_reward = EXCLUDED.xp_reward,
  duration_seconds = EXCLUDED.duration_seconds,
  content_json = EXCLUDED.content_json,
  is_locked = EXCLUDED.is_locked,
  unlock_type = EXCLUDED.unlock_type,
  prerequisite_lesson_id = EXCLUDED.prerequisite_lesson_id,
  paywall_product_id = EXCLUDED.paywall_product_id,
  updated_at = NOW();

INSERT INTO lessons (
  id, course_id, title, type, sort_key, xp_reward, duration_seconds, content_json, is_locked, unlock_type, prerequisite_lesson_id, paywall_product_id
)
SELECT
  '40000000-0000-0000-0000-000000000105',
  c.id,
  '网页结构与按钮交互',
  'interactive',
  2000,
  140,
  660,
  $$
  {
    "pages": [
      {
        "page_id": "cs-2-page-1",
        "order": 0,
        "title": "结构与交互",
        "blocks": [
          {
            "id": "cs-2-intro",
            "type": "text",
            "position": { "order": 0 },
            "content": {
              "format": "richtext",
              "value": { "ops": [{ "insert": "网页里常见的标题、段落、按钮都属于结构。真正让按钮点了会变的，是背后绑定的交互逻辑。\\n" }] }
            }
          },
          {
            "id": "cs-2-match",
            "type": "matching",
            "position": { "order": 1 },
            "content": {
              "pairs": [
                { "id": "p1", "left": "<h1>", "right": "页面主标题" },
                { "id": "p2", "left": "<button>", "right": "可点击动作" },
                { "id": "p3", "left": "<p>", "right": "说明文本" }
              ]
            }
          }
        ]
      },
      {
        "page_id": "cs-2-page-2",
        "order": 1,
        "title": "按钮点击",
        "blocks": [
          {
            "id": "cs-2-code",
            "type": "code-playground",
            "position": { "order": 0 },
            "content": {
              "language": "js",
              "starterCode": "const buttonLabel = '开始学习';\nfunction handleClick() {\n  return buttonLabel;\n}",
              "initialCode": "const buttonLabel = '开始学习';\nfunction handleClick() {\n  return `${buttonLabel}，进入下一步`;\n}"
            }
          },
          {
            "id": "cs-2-mc",
            "type": "multiple-choice",
            "position": { "order": 1 },
            "content": {
              "question": "按钮交互最关键的部分通常是什么？",
              "options": [
                { "id": "a", "text": "点击后触发的逻辑", "isCorrect": true },
                { "id": "b", "text": "按钮外框一定是圆角", "isCorrect": false },
                { "id": "c", "text": "按钮必须放在页面最上面", "isCorrect": false }
              ]
            }
          }
        ]
      }
    ]
  }
  $$::jsonb,
  false,
  'none',
  NULL,
  NULL
FROM courses c
WHERE c.slug = 'programming-thinking-and-web-interaction'
ON CONFLICT (id) DO UPDATE SET
  course_id = EXCLUDED.course_id,
  title = EXCLUDED.title,
  type = EXCLUDED.type,
  sort_key = EXCLUDED.sort_key,
  xp_reward = EXCLUDED.xp_reward,
  duration_seconds = EXCLUDED.duration_seconds,
  content_json = EXCLUDED.content_json,
  is_locked = EXCLUDED.is_locked,
  unlock_type = EXCLUDED.unlock_type,
  prerequisite_lesson_id = EXCLUDED.prerequisite_lesson_id,
  paywall_product_id = EXCLUDED.paywall_product_id,
  updated_at = NOW();

INSERT INTO lessons (
  id, course_id, title, type, sort_key, xp_reward, duration_seconds, content_json, is_locked, unlock_type, prerequisite_lesson_id, paywall_product_id
)
SELECT
  '40000000-0000-0000-0000-000000000106',
  c.id,
  '调试：从报错到修复',
  'interactive',
  3000,
  150,
  720,
  $$
  {
    "pages": [
      {
        "page_id": "cs-3-page-1",
        "order": 0,
        "title": "定位问题",
        "blocks": [
          {
            "id": "cs-3-intro",
            "type": "text",
            "position": { "order": 0 },
            "content": {
              "format": "richtext",
              "value": { "ops": [{ "insert": "调试不是凭感觉改一遍，而是先观察报错位置，再缩小范围，最后验证修复是否真的解决问题。\\n" }] }
            }
          },
          {
            "id": "cs-3-mc",
            "type": "multiple-choice",
            "position": { "order": 1 },
            "content": {
              "question": "看到报错信息后，第一步更合理的是？",
              "options": [
                { "id": "a", "text": "先看报错位置和变量名", "isCorrect": true },
                { "id": "b", "text": "立刻把整页代码重写", "isCorrect": false },
                { "id": "c", "text": "关闭浏览器重新打开", "isCorrect": false }
              ]
            }
          }
        ]
      },
      {
        "page_id": "cs-3-page-2",
        "order": 1,
        "title": "修复闭环",
        "blocks": [
          {
            "id": "cs-3-fill",
            "type": "fill-blank",
            "position": { "order": 0 },
            "content": {
              "template": "修完 bug 后，最后一步应该是重新 ___ 结果。",
              "blanks": [{ "id": "cs-3-fill-blank", "answer": "验证", "alternatives": ["检查"] }]
            }
          },
          {
            "id": "cs-3-sort",
            "type": "sorting",
            "position": { "order": 1 },
            "content": {
              "prompt": "把调试动作排成合理顺序",
              "items": ["验证修复", "阅读报错信息", "修改有问题的代码"],
              "correctOrder": ["阅读报错信息", "修改有问题的代码", "验证修复"]
            }
          }
        ]
      }
    ]
  }
  $$::jsonb,
  false,
  'none',
  NULL,
  NULL
FROM courses c
WHERE c.slug = 'programming-thinking-and-web-interaction'
ON CONFLICT (id) DO UPDATE SET
  course_id = EXCLUDED.course_id,
  title = EXCLUDED.title,
  type = EXCLUDED.type,
  sort_key = EXCLUDED.sort_key,
  xp_reward = EXCLUDED.xp_reward,
  duration_seconds = EXCLUDED.duration_seconds,
  content_json = EXCLUDED.content_json,
  is_locked = EXCLUDED.is_locked,
  unlock_type = EXCLUDED.unlock_type,
  prerequisite_lesson_id = EXCLUDED.prerequisite_lesson_id,
  paywall_product_id = EXCLUDED.paywall_product_id,
  updated_at = NOW();

INSERT INTO lessons (
  id, course_id, title, type, sort_key, xp_reward, duration_seconds, content_json, is_locked, unlock_type, prerequisite_lesson_id, paywall_product_id
)
SELECT
  '40000000-0000-0000-0000-000000000107',
  c.id,
  '数据、标签与特征',
  'interactive',
  1000,
  120,
  570,
  $$
  {
    "pages": [
      {
        "page_id": "data-1-page-1",
        "order": 0,
        "title": "数据的三个角色",
        "blocks": [
          {
            "id": "data-1-intro",
            "type": "text",
            "position": { "order": 0 },
            "content": {
              "format": "richtext",
              "value": { "ops": [{ "insert": "特征是模型看到的输入，标签是我们希望模型学会预测的答案。数据质量越稳定，模型越容易学到有效规律。\\n" }] }
            }
          },
          {
            "id": "data-1-match",
            "type": "matching",
            "position": { "order": 1 },
            "content": {
              "pairs": [
                { "id": "p1", "left": "特征", "right": "模型用来观察的输入" },
                { "id": "p2", "left": "标签", "right": "训练阶段的目标答案" },
                { "id": "p3", "left": "样本", "right": "一条完整的数据记录" }
              ]
            }
          }
        ]
      },
      {
        "page_id": "data-1-page-2",
        "order": 1,
        "title": "判断输入",
        "blocks": [
          {
            "id": "data-1-mc",
            "type": "multiple-choice",
            "position": { "order": 0 },
            "content": {
              "question": "如果要预测房价，下面哪一项更像特征？",
              "options": [
                { "id": "a", "text": "房屋面积", "isCorrect": true },
                { "id": "b", "text": "模型训练完成的时间", "isCorrect": false },
                { "id": "c", "text": "老师给的分数", "isCorrect": false }
              ]
            }
          },
          {
            "id": "data-1-fill",
            "type": "fill-blank",
            "position": { "order": 1 },
            "content": {
              "template": "训练模型时，标签就是希望模型输出的 ___ 。",
              "blanks": [{ "id": "data-1-fill-blank", "answer": "答案" }]
            }
          }
        ]
      }
    ]
  }
  $$::jsonb,
  false,
  'none',
  NULL,
  NULL
FROM courses c
WHERE c.slug = 'data-and-ai-basics'
ON CONFLICT (id) DO UPDATE SET
  course_id = EXCLUDED.course_id,
  title = EXCLUDED.title,
  type = EXCLUDED.type,
  sort_key = EXCLUDED.sort_key,
  xp_reward = EXCLUDED.xp_reward,
  duration_seconds = EXCLUDED.duration_seconds,
  content_json = EXCLUDED.content_json,
  is_locked = EXCLUDED.is_locked,
  unlock_type = EXCLUDED.unlock_type,
  prerequisite_lesson_id = EXCLUDED.prerequisite_lesson_id,
  paywall_product_id = EXCLUDED.paywall_product_id,
  updated_at = NOW();

INSERT INTO lessons (
  id, course_id, title, type, sort_key, xp_reward, duration_seconds, content_json, is_locked, unlock_type, prerequisite_lesson_id, paywall_product_id
)
SELECT
  '40000000-0000-0000-0000-000000000108',
  c.id,
  '模型如何做预测',
  'interactive',
  2000,
  135,
  630,
  $$
  {
    "pages": [
      {
        "page_id": "data-2-page-1",
        "order": 0,
        "title": "预测流程",
        "blocks": [
          {
            "id": "data-2-intro",
            "type": "text",
            "position": { "order": 0 },
            "content": {
              "format": "richtext",
              "value": { "ops": [{ "insert": "预测不是猜一下，而是把新输入送进已经学到规律的模型，再输出一个最可能的结果。\\n" }] }
            }
          },
          {
            "id": "data-2-sort",
            "type": "sorting",
            "position": { "order": 1 },
            "content": {
              "prompt": "把一次预测流程排成顺序",
              "items": ["模型输出结果", "输入新的样本", "模型读取训练好的规律"],
              "correctOrder": ["输入新的样本", "模型读取训练好的规律", "模型输出结果"]
            }
          }
        ]
      },
      {
        "page_id": "data-2-page-2",
        "order": 1,
        "title": "结果判断",
        "blocks": [
          {
            "id": "data-2-mc",
            "type": "multiple-choice",
            "position": { "order": 0 },
            "content": {
              "question": "为什么测试集很重要？",
              "options": [
                { "id": "a", "text": "它可以帮助判断模型泛化表现", "isCorrect": true },
                { "id": "b", "text": "它让模型自动有更多参数", "isCorrect": false },
                { "id": "c", "text": "它可以替代所有训练数据", "isCorrect": false }
              ]
            }
          }
        ]
      }
    ]
  }
  $$::jsonb,
  false,
  'none',
  NULL,
  NULL
FROM courses c
WHERE c.slug = 'data-and-ai-basics'
ON CONFLICT (id) DO UPDATE SET
  course_id = EXCLUDED.course_id,
  title = EXCLUDED.title,
  type = EXCLUDED.type,
  sort_key = EXCLUDED.sort_key,
  xp_reward = EXCLUDED.xp_reward,
  duration_seconds = EXCLUDED.duration_seconds,
  content_json = EXCLUDED.content_json,
  is_locked = EXCLUDED.is_locked,
  unlock_type = EXCLUDED.unlock_type,
  prerequisite_lesson_id = EXCLUDED.prerequisite_lesson_id,
  paywall_product_id = EXCLUDED.paywall_product_id,
  updated_at = NOW();

INSERT INTO lessons (
  id, course_id, title, type, sort_key, xp_reward, duration_seconds, content_json, is_locked, unlock_type, prerequisite_lesson_id, paywall_product_id
)
SELECT
  '40000000-0000-0000-0000-000000000109',
  c.id,
  'Prompt 设计与结果检查',
  'interactive',
  3000,
  150,
  690,
  $$
  {
    "pages": [
      {
        "page_id": "data-3-page-1",
        "order": 0,
        "title": "把任务说清楚",
        "blocks": [
          {
            "id": "data-3-intro",
            "type": "text",
            "position": { "order": 0 },
            "content": {
              "format": "richtext",
              "value": { "ops": [{ "insert": "Prompt 的核心不是写得复杂，而是把目标、格式和限制条件讲清楚，让模型更容易给出可检查的结果。\\n" }] }
            }
          },
          {
            "id": "data-3-fill",
            "type": "fill-blank",
            "position": { "order": 1 },
            "content": {
              "template": "一个更稳的 prompt，通常会明确输出 ___ 和限制条件。",
              "blanks": [{ "id": "data-3-fill-blank", "answer": "格式", "alternatives": ["结构"] }]
            }
          }
        ]
      },
      {
        "page_id": "data-3-page-2",
        "order": 1,
        "title": "检查结果",
        "blocks": [
          {
            "id": "data-3-mc",
            "type": "multiple-choice",
            "position": { "order": 0 },
            "content": {
              "question": "拿到模型结果后，哪一步更关键？",
              "options": [
                { "id": "a", "text": "检查是否满足任务要求和事实约束", "isCorrect": true },
                { "id": "b", "text": "默认模型一定完全正确", "isCorrect": false },
                { "id": "c", "text": "只看字数够不够长", "isCorrect": false }
              ]
            }
          },
          {
            "id": "data-3-match",
            "type": "matching",
            "position": { "order": 1 },
            "content": {
              "pairs": [
                { "id": "p1", "left": "目标", "right": "这次要模型完成什么" },
                { "id": "p2", "left": "格式", "right": "输出长什么样" },
                { "id": "p3", "left": "检查", "right": "结果有没有偏题或失真" }
              ]
            }
          }
        ]
      }
    ]
  }
  $$::jsonb,
  false,
  'none',
  NULL,
  NULL
FROM courses c
WHERE c.slug = 'data-and-ai-basics'
ON CONFLICT (id) DO UPDATE SET
  course_id = EXCLUDED.course_id,
  title = EXCLUDED.title,
  type = EXCLUDED.type,
  sort_key = EXCLUDED.sort_key,
  xp_reward = EXCLUDED.xp_reward,
  duration_seconds = EXCLUDED.duration_seconds,
  content_json = EXCLUDED.content_json,
  is_locked = EXCLUDED.is_locked,
  unlock_type = EXCLUDED.unlock_type,
  prerequisite_lesson_id = EXCLUDED.prerequisite_lesson_id,
  paywall_product_id = EXCLUDED.paywall_product_id,
  updated_at = NOW();
