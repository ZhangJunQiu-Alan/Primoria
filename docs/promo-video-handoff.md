# Primoria 答辩宣传片（Remotion）：Codex 执行手册

> 交给 Codex 逐步执行。分镜、镜头语法、旁白已与用户定稿（2026-10-29）。
> 标了 **【检查点】** 的地方必须停下来，把渲染结果交给用户看，得到确认后再继续。
> 标了 **【需用户确认】** 的事项涉及花钱或用户素材，不得自行决定。

## 0. 目标和边界

**用途**：答辩总时长 10 分钟。先播放本片，然后用户用 PPT 讲解。本片只负责情绪和产品体验，架构等技术细节全部留给 PPT（时长已从 2:30 压到 1:30，原来的爆炸视图镜头已删除）。

**成片规格**：

| 项 | 值 |
| --- | --- |
| 时长 | 目标 1:30，可接受 1:25–1:35 |
| 画面 | 1920×1080，30fps，H.264 MP4（CRF ≤ 16），AAC 48kHz |
| 语言 | 全英文：旁白、字卡、UI 文案、字幕 |
| 字幕 | 默认烧录英文字幕（答辩厅音响不可靠），通过 prop 可关 |
| 风格 | 带电影感的产品动效：动的是 3D 空间里的摄像机，UI 本身不乱动 |

**这次不做**：竖屏版、中文版、真实产品录屏（留了可选插槽，见 §9）、商业配乐选曲。

**必须遵守**：

- 工程放在仓库根目录 `promo/`，**独立项目，不加入 `pnpm-workspace.yaml`**（否则 Remotion 依赖会进主 lockfile、`audit:prod` 和 Docker 镜像）。在 `promo/` 里用 `pnpm install --ignore-workspace` 安装，生成它自己的 `promo/pnpm-lock.yaml`。
- 在 `.dockerignore` 加一行 `promo`；在 `.gitignore` 加 `promo/out/`。
- `promo/` 不 import `apps/web` 的任何代码。品牌配色、Logo 复制进来（见 §3）。
- 不调用付费 TTS、LLM、图片 API。临时旁白用 macOS `say` 生成（§7）。
- 不 commit、不 push，除非用户明确要求。
- 片中出现的任何数字和功能必须是产品真实具备的（§8 校验脚本）。不编造用户数、准确率、满意度等指标。
- Remotion 许可：个人和 ≤3 人团队免费；如用户以公司名义使用需另行确认，写进 `promo/README.md`。

## 1. 创意概念：「一滴墨」

一个问题落在纸上，像一滴墨晕开 → 墨沿着先修关系倒流，长成知识图谱 → 图谱收成一条学习路径 → 路径变成课 → 结尾所有节点汇聚成 Primoria 标志。

电影感来自镜头运动、景深、光线和胶片质感，而不是霓虹粒子和渐变。纸、墨、松绿、赭石就是现有品牌色。用户明确不喜欢"AI 味"：不用装饰性渐变、emoji、胶囊按钮、Inter 字体、紫蓝色光效。

## 2. 镜头语法（全片硬性规则）

