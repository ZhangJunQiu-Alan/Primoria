# Vibe Coding Specification

## 你在写代码前必须遵循

- 我跟你讨论需求的时候不要直接写代码,除非我明确叫你写,不然都是在讨论.
- 你做的一切工作不要违反feature_specification.md里面所有的产品规划.
- 该文档中没有规范定义的功能不要直接默认写,首先要征得我的许可.
- 应用Polanyi默会知识,让输出模拟人类无法完全言传的经验积累和直觉判断.
- 永远不要直接修改这个文档

## 目标

使用Adaptive Learning的方式，给每个不同的用户形成贴合自身学习情况的课程路径

## 产品功能杂项

1. 永远不支持BYOK,后台建课统一使用平台服务器模型配置.
2. 用户相关数据目前都是测试数据。以后DB 测试请使用本地独立 Postgres，禁止再对 Supabase 正式数据库执行清空或重置操作；正式数据库只能运行必要的迁移和非破坏性验证。

## 相关部分细节

- 在建课Agent生成Course大纲及第一个Lesson之后,由学习进度编排流程更新mastery并作出决策:
  - 没有明显薄弱点时,创建大纲中的下一个lesson
  - 发现知识缺口时,动态创建补足Lesson,插入当前lesson与原下一个Lesson之间并入队.所有的lesson内容均通过统一的Lesson Job体系生成
- Blocks
  - Visualization Block: 项目核心卖点,能支持可交互式可视化的地方都要支持
  - Image Block：静态认知锚点，用于结构识别、场景直觉、类比图像；不能替代核心解释。
  - Code Block: 支持编辑,运行,保存
- Lesson相关
  - 用户在学习一门lesson的时候,根据大纲仅对下一个lesson做预加载.
  - 交互行为: 用户学习完一门lesson(完成该 lesson 内所有 concept quiz)之后,系统会基于做的quiz情况(沿用目前的推荐机制)推荐是否要产出一个补救课程弹窗,包含补救课程原因. 如果需要产出补救课程,则会有两个选项按钮,一个是"是",另一个是"不需要,开始学习'下一个课程(使用lesson名字替换)'". 如果这个是大纲的最后一节课,没有下一个lesson,一个是"是",另一个是"不需要",然后跳转回首页. 如果不需要产出,则弹窗说Good Job,开始下一个lesson的学习吧,一个是"是":进入下一个lesson的页面,另一个是"否":跳转回首页.用户可以关闭弹窗,既闭就默认为拒绝产出补救lesson。然后在library界面点击continue的时候，这会进入第2个课程，而不是原来的。
  - 建Lesson Prompt 加上用户的mastery状态
    - 使用深浅自适应,mastered→一笔带过/可跳过解释、weak/untested→完整教学+更多 example。仍覆盖该 topic 全部 concept,只调节篇幅与深度。lesson 永不为空。

## 软件工程问题

### 迭代一

  1. ✅ 实现微积分的Knowledge Graph，数据库建表
  2. ✅ 简单实现冷启动定位，确定用户在知识图谱中的位置
  3. ✅ 实现初步的定位系统，能够根据用户输入确认在知识图谱中的位置。

