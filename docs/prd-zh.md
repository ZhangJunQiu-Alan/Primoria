# STEM 课程构建器 - 产品规划文档

> 模块化课程创作工具 | UGC 驱动的 STEM 学习平台

---

## 1. 项目概览

### 1.1 产品定位
这是一个面向 STEM 教育的 **UGC 课程创作平台**。用户可通过拖拽模块快速搭建互动课程，目标体验对标 Brilliant。

### 1.2 核心价值
- **创作者**：零代码创建专业互动课程
- **学习者**：获得接近 Brilliant 的互动学习体验
- **平台**：通过 UGC 模式快速扩展 STEM 内容供给

### 1.3 上线策略
| 阶段 | 内容方向 | 目标 |
|------|----------|------|
| Phase 1 | Python 编程 | 验证产品闭环 + 积累种子用户 |
| Phase 2 | 数学 + 物理 | 扩展核心 STEM 学科 |
| Phase 3 | 全 STEM | 开放更多学科方向 |

---

## 2. 系统架构

### 2.1 总体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (Flutter Web)                     │
├─────────────────────┬───────────────────────┬───────────────────┤
│    Course Builder   │     Course Viewer     │    User Portal    │
│       (Editor)      │      (Renderer)       │   (User Center)   │
└─────────┬───────────┴───────────┬───────────┴─────────┬─────────┘
          │                       │                     │
          ▼                       ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    JSON Schema (Data Layer)                     │
│        Course structure / module definitions / animation config │
│                           / user data                           │
└─────────────────────────────────────────────────────────────────┘
          │                       │                     │
          ▼                       ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend Services                         │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  User Auth Svc   │  Course Storage │          Other Svc          │
│ (Auth Service)   │ (Course Service)|            (TBD)            │
└─────────────────┴─────────────────┴─────────────────────────────┘
          │                       │                     │
          ▼                       ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Infrastructure                           │
│         PostgreSQL / Redis / Object Storage / WebSocket         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 技术栈

| 层级 | 选型 | 选型原因 |
|------|----------|------|
| **前端框架** | Flutter Web | Builder/Viewer 渲染统一，团队已有经验 |
| **状态管理** | Riverpod / Bloc | Flutter 生态成熟，便于扩展 |
| **动画引擎** | Flutter CustomPainter + AnimationController | 原生性能高、可控性强 |
| **拖拽实现** | flutter_draggable_gridview | 模块化拖拽落地快 |
| **后端框架** | Node.js | 迭代快，生态丰富 |
| **数据库** | PostgreSQL | 关系能力强，JSON 支持好 |
| **对象存储** | S3 / OSS / MinIO | 媒体资源存储 |

---

## 3. Course Builder（编辑器）

### 3.1 核心能力

```
┌─────────────────────────────────────────────────────────────────┐
│  Course Builder UI                                              │
├──────────────┬──────────────────────────────┬───────────────────┤
│              │                              │                   │
│  Module Panel│         Canvas Area          │   Properties      │
│              │                              │      Panel        │
│  ┌────────┐  │   ┌──────────────────────┐   │  ┌─────────────┐  │
│  │ Text   │  │   │                      │   │  │ Module Props│  │
│  ├────────┤  │   │   [Dropped Module]   │   │  ├─────────────┤  │
│  │ Image  │  │   │                      │   │  │ Style        │  │
│  ├────────┤  │   │   [Interactive Anim] │   │  ├─────────────┤  │
│  │ Code   │  │   │                      │   │  │ Anim Params  │  │
│  ├────────┤  │   │   [Quiz Module]      │   │  ├─────────────┤  │
│  │ Anim   │  │   │                      │   │  │ Interaction  │  │
│  ├────────┤  │   └──────────────────────┘   │  └─────────────┘  │
│  │ Quiz   │  │                              │                   │
│  ├────────┤  │                              │                   │
│  │ Fill-in│  │                              │                   │
│  ├────────┤  │                              │                   │
│  │ Connect│  │                              │                   │
│  └────────┘  │                              │                   │
│              │                              │                   │
└──────────────┴──────────────────────────────┴───────────────────┘
│  [Preview]  [Save]  [Export JSON]  [Publish]                    │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 模块类型定义

#### 基础模块（MVP）

| 模块类型 | 说明 | 优先级 |
|----------|----------|--------|
| `text` | 富文本 / Markdown | P0 |
| `image` | 图片展示 | P0 |
| `code-block` | 代码展示 + 语法高亮 | P0（Python 课程必需） |
| `code-playground` | 可运行代码编辑器 | P0（Python 课程核心） |
| `multiple-choice` | 单选/多选题 | P0 |
| `fill-blank` | 填空题 | P1 |
| `video` | 视频嵌入 | P1 |

#### 交互动效模块（Phase 2）

| 模块类型 | 说明 | 示例 |
|----------|----------|------|
| `function-flow` | 函数块连接关系 | 可视化 Python 函数调用 |
| `data-structure` | 数据结构可视化 | 交互式 list/dict/tree 展示 |
| `code-execution` | 代码执行动画 | 逐行执行 + 变量状态演示 |
| `geometry` | 几何交互 | 点线面拖拽 |
| `graph-plot` | 函数图像 | 参数可调的曲线演示 |
| `custom-canvas` | 自定义画布 | 用户用代码定义动画 |

### 3.3 拖拽交互设计

```dart
// Flutter drag-and-drop sketch
class BuilderCanvas extends StatefulWidget {
  @override
  _BuilderCanvasState createState() => _BuilderCanvasState();
}

