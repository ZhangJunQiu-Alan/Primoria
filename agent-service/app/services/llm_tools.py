from __future__ import annotations

import json
import re
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, Field, ValidationError

from app.model_service import extract_candidate_texts, invoke_gemini_generate_content, invoke_text_model, normalize_generated_json_text
from app.schemas import (
    ChatHistoryMessage,
    CreateInteractiveVisualRequest,
    CreateInteractiveVisualResponse,
    CreateMindMapFromDocsRequest,
    CreateMindMapFromDocsResponse,
    CreateQuizFromDocsRequest,
    CreateQuizFromDocsResponse,
    GenerateTutorReplyRequest,
    LegacyMindMapNode,
)
from app.services.builder_courses import build_course_slug
from app.services.interactive_visuals import generate_interactive_visual_html
from app.services.supabase_client import SupabaseUserClient

MAX_COMBINED_TEXT_LENGTH = 70_000
DEFAULT_QUIZ_MODEL = 'gemini-2.0-flash'
FALLBACK_QUIZ_MODELS = ('gemini-2.5-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash')
MAX_QUIZ_OUTPUT_TOKENS = 16_384
MAX_MINDMAP_OUTPUT_TOKENS = 4096

TutorDocumentRecord = dict[str, Any]
QuizOutputLanguage = Literal['en', 'zh-CN']
QuizQuestionType = Literal['mc', 'mc_multi', 'tf', 'match']


class MultipleChoiceQuestion(BaseModel):
    type: Literal['mc']
    q: str = Field(min_length=1)
    opts: list[str] = Field(min_length=2)
    exp: str = Field(min_length=1)


class MultiSelectQuestion(BaseModel):
    type: Literal['mc_multi']
    q: str = Field(min_length=1)
    opts: list[str] = Field(min_length=2)
    exp: str = Field(min_length=1)


class TrueFalseQuestion(BaseModel):
    type: Literal['tf']
    stmt: str = Field(min_length=1)
    ans: bool
    exp: str = Field(min_length=1)


class MatchingQuestion(BaseModel):
    type: Literal['match']
    pairs: list[tuple[str, str]] = Field(min_length=2)


QuizQuestion = MultipleChoiceQuestion | MultiSelectQuestion | TrueFalseQuestion | MatchingQuestion


class QuizDsl(BaseModel):
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    difficulty: Literal['beginner', 'intermediate', 'advanced']
    questions: list[QuizQuestion]


class RawMindMapNode(BaseModel):
    label: str = Field(min_length=1)
    children: list['RawMindMapNode'] | None = None


class MindMapAiResponse(BaseModel):
    title: str = Field(min_length=1)
    root: RawMindMapNode


RawMindMapNode.model_rebuild()

LANGUAGE_INSTRUCTIONS: dict[QuizOutputLanguage, str] = {
    'en': 'All output (titles, questions, options, explanations) MUST be written in English. Even if the study material is in another language, translate terminology into natural English. Do not mix languages.',
    'zh-CN': '所有输出（标题、题目、选项、解析）必须使用简体中文。即使学习材料是其他语言，也必须翻译为自然的简体中文表述，不得混用语言。',
}

QUIZ_WRAPPER_KEYS = ('quiz', 'data', 'result', 'response', 'payload', 'output')
QUIZ_TYPE_ALIASES = {
    'mc': 'mc',
    'mcq': 'mc',
    'single_choice': 'mc',
    'single-choice': 'mc',
    'multiple_choice': 'mc',
    'multiple-choice': 'mc',
    'multiplechoice': 'mc',
    'mc_multi': 'mc_multi',
    'mcmulti': 'mc_multi',
    'multi_select': 'mc_multi',
    'multi-select': 'mc_multi',
    'multiple_select': 'mc_multi',
    'multiple-select': 'mc_multi',
    'multi_answer': 'mc_multi',
    'tf': 'tf',
    'true_false': 'tf',
    'true-false': 'tf',
    'truefalse': 'tf',
    'boolean': 'tf',
    'match': 'match',
    'matching': 'match',
    'match_pairs': 'match',
    'match-pairs': 'match',
    'pairs': 'match',
}


def _compact_id(prefix: str) -> str:
    return f'{prefix}-{uuid4()}'


def _strip_star(option: str) -> tuple[str, bool]:
    trimmed = option.strip()
    is_correct = trimmed.endswith('*')
    return trimmed.rstrip('*').strip(), is_correct


