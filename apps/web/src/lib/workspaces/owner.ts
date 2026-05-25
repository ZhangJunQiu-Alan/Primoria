import { cookies } from "next/headers";
import type { AuthUser } from "@/lib/auth/types";
import { WORKSPACE_LOCAL_OWNER_COOKIE } from "./owner-cookie";

export { WORKSPACE_LOCAL_OWNER_COOKIE };

export async function getWorkspaceOwnerId(user: AuthUser | null | undefined) {
  if (user?.id) return user.id;
  const cookieStore = await cookies();
  return cookieStore.get(WORKSPACE_LOCAL_OWNER_COOKIE)?.value ?? null;
}
