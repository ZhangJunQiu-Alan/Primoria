#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const TODAY = "2026-07-19";
const SOURCE_ID = "src_sg_seab_h2_physics_9478_2026";
const FRAMEWORK_ID = "cfw_sg_seab_h2_physics_9478_2026_outcomes";
const CURRICULUM_ID = "cur_sg_seab_h2_physics_9478_2026";
const GRAPH_ID = "singapore_h2_physics";
const paths = {
  framework: resolve(ROOT, "data/knowledge-graphs/curricula/frameworks/sg_seab_h2_physics_9478_2026.json"),
  mapping: resolve(ROOT, "data/knowledge-graphs/curricula/mappings/pending/sg_seab_h2_physics_9478_2026.json"),
  gaps: resolve(ROOT, "data/knowledge-graphs/curricula/gaps/pending/sg_seab_h2_physics_9478_2026_outcomes.json"),
  practices: resolve(ROOT, "data/knowledge-graphs/pedagogy/practices/sg_seab_h2_physics_9478_2026.json"),
  registry: resolve(ROOT, "data/knowledge-graphs/governance/concept-registry.json"),
  sources: resolve(ROOT, "data/knowledge-graphs/governance/sources.json"),
};

const registry = JSON.parse(readFileSync(paths.registry, "utf8"));
const aliasToCanonical = new Map(
  registry.concepts.flatMap((concept) =>
    concept.aliases.map((alias) => [`${alias.graph_id}:${alias.node_id}`, concept.canonical_id]),
  ),
);
const ids = (...nodeIds) => nodeIds.map((nodeId) => {
  const canonicalId = aliasToCanonical.get(`a_level_physics:${nodeId}`)
    ?? aliasToCanonical.get(`senior_secondary_physics:${nodeId}`);
  if (!canonicalId) throw new Error(`Missing physics alias ${nodeId}`);
  return canonicalId;
});

const pages = Object.fromEntries(Array.from({ length: 20 }, (_, index) => [String(index + 1), 11 + index]));
pages["5"] = 15;
pages["6"] = 15;
pages["7"] = 16;
pages["8"] = 17;
pages["9"] = 18;
pages["10"] = 19;
pages["11"] = 20;
pages["12"] = 21;
pages["13"] = 22;
pages["14"] = 23;
pages["15"] = 24;
pages["16"] = 25;
pages["17"] = 26;
pages["18"] = 27;
pages["19"] = 28;
pages["20"] = 29;

const topicNames = {
  1: ["Quantities and Measurement", "物理量与测量"],
  2: ["Forces and Moments", "力与力矩"],
  3: ["Motion and Forces", "运动与力"],
  4: ["Energy and Fields", "能量与场"],
  5: ["Projectile Motion", "抛体运动"],
  6: ["Collisions", "碰撞"],
  7: ["Circular Motion", "圆周运动"],
  8: ["Gravitational Fields", "引力场"],
  9: ["Oscillations", "振动"],
  10: ["Wave Motion", "波动"],
  11: ["Superposition", "叠加"],
  12: ["Temperature and Ideal Gases", "温度与理想气体"],
  13: ["Thermodynamic Systems", "热力学系统"],
  14: ["Electric Fields", "电场"],
  15: ["Currents", "电流"],
  16: ["Circuits", "电路"],
  17: ["Electromagnetic Forces", "电磁力"],
  18: ["Electromagnetic Induction", "电磁感应"],
  19: ["Quantum Physics", "量子物理"],
  20: ["Nuclear Physics", "核物理"],
};

const outcomes = [];
function add(topic, letter, key, title, titleZh, canonicalIds, options = {}) {
  const coverage = options.coverage ?? (canonicalIds.length ? "full" : "unmapped");
  outcomes.push({
    topic: String(topic), letter, key, title, titleZh,
    summaryZh: options.summaryZh ?? titleZh,
    canonicalIds,
    coverage,
    requirementType: options.requirementType ?? "knowledge",
    cognitive: options.cognitive ?? ["understand", "apply"],
    rationaleZh: options.rationaleZh,
  });
}
const practice = (topic, letter, key, title, titleZh, options = {}) => add(topic, letter, key, title, titleZh, [], {
  ...options,
  coverage: "excluded",
  requirementType: "practice",
  cognitive: options.cognitive ?? ["apply", "evaluate", "communicate"],
  rationaleZh: options.rationaleZh ?? "这是可观察的物理实践或表示任务，应进入教学与评测知识层，而不是独立概念掌握度。",
});

add(1, "a", "si_base_quantities_units", "SI base quantities and units", "使用六个指定 SI 基本量及单位", ids("phy_si_units"));
add(1, "b", "si_prefixes", "SI prefixes", "使用 pico 至 tera 的指定 SI 词头和符号", ids("phy_si_units"));
add(1, "c", "derived_units", "Derived units from SI bases", "把导出单位表示为 SI 基本单位的乘积或商", ids("phy_si_units"));
add(1, "d", "dimensional_homogeneity", "Dimensional homogeneity", "用 SI 基本单位检查物理方程量纲齐次性", ids("phy_homogeneity"));
practice(1, "e", "estimate_physical_quantities", "Reasonable physical estimates", "对课程内物理量作合理数量级估测");
add(1, "f", "random_systematic_errors", "Random and systematic errors", "区分限制精密度与准确度的随机误差、系统误差和零点误差", ids("phy_uncertainty"));
add(1, "g", "derived_uncertainty", "Uncertainty in derived quantities", "用绝对或相对不确定度相加或数值代入评估导出量不确定度", ids("phy_combine_uncertainty"));
add(1, "h", "scalar_vector_distinction", "Scalars and vectors", "区分标量与矢量并举例", ids("phy_scalars_vectors"));
add(1, "i", "coplanar_vector_operations", "Coplanar vector addition and subtraction", "完成共面矢量加减", ids("phy_scalars_vectors"));
add(1, "j", "perpendicular_vector_components", "Perpendicular vector components", "把矢量表示为两个相互垂直的分量", ids("phy_scalars_vectors"));

add(2, "a", "forces_in_fields", "Forces in gravitational, electric and magnetic fields", "描述质量、电荷和载流导线在相应场中的受力", ids("phy_force_types", "phy_grav_field_strength", "phy_e_field_strength", "phy_force_conductor", "phy_force_charge"));
add(2, "b", "qualitative_common_forces", "Qualitative common forces", "定性解释支持力、浮力、摩擦力与黏滞阻力，不引入摩擦系数和黏度", ids("phy_force_types", "phy_upthrust", "phy_terminal_velocity"));
add(2, "c", "hookes_law", "Hooke's law", "应用胡克定律 F=kx 解决新情境", ids("phy_hookes_law"));
add(2, "d", "moment_torque", "Moment and torque", "定义并应用力矩和力偶矩", ids("phy_moments"));
add(2, "e", "couple_rotation", "Couple as pure rotation", "说明力偶是一对只产生转动趋势的力", ids("phy_moments"));
add(2, "f", "centre_of_gravity", "Centre of gravity", "把物体重量视为作用在重心这一点", ids("phy_centre_of_gravity"));
add(2, "g", "principle_of_moments", "Principle of moments", "在新情境中应用力矩原理", ids("phy_moments"));
add(2, "h", "translational_rotational_equilibrium", "Translational and rotational equilibrium", "以合力和合力矩均为零判断系统平衡", ids("phy_equilibrium", "phy_moments"));
practice(2, "i", "free_body_vector_triangles", "Free-body diagrams and vector triangles", "用自由体图和矢量三角形表示平动与转动平衡中的力");