| 维度 | 规则 |
| --- | --- |
| 空间 | 所有 UI 都是 3D 空间里的纸面平面，摄像机在动。"静止"镜头也保持缓推：每秒 scale +1.5% 左右 |
| 景别 | 每幕走一遍：远景（整张图）→ 中景（一张卡）→ 特写（一个滑块、一个对勾） |
| 景深 | 每层按与焦平面的距离加模糊：`blur = clamp(|depth − focusDepth| × k, 0, 12px)`。用移焦（rack focus）引导视线，不用箭头和高亮框 |
| 转场 | 只用三种：① 形状匹配剪辑 ② 带运动模糊的甩镜（只在第四幕）③ 墨迹溶解（换幕）。禁止默认 fade/slide/wipe |
| 画幅 | 开场 2.39:1 遮幅 + 冷灰去饱和；S03 产品出现时黑边退开到 16:9、色温转暖；S16 黑边合回 2.39:1，首尾呼应 |
| 节奏 | 第一幕每镜 4–6 秒；第四幕 0.6–1.2 秒踩拍快切；结尾长停 3 秒 |
| 字卡 | 衬线大字（Newsreader），逐行遮罩揭示，每张 ≤ 6 个英文单词，全片 ≤ 2 张（S02 一张、S16 标语一张）。字卡不复述旁白原文 |
| 标签 | 数据标签用 Geist Mono 全大写、字距 0.08em，例如 `CONCEPT FRONTIER` |
| 缓动 | 摄像机统一用 `Easing.bezier(0.83, 0, 0.17, 1)`；UI 元素用 `spring({damping: 200})`，不回弹；全片只有"答对"那一下允许过冲 |
| 质感 | 3% 胶片颗粒 + 25% 暗角 + 纸张纹理全程叠加；扫光全片只出现两次（S07 结尾、S16 Logo） |
| 调色 | 第一幕：`saturate(0.15) brightness(0.9)` + 20% 冷色 `#1a2230` 叠加；其余：暖纸色，不额外调色 |

## 3. 视觉资产与真实数据

**配色**：从 `apps/web/src/components/landing/landing-palette.ts` 复制到 `promo/src/theme/tokens.ts`。核心色：

```
paper #F6F3EC   panel #FFFEFB   ink #1A1814    muted #6B655C   lineSoft #ECE6DA
pine  #1E4D40   pineTint #E3ECE6 amber #C8881A amberTint #FBEED3
correct #2E7D4F wrong #C2452F   lavender #6A55C4 coral #D9603F
```

**字体**（与产品 `apps/web/src/app/layout.tsx` 一致）：Newsreader（标题，可用 italic）、Geist（正文、字幕）、Geist Mono（标签）。用 `@remotion/google-fonts` 加载；若该版本缺 Geist，就把字体文件放进 `promo/public/fonts/`，用 `@font-face` + `delayRender` 加载。

**Logo**：复制 `apps/web/public/brand/primoria-mark.svg`。它由三个面组成（两块松绿、一块赭石），S16 的汇聚动画要落到这三个面上。

**UI 外观参照**（重建"电影版"组件前先读这些文件，保证和真实产品长得一样）：

| 片中画面 | 参照代码 |
| --- | --- |
| 首页输入框（"What do you want to learn today?"） | `apps/web/src/components/tutor/tutor-workspace-client.tsx`、`home-summary.tsx`；文案见 `apps/web/src/lib/i18n/dictionaries.ts` 英文段 |
| 课程大纲 | `apps/web/src/components/course/course-outline-view.tsx` |
| 分步阅读卡、代码块 | `course-detail-client.tsx`、`block-renderer.tsx`、`code-block-view.tsx` |
| Tutor 侧栏 | `course-ai-assistant-panel.tsx`、`apps/web/src/components/tutor/copilot-chat-surface.tsx` |
| 交互组件 | `apps/web/src/components/generative-ui/interactive/`，目录 `data/visualization-components/catalog.v1.json` |
| 资料与文件夹 | `apps/web/src/components/materials/` |
| 掌握度、测验 | `apps/web/src/components/profile/`、`apps/web/src/components/materials/folder-quiz.tsx` |

电影版组件只复刻外观，不搬逻辑。所有可见状态都由 `useCurrentFrame()` 驱动。

**英雄图谱的真实数据**（第三幕）：学习目标是 *"I want to understand how Transformers work."* 。`dl_transformer` 的先修闭包取自真实 KG 源文件，共 11 个概念，跨 2 张图：

```
Deep Learning:  Perceptron → Multilayer Perceptron, Recurrent Neural Networks → Attention Mechanism
                → Self-Attention → Multi-Head Attention, Positional Encoding → Transformer Architecture
Linear Algebra: Vectors and Linear Combinations → Elimination with Matrices → Matrix Operations and Inverses
```