### 迭代二

  1. ✅ 根据MIT的课程，创建多学科KG，共计20个学科（微积分，线性代数，数值分析，软件工程，Python,数据结构和算法，计算机架构，离散数学和概率论，计算机系统，计算机导论，信息论，人工智能，机器学习，深度学习，Web开发，计算机网络，A Level数学，A Level生物，A Level物理，A Level化学），做好质量审查，然后导入数据库，测试定位正常
 
  3. 用户表增加用户描述/学习画像字段，实现用户描述/画像字段从事件中自动沉淀。
     ✅ 首先定义用户的什么交互行为会作为用户画像：
      1. AI 导师对话交互（提炼用户学习偏好、认知卡点和心理状态）
        - 主动提问+追问
        - 提问的偏好表达
        - 对AI解释的反馈（显式反馈：点赞/点踩、输入“懂了”/“没懂，太复杂了”；隐式反馈：AI 给出代码后，用户进行了复制或运行）Note: 学习一下ChatGPT的点赞， AI输出加入代码运行
      2. Quiz 与练习评估交互（更新用户概念掌握状态 (Mastery)
        - 答题提交（正确与否、答错的具体干扰 项、完成答题的耗时）。
        - 请求提示 (Hint Requested)（在答题中是否点击了“获取提示”，点击了多少次）。
        - 查看解析（答题后是否仔细阅读了 Detail Explanation，还是直接跳过）。
        - 错题重做/复习（主动复习错题的行为和结果）。
      3. TODO: 设计Cold-start Onboarding,初始画像采集工作
    ✅ 因为用户交互事件是高频、碎片化且带有噪音的，采用 追加存储 + 异步蒸馏![alt text](image-1.png),同时事件id前端生成,确保每个动作只算一次
      - 追加式事件表（learning_events）
        - 字段
          - event_id,这条事件的唯一 id
          - owner_id,哪个用户
          - time,事件时间戳
          - type,哪一类动作
            - 用户发的每条提问
            - 用户对AI回答的明确反馈（点赞/点踩、打字说「懂了」或「太复杂了没懂」）
            - AI 给了代码后，用户复制了 / 点了运行 （TODO: AI聊天还不能实现代码运行,迭代三实现功能,功能实现了才开始加入字段,代码运行到时候补payload）
            - AI自己说的话（不单独记，需要时用 message_id 指过去）
            - Quiz提交的答案 - 不光记对错，还要记错的时候选的哪个错误选项，用来反推他是那种错误理解（TODO: 修改建课/出quiz的Prompt要增加,我到时候自己做Prompt工程,产出为distractor_tag）
            - Quiz在什么题目点击了「看提示」 TODO: 看提示的交互还没做,迭代三实现功能,功能实现了才开始加入字段
            - 错题重做做对了没有(错题生成和交互逻辑放到迭代三)
            - 完成了一个lesson
            - 生成了一门新课(什么主题,定位在哪)
            - 冷启动时:用户输入的学习目标,KG的定位
            - 如果宽泛目标给了菜单后,选了哪个学科,还要记这个菜单是基于哪次 query 生成的
        - course_id(可为空)
        - lesson_id,哪个 lesson（可空）
        - block_id,哪个 block（可空）
        - graph_id,KG 哪张图（可空）
        - concept_id,对应哪个概念（可空，聊天类留空待蒸馏补）
        - payload,这类动作专属的细节(原则，免得重复：公共列（owner_id、ts、course_id、lesson_id, block_id、graph_id、concept_id）不进 payload)
          - chat.question（用户提问）payload: { thread_id, message_id }。正文在 copilot_chat_messages 里，这里只存指针；concept_id 列留空（蒸馏时补）
          - chat.feedback（对 AI 回答的反馈）payload: { target_message_id, via: "thumb"|"text", signal: "positive"|"negative" }。必须知道冲哪条 AI 回答；「懂了/没懂」写入时就归一成 positive/negative
          - quiz.submit（提交答案，一题一条事件）payload: { question_id, selected, is_correct, distractor_tag? }。一题一条，concept_id 列正好挂这道题的概念，跨概念的 quiz 不糊在一起；distractor_tag可以为空,如果错选时,这个选项代表的是哪种知识的误解,数据来源于Quiz
          - lesson.completed（完成一节，蒸馏触发器）payload: {}，每个 concept 收尾都有 quiz,完成该 lesson 内所有 concept quiz 后触发.
          - course.generated（生成新课）payload: { topic, source: "cold_start"|"profile" }。定位落点进 concept_id / graph_id 列，不重复放 payload
          - position.computed（冷启动定位）payload: { raw_query, branch: "positioned" | "clarify_subject" | "fallback", top_topic_id, max_similarity }。形状复用 positioning-log.ts 的 PositioningLogRecord，把 console.log 改成写库
          - position.menu_select（宽泛澄清选学科）payload: { selected_topic_id, source_query }。source_query 不能省，否则不知道复用哪次定位去建课
          - 待功能（标灰，先不实现）TODO: quiz.hint payload: { question_id, count }（看提示交互未做，迭代三）；quiz.retry payload: { question_id, is_correct }（错题逻辑迭代三）；chat.code_run（运行功能未做，迭代三）
      - 异步蒸馏（Extractor Agent），当用户结束一个lesson的学习，触发一个后台任务。读取该期间的所有 learning_events，让 Extractor Agent 进行语义提炼（TODO: EXtractor Agent怎么实现）
  4. 完成如下行为：
     1. 如果用户描述/学习画像字段为空走冷启动
        用户输入后应该有的行为：
        - 具体目标（召回结果里很多都属于同一个 topic）：系统首先在KG中定位该Topic,并基于当前Topic所属KG中的Topic Order规划处一个大纲路径(包含从该KG中从当前Topic开始剩余的所有Topic),UI界面为线性学习.若当前Topic已经是末端,则进包含当前这一个Topic.然后,系统立刻生成大纲中第一个Topic对应的Lesson具体内容,其余大纲节点采取LazyGeneration.
        - LLM 判定为 specific
        - 宽泛目标（比如想学微积分）：宽泛目标不再弹 topic 菜单;系统自动判定 subject_start(从该 KG topic 0 起)或 directed(从命中区段上游 topic 起),直接建大纲 + 首 lesson、其余 lazy。UI界面为线性学习.若当前Topic已经是末端,则进包含当前这一个Topic.然后,系统立刻生成大纲中第一个Topic(也就是选中的Topic)对应的Lesson具体内容,其余大纲节点采取LazyGeneration.
        - 跨学科KG选择：跨图改为 embedding 召回出候选学科 → 一次 LLM 在候选全图上选学科 + 定位;MAX_STAGE2_GRAPHS=3、GRAPH_MARGIN_WINDOW=0.06。
        - 暂时不考虑太模糊或者库里没有的情况，只做提醒:
          - 库里没有:保留原提醒文案(fallback)。
          - 命中多个学科、定不下:不再是冷提醒,而是温暖 LLM 文案 + 可点学科 chip(clarify_subject,点 chip = 确定学科 + subject_start)。
      2. 如果用户描述/学习画像字段不为空走如下流程
         - example：用户说“我想学牛顿力学”→ 定位到 physics KG 的 topic -> 查询目前是否已经有了关于这个KG的大纲信息, 如果已经有了则在旧大纲路径下产出当前请求的Lesson. 如果没有则继续→ 获取Physic KG中从定位 topic 往后的所有Topic中的Concept → 读取用户对这些 Concept 的 mastery状态,决定哪些跳过、哪些快速复习、哪些补救（可以为空）-> 然后根据前面信息产出一个大纲路径(包含从该KG中从当前Topic开始剩余的所有Topic)系统立刻生成大纲中第一个Topic对应的Lesson具体内容,其余大纲节点采取LazyGeneration.
  5. 实现用户专属的分层记忆，
    - 核心层第一点中搞得用户描述/学习画像字段
    - 第二层概念掌握状态，结构化存储：这里不要放聊天总结，只放 concept 级别状态：untested / weak / learning / mastered、score、最后更新时间、证据来源。它决定“跳过、快速复习、补救”
    - AI 记忆 / episodic memory，向量存储（这里放“语义上有检索价值”的片段，不是所有频繁数据。比如：用户反复问“为什么链式法则要乘内层导数”，用户在某类题上连续犯错，某个解释让用户终于理解了，用户偏好“先图像直觉，再公式”，某次lesson中的关键问答摘要）
    - 完美笔记 / 复习产物（这是从事件和向量记忆蒸馏出来的结果，按 concept 组织。它不是冷启动判断依据，而是后续复习体验的核心资产）

