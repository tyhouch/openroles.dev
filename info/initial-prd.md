# PRD: AI Sector Job Intelligence Platform

**Working Title:** TBD (suggestions: SignalHire, HiringSignals, TalentTelescope, Headcount)

**Author:** Tyler
**Date:** November 2025
**Status:** In Development

---

## Implementation Status

**Last Updated:** November 26, 2025

### Completed

- [x] FastAPI backend project structure (`backend/`)
- [x] PostgreSQL database schema (all tables created)
- [x] Greenhouse scraper (tested, working)
- [x] Ashby scraper (tested, working)
- [x] Lever scraper (tested, working)
- [x] Scrape pipeline with delta detection (new/updated/removed jobs)
- [x] Job normalization pipeline with OpenAI (gpt-4o-mini)
- [x] 11 companies seeded and scraped
- [x] REST API endpoints (companies, jobs, admin)
- [x] Local development environment working

### Recently Completed

- [x] Weekly synthesis pipeline (company + sector reports with gpt-4o)
- [x] Company profiles (11 profiles loaded into database)
- [x] API key auth for admin endpoints

### In Progress

- [x] Frontend (Next.js) - Core pages built, see Phase 3 below for details
- [ ] Cloud deployment (GCP Cloud Run)
- [ ] Scheduled jobs (Cloud Scheduler)

### Current Data

| Company | Jobs Scraped |
|---------|-------------|
| OpenAI | 453 |
| Anthropic | 289 |
| xAI | 260 |
| Scale AI | 133 |
| Mistral | 126 |
| Cohere | 103 |
| Figure AI | 91 |
| Perplexity | 65 |
| Together AI | 48 |
| Cursor | 30 |
| Fireworks AI | 27 |
| **Total** | **~1,625** |

### Running Locally

```bash
cd backend

# Start server (port 8007)
source .venv/bin/activate
uvicorn app.main:app --port 8007 --reload

# Test endpoints
curl http://localhost:8007/api/companies
curl -X POST http://localhost:8007/api/admin/scrape/anthropic
curl -X POST http://localhost:8007/api/admin/normalize?limit=10
```

---

## 1. Problem Statement

Job postings are one of the few real-time, public signals of a company's strategic direction. When an AI company starts hiring for "voice engineers" or spins up a "reasoning" team, that's meaningful intelligence—but manually tracking dozens of companies' career pages is impractical.

There's currently no good way to:
- Track hiring changes across the AI sector in aggregate
- Get alerts when specific companies make notable hiring moves
- See historical trends in what roles/skills the industry is prioritizing
- Extrapolate strategic insights from hiring patterns

## 2. Goal

**Turn public job posting data into strategic intelligence about AI companies.**

By tracking what roles appear/disappear and normalizing them into structured data, we can detect signals like:
- "Anthropic is ramping inference team"
- "xAI is hiring 50 domain experts for training data"
- "3 companies started hiring voice engineers this week"
- "Figure AI added 10 hardware roles - robotics push accelerating"

The company profile provides baseline context so we can spot anomalies ("OpenAI hiring enterprise sales aggressively is a shift from their consumer focus").

## 3. Solution Overview

A system that:
1. **Monitors** job postings across ~30-50 AI companies daily via ATS APIs (Greenhouse, Ashby, Lever)
2. **Detects** changes (new roles, removed/filled roles)
3. **Normalizes** job data using LLMs (title standardization, seniority, function, team area, keywords)
4. **Synthesizes** weekly intelligence reports per company and sector-wide
5. **Surfaces** insights via a simple web dashboard

**Reference:** See `playground/jobscraping/findings/` for detailed schema and ATS discovery work.

## 4. Target Users

**Primary:**
- Investors tracking AI sector (VCs, public market analysts)
- AI founders/operators doing competitive intelligence
- Recruiters/talent teams in AI
- Journalists covering AI industry

**Secondary:**
- Job seekers wanting sector-level view
- Researchers studying AI industry dynamics

## 5. Success Metrics

| Metric | Target |
|--------|--------|
| Companies tracked | 30+ at launch |
| Scrape reliability | >95% daily success rate |
| Time from job posted → in system | <24 hours |
| Weekly active users | 100+ (after launch) |
| Weekly report usefulness (survey) | >4/5 rating |

