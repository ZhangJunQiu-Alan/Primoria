import { NextResponse } from "next/server";
import { z } from "zod";

import { searchKnowledgeGraphNodes } from "@/lib/knowledge-graph/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  query: z.string().min(1),
  graphId: z.string().min(1).optional(),
  topK: z.number().int().min(1).max(50).optional(),
  modelVersion: z.string().min(1).optional(),
});

function userFacingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (/Missing DATABASE_URL/i.test(message)) return "Knowledge graph database settings are missing.";
  if (/Missing OPENAI/i.test(message)) return "Embedding provider settings are missing.";
  if (/Embedding request failed|fetch failed|timeout|network/i.test(message)) {
    return "The embedding provider could not complete this search. Please retry.";
  }

  return "Knowledge graph search failed. Please retry.";
}

export async function POST(request: Request) {
  try {
    const body = RequestSchema.parse(await request.json());
    const result = await searchKnowledgeGraphNodes(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[knowledge-graph/search]", error);
    return NextResponse.json({ error: userFacingError(error) }, { status: 503 });
  }
}
