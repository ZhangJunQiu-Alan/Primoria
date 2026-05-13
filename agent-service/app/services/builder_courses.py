from __future__ import annotations

import asyncio
import json
import re
from datetime import datetime, timezone
from typing import Any
from uuid import UUID
from uuid import uuid4

from deepagents import create_deep_agent
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import get_settings
from app.memory import save_user_memory, search_user_memories
from app.model_config import gemini_model_candidates
from app.schemas import (
    BuilderBlock,
    BuilderCourseMutationRequest,
    BuilderCourseDraft,
    BuilderLesson,
    BuilderPage,
    GenerateBuilderCourseDraftRequest,
    GeneratedCourseBrief,
    GeneratedCourseCritique,
    GeneratedCourseOutline,
    GeneratedCourseOutlineLesson,
    GeneratedCourseLessonPlan,
    GeneratedCoursePlan,
)
from app.services.supabase_client import SupabaseUserClient

SCHEMA_URL = 'https://primoria.com/course-schema/v1.json'
SCHEMA_VERSION = '1.0.0'


def build_course_slug(title: str, course_id: str) -> str:
    base = re.sub(r'[^a-z0-9]+', '-', title.strip().lower()).strip('-')
    if not base:
        base = 'course'
    return f'{base}-{course_id[:8]}'


def extract_agent_text(result: Any) -> str:
    if isinstance(result, dict):
        messages = result.get('messages')
        if isinstance(messages, list) and messages:
            last = messages[-1]
            content = getattr(last, 'content', None)
            if isinstance(content, str) and content.strip():
                return content.strip()
            if isinstance(last, dict):
                raw = last.get('content')
                if isinstance(raw, str) and raw.strip():
                    return raw.strip()
        output = result.get('output')
        if isinstance(output, str) and output.strip():
            return output.strip()
    if isinstance(result, str) and result.strip():
        return result.strip()
    return ''


def normalize_json_response(raw: str) -> str:
    text = raw.strip()
    if not text:
        return ''
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fenced:
        return fenced.group(1).strip()
    return text


def generation_model_candidates() -> list[str]:
    settings = get_settings()
    return gemini_model_candidates(settings.agent_model)


def build_generation_model(model_name: str | None = None) -> ChatGoogleGenerativeAI:
    settings = get_settings()
    if not settings.google_api_key:
        raise RuntimeError('Course generation is not configured on the backend.')
    return ChatGoogleGenerativeAI(
        model=model_name or settings.agent_model,
        google_api_key=settings.google_api_key,
        temperature=0.35,
    )


async def invoke_structured_generation(prompt: str, schema_type, *, model: ChatGoogleGenerativeAI | None = None):
    if model is not None:
        structured_model = model.with_structured_output(schema_type)
        return schema_type.model_validate(await asyncio.wait_for(structured_model.ainvoke(prompt), timeout=60))

    last_exc: Exception | None = None
    for candidate in generation_model_candidates():
        try:
            active_model = build_generation_model(candidate)
            structured_model = active_model.with_structured_output(schema_type)
            return schema_type.model_validate(await asyncio.wait_for(structured_model.ainvoke(prompt), timeout=60))
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            continue
    raise RuntimeError(f'Course generation failed across candidate models: {last_exc}') from last_exc


async def build_course_generation_context(
    request: GenerateBuilderCourseDraftRequest,
    *,
    user_id: str,
    supabase_client: SupabaseUserClient,
) -> dict:
    author_preferences = await search_user_memories(
        user_id,
        supabase_client=supabase_client,
        query=request.topic,
        kind='preference',
        limit=6,
        context=None,
    )

    reference_courses = []
    try:
        rows = await supabase_client.rpc('search_courses', {'p_query': request.topic.strip()})
        reference_courses = [
            {
                'id': row.get('course_id') or row.get('id'),
                'title': row.get('title'),
                'description': row.get('description'),
                'difficulty_level': row.get('difficulty_level'),
                'estimated_minutes': row.get('estimated_minutes'),
                'tags': row.get('tags') or [],
            }
            for row in (rows or [])[:5]
            if isinstance(row, dict)
        ]
    except Exception:
        reference_courses = []

    author_recent_courses = await supabase_client.select(
        'courses',
        select='id,title,description,difficulty_level,estimated_minutes,tags,status,updated_at',
        filters={'author_id': f'eq.{user_id}'},
        order='updated_at.desc',
        limit=5,
    )

    lesson_count = {'quick': 3, 'balanced': 4, 'deep': 5}[request.pace]
    return {
        'topic': request.topic,
        'audience': request.audience or 'general learners',
        'outcome': request.outcome or 'gain a clear mental model and complete one small practice loop',
        'pace': request.pace,
        'language': request.language or 'English',
        'difficulty_level': request.difficulty_level or 'beginner',
        'target_lesson_count': lesson_count,
        'author_preferences': author_preferences,
        'reference_courses': reference_courses,
        'author_recent_courses': author_recent_courses or [],
    }


