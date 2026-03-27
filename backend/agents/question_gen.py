from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List

from openai import AsyncOpenAI

from database import save_questions


logger = logging.getLogger(__name__)
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def generate_questions(
    parsed_resume: Dict[str, Any], job_role: str, interview_id: str
) -> List[Dict[str, Any]]:
    response = await client.chat.completions.create(
        model="gpt-4o",
        temperature=0.7,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": f"""You are a senior interviewer for SAGE recruitment platform.
Generate exactly 8 interview questions based on the candidate's resume.

Distribution: 3 technical, 2 behavioral, 2 role-fit, 1 curveball.
Every question MUST reference something specific from their resume.
No generic questions. Order from easiest to hardest.
Candidate is applying for: {job_role}

Return JSON: {{"questions": [{{"question": "text", "category": "technical|behavioral|role_fit|curveball", "context": "why chosen"}}]}}""",
            },
            {"role": "user", "content": json.dumps(parsed_resume, indent=2)[:4000]},
        ],
    )

    content = response.choices[0].message.content or "{}"
    result: Dict[str, Any] = json.loads(content)
    questions: List[Dict[str, Any]] = result.get("questions", []) or []

    await save_questions(
        interview_id,
        [
            {
                "question_text": q["question"],
                "question_order": i,
                "category": q["category"],
                "context": q.get("context", ""),
            }
            for i, q in enumerate(questions)
        ],
    )

    logger.info("Generated %s questions for interview %s", len(questions), interview_id)
    return questions