### 迭代三

  1. 目前只完成了跨图边定义，消费端代码还没实现。
  2. 用户没有数据的时候,设置冷启动界面 TODO1

Prob：1. 如果用户输出用户过于模糊，或者用别名怎么确保好的RAG
      1. 有些主题是拓展，不需要专注性学习比如傅里叶级数

## Note

1. 怎么构建更好的用户画像，持久化记忆，treeindex？
2. 课程路径要不要做成星系布局（一个topic对应一个星系，点击后进入星系内的concepts，topic内的concept node对应行星，先修关系对应行星间的轨道），版本2再迭代
8.

第三层:完美笔记(issue 30 真正的卖点,≠ 存档)： 版本2再迭代
回溯解决的是「能不能找到」,笔记解决的是「复习时该看什么」。一门Course学完可能有 20 个 lesson,复习时没人会重读 20 个 lesson。完美笔记是把整个学习过程蒸馏成一份复习产物,按概念组织:
概念:链式法则
  ├─ 最终让你听懂的那个解释(可能来自 AI 聊天,不是原课件)
  ├─ 你当时问过的问题:"为什么内层导数要乘出来?"
  ├─ 你的典型错误:复合函数漏乘内层导数(quiz 第 3 题)
  ├─ 掌握状态:已掌握 / 仍薄弱
  └─ 建议复习:3 道同类题

