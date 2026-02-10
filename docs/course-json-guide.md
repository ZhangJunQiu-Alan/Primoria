# Course JSON Authoring Guide

This guide shows you how to manually write a JSON file to create a Primoria course.

---

## Quick Start

The simplest course JSON only needs the following structure:

```json
{
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

Save it as a `.json` file, then click "Import" in Builder to load it.

---

## Full Structure

### 1. Top-Level Structure

```json
{
  "courseId": "unique-course-id",
  "metadata": { ... },
  "settings": { ... },
  "pages": [ ... ]
}
```

| Field | Required | Description |
|------|------|------|
| `courseId` | Yes | Unique course identifier, recommended to use letters and numbers |
| `metadata` | Yes | Course metadata |
| `settings` | No | Course settings (theme, colors, etc.) |
| `pages` | Yes | Page array, at least one page |

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

| Field | Required | Description |
|------|------|------|
| `title` | Yes | Course title |
| `description` | No | Course description |
| `author` | No | Author info |
| `tags` | No | Tag array |
| `difficulty` | No | `beginner` / `intermediate` / `advanced` |
| `estimatedMinutes` | No | Estimated study time (minutes) |

### 3. settings

```json
"settings": {
  "theme": "light",
  "primaryColor": "blue",
  "fontFamily": "system"
}
```

Usually optional; defaults are fine.

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

| Field | Required | Description |
|------|------|------|
| `pageId` | Yes | Unique page ID |
| `title` | Yes | Page title |
| `blocks` | Yes | Content block array |

---

## Block Details

Each Block has a basic structure like this:

```json
{
  "type": "blockType",
  "id": "unique-id",
  "position": { "order": 0 },
  "style": { "spacing": "md", "alignment": "left" },
  "content": { ... }
}
```

### Common Fields

| Field | Required | Description |
|------|------|------|
| `type` | Yes | Block type |
| `id` | Yes | Unique identifier |
| `position.order` | No | Sort order (starts at 0) |
| `style.spacing` | No | Spacing: `sm` / `md` / `lg` |
| `style.alignment` | No | Alignment: `left` / `center` / `right` |

---

## Block Type Quick Reference

### 1. text - Text Block

Used for text explanations, supports Markdown.

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

**content fields:**
| Field | Description |
|------|------|
| `format` | `markdown` or `plain` |
| `value` | Text content (supports `\n` line breaks) |

**Markdown tips:**
- `# Title` -> H1
- `## Subtitle` -> H2
- `**bold**` -> bold
- `*italic*` -> italic
- `` `code` `` -> inline code
- `- item` -> unordered list

---

### 2. image - Image Block

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

**content fields:**
| Field | Required | Description |
|------|------|------|
| `url` | Yes | Image URL |
| `alt` | No | Alt text (when image cannot load) |
| `caption` | No | Caption text |

---

### 3. codeBlock - Code Display Block

Used to display code (read-only, not runnable).

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

**content fields:**
| Field | Description |
|------|------|
| `language` | Language: `python` / `javascript` / `dart` / `java`, etc. |
| `code` | Code content (use `\n` for line breaks) |

---

### 4. codePlayground - Runnable Code Block

Students can edit and run code to verify output.

```json
{
  "type": "codePlayground",
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

**content fields:**
| Field | Required | Description |
|------|------|------|
| `language` | Yes | Programming language |
| `initialCode` | Yes | Starter code (template students see) |
| `expectedOutput` | No | Expected output (used to validate answers) |
| `hints` | No | Hint array (shown when students are stuck) |
| `runnable` | No | Whether runnable, default `true` |

---

### 5. multipleChoice - Multiple Choice

```json
{
  "type": "multipleChoice",
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
    "explanation": "Python uses print() to output content to the console.",
    "multiSelect": false
  }
}
```

**content fields:**
| Field | Required | Description |
|------|------|------|
| `question` | Yes | Question |
| `options` | Yes | Options array, each includes `id` and `text` |
| `correctAnswer` | Yes | Correct option `id` |
| `explanation` | No | Explanation |
| `multiSelect` | No | Multi-select, default `false` |

---

### 6. fillBlank - Fill in the Blank

```json
{
  "type": "fillBlank",
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

**content fields:**
| Field | Required | Description |
|------|------|------|
| `question` | Yes | Prompt (use underscores for blanks) |
| `correctAnswer` | Yes | Correct answer |
| `hint` | No | Hint |

---

### 7. trueFalse - True/False Question

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

**content fields:**
| Field | Required | Description |
|------|------|------|
| `question` | Yes | A statement that is either true or false |
| `correctAnswer` | Yes | `true` or `false` |
| `explanation` | No | Explanation shown after answering |

---

### 8. video - Video Block

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

**content fields:**
| Field | Required | Description |
|------|------|------|
| `url` | Yes | Video URL |
| `title` | No | Video title |

---

## Complete Example

Below is a complete course example with multiple block types:

```json
{
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
          "type": "codePlayground",
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
          "type": "multipleChoice",
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
          "type": "codeBlock",
          "id": "var-example",
          "position": { "order": 1 },
          "style": { "spacing": "md", "alignment": "left" },
          "content": {
            "language": "python",
            "code": "name = \"Alex\"\nage = 18\nprint(name)\nprint(age)"
          }
        },
        {
          "type": "codePlayground",
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
          "type": "fillBlank",
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

## FAQ

### Q: Can IDs be duplicated?
No. Every `courseId`, `pageId`, and Block `id` must be unique.

### Q: How do I add line breaks?
Use `\n` inside JSON strings.

### Q: How do I validate the JSON format?
VS Code will check syntax automatically. You can also use online tools like [jsonlint.com](https://jsonlint.com).

---

## Next Steps

1. Copy the example above and save as `my-course.json`
2. Open Builder and click "Import"
3. Select your JSON file
4. Start editing and previewing

Questions? Check more examples in the `examples/` directory.
