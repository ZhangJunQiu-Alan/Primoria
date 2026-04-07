import { supabase } from '@/shared/api/supabase';
import {
  type CommunityConversation,
  type CommunityDiscussion,
  type CommunityNote,
  type CommunityNoteInput,
  type CommunityPerson,
  type CommunityStudyRoom,
  type CommunityWorkspace,
} from '@/shared/api/viewer/types';
import { usesViewerFixtures } from '@/shared/api/viewer/core';
import { loadFixtureStore } from '@/shared/api/viewer/fixtureLoader';

function fixtureMessageAuthorName(authorId: string, people: CommunityPerson[]) {
  return people.find((person) => person.id === authorId)?.display_name ?? 'Learner';
}

function mapCommunityNoteRow(note: Record<string, unknown>) {
  return {
    id: String(note.id),
    title: String(note.title ?? ''),
    body: String(note.body ?? ''),
    room_id: typeof note.room_id === 'string' ? note.room_id : null,
    lesson_id: typeof note.lesson_id === 'string' ? note.lesson_id : null,
    updated_at: String(note.updated_at ?? ''),
  } satisfies CommunityNote;
}

export async function fetchCommunityWorkspace(userId: string): Promise<CommunityWorkspace> {
  if (usesViewerFixtures()) {
    const { readFixtureState } = await loadFixtureStore();
    const state = readFixtureState();
    return {
      conversations: [...state.community.conversations],
      studyRooms: [...state.community.studyRooms],
      discussions: [...state.community.discussions],
      notes: [...state.community.notes],
      people: state.community.people.filter((person) => person.id !== userId),
    };
  }

  const [
    membershipsRes,
    roomsRes,
    roomMembersRes,
    notesRes,
    discussionsRes,
    commentsRes,
    likesRes,
    peopleRes,
  ] = await Promise.all([
    supabase
      .from('community_conversation_members')
      .select('conversation_id, last_read_at')
      .eq('user_id', userId)
      .limit(20),
    supabase
      .from('community_study_rooms')
      .select('id, name, description, created_by, status')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('community_study_room_members')
      .select('room_id, user_id')
      .limit(100),
    supabase
      .from('community_notes')
      .select('id, title, body, room_id, lesson_id, updated_at')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false })
      .limit(20),
    supabase
      .from('community_discussions')
      .select('id, title, body, category, author_id, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('community_discussion_comments')
      .select('id, discussion_id, author_id, body, created_at')
      .order('created_at')
      .limit(120),
    supabase
      .from('community_discussion_likes')
      .select('discussion_id, user_id')
      .limit(200),
    supabase
      .from('profiles')
      .select('id, username')
      .neq('id', userId)
      .limit(12),
  ]);

  for (const result of [membershipsRes, roomsRes, roomMembersRes, notesRes, discussionsRes, commentsRes, likesRes, peopleRes]) {
    if (result.error) {
      throw result.error;
    }
  }

  const membershipRows = membershipsRes.data ?? [];
  const conversationIds = membershipRows.map((row) => String(row.conversation_id));
  const [conversationsRes, messagesRes, conversationMembersRes] = conversationIds.length
    ? await Promise.all([
        supabase
          .from('community_conversations')
          .select('id, title, kind, study_room_id, updated_at')
          .in('id', conversationIds)
          .order('updated_at', { ascending: false })
          .limit(20),
        supabase
          .from('community_messages')
          .select('id, conversation_id, author_id, body, created_at')
          .in('conversation_id', conversationIds)
          .order('created_at')
          .limit(120),
        supabase
          .from('community_conversation_members')
          .select('conversation_id, user_id')
          .in('conversation_id', conversationIds)
          .limit(120),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];

  for (const result of [conversationsRes, messagesRes, conversationMembersRes]) {
    if (result.error) {
      throw result.error;
    }
  }

  const authorIds = new Set<string>();
  for (const row of messagesRes.data ?? []) {
    authorIds.add(String(row.author_id));
  }
  for (const row of discussionsRes.data ?? []) {
    authorIds.add(String(row.author_id));
  }
  for (const row of commentsRes.data ?? []) {
    authorIds.add(String(row.author_id));
  }
  for (const row of conversationMembersRes.data ?? []) {
    authorIds.add(String(row.user_id));
  }
  for (const row of roomMembersRes.data ?? []) {
    authorIds.add(String(row.user_id));
  }

  const profileLookup = new Map<string, string>();
  if (authorIds.size > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', [...authorIds]);
    if (profileError) {
      throw profileError;
    }
    for (const row of profiles ?? []) {
      profileLookup.set(String(row.id), String(row.username ?? 'Learner'));
    }
  }

  const conversations: CommunityConversation[] = (conversationsRes.data ?? []).map((conversation) => {
    const conversationId = String(conversation.id);
    const messages = (messagesRes.data ?? [])
      .filter((message) => String(message.conversation_id) === conversationId)
      .map((message) => ({
        id: String(message.id),
        author_id: String(message.author_id),
        author_name: profileLookup.get(String(message.author_id)) ?? 'Learner',
        body: String(message.body ?? ''),
        created_at: String(message.created_at ?? ''),
      }));
    const memberIds = (conversationMembersRes.data ?? [])
      .filter((member) => String(member.conversation_id) === conversationId)
      .map((member) => String(member.user_id));
    const membership = membershipRows.find((row) => String(row.conversation_id) === conversationId);
    const lastRead = membership?.last_read_at ? new Date(String(membership.last_read_at)).getTime() : 0;
    const unreadCount = messages.filter((message) => {
      if (message.author_id === userId) {
        return false;
      }
      return new Date(message.created_at).getTime() > lastRead;
    }).length;
    const preview = messages.at(-1)?.body ?? '';
    const title =
      String(conversation.kind) === 'direct'
        ? memberIds
            .filter((memberId) => memberId !== userId)
            .map((memberId) => profileLookup.get(memberId) ?? 'Learner')
            .join(', ') || String(conversation.title ?? 'Direct chat')
        : String(conversation.title ?? 'Study room');
    return {
      id: conversationId,
      title,
      kind: String(conversation.kind) === 'group' ? 'group' : 'direct',
      preview,
      participant_ids: memberIds,
      unread_count: unreadCount,
      updated_at: String(conversation.updated_at ?? messages.at(-1)?.created_at ?? ''),
      study_room_id: typeof conversation.study_room_id === 'string' ? conversation.study_room_id : null,
      messages,
    };
  });

  const studyRooms: CommunityStudyRoom[] = (roomsRes.data ?? []).map((room) => {
    const memberIds = (roomMembersRes.data ?? [])
      .filter((member) => String(member.room_id) === String(room.id))
      .map((member) => String(member.user_id));
    const linkedConversation = (conversationsRes.data ?? []).find(
      (conversation) => String(conversation.study_room_id ?? '') === String(room.id),
    );
    return {
      id: String(room.id),
      name: String(room.name ?? ''),
      description: String(room.description ?? ''),
      created_by: String(room.created_by ?? ''),
      member_ids: memberIds,
      members: memberIds.length,
      status: String(room.status ?? 'Open now'),
      conversation_id: linkedConversation ? String(linkedConversation.id) : null,
    };
  });

  const discussions: CommunityDiscussion[] = (discussionsRes.data ?? []).map((discussion) => {
    const discussionId = String(discussion.id);
    const likes = (likesRes.data ?? []).filter((like) => String(like.discussion_id) === discussionId);
    const comments = (commentsRes.data ?? [])
      .filter((comment) => String(comment.discussion_id) === discussionId)
      .map((comment) => ({
        id: String(comment.id),
        author_id: String(comment.author_id),
        author_name: profileLookup.get(String(comment.author_id)) ?? 'Learner',
        body: String(comment.body ?? ''),
        created_at: String(comment.created_at ?? ''),
      }));
    return {
      id: discussionId,
      title: String(discussion.title ?? ''),
      body: String(discussion.body ?? ''),
      category: String(discussion.category ?? 'General'),
      author_id: String(discussion.author_id ?? ''),
      author_name: profileLookup.get(String(discussion.author_id)) ?? 'Learner',
      created_at: String(discussion.created_at ?? ''),
      likes: likes.length,
      liked_by_me: likes.some((like) => String(like.user_id) === userId),
      comments,
    };
  });

  return {
    conversations,
    studyRooms,
    discussions,
    notes: (notesRes.data ?? []).map((note) => mapCommunityNoteRow(note as Record<string, unknown>)),
    people: (peopleRes.data ?? []).map((person) => ({
      id: String(person.id),
      username: String(person.username ?? ''),
      display_name: String(person.username ?? ''),
      email: `${String(person.username ?? 'user')}@primoria.community`,
      status: 'online',
    })),
  };
}

