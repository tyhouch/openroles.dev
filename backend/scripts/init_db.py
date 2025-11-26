"""Initialize the database by creating all tables."""

import sys
sys.path.insert(0, "/Users/tylerhouchin/code/pproj/openroles/backend")

from app.database import engine, Base
from app.models import *  # noqa: Import all models


def init():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Done!")


if __name__ == "__main__":
    init()
