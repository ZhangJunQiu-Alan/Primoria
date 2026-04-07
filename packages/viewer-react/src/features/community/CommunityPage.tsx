import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDiscussionComment,
  createDirectConversation,
  createDiscussion,
  createStudyRoom,
  deleteCommunityNote,
  deleteStudyRoom,
  fetchCommunityWorkspace,
  joinStudyRoom,
  saveCommunityNote,
  sendCommunityMessage,
  toggleDiscussionLike,
} from '@/shared/api/viewer/communityApi';
import { useProductLanguage } from '@/shared/i18n/useProductLanguage';
import { useSearchParams } from 'react-router-dom';
import { EmptyStateCard, ErrorStateCard, LoadingStateCard } from '@/shared/layout/AsyncState';
import { captureViewerError, captureViewerEvent } from '@/shared/platform/observability';
import { useAppSelector } from '@/shared/state/store';
import { useViewerCopy } from '@/shared/theme/copy';
import { cn } from '@/shared/utils/cn';
import { publicAssetPath } from '@/shared/utils/publicAsset';
import {
  FileText,
  Heart,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';

type Section = 'dashboard' | 'study' | 'messages' | 'trending' | 'notes';
type StatusState = { tone: 'success' | 'error'; message: string } | null;

function parseCommunitySection(value: string | null | undefined): Section {
  return value === 'study' || value === 'messages' || value === 'trending' || value === 'notes' ? value : 'dashboard';
}

const sectionVisuals: Record<
  Section,
  {
    icon: typeof LayoutDashboard;
    badge?: number;
  }
> = {
  dashboard: { icon: LayoutDashboard },
  study: { icon: Users },
  messages: { icon: MessageSquare },
  trending: { icon: TrendingUp },
  notes: { icon: FileText },
};

const dashboardPositions = [
  { left: '33%', top: '29%' },
  { left: '42%', top: '21%' },
  { left: '55%', top: '14%' },
  { left: '67%', top: '22%' },
  { left: '78%', top: '35%' },
  { left: '72%', top: '58%' },
  { left: '60%', top: '76%' },
  { left: '48%', top: '69%' },
  { left: '39%', top: '52%' },
  { left: '33%', top: '66%' },
  { left: '60%', top: '35%' },
  { left: '71%', top: '46%' },
] as const;

const dashboardNodePalette = [
  { dot: '#98dca5', glow: 'rgba(152, 220, 165, 0.42)' },
  { dot: '#87c6ff', glow: 'rgba(135, 198, 255, 0.4)' },
  { dot: '#bea2ff', glow: 'rgba(190, 162, 255, 0.42)' },
  { dot: '#eb9cd3', glow: 'rgba(235, 156, 211, 0.4)' },
] as const;

// ── Notes module-level helpers ──────────────────────────────────────────────

type NoteDraft = {
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

const NOTE_COLOR_MAP: Record<string, string> = {
  none: '#b5b5b5',
  green: '#7ec48a',
  blue: '#7ab5d8',
  amber: '#d4a44c',
  rose: '#d47a8a',
  purple: '#a07ad4',
};

function makeNoteDraft(overrides: {
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

function noteRelativeTime(isoString: string): string {
  const ms = Date.now() - new Date(isoString).getTime();
  if (ms < 60000) return '刚刚';
  if (ms < 3600000) return `${Math.floor(ms / 60000)} 分钟前`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)} 小时前`;
  return `${Math.floor(ms / 86400000)} 天前`;
}

export function CommunityPage() {
  const language = useProductLanguage();
  const copy = useViewerCopy();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const user = useAppSelector((state) => state.auth.user);
  const userId = user?.id ?? '';
  const requestedSection = parseCommunitySection(searchParams.get('section'));
  const companionTopic = searchParams.get('source') === 'home-companion' ? searchParams.get('topic')?.trim() ?? '' : '';
  const [section, setSection] = useState<Section>(requestedSection);
  const [conversationId, setConversationId] = useState('');
  const [composer, setComposer] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [roomForm, setRoomForm] = useState({ name: '', description: '' });
  const [discussionForm, setDiscussionForm] = useState({ title: '', body: '', category: 'General' });
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [notesDraft, setNotesDraft] = useState<NoteDraft[]>([]);
  const [status, setStatus] = useState<StatusState>(null);
  const [activeNoteKey, setActiveNoteKey] = useState<string | null>(null);
  const [noteQuery, setNoteQuery] = useState('');
  const [noteTab, setNoteTab] = useState<'all' | 'pin' | 'tag'>('all');
  const [noteSaveStatus, setNoteSaveStatus] = useState<'saved' | 'unsaved'>('saved');
  const [deleteConfirmKey, setDeleteConfirmKey] = useState<string | null>(null);
  const [noteColorPickerOpen, setNoteColorPickerOpen] = useState(false);
  const [tagInputActiveKey, setTagInputActiveKey] = useState<string | null>(null);
  const [tagInputValue, setTagInputValue] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteToSaveRef = useRef<NoteDraft | null>(null);
  const bodyInputRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const workspaceQuery = useQuery({
    queryKey: ['viewer', 'community', userId],
    queryFn: () => fetchCommunityWorkspace(userId),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (workspaceQuery.data && notesDraft.length === 0) {
      const drafts = workspaceQuery.data.notes.map((note) =>
        makeNoteDraft({ id: note.id, _key: note.id, title: note.title, body: note.body, room_id: note.room_id, lesson_id: note.lesson_id, updatedAt: note.updated_at }),
      );
      setNotesDraft(drafts);
    }
  }, [notesDraft.length, workspaceQuery.data]);

  useEffect(() => {
    if (notesDraft.length > 0 && !activeNoteKey) {
      setActiveNoteKey(notesDraft[0]._key);
    }
  }, [notesDraft, activeNoteKey]);

  useEffect(() => {
    const el = titleInputRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [activeNoteKey]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setNoteColorPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setSection(requestedSection);
  }, [requestedSection]);

  useEffect(() => {
    if (!workspaceQuery.data?.conversations.length) {
      setConversationId('');
      return;
    }
    if (!conversationId || !workspaceQuery.data.conversations.some((conversation) => conversation.id === conversationId)) {
      setConversationId(workspaceQuery.data.conversations[0].id);
    }
  }, [conversationId, workspaceQuery.data]);

  async function refreshCommunity() {
    await queryClient.invalidateQueries({ queryKey: ['viewer', 'community', userId] });
  }

  const directConversationMutation = useMutation({
    mutationFn: async () => createDirectConversation(userId, selectedPersonId),
    onSuccess: async (nextConversationId) => {
      await refreshCommunity();
      if (nextConversationId) {
        setConversationId(nextConversationId);
      }
      setSelectedPersonId('');
      setSection('messages');
      setStatus({ tone: 'success', message: '已创建新的对话。' });
      captureViewerEvent('viewer_community_direct_chat_opened');
    },
    onError: (error) => {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : '无法创建对话。' });
      captureViewerError(error, { area: 'community_direct_chat' });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: () => sendCommunityMessage(userId, conversationId, composer),
    onSuccess: async () => {
      await refreshCommunity();
      setComposer('');
      setStatus(null);
      captureViewerEvent('viewer_community_message_sent', { conversationId });
    },
    onError: (error) => {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : '无法发送消息。' });
      captureViewerError(error, { area: 'community_message_send', conversationId });
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: () => createStudyRoom(userId, roomForm),
    onSuccess: async () => {
      await refreshCommunity();
      setRoomForm({ name: '', description: '' });
      setStatus({ tone: 'success', message: '学习房间已创建。' });
      captureViewerEvent('viewer_community_room_saved');
    },
    onError: (error) => {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : '无法创建学习房间。' });
      captureViewerError(error, { area: 'community_room_save' });
    },
  });

  const joinRoomMutation = useMutation({
    mutationFn: (roomId: string) => joinStudyRoom(userId, roomId),
    onSuccess: async () => {
      await refreshCommunity();
      setStatus({ tone: 'success', message: '已加入学习房间。' });
      captureViewerEvent('viewer_community_room_joined');
    },
    onError: (error) => {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : '无法加入学习房间。' });
      captureViewerError(error, { area: 'community_room_join' });
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (roomId: string) => deleteStudyRoom(userId, roomId),
    onSuccess: async () => {
      await refreshCommunity();
      setStatus({ tone: 'success', message: '学习房间已删除。' });
      captureViewerEvent('viewer_community_room_deleted');
    },
    onError: (error) => {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : '无法删除学习房间。' });
      captureViewerError(error, { area: 'community_room_delete' });
    },
  });

  const createDiscussionMutation = useMutation({
    mutationFn: () => createDiscussion(userId, discussionForm),
    onSuccess: async () => {
      await refreshCommunity();
      setDiscussionForm({ title: '', body: '', category: 'General' });
      setStatus({ tone: 'success', message: '讨论已发布。' });
      captureViewerEvent('viewer_community_discussion_published');
    },
    onError: (error) => {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : '无法发布讨论。' });
      captureViewerError(error, { area: 'community_discussion_publish' });
    },
  });

  const toggleLikeMutation = useMutation({
    mutationFn: (discussionId: string) => toggleDiscussionLike(userId, discussionId),
    onSuccess: async () => {
      await refreshCommunity();
      captureViewerEvent('viewer_community_discussion_like_toggled');
    },
    onError: (error) => {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : '无法更新喜欢状态。' });
      captureViewerError(error, { area: 'community_discussion_like' });
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ discussionId, body }: { discussionId: string; body: string }) =>
      addDiscussionComment(userId, discussionId, body),
    onSuccess: async (_, variables) => {
      await refreshCommunity();
      setCommentDrafts((current) => ({ ...current, [variables.discussionId]: '' }));
      setStatus({ tone: 'success', message: '评论已发送。' });
      captureViewerEvent('viewer_community_comment_added', { discussionId: variables.discussionId });
    },
    onError: (error) => {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : '无法发送评论。' });
      captureViewerError(error, { area: 'community_comment_add' });
    },
  });

  const noteMutation = useMutation({
    mutationFn: (note: NoteDraft) =>
      saveCommunityNote(userId, { id: note.id, title: note.title, body: note.body, room_id: note.room_id, lesson_id: note.lesson_id }),
    onSuccess: (savedNote, variables) => {
      if (!variables.id && savedNote.id) {
        setNotesDraft((current) =>
          current.map((d) => (d._key === variables._key ? { ...d, id: savedNote.id, updatedAt: savedNote.updated_at } : d)),
        );
      }
      setNoteSaveStatus('saved');
      captureViewerEvent('viewer_community_note_saved');
    },
    onError: (error) => {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : '无法保存笔记。' });
      captureViewerError(error, { area: 'community_note_save' });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => deleteCommunityNote(userId, noteId),
    onSuccess: async () => {
      await refreshCommunity();
      captureViewerEvent('viewer_community_note_deleted');
    },
    onError: (error) => {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : '无法删除笔记。' });
      captureViewerError(error, { area: 'community_note_delete' });
    },
  });

  const workspace = workspaceQuery.data;
  const people = workspace?.people ?? [];
  const conversations = workspace?.conversations ?? [];
  const studyRooms = workspace?.studyRooms ?? [];
  const discussions = workspace?.discussions ?? [];
  const unreadCount = conversations.reduce((total, conversation) => total + conversation.unread_count, 0);
  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === conversationId) ?? conversations[0] ?? null,
    [conversationId, conversations],
  );

  // Notes derived state
  const filteredNotes = useMemo(() => {
    let list = [...notesDraft];
    if (noteQuery) {
      const q = noteQuery.toLowerCase();
      list = list.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
    }
    if (noteTab === 'pin') list = list.filter((n) => n.pinned);
    if (noteTab === 'tag') list = list.filter((n) => n.tags.length > 0);
    return list;
  }, [notesDraft, noteQuery, noteTab]);
  const pinnedNotes = filteredNotes.filter((n) => n.pinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.pinned);
  const activeNote = notesDraft.find((d) => d._key === activeNoteKey) ?? null;
  const activeNoteBody = activeNote?.body ?? '';
  const noteStats = useMemo(
    () => ({
      chars: activeNoteBody.length,
      words: activeNoteBody.trim() ? activeNoteBody.trim().split(/\s+/).length : 0,
      lines: activeNoteBody.split('\n').length,
    }),
    [activeNoteBody],
  );

  const sectionItems = [
    { id: 'dashboard' as const, label: copy.community.sections[0] },
    { id: 'study' as const, label: copy.community.sections[1] },
    { id: 'messages' as const, label: copy.community.sections[2] },
    { id: 'trending' as const, label: copy.community.sections[3] },
    { id: 'notes' as const, label: copy.community.sections[4] },
  ];

  function addBlankNote() {
    const newNote = makeNoteDraft({ title: '未命名笔记', body: '' });
    setNotesDraft((current) => [newNote, ...current]);
    setActiveNoteKey(newNote._key);
    setSection('notes');
  }

  function addCompanionContextNote() {
    const defaultTitle = companionTopic ? `${companionTopic} 笔记` : '未命名笔记';
    const newNote = makeNoteDraft({ title: defaultTitle, body: '' });
    setNotesDraft((current) => [newNote, ...current]);
    setActiveNoteKey(newNote._key);
    setSection('notes');
  }

  // ── Note editor helpers ──────────────────────────────────────────────────

  function triggerDebouncedSave(note: NoteDraft) {
    noteToSaveRef.current = note;
    setNoteSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (noteToSaveRef.current) noteMutation.mutate(noteToSaveRef.current);
    }, 800);
  }

  function handleNoteTitleChange(newTitle: string, note: NoteDraft) {
    const updated: NoteDraft = { ...note, title: newTitle, updatedAt: new Date().toISOString() };
    setNotesDraft((current) => current.map((d) => (d._key === note._key ? updated : d)));
    const el = titleInputRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
    triggerDebouncedSave(updated);
  }

  function handleNoteBodyChange(newBody: string, note: NoteDraft) {
    const updated: NoteDraft = { ...note, body: newBody, updatedAt: new Date().toISOString() };
    setNotesDraft((current) => current.map((d) => (d._key === note._key ? updated : d)));
    triggerDebouncedSave(updated);
  }

  function updateNoteDraft(_key: string, patch: Partial<NoteDraft>) {
    setNotesDraft((current) =>
      current.map((d) => (d._key === _key ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d)),
    );
  }

  function formatText(type: 'bold' | 'italic' | 'strike', note: NoteDraft) {
    const ta = bodyInputRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = ta.value.slice(start, end);
    const wrap = type === 'bold' ? '**' : type === 'italic' ? '*' : '~~';
    const replacement = sel ? `${wrap}${sel}${wrap}` : `${wrap}文字${wrap}`;
    ta.setRangeText(replacement, start, end, 'select');
    ta.focus();
    handleNoteBodyChange(ta.value, note);
  }

  function insertListItem(listType: 'ul' | 'ol', note: NoteDraft) {
    const ta = bodyInputRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const ls = ta.value.lastIndexOf('\n', pos - 1) + 1;
    const prefix = listType === 'ul' ? '- ' : '1. ';
    ta.setRangeText(prefix, ls, ls, 'end');
    ta.focus();
    handleNoteBodyChange(ta.value, note);
  }

  function insertQuote(note: NoteDraft) {
    const ta = bodyInputRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const ls = ta.value.lastIndexOf('\n', pos - 1) + 1;
    ta.setRangeText('> ', ls, ls, 'end');
    ta.focus();
    handleNoteBodyChange(ta.value, note);
  }

  function insertDivider(note: NoteDraft) {
    const ta = bodyInputRef.current;
    if (!ta) return;
    ta.setRangeText('\n\n---\n\n', ta.selectionStart, ta.selectionStart, 'end');
    ta.focus();
    handleNoteBodyChange(ta.value, note);
  }

  function handleBodyKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, note: NoteDraft) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); formatText('bold', note); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'i') { e.preventDefault(); formatText('italic', note); }
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (noteToSaveRef.current) noteMutation.mutate(noteToSaveRef.current);
    }
    if (e.key === 'Enter') {
      const ta = e.currentTarget;
      const pos = ta.selectionStart;
      const ls = ta.value.lastIndexOf('\n', pos - 1) + 1;
      const line = ta.value.slice(ls, pos);
      const ulMatch = /^(\s*- )(.+)/.exec(line);
      const olMatch = /^(\s*\d+\. )(.+)/.exec(line);
      if (ulMatch) {
        e.preventDefault();
        ta.setRangeText('\n- ', pos, pos, 'end');
        handleNoteBodyChange(ta.value, note);
      } else if (olMatch) {
        e.preventDefault();
        ta.setRangeText(`\n${parseInt(line) + 1}. `, pos, pos, 'end');
        handleNoteBodyChange(ta.value, note);
      }
    }
  }

  function commitTagInput() {
    const tag = tagInputValue.trim();
    if (tag && tagInputActiveKey) {
      const note = notesDraft.find((d) => d._key === tagInputActiveKey);
      if (note && !note.tags.includes(tag)) {
        updateNoteDraft(tagInputActiveKey, { tags: [...note.tags, tag] });
      }
    }
    setTagInputActiveKey(null);
    setTagInputValue('');
  }

  function removeNoteTag(noteKey: string, tag: string) {
    const note = notesDraft.find((d) => d._key === noteKey);
    if (note) updateNoteDraft(noteKey, { tags: note.tags.filter((t) => t !== tag) });
  }

  function deleteNote(noteKey: string) {
    const note = notesDraft.find((d) => d._key === noteKey);
    const remaining = notesDraft.filter((d) => d._key !== noteKey);
    setNotesDraft(remaining);
    setDeleteConfirmKey(null);
    const next = remaining.find((d) => d._key !== noteKey) ?? remaining[0] ?? null;
    setActiveNoteKey(next?._key ?? null);
    if (note?.id) deleteNoteMutation.mutate(note.id);
  }

  if (workspaceQuery.isLoading) {
    return (
      <div className="px-5 py-6 md:px-6 md:py-7">
        <LoadingStateCard />
      </div>
    );
  }

  if (workspaceQuery.error) {
    return (
      <div className="px-5 py-6 md:px-6 md:py-7">
        <ErrorStateCard
          message={workspaceQuery.error instanceof Error ? workspaceQuery.error.message : undefined}
          onRetry={() => void workspaceQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-[90%] max-w-[1380px] px-0 py-5 md:py-6">
      <div className="grid gap-4 xl:grid-cols-[194px_minmax(0,1fr)]">
        <aside className="viewer-panel rounded-[30px] p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#e4d2b6] bg-[linear-gradient(145deg,#d4b896_0%,#c4956a_100%)] text-white shadow-[0_14px_24px_rgba(196,149,106,0.18)]">
              <Users size={28} />
            </div>
            <div>
              <h1
                className="text-[2.2rem] font-semibold tracking-[-0.04em] text-[#3d342a]"
                style={{ fontFamily: '"Cormorant Garamond", serif' }}
              >
                {copy.community.title}
              </h1>
              <p className="viewer-botanical-eyebrow">{'主导航'}</p>
            </div>
          </div>

          <nav className="mt-7 space-y-2.5">
            {sectionItems.map((item) => {
              const visual = sectionVisuals[item.id];
              const Icon = visual.icon;
              const isActive = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-3.5 rounded-[20px] border px-3.5 py-3 text-left text-[0.92rem] font-bold transition',
                    isActive
                      ? 'border-[#b9d1bc] bg-[linear-gradient(180deg,rgba(235,243,232,0.96)_0%,rgba(223,240,224,0.88)_100%)] text-[#5c7d60]'
                      : 'border-transparent text-[#7a6b5e] hover:bg-[#faf4ea]',
                  )}
                  onClick={() => setSection(item.id)}
                >
                  <Icon size={25} />
                  <span className="flex-1">{item.label}</span>
                  {item.id === 'messages' && unreadCount > 0 ? (
                    <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-[#f34848] px-2 text-sm text-white">
                      {unreadCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="space-y-3.5">
          {companionTopic ? (
            <div
              data-testid="community-companion-context"
              className="viewer-panel rounded-[26px] px-5 py-4"
            >
              <p className="viewer-botanical-eyebrow">{language === 'zh-CN' ? '导师上下文' : 'Tutor context'}</p>
              <div className="mt-2 text-[1rem] font-semibold leading-7 text-[#4d4239]">
                {language === 'zh-CN'
                  ? `正在围绕《${companionTopic}》查看你的社区笔记与讨论。这里先提供上下文入口，不代表严格的课程过滤结果。`
                  : `Opening Community around "${companionTopic}". This is a contextual entry point, not a strict course-level filter yet.`}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="viewer-botanical-button viewer-botanical-button--primary"
                  onClick={addCompanionContextNote}
                >
                  {language === 'zh-CN' ? `新建《${companionTopic}》笔记` : `New note for "${companionTopic}"`}
                </button>
                <button
                  type="button"
                  className="viewer-botanical-button viewer-botanical-button--secondary"
                  onClick={() => setSection('trending')}
                >
                  {language === 'zh-CN' ? '查看讨论区' : 'Open discussions'}
                </button>
              </div>
            </div>
          ) : null}

          {status ? (
            <div
              className={cn(
                'viewer-botanical-notice',
                status.tone === 'error'
                  ? 'viewer-botanical-notice--error'
                  : 'viewer-botanical-notice--success',
              )}
            >
              {status.message}
            </div>
          ) : null}

          {section === 'dashboard' ? (
            <div
              className="relative min-h-[640px] overflow-hidden rounded-[30px] border border-[#d9e6de] shadow-[0_20px_52px_rgba(90,70,50,0.09)]"
              style={{
                background: `
                  radial-gradient(circle at 16% 18%, rgba(213, 245, 220, 0.9), transparent 25%),
                  radial-gradient(circle at 34% 32%, rgba(206, 231, 255, 0.78), transparent 28%),
                  radial-gradient(circle at 76% 20%, rgba(234, 220, 255, 0.82), transparent 30%),
                  radial-gradient(circle at 82% 74%, rgba(244, 214, 246, 0.72), transparent 28%),
                  linear-gradient(135deg, rgba(245, 250, 246, 0.98) 0%, rgba(231, 246, 239, 0.95) 24%, rgba(232, 242, 255, 0.93) 50%, rgba(244, 236, 255, 0.94) 76%, rgba(249, 243, 252, 0.97) 100%)
                `,
              }}
            >
              <div className="absolute left-5 top-5 z-20 flex gap-3">
                <button className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#d7e6df] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(239,248,244,0.78))] text-[#55506a] shadow-[0_10px_22px_rgba(111,124,170,0.08)] backdrop-blur-md">
                  <Users size={25} />
                </button>
                <button className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#d7e6df] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(244,240,255,0.78))] text-[#55506a] shadow-[0_10px_22px_rgba(111,124,170,0.08)] backdrop-blur-md">
                  <UserPlus size={25} />
                </button>
              </div>

              <div className="absolute right-7 top-7 z-20 rounded-[22px] border border-[#d8e2ea] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(239,246,251,0.78))] px-5 py-4 shadow-[0_12px_26px_rgba(111,124,170,0.08)] backdrop-blur-md">
                <div className="text-[1rem] font-black text-[#615b78]">{`已连接 ${people.length + 15}`}</div>
                <div className="mt-2.5 text-[1rem] font-black text-[#618a71]">{`在线 ${Math.max(people.filter((person) => person.status === 'online').length, 14)}`}</div>
              </div>

              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(161,224,178,0.16),rgba(255,255,255,0)_34%,rgba(150,201,255,0.14)_66%,rgba(221,186,255,0.18)_100%)]" />
                <div className="absolute left-[34%] top-[34%] h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(173, 243, 190, 0.22)] blur-[78px]" />
                <div className="absolute left-[62%] top-[28%] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(190, 164, 255, 0.2)] blur-[82px]" />
                <div className="absolute left-1/2 top-[54%] h-[540px] w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.68),rgba(244,241,255,0.24)_52%,rgba(255,255,255,0)_76%)]" />
                <img
                  src={publicAssetPath('Community_plant..png')}
                  alt="Community planet"
                  className="pointer-events-none absolute left-1/2 top-1/2 h-[580px] w-[580px] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.98]"
                  style={{
                    filter:
                      'drop-shadow(0 26px 56px rgba(148, 118, 255, 0.18)) drop-shadow(0 0 42px rgba(146, 241, 184, 0.18))',
                  }}
                />
              </div>

              {people.slice(0, dashboardPositions.length).map((person, index) => {
                const position = dashboardPositions[index];
                const palette = dashboardNodePalette[index % dashboardNodePalette.length];
                return (
                  <div key={person.id} className="absolute z-20" style={position}>
                    <div
                      className="mx-auto h-7 w-7 rounded-full border border-white/70"
                      style={{
                        backgroundColor: palette.dot,
                        boxShadow: `0 0 0 6px rgba(255,255,255,0.26), 0 0 22px ${palette.glow}`,
                      }}
                    />
                    <div className="mt-2 text-center text-[0.84rem] font-semibold tracking-[-0.01em] text-[#5a5670] [text-shadow:0_1px_0_rgba(255,255,255,0.78)]">
                      {person.display_name}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {section === 'study' ? (
            <div className="grid gap-4 xl:grid-cols-[290px_minmax(0,1fr)]">
              <div className="viewer-panel rounded-[26px] p-5">
                <h2 className="viewer-botanical-heading text-[2rem]">{'创建学习房间'}</h2>
                <div className="mt-5 space-y-4">
                  <input
                    className="viewer-botanical-input"
                    placeholder="房间名称"
                    value={roomForm.name}
                    onChange={(event) => setRoomForm((current) => ({ ...current, name: event.target.value }))}
                  />
                  <textarea
                    className="viewer-botanical-input min-h-32"
                    placeholder="描述这次学习目标"
                    value={roomForm.description}
                    onChange={(event) => setRoomForm((current) => ({ ...current, description: event.target.value }))}
                  />
                  <button
                    type="button"
                    className="viewer-botanical-button viewer-botanical-button--primary w-full"
                    onClick={() => createRoomMutation.mutate()}
                    disabled={createRoomMutation.isPending}
                  >
                    {createRoomMutation.isPending ? copy.community.creatingRoom : copy.community.createRoom}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {studyRooms.map((room) => {
                  const joined = room.member_ids.includes(userId);
                  return (
                    <div key={room.id} className="viewer-panel rounded-[26px] p-5">
                      <div className="viewer-botanical-eyebrow text-[0.72rem]">{'Study room'}</div>
                      <h3 className="mt-3 text-[1.8rem] font-semibold text-[#3d342a]" style={{ fontFamily: '"Cormorant Garamond", serif' }}>{room.name}</h3>
                      <p className="mt-3 text-[1rem] leading-7 text-[#6f6359]">{room.description}</p>
                      <p className="mt-5 text-[0.98rem] font-bold text-[#8a7d72]">{`${room.members} 人 · ${room.status}`}</p>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="button"
                          className="viewer-botanical-button viewer-botanical-button--primary"
                          onClick={() => joinRoomMutation.mutate(room.id)}
                          disabled={joined || joinRoomMutation.isPending}
                        >
                          {joined ? '已加入' : '加入房间'}
                        </button>
                        {room.created_by === userId ? (
                          <button
                            type="button"
                            className="viewer-botanical-button border border-[#e6c8c2] bg-[#fbefed] text-[#9d554d]"
                            onClick={() => deleteRoomMutation.mutate(room.id)}
                            disabled={deleteRoomMutation.isPending}
                          >
                            {'删除房间'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {section === 'messages' ? (
            <div className="grid gap-4 xl:grid-cols-[290px_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="viewer-panel rounded-[26px] p-5">
                  <h2 className="viewer-botanical-heading text-[2rem]">{'开启新对话'}</h2>
                  <div className="mt-4 space-y-3">
                    {people.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        className={cn(
                          'flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left text-sm font-bold transition',
                          selectedPersonId === person.id
                            ? 'border-[#c8dbcb] bg-[#edf5ec] text-[#5c7d60]'
                            : 'border-[#ddd3c3] bg-[rgba(255,252,247,0.76)] text-[#6a5f56]',
                        )}
                        onClick={() => setSelectedPersonId(person.id)}
                      >
                        <span>{person.display_name}</span>
                        <span className={cn('h-2.5 w-2.5 rounded-full', person.status === 'online' ? 'bg-[#1fb65c]' : 'bg-[#c1c7d4]')} />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="viewer-botanical-button viewer-botanical-button--primary mt-4 w-full"
                    onClick={() => directConversationMutation.mutate()}
                    disabled={!selectedPersonId || directConversationMutation.isPending}
                  >
                    {directConversationMutation.isPending ? '创建中…' : '创建私聊'}
                  </button>
                </div>

                <div className="viewer-panel rounded-[26px] p-4">
                  <div className="space-y-3">
                    {conversations.map((conversation) => (
                      <button
                        key={conversation.id}
                        type="button"
                        className={cn(
                          'flex w-full items-start justify-between gap-3 rounded-[18px] px-4 py-4 text-left transition',
                          activeConversation?.id === conversation.id ? 'bg-[#edf5ec]' : 'hover:bg-[#faf4ea]',
                        )}
                        onClick={() => setConversationId(conversation.id)}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-[1rem] font-black text-[#3d342a]">{conversation.title}</div>
                          <div className="mt-1 truncate text-sm font-medium text-[#887b70]">{conversation.preview || '开始一段新对话'}</div>
                        </div>
                        {conversation.unread_count > 0 ? (
                          <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[#f34848] px-2 text-xs font-black text-white">
                            {conversation.unread_count}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="viewer-panel flex min-h-[580px] flex-col rounded-[26px]">
                {activeConversation ? (
                  <>
                    <div className="border-b border-[#eadfce] px-6 py-5">
                      <h3 className="text-[2rem] font-semibold text-[#3d342a]" style={{ fontFamily: '"Cormorant Garamond", serif' }}>{activeConversation.title}</h3>
                      <p className="mt-1 text-sm font-medium text-[#8a7d72]">{activeConversation.kind === 'group' ? '群组对话' : '私聊'}</p>
                    </div>
                    <div className="flex-1 space-y-4 overflow-auto px-6 py-5">
                      {activeConversation.messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            'max-w-[80%] rounded-[22px] px-4 py-3 text-sm font-medium leading-7',
                            message.author_id === userId
                              ? 'ml-auto border border-[#b9d1bc] bg-[linear-gradient(145deg,#a8c5ac_0%,#7a9e7e_100%)] text-white'
                              : 'border border-[#ddd3c3] bg-[rgba(255,252,247,0.88)] text-[#4d4239]',
                          )}
                        >
                          <div className="mb-1 text-xs font-black uppercase tracking-[0.14em] opacity-70">{message.author_name}</div>
                          {message.body}
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-[#eadfce] px-6 py-5">
                      <div className="flex gap-3">
                        <input
                          className="viewer-botanical-input min-w-0 flex-1"
                          placeholder="发送一条消息"
                          value={composer}
                          onChange={(event) => setComposer(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              sendMessageMutation.mutate();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="viewer-botanical-button viewer-botanical-button--primary"
                          onClick={() => sendMessageMutation.mutate()}
                          disabled={sendMessageMutation.isPending}
                        >
                          {sendMessageMutation.isPending ? copy.community.sending : copy.community.send}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-6">
                    <EmptyStateCard message="暂无对话。从左侧选择一位成员，或者创建新的学习房间。" />
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {section === 'trending' ? (
            <div className="grid gap-4 xl:grid-cols-[306px_minmax(0,1fr)]">
              <div className="viewer-panel rounded-[26px] p-5">
                <h2 className="viewer-botanical-heading text-[2rem]">{'发布讨论'}</h2>
                <div className="mt-5 space-y-4">
                  <input
                    className="viewer-botanical-input"
                    placeholder="标题"
                    value={discussionForm.title}
                    onChange={(event) => setDiscussionForm((current) => ({ ...current, title: event.target.value }))}
                  />
                  <input
                    className="viewer-botanical-input"
                    placeholder="分类"
                    value={discussionForm.category}
                    onChange={(event) => setDiscussionForm((current) => ({ ...current, category: event.target.value }))}
                  />
                  <textarea
                    className="viewer-botanical-input min-h-36"
                    placeholder="分享你的问题、发现或想法"
                    value={discussionForm.body}
                    onChange={(event) => setDiscussionForm((current) => ({ ...current, body: event.target.value }))}
                  />
                  <button
                    type="button"
                    className="viewer-botanical-button viewer-botanical-button--warm w-full"
                    onClick={() => createDiscussionMutation.mutate()}
                    disabled={createDiscussionMutation.isPending}
                  >
                    {createDiscussionMutation.isPending ? '发布中…' : '发布讨论'}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {discussions.map((discussion) => (
                  <article key={discussion.id} className="viewer-panel rounded-[26px] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="viewer-botanical-eyebrow text-[0.72rem]">{discussion.category}</div>
                        <h3 className="mt-2 text-[1.9rem] font-semibold text-[#3d342a]" style={{ fontFamily: '"Cormorant Garamond", serif' }}>{discussion.title}</h3>
                        <p className="mt-3 text-[1rem] leading-7 text-[#6f6359]">{discussion.body}</p>
                      </div>
                      <button
                        type="button"
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black',
                          discussion.liked_by_me ? 'bg-[#fbefed] text-[#b7655c]' : 'bg-[#f3efe8] text-[#7e7166]',
                        )}
                        onClick={() => toggleLikeMutation.mutate(discussion.id)}
                      >
                        <Heart size={16} className={discussion.liked_by_me ? 'fill-current' : ''} />
                        {discussion.likes}
                      </button>
                    </div>

                    <div className="mt-5 rounded-[22px] border border-[#e4d8ca] bg-[rgba(255,252,247,0.82)] p-4">
                      <div className="space-y-3">
                        {discussion.comments.map((comment) => (
                          <div key={comment.id} className="rounded-[18px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.9)] px-4 py-3">
                            <div className="text-sm font-black text-[#3d342a]">{comment.author_name}</div>
                            <div className="mt-1 text-sm leading-6 text-[#6f6359]">{comment.body}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex gap-3">
                        <input
                          className="viewer-botanical-input min-w-0 flex-1"
                          placeholder="写下你的评论"
                          value={commentDrafts[discussion.id] ?? ''}
                          onChange={(event) =>
                            setCommentDrafts((current) => ({ ...current, [discussion.id]: event.target.value }))
                          }
                        />
                        <button
                          type="button"
                          className="viewer-botanical-button viewer-botanical-button--primary"
                          onClick={() =>
                            commentMutation.mutate({
                              discussionId: discussion.id,
                              body: commentDrafts[discussion.id] ?? '',
                            })
                          }
                          disabled={commentMutation.isPending}
                        >
                          {'发送'}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {section === 'notes' ? (
            <div className="space-y-3">
              {/* Header */}
              <div className="viewer-panel flex items-center justify-between rounded-[26px] px-5 py-4">
                <div>
                  <h2 className="viewer-botanical-heading text-[2rem]">{'笔记'}</h2>
                  <p className="mt-1 text-sm font-medium text-[#8a7d72]">{'保存你的个人笔记，或关联到学习房间。'}</p>
                </div>
                <button type="button" className="viewer-botanical-button viewer-botanical-button--primary" onClick={addBlankNote}>
                  <Plus size={18} />
                  {copy.community.addNote}
                </button>
              </div>

              {/* Two-column layout */}
              <div className="grid gap-3" style={{ gridTemplateColumns: '260px minmax(0,1fr)' }}>

                {/* ── Left: Note list ── */}
                <div className="viewer-panel flex flex-col overflow-hidden rounded-[26px]">
                  {/* Search */}
                  <div className="relative border-b border-[#e4dcd0] px-3 pb-2.5 pt-3">
                    <Search size={13} className="absolute left-6 top-1/2 -translate-y-1/2 text-[#a89d93]" style={{ marginTop: '-4px' }} />
                    <input
                      type="text"
                      placeholder="搜索笔记…"
                      value={noteQuery}
                      onChange={(e) => setNoteQuery(e.target.value)}
                      className="viewer-botanical-input w-full py-2 pl-7 pr-3 text-[.82rem]"
                    />
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-1 border-b border-[#e4dcd0] px-2.5 py-2">
                    {(['all', 'pin', 'tag'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNoteTab(t)}
                        className={cn(
                          'flex-1 rounded-[8px] py-1.5 text-[.73rem] font-[700] transition-all',
                          noteTab === t
                            ? 'bg-[rgba(106,158,110,.13)] text-[#6a9e6e]'
                            : 'text-[#a89d93] hover:bg-[rgba(0,0,0,.04)] hover:text-[#7a6b5e]',
                        )}
                      >
                        {t === 'all' ? '全部' : t === 'pin' ? '置顶' : '标签'}
                      </button>
                    ))}
                  </div>

                  {/* Card list */}
                  <div className="flex-1 space-y-0.5 overflow-y-auto p-2" style={{ maxHeight: '520px' }}>
                    {filteredNotes.length === 0 ? (
                      <div className="py-8 text-center text-[.82rem] text-[#a89d93]">
                        {notesDraft.length === 0 ? '还没有笔记' : '没有找到笔记'}
                      </div>
                    ) : (
                      <>
                        {pinnedNotes.length > 0 && (
                          <div className="px-2 pb-1 pt-1.5 text-[.67rem] font-[800] uppercase tracking-[.08em] text-[#a89d93]">📌 置顶</div>
                        )}
                        {pinnedNotes.map((note) => (
                          <button
                            key={note._key}
                            type="button"
                            onClick={() => setActiveNoteKey(note._key)}
                            className={cn(
                              'relative w-full rounded-[14px] border py-2.5 pl-4 pr-3 text-left transition-all',
                              note._key === activeNoteKey
                                ? 'border-[#b9d1bc] bg-[rgba(235,246,236,.7)]'
                                : 'border-transparent hover:border-[#e4dcd0] hover:bg-[rgba(250,244,234,.8)]',
                            )}
                            style={note.color !== 'none' ? { borderLeftColor: NOTE_COLOR_MAP[note.color], borderLeftWidth: '3px' } : undefined}
                          >
                            <span className="absolute right-2 top-2 text-[10px] opacity-40">📌</span>
                            <div className="truncate pr-4 text-[.85rem] font-[700] text-[#3d342a]">{note.title || '未命名笔记'}</div>
                            <div className="mt-1 truncate text-[.75rem] text-[#a89d93]">
                              {note.body.replace(/[*_~`#>\-[\]]/g, '').trim().slice(0, 50) || '（空白笔记）'}
                            </div>
                            <div className="mt-1.5 flex items-center justify-between">
                              <span className="text-[.69rem] text-[#a89d93]">{noteRelativeTime(note.updatedAt)}</span>
                              <div className="flex gap-1">
                                {note.tags.slice(0, 2).map((tag) => (
                                  <span key={tag} className="rounded-full border border-[rgba(106,158,110,.2)] bg-[rgba(106,158,110,.1)] px-1.5 py-0.5 text-[.65rem] font-[700] text-[#6a9e6e]">{tag}</span>
                                ))}
                              </div>
                            </div>
                          </button>
                        ))}

                        {unpinnedNotes.length > 0 && pinnedNotes.length > 0 && (
                          <div className="px-2 pb-1 pt-2 text-[.67rem] font-[800] uppercase tracking-[.08em] text-[#a89d93]">笔记</div>
                        )}
                        {unpinnedNotes.map((note) => (
                          <button
                            key={note._key}
                            type="button"
                            onClick={() => setActiveNoteKey(note._key)}
                            className={cn(
                              'relative w-full rounded-[14px] border py-2.5 pl-4 pr-3 text-left transition-all',
                              note._key === activeNoteKey
                                ? 'border-[#b9d1bc] bg-[rgba(235,246,236,.7)]'
                                : 'border-transparent hover:border-[#e4dcd0] hover:bg-[rgba(250,244,234,.8)]',
                            )}
                            style={note.color !== 'none' ? { borderLeftColor: NOTE_COLOR_MAP[note.color], borderLeftWidth: '3px' } : undefined}
                          >
                            <div className="truncate text-[.85rem] font-[700] text-[#3d342a]">{note.title || '未命名笔记'}</div>
                            <div className="mt-1 truncate text-[.75rem] text-[#a89d93]">
                              {note.body.replace(/[*_~`#>\-[\]]/g, '').trim().slice(0, 50) || '（空白笔记）'}
                            </div>
                            <div className="mt-1.5 flex items-center justify-between">
                              <span className="text-[.69rem] text-[#a89d93]">{noteRelativeTime(note.updatedAt)}</span>
                              <div className="flex gap-1">
                                {note.tags.slice(0, 2).map((tag) => (
                                  <span key={tag} className="rounded-full border border-[rgba(106,158,110,.2)] bg-[rgba(106,158,110,.1)] px-1.5 py-0.5 text-[.65rem] font-[700] text-[#6a9e6e]">{tag}</span>
                                ))}
                              </div>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* ── Right: Editor ── */}
                <div className="viewer-panel flex min-h-[540px] flex-col overflow-hidden rounded-[26px]">
                  {!activeNote ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-[#a89d93]">
                      <div className="text-[2.5rem] opacity-30">📝</div>
                      <div className="font-['Georgia',serif] text-[1.2rem] font-[600] tracking-[-0.03em] text-[#7a6b5e]">选择一篇笔记</div>
                      <p className="text-[.82rem]">从左侧选择，或新建一篇开始书写</p>
                      <button type="button" className="viewer-botanical-button viewer-botanical-button--primary mt-2" onClick={addBlankNote}>
                        <Plus size={16} />
                        新建笔记
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Toolbar */}
                      <div className="flex flex-wrap items-center gap-0.5 border-b border-[#e4dcd0] bg-[rgba(244,239,231,.5)] px-3 py-2">
                        <button type="button" title="加粗 ⌘B" onClick={() => formatText('bold', activeNote)} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-transparent text-[.82rem] text-[#7a6b5e] transition hover:border-[#e4dcd0] hover:bg-white"><b>B</b></button>
                        <button type="button" title="斜体 ⌘I" onClick={() => formatText('italic', activeNote)} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-transparent text-[.82rem] text-[#7a6b5e] transition hover:border-[#e4dcd0] hover:bg-white"><em>I</em></button>
                        <button type="button" title="删除线" onClick={() => formatText('strike', activeNote)} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-transparent text-[.82rem] text-[#7a6b5e] transition hover:border-[#e4dcd0] hover:bg-white"><s>S</s></button>
                        <div className="mx-1 h-[18px] w-px bg-[#e4dcd0]" />
                        <button type="button" title="无序列表" onClick={() => insertListItem('ul', activeNote)} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-transparent text-[.82rem] text-[#7a6b5e] transition hover:border-[#e4dcd0] hover:bg-white">≡</button>
                        <button type="button" title="有序列表" onClick={() => insertListItem('ol', activeNote)} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-transparent text-[.82rem] text-[#7a6b5e] transition hover:border-[#e4dcd0] hover:bg-white">①</button>
                        <button type="button" title="引用" onClick={() => insertQuote(activeNote)} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-transparent text-[.82rem] text-[#7a6b5e] transition hover:border-[#e4dcd0] hover:bg-white">❝</button>
                        <div className="mx-1 h-[18px] w-px bg-[#e4dcd0]" />
                        <button type="button" title="分割线" onClick={() => insertDivider(activeNote)} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-transparent text-[.82rem] text-[#7a6b5e] transition hover:border-[#e4dcd0] hover:bg-white">—</button>
                        <div className="mx-1 h-[18px] w-px bg-[#e4dcd0]" />
                        {/* Color picker */}
                        <div ref={colorPickerRef} className="relative">
                          <button type="button" title="颜色标记" onClick={() => setNoteColorPickerOpen((v) => !v)} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-transparent transition hover:border-[#e4dcd0] hover:bg-white">
                            <span className="h-[17px] w-[17px] rounded-full border-2 border-white shadow-sm" style={{ background: NOTE_COLOR_MAP[activeNote.color] ?? '#b5b5b5' }} />
                          </button>
                          {noteColorPickerOpen && (
                            <div className="absolute left-0 top-[calc(100%+6px)] z-50 flex gap-1.5 rounded-[12px] border border-[#e4dcd0] bg-white p-2.5 shadow-[0_8px_24px_rgba(70,54,36,.12)]">
                              {Object.entries(NOTE_COLOR_MAP).map(([colorKey, colorHex]) => (
                                <button key={colorKey} type="button" title={colorKey} onClick={() => { updateNoteDraft(activeNote._key, { color: colorKey }); setNoteColorPickerOpen(false); }} className={cn('h-5 w-5 rounded-full border-2 transition hover:scale-110', activeNote.color === colorKey ? 'border-[#7a6b5e]' : 'border-white')} style={{ background: colorHex }} />
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Pin */}
                        <button type="button" title={activeNote.pinned ? '取消置顶' : '置顶'} onClick={() => updateNoteDraft(activeNote._key, { pinned: !activeNote.pinned })} className={cn('flex h-8 w-8 items-center justify-center rounded-[8px] border text-[13px] transition', activeNote.pinned ? 'border-[#b9d1bc] bg-[rgba(106,158,110,.13)] text-[#6a9e6e]' : 'border-transparent text-[#a89d93] hover:border-[#e4dcd0] hover:bg-white')}>
                          📌
                        </button>
                        <div className="flex-1" />
                        {/* Save indicator */}
                        <div className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[.72rem] transition-all', noteSaveStatus === 'saved' ? 'border-[#e4dcd0] bg-[rgba(244,239,231,.8)] text-[#a89d93]' : 'border-[#d4c8b8] bg-[rgba(244,239,231,.8)] text-[#b8a898]')}>
                          <span className={cn('h-1.5 w-1.5 rounded-full transition-colors', noteSaveStatus === 'saved' ? 'bg-[#7ec48a]' : 'animate-pulse bg-[#d4a44c]')} />
                          {noteSaveStatus === 'saved' ? '已保存' : '未保存…'}
                        </div>
                      </div>

                      {/* Body */}
                      <div className="flex flex-1 flex-col gap-0 overflow-y-auto px-8 py-7">
                        <textarea
                          ref={titleInputRef}
                          rows={1}
                          value={activeNote.title}
                          placeholder="笔记标题…"
                          className="w-full resize-none overflow-hidden border-none bg-transparent text-[2rem] font-[600] leading-[1.2] tracking-[-0.04em] text-[#3d342a] outline-none placeholder:text-[rgba(160,148,136,.4)]"
                          style={{ fontFamily: '"Georgia","Noto Serif SC",serif' }}
                          onChange={(e) => handleNoteTitleChange(e.target.value, activeNote)}
                          onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                              e.preventDefault();
                              if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                              if (noteToSaveRef.current) noteMutation.mutate(noteToSaveRef.current);
                            }
                          }}
                        />
                        {/* Date + tags */}
                        <div className="mb-4 mt-3 flex flex-wrap items-center gap-2">
                          <span className="text-[.75rem] text-[#a89d93]">
                            📅 {new Date(activeNote.updatedAt).toLocaleDateString(language === 'zh-CN' ? 'zh-CN' : 'en-US', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {activeNote.tags.map((tag) => (
                              <span key={tag} className="flex items-center gap-1 rounded-full border border-[rgba(106,158,110,.22)] bg-[rgba(106,158,110,.1)] px-2 py-0.5 text-[.73rem] font-[700] text-[#6a9e6e]">
                                {tag}
                                <button type="button" onClick={() => removeNoteTag(activeNote._key, tag)} className="text-[#6a9e6e] opacity-50 transition hover:opacity-100">×</button>
                              </span>
                            ))}
                            {tagInputActiveKey === activeNote._key ? (
                              <input
                                type="text"
                                autoFocus
                                value={tagInputValue}
                                onChange={(e) => setTagInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commitTagInput(); }
                                  if (e.key === 'Escape') { setTagInputActiveKey(null); setTagInputValue(''); }
                                }}
                                onBlur={commitTagInput}
                                placeholder="标签…"
                                maxLength={16}
                                className="w-[72px] rounded-full border border-[#b9d1bc] bg-white px-2 py-0.5 text-[.73rem] font-[700] text-[#3d342a] outline-none"
                              />
                            ) : (
                              <button type="button" onClick={() => setTagInputActiveKey(activeNote._key)} className="flex items-center gap-1 rounded-full border border-dashed border-[#d9cfc3] px-2 py-0.5 text-[.73rem] font-[700] text-[#a89d93] transition hover:border-[#b9d1bc] hover:text-[#6a9e6e]">
                                ＋ 标签
                              </button>
                            )}
                          </div>
                        </div>
                        <hr className="mb-4 border-[rgba(214,204,188,.6)]" />
                        <textarea
                          ref={bodyInputRef}
                          value={activeNote.body}
                          placeholder={'开始书写…\n\n支持 **粗体**、*斜体*、- 列表'}
                          className="min-h-[240px] flex-1 resize-none border-none bg-transparent text-[.92rem] leading-[1.9] text-[#4a3f35] outline-none placeholder:text-[rgba(160,148,136,.4)]"
                          onChange={(e) => handleNoteBodyChange(e.target.value, activeNote)}
                          onKeyDown={(e) => handleBodyKeyDown(e, activeNote)}
                        />
                      </div>

                      {/* Status bar */}
                      <div className="flex items-center gap-3 border-t border-[#e4dcd0] bg-[rgba(244,239,231,.45)] px-8 py-2.5">
                        <span className="text-[.72rem] text-[#a89d93]">字符 <b className="font-[700] text-[#7a6b5e]">{noteStats.chars}</b></span>
                        <span className="text-[.72rem] text-[#a89d93]">词数 <b className="font-[700] text-[#7a6b5e]">{noteStats.words}</b></span>
                        <span className="text-[.72rem] text-[#a89d93]">行数 <b className="font-[700] text-[#7a6b5e]">{noteStats.lines}</b></span>
                        <div className="flex-1" />
                        <button type="button" onClick={() => setDeleteConfirmKey(activeNote._key)} className="flex items-center gap-1.5 rounded-[8px] border border-[#e4dcd0] px-2.5 py-1.5 text-[.74rem] font-[700] text-[#a89d93] transition hover:border-[#d45a5a] hover:bg-[rgba(212,90,90,.08)] hover:text-[#d45a5a]">
                          <Trash2 size={13} />
                          删除
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Delete confirmation overlay */}
              {deleteConfirmKey !== null && (() => {
                const noteToDelete = notesDraft.find((d) => d._key === deleteConfirmKey);
                return (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(40,32,24,.32)] backdrop-blur-[5px]" onClick={() => setDeleteConfirmKey(null)}>
                    <div className="viewer-panel w-[90%] max-w-[360px] rounded-[24px] p-8 shadow-[0_22px_64px_rgba(70,54,36,.14)]" onClick={(e) => e.stopPropagation()}>
                      <h3 className="viewer-botanical-heading mb-2 text-[1.2rem]">{'删除这篇笔记？'}</h3>
                      <p className="mb-6 text-[.84rem] leading-[1.65] text-[#7a6b5e]">
                        {`「${noteToDelete?.title || '未命名笔记'}」删除后无法恢复。`}
                      </p>
                      <div className="flex justify-end gap-2.5">
                        <button type="button" onClick={() => setDeleteConfirmKey(null)} className="viewer-botanical-button">{'取消'}</button>
                        <button type="button" onClick={() => deleteNote(deleteConfirmKey)} className="rounded-full bg-[#d45a5a] px-[18px] py-[9px] text-[.84rem] font-[700] text-white shadow-[0_3px_12px_rgba(212,90,90,.3)] transition hover:opacity-[.88]">
                          {'确认删除'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