export async function fetchLessonCommunityNote(userId: string, lessonId: string): Promise<CommunityNote | null> {
  if (!userId || !lessonId) {
    return null;
  }

  if (usesViewerFixtures()) {
    const { readFixtureState } = await loadFixtureStore();
    const state = readFixtureState();
    return state.community.notes.find((note) => note.lesson_id === lessonId) ?? null;
  }

  const { data, error } = await supabase
    .from('community_notes')
    .select('id, title, body, room_id, lesson_id, updated_at')
    .eq('owner_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapCommunityNoteRow(data as Record<string, unknown>) : null;
}

export async function sendCommunityMessage(userId: string, conversationId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) {
    return;
  }

  if (usesViewerFixtures()) {
    const { patchFixtureState } = await loadFixtureStore();
    patchFixtureState((state) => {
      const people = state.community.people;
      state.community.conversations = state.community.conversations.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              preview: trimmed,
              updated_at: new Date().toISOString(),
              messages: [
                ...conversation.messages,
                {
                  id: `local-${conversation.messages.length + 1}`,
                  author_id: userId,
                  author_name: fixtureMessageAuthorName(userId, people),
                  body: trimmed,
                  created_at: new Date().toISOString(),
                },
              ],
            }
          : conversation,
      );
      return { ...state };
    });
    return;
  }

  const { error } = await supabase.from('community_messages').insert({
    conversation_id: conversationId,
    author_id: userId,
    body: trimmed,
  });
  if (error) {
    throw error;
  }

  await supabase
    .from('community_conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
}

