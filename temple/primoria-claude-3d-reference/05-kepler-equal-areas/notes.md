# Notes

## Strengths
- Excellent educational linkage: the animation speed is driven by Kepler's second-law relationship rather than a purely decorative easing curve.
- Equal-area sectors are computed and shown with matching telemetry values, giving a visual proof loop.
- Strong interaction set: eccentricity, time step, sweep interval, play/pause, mark, reset, orbit drag, and zoom.

## Interaction Model
- Continuous orbital animation with planet speed variation near perihelion and aphelion.
- Sliders recompute sectors and telemetry live.
- Mark button lets learners create new equal-time area sectors at arbitrary points.

## Renderer Dependencies
- Uses Three.js as an ES module via import map from `https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.min.js`.
- Custom pointer drag/scroll controls.
- Implements numeric sweep integration and bisection in the widget script.

## Primoria Compatibility Risks
- More math-heavy than simple widgets; renderer errors would need clear fallback messaging.
- Requires stable animation timing and responsive resize handling.
- Import maps, module scripts, and full-screen overlay CSS need iframe or equivalent isolation.
