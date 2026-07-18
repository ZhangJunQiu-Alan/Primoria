# A-Level 物理 30 项缺口批准记录

- 图：`a_level_physics`
- 来源：[`src_cambridge_9702_2025_2027`](https://www.cambridgeinternational.org/Images/664565-2025-2027-syllabus.pdf)，Cambridge 9702，2025–2027，Version 1
- 状态：`approved`，已应用于 `a_level_physics` content version `1.1.0`
- 结论：30 项已核实缺口由 17 个 Concept 节点、3 个现有 Concept 扩充和 2 个 Skill/资料映射覆盖
- canonical 变化：新增 15 个 canonical concept；复用 2 个现有跨图 canonical ID
- 边界：本次只批准下列 30 项缺口、对应结构和先修边；其余物理节点、边和 syllabus 映射仍保持原审核状态。未写数据库，未执行 embeddings，不改变 Tutor UI、API 或课程行为

## 30 项处理总表

| 官方要求 | 页 | 审核结论 | 对应提案 |
|---|---:|---|---|
| `9702:3.2:3` | 18 | 新增 Concept | D1 终端速度 |
| `9702:4.1:1` | 18 | 新增 Concept | D2 重心 |
| `9702:7.1:3` | 20 | 改为技能映射，不新增 Concept | D3 示波器读数技能 |
| `9702:7.5:2` | 21 | 新增 Concept | D4 偏振与 Malus 定律 |
| `9702:9.3:7`、`9702:9.3:8` | 23 | 合并为一个可教学 Concept | D5 电阻式传感器 |
| `9702:10.1:1` | 24 | 改为资料/技能映射，不新增 Concept | D6 电路符号识读 |
| `9702:10.3:3` | 24 | 新增 Concept | D7 电位计零示法 |
| `9702:11.1:4` | 25 | 复用化学图 canonical ID | D8 同位素 |
| `9702:11.1:6`、`9702:11.1:10` | 25 | 扩充现有 `phy_radioactive_decay` | D9 核衰变守恒与 β 能谱 |
| `9702:11.1:12` | 25 | 扩充现有 `phy_binding_energy` | D10 统一原子质量单位 |
| `9702:14.2:1`、`9702:14.2:2` | 27 | 合并为一个可教学 Concept | D11 测温与热力学温标 |
| `9702:15.1:2` | 28 | 复用化学图 canonical ID | D12 摩尔与阿伏伽德罗常数 |
| `9702:15.2:3` | 28 | 扩充现有 `phy_ideal_gas` | D13 Boltzmann 常数关系 |
| `9702:20.3:3` | 33 | 新增 Concept | D14 Hall 效应与 Hall 电压 |
| `9702:24.1:1`、`9702:24.1:2`、`9702:24.1:3`、`9702:24.1:4`、`9702:24.1:5`、`9702:24.1:6` | 37 | 合并为三个 Concept | D15 医用超声 |
| `9702:24.2:1`、`9702:24.2:2`、`9702:24.2:3`、`9702:24.2:4` | 37 | 合并为三个 Concept | D16 X 射线与 CT |
| `9702:24.3:1`、`9702:24.3:3`、`9702:24.3:4` | 38 | 合并为两个 Concept | D17 放射性示踪与 PET |

## 逐项审批

### D1 终端速度

- 官方证据：PDF 第 18 页，`3.2 outcome 3`
- 当前状态：`phy_free_fall` 明确限定为仅受重力，现有 KG 没有阻力随速度增大、合力趋零和终端速度的概念。
- legacy ID：`phy_terminal_velocity`
- 候选 canonical ID：`pc_1ad3a12473bd85820c3de1fd0ab09289`
- 中文名：阻力与终端速度
- 建议描述：物体受随速度增大的阻力运动时，加速度随合力减小；阻力与驱动力平衡后合力和加速度为零，物体达到恒定终端速度。
- Topic：加入 `phy_dynamics`，与牛顿定律、质量与重量组成 3 个 Concept；原 `phy_momentum` 移入动量 Topic，使课程顺序与 `phy_newton_laws -> phy_terminal_velocity` 的硬先修边一致。
- 建议先修边：`phy_newton_laws -> phy_terminal_velocity`，`hard`。
- 审核判断：不能并入“自由落体”，否则会混淆“仅受重力”和“有阻力的非匀变速运动”。

### D2 重心

- 官方证据：PDF 第 18 页，`4.1 outcome 1`
- 当前状态：`phy_mass_weight` 区分质量和重量，`phy_moments` 处理力矩，但两者都没有说明物体重量可等效作用于重心这一点。
- legacy ID：`phy_centre_of_gravity`
- 候选 canonical ID：`pc_54e1fdd3b99c063adf13824a8a30e859`
- 中文名：重心
- 建议描述：把物体的总重量等效为作用在单一点上的力，该点称为重心，并用其位置分析平衡、稳定性和重量产生的力矩。
- Topic：加入 `phy_momentum_forces_phy_force_types`，改名为“力的类型、重心、力矩与力偶”，Concept 数由 2 增至 3。
- 建议先修边：`phy_mass_weight -> phy_centre_of_gravity`，`hard`；`phy_centre_of_gravity -> phy_moments`，`hard`。

### D3 示波器读数技能

- 官方证据：PDF 第 20 页，`7.1 outcome 3`
- 当前状态：要求是使用 CRO 的时基和 Y 增益读取周期、频率和振幅，核心是仪器读数步骤，不是新的物理实体或原理。
- 建议处理：把要求从 `concept` 改为 `concept_and_skill` / `skill_mapping_required`。
- 建议 Skill ID：`skill_phy_oscilloscope_measurement`
- 背景 Concept：`phy_progressive_waves`
- 技能描述：根据 time-base 和 y-gain 刻度读取周期与振幅，换算频率，并正确处理格数、单位和峰峰值。
- 审核判断：不新增 `Oscilloscope` Concept，避免把实验仪器操作误建成知识概念。

### D4 偏振与 Malus 定律

- 官方证据：PDF 第 21 页，`7.5 outcomes 1–2`
- 当前状态：现有波动 KG 没有偏振现象或 Malus 定律。
- legacy ID：`phy_polarisation_malus`
- 候选 canonical ID：`pc_41715b915f7a8d30aed7d80079b4bdf9`
- 中文名：偏振与 Malus 定律
- 建议描述：偏振是横波的特性；对平面偏振电磁波通过一个或多个偏振片，使用 `I = I0 cos²θ` 计算透射强度。
- Topic：加入 `phy_waves_superposition`，改名为“电磁波谱、偏振与多普勒效应”，Concept 数由 2 增至 3。
- 建议先修边：`phy_wave_types -> phy_polarisation_malus`，`hard`。
- 明确排除：不扩展到“非偏振光通过第一片偏振片后强度减半”，因为 syllabus 明确不要求该计算。

### D5 电阻式传感器

- 官方证据：PDF 第 23 页，`9.3 outcomes 7–8`
- 当前状态：`phy_iv_characteristics` 只覆盖电阻器、灯丝灯和二极管的 I–V 特性，没有 LDR 或 NTC 热敏电阻的环境响应。
- legacy ID：`phy_resistive_sensors`
- 候选 canonical ID：`pc_59edde8ba6869a6d649ea0bead7ef1d5`
- 中文名：电阻式传感器
- 建议描述：LDR 的电阻随光强增加而减小；负温度系数热敏电阻的电阻随温度增加而减小，并能把两者用于分压传感电路。
- Topic：新建 `phy_component_sensors`（“元件特性与电阻式传感器”），包含移入的 `phy_iv_characteristics` 与 `phy_resistive_sensors`。
- 结构影响：`phy_circuits_kirchhoff` 移出 `phy_iv_characteristics`，并接收 `phy_series_parallel`，形成电阻率、Kirchhoff 定律和电路组合三个 Concept。
- 建议先修边：`phy_resistance_ohm -> phy_resistive_sensors`，`hard`；`phy_resistive_sensors -> phy_potential_divider`，`soft`。
- 审核判断：LDR 与 NTC 的变化规律属于同一传感器教学单元，不应拆成两个过细节点。

### D6 电路符号识读

- 官方证据：PDF 第 24 页，`10.1 outcomes 1–2`
- 当前状态：要求引用 syllabus 中的标准符号表，属于受控词表和图示识读，不是因果性知识概念。
- 建议处理：把 `9702:10.1:1` 从 Concept 缺口改为 `skill_mapping_required`，并把 outcome 1–2 统一映射到符号资料表。
- 建议 Skill ID：`skill_phy_circuit_symbol_literacy`
- 建议资料 ID：`ref_cambridge_9702_circuit_symbols`
- 背景 Topic：`phy_dc_circuits`
- 审核判断：不创建“Circuit Symbols” Concept；正式资料库只保存符号名称、用途和 syllabus 定位，不复制版权受限页面。

### D7 电位计零示法

- 官方证据：PDF 第 24 页，`10.3 outcomes 2–3`
- 当前状态：`phy_potential_divider` 没有电位计比较电势差和电流计零读数的平衡判据。
- legacy ID：`phy_potentiometer_null_methods`
- 候选 canonical ID：`pc_0c51811f60a36b85bf85a979c93ee3b9`
- 中文名：电位计与零示法
- 建议描述：用电位计比较电势差，并用电流计零读数判定待测支路无电流、达到平衡，从而进行不加载被测源的比较测量。
- Topic：保留在 `phy_dc_circuits`，该 Topic 调整为分压器、电位计零示法和内阻三个 Concept。
- 结构影响：`phy_series_parallel` 移入前一个 `phy_circuits_kirchhoff` Topic，保证现有 `phy_potential_divider -> phy_internal_resistance` 先修边与课程顺序一致。
- 建议先修边：`phy_potential_divider -> phy_potentiometer_null_methods`，`hard`。

### D8 同位素

- 官方证据：PDF 第 25 页，`11.1 outcome 4`
- 当前状态：物理图有原子核结构，但没有明确同元素、质子数相同、中子数不同的同位素定义。
- legacy ID：`phy_isotopes`
- 复用 canonical ID：`pc_6a27f090d384dbc6be61017193c58dae`
- 现有 alias：`a_level_chemistry + che_isotopes`
- 中文名：同位素
- Topic：新建 `phy_nuclear_identity`（“原子核结构与同位素”），包含移入的 `phy_nuclear_structure` 与 `phy_isotopes`。
- 结构影响：原 `phy_nuclear` 保留基本粒子和结合能两个 Concept，并改为“基本粒子与核结合”。
- 建议先修边：`phy_nuclear_structure -> phy_isotopes`，`hard`；`phy_isotopes -> phy_radioactive_decay`，`soft`。
- 审核判断：与化学图概念完全同义，应共享 canonical ID，不能创建物理专用重复概念。

### D9 核衰变守恒与 β 能谱

- 官方证据：PDF 第 25 页，`11.1 outcomes 6, 9–11`
- 当前状态：`phy_radioactive_decay` 已覆盖 α、β、γ 衰变，但没有核子数/电荷守恒，也没有用中微子或反中微子分担能量解释 β 粒子连续能谱。
- 建议处理：扩充现有 `phy_radioactive_decay`，不新增 canonical ID。
- 现有 canonical ID：`pc_3e8b875dc1b24a5df264e9dc062a1087`
- 建议新增范围：配平衰变方程时核子数与电荷守恒；β 衰变中能量由 β 粒子、（反）中微子及反冲核分担，因此 β 粒子能量连续。
- 审核判断：这些是“放射性衰变”概念的必要内部内容，另建两个节点会过细。

### D10 统一原子质量单位

- 官方证据：PDF 第 25 页，`11.1 outcome 12`
- 当前状态：`phy_binding_energy` 涉及核质量和质量亏损，但没有说明统一原子质量单位 `u`。
- 建议处理：扩充现有 `phy_binding_energy` 的定义与计算边界，不新增 Concept。
- 现有 canonical ID：`pc_9f2be083a041085b002a4e3208749f17`
- 建议新增范围：把 `u` 作为原子和核质量单位，并能在质量亏损与结合能计算中使用。
- 审核判断：`u` 是该概念的单位资料，不具备独立先修关系或独立诊断价值。

### D11 测温与热力学温标

- 官方证据：PDF 第 27 页，`14.2 outcomes 1–2`
- 当前状态：`phy_temperature` 只描述温度和热平衡，没有测温属性或热力学温标独立性。
- legacy ID：`phy_thermometry`
- 候选 canonical ID：`pc_7c00ff3302b6021a295db1e9a2329b32`
- 中文名：测温与热力学温标
- 建议描述：利用随温度单调变化的物理属性测温，例如液体密度、定压气体体积、金属电阻和热电偶电动势；理解热力学温标不依赖任何特定物质属性。
- Topic：加入 `phy_thermal`，改名为“温度、测温、比热与潜热”，Concept 数由 2 增至 3。
- 建议先修边：`phy_temperature -> phy_thermometry`，`hard`。
- 审核判断：两个 outcome 共同构成“如何定义和实现温标”的单一教学单元。

### D12 摩尔与阿伏伽德罗常数

- 官方证据：PDF 第 28 页，`15.1 outcomes 1–2`
- 当前状态：物理图的理想气体 Concept 使用摩尔数，但没有定义摩尔或阿伏伽德罗常数。
- legacy ID：`phy_mole_avogadro`
- 复用 canonical ID：`pc_df12800116ac8b3b4f1232118ed6a5e6`
- 现有 alias：`a_level_chemistry + che_mole`
- 中文名：摩尔与阿伏伽德罗常数
- Topic：`phy_thermal_phy_kinetic_theory` 调整为“物质的量与气体动理论”，包含 `phy_mole_avogadro` 和 `phy_kinetic_theory`；新建 `phy_amount_ideal_gas`，包含 `phy_ideal_gas` 与 `phy_internal_energy`。
- 结构影响：这样同时满足 `phy_mole_avogadro -> phy_ideal_gas`、`phy_kinetic_theory -> phy_ideal_gas -> phy_internal_energy` 三条先修边，并保持每个 Topic 2 个 Concept。
- 建议先修边：`phy_mole_avogadro -> phy_ideal_gas`，`hard`。
- 审核判断：与化学图完全同义，应共享 canonical ID。

### D13 Boltzmann 常数关系

- 官方证据：PDF 第 28 页，`15.2 outcomes 2–3`
- 当前状态：`phy_ideal_gas` 只有 `pV=nRT`，没有分子形式 `pV=NkT` 或 `k=R/NA`。
- 建议处理：扩充现有 `phy_ideal_gas`，不新增 Concept。
- 现有 canonical ID：`pc_5cccaa716cd0dc884949fd601339e85a`
- 建议新增范围：连接摩尔形式与分子形式的理想气体方程，并说明 Boltzmann 常数是气体常数除以阿伏伽德罗常数。
- 审核判断：单独建立“Boltzmann Constant”节点会把一个状态方程中的常数关系拆得过细。

### D14 Hall 效应与 Hall 电压

- 官方证据：PDF 第 33 页，`20.3 outcomes 3–4`
- 当前状态：`phy_force_charge` 有运动电荷受磁力，但没有载流子横向偏转、电荷分离、Hall 电压或 Hall 探头。
- legacy ID：`phy_hall_effect`
- 候选 canonical ID：`pc_0ac1a9b423ea23707f535871282ddf9d`
- 中文名：Hall 效应与 Hall 电压
- 建议描述：载流子在磁场中受力后横向分离形成 Hall 电压，推导并使用 `VH = BI/(ntq)`，并说明 Hall 探头如何测量磁通密度。
- Topic：加入 `phy_magnetic_fields_phy_force_charge`，改名为“运动电荷受力、Hall 效应与电流磁场”，Concept 数由 2 增至 3。
- 建议先修边：`phy_current_charge -> phy_hall_effect`，`hard`；`phy_force_charge -> phy_hall_effect`，`hard`。

### D15 医用超声

- 官方证据：PDF 第 37 页，`24.1 outcomes 1–6`
- 当前状态：现有 KG 完全没有医用超声 Topic。
- 建议新建 Topic：`phy_medical_ultrasound`（“超声产生、传播与成像”），包含 3 个 Concept：

| legacy ID | canonical ID | 中文名 | 覆盖范围 |
|---|---|---|---|
| `phy_piezoelectric_transducers` | `pc_9bfa90f4f0e62f22164bf8d5f49cef3b` | 压电换能器 | 压电晶体的正/逆压电效应，以及超声的产生和探测 |
| `phy_acoustic_impedance_reflection` | `pc_8283fc122c0dcdf70d1539881fc664e5` | 声阻抗与反射 | `Z=ρc` 以及由两介质声阻抗计算强度反射系数 |
| `phy_ultrasound_imaging` | `pc_38daec8da1eb00994cb6759fb4c2a5a3` | 超声成像与衰减 | 组织边界回波形成诊断信息，以及 `I=I0e^-μx` 衰减 |

- 建议先修边：`phy_progressive_waves -> phy_piezoelectric_transducers`，`hard`；`phy_intensity -> phy_acoustic_impedance_reflection`，`hard`；前两个新 Concept 分别指向 `phy_ultrasound_imaging`，`hard`。
- 粒度判断：六个 outcome 合并为“换能、界面反射、图像形成”三个可独立教学和测评的单元。

### D16 X 射线与 CT

- 官方证据：PDF 第 37 页，`24.2 outcomes 1–4`
- 当前状态：现有 KG 没有 X 射线产生、医学成像或 CT。
- 建议新建 Topic：`phy_medical_xray`（“X 射线产生、成像与 CT”），包含 3 个 Concept：

| legacy ID | canonical ID | 中文名 | 覆盖范围 |
|---|---|---|---|
| `phy_xray_production` | `pc_cd3dcc59f05bc0705c28765075f69b15` | X 射线产生 | 电子经加速电势差轰击金属靶产生 X 射线，并求最短波长 |
| `phy_xray_imaging_attenuation` | `pc_eb39193da24e5800cd02924bbf38278d` | X 射线成像与衰减 | 组织吸收差异、造影剂和 `I=I0e^-μx` 衰减 |
| `phy_computed_tomography` | `pc_bc17c9604ad1de7da9815958b6e7c248` | 计算机断层成像 | 多角度投影重建二维切片并沿轴组合成三维图像 |

- 建议先修边：`phy_photon -> phy_xray_production`，`hard`；`phy_xray_production -> phy_xray_imaging_attenuation`，`hard`；`phy_xray_imaging_attenuation -> phy_computed_tomography`，`hard`。
- 不合并项：超声和 X 射线都使用指数衰减形式，但介质相互作用、设备和成像解释不同，不应仅因公式相似就共享 canonical ID。

### D17 放射性示踪与 PET

- 官方证据：PDF 第 38 页，`24.3 outcomes 1–6`
- 当前状态：现有 KG 有 β 衰变和基本粒子背景，但没有示踪剂、电子-正电子湮灭或 PET 成像链路。
- 建议新建 Topic：`phy_medical_pet`（“放射性示踪与 PET 成像”），包含 2 个 Concept：

| legacy ID | canonical ID | 中文名 | 覆盖范围 |
|---|---|---|---|
| `phy_particle_antiparticle_annihilation` | `pc_5bb43a47a36ea2115f39947aa3de5f98` | 粒子-反粒子湮灭 | 质量-能量和动量守恒、电子-正电子湮灭及反向双光子 |
| `phy_radioactive_tracers_pet` | `pc_d38fd0bbafba10df5e4e54ab9a52c0fb` | 放射性示踪剂与 PET | 示踪剂选择性吸收、β+ 核素、符合探测和示踪剂浓度图像形成 |

- 建议先修边：`phy_fundamental_particles -> phy_particle_antiparticle_annihilation`，`hard`；`phy_radioactive_decay -> phy_radioactive_tracers_pet`，`hard`；`phy_particle_antiparticle_annihilation -> phy_radioactive_tracers_pet`，`hard`。
- 粒度判断：PET 的核素来源与图像链路属于一个 Concept，湮灭守恒与双光子属于另一个 Concept。

## Topic 结构变化

| Topic | 变更后 Concept | 数量 | 结构影响 |
|---|---|---:|---|
| `phy_measurement_motion_phy_motion_quantities` | 运动量；运动方程 | 2 | 保留原边界 |
| `phy_dynamics` | 牛顿定律；质量与重量；终端速度 | 3 | 接收终端速度，移出动量 |
| `phy_momentum_forces` | 动量；动量守恒；冲量 | 3 | 接收原 `phy_momentum` |
| `phy_momentum_forces_phy_force_types` | 力的类型；重心；力矩与力偶 | 3 | 改名 |
| `phy_waves_superposition` | 电磁波谱；偏振与 Malus 定律；多普勒效应 | 3 | 改名 |
| `phy_circuits_kirchhoff` | 电阻率；基尔霍夫定律；串并联电阻 | 3 | 移出 I–V 特性，接收串并联电阻 |
| `phy_component_sensors` | I–V 特性；电阻式传感器 | 2 | 新 Topic |
| `phy_dc_circuits` | 分压器；电位计与零示法；内阻 | 3 | 保留 Topic，调整内部结构 |
| `phy_thermal` | 温度与热平衡；测温；比热与潜热 | 3 | 改名 |
| `phy_thermal_phy_kinetic_theory` | 摩尔与阿伏伽德罗常数；气体动理论 | 2 | 接收摩尔概念 |
| `phy_amount_ideal_gas` | 理想气体定律；内能与第一定律 | 2 | 新 Topic |
| `phy_magnetic_fields_phy_force_charge` | 运动电荷受力；Hall 效应；电流磁场 | 3 | 改名 |
| `phy_nuclear_identity` | 原子核结构；同位素 | 2 | 新 Topic |
| `phy_nuclear` | 基本粒子与夸克；质量亏损与结合能 | 2 | 移出原子核结构并改名 |
| `phy_medical_ultrasound` | 压电换能器；声阻抗与反射；超声成像与衰减 | 3 | 新 Topic |
| `phy_medical_xray` | X 射线产生；X 射线成像与衰减；CT | 3 | 新 Topic |
| `phy_medical_pet` | 粒子-反粒子湮灭；放射性示踪剂与 PET | 2 | 新 Topic |

Topic 数已由 40 增至 46，Concept 数已由 95 增至 112。所有现有 legacy ID 均保留；只有 Topic 归属、名称或顺序按上表调整。最初提案中的第 47 个 Topic 在门禁中被发现会让课程顺序违反既有先修边，因此合并回现有 DC Circuits Topic。

## 不新增 Concept 的理由

- CRO 时基/Y 增益：属于仪器读数技能，可直接观察正确或错误的操作步骤。
- 电路符号：属于受控资料表和图示识读技能，不具备独立因果关系或先修结构。
- 核子数/电荷守恒与 β 连续能谱：是放射性衰变 Concept 的内部完整性要求。
- 统一原子质量单位：是质量亏损与结合能计算使用的单位资料。
- `k=R/NA`：是理想气体摩尔形式与分子形式之间的常数关系。

## 已应用范围

1. 17 个物理 alias 节点已写入正式物理图，其中 15 个创建 canonical registry 记录、2 个追加现有 canonical alias。
2. `phy_radioactive_decay`、`phy_binding_energy`、`phy_ideal_gas` 已扩充描述和页码级证据，但仍保持 `unreviewed`，避免把未逐项深审的整个旧节点误标为批准。
3. CRO 读数和电路符号两项已改为 Skill/资料映射，没有伪造新的 Concept 节点。
4. 6 个新 Topic、Topic 移动和 23 条批准先修边已应用，`a_level_physics` content version 提升为 `1.1.0`；门禁发现并纠正了 3 处“课程顺序早于先修概念”的提案结构矛盾。
5. 30 项 coverage 映射已更新为人工批准的 Concept 覆盖或技能映射，并保留机器可校验的人工审批记录。
6. 派生 topic graph 和仓库门禁按本次变更重建及验证；本轮不写共享数据库。

## Embeddings 发布清单

- 发布时必须对 `a_level_physics` 整图重建 embeddings。
- 新增 Concept：`phy_terminal_velocity`、`phy_centre_of_gravity`、`phy_polarisation_malus`、`phy_resistive_sensors`、`phy_potentiometer_null_methods`、`phy_isotopes`、`phy_thermometry`、`phy_mole_avogadro`、`phy_hall_effect`、3 个医用超声 Concept、3 个 X 射线/CT Concept、2 个 PET Concept。
- 描述扩充：`phy_radioactive_decay`、`phy_binding_energy`、`phy_ideal_gas`。
- 新增 Topic：`phy_component_sensors`、`phy_amount_ideal_gas`、`phy_nuclear_identity`、`phy_medical_ultrasound`、`phy_medical_xray`、`phy_medical_pet`。
- Topic 名称或归属变化：见上方 Topic 结构变化表；新增 23 条先修边。
- 本次未执行 embeddings，也未写任何数据库。

## 人工审批记录

- 审批日期：2026-07-18
- 审批人：Primoria 项目所有者
- 用户指令：物理 30 项全部批准
- 机器可校验记录：`data/knowledge-graphs/governance/review-decisions.json`
