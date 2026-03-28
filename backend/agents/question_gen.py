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
                "content": f"""You are a senior technical interviewer at a top tech company.
Generate exactly 8 interview questions for a {job_role} position based on the candidate's resume.

Question distribution:
- Questions 1-2: Start with a warm greeting and ask about their background/experience overview
- Questions 3-5: Deep technical questions about specific projects, technologies, and implementations mentioned in their resume
- Questions 6-7: Behavioral/situational questions relevant to the role
- Question 8: A thoughtful closing question about career goals or problem-solving approach

Rules:
- NO silly, hypothetical, or "superpower" type questions
- Questions must be professional and directly relevant to the job role
- Reference specific projects and technologies from the resume
- Questions should progressively increase in difficulty
- First question should ALWAYS be: "Welcome to your SAGE assessment. Could you start by telling me about yourself and what drew you to the {job_role} role?"

Return JSON: {{"questions": [{{"question": "text", "category": "technical|behavioral|role_fit", "context": "why chosen"}}]}}""",
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