async def persist_course_generation_memory(
    *,
    user_id: str,
    supabase_client: SupabaseUserClient,
    request: GenerateBuilderCourseDraftRequest,
    brief: GeneratedCourseBrief,
    outline: GeneratedCourseOutline,
    revised: bool,
) -> dict | None:
    audience = request.audience or brief.target_learner
    outcome = request.outcome or brief.learning_outcome
    content = (
        f'As a course creator, I prefer {request.pace} {brief.difficulty_level} courses for {audience}. '
        f'I usually want around {outline.lesson_count} lessons, with outcome focus on {outcome}. '
        f'Recent generated course title: {brief.title}. '
        f'Course generation revise pass used: {"yes" if revised else "no"}.'
    )
    return await save_user_memory(
        user_id,
        content,
        supabase_client=supabase_client,
        kind='preference',
        source='builder_generation',
        metadata={
            'memory_group': 'course_generation',
            'topic': request.topic,
            'pace': request.pace,
            'difficulty_level': brief.difficulty_level,
            'lesson_count': outline.lesson_count,
            'target_learner': audience,
            'learning_outcome': outcome,
            'revised': revised,
        },
        context=None,
    )


async def generate_course_draft_pipeline(
    request: GenerateBuilderCourseDraftRequest,
    *,
    user_id: str,
    supabase_client: SupabaseUserClient,
) -> tuple[GeneratedCourseBrief, GeneratedCourseOutline, GeneratedCourseCritique, GeneratedCoursePlan, bool, dict]:
    context = await build_course_generation_context(request, user_id=user_id, supabase_client=supabase_client)
    brief = await generate_course_brief(context)
    outline = await generate_course_outline(context, brief)
    plan = await generate_course_plan(context, brief, outline)
    critique = await generate_course_critique(context, brief, outline, plan)
    revised = False
    if critique.should_revise:
        plan = await revise_course_plan(context, brief, outline, plan, critique)
        revised = True
    if not plan.lessons:
        plan.lessons = [
            GeneratedCourseLessonPlan(
                title=lesson.title,
                objective=lesson.objective,
                explanation=lesson.why_it_matters or f'Explain the core idea of {lesson.title}.',
                key_points=lesson.key_concepts[:4],
                quiz_question=f'What is the most important idea in {lesson.title}?',
                quiz_options=['The first key idea', 'A secondary detail', 'An unrelated fact'],
                quiz_answer_index=0,
                quiz_explanation='Choose the option that best matches the lesson objective.',
                reflection_prompt='How would you explain this lesson to another learner?',
            )
            for lesson in outline.lessons
        ]
    return brief, outline, critique, plan, revised, context


async def invoke_course_generation_agent(
    request: GenerateBuilderCourseDraftRequest,
    *,
    user_id: str,
    supabase_client: SupabaseUserClient,
) -> tuple[GeneratedCourseBrief, GeneratedCourseOutline, GeneratedCourseCritique, GeneratedCoursePlan, BuilderCourseDraft, bool, dict, list[str]]:
    settings = get_settings()
    model = build_generation_model()
    from app.tools import build_generation_tools

    tools = build_generation_tools(user_id, supabase_client)
    agent = create_deep_agent(
        model=model,
        tools=tools,
        system_prompt=settings.course_generation_agent_system_prompt,
    )

    prompt = build_course_generation_agent_prompt(request)
    used_tools: list[str] = []
    agent_error: Exception | None = None
    try:
        final_output = await asyncio.wait_for(
            agent.ainvoke({'messages': [{'role': 'user', 'content': prompt}]}),
            timeout=90,
        )
        raw_text = normalize_json_response(extract_agent_text(final_output))
        if raw_text:
            try:
                payload = json.loads(raw_text)
                brief = GeneratedCourseBrief.model_validate(payload.get('brief') or {})
                outline = GeneratedCourseOutline.model_validate(payload.get('outline') or {})
                critique = GeneratedCourseCritique.model_validate(payload.get('critique') or {})
                plan = GeneratedCoursePlan.model_validate(payload.get('plan') or {})
                draft = BuilderCourseDraft.model_validate(payload.get('draft') or {})
                revised = bool(payload.get('revised'))
                generation_context = payload.get('generation_context') or {}
                return brief, outline, critique, plan, draft, revised, generation_context, used_tools
            except Exception as exc:  # noqa: BLE001
                agent_error = exc
    except Exception as exc:  # noqa: BLE001
        agent_error = exc

    # Fallback to the deterministic staged pipeline if the agent result is not parseable or agent execution fails.
    brief, outline, critique, plan, revised, generation_context = await generate_course_draft_pipeline(
        request,
        user_id=user_id,
        supabase_client=supabase_client,
    )
    if agent_error:
        generation_context = {
            **generation_context,
            '_runtime': 'staged_fallback',
            '_fallback_reason': str(agent_error),
        }
    draft = build_generated_course_draft(plan, author_id=user_id)
    return brief, outline, critique, plan, draft, revised, generation_context, used_tools


