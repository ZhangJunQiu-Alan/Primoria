-- ============================================================
-- Seed data for local development & testing
-- Fixed UUIDs for deterministic, idempotent seeding.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Seed author in auth.users (course content owner)
-- ----------------------------------------------------------------
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'seed@primoria.app',
    '',
    NOW(),
    '{"name": "Primoria"}',
    '{"provider": "email", "providers": ["email"]}',
    NOW(),
    NOW(),
    '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- 2. Seed author profile
-- ----------------------------------------------------------------
INSERT INTO profiles (id, username, bio, role, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'primoria',
    'Official Primoria course content.',
    'author',
    NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- 3. Subjects
-- ----------------------------------------------------------------
INSERT INTO subjects (id, name, color_hex) VALUES
    ('10000000-0000-0000-0000-000000000001', 'Computer Science', '#3B82F6'),
    ('10000000-0000-0000-0000-000000000002', 'Mathematics',      '#F97316'),
    ('10000000-0000-0000-0000-000000000003', 'Science',          '#10B981'),
    ('10000000-0000-0000-0000-000000000004', 'Business',         '#F43F5E'),
    ('10000000-0000-0000-0000-000000000005', 'Social',           '#8B5CF6')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- 4. Courses (all published)
-- ----------------------------------------------------------------
INSERT INTO courses (
    id, author_id, subject_id, title, slug,
    description, difficulty_level, status,
    estimated_minutes, tags, price_tier, published_at
) VALUES
-- CS
(
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Python Basics',
    'python-basics',
    'Learn Python from scratch. Covers variables, data types, control flow, and functions through interactive exercises.',
    'beginner', 'published', 120,
    ARRAY['python', 'programming', 'beginner'],
    'free', NOW()
),
(
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Web Dev Fundamentals',
    'web-dev-fundamentals',
    'Build modern web pages with HTML, CSS, and JavaScript. No prior experience needed.',
    'beginner', 'published', 90,
    ARRAY['html', 'css', 'javascript', 'web'],
    'free', NOW()
),
(
    '20000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Machine Learning 101',
    'machine-learning-101',
    'Discover how machines learn from data. Covers supervised learning, neural networks, and model evaluation.',
    'intermediate', 'published', 180,
    ARRAY['machine-learning', 'ai', 'python', 'data-science'],
    'free', NOW()
),
-- Math
(
    '20000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    'Calculus I',
    'calculus-i',
    'Master limits, derivatives, and integrals through intuitive visualisations and interactive problems.',
    'beginner', 'published', 150,
    ARRAY['calculus', 'math', 'derivatives', 'integrals'],
    'free', NOW()
),
(
    '20000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    'Linear Algebra',
    'linear-algebra',
    'Vectors, matrices, and transformations — the mathematics powering modern AI and graphics.',
    'intermediate', 'published', 135,
    ARRAY['linear-algebra', 'vectors', 'matrices', 'math'],
    'free', NOW()
),
-- Science
(
    '20000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    'Physics I: Mechanics',
    'physics-i-mechanics',
    'Explore Newton''s laws, kinematics, and energy through hands-on simulations.',
    'beginner', 'published', 120,
    ARRAY['physics', 'mechanics', 'newton', 'science'],
    'free', NOW()
),
-- Business
(
    '20000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000004',
    'Digital Marketing',
    'digital-marketing',
    'Grow your online presence. Covers SEO, social media strategy, content marketing, and analytics.',
    'beginner', 'published', 90,
    ARRAY['marketing', 'seo', 'social-media', 'business'],
    'free', NOW()
),
-- Social
(
    '20000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000005',
    'Intro to Psychology',
    'intro-to-psychology',
    'Understand how the mind works. Covers perception, memory, emotion, and social behaviour.',
    'beginner', 'published', 90,
    ARRAY['psychology', 'mind', 'behaviour', 'social'],
    'free', NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- 5. Chapters — Python Basics (full)
-- ----------------------------------------------------------------
INSERT INTO chapters (id, course_id, title, description, sort_key, is_locked) VALUES
(
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'Getting Started',
    'Set up Python and write your first programs.',
    1000, false
),
(
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    'Control Flow',
    'Make decisions and repeat actions with if-statements and loops.',
    2000, true
)
ON CONFLICT (id) DO NOTHING;

-- Chapters — Web Dev Fundamentals
INSERT INTO chapters (id, course_id, title, description, sort_key, is_locked) VALUES
(
    '30000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000002',
    'HTML Foundations',
    'Structure content with semantic HTML.',
    1000, false
),
(
    '30000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000002',
    'Styling with CSS',
    'Make pages beautiful with CSS.',
    2000, true
)
ON CONFLICT (id) DO NOTHING;

-- Chapters — one each for remaining courses
INSERT INTO chapters (id, course_id, title, sort_key, is_locked) VALUES
('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000003', 'Foundations of ML',  1000, false),
('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000004', 'Limits & Continuity', 1000, false),
('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000005', 'Vectors',             1000, false),
('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000006', 'Motion & Forces',     1000, false),
('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000007', 'SEO & Search',        1000, false),
('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000008', 'The Mind',            1000, false)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- 6. Lessons — Python Basics Chapter 1 (3 interactive lessons)
-- ----------------------------------------------------------------

-- Lesson 1: What is Python?
INSERT INTO lessons (id, chapter_id, title, type, sort_key, xp_reward, duration_seconds, content_json)
VALUES (
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'What is Python?',
    'interactive', 1000, 10, 180,
    '[
      {
        "block_id": "b1000000-0000-0000-0001-000000000001",
        "type": "info_card",
        "content": {
          "title": "Welcome to Python!",
          "body": "Python is one of the world''s most popular programming languages.\n\nIt is used in web development, data science, artificial intelligence, automation, and much more.\n\nPython code is designed to be readable and beginner-friendly."
        },
        "config": {},
        "is_interactive": false,
        "sort_key": 1000
      },
      {
        "block_id": "b1000000-0000-0000-0001-000000000002",
        "type": "multiple_choice",
        "content": {
          "title": "Python is used for...",
          "body": "Which of the following is NOT a common use of Python?"
        },
        "config": {
          "options": ["Web development", "Data science", "Writing operating system kernels", "AI and machine learning"],
          "correct_index": 2,
          "success_msg": "Correct! While Python can interact with the OS, writing OS kernels is typically done in C/C++.",
          "fail_msg": "Not quite — Python is actually used for that! Think about what Python is NOT typically used for."
        },
        "is_interactive": true,
        "sort_key": 2000
      },
      {
        "block_id": "b1000000-0000-0000-0001-000000000003",
        "type": "multiple_choice",
        "content": {
          "title": "Hello, Python!",
          "body": "Which of the following correctly prints \"Hello, World!\" in Python?"
        },
        "config": {
          "options": ["echo ''Hello, World!''", "print(\"Hello, World!\")", "console.log(''Hello, World!'')", "System.out.println(''Hello, World!'');"],
          "correct_index": 1,
          "success_msg": "Correct! print() is Python''s built-in output function.",
          "fail_msg": "That syntax belongs to another language. In Python it''s simply: print()"
        },
        "is_interactive": true,
        "sort_key": 3000
      }
    ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Lesson 2: Variables & Data Types
INSERT INTO lessons (id, chapter_id, title, type, sort_key, xp_reward, duration_seconds, content_json)
VALUES (
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    'Variables & Data Types',
    'interactive', 2000, 10, 240,
    '[
      {
        "block_id": "b2000000-0000-0000-0001-000000000001",
        "type": "info_card",
        "content": {
          "title": "Variables in Python",
          "body": "A variable stores a value. In Python you just write:\n\n  x = 10\n  name = \"Alice\"\n  is_cool = True\n\nNo need to declare a type — Python figures it out automatically."
        },
        "config": {},
        "is_interactive": false,
        "sort_key": 1000
      },
      {
        "block_id": "b2000000-0000-0000-0001-000000000002",
        "type": "multiple_choice",
        "content": {
          "title": "Variable Assignment",
          "body": "Which line correctly creates a variable called score with the value 100?"
        },
        "config": {
          "options": ["int score = 100;", "var score = 100", "score = 100", "let score: Int = 100"],
          "correct_index": 2,
          "success_msg": "Yes! Python assignment is simply: name = value. No type keyword needed.",
          "fail_msg": "That syntax is from Java, JavaScript, or Swift. Python is simpler: score = 100"
        },
        "is_interactive": true,
        "sort_key": 2000
      },
      {
        "block_id": "b2000000-0000-0000-0001-000000000003",
        "type": "slider",
        "content": {
          "title": "How Many Types?",
          "body": "Python has 4 basic built-in data types: int, float, str, and bool.\n\nSet the slider to the correct number of basic types."
        },
        "config": {
          "min": 0,
          "max": 10,
          "step": 1,
          "default": 5,
          "unit": "types",
          "target": 4,
          "tolerance": 0,
          "success_msg": "Correct! int, float, str, and bool — 4 basic types.",
          "fail_msg_high": "Too many. Count just the basics: int, float, str, bool.",
          "fail_msg_low": "Not enough. There are at least 4: int, float, str, and bool."
        },
        "is_interactive": true,
        "sort_key": 3000
      },
      {
        "block_id": "b2000000-0000-0000-0001-000000000004",
        "type": "multiple_choice",
        "content": {
          "title": "What type is 3.14?",
          "body": "After running: x = 3.14\n\nWhat is the data type of x?"
        },
        "config": {
          "options": ["int", "float", "string", "double"],
          "correct_index": 1,
          "success_msg": "Correct! 3.14 has a decimal point, making it a float.",
          "fail_msg": "Close, but not quite. Remember: numbers with a decimal point are float in Python."
        },
        "is_interactive": true,
        "sort_key": 4000
      }
    ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Lesson 3: Basic Operations
INSERT INTO lessons (id, chapter_id, title, type, sort_key, xp_reward, duration_seconds, content_json)
VALUES (
    '40000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000001',
    'Basic Operations',
    'interactive', 3000, 15, 200,
    '[
      {
        "block_id": "b3000000-0000-0000-0001-000000000001",
        "type": "info_card",
        "content": {
          "title": "Arithmetic in Python",
          "body": "Python supports all standard arithmetic operators:\n\n  +  addition\n  -  subtraction\n  *  multiplication\n  /  division (returns float)\n  // integer division\n  %  remainder (modulo)\n  ** exponentiation"
        },
        "config": {},
        "is_interactive": false,
        "sort_key": 1000
      },
      {
        "block_id": "b3000000-0000-0000-0001-000000000002",
        "type": "slider",
        "content": {
          "title": "Exponentiation",
          "body": "In Python, 2 ** 3 means 2 raised to the power of 3.\n\nWhat is the result of 2 ** 3?"
        },
        "config": {
          "min": 0,
          "max": 20,
          "step": 1,
          "default": 10,
          "unit": "",
          "target": 8,
          "tolerance": 0,
          "success_msg": "Correct! 2 ** 3 = 2 × 2 × 2 = 8",
          "fail_msg_high": "Too high. 2 ** 3 means 2 × 2 × 2.",
          "fail_msg_low": "Too low. 2 ** 3 means 2 × 2 × 2."
        },
        "is_interactive": true,
        "sort_key": 2000
      },
      {
        "block_id": "b3000000-0000-0000-0001-000000000003",
        "type": "multiple_choice",
        "content": {
          "title": "Integer Division",
          "body": "What is the result of: 7 // 2 in Python?"
        },
        "config": {
          "options": ["3.5", "3", "4", "1"],
          "correct_index": 1,
          "success_msg": "Correct! // is integer division — it discards the decimal part, giving 3.",
          "fail_msg": "Remember: // is integer division. It throws away the remainder."
        },
        "is_interactive": true,
        "sort_key": 3000
      }
    ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- 7. Lessons — Python Basics Chapter 2 (2 interactive lessons)
-- ----------------------------------------------------------------

-- Lesson 4: If Statements
INSERT INTO lessons (id, chapter_id, title, type, sort_key, xp_reward, duration_seconds, content_json)
VALUES (
    '40000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000002',
    'If Statements',
    'interactive', 1000, 15, 240,
    '[
      {
        "block_id": "b4000000-0000-0000-0001-000000000001",
        "type": "info_card",
        "content": {
          "title": "Making Decisions",
          "body": "Python uses if, elif, and else to make decisions:\n\n  if age >= 18:\n      print(\"Adult\")\n  elif age >= 13:\n      print(\"Teen\")\n  else:\n      print(\"Child\")\n\nIndentation (4 spaces) defines the code block."
        },
        "config": {},
        "is_interactive": false,
        "sort_key": 1000
      },
      {
        "block_id": "b4000000-0000-0000-0001-000000000002",
        "type": "multiple_choice",
        "content": {
          "title": "Age Check",
          "body": "Given: age = 15\n\nWhat does this code print?\n\n  if age >= 18:\n      print(\"Adult\")\n  elif age >= 13:\n      print(\"Teen\")\n  else:\n      print(\"Child\")"
        },
        "config": {
          "options": ["Adult", "Teen", "Child", "Nothing"],
          "correct_index": 1,
          "success_msg": "Correct! 15 is not >= 18, but it is >= 13, so \"Teen\" is printed.",
          "fail_msg": "Trace through: 15 >= 18 is False, 15 >= 13 is True → \"Teen\"."
        },
        "is_interactive": true,
        "sort_key": 2000
      },
      {
        "block_id": "b4000000-0000-0000-0001-000000000003",
        "type": "multiple_choice",
        "content": {
          "title": "Boolean Operators",
          "body": "Which keyword combines two conditions so BOTH must be true?"
        },
        "config": {
          "options": ["or", "and", "not", "both"],
          "correct_index": 1,
          "success_msg": "Correct! ''and'' requires both conditions to be True.",
          "fail_msg": "''or'' needs only ONE to be true. ''not'' inverts. ''both'' is not a Python keyword."
        },
        "is_interactive": true,
        "sort_key": 3000
      }
    ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Lesson 5: Loops
INSERT INTO lessons (id, chapter_id, title, type, sort_key, xp_reward, duration_seconds, content_json)
VALUES (
    '40000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-000000000002',
    'Loops',
    'interactive', 2000, 15, 260,
    '[
      {
        "block_id": "b5000000-0000-0000-0001-000000000001",
        "type": "info_card",
        "content": {
          "title": "Repeating with Loops",
          "body": "Python has two loop types:\n\n  for i in range(5):  # repeats 5 times\n      print(i)         # prints 0 1 2 3 4\n\n  while x > 0:        # repeats while condition is true\n      x -= 1"
        },
        "config": {},
        "is_interactive": false,
        "sort_key": 1000
      },
      {
        "block_id": "b5000000-0000-0000-0001-000000000002",
        "type": "slider",
        "content": {
          "title": "Range Count",
          "body": "How many times does this loop run?\n\n  for i in range(7):\n      print(i)"
        },
        "config": {
          "min": 0,
          "max": 15,
          "step": 1,
          "default": 5,
          "unit": "times",
          "target": 7,
          "tolerance": 0,
          "success_msg": "Correct! range(7) generates 0,1,2,3,4,5,6 — that is 7 iterations.",
          "fail_msg_high": "Too many. range(n) generates numbers from 0 up to n-1.",
          "fail_msg_low": "Not enough. range(7) generates 7 numbers: 0,1,2,3,4,5,6."
        },
        "is_interactive": true,
        "sort_key": 2000
      },
      {
        "block_id": "b5000000-0000-0000-0001-000000000003",
        "type": "multiple_choice",
        "content": {
          "title": "Loop Output",
          "body": "What is the LAST number printed by:\n\n  for i in range(1, 6):\n      print(i)"
        },
        "config": {
          "options": ["4", "5", "6", "7"],
          "correct_index": 1,
          "success_msg": "Correct! range(1, 6) produces 1, 2, 3, 4, 5 — last is 5.",
          "fail_msg": "range(start, stop) goes up to stop-1. range(1, 6) stops at 5."
        },
        "is_interactive": true,
        "sort_key": 3000
      }
    ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- 8. Lessons — Other courses (2 simple lessons each)
-- ----------------------------------------------------------------

-- Web Dev: HTML Foundations
INSERT INTO lessons (id, chapter_id, title, type, sort_key, xp_reward, duration_seconds, content_json) VALUES
(
    '40000000-0000-0000-0000-000000000006',
    '30000000-0000-0000-0000-000000000003',
    'What is HTML?',
    'interactive', 1000, 10, 180,
    '[
      {"block_id":"b6000000-0001-0000-0000-000000000001","type":"info_card","content":{"title":"HTML is the Web''s Skeleton","body":"HTML (HyperText Markup Language) defines the structure of every web page.\n\nYou write tags like <h1>, <p>, <img> to tell the browser what to display."},"config":{},"is_interactive":false,"sort_key":1000},
      {"block_id":"b6000000-0001-0000-0000-000000000002","type":"multiple_choice","content":{"title":"HTML Tag","body":"Which tag creates a top-level heading?"},"config":{"options":["<heading>","<h1>","<title>","<header>"],"correct_index":1,"success_msg":"Correct! <h1> is the largest heading tag.","fail_msg":"The heading tags are h1 through h6. h1 is the biggest."},"is_interactive":true,"sort_key":2000},
      {"block_id":"b6000000-0001-0000-0000-000000000003","type":"multiple_choice","content":{"title":"Paragraph Tag","body":"Which tag wraps a paragraph of text?"},"config":{"options":["<text>","<para>","<p>","<body>"],"correct_index":2,"success_msg":"Correct! <p> defines a paragraph.","fail_msg":"The standard paragraph tag is simply <p>."},"is_interactive":true,"sort_key":3000}
    ]'::jsonb
),
(
    '40000000-0000-0000-0000-000000000007',
    '30000000-0000-0000-0000-000000000003',
    'Links & Images',
    'interactive', 2000, 10, 180,
    '[
      {"block_id":"b7000000-0001-0000-0000-000000000001","type":"info_card","content":{"title":"Links & Images","body":"Links use the <a> tag with href attribute:\n  <a href=\"url\">Click me</a>\n\nImages use <img> with src:\n  <img src=\"photo.jpg\" alt=\"description\">"},"config":{},"is_interactive":false,"sort_key":1000},
      {"block_id":"b7000000-0001-0000-0000-000000000002","type":"multiple_choice","content":{"title":"Hyperlink Attribute","body":"Which attribute specifies the destination URL of a link?"},"config":{"options":["src","url","href","link"],"correct_index":2,"success_msg":"Correct! href stands for Hypertext REFerence.","fail_msg":"The correct attribute is href (Hypertext REFerence)."},"is_interactive":true,"sort_key":2000}
    ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ML 101: Foundations
INSERT INTO lessons (id, chapter_id, title, type, sort_key, xp_reward, duration_seconds, content_json) VALUES
(
    '40000000-0000-0000-0000-000000000008',
    '30000000-0000-0000-0000-000000000005',
    'What is Machine Learning?',
    'interactive', 1000, 10, 180,
    '[
      {"block_id":"b8000000-0001-0000-0000-000000000001","type":"info_card","content":{"title":"Machines That Learn","body":"Machine Learning is a branch of AI where algorithms learn patterns from data without being explicitly programmed for every rule.\n\nInstead of writing rules, you show the machine examples and let it figure out the rules."},"config":{},"is_interactive":false,"sort_key":1000},
      {"block_id":"b8000000-0001-0000-0000-000000000002","type":"multiple_choice","content":{"title":"Supervised Learning","body":"In supervised learning, the training data includes..."},"config":{"options":["Only inputs","Only outputs","Both inputs and labelled outputs","Random noise"],"correct_index":2,"success_msg":"Correct! Supervised learning uses labelled examples: input + correct output.","fail_msg":"Supervised learning needs both the input and the correct answer (label)."},"is_interactive":true,"sort_key":2000}
    ]'::jsonb
),
(
    '40000000-0000-0000-0000-000000000009',
    '30000000-0000-0000-0000-000000000005',
    'Types of ML',
    'interactive', 2000, 10, 180,
    '[
      {"block_id":"b9000000-0001-0000-0000-000000000001","type":"info_card","content":{"title":"Three Types of ML","body":"1. Supervised Learning — learns from labelled data\n2. Unsupervised Learning — finds hidden patterns in unlabelled data\n3. Reinforcement Learning — learns by trial-and-error with rewards"},"config":{},"is_interactive":false,"sort_key":1000},
      {"block_id":"b9000000-0001-0000-0000-000000000002","type":"multiple_choice","content":{"title":"Which Type?","body":"A robot learns to play chess by winning and losing games. Which type of ML is this?"},"config":{"options":["Supervised","Unsupervised","Reinforcement","Semi-supervised"],"correct_index":2,"success_msg":"Correct! Reinforcement learning uses rewards (wins) and penalties (losses).","fail_msg":"Trial-and-error with rewards is the hallmark of Reinforcement Learning."},"is_interactive":true,"sort_key":2000}
    ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Calculus I
INSERT INTO lessons (id, chapter_id, title, type, sort_key, xp_reward, duration_seconds, content_json) VALUES
(
    '40000000-0000-0000-0000-000000000010',
    '30000000-0000-0000-0000-000000000006',
    'Understanding Limits',
    'interactive', 1000, 10, 200,
    '[
      {"block_id":"ba000000-0001-0000-0000-000000000001","type":"info_card","content":{"title":"What is a Limit?","body":"A limit describes the value a function approaches as the input approaches some value.\n\nlim(x→2) of x² = 4\n\nWe ask: what does the function get closer to, even if it never actually reaches that point?"},"config":{},"is_interactive":false,"sort_key":1000},
      {"block_id":"ba000000-0001-0000-0000-000000000002","type":"slider","content":{"title":"Approaching Zero","body":"As x gets closer to 0, what value does 2x approach?\n\nSet the slider to the limit."},"config":{"min":-5,"max":5,"step":1,"default":2,"unit":"","target":0,"tolerance":0,"success_msg":"Correct! As x→0, 2x→0.","fail_msg_high":"Too high. Think: if x is very close to zero, what is 2×x?","fail_msg_low":"Too low. If x approaches 0, so does 2×x."},"is_interactive":true,"sort_key":2000},
      {"block_id":"ba000000-0001-0000-0000-000000000003","type":"multiple_choice","content":{"title":"Limit Definition","body":"A limit exists at a point if..."},"config":{"options":["The function is defined at that point","The left and right limits are equal","The function is continuous everywhere","The derivative exists"],"correct_index":1,"success_msg":"Correct! A limit exists when the left-hand and right-hand limits agree.","fail_msg":"The function doesn''t even need to be defined at that point! What matters is the left and right limits."},"is_interactive":true,"sort_key":3000}
    ]'::jsonb
),
(
    '40000000-0000-0000-0000-000000000011',
    '30000000-0000-0000-0000-000000000006',
    'Intro to Derivatives',
    'interactive', 2000, 15, 220,
    '[
      {"block_id":"bb000000-0001-0000-0000-000000000001","type":"info_card","content":{"title":"The Derivative","body":"The derivative measures the instantaneous rate of change — how fast a function is changing at any given point.\n\nGraphically, it is the slope of the tangent line to the curve.\n\nd/dx(x²) = 2x"},"config":{},"is_interactive":false,"sort_key":1000},
      {"block_id":"bb000000-0001-0000-0000-000000000002","type":"multiple_choice","content":{"title":"Power Rule","body":"Using the power rule: d/dx(x³) = ?"},"config":{"options":["x²","2x²","3x²","3x³"],"correct_index":2,"success_msg":"Correct! Power rule: d/dx(xⁿ) = n·xⁿ⁻¹. So d/dx(x³) = 3x².","fail_msg":"Apply the power rule: multiply by the exponent, then decrease the exponent by 1."},"is_interactive":true,"sort_key":2000}
    ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Physics I
INSERT INTO lessons (id, chapter_id, title, type, sort_key, xp_reward, duration_seconds, content_json) VALUES
(
    '40000000-0000-0000-0000-000000000012',
    '30000000-0000-0000-0000-000000000008',
    'Newton''s First Law',
    'interactive', 1000, 10, 180,
    '[
      {"block_id":"bc000000-0001-0000-0000-000000000001","type":"info_card","content":{"title":"The Law of Inertia","body":"Newton''s First Law: An object at rest stays at rest, and an object in motion stays in motion at constant velocity, unless acted upon by an external force.\n\nThis property is called inertia."},"config":{},"is_interactive":false,"sort_key":1000},
      {"block_id":"bc000000-0001-0000-0000-000000000002","type":"multiple_choice","content":{"title":"Inertia","body":"A hockey puck slides on frictionless ice and no forces act on it. What happens?"},"config":{"options":["It slows down and stops","It speeds up","It continues at the same speed in the same direction","It changes direction randomly"],"correct_index":2,"success_msg":"Correct! With no net force, the puck keeps its velocity forever (Newton''s 1st Law).","fail_msg":"With zero net force, there is no reason for the velocity to change."},"is_interactive":true,"sort_key":2000}
    ]'::jsonb
),
(
    '40000000-0000-0000-0000-000000000013',
    '30000000-0000-0000-0000-000000000008',
    'Newton''s Second Law',
    'interactive', 2000, 15, 200,
    '[
      {"block_id":"bd000000-0001-0000-0000-000000000001","type":"info_card","content":{"title":"F = ma","body":"Newton''s Second Law: Force = mass × acceleration\n\n  F = m × a\n\nThe more force you apply, the greater the acceleration. The more massive the object, the less it accelerates for the same force."},"config":{},"is_interactive":false,"sort_key":1000},
      {"block_id":"bd000000-0001-0000-0000-000000000002","type":"slider","content":{"title":"Calculate Acceleration","body":"A 10 kg box is pushed with 50 N of force (F = ma).\n\nWhat is the acceleration in m/s²?"},"config":{"min":0,"max":20,"step":1,"default":10,"unit":"m/s²","target":5,"tolerance":0,"success_msg":"Correct! a = F/m = 50/10 = 5 m/s²","fail_msg_high":"Too high. Use a = F/m = 50 ÷ 10.","fail_msg_low":"Too low. a = F/m = 50 ÷ 10."},"is_interactive":true,"sort_key":2000}
    ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Digital Marketing
INSERT INTO lessons (id, chapter_id, title, type, sort_key, xp_reward, duration_seconds, content_json) VALUES
(
    '40000000-0000-0000-0000-000000000014',
    '30000000-0000-0000-0000-000000000009',
    'What is SEO?',
    'interactive', 1000, 10, 180,
    '[
      {"block_id":"be000000-0001-0000-0000-000000000001","type":"info_card","content":{"title":"Search Engine Optimisation","body":"SEO is the practice of improving your website so it ranks higher in search engine results.\n\nHigher ranking = more visitors = more customers.\n\nKey factors: relevant content, fast loading, mobile-friendly, quality backlinks."},"config":{},"is_interactive":false,"sort_key":1000},
      {"block_id":"be000000-0001-0000-0000-000000000002","type":"multiple_choice","content":{"title":"Organic vs Paid","body":"Which type of search result does SEO affect?"},"config":{"options":["Paid ads only","Organic (unpaid) results","Social media posts","Email campaigns"],"correct_index":1,"success_msg":"Correct! SEO targets organic (unpaid) search results, not ads.","fail_msg":"SEO is specifically about improving organic (non-paid) search rankings."},"is_interactive":true,"sort_key":2000}
    ]'::jsonb
),
(
    '40000000-0000-0000-0000-000000000015',
    '30000000-0000-0000-0000-000000000009',
    'Content Marketing',
    'interactive', 2000, 10, 180,
    '[
      {"block_id":"bf000000-0001-0000-0000-000000000001","type":"info_card","content":{"title":"Content is King","body":"Content marketing means creating valuable, relevant content to attract and retain your target audience.\n\nExamples: blog posts, videos, podcasts, infographics, social media.\n\nGood content builds trust and drives long-term traffic."},"config":{},"is_interactive":false,"sort_key":1000},
      {"block_id":"bf000000-0001-0000-0000-000000000002","type":"multiple_choice","content":{"title":"Content Goal","body":"What is the PRIMARY goal of content marketing?"},"config":{"options":["Immediate sales","Building long-term audience trust and traffic","Running paid advertisements","Collecting email addresses"],"correct_index":1,"success_msg":"Correct! Content marketing is about building trust and audience over time.","fail_msg":"While sales can follow, the primary goal of content marketing is building trust and audience."},"is_interactive":true,"sort_key":2000}
    ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Psychology
INSERT INTO lessons (id, chapter_id, title, type, sort_key, xp_reward, duration_seconds, content_json) VALUES
(
    '40000000-0000-0000-0000-000000000016',
    '30000000-0000-0000-0000-000000000010',
    'What is Psychology?',
    'interactive', 1000, 10, 180,
    '[
      {"block_id":"c0000000-0001-0000-0000-000000000001","type":"info_card","content":{"title":"The Science of Mind","body":"Psychology is the scientific study of behaviour and mental processes.\n\nIt covers perception, cognition, emotion, personality, behaviour, and interpersonal relationships.\n\nPsychologists use experiments, observations, and surveys to understand the mind."},"config":{},"is_interactive":false,"sort_key":1000},
      {"block_id":"c0000000-0001-0000-0000-000000000002","type":"multiple_choice","content":{"title":"Scientific Method","body":"Which of the following best describes psychology?"},"config":{"options":["The art of guessing how people feel","A scientific study of behaviour and mental processes","A branch of philosophy with no experiments","A medical treatment for mental illness"],"correct_index":1,"success_msg":"Correct! Psychology is a scientific discipline that studies behaviour and mental processes.","fail_msg":"Psychology is a science — it uses empirical methods to study the mind and behaviour."},"is_interactive":true,"sort_key":2000}
    ]'::jsonb
),
(
    '40000000-0000-0000-0000-000000000017',
    '30000000-0000-0000-0000-000000000010',
    'Memory & Learning',
    'interactive', 2000, 10, 200,
    '[
      {"block_id":"c1000000-0001-0000-0000-000000000001","type":"info_card","content":{"title":"How We Remember","body":"Memory has three key stages:\n\n1. Encoding — converting information into a memory\n2. Storage — keeping it over time\n3. Retrieval — recalling it when needed\n\nSleeping after learning dramatically improves retention!"},"config":{},"is_interactive":false,"sort_key":1000},
      {"block_id":"c1000000-0001-0000-0000-000000000002","type":"multiple_choice","content":{"title":"Memory Stages","body":"In what order do the three stages of memory occur?"},"config":{"options":["Storage → Encoding → Retrieval","Encoding → Storage → Retrieval","Retrieval → Encoding → Storage","Encoding → Retrieval → Storage"],"correct_index":1,"success_msg":"Correct! You first encode, then store, then retrieve.","fail_msg":"Think of it like saving a file: you first write it (encode), save it (store), then open it later (retrieve)."},"is_interactive":true,"sort_key":2000}
    ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Linear Algebra (brief)
INSERT INTO lessons (id, chapter_id, title, type, sort_key, xp_reward, duration_seconds, content_json) VALUES
(
    '40000000-0000-0000-0000-000000000018',
    '30000000-0000-0000-0000-000000000007',
    'Vectors',
    'interactive', 1000, 10, 180,
    '[
      {"block_id":"c2000000-0001-0000-0000-000000000001","type":"info_card","content":{"title":"What is a Vector?","body":"A vector has both magnitude (size) and direction.\n\nIn 2D: v = (3, 4)\n\nThe magnitude is calculated using the Pythagorean theorem:\n|v| = √(3² + 4²) = √25 = 5"},"config":{},"is_interactive":false,"sort_key":1000},
      {"block_id":"c2000000-0001-0000-0000-000000000002","type":"slider","content":{"title":"Vector Magnitude","body":"For vector v = (3, 4), what is its magnitude? (Use √(3²+4²))"},"config":{"min":0,"max":10,"step":1,"default":5,"unit":"","target":5,"tolerance":0,"success_msg":"Correct! |v| = √(9+16) = √25 = 5","fail_msg_high":"Too large. Use the Pythagorean theorem: √(3²+4²).","fail_msg_low":"Too small. √(3²+4²) = √(9+16) = √25 = ?"},"is_interactive":true,"sort_key":2000}
    ]'::jsonb
),
(
    '40000000-0000-0000-0000-000000000019',
    '30000000-0000-0000-0000-000000000007',
    'The Dot Product',
    'interactive', 2000, 10, 180,
    '[
      {"block_id":"c3000000-0001-0000-0000-000000000001","type":"info_card","content":{"title":"Dot Product","body":"The dot product of two vectors returns a scalar:\n\n  a·b = a₁b₁ + a₂b₂\n\nFor a=(1,2) and b=(3,4):\n  a·b = 1×3 + 2×4 = 3 + 8 = 11\n\nIf a·b = 0, the vectors are perpendicular."},"config":{},"is_interactive":false,"sort_key":1000},
      {"block_id":"c3000000-0001-0000-0000-000000000002","type":"multiple_choice","content":{"title":"Dot Product Result","body":"What is (2, 3) · (4, 1)?"},"config":{"options":["5","10","11","14"],"correct_index":2,"success_msg":"Correct! 2×4 + 3×1 = 8 + 3 = 11","fail_msg":"Use the formula: a·b = a₁b₁ + a₂b₂ = 2×4 + 3×1."},"is_interactive":true,"sort_key":2000}
    ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- 9. Achievement definitions
-- ----------------------------------------------------------------
INSERT INTO achievements (id, slug, name, description, category) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'first_lesson',  'First Step',       'Complete your first lesson',           'learning'),
    ('a0000000-0000-0000-0000-000000000002', 'streak_3',      '3-Day Streak',     'Study 3 days in a row',                'streak'),
    ('a0000000-0000-0000-0000-000000000003', 'streak_7',      'Week Warrior',     'Maintain a 7-day learning streak',     'streak'),
    ('a0000000-0000-0000-0000-000000000004', 'streak_30',     'Monthly Master',   'Keep a 30-day streak',                 'streak'),
    ('a0000000-0000-0000-0000-000000000005', 'first_course',  'Course Complete',  'Finish your first course',             'learning'),
    ('a0000000-0000-0000-0000-000000000006', 'courses_5',     'Five-Course Meal', 'Complete 5 courses',                   'learning'),
    ('a0000000-0000-0000-0000-000000000007', 'xp_100',        'XP Hunter',        'Earn 100 XP',                          'learning'),
    ('a0000000-0000-0000-0000-000000000008', 'xp_500',        'XP Master',        'Earn 500 XP',                          'learning'),
    ('a0000000-0000-0000-0000-000000000009', 'social_follow', 'Social Butterfly', 'Follow your first learner',            'social')
ON CONFLICT (id) DO NOTHING;
