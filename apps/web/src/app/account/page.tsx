import { redirect } from "next/navigation";

import { AccountForm } from "@/components/auth/account-form";
import { supabaseEnv } from "@/lib/supabase/env";
import { createClient, getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  if (!supabaseEnv()) redirect("/login");

  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <AccountForm
      userId={user.id}
      email={user.email ?? ""}
      initialDisplayName={profile?.display_name ?? ""}
      initialAvatarUrl={profile?.avatar_url ?? ""}
    />
  );
}
