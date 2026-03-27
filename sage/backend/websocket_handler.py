"""WebSocket voice interview loop — real-time STT/TTS orchestration for SAGE interviews."""

import asyncio
import json
import logging
import os

import httpx
from fastapi import WebSocket, WebSocketDisconnect

from database import _supabase, get_questions, update_interview, save_response
from agents import evaluator

logger = logging.getLogger(__name__)

_ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
_ELEVENLABS_VOICE_ID: str = os.getenv("ELEVENLABS_VOICE_ID", "")
_DEEPGRAM_API_KEY: str = os.getenv("DEEPGRAM_API_KEY", "")


# ---------------------------------------------------------------------------
# TTS / STT helpers
# ---------------------------------------------------------------------------


async def text_to_speech(text: str) -> bytes | None:
    """Convert text to MP3 audio bytes via ElevenLabs.

    Returns the raw audio bytes on success, or ``None`` on any error.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{_ELEVENLABS_VOICE_ID}",
                headers={
                    "xi-api-key": _ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                    "Accept": "audio/mpeg",
                },
                json={
                    "text": text,
                    "model_id": "eleven_monolingual_v1",
                    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
                },
            )
            if response.status_code == 200:
                return response.content
            logger.error("ElevenLabs TTS error: %d %s", response.status_code, response.text)
            return None
    except Exception as exc:
        logger.error("TTS error: %s", exc)
        return None


async def speech_to_text(audio_bytes: bytes) -> str:
    """Transcribe audio bytes to text via Deepgram Nova-2.

    Returns the transcript string, or an empty string on any error.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=en",
                headers={
                    "Authorization": f"Token {_DEEPGRAM_API_KEY}",
                    "Content-Type": "audio/webm",
                },
                content=audio_bytes,
            )
            if response.status_code == 200:
                data = response.json()
                return data["results"]["channels"][0]["alternatives"][0]["transcript"]
            logger.error("Deepgram STT error: %d", response.status_code)
            return ""
    except Exception as exc:
        logger.error("STT error: %s", exc)
        return ""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _send_json(websocket: WebSocket, payload: dict) -> None:
    await websocket.send_text(json.dumps(payload))


async def _send_question(
    websocket: WebSocket,
    question: dict,
    index: int,
    total: int,
) -> None:
    """Send question text + TTS audio to the client, then signal listening."""
    question_text: str = question.get("question_text", "")
    await _send_json(
        websocket,
        {
            "type": "question",
            "text": question_text,
            "index": index,
            "total": total,
            "category": question.get("category", ""),
        },
    )
    audio = await text_to_speech(question_text)
    if audio:
        await websocket.send_bytes(audio)
    await _send_json(websocket, {"type": "status", "message": "listening"})


# ---------------------------------------------------------------------------
# Main handler
# ---------------------------------------------------------------------------


