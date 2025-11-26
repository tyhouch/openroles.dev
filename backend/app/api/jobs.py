from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Company, JobPosting

router = APIRouter()


@router.get("")
def list_jobs(
    company: str | None = None,
    function: str | None = None,
    seniority: str | None = None,
    status: Literal["active", "removed", "added_this_week"] | None = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """List jobs with filters and pagination."""
    query = db.query(JobPosting).join(Company)

    if company:
        query = query.filter(Company.slug == company)

    if function:
        query = query.filter(JobPosting.function == function)

    if seniority:
        query = query.filter(JobPosting.seniority == seniority)

    if status == "active":
        query = query.filter(JobPosting.removed_at.is_(None))
    elif status == "removed":
        query = query.filter(JobPosting.removed_at.isnot(None))
    elif status == "added_this_week":
        week_ago = datetime.utcnow() - timedelta(days=7)
        query = query.filter(JobPosting.first_seen_at >= week_ago)

    total = query.count()
    jobs = query.order_by(JobPosting.first_seen_at.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "jobs": [
            {
                "id": str(j.id),
                "company_slug": j.company.slug,
                "company_name": j.company.name,
                "title_raw": j.title_raw,
                "normalized_title": j.normalized_title,
                "location_raw": j.location_raw,
                "function": j.function,
                "seniority": j.seniority,
                "team_area": j.team_area,
                "remote_policy": j.remote_policy,
                "job_url": j.job_url,
                "first_seen_at": j.first_seen_at,
                "removed_at": j.removed_at,
            }
            for j in jobs
        ],
    }


@router.get("/feed")
def job_feed(
    days: int = Query(default=7, le=30),
    db: Session = Depends(get_db),
):
    """Recent changes feed - new and removed jobs."""
    since = datetime.utcnow() - timedelta(days=days)

    added = (
        db.query(JobPosting)
        .join(Company)
        .filter(JobPosting.first_seen_at >= since)
        .order_by(JobPosting.first_seen_at.desc())
        .limit(100)
        .all()
    )

    removed = (
        db.query(JobPosting)
        .join(Company)
        .filter(JobPosting.removed_at >= since)
        .order_by(JobPosting.removed_at.desc())
        .limit(100)
        .all()
    )

    def serialize(j, event_type, event_time):
        return {
            "event_type": event_type,
            "event_time": event_time,
            "job": {
                "id": str(j.id),
                "company_slug": j.company.slug,
                "company_name": j.company.name,
                "title_raw": j.title_raw,
                "normalized_title": j.normalized_title,
                "function": j.function,
                "seniority": j.seniority,
                "job_url": j.job_url,
            },
        }

    events = [serialize(j, "added", j.first_seen_at) for j in added]
    events += [serialize(j, "removed", j.removed_at) for j in removed]
    events.sort(key=lambda x: x["event_time"], reverse=True)

    return events[:100]
