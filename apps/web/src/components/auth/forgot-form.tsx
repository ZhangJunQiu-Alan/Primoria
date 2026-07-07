"use client";

import Link from "next/link";

import { authStyles } from "@/components/auth/styles";

export function ForgotForm() {
  return (
    <div style={authStyles.container}>
      <h1 style={authStyles.title}>找回密码</h1>
      <p style={authStyles.label}>当前账号系统已切到 Primoria 自有数据库，邮件找回密码暂未开放。</p>

      <p style={authStyles.footer}>
        <Link href="/login">返回登录</Link>
      </p>
    </div>
  );
}
