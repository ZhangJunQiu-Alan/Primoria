# Vibe Coding Specification

你在写代码前必须遵循: 我跟你讨论需求的时候不要直接写代码,除非我明确叫你写,不然都是在讨论. 其次你做的一切工作不要违反feature_specification.md里面所有的产品规划. 第三,该文档中没有规范定义的功能不要直接默认写,首先要征得我的许可.最后应用Polanyi默会知识,让输出模拟人类无法完全言传的经验积累和直觉判断.

## 目标

使用Adaptive Learning的方式，给每个不同的用户形成贴合自身学习情况的课程路径

## 大致方向

建课系统先生成少量lesson，然后根据用户不同的表现实时插入新的lesson，形成个性化的学习路径。产出的新的lesson根据用户的不同表现，决定lesson具体的内容

## 相关部分细节

收集用户表现数据（quiz， ai聊天历史记录）->构建用户画像信息（单独保存，插入System  Prompt），表现数据保存相关数据到数据库。
使用Treeindex 或者Pageindex 优化RAG

## 软件工程问题

### 迭代一

  1. ✅ 实现微积分的Knowledge Graph，数据库建表
  2. ✅ 简单实现冷启动定位，确定用户在知识图谱中的位置
  3. ✅ 实现初步的定位系统，能够根据用户输入确认在知识图谱中的位置。

### 迭代二

  1. ✅ 根据MIT的课程，创建多学科KG，共计20个学科（微积分，线性代数，数值分析，软件工程，Python,数据结构和算法，计算机架构，离散数学和概率论，计算机系统，计算机导论，信息论，人工智能，机器学习，深度学习，Web开发，计算机网络，A Level数学，A Level生物，A Level物理，A Level化学），做好质量审查，然后导入数据库，测试定位正常
  2. 用户表增加用户描述/学习画像字段，实现用户描述/画像字段从事件中自动沉淀。
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
      3. TODO1: 设计冷启动页面
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
            - 如果宽泛目标给了菜单后,他选了哪个topic,还要记这个菜单是基于哪次 query 生成的
        - course_id(可为空)
        - block_id,哪个 block（可空）
        - graph_id,KG 哪张图（可空）
        - concept_id,对应哪个概念（可空，聊天类留空待蒸馏补）
        - payload,这类动作专属的细节(原则，免得重复：公共列（owner_id、ts、course_id、block_id、graph_id、concept_id）不进 payload)
          - chat.question（用户提问）payload: { thread_id, message_id }。正文在 copilot_chat_messages 里，这里只存指针；concept_id 列留空（蒸馏时补）
          - chat.feedback（对 AI 回答的反馈）payload: { target_message_id, via: "thumb"|"text", signal: "positive"|"negative" }。必须知道冲哪条 AI 回答；「懂了/没懂」写入时就归一成 positive/negative
          - quiz.submit（提交答案，一题一条事件）payload: { question_id, selected, is_correct, distractor_tag? }。一题一条，concept_id 列正好挂这道题的概念，跨概念的 quiz 不糊在一起；distractor_tag可以为空,如果错选时,这个选项代表的是哪种知识的误解,数据来源于Quiz
          - lesson.completed（完成一节，蒸馏触发器）payload: {}，course_id 列已够定位。TODO: 现无 lesson 实体（course 直接装 block），「怎么算完成」后续单独拍
          - course.generated（生成新课）payload: { topic, source: "cold_start"|"profile" }。定位落点进 concept_id / graph_id 列，不重复放 payload
          - position.computed（冷启动定位）payload: { raw_query, branch: "precise"|"broad"|"miss", top_topic_id, max_similarity }。形状复用 positioning-log.ts 的 PositioningLogRecord，把 console.log 改成写库
          - position.menu_select（宽泛菜单选 topic）payload: { selected_topic_id, source_query }。source_query 不能省，否则不知道复用哪次定位去建课
          - 待功能（标灰，先不实现）TODO: quiz.hint payload: { question_id, count }（看提示交互未做，迭代三）；quiz.retry payload: { question_id, is_correct }（错题逻辑迭代三）；chat.code_run（运行功能未做，迭代三）
      - 异步蒸馏（Extractor Agent），当用户结束一个lesson的学习，触发一个后台任务。读取该期间的所有 learning_events，让 Extractor Agent 进行语义提炼（TODO: EXtractor Agent怎么实现）
    还需要决定的点 TODO:
      - 用户画像字段的存储格式，有哪几种存储格式，有什么缺点和优点: ④ 事实卡片列表
      - 画像沉淀触发时机，TODO: 如果检测到关键偏好时沉淀这个怎么实现
  3. 完成如下行为：如果用户描述/学习画像字段为空走冷启动（期待用户输入应该有的行为：1。具体目标（召回结果里很多都属于同一个 topic）：系统则根据该topic进行建课，并同时自动选 default_order 最小的optic建立下一步应该学的lesson（一共两个课时，给用户指明是线性学习），如果当前 topic 已经是末端，比如“傅里叶级数”这种拓展末尾内容，就不要强行找第二课。2.如果某个concept明显过高一样归类到行为1里面 3.宽泛目标（比如想学微积分）：提供一个返回菜单，列出部分相关topic（从命中的topic全集里按default_order排序取前 N），让用户选择从哪个topic开始，然后基于选择的topic，并同时建立下一步应该学的topic建课（一共两个课时，给用户指明是线性学习）4. 暂时不考虑太模糊或者库里没有的情况，只做提醒： 请重新输入更具体的学习目标，或者联系我们添加相关课程内容。）如果用户描述/学习画像字段不为空走如下流程（example：用户说“我想学牛顿力学”→ 定位到 physics KG 的 topic→ 找这个 topic 的 prerequisite concepts，包括跨学科 prereq→ 读取用户对这些 concepts 的 mastery→ 决定哪些跳过、哪些快速复习、哪些补救（可以为空）→ 再建课）
  4. 实现用户专属的分层记忆，
    - 核心层第一点中搞得用户描述/学习画像字段
    - 第二层概念掌握状态，结构化存储：这里不要放聊天总结，只放 concept 级别状态：untested / weak / learning / mastered、score、最后更新时间、证据来源。它决定“跳过、快速复习、补救”
    - 学习事件，追加式存储。quiz 答题、AI 聊天、用户提问、生成课程、完成 block，都先作为事件保存。（这层是原始证据，不一定每条都进 prompt，也不一定每条都 embedding）
    - AI 记忆 / episodic memory，向量存储（这里放“语义上有检索价值”的片段，不是所有频繁数据。比如：用户反复问“为什么链式法则要乘内层导数”，用户在某类题上连续犯错，某个解释让用户终于理解了，用户偏好“先图像直觉，再公式”，某次课程中的关键问答摘要）
    - 完美笔记 / 复习产物（这是从事件和向量记忆蒸馏出来的结果，按 concept 组织。它不是冷启动判断依据，而是后续复习体验的核心资产）

