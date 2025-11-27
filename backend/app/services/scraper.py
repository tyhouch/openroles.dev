from datetime import datetime

from sqlalchemy.orm import Session

from app.models import Company, JobPosting, ScrapeRun
from app.services.ats import AshbyScraper, GreenhouseScraper, LeverScraper
from app.services.ats.base import BaseScraper


def get_scraper(ats_type: str) -> BaseScraper:
    """Get the appropriate scraper for an ATS type."""
    scrapers = {
        "greenhouse": GreenhouseScraper(),
        "ashby": AshbyScraper(),
        "lever": LeverScraper(),
    }

    scraper = scrapers.get(ats_type)
    if not scraper:
        raise ValueError(f"Unknown ATS type: {ats_type}")

    return scraper


def run_scrape_for_company(db: Session, company: Company) -> dict:
    """Run scrape for a single company and update database.

    Returns:
        Dict with scrape results
    """
    if not company.ats_type or not company.ats_identifier:
        return {"status": "skipped", "reason": "Missing ATS configuration"}

    # Create scrape run record
    scrape_run = ScrapeRun(company_id=company.id)
    db.add(scrape_run)
    db.flush()

    try:
        # Get appropriate scraper
        scraper = get_scraper(company.ats_type)

        # Fetch jobs from ATS
        raw_jobs = scraper.fetch_jobs(company.ats_identifier)

        # Track what we found
        jobs_found = len(raw_jobs)
        jobs_added = 0
        jobs_updated = 0
        external_ids_seen = set()

        for raw_job in raw_jobs:
            external_ids_seen.add(raw_job.external_id)

            # Check if job exists
            existing = (
                db.query(JobPosting)
                .filter(
                    JobPosting.company_id == company.id,
                    JobPosting.external_id == raw_job.external_id,
                )
                .first()
            )

            if existing:
                # Update last_seen_at
                existing.last_seen_at = datetime.utcnow()

                # If it was previously removed, mark it as active again
                if existing.removed_at:
                    existing.removed_at = None

                jobs_updated += 1
            else:
                # Create new job
                # Use ATS published date for first_seen_at if available,
                # otherwise fall back to now
                now = datetime.utcnow()
                first_seen = raw_job.published_at or now

                job = JobPosting(
                    company_id=company.id,
                    external_id=raw_job.external_id,
                    title_raw=raw_job.title,
                    description_html=raw_job.description_html,
                    description_plain=raw_job.description_plain,
                    department_raw=raw_job.department,
                    location_raw=raw_job.location,
                    job_url=raw_job.job_url,
                    apply_url=raw_job.apply_url,
                    published_at=raw_job.published_at,
                    first_seen_at=first_seen,
                    last_seen_at=now,
                )
                db.add(job)
                jobs_added += 1

        # Mark jobs as removed if not seen in this scrape
        jobs_removed = 0
        active_jobs = (
            db.query(JobPosting)
            .filter(
                JobPosting.company_id == company.id,
                JobPosting.removed_at.is_(None),
            )
            .all()
        )

        for job in active_jobs:
            if job.external_id not in external_ids_seen:
                job.removed_at = datetime.utcnow()
                jobs_removed += 1

        # Update scrape run
        scrape_run.completed_at = datetime.utcnow()
        scrape_run.status = "success"
        scrape_run.jobs_found = jobs_found
        scrape_run.jobs_added = jobs_added
        scrape_run.jobs_removed = jobs_removed

        # Update company last_scraped_at
        company.last_scraped_at = datetime.utcnow()

        db.commit()

        return {
            "status": "success",
            "jobs_found": jobs_found,
            "jobs_added": jobs_added,
            "jobs_updated": jobs_updated,
            "jobs_removed": jobs_removed,
        }

    except Exception as e:
        scrape_run.completed_at = datetime.utcnow()
        scrape_run.status = "failed"
        scrape_run.error_message = str(e)
        db.commit()

        return {"status": "failed", "error": str(e)}
