import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from app.config import get_settings
from app.model_service import build_chat_model, extract_candidate_texts


def clear_settings_cache():
    get_settings.cache_clear()


def test_openai_base_url_is_read_from_shared_env(monkeypatch):
    clear_settings_cache()
    monkeypatch.setenv('SUPABASE_URL', 'http://127.0.0.1:54321')
    monkeypatch.setenv('SUPABASE_ANON_KEY', 'anon')
    monkeypatch.setenv('OPENAI_API_KEY', 'openai-key')
    monkeypatch.delenv('AI_MODEL', raising=False)
    monkeypatch.setenv('OPENAI_MODEL', 'custom-openai-model')
    monkeypatch.setenv('OPENAI_BASE_URL', 'https://llm.example.com/openai')

    model = build_chat_model(provider='openai')

    assert model.model_name == 'custom-openai-model'
    assert str(model.root_client.base_url) == 'https://llm.example.com/openai/v1/'
    clear_settings_cache()


def test_extract_candidate_texts_unwraps_fenced_json():
    texts = extract_candidate_texts(
        {
            'candidates': [
                {
                    'content': {
                        'parts': [
                            {
                                'text': 'Here is JSON:\\n```json\\n{\"reply\":\"ok\"}\\n```',
                            }
                        ]
                    }
                }
            ]
        }
    )

    assert texts == ['{"reply":"ok"}']