add(3, "a", "kinematic_quantities", "Kinematic quantities", "理解并使用位置、路程、位移、速率、速度和加速度", ids("phy_motion_quantities"));
add(3, "b", "kinematic_graphs", "Graphical representations of motion", "用图像表示路程、位移、速率、速度和加速度", ids("phy_motion_graphs"));
add(3, "c", "graph_gradients_areas", "Physical meaning of motion-graph gradients and areas", "由位移时间图斜率及速度时间图斜率和面积提取物理量，包括非匀加速", ids("phy_motion_graphs"));
add(3, "d", "derive_suvat", "Derive uniformly accelerated motion equations", "由速度和加速度定义推导直线匀加速运动方程", ids("phy_suvat"));
add(3, "e", "apply_suvat_free_fall", "Apply uniformly accelerated motion equations", "应用直线匀加速方程解决均匀重力场无阻力落体等问题", ids("phy_suvat", "phy_free_fall"));
add(3, "f", "mass_inertia", "Mass as inertia", "说明质量是物体抵抗运动状态改变的属性", ids("phy_mass_weight", "phy_newton_laws"));
add(3, "g", "linear_momentum", "Linear momentum", "定义并使用线性动量 p=mv", ids("phy_momentum"));
add(3, "h", "newton_laws", "Newton's three laws", "陈述并应用牛顿三条运动定律", ids("phy_newton_laws"));
add(3, "i", "resultant_force_ma", "Resultant force for constant mass", "对恒定质量物体应用合力 F=ma", ids("phy_newton_laws"));

add(4, "a", "energy_stores_transfers", "Energy stores and transfers", "说明物理系统可储存能量且能量可在储存形式间转移", ids("phy_energy_conservation"));
add(4, "b", "conservation_energy_examples", "Energy conservation in problem solving", "举例说明能量储存与转移并用能量守恒解题", ids("phy_energy_conservation"));
add(4, "c", "work_mechanical_transfer", "Work as mechanical energy transfer", "把功定义为力与沿力方向位移的乘积并作为机械能量转移", ids("phy_work"));
add(4, "d", "derive_kinetic_energy", "Derive kinetic energy", "由功定义和匀加速方程推导 Ek=mv²/2", ids("phy_work", "phy_ke_pe"));
add(4, "e", "apply_kinetic_energy", "Apply kinetic energy", "应用 Ek=mv²/2 解题", ids("phy_ke_pe"));
add(4, "f", "field_concept", "Concept of a field", "把场理解为物体可能受到相应场力的空间区域", ids("phy_field_analogy"));
add(4, "g", "gravitational_electric_field_strength_definitions", "Gravitational and electric field strength definitions", "分别以单位质量受力和单位正电荷受力定义引力场强与电场强", ids("phy_grav_field_strength", "phy_e_field_strength"));
add(4, "h", "field_lines_equipotentials", "Field lines and equipotential surfaces", "用均匀场和径向场的场线表示引力场与电场，并联系等势面", ids("cn_sh_physics_electric_field_lines", "phy_field_analogy"), { coverage: "partial", rationaleZh: "电场线已有窄概念，但引力场线及等势面正交关系没有同粒度完整概念。" });
add(4, "i", "field_force_work_potential", "Field force, work and potential energy", "说明场力沿场线作用，场力做功等于势能变化的负值", ids("phy_grav_field_strength", "phy_e_field_strength", "phy_grav_potential", "phy_e_potential"));
add(4, "j", "potential_energy_types", "Gravitational, electric and elastic potential energy", "区分引力势能、电势能和弹性势能", ids("phy_ke_pe", "phy_strain_energy", "phy_grav_potential", "phy_e_potential"));
add(4, "k", "elastic_energy_force_extension", "Elastic energy from force-extension area", "由力伸长图面积求形变材料储存的弹性势能", ids("phy_strain_energy"));
add(4, "l", "power_rate_energy_transfer", "Power as rate of energy transfer", "定义功率为能量转移速率", ids("phy_power_efficiency"));
add(4, "m", "mechanical_power_force_velocity", "Mechanical power as force times velocity", "说明机械功率等于力与沿力方向速度的乘积", ids("phy_power_efficiency"));
add(4, "n", "efficiency_energy_losses", "Efficiency and practical energy losses", "理解实际装置能量损失的影响并以有用输出与总输入之比计算效率", ids("phy_power_efficiency"), { cognitive: ["apply", "evaluate"] });

add(5, "a", "weight_in_gravity", "Weight in a gravitational field", "把重量描述为质量在引力场中受到的力", ids("phy_mass_weight"));
add(5, "b", "perpendicular_projectile_components", "Perpendicular projectile components", "解释一个方向匀速与垂直方向匀加速合成的运动", ids("phy_projectile"));
add(5, "c", "derive_uniform_gravity_potential", "Derive uniform-field gravitational potential energy", "由功定义推导均匀重力场势能变化 ΔEp=mgΔh", ids("phy_work", "phy_ke_pe"));
add(5, "d", "apply_uniform_gravity_potential", "Apply gravitational potential change", "应用 ΔEp=mgΔh 解题", ids("phy_ke_pe"));
add(5, "e", "falling_with_drag_terminal_velocity", "Falling with drag and terminal velocity", "从力和能量定性解释有空气阻力落体及终端速度", ids("phy_terminal_velocity"));

add(6, "a", "impulse_force_time_area", "Impulse from force-time area", "用力时间图下方面积求冲量", ids("phy_impulse"));
add(6, "b", "momentum_conservation", "Conservation of momentum", "陈述动量守恒原理", ids("phy_momentum_conservation"));
add(6, "c", "one_dimensional_collisions", "One-dimensional elastic and inelastic collisions", "用动量守恒解决一维两物体非弹性与完全弹性相互作用，不引入恢复系数", ids("phy_momentum_conservation", "phy_impulse"));
add(6, "d", "elastic_relative_speeds", "Relative speeds in a perfectly elastic collision", "说明完全弹性碰撞中接近相对速率等于分离相对速率", ids("phy_impulse"));
add(6, "e", "momentum_vs_kinetic_energy", "Momentum conservation and kinetic-energy change", "区分封闭系统动量总守恒与相互作用中动能通常改变", ids("phy_momentum_conservation", "phy_ke_pe"));

