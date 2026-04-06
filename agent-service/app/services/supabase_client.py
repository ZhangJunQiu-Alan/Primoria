from __future__ import annotations

import httpx

from app.config import get_settings


class SupabaseUserClient:
    def __init__(self, access_token: str):
        settings = get_settings()
        self._base_url = settings.supabase_url.rstrip('/')
        self._headers = {
            'apikey': settings.supabase_anon_key,
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        }
        self._client = httpx.AsyncClient(timeout=15.0)

    async def close(self) -> None:
        await self._client.aclose()

    async def select(
        self,
        table: str,
        *,
        select: str,
        filters: dict[str, str] | None = None,
        order: str | None = None,
        limit: int | None = None,
        single: bool = False,
    ):
        params: dict[str, str | int] = {'select': select}
        if filters:
            params.update(filters)
        if order:
            params['order'] = order
        if limit is not None:
            params['limit'] = limit

        response = await self._client.get(
            f'{self._base_url}/rest/v1/{table}',
            params=params,
            headers=self._headers,
        )
        response.raise_for_status()
        payload = response.json()
        if single:
            if isinstance(payload, list):
                return payload[0] if payload else None
            return payload
        return payload

    async def rpc(self, fn_name: str, payload: dict):
        response = await self._client.post(
            f'{self._base_url}/rest/v1/rpc/{fn_name}',
            json=payload,
            headers=self._headers,
        )
        response.raise_for_status()
        return response.json()

    async def insert(self, table: str, values: dict | list[dict], *, returning: str = 'representation'):
        response = await self._client.post(
            f'{self._base_url}/rest/v1/{table}',
            json=values,
            headers={
                **self._headers,
                'Prefer': f'return={returning}',
            },
        )
        response.raise_for_status()
        if returning == 'minimal' or not response.content:
            return None
        return response.json()

    async def update(
        self,
        table: str,
        values: dict,
        *,
        filters: dict[str, str],
        returning: str = 'representation',
    ):
        response = await self._client.patch(
            f'{self._base_url}/rest/v1/{table}',
            params=filters,
            json=values,
            headers={
                **self._headers,
                'Prefer': f'return={returning}',
            },
        )
        response.raise_for_status()
        if returning == 'minimal' or not response.content:
            return None
        return response.json()

    async def delete(self, table: str, *, filters: dict[str, str], returning: str = 'representation'):
        response = await self._client.delete(
            f'{self._base_url}/rest/v1/{table}',
            params=filters,
            headers={
                **self._headers,
                'Prefer': f'return={returning}',
            },
        )
        response.raise_for_status()
        if returning == 'minimal' or not response.content:
            return None
        return response.json()
