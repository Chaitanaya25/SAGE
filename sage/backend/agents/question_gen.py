"""Question generation agent — produces tailored interview questions from a parsed resume."""

import json
import logging
import os
import re

from openai import AsyncOpenAI

from database import save_questions

logger = logging.getLogger(__name__)

_client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))

_SYSTEM_PROMPT_TEMPLATE = """\
You are a senior technical interviewer at a top-tier company, \
conducting interviews for the SAGE AI recruitment platform.

Based on the candidate's resume and the role they are applying for,
generate exactly 8 interview questions.

Distribution:
- 3 technical questions (probe depth on their specific skills and past projects)
- 2 behavioral questions (use "Tell me about a time when..." format, based on their work history)
- 2 role-fit questions (why this role, career trajectory, team dynamics)
- 1 curveball question (creative problem-solving, unusual scenario, or lateral thinking)

RULES:
- Every question MUST reference something specific from their resume (a skill, a project, a company, a gap)
- No generic questions like "tell me about yourself" or "what are your strengths"
- Technical questions should require the candidate to demonstrate real knowledge, not just name-drop
- Behavioral questions should be anchored to situations they likely faced given their experience
- Order questions from easiest to hardest to build candidate confidence

The candidate is applying for: {job_role}

Return ONLY valid JSON:
{{
  "questions": [
    {{
      "question": "the full question text",
      "category": "technical" | "behavioral" | "role_fit" | "curveball",
      "context": "1 sentence explaining why you chose this question based on their resume"
    }}
  ]
}}"""


def _fallback_questions(job_role: str) -> list[dict]:
    return [
        {
            "question": f"What experience do you have that makes you a strong fit for a {job_role} role?",
            "category": "role_fit",
            "context": "Fallback question.",
        },
        {
            "question": f"Describe a challenging technical problem you solved in a previous {job_role} position.",
            "category": "technical",
            "context": "Fallback question.",
        },
        {
            "question": "Tell me about a time you disagreed with a teammate and how you resolved it.",
            "category": "behavioral",
            "context": "Fallback question.",
        },
        {
            "question": f"Where do you see the {job_role} field heading in the next 3 years?",
            "category": "role_fit",
            "context": "Fallback question.",
        },
        {
            "question": "If you could redesign one system you've worked on from scratch, what would you change?",
            "category": "curveball",
            "context": "Fallback question.",
        },
    ]


def _parse_questions_json(content: str) -> list[dict]:
    """Parse GPT response content into a questions list.

    Falls back to extracting from a markdown code fence if direct JSON parsing fails.
    """
    try:
        return json.loads(content)["questions"]
    except (json.JSONDecodeError, KeyError):
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", content, re.DOTALL)
        if match:
            return json.loads(match.group(1))["questions"]
        raise ValueError("Could not extract questions JSON from response")


async def generate_questions(
    parsed_resume: dict, job_role: str, interview_id: str
) -> list[dict]:
    """Generate a set of interview questions based on the candidate's resume and target role.

    Args:
        parsed_resume: Structured resume data returned by ``parse_resume``.
        job_role: Target job role to align questions with the required competencies.
        interview_id: UUID of the interview session these questions belong to.

    Returns:
        A list of question dicts, each containing ``question``, ``category``,
        and ``context`` keys. Questions are also persisted to the database.
    """
    resume_text = json.dumps(parsed_resume, indent=2)
    if len(resume_text) > 4000:
        resume_text = resume_text[:4000]

    system_prompt = _SYSTEM_PROMPT_TEMPLATE.format(job_role=job_role)
    questions: list[dict] = []

    for attempt in range(3):
        try:
            response = await _client.chat.completions.create(
                model="gpt-4o",
                temperature=0.7,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": resume_text},
                ],
            )
            content = response.choices[0].message.content or ""
            questions = _parse_questions_json(content)
            break
        except Exception as exc:
            logger.error("generate_questions attempt %d failed: %s", attempt + 1, exc)
            continue

    if not questions:
        logger.error("All retries exhausted — returning fallback questions for '%s'", job_role)
        questions = _fallback_questions(job_role)

    rows = [
        {
            "question_text": q["question"],
            "question_order": i,
            "category": q.get("category", "general"),
            "context": q.get("context", ""),
        }
        for i, q in enumerate(questions)
    ]

    try:
        await save_questions(interview_id, rows)
    except Exception as exc:
        logger.error("Failed to persist questions to database: %s", exc)

    return questions