片中设定：学习者已掌握 Vectors、Elimination、Matrix Operations、Perceptron（灰掉、打勾、跳过），剩下 7 个概念组成 3 节课（每节 2–3 个概念）。

`promo/scripts/export-graph.mjs` 负责：
1. 读取 `data/knowledge-graphs/source/{deep_learning,linear_algebra}.json` 和 `cross_subject_edges.json`。
2. 计算 `dl_transformer` 的 prereq 闭包，节点名直接用源文件的 `name`。同时导出整张 deep_learning 图的其余概念，作为远景里的淡色背景。
3. 用确定性的分层布局（最长路径分层 + 层内按 `default_order` 排序），不用力导向模拟。每层赋一个 z 深度，供 3D 环绕使用。
4. 课时分组：先尝试在 `apps/web` 环境里用 `tsx` 调用真实的 `buildConceptFrontierOutline`（`apps/web/src/lib/knowledge-graph/concept-frontier.ts`），mastered 集合就是上面 4 个概念。如果因为跨图边或依赖问题跑不通，就按拓扑序加 `default_order` 每 2–3 个分一组，并在 `promo/README.md` 注明"分组为示意"。
5. 输出 `promo/src/data/graph.json` 和 `lessons.json`，结果提交进 `promo/`，渲染时不读仓库其他目录。

## 4. 分镜表（16 镜，时间为目标值）

实际时长由旁白长度驱动（§6），下表是最短时长和意图。90 秒里每一秒都要有用：宁可删镜头，也不要把镜头压到看不清。

### 第一幕 · NOISE（0:00–0:10）

| # | 时间 | 镜头/运动 | 画面 | 旁白 |
| --- | --- | --- | --- | --- |
| S01 | 0:00–0:06 | 2.39:1 遮幅，先微距缓推，再沿 z 轴加速穿越 | 冷灰色里，虚焦的 PDF 页、浏览器标签、视频进度条、荧光笔段落、通知气泡在不同深度漂浮；后半段镜头穿过碎片，碎片带运动模糊擦过 | VO01 |
| S02 | 0:06–0:10 | 定格后抽空 | 碎片冻结、坠落、褪进黑暗，只剩画面中央一个闪烁光标。字卡 *"Where do I start?"*，之后静音 0.5 秒 | VO02 |

### 第二幕 · ONE QUESTION（0:10–0:17）

| # | 时间 | 镜头/运动 | 画面 | 旁白 |
| --- | --- | --- | --- | --- |
| S03 | 0:10–0:15 | 匹配剪辑：同一个光标从微距拉到中景 | 光标原来在 Primoria 首页输入框里。黑边退开到 16:9，色温转暖纸色。打出 *"I want to understand how Transformers work."*（打字先慢后快），焦点移到发送键 | VO03 |
| S04 | 0:15–0:17 | 冲击帧 → 切顶拍 | 按下回车：2 帧 scale 1.03 + 亮度 1.15，配一记重音效。切顶拍：整句话收缩成一滴墨，落到纸上 | — |

### 第三幕 · THE MAP（0:17–0:40）英雄段，最重要

| # | 时间 | 镜头/运动 | 画面 | 旁白 |
| --- | --- | --- | --- | --- |
| S05 | 0:17–0:24 | 顶拍 | 墨滴落点就是 Transformer 节点。墨沿先修边倒流到 Vectors，墨流到哪里，节点就在哪里显影。墨跨进另一个区域时，标出 `LINEAR ALGEBRA`。远处淡淡浮现整张 deep learning 图 | VO04 |
| S06 | 0:24–0:31 | 从顶拍倾斜到约 50° 俯角，缓慢环绕 | 节点按层分到不同深度，景深出现，标签 `PREREQUISITE CLOSURE · 11 CONCEPTS · 2 GRAPHS`。随后 4 个已掌握概念褪成灰色并打勾（`ALREADY MASTERED — SKIPPED`），前沿概念亮成松绿（`CONCEPT FRONTIER`） | VO05 |
| S07 | 0:31–0:36 | 跟拍线头 | 一条松绿线按学习顺序穿过 7 个概念，摄像机追着线头走。每点亮一个节点，响一个音高递增的轻音。抵达 Transformer 时扫光 #1 | — |
| S08 | 0:36–0:40 | 匹配剪辑 | 节点按课时 2/2/3 吸附成组，变成课程大纲里的 3 行课时；摄像机转到正对页面 | VO06 |