async def generate_course_brief(context: dict, *, model: ChatGoogleGenerativeAI | None = None) -> GeneratedCourseBrief:
    return await invoke_structured_generation(
        build_course_brief_prompt(context),
        GeneratedCourseBrief,
        model=model,
    )


async def generate_course_outline(
    context: dict,
    brief: GeneratedCourseBrief,
    *,
    model: ChatGoogleGenerativeAI | None = None,
) -> GeneratedCourseOutline:
    return await invoke_structured_generation(
        build_course_outline_prompt(context, brief),
        GeneratedCourseOutline,
        model=model,
    )


async def generate_course_plan(
    context: dict,
    brief: GeneratedCourseBrief,
    outline: GeneratedCourseOutline,
    *,
    model: ChatGoogleGenerativeAI | None = None,
) -> GeneratedCoursePlan:
    return await invoke_structured_generation(
        build_course_plan_prompt(context, brief, outline),
        GeneratedCoursePlan,
        model=model,
    )


async def generate_course_critique(
    context: dict,
    brief: GeneratedCourseBrief,
    outline: GeneratedCourseOutline,
    plan: GeneratedCoursePlan,
    *,
    model: ChatGoogleGenerativeAI | None = None,
) -> GeneratedCourseCritique:
    return await invoke_structured_generation(
        build_course_critique_prompt(context, brief, outline, plan),
        GeneratedCourseCritique,
        model=model,
    )


async def revise_course_plan(
    context: dict,
    brief: GeneratedCourseBrief,
    outline: GeneratedCourseOutline,
    plan: GeneratedCoursePlan,
    critique: GeneratedCourseCritique,
    *,
    model: ChatGoogleGenerativeAI | None = None,
) -> GeneratedCoursePlan:
    return await invoke_structured_generation(
        build_course_revise_prompt(context, brief, outline, plan, critique),
        GeneratedCoursePlan,
        model=model,
    )


def serialize_generation_payload(value: dict | GeneratedCourseBrief | GeneratedCourseOutline | GeneratedCoursePlan) -> str:
    if hasattr(value, 'model_dump'):
        return json.dumps(value.model_dump(mode='python'), ensure_ascii=False)
    return json.dumps(value, ensure_ascii=False)


def build_course_brief_prompt(context: dict) -> str:
    return '\n\n'.join(
        [
            'You are designing a concise but high-quality online course brief for Primoria Builder.',
            'Use the supplied author preferences and reference courses as soft guidance, not as templates to copy.',
            f"Topic: {context['topic']}",
            f"Target learner: {context['audience']}",
            f"Desired outcome: {context['outcome']}",
            f"Pace: {context['pace']}",
            f"Language: {context['language']}",
            f"Difficulty: {context['difficulty_level']}",
            f"Target lesson count: {context['target_lesson_count']}",
            f"Author preferences: {context['author_preferences']}",
            f"Reference courses: {context['reference_courses']}",
            f"Author recent courses: {context['author_recent_courses']}",
            'Return a concise brief that establishes positioning, learner, difficulty, duration, tags, and design notes.',
        ]
    )