---

## 6. Core Features

### 6.1 Company Management

**Add Company (Admin)**
- Input: Company name, website URL, careers page URL
- System auto-detects ATS type (Greenhouse, Lever, Ashby)
- Triggers profile generation via web search + LLM
- Triggers initial job scrape

**Company Profile**
- Manually created markdown files with company context
- Includes: what they do, funding, products, market position, strategic focus
- Used as **baseline context** for detecting anomalies in weekly synthesis
- Stored in `profile_markdown` field on company record

### 6.2 Job Tracking

**Daily Scrape Pipeline**
- Runs daily (e.g., 6am UTC)
- For each company: fetch current job listings via ATS API
- Detect new jobs (not seen before)
- Detect removed jobs (seen yesterday, missing today) - could be filled or closed
- Store raw job data
- Track `days_active` (how long job has been posted)

**Raw Fields (stored directly from API):**
```json
{
  "external_id": "string - job ID from ATS",
  "ats_type": "greenhouse | ashby | lever",
  "title_raw": "string - original title",
  "description_html": "string - full HTML description",
  "description_plain": "string - plain text (if available)",
  "department_raw": "string | null",
  "location_raw": "string",
  "job_url": "string - link to job posting",
  "apply_url": "string - direct apply link",
  "published_at": "datetime",
  "first_seen_at": "datetime - when we first scraped",
  "last_seen_at": "datetime - when we last saw it",
  "removed_at": "datetime | null"
}
```

**Job Normalization Pipeline**
- Triggered async when new jobs detected
- LLM extracts structured data from raw job data
- Use "unknown" for any field that cannot be determined (not null)

**Normalized Fields (from LLM):**
```json
{
  "normalized_title": "Senior ML Engineer",
  "seniority": "senior",              // intern, junior, mid, senior, staff, principal, lead, manager, director, vp, c_level, unknown
  "function": "engineering",          // engineering, research, product, design, sales, marketing, operations, finance, legal, people, security, data, support, other
  "team_area": "inference",           // freeform - training, inference, safety, platform, enterprise, agentic, etc.
  "is_leadership": false,             // manages people or leads function
  "experience_years_min": "unknown",  // number or "unknown"
  "remote_policy": "hybrid",          // remote, hybrid, onsite, unknown
  "tech_stack": ["Python", "PyTorch", "CUDA"],
  "keywords": ["inference", "distributed-systems", "ml-infrastructure"],  // LLM freeform - strategic signals
  "notable_signals": ["multi-cloud deployment", "first safety hire"],     // unusual things worth flagging
  "salary_min": "unknown",
  "salary_max": "unknown",
  "salary_currency": "unknown",
  "normalized_at": "datetime"
}
```

**Reference:** See `playground/jobscraping/findings/normalization-schema-final.md` for full schema details, edge cases, and examples.

### 6.3 Weekly Synthesis

**Company Weekly Report**
- Generated every Monday
- Inputs:
  - Company profile (context)
  - Jobs added this week (with normalized data)
  - Jobs removed this week
  - Previous 4 weekly reports (continuity)
  - Current total headcount by function
- Outputs:
  - Narrative summary (2-3 paragraphs)
  - Structured signals:
    - `hiring_velocity`: up / stable / down
    - `focus_areas`: ["inference", "enterprise sales"]
    - `notable_changes`: ["First safety hire", "3 new directors"]
    - `anomalies`: ["Removed all recruiter roles"]

**Sector Weekly Report**
- Generated after all company reports complete
- Aggregates trends across all tracked companies
- Identifies sector-wide patterns:
  - "5 companies posted 'voice' roles this week"
  - "Inference hiring up 30% month-over-month"
  - "First robotics roles appearing at foundation model labs"

### 6.4 Dashboard (Frontend)

**Design System: "Observatory"**

Dark, elegant space-themed design evoking a telescope observing AI companies.

**Colors:**
- Void: `#0a0a12` (darkest background)
- Deep: `#0d0d1a` (cards, panels)
- Navy: `#1a1a2e` (secondary bg)
- Gold: `#c9a227` (accent, highlights, anomalies)
- Blue: `#4a6fa5` (secondary accent)
- Cream: `#e8e4dc` (text)
- CreamMuted: `#9a9aaa` (secondary text)

