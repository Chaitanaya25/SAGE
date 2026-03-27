"""Report generation agent — compiles all interview artefacts into a final candidate report."""

import json
import logging
import os

from openai import AsyncOpenAI

from database import save_report

logger = logging.getLogger(__name__)

_client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))

_SYSTEM_PROMPT = """\
You are the final evaluation AI for SAGE, an autonomous recruitment platform.

You are given:
- The candidate's parsed resume
- Their complete interview transcript with per-answer scores
- Aggregated scores across all answers

Produce a comprehensive final evaluation report.

Scoring guide for recommendation:
- HIRE: overall_score >= 7.0 AND no single dimension average below 5.0
- MAYBE: overall_score >= 5.5 OR strong technical but weak communication (or vice versa)
- NO_HIRE: overall_score < 5.5 OR any dimension consistently below 4.0

Return ONLY valid JSON:
{
  "overall_score": float (1-10, to 1 decimal place),
  "recommendation": "HIRE" | "NO_HIRE" | "MAYBE",
  "strengths": ["string", "string", "string"],
  "weaknesses": ["string", "string"],
  "summary": "3-4 paragraph detailed evaluation. Reference specific interview answers and resume details. Justify the recommendation clearly. Write as if presenting to a hiring manager.",
  "suggested_follow_up": ["string"],
  "culture_fit_notes": "1-2 sentences assessing communication style and team fit based on interview responses"
}"""

_MINIMAL_REPORT: dict = {
    "overall_score": 0.0,
    "recommendation": "MAYBE",
    "strengths": [],
    "weaknesses": [],
    "summary": "Evaluation could not be completed automatically. Manual review recommended.",
    "suggested_follow_up": [],
    "culture_fit_notes": "",
}


def _build_transcript_summary(transcript: list[dict]) -> str:
    """Format the transcript into a concise prompt-friendly string."""
    lines: list[str] = []
    for i, entry in enumerate(transcript):
        scores = entry.get("scores", {})
        lines.append(
            f"Q{i + 1}: {entry.get('question', '')}\n"
            f"A: {entry.get('answer', '')}\n"
            f"Scores: tech={scores.get('technical_depth', 'N/A')}, "
            f"comm={scores.get('communication', 'N/A')}, "
            f"rel={scores.get('relevance', 'N/A')}, "
            f"conf={scores.get('confidence', 'N/A')}"
        )
    return "\n\n".join(lines)


async def generate_report(
    candidate_id: str,
    interview_id: str,
    parsed_resume: dict,
    transcript: list[dict],
    aggregated_scores: dict,
) -> dict:
    """Generate a comprehensive evaluation report for a completed interview.

    Args:
        candidate_id: UUID of the candidate.
        interview_id: UUID of the completed interview session.
        parsed_resume: Structured resume data used for candidate background section.
        transcript: Ordered list of question/answer pairs from the interview.
        aggregated_scores: Full-interview evaluation dict from ``evaluate_full_interview``.

    Returns:
        A dict representing the final report, including candidate summary,
        per-question breakdown, overall scores, and hiring recommendation.
        The report is also persisted to the database.
    """
    transcript_summary = _build_transcript_summary(transcript)

    user_message = json.dumps(
        {
            "parsed_resume": parsed_resume,
            "transcript_summary": transcript_summary,
            "aggregated_scores": aggregated_scores,
        },
        indent=2,
    )

    try:
        response = await _client.chat.completions.create(
            model="gpt-4o",
            temperature=0.3,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
        )
        content = response.choices[0].message.content or ""
        report: dict = json.loads(content)
        logger.info(
            "Report generated for interview %s — recommendation: %s",
            interview_id,
            report.get("recommendation"),
        )
    except Exception as exc:
        logger.error("generate_report failed for interview %s: %s", interview_id, exc)
        report = dict(_MINIMAL_REPORT)

    try:
        await save_report(
            {
                "interview_id": interview_id,
                "overall_score": report.get("overall_score", 0.0),
                "scores_json": aggregated_scores,
                "strengths": report.get("strengths", []),
                "weaknesses": report.get("weaknesses", []),
                "recommendation": report.get("recommendation", "MAYBE"),
                "summary": report.get("summary", ""),
                "suggested_follow_up": report.get("suggested_follow_up", []),
            }
        )
    except Exception as exc:
        logger.error("Failed to persist report for interview %s: %s", interview_id, exc)

    report["candidate_id"] = candidate_id
    report["interview_id"] = interview_id
    return report
