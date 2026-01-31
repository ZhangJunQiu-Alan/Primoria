# 课程 JSON 编写指南

本指南教你如何手动编写 JSON 文件来创建 Primoria 课程。

---

## 快速开始

最简单的课程 JSON 只需要以下结构：

```json
{
  "courseId": "my-first-course",
  "metadata": {
    "title": "我的第一个课程"
  },
  "pages": [
    {
      "pageId": "page-1",
      "title": "第一页",
      "blocks": []
    }
  ]
}
```

保存为 `.json` 文件，在 Builder 中点击「导入」即可加载。

---

## 完整结构说明

### 1. 顶层结构

```json
{
  "courseId": "唯一课程ID",
  "metadata": { ... },
  "settings": { ... },
  "pages": [ ... ]
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `courseId` | 是 | 课程唯一标识，建议用英文和数字 |
| `metadata` | 是 | 课程元信息 |
| `settings` | 否 | 课程设置（主题、颜色等） |
| `pages` | 是 | 页面数组，至少一页 |

### 2. metadata（元信息）

```json
"metadata": {
  "title": "Python 入门",
  "description": "从零开始学 Python",
  "author": {
    "userId": "teacher-001",
    "displayName": "张老师"
  },
  "tags": ["Python", "编程"],
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
| `estimatedMinutes` | 否 | 预计学习时间（分钟） |

### 3. settings（设置）

```json
"settings": {
  "theme": "light",
  "primaryColor": "blue",
  "fontFamily": "system"
}
```

通常可省略，使用默认值即可。

### 4. pages（页面）

```json
"pages": [
  {
    "pageId": "page-1",
    "title": "第一章",
    "blocks": [ ... ]
  },
  {
    "pageId": "page-2",
    "title": "第二章",
    "blocks": [ ... ]
  }
]
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `pageId` | 是 | 页面唯一ID |
| `title` | 是 | 页面标题 |
| `blocks` | 是 | 内容块数组 |

---

## Block（内容块）详解

每个 Block 的基本结构：

```json
{
  "type": "block类型",
  "id": "唯一ID",
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
| `position.order` | 否 | 排序顺序（从 0 开始） |
| `style.spacing` | 否 | 间距：`sm` / `md` / `lg` |
| `style.alignment` | 否 | 对齐：`left` / `center` / `right` |

---

## Block 类型速查

### 1. text - 文本块

用于显示文字说明，支持 Markdown 格式。

```json
{
  "type": "text",
  "id": "text-001",
  "position": { "order": 0 },
  "style": { "spacing": "md", "alignment": "left" },
  "content": {
    "format": "markdown",
    "value": "# 标题\n\n这是一段文字。\n\n- 列表项 1\n- 列表项 2"
  }
}
```

**content 字段：**
| 字段 | 说明 |
|------|------|
| `format` | `markdown` 或 `plain` |
| `value` | 文本内容（支持换行符 `\n`） |

**Markdown 技巧：**
- `# 标题` → 一级标题
- `## 二级标题` → 二级标题
- `**粗体**` → 粗体
- `*斜体*` → 斜体
- `` `代码` `` → 行内代码
- `- 项目` → 无序列表

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
    "alt": "示意图",
    "caption": "图 1：程序运行流程"
  }
}
```

**content 字段：**
| 字段 | 必填 | 说明 |
|------|------|------|
| `url` | 是 | 图片地址 |
| `alt` | 否 | 替代文字（图片无法显示时） |
| `caption` | 否 | 图片说明文字 |

---

### 3. codeBlock - 代码展示块

用于展示代码（只读，不可运行）。

```json
{
  "type": "codeBlock",
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
| `language` | 语言：`python` / `javascript` / `dart` / `java` 等 |
| `code` | 代码内容（用 `\n` 换行） |

---

### 4. codePlayground - 可运行代码块

学生可以编辑并运行代码，检验输出是否正确。

```json
{
  "type": "codePlayground",
  "id": "playground-001",
  "position": { "order": 3 },
  "style": { "spacing": "md", "alignment": "left" },
  "content": {
    "language": "python",
    "initialCode": "# 请计算 1+1 并输出结果\nresult = ___\nprint(result)",
    "expectedOutput": "2",
    "hints": [
      "使用加法运算符 +",
      "答案是 1 + 1"
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
| `expectedOutput` | 否 | 预期输出（用于验证答案） |
| `hints` | 否 | 提示数组（学生卡住时可查看） |
| `runnable` | 否 | 是否可运行，默认 `true` |

---

### 5. multipleChoice - 选择题

```json
{
  "type": "multipleChoice",
  "id": "quiz-001",
  "position": { "order": 4 },
  "style": { "spacing": "md", "alignment": "left" },
  "content": {
    "question": "Python 中哪个函数用于输出？",
    "options": [
      { "id": "a", "text": "print()" },
      { "id": "b", "text": "echo()" },
      { "id": "c", "text": "console.log()" },
      { "id": "d", "text": "System.out.println()" }
    ],
    "correctAnswer": "a",
    "explanation": "Python 使用 print() 函数输出内容到控制台。",
    "multiSelect": false
  }
}
```

**content 字段：**
| 字段 | 必填 | 说明 |
|------|------|------|
| `question` | 是 | 题目 |
| `options` | 是 | 选项数组，每项包含 `id` 和 `text` |
| `correctAnswer` | 是 | 正确答案的 `id` |
| `explanation` | 否 | 答案解释 |
| `multiSelect` | 否 | 是否多选，默认 `false` |

---

### 6. fillBlank - 填空题

```json
{
  "type": "fillBlank",
  "id": "fill-001",
  "position": { "order": 5 },
  "style": { "spacing": "md", "alignment": "left" },
  "content": {
    "question": "Python 的创始人是 ______",
    "correctAnswer": "Guido van Rossum",
    "hint": "他是荷兰人，名字以 G 开头"
  }
}
```

**content 字段：**
| 字段 | 必填 | 说明 |
|------|------|------|
| `question` | 是 | 题目（用下划线表示空格） |
| `correctAnswer` | 是 | 正确答案 |
| `hint` | 否 | 提示 |

---

### 7. video - 视频块

```json
{
  "type": "video",
  "id": "video-001",
  "position": { "order": 6 },
  "style": { "spacing": "md", "alignment": "center" },
  "content": {
    "url": "https://example.com/video.mp4",
    "title": "Python 安装教程"
  }
}
```

**content 字段：**
| 字段 | 必填 | 说明 |
|------|------|------|
| `url` | 是 | 视频地址 |
| `title` | 否 | 视频标题 |

---

## 完整示例

以下是一个包含多种 Block 类型的完整课程示例：

```json
{
  "courseId": "python-101",
  "metadata": {
    "title": "Python 编程入门",
    "description": "适合零基础学习者的 Python 入门课程",
    "author": {
      "userId": "teacher-zhang",
      "displayName": "张老师"
    },
    "tags": ["Python", "编程", "入门"],
    "difficulty": "beginner",
    "estimatedMinutes": 45
  },
  "pages": [
    {
      "pageId": "intro",
      "title": "课程介绍",
      "blocks": [
        {
          "type": "text",
          "id": "welcome",
          "position": { "order": 0 },
          "style": { "spacing": "lg", "alignment": "center" },
          "content": {
            "format": "markdown",
            "value": "# 欢迎学习 Python！\n\n在这门课程中，你将学习：\n\n- 基本语法\n- 变量和数据类型\n- 条件和循环\n- 函数定义"
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
            "value": "## 你的第一个程序\n\n每个程序员的第一个程序都是输出 \"Hello, World!\"。"
          }
        },
        {
          "type": "codePlayground",
          "id": "hello-code",
          "position": { "order": 1 },
          "style": { "spacing": "md", "alignment": "left" },
          "content": {
            "language": "python",
            "initialCode": "# 运行这段代码，看看会输出什么\nprint(\"Hello, World!\")",
            "expectedOutput": "Hello, World!",
            "hints": ["点击运行按钮执行代码"],
            "runnable": true
          }
        },
        {
          "type": "multipleChoice",
          "id": "quiz-print",
          "position": { "order": 2 },
          "style": { "spacing": "md", "alignment": "left" },
          "content": {
            "question": "print() 函数的作用是什么？",
            "options": [
              { "id": "a", "text": "输出内容到屏幕" },
              { "id": "b", "text": "读取用户输入" },
              { "id": "c", "text": "定义变量" },
              { "id": "d", "text": "进行数学计算" }
            ],
            "correctAnswer": "a",
            "explanation": "print() 函数用于将括号内的内容输出到屏幕（控制台）。"
          }
        }
      ]
    },
    {
      "pageId": "variables",
      "title": "变量",
      "blocks": [
        {
          "type": "text",
          "id": "var-intro",
          "position": { "order": 0 },
          "style": { "spacing": "md", "alignment": "left" },
          "content": {
            "format": "markdown",
            "value": "## 什么是变量？\n\n变量就像一个**盒子**，可以存储数据。"
          }
        },
        {
          "type": "codeBlock",
          "id": "var-example",
          "position": { "order": 1 },
          "style": { "spacing": "md", "alignment": "left" },
          "content": {
            "language": "python",
            "code": "name = \"小明\"\nage = 18\nprint(name)\nprint(age)"
          }
        },
        {
          "type": "codePlayground",
          "id": "var-practice",
          "position": { "order": 2 },
          "style": { "spacing": "md", "alignment": "left" },
          "content": {
            "language": "python",
            "initialCode": "# 创建一个变量 x，值为 10\n# 然后输出 x\n\n",
            "expectedOutput": "10",
            "hints": [
              "使用 = 赋值",
              "x = 10",
              "然后 print(x)"
            ],
            "runnable": true
          }
        },
        {
          "type": "fillBlank",
          "id": "fill-var",
          "position": { "order": 3 },
          "style": { "spacing": "md", "alignment": "left" },
          "content": {
            "question": "在 Python 中，使用 ______ 符号给变量赋值",
            "correctAnswer": "=",
            "hint": "这是一个等号"
          }
        }
      ]
    }
  ]
}
```

---

## 常见问题

### Q: ID 可以重复吗？
不可以。每个 `courseId`、`pageId`、Block `id` 都必须唯一。

### Q: 如何换行？
在 JSON 字符串中使用 `\n` 表示换行。

### Q: 支持中文吗？
完全支持。确保文件保存为 UTF-8 编码。

### Q: 如何验证 JSON 格式？
推荐使用 VS Code 编辑，会自动检查语法错误。也可以用在线工具如 [jsonlint.com](https://jsonlint.com)。

---

## 下一步

1. 复制上面的示例，保存为 `my-course.json`
2. 打开 Builder，点击「导入」
3. 选择你的 JSON 文件
4. 开始编辑和预览！

有问题？查看 `examples/` 目录下的更多示例文件。
