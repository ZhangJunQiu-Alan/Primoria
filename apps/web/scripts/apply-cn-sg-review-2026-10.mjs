#!/usr/bin/env node
/**
 * Apply the October 2026 review of the 10 China/Singapore overlay graphs and
 * their curriculum and pedagogy records.
 *
 * Every verdict lives in
 * `data/knowledge-graphs/review/approved/cn-sg-2026-10/review-decisions.json`
 * (moved from review/pending/ once the owner approved it);
 * the human-readable pack beside it explains each one.
 *
 * Two phases:
 *   --corrections   content fixes found while re-checking the official syllabuses
 *                   (descriptions, evidence locators, mapping coverage). Review
 *                   status is untouched.
 *   --approve       only after the project owner has approved the pack: removes
 *                   rejected prerequisite edges (archived with their reason),
 *                   applies strength changes, added edges and rewritten edge
 *                   reasons, then marks every in-scope record `approved` with a
 *                   human decision record. Requires --owner-approved and
 *                   --reviewed-at=<ISO datetime>.
 *
 * Both phases are idempotent. Without --apply they only report. Once the
 * approval has landed, --corrections refuses to run.
 *
 *   node apps/web/scripts/apply-cn-sg-review-2026-10.mjs --corrections [--apply]
 *   node apps/web/scripts/apply-cn-sg-review-2026-10.mjs --approve --owner-approved \
 *     --reviewed-at=2026-10-26T10:00:00+08:00 [--apply]
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { refuseOwnerApprovedTargets } from "./kg-approval-guard.mjs";

const ROOT = resolve(import.meta.dirname, "../../..");
const DATA = resolve(ROOT, "data/knowledge-graphs");
const REVIEW_DIR = resolve(DATA, "review/approved/cn-sg-2026-10");
const APPROVED_DIR = resolve(DATA, "review/approved/cn-sg-2026-10");
const TODAY = "2026-10-25";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const PHASE_CORRECTIONS = args.includes("--corrections");
const PHASE_APPROVE = args.includes("--approve");
const reviewedAt = args.find((arg) => arg.startsWith("--reviewed-at="))?.slice("--reviewed-at=".length);

if (PHASE_CORRECTIONS === PHASE_APPROVE) {
  process.stderr.write("Choose exactly one of --corrections or --approve.\n");
  process.exit(1);
}
if (PHASE_APPROVE && (!args.includes("--owner-approved") || !reviewedAt || Number.isNaN(Date.parse(reviewedAt)))) {
  process.stderr.write("--approve requires --owner-approved and a valid --reviewed-at=<ISO datetime>.\n");
  process.exit(1);
}

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const bump = (version) => {
  const parts = String(version).split(".").map(Number);
  parts[2] = (parts[2] ?? 0) + 1;
  return parts.join(".");
};
const refKey = (ref) => `${ref.source_id}\u0000${ref.locator}`;
const listJson = (dir) => readdirSync(dir).filter((name) => name.endsWith(".json")).sort().map((name) => resolve(dir, name));

const review = readJson(resolve(REVIEW_DIR, "review-decisions.json"));
const GRAPH_IDS = Object.keys(review.graphs);
const OVERLAY = new Set(GRAPH_IDS);
// Corrections are the pre-approval phase; rerunning them would rewrite approved records.
if (PHASE_CORRECTIONS) {
  refuseOwnerApprovedTargets(
    Object.fromEntries(GRAPH_IDS.map((graphId) => [graphId, resolve(DATA, "source", `${graphId}.json`)])),
  );
}

// ------------------------------------------------------------- load corpus

const docs = new Map(); // path -> doc
const load = (path) => {
  if (!docs.has(path)) docs.set(path, readJson(path));
  return docs.get(path);
};
const touched = new Map(); // path -> changelog summary
const touch = (path, summary) => {
  if (!touched.has(path)) touched.set(path, summary);
};

const graphPath = (graphId) => resolve(DATA, "source", `${graphId}.json`);
for (const graphId of GRAPH_IDS) load(graphPath(graphId));
const crossPath = resolve(DATA, "source/cross_subject_edges.json");
const registryPath = resolve(DATA, "governance/concept-registry.json");
const decisionsPath = resolve(DATA, "governance/review-decisions.json");
const frameworkPaths = listJson(resolve(DATA, "curricula/frameworks"));
const mappingPaths = listJson(resolve(DATA, "curricula/mappings/pending"));
const gapPaths = listJson(resolve(DATA, "curricula/gaps/pending"));
const resolutionPaths = listJson(resolve(DATA, "curricula/resolutions/pending"));
const practicePaths = listJson(resolve(DATA, "pedagogy/practices"));
const corePedagogyPath = resolve(DATA, "pedagogy/core/cn_sg_core_pedagogy.v1.json");
for (const path of [crossPath, registryPath, decisionsPath, ...frameworkPaths, ...mappingPaths, ...gapPaths, ...resolutionPaths, ...practicePaths, corePedagogyPath]) {
  load(path);
}

const CORRECTION_SUMMARY = "依据 2026-10 联网复核修正描述、证据定位与映射覆盖，状态保持 needs_review。";

function addRefs(refs, additions) {
  let changed = false;
  const seen = new Set(refs.map(refKey));
  for (const ref of additions) {
    if (seen.has(refKey(ref))) continue;
    refs.push({ ...ref });
    seen.add(refKey(ref));
    changed = true;
  }
  return changed;
}

function replaceRefs(refs, replacements) {
  let changed = false;
  for (const { locator, with_refs: withRefs } of replacements) {
    const index = refs.findIndex((ref) => ref.locator === locator);
    if (index < 0) continue;
    refs.splice(index, 1);
    addRefs(refs, withRefs);
    changed = true;
  }
  return changed;
}

function declareSources(doc, refs) {
  if (!Array.isArray(doc.source_ids)) return;
  for (const ref of refs) if (!doc.source_ids.includes(ref.source_id)) doc.source_ids.push(ref.source_id);
}

// -------------------------------------------------------------- corrections

function applyCorrections() {
  const c = review.corrections;
  let count = 0;
  for (const fix of c.node_descriptions) {
    const path = graphPath(fix.graph_id);
    const node = load(path).nodes.find((n) => n.id === fix.node_id);
    if (node.description !== fix.description) {
      node.description = fix.description;
      touch(path, CORRECTION_SUMMARY);
      count += 1;
    }
  }
  for (const fix of c.node_evidence) {
    const path = graphPath(fix.graph_id);
    const graph = load(path);
    const node = graph.nodes.find((n) => n.id === fix.node_id);
    const changed = replaceRefs(node.evidence_refs, fix.replace ?? []) | addRefs(node.evidence_refs, fix.add ?? []);
    if (changed) {
      declareSources(graph, node.evidence_refs);
      touch(path, CORRECTION_SUMMARY);
      count += 1;
    }
  }

  for (const fix of c.requirements) {
    const editRefs = (refs) =>
      Boolean(replaceRefs(refs, fix.evidence_replace ?? []) | addRefs(refs, fix.evidence_add ?? []));
    for (const path of frameworkPaths) {
      const requirement = load(path).requirements.find((r) => r.requirement_id === fix.requirement_id);
      if (!requirement) continue;
      let changed = editRefs(requirement.evidence_refs);
      for (const field of ["title_zh", "summary_zh"]) {
        if (fix[field] && requirement[field] !== fix[field]) {
          requirement[field] = fix[field];
          changed = true;
        }
      }
      if (changed) {
        touch(path, CORRECTION_SUMMARY);
        count += 1;
      }
    }
    const gapIds = new Set();
    for (const path of mappingPaths) {
      for (const mapping of load(path).mappings) {
        if (mapping.requirement_id === fix.requirement_id && editRefs(mapping.evidence_refs)) touch(path, CORRECTION_SUMMARY);
      }
    }
    for (const path of gapPaths) {
      for (const candidate of load(path).candidates) {
        if (!candidate.requirement_ids.includes(fix.requirement_id)) continue;
        gapIds.add(candidate.gap_id);
        if (editRefs(candidate.evidence_refs)) touch(path, CORRECTION_SUMMARY);
      }
    }
    for (const path of resolutionPaths) {
      for (const resolution of load(path).resolutions) {
        if (gapIds.has(resolution.gap_id) && editRefs(resolution.evidence_refs)) touch(path, CORRECTION_SUMMARY);
      }
    }
    for (const path of practicePaths) {
      for (const item of load(path).items) {
        if (item.requirement_ids.includes(fix.requirement_id) && editRefs(item.evidence_refs)) touch(path, CORRECTION_SUMMARY);
      }
    }
  }

  // A resolution must list exactly its mapping's canonical ids, so both change together.
  const editCanonical = (record, fix) => {
    const before = record.canonical_ids.join(",");
    for (const id of fix.add_canonical ?? []) if (!record.canonical_ids.includes(id)) record.canonical_ids.push(id);
    record.canonical_ids = record.canonical_ids.filter((id) => !(fix.remove_canonical ?? []).includes(id));
    return record.canonical_ids.join(",") !== before;
  };
  for (const fix of c.mappings) {
    const requirementIds = new Set();
    for (const path of mappingPaths) {
      for (const mapping of load(path).mappings) {
        if (mapping.mapping_id !== fix.mapping_id && mapping.requirement_id !== fix.requirement_id) continue;
        requirementIds.add(mapping.requirement_id);
        if (editCanonical(mapping, fix)) {
          touch(path, CORRECTION_SUMMARY);
          count += 1;
        }
      }
    }
    const gapIds = new Set();
    for (const path of gapPaths) {
      for (const candidate of load(path).candidates) {
        if (candidate.requirement_ids.some((id) => requirementIds.has(id))) gapIds.add(candidate.gap_id);
      }
    }
    for (const path of resolutionPaths) {
      for (const resolution of load(path).resolutions) {
        if (gapIds.has(resolution.gap_id) && editCanonical(resolution, fix)) touch(path, CORRECTION_SUMMARY);
      }
    }
  }

  count += applyStructure(c);

  const core = load(corePedagogyPath);
  for (const fix of c.pedagogy) {
    for (const profile of core.profiles) {
      const item = profile.misconception_candidates.find((m) => m.misconception_id === fix.misconception_id);
      if (item && item.correction_zh !== fix.correction_zh) {
        item.correction_zh = fix.correction_zh;
        touch(corePedagogyPath, CORRECTION_SUMMARY);
        count += 1;
      }
    }
  }
  return { corrections: count };
}

// Same convention as the apply-*-resolutions scripts, so IDs stay stable.
const canonicalIdFor = (graphId, nodeId) =>
  `pc_${createHash("sha256").update(`primoria-concept-v1\0${graphId}\0${nodeId}`).digest("hex").slice(0, 32)}`;

function mappingLocators(requirementId) {
  for (const path of mappingPaths) {
    const mapping = load(path).mappings.find((m) => m.requirement_id === requirementId);
    if (mapping) return new Set(mapping.evidence_refs.map((ref) => ref.locator));
  }
  return new Set();
}

function findNode(nodeId) {
  for (const graphId of GRAPH_IDS) {
    const node = load(graphPath(graphId)).nodes.find((n) => n.id === nodeId);
    if (node) return { graphId, node };
  }
  throw new Error(`unknown node ${nodeId}`);
}

/** Topic regrouping, new same-level concepts, their edges and the mappings they replace. */
function applyStructure(c) {
  let count = 0;
  const registry = load(registryPath);
  const touchedTopics = new Map(); // graphId -> Set(topicId)
  const markTopic = (graphId, topicId) => {
    if (!touchedTopics.has(graphId)) touchedTopics.set(graphId, new Set());
    touchedTopics.get(graphId).add(topicId);
  };

  // Topics come first so new concepts and moves can land in them; evidence is filled below.
  for (const add of c.new_topics ?? []) {
    const path = graphPath(add.graph_id);
    const graph = load(path);
    if (graph.nodes.some((n) => n.id === add.id)) continue;
    graph.nodes.push({
      id: add.id,
      kind: "topic",
      name: add.name,
      name_zh: add.name_zh,
      topic: null,
      default_order: 0,
      evidence_refs: [],
      review_status: "needs_review",
    });
    markTopic(add.graph_id, add.id);
    touch(path, CORRECTION_SUMMARY);
    count += 1;
  }
  for (const order of c.topic_orders ?? []) {
    const path = graphPath(order.graph_id);
    const topic = load(path).nodes.find((n) => n.id === order.topic_id);
    if (topic.default_order !== order.default_order) {
      topic.default_order = order.default_order;
      touch(path, CORRECTION_SUMMARY);
    }
  }

  for (const add of c.new_concepts ?? []) {
    const path = graphPath(add.graph_id);
    const graph = load(path);
    if (graph.nodes.some((n) => n.id === add.id)) continue;
    const canonicalId = canonicalIdFor(add.graph_id, add.id);
    if (registry.concepts.some((concept) => concept.canonical_id === canonicalId)) throw new Error(`canonical collision ${canonicalId}`);
    graph.nodes.push({
      id: add.id,
      canonical_id: canonicalId,
      kind: "concept",
      name: add.name,
      name_zh: add.name_zh,
      topic: add.topic,
      description: add.description,
      default_order: add.default_order,
      evidence_refs: add.evidence_refs.map((ref) => ({ ...ref })),
      review_status: "needs_review",
    });
    declareSources(graph, add.evidence_refs);
    registry.concepts.push({
      canonical_id: canonicalId,
      preferred_name: add.name,
      preferred_name_zh: add.name_zh,
      status: "active",
      review_status: "needs_review",
      aliases: [{ graph_id: add.graph_id, node_id: add.id }],
    });
    registry.concepts.sort((a, b) => a.canonical_id.localeCompare(b.canonical_id));
    markTopic(add.graph_id, add.topic);
    touch(path, CORRECTION_SUMMARY);
    touch(registryPath, CORRECTION_SUMMARY);
    count += 1;
  }

  for (const move of c.node_moves ?? []) {
    const path = graphPath(move.graph_id);
    const node = load(path).nodes.find((n) => n.id === move.node_id);
    if (node.topic === move.topic && node.default_order === move.default_order) continue;
    markTopic(move.graph_id, node.topic);
    markTopic(move.graph_id, move.topic);
    node.topic = move.topic;
    node.default_order = move.default_order;
    touch(path, CORRECTION_SUMMARY);
    count += 1;
  }

  for (const rename of c.topics ?? []) {
    const path = graphPath(rename.graph_id);
    const topic = load(path).nodes.find((n) => n.id === rename.topic_id);
    if (topic.name !== rename.name || topic.name_zh !== rename.name_zh) {
      topic.name = rename.name;
      topic.name_zh = rename.name_zh;
      touch(path, CORRECTION_SUMMARY);
      count += 1;
    }
    markTopic(rename.graph_id, rename.topic_id);
  }

  // A topic's evidence is the union of its member concepts' evidence.
  for (const [graphId, topicIds] of touchedTopics) {
    const graph = load(graphPath(graphId));
    for (const topicId of topicIds) {
      const topic = graph.nodes.find((n) => n.id === topicId);
      const members = graph.nodes
        .filter((n) => n.kind === "concept" && n.topic === topicId)
        .sort((a, b) => a.default_order - b.default_order);
      const refs = [];
      addRefs(refs, members.flatMap((n) => n.evidence_refs));
      if (JSON.stringify(refs) !== JSON.stringify(topic.evidence_refs)) topic.evidence_refs = refs;
    }
  }

  for (const edge of c.new_edges ?? []) {
    const path = graphPath(edge.graph_id);
    const graph = load(path);
    if (graph.edges.some((e) => e.from === edge.from && e.to === edge.to)) continue;
    const official = officialSource(graph);
    graph.edges.push({
      from: edge.from,
      to: edge.to,
      type: "prereq",
      strength: edge.strength,
      reason: edge.reason,
      evidence_refs: edge.evidence.map((locator) => ({ source_id: official, locator })),
      review_status: "needs_review",
    });
    touch(path, CORRECTION_SUMMARY);
    count += 1;
  }

  const newConceptById = new Map((c.new_concepts ?? []).map((add) => [add.id, add]));
  for (const replacement of c.mapping_replacements ?? []) {
    const canonicalIds = [
      ...replacement.canonical_new.map((nodeId) => findNode(nodeId).node.canonical_id),
      ...(replacement.keep ?? []),
    ];
    const createdNodeIds = replacement.canonical_new;
    for (const path of mappingPaths) {
      for (const mapping of load(path).mappings) {
        if (mapping.requirement_id !== replacement.requirement_id) continue;
        if (JSON.stringify(mapping.canonical_ids) === JSON.stringify(canonicalIds)) continue;
        mapping.canonical_ids = canonicalIds;
        mapping.rationale_zh = "2026-10 复核：原映射指向更高层级（H2 预科或大学课程）概念，改由同层级概念覆盖。";
        touch(path, CORRECTION_SUMMARY);
        count += 1;
      }
    }
    for (const path of gapPaths) {
      for (const candidate of load(path).candidates) {
        if (!candidate.requirement_ids.includes(replacement.requirement_id)) continue;
        for (const resPath of resolutionPaths) {
          for (const resolution of load(resPath).resolutions) {
            if (resolution.gap_id !== candidate.gap_id) continue;
            if (JSON.stringify(resolution.canonical_ids) === JSON.stringify(canonicalIds)) continue;
            resolution.canonical_ids = canonicalIds;
            // Only the gap whose requirement a new concept was authored for "creates" it.
            const created = createdNodeIds.filter((id) =>
              newConceptById.get(id)?.requirement_ids.some((rid) => candidate.requirement_ids.includes(rid)),
            );
            resolution.created_node_ids = [...new Set([...resolution.created_node_ids, ...created])];
            if (created.length > 0) resolution.resolution_action = "add_or_alias_concepts";
            for (const id of created) addRefs(resolution.evidence_refs, newConceptById.get(id).evidence_refs);
            resolution.rationale_zh = "2026-10 复核：不再复用更高层级概念，改由同层级最小可诊断概念解析。";
            touch(resPath, CORRECTION_SUMMARY);
          }
        }
      }
    }
  }

  // Upsert: one gap per distinct mapping coverage, since a resolution must equal its mappings.
  for (const gap of c.gap_additions ?? []) {
    const add = newConceptById.get(gap.node_id);
    const gapPath = resolve(DATA, "curricula/gaps/pending", gap.gap_set_file);
    const gapSet = load(gapPath);
    const resPath = resolutionPaths.find((path) => load(path).gap_set_id === gapSet.gap_set_id);
    const resolutionSet = load(resPath);
    const official = gap.requirement_ids.flatMap((requirementId) =>
      add.evidence_refs.filter((ref) => !ref.source_id.startsWith("src_openstax_") && mappingLocators(requirementId).has(ref.locator)),
    );
    const candidate = {
      gap_id: gap.gap_id,
      requirement_ids: gap.requirement_ids,
      action: gap.creates ? "add_concept" : "split_or_narrow_existing",
      proposed_name: add.name,
      proposed_name_zh: add.name_zh,
      scope_zh: gap.scope_zh,
      existing_canonical_ids: gap.creates ? [] : [findNode(gap.node_id).node.canonical_id, ...gap.keep],
      suggested_graph_id: add.graph_id,
      rationale_zh: "2026-10 复核发现该成果原映射到更高层级概念，改由同层级最小可诊断概念覆盖。",
      evidence_refs: official.map((ref) => ({ ...ref })),
      review_status: "needs_review",
    };
    const resolution = {
      gap_id: gap.gap_id,
      resolution_action: gap.creates ? "add_or_alias_concepts" : "reuse_existing",
      canonical_ids: [findNode(gap.node_id).node.canonical_id, ...gap.keep],
      created_node_ids: gap.creates ? [gap.node_id] : [],
      practice_ids: [],
      rationale_zh: gap.creates
        ? "新增同层级概念替代对 H2 预科或大学课程概念的复用；G2/G3 同类条目共享 canonical ID，各自保留官方页码证据。"
        : "复用本轮新增的同层级概念并保留联立方程 canonical 映射。",
      evidence_refs: [...official, ...add.evidence_refs.filter((ref) => ref.source_id.startsWith("src_openstax_"))].map((ref) => ({ ...ref })),
      review_status: "needs_review",
    };
    const upsert = (list, key, record, path) => {
      const index = list.findIndex((item) => item.gap_id === key);
      if (index >= 0 && JSON.stringify(list[index]) === JSON.stringify(record)) return;
      if (index >= 0) list[index] = record;
      else list.push(record);
      touch(path, CORRECTION_SUMMARY);
      count += 1;
    };
    upsert(gapSet.candidates, gap.gap_id, candidate, gapPath);
    upsert(resolutionSet.resolutions, gap.gap_id, resolution, resPath);
  }
  return count;
}