export async function createDirectConversation(userId: string, otherUserId: string) {
  if (usesViewerFixtures()) {
    const { patchFixtureState } = await loadFixtureStore();
    const state = patchFixtureState((draft) => {
      const existing = draft.community.conversations.find(
        (conversation) =>
          conversation.kind === 'direct' &&
          conversation.participant_ids.includes(userId) &&
          conversation.participant_ids.includes(otherUserId),
      );
      if (existing) {
        return draft;
      }

      const person = draft.community.people.find((entry) => entry.id === otherUserId);
      draft.community.conversations.unshift({
        id: `conv-${Date.now()}`,
        title: person?.display_name ?? 'Direct chat',
        kind: 'direct',
        preview: '',
        participant_ids: [userId, otherUserId],
        unread_count: 0,
        updated_at: new Date().toISOString(),
        study_room_id: null,
        messages: [],
      });
      return { ...draft };
    });

    return state.community.conversations[0]?.id ?? null;
  }

  const { data, error } = await supabase.rpc('create_or_get_direct_conversation', {
    p_other_user_id: otherUserId,
  });
  if (error) {
    throw error;
  }
  return typeof data === 'string' ? data : String((data as Record<string, unknown>)?.conversation_id ?? '');
}

export async function createStudyRoom(userId: string, payload: { name: string; description: string }) {
  const name = payload.name.trim();
  if (!name) {
    return;
  }

  if (usesViewerFixtures()) {
    const { patchFixtureState } = await loadFixtureStore();
    patchFixtureState((state) => {
      const roomId = `room-${Date.now()}`;
      const conversationId = `conv-room-${Date.now()}`;
      state.community.studyRooms.unshift({
        id: roomId,
        name,
        description: payload.description.trim(),
        created_by: userId,
        member_ids: [userId],
        members: 1,
        status: 'Open now',
        conversation_id: conversationId,
      });
      state.community.conversations.unshift({
        id: conversationId,
        title: name,
        kind: 'group',
        preview: '',
        participant_ids: [userId],
        unread_count: 0,
        updated_at: new Date().toISOString(),
        study_room_id: roomId,
        messages: [],
      });
      return { ...state };
    });
    return;
  }

  const { error } = await supabase.from('community_study_rooms').insert({
    name,
    description: payload.description.trim(),
    created_by: userId,
    status: 'Open now',
  });
  if (error) {
    throw error;
  }
}

