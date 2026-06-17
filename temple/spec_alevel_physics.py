#!/usr/bin/env python3
"""A-Level Physics — CIE 9702 coverage."""
import os
from kg_en_builder import build

T = [
 ("phy_measurement","Physical Quantities and Units",[
   ("phy_si_units","SI Base Units","The seven SI base quantities and their units, and derived units."),
   ("phy_homogeneity","Homogeneity of Equations","Checking physical equations via consistency of units."),
   ("phy_scalars_vectors","Scalars and Vectors","Distinction between scalar and vector quantities and vector resolution."),
   ("phy_uncertainty","Errors and Uncertainties","Systematic vs random errors; absolute, fractional, percentage uncertainty."),
   ("phy_combine_uncertainty","Combining Uncertainties","Propagating uncertainties through sums, products and powers."),
 ]),
 ("phy_kinematics","Kinematics",[
   ("phy_motion_quantities","Displacement Velocity Acceleration","Defining displacement, speed, velocity and acceleration."),
   ("phy_suvat","Equations of Motion","SUVAT equations for uniform acceleration."),
   ("phy_motion_graphs","Motion Graphs","Interpreting displacement-time and velocity-time graphs."),
   ("phy_free_fall","Free Fall","Motion under gravity and acceleration of free fall g."),
   ("phy_projectile","Projectile Motion","Independent horizontal and vertical components of 2D motion."),
 ]),
 ("phy_dynamics","Dynamics",[
   ("phy_newton_laws","Newton's Laws of Motion","The three laws relating force, mass and acceleration."),
   ("phy_mass_weight","Mass and Weight","Distinction between mass and gravitational weight W=mg."),
   ("phy_momentum","Linear Momentum","Momentum p=mv as a vector quantity."),
   ("phy_momentum_conservation","Conservation of Momentum","Total momentum conserved in an isolated system."),
   ("phy_impulse","Impulse and Collisions","Impulse Ft=Δp; elastic and inelastic collisions."),
 ]),
 ("phy_forces","Forces, Density and Pressure",[
   ("phy_force_types","Types of Force","Weight, tension, friction, normal contact and drag forces."),
   ("phy_moments","Moments and Couples","Turning effect of forces and the principle of moments."),
   ("phy_equilibrium","Equilibrium of Forces","Conditions for translational and rotational equilibrium."),
   ("phy_density_pressure","Density and Pressure","Density ρ=m/V and pressure p=F/A including fluid pressure."),
   ("phy_upthrust","Upthrust and Archimedes","Buoyancy force from pressure difference in a fluid."),
 ]),
 ("phy_work_energy","Work, Energy and Power",[
   ("phy_work","Work Done","Work as force times displacement in the force direction."),
   ("phy_ke_pe","Kinetic and Potential Energy","KE=½mv² and gravitational PE=mgh."),
   ("phy_energy_conservation","Conservation of Energy","Energy transformations and conservation in a closed system."),
   ("phy_power_efficiency","Power and Efficiency","Power as rate of energy transfer; efficiency of transfers."),
 ]),
 ("phy_deformation","Deformation of Solids",[
   ("phy_hookes_law","Hooke's Law","Proportionality of extension to load below the limit."),
   ("phy_stress_strain","Stress, Strain and Young Modulus","Tensile stress, strain and the Young modulus E."),
   ("phy_elastic_plastic","Elastic and Plastic Behaviour","Elastic limit, yield and permanent deformation."),
   ("phy_strain_energy","Elastic Strain Energy","Energy stored in a deformed material from the load-extension graph."),
 ]),
 ("phy_waves","Waves",[
   ("phy_progressive_waves","Progressive Waves","Wave parameters: amplitude, wavelength, frequency, speed v=fλ."),
   ("phy_wave_types","Transverse and Longitudinal Waves","Oscillation direction relative to energy propagation."),
   ("phy_intensity","Wave Intensity","Intensity proportional to amplitude squared and inverse-square spread."),
   ("phy_em_spectrum","Electromagnetic Spectrum","Ordering and properties of EM radiation regions."),
   ("phy_doppler","Doppler Effect","Frequency shift from relative source-observer motion."),
 ]),
 ("phy_superposition","Superposition",[
   ("phy_superposition_principle","Principle of Superposition","Resultant displacement as the sum of overlapping waves."),
   ("phy_interference","Two-Source Interference","Coherent sources producing constructive/destructive fringes."),
   ("phy_diffraction","Diffraction","Wave spreading at apertures and single-slit pattern."),
   ("phy_diffraction_grating","Diffraction Grating","dsinθ=nλ for multiple-slit interference maxima."),
   ("phy_stationary_waves","Stationary Waves","Nodes and antinodes from two opposed travelling waves."),
 ]),
 ("phy_electricity","Current of Electricity",[
   ("phy_current_charge","Electric Current and Charge","Current as rate of charge flow Q=It."),
   ("phy_pd_emf","Potential Difference and EMF","Energy per unit charge transferred and supplied."),
   ("phy_resistance_ohm","Resistance and Ohm's Law","R=V/I and ohmic behaviour."),
   ("phy_resistivity","Resistivity","R=ρL/A relating resistance to material and geometry."),
   ("phy_iv_characteristics","I-V Characteristics","I-V graphs for resistor, filament lamp and diode."),
 ]),
 ("phy_dc_circuits","DC Circuits",[
   ("phy_kirchhoff","Kirchhoff's Laws","Conservation of charge and energy in circuits."),
   ("phy_series_parallel","Series and Parallel Resistors","Combining resistances in networks."),
   ("phy_potential_divider","Potential Dividers","Splitting voltage in proportion to resistance."),
   ("phy_internal_resistance","Internal Resistance","EMF, terminal pd and lost volts in a source."),
 ]),
 ("phy_circular","Motion in a Circle",[
   ("phy_angular_speed","Radian Measure and Angular Speed","Angles in radians and angular velocity ω."),
   ("phy_centripetal_accel","Centripetal Acceleration","Acceleration a=v²/r directed to the centre."),
   ("phy_centripetal_force","Centripetal Force","Net inward force F=mv²/r for circular motion."),
 ]),
 ("phy_gravitation","Gravitational Fields",[
   ("phy_newton_gravitation","Newton's Law of Gravitation","Inverse-square attraction F=Gm₁m₂/r²."),
   ("phy_grav_field_strength","Gravitational Field Strength","Field g as force per unit mass."),
   ("phy_grav_potential","Gravitational Potential","Potential energy per unit mass and potential wells."),
   ("phy_orbits","Orbital Motion","Satellites and Kepler-type relations from gravity as centripetal force."),
 ]),
 ("phy_oscillations","Oscillations",[
   ("phy_shm","Simple Harmonic Motion","Acceleration proportional and opposite to displacement."),
   ("phy_shm_energy","SHM Energy","Interchange of kinetic and potential energy in SHM."),
   ("phy_damping","Damping","Light, critical and heavy damping of oscillations."),
   ("phy_resonance","Resonance","Large amplitude when driving frequency matches natural frequency."),
 ]),
 ("phy_thermal","Thermal Physics and Ideal Gases",[
   ("phy_temperature","Temperature and Thermal Equilibrium","Thermodynamic temperature and equilibrium of bodies."),
   ("phy_heat_capacity","Specific Heat and Latent Heat","Energy for temperature change and phase change."),
   ("phy_kinetic_theory","Kinetic Theory of Gases","Molecular model linking pressure to molecular motion."),
   ("phy_ideal_gas","Ideal Gas Law","pV=nRT and the equation of state."),
   ("phy_internal_energy","Internal Energy and First Law","Internal energy and ΔU=q+W."),
 ]),
 ("phy_electric_fields","Electric Fields",[
   ("phy_coulomb","Coulomb's Law","Inverse-square force between point charges."),
   ("phy_e_field_strength","Electric Field Strength","Field E as force per unit positive charge."),
   ("phy_e_potential","Electric Potential","Potential energy per unit charge in a field."),
   ("phy_field_analogy","Gravitational and Electric Field Analogy","Comparing the two inverse-square fields."),
 ]),
 ("phy_capacitance","Capacitance",[
   ("phy_capacitance_def","Capacitance","Charge stored per unit voltage C=Q/V."),
   ("phy_capacitor_networks","Capacitors in Series and Parallel","Combining capacitances in networks."),
   ("phy_capacitor_energy","Energy Stored in a Capacitor","Energy ½QV stored in the electric field."),
   ("phy_capacitor_discharge","Charging and Discharging","Exponential RC charge and discharge behaviour."),
 ]),
 ("phy_magnetic_fields","Magnetic Fields",[
   ("phy_flux_density","Magnetic Flux Density","Field B and the tesla defined via force."),
   ("phy_force_conductor","Force on a Current-Carrying Conductor","F=BIL sinθ on a wire in a field."),
   ("phy_force_charge","Force on a Moving Charge","F=BQv sinθ and circular paths of charges."),
   ("phy_fields_currents","Magnetic Fields Due to Currents","Fields around wires, coils and solenoids."),
 ]),
 ("phy_induction","Electromagnetic Induction",[
   ("phy_flux_linkage","Magnetic Flux and Flux Linkage","Flux Φ=BA and flux linkage NΦ."),
   ("phy_faraday","Faraday's Law","Induced EMF proportional to rate of change of flux linkage."),
   ("phy_lenz","Lenz's Law","Induced effects oppose the change producing them."),
 ]),
 ("phy_ac","Alternating Currents",[
   ("phy_ac_rms","AC and RMS Values","Sinusoidal AC and root-mean-square values."),
   ("phy_transformers","Transformers","Voltage transformation via mutual induction."),
   ("phy_rectification","Rectification","Converting AC to DC with diodes and smoothing."),
 ]),
 ("phy_quantum","Quantum Physics",[
   ("phy_photon","Photon Energy","Quantised light with E=hf."),
   ("phy_photoelectric","Photoelectric Effect","Electron emission, work function and threshold frequency."),
   ("phy_wave_particle","Wave-Particle Duality","de Broglie wavelength and electron diffraction."),
   ("phy_energy_levels","Energy Levels and Line Spectra","Discrete atomic levels producing emission/absorption lines."),
 ]),
 ("phy_nuclear","Nuclear Physics",[
   ("phy_nuclear_structure","Atomic and Nuclear Structure","Nucleons, isotopes and the nuclear model."),
   ("phy_fundamental_particles","Fundamental Particles and Quarks","Leptons, hadrons and quark composition."),
   ("phy_binding_energy","Mass Defect and Binding Energy","E=mc² and nuclear binding energy."),
   ("phy_radioactive_decay","Radioactive Decay","Alpha, beta, gamma emission and randomness."),
   ("phy_half_life","Half-Life","Exponential decay and the decay constant."),
 ]),
 ("phy_astro","Astronomy and Cosmology",[
   ("phy_luminosity","Luminosity and Radiant Flux Intensity","Power output of a star and observed flux."),
   ("phy_standard_candles","Standard Candles","Objects of known luminosity used for distance."),
   ("phy_stellar_radii","Stellar Radii","Wien's law and Stefan-Boltzmann to find radius."),
   ("phy_hubble","Hubble's Law and the Big Bang","Redshift-distance relation and cosmic expansion."),
 ]),
]