def _get_true_false_question_limit(question_count: int) -> int:
    return question_count // 10


def _select_questions_for_quiz(questions: list[QuizQuestion], question_count: int) -> list[QuizQuestion]:
    true_false_limit = _get_true_false_question_limit(question_count)
    selected: list[QuizQuestion] = []
    deferred_true_false: list[QuizQuestion] = []
    selected_true_false_count = 0

    for question in questions:
        if len(selected) >= question_count:
            break
        if question.type == 'tf' and selected_true_false_count >= true_false_limit:
            deferred_true_false.append(question)
            continue
        if question.type == 'tf':
            selected_true_false_count += 1
        selected.append(question)

    for question in deferred_true_false:
        if len(selected) >= question_count:
            break
        selected.append(question)
    return selected


def _interleave_question_types(questions: list[QuizQuestion]) -> list[QuizQuestion]:
    buckets: dict[QuizQuestionType, list[QuizQuestion]] = {}
    for question in questions:
        buckets.setdefault(question.type, []).append(question)

    result: list[QuizQuestion] = []
    last_type: QuizQuestionType | None = None
    total = len(questions)
    while len(result) < total:
        entries = [(kind, items) for kind, items in buckets.items() if items]
        if not entries:
            break
        entries.sort(key=lambda entry: len(entry[1]), reverse=True)
        kind, items = next((entry for entry in entries if entry[0] != last_type), entries[0])
        result.append(items.pop(0))
        last_type = kind
    return result


def _build_multiple_choice_block(question: MultipleChoiceQuestion | MultiSelectQuestion, order: int) -> dict[str, Any]:
    options = []
    for index, option in enumerate(question.opts):
        text, is_correct = _strip_star(option)
        options.append({'id': _compact_id(f'option-{order}-{index}'), 'text': text, 'isCorrect': is_correct})

    correct_count = sum(1 for option in options if option['isCorrect'])
    if question.type == 'mc' and correct_count != 1:
        raise ValueError(f'Question {order + 1} must contain exactly one correct option.')
    if question.type == 'mc_multi' and correct_count < 2:
        raise ValueError(f'Question {order + 1} must contain at least two correct options.')

    return {
        'id': _compact_id('block-mc'),
        'type': 'multiple-choice',
        'position': {'order': order},
        'content': {
            'question': question.q,
            'allowMultiple': question.type == 'mc_multi',
            'options': options,
            'explanation': question.exp,
        },
    }


def _build_block(question: QuizQuestion, order: int) -> dict[str, Any]:
    if question.type in {'mc', 'mc_multi'}:
        return _build_multiple_choice_block(question, order)
    if question.type == 'tf':
        return {
            'id': _compact_id('block-tf'),
            'type': 'true-false',
            'position': {'order': order},
            'content': {
                'statement': question.stmt,
                'isTrue': question.ans,
                'explanation': question.exp,
            },
        }
    return {
        'id': _compact_id('block-match'),
        'type': 'matching',
        'position': {'order': order},
        'content': {
            'pairs': [
                {'id': _compact_id('pair'), 'left': left, 'right': right}
                for left, right in question.pairs
            ],
        },
    }


def _compile_quiz_dsl_to_lesson_content(dsl: QuizDsl) -> dict[str, Any]:
    pages: list[dict[str, Any]] = []
    for index, question in enumerate(_interleave_question_types(dsl.questions)):
        page_index = index // 5
        if len(pages) <= page_index:
            pages.append({'page_id': _compact_id('page'), 'order': page_index, 'blocks': []})
        pages[page_index]['blocks'].append(_build_block(question, len(pages[page_index]['blocks'])))

    lesson_id = str(uuid4())
    return {
        'lessonId': lesson_id,
        'lessonTitle': dsl.title,
        'contentJson': {
            'lesson_id': lesson_id,
            'title': dsl.title,
            'pages': pages,
        },
    }


