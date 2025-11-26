import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CompanyWeeklySummary(Base):
    __tablename__ = "company_weekly_summaries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False
    )
    week_start: Mapped[date] = mapped_column(Date, nullable=False)

    # Snapshot stats
    jobs_added_count: Mapped[int | None] = mapped_column(Integer)
    jobs_removed_count: Mapped[int | None] = mapped_column(Integer)
    total_active_jobs: Mapped[int | None] = mapped_column(Integer)
    jobs_added_ids: Mapped[list[uuid.UUID] | None] = mapped_column(ARRAY(UUID(as_uuid=True)))
    jobs_removed_ids: Mapped[list[uuid.UUID] | None] = mapped_column(ARRAY(UUID(as_uuid=True)))

    # LLM-generated content
    summary_text: Mapped[str | None] = mapped_column(Text)
    hiring_velocity: Mapped[str | None] = mapped_column(String(20))  # up, stable, down
    focus_areas: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    notable_changes: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    anomalies: Mapped[list[str] | None] = mapped_column(ARRAY(String))

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    company: Mapped["Company"] = relationship(back_populates="weekly_summaries")

    __table_args__ = (
        UniqueConstraint("company_id", "week_start", name="uq_company_week"),
    )


class SectorWeeklySummary(Base):
    __tablename__ = "sector_weekly_summaries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    week_start: Mapped[date] = mapped_column(Date, unique=True, nullable=False)

    # Aggregate stats
    total_companies: Mapped[int | None] = mapped_column(Integer)
    total_active_jobs: Mapped[int | None] = mapped_column(Integer)
    total_jobs_added: Mapped[int | None] = mapped_column(Integer)
    total_jobs_removed: Mapped[int | None] = mapped_column(Integer)

    # LLM-generated content
    summary_text: Mapped[str | None] = mapped_column(Text)
    trending_roles: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    trending_skills: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    sector_signals: Mapped[list[str] | None] = mapped_column(ARRAY(String))

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


from app.models.company import Company
