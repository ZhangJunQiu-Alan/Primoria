# Notes

## Strengths
- Strong visual mapping for electromagnetism: red positive charge, blue negative charge, yellow vector samples, and separate field-line streams.
- The explanation panel connects the arrows to the idea of a positive test charge, which makes the visualization instructional rather than decorative.
- Good control density: charge magnitude sliders, vector/line toggles, position readouts, and reset.

## Interaction Model
- Supports orbit drag, wheel zoom, and direct charge dragging in the 3D scene.
- Dragging charges recalculates field vectors and field lines.
- Reset restores charge positions, magnitudes, visual toggles, and camera.

## Renderer Dependencies
- Uses Three.js as an ES module via import map from `https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.min.js`.
- Dragging, orbit, zoom, resize, and reset are custom pointer handlers.
- Uses canvas-generated text labels and CSS UI overlays.

## Primoria Compatibility Risks
- Requires reliable pointer event routing inside the embedded card for both camera orbit and charge dragging.
- Import maps and module scripts need renderer support.
- Full-screen CSS and extensive overlay styling should be isolated from the host app.
