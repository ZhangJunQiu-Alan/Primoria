from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import AuthenticatedUser, require_user
from app.schemas import GenerateBuilderInteractiveVisualRequest, GenerateBuilderInteractiveVisualResponse
from app.services.interactive_visuals import generate_interactive_visual_html

router = APIRouter(prefix='/v1/builder/interactive-visuals', tags=['interactive-visuals'])


@router.post('/generate', response_model=GenerateBuilderInteractiveVisualResponse)
async def generate_interactive_visual(
    request: GenerateBuilderInteractiveVisualRequest,
    _user: AuthenticatedUser = Depends(require_user),
) -> GenerateBuilderInteractiveVisualResponse:
    try:
        html = await generate_interactive_visual_html(
            prompt=request.prompt,
            template=request.template,
            title=request.title,
            description=request.description,
        )
    except RuntimeError as exc:
        detail = str(exc)
        status_code = status.HTTP_503_SERVICE_UNAVAILABLE if 'configured' in detail else status.HTTP_502_BAD_GATEWAY
        raise HTTPException(status_code=status_code, detail=detail) from exc

    return GenerateBuilderInteractiveVisualResponse(html=html)
