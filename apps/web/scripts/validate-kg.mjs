#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { KG_SOURCE_DIR, REPO_ROOT, graphPath, listGraphIds } from "./kg-db-common.mjs";

const SCHEMA_DIR = resolve(REPO_ROOT, "data/knowledge-graphs/schema");
const GOVERNANCE_DIR = resolve(REPO_ROOT, "data/knowledge-graphs/governance");
const FULLTEXT_DIR = resolve(REPO_ROOT, "data/knowledge-graphs/sources/fulltext");
const CURRICULUM_FRAMEWORK_DIR = resolve(REPO_ROOT, "data/knowledge-graphs/curricula/frameworks");
const CURRICULUM_MAPPING_DIR = resolve(REPO_ROOT, "data/knowledge-graphs/curricula/mappings");
const CURRICULUM_GAP_DIR = resolve(REPO_ROOT, "data/knowledge-graphs/curricula/gaps");
const CURRICULUM_RESOLUTION_DIR = resolve(REPO_ROOT, "data/knowledge-graphs/curricula/resolutions");
const CURRICULUM_PRACTICE_DIR = resolve(REPO_ROOT, "data/knowledge-graphs/pedagogy/practices");
const PEDAGOGY_PROFILE_DIR = resolve(REPO_ROOT, "data/knowledge-graphs/pedagogy/core");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateGraphSchema = ajv.compile(readJson(resolve(SCHEMA_DIR, "graph-source-v2.schema.json")));
const validateSourceRegistrySchema = ajv.compile(readJson(resolve(SCHEMA_DIR, "source-registry.schema.json")));
const validateConceptRegistrySchema = ajv.compile(readJson(resolve(SCHEMA_DIR, "concept-registry.schema.json")));
const validateCrossEdgesSchema = ajv.compile(readJson(resolve(SCHEMA_DIR, "cross-subject-edges-v2.schema.json")));
const validateReviewDecisionsSchema = ajv.compile(readJson(resolve(SCHEMA_DIR, "review-decisions.schema.json")));
const validateCurriculumFrameworkSchema = ajv.compile(
  readJson(resolve(SCHEMA_DIR, "curriculum-framework.schema.json")),
);
const validateCurriculumMappingsSchema = ajv.compile(
  readJson(resolve(SCHEMA_DIR, "curriculum-concept-mappings.schema.json")),
);
const validateCurriculumGapCandidatesSchema = ajv.compile(
  readJson(resolve(SCHEMA_DIR, "curriculum-gap-candidates.schema.json")),
);
const validateCurriculumGapResolutionsSchema = ajv.compile(
  readJson(resolve(SCHEMA_DIR, "curriculum-gap-resolutions.schema.json")),
);
const validateCurriculumPracticeKnowledgeSchema = ajv.compile(
  readJson(resolve(SCHEMA_DIR, "curriculum-practice-knowledge.schema.json")),
);
const validatePedagogicalProfileSetSchema = ajv.compile(
  readJson(resolve(SCHEMA_DIR, "pedagogical-profile-set.schema.json")),
);

function schemaErrors(validator) {
  return (validator.errors ?? []).map(
    (error) => `${error.instancePath || "/"} ${error.message}${error.params ? ` ${JSON.stringify(error.params)}` : ""}`,
  );
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function listJsonFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return listJsonFiles(path);
      return entry.isFile() && entry.name.endsWith(".json") ? [path] : [];
    })
    .sort();
}

function reviewTargetKey(targetType, targetId) {
  return `${targetType}:${targetId}`;
}

function buildReviewTargets(
  graphsById,
  conceptRegistry,
  cross,
  curriculumFrameworks,
  curriculumMappingSets,
  curriculumGapSets,
  curriculumResolutionSets,
  curriculumPracticeSets,
  pedagogyProfileSets,
) {
  const targets = new Map();
  for (const [graphId, graph] of graphsById) {
    targets.set(reviewTargetKey("graph", graphId), graph.review_status);
    for (const node of graph.nodes) {
      targets.set(reviewTargetKey("node", `${graphId}:${node.id}`), node.review_status);
    }
    for (const edge of graph.edges) {
      targets.set(reviewTargetKey("edge", `${graphId}:${edge.from}->${edge.to}`), edge.review_status);
    }
  }
  for (const concept of conceptRegistry.concepts) {
    targets.set(reviewTargetKey("canonical_concept", concept.canonical_id), concept.review_status);
  }
  targets.set(reviewTargetKey("cross_graph", "cross_subject_edges"), cross.review_status);
  for (const edge of cross.edges) {
    const fromGraphId = edge.from_graph.replace(/\.json$/, "");
    const toGraphId = edge.to_graph.replace(/\.json$/, "");
    targets.set(
      reviewTargetKey("cross_edge", `${fromGraphId}:${edge.from}->${toGraphId}:${edge.to}`),
      edge.review_status,
    );
  }
  for (const framework of curriculumFrameworks) {
    targets.set(reviewTargetKey("curriculum_framework", framework.framework_id), framework.review_status);
    for (const requirement of framework.requirements ?? []) {
      targets.set(
        reviewTargetKey("curriculum_requirement", requirement.requirement_id),
        requirement.review_status,
      );
    }
  }
  for (const mappingSet of curriculumMappingSets) {
    targets.set(reviewTargetKey("curriculum_mapping_set", mappingSet.mapping_set_id), mappingSet.review_status);
    for (const mapping of mappingSet.mappings ?? []) {
      targets.set(reviewTargetKey("curriculum_mapping", mapping.mapping_id), mapping.review_status);
    }
  }
  for (const gapSet of curriculumGapSets) {
    targets.set(reviewTargetKey("curriculum_gap_set", gapSet.gap_set_id), gapSet.review_status);
    for (const candidate of gapSet.candidates ?? []) {
      targets.set(reviewTargetKey("curriculum_gap_candidate", candidate.gap_id), candidate.review_status);
    }
  }
  for (const resolutionSet of curriculumResolutionSets) {
    targets.set(
      reviewTargetKey("curriculum_gap_resolution_set", resolutionSet.resolution_set_id),
      resolutionSet.review_status,
    );
    for (const resolution of resolutionSet.resolutions ?? []) {
      targets.set(
        reviewTargetKey("curriculum_gap_resolution", `${resolutionSet.resolution_set_id}:${resolution.gap_id}`),
        resolution.review_status,
      );
    }
  }
  for (const practiceSet of curriculumPracticeSets) {
    targets.set(
      reviewTargetKey("curriculum_practice_set", practiceSet.practice_set_id),
      practiceSet.review_status,
    );
    for (const item of practiceSet.items ?? []) {
      targets.set(reviewTargetKey("curriculum_practice_item", item.practice_id), item.review_status);
    }
  }
  for (const profileSet of pedagogyProfileSets) {
    targets.set(reviewTargetKey("pedagogy_profile_set", profileSet.profile_set_id), profileSet.review_status);
    for (const profile of profileSet.profiles ?? []) {
      targets.set(reviewTargetKey("pedagogy_profile", profile.profile_id), profile.review_status);
      for (const item of profile.misconception_candidates ?? []) {
        targets.set(reviewTargetKey("pedagogy_misconception", item.misconception_id), item.review_status);
      }
      for (const item of profile.instructional_strategies ?? []) {
        targets.set(reviewTargetKey("pedagogy_instructional_strategy", item.strategy_id), item.review_status);
      }
      for (const item of profile.assessment_probes ?? []) {
        targets.set(reviewTargetKey("pedagogy_assessment_probe", item.probe_id), item.review_status);
      }
    }
  }
  return targets;
}

