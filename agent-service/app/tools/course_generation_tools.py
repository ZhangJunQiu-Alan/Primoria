from __future__ import annotations

import json
import re

from langchain_core.tools import tool

from app.schemas import (
    BuilderCourseDraft,
    GenerateBuilderCourseDraftRequest,
    GeneratedCourseBrief,
    GeneratedCourseCritique,
    GeneratedCourseOutline,
    GeneratedCoursePlan,
)
from app.services.builder_courses import (
    build_course_generation_context,
    build_generated_course_draft,
    generate_course_brief,
    generate_course_draft_pipeline,
    generate_course_critique,
    generate_course_outline,
    generate_course_plan,
    revise_course_plan,
)


def _load_jsonish(value):
    if isinstance(value, (dict, list)):
        return value
    text = str(value or '').strip()
    if not text:
        return {}
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fenced:
        text = fenced.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        repaired = re.sub(r'\\(?!["\\/bfnrtu])', r'\\\\', text)
        return json.loads(repaired)


def build_course_generation_tools(user_id: str, supabase_client):
    @tool
    async def get_course_generation_context(
        topic: str,
        audience: str = '',
        outcome: str = '',
        pace: str = 'balanced',
        language: str = 'English',
        difficulty_level: str = 'beginner',
    ) -> dict:
        """Build course-generation context using author memory, reference courses, and recent author courses."""
        request = GenerateBuilderCourseDraftRequest(
            topic=topic,
            audience=audience or None,
            outcome=outcome or None,
            pace=pace if pace in {'quick', 'balanced', 'deep'} else 'balanced',
            language=language or None,
            difficulty_level=difficulty_level if difficulty_level in {'beginner', 'intermediate', 'advanced'} else None,
            persist=False,
        )
        return await build_course_generation_context(
            request,
            user_id=user_id,
            supabase_client=supabase_client,
        )

    @tool
    async def generate_course_brief_stage(context_json: str) -> dict:
        """Generate the course brief stage from a serialized course-generation context JSON."""
        context = _load_jsonish(context_json)
        brief = await generate_course_brief(context)
        return brief.model_dump(mode='python')

    @tool
    async def generate_course_outline_stage(context_json: str, brief_json: str) -> dict:
        """Generate the course outline stage from serialized context JSON and brief JSON."""
        context = _load_jsonish(context_json)
        brief = GeneratedCourseBrief.model_validate(_load_jsonish(brief_json))
        outline = await generate_course_outline(context, brief)
        return outline.model_dump(mode='python')

    @tool
    async def generate_course_plan_stage(context_json: str, brief_json: str, outline_json: str) -> dict:
        """Generate the detailed course plan stage from serialized context, brief, and outline JSON."""
        context = _load_jsonish(context_json)
        brief = GeneratedCourseBrief.model_validate(_load_jsonish(brief_json))
        outline = GeneratedCourseOutline.model_validate(_load_jsonish(outline_json))
        plan = await generate_course_plan(context, brief, outline)
        return plan.model_dump(mode='python')

    @tool
    async def critique_course_plan_stage(context_json: str, brief_json: str, outline_json: str, plan_json: str) -> dict:
        """Critique the generated course plan and decide whether revision is needed."""
        context = _load_jsonish(context_json)
        brief = GeneratedCourseBrief.model_validate(_load_jsonish(brief_json))
        outline = GeneratedCourseOutline.model_validate(_load_jsonish(outline_json))
        plan = GeneratedCoursePlan.model_validate(_load_jsonish(plan_json))
        critique = await generate_course_critique(context, brief, outline, plan)
        return critique.model_dump(mode='python')

    @tool
    async def revise_course_plan_stage(
        context_json: str,
        brief_json: str,
        outline_json: str,
        plan_json: str,
        critique_json: str,
    ) -> dict:
        """Revise the course plan using critique feedback and return the improved final plan."""
        context = _load_jsonish(context_json)
        brief = GeneratedCourseBrief.model_validate(_load_jsonish(brief_json))
        outline = GeneratedCourseOutline.model_validate(_load_jsonish(outline_json))
        plan = GeneratedCoursePlan.model_validate(_load_jsonish(plan_json))
        critique = GeneratedCourseCritique.model_validate(_load_jsonish(critique_json))
        revised_plan = await revise_course_plan(context, brief, outline, plan, critique)
        return revised_plan.model_dump(mode='python')

    @tool
    async def generate_complete_course_draft(
        topic: str,
        audience: str = '',
        outcome: str = '',
        pace: str = 'balanced',
        language: str = 'English',
        difficulty_level: str = 'beginner',
    ) -> dict:
        """Generate a full Builder-ready course draft using the staged brief -> outline -> plan pipeline."""
        request = GenerateBuilderCourseDraftRequest(
            topic=topic,
            audience=audience or None,
            outcome=outcome or None,
            pace=pace if pace in {'quick', 'balanced', 'deep'} else 'balanced',
            language=language or None,
            difficulty_level=difficulty_level if difficulty_level in {'beginner', 'intermediate', 'advanced'} else None,
            persist=False,
        )
        brief, outline, critique, plan, revised, generation_context = await generate_course_draft_pipeline(
            request,
            user_id=user_id,
            supabase_client=supabase_client,
        )
        draft = build_generated_course_draft(plan, author_id=user_id)
        return {
            'brief': brief.model_dump(mode='python'),
            'outline': outline.model_dump(mode='python'),
            'critique': critique.model_dump(mode='python'),
            'plan': plan.model_dump(mode='python'),
            'draft': draft.model_dump(mode='python', by_alias=True),
            'generation_context': generation_context,
            'revised': revised,
        }

    return [
        get_course_generation_context,
        generate_course_brief_stage,
        generate_course_outline_stage,
        generate_course_plan_stage,
        critique_course_plan_stage,
        revise_course_plan_stage,
        generate_complete_course_draft,
    ]
