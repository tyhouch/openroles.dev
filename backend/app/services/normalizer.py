import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from enum import Enum
from typing import Literal

from openai import OpenAI
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Company, JobPosting


# Structured output models
class SeniorityLevel(str, Enum):
    intern = "intern"
    junior = "junior"
    mid = "mid"
    senior = "senior"
    staff = "staff"
    principal = "principal"
    lead = "lead"
    manager = "manager"
    director = "director"
    vp = "vp"
    c_level = "c_level"
    unknown = "unknown"


class JobFunction(str, Enum):
    engineering = "engineering"
    research = "research"
    ml_ai = "ml_ai"
    product = "product"
    design = "design"
    sales = "sales"
    marketing = "marketing"
    operations = "operations"
    finance = "finance"
    legal = "legal"
    people = "people"
    security = "security"
    data = "data"
    support = "support"
    other = "other"


class RemotePolicy(str, Enum):
    remote = "remote"
    hybrid = "hybrid"
    onsite = "onsite"
    unknown = "unknown"


class NormalizedJob(BaseModel):
    """Structured output for job normalization."""
    normalized_title: str = Field(description="Clean, standardized job title")
    seniority: SeniorityLevel = Field(description="Seniority level of the role")
    function: JobFunction = Field(description="Primary job function/department")
    team_area: str = Field(description="Specific team or focus area (e.g., 'Inference', 'Safety', 'Voice') or 'unknown'")
    is_leadership: bool = Field(description="Whether this is a leadership/management role")
    experience_years_min: int | None = Field(description="Minimum years of experience if mentioned")
    remote_policy: RemotePolicy = Field(description="Remote work policy")
    tech_stack: list[str] = Field(description="Technologies, frameworks, languages mentioned")
    keywords: list[str] = Field(description="Strategic keywords for trend analysis (e.g., 'inference', 'agents', 'RLHF', 'safety', 'robotics')")
    notable_signals: list[str] = Field(description="Unusual patterns worth flagging")
    salary_min: int | None = Field(description="Minimum salary if mentioned")
    salary_max: int | None = Field(description="Maximum salary if mentioned")
    salary_currency: str | None = Field(description="Salary currency (USD, EUR, GBP, etc.)")


SYSTEM_PROMPT = """You are normalizing job postings for AI companies into structured data.

IMPORTANT CONTEXT:
- These are AI/ML companies - interpret roles in that context
- "AI Tutor" roles are RLHF/data labeling positions (training AI through human feedback), NOT education roles
- "AI Trainer" roles are also typically RLHF/data annotation
- Prefer ml_ai function for roles involving ML, AI, LLMs, training, inference, fine-tuning
- Use "research" for research scientist roles, "engineering" for software/infra, "ml_ai" for ML engineers

RULES:
- Use "unknown" for fields you cannot determine
- For seniority ranges like "Senior/Staff", pick the lower level
- Keywords should capture strategic signals: inference, agents, RLHF, safety, voice, robotics, enterprise, etc.
- Notable signals: unusual patterns like "first hire in area", "domain expert", "founding team"
- Be concise - don't over-extract"""


def normalize_job(db: Session, job: JobPosting) -> dict:
    """Normalize a job posting using OpenAI structured outputs.

    Args:
        db: Database session
        job: JobPosting to normalize

    Returns:
        Dict with normalization results
    """
    if not settings.openai_api_key:
        return {"status": "skipped", "reason": "OpenAI API key not configured"}

    client = OpenAI(api_key=settings.openai_api_key)

    # Get description (prefer plain text, fall back to HTML)
    description = job.description_plain or job.description_html or ""

    # Truncate description if too long
    if len(description) > 10000:
        description = description[:10000] + "..."

    user_content = f"""Normalize this job posting:

Company: {job.company.name}
Title: {job.title_raw}
Department/Team: {job.department_raw or "unknown"}
Location: {job.location_raw or "unknown"}

Description:
{description}"""

    try:
        response = client.responses.parse(
            model="gpt-4.1-mini-2025-04-14",
            input=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            text_format=NormalizedJob,
        )

        data = response.output_parsed

        # Update job with normalized data
        job.normalized_title = data.normalized_title
        job.seniority = data.seniority.value
        job.function = data.function.value
        job.team_area = data.team_area
        job.is_leadership = data.is_leadership
        job.experience_years_min = data.experience_years_min
        job.remote_policy = data.remote_policy.value
        job.tech_stack = data.tech_stack
        job.keywords = data.keywords
        job.notable_signals = data.notable_signals
        job.salary_min = data.salary_min
        job.salary_max = data.salary_max
        job.salary_currency = data.salary_currency
        job.normalized_at = datetime.utcnow()

        db.commit()

        return {"status": "success", "data": data.model_dump()}

    except Exception as e:
        return {"status": "failed", "error": str(e)}


