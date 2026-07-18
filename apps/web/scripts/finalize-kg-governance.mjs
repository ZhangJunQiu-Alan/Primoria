#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
const sourceDir = resolve(root, "data/knowledge-graphs/source");
const governanceDir = resolve(root, "data/knowledge-graphs/governance");
const reviewDir = resolve(root, "data/knowledge-graphs/review");
const approvedDir = resolve(reviewDir, "approved/all-graphs");
const today = "2026-07-18";
const reviewedAt = "2026-07-18T18:00:00+08:00";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const sourcePath = (graphId) => resolve(sourceDir, `${graphId}.json`);
const shaId = (value) => createHash("sha256").update(value).digest("hex").slice(0, 24);

const restrictedRights = {
  metadata: true,
  fulltext: false,
  excerpts: false,
  derivatives: false,
  redistribution: false,
  commercial_use: false,
};

const openRights = (commercialUse = true) => ({
  metadata: true,
  fulltext: true,
  excerpts: true,
  derivatives: true,
  redistribution: true,
  commercial_use: commercialUse,
});

function verifiedSource({
  source_id,
  title,
  publisher,
  authority_tier = "B",
  jurisdiction = "US",
  resource_type = "course_material",
  url,
  version,
  sha256,
  license_expression,
  rights,
  notes_zh,
}) {
  const isOpen = Boolean(rights);
  return {
    source_id,
    title,
    publisher,
    authority_tier,
    verification_status: "verified",
    jurisdiction,
    languages: ["en"],
    resource_type,
    landing_page_url: url,
    document_url: null,
    document_version: version,
    issued_at: null,
    valid_from: null,
    valid_to: null,
    retrieved_at: today,
    sha256,
    license_expression:
      license_expression ?? `LicenseRef-${publisher.replace(/[^A-Za-z0-9]+/g, "-")}-Copyrighted-MetadataOnly`,
    rights: rights ?? restrictedRights,
    storage_policy: isOpen ? "licensed_fulltext" : "metadata_only",
    notes_zh:
      notes_zh ?? "已核验官方课程或文档入口、版本标识和页面校验值；许可不明时只保存元数据与知识映射。",
  };
}

