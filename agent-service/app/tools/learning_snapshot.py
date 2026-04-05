from langchain_core.tools import tool


def build_learning_snapshot_tools(user_id: str, supabase_client):
    @tool
    async def get_learning_snapshot() -> dict:
        """Fetch learner stats, active enrollments, and recent completions."""
        stats = await supabase_client.select(
            'user_stats',
            select='user_id,total_xp,current_streak,longest_streak,courses_completed,lessons_completed,last_activity_date',
            filters={'user_id': f'eq.{user_id}'},
            single=True,
        )
        enrollments = await supabase_client.select(
            'enrollments',
            select='id,course_id,status,progress_bp,last_accessed_at,started_at,completed_at',
            filters={'user_id': f'eq.{user_id}'},
            order='last_accessed_at.desc',
            limit=5,
        )
        recent_lessons = await supabase_client.select(
            'lesson_completions',
            select='lesson_id,score,time_spent_seconds,completed_at',
            filters={'user_id': f'eq.{user_id}'},
            order='completed_at.desc',
            limit=10,
        )
        return {
            'stats': stats or {},
            'enrollments': enrollments,
            'recent_lessons': recent_lessons,
        }

    @tool
    async def search_courses(query: str) -> dict:
        """Search published courses by learner query."""
        if not query.strip():
            return {'courses': []}
        rows = await supabase_client.rpc('search_courses', {'p_query': query.strip()})
        return {'courses': rows}

    return [get_learning_snapshot, search_courses]
