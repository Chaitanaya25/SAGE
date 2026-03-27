"""Evaluation agent — scores individual responses and aggregates full-interview results."""


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
        A dict containing ``score`` (0–10), ``rationale``, and ``flags``
        (e.g. inconsistencies with the resume or missing key competencies).
    """
    pass


async def evaluate_full_interview(
    responses: list[dict],
    resume_context: dict,
    job_role: str,
) -> dict:
    """Aggregate scores across all responses and produce an overall interview assessment.

    Args:
        responses: List of per-response evaluation dicts as returned by
            ``evaluate_response``.
        resume_context: Parsed resume data for holistic candidate assessment.
        job_role: Target job role used to weight competency areas.

    Returns:
        A dict containing ``overall_score``, ``category_scores``,
        ``strengths``, ``weaknesses``, and ``recommendation``.
    """
    pass