**Typography:**
- Headings: "Cormorant Garamond" (serif, italic)
- Body: "DM Sans" (sans-serif)

**Visual Effects:**
- Star field background with twinkling animation
- Glass-morphism cards (backdrop-filter: blur)
- Slide-in panels with animation
- Pulsing indicators for anomalies

**Navigation:**
- Logo: Concentric circles (telescope/eye motif)
- Tabs: Dashboard, Companies, Digest, Alerts
- Week indicator: "Week 47, 2025"

**Views:**

1. **Dashboard (Home)** `/`
   - Week observation log header
   - Metric cards: Total Positions, Weekly Delta, Companies Tracked, Anomalies Detected
   - Companies table: name, positions, week delta, velocity (high/medium/low), focus area tags
   - Signals panel: Anomalies (gold pulsing dot) and signals (blue)
   - Weekly Digest: sector-wide trends with company mentions
   - Click company row → slide-in detail panel

2. **Company Detail Panel** (slide-in from right)
   - Company name with "Observation Target" label
   - Metrics: Open Roles, Week Delta
   - Valuation (from profile)
   - Overview text
   - Hot Roles list
   - Trend Analysis box

3. **Companies** `/companies`
   - Full company list view
   - All companies with expanded stats
   - Filterable/sortable

4. **Digest** `/digest`
   - Weekly summaries archive
   - Sector trends over time
   - Company-specific digests

5. **Alerts** `/alerts` (Future)
   - Subscribe to: specific company, role type, keyword
   - Get email/webhook when matching job appears

**Reference:** See `info/frontend-concept/concept.jsx` for full design implementation

---

## 7. Technical Architecture

### 7.1 Stack

| Component | Technology | Hosting |
|-----------|------------|---------|
| Backend API | FastAPI (Python) | GCP Cloud Run |
| Database | PostgreSQL | GCP Cloud SQL |
| Task Queue | Cloud Tasks or Pub/Sub | GCP |
| Scheduler | Cloud Scheduler | GCP |
| Frontend | Next.js | Vercel |
| LLM | OpenAI API (gpt-4o-mini for normalization, gpt-4o for synthesis) | - |
| Blob Storage | GCS | GCP |

### 7.2 System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (Vercel)                           │
│                           Next.js App                               │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ REST API
┌─────────────────────────────▼───────────────────────────────────────┐
│                      Backend API (Cloud Run)                        │
│                            FastAPI                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  Companies  │  │    Jobs     │  │  Summaries  │                 │
│  │  Endpoints  │  │  Endpoints  │  │  Endpoints  │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│                      PostgreSQL (Cloud SQL)                         │
│                                                                     │
│   companies │ job_postings │ weekly_summaries │ sector_summaries   │
└─────────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
┌────────▼───────┐  ┌─────────▼────────┐  ┌───────▼────────┐
│  Scrape Worker │  │ Normalize Worker │  │ Synthesis Worker│
│  (Cloud Run)   │  │   (Cloud Run)    │  │   (Cloud Run)   │
│                │  │                  │  │                 │
│ • Greenhouse   │  │ • OpenAI API     │  │ • OpenAI API    │
│ • Lever        │  │ • gpt-4o-mini    │  │ • gpt-4o        │
│ • Ashby        │  │                  │  │                 │
│ • Custom       │  │                  │  │                 │
└────────────────┘  └──────────────────┘  └─────────────────┘
         │
         │ Triggered by
┌────────▼───────┐
│ Cloud Scheduler│
│ • Daily 6am    │
│ • Weekly Mon   │
└────────────────┘
```

### 7.3 Data Model

```sql
-- Companies we're tracking
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    website_url VARCHAR(500),
    careers_url VARCHAR(500),
    ats_type VARCHAR(50),  -- greenhouse, lever, ashby, workday, custom
    ats_identifier VARCHAR(255),  -- e.g., "anthropic" for greenhouse
    profile_json JSONB,  -- LLM-generated company profile
    tier VARCHAR(20) DEFAULT 'tier2',  -- tier1, tier2 for prioritization
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_scraped_at TIMESTAMPTZ,
    last_profile_refresh_at TIMESTAMPTZ
);

