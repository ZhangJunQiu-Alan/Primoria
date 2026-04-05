from fastapi import APIRouter

from app.schemas import HealthResponse

router = APIRouter(tags=['health'])


@router.get('/healthz', response_model=HealthResponse)
async def healthz() -> HealthResponse:
    return HealthResponse()