### 第四幕 · THE LESSON（0:40–1:05）踩拍蒙太奇

| # | 时间 | 镜头/运动 | 画面 | 旁白 |
| --- | --- | --- | --- | --- |
| S09 | 0:40–0:45 | 摄像机冲进第一行课时；4 个快切 + 甩镜 | Self-Attention 课时的分步阅读卡：讲解 → 类比（带插图）→ 代码块 → 微距按下 Run，输出 softmax 注意力权重 | VO07 |
| S10 | 0:45–0:51 | 微距 → 急速拉远 | 拖动交互组件 *Wave superposition* 的滑块，曲线实时变形；镜头急速拉远，这个组件缩成 49 块组件瓦片墙里的一块（真实目录名，跨物理、化学、数学、语文、音乐）。标签 `49 INTERACTIVE COMPONENTS` | VO08 |
| S11 | 0:51–0:58 | 三分屏 | 同一个问题 *"Why does attention divide by √d?"*，三个 Tutor 面板同时流式作答：SOCRATIC 反问引导、FEYNMAN 用类比、EUCLID 先定义再推导 | VO09 |
| S12 | 0:58–1:05 | 中景 + 插入镜头 | 测验选对（全片唯一一次过冲），掌握度环填满；角落小图谱里 Self-Attention 节点变成已掌握（呼应第三幕）。标签 `MASTERY · ≥3 ANSWERS · ≥80%` | VO10 |

### 第五幕 · YOUR MATERIALS（1:05–1:15）

| # | 时间 | 镜头/运动 | 画面 | 旁白 |
| --- | --- | --- | --- | --- |
| S13 | 1:05–1:10 | 顶拍，缓推 | Lecture 1–4 的 PDF 带阴影落到纸面，按讲次排开；每一讲长出一张小图谱，相同概念之间连线、合并，成为一张文件夹图谱 | VO11 |
| S14 | 1:10–1:15 | 移焦 | Tutor 回答里有一个引用标记 `Lecture 3 · p.12`；焦点从标记移到原文页，对应段落高亮 | VO12 |

### 第六幕 · CODA（1:15–1:30）

| # | 时间 | 镜头/运动 | 画面 | 旁白 |
| --- | --- | --- | --- | --- |
| S15 | 1:15–1:20 | 急速拉远 | 第三幕那张学习者图谱（Self-Attention 已点亮）缩成一簇亮点，周围是 31 张图谱组成的星群。标签 `31 KNOWLEDGE GRAPHS` | — |
| S16 | 1:20–1:30 | 匹配剪辑：汇聚 | 所有节点沿曲线汇聚，落成 Logo 的三个面；扫光 #2；黑边合回 2.39:1。出现字标 "Primoria" 和标语，停留 3 秒，随音乐尾音淡出到黑 | VO13 |

### 转场清单

| 位置 | 转场 |
| --- | --- |
| S02 → S03 | 匹配剪辑（同一个光标） |
| S04 → S05 | 连续镜头（墨滴落下即开始晕开） |
| S08 → S09 | 匹配剪辑（摄像机冲进课时行） |
| 第四幕内部 | 甩镜 + 运动模糊 |
| S12 → S13 | 墨迹溶解 |
| S14 → S15 | 墨迹溶解 |
| S15 → S16 | 匹配剪辑（节点汇聚成 Logo） |

## 5. 旁白稿（英文，定稿）

