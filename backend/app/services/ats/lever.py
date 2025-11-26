from datetime import datetime

import httpx

from app.services.ats.base import BaseScraper, RawJob


class LeverScraper(BaseScraper):
    """Scraper for Lever ATS."""

    BASE_URL = "https://api.lever.co/v0/postings"

    def fetch_jobs(self, identifier: str) -> list[RawJob]:
        """Fetch all jobs from Lever.

        Args:
            identifier: Company identifier (e.g., 'mistral')
        """
        url = f"{self.BASE_URL}/{identifier}"

        response = httpx.get(url, timeout=30.0)
        response.raise_for_status()

        # Lever returns a flat array, not wrapped in an object
        data = response.json()
        jobs = []

        for job in data:
            # Parse createdAt timestamp (milliseconds)
            published_at = None
            if job.get("createdAt"):
                try:
                    published_at = datetime.fromtimestamp(job["createdAt"] / 1000)
                except (ValueError, TypeError):
                    pass

            # Get department from categories.team
            department = None
            categories = job.get("categories", {})
            if categories:
                department = categories.get("team")

            # Get location from categories.location
            location = None
            if categories:
                location = categories.get("location")

            jobs.append(
                RawJob(
                    external_id=job["id"],
                    title=job["text"],
                    description_html=job.get("description"),
                    description_plain=job.get("descriptionPlain"),
                    department=department,
                    location=location,
                    job_url=job.get("hostedUrl"),
                    apply_url=job.get("applyUrl"),
                    published_at=published_at,
                )
            )

        return jobs
