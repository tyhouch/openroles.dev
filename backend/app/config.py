from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://openroles:openroles@localhost:5432/openroles"

    # OpenAI
    openai_api_key: str = ""

    # Admin API Key (required for admin endpoints)
    admin_api_key: str = ""

    # App
    environment: str = "development"
    debug: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
