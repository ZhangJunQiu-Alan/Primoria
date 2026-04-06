from __future__ import annotations

import asyncio
import base64
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha1
from pathlib import Path
from typing import Any, Literal, Sequence
from uuid import uuid4

from langgraph.checkpoint.base import (
    WRITES_IDX_MAP,
    BaseCheckpointSaver,
    ChannelVersions,
    Checkpoint,
    CheckpointMetadata,
    CheckpointTuple,
    get_checkpoint_id,
    get_checkpoint_metadata,
)
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import get_settings
from app.schemas import ChatContext
from app.services.supabase_client import SupabaseUserClient

MarkdownBucket = Literal['preferences', 'profile', 'goals', 'episodes']
SCOPED_MARKDOWN_BUCKETS = {'daily', 'course', 'lesson'}
MAX_SCOPE_ENTRIES = 8
KEEP_RECENT_SCOPE_ENTRIES = 4

MARKDOWN_LINE_PATTERN = re.compile(r'^-\s*(?:\[(?P<kind>[^\]]+)\]\s*)?(?P<content>.+?)\s*$')
TOKEN_PATTERN = re.compile(r'[a-z0-9]+|[\u4e00-\u9fff]')


@dataclass(slots=True)
class MemoryRecord:
    key: str
    content: str
    kind: str
    source: str
    metadata: dict
    created_at: str | None
    updated_at: str | None


@dataclass(slots=True)
class RankedMemoryRecord:
    record: MemoryRecord
    score: float


class SupabaseCheckpointSaver(BaseCheckpointSaver[str]):
    def __init__(self, supabase_client: SupabaseUserClient, user_id: str) -> None:
        super().__init__()
        self.supabase_client = supabase_client
        self.user_id = user_id

    def get_tuple(self, config) -> CheckpointTuple | None:
        return self._run_sync(self.aget_tuple(config))

    def list(self, config, *, filter=None, before=None, limit=None):
        items = self._run_sync(self._alist_to_list(config, filter=filter, before=before, limit=limit))
        yield from items

    def put(self, config, checkpoint, metadata, new_versions):
        return self._run_sync(self.aput(config, checkpoint, metadata, new_versions))

    def put_writes(self, config, writes, task_id, task_path: str = '') -> None:
        self._run_sync(self.aput_writes(config, writes, task_id, task_path))

    def delete_thread(self, thread_id: str) -> None:
        self._run_sync(self.adelete_thread(thread_id))

    def delete_for_runs(self, run_ids: Sequence[str]) -> None:
        raise NotImplementedError

    def copy_thread(self, source_thread_id: str, target_thread_id: str) -> None:
        raise NotImplementedError

    def prune(self, thread_ids: Sequence[str], *, strategy: str = 'keep_latest') -> None:
        raise NotImplementedError

    async def aget_tuple(self, config) -> CheckpointTuple | None:
        thread_id: str = config['configurable']['thread_id']
        checkpoint_ns: str = config['configurable'].get('checkpoint_ns', '')
        checkpoint_id = get_checkpoint_id(config)
        filters = {
            'thread_id': f'eq.{thread_id}',
            'checkpoint_ns': f'eq.{checkpoint_ns}',
        }
        if checkpoint_id:
            filters['checkpoint_id'] = f'eq.{checkpoint_id}'

        rows = await self.supabase_client.select(
            'agent_thread_checkpoints',
            select='thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id, checkpoint, metadata, writes, created_at',
            filters=filters,
            order='created_at.desc',
            limit=1 if checkpoint_id else 50,
        )
        if not isinstance(rows, list):
            return None

        row = next((item for item in rows if isinstance(item, dict) and item.get('checkpoint')), None)
        if not row:
            return None
        return self._row_to_checkpoint_tuple(row)

    async def _alist_to_list(self, config, *, filter=None, before=None, limit=None) -> list[CheckpointTuple]:
        items: list[CheckpointTuple] = []
        async for item in self.alist(config, filter=filter, before=before, limit=limit):
            items.append(item)
        return items

    async def alist(
        self,
        config,
        *,
        filter: dict[str, Any] | None = None,
        before=None,
        limit: int | None = None,
    ):
        filters: dict[str, str] = {}
        config_checkpoint_id = None
        if config:
            filters['thread_id'] = f'eq.{config["configurable"]["thread_id"]}'
            checkpoint_ns = config['configurable'].get('checkpoint_ns')
            if checkpoint_ns is not None:
                filters['checkpoint_ns'] = f'eq.{checkpoint_ns}'
            config_checkpoint_id = get_checkpoint_id(config)
            if config_checkpoint_id:
                filters['checkpoint_id'] = f'eq.{config_checkpoint_id}'

        rows = await self.supabase_client.select(
            'agent_thread_checkpoints',
            select='thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id, checkpoint, metadata, writes, created_at',
            filters=filters or None,
            order='created_at.desc',
            limit=limit or 100,
        )
        if not isinstance(rows, list):
            return

        before_checkpoint_id = get_checkpoint_id(before) if before else None
        remaining = limit
        for row in rows:
            if not isinstance(row, dict) or not row.get('checkpoint'):
                continue
            if before_checkpoint_id and str(row.get('checkpoint_id')) >= before_checkpoint_id:
                continue
            item = self._row_to_checkpoint_tuple(row)
            if filter and not all(item.metadata.get(key) == value for key, value in filter.items()):
                continue
            if remaining is not None and remaining <= 0:
                break
            if remaining is not None:
                remaining -= 1
            yield item

    async def aput(
        self,
        config,
        checkpoint,
        metadata,
        new_versions,
    ):
        thread_id: str = config['configurable']['thread_id']
        checkpoint_ns: str = config['configurable'].get('checkpoint_ns', '')
        checkpoint_id: str = checkpoint['id']
        parent_checkpoint_id = config['configurable'].get('checkpoint_id')
        row_payload = {
            'thread_id': thread_id,
            'user_id': self.user_id,
            'checkpoint_ns': checkpoint_ns,
            'checkpoint_id': checkpoint_id,
            'parent_checkpoint_id': parent_checkpoint_id,
            'checkpoint': self._serialize_checkpoint_payload(checkpoint),
            'metadata': self._encode_typed_json(get_checkpoint_metadata(config, metadata)),
        }
        existing = await self.supabase_client.select(
            'agent_thread_checkpoints',
            select='id, writes',
            filters={
                'thread_id': f'eq.{thread_id}',
                'checkpoint_ns': f'eq.{checkpoint_ns}',
                'checkpoint_id': f'eq.{checkpoint_id}',
            },
            single=True,
        )
        if existing:
            await self.supabase_client.update(
                'agent_thread_checkpoints',
                row_payload,
                filters={
                    'thread_id': f'eq.{thread_id}',
                    'checkpoint_ns': f'eq.{checkpoint_ns}',
                    'checkpoint_id': f'eq.{checkpoint_id}',
                },
                returning='minimal',
            )
        else:
            row_payload['writes'] = []
            await self.supabase_client.insert('agent_thread_checkpoints', row_payload, returning='minimal')
        return {
            'configurable': {
                'thread_id': thread_id,
                'checkpoint_ns': checkpoint_ns,
                'checkpoint_id': checkpoint_id,
            }
        }

    async def aput_writes(
        self,
        config,
        writes,
        task_id,
        task_path: str = '',
    ) -> None:
        thread_id: str = config['configurable']['thread_id']
        checkpoint_ns: str = config['configurable'].get('checkpoint_ns', '')
        checkpoint_id: str = config['configurable']['checkpoint_id']
        existing = await self.supabase_client.select(
            'agent_thread_checkpoints',
            select='thread_id, checkpoint_ns, checkpoint_id, writes',
            filters={
                'thread_id': f'eq.{thread_id}',
                'checkpoint_ns': f'eq.{checkpoint_ns}',
                'checkpoint_id': f'eq.{checkpoint_id}',
            },
            single=True,
        )
        existing_writes = existing.get('writes', []) if isinstance(existing, dict) and isinstance(existing.get('writes'), list) else []
        indexed = {
            (str(item.get('task_id')), int(item.get('idx', 0))): item
            for item in existing_writes
            if isinstance(item, dict)
        }
        for idx, (channel, value) in enumerate(writes):
            write_idx = WRITES_IDX_MAP.get(channel, idx)
            key = (task_id, write_idx)
            if write_idx >= 0 and key in indexed:
                continue
            indexed[key] = {
                'task_id': task_id,
                'channel': channel,
                'value': self._encode_typed_json(value),
                'task_path': task_path,
                'idx': write_idx,
            }
        payload = {
            'thread_id': thread_id,
            'user_id': self.user_id,
            'checkpoint_ns': checkpoint_ns,
            'checkpoint_id': checkpoint_id,
            'writes': list(indexed.values()),
        }
        if isinstance(existing, dict):
            await self.supabase_client.update(
                'agent_thread_checkpoints',
                {'writes': list(indexed.values())},
                filters={
                    'thread_id': f'eq.{thread_id}',
                    'checkpoint_ns': f'eq.{checkpoint_ns}',
                    'checkpoint_id': f'eq.{checkpoint_id}',
                },
                returning='minimal',
            )
        else:
            await self.supabase_client.insert('agent_thread_checkpoints', payload, returning='minimal')

    async def adelete_thread(self, thread_id: str) -> None:
        await self.supabase_client.delete(
            'agent_thread_checkpoints',
            filters={'thread_id': f'eq.{thread_id}'},
            returning='minimal',
        )

    async def adelete_for_runs(self, run_ids: Sequence[str]) -> None:
        raise NotImplementedError

    async def acopy_thread(self, source_thread_id: str, target_thread_id: str) -> None:
        raise NotImplementedError

    async def aprune(self, thread_ids: Sequence[str], *, strategy: str = 'keep_latest') -> None:
        raise NotImplementedError

    def get_next_version(self, current: str | None, channel: None) -> str:
        if current is None:
            current_v = 0
        elif isinstance(current, int):
            current_v = current
        else:
            current_v = int(str(current).split('.')[0])
        next_v = current_v + 1
        return f'{next_v:032}.0000000000000000'

    def _serialize_checkpoint_payload(self, checkpoint: Checkpoint) -> dict:
        checkpoint_copy = checkpoint.copy()
        channel_values = checkpoint_copy.pop('channel_values', {})
        return {
            'checkpoint': self._encode_typed_json(checkpoint_copy),
            'channel_values': {
                key: self._encode_typed_json(value)
                for key, value in channel_values.items()
            },
        }

    def _row_to_checkpoint_tuple(self, row: dict) -> CheckpointTuple:
        checkpoint_payload = row.get('checkpoint') if isinstance(row.get('checkpoint'), dict) else {}
        checkpoint_core = self._decode_typed_json(checkpoint_payload.get('checkpoint'))
        channel_values_payload = checkpoint_payload.get('channel_values') if isinstance(checkpoint_payload.get('channel_values'), dict) else {}
        checkpoint = {
            **checkpoint_core,
            'channel_values': {
                key: self._decode_typed_json(value)
                for key, value in channel_values_payload.items()
            },
        }
        metadata = self._decode_typed_json(row.get('metadata')) or {}
        writes_payload = row.get('writes') if isinstance(row.get('writes'), list) else []
        pending_writes = [
            (
                str(item.get('task_id')),
                str(item.get('channel')),
                self._decode_typed_json(item.get('value')),
            )
            for item in writes_payload
            if isinstance(item, dict)
        ]
        thread_id = str(row.get('thread_id') or '')
        checkpoint_ns = str(row.get('checkpoint_ns') or '')
        checkpoint_id = str(row.get('checkpoint_id') or '')
        parent_checkpoint_id = row.get('parent_checkpoint_id')
        return CheckpointTuple(
            config={
                'configurable': {
                    'thread_id': thread_id,
                    'checkpoint_ns': checkpoint_ns,
                    'checkpoint_id': checkpoint_id,
                }
            },
            checkpoint=checkpoint,
            metadata=metadata,
            pending_writes=pending_writes,
            parent_config=(
                {
                    'configurable': {
                        'thread_id': thread_id,
                        'checkpoint_ns': checkpoint_ns,
                        'checkpoint_id': str(parent_checkpoint_id),
                    }
                }
                if parent_checkpoint_id
                else None
            ),
        )

    def _encode_typed_json(self, value: Any) -> dict:
        data_type, data = self.serde.dumps_typed(value)
        return {
            'type': data_type,
            'base64': base64.b64encode(data).decode('ascii'),
        }

    def _decode_typed_json(self, payload: Any) -> Any:
        if not isinstance(payload, dict):
            return None
        data_type = str(payload.get('type') or '')
        data_b64 = str(payload.get('base64') or '')
        return self.serde.loads_typed((data_type, base64.b64decode(data_b64.encode('ascii'))))

    def _run_sync(self, coro):
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(coro)
        raise RuntimeError('Use asynchronous checkpoint methods inside an event loop.')


