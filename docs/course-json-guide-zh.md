# Course JSON 编写指南

本文档介绍如何手动编写 JSON 文件来创建 Primoria 课程。

---

## 快速开始

最小可用课程 JSON 结构如下：

```json
{
  "$schema": "https://primoria.com/course-schema/v1.json",
  "schemaVersion": "1.0.0",
  "courseId": "my-first-course",
  "metadata": {
    "title": "My First Course"
  },
  "pages": [
    {
      "pageId": "page-1",
      "title": "First Page",
      "blocks": []
    }
  ]
}
```

将其保存为 `.json` 文件，然后在 Builder 中点击 “Import” 导入。

### Schema 版本与迁移策略

- 当前 schema 版本：`1.0.0`
- 当前 schema URL：`https://primoria.com/course-schema/v1.json`
- 新导出文件会同时包含 `$schema` 与 `schemaVersion`。
- 导入链路支持自动迁移：
  - 无 `schemaVersion` 的旧版 JSON
  - `0.8.x` 与 `0.9.x` 旧版 JSON
  - 兼容的 `1.x` JSON
- 不支持的版本（如 `2.x` / `9.x`）会在导入时被拒绝，并显示明确迁移错误。
- 迁移过程由 `CourseImport` 记录日志，便于排障。

### AI 生成输出契约

- Builder AI 会将课程 JSON 生成到**单页**中。
- 生成 block 总数上限为 **20**。
- AI 会根据课程类型优先生成更合适的 block 组合（例如编程课优先 `code-block` + `code-playground`，概念课优先文本 + 题目）。
- AI 输出在加载前会先做结构归一化，并通过 schema 校验。

---

## 完整结构

### 1. 顶层结构