// ----------------------------------------------------------------- approval

const officialSource = (graph) =>
  graph.source_ids.find((id) => id.startsWith("src_cn_moe_") || id.startsWith("src_sg_"));

function applyApproval() {
  const registry = load(decisionsPath);
  const seen = new Set(registry.decisions.map((d) => `${d.target_type}:${d.target_id}`));
  const stamp = reviewedAt.slice(0, 10).replace(/-/g, "");
  const stats = { decisions: 0, removed: 0, crossRemoved: 0, added: 0, softened: 0, reasons: 0 };
  const removedEdges = [];
  const decide = (targetType, targetId, evidenceRefs, rationale) => {
    const key = `${targetType}:${targetId}`;
    if (seen.has(key)) return;
    const evidence = (evidenceRefs ?? []).slice(0, 4).map((ref) => ({ source_id: ref.source_id, locator: ref.locator }));
    if (evidence.length === 0) throw new Error(`no evidence for ${key}`);
    registry.decisions.push({
      decision_id: `review_${stamp}_cnsg_${createHash("sha256").update(key).digest("hex").slice(0, 24)}`,
      target_type: targetType,
      target_id: targetId,
      from_status: "needs_review",
      to_status: "approved",
      reviewer_type: "human",
      reviewer_id: review.reviewer_id,
      reviewer_name: "Primoria 项目所有者",
      reviewed_at: reviewedAt,
      rationale_zh: rationale,
      evidence_refs: evidence,
    });
    seen.add(key);
    stats.decisions += 1;
  };
  const approve = (item, targetType, targetId, evidenceRefs, rationale) => {
    if (item.review_status === "approved") return;
    item.review_status = "approved";
    decide(targetType, targetId, evidenceRefs, rationale);
  };
  const AI_NOTE = "（AI 辅助逐条对照官方原文核验，经项目所有者批准）";

  for (const graphId of GRAPH_IDS) {
    const path = graphPath(graphId);
    const graph = load(path);
    const verdict = review.graphs[graphId];
    const official = officialSource(graph);
    const edgeKey = (edge) => `${edge.from}->${edge.to}`;
    const reject = new Map(verdict.edge_rejects.map((r) => [r.edge, r.rationale_zh]));
    const kept = [];
    for (const edge of graph.edges) {
      if (reject.has(edgeKey(edge))) {
        removedEdges.push({ graph_id: graphId, ...edge, removal_reason_zh: reject.get(edgeKey(edge)) });
        stats.removed += 1;
      } else kept.push(edge);
    }
    graph.edges = kept;
    for (const change of verdict.edge_strength_changes) {
      const edge = graph.edges.find((e) => edgeKey(e) === change.edge);
      if (edge && edge.strength !== change.strength) {
        edge.strength = change.strength;
        stats.softened += 1;
      }
    }
    for (const rewrite of verdict.edge_reason_rewrites ?? []) {
      const edge = graph.edges.find((e) => edgeKey(e) === rewrite.edge);
      if (edge && edge.reason !== rewrite.reason) {
        edge.reason = rewrite.reason;
        stats.reasons += 1;
      }
    }
    for (const add of verdict.edge_adds) {
      if (graph.edges.some((e) => e.from === add.from && e.to === add.to)) continue;
      graph.edges.push({
        from: add.from,
        to: add.to,
        type: "prereq",
        strength: add.strength,
        reason: add.reason,
        evidence_refs: add.evidence.map((locator) => ({ source_id: official, locator })),
        review_status: "needs_review",
      });
      stats.added += 1;
    }

    for (const node of graph.nodes) {
      approve(
        node,
        "node",
        `${graphId}:${node.id}`,
        node.evidence_refs,
        node.kind === "topic"
          ? `已对照官方课程原文确认 Topic“${node.name_zh}”的范围与粒度${AI_NOTE}。`
          : `已对照官方课程原文确认概念“${node.name_zh}”的定义、范围与课程深度${AI_NOTE}。`,
      );
    }
    for (const edge of graph.edges) {
      approve(edge, "edge", `${graphId}:${edgeKey(edge)}`, edge.evidence_refs, edge.reason);
    }
    const summary = `完成联网核验与人工批准：删除 ${verdict.edge_rejects.length} 条不成立的先修边，新增 ${verdict.edge_adds.length} 条，调整 ${verdict.edge_strength_changes.length} 条强度，改写 ${(verdict.edge_reason_rewrites ?? []).length} 条先修理由。`;
    if (graph.review_status !== "approved") {
      graph.review_status = "approved";
      decide("graph", graphId, graph.nodes.find((n) => n.kind === "topic").evidence_refs, `已完成 ${graph.subject} 全图来源、概念粒度与先修关系审核${AI_NOTE}。`);
    }
    touch(path, summary);
  }

  // Canonical concepts introduced by these graphs.
  const conceptRegistry = load(registryPath);
  const nodeByAlias = new Map();
  for (const graphId of GRAPH_IDS) {
    for (const node of load(graphPath(graphId)).nodes) nodeByAlias.set(`${graphId}:${node.id}`, node);
  }
  for (const concept of conceptRegistry.concepts) {
    if (concept.review_status === "approved") continue;
    const alias = concept.aliases.find((a) => OVERLAY.has(a.graph_id));
    if (!alias) continue;
    const node = nodeByAlias.get(`${alias.graph_id}:${alias.node_id}`);
    approve(concept, "canonical_concept", concept.canonical_id, node.evidence_refs, `已确认 canonical 概念“${concept.preferred_name_zh}”及其课程别名的稳定映射${AI_NOTE}。`);
  }

  // Cross-subject edges touching the overlay graphs.
  const cross = load(crossPath);
  const crossKey = (e) => `${e.from_graph.replace(/\.json$/, "")}:${e.from}->${e.to_graph.replace(/\.json$/, "")}:${e.to}`;
  const crossReject = new Map(review.cross_subject_edges.edge_rejects.map((r) => [r.edge, r.rationale_zh]));
  const crossChange = new Map(review.cross_subject_edges.edge_strength_changes.map((r) => [r.edge, r.strength]));
  const keptCross = [];
  for (const edge of cross.edges) {
    const key = crossKey(edge);
    if (crossReject.has(key)) {
      removedEdges.push({ ...edge, removal_reason_zh: crossReject.get(key) });
      stats.crossRemoved += 1;
      continue;
    }
    if (crossChange.has(key) && edge.strength !== crossChange.get(key)) {
      edge.strength = crossChange.get(key);
      stats.softened += 1;
    }
    keptCross.push(edge);
  }
  cross.edges = keptCross;
  for (const edge of cross.edges) {
    const touchesOverlay = OVERLAY.has(edge.from_graph.replace(/\.json$/, "")) || OVERLAY.has(edge.to_graph.replace(/\.json$/, ""));
    if (touchesOverlay) approve(edge, "cross_edge", crossKey(edge), edge.evidence_refs, edge.reason);
  }
  cross.source_ids = [...new Set(cross.edges.flatMap((e) => e.evidence_refs.map((r) => r.source_id)))].sort();
  touch(crossPath, `复核中国/新加坡课程派生跨图先修边：删除 ${stats.crossRemoved} 条不成立或重复的边，其余经人工批准。`);

  // Curricula and pedagogy.
  const CURRICULUM_NOTE = `已对照官方课程原文复核${AI_NOTE}。`;
  const firstRefs = (items) => items.find((i) => (i.evidence_refs ?? []).length > 0)?.evidence_refs;
  for (const path of frameworkPaths) {
    const fw = load(path);
    for (const r of fw.requirements) approve(r, "curriculum_requirement", r.requirement_id, r.evidence_refs, `课程要求“${r.title_zh}”${CURRICULUM_NOTE}`);
    approve(fw, "curriculum_framework", fw.framework_id, firstRefs(fw.requirements), `课程框架 ${fw.title_zh}${CURRICULUM_NOTE}`);
    touch(path, "完成联网复核与人工批准。");
  }
  for (const path of mappingPaths) {
    const set = load(path);
    for (const m of set.mappings) approve(m, "curriculum_mapping", m.mapping_id, m.evidence_refs, m.rationale_zh);
    approve(set, "curriculum_mapping_set", set.mapping_set_id, firstRefs(set.mappings), `映射集合 ${set.mapping_set_id}${CURRICULUM_NOTE}`);
    touch(path, "完成联网复核与人工批准。");
  }
  for (const path of gapPaths) {
    const set = load(path);
    for (const g of set.candidates) approve(g, "curriculum_gap_candidate", g.gap_id, g.evidence_refs, g.rationale_zh);
    approve(set, "curriculum_gap_set", set.gap_set_id, firstRefs(set.candidates), `缺口集合 ${set.gap_set_id}${CURRICULUM_NOTE}`);
    touch(path, "完成联网复核与人工批准。");
  }
  for (const path of resolutionPaths) {
    const set = load(path);
    for (const r of set.resolutions) approve(r, "curriculum_gap_resolution", `${set.resolution_set_id}:${r.gap_id}`, r.evidence_refs, r.rationale_zh);
    approve(set, "curriculum_gap_resolution_set", set.resolution_set_id, firstRefs(set.resolutions), `决议集合 ${set.resolution_set_id}${CURRICULUM_NOTE}`);
    touch(path, "完成联网复核与人工批准。");
  }
  for (const path of practicePaths) {
    const set = load(path);
    for (const item of set.items) approve(item, "curriculum_practice_item", item.practice_id, item.evidence_refs, item.instructional_use_zh);
    approve(set, "curriculum_practice_set", set.practice_set_id, firstRefs(set.items), `实践集合 ${set.practice_set_id}${CURRICULUM_NOTE}`);
    touch(path, "完成联网复核与人工批准。");
  }
  const core = load(corePedagogyPath);
  for (const override of review.pedagogy_overrides ?? []) {
    for (const profile of core.profiles) {
      const item = profile.misconception_candidates.find((m) => m.misconception_id === override.misconception_id);
      if (item && override.prevalence_basis) item.prevalence_basis = override.prevalence_basis;
    }
  }
  for (const profile of core.profiles) {
    for (const m of profile.misconception_candidates) approve(m, "pedagogy_misconception", m.misconception_id, m.evidence_refs, m.correction_zh);
    for (const s of profile.instructional_strategies) approve(s, "pedagogy_instructional_strategy", s.strategy_id, s.evidence_refs, s.rationale_zh);
    for (const p of profile.assessment_probes) approve(p, "pedagogy_assessment_probe", p.probe_id, p.evidence_refs, p.expected_evidence_zh);
    approve(profile, "pedagogy_profile", profile.profile_id, profile.evidence_refs, `教学档案“${profile.title_zh}”的误区、策略与探针已逐条核对${AI_NOTE}。`);
  }
  approve(core, "pedagogy_profile_set", core.profile_set_id, core.profiles[0].evidence_refs, `核心教学法集合${CURRICULUM_NOTE}`);
  touch(corePedagogyPath, "完成联网复核与人工批准；诊断假设仍不声称发生率。");

  return { stats, removedEdges };
}