-- Individual job postings
CREATE TABLE job_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    external_id VARCHAR(255),  -- ID from their system
    title VARCHAR(500) NOT NULL,
    description_raw TEXT,
    url VARCHAR(1000),
    
    -- Lifecycle tracking
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    removed_at TIMESTAMPTZ,  -- NULL if still active
    
    -- LLM-normalized fields
    normalized_title VARCHAR(255),
    seniority VARCHAR(50),
    function VARCHAR(50),
    team_area VARCHAR(100),
    tech_stack JSONB,  -- ["Python", "PyTorch"]
    location VARCHAR(255),
    remote_policy VARCHAR(50),
    notable_signals JSONB,  -- ["CUDA kernels", "distributed systems"]
    
    normalized_at TIMESTAMPTZ,
    
    -- Deduplication
    UNIQUE(company_id, external_id)
);

-- Indexes for common queries
CREATE INDEX idx_jobs_company_active ON job_postings(company_id) WHERE removed_at IS NULL;
CREATE INDEX idx_jobs_first_seen ON job_postings(first_seen_at);
CREATE INDEX idx_jobs_removed ON job_postings(removed_at) WHERE removed_at IS NOT NULL;
CREATE INDEX idx_jobs_function ON job_postings(function) WHERE removed_at IS NULL;

-- Weekly company summaries
CREATE TABLE company_weekly_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    week_start DATE NOT NULL,  -- Monday of the week
    
    -- Snapshot stats
    jobs_added_count INT,
    jobs_removed_count INT,
    total_active_jobs INT,
    jobs_added_ids UUID[],  -- References to job_postings
    jobs_removed_ids UUID[],
    
    -- LLM-generated content
    summary_text TEXT,
    hiring_velocity VARCHAR(20),  -- up, stable, down
    focus_areas JSONB,  -- ["inference", "enterprise"]
    notable_changes JSONB,
    anomalies JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, week_start)
);

-- Sector-wide weekly summaries
CREATE TABLE sector_weekly_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start DATE NOT NULL UNIQUE,
    
    -- Aggregate stats
    total_companies INT,
    total_active_jobs INT,
    total_jobs_added INT,
    total_jobs_removed INT,
    
    -- LLM-generated content
    summary_text TEXT,
    trending_roles JSONB,  -- ["voice engineer", "safety researcher"]
    trending_skills JSONB,
    sector_signals JSONB,  -- Notable cross-company patterns
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- For tracking scrape runs (debugging/monitoring)
CREATE TABLE scrape_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(50),  -- success, failed, partial
    jobs_found INT,
    jobs_added INT,
    jobs_removed INT,
    error_message TEXT
);
```

---

## 8. API Endpoints

### Companies

```
GET    /api/companies                 # List all companies
GET    /api/companies/:slug           # Get company detail + current jobs
POST   /api/companies                 # Add new company (admin)
PUT    /api/companies/:slug           # Update company (admin)
DELETE /api/companies/:slug           # Remove company (admin)
POST   /api/companies/:slug/refresh   # Trigger profile refresh (admin)
```

### Jobs

```
GET    /api/jobs                      # List jobs (paginated, filterable)
       ?company=anthropic
       &function=engineering
       &seniority=senior
       &status=active|removed|added_this_week
       &since=2024-01-01
GET    /api/jobs/:id                  # Single job detail
GET    /api/jobs/feed                 # Recent changes feed (new + removed)
```

### Summaries

```
GET    /api/summaries/sector          # Latest sector summary
GET    /api/summaries/sector/history  # Historical sector summaries
GET    /api/summaries/company/:slug   # Latest company summary
GET    /api/summaries/company/:slug/history  # Historical
```

### Admin / Internal

```
POST   /api/admin/scrape/:slug        # Trigger manual scrape
POST   /api/admin/scrape/all          # Trigger full scrape run
POST   /api/admin/synthesize/:slug    # Trigger company summary
POST   /api/admin/synthesize/sector   # Trigger sector summary
GET    /api/admin/scrape-runs         # View scrape history
```

---

## 9. LLM Prompts (Key Examples)

### 9.1 Company Profile Generation

```
You are analyzing a company for an AI industry intelligence platform.

Given the following search results about {company_name}, generate a structured company profile.

Search Results:
{search_results}