def normalize_pending_jobs(db: Session, company_slug: str | None = None, limit: int = 100) -> dict:
    """Normalize jobs that haven't been normalized yet.

    Args:
        db: Database session
        company_slug: Optional filter by company
        limit: Max jobs to normalize

    Returns:
        Dict with results summary
    """
    query = (
        db.query(JobPosting)
        .join(Company)
        .filter(
            JobPosting.normalized_at.is_(None),
            JobPosting.removed_at.is_(None),
        )
    )

    if company_slug:
        query = query.filter(Company.slug == company_slug)

    jobs = query.limit(limit).all()

    results = {"total": len(jobs), "success": 0, "failed": 0, "errors": []}

    for job in jobs:
        result = normalize_job(db, job)
        if result["status"] == "success":
            results["success"] += 1
        else:
            results["failed"] += 1
            results["errors"].append({"job_id": str(job.id), "error": result.get("error")})

    return results


def _call_normalize_api(job_data: dict) -> dict:
    """Call OpenAI API to normalize a job (no DB operations).

    Args:
        job_data: Dict with job info for normalization

    Returns:
        Dict with job_id and either normalized data or error
    """
    if not settings.openai_api_key:
        return {"job_id": job_data["id"], "status": "skipped", "reason": "No API key"}

    client = OpenAI(api_key=settings.openai_api_key)

    description = job_data.get("description") or ""
    if len(description) > 10000:
        description = description[:10000] + "..."

    user_content = f"""Normalize this job posting:

Company: {job_data["company_name"]}
Title: {job_data["title"]}
Department/Team: {job_data.get("department") or "unknown"}
Location: {job_data.get("location") or "unknown"}

Description:
{description}"""

    try:
        response = client.responses.parse(
            model="gpt-4.1-mini-2025-04-14",
            input=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            text_format=NormalizedJob,
        )

        return {
            "job_id": job_data["id"],
            "status": "success",
            "data": response.output_parsed.model_dump(),
        }
    except Exception as e:
        return {
            "job_id": job_data["id"],
            "status": "failed",
            "error": str(e),
        }


def normalize_jobs_parallel(
    db: Session,
    limit: int = 100,
    max_workers: int = 50,
) -> dict:
    """Normalize jobs in parallel using thread pool.

    With tier 3 rate limits (5000 RPM), we can safely run 50+ concurrent requests.

    Args:
        db: Database session
        limit: Max jobs to normalize
        max_workers: Number of concurrent API calls (default 50)

    Returns:
        Dict with results summary
    """
    # Get pending jobs
    jobs = (
        db.query(JobPosting)
        .join(Company)
        .filter(
            JobPosting.normalized_at.is_(None),
            JobPosting.removed_at.is_(None),
        )
        .limit(limit)
        .all()
    )

    if not jobs:
        return {"total": 0, "success": 0, "failed": 0}

    # Prepare job data for parallel processing (avoid passing ORM objects to threads)
    job_data_list = [
        {
            "id": str(job.id),
            "company_name": job.company.name,
            "title": job.title_raw,
            "department": job.department_raw,
            "location": job.location_raw,
            "description": job.description_plain or job.description_html or "",
        }
        for job in jobs
    ]

    # Create a mapping of job_id to job object for DB updates
    job_map = {str(job.id): job for job in jobs}

    results = {"total": len(jobs), "success": 0, "failed": 0, "errors": []}

    # Run API calls in parallel
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        api_results = list(executor.map(_call_normalize_api, job_data_list))

    # Update database with results (sequential to avoid DB conflicts)
    for api_result in api_results:
        job = job_map.get(api_result["job_id"])
        if not job:
            continue

        if api_result["status"] == "success":
            data = api_result["data"]
            job.normalized_title = data.get("normalized_title")
            job.seniority = data.get("seniority")
            job.function = data.get("function")
            job.team_area = data.get("team_area")
            job.is_leadership = data.get("is_leadership")
            job.experience_years_min = data.get("experience_years_min")
            job.remote_policy = data.get("remote_policy")
            job.tech_stack = data.get("tech_stack")
            job.keywords = data.get("keywords")
            job.notable_signals = data.get("notable_signals")
            job.salary_min = data.get("salary_min")
            job.salary_max = data.get("salary_max")
            job.salary_currency = data.get("salary_currency")
            job.normalized_at = datetime.utcnow()
            results["success"] += 1
        else:
            results["failed"] += 1
            results["errors"].append({
                "job_id": api_result["job_id"],
                "error": api_result.get("error"),
            })

    db.commit()
    return results