class _BuilderCanvasState extends State<BuilderCanvas> {
  List<BlockData> blocks = [];

  @override
  Widget build(BuildContext context) {
    return DragTarget<BlockType>(
      onAccept: (blockType) {
        setState(() {
          blocks.add(BlockData(
            id: generateId(),
            type: blockType,
            position: currentDropPosition,
          ));
        });
      },
      builder: (context, candidateData, rejectedData) {
        return Stack(
          children: blocks.map((block) =>
            Positioned(
              left: block.position.x,
              top: block.position.y,
              child: DraggableBlock(
                data: block,
                onDragEnd: (newPosition) => updateBlockPosition(block.id, newPosition),
              ),
            )
          ).toList(),
        );
      },
    );
  }
}
```

---

## 4. 交互动画系统

### 4.1 动画架构

```
┌─────────────────────────────────────────────────────────────────┐
│                       Animation System                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │  Presets    │    │ Parameters  │    │ User Scripts        │  │
│  │ (Templates) │    │ (Params)    │    │ (Custom Script)     │  │
│  └──────┬──────┘    └──────┬──────┘    └──────────┬──────────┘  │
│         │                  │                      │             │
│         ▼                  ▼                      ▼             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Animation Renderer (CustomPainter)             ││
│  │                                                             ││
│  │  - Vector drawing (Path, Canvas API)                        ││
│  │  - Gesture handling (GestureDetector)                       ││
│  │  - Animation control (AnimationController, Tween)           ││
│  │  - State binding (data binding)                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Flutter 动画实现示例

```dart
// Example: draggable function block connection animation
class FunctionFlowAnimation extends StatefulWidget {
  final FunctionFlowConfig config;

  @override
  _FunctionFlowAnimationState createState() => _FunctionFlowAnimationState();
}

class _FunctionFlowAnimationState extends State<FunctionFlowAnimation>
    with TickerProviderStateMixin {

  late AnimationController _controller;
  List<FunctionBlock> blocks = [];
  List<Connection> connections = [];

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: Duration(milliseconds: 300),
      vsync: this,
    );
    _initializeFromConfig();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onPanUpdate: _handleDrag,
      onTapUp: _handleTap,
      child: CustomPaint(
        painter: FunctionFlowPainter(
          blocks: blocks,
          connections: connections,
          animation: _controller,
        ),
        size: Size.infinite,
      ),
    );
  }

  void _handleTap(TapUpDetails details) {
    // Detect tapped block, create connection
    final tappedBlock = _findBlockAt(details.localPosition);
    if (tappedBlock != null) {
      _startConnection(tappedBlock);
    }
  }
}

// CustomPainter draws connections
class FunctionFlowPainter extends CustomPainter {
  final List<FunctionBlock> blocks;
  final List<Connection> connections;

  @override
  void paint(Canvas canvas, Size size) {
    // Draw connections (Bezier curves)
    for (final conn in connections) {
      final path = Path();
      path.moveTo(conn.start.dx, conn.start.dy);
      path.cubicTo(
        conn.start.dx + 50, conn.start.dy,
        conn.end.dx - 50, conn.end.dy,
        conn.end.dx, conn.end.dy,
      );
      canvas.drawPath(path, connectionPaint);
    }

    // Draw blocks
    for (final block in blocks) {
      _drawRoundedBlock(canvas, block);
    }
  }

  void _drawRoundedBlock(Canvas canvas, FunctionBlock block) {
    final rrect = RRect.fromRectAndRadius(
      block.rect,
      Radius.circular(12),
    );
    canvas.drawRRect(rrect, blockPaint);
    // Draw text...
  }
}
```

### 4.3 用户自定义动画（高级）

**策略：提供可视化脚本编辑器 + Dart 沙箱执行环境**