## 概念定义

1. Course结构: Course 中包含多个lesson，一个lesson包含多个block。LLM **逐节（per-lesson）**获取该 lesson 所在 topic 的知识图谱上下文（topic 子图 + 入边先修节点信息），据此生成该 lesson 的具体内容（不是 Course 级一次性取，因为一个 Course 跨多个 topic，每节的先修各不相同）。lesson 只引用 KG 的 topic/concept ID、不复制 KG 结构，并带 per-user 状态（new / 复习 / 补救 / 完成）。Course 还持有一个不变的目标锚点（来自定位）：适应性插课时前沿前移、锚点不动，用于判断用户何时到达初始目标、该学习线何时收尾。Course是会随着适应性插lesson增长的活容器,插入的新Lesson算在同一个Course内,如果遇到跨图补救的情况,产出的lesson 落在 prereq 所属学科的 Course,当前Course仅保留一个跳转按钮.Block和Concept不需要一一对应,建Lesson Agent只需要基于Topic里面的Concepts知识建Lesson,确保产出足够好的质量.Example: 如果用户在学《微积分》，触发了《Python》的先修补救课: 系统是自动为他静默初始化一个《Python》Course 实例来承载这个补救Lesson,走建课一样的流程,先建立大纲路径,再建立这个Lesson.
2. 每个用户每个学科最多一个 Course 实例.
3. 知识图谱（Knowledge Graph）： 由有概念节点（concept node）和关系边（relation edge）组成的图结构。知识图谱可以用来指导课程内容的生成和调整。部分的知识图谱可以划分为不同的topic。针对多个学科KG，允许跨图先修边。KG应该是全局，保持稳定，不会被用户数据所影响。
4. KG和Course的关系: 一个学科的KG等于一个Course,比如微积分的KG就是微积分的Course.Agent建Lesson的时候会基于KG中的topic信息来建立.
5. Relation edge代表concept之间的关系（目前只有先修关系，之后可以拓展推导，类比，应用关系）。
6. concept node= 一个能独立出 quiz 题检验的最小概念。通常由 2–3 个 concept node 构成一个 topic 子图，确保单节 lesson 足够聚焦，每个 concept 都应有自己的 quiz block，quiz 放在该 concept 教学小节收尾，而不是全部集中在 lesson 末尾.
7. mastery状态：迭代一为最简单版本：untested / weak / learning / mastered,规则更新(连对 N 题升级、错题降级、先修节点出错连带标疑)
8. default_order: 每个topic子图有一个default_order，代表这个topic在整个学科图谱中的先后顺序,用来指引学习路径。建Course系统在生成lesson时会优先选择default_order较小的topic。

## 知识图谱

1. 有一个评估Agent，他的行为是： 没有用户相关记录的时候会确认用户的背景知识来找到用户在知识图谱中的位置，之后根据用户的表现数据来调整，调整的时候不获取整个知识图谱信息，只获取当前所在上下文 = 当前 topic 子图+ 当前 topic 各节点的入边先修节点（含用户 mastery 状态）的信息
PLUS:
1. 评估Agent拆开，一个是mastery更新，一个是诊断+决策插课
2. 课程/quiz 生成时把相关子树（带 ID）喂进 prompt，强制打标签 ？
3. 建课Prompt给 topic name，topic 内 concept 列表及对应的order，targetConceptId（如果有），next topic 的 concept 列表

## Todo

