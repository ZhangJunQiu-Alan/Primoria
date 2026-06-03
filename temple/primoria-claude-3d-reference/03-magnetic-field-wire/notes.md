# Notes

## Strengths
- Clear conceptual mapping: vertical wire, concentric magnetic loops, animated arrows, and a current direction arrow.
- Uses field strength readout to tie the visualization to `B = mu0 I / 2pi r`.
- Current direction toggle reverses the field arrows, reinforcing the right-hand rule.

## Interaction Model
- Drag-to-rotate camera with inertia, wheel zoom, current slider, direction toggle, and reset.
- Reset restores camera, current strength, and direction.
- Responsive layout hides or stacks secondary UI on narrower screens.

## Renderer Dependencies
- Uses Three.js as an ES module through an import map from `https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.min.js`.
- Does not use OrbitControls; camera interaction is custom pointer and wheel handling.
- Uses CSS overlays, glass-panel styling, and canvas textures for labels.

## Primoria Compatibility Risks
- Artifact download path came from the right-side artifact menu, so prompt output may vary between left-card and right-menu exports.
- Module import maps and external CDN access need renderer support.
- Full-stage layout and overlay panels should be iframe-contained for reliable chat-card embedding.
