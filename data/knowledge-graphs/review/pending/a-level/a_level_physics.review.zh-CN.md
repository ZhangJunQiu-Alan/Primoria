# A-Level 物理 KG 中文审核包

- 图：`a_level_physics`
- 官方 syllabus：Cambridge 9702
- 来源：`src_cambridge_9702_2025_2027`
- 状态：`needs_review`，本文件不能作为人工批准记录
- 官方小节：76；逐项要求：299
- 自动信号：候选覆盖 86；部分覆盖 175；歧义 0；未解析 0；已核实 Concept 缺口 30；需技能映射 8

> 版权说明：这里只保存小节标题、页码、关键词、文本指纹和 Primoria 候选映射，不复制 Cambridge syllabus 正文。分数只用于排序，不能作为审核结论。

## 小节覆盖索引

| 官方小节 | Syllabus 页 | 要求数 | Primoria 候选 Topic | 覆盖 / 部分 / 歧义 / 未解析 / Concept 缺口 / 技能 |
|---|---:|---:|---|---:|
| 1.1 Physical quantities | 16 | 2 | 物理量与单位 (phy_measurement)；库仑定律与电场强度 (phy_electric_fields) | 0 / 1 / 0 / 0 / 0 / 1 |
| 1.2 SI units | 16 | 4 | 物理量与单位 (phy_measurement)；电流 (phy_electricity) | 1 / 3 / 0 / 0 / 0 / 0 |
| 1.3 Errors and uncertainties | 16 | 2 | 误差与不确定度与不确定度合成 (phy_measurement_motion)；力、密度与压强 (phy_forces) | 0 / 2 / 0 / 0 / 0 / 0 |
| 1.4 Scalars and vectors | 16 | 3 | 物理量与单位 (phy_measurement)；动力学 (phy_dynamics) | 1 / 2 / 0 / 0 / 0 / 0 |
| 2.1 Equations of motion | 17 | 9 | 位移速度加速度与运动方程 (phy_measurement_motion_phy_motion_quantities)；运动学 (phy_kinematics) | 3 / 5 / 0 / 0 / 0 / 1 |
| 3.1 Momentum and Newton’s laws of motion | 17 | 6 | 动力学 (phy_dynamics)；牛顿引力定律与引力场强度 (phy_gravitation) | 2 / 4 / 0 / 0 / 0 / 0 |
| 3.2 Non-uniform motion | 18 | 3 | 圆周运动 (phy_circular)；引力势与轨道运动 (phy_gravitation_phy_grav_potential) | 0 / 2 / 0 / 0 / 1 / 0 |
| 3.3 Linear momentum and its conservation | 18 | 4 | 动量守恒与冲量与碰撞 (phy_momentum_forces)；动力学 (phy_dynamics) | 1 / 3 / 0 / 0 / 0 / 0 |
| 4.1 Turning effects of forces | 18 | 4 | 力、密度与压强 (phy_forces)；牛顿引力定律与引力场强度 (phy_gravitation) | 1 / 2 / 0 / 0 / 1 / 0 |
| 4.2 Equilibrium of forces | 18 | 3 | 力、密度与压强 (phy_forces)；温度与热平衡与比热与潜热 (phy_thermal) | 2 / 1 / 0 / 0 / 0 / 0 |
| 4.3 Density and pressure | 19 | 6 | 力、密度与压强 (phy_forces)；磁通密度与载流导线受力 (phy_magnetic_fields) | 0 / 6 / 0 / 0 / 0 / 0 |
| 5.1 Energy conservation | 19 | 7 | 能量守恒与功率与效率 (phy_work_energy_phy_energy_conservation)；做功与动能与势能 (phy_work_energy) | 4 / 3 / 0 / 0 / 0 / 0 |
| 5.2 Gravitational potential energy and kinetic energy | 19 | 4 | 做功与动能与势能 (phy_work_energy)；引力势与轨道运动 (phy_gravitation_phy_grav_potential) | 3 / 1 / 0 / 0 / 0 / 0 |
| 6.1 Stress and strain | 20 | 6 | 胡克定律与应力、应变与杨氏模量 (phy_deformation)；弹性与塑性行为与弹性势能 (phy_deformation_phy_elastic_plastic) | 2 / 3 / 0 / 0 / 0 / 1 |
| 6.2 Elastic and plastic behaviour | 20 | 4 | 弹性与塑性行为与弹性势能 (phy_deformation_phy_elastic_plastic)；胡克定律与应力、应变与杨氏模量 (phy_deformation) | 3 / 1 / 0 / 0 / 0 / 0 |
| 7.1 Progressive waves | 20 | 7 | 波动 (phy_waves)；波的叠加 (phy_superposition) | 1 / 5 / 0 / 0 / 1 / 0 |
| 7.2 Transverse and longitudinal waves | 21 | 2 | 波动 (phy_waves)；波的叠加 (phy_superposition) | 1 / 1 / 0 / 0 / 0 / 0 |
| 7.3 Doppler effect for sound waves | 21 | 2 | 电磁波谱与多普勒效应 (phy_waves_superposition)；波动 (phy_waves) | 1 / 1 / 0 / 0 / 0 / 0 |
| 7.4 Electromagnetic spectrum | 21 | 3 | 电磁波谱与多普勒效应 (phy_waves_superposition)；电磁感应 (phy_induction) | 1 / 2 / 0 / 0 / 0 / 0 |
| 7.5 Polarisation | 21 | 2 | 波动 (phy_waves)；电磁波谱与多普勒效应 (phy_waves_superposition) | 0 / 1 / 0 / 0 / 1 / 0 |
| 8.1 Stationary waves | 22 | 4 | 波的叠加 (phy_superposition)；波动 (phy_waves) | 1 / 2 / 0 / 0 / 0 / 1 |
| 8.2 Diffraction | 22 | 2 | 波的叠加 (phy_superposition)；物理量与单位 (phy_measurement) | 1 / 0 / 0 / 0 / 0 / 1 |
| 8.3 Interference | 22 | 4 | 叠加原理与双源干涉 (phy_waves_superposition_phy_superposition_principle)；圆周运动 (phy_circular) | 0 / 3 / 0 / 0 / 0 / 1 |
| 8.4 The diffraction grating | 22 | 2 | 波的叠加 (phy_superposition)；物理量与单位 (phy_measurement) | 1 / 1 / 0 / 0 / 0 / 0 |
| 9.1 Electric current | 23 | 4 | 电流 (phy_electricity)；电势与引力场与电场类比 (phy_electric_fields_phy_e_potential) | 3 / 1 / 0 / 0 / 0 / 0 |
| 9.2 Potential difference and power | 23 | 3 | 电流 (phy_electricity)；电势与引力场与电场类比 (phy_electric_fields_phy_e_potential) | 2 / 1 / 0 / 0 / 0 / 0 |
| 9.3 Resistance and resistivity | 23 | 8 | 电学特性与基尔霍夫定律 (phy_circuits_kirchhoff)；直流电路 (phy_dc_circuits) | 3 / 3 / 0 / 0 / 2 / 0 |
| 10.1 Practical circuits | 24 | 5 | 直流电路 (phy_dc_circuits)；电学特性与基尔霍夫定律 (phy_circuits_kirchhoff) | 2 / 1 / 0 / 0 / 1 / 1 |
| 10.2 Kirchhoff’s laws | 24 | 7 | 电学特性与基尔霍夫定律 (phy_circuits_kirchhoff)；电磁感应 (phy_induction) | 6 / 1 / 0 / 0 / 0 / 0 |
| 10.3 Potential dividers | 24 | 4 | 直流电路 (phy_dc_circuits)；引力势与轨道运动 (phy_gravitation_phy_grav_potential) | 0 / 3 / 0 / 0 / 1 / 0 |
| 11.1 Atoms, nuclei and radiation | 25 | 12 | 核物理 (phy_nuclear)；气体动理论、理想气体定律与内能与第一定律 (phy_thermal_phy_kinetic_theory) | 0 / 8 / 0 / 0 / 4 / 0 |
| 11.2 Fundamental particles | 25 | 6 | 核物理 (phy_nuclear)；波粒二象性与能级与线光谱 (phy_quantum_phy_wave_particle) | 0 / 6 / 0 / 0 / 0 / 0 |
| 12.1 Kinematics of uniform circular motion | 26 | 3 | 圆周运动 (phy_circular)；运动学 (phy_kinematics) | 1 / 2 / 0 / 0 / 0 / 0 |
| 12.2 Centripetal acceleration | 26 | 4 | 圆周运动 (phy_circular)；位移速度加速度与运动方程 (phy_measurement_motion_phy_motion_quantities) | 0 / 4 / 0 / 0 / 0 / 0 |
| 13.1 Gravitational field | 26 | 2 | 牛顿引力定律与引力场强度 (phy_gravitation)；电势与引力场与电场类比 (phy_electric_fields_phy_e_potential) | 1 / 1 / 0 / 0 / 0 / 0 |
| 13.2 Gravitational force between point masses | 26 | 4 | 牛顿引力定律与引力场强度 (phy_gravitation)；引力势与轨道运动 (phy_gravitation_phy_grav_potential) | 2 / 2 / 0 / 0 / 0 / 0 |
| 13.3 Gravitational field of a point mass | 27 | 3 | 牛顿引力定律与引力场强度 (phy_gravitation)；电势与引力场与电场类比 (phy_electric_fields_phy_e_potential) | 2 / 1 / 0 / 0 / 0 / 0 |
| 13.4 Gravitational potential | 27 | 3 | 引力势与轨道运动 (phy_gravitation_phy_grav_potential)；电势与引力场与电场类比 (phy_electric_fields_phy_e_potential) | 1 / 2 / 0 / 0 / 0 / 0 |
| 14.1 Thermal equilibrium | 27 | 2 | 温度与热平衡与比热与潜热 (phy_thermal)；力、密度与压强 (phy_forces) | 0 / 2 / 0 / 0 / 0 / 0 |
| 14.2 Temperature scales | 27 | 4 | 温度与热平衡与比热与潜热 (phy_thermal)；气体动理论、理想气体定律与内能与第一定律 (phy_thermal_phy_kinetic_theory) | 0 / 2 / 0 / 0 / 2 / 0 |
| 14.3 Specific heat capacity and specific latent heat | 28 | 2 | 温度与热平衡与比热与潜热 (phy_thermal)；气体动理论、理想气体定律与内能与第一定律 (phy_thermal_phy_kinetic_theory) | 0 / 2 / 0 / 0 / 0 / 0 |
| 15.1 The mole | 28 | 2 | 物理量与单位 (phy_measurement)；库仑定律与电场强度 (phy_electric_fields) | 0 / 1 / 0 / 0 / 1 / 0 |
| 15.2 Equation of state | 28 | 3 | 位移速度加速度与运动方程 (phy_measurement_motion_phy_motion_quantities)；物理量与单位 (phy_measurement) | 1 / 1 / 0 / 0 / 1 / 0 |
| 15.3 Kinetic theory of gases | 28 | 4 | 气体动理论、理想气体定律与内能与第一定律 (phy_thermal_phy_kinetic_theory)；做功与动能与势能 (phy_work_energy) | 0 / 4 / 0 / 0 / 0 / 0 |
| 16.1 Internal energy | 29 | 2 | 气体动理论、理想气体定律与内能与第一定律 (phy_thermal_phy_kinetic_theory)；简谐运动与SHM能量 (phy_oscillations) | 0 / 2 / 0 / 0 / 0 / 0 |
| 16.2 The first law of thermodynamics | 29 | 2 | 气体动理论、理想气体定律与内能与第一定律 (phy_thermal_phy_kinetic_theory)；电流 (phy_electricity) | 0 / 2 / 0 / 0 / 0 / 0 |
| 17.1 Simple harmonic oscillations | 29 | 5 | 简谐运动与SHM能量 (phy_oscillations)；波动 (phy_waves) | 1 / 4 / 0 / 0 / 0 / 0 |
| 17.2 Energy in simple harmonic motion | 30 | 2 | 简谐运动与SHM能量 (phy_oscillations)；做功与动能与势能 (phy_work_energy) | 1 / 1 / 0 / 0 / 0 / 0 |
| 17.3 Damped and forced oscillations, resonance | 30 | 3 | 阻尼与共振 (phy_oscillations_phy_damping)；力的类型与力矩与力偶 (phy_momentum_forces_phy_force_types) | 1 / 2 / 0 / 0 / 0 / 0 |
| 18.1 Electric fields and field lines | 30 | 3 | 库仑定律与电场强度 (phy_electric_fields)；电势与引力场与电场类比 (phy_electric_fields_phy_e_potential) | 2 / 1 / 0 / 0 / 0 / 0 |
| 18.2 Uniform electric fields | 30 | 2 | 电势与引力场与电场类比 (phy_electric_fields_phy_e_potential)；库仑定律与电场强度 (phy_electric_fields) | 0 / 2 / 0 / 0 / 0 / 0 |
| 18.3 Electric force between point charges | 31 | 2 | 电流 (phy_electricity)；运动电荷受力与电流磁场 (phy_magnetic_fields_phy_force_charge) | 1 / 1 / 0 / 0 / 0 / 0 |
| 18.4 Electric field of a point charge | 31 | 1 | 库仑定律与电场强度 (phy_electric_fields)；电流 (phy_electricity) | 1 / 0 / 0 / 0 / 0 / 0 |
| 18.5 Electric potential | 31 | 4 | 电势与引力场与电场类比 (phy_electric_fields_phy_e_potential)；引力势与轨道运动 (phy_gravitation_phy_grav_potential) | 1 / 3 / 0 / 0 / 0 / 0 |
| 19.1 Capacitors and capacitance | 31 | 4 | 电容与串并联电容 (phy_capacitance)；波动 (phy_waves) | 2 / 2 / 0 / 0 / 0 / 0 |
| 19.2 Energy stored in a capacitor | 32 | 2 | 电容储能与充放电 (phy_capacitance_phy_capacitor_energy)；弹性与塑性行为与弹性势能 (phy_deformation_phy_elastic_plastic) | 1 / 1 / 0 / 0 / 0 / 0 |
| 19.3 Discharging a capacitor | 32 | 3 | 电容储能与充放电 (phy_capacitance_phy_capacitor_energy)；电容与串并联电容 (phy_capacitance) | 1 / 2 / 0 / 0 / 0 / 0 |
| 20.1 Concept of a magnetic field | 32 | 2 | 运动电荷受力与电流磁场 (phy_magnetic_fields_phy_force_charge)；磁通密度与载流导线受力 (phy_magnetic_fields) | 0 / 2 / 0 / 0 / 0 / 0 |
| 20.2 Force on a current-carrying conductor | 32 | 3 | 磁通密度与载流导线受力 (phy_magnetic_fields)；运动电荷受力与电流磁场 (phy_magnetic_fields_phy_force_charge) | 1 / 2 / 0 / 0 / 0 / 0 |
| 20.3 Force on a moving charge | 33 | 6 | 运动电荷受力与电流磁场 (phy_magnetic_fields_phy_force_charge)；磁通密度与载流导线受力 (phy_magnetic_fields) | 1 / 4 / 0 / 0 / 1 / 0 |
| 20.4 Magnetic fields due to currents | 33 | 3 | 运动电荷受力与电流磁场 (phy_magnetic_fields_phy_force_charge)；电磁感应 (phy_induction) | 1 / 2 / 0 / 0 / 0 / 0 |
| 20.5 Electromagnetic induction | 33 | 5 | 电磁感应 (phy_induction)；电磁波谱与多普勒效应 (phy_waves_superposition) | 2 / 2 / 0 / 0 / 0 / 1 |
| 21.1 Characteristics of alternating currents | 34 | 4 | 交流电 (phy_ac)；电学特性与基尔霍夫定律 (phy_circuits_kirchhoff) | 0 / 4 / 0 / 0 / 0 / 0 |
| 21.2 Rectification and smoothing | 34 | 4 | 交流电 (phy_ac)；波动 (phy_waves) | 0 / 4 / 0 / 0 / 0 / 0 |
| 22.1 Energy and momentum of a photon | 34 | 5 | 光子能量与光电效应 (phy_quantum)；动量守恒与冲量与碰撞 (phy_momentum_forces) | 3 / 2 / 0 / 0 / 0 / 0 |
| 22.2 Photoelectric effect | 35 | 5 | 光子能量与光电效应 (phy_quantum)；电磁波谱与多普勒效应 (phy_waves_superposition) | 1 / 4 / 0 / 0 / 0 / 0 |
| 22.3 Wave-particle duality | 35 | 4 | 波粒二象性与能级与线光谱 (phy_quantum_phy_wave_particle)；波动 (phy_waves) | 1 / 3 / 0 / 0 / 0 / 0 |
| 22.4 Energy levels in atoms and line spectra | 35 | 3 | 波粒二象性与能级与线光谱 (phy_quantum_phy_wave_particle)；光子能量与光电效应 (phy_quantum) | 3 / 0 / 0 / 0 / 0 / 0 |
| 23.1 Mass defect and nuclear binding energy | 36 | 7 | 核物理 (phy_nuclear)；动力学 (phy_dynamics) | 3 / 4 / 0 / 0 / 0 / 0 |
| 23.2 Radioactive decay | 36 | 6 | 核反应与放射性 (phy_radioactivity)；电流 (phy_electricity) | 2 / 4 / 0 / 0 / 0 / 0 |
| 24.1 Production and use of ultrasound | 37 | 6 | 温度与热平衡与比热与潜热 (phy_thermal)；电流 (phy_electricity) | 0 / 0 / 0 / 0 / 6 / 0 |
| 24.2 Production and use of X-rays | 37 | 4 | 光子能量与光电效应 (phy_quantum)；波粒二象性与能级与线光谱 (phy_quantum_phy_wave_particle) | 0 / 0 / 0 / 0 / 4 / 0 |
| 24.3 PET scanning | 38 | 6 | 核反应与放射性 (phy_radioactivity)；做功与动能与势能 (phy_work_energy) | 0 / 3 / 0 / 0 / 3 / 0 |
| 25.1 Standard candles | 38 | 4 | 亮度与辐射通量与标准烛光 (phy_astro)；能量守恒与功率与效率 (phy_work_energy_phy_energy_conservation) | 1 / 3 / 0 / 0 / 0 / 0 |
| 25.2 Stellar radii | 38 | 3 | 恒星半径与哈勃定律与大爆炸 (phy_astro_phy_stellar_radii)；气体动理论、理想气体定律与内能与第一定律 (phy_thermal_phy_kinetic_theory) | 0 / 3 / 0 / 0 / 0 / 0 |
| 25.3 Hubble’s law and the Big Bang theory | 39 | 4 | 恒星半径与哈勃定律与大爆炸 (phy_astro_phy_stellar_radii)；气体动理论、理想气体定律与内能与第一定律 (phy_thermal_phy_kinetic_theory) | 1 / 3 / 0 / 0 / 0 / 0 |

