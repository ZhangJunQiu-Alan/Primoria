"use client";

import { useRouter } from "next/navigation";

import { authStyles } from "@/components/auth/styles";

export function ResetPasswordForm() {
  const router = useRouter();

  return (
    <div style={authStyles.container}>
      <h1 style={authStyles.title}>设置新密码</h1>
      <p style={authStyles.label}>当前账号系统已切到 Primoria 自有数据库，邮件重置密码暂未开放。</p>
      <button type="button" onClick={() => router.push("/login")} style={authStyles.primaryButton}>
        返回登录
      </button>
    </div>
  );
}