function validateReviewDecisions(registry, policy, sourceById, contentTargets) {
  const errors = [];
  if (!validateReviewDecisionsSchema(registry)) errors.push(...schemaErrors(validateReviewDecisionsSchema));
  for (const decisionId of duplicateValues(registry.decisions.map((decision) => decision.decision_id))) {
    errors.push(`duplicate decision_id: ${decisionId}`);
  }
  const latestByTarget = new Map();
  for (const decision of registry.decisions) {
    const allowed = policy.allowed_transitions[decision.from_status] ?? [];
    if (!allowed.includes(decision.to_status)) {
      errors.push(`${decision.decision_id}: transition ${decision.from_status} -> ${decision.to_status} is not allowed`);
    }
    for (const ref of decision.evidence_refs) {
      if (!sourceById.has(ref.source_id)) errors.push(`${decision.decision_id}: unknown evidence source ${ref.source_id}`);
    }
    const key = reviewTargetKey(decision.target_type, decision.target_id);
    if (!contentTargets.has(key)) errors.push(`${decision.decision_id}: target does not exist: ${key}`);
    const current = latestByTarget.get(key);
    if (!current || `${decision.reviewed_at}:${decision.decision_id}` > `${current.reviewed_at}:${current.decision_id}`) {
      latestByTarget.set(key, decision);
    }
  }
  const auditedStates = new Set(["approved", "rejected", "superseded"]);
  for (const [key, status] of contentTargets) {
    const latest = latestByTarget.get(key);
    if (auditedStates.has(status) && !latest) errors.push(`${key}: ${status} requires a human review decision`);
    else if (latest && latest.to_status !== status) {
      errors.push(`${key}: status ${status} differs from latest decision ${latest.to_status}`);
    }
  }
  return errors;
}

