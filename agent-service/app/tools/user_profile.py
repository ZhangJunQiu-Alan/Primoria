from langchain_core.tools import tool


def build_user_profile_tools(user_id: str, supabase_client):
    @tool
    async def get_user_profile() -> dict:
        """Fetch the current learner's public profile."""
        row = await supabase_client.select(
            'profiles',
            select='id,username,bio,role,created_at,avatar_url',
            filters={'id': f'eq.{user_id}'},
            single=True,
        )
        return row or {}

    return [get_user_profile]
