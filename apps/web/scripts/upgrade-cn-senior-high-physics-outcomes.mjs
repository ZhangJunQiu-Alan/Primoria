#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const TODAY = "2026-07-19";
const SOURCE_ID = "src_cn_moe_senior_high_physics_2020";
const FRAMEWORK_ID = "cfw_cn_moe_senior_high_physics_2020_outcomes";
const CURRICULUM_ID = "cur_cn_moe_senior_high_physics_2020";
const paths = {
  framework: resolve(ROOT, "data/knowledge-graphs/curricula/frameworks/cn_moe_senior_high_physics_2020.json"),
  mapping: resolve(ROOT, "data/knowledge-graphs/curricula/mappings/pending/cn_moe_senior_high_physics_2020.json"),
  gaps: resolve(ROOT, "data/knowledge-graphs/curricula/gaps/pending/cn_moe_senior_high_physics_2020_outcomes.json"),
  practices: resolve(ROOT, "data/knowledge-graphs/pedagogy/practices/cn_moe_senior_high_physics_2020.json"),
};

const C = {
  displacement: "pc_b1d5952208604e883f66b4659242fea1",
  motionEquations: "pc_cee2843193f234b6e2ec3291ef31565c",
  motionGraphs: "pc_cc3a0693029e43a99012e87778407b3f",
  newton: "pc_b2063844cb1a96c55e14253c14719d9f",
  forceTypes: "pc_7a4b1f0c0833180c2f630c367c02cc0a",
  equilibrium: "pc_270019e3817b82fe7c7dac8eb6422dc1",
  hooke: "pc_37e89857c5223b0e022c1109441ccd39",
  work: "pc_a52c805e6ece9b48168340e9eb886aaf",
  kineticPotential: "pc_94622268081f1c4560a463b79eece9a8",
  energyConservation: "pc_16e60ad8536c19468a26bfce26abd36b",
  powerEfficiency: "pc_806d801e011ab24bec868b691726c944",
  projectiles: "pc_6127d5b7a479fb2563498a8b785982e6",
  angularSpeed: "pc_1cdef285fa4deb8906190252b2af65bb",
  centripetalAcceleration: "pc_3f0ccb62f5bbfadba05ddf6910d6a2b1",
  centripetalForce: "pc_564a46a0b8681d3ee2bfb13b78e2cbe0",
  gravitation: "pc_a5f4af08fa5b345a74638ec79495b81f",
  orbit: "pc_5ae39810b5a928dac2a4845e04b072bf",
  coulomb: "pc_f0a5eab16aacea4e38969075c8cb44f5",
  electricField: "pc_cf0a24f8dd938cdfcc8ea4466833fd4e",
  electricPotential: "pc_d5eb2984fe400640527611f8af20f25d",
  currentCharge: "pc_62a6d88e535c20e54fc65c369645f13d",
  pdEmf: "pc_2c6fac377de551f06f129beb0bd0767f",
  resistance: "pc_6a2c33585e2f59dc88ebd095503f1547",
  seriesParallel: "pc_bca889f92c123c04cec219d0a9311714",
  currentMagneticField: "pc_21210700d95c5fb054342d60854fa86a",
  magneticFluxDensity: "pc_9647bc019f27fd232ce00c144b507faa",
  magneticFlux: "pc_de2f2c2a673d0e9c8fcbca0343cc3a10",
  faraday: "pc_ef89f015bb0ebd4763d7cc0623222573",
  spectrum: "pc_ff3aafe811b49dfdca598b2667c1db93",
  photon: "pc_667d6af1c79afd71fbd2dedbccfcc217",
  momentum: "pc_1b1cfdc0850fea8f19cc8c2d58758e2c",
  momentumConservation: "pc_300e93cc3bff752aacf16632746d31d2",
  impulseCollision: "pc_7e101f9ad4ea81a7ec552eba2b48f745",
  shm: "pc_d392d3b9e47c3030f36d48d1130068da",
  resonance: "pc_ddddcd9c5533562635adc0202fd181f7",
  progressiveWaves: "pc_e2ba314d63487e951e37fee09f09b8f3",
  waveTypes: "pc_9c2707bdb1b3b76d6a27631d8d2b4ac9",
  superposition: "pc_96e41b9ba6a6d60711d999b04e3ee970",
  lightInterference: "pc_e63810d1054dbf432df743db7574fc27",
  diffraction: "pc_e7db3c8e907de6d7f3bef2c8cccc4eb1",
  ampereForce: "pc_295634d2bf2b6baea0ca509c07ee5143",
  lorentzForce: "pc_1ca0904b6ae91d6ca3fc8e304aaf7ed2",
  lenz: "pc_53b1902430dd730851cf421e4c339a79",
  transformer: "pc_78474e07c21918d091cc439beb2aaf1c",
  resistiveSensor: "pc_59edde8ba6869a6d649ea0bead7ef1d5",
  potentialDivider: "pc_1930b8c847023ca24d637697d9313a1f",
  kineticTheory: "pc_4acc9b751e6be25c2980eb631eb901b0",
  idealGas: "pc_5cccaa716cd0dc884949fd601339e85a",
  firstLaw: "pc_8bf886ad6cb9328616d017e223a93562",
  energyLevels: "pc_677afe173bf9a50c0abd70b650d0b052",
  nuclearStructure: "pc_e180a73d3a69ee874db1ed7939a2c604",
  bindingEnergy: "pc_9f2be083a041085b002a4e3208749f17",
  fissionFusion: "pc_45e557e295944b395f08bb30c4bb963e",
  decay: "pc_3e8b875dc1b24a5df264e9dc062a1087",
  halfLife: "pc_649a1d43ba4b608b73c82a3c774ad268",
  photoelectric: "pc_003acb7c39b07ad46c4076a4e11cb799",
  duality: "pc_5214d7b845cac7c061ea53ff5618d522",
};

const levels = {
  r1: { label: "Required 1", labelZh: "必修 1" },
  r2: { label: "Required 2", labelZh: "必修 2" },
  r3: { label: "Required 3", labelZh: "必修 3" },
  sr1: { label: "Selective Required 1", labelZh: "选择性必修 1" },
  sr2: { label: "Selective Required 2", labelZh: "选择性必修 2" },
  sr3: { label: "Selective Required 3", labelZh: "选择性必修 3" },
};
const outcomes = [];
function add(level, code, page, key, title, titleZh, summaryZh, canonicalIds = [], coverage = "unmapped", options = {}) {
  outcomes.push({ level, code, page, key, title, titleZh, summaryZh, canonicalIds, coverage, requirementType: options.requirementType ?? "skill", cognitive: options.cognitive ?? ["understand", "apply"], gapAction: options.gapAction });
}

