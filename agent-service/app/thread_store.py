from __future__ import annotations

from typing import Any

from app.schemas import AgentThreadMessage, AgentThreadSummary, ChatContext


def build_thread_record_payload(user_id: str, context: ChatContext) -> dict[str, Any]:
    metadata: dict[str, Any] = {}
    if context.ai_tutor_persona:
        metadata['ai_tutor_persona'] = context.ai_tutor_persona
    if context.ui_language:
        metadata['ui_language'] = context.ui_language

    payload: dict[str, Any] = {
        'user_id': user_id,
        'surface': context.surface or 'ai-tutor',
        'status': 'active',
    }
    if context.course_id:
        payload['course_id'] = context.course_id
    if context.lesson_id:
        payload['lesson_id'] = context.lesson_id
    if context.block_id:
        payload['block_id'] = context.block_id
    if context.locale or context.ui_language:
        payload['locale'] = context.locale or context.ui_language
    if metadata:
        payload['metadata'] = metadata
    return payload


def normalize_thread_summary(row: dict | None) -> AgentThreadSummary:
    payload = row or {}
    metadata = payload.get('metadata') if isinstance(payload.get('metadata'), dict) else {}
    return AgentThreadSummary(
        id=str(payload.get('id') or ''),
        title=str(payload.get('title')) if payload.get('title') is not None else None,
        surface=str(payload.get('surface') or 'ai-tutor'),
        course_id=str(payload.get('course_id')) if payload.get('course_id') is not None else None,
        lesson_id=str(payload.get('lesson_id')) if payload.get('lesson_id') is not None else None,
        block_id=str(payload.get('block_id')) if payload.get('block_id') is not None else None,
        locale=str(payload.get('locale')) if payload.get('locale') is not None else None,
        ai_tutor_persona=(
            str(metadata.get('ai_tutor_persona'))
            if isinstance(metadata, dict) and metadata.get('ai_tutor_persona') is not None
            else None
        ),
        status=str(payload.get('status') or 'active'),
        created_at=str(payload.get('created_at')) if payload.get('created_at') is not None else None,
        updated_at=str(payload.get('updated_at')) if payload.get('updated_at') is not None else None,
        last_message_at=str(payload.get('last_message_at')) if payload.get('last_message_at') is not None else None,
    )


def normalize_thread_message(row: dict | None) -> AgentThreadMessage:
    payload = row or {}
    metadata = payload.get('metadata') if isinstance(payload.get('metadata'), dict) else {}
    return AgentThreadMessage(
        id=str(payload.get('id') or ''),
        role=str(payload.get('role') or 'assistant'),
        content=str(payload.get('content') or ''),
        created_at=str(payload.get('created_at')) if payload.get('created_at') is not None else None,
        metadata=metadata if isinstance(metadata, dict) else {},
    )
