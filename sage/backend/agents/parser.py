"""Resume parsing agent — extracts structured candidate data from a PDF."""


async def parse_resume(pdf_bytes: bytes, candidate_id: str, job_role: str) -> dict:
    """Parse a PDF resume and return structured candidate information.

    Args:
        pdf_bytes: Raw bytes of the uploaded PDF file.
        candidate_id: UUID of the candidate record in the database.
        job_role: Target job role used to focus extraction (e.g. "Backend Engineer").

    Returns:
        A dictionary containing parsed fields such as name, contact details,
        skills, work experience, education, and any role-relevant highlights.
    """
    pass
