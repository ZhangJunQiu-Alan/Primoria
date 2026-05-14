from __future__ import annotations

import asyncio
from typing import Any, Literal

import httpx
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

from app.config import get_settings

Provider = Literal['google', 'openai', 'anthropic']


def _normalize_provider(value: str | None) -> Provider:
    normalized = str(value or '').strip().lower()
    if normalized in {'openai', 'anthropic'}:
        return normalized
    return 'google'


def _normalize_optional(value: str | None) -> str:
    return str(value or '').strip()


def _provider_api_key(provider: Provider, override: str | None = None) -> str:
    settings = get_settings()
    explicit = _normalize_optional(override)
    if explicit:
        return explicit
    if provider == 'openai':
        return _normalize_optional(settings.openai_api_key or settings.ai_api_key)
    if provider == 'anthropic':
        return _normalize_optional(settings.anthropic_api_key or settings.ai_api_key)
    return _normalize_optional(settings.google_api_key or settings.gemini_api_key or settings.ai_api_key)


def _provider_model(provider: Provider, override: str | None = None) -> str:
    settings = get_settings()
    explicit = _normalize_optional(override)
    if explicit:
        return explicit
    shared = _normalize_optional(settings.ai_model)
    if provider == 'openai':
        return shared or _normalize_optional(settings.openai_model) or 'gpt-5.4-mini'
    if provider == 'anthropic':
        return shared or _normalize_optional(settings.anthropic_model) or 'claude-sonnet-4-6'
    return shared or _normalize_optional(settings.google_model or settings.agent_model) or 'gemini-2.5-flash'


def _provider_base_url(provider: Provider, override: str | None = None) -> str:
    settings = get_settings()
    explicit = _normalize_optional(override)
    if explicit:
        return explicit
    if provider == 'openai':
        return _normalize_optional(settings.openai_base_url or settings.ai_base_url)
    if provider == 'anthropic':
        return _normalize_optional(settings.anthropic_base_url or settings.ai_base_url)
    return _normalize_optional(settings.ai_base_url or settings.gemini_base_url)


def build_chat_model(
    *,
    provider: str | None = None,
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    temperature: float = 0.3,
) -> Any:
    active_provider = _normalize_provider(provider or get_settings().ai_provider)
    active_api_key = _provider_api_key(active_provider, api_key)
    if not active_api_key:
        raise ValueError(f'{active_provider.title()} API key is required.')

    active_model = _provider_model(active_provider, model)
    active_base_url = _provider_base_url(active_provider, base_url)

    if active_provider == 'openai':
        normalized_base_url = active_base_url.rstrip('/')
        if normalized_base_url and not normalized_base_url.endswith('/v1'):
            normalized_base_url = f'{normalized_base_url}/v1'
        return ChatOpenAI(
            model=active_model,
            api_key=active_api_key,
            base_url=normalized_base_url or None,
            temperature=temperature,
        )

    if active_provider == 'anthropic':
        normalized_base_url = active_base_url.rstrip('/')
        if normalized_base_url.endswith('/v1'):
            normalized_base_url = normalized_base_url[:-3]
        return ChatAnthropic(
            model=active_model,
            api_key=active_api_key,
            base_url=normalized_base_url or None,
            temperature=temperature,
        )

    return ChatGoogleGenerativeAI(
        model=active_model,
        google_api_key=active_api_key,
        base_url=active_base_url or None,
        temperature=temperature,
    )


async def invoke_text_model(
    *,
    system_prompt: str,
    user_prompt: str,
    provider: str | None = None,
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    temperature: float = 0.3,
    timeout_seconds: float = 60.0,
) -> str:
    chat_model = build_chat_model(
        provider=provider,
        model=model,
        api_key=api_key,
        base_url=base_url,
        temperature=temperature,
    )
    result = await asyncio.wait_for(
        chat_model.ainvoke(
            [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt),
            ],
        ),
        timeout=timeout_seconds,
    )
    return extract_message_text(result)


def extract_message_text(result: Any) -> str:
    content = getattr(result, 'content', result)
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and isinstance(item.get('text'), str):
                parts.append(item['text'])
        return ''.join(parts).strip()
    return str(content or '').strip()


async def invoke_gemini_generate_content(
    *,
    system_prompt: str,
    user_prompt: str,
    model: str | None = None,
    temperature: float = 0.3,
    max_output_tokens: int = 4096,
    response_mime_type: str | None = None,
    timeout_seconds: float = 60.0,
) -> dict[str, Any]:
    api_key = _provider_api_key('google')
    if not api_key:
        raise ValueError('Google API key is required.')

    active_model = _provider_model('google', model)
    base_url = _provider_base_url('google').rstrip('/')
    body: dict[str, Any] = {
        'system_instruction': {'parts': [{'text': system_prompt}]},
        'contents': [{'role': 'user', 'parts': [{'text': user_prompt}]}],
        'generationConfig': {
            'temperature': temperature,
            'maxOutputTokens': max_output_tokens,
        },
    }
    if response_mime_type:
        body['generationConfig']['responseMimeType'] = response_mime_type

    async with httpx.AsyncClient(timeout=timeout_seconds) as client:
        response = await client.post(
            f'{base_url}/models/{active_model}:generateContent',
            params={'key': api_key},
            headers={'Content-Type': 'application/json'},
            json=body,
        )
    if not response.is_success:
        raise RuntimeError(f'Gemini returned HTTP {response.status_code}.')
    return response.json()


def extract_balanced_json_object(text: str) -> str | None:
    start = text.find('{')
    while start != -1:
        depth = 0
        in_string = False
        is_escaped = False
        for index in range(start, len(text)):
            char = text[index]

            if in_string:
                if is_escaped:
                    is_escaped = False
                elif char == '\\':
                    is_escaped = True
                elif char == '"':
                    in_string = False
                continue

            if char == '"':
                in_string = True
                continue
            if char == '{':
                depth += 1
                continue
            if char != '}':
                continue

            depth -= 1
            if depth == 0:
                return text[start:index + 1].strip()
        start = text.find('{', start + 1)
    return None


def normalize_generated_json_text(text: str) -> str:
    trimmed = text.strip()
    if trimmed.startswith('```'):
        lines = trimmed.splitlines()
        if len(lines) >= 2 and lines[-1].strip() == '```':
            trimmed = '\n'.join(lines[1:-1]).strip()
    return extract_balanced_json_object(trimmed) or trimmed


def extract_candidate_texts(payload: dict[str, Any]) -> list[str]:
    candidates = payload.get('candidates')
    if not isinstance(candidates, list):
        return []

    texts: list[str] = []
    for candidate in candidates:
        if not isinstance(candidate, dict):
            continue
        content = candidate.get('content')
        parts = content.get('parts') if isinstance(content, dict) else None
        if not isinstance(parts, list):
            continue
        text = ''.join(str(part.get('text') or '') for part in parts if isinstance(part, dict)).strip()
        if text:
            texts.append(normalize_generated_json_text(text))
    return [text for text in texts if text]