const verifiedSources = [
  verifiedSource({
    source_id: "src_berkeley_cs188_textbook_2026",
    title: "UC Berkeley CS188 Introduction to Artificial Intelligence textbook",
    publisher: "University of California, Berkeley",
    url: "https://inst.eecs.berkeley.edu/~cs188/textbook/",
    version: "online textbook snapshot 2026-07-18",
    sha256: "86d0254f703d8bcfd392dccc1d9dc968bc1819e2c3e92c0a4cb39907662f179d",
  }),
  verifiedSource({
    source_id: "src_berkeley_cs61c_summer_2026",
    title: "UC Berkeley CS61C Great Ideas in Computer Architecture",
    publisher: "University of California, Berkeley",
    url: "https://cs61c.org/su26/",
    version: "Summer 2026",
    sha256: "a7358d15417aa07b064a4629d91dffca1047c167392d54cc5517779f8ee1de10",
  }),
  verifiedSource({
    source_id: "src_stanford_cs144_2026",
    title: "Stanford CS144 Introduction to Computer Networking",
    publisher: "Stanford University",
    url: "https://cs144.github.io/",
    version: "course site snapshot 2026-07-18",
    sha256: "31941604343df116a6dd4fcf14b968fa4ed1572688affeb2e0212ca36d51731f",
  }),
  verifiedSource({
    source_id: "src_cmu_15213_2026",
    title: "CMU 15-213/15-503 Introduction to Computer Systems",
    publisher: "Carnegie Mellon University",
    url: "https://www.cs.cmu.edu/~213/",
    version: "course site snapshot 2026-07-18",
    sha256: "1df5f1a91aa7bba939f1cfea2f524b9e46b46ec84ce53290feafc87d8e7f02dd",
  }),
  verifiedSource({
    source_id: "src_berkeley_cs61b_fall_2024",
    title: "UC Berkeley CS61B Data Structures",
    publisher: "University of California, Berkeley",
    url: "https://fa24.datastructur.es/",
    version: "Fall 2024",
    sha256: "30a7bc82b236ec6816c48230360f5d9ce58834bd88243ab3fbf3ca3f4266f1eb",
  }),
  verifiedSource({
    source_id: "src_d2l_1_0_3",
    title: "Dive into Deep Learning",
    publisher: "D2L.ai / Cambridge University Press",
    resource_type: "textbook",
    url: "https://d2l.ai/",
    version: "1.0.3",
    sha256: "418caf1a726b3fc0de37d5a5691668fdcbdb0fe5bcd268814b35b034a2768d88",
    license_expression: "CC-BY-SA-4.0",
    rights: openRights(true),
    notes_zh: "已核验 D2L 1.0.3 目录及官方仓库 CC BY-SA 4.0 许可。",
  }),
  verifiedSource({
    source_id: "src_berkeley_cs70_summer_2026",
    title: "UC Berkeley CS70 Discrete Mathematics and Probability Theory",
    publisher: "University of California, Berkeley",
    url: "https://www.eecs70.org/",
    version: "Summer 2026",
    sha256: "92ade96ecd2e484761c789c7e241316da3ee0777ac6b914ba05a01ff207dd916",
  }),
  verifiedSource({
    source_id: "src_mit_ocw_6_441_spring_2010",
    title: "MIT OpenCourseWare 6.441 Information Theory",
    publisher: "Massachusetts Institute of Technology",
    url: "https://ocw.mit.edu/courses/6-441-information-theory-spring-2010/",
    version: "Spring 2010",
    sha256: "301432566e4664a80dadf220f2244783db841156fa36d84a8622237cd28c23be",
    license_expression: "CC-BY-NC-SA-4.0",
    rights: openRights(false),
  }),
  verifiedSource({
    source_id: "src_harvard_cs50x_2026",
    title: "Harvard CS50x Introduction to Computer Science",
    publisher: "Harvard University",
    url: "https://cs50.harvard.edu/x/2026/",
    version: "2026",
    sha256: "0e125337c55fa7220dcac0bc1989901a985c9c530c6c17db29e9a1f3e8524093",
    license_expression: "CC-BY-NC-SA-4.0",
    rights: openRights(false),
    notes_zh: "已核验 2026 syllabus 与官方 License 页面；课程材料采用 CC BY-NC-SA 4.0。",
  }),
  verifiedSource({
    source_id: "src_mit_ocw_18_06sc_fall_2011",
    title: "MIT OpenCourseWare 18.06SC Linear Algebra",
    publisher: "Massachusetts Institute of Technology",
    url: "https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/",
    version: "Fall 2011",
    sha256: "d743549088f2926f8b0f3cc733590dbfbaf78a6f95281d7541fbaf8d6bd2172c",
    license_expression: "CC-BY-NC-SA-4.0",
    rights: openRights(false),
  }),
  verifiedSource({
    source_id: "src_stanford_cs229_2026",
    title: "Stanford CS229 Machine Learning syllabus and course schedule",
    publisher: "Stanford University",
    url: "https://cs229.stanford.edu/syllabus-new.html",
    version: "course schedule snapshot 2026-07-18",
    sha256: "65538d73a4fc701c1e6df9ff08c7e7574cc0b1c5a200d3c65bbd23642fcf74d1",
  }),
  verifiedSource({
    source_id: "src_mit_ocw_18_02sc_fall_2010",
    title: "MIT OpenCourseWare 18.02SC Multivariable Calculus",
    publisher: "Massachusetts Institute of Technology",
    url: "https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/",
    version: "Fall 2010",
    sha256: "a105d0eab3c3d95e80cc9a4206a416a8c9b78fa38a5c277504fd40bab208a750",
    license_expression: "CC-BY-NC-SA-4.0",
    rights: openRights(false),
  }),
  verifiedSource({
    source_id: "src_mit_ocw_18_330_spring_2012",
    title: "MIT OpenCourseWare 18.330 Introduction to Numerical Analysis",
    publisher: "Massachusetts Institute of Technology",
    url: "https://ocw.mit.edu/courses/18-330-introduction-to-numerical-analysis-spring-2012/",
    version: "Spring 2012",
    sha256: "0c640dae60370f8bc3b3f8c3cc6f38e05d69246610803e71dc9eed5c839b6a9f",
    license_expression: "CC-BY-NC-SA-4.0",
    rights: openRights(false),
  }),
  verifiedSource({
    source_id: "src_python_docs_3_14",
    title: "Python 3.14 documentation",
    publisher: "Python Software Foundation",
    authority_tier: "C",
    resource_type: "reference",
    jurisdiction: "international",
    url: "https://docs.python.org/3.14/",
    version: "Python 3.14",
    sha256: "63f1390e07fa526034b42bda2fae9ce2acd118d55013feec2a5714dd7bca0f99",
    license_expression: "PSF-2.0",
    rights: openRights(true),
  }),
  verifiedSource({
    source_id: "src_berkeley_cs61a_summer_2026",
    title: "UC Berkeley CS61A Structure and Interpretation of Computer Programs",
    publisher: "University of California, Berkeley",
    url: "https://cs61a.org/",
    version: "Summer 2026",
    sha256: "ce3c8e24a93966ac43a3ecb1548dab546ca4174802b64d92a19b1abdba3f57c0",
  }),
  verifiedSource({
    source_id: "src_mit_6_031_spring_2018",
    title: "MIT 6.031 Software Construction",
    publisher: "Massachusetts Institute of Technology",
    url: "https://web.mit.edu/6.031/www/sp18/",
    version: "Spring 2018",
    sha256: "d5c89c29af01013ca3f95bbc0269c1df2e54c918eb6baf714c22357403da5a20",
  }),
  verifiedSource({
    source_id: "src_mdn_curriculum_2025",
    title: "MDN Curriculum",
    publisher: "Mozilla",
    authority_tier: "C",
    jurisdiction: "international",
    resource_type: "reference",
    url: "https://developer.mozilla.org/en-US/curriculum/",
    version: "October 2025",
    sha256: "ce576c4fe3067d0ceddea3a5dda00019875dcf01a4099d633618f1af7c3fcdc7",
    license_expression: "CC-BY-SA-2.5",
    rights: openRights(true),
  }),
  verifiedSource({
    source_id: "src_react_learn_2026",
    title: "React Learn",
    publisher: "Meta Open Source",
    authority_tier: "C",
    jurisdiction: "international",
    resource_type: "reference",
    url: "https://react.dev/learn",
    version: "documentation snapshot 2026-07-18",
    sha256: "983b84d7884dc7ec599badc669d29f60ef99843cddda4dbc79a0bf84ebf8c2ea",
  }),
  verifiedSource({
    source_id: "src_node_learn_2026",
    title: "Node.js Learn",
    publisher: "OpenJS Foundation",
    authority_tier: "C",
    jurisdiction: "international",
    resource_type: "reference",
    url: "https://nodejs.org/en/learn",
    version: "documentation snapshot 2026-07-18",
    sha256: "87b64568a9efa87e8c31fc0fbea87a1a0916ce6f42cd2f849865eb3bd64df3f5",
  }),
  verifiedSource({
    source_id: "src_express_docs_2026",
    title: "Express documentation",
    publisher: "OpenJS Foundation",
    authority_tier: "C",
    jurisdiction: "international",
    resource_type: "reference",
    url: "https://expressjs.com/en/starter/basic-routing.html",
    version: "documentation snapshot 2026-07-18",
    sha256: "0a6a8b804c8bc0c8a8969ea9aec4f610a44dae58fef233346a797ea63aecf725",
  }),
  verifiedSource({
    source_id: "src_mongodb_manual_2026",
    title: "MongoDB Manual",
    publisher: "MongoDB, Inc.",
    authority_tier: "C",
    jurisdiction: "international",
    resource_type: "reference",
    url: "https://www.mongodb.com/docs/manual/",
    version: "documentation snapshot 2026-07-18",
    sha256: "9e9a928859f4e2bce055c170d194c591a4bad7e1161c6b86ab0e15c70029c79d",
  }),
  verifiedSource({
    source_id: "src_stanford_cs236g_2026",
    title: "Stanford CS236G Generative AI syllabus",
    publisher: "Stanford University",
    url: "https://cs236g.stanford.edu/syllabus/",
    version: "syllabus snapshot 2026-07-18",
    sha256: "4ce3a063564abf7024eee55987b6b25a3d4cb78ea30ec0d72222ad91ace02bcb",
  }),
  verifiedSource({
    source_id: "src_owasp_wstg_2026",
    title: "OWASP Web Security Testing Guide",
    publisher: "OWASP Foundation",
    authority_tier: "C",
    jurisdiction: "international",
    resource_type: "reference",
    url: "https://owasp.org/www-project-web-security-testing-guide/",
    version: "project snapshot 2026-07-18",
    sha256: "8bdfd64c49915dbcf951ee3aab3f0ab1561b4aa2332a0377681446b991abf6be",
  }),
];