单一数据源：`promo/src/data/vo.ts`。每条旁白有 `id`、`text`、所属镜头 `shot`、在镜头内的起始偏移 `offsetFrames`，以及字幕分块 `captions[]`（每行 ≤ 42 字符，最多 2 行）。

| ID | 镜头 | 文本 |
| --- | --- | --- |
| VO01 | S01 | There has never been more to learn from. |
| VO02 | S02 | What's missing isn't information. It's a path. |
| VO03 | S03 | Primoria starts with a single question. |
| VO04 | S05 | It places your goal on a map of knowledge — where every concept knows what comes first. |
| VO05 | S06 | What you already know is skipped. |
| VO06 | S08 | What's left becomes a course built for one learner. |
| VO07 | S09 | Lessons move step by step — analogies, visuals, code you can run… |
| VO08 | S10 | …and forty-nine interactive models you can touch. |
| VO09 | S11 | Your tutor teaches the way you think. |
| VO10 | S12 | Mastery is earned, not assumed. |
| VO11 | S13 | Bring your own lectures — they become a map of your subject. |
| VO12 | S14 | And every answer shows its source. |
| VO13 | S16 | Primoria. Every question deserves a path. |

约 105 词，按每分钟 140 词计约 45 秒，其余时间留给无旁白的呼吸段（S04、S07、S15、结尾）。不要再往里加句子；如果正式旁白比临时旁白长，先删句子，不要加快语速。

**语气指示**（交给配音或 TTS）：低沉、平静、不推销，像纪录片旁白。句号后停 0.4 秒。VO13 的 "Primoria." 之后停 0.8 秒。

## 6. 工程结构与时间驱动

```
promo/
  package.json            独立项目；所有 remotion / @remotion/* 锁同一个精确版本（不用 ^）
  remotion.config.ts
  tsconfig.json           strict
  README.md               预览、渲染、换旁白、换音乐、许可说明、哪些是占位
  scripts/
    export-graph.mjs      KG 源 → src/data/graph.json、lessons.json
    scratch-vo.mjs        vo.ts → public/vo/VO01.wav…（macOS say）
    measure-vo.mjs        ffprobe 测每条旁白时长 → src/data/vo-durations.json
    check-claims.mjs      校验片中所有数字（§8）
  public/
    brand/primoria-mark.svg
    vo/                   临时旁白 → 之后替换为正式旁白，文件名不变
    music/score.mp3       【需用户确认】用户提供；缺失时静音
    sfx/                  音效（§7）
    footage/              可选真实录屏插槽（§9）
  src/
    index.ts  Root.tsx
    PromoFilm.tsx         主合成：TransitionSeries 串起 16 镜
    timeline.ts           唯一的时间表：镜头 id、最短帧数、旁白、转场、节拍
    theme/{tokens,fonts}.ts
    camera/               Camera3D 投影、相机关键帧、景深 helper、缓推
    fx/                   FilmGrain、Vignette、PaperTexture、Letterbox、LightSweep、
                          InkFlow、InkDissolve（自定义 transition presentation）、ImpactFrame、ColorGrade
    graph/                GraphScene、GraphNode、GraphEdge、PathDraw
    ui/                   电影版产品组件：Composer、OutlineList、StepCard、CodeBlock、
                          WaveWidget、ComponentWall、TutorPanel、QuizCard、MasteryRing、
                          MaterialPage、MiniGraph、CitationChip、Constellation
    shots/S01.tsx … S16.tsx
    captions/Captions.tsx
    data/{graph.json,lessons.json,vo.ts,vo-durations.json,components.json}
```

**合成（Compositions）**：

- `PromoFilm`：主片。props 用 zod 定义：`{ captions: boolean = true, music: boolean = true }`。
- `Act1` … `Act6`：每幕单独一个合成，方便快速预览。
- `Stills`：输出给 PPT 用的静帧（§10）。

**时间驱动规则**：

