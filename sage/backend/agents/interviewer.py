"""Interviewer agent — orchestrates question delivery and response collection during a session."""


async def conduct_interview(interview_id: str, candidate_id: str, job_role: str) -> dict:
    """Drive an interview session by sequencing questions and collecting answers.

    Args:
        interview_id: UUID of the active interview session.
        candidate_id: UUID of the candidate being interviewed.
        job_role: Target job role used to contextualise question ordering.

    Returns:
        A dict containing the completed ``transcript`` (list of question/answer
        pairs) and ``interview_id`` upon session completion.
    """
    pass
