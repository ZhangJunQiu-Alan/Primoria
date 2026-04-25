# Course JSON 指南（当前规范）

最后更新：2026-04-19

本文档描述 Builder 当前导入/导出与 schema 校验的实际口径，以 `packages/schema/` 中的规范定义为准。

## 1. 顶层结构

```json
{
  "$schema": "https://primoria.com/course-schema/v1.json",
  "schemaVersion": "1.0.0",
  "courseId": "course-xxxx",
  "metadata": {
    "title": "课程标题",
    "description": "可选",
    "author": { "userId": "u1", "displayName": "Author" },
    "tags": ["python"],
    "difficulty": "beginner",
    "estimatedMinutes": 60,
    "createdAt": "2026-04-19T00:00:00.000Z",
    "updatedAt": "2026-04-19T00:00:00.000Z",
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

- 规范键是 `lessons`
- 历史键 `pages` 仍可导入，迁移器会自动转换

## 2. Lesson 结构

```json
{
  "lessonId": "lesson-1",
  "title": "Lesson 1",
  "blocks": []
}
```

历史 `pageId` 会在导入时迁移为 `lessonId`。

## 3. Block 通用结构

```json
{
  "id": "block-1",
  "type": "text",
  "position": { "order": 0 },
  "style": { "spacing": "md", "alignment": "left" },
  "visibilityRule": "always",
  "content": {}
}
```

### 可见性规则

- 可选值：`always`、`afterPreviousCorrect`
- 默认逻辑：
  - 每个 lesson 的第一个 block 默认 `always`
  - 非第一个 block 默认 `afterPreviousCorrect`
- 历史别名 `after_previous_correct`、`after-previous-correct` 会自动归一化

## 4. Block 类型（当前规范值）

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
- `interactive-visual`
- `video`

历史写法如 `codeBlock`、`functionFlow`、`multipleChoice`、`trueFalse`、`animation`、`animationBlock`、`interactiveVisual` 会在导入时自动迁移为规范值。

## 5. 最小 content 示例

### text

```json
{
  "type": "text",
  "content": {
    "format": "richtext",
    "value": "这是正文"
  }
}
```

### image

```json
{
  "type": "image",
  "content": {
    "url": "https://example.com/image.png",
    "alt": "示例图片"
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
    "initialCode": "print(1 + 1)",
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
    "code": "x = 1\nprint(x)"
  }
}
```

### function-flow

```json
{
  "type": "function-flow",
  "content": {
    "nodes": [{ "id": "n1", "label": "main" }],
    "edges": []
  }
}
```

### multiple-choice

```json
{
  "type": "multiple-choice",
  "content": {
    "question": "2 + 2 = ?",
    "options": [
      { "id": "a", "text": "3", "isCorrect": false },
      { "id": "b", "text": "4", "isCorrect": true }
    ],
    "allowMultiple": false
  }
}
```

### fill-blank

```json
{
  "type": "fill-blank",
  "content": {
    "template": "Python 的作者是 __。",
    "blanks": [
      { "id": "b1", "answer": "Guido van Rossum" }
    ]
  }
}
```

### true-false

```json
{
  "type": "true-false",
  "content": {
    "statement": "Python 是解释型语言。",
    "isTrue": true
  }
}
```

### matching

```json
{
  "type": "matching",
  "content": {
    "pairs": [
      { "id": "p1", "left": "for", "right": "循环" }
    ]
  }
}
```

### interactive-visual

```json
{
  "type": "interactive-visual",
  "content": {
    "template": "force-diagram",
    "title": "受力分析"
  }
}
```

### video

```json
{
  "type": "video",
  "content": {
    "url": "https://example.com/demo.mp4",
    "provider": "custom"
  }
}
```

## 6. 关键校验点

- `courseId`、`metadata.title`、`lessonId`、`lesson.title`、`block.id`、`block.type` 必须合法
- block ID 在整个课程内必须唯一
- 不支持的 block type 会被拒绝
- 发布/导出阶段会执行更严格校验

## 7. 导入建议

1. 修改已有导出文件时尽量保持 ID 稳定
2. 优先使用规范键和规范 block type
3. 历史 JSON 可以直接导入，由迁移器自动归一化
4. 导入失败时按报错中的字段路径逐项修复
