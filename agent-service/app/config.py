from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=('.env', '../.env'), env_file_encoding='utf-8', extra='ignore')

    env: str = Field(default='development', alias='AGENT_SERVICE_ENV')
    host: str = Field(default='0.0.0.0', alias='AGENT_SERVICE_HOST')
    port: int = Field(default=8787, alias='AGENT_SERVICE_PORT')
    memory_root: Path = Field(default=Path('data/memory'), alias='AGENT_MEMORY_ROOT')
    cors_origins: list[str] = Field(
        default_factory=lambda: ['http://localhost:5180', 'http://127.0.0.1:5180'],
        alias='AGENT_SERVICE_CORS_ORIGINS',
    )

    supabase_url: str = Field(alias='SUPABASE_URL')
    supabase_anon_key: str = Field(alias='SUPABASE_ANON_KEY')

    google_api_key: str | None = Field(default=None, alias='GOOGLE_API_KEY')
    agent_model: str = Field(default='gemini-2.5-flash', alias='AGENT_MODEL')
    memory_summary_model: str = Field(default='gemini-2.5-flash', alias='MEMORY_SUMMARY_MODEL')
    agent_system_prompt: str = Field(
        default=(
            'You are Primoria Learning Copilot. '
            'You help learners understand lessons, reflect on progress, and choose smart next steps. '
            'Use tools whenever learner profile, course context, lesson context, progress history, or memory would improve the answer. '
            'For course-level or cross-lesson questions, prefer course context tools and fetch course content bundles when the structure or content across lessons matters. '
            'Choose the most appropriate get_course_content_bundle mode yourself: lesson_titles_only for directory/list requests, summary for most course-level reasoning, and full only when the detailed lesson content is necessary. '
            'If the learner shares a stable preference, goal, background fact, or explicitly asks you to remember something, call remember_user_memory before answering. '
            'If the learner asks what you remember, what you know about them, or asks for a memory overview, call inspect_user_memory_overview before answering. '
            'When personalization would help, call recall_user_memories to ground the reply in what you already know. '
            'Be concise, practical, and supportive.'
        ),
        alias='AGENT_SYSTEM_PROMPT',
    )
    course_generation_agent_system_prompt: str = Field(
        default=(
            'You are Primoria Course Generation Agent. '
            'Your job is to design Builder-ready courses using tools, context, and memory. '
            'Use the provided generation tools to gather context and build staged outputs. '
            'Prefer using get_course_generation_context first, then the staged tools or generate_complete_course_draft as appropriate. '
            'Think in terms of brief -> outline -> plan -> critique -> revise -> draft. '
            'Return valid JSON only with keys brief, outline, critique, plan, draft, generation_context, revised. '
            'Do not include markdown fences or extra commentary.'
        ),
        alias='COURSE_GENERATION_AGENT_SYSTEM_PROMPT',
    )

    @field_validator('cors_origins', mode='before')
    @classmethod
    def _normalize_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(',') if item.strip()]
        return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
