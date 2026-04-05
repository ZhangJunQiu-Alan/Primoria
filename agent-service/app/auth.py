from dataclasses import dataclass

import httpx
from fastapi import Header, HTTPException, status

from app.config import get_settings


@dataclass(slots=True)
class AuthenticatedUser:
    id: str
    email: str | None
    access_token: str


async def require_user(authorization: str | None = Header(default=None)) -> AuthenticatedUser:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Missing bearer token')

    token = authorization.removeprefix('Bearer ').strip()
    settings = get_settings()
    auth_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/user"

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            auth_url,
            headers={
                'apikey': settings.supabase_anon_key,
                'Authorization': f'Bearer {token}',
            },
        )

    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid Supabase session')

    payload = response.json()
    user_id = payload.get('id')
    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid auth payload')

    email = payload.get('email')
    return AuthenticatedUser(id=user_id, email=email if isinstance(email, str) else None, access_token=token)