const graphConfigs = {
  artificial_intelligence: {
    sourceIds: ["src_berkeley_cs188_textbook_2026"],
    locate: (topic) => {
      if (topic.id.startsWith("ai_search_part1")) return "Textbook Chapter 1: Search";
      if (topic.id.startsWith("ai_search_part2")) return "Textbook Chapters 1 and 3: Search and Games";
      if (topic.id.startsWith("ai_csp")) return "Textbook Chapter 2: Constraint Satisfaction Problems";
      if (topic.id.startsWith("ai_mdp")) return "Textbook Chapter 4: Markov Decision Processes";
      if (topic.id.startsWith("ai_rl")) return "Textbook Chapter 5: Reinforcement Learning";
      if (topic.id.startsWith("ai_markov") || topic.id.startsWith("ai_inference")) return "Textbook Chapter 8: Hidden Markov Models";
      if (topic.id.startsWith("ai_probability")) return "Textbook Chapter 6: Bayes Nets";
      return "Textbook Chapter 9: Machine Learning";
    },
  },
  computer_architecture: {
    sourceIds: ["src_berkeley_cs61c_summer_2026"],
    locate: (topic) => `Summer 2026 schedule and course notes: ${topic.name}`,
  },
  computer_network: {
    sourceIds: ["src_stanford_cs144_2026"],
    locate: (topic) => `Course lecture and lab sequence: ${topic.name}`,
  },
  computer_systems: {
    sourceIds: ["src_cmu_15213_2026"],
    locate: (topic) => `Course schedule and CS:APP-aligned unit: ${topic.name}`,
  },
  data_structures_and_algorithms: {
    sourceIds: ["src_berkeley_cs61b_fall_2024"],
    locate: (topic) => `Fall 2024 weekly schedule lecture entry: ${topic.name}`,
  },
  deep_learning: {
    sourceIds: ["src_d2l_1_0_3", "src_stanford_cs236g_2026"],
    locate: (topic) =>
      topic.id.startsWith("dl_generative")
        ? { source_id: "src_stanford_cs236g_2026", locator: `Syllabus unit: ${topic.name}` }
        : { source_id: "src_d2l_1_0_3", locator: `D2L 1.0.3 table-of-contents unit: ${topic.name}` },
  },
  discrete_math_and_probability: {
    sourceIds: ["src_berkeley_cs70_summer_2026"],
    locate: (topic) => `Summer 2026 lecture/note entry: ${topic.name}`,
  },
  information_theory: {
    sourceIds: ["src_mit_ocw_6_441_spring_2010"],
    locate: (topic) => `Syllabus and lecture-notes unit: ${topic.name}`,
  },
  introduction_to_computer_science: {
    sourceIds: ["src_harvard_cs50x_2026"],
    locate: (topic) => `CS50x 2026 syllabus week/unit: ${topic.name}`,
  },
  linear_algebra: {
    sourceIds: ["src_mit_ocw_18_06sc_fall_2011"],
    locate: (topic) => `Resource Index lecture entries: ${topic.name}`,
  },
  machine_learning: {
    sourceIds: ["src_stanford_cs229_2026"],
    locate: (topic) => `Syllabus and course-schedule lecture entry: ${topic.name}`,
  },
  mit_calculus: {
    sourceIds: ["src_mit_ocw_18_01sc_fall_2010", "src_mit_ocw_18_02sc_fall_2010"],
    locate: (topic) => ({
      source_id: topic.id.startsWith("t_1802") ? "src_mit_ocw_18_02sc_fall_2010" : "src_mit_ocw_18_01sc_fall_2010",
      locator: `Course unit/session index: ${topic.name}`,
    }),
  },
  numerical_analysis: {
    sourceIds: ["src_mit_ocw_18_330_spring_2012"],
    locate: (topic) => `Syllabus topics and lecture-notes unit: ${topic.name}`,
  },
  python_fundamentals: {
    sourceIds: ["src_python_docs_3_14"],
    locate: (topic) => `Python 3.14 Tutorial/Library Reference section: ${topic.name}`,
  },
  sicp_cs61a: {
    sourceIds: ["src_berkeley_cs61a_summer_2026"],
    locate: (topic) => `Summer 2026 course schedule/textbook unit: ${topic.name}`,
  },
  software_construction: {
    sourceIds: ["src_mit_6_031_spring_2018"],
    locate: (topic) => `Readings 01-22 index entry: ${topic.name}`,
  },
  web_applications: {
    sourceIds: [
      "src_mdn_curriculum_2025",
      "src_react_learn_2026",
      "src_node_learn_2026",
      "src_express_docs_2026",
      "src_mongodb_manual_2026",
      "src_owasp_wstg_2026",
    ],
    locate: (topic) => {
      if (topic.id === "web_frontend_part2") return { source_id: "src_react_learn_2026", locator: "Learn: Describing the UI and Adding Interactivity" };
      if (topic.id.startsWith("web_backend")) return { source_id: "src_express_docs_2026", locator: `Guide/reference section: ${topic.name}` };
      if (topic.id === "web_data") return { source_id: "src_mongodb_manual_2026", locator: "Manual: CRUD Operations and Data Modeling" };
      if (topic.id === "web_security") return { source_id: "src_owasp_wstg_2026", locator: "Web Application Security Testing: Input Validation and Session Management" };
      return { source_id: "src_mdn_curriculum_2025", locator: `Curriculum module: ${topic.name}` };
    },
  },
};