export async function joinStudyRoom(userId: string, roomId: string) {
  if (usesViewerFixtures()) {
    const { patchFixtureState } = await loadFixtureStore();
    patchFixtureState((state) => {
      state.community.studyRooms = state.community.studyRooms.map((room) =>
        room.id === roomId && !room.member_ids.includes(userId)
          ? {
              ...room,
              member_ids: [...room.member_ids, userId],
              members: room.members + 1,
            }
          : room,
      );
      state.community.conversations = state.community.conversations.map((conversation) =>
        conversation.study_room_id === roomId && !conversation.participant_ids.includes(userId)
          ? { ...conversation, participant_ids: [...conversation.participant_ids, userId] }
          : conversation,
      );
      return { ...state };
    });
    return;
  }

  const { error } = await supabase.rpc('join_study_room', { p_room_id: roomId });
  if (error) {
    throw error;
  }
}

export async function deleteStudyRoom(userId: string, roomId: string) {
  if (usesViewerFixtures()) {
    const { patchFixtureState } = await loadFixtureStore();
    patchFixtureState((state) => {
      state.community.studyRooms = state.community.studyRooms.filter(
        (room) => !(room.id === roomId && room.created_by === userId),
      );
      state.community.conversations = state.community.conversations.filter((conversation) => conversation.study_room_id !== roomId);
      return { ...state };
    });
    return;
  }

  const { error } = await supabase.from('community_study_rooms').delete().eq('id', roomId).eq('created_by', userId);
  if (error) {
    throw error;
  }
}

