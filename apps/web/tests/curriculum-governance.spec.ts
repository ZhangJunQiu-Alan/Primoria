import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type EvidenceRef = { source_id: string; locator: string };
type Requirement = { requirement_id: string; evidence_refs: EvidenceRef[]; review_status: string };
type Framework = {
  framework_id: string;
  curriculum_id: string;
  requirement_granularity: "strand" | "unit" | "subtopic" | "outcome";
  jurisdiction: string;
  source_ids: string[];
  requirements: Requirement[];
  scope_exclusions?: Array<{ scope: string; evidence_refs: EvidenceRef[] }>;
  review_status: string;
};
type Mapping = {
  mapping_id: string;
  requirement_id: string;
  canonical_ids: string[];
  coverage_status: "full" | "partial" | "unmapped" | "excluded";
  evidence_refs: EvidenceRef[];
  review_status: string;
};
type MappingSet = {
  mapping_set_id: string;
  framework_id: string;
  curriculum_id: string;
  mapping_scope: "topic_alignment" | "outcome_coverage";
  source_ids: string[];
  mappings: Mapping[];
  review_status: string;
};
type GapCandidate = {
  gap_id: string;
  requirement_ids: string[];
  action: "add_concept" | "split_or_narrow_existing" | "not_knowledge_concept";
  review_status: string;
};
type GapSet = {
  gap_set_id: string;
  framework_id: string;
  candidates: GapCandidate[];
  review_status: string;
};
type Resolution = {
  gap_id: string;
  resolution_action: "reuse_existing" | "add_or_alias_concepts" | "route_practice";
  canonical_ids: string[];
  created_node_ids: string[];
  practice_ids: string[];
  evidence_refs: EvidenceRef[];
  review_status: string;
};
type ResolutionSet = {
  gap_set_id: string;
  resolutions: Resolution[];
  review_status: string;
};
type PracticeItem = {
  practice_id: string;
  requirement_ids: string[];
  review_status: string;
};
type PracticeSet = {
  framework_id: string;
  items: PracticeItem[];
  review_status: string;
};
type ConceptRegistry = {
  concepts: Array<{
    canonical_id: string;
    aliases?: Array<{ graph_id: string; node_id: string }>;
    review_status?: string;
  }>;
};
type SourceRegistry = {
  sources: Array<{
    source_id: string;
    storage_policy: string;
    resource_type: string;
    verification_status: string;
    sha256: string | null;
  }>;
};
type GraphNode = {
  id: string;
  canonical_id: string;
  kind: string;
  name: string;
  description: string;
  evidence_refs: EvidenceRef[];
  review_status: string;
};
type GraphEdge = { from: string; to: string; reason: string; review_status: string };
type Graph = { graph_id: string; nodes: GraphNode[]; edges: GraphEdge[] };

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;
const readJsonDirectory = <T>(path: string): T[] =>
  readdirSync(path)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => readJson<T>(resolve(path, name)));

const frameworkDir = resolve(repoRoot, "data/knowledge-graphs/curricula/frameworks");
const mappingDir = resolve(repoRoot, "data/knowledge-graphs/curricula/mappings/pending");
const frameworks = readJsonDirectory<Framework>(frameworkDir);
const mappingSets = readJsonDirectory<MappingSet>(mappingDir);
const gapSets = readJsonDirectory<GapSet>(
  resolve(repoRoot, "data/knowledge-graphs/curricula/gaps/pending"),
);
const resolutionSets = readJsonDirectory<ResolutionSet>(
  resolve(repoRoot, "data/knowledge-graphs/curricula/resolutions/pending"),
);
const practiceSets = readJsonDirectory<PracticeSet>(
  resolve(repoRoot, "data/knowledge-graphs/pedagogy/practices"),
);
const frameworkById = new Map(frameworks.map((framework) => [framework.framework_id, framework]));
const conceptRegistry = readJson<ConceptRegistry>(
  resolve(repoRoot, "data/knowledge-graphs/governance/concept-registry.json"),
);
const sourceRegistry = readJson<SourceRegistry>(
  resolve(repoRoot, "data/knowledge-graphs/governance/sources.json"),
);
const seniorSecondaryMathematics = readJson<Graph>(
  resolve(repoRoot, "data/knowledge-graphs/source/senior_secondary_mathematics.json"),
);
const seniorSecondaryPhysics = readJson<Graph>(
  resolve(repoRoot, "data/knowledge-graphs/source/senior_secondary_physics.json"),
);
const seniorSecondaryChemistry = readJson<Graph>(
  resolve(repoRoot, "data/knowledge-graphs/source/senior_secondary_chemistry.json"),
);
const seniorSecondaryBiology = readJson<Graph>(
  resolve(repoRoot, "data/knowledge-graphs/source/senior_secondary_biology.json"),
);
const singaporeH2Mathematics = readJson<Graph>(
  resolve(repoRoot, "data/knowledge-graphs/source/singapore_h2_mathematics.json"),
);
const singaporeH2Chemistry = readJson<Graph>(
  resolve(repoRoot, "data/knowledge-graphs/source/singapore_h2_chemistry.json"),
);
const singaporeH2Physics = readJson<Graph>(
  resolve(repoRoot, "data/knowledge-graphs/source/singapore_h2_physics.json"),
);
const singaporeH2Biology = readJson<Graph>(
  resolve(repoRoot, "data/knowledge-graphs/source/singapore_h2_biology.json"),
);
const singaporeSecondaryMathematics = readJson<Graph>(
  resolve(repoRoot, "data/knowledge-graphs/source/singapore_secondary_mathematics.json"),
);
const singaporeLowerSecondaryScience = readJson<Graph>(
  resolve(repoRoot, "data/knowledge-graphs/source/singapore_lower_secondary_science.json"),
);

