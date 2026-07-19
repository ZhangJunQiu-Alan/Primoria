# 新加坡 H2 物理 KG 缺口实施与代理人工复核（中文）

- 复核日期：2026-07-19
- 官方要求：215 项（205 项学科内容、10 项跨主题实践）
- 完整概念覆盖：201 项
- 实践分流：14 项
- 新图：8 个 Concept，3 个 Topic，2 条待审先修边
- 入口概念：6 个；没有用课程章节顺序伪造先修关系。
- 审核状态：代理复核只给出建议，数据全部保持 `needs_review`，没有冒充 human approval。

## 代理人工复核结论

- 205 项内容计数按 20 个官方 Topic 的 outcome 编号重算，章节合计无缺项；此前粗算 206 已纠正为 205。
- 4 项具体实验或表示任务与 10 项跨主题科学实践分流到教学评测层，不写入概念掌握度。
- 12 项覆盖缺口合并为 8 个概念；波函数两项、势阱两项、辐射两项、核方程两项分别保持可共同诊断的最小边界。
- 场线节点不把电场线既有窄节点误判成完整覆盖；速度选择器也不以电场力和磁场力两个分散节点代替交叉场平衡。
- 量子波函数没有复用经典波叠加；核守恒没有复用范围过宽的核结构或衰变节点。
- 每个新概念至少含 SEAB 页码级课程证据和 OpenStax 章节级学科证据。
- 只保留 2 条能说明知识依赖的软先修边；其余课程相邻关系未转成先修边。
- 反中微子细节、正电子发射、光谱仪结构与使用、恢复系数、摩擦系数和黏度继续遵守官方排除边界。

## 概念逐项复核

### 场线与等势面的几何关系

- 节点：`sg_h2_physics_field_lines_equipotential_geometry` / `pc_2b7eda0a0df626958a966c48865d9809`
- 解析缺口：`gap_sg_h2_physics_9478_2026_o_4_field_lines_equipotentials`
- 概念边界：Representing uniform and radial gravitational or electric fields with directed field lines and relating equipotential surfaces to field direction, zero tangential work and perpendicular intersection.
- 证据：PDF p.14, topic 4 Energy and Fields, outcome (h)（`src_sg_seab_h2_physics_9478_2026`）；OpenStax University Physics Volume 2 §§5.6 and 7.5, Electric Field Lines; Equipotential Surfaces and Conductors（`src_openstax_university_physics_v2_2016`）；OpenStax College Physics 2e §19.4, Equipotential Lines（`src_openstax_college_physics_2e_2022`）
- 复核建议：概念可保留；既有 KG 没有同时满足范围、课程深度与诊断粒度的等价 canonical；仍需项目所有者最终批准。

### 交叉电磁场速度选择器

- 节点：`sg_h2_physics_crossed_field_velocity_selector` / `pc_ba46501edd6d23c79fe9c1e26a62f939`
- 解析缺口：`gap_sg_h2_physics_9478_2026_o_17_crossed_field_velocity_selector`
- 概念边界：Deriving the selected speed of a charged particle by balancing electric and magnetic forces in perpendicular fields, with directions checked from charge sign and vector force laws.
- 证据：PDF p.26, topic 17 Electromagnetic Forces, outcome (m)（`src_sg_seab_h2_physics_9478_2026`）；OpenStax College Physics 2e §22.5, Force on a Moving Charge in a Magnetic Field: Examples and Applications（`src_openstax_college_physics_2e_2022`）
- 复核建议：概念可保留；既有 KG 没有同时满足范围、课程深度与诊断粒度的等价 canonical；仍需项目所有者最终批准。

### 波函数概率解释与量子叠加

- 节点：`sg_h2_physics_wavefunction_probability_superposition` / `pc_a5f5680781febed7b189645c53ceb0f6`
- 解析缺口：`gap_sg_h2_physics_9478_2026_o_19_wavefunction_probability_density`、`gap_sg_h2_physics_9478_2026_o_19_wavefunction_superposition`
- 概念边界：Interpreting |ψ|² as probability density, normalising a one-dimensional wavefunction and applying linear superposition to admissible quantum states without treating ψ itself as a classical material wave.
- 证据：PDF p.28, topic 19 Quantum Physics, outcome (f)（`src_sg_seab_h2_physics_9478_2026`）；PDF p.28, topic 19 Quantum Physics, outcome (g)（`src_sg_seab_h2_physics_9478_2026`）；OpenStax University Physics Volume 3 §7.1, Wave Functions（`src_openstax_university_physics_v3_2016`）
- 复核建议：概念可保留；既有 KG 没有同时满足范围、课程深度与诊断粒度的等价 canonical；仍需项目所有者最终批准。

### 海森堡位置—动量不确定性