add("r1", "1.1.1", 20, "experimental_science_history", "Rise of experimental science", "近代实验科学与物理学发展", "认识实验对近代物理学发展的推动作用，并能结合伽利略研究说明证据与方法的意义。", [], "excluded", { requirementType: "practice", cognitive: ["understand", "reason", "communicate"], gapAction: "not_knowledge_concept" });
add("r1", "1.1.2", 20, "particle_model", "Particle model and its conditions", "质点模型及适用条件", "经历质点模型建构，判断特定情境能否把物体抽象为质点，并解释模型的作用与边界。", [], "unmapped", { cognitive: ["model", "reason"] });
add("r1", "1.1.3", 20, "linear_kinematics", "Displacement, velocity, acceleration and uniformly accelerated motion", "位移、速度、加速度与匀变速直线运动", "用公式和图像描述匀变速直线运动，理解位移、速度和加速度并解决实际问题。", [C.displacement, C.motionEquations, C.motionGraphs], "full", { cognitive: ["understand", "apply", "analyze"] });
add("r1", "1.1.4", 21, "free_fall", "Free-fall motion", "自由落体运动", "理解自由落体的理想化条件和匀加速规律，并用运动方程分析简单情境。", [C.motionEquations], "partial", { cognitive: ["apply", "reason"] });
add("r1", "1.2.1", 21, "forces_friction_hooke", "Gravity, elasticity, friction and Hooke's law", "重力、弹力、摩擦力与胡克定律", "识别重力、弹力和静/滑动摩擦，使用动摩擦因数和胡克定律完成定量分析。", [C.forceTypes, C.hooke], "partial");
add("r1", "1.2.2", 21, "force_vectors_equilibrium", "Force composition, decomposition and equilibrium", "力的合成分解与共点力平衡", "区分矢量和标量，合成或分解力，并用共点力平衡条件分析实际问题。", [C.equilibrium], "partial", { cognitive: ["apply", "reason"] });
add("r1", "1.2.3", 22, "newton_laws_weightlessness", "Newton's laws, overweight and weightlessness", "牛顿运动定律、超重与失重", "实验探究加速度与力、质量的关系，使用牛顿运动定律解释运动，并分析超重和失重。", [C.newton], "partial", { cognitive: ["apply", "analyze"] });
add("r1", "1.2.4", 22, "si_mechanics_units", "SI mechanics units", "国际单位制中的力学单位", "使用国际单位制的力学基本和导出单位，并说明一致单位制的重要性。", [], "unmapped");

add("r2", "2.1.1", 23, "work_power", "Work and power", "功与功率", "理解功和功率，处理力与位移不共线及恒功率机械等实际情境。", [C.work, C.powerEfficiency], "full");
add("r2", "2.1.2", 23, "kinetic_energy_theorem", "Kinetic energy theorem", "动能与动能定理", "理解动能和动能定理，并用动能定理解释或解决生产生活现象。", [C.kineticPotential], "partial", { cognitive: ["apply", "reason"] });
add("r2", "2.1.3", 23, "gravitational_potential", "Gravitational and elastic potential energy", "重力势能与弹性势能", "联系重力做功与重力势能变化，并定性理解弹性势能。", [C.kineticPotential], "partial");
add("r2", "2.1.4", 24, "mechanical_energy_conservation", "Conservation of mechanical energy", "机械能守恒定律", "通过实验验证并理解机械能守恒，使用守恒定律分析实际问题。", [C.energyConservation], "full", { cognitive: ["apply", "reason"] });
add("r2", "2.2.1", 24, "curvilinear_motion_condition", "Curvilinear motion and its condition", "曲线运动及发生条件", "判断物体发生曲线运动时合力与速度的方向关系，并解释轨迹弯曲的条件。", [], "unmapped");
add("r2", "2.2.2", 24, "projectile_motion", "Projectile motion", "平抛与抛体运动", "用运动合成与分解分析平抛和一般抛体运动规律并解决实际问题。", [C.projectiles], "full");
add("r2", "2.2.3", 24, "uniform_circular_motion", "Uniform circular motion", "匀速圆周运动", "使用线速度、角速度和周期描述圆周运动，分析向心加速度、向心力与离心现象。", [C.angularSpeed, C.centripetalAcceleration, C.centripetalForce], "full");
add("r2", "2.2.4", 24, "universal_gravitation", "Law of universal gravitation", "万有引力定律", "理解万有引力定律及其发现意义，并用统一性观念解释天体相互作用。", [C.gravitation], "full");
add("r2", "2.2.5", 25, "satellite_cosmic_velocities", "Satellite orbital and cosmic velocities", "卫星环绕速度与宇宙速度", "计算人造地球卫星环绕速度，并区分第二和第三宇宙速度。", [C.orbit], "partial");
add("r2", "2.3.1", 25, "newtonian_limits", "Limits of Newtonian mechanics", "牛顿力学的局限性", "说明牛顿力学的适用范围和局限，认识物理理论会随证据和尺度拓展。", [], "unmapped", { cognitive: ["understand", "evaluate"] });
add("r2", "2.3.2", 25, "relativistic_spacetime", "Introductory relativistic spacetime", "相对论时空观初步", "初步理解相对论时空观，包括长度收缩、时间延缓及时空弯曲的定性含义。", [], "unmapped");
add("r2", "2.3.3", 25, "cosmic_evolution", "Origin and evolution of the universe", "宇宙起源与演化", "概述宇宙起源和演化研究的主要证据，并说明典型恒星演化过程。", [], "unmapped");