Output JSON:
{
  "description": "2-3 sentence description of what the company does",
  "founded_year": 2023,
  "funding_stage": "Series B",  
  "total_funding": "$150M",
  "headcount_estimate": "100-200",
  "focus_areas": ["inference optimization", "enterprise deployment"],
  "key_products": ["Product 1", "Product 2"],
  "competitors": ["Competitor 1", "Competitor 2"],
  "recent_news": ["Recent development 1", "Recent development 2"]
}
```

### 9.2 Job Normalization

```
You are extracting structured data from a job posting for an AI industry tracker.

Job Title: {title}
Company: {company_name}
Description: {description}

Extract the following (use null if not determinable):

{
  "normalized_title": "Standardized job title",
  "seniority": "junior|mid|senior|staff|principal|director|vp|c-level",
  "function": "engineering|research|product|design|sales|marketing|ops|legal|hr|finance|other",
  "team_area": "Best guess at team/focus area - e.g., training, inference, safety, platform, enterprise, research, product",
  "tech_stack": ["List of technologies/frameworks mentioned"],
  "remote_policy": "remote|hybrid|onsite|unknown",
  "notable_signals": ["Any unusual or notable requirements worth flagging"]
}

Be concise. Focus on what's actually stated, not assumed.
```

### 9.3 Weekly Company Synthesis

```
You are an AI industry analyst generating a weekly hiring intelligence report.

Company: {company_name}
Company Profile: {profile}

This Week's Changes:
- Jobs Added ({count}): {jobs_added_summary}
- Jobs Removed ({count}): {jobs_removed_summary}

Current Totals by Function:
{function_breakdown}

Previous Reports:
{previous_summaries}

Generate a report with:

1. **summary_text**: 2-3 paragraph analysis of what these hiring changes might indicate about the company's strategy, priorities, or trajectory. Be specific and analytical, not generic. Reference specific roles when notable.

2. **hiring_velocity**: "up" | "stable" | "down" - compared to their recent baseline

3. **focus_areas**: Top 2-3 areas they seem to be investing in based on current hiring

4. **notable_changes**: List of specific noteworthy changes (e.g., "First hire with 'safety' in title", "Added 3 director-level roles", "Removed all recruiting positions")

5. **anomalies**: Anything unusual relative to their typical pattern or the sector

Be analytical and opinionated. Avoid generic statements. If there's not much signal this week, say so briefly.
```

---

## 10. Pipeline Specifications

### 10.1 Daily Scrape Pipeline

**Trigger:** Cloud Scheduler, daily at 6:00 AM UTC

**Process:**
```
1. Get all active companies
2. For each company (can parallelize):
   a. Create scrape_run record
   b. Call appropriate scraper based on ats_type
   c. For each job returned:
      - Check if external_id exists
      - If new: INSERT with first_seen_at = now
      - If exists: UPDATE last_seen_at = now
   d. For jobs in DB not in scrape results:
      - If last_seen_at was today-1: SET removed_at = now
   e. Update scrape_run with results
   f. Queue normalization for new jobs
3. Log aggregate stats
```

**Error Handling:**
- Retry failed scrapes up to 3x with exponential backoff
- If company fails 3 days in a row, alert admin
- Partial failures (some companies succeed) should not block others

### 10.2 Normalization Pipeline

**Trigger:** Pub/Sub message when new jobs added

**Process:**
```
1. Receive job_id
2. Fetch job from DB
3. Call OpenAI API with normalization prompt
4. Parse response
5. UPDATE job with normalized fields, set normalized_at = now
```

**Model:** gpt-4o-mini (cheap, fast, sufficient for extraction)

**Rate Limiting:** Max 100 concurrent requests to OpenAI

### 10.3 Weekly Synthesis Pipeline

**Trigger:** Cloud Scheduler, Monday at 9:00 AM UTC

**Process:**
```
1. For each company:
   a. Gather inputs:
      - Company profile
      - Jobs where first_seen_at in past 7 days
      - Jobs where removed_at in past 7 days
      - Last 4 weekly summaries
      - Current job counts by function
   b. Call OpenAI API with synthesis prompt
   c. Parse response
   d. INSERT company_weekly_summary

