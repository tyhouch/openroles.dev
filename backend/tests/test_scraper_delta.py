"""
Tests for scraper delta detection logic.

These tests verify that the scrape pipeline correctly:
1. Identifies new jobs vs already-seen jobs
2. Marks removed jobs appropriately
3. Reactivates previously-removed jobs that reappear
4. Tracks correct metrics in ScrapeRun
"""
from datetime import datetime, timedelta
from unittest.mock import patch

import pytest

from app.models import Company, JobPosting, ScrapeRun
from app.services.scraper import run_scrape_for_company
from tests.conftest import MockScraper, make_raw_job


class TestNewJobDetection:
    """Tests for detecting and creating new jobs."""

    def test_new_job_is_created(self, db_session, test_company, mock_scraper, make_job):
        """A job with a new external_id should be created in the database."""
        mock_scraper.set_jobs([make_job("job-001", "ML Engineer")])

        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            result = run_scrape_for_company(db_session, test_company)

        assert result["status"] == "success"
        assert result["jobs_added"] == 1
        assert result["jobs_found"] == 1

        # Verify job was created
        job = db_session.query(JobPosting).filter_by(external_id="job-001").first()
        assert job is not None
        assert job.title_raw == "ML Engineer"
        assert job.company_id == test_company.id
        assert job.first_seen_at is not None
        assert job.last_seen_at is not None
        assert job.removed_at is None

    def test_multiple_new_jobs_created(self, db_session, test_company, mock_scraper, make_job):
        """Multiple new jobs should all be created."""
        mock_scraper.set_jobs([
            make_job("job-001", "ML Engineer"),
            make_job("job-002", "Backend Engineer"),
            make_job("job-003", "Frontend Engineer"),
        ])

        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            result = run_scrape_for_company(db_session, test_company)

        assert result["jobs_added"] == 3
        assert result["jobs_found"] == 3

        # Verify all jobs exist
        jobs = db_session.query(JobPosting).filter_by(company_id=test_company.id).all()
        assert len(jobs) == 3

    def test_new_job_has_correct_timestamps(self, db_session, test_company, mock_scraper, make_job):
        """New jobs should have first_seen_at and last_seen_at set to current time."""
        before_scrape = datetime.utcnow()

        mock_scraper.set_jobs([make_job("job-001")])

        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            run_scrape_for_company(db_session, test_company)

        after_scrape = datetime.utcnow()

        job = db_session.query(JobPosting).filter_by(external_id="job-001").first()
        assert before_scrape <= job.first_seen_at <= after_scrape
        assert before_scrape <= job.last_seen_at <= after_scrape


class TestExistingJobDetection:
    """Tests for handling already-seen jobs."""

    def test_existing_job_not_duplicated(self, db_session, test_company, mock_scraper, make_job):
        """A job that already exists should not be created again."""
        # First scrape - creates the job
        mock_scraper.set_jobs([make_job("job-001", "ML Engineer")])
        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            result1 = run_scrape_for_company(db_session, test_company)

        assert result1["jobs_added"] == 1

        # Second scrape - same job, should not be added again
        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            result2 = run_scrape_for_company(db_session, test_company)

        assert result2["jobs_added"] == 0
        assert result2["jobs_updated"] == 1
        assert result2["jobs_found"] == 1

        # Verify only one job exists
        jobs = db_session.query(JobPosting).filter_by(company_id=test_company.id).all()
        assert len(jobs) == 1

    def test_existing_job_last_seen_updated(self, db_session, test_company, mock_scraper, make_job):
        """An existing job's last_seen_at should be updated on re-scrape."""
        mock_scraper.set_jobs([make_job("job-001")])

        # First scrape
        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            run_scrape_for_company(db_session, test_company)

        job = db_session.query(JobPosting).filter_by(external_id="job-001").first()
        original_first_seen = job.first_seen_at
        original_last_seen = job.last_seen_at

        # Second scrape (after a small delay)
        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            run_scrape_for_company(db_session, test_company)

        db_session.refresh(job)

        # first_seen_at should NOT change
        assert job.first_seen_at == original_first_seen
        # last_seen_at SHOULD be updated (or at least >= original)
        assert job.last_seen_at >= original_last_seen

    def test_mixed_new_and_existing_jobs(self, db_session, test_company, mock_scraper, make_job):
        """Scrape with mix of new and existing jobs should handle both correctly."""
        # First scrape - 2 jobs
        mock_scraper.set_jobs([
            make_job("job-001", "ML Engineer"),
            make_job("job-002", "Backend Engineer"),
        ])
        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            result1 = run_scrape_for_company(db_session, test_company)

        assert result1["jobs_added"] == 2

        # Second scrape - 1 existing + 1 new
        mock_scraper.set_jobs([
            make_job("job-001", "ML Engineer"),  # existing
            make_job("job-003", "Frontend Engineer"),  # new
        ])
        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            result2 = run_scrape_for_company(db_session, test_company)

        assert result2["jobs_added"] == 1
        assert result2["jobs_updated"] == 1
        assert result2["jobs_found"] == 2


