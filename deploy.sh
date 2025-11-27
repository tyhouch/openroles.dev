#!/bin/bash
# Deployment script for OpenRoles
#
# Architecture:
#   - Backend: GCP Cloud Run
#   - Database: Neon (external Postgres)
#   - Frontend: Vercel
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - Neon account with database created (neon.tech)
#   - Vercel CLI installed (npm i -g vercel)
#
# Usage:
#   ./deploy.sh setup      # One-time GCP setup (secrets only)
#   ./deploy.sh backend    # Deploy backend to Cloud Run
#   ./deploy.sh frontend   # Deploy frontend to Vercel
#   ./deploy.sh all        # Deploy everything

set -e

# Configuration
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="openroles-api"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[x]${NC} $1"; exit 1; }

check_gcloud() {
    if ! command -v gcloud &> /dev/null; then
        error "gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
    fi

    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" == "(unset)" ]; then
        error "No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID"
    fi

    log "Using GCP project: $PROJECT_ID"
}

setup_gcp() {
    log "Setting up GCP..."

    # Enable APIs
    log "Enabling required APIs..."
    gcloud services enable \
        cloudbuild.googleapis.com \
        run.googleapis.com \
        secretmanager.googleapis.com

    echo ""
    log "Create these secrets in Secret Manager:"
    echo ""
    echo "1. Get your Neon connection string from: https://console.neon.tech"
    echo "   (Format: postgres://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require)"
    echo ""
    echo "2. Run these commands:"
    echo ""
    echo "   # Database URL from Neon"
    echo "   echo -n 'YOUR_NEON_CONNECTION_STRING' | gcloud secrets create openroles-database-url --data-file=-"
    echo ""
    echo "   # OpenAI API key"
    echo "   echo -n 'sk-YOUR_OPENAI_KEY' | gcloud secrets create openroles-openai-key --data-file=-"
    echo ""
    echo "   # Admin API key (make one up)"
    echo "   echo -n 'YOUR_ADMIN_KEY' | gcloud secrets create openroles-admin-key --data-file=-"
    echo ""

    log "Setup complete! Run './deploy.sh backend' after creating secrets."
}

deploy_backend() {
    check_gcloud

    log "Deploying backend to Cloud Run..."

    cd backend

    # Check if secrets exist
    if ! gcloud secrets describe openroles-database-url &>/dev/null; then
        error "Secret 'openroles-database-url' not found. Run: ./deploy.sh setup"
    fi

    log "Building and deploying..."

    gcloud run deploy $SERVICE_NAME \
        --source . \
        --region $REGION \
        --platform managed \
        --allow-unauthenticated \
        --set-env-vars "ENVIRONMENT=production" \
        --set-secrets "DATABASE_URL=openroles-database-url:latest" \
        --set-secrets "OPENAI_API_KEY=openroles-openai-key:latest" \
        --set-secrets "ADMIN_API_KEY=openroles-admin-key:latest" \
        --memory 512Mi \
        --cpu 1 \
        --min-instances 0 \
        --max-instances 10 \
        --timeout 900

    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')

    cd ..

    log "Backend deployed!"
    echo ""
    echo "API URL: $SERVICE_URL"
    echo ""
    echo "Test: curl $SERVICE_URL/health"
    echo ""
    echo "Next: Set this in Vercel as NEXT_PUBLIC_API_URL"
}

deploy_frontend() {
    log "Deploying frontend to Vercel..."

    cd frontend

    if ! command -v vercel &> /dev/null; then
        error "Vercel CLI not found. Install with: npm i -g vercel"
    fi

    vercel --prod

    cd ..

    log "Frontend deployed!"
}

run_migrations() {
    check_gcloud

    log "Running migrations..."

    # Get the database URL
    DATABASE_URL=$(gcloud secrets versions access latest --secret=openroles-database-url)

    cd backend

    # Run alembic
    DATABASE_URL="$DATABASE_URL" alembic upgrade head

    cd ..

    log "Migrations complete!"
}

seed_data() {
    check_gcloud

    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)' 2>/dev/null)
    ADMIN_KEY=$(gcloud secrets versions access latest --secret=openroles-admin-key)

    if [ -z "$SERVICE_URL" ]; then
        error "Backend not deployed. Run: ./deploy.sh backend"
    fi

    log "Running full repopulate pipeline..."
    log "This will scrape all companies, normalize jobs, and run synthesis."
    echo ""

    curl -X POST "$SERVICE_URL/api/admin/repopulate" \
        -H "X-API-Key: $ADMIN_KEY" \
        -H "Content-Type: application/json"

    echo ""
    log "Seeding started! Check Cloud Run logs for progress."
}

