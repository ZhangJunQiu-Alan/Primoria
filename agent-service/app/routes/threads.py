from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import AuthenticatedUser, require_user
from app.memory import resolve_thread_id
from app.schemas import (
    CreateThreadRequest,
    CreateThreadResponse,
    ThreadListResponse,
    ThreadMessagesResponse,
)
from app.services.supabase_client import SupabaseUserClient
from app.thread_store import build_thread_record_payload, normalize_thread_message, normalize_thread_summary

router = APIRouter(prefix='/v1/threads', tags=['threads'])


@router.post('', response_model=CreateThreadResponse)
async def create_thread(
    request: CreateThreadRequest,
    user: AuthenticatedUser = Depends(require_user),
) -> CreateThreadResponse:
    thread_id = resolve_thread_id(user.id, None)
    payload = build_thread_record_payload(user.id, request.context)
    payload['id'] = thread_id
    payload['title'] = request.title
    now = datetime.now(timezone.utc).isoformat()
    payload['last_message_at'] = now

    supabase_client = SupabaseUserClient(user.access_token)
    try:
        await supabase_client.insert('agent_threads', payload, returning='minimal')
        row = await supabase_client.select(
            'agent_threads',
            select='id,title,surface,course_id,lesson_id,block_id,locale,status,metadata,created_at,updated_at,last_message_at',
            filters={'id': f'eq.{thread_id}'},
            single=True,
        )
        return CreateThreadResponse(thread=normalize_thread_summary(row))
    finally:
        await supabase_client.close()


@router.get('', response_model=ThreadListResponse)
async def list_threads(user: AuthenticatedUser = Depends(require_user)) -> ThreadListResponse:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        rows = await supabase_client.select(
            'agent_threads',
            select='id,title,surface,course_id,lesson_id,block_id,locale,status,metadata,created_at,updated_at,last_message_at',
            filters={'user_id': f'eq.{user.id}'},
            order='last_message_at.desc.nullslast',
            limit=50,
        )
        return ThreadListResponse(threads=[normalize_thread_summary(row) for row in rows or []])
    finally:
        await supabase_client.close()


@router.get('/{thread_id}/messages', response_model=ThreadMessagesResponse)
async def get_thread_messages(
    thread_id: str,
    user: AuthenticatedUser = Depends(require_user),
) -> ThreadMessagesResponse:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        thread = await supabase_client.select(
            'agent_threads',
            select='id,title,surface,course_id,lesson_id,block_id,locale,status,metadata,created_at,updated_at,last_message_at',
            filters={'id': f'eq.{thread_id}', 'user_id': f'eq.{user.id}'},
            single=True,
        )
        if not thread:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Thread not found')

        messages = await supabase_client.select(
            'agent_thread_messages',
            select='id,role,content,metadata,created_at',
            filters={'thread_id': f'eq.{thread_id}', 'user_id': f'eq.{user.id}'},
            order='created_at.asc',
            limit=500,
        )
        return ThreadMessagesResponse(
            thread=normalize_thread_summary(thread),
            messages=[normalize_thread_message(row) for row in messages or []],
        )
    finally:
        await supabase_client.close()
