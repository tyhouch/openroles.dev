"""Load company profiles from markdown files into database."""

import sys
from pathlib import Path

sys.path.insert(0, "/Users/tylerhouchin/code/pproj/openroles/backend")

from app.database import SessionLocal
from app.models import Company

# Map filename (without .md) to database slug
FILENAME_TO_SLUG = {
    "openai": "openai",
    "anthropic": "anthropic",
    "xai": "xai",
    "scale-ai": "scaleai",
    "mistral": "mistral",
    "cohere": "cohere",
    "figure-ai": "figureai",
    "perplexity": "perplexity",
    "together-ai": "togetherai",
    "cursor": "cursor",
    "fireworks-ai": "fireworksai",
}

PROFILES_DIR = Path("/Users/tylerhouchin/code/pproj/openroles/info/company_profiles")


def load_profiles():
    db = SessionLocal()
    try:
        for md_file in PROFILES_DIR.glob("*.md"):
            filename = md_file.stem  # filename without extension
            slug = FILENAME_TO_SLUG.get(filename)

            if not slug:
                print(f"WARNING: No slug mapping for {md_file.name}, skipping")
                continue

            company = db.query(Company).filter(Company.slug == slug).first()
            if not company:
                print(f"WARNING: Company with slug '{slug}' not found in DB, skipping")
                continue

            profile_content = md_file.read_text()
            company.profile_markdown = profile_content
            print(f"Loaded profile for {company.name} ({len(profile_content)} chars)")

        db.commit()
        print("\nDone! All profiles loaded.")
    finally:
        db.close()


if __name__ == "__main__":
    load_profiles()