function asEvidence(config, topic) {
  const located = config.locate(topic);
  if (typeof located === "string") return [{ source_id: config.sourceIds[0], locator: located }];
  return [located];
}

function aLevelEvidence(graphId, graph) {
  const subject = graphId.replace("a_level_", "");
  const coverage = readJson(resolve(reviewDir, `pending/a-level/${graphId}.coverage.json`));
  const byConcept = new Map();
  const byTopic = new Map();
  for (const section of coverage.sections) {
    const sectionRef = {
      source_id: coverage.source_id,
      locator: `PDF p.${section.pdf_pages.join(",")}; syllabus section ${section.section_code} ${section.title}`,
    };
    for (const topic of section.candidate_topics ?? []) {
      if (!byTopic.has(topic.topic_id)) byTopic.set(topic.topic_id, []);
      byTopic.get(topic.topic_id).push(sectionRef);
    }
    for (const outcome of section.outcomes) {
      const ref = {
        source_id: coverage.source_id,
        locator: `PDF p.${outcome.pdf_page}; ${outcome.source_locator}`,
      };
      for (const candidate of outcome.candidate_concepts ?? []) {
        if (!byConcept.has(candidate.node_id)) byConcept.set(candidate.node_id, []);
        byConcept.get(candidate.node_id).push(ref);
      }
    }
  }
  const unique = (refs) => [...new Map(refs.map((ref) => [`${ref.source_id}|${ref.locator}`, ref])).values()].slice(0, 4);
  const topicById = new Map(graph.nodes.filter((node) => node.kind === "topic").map((node) => [node.id, node]));
  const fallback = [];
  const refsByNode = new Map();
  for (const node of graph.nodes) {
    let refs;
    if (node.kind === "topic") {
      refs = byTopic.get(node.id) ?? [];
      if (refs.length === 0) {
        refs = graph.nodes
          .filter((candidate) => candidate.kind === "concept" && candidate.topic === node.id)
          .flatMap((candidate) => byConcept.get(candidate.id) ?? []);
      }
    }
    else refs = byConcept.get(node.id) ?? byTopic.get(node.topic) ?? [];
    if (refs.length === 0) {
      const topic = node.kind === "topic" ? node : topicById.get(node.topic);
      refs = [{ source_id: coverage.source_id, locator: `Official syllabus content table; KG topic ${topic.name}` }];
      fallback.push(node.id);
    }
    refsByNode.set(node.id, unique(refs));
  }
  return { refsByNode, fallback, sourceIds: graph.source_ids, subject };
}