2. After all companies complete:
   a. Gather all this week's company summaries
   b. Aggregate stats
   c. Call OpenAI API with sector synthesis prompt
   d. INSERT sector_weekly_summary

3. (Future) Send email digest to subscribers
```

**Model:** gpt-4o (higher quality for analysis)

---

## 11. Scraper Implementations

### 11.1 Greenhouse Scraper

```python
def scrape_greenhouse(company: Company) -> list[RawJob]:
    """
    Greenhouse has a public API. No auth needed.
    """
    base_url = f"https://boards-api.greenhouse.io/v1/boards/{company.ats_identifier}/jobs"
    
    response = requests.get(base_url, params={"content": "true"})
    response.raise_for_status()
    
    jobs = []
    for job in response.json()["jobs"]:
        jobs.append(RawJob(
            external_id=str(job["id"]),
            title=job["title"],
            url=job["absolute_url"],
            description_raw=job["content"],  # HTML
            location=job["location"]["name"],
            department=job["departments"][0]["name"] if job["departments"] else None,
        ))
    
    return jobs
```

### 11.2 Lever Scraper

```python
def scrape_lever(company: Company) -> list[RawJob]:
    """
    Lever also has a public API.
    """
    base_url = f"https://api.lever.co/v0/postings/{company.ats_identifier}"
    
    response = requests.get(base_url)
    response.raise_for_status()
    
    jobs = []
    for job in response.json():
        jobs.append(RawJob(
            external_id=job["id"],
            title=job["text"],
            url=job["hostedUrl"],
            description_raw=job["descriptionPlain"],
            location=job["categories"].get("location", ""),
            department=job["categories"].get("team", ""),
        ))
    
    return jobs
```

### 11.3 Ashby Scraper

```python
def scrape_ashby(company: Company) -> list[RawJob]:
    """
    Ashby has a public API. No auth needed.
    """
    base_url = f"https://api.ashbyhq.com/posting-api/job-board/{company.ats_identifier}"

    response = requests.get(base_url)
    response.raise_for_status()

    jobs = []
    for job in response.json()["jobs"]:
        jobs.append(RawJob(
            external_id=job["id"],
            title=job["title"],
            url=job["jobUrl"],
            apply_url=job["applyUrl"],
            description_raw=job["descriptionHtml"],
            description_plain=job.get("descriptionPlain"),
            location=job["location"],
            department=job.get("department") or job.get("team"),
        ))

    return jobs