add("r3", "3.1.1", 27, "electrostatic_charge_conservation", "Electrostatic phenomena and charge conservation", "静电现象与电荷守恒", "用原子结构模型和电荷守恒分析摩擦起电、接触起电与静电感应。", [C.currentCharge], "partial");
add("r3", "3.1.2", 27, "point_charge_coulomb", "Point-charge model and Coulomb's law", "点电荷模型与库仑定律", "判断何时可使用点电荷模型，并用点电荷相互作用规律分析静电力。", [C.coulomb], "partial");
add("r3", "3.1.3", 27, "electric_field_lines", "Electric field strength and field lines", "电场强度与电场线", "理解电场物质性和电场强度，用电场线描述典型电场。", [C.electricField], "partial");
add("r3", "3.1.4", 27, "electrostatic_applications", "Electrostatic applications and protection", "静电利用与防护", "解释静电除尘、喷雾、打印等应用并分析可燃粉尘环境的静电防护。", [], "unmapped");
add("r3", "3.1.5", 28, "electric_potential_motion", "Electric potential and charged-particle motion", "电势、电势差与带电粒子运动", "理解电势能、电势和电势差，使用匀强电场关系并分析带电粒子运动。", [C.electricPotential, C.electricField], "partial");
add("r3", "3.1.6", 28, "capacitors", "Capacitance, charging and discharging", "电容器、电容与充放电", "理解电容器和电容，观察充放电过程并解释典型应用。", [], "unmapped");
add("r3", "3.2.1", 28, "circuit_components_multimeter", "Circuit components and multimeter use", "电路元件与多用电表", "识别常见电路元件及其作用，并规范使用多用电表。", [], "unmapped", { cognitive: ["understand", "apply"] });
add("r3", "3.2.2", 28, "resistivity_measurement", "Resistance factors and resistivity measurement", "电阻影响因素与电阻率测量", "实验探究电阻与材料、长度、横截面积的关系，利用 I-U 图像并测量电阻率。", [C.resistance], "partial", { cognitive: ["apply", "analyze"] });
add("r3", "3.2.3", 28, "series_parallel_resistance", "Series and parallel resistance", "串并联电阻", "分析串、并联电路的等效电阻特点。", [C.seriesParallel], "full");
add("r3", "3.2.4", 28, "closed_circuit_ohm", "Closed-circuit Ohm's law", "闭合电路欧姆定律", "理解闭合电路欧姆定律，并用实验测量电源电动势和内阻。", [C.pdEmf, C.resistance], "partial");
add("r3", "3.2.5", 28, "electrical_work_joule", "Electrical work, power and Joule's law", "电功、电功率与焦耳定律", "计算电功与电功率，用焦耳定律解释电热现象。", [], "unmapped");
add("r3", "3.2.6", 29, "household_electricity_safety", "Household circuits and electrical safety", "家庭电路与安全节约用电", "分析家庭电路中的简单问题，把安全和节约用电原则应用于实际。", [], "unmapped");
add("r3", "3.3.1", 29, "magnetism_applications_history", "Magnetic applications and historical contributions", "磁现象应用与历史贡献", "列举磁现象的典型应用，说明中国古代磁学成果及其与现代磁技术的联系。", [], "unmapped");
add("r3", "3.3.2", 29, "magnetic_field_lines", "Magnetic flux density and field lines", "磁感应强度与磁感线", "理解磁场和磁感应强度，并用磁感线描述电流周围的典型磁场。", [C.currentMagneticField, C.magneticFluxDensity], "partial");
add("r3", "3.3.3", 29, "induction_conditions", "Magnetic flux and induction conditions", "磁通量与电磁感应条件", "理解磁通量，实验判断产生感应电流的条件并说明电磁感应应用。", [C.magneticFlux, C.faraday], "partial");
add("r3", "3.3.4", 30, "electromagnetic_field_waves", "Electromagnetic waves and field materiality", "电磁波与电磁场物质性", "说明电磁波由变化的电场和磁场传播，并解释电磁场具有物质性的含义。", [C.spectrum], "partial");
add("r3", "3.3.5", 30, "electromagnetic_wave_applications", "Electromagnetic-wave applications", "电磁波应用与影响", "解释通信等电磁波应用并评价其社会影响。", [C.spectrum], "partial");
add("r3", "3.3.6", 30, "light_quantisation", "Light as an electromagnetic wave and energy quantisation", "光的电磁本性与能量量子化", "说明光是电磁波且光能不连续，初步认识微观世界的量子化。", [C.spectrum, C.photon], "partial");
add("r3", "3.4.1", 30, "energy_sources_nuclear", "Water, wind, solar and nuclear energy", "水能、风能、太阳能与核能利用", "说明水能、风能、太阳能和核能的利用方式，并初步区分核裂变与核聚变。", [C.fissionFusion], "partial");
add("r3", "3.4.2", 30, "energy_conversion_direction", "Energy conversion, conservation and directionality", "能量转化、守恒与方向性", "说明能量形式可转换且总量守恒，并理解能量转化具有方向性。", [C.energyConservation], "partial");
add("r3", "3.4.3", 30, "renewable_environment", "Renewable energy and environmental impact", "可再生能源与环境影响", "分类可再生和不可再生能源，分析能源过度开发利用对环境的影响。", [], "unmapped");
add("r3", "3.4.4", 30, "pollution_sustainable_development", "Pollution and coordinated sustainable development", "污染防治与协调发展", "认识环境污染危害，说明科学、技术、社会与环境协调发展的重要性。", [], "unmapped", { cognitive: ["analyze", "evaluate", "communicate"] });

add("sr1", "1.1.1", 33, "impulse_momentum_conservation", "Impulse, momentum and conservation", "冲量、动量与动量守恒", "理解冲量、动量、动量定理和动量守恒，并用一维模型解决实际问题。", [C.momentum, C.momentumConservation, C.impulseCollision], "full");
add("sr1", "1.1.2", 33, "elastic_inelastic_collisions", "Elastic and inelastic collisions", "弹性与非弹性碰撞", "实验区分弹性与非弹性碰撞，并定量分析一维碰撞。", [C.impulseCollision, C.momentumConservation], "full");
add("sr1", "1.1.3", 33, "conservation_reasoning", "Reasoning with conservation laws", "用守恒定律分析问题", "比较守恒视角与其他方法，体会守恒定律在物理推理中的统一作用。", [], "excluded", { requirementType: "practice", cognitive: ["reason", "evaluate"], gapAction: "not_knowledge_concept" });
add("sr1", "1.2.1", 34, "simple_harmonic_motion", "Simple harmonic motion", "简谐运动", "实验认识简谐运动特征，并用公式和图像描述。", [C.shm], "full");
add("sr1", "1.2.2", 34, "simple_pendulum", "Simple-pendulum period and measuring g", "单摆周期与测量重力加速度", "实验探究单摆周期与摆长、重力加速度的关系，并用单摆测量 g。", [], "unmapped");
add("sr1", "1.2.3", 34, "forced_vibration_resonance", "Forced vibration and resonance", "受迫振动与共振", "实验认识受迫振动，判断共振条件并解释利用或防止共振的实例。", [C.resonance], "partial");
add("sr1", "1.2.4", 34, "mechanical_wave_description", "Mechanical-wave description", "机械波特征与描述", "区分横波和纵波，用图像描述横波并使用波速、波长与频率关系。", [C.progressiveWaves, C.waveTypes], "full");
add("sr1", "1.2.5", 34, "wave_behaviours", "Wave reflection, refraction, interference and diffraction", "波的反射、折射、干涉与衍射", "识别波的反射和折射，实验观察干涉与衍射。", [C.superposition, C.diffraction], "partial");
add("sr1", "1.2.6", 34, "doppler_effect", "Doppler effect", "多普勒效应", "解释多普勒效应的产生原因，并判断相对运动对接收频率的影响和典型应用。", [], "unmapped");
add("sr1", "1.3.1", 34, "light_refraction", "Law of refraction and refractive index", "光的折射定律与折射率", "实验理解光的折射定律并测量材料折射率。", [], "unmapped");
add("sr1", "1.3.2", 35, "total_internal_reflection", "Total internal reflection and optical fibres", "全反射与光纤", "判断全反射条件并解释光纤工作原理和应用。", [], "unmapped");
add("sr1", "1.3.3", 35, "light_wave_phenomena", "Light interference, diffraction and polarisation", "光的干涉、衍射与偏振", "观察干涉、衍射和偏振，说明光是横波并用双缝干涉测量波长。", [C.lightInterference, C.diffraction], "partial");
add("sr1", "1.3.4", 35, "laser", "Laser properties and applications", "激光特性与应用", "说明激光的单色性、方向性等主要特征及其技术应用。", [], "unmapped");

