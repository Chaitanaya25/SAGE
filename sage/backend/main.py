"""SAGE Backend — FastAPI application entry point."""

import logging

from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
    WebSocket,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from auth import create_token, get_current_user, verify_token
from database import (
    _supabase,
    get_all_candidates,
    get_all_interviews,
    get_interview,
    get_questions,
    get_report,
    get_responses,
    save_candidate,
    save_interview,
)
from pipeline import run_pre_interview_pipeline
from websocket_handler import interview_websocket

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="SAGE Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class LoginRequest(BaseModel):
    email: str
    password: str


class CandidateLoginRequest(BaseModel):
    email: str
    name: str


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------


@app.websocket("/ws/interview/{candidate_id}")
async def websocket_endpoint(websocket: WebSocket, candidate_id: str) -> None:
    """Real-time voice interview WebSocket entry point."""
    await interview_websocket(websocket, candidate_id)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


@app.get("/health")
async def health_check() -> dict:
    """Return service liveness status."""
    return {"status": "ok", "service": "sage-backend"}


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


@app.post("/api/auth/login")
async def login(body: LoginRequest) -> dict:
    """Authenticate an HR user and return a JWT.

    For the hackathon MVP, credentials are hardcoded.
    """
    if body.email == "admin@sage.ai" and body.password == "sage2025":
        logger.info("Admin login successful")
        return {
            "token": create_token(user_id="admin", role="hr"),
            "user": {"email": "admin@sage.ai", "name": "SAGE Admin"},
        }
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
    )


@app.post("/api/auth/candidate-login")
async def candidate_login(body: CandidateLoginRequest) -> dict:
    """Create or retrieve a candidate record by email and return a JWT."""
    try:
        existing = (
            _supabase.table("candidates")
            .select("*")
            .eq("email", body.email)
            .maybe_single()
            .execute()
        )
        if existing.data:
            candidate = existing.data
            logger.info("Existing candidate login: %s", candidate["id"])
        else:
            candidate = await save_candidate({"name": body.name, "email": body.email})
            logger.info("New candidate created: %s", candidate["id"])

        candidate_id: str = candidate["id"]
        return {
            "token": create_token(user_id=candidate_id, role="candidate"),
            "candidate": {
                "id": candidate_id,
                "name": candidate.get("name", body.name),
                "email": candidate.get("email", body.email),
            },
        }
    except Exception as exc:
        logger.error("candidate-login error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to authenticate candidate",
        ) from exc


# ---------------------------------------------------------------------------
# Resume upload + pre-interview pipeline
# ---------------------------------------------------------------------------


@app.post("/api/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    job_role: str = Form(...),
) -> dict:
    """Accept a PDF resume, create candidate + interview records, and run the pre-interview pipeline.

    Returns the candidate/interview IDs, pipeline status, and number of questions generated.
    """
    try:
        candidate = await save_candidate({"name": "Unknown", "email": ""})
        candidate_id: str = candidate["id"]

        interview = await save_interview(
            {"candidate_id": candidate_id, "job_role": job_role, "status": "pending"}
        )
        interview_id: str = interview["id"]

        file_bytes = await file.read()
        logger.info(
            "Resume uploaded for candidate %s (%d bytes), job_role='%s'",
            candidate_id,
            len(file_bytes),
            job_role,
        )

        result = await run_pre_interview_pipeline(candidate_id, interview_id, file_bytes, job_role)

        questions_count = len(result.get("questions", []))
        logger.info(
            "Pre-interview pipeline finished: status=%s, questions=%d",
            result.get("status"),
            questions_count,
        )

        return {
            "candidate_id": candidate_id,
            "interview_id": interview_id,
            "status": result.get("status"),
            "questions_count": questions_count,
        }
    except Exception as exc:
        logger.error("upload-resume error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process resume",
        ) from exc


# ---------------------------------------------------------------------------
# Questions
# ---------------------------------------------------------------------------


@app.get("/api/questions/{interview_id}")
async def get_interview_questions(interview_id: str) -> dict:
    """Return all generated questions for an interview."""
    try:
        questions = await get_questions(interview_id)
        return {"interview_id": interview_id, "questions": questions}
    except Exception as exc:
        logger.error("get_questions error for interview %s: %s", interview_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch questions",
        ) from exc


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------


@app.get("/api/report/{interview_id}")
async def get_interview_report(interview_id: str) -> dict:
    """Return the evaluation report for a completed interview."""
    try:
        report = await get_report(interview_id)
    except Exception as exc:
        logger.error("get_report error for interview %s: %s", interview_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch report",
        ) from exc

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not yet generated",
        )
    return report


# ---------------------------------------------------------------------------
# Candidates
# ---------------------------------------------------------------------------


@app.get("/api/candidates")
async def list_candidates() -> dict:
    """Return all candidate records."""
    try:
        candidates = await get_all_candidates()
        return {"candidates": candidates}
    except Exception as exc:
        logger.error("list_candidates error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch candidates",
        ) from exc


# ---------------------------------------------------------------------------
# Interviews
# ---------------------------------------------------------------------------


@app.get("/api/interviews")
async def list_interviews() -> dict:
    """Return all interview records."""
    try:
        interviews = await get_all_interviews()
        return {"interviews": interviews}
    except Exception as exc:
        logger.error("list_interviews error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch interviews",
        ) from exc


@app.get("/api/interview/{interview_id}")
async def get_interview_detail(interview_id: str) -> dict:
    """Return a single interview record with all associated responses."""
    try:
        interview = await get_interview(interview_id)
        if not interview:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Interview not found",
            )
        responses = await get_responses(interview_id)
        return {**interview, "responses": responses}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("get_interview_detail error for %s: %s", interview_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch interview",
        ) from exc