add(7, "a", "angular_displacement_radians", "Angular displacement in radians", "用弧度表示角位移", ids("phy_angular_speed"));
add(7, "b", "angular_velocity", "Angular velocity", "理解并使用角速度", ids("phy_angular_speed"));
add(7, "c", "linear_angular_speed_relation", "Linear and angular speed relation", "应用 v=rω", ids("phy_angular_speed"));
add(7, "d", "centripetal_acceleration_concept", "Centripetal acceleration and curved motion", "说明匀速圆周运动向心加速度，并把曲线运动归因于垂直速度且指向圆心的合力", ids("phy_centripetal_accel", "phy_centripetal_force"));
add(7, "e", "centripetal_acceleration_formula", "Centripetal acceleration formulae", "应用向心加速度 a=rω²=v²/r", ids("phy_centripetal_accel"));
add(7, "f", "centripetal_force_formula", "Centripetal force", "应用 F=mrω²=mv²/r", ids("phy_centripetal_force"));

add(8, "a", "newton_gravitation", "Newton's law of gravitation", "应用点质量间万有引力定律", ids("phy_newton_gravitation"));
add(8, "b", "derive_point_mass_gravity", "Derive point-mass gravitational field strength", "由万有引力定律和场强定义推导点质量场强", ids("phy_newton_gravitation", "phy_grav_field_strength"));
add(8, "c", "point_mass_gravity_formula", "Point-mass gravitational field strength", "应用点质量引力场强 g=GM/r²", ids("phy_grav_field_strength"));
add(8, "d", "near_earth_uniform_gravity", "Near-Earth uniform gravitational field", "说明地表附近引力场强近似恒定且等于自由落体加速度", ids("phy_grav_field_strength", "phy_free_fall"));
add(8, "e", "gravitational_potential_definition", "Gravitational potential definition", "以外力把单位测试质量从无穷远移到该点所做功定义引力势", ids("phy_grav_potential"));
add(8, "f", "point_mass_gravitational_potential", "Point-mass gravitational potential", "应用点质量引力势 V=-GM/r", ids("phy_grav_potential"));
add(8, "g", "two_mass_gravitational_energy", "Gravitational potential energy of two masses", "说明两点质量系统的引力势能并应用相应关系", ids("phy_grav_potential"));
add(8, "h", "gravity_potential_gradient", "Gravitational field as negative potential gradient", "应用引力场强等于引力势负梯度", ids("phy_grav_field_strength", "phy_grav_potential"));
add(8, "i", "escape_velocity_energy", "Escape velocity from energy", "用能量储存与转移分析逃逸速度", ids("phy_grav_potential", "phy_orbits"));
add(8, "j", "circular_orbits_inverse_square", "Circular orbits in inverse-square fields", "把万有引力与向心加速度联系起来分析圆轨道", ids("phy_newton_gravitation", "phy_orbits", "phy_centripetal_accel"));
add(8, "k", "geostationary_satellites", "Geostationary satellites and applications", "理解地球同步静止轨道卫星及其应用", ids("phy_orbits"));

add(9, "a", "free_oscillations", "Free oscillations", "描述粒子周期返回平衡位置且不与环境交换净能量的自由振动", ids("phy_shm"));
practice(9, "b", "investigate_oscillator", "Investigate oscillator motion", "用实验和图像方法研究振子运动");
add(9, "c", "oscillation_terms", "Oscillation quantities and phase", "使用振幅、周期、频率、角频率、相位和相位差并联系周期、频率和角频率", ids("phy_shm"));
add(9, "d", "shm_acceleration_displacement", "SHM acceleration-displacement relation", "理解并应用简谐运动 a=-ω²x", ids("phy_shm"));
add(9, "e", "shm_displacement_equation", "SHM displacement equation", "识别并使用简谐位移正弦或余弦表达式", ids("phy_shm"));
add(9, "f", "shm_velocity_equations", "SHM velocity equations", "使用简谐速度、位移和最大速度关系", ids("phy_shm"));
add(9, "g", "shm_graph_relations", "SHM displacement, velocity and acceleration graphs", "用图像描述简谐运动位移、速度和加速度的关系", ids("phy_shm"));
add(9, "h", "shm_energy_interchange", "SHM kinetic-potential energy interchange", "描述简谐运动中动能与势能的相互转化", ids("phy_shm_energy"));
add(9, "i", "damping_regimes_applications", "Damping regimes and applications", "描述欠阻尼、临界阻尼和过阻尼及临界阻尼应用", ids("phy_damping"));
add(9, "j", "forced_response_resonance", "Forced response and resonance", "用振幅频率图描述受迫振动在驱动频率接近固有频率时共振", ids("phy_resonance"));
add(9, "k", "damping_resonance_sharpness", "Damping and resonance sharpness", "定性说明阻尼对频率响应与共振尖锐程度的影响", ids("phy_damping", "phy_resonance"));
add(9, "l", "resonance_useful_harmful", "Useful and harmful resonance", "举例说明受迫振动与共振，并评价共振何时有用或应避免", ids("phy_resonance"), { cognitive: ["understand", "evaluate"] });

add(10, "a", "mechanical_em_waves", "Mechanical and electromagnetic waves", "区分介质粒子振动构成的机械波与时空电磁场振动构成的电磁波", ids("phy_progressive_waves", "phy_wave_types"));
add(10, "b", "wave_quantities", "Wave quantities", "使用位移、振幅、周期、频率、相位、相位差、波长和波速", ids("phy_progressive_waves"));
add(10, "c", "derive_wave_equation", "Derive the wave equation", "由波速、频率和波长定义推导 v=fλ", ids("phy_progressive_waves"));
add(10, "d", "apply_wave_equation", "Apply the wave equation", "应用 v=fλ 解题", ids("phy_progressive_waves"));
add(10, "e", "transverse_longitudinal_graphs", "Transverse and longitudinal wave graphs", "分析随时间和位置变化的横波与纵波图像", ids("phy_wave_types", "phy_progressive_waves"));
add(10, "f", "wave_energy_not_matter", "Wave energy transfer without matter transfer", "说明行波传递能量但不传递物质", ids("phy_progressive_waves"));
add(10, "g", "wave_intensity_amplitude", "Wave intensity and amplitude", "使用单位面积功率定义强度及强度正比于振幅平方", ids("phy_intensity"));
add(10, "h", "inverse_square_wave_intensity", "Inverse-square wave intensity", "对无能量损失的点源波应用强度反平方关系", ids("phy_intensity"));
add(10, "i", "polarisation_transverse", "Polarisation as a transverse-wave phenomenon", "说明偏振是横波特有现象", ids("phy_polarisation_malus", "phy_wave_types"));
add(10, "j", "malus_law", "Malus' law", "应用马吕斯定律分析偏振强度", ids("phy_polarisation_malus"));

