# Course JSON 指南（当前规范）

最后更新：2026-05-13

本文档描述 Builder 当前导入/导出、AI 课程生成与 schema 校验的实际口径，以 `packages/schema/` 中的规范定义为准。

Primoria 的课程内容层级是：

```txt
Course -> Lesson -> Page -> Block
```

AI 生成课程、手动编辑、导入导出和 Viewer 播放都应围绕这个层级工作。历史格式可以导入，但导入后必须迁移到当前规范层级。

## 1. 顶层结构

```json
{
  "$schema": "https://primoria.com/course-schema/v1.json",
  "schema_version": "1.0.0",
  "course_id": "course-xxxx",
  "metadata": {
    "title": "课程标题",
    "description": "可选",
    "author": { "userId": "u1", "displayName": "Author" },
    "tags": ["python"],
    "difficulty_level": "beginner",
    "estimated_minutes": 60,
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
- 历史顶层 `pages` 仍可导入，迁移器会自动转换为 `lessons[].pages[]`

## 2. Lesson 结构

```json
{
  "lesson_id": "lesson-1",
  "title": "Lesson 1",
  "pages": [
    {
      "page_id": "page-lesson-1-0",
      "order": 0,
      "blocks": []
    }
  ]
}
```

说明：

- 一个 lesson 可以包含多个 page，用于把一个学习主题拆成若干连续学习步骤
- 历史 `pageId` 会在导入时迁移为 `lesson_id`
- 历史 lesson 内直接 `blocks` 的写法会被包成一个默认 page

## 3. Page 结构

```json
{
  "page_id": "page-lesson-1-0",
  "order": 0,
  "blocks": []
}
```

说明：

- 一个 page 承载学习者当前屏幕上要完成的一组 block
- Page 内 block 顺序由 `position.order` 控制
- Viewer 的 Lesson Runtime 以 page 为推进单位，负责 `Prev / Check / Next / Complete`、答题反馈和 block 渲染
- AI 生成完整课程时，应把 page 当作“教材中的一页互动学习步骤”，而不是只把 lesson 当作一大段内容容器

## 4. Block 通用结构

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

- 可选值以 schema 为准；当前规范值为 `always`、`hidden`
- 默认逻辑：
  - 每个 page 的第一个核心说明或互动 block 应默认可见
  - 后续 block 可以由运行时交互、题目反馈或明确的隐藏策略控制
- 历史别名 `after_previous_correct`、`after-previous-correct` 会自动归一化

## 5. Block 类型（当前规范值）

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

## 6. 最小 content 示例

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

`interactive-visual` 是 Primoria 最关键的学习 block。它的目标不是展示一张图，而是提供类似 Brilliant 的互动学习方式：学习者可以操作参数、观察状态变化、推进过程、得到即时反馈，并用视觉化方式理解概念。

```json
{
  "type": "interactive-visual",
  "content": {
    "template": "force-diagram",
    "title": "受力分析",
    "description": "拖动滑块改变质量和力，观察加速度如何变化。",
    "generatedHtml": "<!doctype html>...",
    "engine": "gemini-html5"
  }
}
```

AI 生成此类 block 时应优先满足：

1. 页面加载后有清晰的默认可见状态
2. 至少一个真实可操作控件或可推进步骤
3. 操作后视觉状态和解释文本同步变化
4. 学习目标与 Course / Lesson / Page 上下文一致
5. 移动端不溢出、不遮挡、不依赖不可用外部资源

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

## 7. 关键校验点

- `course_id`、`metadata.title`、`lesson_id`、`lesson.title`、`page_id`、`block.id`、`block.type` 必须合法
- block ID 在整个课程内必须唯一
- page ID 在同一课程内应保持唯一
- AI 生成完整课程时必须生成可播放的 lesson/page/block 结构，而不是只生成纯文本大纲
- 不支持的 block type 会被拒绝
- 发布/导出阶段会执行更严格校验

## 8. 导入建议

1. 修改已有导出文件时尽量保持 ID 稳定
2. 优先使用规范键和规范 block type
3. 历史 JSON 可以直接导入，由迁移器自动归一化
4. 导入失败时按报错中的字段路径逐项修复
