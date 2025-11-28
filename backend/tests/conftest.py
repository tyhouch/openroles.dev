"""
Pytest fixtures for OpenRoles backend tests.

Uses the existing PostgreSQL database with nested transactions that get rolled back.
This approach doesn't affect real data and doesn't require a separate test database.
"""
import os
import uuid
from datetime import datetime
from unittest.mock import MagicMock

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.company import Company
from app.models.job import JobPosting
from app.models.scrape_run import ScrapeRun
from app.services.ats.base import BaseScraper, RawJob


# Use the same database as dev - tests use transactions that get rolled back
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://openroles:openroles@localhost:5432/openroles"
)


@pytest.fixture(scope="session")
def test_engine():
    """Create a test database engine."""
    engine = create_engine(TEST_DATABASE_URL, echo=False)
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(test_engine):
    """
    Create a test database session wrapped in a transaction.

    Uses a nested transaction pattern where commit() creates a savepoint
    instead of actually committing, allowing full rollback after the test.
    """
    connection = test_engine.connect()
    transaction = connection.begin()

    # Bind session to the connection
    TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=connection)
    session = TestSessionLocal()

    # Replace commit with begin_nested (savepoint) to allow "commits" without
    # actually committing the outer transaction
    original_commit = session.commit

    def fake_commit():
        session.flush()
        # Start a new nested transaction (savepoint) after each "commit"
        session.begin_nested()

    session.commit = fake_commit

    # Start initial nested transaction
    session.begin_nested()

    yield session

    # Roll back everything - outer transaction undoes all changes
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def test_company(db_session) -> Company:
    """Create a test company."""
    company = Company(
        id=uuid.uuid4(),
        name="Test Company",
        slug="test-company",
        ats_type="greenhouse",
        ats_identifier="testcompany",
        is_active=True,
    )
    db_session.add(company)
    db_session.commit()
    db_session.refresh(company)
    return company


@pytest.fixture
def another_company(db_session) -> Company:
    """Create another test company (for isolation tests)."""
    company = Company(
        id=uuid.uuid4(),
        name="Another Company",
        slug="another-company",
        ats_type="lever",
        ats_identifier="anothercompany",
        is_active=True,
    )
    db_session.add(company)
    db_session.commit()
    db_session.refresh(company)
    return company


class MockScraper(BaseScraper):
    """Mock scraper that returns controlled job data."""

    def __init__(self, jobs: list[RawJob] | None = None):
        self._jobs = jobs or []

    def set_jobs(self, jobs: list[RawJob]):
        """Set the jobs to return on next fetch."""
        self._jobs = jobs

    def fetch_jobs(self, identifier: str) -> list[RawJob]:
        """Return the configured jobs."""
        return self._jobs


@pytest.fixture
def mock_scraper():
    """Create a mock scraper."""
    return MockScraper()


def make_raw_job(
    external_id: str,
    title: str = "Software Engineer",
    location: str = "San Francisco, CA",
    department: str = "Engineering",
) -> RawJob:
    """Helper to create RawJob instances for testing."""
    return RawJob(
        external_id=external_id,
        title=title,
        description_html=f"<p>Job description for {title}</p>",
        description_plain=f"Job description for {title}",
        department=department,
        location=location,
        job_url=f"https://example.com/jobs/{external_id}",
        apply_url=f"https://example.com/jobs/{external_id}/apply",
        published_at=datetime.utcnow(),
    )


@pytest.fixture
def make_job():
    """Fixture that returns the make_raw_job helper function."""
    return make_raw_job
