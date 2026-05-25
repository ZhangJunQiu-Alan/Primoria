export const WEATHER_CLIMATE_SKILL = `
Skill: weather-climate

Goal: compare short-term weather and long-term climate through one visible scene plus one compact baseline panel.

Use plain SVG, inline CSS, and vanilla JavaScript only. Do not use canvas, remote data, maps, GSAP, or autoplay animations.

Required visual elements:
- On first paint, show one region scene already visible with clouds, rainfall, wind, temperature, or sunlight cues.
- Show a separate climate-baseline panel for the selected region.
- Keep the weather scene and baseline visible together, without tabs or scrolling to find the main comparison.
- Include one short observation strip in .iv-observation-card.

Required controls:
- button-group:region
- select:season
- slider:temperature
- slider:precipitation
- slider:wind
- button:reset

Behavior:
- Keep all weather and climate data embedded locally.
- Weather controls should update the visible scene directly.
- Region changes should update the long-term baseline as well as the current scene defaults.
- Prefer a simplified comparison scene over a full map.

Live observation strip (.iv-observation-card .iv-conclusion):
- Compare today-like weather against the selected region's climate baseline.
- Example: "This day is warmer and wetter than the temperate baseline, showing how short-term weather can vary within the same climate."
- Keep the sentence under 120 characters.

Tracking:
- track('weather_region_changed', { region })
- track('weather_control_changed', { control, value, region })
- track('weather_reset', {})
`.trim();