1. 看看Course edit event
2. 使用Treeindex 或者Pageindex 优化RAG

### 建课测试Prompt

1. 讲讲二分查找,我要会自己写代码
2. 带我入门光合作用的光反应和暗反应
3. 我对算法感兴趣,从头教我
4. 我就想弄明白冒泡排序

## Extractor Agent

- 定义: Extractor Agent 是一个 lesson 完成后的语义蒸馏后台 Agent。
它读取某个用户在某一节 lesson 学习期间产生的 learning_events，结合 lesson / course / KG context、当前 user_concept_mastery 和已有用户画像，提炼出两类长期可复用信息：
  - 核心层用户画像更新: 用户偏好、知识背景、认知卡点、心理状态等稳定特征。
  - 第三层 episodic memory: 有语义检索价值的具体学习片段，例如某个误解、某次有效解释、某类反复提问、某个 concept 下的关键问答摘要。

- 边界(不做什么):
  - Extractor 不更新 user_concept_mastery
  - Extractor 不决定是否插入 remediation lesson
  - Extractor 不生成下一节 lesson
  - Extractor 不替代 KG 定位
  - Extractor 不生成完美笔记
  - Extractor 不把所有事件都变成记忆
  - Extractor 不因为用户说“我懂了”就判断 mastered

- 工作位置: 独立的 extractor_jobs + 独立 worker,而不是给 learning-progress 加第三个 stage
- 画像更新流程:读当前画像 + 本次 lesson 窗口的新事件 → LLM 产出更新后的画像(增量 merge)
- 架构
  - 核心层: 用户画像(偏好/知识背景)
    | 类别 | 具体存什么 | 用来影响什么 |
    | --- | --- | --- |
    | 学习背景 | 用户目前学习和学过的Course信息 | 冷启动、课程难度、术语密度 |
    | AI Tutor的交互偏好 | 喜欢直接答案、引导式提问、先提示再答案、多练习 | AI tutor 对话策略 |
    | 解释偏好 | 喜欢先直觉、先例子、先公式、先代码、先图像 | lesson prompt 的讲解顺序 |
    | 节奏/深度偏好 | 喜欢慢慢讲、快速过、严谨推导、实用实现 | 每个 concept 的展开程度 |

  - 第二层: Concept Mastery:
      作用:
      1. 第三层的信息很杂乱,目前使用concept id来精准召回
      2. 帮助Extractor做attention routing,如果learning_processing 更新出某个concept是weak就会重点关注这个concept相关的事件.
      3. 判断对concpet的掌握程度应该交给Quiz evidence+规则系统来做,不然Extractor看到用户说"我懂了",有可能会被误导
      4. 以后生成Lesson的时候,应该组合 EX: mastery: chain_rule = weak, episodic memory: 用户卡在“为什么乘内层导数”，机器嵌套类比有效
  - 第三层: Episodic Memory





Weak的concept如何提升到mastered?

## Lesson Block 结构与配方 (参考 Brilliant)

- **核心配比**：整个 Lesson 的媒体 Block 占比设为 **image + visual 合计 30%-45%，visual 优先但不硬性数量**。Image 用作静态认知锚点（Look-once-to-recognize），Visual 用作动态机理探究、多变量交互或流程单步追踪（Try-it-to-understand）。
- **动静交替节奏**：连续纯文字 Block 不得超过 **2 个**，或单段文字不得超过 **150 字**，超时必须插入 `visual` / `image` / `quiz` 等非纯文字 Block 作为认知缓冲。
- **单个 Concept 限制**：planner 决定 visual和 image 数量，但每个 media block 必须有独立教学目的。
- **Code Block 边界**：Code Block 保留编辑、运行、保存能力，但不是默认 lesson 配方。只有编程语言、算法/数据结构、Web/软件工程、数值/科学计算、机器学习实现类主题，或用户明确要求“写代码/运行代码/用某编程语言/代码实现/实现算法、函数或接口”时才生成 `code` block。裸词“实现”不能单独构成代码意图（如“自我实现”“实现共同富裕”不应触发 Code Block）。其他学科默认用 `text/example`、`image`、`visual`、`analogy` 表达。

### 13-15 Block 理想结构 (以 2-Concept 为例)

