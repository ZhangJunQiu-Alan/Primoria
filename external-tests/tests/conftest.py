from __future__ import annotations

import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

import pytest
from dotenv import load_dotenv

from utils.supabase_client import SupabaseClient


@dataclass
class TestConfig:
    supabase_url: str
    anon_key: str
    test_user_password: str


def _read_supabase_env_from_cli(project_root: Path) -> dict[str, str]:
    try:
        result = subprocess.run(
            ["supabase", "status", "-o", "env"],
            cwd=str(project_root),
            check=True,
            capture_output=True,
            text=True,
        )
    except Exception:
        return {}

    output = {}
    for line in result.stdout.splitlines():
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        output[key.strip()] = value.strip().strip('"')
    return output


def _load_config() -> TestConfig:
    root = Path(__file__).resolve().parents[2]
    env_file = root / ".env"
    if env_file.exists():
        load_dotenv(env_file)

    project_root = Path(
        os.getenv("PROJECT_ROOT", "/Users/sithuhein/Documents/GitHub/Primoria")
    )

    supabase_url = os.getenv("SUPABASE_URL", "http://127.0.0.1:54321").rstrip("/")
    anon_key = os.getenv("SUPABASE_ANON_KEY", "").strip()

    if not anon_key:
        cli_env = _read_supabase_env_from_cli(project_root)
        anon_key = cli_env.get("ANON_KEY", "").strip()
        supabase_url = cli_env.get("API_URL", supabase_url).strip().rstrip("/")

    if not anon_key:
        raise pytest.UsageError(
            "SUPABASE_ANON_KEY is missing. Set it in external-tests/.env or run local Supabase so it can be auto-detected."
        )

    test_user_password = os.getenv("TEST_USER_PASSWORD", "Primoria123!")
    return TestConfig(
        supabase_url=supabase_url,
        anon_key=anon_key,
        test_user_password=test_user_password,
    )


@pytest.fixture(scope="session")
def config() -> TestConfig:
    return _load_config()


@pytest.fixture(scope="session")
def client(config: TestConfig) -> SupabaseClient:
    return SupabaseClient(base_url=config.supabase_url, anon_key=config.anon_key)


@pytest.fixture()
def make_user_session(client: SupabaseClient, config: TestConfig):
    def _factory() -> dict[str, str]:
        email = f"qa_{uuid4().hex[:12]}@primoria.test"
        password = config.test_user_password
        client.signup(email=email, password=password)

        login_payload = client.login(email=email, password=password)
        access_token = login_payload.get("access_token")
        user_id = (login_payload.get("user") or {}).get("id")

        assert access_token, "Login did not return access_token"
        assert user_id, "Login did not return user.id"

        return {
            "email": email,
            "password": password,
            "access_token": access_token,
            "user_id": user_id,
        }

    return _factory