def _normalize_question_shape(value: Any) -> Any:
    if not isinstance(value, dict):
        return value
    out = dict(value)
    raw_type = str(out.get('type') or '').strip().lower()
    if raw_type in QUIZ_TYPE_ALIASES:
        out['type'] = QUIZ_TYPE_ALIASES[raw_type]

    aliases = (
        ('question', 'q'),
        ('prompt', 'q'),
        ('explanation', 'exp'),
        ('rationale', 'exp'),
        ('statement', 'stmt'),
        ('claim', 'stmt'),
    )
    for source, target in aliases:
        if isinstance(out.get(source), str) and not isinstance(out.get(target), str):
            out[target] = out[source]
    if isinstance(out.get('text'), str) and not isinstance(out.get('q'), str) and not isinstance(out.get('stmt'), str):
        out['q'] = out['text']
    for source in ('options', 'choices', 'answers'):
        if isinstance(out.get(source), list) and not isinstance(out.get('opts'), list):
            out['opts'] = out[source]
    for source in ('answer', 'correct', 'is_true'):
        if isinstance(out.get(source), bool) and not isinstance(out.get('ans'), bool):
            out['ans'] = out[source]
    if isinstance(out.get('matches'), list) and not isinstance(out.get('pairs'), list):
        out['pairs'] = out['matches']
    if isinstance(out.get('items'), list) and not isinstance(out.get('pairs'), list):
        items = out['items']
        if all(isinstance(entry, list) and len(entry) == 2 for entry in items):
            out['pairs'] = items

    if str(out.get('type') or '') not in {'mc', 'mc_multi', 'tf', 'match'}:
        if isinstance(out.get('stmt'), str) and isinstance(out.get('ans'), bool):
            out['type'] = 'tf'
        elif isinstance(out.get('pairs'), list):
            out['type'] = 'match'
        elif isinstance(out.get('q'), str) and isinstance(out.get('opts'), list):
            correct_count = sum(1 for option in out['opts'] if isinstance(option, str) and option.strip().endswith('*'))
            out['type'] = 'mc_multi' if correct_count > 1 else 'mc'
    return out


def _looks_like_quiz_question(value: Any) -> bool:
    normalized = _normalize_question_shape(value)
    if not isinstance(normalized, dict):
        return False
    if normalized.get('type') in {'mc', 'mc_multi', 'tf', 'match'}:
        return True
    return (
        isinstance(normalized.get('q'), str) and isinstance(normalized.get('opts'), list)
    ) or (
        isinstance(normalized.get('stmt'), str) and isinstance(normalized.get('ans'), bool)
    ) or isinstance(normalized.get('pairs'), list)


def _find_question_array(source: dict[str, Any]) -> list[Any] | None:
    queue = [source]
    seen: set[int] = set()
    while queue:
        current = queue.pop(0)
        if id(current) in seen:
            continue
        seen.add(id(current))
        for value in current.values():
            if isinstance(value, list) and value and all(_looks_like_quiz_question(entry) for entry in value):
                return value
            if isinstance(value, dict):
                queue.append(value)
    return None


def _unwrap_quiz_record(record: dict[str, Any]) -> dict[str, Any]:
    for key in QUIZ_WRAPPER_KEYS:
        candidate = record.get(key)
        if isinstance(candidate, dict):
            return candidate
    return record


def _salvage_quiz_shape(parsed: Any, fallback_title: str, fallback_description: str) -> Any:
    if isinstance(parsed, list):
        return {
            'title': fallback_title,
            'description': fallback_description,
            'difficulty': 'intermediate',
            'questions': [_normalize_question_shape(question) for question in parsed],
        }
    if not isinstance(parsed, dict):
        return parsed

    base = _unwrap_quiz_record(parsed)
    questions = base.get('questions') if isinstance(base.get('questions'), list) else None
    if questions is None:
        questions = _find_question_array(base) or (_find_question_array(parsed) if base is not parsed else None)

    return {
        'title': base.get('title') if isinstance(base.get('title'), str) and base['title'].strip() else fallback_title,
        'description': (
            base.get('description')
            if isinstance(base.get('description'), str) and base['description'].strip()
            else fallback_description
        ),
        'difficulty': base.get('difficulty') if isinstance(base.get('difficulty'), str) else 'intermediate',
        'questions': [_normalize_question_shape(question) for question in (questions or [])],
    }


