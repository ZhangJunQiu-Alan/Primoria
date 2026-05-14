from __future__ import annotations

import json

from langchain_core.tools import tool

from app.schemas import ChatContext, CreateInteractiveVisualRequest
from app.services.llm_tools import create_interactive_visual


def _context_language(context: ChatContext) -> str:
    normalized = (context.locale or context.ui_language or '').strip().lower()
    return 'zh-CN' if normalized.startswith('zh') else 'en'


def build_interactive_visual_tools(context: ChatContext):
    @tool
    async def create_interactive_visual_widget(
        prompt: str,
        template: str = 'generic',
        experience_mode: str = 'simulation',
        title: str = '',
        description: str = '',
    ) -> dict:
        """Generate a sandboxed interactive HTML/SVG/canvas visual artifact for diagrams, simulations, graphs, animations, or visual explanations."""
        request = CreateInteractiveVisualRequest(
            prompt=prompt,
            template=template or None,
            experienceMode=experience_mode or None,
            title=title or None,
            description=description or None,
            language=_context_language(context),
            surface='builder' if context.surface == 'builder' else 'ai-tutor',
        )
        visual = await create_interactive_visual(request)
        payload = {
            'title': visual.title,
            'description': visual.description or '',
            'generatedHtml': visual.generatedHtml,
            'template': visual.template,
            'experienceMode': visual.experienceMode,
            'themeTone': visual.themeTone,
        }
        return {
            'artifact_type': 'primoria-interactive-visual',
            'artifact': payload,
            'markdown': '```primoria-interactive-visual\n'
            + json.dumps(payload, ensure_ascii=False)
            + '\n```',
            'instruction': 'Include the markdown field verbatim in your final answer so the Viewer can render the interactive visual.',
        }

    return [create_interactive_visual_widget]
