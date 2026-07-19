import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type EvidenceRef = { source_id: string; locator: string };
type EmpiricalSupport = {
  claim_scope: "observed_in_study_population" | "reported_by_examiners";
  population_zh: string;
  study_context_zh: string;
  finding_zh: string;
  generalisability_zh: string;
};
type Misconception = {
  misconception_id: string;
  statement_zh: string;
  prevalence_basis: string;
  empirical_support?: EmpiricalSupport;
  evidence_refs: EvidenceRef[];
  review_status: string;
};
type Strategy = {
  strategy_id: string;
  sequence_zh: string[];
  evidence_basis: string;
  evidence_refs: EvidenceRef[];
  review_status: string;
};
type Probe = {
  probe_id: string;
  prompt_zh: string;
  expected_evidence_zh: string;
  scoring_criteria_zh: string[];
  targets_misconception_ids: string[];
  evidence_basis: string;
  evidence_refs: EvidenceRef[];
  review_status: string;
};
type Profile = {
  profile_id: string;
  canonical_id: string;
  graph_id: string;
  node_id: string;
  subject: string;
  jurisdictions: string[];
  title_zh: string;
  misconception_candidates: Misconception[];
  instructional_strategies: Strategy[];
  assessment_probes: Probe[];
  evidence_refs: EvidenceRef[];
  review_status: string;
};
type ProfileSet = {
  profile_set_id: string;
  source_ids: string[];
  review_status: string;
  profiles: Profile[];
};
type Graph = {
  graph_id: string;
  nodes: Array<{ id: string; kind: string; canonical_id?: string }>;
};
type SourceRegistry = {
  sources: Array<{
    source_id: string;
    resource_type: string;
    authority_tier: string;
    verification_status: string;
  }>;
};

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;
const profileSet = readJson<ProfileSet>(
  resolve(repoRoot, "data/knowledge-graphs/pedagogy/core/cn_sg_core_pedagogy.v1.json"),
);
const sourceRegistry = readJson<SourceRegistry>(
  resolve(repoRoot, "data/knowledge-graphs/governance/sources.json"),
);
const graphs = new Map(
  readdirSync(resolve(repoRoot, "data/knowledge-graphs/source"))
    .filter((name) => name.endsWith(".json") && !["cross_subject_edges.json", "kg_zh_labels.json"].includes(name))
    .map((name) => {
      const graph = readJson<Graph>(resolve(repoRoot, "data/knowledge-graphs/source", name));
      return [graph.graph_id, graph] as const;
    }),
);

