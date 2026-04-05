from langchain_core.tools import tool


def build_lesson_context_tools(supabase_client):
    @tool
    async def get_lesson_context(lesson_id: str) -> dict:
        """Fetch a lesson with content JSON for explanation and tutoring."""
        lesson = await supabase_client.select(
            'lessons',
            select='id,course_id,title,content_json,xp_reward,duration_seconds',
            filters={'id': f'eq.{lesson_id}'},
            single=True,
        )
        return lesson or {}

    return [get_lesson_context]
