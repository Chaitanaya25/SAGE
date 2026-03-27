import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="SAGE Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route placeholders — routers will be registered here in subsequent steps
# app.include_router(auth_router, prefix="/api/auth")
# app.include_router(candidates_router, prefix="/api/candidates")
# app.include_router(interviews_router, prefix="/api/interviews")


@app.get("/health")
async def health_check() -> dict:
    """Return service liveness status."""
    return {"status": "ok", "service": "sage-backend"}
