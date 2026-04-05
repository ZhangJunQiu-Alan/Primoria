from langchain_core.tools import tool


def build_course_context_tools(supabase_client):
    @tool
    async def get_course_context(course_id: str) -> dict:
        """Fetch a course and its ordered lessons for learner guidance."""
        course = await supabase_client.select(
            'courses',
            select='id,title,description,difficulty_level,estimated_minutes,tags,status,subject_id',
            filters={'id': f'eq.{course_id}'},
            single=True,
        )
        lessons = await supabase_client.select(
            'lessons',
            select='id,title,type,sort_key,xp_reward,duration_seconds,is_locked,unlock_type,prerequisite_lesson_id',
            filters={'course_id': f'eq.{course_id}'},
            order='sort_key.asc',
            limit=200,
        )
        return {'course': course or {}, 'lessons': lessons}

    return [get_course_context]
