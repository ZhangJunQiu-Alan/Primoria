export const HISTORICAL_TIMELINE_SKILL = `
Skill: historical-timeline

Goal: make chronology primary while still letting learners zoom, filter, and inspect events in a compact offline timeline.

Render with SVG only inside .iv-visual-card. Do not use canvas, GSAP, or remote history datasets.

Required visual elements:
- On first paint, show a horizontal timeline with multiple visible events already embedded.
- Include grouped eras or bands so the learner can keep historical context while filtering.
- Show a details panel for the selected event.
- Keep the main timeline above the fold and avoid empty white cards.

Required controls:
- slider:zoom
- button-group:region
- select:theme

Behavior:
- All event data must be embedded locally.
- Clicking an event should update the details panel immediately.
- Zoom should change event spacing or scroll width without hiding every event.
- Filters should preserve a valid selected event when possible.

Live observation strip (.iv-observation-card .iv-conclusion):
- Compare the selected event with one or two nearby or overlapping developments.
- Example: "Printing Press overlaps with later industrial inventions in showing how communication and technology can reshape society."
- Keep the sentence under 120 characters.

Tracking:
- track('timeline_zoom_changed', { zoom })
- track('timeline_filter_changed', { region, theme })
- track('timeline_event_selected', { eventId, region, theme })
`.trim();