add("sr2", "2.1.1", 37, "ampere_force", "Ampere force", "安培力", "实验认识安培力，判断方向、计算大小并解释应用。", [C.ampereForce], "full");
add("sr2", "2.1.2", 37, "lorentz_force", "Lorentz force", "洛伦兹力", "实验认识洛伦兹力，判断方向并计算大小。", [C.lorentzForce], "full");
add("sr2", "2.1.3", 37, "charged_particle_magnetic_motion", "Charged-particle motion in a magnetic field", "带电粒子在磁场中的运动", "用洛伦兹力分析匀强磁场中的圆周运动和偏转，并解释质谱仪或回旋加速器。", [C.lorentzForce, C.centripetalForce], "partial");
add("sr2", "2.2.1", 37, "lenz_law", "Lenz's law", "楞次定律", "实验探究感应电流方向因素，理解并用能量观点解释楞次定律。", [C.lenz], "full");
add("sr2", "2.2.2", 37, "faraday_law", "Faraday's law", "法拉第电磁感应定律", "通过实验理解法拉第电磁感应定律并用于定量分析。", [C.faraday], "full");
add("sr2", "2.2.3", 38, "self_induction_eddy", "Self-induction and eddy currents", "自感与涡流", "实验认识自感和涡流，解释其生产生活应用。", [], "unmapped");
add("sr2", "2.2.4", 38, "sinusoidal_ac", "Sinusoidal alternating current", "正弦交变电流", "用公式和图像描述正弦交流，并区分瞬时值、峰值和有效值。", [], "unmapped");
add("sr2", "2.2.5", 38, "transformer_transmission", "Transformers and high-voltage transmission", "变压器与高压输电", "实验探究电压与匝数关系，解释远距离高压输电减少损耗的原因。", [C.transformer], "partial");
add("sr2", "2.2.6", 38, "generator_motor_energy", "Generator and motor energy conversion", "发电机与电动机能量转化", "说明发电机和电动机工作过程中的能量转化及其社会作用。", [], "unmapped");
add("sr2", "2.3.1", 38, "maxwell_field_theory", "Introductory Maxwell electromagnetic-field theory", "麦克斯韦电磁场理论初步", "初步理解麦克斯韦电磁场理论、场的统一性和多样性。", [], "unmapped");
add("sr2", "2.3.2", 38, "electromagnetic_oscillation", "Electromagnetic oscillation", "电磁振荡", "描述电磁振荡中电场能与磁场能的周期性转换过程。", [], "unmapped");
add("sr2", "2.3.3", 38, "em_wave_transmission", "Emission, propagation and reception of electromagnetic waves", "电磁波的发射、传播与接收", "说明电磁波发射、传播和接收的基本过程。", [C.spectrum], "partial");
add("sr2", "2.3.4", 39, "electromagnetic_spectrum", "Electromagnetic spectrum", "电磁波谱", "识别各波段名称、特征和典型应用。", [C.spectrum], "full");
add("sr2", "2.4.1", 39, "sensor_conversion", "Conversion of non-electrical to electrical quantities", "非电学量到电学量的转换", "说明把非电学量转换为电学量的技术意义和测量链路。", [C.resistiveSensor], "partial");
add("sr2", "2.4.2", 39, "sensor_control", "Sensor principles and automatic control", "传感器原理与自动控制", "实验理解常见传感器，并利用传感器制作简单自动控制装置。", [C.resistiveSensor, C.potentialDivider], "partial");
add("sr2", "2.4.3", 39, "sensor_applications", "Sensor applications", "传感器应用", "列举并解释传感器在生产生活中的应用。", [C.resistiveSensor], "partial");

add("sr3", "3.1.1", 41, "molecular_size_theory", "Molecular size and kinetic theory", "分子大小与分子动理论", "用油膜法估测分子大小，并理解分子动理论基本观点及证据。", [C.kineticTheory], "partial");
add("sr3", "3.1.2", 41, "diffusion_brownian_distribution", "Diffusion, Brownian motion and speed distribution", "扩散、布朗运动与分子速率分布", "实验认识扩散和布朗运动，解释分子速率分布图像的统计意义。", [C.kineticTheory], "partial");
add("sr3", "3.1.3", 41, "solid_liquid_crystal", "Crystals, amorphous solids and liquid crystals", "晶体、非晶体与液晶", "比较晶体和非晶体微观结构与性质，说明液晶特性和显示应用。", [], "unmapped");
add("sr3", "3.1.4", 41, "materials_science", "Materials science and applications", "材料科学及应用", "说明半导体、纳米材料等材料特点、应用及潜在影响。", [], "unmapped");
add("sr3", "3.1.5", 42, "surface_tension_capillarity", "Surface tension and capillarity", "表面张力与毛细现象", "解释表面张力的微观原因，并判断浸润、非浸润和毛细现象。", [], "unmapped");
add("sr3", "3.1.6", 42, "gas_laws_ideal_model", "Gas laws and ideal-gas model", "气体实验定律与理想气体模型", "实验理解气体定律，用理想气体模型、分子动理论和统计观点解释压强。", [C.kineticTheory, C.idealGas], "full");
add("sr3", "3.2.1", 42, "first_law_thermodynamics", "First law of thermodynamics", "热力学第一定律", "理解热力学第一定律并联系能量守恒发现史。", [C.firstLaw], "full");
add("sr3", "3.2.2", 42, "general_energy_conservation", "General law of energy conservation", "能量守恒定律", "用能量守恒解释自然现象并说明其普遍性。", [C.energyConservation], "full");
add("sr3", "3.2.3", 42, "second_law_thermodynamics", "Second law of thermodynamics", "热力学第二定律", "由宏观过程方向性理解热力学第二定律并判断永动机不可能性。", [], "unmapped");
add("sr3", "3.3.1", 43, "atomic_models_energy_levels", "Atomic models and energy levels", "原子模型与能级", "概述原子结构探索史，理解核式结构模型和氢原子能级。", [C.energyLevels, C.nuclearStructure], "partial");
add("sr3", "3.3.2", 43, "nucleus_forces_reactions", "Nuclear composition, forces and reaction equations", "原子核组成、相互作用与核反应方程", "理解原子核组成、核力和四种基本相互作用，并按守恒写核反应方程。", [C.nuclearStructure], "partial");
add("sr3", "3.3.3", 43, "radioactivity_half_life", "Radioactivity, decay and half-life", "放射性、衰变与半衰期", "解释原子核衰变和半衰期统计意义，说明同位素应用与射线防护。", [C.decay, C.halfLife], "partial");
add("sr3", "3.3.4", 43, "binding_fission_fusion", "Binding energy, fission and fusion", "结合能、裂变与聚变", "理解结合能，区分裂变与聚变并评价核技术影响。", [C.bindingEnergy, C.fissionFusion], "full");
add("sr3", "3.3.5", 43, "matter_exploration_history", "History of exploring matter structure", "物质结构探索历程", "梳理人类探索物质结构的证据、仪器与模型演进。", [], "excluded", { requirementType: "practice", cognitive: ["understand", "reason", "communicate"], gapAction: "not_knowledge_concept" });
add("sr3", "3.4.1", 43, "photoelectric_duality", "Photoelectric effect and light duality", "光电效应与光的波粒二象性", "实验认识光电效应，使用爱因斯坦方程并据实验证据说明光的波粒二象性。", [C.photoelectric, C.photon, C.duality], "full");
add("sr3", "3.4.2", 43, "matter_waves_quantisation", "Matter waves and quantisation", "实物粒子波动性与量子化", "说明实物粒子具有波动性，并联系电子衍射理解微观世界量子化。", [C.duality], "partial");

