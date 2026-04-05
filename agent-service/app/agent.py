from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, AsyncIterator

from deepagents import create_deep_agent
from langchain_google_genai import ChatGoogleGenerativeAI

from app.auth import AuthenticatedUser
from app.config import get_settings
from app.memory import (
    build_thread_config,
    get_checkpointer,
    resolve_thread_id,
    search_user_memories,
    thread_checkpoint_exists,
)
from app.prompts import build_user_prompt
from app.schemas import ChatHistoryMessage, ChatRequest, ChatResponse
from app.services.supabase_client import SupabaseUserClient
from app.tools import build_all_tools


@dataclass(slots=True)
class PreparedChatRun:
    agent: Any
    config: dict[str, Any]
    payload: dict[str, Any]
    thread_id: str
    tools: list[Any]
    supabase_client: SupabaseUserClient


async def invoke_chat_agent(request: ChatRequest, user: AuthenticatedUser) -> ChatResponse:
    prepared = await _prepare_chat_run(request, user)
    try:
        result = await prepared.agent.ainvoke(prepared.payload, config=prepared.config)
        return ChatResponse(
            thread_id=prepared.thread_id,
            reply=_extract_reply_text(result),
            used_tools=[getattr(tool, 'name', 'tool') for tool in prepared.tools],
        )
    finally:
        await prepared.supabase_client.close()


async def stream_chat_agent(request: ChatRequest, user: AuthenticatedUser) -> AsyncIterator[str]:
    prepared = await _prepare_chat_run(request, user)
    used_tools: set[str] = set()
    reply_parts: list[str] = []
    final_output: Any = None

    try:
        yield _format_sse_event('run_started', {'thread_id': prepared.thread_id})
        async for event in prepared.agent.astream_events(
            prepared.payload,
            config=prepared.config,
            version='v2',
        ):
            event_name = event.get('event')
            if event_name == 'on_tool_start':
                tool_name = event.get('name')
                if isinstance(tool_name, str) and tool_name:
                    used_tools.add(tool_name)
                continue

            if event_name == 'on_chat_model_stream':
                token = _extract_chunk_text(event.get('data', {}).get('chunk'))
                if token:
                    reply_parts.append(token)
                    yield _format_sse_event('token', {'text': token})
                continue

            if event_name == 'on_chain_end':
                output = event.get('data', {}).get('output')
                if output is not None:
                    final_output = output

        reply = ''.join(reply_parts).strip() or _extract_reply_text(final_output)
        yield _format_sse_event(
            'final',
            {
                'thread_id': prepared.thread_id,
                'reply': reply,
                'used_tools': sorted(used_tools),
            },
        )
    except Exception as exc:  # noqa: BLE001
        yield _format_sse_event('error', {'thread_id': prepared.thread_id, 'detail': str(exc)})
    finally:
        await prepared.supabase_client.close()


async def _prepare_chat_run(request: ChatRequest, user: AuthenticatedUser) -> PreparedChatRun:
    settings = get_settings()
    thread_id = resolve_thread_id(user.id, request.thread_id)
    supabase_client = SupabaseUserClient(user.access_token)
    tools = build_all_tools(user.id, supabase_client, request.context)
    model = ChatGoogleGenerativeAI(
        model=settings.agent_model,
        google_api_key=settings.google_api_key,
        temperature=0.3,
    )
    agent = create_deep_agent(
        model=model,
        tools=tools,
        system_prompt=settings.agent_system_prompt,
        checkpointer=get_checkpointer(),
    )

    prior_memories = await search_user_memories(
        user.id,
        query=request.message,
        limit=7,
        context=request.context,
    )
    should_seed_history = bool(request.history) and not await thread_checkpoint_exists(thread_id)
    seeded_history = _history_to_messages(request.history) if should_seed_history else []
    payload = {
        'messages': [
            *seeded_history,
            {
                'role': 'user',
                'content': build_user_prompt(request.message, request.context, prior_memories),
            },
        ],
    }
    return PreparedChatRun(
        agent=agent,
        config=build_thread_config(thread_id),
        payload=payload,
        thread_id=thread_id,
        tools=tools,
        supabase_client=supabase_client,
    )


def _history_to_messages(history: list[ChatHistoryMessage]) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = []
    for item in history:
        role = 'assistant' if item.role == 'model' else 'user'
        messages.append({'role': role, 'content': item.text})
    return messages


def _extract_chunk_text(chunk: Any) -> str:
    if chunk is None:
        return ''

    content = getattr(chunk, 'content', None)
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
                continue
            if not isinstance(block, dict):
                continue
            block_type = str(block.get('type', ''))
            if block_type in {'text', 'text_delta'} and isinstance(block.get('text'), str):
                parts.append(block['text'])
                continue
            if isinstance(block.get('content'), str):
                parts.append(block['content'])
        return ''.join(parts)

    text_method = getattr(chunk, 'text', None)
    if callable(text_method):
        try:
            value = text_method()
        except TypeError:
            value = ''
        if isinstance(value, str):
            return value

    return ''


def _extract_reply_text(result: Any) -> str:
    if isinstance(result, dict):
        messages = result.get('messages')
        if isinstance(messages, list) and messages:
            last = messages[-1]
            content = getattr(last, 'content', None)
            if isinstance(content, str) and content.strip():
                return content.strip()
            if isinstance(last, dict):
                raw = last.get('content')
                if isinstance(raw, str) and raw.strip():
                    return raw.strip()
        if isinstance(result.get('output'), str) and result['output'].strip():
            return result['output'].strip()
    if isinstance(result, str) and result.strip():
        return result.strip()
    return 'I have the context, but I could not generate a useful reply yet.'


def _format_sse_event(event: str, payload: dict[str, Any]) -> str:
    serialized = json.dumps(payload, ensure_ascii=False)
    return f'event: {event}\ndata: {serialized}\n\n'