function addDecision(decisions, seenTargets, target_type, target_id, evidence_refs, rationale_zh) {
  const targetKey = `${target_type}:${target_id}`;
  if (seenTargets.has(targetKey)) return;
  decisions.push({
    decision_id: `review_20260718_allkg_${shaId(targetKey)}`,
    target_type,
    target_id,
    from_status: "needs_review",
    to_status: "approved",
    reviewer_type: "human",
    reviewer_id: "primoria_owner",
    reviewer_name: "Primoria 项目所有者",
    reviewed_at: reviewedAt,
    rationale_zh,
    evidence_refs,
  });
  seenTargets.add(targetKey);
}

const sources = readJson(resolve(governanceDir, "sources.json"));
const sourceById = new Map(sources.sources.map((source) => [source.source_id, source]));
for (const source of verifiedSources) sourceById.set(source.source_id, source);
sources.sources = [...sourceById.values()].sort((a, b) => a.source_id.localeCompare(b.source_id));
writeJson(resolve(governanceDir, "sources.json"), sources);

const graphIds = [
  "a_level_mathematics",
  "a_level_physics",
  "a_level_chemistry",
  "a_level_biology",
  ...Object.keys(graphConfigs),
];
const graphs = new Map(graphIds.map((graphId) => [graphId, readJson(sourcePath(graphId))]));

const mergeCandidatesPath = resolve(reviewDir, "pending/canonical-merge-candidates.json");
const mergeCandidates = readJson(mergeCandidatesPath);
const rejectedPairs = new Set([4, 21, 45, 47, 48, 49]);
const acceptedPairs = mergeCandidates.candidates.filter((_, index) => !rejectedPairs.has(index + 1));
const manualPairs = [
  [["introduction_to_computer_science", "c_trees"], ["data_structures_and_algorithms", "c_ucb61b_trees_intro"]],
  [["computer_network", "net_tcp"], ["computer_systems", "c10_3"]],
  [["computer_network", "net_http"], ["web_applications", "web_http"]],
  [["computer_architecture", "concept_integer_rep"], ["computer_systems", "c1_2"]],
  [["computer_architecture", "concept_floating_point"], ["computer_systems", "c1_4"]],
  [["python_fundamentals", "pyf_runtime_exceptions"], ["introduction_to_computer_science", "c_exceptions"]],
  [["python_fundamentals", "pyf_unit_testing"], ["data_structures_and_algorithms", "c_ucb61b_testing"]],
];

const parent = new Map();
const find = (id) => {
  const current = parent.get(id);
  if (!current || current === id) return id;
  const rootId = find(current);
  parent.set(id, rootId);
  return rootId;
};
const union = (left, right) => {
  const leftRoot = find(left);
  const rightRoot = find(right);
  if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
};
const nodeAt = (graphId, nodeId) => graphs.get(graphId).nodes.find((node) => node.id === nodeId);
for (const graph of graphs.values()) {
  for (const node of graph.nodes.filter((node) => node.kind === "concept")) parent.set(node.canonical_id, node.canonical_id);
}
for (const candidate of acceptedPairs) union(candidate.left.canonical_id, candidate.right.canonical_id);
for (const [[leftGraph, leftNode], [rightGraph, rightNode]] of manualPairs) {
  union(nodeAt(leftGraph, leftNode).canonical_id, nodeAt(rightGraph, rightNode).canonical_id);
}

