import { getTrueFalseQuestionLimit } from './quizRules.ts';

export type TutorDocumentRecord = {
  id: string;
  filename: string;
  display_title?: string | null;
  extracted_text: string;
};

export type QuizOutputLanguage = 'en' | 'zh-CN';

const LANGUAGE_INSTRUCTIONS: Record<QuizOutputLanguage, string> = {
  'en': 'All output (titles, questions, options, explanations) MUST be written in English. Even if the study material is in another language, translate terminology into natural English. Do not mix languages.',
  'zh-CN': '所有输出（标题、题目、选项、解析）必须使用简体中文。即使学习材料是其他语言，也必须翻译为自然的简体中文表述，不得混用语言。',
};

export function buildCourseSlug(title: string, courseId: string) {
  const normalized = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const fallback = normalized.length > 0 ? normalized : 'course';
  const suffix = courseId.split('-')[0] ?? courseId;
  return `${fallback}-${suffix}`;
}

export function buildQuizPrompt(
  documents: TutorDocumentRecord[],
  questionCount: number,
  language: QuizOutputLanguage = 'en',
) {
  const trueFalseLimit = getTrueFalseQuestionLimit(questionCount);
  const materials = documents
    .map((document, index) => `[文件${index + 1}: ${document.display_title?.trim() || document.filename}]\n${document.extracted_text}`)
    .join('\n\n');

  return `你是一位考试辅导老师，根据以下学习材料生成考前复习测验。
测验目标：帮助学生识别概念层面的薄弱点，通过每题的解析加深对知识点的理解，并能把所学原则迁移到新场景。

语言规则（最高优先级，必须严格遵守）：
${LANGUAGE_INSTRUCTIONS[language]}

## 核心原则：考概念，不考例子（最高优先级，优先于下面所有规则）

材料里用到的类名、方法名、变量名、人物名、具体代码片段，只是**作者用来讲解概念的脚手架**，本身没有记忆价值。合格的测验必须测「学生是否理解原则并能迁移到新场景」，而不是「学生是否记住作者选了哪个例子」。

严禁出现以下类型的题目（反面示例）：
- ❌ "以下哪个类/方法/例子是书中用来说明 XX 原则的？"（考作者的例子选择）
- ❌ "\`Automobile.start()\` 遵循还是违反 SRP？"（考具体玩具例子的结论）
- ❌ "以下哪位讲师/角色/人物在例子中做了 XX？"（考材料叙事细节）
- ❌ 需要记住材料里某个类名、方法名、变量名才能作答的题目
- ❌ 答案是材料里一段原文的完形填空或原句复述

必须按以下方式出题（正面要求）：
- ✅ 题干可以引用材料中的术语、原则名、概念名、模式名（如 SRP、Open/Closed Principle、单例模式、观察者模式）
- ✅ 需要代码或场景时，**由你自己构造一个新的小片段或新情境**，让学生判断它是否符合某原则、属于哪种模式、会产生什么后果
- ✅ 比较两个概念的差别、适用边界、主要收益、典型误用
- ✅ 提问"什么时候应该用 X / 不应该用 X"、"如果 X 失效会导致什么后果"、"X 和 Y 的关键区别是什么"
- ✅ 材料里的具体例子只允许作为题干的背景引子出现，**绝不能作为选项/答案本身**

## 学习材料
${materials}

## 出题要求

题目数量：恰好 ${questionCount} 题（硬性要求，不得多也不得少，questions 数组 length 必须精确等于 ${questionCount}）
难度等级：intermediate

认知层次分布（参照布鲁姆分类，严格遵守）：
- ~30% 理解（Understand）：概念定义、原则表述、核心区别、适用范围
- ~50% 应用（Apply）：给出**新构造的**代码片段或新场景，判断是否符合某原则 / 该选哪种方案
- ~20% 分析（Analyze）：权衡取舍、误用后果、与相关概念的对比、边界条件

出题原则：
- 聚焦材料中的**可迁移原则 / 概念 / 模式**，而不是具体例子
- 避免出现可以不看材料就能猜到答案的题目，也避免答案依赖记忆作者的例子
- 题目由易到难排列

题型数量与比例（必须严格遵守）：
- match（匹配）：按总题数硬性限定，不是百分比
  - 总题数 ≤ 15 → 恰好 1 道 match
  - 总题数 16-30 → 恰好 2 道 match
  - 每道 match 题 4-6 个配对
- tf（判断）：硬性上限，不是参考比例
  - 总题数每满 10 题，最多 1 道 tf
  - 本次 ${questionCount} 题 → 最多 ${trueFalseLimit} 道 tf${trueFalseLimit === 0 ? '（本次不得出现 tf）' : ''}
- mc（单选）+ mc_multi（多选）：剩余全部由单选/多选填充（通常占总题数 80% 以上），由你根据知识点性质决定单选或多选
  - 单选：有且仅有一个正确答案
  - 多选：q 字段必须注明"多选"或"Select all that apply"，至少 2 个正确答案
  - 选择依据：事实性/定义性 → 单选；需要列举多条准则/多种特征 → 多选

题目排列要求（关键，必须遵守）：
- 同类型题目必须穿插排列，严禁两道及以上相同 type 连续出现
- 例：mc → tf → mc_multi → mc → match → mc → tf → mc_multi → mc → match
- 不允许出现"先把所有 mc 列完再列 tf"这种按类型分块的排列

选择题（mc / mc_multi）质量要求：
- 题干聚焦**概念、判断、应用**，不得变成"材料中作者用了哪个例子"
- 若题干需要代码片段，**优先由你自己构造一个 3-10 行的新片段**，让学生判断它是否符合某原则 / 属于哪种模式；不得直接抄材料里的示例代码作为题干主体
- 干扰项应是**概念层面的常见误解**（例："SRP 就是每个类只能有一个方法"），而不是随机编造
- 同一题内所有 opts 的字符长度差异必须 ≤ 10%，以最长选项为基准
- 禁止一个选项很短、其他很长的情况（会成为明显的答案线索）
- 正确答案的长度不得明显长于干扰项

判断题（tf）质量要求：
- 陈述句必须是对**概念、原则、模式特性**的一般性断言（例："单例模式在多线程环境下天然线程安全"、"开闭原则要求通过继承扩展而不是修改已有代码"），学生需判断该断言是否成立
- 严禁形如 "材料中 XX 类的 YY 方法违反了 ZZ 原则 —— 对/错" 这类对具体例子的判定
- 优先选择一半容易被误解为真、一半容易被误解为假的平衡分布

匹配题（match）质量要求：
- **左项必须是**概念名、原则名、模式名、术语（如 "SRP"、"Open/Closed Principle"、"Strategy Pattern"、"封装"、"依赖倒置"）
- **右项必须是**该概念的定义、判定标准、适用场景、主要收益、或典型误用
- **严禁**左项或右项出现具体的类名、方法名、变量名、人物名（如 \`Automobile\`、\`start()\`、\`Joe\`、\`Mechanic\` 等）
- **严禁**左项写成 "X 类的 Y 方法"、右项写成 "遵循/违反 Z 原则" 这种具体实例到判定结果的配对
- 左项与右项长度不得一一对应，避免长短成为提示
- 每题 4-6 对，所有 pair 应围绕**同一主题族**（如都是 SOLID 原则，或都是创建型模式）以便形成有意义的干扰
- pairs 数组的顺序按左项字母/笔画顺序排列即可（展示时系统会打乱右侧选项）

## 解析字段（exp）规范
适用题型：mc、mc_multi、tf（match 不需要 exp）

每条 exp 必须同时覆盖两种场景：
1. 答错时 → 解释最常见的错误原因，指出错在哪个认知环节
2. 答对时 → 补充这个知识点在整体知识体系中的位置或与相关概念的联系

写作要求：
- 2-4 句话，不超过 100 字
- 必须引用材料中的具体概念或表述（而不是具体例子的类名方法名）
- 语气像老师课后答疑，简洁有深度
- 严禁写"答案是X"或"正确选项是X"这类无意义内容

## 输出格式
只输出 JSON，直接从 { 开始，不要任何 markdown 包裹，不要任何解释文字：

{
  "title": "根据材料内容起一个准确的测验标题",
  "description": "一句话说明本测验覆盖哪些主题",
  "difficulty": "intermediate",
  "questions": [
    {
      "type": "mc",
      "q": "题目文字",
      "opts": ["选项A", "正确答案B*", "选项C", "选项D"],
      "exp": "解析文字"
    },
    {
      "type": "mc_multi",
      "q": "题目文字（多选）",
      "opts": ["正确答案A*", "正确答案B*", "错误选项C", "错误选项D"],
      "exp": "解析文字"
    },
    {
      "type": "tf",
      "stmt": "判断题陈述句",
      "ans": true,
      "exp": "解析文字"
    },
    {
      "type": "match",
      "pairs": [
        ["左侧项1", "右侧项1"],
        ["左侧项2", "右侧项2"],
        ["左侧项3", "右侧项3"],
        ["左侧项4", "右侧项4"]
      ]
    }
  ]
}

注意：opts 中正确答案在文字末尾加 * 号标记，match 题无需标记。

## 输出结构硬约束（再次强调，最高优先级）
- 顶层必须是一个 JSON 对象，**不能是数组**
- 顶层对象必须同时包含四个字段：\`title\`、\`description\`、\`difficulty\`、\`questions\`，缺一不可
- \`questions\` 数组长度必须**恰好等于 ${questionCount}**，不能是 ${Math.max(1, questionCount - 1)}，不能是 ${questionCount + 1}，必须精确为 ${questionCount}
- 禁止把题目数组作为顶层（禁止 \`[{...}, {...}]\`）
- 禁止把输出包在 \`{"data": ...}\`、\`{"quiz": ...}\` 等额外外壳里
- 输出前请自行计数核对，\`questions.length === ${questionCount}\` 才能结束输出`;
}
