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
import { captureViewerError, captureViewerEvent } from '@/shared/platform/observability';
import type { ViewerCopy } from '@/shared/theme/copy';
import type { CommunitySection, CommunityStatusState, NoteDraft } from '@/features/community/communityTypes';

export function useCommunityWorkspace({
  userId,
  copy,
  requestedSection,
}: {
  userId: string;
  copy: ViewerCopy;
  requestedSection: CommunitySection;
}) {
  const queryClient = useQueryClient();
  const [section, setSection] = useState<CommunitySection>(requestedSection);
  const [conversationId, setConversationId] = useState('');
  const [composer, setComposer] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [roomForm, setRoomForm] = useState({ name: '', description: '' });
  const [discussionForm, setDiscussionForm] = useState({ title: '', body: '', category: 'General' });
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<CommunityStatusState>(null);

  const workspaceQuery = useQuery({
    queryKey: ['viewer', 'community', userId],
    queryFn: () => fetchCommunityWorkspace(userId),
    enabled: Boolean(userId),
  });

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

  const refreshCommunity = async () => {
    await queryClient.invalidateQueries({ queryKey: ['viewer', 'community', userId] });
  };

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
      captureViewerEvent('viewer_community_discussion_created');
    },
    onError: (error) => {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : '无法发布讨论。' });
      captureViewerError(error, { area: 'community_discussion_create' });
    },
  });

  const toggleLikeMutation = useMutation({
    mutationFn: (discussionId: string) => toggleDiscussionLike(userId, discussionId),
    onSuccess: async () => {
      await refreshCommunity();
      captureViewerEvent('viewer_community_discussion_liked');
    },
    onError: (error) => {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : '无法更新点赞。' });
      captureViewerError(error, { area: 'community_discussion_like' });
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ discussionId, body }: { discussionId: string; body: string }) =>
      addDiscussionComment(userId, discussionId, body),
    onSuccess: async (_result, variables) => {
      await refreshCommunity();
      setCommentDrafts((current) => ({ ...current, [variables.discussionId]: '' }));
      captureViewerEvent('viewer_community_discussion_commented');
    },
    onError: (error) => {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : '无法发送评论。' });
      captureViewerError(error, { area: 'community_discussion_comment' });
    },
  });

  const noteMutation = useMutation({
    mutationFn: (note: NoteDraft) =>
      saveCommunityNote(userId, {
        id: note.id,
        title: note.title,
        body: note.body,
        room_id: note.room_id ?? null,
        lesson_id: note.lesson_id ?? null,
      }),
    onSuccess: async () => {
      await refreshCommunity();
      captureViewerEvent('viewer_community_note_saved');
    },
    onError: (error) => {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : copy.common.errorFallback });
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

  return {
    activeConversation,
    commentDrafts,
    commentMutation,
    composer,
    conversations,
    createDiscussionMutation,
    createRoomMutation,
    deleteRoomMutation,
    directConversationMutation,
    discussionForm,
    discussions,
    joinRoomMutation,
    noteMutation,
    people,
    roomForm,
    refreshCommunity,
    section,
    selectedPersonId,
    sendMessageMutation,
    setCommentDrafts,
    setComposer,
    setConversationId,
    setDiscussionForm,
    setRoomForm,
    setSection,
    setSelectedPersonId,
    setStatus,
    status,
    studyRooms,
    toggleLikeMutation,
    unreadCount,
    workspace,
    workspaceQuery,
  };
}
