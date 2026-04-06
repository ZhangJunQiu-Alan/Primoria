from fastapi import APIRouter, Depends, Query

from app.auth import AuthenticatedUser, require_user
from app.memory import inspect_user_memory
from app.schemas import ChatContext
from app.services.supabase_client import SupabaseUserClient

router = APIRouter(prefix='/v1/memory', tags=['memory'])


@router.get('/inspect')
async def memory_inspect(
    course_id: str | None = Query(default=None),
    lesson_id: str | None = Query(default=None),
    block_id: str | None = Query(default=None),
    locale: str | None = Query(default=None),
    day: str | None = Query(default=None),
    user: AuthenticatedUser = Depends(require_user),
) -> dict:
    context = ChatContext(
        surface='ai-tutor',
        course_id=course_id,
        lesson_id=lesson_id,
        block_id=block_id,
        locale=locale,
    )
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        return await inspect_user_memory(
            user.id,
            supabase_client=supabase_client,
            context=context,
            day_key=day,
        )
    finally:
        await supabase_client.close()
