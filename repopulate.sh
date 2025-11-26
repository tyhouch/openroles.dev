#!/bin/bash
# Repopulate script - wipes database and rebuilds everything from scratch
#
# Usage:
#   ./repopulate.sh           # Full repopulate (wipe + scrape + normalize + synthesize)
#   ./repopulate.sh reset     # Just wipe data (keep companies)
#   ./repopulate.sh scrape    # Scrape all companies
#   ./repopulate.sh normalize # Normalize all jobs
#   ./repopulate.sh synthesize # Run synthesis
#
# Note: Backend must be running on port 8100

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT=8100
API_URL="http://localhost:$BACKEND_PORT/api/admin"

# Load environment variables from backend .env
if [ -f "$SCRIPT_DIR/backend/.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/backend/.env" | xargs)
fi

# Check if ADMIN_API_KEY is set
if [ -z "$ADMIN_API_KEY" ]; then
    echo "Error: ADMIN_API_KEY not set"
    echo "Set it in backend/.env or export ADMIN_API_KEY=your_key"
    exit 1
fi

# Check if backend is running
if ! curl -s "http://localhost:$BACKEND_PORT/health" > /dev/null 2>&1; then
    echo "Error: Backend not running on port $BACKEND_PORT"
    echo "Run ./start.sh first"
    exit 1
fi

call_api() {
    local endpoint=$1
    local description=$2

    echo ""
    echo "==> $description..."
    echo ""

    response=$(curl -s -X POST "$API_URL/$endpoint" \
        -H "X-API-Key: $ADMIN_API_KEY" \
        -H "Content-Type: application/json")

    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    echo ""
}

case "${1:-full}" in
    reset)
        call_api "reset" "Wiping all job data"
        ;;
    scrape)
        call_api "scrape-all?normalize=false" "Scraping all companies"
        ;;
    normalize)
        echo ""
        echo "==> Normalizing all jobs (this takes a while)..."
        echo ""
        # Use normalize-all endpoint which loops until done
        curl -s -X POST "$API_URL/normalize-all?batch_size=50" \
            -H "X-API-Key: $ADMIN_API_KEY" \
            -H "Content-Type: application/json" | python3 -m json.tool
        ;;
    synthesize)
        call_api "synthesize-all?force=true" "Running synthesis (force regenerate)"
        ;;
    full|repopulate)
        echo "================================"
        echo "  FULL REPOPULATE"
        echo "================================"
        echo ""
        echo "This will:"
        echo "  1. Wipe all job data"
        echo "  2. Scrape all companies"
        echo "  3. Normalize all jobs (slow!)"
        echo "  4. Run LLM synthesis"
        echo ""
        read -p "Continue? [y/N] " -n 1 -r
        echo ""

        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Aborted."
            exit 0
        fi

        call_api "repopulate" "Running full repopulate pipeline"
        ;;
    help|--help|-h)
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  full, repopulate  Full pipeline (default) - wipe, scrape, normalize, synthesize"
        echo "  reset             Wipe all job data (keeps companies)"
        echo "  scrape            Scrape all companies"
        echo "  normalize         Normalize all pending jobs"
        echo "  synthesize        Run synthesis (force regenerate)"
        echo "  help              Show this help"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Run '$0 help' for usage"
        exit 1
        ;;
esac

echo "Done!"