- 节点：`sg_h2_physics_heisenberg_position_momentum_uncertainty` / `pc_71a8c4a7750a98f29a83a217310abff5`
- 解析缺口：`gap_sg_h2_physics_9478_2026_o_19_heisenberg_uncertainty`
- 概念边界：Using ΔxΔp ≥ ℏ/2 to reason about limits on simultaneous position and momentum precision while distinguishing intrinsic quantum uncertainty from measurement error or poor apparatus.
- 证据：PDF p.28, topic 19 Quantum Physics, outcome (h)（`src_sg_seab_h2_physics_9478_2026`）；OpenStax University Physics Volume 3 §7.2, The Heisenberg Uncertainty Principle（`src_openstax_university_physics_v3_2016`）
- 复核建议：概念可保留；既有 KG 没有同时满足范围、课程深度与诊断粒度的等价 canonical；仍需项目所有者最终批准。

### 无限深方势阱波函数与能级

- 节点：`sg_h2_physics_infinite_square_well_states` / `pc_c597719cddd0d41276acc705aa3972e6`
- 解析缺口：`gap_sg_h2_physics_9478_2026_o_19_infinite_well_wavefunctions`、`gap_sg_h2_physics_9478_2026_o_19_infinite_well_energy_levels`
- 概念边界：Applying boundary conditions to one-dimensional stationary wavefunctions and deriving the discrete particle-in-a-box energies, including their dependence on quantum number, mass and well width.
- 证据：PDF p.28, topic 19 Quantum Physics, outcome (i)（`src_sg_seab_h2_physics_9478_2026`）；PDF p.28, topic 19 Quantum Physics, outcome (j)（`src_sg_seab_h2_physics_9478_2026`）；OpenStax University Physics Volume 3 §7.4, The Quantum Particle in a Box（`src_openstax_university_physics_v3_2016`）
- 复核建议：概念可保留；既有 KG 没有同时满足范围、课程深度与诊断粒度的等价 canonical；仍需项目所有者最终批准。

### 本底辐射与 α、β、γ 辐射性质

- 节点：`sg_h2_physics_background_radiation_properties` / `pc_4c5131244b59bb92fb05a5572e3c7e8b`
- 解析缺口：`gap_sg_h2_physics_9478_2026_o_20_background_radiation`、`gap_sg_h2_physics_9478_2026_o_20_alpha_beta_gamma_properties`
- 概念边界：Distinguishing common background sources and comparing alpha, beta and gamma radiation by composition, charge, ionising power, penetration and deflection, including subtraction of background count from measurements.
- 证据：PDF p.29, topic 20 Nuclear Physics, outcome (f)（`src_sg_seab_h2_physics_9478_2026`）；PDF p.29, topic 20 Nuclear Physics, outcome (g)（`src_sg_seab_h2_physics_9478_2026`）；OpenStax University Physics Volume 3 §§10.3-10.4, Radioactive Decay; Nuclear Reactions（`src_openstax_university_physics_v3_2016`）
- 复核建议：概念可保留；既有 KG 没有同时满足范围、课程深度与诊断粒度的等价 canonical；仍需项目所有者最终批准。

### 核方程与守恒定律

- 节点：`sg_h2_physics_nuclear_equations_conservation` / `pc_d9555e3a7d3e59cf71dbf540aed1d020`
- 解析缺口：`gap_sg_h2_physics_9478_2026_o_20_nuclear_equations`、`gap_sg_h2_physics_9478_2026_o_20_nuclear_conservation_laws`
- 概念边界：Completing and interpreting nuclear equations by conserving charge and nucleon number and checking energy-momentum conservation, without extending the syllabus to a general particle zoo.
- 证据：PDF p.29, topic 20 Nuclear Physics, outcome (m)（`src_sg_seab_h2_physics_9478_2026`）；PDF p.29, topic 20 Nuclear Physics, outcome (n)（`src_sg_seab_h2_physics_9478_2026`）；OpenStax University Physics Volume 3 §10.4, Nuclear Reactions; §11.2, Particle Conservation Laws（`src_openstax_university_physics_v3_2016`）
- 复核建议：概念可保留；既有 KG 没有同时满足范围、课程深度与诊断粒度的等价 canonical；仍需项目所有者最终批准。

### 由 β 衰变守恒缺口推断中微子

- 节点：`sg_h2_physics_beta_decay_neutrino_inference` / `pc_eebf0fe57f217f74bfdd33901f77c63c`
- 解析缺口：`gap_sg_h2_physics_9478_2026_o_20_neutrino_prediction`
- 概念边界：Explaining why beta-decay energy and momentum observations motivated a neutral, weakly interacting particle and using the neutrino only to close the prescribed conservation argument; antineutrino detail remains outside scope.
- 证据：PDF p.29, topic 20 Nuclear Physics, outcome (o)（`src_sg_seab_h2_physics_9478_2026`）；OpenStax University Physics Volume 3 §10.4, Nuclear Reactions; §11.2, Particle Conservation Laws（`src_openstax_university_physics_v3_2016`）
- 复核建议：概念可保留；既有 KG 没有同时满足范围、课程深度与诊断粒度的等价 canonical；仍需项目所有者最终批准。
