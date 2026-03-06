# Course JSON 指南（当前规范）

最后更新：2026-03-06

本文档是 Builder 导入/导出与 Schema 校验的当前口径。

## 1）顶层结构

```json
{
  "$schema": "https://primoria.com/course-schema/v1.json",
  "schemaVersion": "1.0.0",
  "courseId": "course-xxxx",
  "metadata": {
    "title": "My Course",
    "description": "可选",
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

说明：
- 规范键是 `lessons`。
- 导入仍兼容历史键 `pages`，会自动迁移。

## 2）Lesson 结构

```json
{
  "lessonId": "lesson-1",
  "title": "Lesson 1",
  "blocks": []
}
```

历史 `pageId` 导入时会迁移为 `lessonId`。

## 3）Block 结构

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

### 可见性规则

可选值：
- `always`
- `afterPreviousCorrect`

默认逻辑：
- 每个 lesson 的第一个 block 默认 `always`
- 非第一个 block 默认 `afterPreviousCorrect`

导入兼容别名并自动归一化：
- `after_previous_correct`
- `after-previous-correct`

## 4）Block 类型（规范值）

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

`codeBlock`、`code_playground`、`functionFlow`、`multipleChoice`、`trueFalse`、`animationBlock` 等历史写法在导入时会自动迁移。

## 5）最小 content 示例

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

## 6）关键校验点

- `courseId`、`metadata.title`、`lessonId`、`lesson.title`、`block.id`、`block.type` 必须合法。
- block ID 在整个课程 JSON 内必须唯一。
- 不支持的 block type 会被拒绝。
- 发布/导出阶段启用更严格校验。

## 7）导入建议

1. 修改已有导出文件时，尽量保持 ID 稳定。
2. 优先使用规范键（`lessons`、`lessonId`、规范 block type）。
3. 历史 JSON 可直接导入，由迁移器自动归一化。
4. 导入失败时按错误提示中的字段路径逐项修复。
