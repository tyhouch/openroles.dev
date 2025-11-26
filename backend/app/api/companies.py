from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Company, CompanyWeeklySummary, JobPosting

router = APIRouter()


@router.get("")
def list_companies(db: Session = Depends(get_db)):
    """List all tracked companies with job stats."""
    companies = db.query(Company).filter(Company.is_active == True).all()

    result = []
    for c in companies:
        # Get active job count
        job_count = (
            db.query(func.count(JobPosting.id))
            .filter(JobPosting.company_id == c.id, JobPosting.removed_at.is_(None))
            .scalar()
        )

        # Get latest summary for hiring velocity and jobs added
        latest_summary = (
            db.query(CompanyWeeklySummary)
            .filter(CompanyWeeklySummary.company_id == c.id)
            .order_by(CompanyWeeklySummary.week_start.desc())
            .first()
        )

        result.append({
            "id": str(c.id),
            "name": c.name,
            "slug": c.slug,
            "ats_type": c.ats_type,
            "tier": c.tier,
            "last_scraped_at": c.last_scraped_at,
            "job_count": job_count,
            "jobs_added_this_week": latest_summary.jobs_added_count if latest_summary else None,
            "jobs_removed_this_week": latest_summary.jobs_removed_count if latest_summary else None,
            "hiring_velocity": latest_summary.hiring_velocity if latest_summary else None,
            "focus_areas": latest_summary.focus_areas if latest_summary else None,
            "summary_text": latest_summary.summary_text if latest_summary else None,
            "anomalies": latest_summary.anomalies if latest_summary else None,
        })

    return result


@router.get("/{slug}")
def get_company(slug: str, db: Session = Depends(get_db)):
    """Get company detail with current jobs."""
    company = db.query(Company).filter(Company.slug == slug).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    active_jobs = [j for j in company.jobs if j.removed_at is None]

    return {
        "id": str(company.id),
        "name": company.name,
        "slug": company.slug,
        "website_url": company.website_url,
        "careers_url": company.careers_url,
        "ats_type": company.ats_type,
        "profile_markdown": company.profile_markdown,
        "tier": company.tier,
        "last_scraped_at": company.last_scraped_at,
        "active_jobs_count": len(active_jobs),
        "jobs": [
            {
                "id": str(j.id),
                "title_raw": j.title_raw,
                "normalized_title": j.normalized_title,
                "location_raw": j.location_raw,
                "function": j.function,
                "seniority": j.seniority,
                "team_area": j.team_area,
                "job_url": j.job_url,
                "first_seen_at": j.first_seen_at,
            }
            for j in active_jobs
        ],
    }