- `timeline.ts` 是唯一的时间来源。每镜的时长 = `max(最短帧数, 旁白偏移 + 旁白帧数 + 尾部留白 12 帧)`。旁白帧数读 `vo-durations.json`。主合成的 `durationInFrames` 在 `calculateMetadata` 里求和，扣掉转场重叠。
- 换正式旁白：替换 `public/vo/*.wav`，跑 `pnpm vo:measure`，全片自动重新排时间。
- 节拍：`timeline.ts` 里放 `BPM` 和 `beatOffsetFrames`（占位 100 BPM）。第四幕的快切点吸附到最近的节拍。用户提供配乐后只改这两个值。

**3D 实现**：

- 图谱和星群**手写透视投影**：`project(point3D, camera) → { x, y, scale, depth }`，然后用 2D 的 SVG（边）加 HTML（节点标签）渲染。原因是 CSS `preserve-3d` 画不了连接不同深度节点的边。不用 Three.js，因为文字在 three 里不够锐利。
- 单张 UI 平面（输入框、卡片、大纲）可以直接用 CSS `perspective` + `rotateX/Y` + `translateZ`。
- 景深：每个元素按投影后的 `depth` 算 `filter: blur()`。
- 运动模糊：甩镜用 `@remotion/motion-blur` 的 `CameraMotionBlur`，只包住第四幕的转场段（它很耗渲染时间）。

**墨的实现**：

- `InkFlow`：沿边方向，用 `@remotion/paths` 的 `evolvePath` 画描边；描边加 `feTurbulence` + `feDisplacementMap`（固定 seed）做出洇边，加 1px 模糊做渗透感。落点用若干圆的并集，加同样的位移滤镜，半径随帧增长。
- `InkDissolve`：给 `@remotion/transitions` 写一个自定义 presentation。用噪声阈值遮罩随 progress 推进，露出下一镜。

**确定性**（Remotion 硬性要求）：

- 所有动画只由 `useCurrentFrame()` 计算。禁止 CSS transition/animation、`Math.random()`、`Date`、`setTimeout` 驱动视觉。
- 随机一律用 remotion 的 `random(seed)`。胶片颗粒用 `feTurbulence`，seed 取 `frame % 24`。

## 7. 声音

| 层 | 规则 |
| --- | --- |
| 旁白 | 每条一个文件 `public/vo/VOxx.wav`，按 `timeline.ts` 放置 |
| 临时旁白 | `scratch-vo.mjs` 用 `say -v Samantha -r 165 -o VOxx.aiff`，再用 `ffmpeg` 转 48kHz wav。只用于定时间和预览 |
| 正式旁白 | 【需用户确认】用户自己录，还是用付费 TTS。用户批准前不得调用任何付费服务 |
| 音乐 | 【需用户确认】用户提供有授权的配乐。方向：极简钢琴 + 低频脉冲，90–110 BPM；第四幕推高，S16 收尾留尾音。缺失时 `music` 自动为静音 |
| 闪避 | 旁白期间音乐降 12dB，用 `<Audio volume={(f) => …}>` 做 6 帧的淡入淡出 |
| 音效 | 纸张翻动（S01–S02）、柔和键盘声（S03）、回车重音加低频和墨滴 "plip" 加混响（S04）、节点点亮的递增音高（S07）、甩镜 whoosh 和 Run 点击（第四幕）、答对轻响（S12）、纸张落下（S13）、Logo 低频上扬后静音（S16）。只用 CC0 或免版税素材，来源写进 README |

## 8. 真实性校验

`check-claims.mjs` 读取仓库真实数据，输出 `src/data/claims.json`，片中所有数字都从这里取：

| 声明 | 数据来源 | 当前值（2026-10-29 核对） |
| --- | --- | --- |
| 31 张知识图谱 | `data/knowledge-graphs/source/*.json` 中有 `nodes` 的文件数 | 31 |
| 49 个交互组件 | `data/visualization-components/catalog.v1.json` 的 `components.length` | 49 |
| 三种 Tutor 风格 | `packages/contracts/src/tutor-style.mjs` | socratic / feynman / euclid |
| 掌握门槛 | `CLAUDE.md`：至少 3 次结果且 ≥ 80% | — |
| 闭包 11 个概念、2 张图 | `export-graph.mjs` 输出 | 11 / 2 |

