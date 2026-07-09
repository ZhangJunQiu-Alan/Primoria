import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  classifyKnowledgeGraphFailure,
  KnowledgeGraphUnavailableError,
  LearningGoalUserMessageError,
  toSafeKnowledgeGraphError,
} from "../src/lib/knowledge-graph/errors";
import { checkKnowledgeGraphHealth, type HealthQuery } from "../src/lib/knowledge-graph/health";
import { positionLearningGoal } from "../src/lib/knowledge-graph/position-learning-goal";

const RAW_SQL_MESSAGE = 'relation "public.kg_node_embeddings" does not exist';

function pgError(code: string, message = RAW_SQL_MESSAGE) {
  return Object.assign(new Error(message), { code });
}

describe("classifyKnowledgeGraphFailure", () => {
  it("classifies undefined table (42P01) as kg_schema_missing", () => {
    expect(classifyKnowledgeGraphFailure(pgError("42P01"))).toBe("kg_schema_missing");
  });

  it("classifies undefined column (42703) as kg_schema_drift", () => {
    expect(classifyKnowledgeGraphFailure(pgError("42703", 'column "embedding" does not exist'))).toBe(
      "kg_schema_drift",
    );
  });

  it("classifies connection failures as db_unavailable", () => {
    for (const code of ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EHOSTUNREACH", "57P01", "53300"]) {
      expect(classifyKnowledgeGraphFailure(pgError(code, "connect failed"))).toBe("db_unavailable");
    }
    expect(classifyKnowledgeGraphFailure(new Error("Missing DATABASE_URL"))).toBe("db_unavailable");
  });

  it("classifies embedding-provider shaped errors as embedding_unavailable", () => {
    expect(classifyKnowledgeGraphFailure(new Error("Missing OPENAI_API_KEY"))).toBe("embedding_unavailable");
    expect(classifyKnowledgeGraphFailure(new Error("Embedding request failed: 500"))).toBe("embedding_unavailable");
    expect(classifyKnowledgeGraphFailure(new Error("MiniMax embedding provider returned an empty vector"))).toBe(
      "embedding_unavailable",
    );
    expect(classifyKnowledgeGraphFailure(new TypeError("fetch failed"))).toBe("embedding_unavailable");
  });

  it("unwraps nested causes with structured codes", () => {
    const wrapped = new Error("query failed", { cause: pgError("42P01") });
    expect(classifyKnowledgeGraphFailure(wrapped)).toBe("kg_schema_missing");
  });

  it("returns unknown for everything else", () => {
    expect(classifyKnowledgeGraphFailure(new Error("boom"))).toBe("unknown");
    expect(classifyKnowledgeGraphFailure(null)).toBe("unknown");
    expect(classifyKnowledgeGraphFailure("boom")).toBe("unknown");
  });
});

describe("toSafeKnowledgeGraphError", () => {
  it("never returns raw SQL messages", () => {
    for (const error of [
      pgError("42P01"),
      new KnowledgeGraphUnavailableError("kg_schema_missing", pgError("42P01")),
      new Error(RAW_SQL_MESSAGE),
    ]) {
      const safe = toSafeKnowledgeGraphError(error);
      for (const leak of ["relation", "public.", "kg_node_embeddings", "SQL", "Postgres"]) {
        expect(safe.message).not.toContain(leak);
      }
    }
  });

  it("maps KnowledgeGraphUnavailableError to a stable 503 code", () => {
    const safe = toSafeKnowledgeGraphError(new KnowledgeGraphUnavailableError("db_unavailable"));
    expect(safe).toMatchObject({ status: 503, code: "knowledge_graph_unavailable" });
  });

  it("passes curated user messages through verbatim", () => {
    const safe = toSafeKnowledgeGraphError(new LearningGoalUserMessageError("请提供更具体的学习目标。"));
    expect(safe).toEqual({ status: 422, code: "learning_goal_rejected", message: "请提供更具体的学习目标。" });
  });

  it("applies caller fallbacks only on the generic branch", () => {
    const safe = toSafeKnowledgeGraphError(new Error("boom"), { status: 422, code: "x", message: "Retry." });
    expect(safe).toEqual({ status: 422, code: "x", message: "Retry." });
    const infra = toSafeKnowledgeGraphError(new KnowledgeGraphUnavailableError("unknown"), { status: 422 });
    expect(infra.status).toBe(503);
  });
});

