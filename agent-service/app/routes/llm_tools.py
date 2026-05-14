from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import AuthenticatedUser, require_user
from app.schemas import (
    CreateInteractiveVisualRequest,
    CreateInteractiveVisualResponse,
    CreateMindMapFromDocsRequest,
    CreateMindMapFromDocsResponse,
    CreateQuizFromDocsRequest,
    CreateQuizFromDocsResponse,
    GenerateTutorReplyRequest,
    GenerateTutorReplyResponse,
)
from app.services.llm_tools import (
    create_interactive_visual,
    create_mindmap_from_docs,
    create_quiz_from_docs,
    generate_tutor_reply,
)
from app.services.supabase_client import SupabaseUserClient

router = APIRouter(prefix='/v1/llm', tags=['llm'])


@router.post('/tutor/reply', response_model=GenerateTutorReplyResponse)
async def tutor_reply(
    request: GenerateTutorReplyRequest,
    _user: AuthenticatedUser = Depends(require_user),
) -> GenerateTutorReplyResponse:
    try:
        return await generate_tutor_reply(request)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.post('/tutor/quiz-from-docs', response_model=CreateQuizFromDocsResponse)
async def quiz_from_docs(
    request: CreateQuizFromDocsRequest,
    user: AuthenticatedUser = Depends(require_user),
) -> CreateQuizFromDocsResponse:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        return await create_quiz_from_docs(request, user_id=user.id, supabase_client=supabase_client)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except OverflowError as exc:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    finally:
        await supabase_client.close()


@router.post('/tutor/mindmap-from-docs', response_model=CreateMindMapFromDocsResponse)
async def mindmap_from_docs(
    request: CreateMindMapFromDocsRequest,
    user: AuthenticatedUser = Depends(require_user),
) -> CreateMindMapFromDocsResponse:
    supabase_client = SupabaseUserClient(user.access_token)
    try:
        return await create_mindmap_from_docs(request, user_id=user.id, supabase_client=supabase_client)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except OverflowError as exc:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    finally:
        await supabase_client.close()


@router.post('/interactive-visual', response_model=CreateInteractiveVisualResponse)
async def interactive_visual(
    request: CreateInteractiveVisualRequest,
    _user: AuthenticatedUser = Depends(require_user),
) -> CreateInteractiveVisualResponse:
    try:
        return await create_interactive_visual(request)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

