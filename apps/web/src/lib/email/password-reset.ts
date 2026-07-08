import {
  getTencentSesPasswordResetTemplateId,
  isTencentSesConfigured,
  sendTencentSesTemplateEmail,
} from "./tencent-ses";

const DEFAULT_PASSWORD_RESET_SUBJECT = "Reset your Primoria password";

export function isPasswordResetEmailConfigured() {
  return Boolean(getAppBaseUrlOrNull() && isTencentSesConfigured());
}

export async function sendPasswordResetEmail(input: {
  email: string;
  expiresMinutes: number;
  resetUrl: string;
}) {
  const provider = process.env.EMAIL_PROVIDER || "tencent-ses";
  if (provider !== "tencent-ses") {
    throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
  }

  return sendTencentSesTemplateEmail({
    to: input.email,
    subject: process.env.TENCENT_SES_PASSWORD_RESET_SUBJECT || DEFAULT_PASSWORD_RESET_SUBJECT,
    templateId: getTencentSesPasswordResetTemplateId(),
    templateData: {
      productName: "Primoria",
      product_name: "Primoria",
      resetUrl: input.resetUrl,
      reset_url: input.resetUrl,
      expiresMinutes: input.expiresMinutes,
      expires_minutes: input.expiresMinutes,
    },
  });
}

export function buildPasswordResetUrl(token: string) {
  const baseUrl = getAppBaseUrl();
  const url = new URL("/reset-password", baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

function getAppBaseUrl() {
  const value = getAppBaseUrlOrNull();
  if (!value) throw new Error("Missing APP_BASE_URL for password reset emails.");
  return value;
}

function getAppBaseUrlOrNull() {
  const configured = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  return null;
}