```dart
// JSON description of a user custom animation
{
  "type": "custom-animation",
  "id": "my-custom-viz",
  "script": {
    "elements": [
      {
        "id": "circle1",
        "shape": "circle",
        "position": { "x": 100, "y": 100 },
        "radius": 30,
        "color": "primary.500",
        "draggable": true
      },
      {
        "id": "label1",
        "shape": "text",
        "text": "Drag me",
        "bindTo": "circle1"  // follow circle1
      }
    ],
    "interactions": [
      {
        "trigger": "drag",
        "target": "circle1",
        "action": "updatePosition",
        "constraints": { "minX": 0, "maxX": 300 }
      }
    ],
    "animations": [
      {
        "trigger": "onDragEnd",
        "target": "circle1",
        "type": "spring",
        "to": { "x": 150 }  // spring back to center
      }
    ]
  }
}
```

### 4.4 Python 课程专属动效组件

| 组件 | 作用 | 交互方式 |
|------|------|----------|
| `CodeExecutionViz` | 代码逐行执行可视化 | 播放 / 暂停 / 单步 |
| `VariableInspector` | 变量状态实时展示 | 自动更新 |
| `CallStackViz` | 函数调用栈展示 | 展开 / 收起 |
| `DataStructureViz` | list/dict/set 可视化 | 点击查看细节 |
| `FlowchartViz` | 流程图交互 | 高亮当前路径 |
| `MemoryModelViz` | 内存模型可视化 | 引用连线展示 |

---

## 5. JSON Schema

完整 Course JSON 编写规范见 **`course-json-guide.md`**。

摘要：数据结构是 `Course → Pages → Blocks`。MVP block 类型包括 `text`、`image`、`codeBlock`、`codePlayground`、`multipleChoice`、`fillBlank`、`video`；Phase 2 增加 `function-flow`、`data-structure`、`code-execution`、`geometry`、`graph-plot`、`custom-canvas`。

---

## 6. 后端服务设计

### 6.1 服务架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────────────┐
│  Auth Service │   │ Course Service│   │ Collaboration Service │
├───────────────┤   ├───────────────┤   ├───────────────────────┤
│ - User signup │   │ - Course CRUD │   │ - Realtime sync       │
│ - Login       │   │ - Versioning  │   │ - Conflict resolution │
│ - OAuth       │   │ - Publish/rev │   │ - Operation history   │
│ - Permissions │   │              │   │                       │
└───────┬───────┘   └───────┬───────┘   └───────────┬───────────┘
        │                   │                       │
        ▼                   ▼                       ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────────────┐
│   PostgreSQL  │   │ Object Storage│   │    Redis + WebSocket  │
│  (User Data)  │   │  (Media Assets)│  │    (Realtime Comms)   │
└───────────────┘   └───────────────┘   └───────────────────────┘
```

### 6.2 核心 API

```yaml
# Auth Service
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/oauth/{provider}
GET    /api/v1/users/me

# Course Service
GET    /api/v1/courses                    # 课程列表
POST   /api/v1/courses                    # 创建课程
GET    /api/v1/courses/{id}               # 获取课程详情
PUT    /api/v1/courses/{id}               # 更新课程
DELETE /api/v1/courses/{id}               # 删除课程
GET    /api/v1/courses/{id}/versions      # 版本历史
POST   /api/v1/courses/{id}/publish       # 发布课程
GET    /api/v1/courses/{id}/export        # 导出 JSON
```

---

## 7. 开发路线图

### Phase 1：MVP（核心闭环）

**目标**：验证产品概念，打通 Builder -> JSON -> Viewer 闭环。

```
Week 1-2: Project initialization
├── Flutter Web setup
├── State management architecture (Riverpod/Bloc)
├── Design System base components
└── JSON Schema definition

Week 3-4: Builder foundation
├── Canvas area
├── Module panel (text, image, code)
├── Drag-and-drop placement
├── Properties panel basics
└── JSON export

Week 5-6: Question modules
├── Multiple choice module
├── Fill-in-the-blank module
├── Answer validation logic
└── Viewer basic rendering

Week 7-8: Code Playground
├── Code editor integration (code_text_field or custom)
├── Python backend execution service
├── Output display
└── Error messages

Week 9-10: Backend MVP
├── User auth service
├── Course CRUD API
├── Cloud storage integration
└── Basic access control

Week 11-12: Polish & testing
├── UX improvements
├── Bug fixes
├── Performance optimization
└── Internal testing
```

**MVP 交付物：**
- 可拖拽 Builder（5 类基础模块）
- Code Playground（可运行 Python）
- JSON 导入/导出
- Viewer 完整渲染
- 用户账号系统
- 云端保存

---

### Phase 2：交互动画

**目标**：提供对标 Brilliant 的交互动画体验。

```
Week 1-4: Animation engine
├── CustomPainter framework
├── Gesture interaction system
├── Animation state management
└── Preset animation library

Week 5-8: Python-specific components
├── Code execution visualization
├── Variable state display
├── Data structure visualization
├── Function call flowchart
└── Function block connection component