add(11, "a", "superposition_principle", "Principle of superposition", "解释并应用叠加原理", ids("phy_superposition_principle"));
add(11, "b", "standing_wave_experiments", "Standing-wave experiments", "理解微波、弦和气柱驻波实验", ids("phy_stationary_waves"));
add(11, "c", "standing_wave_nodes_antinodes", "Standing-wave formation and nodes", "用图像解释驻波形成并区分节点、腹点以及声波压强和位移节点腹点", ids("phy_stationary_waves"));
add(11, "d", "sound_wavelength_standing_waves", "Sound wavelength from standing waves", "用驻波测定声波波长", ids("phy_stationary_waves"));
add(11, "e", "diffraction_interference_terms", "Diffraction and interference terms", "使用衍射、干涉、相干、相位差和路程差术语", ids("phy_diffraction", "phy_interference"));
add(11, "f", "two_source_interference_phenomena", "Two-source interference phenomena", "解释水波、声波、光和微波的双源干涉现象", ids("phy_interference"));
add(11, "g", "interference_fringe_conditions", "Conditions for interference fringes", "说明观察双源干涉条纹所需条件", ids("phy_interference"));
add(11, "h", "double_slit_fringe_equation", "Double-slit fringe equation", "应用双缝干涉条纹间距关系解题", ids("phy_interference"));
add(11, "i", "diffraction_grating_equation", "Diffraction-grating principal maxima", "应用光栅主极大关系解题", ids("phy_diffraction_grating"));
add(11, "j", "grating_wavelength_measurement", "Measure wavelength with a diffraction grating", "描述用衍射光栅测光波长，不要求分光计结构和使用", ids("phy_diffraction_grating"));
add(11, "k", "single_aperture_edge_diffraction", "Single-aperture and edge diffraction", "解释单缝、孔径或边缘衍射现象", ids("phy_diffraction"));
add(11, "l", "single_slit_minima", "Single-slit first minima", "应用单缝第一极小位置关系", ids("phy_diffraction"));
add(11, "m", "rayleigh_criterion", "Rayleigh criterion", "应用瑞利判据分析单孔径分辨本领", ids("phy_diffraction"));

add(12, "a", "thermodynamic_temperature_scale", "Thermodynamic temperature scale", "说明热力学温标有绝对零点且不依赖特定物质性质", ids("phy_thermometry"));
add(12, "b", "celsius_kelvin_conversion", "Celsius-kelvin conversion", "使用 T/K=T/°C+273.15 换算温度", ids("phy_thermometry"));
add(12, "c", "ideal_gas_particle_equation", "Ideal-gas equation in particle form", "应用 pV=NkT", ids("phy_ideal_gas"));
add(12, "d", "avogadro_boltzmann_gas_constant", "Avogadro, Boltzmann and molar gas constants", "使用阿伏伽德罗常数、N=nNA 及 Nk=nR", ids("phy_mole_avogadro", "phy_ideal_gas"));
add(12, "e", "kinetic_theory_assumptions", "Kinetic-theory assumptions", "陈述气体动理论基本假设", ids("phy_kinetic_theory"));
add(12, "f", "derive_kinetic_pressure", "Derive kinetic-theory pressure", "由粒子随机运动、碰撞和压强定义推导 pV=Nm<c²>/3", ids("phy_kinetic_theory"));
add(12, "g", "mean_kinetic_energy_temperature", "Mean translational kinetic energy and temperature", "应用理想气体粒子平均平动动能正比于热力学温度", ids("phy_kinetic_theory"));

add(13, "a", "internal_energy_microstates", "Internal energy and microscopic energies", "说明宏观状态决定内能，内能是粒子随机微观动能和势能之和", ids("phy_internal_energy"));
add(13, "b", "temperature_mean_kinetic_energy", "Temperature and mean microscopic kinetic energy", "说明热力学温度正比于粒子平均微观动能", ids("phy_internal_energy", "phy_kinetic_theory"));
add(13, "c", "thermal_contact_equilibrium", "Heating and thermal equilibrium", "说明热接触系统由高温向低温传能直至达到热平衡", ids("phy_temperature"));
add(13, "d", "gas_work_sign_convention", "Work done by and on a gas", "区分气体对外做功与外界对气体做功并应用恒外压 W=pΔV", ids("phy_internal_energy"));
add(13, "e", "zeroth_law", "Zeroth law of thermodynamics", "陈述并应用热力学第零定律", ids("phy_temperature"));
add(13, "f", "first_law", "First law of thermodynamics", "应用 ΔU=Q+W 进行系统内能核算", ids("phy_internal_energy"));
add(13, "g", "specific_heat_latent_heat", "Specific heat capacity and latent heat", "定义并应用比热容和比潜热", ids("phy_heat_capacity"));

add(14, "a", "coulomb_law", "Coulomb's law", "应用自由空间或空气中两点电荷的库仑定律", ids("phy_coulomb"));
add(14, "b", "point_charge_field_strength", "Point-charge electric field strength", "应用点电荷电场强度关系", ids("phy_e_field_strength"));
add(14, "c", "electric_potential_definition", "Electric potential definition", "以外力把单位正试探电荷从无穷远移到该点所做功定义电势", ids("phy_e_potential"));
add(14, "d", "point_charge_potential", "Point-charge electric potential", "应用点电荷电势关系", ids("phy_e_potential"));
add(14, "e", "two_charge_potential_energy", "Electric potential energy of two charges", "说明并应用两点电荷系统电势能", ids("phy_e_potential"));
add(14, "f", "electric_potential_gradient", "Electric field as negative potential gradient", "应用电场强度等于电势负梯度", ids("phy_e_field_strength", "phy_e_potential"));
add(14, "g", "parallel_plate_uniform_field", "Uniform field between parallel plates", "由电势差和板间距计算平行板间匀强电场", ids("phy_e_field_strength"));
add(14, "h", "charge_force_uniform_field", "Force on a charge in a uniform electric field", "计算匀强电场中电荷受力", ids("phy_e_field_strength"));
add(14, "i", "charged_particle_uniform_electric_motion", "Charged-particle motion in a uniform electric field", "描述匀强电场对带电粒子运动的影响", ids("cn_sh_physics_charged_particle_electric_motion"));
add(14, "j", "capacitance_definition", "Capacitance", "定义电容 C=Q/V 并应用", ids("phy_capacitance_def"));
add(14, "k", "capacitor_energy", "Energy stored in a capacitor", "由电势差电荷图面积及三个等价关系计算电容器储能", ids("phy_capacitor_energy"));

