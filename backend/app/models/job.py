import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, Boolean, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class JobPosting(Base):
    __tablename__ = "job_postings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False
    )

    # Raw fields from ATS
    external_id: Mapped[str] = mapped_column(String(255), nullable=False)
    title_raw: Mapped[str] = mapped_column(String(500), nullable=False)
    description_html: Mapped[str | None] = mapped_column(Text)
    description_plain: Mapped[str | None] = mapped_column(Text)
    department_raw: Mapped[str | None] = mapped_column(String(255))
    location_raw: Mapped[str | None] = mapped_column(String(255))
    job_url: Mapped[str | None] = mapped_column(String(1000))
    apply_url: Mapped[str | None] = mapped_column(String(1000))
    published_at: Mapped[datetime | None] = mapped_column(DateTime)

    # Lifecycle tracking
    first_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    removed_at: Mapped[datetime | None] = mapped_column(DateTime)

    # Normalized fields (from LLM)
    normalized_title: Mapped[str | None] = mapped_column(String(255))
    seniority: Mapped[str | None] = mapped_column(String(50))  # intern, junior, mid, senior, etc.
    function: Mapped[str | None] = mapped_column(String(50))  # engineering, research, sales, etc.
    team_area: Mapped[str | None] = mapped_column(String(100))
    is_leadership: Mapped[bool | None] = mapped_column(Boolean)
    experience_years_min: Mapped[int | None] = mapped_column(Integer)  # null = unknown
    remote_policy: Mapped[str | None] = mapped_column(String(50))  # remote, hybrid, onsite, unknown
    tech_stack: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    keywords: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    notable_signals: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    salary_min: Mapped[int | None] = mapped_column(Integer)
    salary_max: Mapped[int | None] = mapped_column(Integer)
    salary_currency: Mapped[str | None] = mapped_column(String(10))
    normalized_at: Mapped[datetime | None] = mapped_column(DateTime)

    # Relationships
    company: Mapped["Company"] = relationship(back_populates="jobs")

    __table_args__ = (
        UniqueConstraint("company_id", "external_id", name="uq_company_external_id"),
    )


from app.models.company import Company
