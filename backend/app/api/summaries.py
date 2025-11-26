"""API endpoints for retrieving weekly summaries."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Company, CompanyWeeklySummary, SectorWeeklySummary

router = APIRouter()


@router.get("/sector")
def get_latest_sector_summary(db: Session = Depends(get_db)):
    """Get the most recent sector-wide summary."""
    summary = (
        db.query(SectorWeeklySummary)
        .order_by(SectorWeeklySummary.week_start.desc())
        .first()
    )

    if not summary:
        raise HTTPException(status_code=404, detail="No sector summaries found")

    return {
        "id": str(summary.id),
        "week_start": summary.week_start,
        "total_companies": summary.total_companies,
        "total_active_jobs": summary.total_active_jobs,
        "total_jobs_added": summary.total_jobs_added,
        "total_jobs_removed": summary.total_jobs_removed,
        "summary_text": summary.summary_text,
        "trending_roles": summary.trending_roles,
        "trending_skills": summary.trending_skills,
        "sector_signals": summary.sector_signals,
        "created_at": summary.created_at,
    }


@router.get("/sector/history")
def get_sector_summary_history(
    limit: int = Query(default=10, le=52),
    db: Session = Depends(get_db),
):
    """Get historical sector summaries."""
    summaries = (
        db.query(SectorWeeklySummary)
        .order_by(SectorWeeklySummary.week_start.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": str(s.id),
            "week_start": s.week_start,
            "total_companies": s.total_companies,
            "total_active_jobs": s.total_active_jobs,
            "total_jobs_added": s.total_jobs_added,
            "total_jobs_removed": s.total_jobs_removed,
            "summary_text": s.summary_text,
            "trending_roles": s.trending_roles,
            "trending_skills": s.trending_skills,
            "sector_signals": s.sector_signals,
            "created_at": s.created_at,
        }
        for s in summaries
    ]


@router.get("/company/{slug}")
def get_latest_company_summary(slug: str, db: Session = Depends(get_db)):
    """Get the most recent summary for a specific company."""
    company = db.query(Company).filter(Company.slug == slug).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    summary = (
        db.query(CompanyWeeklySummary)
        .filter(CompanyWeeklySummary.company_id == company.id)
        .order_by(CompanyWeeklySummary.week_start.desc())
        .first()
    )

    if not summary:
        raise HTTPException(status_code=404, detail="No summaries found for this company")

    return {
        "id": str(summary.id),
        "company_slug": slug,
        "company_name": company.name,
        "week_start": summary.week_start,
        "jobs_added_count": summary.jobs_added_count,
        "jobs_removed_count": summary.jobs_removed_count,
        "total_active_jobs": summary.total_active_jobs,
        "summary_text": summary.summary_text,
        "hiring_velocity": summary.hiring_velocity,
        "focus_areas": summary.focus_areas,
        "notable_changes": summary.notable_changes,
        "anomalies": summary.anomalies,
        "created_at": summary.created_at,
    }


@router.get("/company/{slug}/history")
def get_company_summary_history(
    slug: str,
    limit: int = Query(default=10, le=52),
    db: Session = Depends(get_db),
):
    """Get historical summaries for a specific company."""
    company = db.query(Company).filter(Company.slug == slug).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    summaries = (
        db.query(CompanyWeeklySummary)
        .filter(CompanyWeeklySummary.company_id == company.id)
        .order_by(CompanyWeeklySummary.week_start.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": str(s.id),
            "company_slug": slug,
            "company_name": company.name,
            "week_start": s.week_start,
            "jobs_added_count": s.jobs_added_count,
            "jobs_removed_count": s.jobs_removed_count,
            "total_active_jobs": s.total_active_jobs,
            "summary_text": s.summary_text,
            "hiring_velocity": s.hiring_velocity,
            "focus_areas": s.focus_areas,
            "notable_changes": s.notable_changes,
            "anomalies": s.anomalies,
            "created_at": s.created_at,
        }
        for s in summaries
    ]
