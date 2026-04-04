-- ============================================================
-- Fix recursive community membership RLS policies
-- ============================================================

CREATE OR REPLACE FUNCTION public.viewer_can_access_conversation(
  p_conversation_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_conversation_members cm
    WHERE cm.conversation_id = p_conversation_id
      AND cm.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.viewer_can_access_conversation(UUID) TO authenticated;

DROP POLICY IF EXISTS "community_conversations_select_member" ON community_conversations;
CREATE POLICY "community_conversations_select_member"
  ON community_conversations FOR SELECT
  USING (public.viewer_can_access_conversation(id));

DROP POLICY IF EXISTS "community_conversation_members_select_member" ON community_conversation_members;
CREATE POLICY "community_conversation_members_select_member"
  ON community_conversation_members FOR SELECT
  USING (public.viewer_can_access_conversation(conversation_id));

DROP POLICY IF EXISTS "community_messages_select_member" ON community_messages;
CREATE POLICY "community_messages_select_member"
  ON community_messages FOR SELECT
  USING (public.viewer_can_access_conversation(conversation_id));

DROP POLICY IF EXISTS "community_messages_insert_member" ON community_messages;
CREATE POLICY "community_messages_insert_member"
  ON community_messages FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND public.viewer_can_access_conversation(conversation_id)
  );