def build_course_outline_prompt(context: dict, brief: GeneratedCourseBrief) -> str:
    return '\n\n'.join(
        [
            'You are expanding a Primoria course brief into a teaching outline.',
            f'Brief: {brief.model_dump(mode="python")}',
            f"Target lesson count: {context['target_lesson_count']}",
            'Design a coherent lesson sequence with strong progression and no filler.',
            'Each lesson should have a crisp objective, a why-it-matters line, and 2-4 key concepts.',
        ]
    )


def build_course_plan_prompt(context: dict, brief: GeneratedCourseBrief, outline: GeneratedCourseOutline) -> str:
    return '\n\n'.join(
        [
            'You are converting a course brief and outline into a detailed Primoria course teaching plan.',
            f'Brief: {brief.model_dump(mode="python")}',
            f'Outline: {outline.model_dump(mode="python")}',
            'For every lesson, provide an objective, explanation, key points, one multiple-choice quiz, and a reflection prompt.',
            'Keep explanations concise, practical, and ready to map into a Builder draft.',
            f"All content should be written in {context['language']}.",
        ]
    )


def build_course_critique_prompt(
    context: dict,
    brief: GeneratedCourseBrief,
    outline: GeneratedCourseOutline,
    plan: GeneratedCoursePlan,
) -> str:
    return '\n\n'.join(
        [
            'You are reviewing a generated Primoria course plan before it becomes a Builder draft.',
            'Be tough but constructive. Decide whether revision is needed.',
            f'Context: {context}',
            f'Brief: {brief.model_dump(mode="python")}',
            f'Outline: {outline.model_dump(mode="python")}',
            f'Plan: {plan.model_dump(mode="python")}',
            'Focus on lesson progression, clarity, duplication, difficulty pacing, quiz quality, and learner usefulness.',
        ]
    )


def build_course_revise_prompt(
    context: dict,
    brief: GeneratedCourseBrief,
    outline: GeneratedCourseOutline,
    plan: GeneratedCoursePlan,
    critique: GeneratedCourseCritique,
) -> str:
    return '\n\n'.join(
        [
            'You are revising a Primoria course plan using critique feedback.',
            'Revise the plan to address the critique while preserving the course goal and lesson sequence unless change is necessary.',
            f'Context: {context}',
            f'Brief: {brief.model_dump(mode="python")}',
            f'Outline: {outline.model_dump(mode="python")}',
            f'Current plan: {plan.model_dump(mode="python")}',
            f'Critique: {critique.model_dump(mode="python")}',
            'Return the improved final course plan.',
        ]
    )


def build_course_generation_agent_prompt(request: GenerateBuilderCourseDraftRequest) -> str:
    return '\n\n'.join(
        [
            'Design a Primoria Builder course using your tools.',
            'Start by gathering generation context. Then build the brief, outline, plan, critique the plan, revise if needed, and finally produce the draft.',
            'You may call generate_complete_course_draft if you determine it is the best way to finish the task after reviewing context.',
            f'Topic: {request.topic}',
            f'Audience: {request.audience or "general learners"}',
            f'Outcome: {request.outcome or "gain a clear mental model and complete one small practice loop"}',
            f'Pace: {request.pace}',
            f'Language: {request.language or "English"}',
            f'Difficulty: {request.difficulty_level or "beginner"}',
            (
                'Return valid JSON only in this shape: '
                '{"brief": {...}, "outline": {...}, "critique": {...}, "plan": {...}, "draft": {...}, "generation_context": {...}, "revised": true|false}'
            ),
        ]
    )


def normalize_course_mutation(payload: BuilderCourseMutationRequest) -> dict:
    normalized_price = (payload.price or 0) if payload.priceTier == 'premium' else 0
    return {
        'title': payload.title.strip(),
        'description': (payload.description or '').strip() or None,
        'thumbnail_url': (payload.thumbnailUrl or '').strip() or None,
        'difficulty_level': payload.difficultyLevel,
        'estimated_minutes': payload.estimatedMinutes or 0,
        'price_tier': payload.priceTier,
        'price': normalized_price,
    }