def resolve_thread_id(user_id: str, thread_id: str | None) -> str:
    if thread_id and thread_id.strip():
        return thread_id.strip()
    return f'viewer:{user_id}:{uuid4()}'


def build_checkpointer(supabase_client: SupabaseUserClient, user_id: str) -> SupabaseCheckpointSaver:
    return SupabaseCheckpointSaver(supabase_client, user_id)


def build_thread_config(thread_id: str) -> dict:
    return {'configurable': {'thread_id': thread_id}}


async def thread_checkpoint_exists(checkpointer: BaseCheckpointSaver, thread_id: str) -> bool:
    checkpoint = await checkpointer.aget_tuple(build_thread_config(thread_id))
    return checkpoint is not None


def get_memory_root() -> Path:
    root = get_settings().memory_root
    return root if root.is_absolute() else Path.cwd() / root


def user_memory_dir(user_id: str) -> Path:
    return get_memory_root() / 'users' / user_id


def preferences_path(user_id: str) -> Path:
    return user_memory_dir(user_id) / 'preferences.md'


def profile_path(user_id: str) -> Path:
    return user_memory_dir(user_id) / 'profile.md'


def goals_path(user_id: str) -> Path:
    return user_memory_dir(user_id) / 'goals.md'


def episodes_path(user_id: str) -> Path:
    return user_memory_dir(user_id) / 'episodes.jsonl'


def daily_memory_path(user_id: str, day_key: str | None = None) -> Path:
    return user_memory_dir(user_id) / 'daily' / f'{day_key or _today_key()}.md'


def course_memory_path(user_id: str, course_id: str) -> Path:
    return user_memory_dir(user_id) / 'courses' / _safe_segment(course_id) / 'course.md'


def lesson_memory_path(user_id: str, course_id: str, lesson_id: str) -> Path:
    return (
        user_memory_dir(user_id)
        / 'courses'
        / _safe_segment(course_id)
        / 'lessons'
        / f'{_safe_segment(lesson_id)}.md'
    )


def summary_memory_path(path: Path) -> Path:
    return path.with_suffix('.summary.md')


