import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from app.config import Settings, get_settings
from app.model_config import DEFAULT_GEMINI_MODEL, GEMINI_FALLBACK_MODELS, gemini_model_candidates


def test_gemini_model_defaults_use_2_5_pro_with_3_1_pro_fallback(monkeypatch):
    monkeypatch.setenv('SUPABASE_URL', 'https://example.supabase.co')
    monkeypatch.setenv('SUPABASE_ANON_KEY', 'anon')
    monkeypatch.delenv('AGENT_MODEL', raising=False)
    monkeypatch.delenv('MEMORY_SUMMARY_MODEL', raising=False)
    get_settings.cache_clear()

    settings = Settings()

    assert DEFAULT_GEMINI_MODEL == 'gemini-2.5-pro'
    assert GEMINI_FALLBACK_MODELS == ('gemini-3.1-pro-preview',)
    assert settings.agent_model == 'gemini-2.5-pro'
    assert settings.memory_summary_model == 'gemini-2.5-pro'


def test_gemini_model_candidates_keep_primary_then_fallback(monkeypatch):
    monkeypatch.setenv('SUPABASE_URL', 'https://example.supabase.co')
    monkeypatch.setenv('SUPABASE_ANON_KEY', 'anon')
    monkeypatch.setenv('AGENT_MODEL', 'gemini-2.5-pro')
    get_settings.cache_clear()

    assert gemini_model_candidates('gemini-2.5-pro') == [
        'gemini-2.5-pro',
        'gemini-3.1-pro-preview',
    ]
