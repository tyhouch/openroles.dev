from datetime import datetime

import httpx

from app.services.ats.base import BaseScraper, RawJob


class AshbyScraper(BaseScraper):
    """Scraper for Ashby ATS."""

    BASE_URL = "https://api.ashbyhq.com/posting-api/job-board"

    def fetch_jobs(self, identifier: str) -> list[RawJob]:
        """Fetch all jobs from Ashby.

        Args:
            identifier: Company identifier (e.g., 'openai', 'cohere', 'perplexity')
        """
        url = f"{self.BASE_URL}/{identifier}"

        response = httpx.get(url, timeout=30.0)
        response.raise_for_status()

        data = response.json()
        jobs = []

        for job in data.get("jobs", []):
            # Parse published_at datetime
            published_at = None
            if job.get("publishedAt"):
                try:
                    published_at = datetime.fromisoformat(
                        job["publishedAt"].replace("Z", "+00:00")
                    )
                except (ValueError, TypeError):
                    pass

            # Department can be in 'department' or 'team' field
            department = job.get("department") or job.get("team")

            jobs.append(
                RawJob(
                    external_id=job["id"],
                    title=job["title"],
                    description_html=job.get("descriptionHtml"),
                    description_plain=job.get("descriptionPlain"),
                    department=department,
                    location=job.get("location"),
                    job_url=job.get("jobUrl"),
                    apply_url=job.get("applyUrl"),
                    published_at=published_at,
                )
            )

        return jobs
