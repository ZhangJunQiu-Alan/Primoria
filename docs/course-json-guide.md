# Course JSON Guide (Current Canonical Format)

Last updated: 2026-03-17

This is the format expected by Builder import/export and schema validator.

## 1) Top-Level Shape

```json
{
  "$schema": "https://primoria.com/course-schema/v1.json",
  "schema_version": "1.0.0",
  "course_id": "course-xxxx",
  "metadata": {
    "title": "My Course",
    "description": "Optional",
    "author": { "userId": "u1", "displayName": "Author" },
    "tags": ["tag1"],
    "difficulty_level": "beginner",
    "estimated_minutes": 60,
    "createdAt": "2026-03-17T00:00:00.000Z",
    "updatedAt": "2026-03-17T00:00:00.000Z",
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
- All structural IDs and metadata fields use **snake_case** in canonical output: `schema_version`, `course_id`, `difficulty_level`, `estimated_minutes`.
- Legacy camelCase keys (`schemaVersion`, `courseId`, `difficulty`, `estimatedMinutes`) are accepted on import and auto-migrated.
- Canonical top-level list key is `lessons`. Legacy `pages` is still accepted on import and migrated automatically.

## 2) Lesson Shape

```json
{
  "lesson_id": "lesson-xxxx",
  "title": "Lesson 1",
  "pages": [
    {
      "page_id": "page-xxxx",
      "order": 0,
      "blocks": []
    }
  ]
}
```

Notes:
- Canonical keys: `lesson_id`, `page_id` (snake_case). Legacy `lessonId`, `pageId` accepted and migrated on import.
- Each lesson contains one or more **pages**; each page holds an ordered list of blocks.
- A lesson is always created with one empty page.
- Legacy `pageId` at lesson level is accepted and migrated to `lesson_id`.
- Legacy `blocks` array at lesson level (pre-page format) is automatically wrapped into a single page on import.

## 3) Block Shape

```json
{
  "id": "block-xxxx",
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
- `interactive-visual`
- `video`

Common alias forms like `codeBlock`, `code_playground`, `functionFlow`, `multipleChoice`, `trueFalse`, `animationBlock`, `interactiveVisual` are auto-migrated during import.

## 5) Minimal Content Examples

### text
```json
{
  "type": "text",
  "content": {
    "format": "richtext",
    "value": { "ops": [{ "insert": "Hello world\n" }] }
  }
}
```

Note: The canonical text format is **richtext** (Quill Delta JSON). Legacy `format: "markdown"` with a string `value` is accepted on import and converted at display time.

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

### code-execution
```json
{
  "type": "code-execution",
  "content": {
    "language": "python",
    "source_code": "x=1\nprint(x)",
    "traceSteps": [
      { "line": 1, "variables": { "x": 1 } },
      { "line": 2, "stdoutDelta": "1" }
    ]
  }
}
```

Note: canonical key is `source_code` (snake_case). Legacy `sourceCode` and `code` are accepted by Viewer.

### multiple-choice (single select)
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

### multiple-choice (multi select)
```json
{
  "type": "multiple-choice",
  "content": {
    "question": "Which are even?",
    "options": [
      { "id": "a", "text": "2" },
      { "id": "b", "text": "3" },
      { "id": "c", "text": "4" }
    ],
    "mode": "multi",
    "multi_select": true,
    "correctAnswers": ["a", "c"]
  }
}
```

Note: `multi_select: true` triggers checkbox UI in Viewer (`QuestionType.multiChoice`). All selected IDs must match `correctAnswers` exactly.

### matching (list mode)
```json
{
  "type": "matching",
  "content": {
    "question": "Match the terms",
    "pairs": [
      { "left": "Cat", "right": "Meow" },
      { "left": "Dog", "right": "Woof" }
    ]
  }
}
```

### matching (graph mode)
```json
{
  "type": "matching",
  "content": {
    "question": "Match the calls",
    "nodes": [
      { "id": "n1", "label": "main" },
      { "id": "n2", "label": "helper" }
    ],
    "edges": [
      { "from": "n1", "to": "n2" }
    ]
  }
}
```

Note: Graph mode (`nodes` + `edges`) is automatically converted to label→label pairs by Viewer.

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

### interactive-visual
```json
{
  "type": "interactive-visual",
  "content": {
    "title": "Gas Pressure Demo",
    "description": "Drag the piston to observe pressure changes",
    "htmlContent": "<html>...</html>",
    "aiPrompt": "Create an ideal gas piston simulation"
  }
}
```

Note: `htmlContent` is AI-generated HTML/JS rendered in an iframe. Content keys remain camelCase (not snake_case) because Viewer reads them directly from the JSON map.

### video
```json
{
  "type": "video",
  "content": {
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "title": "Introduction",
    "caption": "Optional caption"
  }
}
```

Note: Viewer converts YouTube (`/watch?v=ID` → `/embed/ID`) and Vimeo (`vimeo.com/ID` → `player.vimeo.com/video/ID`) URLs automatically. Direct video URLs (`.mp4`, `.webm`) are used as-is.

## 6) Validation Rules (Important)

- `course_id`, `metadata.title`, `lesson_id`, `lesson.title`, `block.id`, `block.type` must be present and valid.
- Block IDs must be globally unique within the course JSON.
- Unsupported block type values are rejected.
- Strict validation is applied during publish/export; warnings (not errors) during save/import for legacy fields.

## 7) Practical Import Guidance

1. Keep IDs stable when editing existing course exports.
2. Prefer canonical snake_case keys (`lessons`, `lesson_id`, `page_id`, `course_id`, `schema_version`, `difficulty_level`, `estimated_minutes`).
3. For legacy JSON, import directly and let the migrator normalize it automatically.
4. If import fails, fix the exact field path shown by schema errors.