```json
{
  "$schema": "https://primoria.com/course-schema/v1.json",
  "schemaVersion": "1.0.0",
  "courseId": "unique-course-id",
  "metadata": { ... },
  "settings": { ... },
  "pages": [ ... ]
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `$schema` | 是（新导出） | Schema URL |
| `schemaVersion` | 是（新导出） | Schema 版本，当前为 `1.0.0` |
| `courseId` | 是 | 课程唯一 ID，建议使用字母数字 |
| `metadata` | 是 | 课程元数据 |
| `settings` | 否 | 课程设置（主题、颜色等） |
| `pages` | 是 | 页面数组，至少一页 |

旧版兼容说明：
- 历史文件可能使用旧 block 类型别名，如 `codeBlock`、`codePlayground`、`multipleChoice`、`fillBlank`、`trueFalse`、`animationBlock`。
- 导入时会自动迁移为规范值：
  - `code-block`
  - `code-playground`
  - `multiple-choice`
  - `fill-blank`
  - `true-false`
  - `animation`

### 2. metadata

```json
"metadata": {
  "title": "Python Intro",
  "description": "Learn Python from scratch",
  "author": {
    "userId": "teacher-001",
    "displayName": "Teacher Zhang"
  },
  "tags": ["Python", "Programming"],
  "difficulty": "beginner",
  "estimatedMinutes": 30
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `title` | 是 | 课程标题 |
| `description` | 否 | 课程简介 |
| `author` | 否 | 作者信息 |
| `tags` | 否 | 标签数组 |
| `difficulty` | 否 | `beginner` / `intermediate` / `advanced` |
| `estimatedMinutes` | 否 | 预计学习时长（分钟） |

### 3. settings

```json
"settings": {
  "theme": "light",
  "primaryColor": "blue",
  "fontFamily": "system"
}
```

通常可选，不配置也有默认值。

### 4. pages

```json
"pages": [
  {
    "pageId": "page-1",
    "title": "Chapter 1",
    "blocks": [ ... ]
  },
  {
    "pageId": "page-2",
    "title": "Chapter 2",
    "blocks": [ ... ]
  }
]
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `pageId` | 是 | 页面唯一 ID |
| `title` | 是 | 页面标题 |
| `blocks` | 是 | 内容块数组 |

---

## Block 详解

每个 Block 的基础结构如下：

```json
{
  "type": "blockType",
  "id": "unique-id",
  "position": { "order": 0 },
  "style": { "spacing": "md", "alignment": "left" },
  "content": { ... }
}
```

### 通用字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `type` | 是 | Block 类型 |
| `id` | 是 | 唯一标识 |
| `position.order` | 否 | 排序值（从 0 开始） |
| `style.spacing` | 否 | 间距：`sm` / `md` / `lg` |
| `style.alignment` | 否 | 对齐：`left` / `center` / `right` |

---

## Block 类型速查

### 1. text - 文本块

用于文本讲解，支持 Markdown。

```json
{
  "type": "text",
  "id": "text-001",
  "position": { "order": 0 },
  "style": { "spacing": "md", "alignment": "left" },
  "content": {
    "format": "markdown",
    "value": "# Title\n\nThis is a paragraph.\n\n- List item 1\n- List item 2"
  }
}
```

**content 字段：**
| 字段 | 说明 |
|------|------|
| `format` | `markdown` 或 `plain` |
| `value` | 文本内容（支持 `\n` 换行） |

**Markdown 小贴士：**
- `# Title` -> 一级标题
- `## Subtitle` -> 二级标题
- `**bold**` -> 粗体
- `*italic*` -> 斜体
- `` `code` `` -> 行内代码
- `- item` -> 无序列表

---

### 2. image - 图片块

```json
{
  "type": "image",
  "id": "img-001",
  "position": { "order": 1 },
  "style": { "spacing": "md", "alignment": "center" },
  "content": {
    "url": "https://example.com/image.png",
    "alt": "Illustration",
    "caption": "Figure 1: Program execution flow"
  }
}
```

**content 字段：**
| 字段 | 必填 | 说明 |
|------|------|------|
| `url` | 是 | 图片 URL |
| `alt` | 否 | 图片加载失败时的替代文本 |
| `caption` | 否 | 图片说明文字 |

---

### 3. code-block - 代码展示块

用于展示代码（只读，不可运行）。

```json
{
  "type": "code-block",
  "id": "code-001",
  "position": { "order": 2 },
  "style": { "spacing": "md", "alignment": "left" },
  "content": {
    "language": "python",
    "code": "def hello():\n    print(\"Hello!\")\n\nhello()"
  }
}
```

**content 字段：**
| 字段 | 说明 |
|------|------|
| `language` | 语言类型：`python` / `javascript` / `dart` / `java` 等 |
| `code` | 代码文本（使用 `\n` 换行） |

---

### 4. code-playground - 可运行代码块

学生可编辑并运行代码验证输出。

```json
{
  "type": "code-playground",
  "id": "playground-001",
  "position": { "order": 3 },
  "style": { "spacing": "md", "alignment": "left" },
  "content": {
    "language": "python",
    "initialCode": "# Calculate 1 + 1 and print the result\nresult = ___\nprint(result)",
    "expectedOutput": "2",
    "hints": [
      "Use the + operator",
      "The answer is 1 + 1"
    ],
    "runnable": true
  }
}
```

**content 字段：**
| 字段 | 必填 | 说明 |
|------|------|------|
| `language` | 是 | 编程语言 |
| `initialCode` | 是 | 初始代码（学生看到的模板） |
| `expectedOutput` | 否 | 期望输出（用于判题） |
| `hints` | 否 | 提示数组（卡住时显示） |
| `runnable` | 否 | 是否可运行，默认 `true` |

执行说明：
- Builder 使用本地 Python-like 模拟器（非完整解释器），支持常见语法场景，如 `print(...)`、变量赋值、四则运算、`type`/`int`/`float`/`round`。

---

### 5. multiple-choice - 选择题

单选示例：

```json
{
  "type": "multiple-choice",
  "id": "quiz-001",
  "position": { "order": 4 },
  "style": { "spacing": "md", "alignment": "left" },
  "content": {
    "question": "Which function prints output in Python?",
    "options": [
      { "id": "a", "text": "print()" },
      { "id": "b", "text": "echo()" },
      { "id": "c", "text": "console.log()" },
      { "id": "d", "text": "System.out.println()" }
    ],
    "correctAnswer": "a",
    "correctAnswers": ["a"],
    "explanation": "Python uses print() to output content to the console.",
    "multiSelect": false
  }
}
```

多选示例：

```json
{
  "type": "multiple-choice",
  "id": "quiz-002",
  "position": { "order": 5 },
  "style": { "spacing": "md", "alignment": "left" },
  "content": {
    "question": "Which are Python data types?",
    "options": [
      { "id": "a", "text": "int" },
      { "id": "b", "text": "float" },
      { "id": "c", "text": "loop" },
      { "id": "d", "text": "str" }
    ],
    "correctAnswers": ["a", "b", "d"],
    "correctAnswer": "a",
    "explanation": "int/float/str are data types; loop is a control-flow concept.",
    "multiSelect": true
  }
}
```

**content 字段：**
| 字段 | 必填 | 说明 |
|------|------|------|
| `question` | 是 | 题干 |
| `options` | 是 | 选项数组，每项包含 `id` 和 `text` |
| `correctAnswer` | 是* | 旧版单答案字段（兼容保留） |
| `correctAnswers` | 推荐 | 正确选项 ID 列表；多选时顺序无关 |
| `explanation` | 否 | 解析说明 |
| `multiSelect` | 否 | 是否多选，默认 `false` |

\* 新内容请以 `correctAnswers` 为准；`correctAnswer` 仅用于兼容导出。

---

### 6. fill-blank - 填空题

```json
{
  "type": "fill-blank",
  "id": "fill-001",
  "position": { "order": 5 },
  "style": { "spacing": "md", "alignment": "left" },
  "content": {
    "question": "The creator of Python is ______",
    "correctAnswer": "Guido van Rossum",
    "hint": "He is Dutch and his name starts with G"
  }
}
```

**content 字段：**
| 字段 | 必填 | 说明 |
|------|------|------|
| `question` | 是 | 题干（空位可用下划线） |
| `correctAnswer` | 是 | 正确答案 |
| `hint` | 否 | 提示 |

---

### 7. true-false - 判断题

```json
{
  "type": "true-false",
  "id": "tf-001",
  "position": { "order": 6 },
  "style": { "spacing": "md", "alignment": "left" },
  "content": {
    "question": "Python is a compiled language.",
    "correctAnswer": false,
    "explanation": "Python is an interpreted language."
  }
}
```

**content 字段：**
| 字段 | 必填 | 说明 |
|------|------|------|
| `question` | 是 | 一个可判定真假的陈述 |
| `correctAnswer` | 是 | `true` 或 `false` |
| `explanation` | 否 | 作答后展示解析 |

---

### 8. animation - 动画块

```json
{
  "type": "animation",
  "id": "anim-001",
  "position": { "order": 7 },
  "style": { "spacing": "md", "alignment": "center" },
  "content": {
    "preset": "bouncing-dot",
    "durationMs": 2000,
    "loop": true,
    "speed": 1.0
  }
}
```

**content 字段：**
| 字段 | 必填 | 说明 |
|------|------|------|
| `preset` | 是 | `bouncing-dot` 或 `pulse-bars` |
| `durationMs` | 否 | 动画时长（毫秒），建议 `300`-`10000` |
| `loop` | 否 | 是否循环，默认 `true` |
| `speed` | 否 | 播放倍率，建议 `0.25`-`3.0` |

---

### 9. video - 视频块

```json
{
  "type": "video",
  "id": "video-001",
  "position": { "order": 6 },
  "style": { "spacing": "md", "alignment": "center" },
  "content": {
    "url": "https://example.com/video.mp4",
    "title": "Python Installation Tutorial"
  }
}
```

**content 字段：**
| 字段 | 必填 | 说明 |
|------|------|------|
| `url` | 是 | 视频 URL |
| `title` | 否 | 视频标题 |

---

## 完整示例

下面是一个包含多种 block 类型的完整课程示例：

```json
{
  "$schema": "https://primoria.com/course-schema/v1.json",
  "schemaVersion": "1.0.0",
  "courseId": "python-101",
  "metadata": {
    "title": "Intro to Python Programming",
    "description": "A beginner-friendly Python course",
    "author": {
      "userId": "teacher-zhang",
      "displayName": "Teacher Zhang"
    },
    "tags": ["Python", "Programming", "Intro"],
    "difficulty": "beginner",
    "estimatedMinutes": 45
  },
  "pages": [
    {
      "pageId": "intro",
      "title": "Course Overview",
      "blocks": [
        {
          "type": "text",
          "id": "welcome",
          "position": { "order": 0 },
          "style": { "spacing": "lg", "alignment": "center" },
          "content": {
            "format": "markdown",
            "value": "# Welcome to Python!\n\nIn this course, you will learn:\n\n- Basic syntax\n- Variables and data types\n- Conditionals and loops\n- Function definitions"
          }
        }
      ]
    },
    {
      "pageId": "hello-world",
      "title": "Hello World",
      "blocks": [
        {
          "type": "text",
          "id": "intro-text",
          "position": { "order": 0 },
          "style": { "spacing": "md", "alignment": "left" },
          "content": {
            "format": "markdown",
            "value": "## Your first program\n\nEvery programmer's first program prints \"Hello, World!\"."
          }
        },
        {
          "type": "code-playground",
          "id": "hello-code",
          "position": { "order": 1 },
          "style": { "spacing": "md", "alignment": "left" },
          "content": {
            "language": "python",
            "initialCode": "# Run this code and see the output\nprint(\"Hello, World!\")",
            "expectedOutput": "Hello, World!",
            "hints": ["Click the Run button to execute"],
            "runnable": true
          }
        },
        {
          "type": "multiple-choice",
          "id": "quiz-print",
          "position": { "order": 2 },
          "style": { "spacing": "md", "alignment": "left" },
          "content": {
            "question": "What does the print() function do?",
            "options": [
              { "id": "a", "text": "Print output to the screen" },
              { "id": "b", "text": "Read user input" },
              { "id": "c", "text": "Define variables" },
              { "id": "d", "text": "Perform math" }
            ],
            "correctAnswer": "a",
            "explanation": "print() outputs the content inside the parentheses to the screen (console)."
          }
        }
      ]
    },
    {
      "pageId": "variables",
      "title": "Variables",
      "blocks": [
        {
          "type": "text",
          "id": "var-intro",
          "position": { "order": 0 },
          "style": { "spacing": "md", "alignment": "left" },
          "content": {
            "format": "markdown",
            "value": "## What is a variable?\n\nA variable is like a **box** that can store data."
          }
        },
        {
          "type": "code-block",
          "id": "var-example",
          "position": { "order": 1 },
          "style": { "spacing": "md", "alignment": "left" },
          "content": {
            "language": "python",
            "code": "name = \"Alex\"\nage = 18\nprint(name)\nprint(age)"
          }
        },
        {
          "type": "code-playground",
          "id": "var-practice",
          "position": { "order": 2 },
          "style": { "spacing": "md", "alignment": "left" },
          "content": {
            "language": "python",
            "initialCode": "# Create a variable x with value 10\n# Then print x\n\n",
            "expectedOutput": "10",
            "hints": [
              "Use = for assignment",
              "x = 10",
              "Then print(x)"
            ],
            "runnable": true
          }
        },
        {
          "type": "fill-blank",
          "id": "fill-var",
          "position": { "order": 3 },
          "style": { "spacing": "md", "alignment": "left" },
          "content": {
            "question": "In Python, use ______ to assign a value to a variable",
            "correctAnswer": "=",
            "hint": "It is the equals sign"
          }
        }
      ]
    }
  ]
}
```

---

## 常见问题（FAQ）

### 问：ID 可以重复吗？
不可以。`courseId`、`pageId` 与每个 Block 的 `id` 都必须唯一。

### 问：如何表示换行？
在 JSON 字符串中使用 `\n`。

### 问：如何校验 JSON 格式与结构？
Builder 已在关键生命周期节点启用集中 schema 校验：

- **Import**：阻断级错误会禁止导入。
- **Save**：阻断级错误会禁止云端保存。
- **Publish**：阻断级错误会禁止发布。

校验消息会带 JSON 字段路径（例如：`$.pages[0].blocks[1].content.correctAnswers[0]`），便于快速定位并修复。

语法工具（如 [jsonlint.com](https://jsonlint.com)）仍可用于检查 JSON 是否格式正确，但它不会校验 Primoria 的课程 schema 业务规则。

---

## 下一步

1. 复制上方示例并保存为 `my-course.json`
2. 打开 Builder，点击 “Import”
3. 选择你的 JSON 文件
4. 开始编辑与预览

如需更多示例，可查看 `examples/` 目录。
