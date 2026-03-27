from __future__ import annotations

import logging
from typing import TypedDict

from langgraph.graph import END, StateGraph

from agents import evaluator, parser, question_gen, report_gen


logger = logging.getLogger(__name__)


class SAGEState(TypedDict):
    candidate_id: str
    interview_id: str
    job_role: str
    resume_raw: bytes
    resume_parsed: dict
    questions: list
    transcript: list
    scores: dict
    final_report: dict
    status: str
    error: str


async def parse_node(state: SAGEState) -> dict:
    try:
        parsed = await parser.parse_resume(
            state["resume_raw"], state["candidate_id"], state["job_role"]
        )
        return {"resume_parsed": parsed, "status": "parsed"}
    except Exception as e:
        logger.error("Parse failed: %s", e)
        return {"status": "parse_failed", "error": str(e)}


async def question_node(state: SAGEState) -> dict:
    try:
        questions = await question_gen.generate_questions(
            state["resume_parsed"], state["job_role"], state["interview_id"]
        )
        return {"questions": questions, "status": "questions_ready"}
    except Exception as e:
        logger.error("Question gen failed: %s", e)
        return {"status": "question_gen_failed", "error": str(e)}


async def interview_pending_node(state: SAGEState) -> dict:
    return {"status": "awaiting_interview"}


def should_continue(state: SAGEState) -> str:
    return END if "failed" in state.get("status", "") else "next"


graph = StateGraph(SAGEState)
graph.add_node("parse_resume", parse_node)
graph.add_node("generate_questions", question_node)
graph.add_node("await_interview", interview_pending_node)
graph.set_entry_point("parse_resume")
graph.add_conditional_edges("parse_resume", should_continue, {"next": "generate_questions", END: END})
graph.add_conditional_edges("generate_questions", should_continue, {"next": "await_interview", END: END})
graph.add_edge("await_interview", END)
compiled_pipeline = graph.compile()


async def run_pre_interview_pipeline(
    candidate_id: str, interview_id: str, resume_bytes: bytes, job_role: str
) -> dict:
    result = await compiled_pipeline.ainvoke(
        {
            "candidate_id": candidate_id,
            "interview_id": interview_id,
            "job_role": job_role,
            "resume_raw": resume_bytes,
            "resume_parsed": {},
            "questions": [],
            "transcript": [],
            "scores": {},
            "final_report": {},
            "status": "starting",
            "error": "",
        }
    )
    return result


async def run_post_interview_pipeline(
    candidate_id: str,
    interview_id: str,
    resume_parsed: dict,
    transcript: list,
    job_role: str,
) -> dict:
    aggregated = await evaluator.evaluate_full_interview(transcript, resume_parsed, job_role)
    report = await report_gen.generate_report(
        candidate_id, interview_id, resume_parsed, transcript, aggregated
    )
    return {"scores": aggregated, "final_report": report, "status": "completed"}