class TestJobRemovalDetection:
    """Tests for detecting removed jobs."""

    def test_missing_job_marked_as_removed(self, db_session, test_company, mock_scraper, make_job):
        """A job that disappears from the ATS should be marked as removed."""
        # First scrape - 2 jobs
        mock_scraper.set_jobs([
            make_job("job-001", "ML Engineer"),
            make_job("job-002", "Backend Engineer"),
        ])
        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            run_scrape_for_company(db_session, test_company)

        # Second scrape - only 1 job (job-002 removed)
        mock_scraper.set_jobs([make_job("job-001", "ML Engineer")])
        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            result = run_scrape_for_company(db_session, test_company)

        assert result["jobs_removed"] == 1

        # Verify job-002 is marked as removed
        job_002 = db_session.query(JobPosting).filter_by(external_id="job-002").first()
        assert job_002.removed_at is not None

        # Verify job-001 is still active
        job_001 = db_session.query(JobPosting).filter_by(external_id="job-001").first()
        assert job_001.removed_at is None

    def test_all_jobs_removed_on_empty_scrape(self, db_session, test_company, mock_scraper, make_job):
        """If ATS returns no jobs, all existing jobs should be marked as removed."""
        # First scrape - 3 jobs
        mock_scraper.set_jobs([
            make_job("job-001"),
            make_job("job-002"),
            make_job("job-003"),
        ])
        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            run_scrape_for_company(db_session, test_company)

        # Second scrape - empty
        mock_scraper.set_jobs([])
        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            result = run_scrape_for_company(db_session, test_company)

        assert result["jobs_removed"] == 3
        assert result["jobs_found"] == 0

        # All jobs should be removed
        active_jobs = (
            db_session.query(JobPosting)
            .filter_by(company_id=test_company.id, removed_at=None)
            .all()
        )
        assert len(active_jobs) == 0


class TestJobReactivation:
    """Tests for reactivating previously-removed jobs."""

    def test_removed_job_reactivated_when_reappears(
        self, db_session, test_company, mock_scraper, make_job
    ):
        """A job that was removed but reappears should be reactivated."""
        # First scrape - job exists
        mock_scraper.set_jobs([make_job("job-001", "ML Engineer")])
        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            run_scrape_for_company(db_session, test_company)

        # Second scrape - job removed
        mock_scraper.set_jobs([])
        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            run_scrape_for_company(db_session, test_company)

        job = db_session.query(JobPosting).filter_by(external_id="job-001").first()
        assert job.removed_at is not None  # Job is removed

        # Third scrape - job reappears!
        mock_scraper.set_jobs([make_job("job-001", "ML Engineer")])
        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            result = run_scrape_for_company(db_session, test_company)

        db_session.refresh(job)

        # Job should be reactivated (removed_at cleared)
        assert job.removed_at is None
        assert result["jobs_updated"] == 1
        assert result["jobs_added"] == 0  # Not a new job, it's reactivated


