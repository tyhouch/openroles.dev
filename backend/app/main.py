import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import companies, jobs, admin, summaries

app = FastAPI(
    title="OpenRoles API",
    description="AI Sector Job Intelligence Platform",
    version="0.1.0",
)

# CORS middleware for frontend
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3100",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3100",
]

# Add production origins from environment
if os.getenv("FRONTEND_URL"):
    allowed_origins.append(os.getenv("FRONTEND_URL"))

# Add Vercel preview URLs
if os.getenv("ENVIRONMENT") == "production":
    allowed_origins.extend([
        "https://openroles.dev",
        "https://www.openroles.dev",
        "https://openroles.vercel.app",
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",  # All Vercel deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(companies.router, prefix="/api/companies", tags=["companies"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(summaries.router, prefix="/api/summaries", tags=["summaries"])


@app.get("/health")
def health_check():
    return {"status": "healthy"}
