# A-Level 生物 KG 中文审核包

- 图：`a_level_biology`
- 官方 syllabus：Cambridge 9700
- 来源：`src_cambridge_9700_2025_2027`
- 状态：`needs_review`，本文件不能作为人工批准记录
- 官方小节：44；逐项要求：259
- 自动信号：候选覆盖 48；部分覆盖 177；歧义 1；未解析 0；已核实 Concept 缺口 0；需技能映射 33

> 版权说明：这里只保存小节标题、页码、关键词、文本指纹和 Primoria 候选映射，不复制 Cambridge syllabus 正文。分数只用于排序，不能作为审核结论。

## 小节覆盖索引

| 官方小节 | Syllabus 页 | 要求数 | Primoria 候选 Topic | 覆盖 / 部分 / 歧义 / 未解析 / Concept 缺口 / 技能 |
|---|---:|---:|---|---:|
| 1.1 The microscope in cell studies | 15 | 5 | 显微镜与真核细胞器 (bio_cell_structure)；原核细胞、病毒与细胞尺度 (bio_cell_structure_bio_prokaryotes) | 1 / 1 / 0 / 0 / 0 / 3 |
| 1.2 Cells as the basic units of living organisms | 15, 16 | 7 | 原核细胞、病毒与细胞尺度 (bio_cell_structure_bio_prokaryotes)；显微镜与真核细胞器 (bio_cell_structure) | 2 / 4 / 0 / 0 / 0 / 1 |
| 2.1 Testing for biological molecules | 17 | 3 | 生化检测与酶作用 (bio_enzymes)；水、单体与碳水化合物 (bio_molecules) | 0 / 0 / 0 / 0 / 0 / 3 |
| 2.2 Carbohydrates and lipids | 17, 18 | 11 | 脂质、蛋白质与胶原 (bio_molecules_bio_lipids)；水、单体与碳水化合物 (bio_molecules) | 1 / 10 / 0 / 0 / 0 / 0 |
| 2.3 Proteins | 18 | 8 | 脂质、蛋白质与胶原 (bio_molecules_bio_lipids)；稳态、肾脏与含氮排泄 (bio_homeostasis) | 2 / 6 / 0 / 0 / 0 / 0 |
| 2.4 Water | 19 | 1 | 水、单体与碳水化合物 (bio_molecules)；植物运输 (bio_transport_plants) | 0 / 1 / 0 / 0 / 0 / 0 |
| 3.1 Mode of action of enzymes | 20 | 4 | 生化检测与酶作用 (bio_enzymes)；传染病与抗生素 (bio_disease) | 0 / 2 / 0 / 0 / 0 / 2 |
| 3.2 Factors that affect enzyme action | 20 | 4 | 酶活性、动力学与抑制 (bio_enzyme_kinetics)；生化检测与酶作用 (bio_enzymes) | 2 / 0 / 0 / 0 / 0 / 2 |
| 4.1 Fluid mosaic membranes | 21 | 4 | 膜、被动运输与交换尺度 (bio_membranes)；脂质、蛋白质与胶原 (bio_molecules_bio_lipids) | 0 / 4 / 0 / 0 / 0 / 0 |
| 4.2 Movement into and out of cells | 21, 22 | 6 | 原核细胞、病毒与细胞尺度 (bio_cell_structure_bio_prokaryotes)；ATP 与能量依赖运输 (bio_cell_energy_transport) | 2 / 1 / 0 / 0 / 0 / 3 |
| 5.1 Replication and division of nuclei and cells | 23 | 6 | DNA、RNA 与 DNA 复制 (bio_chromosomes_dna_bio_dna_structure)；原核细胞、病毒与细胞尺度 (bio_cell_structure_bio_prokaryotes) | 1 / 5 / 0 / 0 / 0 / 0 |
| 5.2 Chromosome behaviour in mitosis | 23 | 2 | 染色体行为与有丝分裂 (bio_chromosomes_dna)；原核细胞、病毒与细胞尺度 (bio_cell_structure_bio_prokaryotes) | 0 / 1 / 0 / 0 / 0 / 1 |
| 6.1 Structure of nucleic acids and replication of DNA | 24 | 5 | DNA、RNA 与 DNA 复制 (bio_chromosomes_dna_bio_dna_structure)；核酸与蛋白质合成 (bio_nucleic_acids) | 1 / 4 / 0 / 0 / 0 / 0 |
| 6.2 Protein synthesis | 24, 25 | 7 | 核酸与蛋白质合成 (bio_nucleic_acids)；遗传技术 (bio_genetic_tech) | 2 / 5 / 0 / 0 / 0 / 0 |
| 7.1 Structure of transport tissues | 26 | 4 | 植物运输 (bio_transport_plants)；膜、被动运输与交换尺度 (bio_membranes) | 0 / 2 / 0 / 0 / 0 / 2 |
| 7.2 Transport mechanisms | 26 | 8 | 植物运输 (bio_transport_plants)；ATP 与能量依赖运输 (bio_cell_energy_transport) | 0 / 7 / 0 / 0 / 0 / 1 |
| 8.1 The circulatory system | 27 | 7 | 心脏与血管 (bio_circulation_gas_exchange)；血糖调节与生物传感 (bio_glucose_homeostasis) | 0 / 5 / 0 / 0 / 0 / 2 |
| 8.2 Transport of oxygen and carbon dioxide | 28 | 6 | 血红蛋白、二氧化碳运输与气体交换 (bio_circulation_gas_exchange_bio_haemoglobin)；ATP 与能量依赖运输 (bio_cell_energy_transport) | 2 / 3 / 1 / 0 / 0 / 0 |
| 8.3 The heart | 28 | 4 | 心脏与血管 (bio_circulation_gas_exchange)；脂质、蛋白质与胶原 (bio_molecules_bio_lipids) | 0 / 4 / 0 / 0 / 0 / 0 |
| 9.1 The gas exchange system | 29 | 7 | 血红蛋白、二氧化碳运输与气体交换 (bio_circulation_gas_exchange_bio_haemoglobin)；膜、被动运输与交换尺度 (bio_membranes) | 1 / 4 / 0 / 0 / 0 / 2 |
| 10.1 Infectious diseases | 30 | 4 | 传染病与抗生素 (bio_disease)；免疫应答、抗体与疫苗接种 (bio_immunity) | 1 / 3 / 0 / 0 / 0 / 0 |
| 10.2 Antibiotics | 30 | 2 | 传染病与抗生素 (bio_disease)；酶活性、动力学与抑制 (bio_enzyme_kinetics) | 1 / 1 / 0 / 0 / 0 / 0 |
| 11.1 The immune system | 31 | 4 | 免疫应答、抗体与疫苗接种 (bio_immunity)；稳态、肾脏与含氮排泄 (bio_homeostasis) | 0 / 4 / 0 / 0 / 0 / 0 |
| 11.2 Antibodies and vaccination | 31 | 6 | 免疫应答、抗体与疫苗接种 (bio_immunity)；心脏与血管 (bio_circulation_gas_exchange) | 0 / 6 / 0 / 0 / 0 / 0 |
| 12.1 Energy | 32 | 7 | ATP 与能量依赖运输 (bio_cell_energy_transport)；核酸与蛋白质合成 (bio_nucleic_acids) | 3 / 3 / 0 / 0 / 0 / 1 |
| 12.2 Respiration | 33, 34 | 14 | 氧化磷酸化与无氧呼吸 (bio_respiration_bio_oxidative)；显微镜与真核细胞器 (bio_cell_structure) | 2 / 9 / 0 / 0 / 0 / 3 |
| 13.1 Photosynthesis as an energy transfer process | 35, 36 | 12 | ATP 与能量依赖运输 (bio_cell_energy_transport)；心脏与血管 (bio_circulation_gas_exchange) | 2 / 8 / 0 / 0 / 0 / 2 |
| 13.2 Investigation of limiting factors | 36 | 4 | Calvin 循环与限制因素 (bio_photosynthesis_calvin)；酶活性、动力学与抑制 (bio_enzyme_kinetics) | 1 / 1 / 0 / 0 / 0 / 2 |
| 14.1 Homeostasis in mammals | 37, 38 | 11 | 稳态、肾脏与含氮排泄 (bio_homeostasis)；生物多样性调查与保护 (bio_biodiversity) | 2 / 8 / 0 / 0 / 0 / 1 |
| 14.2 Homeostasis in plants | 38 | 4 | 植物运输 (bio_transport_plants)；稳态、肾脏与含氮排泄 (bio_homeostasis) | 1 / 3 / 0 / 0 / 0 / 0 |
| 15.1 Control and coordination in mammals | 39 | 12 | 激素控制与植物响应 (bio_coordination_bio_hormonal)；血糖调节与生物传感 (bio_glucose_homeostasis) | 3 / 8 / 0 / 0 / 0 / 1 |
| 15.2 Control and coordination in plants | 40 | 3 | 植物运输 (bio_transport_plants)；激素控制与植物响应 (bio_coordination_bio_hormonal) | 1 / 2 / 0 / 0 / 0 / 0 |
| 16.1 Passage of information from parents to offspring | 41 | 7 | 减数分裂、遗传杂交与连锁 (bio_inheritance)；群体遗传与选择育种 (bio_population_genetics_breeding) | 1 / 5 / 0 / 0 / 0 / 1 |
| 16.2 The roles of genes in determining the phenotype | 41, 42 | 7 | 核酸与蛋白质合成 (bio_nucleic_acids)；减数分裂、遗传杂交与连锁 (bio_inheritance) | 1 / 6 / 0 / 0 / 0 / 0 |
| 16.3 Gene control | 42 | 4 | 真核与原核基因表达调控 (bio_inheritance_bio_linkage)；遗传技术 (bio_genetic_tech) | 1 / 3 / 0 / 0 / 0 / 0 |
| 17.1 Variation | 43 | 4 | 选择与进化 (bio_evolution)；Calvin 循环与限制因素 (bio_photosynthesis_calvin) | 1 / 3 / 0 / 0 / 0 / 0 |
| 17.2 Natural and artificial selection | 43 | 7 | 选择与进化 (bio_evolution)；水、单体与碳水化合物 (bio_molecules) | 3 / 4 / 0 / 0 / 0 / 0 |
| 17.3 Evolution | 44 | 3 | 选择与进化 (bio_evolution)；核酸与蛋白质合成 (bio_nucleic_acids) | 0 / 3 / 0 / 0 / 0 / 0 |
| 18.1 Classification | 45 | 6 | 生态系统、生态位与分类 (bio_ecology_classification)；原核细胞、病毒与细胞尺度 (bio_cell_structure_bio_prokaryotes) | 1 / 5 / 0 / 0 / 0 / 0 |
| 18.2 Biodiversity | 45, 46 | 6 | 生物多样性调查与保护 (bio_biodiversity)；生态系统、生态位与分类 (bio_ecology_classification) | 2 / 4 / 0 / 0 / 0 / 0 |
| 18.3 Conservation | 46 | 6 | 生物多样性调查与保护 (bio_biodiversity)；选择与进化 (bio_evolution) | 1 / 5 / 0 / 0 / 0 / 0 |
| 19.1 Principles of genetic technology | 47 | 11 | 遗传技术 (bio_genetic_tech)；减数分裂、遗传杂交与连锁 (bio_inheritance) | 3 / 8 / 0 / 0 / 0 / 0 |
| 19.2 Genetic technology applied to medicine | 48 | 4 | 遗传技术 (bio_genetic_tech)；减数分裂、遗传杂交与连锁 (bio_inheritance) | 0 / 4 / 0 / 0 / 0 / 0 |
| 19.3 Genetically modified organisms in agriculture | 48 | 2 | 遗传技术 (bio_genetic_tech)；氧化磷酸化与无氧呼吸 (bio_respiration_bio_oxidative) | 0 / 2 / 0 / 0 / 0 / 0 |

