from datetime import datetime

import httpx

from app.services.ats.base import BaseScraper, RawJob


class GreenhouseScraper(BaseScraper):
    """Scraper for Greenhouse ATS."""

    BASE_URL = "https://boards-api.greenhouse.io/v1/boards"

    def fetch_jobs(self, identifier: str) -> list[RawJob]:
        """Fetch all jobs from Greenhouse.

        Args:
            identifier: Company identifier (e.g., 'anthropic', 'xai', 'scaleai')
        """
        url = f"{self.BASE_URL}/{identifier}/jobs"

        response = httpx.get(url, params={"content": "true"}, timeout=30.0)
        response.raise_for_status()

        data = response.json()
        jobs = []

        for job in data.get("jobs", []):
            # Parse published_at datetime
            published_at = None
            if job.get("first_published"):
                try:
                    published_at = datetime.fromisoformat(
                        job["first_published"].replace("Z", "+00:00")
                    )
                except (ValueError, TypeError):
                    pass

            # Get department from first department in list
            department = None
            if job.get("departments") and len(job["departments"]) > 0:
                department = job["departments"][0].get("name")

            jobs.append(
                RawJob(
                    external_id=str(job["id"]),
                    title=job["title"],
                    description_html=job.get("content"),
                    description_plain=None,  # Greenhouse doesn't provide plain text
                    department=department,
                    location=job.get("location", {}).get("name"),
                    job_url=job.get("absolute_url"),
                    apply_url=job.get("absolute_url"),  # Same as job_url for Greenhouse
                    published_at=published_at,
                )
            )

        return jobs
