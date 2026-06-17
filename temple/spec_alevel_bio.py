#!/usr/bin/env python3
"""A-Level Biology — CIE 9700 coverage."""
import os
from kg_en_builder import build

T = [
 ("bio_cell_structure","Cell Structure",[
   ("bio_microscopy","Microscopy","Light and electron microscopy and resolution."),
   ("bio_organelles","Eukaryotic Organelles","Structure and function of cell organelles."),
   ("bio_prokaryotes","Prokaryotic Cells","Features of bacterial cells versus eukaryotes."),
   ("bio_cell_size","Cell Size and Magnification","Calculating magnification and actual size."),
 ]),
 ("bio_molecules","Biological Molecules",[
   ("bio_water","Water","Properties of water important to life."),
   ("bio_carbohydrates","Carbohydrates","Mono-, di- and polysaccharide structure."),
   ("bio_lipids","Lipids","Triglycerides and phospholipids."),
   ("bio_proteins","Proteins","Amino acids and protein structure levels."),
   ("bio_tests","Biochemical Tests","Qualitative tests for biological molecules."),
 ]),
 ("bio_enzymes","Enzymes",[
   ("bio_enzyme_action","Enzyme Action","Active site and induced-fit model."),
   ("bio_enzyme_factors","Factors Affecting Enzyme Activity","Temperature, pH and concentration effects."),
   ("bio_enzyme_inhibition","Enzyme Inhibition","Competitive and non-competitive inhibitors."),
 ]),
 ("bio_membranes","Cell Membranes and Transport",[
   ("bio_membrane_structure","Membrane Structure","Fluid mosaic model of membranes."),
   ("bio_passive_transport","Diffusion and Osmosis","Passive movement down gradients."),
   ("bio_active_transport","Active Transport","Energy-requiring transport and bulk transport."),
 ]),
 ("bio_cell_cycle","The Mitotic Cell Cycle",[
   ("bio_chromosomes","Chromosome Behaviour","Chromosome structure and replication."),
   ("bio_mitosis","Mitosis","Stages producing genetically identical cells."),
 ]),
 ("bio_nucleic_acids","Nucleic Acids and Protein Synthesis",[
   ("bio_dna_structure","DNA Structure","Double helix and base pairing."),
   ("bio_dna_replication","DNA Replication","Semi-conservative replication."),
   ("bio_transcription","Transcription","Synthesis of mRNA from DNA."),
   ("bio_translation","Translation","Protein synthesis at the ribosome."),
   ("bio_mutation","Gene Mutation","Changes to base sequence and effects."),
 ]),
 ("bio_transport_plants","Transport in Plants",[
   ("bio_xylem","Xylem and Water Transport","Water movement through xylem."),
   ("bio_transpiration","Transpiration","Water loss and influencing factors."),
   ("bio_phloem","Phloem and Translocation","Transport of assimilates."),
 ]),
 ("bio_transport_mammals","Transport in Mammals",[
   ("bio_heart","The Heart","Cardiac structure and the cardiac cycle."),
   ("bio_blood_vessels","Blood Vessels","Arteries, veins and capillaries."),
   ("bio_haemoglobin","Haemoglobin and Oxygen Transport","Oxygen dissociation and the Bohr effect."),
 ]),
 ("bio_gas_exchange","Gas Exchange",[
   ("bio_lungs","Gas Exchange in the Lungs","Alveolar structure and gas exchange."),
 ]),
 ("bio_disease","Infectious Disease and Immunity",[
   ("bio_infectious","Infectious Disease","Pathogens and transmission of disease."),
   ("bio_immune_response","Immune Response","Phagocytes and lymphocytes."),
   ("bio_antibodies","Antibodies and Vaccination","Antibody action and immunisation."),
 ]),
 ("bio_respiration","Energy and Respiration",[
   ("bio_glycolysis","Glycolysis","Glucose breakdown to pyruvate."),
   ("bio_krebs","Link Reaction and Krebs Cycle","Oxidation producing reduced coenzymes."),
   ("bio_oxidative","Oxidative Phosphorylation","ATP synthesis via the electron transport chain."),
   ("bio_anaerobic","Anaerobic Respiration","Fermentation pathways without oxygen."),
 ]),
 ("bio_photosynthesis","Photosynthesis",[
   ("bio_light_dependent","Light-Dependent Reactions","ATP and NADPH from light energy."),
   ("bio_calvin","Calvin Cycle","Carbon fixation to carbohydrate."),
   ("bio_limiting_factors","Limiting Factors","Factors limiting photosynthetic rate."),
 ]),
 ("bio_homeostasis","Homeostasis",[
   ("bio_homeostasis_principles","Homeostasis Principles","Negative feedback and set points."),
   ("bio_kidney","The Kidney and Osmoregulation","Ultrafiltration and water balance."),
   ("bio_glucose_control","Control of Blood Glucose","Insulin, glucagon and diabetes."),
 ]),
 ("bio_coordination","Control and Coordination",[
   ("bio_nervous","Nervous Transmission","Resting and action potentials."),
   ("bio_synapses","Synapses","Chemical transmission across synapses."),
   ("bio_hormonal","Hormonal Control","Endocrine signalling."),
   ("bio_plant_responses","Plant Responses","Tropisms and plant growth regulators."),
 ]),
 ("bio_inheritance","Inheritance",[
   ("bio_meiosis","Meiosis","Reduction division producing gametes."),
   ("bio_genetic_crosses","Genetic Crosses","Monohybrid and dihybrid inheritance."),
   ("bio_linkage","Gene Linkage and Crossing Over","Linked genes and recombination."),
   ("bio_gene_control","Control of Gene Expression","Regulation of gene expression."),
 ]),
 ("bio_evolution","Selection and Evolution",[
   ("bio_variation","Variation","Genetic and environmental variation."),
   ("bio_natural_selection","Natural Selection","Differential survival and reproduction."),
   ("bio_speciation","Speciation","Formation of new species."),
 ]),
 ("bio_biodiversity","Biodiversity and Conservation",[
   ("bio_classification","Classification","Taxonomic hierarchy and the three domains."),
   ("bio_biodiversity_sampling","Biodiversity and Sampling","Measuring biodiversity with indices."),
   ("bio_conservation","Conservation","Maintaining biodiversity and ecosystems."),
 ]),
 ("bio_genetic_tech","Genetic Technology",[
   ("bio_gene_tech","Gene Technology","Recombinant DNA and gene cloning."),
   ("bio_pcr_electrophoresis","PCR and Electrophoresis","Amplifying and separating DNA."),
   ("bio_gene_applications","Applications of Genetic Technology","Medical and agricultural applications."),
 ]),
]

