from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any, Dict, List, Optional

import httpx
from fastapi import WebSocket, WebSocketDisconnect

from agents import evaluator
from database import (
    get_all_interviews,
    get_questions,
    update_interview,
    save_response,
)


logger = logging.getLogger(__name__)


async def text_to_speech(text: str) -> Optional[bytes]:
    voice_id = os.getenv("ELEVENLABS_VOICE_ID")
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not voice_id or not api_key:
        return None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={
                    "xi-api-key": api_key,
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
            logger.error("ElevenLabs error: %s %s", response.status_code, response.text)
            return None
    except Exception as e:
        logger.error("TTS error: %s", e)
        return None


async def speech_to_text(audio_bytes: bytes) -> str:
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        return ""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=en",
                headers={
                    "Authorization": f"Token {api_key}",
                    "Content-Type": "audio/webm",
                },
                content=audio_bytes,
            )
            if response.status_code == 200:
                data = response.json()
                return (
                    data.get("results", {})
                    .get("channels", [{}])[0]
                    .get("alternatives", [{}])[0]
                    .get("transcript", "")
                )
            logger.error("Deepgram error: %s %s", response.status_code, response.text)
            return ""
    except Exception as e:
        logger.error("STT error: %s", e)
        return ""


def _pick_interview_for_candidate(
    interviews: List[Dict[str, Any]], candidate_id: str
) -> Optional[Dict[str, Any]]:
    matches = [iv for iv in interviews if iv.get("candidate_id") == candidate_id]
    if not matches:
        return None
    matches.sort(key=lambda iv: iv.get("created_at", ""), reverse=True)
    return matches[0]


def _question_text(q: Dict[str, Any]) -> str:
    if "question_text" in q and isinstance(q.get("question_text"), str):
        return q.get("question_text", "")
    payload = q.get("question")
    if isinstance(payload, dict):
        return str(payload.get("text") or payload.get("question") or "")
    if isinstance(payload, str):
        return payload
    return ""


def _question_order(q: Dict[str, Any]) -> int:
    value = q.get("question_order", q.get("order", 0))
    try:
        return int(value)
    except Exception:
        return 0


async def interview_websocket(websocket: WebSocket, candidate_id: str) -> None:
    await websocket.accept()

    all_interviews = await get_all_interviews()
    interview = _pick_interview_for_candidate(all_interviews, candidate_id)

    if not interview:
        await websocket.send_json(
            {"type": "error", "message": "No interview found. Upload your resume first."}
        )
        await websocket.close()
        return

    interview_id = str(interview["id"])
    questions = await get_questions(interview_id)

    if not questions:
        await websocket.send_json({"type": "error", "message": "No questions generated yet."})
        await websocket.close()
        return

    questions.sort(key=_question_order)
    await update_interview(interview_id, {"status": "in_progress"})

    current_index = 0
    total = len(questions)
    responses_collected: List[Dict[str, Any]] = []

    first_q = questions[0]
    first_text = _question_text(first_q)
    await websocket.send_json(
        {
            "type": "question",
            "text": first_text,
            "index": 0,
            "total": total,
            "category": first_q.get("category", ""),
        }
    )

    audio = await text_to_speech(first_text)
    if audio:
        await websocket.send_bytes(audio)

    await websocket.send_json({"type": "status", "message": "listening"})

    try:
        while current_index < total:
            try:
                message = await asyncio.wait_for(websocket.receive(), timeout=120.0)
            except asyncio.TimeoutError:
                await websocket.send_json(
                    {"type": "warning", "message": "No response detected. Are you still there?"}
                )
                try:
                    message = await asyncio.wait_for(websocket.receive(), timeout=60.0)
                except asyncio.TimeoutError:
                    await websocket.send_json({"type": "complete", "message": "Interview timed out."})
                    await update_interview(interview_id, {"status": "timed_out"})
                    await websocket.close()
                    return

            if message.get("type") == "websocket.disconnect":
                raise WebSocketDisconnect

            audio_bytes = message.get("bytes")
            if audio_bytes is not None:
                await websocket.send_json({"type": "status", "message": "processing"})

                transcript_text = await speech_to_text(audio_bytes)
                if not transcript_text or len(transcript_text.strip()) < 3:
                    await websocket.send_json(
                        {"type": "error", "message": "Could not understand audio. Please try again."}
                    )
                    await websocket.send_json({"type": "status", "message": "listening"})
                    continue

                await websocket.send_json(
                    {"type": "transcript", "text": transcript_text, "speaker": "candidate"}
                )

                current_q = questions[current_index]
                current_text = _question_text(current_q)
                scores = await evaluator.evaluate_response(
                    question=current_text,
                    answer=transcript_text,
                    resume_context={},
                    job_role=str(interview.get("job_role", "") or ""),
                )

                await save_response(
                    {
                        "interview_id": interview_id,
                        "question_id": current_q.get("id"),
                        "transcript": transcript_text,
                        "scores": scores,
                        "feedback": scores.get("feedback", ""),
                    }
                )

                responses_collected.append(
                    {
                        "question": current_text,
                        "answer": transcript_text,
                        "scores": scores,
                    }
                )

                current_index += 1

                if current_index < total:
                    next_q = questions[current_index]
                    next_text = _question_text(next_q)
                    await websocket.send_json(
                        {
                            "type": "question",
                            "text": next_text,
                            "index": current_index,
                            "total": total,
                            "category": next_q.get("category", ""),
                        }
                    )

                    audio = await text_to_speech(next_text)
                    if audio:
                        await websocket.send_bytes(audio)

                    await websocket.send_json({"type": "status", "message": "listening"})
                else:
                    await websocket.send_json(
                        {"type": "complete", "message": "Interview complete. Thank you!"}
                    )
                    await update_interview(interview_id, {"status": "completed"})
                    await websocket.close()

                    from pipeline import run_post_interview_pipeline

                    asyncio.create_task(
                        run_post_interview_pipeline(
                            candidate_id,
                            interview_id,
                            {},
                            responses_collected,
                            str(interview.get("job_role", "") or ""),
                        )
                    )
                    return

            text_payload = message.get("text")
            if text_payload:
                try:
                    data = json.loads(text_payload)
                except json.JSONDecodeError:
                    continue

                if data.get("action") == "skip":
                    current_index += 1
                    if current_index < total:
                        next_q = questions[current_index]
                        next_text = _question_text(next_q)
                        await websocket.send_json(
                            {
                                "type": "question",
                                "text": next_text,
                                "index": current_index,
                                "total": total,
                                "category": next_q.get("category", ""),
                            }
                        )
                        audio = await text_to_speech(next_text)
                        if audio:
                            await websocket.send_bytes(audio)
                        await websocket.send_json({"type": "status", "message": "listening"})
                    else:
                        await websocket.send_json(
                            {"type": "complete", "message": "Interview complete. Thank you!"}
                        )
                        await update_interview(interview_id, {"status": "completed"})
                        await websocket.close()
                        return

                if data.get("action") == "end":
                    await websocket.send_json({"type": "complete", "message": "Interview ended early."})
                    await update_interview(interview_id, {"status": "completed"})
                    await websocket.close()
                    return

    except WebSocketDisconnect:
        logger.warning("Candidate %s disconnected", candidate_id)
        await update_interview(interview_id, {"status": "interrupted"})