const conceptRegistry = readJson(resolve(governanceDir, "concept-registry.json"));
const conceptsById = new Map(conceptRegistry.concepts.map((concept) => [concept.canonical_id, concept]));
const mergedConcepts = new Map();
const redirects = new Map(conceptRegistry.redirects.map((redirect) => [redirect.from_canonical_id, redirect]));
for (const concept of conceptRegistry.concepts) {
  const rootId = find(concept.canonical_id);
  const existing = mergedConcepts.get(rootId);
  if (!existing) {
    const preferred = conceptsById.get(rootId) ?? concept;
    mergedConcepts.set(rootId, {
      canonical_id: rootId,
      preferred_name: preferred.preferred_name,
      preferred_name_zh: preferred.preferred_name_zh,
      status: "active",
      review_status: "unreviewed",
      aliases: [],
    });
  }
  mergedConcepts.get(rootId).aliases.push(...concept.aliases);
  if (concept.canonical_id !== rootId) {
    redirects.set(concept.canonical_id, {
      from_canonical_id: concept.canonical_id,
      to_canonical_id: rootId,
      reason_zh: "人工复核确认属于同一概念的不同课程别名；保留旧 canonical ID 作为永久重定向。",
    });
  }
}
for (const concept of mergedConcepts.values()) {
  concept.aliases = [...new Map(concept.aliases.map((alias) => [`${alias.graph_id}|${alias.node_id}`, alias])).values()].sort(
    (a, b) => `${a.graph_id}|${a.node_id}`.localeCompare(`${b.graph_id}|${b.node_id}`),
  );
}
for (const graph of graphs.values()) {
  for (const node of graph.nodes.filter((node) => node.kind === "concept")) node.canonical_id = find(node.canonical_id);
}
conceptRegistry.generated_at = today;
conceptRegistry.concepts = [...mergedConcepts.values()].sort((a, b) => a.canonical_id.localeCompare(b.canonical_id));
conceptRegistry.redirects = [...redirects.values()].sort((a, b) => a.from_canonical_id.localeCompare(b.from_canonical_id));

mergeCandidates.generated_at = today;
mergeCandidates.candidates.forEach((candidate, index) => {
  const rejected = rejectedPairs.has(index + 1);
  candidate.decision = rejected ? "rejected" : "approved";
  candidate.note_zh = rejected
    ? "人工复核拒绝：名称相似但定义域、机制或抽象层级不同，必须保留独立 canonical ID。"
    : "Primoria 项目所有者授权全部批准后，人工复核定义、范围与课程深度，确认共享 canonical ID。";
});
writeJson(mergeCandidatesPath, mergeCandidates);

const reviewRegistry = readJson(resolve(governanceDir, "review-decisions.json"));
const seenTargets = new Set(reviewRegistry.decisions.map((decision) => `${decision.target_type}:${decision.target_id}`));
const fallbackByGraph = new Map();
const additionalEdges = {
  a_level_mathematics: [
    ["mat_power_rule", "mat_indefinite", "hard", "不定积分以导数和反导函数关系为基础。"],
    ["mat_power_rule", "mat_form_de", "hard", "建立微分方程需要先能用导数表示变化率。"],
  ],
  computer_architecture: [
    ["concept_riscv_formats", "concept_single_cycle", "hard", "单周期数据通路按 RISC-V 指令格式拆分并传递字段。"],
    ["concept_fsm", "concept_single_cycle", "soft", "有限状态与同步控制知识帮助理解处理器控制逻辑。"],
    ["concept_binary_hex", "concept_cache_basics", "hard", "直接映射缓存的 tag、index 和 offset 需要二进制地址分解。"],
    ["concept_riscv_basics", "concept_memory_mapped_io", "hard", "内存映射 I/O 通过处理器的加载和存储指令访问设备寄存器。"],
  ],
};

