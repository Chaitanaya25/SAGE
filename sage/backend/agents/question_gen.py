"""Question generation agent — produces tailored interview questions from a parsed resume."""


async def generate_questions(
    parsed_resume: dict, job_role: str, interview_id: str
) -> list[dict]:
    """Generate a set of interview questions based on the candidate's resume and target role.

    Args:
        parsed_resume: Structured resume data returned by ``parse_resume``.
        job_role: Target job role to align questions with the required competencies.
        interview_id: UUID of the interview session these questions belong to.

    Returns:
        A list of question dicts, each containing at minimum ``question_text``
        and ``category`` (e.g. "technical", "behavioural", "situational").
    """
    pass