async def save_user_memory(
    user_id: str,
    content: str,
    *,
    supabase_client: SupabaseUserClient,
    kind: str = 'note',
    source: str = 'agent',
    metadata: dict | None = None,
    context: ChatContext | None = None,
) -> dict:
    normalized = content.strip()
    if not normalized:
        raise ValueError('Memory content cannot be empty.')

    normalized_kind = _resolve_kind(normalized, kind)
    payload = {
        'content': normalized,
        'kind': normalized_kind,
        'source': source.strip() or 'agent',
        'metadata': metadata or {},
    }
    target = _resolve_db_memory_target(normalized_kind, payload, context)
    return await _save_db_memory(
        supabase_client,
        user_id,
        payload,
        target,
    )


async def search_user_memories(
    user_id: str,
    *,
    supabase_client: SupabaseUserClient,
    query: str | None = None,
    kind: str | None = None,
    limit: int = 5,
    context: ChatContext | None = None,
) -> list[dict]:
    rows = await _load_user_memories_from_supabase(supabase_client)
    normalized_query = query.strip().lower() if query else ''
    query_tokens = _tokenize_for_similarity(normalized_query)
    normalized_kind = _normalize_kind(kind) if kind else ''

    matches: list[RankedMemoryRecord] = []
    for row in rows:
        if normalized_kind and row.kind != normalized_kind:
            continue
        if not _should_consider_memory(row, query_tokens, context):
            continue
        matches.append(
            RankedMemoryRecord(
                record=row,
                score=_memory_score(row, normalized_query, context),
            )
        )

    matches.sort(
        key=lambda item: (
            item.score,
            item.record.updated_at or '',
            item.record.created_at or '',
        ),
        reverse=True,
    )

    return [
        {
            'key': item.record.key,
            'content': item.record.content,
            'kind': item.record.kind,
            'source': item.record.source,
            'metadata': item.record.metadata,
            'created_at': item.record.created_at,
            'updated_at': item.record.updated_at,
        }
        for item in matches[:limit]
    ]


async def inspect_user_memory(
    user_id: str,
    *,
    supabase_client: SupabaseUserClient,
    context: ChatContext | None = None,
    day_key: str | None = None,
    episode_limit: int = 20,
) -> dict:
    rows = await _load_user_memories_from_supabase(supabase_client, limit=1000)
    return _inspect_user_memory_rows(rows, context, day_key, episode_limit)


def _resolve_db_memory_target(kind: str, payload: dict, context: ChatContext | None) -> dict:
    bucket = _bucket_for_kind(kind, context)
    if bucket == 'preferences':
        return {
            'scope_type': 'global',
            'scope_key': 'global:preferences',
            'source': 'preferences',
            'metadata': {'scope_type': 'global', 'memory_group': 'preferences'},
            'day_key': None,
            'course_id': None,
            'lesson_id': None,
            'title': 'Preferences',
        }
    if bucket == 'goals':
        return {
            'scope_type': 'global',
            'scope_key': 'global:goals',
            'source': 'goals',
            'metadata': {'scope_type': 'global', 'memory_group': 'goals'},
            'day_key': None,
            'course_id': None,
            'lesson_id': None,
            'title': 'Goals',
        }
    if bucket == 'profile':
        return {
            'scope_type': 'global',
            'scope_key': 'global:profile',
            'source': 'profile',
            'metadata': {'scope_type': 'global', 'memory_group': 'profile'},
            'day_key': None,
            'course_id': None,
            'lesson_id': None,
            'title': 'Profile',
        }
    if bucket == 'lesson' and context and context.lesson_id:
        course_id = context.course_id or 'unknown-course'
        return {
            'scope_type': 'lesson',
            'scope_key': f'lesson:{course_id}:{context.lesson_id}',
            'source': 'lesson',
            'metadata': {
                'scope_type': 'lesson',
                'course_id': context.course_id,
                'lesson_id': context.lesson_id,
            },
            'day_key': None,
            'course_id': context.course_id,
            'lesson_id': context.lesson_id,
            'title': f'Lesson Memory: {context.lesson_id}',
        }
    if bucket == 'course' and context and context.course_id:
        return {
            'scope_type': 'course',
            'scope_key': f'course:{context.course_id}',
            'source': 'course',
            'metadata': {
                'scope_type': 'course',
                'course_id': context.course_id,
            },
            'day_key': None,
            'course_id': context.course_id,
            'lesson_id': None,
            'title': f'Course Memory: {context.course_id}',
        }
    if bucket == 'episodes':
        return {
            'scope_type': 'episode',
            'scope_key': 'episode',
            'source': 'episode',
            'metadata': {'scope_type': 'episode'},
            'day_key': None,
            'course_id': context.course_id if context else None,
            'lesson_id': context.lesson_id if context else None,
            'title': 'Episode Memory',
        }
    today = _today_key()
    return {
        'scope_type': 'daily',
        'scope_key': f'daily:{today}',
        'source': 'daily',
        'metadata': {'scope_type': 'daily', 'day': today},
        'day_key': today,
        'course_id': context.course_id if context else None,
        'lesson_id': context.lesson_id if context else None,
        'title': f'Daily Memory: {today}',
    }


async def _save_db_memory(
    supabase_client: SupabaseUserClient,
    user_id: str,
    payload: dict,
    target: dict,
) -> dict:
    existing_rows = await _load_scope_rows(supabase_client, target, include_summaries=False)
    existing_records = [_memory_row_to_record(row) for row in existing_rows]
    normalized_content = payload['content'].strip().lower()

    for item in existing_records:
        if item.kind == payload['kind'] and item.content.strip().lower() == normalized_content:
            return _memory_row_to_api(next(row for row in existing_rows if str(row.get('id')) == item.key))

    similar = _find_similar_record(existing_records, payload['content'], payload['kind'])
    base_payload = _build_db_memory_payload(user_id, payload, target)
    persisted_row: dict

    if similar is not None:
        updated_rows = await supabase_client.update(
            'agent_memories',
            {
                **base_payload,
                'version': 1,
            },
            filters={'id': f'eq.{similar.key}'},
        )
        persisted_row = (updated_rows or [None])[0]
    else:
        inserted_rows = await supabase_client.insert('agent_memories', {**base_payload, 'version': 1})
        persisted_row = (inserted_rows or [None])[0]

    if target['scope_type'] in {'daily', 'course', 'lesson'}:
        await _compress_db_scope_memories(supabase_client, user_id, target)

    if not isinstance(persisted_row, dict):
        refreshed_rows = await _load_scope_rows(supabase_client, target, include_summaries=False)
        if refreshed_rows:
            persisted_row = refreshed_rows[-1]
        else:
            raise RuntimeError('Failed to persist memory row.')
    return _memory_row_to_api(persisted_row)


def _build_db_memory_payload(user_id: str, payload: dict, target: dict) -> dict:
    metadata = {
        **(payload.get('metadata') or {}),
        **(target.get('metadata') or {}),
        'captured_from': payload['source'],
    }
    return {
        'user_id': user_id,
        'kind': payload['kind'],
        'scope_type': target['scope_type'],
        'scope_key': target['scope_key'],
        'day_key': target['day_key'],
        'course_id': target['course_id'],
        'lesson_id': target['lesson_id'],
        'content': payload['content'],
        'content_md': f'- [{payload["kind"]}] {payload["content"]}',
        'metadata': metadata,
        'source': target['source'],
        'captured_from': payload['source'],
        'is_summary': False,
        'is_active': True,
        'fingerprint': _memory_fingerprint(payload['kind'], payload['content'], target['scope_key']),
    }