```

### 11.4 Custom/Fallback Scraper

For companies without standard ATS APIs, options:

1. **HTML scraping with BeautifulSoup** - Write per-site scrapers
2. **Browser automation** - Playwright/Puppeteer for JS-heavy sites
3. **LLM-assisted** - Fetch page HTML, ask LLM to extract job list

For MVP, manually categorize each company and only support Greenhouse/Lever initially. Custom scraping can be added incrementally.

---

## 12. MVP Scope

### Phase 1: Core Infrastructure - COMPLETE

- [x] Database schema + migrations
- [x] FastAPI project structure
- [x] Greenhouse scraper
- [x] Lever scraper
- [x] Ashby scraper
- [x] Basic scrape pipeline (manual trigger)
- [x] Job normalization pipeline
- [x] Add 11 companies (Greenhouse/Lever/Ashby)

### Phase 2: Synthesis + API - COMPLETE

- [x] Weekly synthesis pipeline
- [x] Company summary generation
- [x] Sector summary generation
- [x] REST API endpoints
- [x] API key auth for admin endpoints (X-API-Key header)

### Phase 3: Frontend

**Project Structure:**
- [x] Next.js 15 project setup with TypeScript
- [x] Tailwind CSS 4 with custom Observatory design system
- [x] Google Fonts integration (DM Sans + Cormorant Garamond)
- [x] API client library (`lib/api.ts`)
- [x] Type definitions (`lib/types.ts`)
- [x] Reusable component library

**Design System (Observatory):**
- [x] Dark space-themed color palette (void, deep, navy, gold, blue, cream)
- [x] Custom typography (DM Sans body, Cormorant Garamond serif headings)
- [x] Glass-morphism cards with backdrop blur
- [x] Animated star field background
- [x] Custom animations (twinkle, pulse-gold, slide-in, fade-in)
- [x] Responsive layout with consistent spacing

**Core Components:**
- [x] Navigation bar with active state (`nav.tsx`)
- [x] Metric cards with optional change indicators (`metric-card.tsx`)
- [x] Company rows with velocity indicators (`company-row.tsx`)
- [x] Company detail slide-in panel (`company-detail.tsx`)
- [x] Alert/signal cards with anomaly highlighting (`alert.tsx`)
- [x] Animated star field (`star-field.tsx`)
- [x] Digest entry cards (`digest-entry.tsx`)

**Pages Implemented:**

**1. Dashboard (Home) - `/`** ✅ COMPLETE
- [x] Week observation header with company count
- [x] 4 metric cards (Total Positions, Weekly Delta, Companies Tracked, Signals Detected)
- [x] Trending Roles & In-Demand Skills pills
- [x] Companies table with sortable columns
  - [x] Name, Positions, Week Delta, Velocity, Focus Areas
  - [x] Click to open detail panel
  - [x] Selected row highlighting
- [x] Right sidebar with:
  - [x] LLM-generated sector signals (blue indicators)
  - [x] Company anomalies (gold pulsing indicators)
  - [x] Weekly synthesis text from gpt-4o
- [x] Company detail slide-in panel
  - [x] Overview tab with company profile, focus areas, notable changes, AI analysis
  - [x] Jobs tab with filterable job listings
  - [x] Link to careers page
- [x] Loading skeleton states
- [x] Error handling

**2. Companies - `/companies`** ✅ COMPLETE
- [x] Full company directory grid (3 columns)
- [x] Company cards showing:
  - [x] Company name
  - [x] Open roles count
  - [x] Weekly change (color-coded green/red)
  - [x] Velocity indicator with icon
- [x] Filtering by velocity (All, Growing, Declining, Stable)
- [x] Sorting options (Open Roles, Weekly Change, Name)
- [x] Click card to open detail panel
- [x] Reuses company detail panel component
- [x] Loading skeleton states

**3. Jobs - `/jobs`** ✅ COMPLETE
- [x] Comprehensive job directory
- [x] Search bar (searches title, company, location)
- [x] Company filter dropdown
- [x] Function filter dropdown
- [x] Results count display
- [x] Two view modes:
  - [x] Grouped by company (default, shows top 6 jobs per company)
  - [x] Flat list (when filtering by specific company)
- [x] Job cards showing:
  - [x] Normalized title (falls back to raw title)
  - [x] Company name (in grouped view)
  - [x] Function, location, team area
  - [x] External link icon
  - [x] Hover state with gold border
- [x] Direct links to job postings (opens in new tab)
- [x] Loading skeleton states

**4. Digest - `/digest`** ✅ COMPLETE
- [x] Weekly intelligence report format
- [x] Week number header
- [x] Executive Summary section:
  - [x] Total positions tracked
  - [x] Net change calculation (added/removed)
  - [x] Top sector signal
- [x] Key Metrics Grid:
  - [x] Expanding companies count with names
  - [x] Contracting companies count with names
- [x] Trending Roles section (gold pills)
- [x] Skills in Demand section (blue pills)
- [x] Top Movers This Week (ranked by jobs added)
- [x] Sector Signals list with bullet points
- [x] Empty state handling
- [x] Loading skeleton states

**Data Integration:**
- [x] API client with proper error handling
- [x] Server-side data fetching (Next.js 15 server components)
- [x] Client-side interactivity where needed
- [x] 60-second cache revalidation
- [x] Loading states with Suspense boundaries
- [x] Type-safe API responses

**Not Yet Implemented:**
- [ ] Alerts page (`/alerts`) - Future feature for subscriptions
- [ ] Historical weekly reports UI (API exists, UI not built yet)
- [ ] Pagination for jobs (currently loads all)
- [ ] Advanced filtering (seniority, remote policy, team area)
- [ ] Job detail modal/page
- [ ] Company comparison view
- [ ] Charts and visualizations
- [ ] Mobile responsive optimizations

### Phase 4: Production Hardening

- [ ] Cloud Scheduler setup
- [ ] Error alerting
- [ ] Scrape monitoring dashboard
- [ ] Add remaining companies (30+)
- [ ] Rate limiting on API

### Deferred to V2

- User accounts / saved companies
- Email alerts / subscriptions
- Custom company additions by users
- Historical charts and trends
- Comparison views
- Browser-use fallback scraper
- Slack/Discord bot

---

## 13. Open Questions

1. **Auth model** - Is this public, invite-only, or paid? Affects how much infra we need.

2. **Company prioritization** - Should Tier 1 companies be scraped more frequently? Or is daily sufficient for all?

3. **Job description storage** - Full HTML? Plaintext? Both? Storage vs. search tradeoffs.

4. **Deduplication edge cases** - Same role posted in multiple locations? Same role reposted after removal?

5. **Historical depth** - How far back do we try to backfill? Or just track forward from launch?

6. **Meta/Google handling** - Worth the effort to filter their massive job boards? Or skip for MVP?

---

## 14. Company List

### Confirmed & Implemented (11 companies)

| Company | ATS | Identifier | Jobs | Status |
|---------|-----|------------|------|--------|
| OpenAI | Ashby | `openai` | 453 | Scraped |
| Anthropic | Greenhouse | `anthropic` | 289 | Scraped |
| xAI | Greenhouse | `xai` | 260 | Scraped |
| Scale AI | Greenhouse | `scaleai` | 133 | Scraped |
| Mistral | Lever | `mistral` | 126 | Scraped |
| Cohere | Ashby | `cohere` | 103 | Scraped |
| Figure AI | Greenhouse | `figureai` | 91 | Scraped |
| Perplexity | Ashby | `perplexity` | 65 | Scraped |
| Together AI | Greenhouse | `togetherai` | 48 | Scraped |
| Cursor | Ashby | `cursor` | 30 | Scraped |
| Fireworks AI | Greenhouse | `fireworksai` | 27 | Scraped |

**Total: ~1,625 jobs across 11 companies** (as of Nov 26, 2025)

**Reference:** See `playground/jobscraping/findings/ats-discovery-summary.md` for API details.

### To Investigate

| Company | ATS (suspected) | Notes |
|---------|-----------------|-------|
| Hugging Face | ? | Open-source ML |
| Runway | Greenhouse | Video/creative AI |
| Groq | ? | Inference chips |
| Cerebras | ? | AI chips |
| Pinecone | Greenhouse | Vector DB |
| Weights & Biases | Greenhouse | ML ops |
| Replicate | ? | Model hosting |
| Modal | Lever | Serverless compute |
| Harvey | ? | Legal AI |
| ElevenLabs | ? | Voice AI |
| Character.ai | ? | Consumer AI |
| AI21 Labs | ? | Enterprise LLMs |
| Reka | ? | Multimodal AI |
| Inflection | ? | Consumer AI |
| Glean | Greenhouse | Enterprise search |
| Physical Intelligence | ? | Robotics |
| 1X | ? | Robotics |

---

## Appendix A: Cost Estimates

### LLM Costs (Monthly)

| Task | Volume | Model | Est. Cost |
|------|--------|-------|-----------|
| Job normalization | ~500 new jobs/week | gpt-4o-mini | ~$5 |
| Company synthesis | 30 companies/week | gpt-4o | ~$10 |
| Sector synthesis | 1/week | gpt-4o | ~$1 |
| Company profiles | ~5/month (new + refresh) | gpt-4o | ~$2 |

**Total LLM:** ~$20-30/month

### Infrastructure (Monthly)

| Service | Spec | Est. Cost |
|---------|------|-----------|
| Cloud Run (API) | 1 instance, minimal | ~$10 |
| Cloud Run (Workers) | On-demand | ~$5 |
| Cloud SQL (Postgres) | db-f1-micro | ~$10 |
| Cloud Scheduler | Few jobs | ~$1 |
| Vercel (Frontend) | Hobby/Pro | $0-20 |

**Total Infra:** ~$30-50/month

---

## Appendix B: Competitor / Adjacent Products

- **Theirstack.com** - Tracks tech stacks from job postings
- **Otta** - Job board with company insights
- **Glassdoor** - Company reviews, some job data
- **LinkedIn Talent Insights** - Expensive enterprise product
- **Revealera** - Sales intelligence from hiring
- **Harmonic.ai** - Tracks startup hiring for investors

None of these are specifically focused on AI sector intelligence with LLM-powered synthesis.
