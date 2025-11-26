from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass
class RawJob:
    """Raw job data from ATS API."""

    external_id: str
    title: str
    description_html: str | None
    description_plain: str | None
    department: str | None
    location: str | None
    job_url: str | None
    apply_url: str | None
    published_at: datetime | None


class BaseScraper(ABC):
    """Base class for ATS scrapers."""

    @abstractmethod
    def fetch_jobs(self, identifier: str) -> list[RawJob]:
        """Fetch all jobs for a company.

        Args:
            identifier: Company identifier for this ATS (e.g., 'anthropic' for Greenhouse)

        Returns:
            List of raw job data
        """
        pass
