from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from langchain_google_genai import ChatGoogleGenerativeAI

from app.auth import AuthenticatedUser, require_user
from app.config import get_settings
from app.schemas import (
    ChatHistoryMessage,
    TutorMindMapResponse,
    TutorPresentationResponse,
    TutorQuizResponse,
    TutorToolRequest,
)

router = APIRouter(prefix='/v1/tools', tags=['tools'])


@router.post('/mindmap', response_model=TutorMindMapResponse)
async def generate_mindmap(
    request: TutorToolRequest,
    _user: AuthenticatedUser = Depends(require_user),
) -> TutorMindMapResponse:
    return await _generate_structured_tool_output('mindmap', request, TutorMindMapResponse)


@router.post('/quiz', response_model=TutorQuizResponse)
async def generate_quiz(
    request: TutorToolRequest,
    _user: AuthenticatedUser = Depends(require_user),
) -> TutorQuizResponse:
    return await _generate_structured_tool_output('quiz', request, TutorQuizResponse)


@router.post('/presentation', response_model=TutorPresentationResponse)
async def generate_presentation(
    request: TutorToolRequest,
    _user: AuthenticatedUser = Depends(require_user),
) -> TutorPresentationResponse:
    return await _generate_structured_tool_output('presentation', request, TutorPresentationResponse)


async def _generate_structured_tool_output(kind: str, request: TutorToolRequest, response_model):
    if not request.history:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='history is required')

    settings = get_settings()
    model = ChatGoogleGenerativeAI(
        model=settings.agent_model,
        google_api_key=settings.google_api_key,
        temperature=0.2,
    ).with_structured_output(response_model)

    prompt = _build_tool_prompt(kind, request)
    result = await model.ainvoke(prompt)
    return response_model.model_validate(result)


def _build_tool_prompt(kind: str, request: TutorToolRequest) -> str:
    transcript = '\n'.join(_format_history_line(item) for item in request.history if item.text.strip())
    context_lines: list[str] = []
    if request.context.surface:
        context_lines.append(f'- surface: {request.context.surface}')
    if request.context.course_id:
        context_lines.append(f'- course_id: {request.context.course_id}')
    if request.context.lesson_id:
        context_lines.append(f'- lesson_id: {request.context.lesson_id}')
    if request.context.block_id:
        context_lines.append(f'- block_id: {request.context.block_id}')
    if request.context.locale or request.context.ui_language:
        context_lines.append(f'- ui_language: {request.context.locale or request.context.ui_language}')
    if request.context.ai_tutor_persona:
        context_lines.append(f'- ai_tutor_persona: {request.context.ai_tutor_persona}')

    prompt_parts = [
        'You are Primoria AI Tutor.',
        _persona_instruction(request.context.ai_tutor_persona),
        _kind_instruction(kind),
        'Prefer concise, learner-friendly output grounded in the existing conversation.',
    ]

    if context_lines:
        prompt_parts.append('Viewer context:\n' + '\n'.join(context_lines))
    if transcript:
        prompt_parts.append('Conversation transcript:\n' + transcript)

    return '\n\n'.join(part for part in prompt_parts if part.strip())


def _format_history_line(item: ChatHistoryMessage) -> str:
    speaker = 'Learner' if item.role == 'user' else 'Tutor'
    return f'{speaker}: {item.text.strip()}'


def _persona_instruction(persona: str | None) -> str:
    if persona == 'socratic':
        return 'Adopt a Socratic tutoring style that nudges the learner to think before revealing the answer.'
    if persona == 'coach':
        return 'Adopt a direct coaching style that emphasizes clarity, momentum, and explicit next actions.'
    return 'Adopt a gentle tutoring style that is calm, supportive, and low-pressure.'


def _kind_instruction(kind: str) -> str:
    if kind == 'mindmap':
        return (
            'Generate a compact learner mind map. Use short labels and avoid duplicates. '
            'Cover the core ideas and their relationships.'
        )
    if kind == 'quiz':
        return (
            'Generate a short quiz with unambiguous answers. '
            'Focus on key concepts and likely confusion points.'
        )
    return (
        'Generate a concise presentation outline with clear slide titles and one crisp bullet per slide. '
        'Cover summary, explanation, and next-step reinforcement.'
    )