async def interview_websocket(websocket: WebSocket, candidate_id: str) -> None:
    """Drive a real-time voice interview session over WebSocket.

    Flow: accept → load interview & questions → deliver questions via TTS →
    receive candidate audio → transcribe via STT → score → advance → report.

    Args:
        websocket: The active FastAPI WebSocket connection.
        candidate_id: UUID of the candidate being interviewed.
    """
    await websocket.accept()
    logger.info("WebSocket accepted for candidate %s", candidate_id)

    # Fetch the latest interview for this candidate
    try:
        raw = (
            _supabase.table("interviews")
            .select("*")
            .eq("candidate_id", candidate_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        interview: dict | None = raw.data[0] if raw.data else None
    except Exception as exc:
        logger.error("Failed to fetch interview for candidate %s: %s", candidate_id, exc)
        interview = None

    if not interview:
        await _send_json(
            websocket,
            {"type": "error", "message": "No interview found. Please upload your resume first."},
        )
        await websocket.close()
        return

    interview_id: str = interview["id"]
    questions: list[dict] = await get_questions(interview_id)

    if not questions:
        await _send_json(
            websocket,
            {"type": "error", "message": "No interview found. Please upload your resume first."},
        )
        await websocket.close()
        return

    await update_interview(interview_id, {"status": "in_progress"})
    logger.info("Interview %s started for candidate %s", interview_id, candidate_id)

    current_question_index: int = 0
    responses_collected: list[dict] = []
    total_questions: int = len(questions)

    # Send first question
    await _send_question(websocket, questions[0], 0, total_questions)

    # Main loop
    while current_question_index < total_questions:
        try:
            message = await asyncio.wait_for(websocket.receive(), timeout=120.0)

        except asyncio.TimeoutError:
            await _send_json(
                websocket, {"type": "warning", "message": "No response detected. Are you still there?"}
            )
            try:
                await asyncio.wait_for(websocket.receive(), timeout=60.0)
            except asyncio.TimeoutError:
                await _send_json(
                    websocket,
                    {"type": "complete", "message": "Interview timed out due to inactivity."},
                )
                await update_interview(interview_id, {"status": "timed_out"})
                await websocket.close()
                return

        except WebSocketDisconnect:
            logger.warning("Candidate %s disconnected during interview", candidate_id)
            await update_interview(interview_id, {"status": "interrupted"})
            return

        # --- Binary audio message ---
        if "bytes" in message and message["bytes"]:
            audio_bytes: bytes = message["bytes"]
            await _send_json(websocket, {"type": "status", "message": "processing"})

            transcript_text = await speech_to_text(audio_bytes)

            if not transcript_text or len(transcript_text) < 3:
                await _send_json(
                    websocket,
                    {"type": "error", "message": "Could not understand audio. Please try again."},
                )
                continue

            await _send_json(
                websocket,
                {"type": "transcript", "text": transcript_text, "speaker": "candidate"},
            )

            current_q = questions[current_question_index]
            scores = await evaluator.evaluate_response(
                question=current_q.get("question_text", ""),
                answer=transcript_text,
                resume_context={},
                job_role=interview.get("job_role", ""),
            )
            logger.info(
                "Response scored for interview %s question %d: overall avg %.1f",
                interview_id,
                current_question_index,
                sum(scores.get(k, 5) for k in ("technical_depth", "communication", "relevance", "confidence")) / 4,
            )

            try:
                await save_response(
                    {
                        "interview_id": interview_id,
                        "question_id": current_q.get("id"),
                        "transcript": transcript_text,
                        "scores": scores,
                        "feedback": scores.get("feedback", ""),
                    }
                )
            except Exception as exc:
                logger.error("Failed to save response for interview %s: %s", interview_id, exc)

            responses_collected.append(
                {
                    "question": current_q.get("question_text", ""),
                    "answer": transcript_text,
                    "scores": scores,
                    "category": current_q.get("category", ""),
                }
            )

            current_question_index += 1

            if current_question_index < total_questions:
                await _send_question(
                    websocket,
                    questions[current_question_index],
                    current_question_index,
                    total_questions,
                )
            else:
                await _send_json(
                    websocket,
                    {"type": "complete", "message": "Interview complete. Thank you!"},
                )
                from datetime import datetime, timezone
                await update_interview(
                    interview_id,
                    {
                        "status": "completed",
                        "completed_at": datetime.now(tz=timezone.utc).isoformat(),
                    },
                )
                await websocket.close()

                from pipeline import run_post_interview_pipeline
                asyncio.create_task(
                    run_post_interview_pipeline(
                        candidate_id,
                        interview_id,
                        {},
                        responses_collected,
                        interview.get("job_role", ""),
                    )
                )
                logger.info("Post-interview pipeline scheduled for interview %s", interview_id)
                return

        # --- Text control message ---
        elif "text" in message and message["text"]:
            try:
                control = json.loads(message["text"])
            except json.JSONDecodeError:
                continue

            action = control.get("action")

            if action == "skip":
                logger.info(
                    "Candidate %s skipped question %d", candidate_id, current_question_index
                )
                current_question_index += 1
                if current_question_index < total_questions:
                    await _send_question(
                        websocket,
                        questions[current_question_index],
                        current_question_index,
                        total_questions,
                    )
                else:
                    await _send_json(
                        websocket,
                        {"type": "complete", "message": "Interview complete. Thank you!"},
                    )
                    await update_interview(interview_id, {"status": "completed"})
                    await websocket.close()
                    return

            elif action == "end":
                logger.info("Candidate %s ended interview early", candidate_id)
                await _send_json(
                    websocket,
                    {"type": "complete", "message": "Interview ended early. Your responses have been saved."},
                )
                await update_interview(interview_id, {"status": "interrupted"})
                await websocket.close()
                return
