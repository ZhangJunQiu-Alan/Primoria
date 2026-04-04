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
    <div className="mx-auto w-[86%] px-0 py-5 md:py-6">
      <div className="grid gap-4 xl:grid-cols-[258px_minmax(0,1fr)]">
        <aside className="viewer-panel rounded-[30px] p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#5e54f3,#25c0ee)] text-white">
              <Users size={28} />
            </div>
            <div>
              <h1 className="text-[1.8rem] font-black tracking-[-0.05em] text-[#1d2536]">{viewerCopy.community.title}</h1>
              <p className="text-[0.94rem] font-bold text-[#93a0b8]">{'主导航'}</p>
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
                    'flex w-full items-center gap-3.5 rounded-[20px] px-3.5 py-3 text-left text-[0.92rem] font-black transition',
                    isActive ? 'bg-[#eef1ff] text-[#554cf4]' : 'text-[#687892] hover:bg-[#f7f9fd]',
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
                'rounded-[20px] border px-4 py-3 text-sm font-semibold',
                status.tone === 'error'
                  ? 'border-[#ffd5d5] bg-[#fff2f2] text-[#c13d3d]'
                  : 'border-[#dcebdd] bg-[#f1fbf4] text-[#2f8a4f]',
              )}
            >
              {status.message}
            </div>
          ) : null}

          {section === 'Dashboard' ? (
            <div className="relative min-h-[640px] overflow-hidden rounded-[30px] border border-[#dfe6f2] bg-[radial-gradient(circle_at_16%_18%,rgba(181,236,255,0.92),rgba(214,241,255,0.72)_24%,rgba(241,234,255,0.88)_54%,rgba(235,229,255,0.92)_74%,rgba(220,232,255,0.92)_100%)] shadow-[0_20px_52px_rgba(83,110,162,0.08)]">
              <div className="absolute left-5 top-5 z-20 flex gap-3">
                <button className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#dce6f3] bg-white/85 text-[#1d2536] shadow-[0_10px_22px_rgba(91,117,161,0.08)]">
                  <Users size={25} />
                </button>
                <button className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#dce6f3] bg-white/85 text-[#1d2536] shadow-[0_10px_22px_rgba(91,117,161,0.08)]">
                  <UserPlus size={25} />
                </button>
              </div>

              <div className="absolute right-7 top-7 z-20 rounded-[22px] border border-[#dce6f3] bg-white/88 px-5 py-4 shadow-[0_12px_26px_rgba(91,117,161,0.08)]">
                <div className="text-[1rem] font-black text-[#627390]">{`已连接 ${people.length + 15}`}</div>
                <div className="mt-2.5 text-[1rem] font-black text-[#1fb65c]">{`在线 ${Math.max(people.filter((person) => person.status === 'online').length, 14)}`}</div>
              </div>

              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(165,228,255,0.30),rgba(255,255,255,0)_34%,rgba(237,214,255,0.28)_72%,rgba(205,226,255,0.24)_100%)]" />
                <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f3ddff]/50 blur-[82px]" />
                <div className="absolute left-[50%] top-[54%] h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.58),rgba(255,255,255,0)_68%)]" />
                <img
                  src="/community-start.png"
                  alt="Community planet"
                  className="pointer-events-none absolute left-1/2 top-1/2 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.96] drop-shadow-[0_28px_72px_rgba(193,153,248,0.18)]"
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
                const palette = ['bg-[#28c3ef]', 'bg-[#ff8cc8]', 'bg-[#36d49d]', 'bg-[#9aa9c2]'];
                return (
                  <div key={person.id} className="absolute z-20" style={position}>
                    <div className={cn('mx-auto h-7 w-7 rounded-full border border-white/65 shadow-[0_0_18px_rgba(255,255,255,0.78)]', palette[index % palette.length])} />
                    <div className="mt-2 text-center text-[0.84rem] font-semibold text-[#55617a]">{person.display_name}</div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {section === 'Our Study' ? (
            <div className="grid gap-4 xl:grid-cols-[290px_minmax(0,1fr)]">
              <div className="rounded-[26px] border border-[#dfe6f2] bg-white p-5 shadow-[0_20px_52px_rgba(83,110,162,0.08)]">
                <h2 className="text-[1.8rem] font-black text-[#1c2436]">{'创建学习房间'}</h2>
                <div className="mt-5 space-y-4">
                  <input
                    className="w-full rounded-[20px] border border-[#d8e2ef] px-4 py-3 text-[1rem] font-medium outline-none"
                    placeholder="房间名称"
                    value={roomForm.name}
                    onChange={(event) => setRoomForm((current) => ({ ...current, name: event.target.value }))}
                  />
                  <textarea
                    className="min-h-32 w-full rounded-[20px] border border-[#d8e2ef] px-4 py-3 text-[1rem] font-medium outline-none"
                    placeholder="描述这次学习目标"
                    value={roomForm.description}
                    onChange={(event) => setRoomForm((current) => ({ ...current, description: event.target.value }))}
                  />
                  <button
                    type="button"
                    className="w-full rounded-[20px] bg-[#554cf4] px-5 py-3 text-base font-black text-white"
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
                    <div key={room.id} className="rounded-[26px] border border-[#dfe6f2] bg-white p-5 shadow-[0_20px_52px_rgba(83,110,162,0.08)]">
                      <div className="text-sm font-black uppercase tracking-[0.16em] text-[#8fa1bf]">{'Study room'}</div>
                      <h3 className="mt-3 text-[1.5rem] font-black text-[#20293d]">{room.name}</h3>
                      <p className="mt-3 text-[1rem] leading-7 text-[#76839c]">{room.description}</p>
                      <p className="mt-5 text-[0.98rem] font-bold text-[#8a96ab]">{`${room.members} 人 · ${room.status}`}</p>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="button"
                          className="rounded-[18px] bg-[#554cf4] px-4 py-3 text-sm font-black text-white"
                          onClick={() => joinRoomMutation.mutate(room.id)}
                          disabled={joined || joinRoomMutation.isPending}
                        >
                          {joined ? '已加入' : '加入房间'}
                        </button>
                        {room.created_by === userId ? (
                          <button
                            type="button"
                            className="rounded-[18px] border border-[#ffd1d1] px-4 py-3 text-sm font-black text-[#cb4a4a]"
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
                <div className="rounded-[26px] border border-[#dfe6f2] bg-white p-5 shadow-[0_20px_52px_rgba(83,110,162,0.08)]">
                  <h2 className="text-[1.5rem] font-black text-[#1c2436]">{'开启新对话'}</h2>
                  <div className="mt-4 space-y-3">
                    {people.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        className={cn(
                          'flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left text-sm font-bold transition',
                          selectedPersonId === person.id
                            ? 'border-[#cfd6ff] bg-[#eef1ff] text-[#554cf4]'
                            : 'border-[#dde6f2] text-[#53627c]',
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
                    className="mt-4 w-full rounded-[18px] bg-[#554cf4] px-4 py-3 text-sm font-black text-white"
                    onClick={() => directConversationMutation.mutate()}
                    disabled={!selectedPersonId || directConversationMutation.isPending}
                  >
                    {directConversationMutation.isPending ? '创建中…' : '创建私聊'}
                  </button>
                </div>

                <div className="rounded-[26px] border border-[#dfe6f2] bg-white p-4 shadow-[0_20px_52px_rgba(83,110,162,0.08)]">
                  <div className="space-y-3">
                    {conversations.map((conversation) => (
                      <button
                        key={conversation.id}
                        type="button"
                        className={cn(
                          'flex w-full items-start justify-between gap-3 rounded-[18px] px-4 py-4 text-left transition',
                          activeConversation?.id === conversation.id ? 'bg-[#eef1ff]' : 'hover:bg-[#f7f9fd]',
                        )}
                        onClick={() => setConversationId(conversation.id)}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-[1rem] font-black text-[#253049]">{conversation.title}</div>
                          <div className="mt-1 truncate text-sm font-medium text-[#7c88a0]">{conversation.preview || '开始一段新对话'}</div>
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

              <div className="flex min-h-[580px] flex-col rounded-[26px] border border-[#dfe6f2] bg-white shadow-[0_20px_52px_rgba(83,110,162,0.08)]">
                {activeConversation ? (
                  <>
                    <div className="border-b border-[#edf1f7] px-6 py-5">
                      <h3 className="text-[1.6rem] font-black text-[#1f293d]">{activeConversation.title}</h3>
                      <p className="mt-1 text-sm font-medium text-[#8a97ae]">{activeConversation.kind === 'group' ? '群组对话' : '私聊'}</p>
                    </div>
                    <div className="flex-1 space-y-4 overflow-auto px-6 py-5">
                      {activeConversation.messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            'max-w-[80%] rounded-[22px] px-4 py-3 text-sm font-medium leading-7',
                            message.author_id === userId
                              ? 'ml-auto bg-[#554cf4] text-white'
                              : 'bg-[#f5f8fc] text-[#354158]',
                          )}
                        >
                          <div className="mb-1 text-xs font-black uppercase tracking-[0.14em] opacity-70">{message.author_name}</div>
                          {message.body}
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-[#edf1f7] px-6 py-5">
                      <div className="flex gap-3">
                        <input
                          className="min-w-0 flex-1 rounded-[20px] border border-[#d8e2ef] px-4 py-3 text-[1rem] font-medium outline-none"
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
                          className="rounded-[20px] bg-[#554cf4] px-5 py-3 text-sm font-black text-white"
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
              <div className="rounded-[26px] border border-[#dfe6f2] bg-white p-5 shadow-[0_20px_52px_rgba(83,110,162,0.08)]">
                <h2 className="text-[1.8rem] font-black text-[#1c2436]">{'发布讨论'}</h2>
                <div className="mt-5 space-y-4">
                  <input
                    className="w-full rounded-[20px] border border-[#d8e2ef] px-4 py-3 text-[1rem] font-medium outline-none"
                    placeholder="标题"
                    value={discussionForm.title}
                    onChange={(event) => setDiscussionForm((current) => ({ ...current, title: event.target.value }))}
                  />
                  <input
                    className="w-full rounded-[20px] border border-[#d8e2ef] px-4 py-3 text-[1rem] font-medium outline-none"
                    placeholder="分类"
                    value={discussionForm.category}
                    onChange={(event) => setDiscussionForm((current) => ({ ...current, category: event.target.value }))}
                  />
                  <textarea
                    className="min-h-36 w-full rounded-[20px] border border-[#d8e2ef] px-4 py-3 text-[1rem] font-medium outline-none"
                    placeholder="分享你的问题、发现或想法"
                    value={discussionForm.body}
                    onChange={(event) => setDiscussionForm((current) => ({ ...current, body: event.target.value }))}
                  />
                  <button
                    type="button"
                    className="w-full rounded-[20px] bg-[#554cf4] px-5 py-3 text-base font-black text-white"
                    onClick={() => createDiscussionMutation.mutate()}
                    disabled={createDiscussionMutation.isPending}
                  >
                    {createDiscussionMutation.isPending ? '发布中…' : '发布讨论'}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {discussions.map((discussion) => (
                  <article key={discussion.id} className="rounded-[26px] border border-[#dfe6f2] bg-white p-5 shadow-[0_20px_52px_rgba(83,110,162,0.08)]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.16em] text-[#90a0bc]">{discussion.category}</div>
                        <h3 className="mt-2 text-[1.5rem] font-black text-[#212a3e]">{discussion.title}</h3>
                        <p className="mt-3 text-[1rem] leading-7 text-[#72809a]">{discussion.body}</p>
                      </div>
                      <button
                        type="button"
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black',
                          discussion.liked_by_me ? 'bg-[#fff1f1] text-[#d45454]' : 'bg-[#f3f6fb] text-[#738097]',
                        )}
                        onClick={() => toggleLikeMutation.mutate(discussion.id)}
                      >
                        <Heart size={16} className={discussion.liked_by_me ? 'fill-current' : ''} />
                        {discussion.likes}
                      </button>
                    </div>

                    <div className="mt-5 rounded-[22px] bg-[#f8fbff] p-4">
                      <div className="space-y-3">
                        {discussion.comments.map((comment) => (
                          <div key={comment.id} className="rounded-[18px] bg-white px-4 py-3">
                            <div className="text-sm font-black text-[#273046]">{comment.author_name}</div>
                            <div className="mt-1 text-sm leading-6 text-[#73809a]">{comment.body}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex gap-3">
                        <input
                          className="min-w-0 flex-1 rounded-[18px] border border-[#d8e2ef] px-4 py-3 text-sm font-medium outline-none"
                          placeholder="写下你的评论"
                          value={commentDrafts[discussion.id] ?? ''}
                          onChange={(event) =>
                            setCommentDrafts((current) => ({ ...current, [discussion.id]: event.target.value }))
                          }
                        />
                        <button
                          type="button"
                          className="rounded-[18px] bg-[#554cf4] px-4 py-3 text-sm font-black text-white"
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
              <div className="flex items-center justify-between rounded-[26px] border border-[#dfe6f2] bg-white px-5 py-4 shadow-[0_20px_52px_rgba(83,110,162,0.08)]">
                <div>
                  <h2 className="text-[1.8rem] font-black text-[#1c2436]">{'笔记'}</h2>
                  <p className="mt-1 text-sm font-medium text-[#8a97ae]">{'保存你的个人笔记，或关联到学习房间。'}</p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-[18px] bg-[#554cf4] px-5 py-3 text-sm font-black text-white"
                  onClick={addBlankNote}
                >
                  <Plus size={18} />
                  {viewerCopy.community.addNote}
                </button>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {notesDraft.map((note, index) => (
                  <div key={note.id ?? `draft-${index}`} className="rounded-[26px] border border-[#dfe6f2] bg-white p-5 shadow-[0_20px_52px_rgba(83,110,162,0.08)]">
                    <div className="space-y-4">
                      <input
                        className="w-full rounded-[18px] border border-[#d8e2ef] px-4 py-3 text-[1.1rem] font-black outline-none"
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
                        className="min-h-40 w-full rounded-[18px] border border-[#d8e2ef] px-4 py-3 text-[1rem] font-medium leading-7 outline-none"
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
                        className="rounded-[18px] bg-[#554cf4] px-5 py-3 text-sm font-black text-white"
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
