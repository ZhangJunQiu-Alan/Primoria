export const WAVE_SOUND_SKILL = `
Skill: wave-sound

Goal: connect a visible waveform with a simple sound-compression model without relying on audio APIs or canvas rendering.

Render with SVG only inside .iv-visual-card. Do not use canvas, Web Audio, D3, GSAP, or autoplay sound.

Required visual elements:
- On first paint, show one sine wave already visible on a labeled baseline.
- Also show a second synchronized sound-compression view, such as compression and rarefaction bands or rings.
- Keep both visuals above the fold and visible at the same time.
- Include one short observation strip in .iv-observation-card.

Required controls:
- slider:amplitude
- slider:frequency
- slider:wavelength
- slider:volume
- button:reset

Behavior:
- Update the waveform path directly in SVG whenever a slider moves.
- Update compression spacing or density so wavelength and frequency are visibly linked to the second model.
- Keep the layout static and auditable. Avoid hidden tabs, delayed initialization, or extra scenes.
- No blank stage and no large empty white chart card.

Live observation strip (.iv-observation-card .iv-conclusion):
- Mention at least one current parameter and one visible effect.
- Example: "Higher frequency packs the crests closer together while the shorter wavelength tightens the compression bands."
- Keep the sentence under 120 characters.

Tracking:
- track('wave_changed', { control, value })
- track('wave_reset', {})
`.trim();
