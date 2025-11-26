"""Seed initial companies into the database."""

import sys
sys.path.insert(0, "/Users/tylerhouchin/code/pproj/openroles/backend")

from app.database import SessionLocal
from app.models import Company

# Initial companies from our ATS discovery
INITIAL_COMPANIES = [
    {
        "name": "OpenAI",
        "slug": "openai",
        "website_url": "https://openai.com",
        "careers_url": "https://openai.com/careers",
        "ats_type": "ashby",
        "ats_identifier": "openai",
        "tier": "tier1",
    },
    {
        "name": "Anthropic",
        "slug": "anthropic",
        "website_url": "https://anthropic.com",
        "careers_url": "https://anthropic.com/careers",
        "ats_type": "greenhouse",
        "ats_identifier": "anthropic",
        "tier": "tier1",
    },
    {
        "name": "xAI",
        "slug": "xai",
        "website_url": "https://x.ai",
        "careers_url": "https://x.ai/careers",
        "ats_type": "greenhouse",
        "ats_identifier": "xai",
        "tier": "tier1",
    },
    {
        "name": "Scale AI",
        "slug": "scaleai",
        "website_url": "https://scale.com",
        "careers_url": "https://scale.com/careers",
        "ats_type": "greenhouse",
        "ats_identifier": "scaleai",
        "tier": "tier1",
    },
    {
        "name": "Mistral",
        "slug": "mistral",
        "website_url": "https://mistral.ai",
        "careers_url": "https://mistral.ai/careers",
        "ats_type": "lever",
        "ats_identifier": "mistral",
        "tier": "tier1",
    },
    {
        "name": "Cohere",
        "slug": "cohere",
        "website_url": "https://cohere.com",
        "careers_url": "https://cohere.com/careers",
        "ats_type": "ashby",
        "ats_identifier": "cohere",
        "tier": "tier2",
    },
    {
        "name": "Figure AI",
        "slug": "figureai",
        "website_url": "https://figure.ai",
        "careers_url": "https://figure.ai/careers",
        "ats_type": "greenhouse",
        "ats_identifier": "figureai",
        "tier": "tier2",
    },
    {
        "name": "Perplexity",
        "slug": "perplexity",
        "website_url": "https://perplexity.ai",
        "careers_url": "https://perplexity.ai/careers",
        "ats_type": "ashby",
        "ats_identifier": "perplexity",
        "tier": "tier2",
    },
    {
        "name": "Together AI",
        "slug": "togetherai",
        "website_url": "https://together.ai",
        "careers_url": "https://together.ai/careers",
        "ats_type": "greenhouse",
        "ats_identifier": "togetherai",
        "tier": "tier2",
    },
    {
        "name": "Cursor",
        "slug": "cursor",
        "website_url": "https://cursor.com",
        "careers_url": "https://cursor.com/careers",
        "ats_type": "ashby",
        "ats_identifier": "cursor",
        "tier": "tier2",
    },
    {
        "name": "Fireworks AI",
        "slug": "fireworksai",
        "website_url": "https://fireworks.ai",
        "careers_url": "https://fireworks.ai/careers",
        "ats_type": "greenhouse",
        "ats_identifier": "fireworksai",
        "tier": "tier2",
    },
]


def seed():
    db = SessionLocal()
    try:
        for company_data in INITIAL_COMPANIES:
            existing = db.query(Company).filter(Company.slug == company_data["slug"]).first()
            if existing:
                print(f"Skipping {company_data['name']} - already exists")
                continue

            company = Company(**company_data)
            db.add(company)
            print(f"Added {company_data['name']}")

        db.commit()
        print("Done!")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
