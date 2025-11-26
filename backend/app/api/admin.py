from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import verify_admin_api_key
from app.models import Company, JobPosting, ScrapeRun, CompanyWeeklySummary, SectorWeeklySummary
from app.services.scraper import run_scrape_for_company
from app.services.normalizer import normalize_pending_jobs, normalize_job, normalize_jobs_parallel
from app.services.synthesizer import (
    run_weekly_synthesis,
    synthesize_company_week,
    synthesize_sector_week,
    get_week_start,
)

router = APIRouter(dependencies=[Depends(verify_admin_api_key)])


@router.post("/scrape/{slug}")
def trigger_scrape(slug: str, db: Session = Depends(get_db)):
    """Trigger manual scrape for a company."""
    company = db.query(Company).filter(Company.slug == slug).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    result = run_scrape_for_company(db, company)
    return result


@router.post("/scrape-all")
def trigger_scrape_all(
    normalize: bool = Query(default=True, description="Auto-normalize new jobs after scraping"),
    db: Session = Depends(get_db),
):
    """Trigger scrape for all active companies, then normalize new jobs."""
    companies = db.query(Company).filter(Company.is_active == True).all()
    scrape_results = []
    total_added = 0

    for company in companies:
        try:
            result = run_scrape_for_company(db, company)
            scrape_results.append({"company": company.slug, **result})
            total_added += result.get("jobs_added", 0)
        except Exception as e:
            scrape_results.append({"company": company.slug, "status": "failed", "error": str(e)})

    response = {"scrape": {"results": scrape_results, "total_jobs_added": total_added}}

    # Auto-normalize if enabled and there are new jobs
    if normalize and total_added > 0:
        normalize_result = normalize_pending_jobs(db, limit=total_added + 50)
        response["normalize"] = normalize_result

    return response


