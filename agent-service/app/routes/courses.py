from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import AuthenticatedUser, require_user
from app.schemas import CourseDetailLesson, CourseDetailResponse
from app.services.supabase_client import SupabaseUserClient

router = APIRouter(prefix='/v1/courses', tags=['courses'])


@router.get('/{course_id}/detail', response_model=CourseDetailResponse)
async def get_course_detail(
    course_id: str,
    user: AuthenticatedUser = Depends(require_user),
) -> CourseDetailResponse:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        course = await supabase_client.select(
            'courses',
            select=(
                'id, title, slug, description, thumbnail_url, content_language, '
                'difficulty_level, estimated_minutes, tags, subject_id, published_at, subjects(id, name, color_hex)'
            ),
            filters={'id': f'eq.{course_id}'},
            single=True,
        )
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Course not found')

        lessons = await supabase_client.select(
            'lessons',
            select='id, title, sort_key, xp_reward, duration_seconds, is_locked, unlock_type',
            filters={'course_id': f'eq.{course_id}'},
            order='sort_key.asc',
            limit=500,
        )

        completed_lesson_ids: list[str] = []
        if lessons:
            lesson_ids = [str(lesson.get('id') or '') for lesson in lessons if lesson.get('id')]
            if lesson_ids:
                completion_rows = await supabase_client.select(
                    'lesson_completions',
                    select='lesson_id',
                    filters={
                        'user_id': f'eq.{user.id}',
                        'lesson_id': f'in.({",".join(lesson_ids)})',
                    },
                )
                completed_lesson_ids = [str(row.get('lesson_id') or '') for row in completion_rows or [] if row.get('lesson_id')]

        enrollment = await supabase_client.select(
            'enrollments',
            select='id, course_id, status, progress_bp, started_at, completed_at, last_accessed_at',
            filters={'user_id': f'eq.{user.id}', 'course_id': f'eq.{course_id}'},
            single=True,
        )
        if enrollment:
            enrollment = {
                **enrollment,
                'courses': course,
            }

        normalized_lessons = [
            CourseDetailLesson(
                id=str(lesson.get('id') or ''),
                title=str(lesson.get('title') or ''),
                sort_key=int(lesson.get('sort_key') or 0),
                xp_reward=int(lesson.get('xp_reward') or 0),
                duration_seconds=int(lesson.get('duration_seconds') or 0),
                is_locked=lesson.get('is_locked') is True,
                unlock_type=str(lesson.get('unlock_type') or 'none'),
            )
            for lesson in lessons or []
        ]

        return CourseDetailResponse(
            course=course,
            lessons=normalized_lessons,
            completed_lesson_ids=completed_lesson_ids,
            enrollment=enrollment,
        )
    finally:
        await supabase_client.close()