def _build_quiz_prompt(documents: list[TutorDocumentRecord], question_count: int, language: QuizOutputLanguage) -> str:
    true_false_limit = _get_true_false_question_limit(question_count)
    materials = '\n\n'.join(
        f"[文件{index + 1}: {str(document.get('display_title') or '').strip() or document.get('filename') or 'document'}]\n{document.get('extracted_text') or ''}"
        for index, document in enumerate(documents)
    )
    return f"""你是一位考试辅导老师，根据以下学习材料生成考前复习测验。
测验目标：帮助学生识别概念层面的薄弱点，通过每题的解析加深对知识点的理解，并能把所学原则迁移到新场景。

语言规则（最高优先级，必须严格遵守）：
{LANGUAGE_INSTRUCTIONS[language]}

## 核心原则：考概念，不考例子（最高优先级，优先于下面所有规则）

材料里用到的类名、方法名、变量名、人物名、具体代码片段，只是作者用来讲解概念的脚手架，本身没有记忆价值。合格的测验必须测学生是否理解原则并能迁移到新场景，而不是学生是否记住作者选了哪个例子。

必须按以下方式出题：
- 题干可以引用材料中的术语、原则名、概念名、模式名。
- 需要代码或场景时，由你自己构造一个新的小片段或新情境。
- 比较两个概念的差别、适用边界、主要收益、典型误用。
- 材料里的具体例子只允许作为背景引子出现，绝不能作为选项/答案本身。

## 学习材料
{materials}

## 出题要求
题目数量：恰好 {question_count} 题，questions 数组 length 必须精确等于 {question_count}
难度等级：intermediate

题型数量与比例：
- match：总题数 ≤ 15 → 恰好 1 道；总题数 16-30 → 恰好 2 道；每道 4-6 个配对
- tf：本次最多 {true_false_limit} 道
- mc + mc_multi：剩余全部由单选/多选填充

输出格式：只输出 JSON，直接从 {{ 开始，不要 markdown：
{{
  "title": "根据材料内容起一个准确的测验标题",
  "description": "一句话说明本测验覆盖哪些主题",
  "difficulty": "intermediate",
  "questions": [
    {{"type":"mc","q":"题目文字","opts":["选项A","正确答案B*","选项C","选项D"],"exp":"解析文字"}},
    {{"type":"mc_multi","q":"题目文字（多选）","opts":["正确答案A*","正确答案B*","错误选项C","错误选项D"],"exp":"解析文字"}},
    {{"type":"tf","stmt":"判断题陈述句","ans":true,"exp":"解析文字"}},
    {{"type":"match","pairs":[["左侧项1","右侧项1"],["左侧项2","右侧项2"],["左侧项3","右侧项3"],["左侧项4","右侧项4"]]}}
  ]
}}
"""


def _build_mindmap_prompt(documents: list[TutorDocumentRecord], user_prompt: str) -> str:
    materials = '\n\n'.join(
        f"[文件{index + 1}: {str(document.get('display_title') or '').strip() or document.get('filename') or 'document'}]\n{document.get('extracted_text') or ''}"
        for index, document in enumerate(documents)
    )
    sections = [
        '你是一位学习教练，请根据以下学习资料生成一张适合复习的思维导图。',
        '目标：帮助学习者快速看清知识主干、关键分支和概念之间的连接。',
        '',
        '语言规则：',
        '- 输出语言必须与资料主语言一致',
        '- 不要混用语言',
        '',
        '结构规则：',
        '- 必须输出单根树形结构，不要输出平铺列表',
        '- 根节点概括整份资料主题',
        '- 总层级控制在 2 到 4 层',
        '- 总节点数不要超过 40 个',
        '- 每个节点最多 6 个直接子节点',
        '- 节点标签使用短语，不写完整长句',
        '- 避免“介绍”“内容”“其他”这类空泛标签',
        '',
        '输出格式：只返回 JSON，从 { 开始，不要 markdown，不要解释文字。',
        '{"title":"简洁准确的导图标题","root":{"label":"根节点","children":[{"label":"一级分支","children":[{"label":"二级分支"}]}]}}',
        '',
        '## 学习资料',
        materials,
    ]
    if user_prompt.strip():
        sections.extend(['', '## 用户追加要求', user_prompt.strip(), '', '注意：用户追加要求只能作为补充约束，不能改变 JSON 结构要求。'])
    return '\n'.join(sections)


async def _fetch_tutor_documents(supabase_client: SupabaseUserClient, document_ids: list[str]) -> list[TutorDocumentRecord]:
    if not document_ids:
        raise ValueError('Please select at least one document.')

    filters = {'id': f'in.({",".join(document_ids)})'}
    try:
        rows = await supabase_client.select(
            'tutor_documents',
            select='id,filename,display_title,extracted_text',
            filters=filters,
            limit=100,
        )
    except Exception as exc:
        message = str(exc).lower()
        if 'display_title' not in message and '42703' not in message and 'schema cache' not in message:
            raise
        rows = await supabase_client.select(
            'tutor_documents',
            select='id,filename,extracted_text',
            filters=filters,
            limit=100,
        )
        rows = [{**row, 'display_title': None} for row in rows or []]

    if len(rows or []) != len(document_ids):
        raise LookupError('Some selected documents could not be found.')
    by_id = {str(row.get('id') or ''): row for row in rows or []}
    return [by_id[document_id] for document_id in document_ids if document_id in by_id]