add(15, "a", "current_charge_rate", "Current as rate of charge flow", "把电流定义为电荷流率并应用 I=Q/t", ids("phy_current_charge"));
add(15, "b", "drift_current_equation", "Drift-current equation", "推导并应用 I=nAvq", ids("phy_current_charge"));
add(15, "c", "potential_difference_work_charge", "Potential difference as work per charge", "用单位电荷电功定义电势差并解题", ids("phy_pd_emf"));
add(15, "d", "electrical_power_equations", "Electrical power equations", "应用 P=VI、P=I²R 和 P=V²/R", ids("phy_power_efficiency", "phy_resistance_ohm"));
add(15, "e", "emf_pd_energy", "EMF and potential difference", "从能量角度区分电动势与电势差", ids("phy_pd_emf"));
add(15, "f", "ac_quantities", "Alternating-current quantities", "使用交流电流或电压的周期、频率、峰值和有效值", ids("phy_ac_rms"));
add(15, "g", "sinusoidal_ac_equation", "Sinusoidal alternating-current equation", "用正弦表达式表示交流电流或电压", ids("phy_ac_rms"));
add(15, "h", "mean_resistive_ac_power", "Mean power of a sinusoidal AC resistive load", "推导正弦交流纯电阻负载平均功率为峰值功率一半", ids("phy_ac_rms"));
add(15, "i", "rms_peak_relations", "RMS and peak relations", "区分有效值与峰值并应用正弦交流关系", ids("phy_ac_rms"));
add(15, "j", "half_wave_rectification", "Half-wave rectification", "解释单个二极管对交流电的半波整流", ids("phy_rectification"));

add(16, "a", "circuit_symbols", "Circuit symbols", "识别并使用合适电路符号", ids("cn_sh_physics_circuit_components"));
add(16, "b", "draw_interpret_circuits", "Draw and interpret circuit diagrams", "绘制和解释含指定电源、测量仪表、电阻、传感器、二极管和电容器的电路图", ids("cn_sh_physics_circuit_components", "phy_resistive_sensors"));
add(16, "c", "resistance_definition_ohm", "Resistance and Ohm's law", "以电压电流比定义电阻并应用 V=IR", ids("phy_resistance_ohm"));
add(16, "d", "resistance_resistivity_geometry", "Resistance, resistivity and geometry", "应用电阻率、长度和横截面积关系", ids("phy_resistivity"));
add(16, "e", "component_iv_characteristics", "DC component I-V characteristics", "绘制和解释欧姆电阻、二极管、灯丝灯泡和 NTC 热敏电阻的直流 I–V 特性", ids("phy_iv_characteristics"));
add(16, "f", "temperature_resistivity_carriers", "Temperature dependence of resistivity", "从漂移速度和载流子数密度解释金属与半导体电阻率的温度依赖", ids("phy_resistivity", "phy_iv_characteristics"));
add(16, "g", "internal_resistance_terminal_power", "Internal resistance, terminal voltage and power", "说明电源内阻对端电压和输出功率的影响", ids("phy_internal_resistance"));
add(16, "h", "series_resistance", "Combined series resistance", "计算两个或以上串联电阻的总电阻", ids("phy_series_parallel"));
add(16, "i", "parallel_resistance", "Combined parallel resistance", "计算两个或以上并联电阻的总电阻", ids("phy_series_parallel"));
add(16, "j", "resistor_network_potential_divider", "Resistor networks and potential dividers", "分析单电源串并联电阻和含 NTC/LDR 的分压电路", ids("phy_series_parallel", "phy_potential_divider", "phy_resistive_sensors"));
add(16, "k", "capacitor_networks", "Series and parallel capacitors", "计算两个或以上电容器串并联的等效电容", ids("phy_capacitor_networks"));
add(16, "l", "rc_charge_discharge", "RC charging and discharging", "用指数关系描述电阻充放电电容器的电流、电荷和电势差随时间变化", ids("phy_capacitor_discharge"));

add(17, "a", "magnetic_field_sources", "Sources of magnetic fields", "说明磁场可由载流导线或永久磁体产生", ids("phy_fields_currents"));
add(17, "b", "current_magnetic_field_patterns", "Magnetic field patterns due to currents", "绘制长直导线、圆形线圈和长螺线管电流产生的磁场线", ids("phy_fields_currents"));
add(17, "c", "current_field_equations", "Magnetic fields of wire and solenoid", "应用长直导线和长螺线管磁场关系", ids("phy_fields_currents"));
add(17, "d", "ferrous_core_solenoid", "Ferrous-core effect in a solenoid", "说明铁磁芯会影响螺线管磁场", ids("phy_fields_currents"));
add(17, "e", "force_current_conductor", "Force on a current-carrying conductor", "说明磁场中载流导线可能受力", ids("phy_force_conductor"));
add(17, "f", "conductor_force_equation", "Magnetic force on a conductor", "应用 F=BIl sinθ", ids("phy_force_conductor"));
add(17, "g", "flux_density_definition", "Magnetic flux density definition", "以垂直磁场中单位电流单位长度导线受力定义磁通密度", ids("phy_flux_density"));
practice(17, "h", "current_balance_measurement", "Current-balance measurement of flux density", "说明如何用电流天平测量磁场磁通密度");
add(17, "i", "forces_parallel_currents", "Forces between current-carrying conductors", "解释载流导线间作用力并判断方向", ids("phy_fields_currents", "phy_force_conductor"));
add(17, "j", "moving_charge_force_direction", "Direction of force on a moving charge", "判断匀强磁场中运动电荷受力方向", ids("phy_force_charge"));
add(17, "k", "moving_charge_force_equation", "Magnetic force on a moving charge", "应用 F=BQv sinθ", ids("phy_force_charge"));
add(17, "l", "charged_beam_deflections", "Charged-beam deflection in electric and magnetic fields", "描述并分析带电粒子束在匀强电场和磁场中的偏转", ids("phy_force_charge", "cn_sh_physics_charged_particle_electric_motion"));
add(17, "m", "crossed_field_velocity_selector", "Crossed-field velocity selector", "解释垂直电场和磁场如何选择带电粒子速度", ids("phy_force_charge", "phy_e_field_strength"), { coverage: "partial", rationaleZh: "现有概念分别覆盖电场力与磁场力，但没有独立覆盖交叉场中两力平衡的速度选择器。" });

