"""Evaluation agent — scores individual responses and aggregates full-interview results."""

import json
import logging
import os

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

_client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))

_EVAL_SYSTEM_PROMPT_TEMPLATE = """\
You are an expert interview evaluator for the SAGE AI recruitment platform.
Score this interview response on exactly 4 dimensions, each on a scale of 1-10:

- technical_depth: Does the answer demonstrate genuine, specific technical knowledge? \
(1 = no technical substance, 10 = expert-level depth with concrete examples)
- communication: Is the answer clear, well-structured, and articulate?
  (1 = incoherent/rambling, 10 = perfectly structured, concise, compelling)
- relevance: Does the answer directly address the question asked?
  (1 = completely off-topic, 10 = precisely addresses every aspect of the question)
- confidence: Does the candidate sound confident and assured?
  (1 = extremely uncertain/hesitant, 10 = confidently authoritative)

Also provide:
- feedback: One specific, constructive sentence about the answer
- red_flags: Any concerns noticed (empty string if none)

Context: The candidate applied for {job_role}

Return ONLY valid JSON:
{{
  "technical_depth": int,
  "communication": int,
  "relevance": int,
  "confidence": int,
  "feedback": "string",
  "red_flags": "string"
}}"""

_SCORE_KEYS = ("technical_depth", "communication", "relevance", "confidence")

_DEFAULT_SCORES: dict = {
    "technical_depth": 5,
    "communication": 5,
    "relevance": 5,
    "confidence": 5,
    "feedback": "Could not evaluate",
    "red_flags": "",
}


async def evaluate_response(
    question: str,
    answer: str,
    resume_context: dict,
    job_role: str,
) -> dict:
    """Evaluate a single candidate response against the asked question.

    Args:
        question: The interview question that was posed to the candidate.
        answer: The candidate's transcribed answer.
        resume_context: Parsed resume data used to cross-reference claims.
        job_role: Target job role providing the evaluation rubric context.

    Returns:
        A dict with integer scores (1–10) for ``technical_depth``,
        ``communication``, ``relevance``, and ``confidence``, plus
        ``feedback`` and ``red_flags`` strings.
    """
    system_prompt = _EVAL_SYSTEM_PROMPT_TEMPLATE.format(job_role=job_role)
    user_message = f"Question: {question}\n\nCandidate's Answer: {answer}"

    try:
        response = await _client.chat.completions.create(
            model="gpt-4o",
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
        )
        content = response.choices[0].message.content or ""
        scores: dict = json.loads(content)

        for key in _SCORE_KEYS:
            scores[key] = max(1, min(10, int(scores[key])))

        return scores

    except Exception as exc:
        logger.error("evaluate_response failed: %s", exc)
        return dict(_DEFAULT_SCORES)


async def evaluate_full_interview(
    responses: list[dict],
    resume_context: dict,
    job_role: str,
) -> dict:
    """Aggregate scores across all responses and produce an overall interview assessment.

    Each item in ``responses`` must contain:
        - ``question`` (str)
        - ``answer`` (str)
        - ``scores`` (dict) — as returned by ``evaluate_response``
        - ``category`` (str, optional)

    This function performs pure computation; it does not call the OpenAI API.

    Args:
        responses: List of per-response dicts with embedded score dictionaries.
        resume_context: Parsed resume data for holistic candidate assessment.
        job_role: Target job role used to weight competency areas.

    Returns:
        A dict containing ``average_scores``, ``per_question_scores``,
        ``strongest_answer``, ``weakest_answer``, ``overall_score``,
        ``total_questions``, and ``total_answered``.
    """
    _zero_scores = {k: 0.0 for k in _SCORE_KEYS}

    if not responses:
        return {
            "average_scores": dict(_zero_scores),
            "per_question_scores": [],
            "strongest_answer": {"question": "", "avg_score": 0.0},
            "weakest_answer": {"question": "", "avg_score": 0.0},
            "overall_score": 0.0,
            "total_questions": 0,
            "total_answered": 0,
        }

    per_question_scores: list[dict] = []
    avgs: list[float] = []

    for resp in responses:
        scores = resp.get("scores", {k: 5 for k in _SCORE_KEYS})
        avg = sum(scores.get(k, 5) for k in _SCORE_KEYS) / len(_SCORE_KEYS)
        avgs.append(avg)
        per_question_scores.append(
            {
                "question": resp.get("question", ""),
                "category": resp.get("category", ""),
                "scores": {k: scores.get(k, 5) for k in _SCORE_KEYS},
                "feedback": scores.get("feedback", ""),
            }
        )

    n = len(responses)

    average_scores = {
        k: round(
            sum(r.get("scores", {}).get(k, 5) for r in responses) / n,
            2,
        )
        for k in _SCORE_KEYS
    }

    strongest_idx = avgs.index(max(avgs))
    weakest_idx = avgs.index(min(avgs))

    weighted_scores = [
        (
            r.get("scores", {}).get("technical_depth", 5) * 0.35
            + r.get("scores", {}).get("communication", 5) * 0.25
            + r.get("scores", {}).get("relevance", 5) * 0.25
            + r.get("scores", {}).get("confidence", 5) * 0.15
        )
        for r in responses
    ]
    overall_score = round(sum(weighted_scores) / n, 1)

    return {
        "average_scores": average_scores,
        "per_question_scores": per_question_scores,
        "strongest_answer": {
            "question": responses[strongest_idx].get("question", ""),
            "avg_score": round(avgs[strongest_idx], 2),
        },
        "weakest_answer": {
            "question": responses[weakest_idx].get("question", ""),
            "avg_score": round(avgs[weakest_idx], 2),
        },
        "overall_score": overall_score,
        "total_questions": n,
        "total_answered": n,
    }
