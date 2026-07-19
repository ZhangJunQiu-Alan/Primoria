import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type EvidenceRef = { source_id: string; locator: string };
type GraphNode = {
  id: string;
  kind: "topic" | "concept";
  canonical_id?: string;
  evidence_refs: EvidenceRef[];
  review_status: string;
};
type GraphEdge = { evidence_refs: EvidenceRef[]; review_status: string };
type GraphSource = {
  graph_id: string;
  schema_version: string;
  content_version: string;
  source_ids: string[];
  review_status: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
};
type ConceptRegistry = {
  concepts: Array<{
    canonical_id: string;
    aliases: Array<{ graph_id: string; node_id: string }>;
  }>;
};
type SourceRegistry = { sources: Array<{ source_id: string }> };
type CoveragePack = {
  graph_id: string;
  source_id: string;
  review_status: string;
  sections: Array<{
    outcomes: Array<{
      outcome_id: string;
      source_locator: string;
      pdf_page: number;
      printed_page: number;
      text_sha256: string;
      keywords: string[];
      review_status: string;
      requirement_type: string;
      coverage_signal: string;
      summary_zh: string;
      machine_audit_override: boolean;
      machine_audit_note_zh: string | null;
      candidate_concepts: Array<{ node_id: string }>;
    }>;
  }>;
};

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const sourceDir = `${repoRoot}/data/knowledge-graphs/source`;
const governanceDir = `${repoRoot}/data/knowledge-graphs/governance`;
const reviewDir = `${repoRoot}/data/knowledge-graphs/review/pending/a-level`;

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

const graphFiles = readdirSync(sourceDir)
  .filter((name) => name.endsWith(".json") && !["cross_subject_edges.json", "kg_zh_labels.json"].includes(name))
  .sort();
