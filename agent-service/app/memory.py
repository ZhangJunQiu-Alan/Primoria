from __future__ import annotations

import asyncio
import json
import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from hashlib import sha1
from pathlib import Path
from typing import Literal
from uuid import uuid4

from langgraph.checkpoint.memory import InMemorySaver, PersistentDict
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import get_settings
from app.schemas import ChatContext

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


class PersistentInMemorySaver(InMemorySaver):
    def __init__(self, root: Path):
        super().__init__()
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)
        self.storage = PersistentDict(
            lambda: defaultdict(dict),
            filename=str(self.root / 'storage.pkl'),
        )
        self.writes = PersistentDict(
            dict,
            filename=str(self.root / 'writes.pkl'),
        )
        self.blobs = PersistentDict(
            filename=str(self.root / 'blobs.pkl'),
        )
        for mapping in (self.storage, self.writes, self.blobs):
            if Path(mapping.filename).exists():
                mapping.load()

    def put(self, config, checkpoint, metadata, new_versions):
        result = super().put(config, checkpoint, metadata, new_versions)
        self._sync()
        return result

    def put_writes(self, config, writes, task_id, task_path: str = '') -> None:
        super().put_writes(config, writes, task_id, task_path)
        self._sync()

    def delete_thread(self, thread_id: str) -> None:
        super().delete_thread(thread_id)
        self._sync()

    def _sync(self) -> None:
        self.storage.sync()
        self.writes.sync()
        self.blobs.sync()


def resolve_thread_id(user_id: str, thread_id: str | None) -> str:
    if thread_id and thread_id.strip():
        return thread_id.strip()
    return f'viewer:{user_id}:{uuid4()}'


@lru_cache(maxsize=1)
def get_checkpointer() -> InMemorySaver:
    return PersistentInMemorySaver(get_memory_root() / 'checkpoints')


def build_thread_config(thread_id: str) -> dict:
    return {'configurable': {'thread_id': thread_id}}


async def thread_checkpoint_exists(thread_id: str) -> bool:
    checkpoint = await get_checkpointer().aget_tuple(build_thread_config(thread_id))
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
    bucket = _bucket_for_kind(normalized_kind, context)
    if bucket == 'episodes':
        return await asyncio.to_thread(_append_episode_memory, user_id, payload)
    target = _resolve_markdown_target(user_id, bucket, payload, context)
    return await asyncio.to_thread(
        _append_markdown_memory,
        user_id,
        payload,
        bucket,
        target['path'],
        target['source'],
        target['metadata'],
        target['title'],
    )


async def search_user_memories(
    user_id: str,
    *,
    query: str | None = None,
    kind: str | None = None,
    limit: int = 5,
    context: ChatContext | None = None,
) -> list[dict]:
    rows = await asyncio.to_thread(_load_user_memories, user_id, context)
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
    context: ChatContext | None = None,
    day_key: str | None = None,
    episode_limit: int = 20,
) -> dict:
    return await asyncio.to_thread(_inspect_user_memory, user_id, context, day_key, episode_limit)


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