describe("positionLearningGoal on KG infrastructure failure", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const gateDecision = {
    outcome: "out_of_library" as const,
    topic: "MCP 协议",
    message: "为你定制课程图谱",
  };

  it("throws KnowledgeGraphUnavailableError on missing KG table when the fallback flag is off", async () => {
    const searchKnowledgeGraphNodes = vi.fn(async () => {
      throw pgError("42P01");
    });
    const runFreeformGoalGate = vi.fn(async () => gateDecision);

    await expect(
      positionLearningGoal({ query: "我想学MCP" }, { searchKnowledgeGraphNodes, runFreeformGoalGate }),
    ).rejects.toMatchObject({ name: "KnowledgeGraphUnavailableError", kind: "kg_schema_missing" });
    expect(runFreeformGoalGate).not.toHaveBeenCalled();
  });

  it("degrades kg_schema_missing into the freeform gate only with the explicit flag", async () => {
    vi.stubEnv("PRIMORIA_ALLOW_KG_INFRA_FALLBACK", "1");
    const searchKnowledgeGraphNodes = vi.fn(async () => {
      throw pgError("42P01");
    });
    const runFreeformGoalGate = vi.fn(async () => gateDecision);

    const { result, search } = await positionLearningGoal(
      { query: "我想学MCP" },
      { searchKnowledgeGraphNodes, runFreeformGoalGate },
    );

    expect(runFreeformGoalGate).toHaveBeenCalledTimes(1);
    expect(result.branch).toBe("out_of_library");
    expect(search.results).toEqual([]);
  });

  it("never degrades db connection failures, even with the flag on", async () => {
    vi.stubEnv("PRIMORIA_ALLOW_KG_INFRA_FALLBACK", "1");
    const searchKnowledgeGraphNodes = vi.fn(async () => {
      throw pgError("ECONNREFUSED", "connect ECONNREFUSED 127.0.0.1:5432");
    });
    const runFreeformGoalGate = vi.fn(async () => gateDecision);

    await expect(
      positionLearningGoal({ query: "我想学MCP" }, { searchKnowledgeGraphNodes, runFreeformGoalGate }),
    ).rejects.toMatchObject({ name: "KnowledgeGraphUnavailableError", kind: "db_unavailable" });
    expect(runFreeformGoalGate).not.toHaveBeenCalled();
  });

  it("never degrades embedding provider failures, even with the flag on", async () => {
    vi.stubEnv("PRIMORIA_ALLOW_KG_INFRA_FALLBACK", "1");
    const searchKnowledgeGraphNodes = vi.fn(async () => {
      throw new Error("Missing OPENAI_API_KEY");
    });
    const runFreeformGoalGate = vi.fn(async () => gateDecision);

    await expect(
      positionLearningGoal({ query: "我想学MCP" }, { searchKnowledgeGraphNodes, runFreeformGoalGate }),
    ).rejects.toMatchObject({ name: "KnowledgeGraphUnavailableError", kind: "embedding_unavailable" });
    expect(runFreeformGoalGate).not.toHaveBeenCalled();
  });
});

describe("checkKnowledgeGraphHealth", () => {
  function queryReturning(regRow: Record<string, unknown>, seeded?: boolean): HealthQuery {
    return async (text: string) => {
      if (text.includes("to_regclass")) return { rows: [regRow] };
      return { rows: [{ seeded: seeded === true }] };
    };
  }

  it("reports ok when tables exist and embeddings are seeded", async () => {
    const health = await checkKnowledgeGraphHealth(
      queryReturning({ topics: true, concepts: true, embeddings_table: true }, true),
    );
    expect(health).toMatchObject({
      status: "ok",
      database: "ok",
      kg: { schema: "ok", embeddings: "ok" },
    });
    expect(health.kg.modelVersion).toBeTruthy();
  });

  it("reports degraded when a KG table is missing", async () => {
    const health = await checkKnowledgeGraphHealth(
      queryReturning({ topics: true, concepts: true, embeddings_table: false }),
    );
    expect(health).toMatchObject({ status: "degraded", database: "ok", kg: { schema: "missing" } });
  });

  it("reports degraded when embeddings are empty for the current model", async () => {
    const health = await checkKnowledgeGraphHealth(
      queryReturning({ topics: true, concepts: true, embeddings_table: true }, false),
    );
    expect(health).toMatchObject({ status: "degraded", kg: { schema: "ok", embeddings: "empty" } });
  });

  it("reports degraded schema drift on undefined-column errors", async () => {
    const health = await checkKnowledgeGraphHealth(async () => {
      throw Object.assign(new Error('column "embedding" does not exist'), { code: "42703" });
    });
    expect(health).toMatchObject({ status: "degraded", database: "ok", kg: { schema: "drift" } });
  });

  it("reports unhealthy when the database is unavailable", async () => {
    const health = await checkKnowledgeGraphHealth(async () => {
      throw Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" });
    });
    expect(health).toMatchObject({ status: "unhealthy", database: "unavailable" });
  });
});
