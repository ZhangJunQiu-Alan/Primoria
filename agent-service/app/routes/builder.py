from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import AuthenticatedUser, require_user
from app.config import get_settings
from app.schemas import (
    BuilderAddLessonRequest,
    BuilderCourseMutationRequest,
    BuilderImportCourseRequest,
    GenerateBuilderCourseDraftRequest,
    GenerateBuilderCourseDraftResponse,
    GeneratedCoursePlan,
    PublishBuilderCourseRequest,
    SaveBuilderCourseDraftRequest,
    SaveBuilderCourseDraftResponse,
)
from app.services.builder_courses import (
    build_course_slug,
    build_generated_course_draft,
    build_lesson_draft_json,
    normalize_course_list_row,
    normalize_course_mutation,
    save_builder_course_draft,
)
from app.services.supabase_client import SupabaseUserClient
from uuid import uuid4

from app.schemas import BuilderCourseDraft

router = APIRouter(prefix='/v1/builder', tags=['builder'])


@router.get('/courses')
async def list_builder_courses(user: AuthenticatedUser = Depends(require_user)) -> dict:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        rows = await supabase_client.select(
            'courses',
            select=(
                'id,title,description,thumbnail_url,status,published_at,created_at,updated_at,'
                'difficulty_level,estimated_minutes,price_tier,price,tags,'
                'lessons(id,title,sort_key,duration_seconds,type,updated_at)'
            ),
            filters={'author_id': f'eq.{user.id}'},
            order='updated_at.desc',
            limit=200,
        )
        return {'courses': [normalize_course_list_row(row) for row in rows or []]}
    finally:
        await supabase_client.close()


@router.get('/courses/{course_id}/draft')
async def get_builder_course_draft(course_id: str, user: AuthenticatedUser = Depends(require_user)) -> dict:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        row = await supabase_client.select(
            'courses',
            select=(
                'id,title,description,status,difficulty_level,estimated_minutes,tags,thumbnail_url,'
                'lessons(id,title,sort_key,content_json)'
            ),
            filters={'id': f'eq.{course_id}', 'author_id': f'eq.{user.id}'},
            single=True,
        )
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Course not found')

        lessons = sorted(row.get('lessons') or [], key=lambda item: item.get('sort_key') or 0)
        return {
            'course_id': str(row.get('id') or ''),
            'metadata': {
                'title': str(row.get('title') or ''),
                'description': row.get('description'),
                'difficulty_level': row.get('difficulty_level'),
                'estimated_minutes': int(row.get('estimated_minutes') or 0),
                'tags': [str(tag) for tag in row.get('tags') or []],
                'thumbnail': row.get('thumbnail_url'),
            },
            'lessons': [
                lesson.get('content_json')
                or {
                    'lesson_id': str(lesson.get('id') or ''),
                    'title': str(lesson.get('title') or ''),
                    'pages': [],
                }
                for lesson in lessons
            ],
        }
    finally:
        await supabase_client.close()


@router.post('/courses/save', response_model=SaveBuilderCourseDraftResponse)
async def save_course_draft(
    request: SaveBuilderCourseDraftRequest,
    user: AuthenticatedUser = Depends(require_user),
) -> SaveBuilderCourseDraftResponse:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        try:
            payload = await save_builder_course_draft(request.draft, user.id, supabase_client, publish=False)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
        return SaveBuilderCourseDraftResponse(**payload)
    finally:
        await supabase_client.close()


@router.post('/courses/{course_id}/publish', response_model=SaveBuilderCourseDraftResponse)
async def publish_course_draft(
    course_id: str,
    request: PublishBuilderCourseRequest,
    user: AuthenticatedUser = Depends(require_user),
) -> SaveBuilderCourseDraftResponse:
    if request.draft is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='draft is required for publish')
    if request.draft.course_id != course_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='course_id does not match draft')

    supabase_client = SupabaseUserClient(user.access_token)
    try:
        try:
            payload = await save_builder_course_draft(request.draft, user.id, supabase_client, publish=True)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
        return SaveBuilderCourseDraftResponse(**payload)
    finally:
        await supabase_client.close()


@router.post('/course-drafts/generate', response_model=GenerateBuilderCourseDraftResponse)
async def generate_course_draft(
    request: GenerateBuilderCourseDraftRequest,
    user: AuthenticatedUser = Depends(require_user),
) -> GenerateBuilderCourseDraftResponse:
    from langchain_google_genai import ChatGoogleGenerativeAI

    settings = get_settings()
    if not settings.google_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='Course generation is not configured on the backend.',
        )

    model = ChatGoogleGenerativeAI(
        model=settings.agent_model,
        google_api_key=settings.google_api_key,
        temperature=0.4,
    ).with_structured_output(GeneratedCoursePlan)

    prompt = build_course_generation_prompt(request)
    plan = GeneratedCoursePlan.model_validate(await model.ainvoke(prompt))
    draft = build_generated_course_draft(plan, author_id=user.id)

    persisted = False
    status_value = None
    if request.persist:
        supabase_client = SupabaseUserClient(user.access_token)
        try:
            try:
                await save_builder_course_draft(draft, user.id, supabase_client, publish=False)
            except ValueError as exc:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
            persisted = True
            status_value = 'draft'
        finally:
            await supabase_client.close()

    return GenerateBuilderCourseDraftResponse(
        draft=draft,
        persisted=persisted,
        status=status_value,
    )


