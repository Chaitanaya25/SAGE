"""LangGraph pipeline — orchestrates the SAGE recruitment workflow."""

import logging
from typing import TypedDict

from langgraph.graph import END, StateGraph

from agents import evaluator, parser, question_gen, report_gen

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# State schema
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Node functions
# ---------------------------------------------------------------------------


async def parse_node(state: SAGEState) -> dict:
    """Parse the raw resume PDF and store structured data in state."""
    try:
        parsed = await parser.parse_resume(
            state["resume_raw"], state["candidate_id"], state["job_role"]
        )
        logger.info("Resume parsed for candidate %s", state["candidate_id"])
        return {"resume_parsed": parsed, "status": "parsed"}
    except Exception as exc:
        logger.error("parse_node failed: %s", exc)
        return {"status": "parse_failed", "error": str(exc)}


async def question_node(state: SAGEState) -> dict:
    """Generate interview questions from the parsed resume."""
    try:
        questions = await question_gen.generate_questions(
            state["resume_parsed"], state["job_role"], state["interview_id"]
        )
        logger.info(
            "Generated %d questions for interview %s", len(questions), state["interview_id"]
        )
        return {"questions": questions, "status": "questions_ready"}
    except Exception as exc:
        logger.error("question_node failed: %s", exc)
        return {"status": "question_gen_failed", "error": str(exc)}


async def interview_pending_node(state: SAGEState) -> dict:
    """Passthrough node — actual interview happens via WebSocket separately."""
    logger.info("Interview %s is ready and awaiting candidate responses", state["interview_id"])
    return {"status": "awaiting_interview"}


async def evaluate_node(state: SAGEState) -> dict:
    """Aggregate per-response scores into a full-interview evaluation."""
    try:
        aggregated = await evaluator.evaluate_full_interview(
            state["transcript"], state["resume_parsed"], state["job_role"]
        )
        logger.info(
            "Evaluation complete for interview %s — overall score: %s",
            state["interview_id"],
            aggregated.get("overall_score"),
        )
        return {"scores": aggregated, "status": "evaluated"}
    except Exception as exc:
        logger.error("evaluate_node failed: %s", exc)
        return {"status": "evaluation_failed", "error": str(exc)}


async def report_node(state: SAGEState) -> dict:
    """Generate and persist the final candidate report."""
    try:
        report = await report_gen.generate_report(
            state["candidate_id"],
            state["interview_id"],
            state["resume_parsed"],
            state["transcript"],
            state["scores"],
        )
        logger.info(
            "Report generated for interview %s — recommendation: %s",
            state["interview_id"],
            report.get("recommendation"),
        )
        return {"final_report": report, "status": "completed"}
    except Exception as exc:
        logger.error("report_node failed: %s", exc)
        return {"status": "report_failed", "error": str(exc)}


# ---------------------------------------------------------------------------
# Routing conditions
# ---------------------------------------------------------------------------


def should_continue_after_parse(state: SAGEState) -> str:
    """Route to question generation or terminate on parse failure."""
    return "generate_questions" if "failed" not in state.get("status", "") else END


def should_continue_after_questions(state: SAGEState) -> str:
    """Route to interview wait state or terminate on question generation failure."""
    return "await_interview" if "failed" not in state.get("status", "") else END


# ---------------------------------------------------------------------------
# Graph construction
# ---------------------------------------------------------------------------

graph = StateGraph(SAGEState)

graph.add_node("parse_resume", parse_node)
graph.add_node("generate_questions", question_node)
graph.add_node("await_interview", interview_pending_node)
graph.add_node("evaluate", evaluate_node)
graph.add_node("generate_report", report_node)

graph.set_entry_point("parse_resume")
graph.add_conditional_edges("parse_resume", should_continue_after_parse)
graph.add_conditional_edges("generate_questions", should_continue_after_questions)
graph.add_edge("await_interview", END)
graph.add_edge("evaluate", "generate_report")
graph.add_edge("generate_report", END)

compiled_pipeline = graph.compile()


# ---------------------------------------------------------------------------
# Public runner functions
# ---------------------------------------------------------------------------


async def run_pre_interview_pipeline(
    candidate_id: str,
    interview_id: str,
    resume_bytes: bytes,
    job_role: str,
) -> dict:
    """Run the pre-interview pipeline: parse resume → generate questions → await interview.

    Args:
        candidate_id: UUID of the candidate record.
        interview_id: UUID of the interview session.
        resume_bytes: Raw PDF bytes of the uploaded resume.
        job_role: Target job role for question tailoring.

    Returns:
        Final pipeline state dict containing ``resume_parsed``, ``questions``,
        and ``status``.
    """
    logger.info(
        "Starting pre-interview pipeline for candidate %s, interview %s",
        candidate_id,
        interview_id,
    )
    initial_state: SAGEState = {
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
    result = await compiled_pipeline.ainvoke(initial_state)
    logger.info(
        "Pre-interview pipeline finished with status '%s' for interview %s",
        result.get("status"),
        interview_id,
    )
    return result


async def run_post_interview_pipeline(
    candidate_id: str,
    interview_id: str,
    resume_parsed: dict,
    transcript: list,
    job_role: str,
) -> dict:
    """Run the post-interview pipeline: evaluate responses → generate report.

    Called after the WebSocket interview session ends, bypassing the graph
    entry point to run only the evaluation and report stages.

    Args:
        candidate_id: UUID of the candidate record.
        interview_id: UUID of the completed interview session.
        resume_parsed: Structured resume data from the pre-interview pipeline.
        transcript: Ordered list of question/answer/scores dicts.
        job_role: Target job role used for scoring context.

    Returns:
        Dict containing ``scores``, ``final_report``, and ``status``.
    """
    logger.info(
        "Starting post-interview pipeline for candidate %s, interview %s",
        candidate_id,
        interview_id,
    )
    aggregated = await evaluator.evaluate_full_interview(transcript, resume_parsed, job_role)
    report = await report_gen.generate_report(
        candidate_id, interview_id, resume_parsed, transcript, aggregated
    )
    logger.info(
        "Post-interview pipeline completed for interview %s — recommendation: %s",
        interview_id,
        report.get("recommendation"),
    )
    return {"scores": aggregated, "final_report": report, "status": "completed"}