对于包含 2 个 Concept 的 Lesson，推荐采用 **13-15 Block** 的微解构闭环排布：

1. **Hook** (`text`/`hook`): 文字引入，用反直觉或生活实例激发探索欲。
2. **Roadmap** (`text`/`roadmap`): 交代学习路径与驱动问题。
3. **Concept 1 Intro** (`text`/`explanation`): 引入概念 1 的核心问题。
4. **Concept 1 Image** (`image`/`example`): 【Image 1】概念 1 的结构识别、真实场景或类比画面。
5. **Concept 1 Application** (`text`/`example`): 概念 1 的具体样例或应用；只有代码适配学科才可替换为 `code`。
6. **Concept 1 Visual** (`visual`/`deepening`): 【Interactive 1】概念 1 的动态机制、变量关系或过程观察。
7. **Concept 1 Quiz** (`quiz`/`assessment`): 概念 1 的收尾检验。
8. **Concept 2 Intro** (`text`/`explanation`): 引入概念 2 的核心问题。
9. **Concept 2 Application** (`text`/`example`): 概念 2 的具体样例或应用；只有代码适配学科才可替换为 `code`。
10. **Concept 2 Image** (`image`/`deepening`): 【Image 2】概念 2 的静态直观锚点。
11. **Concept 2 Visual** (`visual`/`deepening`): 【Interactive 2】概念 2 的多变量交互或机制沙盒。
12. **Concept 2 Quiz** (`quiz`/`assessment`): 概念 2 的收尾检验。
13. **Transfer** (`text`/`transfer` 或 `visual`/`transfer`): 融合 2 个 Concept 的迁移应用；需要操作变量或过程时优先 `visual`。
14. **Summary** (`text`/`summary`): 课后元认知反思与小结。

### 16-20 Block 理想结构 (以 3-Concept 为例)

对于包含 3 个 Concept 的 Lesson，推荐采用 **16-20 block** 的微解构深层闭环排布：

1. **Hook** (`text`/`hook`): 激发好奇心与直觉假设。
2. **Roadmap** (`text`/`roadmap`): 交代三个概念的递进逻辑关系。
3. **Concept 1 Intro** (`text`/`explanation`): 引入概念 1。
4. **Concept 1 Image** (`image`/`example`): 【Image 1】概念 1 静态直观心智示意图。
5. **Concept 1 Visual** (`visual`/`deepening`): 【Interactive 1】概念 1 基础原理调试沙盒。
6. **Concept 1 Application** (`text`/`example`): 概念 1 的应用样例；只有代码适配学科才可替换为 `code`。
7. **Concept 1 Quiz** (`quiz`/`assessment`): 概念 1 的收尾检验。
8. **Concept 2 Intro** (`text`/`explanation`): 引入概念 2。
9. **Concept 2 Visual** (`visual`/`deepening`): 【Interactive 2】概念 2 动态时序或运行单步追踪。
10. **Concept 2 Application** (`text`/`example`): 概念 2 的应用样例；只有代码适配学科才可替换为 `code`。
11. **Concept 2 Visual** (`visual`/`deepening`): 【Interactive 3】概念 2 的第二个交互模型，仅当教学目标不同于第一个 visual 时使用。
12. **Concept 2 Quiz** (`quiz`/`assessment`): 概念 2 的收尾检验。
13. **Concept 3 Intro** (`text`/`explanation`): 引入概念 3。
14. **Concept 3 Image** (`image`/`example`): 【Image 2】概念 3 的核心静态图表对比。
15. **Concept 3 Visual** (`visual`/`deepening`): 【Interactive 4】概念 3 状态仿真分析组件。
16. **Concept 3 Application** (`text`/`example`): 概念 3 的应用样例；只有代码适配学科才可替换为 `code`。
17. **Concept 3 Quiz** (`quiz`/`assessment`): 概念 3 的收尾检验。
18. **Transfer Visual** (`visual`/`transfer`): 【Interactive 5】打包整合三个概念并触发深度跨界迁移组件；不需要交互时可降级为 `text`/`transfer`。
19. **Summary** (`text`/`summary`): 收尾元认知总结与后续引导。