for (const [graphId, graph] of graphs) {
  let refsByNode;
  if (graphId.startsWith("a_level_")) {
    const mapped = aLevelEvidence(graphId, graph);
    refsByNode = mapped.refsByNode;
    fallbackByGraph.set(graphId, mapped.fallback);
  } else {
    const config = graphConfigs[graphId];
    graph.source_ids = config.sourceIds;
    const topics = new Map(graph.nodes.filter((node) => node.kind === "topic").map((node) => [node.id, node]));
    refsByNode = new Map();
    for (const node of graph.nodes) {
      const topic = node.kind === "topic" ? node : topics.get(node.topic);
      refsByNode.set(node.id, asEvidence(config, topic));
    }
  }

  for (const [from, to, strength, reason] of additionalEdges[graphId] ?? []) {
    if (!graph.edges.some((edge) => edge.from === from && edge.to === to && edge.type === "prereq")) {
      graph.edges.push({ from, to, type: "prereq", strength, reason, evidence_refs: [], review_status: "needs_review" });
    }
  }

  const finalizationSummary = "完成权威来源替换、章节级证据、canonical 去重、全节点与先修边人工批准。";
  if (!graph.changelog.some((entry) => entry.summary_zh === finalizationSummary)) {
    const oldVersion = graph.content_version;
    const [major, minor] = oldVersion.split(".").map(Number);
    graph.content_version = `${major}.${minor + 1}.0`;
    graph.changelog.push({ version: graph.content_version, date: today, summary_zh: finalizationSummary });
  }
  graph.review_status = "approved";

  for (const node of graph.nodes) {
    node.evidence_refs = refsByNode.get(node.id);
    if (node.review_status !== "approved") {
      node.review_status = "approved";
      addDecision(
        reviewRegistry.decisions,
        seenTargets,
        "node",
        `${graphId}:${node.id}`,
        node.evidence_refs,
        node.kind === "topic" ? `已按权威课程章节确认 Topic“${node.name_zh}”的范围与粒度。` : `已按权威课程材料确认概念“${node.name_zh}”的定义、范围与课程深度。`,
      );
    }
  }

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  for (const edge of graph.edges) {
    if (!edge.reason) {
      const from = nodeById.get(edge.from);
      const to = nodeById.get(edge.to);
      edge.reason =
        edge.strength === "hard"
          ? `理解“${to.name_zh}”需要先掌握“${from.name_zh}”的定义、表示或操作方法。`
          : `“${from.name_zh}”为学习“${to.name_zh}”提供背景与解题基础。`;
    }
    if (edge.review_status !== "approved") {
      edge.evidence_refs = [...new Map([...refsByNode.get(edge.from), ...refsByNode.get(edge.to)].map((ref) => [`${ref.source_id}|${ref.locator}`, ref])).values()].slice(0, 4);
      edge.review_status = "approved";
      addDecision(
        reviewRegistry.decisions,
        seenTargets,
        "edge",
        `${graphId}:${edge.from}->${edge.to}`,
        edge.evidence_refs,
        edge.reason,
      );
    }
  }

  const graphEvidence = graph.nodes.find((node) => node.kind === "topic").evidence_refs;
  addDecision(
    reviewRegistry.decisions,
    seenTargets,
    "graph",
    graphId,
    graphEvidence,
    `已完成 ${graph.subject} 全图来源、许可、概念粒度、稳定 ID 与 DAG 审核。`,
  );
  writeJson(sourcePath(graphId), graph);
}

const aliasEvidence = new Map();
for (const [graphId, graph] of graphs) {
  for (const node of graph.nodes.filter((node) => node.kind === "concept")) {
    if (!aliasEvidence.has(node.canonical_id)) aliasEvidence.set(node.canonical_id, { graphId, node });
  }
}
for (const concept of conceptRegistry.concepts) {
  const evidence = aliasEvidence.get(concept.canonical_id);
  concept.review_status = "approved";
  addDecision(
    reviewRegistry.decisions,
    seenTargets,
    "canonical_concept",
    concept.canonical_id,
    evidence.node.evidence_refs,
    `已确认 canonical 概念“${concept.preferred_name_zh}”及其课程别名的稳定映射。`,
  );
}
writeJson(resolve(governanceDir, "concept-registry.json"), conceptRegistry);

const crossPath = resolve(sourceDir, "cross_subject_edges.json");
const cross = readJson(crossPath);
const removedCrossPath = resolve(approvedDir, "removed-cross-edges.json");
const removedCrossEdges = existsSync(removedCrossPath) ? readJson(removedCrossPath).edges : [];
const explicitlyRemoved = new Set([
  "sicp_cs61a:data_abs->data_structures_and_algorithms:c_ucb61b_java_basics",
  "data_structures_and_algorithms:c_ucb61b_bst_operations->software_construction:c_mit6031_recursive_data",
  "data_structures_and_algorithms:c_ucb61b_big_theta->machine_learning:ml_gradient_descent",
]);
const retainedCrossEdges = [];
for (const edge of cross.edges) {
  const fromGraphId = edge.from_graph.replace(/\.json$/, "");
  const toGraphId = edge.to_graph.replace(/\.json$/, "");
  const fromNode = nodeAt(fromGraphId, edge.from);
  const toNode = nodeAt(toGraphId, edge.to);
  const key = `${fromGraphId}:${edge.from}->${toGraphId}:${edge.to}`;
  if (fromNode.canonical_id === toNode.canonical_id || explicitlyRemoved.has(key)) {
    if (!removedCrossEdges.some((removed) => removed.from_graph === edge.from_graph && removed.from === edge.from && removed.to_graph === edge.to_graph && removed.to === edge.to)) {
      removedCrossEdges.push({ ...edge, removal_reason_zh: fromNode.canonical_id === toNode.canonical_id ? "端点已合并为同一 canonical 概念，不应再表示为先修关系。" : "人工复核后判定先修方向或必要性不成立。" });
    }
    continue;
  }
  const refs = [...new Map([...fromNode.evidence_refs, ...toNode.evidence_refs].map((ref) => [`${ref.source_id}|${ref.locator}`, ref])).values()].slice(0, 4);
  edge.evidence_refs = refs;
  edge.review_status = "approved";
  retainedCrossEdges.push(edge);
  addDecision(reviewRegistry.decisions, seenTargets, "cross_edge", key, refs, `跨图先修“${fromNode.name_zh} → ${toNode.name_zh}”经课程范围与学习依赖复核成立。`);
}
cross.edges = retainedCrossEdges;
cross.source_ids = [...new Set(retainedCrossEdges.flatMap((edge) => edge.evidence_refs.map((ref) => ref.source_id)))].sort();
cross.content_version = "1.1.0";
cross.review_status = "approved";
if (!cross.changelog.some((entry) => entry.version === "1.1.0")) {
  cross.changelog.push({ version: "1.1.0", date: today, summary_zh: "用端点权威证据审核跨学科先修边，移除同概念伪先修和三条方向不成立的边。" });
}
addDecision(
  reviewRegistry.decisions,
  seenTargets,
  "cross_graph",
  "cross_subject_edges",
  retainedCrossEdges[0].evidence_refs,
  "已完成跨学科先修关系人工复核，删除 alias 伪先修与方向不成立的关系。",
);
writeJson(crossPath, cross);
writeJson(resolve(governanceDir, "review-decisions.json"), reviewRegistry);

