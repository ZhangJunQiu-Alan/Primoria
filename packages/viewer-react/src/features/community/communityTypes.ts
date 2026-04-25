export type CommunitySection = 'study' | 'messages' | 'trending' | 'notes';
export type CommunityStatusState = { tone: 'success' | 'error'; message: string } | null;

export type NoteDraft = {
  id?: string;
  _key: string;
  title: string;
  body: string;
  room_id?: string | null;
  lesson_id?: string | null;
  color: string;
  pinned: boolean;
  tags: string[];
  updatedAt: string;
};

export const NOTE_COLOR_MAP: Record<string, string> = {
  none: '#b5b5b5',
  green: '#7ec48a',
  blue: '#7ab5d8',
  amber: '#d4a44c',
  rose: '#d47a8a',
  purple: '#a07ad4',
};

export function parseCommunitySection(value: string | null | undefined): CommunitySection {
  return value === 'messages' || value === 'trending' || value === 'notes' ? value : 'study';
}

export function makeNoteDraft(overrides: {
  title: string;
  body: string;
  id?: string;
  _key?: string;
  room_id?: string | null;
  lesson_id?: string | null;
  updatedAt?: string;
}): NoteDraft {
  const key = overrides._key ?? overrides.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    _key: key,
    id: overrides.id,
    title: overrides.title,
    body: overrides.body,
    room_id: overrides.room_id ?? null,
    lesson_id: overrides.lesson_id ?? null,
    color: 'none',
    pinned: false,
    tags: [],
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
  };
}

export function noteRelativeTime(isoString: string): string {
  const ms = Date.now() - new Date(isoString).getTime();
  if (ms < 60000) return '刚刚';
  if (ms < 3600000) return `${Math.floor(ms / 60000)} 分钟前`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)} 小时前`;
  return `${Math.floor(ms / 86400000)} 天前`;
}
