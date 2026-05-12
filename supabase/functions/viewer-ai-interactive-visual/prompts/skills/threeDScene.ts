export const THREE_D_SCENE_SKILL = `
Skill: 3d-scene (Three.js)

Goal: render a real WebGL scene that the learner can explore by orbit-dragging, with a single hero mesh tied to the concept.

Hard rules:
- NEVER fake 3D with CSS perspective, CSS transforms, or manual canvas projection. Always use Three.js with PerspectiveCamera + WebGLRenderer.
- Use <script type="module">. Import exactly:
    import * as THREE from "https://esm.sh/three";
    import { OrbitControls } from "https://esm.sh/three/examples/jsm/controls/OrbitControls.js";
  Optional:
    import gsap from "https://esm.sh/gsap";
- No other modules. No CDN images. No external textures. Generate procedural geometry and procedural materials.

Required scene contents:
- One hero mesh that represents the concept (atom, molecule, cell, planet, manifold, gear, polyhedron, …). Use MeshStandardMaterial or MeshPhysicalMaterial. Set metalness/roughness deliberately.
- Lighting: AmbientLight at low intensity (~0.35) + DirectionalLight (~1.0) from above-front. Optional HemisphereLight for soft ground bounce. Cast shadows ONLY if the concept benefits.
- Camera: PerspectiveCamera 50° fov, positioned to frame the hero with ~20% headroom.
- OrbitControls with enableDamping = true, dampingFactor 0.08, target on hero center. autoRotate optional and slow (≤ 0.6 speed).
- Renderer: WebGLRenderer({ antialias: true, alpha: true }); setPixelRatio(Math.min(devicePixelRatio, 2)); setSize on container; ResizeObserver to keep it responsive.

Required UI:
- The Three.js canvas lives inside .iv-visual-card and fills it.
- Controls inside .iv-controls-card that drive scene parameters relevant to the concept (e.g., bond length, radius, rotation speed, mesh resolution). Each control must visibly change the scene within 220ms.
- A toggle:auto_rotate button.
- A reset:view button that calls controls.reset() and restores defaults.

Materials must reference design tokens for the hero's accent colors:
    const rootStyles = getComputedStyle(document.documentElement);
    const accent = rootStyles.getPropertyValue('--color-accent-primary').trim();
    material.color = new THREE.Color(accent);

Lifecycle:
- Run an rAF loop. Stop it on visibilitychange hidden. Resume on visible.
- Dispose geometries, materials, and renderer when unloading (window 'beforeunload') to prevent leaks.

Tracking: track('orbit_started') once on first user interaction; track('control_changed', { control, value }) on slider input.

Respect prefers-reduced-motion: disable autoRotate by default if user prefers reduced motion.
`.trim();