## 待人工判断项

| 定位 | 类型 | Syllabus 页 | 关键词 | 候选或相关概念 | 信号 |
|---|---|---:|---|---|---|
| 1.1 outcome 1 | practical_skill | 15 | cellular, light, make, material, microscope, preparations, suitable, temporary | 显微镜 (bio_microscopy，已抽样核验) | skill_mapping_required |
| 1.1 outcome 2 | practical_skill | 15 | cell, draw, micrograph, microscope, slides | 显微镜 (bio_microscopy，已抽样核验) | skill_mapping_required |
| 1.1 outcome 4 | practical_skill | 15 | appropriate, eyepiece, graticule, make, measurement, micrometer, micrometre, millimetre | 显微镜 (bio_microscopy，已抽样核验) | skill_mapping_required |
| 1.1 outcome 5 | concept | 15 | microscope, between, define, differences, electron, light, magnification, reference | 显微镜 (bio_microscopy，已抽样核验) | candidate_partial |
| 1.2 outcome 1 | concept | 15 | cell, golgi, chloroplasts, circular, dna, endoplasmic, mitochondria, presence | 真核细胞器 (bio_organelles，已抽样核验) | candidate_partial |
| 1.2 outcome 2 | practical_skill | 16 | micrograph, animal, cell, drawings, electron, interpret, plant, typical | 真核细胞器 (bio_organelles，已抽样核验) | skill_mapping_required |
| 1.2 outcome 3 | concept | 16 | animal, cell, compare, plant, structure, typical | 真核细胞器 (bio_organelles，已抽样核验) | candidate_partial |
| 1.2 outcome 5 | concept | 16 | cell, 70s, absence, bacterium, circular, diameter, dna, double | 原核细胞 (bio_prokaryotes，已抽样核验) | candidate_partial |
| 1.2 outcome 6 | concept | 16 | cell, typical, animals, bacterium, compare, eukaryotic, found, plants | 原核细胞 (bio_prokaryotes，已抽样核验) | candidate_partial |
| 2.1 outcome 1 | practical_skill | 17 | test, benedict, biuret, carry, emulsion, iodine, lipids, out | 生化检测 (bio_tests，已抽样核验) | skill_mapping_required |
| 2.1 outcome 2 | practical_skill | 17 | colour, test, benedict, carry, change, comparison, concentration, estimate | 生化检测 (bio_tests，已抽样核验) | skill_mapping_required |
| 2.1 outcome 3 | practical_skill | 17 | acid, benedict, carry, hydrolysis, identify, non, out, presence | 生化检测 (bio_tests，已抽样核验) | skill_mapping_required |
| 2.2 outcome 1 | concept_and_skill | 17 | glucose, draw, forms, ring | 碳水化合物 (bio_carbohydrates，已抽样核验) | candidate_partial |
| 2.2 outcome 2 | concept | 17 | define, disaccharide, macromolecule, monomer, monosaccharide, polymer, polysaccharide, terms | 碳水化合物 (bio_carbohydrates，已抽样核验) | candidate_partial |
| 2.2 outcome 4 | concept | 17 | reducing, fructose, glucose, maltose, non, sucrose, sugar, sugars | 碳水化合物 (bio_carbohydrates，已抽样核验) | candidate_partial |
| 2.2 outcome 5 | concept | 17 | bond, condensation, disaccharides, formation, glycosidic, polysaccharides, reference, sucrose | 碳水化合物 (bio_carbohydrates，已抽样核验) | candidate_partial |
| 2.2 outcome 6 | concept | 18 | bond, breakage, disaccharides, glycosidic, hydrolysis, non, polysaccharides, reducing | 碳水化合物 (bio_carbohydrates，已抽样核验) | candidate_partial |
| 2.2 outcome 7 | concept | 18 | amylopectin, amylose, functions, glycogen, living, molecular, organisms, polysaccharides | 碳水化合物 (bio_carbohydrates，已抽样核验) | candidate_partial |
| 2.2 outcome 8 | concept | 18 | cellulose, arrangement, cell, contributes, function, how, molecular, molecules | 碳水化合物 (bio_carbohydrates，已抽样核验) | candidate_partial |
| 2.2 outcome 9 | concept | 18 | triglycerides, acids, bonds, ester, fatty, formation, glycerol, hydrophobic | 脂质 (bio_lipids，已抽样核验) | candidate_partial |
| 2.2 outcome 10 | concept | 18 | functions, living, molecular, organisms, relate, structure, triglycerides | 脂质 (bio_lipids，已抽样核验) | candidate_partial |
| 2.2 outcome 11 | concept | 18 | polar, acid, fatty, heads, hydrophilic, hydrophobic, molecular, non | 脂质 (bio_lipids，已抽样核验) | candidate_partial |
| 2.3 outcome 1 | concept_and_skill | 18 | acid, amino, bond, breakage, draw, formation, general, peptide | 蛋白质 (bio_proteins，已抽样核验) | candidate_partial |
| 2.3 outcome 2 | concept | 18 | structure, meaning, primary, proteins, quaternary, secondary, terms, tertiary | 蛋白质 (bio_proteins，已抽样核验) | candidate_partial |
| 2.3 outcome 3 | concept | 18 | bonding, bonds, covalent, disulfide, hold, hydrogen, hydrophobic, interaction | 蛋白质 (bio_proteins，已抽样核验) | candidate_partial |
| 2.3 outcome 4 | concept | 18 | generally, have, proteins, roles, fibrous, globular, insoluble, physiological | 蛋白质 (bio_proteins，已抽样核验) | candidate_partial |
| 2.3 outcome 5 | concept | 18 | chains, globin, structure, two, alpha, beta, example, formation | 蛋白质 (bio_proteins，已抽样核验) | candidate_partial |
| 2.3 outcome 6 | concept | 18 | function, group, haem, haemoglobin, importance, iron, relate, structure | 血红蛋白与氧气运输 (bio_haemoglobin，已抽样核验) | candidate_partial |
| 2.4 outcome 1 | concept | 19 | heat, water, action, between, bonding, capacity, high, how | 水 (bio_water，已抽样核验) | candidate_partial |
| 3.1 outcome 1 | concept | 20 | enzymes, catalyse, cell, reaction, extracellular, globular, inside, intracellular | 酶作用 (bio_enzyme_action，已抽样核验) | candidate_partial |
| 3.1 outcome 2 | concept | 20 | enzyme, hypothesis, action, activation, active, complex, energy, enzymes | 酶作用 (bio_enzyme_action，已抽样核验) | candidate_partial |
| 3.1 outcome 3 | practical_skill | 20 | rates, amylase, catalase, catalysed, disappearance, enzyme, formation, investigate | 酶作用 (bio_enzyme_action，已抽样核验) | skill_mapping_required |
| 3.1 outcome 4 | practical_skill | 20 | catalysed, changes, colorimeter, colour, enzyme, involve, measuring, outline | 酶作用 (bio_enzyme_action，已抽样核验) | skill_mapping_required |
| 3.2 outcome 1 | practical_skill | 20 | concentration, enzyme, buffer, catalysed, effects, factors, following, inhibitor | 影响酶活性的因素 (bio_enzyme_factors，已抽样核验) | skill_mapping_required |
| 3.2 outcome 4 | practical_skill | 20 | enzyme, immobilised, activity, advantages, alginate, between, difference, enzymes | 酶作用 (bio_enzyme_action，已抽样核验) | skill_mapping_required |
| 4.1 outcome 1 | concept | 21 | account, arrangement, bilayer, fluid, formation, hydrophilic, hydrophobic, interactions | 膜结构 (bio_membrane_structure，已抽样核验) | candidate_partial |
| 4.1 outcome 2 | concept | 21 | arrangement, cell, cholesterol, glycolipids, glycoproteins, membranes, surface | 膜结构 (bio_membrane_structure，已抽样核验) | candidate_partial |
| 4.1 outcome 3 | concept | 21 | cell, proteins, surface, antigens, carrier, channel, cholesterol, fluidity | 膜结构 (bio_membrane_structure，已抽样核验) | candidate_partial |
| 4.1 outcome 4 | concept | 21 | cell, ligands, specific, target, binding, chemicals, leading, main | 激素控制 (bio_hormonal，已抽样核验) | candidate_partial |
| 4.2 outcome 2 | practical_skill | 21 | agar, dialysis, diffusion, investigate, living, materials, non, osmosis | 扩散与渗透 (bio_passive_transport，已抽样核验) | skill_mapping_required |
| 4.2 outcome 4 | practical_skill | 21 | agar, area, blocks, changing, different, diffusion, effect, investigate | 扩散与渗透 (bio_passive_transport，已抽样核验) | skill_mapping_required |
| 4.2 outcome 5 | practical_skill | 22 | tissues, water, different, effects, estimate, immersing, investigate, plant | 扩散与渗透 (bio_passive_transport，已抽样核验) | skill_mapping_required |
| 4.2 outcome 6 | concept | 22 | cell, potential, water, movement, animal, between, different, effects | 扩散与渗透 (bio_passive_transport，已抽样核验) | candidate_partial |
| 5.1 outcome 1 | concept | 23 | centromere, chromatids, chromosome, dna, histone, limited, proteins, sister | 染色体行为 (bio_chromosomes，已抽样核验) | candidate_partial |
| 5.1 outcome 2 | concept | 23 | cell, replacement, asexual, damaged, daughter, dead, during, genetically | 有丝分裂 (bio_mitosis，已抽样核验) | candidate_partial |
| 5.1 outcome 3 | concept | 23 | cell, cycle, cytokinesis, dna, g1, g2, growth, interphase | DNA复制 (bio_dna_replication，已抽样核验) | candidate_partial |
| 5.1 outcome 4 | concept | 23 | chromosomes, dna, during, ends, genes, loss, outline, preventing | 染色体行为 (bio_chromosomes，已抽样核验) | candidate_partial |
| 5.1 outcome 5 | concept | 23 | cell, mitosis, outline, repair, replacement, role, stem, tissue | 有丝分裂 (bio_mitosis，已抽样核验) | candidate_partial |
| 5.2 outcome 1 | concept | 23 | cell, behaviour, anaphase, animal, associated, chromosomes, cycle, during | 有丝分裂 (bio_mitosis，已抽样核验) | candidate_partial |
| 5.2 outcome 2 | practical_skill | 23 | cell, stages, cycle, diagrams, different, identify, interpret, main | 有丝分裂 (bio_mitosis，已抽样核验) | skill_mapping_required |
| 6.1 outcome 1 | concept | 24 | atp, expected, formulae, nucleotide, nucleotides, phosphorylated, structural, structure | DNA结构 (bio_dna_structure，已抽样核验) | candidate_partial |
| 6.1 outcome 2 | concept | 24 | bases, ring, structure, adenine, cytosine, double, expected, formulae | DNA结构 (bio_dna_structure，已抽样核验) | candidate_partial |
| 6.1 outcome 3 | concept | 24 | base, between, strand, antiparallel, bonding, bonds, complementary, differences | DNA结构 (bio_dna_structure，已抽样核验) | candidate_partial |
| 6.1 outcome 4 | concept | 24 | dna, polymerase, replication, cell, strand, adding, between, consequence | DNA复制 (bio_dna_replication，已抽样核验) | candidate_partial |
| 6.2 outcome 1 | concept | 24 | gene, coded, dna, forms, molecule, nucleotides, part, polypeptide | 转录 (bio_transcription，已抽样核验) | candidate_partial |
| 6.2 outcome 2 | concept | 24 | code, acids, amino, bases, codons, correspond, different, dna | 翻译 (bio_translation，已抽样核验) | candidate_partial |
| 6.2 outcome 4 | concept | 25 | strand, called, transcribed, dna, molecule, non, other, template | 转录 (bio_transcription，已抽样核验) | candidate_partial |
| 6.2 outcome 5 | concept | 25 | coding, sequences, eukaryotes, exons, following, form, formed, introns | 转录 (bio_transcription，已抽样核验) | candidate_partial |
| 6.2 outcome 7 | concept | 25 | mutation, affect, deletion, dna, each, gene, how, insertion | 基因突变 (bio_mutation，已抽样核验) | candidate_partial |
| 7.1 outcome 1 | practical_skill | 26 | diagrams, dicotyledonous, draw, herbaceous, leaves, micrograph, microscope, plan | 木质部与水分运输 (bio_xylem，已抽样核验) | skill_mapping_required |
| 7.1 outcome 2 | concept | 26 | dicotyledonous, distribution, herbaceous, leaves, phloem, plants, root, sections | 木质部与水分运输 (bio_xylem，已抽样核验) | candidate_partial |
| 7.1 outcome 3 | practical_skill | 26 | elements, micrograph, cell, companion, draw, electron, label, microscope | 木质部与水分运输 (bio_xylem，已抽样核验) | skill_mapping_required |
| 7.1 outcome 4 | concept | 26 | elements, cell, companion, functions, phloem, relate, sieve, structure | 木质部与水分运输 (bio_xylem，已抽样核验) | candidate_partial |
| 7.2 outcome 1 | concept | 26 | can, compounds, dissolved, ion, mineral, organic, plants, some | 木质部与水分运输 (bio_xylem，已抽样核验) | candidate_partial |
| 7.2 outcome 2 | concept | 26 | pathway, reference, apoplast, casparian, cellulose, endodermis, lignin, soil | 木质部与水分运输 (bio_xylem，已抽样核验) | candidate_partial |
| 7.2 outcome 3 | concept | 26 | water, atmosphere, diffusion, evaporation, followed, internal, involves, leaves | 蒸腾作用 (bio_transpiration，已抽样核验) | candidate_partial |
| 7.2 outcome 4 | concept | 26 | water, adhesion, bonding, cell, cellulose, cohesion, how, hydrogen | 木质部与水分运输 (bio_xylem，已抽样核验) | candidate_partial |
| 7.2 outcome 5 | practical_skill | 26 | adapted, annotated, drawings, how, leaves, loss, make, plants | 蒸腾作用 (bio_transpiration，已抽样核验) | skill_mapping_required |
| 7.2 outcome 6 | concept | 26 | acids, amino, assimilates, dissolved, move, phloem, sieve, sinks | 韧皮部与转运 (bio_phloem，已抽样核验) | candidate_partial |
| 7.2 outcome 7 | concept | 26 | assimilates, cell, companion, cotransporter, how, phloem, proteins, proton | 韧皮部与转运 (bio_phloem，已抽样核验) | candidate_partial |
| 7.2 outcome 8 | concept | 26 | down, flow, gradient, hydrostatic, mass, phloem, pressure, sieve | 韧皮部与转运 (bio_phloem，已抽样核验) | candidate_partial |
| 8.1 outcome 1 | concept | 27 | blood, arteries, arterioles, capillaries, circulation, circulatory, closed, consisting | 心脏 (bio_heart，已抽样核验) | candidate_partial |
| 8.1 outcome 2 | concept | 27 | pulmonary, aorta, artery, blood, cava, circulations, functions, limited | 血管 (bio_blood_vessels，已抽样核验) | candidate_partial |
| 8.1 outcome 3 | practical_skill | 27 | arteries, micrograph, section, veins, capillaries, diagrams, electron, longitudinal | 血管 (bio_blood_vessels，已抽样核验) | skill_mapping_required |
| 8.1 outcome 4 | concept | 27 | arteries, capillaries, each, elastic, functions, how, muscular, related | 血管 (bio_blood_vessels，已抽样核验) | candidate_partial |
| 8.1 outcome 5 | practical_skill | 27 | micrograph, blood, cell, draw, electron, lymphocytes, microscope, monocytes | 血红蛋白与氧气运输 (bio_haemoglobin，已抽样核验) | skill_mapping_required |
| 8.1 outcome 6 | concept | 27 | water, action, blood, capacity, component, fluid, heat, high | 水 (bio_water，已抽样核验) | candidate_partial |
| 8.1 outcome 7 | concept | 27 | fluid, tissue, capillary, formation, functions, network | 血管 (bio_blood_vessels，已抽样核验) | candidate_partial |
| 8.2 outcome 1 | concept | 28 | formation, acid, anhydrase, blood, carbaminohaemoglobin, carbon, carbonic, cell | 二氧化碳运输与氯离子转移 (bio_carbon_dioxide_transport，已抽样核验) | ambiguous |
| 8.2 outcome 4 | concept | 28 | adult, curve, dissociation, haemoglobin, oxygen | 血红蛋白与氧气运输 (bio_haemoglobin，已抽样核验) | candidate_partial |
| 8.2 outcome 5 | concept | 28 | oxygen, at, curve, dissociation, importance, lungs, partial, pressures | 血红蛋白与氧气运输 (bio_haemoglobin，已抽样核验) | candidate_partial |
| 8.2 outcome 6 | concept | 28 | bohr, shift, importance | 二氧化碳运输与氯离子转移 (bio_carbon_dioxide_transport，已抽样核验) | candidate_partial |
| 8.3 outcome 1 | concept | 28 | external, heart, internal, mammalian, structure | 心脏 (bio_heart，已抽样核验) | candidate_partial |
| 8.3 outcome 2 | concept | 28 | ventricle, atria, differences, left, right, thickness, ventricles, walls | 心脏 (bio_heart，已抽样核验) | candidate_partial |
| 8.3 outcome 3 | concept | 28 | between, blood, cardiac, changes, closing, cycle, diastole, during | 心脏 (bio_heart，已抽样核验) | candidate_partial |
| 8.3 outcome 4 | concept | 28 | node, atrioventricular, cardiac, control, cycle, expected, hormonal, knowledge | 心脏 (bio_heart，已抽样核验) | candidate_partial |
| 9.1 outcome 1 | concept | 29 | alveoli, bronchi, bronchioles, capillary, exchange, gas, human, limited | 肺部气体交换 (bio_lungs，已抽样核验) | candidate_partial |
| 9.1 outcome 2 | concept | 29 | epithelium, alveoli, capillaries, cartilage, cell, ciliated, distribution, exchange | 肺部气体交换 (bio_lungs，已抽样核验) | candidate_partial |
| 9.1 outcome 3 | practical_skill | 29 | epithelium, micrograph, alveoli, capillaries, cartilage, cell, ciliated, electron | 肺部气体交换 (bio_lungs，已抽样核验) | skill_mapping_required |
| 9.1 outcome 4 | practical_skill | 29 | micrograph, trachea, alveoli, bronchi, bronchioles, bronchus, diagrams, electron | 肺部气体交换 (bio_lungs，已抽样核验) | skill_mapping_required |
| 9.1 outcome 5 | concept | 29 | cell, ciliated, epithelial, exchange, functions, gas, glands, goblet | 肺部气体交换 (bio_lungs，已抽样核验) | candidate_partial |
| 9.1 outcome 6 | concept | 29 | cartilage, elastic, epithelium, exchange, fibres, functions, gas, muscle | 肺部气体交换 (bio_lungs，已抽样核验) | candidate_partial |
| 10.1 outcome 2 | concept | 30 | caused, plasmodium, bacterium, hiv, mycobacterium, tuberculosis, aids, bovis | 传染病 (bio_infectious，已抽样核验) | candidate_partial |
| 10.1 outcome 3 | concept | 30 | cholera, hiv, how, malaria, tb, transmitted | 传染病 (bio_infectious，已抽样核验) | candidate_partial |
| 10.1 outcome 4 | concept | 30 | biological, cholera, considered, control, cycle, details, discuss, economic | 传染病 (bio_infectious，已抽样核验) | candidate_partial |
| 10.2 outcome 2 | concept | 30 | antibiotic, can, consequences, discuss, impact, reduce, resistance, steps | 传染病 (bio_infectious，已抽样核验) | candidate_partial |
| 11.1 outcome 1 | concept | 31 | action, macrophages, mode, neutrophils, phagocytes | 免疫应答 (bio_immune_response，已抽样核验) | candidate_partial |
| 11.1 outcome 2 | concept | 31 | antigens, self, antigen, between, difference, meant, non, see | 抗体与疫苗接种 (bio_antibodies，已抽样核验) | candidate_partial |
| 11.1 outcome 3 | concept | 31 | cell, lymphocytes, during, events, helper, immune, killer, limited | 免疫应答 (bio_immune_response，已抽样核验) | candidate_partial |
| 11.1 outcome 4 | concept | 31 | cell, immune, immunity, long, memory, response, role, secondary | 免疫应答 (bio_immune_response，已抽样核验) | candidate_partial |
| 11.2 outcome 1 | concept | 31 | antibodies, functions, molecular, relate, structure | 抗体与疫苗接种 (bio_antibodies，已抽样核验) | candidate_partial |
| 11.2 outcome 2 | concept | 31 | antibodies, hybridoma, method, monoclonal, outline, production | 抗体与疫苗接种 (bio_antibodies，已抽样核验) | candidate_partial |
| 11.2 outcome 3 | concept | 31 | disease, antibodies, diagnosis, monoclonal, outline, principles, treatment | 抗体与疫苗接种 (bio_antibodies，已抽样核验) | candidate_partial |
| 11.2 outcome 4 | concept | 31 | immunity, between, active, artificial, differences, natural, passive | 抗体与疫苗接种 (bio_antibodies，已抽样核验) | candidate_partial |
| 11.2 outcome 5 | concept | 31 | antigens, contain, immune, immunity, long, provide, responses, stimulate | 抗体与疫苗接种 (bio_antibodies，已抽样核验) | candidate_partial |
| 11.2 outcome 6 | concept | 31 | can, control, diseases, help, how, infectious, programmes, spread | 抗体与疫苗接种 (bio_antibodies，已抽样核验) | candidate_partial |
| 12.1 outcome 1 | concept | 32 | active, anabolic, dna, energy, illustrated, living, movement, need | 主动运输 (bio_active_transport，已抽样核验) | candidate_partial |
| 12.1 outcome 3 | concept | 32 | atp, chemiosmosis, chloroplasts, linked, membranes, mitochondria, phosphate, reaction | 糖酵解 (bio_glycolysis，已抽样核验) | candidate_partial |
| 12.1 outcome 4 | concept | 32 | carbohydrates, energy, lipids, proteins, relative, respiratory, substrates, values | 碳水化合物 (bio_carbohydrates，已抽样核验) | candidate_partial |
| 12.1 outcome 7 | practical_skill | 32 | blowfly, carry, germinating, invertebrates, investigations, larvae, out, respirometers | 呼吸商 (bio_respiratory_quotient，已抽样核验) | skill_mapping_required |
| 12.2 outcome 1 | concept | 33 | matrix, mitochondrial, aerobic, cell, cycle, cytoplasm, each, eukaryotic | 糖酵解 (bio_glycolysis，已抽样核验) | candidate_partial |
| 12.2 outcome 2 | concept | 33 | 3c, 6c, atp, bisphosphate, fructose, further, glucose, glycolysis | 糖酵解 (bio_glycolysis，已抽样核验) | candidate_partial |
| 12.2 outcome 3 | concept | 33 | available, enters, link, mitochondria, oxygen, part, pyruvate, reaction | 连接反应与Krebs循环 (bio_krebs，已抽样核验) | candidate_partial |
| 12.2 outcome 4 | concept | 33 | 2c, acetyl, coenzyme, groups, link, reaction, role, transfer | 连接反应与Krebs循环 (bio_krebs，已抽样核验) | candidate_partial |
| 12.2 outcome 5 | concept | 33 | oxaloacetate, 2c, 4c, 6c, acceptor, acetyl, acts, back | 连接反应与Krebs循环 (bio_krebs，已抽样核验) | candidate_partial |
| 12.2 outcome 6 | concept | 33 | coenzymes, cycle, decarboxylation, dehydrogenation, fad, involve, krebs, nad | 连接反应与Krebs循环 (bio_krebs，已抽样核验) | candidate_partial |
| 12.2 outcome 7 | concept | 33 | carriers, fad, hydrogen, inner, membrane, mitochondrial, nad, role | 氧化磷酸化 (bio_oxidative，已抽样核验) | candidate_partial |
| 12.2 outcome 8 | concept | 33 | electron, atp, energy, proton, details, energetic, expected, mitochondrial | 氧化磷酸化 (bio_oxidative，已抽样核验) | candidate_partial |
| 12.2 outcome 9 | practical_skill | 33 | between, diagrams, electron, function, micrograph, mitochondria, relationship, structure | 真核细胞器 (bio_organelles，已抽样核验) | skill_mapping_required |
| 12.2 outcome 12 | concept | 34 | root, adapted, aerenchyma, development, ethanol, faster, fermentation, grow | 无氧呼吸 (bio_anaerobic，已抽样核验) | candidate_partial |
| 12.2 outcome 13 | practical_skill | 34 | blue, carry, concentration, dcpip, effects, indicators, investigations, methylene | 糖酵解 (bio_glycolysis，已抽样核验) | skill_mapping_required |
| 12.2 outcome 14 | practical_skill | 34 | carry, effect, investigations, on, out, rate, respiration, respirometers | 糖酵解 (bio_glycolysis，已抽样核验) | skill_mapping_required |
| 13.1 outcome 1 | practical_skill | 35 | between, chloroplasts, diagrams, electron, function, micrograph, relationship, shown | 真核细胞器 (bio_organelles，已抽样核验) | skill_mapping_required |
| 13.1 outcome 3 | concept | 35 | light, site, stage, thylakoid, called, chloroplast, dependent, grana | 光依赖反应 (bio_light_dependent，已抽样核验) | candidate_partial |
| 13.1 outcome 4 | concept | 35 | chlorophyll, absorption, carotene, chloroplast, light, pigments, role, thylakoids | 光依赖反应 (bio_light_dependent，已抽样核验) | candidate_partial |
| 13.1 outcome 6 | practical_skill | 35 | chloroplast, pigments, chromatography, identification, identify, made, reference, rf | 光合色素与光谱 (bio_photosynthetic_pigments_spectra，已抽样核验) | skill_mapping_required |
| 13.1 outcome 7 | concept | 35 | cyclic, photophosphorylation, dependent, during, light, non, occur, photosynthesis | 光依赖反应 (bio_light_dependent，已抽样核验) | candidate_partial |
| 13.1 outcome 8 | concept | 35 | atp, chlorophyll, cyclic, involved, occurs, only, photoactivation, photophosphorylation | 光依赖反应 (bio_light_dependent，已抽样核验) | candidate_partial |
| 13.1 outcome 9 | concept | 35 | photosystem, atp, both, catalyses, chlorophyll, complex, cyclic, evolving | 光依赖反应 (bio_light_dependent，已抽样核验) | candidate_partial |
| 13.1 outcome 10 | concept | 36 | atp, energy, details, electron, expected, proton, synthase, through | 光依赖反应 (bio_light_dependent，已抽样核验) | candidate_partial |
| 13.1 outcome 11 | concept | 36 | atp, compound, gp, phosphate, reaction, reduced, rubp, tp | Calvin循环 (bio_calvin，已抽样核验) | candidate_partial |
| 13.1 outcome 12 | concept | 36 | produce, acids, amino, calvin, carbohydrates, cycle, gp, intermediates | Calvin循环 (bio_calvin，已抽样核验) | candidate_partial |
| 13.2 outcome 2 | concept | 36 | carbon, changes, concentration, dioxide, effects, intensity, light, on | 限制因素 (bio_limiting_factors，已抽样核验) | candidate_partial |
| 13.2 outcome 3 | practical_skill | 36 | light, blue, carry, chloroplasts, dcpip, effects, indicators, intensity | 光依赖反应 (bio_light_dependent，已抽样核验) | skill_mapping_required |
| 13.2 outcome 4 | practical_skill | 36 | plants, aquatic, carbon, carry, concentration, dioxide, effects, intensity | 限制因素 (bio_limiting_factors，已抽样核验) | skill_mapping_required |
| 14.1 outcome 1 | concept | 37 | homeostasis, importance, mammals, meant, what | 体内平衡原理 (bio_homeostasis_principles，已抽样核验) | candidate_partial |
| 14.1 outcome 2 | concept | 37 | system, coordination, effectors, endocrine, external, feedback, glands, homeostasis | 体内平衡原理 (bio_homeostasis_principles，已抽样核验) | candidate_partial |
| 14.1 outcome 4 | concept | 37 | renal, artery, branches, capsule, cortex, fibrous, human, kidney | 肾脏与渗透压调节 (bio_kidney，已抽样核验) | candidate_partial |
| 14.1 outcome 5 | practical_skill | 37 | convoluted, micrograph, tubule, associated, blood, bowman, capsule, collecting | 肾脏与渗透压调节 (bio_kidney，已抽样核验) | skill_mapping_required |
| 14.1 outcome 6 | concept | 37 | formation, bowman, capsule, convoluted, filtrate, glomerular, limited, nephron | 肾脏与渗透压调节 (bio_kidney，已抽样核验) | candidate_partial |
| 14.1 outcome 7 | concept | 37 | bowman, capsule, convoluted, detailed, formation, functions, proximal, relate | 肾脏与渗透压调节 (bio_kidney，已抽样核验) | candidate_partial |
| 14.1 outcome 8 | concept | 37 | adh, antidiuretic, aquaporins, collecting, ducts, gland, hormone, hypothalamus | 肾脏与渗透压调节 (bio_kidney，已抽样核验) | candidate_partial |
| 14.1 outcome 9 | concept | 38 | activation, enzyme, camp, cascade, cell, leading, more, protein | 血糖控制 (bio_glucose_control，已抽样核验) | candidate_partial |
| 14.1 outcome 10 | concept | 38 | cell, liver, on, blood, concentration, control, effect, effects | 血糖控制 (bio_glucose_control，已抽样核验) | candidate_partial |
| 14.2 outcome 1 | concept | 38 | need, aperture, balances, carbon, changes, closing, conditions, diffusion | 蒸腾作用 (bio_transpiration，已抽样核验) | candidate_partial |
| 14.2 outcome 2 | concept | 38 | closing, daily, have, opening, rhythms, stomata | 蒸腾作用 (bio_transpiration，已抽样核验) | candidate_partial |
| 14.2 outcome 3 | concept | 38 | cell, close, function, guard, mechanism, open, stomata, structure | 蒸腾作用 (bio_transpiration，已抽样核验) | candidate_partial |
| 15.1 outcome 2 | concept | 39 | system, compare, endocrine, features, nervous | 神经传导 (bio_nervous，已抽样核验) | candidate_partial |
| 15.1 outcome 3 | concept | 39 | neurones, motor, neurone, sensory, connect, function, intermediate, structure | 神经传导 (bio_nervous，已抽样核验) | candidate_partial |
| 15.1 outcome 4 | concept | 39 | sensory, cell, detecting, impulses, neurones, outline, receptor, role | 神经传导 (bio_nervous，已抽样核验) | candidate_partial |
| 15.1 outcome 5 | concept | 39 | action, bud, cell, chemoreceptor, events, example, human, neurone | 神经传导 (bio_nervous，已抽样核验) | candidate_partial |
| 15.1 outcome 6 | concept | 39 | potential, during, how, resting, action, changes, events, maintained | 神经传导 (bio_nervous，已抽样核验) | candidate_partial |
| 15.1 outcome 7 | concept | 39 | conduction, impulse, myelinated, neurone, rapid, reference, saltatory, transmission | 神经传导 (bio_nervous，已抽样核验) | candidate_partial |
| 15.1 outcome 8 | concept | 39 | determining, frequency, importance, impulses, period, refractory | 神经传导 (bio_nervous，已抽样核验) | candidate_partial |
| 15.1 outcome 9 | concept | 39 | calcium, cholinergic, functions, how, ion, role, structure, synapse | 突触 (bio_synapses，已抽样核验) | candidate_partial |
| 15.1 outcome 11 | practical_skill | 39 | diagrams, electron, micrograph, muscle, reference, sarcomere, striated, structure | 神经肌肉激活与兴奋—收缩耦联 (bio_neuromuscular_activation，已抽样核验) | skill_mapping_required |
| 15.2 outcome 1 | concept | 40 | trap, achieved, closure, fly, hairs, how, leaves, lobes | 植物响应 (bio_plant_responses，已抽样核验) | candidate_partial |
| 15.2 outcome 2 | concept | 40 | acidify, auxin, cell, elongation, growth, proton, pumping, role | 植物响应 (bio_plant_responses，已抽样核验) | candidate_partial |
| 16.1 outcome 1 | concept | 41 | 2n, diploid, haploid, meanings, terms | 减数分裂 (bio_meiosis，已抽样核验) | candidate_partial |
| 16.1 outcome 2 | concept | 41 | chromosomes, homologous, meant, pairs, what | 减数分裂 (bio_meiosis，已抽样核验) | candidate_partial |
| 16.1 outcome 3 | concept | 41 | division, during, gametes, meiosis, need, production, reduction | 减数分裂 (bio_meiosis，已抽样核验) | candidate_partial |
| 16.1 outcome 4 | concept | 41 | ii, prophase, anaphase, behaviour, cell, meiosis, metaphase, telophase | 减数分裂 (bio_meiosis，已抽样核验) | candidate_partial |
| 16.1 outcome 5 | practical_skill | 41 | meiosis, stages, cell, diagrams, different, identify, interpret, main | 减数分裂 (bio_meiosis，已抽样核验) | skill_mapping_required |
| 16.1 outcome 7 | concept | 41 | at, different, fertilisation, fusion, gametes, genetically, individuals, produces | 减数分裂 (bio_meiosis，已抽样核验) | candidate_partial |
| 16.2 outcome 1 | concept | 41 | allele, codominant, cross, dominant, f1, f2, gene, genotype | 遗传杂交 (bio_genetic_crosses，已抽样核验) | candidate_partial |
| 16.2 outcome 2 | concept_and_skill | 41 | crosses, alleles, codominance, construct, diagrams, dihybrid, dominance, genetic | 遗传杂交 (bio_genetic_crosses，已抽样核验) | candidate_partial |
| 16.2 outcome 3 | concept_and_skill | 41 | epistasis, expected, autosomal, construct, crosses, diagrams, different, dihybrid | 遗传杂交 (bio_genetic_crosses，已抽样核验) | candidate_partial |
| 16.2 outcome 4 | concept_and_skill | 41 | construct, crosses, diagrams, genetic, interpret, predict, punnett, results | 遗传杂交 (bio_genetic_crosses，已抽样核验) | candidate_partial |
| 16.2 outcome 6 | concept | 42 | gene, albinism, anaemia, between, cell, disease, f8, factor | 基因突变 (bio_mutation，已抽样核验) | candidate_partial |
| 16.2 outcome 7 | concept | 42 | allele, codes, enzyme, functional, gibberellin, le, role, dominant | 植物响应 (bio_plant_responses，已抽样核验) | candidate_partial |
| 16.3 outcome 1 | concept | 42 | between, differences, enzymes, genes, inducible, regulatory, repressible, structural | 基因表达控制 (bio_gene_control，已抽样核验) | candidate_partial |
| 16.3 outcome 3 | concept | 42 | transcription, bind, control, decreasing, dna, eukaryotes, expression, factors | 基因表达控制 (bio_gene_control，已抽样核验) | candidate_partial |
| 16.3 outcome 4 | concept | 42 | activates, breakdown, causing, della, factors, genes, gibberellin, how | 基因表达控制 (bio_gene_control，已抽样核验) | candidate_partial |
| 17.1 outcome 1 | concept | 43 | factors, environmental, genetic, combination, due, examples, phenotypic, variation | 变异 (bio_variation，已抽样核验) | candidate_partial |
| 17.1 outcome 2 | concept | 43 | variation, continuous, discontinuous, meant, what | 变异 (bio_variation，已抽样核验) | candidate_partial |
| 17.1 outcome 3 | concept | 43 | variation, basis, continuous, discontinuous, genetic | 变异 (bio_variation，已抽样核验) | candidate_partial |
| 17.2 outcome 1 | concept | 43 | adapted, alleles, because, best, capacity, compete, existence, generation | 自然选择 (bio_natural_selection，已抽样核验) | candidate_partial |
| 17.2 outcome 2 | concept | 43 | act, can, directional, disruptive, environmental, factors, forces, how | 自然选择 (bio_natural_selection，已抽样核验) | candidate_partial |
| 17.2 outcome 3 | concept | 43 | effect, affect, allele, bottleneck, drift, founder, frequencies, genetic | 自然选择 (bio_natural_selection，已抽样核验) | candidate_partial |
| 17.2 outcome 4 | concept | 43 | antibiotics, bacterium, become, example, how, natural, outline, resistant | 自然选择 (bio_natural_selection，已抽样核验) | candidate_partial |
| 17.3 outcome 1 | concept | 44 | generation, species, changes, evolution, existing, formation, gene, leading | 自然选择 (bio_natural_selection，已抽样核验) | candidate_partial |
| 17.3 outcome 2 | concept | 44 | between, can, data, discuss, dna, evolutionary, how, relationships | 分类 (bio_classification，已抽样核验) | candidate_partial |
| 17.3 outcome 3 | concept | 44 | speciation, separation, allopatric, behavioural, ecological, genetic, geographical, how | 物种形成 (bio_speciation，已抽样核验) | candidate_partial |
| 18.1 outcome 1 | concept | 45 | species, concept, biological, discuss, ecological, limited, meaning, morphological | 分类 (bio_classification，已抽样核验) | candidate_partial |
| 18.1 outcome 2 | concept | 45 | archaea, bacterium, classification, domains, eukarya, into, organisms, three | 分类 (bio_classification，已抽样核验) | candidate_partial |
| 18.1 outcome 3 | concept | 45 | differences, archaea, bacterium, between, cell, composition, limited, lipids | 原核细胞 (bio_prokaryotes，已抽样核验) | candidate_partial |
| 18.1 outcome 4 | concept | 45 | class, classification, domain, eukarya, family, genus, hierarchy, into | 分类 (bio_classification，已抽样核验) | candidate_partial |
| 18.1 outcome 5 | concept | 45 | animalia, characteristic, features, fungi, kingdoms, outline, plantae, protoctista | 分类 (bio_classification，已抽样核验) | candidate_partial |
| 18.2 outcome 2 | concept | 45 | different, number, species, abundance, assessed, at, biodiversity, can | 生物多样性调查 (bio_biodiversity_sampling，已抽样核验) | candidate_partial |
| 18.2 outcome 3 | concept | 45 | area, biodiversity, determining, importance, random, sampling | 生物多样性调查 (bio_biodiversity_sampling，已抽样核验) | candidate_partial |
| 18.2 outcome 4 | concept | 45 | index, lincoln, transects, abundance, area, assess, belt, distribution | 生物多样性调查 (bio_biodiversity_sampling，已抽样核验) | candidate_partial |
| 18.2 outcome 6 | concept_and_skill | 46 | diversity, index, simpson, area, biodiversity, calculate, different, formula | 生物多样性调查 (bio_biodiversity_sampling，已抽样核验) | candidate_partial |
| 18.3 outcome 1 | concept | 46 | become, can, change, climate, competition, degradation, extinct, habitats | 保护 (bio_conservation，已抽样核验) | candidate_partial |
| 18.3 outcome 2 | concept | 46 | biodiversity, maintain, need, outline, reasons | 保护 (bio_conservation，已抽样核验) | candidate_partial |
| 18.3 outcome 3 | concept | 46 | parks, zoos, areas, banks, botanic, conservation, conserved, endangered | 保护 (bio_conservation，已抽样核验) | candidate_partial |
| 18.3 outcome 5 | concept | 46 | alien, controlling, invasive, reasons, species | 保护 (bio_conservation，已抽样核验) | candidate_partial |
| 18.3 outcome 6 | concept | 46 | conservation, international, cites, convention, endangered, fauna, flora, iucn | 保护 (bio_conservation，已抽样核验) | candidate_partial |
| 19.1 outcome 1 | concept | 47 | define, dna, recombinant, term | 基因技术 (bio_gene_tech，已抽样核验) | candidate_partial |
| 19.1 outcome 2 | concept | 47 | gene, genetic, organism, characteristics, deliberate, engineering, expressed, into | 基因技术 (bio_gene_tech，已抽样核验) | candidate_partial |
| 19.1 outcome 3 | concept | 47 | organism, donor, synthesised, chemically, dna, extracted, genes, into | 基因技术 (bio_gene_tech，已抽样核验) | candidate_partial |
| 19.1 outcome 4 | concept | 47 | dna, endonucleases, gene, into, ligase, organism, plasmids, polymerase | 基因技术 (bio_gene_tech，已抽样核验) | candidate_partial |
| 19.1 outcome 5 | concept | 47 | desired, gene, have, into, organism, promoter, transferred, well | 基因技术 (bio_gene_tech，已抽样核验) | candidate_partial |
| 19.1 outcome 6 | concept | 47 | coding, confirmed, expression, fluorescent, gene, genes, how, marker | 基因技术 (bio_gene_tech，已抽样核验) | candidate_partial |
| 19.1 outcome 7 | concept | 47 | at, deletion, dna, editing, engineering, form, gene, genetic | 基因技术 (bio_gene_tech，已抽样核验) | candidate_partial |
| 19.1 outcome 8 | concept | 47 | polymerase, amplify, chain, clone, dna, involved, pcr, reaction | PCR与电泳 (bio_pcr_electrophoresis，已抽样核验) | candidate_partial |
| 19.2 outcome 1 | concept | 48 | adenosine, advantages, deaminase, disease, examples, factor, human, insulin | 基因技术 (bio_gene_tech，已抽样核验) | candidate_partial |
| 19.2 outcome 2 | concept | 48 | advantages, brca1, brca2, breast, cancer, cystic, disease, examples | 遗传技术应用 (bio_gene_applications，已抽样核验) | candidate_partial |
| 19.2 outcome 3 | concept | 48 | diseases, can, combined, examples, eye, gene, genetic, how | 遗传技术应用 (bio_gene_applications，已抽样核验) | candidate_partial |
| 19.2 outcome 4 | concept | 48 | considerations, discuss, ethical, gene, genetic, medicine, screening, social | 遗传技术应用 (bio_gene_applications，已抽样核验) | candidate_partial |
| 19.3 outcome 1 | concept_and_skill | 48 | resistance, animals, cotton, crop, demand, engineering, examples, farmed | 遗传技术应用 (bio_gene_applications，已抽样核验) | candidate_partial |
| 19.3 outcome 2 | concept | 48 | discuss, ethical, food, genetically, gmos, implications, modified, organisms | 遗传技术应用 (bio_gene_applications，已抽样核验) | candidate_partial |

