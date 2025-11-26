from fastapi import FastAPI

from app.api import companies, jobs, admin, summaries

app = FastAPI(
    title="OpenRoles API",
    description="AI Sector Job Intelligence Platform",
    version="0.1.0",
)

app.include_router(companies.router, prefix="/api/companies", tags=["companies"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(summaries.router, prefix="/api/summaries", tags=["summaries"])


@app.get("/health")
def health_check():
    return {"status": "healthy"}