@router.post('/courses')
async def create_builder_course(
    request: BuilderCourseMutationRequest,
    user: AuthenticatedUser = Depends(require_user),
) -> dict:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        course_id = str(uuid4())
        normalized = normalize_course_mutation(request)
        await supabase_client.insert(
            'courses',
            {
                'id': course_id,
                'author_id': user.id,
                'slug': build_course_slug(normalized['title'], course_id),
                'status': 'draft',
                'tags': normalized.get('tags', []),
                **normalized,
            },
            returning='minimal',
        )
        first_lesson_id = str(uuid4())
        await supabase_client.insert(
            'lessons',
            {
                'id': first_lesson_id,
                'course_id': course_id,
                'title': 'Lesson 1',
                'sort_key': 1000,
                'type': 'interactive',
                'unlock_type': 'none',
                'content_json': build_lesson_draft_json(first_lesson_id, 'Lesson 1'),
            },
            returning='minimal',
        )
        row = await supabase_client.select(
            'courses',
            select=(
                'id,title,description,thumbnail_url,status,published_at,created_at,updated_at,'
                'difficulty_level,estimated_minutes,price_tier,price,tags,'
                'lessons(id,title,sort_key,duration_seconds,type,updated_at)'
            ),
            filters={'id': f'eq.{course_id}'},
            single=True,
        )
        return {'course': normalize_course_list_row(row)}
    finally:
        await supabase_client.close()


@router.patch('/courses/{course_id}')
async def update_builder_course(
    course_id: str,
    request: BuilderCourseMutationRequest,
    user: AuthenticatedUser = Depends(require_user),
) -> dict:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        normalized = normalize_course_mutation(request)
        await supabase_client.update(
            'courses',
            {
                **normalized,
                'slug': build_course_slug(normalized['title'], course_id),
            },
            filters={'id': f'eq.{course_id}', 'author_id': f'eq.{user.id}'},
            returning='minimal',
        )
        row = await supabase_client.select(
            'courses',
            select=(
                'id,title,description,thumbnail_url,status,published_at,created_at,updated_at,'
                'difficulty_level,estimated_minutes,price_tier,price,tags,'
                'lessons(id,title,sort_key,duration_seconds,type,updated_at)'
            ),
            filters={'id': f'eq.{course_id}', 'author_id': f'eq.{user.id}'},
            single=True,
        )
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Course not found')
        return {'course': normalize_course_list_row(row)}
    finally:
        await supabase_client.close()


@router.delete('/courses/{course_id}')
async def delete_builder_course(course_id: str, user: AuthenticatedUser = Depends(require_user)) -> dict:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        await supabase_client.delete(
            'courses',
            filters={'id': f'eq.{course_id}', 'author_id': f'eq.{user.id}'},
            returning='minimal',
        )
        return {'ok': True, 'course_id': course_id}
    finally:
        await supabase_client.close()


@router.post('/courses/{course_id}/duplicate')
async def duplicate_builder_course(course_id: str, user: AuthenticatedUser = Depends(require_user)) -> dict:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        source = await supabase_client.select(
            'courses',
            select=(
                'id,title,description,thumbnail_url,difficulty_level,estimated_minutes,price_tier,price,tags,'
                'lessons(id,title,sort_key,content_json,duration_seconds,type,is_locked,unlock_type,'
                'prerequisite_lesson_id,paywall_product_id,xp_reward)'
            ),
            filters={'id': f'eq.{course_id}'},
            single=True,
        )
        if not source:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Course not found')
        new_course_id = str(uuid4())
        copy_title = f"{str(source.get('title') or 'Untitled')} (copy)"
        await supabase_client.insert(
            'courses',
            {
                'id': new_course_id,
                'author_id': user.id,
                'slug': build_course_slug(copy_title, new_course_id),
                'title': copy_title,
                'description': source.get('description'),
                'thumbnail_url': source.get('thumbnail_url'),
                'status': 'draft',
                'difficulty_level': source.get('difficulty_level') or 'beginner',
                'estimated_minutes': source.get('estimated_minutes') or 0,
                'price_tier': source.get('price_tier') or 'free',
                'price': source.get('price') or 0,
                'tags': [str(tag) for tag in source.get('tags') or []],
            },
            returning='minimal',
        )

        source_lessons = sorted(source.get('lessons') or [], key=lambda item: item.get('sort_key') or 0)
        lesson_id_map = {str(lesson.get('id')): str(uuid4()) for lesson in source_lessons if lesson.get('id')}
        if source_lessons:
            lesson_rows = []
            for lesson in source_lessons:
                source_lesson_id = str(lesson.get('id') or '')
                lesson_rows.append(
                    {
                        'id': lesson_id_map[source_lesson_id],
                        'course_id': new_course_id,
                        'title': str(lesson.get('title') or ''),
                        'sort_key': lesson.get('sort_key') or 0,
                        'content_json': lesson.get('content_json') or {},
                        'duration_seconds': lesson.get('duration_seconds') or 0,
                        'type': lesson.get('type') or 'interactive',
                        'is_locked': lesson.get('is_locked') is True,
                        'unlock_type': lesson.get('unlock_type') or 'none',
                        'prerequisite_lesson_id': lesson_id_map.get(str(lesson.get('prerequisite_lesson_id') or '')),
                        'paywall_product_id': lesson.get('paywall_product_id'),
                        'xp_reward': lesson.get('xp_reward') or 0,
                    }
                )
            await supabase_client.insert('lessons', lesson_rows, returning='minimal')

        row = await supabase_client.select(
            'courses',
            select=(
                'id,title,description,thumbnail_url,status,published_at,created_at,updated_at,'
                'difficulty_level,estimated_minutes,price_tier,price,tags,'
                'lessons(id,title,sort_key,duration_seconds,type,updated_at)'
            ),
            filters={'id': f'eq.{new_course_id}'},
            single=True,
        )
        return {'course': normalize_course_list_row(row)}
    finally:
        await supabase_client.close()


