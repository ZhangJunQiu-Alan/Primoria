# STEM Course Builder - Product Planning Document

> Modular course authoring tool | UGC-driven STEM learning platform

---

## 1. Project Overview

### 1.1 Product Positioning
A **UGC course authoring platform** for STEM education. Users can build interactive learning courses by dragging modules, aiming for a Brilliant-level interactive experience.

### 1.2 Core Value
- **Creators**: build professional interactive courses with zero code
- **Learners**: get a Brilliant-level interactive learning experience
- **Platform**: expand STEM content quickly with a UGC model

### 1.3 Launch Strategy
| Phase | Content Area | Goal |
|------|----------|------|
| Phase 1 | Python programming | Validate the product + build a seed user base |
| Phase 2 | Math + Physics | Expand core STEM subjects |
| Phase 3 | All STEM | Open more subject areas |

---

## 2. System Architecture

### 2.1 Overall Architecture

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

### 2.2 Tech Stack

| Layer | Choice | Rationale |
|------|----------|------|
| **Frontend framework** | Flutter Web | Unified Builder/Viewer rendering, team experience |
| **State management** | Riverpod / Bloc | Mature Flutter ecosystem options |
| **Animation engine** | Flutter CustomPainter + AnimationController | Native high performance |
| **Drag-and-drop** | flutter_draggable_gridview | Modular drag-and-drop |
| **Backend language/runtime** | TypeScript + Deno (Supabase Edge Functions) | Unified TS stack with serverless operations and edge deployment |
| **Database** | PostgreSQL | Relational, strong JSON support |
| **Object storage** | S3 / OSS / MinIO | Media asset storage |

---

## 3. Course Builder (Editor)

### 3.1 Core Features

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
│  │        │  │                              │                   │
│  └────────┘  │                              │                   │
│              │                              │                   │
└──────────────┴──────────────────────────────┴───────────────────┘
│  [Preview]  [Save]  [Export JSON]  [Publish]                    │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Module Type Definitions

#### Basic Modules (MVP)

| Module Type | Description | Priority |
|----------|----------|--------|
| `text` | Rich text / Markdown | P0 |
| `image` | Image display | P0 |
| `code-block` | Code display + syntax highlighting | P0 (required for Python courses) |
| `code-playground` | Runnable code editor | P0 (core for Python courses) |
| `multiple-choice` | Single/multiple choice questions | P0 |
| `fill-blank` | Fill-in-the-blank questions | P1 |

#### Interactive Animation Modules (Phase 2)

| Module Type | Description | Example |
|----------|----------|------|
| `function-flow` | Function block connections | Visualize Python function calls |
| `data-structure` | Data structure visualization | Interactive list/dict/tree views |
| `code-execution` | Code execution animation | Line-by-line execution + variable states |
| `geometry` | Geometry interactions | Draggable points, lines, planes |
| `graph-plot` | Function plots | Curves with adjustable parameters |
| `custom-canvas` | User-defined canvas | Users create animations via code |

### 3.3 Drag-and-Drop Interaction Design

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

## 4. Interactive Animation System

### 4.1 Animation Architecture

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

### 4.2 Flutter Animation Implementation

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

### 4.3 User Custom Animations (Advanced)

**Strategy: provide a visual script editor + Dart sandbox**

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

### 4.4 Python Course-Specific Animation Components

| Component | Function | Interaction |
|------|------|----------|
| `CodeExecutionViz` | Line-by-line code execution visualization | Play/pause/step |
| `VariableInspector` | Real-time variable state display | Auto update |
| `CallStackViz` | Function call stack visualization | Expand/collapse |
| `DataStructureViz` | List/dict/set visualization | Click to view details |
| `FlowchartViz` | Flowchart interaction | Highlight current path |
| `MemoryModelViz` | Memory model visualization | Reference line connections |

---

## 5. JSON Schema

See **`course-json-guide.md`** for the full Course JSON authoring guide with examples.

Summary: `Course → Pages → Blocks`. MVP block types in current Builder UI: text, image, codeBlock, codePlayground, multipleChoice, fillBlank. Phase 2 types: function-flow, data-structure, code-execution, geometry, graph-plot, custom-canvas.

---

## 6. Backend Service Design

### 6.1 Service Architecture

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

### 6.2 Core APIs

```yaml
# Auth Service
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/oauth/{provider}
GET    /api/v1/users/me

# Course Service
GET    /api/v1/courses                    # Course list
POST   /api/v1/courses                    # Create course
GET    /api/v1/courses/{id}               # Get course
PUT    /api/v1/courses/{id}               # Update course
DELETE /api/v1/courses/{id}               # Delete course
GET    /api/v1/courses/{id}/versions      # Version history
POST   /api/v1/courses/{id}/publish       # Publish course
GET    /api/v1/courses/{id}/export        # Export JSON
```

---

## 7. Development Roadmap

### Phase 1: MVP (Core Loop)

**Goal**: validate the product concept and complete the Builder -> JSON -> Viewer loop

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
├── TypeScript (Deno) execution service
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

**MVP deliverables**:
- Drag-and-drop Builder (5 basic modules)
- Code Playground (runnable Python)
- JSON export/import
- Full Viewer rendering
- User account system
- Cloud save

---

### Phase 2: Interactive Animations

**Goal**: deliver Brilliant-level interactive animation experience

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

### Phase 3: Open Platform

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

## 8. Key Technical Decisions

| Decision | Choice | Rationale | Alternatives |
|--------|------|------|----------|
| Frontend framework | Flutter Web | Unified rendering, team experience, strong animation | React + Canvas |
| Animation approach | CustomPainter | Native performance, full control | Rive, Lottie |
| Drag-and-drop | Custom + GestureDetector | Flexible | flutter_draggable |
| State management | Riverpod | Simple, test-friendly | Bloc, GetX |
| Code editor | code_text_field | Lightweight, customizable | CodeMirror (WebView) |
| JSON validation | json_schema | Standard, cross-platform | Custom validation |

---

## 9. Risks and Mitigation

| Risk | Impact | Mitigation |
|------|------|----------|
| Flutter Web performance | Complex animations lag | Use CanvasKit renderer, performance monitoring |
| Code execution safety | Python code could be harmful | Sandbox isolation, resource limits, code review |
| JSON Schema evolution | Old versions incompatible | Versioning + migration scripts |
| UGC content quality | Low-quality courses flood | Review mechanism, user ratings, recommendation algorithm |

---

## 10. References

### Flutter
- [Flutter CustomPainter Docs](https://api.flutter.dev/flutter/rendering/CustomPainter-class.html)
- [Flutter Animation Guide](https://docs.flutter.dev/ui/animations)
- [Riverpod Docs](https://riverpod.dev/)

### Animation References
- [Brilliant](https://brilliant.org/) - interaction benchmark
- [Manim Community](https://www.manim.community/) - math animation reference
- [Motion Canvas](https://motioncanvas.io/) - programmable animation

### Similar Products
- [Notion](https://notion.so) - modular editor reference
- [Articulate Rise](https://articulate.com/360/rise) - course builder reference
- [Observable](https://observablehq.com/) - interactive documents

---

## Appendix: Design Mock References

### Builder UI Sketch

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
