# Notes

## Strengths
- Strong educational composition: A, B, and resultant vectors are color-coded and explained with head-to-tail and parallelogram cues.
- Rich but compact readout panel with live vector components and magnitudes.
- Polished science-instrument visual style with clear title, legend, axis ticks, and labels.

## Interaction Model
- Native pointer drag controls rotate the camera; wheel zoom is supported.
- Sliders update vector components in real time.
- Reset restores vectors and camera state.

## Renderer Dependencies
- Uses Three.js as an ES module via an import map from `https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.min.js`.
- Does not rely on external OrbitControls; drag, zoom, resize, and reset behavior are implemented manually.
- Pulls Google Fonts, so full visual fidelity depends on external font access.

## Primoria Compatibility Risks
- Module import maps and external font links may need sanitizer/renderer support.
- The widget assumes full-viewport sizing and `overflow: hidden`; Primoria chat-card embedding may require container-scoped dimensions.
- Styling is elaborate and could conflict if injected without iframe or shadow isolation.
