const LOCAL_AGENT_TOKEN = "primoria-local-agent-runtime";

export function getAgentInternalToken() {
  const configured = process.env.PRIMORIA_AGENT_INTERNAL_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("PRIMORIA_AGENT_INTERNAL_SECRET is required in production");
  }
  return LOCAL_AGENT_TOKEN;
}
