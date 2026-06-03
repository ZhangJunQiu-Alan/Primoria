# Notes

## Strengths
- Strong mechanics teaching surface: predicted path, realized trace, apex marker, velocity vector, gravity vector, and kinematic readouts.
- Sliders immediately connect launch angle, initial speed, and bearing to range, max height, and flight time.
- Uses the third dimension meaningfully with a compass bearing control instead of a flat 2D parabola.

## Interaction Model
- Drag-to-rotate camera, wheel zoom, launch/play, reset, and parameter sliders.
- Reset restores both simulation parameters and camera state.
- Projectile animation shows velocity changing while gravity remains constant.

## Renderer Dependencies
- Uses Three.js as an ES module via import map from `https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.min.js`.
- Uses custom pointer controls and `ResizeObserver` for responsive sizing.
- Uses canvas texture labels and CSS overlay panels.

## Primoria Compatibility Risks
- Claude preview showed `THREE.Material: parameter 'color' has value of undefined`; the scene still rendered, but Primoria should surface console warnings during QA.
- Requires animation loop support and reliable ResizeObserver behavior in the embed.
- Module import maps and full-stage CSS need renderer isolation.