setup_scheduler() {
    check_gcloud

    log "Setting up Cloud Scheduler jobs..."

    # Enable Cloud Scheduler API
    gcloud services enable cloudscheduler.googleapis.com

    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)' 2>/dev/null)
    ADMIN_KEY=$(gcloud secrets versions access latest --secret=openroles-admin-key)

    if [ -z "$SERVICE_URL" ]; then
        error "Backend not deployed. Run: ./deploy.sh backend"
    fi

    # Create daily scrape job (6 AM UTC)
    log "Creating daily scrape job..."
    gcloud scheduler jobs create http openroles-daily-scrape \
        --location=$REGION \
        --schedule="0 6 * * *" \
        --uri="$SERVICE_URL/api/admin/scrape-all?normalize=true" \
        --http-method=POST \
        --headers="X-API-Key=$ADMIN_KEY,Content-Type=application/json" \
        --attempt-deadline=900s \
        --time-zone="UTC" \
        --description="Daily job scrape for all companies" \
        --quiet 2>/dev/null || \
    gcloud scheduler jobs update http openroles-daily-scrape \
        --location=$REGION \
        --schedule="0 6 * * *" \
        --uri="$SERVICE_URL/api/admin/scrape-all?normalize=true" \
        --http-method=POST \
        --headers="X-API-Key=$ADMIN_KEY,Content-Type=application/json" \
        --attempt-deadline=900s

    # Create weekly synthesis job (Mondays 8 AM UTC)
    log "Creating weekly synthesis job..."
    gcloud scheduler jobs create http openroles-weekly-synthesis \
        --location=$REGION \
        --schedule="0 8 * * 1" \
        --uri="$SERVICE_URL/api/admin/synthesize-all?force=true" \
        --http-method=POST \
        --headers="X-API-Key=$ADMIN_KEY,Content-Type=application/json" \
        --attempt-deadline=900s \
        --time-zone="UTC" \
        --description="Weekly AI synthesis" \
        --quiet 2>/dev/null || \
    gcloud scheduler jobs update http openroles-weekly-synthesis \
        --location=$REGION \
        --schedule="0 8 * * 1" \
        --uri="$SERVICE_URL/api/admin/synthesize-all?force=true" \
        --http-method=POST \
        --headers="X-API-Key=$ADMIN_KEY,Content-Type=application/json" \
        --attempt-deadline=900s

    log "Scheduler jobs configured!"
    echo ""
    echo "Jobs:"
    gcloud scheduler jobs list --location=$REGION
}

trigger_job() {
    check_gcloud

    JOB_NAME="$1"
    if [ -z "$JOB_NAME" ]; then
        error "Usage: ./deploy.sh trigger <daily-scrape|weekly-synthesis>"
    fi

    case "$JOB_NAME" in
        daily-scrape|scrape)
            gcloud scheduler jobs run openroles-daily-scrape --location=$REGION
            ;;
        weekly-synthesis|synthesis)
            gcloud scheduler jobs run openroles-weekly-synthesis --location=$REGION
            ;;
        *)
            error "Unknown job: $JOB_NAME. Use: daily-scrape or weekly-synthesis"
            ;;
    esac

    log "Job triggered! Check Cloud Run logs for progress."
}

show_status() {
    check_gcloud

    echo "=== OpenRoles Status ==="
    echo ""

    # Cloud Run
    log "Cloud Run Service:"
    gcloud run services describe $SERVICE_NAME --region=$REGION --format="table(status.url,status.conditions[0].status)" 2>/dev/null || echo "  Not deployed"
    echo ""

    # Scheduler Jobs
    log "Scheduled Jobs:"
    gcloud scheduler jobs list --location=$REGION 2>/dev/null || echo "  None configured"
    echo ""

    # Recent scrapes
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)' 2>/dev/null)
    if [ -n "$SERVICE_URL" ]; then
        log "Health Check:"
        curl -s "$SERVICE_URL/health" | python3 -m json.tool 2>/dev/null || echo "  Failed"
    fi
}

case "${1:-help}" in
    setup)
        check_gcloud
        setup_gcp
        ;;
    backend)
        deploy_backend
        ;;
    frontend)
        deploy_frontend
        ;;
    migrate)
        run_migrations
        ;;
    seed)
        seed_data
        ;;
    scheduler)
        setup_scheduler
        ;;
    trigger)
        trigger_job "$2"
        ;;
    status)
        show_status
        ;;
    all)
        deploy_backend
        echo ""
        deploy_frontend
        ;;
    help|--help|-h)
        echo "OpenRoles Deployment Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  setup       One-time GCP setup (enables APIs, shows secret commands)"
        echo "  backend     Deploy backend to Cloud Run"
        echo "  frontend    Deploy frontend to Vercel"
        echo "  migrate     Run database migrations"
        echo "  seed        Trigger full data pipeline (scrape + normalize + synthesize)"
        echo "  scheduler   Set up Cloud Scheduler jobs (daily scrape, weekly synthesis)"
        echo "  trigger     Manually trigger a scheduled job (daily-scrape|weekly-synthesis)"
        echo "  status      Show deployment status"
        echo "  all         Deploy backend + frontend"
        echo ""
        echo "Deployment order:"
        echo "  1. Create Neon database at neon.tech"
        echo "  2. ./deploy.sh setup"
        echo "  3. Create the 3 secrets (copy commands from setup output)"
        echo "  4. ./deploy.sh backend"
        echo "  5. ./deploy.sh migrate"
        echo "  6. ./deploy.sh frontend (set NEXT_PUBLIC_API_URL in Vercel)"
        echo "  7. ./deploy.sh scheduler"
        echo "  8. ./deploy.sh seed (optional: populate initial data)"
        echo ""
        echo "Scheduled Jobs:"
        echo "  - Daily scrape: 6 AM UTC - scrapes all companies, normalizes new jobs"
        echo "  - Weekly synthesis: Monday 8 AM UTC - generates AI summaries"
        ;;
    *)
        error "Unknown command: $1. Run '$0 help' for usage."
        ;;
esac
