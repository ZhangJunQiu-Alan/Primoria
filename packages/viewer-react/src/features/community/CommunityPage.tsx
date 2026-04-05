import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDiscussionComment,
  createDirectConversation,
  createDiscussion,
  createStudyRoom,
  deleteStudyRoom,
  fetchCommunityWorkspace,
  joinStudyRoom,
  saveCommunityNote,
  sendCommunityMessage,
  toggleDiscussionLike,
} from '@/shared/api/viewer/communityApi';
import { EmptyStateCard, ErrorStateCard, LoadingStateCard } from '@/shared/layout/AsyncState';
import { captureViewerError, captureViewerEvent } from '@/shared/platform/observability';
import { useAppSelector } from '@/shared/state/store';
import { viewerCopy } from '@/shared/theme/copy';
import { cn } from '@/shared/utils/cn';
import {
  FileText,
  Heart,
  LayoutDashboard,
  MessageSquare,
  Plus,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';

type Section = (typeof viewerCopy.community.sections)[number];
type StatusState = { tone: 'success' | 'error'; message: string } | null;

const sectionVisuals: Record<
  Section,
  {
    icon: typeof LayoutDashboard;
    badge?: number;
  }
> = {
  Dashboard: { icon: LayoutDashboard },
  'Our Study': { icon: Users },
  Messages: { icon: MessageSquare },
  Trending: { icon: TrendingUp },
  Notes: { icon: FileText },
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

export function CommunityPage() {
  const queryClient = useQueryClient();
  const user = useAppSelector((state) => state.auth.user);
  const userId = user?.id ?? '';
  const [section, setSection] = useState<Section>('Dashboard');
  const [conversationId, setConversationId] = useState('');
  const [composer, setComposer] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [roomForm, setRoomForm] = useState({ name: '', description: '' });
  const [discussionForm, setDiscussionForm] = useState({ title: '', body: '', category: 'General' });
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [notesDraft, setNotesDraft] = useState<Array<{ id?: string; title: string; body: string; room_id?: string | null }>>([]);
  const [status, setStatus] = useState<StatusState>(null);

  const workspaceQuery = useQuery({
    queryKey: ['viewer', 'community', userId],
    queryFn: () => fetchCommunityWorkspace(userId),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (workspaceQuery.data && notesDraft.length === 0) {
      setNotesDraft(
        workspaceQuery.data.notes.map((note) => ({
          id: note.id,
          title: note.title,
          body: note.body,
          room_id: note.room_id,
        })),
      );
    }
  }, [notesDraft.length, workspaceQuery.data]);

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
      setSection('Messages');
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
    mutationFn: (note: { id?: string; title: string; body: string; room_id?: string | null }) =>
      saveCommunityNote(userId, note),
    onSuccess: async () => {
      await refreshCommunity();
      setStatus({ tone: 'success', message: '笔记已保存。' });
      captureViewerEvent('viewer_community_note_saved');
    },
    onError: (error) => {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : '无法保存笔记。' });
      captureViewerError(error, { area: 'community_note_save' });
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

  function addBlankNote() {
    setNotesDraft((current) => [{ title: '未命名笔记', body: '', room_id: null }, ...current]);
    setSection('Notes');
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
      <div className="grid gap-4 xl:grid-cols-[258px_minmax(0,1fr)]">
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
                {viewerCopy.community.title}
              </h1>
              <p className="viewer-botanical-eyebrow">{'主导航'}</p>
            </div>
          </div>

          <nav className="mt-7 space-y-2.5">
            {viewerCopy.community.sections.map((item) => {
              const visual = sectionVisuals[item];
              const Icon = visual.icon;
              const isActive = section === item;
              return (
                <button
                  key={item}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-3.5 rounded-[20px] border px-3.5 py-3 text-left text-[0.92rem] font-bold transition',
                    isActive
                      ? 'border-[#b9d1bc] bg-[linear-gradient(180deg,rgba(235,243,232,0.96)_0%,rgba(223,240,224,0.88)_100%)] text-[#5c7d60]'
                      : 'border-transparent text-[#7a6b5e] hover:bg-[#faf4ea]',
                  )}
                  onClick={() => setSection(item)}
                >
                  <Icon size={25} />
                  <span className="flex-1">{item}</span>
                  {item === 'Messages' && unreadCount > 0 ? (
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

          {section === 'Dashboard' ? (
            <div className="relative min-h-[640px] overflow-hidden rounded-[30px] border border-[#ddd3c3] bg-[radial-gradient(circle_at_18%_18%,rgba(215,234,217,0.84),rgba(242,233,216,0.76)_26%,rgba(244,234,243,0.82)_52%,rgba(239,226,212,0.92)_76%,rgba(233,227,214,0.96)_100%)] shadow-[0_20px_52px_rgba(90,70,50,0.1)]">
              <div className="absolute left-5 top-5 z-20 flex gap-3">
                <button className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.85)] text-[#4a4037] shadow-[0_10px_22px_rgba(90,70,50,0.08)]">
                  <Users size={25} />
                </button>
                <button className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.85)] text-[#4a4037] shadow-[0_10px_22px_rgba(90,70,50,0.08)]">
                  <UserPlus size={25} />
                </button>
              </div>

              <div className="absolute right-7 top-7 z-20 rounded-[22px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.88)] px-5 py-4 shadow-[0_12px_26px_rgba(90,70,50,0.08)]">
                <div className="text-[1rem] font-black text-[#6e6156]">{`已连接 ${people.length + 15}`}</div>
                <div className="mt-2.5 text-[1rem] font-black text-[#5c7d60]">{`在线 ${Math.max(people.filter((person) => person.status === 'online').length, 14)}`}</div>
              </div>

              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(168,197,172,0.18),rgba(255,255,255,0)_34%,rgba(196,149,106,0.16)_72%,rgba(169,154,180,0.18)_100%)]" />
                <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(214,185,204,0.34)] blur-[82px]" />
                <div className="absolute left-[50%] top-[54%] h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.58),rgba(255,255,255,0)_68%)]" />
                <img
                  src="/community-start.png"
                  alt="Community planet"
                  className="pointer-events-none absolute left-1/2 top-1/2 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.96] drop-shadow-[0_28px_72px_rgba(196,149,106,0.18)]"
                  style={{
                    WebkitMaskImage:
                      'radial-gradient(circle at center, black 34%, rgba(0,0,0,0.98) 56%, rgba(0,0,0,0.86) 73%, transparent 88%)',
                    maskImage:
                      'radial-gradient(circle at center, black 34%, rgba(0,0,0,0.98) 56%, rgba(0,0,0,0.86) 73%, transparent 88%)',
                  }}
                />
              </div>

              {people.slice(0, dashboardPositions.length).map((person, index) => {
                const position = dashboardPositions[index];
                const palette = ['bg-[#8fb996]', 'bg-[#c4807a]', 'bg-[#d4a870]', 'bg-[#a99ab4]'];
                return (
                  <div key={person.id} className="absolute z-20" style={position}>
                    <div className={cn('mx-auto h-7 w-7 rounded-full border border-white/65 shadow-[0_0_18px_rgba(255,255,255,0.78)]', palette[index % palette.length])} />
                    <div className="mt-2 text-center text-[0.84rem] font-semibold text-[#65594f]">{person.display_name}</div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {section === 'Our Study' ? (
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
                    {createRoomMutation.isPending ? '创建中…' : viewerCopy.community.createRoom}
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

          {section === 'Messages' ? (
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
                          {sendMessageMutation.isPending ? '发送中…' : viewerCopy.community.send}
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

          {section === 'Trending' ? (
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

          {section === 'Notes' ? (
            <div className="space-y-4">
              <div className="viewer-panel flex items-center justify-between rounded-[26px] px-5 py-4">
                <div>
                  <h2 className="viewer-botanical-heading text-[2rem]">{'笔记'}</h2>
                  <p className="mt-1 text-sm font-medium text-[#8a7d72]">{'保存你的个人笔记，或关联到学习房间。'}</p>
                </div>
                <button
                  type="button"
                  className="viewer-botanical-button viewer-botanical-button--primary"
                  onClick={addBlankNote}
                >
                  <Plus size={18} />
                  {viewerCopy.community.addNote}
                </button>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {notesDraft.map((note, index) => (
                  <div key={note.id ?? `draft-${index}`} className="viewer-panel rounded-[26px] p-5">
                    <div className="space-y-4">
                      <input
                        className="viewer-botanical-input w-full text-[1.1rem] font-black"
                        value={note.title}
                        onChange={(event) =>
                          setNotesDraft((current) =>
                            current.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, title: event.target.value } : entry,
                            ),
                          )
                        }
                      />
                      <textarea
                        className="viewer-botanical-input min-h-40 w-full text-[1rem] font-medium leading-7"
                        value={note.body}
                        onChange={(event) =>
                          setNotesDraft((current) =>
                            current.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, body: event.target.value } : entry,
                            ),
                          )
                        }
                      />
                      <button
                        type="button"
                        className="viewer-botanical-button viewer-botanical-button--primary"
                        onClick={() => noteMutation.mutate(note)}
                        disabled={noteMutation.isPending}
                      >
                        {noteMutation.isPending ? '保存中…' : '保存笔记'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
