from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi import Query

from app.auth import AuthenticatedUser, require_user
from app.services.supabase_client import SupabaseUserClient

router = APIRouter(prefix='/v1/viewer', tags=['viewer'])


@router.get('/subjects')
async def viewer_subjects(user: AuthenticatedUser = Depends(require_user)) -> dict:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        rows = await supabase_client.select('subjects', select='id,name,color_hex', order='name.asc', limit=200)
        return {'subjects': rows or []}
    finally:
        await supabase_client.close()


@router.get('/courses')
async def viewer_courses(
    search: str | None = Query(default=None),
    subject_id: str | None = Query(default=None),
    user: AuthenticatedUser = Depends(require_user),
) -> dict:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        filters = {'status': 'eq.published'}
        if subject_id and subject_id.strip():
            filters['subject_id'] = f'eq.{subject_id.strip()}'
        query = search.strip() if search else ''
        if query:
            rows = await supabase_client.select(
                'courses',
                select='id,title,slug,description,thumbnail_url,content_language,difficulty_level,estimated_minutes,tags,subject_id,published_at,subjects(id,name,color_hex)',
                filters={**filters, 'or': f'(title.ilike.%{query}%,description.ilike.%{query}%)'},
                order='published_at.desc',
                limit=30,
            )
        else:
            rows = await supabase_client.select(
                'courses',
                select='id,title,slug,description,thumbnail_url,content_language,difficulty_level,estimated_minutes,tags,subject_id,published_at,subjects(id,name,color_hex)',
                filters=filters,
                order='published_at.desc',
                limit=30,
            )
        return {'courses': rows or []}
    finally:
        await supabase_client.close()


@router.get('/enrollments')
async def viewer_enrollments(user: AuthenticatedUser = Depends(require_user)) -> dict:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        rows = await supabase_client.select(
            'enrollments',
            select=(
                'id,course_id,status,progress_bp,started_at,completed_at,last_accessed_at,'
                'courses(id,title,slug,description,thumbnail_url,content_language,difficulty_level,estimated_minutes,tags,subject_id,published_at,subjects(id,name,color_hex))'
            ),
            filters={'user_id': f'eq.{user.id}'},
            order='last_accessed_at.desc',
            limit=200,
        )
        return {'enrollments': rows or []}
    finally:
        await supabase_client.close()


@router.get('/auth-context')
async def viewer_auth_context(user: AuthenticatedUser = Depends(require_user)) -> dict:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        profile = await supabase_client.select(
            'profiles',
            select='id,role,username,display_name',
            filters={'id': f'eq.{user.id}'},
            single=True,
        )
        return {
            'role': str((profile or {}).get('role') or 'user'),
            'displayName': (
                str((profile or {}).get('username') or '').strip()
                or str((profile or {}).get('display_name') or '').strip()
                or (user.email or '').split('@')[0]
                or 'Learner'
            ),
        }
    finally:
        await supabase_client.close()


@router.get('/settings/bundle')
async def viewer_settings_bundle(user: AuthenticatedUser = Depends(require_user)) -> dict:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        profile = await supabase_client.select(
            'profiles',
            select='id,username,bio,avatar_url,cover_image_url,role,created_at,pinned_achievement_ids',
            filters={'id': f'eq.{user.id}'},
            single=True,
        )
        user_settings = await supabase_client.select(
            'user_settings',
            select='*',
            filters={'user_id': f'eq.{user.id}'},
            single=True,
        )
        return {'profile': profile or {}, 'userSettings': user_settings or {}}
    finally:
        await supabase_client.close()


@router.patch('/profile')
async def update_viewer_profile(payload: dict, user: AuthenticatedUser = Depends(require_user)) -> dict:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        await supabase_client.update(
            'profiles',
            payload,
            filters={'id': f'eq.{user.id}'},
            returning='minimal',
        )
        profile = await supabase_client.select(
            'profiles',
            select='id,username,bio,avatar_url,cover_image_url,role,created_at,pinned_achievement_ids',
            filters={'id': f'eq.{user.id}'},
            single=True,
        )
        return {'ok': True, 'profile': profile or {}}
    finally:
        await supabase_client.close()


@router.get('/profile')
async def viewer_profile(user: AuthenticatedUser = Depends(require_user)) -> dict:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        profile = await supabase_client.select(
            'profiles',
            select='id,username,bio,avatar_url,cover_image_url,role,created_at,pinned_achievement_ids',
            filters={'id': f'eq.{user.id}'},
            single=True,
        )
        return profile or {}
    finally:
        await supabase_client.close()


@router.get('/profile/achievements')
async def viewer_profile_achievements(user: AuthenticatedUser = Depends(require_user)) -> dict:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        all_rows = await supabase_client.select(
            'achievements',
            select='id,slug,name,description,category,rarity',
            order='rarity.asc',
            limit=500,
        )
        earned_rows = await supabase_client.select(
            'user_achievements',
            select='achievement_id,earned_at',
            filters={'user_id': f'eq.{user.id}'},
            limit=500,
        )
        earned_map = {str(row.get('achievement_id') or ''): row.get('earned_at') for row in earned_rows or []}
        return {
            'achievements': [
                {
                    'id': str(row.get('id') or ''),
                    'slug': str(row.get('slug') or ''),
                    'name': str(row.get('name') or ''),
                    'description': str(row.get('description') or ''),
                    'category': str(row.get('category') or ''),
                    'rarity': str(row.get('rarity') or 'common'),
                    'earned_at': earned_map.get(str(row.get('id') or '')),
                }
                for row in all_rows or []
            ]
        }
    finally:
        await supabase_client.close()


