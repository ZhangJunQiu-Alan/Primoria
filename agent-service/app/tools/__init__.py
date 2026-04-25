from app.tools.course_generation_tools import build_course_generation_tools
from app.tools.course_context import build_course_context_tools
from app.tools.lesson_context import build_lesson_context_tools
from app.tools.learning_snapshot import build_learning_snapshot_tools
from app.tools.memory_tools import build_memory_tools
from app.tools.user_profile import build_user_profile_tools


def build_all_tools(user_id: str, supabase_client, context):
    return [
        *build_memory_tools(user_id, supabase_client, context),
        *build_user_profile_tools(user_id, supabase_client),
        *build_learning_snapshot_tools(user_id, supabase_client),
        *build_course_context_tools(supabase_client),
        *build_lesson_context_tools(supabase_client),
    ]


def build_generation_tools(user_id: str, supabase_client):
    return [
        *build_course_generation_tools(user_id, supabase_client),
    ]