if (outcomes.length !== 87) throw new Error(`Expected 87 physics content requirements, got ${outcomes.length}`);
const split = (suffix, key, title, titleZh, summaryZh, canonicalIds = [], coverage = "unmapped", options = {}) => ({ suffix, key, title, titleZh, summaryZh, canonicalIds, coverage, requirementType: options.requirementType ?? "skill", cognitive: options.cognitive ?? ["understand", "apply"], gapAction: options.gapAction });
const SPLITS = {
  "r1:1.1.3": [
    split("a", "kinematic_quantities", "Displacement, velocity and acceleration", "位移、速度与加速度", "理解位移、速度和加速度并区分其方向、瞬时含义和变化关系。", [C.displacement], "full"),
    split("b", "uniform_acceleration_representation", "Uniformly accelerated rectilinear motion", "匀变速直线运动规律与表示", "用公式和图像描述匀变速直线运动并解决实际问题。", [C.motionEquations, C.motionGraphs], "full"),
    split("c", "investigate_uniform_acceleration", "Investigating uniformly accelerated motion", "实验探究匀变速直线运动", "选择计时与位置测量工具，处理数据并检验匀变速直线运动规律。", [], "excluded", { requirementType: "practice", cognitive: ["apply", "analyze", "communicate"], gapAction: "not_knowledge_concept" }),
  ],
  "r1:1.2.1": [
    split("a", "gravity_elastic_force", "Gravity and elastic force", "重力与弹力", "识别重力和弹力，判断方向并分析常见接触约束。", [C.forceTypes], "partial"),
    split("b", "hooke_law", "Hooke's law", "胡克定律", "理解弹性限度内弹力与形变量的定量关系，并解释弹簧测力计等应用。", [C.hooke], "full"),
    split("c", "friction", "Static and kinetic friction", "静摩擦与滑动摩擦", "区分静摩擦与滑动摩擦并用动摩擦因数计算滑动摩擦力。", [C.forceTypes], "partial"),
  ],
  "r1:1.2.2": [
    split("a", "force_composition_vectors", "Force composition and decomposition", "力的合成分解与矢量", "区分矢量和标量，用平行四边形法则合成或分解力。", [], "unmapped"),
    split("b", "concurrent_force_equilibrium", "Equilibrium of concurrent forces", "共点力平衡", "用共点力平衡条件分析生产生活问题。", [C.equilibrium], "full"),
  ],
  "r1:1.2.3": [
    split("a", "investigate_newton_second", "Investigating acceleration, force and mass", "实验探究加速度、力与质量关系", "用控制变量实验获取并分析加速度、受力和质量数据。", [], "excluded", { requirementType: "practice", cognitive: ["apply", "analyze", "communicate"], gapAction: "not_knowledge_concept" }),
    split("b", "newton_laws", "Newton's laws of motion", "牛顿运动定律", "理解并使用牛顿运动定律解释现象和解决动力学问题。", [C.newton], "full"),
    split("c", "overweight_weightlessness", "Overweight and weightlessness", "超重与失重", "分析支持力变化并解释超重、失重和完全失重情境。", [C.newton], "partial"),
  ],
  "r2:2.1.1": [
    split("a", "work", "Work done by a force", "力做功", "计算恒力做功并处理力与位移不共线的情形。", [C.work], "full"),
    split("b", "power", "Power", "功率", "理解功率并分析恒功率机械中牵引力与速度的关系。", [C.powerEfficiency], "full"),
  ],
  "r2:2.1.3": [
    split("a", "gravitational_potential_energy", "Gravitational potential energy", "重力势能", "联系重力做功与重力势能变化，选择参考零势能面。", [C.kineticPotential], "partial"),
    split("b", "elastic_potential_energy", "Elastic potential energy", "弹性势能", "定性理解弹性势能及其与形变量的关系。", [C.kineticPotential], "partial"),
  ],
  "r2:2.1.4": [
    split("a", "mechanical_energy_conservation", "Conservation of mechanical energy", "机械能守恒定律", "判断机械能守恒条件并用守恒定律分析实际问题。", [C.energyConservation], "full"),
    split("b", "verify_mechanical_energy", "Verifying conservation of mechanical energy", "实验验证机械能守恒", "设计测量、处理动能和势能数据，并评价机械能守恒实验误差。", [], "excluded", { requirementType: "practice", cognitive: ["apply", "analyze", "evaluate"], gapAction: "not_knowledge_concept" }),
  ],
  "r2:2.2.3": [
    split("a", "circular_kinematics", "Kinematics of uniform circular motion", "匀速圆周运动的运动学量", "使用线速度、角速度和周期描述匀速圆周运动。", [C.angularSpeed, C.centripetalAcceleration], "full"),
    split("b", "centripetal_dynamics", "Centripetal-force dynamics", "向心力动力学", "理解向心力与质量、半径、角速度的关系并用牛顿第二定律分析。", [C.centripetalForce, C.newton], "full"),
    split("c", "centrifugal_phenomena", "Centrifugal phenomena and applications", "离心现象及应用", "从惯性和向心力不足解释生产生活中的离心现象。", [C.centripetalForce], "partial"),
  ],
  "r2:2.2.5": [
    split("a", "satellite_orbital_speed", "Satellite orbital speed", "人造地球卫星环绕速度", "由万有引力提供向心力计算圆轨道卫星环绕速度。", [C.orbit, C.gravitation], "full"),
    split("b", "cosmic_velocities", "Second and third cosmic velocities", "第二与第三宇宙速度", "区分第二和第三宇宙速度及其物理意义。", [C.orbit], "partial"),
  ],
  "r3:3.1.2": [
    split("a", "point_charge_model", "Point-charge model", "点电荷模型", "判断带电体可被抽象为点电荷的条件和模型边界。", [], "unmapped", { cognitive: ["model", "reason"] }),
    split("b", "coulomb_law", "Coulomb's law", "库仑定律", "使用点电荷相互作用规律计算静电力并说明适用条件。", [C.coulomb], "full"),
  ],
  "r3:3.1.3": [
    split("a", "electric_field_strength", "Electric field strength", "电场强度", "理解电场物质性和电场强度的比值定义。", [C.electricField], "full"),
    split("b", "electric_field_lines", "Electric field-line model", "电场线模型", "用电场线描述典型电场并解释疏密和方向含义。", [C.electricField], "partial", { cognitive: ["model", "reason"] }),
  ],
  "r3:3.1.5": [
    split("a", "electric_potential_quantities", "Electric potential energy, potential and potential difference", "电势能、电势与电势差", "理解静电场中的电势能、电势和电势差，并使用匀强电场强度关系。", [C.electricPotential, C.electricField], "partial"),
    split("b", "charged_particle_electric_motion", "Charged-particle motion in electric fields", "带电粒子在电场中的运动", "分析带电粒子在匀强电场中的受力、运动和能量变化。", [C.electricField, C.newton], "partial"),
  ],
  "r3:3.1.6": [
    split("a", "capacitance", "Capacitors and capacitance", "电容器与电容", "识别常见电容器并理解电容表示储存电荷能力。", [], "unmapped"),
    split("b", "capacitor_charge_discharge", "Capacitor charging, discharging and applications", "电容器充放电与应用", "描述电容器充放电过程中电荷、电流和电压的变化，并解释闪光灯等应用。", [], "unmapped"),
  ],
  "r3:3.2.1": [
    split("a", "circuit_components", "Circuit components and functions", "电路元件及作用", "识别常见电路元件并解释其在电路中的作用。", [], "unmapped"),
    split("b", "multimeter_use", "Using a multimeter", "使用多用电表", "选择量程和接线方式，规范使用多用电表并读取测量结果。", [], "excluded", { requirementType: "practice", cognitive: ["apply", "evaluate"], gapAction: "not_knowledge_concept" }),
  ],
  "r3:3.2.2": [
    split("a", "resistance_geometry_material", "Resistance, geometry and material", "电阻与材料、长度和横截面积", "理解金属导体电阻与材料、长度和横截面积的定量关系，并解释 I-U 特性。", [C.resistance], "partial"),
    split("b", "measure_resistivity", "Measuring resistivity", "测量金属丝电阻率", "设计并实施电阻率测量，处理长度、截面积、电压和电流数据。", [], "excluded", { requirementType: "practice", cognitive: ["apply", "analyze", "communicate"], gapAction: "not_knowledge_concept" }),
  ],
  "r3:3.2.4": [
    split("a", "closed_circuit_ohm", "Closed-circuit Ohm's law", "闭合电路欧姆定律", "理解端电压、电动势、内阻和电流的关系并分析闭合电路。", [C.pdEmf, C.resistance], "partial"),
    split("b", "measure_emf_internal_resistance", "Measuring source EMF and internal resistance", "测量电源电动势和内阻", "通过端电压—电流数据和图像测量电源电动势与内阻。", [], "excluded", { requirementType: "practice", cognitive: ["apply", "analyze"], gapAction: "not_knowledge_concept" }),
  ],
  "r3:3.2.5": [
    split("a", "electrical_work_power", "Electrical work and power", "电功与电功率", "计算电功、电功率和用电量并解释额定量。", [], "unmapped"),
    split("b", "joule_law", "Joule's law", "焦耳定律", "使用焦耳定律计算电热并解释电热现象。", [], "unmapped"),
  ],
  "r3:3.3.3": [
    split("a", "magnetic_flux", "Magnetic flux", "磁通量", "理解磁通量及其与磁场、面积和取向的关系。", [C.magneticFlux], "full"),
    split("b", "induction_conditions", "Conditions for induced current", "产生感应电流的条件", "判断闭合回路磁通量变化与感应电流产生的关系，并说明典型应用。", [C.faraday], "partial"),
  ],
  "r3:3.3.6": [
    split("a", "light_electromagnetic_wave", "Light as an electromagnetic wave", "光的电磁本性", "说明光属于电磁波谱并联系电磁波特征。", [C.spectrum], "full"),
    split("b", "light_energy_quantisation", "Quantisation of light energy", "光能量不连续与量子化", "说明光能量不连续并初步解释微观世界量子化。", [C.photon], "partial"),
  ],
  "r3:3.4.1": [
    split("a", "renewable_energy_technologies", "Water, wind and solar energy technologies", "水能、风能与太阳能利用", "说明水能、风能和太阳能转化为可用能源的基本方式。", [], "unmapped"),
    split("b", "nuclear_energy_intro", "Introductory nuclear energy", "核能利用初步", "初步区分核裂变与核聚变释放能量的方式。", [C.fissionFusion], "partial"),
  ],
  "r3:3.4.2": [
    split("a", "energy_conversion_conservation", "Energy conversion and conservation", "能量转化与守恒", "说明能量形式可相互转化且总量守恒。", [C.energyConservation], "full"),
    split("b", "energy_conversion_directionality", "Directionality of energy conversion", "能量转化的方向性", "解释实际能量转化的方向性和可用能品质变化。", [], "unmapped"),
  ],
  "sr1:1.1.1": [
    split("a", "impulse_momentum_theorem", "Impulse, momentum and momentum theorem", "冲量、动量与动量定理", "理解冲量和动量，并从理论与实验联系动量定理和牛顿第二定律。", [C.momentum, C.impulseCollision], "full"),
    split("b", "momentum_conservation", "Conservation of momentum", "动量守恒定律", "判断系统动量守恒条件并解决一维问题。", [C.momentumConservation], "full"),
  ],
  "sr1:1.2.2": [
    split("a", "simple_pendulum_period", "Simple-pendulum period", "单摆周期规律", "理解单摆周期与摆长、重力加速度的定量关系。", [], "unmapped"),
    split("b", "measure_g_pendulum", "Measuring g with a pendulum", "用单摆测量重力加速度", "设计单摆实验、处理周期和摆长数据并评价误差。", [], "excluded", { requirementType: "practice", cognitive: ["apply", "analyze", "evaluate"], gapAction: "not_knowledge_concept" }),
  ],
  "sr1:1.2.3": [
    split("a", "forced_vibration", "Forced vibration", "受迫振动", "理解受迫振动及稳态振动频率与驱动力频率的关系。", [], "unmapped"),
    split("b", "resonance", "Resonance", "共振", "判断共振条件并解释利用或防止共振的实例。", [C.resonance], "full"),
  ],
  "sr1:1.2.4": [
    split("a", "wave_types_graphs", "Transverse and longitudinal waves", "横波、纵波与波形图", "区分横波和纵波并用图像描述横波。", [C.waveTypes], "full"),
    split("b", "wave_speed_relation", "Wave speed, wavelength and frequency", "波速、波长与频率", "理解并使用波速、波长和频率关系。", [C.progressiveWaves], "full"),
  ],
  "sr1:1.2.5": [
    split("a", "wave_reflection_refraction", "Wave reflection and refraction", "波的反射与折射", "识别并解释波的反射和折射现象。", [C.progressiveWaves], "partial"),
    split("b", "wave_interference_diffraction", "Wave interference and diffraction", "波的干涉与衍射", "识别波的干涉与衍射条件，并用叠加原理解释典型图样。", [C.superposition, C.diffraction], "partial"),
  ],
  "sr1:1.3.1": [
    split("a", "light_refraction_law", "Law of refraction", "光的折射定律", "理解并使用光的折射定律。", [], "unmapped"),
    split("b", "measure_refractive_index", "Measuring refractive index", "测量材料折射率", "设计光路、测量入射角和折射角并求材料折射率。", [], "excluded", { requirementType: "practice", cognitive: ["apply", "analyze"], gapAction: "not_knowledge_concept" }),
  ],
  "sr1:1.3.2": [
    split("a", "total_internal_reflection", "Total internal reflection", "全反射及条件", "判断全反射发生条件并计算或比较临界角。", [], "unmapped"),
    split("b", "optical_fibre", "Optical-fibre principle and applications", "光纤原理与应用", "用全反射解释光纤工作原理和生产生活应用。", [], "unmapped"),
  ],
  "sr1:1.3.3": [
    split("a", "light_interference_diffraction", "Light interference and diffraction", "光的干涉与衍射", "观察干涉和衍射图样并用其论证光的波动性。", [C.lightInterference, C.diffraction], "full"),
    split("b", "light_polarisation", "Polarisation and transverse nature of light", "光的偏振与横波性质", "解释偏振现象，并据此说明光是横波。", [], "unmapped"),
    split("c", "double_slit_wavelength", "Measuring wavelength by double-slit interference", "用双缝干涉测量光波长", "测量条纹间距和装置参数并计算光波长、评价误差。", [], "excluded", { requirementType: "practice", cognitive: ["apply", "analyze", "communicate"], gapAction: "not_knowledge_concept" }),
  ],
  "sr2:2.2.3": [
    split("a", "self_induction", "Self-induction", "自感现象", "解释自感电动势对电流变化的阻碍作用及典型应用。", [], "unmapped"),
    split("b", "eddy_currents", "Eddy currents", "涡流现象", "解释涡流的形成条件及其在电磁炉、阻尼等装置中的作用。", [], "unmapped"),
  ],
  "sr2:2.2.5": [
    split("a", "transformer", "Transformer voltage and turns ratio", "变压器电压与匝数关系", "理解并使用理想变压器原副线圈电压与匝数关系。", [C.transformer], "full"),
    split("b", "high_voltage_transmission", "High-voltage power transmission", "远距离高压输电", "分析输电损耗因素并解释采用高压输电的原因。", [C.transformer], "partial"),
  ],
  "sr2:2.4.2": [
    split("a", "sensor_principles", "Principles of common sensors", "常见传感器工作原理", "解释热敏、光敏等常见传感器把非电学量转换为电学量的原理。", [C.resistiveSensor, C.potentialDivider], "partial"),
    split("b", "build_sensor_control", "Building a sensor control device", "制作传感器自动控制装置", "选择传感器和电路元件，制作并调试简单自动控制装置。", [], "excluded", { requirementType: "practice", cognitive: ["apply", "create", "evaluate"], gapAction: "not_knowledge_concept" }),
  ],
  "sr3:3.1.1": [
    split("a", "oil_film_molecule_size", "Estimating molecular size by an oil film", "油膜法估测分子大小", "实施油膜法测量并处理体积和面积数据，评价数量级和误差。", [], "excluded", { requirementType: "practice", cognitive: ["apply", "analyze", "evaluate"], gapAction: "not_knowledge_concept" }),
    split("b", "molecular_kinetic_theory_evidence", "Molecular kinetic theory and evidence", "分子动理论及实验证据", "理解分子动理论基本观点并说明支持这些观点的实验证据。", [C.kineticTheory], "partial"),
  ],
  "sr3:3.1.2": [
    split("a", "diffusion_brownian", "Diffusion and Brownian motion", "扩散与布朗运动", "解释扩散与布朗运动，并用分子无规则运动说明其微观原因。", [C.kineticTheory], "partial"),
    split("b", "molecular_speed_distribution", "Molecular-speed distribution", "分子运动速率分布", "解释分子速率分布的统计规律和图像物理意义。", [C.kineticTheory], "partial"),
  ],
  "sr3:3.1.3": [
    split("a", "crystalline_amorphous", "Crystalline and amorphous solids", "晶体与非晶体", "比较晶体和非晶体微观结构、各向异性和宏观特点。", [], "unmapped"),
    split("b", "liquid_crystals", "Liquid crystals", "液晶性质与应用", "说明液晶主要性质及其在显示技术中的应用。", [], "unmapped"),
  ],
  "sr3:3.1.4": [
    split("a", "semiconductor_materials", "Semiconductor materials", "半导体材料", "说明半导体特点和技术应用。", [], "unmapped"),
    split("b", "nanomaterials", "Nanomaterials", "纳米材料", "说明纳米材料特性、应用及可能带来的问题。", [], "unmapped", { cognitive: ["understand", "evaluate"] }),
  ],
  "sr3:3.1.6": [
    split("a", "gas_experimental_laws", "Experimental gas laws and ideal-gas model", "气体实验定律与理想气体模型", "理解气体状态参量关系并使用理想气体模型解决问题。", [C.idealGas], "full"),
    split("b", "kinetic_explanation_gas", "Kinetic explanation of gas pressure and laws", "气体压强与定律的分子动理论解释", "用分子动理论和统计观点解释气体压强与实验定律。", [C.kineticTheory], "full"),
  ],
  "sr3:3.3.1": [
    split("a", "atomic_nuclear_model", "Atomic nuclear model", "原子核式结构模型", "概述原子结构探索证据并理解核式结构模型。", [C.nuclearStructure], "partial"),
    split("b", "hydrogen_energy_levels", "Hydrogen spectrum and energy levels", "氢原子光谱与能级", "由氢原子光谱理解原子能级结构。", [C.energyLevels], "full"),
  ],
  "sr3:3.3.2": [
    split("a", "nuclear_composition_force", "Nuclear composition and nuclear force", "原子核组成与核力", "理解原子核组成和核力性质。", [C.nuclearStructure], "partial"),
    split("b", "fundamental_interactions", "Four fundamental interactions", "四种基本相互作用", "识别四种基本相互作用及其典型尺度。", [], "unmapped"),
    split("c", "nuclear_reaction_equations", "Nuclear reaction equations", "核反应方程", "根据质量数和电荷守恒写出并检查核反应方程。", [C.nuclearStructure], "partial"),
  ],
  "sr3:3.3.3": [
    split("a", "radioactive_decay_half_life", "Radioactive decay and half-life", "放射性衰变与半衰期", "解释放射性衰变和半衰期的统计意义。", [C.decay, C.halfLife], "full"),
    split("b", "radioisotope_application_safety", "Radioisotope applications and radiation safety", "放射性同位素应用与射线防护", "说明放射性同位素应用，并评价射线危害和防护。", [], "unmapped"),
  ],
  "sr3:3.3.4": [
    split("a", "nuclear_binding_energy", "Nuclear binding energy", "原子核结合能", "理解质量亏损和结合能并比较原子核稳定性。", [C.bindingEnergy], "full"),
    split("b", "nuclear_fission_fusion", "Nuclear fission and fusion", "核裂变与核聚变", "区分裂变与聚变反应并评价核技术影响。", [C.fissionFusion], "full"),
  ],
  "sr3:3.4.1": [
    split("a", "photoelectric_effect_equation", "Photoelectric effect and Einstein equation", "光电效应与爱因斯坦方程", "实验认识光电效应并使用爱因斯坦光电效应方程。", [C.photoelectric, C.photon], "full"),
    split("b", "light_wave_particle_duality", "Wave-particle duality of light", "光的波粒二象性", "依据干涉、衍射和光电效应证据说明光的波粒二象性。", [C.duality], "full"),
  ],
};
const curriculumOutcomes = outcomes.flatMap((outcome) => {
  const children = SPLITS[`${outcome.level}:${outcome.code}`];
  if (!children) return [{ ...outcome, sourceCode: outcome.code }];
  return children.map((child) => ({ ...outcome, ...child, code: `${outcome.code}${child.suffix}`, sourceCode: outcome.code }));
});
const requirementId = (outcome) => `req_cn_sh_physics_2020_o_${outcome.level}_${outcome.code.replaceAll(".", "_")}_${outcome.key}`;
const evidence = (outcome) => [{ source_id: SOURCE_ID, locator: `物理标准PDF p.${outcome.page}（正文对应内容要求 ${outcome.sourceCode ?? outcome.code}），${levels[outcome.level].labelZh}` }];
const requirements = curriculumOutcomes.map((outcome) => ({
  requirement_id: requirementId(outcome),
  parent_requirement_id: null,
  code: `${levels[outcome.level].labelZh}·${outcome.code}`,
  title: outcome.title,
  title_zh: outcome.titleZh,
  summary_zh: outcome.summaryZh,
  requirement_type: outcome.requirementType,
  level_id: outcome.level,
  cognitive_processes: outcome.cognitive,
  evidence_refs: evidence(outcome),
  review_status: "needs_review",
}));

