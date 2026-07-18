#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { KG_SOURCE_DIR, REPO_ROOT, graphPath, listGraphIds } from "./kg-db-common.mjs";

const SCHEMA_DIR = resolve(REPO_ROOT, "data/knowledge-graphs/schema");
const GOVERNANCE_DIR = resolve(REPO_ROOT, "data/knowledge-graphs/governance");
const FULLTEXT_DIR = resolve(REPO_ROOT, "data/knowledge-graphs/sources/fulltext");

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

function reviewTargetKey(targetType, targetId) {
  return `${targetType}:${targetId}`;
}

function buildReviewTargets(graphsById, conceptRegistry, cross) {
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
  const globalErrors = [
    ...validateSourceRegistry(sourceRegistry).map((error) => `sources: ${error}`),
    ...validateConceptRegistry(conceptRegistry, graphsById).map((error) => `concept-registry: ${error}`),
  ];

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
  const reviewTargets = buildReviewTargets(graphsById, conceptRegistry, cross);
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
  } else process.stdout.write("✅ governance registries and cross-subject edges\n");

  if (failed > 0) {
    process.stdout.write(`\n[validate-kg] ${failed} validation group(s) failed\n`);
    process.exit(1);
  }
  process.stdout.write(`\n[validate-kg] ${requestedGraphIds.length} graph(s) and governance passed\n`);
}

main();
