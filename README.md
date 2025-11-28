# openroles.dev

AI sector job intelligence platform. Track hiring trends across top AI companies with automated scraping, LLM-powered analysis, and weekly synthesis reports.

## What it does

- **Scrapes** job postings from 11+ AI companies daily (Greenhouse, Lever, Ashby APIs)
- **Normalizes** job data with GPT-4o-mini (title standardization, seniority, function, team area)
- **Synthesizes** weekly intelligence reports with GPT-4o (company + sector analysis)
- **Surfaces** insights via a dashboard (trends, anomalies, hiring velocity)

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | FastAPI (Python) |
| Database | PostgreSQL |
| Frontend | Next.js 15, Tailwind CSS |
| LLM | OpenAI API (gpt-4o-mini, gpt-4o) |
| Hosting | GCP Cloud Run + Vercel |

## Local Development

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL (or use Docker)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -e ".[dev]"

# Copy environment file
cp .env.example .env
# Edit .env with your DATABASE_URL and OPENAI_API_KEY

# Start PostgreSQL (if using Docker)
docker-compose up -d

# Run migrations
alembic upgrade head

# Seed companies
python scripts/seed_companies.py
python scripts/load_profiles.py

# Start server
uvicorn app.main:app --port 8100 --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (connects to local backend)
NEXT_PUBLIC_API_URL=http://localhost:8100 npm run dev -- -p 3100
```

Or use the convenience scripts from the root:

```bash
./start.sh   # Starts both backend and frontend
./stop.sh    # Stops both
```

### Populate Data

```bash
# Scrape all companies
./repopulate.sh scrape

# Normalize jobs (uses OpenAI)
./repopulate.sh normalize

# Run synthesis (weekly reports)
./repopulate.sh synthesize
```

## API Endpoints

### Public

```
GET /api/companies              # List all companies
GET /api/companies/:slug        # Company detail + jobs
GET /api/jobs                   # List jobs (filterable)
GET /api/summaries/sector       # Latest sector summary
GET /api/summaries/company/:slug # Company summary
```

### Admin (requires X-API-Key header)

```
POST /api/admin/scrape/:slug    # Scrape single company
POST /api/admin/scrape-all      # Scrape all companies
POST /api/admin/normalize       # Normalize pending jobs
POST /api/admin/synthesize-all  # Generate weekly reports
```

## Deployment

See `deploy.sh` for GCP Cloud Run + Vercel deployment:

```bash
./deploy.sh setup      # One-time GCP setup
./deploy.sh backend    # Deploy backend to Cloud Run
./deploy.sh frontend   # Deploy frontend to Vercel
./deploy.sh scheduler  # Set up Cloud Scheduler (daily scrape, weekly synthesis)
```

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/           # FastAPI routes
│   │   ├── models/        # SQLAlchemy models
│   │   └── services/      # Scrapers, normalizer, synthesizer
│   ├── alembic/           # Database migrations
│   └── scripts/           # Seed data scripts
├── frontend/
│   ├── app/               # Next.js pages
│   ├── components/        # React components
│   └── lib/               # API client, types
├── info/
│   └── company_profiles/  # Markdown profiles for each company
├── deploy.sh              # Deployment script
├── start.sh               # Local dev start
└── stop.sh                # Local dev stop
```

## Companies Tracked

| Company | ATS | Jobs |
|---------|-----|------|
| OpenAI | Ashby | ~450 |
| Anthropic | Greenhouse | ~290 |
| xAI | Greenhouse | ~260 |
| Scale AI | Greenhouse | ~130 |
| Mistral | Lever | ~125 |
| Cohere | Ashby | ~100 |
| Figure AI | Greenhouse | ~90 |
| Perplexity | Ashby | ~65 |
| Together AI | Greenhouse | ~50 |
| Cursor | Ashby | ~30 |
| Fireworks AI | Greenhouse | ~25 |

## License

MIT