add(18, "a", "magnetic_flux", "Magnetic flux", "定义磁通为磁通密度与垂直截面积的乘积", ids("phy_flux_linkage"));
add(18, "b", "flux_linkage", "Magnetic flux linkage", "理解并使用磁链", ids("phy_flux_linkage"));
add(18, "c", "flux_linkage_equation", "Flux-linkage equation", "应用磁链与匝数、磁通的关系", ids("phy_flux_linkage"));
add(18, "d", "induction_experimental_inferences", "Experimental inferences about induction", "由实验推断变化磁通会产生电动势及感应方向遵循能量守恒", ids("phy_faraday", "phy_lenz"));
add(18, "e", "faraday_lenz_laws", "Faraday's and Lenz's laws", "应用法拉第电磁感应定律与楞次定律", ids("phy_faraday", "phy_lenz"));
add(18, "f", "induction_applications", "Applications of electromagnetic induction", "解释简单电磁感应应用", ids("phy_faraday", "phy_lenz"));
add(18, "g", "transformer_principle_equations", "Transformer principle and equations", "解释铁芯变压器原理并应用匝数、电压和电流关系", ids("phy_transformers"));
add(18, "h", "transformer_power_transmission", "Transformer efficiency and power transmission", "分析变压器与输电中的功率、效率和能量损失", ids("phy_transformers", "phy_power_efficiency"));

add(19, "a", "wave_particle_evidence", "Wave and particle evidence for radiation", "用光电效应阈频支持电磁辐射粒子性，用干涉衍射支持波动性", ids("phy_photoelectric", "phy_wave_particle"));
add(19, "b", "photon_energy", "Photon energy", "把光子视为电磁辐射能量子并应用 E=hf", ids("phy_photon"));
add(19, "c", "photon_momentum", "Photon momentum", "说明无静质量光子具有 p=E/c=h/λ 的动量", ids("phy_photon"));
add(19, "d", "matter_wave_evidence", "Evidence for matter waves", "用电子衍射和单粒子双缝干涉支持粒子波动性", ids("phy_wave_particle"));
add(19, "e", "de_broglie_wavelength", "de Broglie wavelength", "应用德布罗意关系 λ=h/p", ids("phy_wave_particle"));
add(19, "f", "wavefunction_probability_density", "Wavefunction and probability density", "用波函数表示粒子状态，把 |ψ|² 解释为概率密度并归一化方形和正弦波函数", [], { coverage: "unmapped", cognitive: ["understand", "apply", "model"], rationaleZh: "现有波粒二象性概念没有波函数、概率密度或归一化。" });
add(19, "g", "wavefunction_superposition", "Superposition of wavefunctions", "把叠加原理用于位置波函数，联系势阱驻波与单粒子双缝干涉", [], { coverage: "unmapped", cognitive: ["understand", "reason"], rationaleZh: "现有经典波叠加概念不能替代量子态叠加。" });
add(19, "h", "heisenberg_uncertainty", "Heisenberg position-momentum uncertainty", "把位置动量不确定性联系到局域粒子需要动量展宽并解题", [], { coverage: "unmapped", rationaleZh: "统一 KG 尚无位置动量不确定性概念。" });
add(19, "i", "infinite_well_wavefunctions", "Infinite-well standing wavefunctions", "理解一维无限深方势阱中的驻波本征态 ψn", [], { coverage: "unmapped", cognitive: ["understand", "model"], rationaleZh: "现有原子能级概念没有无限深势阱波函数边界条件。" });
add(19, "j", "infinite_well_energy_levels", "Infinite-well energy levels", "应用一维无限深方势阱允许能级关系", [], { coverage: "unmapped", rationaleZh: "现有原子能级概念不能替代方势阱能级计算。" });
add(19, "k", "atomic_discrete_levels_spectra", "Atomic discrete energy levels and spectra", "由孤立原子电子波函数离散能级解释线光谱", ids("phy_energy_levels"));
add(19, "l", "emission_absorption_spectra", "Emission and absorption line spectra", "区分发射线光谱和吸收线光谱", ids("phy_energy_levels"));
add(19, "m", "photon_atomic_transitions", "Photon absorption and emission in atomic transitions", "分析原子能级跃迁中的光子吸收或发射", ids("phy_energy_levels", "phy_photon"));

add(20, "a", "rutherford_nucleus", "Rutherford scattering and the nucleus", "由 α 粒子散射结果推断原子核存在且尺度很小", ids("phy_nuclear_structure"));
add(20, "b", "nucleon_proton_numbers", "Nucleon and proton numbers", "区分核子数与质子数", ids("phy_nuclear_structure", "phy_isotopes"));
add(20, "c", "isotopes_nuclide_notation", "Isotopes and nuclide notation", "说明同一元素可有不同中子数的同位素并使用核素符号", ids("phy_isotopes"));
add(20, "d", "spontaneous_random_decay", "Spontaneous and random nuclear decay", "说明核衰变具有自发性和随机性", ids("phy_radioactive_decay"));
add(20, "e", "count_rate_fluctuation_randomness", "Count-rate fluctuations and decay randomness", "由计数率波动推断放射性衰变随机性", ids("phy_radioactive_decay"));
add(20, "f", "background_radiation", "Origin and significance of background radiation", "解释本底辐射的来源和意义", ids("phy_radioactive_decay"), { coverage: "partial", rationaleZh: "现有衰变概念没有独立覆盖本底来源、测量扣除和意义。" });
add(20, "g", "alpha_beta_gamma_properties", "Properties of alpha, beta and gamma radiation", "理解 α、β、γ 辐射的本质和性质，不要求正电子发射", ids("phy_radioactive_decay"), { coverage: "partial", rationaleZh: "现有衰变概念范围过宽，未独立覆盖三类辐射的穿透、电离和偏转性质。" });
add(20, "h", "activity_decay_constant", "Activity and decay constant", "定义活度和衰变常量并应用 A=λN", ids("phy_radioactive_decay"));
add(20, "i", "exponential_decay", "Exponential radioactive decay", "推断、绘制并应用指数衰变关系", ids("phy_radioactive_decay"));
add(20, "j", "half_life_definition", "Half-life definition", "定义并使用半衰期", ids("phy_half_life"));
add(20, "k", "half_life_decay_constant", "Half-life and decay constant", "应用 t1/2=ln2/λ", ids("phy_half_life", "phy_radioactive_decay"));
add(20, "l", "radioactivity_uses_hazards", "Applications and hazards of radioactivity", "依据半衰期、穿透能力和电离效应定性讨论放射性医学工业应用与危害", ids("cn_sh_physics_radioisotope_application_safety"));
add(20, "m", "nuclear_equations", "Nuclear equations", "用核方程表示简单核反应", ids("phy_nuclear_structure", "phy_radioactive_decay"), { coverage: "partial", rationaleZh: "既有概念提供核素和衰变基础，但没有独立登记核方程守恒表示。" });
add(20, "n", "nuclear_conservation_laws", "Conservation laws in nuclear processes", "在核过程解题中应用核子数、电荷和质能守恒", ids("phy_nuclear_structure", "phy_binding_energy"), { coverage: "partial", rationaleZh: "现有核结构与结合能概念没有把三项守恒作为统一诊断目标。" });
add(20, "o", "neutrino_prediction", "Neutrino prediction from conservation laws", "说明如何由 β 衰变能量和动量守恒预测中微子或反中微子存在，不扩展到粒子动物园", [], { coverage: "unmapped", rationaleZh: "统一 KG 尚无由 β 衰变守恒缺口推断中微子的概念。" });
add(20, "p", "mass_defect", "Mass defect", "理解质量亏损", ids("phy_binding_energy"));
add(20, "q", "mass_energy_equivalence", "Mass-energy equivalence", "应用 E=mc² 解决质能等价问题", ids("phy_binding_energy"));
add(20, "r", "binding_energy_mass_defect", "Binding energy and mass defect", "说明核结合能与质量亏损的关系", ids("phy_binding_energy"));
add(20, "s", "binding_energy_per_nucleon_curve", "Binding energy per nucleon curve", "绘制平均每核子结合能随核子数变化曲线", ids("phy_binding_energy"));
add(20, "t", "binding_energy_fission_fusion", "Binding energy in fission and fusion", "用平均每核子结合能解释核裂变与核聚变", ids("phy_binding_energy", "phy_fission_fusion"));