function assertAcyclic(conceptIds, edges) {
  const outgoing = new Map(conceptIds.map((id) => [id, []]));
  const indegree = new Map(conceptIds.map((id) => [id, 0]));
  for (const edge of edges) {
    if (!outgoing.has(edge.from) || !indegree.has(edge.to)) continue;
    outgoing.get(edge.from).push(edge.to);
    indegree.set(edge.to, indegree.get(edge.to) + 1);
  }
  const queue = conceptIds.filter((id) => indegree.get(id) === 0);
  let seen = 0;
  while (queue.length > 0) {
    const id = queue.shift();
    seen += 1;
    for (const next of outgoing.get(id)) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  return seen === conceptIds.length;
}

function validateSourceRegistry(registry) {
  const errors = [];
  if (!validateSourceRegistrySchema(registry)) errors.push(...schemaErrors(validateSourceRegistrySchema));
  const duplicateIds = duplicateValues(registry.sources.map((source) => source.source_id));
  for (const sourceId of duplicateIds) errors.push(`duplicate source_id: ${sourceId}`);
  for (const source of registry.sources) {
    if (source.verification_status === "verified" && !source.sha256) {
      errors.push(`${source.source_id}: verified source requires sha256`);
    }
    if (source.storage_policy === "metadata_only" && source.rights.fulltext) {
      errors.push(`${source.source_id}: metadata_only source cannot grant fulltext storage`);
    }
    if (source.storage_policy === "licensed_fulltext" && !source.rights.fulltext) {
      errors.push(`${source.source_id}: licensed_fulltext requires fulltext right`);
    }
    if (source.verification_status === "verified" && source.license_expression === "LicenseRef-Unverified-MetadataOnly") {
      errors.push(`${source.source_id}: verified source cannot use unverified license expression`);
    }
  }
  if (existsSync(FULLTEXT_DIR)) {
    const allowed = new Set(
      registry.sources.filter((source) => source.storage_policy === "licensed_fulltext").map((source) => source.source_id),
    );
    for (const entry of readdirSync(FULLTEXT_DIR, { withFileTypes: true })) {
      if (!allowed.has(entry.name)) errors.push(`fulltext/${entry.name}: source is not licensed for fulltext storage`);
    }
  }
  return errors;
}

function validateGraph(graphId, graph, sourceById) {
  const errors = [];
  const warnings = [];
  if (!validateGraphSchema(graph)) errors.push(...schemaErrors(validateGraphSchema));
  if (graph.graph_id !== graphId) errors.push(`graph_id must match filename: ${graph.graph_id} != ${graphId}`);
  if (!graph.changelog.some((entry) => entry.version === graph.content_version)) {
    errors.push(`content_version ${graph.content_version} is missing from changelog`);
  }
  for (const sourceId of graph.source_ids) {
    if (!sourceById.has(sourceId)) errors.push(`unknown source_id: ${sourceId}`);
  }

  const ids = new Set();
  const topicIds = new Set();
  const conceptIds = new Set();
  const canonicalIds = new Set();
  const conceptsByTopic = new Map();
  const topicOrders = [];
  for (const node of graph.nodes) {
    if (ids.has(node.id)) errors.push(`duplicate node id: ${node.id}`);
    ids.add(node.id);
    if (node.kind === "topic") {
      topicIds.add(node.id);
      topicOrders.push(node.default_order);
    } else {
      conceptIds.add(node.id);
      if (canonicalIds.has(node.canonical_id)) errors.push(`duplicate canonical_id inside graph: ${node.canonical_id}`);
      canonicalIds.add(node.canonical_id);
      if (!conceptsByTopic.has(node.topic)) conceptsByTopic.set(node.topic, []);
      conceptsByTopic.get(node.topic).push(node);
    }
    const evidenceRefs = node.evidence_refs ?? [];
    for (const ref of evidenceRefs) {
      if (!graph.source_ids.includes(ref.source_id)) {
        errors.push(`${node.id}: evidence source ${ref.source_id} is not declared by graph`);
      }
    }
    if (node.review_status === "approved" && evidenceRefs.length === 0) {
      errors.push(`${node.id}: approved node requires evidence_refs`);
    }
  }
  for (const order of duplicateValues(topicOrders)) errors.push(`duplicate topic default_order: ${order}`);
  for (const topicId of topicIds) {
    const concepts = conceptsByTopic.get(topicId) ?? [];
    if (concepts.length < 2 || concepts.length > 3) {
      errors.push(`topic ${topicId} must contain 2-3 concepts (found ${concepts.length})`);
    }
    for (const order of duplicateValues(concepts.map((node) => node.default_order))) {
      errors.push(`topic ${topicId} has duplicate concept default_order: ${order}`);
    }
  }
  for (const node of graph.nodes) {
    if (node.kind === "concept" && !topicIds.has(node.topic)) {
      errors.push(`concept ${node.id} references missing topic ${node.topic}`);
    }
  }

  const edgeKeys = new Set();
  const incoming = new Set();
  for (const edge of graph.edges) {
    const key = `${edge.from}|${edge.to}|${edge.type}`;
    if (edgeKeys.has(key)) errors.push(`duplicate edge: ${key}`);
    edgeKeys.add(key);
    if (edge.from === edge.to) errors.push(`self-loop edge: ${edge.from}`);
    if (!conceptIds.has(edge.from)) errors.push(`edge from missing concept ${edge.from}`);
    if (!conceptIds.has(edge.to)) errors.push(`edge to missing concept ${edge.to}`);
    if (conceptIds.has(edge.to)) incoming.add(edge.to);
    const evidenceRefs = edge.evidence_refs ?? [];
    for (const ref of evidenceRefs) {
      if (!graph.source_ids.includes(ref.source_id)) {
        errors.push(`edge ${edge.from}->${edge.to}: evidence source ${ref.source_id} is not declared by graph`);
      }
    }
    if (edge.review_status === "approved" && evidenceRefs.length === 0) {
      errors.push(`edge ${edge.from}->${edge.to}: approved edge requires evidence_refs`);
    }
  }
  if (!assertAcyclic([...conceptIds], graph.edges)) errors.push("prerequisite graph contains a cycle");
  const rootCount = [...conceptIds].filter((id) => !incoming.has(id)).length;
  if (rootCount > Math.max(5, Math.ceil(conceptIds.size * 0.15))) {
    warnings.push(`${rootCount}/${conceptIds.size} concepts are graph roots; review entry-point coverage`);
  }
  return { errors, warnings };
}

function validateConceptRegistry(registry, graphsById) {
  const errors = [];
  if (!validateConceptRegistrySchema(registry)) errors.push(...schemaErrors(validateConceptRegistrySchema));
  const canonicalIds = new Set();
  const aliasKeys = new Set();
  const registryByAlias = new Map();
  for (const concept of registry.concepts) {
    if (canonicalIds.has(concept.canonical_id)) errors.push(`duplicate registry canonical_id: ${concept.canonical_id}`);
    canonicalIds.add(concept.canonical_id);
    for (const alias of concept.aliases) {
      const key = `${alias.graph_id}|${alias.node_id}`;
      if (aliasKeys.has(key)) errors.push(`duplicate registry alias: ${key}`);
      aliasKeys.add(key);
      registryByAlias.set(key, concept.canonical_id);
      const graph = graphsById.get(alias.graph_id);
      const node = graph?.nodes.find((candidate) => candidate.id === alias.node_id && candidate.kind === "concept");
      if (!node) errors.push(`${key}: alias target does not exist`);
      else if (node.canonical_id !== concept.canonical_id) {
        errors.push(`${key}: graph canonical_id ${node.canonical_id} differs from registry ${concept.canonical_id}`);
      }
    }
  }
  for (const [graphId, graph] of graphsById) {
    for (const node of graph.nodes) {
      if (node.kind !== "concept") continue;
      const key = `${graphId}|${node.id}`;
      if (!registryByAlias.has(key)) errors.push(`${key}: missing reverse alias in concept registry`);
    }
  }
  for (const redirect of registry.redirects) {
    if (redirect.from_canonical_id === redirect.to_canonical_id) {
      errors.push(`${redirect.from_canonical_id}: canonical redirect cannot target itself`);
    }
    if (!canonicalIds.has(redirect.to_canonical_id)) {
      errors.push(`${redirect.from_canonical_id}: redirect target ${redirect.to_canonical_id} does not exist`);
    }
  }
  return errors;
}

function validateCrossEdges(cross, graphsById, sourceById) {
  const errors = [];
  if (!validateCrossEdgesSchema(cross)) errors.push(...schemaErrors(validateCrossEdgesSchema));
  if (!cross.changelog.some((entry) => entry.version === cross.content_version)) {
    errors.push(`cross edges content_version ${cross.content_version} is missing from changelog`);
  }
  for (const sourceId of cross.source_ids) {
    if (!sourceById.has(sourceId)) errors.push(`cross edges unknown source_id: ${sourceId}`);
  }
  const keys = new Set();
  for (const edge of cross.edges) {
    const fromGraphId = edge.from_graph.replace(/\.json$/, "");
    const toGraphId = edge.to_graph.replace(/\.json$/, "");
    const fromNode = graphsById.get(fromGraphId)?.nodes.find((node) => node.kind === "concept" && node.id === edge.from);
    const toNode = graphsById.get(toGraphId)?.nodes.find((node) => node.kind === "concept" && node.id === edge.to);
    if (!fromNode) errors.push(`cross edge from missing concept ${fromGraphId}:${edge.from}`);
    if (!toNode) errors.push(`cross edge to missing concept ${toGraphId}:${edge.to}`);
    const key = `${fromGraphId}|${edge.from}|${toGraphId}|${edge.to}|${edge.type}`;
    if (keys.has(key)) errors.push(`duplicate cross edge: ${key}`);
    keys.add(key);
    for (const ref of edge.evidence_refs ?? []) {
      if (!cross.source_ids.includes(ref.source_id)) {
        errors.push(`cross edge ${edge.from}->${edge.to}: undeclared evidence source ${ref.source_id}`);
      }
    }
    if (edge.review_status === "approved" && (edge.evidence_refs ?? []).length === 0) {
      errors.push(`cross edge ${edge.from}->${edge.to}: approved edge requires evidence_refs`);
    }
  }
  return errors;
}

function validateCurriculumFramework(framework, sourceById) {
  const errors = [];
  if (!validateCurriculumFrameworkSchema(framework)) {
    errors.push(...schemaErrors(validateCurriculumFrameworkSchema));
  }
  if (!framework.changelog?.some((entry) => entry.version === framework.content_version)) {
    errors.push(`content_version ${framework.content_version} is missing from changelog`);
  }
  for (const sourceId of framework.source_ids ?? []) {
    if (!sourceById.has(sourceId)) errors.push(`unknown source_id: ${sourceId}`);
  }

  const levels = new Set((framework.levels ?? []).map((level) => level.level_id));
  const requirements = framework.requirements ?? [];
  const requirementIds = new Set(requirements.map((requirement) => requirement.requirement_id));
  for (const duplicate of duplicateValues(requirements.map((requirement) => requirement.requirement_id))) {
    errors.push(`duplicate requirement_id: ${duplicate}`);
  }
  for (const duplicate of duplicateValues(requirements.map((requirement) => requirement.code))) {
    errors.push(`duplicate requirement code: ${duplicate}`);
  }
  for (const requirement of requirements) {
    if (requirement.parent_requirement_id && !requirementIds.has(requirement.parent_requirement_id)) {
      errors.push(`${requirement.requirement_id}: missing parent ${requirement.parent_requirement_id}`);
    }
    if (!levels.has(requirement.level_id)) {
      errors.push(`${requirement.requirement_id}: unknown level_id ${requirement.level_id}`);
    }
    for (const ref of requirement.evidence_refs ?? []) {
      if (!framework.source_ids?.includes(ref.source_id)) {
        errors.push(`${requirement.requirement_id}: undeclared evidence source ${ref.source_id}`);
      }
      if (!sourceById.has(ref.source_id)) {
        errors.push(`${requirement.requirement_id}: unknown evidence source ${ref.source_id}`);
      }
    }
    if (requirement.review_status === "approved" && (requirement.evidence_refs ?? []).length === 0) {
      errors.push(`${requirement.requirement_id}: approved requirement requires evidence_refs`);
    }
    if (
      framework.requirement_granularity === "outcome" &&
      !(requirement.evidence_refs ?? []).every((ref) => /PDF p\.\d/.test(ref.locator))
    ) {
      errors.push(`${requirement.requirement_id}: outcome evidence requires an exact PDF page locator`);
    }
  }
  for (const exclusion of framework.scope_exclusions ?? []) {
    for (const ref of exclusion.evidence_refs ?? []) {
      if (!framework.source_ids?.includes(ref.source_id)) {
        errors.push(`scope exclusion ${exclusion.scope}: undeclared evidence source ${ref.source_id}`);
      }
      if (!sourceById.has(ref.source_id)) {
        errors.push(`scope exclusion ${exclusion.scope}: unknown evidence source ${ref.source_id}`);
      }
    }
  }
  return errors;
}

function validateCurriculumMappingSet(mappingSet, frameworkById, sourceById, canonicalIds) {
  const errors = [];
  if (!validateCurriculumMappingsSchema(mappingSet)) {
    errors.push(...schemaErrors(validateCurriculumMappingsSchema));
  }
  if (!mappingSet.changelog?.some((entry) => entry.version === mappingSet.content_version)) {
    errors.push(`content_version ${mappingSet.content_version} is missing from changelog`);
  }
  for (const sourceId of mappingSet.source_ids ?? []) {
    if (!sourceById.has(sourceId)) errors.push(`unknown source_id: ${sourceId}`);
  }

  const framework = frameworkById.get(mappingSet.framework_id);
  if (!framework) {
    errors.push(`unknown framework_id: ${mappingSet.framework_id}`);
    return errors;
  }
  if (mappingSet.curriculum_id !== framework.curriculum_id) {
    errors.push(`curriculum_id ${mappingSet.curriculum_id} differs from framework ${framework.curriculum_id}`);
  }
  if (mappingSet.subject !== framework.subject) {
    errors.push(`subject ${mappingSet.subject} differs from framework subject ${framework.subject}`);
  }
  if (mappingSet.mapping_scope === "outcome_coverage" && framework.requirement_granularity !== "outcome") {
    errors.push(
      `outcome_coverage requires outcome-granularity requirements; found ${framework.requirement_granularity}`,
    );
  }
  for (const sourceId of framework.source_ids) {
    if (!mappingSet.source_ids?.includes(sourceId)) {
      errors.push(`mapping set does not declare framework source ${sourceId}`);
    }
  }
  const requirementById = new Map(
    framework.requirements.map((requirement) => [requirement.requirement_id, requirement]),
  );
  const requirements = new Set(requirementById.keys());
  const mappings = mappingSet.mappings ?? [];
  for (const duplicate of duplicateValues(mappings.map((mapping) => mapping.mapping_id))) {
    errors.push(`duplicate mapping_id: ${duplicate}`);
  }
  for (const duplicate of duplicateValues(mappings.map((mapping) => mapping.requirement_id))) {
    errors.push(`requirement has multiple mappings: ${duplicate}`);
  }
  const mappedRequirementIds = new Set(mappings.map((mapping) => mapping.requirement_id));
  for (const requirementId of requirements) {
    if (!mappedRequirementIds.has(requirementId)) errors.push(`missing mapping for requirement ${requirementId}`);
  }
  for (const mapping of mappings) {
    if (!requirements.has(mapping.requirement_id)) {
      errors.push(`${mapping.mapping_id}: unknown requirement ${mapping.requirement_id}`);
    }
    for (const canonicalId of mapping.canonical_ids ?? []) {
      if (!canonicalIds.has(canonicalId)) {
        errors.push(`${mapping.mapping_id}: unknown canonical_id ${canonicalId}`);
      }
    }
    for (const ref of mapping.evidence_refs ?? []) {
      if (!mappingSet.source_ids?.includes(ref.source_id)) {
        errors.push(`${mapping.mapping_id}: undeclared evidence source ${ref.source_id}`);
      }
      if (!sourceById.has(ref.source_id)) {
        errors.push(`${mapping.mapping_id}: unknown evidence source ${ref.source_id}`);
      }
    }
    if (mapping.review_status === "approved" && (mapping.evidence_refs ?? []).length === 0) {
      errors.push(`${mapping.mapping_id}: approved mapping requires evidence_refs`);
    }
    if (mappingSet.mapping_scope === "topic_alignment" && mapping.coverage_status === "full") {
      errors.push(`${mapping.mapping_id}: topic_alignment cannot claim full outcome coverage`);
    }
    if (mappingSet.mapping_scope === "outcome_coverage") {
      const requirementEvidence = JSON.stringify(
        requirementById.get(mapping.requirement_id)?.evidence_refs ?? [],
      );
      if (JSON.stringify(mapping.evidence_refs ?? []) !== requirementEvidence) {
        errors.push(`${mapping.mapping_id}: outcome mapping evidence must match its requirement evidence`);
      }
    }
  }
  return errors;
}

function validateCurriculumGapSet(
  gapSet,
  frameworkById,
  mappingSetByFrameworkId,
  resolutionSetByGapSetId,
  sourceById,
  canonicalIds,
) {
  const errors = [];
  if (!validateCurriculumGapCandidatesSchema(gapSet)) {
    errors.push(...schemaErrors(validateCurriculumGapCandidatesSchema));
  }
  if (!gapSet.changelog?.some((entry) => entry.version === gapSet.content_version)) {
    errors.push(`content_version ${gapSet.content_version} is missing from changelog`);
  }
  const framework = frameworkById.get(gapSet.framework_id);
  if (!framework) {
    errors.push(`unknown framework_id: ${gapSet.framework_id}`);
    return errors;
  }
  if (gapSet.curriculum_id !== framework.curriculum_id) {
    errors.push(`curriculum_id ${gapSet.curriculum_id} differs from framework ${framework.curriculum_id}`);
  }
  if (gapSet.subject !== framework.subject) {
    errors.push(`subject ${gapSet.subject} differs from framework subject ${framework.subject}`);
  }
  const mappingSet = mappingSetByFrameworkId.get(gapSet.framework_id);
  if (!mappingSet || mappingSet.mapping_scope !== "outcome_coverage") {
    errors.push(`framework ${gapSet.framework_id} requires an outcome_coverage mapping set`);
    return errors;
  }
  for (const sourceId of gapSet.source_ids ?? []) {
    if (!sourceById.has(sourceId)) errors.push(`unknown source_id: ${sourceId}`);
    if (!framework.source_ids.includes(sourceId)) {
      errors.push(`gap set source ${sourceId} is not declared by framework`);
    }
  }

  const requirementIds = new Set(framework.requirements.map((requirement) => requirement.requirement_id));
  const mappingByRequirement = new Map(
    mappingSet.mappings.map((mapping) => [mapping.requirement_id, mapping]),
  );
  const hasResolutionSet = resolutionSetByGapSetId.has(gapSet.gap_set_id);
  const expectedGapRequirements = new Set(
    hasResolutionSet
      ? (gapSet.candidates ?? []).flatMap((candidate) => candidate.requirement_ids ?? [])
      : mappingSet.mappings
        .filter((mapping) => ["partial", "unmapped"].includes(mapping.coverage_status))
        .map((mapping) => mapping.requirement_id),
  );
  const candidates = gapSet.candidates ?? [];
  for (const duplicate of duplicateValues(candidates.map((candidate) => candidate.gap_id))) {
    errors.push(`duplicate gap_id: ${duplicate}`);
  }
  const candidateRequirementIds = candidates.flatMap((candidate) => candidate.requirement_ids ?? []);
  for (const duplicate of duplicateValues(candidateRequirementIds)) {
    errors.push(`requirement has multiple gap candidates: ${duplicate}`);
  }
  const actualGapRequirements = new Set(candidateRequirementIds);
  for (const requirementId of expectedGapRequirements) {
    if (!actualGapRequirements.has(requirementId)) {
      errors.push(`missing gap candidate for ${requirementId}`);
    }
  }
  for (const requirementId of actualGapRequirements) {
    if (!expectedGapRequirements.has(requirementId)) {
      errors.push(`gap candidate targets fully covered or unknown requirement ${requirementId}`);
    }
  }
  for (const candidate of candidates) {
    const mappedCanonicalIds = new Set(
      candidate.requirement_ids.flatMap((requirementId) => {
        if (!requirementIds.has(requirementId)) {
          errors.push(`${candidate.gap_id}: unknown requirement ${requirementId}`);
        }
        return mappingByRequirement.get(requirementId)?.canonical_ids ?? [];
      }),
    );
    for (const canonicalId of candidate.existing_canonical_ids ?? []) {
      if (!canonicalIds.has(canonicalId)) errors.push(`${candidate.gap_id}: unknown canonical_id ${canonicalId}`);
      if (!hasResolutionSet && !mappedCanonicalIds.has(canonicalId)) {
        errors.push(`${candidate.gap_id}: canonical_id ${canonicalId} is not in the requirement mapping`);
      }
    }
    for (const ref of candidate.evidence_refs ?? []) {
      if (!gapSet.source_ids?.includes(ref.source_id)) {
        errors.push(`${candidate.gap_id}: undeclared evidence source ${ref.source_id}`);
      }
      if (!sourceById.has(ref.source_id)) {
        errors.push(`${candidate.gap_id}: unknown evidence source ${ref.source_id}`);
      }
    }
    const expectedEvidence = JSON.stringify(
      candidate.requirement_ids.flatMap(
        (requirementId) => framework.requirements.find(
          (requirement) => requirement.requirement_id === requirementId,
        )?.evidence_refs ?? [],
      ),
    );
    if (JSON.stringify(candidate.evidence_refs ?? []) !== expectedEvidence) {
      errors.push(`${candidate.gap_id}: gap evidence must match its requirement evidence`);
    }
  }
  return errors;
}

function validateCurriculumPracticeSet(practiceSet, frameworkById, sourceById) {
  const errors = [];
  if (!validateCurriculumPracticeKnowledgeSchema(practiceSet)) {
    errors.push(...schemaErrors(validateCurriculumPracticeKnowledgeSchema));
  }
  if (!practiceSet.changelog?.some((entry) => entry.version === practiceSet.content_version)) {
    errors.push(`content_version ${practiceSet.content_version} is missing from changelog`);
  }
  const framework = frameworkById.get(practiceSet.framework_id);
  if (!framework) {
    errors.push(`unknown framework_id: ${practiceSet.framework_id}`);
    return errors;
  }
  if (practiceSet.curriculum_id !== framework.curriculum_id) {
    errors.push(`curriculum_id ${practiceSet.curriculum_id} differs from framework ${framework.curriculum_id}`);
  }
  if (practiceSet.subject !== framework.subject) {
    errors.push(`subject ${practiceSet.subject} differs from framework subject ${framework.subject}`);
  }
  for (const sourceId of practiceSet.source_ids ?? []) {
    if (!sourceById.has(sourceId)) errors.push(`unknown source_id: ${sourceId}`);
  }
  const requirementIds = new Set(framework.requirements.map((requirement) => requirement.requirement_id));
  const items = practiceSet.items ?? [];
  for (const duplicate of duplicateValues(items.map((item) => item.practice_id))) {
    errors.push(`duplicate practice_id: ${duplicate}`);
  }
  for (const item of items) {
    for (const requirementId of item.requirement_ids ?? []) {
      if (!requirementIds.has(requirementId)) errors.push(`${item.practice_id}: unknown requirement ${requirementId}`);
    }
    for (const ref of item.evidence_refs ?? []) {
      if (!practiceSet.source_ids?.includes(ref.source_id)) {
        errors.push(`${item.practice_id}: undeclared evidence source ${ref.source_id}`);
      }
      if (!sourceById.has(ref.source_id)) errors.push(`${item.practice_id}: unknown evidence source ${ref.source_id}`);
    }
  }
  return errors;
}

function validatePedagogyProfileSet(profileSet, graphsById, sourceById, canonicalIds) {
  const errors = [];
  if (!validatePedagogicalProfileSetSchema(profileSet)) {
    errors.push(...schemaErrors(validatePedagogicalProfileSetSchema));
  }
  if (!profileSet.changelog?.some((entry) => entry.version === profileSet.content_version)) {
    errors.push(`content_version ${profileSet.content_version} is missing from changelog`);
  }
  for (const sourceId of profileSet.source_ids ?? []) {
    if (!sourceById.has(sourceId)) errors.push(`unknown source_id: ${sourceId}`);
  }
  const profiles = profileSet.profiles ?? [];
  for (const duplicate of duplicateValues(profiles.map((profile) => profile.profile_id))) {
    errors.push(`duplicate profile_id: ${duplicate}`);
  }
  for (const duplicate of duplicateValues(profiles.map((profile) => profile.canonical_id))) {
    errors.push(`canonical concept has multiple profiles in one set: ${duplicate}`);
  }

  const itemIds = [];
  for (const profile of profiles) {
    if (!canonicalIds.has(profile.canonical_id)) {
      errors.push(`${profile.profile_id}: unknown canonical_id ${profile.canonical_id}`);
    }
    const graph = graphsById.get(profile.graph_id);
    const node = graph?.nodes.find((candidate) => candidate.id === profile.node_id && candidate.kind === "concept");
    if (!node) errors.push(`${profile.profile_id}: unknown concept alias ${profile.graph_id}:${profile.node_id}`);
    else if (node.canonical_id !== profile.canonical_id) {
      errors.push(`${profile.profile_id}: canonical_id differs from ${profile.graph_id}:${profile.node_id}`);
    }
    if (graph && profile.subject !== graph.subject) {
      errors.push(`${profile.profile_id}: subject ${profile.subject} differs from graph subject ${graph.subject}`);
    }
    for (const jurisdiction of profile.jurisdictions ?? []) {
      if (!profileSet.jurisdictions?.includes(jurisdiction)) {
        errors.push(`${profile.profile_id}: undeclared jurisdiction ${jurisdiction}`);
      }
    }

    const misconceptionIds = new Set(
      (profile.misconception_candidates ?? []).map((item) => item.misconception_id),
    );
    const evidenceGroups = [
      [profile.profile_id, profile.evidence_refs ?? []],
      ...(profile.misconception_candidates ?? []).map((item) => [item.misconception_id, item.evidence_refs ?? []]),
      ...(profile.instructional_strategies ?? []).map((item) => [item.strategy_id, item.evidence_refs ?? []]),
      ...(profile.assessment_probes ?? []).map((item) => [item.probe_id, item.evidence_refs ?? []]),
    ];
    for (const [itemId, refs] of evidenceGroups) {
      itemIds.push(itemId);
      for (const ref of refs) {
        if (!profileSet.source_ids?.includes(ref.source_id)) {
          errors.push(`${itemId}: undeclared evidence source ${ref.source_id}`);
        }
        if (!sourceById.has(ref.source_id)) errors.push(`${itemId}: unknown evidence source ${ref.source_id}`);
      }
    }
    const evidenceTypes = new Set(
      (profile.evidence_refs ?? [])
        .map((ref) => sourceById.get(ref.source_id)?.resource_type)
        .filter(Boolean),
    );
    if (evidenceTypes.size < 2) {
      errors.push(`${profile.profile_id}: pedagogical profile requires two authoritative evidence types`);
    }
    for (const item of profile.misconception_candidates ?? []) {
      if (
        item.prevalence_basis === "diagnostic_hypothesis" &&
        /学生普遍|多数学生|大多数学生|常见误区/.test(item.statement_zh)
      ) {
        errors.push(`${item.misconception_id}: diagnostic hypothesis must not claim empirical prevalence`);
      }
      if (item.prevalence_basis === "empirically_documented") {
        const hasQualifiedEmpiricalSource = (item.evidence_refs ?? []).some((ref) => {
          const source = sourceById.get(ref.source_id);
          return source?.verification_status === "verified"
            && ["A", "B"].includes(source.authority_tier)
            && ["education_research", "examiner_report"].includes(source.resource_type);
        });
        if (!hasQualifiedEmpiricalSource) {
          errors.push(
            `${item.misconception_id}: empirically documented misconception requires a verified A/B education_research or examiner_report source`,
          );
        }
      }
    }
    for (const probe of profile.assessment_probes ?? []) {
      for (const misconceptionId of probe.targets_misconception_ids ?? []) {
        if (!misconceptionIds.has(misconceptionId)) {
          errors.push(`${probe.probe_id}: targets unknown profile misconception ${misconceptionId}`);
        }
      }
    }
  }
  for (const duplicate of duplicateValues(itemIds)) errors.push(`duplicate pedagogy item id: ${duplicate}`);
  return errors;
}

function validateCurriculumResolutionSet(
  resolutionSet,
  gapSetById,
  mappingSetByFrameworkId,
  practiceItemById,
  graphsById,
  sourceById,
  canonicalIds,
) {
  const errors = [];
  if (!validateCurriculumGapResolutionsSchema(resolutionSet)) {
    errors.push(...schemaErrors(validateCurriculumGapResolutionsSchema));
  }
  if (!resolutionSet.changelog?.some((entry) => entry.version === resolutionSet.content_version)) {
    errors.push(`content_version ${resolutionSet.content_version} is missing from changelog`);
  }
  const gapSet = gapSetById.get(resolutionSet.gap_set_id);
  if (!gapSet) {
    errors.push(`unknown gap_set_id: ${resolutionSet.gap_set_id}`);
    return errors;
  }
  for (const field of ["framework_id", "curriculum_id", "subject"]) {
    if (resolutionSet[field] !== gapSet[field]) {
      errors.push(`${field} ${resolutionSet[field]} differs from gap set ${gapSet[field]}`);
    }
  }
  for (const sourceId of resolutionSet.source_ids ?? []) {
    if (!sourceById.has(sourceId)) errors.push(`unknown source_id: ${sourceId}`);
  }

  const mappingSet = mappingSetByFrameworkId.get(resolutionSet.framework_id);
  if (!mappingSet || mappingSet.mapping_scope !== "outcome_coverage") {
    errors.push(`framework ${resolutionSet.framework_id} requires an outcome_coverage mapping set`);
    return errors;
  }
  const mappingByRequirement = new Map(
    mappingSet.mappings.map((mapping) => [mapping.requirement_id, mapping]),
  );
  const candidateByGapId = new Map(gapSet.candidates.map((candidate) => [candidate.gap_id, candidate]));
  const resolutions = resolutionSet.resolutions ?? [];
  for (const duplicate of duplicateValues(resolutions.map((resolution) => resolution.gap_id))) {
    errors.push(`duplicate gap resolution: ${duplicate}`);
  }
  const resolvedGapIds = new Set(resolutions.map((resolution) => resolution.gap_id));
  for (const gapId of candidateByGapId.keys()) {
    if (!resolvedGapIds.has(gapId)) errors.push(`missing resolution for ${gapId}`);
  }
  for (const gapId of resolvedGapIds) {
    if (!candidateByGapId.has(gapId)) errors.push(`resolution targets unknown gap ${gapId}`);
  }

  const nodeById = new Map();
  for (const [graphId, graph] of graphsById) {
    for (const node of graph.nodes.filter((candidate) => candidate.kind === "concept")) {
      nodeById.set(node.id, { graphId, node });
    }
  }

  for (const resolution of resolutions) {
    const candidate = candidateByGapId.get(resolution.gap_id);
    if (!candidate) continue;
    for (const ref of resolution.evidence_refs ?? []) {
      if (!resolutionSet.source_ids?.includes(ref.source_id)) {
        errors.push(`${resolution.gap_id}: undeclared evidence source ${ref.source_id}`);
      }
      if (!sourceById.has(ref.source_id)) errors.push(`${resolution.gap_id}: unknown evidence source ${ref.source_id}`);
    }
    for (const canonicalId of resolution.canonical_ids ?? []) {
      if (!canonicalIds.has(canonicalId)) errors.push(`${resolution.gap_id}: unknown canonical_id ${canonicalId}`);
    }
    const expectedCoverage = resolution.resolution_action === "route_practice" ? "excluded" : "full";
    for (const requirementId of candidate.requirement_ids) {
      const mapping = mappingByRequirement.get(requirementId);
      if (!mapping) {
        errors.push(`${resolution.gap_id}: missing mapping for ${requirementId}`);
        continue;
      }
      if (mapping.coverage_status !== expectedCoverage) {
        errors.push(`${resolution.gap_id}: mapping ${mapping.mapping_id} must be ${expectedCoverage}`);
      }
      const actualCanonicalIds = [...(mapping.canonical_ids ?? [])].sort();
      const expectedCanonicalIds = [...(resolution.canonical_ids ?? [])].sort();
      if (JSON.stringify(actualCanonicalIds) !== JSON.stringify(expectedCanonicalIds)) {
        errors.push(`${resolution.gap_id}: mapping canonical_ids differ from resolution`);
      }
    }
    if (resolution.resolution_action !== "route_practice") {
      const evidenceTypes = new Set(
        (resolution.evidence_refs ?? [])
          .map((ref) => sourceById.get(ref.source_id)?.resource_type)
          .filter(Boolean),
      );
      if (evidenceTypes.size < 2) {
        errors.push(`${resolution.gap_id}: knowledge resolution requires two authoritative evidence types`);
      }
    }
    for (const nodeId of resolution.created_node_ids ?? []) {
      const target = nodeById.get(nodeId);
      if (!target) {
        errors.push(`${resolution.gap_id}: created node does not exist: ${nodeId}`);
        continue;
      }
      if (candidate.suggested_graph_id && target.graphId !== candidate.suggested_graph_id) {
        errors.push(`${resolution.gap_id}: created node ${nodeId} is in ${target.graphId}, expected ${candidate.suggested_graph_id}`);
      }
      if (!resolution.canonical_ids.includes(target.node.canonical_id)) {
        errors.push(`${resolution.gap_id}: created node canonical_id is absent from resolution: ${nodeId}`);
      }
      const nodeEvidenceTypes = new Set(
        (target.node.evidence_refs ?? [])
          .map((ref) => sourceById.get(ref.source_id)?.resource_type)
          .filter(Boolean),
      );
      if (nodeEvidenceTypes.size < 2) {
        errors.push(`${resolution.gap_id}: created node ${nodeId} requires two authoritative evidence types`);
      }
    }
    for (const practiceId of resolution.practice_ids ?? []) {
      const item = practiceItemById.get(practiceId);
      if (!item) {
        errors.push(`${resolution.gap_id}: practice item does not exist: ${practiceId}`);
        continue;
      }
      for (const requirementId of candidate.requirement_ids) {
        if (!item.requirement_ids.includes(requirementId)) {
          errors.push(`${resolution.gap_id}: practice item ${practiceId} does not reference ${requirementId}`);
        }
      }
    }
  }
  return errors;
}

function main() {
  const arg = process.argv[2] || "all";
  const allGraphIds = listGraphIds();
  const requestedGraphIds = arg === "all" ? allGraphIds : [arg];
  for (const graphId of requestedGraphIds) {
    if (!allGraphIds.includes(graphId)) throw new Error(`Unknown graph_id: ${graphId}`);
  }

  const sourceRegistry = readJson(resolve(GOVERNANCE_DIR, "sources.json"));
  const conceptRegistry = readJson(resolve(GOVERNANCE_DIR, "concept-registry.json"));
  const reviewPolicy = readJson(resolve(GOVERNANCE_DIR, "review-policy.json"));
  const reviewDecisions = readJson(resolve(GOVERNANCE_DIR, "review-decisions.json"));
  const sourceById = new Map(sourceRegistry.sources.map((source) => [source.source_id, source]));
  const graphsById = new Map(allGraphIds.map((graphId) => [graphId, readJson(graphPath(graphId))]));
  const curriculumFrameworks = listJsonFiles(CURRICULUM_FRAMEWORK_DIR).map(readJson);
  const curriculumMappingSets = listJsonFiles(CURRICULUM_MAPPING_DIR).map(readJson);
  const curriculumGapSets = listJsonFiles(CURRICULUM_GAP_DIR).map(readJson);
  const curriculumResolutionSets = listJsonFiles(CURRICULUM_RESOLUTION_DIR).map(readJson);
  const curriculumPracticeSets = listJsonFiles(CURRICULUM_PRACTICE_DIR).map(readJson);
  const pedagogyProfileSets = listJsonFiles(PEDAGOGY_PROFILE_DIR).map(readJson);
  const frameworkById = new Map(
    curriculumFrameworks.map((framework) => [framework.framework_id, framework]),
  );
  const mappingSetByFrameworkId = new Map(
    curriculumMappingSets.map((mappingSet) => [mappingSet.framework_id, mappingSet]),
  );
  const gapSetById = new Map(curriculumGapSets.map((gapSet) => [gapSet.gap_set_id, gapSet]));
  const resolutionSetByGapSetId = new Map(
    curriculumResolutionSets.map((resolutionSet) => [resolutionSet.gap_set_id, resolutionSet]),
  );
  const practiceItems = curriculumPracticeSets.flatMap((practiceSet) => practiceSet.items ?? []);
  const practiceItemById = new Map(practiceItems.map((item) => [item.practice_id, item]));
  const canonicalIds = new Set(conceptRegistry.concepts.map((concept) => concept.canonical_id));
  const globalErrors = [
    ...validateSourceRegistry(sourceRegistry).map((error) => `sources: ${error}`),
    ...validateConceptRegistry(conceptRegistry, graphsById).map((error) => `concept-registry: ${error}`),
  ];

  for (const duplicate of duplicateValues(curriculumFrameworks.map((framework) => framework.framework_id))) {
    globalErrors.push(`curricula: duplicate framework_id ${duplicate}`);
  }
  for (const duplicate of duplicateValues(curriculumMappingSets.map((mappingSet) => mappingSet.mapping_set_id))) {
    globalErrors.push(`curricula: duplicate mapping_set_id ${duplicate}`);
  }
  for (const duplicate of duplicateValues(curriculumGapSets.map((gapSet) => gapSet.gap_set_id))) {
    globalErrors.push(`curricula: duplicate gap_set_id ${duplicate}`);
  }
  for (const duplicate of duplicateValues(
    curriculumResolutionSets.map((resolutionSet) => resolutionSet.resolution_set_id),
  )) {
    globalErrors.push(`curricula: duplicate resolution_set_id ${duplicate}`);
  }
  for (const duplicate of duplicateValues(
    curriculumResolutionSets.map((resolutionSet) => resolutionSet.gap_set_id),
  )) {
    globalErrors.push(`curricula: gap set has multiple resolution sets ${duplicate}`);
  }
  for (const duplicate of duplicateValues(
    curriculumPracticeSets.map((practiceSet) => practiceSet.practice_set_id),
  )) {
    globalErrors.push(`curricula: duplicate practice_set_id ${duplicate}`);
  }
  for (const duplicate of duplicateValues(practiceItems.map((item) => item.practice_id))) {
    globalErrors.push(`curricula: duplicate practice_id ${duplicate}`);
  }
  for (const duplicate of duplicateValues(pedagogyProfileSets.map((set) => set.profile_set_id))) {
    globalErrors.push(`pedagogy: duplicate profile_set_id ${duplicate}`);
  }
  for (const duplicate of duplicateValues(
    pedagogyProfileSets.flatMap((set) => (set.profiles ?? []).map((profile) => profile.profile_id)),
  )) {
    globalErrors.push(`pedagogy: duplicate global profile_id ${duplicate}`);
  }
  for (const framework of curriculumFrameworks) {
    const matchingSets = curriculumMappingSets.filter(
      (mappingSet) => mappingSet.framework_id === framework.framework_id,
    );
    if (matchingSets.length !== 1) {
      globalErrors.push(
        `curricula: ${framework.framework_id} requires exactly one current mapping set; found ${matchingSets.length}`,
      );
    }
  }
  for (const duplicate of duplicateValues(
    curriculumFrameworks.flatMap((framework) =>
      (framework.requirements ?? []).map((requirement) => requirement.requirement_id),
    ),
  )) {
    globalErrors.push(`curricula: duplicate global requirement_id ${duplicate}`);
  }
  for (const duplicate of duplicateValues(
    curriculumMappingSets.flatMap((mappingSet) =>
      (mappingSet.mappings ?? []).map((mapping) => mapping.mapping_id),
    ),
  )) {
    globalErrors.push(`curricula: duplicate global mapping_id ${duplicate}`);
  }
  for (const framework of curriculumFrameworks) {
    globalErrors.push(
      ...validateCurriculumFramework(framework, sourceById).map(
        (error) => `framework ${framework.framework_id}: ${error}`,
      ),
    );
  }
  for (const mappingSet of curriculumMappingSets) {
    globalErrors.push(
      ...validateCurriculumMappingSet(mappingSet, frameworkById, sourceById, canonicalIds).map(
        (error) => `mapping-set ${mappingSet.mapping_set_id}: ${error}`,
      ),
    );
  }
  for (const gapSet of curriculumGapSets) {
    globalErrors.push(
      ...validateCurriculumGapSet(
        gapSet,
        frameworkById,
        mappingSetByFrameworkId,
        resolutionSetByGapSetId,
        sourceById,
        canonicalIds,
      ).map((error) => `gap-set ${gapSet.gap_set_id}: ${error}`),
    );
  }
  for (const practiceSet of curriculumPracticeSets) {
    globalErrors.push(
      ...validateCurriculumPracticeSet(practiceSet, frameworkById, sourceById).map(
        (error) => `practice-set ${practiceSet.practice_set_id}: ${error}`,
      ),
    );
  }
  for (const resolutionSet of curriculumResolutionSets) {
    globalErrors.push(
      ...validateCurriculumResolutionSet(
        resolutionSet,
        gapSetById,
        mappingSetByFrameworkId,
        practiceItemById,
        graphsById,
        sourceById,
        canonicalIds,
      ).map((error) => `resolution-set ${resolutionSet.resolution_set_id}: ${error}`),
    );
  }
  for (const profileSet of pedagogyProfileSets) {
    globalErrors.push(
      ...validatePedagogyProfileSet(profileSet, graphsById, sourceById, canonicalIds).map(
        (error) => `pedagogy-set ${profileSet.profile_set_id}: ${error}`,
      ),
    );
  }
  for (const mappingSet of curriculumMappingSets.filter(
    (candidate) => candidate.mapping_scope === "outcome_coverage",
  )) {
    const matchingGapSets = curriculumGapSets.filter(
      (gapSet) => gapSet.framework_id === mappingSet.framework_id,
    );
    if (matchingGapSets.length !== 1) {
      globalErrors.push(
        `curricula: ${mappingSet.framework_id} requires exactly one current gap set; found ${matchingGapSets.length}`,
      );
    }
  }

  const globalLegacyIds = new Map();
  for (const [graphId, graph] of graphsById) {
    for (const node of graph.nodes) {
      const previous = globalLegacyIds.get(node.id);
      if (previous) globalErrors.push(`legacy id ${node.id} is shared by ${previous} and ${graphId}`);
      else globalLegacyIds.set(node.id, graphId);
    }
  }

  const cross = readJson(resolve(KG_SOURCE_DIR, "cross_subject_edges.json"));
  globalErrors.push(...validateCrossEdges(cross, graphsById, sourceById).map((error) => `cross-edges: ${error}`));
  const reviewTargets = buildReviewTargets(
    graphsById,
    conceptRegistry,
    cross,
    curriculumFrameworks,
    curriculumMappingSets,
    curriculumGapSets,
    curriculumResolutionSets,
    curriculumPracticeSets,
    pedagogyProfileSets,
  );
  globalErrors.push(
    ...validateReviewDecisions(reviewDecisions, reviewPolicy, sourceById, reviewTargets).map(
      (error) => `review-decisions: ${error}`,
    ),
  );

  let failed = 0;
  for (const graphId of requestedGraphIds) {
    const result = validateGraph(graphId, graphsById.get(graphId), sourceById);
    if (result.errors.length === 0) process.stdout.write(`✅ ${graphId}\n`);
    else {
      failed += 1;
      process.stdout.write(`❌ ${graphId} (${result.errors.length} problems)\n`);
      for (const error of result.errors.slice(0, 30)) process.stdout.write(`   - ${error}\n`);
      if (result.errors.length > 30) process.stdout.write(`   …(+${result.errors.length - 30} more)\n`);
    }
    for (const warning of result.warnings) process.stdout.write(`   ⚠ ${warning}\n`);
  }

  if (globalErrors.length > 0) {
    failed += 1;
    process.stdout.write(`❌ governance (${globalErrors.length} problems)\n`);
    for (const error of globalErrors.slice(0, 50)) process.stdout.write(`   - ${error}\n`);
    if (globalErrors.length > 50) process.stdout.write(`   …(+${globalErrors.length - 50} more)\n`);
  } else {
    process.stdout.write(
      `✅ governance registries, cross-subject edges, ${curriculumFrameworks.length} curriculum framework(s), ${curriculumMappingSets.length} mapping set(s), ${curriculumGapSets.length} gap set(s), ${curriculumResolutionSets.length} resolution set(s), ${curriculumPracticeSets.length} practice set(s), and ${pedagogyProfileSets.length} pedagogy profile set(s)\n`,
    );
  }

  if (failed > 0) {
    process.stdout.write(`\n[validate-kg] ${failed} validation group(s) failed\n`);
    process.exit(1);
  }
  process.stdout.write(`\n[validate-kg] ${requestedGraphIds.length} graph(s) and governance passed\n`);
}

main();
