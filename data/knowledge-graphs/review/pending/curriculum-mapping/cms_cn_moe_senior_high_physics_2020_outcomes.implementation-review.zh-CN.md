# 中国高中物理 KG 缺口实施复核（中文）

- 复核日期：2026-07-19
- 缺口解析：78 项
- 直接复用现有 canonical 组合：5 项
- 新增节点或 jurisdiction alias：73 项
- 其中新 canonical：69 个；复用 canonical alias：4 个
- 新图：73 个 Concept，28 个 Topic，18 条待审先修边
- 状态：全部保持 `needs_review`；本轮是 AI 语义复核，不伪造人工批准。

## 关键纠错

1. 5 项原缺口实际可由现有 canonical 概念或概念组合完整覆盖，已改为直接复用，未创建一对多伪 alias。
2. 光能量量子化、核能初步、原子核式模型和实物粒子波动性与现有全局定义相同，只建立中国课程 alias，不产生新 canonical ID。
3. ‘运动方程’不等于‘自由落体’，‘动能与势能’不等于‘动能定理’，‘电阻与欧姆定律’不等于‘闭合电路欧姆定律’；这些仍保留独立诊断概念。
4. 能源、污染与表面张力未使用不直接支持结论的泛化章节，分别改用 OpenStax §8.5、College Physics 2e §7.9 与 §11.8。
5. OpenStax 当前页面有额外的大模型摄入限制；仓库只保存元数据、校验值和章节定位，不保存或摄入教材正文。
6. 逐项检查 56 个根概念：它们是主题入口或依赖统一 KG 中已复用概念；没有把课程排列顺序伪造成学理先修边。

## 逐项解析

