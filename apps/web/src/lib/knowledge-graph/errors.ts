// KG infrastructure failure classification and safe user-facing error mapping.
//
// Two situations must never be conflated:
// - coverage miss: KG works but the library has no match -> freeform gate / gen_*
// - infrastructure failure: KG itself is broken -> fail friendly, log loudly,
//   never silently reroute every goal into generated graphs.

export type KnowledgeGraphFailureKind =
  | "kg_schema_missing"
  | "kg_schema_drift"
  | "kg_unseeded"
  | "embedding_unavailable"
  | "db_unavailable"
  | "unknown";

export class KnowledgeGraphUnavailableError extends Error {
  readonly kind: KnowledgeGraphFailureKind;

  constructor(kind: KnowledgeGraphFailureKind, cause?: unknown) {
    super(`Knowledge graph unavailable: ${kind}`, cause === undefined ? undefined : { cause });
    this.name = "KnowledgeGraphUnavailableError";
    this.kind = kind;
  }
}

// Curated positioning message written for the learner (freeform-gate fallback
// prompts, generated-graph rejection). Safe to return and persist verbatim.
export class LearningGoalUserMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LearningGoalUserMessageError";
  }
}

const DB_UNAVAILABLE_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "57P01",
  "57P02",
  "57P03",
  "53300",
]);

// Secondary fallback only, for provider errors that carry no structured code.
const EMBEDDING_MESSAGE_PATTERN =
  /Missing OPENAI_|Missing MINIMAX_|Missing KG_EMBEDDING_|Unsupported KG_EMBEDDING_PROVIDER|Embedding request failed|embedding provider returned|Unexpected embedding dimension|fetch failed/i;

function classifyShallow(error: unknown): KnowledgeGraphFailureKind {
  if (error instanceof KnowledgeGraphUnavailableError) return error.kind;
  if (!error || typeof error !== "object") return "unknown";
  const record = error as Record<string, unknown>;

  const code = typeof record.code === "string" ? record.code : "";
  if (code === "42P01") return "kg_schema_missing";
  if (code === "42703") return "kg_schema_drift";
  if (DB_UNAVAILABLE_CODES.has(code)) return "db_unavailable";

  const message = typeof record.message === "string" ? record.message : "";
  if (/Missing DATABASE_URL/i.test(message)) return "db_unavailable";
  if (EMBEDDING_MESSAGE_PATTERN.test(message)) return "embedding_unavailable";
  return "unknown";
}

export function classifyKnowledgeGraphFailure(error: unknown, depth = 0): KnowledgeGraphFailureKind {
  const kind = classifyShallow(error);
  if (kind !== "unknown" || depth >= 3 || !error || typeof error !== "object") return kind;

  const record = error as { cause?: unknown; errors?: unknown };
  if (record.cause !== undefined) {
    const nested = classifyKnowledgeGraphFailure(record.cause, depth + 1);
    if (nested !== "unknown") return nested;
  }
  if (Array.isArray(record.errors)) {
    for (const item of record.errors) {
      const nested = classifyKnowledgeGraphFailure(item, depth + 1);
      if (nested !== "unknown") return nested;
    }
  }
  return "unknown";
}

// Explicit opt-in for local dev/QA only: lets kg_schema_missing (and nothing
// else) degrade into an empty search + freeform gate. Never keyed off NODE_ENV.
export function allowKgInfraFallback() {
  return process.env.PRIMORIA_ALLOW_KG_INFRA_FALLBACK === "1";
}

export type SafeKnowledgeGraphError = {
  status: number;
  code: string;
  message: string;
};

export function toSafeKnowledgeGraphError(
  error: unknown,
  fallback?: Partial<SafeKnowledgeGraphError>,
): SafeKnowledgeGraphError {
  if (error instanceof LearningGoalUserMessageError) {
    return { status: 422, code: "learning_goal_rejected", message: error.message };
  }
  if (error instanceof KnowledgeGraphUnavailableError) {
    return {
      status: 503,
      code: "knowledge_graph_unavailable",
      message: "Learning goal positioning is temporarily unavailable. Please retry later.",
    };
  }
  return {
    status: fallback?.status ?? 503,
    code: fallback?.code ?? "learning_goal_positioning_failed",
    message: fallback?.message ?? "Could not locate that learning goal. Please retry.",
  };
}

// Loud server-side logging; user-facing responses go through
// toSafeKnowledgeGraphError instead of exposing the raw error.
export function logKnowledgeGraphError(context: string, error: unknown) {
  if (error instanceof KnowledgeGraphUnavailableError) {
    console.error("[kg] positioning unavailable", {
      kind: error.kind,
      route: context,
      cause: error.cause ?? error,
    });
    return;
  }
  console.error(`[${context}]`, error);
}
