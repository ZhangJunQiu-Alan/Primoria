import { detectKgLanguage, resolveKgDisplayName } from "@/lib/knowledge-graph/display-name";
import { positionLearningGoal } from "@/lib/knowledge-graph/position-learning-goal";
import { getTopicGraph } from "@/lib/knowledge-graph/topic-graph";

export type OnboardingGoalAnchor = {
  graphId: string;
  startTopicId: string;
  targetConceptId: string | null;
  topicName: string;
  graphSubject: string;
  branch: "specific" | "subject_start";
  language: "zh" | "en";
};

function firstTopicInGraph(graphId: string) {
  const graph = getTopicGraph(graphId);
  const topic = [...graph.topics].sort((a, b) => a.defaultOrder - b.defaultOrder)[0];
  if (!topic) throw new Error("Selected knowledge graph has no topics.");
  return { graph, topic };
}

export async function resolveOnboardingGoalAnchor(query: string): Promise<OnboardingGoalAnchor> {
  const trimmed = query.trim();
  const language = detectKgLanguage(trimmed);
  const { result } = await positionLearningGoal({ query: trimmed, language });

  if (result.branch === "fallback") {
    throw new Error(result.message || "Please enter a more specific learning goal.");
  }

  if (result.branch === "specific" && result.startTopicId) {
    const graph = getTopicGraph(result.graphId);
    const topic = graph.topics.find((entry) => entry.topicId === result.startTopicId);
    return {
      graphId: result.graphId,
      startTopicId: result.startTopicId,
      targetConceptId: result.targetConceptId ?? null,
      topicName: topic ? resolveKgDisplayName(topic, language) : result.startTopicId,
      graphSubject: graph.subject,
      branch: "specific",
      language,
    };
  }

  const { graph, topic } = firstTopicInGraph(result.graphId);
  return {
    graphId: graph.graphId,
    startTopicId: topic.topicId,
    targetConceptId: null,
    topicName: resolveKgDisplayName(topic, language),
    graphSubject: graph.subject,
    branch: "subject_start",
    language,
  };
}