| # | 原缺口 | 动作 | canonical IDs | 新节点 | 证据二 |
|---:|---|---|---|---|---|
| 1 | 质点模型及适用条件 | `add_or_alias_concepts` | `pc_7fb3bae053e05c19a673406d9390ce1e` | `cn_sh_physics_particle_model` | src_openstax_university_physics_v1_2016：Web §§1.1-1.2 The Scope and Scale of Physics; Units and Standards |
| 2 | 自由落体运动 | `add_or_alias_concepts` | `pc_cee2843193f234b6e2ec3291ef31565c`<br>`pc_c20a5606c91decfdafc12760a58c69e6` | `cn_sh_physics_free_fall` | src_openstax_university_physics_v1_2016：Web §§3.4-3.5 Motion with Constant Acceleration; Free Fall |
| 3 | 重力与弹力 | `add_or_alias_concepts` | `pc_7a4b1f0c0833180c2f630c367c02cc0a`<br>`pc_bc7b7594d3874b58a8c13a1451316ee9` | `cn_sh_physics_gravity_elastic_force` | src_openstax_university_physics_v1_2016：Web §5.6 Common Forces; §12.3 Stress, Strain, and Elastic Modulus |
| 4 | 静摩擦与滑动摩擦 | `add_or_alias_concepts` | `pc_7a4b1f0c0833180c2f630c367c02cc0a`<br>`pc_fc76f40e045f7ff96fc05caea20f543d` | `cn_sh_physics_friction` | src_openstax_university_physics_v1_2016：Web §6.2 Friction |
| 5 | 力的合成分解与矢量 | `add_or_alias_concepts` | `pc_123685f6debed5592b49d13d9647519f` | `cn_sh_physics_force_composition_vectors` | src_openstax_university_physics_v1_2016：Web §§2.1-2.3 Scalars and Vectors; Components; Algebra of Vectors |
| 6 | 超重与失重 | `add_or_alias_concepts` | `pc_b2063844cb1a96c55e14253c14719d9f`<br>`pc_1b9339cdffec05a6abf0da3466233d50` | `cn_sh_physics_overweight_weightlessness` | src_openstax_university_physics_v1_2016：Web §6.1 Solving Problems with Newton's Laws; Chapter 6 conceptual questions on free-fall scale readings |
| 7 | 国际单位制中的力学单位 | `add_or_alias_concepts` | `pc_d16520079cd127b461c2f1e5ff9eedca` | `cn_sh_physics_si_mechanics_units` | src_openstax_university_physics_v1_2016：Web §§1.2-1.4 Units and Standards; Unit Conversion; Dimensional Analysis |
| 8 | 动能与动能定理 | `add_or_alias_concepts` | `pc_94622268081f1c4560a463b79eece9a8`<br>`pc_84347af49c149c10e606c6999c858087` | `cn_sh_physics_kinetic_energy_theorem` | src_openstax_university_physics_v1_2016：Web §§7.2-7.4 Kinetic Energy and the Work-Energy Theorem |
| 9 | 重力势能 | `add_or_alias_concepts` | `pc_94622268081f1c4560a463b79eece9a8`<br>`pc_4fbe69f2cb33cc9b3613d86361b2a01e` | `cn_sh_physics_gravitational_potential_energy` | src_openstax_university_physics_v1_2016：Web §8.1 Potential Energy of a System |
| 10 | 弹性势能 | `add_or_alias_concepts` | `pc_94622268081f1c4560a463b79eece9a8`<br>`pc_573ab5ecc0a3e03c345c23eb655557f4` | `cn_sh_physics_elastic_potential_energy` | src_openstax_university_physics_v1_2016：Web §8.2 Conservative and Non-Conservative Forces; spring potential energy |
| 11 | 曲线运动及发生条件 | `add_or_alias_concepts` | `pc_e0018e74d862f9477ad37ad0939a3362` | `cn_sh_physics_curvilinear_motion_condition` | src_openstax_university_physics_v1_2016：Web §§4.1-4.4 Motion in Two and Three Dimensions |
| 12 | 离心现象及应用 | `add_or_alias_concepts` | `pc_564a46a0b8681d3ee2bfb13b78e2cbe0`<br>`pc_287fa88ea36743cd92be22351d689a3a` | `cn_sh_physics_centrifugal_phenomena` | src_openstax_university_physics_v1_2016：Web §6.3 Centripetal Force |
| 13 | 第二与第三宇宙速度 | `add_or_alias_concepts` | `pc_5ae39810b5a928dac2a4845e04b072bf`<br>`pc_442bac9d4cb17c3539b6cc37295efd60` | `cn_sh_physics_cosmic_velocities` | src_openstax_university_physics_v1_2016：Web §§13.3-13.5 Gravitational Potential Energy; Satellite Orbits; Kepler's Laws |
| 14 | 牛顿力学的局限性 | `add_or_alias_concepts` | `pc_6a2a85c34fe54bb286d41539f7ae263a` | `cn_sh_physics_newtonian_limits` | src_openstax_university_physics_v3_2016：Web §5.1 Invariance of Physical Laws; classical-limit discussion |
| 15 | 相对论时空观初步 | `add_or_alias_concepts` | `pc_793feb1134d27401f95626172db26847` | `cn_sh_physics_relativistic_spacetime` | src_openstax_university_physics_v3_2016：Web §§5.3-5.7 Time Dilation, Length Contraction, Lorentz Transformation and Relativistic Velocity |
| 16 | 宇宙起源与演化 | `add_or_alias_concepts` | `pc_cb71c8e25ad3454622e1bcfc3f8f0d20` | `cn_sh_physics_cosmic_evolution` | src_openstax_university_physics_v3_2016：Web §§11.5-11.7 Cosmology, The Big Bang and Evolution of the Early Universe |
| 17 | 静电现象与电荷守恒 | `add_or_alias_concepts` | `pc_62a6d88e535c20e54fc65c369645f13d`<br>`pc_e147ac958d91375f7fea37654f554a3a` | `cn_sh_physics_electrostatic_charge_conservation` | src_openstax_university_physics_v2_2016：Web §5.1 Electric Charge |
| 18 | 点电荷模型 | `add_or_alias_concepts` | `pc_79180076d6d14044ff49035198534f04` | `cn_sh_physics_point_charge_model` | src_openstax_university_physics_v2_2016：Web §5.2 Conductors, Insulators, and Charging by Induction; §5.3 Coulomb's Law |
| 19 | 电场线模型 | `add_or_alias_concepts` | `pc_cf0a24f8dd938cdfcc8ea4466833fd4e`<br>`pc_6320bd87e27eecb487c13e120a8f578f` | `cn_sh_physics_electric_field_lines` | src_openstax_university_physics_v2_2016：Web §5.6 Electric Field Lines |
| 20 | 静电利用与防护 | `add_or_alias_concepts` | `pc_85636deb6d3ee6b648adf30795ea0f68` | `cn_sh_physics_electrostatic_applications` | src_openstax_university_physics_v2_2016：Web §§5.2 and 6.4 Charging by Induction; Conductors in Electrostatic Equilibrium |
| 21 | 电势能、电势与电势差 | `add_or_alias_concepts` | `pc_d5eb2984fe400640527611f8af20f25d`<br>`pc_cf0a24f8dd938cdfcc8ea4466833fd4e`<br>`pc_f2e136fce8543aed60ca1f7af1dfaf13` | `cn_sh_physics_electric_potential_quantities` | src_openstax_university_physics_v2_2016：Web §§7.1-7.5 Electric Potential Energy, Potential and Equipotential Surfaces |
| 22 | 带电粒子在电场中的运动 | `add_or_alias_concepts` | `pc_cf0a24f8dd938cdfcc8ea4466833fd4e`<br>`pc_b2063844cb1a96c55e14253c14719d9f`<br>`pc_b4fdea67698c9135acc93ced186faba5` | `cn_sh_physics_charged_particle_electric_motion` | src_openstax_university_physics_v2_2016：Web §§5.4-5.5 Electric Field and Calculating Electric Fields |
| 23 | 电容器与电容 | `add_or_alias_concepts` | `pc_d30b430694ad09839f45be80b1955de3` | `cn_sh_physics_capacitance` | src_openstax_university_physics_v2_2016：Web §§8.1-8.2 Capacitors and Capacitance; Capacitors in Series and Parallel |
| 24 | 电容器充放电与应用 | `add_or_alias_concepts` | `pc_b88238663b2ae4ead83c9ee371f549e3` | `cn_sh_physics_capacitor_charge_discharge` | src_openstax_university_physics_v2_2016：Web §10.5 RC Circuits |
| 25 | 电路元件及作用 | `add_or_alias_concepts` | `pc_ba42e2ddad519230d0c77b2fca8ae0cf` | `cn_sh_physics_circuit_components` | src_openstax_university_physics_v2_2016：Web Chapter 10 introduction and §§10.1-10.5 Direct-Current Circuits |
| 26 | 电阻与材料、长度和横截面积 | `add_or_alias_concepts` | `pc_6a2c33585e2f59dc88ebd095503f1547`<br>`pc_95dca3ee10c643b31c1be9d5d2d48fec` | `cn_sh_physics_resistance_geometry_material` | src_openstax_university_physics_v2_2016：Web §§9.3-9.4 Resistivity and Resistance; Ohm's Law |
| 27 | 闭合电路欧姆定律 | `add_or_alias_concepts` | `pc_2c6fac377de551f06f129beb0bd0767f`<br>`pc_6a2c33585e2f59dc88ebd095503f1547`<br>`pc_13793e5fd99f9e6fdda988d5880aff75` | `cn_sh_physics_closed_circuit_ohm` | src_openstax_university_physics_v2_2016：Web §10.1 Electromotive Force; internal resistance and terminal voltage |
| 28 | 电功与电功率 | `add_or_alias_concepts` | `pc_d402d63a7ae8461cf8182aba31d92622` | `cn_sh_physics_electrical_work_power` | src_openstax_university_physics_v2_2016：Web §9.5 Electrical Energy and Power |
| 29 | 焦耳定律 | `add_or_alias_concepts` | `pc_12ff13ed776c84dc25e4bd78668623f8` | `cn_sh_physics_joule_law` | src_openstax_university_physics_v2_2016：Web §9.5 Electrical Energy and Power; resistive heating |
| 30 | 家庭电路与安全节约用电 | `add_or_alias_concepts` | `pc_29c1e5800d16e059b57e43dce0511d8f` | `cn_sh_physics_household_electricity_safety` | src_openstax_university_physics_v2_2016：Web §10.6 Household Wiring and Electrical Safety |
| 31 | 磁现象应用与历史贡献 | `add_or_alias_concepts` | `pc_88829f1af51723e0a7cf75e937a04343` | `cn_sh_physics_magnetism_applications_history` | src_openstax_university_physics_v2_2016：Web Chapter 11 introduction and §§11.1-11.5 Magnetic Forces and Fields |
| 32 | 磁感应强度与磁感线 | `reuse_existing` | `pc_21210700d95c5fb054342d60854fa86a`<br>`pc_9647bc019f27fd232ce00c144b507faa` | — | src_openstax_university_physics_v2_2016：Web §§11.2-11.4 Magnetic Fields and Forces; Chapter 12 current-source field patterns |
| 33 | 产生感应电流的条件 | `reuse_existing` | `pc_ef89f015bb0ebd4763d7cc0623222573` | — | src_openstax_university_physics_v2_2016：Web §13.1 Faraday's Law |
| 34 | 电磁波与电磁场物质性 | `add_or_alias_concepts` | `pc_ff3aafe811b49dfdca598b2667c1db93`<br>`pc_a407e4c3440aecc21479b8f773e137c9` | `cn_sh_physics_electromagnetic_field_waves` | src_openstax_university_physics_v2_2016：Web §§16.1-16.2 Maxwell's Equations and Electromagnetic Waves |
| 35 | 电磁波应用与影响 | `add_or_alias_concepts` | `pc_ff3aafe811b49dfdca598b2667c1db93`<br>`pc_1846ae0685154fc196157c6506215fcc` | `cn_sh_physics_electromagnetic_wave_applications` | src_openstax_university_physics_v2_2016：Web §16.5 The Electromagnetic Spectrum |
| 36 | 光能量不连续与量子化 | `add_or_alias_concepts` | `pc_667d6af1c79afd71fbd2dedbccfcc217` | `cn_sh_physics_light_energy_quantisation` | src_openstax_university_physics_v3_2016：Web §§6.1-6.2 Blackbody Radiation and Photoelectric Effect; photon energy |
| 37 | 水能、风能与太阳能利用 | `add_or_alias_concepts` | `pc_065b015f63b476f3b83f88259be64412` | `cn_sh_physics_renewable_energy_technologies` | src_openstax_university_physics_v1_2016：Web §8.5 Sources of Energy; hydropower, wind power and solar power |
| 38 | 核能利用初步 | `add_or_alias_concepts` | `pc_45e557e295944b395f08bb30c4bb963e` | `cn_sh_physics_nuclear_energy_intro` | src_openstax_university_physics_v3_2016：Web §§10.5-10.6 Fission and Nuclear Fusion |
| 39 | 能量转化的方向性 | `add_or_alias_concepts` | `pc_f8d4382299ba2e0232145d7818fc7206` | `cn_sh_physics_energy_conversion_directionality` | src_openstax_university_physics_v2_2016：Web Chapter 4 The Second Law of Thermodynamics, especially §§4.5-4.7 |
| 40 | 可再生能源与环境影响 | `add_or_alias_concepts` | `pc_2b5c32948baf2a177d94d9e594242e82` | `cn_sh_physics_renewable_environment` | src_openstax_college_physics_2e_2022：Web §7.9 World Energy Use; renewable/nonrenewable resources, sustainability and environmental effects |
| 41 | 污染防治与协调发展 | `add_or_alias_concepts` | `pc_3ced0e502ae3b2861e8da5823f7d3649` | `cn_sh_physics_pollution_sustainable_development` | src_openstax_college_physics_2e_2022：Web §7.9 World Energy Use; renewable/nonrenewable resources, sustainability and environmental effects |
| 42 | 单摆周期规律 | `add_or_alias_concepts` | `pc_83cad2456d43a26f267261822a91d449` | `cn_sh_physics_simple_pendulum_period` | src_openstax_university_physics_v1_2016：Web §15.4 Pendulums |
| 43 | 受迫振动 | `add_or_alias_concepts` | `pc_17856051bac1b5be7b444701e14f24f2` | `cn_sh_physics_forced_vibration` | src_openstax_university_physics_v1_2016：Web §15.6 Forced Oscillations |
| 44 | 波的反射与折射 | `add_or_alias_concepts` | `pc_e2ba314d63487e951e37fee09f09b8f3`<br>`pc_baa60c957b8bd7b6c51f2aca82fea230` | `cn_sh_physics_wave_reflection_refraction` | src_openstax_university_physics_v1_2016：Web Chapter 16 Waves, §§16.4-16.6 boundary behaviour, interference and standing waves |
| 45 | 波的干涉与衍射 | `reuse_existing` | `pc_96e41b9ba6a6d60711d999b04e3ee970`<br>`pc_e7db3c8e907de6d7f3bef2c8cccc4eb1` | — | src_openstax_university_physics_v1_2016：Web §§16.5-16.6 Interference of Waves and Standing Waves and Resonance |
| 46 | 多普勒效应 | `add_or_alias_concepts` | `pc_8daa13d21dfd8cd7e4561012246f68cc` | `cn_sh_physics_doppler_effect` | src_openstax_university_physics_v1_2016：Web §17.7 The Doppler Effect |
| 47 | 光的折射定律 | `add_or_alias_concepts` | `pc_f2190132d4ec3c5684fa2dc0daf6888a` | `cn_sh_physics_light_refraction_law` | src_openstax_university_physics_v3_2016：Web §1.3 Refraction |
| 48 | 全反射及条件 | `add_or_alias_concepts` | `pc_9dac179aedcc728d49f421cb6908c6b2` | `cn_sh_physics_total_internal_reflection` | src_openstax_university_physics_v3_2016：Web §1.4 Total Internal Reflection |
| 49 | 光纤原理与应用 | `add_or_alias_concepts` | `pc_0db53597fda7cbb1ea2407af96cb265b` | `cn_sh_physics_optical_fibre` | src_openstax_university_physics_v3_2016：Web §1.4 Total Internal Reflection; optical-fibre applications |
| 50 | 光的偏振与横波性质 | `add_or_alias_concepts` | `pc_bcee2cb1e819542548c9098aefd73ff9` | `cn_sh_physics_light_polarisation` | src_openstax_university_physics_v3_2016：Web §1.7 Polarization |
| 51 | 激光特性与应用 | `add_or_alias_concepts` | `pc_787cb9a8a80843d1930816359c97c50b` | `cn_sh_physics_laser` | src_openstax_university_physics_v3_2016：Web §8.6 Lasers |
| 52 | 带电粒子在磁场中的运动 | `reuse_existing` | `pc_1ca0904b6ae91d6ca3fc8e304aaf7ed2`<br>`pc_564a46a0b8681d3ee2bfb13b78e2cbe0` | — | src_openstax_university_physics_v2_2016：Web §11.4 Motion of a Charged Particle in a Magnetic Field |
| 53 | 自感现象 | `add_or_alias_concepts` | `pc_4a30c7ba9271dd524cee1cb3e6bdab46` | `cn_sh_physics_self_induction` | src_openstax_university_physics_v2_2016：Web §14.2 Self-Inductance and Inductors |
| 54 | 涡流现象 | `add_or_alias_concepts` | `pc_79fbed1f3ffcc8b03c467c171390cf70` | `cn_sh_physics_eddy_currents` | src_openstax_university_physics_v2_2016：Web §13.6 Eddy Currents |
| 55 | 正弦交变电流 | `add_or_alias_concepts` | `pc_fd8661f816e736459ba628095958da85` | `cn_sh_physics_sinusoidal_ac` | src_openstax_university_physics_v2_2016：Web §§15.1-15.5 AC Sources and RLC Circuits |
| 56 | 远距离高压输电 | `add_or_alias_concepts` | `pc_78474e07c21918d091cc439beb2aaf1c`<br>`pc_da42cb6c0901bbe4b87a49172d5172ec` | `cn_sh_physics_high_voltage_transmission` | src_openstax_university_physics_v2_2016：Web §15.6 Transformers |
| 57 | 发电机与电动机能量转化 | `add_or_alias_concepts` | `pc_0fc2e0f1983ac1d525683f57221f0772` | `cn_sh_physics_generator_motor_energy` | src_openstax_university_physics_v2_2016：Web §§13.7-13.8 Electric Generators, Motors and Back EMF |
| 58 | 麦克斯韦电磁场理论初步 | `add_or_alias_concepts` | `pc_e08e0dd9c57cdbbcfd833bd336f4c744` | `cn_sh_physics_maxwell_field_theory` | src_openstax_university_physics_v2_2016：Web §16.1 Maxwell's Equations and Electromagnetic Waves |
| 59 | 电磁振荡 | `add_or_alias_concepts` | `pc_eb0a897ab926d93363953f80856adbcb` | `cn_sh_physics_electromagnetic_oscillation` | src_openstax_university_physics_v2_2016：Web §14.6 RLC Series Circuits; electromagnetic energy exchange |
| 60 | 电磁波的发射、传播与接收 | `add_or_alias_concepts` | `pc_ff3aafe811b49dfdca598b2667c1db93`<br>`pc_c52be7f06085dd048f1063059f6d8096` | `cn_sh_physics_em_wave_transmission` | src_openstax_university_physics_v2_2016：Web §§16.2-16.4 Plane Electromagnetic Waves, Energy and Momentum |
| 61 | 非电学量到电学量的转换 | `add_or_alias_concepts` | `pc_59edde8ba6869a6d649ea0bead7ef1d5`<br>`pc_b1b3332692ad44148b1cb42ff1c82dc3` | `cn_sh_physics_sensor_conversion` | src_openstax_university_physics_v2_2016：Web §10.4 Electrical Measuring Instruments; measurement conversion chain |
| 62 | 常见传感器工作原理 | `reuse_existing` | `pc_59edde8ba6869a6d649ea0bead7ef1d5`<br>`pc_1930b8c847023ca24d637697d9313a1f` | — | src_openstax_university_physics_v2_2016：Web §9.3 Resistivity and Resistance; thermistors and photoresistors; §10.2 potential-divider circuits |
| 63 | 传感器应用 | `add_or_alias_concepts` | `pc_59edde8ba6869a6d649ea0bead7ef1d5`<br>`pc_c69b42d81d603b1034a3c2bc057b5aaa` | `cn_sh_physics_sensor_applications` | src_openstax_university_physics_v3_2016：Web §§9.6-9.7 Semiconductors, Doping and Semiconductor Devices |
| 64 | 分子动理论及实验证据 | `add_or_alias_concepts` | `pc_4acc9b751e6be25c2980eb631eb901b0`<br>`pc_895b0802ab654d1e537de5624fc9f8bf` | `cn_sh_physics_molecular_kinetic_theory_evidence` | src_openstax_university_physics_v2_2016：Web §§2.1-2.3 Molecular Model, Pressure and Temperature in the Kinetic Theory of Gases |
| 65 | 扩散与布朗运动 | `add_or_alias_concepts` | `pc_4acc9b751e6be25c2980eb631eb901b0`<br>`pc_cb05fe82422660602c2d01c5c94d17df` | `cn_sh_physics_diffusion_brownian` | src_openstax_university_physics_v2_2016：Web §2.1 Molecular Model of an Ideal Gas; microscopic evidence for molecular motion |
| 66 | 分子运动速率分布 | `add_or_alias_concepts` | `pc_4acc9b751e6be25c2980eb631eb901b0`<br>`pc_5567ab4be147f7cd49dd73ae063fb3a8` | `cn_sh_physics_molecular_speed_distribution` | src_openstax_university_physics_v2_2016：Web §2.4 Distribution of Molecular Speeds |
| 67 | 晶体与非晶体 | `add_or_alias_concepts` | `pc_f2d5920b935fa1941ed8eea5a7ec98a1` | `cn_sh_physics_crystalline_amorphous` | src_openstax_university_physics_v3_2016：Web §9.3 Bonding in Crystalline Solids; amorphous-solid comparison |
| 68 | 液晶性质与应用 | `add_or_alias_concepts` | `pc_73a5664c023f0ccdea64ccd51f4a7e98` | `cn_sh_physics_liquid_crystals` | src_openstax_university_physics_v3_2016：Web §1.7 Polarization; Liquid Crystals and Other Polarization Effects in Materials |
| 69 | 半导体材料 | `add_or_alias_concepts` | `pc_314b37a6ddc248324fdf1ae9dd177b1b` | `cn_sh_physics_semiconductor_materials` | src_openstax_university_physics_v3_2016：Web §§9.5-9.7 Band Theory, Semiconductors and Semiconductor Devices |
| 70 | 纳米材料 | `add_or_alias_concepts` | `pc_50984ebc22df3740a780fe892474f3a0` | `cn_sh_physics_nanomaterials` | src_openstax_university_physics_v3_2016：Web §§6.6 and 7.6 Electron microscopy, nanotechnology and quantum tunnelling devices |
| 71 | 表面张力与毛细现象 | `add_or_alias_concepts` | `pc_8ebdca4ce1113ba75b3fc3bafb3f2ae0` | `cn_sh_physics_surface_tension_capillarity` | src_openstax_college_physics_2e_2022：Web §11.8 Cohesion and Adhesion in Liquids: Surface Tension and Capillary Action |
| 72 | 热力学第二定律 | `add_or_alias_concepts` | `pc_72fae358c1f9bb3f59ce7282cb5891f8` | `cn_sh_physics_second_law_thermodynamics` | src_openstax_university_physics_v2_2016：Web Chapter 4 The Second Law of Thermodynamics, §§4.1-4.7 |
| 73 | 原子核式结构模型 | `add_or_alias_concepts` | `pc_e180a73d3a69ee874db1ed7939a2c604` | `cn_sh_physics_atomic_nuclear_model` | src_openstax_university_physics_v3_2016：Web §6.4 Bohr's Model of the Hydrogen Atom; Rutherford nuclear model |
| 74 | 原子核组成与核力 | `add_or_alias_concepts` | `pc_e180a73d3a69ee874db1ed7939a2c604`<br>`pc_5a045330530d10a53c7a176f80e7a63f` | `cn_sh_physics_nuclear_composition_force` | src_openstax_university_physics_v3_2016：Web §§10.1-10.2 Properties of Nuclei and Nuclear Binding Energy |
| 75 | 四种基本相互作用 | `add_or_alias_concepts` | `pc_e83d1287ee15af0cbd8bbd3db36814e9` | `cn_sh_physics_fundamental_interactions` | src_openstax_university_physics_v3_2016：Web §11.1 Introduction to Particle Physics; fundamental interactions |
| 76 | 核反应方程 | `add_or_alias_concepts` | `pc_e180a73d3a69ee874db1ed7939a2c604`<br>`pc_918c5fb223d3bb0c98a102afd38c6cfb` | `cn_sh_physics_nuclear_reaction_equations` | src_openstax_university_physics_v3_2016：Web §10.4 Nuclear Reactions |
| 77 | 放射性同位素应用与射线防护 | `add_or_alias_concepts` | `pc_704f1cc8e86c80f5fc328baea2156ff3` | `cn_sh_physics_radioisotope_application_safety` | src_openstax_university_physics_v3_2016：Web §§10.3 and 10.7 Radioactive Decay; Medical Applications and Biological Effects |
| 78 | 实物粒子波动性与量子化 | `add_or_alias_concepts` | `pc_5214d7b845cac7c061ea53ff5618d522` | `cn_sh_physics_matter_waves_quantisation` | src_openstax_university_physics_v3_2016：Web §§6.5-6.6 De Broglie's Matter Waves and Wave-Particle Duality |

## 自动门禁

- 78 个 gap_id 必须各解析一次；121 个知识成果必须为 full，14 个实践成果必须为 excluded。
- 每个新图 Concept 必须同时有教育部页码证据和 OpenStax 精确章节证据。
- 每个 Topic 保持 2–3 个 Concept；先修边必须是 DAG 且含理由和证据。
- 所有本轮数据保持 needs_review，只有人工决定才能升级为 approved。