def _check_combined_text_length(documents: list[TutorDocumentRecord]) -> None:
    combined = sum(len(str(document.get('extracted_text') or '')) for document in documents)
    if combined > MAX_COMBINED_TEXT_LENGTH:
        raise OverflowError('The selected documents are too long. Remove some and try again.')


async def generate_tutor_reply(request: GenerateTutorReplyRequest) -> GenerateTutorReplyResponse:
    if not request.history:
        raise ValueError('history is required')
    transcript = '\n'.join(_format_history_line(message) for message in request.history if message.text.strip())
    context_text = json.dumps(request.context or {}, ensure_ascii=False)
    system_prompt = (
        'You are Primoria AI Tutor. Reply concisely and supportively. '
        'Ground the reply in the conversation and viewer context.'
    )
    prompt = f'Persona: {request.persona or "gentle"}\nViewer context: {context_text}\n\nConversation:\n{transcript}'
    reply = await invoke_text_model(
        system_prompt=system_prompt,
        user_prompt=prompt,
        temperature=0.3,
    )
    if not reply:
        raise RuntimeError('AI Tutor returned an empty response.')
    return GenerateTutorReplyResponse(reply=reply)


def _format_history_line(message: ChatHistoryMessage) -> str:
    speaker = 'Learner' if message.role == 'user' else 'Tutor'
    return f'{speaker}: {message.text.strip()}'


async def _generate_quiz_dsl(
    *,
    prompt: str,
    question_count: int,
    fallback_title: str,
    fallback_description: str,
) -> QuizDsl:
    last_error = 'AI quiz generation failed.'
    for model in [DEFAULT_QUIZ_MODEL, *[candidate for candidate in FALLBACK_QUIZ_MODELS if candidate != DEFAULT_QUIZ_MODEL]]:
        try:
            payload = await invoke_gemini_generate_content(
                system_prompt='You generate exam review quizzes. Return valid JSON only.',
                user_prompt=prompt,
                model=model,
                temperature=0.6,
                max_output_tokens=MAX_QUIZ_OUTPUT_TOKENS,
                response_mime_type='application/json',
            )
        except Exception as exc:
            last_error = str(exc)
            continue

        for text in extract_candidate_texts(payload):
            try:
                parsed = json.loads(normalize_generated_json_text(text))
            except json.JSONDecodeError as exc:
                last_error = str(exc)
                continue
            try:
                dsl = QuizDsl.model_validate(_salvage_quiz_shape(parsed, fallback_title, fallback_description))
            except ValidationError as exc:
                last_error = str(exc)
                continue
            if len(dsl.questions) < question_count:
                last_error = f'AI returned only {len(dsl.questions)} questions (need exactly {question_count}).'
                continue
            selected = _select_questions_for_quiz(dsl.questions, question_count)
            if len(selected) != question_count:
                last_error = f'Question selection produced {len(selected)} items (need exactly {question_count}).'
                continue
            dsl.questions = selected
            dsl.difficulty = 'intermediate'
            return dsl
    raise RuntimeError(last_error)


