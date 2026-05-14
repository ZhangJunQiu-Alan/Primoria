import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from app.config import get_settings
from app.schemas import ChatContext
from app.tools import build_all_tools


def clear_settings_cache():
    get_settings.cache_clear()


def test_build_all_tools_includes_interactive_visual_tool(monkeypatch):
    clear_settings_cache()
    monkeypatch.setenv('SUPABASE_URL', 'http://127.0.0.1:54321')
    monkeypatch.setenv('SUPABASE_ANON_KEY', 'anon')

    tools = build_all_tools('user-1', object(), ChatContext(surface='ai-tutor', locale='zh-CN'))

    assert any(getattr(tool, 'name', '') == 'create_interactive_visual_widget' for tool in tools)
    clear_settings_cache()


def test_default_agent_prompt_mentions_interactive_visual_tool(monkeypatch):
    clear_settings_cache()
    monkeypatch.setenv('SUPABASE_URL', 'http://127.0.0.1:54321')
    monkeypatch.setenv('SUPABASE_ANON_KEY', 'anon')

    prompt = get_settings().agent_system_prompt

    assert 'create_interactive_visual_widget' in prompt
    assert 'markdown field verbatim' in prompt
    clear_settings_cache()
