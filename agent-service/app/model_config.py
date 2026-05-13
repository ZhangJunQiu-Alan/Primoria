from __future__ import annotations

DEFAULT_GEMINI_MODEL = 'gemini-2.5-pro'
GEMINI_FALLBACK_MODELS = ('gemini-3.1-pro-preview',)


def gemini_model_candidates(primary: str | None = None) -> list[str]:
    candidates = [primary or DEFAULT_GEMINI_MODEL, *GEMINI_FALLBACK_MODELS]
    unique: list[str] = []
    for candidate in candidates:
        normalized = str(candidate or '').strip()
        if normalized and normalized not in unique:
            unique.append(normalized)
    return unique