const framework = {
  schema_version: "2.0.0",
  content_version: "0.3.1",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  curriculum_kind: "national_standard",
  title: "China senior-high physics curriculum-standard outcome coverage",
  title_zh: "中国普通高中物理课程标准（2017 年版 2020 年修订）成果级覆盖",
  subject: "Physics",
  jurisdiction: "CN-MAINLAND",
  education_stage: "senior_secondary",
  requirement_granularity: "outcome",
  levels: Object.entries(levels).map(([level_id, level]) => ({ level_id, label: level.label, label_zh: level.labelZh })),
  languages: ["zh-CN", "en"],
  source_ids: [SOURCE_ID],
  valid_from: "2020-05-11",
  valid_to: null,
  review_status: "needs_review",
  scope_exclusions: [],
  changelog: [
    { version: "0.1.0", date: "2026-07-18", summary_zh: "建立必修与选择性必修主题级基线。" },
    { version: "0.2.1", date: "2026-07-18", summary_zh: "复核主题页码并撤销未经逐项证明的完整覆盖声明。" },
    { version: "0.3.0", date: TODAY, summary_zh: "按课程标准 87 个正式编号内容要求建立成果级矩阵。" },
    { version: "0.3.1", date: TODAY, summary_zh: `全量粒度复核后拆为 ${curriculumOutcomes.length} 个可独立诊断子成果，并把实验测量、科学史与方法实践从知识概念分离。` },
  ],
  requirements,
};

