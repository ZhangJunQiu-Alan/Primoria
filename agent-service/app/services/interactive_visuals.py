from __future__ import annotations

import re

from app.model_service import invoke_text_model


SYSTEM_PROMPT = """You are an expert STEM animation engineer. Your task is to generate a single,
self-contained HTML file that visually animates a STEM concept described by the teacher.

STRICT RULES — follow all of these exactly:
1. Output ONLY the raw HTML. No markdown, no code fences, no explanation text.
2. The output must be a complete, valid HTML document (<!DOCTYPE html> ... </html>).
3. All CSS must be inline inside a <style> tag within <head>.
4. All JavaScript must be inline inside a <script> tag (defer or at end of body).
5. NO external resources — no CDN links, no fetch(), no import from URLs.
6. RESPONSIVE SIZING — CRITICAL:
   - Set html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:#1a1a2e; }
   - For canvas elements: set width and height in JS using window.innerWidth and window.innerHeight
   - DO NOT use any fixed pixel widths like width:600px. Use 100%, 100vw, 100vh, or window.innerWidth/Height.
   - All element positions must be computed relative to canvas.width / canvas.height, never hardcoded.
7. Use a dark background (#1a1a2e or similar) that contrasts well with animation elements.
8. Prefer canvas-based animations using requestAnimationFrame. Avoid fixed-pixel DOM layouts.
9. If interactive (play/pause, step, slider), add simple controls at the bottom with position:absolute.
10. Make it visually clear and educational — label key parts where helpful.
11. The animation must start automatically on load (call the animation loop immediately).
12. Add a window resize listener that re-sizes canvas and re-initializes layout when the window is resized.

STEM DOMAIN GUIDANCE:
- Physics: show realistic motion, forces, collisions with labels (velocity, force vectors)
- CS/Algorithms: color-code elements, highlight active comparisons/swaps, show step counter
- Math: plot functions with axes and labels, animate curves or geometric transformations
- Data Structures: visualize memory layout, pointers, node connections

Generate ONLY the HTML document. Nothing else."""

FENCED_BLOCK_RE = re.compile(r"```[ \t]*([a-zA-Z0-9_-]+)?[ \t]*\r?\n?([\s\S]*?)```", re.MULTILINE)


def normalize_gemini_html(raw: str) -> str:
    trimmed = raw.strip()
    if not trimmed:
        return ''

    fenced_match = FENCED_BLOCK_RE.search(trimmed)
    if not fenced_match:
        return trimmed
    return (fenced_match.group(2) or '').strip()


def build_visual_prompt(*, prompt: str, template: str | None = None, title: str | None = None, description: str | None = None) -> str:
    parts = [
        f'User request: {prompt.strip()}',
    ]
    if template and template.strip():
        parts.append(f'Preferred template hint: {template.strip()}')
    if title and title.strip():
        parts.append(f'Visual title: {title.strip()}')
    if description and description.strip():
        parts.append(f'Visual description: {description.strip()}')
    parts.append('Return only the final HTML document.')
    return '\n'.join(parts)


async def generate_interactive_visual_html(
    *,
    prompt: str,
    template: str | None = None,
    title: str | None = None,
    description: str | None = None,
) -> str:
    raw = await invoke_text_model(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=build_visual_prompt(
            prompt=prompt,
            template=template,
            title=title,
            description=description,
        ),
        temperature=0.7,
        timeout_seconds=60.0,
    )
    html = normalize_gemini_html(raw)
    if not html.strip():
        raise RuntimeError('AI returned empty response')
    return html

