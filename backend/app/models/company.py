import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    website_url: Mapped[str | None] = mapped_column(String(500))
    careers_url: Mapped[str | None] = mapped_column(String(500))

    # ATS configuration
    ats_type: Mapped[str | None] = mapped_column(String(50))  # greenhouse, ashby, lever
    ats_identifier: Mapped[str | None] = mapped_column(String(255))

    # Profile - stored as markdown text (manually created)
    profile_markdown: Mapped[str | None] = mapped_column(Text)

    # Management
    tier: Mapped[str] = mapped_column(String(20), default="tier2")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    last_scraped_at: Mapped[datetime | None] = mapped_column(DateTime)

    # Relationships
    jobs: Mapped[list["JobPosting"]] = relationship(back_populates="company")
    scrape_runs: Mapped[list["ScrapeRun"]] = relationship(back_populates="company")
    weekly_summaries: Mapped[list["CompanyWeeklySummary"]] = relationship(
        back_populates="company"
    )


# Import here to avoid circular imports
from app.models.job import JobPosting
from app.models.scrape_run import ScrapeRun
from app.models.summary import CompanyWeeklySummary
