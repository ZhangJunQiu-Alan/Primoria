-- Destructive removal of Parent Mode.
-- Drops parent/child binding tables, report RPCs, helper RPCs, RLS policies, and removes the parent enum value.

DROP FUNCTION IF EXISTS public.get_parent_child_report(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.get_parent_children_overview();
DROP FUNCTION IF EXISTS public.unbind_child(UUID);
DROP FUNCTION IF EXISTS public.bind_child_with_code(TEXT);
DROP FUNCTION IF EXISTS public.generate_child_binding_code(INTEGER);
DROP FUNCTION IF EXISTS public.generate_child_binding_code();
DROP FUNCTION IF EXISTS public.is_parent_user(UUID);

DROP POLICY IF EXISTS "binding_codes_child_all" ON public.parent_child_binding_codes;
DROP POLICY IF EXISTS "parent_child_links_parent_select" ON public.parent_child_links;
DROP POLICY IF EXISTS "parent_child_links_child_select" ON public.parent_child_links;

DROP TABLE IF EXISTS public.parent_child_links CASCADE;
DROP TABLE IF EXISTS public.parent_child_binding_codes CASCADE;

-- PostgreSQL supports dropping enum values in modern versions, but only when no rows still use it.
-- Normalize any remaining parent-role profiles before removing the enum label.
UPDATE public.profiles
SET role = 'user'::public.user_role
WHERE role::TEXT = 'parent';

ALTER TYPE public.user_role RENAME TO user_role_with_parent;
CREATE TYPE public.user_role AS ENUM ('user', 'subscriber', 'author', 'admin');
ALTER TABLE public.profiles
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE public.user_role USING role::TEXT::public.user_role,
  ALTER COLUMN role SET DEFAULT 'user'::public.user_role;
DROP TYPE public.user_role_with_parent;
