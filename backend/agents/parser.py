from __future__ import annotations

import json
import logging
import os
from io import BytesIO
from typing import Any, Dict

from openai import AsyncOpenAI
from PyPDF2 import PdfReader

from database import update_candidate


logger = logging.getLogger(__name__)
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def parse_resume(pdf_bytes: bytes, candidate_id: str, job_role: str) -> Dict[str, Any]:
    reader = PdfReader(BytesIO(pdf_bytes))
    text = "".join([(page.extract_text() or "") for page in reader.pages])

    if len(text.strip()) < 50:
        raise ValueError("Could not extract meaningful text from PDF")

    text = text[:6000]

    response = await client.chat.completions.create(
        model="gpt-4o",
        temperature=0.1,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": f"""You are an expert resume parser for SAGE recruitment platform.
Extract structured data from this resume. Candidate is applying for: {job_role}

Return ONLY valid JSON:
{{
  "name": "string",
  "email": "string or null",
  "phone": "string or null",
  "skills": ["string"],
  "experience": [{{"company": "string", "role": "string", "duration": "string", "highlights": ["string"]}}],
  "education": [{{"institution": "string", "degree": "string", "year": "string or null"}}],
  "gaps": ["string"],
  "role_fit_score": 1-10,
  "summary": "2-3 sentence summary"
}}""",
            },
            {"role": "user", "content": text},
        ],
    )

    content = response.choices[0].message.content or "{}"
    parsed: Dict[str, Any] = json.loads(content)

    update_payload: Dict[str, Any] = {"resume_parsed": parsed}
    name = parsed.get("name")
    email = parsed.get("email")
    phone = parsed.get("phone")
    if isinstance(name, str) and name.strip():
        update_payload["name"] = name.strip()
    if isinstance(email, str) and email.strip():
        update_payload["email"] = email.strip()
    if isinstance(phone, str) and phone.strip():
        update_payload["phone"] = phone.strip()

    await update_candidate(candidate_id, update_payload)

    logger.info("Resume parsed for candidate %s", candidate_id)
    return parsed