const expectedCounts = [10, 9, 9, 14, 5, 5, 6, 11, 12, 10, 13, 7, 7, 11, 10, 12, 13, 8, 13, 20];
for (let index = 0; index < expectedCounts.length; index += 1) {
  const actual = outcomes.filter((outcome) => outcome.topic === String(index + 1)).length;
  if (actual !== expectedCounts[index]) throw new Error(`Topic ${index + 1}: expected ${expectedCounts[index]}, got ${actual}`);
}
if (outcomes.length !== 205) throw new Error(`Expected 205 content outcomes, got ${outcomes.length}`);

const globalPractices = [
  ["pos_wotd", "Ways of thinking and doing", "提出问题、设计和实施调查、分析数据、以证据交流和辩护、作负责任决定、使用模型并建构解释或方案。", "PDF p.4, Practices of Science 1.1-1.8"],
  ["pos_nos", "Nature of scientific knowledge", "理解科学以证据和模型建构对现实的认识，假设自然系统有秩序与一致性，并通过规范程序和批判讨论形成可修正知识。", "PDF p.4, Practices of Science 2.1-2.4"],
  ["pos_stse", "Science, technology, society and environment", "评价科学应用的风险、收益及伦理、社会、经济和环境影响，并理解科学发现与技术进步的双向推动。", "PDF p.4, Practices of Science 3.1-3.3"],
  ["practical_planning", "Practical planning", "定义实验问题，给出清晰程序和数据处理计划，评估风险并提出预防措施。", "PDF p.31, Practical Assessment: Planning"],
  ["practical_mmo", "Manipulation, measurement and observation", "熟练操作，按适当精密度记录观察和测量，作测量决策并识别异常数据。", "PDF p.31, Practical Assessment: MMO"],
  ["practical_pdo", "Presentation of data and observations", "以适当形式呈现信息和定量数据，处理测量以识别趋势并使用合适小数位或有效数字。", "PDF p.31, Practical Assessment: PDO"],
  ["practical_ace", "Analysis, conclusions and evaluation", "分析解释数据、作结论和预测，识别显著误差与局限并提出可行改进。", "PDF p.31, Practical Assessment: ACE"],
  ["spreadsheet_data", "Spreadsheet data input", "导入 xlsx 数据或录入实验数据供后续处理。", "PDF p.36, Spreadsheet requirements: Data input"],
  ["spreadsheet_operations", "Spreadsheet numerical operations", "在电子表格中使用公式、科学记数法、三角函数、指数、对数并复制公式和格式。", "PDF p.36, Spreadsheet requirements: Functions"],
  ["spreadsheet_graphs", "Spreadsheet graph analysis", "绘制带标签折线图，调轴、拟合趋势线、显示方程并数值估计曲线下面积和局部梯度。", "PDF p.36, Spreadsheet requirements: Graphs"],
];
for (const [key, title, summaryZh, locator] of globalPractices) {
  outcomes.push({
    topic: "practice", letter: key, key, title, titleZh: summaryZh, summaryZh,
    canonicalIds: [], coverage: "excluded", requirementType: "practice",
    cognitive: ["apply", "evaluate", "communicate"],
    rationaleZh: "这是跨主题科学实践或工具能力，进入教学与评测知识层，不作为物理概念掌握度。",
    locator,
  });
}

const requirementId = (outcome) => `req_sg_h2_physics_9478_2026_o_${outcome.topic}_${outcome.key}`;
const evidence = (outcome) => [{
  source_id: SOURCE_ID,
  locator: outcome.locator ?? `PDF p.${pages[outcome.topic]}, topic ${outcome.topic} ${topicNames[outcome.topic][0]}, outcome (${outcome.letter})`,
}];
const requirements = outcomes.map((outcome) => ({
  requirement_id: requirementId(outcome),
  parent_requirement_id: null,
  code: outcome.topic === "practice" ? `P.${outcome.letter}` : `${outcome.topic}.${outcome.letter}`,
  title: outcome.title,
  title_zh: outcome.titleZh,
  summary_zh: outcome.summaryZh,
  requirement_type: outcome.requirementType,
  level_id: "h2_9478",
  cognitive_processes: outcome.cognitive,
  evidence_refs: evidence(outcome),
  review_status: "needs_review",
}));

const framework = {
  schema_version: "2.0.0",
  content_version: "0.3.0",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  curriculum_kind: "examination_syllabus",
  title: "Singapore-Cambridge GCE Advanced Level H2 Physics 9478 outcome coverage",
  title_zh: "新加坡剑桥 GCE A-Level H2 物理 9478（2026）学习成果级覆盖",
  subject: "Physics",
  jurisdiction: "SG",
  education_stage: "pre_university",
  requirement_granularity: "outcome",
  levels: [{ level_id: "h2_9478", label: "H2 Physics 9478", label_zh: "H2 物理 9478" }],
  languages: ["en", "zh-CN"],
  source_ids: [SOURCE_ID],
  valid_from: "2026-01-01",
  valid_to: "2026-12-31",
  review_status: "needs_review",
  scope_exclusions: [
    { scope: "coefficients of friction and viscosity", rationale_zh: "主题 2(b) 明确不要求摩擦系数和黏度概念。", evidence_refs: [{ source_id: SOURCE_ID, locator: "PDF p.12, topic 2 outcome (b)" }] },
    { scope: "coefficient of restitution", rationale_zh: "主题 6(c) 明确不要求恢复系数。", evidence_refs: [{ source_id: SOURCE_ID, locator: "PDF p.15, topic 6 outcome (c)" }] },
    { scope: "spectrometer structure and use", rationale_zh: "主题 11(j) 明确不要求分光计结构和使用。", evidence_refs: [{ source_id: SOURCE_ID, locator: "PDF p.20, topic 11 outcome (j)" }] },
    { scope: "positron emission", rationale_zh: "主题 20(g) 明确不要求正电子发射。", evidence_refs: [{ source_id: SOURCE_ID, locator: "PDF p.29, topic 20 outcome (g)" }] },
    { scope: "antineutrino details and the particle zoo", rationale_zh: "主题 20(o) 只要求守恒推理，明确不要求反中微子细节和粒子动物园。", evidence_refs: [{ source_id: SOURCE_ID, locator: "PDF p.29, topic 20 outcome (o)" }] },
  ],
  changelog: [
    { version: "0.1.0", date: "2026-07-18", summary_zh: "按 20 个官方内容主题建立主题级基线。" },
    { version: "0.2.1", date: "2026-07-18", summary_zh: "复核 2026 新版主题范围并删除旧大纲残留。" },
    { version: "0.3.0", date: TODAY, summary_zh: "人工拆分 205 条内容成果，并加入 10 项科学实践、实验和电子表格能力；保留五组明确排除边界。" },
  ],
  requirements,
};