// -------------------------------------------------------------------- write

const result = PHASE_CORRECTIONS ? applyCorrections() : applyApproval();
for (const [path, summary] of touched) {
  const doc = load(path);
  if (typeof doc.content_version === "string" && Array.isArray(doc.changelog) && !doc.changelog.some((e) => e.summary_zh === summary)) {
    doc.content_version = bump(doc.content_version);
    doc.changelog.push({ version: doc.content_version, date: PHASE_APPROVE ? reviewedAt.slice(0, 10) : TODAY, summary_zh: summary });
  }
}
if (PHASE_APPROVE) process.stdout.write(`[cn-sg-review] ${JSON.stringify(result.stats)}\n`);
else process.stdout.write(`[cn-sg-review] ${JSON.stringify(result)} files=${touched.size}\n`);

if (!APPLY) {
  process.stdout.write("Dry run. Re-run with --apply to write.\n");
  process.exit(0);
}
for (const path of touched.keys()) writeJson(path, load(path));
if (PHASE_APPROVE) {
  writeJson(decisionsPath, load(decisionsPath));
  writeJson(registryPath, load(registryPath));
  mkdirSync(APPROVED_DIR, { recursive: true });
  const removedPath = resolve(APPROVED_DIR, "removed-edges.json");
  const previous = existsSync(removedPath) ? readJson(removedPath).edges : [];
  writeJson(removedPath, {
    schema_version: "1.0.0",
    reviewed_at: reviewedAt,
    reviewer_id: review.reviewer_id,
    edges: [...previous, ...result.removedEdges],
  });
}
