from __future__ import annotations

import asyncio
import logging
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="SAGE API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from auth import create_token, verify_token
from database import (
    create_job_posting,
    get_all_candidates,
    get_all_interviews,
    get_active_job_postings,
    get_candidate,
    get_interview,
    get_job_posting,
    get_job_postings,
    get_questions,
    get_report,
    get_responses,
    update_job_posting,
    delete_job_posting,
    save_candidate,
    save_interview,
    save_report,
    update_candidate,
    update_interview,
)
from pipeline import run_post_interview_pipeline, run_pre_interview_pipeline
from websocket_handler import interview_websocket


class LoginRequest(BaseModel):
    email: str
    password: str


class CandidateLoginRequest(BaseModel):
    email: str
    name: str


class ScheduleInterviewRequest(BaseModel):
    candidate_id: str
    job_role: str
    scheduled_at: str
    company: str | None = None


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "sage-backend"}


@app.websocket("/ws/interview/{candidate_id}")
async def ws_interview(websocket: WebSocket, candidate_id: str) -> None:
    await interview_websocket(websocket, candidate_id)


@app.post("/api/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    job_role: str = Form(...),
    candidate_id: str | None = Form(None),
    job_id: str | None = Form(None),
) -> dict:
    try:
        pdf_bytes = await file.read()

        if candidate_id:
            existing = await get_candidate(candidate_id)
            if not existing:
                raise HTTPException(status_code=404, detail="Candidate not found")
            await update_candidate(candidate_id, {"resume_url": file.filename})
        else:
            candidate = await save_candidate(
                {
                    "name": "",
                    "email": "",
                    "phone": "",
                    "resume_url": file.filename,
                    "resume_parsed": {},
                }
            )
            candidate_id = candidate["id"]

        interview_payload = {"candidate_id": candidate_id, "job_role": job_role, "status": "pending"}
        if job_id:
            interview_payload["job_id"] = job_id
        interview = await save_interview(interview_payload)
        interview_id = interview["id"]

        result = await run_pre_interview_pipeline(candidate_id, interview_id, pdf_bytes, job_role)

        return {
            "candidate_id": candidate_id,
            "interview_id": interview_id,
            "status": result.get("status", "unknown"),
            "questions_count": len(result.get("questions", [])),
            "resume_parsed": result.get("resume_parsed", {}),
        }
    except Exception as e:
        logger.error("Upload failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/jobs")
async def create_job(request: Request) -> dict:
    data = await request.json()
    required = ["company_name", "company_email", "job_title", "job_role", "job_description"]
    for field in required:
        if field not in data:
            raise HTTPException(status_code=400, detail=f"Missing field: {field}")
    created = await create_job_posting(data)
    if not created:
        raise HTTPException(status_code=500, detail="Failed to create job")
    return created


@app.get("/api/jobs")
async def list_jobs(all: bool = False) -> list:
    if all:
        return await get_job_postings()
    return await get_active_job_postings()


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str) -> dict:
    job = await get_job_posting(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.put("/api/jobs/{job_id}")
async def update_job(job_id: str, request: Request) -> dict:
    data = await request.json()
    data["updated_at"] = datetime.utcnow().isoformat()
    updated = await update_job_posting(job_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Job not found")
    return updated


@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str) -> dict:
    deleted = await delete_job_posting(job_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"message": "Job deleted"}


@app.get("/api/questions/{interview_id}")
async def get_interview_questions(interview_id: str) -> dict:
    questions = await get_questions(interview_id)
    return {"interview_id": interview_id, "questions": questions}


@app.get("/api/report/{interview_id}")
async def get_interview_report(interview_id: str) -> dict:
    report = await get_report(interview_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not yet generated")
    return report


@app.get("/api/candidates")
async def list_candidates() -> dict:
    candidates = await get_all_candidates()
    return {"candidates": candidates}


@app.get("/api/interviews")
async def list_interviews() -> dict:
    interviews = await get_all_interviews()
    return {"interviews": interviews}


@app.post("/api/interviews/schedule")
async def schedule_interview(req: ScheduleInterviewRequest) -> dict:
    try:
        try:
            datetime.fromisoformat(req.scheduled_at.replace("Z", "+00:00"))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid scheduled_at")

        interview = await save_interview(
            {
                "candidate_id": req.candidate_id,
                "job_role": req.job_role,
                "status": "pending",
                "scheduled_at": req.scheduled_at,
                "company": req.company or "",
            }
        )
        return {"interview": interview}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error("Scheduling failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/api/interview/{interview_id}")
async def get_single_interview(interview_id: str) -> dict:
    interview = await get_interview(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    responses = await get_responses(interview_id)
    return {"interview": interview, "responses": responses}


@app.post("/api/auth/login")
async def hr_login(req: LoginRequest) -> dict:
    if req.email == "admin@sage.ai" and req.password == "sage2025":
        token = create_token(user_id="admin", role="hr")
        return {"token": token, "user": {"email": "admin@sage.ai", "name": "SAGE Admin"}}
    raise HTTPException(status_code=401, detail="Invalid credentials")


@app.post("/api/auth/candidate-login")
async def candidate_login(req: CandidateLoginRequest) -> dict:
    try:
        candidates = await get_all_candidates()
        existing = next((c for c in candidates if c.get("email") == req.email), None)

        if existing:
            candidate_id = existing["id"]
        else:
            candidate = await save_candidate(
                {
                    "name": req.name,
                    "email": req.email,
                    "phone": "",
                    "resume_url": "",
                    "resume_parsed": {},
                }
            )
            candidate_id = candidate["id"]

        token = create_token(user_id=candidate_id, role="candidate")
        return {"token": token, "candidate": {"id": candidate_id, "name": req.name, "email": req.email}}
    except Exception as e:
        logger.error("Candidate login failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