const mappings = outcomes.map((outcome) => ({
  mapping_id: `map_sg_h2_physics_9478_2026_o_${outcome.topic}_${outcome.key}`,
  requirement_id: requirementId(outcome),
  canonical_ids: outcome.canonicalIds,
  coverage_status: outcome.coverage,
  relation: ["unmapped", "excluded"].includes(outcome.coverage) ? "not_applicable" : "required",
  mapping_basis: "semantic_inference",
  confidence: ["full", "excluded"].includes(outcome.coverage) ? "high" : "medium",
  rationale_zh: outcome.coverage === "full"
    ? "现有 canonical 概念与该学习成果的定义、公式、边界和课程深度一致。"
    : outcome.coverage === "excluded"
      ? outcome.rationaleZh
      : outcome.rationaleZh ?? "现有概念仅覆盖部分范围或统一 KG 尚无同粒度概念，需要缺口解析。",
  evidence_refs: evidence(outcome),
  review_status: "needs_review",
}));

const mappingSet = {
  schema_version: "3.0.0",
  content_version: "0.3.0",
  mapping_set_id: "cms_sg_seab_h2_physics_9478_2026_outcomes",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Physics",
  mapping_scope: "outcome_coverage",
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [
    { version: "0.1.0", date: "2026-07-18", summary_zh: "建立主题级候选映射。" },
    { version: "0.2.1", date: "2026-07-18", summary_zh: "复核主题边界并撤销完整覆盖声明。" },
    { version: "0.3.0", date: TODAY, summary_zh: "替换为内容成果与实践要求的逐项映射，保守识别新版量子和核物理缺口。" },
  ],
  mappings,
};

const gapCandidates = outcomes
  .filter((outcome) => ["partial", "unmapped"].includes(outcome.coverage))
  .map((outcome) => ({
    gap_id: `gap_sg_h2_physics_9478_2026_o_${outcome.topic}_${outcome.key}`,
    requirement_ids: [requirementId(outcome)],
    action: outcome.coverage === "unmapped" ? "add_concept" : "split_or_narrow_existing",
    proposed_name: outcome.title,
    proposed_name_zh: outcome.titleZh,
    scope_zh: outcome.summaryZh,
    existing_canonical_ids: outcome.canonicalIds,
    suggested_graph_id: GRAPH_ID,
    rationale_zh: outcome.coverage === "unmapped"
      ? "统一 KG 没有足以独立诊断该成果的概念，建议新增待审概念。"
      : "已有概念只能覆盖组成部分或范围过宽，需要新增窄概念。",
    evidence_refs: evidence(outcome),
    review_status: "needs_review",
  }));

const gapSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  gap_set_id: "cgs_sg_seab_h2_physics_9478_2026_outcomes",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Physics",
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [{ version: "0.1.0", date: TODAY, summary_zh: "记录全部 partial 与 unmapped 物理概念缺口；实践要求不作为 KG 缺口。" }],
  candidates: gapCandidates,
};

const practiceItems = outcomes
  .filter((outcome) => outcome.coverage === "excluded")
  .map((outcome) => ({
    practice_id: `practice_sg_h2_physics_9478_2026_${outcome.topic}_${outcome.key}`,
    requirement_ids: [requirementId(outcome)],
    kind: outcome.topic === "practice" ? "inquiry_process" : "assessment_task",
    name: outcome.title,
    name_zh: outcome.titleZh,
    description_zh: outcome.summaryZh,
    instructional_use_zh: "以真实或模拟物理任务明确操作、表示、数据、风险和论证要求；让学习者保留可复核过程证据并解释局限。",
    assessment_evidence_zh: "提交可检查的实验计划、操作记录、图表、电子表格或物理表示；评价正确性、精密度、推理、安全与改进，而非只看最终数值。",
    evidence_refs: evidence(outcome),
    review_status: "needs_review",
  }));

const practiceSet = {
  schema_version: "1.0.0",
  content_version: "0.1.0",
  practice_set_id: "cpk_sg_seab_h2_physics_9478_2026",
  framework_id: FRAMEWORK_ID,
  curriculum_id: CURRICULUM_ID,
  subject: "Physics",
  source_ids: [SOURCE_ID],
  generated_at: TODAY,
  review_status: "needs_review",
  changelog: [{ version: "0.1.0", date: TODAY, summary_zh: `将 ${practiceItems.length} 项估测、表示、实验与电子表格要求分流到教学和评测知识层。` }],
  items: practiceItems,
};

const sourceRegistry = JSON.parse(readFileSync(paths.sources, "utf8"));
const source = sourceRegistry.sources.find((candidate) => candidate.source_id === SOURCE_ID);
if (!source) throw new Error(`Missing source ${SOURCE_ID}`);
source.document_url = "https://www.seab.gov.sg/files/A%20Level%20Syllabus%20Sch%20Cddts/2026/9478_y26_sy.pdf";
source.retrieved_at = TODAY;
source.notes_zh = "2026 学校考生官方 PDF 已通过内置浏览器及 isomer 内容地址复核；仓库仅保存元数据、校验值、页码定位和中文释义。";

const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
writeJson(paths.framework, framework);
writeJson(paths.mapping, mappingSet);
writeJson(paths.gaps, gapSet);
writeJson(paths.practices, practiceSet);
writeJson(paths.sources, sourceRegistry);

const counts = mappings.reduce((result, mapping) => {
  result[mapping.coverage_status] = (result[mapping.coverage_status] ?? 0) + 1;
  return result;
}, {});
process.stdout.write(`[upgrade-sg-h2-physics] ${outcomes.length} requirements; ${counts.full ?? 0} full, ${counts.partial ?? 0} partial, ${counts.unmapped ?? 0} unmapped, ${counts.excluded ?? 0} excluded; ${gapCandidates.length} gaps; ${practiceItems.length} practices\n`);
