"""Weekly synthesis pipeline - generates company and sector intelligence reports."""

from datetime import date, datetime, timedelta

from openai import OpenAI
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Company, CompanyWeeklySummary, JobPosting, SectorWeeklySummary


def get_week_start(d: date | None = None) -> date:
    """Get the Monday of the week containing the given date."""
    if d is None:
        d = date.today()
    return d - timedelta(days=d.weekday())


def calculate_hiring_velocity(
    jobs_added: int,
    jobs_removed: int,
    previous_summaries: list,
) -> str:
    """Calculate hiring velocity deterministically based on historical data.

    Compares this week's net change to the historical average.
    - "up": Hiring faster than recent average (accelerating)
    - "down": Hiring slower than recent average (decelerating)
    - "stable": Close to recent average

    Args:
        jobs_added: Jobs added this week
        jobs_removed: Jobs removed this week
        previous_summaries: List of previous CompanyWeeklySummary records

    Returns:
        "up", "down", or "stable"
    """
    this_week_net = jobs_added - jobs_removed

    if not previous_summaries:
        # No history - use simple thresholds
        if this_week_net >= 5:
            return "up"
        elif this_week_net <= -5:
            return "down"
        return "stable"

    # Calculate historical average net change
    historical_nets = [
        (s.jobs_added_count or 0) - (s.jobs_removed_count or 0)
        for s in previous_summaries
    ]
    avg_net = sum(historical_nets) / len(historical_nets)

    # Standard deviation for threshold (min 3 to avoid noise)
    if len(historical_nets) > 1:
        variance = sum((x - avg_net) ** 2 for x in historical_nets) / len(historical_nets)
        std_dev = max(3, variance ** 0.5)
    else:
        std_dev = 3

    # Compare this week to historical average
    if this_week_net > avg_net + std_dev:
        return "up"
    elif this_week_net < avg_net - std_dev:
        return "down"
    return "stable"


class CompanySynthesis(BaseModel):
    """Structured output for company weekly synthesis."""
    summary_text: str = Field(
        description="2-3 paragraph analysis of what hiring changes indicate about strategy, priorities, trajectory. Be specific - reference actual roles. If minimal change, be brief."
    )
    focus_areas: list[str] = Field(
        description="Top 2-3 areas they're investing in based on current hiring (e.g., 'Inference Infrastructure', 'Safety Research', 'Enterprise Sales')"
    )
    notable_changes: list[str] = Field(
        description="Specific noteworthy changes (e.g., 'First safety researcher hire', 'Added 3 director-level roles', 'Closed all recruiter positions')"
    )
    anomalies: list[str] = Field(
        description="Anything unusual relative to their profile/typical pattern. Leave empty if nothing stands out."
    )


class SectorSynthesis(BaseModel):
    """Structured output for sector-wide weekly synthesis."""
    summary_text: str = Field(
        description="2-3 paragraph analysis of sector-wide hiring trends. What patterns emerge across companies? What roles/skills are in demand?"
    )
    trending_roles: list[str] = Field(
        description="Roles appearing frequently across multiple companies"
    )
    trending_skills: list[str] = Field(
        description="Skills and technologies in high demand across the sector"
    )
    sector_signals: list[str] = Field(
        description="Cross-company patterns worth noting (e.g., '3 companies started hiring voice engineers', 'Inference teams expanding across labs')"
    )


COMPANY_SYSTEM_PROMPT = """You are an AI industry analyst generating weekly hiring intelligence reports.

IMPORTANT CONTEXT:
- "AI Tutor" roles at AI companies are RLHF/data labeling positions (training AI through human feedback), NOT education roles
- "AI Trainer" roles are also typically RLHF/data annotation
- If function shows as "unknown" or "null", ignore it - this is a data gap, NOT an anomaly
- ml_ai function = ML engineers, AI researchers, LLM specialists

ANALYSIS GUIDELINES:
- Be analytical and opinionated, not generic
- Reference specific roles when notable
- If there's little signal this week, keep summary brief
- Compare against company profile to identify true anomalies
- Focus on strategic implications of hiring patterns"""


SECTOR_SYSTEM_PROMPT = """You are an AI industry analyst generating sector-wide weekly hiring intelligence reports.

IMPORTANT CONTEXT:
- "AI Tutor" roles are RLHF/data labeling positions, NOT education roles
- "AI Trainer" roles are also typically RLHF/data annotation
- If functions show as "unknown" or "null", this is a data gap - do NOT highlight as a trend
- ml_ai function = ML engineers, AI researchers, LLM specialists

ANALYSIS GUIDELINES:
- Focus on patterns that span multiple companies
- Be specific - name companies when relevant
- Highlight emerging trends and shifts
- Look for convergence/divergence in hiring strategies across labs"""