EDGES = [
 ("bio_organelles","bio_prokaryotes","soft"),
 ("bio_proteins","bio_enzyme_action","hard"),
 ("bio_carbohydrates","bio_tests","soft"),
 ("bio_lipids","bio_membrane_structure","hard"),
 ("bio_proteins","bio_membrane_structure","hard"),
 ("bio_membrane_structure","bio_passive_transport","hard"),
 ("bio_passive_transport","bio_active_transport","hard"),
 ("bio_organelles","bio_mitosis","hard"),
 ("bio_proteins","bio_dna_structure","soft"),
 ("bio_dna_structure","bio_dna_replication","hard"),
 ("bio_dna_structure","bio_transcription","hard"),
 ("bio_transcription","bio_translation","hard"),
 ("bio_dna_replication","bio_mutation","hard"),
 ("bio_passive_transport","bio_xylem","hard"),
 ("bio_xylem","bio_transpiration","hard"),
 ("bio_heart","bio_blood_vessels","soft"),
 ("bio_proteins","bio_haemoglobin","hard"),
 ("bio_passive_transport","bio_lungs","hard"),
 ("bio_immune_response","bio_antibodies","hard"),
 ("bio_proteins","bio_immune_response","soft"),
 ("bio_enzyme_action","bio_glycolysis","hard"),
 ("bio_membrane_structure","bio_oxidative","hard"),
 ("bio_glycolysis","bio_krebs","hard"),
 ("bio_krebs","bio_oxidative","hard"),
 ("bio_glycolysis","bio_anaerobic","hard"),
 ("bio_oxidative","bio_light_dependent","soft"),
 ("bio_light_dependent","bio_calvin","hard"),
 ("bio_calvin","bio_limiting_factors","hard"),
 ("bio_homeostasis_principles","bio_kidney","hard"),
 ("bio_homeostasis_principles","bio_glucose_control","hard"),
 ("bio_active_transport","bio_nervous","hard"),
 ("bio_nervous","bio_synapses","hard"),
 ("bio_homeostasis_principles","bio_hormonal","soft"),
 ("bio_mitosis","bio_meiosis","hard"),
 ("bio_meiosis","bio_genetic_crosses","hard"),
 ("bio_genetic_crosses","bio_linkage","hard"),
 ("bio_transcription","bio_gene_control","hard"),
 ("bio_mutation","bio_variation","hard"),
 ("bio_meiosis","bio_variation","hard"),
 ("bio_variation","bio_natural_selection","hard"),
 ("bio_natural_selection","bio_speciation","hard"),
 ("bio_speciation","bio_classification","soft"),
 ("bio_classification","bio_biodiversity_sampling","hard"),
 ("bio_biodiversity_sampling","bio_conservation","hard"),
 ("bio_dna_replication","bio_pcr_electrophoresis","hard"),
 ("bio_dna_structure","bio_gene_tech","hard"),
 ("bio_gene_tech","bio_gene_applications","hard"),
 ("bio_pcr_electrophoresis","bio_gene_applications","soft"),
]

spec = {"id":"alevel_bio","subject":"A-Level Biology (CIE 9700)",
        "topics":[{"id":i,"name":n,"concepts":c} for (i,n,c) in T],"edges":EDGES}

if __name__ == "__main__":
    build(spec, os.path.join(os.path.dirname(__file__), "a_level_biology.json"))