describe("pedagogical knowledge governance", () => {
  it("provides a balanced manually curated core batch for China and Singapore", () => {
    expect(profileSet.profile_set_id).toBe("pps_cn_sg_core_pedagogy_v1");
    expect(profileSet.review_status).toBe("needs_review");
    expect(profileSet.profiles).toHaveLength(48);
    expect(profileSet.profiles.filter((profile) => profile.jurisdictions.includes("CN-MAINLAND"))).toHaveLength(24);
    expect(profileSet.profiles.filter((profile) => profile.jurisdictions.includes("SG"))).toHaveLength(24);
    for (const subject of ["Mathematics", "Physics", "Chemistry", "Biology"]) {
      expect(profileSet.profiles.filter((profile) => profile.subject === subject)).toHaveLength(12);
    }
  });

  it("links every profile to the declared canonical concept and two authority types", () => {
    const sourceById = new Map(sourceRegistry.sources.map((source) => [source.source_id, source]));
    for (const profile of profileSet.profiles) {
      const graph = graphs.get(profile.graph_id);
      const node = graph?.nodes.find((candidate) => candidate.id === profile.node_id && candidate.kind === "concept");
      expect(node?.canonical_id).toBe(profile.canonical_id);
      expect(profileSet.source_ids).toEqual(expect.arrayContaining(profile.evidence_refs.map((ref) => ref.source_id)));
      expect(
        new Set(profile.evidence_refs.map((ref) => sourceById.get(ref.source_id)?.resource_type)).size,
      ).toBeGreaterThanOrEqual(2);
      expect(profile.review_status).toBe("needs_review");
    }
  });

  it("separates scoped empirical findings from diagnostic hypotheses and gives each one a scored probe", () => {
    const misconceptions = profileSet.profiles.flatMap((profile) => profile.misconception_candidates);
    const probes = profileSet.profiles.flatMap((profile) => profile.assessment_probes);
    const strategies = profileSet.profiles.flatMap((profile) => profile.instructional_strategies);

    const empirical = misconceptions.filter((item) => item.prevalence_basis === "empirically_documented");
    const hypotheses = misconceptions.filter((item) => item.prevalence_basis === "diagnostic_hypothesis");
    const sourceById = new Map(sourceRegistry.sources.map((source) => [source.source_id, source]));

    expect(misconceptions).toHaveLength(96);
    expect(probes).toHaveLength(96);
    expect(strategies).toHaveLength(48);
    expect(new Set(misconceptions.map((item) => item.statement_zh)).size).toBe(96);
    expect(new Set(probes.map((item) => item.prompt_zh)).size).toBe(96);
    expect(empirical).toHaveLength(5);
    expect(hypotheses).toHaveLength(91);
    expect(new Set(empirical.map((item) => item.misconception_id))).toEqual(new Set([
      "mis_sg_bio_virus_life_boundary_virus_is_cell",
      "mis_sg_math_log_laws_cancel_log_operator",
      "mis_sg_math_log_laws_distribute_subtraction",
      "mis_cn_physics_friction_always_opposes_motion",
      "mis_sg_chem_base_dissociation_strength_equals_concentration",
    ]));
    expect(hypotheses.every((item) => !item.empirical_support)).toBe(true);
    expect(hypotheses.every((item) => !/学生普遍|多数学生|大多数学生|常见误区/.test(item.statement_zh))).toBe(true);
    expect(empirical.every((item) => item.empirical_support?.generalisability_zh.length)).toBe(true);
    expect(empirical.every((item) => item.evidence_refs.some((ref) => {
      const source = sourceById.get(ref.source_id);
      return source?.verification_status === "verified"
        && ["A", "B"].includes(source.authority_tier)
        && ["education_research", "examiner_report"].includes(source.resource_type);
    }))).toBe(true);
    const empiricalById = new Map(empirical.map((item) => [item.misconception_id, item]));
    expect(empiricalById.get("mis_sg_math_log_laws_cancel_log_operator")?.empirical_support?.population_zh)
      .toMatch(/81.*79/);
    expect(empiricalById.get("mis_cn_physics_friction_always_opposes_motion")?.empirical_support?.population_zh)
      .toMatch(/496.*492.*194/);
    expect(empiricalById.get("mis_sg_chem_base_dissociation_strength_equals_concentration")?.empirical_support?.population_zh)
      .toMatch(/141.*92/);
    expect(strategies.every((item) => item.evidence_basis === "concept_boundary_design")).toBe(true);
    expect(probes.every((item) => item.evidence_basis === "curriculum_assessment_alignment")).toBe(true);
    expect(strategies.every((item) => item.sequence_zh.length >= 2)).toBe(true);
    expect(probes.every((item) => item.scoring_criteria_zh.length >= 2)).toBe(true);

    for (const profile of profileSet.profiles) {
      const misconceptionIds = new Set(profile.misconception_candidates.map((item) => item.misconception_id));
      const targetedIds = new Set(profile.assessment_probes.flatMap((probe) => probe.targets_misconception_ids));
      expect(targetedIds).toEqual(misconceptionIds);
      expect(
        profile.assessment_probes.every((probe) =>
          probe.targets_misconception_ids.every((id) => misconceptionIds.has(id)),
        ),
      ).toBe(true);
    }
  });

  it("contains mechanism-level probes rather than generic self-report checks", () => {
    const byId = new Map(profileSet.profiles.map((profile) => [profile.profile_id, profile]));
    expect(
      byId.get("ped_profile_cn_math_regression_limits")?.assessment_probes
        .map((probe) => `${probe.prompt_zh}\n${probe.expected_evidence_zh}`)
        .join("\n"),
    ).toContain("因果");
    expect(
      byId.get("ped_profile_sg_physics_wavefunction_probability")?.assessment_probes
        .map((probe) => probe.expected_evidence_zh)
        .join("\n"),
    ).toContain("交叉项");
    expect(
      byId.get("ped_profile_sg_bio_vaccination_tradeoffs")?.assessment_probes
        .map((probe) => probe.scoring_criteria_zh)
        .flat()
        .join("\n"),
    ).toContain("群体机制");
  });
});