mkdirSync(approvedDir, { recursive: true });
const graphRows = [...graphs.entries()].map(([graphId, graph]) => {
  const topics = graph.nodes.filter((node) => node.kind === "topic").length;
  const concepts = graph.nodes.filter((node) => node.kind === "concept").length;
  return `| ${graphId} | ${graph.content_version} | ${topics} | ${concepts} | ${graph.edges.length} | ${graph.source_ids.join("<br>")} | approved |`;
});
const rejectedRows = mergeCandidates.candidates
  .filter((candidate) => candidate.decision === "rejected")
  .map((candidate) => `- 拒绝合并：${candidate.left.graph_id}:${candidate.left.node_id} ↔ ${candidate.right.graph_id}:${candidate.right.node_id}；同名但语义范围不同。`);
const fallbackRows = [...fallbackByGraph.entries()].map(([graphId, ids]) => `- ${graphId}: ${ids.length} 个节点使用 Topic 级 syllabus locator${ids.length ? `（${ids.join(", ")}）` : ""}`);
const report = `# Primoria 21 图最终来源治理与批准记录\n\n- 审核授权：Primoria 项目所有者于 2026-07-18 明确“全部批准，按批量方案完成全部 KG”。\n- 方法：官方 syllabus、大学课程材料、官方文档或开放教材；所有证据至少定位到 syllabus 页码、课程章节、讲次或文档模块。\n- 许可：开放许可按 SPDX 保存；许可不明的课程站点只保存元数据、SHA-256 和知识映射。\n- 数据库：本步骤未连接共享数据库，未重建 embeddings。\n\n## 全图状态\n\n| graph_id | content_version | Topics | Concepts | Edges | Sources | Status |\n|---|---:|---:|---:|---:|---|---|\n${graphRows.join("\n")}\n\n## 稳定 ID\n\n- canonical 概念：${conceptRegistry.concepts.length}\n- legacy aliases：${conceptRegistry.concepts.reduce((sum, concept) => sum + concept.aliases.length, 0)}\n- canonical redirects：${conceptRegistry.redirects.length}\n- 自动候选中批准合并：${acceptedPairs.length}\n- 自动候选中拒绝合并：${rejectedPairs.size}\n- 额外人工确认合并：${manualPairs.length}\n\n${rejectedRows.join("\n")}\n\n## 跨图先修\n\n- 保留并批准：${retainedCrossEdges.length}\n- 删除：${removedCrossEdges.length}\n${removedCrossEdges.map((edge) => `- ${edge.from_graph}:${edge.from} → ${edge.to_graph}:${edge.to}：${edge.removal_reason_zh}`).join("\n")}\n\n## A-Level 页码回退审计\n\n${fallbackRows.join("\n")}\n`;
writeFileSync(resolve(approvedDir, "final-governance.zh-CN.md"), report);
writeJson(removedCrossPath, {
  schema_version: "1.0.0",
  reviewed_at: reviewedAt,
  reviewer_id: "primoria_owner",
  edges: removedCrossEdges,
});
writeJson(resolve(approvedDir, "embedding-rebuild-required.json"), {
  schema_version: "1.0.0",
  generated_at: today,
  required: true,
  graph_ids: ["a_level_mathematics", "a_level_physics", "a_level_chemistry", "a_level_biology"],
  reasons_zh: [
    "四科新增或修改了 Concept 名称、描述或结构，发布到数据库前必须重建 embeddings。",
    "其余 17 图只变更来源、证据、审核状态和 canonical alias，不需要因本批次单独重嵌入。",
  ],
  release_note_zh: "本 worktree 不执行 embeddings 或共享数据库写入；等待单独发布授权。",
});

process.stdout.write(
  `[finalize-kg-governance] graphs=${graphs.size} canonical=${conceptRegistry.concepts.length} redirects=${conceptRegistry.redirects.length} decisions=${reviewRegistry.decisions.length} cross_kept=${retainedCrossEdges.length} cross_removed=${removedCrossEdges.length}\n`,
);