## 待人工判断项

| 定位 | 类型 | Syllabus 页 | 关键词 | 候选或相关概念 | 信号 |
|---|---|---:|---|---|---|
| 1.1 outcome 1 | concept | 16 | consist, magnitude, numerical, physical, quantity, unit | SI基本单位 (phy_si_units，已抽样核验) | candidate_partial |
| 1.1 outcome 2 | general_skill | 16 | estimate, included, make, physical, quantity, reasonable, syllabus | 无 | skill_mapping_required |
| 1.2 outcome 1 | concept | 16 | base, current, following, kg, length, mass, quantity, si | SI基本单位 (phy_si_units，已抽样核验) | candidate_partial |
| 1.2 outcome 2 | concept | 16 | unit, derived, appropriate, base, express, listed, products, quantity | SI基本单位 (phy_si_units，已抽样核验) | candidate_partial |
| 1.2 outcome 4 | concept | 16 | base, both, centi, deci, decimal, derived, following, giga | SI基本单位 (phy_si_units，已抽样核验) | candidate_partial |
| 1.3 outcome 1 | concept | 16 | errors, effects, measurement, random, systematic, zero | 误差与不确定度 (phy_uncertainty，已抽样核验) | candidate_partial |
| 1.3 outcome 2 | concept | 16 | accuracy, between, distinction, precision | 误差与不确定度 (phy_uncertainty，已抽样核验) | candidate_partial |
| 1.4 outcome 1 | concept | 16 | quantity, scalar, vector, between, difference, examples, included, syllabus | 标量与矢量 (phy_scalars_vectors，已抽样核验) | candidate_partial |
| 1.4 outcome 2 | concept | 16 | add, coplanar, subtract, vectors | 标量与矢量 (phy_scalars_vectors，已抽样核验) | candidate_partial |
| 2.1 outcome 1 | concept | 17 | acceleration, define, displacement, distance, speed, velocity | 位移速度加速度 (phy_motion_quantities，已抽样核验) | candidate_partial |
| 2.1 outcome 2 | concept | 17 | acceleration, displacement, distance, graphical, methods, represent, speed, velocity | 位移速度加速度 (phy_motion_quantities，已抽样核验) | candidate_partial |
| 2.1 outcome 6 | concept_and_skill | 17 | accelerated, acceleration, definitions, derive, equation, line, motion, represent | 运动方程 (phy_suvat，已抽样核验) | candidate_partial |
| 2.1 outcome 7 | concept_and_skill | 17 | motion, accelerated, air, bodies, equation, falling, field, gravitational | 运动方程 (phy_suvat，已抽样核验) | candidate_partial |
| 2.1 outcome 8 | practical_skill | 17 | acceleration, experiment, fall, falling, free, object | 自由落体 (phy_free_fall，已抽样核验) | skill_mapping_required |
| 2.1 outcome 9 | concept | 17 | direction, uniform, acceleration, assumed, cambridge, due, equivalent, forces | 运动方程 (phy_suvat，已抽样核验) | candidate_partial |
| 3.1 outcome 1 | concept | 17 | change, mass, motion, object, property, resists | 牛顿运动定律 (phy_newton_laws，已抽样核验) | candidate_partial |
| 3.1 outcome 2 | concept_and_skill | 17 | acceleration, always, direction, force, ma, problems, resultant, same | 牛顿运动定律 (phy_newton_laws，已抽样核验) | candidate_partial |
| 3.1 outcome 4 | concept | 17 | change, define, force, momentum, rate | 牛顿运动定律 (phy_newton_laws，已抽样核验) | candidate_partial |
| 3.1 outcome 5 | concept | 17 | each, law, motion, newton | 牛顿运动定律 (phy_newton_laws，已抽样核验) | candidate_partial |
| 3.2 outcome 1 | concept | 18 | drag, forces, air, coefficients, force, friction, frictional, increases | 力的类型 (phy_force_types，已抽样核验) | candidate_partial |
| 3.2 outcome 2 | concept | 18 | air, field, gravitational, motion, objects, qualitatively, resistance, uniform | 力的类型 (phy_force_types，已抽样核验) | candidate_partial |
| 3.2 outcome 3 | concept | 18 | against, constant, force, moving, objects, reach, resistive, terminal | 无 | candidate_gap |
| 3.3 outcome 2 | concept_and_skill | 18 | between, both, coefficient, concept, conservation, dimensions, elastic, inelastic | 动量守恒 (phy_momentum_conservation，已抽样核验) | candidate_partial |
| 3.3 outcome 3 | concept | 18 | relative, speed, approach, collision, conserved, elastic, energy, equal | 能量守恒 (phy_energy_conservation，已抽样核验) | candidate_partial |
| 3.3 outcome 4 | concept | 18 | always, between, change, conserved, energy, interactions, kinetic, momentum | 动量守恒 (phy_momentum_conservation，已抽样核验) | candidate_partial |
| 4.1 outcome 1 | concept | 18 | acting, at, centre, gravity, known, object, point, single | 无 | candidate_gap |
| 4.1 outcome 3 | concept | 18 | acts, couple, forces, only, pair, produce, rotation | 力矩与力偶 (phy_moments，已抽样核验) | candidate_partial |
| 4.1 outcome 4 | concept | 18 | couple, define, torque | 力矩与力偶 (phy_moments，已抽样核验) | candidate_partial |
| 4.2 outcome 3 | concept | 18 | coplanar, equilibrium, forces, represent, triangle, vector | 力的平衡 (phy_equilibrium，已抽样核验) | candidate_partial |
| 4.3 outcome 1 | concept | 19 | define, density | 密度与压强 (phy_density_pressure，已抽样核验) | candidate_partial |
| 4.3 outcome 2 | concept | 19 | define, pressure | 密度与压强 (phy_density_pressure，已抽样核验) | candidate_partial |
| 4.3 outcome 3 | concept_and_skill | 19 | pressure, definitions, density, derive, equation, hydrostatic, ρg | 密度与压强 (phy_density_pressure，已抽样核验) | candidate_partial |
| 4.3 outcome 4 | concept | 19 | equation, ρg | 密度与压强 (phy_density_pressure，已抽样核验) | candidate_partial |
| 4.3 outcome 5 | concept | 19 | acting, difference, due, fluid, hydrostatic, object, on, pressure | 密度与压强 (phy_density_pressure，已抽样核验) | candidate_partial |
| 4.3 outcome 6 | concept_and_skill | 19 | energy, acting, archimedes, assumed, calculate, cambridge, equation, equivalent | 浮力与阿基米德 (phy_upthrust，已抽样核验) | candidate_partial |
| 5.1 outcome 4 | concept_and_skill | 19 | concept, efficiency, problems, solve | 功率与效率 (phy_power_efficiency，已抽样核验) | candidate_partial |
| 5.1 outcome 6 | concept_and_skill | 19 | problems, solve | 做功 (phy_work，已抽样核验) | candidate_partial |
| 5.1 outcome 7 | concept_and_skill | 19 | derive, force, fv, power, problems, solve, velocity | 功率与效率 (phy_power_efficiency，已抽样核验) | candidate_partial |
| 5.2 outcome 3 | concept_and_skill | 19 | derive, ek, energy, equation, formula, kinetic, motion, mv2 | 动能与势能 (phy_ke_pe，已抽样核验) | candidate_partial |
| 6.1 outcome 1 | concept | 20 | forces, assumed, caused, compressive, deformation, deformations, dimension, one | 应力、应变与杨氏模量 (phy_stress_strain，已抽样核验) | candidate_partial |
| 6.1 outcome 2 | concept | 20 | compression, extension, limit, load, proportionality, terms | 胡克定律 (phy_hookes_law，已抽样核验) | candidate_partial |
| 6.1 outcome 4 | concept | 20 | constant, formula, spring | 胡克定律 (phy_hookes_law，已抽样核验) | candidate_partial |
| 6.1 outcome 6 | practical_skill | 20 | experiment, form, metal, modulus, wire, young | 应力、应变与杨氏模量 (phy_stress_strain，已抽样核验) | skill_mapping_required |
| 6.2 outcome 4 | concept | 20 | assumed, cambridge, colour, deformed, ep, equivalent, fx, igcse | 弹性势能 (phy_strain_energy，已抽样核验) | candidate_partial |
| 7.1 outcome 1 | concept | 20 | illustrated, meant, motion, ripple, ropes, springs, tanks, vibration | 行波 (phy_progressive_waves，已抽样核验) | candidate_partial |
| 7.1 outcome 2 | concept | 20 | amplitude, difference, displacement, frequency, period, phase, speed, terms | 行波 (phy_progressive_waves，已抽样核验) | candidate_partial |
| 7.1 outcome 3 | concept | 20 | amplitude, base, cathode, cro, frequency, gain, oscilloscope, ray | 无 | candidate_gap |
| 7.1 outcome 4 | concept_and_skill | 20 | definitions, derive, equation, frequency, fλ, speed, wave, wavelength | 行波 (phy_progressive_waves，已抽样核验) | candidate_partial |
| 7.1 outcome 5 | concept | 20 | fλ | 行波 (phy_progressive_waves，已抽样核验) | candidate_partial |
| 7.1 outcome 6 | concept | 20 | energy, progressive, transferred, wave | 行波 (phy_progressive_waves，已抽样核验) | candidate_partial |
| 7.2 outcome 2 | concept | 21 | analyse, graphical, interpret, longitudinal, representations, transverse, waves | 横波与纵波 (phy_wave_types，已抽样核验) | candidate_partial |
| 7.3 outcome 2 | concept | 21 | expression, frequency, fs, fο, moves, observed, observer, relative | 多普勒效应 (phy_doppler，已抽样核验) | candidate_partial |
| 7.4 outcome 2 | concept | 21 | approximate, electromagnetic, free, principal, radio, range, rays, regions | 电磁波谱 (phy_em_spectrum，已抽样核验) | candidate_partial |
| 7.4 outcome 3 | concept | 21 | 700nm, eye, free, human, range, space, visible, wavelengths | 电磁波谱 (phy_em_spectrum，已抽样核验) | candidate_partial |
| 7.5 outcome 1 | concept | 21 | associated, phenomenon, polarisation, transverse, waves | 横波与纵波 (phy_wave_types，已抽样核验) | candidate_partial |
| 7.5 outcome 2 | concept_and_skill | 21 | polarising, filter, intensity, wave, after, calculate, calculation, cos2 | 无 | candidate_gap |
| 8.1 outcome 2 | practical_skill | 22 | corrections, end, air, assumed, columns, concept, demonstrate, experiments | 驻波 (phy_stationary_waves，已抽样核验) | skill_mapping_required |
| 8.1 outcome 3 | concept | 22 | antinodes, formation, graphical, identify, method, nodes, stationary, wave | 驻波 (phy_stationary_waves，已抽样核验) | candidate_partial |
| 8.1 outcome 4 | concept | 22 | antinodes, determined, how, nodes, positions, stationary, wave, wavelength | 驻波 (phy_stationary_waves，已抽样核验) | candidate_partial |
| 8.2 outcome 2 | practical_skill | 22 | diffraction, demonstrate, effect, example, experiments, gap, qualitative, relative | 衍射 (phy_diffraction，已抽样核验) | skill_mapping_required |
| 8.3 outcome 1 | concept | 22 | coherence, interference, terms | 双源干涉 (phy_interference，已抽样核验) | candidate_partial |
| 8.3 outcome 2 | practical_skill | 22 | demonstrate, experiments, interference, light, microwaves, ripple, show, sound | 双源干涉 (phy_interference，已抽样核验) | skill_mapping_required |
| 8.3 outcome 3 | concept | 22 | conditions, fringes, if, interference, observed, required, source, two | 双源干涉 (phy_interference，已抽样核验) | candidate_partial |
| 8.3 outcome 4 | concept | 22 | ax, double, interference, light, slit | 双源干涉 (phy_interference，已抽样核验) | candidate_partial |
| 8.4 outcome 1 | concept | 22 | nλ, sin | 衍射光栅 (phy_diffraction_grating，已抽样核验) | candidate_partial |
| 9.1 outcome 4 | concept | 23 | anvq, carriers, carrying, charge, conductor, current, density, expression | 电流与电荷 (phy_current_charge，已抽样核验) | candidate_partial |
| 9.2 outcome 3 | concept | 23 | i2, v2, vi | 功率与效率 (phy_power_efficiency，已抽样核验) | candidate_partial |
| 9.3 outcome 3 | concept_and_skill | 23 | at, characteristics, conductor, constant, diode, filament, lamp, metallic | I-V特性 (phy_iv_characteristics，已抽样核验) | candidate_partial |
| 9.3 outcome 4 | concept | 23 | increases, because, current, filament, lamp, resistance, temperature | 电阻与欧姆定律 (phy_resistance_ohm，已抽样核验) | candidate_partial |
| 9.3 outcome 6 | concept | 23 | ρl | 电阻率 (phy_resistivity，已抽样核验) | candidate_partial |
| 9.3 outcome 7 | concept | 23 | light, decreases, dependent, increases, intensity, ldr, resistance, resistor | 无 | candidate_gap |
| 9.3 outcome 8 | concept | 23 | temperature, assumed, coefficient, decreases, have, increases, negative, resistance | 无 | candidate_gap |
| 10.1 outcome 1 | concept | 24 | circuit, section, shown, syllabus, symbols | 无 | candidate_gap |
| 10.1 outcome 2 | concept_and_skill | 24 | circuit, containing, diagrams, draw, interpret, section, shown, syllabus | 基尔霍夫定律 (phy_kirchhoff，已抽样核验) | skill_mapping_required |
| 10.1 outcome 3 | concept | 24 | charge, around, circuit, complete, define, driving, electromotive, energy | 电势差与EMF (phy_pd_emf，已抽样核验) | candidate_partial |
| 10.2 outcome 7 | concept_and_skill | 24 | circuit, kirchhoff, law, problems, simple, solve | 基尔霍夫定律 (phy_kirchhoff，已抽样核验) | candidate_partial |
| 10.3 outcome 1 | concept | 24 | circuit, divider, potential, principle | 分压器 (phy_potential_divider，已抽样核验) | candidate_partial |
| 10.3 outcome 2 | concept | 24 | comparing, differences, means, potential, potentiometer, principle | 分压器 (phy_potential_divider，已抽样核验) | candidate_partial |
| 10.3 outcome 3 | concept | 24 | galvanometer, methods, null | 无 | candidate_gap |
| 10.3 outcome 4 | concept | 24 | dependent, light, potential, difference, dividers, intensity, on, provide | 分压器 (phy_potential_divider，已抽样核验) | candidate_partial |
| 11.1 outcome 1 | concept | 25 | existence, experiment, infer, nucleus, particle, results, scattering, size | 原子核结构 (phy_nuclear_structure，已抽样核验) | candidate_partial |
| 11.1 outcome 2 | concept | 25 | atom, electron, include, model, neutron, nuclear, orbital, proton | 原子核结构 (phy_nuclear_structure，已抽样核验) | candidate_partial |
| 11.1 outcome 3 | concept | 25 | number, between, distinguish, nucleon, proton | 原子核结构 (phy_nuclear_structure，已抽样核验) | candidate_partial |
| 11.1 outcome 4 | concept | 25 | different, element, forms, isotopes, neutron, nuclei, numbers, same | 无 | candidate_gap |
| 11.1 outcome 5 | concept | 25 | notation, nuclides, representation | 原子核结构 (phy_nuclear_structure，已抽样核验) | candidate_partial |
| 11.1 outcome 6 | concept | 25 | charge, conserved, nuclear, nucleon, number, processes | 无 | candidate_gap |
| 11.1 outcome 7 | concept | 25 | both, charge, composition, electron, included, mass, positrons, radiations | 放射性衰变 (phy_radioactive_decay，已抽样核验) | candidate_partial |
| 11.1 outcome 8 | concept | 25 | antiparticle, but, charge, corresponding, electron, has, mass, opposite | 基本粒子与夸克 (phy_fundamental_particles，已抽样核验) | candidate_partial |
| 11.1 outcome 9 | concept | 25 | decay, during, electron, produced, antineutrinos, neutrinos | 基本粒子与夸克 (phy_fundamental_particles，已抽样核验) | candidate_partial |
| 11.1 outcome 10 | concept | 25 | energies, have, particle, anti, because, but, continuous, decay | 无 | candidate_gap |
| 11.1 outcome 11 | concept | 25 | decay, equation, form, radioactive, represent, th | 放射性衰变 (phy_radioactive_decay，已抽样核验) | candidate_partial |
| 11.1 outcome 12 | concept | 25 | mass, unit, atomic, unified | 无 | candidate_gap |
| 11.2 outcome 1 | concept | 25 | quark, bottom, charm, down, flavours, fundamental, particle, six | 基本粒子与夸克 (phy_fundamental_particles，已抽样核验) | candidate_partial |
| 11.2 outcome 2 | concept | 25 | charge, antiquark, any, each, flavour, has, knowledge, no | 基本粒子与夸克 (phy_fundamental_particles，已抽样核验) | candidate_partial |
| 11.2 outcome 3 | concept | 25 | neutron, proton, composition, fundamental, particle, quark, terms | 基本粒子与夸克 (phy_fundamental_particles，已抽样核验) | candidate_partial |
| 11.2 outcome 4 | concept | 25 | consisting, one, antiquark, baryon, either, hadron, meson, quark | 基本粒子与夸克 (phy_fundamental_particles，已抽样核验) | candidate_partial |
| 11.2 outcome 5 | concept | 25 | changes, composition, decay, during, place, quark, take | 基本粒子与夸克 (phy_fundamental_particles，已抽样核验) | candidate_partial |
| 11.2 outcome 6 | concept | 25 | called, electron, fundamental, leptons, neutrinos, particle | 基本粒子与夸克 (phy_fundamental_particles，已抽样核验) | candidate_partial |
| 12.1 outcome 1 | concept | 26 | angular, define, displacement, express, radian, radians | 弧度与角速度 (phy_angular_speed，已抽样核验) | candidate_partial |
| 12.1 outcome 3 | concept | 26 | 2π, rω | 弧度与角速度 (phy_angular_speed，已抽样核验) | candidate_partial |
| 12.2 outcome 1 | concept | 26 | acceleration, always, causes, centripetal, constant, direction, force, magnitude | 向心力 (phy_centripetal_force，已抽样核验) | candidate_partial |
| 12.2 outcome 2 | concept | 26 | acceleration, angular, causes, centripetal, circular, constant, motion, speed | 向心加速度 (phy_centripetal_accel，已抽样核验) | candidate_partial |
| 12.2 outcome 3 | concept | 26 | rω2, v2 | 向心加速度 (phy_centripetal_accel，已抽样核验) | candidate_partial |
| 12.2 outcome 4 | concept | 26 | mrω2, mv2 | 向心力 (phy_centripetal_force，已抽样核验) | candidate_partial |
| 13.1 outcome 2 | concept | 26 | field, gravitational, lines, means, represent | 引力场强度 (phy_grav_field_strength，已抽样核验) | candidate_partial |
| 13.2 outcome 1 | concept | 26 | mass, point, sphere, at, centre, considered, outside, uniform | 引力场强度 (phy_grav_field_strength，已抽样核验) | candidate_partial |
| 13.2 outcome 4 | concept | 26 | above, at, directly, earth, east, equator, geostationary, hours | 轨道运动 (phy_orbits，已抽样核验) | candidate_partial |
| 13.3 outcome 3 | concept | 27 | approximately, changes, constant, earth, height, near, small, surface | 引力场强度 (phy_grav_field_strength，已抽样核验) | candidate_partial |
| 13.4 outcome 2 | concept | 27 | due, field, gm, gravitational, mass, point, potential | 引力势 (phy_grav_potential，已抽样核验) | candidate_partial |
| 13.4 outcome 3 | concept | 27 | gravitational, potential, concept, energy, ep, gmm, how, leads | 引力势 (phy_grav_potential，已抽样核验) | candidate_partial |
| 14.1 outcome 1 | concept | 27 | region, temperature, energy, higher, lower, thermal, transferred | 温度与热平衡 (phy_temperature，已抽样核验) | candidate_partial |
| 14.1 outcome 2 | concept | 27 | equal, equilibrium, regions, temperature, thermal | 温度与热平衡 (phy_temperature，已抽样核验) | candidate_partial |
| 14.2 outcome 1 | concept | 27 | temperature, at, constant, density, examples, gas, liquid, measurement | 无 | candidate_gap |
| 14.2 outcome 2 | concept | 27 | any, depend, does, on, particular, property, scale, substance | 无 | candidate_gap |
| 14.2 outcome 3 | concept | 27 | between, celsius, convert, degrees, kelvin, temperatures | 温度与热平衡 (phy_temperature，已抽样核验) | candidate_partial |
| 14.2 outcome 4 | concept | 27 | temperature, zero, absolute, kelvin, known, lowest, on, possible | 温度与热平衡 (phy_temperature，已抽样核验) | candidate_partial |
| 14.3 outcome 1 | concept | 28 | capacity, define, heat, specific | 比热与潜热 (phy_heat_capacity，已抽样核验) | candidate_partial |
| 14.3 outcome 2 | concept | 28 | heat, latent, specific, between, define, distinguish, fusion, vaporisation | 比热与潜热 (phy_heat_capacity，已抽样核验) | candidate_partial |
| 15.1 outcome 1 | concept | 28 | base, amount, mol, quantity, si, substance, unit | SI基本单位 (phy_si_units，已抽样核验) | candidate_partial |
| 15.1 outcome 2 | concept | 28 | substance, amount, any, avogadro, constant, containing, equal, molar | 无 | candidate_gap |
| 15.2 outcome 2 | concept | 28 | number, pv, where, amount, equation, expressed, gas, ideal | 理想气体定律 (phy_ideal_gas，已抽样核验) | candidate_partial |
| 15.2 outcome 3 | concept | 28 | boltzmann, constant, given, na | 无 | candidate_gap |
| 15.3 outcome 1 | concept | 28 | assumptions, basic, gases, kinetic, theory | 气体动理论 (phy_kinetic_theory，已抽样核验) | candidate_partial |
| 15.3 outcome 2 | concept_and_skill | 28 | c2, causes, collisions, considering, cx, derive, dimensional, dimensions | 气体动理论 (phy_kinetic_theory，已抽样核验) | candidate_partial |
| 15.3 outcome 3 | concept | 28 | cr, given, mean, root, speed, square | 气体动理论 (phy_kinetic_theory，已抽样核验) | candidate_partial |
| 15.3 outcome 4 | concept | 28 | pv, average, c2, compare, deduce, energy, expression, kinetic | 气体动理论 (phy_kinetic_theory，已抽样核验) | candidate_partial |
| 16.1 outcome 1 | concept | 29 | system, associated, can, determined, distribution, energies, energy, expressed | 内能与第一定律 (phy_internal_energy，已抽样核验) | candidate_partial |
| 16.1 outcome 2 | concept | 29 | energy, increase, internal, object, relate, rise, temperature | 内能与第一定律 (phy_internal_energy，已抽样核验) | candidate_partial |
| 16.2 outcome 1 | concept | 29 | done, gas, work, at, between, changes, constant, difference | 内能与第一定律 (phy_internal_energy，已抽样核验) | candidate_partial |
| 16.2 outcome 2 | concept | 29 | system, energy, heating, done, expressed, first, increase, internal | 内能与第一定律 (phy_internal_energy，已抽样核验) | candidate_partial |
| 17.1 outcome 1 | concept | 29 | frequency, angular, period, terms, amplitude, both, context, difference | 简谐运动 (phy_shm，已抽样核验) | candidate_partial |
| 17.1 outcome 3 | concept | 29 | equation, sin, solution, x0, ω2, ωt | 简谐运动 (phy_shm，已抽样核验) | candidate_partial |
| 17.1 outcome 4 | concept | 29 | cos, equation, v0, ωt | 简谐运动 (phy_shm，已抽样核验) | candidate_partial |
| 17.1 outcome 5 | concept_and_skill | 29 | acceleration, analyse, displacement, graphical, harmonic, interpret, motion, representations | 简谐运动 (phy_shm，已抽样核验) | candidate_partial |
| 17.2 outcome 2 | concept | 30 | energy, harmonic, motion, mω2, simple, system, total, undergoing | SHM能量 (phy_shm_energy，已抽样核验) | candidate_partial |
| 17.3 outcome 1 | concept | 30 | acting, causes, damping, force, on, oscillating, resistive, system | 阻尼 (phy_damping，已抽样核验) | candidate_partial |
| 17.3 outcome 2 | concept_and_skill | 30 | damping, critical, displacement, graphs, heavy, illustrating, light, sketch | 阻尼 (phy_damping，已抽样核验) | candidate_partial |
| 18.1 outcome 3 | concept | 30 | field, electric, lines, means, represent | 电场强度 (phy_e_field_strength，已抽样核验) | candidate_partial |
| 18.2 outcome 1 | concept_and_skill | 30 | field, between, calculate, charged, parallel, plates, strength, uniform | 电场强度 (phy_e_field_strength，已抽样核验) | candidate_partial |
| 18.2 outcome 2 | concept_and_skill | 30 | charged, effect, electric, field, motion, on, particle, uniform | 电场强度 (phy_e_field_strength，已抽样核验) | candidate_partial |
| 18.3 outcome 1 | concept | 31 | charge, point, at, centre, conductor, considered, on, outside | 库仑定律 (phy_coulomb，已抽样核验) | candidate_partial |
| 18.5 outcome 2 | concept | 31 | at, point, electric, equal, fact, field, gradient, negative | 电势 (phy_e_potential，已抽样核验) | candidate_partial |
| 18.5 outcome 3 | concept | 31 | 4πε0, charge, due, electric, field, point, potential | 电势 (phy_e_potential，已抽样核验) | candidate_partial |
| 18.5 outcome 4 | concept | 31 | electric, potential, 4πε0, charge, concept, energy, ep, how | 电势 (phy_e_potential，已抽样核验) | candidate_partial |
| 19.1 outcome 1 | concept | 31 | applied, both, capacitance, capacitors, conductors, define, isolated, parallel | 电容 (phy_capacitance_def，已抽样核验) | candidate_partial |
| 19.1 outcome 3 | concept_and_skill | 31 | capacitance, capacitors, combined, derive, formulae, parallel, series | 串并联电容 (phy_capacitor_networks，已抽样核验) | candidate_partial |
| 19.2 outcome 2 | concept | 32 | cv2, qv | 电容储能 (phy_capacitor_energy，已抽样核验) | candidate_partial |
| 19.3 outcome 1 | concept | 32 | analyse, capacitor, charge, current, difference, discharging, graphs, potential | 充放电 (phy_capacitor_discharge，已抽样核验) | candidate_partial |
| 19.3 outcome 3 | concept | 32 | capacitor, charge, could, current, difference, discharging, equation, form | 充放电 (phy_capacitor_discharge，已抽样核验) | candidate_partial |
| 20.1 outcome 1 | concept | 32 | field, charge, either, example, force, magnetic, magnets, moving | 磁通密度 (phy_flux_density，已抽样核验) | candidate_partial |
| 20.1 outcome 2 | concept | 32 | field, lines, magnetic, represent | 磁通密度 (phy_flux_density，已抽样核验) | candidate_partial |
| 20.2 outcome 2 | concept | 32 | bil, directions, equation, fleming, hand, interpreted, left, rule | 载流导线受力 (phy_force_conductor，已抽样核验) | candidate_partial |
| 20.2 outcome 3 | concept | 32 | magnetic, per, unit, acting, angles, at, current, define | 磁通密度 (phy_flux_density，已抽样核验) | candidate_partial |
| 20.3 outcome 1 | concept | 33 | charge, direction, field, force, magnetic, moving, on | 运动电荷受力 (phy_force_charge，已抽样核验) | candidate_partial |
| 20.3 outcome 2 | concept | 33 | bqv, sin | 运动电荷受力 (phy_force_charge，已抽样核验) | candidate_partial |
| 20.3 outcome 3 | concept_and_skill | 33 | bi, derive, expression, hall, ntq, origin, thickness, vh | 无 | candidate_gap |
| 20.3 outcome 4 | practical_skill | 33 | density, flux, hall, magnetic, measure, probe | 磁通密度 (phy_flux_density，已抽样核验) | candidate_partial |
| 20.3 outcome 6 | concept | 33 | can, electric, fields, how, magnetic, selection, used, velocity | 电场强度 (phy_e_field_strength，已抽样核验) | candidate_partial |
| 20.4 outcome 2 | concept | 33 | core, current, due, ferrous, field, increased, magnetic, solenoid | 电流磁场 (phy_fields_currents，已抽样核验) | candidate_partial |
| 20.4 outcome 3 | concept | 33 | forces, between, carrying, conductors, current, direction, origin | 载流导线受力 (phy_force_conductor，已抽样核验) | candidate_partial |
| 20.5 outcome 1 | concept | 33 | flux, magnetic, density, area, cross, define, direction, perpendicular | 磁通与磁链 (phy_flux_linkage，已抽样核验) | candidate_partial |
| 20.5 outcome 2 | concept | 33 | ba | 磁通与磁链 (phy_flux_linkage，已抽样核验) | candidate_partial |
| 20.5 outcome 4 | practical_skill | 33 | induced, affecting, can, change, changing, circuit, demonstrate, direction | 磁通与磁链 (phy_flux_linkage，已抽样核验) | skill_mapping_required |
| 21.1 outcome 1 | concept | 34 | alternating, applied, current, frequency, peak, period, terms, value | 交流电与RMS值 (phy_ac_rms，已抽样核验) | candidate_partial |
| 21.1 outcome 2 | concept | 34 | alternating, current, equation, form, representing, sin, sinusoidally, voltage | 交流电与RMS值 (phy_ac_rms，已抽样核验) | candidate_partial |
| 21.1 outcome 3 | concept | 34 | power, alternating, current, fact, half, load, maximum, mean | 交流电与RMS值 (phy_ac_rms，已抽样核验) | candidate_partial |
| 21.1 outcome 4 | concept | 34 | alternating, between, current, distinguish, i0, ir, mean, peak | 交流电与RMS值 (phy_ac_rms，已抽样核验) | candidate_partial |
| 21.2 outcome 1 | concept | 34 | wave, between, distinguish, full, graphically, half, rectification | 整流 (phy_rectification，已抽样核验) | candidate_partial |
| 21.2 outcome 2 | concept | 34 | alternating, current, diode, half, rectification, single, wave | 整流 (phy_rectification，已抽样核验) | candidate_partial |
| 21.2 outcome 3 | concept | 34 | alternating, bridge, current, diodes, four, full, rectification, rectifier | 整流 (phy_rectification，已抽样核验) | candidate_partial |
| 21.2 outcome 4 | concept | 34 | effect, analyse, capacitance, capacitor, load, resistance, single, smoothing | 整流 (phy_rectification，已抽样核验) | candidate_partial |
| 22.1 outcome 4 | concept | 34 | electronvolt, energy, ev, unit | 光子能量 (phy_photon，已抽样核验) | candidate_partial |
| 22.1 outcome 5 | concept | 34 | momentum, given, has, photon | 光子能量 (phy_photon，已抽样核验) | candidate_partial |
| 22.2 outcome 2 | concept | 35 | threshold, frequency, terms, wavelength | 光电效应 (phy_photoelectric，已抽样核验) | candidate_partial |
| 22.2 outcome 3 | concept | 35 | energy, emission, function, photoelectric, photon, terms, work | 光电效应 (phy_photoelectric，已抽样核验) | candidate_partial |
| 22.2 outcome 4 | concept | 35 | hf, mvmax | 光电效应 (phy_photoelectric，已抽样核验) | candidate_partial |
| 22.2 outcome 5 | concept | 35 | intensity, current, energy, independent, kinetic, maximum, photoelectric, photoelectrons | 光电效应 (phy_photoelectric，已抽样核验) | candidate_partial |
| 22.3 outcome 1 | concept | 35 | evidence, nature, diffraction, effect, electromagnetic, interference, particulate, phenomena | 波粒二象性 (phy_wave_particle，已抽样核验) | candidate_partial |
| 22.3 outcome 2 | concept | 35 | diffraction, electron, evidence, interpret, nature, particle, provided, qualitatively | 波粒二象性 (phy_wave_particle，已抽样核验) | candidate_partial |
| 22.3 outcome 4 | concept | 35 |  | 波粒二象性 (phy_wave_particle，已抽样核验) | candidate_partial |
| 23.1 outcome 1 | concept | 36 | between, energy, equation, equivalence, mass, mc2, represented | 质量亏损与结合能 (phy_binding_energy，已抽样核验) | candidate_partial |
| 23.1 outcome 2 | concept | 36 | nuclear, equation, form, he, reaction, represent, simple | 放射性衰变 (phy_radioactive_decay，已抽样核验) | candidate_partial |
| 23.1 outcome 4 | concept_and_skill | 36 | nucleon, binding, energy, number, per, sketch, variation | 质量亏损与结合能 (phy_binding_energy，已抽样核验) | candidate_partial |
| 23.1 outcome 7 | concept_and_skill | 36 | c2, calculate, energy, nuclear, reaction, released | 质量亏损与结合能 (phy_binding_energy，已抽样核验) | candidate_partial |
| 23.2 outcome 1 | concept | 36 | count, decay, evidence, fluctuations, nature, provide, radioactive, random | 放射性衰变 (phy_radioactive_decay，已抽样核验) | candidate_partial |
| 23.2 outcome 3 | concept | 36 | activity, constant, decay, define, λn | 放射性衰变 (phy_radioactive_decay，已抽样核验) | candidate_partial |
| 23.2 outcome 5 | concept | 36 |  | 半衰期 (phy_half_life，已抽样核验) | candidate_partial |
| 23.2 outcome 6 | concept_and_skill | 36 | activity, could, count, decay, exponential, nature, nuclei, number | 放射性衰变 (phy_radioactive_decay，已抽样核验) | candidate_partial |
| 24.1 outcome 1 | concept | 37 | changes, crystal, shape, when, across, applied, electric, generates | 无 | candidate_gap |
| 24.1 outcome 2 | concept | 37 | detected, generated, how, piezoelectric, transducer, ultrasound, waves | 无 | candidate_gap |
| 24.1 outcome 3 | concept | 37 | about, at, between, boundaries, can, diagnostic, how, information | 无 | candidate_gap |
| 24.1 outcome 4 | concept | 37 | medium, acoustic, define, impedance, sound, specific, speed, where | 无 | candidate_gap |
| 24.1 outcome 5 | concept | 37 | z1, z2, between, boundary, coefficient, i0, intensity, ir | 无 | candidate_gap |
| 24.1 outcome 6 | concept | 37 | attenuation, i0, matter, ultrasound, μx | 无 | candidate_gap |
| 24.2 outcome 1 | concept_and_skill | 37 | produced, rays, accelerating, bombardment, calculate, electron, metal, minimum | 无 | candidate_gap |
| 24.2 outcome 2 | concept | 37 | imaging, body, contrast, internal, ray, rays, structures, term | 无 | candidate_gap |
| 24.2 outcome 3 | concept | 37 | attenuation, i0, matter, rays, μx | 无 | candidate_gap |
| 24.2 outcome 4 | concept | 37 | 2d, combining, image, images, multiple, section, 3d, along | 无 | candidate_gap |
| 24.3 outcome 1 | concept | 38 | absorbed, being, body, can, containing, into, introduced, nuclei | 无 | candidate_gap |
| 24.3 outcome 2 | concept | 38 | decay, decays, emission, pet, positron, scanning, tomography, tracer | 放射性衰变 (phy_radioactive_decay，已抽样核验) | candidate_partial |
| 24.3 outcome 3 | concept | 38 | annihilation, antiparticle, conserved, energy, interacts, mass, momentum, occurs | 无 | candidate_gap |
| 24.3 outcome 4 | concept | 38 | annihilate, decay, directions, electron, emitted, gamma, interact, opposite | 无 | candidate_gap |
| 24.3 outcome 5 | concept_and_skill | 38 | annihilation, calculate, during, electron, emitted, energy, gamma, pair | 质量亏损与结合能 (phy_binding_energy，已抽样核验) | candidate_partial |
| 24.3 outcome 6 | concept | 38 | can, gamma, photons, ray, annihilation, arrival, body, concentration | 放射性衰变 (phy_radioactive_decay，已抽样核验) | candidate_partial |
| 25.1 outcome 1 | concept | 38 | emitted, luminosity, power, radiation, star, term, total | 亮度与辐射通量 (phy_luminosity，已抽样核验) | candidate_partial |
| 25.1 outcome 2 | concept | 38 | 4πd2, flux, intensity, inverse, law, luminosity, radiant, source | 亮度与辐射通量 (phy_luminosity，已抽样核验) | candidate_partial |
| 25.1 outcome 3 | concept | 38 | called, candle, known, luminosity, object, standard | 标准烛光 (phy_standard_candles，已抽样核验) | candidate_partial |
| 25.2 outcome 1 | concept | 38 | displacement, estimate, law, peak, star, surface, temperature, wien | 恒星半径 (phy_stellar_radii，已抽样核验) | candidate_partial |
| 25.2 outcome 2 | concept | 38 | 4πσr2, boltzmann, law, stefan, t4 | 恒星半径 (phy_stellar_radii，已抽样核验) | candidate_partial |
| 25.2 outcome 3 | concept | 38 | law, boltzmann, displacement, estimate, radius, star, stefan, wien | 恒星半径 (phy_stellar_radii，已抽样核验) | candidate_partial |
| 25.3 outcome 1 | concept | 39 | absorption, distant, emission, increase, known, lines, objects, show | 能级与线光谱 (phy_energy_levels，已抽样核验) | candidate_partial |
| 25.3 outcome 2 | concept | 39 | electromagnetic, moving, observer, radiation, redshift, relative, source | 多普勒效应 (phy_doppler，已抽样核验) | candidate_partial |
| 25.3 outcome 3 | concept | 39 | expanding, idea, leads, redshift, universe, why | 哈勃定律与大爆炸 (phy_hubble，已抽样核验) | candidate_partial |