@router.post('/courses/import')
async def import_builder_course(
    request: BuilderImportCourseRequest,
    user: AuthenticatedUser = Depends(require_user),
) -> dict:
    draft = BuilderCourseDraft.model_validate(request.raw)
    imported_draft = draft.model_copy(update={'course_id': str(uuid4())})
    for lesson in imported_draft.lessons:
        lesson.lesson_id = str(uuid4())
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        result = await save_builder_course_draft(imported_draft, user.id, supabase_client, publish=False)
        return result
    finally:
        await supabase_client.close()


@router.post('/courses/{course_id}/lessons')
async def add_builder_lesson(
    course_id: str,
    request: BuilderAddLessonRequest,
    user: AuthenticatedUser = Depends(require_user),
) -> dict:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        last_lesson = await supabase_client.select(
            'lessons',
            select='sort_key',
            filters={'course_id': f'eq.{course_id}'},
            order='sort_key.desc',
            limit=1,
            single=True,
        )
        lesson_id = str(uuid4())
        next_sort_key = int((last_lesson or {}).get('sort_key') or 0) + 1000
        row = await supabase_client.insert(
            'lessons',
            {
                'id': lesson_id,
                'course_id': course_id,
                'title': request.title.strip(),
                'sort_key': next_sort_key,
                'type': 'interactive',
                'unlock_type': 'none',
                'content_json': build_lesson_draft_json(lesson_id, request.title.strip()),
            },
        )
        return {'lesson': (row or [{}])[0] if isinstance(row, list) else row}
    finally:
        await supabase_client.close()


@router.delete('/courses/{course_id}/lessons/{lesson_id}')
async def delete_builder_lesson(
    course_id: str,
    lesson_id: str,
    user: AuthenticatedUser = Depends(require_user),
) -> dict:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        course = await supabase_client.select(
            'courses',
            select='id',
            filters={'id': f'eq.{course_id}', 'author_id': f'eq.{user.id}'},
            single=True,
        )
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Course not found')
        await supabase_client.delete(
            'lessons',
            filters={'id': f'eq.{lesson_id}', 'course_id': f'eq.{course_id}'},
            returning='minimal',
        )
        return {'ok': True, 'lesson_id': lesson_id}
    finally:
        await supabase_client.close()


def build_course_generation_prompt(request: GenerateBuilderCourseDraftRequest) -> str:
    desired_language = request.language or 'English'
    difficulty = request.difficulty_level or 'beginner'
    audience = request.audience or 'general learners'
    outcome = request.outcome or 'gain a clear mental model and complete one small practice loop'
    lesson_count = {'quick': 3, 'balanced': 4, 'deep': 5}[request.pace]

    return '\n\n'.join(
        [
            'You design compact, high-quality online courses for Primoria Builder.',
            (
                'Generate a course plan that can be turned into a Builder draft. '
                'Keep the course practical, structured, and concise.'
            ),
            f'Topic: {request.topic}',
            f'Target learner: {audience}',
            f'Learning outcome: {outcome}',
            f'Pace: {request.pace}',
            f'Difficulty: {difficulty}',
            f'Language: {desired_language}',
            (
                f'Return exactly {lesson_count} lessons. '
                'Each lesson must include objective, explanation, key points, one multiple-choice check question, '
                '2-4 answer options, a correct answer index, and a short reflection prompt.'
            ),
            'Prefer short lesson titles and realistic teaching language.',
        ]
    )