async def _load_user_memories_from_supabase(
    supabase_client: SupabaseUserClient,
    *,
    limit: int = 500,
) -> list[MemoryRecord]:
    rows = await supabase_client.select(
        'agent_memories',
        select='id, kind, content, source, metadata, created_at, updated_at, scope_type, scope_key, day_key, course_id, lesson_id, is_summary, is_active, captured_from',
        filters={'is_active': 'eq.true'},
        order='updated_at.desc',
        limit=limit,
    )
    if not isinstance(rows, list):
        return []
    return [_memory_row_to_record(row) for row in rows if isinstance(row, dict)]


async def _load_scope_rows(
    supabase_client: SupabaseUserClient,
    target: dict,
    *,
    include_summaries: bool | None,
) -> list[dict]:
    filters = {
        'scope_key': f'eq.{target["scope_key"]}',
        'is_active': 'eq.true',
    }
    if include_summaries is not None:
        filters['is_summary'] = f'eq.{str(include_summaries).lower()}'
    rows = await supabase_client.select(
        'agent_memories',
        select='id, kind, content, source, metadata, created_at, updated_at, scope_type, scope_key, day_key, course_id, lesson_id, is_summary, is_active, captured_from',
        filters=filters,
        order='created_at.asc',
        limit=200,
    )
    return rows if isinstance(rows, list) else []


async def _compress_db_scope_memories(
    supabase_client: SupabaseUserClient,
    user_id: str,
    target: dict,
) -> None:
    active_rows = await _load_scope_rows(supabase_client, target, include_summaries=False)
    if len(active_rows) <= MAX_SCOPE_ENTRIES:
        return

    archived_rows = active_rows[:-KEEP_RECENT_SCOPE_ENTRIES]
    summary_rows = await _load_scope_rows(supabase_client, target, include_summaries=True)
    merged_summary = _merge_summary_entries(
        [(str(row.get('kind') or 'summary'), str(row.get('content') or '')) for row in summary_rows],
        [(str(row.get('kind') or 'note'), str(row.get('content') or '')) for row in archived_rows],
        title=f'{target["title"]} Summary',
    )

    deactivate_ids = [str(row['id']) for row in [*summary_rows, *archived_rows] if row.get('id')]
    if deactivate_ids:
        await supabase_client.update(
            'agent_memories',
            {'is_active': False},
            filters={'id': f'in.({",".join(deactivate_ids)})'},
            returning='minimal',
        )

    if not merged_summary:
        return

    summary_payloads = [
        {
            'user_id': user_id,
            'kind': kind,
            'scope_type': target['scope_type'],
            'scope_key': target['scope_key'],
            'day_key': target['day_key'],
            'course_id': target['course_id'],
            'lesson_id': target['lesson_id'],
            'content': content,
            'content_md': f'- [{kind}] {content}',
            'metadata': {
                **(target.get('metadata') or {}),
                'is_summary': True,
                'captured_from': 'system',
            },
            'source': f'{target["source"]}_summary',
            'captured_from': 'system',
            'is_summary': True,
            'is_active': True,
            'fingerprint': _memory_fingerprint(kind, content, f'{target["scope_key"]}:summary'),
            'summarized_from_ids': [str(row['id']) for row in archived_rows if row.get('id')],
        }
        for kind, content in merged_summary
    ]
    await supabase_client.insert('agent_memories', summary_payloads, returning='minimal')


def _memory_fingerprint(kind: str, content: str, scope_key: str) -> str:
    return sha1(f'{scope_key}:{kind}:{content.strip().lower()}'.encode('utf-8')).hexdigest()


def _memory_row_metadata(row: dict) -> dict:
    metadata = row.get('metadata') if isinstance(row.get('metadata'), dict) else {}
    merged = {
        **metadata,
        'scope_type': row.get('scope_type'),
        'scope_key': row.get('scope_key'),
        'course_id': row.get('course_id'),
        'lesson_id': row.get('lesson_id'),
        'captured_from': row.get('captured_from') or metadata.get('captured_from'),
        'is_summary': bool(row.get('is_summary')),
    }
    day_key = row.get('day_key')
    if day_key:
        merged['day'] = str(day_key)
    return {key: value for key, value in merged.items() if value is not None}


def _memory_row_to_record(row: dict) -> MemoryRecord:
    return MemoryRecord(
        key=str(row.get('id') or ''),
        content=str(row.get('content') or ''),
        kind=_normalize_kind(str(row.get('kind') or 'note')),
        source=str(row.get('source') or 'memory'),
        metadata=_memory_row_metadata(row),
        created_at=str(row.get('created_at') or ''),
        updated_at=str(row.get('updated_at') or ''),
    )


def _memory_row_to_api(row: dict) -> dict:
    record = _memory_row_to_record(row)
    return {
        'key': record.key,
        'content': record.content,
        'kind': record.kind,
        'source': record.source,
        'metadata': record.metadata,
        'created_at': record.created_at,
        'updated_at': record.updated_at,
    }


def _inspect_user_memory_rows(
    rows: list[MemoryRecord],
    context: ChatContext | None,
    day_key: str | None,
    episode_limit: int,
) -> dict:
    current_day = day_key or _today_key()
    course_id = context.course_id if context else None
    lesson_id = context.lesson_id if context else None

    def scope_rows(scope_key: str, *, summaries: bool) -> list[MemoryRecord]:
        return [
            row
            for row in rows
            if str(row.metadata.get('scope_key', '')) == scope_key and bool(row.metadata.get('is_summary')) is summaries
        ]

    return {
        'global': {
            'preferences': _inspect_memory_scope_records(
                scope_rows('global:preferences', summaries=False),
                scope_rows('global:preferences', summaries=True),
                'Preferences',
                'memory://users/self/preferences',
            ),
            'profile': _inspect_memory_scope_records(
                scope_rows('global:profile', summaries=False),
                scope_rows('global:profile', summaries=True),
                'Profile',
                'memory://users/self/profile',
            ),
            'goals': _inspect_memory_scope_records(
                scope_rows('global:goals', summaries=False),
                scope_rows('global:goals', summaries=True),
                'Goals',
                'memory://users/self/goals',
            ),
        },
        'daily': _inspect_memory_scope_records(
            scope_rows(f'daily:{current_day}', summaries=False),
            scope_rows(f'daily:{current_day}', summaries=True),
            f'Daily Memory: {current_day}',
            f'memory://users/self/daily/{current_day}',
        ),
        'course': _inspect_memory_scope_records(
            scope_rows(f'course:{course_id}', summaries=False),
            scope_rows(f'course:{course_id}', summaries=True),
            f'Course Memory: {course_id}' if course_id else 'Course Memory',
            f'memory://users/self/course/{course_id}',
        )
        if course_id
        else None,
        'lesson': _inspect_memory_scope_records(
            scope_rows(f'lesson:{course_id or "unknown-course"}:{lesson_id}', summaries=False),
            scope_rows(f'lesson:{course_id or "unknown-course"}:{lesson_id}', summaries=True),
            f'Lesson Memory: {lesson_id}' if lesson_id else 'Lesson Memory',
            f'memory://users/self/course/{course_id or "unknown-course"}/lesson/{lesson_id}',
        )
        if lesson_id
        else None,
        'episodes': [
            {
                'key': row.key,
                'content': row.content,
                'kind': row.kind,
                'source': row.source,
                'metadata': row.metadata,
                'created_at': row.created_at,
                'updated_at': row.updated_at,
            }
            for row in [
                item
                for item in rows
                if item.metadata.get('scope_type') == 'episode' and not item.metadata.get('is_summary')
            ][-episode_limit:]
        ],
    }