@router.get('/profile/stats')
async def viewer_profile_stats(user: AuthenticatedUser = Depends(require_user)) -> dict:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        stats = await supabase_client.select(
            'user_stats',
            select='current_streak,longest_streak,courses_completed,lessons_completed,total_xp,last_activity_date',
            filters={'user_id': f'eq.{user.id}'},
            single=True,
        )
        lesson_rows = await supabase_client.select(
            'lesson_completions',
            select='time_spent_seconds',
            filters={'user_id': f'eq.{user.id}'},
            limit=1000,
        )
        total_study_minutes = sum(round(float(row.get('time_spent_seconds') or 0) / 60) for row in lesson_rows or [])
        return {
            'current_streak': int((stats or {}).get('current_streak') or 0),
            'longest_streak': int((stats or {}).get('longest_streak') or 0),
            'courses_completed': int((stats or {}).get('courses_completed') or 0),
            'lessons_completed': int((stats or {}).get('lessons_completed') or 0),
            'total_xp': int((stats or {}).get('total_xp') or 0),
            'total_study_minutes': total_study_minutes,
            'last_activity_date': (stats or {}).get('last_activity_date'),
        }
    finally:
        await supabase_client.close()


@router.get('/profile/follows')
async def viewer_profile_follows(user: AuthenticatedUser = Depends(require_user)) -> dict:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        following = await supabase_client.select(
            'follows',
            select='following_id',
            filters={'follower_id': f'eq.{user.id}'},
            limit=1000,
        )
        followers = await supabase_client.select(
            'follows',
            select='follower_id',
            filters={'following_id': f'eq.{user.id}'},
            limit=1000,
        )
        return {'following': len(following or []), 'followers': len(followers or [])}
    finally:
        await supabase_client.close()


@router.get('/profile/xp-history')
async def viewer_profile_xp_history(user: AuthenticatedUser = Depends(require_user)) -> dict:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        rows = await supabase_client.select(
            'xp_transactions',
            select='amount,created_at',
            filters={'user_id': f'eq.{user.id}'},
            order='created_at.desc',
            limit=90,
        )
        return {'entries': rows or []}
    finally:
        await supabase_client.close()


@router.patch('/settings')
async def update_viewer_settings(payload: dict, user: AuthenticatedUser = Depends(require_user)) -> dict:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        existing = await supabase_client.select(
            'user_settings',
            select='*',
            filters={'user_id': f'eq.{user.id}'},
            single=True,
        )
        next_payload = {'user_id': user.id, **(existing or {}), **payload}
        if existing:
            await supabase_client.update(
                'user_settings',
                next_payload,
                filters={'user_id': f'eq.{user.id}'},
                returning='minimal',
            )
        else:
            await supabase_client.insert('user_settings', next_payload, returning='minimal')
        user_settings = await supabase_client.select(
            'user_settings',
            select='*',
            filters={'user_id': f'eq.{user.id}'},
            single=True,
        )
        return {'ok': True, 'userSettings': user_settings or {}}
    finally:
        await supabase_client.close()


@router.get('/dashboard/analytics')
async def viewer_dashboard_analytics(user: AuthenticatedUser = Depends(require_user)) -> dict:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        return await supabase_client.rpc('get_author_dashboard_analytics', {'p_days': 7, 'p_months': 6})
    finally:
        await supabase_client.close()


@router.post('/analytics-events/track')
async def viewer_track_analytics_event(payload: dict, user: AuthenticatedUser = Depends(require_user)) -> dict:
    event_type = str(payload.get('eventType') or '').strip()
    course_id = str(payload.get('courseId') or '').strip()
    lesson_id = payload.get('lessonId')
    if not event_type or not course_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='eventType and courseId are required')

    supabase_client = SupabaseUserClient(user.access_token)
    try:
        data = await supabase_client.rpc(
            'track_viewer_analytics_event',
            {
                'p_event_type': event_type,
                'p_course_id': course_id,
                'p_lesson_id': str(lesson_id).strip() if lesson_id else None,
            },
        )
        return {'ok': bool(data)}
    finally:
        await supabase_client.close()


@router.post('/courses/{course_id}/enroll')
async def viewer_enroll_course(course_id: str, user: AuthenticatedUser = Depends(require_user)) -> dict:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        existing = await supabase_client.select(
            'enrollments',
            select='id,course_id,status,progress_bp,started_at,completed_at,last_accessed_at',
            filters={'user_id': f'eq.{user.id}', 'course_id': f'eq.{course_id}'},
            single=True,
        )
        if existing:
            return existing
        rows = await supabase_client.insert(
            'enrollments',
            {'user_id': user.id, 'course_id': course_id, 'status': 'in_progress'},
        )
        row = rows[0] if isinstance(rows, list) and rows else rows
        return row or {}
    finally:
        await supabase_client.close()


@router.post('/lessons/{lesson_id}/complete')
async def viewer_complete_lesson(
    lesson_id: str,
    payload: dict,
    user: AuthenticatedUser = Depends(require_user),
) -> dict:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        data = await supabase_client.rpc(
            'complete_lesson_and_award_xp',
            {
                'p_lesson_id': lesson_id,
                'p_score': payload.get('score') or 0,
                'p_seconds': payload.get('timeSpentSeconds') or 0,
                'p_correct_count': payload.get('correctCount') or 0,
                'p_total_count': payload.get('totalCount') or 0,
            },
        )
        return data or {}
    finally:
        await supabase_client.close()
