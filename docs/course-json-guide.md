# Course JSON Guide (Current Canonical Format)

Last updated: 2026-03-06

This is the format expected by Builder import/export and schema validator.

## 1) Top-Level Shape

```json
{
  "$schema": "https://primoria.com/course-schema/v1.json",
  "schemaVersion": "1.0.0",
  "courseId": "course-xxxx",
  "metadata": {
    "title": "My Course",
    "description": "Optional",
    "author": { "userId": "u1", "displayName": "Author" },
    "tags": ["tag1"],
    "difficulty": "beginner",
    "estimatedMinutes": 60,
    "createdAt": "2026-03-06T00:00:00.000Z",
    "updatedAt": "2026-03-06T00:00:00.000Z",
    "version": "1.0.0"
  },
  "settings": {
    "theme": "light",
    "primaryColor": "blue",
    "fontFamily": "system"
  },
  "lessons": []
}
```

Notes:
- Canonical key is `lessons`.
- Legacy `pages` is still accepted on import and migrated automatically.

## 2) Lesson Shape

```json
{
  "lessonId": "lesson-1",
  "title": "Lesson 1",
  "pages": [
    {
      "pageId": "page-xxxx",
      "order": 0,
      "blocks": []
    }
  ]
}
```

Notes:
- Each lesson contains one or more **pages**; each page holds an ordered list of blocks.
- A lesson is always created with one empty page; a new page can only be added when the current page has ≥ 1 block.
- Legacy `pageId` at lesson level is accepted and migrated to `lessonId`.
- Legacy `blocks` array at lesson level (pre-page format) is automatically wrapped into a single page on import.

## 3) Block Shape

```json
{
  "id": "block-1",
  "type": "text",
  "position": { "order": 0 },
  "style": { "spacing": "md", "alignment": "left" },
  "visibilityRule": "always",
  "requiredForProgress": false,
  "content": {}
}
```

### Visibility Rules

Allowed values:
- `always`
- `afterPreviousCorrect`

Default behavior:
- first block in a lesson defaults to `always`
- non-first blocks default to `afterPreviousCorrect`

Import aliases accepted and normalized:
- `after_previous_correct`
- `after-previous-correct`

## 4) Canonical Block Types

- `text`
- `image`
- `code-block`
- `code-playground`
- `code-execution`
- `function-flow`
- `multiple-choice`
- `fill-blank`
- `true-false`
- `matching`
- `animation`
- `video`

Common alias forms like `codeBlock`, `code_playground`, `functionFlow`, `multipleChoice`, `trueFalse`, `animationBlock` are auto-migrated during import.

## 5) Minimal Content Examples

### text
```json
{
  "type": "text",
  "content": {
    "format": "markdown",
    "value": "# Title\n\nBody"
  }
}
```

### code-block
```json
{
  "type": "code-block",
  "content": {
    "language": "python",
    "code": "print('hello')"
  }
}
```

### code-playground
```json
{
  "type": "code-playground",
  "content": {
    "language": "python",
    "initialCode": "print(1+1)",
    "expectedOutput": "2",
    "runnable": true
  }
}
```

### multiple-choice
```json
{
  "type": "multiple-choice",
  "content": {
    "question": "2+2=?",
    "options": [
      { "id": "a", "text": "3" },
      { "id": "b", "text": "4" }
    ],
    "mode": "single",
    "correctAnswers": ["b"]
  }
}
```

### function-flow
```json
{
  "type": "function-flow",
  "content": {
    "entryNodeId": "n1",
    "nodes": [{ "id": "n1", "label": "main" }],
    "edges": [],
    "steps": [{ "nodeId": "n1" }]
  }
}
```

### code-execution
```json
{
  "type": "code-execution",
  "content": {
    "language": "python",
    "sourceCode": "x=1\nprint(x)",
    "traceSteps": [
      { "line": 1, "variables": { "x": 1 } },
      { "line": 2, "stdoutDelta": "1" }
    ]
  }
}
```

## 6) Validation Rules (Important)

- `courseId`, `metadata.title`, `lessonId`, `lesson.title`, `block.id`, `block.type` must be valid.
- block IDs must be globally unique within the course JSON.
- unsupported block type values are rejected.
- strict validation is applied during publish/export.

## 7) Practical Import Guidance

1. Keep IDs stable when editing existing course exports.
2. Prefer canonical keys (`lessons`, `lessonId`, canonical block types).
3. For legacy JSON, import directly and let migrator normalize it.
4. If import fails, fix the exact field path shown by schema errors.