def _inspect_memory_scope_records(
    entries: list[MemoryRecord],
    summaries: list[MemoryRecord],
    title: str,
    path: str,
) -> dict:
    return {
        'path': path,
        'summary_path': f'{path}/summary',
        'title': title,
        'summary': [
            {
                'key': row.key,
                'content': row.content,
                'kind': row.kind,
                'source': row.source,
                'metadata': row.metadata,
                'created_at': row.created_at,
                'updated_at': row.updated_at,
            }
            for row in summaries
        ],
        'entries': [
            {
                'key': row.key,
                'content': row.content,
                'kind': row.kind,
                'source': row.source,
                'metadata': row.metadata,
                'created_at': row.created_at,
                'updated_at': row.updated_at,
            }
            for row in entries
        ],
    }


def _normalize_kind(kind: str | None) -> str:
    normalized = (kind or '').strip().lower()
    return normalized or 'note'


def _resolve_kind(content: str, requested_kind: str | None) -> str:
    normalized_requested = _normalize_kind(requested_kind)
    if normalized_requested not in {'auto', 'note'}:
        return normalized_requested

    lowered = content.strip().lower()
    if _contains_any(
        lowered,
        [
            'prefer',
            'preference',
            'like',
            'dislike',
            'favorite',
            'always',
            'never',
            'concise',
            'brief',
            'detailed',
            'short',
            'chinese',
            'english',
            '中文',
            '英文',
            '英语',
            '简洁',
            '详细',
            '直接',
            '偏好',
            '喜欢',
            '不喜欢',
        ],
    ):
        return 'preference'
    if _contains_any(
        lowered,
        [
            'goal',
            'target',
            'aim',
            'plan to',
            'want to',
            'trying to',
            'prepare for',
            'preparing for',
            'studying for',
            '目标',
            '计划',
            '准备',
            '想要',
            '希望',
            '打算',
        ],
    ):
        return 'goal'
    if _contains_any(
        lowered,
        [
            'only have',
            'can only',
            'cannot',
            "can't",
            'unable to',
            'limited',
            'constraint',
            '30 minutes',
            '1 hour',
            '时间不多',
            '只能',
            '没法',
            '限制',
            '约束',
            '每天',
            '每周',
        ],
    ):
        return 'constraint'
    if _contains_any(
        lowered,
        [
            'i am',
            "i'm",
            'beginner',
            'new to',
            'background',
            'experience',
            'student',
            'developer',
            'designer',
            'novice',
            '我是',
            '初学者',
            '新手',
            '背景',
            '经验',
            '目前在学',
        ],
    ):
        return 'background'
    return 'note'


def _bucket_for_kind(kind: str, context: ChatContext | None = None) -> MarkdownBucket:
    if kind == 'preference':
        return 'preferences'
    if kind == 'goal':
        return 'goals'
    if kind in {'profile', 'background', 'constraint'}:
        return 'profile'
    if kind in {'daily', 'daily_note', 'daily_reflection'}:
        return 'daily'
    if kind in {'course', 'course_note', 'course_summary'}:
        return 'course'
    if kind in {'lesson', 'lesson_note', 'lesson_summary', 'misconception'}:
        return 'lesson'
    if kind == 'episode':
        return 'episodes'
    if context and context.lesson_id:
        return 'lesson'
    if context and context.course_id:
        return 'course'
    return 'daily'


def _markdown_path_for_bucket(user_id: str, bucket: MarkdownBucket) -> Path:
    if bucket == 'preferences':
        return preferences_path(user_id)
    if bucket == 'goals':
        return goals_path(user_id)
    if bucket == 'profile':
        return profile_path(user_id)
    return episodes_path(user_id)


def _resolve_markdown_target(
    user_id: str,
    bucket: str,
    payload: dict,
    context: ChatContext | None,
) -> dict:
    if bucket == 'preferences':
        return {
            'path': preferences_path(user_id),
            'source': 'preferences',
            'metadata': {'scope_type': 'global', 'path': 'users/{user_id}/preferences.md', 'captured_from': payload['source']},
            'title': 'Preferences',
        }
    if bucket == 'goals':
        return {
            'path': goals_path(user_id),
            'source': 'goals',
            'metadata': {'scope_type': 'global', 'path': 'users/{user_id}/goals.md', 'captured_from': payload['source']},
            'title': 'Goals',
        }
    if bucket == 'profile':
        return {
            'path': profile_path(user_id),
            'source': 'profile',
            'metadata': {'scope_type': 'global', 'path': 'users/{user_id}/profile.md', 'captured_from': payload['source']},
            'title': 'Profile',
        }
    if bucket == 'lesson' and context and context.lesson_id:
        return {
            'path': lesson_memory_path(user_id, context.course_id or 'unknown-course', context.lesson_id),
            'source': 'lesson',
            'metadata': {
                'scope_type': 'lesson',
                'lesson_id': context.lesson_id,
                'course_id': context.course_id,
                'captured_from': payload['source'],
            },
            'title': f'Lesson Memory: {context.lesson_id}',
        }
    if bucket == 'course' and context and context.course_id:
        return {
            'path': course_memory_path(user_id, context.course_id),
            'source': 'course',
            'metadata': {
                'scope_type': 'course',
                'course_id': context.course_id,
                'captured_from': payload['source'],
            },
            'title': f'Course Memory: {context.course_id}',
        }
    return {
        'path': daily_memory_path(user_id),
        'source': 'daily',
        'metadata': {
            'scope_type': 'daily',
            'day': _today_key(),
            'captured_from': payload['source'],
        },
        'title': f'Daily Memory: {_today_key()}',
    }


def _append_markdown_memory(
    user_id: str,
    payload: dict,
    bucket: str,
    path: Path | None = None,
    source: str | None = None,
    metadata: dict | None = None,
    title: str | None = None,
) -> dict:
    path = path or _markdown_path_for_bucket(user_id, bucket)  # type: ignore[arg-type]
    path.parent.mkdir(parents=True, exist_ok=True)
    source = source or path.stem
    metadata = metadata or {}
    header_title = title or path.stem.replace('_', ' ').title()

    existing = _read_markdown_records(path, default_kind=payload['kind'], source=source, metadata=metadata)
    normalized_content = payload['content'].strip().lower()
    for item in existing:
        if item.kind == payload['kind'] and item.content.strip().lower() == normalized_content:
            return {
                'key': item.key,
                'content': item.content,
                'kind': item.kind,
                'source': item.source,
                'metadata': item.metadata,
                'created_at': item.created_at,
                'updated_at': item.updated_at,
            }

    similar = _find_similar_record(existing, payload['content'], payload['kind'])
    if similar is not None and path.exists():
        _rewrite_markdown_record(path, similar, payload)
        refreshed = _read_markdown_records(path, default_kind=payload['kind'], source=source, metadata=metadata)
        latest = next((item for item in refreshed if item.key == similar.key), refreshed[-1])
        return {
            'key': latest.key,
            'content': latest.content,
            'kind': latest.kind,
            'source': latest.source,
            'metadata': latest.metadata,
            'created_at': latest.created_at,
            'updated_at': latest.updated_at,
        }

    if not path.exists():
        header = f'# {header_title}\n\n'
        path.write_text(header, encoding='utf-8')

    with path.open('a', encoding='utf-8') as handle:
        handle.write(f'- [{payload["kind"]}] {payload["content"]}\n')

    if bucket in SCOPED_MARKDOWN_BUCKETS:
        _compress_scope_markdown(path, header_title)

    refreshed = _read_markdown_records(path, default_kind=payload['kind'], source=source, metadata=metadata)
    latest = refreshed[-1]
    return {
        'key': latest.key,
        'content': latest.content,
        'kind': latest.kind,
        'source': latest.source,
        'metadata': latest.metadata,
        'created_at': latest.created_at,
        'updated_at': latest.updated_at,
    }


