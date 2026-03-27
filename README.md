# SAGE — Smart Agentic Grading & Evaluation System

An autonomous AI recruitment interview platform that screens job candidates end-to-end without human involvement.

## What it does
- Parses resumes using GPT-4o
- Generates dynamic, candidate-specific interview questions
- Conducts real-time voice interviews (Deepgram STT + ElevenLabs TTS)
- Scores candidates on 4 dimensions in real-time
- Delivers hire/no-hire reports to an HR dashboard

## Tech Stack
- Frontend: React + TypeScript + Tailwind CSS + shadcn/ui + React Bits
- Backend: FastAPI (Python)
- AI Pipeline: LangGraph StateGraph + GPT-4o
- Voice: Deepgram (STT) + ElevenLabs (TTS) + WebSocket
- Database: Supabase (PostgreSQL)

## Project Structure
sage/
  backend/        - FastAPI + LangGraph agents
    agents/       - 5 AI agent modules
    main.py       - API endpoints + WebSocket
    pipeline.py   - LangGraph StateGraph
  frontend/       - React + Vite
    src/
      pages/      - Candidate portal + HR dashboard
      components/ - UI components

## Quick Start
Backend:
  cd sage/backend
  pip install -r requirements.txt
  uvicorn main:app --reload

Frontend:
  cd sage/frontend
  npm install
  npm run dev

## Built by
Chaitanya for VibeCon Hackathon 2025
