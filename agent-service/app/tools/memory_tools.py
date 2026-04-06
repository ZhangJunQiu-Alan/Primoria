from langchain_core.tools import tool

from app.memory import inspect_user_memory, save_user_memory, search_user_memories
from app.schemas import ChatContext


def build_memory_tools(user_id: str, supabase_client, context: ChatContext):
    @tool
    async def remember_user_memory(content: str, kind: str = 'auto') -> dict:
        """Save learner memory with automatic classification and smart dedupe/update for preference, goal, profile, constraint, or notes."""
        memory = await save_user_memory(
            user_id,
            content,
            supabase_client=supabase_client,
            kind=kind,
            source='tool',
            context=context,
        )
        return {'saved': True, 'memory': memory}

    @tool
    async def recall_user_memories(query: str = '', kind: str = '', limit: int = 5) -> dict:
        """Recall stored learner memories by keyword and optional kind to personalize the reply."""
        memories = await search_user_memories(
            user_id,
            supabase_client=supabase_client,
            query=query or None,
            kind=kind or None,
            limit=max(1, min(limit, 10)),
            context=context,
        )
        return {'memories': memories}

    @tool
    async def inspect_user_memory_overview(day: str = '') -> dict:
        """Inspect the learner memory overview including global, daily, course, lesson, and episode memories."""
        return await inspect_user_memory(
            user_id,
            supabase_client=supabase_client,
            context=context,
            day_key=day or None,
        )

    return [remember_user_memory, recall_user_memories, inspect_user_memory_overview]