## 现有 KG 中未被高置信命中的概念

- SI基本单位（SI Base Units，`phy_si_units`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 误差与不确定度（Errors and Uncertainties，`phy_uncertainty`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 不确定度合成（Combining Uncertainties，`phy_combine_uncertainty`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 位移速度加速度（Displacement Velocity Acceleration，`phy_motion_quantities`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 运动方程（Equations of Motion，`phy_suvat`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 自由落体（Free Fall，`phy_free_fall`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 抛体运动（Projectile Motion，`phy_projectile`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 牛顿运动定律（Newton's Laws of Motion，`phy_newton_laws`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 冲量与碰撞（Impulse and Collisions，`phy_impulse`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 力的类型（Types of Force，`phy_force_types`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 密度与压强（Density and Pressure，`phy_density_pressure`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 浮力与阿基米德（Upthrust and Archimedes，`phy_upthrust`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 行波（Progressive Waves，`phy_progressive_waves`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 双源干涉（Two-Source Interference，`phy_interference`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 驻波（Stationary Waves，`phy_stationary_waves`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 电阻率（Resistivity，`phy_resistivity`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- I-V特性（I-V Characteristics，`phy_iv_characteristics`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 分压器（Potential Dividers，`phy_potential_divider`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 向心加速度（Centripetal Acceleration，`phy_centripetal_accel`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 向心力（Centripetal Force，`phy_centripetal_force`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 阻尼（Damping，`phy_damping`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 温度与热平衡（Temperature and Thermal Equilibrium，`phy_temperature`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 比热与潜热（Specific Heat and Latent Heat，`phy_heat_capacity`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 气体动理论（Kinetic Theory of Gases，`phy_kinetic_theory`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 内能与第一定律（Internal Energy and First Law，`phy_internal_energy`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 引力场与电场类比（Gravitational and Electric Field Analogy，`phy_field_analogy`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 磁通密度（Magnetic Flux Density，`phy_flux_density`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 楞次定律（Lenz's Law，`phy_lenz`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 交流电与RMS值（AC and RMS Values，`phy_ac_rms`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 变压器（Transformers，`phy_transformers`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 整流（Rectification，`phy_rectification`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 原子核结构（Atomic and Nuclear Structure，`phy_nuclear_structure`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 基本粒子与夸克（Fundamental Particles and Quarks，`phy_fundamental_particles`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 亮度与辐射通量（Luminosity and Radiant Flux Intensity，`phy_luminosity`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。
- 恒星半径（Stellar Radii，`phy_stellar_radii`）：自动映射未将其列为任何高置信 outcome 的首选概念；需人工判断是否超纲、粒度过细或只是词汇不匹配。

## 审核规则

1. 打开来源页和对应 syllabus 页核对原文。
2. 将每项标记为覆盖、部分覆盖、缺失或排除，并写明理由。
3. 只有人工确认后，才可修改正式 KG 的 evidence_refs/review_status。
4. 新增、删除、合并或先修边调整必须单独形成变更记录。
