from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List

from openai import AsyncOpenAI


logger = logging.getLogger(__name__)
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def evaluate_response(
    question: str, answer: str, resume_context: Dict[str, Any], job_role: str
) -> Dict[str, Any]:
    response = await client.chat.completions.create(
        model="gpt-4o",
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": f"""Score this interview answer on 4 dimensions (1-10 each):
- technical_depth: genuine technical knowledge shown
- communication: clarity and structure of answer
- relevance: does it address the question
- confidence: how assured the candidate sounds

Also provide feedback (1 sentence) and red_flags (empty string if none).
Candidate applied for: {job_role}

Return JSON: {{"technical_depth": int, "communication": int, "relevance": int, "confidence": int, "feedback": "string", "red_flags": "string"}}""",
            },
            {"role": "user", "content": f"Question: {question}\n\nAnswer: {answer}"},
        ],
    )

    content = response.choices[0].message.content or "{}"
    scores: Dict[str, Any] = json.loads(content)
    for key in ["technical_depth", "communication", "relevance", "confidence"]:
        scores[key] = max(1, min(10, int(scores.get(key, 5))))
    return scores


async def evaluate_full_interview(
    responses: List[Dict[str, Any]], resume_context: Dict[str, Any], job_role: str
) -> Dict[str, Any]:
    if not responses:
        return {
            "average_scores": {},
            "overall_score": 0,
            "per_question_scores": [],
            "total_questions": 0,
            "total_answered": 0,
        }

    dimensions = ["technical_depth", "communication", "relevance", "confidence"]
    weights = {
        "technical_depth": 0.35,
        "communication": 0.25,
        "relevance": 0.25,
        "confidence": 0.15,
    }

    avg_scores: Dict[str, float] = {}
    for dim in dimensions:
        values = [r["scores"].get(dim, 5) for r in responses if "scores" in r]
        avg_scores[dim] = round(sum(values) / len(values), 1) if values else 5.0

    overall = sum(avg_scores[d] * weights[d] for d in dimensions)

    per_q = [
        {
            "question": r.get("question", ""),
            "scores": r.get("scores", {}),
            "feedback": r.get("scores", {}).get("feedback", ""),
        }
        for r in responses
    ]

    all_avgs = [
        (
            r.get("question", ""),
            sum(r.get("scores", {}).get(d, 5) for d in dimensions) / 4,
        )
        for r in responses
        if "scores" in r
    ]
    strongest = max(all_avgs, key=lambda x: x[1]) if all_avgs else ("", 0)
    weakest = min(all_avgs, key=lambda x: x[1]) if all_avgs else ("", 0)

    return {
        "average_scores": avg_scores,
        "per_question_scores": per_q,
        "strongest_answer": {"question": strongest[0], "avg_score": round(strongest[1], 1)},
        "weakest_answer": {"question": weakest[0], "avg_score": round(weakest[1], 1)},
        "overall_score": round(overall, 1),
        "total_questions": len(responses),
        "total_answered": len([r for r in responses if r.get("scores")]),
    }
