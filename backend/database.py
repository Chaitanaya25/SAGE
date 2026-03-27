from __future__ import annotations

import asyncio
import os
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from supabase import Client, create_client


load_dotenv()

_supabase: Optional[Client] = None


def _get_supabase() -> Client:
    global _supabase
    if _supabase is not None:
        return _supabase

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set")

    _supabase = create_client(url, key)
    return _supabase


async def get_candidate(candidate_id: str) -> Optional[Dict[str, Any]]:
    def _op() -> Optional[Dict[str, Any]]:
        resp = (
            _get_supabase()
            .table("candidates")
            .select("*")
            .eq("id", candidate_id)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        return rows[0] if rows else None

    return await asyncio.to_thread(_op)


async def save_candidate(data: Dict[str, Any]) -> Dict[str, Any]:
    def _op() -> Dict[str, Any]:
        resp = _get_supabase().table("candidates").insert(data).execute()
        rows = resp.data or []
        return rows[0] if rows else {}

    return await asyncio.to_thread(_op)


async def update_candidate(candidate_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    def _op() -> Dict[str, Any]:
        resp = (
            _get_supabase()
            .table("candidates")
            .update(data)
            .eq("id", candidate_id)
            .execute()
        )
        rows = resp.data or []
        return rows[0] if rows else {}

    return await asyncio.to_thread(_op)


async def save_interview(data: Dict[str, Any]) -> Dict[str, Any]:
    def _op() -> Dict[str, Any]:
        resp = _get_supabase().table("interviews").insert(data).execute()
        rows = resp.data or []
        return rows[0] if rows else {}

    return await asyncio.to_thread(_op)


async def update_interview(interview_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    def _op() -> Dict[str, Any]:
        resp = (
            _get_supabase()
            .table("interviews")
            .update(data)
            .eq("id", interview_id)
            .execute()
        )
        rows = resp.data or []
        return rows[0] if rows else {}

    return await asyncio.to_thread(_op)


async def get_interview(interview_id: str) -> Optional[Dict[str, Any]]:
    def _op() -> Optional[Dict[str, Any]]:
        resp = (
            _get_supabase()
            .table("interviews")
            .select("*")
            .eq("id", interview_id)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        return rows[0] if rows else None

    return await asyncio.to_thread(_op)


async def save_questions(interview_id: str, questions: List[Any]) -> List[Dict[str, Any]]:
    def _op() -> List[Dict[str, Any]]:
        rows_to_insert: List[Dict[str, Any]] = []
        for index, question in enumerate(questions):
            payload: Any = question
            if isinstance(question, str):
                payload = {"text": question}
            rows_to_insert.append(
                {
                    "interview_id": interview_id,
                    "order": index,
                    "question": payload,
                }
            )

        resp = _get_supabase().table("questions").insert(rows_to_insert).execute()
        return resp.data or []

    return await asyncio.to_thread(_op)


async def get_questions(interview_id: str) -> List[Dict[str, Any]]:
    def _op() -> List[Dict[str, Any]]:
        resp = (
            _get_supabase()
            .table("questions")
            .select("*")
            .eq("interview_id", interview_id)
            .order("order")
            .execute()
        )
        return resp.data or []

    return await asyncio.to_thread(_op)


async def save_response(data: Dict[str, Any]) -> Dict[str, Any]:
    def _op() -> Dict[str, Any]:
        resp = _get_supabase().table("responses").insert(data).execute()
        rows = resp.data or []
        return rows[0] if rows else {}

    return await asyncio.to_thread(_op)


async def get_responses(interview_id: str) -> List[Dict[str, Any]]:
    def _op() -> List[Dict[str, Any]]:
        resp = (
            _get_supabase()
            .table("responses")
            .select("*")
            .eq("interview_id", interview_id)
            .order("created_at")
            .execute()
        )
        return resp.data or []

    return await asyncio.to_thread(_op)


async def save_report(data: Dict[str, Any]) -> Dict[str, Any]:
    def _op() -> Dict[str, Any]:
        resp = _get_supabase().table("reports").insert(data).execute()
        rows = resp.data or []
        return rows[0] if rows else {}

    return await asyncio.to_thread(_op)


async def get_report(interview_id: str) -> Optional[Dict[str, Any]]:
    def _op() -> Optional[Dict[str, Any]]:
        resp = (
            _get_supabase()
            .table("reports")
            .select("*")
            .eq("interview_id", interview_id)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        return rows[0] if rows else None

    return await asyncio.to_thread(_op)


async def get_all_candidates() -> List[Dict[str, Any]]:
    def _op() -> List[Dict[str, Any]]:
        resp = _get_supabase().table("candidates").select("*").execute()
        return resp.data or []

    return await asyncio.to_thread(_op)


async def get_all_interviews() -> List[Dict[str, Any]]:
    def _op() -> List[Dict[str, Any]]:
        resp = _get_supabase().table("interviews").select("*").execute()
        return resp.data or []

    return await asyncio.to_thread(_op)

