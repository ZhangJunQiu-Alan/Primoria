from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import requests


@dataclass
class SupabaseClient:
    base_url: str
    anon_key: str

    def _headers(self, access_token: Optional[str] = None) -> Dict[str, str]:
        token = access_token or self.anon_key
        return {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    def _expect_ok(self, response: requests.Response, context: str) -> Any:
        if not response.ok:
            raise AssertionError(
                f"{context} failed: {response.status_code} {response.text}"
            )
        if not response.text:
            return None
        return response.json()

    def get_subject_by_name(self, name: str) -> Dict[str, Any]:
        resp = requests.get(
            f"{self.base_url}/rest/v1/subjects",
            params={"select": "id,name,color_hex", "name": f"eq.{name}"},
            headers=self._headers(),
            timeout=20,
        )
        data = self._expect_ok(resp, "get_subject_by_name")
        if not data:
            raise AssertionError(f"Subject '{name}' not found")
        return data[0]

    def list_social_courses(self, subject_id: str) -> List[Dict[str, Any]]:
        resp = requests.get(
            f"{self.base_url}/rest/v1/courses",
            params={
                "select": "id,title,slug,published_at,subject_id,status",
                "subject_id": f"eq.{subject_id}",
                "status": "eq.published",
                "order": "published_at.desc",
            },
            headers=self._headers(),
            timeout=20,
        )
        return self._expect_ok(resp, "list_social_courses")

    def get_course_by_slug(self, slug: str) -> Dict[str, Any]:
        resp = requests.get(
            f"{self.base_url}/rest/v1/courses",
            params={
                "select": "id,title,slug,subject_id,status",
                "slug": f"eq.{slug}",
                "limit": 1,
            },
            headers=self._headers(),
            timeout=20,
        )
        data = self._expect_ok(resp, "get_course_by_slug")
        if not data:
            raise AssertionError(f"Course '{slug}' not found")
        return data[0]

    def signup(self, email: str, password: str) -> Dict[str, Any]:
        resp = requests.post(
            f"{self.base_url}/auth/v1/signup",
            headers=self._headers(),
            json={"email": email, "password": password},
            timeout=20,
        )
        return self._expect_ok(resp, "signup")

    def login(self, email: str, password: str) -> Dict[str, Any]:
        resp = requests.post(
            f"{self.base_url}/auth/v1/token",
            params={"grant_type": "password"},
            headers=self._headers(),
            json={"email": email, "password": password},
            timeout=20,
        )
        return self._expect_ok(resp, "login")

    def upsert_enrollment(
        self, user_id: str, course_id: str, access_token: str
    ) -> List[Dict[str, Any]]:
        headers = self._headers(access_token)
        headers["Prefer"] = "resolution=merge-duplicates,return=representation"

        resp = requests.post(
            f"{self.base_url}/rest/v1/enrollments",
            params={"on_conflict": "user_id,course_id"},
            headers=headers,
            json={
                "user_id": user_id,
                "course_id": course_id,
                "status": "in_progress",
            },
            timeout=20,
        )
        return self._expect_ok(resp, "upsert_enrollment")

    def get_enrollment(
        self, user_id: str, course_id: str, access_token: str
    ) -> Dict[str, Any]:
        resp = requests.get(
            f"{self.base_url}/rest/v1/enrollments",
            params={
                "select": "id,user_id,course_id,status",
                "user_id": f"eq.{user_id}",
                "course_id": f"eq.{course_id}",
                "limit": 1,
            },
            headers=self._headers(access_token),
            timeout=20,
        )
        data = self._expect_ok(resp, "get_enrollment")
        if not data:
            raise AssertionError("Enrollment row not found after upsert")
        return data[0]

    def list_lessons(self, course_id: str, access_token: str) -> List[Dict[str, Any]]:
        resp = requests.get(
            f"{self.base_url}/rest/v1/lessons",
            params={
                "select": "id,title,sort_key,course_id",
                "course_id": f"eq.{course_id}",
                "order": "sort_key.asc",
            },
            headers=self._headers(access_token),
            timeout=20,
        )
        return self._expect_ok(resp, "list_lessons")