const defaultRationale = {
  full: "现有 canonical 概念组合与该编号内容要求的学科边界一致。",
  partial: "现有 canonical 概念提供直接支撑，但缺少该条要求中的模型条件、实验能力、应用边界或窄概念，因此不能声明完整覆盖。",
  unmapped: "统一 KG 中尚无边界足够准确、可独立诊断且不捆绑超范围内容的概念。",
  excluded: "该条核心是科学史证据、方法论或守恒推理实践，进入教学与评测知识层，不写成学科概念掌握度。",
};
const mappings = curriculumOutcomes.map((outcome) => ({
  mapping_id: requirementId(outcome).replace(/^req_/, "map_"),
  requirement_id: requirementId(outcome),
  canonical_ids: outcome.canonicalIds,
  coverage_status: outcome.coverage,
  relation: ["unmapped", "excluded"].includes(outcome.coverage) ? "not_applicable" : "required",
  mapping_basis: "semantic_inference",
  confidence: ["full", "excluded"].includes(outcome.coverage) ? "high" : outcome.coverage === "partial" ? "medium" : "low",
  rationale_zh: defaultRationale[outcome.coverage],
  evidence_refs: evidence(outcome),
  review_status: "needs_review",
}));
const mappingSet = {
  schema_version: "3.0.0",
  content_version: "0.3.1",
  mapping_set_id: "cms_cn_moe_senior_high_physics_2020_outcomes",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Physics",
  mapping_scope: "outcome_coverage",
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [
    { version: "0.1.0", date: "2026-07-18", summary_zh: "建立主题级候选映射。" },
    { version: "0.2.1", date: "2026-07-18", summary_zh: "复核主题边界和跨层级误映射。" },
    { version: "0.3.0", date: TODAY, summary_zh: "替换为 87 个官方编号内容要求的成果级保守映射。" },
    { version: "0.3.1", date: TODAY, summary_zh: `把捆绑概念、实验和应用的官方编号拆为 ${curriculumOutcomes.length} 个诊断子成果。` },
  ],
  mappings,
};