def _append_episode_memory(user_id: str, payload: dict) -> dict:
    path = episodes_path(user_id)
    path.parent.mkdir(parents=True, exist_ok=True)

    existing = _read_episode_records(path)
    normalized_content = payload['content'].strip().lower()
    for item in reversed(existing):
        if item.kind == payload['kind'] and item.content.strip().lower() == normalized_content:
            return {
                'key': item.key,
                'content': item.content,
                'kind': item.kind,
                'source': item.source,
                'metadata': item.metadata,
                'created_at': item.created_at,
                'updated_at': item.updated_at,
            }

    similar = _find_similar_record(existing[-10:], payload['content'], payload['kind'], threshold=0.82)
    if similar is not None:
        updated = _rewrite_episode_record(path, similar.key, payload)
        if updated is not None:
            return updated

    key = uuid4().hex
    timestamp = datetime.now(timezone.utc).isoformat()
    record = {
        'id': key,
        'content': payload['content'],
        'kind': payload['kind'],
        'source': payload['source'],
        'metadata': {
            **payload['metadata'],
            'captured_from': payload['source'],
            'scope_type': 'episode',
        },
        'created_at': timestamp,
        'updated_at': timestamp,
    }
    with path.open('a', encoding='utf-8') as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + '\n')

    refreshed = _read_episode_records(path)
    latest = refreshed[-1]
    return {
        'key': latest.key,
        'content': latest.content,
        'kind': latest.kind,
        'source': latest.source,
        'metadata': latest.metadata,
        'created_at': latest.created_at,
        'updated_at': latest.updated_at,
    }


def _load_user_memories(user_id: str, context: ChatContext | None = None) -> list[MemoryRecord]:
    records = [
        *_read_markdown_records(
            preferences_path(user_id),
            default_kind='preference',
            source='preferences',
            metadata={'scope_type': 'global'},
        ),
        *_read_markdown_records(
            profile_path(user_id),
            default_kind='profile',
            source='profile',
            metadata={'scope_type': 'global'},
        ),
        *_read_markdown_records(
            goals_path(user_id),
            default_kind='goal',
            source='goals',
            metadata={'scope_type': 'global'},
        ),
        *_read_episode_records(episodes_path(user_id)),
    ]

    for day_path in _recent_daily_paths(user_id, limit=3):
        records.extend(
            _read_markdown_records(
                day_path,
                default_kind='daily',
                source='daily',
                metadata={'scope_type': 'daily', 'day': day_path.stem},
            )
        )
        records.extend(
            _read_markdown_records(
                summary_memory_path(day_path),
                default_kind='summary',
                source='daily_summary',
                metadata={'scope_type': 'daily', 'day': day_path.stem, 'is_summary': True},
            )
        )

    if context and context.course_id:
        course_path = course_memory_path(user_id, context.course_id)
        records.extend(
            _read_markdown_records(
                course_path,
                default_kind='course_note',
                source='course',
                metadata={'scope_type': 'course', 'course_id': context.course_id},
            )
        )
        records.extend(
            _read_markdown_records(
                summary_memory_path(course_path),
                default_kind='summary',
                source='course_summary',
                metadata={'scope_type': 'course', 'course_id': context.course_id, 'is_summary': True},
            )
        )
    if context and context.lesson_id:
        lesson_path = lesson_memory_path(user_id, context.course_id or 'unknown-course', context.lesson_id)
        records.extend(
            _read_markdown_records(
                lesson_path,
                default_kind='lesson_note',
                source='lesson',
                metadata={
                    'scope_type': 'lesson',
                    'lesson_id': context.lesson_id,
                    'course_id': context.course_id,
                },
            )
        )
        records.extend(
            _read_markdown_records(
                summary_memory_path(lesson_path),
                default_kind='summary',
                source='lesson_summary',
                metadata={
                    'scope_type': 'lesson',
                    'lesson_id': context.lesson_id,
                    'course_id': context.course_id,
                    'is_summary': True,
                },
            )
        )
    return records


def _read_markdown_records(path: Path, *, default_kind: str, source: str, metadata: dict | None = None) -> list[MemoryRecord]:
    if not path.exists():
        return []

    lines = path.read_text(encoding='utf-8').splitlines()
    stat = path.stat()
    records: list[MemoryRecord] = []
    for index, line in enumerate(lines):
        parsed = MARKDOWN_LINE_PATTERN.match(line.strip())
        if not parsed:
            continue
        kind = _normalize_kind(parsed.group('kind') or default_kind)
        content = parsed.group('content').strip()
        key = sha1(f'{path}:{index}:{kind}:{content}'.encode('utf-8')).hexdigest()[:16]
        records.append(
            MemoryRecord(
                key=key,
                content=content,
                kind=kind,
                source=source,
                metadata={
                    **(metadata or {}),
                    'path': str(path.relative_to(get_memory_root())),
                },
                created_at=_iso_from_timestamp(stat.st_ctime),
                updated_at=_iso_from_timestamp(stat.st_mtime),
            )
        )
    return records


def _read_markdown_entries(path: Path) -> list[tuple[str, str]]:
    if not path.exists():
        return []
    entries: list[tuple[str, str]] = []
    for line in path.read_text(encoding='utf-8').splitlines():
        parsed = MARKDOWN_LINE_PATTERN.match(line.strip())
        if not parsed:
            continue
        entries.append((_normalize_kind(parsed.group('kind') or 'note'), parsed.group('content').strip()))
    return entries


