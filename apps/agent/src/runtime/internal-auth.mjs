import { timingSafeEqual } from "node:crypto";

const LOCAL_AGENT_TOKEN = "primoria-local-agent-runtime";

export function getAgentInternalToken() {
  const configured = process.env.PRIMORIA_AGENT_INTERNAL_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("PRIMORIA_AGENT_INTERNAL_SECRET is required in production");
  }
  return LOCAL_AGENT_TOKEN;
}

/** @param {import("node:http").IncomingMessage} req */
export function isAuthorizedAgentRequest(req) {
  const supplied = String(req.headers["x-primoria-agent-token"] ?? "");
  const expected = getAgentInternalToken();
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** @param {import("node:http").IncomingMessage} req */
export function ownerIdFromRequest(req) {
  const value = String(req.headers["x-primoria-owner-id"] ?? "").trim();
  return value.length > 0 && value.length <= 200 ? value : null;
}

/** @param {any} input @param {string} ownerId */
export function inputMatchesOwner(input, ownerId) {
  const candidates = [
    input?.state?.primoria_owner_id,
    input?.state?.user_id,
    input?.forwardedProps?.config?.configurable?.primoria_owner_id,
    input?.forwardedProps?.config?.metadata?.primoria_owner_id,
  ].filter((value) => value !== undefined && value !== null);
  return candidates.length > 0 && candidates.every((value) => value === ownerId);
}