async def create_quiz_from_docs(
    request: CreateQuizFromDocsRequest,
    *,
    user_id: str,
    supabase_client: SupabaseUserClient,
) -> CreateQuizFromDocsResponse:
    document_ids = list(dict.fromkeys(document_id.strip() for document_id in request.documentIds if document_id.strip()))
    question_count = request.questionCount
    if question_count < 5 or question_count > 30:
        raise ValueError('questionCount must be an integer between 5 and 30.')

    documents = await _fetch_tutor_documents(supabase_client, document_ids)
    _check_combined_text_length(documents)
    fallback_source = str(documents[0].get('display_title') or '').strip() or str(documents[0].get('filename') or 'Study Materials')
    fallback_title = f'{fallback_source} · AI 复习测验' if request.language == 'zh-CN' else f'{fallback_source} — AI Review Quiz'
    fallback_description = (
        '由 AI 根据上传的学习资料自动生成的复习测验。'
        if request.language == 'zh-CN'
        else 'An AI-generated review quiz based on your uploaded study materials.'
    )
    dsl = await _generate_quiz_dsl(
        prompt=_build_quiz_prompt(documents, question_count, request.language),
        question_count=question_count,
        fallback_title=fallback_title,
        fallback_description=fallback_description,
    )
    compiled = _compile_quiz_dsl_to_lesson_content(dsl)
    course_id = str(uuid4())
    await _ensure_profile_exists(supabase_client, user_id)
    course_rows = await supabase_client.insert(
        'courses',
        {
            'id': course_id,
            'author_id': user_id,
            'slug': build_course_slug(dsl.title, course_id),
            'title': dsl.title,
            'description': dsl.description,
            'difficulty_level': 'intermediate',
            'estimated_minutes': question_count * 2,
            'price_tier': 'free',
            'price': 0,
            'status': 'draft',
            'tags': [],
        },
    )
    try:
        await supabase_client.insert(
            'lessons',
            {
                'id': compiled['lessonId'],
                'course_id': course_id,
                'title': compiled['lessonTitle'],
                'sort_key': 1000,
                'type': 'interactive',
                'unlock_type': 'none',
                'duration_seconds': question_count * 120,
                'content_json': compiled['contentJson'],
            },
            returning='minimal',
        )
    except Exception:
        await supabase_client.delete('courses', filters={'id': f'eq.{course_id}'}, returning='minimal')
        raise

    course_row = course_rows[0] if isinstance(course_rows, list) and course_rows else {}
    return CreateQuizFromDocsResponse(courseId=course_id, courseTitle=str(course_row.get('title') or dsl.title))


async def _ensure_profile_exists(supabase_client: SupabaseUserClient, user_id: str) -> None:
    existing = await supabase_client.select('profiles', select='id', filters={'id': f'eq.{user_id}'}, single=True)
    if existing:
        return
    try:
        await supabase_client.insert('profiles', {'id': user_id}, returning='minimal')
    except Exception:
        pass


MAX_TITLE_LENGTH = 80
MAX_LABEL_LENGTH = 72
MAX_TOTAL_NODES = 40
MAX_CHILDREN_PER_NODE = 6
MAX_DEPTH = 4


def _normalize_label(value: str) -> str:
    return re.sub(r'\s+', ' ', value).strip()[:MAX_LABEL_LENGTH]


def _sanitize_mindmap_tree(root: RawMindMapNode) -> LegacyMindMapNode:
    state = {'count': 0}

    def visit(node: RawMindMapNode, depth: int) -> LegacyMindMapNode | None:
        if state['count'] >= MAX_TOTAL_NODES:
            return None
        label = _normalize_label(node.label)
        if not label:
            return None
        state['count'] += 1
        children: list[LegacyMindMapNode] = []
        if depth < MAX_DEPTH:
            for child in (node.children or [])[:MAX_CHILDREN_PER_NODE]:
                next_child = visit(child, depth + 1)
                if next_child:
                    children.append(next_child)
                if state['count'] >= MAX_TOTAL_NODES:
                    break
        return LegacyMindMapNode(id=_compact_id('node'), label=label, children=children)

    sanitized = visit(root, 0)
    if not sanitized:
        raise RuntimeError('Mind map root could not be normalized.')
    return sanitized


def _to_persisted_mindmap_document(root: LegacyMindMapNode) -> dict[str, Any]:
    nodes: dict[str, Any] = {}

    def visit(node: LegacyMindMapNode, parent_id: str | None) -> None:
        child_ids = [child.id for child in node.children or []]
        nodes[node.id] = {
            'id': node.id,
            'parentId': parent_id,
            'childIds': child_ids,
            'label': node.label,
            'collapsed': False,
            'icon': None,
            'tags': [],
            'noteHtml': '',
            'imageUrl': None,
            'links': [],
            'documentRefs': [],
        }
        for child in node.children or []:
            visit(child, node.id)

    visit(root, None)
    return {'rootNodeId': root.id, 'nodes': nodes}