const gapCandidates = curriculumOutcomes
  .filter((outcome) => ["partial", "unmapped"].includes(outcome.coverage))
  .map((outcome) => ({
    gap_id: requirementId(outcome).replace(/^req_/, "gap_"),
    requirement_ids: [requirementId(outcome)],
    action: outcome.coverage === "unmapped" ? "add_concept" : "split_or_narrow_existing",
    proposed_name: outcome.title,
    proposed_name_zh: outcome.titleZh,
    scope_zh: outcome.summaryZh,
    existing_canonical_ids: outcome.canonicalIds,
    suggested_graph_id: "senior_secondary_physics",
    rationale_zh: outcome.coverage === "unmapped" ? "全库未找到语义等价且粒度相同的现有概念。" : "现有概念只覆盖部分范围或边界过宽，需要新增窄概念或精确 alias。",
    evidence_refs: evidence(outcome),
    review_status: "needs_review",
  }));
const gapSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  gap_set_id: "cgs_cn_moe_senior_high_physics_2020_outcomes",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Physics",
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [{ version: "0.1.0", date: TODAY, summary_zh: "逐编号反向查重并记录 partial 与 unmapped 概念缺口；方法实践不进入概念缺口。" }],
  candidates: gapCandidates,
};

const practiceItems = curriculumOutcomes.filter((outcome) => outcome.coverage === "excluded").map((outcome) => ({
  practice_id: `practice_cn_sh_physics_2020_${outcome.level}_${outcome.code.replaceAll(".", "_")}_${outcome.key}`,
  requirement_ids: [requirementId(outcome)],
  kind: "inquiry_process",
  name: outcome.title,
  name_zh: outcome.titleZh,
  description_zh: outcome.summaryZh,
  instructional_use_zh: "以物理史证据或多种解法比较组织教学，要求学生明确证据如何支持模型或守恒观点，而非只记结论。",
  assessment_evidence_zh: "能引用具体实验、证据或守恒条件说明推理链，区分物理概念结论与方法论评价。",
  evidence_refs: evidence(outcome),
  review_status: "needs_review",
}));
const practiceSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  practice_set_id: "cpk_cn_moe_senior_high_physics_2020",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Physics",
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [{ version: "0.1.0", date: TODAY, summary_zh: `把 ${practiceItems.length} 项科学史、证据与守恒方法要求分流到教学评测知识层。` }],
  items: practiceItems,
};

const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
writeJson(paths.framework, framework);
writeJson(paths.mapping, mappingSet);
writeJson(paths.gaps, gapSet);
writeJson(paths.practices, practiceSet);
const counts = mappings.reduce((result, mapping) => {
  result[mapping.coverage_status] = (result[mapping.coverage_status] ?? 0) + 1;
  return result;
}, {});
process.stdout.write(`[upgrade-cn-physics] ${outcomes.length} official requirements -> ${curriculumOutcomes.length} diagnostic outcomes; ${counts.full ?? 0} full, ${counts.partial ?? 0} partial, ${counts.unmapped ?? 0} unmapped, ${counts.excluded ?? 0} excluded; ${gapCandidates.length} gaps\n`);