const graphs = graphFiles.map((name) => readJson<GraphSource>(`${sourceDir}/${name}`));
const conceptRegistry = readJson<ConceptRegistry>(`${governanceDir}/concept-registry.json`);
const sourceRegistry = readJson<SourceRegistry>(`${governanceDir}/sources.json`);
const approvedMathOutcomeMappings = new Map<string, string[]>([
  ["9709:1.2:5", ["mat_graph_transformations"]],
  ["9709:2.5:3", ["mat_trapezium_rule"]],
  ["9709:4.1:5", ["mat_smooth_contact"]],
  ["9709:4.4:2", ["mat_mass_weight"]],
  ["9709:6.3:1", ["mat_continuous_random_variables", "mat_probability_density_function"]],
  ["9709:6.3:2", ["mat_probability_density_function"]],
  ["9709:6.4:6", ["mat_statistical_estimation"]],
  ["9709:6.4:7", ["mat_statistical_estimation"]],
  ["9709:6.4:8", ["mat_statistical_estimation"]],
]);
const approvedMathConceptIds = new Set([...approvedMathOutcomeMappings.values()].flat());
const approvedPhysicsOutcomeMappings = new Map<string, string[]>([
  ["9702:3.2:3", ["phy_terminal_velocity"]],
  ["9702:4.1:1", ["phy_centre_of_gravity"]],
  ["9702:7.1:3", ["phy_progressive_waves"]],
  ["9702:7.5:2", ["phy_polarisation_malus"]],
  ["9702:9.3:7", ["phy_resistive_sensors"]],
  ["9702:9.3:8", ["phy_resistive_sensors"]],
  ["9702:10.1:1", ["phy_series_parallel"]],
  ["9702:10.3:3", ["phy_potentiometer_null_methods"]],
  ["9702:11.1:4", ["phy_isotopes"]],
  ["9702:11.1:6", ["phy_radioactive_decay"]],
  ["9702:11.1:10", ["phy_radioactive_decay"]],
  ["9702:11.1:12", ["phy_binding_energy"]],
  ["9702:14.2:1", ["phy_thermometry"]],
  ["9702:14.2:2", ["phy_thermometry"]],
  ["9702:15.1:2", ["phy_mole_avogadro"]],
  ["9702:15.2:3", ["phy_ideal_gas"]],
  ["9702:20.3:3", ["phy_hall_effect"]],
  ["9702:24.1:1", ["phy_piezoelectric_transducers"]],
  ["9702:24.1:2", ["phy_piezoelectric_transducers"]],
  ["9702:24.1:3", ["phy_ultrasound_imaging"]],
  ["9702:24.1:4", ["phy_acoustic_impedance_reflection"]],
  ["9702:24.1:5", ["phy_acoustic_impedance_reflection"]],
  ["9702:24.1:6", ["phy_ultrasound_imaging"]],
  ["9702:24.2:1", ["phy_xray_production"]],
  ["9702:24.2:2", ["phy_xray_imaging_attenuation"]],
  ["9702:24.2:3", ["phy_xray_imaging_attenuation"]],
  ["9702:24.2:4", ["phy_computed_tomography"]],
  ["9702:24.3:1", ["phy_radioactive_tracers_pet"]],
  ["9702:24.3:3", ["phy_particle_antiparticle_annihilation"]],
  ["9702:24.3:4", ["phy_particle_antiparticle_annihilation", "phy_radioactive_tracers_pet"]],
]);
const approvedPhysicsConceptIds = new Set([
  "phy_terminal_velocity",
  "phy_centre_of_gravity",
  "phy_polarisation_malus",
  "phy_resistive_sensors",
  "phy_potentiometer_null_methods",
  "phy_isotopes",
  "phy_thermometry",
  "phy_mole_avogadro",
  "phy_hall_effect",
  "phy_piezoelectric_transducers",
  "phy_acoustic_impedance_reflection",
  "phy_ultrasound_imaging",
  "phy_xray_production",
  "phy_xray_imaging_attenuation",
  "phy_computed_tomography",
  "phy_particle_antiparticle_annihilation",
  "phy_radioactive_tracers_pet",
]);
const approvedChemistryOutcomeMappings = new Map<string, string[]>([
  ["9701:1.3:8", ["che_atomic_orbital_shapes"]],
  ["9701:1.3:9", ["che_bond_fission"]],
  ["9701:2.1:1", ["che_relative_masses"]],
  ["9701:2.1:2", ["che_relative_masses"]],
  ["9701:2.3:4", ["che_formulae"]],
  ["9701:3.4:3", ["che_bond_enthalpy"]],
  ["9701:4.1:1", ["che_gas_laws"]],
  ["9701:7.2:1", ["che_bronsted", "che_strong_weak"]],
  ["9701:7.2:2", ["che_bronsted", "che_strong_weak"]],
  ["9701:11.4:2", ["che_group17"]],
  ["9701:13.1:3", ["che_organic_representations"]],
  ["9701:13.1:4", ["che_organic_representations"]],
  ["9701:13.3:3", ["che_covalent"]],
  ["9701:14.1:4", ["che_alkanes"]],
  ["9701:15.1:2", ["che_nucleophilic_sub"]],
  ["9701:16.1:4", ["che_iodoform_test"]],
  ["9701:16.1:5", ["che_alcohol_reactions"]],
  ["9701:17.1:6", ["che_iodoform_test"]],
  ["9701:19.2:3", ["che_nitriles"]],
  ["9701:21.1:2", ["che_organic_representations", "che_mechanism_types"]],
  ["9701:24.2:10", ["che_gibbs", "che_cells"]],
  ["9701:25.2:1", ["che_partition_coefficient"]],
  ["9701:25.2:2", ["che_partition_coefficient"]],
  ["9701:25.2:3", ["che_partition_coefficient"]],
  ["9701:28.1:2", ["che_atomic_orbital_shapes"]],
  ["9701:32.2:1", ["che_diazonium_azo", "che_phenol_acid_base"]],
  ["9701:32.2:2", ["che_phenol_acid_base"]],
  ["9701:32.2:3", ["che_phenol_acid_base"]],
  ["9701:32.2:4", ["che_phenol_acid_base"]],
  ["9701:32.2:6", ["che_phenol_ring_reactivity"]],
  ["9701:32.2:7", ["che_phenol_ring_reactivity"]],
  ["9701:33.3:3", ["che_esters"]],
  ["9701:34.2:2", ["che_diazonium_azo"]],
  ["9701:34.2:4", ["che_diazonium_azo"]],
  ["9701:34.3:2", ["che_amides"]],
  ["9701:34.3:3", ["che_amides"]],
  ["9701:35.3:2", ["che_addition_polymer"]],
  ["9701:36.1:2", ["che_organic_representations", "che_mechanism_types"]],
]);
const approvedChemistryConceptIds = new Set([
  "che_atomic_orbital_shapes",
  "che_relative_masses",
  "che_partition_coefficient",
  "che_organic_representations",
  "che_iodoform_test",
  "che_nitriles",
  "che_amides",
  "che_phenol_acid_base",
  "che_phenol_ring_reactivity",
  "che_diazonium_azo",
]);
const approvedBiologyConceptOutcomeMappings = new Map<string, string[]>([
  ["9700:1.2:4", ["bio_atp_energy_currency"]],
  ["9700:1.2:7", ["bio_virus_structure_classification"]],
  ["9700:2.2:3", ["bio_monomers_polymers"]],
  ["9700:2.3:7", ["bio_collagen"]],
  ["9700:2.3:8", ["bio_collagen"]],
  ["9700:3.2:2", ["bio_michaelis_menten"]],
  ["9700:4.2:3", ["bio_surface_area_volume_ratio"]],
  ["9700:5.1:6", ["bio_mitosis"]],
  ["9700:6.1:5", ["bio_rna_structure"]],
  ["9700:8.2:2", ["bio_carbon_dioxide_transport"]],
  ["9700:8.2:3", ["bio_carbon_dioxide_transport"]],
  ["9700:10.2:1", ["bio_antibiotics"]],
  ["9700:12.1:2", ["bio_atp_energy_currency"]],
  ["9700:12.1:5", ["bio_respiratory_quotient"]],
  ["9700:12.1:6", ["bio_respiratory_quotient"]],
  ["9700:13.1:5", ["bio_photosynthetic_pigments_spectra"]],
  ["9700:14.1:3", ["bio_deamination_urea"]],
  ["9700:14.1:11", ["bio_glucose_biosensors"]],
  ["9700:14.2:4", ["bio_aba_stomatal_closure"]],
  ["9700:15.1:10", ["bio_neuromuscular_activation"]],
  ["9700:15.1:12", ["bio_sliding_filament_contraction"]],
  ["9700:15.2:3", ["bio_plant_responses"]],
  ["9700:16.2:5", ["bio_chi_square_test"]],
  ["9700:16.3:2", ["bio_lac_operon"]],
  ["9700:17.1:4", ["bio_t_test"]],
  ["9700:17.2:5", ["bio_hardy_weinberg"]],
  ["9700:17.2:6", ["bio_selective_breeding"]],
  ["9700:17.2:7", ["bio_selective_breeding"]],
  ["9700:18.1:6", ["bio_virus_structure_classification"]],
  ["9700:18.2:1", ["bio_ecosystems_niches"]],
  ["9700:18.2:5", ["bio_correlation_tests"]],
  ["9700:18.3:4", ["bio_conservation"]],
  ["9700:19.1:10", ["bio_microarrays"]],
  ["9700:19.1:11", ["bio_bioinformatics_databases"]],
]);
const approvedBiologySkillOutcomeMappings = new Map<string, string[]>([
  ["9700:1.1:1", ["bio_microscopy"]],
  ["9700:1.1:2", ["bio_microscopy"]],
  ["9700:1.1:4", ["bio_microscopy"]],
  ["9700:1.2:2", ["bio_organelles"]],
  ["9700:2.1:1", ["bio_tests"]],
  ["9700:2.1:2", ["bio_tests"]],
  ["9700:2.1:3", ["bio_tests"]],
  ["9700:3.1:3", ["bio_enzyme_action"]],
  ["9700:3.1:4", ["bio_enzyme_action"]],
  ["9700:3.2:1", ["bio_enzyme_factors"]],
  ["9700:3.2:4", ["bio_enzyme_action"]],
  ["9700:4.2:2", ["bio_passive_transport"]],
  ["9700:4.2:4", ["bio_passive_transport", "bio_surface_area_volume_ratio"]],
  ["9700:4.2:5", ["bio_passive_transport"]],
  ["9700:5.2:2", ["bio_mitosis"]],
  ["9700:7.1:1", ["bio_xylem", "bio_phloem"]],
  ["9700:7.1:3", ["bio_xylem", "bio_phloem"]],
  ["9700:7.2:5", ["bio_transpiration"]],
  ["9700:8.1:3", ["bio_blood_vessels"]],
  ["9700:8.1:5", ["bio_haemoglobin", "bio_immune_response"]],
  ["9700:9.1:3", ["bio_lungs"]],
  ["9700:9.1:4", ["bio_lungs"]],
  ["9700:12.1:7", ["bio_respiratory_quotient"]],
  ["9700:12.2:9", ["bio_organelles", "bio_oxidative"]],
  ["9700:12.2:13", ["bio_glycolysis", "bio_anaerobic"]],
  ["9700:12.2:14", ["bio_glycolysis", "bio_oxidative"]],
  ["9700:13.1:1", ["bio_organelles", "bio_light_dependent", "bio_calvin"]],
  ["9700:13.1:6", ["bio_photosynthetic_pigments_spectra"]],
  ["9700:13.2:3", ["bio_light_dependent", "bio_limiting_factors"]],
  ["9700:13.2:4", ["bio_limiting_factors"]],
  ["9700:14.1:5", ["bio_kidney"]],
  ["9700:15.1:11", ["bio_neuromuscular_activation", "bio_sliding_filament_contraction"]],
  ["9700:16.1:5", ["bio_meiosis"]],
]);
const approvedBiologyConceptIds = new Set([
  "bio_atp_energy_currency",
  "bio_virus_structure_classification",
  "bio_monomers_polymers",
  "bio_collagen",
  "bio_michaelis_menten",
  "bio_surface_area_volume_ratio",
  "bio_rna_structure",
  "bio_carbon_dioxide_transport",
  "bio_antibiotics",
  "bio_respiratory_quotient",
  "bio_photosynthetic_pigments_spectra",
  "bio_deamination_urea",
  "bio_glucose_biosensors",
  "bio_aba_stomatal_closure",
  "bio_neuromuscular_activation",
  "bio_sliding_filament_contraction",
  "bio_chi_square_test",
  "bio_lac_operon",
  "bio_t_test",
  "bio_hardy_weinberg",
  "bio_selective_breeding",
  "bio_ecosystems_niches",
  "bio_correlation_tests",
  "bio_microarrays",
  "bio_bioinformatics_databases",
]);
const approvedOutcomeIds = new Set([
  ...approvedMathOutcomeMappings.keys(),
  ...approvedPhysicsOutcomeMappings.keys(),
  ...approvedChemistryOutcomeMappings.keys(),
  ...approvedBiologyConceptOutcomeMappings.keys(),
  ...approvedBiologySkillOutcomeMappings.keys(),
]);
const approvedAddedConceptKeys = new Set([
  ...[...approvedMathConceptIds].map((id) => `a_level_mathematics:${id}`),
  ...[...approvedPhysicsConceptIds].map((id) => `a_level_physics:${id}`),
  ...[...approvedChemistryConceptIds].map((id) => `a_level_chemistry:${id}`),
  ...[...approvedBiologyConceptIds].map((id) => `a_level_biology:${id}`),
]);

