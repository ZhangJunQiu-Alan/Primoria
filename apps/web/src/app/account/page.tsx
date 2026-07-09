import { redirect } from "next/navigation";

import { AccountForm } from "@/components/auth/account-form";
import { getCurrentUserForRsc } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUserForRsc();
  if (!user) redirect("/login");

  return (
    <AccountForm
      email={user.email ?? ""}
      initialDisplayName={user.displayName ?? ""}
    />
  );
}