class TestScrapeRunTracking:
    """Tests for ScrapeRun record tracking."""

    def test_scrape_run_created(self, db_session, test_company, mock_scraper, make_job):
        """A ScrapeRun record should be created for each scrape."""
        mock_scraper.set_jobs([make_job("job-001")])

        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            run_scrape_for_company(db_session, test_company)

        scrape_run = db_session.query(ScrapeRun).filter_by(company_id=test_company.id).first()
        assert scrape_run is not None
        assert scrape_run.status == "success"
        assert scrape_run.jobs_found == 1
        assert scrape_run.jobs_added == 1
        assert scrape_run.completed_at is not None

    def test_scrape_run_tracks_correct_metrics(self, db_session, test_company, mock_scraper, make_job):
        """ScrapeRun should accurately track jobs found, added, and removed."""
        # First scrape
        mock_scraper.set_jobs([
            make_job("job-001"),
            make_job("job-002"),
            make_job("job-003"),
        ])
        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            run_scrape_for_company(db_session, test_company)

        # Second scrape - 1 existing, 1 new, 2 removed
        mock_scraper.set_jobs([
            make_job("job-001"),  # existing
            make_job("job-004"),  # new
        ])
        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            run_scrape_for_company(db_session, test_company)

        # Get the latest scrape run
        scrape_runs = (
            db_session.query(ScrapeRun)
            .filter_by(company_id=test_company.id)
            .order_by(ScrapeRun.started_at.desc())
            .all()
        )
        latest_run = scrape_runs[0]

        assert latest_run.jobs_found == 2
        assert latest_run.jobs_added == 1
        assert latest_run.jobs_removed == 2


class TestCompanyIsolation:
    """Tests to ensure jobs are isolated per company."""

    def test_jobs_not_shared_between_companies(
        self, db_session, test_company, another_company, mock_scraper, make_job
    ):
        """Jobs with the same external_id but different companies should be separate."""
        # Same external_id for both companies
        mock_scraper.set_jobs([make_job("job-001", "ML Engineer")])

        # Scrape company 1
        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            result1 = run_scrape_for_company(db_session, test_company)

        # Scrape company 2
        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            result2 = run_scrape_for_company(db_session, another_company)

        # Both should create new jobs
        assert result1["jobs_added"] == 1
        assert result2["jobs_added"] == 1

        # There should be 2 total jobs
        all_jobs = db_session.query(JobPosting).filter_by(external_id="job-001").all()
        assert len(all_jobs) == 2

    def test_removal_only_affects_own_company(
        self, db_session, test_company, another_company, mock_scraper, make_job
    ):
        """Removing jobs from one company should not affect another company."""
        # Both companies have job-001
        mock_scraper.set_jobs([make_job("job-001")])

        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            run_scrape_for_company(db_session, test_company)
            run_scrape_for_company(db_session, another_company)

        # Empty scrape for test_company only
        mock_scraper.set_jobs([])
        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            run_scrape_for_company(db_session, test_company)

        # test_company's job should be removed
        test_job = (
            db_session.query(JobPosting)
            .filter_by(company_id=test_company.id, external_id="job-001")
            .first()
        )
        assert test_job.removed_at is not None

        # another_company's job should still be active
        other_job = (
            db_session.query(JobPosting)
            .filter_by(company_id=another_company.id, external_id="job-001")
            .first()
        )
        assert other_job.removed_at is None


class TestEdgeCases:
    """Tests for edge cases and error handling."""

    def test_company_without_ats_config_skipped(self, db_session):
        """Company without ATS configuration should be skipped."""
        company = Company(
            name="No ATS Company",
            slug="no-ats",
            ats_type=None,
            ats_identifier=None,
        )
        db_session.add(company)
        db_session.commit()

        result = run_scrape_for_company(db_session, company)

        assert result["status"] == "skipped"
        assert "Missing ATS configuration" in result["reason"]

    def test_empty_first_scrape(self, db_session, test_company, mock_scraper):
        """First scrape with no jobs should succeed with zero counts."""
        mock_scraper.set_jobs([])

        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            result = run_scrape_for_company(db_session, test_company)

        assert result["status"] == "success"
        assert result["jobs_found"] == 0
        assert result["jobs_added"] == 0
        assert result["jobs_removed"] == 0

    def test_company_last_scraped_at_updated(self, db_session, test_company, mock_scraper, make_job):
        """Company's last_scraped_at should be updated after successful scrape."""
        assert test_company.last_scraped_at is None

        mock_scraper.set_jobs([make_job("job-001")])

        with patch("app.services.scraper.get_scraper", return_value=mock_scraper):
            run_scrape_for_company(db_session, test_company)

        db_session.refresh(test_company)
        assert test_company.last_scraped_at is not None