## 现有 KG 中未被高置信命中的概念

- 显微镜（Microscopy，`bio_microscopy`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 真核细胞器（Eukaryotic Organelles，`bio_organelles`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 原核细胞（Prokaryotic Cells，`bio_prokaryotes`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 水（Water，`bio_water`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 碳水化合物（Carbohydrates，`bio_carbohydrates`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 脂质（Lipids，`bio_lipids`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 蛋白质（Proteins，`bio_proteins`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 生化检测（Biochemical Tests，`bio_tests`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 酶作用（Enzyme Action，`bio_enzyme_action`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 影响酶活性的因素（Factors Affecting Enzyme Activity，`bio_enzyme_factors`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 膜结构（Membrane Structure，`bio_membrane_structure`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 主动运输（Active Transport，`bio_active_transport`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 染色体行为（Chromosome Behaviour，`bio_chromosomes`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- DNA结构（DNA Structure，`bio_dna_structure`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- DNA复制（DNA Replication，`bio_dna_replication`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 翻译（Translation，`bio_translation`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 木质部与水分运输（Xylem and Water Transport，`bio_xylem`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 蒸腾作用（Transpiration，`bio_transpiration`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 韧皮部与转运（Phloem and Translocation，`bio_phloem`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 心脏（The Heart，`bio_heart`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 血管（Blood Vessels，`bio_blood_vessels`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 血红蛋白与氧气运输（Haemoglobin and Oxygen Transport，`bio_haemoglobin`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 免疫应答（Immune Response，`bio_immune_response`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 抗体与疫苗接种（Antibodies and Vaccination，`bio_antibodies`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 糖酵解（Glycolysis，`bio_glycolysis`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 连接反应与Krebs循环（Link Reaction and Krebs Cycle，`bio_krebs`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 光依赖反应（Light-Dependent Reactions，`bio_light_dependent`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 体内平衡原理（Homeostasis Principles，`bio_homeostasis_principles`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 肾脏与渗透压调节（The Kidney and Osmoregulation，`bio_kidney`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 血糖控制（Control of Blood Glucose，`bio_glucose_control`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 神经传导（Nervous Transmission，`bio_nervous`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 突触（Synapses，`bio_synapses`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 遗传杂交（Genetic Crosses，`bio_genetic_crosses`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 基因连锁与交换（Gene Linkage and Crossing Over，`bio_linkage`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 基因表达控制（Control of Gene Expression，`bio_gene_control`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 变异（Variation，`bio_variation`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 自然选择（Natural Selection，`bio_natural_selection`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 物种形成（Speciation，`bio_speciation`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 分类（Classification，`bio_classification`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 生物多样性调查（Biodiversity and Sampling，`bio_biodiversity_sampling`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 基因技术（Gene Technology，`bio_gene_tech`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 遗传技术应用（Applications of Genetic Technology，`bio_gene_applications`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。

## 审核规则

1. 打开来源页和对应 syllabus 页核对原文。
2. 将每项标记为覆盖、部分覆盖、缺失或排除，并写明理由。
3. 只有人工确认后，才可修改正式 KG 的 evidence_refs/review_status。
4. 新增、删除、合并或先修边调整必须单独形成变更记录。
