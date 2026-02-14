# Course JSON Authoring Guide

This guide shows you how to manually write a JSON file to create a Primoria course.

---

## Quick Start

The simplest course JSON only needs the following structure:

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

Save it as a `.json` file, then click "Import" in Builder to load it.

### Schema Versioning & Migration Policy

- Current schema version: `1.0.0`
- Current schema URL: `https://primoria.com/course-schema/v1.json`
- New exports always include both `$schema` and `schemaVersion`.
- Import path supports automatic migration for:
  - unversioned legacy JSON (`schemaVersion` missing)
  - legacy `0.8.x` and `0.9.x` JSON
  - compatible `1.x` JSON
- Import rejects unsupported versions (for example `2.x`/`9.x`) with explicit migration errors.
- Migration steps are logged by `CourseImport` for debugging.

### AI Generation Output Contract

- Builder AI generates course JSON into exactly one page.
- Total generated blocks are capped at 20.
- AI generation prefers course-appropriate block diversity (for example, programming courses include `code-block` + `code-playground`; conceptual courses prioritize text + quizzes).
- AI output is normalized into canonical block types and validated before loading.

---

## Full Structure

### 1. Top-Level Structure

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

| Field | Required | Description |
|------|------|------|
| `$schema` | Yes (new exports) | Schema URL |
| `schemaVersion` | Yes (new exports) | Schema version, currently `1.0.0` |
| `courseId` | Yes | Unique course identifier, recommended to use letters and numbers |
| `metadata` | Yes | Course metadata |
| `settings` | No | Course settings (theme, colors, etc.) |
| `pages` | Yes | Page array, at least one page |

Legacy compatibility note:
- Older files may use legacy block type aliases such as `codeBlock`, `codePlayground`, `multipleChoice`, `fillBlank`, `trueFalse`, and `animationBlock`.
- Import will migrate these aliases to canonical values:
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

### 3. code-block - Code Display Block

Used to display code (read-only, not runnable).

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

**content fields:**
| Field | Description |
|------|------|
| `language` | Language: `python` / `javascript` / `dart` / `java`, etc. |
| `code` | Code content (use `\n` for line breaks) |

---

### 4. code-playground - Runnable Code Block

Students can edit and run code to verify output.

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

**content fields:**
| Field | Required | Description |
|------|------|------|
| `language` | Yes | Programming language |
| `initialCode` | Yes | Starter code (template students see) |
| `expectedOutput` | No | Expected output (used to validate answers) |
| `hints` | No | Hint array (shown when students are stuck) |
| `runnable` | No | Whether runnable, default `true` |

Execution note:
- Builder runs a local Python-like simulator (not a full interpreter). It supports common cases such as `print(...)`, variable assignment, arithmetic, and `type`/`int`/`float`/`round`.

---

### 5. multiple-choice - Multiple Choice

Single-select example:

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

Multi-select example:

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

**content fields:**
| Field | Required | Description |
|------|------|------|
| `question` | Yes | Question |
| `options` | Yes | Options array, each includes `id` and `text` |
| `correctAnswer` | Yes* | Legacy single correct option `id` (kept for backward compatibility) |
| `correctAnswers` | Recommended | Correct option id list; for multi-select, order does not matter |
| `explanation` | No | Explanation |
| `multiSelect` | No | Multi-select, default `false` |

\* Use `correctAnswers` as the source of truth for new content. `correctAnswer` is still exported for compatibility.

---

### 6. fill-blank - Fill in the Blank

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

**content fields:**
| Field | Required | Description |
|------|------|------|
| `question` | Yes | Prompt (use underscores for blanks) |
| `correctAnswer` | Yes | Correct answer |
| `hint` | No | Hint |

---

### 7. true-false - True/False Question

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

### 8. animation - Animation Block

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

**content fields:**
| Field | Required | Description |
|------|------|------|
| `preset` | Yes | `bouncing-dot` or `pulse-bars` |
| `durationMs` | No | Duration in milliseconds, recommended `300`-`10000` |
| `loop` | No | Whether to loop animation, default `true` |
| `speed` | No | Playback speed multiplier, recommended `0.25`-`3.0` |

---

### 9. video - Video Block

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

## FAQ

### Q: Can IDs be duplicated?
No. Every `courseId`, `pageId`, and Block `id` must be unique.

### Q: How do I add line breaks?
Use `\n` inside JSON strings.

### Q: How do I validate the JSON format?
Builder now performs centralized schema validation at key lifecycle gates:

- **Import**: blocking errors prevent import.
- **Save**: blocking errors prevent cloud save.
- **Publish**: strict blocking validation prevents invalid courses from being published.

Validation messages include JSON field paths (for example: `$.pages[0].blocks[1].content.correctAnswers[0]`) so issues can be fixed quickly.

Syntax-only tools (like [jsonlint.com](https://jsonlint.com)) can still help catch malformed JSON, but they do not enforce Primoria's course schema rules.

---

## Next Steps

1. Copy the example above and save as `my-course.json`
2. Open Builder and click "Import"
3. Select your JSON file
4. Start editing and previewing

Questions? Check more examples in the `examples/` directory.