EDGES = [
 ("phy_scalars_vectors","phy_motion_quantities","hard"),
 ("phy_suvat","phy_projectile","hard"),
 ("phy_suvat","phy_newton_laws","hard"),
 ("phy_newton_laws","phy_momentum","hard"),
 ("phy_newton_laws","phy_force_types","hard"),
 ("phy_force_types","phy_equilibrium","hard"),
 ("phy_newton_laws","phy_work","hard"),
 ("phy_work","phy_ke_pe","hard"),
 ("phy_force_types","phy_hookes_law","hard"),
 ("phy_ke_pe","phy_strain_energy","soft"),
 ("phy_progressive_waves","phy_superposition_principle","hard"),
 ("phy_resistance_ohm","phy_kirchhoff","hard"),
 ("phy_resistance_ohm","phy_iv_characteristics","soft"),
 ("phy_suvat","phy_angular_speed","hard"),
 ("phy_newton_laws","phy_centripetal_force","hard"),
 ("phy_centripetal_force","phy_orbits","hard"),
 ("phy_newton_gravitation","phy_grav_field_strength","hard"),
 ("phy_centripetal_force","phy_shm","hard"),
 ("phy_energy_conservation","phy_shm_energy","soft"),
 ("phy_momentum_conservation","phy_kinetic_theory","soft"),
 ("phy_coulomb","phy_e_field_strength","hard"),
 ("phy_pd_emf","phy_e_potential","hard"),
 ("phy_grav_field_strength","phy_field_analogy","hard"),
 ("phy_e_field_strength","phy_field_analogy","hard"),
 ("phy_e_potential","phy_capacitance_def","hard"),
 ("phy_current_charge","phy_force_conductor","hard"),
 ("phy_flux_density","phy_flux_linkage","hard"),
 ("phy_faraday","phy_transformers","hard"),
 ("phy_ac_rms","phy_transformers","soft"),
 ("phy_em_spectrum","phy_photon","hard"),
 ("phy_photon","phy_energy_levels","hard"),
 ("phy_nuclear_structure","phy_binding_energy","hard"),
 ("phy_radioactive_decay","phy_half_life","hard"),
 ("phy_intensity","phy_luminosity","hard"),
 ("phy_energy_levels","phy_standard_candles","soft"),
]

spec = {"id":"alevel_physics","subject":"A-Level Physics (CIE 9702)",
        "topics":[{"id":i,"name":n,"concepts":c} for (i,n,c) in T],"edges":EDGES}

if __name__ == "__main__":
    build(spec, os.path.join(os.path.dirname(__file__), "a_level_physics.json"))
