from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes.builder import router as builder_router
from app.routes.chat import router as chat_router
from app.routes.courses import router as courses_router
from app.routes.health import router as health_router
from app.routes.interactive_visuals import router as interactive_visuals_router
from app.routes.memory import router as memory_router
from app.routes.threads import router as threads_router
from app.routes.tools import router as tools_router
from app.routes.viewer import router as viewer_router

settings = get_settings()
app = FastAPI(title='Primoria Agent Service', version='0.1.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
app.include_router(health_router)
app.include_router(chat_router)
app.include_router(memory_router)
app.include_router(builder_router)
app.include_router(interactive_visuals_router)
app.include_router(threads_router)
app.include_router(tools_router)
app.include_router(courses_router)
app.include_router(viewer_router)