async def save_builder_course_draft(
    draft: BuilderCourseDraft,
    user_id: str,
    supabase_client: SupabaseUserClient,
    *,
    publish: bool = False,
) -> dict:
    ensure_persistable_draft_ids(draft)
    now = datetime.now(timezone.utc).isoformat()
    course_payload = {
        'author_id': user_id,
        'slug': build_course_slug(draft.metadata.title, draft.course_id),
        'title': draft.metadata.title,
        'description': draft.metadata.description,
        'thumbnail_url': draft.metadata.thumbnail,
        'difficulty_level': draft.metadata.difficulty_level or 'beginner',
        'estimated_minutes': draft.metadata.estimated_minutes or 0,
        'tags': [tag.strip() for tag in draft.metadata.tags if tag.strip()],
        'status': 'published' if publish else 'draft',
        'updated_at': now,
    }
    if publish:
        course_payload['published_at'] = now

    existing_course = await supabase_client.select(
        'courses',
        select='id',
        filters={'id': f'eq.{draft.course_id}', 'author_id': f'eq.{user_id}'},
        single=True,
    )

    if existing_course:
        await supabase_client.update(
            'courses',
            course_payload,
            filters={'id': f'eq.{draft.course_id}', 'author_id': f'eq.{user_id}'},
            returning='minimal',
        )
    else:
        await supabase_client.insert(
            'courses',
            {
                'id': draft.course_id,
                **course_payload,
            },
            returning='minimal',
        )

    existing_lessons = await supabase_client.select(
        'lessons',
        select='id',
        filters={'course_id': f'eq.{draft.course_id}'},
        limit=500,
    )
    existing_lesson_ids = {str(row.get('id') or '') for row in existing_lessons or [] if row.get('id')}
    next_lesson_ids: list[str] = []

    for index, lesson in enumerate(draft.lessons):
        next_lesson_ids.append(lesson.lesson_id)
        lesson_payload = {
            'course_id': draft.course_id,
            'title': lesson.title,
            'sort_key': 1000 + index * 1000,
            'type': 'interactive',
            'duration_seconds': 0,
            'unlock_type': 'none',
            'content_json': serialize_lesson_snapshot(lesson),
            'updated_at': now,
        }
        if lesson.lesson_id in existing_lesson_ids:
            await supabase_client.update(
                'lessons',
                lesson_payload,
                filters={'id': f'eq.{lesson.lesson_id}', 'course_id': f'eq.{draft.course_id}'},
                returning='minimal',
            )
        else:
            await supabase_client.insert(
                'lessons',
                {
                    'id': lesson.lesson_id,
                    **lesson_payload,
                },
                returning='minimal',
            )

    stale_lesson_ids = sorted(existing_lesson_ids - set(next_lesson_ids))
    if stale_lesson_ids:
        await supabase_client.delete(
            'lessons',
            filters={
                'course_id': f'eq.{draft.course_id}',
                'id': f'in.({",".join(stale_lesson_ids)})',
            },
            returning='minimal',
        )

    return {
        'course_id': draft.course_id,
        'status': 'published' if publish else 'draft',
        'saved_lessons': len(draft.lessons),
    }


def ensure_persistable_draft_ids(draft: BuilderCourseDraft) -> None:
    _assert_uuid(draft.course_id, 'course_id')
    for lesson in draft.lessons:
        _assert_uuid(lesson.lesson_id, f'lesson_id ({lesson.title})')


def _assert_uuid(value: str, field_name: str) -> None:
    try:
        UUID(str(value))
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f'{field_name} must be a UUID for persistence') from exc


def serialize_lesson_snapshot(lesson: BuilderLesson) -> dict:
    return {
        'lesson_id': lesson.lesson_id,
        'title': lesson.title,
        'pages': [page.model_dump(mode='python') for page in lesson.pages],
    }


def build_lesson_draft_json(lesson_id: str, title: str) -> dict:
    return {
        'lesson_id': lesson_id,
        'title': title,
        'pages': [
            {
                'page_id': str(uuid4()),
                'order': 0,
                'blocks': [],
            }
        ],
    }


def build_generated_course_draft(plan: GeneratedCoursePlan, *, author_id: str | None = None) -> BuilderCourseDraft:
    course_id = str(uuid4())
    lesson_plans = plan.lessons or [
        GeneratedCourseLessonPlan(
            title='Lesson 1',
            objective='Build a first mental model of the topic.',
            explanation=plan.description,
            key_points=['Understand the core idea', 'Recognize one practical application'],
            quiz_question='Which statement best matches the core idea of this lesson?',
            quiz_options=['The first option', 'The second option'],
            quiz_answer_index=0,
            quiz_explanation='Review the explanation and key points above.',
            reflection_prompt='What is one thing you understand more clearly now?',
        )
    ]
    lessons = [build_generated_lesson(plan_lesson, lesson_index=index) for index, plan_lesson in enumerate(lesson_plans)]
    metadata: dict = {
        'title': plan.title.strip(),
        'description': plan.description.strip(),
        'tags': [tag.strip() for tag in plan.tags if tag.strip()],
        'difficulty_level': plan.difficulty_level,
        'estimated_minutes': max(10, int(plan.estimated_minutes or 30)),
    }
    if author_id:
        metadata['author'] = {'userId': author_id, 'displayName': 'Primoria AI'}
    return BuilderCourseDraft.model_validate(
        {
            '$schema': SCHEMA_URL,
            'schema_version': SCHEMA_VERSION,
            'course_id': course_id,
            'metadata': metadata,
            'lessons': [lesson.model_dump(mode='python') for lesson in lessons],
        }
    )