只要任一值与片中写死的文案对不上，脚本就以非零退出。`pnpm render` 先跑它。

## 9. 待用户决定的事项（Codex 先按默认值做）

| 事项 | 默认 |
| --- | --- |
| 正式旁白：本人录 / 付费 TTS | 先用 `say` 临时旁白 |
| 配乐 | 静音占位 + 节拍点击轨（仅预览用） |
| 标语 | "Every question deserves a path."（备选："From one question to understanding."） |
| 真实录屏 | 全部重建。S09 和 S11 留 `footage` 插槽：`public/footage/S09.mp4` 存在就用 `OffthreadVideo` 放进 3D 平面，不存在就用重建版 |

## 10. 执行阶段与检查点

**阶段 0：脚手架和动态分镜（animatic）**
- 初始化 `promo/`（Remotion 4 最新稳定版，所有包锁同一精确版本）。
- 完成 tokens、字体、`timeline.ts`、胶片质感层、Letterbox、Camera3D、字幕、临时旁白和测量脚本。
- 16 镜先用占位画面：纸色底 + 镜头号 + 一句画面描述，加上正确的遮幅、时长和旁白。
- 以 0.5 倍分辨率渲染全片 animatic。
- **【检查点】** 交给用户看节奏和旁白时间。

**阶段 1：第三幕（英雄段）**
- `export-graph.mjs`、GraphScene、InkFlow、环绕、跟拍、匹配到大纲。
- **【检查点】** 渲染 S05–S08 片段，以及每镜关键帧静帧。

**阶段 2：第一、二幕**
- 碎片空间、z 轴穿越、光标匹配剪辑、遮幅退开、冲击帧、墨滴。

**阶段 3：第四幕**
- 电影版 UI 组件、甩镜、49 组件墙（读真实目录名）、三分屏、测验和掌握度。
- **【检查点】** 渲染第二到第四幕。

**阶段 4：第五、六幕**
- 资料落下、小图合并、引用移焦、星群、Logo 汇聚。

**阶段 5：声音和交付**
- 音效、音乐闪避，跑 `check-claims`。
- 输出到 `promo/out/`：
  - `primoria-film.mp4`（带字幕）
  - `primoria-film-nocaptions.mp4`
  - `stills/` 每镜关键帧 PNG
  - `ppt/cover.png`（S16 最终帧）、`ppt/graph.png`（S07 结尾）、`ppt/outline.png`（S08）、`ppt/tutor-styles.png`（S11），全部 1920×1080，供 PPT 复用
- **【检查点】** 交付给用户，报告总时长、渲染耗时，以及仍是占位的项目。

## 11. 验收标准

- 在 `promo/` 下 `pnpm studio` 可预览；`pnpm render` 一条命令出成片，时长 1:25–1:35。
- `pnpm typecheck`（`tsc --noEmit`，strict）通过。
- 同一帧渲染两次像素一致（任挑 3 帧，用 `remotion still` 对比）。
- 片中没有出现规则外的转场、装饰性渐变、emoji、Inter 字体。
- 字卡 ≤ 2 张，每张 ≤ 6 个单词；字幕与旁白逐句同步，每行 ≤ 42 字符。
- `check-claims` 通过；UI 里的文案都能在产品里找到对应（英文界面）。
- 主仓库不受影响：`pnpm-workspace.yaml`、根 `pnpm-lock.yaml` 没有改动，根目录的 `pnpm lint` 和 `pnpm typecheck` 照常通过。
- 在 Apple Silicon Mac 上整片渲染 ≤ 20 分钟（用 `--concurrency` 调优；超时要报告瓶颈在哪一镜）。
