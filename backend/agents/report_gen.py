from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List

from openai import AsyncOpenAI

from database import save_report


logger = logging.getLogger(__name__)
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def generate_report(
    candidate_id: str,
    interview_id: str,
    parsed_resume: Dict[str, Any],
    transcript: List[Dict[str, Any]],
    aggregated_scores: Dict[str, Any],
) -> Dict[str, Any]:
    transcript_summary = "\n".join(
        [
            f"Q{i + 1}: {r.get('question', '')}\nA: {r.get('answer', '')}\nScores: {r.get('scores', {})}"
            for i, r in enumerate(transcript)
        ]
    )

    response = await client.chat.completions.create(
        model="gpt-4o",
        temperature=0.3,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": """You are the final evaluation AI for SAGE recruitment platform.
Produce a comprehensive candidate evaluation report.

HIRE: overall >= 7.0 and no dimension below 5.0
MAYBE: overall >= 5.5 or mixed strengths
NO_HIRE: overall < 5.5 or any dimension consistently below 4.0

Return JSON:
{
  "overall_score": float,
  "recommendation": "HIRE"|"NO_HIRE"|"MAYBE",
  "strengths": ["3 specific items"],
  "weaknesses": ["2 specific items"],
  "summary": "3-4 paragraph evaluation",
  "suggested_follow_up": ["questions if MAYBE"],
  "culture_fit_notes": "1-2 sentences"
}""",
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "resume": parsed_resume,
                        "transcript": transcript_summary,
                        "scores": aggregated_scores,
                    },
                    indent=2,
                )[:8000],
            },
        ],
    )

    content = response.choices[0].message.content or "{}"
    report: Dict[str, Any] = json.loads(content)

    await save_report(
        {
            "interview_id": interview_id,
            "overall_score": report.get("overall_score", 0),
            "scores_json": aggregated_scores,
            "strengths": report.get("strengths", []),
            "weaknesses": report.get("weaknesses", []),
            "recommendation": report.get("recommendation", "MAYBE"),
            "summary": report.get("summary", ""),
            "suggested_follow_up": report.get("suggested_follow_up", []),
        }
    )

    logger.info(
        "Report generated for interview %s: %s",
        interview_id,
        report.get("recommendation"),
    )
    return report