def synthesize_company_week(
    db: Session, company: Company, week_start: date | None = None
) -> dict:
    """Generate weekly synthesis for a company using structured outputs.

    Args:
        db: Database session
        company: Company to synthesize
        week_start: Monday of week to analyze (defaults to current week)

    Returns:
        Dict with synthesis results
    """
    if not settings.openai_api_key:
        return {"status": "skipped", "reason": "OpenAI API key not configured"}

    week_start = get_week_start(week_start)
    week_end = week_start + timedelta(days=7)

    # Check if already exists
    existing = (
        db.query(CompanyWeeklySummary)
        .filter(
            CompanyWeeklySummary.company_id == company.id,
            CompanyWeeklySummary.week_start == week_start,
        )
        .first()
    )
    if existing:
        return {"status": "exists", "summary_id": str(existing.id)}

    # Get jobs added this week
    jobs_added = (
        db.query(JobPosting)
        .filter(
            JobPosting.company_id == company.id,
            JobPosting.first_seen_at >= week_start,
            JobPosting.first_seen_at < week_end,
        )
        .all()
    )

    # Get jobs removed this week
    jobs_removed = (
        db.query(JobPosting)
        .filter(
            JobPosting.company_id == company.id,
            JobPosting.removed_at >= week_start,
            JobPosting.removed_at < week_end,
        )
        .all()
    )

    # Get current active jobs count by function
    function_counts = (
        db.query(JobPosting.function, func.count(JobPosting.id))
        .filter(
            JobPosting.company_id == company.id,
            JobPosting.removed_at.is_(None),
        )
        .group_by(JobPosting.function)
        .all()
    )

    # Get total active jobs
    total_active = (
        db.query(func.count(JobPosting.id))
        .filter(
            JobPosting.company_id == company.id,
            JobPosting.removed_at.is_(None),
        )
        .scalar()
    )

    # Get previous summaries for context
    previous_summaries = (
        db.query(CompanyWeeklySummary)
        .filter(
            CompanyWeeklySummary.company_id == company.id,
            CompanyWeeklySummary.week_start < week_start,
        )
        .order_by(CompanyWeeklySummary.week_start.desc())
        .limit(4)
        .all()
    )

    # Format jobs added
    jobs_added_text = "\n".join(
        f"- {j.normalized_title or j.title_raw} ({j.function or 'unknown'}, {j.seniority or 'unknown'})"
        for j in jobs_added[:30]  # Limit to prevent token overflow
    ) or "No new jobs this week"

    # Format jobs removed
    jobs_removed_text = "\n".join(
        f"- {j.normalized_title or j.title_raw} ({j.function or 'unknown'})"
        for j in jobs_removed[:30]
    ) or "No jobs removed this week"

    # Format function breakdown
    function_text = "\n".join(
        f"- {fn or 'unknown'}: {count}" for fn, count in function_counts
    ) or "No active jobs"

    # Calculate hiring velocity deterministically
    hiring_velocity = calculate_hiring_velocity(
        len(jobs_added),
        len(jobs_removed),
        previous_summaries,
    )

    # Format previous summaries with actual metrics for context
    prev_text = "\n".join(
        f"Week of {s.week_start}: +{s.jobs_added_count or 0}/-{s.jobs_removed_count or 0} "
        f"(net: {(s.jobs_added_count or 0) - (s.jobs_removed_count or 0):+d}), "
        f"velocity: {s.hiring_velocity or 'unknown'}"
        for s in previous_summaries
    ) or "No previous reports"

    # Build user content
    user_content = f"""Analyze this company's weekly hiring activity:

COMPANY: {company.name}

COMPANY PROFILE:
{company.profile_markdown or "No profile available"}

THIS WEEK'S JOB CHANGES:
Jobs Added ({len(jobs_added)}):
{jobs_added_text}

Jobs Removed ({len(jobs_removed)}):
{jobs_removed_text}

CURRENT OPEN ROLES BY FUNCTION:
{function_text}

PREVIOUS WEEKLY REPORTS (for context/continuity):
{prev_text}"""

    client = OpenAI(api_key=settings.openai_api_key)

    try:
        response = client.responses.parse(
            model="gpt-4.1-2025-04-14",
            input=[
                {"role": "system", "content": COMPANY_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            text_format=CompanySynthesis,
        )

        data = response.output_parsed

        # Create summary record
        summary = CompanyWeeklySummary(
            company_id=company.id,
            week_start=week_start,
            jobs_added_count=len(jobs_added),
            jobs_removed_count=len(jobs_removed),
            total_active_jobs=total_active,
            jobs_added_ids=[j.id for j in jobs_added],
            jobs_removed_ids=[j.id for j in jobs_removed],
            summary_text=data.summary_text,
            hiring_velocity=hiring_velocity,  # Deterministically calculated
            focus_areas=data.focus_areas,
            notable_changes=data.notable_changes,
            anomalies=data.anomalies,
        )

        db.add(summary)
        db.commit()
        db.refresh(summary)

        return {"status": "success", "summary_id": str(summary.id), "data": data.model_dump()}

    except Exception as e:
        return {"status": "failed", "error": str(e)}


def synthesize_sector_week(db: Session, week_start: date | None = None) -> dict:
    """Generate sector-wide weekly synthesis using structured outputs.

    Args:
        db: Database session
        week_start: Monday of week to analyze (defaults to current week)

    Returns:
        Dict with synthesis results
    """
    if not settings.openai_api_key:
        return {"status": "skipped", "reason": "OpenAI API key not configured"}

    week_start = get_week_start(week_start)

    # Check if already exists
    existing = (
        db.query(SectorWeeklySummary)
        .filter(SectorWeeklySummary.week_start == week_start)
        .first()
    )
    if existing:
        return {"status": "exists", "summary_id": str(existing.id)}

    # Get this week's company summaries
    company_summaries = (
        db.query(CompanyWeeklySummary)
        .join(Company)
        .filter(CompanyWeeklySummary.week_start == week_start)
        .all()
    )

    if not company_summaries:
        return {"status": "skipped", "reason": "No company summaries for this week"}

    # Aggregate stats
    total_companies = len(company_summaries)
    total_jobs_added = sum(s.jobs_added_count or 0 for s in company_summaries)
    total_jobs_removed = sum(s.jobs_removed_count or 0 for s in company_summaries)
    total_active = sum(s.total_active_jobs or 0 for s in company_summaries)

    # Get top functions across sector
    function_counts = (
        db.query(JobPosting.function, func.count(JobPosting.id))
        .filter(JobPosting.removed_at.is_(None))
        .group_by(JobPosting.function)
        .order_by(func.count(JobPosting.id).desc())
        .limit(10)
        .all()
    )

    # Get top keywords from recently added jobs
    week_end = week_start + timedelta(days=7)
    recent_jobs = (
        db.query(JobPosting)
        .filter(
            JobPosting.first_seen_at >= week_start,
            JobPosting.first_seen_at < week_end,
            JobPosting.keywords.isnot(None),
        )
        .all()
    )

    # Count keywords
    keyword_counts: dict[str, int] = {}
    for job in recent_jobs:
        if job.keywords:
            for kw in job.keywords:
                keyword_counts[kw] = keyword_counts.get(kw, 0) + 1

    top_keywords = sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)[:15]

    # Format company summaries
    summaries_text = "\n\n".join(
        f"**{s.company.name}** (added: {s.jobs_added_count}, removed: {s.jobs_removed_count}):\n"
        f"Velocity: {s.hiring_velocity or 'unknown'}\n"
        f"Focus: {', '.join(s.focus_areas or [])}\n"
        f"Notable: {'; '.join(s.notable_changes or []) if s.notable_changes else 'None'}"
        for s in company_summaries
    )

    # Format function breakdown
    functions_text = "\n".join(
        f"- {fn or 'unknown'}: {count}" for fn, count in function_counts
    )

    # Format keywords
    keywords_text = "\n".join(
        f"- {kw}: {count}" for kw, count in top_keywords
    ) or "No keyword data"

    # Build user content
    user_content = f"""Analyze sector-wide hiring trends for the AI industry:

WEEK OF: {week_start.isoformat()}

SECTOR STATS:
- Total companies tracked: {total_companies}
- Total active jobs: {total_active}
- Jobs added this week: {total_jobs_added}
- Jobs removed this week: {total_jobs_removed}

COMPANY SUMMARIES THIS WEEK:
{summaries_text}

AGGREGATE JOB DATA:
Top functions hiring:
{functions_text}

Top keywords/signals this week:
{keywords_text}"""

    client = OpenAI(api_key=settings.openai_api_key)

    try:
        response = client.responses.parse(
            model="gpt-4.1-2025-04-14",
            input=[
                {"role": "system", "content": SECTOR_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            text_format=SectorSynthesis,
        )

        data = response.output_parsed

        # Create summary record
        summary = SectorWeeklySummary(
            week_start=week_start,
            total_companies=total_companies,
            total_active_jobs=total_active,
            total_jobs_added=total_jobs_added,
            total_jobs_removed=total_jobs_removed,
            summary_text=data.summary_text,
            trending_roles=data.trending_roles,
            trending_skills=data.trending_skills,
            sector_signals=data.sector_signals,
        )

        db.add(summary)
        db.commit()
        db.refresh(summary)

        return {"status": "success", "summary_id": str(summary.id), "data": data.model_dump()}

    except Exception as e:
        return {"status": "failed", "error": str(e)}


def run_weekly_synthesis(db: Session, week_start: date | None = None) -> dict:
    """Run full weekly synthesis pipeline - all companies then sector.

    Args:
        db: Database session
        week_start: Monday of week to analyze (defaults to PREVIOUS week, since
                    this typically runs Monday morning after the week ends)

    Returns:
        Dict with results for all companies and sector
    """
    if week_start is None:
        # Default to previous week - when run Monday morning, analyze the week that just ended
        week_start = get_week_start() - timedelta(days=7)
    else:
        week_start = get_week_start(week_start)

    results = {
        "week_start": week_start.isoformat(),
        "companies": {},
        "sector": None,
    }

    # Get all active companies
    companies = db.query(Company).filter(Company.is_active == True).all()

    # Synthesize each company
    for company in companies:
        result = synthesize_company_week(db, company, week_start)
        results["companies"][company.slug] = result

    # Synthesize sector
    results["sector"] = synthesize_sector_week(db, week_start)

    return results