### 迭代三

  1. 目前只完成了跨图边定义，消费端代码还没实现。
  2. 用户没有数据的时候,设置冷启动界面 TODO1

Prob：1. 如果用户输出用户过于模糊，或者用别名怎么确保好的RAG
      1. 有些主题是拓展，不需要专注性学习比如傅里叶级数

## Note

1. 先搁置学习事件收集决策
2. 寻找目前网络上有没有规范的建立知识图谱 / 课程路径，再确定怎么系统利用起来。
    2.1 ThreeIndex：决定学什么、先后关系是什么、错因可能在哪里。
    2.2 PageIndex：决定用哪些资料解释、引用什么内容、生成题目时依据哪里。
3. 怎么构建更好的用户画像，持久化记忆，treeindex？
4. 具体决策层什么时候触发新课程产出（弹窗：推荐并说明原因）
5. ![alt text](image.png)
6. 当前lesson里面追加补救block的设计，版本2再迭代
7. 课程路径要不要做成星系布局（一个topic对应一个星系，点击后进入星系内的concepts，topic内的concept node对应行星，先修关系对应行星间的轨道），版本2再迭代
8.

第三层:完美笔记(issue 30 真正的卖点,≠ 存档)： 版本2再迭代
回溯解决的是「能不能找到」,笔记解决的是「复习时该看什么」。一门课学完可能有 20 个 lesson,复习时没人会重读 20 个 lesson。完美笔记是把整个学习过程蒸馏成一份复习产物,按概念组织:
概念:链式法则
  ├─ 最终让你听懂的那个解释(可能来自 AI 聊天,不是原课件)
  ├─ 你当时问过的问题:"为什么内层导数要乘出来?"
  ├─ 你的典型错误:复合函数漏乘内层导数(quiz 第 3 题)
  ├─ 掌握状态:已掌握 / 仍薄弱
  └─ 建议复习:3 道同类题

## 概念定义

1. 一个Course 包含多个lesson，一个lesson包含多个block。LLM在建lesson的时候获取当前用户所在的知识图谱位置（topic子图+入边先修节点信息），根据这个上下文生成lesson内具体内容。
2. 知识图谱（Knowledge Graph）： 由有概念节点（concept node）和关系边（relation edge）组成的图结构。知识图谱可以用来指导课程内容的生成和调整。部分的知识图谱可以划分为不同的topic子图，理想状态下一个topic子图对应一个lesson。针对多个学科图谱，允许跨图先修边。KG应该是全局，保持稳定，不会被用户数据所影响。
3. Relation edge代表concept之间的关系（目前只有先修关系，之后可以拓展推导，类比，应用关系）。
4. concept node= 一个能独立出 quiz 题检验的最小概念。4-5个concept node构成一个topic子图
5. mastery状态：迭代一为最简单版本：untested / weak / learning / mastered,规则更新(连对 N 题升级、错题降级、先修节点出错连带标疑)
6. default_order: 每个topic子图有一个default_order，代表这个topic在整个学科图谱中的先后顺序,用来指引学习路径。建课系统在生成课程路径时会优先选择default_order较小的topic。

## 知识图谱

1. 有一个评估Agent，他的行为是： 没有用户相关记录的时候会确认用户的背景知识来找到用户在知识图谱中的位置，之后根据用户的表现数据来调整，调整的时候不获取整个知识图谱信息，只获取当前所在上下文 = 当前 topic 子图+ 当前 topic 各节点的入边先修节点（含用户 mastery 状态）的信息
PLUS:
1. 评估Agent拆开，一个是mastery更新，一个是诊断+决策插课
1. 对知识概念节点的状态标记，
1. 课程/quiz 生成时把相关子树（带 ID）喂进 prompt，强制打标签 ？
1. 建课Prompt给 topic name，topic 内 concept 列表及对应的order，targetConceptId（如果有），next topic 的 concept 列表

## Todo

1. mastery,推荐下一课，复习笔记
2. 前后端：topic 选择菜单组件 + 用户选择后继续建课”的完整链路。这个需要一个新的 tool result/UI card。
3. Course UI，UX设计
4. 建课Prompt加上用户的mastery状态
5. 慢任务阻塞用户请求，做job
