import { EmptyStateCard } from '@/shared/layout/AsyncState';
import { cn } from '@/shared/utils/cn';
import type { ViewerCopy } from '@/shared/theme/copy';
import type { CommunitySection, CommunityStatusState, NoteDraft } from '@/features/community/communityTypes';
import { NOTE_COLOR_MAP, noteRelativeTime } from '@/features/community/hooks/useCommunityNotesWorkspace';
import {
  FileText,
  Heart,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';

const sectionVisuals: Record<
  CommunitySection,
  {
    icon: typeof Users;
  }
> = {
  study: { icon: Users },
  messages: { icon: MessageSquare },
  trending: { icon: TrendingUp },
  notes: { icon: FileText },
};

export function CommunitySectionNav({
  copy,
  language,
  section,
  setSection,
  unreadCount,
}: {
  copy: ViewerCopy;
  language: 'zh-CN' | 'en';
  section: CommunitySection;
  setSection: (section: CommunitySection) => void;
  unreadCount: number;
}) {
  const sectionItems = [
    { id: 'study' as const, label: copy.community.sections[0] },
    { id: 'messages' as const, label: copy.community.sections[1] },
    { id: 'trending' as const, label: copy.community.sections[2] },
    { id: 'notes' as const, label: copy.community.sections[3] },
  ];
  const subtitle = language === 'zh-CN' ? '选一个你现在\n要做的事' : 'Pick what you\nWant to do now';

  return (
    <aside className="border-b border-[rgba(141,124,105,0.14)] bg-[rgba(255,252,248,0.6)] p-5 backdrop-blur-[18px] md:p-6 xl:sticky xl:top-0 xl:min-h-screen xl:self-stretch xl:border-b-0 xl:border-r">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-[4.4rem] w-[4.4rem] items-center justify-center rounded-[1.15rem] border border-[#e4d2b6] bg-[linear-gradient(145deg,#d4b896_0%,#c4956a_100%)] text-white shadow-[0_14px_24px_rgba(196,149,106,0.18)]">
          <Users size={32} />
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <h1
            className="viewer-botanical-heading text-[2.35rem] leading-[0.94] md:text-[2.55rem]"
            style={{ fontFamily: '"Cormorant Garamond", serif' }}
          >
            {copy.community.title}
          </h1>
          <p className="whitespace-pre-line text-[0.92rem] font-semibold leading-[1.45] tracking-[0.14em] text-[#93857a]">
            {subtitle}
          </p>
        </div>
      </div>

      <nav className="mt-7 space-y-3">
        {sectionItems.map((item) => {
          const visual = sectionVisuals[item.id];
          const Icon = visual.icon;
          const isActive = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={cn(
                'viewer-botanical-button flex w-full items-center justify-start gap-3.5 rounded-[20px] px-5 py-4 text-left text-[1rem] font-bold leading-[1.15]',
                isActive
                  ? 'border border-[#b9d1bc] bg-[linear-gradient(180deg,rgba(235,243,232,0.96)_0%,rgba(223,240,224,0.88)_100%)] text-[#5c7d60] shadow-[inset_0_1px_0_rgba(255,255,255,0.62),0_6px_0_rgba(197,213,199,0.82),0_14px_20px_rgba(90,70,50,0.08)]'
                  : 'viewer-botanical-button--secondary text-[#7a6b5e]',
              )}
              onClick={() => setSection(item.id)}
            >
              <Icon size={25} />
              <span className="flex-1 whitespace-normal text-left">{item.label}</span>
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
  );
}

export function CommunityStatusBanner({ status }: { status: CommunityStatusState }) {
  if (!status) {
    return null;
  }

  return (
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
  );
}

export function CompanionContextBanner({
  companionTopic,
  language,
  onCreateNote,
  onOpenDiscussions,
}: {
  companionTopic: string;
  language: 'zh-CN' | 'en';
  onCreateNote: () => void;
  onOpenDiscussions: () => void;
}) {
  if (!companionTopic) {
    return null;
  }

  return (
    <div
      data-testid="community-companion-context"
      className="viewer-panel rounded-[26px] px-5 py-4"
    >
      <p className="viewer-botanical-eyebrow">{language === 'zh-CN' ? '导师上下文' : 'Tutor context'}</p>
      <div className="mt-2 text-[1rem] font-semibold leading-7 text-[#4d4239]">
        {language === 'zh-CN'
          ? `你是从《${companionTopic}》进入这里的，可以直接去看相关笔记和讨论。`
          : `You came in from "${companionTopic}". Jump straight into related notes and discussion.`}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="viewer-botanical-button viewer-botanical-button--primary"
          onClick={onCreateNote}
        >
          {language === 'zh-CN' ? `新建《${companionTopic}》笔记` : `New note for "${companionTopic}"`}
        </button>
        <button
          type="button"
          className="viewer-botanical-button viewer-botanical-button--secondary"
          onClick={onOpenDiscussions}
        >
          {language === 'zh-CN' ? '查看讨论区' : 'Open discussions'}
        </button>
      </div>
    </div>
  );
}

export function StudyRoomsPane(props: {
  roomForm: { name: string; description: string };
  setRoomForm: React.Dispatch<React.SetStateAction<{ name: string; description: string }>>;
  createRoomMutation: { mutate: () => void; isPending: boolean };
  studyRooms: Array<{ id: string; name: string; description: string; members: number; status: string; member_ids: string[]; created_by: string }>;
  userId: string;
  joinRoomMutation: { mutate: (roomId: string) => void; isPending: boolean };
  deleteRoomMutation: { mutate: (roomId: string) => void; isPending: boolean };
  copy: ViewerCopy;
}) {
  const { roomForm, setRoomForm, createRoomMutation, studyRooms, userId, joinRoomMutation, deleteRoomMutation, copy } = props;

  return (
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
  );
}

export function MessagesPane(props: {
  people: Array<{ id: string; display_name: string; status: string }>;
  selectedPersonId: string;
  setSelectedPersonId: (personId: string) => void;
  directConversationMutation: { mutate: () => void; isPending: boolean };
  conversations: Array<{ id: string; title: string; preview: string; unread_count: number }>;
  activeConversation: {
    id: string;
    title: string;
    kind: string;
    messages: Array<{ id: string; author_id: string; author_name: string; body: string }>;
  } | null;
  setConversationId: (conversationId: string) => void;
  composer: string;
  setComposer: (value: string) => void;
  sendMessageMutation: { mutate: () => void; isPending: boolean };
  userId: string;
  copy: ViewerCopy;
}) {
  const { people, selectedPersonId, setSelectedPersonId, directConversationMutation, conversations, activeConversation, setConversationId, composer, setComposer, sendMessageMutation, userId, copy } = props;

  return (
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
  );
}

export function TrendingPane(props: {
  discussionForm: { title: string; body: string; category: string };
  setDiscussionForm: React.Dispatch<React.SetStateAction<{ title: string; body: string; category: string }>>;
  createDiscussionMutation: { mutate: () => void; isPending: boolean };
  discussions: Array<{
    id: string;
    title: string;
    body: string;
    category: string;
    likes: number;
    liked_by_me: boolean;
    comments: Array<{ id: string; author_name: string; body: string }>;
  }>;
  toggleLikeMutation: { mutate: (discussionId: string) => void };
  commentDrafts: Record<string, string>;
  setCommentDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  commentMutation: { mutate: (args: { discussionId: string; body: string }) => void; isPending: boolean };
}) {
  const { discussionForm, setDiscussionForm, createDiscussionMutation, discussions, toggleLikeMutation, commentDrafts, setCommentDrafts, commentMutation } = props;

  return (
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
  );
}

export function NotesPane(props: {
  copy: ViewerCopy;
  language: 'zh-CN' | 'en';
  notesDraft: NoteDraft[];
  filteredNotes: NoteDraft[];
  pinnedNotes: NoteDraft[];
  unpinnedNotes: NoteDraft[];
  activeNote: NoteDraft | null;
  activeNoteKey: string | null;
  setActiveNoteKey: (key: string | null) => void;
  addBlankNote: () => void;
  noteQuery: string;
  setNoteQuery: (value: string) => void;
  noteTab: 'all' | 'pin' | 'tag';
  setNoteTab: (tab: 'all' | 'pin' | 'tag') => void;
  noteColorPickerOpen: boolean;
  setNoteColorPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  updateNoteDraft: (_key: string, patch: Partial<NoteDraft>) => void;
  noteSaveStatus: 'saved' | 'unsaved';
  noteStats: { chars: number; words: number; lines: number };
  deleteConfirmKey: string | null;
  setDeleteConfirmKey: (value: string | null) => void;
  deleteNote: (noteKey: string) => void;
  titleInputRef: React.RefObject<HTMLTextAreaElement | null>;
  bodyInputRef: React.RefObject<HTMLTextAreaElement | null>;
  colorPickerRef: React.RefObject<HTMLDivElement | null>;
  handleNoteTitleChange: (title: string, note: NoteDraft) => void;
  handleNoteBodyChange: (body: string, note: NoteDraft) => void;
  handleBodyKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>, note: NoteDraft) => void;
  formatText: (type: 'bold' | 'italic' | 'strike', note: NoteDraft) => void;
  insertListItem: (listType: 'ul' | 'ol', note: NoteDraft) => void;
  insertQuote: (note: NoteDraft) => void;
  insertDivider: (note: NoteDraft) => void;
  tagInputActiveKey: string | null;
  setTagInputActiveKey: (value: string | null) => void;
  tagInputValue: string;
  setTagInputValue: (value: string) => void;
  commitTagInput: () => void;
  removeNoteTag: (noteKey: string, tag: string) => void;
  noteToSaveRef: React.MutableRefObject<NoteDraft | null>;
  noteMutation: { mutate: (note: NoteDraft) => void };
}) {
  const {
    copy,
    language,
    notesDraft,
    filteredNotes,
    pinnedNotes,
    unpinnedNotes,
    activeNote,
    activeNoteKey,
    setActiveNoteKey,
    addBlankNote,
    noteQuery,
    setNoteQuery,
    noteTab,
    setNoteTab,
    noteColorPickerOpen,
    setNoteColorPickerOpen,
    updateNoteDraft,
    noteSaveStatus,
    noteStats,
    deleteConfirmKey,
    setDeleteConfirmKey,
    deleteNote,
    titleInputRef,
    bodyInputRef,
    colorPickerRef,
    handleNoteTitleChange,
    handleNoteBodyChange,
    handleBodyKeyDown,
    formatText,
    insertListItem,
    insertQuote,
    insertDivider,
    tagInputActiveKey,
    setTagInputActiveKey,
    tagInputValue,
    setTagInputValue,
    commitTagInput,
    removeNoteTag,
    noteToSaveRef,
    noteMutation,
  } = props;

  return (
    <div className="space-y-3">
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

      <div className="grid gap-3" style={{ gridTemplateColumns: '260px minmax(0,1fr)' }}>
        <div className="viewer-panel flex flex-col overflow-hidden rounded-[26px]">
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
                  <NoteListCard key={note._key} note={note} activeNoteKey={activeNoteKey} setActiveNoteKey={setActiveNoteKey} pinned />
                ))}

                {unpinnedNotes.length > 0 && pinnedNotes.length > 0 && (
                  <div className="px-2 pb-1 pt-2 text-[.67rem] font-[800] uppercase tracking-[.08em] text-[#a89d93]">笔记</div>
                )}
                {unpinnedNotes.map((note) => (
                  <NoteListCard key={note._key} note={note} activeNoteKey={activeNoteKey} setActiveNoteKey={setActiveNoteKey} />
                ))}
              </>
            )}
          </div>
        </div>

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
                <button type="button" title={activeNote.pinned ? '取消置顶' : '置顶'} onClick={() => updateNoteDraft(activeNote._key, { pinned: !activeNote.pinned })} className={cn('flex h-8 w-8 items-center justify-center rounded-[8px] border text-[13px] transition', activeNote.pinned ? 'border-[#b9d1bc] bg-[rgba(106,158,110,.13)] text-[#6a9e6e]' : 'border-transparent text-[#a89d93] hover:border-[#e4dcd0] hover:bg-white')}>
                  📌
                </button>
                <div className="flex-1" />
                <div className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[.72rem] transition-all', noteSaveStatus === 'saved' ? 'border-[#e4dcd0] bg-[rgba(244,239,231,.8)] text-[#a89d93]' : 'border-[#d4c8b8] bg-[rgba(244,239,231,.8)] text-[#b8a898]')}>
                  <span className={cn('h-1.5 w-1.5 rounded-full transition-colors', noteSaveStatus === 'saved' ? 'bg-[#7ec48a]' : 'animate-pulse bg-[#d4a44c]')} />
                  {noteSaveStatus === 'saved' ? '已保存' : '未保存…'}
                </div>
              </div>

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
                      if (noteToSaveRef.current) noteMutation.mutate(noteToSaveRef.current);
                    }
                  }}
                />
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
  );
}

function NoteListCard({
  note,
  activeNoteKey,
  setActiveNoteKey,
  pinned = false,
}: {
  note: NoteDraft;
  activeNoteKey: string | null;
  setActiveNoteKey: (key: string) => void;
  pinned?: boolean;
}) {
  return (
    <button
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
      {pinned ? <span className="absolute right-2 top-2 text-[10px] opacity-40">📌</span> : null}
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
  );
}