@router.get("/scrape-runs")
def list_scrape_runs(
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """View recent scrape runs."""
    runs = (
        db.query(ScrapeRun)
        .order_by(ScrapeRun.started_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": str(r.id),
            "company_id": str(r.company_id),
            "started_at": r.started_at,
            "completed_at": r.completed_at,
            "status": r.status,
            "jobs_found": r.jobs_found,
            "jobs_added": r.jobs_added,
            "jobs_removed": r.jobs_removed,
            "error_message": r.error_message,
        }
        for r in runs
    ]


@router.post("/normalize")
def trigger_normalize(
    company: str | None = None,
    limit: int = Query(default=100, le=500),
    db: Session = Depends(get_db),
):
    """Normalize pending jobs that haven't been processed yet."""
    result = normalize_pending_jobs(db, company_slug=company, limit=limit)
    return result


@router.post("/synthesize/{slug}")
def trigger_company_synthesis(
    slug: str,
    week: date | None = None,
    force: bool = Query(default=False, description="Force regenerate even if exists"),
    db: Session = Depends(get_db),
):
    """Generate weekly synthesis for a specific company."""
    company = db.query(Company).filter(Company.slug == slug).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    if force:
        week_start = get_week_start(week)
        db.query(CompanyWeeklySummary).filter(
            CompanyWeeklySummary.company_id == company.id,
            CompanyWeeklySummary.week_start == week_start,
        ).delete()
        db.commit()

    result = synthesize_company_week(db, company, week)
    return result


@router.post("/synthesize-sector")
def trigger_sector_synthesis(
    week: date | None = None,
    force: bool = Query(default=False, description="Force regenerate even if exists"),
    db: Session = Depends(get_db),
):
    """Generate sector-wide weekly synthesis."""
    if force:
        week_start = get_week_start(week)
        db.query(SectorWeeklySummary).filter(
            SectorWeeklySummary.week_start == week_start
        ).delete()
        db.commit()

    result = synthesize_sector_week(db, week)
    return result


@router.post("/synthesize-all")
def trigger_full_synthesis(
    week: date | None = None,
    force: bool = Query(default=False, description="Force regenerate even if exists"),
    db: Session = Depends(get_db),
):
    """Run full weekly synthesis - all companies then sector."""
    if force:
        week_start = get_week_start(week)
        # Delete existing summaries for this week
        db.query(CompanyWeeklySummary).filter(
            CompanyWeeklySummary.week_start == week_start
        ).delete()
        db.query(SectorWeeklySummary).filter(
            SectorWeeklySummary.week_start == week_start
        ).delete()
        db.commit()

    result = run_weekly_synthesis(db, week)
    return result


@router.post("/reset")
def reset_data(
    keep_companies: bool = Query(default=True, description="Keep company records"),
    db: Session = Depends(get_db),
):
    """Wipe all job data, scrape runs, and summaries. Optionally keeps company records.

    WARNING: This is destructive and cannot be undone.
    """
    # Delete in order to respect foreign keys
    sector_deleted = db.query(SectorWeeklySummary).delete()
    company_summaries_deleted = db.query(CompanyWeeklySummary).delete()
    jobs_deleted = db.query(JobPosting).delete()
    scrape_runs_deleted = db.query(ScrapeRun).delete()

    companies_deleted = 0
    if not keep_companies:
        companies_deleted = db.query(Company).delete()
    else:
        # Reset company scrape timestamps
        db.query(Company).update({"last_scraped_at": None})

    db.commit()

    return {
        "status": "reset_complete",
        "deleted": {
            "jobs": jobs_deleted,
            "scrape_runs": scrape_runs_deleted,
            "company_summaries": company_summaries_deleted,
            "sector_summaries": sector_deleted,
            "companies": companies_deleted,
        }
    }


@router.post("/repopulate")
def repopulate_all(
    db: Session = Depends(get_db),
):
    """Full pipeline: wipe data, scrape all companies, normalize ALL, synthesize.

    This is the nuclear option - wipes everything and rebuilds from scratch.
    Takes several minutes depending on job count (~3-4 sec per job for normalization).
    """
    results = {
        "reset": None,
        "scrape": None,
        "normalize": None,
        "synthesize": None,
    }

    # 1. Reset (keeping companies)
    sector_deleted = db.query(SectorWeeklySummary).delete()
    company_summaries_deleted = db.query(CompanyWeeklySummary).delete()
    jobs_deleted = db.query(JobPosting).delete()
    scrape_runs_deleted = db.query(ScrapeRun).delete()
    db.query(Company).update({"last_scraped_at": None})
    db.commit()

    results["reset"] = {
        "jobs_deleted": jobs_deleted,
        "summaries_deleted": company_summaries_deleted + sector_deleted,
    }

    # 2. Scrape all companies
    companies = db.query(Company).filter(Company.is_active == True).all()
    scrape_results = []
    total_added = 0

    for company in companies:
        try:
            result = run_scrape_for_company(db, company)
            scrape_results.append({"company": company.slug, **result})
            total_added += result.get("jobs_added", 0)
        except Exception as e:
            scrape_results.append({"company": company.slug, "status": "failed", "error": str(e)})

    results["scrape"] = {"companies": len(scrape_results), "total_jobs": total_added}

    # 3. Normalize ALL jobs in parallel (batches of 200, 50 concurrent workers)
    total_normalized = 0
    total_failed = 0
    batch_size = 200
    max_workers = 50

    while True:
        # Count remaining
        remaining = (
            db.query(JobPosting)
            .filter(
                JobPosting.normalized_at.is_(None),
                JobPosting.removed_at.is_(None),
            )
            .count()
        )

        if remaining == 0:
            break

        # Process batch in parallel
        batch_result = normalize_jobs_parallel(db, limit=batch_size, max_workers=max_workers)
        total_normalized += batch_result.get("success", 0)
        total_failed += batch_result.get("failed", 0)

        # If no jobs were processed, break to avoid infinite loop
        if batch_result.get("total", 0) == 0:
            break

    results["normalize"] = {
        "total": total_normalized + total_failed,
        "success": total_normalized,
        "failed": total_failed,
    }

    # 4. Run synthesis
    synthesis_result = run_weekly_synthesis(db)
    results["synthesize"] = {
        "companies_synthesized": len(synthesis_result.get("companies", {})),
        "sector_status": synthesis_result.get("sector", {}).get("status"),
    }

    return results


@router.post("/normalize-all")
def normalize_all_jobs(
    batch_size: int = Query(default=200, le=500, description="Jobs per batch"),
    max_workers: int = Query(default=50, le=100, description="Concurrent API calls"),
    db: Session = Depends(get_db),
):
    """Normalize ALL pending jobs in parallel. Much faster with tier 3 rate limits."""
    total_processed = 0
    total_success = 0
    total_failed = 0
    batches = 0

    while True:
        # Count remaining
        remaining = (
            db.query(JobPosting)
            .filter(
                JobPosting.normalized_at.is_(None),
                JobPosting.removed_at.is_(None),
            )
            .count()
        )

        if remaining == 0:
            break

        batches += 1
        result = normalize_jobs_parallel(db, limit=batch_size, max_workers=max_workers)
        total_processed += result.get("total", 0)
        total_success += result.get("success", 0)
        total_failed += result.get("failed", 0)

        # Safety: break if nothing was processed
        if result.get("total", 0) == 0:
            break

    return {
        "status": "complete",
        "batches_processed": batches,
        "total_processed": total_processed,
        "success": total_success,
        "failed": total_failed,
    }


@router.post("/normalize-parallel")
def normalize_parallel_batch(
    limit: int = Query(default=200, le=500, description="Jobs to process"),
    max_workers: int = Query(default=50, le=100, description="Concurrent API calls"),
    db: Session = Depends(get_db),
):
    """Normalize a batch of jobs in parallel. Returns immediately with results."""
    result = normalize_jobs_parallel(db, limit=limit, max_workers=max_workers)
    return result