describe("KG governance baseline", () => {
  it("keeps 944 legacy aliases and 59 approved A-Level additions while adding pending China and Singapore graphs", () => {
    const conceptNodes = graphs.flatMap((graph) =>
      graph.nodes
        .filter((node) => node.kind === "concept")
        .map((node) => ({ graph_id: graph.graph_id, node_id: node.id, canonical_id: node.canonical_id })),
    );
    const aliases = conceptRegistry.concepts.flatMap((concept) =>
      concept.aliases.map((alias) => ({ ...alias, canonical_id: concept.canonical_id })),
    );

    const chinaMathGraph = graphs.find((graph) => graph.graph_id === "senior_secondary_mathematics");
    const chinaMathConcepts = chinaMathGraph?.nodes.filter((node) => node.kind === "concept") ?? [];
    const singaporeH2MathGraph = graphs.find((graph) => graph.graph_id === "singapore_h2_mathematics");
    const singaporeH2MathConcepts = singaporeH2MathGraph?.nodes.filter((node) => node.kind === "concept") ?? [];
    const singaporeH2ChemistryGraph = graphs.find((graph) => graph.graph_id === "singapore_h2_chemistry");
    const singaporeH2ChemistryConcepts =
      singaporeH2ChemistryGraph?.nodes.filter((node) => node.kind === "concept") ?? [];
    const singaporeH2PhysicsGraph = graphs.find((graph) => graph.graph_id === "singapore_h2_physics");
    const singaporeH2PhysicsConcepts =
      singaporeH2PhysicsGraph?.nodes.filter((node) => node.kind === "concept") ?? [];
    const singaporeH2BiologyGraph = graphs.find((graph) => graph.graph_id === "singapore_h2_biology");
    const singaporeH2BiologyConcepts =
      singaporeH2BiologyGraph?.nodes.filter((node) => node.kind === "concept") ?? [];
    const singaporeSecondaryMathGraph = graphs.find(
      (graph) => graph.graph_id === "singapore_secondary_mathematics",
    );
    const singaporeSecondaryMathConcepts =
      singaporeSecondaryMathGraph?.nodes.filter((node) => node.kind === "concept") ?? [];
    const singaporeLowerScienceGraph = graphs.find(
      (graph) => graph.graph_id === "singapore_lower_secondary_science",
    );
    const singaporeLowerScienceConcepts =
      singaporeLowerScienceGraph?.nodes.filter((node) => node.kind === "concept") ?? [];
    const chinaPhysicsGraph = graphs.find((graph) => graph.graph_id === "senior_secondary_physics");
    const chinaPhysicsConcepts = chinaPhysicsGraph?.nodes.filter((node) => node.kind === "concept") ?? [];
    const chinaChemistryGraph = graphs.find((graph) => graph.graph_id === "senior_secondary_chemistry");
    const chinaChemistryConcepts = chinaChemistryGraph?.nodes.filter((node) => node.kind === "concept") ?? [];
    const chinaBiologyGraph = graphs.find((graph) => graph.graph_id === "senior_secondary_biology");
    const chinaBiologyConcepts = chinaBiologyGraph?.nodes.filter((node) => node.kind === "concept") ?? [];
    const legacyConcepts = conceptNodes.filter(
      (node) =>
        node.graph_id !== "senior_secondary_mathematics" &&
        node.graph_id !== "senior_secondary_biology" &&
        node.graph_id !== "senior_secondary_chemistry" &&
        node.graph_id !== "senior_secondary_physics" &&
        node.graph_id !== "singapore_h2_mathematics" &&
        node.graph_id !== "singapore_h2_chemistry" &&
        node.graph_id !== "singapore_h2_physics" &&
        node.graph_id !== "singapore_h2_biology" &&
        node.graph_id !== "singapore_secondary_mathematics" &&
        node.graph_id !== "singapore_lower_secondary_science" &&
        !approvedAddedConceptKeys.has(`${node.graph_id}:${node.node_id}`),
    );

    expect(graphs).toHaveLength(31);
    expect(chinaMathConcepts).toHaveLength(70);
    expect(chinaMathConcepts.every((node) => node.review_status === "needs_review")).toBe(true);
    expect(singaporeH2MathConcepts).toHaveLength(33);
    expect(singaporeH2MathConcepts.every((node) => node.review_status === "needs_review")).toBe(true);
    expect(singaporeH2ChemistryConcepts).toHaveLength(18);
    expect(singaporeH2ChemistryConcepts.every((node) => node.review_status === "needs_review")).toBe(true);
    expect(singaporeH2PhysicsConcepts).toHaveLength(8);
    expect(singaporeH2PhysicsConcepts.every((node) => node.review_status === "needs_review")).toBe(true);
    expect(singaporeH2BiologyConcepts).toHaveLength(42);
    expect(singaporeH2BiologyConcepts.every((node) => node.review_status === "needs_review")).toBe(true);
    expect(singaporeSecondaryMathConcepts).toHaveLength(53);
    expect(singaporeSecondaryMathConcepts.every((node) => node.review_status === "needs_review")).toBe(true);
    expect(singaporeLowerScienceConcepts).toHaveLength(32);
    expect(singaporeLowerScienceConcepts.every((node) => node.review_status === "needs_review")).toBe(true);
    expect(chinaPhysicsConcepts).toHaveLength(73);
    expect(chinaPhysicsConcepts.every((node) => node.review_status === "needs_review")).toBe(true);
    expect(chinaChemistryConcepts).toHaveLength(49);
    expect(chinaChemistryConcepts.every((node) => node.review_status === "needs_review")).toBe(true);
    expect(chinaBiologyConcepts).toHaveLength(75);
    expect(chinaBiologyConcepts.every((node) => node.review_status === "needs_review")).toBe(true);
    expect(legacyConcepts).toHaveLength(944);
    expect(conceptNodes).toHaveLength(1456);
    expect(aliases).toHaveLength(1456);
    expect(new Set(conceptNodes.map((node) => `${node.graph_id}:${node.node_id}`)).size).toBe(1456);
    expect(new Set(aliases.map((alias) => `${alias.graph_id}:${alias.node_id}`)).size).toBe(1456);
    expect(
      aliases
        .map((alias) => `${alias.graph_id}:${alias.node_id}:${alias.canonical_id}`)
        .sort(),
    ).toEqual(
      conceptNodes
        .map((node) => `${node.graph_id}:${node.node_id}:${node.canonical_id}`)
        .sort(),
    );
  });

  it("gives every graph a V2 version, registered source, and review state", () => {
    const sourceIds = new Set(sourceRegistry.sources.map((source) => source.source_id));
    for (const graph of graphs) {
      expect(graph.schema_version, graph.graph_id).toBe("2.0.0");
      expect(graph.content_version, graph.graph_id).toMatch(/^\d+\.\d+\.\d+$/);
      expect(graph.source_ids.length, graph.graph_id).toBeGreaterThan(0);
      expect(["unreviewed", "needs_review", "approved", "rejected", "superseded"]).toContain(graph.review_status);
      for (const sourceId of graph.source_ids) expect(sourceIds.has(sourceId), `${graph.graph_id}:${sourceId}`).toBe(true);
    }
  });

  it("never treats approved nodes or edges as evidence-free", () => {
    for (const graph of graphs) {
      for (const item of [...graph.nodes, ...graph.edges]) {
        if (item.review_status === "approved") expect(item.evidence_refs.length, graph.graph_id).toBeGreaterThan(0);
      }
    }
  });
});