async def _generate_mindmap(prompt: str) -> tuple[str, LegacyMindMapNode]:
    last_error = 'AI mind map generation failed.'
    for model in [DEFAULT_QUIZ_MODEL, *[candidate for candidate in FALLBACK_QUIZ_MODELS if candidate != DEFAULT_QUIZ_MODEL]]:
        try:
            payload = await invoke_gemini_generate_content(
                system_prompt='You generate grounded learning mind maps. Return valid JSON only.',
                user_prompt=prompt,
                model=model,
                temperature=0.4,
                max_output_tokens=MAX_MINDMAP_OUTPUT_TOKENS,
                response_mime_type='application/json',
            )
        except Exception as exc:
            last_error = str(exc)
            continue
        for text in extract_candidate_texts(payload):
            try:
                parsed = json.loads(normalize_generated_json_text(text))
                mindmap = MindMapAiResponse.model_validate(parsed)
            except Exception as exc:
                last_error = str(exc)
                continue
            title = re.sub(r'\s+', ' ', mindmap.title).strip()[:MAX_TITLE_LENGTH]
            if not title:
                last_error = 'Mind map title is empty.'
                continue
            return title, _sanitize_mindmap_tree(mindmap.root)
    raise RuntimeError(last_error)


async def create_mindmap_from_docs(
    request: CreateMindMapFromDocsRequest,
    *,
    user_id: str,
    supabase_client: SupabaseUserClient,
) -> CreateMindMapFromDocsResponse:
    document_ids = list(dict.fromkeys(document_id.strip() for document_id in request.documentIds if document_id.strip()))
    documents = await _fetch_tutor_documents(supabase_client, document_ids)
    _check_combined_text_length(documents)
    user_prompt = (request.prompt or '').strip()
    title, root = await _generate_mindmap(_build_mindmap_prompt(documents, user_prompt))
    rows = await supabase_client.insert(
        'ai_tutor_mindmaps',
        {
            'user_id': user_id,
            'title': title,
            'source_document_ids': document_ids,
            'user_prompt': user_prompt,
            'document': _to_persisted_mindmap_document(root),
        },
    )
    row = rows[0] if isinstance(rows, list) and rows else {}
    if not row.get('id'):
        rows = await supabase_client.select(
            'ai_tutor_mindmaps',
            select='id',
            filters={'user_id': f'eq.{user_id}'},
            order='created_at.desc',
            limit=1,
        )
        row = rows[0] if isinstance(rows, list) and rows else {}
    return CreateMindMapFromDocsResponse(title=title, mindMapId=str(row.get('id') or ''), root=root)


def _infer_visual_template(prompt: str, preferred_template: str | None = None) -> str:
    normalized_template = (preferred_template or '').strip().lower()
    if normalized_template and normalized_template != 'generic':
        return normalized_template
    if re.search(r'(cos|cosine|sine|sin|wave|curve|trig|frequency|amplitude|phase)', prompt, re.I):
        return 'wave'
    if re.search(r'(pendulum|swing|oscillat)', prompt, re.I):
        return 'pendulum'
    if re.search(r'(projectile|trajectory|parabola|launch angle|launch)', prompt, re.I):
        return 'projectile'
    if re.search(r'(newton|force|collision|momentum|action|reaction)', prompt, re.I):
        return 'collision'
    return 'generic'


def _infer_visual_mode(prompt: str, preferred_mode: str | None = None) -> str:
    if preferred_mode in {'simulation', 'graph', 'scenario', 'story'}:
        return preferred_mode
    if re.search(r'(graph|curve|plot|chart|sine|cosine|wave)', prompt, re.I):
        return 'graph'
    return 'simulation'


def _summarize_prompt(prompt: str, fallback: str) -> str:
    normalized = re.sub(r'\s+', ' ', prompt).strip()
    if not normalized:
        return fallback
    normalized = normalized[:1].upper() + normalized[1:]
    return f'{normalized[:69].strip()}...' if len(normalized) > 72 else normalized


async def create_interactive_visual(request: CreateInteractiveVisualRequest) -> CreateInteractiveVisualResponse:
    html = await generate_interactive_visual_html(
        prompt=request.prompt,
        template=request.template,
        title=request.title,
        description=request.description,
    )
    template = _infer_visual_template(request.prompt, request.template)
    mode = _infer_visual_mode(request.prompt, request.experienceMode)
    title = request.title or _summarize_prompt(
        request.prompt,
        'AI Element' if template == 'generic' else f'{template[:1].upper()}{template[1:]} Explorer',
    )
    return CreateInteractiveVisualResponse(
        template=template,
        experienceMode=mode,
        title=title,
        description=request.description,
        aiPrompt=request.prompt,
        generatedHtml=html,
        runtime={'surface': request.surface, 'language': request.language},
    )
