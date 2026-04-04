-- ============================================================
-- Community MVP for React Viewer cutover
-- ============================================================

DO $$ BEGIN
  CREATE TYPE community_conversation_kind AS ENUM ('direct', 'group');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS community_study_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Open now',
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind community_conversation_kind NOT NULL DEFAULT 'direct',
  title TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  study_room_id UUID UNIQUE REFERENCES community_study_rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_conversation_members (
  conversation_id UUID NOT NULL REFERENCES community_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES community_conversations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  room_id UUID REFERENCES community_study_rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_discussion_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES community_discussions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_discussion_likes (
  discussion_id UUID NOT NULL REFERENCES community_discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (discussion_id, user_id)
);

CREATE TABLE IF NOT EXISTS community_study_room_members (
  room_id UUID NOT NULL REFERENCES community_study_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_conversation_members_user
  ON community_conversation_members (user_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_community_messages_conversation
  ON community_messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_notes_owner
  ON community_notes (owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_discussions_created
  ON community_discussions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_discussion_comments_discussion
  ON community_discussion_comments (discussion_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_community_study_room_members_user
  ON community_study_room_members (user_id, room_id);

DROP TRIGGER IF EXISTS trg_community_study_rooms_updated_at ON community_study_rooms;
CREATE TRIGGER trg_community_study_rooms_updated_at
  BEFORE UPDATE ON community_study_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_community_conversations_updated_at ON community_conversations;
CREATE TRIGGER trg_community_conversations_updated_at
  BEFORE UPDATE ON community_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_community_messages_updated_at ON community_messages;
CREATE TRIGGER trg_community_messages_updated_at
  BEFORE UPDATE ON community_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_community_notes_updated_at ON community_notes;
CREATE TRIGGER trg_community_notes_updated_at
  BEFORE UPDATE ON community_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_community_discussions_updated_at ON community_discussions;
CREATE TRIGGER trg_community_discussions_updated_at
  BEFORE UPDATE ON community_discussions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_community_discussion_comments_updated_at ON community_discussion_comments;
CREATE TRIGGER trg_community_discussion_comments_updated_at
  BEFORE UPDATE ON community_discussion_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION public.community_create_room_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  INSERT INTO public.community_conversations (kind, title, created_by, study_room_id)
  VALUES ('group', NEW.name, NEW.created_by, NEW.id)
  RETURNING id INTO v_conversation_id;

  INSERT INTO public.community_study_room_members (room_id, user_id)
  VALUES (NEW.id, NEW.created_by)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.community_conversation_members (conversation_id, user_id, last_read_at)
  VALUES (v_conversation_id, NEW.created_by, NOW())
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_create_room_conversation ON community_study_rooms;
CREATE TRIGGER trg_community_create_room_conversation
  AFTER INSERT ON community_study_rooms
  FOR EACH ROW EXECUTE FUNCTION public.community_create_room_conversation();

CREATE OR REPLACE FUNCTION public.community_sync_room_conversation_title()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.community_conversations
  SET title = NEW.name,
      updated_at = NOW()
  WHERE study_room_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_sync_room_conversation_title ON community_study_rooms;
CREATE TRIGGER trg_community_sync_room_conversation_title
  AFTER UPDATE OF name ON community_study_rooms
  FOR EACH ROW EXECUTE FUNCTION public.community_sync_room_conversation_title();

CREATE OR REPLACE FUNCTION public.community_touch_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.community_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_touch_conversation ON community_messages;
CREATE TRIGGER trg_community_touch_conversation
  AFTER INSERT ON community_messages
  FOR EACH ROW EXECUTE FUNCTION public.community_touch_conversation();

ALTER TABLE community_study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_discussion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_discussion_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_study_room_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_study_rooms_select_authenticated" ON community_study_rooms;
CREATE POLICY "community_study_rooms_select_authenticated"
  ON community_study_rooms FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "community_study_rooms_insert_own" ON community_study_rooms;
CREATE POLICY "community_study_rooms_insert_own"
  ON community_study_rooms FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "community_study_rooms_update_own" ON community_study_rooms;
CREATE POLICY "community_study_rooms_update_own"
  ON community_study_rooms FOR UPDATE
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "community_study_rooms_delete_own" ON community_study_rooms;
CREATE POLICY "community_study_rooms_delete_own"
  ON community_study_rooms FOR DELETE
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "community_conversations_select_member" ON community_conversations;
CREATE POLICY "community_conversations_select_member"
  ON community_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.community_conversation_members cm
      WHERE cm.conversation_id = community_conversations.id
        AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "community_conversations_insert_own" ON community_conversations;
CREATE POLICY "community_conversations_insert_own"
  ON community_conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "community_conversations_update_own" ON community_conversations;
CREATE POLICY "community_conversations_update_own"
  ON community_conversations FOR UPDATE
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "community_conversation_members_select_member" ON community_conversation_members;
CREATE POLICY "community_conversation_members_select_member"
  ON community_conversation_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.community_conversation_members cm
      WHERE cm.conversation_id = community_conversation_members.conversation_id
        AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "community_conversation_members_insert_self" ON community_conversation_members;
CREATE POLICY "community_conversation_members_insert_self"
  ON community_conversation_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "community_conversation_members_update_self" ON community_conversation_members;
CREATE POLICY "community_conversation_members_update_self"
  ON community_conversation_members FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "community_messages_select_member" ON community_messages;
CREATE POLICY "community_messages_select_member"
  ON community_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.community_conversation_members cm
      WHERE cm.conversation_id = community_messages.conversation_id
        AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "community_messages_insert_member" ON community_messages;
CREATE POLICY "community_messages_insert_member"
  ON community_messages FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1
      FROM public.community_conversation_members cm
      WHERE cm.conversation_id = community_messages.conversation_id
        AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "community_messages_update_author" ON community_messages;
CREATE POLICY "community_messages_update_author"
  ON community_messages FOR UPDATE
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "community_study_room_members_select_authenticated" ON community_study_room_members;
CREATE POLICY "community_study_room_members_select_authenticated"
  ON community_study_room_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "community_study_room_members_insert_self" ON community_study_room_members;
CREATE POLICY "community_study_room_members_insert_self"
  ON community_study_room_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "community_notes_select_owner_or_room_member" ON community_notes;
CREATE POLICY "community_notes_select_owner_or_room_member"
  ON community_notes FOR SELECT
  USING (
    owner_id = auth.uid()
    OR (
      room_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.community_study_room_members rm
        WHERE rm.room_id = community_notes.room_id
          AND rm.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "community_notes_insert_owner" ON community_notes;
CREATE POLICY "community_notes_insert_owner"
  ON community_notes FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND (
      room_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.community_study_room_members rm
        WHERE rm.room_id = community_notes.room_id
          AND rm.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "community_notes_update_owner" ON community_notes;
CREATE POLICY "community_notes_update_owner"
  ON community_notes FOR UPDATE
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "community_notes_delete_owner" ON community_notes;
CREATE POLICY "community_notes_delete_owner"
  ON community_notes FOR DELETE
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "community_discussions_select_authenticated" ON community_discussions;
CREATE POLICY "community_discussions_select_authenticated"
  ON community_discussions FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "community_discussions_insert_own" ON community_discussions;
CREATE POLICY "community_discussions_insert_own"
  ON community_discussions FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "community_discussions_update_own" ON community_discussions;
CREATE POLICY "community_discussions_update_own"
  ON community_discussions FOR UPDATE
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "community_discussions_delete_own" ON community_discussions;
CREATE POLICY "community_discussions_delete_own"
  ON community_discussions FOR DELETE
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "community_discussion_comments_select_authenticated" ON community_discussion_comments;
CREATE POLICY "community_discussion_comments_select_authenticated"
  ON community_discussion_comments FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "community_discussion_comments_insert_own" ON community_discussion_comments;
CREATE POLICY "community_discussion_comments_insert_own"
  ON community_discussion_comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "community_discussion_comments_update_own" ON community_discussion_comments;
CREATE POLICY "community_discussion_comments_update_own"
  ON community_discussion_comments FOR UPDATE
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "community_discussion_comments_delete_own" ON community_discussion_comments;
CREATE POLICY "community_discussion_comments_delete_own"
  ON community_discussion_comments FOR DELETE
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "community_discussion_likes_select_authenticated" ON community_discussion_likes;
CREATE POLICY "community_discussion_likes_select_authenticated"
  ON community_discussion_likes FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "community_discussion_likes_insert_self" ON community_discussion_likes;
CREATE POLICY "community_discussion_likes_insert_self"
  ON community_discussion_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "community_discussion_likes_delete_self" ON community_discussion_likes;
CREATE POLICY "community_discussion_likes_delete_self"
  ON community_discussion_likes FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.create_or_get_direct_conversation(
  p_other_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_conversation_id UUID;
  v_title TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_other_user_id IS NULL OR p_other_user_id = v_user_id THEN
    RAISE EXCEPTION 'Direct conversation requires another user';
  END IF;

  SELECT c.id
  INTO v_conversation_id
  FROM public.community_conversations c
  JOIN public.community_conversation_members self_member
    ON self_member.conversation_id = c.id
   AND self_member.user_id = v_user_id
  JOIN public.community_conversation_members other_member
    ON other_member.conversation_id = c.id
   AND other_member.user_id = p_other_user_id
  WHERE c.kind = 'direct'
    AND (
      SELECT COUNT(*)
      FROM public.community_conversation_members cm
      WHERE cm.conversation_id = c.id
    ) = 2
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  SELECT COALESCE(username, 'Direct chat') INTO v_title
  FROM public.profiles
  WHERE id = p_other_user_id;

  INSERT INTO public.community_conversations (kind, title, created_by)
  VALUES ('direct', COALESCE(v_title, 'Direct chat'), v_user_id)
  RETURNING id INTO v_conversation_id;

  INSERT INTO public.community_conversation_members (conversation_id, user_id, last_read_at)
  VALUES
    (v_conversation_id, v_user_id, NOW()),
    (v_conversation_id, p_other_user_id, NULL)
  ON CONFLICT DO NOTHING;

  RETURN v_conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_study_room(
  p_room_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_conversation_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_conversation_id
  FROM public.community_conversations
  WHERE study_room_id = p_room_id
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    RAISE EXCEPTION 'Study room conversation not found';
  END IF;

  INSERT INTO public.community_study_room_members (room_id, user_id)
  VALUES (p_room_id, v_user_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.community_conversation_members (conversation_id, user_id, last_read_at)
  VALUES (v_conversation_id, v_user_id, NOW())
  ON CONFLICT (conversation_id, user_id) DO UPDATE
    SET last_read_at = COALESCE(community_conversation_members.last_read_at, NOW());

  RETURN jsonb_build_object(
    'room_id', p_room_id,
    'conversation_id', v_conversation_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_discussion_like(
  p_discussion_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_liked BOOLEAN := false;
  v_like_count INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.community_discussion_likes
    WHERE discussion_id = p_discussion_id
      AND user_id = v_user_id
  ) THEN
    DELETE FROM public.community_discussion_likes
    WHERE discussion_id = p_discussion_id
      AND user_id = v_user_id;
    v_liked := false;
  ELSE
    INSERT INTO public.community_discussion_likes (discussion_id, user_id)
    VALUES (p_discussion_id, v_user_id)
    ON CONFLICT DO NOTHING;
    v_liked := true;
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_like_count
  FROM public.community_discussion_likes
  WHERE discussion_id = p_discussion_id;

  RETURN jsonb_build_object(
    'liked', v_liked,
    'likes', v_like_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_or_get_direct_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_study_room(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_discussion_like(UUID) TO authenticated;