describe("A-Level pending review packs", () => {
  const packFiles = readdirSync(reviewDir).filter((name) => name.endsWith(".coverage.json")).sort();
  const packs = packFiles.map((name) => readJson<CoveragePack>(`${reviewDir}/${name}`));

  it("contains one pending pack for each deep-review subject", () => {
    expect(packs).toHaveLength(4);
    expect(packs.every((pack) => pack.review_status === "needs_review")).toBe(true);
  });

  it("has unique outcome IDs and page-level evidence locators", () => {
    const registeredSources = new Set(sourceRegistry.sources.map((source) => source.source_id));
    for (const pack of packs) {
      const outcomes = pack.sections.flatMap((section) => section.outcomes);
      expect(outcomes.length, pack.source_id).toBeGreaterThan(0);
      expect(new Set(outcomes.map((outcome) => outcome.outcome_id)).size, pack.source_id).toBe(outcomes.length);
      expect(registeredSources.has(pack.source_id), pack.source_id).toBe(true);
      for (const outcome of outcomes) {
        expect(outcome.source_locator.length, outcome.outcome_id).toBeGreaterThan(0);
        expect(outcome.pdf_page, outcome.outcome_id).toBeGreaterThan(0);
        expect(outcome.printed_page, outcome.outcome_id).toBeGreaterThan(0);
        expect(outcome.text_sha256, outcome.outcome_id).toMatch(/^[a-f0-9]{64}$/);
        expect(outcome.review_status, outcome.outcome_id).toBe(
          approvedOutcomeIds.has(outcome.outcome_id) ? "approved" : "needs_review",
        );
      }
    }
  });

  it("keeps the audited mapping regressions fixed", () => {
    const outcome = (graphId: string, outcomeId: string) => {
      const pack = packs.find((candidate) => candidate.graph_id === graphId);
      return pack?.sections.flatMap((section) => section.outcomes).find((item) => item.outcome_id === outcomeId);
    };

    expect(outcome("a_level_biology", "9700:1.1:2")).toMatchObject({
      requirement_type: "practical_skill",
      coverage_signal: "skill_mapping_required",
    });
    expect(outcome("a_level_biology", "9700:1.1:2")?.candidate_concepts[0]?.node_id).toBe("bio_microscopy");
    expect(outcome("a_level_chemistry", "9701:1.1:2")).toMatchObject({
      coverage_signal: "candidate_partial",
    });
    expect(outcome("a_level_chemistry", "9701:1.1:2")?.candidate_concepts[0]?.node_id).toBe("che_subatomic");
    expect(outcome("a_level_physics", "9702:1.1:2")).toMatchObject({
      requirement_type: "general_skill",
      coverage_signal: "skill_mapping_required",
    });
    expect(outcome("a_level_mathematics", "9709:3.9:8")).toMatchObject({
      coverage_signal: "candidate_covered",
      machine_audit_override: true,
    });
    expect(outcome("a_level_mathematics", "9709:3.9:8")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "mat_complex_loci",
      "mat_argand",
    ]);
    expect(outcome("a_level_physics", "9702:22.2:4")).toMatchObject({
      coverage_signal: "candidate_partial",
      machine_audit_override: true,
    });
    expect(outcome("a_level_physics", "9702:22.2:4")?.candidate_concepts[0]?.node_id).toBe("phy_photoelectric");
    expect(outcome("a_level_physics", "9702:5.1:7")).toMatchObject({
      coverage_signal: "candidate_partial",
      machine_audit_override: true,
    });
    expect(outcome("a_level_physics", "9702:5.1:7")?.candidate_concepts[0]?.node_id).toBe("phy_power_efficiency");
    expect(outcome("a_level_chemistry", "9701:25.1:1")?.candidate_concepts[0]?.node_id).toBe("che_bronsted");
    expect(outcome("a_level_chemistry", "9701:4.2:1")?.candidate_concepts[0]?.node_id).toBe("che_solids");
    expect(outcome("a_level_biology", "9700:2.3:5")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "bio_proteins",
      "bio_haemoglobin",
    ]);
    expect(outcome("a_level_chemistry", "9701:28.1:3")).toMatchObject({
      coverage_signal: "candidate_covered",
      machine_audit_override: true,
    });
    expect(outcome("a_level_chemistry", "9701:28.1:3")?.candidate_concepts[0]?.node_id).toBe("che_transition_props");
    expect(outcome("a_level_physics", "9702:4.1:4")).toMatchObject({
      coverage_signal: "candidate_partial",
      machine_audit_override: true,
    });
    expect(outcome("a_level_physics", "9702:4.1:4")?.candidate_concepts[0]?.node_id).toBe("phy_moments");
    expect(outcome("a_level_mathematics", "9709:3.5:6")?.candidate_concepts[0]?.node_id).toBe("mat_substitution");
    expect(outcome("a_level_mathematics", "9709:3.5:6")?.coverage_signal).toBe("candidate_covered");
    expect(outcome("a_level_physics", "9702:20.1:1")).toMatchObject({
      coverage_signal: "candidate_partial",
      machine_audit_override: true,
    });
    expect(outcome("a_level_physics", "9702:20.1:1")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "phy_flux_density",
      "phy_force_charge",
    ]);
    expect(outcome("a_level_biology", "9700:12.2:9")).toMatchObject({
      requirement_type: "practical_skill",
      coverage_signal: "skill_mapping_required",
      machine_audit_override: true,
    });
    expect(outcome("a_level_biology", "9700:12.2:9")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "bio_organelles",
      "bio_oxidative",
    ]);
    expect(outcome("a_level_mathematics", "9709:1.1:3")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "mat_solve_quadratics",
      "mat_inequalities",
    ]);
    expect(outcome("a_level_mathematics", "9709:3.1:1")?.candidate_concepts[0]?.node_id).toBe("mat_modulus");
    expect(outcome("a_level_physics", "9702:17.2:1")?.candidate_concepts[0]?.node_id).toBe("phy_shm_energy");
    expect(outcome("a_level_mathematics", "9709:3.8:2")?.candidate_concepts[0]?.node_id).toBe("mat_separation");
    expect(outcome("a_level_physics", "9702:2.1:5")?.candidate_concepts[0]?.node_id).toBe("phy_motion_graphs");
    expect(outcome("a_level_biology", "9700:2.1:2")).toMatchObject({
      requirement_type: "practical_skill",
      coverage_signal: "skill_mapping_required",
    });
    expect(outcome("a_level_physics", "9702:4.3:4")?.candidate_concepts[0]?.node_id).toBe("phy_density_pressure");
    expect(outcome("a_level_biology", "9700:14.1:5")?.candidate_concepts[0]?.node_id).toBe("bio_kidney");
    expect(outcome("a_level_chemistry", "9701:16.1:2")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "che_alcohol_reactions",
      "che_alcohol_oxidation",
    ]);
    expect(outcome("a_level_mathematics", "9709:2.4:3")?.candidate_concepts[0]?.node_id).toBe("mat_parametric");
    expect(outcome("a_level_physics", "9702:2.1:3")?.candidate_concepts[0]?.node_id).toBe("phy_motion_graphs");
    expect(outcome("a_level_mathematics", "9709:4.4:4")?.coverage_signal).toBe("candidate_covered");
    expect(outcome("a_level_physics", "9702:18.1:2")?.candidate_concepts[0]?.node_id).toBe("phy_e_field_strength");
    expect(outcome("a_level_biology", "9700:5.2:2")?.candidate_concepts[0]?.node_id).toBe("bio_mitosis");
    expect(outcome("a_level_mathematics", "9709:1.6:2")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "mat_arithmetic",
      "mat_geometric",
    ]);
    expect(outcome("a_level_physics", "9702:10.2:6")?.candidate_concepts[0]?.node_id).toBe("phy_series_parallel");
    expect(outcome("a_level_biology", "9700:6.2:3")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "bio_transcription",
      "bio_translation",
    ]);
    expect(outcome("a_level_physics", "9702:11.1:4")?.candidate_concepts[0]?.node_id).toBe("phy_isotopes");
    expect(outcome("a_level_mathematics", "9709:2.2:4")).toMatchObject({
      coverage_signal: "candidate_covered",
      machine_audit_override: true,
    });
    expect(outcome("a_level_mathematics", "9709:2.2:4")?.candidate_concepts[0]?.node_id).toBe("mat_linearise");
    expect(outcome("a_level_mathematics", "9709:3.7:5")).toMatchObject({
      coverage_signal: "candidate_partial",
      machine_audit_override: true,
    });
    expect(outcome("a_level_mathematics", "9709:3.7:5")?.candidate_concepts[0]?.node_id).toBe("mat_vector_lines");
    for (const [outcomeId, conceptIds] of approvedMathOutcomeMappings) {
      expect(outcome("a_level_mathematics", outcomeId)).toMatchObject({
        review_status: "approved",
        coverage_signal: "candidate_covered",
        machine_audit_override: true,
      });
      expect(
        outcome("a_level_mathematics", outcomeId)?.candidate_concepts.map(({ node_id }) => node_id),
      ).toEqual(conceptIds);
    }
    for (const [outcomeId, conceptIds] of approvedPhysicsOutcomeMappings) {
      const skillMapping = ["9702:7.1:3", "9702:10.1:1"].includes(outcomeId);
      expect(outcome("a_level_physics", outcomeId)).toMatchObject({
        review_status: "approved",
        coverage_signal: skillMapping ? "skill_mapping_required" : "candidate_covered",
        machine_audit_override: true,
      });
      expect(outcome("a_level_physics", outcomeId)?.candidate_concepts.map(({ node_id }) => node_id)).toEqual(
        conceptIds,
      );
    }
    for (const [outcomeId, conceptIds] of approvedChemistryOutcomeMappings) {
      const skillMapping = ["9701:7.2:1", "9701:7.2:2", "9701:21.1:2", "9701:36.1:2"].includes(outcomeId);
      expect(outcome("a_level_chemistry", outcomeId)).toMatchObject({
        review_status: "approved",
        coverage_signal: skillMapping ? "skill_mapping_required" : "candidate_covered",
        machine_audit_override: true,
      });
      expect(outcome("a_level_chemistry", outcomeId)?.candidate_concepts.map(({ node_id }) => node_id)).toEqual(
        conceptIds,
      );
    }
    for (const [outcomeId, conceptIds] of approvedBiologyConceptOutcomeMappings) {
      expect(outcome("a_level_biology", outcomeId)).toMatchObject({
        review_status: "approved",
        coverage_signal: "candidate_covered",
        machine_audit_override: true,
      });
      expect(outcome("a_level_biology", outcomeId)?.candidate_concepts.map(({ node_id }) => node_id)).toEqual(
        conceptIds,
      );
    }
    for (const [outcomeId, conceptIds] of approvedBiologySkillOutcomeMappings) {
      expect(outcome("a_level_biology", outcomeId)).toMatchObject({
        review_status: "approved",
        coverage_signal: "skill_mapping_required",
        machine_audit_override: true,
      });
      expect(outcome("a_level_biology", outcomeId)?.candidate_concepts.map(({ node_id }) => node_id)).toEqual(
        conceptIds,
      );
    }
    expect(outcome("a_level_chemistry", "9701:1.2:1")?.candidate_concepts[0]?.node_id).toBe("che_isotopes");
    expect(outcome("a_level_chemistry", "9701:3.1:2")?.coverage_signal).toBe("candidate_covered");
    expect(outcome("a_level_physics", "9702:7.4:2")?.coverage_signal).toBe("candidate_partial");
    expect(outcome("a_level_mathematics", "9709:1.3:4")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "mat_straight_lines",
      "mat_circles",
      "mat_parallel_perp",
    ]);
    expect(outcome("a_level_mathematics", "9709:1.3:4")?.summary_zh).not.toContain("隐函数微分");
    expect(outcome("a_level_biology", "9700:2.2:7")?.candidate_concepts[0]?.node_id).toBe("bio_carbohydrates");
    expect(outcome("a_level_chemistry", "9701:13.2:2")?.candidate_concepts[0]?.node_id).toBe("che_mechanism_types");
    expect(outcome("a_level_chemistry", "9701:23.3:3")?.candidate_concepts[0]?.node_id).toBe("che_entropy");
    expect(outcome("a_level_physics", "9702:3.1:6")?.candidate_concepts[0]?.node_id).toBe("phy_mass_weight");
    expect(outcome("a_level_physics", "9702:19.1:2")?.candidate_concepts[0]?.node_id).toBe("phy_capacitance_def");
    expect(outcome("a_level_physics", "9702:24.3:2")?.coverage_signal).toBe("candidate_partial");
    expect(outcome("a_level_mathematics", "9709:3.3:2")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "mat_trig_identities",
      "mat_double_angle",
      "mat_rform",
      "mat_solve_trig",
    ]);
    expect(outcome("a_level_biology", "9700:12.1:3")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "bio_glycolysis",
      "bio_oxidative",
      "bio_light_dependent",
    ]);
    expect(outcome("a_level_chemistry", "9701:23.4:2")?.candidate_concepts[0]?.node_id).toBe("che_gibbs");
    expect(outcome("a_level_physics", "9702:3.1:2")?.candidate_concepts[0]?.node_id).toBe("phy_newton_laws");
    expect(outcome("a_level_physics", "9702:3.1:2")?.coverage_signal).toBe("candidate_partial");
    expect(outcome("a_level_mathematics", "9709:1.1:1")?.candidate_concepts[0]?.node_id).toBe("mat_quadratics");
    expect(outcome("a_level_biology", "9700:1.1:4")).toMatchObject({
      requirement_type: "practical_skill",
      coverage_signal: "skill_mapping_required",
      machine_audit_override: true,
    });
    expect(outcome("a_level_biology", "9700:2.2:6")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "bio_carbohydrates",
      "bio_tests",
    ]);
    expect(outcome("a_level_chemistry", "9701:22.2:2")).toMatchObject({
      coverage_signal: "candidate_partial",
      machine_audit_override: true,
    });
    expect(outcome("a_level_chemistry", "9701:22.2:2")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "che_isotopes",
      "che_mass_spec",
    ]);
    expect(outcome("a_level_biology", "9700:1.2:3")?.candidate_concepts[0]?.node_id).toBe("bio_organelles");
    expect(outcome("a_level_biology", "9700:1.2:3")?.candidate_concepts.map(({ node_id }) => node_id)).not.toContain(
      "bio_membrane_structure",
    );
    expect(outcome("a_level_physics", "9702:18.1:3")).toMatchObject({
      coverage_signal: "candidate_partial",
      machine_audit_override: true,
    });
    expect(outcome("a_level_physics", "9702:18.1:3")?.candidate_concepts[0]?.node_id).toBe("phy_e_field_strength");
    expect(outcome("a_level_physics", "9702:13.1:2")?.coverage_signal).toBe("candidate_partial");
    expect(outcome("a_level_physics", "9702:9.3:6")?.candidate_concepts[0]?.node_id).toBe("phy_resistivity");
    expect(outcome("a_level_mathematics", "9709:2.1:1")?.candidate_concepts[0]?.node_id).toBe("mat_modulus");
    expect(outcome("a_level_mathematics", "9709:2.1:1")?.candidate_concepts.map(({ node_id }) => node_id)).not.toContain(
      "mat_solve_trig",
    );
    expect(outcome("a_level_chemistry", "9701:1.1:4")?.candidate_concepts).toHaveLength(1);
    expect(outcome("a_level_chemistry", "9701:1.1:4")?.candidate_concepts[0]?.node_id).toBe("che_subatomic");
    expect(outcome("a_level_chemistry", "9701:26.1:1")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "che_rate_equation",
      "che_rds",
    ]);
    expect(outcome("a_level_physics", "9702:3.2:3")?.candidate_concepts[0]?.node_id).toBe(
      "phy_terminal_velocity",
    );
    expect(outcome("a_level_physics", "9702:10.2:3")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "phy_kirchhoff",
      "phy_series_parallel",
    ]);
    expect(outcome("a_level_biology", "9700:18.3:6")?.candidate_concepts[0]?.node_id).toBe("bio_conservation");
    expect(outcome("a_level_chemistry", "9701:37.1:1")?.candidate_concepts[0]?.node_id).toBe("che_chromatography");
    expect(outcome("a_level_physics", "9702:14.2:3")).toMatchObject({
      coverage_signal: "candidate_partial",
      machine_audit_override: true,
    });
    expect(outcome("a_level_physics", "9702:14.2:3")?.candidate_concepts[0]?.node_id).toBe("phy_temperature");
    expect(outcome("a_level_mathematics", "9709:3.7:1")?.candidate_concepts[0]?.node_id).toBe("mat_vector_basics");
    expect(outcome("a_level_biology", "9700:16.1:4")?.candidate_concepts[0]?.node_id).toBe("bio_meiosis");
    expect(outcome("a_level_chemistry", "9701:9.2:2")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "che_period3",
      "che_oxidation_number",
    ]);
    expect(outcome("a_level_physics", "9702:19.3:3")?.candidate_concepts[0]?.node_id).toBe(
      "phy_capacitor_discharge",
    );
    expect(outcome("a_level_physics", "9702:19.3:3")?.candidate_concepts.map(({ node_id }) => node_id)).not.toContain(
      "phy_pd_emf",
    );
    expect(outcome("a_level_physics", "9702:20.5:5")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "phy_faraday",
      "phy_lenz",
    ]);
    expect(outcome("a_level_mathematics", "9709:3.4:1")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "mat_special_derivatives",
      "mat_chain_rule",
    ]);
    expect(outcome("a_level_physics", "9702:5.1:3")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "phy_power_efficiency",
    ]);
    expect(outcome("a_level_physics", "9702:15.3:4")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "phy_kinetic_theory",
      "phy_ideal_gas",
    ]);
    expect(outcome("a_level_chemistry", "9701:25.1:6")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "che_buffers",
      "che_ph_ka",
    ]);
    expect(outcome("a_level_physics", "9702:11.1:1")).toMatchObject({
      requirement_type: "concept",
      coverage_signal: "candidate_partial",
      machine_audit_override: true,
    });
    expect(outcome("a_level_physics", "9702:11.1:3")?.candidate_concepts[0]?.node_id).toBe(
      "phy_nuclear_structure",
    );
    expect(outcome("a_level_mathematics", "9709:3.2:1")?.coverage_signal).toBe("candidate_covered");
    expect(outcome("a_level_biology", "9700:15.1:6")?.candidate_concepts[0]?.node_id).toBe("bio_nervous");
    expect(outcome("a_level_chemistry", "9701:28.2:8")?.candidate_concepts[0]?.node_id).toBe(
      "che_electrode_potential",
    );
    expect(outcome("a_level_chemistry", "9701:28.3:5")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "che_complex_ions",
      "che_colour_catalysis",
    ]);
    expect(outcome("a_level_biology", "9700:12.2:11")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "bio_oxidative",
      "bio_anaerobic",
    ]);
    expect(outcome("a_level_physics", "9702:1.3:2")?.candidate_concepts[0]?.node_id).toBe("phy_uncertainty");
    expect(outcome("a_level_physics", "9702:1.3:2")?.candidate_concepts.map(({ node_id }) => node_id)).not.toContain(
      "phy_wave_types",
    );
    expect(outcome("a_level_physics", "9702:7.1:3")).toMatchObject({
      requirement_type: "concept_and_skill",
      coverage_signal: "skill_mapping_required",
    });
    expect(outcome("a_level_biology", "9700:3.2:3")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "bio_enzyme_inhibition",
    ]);
    expect(outcome("a_level_chemistry", "9701:34.2:1")).toMatchObject({
      requirement_type: "concept",
      coverage_signal: "candidate_partial",
    });
    expect(outcome("a_level_chemistry", "9701:4.2:2")?.candidate_concepts[0]?.node_id).toBe("che_solids");
    expect(outcome("a_level_physics", "9702:22.4:2")?.coverage_signal).toBe("candidate_covered");
    expect(outcome("a_level_chemistry", "9701:3.5:1")?.coverage_signal).toBe("candidate_partial");
    expect(outcome("a_level_physics", "9702:25.3:1")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "phy_energy_levels",
      "phy_hubble",
    ]);
    expect(outcome("a_level_mathematics", "9709:2.5:1")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "mat_standard_integrals",
    ]);
    expect(outcome("a_level_biology", "9700:2.2:9")?.candidate_concepts[0]?.node_id).toBe("bio_lipids");
    expect(outcome("a_level_chemistry", "9701:28.5:3")?.candidate_concepts[0]?.node_id).toBe("che_complex_ions");
    expect(outcome("a_level_physics", "9702:18.3:1")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "phy_coulomb",
    ]);
    expect(outcome("a_level_physics", "9702:18.3:1")?.candidate_concepts.map(({ node_id }) => node_id)).not.toContain(
      "phy_force_charge",
    );
    expect(outcome("a_level_mathematics", "9709:1.8:4")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "mat_definite_area",
      "mat_volumes",
    ]);
    expect(outcome("a_level_biology", "9700:7.2:5")).toMatchObject({
      requirement_type: "practical_skill",
      coverage_signal: "skill_mapping_required",
    });
    expect(outcome("a_level_chemistry", "9701:3.1:1")?.coverage_signal).toBe("candidate_covered");
    expect(outcome("a_level_physics", "9702:20.3:6")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "phy_e_field_strength",
      "phy_force_charge",
    ]);
    expect(outcome("a_level_mathematics", "9709:1.7:2")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "mat_power_rule",
      "mat_chain_rule",
    ]);
    expect(outcome("a_level_biology", "9700:11.1:3")?.coverage_signal).toBe("candidate_partial");
    expect(outcome("a_level_chemistry", "9701:15.1:5")).toMatchObject({
      coverage_signal: "candidate_partial",
      machine_audit_override: true,
    });
    expect(outcome("a_level_chemistry", "9701:15.1:5")?.keywords).toContain("mechanisms");
    expect(outcome("a_level_chemistry", "9701:26.1:2")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "che_rate_equation",
      "che_rate",
    ]);
    expect(outcome("a_level_physics", "9702:25.2:1")?.coverage_signal).toBe("candidate_partial");
    expect(outcome("a_level_biology", "9700:13.2:2")?.coverage_signal).toBe("candidate_partial");
    expect(outcome("a_level_chemistry", "9701:14.2:1")?.coverage_signal).toBe("candidate_partial");
    expect(outcome("a_level_mathematics", "9709:5.5:3")?.coverage_signal).toBe("candidate_partial");
    expect(outcome("a_level_mathematics", "9709:2.3:2")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "mat_trig_identities",
      "mat_double_angle",
      "mat_rform",
      "mat_solve_trig",
    ]);
    expect(outcome("a_level_biology", "9700:15.1:7")?.candidate_concepts[0]?.node_id).toBe("bio_nervous");
    expect(outcome("a_level_physics", "9702:10.2:5")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "phy_kirchhoff",
      "phy_series_parallel",
    ]);
    expect(outcome("a_level_biology", "9700:19.2:2")?.candidate_concepts[0]?.node_id).toBe("bio_gene_applications");
    expect(outcome("a_level_chemistry", "9701:7.2:8")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "che_bronsted",
    ]);
    expect(outcome("a_level_physics", "9702:6.1:4")?.candidate_concepts[0]?.node_id).toBe("phy_hookes_law");
    expect(outcome("a_level_physics", "9702:7.3:2")?.candidate_concepts.map(({ node_id }) => node_id)).toEqual([
      "phy_doppler",
    ]);
  });

  it("does not expose low-confidence candidates for genuine coverage gaps", () => {
    const outcome = (graphId: string, outcomeId: string) => {
      const pack = packs.find((candidate) => candidate.graph_id === graphId);
      return pack?.sections.flatMap((section) => section.outcomes).find((item) => item.outcome_id === outcomeId);
    };

    expect(outcome("a_level_physics", "9702:24.2:1")?.candidate_concepts[0]?.node_id).toBe(
      "phy_xray_production",
    );
  });
});