Week 9-12: Animation editor
├── Animation parameter panel
├── Preview
├── Animation templates library
└── Simple script configuration
```

---

### Phase 3：开放平台

```
Month 1: User customization
├── Custom animation scripts
├── Component template system
├── Component marketplace (optional)
└── Plugin API

Month 2: Platform features
├── Course publish / review flow
├── Course discovery / recommendation
├── Learning progress tracking
├── Analytics dashboard
└── Creator incentive system
```

---

## 8. 关键技术决策

| 决策项 | 选型 | 原因 | 备选方案 |
|--------|------|------|----------|
| 前端框架 | Flutter Web | 渲染统一、团队熟悉、动画能力强 | React + Canvas |
| 动画方案 | CustomPainter | 原生性能好、自由度高 | Rive、Lottie |
| 拖拽实现 | Custom + GestureDetector | 灵活，可深度定制 | flutter_draggable |
| 状态管理 | Riverpod | 简洁、可测试性好 | Bloc、GetX |
| 代码编辑器 | code_text_field | 轻量、可定制 | CodeMirror（WebView） |
| JSON 校验 | json_schema | 标准化、跨平台 | 手写校验 |

---

## 9. 风险与应对

| 风险 | 影响 | 应对策略 |
|------|------|----------|
| Flutter Web 性能瓶颈 | 复杂动画掉帧 | 使用 CanvasKit 渲染器 + 持续性能监控 |
| 代码执行安全风险 | Python 代码可能被滥用 | 沙箱隔离、资源限流、代码审计 |
| JSON Schema 演进兼容 | 老版本文件不兼容 | 版本化 + 自动迁移脚本 |
| UGC 内容质量参差 | 低质量课程涌入 | 审核机制、用户评分、推荐算法 |

---

## 10. 参考资料

### Flutter
- [Flutter CustomPainter Docs](https://api.flutter.dev/flutter/rendering/CustomPainter-class.html)
- [Flutter Animation Guide](https://docs.flutter.dev/ui/animations)
- [Riverpod Docs](https://riverpod.dev/)

### 动画参考
- [Brilliant](https://brilliant.org/) - 交互体验对标
- [Manim Community](https://www.manim.community/) - 数学动画参考
- [Motion Canvas](https://motioncanvas.io/) - 可编程动画参考

### 同类产品
- [Notion](https://notion.so) - 模块化编辑器参考
- [Articulate Rise](https://articulate.com/360/rise) - 课程构建器参考
- [Observable](https://observablehq.com/) - 交互文档参考

---

## 附录：设计稿参考

### Builder UI 草图

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Logo    Course Name: Python Intro ▼     [Preview] [Save] [Export] [Publish] │
├─────────┬───────────────────────────────────────────────────┬───────────┤
│         │                                                   │           │
│  Module │              Page 1: What is a variable?          │  Props    │
│  Library│                                                   │           │
│ ┌─────┐ │  ┌─────────────────────────────────────────────┐  │  Selected │
│ │ Aa  │ │  │  ## What is a variable?                     │  │  ──────── │
│ │Text │ │  │  A variable is like a box that stores data...│  │  Type:Text│
│ └─────┘ │  └─────────────────────────────────────────────┘  │           │
│ ┌─────┐ │                                                   │  Font: 16 │
│ │ 🖼  │ │  ┌─────────────────────────────────────────────┐  │  Align: L │
│ │Image│ │  │  name = "Alice"                              │  │           │
│ └─────┘ │  │  print(f"Hello, {name}!")                   │  │  Spacing: md │
│ ┌─────┐ │  │                              [▶ Run]        │  │           │
│ │ </> │ │  └─────────────────────────────────────────────┘  │           │
│ │Code │ │                                                   │           │
│ └─────┘ │  ┌─────────────────────────────────────────────┐  │           │
│ ┌─────┐ │  │  (?) Which is a valid variable name?        │  │           │
│ │ ✓   │ │  │                                             │  │           │
│ │Quiz │ │  │  ○ my_variable                              │  │           │
│ └─────┘ │  │  ○ 2nd_var                                  │  │           │
│ ┌─────┐ │  │  ○ my-var                                   │  │           │
│ │ ___ │ │  └─────────────────────────────────────────────┘  │           │
│ │Fill │ │                                                   │           │
│ └─────┘ │                                                   │           │
│ ┌─────┐ │                                                   │           │
│ │ ⚡  │ │                                                   │           │
│ │Anim │ │                                                   │           │
│ └─────┘ │                                                   │           │
│         │                                                   │           │
├─────────┴───────────────────────────────────────────────────┴───────────┤
│  Pages: [1] [2] [3] [+]                                                │
└─────────────────────────────────────────────────────────────────────────┘
```
