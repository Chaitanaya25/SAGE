"""Report generation agent — compiles all interview artefacts into a final candidate report."""


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
    """
    pass
