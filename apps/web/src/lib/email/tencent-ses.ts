import { createHash, createHmac } from "node:crypto";

const TENCENT_SES_SERVICE = "ses";
const TENCENT_SES_VERSION = "2020-10-02";
const TENCENT_SES_ACTION_SEND_EMAIL = "SendEmail";
const DEFAULT_TENCENT_SES_ENDPOINT = "ses.tencentcloudapi.com";
const DEFAULT_TENCENT_SES_REGION = "ap-guangzhou";

export type TencentSesTemplateEmailInput = {
  to: string;
  subject: string;
  templateId: number;
  templateData: Record<string, string | number | boolean | null>;
};

type TencentSesConfig = {
  secretId: string;
  secretKey: string;
  endpoint: string;
  region: string;
  fromEmailAddress: string;
  replyToAddresses?: string;
  language?: "zh-CN" | "en-US";
};

type TencentSesApiError = {
  Code?: string;
  Message?: string;
};

type TencentSesResponse = {
  Response?: {
    RequestId?: string;
    MessageId?: string;
    Error?: TencentSesApiError;
  };
};

export function isTencentSesConfigured() {
  return Boolean(
    process.env.TENCENT_SES_SECRET_ID &&
      process.env.TENCENT_SES_SECRET_KEY &&
      process.env.TENCENT_SES_FROM_EMAIL &&
      process.env.TENCENT_SES_PASSWORD_RESET_TEMPLATE_ID,
  );
}

export function getTencentSesPasswordResetTemplateId() {
  const raw = process.env.TENCENT_SES_PASSWORD_RESET_TEMPLATE_ID;
  const templateId = Number(raw);
  if (!Number.isInteger(templateId) || templateId <= 0) {
    throw new Error("TENCENT_SES_PASSWORD_RESET_TEMPLATE_ID must be a positive integer.");
  }
  return templateId;
}

export async function sendTencentSesTemplateEmail(input: TencentSesTemplateEmailInput) {
  const config = getTencentSesConfig();
  const payload = JSON.stringify({
    FromEmailAddress: config.fromEmailAddress,
    Destination: [input.to],
    Subject: input.subject,
    Template: {
      TemplateID: input.templateId,
      TemplateData: JSON.stringify(input.templateData),
    },
    TriggerType: 1,
    ...(config.replyToAddresses ? { ReplyToAddresses: config.replyToAddresses } : {}),
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const headers = createTencentCloudHeaders({
    action: TENCENT_SES_ACTION_SEND_EMAIL,
    endpoint: config.endpoint,
    language: config.language,
    payload,
    region: config.region,
    secretId: config.secretId,
    secretKey: config.secretKey,
    service: TENCENT_SES_SERVICE,
    timestamp,
    version: TENCENT_SES_VERSION,
  });

  const response = await fetch(`https://${config.endpoint}/`, {
    method: "POST",
    headers,
    body: payload,
  });
  const json = (await response.json().catch(() => ({}))) as TencentSesResponse;
  const apiError = json.Response?.Error;
  if (!response.ok || apiError) {
    const code = apiError?.Code ? `${apiError.Code}: ` : "";
    const message = apiError?.Message || `Tencent SES request failed with HTTP ${response.status}`;
    throw new Error(`${code}${message}`);
  }
  return {
    messageId: json.Response?.MessageId ?? null,
    requestId: json.Response?.RequestId ?? null,
  };
}

export function createTencentCloudHeaders(input: {
  action: string;
  endpoint: string;
  language?: "zh-CN" | "en-US";
  payload: string;
  region: string;
  secretId: string;
  secretKey: string;
  service: string;
  timestamp: number;
  version: string;
}) {
  const contentType = "application/json; charset=utf-8";
  const date = new Date(input.timestamp * 1000).toISOString().slice(0, 10);
  const signedHeaders = "content-type;host;x-tc-action";
  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${input.endpoint}`,
    `x-tc-action:${input.action.toLowerCase()}`,
    "",
  ].join("\n");
  const canonicalRequest = [
    "POST",
    "/",
    "",
    canonicalHeaders,
    signedHeaders,
    sha256Hex(input.payload),
  ].join("\n");
  const credentialScope = `${date}/${input.service}/tc3_request`;
  const stringToSign = [
    "TC3-HMAC-SHA256",
    String(input.timestamp),
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const secretDate = hmac(Buffer.from(`TC3${input.secretKey}`), date);
  const secretService = hmac(secretDate, input.service);
  const secretSigning = hmac(secretService, "tc3_request");
  const signature = hmacHex(secretSigning, stringToSign);

  return {
    Authorization: `TC3-HMAC-SHA256 Credential=${input.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "Content-Type": contentType,
    Host: input.endpoint,
    "X-TC-Action": input.action,
    "X-TC-Region": input.region,
    "X-TC-Timestamp": String(input.timestamp),
    "X-TC-Version": input.version,
    ...(input.language ? { "X-TC-Language": input.language } : {}),
  };
}

function getTencentSesConfig(): TencentSesConfig {
  return {
    secretId: requiredEnv("TENCENT_SES_SECRET_ID"),
    secretKey: requiredEnv("TENCENT_SES_SECRET_KEY"),
    endpoint: process.env.TENCENT_SES_ENDPOINT || DEFAULT_TENCENT_SES_ENDPOINT,
    region: process.env.TENCENT_SES_REGION || DEFAULT_TENCENT_SES_REGION,
    fromEmailAddress: requiredEnv("TENCENT_SES_FROM_EMAIL"),
    replyToAddresses: process.env.TENCENT_SES_REPLY_TO || undefined,
    language: process.env.TENCENT_SES_LANGUAGE === "en-US" ? "en-US" : "zh-CN",
  };
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function hmacHex(key: Buffer, value: string) {
  return createHmac("sha256", key).update(value).digest("hex");
}
