from __future__ import annotations

import json

from langchain_core.tools import tool

from app.schemas import ChatContext
from app.services.interactive_visuals import generate_interactive_visual_html


def _context_language(context: ChatContext) -> str:
    normalized = (context.locale or context.ui_language or '').strip().lower()
    return 'zh-CN' if normalized.startswith('zh') else 'en'


def _artifact_markdown(payload: dict) -> str:
    return '```primoria-interactive-visual\n' + json.dumps(payload, ensure_ascii=False) + '\n```'


def build_interactive_visual_tools(context: ChatContext):
    @tool
    async def create_interactive_visual_widget(
        prompt: str,
        template: str = 'generic',
        title: str = '',
        description: str = '',
    ) -> dict:
        """Generate an interactive HTML/SVG/canvas visual artifact for simulations, diagrams, animations, graphs, plots, algorithm visualizations, or visual explanations."""
        html = await generate_interactive_visual_html(
            prompt=prompt,
            template=template or None,
            title=title or None,
            description=description or None,
        )
        payload = {
            'title': title or prompt.strip()[:72] or 'Interactive Visual',
            'description': description or ('交互式可视化' if _context_language(context) == 'zh-CN' else 'Interactive visualization'),
            'generatedHtml': html,
            'template': template or 'generic',
            'experienceMode': 'simulation',
            'themeTone': 'botanical-sage',
        }
        return {
            'artifact_type': 'primoria-interactive-visual',
            'artifact': payload,
            'markdown': _artifact_markdown(payload),
            'instruction': 'Include markdown verbatim in the final answer so the Viewer can render the interactive visual.',
        }

    return [create_interactive_visual_widget]