def _write_markdown_entries(path: Path, title: str, entries: list[tuple[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [f'# {title}', '']
    lines.extend([f'- [{kind}] {content}' for kind, content in entries])
    path.write_text('\n'.join(lines).rstrip() + '\n', encoding='utf-8')


def _read_episode_records(path: Path) -> list[MemoryRecord]:
    if not path.exists():
        return []

    records: list[MemoryRecord] = []
    with path.open('r', encoding='utf-8') as handle:
        for line_number, raw_line in enumerate(handle):
            line = raw_line.strip()
            if not line:
                continue
            try:
                payload = json.loads(line)
            except json.JSONDecodeError:
                continue

            content = str(payload.get('content', '')).strip()
            if not content:
                continue
            kind = _normalize_kind(str(payload.get('kind', 'note')))
            key = str(payload.get('id') or sha1(f'{path}:{line_number}:{content}'.encode('utf-8')).hexdigest()[:16])
            records.append(
                MemoryRecord(
                    key=key,
                    content=content,
                    kind=kind,
                    source=str(payload.get('source', 'episode')),
                    metadata=payload.get('metadata', {}) if isinstance(payload.get('metadata', {}), dict) else {},
                    created_at=str(payload.get('created_at') or ''),
                    updated_at=str(payload.get('updated_at') or payload.get('created_at') or ''),
                )
            )
    return records


def _rewrite_markdown_record(path: Path, target: MemoryRecord, payload: dict) -> None:
    lines = path.read_text(encoding='utf-8').splitlines()
    replacement = f'- [{payload["kind"]}] {payload["content"]}'
    for index, line in enumerate(lines):
        parsed = MARKDOWN_LINE_PATTERN.match(line.strip())
        if not parsed:
            continue
        kind = _normalize_kind(parsed.group('kind') or payload['kind'])
        content = parsed.group('content').strip()
        key = sha1(f'{path}:{index}:{kind}:{content}'.encode('utf-8')).hexdigest()[:16]
        if key == target.key:
            lines[index] = replacement
            break
    path.write_text('\n'.join(lines).rstrip() + '\n', encoding='utf-8')


def _compress_scope_markdown(path: Path, title: str) -> None:
    entries = _read_markdown_entries(path)
    if len(entries) <= MAX_SCOPE_ENTRIES:
        return

    archived_entries = entries[:-KEEP_RECENT_SCOPE_ENTRIES]
    recent_entries = entries[-KEEP_RECENT_SCOPE_ENTRIES:]

    summary_path = summary_memory_path(path)
    summary_title = f'{title} Summary'
    summary_entries = _read_markdown_entries(summary_path)
    merged_summary = _merge_summary_entries(summary_entries, archived_entries, title=summary_title)

    _write_markdown_entries(summary_path, summary_title, merged_summary)
    _write_markdown_entries(path, title, recent_entries)


def _merge_summary_entries(
    existing: list[tuple[str, str]],
    incoming: list[tuple[str, str]],
    *,
    max_items: int = 12,
    title: str = 'Memory Summary',
) -> list[tuple[str, str]]:
    ai_merged = _merge_summary_entries_with_ai(existing, incoming, max_items=max_items, title=title)
    if ai_merged:
        return ai_merged

    merged = list(existing)
    for kind, content in incoming:
        candidate_record = MemoryRecord(
            key='incoming',
            content=content,
            kind=kind,
            source='summary',
            metadata={},
            created_at=None,
            updated_at=None,
        )
        existing_records = [
            MemoryRecord(
                key=str(index),
                content=item_content,
                kind=item_kind,
                source='summary',
                metadata={},
                created_at=None,
                updated_at=None,
            )
            for index, (item_kind, item_content) in enumerate(merged)
        ]
        similar = _find_similar_record(existing_records, candidate_record.content, candidate_record.kind, threshold=0.8)
        if similar is not None:
            merged[int(similar.key)] = (kind, content)
        else:
            merged.append((kind, content))
    return merged[-max_items:]


def _merge_summary_entries_with_ai(
    existing: list[tuple[str, str]],
    incoming: list[tuple[str, str]],
    *,
    max_items: int,
    title: str,
) -> list[tuple[str, str]] | None:
    settings = get_settings()
    if not settings.google_api_key:
        return None

    combined = [*existing, *incoming]
    if not combined:
        return []

    prompt_lines = []
    for index, (kind, content) in enumerate(combined, start=1):
        prompt_lines.append(f'{index}. [{kind}] {content}')

    prompt = (
        'You compress learner memory into concise durable bullets.\n'
        f'Target summary title: {title}\n'
        f'Return a JSON array with at most {max_items} objects.\n'
        'Each object must have keys: "kind" and "content".\n'
        'Rules:\n'
        '- Deduplicate overlapping facts.\n'
        '- Preserve stable learner preferences, goals, constraints, misconceptions, and key study progress.\n'
        '- Rewrite into concise durable memory bullets.\n'
        '- Output valid JSON only.\n\n'
        'Memory entries:\n'
        + '\n'.join(prompt_lines)
    )

    try:
        model = ChatGoogleGenerativeAI(
            model=settings.memory_summary_model or settings.agent_model,
            google_api_key=settings.google_api_key,
            temperature=0.1,
        )
        response = model.invoke(prompt)
        text = _response_text(response.content)
        parsed = _parse_summary_json(text)
        if not parsed:
            return None
        normalized: list[tuple[str, str]] = []
        for item in parsed[:max_items]:
            kind = _normalize_kind(str(item.get('kind', 'summary')))
            content = str(item.get('content', '')).strip()
            if not content:
                continue
            normalized.append((kind, content))
        return normalized or None
    except Exception:  # noqa: BLE001
        return None


def _response_text(content: object) -> str:
    if isinstance(content, str):
        return content.strip()

    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
                continue
            if isinstance(block, dict):
                text = block.get('text')
                if isinstance(text, str):
                    parts.append(text)
                    continue
                inline_content = block.get('content')
                if isinstance(inline_content, str):
                    parts.append(inline_content)
                    continue
            block_text = getattr(block, 'text', None)
            if isinstance(block_text, str):
                parts.append(block_text)
                continue
        return ''.join(parts).strip()

    text_method = getattr(content, 'text', None)
    if callable(text_method):
        try:
            value = text_method()
        except TypeError:
            value = ''
        if isinstance(value, str):
            return value.strip()

    return str(content).strip() if content is not None else ''


def _parse_summary_json(text: str) -> list[dict] | None:
    candidate = text.strip()
    if not candidate:
        return None

    fenced_match = re.search(r'```(?:json)?\s*(.*?)\s*```', candidate, re.DOTALL)
    if fenced_match:
        candidate = fenced_match.group(1).strip()

    if not candidate.startswith('['):
        start = candidate.find('[')
        end = candidate.rfind(']')
        if start >= 0 and end > start:
            candidate = candidate[start : end + 1].strip()

    if not candidate.startswith('[') or not candidate.endswith(']'):
        return None

    try:
        parsed = json.loads(candidate)
    except json.JSONDecodeError:
        return None

    if not isinstance(parsed, list):
        return None

    return [item for item in parsed if isinstance(item, dict)]


def _rewrite_episode_record(path: Path, key: str, payload: dict) -> dict | None:
    if not path.exists():
        return None

    rows: list[dict] = []
    updated: dict | None = None
    with path.open('r', encoding='utf-8') as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if str(row.get('id')) == key:
                row = {
                    **row,
                    'content': payload['content'],
                    'kind': payload['kind'],
                    'source': payload['source'],
                    'metadata': payload['metadata'],
                    'updated_at': datetime.now(timezone.utc).isoformat(),
                }
                updated = row
            rows.append(row)

    if updated is None:
        return None

    with path.open('w', encoding='utf-8') as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + '\n')

    return {
        'key': str(updated['id']),
        'content': str(updated['content']),
        'kind': _normalize_kind(str(updated['kind'])),
        'source': str(updated.get('source', 'episode')),
        'metadata': updated.get('metadata', {}) if isinstance(updated.get('metadata', {}), dict) else {},
        'created_at': str(updated.get('created_at') or ''),
        'updated_at': str(updated.get('updated_at') or ''),
    }


def _find_similar_record(
    records: list[MemoryRecord],
    content: str,
    kind: str,
    *,
    threshold: float = 0.72,
) -> MemoryRecord | None:
    target_tokens = _tokenize_for_similarity(content)
    target_topics = _extract_memory_topics(kind, content)
    if not target_tokens:
        return None

    best: tuple[float, MemoryRecord] | None = None
    for record in records:
        if record.kind != kind:
            continue
        record_topics = _extract_memory_topics(record.kind, record.content)
        if target_topics and record_topics and target_topics & record_topics:
            return record
        score = _similarity_score(target_tokens, _tokenize_for_similarity(record.content))
        if score >= threshold and (best is None or score > best[0]):
            best = (score, record)
    return best[1] if best else None


def _tokenize_for_similarity(content: str) -> set[str]:
    return set(TOKEN_PATTERN.findall(content.lower()))


def _similarity_score(left: set[str], right: set[str]) -> float:
    if not left or not right:
        return 0.0
    overlap = len(left & right)
    return overlap / max(len(left), len(right))


def _contains_any(text: str, needles: list[str]) -> bool:
    return any(needle in text for needle in needles)


def _extract_memory_topics(kind: str, content: str) -> set[str]:
    lowered = content.lower()
    topics: set[str] = set()

    if kind == 'preference':
        if _contains_any(lowered, ['chinese', 'english', '中文', '英文', '英语']):
            topics.add('language')
        if _contains_any(lowered, ['concise', 'brief', 'short', 'detailed', '简洁', '详细', '直接']):
            topics.add('response_style')
        if _contains_any(lowered, ['step-by-step', 'examples', 'example', '举例', '一步一步']):
            topics.add('teaching_style')

    if kind in {'constraint', 'profile', 'background'}:
        if _contains_any(lowered, ['minute', 'minutes', 'hour', 'hours', '每天', '每周', 'day', 'week']):
            topics.add('time_budget')
        if _contains_any(lowered, ['beginner', 'new to', '初学者', '新手']):
            topics.add('experience_level')

    if kind == 'goal':
        if _contains_any(lowered, ['exam', 'test', 'interview', '考试', '面试']):
            topics.add('assessment_goal')
        if _contains_any(lowered, ['network', 'networking', 'tcp', '协议', '网络']):
            topics.add('domain_networking')

    return topics


def _safe_segment(value: str) -> str:
    return re.sub(r'[^a-zA-Z0-9._-]+', '_', value.strip()) or 'unknown'


def _today_key() -> str:
    return datetime.now().date().isoformat()


def _recent_daily_paths(user_id: str, *, limit: int = 3) -> list[Path]:
    daily_dir = user_memory_dir(user_id) / 'daily'
    if not daily_dir.exists():
        return []
    return sorted(daily_dir.glob('*.md'), reverse=True)[:limit]


def _scope_priority(row: MemoryRecord, context: ChatContext | None) -> int:
    metadata = row.metadata or {}
    scope_type = str(metadata.get('scope_type', ''))
    is_summary = bool(metadata.get('is_summary'))
    if scope_type == 'lesson' and context and metadata.get('lesson_id') == context.lesson_id:
        return 92 if is_summary else 100
    if scope_type == 'course' and context and metadata.get('course_id') == context.course_id:
        return 72 if is_summary else 80
    if scope_type == 'daily':
        return 54 if is_summary else 60
    if scope_type == 'global':
        return 40
    if scope_type == 'episode':
        return 24
    return 0


def _memory_score(row: MemoryRecord, query: str, context: ChatContext | None) -> float:
    scope_score = _scope_priority(row, context)
    query_score = _query_similarity_score(row, query)
    kind_score = _kind_priority(row.kind)
    recency_score = _recency_priority(row.updated_at or row.created_at)
    source_score = _source_priority(row)
    return scope_score + query_score + kind_score + recency_score + source_score


def _should_consider_memory(row: MemoryRecord, query_tokens: set[str], context: ChatContext | None) -> bool:
    if not query_tokens:
        return True
    if _scope_priority(row, context) >= 60:
        return True
    if row.kind in {'preference', 'goal', 'constraint', 'background', 'profile'}:
        return True
    row_tokens = _tokenize_for_similarity(
        ' '.join(
            [
                row.content,
                row.kind,
                row.source,
                json.dumps(row.metadata, ensure_ascii=False),
            ]
        )
    )
    return bool(query_tokens & row_tokens)


def _query_similarity_score(row: MemoryRecord, query: str) -> float:
    if not query:
        return 0.0

    query_tokens = _tokenize_for_similarity(query)
    content_tokens = _tokenize_for_similarity(
        ' '.join(
            [
                row.content,
                row.kind,
                row.source,
                json.dumps(row.metadata, ensure_ascii=False),
            ]
        )
    )
    overlap = _similarity_score(query_tokens, content_tokens) * 40
    exact_bonus = 18 if query in row.content.lower() else 0
    return overlap + exact_bonus


def _kind_priority(kind: str) -> float:
    priorities = {
        'preference': 32,
        'goal': 28,
        'constraint': 24,
        'background': 20,
        'profile': 20,
        'summary': 18,
        'lesson_note': 18,
        'course_note': 16,
        'daily': 14,
        'note': 12,
    }
    return priorities.get(kind, 10)


def _recency_priority(raw_timestamp: str | None) -> float:
    if not raw_timestamp:
        return 0.0
    try:
        dt = datetime.fromisoformat(raw_timestamp)
    except ValueError:
        return 0.0
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    age_hours = max((datetime.now(timezone.utc) - dt).total_seconds() / 3600, 0)
    if age_hours <= 24:
        return 20
    if age_hours <= 72:
        return 12
    if age_hours <= 24 * 7:
        return 6
    return 0


def _source_priority(row: MemoryRecord) -> float:
    metadata = row.metadata or {}
    captured_from = str(metadata.get('captured_from', ''))
    if captured_from == 'tool':
        return 8
    if row.source in {'preferences', 'goals', 'profile'}:
        return 6
    if row.source in {'lesson', 'course', 'daily'}:
        return 4
    return 0


def _inspect_user_memory(
    user_id: str,
    context: ChatContext | None,
    day_key: str | None,
    episode_limit: int,
) -> dict:
    current_day = day_key or _today_key()
    daily_path = daily_memory_path(user_id, current_day)
    course_id = context.course_id if context else None
    lesson_id = context.lesson_id if context else None
    course_path = course_memory_path(user_id, course_id) if course_id else None
    lesson_path = lesson_memory_path(user_id, course_id or 'unknown-course', lesson_id) if lesson_id else None

    return {
        'global': {
            'preferences': _inspect_markdown_scope(preferences_path(user_id), 'Preferences', 'preferences', {'scope_type': 'global'}),
            'profile': _inspect_markdown_scope(profile_path(user_id), 'Profile', 'profile', {'scope_type': 'global'}),
            'goals': _inspect_markdown_scope(goals_path(user_id), 'Goals', 'goals', {'scope_type': 'global'}),
        },
        'daily': _inspect_markdown_scope(
            daily_path,
            f'Daily Memory: {current_day}',
            'daily',
            {'scope_type': 'daily', 'day': current_day},
        ),
        'course': _inspect_markdown_scope(
            course_path,
            f'Course Memory: {course_id}' if course_id else 'Course Memory',
            'course',
            {'scope_type': 'course', 'course_id': course_id},
        )
        if course_path
        else None,
        'lesson': _inspect_markdown_scope(
            lesson_path,
            f'Lesson Memory: {lesson_id}' if lesson_id else 'Lesson Memory',
            'lesson',
            {'scope_type': 'lesson', 'lesson_id': lesson_id, 'course_id': course_id},
        )
        if lesson_path
        else None,
        'episodes': [
            {
                'key': row.key,
                'content': row.content,
                'kind': row.kind,
                'source': row.source,
                'metadata': row.metadata,
                'created_at': row.created_at,
                'updated_at': row.updated_at,
            }
            for row in _read_episode_records(episodes_path(user_id))[-episode_limit:]
        ],
    }


def _inspect_markdown_scope(path: Path | None, title: str, source: str, metadata: dict) -> dict | None:
    if path is None:
        return None
    entries = _read_markdown_records(path, default_kind='note', source=source, metadata=metadata)
    summaries = _read_markdown_records(
        summary_memory_path(path),
        default_kind='summary',
        source=f'{source}_summary',
        metadata={**metadata, 'is_summary': True},
    )
    return {
        'path': str(path.relative_to(get_memory_root())),
        'summary_path': str(summary_memory_path(path).relative_to(get_memory_root())),
        'title': title,
        'summary': [
            {
                'key': row.key,
                'content': row.content,
                'kind': row.kind,
                'source': row.source,
                'metadata': row.metadata,
                'created_at': row.created_at,
                'updated_at': row.updated_at,
            }
            for row in summaries
        ],
        'entries': [
            {
                'key': row.key,
                'content': row.content,
                'kind': row.kind,
                'source': row.source,
                'metadata': row.metadata,
                'created_at': row.created_at,
                'updated_at': row.updated_at,
            }
            for row in entries
        ],
    }


def _iso_from_timestamp(timestamp: float) -> str:
    return datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat()