def build_generated_lesson(plan: GeneratedCourseLessonPlan, *, lesson_index: int) -> BuilderLesson:
    lesson_id = str(uuid4())
    intro_page_id = str(uuid4())
    practice_page_id = str(uuid4())

    intro_block = build_text_block(
        content=build_intro_text(plan),
        order=0,
    )
    reflection_block = build_text_block(
        content=plan.reflection_prompt or 'Take one minute to explain this idea back in your own words.',
        order=0,
    )
    quiz_block = BuilderBlock(
        id=str(uuid4()),
        type='multiple-choice',
        position={'order': 0},
        content={
            'question': plan.quiz_question.strip(),
            'options': build_quiz_options(plan.quiz_options, plan.quiz_answer_index),
            'allowMultiple': False,
            'explanation': (plan.quiz_explanation or '').strip(),
        },
    )

    return BuilderLesson(
        lesson_id=lesson_id,
        title=plan.title.strip() or f'Lesson {lesson_index + 1}',
        pages=[
            BuilderPage(page_id=intro_page_id, order=0, blocks=[intro_block]),
            BuilderPage(
                page_id=practice_page_id,
                order=1,
                blocks=[quiz_block, reflection_block],
            ),
        ],
    )


def normalize_course_list_row(row: dict | None) -> dict:
    payload = row or {}
    lessons = sorted(payload.get('lessons') or [], key=lambda item: item.get('sort_key') or 0)
    return {
        'id': str(payload.get('id') or ''),
        'title': str(payload.get('title') or ''),
        'description': payload.get('description'),
        'thumbnail_url': payload.get('thumbnail_url'),
        'status': str(payload.get('status') or 'draft'),
        'published_at': payload.get('published_at'),
        'created_at': payload.get('created_at'),
        'updated_at': payload.get('updated_at'),
        'difficulty_level': str(payload.get('difficulty_level') or 'beginner'),
        'estimated_minutes': int(payload.get('estimated_minutes') or 0),
        'price_tier': str(payload.get('price_tier') or 'free'),
        'price': int(payload.get('price') or 0),
        'tags': [str(tag) for tag in payload.get('tags') or []],
        'lessons': [
            {
                'id': str(lesson.get('id') or ''),
                'title': str(lesson.get('title') or ''),
                'sort_key': int(lesson.get('sort_key') or 0),
                'duration_seconds': int(lesson.get('duration_seconds') or 0),
                'type': str(lesson.get('type') or 'interactive'),
                'updated_at': lesson.get('updated_at'),
            }
            for lesson in lessons
        ],
    }


def build_intro_text(plan: GeneratedCourseLessonPlan) -> dict:
    sections = [plan.objective.strip(), '', plan.explanation.strip()]
    if plan.key_points:
        sections.extend(['', 'Key points:'])
        sections.extend([f'• {point.strip()}' for point in plan.key_points if point.strip()])
    return {
        'format': 'richtext',
        'value': '\n'.join(section for section in sections if section is not None).strip(),
    }


def build_text_block(*, content: dict | str, order: int) -> BuilderBlock:
    normalized_content = content if isinstance(content, dict) else {'format': 'richtext', 'value': content}
    return BuilderBlock(
        id=str(uuid4()),
        type='text',
        position={'order': order},
        content=normalized_content,
    )


def build_quiz_options(options: list[str], answer_index: int) -> list[dict]:
    cleaned = [option.strip() for option in options if option.strip()]
    if len(cleaned) < 2:
        cleaned = cleaned + ['Need more context']
    cleaned = cleaned[:4]
    correct_index = min(max(answer_index, 0), len(cleaned) - 1)
    return [
        {
            'id': f'opt-{index + 1}',
            'text': option,
            'isCorrect': index == correct_index,
        }
        for index, option in enumerate(cleaned)
    ]
