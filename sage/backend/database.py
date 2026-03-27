import logging
from typing import Optional

from dotenv import load_dotenv
from supabase import Client, create_client
import os

load_dotenv()

logger = logging.getLogger(__name__)

_supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_KEY"],
)


# ---------------------------------------------------------------------------
# Candidates
# ---------------------------------------------------------------------------


async def get_candidate(candidate_id: str) -> Optional[dict]:
    """Fetch a single candidate record by primary key."""
    result = (
        _supabase.table("candidates")
        .select("*")
        .eq("id", candidate_id)
        .maybe_single()
        .execute()
    )
    return result.data


async def save_candidate(data: dict) -> dict:
    """Insert a new candidate record and return the created row."""
    result = _supabase.table("candidates").insert(data).execute()
    return result.data[0]


async def update_candidate(candidate_id: str, data: dict) -> dict:
    """Update an existing candidate record and return the updated row."""
    result = (
        _supabase.table("candidates")
        .update(data)
        .eq("id", candidate_id)
        .execute()
    )
    return result.data[0]


async def get_all_candidates() -> list:
    """Return all candidate records."""
    result = _supabase.table("candidates").select("*").execute()
    return result.data


# ---------------------------------------------------------------------------
# Interviews
# ---------------------------------------------------------------------------


async def save_interview(data: dict) -> dict:
    """Insert a new interview record and return the created row."""
    result = _supabase.table("interviews").insert(data).execute()
    return result.data[0]


async def update_interview(interview_id: str, data: dict) -> dict:
    """Update an existing interview record and return the updated row."""
    result = (
        _supabase.table("interviews")
        .update(data)
        .eq("id", interview_id)
        .execute()
    )
    return result.data[0]


async def get_interview(interview_id: str) -> Optional[dict]:
    """Fetch a single interview record by primary key."""
    result = (
        _supabase.table("interviews")
        .select("*")
        .eq("id", interview_id)
        .maybe_single()
        .execute()
    )
    return result.data


async def get_all_interviews() -> list:
    """Return all interview records."""
    result = _supabase.table("interviews").select("*").execute()
    return result.data


# ---------------------------------------------------------------------------
# Questions
# ---------------------------------------------------------------------------


async def save_questions(interview_id: str, questions: list) -> list:
    """Bulk-insert questions linked to an interview and return inserted rows."""
    rows = [{"interview_id": interview_id, **q} for q in questions]
    result = _supabase.table("questions").insert(rows).execute()
    return result.data


async def get_questions(interview_id: str) -> list:
    """Return all questions for a given interview."""
    result = (
        _supabase.table("questions")
        .select("*")
        .eq("interview_id", interview_id)
        .execute()
    )
    return result.data


# ---------------------------------------------------------------------------
# Responses
# ---------------------------------------------------------------------------


async def save_response(data: dict) -> dict:
    """Insert a candidate response record and return the created row."""
    result = _supabase.table("responses").insert(data).execute()
    return result.data[0]


async def get_responses(interview_id: str) -> list:
    """Return all responses for a given interview."""
    result = (
        _supabase.table("responses")
        .select("*")
        .eq("interview_id", interview_id)
        .execute()
    )
    return result.data


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------


async def save_report(data: dict) -> dict:
    """Insert an evaluation report and return the created row."""
    result = _supabase.table("reports").insert(data).execute()
    return result.data[0]


async def get_report(interview_id: str) -> Optional[dict]:
    """Fetch the evaluation report for a given interview."""
    result = (
        _supabase.table("reports")
        .select("*")
        .eq("interview_id", interview_id)
        .maybe_single()
        .execute()
    )
    return result.data
