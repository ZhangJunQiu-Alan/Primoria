from __future__ import annotations

import re
from datetime import datetime, timezone
from uuid import UUID
from uuid import uuid4

from app.schemas import (
    BuilderBlock,
    BuilderCourseMutationRequest,
    BuilderCourseDraft,
    BuilderLesson,
    BuilderPage,
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