// Edge counts include the prerequisite edges derived from official syllabus
// outcome order by scripts/derive-overlay-prereq-edges.mjs. Those edges are
// review_status: needs_review and inert at runtime until a reviewer approves
// them; they still belong to the authored corpus these assertions guard.
describe("curriculum governance", () => {
  it("covers only the approved jurisdictions and keeps all proposals pending", () => {
    expect(new Set(frameworks.map((framework) => framework.jurisdiction))).toEqual(
      new Set(["CN-MAINLAND", "SG"]),
    );
    expect(frameworks.length).toBeGreaterThanOrEqual(10);
    expect(mappingSets).toHaveLength(frameworks.length);
    expect(frameworks.reduce((sum, framework) => sum + framework.requirements.length, 0)).toBe(
      mappingSets.reduce((sum, mappingSet) => sum + mappingSet.mappings.length, 0),
    );
    expect(frameworks.every((framework) => framework.review_status === "needs_review")).toBe(true);
    expect(mappingSets.every((mappingSet) => mappingSet.review_status === "needs_review")).toBe(true);
    expect(
      frameworks.every((framework) =>
        framework.requirements.every((requirement) => requirement.review_status === "needs_review"),
      ),
    ).toBe(true);
    expect(
      mappingSets.every((mappingSet) =>
        mappingSet.mappings.every((mapping) => mapping.review_status === "needs_review"),
      ),
    ).toBe(true);
  });

  it("maps every requirement exactly once to existing canonical concepts", () => {
    const canonicalIds = new Set(conceptRegistry.concepts.map((concept) => concept.canonical_id));
    for (const mappingSet of mappingSets) {
      const framework = frameworkById.get(mappingSet.framework_id);
      expect(framework).toBeDefined();
      expect(mappingSet.curriculum_id).toBe(framework?.curriculum_id);
      const requirementIds = framework?.requirements.map((requirement) => requirement.requirement_id) ?? [];
      const mappedIds = mappingSet.mappings.map((mapping) => mapping.requirement_id);
      expect(new Set(mappedIds)).toEqual(new Set(requirementIds));
      expect(mappedIds).toHaveLength(requirementIds.length);
      for (const mapping of mappingSet.mappings) {
        expect(mapping.canonical_ids.every((canonicalId) => canonicalIds.has(canonicalId))).toBe(true);
      }
    }
  });

  it("does not present topic-level navigation as complete outcome coverage", () => {
    const topicMappings = mappingSets.filter((mappingSet) => mappingSet.mapping_scope === "topic_alignment");
    expect(topicMappings).toHaveLength(1);
    expect(
      topicMappings.every((mappingSet) =>
        mappingSet.mappings.every((mapping) => mapping.coverage_status !== "full"),
      ),
    ).toBe(true);
    for (const outcomeMapping of mappingSets.filter(
      (mappingSet) => mappingSet.mapping_scope === "outcome_coverage",
    )) {
      expect(frameworkById.get(outcomeMapping.framework_id)?.requirement_granularity).toBe("outcome");
    }
  });

  it("resolves every China senior-high mathematics gap without turning practices into mastery concepts", () => {
    const frameworkId = "cfw_cn_moe_senior_high_math_2020_outcomes";
    const framework = frameworkById.get(frameworkId);
    const mappingSet = mappingSets.find((candidate) => candidate.framework_id === frameworkId);
    const gapSet = gapSets.find((candidate) => candidate.framework_id === frameworkId);
    const resolutionSet = resolutionSets.find((candidate) => candidate.gap_set_id === gapSet?.gap_set_id);
    const practiceSet = practiceSets.find((candidate) => candidate.framework_id === frameworkId);
    expect(framework?.requirement_granularity).toBe("outcome");
    expect(framework?.requirements).toHaveLength(127);
    expect(mappingSet?.mapping_scope).toBe("outcome_coverage");
    expect(mappingSet?.mappings).toHaveLength(127);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "full")).toHaveLength(119);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "excluded")).toHaveLength(8);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "partial")).toHaveLength(0);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "unmapped")).toHaveLength(0);
    expect(gapSet?.review_status).toBe("needs_review");
    expect(gapSet?.candidates).toHaveLength(101);
    expect(gapSet?.candidates.filter((candidate) => candidate.action === "add_concept")).toHaveLength(30);
    expect(
      gapSet?.candidates.filter((candidate) => candidate.action === "split_or_narrow_existing"),
    ).toHaveLength(63);
    expect(
      gapSet?.candidates.filter((candidate) => candidate.action === "not_knowledge_concept"),
    ).toHaveLength(8);
    expect(resolutionSet?.review_status).toBe("needs_review");
    expect(resolutionSet?.resolutions).toHaveLength(101);
    expect(
      resolutionSet?.resolutions.filter((resolution) => resolution.resolution_action === "reuse_existing"),
    ).toHaveLength(29);
    expect(
      resolutionSet?.resolutions.filter(
        (resolution) => resolution.resolution_action === "add_or_alias_concepts",
      ),
    ).toHaveLength(64);
    expect(
      resolutionSet?.resolutions.filter((resolution) => resolution.resolution_action === "route_practice"),
    ).toHaveLength(8);
    expect(practiceSet?.review_status).toBe("needs_review");
    expect(practiceSet?.items).toHaveLength(8);
    expect(seniorSecondaryMathematics.nodes.filter((node) => node.kind === "concept")).toHaveLength(70);
  });

  it("resolves China senior-high physics at diagnostic-outcome granularity", () => {
    const frameworkId = "cfw_cn_moe_senior_high_physics_2020_outcomes";
    const framework = frameworkById.get(frameworkId);
    const mappingSet = mappingSets.find((candidate) => candidate.framework_id === frameworkId);
    const gapSet = gapSets.find((candidate) => candidate.framework_id === frameworkId);
    const resolutionSet = resolutionSets.find((candidate) => candidate.gap_set_id === gapSet?.gap_set_id);
    const practiceSet = practiceSets.find((candidate) => candidate.framework_id === frameworkId);

    expect(framework?.requirement_granularity).toBe("outcome");
    expect(framework?.requirements).toHaveLength(135);
    expect(mappingSet?.mapping_scope).toBe("outcome_coverage");
    expect(mappingSet?.mappings).toHaveLength(135);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "full")).toHaveLength(121);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "excluded")).toHaveLength(14);
    expect(
      mappingSet?.mappings.filter((mapping) => ["partial", "unmapped"].includes(mapping.coverage_status)),
    ).toHaveLength(0);
    expect(
      mappingSet?.mappings
        .filter((mapping) => mapping.coverage_status === "excluded")
        .every((mapping) => mapping.canonical_ids.length === 0),
    ).toBe(true);
    expect(gapSet?.candidates).toHaveLength(78);
    expect(resolutionSet?.resolutions).toHaveLength(78);
    expect(
      resolutionSet?.resolutions.filter((resolution) => resolution.resolution_action === "reuse_existing"),
    ).toHaveLength(5);
    expect(
      resolutionSet?.resolutions.filter(
        (resolution) => resolution.resolution_action === "add_or_alias_concepts",
      ),
    ).toHaveLength(73);
    expect(practiceSet?.items).toHaveLength(14);
    expect(seniorSecondaryPhysics.nodes.filter((node) => node.kind === "concept")).toHaveLength(73);
    expect(seniorSecondaryPhysics.nodes.filter((node) => node.kind === "topic")).toHaveLength(28);
    expect(seniorSecondaryPhysics.edges).toHaveLength(48);
    expect(seniorSecondaryPhysics.edges.every((edge) => edge.reason.length > 0)).toBe(true);
    expect(
      seniorSecondaryPhysics.nodes
        .filter((node) => node.kind === "concept")
        .every((node) => !/通过实验|实验认识|实验了解|实验探究|^观察/.test(node.description)),
    ).toBe(true);

    const concepts = new Map(seniorSecondaryPhysics.nodes.map((node) => [node.id, node] as const));
    expect(concepts.get("cn_sh_physics_light_energy_quantisation")?.canonical_id).toBe(
      "pc_667d6af1c79afd71fbd2dedbccfcc217",
    );
    expect(concepts.get("cn_sh_physics_nuclear_energy_intro")?.canonical_id).toBe(
      "pc_45e557e295944b395f08bb30c4bb963e",
    );
    expect(concepts.get("cn_sh_physics_atomic_nuclear_model")?.canonical_id).toBe(
      "pc_e180a73d3a69ee874db1ed7939a2c604",
    );
    expect(concepts.get("cn_sh_physics_matter_waves_quantisation")?.canonical_id).toBe(
      "pc_5214d7b845cac7c061ea53ff5618d522",
    );
  });

  it("resolves China senior-high chemistry at diagnostic-outcome granularity", () => {
    const frameworkId = "cfw_cn_moe_senior_high_chemistry_2020_outcomes";
    const framework = frameworkById.get(frameworkId);
    const mappingSet = mappingSets.find((candidate) => candidate.framework_id === frameworkId);
    const gapSet = gapSets.find((candidate) => candidate.framework_id === frameworkId);
    const resolutionSet = resolutionSets.find((candidate) => candidate.gap_set_id === gapSet?.gap_set_id);
    const practiceSet = practiceSets.find((candidate) => candidate.framework_id === frameworkId);

    expect(framework?.requirement_granularity).toBe("outcome");
    expect(framework?.requirements).toHaveLength(138);
    expect(mappingSet?.mapping_scope).toBe("outcome_coverage");
    expect(mappingSet?.mappings).toHaveLength(138);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "full")).toHaveLength(108);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "excluded")).toHaveLength(30);
    expect(
      mappingSet?.mappings.filter((mapping) => ["partial", "unmapped"].includes(mapping.coverage_status)),
    ).toHaveLength(0);
    expect(
      mappingSet?.mappings
        .filter((mapping) => mapping.coverage_status === "excluded")
        .every((mapping) => mapping.canonical_ids.length === 0),
    ).toBe(true);
    expect(gapSet?.candidates).toHaveLength(57);
    expect(gapSet?.candidates.filter((candidate) => candidate.action === "add_concept")).toHaveLength(31);
    expect(
      gapSet?.candidates.filter((candidate) => candidate.action === "split_or_narrow_existing"),
    ).toHaveLength(26);
    expect(resolutionSet?.resolutions).toHaveLength(57);
    expect(
      resolutionSet?.resolutions.filter((resolution) => resolution.resolution_action === "reuse_existing"),
    ).toHaveLength(7);
    expect(
      resolutionSet?.resolutions.filter(
        (resolution) => resolution.resolution_action === "add_or_alias_concepts",
      ),
    ).toHaveLength(50);
    expect(practiceSet?.items).toHaveLength(30);
    expect(seniorSecondaryChemistry.nodes.filter((node) => node.kind === "concept")).toHaveLength(49);
    expect(seniorSecondaryChemistry.nodes.filter((node) => node.kind === "topic")).toHaveLength(17);
    expect(seniorSecondaryChemistry.edges).toHaveLength(34);
    expect(seniorSecondaryChemistry.edges.every((edge) => edge.reason.length > 0)).toBe(true);
    expect(
      seniorSecondaryChemistry.nodes
        .filter((node) => node.kind === "concept")
        .every((node) => !/通过实验|实验认识|实验了解|实验探究|^观察/.test(node.description)),
    ).toBe(true);
  });

  it("resolves all numbered China senior-high biology outcomes without treating values as mastery", () => {
    const frameworkId = "cfw_cn_moe_senior_high_biology_2020_outcomes";
    const framework = frameworkById.get(frameworkId);
    const mappingSet = mappingSets.find((candidate) => candidate.framework_id === frameworkId);
    const gapSet = gapSets.find((candidate) => candidate.framework_id === frameworkId);
    const resolutionSet = resolutionSets.find((candidate) => candidate.gap_set_id === gapSet?.gap_set_id);
    const practiceSet = practiceSets.find((candidate) => candidate.framework_id === frameworkId);

    expect(framework?.requirement_granularity).toBe("outcome");
    expect(framework?.requirements).toHaveLength(120);
    expect(mappingSet?.mapping_scope).toBe("outcome_coverage");
    expect(mappingSet?.mappings).toHaveLength(120);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "full")).toHaveLength(118);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "excluded")).toHaveLength(2);
    expect(
      mappingSet?.mappings.filter((mapping) => ["partial", "unmapped"].includes(mapping.coverage_status)),
    ).toHaveLength(0);
    expect(
      mappingSet?.mappings
        .filter((mapping) => mapping.coverage_status === "excluded")
        .every((mapping) => mapping.canonical_ids.length === 0),
    ).toBe(true);
    expect(gapSet?.candidates).toHaveLength(76);
    expect(gapSet?.candidates.filter((candidate) => candidate.action === "add_concept")).toHaveLength(48);
    expect(
      gapSet?.candidates.filter((candidate) => candidate.action === "split_or_narrow_existing"),
    ).toHaveLength(28);
    expect(resolutionSet?.resolutions).toHaveLength(76);
    expect(
      resolutionSet?.resolutions.every(
        (resolution) => resolution.resolution_action === "add_or_alias_concepts",
      ),
    ).toBe(true);
    expect(practiceSet?.items).toHaveLength(2);
    expect(seniorSecondaryBiology.nodes.filter((node) => node.kind === "concept")).toHaveLength(75);
    expect(seniorSecondaryBiology.nodes.filter((node) => node.kind === "topic")).toHaveLength(26);
    expect(seniorSecondaryBiology.edges).toHaveLength(50);
    expect(seniorSecondaryBiology.edges.every((edge) => edge.reason.length > 0)).toBe(true);

    const mappings = new Map(mappingSet?.mappings.map((mapping) => [mapping.requirement_id, mapping] as const));
    const proteinDesign = mappings.get("req_cn_sh_bio_2020_o_sb_5_2_1_protein_engineering_design");
    const proteinProcess = mappings.get("req_cn_sh_bio_2020_o_sb_5_2_2_protein_engineering_process");
    const cloningEthics = mappings.get("req_cn_sh_bio_2020_o_sb_6_2_1_reproductive_cloning_ethics");
    const cloningPolicy = mappings.get("req_cn_sh_bio_2020_o_sb_6_2_2_reproductive_cloning_china_policy");
    expect(proteinDesign?.canonical_ids.at(-1)).toBe(proteinProcess?.canonical_ids.at(-1));
    expect(cloningEthics?.canonical_ids.at(-1)).not.toBe(cloningPolicy?.canonical_ids.at(-1));
  });

  it("resolves Singapore H2 mathematics outcomes while preserving practices and exclusions", () => {
    const frameworkId = "cfw_sg_seab_h2_math_9758_2026_outcomes";
    const framework = frameworkById.get(frameworkId);
    const mappingSet = mappingSets.find((candidate) => candidate.framework_id === frameworkId);
    const gapSet = gapSets.find((candidate) => candidate.framework_id === frameworkId);
    const resolutionSet = resolutionSets.find((candidate) => candidate.gap_set_id === gapSet?.gap_set_id);
    const practiceSet = practiceSets.find((candidate) => candidate.framework_id === frameworkId);

    expect(framework?.requirement_granularity).toBe("outcome");
    expect(framework?.requirements).toHaveLength(80);
    expect(framework?.scope_exclusions).toHaveLength(12);
    expect(mappingSet?.mapping_scope).toBe("outcome_coverage");
    expect(mappingSet?.mappings).toHaveLength(80);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "full")).toHaveLength(74);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "excluded")).toHaveLength(6);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "partial")).toHaveLength(0);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "unmapped")).toHaveLength(0);
    expect(
      mappingSet?.mappings
        .filter((mapping) => mapping.coverage_status === "excluded")
        .every((mapping) => mapping.canonical_ids.length === 0),
    ).toBe(true);
    expect(
      mappingSet?.mappings
        .filter((mapping) => mapping.coverage_status === "full")
        .every((mapping) => mapping.canonical_ids.length > 0),
    ).toBe(true);

    expect(gapSet?.candidates).toHaveLength(33);
    expect(gapSet?.candidates.filter((candidate) => candidate.action === "add_concept")).toHaveLength(2);
    expect(
      gapSet?.candidates.filter((candidate) => candidate.action === "split_or_narrow_existing"),
    ).toHaveLength(31);
    expect(resolutionSet?.resolutions).toHaveLength(33);
    expect(
      resolutionSet?.resolutions.every(
        (resolution) => resolution.resolution_action === "add_or_alias_concepts",
      ),
    ).toBe(true);
    expect(practiceSet?.items).toHaveLength(6);
    expect(singaporeH2Mathematics.nodes.filter((node) => node.kind === "concept")).toHaveLength(33);
    expect(singaporeH2Mathematics.nodes.filter((node) => node.kind === "topic")).toHaveLength(14);
    expect(singaporeH2Mathematics.edges).toHaveLength(20);
    expect(singaporeH2Mathematics.edges.every((edge) => edge.reason.length > 0)).toBe(true);

    const practiceRequirementIds = new Set(practiceSet?.items.flatMap((item) => item.requirement_ids));
    expect(
      mappingSet?.mappings
        .filter((mapping) => mapping.coverage_status === "excluded")
        .every((mapping) => practiceRequirementIds.has(mapping.requirement_id)),
    ).toBe(true);
  });

  it("keeps Singapore H2 scope boundaries out of concept mappings", () => {
    const frameworkId = "cfw_sg_seab_h2_math_9758_2026_outcomes";
    const framework = frameworkById.get(frameworkId);
    const mappingSet = mappingSets.find((candidate) => candidate.framework_id === frameworkId);
    const scopes = framework?.scope_exclusions?.map((exclusion) => exclusion.scope).join("\n") ?? "";
    const mappedCanonicalIds = new Set(mappingSet?.mappings.flatMap((mapping) => mapping.canonical_ids));
    const conceptText = singaporeH2Mathematics.nodes
      .filter((node) => node.kind === "concept")
      .map((node) => `${node.name}\n${node.description}`)
      .join("\n");

    expect(scopes).toContain("complex numbers in polar");
    expect(scopes).toContain("triple scalar and vector products");
    expect(scopes).toContain("normal approximation to the binomial distribution");
    expect(scopes).toContain("regression hypothesis tests");
    expect(mappedCanonicalIds.has("pc_4a777b42acfb49f7b9e295353a221e62")).toBe(false);
    expect(conceptText).not.toMatch(/triple (scalar|vector) product/i);
    expect(conceptText).not.toMatch(/normal approximation to (the )?binomial/i);
    expect(conceptText).not.toMatch(/Type I|Type II/);
  });

  it("resolves Singapore lower-secondary science without treating practices or values as mastery concepts", () => {
    const frameworkId = "cfw_sg_moe_lower_secondary_g2_g3_science_2021_outcomes";
    const framework = frameworkById.get(frameworkId);
    const mappingSet = mappingSets.find((candidate) => candidate.framework_id === frameworkId);
    const gapSet = gapSets.find((candidate) => candidate.framework_id === frameworkId);
    const resolutionSet = resolutionSets.find((candidate) => candidate.gap_set_id === gapSet?.gap_set_id);
    const practiceSet = practiceSets.find((candidate) => candidate.framework_id === frameworkId);

    expect(framework?.requirement_granularity).toBe("outcome");
    expect(framework?.requirements).toHaveLength(159);
    expect(framework?.requirements.filter((requirement) => requirement.requirement_type === "knowledge")).toHaveLength(80);
    expect(framework?.requirements.filter((requirement) => requirement.requirement_type === "practice")).toHaveLength(79);
    expect(framework?.requirements.filter((requirement) => requirement.summary_zh.includes("G2 可选"))).toHaveLength(34);
    expect(mappingSet?.mapping_scope).toBe("outcome_coverage");
    expect(mappingSet?.mappings).toHaveLength(159);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "full")).toHaveLength(80);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "excluded")).toHaveLength(79);
    expect(
      mappingSet?.mappings.filter((mapping) => ["partial", "unmapped"].includes(mapping.coverage_status)),
    ).toHaveLength(0);
    expect(
      mappingSet?.mappings
        .filter((mapping) => mapping.coverage_status === "excluded")
        .every((mapping) => mapping.canonical_ids.length === 0),
    ).toBe(true);

    expect(gapSet?.candidates).toHaveLength(62);
    expect(gapSet?.candidates.filter((candidate) => candidate.action === "add_concept")).toHaveLength(23);
    expect(gapSet?.candidates.filter((candidate) => candidate.action === "split_or_narrow_existing")).toHaveLength(39);
    expect(resolutionSet?.resolutions).toHaveLength(62);
    expect(
      resolutionSet?.resolutions.every(
        (resolution) => resolution.resolution_action === "add_or_alias_concepts",
      ),
    ).toBe(true);
    expect(practiceSet?.items).toHaveLength(31);
    expect(practiceSet?.items.flatMap((item) => item.requirement_ids)).toHaveLength(79);

    const concepts = singaporeLowerSecondaryScience.nodes.filter((node) => node.kind === "concept");
    expect(concepts).toHaveLength(32);
    expect(singaporeLowerSecondaryScience.nodes.filter((node) => node.kind === "topic")).toHaveLength(15);
    expect(singaporeLowerSecondaryScience.edges).toHaveLength(19);
    expect(singaporeLowerSecondaryScience.edges.every((edge) => edge.reason.length > 0)).toBe(true);
    expect(
      concepts.every((concept) => {
        const sourceIds = new Set(concept.evidence_refs.map((ref) => ref.source_id));
        return sourceIds.has("src_sg_moe_lower_secondary_g2_g3_science_2021") &&
          [...sourceIds].some((sourceId) => sourceId.startsWith("src_openstax_"));
      }),
    ).toBe(true);

    const practiceRequirementIds = new Set(practiceSet?.items.flatMap((item) => item.requirement_ids));
    expect(
      mappingSet?.mappings
        .filter((mapping) => mapping.coverage_status === "excluded")
        .every((mapping) => practiceRequirementIds.has(mapping.requirement_id)),
    ).toBe(true);
  });

  it("resolves Singapore H2 Physics outcomes without turning experimental practices into mastery concepts", () => {
    const frameworkId = "cfw_sg_seab_h2_physics_9478_2026_outcomes";
    const framework = frameworkById.get(frameworkId);
    const mappingSet = mappingSets.find((candidate) => candidate.framework_id === frameworkId);
    const gapSet = gapSets.find((candidate) => candidate.framework_id === frameworkId);
    const resolutionSet = resolutionSets.find((candidate) => candidate.gap_set_id === gapSet?.gap_set_id);
    const practiceSet = practiceSets.find((candidate) => candidate.framework_id === frameworkId);

    expect(framework?.requirement_granularity).toBe("outcome");
    expect(framework?.requirements).toHaveLength(215);
    expect(framework?.requirements.filter((requirement) => requirement.requirement_type === "knowledge")).toHaveLength(201);
    expect(framework?.requirements.filter((requirement) => requirement.requirement_type === "practice")).toHaveLength(14);
    expect(framework?.scope_exclusions).toHaveLength(5);
    expect(mappingSet?.mapping_scope).toBe("outcome_coverage");
    expect(mappingSet?.mappings).toHaveLength(215);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "full")).toHaveLength(201);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "excluded")).toHaveLength(14);
    expect(
      mappingSet?.mappings.filter((mapping) => ["partial", "unmapped"].includes(mapping.coverage_status)),
    ).toHaveLength(0);
    expect(
      mappingSet?.mappings
        .filter((mapping) => mapping.coverage_status === "excluded")
        .every((mapping) => mapping.canonical_ids.length === 0),
    ).toBe(true);

    expect(gapSet?.candidates).toHaveLength(12);
    expect(resolutionSet?.resolutions).toHaveLength(12);
    expect(
      resolutionSet?.resolutions.every(
        (resolution) => resolution.resolution_action === "add_or_alias_concepts",
      ),
    ).toBe(true);
    expect(practiceSet?.items).toHaveLength(14);
    expect(practiceSet?.items.flatMap((item) => item.requirement_ids)).toHaveLength(14);

    const concepts = singaporeH2Physics.nodes.filter((node) => node.kind === "concept");
    expect(concepts).toHaveLength(8);
    expect(singaporeH2Physics.nodes.filter((node) => node.kind === "topic")).toHaveLength(3);
    expect(singaporeH2Physics.edges).toHaveLength(4);
    expect(singaporeH2Physics.edges.every((edge) => edge.reason.length > 0)).toBe(true);
    expect(
      concepts.every((concept) => {
        const sourceIds = new Set(concept.evidence_refs.map((ref) => ref.source_id));
        return sourceIds.has("src_sg_seab_h2_physics_9478_2026") &&
          [...sourceIds].some((sourceId) => sourceId.startsWith("src_openstax_"));
      }),
    ).toBe(true);

    const practiceRequirementIds = new Set(practiceSet?.items.flatMap((item) => item.requirement_ids));
    expect(
      mappingSet?.mappings
        .filter((mapping) => mapping.coverage_status === "excluded")
        .every((mapping) => practiceRequirementIds.has(mapping.requirement_id)),
    ).toBe(true);
  });

  it("resolves Singapore H2 Chemistry outcomes without widening explicit syllabus exclusions", () => {
    const frameworkId = "cfw_sg_seab_h2_chemistry_9476_2026_outcomes";
    const framework = frameworkById.get(frameworkId);
    const mappingSet = mappingSets.find((candidate) => candidate.framework_id === frameworkId);
    const gapSet = gapSets.find((candidate) => candidate.framework_id === frameworkId);
    const resolutionSet = resolutionSets.find((candidate) => candidate.gap_set_id === gapSet?.gap_set_id);
    const practiceSet = practiceSets.find((candidate) => candidate.framework_id === frameworkId);

    expect(framework?.requirement_granularity).toBe("outcome");
    expect(framework?.requirements).toHaveLength(201);
    expect(framework?.requirements.filter((requirement) => requirement.requirement_type === "knowledge")).toHaveLength(193);
    expect(framework?.requirements.filter((requirement) => requirement.requirement_type === "practice")).toHaveLength(8);
    expect(framework?.scope_exclusions).toHaveLength(12);
    expect(mappingSet?.mapping_scope).toBe("outcome_coverage");
    expect(mappingSet?.mappings).toHaveLength(201);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "full")).toHaveLength(193);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "excluded")).toHaveLength(8);
    expect(
      mappingSet?.mappings.filter((mapping) => ["partial", "unmapped"].includes(mapping.coverage_status)),
    ).toHaveLength(0);
    expect(
      mappingSet?.mappings
        .filter((mapping) => mapping.coverage_status === "excluded")
        .every((mapping) => mapping.canonical_ids.length === 0),
    ).toBe(true);

    expect(gapSet?.candidates).toHaveLength(21);
    expect(resolutionSet?.resolutions).toHaveLength(21);
    expect(
      resolutionSet?.resolutions.every(
        (resolution) => resolution.resolution_action === "add_or_alias_concepts",
      ),
    ).toBe(true);
    expect(practiceSet?.items).toHaveLength(8);
    expect(practiceSet?.items.flatMap((item) => item.requirement_ids)).toHaveLength(8);

    const concepts = singaporeH2Chemistry.nodes.filter((node) => node.kind === "concept");
    expect(concepts).toHaveLength(18);
    expect(singaporeH2Chemistry.nodes.filter((node) => node.kind === "topic")).toHaveLength(7);
    expect(singaporeH2Chemistry.edges).toHaveLength(6);
    expect(singaporeH2Chemistry.edges.every((edge) => edge.reason.length > 0)).toBe(true);
    expect(
      concepts.every((concept) => {
        const sourceIds = new Set(concept.evidence_refs.map((ref) => ref.source_id));
        return sourceIds.has("src_sg_seab_h2_chemistry_9476_2026") &&
          [...sourceIds].some((sourceId) => sourceId.startsWith("src_openstax_"));
      }),
    ).toBe(true);

    const exclusions = framework?.scope_exclusions?.map((exclusion) => exclusion.scope).join("\n") ?? "";
    expect(exclusions).toContain("atomic orbital wave functions");
    expect(exclusions).toContain("integrated rate equations");
    expect(exclusions).toContain("E/Z nomenclature");
    expect(exclusions).toContain("relative ligand-field strength ordering");
    const practiceRequirementIds = new Set(practiceSet?.items.flatMap((item) => item.requirement_ids));
    expect(
      mappingSet?.mappings
        .filter((mapping) => mapping.coverage_status === "excluded")
        .every((mapping) => practiceRequirementIds.has(mapping.requirement_id)),
    ).toBe(true);
  });

  it("resolves Singapore H2 Biology outcomes while separating investigations from concept mastery", () => {
    const frameworkId = "cfw_sg_seab_h2_biology_9477_2026_outcomes";
    const framework = frameworkById.get(frameworkId);
    const mappingSet = mappingSets.find((candidate) => candidate.framework_id === frameworkId);
    const gapSet = gapSets.find((candidate) => candidate.framework_id === frameworkId);
    const resolutionSet = resolutionSets.find((candidate) => candidate.gap_set_id === gapSet?.gap_set_id);
    const practiceSet = practiceSets.find((candidate) => candidate.framework_id === frameworkId);

    expect(framework?.requirement_granularity).toBe("outcome");
    expect(framework?.requirements).toHaveLength(108);
    expect(framework?.requirements.filter((requirement) => requirement.requirement_type === "knowledge")).toHaveLength(98);
    expect(framework?.requirements.filter((requirement) => requirement.requirement_type === "skill")).toHaveLength(3);
    expect(framework?.requirements.filter((requirement) => requirement.requirement_type === "practice")).toHaveLength(7);
    expect(framework?.scope_exclusions).toHaveLength(11);
    expect(mappingSet?.mapping_scope).toBe("outcome_coverage");
    expect(mappingSet?.mappings).toHaveLength(108);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "full")).toHaveLength(101);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "excluded")).toHaveLength(7);
    expect(
      mappingSet?.mappings.filter((mapping) => ["partial", "unmapped"].includes(mapping.coverage_status)),
    ).toHaveLength(0);
    expect(
      mappingSet?.mappings
        .filter((mapping) => mapping.coverage_status === "excluded")
        .every((mapping) => mapping.canonical_ids.length === 0),
    ).toBe(true);

    expect(gapSet?.candidates).toHaveLength(45);
    expect(resolutionSet?.resolutions).toHaveLength(45);
    expect(
      resolutionSet?.resolutions.every(
        (resolution) => resolution.resolution_action === "add_or_alias_concepts",
      ),
    ).toBe(true);
    expect(practiceSet?.items).toHaveLength(10);
    expect(practiceSet?.items.flatMap((item) => item.requirement_ids)).toHaveLength(10);

    const concepts = singaporeH2Biology.nodes.filter((node) => node.kind === "concept");
    expect(concepts).toHaveLength(42);
    expect(singaporeH2Biology.nodes.filter((node) => node.kind === "topic")).toHaveLength(14);
    expect(singaporeH2Biology.edges).toHaveLength(31);
    expect(singaporeH2Biology.edges.every((edge) => edge.reason.length > 0)).toBe(true);
    expect(
      concepts.every((concept) => {
        const sourceIds = new Set(concept.evidence_refs.map((ref) => ref.source_id));
        return sourceIds.has("src_sg_seab_h2_biology_9477_2026") &&
          [...sourceIds].some((sourceId) => sourceId.startsWith("src_openstax_"));
      }),
    ).toBe(true);

    const mixedPracticeIds = new Set([
      "req_sg_h2_biology_9477_2026_o_1_q",
      "req_sg_h2_biology_9477_2026_o_3_e",
      "req_sg_h2_biology_9477_2026_o_3_k",
    ]);
    expect(
      mappingSet?.mappings
        .filter((mapping) => mixedPracticeIds.has(mapping.requirement_id))
        .every((mapping) => mapping.coverage_status === "full" && mapping.canonical_ids.length > 0),
    ).toBe(true);
    const practiceRequirementIds = new Set(practiceSet?.items.flatMap((item) => item.requirement_ids));
    expect([...mixedPracticeIds].every((id) => practiceRequirementIds.has(id))).toBe(true);
    expect(
      mappingSet?.mappings
        .filter((mapping) => mapping.coverage_status === "excluded")
        .every((mapping) => practiceRequirementIds.has(mapping.requirement_id)),
    ).toBe(true);
  });

  it("resolves Singapore G2/G3 secondary mathematics without duplicating cross-level concepts", () => {
    const frameworkId = "cfw_sg_moe_secondary_g2_g3_math_2020_outcomes";
    const framework = frameworkById.get(frameworkId);
    const mappingSet = mappingSets.find((candidate) => candidate.framework_id === frameworkId);
    const gapSet = gapSets.find((candidate) => candidate.framework_id === frameworkId);
    const resolutionSet = resolutionSets.find((candidate) => candidate.gap_set_id === gapSet?.gap_set_id);
    const practiceSet = practiceSets.find((candidate) => candidate.framework_id === frameworkId);
    const mappings = new Map(
      mappingSet?.mappings.map((mapping) => [mapping.requirement_id, mapping] as const) ?? [],
    );
    const concepts = new Map(
      singaporeSecondaryMathematics.nodes.map((node) => [node.id, node] as const),
    );

    expect(framework?.requirement_granularity).toBe("outcome");
    expect(framework?.requirements).toHaveLength(163);
    expect(
      framework?.requirements.filter((requirement) =>
        requirement.requirement_id.startsWith("req_sg_sec_math_2020_g2_sec5_bridge_"),
      ),
    ).toHaveLength(8);
    expect(mappingSet?.mapping_scope).toBe("outcome_coverage");
    expect(mappingSet?.mappings).toHaveLength(163);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "full")).toHaveLength(153);
    expect(mappingSet?.mappings.filter((mapping) => mapping.coverage_status === "excluded")).toHaveLength(10);
    expect(
      mappingSet?.mappings.filter((mapping) => ["partial", "unmapped"].includes(mapping.coverage_status)),
    ).toHaveLength(0);
    expect(gapSet?.candidates).toHaveLength(118);
    expect(resolutionSet?.resolutions).toHaveLength(118);
    expect(
      resolutionSet?.resolutions.filter((resolution) => resolution.resolution_action === "reuse_existing"),
    ).toHaveLength(6);
    expect(
      resolutionSet?.resolutions.filter(
        (resolution) => resolution.resolution_action === "add_or_alias_concepts",
      ),
    ).toHaveLength(112);
    expect(practiceSet?.items).toHaveLength(10);
    expect(singaporeSecondaryMathematics.nodes.filter((node) => node.kind === "concept")).toHaveLength(53);
    expect(singaporeSecondaryMathematics.nodes.filter((node) => node.kind === "topic")).toHaveLength(18);
    expect(singaporeSecondaryMathematics.edges).toHaveLength(58);

    expect(
      mappings.get("req_sg_sec_math_2020_g3_sec1_prime_factorisation")?.canonical_ids,
    ).toEqual(mappings.get("req_sg_sec_math_2020_g2_sec1_prime_factorisation")?.canonical_ids);
    expect(
      mappings.get("req_sg_sec_math_2020_g3_sec2_algebraic_fractions_multiply_divide")?.canonical_ids,
    ).toEqual([concepts.get("sg_sec_math_algebraic_fractions_multiply_divide")?.canonical_id]);
    expect(
      mappings.get("req_sg_sec_math_2020_g3_sec2_algebraic_fractions_add_subtract")?.canonical_ids,
    ).toEqual([concepts.get("sg_sec_math_algebraic_fractions_add_subtract")?.canonical_id]);
    expect(
      mappings.get("req_sg_sec_math_2020_g3_sec3_4_quadratic_formula_complete_graph")?.canonical_ids,
    ).not.toContain(concepts.get("sg_sec_math_quadratic_factorisation_solve")?.canonical_id);
  });

  it("reuses audited bisection and regression concepts and preserves restricted derivative scope", () => {
    const frameworkId = "cfw_cn_moe_senior_high_math_2020_outcomes";
    const mappingSet = mappingSets.find((candidate) => candidate.framework_id === frameworkId);
    const mappings = new Map(mappingSet?.mappings.map((mapping) => [mapping.requirement_id, mapping]));
    expect(mappings.get("req_cn_sh_math_2020_o_bisection_method")?.canonical_ids).toContain(
      "pc_d14f06a56976778d0616245d88284721",
    );
    expect(mappings.get("req_cn_sh_math_2020_o_linear_regression")?.canonical_ids).toContain(
      "pc_ed18cde6c3d7e08e9e371061418a7424",
    );
    expect(mappings.get("req_cn_sh_math_2020_o_simple_linear_composites")?.canonical_ids).not.toContain(
      "pc_5f2b3d511ffa1447c2f7fda25d724789",
    );
    expect(mappings.get("req_cn_sh_math_2020_o_complex_representation")?.canonical_ids).toEqual([
      "pc_4fd2ad2b9b71d4427e9ebeb4d81159ec",
      "pc_8b0b34fcb52404046ccbf41b402895fd",
    ]);
    expect(mappings.get("req_cn_sh_math_2020_o_complex_arithmetic")?.canonical_ids).toEqual([
      "pc_84fa9a959816d2fd778aec459c7e0020",
      "pc_c04ce0aed24384aaa5b223f59282d31c",
    ]);
  });

  it("requires two authority types for resolved knowledge and keeps new content pending", () => {
    const sourceById = new Map(sourceRegistry.sources.map((source) => [source.source_id, source]));
    for (const resolutionSet of resolutionSets) {
      for (const resolution of resolutionSet.resolutions) {
        expect(resolution.review_status).toBe("needs_review");
        if (resolution.resolution_action === "route_practice") continue;
        expect(
          new Set(resolution.evidence_refs.map((ref) => sourceById.get(ref.source_id)?.resource_type)).size,
        ).toBeGreaterThanOrEqual(2);
      }
    }
    for (const graph of [
      seniorSecondaryMathematics,
      seniorSecondaryPhysics,
      seniorSecondaryChemistry,
      seniorSecondaryBiology,
      singaporeH2Mathematics,
      singaporeH2Chemistry,
      singaporeH2Physics,
      singaporeH2Biology,
      singaporeSecondaryMathematics,
      singaporeLowerSecondaryScience,
    ]) {
      for (const node of graph.nodes.filter((candidate) => candidate.kind === "concept")) {
        expect(node.review_status).toBe("needs_review");
        expect(
          new Set(node.evidence_refs.map((ref) => sourceById.get(ref.source_id)?.resource_type)).size,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("pins verified sources and keeps audited evidence locators concept-specific", () => {
    expect(
      sourceRegistry.sources
        .filter((source) => source.verification_status === "verified")
        .every((source) => /^[a-f0-9]{64}$/.test(source.sha256 ?? "")),
    ).toBe(true);

    for (const node of seniorSecondaryMathematics.nodes.filter((candidate) => candidate.kind === "concept")) {
      expect(
        node.evidence_refs.every(
          (ref) => !/Course unit\/session index|^Chapters?$|official (home)?page$/i.test(ref.locator),
        ),
      ).toBe(true);
    }

    const nodes = new Map(seniorSecondaryMathematics.nodes.map((node) => [node.id, node]));
    expect(nodes.get("cn_sh_math_basic_inequality_optimization")?.evidence_refs[1]?.source_id).toBe(
      "src_pep_high_school_math_5a_2007",
    );
    expect(nodes.get("cn_sh_math_oblique_drawings")?.evidence_refs[1]?.source_id).toBe(
      "src_pep_math_oblique_drawing_2023",
    );
    expect(nodes.get("cn_sh_math_total_probability_formula")?.evidence_refs[1]?.source_id).toBe(
      "src_berkeley_cs70_summer_2026",
    );
    expect(nodes.get("cn_sh_math_complex_addition_geometry")?.evidence_refs[1]?.source_id).toBe(
      "src_mit_ocw_strang_calculus_ch9_2023",
    );
    expect(nodes.get("cn_sh_math_complex_arithmetic")?.description).toContain("除法可使用共轭因子");
  });

  it("keeps manually rejected cross-level and out-of-scope associations out", () => {
    const mappings = new Map(
      mappingSets.flatMap((mappingSet) =>
        mappingSet.mappings.map((mapping) => [mapping.requirement_id, mapping] as const),
      ),
    );
    const forbiddenAssociations = [
      ["req_sg_lss_science_2021_o_3_elements_building_blocks", "pc_d3750ab7dae24f534aee9f39f91e5f71"],
      ["req_sg_lss_science_2021_o_8_molecule_definition", "pc_4b92b05bd4662531b6bc415778fee240"],
      ["req_sg_lss_science_2021_o_9_force_effects_energy_transfer", "pc_b2063844cb1a96c55e14253c14719d9f"],
      ["req_sg_lss_science_2021_o_10_heat_transfer_modes", "pc_8bf886ad6cb9328616d017e223a93562"],
      ["req_sg_lss_science_2021_o_15_blood_vessel_transport_functions", "pc_ff5a585bec0e26749bef92e5b2ec6c2c"],
      ["req_sg_lss_science_2021_o_16_sexual_reproduction_heredity", "pc_9a64e0d9f35ef30bda722f5b7364e0c4"],
      ["req_sg_sec_math_2020_g3_sec3_4_combined_probability", "pc_cf8dbc5bcf596f0c4db74ea9886540a1"],
      ["req_sg_h2_math_9758_2026_o_series_operations_convergence", "pc_57ca5674eaf8c8ddc02a9fd067f2bc9d"],
      ["req_sg_h2_physics_9478_2026_o_10_mechanical_em_waves", "pc_848e887fae7cc6a91b04034356837749"],
      ["req_sg_h2_physics_9478_2026_o_16_resistor_network_potential_divider", "pc_25028ede682da65993323dd0b92f1be2"],
      ["req_sg_h2_physics_9478_2026_o_17_magnetic_field_sources", "pc_0ac1a9b423ea23707f535871282ddf9d"],
      ["req_sg_h2_physics_9478_2026_o_18_faraday_lenz_laws", "pc_59e12d506a4af7b6eb6e216f444dacee"],
      ["req_sg_h2_biology_9477_2026_o_2_d", "pc_f8f492dd44bddf661b72393796961c7c"],
      ["req_sg_h2_biology_9477_2026_o_b_a", "pc_ec9ed2577284952c142079dc7a389627"],
      ["req_cn_sh_math_2020_r_probability", "pc_cf8dbc5bcf596f0c4db74ea9886540a1"],
      ["req_cn_sh_math_2020_sr_derivatives", "pc_5ada2e4818384405fb8ea25e390ece93"],
      ["req_cn_sh_math_2020_o_simple_linear_composites", "pc_5f2b3d511ffa1447c2f7fda25d724789"],
      ["req_cn_sh_math_2020_o_total_probability_formula", "pc_8da482016bf0b39c87a24d36add87c8f"],
      ["req_cn_sh_physics_2020_o_r3_3_2_4a_closed_circuit_ohm", "pc_25028ede682da65993323dd0b92f1be2"],
      ["req_cn_sh_physics_2020_o_sr2_2_3_2_electromagnetic_oscillation", "pc_59e12d506a4af7b6eb6e216f444dacee"],
      ["req_cn_sh_chem_2020_o_se_1_2a_enthalpy_thermochemical_equations", "pc_bfa955bbd69e70b920c7ee7eb712d904"],
      ["req_cn_sh_chem_2020_o_se_2_2a_rate_representation_measurement", "pc_291961cf58135ba94c28bbda239d23ec"],
      ["req_cn_sh_bio_2020_o_rg_4_2_3_adaptation_natural_selection", "pc_ff6c4a398294b049cadd95acd7c8ace2"],
    ] as const;

    for (const [requirementId, canonicalId] of forbiddenAssociations) {
      expect(mappings.get(requirementId)?.canonical_ids).not.toContain(canonicalId);
    }
  });

  it("uses registered metadata-only official sources with page-level evidence", () => {
    const sources = new Map(sourceRegistry.sources.map((source) => [source.source_id, source]));
    for (const framework of frameworks) {
      for (const sourceId of framework.source_ids) {
        expect(sources.get(sourceId)?.storage_policy).toBe("metadata_only");
      }
      for (const requirement of framework.requirements) {
        expect(requirement.evidence_refs.length).toBeGreaterThan(0);
        expect(requirement.evidence_refs.every((ref) => /PDF|附件/.test(ref.locator))).toBe(true);
      }
    }
    for (const mappingSet of mappingSets) {
      for (const sourceId of mappingSet.source_ids) {
        expect(sources.get(sourceId)?.storage_policy).toBe("metadata_only");
      }
      expect(mappingSet.mappings.every((mapping) => mapping.evidence_refs.length > 0)).toBe(true);
    }
  });
});
