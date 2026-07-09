import { detectKgLanguage, resolveKgDisplayName } from "@/lib/knowledge-graph/display-name";
import { getOrCreateGeneratedGraph } from "@/lib/knowledge-graph/generated-graph";
import { planFromPositioning, positionLearningGoal } from "@/lib/knowledge-graph/position-learning-goal";
import { getTopicGraph } from "@/lib/knowledge-graph/topic-graph";

export type OnboardingGoalAnchor = {
  graphId: string;
  startTopicId: string;
  targetConceptId: string | null;
  topicName: string;
  graphSubject: string;
  branch: "specific" | "subject_start" | "directed" | "generated";
  language: "zh" | "en";
};

export type OnboardingClarify = {
  message: string;
  candidates: { graphId: string; subject: string; startTopicId: string }[];
  language: "zh" | "en";
};

export type OnboardingGoalResolution =
  | { kind: "anchor"; anchor: OnboardingGoalAnchor }
  | { kind: "clarify"; clarify: OnboardingClarify };

function firstTopicInGraph(graphId: string) {
  const graph = getTopicGraph(graphId);
  const topic = [...graph.topics].sort((a, b) => a.defaultOrder - b.defaultOrder)[0];
  if (!topic) throw new Error("Selected knowledge graph has no topics.");
  return { graph, topic };
}

// Commit a subject directly (chip click): start that graph from its root topic.
// Deterministic — no LLM, no recall.
function subjectStartAnchor(graphId: string, language: "zh" | "en"): OnboardingGoalAnchor {
  const { graph, topic } = firstTopicInGraph(graphId);
  return {
    graphId,
    startTopicId: topic.topicId,
    targetConceptId: null,
    topicName: resolveKgDisplayName(topic, language),
    graphSubject: graph.subject,
    branch: "subject_start",
    language,
  };
}

export async function resolveOnboardingGoalAnchor(
  query: string,
  opts: { graphId?: string } = {},
): Promise<OnboardingGoalResolution> {
  const trimmed = query.trim();
  const language = detectKgLanguage(trimmed);

  // Subject chip picked during clarification → commit that subject from its root.
  if (opts.graphId) {
    return { kind: "anchor", anchor: subjectStartAnchor(opts.graphId, language) };
  }

  const { result } = await positionLearningGoal({ query: trimmed, language });
  const plan = planFromPositioning(result);

  if (plan.branch === "fallback") {
    throw new Error(plan.message || "Please enter a more specific learning goal.");
  }

  // Out-of-library goal: same path as the Home input — reuse or generate a
  // gen_* topic graph and anchor the onboarding course at its root.
  if (plan.branch === "out_of_library") {
    const generated = await getOrCreateGeneratedGraph({ topic: plan.topic, language });
    if (!generated) {
      throw new Error(plan.message || "暂时无法为这个主题生成课程，请换个说法再试一次。");
    }
    const root = [...generated.graph.topics].sort((a, b) => a.defaultOrder - b.defaultOrder)[0];
    if (!root) throw new Error("Generated graph has no topics.");
    return {
      kind: "anchor",
      anchor: {
        graphId: generated.graph.graphId,
        startTopicId: root.topicId,
        targetConceptId: null,
        topicName: resolveKgDisplayName(root, language),
        graphSubject: generated.graph.subject,
        branch: "generated",
        language,
      },
    };
  }

  if (plan.branch === "clarify_subject") {
    return {
      kind: "clarify",
      clarify: { message: plan.message, candidates: plan.candidates, language },
    };
  }

  const { courseContext, mode } = plan;
  const graph = getTopicGraph(courseContext.graphId);
  return {
    kind: "anchor",
    anchor: {
      graphId: courseContext.graphId,
      startTopicId: courseContext.startTopic.topicId,
      targetConceptId: courseContext.targetConceptId ?? null,
      topicName: courseContext.startTopic.name || courseContext.startTopic.topicId,
      graphSubject: graph.subject,
      branch: mode,
      language,
    },
  };
}
