import { GENERATED_GRAPH_PREFIX, getGeneratedGraphById } from "../knowledge-graph/generated-graph";
import { getTopicGraph, type TopicGraph } from "../knowledge-graph/topic-graph";
import { getMaterialGraph } from "../materials/material-graph-store";
import { isMaterialGraphId } from "../materials/types";

// The one place a course's graphId resolves to its TopicGraph: static library
// graphs, cross-user gen_* graphs, and owner-private mat_* graphs. mat_* graphs
// resolve only for their owner — a null owner (or another owner) reads as missing.
export async function resolveCourseTopicGraph(graphId: string, ownerId: string | null | undefined): Promise<TopicGraph | null> {
  if (isMaterialGraphId(graphId)) {
    if (!ownerId) return null;
    return (await getMaterialGraph(graphId, ownerId))?.graph ?? null;
  }
  if (graphId.startsWith(GENERATED_GRAPH_PREFIX)) return getGeneratedGraphById(graphId);
  try {
    return getTopicGraph(graphId);
  } catch {
    return null;
  }
}
