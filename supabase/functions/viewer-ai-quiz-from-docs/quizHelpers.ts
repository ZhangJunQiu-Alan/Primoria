export type TutorDocumentRecord = {
  id: string;
  filename: string;
  display_title?: string | null;
  extracted_text: string;
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

export function buildQuizPrompt(documents: TutorDocumentRecord[], questionCount: number) {
  const materials = documents
    .map((document, index) => `[文件${index + 1}: ${document.display_title?.trim() || document.filename}]\n${document.extracted_text}`)
    .join('\n\n');

  return `你是一位考试辅导老师，根据以下学习材料生成考前复习测验。
测验目标：帮助学生识别薄弱点，通过每题的解析加深对知识点的理解。

语言规则：所有输出（题目、选项、解析、标题）必须与学习材料的主要语言一致，
不得混用。

## 学习材料
${materials}

## 出题要求

题目数量：${questionCount} 题
难度等级：intermediate
  - beginner：基础概念与定义，直接从材料中找答案
  - intermediate：理解与应用，需要理解概念后作判断
  - advanced：分析与综合，需要跨概念推理

出题原则：
- 优先覆盖材料中最核心、考试最常考的知识点
- 避免出现可以不看材料就能猜到答案的题目
- 题目由易到难排列

题型比例（必须混合使用，禁止全部用同一种）：
- mc（单选）：约 40%，有且仅有一个正确答案
- mc_multi（多选）：约 20%，q 字段必须注明"多选"或"Select all that apply"，至少 2 个正确答案
- tf（判断）：约 20%
- match（匹配）：约 20%，每题 4-6 个配对

## 解析字段（exp）规范
适用题型：mc、mc_multi、tf（match 不需要 exp）

每条 exp 必须同时覆盖两种场景：
1. 答错时 → 解释最常见的错误原因，指出错在哪个认知环节
2. 答对时 → 补充这个知识点在整体知识体系中的位置或与相关概念的联系

写作要求：
- 2-4 句话，不超过 100 字
- 必须引用材料中的具体概念或表述
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

注意：opts 中正确答案在文字末尾加 * 号标记，match 题无需标记。`;
}
