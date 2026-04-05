from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.agent import invoke_chat_agent, stream_chat_agent
from app.auth import AuthenticatedUser, require_user
from app.memory import resolve_thread_id
from app.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix='/v1', tags=['chat'])


@router.post('/chat', response_model=ChatResponse)
async def chat(request: ChatRequest, user: AuthenticatedUser = Depends(require_user)) -> ChatResponse:
    hydrated = request.model_copy(update={'thread_id': resolve_thread_id(user.id, request.thread_id)})
    return await invoke_chat_agent(hydrated, user)


@router.post('/chat/stream')
async def chat_stream(request: ChatRequest, user: AuthenticatedUser = Depends(require_user)) -> StreamingResponse:
    hydrated = request.model_copy(update={'thread_id': resolve_thread_id(user.id, request.thread_id)})
    return StreamingResponse(
        stream_chat_agent(hydrated, user),
        media_type='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    )