export async function saveCommunityNote(userId: string, note: CommunityNoteInput): Promise<CommunityNote> {
  const title = note.title.trim() || 'Untitled note';
  const body = note.body;

  if (usesViewerFixtures()) {
    const { patchFixtureState } = await loadFixtureStore();
    const nextState = patchFixtureState((state) => {
      const existing = state.community.notes.find(
        (entry) =>
          entry.id === note.id ||
          (note.lesson_id && entry.lesson_id === note.lesson_id),
      );
      const noteId = existing?.id ?? note.id ?? `note-${Date.now()}`;
      const nextNote: CommunityNote = {
        id: noteId,
        title,
        body,
        room_id: note.room_id ?? null,
        lesson_id: note.lesson_id ?? existing?.lesson_id ?? null,
        updated_at: new Date().toISOString(),
      };
      const existingIndex = state.community.notes.findIndex((entry) => entry.id === noteId);
      if (existingIndex >= 0) {
        state.community.notes[existingIndex] = nextNote;
      } else {
        state.community.notes.unshift(nextNote);
      }
      return { ...state };
    });
    return nextState.community.notes.find((entry) => entry.id === (note.id ?? '')) ??
      nextState.community.notes.find((entry) => note.lesson_id && entry.lesson_id === note.lesson_id) ??
      nextState.community.notes[0]!;
  }

  const payload = {
    owner_id: userId,
    title,
    body,
    room_id: note.room_id ?? null,
    lesson_id: note.lesson_id ?? null,
    updated_at: new Date().toISOString(),
  };

  if (note.id) {
    const { data, error } = await supabase
      .from('community_notes')
      .update(payload)
      .eq('id', note.id)
      .eq('owner_id', userId)
      .select('id, title, body, room_id, lesson_id, updated_at')
      .single();
    if (error) {
      throw error;
    }
    return mapCommunityNoteRow(data as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from('community_notes')
    .insert(payload)
    .select('id, title, body, room_id, lesson_id, updated_at')
    .single();
  if (error) {
    throw error;
  }
  return mapCommunityNoteRow(data as Record<string, unknown>);
}

export async function createDiscussion(userId: string, payload: { title: string; body: string; category: string }) {
  if (usesViewerFixtures()) {
    const { patchFixtureState } = await loadFixtureStore();
    patchFixtureState((state) => {
      const author = state.community.people.find((person) => person.id === userId);
      state.community.discussions.unshift({
        id: `discussion-${Date.now()}`,
        title: payload.title.trim(),
        body: payload.body.trim(),
        category: payload.category.trim() || 'General',
        author_id: userId,
        author_name: author?.display_name ?? 'You',
        created_at: new Date().toISOString(),
        likes: 0,
        liked_by_me: false,
        comments: [],
      });
      return { ...state };
    });
    return;
  }

  const { error } = await supabase.from('community_discussions').insert({
    title: payload.title.trim(),
    body: payload.body.trim(),
    category: payload.category.trim() || 'General',
    author_id: userId,
  });
  if (error) {
    throw error;
  }
}

export async function addDiscussionComment(userId: string, discussionId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) {
    return;
  }

  if (usesViewerFixtures()) {
    const { patchFixtureState } = await loadFixtureStore();
    patchFixtureState((state) => {
      const author = state.community.people.find((person) => person.id === userId);
      state.community.discussions = state.community.discussions.map((discussion) =>
        discussion.id === discussionId
          ? {
              ...discussion,
              comments: [
                ...discussion.comments,
                {
                  id: `comment-${Date.now()}`,
                  author_id: userId,
                  author_name: author?.display_name ?? 'You',
                  body: trimmed,
                  created_at: new Date().toISOString(),
                },
              ],
            }
          : discussion,
      );
      return { ...state };
    });
    return;
  }

  const { error } = await supabase.from('community_discussion_comments').insert({
    discussion_id: discussionId,
    author_id: userId,
    body: trimmed,
  });
  if (error) {
    throw error;
  }
}

export async function toggleDiscussionLike(_userId: string, discussionId: string) {
  if (usesViewerFixtures()) {
    const { patchFixtureState } = await loadFixtureStore();
    patchFixtureState((state) => {
      state.community.discussions = state.community.discussions.map((discussion) => {
        if (discussion.id !== discussionId) {
          return discussion;
        }
        return {
          ...discussion,
          liked_by_me: !discussion.liked_by_me,
          likes: discussion.likes + (discussion.liked_by_me ? -1 : 1),
        };
      });
      return { ...state };
    });
    return;
  }

  const { error } = await supabase.rpc('toggle_discussion_like', { p_discussion_id: discussionId });
  if (error) {
    throw error;
  }
}

export async function deleteCommunityNote(userId: string, noteId: string): Promise<void> {
  if (usesViewerFixtures()) {
    const { patchFixtureState } = await loadFixtureStore();
    patchFixtureState((state) => {
      state.community.notes = state.community.notes.filter((note) => note.id !== noteId);
      return { ...state };
    });
    return;
  }

  const { error } = await supabase
    .from('community_notes')
    .delete()
    .eq('id', noteId)
    .eq('owner_id', userId);
  if (error) {
    throw error;
  }
}
